# bedrock-mail-test

## Mail Test App

This directory has a manual command line test application for mailing. It
simulates sending a secret code to an email address.

- App creates code for an accountId.
- App fires generic event for the notification.
- App listens for event.
- Account details are looked up, including name and email.
- URL for code is created.
- QR Code (PNG and Text) are created.
- Mail API is called to send email using a template

To run the app, either use defaults and the email will be previewed.

- an application that has a secret code notification event for an accountId, looks

## Installation

```
npm install
```

## Running

To run the app and open your browser with an email preview:

```
node index.js
```

To run the app and really send email, first copy the `send.js` config file,
edit the transport as needed (SMTP, SES, etc), add account info as needed, edit
any other config you like, and run with that file:

```
cp send.js my-send.js
$EDITOR my-send.js
node index.js --config my-send.js
```

To override pieces while testing, use `--help` to see all options:

```
node index.js --config my-send.js --account default
node index.js --config my-send.js --mail-to me@example.com
node index.js --config my-send.js --account default --mail-preview true --mail-send false
```

## Template Testing

Templates from other projects can be tested using the `--template` option. The
template path needs to be absolute or relative to the test template directory.
Special template locals can be added to your config file in
`bedrock.config.mail.locals`.

```
node index.js --config my-test.js --mail-to me@example.com --mail-send 0 --mail-preview 1 --mail-log 1 --template ../../sibling-project/emails/my-template
```

## Transport Testing

Transports that have `verify` support can be tested by using a config that has
`verify: true` and optionally using the `--transport-check` option. Also
helpful for debugging is to set `debug: true` and `logging: true` transport
options. These features can be used, for instance, to see SMTP traffic and
diagnose issues.
