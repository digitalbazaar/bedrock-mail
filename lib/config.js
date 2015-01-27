/*
 * Bedrock mail configuration.
 *
 * Copyright (c) 2012-2015 Digital Bazaar, Inc. All rights reserved.
 */
var config = require('bedrock').config;

config.mail = {};
config.mail.events = [
  {
    type: 'bedrock.Identity.created',
    // auth email
    template: 'bedrock.Identity.created'
  },
  {
    type: 'bedrock.Identity.created',
    // user email
    template: 'bedrock.Identity.created-identity'
  },
  {
    type: 'bedrock.Identity.passcodeSent',
    // user email
    template: 'bedrock.Identity.passcodeSent'
  }
];
config.mail.templates = {};
config.mail.templates.cache = false;
config.mail.templates.paths = [];
config.mail.templates.mappers = [];
config.mail.connection = {
  host: 'localhost',
  ssl: false
};
config.mail.send = false;
config.mail.vars = {};
