# bedrock-mail

A [bedrock][] module that allows you to send automated, template-based emails
in response to events. Data used in the templates comes from both data in the
events and from "triggers" that are run to load data for the event. Templates
are written using [Swig][].

## Requirements

- npm v3+

## Quick Examples

```
npm install bedrock-mail
```

```js
var bedrock = require('bedrock');
var brMail = require('bedrock-mail');

// OPTIONAL: add triggers in your module init function
brMail.registerTrigger('getValue', function(event, callback) {
  // custom code run for trigger
  // for example, get a value for the email event
  myLib.getValue(
    null, event.details.valueId, function(err, value) {
    if(!err) {
      event.details.value = value;
    }
    callback(err);
  });
});

// setup events
bedrock.config.mail.events.push({
  type: 'myModule.myEvent',
  // email for admin
  template: 'myModule.myEvent'
}, ...);
var ids = [
  'myModule.myEvent',
  ...
];
ids.forEach(function(id) {
  config.mail.templates.config[id] = {
    // adjust to point to your module email templates
    filename: path.join(__dirname, '..', 'email-templates', id + '.tpl')
  };
});
// can set values for use in all events
bedrock.config.mail.vars.service = {
  name: 'My Service'
};
bedrock.config.mail.vars.support = {
  name: 'My Service'
  email: 'support@example.com'
};

// send email
bedrock.events.emitLater({
  type: 'myModule.myEvent',
  details: {
    // optional list of triggers to run
    triggers: ['getIdentity', 'getValue'],
    // optional event specific data
    valueId: aValueId,
    myData1: 'custom data 1',
    myData2: 'custom data 2',
    ...
  }
});
```

Example template `myModule.myEvent.tpl`:
```
To: {{identity.email}}
From: "{{service.name}} {{support.name}}" <{{support.email}}>
Subject: An event happened on {{service.name}}!

Hello {{identity.label}},

An event happened!
Value: {{value}}.
My data 1: {{myData1}}.
My data 2: {{myData2}}.

If you have any questions or comments please contact {{support.email}}.
```

This template depends on the `service` object and properties to be setup on a
global level. It uses identity data from the `getIdentity` trigger and value
data from the `getValue` trigger. Extra event data is also used.

## Configuration

For documentation on configuration, see [config.js](./lib/config.js) and the
quick example above.

## API

### registerTrigger(name, trigger(event, callback))

Register a "trigger" that can be run during mail events. This trigger can be
used to update event data.

```js
brMail.registerTrigger('getValue', function(event, callback) {
  // custom code run for trigger
  // for example, get a value for the email event
  myLib.getValue(
    null, event.details.valueId, function(err, value) {
    if(!err) {
      event.details.value = value;
    }
    callback(err);
  });
});
```

### send(id, vars, callback)

Directly send mail using a specific template id and vars. Prefer using the
event system.

```js
brMail.send('a-template-id', {...}, callback);
```

### event interface

Use the config system to setup mail events, associated template ids, and
filenames for templates. This interface is preferred to the direct `send` API
since it can run asynchronously.

See the Quick Example above for configuration and use.

[bedrock]: https://github.com/digitalbazaar/bedrock
[Swig]: https://paularmstrong.github.io/swig/
