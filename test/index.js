/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
const bedrock = require('bedrock');
const brMail = require('bedrock-mail');
const {config} = bedrock;
const qrcode = require('qrcode');

bedrock.events.on('bedrock-cli.init', async () => {
  // NOTE: see also the main options: --mail-{send,preview,log,to}
  bedrock.program.option('--template <template>',
    'Template name or path.', String, 'mail-test.notify');
  bedrock.program.option('--account <accountId>',
    'Account id to send to.', String, 'default');
  bedrock.program.option('--code <code>',
    'Secret code.', String, '12345');
});

const cfg = bedrock.config['mail-test'] = {};
cfg.accounts = {};
cfg.accounts.default = {
  id: 'default',
  name: 'Ima Test',
  email: 'test@example.com'
};

config.mail.locals.service = {
  name: 'Bedrock Mail Test',
  url: 'https://github.com/digitalbazaar/bedrock-mail'
};

async function getAccount({id}) {
  // lookup based on id
  if(id in cfg.accounts) {
    return cfg.accounts[id];
  }
  throw new Error(`Account not found: "${id}"`);
}

bedrock.events.on('mail-test.notify', async event => {
  console.log('EVENT', event);
  // lookup account
  const account = await getAccount({id: event.accountId});
  console.log('ACCOUNT', account);
  const secretCode = event.secretCode;
  const secretCodeUrl = `https://example.com/private?code=${secretCode}`;
  const secretCodeQRDataUrl = await qrcode.toDataURL(secretCodeUrl);
  const secretCodeQRString = await qrcode.toString(secretCodeUrl);
  const mail = await brMail.send({
    template: event.template,
    message: {
      to: account.email,
      attachments: [{
        cid: 'code',
        href: secretCodeQRDataUrl
      }]
    },
    locals: {
      account,
      secretCode,
      secretCodeUrl,
      secretCodeQRDataUrl,
      secretCodeQRString
    }
  });
  console.log('MAIL', mail);
});

bedrock.events.on('template-test', async event => {
  console.log('EVENT', event);
  // lookup account
  const account = await getAccount({id: event.accountId});
  console.log('ACCOUNT', account);
  const secretCode = event.secretCode;
  const mail = await brMail.send({
    template: bedrock.program.template,
    message: {
      to: account.email
    },
    locals: {
      account,
      secretCode
    }
  });
  console.log('MAIL', mail);
});

bedrock.events.on('bedrock.ready', async () => {
  console.log('OPTIONS', {
    template: bedrock.program.template,
    send: bedrock.program.send,
    preview: bedrock.program.preview,
    account: bedrock.program.account,
    to: bedrock.program.to,
    code: bedrock.program.code
  });
  console.log('MAIL CONFIG', bedrock.config.mail);
  console.log('MAIL TEST CONFIG', bedrock.config['mail-test']);
  console.log('ready');
  console.log('emitting event');
  // use special event for main test, else use generic event
  const eventName =
    bedrock.program.tempalte === 'mail-test.notify' ?
      'mail-test.notify' : 'template-test';
  // could use emitLater(), awaiting for this test
  await bedrock.events.emit(eventName, {
    template: bedrock.program.template,
    accountId: bedrock.program.account,
    secretCode: bedrock.program.code
  });
  console.log('done');
  process.exit();
});

bedrock.start();
