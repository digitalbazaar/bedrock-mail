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
  // check explicit 'transport' first, then smtp, then ses
  // fail if in send mode
  let transport = {};
  if(cfg.transport) {
    switch(cfg.transport.type) {
      case 'transporter':
        logger.info('using custom transport');
        transport = cfg.transport.transporter;
        break;
      case 'smtp':
        logger.info('using SMTP transport');
        transport = nodemailer.createTransport(cfg.transport.options);
        if(cfg.transport.verify) {
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
        transport = nodemailer.createTransport(cfg.transport.options);
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
            transport: cfg.transport
          });
    }
  }
  if(!transport) {
    logger.warn('no transport configured');
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
}

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
