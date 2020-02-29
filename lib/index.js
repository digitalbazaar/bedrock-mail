/*
 * Bedrock mail module.
 *
 * Copyright (c) 2012-2020 Digital Bazaar, Inc. All rights reserved.
 */
const Email = require('email-templates');
const appRoot = require('app-root-path');
const bedrock = require('bedrock');
const nodemailer = require('nodemailer');
const path = require('path');

const {BedrockError} = bedrock.util;

// load config defaults
require('./config');

const api = {};
module.exports = api;

// email client
let client;

const logger = bedrock.loggers.get('app').child('bedrock-mail');

bedrock.events.on('bedrock.start', init);

async function init() {
  const cfg = bedrock.config.mail;

  // manually setup send mode
  const send = cfg.send;
  logger.info(`send ${send ? 'enabled' : 'disabled'}`);

  // setup transport
  if(cfg.transport) {
    api.use('transport', cfg.transport);
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
      if(transportConfig.verify) {
        try {
          await transport.verify();
          logger.info('SMTP verify call success');
        } catch(error) {
          logger.error('SMTP verify call failed', {error});
        }
      }
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
 * Configure property.
 *
 * Current properties:
 *   'transport': pass object same as config.mail.transport structure.
 *
 * @async
 * @param {string} property - template name or path to use.
 * @param {*} args - appropriate value(s) for property
 * @returns {Promise<object>} result of action.
 */
api.use = async function(property, ...args) {
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
};

/**
 * Verify client connection (if supported).
 *
 * @async
 * @returns {Promise<object>} verify status
 *   {verified: <boolean>[, error: <Error>]}
 */
api.verify = async function() {
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
};

/**
 * Send email.
 *
 * @async
 * @param {string} template - template name or path to use.
 * @param {object} message - message options.
 * @param {object} locals - local variables for template (merged with locals
 *        from main config).
 * @returns {Promise<object>} details of the message send
 */
api.send = async function({template, message, locals}) {
  if(!client) {
    // FIXME: log warning?
    return;
  }
  // FIXME: add custom config.mail.templates.paths multi-path template lookup
  // if template option not absolute
  // FIXME: shallow? deep? let caller do it?
  const _locals = Object.assign({}, bedrock.config.mail.locals, locals);
  return client.send({
    template,
    message,
    locals: _locals
  });
};
