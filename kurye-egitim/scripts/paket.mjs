// Paylaşımlı sunucuya yüklenecek paketi hazırlar: paket/kurye-egitim.zip
// Önce `npm run build` çalışmış olmalı (npm run paket ikisini de yapar).
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const files = ['index.html', 'sw.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
rmSync('paket', { recursive: true, force: true });
mkdirSync('paket/kurye-egitim', { recursive: true });
for (const f of files) cpSync(`dist/${f}`, `paket/kurye-egitim/${f}`);
for (const f of ['.htaccess', 'KURULUM.txt']) cpSync(`deploy/${f}`, `paket/kurye-egitim/${f}`);
execFileSync('zip', ['-qr', 'kurye-egitim.zip', 'kurye-egitim'], { cwd: 'paket' });
console.log('paket/kurye-egitim.zip hazır');
