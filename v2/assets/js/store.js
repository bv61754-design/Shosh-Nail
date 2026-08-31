/*! Shosh Nail — assets/js/store.js
 *  SN.Store : state + persistence (owner: CORE)
 *  Contract: SPEC.md section 7. Attaches exactly one property: window.SN.Store
 *  Note: save() persists AND notifies subscribers once, so every mutation helper
 *  below calls save() exactly once and never calls notify() itself.
 */
(function(){
  'use strict';

  var SN = (window.SN = window.SN || {});

  /* ------------------------------------------------------------------ keys */
  var LS_KEY    = 'shosh2-nail-v1';
  var MINE_KEY  = 'shosh2-nail-mine';
  var ADMIN_KEY = 'shosh2-admin';
  var MINE_MAX  = 60;

  /* --------------------------------------------------------- tiny helpers */
  function isObj(v){
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  function clone(v){
    var i, k, out;
    if (Array.isArray(v)){
      out = new Array(v.length);
      for (i = 0; i < v.length; i++) out[i] = clone(v[i]);
      return out;
    }
    if (isObj(v)){
      out = {};
      for (k in v){ if (Object.prototype.hasOwnProperty.call(v, k)) out[k] = clone(v[k]); }
      return out;
    }
    return v;
  }

  /* Deep merge saved OVER def.
   * - plain objects merge recursively
   * - arrays coming from `saved` REPLACE the default array wholesale
   *   (so items the owner deleted stay deleted)
   * - `def` is never mutated: everything taken from it is cloned first. */
  function merge(def, saved){
    var out, k;
    if (saved === undefined) return clone(def);
    if (Array.isArray(saved)) return clone(saved);
    if (isObj(def) && isObj(saved)){
      out = {};
      for (k in def){ if (Object.prototype.hasOwnProperty.call(def, k)) out[k] = clone(def[k]); }
      for (k in saved){
        if (!Object.prototype.hasOwnProperty.call(saved, k)) continue;
        if (isObj(out[k]) && isObj(saved[k])) out[k] = merge(out[k], saved[k]);
        else out[k] = clone(saved[k]);
      }
      return out;
    }
    return clone(saved);
  }

  function parts(path){
    var raw = String(path == null ? '' : path).split('.');
    var out = [], i;
    for (i = 0; i < raw.length; i++){ if (raw[i] !== '') out.push(raw[i]); }
    return out;
  }

  function getPath(obj, path){
    var p = parts(path), cur = obj, i;
    if (!p.length) return obj;
    for (i = 0; i < p.length; i++){
      if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
      cur = cur[p[i]];
    }
    return cur;
  }

  function setPath(obj, path, value){
    var p = parts(path), cur = obj, i, k;
    if (!p.length || !isObj(obj)) return false;
    for (i = 0; i < p.length - 1; i++){
      k = p[i];
      if (!isObj(cur[k]) && !Array.isArray(cur[k])) cur[k] = {};
      cur = cur[k];
    }
    cur[p[p.length - 1]] = value;
    return true;
  }

  /* --------------------------------------------------- storage (guarded) */
  function lsGet(key){
    try { return window.localStorage.getItem(key); }
    catch (e){ return null; }
  }
  function lsSet(key, value){
    try { window.localStorage.setItem(key, value); return true; }
    catch (e){ console.warn('[SN.Store] could not write "' + key + '" to localStorage', e); return false; }
  }
  function lsDel(key){
    try { window.localStorage.removeItem(key); return true; }
    catch (e){ return false; }
  }
  function ssGet(key){
    try { return window.sessionStorage.getItem(key); }
    catch (e){ return null; }
  }
  function ssSet(key, value){
    try { window.sessionStorage.setItem(key, value); return true; }
    catch (e){ console.warn('[SN.Store] could not write "' + key + '" to sessionStorage', e); return false; }
  }
  function ssDel(key){
    try { window.sessionStorage.removeItem(key); return true; }
    catch (e){ return false; }
  }
  function parse(text, label){
    if (typeof text !== 'string' || text === '') return null;
    try { return JSON.parse(text); }
    catch (e){ console.warn('[SN.Store] corrupt JSON in "' + label + '" — falling back to defaults', e); return null; }
  }
  function stringify(value, label){
    try { return JSON.stringify(value); }
    catch (e){ console.warn('[SN.Store] could not serialise "' + label + '"', e); return null; }
  }

  /* ------------------------------------------------------------- sha-256 */
  /* Self-contained, synchronous SHA-256 (FIPS 180-4). No dependencies, no
     crypto.subtle (that one is async and unavailable on file:// in Safari),
     so Store.login() can stay synchronous exactly as SPEC.md documents it.
     Input is hashed as UTF-8 BYTES, so an Arabic password works. */
  var K256 = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  /* String -> UTF-8 byte array (surrogate pairs become 4-byte sequences). */
  function utf8Bytes(str){
    var s = String(str == null ? '' : str), out = [], i, c, c2;
    for (i = 0; i < s.length; i++){
      c = s.charCodeAt(i);
      if (c < 0x80){ out.push(c); continue; }
      if (c < 0x800){ out.push(0xC0 | (c >> 6), 0x80 | (c & 63)); continue; }
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length){
        c2 = s.charCodeAt(i + 1);
        if (c2 >= 0xDC00 && c2 <= 0xDFFF){
          c = 0x10000 + ((c - 0xD800) << 10) + (c2 - 0xDC00);
          i++;
          out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
          continue;
        }
      }
      out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }

  function rotr(x, n){ return (x >>> n) | (x << (32 - n)); }

  function sha256Hex(str){
    var b = utf8Bytes(str), len = b.length;
    var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
             0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var w = new Array(64);
    var i, j, p, a, bb, c, d, e, f, g, hh, s0, s1, ch, maj, t1, t2, hi, lo, out = '';

    /* pad: 0x80, zeros up to 56 mod 64, then the 64-bit big-endian bit length */
    b.push(0x80);
    while (b.length % 64 !== 56) b.push(0);
    hi = Math.floor(len / 536870912);            /* (len * 8) >>> 32 */
    lo = (len * 8) >>> 0;
    b.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255,
           (lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);

    for (i = 0; i < b.length; i += 64){          /* every 512-bit block */
      for (j = 0; j < 16; j++){
        p = i + j * 4;
        w[j] = ((b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]) >>> 0;
      }
      for (j = 16; j < 64; j++){
        s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
      }
      a = h[0]; bb = h[1]; c = h[2]; d = h[3]; e = h[4]; f = h[5]; g = h[6]; hh = h[7];
      for (j = 0; j < 64; j++){
        s1  = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        ch  = (e & f) ^ (~e & g);
        t1  = (hh + s1 + ch + K256[j] + w[j]) >>> 0;
        s0  = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        maj = (a & bb) ^ (a & c) ^ (bb & c);
        t2  = (s0 + maj) >>> 0;
        hh = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = bb; bb = a; a = (t1 + t2) >>> 0;
      }
      h[0] = (h[0] + a)  >>> 0; h[1] = (h[1] + bb) >>> 0;
      h[2] = (h[2] + c)  >>> 0; h[3] = (h[3] + d)  >>> 0;
      h[4] = (h[4] + e)  >>> 0; h[5] = (h[5] + f)  >>> 0;
      h[6] = (h[6] + g)  >>> 0; h[7] = (h[7] + hh) >>> 0;
    }
    for (i = 0; i < 8; i++) out += ('0000000' + h[i].toString(16)).slice(-8);
    return out;
  }

  /* ------------------------------------------------------------ fallback */
  /* Only used if data.js failed to load — keeps every API alive, never throws. */
  var FALLBACK = {
    version: 1,
    settings: {
      brand: { ar: 'شوش نيل', en: 'Shosh Nail' },
      tagline: { ar: '', en: '' },
      about: { ar: '', en: '' },
      phone: '', whatsapp: '', email: '',
      instagram: '', snapchat: '', tiktok: '',
      city: { ar: '', en: '' }, address: { ar: '', en: '' }, hours: { ar: '', en: '' },
      currency: { ar: 'ر.س', en: 'SAR' },
      adminPass: 'shosh1234',
      notifyEndpoint: '', notifyKey: '', notifyEmail: '',
      announce: { ar: '', en: '' }, announceOn: false,
      whatsappOrder: true, theme: 'light'
    },
    pricing: {
      base: 120, perExtraColor: 3, perPatternNail: 8, perCharm: 4,
      express: 40, giftWrap: 15, shipping: 20, freeShippingOver: 300,
      vat: 0, depositPct: 0
    },
    home: {
      heroTitle: { ar: '', en: '' }, heroSub: { ar: '', en: '' }, heroCta: { ar: '', en: '' },
      heroImage: '', features: [], steps: [], testimonials: [], stats: []
    },
    skinTones: [], shapes: [], lengths: [], finishes: [], colors: [], patterns: [],
    charms: [], sizeGuide: [], sizeSets: [], measureMethods: [], paymentMethods: [],
    designs: [], faqCats: [], faq: [], orders: []
  };

  /* Collections we recognise — used by importFile() validation and shape repair. */
  var COLLECTIONS = ['skinTones','shapes','lengths','finishes','colors','patterns','charms',
    'sizeGuide','sizeSets','measureMethods','paymentMethods','designs','faqCats','faq','orders'];

  /* Collections that live one level down, under `home`. */
  var HOME_LISTS = ['features','steps','testimonials','stats'];

  var PREFIX = {
    colors: 'c', charms: 'ch', patterns: 'p', shapes: 'sh', finishes: 'f', lengths: 'l',
    skinTones: 'sk', designs: 'd', faq: 'q', faqCats: 'fc', orders: 'o',
    sizeGuide: 's', sizeSets: 'ss', measureMethods: 'mm', paymentMethods: 'pm'
  };
  function prefixFor(key){
    var k = String(key == null ? '' : key).split('.').pop();
    if (PREFIX[k]) return PREFIX[k];
    return k ? k.slice(0, 3) : 'it';
  }

  /* --------------------------------------------------------------- state */
  var state   = {};      /* identity is stable for the whole page life */
  var loaded  = false;
  var mutated = false;
  var usedFallback = false;
  var readyQ  = [];
  var subs    = [];

  function defaults(){
    return isObj(SN.DEFAULTS) ? SN.DEFAULTS : FALLBACK;
  }

  /* Replace the contents of `state` in place so references stay valid. */
  function replaceState(next){
    var k;
    for (k in state){ if (Object.prototype.hasOwnProperty.call(state, k)) delete state[k]; }
    for (k in next){ if (Object.prototype.hasOwnProperty.call(next, k)) state[k] = next[k]; }
    return state;
  }

  /* Restore one array-valued slot from the defaults when the saved state put
     something that is not an array there. An EMPTY array is a legitimate saved
     value (the owner deleted every row), so only non-arrays are healed —
     otherwise a single corrupt field would silently wipe a whole collection. */
  function repairArray(host, defHost, key){
    var d;
    if (Array.isArray(host[key])) return;
    d = isObj(defHost) ? defHost[key] : undefined;
    host[key] = Array.isArray(d) ? clone(d) : [];
  }

  function repair(){
    var def = defaults(), i, k;
    if (!isObj(state.settings)) state.settings = clone(def.settings || FALLBACK.settings);
    if (!isObj(state.pricing))  state.pricing  = clone(def.pricing  || FALLBACK.pricing);
    if (!isObj(state.home))     state.home     = clone(def.home     || FALLBACK.home);
    for (i = 0; i < COLLECTIONS.length; i++){
      k = COLLECTIONS[i];
      repairArray(state, def, k);
    }
    for (i = 0; i < HOME_LISTS.length; i++){
      k = HOME_LISTS[i];
      repairArray(state.home, isObj(def.home) ? def.home : null, k);
    }
  }

  function load(){
    var def   = defaults();
    var saved = parse(lsGet(LS_KEY), LS_KEY);
    var next;

    usedFallback = !isObj(SN.DEFAULTS);
    if (usedFallback) console.warn('[SN.Store] SN.DEFAULTS is missing — running on the built-in fallback.');

    if (saved !== null && !isObj(saved)){
      console.warn('[SN.Store] saved state is not an object — falling back to defaults.');
      saved = null;
    }
    next = saved ? merge(def, saved) : clone(def);
    /* Version drift never throws; we simply stamp the current schema version. */
    next.version = def && def.version !== undefined ? def.version : 1;

    replaceState(next);
    repair();
    loaded = true;
    flushReady();
    return state;
  }

  function flushReady(){
    var q = readyQ.slice(), i;
    readyQ.length = 0;
    for (i = 0; i < q.length; i++){
      try { q[i](state); }
      catch (e){ console.warn('[SN.Store] ready() handler failed', e); }
    }
  }

  function notify(){
    var copy = subs.slice(), i;
    for (i = 0; i < copy.length; i++){
      try { copy[i](state); }
      catch (e){ console.warn('[SN.Store] subscriber failed', e); }
    }
  }

  function save(){
    var text = stringify(state, LS_KEY);
    var ok = false;
    mutated = true;
    if (text !== null) ok = lsSet(LS_KEY, text);
    notify();
    return ok;
  }

  /* ------------------------------------------------------------- ids */
  var seq = Math.floor(Math.random() * 1296);   /* 0..35^2, keeps tabs apart */
  function uid(prefix){
    var p = prefix === undefined || prefix === null || prefix === '' ? 'id' : String(prefix);
    var rnd = Math.random().toString(36).slice(2, 6);
    seq = (seq + 1) % 1679616;                  /* 36^4 */
    return p + '-' + seq.toString(36) + rnd;
  }
  function indexOfId(arr, id){
    var i;
    if (!Array.isArray(arr) || id === undefined || id === null) return -1;
    for (i = 0; i < arr.length; i++){
      if (arr[i] && String(arr[i].id) === String(id)) return i;
    }
    return -1;
  }
  function uniqueId(arr, prefix){
    var id, guard = 0;
    do { id = uid(prefix); guard++; } while (indexOfId(arr, id) !== -1 && guard < 50);
    return id;
  }

  /* --------------------------------------------------------------- API */
  var Store = {};

  Store.state = state;

  Store.ready = function(fn){
    if (typeof fn !== 'function') return;
    if (loaded){
      try { fn(state); }
      catch (e){ console.warn('[SN.Store] ready() handler failed', e); }
      return;
    }
    readyQ.push(fn);
  };

  Store.get = function(path, fallback){
    var v = getPath(state, path);
    return v === undefined ? fallback : v;
  };

  Store.set = function(path, value){
    var p = parts(path);
    if (!p.length) return value;
    setPath(state, path, value);
    /* A password changed here must take effect here, immediately — mirror it
       onto window.SN_ADMIN so the gate stops waiting for password.js. */
    if (p.join('.') === 'settings.adminPass') syncGlobalPass(value);
    save();
    return value;
  };

  Store.list = function(key){
    var v = getPath(state, key);
    if (Array.isArray(v)) return v;
    if (!parts(key).length) return [];
    /* Never clobber an existing object (e.g. a typo like list('settings')) —
       that one stays read-only and yields an empty list. Anything else at that
       path (missing, or a primitive left behind by a corrupt/hand-edited save)
       becomes a real array attached to the state, so add/remove/move actually
       persist instead of silently writing into a detached copy. */
    if (isObj(v)) return [];
    setPath(state, key, []);
    v = getPath(state, key);
    return Array.isArray(v) ? v : [];
  };

  Store.find = function(key, id){
    var arr = Store.list(key);
    var i = indexOfId(arr, id);
    return i === -1 ? null : arr[i];
  };

  Store.add = function(key, item){
    var arr = Store.list(key);
    var it  = isObj(item) ? item : {};
    if (!it.id || indexOfId(arr, it.id) !== -1) it.id = uniqueId(arr, prefixFor(key));
    arr.push(it);
    save();
    return it;
  };

  Store.update = function(key, id, patch){
    var arr = Store.list(key);
    var i = indexOfId(arr, id), k;
    if (i === -1) return null;
    if (isObj(patch)){
      for (k in patch){
        if (Object.prototype.hasOwnProperty.call(patch, k)) arr[i][k] = patch[k];
      }
    }
    save();
    return arr[i];
  };

  Store.remove = function(key, id){
    var arr = Store.list(key);
    var i = indexOfId(arr, id);
    if (i === -1) return false;
    arr.splice(i, 1);
    save();
    return true;
  };

  Store.move = function(key, id, delta){
    var arr = Store.list(key);
    var i = indexOfId(arr, id);
    var d = parseInt(delta, 10);
    var j, item;
    if (i === -1 || !d) return false;
    j = i + d;
    if (j < 0) j = 0;
    if (j > arr.length - 1) j = arr.length - 1;
    if (j === i) return false;
    item = arr[i];
    arr.splice(i, 1);
    arr.splice(j, 0, item);
    save();
    return true;
  };

  Store.save = save;

  Store.reset = function(hard){
    var orders = hard ? [] : clone(Array.isArray(state.orders) ? state.orders : []);
    var next = clone(defaults());
    next.orders = orders;
    replaceState(next);
    repair();
    save();
    return state;
  };

  Store.exportFile = function(filename){
    var name = filename || ('shosh2-nail-backup-' + stamp() + '.json');
    var text, blob, url, a;
    try { text = JSON.stringify(state, null, 2); }
    catch (e){ console.warn('[SN.Store] export failed while serialising', e); return false; }
    if (typeof document === 'undefined' || typeof Blob === 'undefined') return false;
    try {
      blob = new Blob([text], { type: 'application/json;charset=utf-8' });
      url  = URL.createObjectURL(blob);
      a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.rel = 'noopener';
      a.style.display = 'none';
      (document.body || document.documentElement).appendChild(a);
      a.click();
      setTimeout(function(){
        try { a.parentNode.removeChild(a); } catch (e2){}
        try { URL.revokeObjectURL(url); } catch (e3){}
      }, 0);
      return true;
    } catch (e){
      console.warn('[SN.Store] export failed', e);
      return false;
    }
  };

  function stamp(){
    var d = new Date();
    function p(n){ return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function importError(msgAr, msgEn, code){
    var err = new Error(msgAr + ' — ' + msgEn);
    err.code = code;
    err.ar = msgAr;
    err.en = msgEn;
    return err;
  }

  Store.importFile = function(file){
    return new Promise(function(resolve, reject){
      var reader;
      if (!file){
        reject(importError('ما تم اختيار ملف.', 'No file was selected.', 'NO_FILE'));
        return;
      }
      if (typeof FileReader === 'undefined'){
        reject(importError('المتصفح ما يدعم قراءة الملفات.', 'This browser cannot read files.', 'NO_FILEREADER'));
        return;
      }
      reader = new FileReader();
      reader.onerror = function(){
        reject(importError('تعذّرت قراءة الملف.', 'The file could not be read.', 'READ_FAILED'));
      };
      reader.onload = function(){
        var data, i, hasCollection = false;
        try { data = JSON.parse(String(reader.result)); }
        catch (e){
          reject(importError('الملف ليس JSON صالح.', 'The file is not valid JSON.', 'BAD_JSON'));
          return;
        }
        if (!isObj(data)){
          reject(importError('محتوى الملف غير صحيح.', 'The file content is not an object.', 'BAD_SHAPE'));
          return;
        }
        if (!isObj(data.settings)){
          reject(importError('الملف لا يحتوي على إعدادات الموقع (settings).',
                             'The backup has no "settings" object.', 'NO_SETTINGS'));
          return;
        }
        for (i = 0; i < COLLECTIONS.length; i++){
          if (Array.isArray(data[COLLECTIONS[i]])){ hasCollection = true; break; }
        }
        if (!hasCollection){
          reject(importError('الملف لا يحتوي على أي قائمة معروفة (ألوان، نقشات، تصاميم…).',
                             'The backup contains none of the known collections (colors, patterns, designs…).',
                             'NO_COLLECTION'));
          return;
        }
        try {
          replaceState(merge(defaults(), data));
          state.version = defaults().version !== undefined ? defaults().version : 1;
          repair();
          save();
          resolve();
        } catch (e){
          reject(importError('صار خلل أثناء استيراد الملف.', 'Something went wrong while importing.', 'MERGE_FAILED'));
        }
      };
      try { reader.readAsText(file); }
      catch (e){ reject(importError('تعذّرت قراءة الملف.', 'The file could not be read.', 'READ_FAILED')); }
    });
  };

  Store.subscribe = function(fn){
    if (typeof fn !== 'function') return function(){};
    subs.push(fn);
    return function(){
      var i = subs.indexOf(fn);
      if (i !== -1) subs.splice(i, 1);
    };
  };

  Store.uid = uid;

  /* --------------------------------------------- customer saved designs */
  Store.mine = function(){
    var arr = parse(lsGet(MINE_KEY), MINE_KEY);
    return Array.isArray(arr) ? arr : [];
  };

  Store.saveMine = function(name, config){
    var items = Store.mine();
    var item = {
      id: uniqueId(items, 'my'),
      name: String(name === undefined || name === null ? '' : name).trim(),
      config: clone(config) || {},
      ts: Date.now()
    };
    var text;
    items.unshift(item);
    if (items.length > MINE_MAX) items.length = MINE_MAX;
    text = stringify(items, MINE_KEY);
    if (text !== null) lsSet(MINE_KEY, text);
    return item;
  };

  Store.removeMine = function(id){
    var items = Store.mine();
    var i = indexOfId(items, id);
    var text;
    if (i === -1) return false;
    items.splice(i, 1);
    text = stringify(items, MINE_KEY);
    if (text !== null) lsSet(MINE_KEY, text);
    else return false;
    return true;
  };

  /* ------------------------------------------------------------- admin */
  /* The real password lives in password.js at the repo root (loaded by
     admin.html only) as `window.SN_ADMIN`, either plain or as 'sha256:<hex>'.
     Precedence: window.SN_ADMIN → settings.adminPass → DEFAULT_PASS. */
  var DEFAULT_PASS = 'shosh1234';

  function txt(v){ return v === undefined || v === null ? '' : String(v); }

  /* Invisible characters an Arabic mobile keyboard, a share sheet or a paste
     can smuggle into the password field: zero-width marks, the bidi
     embedding/override/isolate controls, and the BOM. None of them is ever
     part of a password the owner meant to type. */
  var INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

  /* THE one normalisation, used everywhere a password is hashed or compared,
     so what was typed when setting the password and what is typed when logging
     in can never silently differ:
       - drop the invisible characters above,
       - compose to NFC where the engine supports it, so visually identical
         Arabic always hashes identically,
       - trim leading/trailing whitespace (an Android keyboard appends a space
         after word prediction — the classic invisible lockout). */
  function normPass(v){
    var s = txt(v).replace(INVISIBLE, '');
    try { if (typeof s.normalize === 'function') s = s.normalize('NFC'); }
    catch (e){ /* exotic engine: the un-normalised form still works */ }
    return s.replace(/^\s+/, '').replace(/\s+$/, '');
  }

  function isHashed(v){ return txt(v).slice(0, 7).toLowerCase() === 'sha256:'; }

  function globalPass(){
    var v;
    try { v = typeof window !== 'undefined' ? window.SN_ADMIN : null; }
    catch (e){ return ''; }
    return typeof v === 'string' ? v : '';
  }

  /* What password.js supplied, as last known: its value at load, then whatever
     refreshPass() re-read from the network. Never exposed — passStatus() only
     ever reports THAT it exists, never what it is. */
  var filePass  = globalPass();
  var passStale = false;

  /* The password the gate will actually accept, right now, on this device. */
  function effectivePass(){
    var g = globalPass();
    var s;
    if (g !== '') return g;
    s = txt(Store.get('settings.adminPass', ''));
    return s !== '' ? s : DEFAULT_PASS;
  }

  /* Keep the in-page global in step with a password changed on this device,
     so the new one works immediately — before password.js is edited on GitHub.
     Only an explicit write does this; a stale saved value never overrides
     password.js on load. */
  function syncGlobalPass(value){
    try { if (typeof window !== 'undefined') window.SN_ADMIN = txt(value); }
    catch (e){ /* frozen window — the saved value still applies as a fallback */ }
  }

  function hashPass(plain){
    return 'sha256:' + sha256Hex(normPass(plain));
  }

  /* Comparison against either a plain or a hashed expected value.
     What was typed is accepted in its normalised form OR in its raw form: a
     fingerprint committed before this normalisation existed was built from the
     raw text, and its owner must not be locked out by the fix. Anything else,
     including an empty expected value, fails closed. */
  function passMatches(given, expected){
    var raw = txt(given);
    var exp = normPass(expected);
    if (exp === '') return false;
    if (isHashed(exp)){
      exp = exp.toLowerCase();
      if (hashPass(raw).toLowerCase() === exp) return true;
      return ('sha256:' + sha256Hex(raw)).toLowerCase() === exp;   /* legacy */
    }
    return normPass(raw) === exp || raw === txt(expected);
  }

  Store.hashPass = hashPass;

  /* The complete text of password.js carrying `plain` in its hashed form —
     the owner copies this and pastes it over password.js on his phone. */
  Store.passwordFile = function(plain){
    return '/* هذا الملف يحمل كلمة مرور لوحة التحكم — Shosh Nail admin password.\n' +
           '   انسخ النص الذي تولّده لوحة التحكم وألصقه هنا كاملاً؛ والقيمة قد تكون كلمة المرور نفسها أو بصمة sha256. */\n' +
           'window.SN_ADMIN = "' + hashPass(plain) + '";\n';
  };

  /* ---------------------------------------------- re-reading password.js */
  /* admin.html loads password.js as a plain <script>, and both GitHub Pages
     and the phone browser cache it — so a freshly committed password can keep
     failing for minutes with nothing on screen to say why. Belt and braces:
     re-read the file over the network with a cache-busting query, pull the
     value out of the TEXT with a strict regex (never eval, never injected as a
     script) and adopt it when it differs. Every failure path — file://,
     offline, 404, a rewritten 404 page — leaves the gate exactly as it is. */

  var PASS_FILE = 'password.js';
  var PASS_RE   = /window\s*\.\s*SN_ADMIN\s*=\s*(?:"([^"\\\r\n]{0,256})"|'([^'\\\r\n]{0,256})')\s*;/g;
  var passRefresh = null;        /* in-flight refreshPass(), so we fetch once */

  function passFromText(text){
    var s = txt(text), m, out = '';
    if (s.length > 65536) s = s.slice(0, 65536);
    PASS_RE.lastIndex = 0;
    while ((m = PASS_RE.exec(s)) !== null) out = m[1] !== undefined ? m[1] : m[2];
    PASS_RE.lastIndex = 0;
    return out;
  }

  /* Fail closed: adopt only a non-empty value free of control characters. */
  function adoptFilePass(value){
    var v = txt(value);
    if (v === '' || /[\u0000-\u001F\u007F]/.test(v)) return;
    if (v === filePass) return;
    passStale = true;                    /* the copy this page loaded was old */
    /* Never clobber a password changed on this device during this session:
       adopt only while the live global is still the file's own value. */
    if (globalPass() === filePass) syncGlobalPass(v);
    filePass = v;
  }

  /* What the gate knows about its password source. Carries no secret. */
  Store.passStatus = function(){
    var g = globalPass();
    var s = txt(Store.get('settings.adminPass', ''));
    var eff, src;
    if (g !== ''){ eff = g; src = (filePass !== '' && g === filePass) ? 'file' : 'stored'; }
    else if (s !== ''){ eff = s; src = 'stored'; }
    else { eff = DEFAULT_PASS; src = 'default'; }
    /* A value that is still the shipped default is reported as such, whether it
       reached us from the seed data or from a save — 'stored' would read as if
       the owner had chosen it. A default sitting in password.js stays 'file':
       that one really was published. */
    if (src === 'stored' && passMatches(DEFAULT_PASS, eff)) src = 'default';
    return {
      loaded: filePass !== '',
      source: src,
      kind: isHashed(eff) ? 'hash' : 'plain',
      stale: passStale
    };
  };

  /* -> Promise<passStatus()>. Never rejects, never throws. */
  Store.refreshPass = function(){
    var settled = false, p;
    if (passRefresh) return passRefresh;
    p = new Promise(function(resolve){
      function done(){ settled = true; passRefresh = null; resolve(Store.passStatus()); }
      try {
        if (typeof fetch !== 'function' || typeof location === 'undefined' ||
            String(location.protocol).indexOf('http') !== 0){ done(); return; }
        fetch(PASS_FILE + '?t=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' })
          .then(function(res){
            if (!res || !res.ok){ done(); return null; }
            return res.text().then(function(text){
              try { adoptFilePass(passFromText(text)); } catch (e){ /* keep the cached value */ }
              done();
            });
          })['catch'](function(){ done(); });
      } catch (e){ done(); }
    });
    if (!settled) passRefresh = p;
    return p;
  };

  /* Encode every path segment but keep the slashes — the branch name has some. */
  function encSegments(s){
    var raw = txt(s).split('/'), out = [], i;
    for (i = 0; i < raw.length; i++) out.push(encodeURIComponent(raw[i]));
    return out.join('/');
  }

  /* GitHub's mobile web editor for one file. '' when no repo is configured,
     so the admin panel can hide the button instead of showing a broken link. */
  Store.repoEditURL = function(path){
    var repo   = txt(Store.get('settings.repo', '')).replace(/^\/+/, '').replace(/\/+$/, '');
    var branch = txt(Store.get('settings.repoBranch', '')) || 'main';
    var file   = txt(path).replace(/^\/+/, '');
    if (!repo) return '';
    return 'https://github.com/' + encSegments(repo) +
           '/edit/' + encSegments(branch) +
           (file ? '/' + encSegments(file) : '');
  };

  /* true while the gate still accepts the shipped default — drives the warning
     banner in admin.js, which can no longer just read settings.adminPass. */
  Store.isDefaultPass = function(){
    return passMatches(DEFAULT_PASS, effectivePass());
  };

  Store.login = function(pass){
    var ok = passMatches(pass, effectivePass());
    if (ok) ssSet(ADMIN_KEY, '1');
    return ok;
  };

  Store.logout = function(){
    ssDel(ADMIN_KEY);
  };

  Store.isAdmin = function(){
    return ssGet(ADMIN_KEY) === '1';
  };

  /* -------------------------------------------------------------- boot */
  load();
  Store.state = state;

  /* Safety net: if data.js had not run yet (unexpected load order), re-load
     from the real defaults once the document is ready — but only while the
     owner/customer has not changed anything. */
  if (usedFallback && typeof document !== 'undefined' && document.addEventListener){
    document.addEventListener('DOMContentLoaded', function(){
      if (usedFallback && !mutated && isObj(SN.DEFAULTS)){
        load();
        Store.state = state;
        notify();
      }
    });
  }

  /* Belt and braces: on the admin page only, re-read password.js once at
     startup, so a copy cached by GitHub Pages or by the phone browser cannot
     silently keep the owner out. Everything about it is optional. */
  var passKicked = false;
  function kickPassRefresh(){
    try {
      if (passKicked) return;
      if (typeof document === 'undefined' || !document.body) return;
      if (document.body.getAttribute('data-page') !== 'admin') return;
      passKicked = true;
      Store.refreshPass();
    } catch (e){ /* a network nicety must never break the gate */ }
  }
  kickPassRefresh();
  if (!passKicked && typeof document !== 'undefined' && document.addEventListener){
    document.addEventListener('DOMContentLoaded', kickPassRefresh);
  }

  SN.Store = Store;
})();
