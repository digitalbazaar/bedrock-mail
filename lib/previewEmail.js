/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import ejs from 'ejs';
import mailparser from 'mailparser';
import nodemailer from 'nodemailer';
import open from 'open';
import os from 'node:os';
import path from 'node:path';
import util from 'node:util';
import {writeFile} from 'node:fs/promises';

// implementation is inspired by: https://www.npmjs.com/package/preview-email

const {simpleParser} = mailparser;
const transport = nodemailer.createTransport({
  streamTransport: true,
  buffer: true
});
const templateFilePath = path.join(import.meta.dirname, 'previewTemplate.ejs');
const renderFilePromise = util.promisify(ejs.renderFile);

export async function previewEmail({message} = {}) {
  const response = await transport.sendMail(message);
  const parsed = await simpleParser(response.message);
  parsed.base64 = Buffer.from(response.message).toString('base64');

  const html = await renderFilePromise(templateFilePath, parsed);
  const filePath = path.join(os.tmpdir(), `${crypto.randomUUID()}.html`);
  const url = `file://${filePath}`;

  await writeFile(filePath, html);
  await open(url, {wait: false});

  return url;
}
