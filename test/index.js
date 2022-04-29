/*!
 * Copyright (c) 2020-2022 Digital Bazaar, Inc. All rights reserved.
 */
import * as bedrock from '@bedrock/core';
import * as brMail from '@bedrock/mail';
const {config} = bedrock;
import qrcode from 'qrcode';

bedrock.events.on('bedrock-cli.init', async () => {
  // NOTE: see also the main options: --mail-{send,preview,log,to}
  bedrock.program.option('--transport-check',
    'Stop after setting up transport. Useful to debug transports.');
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
  try {
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
  } catch(error) {
    console.log('ERROR', {error});
  }
});

bedrock.events.on('template-test', async event => {
  console.log('EVENT', event);
  // lookup account
  const account = await getAccount({id: event.accountId});
  console.log('ACCOUNT', account);
  const secretCode = event.secretCode;
  try {
    const mail = await brMail.send({
      template: bedrock.program.opts().template,
      message: {
        to: account.email
      },
      locals: {
        account,
        secretCode
      }
    });
    console.log('MAIL', mail);
  } catch(error) {
    console.log('ERROR', {error});
  }
});

bedrock.events.on('bedrock.ready', async () => {
  const opts = bedrock.program.opts();
  console.log('OPTIONS', {
    transportCheck: opts.transportCheck,
    template: opts.template,
    send: opts.send,
    preview: opts.preview,
    account: opts.account,
    to: opts.to,
    code: opts.code
  });
  console.log('MAIL CONFIG', bedrock.config.mail);
  console.log('MAIL TEST CONFIG', bedrock.config['mail-test']);
  console.log('ready');
  if(opts.transportCheck) {
    console.log('transport check done');
    process.exit();
  }
  console.log('emitting event');
  // use special event for main test, else use generic event
  const eventName = opts.template === 'mail-test.notify' ?
    'mail-test.notify' : 'template-test';
  // could use emitLater(), awaiting for this test
  await bedrock.events.emit(eventName, {
    template: opts.template,
    accountId: opts.account,
    secretCode: opts.code
  });
  console.log('done');
  process.exit();
});

bedrock.start();
