/*!
 * Copyright (c) 2012-2025 Digital Bazaar, Inc. All rights reserved.
 */
import * as bedrock from '@bedrock/core';
import appRoot from 'app-root-path';
import {EmailClient} from './EmailClient.js';
import {logger} from './logger.js';
import nodemailer from 'nodemailer';
import path from 'node:path';

const {BedrockError} = bedrock.util;

// load config defaults
import './config.js';

// email client
let client;

bedrock.events.on('bedrock-cli.init', async () => {
  bedrock.program.option('--mail-to <address>',
    'Override mail target address for all emails.',
    String, null);
  bedrock.program.option('--mail-preview <mode>',
    'Override previewing mail' +
    ' (true/t/1, false/f/0, default).',
    /^(true|t|1|false|f|0|default)$/i, 'default');
  bedrock.program.option('--mail-send <mode>',
    'Override sending mail' +
    ' (true/t/1, false/f/0, default).',
    /^(true|false|t|f|0|1|default)$/i, 'default');
  bedrock.program.option('--mail-log <mode>',
    'Override logging mail' +
    ' (true/t/1, false/f/0, default).',
    /^(true|t|1|false|f|0|default)$/i, 'default');
});

bedrock.events.on('bedrock-cli.ready', async () => {
  const opts = bedrock.program.opts();
  if(opts.mailTo) {
    bedrock.config.mail.to = opts.mailTo;
  }
  if(opts.mailPreview !== 'default') {
    bedrock.config.mail.preview = _b(opts.mailPreview);
  }
  if(opts.mailSend !== 'default') {
    bedrock.config.mail.send = _b(opts.mailSend);
  }
  if(opts.mailLog !== 'default') {
    const log = _b(opts.mailLog);
    bedrock.config.mail.log.headers = log;
    bedrock.config.mail.log.text = log;
  }
});

bedrock.events.on('bedrock.start', init);

async function init() {
  const cfg = bedrock.config.mail;

  // log setup
  if(cfg.to) {
    logger.info(`force to: ${cfg.to}`);
  }
  logger.info(`preview: ${cfg.preview ? 'enabled' : 'disabled'}`);
  const log = [
    ...(cfg.log.headers ? ['headers'] : []),
    ...(cfg.log.text ? ['text'] : []),
    ...(cfg.log.html ? ['html'] : [])
  ].join(', ');
  logger.info(`send: ${cfg.send ? 'enabled' : 'disabled'}`);
  logger.info(`log: ${log}`);

  // setup transport
  if(cfg.transport) {
    await use('transport', cfg.transport);
  }
  if(!client) {
    logger.debug('no transport configured during init');
  }
}

function _b(value) {
  const v = value.toString().toLowerCase();
  return (v === true || v === 'true' || v === 't' || v === '1');
}

async function _useTransport(transportConfig) {
  const cfg = bedrock.config.mail;

  // setup transport
  // check explicit transport first, then smtp, then ses
  // fail if in send mode
  let transport;
  switch(transportConfig.type) {
    case 'transporter':
      logger.info('using custom transport');
      transport = transportConfig.transporter;
      break;
    case 'smtp':
      logger.info('using SMTP transport');
      transport = nodemailer.createTransport(transportConfig.options);
      break;
    case 'ses':
      logger.info('using AWS SES transport');
      transport = nodemailer.createTransport(transportConfig.options);
      break;
    case 'json':
      logger.info('using JSON debug transport');
      transport = {
        jsonTransport: true
      };
      break;
    default:
      throw new BedrockError(
        'Unknown mail transport type.',
        'InvalidConfiguration', {
          transport: transportConfig
        });
  }
  if(transportConfig.verify) {
    if(transport.verify) {
      try {
        await transport.verify();
        logger.info('transport verify call success');
      } catch(error) {
        logger.error('transport verify call failed', {error});
      }
    } else {
      logger.warn('transport verify check not available');
    }
  }

  let templateRootPath;
  if(cfg.templates.paths.length > 1) {
    throw new BedrockError(
      'Only one template path currently supported.', {
        name: 'NotSupportedError',
        details: {
          paths: cfg.templates.paths
        }
      });
  } else if(cfg.templates.paths.length === 1) {
    templateRootPath = cfg.templates.paths[0];
  } else {
    templateRootPath = path.join(appRoot.toString(), 'emails');
  }
  logger.info('template root path', {path: templateRootPath});

  client = new EmailClient({
    transport,
    templateRootPath,
    send: cfg.send,
    preview: cfg.preview,
    // message defaults for all emails
    message: cfg.message,
    subjectPrefix: cfg.subjectPrefix,
  });
  logger.debug('transport configured');
}

/**
 * Configures a property.
 *
 * Current properties:
 *   'transport': pass object same as config.mail.transport structure.
 *
 * @param {string} property - Template name or path to use.
 * @param {*} args - Appropriate value(s) for property.
 *
 * @returns {Promise<object>} The result of the action.
 */
export async function use(property, ...args) {
  switch(property) {
    case 'transport':
      return _useTransport(args[0]);
    default:
      throw new BedrockError('Unknown configuration property.', {
        name: 'NotSupportedError',
        details: {
          property
        }
      });
  }
}

/**
 * Sends email.
 *
 * @param {object} options - The options to use.
 * @param {string} options.template - The template name or path to use.
 * @param {object} options.message - The message options.
 * @param {object} options.locals - The local variables for template (merged
 *   with locals from main config).
 *
 * @returns {Promise<object>} The details of the message sent.
 */
export async function send({template, message, locals} = {}) {
  const cfg = bedrock.config.mail;

  if(!client) {
    logger.debug('Warning, send() called before "client" initialized.');
    return;
  }

  // handle to field override
  if(cfg.to) {
    message = {...message, ...{to: cfg.to}};
  }

  const result = await client.send({
    template,
    message,
    locals: {...cfg.locals, ...locals}
  });

  // minimal email info
  logger.debug('sent', {
    messageId: result.messageId,
    from: result.envelope.from,
    to: result.envelope.to,
    subject: result.originalMessage.subject
  });

  // more verbose configured logging
  if(cfg.log.headers || cfg.log.text || cfg.log.html) {
    let msg = 'sent email:\n';
    if(cfg.log.headers) {
      msg += `From: ${result.originalMessage.from}\n`;
      msg += `To: ${result.originalMessage.to}\n`;
      msg += `Subject: ${result.originalMessage.subject}\n`;
      msg += `Message-ID: ${result.messageId}\n`;
      if(result.response) {
        msg += `(response): ${result.response}\n`;
      }
    }
    if(cfg.log.text) {
      msg += '\n';
      msg += result.originalMessage.text;
    }
    if(cfg.log.html) {
      msg += '\n';
      msg += result.originalMessage.html;
    }
    logger.info(msg);
  }
  return result;
}

/**
 * Verifies client connection (if supported).
 *
 * @returns {Promise<object>} The verify status:
 *   {verified: <boolean>[, error: <Error>]}.
 */
export async function verify() {
  try {
    if(!client) {
      throw new BedrockError('Unconfigured transport.', {
        name: 'OperationError'
      });
    }
    await client.verify();
    return {verified: true};
  } catch(error) {
    return {verified: false, error};
  }
}
