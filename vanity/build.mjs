import * as esbuild from 'esbuild';
import fs from 'node:fs';
const r = await esbuild.build({ entryPoints: ['vanity/vanity.js'], bundle: true, format: 'iife', write: false, target: 'es2022', charset: 'utf8' });
fs.writeFileSync('vanity/out.html', `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#e9e5df"><script>${r.outputFiles[0].text.replace(/<\/script/gi, '<\/script')}</script>`);
console.log('ok');
