// dist/index.html → dist/artifact.html: claude.ai Artifact sayfası olarak yayınlamak için
// doctype/html/head/body etiketleri çıkarılır (yayın sırasında platform kendi iskeletini ekler).
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const pick = (re) => [...html.matchAll(re)].map((m) => m[0]);
const title = pick(/<title>[\s\S]*?<\/title>/g);
const metas = pick(/<meta name="claude:[^>]*>/g);
const links = pick(/<link[^>]*fonts\.(googleapis|gstatic)[^>]*>/g);
const styles = pick(/<style[^>]*>[\s\S]*?<\/style>/g);
const scripts = pick(/<script[^>]*>[\s\S]*?<\/script>/g);
const out = [...title, ...metas, ...links, ...styles, '<div id="root"></div>', ...scripts].join('\n');
writeFileSync('dist/artifact.html', out);
console.log(`artifact.html: ${(out.length / 1024).toFixed(0)} KB`);
