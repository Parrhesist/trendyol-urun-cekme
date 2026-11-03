/* Saha Kenarı — kendi sunucusunda çalışma zamanı.
   Uygulama claude.ai içinde window.claude üzerinden paylaşılan veritabanını kullanır; burada aynı arayüz
   takımın sunucusuna bağlanır: veriler /api/olaylar akışıyla anında gelir, yazımlar /api/belge ile gider. */
(function () {
  'use strict';
  var KEY = 'saha-kenari-antrenor';
  var API = new URL('api/', location.href.split('#')[0].split('?')[0]).href;
  var cache = new Map(); // "koleksiyon/belge" -> nesne
  var ready = false;
  var waiters = [];
  var subs = new Set(); // { key, fn }
  var me = null;
  var peers = [];
  var peerSubs = new Set();
  var myPresence = null;
  var auth = { yazma: null, korumali: false };

  function password() {
    try {
      return localStorage.getItem(KEY) || '';
    } catch (e) {
      return '';
    }
  }
  function headers(json) {
    var h = {};
    if (json) h['Content-Type'] = 'application/json';
    var pw = password();
    if (pw) h['X-Antrenor-Sifresi'] = encodeURIComponent(pw);
    return h;
  }
  function clone(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }
  function notify(path) {
    var col = path ? path.split('/')[0] : null;
    subs.forEach(function (s) {
      if (!path || s.key === path || s.key === col) {
        try {
          s.fn();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }

  function connect() {
    var es = new EventSource(API + 'olaylar');
    es.addEventListener('hello', function (e) {
      me = JSON.parse(e.data).id;
      if (myPresence) sendPresence();
    });
    es.addEventListener('snapshot', function (e) {
      var d = JSON.parse(e.data).docs || {};
      cache = new Map(Object.keys(d).map(function (k) {
        return [k, d[k]];
      }));
      ready = true;
      waiters.splice(0).forEach(function (w) {
        w(true);
      });
      notify(null);
    });
    es.addEventListener('set', function (e) {
      var m = JSON.parse(e.data);
      cache.set(m.path, m.data);
      notify(m.path);
    });
    es.addEventListener('del', function (e) {
      var m = JSON.parse(e.data);
      cache.delete(m.path);
      notify(m.path);
    });
    es.addEventListener('peers', function (e) {
      peers = JSON.parse(e.data);
      peerSubs.forEach(function (f) {
        f();
      });
    });
  }

  function whenReady(ms) {
    if (ready) return Promise.resolve(true);
    return new Promise(function (resolve) {
      waiters.push(resolve);
      setTimeout(function () {
        resolve(ready);
      }, ms);
    });
  }

  function request(method, path, body) {
    return fetch(API + 'belge/' + path, { method: method, headers: headers(body !== undefined), body: body === undefined ? undefined : JSON.stringify(body) }).then(function (r) {
      if (!r.ok) {
        var err = new Error('Sunucu yanıtı: ' + r.status);
        err.status = r.status;
        throw err;
      }
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

  function docRef(path) {
    return {
      set: function (d) {
        return request('PUT', path, d);
      },
      delete: function () {
        return request('DELETE', path);
      },
      onSnapshot: function (next) {
        var s = {
          key: path,
          fn: function () {
            next(snap(path));
          },
        };
        subs.add(s);
        if (ready) Promise.resolve().then(s.fn);
        return function () {
          subs.delete(s);
        };
      },
    };
  }

  function colRef(col) {
    return {
      doc: function (id) {
        return docRef(col + '/' + id);
      },
      onSnapshot: function (next) {
        var s = {
          key: col,
          fn: function () {
            var out = [];
            cache.forEach(function (v, k) {
              if (k.split('/')[0] === col) out.push(snap(k));
            });
            next({ docs: out });
          },
        };
        subs.add(s);
        if (ready) Promise.resolve().then(s.fn);
        return function () {
          subs.delete(s);
        };
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

  function sendPresence() {
    if (!me) return Promise.resolve();
    return fetch(API + 'varlik', { method: 'POST', headers: headers(true), body: JSON.stringify({ baglanti: me, varlik: myPresence }) }).then(function () {});
  }

  var room = {
    presence: function (p) {
      myPresence = p;
      return sendPresence();
    },
    onPeers: function (h) {
      var f = function () {
        h({
          peers: peers.map(function (p) {
            return { isMe: p.id === me, presence: p.presence || {} };
          }),
        });
      };
      peerSubs.add(f);
      Promise.resolve().then(f);
      return function () {
        peerSubs.delete(f);
      };
    },
  };

  function checkAuth() {
    return fetch(API + 'durum', { headers: headers(false), cache: 'no-store' })
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        auth = j;
        return j;
      });
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
        return checkAuth().then(function () {
          return {
            can: function (n) {
              return Promise.resolve(n === 'data.write' ? !!auth.yazma : null);
            },
          };
        });
      if (name === 'room') return whenReady(8000).then(function () {
        return room;
      });
      return Promise.reject(new Error('Desteklenmiyor: ' + name));
    },
    isProtected: function () {
      return !!auth.korumali;
    },
    loggedIn: function () {
      return !!password();
    },
    login: function (pw) {
      return fetch(API + 'durum', { headers: { 'X-Antrenor-Sifresi': encodeURIComponent(pw) }, cache: 'no-store' })
        .then(function (r) {
          return r.ok ? r.json() : { yazma: false };
        })
        .then(function (j) {
          if (!j.yazma) return false;
          try {
            localStorage.setItem(KEY, pw);
          } catch (e) {
            /* özel pencere: yalnızca bu oturum */
          }
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

  connect();
})();
