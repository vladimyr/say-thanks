'use strict';

const { config } = require('./package.json');
const r = require('got');
const urlJoin = require('url-join');

const { HTTPError } = r;

const isHttpError = err => err instanceof HTTPError;
const isNotFound = err => err.statusCode === 404;
const isRedirect = err => err.statusCode >= 300 && err.statusCode < 400;

module.exports = {
  getInboxUrl,
  sayThanks,
  HTTPError
};

async function getInboxUrl(recipient) {
  if (!recipient) throw new TypeError('"recipient" is required param');
  const url = urlJoin(config.baseUrl, '/to/', recipient);
  try {
    await r.head(url);
    return url;
  } catch (err) {
    if (!isHttpError(err) || !isNotFound(err)) throw err;
  }
}

function sayThanks(url, message, author = '', options = {}) {
  if (!message) throw new TypeError('"message" is required param');
  const body = { body: message, byline: author, submit: '' };
  return submitForm(urlJoin(url, '/submit'), body, options);
}

async function submitForm(url, body, { followRedirects = false } = {}) {
  let resp;
  try {
    resp = await r.post(url, { body, form: true });
  } catch (err) {
    if (!isHttpError(err) || !isRedirect(err)) throw err;
    if (followRedirects) resp = await r.get(err.headers.location);
  }
  return resp;
}
