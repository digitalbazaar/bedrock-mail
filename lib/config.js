/*
 * Bedrock mail configuration.
 *
 * Copyright (c) 2012-2020 Digital Bazaar, Inc. All rights reserved.
 */
const {config} = require('bedrock');

const env = process.env.NODE_ENV;

config.mail = {};

// transport
// can setup in config or at runtime with use('transport', ...);
// supported values:
// null:
//   do nothing
// object with any nodemailer transport instance:
//   {type: 'transporter', transporter: <transporter>}
//   https://nodemailer.com/transports/
// object with SMTP transport:
//   {type: 'smtp', options: {...}, verify: <boolean>}
//   optionally verify connection on start
//   https://nodemailer.com/smtp/
// object with AWS SES transport:
//   {type: 'ses', options: {...}}
//   https://nodemailer.com/transports/ses/
// object with JSON logging transport:
//   output JSON mail structures, useful for debugging
//   {type: 'json'}
config.mail.transport = null;

config.mail.templates = {};
// cache templates
// FIXME: some default support already exists
//config.mail.templates.cache = true;
// templates search path, paths checked in order
// defaults to: <appRoot>/emails/
// templates are: <appRoot>/emails/<template>/<part>.ext
config.mail.templates.paths = [];

// default options for all messages
config.mail.message = {};

// default locals for all templates
config.mail.locals = {};

// log emails (for development use)
// defaults to true if in development mode
config.mail.log = {
  // log basic headers (from, to, subject, messageId)
  headers: env === undefined || env === 'development',
  // log text version
  text: env === undefined || env === 'development',
  // log html version
  html: false
};

// email preview (for development use)
// boolean
// defaults to true if in development mode
config.mail.preview = env === undefined || env === 'development';

// send mail control
// boolean
// defaults to true if NODE_ENV is 'production'
config.mail.send = env === 'production';

// subject prefix
// string
// defaults to nothing in 'production' mode, else based on NODE_ENV
config.mail.subjectPrefix =
  env === 'production' ? false : `[${(env || 'development').toUpperCase()}] `;
