'use strict';

const { promisify } = require('util');
const fs = require('fs');
const deleteFile = promisify(fs.unlink);
const readFile = promisify(fs.readFile);
const spawn = require('child_process').spawn;
const pFinally = require('p-finally');
const tempWrite = require('temp-write');

const reVim = /\b(?:[gm]?vim)(?:\.exe)?$/i;
const isVim = editor => reVim.test(editor);
const isWindows = /^win/i.test(process.platform);

module.exports = function edit(template, filename) {
  return tempWrite(template, filename)
    .then(tmpfile => pFinally(editFile(tmpfile), () => deleteFile(tmpfile)));
};

function editFile(filepath) {
  const ed = isWindows ? 'notepad' : 'vim';
  const editor = process.env.VISUAL || process.env.EDITOR || ed;
  const args = isVim(editor) ? ['--cmd', 'set ft=gitcommit tw=0 wrap lbr'] : [];
  return new Promise((resolve, reject) => {
    const proc = spawn(editor, args.concat([filepath]), { stdio: 'inherit' });
    proc.once('error', err => reject(err));
    proc.once('exit', code => {
      if (code) return reject(new Error(`Editor failed: code=${code}`));
      resolve();
    });
  }).then(() => readFile(filepath, 'utf-8'));
}
