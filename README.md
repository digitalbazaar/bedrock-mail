# bedrock-mail

A [Bedrock][] module that allows you to send automated, template-based emails
in response to events. Data used in the templates comes from both data in the
events and from "triggers" that are run to load data for the event. Templates
can be written in any language supported by [email-templates][].

## Requirements

- An available [nodemailer][] transport (SMTP, AWS SES, etc).

## Quick Examples

```
npm install bedrock-mail
```

```js
const bedrock = require('bedrock');
const brMail = require('bedrock-mail');
const {config} = bedrock;

// configure default mail behavior
// defaults to send if NODE_ENV is 'production'
//config.mail.send = true;
// defaults for every message
config.mail.message = {
  from: 'My Company Support <support@example.com>'
};

// setup SMTP transport
bedrock.config.mail.transport = {
  type: 'smtp',
  options: {
    host: 'mail.example.com'
  },
  verify: true
};

// setup default template locals for all mails
bedrock.config.mail.locals.service = {
  name: 'My Service',
  url: 'https://example.com/'
};

// schedule generic event
bedrock.events.emitLater({
  type: 'myModule.myEvent',
  details: {
    accountId: 1234,
    image: 'https://example.com/images/2020-01-01.png'
  }
});

// handle generic even and send email
bedrock.events.on('myModule.myEvent', async event => {
  const account = await getAccount(event.accountId);
  brMail.send({
    template: 'myModule.myEvent',
    message: {
      to: account.email
    },
    locals: {
      image: event.image
    }
  });
});
```

Example [EJS][] subject template `events/myModule.myEvent/subject.ejs`:
```ejs
Here's your daily image from <%= service.name %>!
```

Example [EJS][] html template `events/myModule.myEvent/html.ejs`:
```ejs
<html>
  <body>
    <p>Hello <%= account.name %>,</p>
    <p>Here's your daily image:</p>
    <p><img src="<%= image %>"></p>
    <hr/>
    <p><a href="<%= service.url %>"><%= service.name %></a></p>
  </body>
</html>
```

Example [EJS][] text template if the auto-generated one from HTML is not
sufficient `events/myModule.myEvent/text.ejs`:
```ejs
Hello <%= account.name %>,

Here's a link to your daily image:
<%= image %>

-- 
<%= service.name %>
<%= service.url %>
```

This template depends on the `service` object and properties to be setup on a
global level. See the [nodemailer][] docs if you want to add attachments,
embedded images, or use other features.

See the [test](./test) directory for a full example.

## Configuration

For documentation on configuration, see [config.js](./lib/config.js), the
example above, the [test](./test) example, and the [nodemailer][] and
[email-templates][] documentation.

## API

### send({template, message, locals})

Send mail using a specific template (name or path), message options, and local
vars.

```js
await brMail.send('my-template', {to: 'someone@example.com'}, {foo: 'bar'});
```

[Bedrock]: https://github.com/digitalbazaar/bedrock
[email-templates]: https://email-templates.js.org/
[nodemailer]: https://nodemailer.com/
