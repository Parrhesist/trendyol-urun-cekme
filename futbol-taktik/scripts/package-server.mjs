// Kendi sunucusunda çalışacak paketleri hazırlar:
//   dagitim/saha-kenari-sunucu.zip  — Node.js sunucusu (VPS): server.js, public/, statik/, kurulum dosyaları
//   dagitim/saha-kenari-hosting.zip — paylaşımlı hosting (PHP): public_html'e ayıklanır, kökte çalışır
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const OUT = 'paket/saha-kenari';
const ZIP = 'dagitim/saha-kenari-sunucu.zip';
const html = readFileSync('dist/index.html', 'utf8');

const appMeta = [
  '<link rel="manifest" href="manifest.webmanifest" />',
  '<meta name="theme-color" content="#10261a" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '<meta name="apple-mobile-web-app-title" content="Saha Kenarı" />',
  '<link rel="apple-touch-icon" href="apple-touch-icon.png" />',
  '<link rel="icon" type="image/png" href="icon-192.png" />',
].join('\n    ');
// runtime.js uygulamadan önce çalışmalı: window.claude yerine sunucuya bağlanır
const inject = (extra) => {
  if (!html.includes('<head>')) throw new Error('dist/index.html içinde <head> bulunamadı');
  return html.replace('<head>', `<head>\n    ${extra}${appMeta}`);
};

rmSync('paket', { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
mkdirSync('dagitim', { recursive: true });
cpSync('sunucu', OUT, { recursive: true });
writeFileSync(`${OUT}/public/index.html`, inject('<script src="runtime.js"></script>\n    '));

mkdirSync(`${OUT}/statik`, { recursive: true });
writeFileSync(`${OUT}/statik/index.html`, inject(''));
for (const f of ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'icon.svg']) cpSync(`sunucu/public/${f}`, `${OUT}/statik/${f}`);

rmSync(ZIP, { force: true });
execFileSync('zip', ['-r', '-X', '-q', `../${ZIP}`, 'saha-kenari'], { cwd: 'paket' });
console.log(`${ZIP}: ${(readFileSync(ZIP).length / 1024).toFixed(0)} KB`);

// paylaşımlı hosting: dosyalar zip'in kökünde (public_html içine ayıklanınca doğrudan alan adında açılır)
const HOST_OUT = 'paket/hosting';
const HOST_ZIP = 'dagitim/saha-kenari-hosting.zip';
cpSync('hosting', HOST_OUT, { recursive: true });
writeFileSync(`${HOST_OUT}/index.html`, inject('<script src="runtime.js"></script>\n    '));
for (const f of ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'icon.svg']) cpSync(`sunucu/public/${f}`, `${HOST_OUT}/${f}`);
rmSync(HOST_ZIP, { force: true });
execFileSync('zip', ['-r', '-X', '-q', `../../${HOST_ZIP}`, '.'], { cwd: HOST_OUT });
rmSync('paket', { recursive: true, force: true });
console.log(`${HOST_ZIP}: ${(readFileSync(HOST_ZIP).length / 1024).toFixed(0)} KB`);
