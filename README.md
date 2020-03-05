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

[EJS][] includes work with file paths relative to the template. For example,
the text template `example` that includes a text footer:

`example/text.ejs`:
```ejs
Welcome to our service!

<%- include('../common/footer.text.ejs') %>
```

`common/footer.text.ejs`:
```ejs
-- 
Example Service
https://example.com/
```

See the [test](./test) directory for a full example.

## Configuration

For documentation on configuration, see [config.js](./lib/config.js), the
example above, the [test](./test) example, and the [nodemailer][] and
[email-templates][] documentation.

## API

### async use('transport', transport)

Configure at runtime to use a specific transport configuration. Transport is
the same format as `bedrock.config.mail.transport`.

### async verify()

Call the transport `verify()` method, if supported. See the [nodemailer][]
documentation. Useful to check a SMTP connection works.

### async send({template, message, locals})

Send mail using a specific template (name or path), message options, and local
vars.

```js
await brMail.send('my-template', {to: 'someone@example.com'}, {foo: 'bar'});
```

## Testing

The [test](./test) directory example tool can be used to test transports and
templates.

## CLI Overrides

This library adds global CLI options that can be useful during development to
override config values.  Boolean options are case-insensitve: `default`,
`false`, `f`, `0`, `true`, `t`, `1`.

- `--mail-to ADDRESS`: Override mail target address for **all** emails.
- `--mail-preview BOOLEAN`: Override previewing mail mode.
- `--mail-send BOOLEAN`: Override sending mail mode.
- `--mail-log BOOLEAN`: Override logging mode to print headers and text body.

[Bedrock]: https://github.com/digitalbazaar/bedrock
[EJS]: https://ejs.co/
[email-templates]: https://email-templates.js.org/
[nodemailer]: https://nodemailer.com/
