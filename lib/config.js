/*
 * Bedrock mail configuration.
 *
 * Copyright (c) 2012-2015 Digital Bazaar, Inc. All rights reserved.
 */
var config = require('bedrock').config;

config.mail = {};
config.mail.events = [];

config.mail.templates = {};
config.mail.templates.cache = false;
//config.mail.templates.paths = [];
// map from template id to template config object:
// - filename: template file name
// - disable: true to disable template
config.mail.templates.config = {};
config.mail.connection = {
  host: 'localhost',
  ssl: false
};
config.mail.send = false;
config.mail.vars = {};
