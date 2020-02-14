const {config} = require('bedrock');

config.mail.send = true;
config.mail.preview = false;
config.mail.message = {
  from: 'Bedrock Mail Test <test@example.com>'
};
config.mail.transport = {
  type: 'smtp',
  options: {
    //host: 'mail.example.com',
    host: 'localhost',
    port: 25,
    //secure: true,
    ignoreTLS: true
    //tls: {
    //  rejectUnauthorized: false
    //}
  }
};
config['mail-test'].accounts['test'] = {
  id: 'test',
  email: 'test@example.com',
  name: 'Test Account'
};
