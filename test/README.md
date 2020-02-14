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
node index.js --config my-send.js --account demo
node index.js --config my-send.js --to me@example.com
node index.js --config my-send.js --account demo --preview true --send false
```
