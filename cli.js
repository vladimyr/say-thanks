#!/usr/bin/env node

'use strict';

const { bold, green, red } = require('kleur');
const argv = require('minimist')(process.argv.slice(2));
const edit = require('./lib/edit.js');
const exec = require('util').promisify(require('child_process').exec);
const pkg = require('./package.json');
const spinner = require('ora')();
const { HTTPError, getInboxUrl, sayThanks } = require('./index.js');

const flag = (argv, short, long) => ({ [long]: (short && argv[short]) || argv[long] });
const isComment = line => /^\s*#/.test(line);
const isEmpty = line => line.trim().length <= 0;
const isLast = line => line.includes(scissors);
const hasSignature = lines => lines.length >= 3 && isEmpty(lines[lines.length - 2]);
const stripPrefix = (str, prefix) => str.replace(new RegExp(`^\\s*${prefix}`), '');

const startMessage = recipient => `Sending thank you note to: ${recipient}`;
const successMessage = recipient => `Thank you note sent to: ${recipient}\n
Thanks for spreading positivity!
You can create your own thankfulness inbox by visiting SayThanks.io.`;

const filename = 'THANKYOUNOTE_EDITMSG';
const scissors = '>8';
const header = '❝ THANK YOU ❞';
const signaturePrefix = 'Sincerely,';

const template = (recipient, author = '') => `${header}

Dear ${recipient},
Thank you for...

${signaturePrefix} ${author}
# Please keep blank line between note body and signature.
# ------------------------ ${scissors} ------------------------
# Do not modify or remove the line above.
# Everything below it will be ignored.
#
# Sending thank you note to ${recipient}
# SayThanks.io :: https://saythanks.io/to/${recipient}`;

const help = `
  ${bold(pkg.name)} v${pkg.version}

  Send thank you note to open source creators from your termial (uses
  https://saythanks.io)

  Usage:
    $ ${pkg.name} [recipient]

  Options:
    -h, --help     Show help                                           [boolean]
    -v, --version  Show version number                                 [boolean]

  Homepage:     ${green(pkg.homepage)}
  Report issue: ${green(pkg.bugs.url)}
`;

const flags = {
  ...flag(argv, 'h', 'help'),
  ...flag(argv, 'v', 'version')
};
const input = argv._;
program(input, flags).catch(err => console.error(formatError(err.stack)));

async function program([recipient], flags) {
  if (flags.version) return console.log(pkg.version);
  if (flags.help) return console.log(help);
  const [url, username] = await Promise.all([
    getInboxUrl(recipient),
    getGitUsername()
  ]);
  if (!url) {
    console.error(formatError(`User "${recipient}" does not exist!`));
    return;
  }
  const note = await edit(template(recipient, username), filename);
  const { message, author } = parseNote(note);
  spinner.start(startMessage(recipient));
  try {
    await sayThanks(url, message, author);
    spinner.succeed(successMessage(recipient));
  } catch (err) {
    if (!(err instanceof HTTPError)) throw err;
    spinner.fail(formatError(err.message));
  }
}

function formatError(message) {
  return message.replace(/^(Error:\s+)*/, red().bold('Error: '));
}

function parseNote(note) {
  const lines = getLines(note);
  let author;
  if (hasSignature(lines)) author = lines.pop();
  let message = lines.join('\n');
  author = stripPrefix(author, signaturePrefix).trim();
  message = stripPrefix(message, header).trim();
  return { message, author };
}

function getLines(note) {
  const filtered = [];
  const lines = note.split(/\r?\n/g);
  lines.some(line => {
    if (isLast(line)) return true;
    if (!isComment(line)) filtered.push(line);
  });
  return filtered;
}

async function getGitUsername() {
  try {
    const { stdout } = await exec('git config user.name');
    return stdout.toString().trim();
  } catch (err) {}
}
