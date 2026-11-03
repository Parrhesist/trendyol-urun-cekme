/* Saha Kenarı — paylaşımlı hosting (PHP) çalışma zamanı.
   Uygulama claude.ai içinde window.claude üzerinden paylaşılan veritabanını kullanır; burada aynı arayüz
   api.php'ye bağlanır: değişiklikler kısa aralıklarla sorulur (sunum sürerken her saniye), yazımlar POST ile gider. */
(function () {
  'use strict';
  var KEY = 'saha-kenari-antrenor';
  var API = new URL('api.php', location.href.split('#')[0].split('?')[0]).href;
  var cache = new Map(); // "koleksiyon/belge" -> nesne
  var surum = 0;
  var ready = false;
  var waiters = [];
  var subs = new Set(); // { key, fn }
  var auth = { yazma: null, korumali: false, kurulum: false };
  var timer = null;
  var busy = false;
  var failures = 0;

  function password() {
    try {
      return localStorage.getItem(KEY) || '';
    } catch (e) {
      return '';
    }
  }
  function clone(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }
  function notify(paths) {
    var all = paths === null;
    var cols = {};
    if (!all) paths.forEach(function (p) {
      cols[p] = true;
      cols[p.split('/')[0]] = true;
    });
    subs.forEach(function (s) {
      if (all || cols[s.key]) {
        try {
          s.fn();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }

  function post(islem, body) {
    return fetch(API + '?islem=' + islem, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    }).then(function (r) {
      return r.json().catch(function () {
        return {};
      }).then(function (j) {
        if (!r.ok) {
          var err = new Error(j.hata || 'Sunucu yanıtı: ' + r.status);
          err.status = r.status;
          throw err;
        }
        return j;
      });
    });
  }

  /* ---- değişiklikleri sor ---- */
  function interval() {
    if (document.hidden) return 15000;
    var live = cache.get('live/screen');
    return live && live.active ? 1000 : 2500;
  }
  function schedule(ms) {
    clearTimeout(timer);
    timer = setTimeout(poll, ms);
  }
  function poll() {
    if (busy) return;
    busy = true;
    fetch(API + '?islem=degisiklik&surum=' + surum, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('Sunucu yanıtı: ' + r.status);
        return r.json();
      })
      .then(function (j) {
        failures = 0;
        var docs = j.belgeler || {};
        var changed = [];
        if (j.tam) {
          var next = new Map();
          Object.keys(docs).forEach(function (k) {
            if (docs[k] !== null) next.set(k, docs[k]);
          });
          cache.forEach(function (v, k) {
            if (!next.has(k)) changed.push(k);
          });
          next.forEach(function (v, k) {
            changed.push(k);
          });
          cache = next;
        } else {
          Object.keys(docs).forEach(function (k) {
            if (docs[k] === null) cache.delete(k);
            else cache.set(k, docs[k]);
            changed.push(k);
          });
        }
        surum = j.surum || 0;
        if (!ready) {
          ready = true;
          waiters.splice(0).forEach(function (w) {
            w(true);
          });
          notify(null);
        } else if (changed.length) notify(changed);
      })
      .catch(function () {
        failures++;
      })
      .then(function () {
        busy = false;
        schedule(failures ? Math.min(30000, 2000 * failures) : interval());
      });
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) schedule(0);
  });

  function whenReady(ms) {
    if (ready) return Promise.resolve(true);
    return new Promise(function (resolve) {
      waiters.push(resolve);
      setTimeout(function () {
        resolve(ready);
      }, ms);
    });
  }

  /* ---- veritabanı arayüzü ---- */
  function write(islem, path, data) {
    var body = { yol: path, sifre: password() };
    if (data !== undefined) body.veri = data;
    return post(islem, body).then(function () {
      // kendi yazımımız ve başkalarının değişiklikleri hemen gelsin
      schedule(0);
    });
  }
  function snap(path) {
    var d = cache.get(path);
    return {
      id: path.split('/')[1],
      exists: d !== undefined,
      data: function () {
        return clone(d);
      },
    };
  }
  function subscribe(key, fn) {
    var s = { key: key, fn: fn };
    subs.add(s);
    if (ready) Promise.resolve().then(fn);
    return function () {
      subs.delete(s);
    };
  }
  function docRef(path) {
    return {
      set: function (d) {
        return write('yaz', path, d);
      },
      delete: function () {
        return write('sil', path);
      },
      onSnapshot: function (next) {
        return subscribe(path, function () {
          next(snap(path));
        });
      },
    };
  }
  function colRef(col) {
    return {
      doc: function (id) {
        return docRef(col + '/' + id);
      },
      onSnapshot: function (next) {
        return subscribe(col, function () {
          var out = [];
          cache.forEach(function (v, k) {
            if (k.split('/')[0] === col) out.push(snap(k));
          });
          next({ docs: out });
        });
      },
    };
  }
  var db = {
    doc: function (p) {
      return docRef(p);
    },
    collection: function (c) {
      return colRef(c);
    },
  };

  function checkAuth(pw) {
    return post('durum', { sifre: pw }).then(function (j) {
      return j;
    });
  }
  function remember(pw) {
    try {
      localStorage.setItem(KEY, pw);
    } catch (e) {
      /* özel pencere */
    }
  }

  window.claude = {
    selfHosted: true,
    use: function (name) {
      if (name === 'db')
        return whenReady(8000).then(function (ok) {
          if (!ok) throw new Error('Sunucuya ulaşılamadı');
          return db;
        });
      if (name === 'user')
        return checkAuth(password()).then(function (j) {
          auth = j;
          return {
            can: function (n) {
              return Promise.resolve(n === 'data.write' ? !!auth.yazma : null);
            },
          };
        });
      // oda (anlık varlık) yok: TV'ler veri üzerinden nabız yazar
      return Promise.reject(new Error('Desteklenmiyor: ' + name));
    },
    isProtected: function () {
      return !!auth.korumali;
    },
    needsSetup: function () {
      return !!auth.kurulum;
    },
    loggedIn: function () {
      return !!password();
    },
    login: function (pw) {
      return checkAuth(pw).then(function (j) {
        if (!j.yazma || !j.korumali) return false;
        remember(pw);
        return true;
      });
    },
    setup: function (pw) {
      return post('kurulum', { sifre: pw }).then(function () {
        remember(pw);
        return true;
      });
    },
    logout: function () {
      try {
        localStorage.removeItem(KEY);
      } catch (e) {
        /* yok */
      }
    },
  };

  poll();
})();
