/*
 * Bedrock mail configuration.
 *
 * Copyright (c) 2012-2020 Digital Bazaar, Inc. All rights reserved.
 */
const {config} = require('bedrock');

const env = process.env.NODE_ENV;

config.mail = {};

// transport
// support options:
// any nodemailer transport instance
//   https://nodemailer.com/transports/
//   {type: 'transporter', transporter: <transporter>}
// SMTP transport
//   https://nodemailer.com/smtp/
//   {type: 'smtp', options: {...}, verify: <boolean>}
//   optionally verify connection on start
// AWS SES transport
//   https://nodemailer.com/transports/ses/
//   {type: 'ses', options: {...}}
// JSON logging transport (for debugging)
//   {type: 'json'}
config.mail.transport = null;

config.mail.templates = {};
// cache templates
// FIXME: some default support already exists
//config.mail.templates.cache = true;
// templates search path, paths checked in order
// defaults to <appRoot>/emails/<template>/<part>.ext
config.mail.templates.paths = [];

// default options for all messages
config.mail.message = {};

// default locals for all templates
config.mail.locals = {};

// email preview
// boolean or options object
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
