/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import * as bedrock from '@bedrock/core';
import {readFile, stat} from 'node:fs/promises';
import {convert} from 'html-to-text';
import ejs from 'ejs';
import {logger} from './logger.js';
import {LRUCache as LRU} from 'lru-cache';
import nodemailer from 'nodemailer';
import path from 'node:path';
import {previewEmail} from './previewEmail.js';
import process from 'node:process';

const {BedrockError} = bedrock.util;

// load config defaults
import './config.js';

const COMPONENTS = ['subject', 'html', 'text'];

// do not cache in development/test mode
const env = (process.env.NODE_ENV ?? 'development').toLowerCase();
const CACHE = ['development', 'test'].includes(env) ?
  undefined : new LRU({max: 100});

const TEMPLATE_EXTENSION = '.ejs';

export class EmailClient {
  constructor({
    transport,
    templateRootPath,
    send = false,
    preview = false,
    // defaults for all emails
    message = {},
    subjectPrefix
  } = {}) {
    this.config = {
      transport,
      send,
      preview,
      message,
      subjectPrefix,
      templateRootPath,
      htmlToText: {
        selectors: [{selector: 'img', format: 'skip'}]
      }
    };

    // send disabled; ensure JSONTransport is used
    if(!this.config.send) {
      this.config.transport = nodemailer.createTransport({jsonTransport: true});
    }
  }

  async renderMessage({template, locals = {}, message} = {}) {
    // initialize message
    message = {...message};
    COMPONENTS.forEach(c => c in message ? undefined : message[c] = undefined);

    // render and update all message components w/ given template
    if(template) {
      await Promise.all(COMPONENTS.map(async component => {
        const result = await this._renderComponent({
          template, component, locals
        });
        if(result) {
          message[component] = result;
        }
      }));
    }

    if(message.subject) {
      if(this.config.subjectPrefix) {
        message.subject = this.config.subjectPrefix + message.subject;
      }
      message.subject = message.subject.trim();
    }

    // if no `text` is present, produce it from html
    if(message.html && !message.text) {
      message.text = convert(message.html, this.config.htmlToText).trim();
    }

    // throw error for totally blank message
    if(!(message.subject || message.html || message.text ||
      message.attachments?.length > 0)) {
      const error = new BedrockError(
        `No message content detected for template "${template}"; ` +
        '(no "subject", "html", "text", nor "attachments").', {
          name: 'DataError'
        });
      logger.error('Empty email detected and not sent.', {error});
      throw error;
    }

    return message;
  }

  async send(options = {}) {
    const {template = ''} = options;
    const locals = {...options.locals};

    // construct fully rendered message
    let message = {
      ...this.config.message,
      ...options.message,
      attachments: options.message.attachments ??
        this.config.message.attachments ?? []
    };
    message = await this.renderMessage({template, locals, message});

    // preview email in a browser
    if(this.config.preview) {
      await previewEmail({message});
    }

    // send message
    const result = await this.config.transport.sendMail(message);
    result.originalMessage = message;
    return result;
  }

  // convert a template name to a full file path
  _getTemplateFilePath({templateName} = {}) {
    // `templateName` format is either:
    // 1. absolute file path w/ or w/o the extension
    // 2. <templateName>/<subject|html|text>
    const [root, basename] = path.isAbsolute(templateName) ?
      [path.dirname(templateName), path.basename(templateName)] :
      [this.config.templateRootPath, templateName];
    let filePath = path.join(root, basename);
    if(!filePath.endsWith(TEMPLATE_EXTENSION)) {
      filePath += TEMPLATE_EXTENSION;
    }
    return filePath;
  }

  // render a template file
  async _render({filePath, locals = {}} = {}) {
    // get cached compiled template/compile template
    let renderFn = this.config.cache && CACHE.get(filePath);
    if(!renderFn) {
      try {
        const content = await readFile(filePath, 'utf8');
        renderFn = ejs.compile(content, {
          // note: including files is currently not possible in `async` mode
          //async: true,
          // enable `includes` in templates
          root: this.config.templateRootPath,
          views: [path.dirname(filePath)]
        });
        if(this.config.cache) {
          CACHE.set(filePath, renderFn);
        }
      } catch(cause) {
        const error = new BedrockError(
          `Could not compile email template "${filePath}": ${cause.message}`, {
            name: 'OperationError',
            cause
          });
        logger.error('Could not compile email template', {error});
        throw error;
      }
    }

    return renderFn(locals);
  }

  // renders a component of a message, if a template file for it exists
  async _renderComponent({template, component, locals = {}} = {}) {
    // template name format is: <template>/<subject|html|text>
    const templateName = path.join(template, component);
    const filePath = this._getTemplateFilePath({templateName});
    const exists = await this._templateFileExists({filePath});
    if(!exists) {
      return;
    }
    return this._render({filePath, locals});
  }

  async _templateFileExists({filePath} = {}) {
    try {
      const stats = await stat(filePath);
      if(!stats.isFile()) {
        const error = new BedrockError(
          `Template "${filePath}" is not a file.`, {
            name: 'OperationError'
          });
        logger.error(`Template "${filePath}" is not a file.`, {error});
        throw error;
      }
      return true;
    } catch(e) {
      return false;
    }
  }
}
