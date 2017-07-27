/*
 * Bedrock mail module.
 *
 * Copyright (c) 2012-2015 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var email = require('emailjs');
var bedrock = require('bedrock');
var htmlToText = require('html-to-text');
var swigcore = require('swig');
var swigLoaders = require('./swig.loaders');
var BedrockError = bedrock.util.BedrockError;
var MailParser = require('mailparser').MailParser;

// load config defaults
require('./config');

var api = {};
module.exports = api;

// email client
var client;

// event detail triggers
var triggers = {};

// set the default timezone offset for the template system
swigcore.setDefaultTZOffset(0);
var swig;

var logger = bedrock.loggers.get('app').child('bedrock-mail');

bedrock.events.on('bedrock.start', init);

function init() {
  // create a local instance of swig for mail templates
  swig = new swigcore.Swig({
    autoescape: false,
    cache: bedrock.config.mail.templates.cache ? 'memory' : false//,
    /* FIXME: is a loader needed?
    loader: swigLoaders.multipath({
      base: bedrock.config.mail.templates.paths
    })
    */
  });

  if(bedrock.config.mail.send) {
    logger.info('using "' +
      bedrock.config.mail.connection.host + '" for the smtp server.');
    client = email.server.connect(bedrock.config.mail.connection);
  } else {
    logger.info('configured to log emails, not send them.');
  }

  // attach listeners for events from config
  var events = bedrock.config.mail.events;
  events.forEach(function(info) {
    logger.debug('registering for event: ' + info.type);
    bedrock.events.on(info.type, handleMailEvent.bind(null, info));
  });
}

/**
 * Registers a trigger that will be fired if found in event.details.triggers.
 * The trigger may modify the details of the event.
 *
 * @param name the name of the trigger in event.details.trigger.
 * @param trigger(event, callback) the trigger function to call.
 */
api.registerTrigger = function(name, trigger) {
  if(!(name in triggers)) {
    triggers[name] = [];
  }
  triggers[name].push(trigger);
};

/**
 * Sends an email using the given template ID and variables.
 *
 * @param id the ID of the template to use for the email.
 * @param vars the variables to use to populate the email.
 * @param callback(err, details) called once the operation completes.
 */
api.send = function(id, vars, callback) {
  var entry = bedrock.config.mail.templates.config[id];
  if(!entry) {
    return callback(new BedrockError(
      'Could not send email; unknown email template ID.',
      'UnknownEmailTemplateId', {id: id}));
  }
  if(entry.disabled) {
    logger.debug('not sending email, template "' + id + '" disabled.');
    return callback();
  }

  // outputs JSON
  vars.toJson = function(value) {
    return JSON.stringify(value, null, 2);
  };

  var tpl;
  try {
    // compile template
    tpl = swig.compileFile(entry.filename);
  } catch(ex) {
    return callback(new BedrockError(
      'Could not send email; a template compiling error occurred.',
      'TemplateCompileError', {
        filename: entry.filename
      }, ex));
  }

  var email;
  try {
    // produce email
    email = tpl(vars);
  } catch(ex) {
    return callback(new BedrockError(
      'Could not send email; a template processing error occurred.',
      'TemplateProcessingError', {
        filename: entry.filename
      }, ex));
  }

  // parse email into message parameter
  var mailParser = new MailParser();
  mailParser.on('error', function(err) {
    return callback(new BedrockError(
      'Could not send email; a mail parsing error occurred.',
      'MailParseError', {}, err));
  });
  mailParser.on('end', function(parsed) {
    // create message to send
    var message = parsed.headers;

    // allow text or html (headers must specify content-type and `html` will
    // be parsed if `text/html` is used)
    if('html' in parsed) {
      delete message['content-type'];
      message.attachment = [{data: parsed.html, alternative: true}];
      // produce text representation
      // TODO: add configurable options as second parameter
      try {
        message.text = htmlToText.fromString(parsed.html);
      } catch(e) {
        return callback(new BedrockError(
          'Could not send email; HTML to text conversion error.',
          'InvalidMessage', {message: message}, e));
      }
    } else if('text' in parsed) {
      message.text = parsed.text;
    }

    // TODO: support more complicated attachments, etc.

    if(!message.to || !message.from || !message.text) {
      return callback(new BedrockError(
        'Could not send email; message is missing "to", "from", or "text".',
        'InvalidMessage', {message: message}));
    }

    // only send mail if client is configured
    if(client) {
      return client.send(message, callback);
    }

    var preformatted = {
      email: {
        headers: message.headers,
        text: message.text
      }
    };
    if(parsed.html) {
      preformatted.email.html = parsed.html;
    }

    // log message instead
    var meta = {
      details: message,
      preformatted: preformatted
    };
    delete message.text;
    delete message.attachment;
    logger.debug('email logged instead of sent:', meta);
    callback();
  });
  mailParser.write(email);
  mailParser.end();
};

function handleMailEvent(info, event) {
  logger.verbose('handling event: ' + event.type);
  async.waterfall([
    function(callback) {
      if(event.details && event.details.triggers) {
        return async.eachSeries(
          event.details.triggers, function(name, callback) {
            if(!(name in triggers)) {
              logger.verbose('no triggers for: ' + name);
              return callback();
            }
            logger.verbose('firing triggers for: ' + name);
            async.eachSeries(triggers[name],
              function(trigger, callback) {
                trigger(event, callback);
              }, callback);
        }, callback);
      }
      callback();
    },
    function(callback) {
      // build mail vars
      var vars = bedrock.util.extend(
        bedrock.util.clone(bedrock.config.mail.vars),
        bedrock.util.clone(info.vars || {}),
        bedrock.util.clone(event.details || {}));

      // send message
      api.send(info.template, vars, callback);
    }
  ], function(err, details) {
    if(err) {
      logger.error(
        'could not send email for event ' + info.type + ': ' +
        err.message, {error: err});
    } else if(details) {
      logger.verbose('sent email details', details);
    }
  });
}
