'use strict';
// Saha Kenarı — kendi sunucunuzda çalışan takım sunucusu.
// Node.js 18+ ile ek paket kurmadan çalışır: uygulamayı sunar, takım verisini data/veri.json'da saklar,
// tabletler, TV'ler ve telefonlar arasında değişiklikleri anında (SSE) dağıtır.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

// PORT verilmezse önce 80 denenir (adres çubuğunda port yazmadan http://alanadi/), olmazsa 8080
const PORTS = process.env.PORT ? [Number(process.env.PORT)] : [80, 8080];
const HOST = process.env.HOST || '0.0.0.0';
const COACH_PW = process.env.ANTRENOR_SIFRESI || '';
const VIEW_PW = process.env.IZLEME_SIFRESI || '';
const DATA_DIR = path.resolve(process.env.VERI_KLASORU || path.join(__dirname, 'data'));
const PUBLIC_DIR = path.join(__dirname, 'public');
const DB_FILE = path.join(DATA_DIR, 'veri.json');

// Uygulamanın kullandığı koleksiyonlar; "screens" TV nabzıdır: şifresiz yazılır, diske kaydedilmez
const COLLECTIONS = new Set(['players', 'tactics', 'drills', 'sessions', 'matches', 'settings', 'live', 'screens']);
const OPEN_WRITE = new Set(['screens']);
const EPHEMERAL = new Set(['screens']);
const SEG = /^[A-Za-z0-9_-]{1,100}$/;
const MAX_BODY = 2 * 1024 * 1024;
const MAX_DOCS = 20000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

/* ---------------- veri ---------------- */

const docs = new Map(); // "koleksiyon/belge" -> nesne
fs.mkdirSync(DATA_DIR, { recursive: true });
if (fs.existsSync(DB_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    for (const [k, v] of Object.entries(raw.docs || {})) docs.set(k, v);
    // her açılışta bir önceki kaydın yedeği
    fs.copyFileSync(DB_FILE, path.join(DATA_DIR, 'veri.yedek.json'));
  } catch (e) {
    console.error(`HATA: ${DB_FILE} okunamadı (${e.message}). Dosyayı düzeltin ya da veri.yedek.json ile değiştirin; veri kaybını önlemek için sunucu başlatılmadı.`);
    process.exit(1);
  }
}

let saveTimer = null;
function persistNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  const out = {};
  for (const [k, v] of docs) if (!EPHEMERAL.has(k.split('/')[0])) out[k] = v;
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ surum: 1, kayit: new Date().toISOString(), docs: out }));
  fs.renameSync(tmp, DB_FILE);
}
function persistSoon(col) {
  if (EPHEMERAL.has(col) || saveTimer) return;
  saveTimer = setTimeout(() => {
    try {
      persistNow();
    } catch (e) {
      console.error('Veri kaydedilemedi:', e.message);
    }
  }, 400);
}

/* ---------------- canlı bağlantılar (SSE) ---------------- */

const clients = new Map(); // id -> { res, presence }
function send(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients.values()) c.res.write(msg);
}
function peers() {
  return [...clients].filter(([, c]) => c.presence).map(([id, c]) => ({ id, presence: c.presence }));
}
setInterval(() => {
  for (const c of clients.values()) c.res.write(': ping\n\n');
  const now = Date.now();
  for (const [ip, f] of failures) if (f.until < now && f.n === 0) failures.delete(ip);
}, 20000).unref();

/* ---------------- yetki ---------------- */

const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();
const same = (a, b) => crypto.timingSafeEqual(digest(a), digest(b));
const failures = new Map(); // ip -> { n, until }
function ipOf(req) {
  const direct = req.socket.remoteAddress || '';
  // X-Forwarded-For yalnızca aynı makinedeki vekil sunucudan (nginx vb.) geliyorsa dikkate alınır
  const local = direct === '127.0.0.1' || direct === '::1' || direct === '::ffff:127.0.0.1';
  return (local && (req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || direct;
}
function blocked(req) {
  const f = failures.get(ipOf(req));
  return !!f && f.until > Date.now();
}
function failed(req) {
  const ip = ipOf(req);
  const f = failures.get(ip) || { n: 0, until: 0 };
  f.n += 1;
  if (f.n >= 10) {
    f.until = Date.now() + 10 * 60 * 1000;
    f.n = 0;
  }
  failures.set(ip, f);
}
/** Site şifresi (IZLEME_SIFRESI) verildiyse tarayıcının kendi giriş penceresiyle sorulur */
function siteAllowed(req) {
  if (!VIEW_PW) return true;
  const m = /^Basic (.+)$/.exec(req.headers.authorization || '');
  if (!m) return false;
  const pass = Buffer.from(m[1], 'base64').toString('utf8').split(':').slice(1).join(':');
  return same(pass, VIEW_PW) || (COACH_PW && same(pass, COACH_PW));
}
function canWrite(req) {
  if (!COACH_PW) return true;
  const given = req.headers['x-antrenor-sifresi'];
  if (typeof given !== 'string' || !given) return false;
  let pw;
  try {
    pw = decodeURIComponent(given); // Türkçe karakterli şifreler kodlanmış gelir
  } catch {
    return false;
  }
  return same(pw, COACH_PW);
}

/* ---------------- yardımcılar ---------------- */

function reply(res, status, body, headers = {}) {
  const isObj = body !== undefined && typeof body !== 'string';
  res.writeHead(status, { 'Cache-Control': 'no-store', ...(isObj ? { 'Content-Type': 'application/json; charset=utf-8' } : {}), ...headers });
  res.end(isObj ? JSON.stringify(body) : body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('çok büyük'), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return reply(res, 403, 'Yasak');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      // bilinmeyen adresler uygulamayı açar (ör. /panel)
      if (!path.extname(rel)) return serveStatic(req, res, '/index.html');
      return reply(res, 404, 'Bulunamadı');
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': ext === '.html' || ext === '.js' || ext === '.webmanifest' ? 'no-cache' : 'public, max-age=86400',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

/* ---------------- API ---------------- */

async function api(req, res, parts) {
  const [what, col, id] = parts;

  if (what === 'saglik') return reply(res, 200, 'ok');

  if (what === 'durum' && req.method === 'GET') {
    const given = req.headers['x-antrenor-sifresi'];
    if (COACH_PW && given && !canWrite(req)) failed(req);
    return reply(res, 200, { yazma: canWrite(req), korumali: !!COACH_PW });
  }

  if (what === 'olaylar' && req.method === 'GET') {
    const cid = crypto.randomUUID();
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 3000\n\n');
    send(res, 'hello', { id: cid });
    send(res, 'snapshot', { docs: Object.fromEntries(docs) });
    send(res, 'peers', peers());
    clients.set(cid, { res, presence: null });
    req.on('close', () => {
      const c = clients.get(cid);
      clients.delete(cid);
      if (c && c.presence) broadcast('peers', peers());
    });
    return;
  }

  if (what === 'varlik' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)) || '{}');
    const c = clients.get(String(body.baglanti || ''));
    if (!c) return reply(res, 404, { hata: 'bağlantı yok' });
    const p = body.varlik && typeof body.varlik === 'object' ? body.varlik : null;
    c.presence = p && Object.values(p).some((v) => v !== null && v !== undefined) ? p : null;
    broadcast('peers', peers());
    return reply(res, 204, '');
  }

  if (what === 'belge' && (req.method === 'PUT' || req.method === 'DELETE')) {
    if (!col || !id || !COLLECTIONS.has(col) || !SEG.test(id)) return reply(res, 400, { hata: 'geçersiz belge yolu' });
    if (!OPEN_WRITE.has(col) && !canWrite(req)) {
      if (req.headers['x-antrenor-sifresi']) failed(req);
      return reply(res, 403, { hata: 'Bu işlem için antrenör şifresi gerekli.' });
    }
    const key = `${col}/${id}`;
    if (req.method === 'DELETE') {
      if (docs.delete(key)) {
        broadcast('del', { path: key });
        persistSoon(col);
      }
      return reply(res, 204, '');
    }
    let data;
    try {
      data = JSON.parse(await readBody(req));
    } catch (e) {
      return reply(res, e.status || 400, { hata: e.status === 413 ? 'belge çok büyük' : 'geçersiz JSON' });
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return reply(res, 400, { hata: 'belge bir nesne olmalı' });
    if (!docs.has(key) && docs.size >= MAX_DOCS) return reply(res, 507, { hata: 'belge sınırı doldu' });
    docs.set(key, data);
    broadcast('set', { path: key, data });
    persistSoon(col);
    return reply(res, 204, '');
  }

  return reply(res, 404, { hata: 'bilinmeyen istek' });
}

/* ---------------- sunucu ---------------- */

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/saglik') return reply(res, 200, 'ok');
    if (blocked(req)) return reply(res, 429, 'Çok fazla hatalı şifre denemesi. 10 dakika sonra yeniden deneyin.');
    if (!siteAllowed(req)) return reply(res, 401, 'Giriş gerekli', { 'WWW-Authenticate': 'Basic realm="Saha Kenari", charset="UTF-8"' });
    const parts = url.pathname.split('/').filter(Boolean);
    // uygulama bir alt klasörde de yayınlanabilir: .../api/... her yerde API'dir
    const at = parts.indexOf('api');
    if (at >= 0) return await api(req, res, parts.slice(at + 1));
    if (req.method !== 'GET' && req.method !== 'HEAD') return reply(res, 405, 'İzin verilmeyen yöntem');
    return serveStatic(req, res, url.pathname);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) reply(res, e.status || 500, { hata: 'sunucu hatası' });
    else res.end();
  }
});

/** Sunucuya dışarıdan ulaşılabilecek adresler (yerel ağ IP'leri) */
function addresses(port) {
  const tail = port === 80 ? '' : `:${port}`;
  if (HOST !== '0.0.0.0') return [`http://${HOST}${tail}/`];
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => n.address);
  return ['localhost', ...ips].map((h) => `http://${h}${tail}/`);
}

function listen(i) {
  const port = PORTS[i];
  const onError = (e) => {
    const next = PORTS[i + 1];
    if (e.code === 'EACCES') {
      console.warn(`${port} numaralı port yönetici yetkisi ister.${next ? ` ${next} numaralı porta geçiliyor.` : ''}`);
      if (port < 1024)
        console.warn('  Adres çubuğunda port yazmadan açmak için: sudo ile çalıştırın, ya da bir kez "sudo setcap cap_net_bind_service=+ep $(which node)" deyin (bkz. BENIOKU.md).');
    } else if (e.code === 'EADDRINUSE') {
      console.warn(`${port} numaralı portu başka bir program kullanıyor${port === 80 ? ' (büyük olasılıkla Apache ya da nginx)' : ''}.${next ? ` ${next} numaralı porta geçiliyor.` : ''}`);
      if (port === 80) console.warn('  Alan adının kökünde açmak için o web sunucusuna yönlendirme ekleyin: nginx-ornek.conf ya da apache-ornek.conf (bkz. BENIOKU.md).');
    } else console.error(`Sunucu başlatılamadı: ${e.message}`);
    server.removeListener('listening', onListening);
    if (next && (e.code === 'EACCES' || e.code === 'EADDRINUSE')) return listen(i + 1);
    console.error(e.code === 'EADDRINUSE' ? `Başka bir port seçin, örn. PORT=${port + 1} node server.js` : 'Sunucu başlatılamadı.');
    process.exit(1);
  };
  const onListening = () => {
    server.removeListener('error', onError);
    console.log('Saha Kenarı çalışıyor. Tarayıcıda açın:');
    for (const a of addresses(port)) console.log(`  ${a}`);
    console.log(`Veri dosyası: ${DB_FILE} (${docs.size} belge)`);
    if (!COACH_PW) console.warn('UYARI: ANTRENOR_SIFRESI verilmedi; adresi bilen herkes verileri değiştirebilir.');
    if (VIEW_PW) console.log('Site şifreli: açılışta IZLEME_SIFRESI (ya da antrenör şifresi) sorulur.');
  };
  server.once('error', onError);
  server.once('listening', onListening);
  server.listen(port, HOST);
}
listen(0);

function shutdown() {
  try {
    if (saveTimer) persistNow();
  } catch (e) {
    console.error('Kapanırken kaydedilemedi:', e.message);
  }
  for (const c of clients.values()) c.res.end();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
