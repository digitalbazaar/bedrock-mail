/*!
 * Copyright (c) 2012-2022 Digital Bazaar, Inc. All rights reserved.
 */
import * as bedrock from '@bedrock/core';
import appRoot from 'app-root-path';
import Email from 'email-templates';
import nodemailer from 'nodemailer';
import path from 'node:path';

const {BedrockError} = bedrock.util;

// load config defaults
import './config.js';

// email client
let client;

const logger = bedrock.loggers.get('app').child('bedrock-mail');

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

function _b(value) {
  const v = value.toString().toLowerCase();
  return (v === true || v === 'true' || v === 't' || v === '1');
}

bedrock.events.on('bedrock-cli.ready', async () => {
  if(bedrock.program.mailTo) {
    bedrock.config.mail.to = bedrock.program.mailTo;
  }
  if(bedrock.program.mailPreview !== 'default') {
    bedrock.config.mail.preview = _b(bedrock.program.mailPreview);
  }
  if(bedrock.program.mailSend !== 'default') {
    bedrock.config.mail.send = _b(bedrock.program.mailSend);
  }
  if(bedrock.program.mailLog !== 'default') {
    const log = _b(bedrock.program.mailLog);
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

  let viewsRoot;
  if(cfg.templates.paths.length > 1) {
    throw new BedrockError(
      'Only one templates path currently supported.',
      'InvalidConfiguration', {
        paths: cfg.templates.paths
      });
  } else if(cfg.templates.paths.length === 1) {
    viewsRoot = cfg.templates.paths[0];
  } else {
    viewsRoot = path.join(appRoot.toString(), 'emails');
  }
  logger.info('views root', {path: viewsRoot});

  client = new Email({
    transport,
    message: cfg.message,
    preview: cfg.preview,
    send: cfg.send,
    subjectPrefix: cfg.subjectPrefix,
    views: {
      root: viewsRoot,
      options: {
        // FIXME: allow changing template engine
        extension: 'ejs'
      }
    }
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
      throw new BedrockError(
        'Unknown configuration property.',
        'InvalidConfiguration', {
          property
        });
  }
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
      throw new BedrockError(
        'Unconfigured transport.',
        'InvalidConfiguration');
    }
    client.verify();
    return {
      verified: true
    };
  } catch(e) {
    return {
      verified: false,
      error: e
    };
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
export async function send({template, message, locals}) {
  const cfg = bedrock.config.mail;

  if(!client) {
    // FIXME: log warning?
    return;
  }
  // FIXME: add custom config.mail.templates.paths multi-path template lookup
  // if template option not absolute
  // FIXME: shallow? deep? let caller do it?
  const _locals = {...cfg.locals, ...locals};
  // handle to field override
  if(cfg.to) {
    // FIXME: add original email in header?
    message = {...message, ...{to: cfg.to}};
  }
  const result = await client.send({
    template,
    message,
    locals: _locals
  });
  // minimal email info
  // FIXME: what to log? what level? seperate mail log? event?
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
