/*! Shosh Nail — assets/js/ui.js
 *  SN.UI : shared shell (header / announce / footer) + widgets (owner: CORE)
 *  Contract: SPEC.md section 11. Attaches exactly one property: window.SN.UI
 *
 *  Every helper below tolerates a missing or half-initialised SN.Store / SN.I18n:
 *  the shell must render something sane even if a sibling module failed to load.
 *  No user-visible literal lives in this file — copy comes from SN.I18n or SN.Store.
 */
(function(){
  'use strict';

  var SN = (window.SN = window.SN || {});

  var THEME_KEY    = 'shosh-theme';
  var ANNOUNCE_KEY = 'shosh-announce-x';   /* sessionStorage: hash of the dismissed text */
  var SHEET_MQ     = '(max-width: 720px)';
  var TOAST_MS     = 3200;
  var TOAST_MAX    = 4;

  /* v2 has no design studio: the only way to a custom set is the style quiz,
     which lives in a modal on the home page and opens on the `#quiz` hash. */
  var PAGE_HREF = {
    home:   'index.html',
    shop:   'shop.html',
    faq:    'faq.html'
  };
  var QUIZ_HREF = 'index.html#quiz';

  /* ==================================================================== */
  /* 0. micro helpers                                                     */
  /* ==================================================================== */

  function has(o, k){ return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function isObj(v){ return !!v && typeof v === 'object' && !Array.isArray(v); }
  function isNode(v){ return !!v && typeof v === 'object' && typeof v.nodeType === 'number'; }
  function doc(){ return typeof document !== 'undefined' ? document : null; }
  function body(){ var d = doc(); return d ? (d.body || d.documentElement) : null; }
  function root(){ var d = doc(); return d ? d.documentElement : null; }

  function dashed(s){
    var str = String(s === undefined || s === null ? '' : s);
    if (str.indexOf('--') === 0) return str;
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase();
  }

  function slug(s){ return String(s === undefined || s === null ? '' : s).replace(/[^a-zA-Z0-9_-]/g, ''); }

  function hashOf(s){
    var h = 0, i, str = String(s === undefined || s === null ? '' : s);
    for (i = 0; i < str.length; i++){ h = (h * 31 + str.charCodeAt(i)) | 0; }
    return String(h);
  }

  var seq = 0;
  function nid(prefix){ seq++; return (prefix || 'sn-ui') + '-' + seq.toString(36) + '-' + Math.random().toString(36).slice(2, 6); }

  /* ---------------------------------------------------------- selectors */
  function qs(sel, r){
    var scope = r || doc();
    if (!scope || typeof scope.querySelector !== 'function') return null;
    try { return scope.querySelector(sel); }
    catch (e){ return null; }
  }

  function qsa(sel, r){
    var scope = r || doc();
    var out = [], list, i;
    if (!scope || typeof scope.querySelectorAll !== 'function') return out;
    try { list = scope.querySelectorAll(sel); }
    catch (e){ return out; }
    for (i = 0; i < list.length; i++) out.push(list[i]);
    return out;
  }

  /* ------------------------------------------------------- i18n bridges */

  /* The business is run from home: there is no shop, so the footer never
     prints an address and the hours line is about when messages get an
     answer, not when a door opens. 'footer' is a CORE namespace (SPEC 10),
     and this file is CORE — i18n.js itself is never edited from here. */
  (function extendDict(){
    var I = SN.I18n;
    if (!I || typeof I.extend !== 'function') return;
    try {
      I.extend({
        ar: { footer: { replyHours: 'أوقات الرد' } },
        en: { footer: { replyHours: 'When we reply' } }
      });
    } catch (e){ /* the shell must render even without i18n */ }
  }());

  function lang(){
    var I = SN.I18n;
    return (I && I.lang === 'en') ? 'en' : 'ar';
  }

  function t(key, vars){
    var I = SN.I18n;
    if (I && typeof I.t === 'function'){
      try { return I.t(key, vars); }
      catch (e){ /* fall through */ }
    }
    return String(key === undefined || key === null ? '' : key);
  }

  function pick(tobj){
    var I = SN.I18n;
    if (I && typeof I.pick === 'function'){
      try { return I.pick(tobj); }
      catch (e){ /* fall through */ }
    }
    if (typeof tobj === 'string') return tobj;
    if (isObj(tobj)){
      if (typeof tobj[lang()] === 'string' && tobj[lang()]) return tobj[lang()];
      if (typeof tobj.ar === 'string' && tobj.ar) return tobj.ar;
      if (typeof tobj.en === 'string' && tobj.en) return tobj.en;
    }
    return '';
  }

  /* raw T-object read: no cross-language fallback (used by the announce bar) */
  function pickStrict(tobj){
    if (typeof tobj === 'string') return tobj;
    if (isObj(tobj) && typeof tobj[lang()] === 'string') return tobj[lang()];
    return '';
  }

  function money(n){
    var I = SN.I18n, v;
    if (I && typeof I.money === 'function'){
      try { return I.money(n); }
      catch (e){ /* fall through */ }
    }
    v = typeof n === 'number' ? n : parseFloat(n);
    if (!isFinite(v)) v = 0;
    return String(Math.round(v * 100) / 100);
  }

  function dictHas(key){
    var I = SN.I18n, d;
    if (!I || !isObj(I.dict)) return false;
    d = I.dict[lang()];
    if (isObj(d) && has(d, key)) return true;
    d = I.dict[lang() === 'ar' ? 'en' : 'ar'];
    return isObj(d) && has(d, key);
  }

  /* 'common.saved' -> translated ; 'أي نص' -> printed as-is */
  function tr(text){
    var s = text === undefined || text === null ? '' : String(text);
    if (!s) return '';
    if (/^[a-zA-Z][\w-]*(\.[\w-]+)+$/.test(s) && dictHas(s)) return t(s);
    return s;
  }

  function applyI18n(scope){
    var I = SN.I18n;
    if (!I || typeof I.apply !== 'function') return;
    try { I.apply(scope || doc()); }
    catch (e){ /* never let a translation pass break the shell */ }
  }

  /* ------------------------------------------------------ store bridges */
  function get(path, fallback){
    var St = SN.Store, v;
    if (St && typeof St.get === 'function'){
      try {
        v = St.get(path, fallback);
        return v === undefined ? fallback : v;
      } catch (e){ /* fall through */ }
    }
    return fallback;
  }

  function brandName(){ return pick(get('settings.brand', null)) || ''; }

  function digits(v){ return String(v === undefined || v === null ? '' : v).replace(/[^0-9]/g, ''); }

  function handle(v){
    return String(v === undefined || v === null ? '' : v).trim().replace(/^@+/, '').replace(/\s+/g, '');
  }

  /* ==================================================================== */
  /* 1. el() — tiny hyperscript                                           */
  /* ==================================================================== */

  function append(node, kids){
    var i;
    if (kids === null || kids === undefined || kids === false || kids === true) return node;
    if (Array.isArray(kids)){
      for (i = 0; i < kids.length; i++) append(node, kids[i]);
      return node;
    }
    if (isNode(kids)){
      try { node.appendChild(kids); }
      catch (e){ /* detached / foreign node */ }
      return node;
    }
    if (typeof kids === 'string' || typeof kids === 'number'){
      node.appendChild(doc().createTextNode(String(kids)));
      return node;
    }
    return node;
  }

  function setStyle(node, v){
    var p, val;
    if (typeof v === 'string'){ node.setAttribute('style', v); return; }
    if (!isObj(v)) return;
    for (p in v){
      if (!has(v, p)) continue;
      val = v[p];
      if (val === null || val === undefined || val === false) continue;
      try { node.style.setProperty(dashed(p), String(val)); }
      catch (e){
        try { node.style[p] = String(val); }
        catch (e2){ /* ignore a single bad declaration */ }
      }
    }
  }

  function setMap(node, prefix, v){
    var isAria = prefix === 'aria-';
    var p, val;
    if (!isObj(v)) return;
    for (p in v){
      if (!has(v, p)) continue;
      val = v[p];
      if (val === null || val === undefined) continue;
      if (val === true) val = isAria ? 'true' : '';
      else if (val === false){
        if (!isAria) continue;            /* data-x:false -> omit ; aria-x:false -> "false" */
        val = 'false';
      }
      node.setAttribute(prefix + dashed(p), String(val));
    }
  }

  function setEvents(node, v){
    var p;
    if (!isObj(v)) return;
    for (p in v){
      if (!has(v, p)) continue;
      if (typeof v[p] === 'function') node.addEventListener(p, v[p], false);
    }
  }

  function el(tag, attrs, children){
    var d = doc();
    var node, k, v, deferValue = null;
    if (!d) return null;
    node = d.createElement(typeof tag === 'string' && tag ? tag : 'div');

    if (isObj(attrs)){
      for (k in attrs){
        if (!has(attrs, k)) continue;
        v = attrs[k];
        if (v === null || v === undefined || v === false) continue;

        if (k === 'class' || k === 'className'){ node.setAttribute('class', String(v)); continue; }
        if (k === 'text'){ node.textContent = String(v); continue; }
        if (k === 'html'){ node.innerHTML = String(v); continue; }
        if (k === 'style'){ setStyle(node, v); continue; }
        if (k === 'data'){ setMap(node, 'data-', v); continue; }
        if (k === 'aria'){ setMap(node, 'aria-', v); continue; }
        if (k === 'on'){ setEvents(node, v); continue; }
        if (k === 'value'){ deferValue = String(v); continue; }

        if (v === true) node.setAttribute(k, '');
        else node.setAttribute(k, String(v));
      }
    }

    append(node, children);
    if (deferValue !== null){
      try { node.value = deferValue; }
      catch (e){ node.setAttribute('value', deferValue); }
    }
    return node;
  }

  /* ==================================================================== */
  /* 2. icon() — inline SVG set                                           */
  /* ==================================================================== */

  /* stroke icons: currentColor, 1.6, rounded caps, 24x24 */
  var STROKE = {
    menu:    '<path d="M3.8 7h16.4M3.8 12h16.4M3.8 17h16.4"/>',
    close:   '<path d="M6.2 6.2l11.6 11.6M17.8 6.2L6.2 17.8"/>',
    cart:    '<path d="M2.6 3.6h2.3l2.4 11.3a1.7 1.7 0 0 0 1.7 1.3h8.2a1.7 1.7 0 0 0 1.6-1.3L20.4 7.4H6"/><circle cx="9.4" cy="20" r="1.4"/><circle cx="17.6" cy="20" r="1.4"/>',
    heart:   '<path d="M12 20.4S4.6 16 4.6 10.7A3.9 3.9 0 0 1 12 8.4a3.9 3.9 0 0 1 7.4 2.3c0 5.3-7.4 9.7-7.4 9.7Z"/>',
    star:    '<path d="M12 3.6l2.6 5.3 5.8.9-4.2 4.1 1 5.8L12 17l-5.2 2.7 1-5.8-4.2-4.1 5.8-.9z"/>',
    check:   '<path d="M4.8 12.6l4.9 4.9L19.2 7"/>',
    plus:    '<path d="M12 5.2v13.6M5.2 12h13.6"/>',
    minus:   '<path d="M5.2 12h13.6"/>',
    trash:   '<path d="M3.8 6.8h16.4M9.4 6.8V4.6h5.2v2.2M6.4 6.8l.9 12.4a1.7 1.7 0 0 0 1.7 1.6h6a1.7 1.7 0 0 0 1.7-1.6l.9-12.4M10.2 10.6v6.4M13.8 10.6v6.4"/>',
    edit:    '<path d="M4 20h4l10.4-10.4a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M13.4 6.6l4 4"/>',
    copy:    '<rect x="8.8" y="8.8" width="11.4" height="11.4" rx="2.6"/><path d="M5.6 15.2H5A2 2 0 0 1 3 13.2V5.4A2.4 2.4 0 0 1 5.4 3h7.8a2 2 0 0 1 2 2v.6"/>',
    download:'<path d="M12 3.4v11.4M7.4 10.4L12 14.9l4.6-4.5M4.2 19.6h15.6"/>',
    share:   '<circle cx="17.8" cy="5.6" r="2.6"/><circle cx="6.2" cy="12" r="2.6"/><circle cx="17.8" cy="18.4" r="2.6"/><path d="M8.5 10.8l7-3.9M8.5 13.2l7 3.9"/>',
    phone:   '<path d="M6.8 3.6h3l1.4 3.5-2 1.4a11.6 11.6 0 0 0 5.3 5.3l1.4-2 3.5 1.4v3a2 2 0 0 1-2.2 2A16.6 16.6 0 0 1 4.8 5.8a2 2 0 0 1 2-2.2Z"/>',
    mail:    '<rect x="3" y="5" width="18" height="14" rx="2.6"/><path d="M3.8 7.4l7.1 4.9a2 2 0 0 0 2.2 0l7.1-4.9"/>',
    sun:     '<circle cx="12" cy="12" r="4"/><path d="M12 2.6v2.2M12 19.2v2.2M4.8 12H2.6M21.4 12h-2.2M6.4 6.4L4.9 4.9M19.1 19.1l-1.5-1.5M17.6 6.4l1.5-1.5M4.9 19.1l1.5-1.5"/>',
    moon:    '<path d="M20.6 14.4A8.7 8.7 0 0 1 9.6 3.4a8.7 8.7 0 1 0 11 11Z"/>',
    globe:   '<circle cx="12" cy="12" r="8.8"/><path d="M3.3 12h17.4"/><path d="M12 3.2c2.3 2.6 3.5 5.6 3.5 8.8S14.3 18.2 12 20.8c-2.3-2.6-3.5-5.6-3.5-8.8S9.7 5.8 12 3.2Z"/>',
    arrow:   '<path d="M4.4 12h15.2M13.4 5.8l6.2 6.2-6.2 6.2"/>',
    chevron: '<path d="M9.4 5.6L15.8 12l-6.4 6.4"/>',
    sparkle: '<path d="M11 3.2l1.7 4.5 4.5 1.7-4.5 1.7L11 15.6l-1.7-4.5-4.5-1.7 4.5-1.7z"/><path d="M18 14.6l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8z"/>',
    brush:   '<path d="M17.4 3.4a2.3 2.3 0 0 1 3.2 3.2l-8.3 8.3-3.7.5.5-3.7z"/><path d="M8.6 15.4c-1.6 1.6-1.1 3.5-3.7 4.7 0 0 3.7 1.5 5.5-.4a2.6 2.6 0 0 0-1.8-4.3Z"/>',
    hand:    '<path d="M8.6 12V5.6a1.6 1.6 0 0 1 3.2 0V11"/><path d="M11.8 11V4.6a1.6 1.6 0 0 1 3.2 0V11"/><path d="M15 11.4V6.8a1.6 1.6 0 0 1 3.2 0v7.6a6.4 6.4 0 0 1-6.4 6.4h-.8a5 5 0 0 1-3.6-1.5l-3.3-3.4a1.7 1.7 0 0 1 2.4-2.4l2.1 2.1"/>',
    ruler:   '<rect x="2.6" y="8.4" width="18.8" height="7.2" rx="1.8"/><path d="M6.6 8.4v3M10.2 8.4v4.2M13.8 8.4v3M17.4 8.4v4.2"/>',
    pin:     '<path d="M12 21.2s6.6-5.8 6.6-11a6.6 6.6 0 1 0-13.2 0c0 5.2 6.6 11 6.6 11Z"/><circle cx="12" cy="10.1" r="2.5"/>',
    gem:     '<path d="M12 21L3.2 9.6l3.2-6.2h11.2l3.2 6.2z"/><path d="M3.4 9.6h17.2"/><path d="M8.6 9.6L12 21l3.4-11.4"/><path d="M8.6 9.6l1.7-6.2M15.4 9.6l-1.7-6.2"/>',
    shield:  '<path d="M12 3.2l7.2 2.6v5.5c0 4.2-2.9 7.7-7.2 9.5-4.3-1.8-7.2-5.3-7.2-9.5V5.8z"/><path d="M8.9 12.1l2.2 2.2 4-4.3"/>',
    truck:   '<path d="M3 6.6h10.6v9.8H3z"/><path d="M13.6 10.2h3.6l2.8 3v3.2h-6.4z"/><circle cx="7.4" cy="18.4" r="1.9"/><circle cx="16.8" cy="18.4" r="1.9"/>',
    clock:   '<circle cx="12" cy="12" r="8.8"/><path d="M12 6.8V12l3.4 2"/>',
    search:  '<circle cx="10.8" cy="10.8" r="6.6"/><path d="M15.6 15.6l4.9 4.9"/>',
    filter:  '<path d="M3.6 5.4h16.8l-6.6 7.7v5.5l-3.6 2v-7.5z"/>',
    undo:    '<path d="M4.4 10.6h9.8a5.2 5.2 0 1 1 0 10.4H9.6"/><path d="M8.9 5.9L4.2 10.6l4.7 4.7"/>',
    redo:    '<path d="M19.6 10.6H9.8a5.2 5.2 0 1 0 0 10.4h4.6"/><path d="M15.1 5.9l4.7 4.7-4.7 4.7"/>',
    dice:    '<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.2"/><path d="M8.6 8.6h.01M15.4 8.6h.01M12 12h.01M8.6 15.4h.01M15.4 15.4h.01"/>',
    lock:    '<rect x="4.4" y="10.2" width="15.2" height="10.4" rx="3"/><path d="M8.2 10.2V7.6a3.8 3.8 0 0 1 7.6 0v2.6"/><path d="M12 14.4v2.2"/>',
    image:   '<rect x="3.2" y="4.8" width="17.6" height="14.4" rx="3"/><circle cx="8.9" cy="10" r="1.6"/><path d="M4 17.6l4.7-4.3a2 2 0 0 1 2.7 0l4.4 4"/><path d="M14.6 14.2l1.4-1.3a2 2 0 0 1 2.7 0l2.1 1.9"/>',
    grid:    '<rect x="3.6" y="3.6" width="7" height="7" rx="2"/><rect x="13.4" y="3.6" width="7" height="7" rx="2"/><rect x="3.6" y="13.4" width="7" height="7" rx="2"/><rect x="13.4" y="13.4" width="7" height="7" rx="2"/>',
    plusCircle: '<circle cx="12" cy="12" r="8.8"/><path d="M12 8.2v7.6M8.2 12h7.6"/>',
    nail:    '<path d="M12 2.8c3 0 4.8 1.9 4.8 4.6 0 2.6-.6 4.9-1 7-.5 2.7-1 5.2-3.8 5.2s-3.3-2.5-3.8-5.2c-.4-2.1-1-4.4-1-7 0-2.7 1.8-4.6 4.8-4.6Z"/><path d="M9.7 6.8c1.3-1 3.3-1 4.6 0"/>'
  };

  /* brand icons: filled, evenodd so inner shapes punch through */
  var FILLED = {
    whatsapp: '<path d="M12 2.2a9.6 9.6 0 0 0-8.2 14.6L2.6 21.8l5.2-1.3A9.6 9.6 0 1 0 12 2.2Z"/>'
            + '<path d="M8.6 6.9c-.3 0-.6.1-.9.4-.3.3-.9.9-.9 2.1s.9 2.5 1 2.7c.1.2 1.7 2.9 4.3 4 2.1.9 2.6.8 3.1.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.3-.2-.5-.3l-2-1c-.3-.1-.5-.2-.7.1l-.8 1c-.2.2-.4.3-.7.1-.3-.1-1.2-.5-2.3-1.5-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.8-2c-.2-.5-.4-.4-.6-.4Z"/>',
    instagram:'<path d="M7.6 2.2h8.8A5.4 5.4 0 0 1 21.8 7.6v8.8a5.4 5.4 0 0 1-5.4 5.4H7.6a5.4 5.4 0 0 1-5.4-5.4V7.6a5.4 5.4 0 0 1 5.4-5.4Z"/>'
            + '<path d="M7.6 4.2A3.4 3.4 0 0 0 4.2 7.6v8.8a3.4 3.4 0 0 0 3.4 3.4h8.8a3.4 3.4 0 0 0 3.4-3.4V7.6a3.4 3.4 0 0 0-3.4-3.4Z"/>'
            + '<path d="M12 6.9a5.1 5.1 0 1 0 0 10.2 5.1 5.1 0 0 0 0-10.2Z"/>'
            + '<path d="M12 8.9a3.1 3.1 0 1 1 0 6.2 3.1 3.1 0 0 1 0-6.2Z"/>'
            + '<path d="M17.4 5.3a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7Z"/>',
    snapchat: '<path d="M12 2.6c2.7 0 4.4 2 4.4 4.7 0 .8-.1 1.6-.1 2.3.4.2.9.2 1.3 0 .5-.2 1 0 1.2.4.2.5 0 1-.5 1.2-.7.3-1.6.5-1.8 1-.2.5.2 1.1.6 1.7.8 1.1 1.9 1.9 3.1 2.2.4.1.6.5.5.9-.2.6-1.1 1-2.4 1.2-.1.3-.2.7-.3 1-.1.4-.4.6-.8.5-.5-.1-1.1-.2-1.7-.2-.6 0-1.1.2-1.6.5-.7.5-1.4 1-2.4 1s-1.7-.5-2.4-1c-.5-.3-1-.5-1.6-.5-.6 0-1.2.1-1.7.2-.4.1-.7-.1-.8-.5-.1-.3-.2-.7-.3-1-1.3-.2-2.2-.6-2.4-1.2-.1-.4.1-.8.5-.9 1.2-.3 2.3-1.1 3.1-2.2.4-.6.8-1.2.6-1.7-.2-.5-1.1-.7-1.8-1-.5-.2-.7-.7-.5-1.2.2-.4.7-.6 1.2-.4.4.2.9.2 1.3 0 0-.7-.1-1.5-.1-2.3 0-2.7 1.7-4.7 4.4-4.7Z"/>',
    tiktok:   '<path d="M14.2 2.2h3.4c.2 1.1.8 2.1 1.6 2.8.8.7 1.9 1.1 3 1.2v3.4c-1.6-.05-3.2-.5-4.6-1.4v6.6a6.6 6.6 0 1 1-6.6-6.6c.4 0 .7 0 1.1.1v3.5a3.1 3.1 0 1 0 2.1 2.9V2.2Z"/>'
  };

  function icon(name, size){
    var n = slug(name);
    var s = size === undefined || size === null ? 20 : (parseFloat(size) || 20);
    var body2 = has(STROKE, n) ? STROKE[n] : null;
    var filled = false;
    var head;

    if (body2 === null && has(FILLED, n)){ body2 = FILLED[n]; filled = true; }
    if (body2 === null){ body2 = '<circle cx="12" cy="12" r="2.4"/>'; filled = true; }   /* unknown -> neutral dot */

    head = '<svg class="ico ico-' + (n || 'dot') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" '
         + 'aria-hidden="true" focusable="false" ';
    head += filled
      ? 'fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" stroke="none">'
      : 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">';

    return head + body2 + '</svg>';
  }

  function brandMark(size){
    var s = size === undefined || size === null ? 26 : (parseFloat(size) || 26);
    var d = 'M12 2.6c3.1 0 4.9 1.9 4.9 4.7 0 2.6-.6 4.9-1 7.1-.5 2.8-1 5.3-3.9 5.3s-3.4-2.5-3.9-5.3c-.4-2.2-1-4.5-1-7.1 0-2.8 1.8-4.7 4.9-4.7Z';
    return '<svg class="ico ico-brand" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">'
         + '<path d="' + d + '" fill="currentColor" opacity=".15"/>'
         + '<path d="' + d + '" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'
         + '<path d="M9.6 6.7c1.3-1.1 3.5-1.1 4.8 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity=".65"/>'
         + '</svg>';
  }

  /* ==================================================================== */
  /* 3. theme                                                             */
  /* ==================================================================== */

  var currentTheme = null;

  function storedTheme(){
    var v = null;
    try { v = window.localStorage.getItem(THEME_KEY); }
    catch (e){ v = null; }
    return (v === 'light' || v === 'dark') ? v : null;
  }

  function prefersDark(){
    try { return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); }
    catch (e){ return false; }
  }

  function resolveTheme(){
    var s = storedTheme(), fromSettings;
    if (s) return s;
    fromSettings = get('settings.theme', '');
    if (fromSettings === 'light' || fromSettings === 'dark') return fromSettings;
    return prefersDark() ? 'dark' : 'light';
  }

  function metaColor(theme){
    var d = doc(), m;
    if (!d) return;
    m = d.querySelector('meta[name="theme-color"]');
    if (!m){
      m = d.createElement('meta');
      m.setAttribute('name', 'theme-color');
      try { (d.head || d.documentElement).appendChild(m); }
      catch (e){ return; }
    }
    m.setAttribute('content', theme === 'dark' ? '#171014' : '#C97B92');
  }

  function applyTheme(theme){
    var next = theme === 'dark' ? 'dark' : 'light';
    var r = root();
    currentTheme = next;
    if (r) r.setAttribute('data-theme', next);
    metaColor(next);
    syncThemeBtn();
    return next;
  }

  function themeGet(){
    if (currentTheme === 'light' || currentTheme === 'dark') return currentTheme;
    currentTheme = resolveTheme();
    return currentTheme;
  }

  function themeSet(theme){
    var next = applyTheme(theme);
    try { window.localStorage.setItem(THEME_KEY, next); }
    catch (e){ /* Safari private mode — the choice just won't stick */ }
    fire('sn:theme', { theme: next });
    return next;
  }

  function themeToggle(){ return themeSet(themeGet() === 'dark' ? 'light' : 'dark'); }

  function syncThemeBtn(){
    var b = doc() ? doc().getElementById('btn-theme') : null;
    var dark;
    if (!b) return;
    dark = themeGet() === 'dark';
    b.innerHTML = icon(dark ? 'sun' : 'moon', 20);
    b.setAttribute('data-theme-state', dark ? 'dark' : 'light');
  }

  function fire(name, detail){
    var d = doc(), ev;
    if (!d) return;
    try { ev = new CustomEvent(name, { detail: detail || null }); }
    catch (e){
      try {
        ev = d.createEvent('CustomEvent');
        ev.initCustomEvent(name, true, false, detail || null);
      } catch (e2){ return; }
    }
    try { d.dispatchEvent(ev); }
    catch (e3){ /* ignore */ }
  }

  /* ==================================================================== */
  /* 4. header                                                            */
  /* ==================================================================== */

  var currentPage = 'home';

  function headerEl(){ return doc() ? doc().getElementById('sn-header') : null; }

  function menuOpen(){
    var h = headerEl();
    return !!(h && h.classList && h.classList.contains('nav-open'));
  }

  function setMenu(open, focusBtn){
    var h = headerEl();
    var b = doc() ? doc().getElementById('btn-menu') : null;
    if (!h || !h.classList) return;
    if (open) h.classList.add('nav-open');
    else h.classList.remove('nav-open');
    if (b){
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      b.innerHTML = icon(open ? 'close' : 'menu', 22);
      b.setAttribute('aria-label', t(open ? 'nav.closeMenu' : 'nav.menu'));
      if (!open && focusBtn){
        try { b.focus(); }
        catch (e){ /* ignore */ }
      }
    }
  }

  function navLink(page, active){
    var a = el('a', {
      'class': 'nav-a' + (active ? ' is-active' : ''),
      href: PAGE_HREF[page],
      'data-i18n': 'nav.' + page,
      'data-page-link': page,
      on: { click: function(){ setMenu(false); } }
    }, t('nav.' + page));
    if (active) a.setAttribute('aria-current', 'page');
    return a;
  }

  function mountHeader(activePage){
    var h = headerEl();
    var page = has(PAGE_HREF, activePage) ? activePage : (activePage || currentPage);
    var inner, nav, actions, brand;

    if (!h) return null;
    currentPage = page;

    brand = el('a', { 'class': 'brand', href: 'index.html', 'data-i18n-aria': 'nav.brandHome', 'aria-label': t('nav.brandHome') }, [
      el('span', { 'class': 'brand-mark', html: brandMark(28) }),
      el('span', { 'class': 'brand-name display', text: brandName() })
    ]);

    nav = el('nav', {
      'class': 'nav',
      id: 'sn-nav',
      'aria-label': t('a11y.mainNav'),
      'data-i18n-aria': 'a11y.mainNav'
    }, [
      navLink('home',   page === 'home'),
      navLink('shop',   page === 'shop'),
      navLink('faq',    page === 'faq')
    ]);

    actions = el('div', { 'class': 'hdr-actions' }, [
      el('button', {
        'class': 'icon-btn', id: 'btn-lang', type: 'button',
        'aria-label': t('a11y.toggleLang'), 'data-i18n-aria': 'a11y.toggleLang',
        title: t('nav.lang'), 'data-i18n-title': 'nav.lang',
        on: { click: function(){
          if (SN.I18n && typeof SN.I18n.toggle === 'function') SN.I18n.toggle();
        } }
      }, el('span', { 'class': 'lang-txt', 'data-i18n': 'nav.langShort', text: t('nav.langShort') })),

      el('button', {
        'class': 'icon-btn', id: 'btn-theme', type: 'button',
        'aria-label': t('a11y.toggleTheme'), 'data-i18n-aria': 'a11y.toggleTheme',
        title: t('theme.toggle'), 'data-i18n-title': 'theme.toggle',
        html: icon(themeGet() === 'dark' ? 'sun' : 'moon', 20),
        on: { click: function(){ themeToggle(); } }
      }),

      el('a', {
        'class': 'btn btn-pri hdr-cta', href: QUIZ_HREF, 'data-i18n': 'nav.cta',
        on: { click: function(){ setMenu(false); } }
      }, t('nav.cta')),

      el('button', {
        'class': 'icon-btn only-mob', id: 'btn-menu', type: 'button',
        'aria-expanded': 'false', 'aria-controls': 'sn-nav',
        'aria-label': t('nav.menu'),
        html: icon('menu', 22),
        on: { click: function(ev){
          ev.preventDefault();
          ev.stopPropagation();
          setMenu(!menuOpen());
        } }
      })
    ]);

    inner = el('div', { 'class': 'hdr-inner wrap' }, [brand, nav, actions]);

    h.innerHTML = '';
    h.appendChild(inner);
    h.setAttribute('data-page', page);
    setMenu(false);
    applyI18n(h);
    wireDocument();
    return h;
  }

  /* ==================================================================== */
  /* 5. announce bar                                                      */
  /* ==================================================================== */

  function announceDismissed(text){
    var v = null;
    try { v = window.sessionStorage.getItem(ANNOUNCE_KEY); }
    catch (e){ v = null; }
    return v !== null && v === hashOf(text);
  }

  function dismissAnnounce(text){
    try { window.sessionStorage.setItem(ANNOUNCE_KEY, hashOf(text)); }
    catch (e){ /* private mode — it will simply come back next load */ }
  }

  function mountAnnounce(){
    var host = doc() ? doc().getElementById('sn-announce') : null;
    var on, txt, bar;

    if (!host) return null;                                  /* admin.html has no bar */
    host.innerHTML = '';

    on = get('settings.announceOn', false);
    if (on === false || on === 'false') return null;

    txt = String(pickStrict(get('settings.announce', null)) || '').trim();
    if (!txt) return null;                                   /* empty in this language -> nothing */
    if (announceDismissed(txt)) return null;

    bar = el('div', { 'class': 'announce', role: 'region', 'aria-label': t('a11y.notifications'), 'data-i18n-aria': 'a11y.notifications' }, [
      el('div', { 'class': 'announce-in wrap' }, [
        el('span', { 'class': 'announce-ico', html: icon('sparkle', 16), 'aria-hidden': 'true' }),
        el('span', { 'class': 'announce-txt', text: txt }),
        el('button', {
          'class': 'icon-btn announce-x', type: 'button',
          'aria-label': t('common.close'), 'data-i18n-aria': 'common.close',
          html: icon('close', 16),
          on: { click: function(){
            dismissAnnounce(txt);
            host.innerHTML = '';
          } }
        })
      ])
    ]);

    host.appendChild(bar);
    applyI18n(host);
    return bar;
  }

  /* ==================================================================== */
  /* 6. footer                                                            */
  /* ==================================================================== */

  function extLink(cls, href, label, kids){
    return el('a', {
      'class': cls, href: href, target: '_blank', rel: 'noopener noreferrer',
      'aria-label': label, title: label
    }, kids);
  }

  function contactRow(iconName, href, value, label, external, ltr){
    var kids, attrs;
    if (!value) return null;
    kids = [
      el('span', { 'class': 'ft-ico', html: icon(iconName, 18), 'aria-hidden': 'true' }),
      el('span', { 'class': 'ft-val', text: value, dir: ltr ? 'ltr' : null })
    ];
    if (!href) return el('div', { 'class': 'ft-row', title: label }, kids);
    attrs = { 'class': 'ft-row', href: href, 'aria-label': label, title: label };
    if (external){ attrs.target = '_blank'; attrs.rel = 'noopener noreferrer'; }
    return el('a', attrs, kids);
  }

  function socialButtons(){
    var wa  = digits(get('settings.whatsapp', ''));
    var ig  = handle(get('settings.instagram', ''));
    var sc  = handle(get('settings.snapchat', ''));
    var tk  = handle(get('settings.tiktok', ''));
    var out = [];

    if (wa) out.push(extLink('icon-btn ft-soc ft-soc-wa', 'https://wa.me/' + wa, t('common.whatsapp'), el('span', { html: icon('whatsapp', 19) })));
    if (ig) out.push(extLink('icon-btn ft-soc ft-soc-ig', 'https://instagram.com/' + ig, t('common.instagram'), el('span', { html: icon('instagram', 19) })));
    if (sc) out.push(extLink('icon-btn ft-soc ft-soc-sc', 'https://snapchat.com/add/' + sc, t('common.snapchat'), el('span', { html: icon('snapchat', 19) })));
    if (tk) out.push(extLink('icon-btn ft-soc ft-soc-tt', 'https://tiktok.com/@' + tk, t('common.tiktok'), el('span', { html: icon('tiktok', 19) })));
    return out;
  }

  function footerLinks(){
    var keys = ['home', 'shop', 'faq'], out = [], i;
    for (i = 0; i < keys.length; i++){
      out.push(el('li', null, el('a', {
        'class': 'ft-a', href: PAGE_HREF[keys[i]], 'data-i18n': 'nav.' + keys[i]
      }, t('nav.' + keys[i]))));
    }
    return el('ul', { 'class': 'ft-list' }, out);
  }

  function scrollTop(){
    var reduce = false;
    try { reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e){ reduce = false; }
    try { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }
    catch (e){ window.scrollTo(0, 0); }
  }

  function mountFooter(){
    var f = doc() ? doc().getElementById('sn-footer') : null;
    var brand = brandName();
    var about, tagline, hours;
    var phone, wa, mail, ig, sc, tk;
    var cols = [], contact = [], info = [], socials, inner;

    if (!f) return null;

    about   = pick(get('settings.about', null));
    tagline = pick(get('settings.tagline', null));
    hours   = pick(get('settings.hours', null));

    phone = String(get('settings.phone', '') || '').trim();
    wa    = digits(get('settings.whatsapp', ''));
    mail  = String(get('settings.email', '') || '').trim();
    ig    = handle(get('settings.instagram', ''));
    sc    = handle(get('settings.snapchat', ''));
    tk    = handle(get('settings.tiktok', ''));

    /* --- column 1: brand + about + social ------------------------------ */
    socials = socialButtons();
    cols.push(el('div', { 'class': 'ft-col ft-brandcol' }, [
      el('a', { 'class': 'brand', href: 'index.html', 'aria-label': t('nav.brandHome'), 'data-i18n-aria': 'nav.brandHome' }, [
        el('span', { 'class': 'brand-mark', html: brandMark(26) }),
        el('span', { 'class': 'brand-name display', text: brand })
      ]),
      tagline ? el('p', { 'class': 'ft-tag muted', text: tagline }) : null,
      about   ? el('p', { 'class': 'ft-about muted', text: about }) : null,
      socials.length ? el('div', { 'class': 'ft-social', role: 'group', 'aria-label': t('footer.follow'), 'data-i18n-aria': 'footer.follow' }, socials) : null
    ]));

    /* --- column 2: quick links ----------------------------------------- */
    cols.push(el('nav', { 'class': 'ft-col ft-linkcol', 'aria-label': t('a11y.footerNav'), 'data-i18n-aria': 'a11y.footerNav' }, [
      el('h2', { 'class': 'ft-head', 'data-i18n': 'footer.links' }, t('footer.links')),
      footerLinks()
    ]));

    /* --- column 3: contact --------------------------------------------- */
    contact.push(contactRow('phone', phone ? 'tel:' + phone.replace(/\s/g, '') : '', phone, t('common.call'), false, true));
    contact.push(contactRow('whatsapp', wa ? 'https://wa.me/' + wa : '', wa ? '+' + wa : '', t('common.whatsapp'), true, true));
    contact.push(contactRow('mail', mail ? 'mailto:' + mail : '', mail, t('common.email'), false, true));
    contact.push(contactRow('instagram', ig ? 'https://instagram.com/' + ig : '', ig ? '@' + ig : '', t('common.instagram'), true, true));
    contact.push(contactRow('snapchat', sc ? 'https://snapchat.com/add/' + sc : '', sc ? '@' + sc : '', t('common.snapchat'), true, true));
    contact.push(contactRow('tiktok', tk ? 'https://tiktok.com/@' + tk : '', tk ? '@' + tk : '', t('common.tiktok'), true, true));

    cols.push(el('div', { 'class': 'ft-col ft-contactcol' }, [
      el('h2', { 'class': 'ft-head', 'data-i18n': 'footer.contact' }, t('footer.contact')),
      el('div', { 'class': 'ft-rows' }, contact)
    ]));

    /* --- column 4: when messages get answered ---------------------------
       Deliberately no address / location rows: this is a home business that
       ships everything, so there is nowhere to visit. */
    if (hours){
      info.push(el('h2', { 'class': 'ft-head', 'data-i18n': 'footer.replyHours' }, t('footer.replyHours')));
      info.push(contactRow('clock', '', hours, t('footer.replyHours'), false, false));
    }
    if (info.length) cols.push(el('div', { 'class': 'ft-col ft-infocol' }, info));

    /* --- bottom bar ----------------------------------------------------- */
    inner = el('div', { 'class': 'ft-inner wrap' }, [
      el('div', { 'class': 'ft-grid' }, cols),
      el('div', { 'class': 'ft-bot' }, [
        el('p', { 'class': 'ft-copy muted', text: t('footer.copy', { year: new Date().getFullYear(), brand: brand }) }),
        el('div', { 'class': 'ft-bot-actions' }, [
          el('a', { 'class': 'ft-admin muted', href: 'admin.html', 'data-i18n': 'footer.admin', rel: 'nofollow' }, t('footer.admin')),
          el('button', {
            'class': 'icon-btn ft-top', type: 'button',
            'aria-label': t('footer.backToTop'), 'data-i18n-aria': 'footer.backToTop',
            title: t('footer.backToTop'), 'data-i18n-title': 'footer.backToTop',
            html: icon('arrow', 18),
            on: { click: scrollTop }
          })
        ])
      ])
    ]);

    f.innerHTML = '';
    f.appendChild(inner);
    applyI18n(f);
    return f;
  }

  /* ==================================================================== */
  /* 7. toasts                                                            */
  /* ==================================================================== */

  function toastWrap(){
    var d = doc(), b = body(), w;
    if (!d || !b) return null;
    w = d.querySelector('.toast-wrap');
    if (!w){
      w = el('div', {
        'class': 'toast-wrap',
        role: 'status',
        aria: { live: 'polite', atomic: 'true' }
      });
      b.appendChild(w);
    } else if (w.parentNode !== b || b.lastChild !== w){
      try { b.appendChild(w); }              /* keep toasts above later-mounted overlays */
      catch (e){ /* ignore */ }
    }
    return w;
  }

  function toast(text, type){
    var kind = (type === 'ok' || type === 'err' || type === 'info') ? type : 'info';
    var msg  = tr(text);
    var wrap = toastWrap();
    var node, timer, closed = false, iconName;

    if (!wrap || !msg) return { el: null, close: function(){} };

    while (wrap.children.length >= TOAST_MAX){
      try { wrap.removeChild(wrap.firstChild); }
      catch (e){ break; }
    }

    iconName = kind === 'ok' ? 'check' : (kind === 'err' ? 'close' : 'sparkle');

    function close(){
      if (closed) return;
      closed = true;
      if (timer){ clearTimeout(timer); timer = null; }
      if (node && node.classList) node.classList.add('is-out');
      setTimeout(function(){
        try { if (node && node.parentNode) node.parentNode.removeChild(node); }
        catch (e){ /* ignore */ }
      }, 220);
    }

    node = el('div', { 'class': 'toast toast-' + kind, 'data-type': kind }, [
      el('span', { 'class': 'toast-ico', html: icon(iconName, 18), 'aria-hidden': 'true' }),
      el('span', { 'class': 'toast-txt', text: msg }),
      el('button', {
        'class': 'toast-x icon-btn', type: 'button',
        'aria-label': t('common.close'), 'data-i18n-aria': 'common.close',
        html: icon('close', 14),
        on: { click: close }
      })
    ]);

    wrap.appendChild(node);
    if (window.requestAnimationFrame){
      window.requestAnimationFrame(function(){
        if (node && node.classList) node.classList.add('is-in');
      });
    } else if (node.classList) node.classList.add('is-in');

    timer = setTimeout(close, TOAST_MS);
    return { el: node, close: close };
  }

  /* ==================================================================== */
  /* 8. modal / sheet / confirm                                           */
  /* ==================================================================== */

  var stack = [];
  var lockCount = 0;
  var prevOverflow = '';

  function lockScroll(){
    var b = body(), r = root();
    if (!b) return;
    if (lockCount === 0){
      prevOverflow = b.style.overflow || '';
      b.style.overflow = 'hidden';
      if (r && r.classList) r.classList.add('sn-modal-open');
    }
    lockCount++;
  }

  function unlockScroll(){
    var b = body(), r = root();
    if (lockCount > 0) lockCount--;
    if (lockCount === 0 && b){
      b.style.overflow = prevOverflow;
      if (r && r.classList) r.classList.remove('sn-modal-open');
    }
  }

  var FOCUS_SEL = 'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),'
                + 'select:not([disabled]),textarea:not([disabled]),summary,iframe,object,embed,'
                + 'audio[controls],video[controls],[contenteditable="true"],[tabindex]';

  function visible(node){
    var rects;
    if (!node || node.disabled) return false;
    if (node.getAttribute && node.getAttribute('tabindex') === '-1') return false;
    if (node.hasAttribute && node.hasAttribute('hidden')) return false;
    if (node.getAttribute && node.getAttribute('aria-hidden') === 'true') return false;
    try { rects = node.getClientRects(); }
    catch (e){ rects = null; }
    if (rects && rects.length) return true;
    return !!(node.offsetWidth || node.offsetHeight);
  }

  function focusables(scope){
    var all = qsa(FOCUS_SEL, scope), out = [], i;
    for (i = 0; i < all.length; i++){ if (visible(all[i])) out.push(all[i]); }
    return out;
  }

  function focusFirst(dlg){
    var pref = qs('[autofocus],[data-autofocus]', dlg);
    var list;
    if (pref && visible(pref)){
      try { pref.focus({ preventScroll: true }); return; }
      catch (e){ try { pref.focus(); return; } catch (e2){ /* ignore */ } }
    }
    list = focusables(dlg);
    try {
      if (list.length) list[0].focus({ preventScroll: true });
      else dlg.focus({ preventScroll: true });
    } catch (e3){
      try { (list.length ? list[0] : dlg).focus(); }
      catch (e4){ /* ignore */ }
    }
  }

  function trapTab(dlg, ev){
    var list = focusables(dlg);
    var first, last, active = doc() ? doc().activeElement : null;
    if (!list.length){
      ev.preventDefault();
      try { dlg.focus(); } catch (e){ /* ignore */ }
      return;
    }
    first = list[0];
    last  = list[list.length - 1];
    if (!dlg.contains(active)){
      ev.preventDefault();
      try { (ev.shiftKey ? last : first).focus(); } catch (e2){ /* ignore */ }
      return;
    }
    if (ev.shiftKey && active === first){
      ev.preventDefault();
      try { last.focus(); } catch (e3){ /* ignore */ }
    } else if (!ev.shiftKey && active === last){
      ev.preventDefault();
      try { first.focus(); } catch (e4){ /* ignore */ }
    }
  }

  function actionButton(a, close){
    var cls = String(a && a.cls ? a.cls : 'btn-ghost');
    var node;
    if (!/(^|\s)btn(\s|$)/.test(cls)) cls = 'btn ' + cls;
    node = el('button', {
      'class': cls, type: 'button',
      'data-action': a && a.id ? a.id : null,
      disabled: a && a.disabled ? true : null,
      on: { click: function(ev){
        if (a && typeof a.onClick === 'function'){
          try { a.onClick(close, ev); }
          catch (e){ console.warn('[SN.UI] modal action failed', e); }
          if (a.close === true) close();
          return;
        }
        close();
      } }
    }, tr(a && a.label));
    if (a && a.icon) node.insertBefore(el('span', { 'class': 'btn-ico', html: icon(a.icon, 18), 'aria-hidden': 'true' }), node.firstChild);
    return node;
  }

  function dialog(opts, asSheet){
    var o = isObj(opts) ? opts : {};
    var size = (o.size === 'sm' || o.size === 'lg') ? o.size : 'md';
    var d = doc(), b = body();
    var prevFocus = d ? d.activeElement : null;
    var titleTxt = tr(o.title);
    var titleId = titleTxt ? nid('sn-mt') : null;
    var back, dlg, head, bodyBox, foot, entry;
    var closed = false, downOnBack = false;
    var i, acts;

    if (!d || !b) return { el: null, dialog: null, body: null, close: function(){} };

    function close(){
      var j;
      if (closed) return;
      closed = true;
      for (j = stack.length - 1; j >= 0; j--){ if (stack[j] === entry) stack.splice(j, 1); }
      try { back.removeEventListener('keydown', onKey, false); }
      catch (e){ /* ignore */ }
      try { if (back.parentNode) back.parentNode.removeChild(back); }
      catch (e2){ /* ignore */ }
      unlockScroll();
      if (prevFocus && typeof prevFocus.focus === 'function' && d.contains(prevFocus)){
        try { prevFocus.focus({ preventScroll: true }); }
        catch (e3){ try { prevFocus.focus(); } catch (e4){ /* ignore */ } }
      }
      if (typeof o.onClose === 'function'){
        try { o.onClose(); }
        catch (e5){ console.warn('[SN.UI] modal onClose failed', e5); }
      }
    }

    function onKey(ev){
      var k = ev.key || '';
      if (k === 'Tab' || ev.keyCode === 9) trapTab(dlg, ev);
    }

    bodyBox = el('div', { 'class': 'modal-body' });
    if (isNode(o.body)) bodyBox.appendChild(o.body);
    else if (Array.isArray(o.body)) append(bodyBox, o.body);
    else if (typeof o.html === 'string') bodyBox.innerHTML = o.html;
    else if (typeof o.body === 'string' && o.body) bodyBox.appendChild(el('p', { 'class': 'modal-text lead', text: tr(o.body) }));

    head = null;
    if (titleTxt || o.showClose !== false){
      head = el('div', { 'class': 'modal-head' }, [
        titleTxt ? el('h2', { 'class': 'modal-title h3 display', id: titleId, text: titleTxt }) : el('span', { 'class': 'modal-title' }),
        o.showClose === false ? null : el('button', {
          'class': 'icon-btn modal-x', type: 'button',
          'aria-label': t('common.close'), 'data-i18n-aria': 'common.close',
          html: icon('close', 18),
          on: { click: function(){ close(); } }
        })
      ]);
    }

    foot = null;
    acts = Array.isArray(o.actions) ? o.actions : [];
    if (acts.length){
      foot = el('div', { 'class': 'modal-foot' });
      for (i = 0; i < acts.length; i++){
        if (acts[i]) foot.appendChild(actionButton(acts[i], close));
      }
    }

    dlg = el('div', {
      'class': 'modal modal-' + size + (asSheet ? ' sheet' : '') + (o.cls ? ' ' + o.cls : ''),
      role: 'dialog',
      tabindex: '-1',
      'aria-modal': 'true',
      'data-size': size
    }, [head, bodyBox, foot]);

    if (titleId) dlg.setAttribute('aria-labelledby', titleId);
    else dlg.setAttribute('aria-label', t('a11y.dialog'));

    back = el('div', {
      'class': 'modal-back' + (asSheet ? ' is-sheet' : ''),
      'data-size': size,
      on: {
        mousedown: function(ev){ downOnBack = (ev.target === back); },
        click: function(ev){
          if (o.closeOnBackdrop === false) return;
          if (ev.target === back && downOnBack) close();
          downOnBack = false;
        }
      }
    }, dlg);

    back.addEventListener('keydown', onKey, false);

    lockScroll();
    b.appendChild(back);
    applyI18n(back);

    entry = { close: close, el: back, dialog: dlg, escape: o.closeOnEsc !== false };
    stack.push(entry);
    wireDocument();

    if (window.requestAnimationFrame){
      window.requestAnimationFrame(function(){
        if (back.classList) back.classList.add('is-in');
        if (dlg.classList) dlg.classList.add('is-in');
      });
    } else {
      if (back.classList) back.classList.add('is-in');
      if (dlg.classList) dlg.classList.add('is-in');
    }

    focusFirst(dlg);
    if (typeof o.onOpen === 'function'){
      try { o.onOpen({ el: back, dialog: dlg, body: bodyBox, close: close }); }
      catch (e6){ console.warn('[SN.UI] modal onOpen failed', e6); }
    }

    return { el: back, dialog: dlg, body: bodyBox, close: close };
  }

  function modal(opts){ return dialog(opts, false); }

  function isSmall(){
    try {
      if (window.matchMedia) return window.matchMedia(SHEET_MQ).matches;
    } catch (e){ /* fall through */ }
    return (window.innerWidth || 0) <= 720;
  }

  function sheet(opts){ return dialog(opts, isSmall()); }

  function confirmBox(text){
    return new Promise(function(resolve){
      var done = false, m;
      function finish(v){
        if (done) return;
        done = true;
        resolve(!!v);
        if (m && typeof m.close === 'function') m.close();
      }
      m = modal({
        size: 'sm',
        cls: 'modal-confirm',
        title: t('common.confirm'),
        body: el('p', { 'class': 'lead', text: tr(text) || t('common.deleteConfirm') }),
        actions: [
          { label: t('common.cancel'), cls: 'btn-ghost', onClick: function(){ finish(false); } },
          { label: t('common.yes'), cls: 'btn-pri', onClick: function(){ finish(true); } }
        ],
        onClose: function(){
          if (!done){ done = true; resolve(false); }
        }
      });
    });
  }

  /* ==================================================================== */
  /* 9. clipboard / download                                              */
  /* ==================================================================== */

  function legacyCopy(text){
    var d = doc(), b = body(), ta, ok = false, sel = null, prev = null;
    if (!d || !b) return false;
    ta = d.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.setAttribute('aria-hidden', 'true');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    b.appendChild(ta);
    try {
      sel = d.getSelection ? d.getSelection() : null;
      prev = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
    } catch (e){ sel = null; prev = null; }
    try {
      ta.focus();
      ta.select();
      if (ta.setSelectionRange) ta.setSelectionRange(0, text.length);
      ok = !!d.execCommand('copy');
    } catch (e2){ ok = false; }
    try { b.removeChild(ta); }
    catch (e3){ /* ignore */ }
    if (sel && prev){
      try { sel.removeAllRanges(); sel.addRange(prev); }
      catch (e4){ /* ignore */ }
    }
    return ok;
  }

  function copy(text){
    var s = String(text === undefined || text === null ? '' : text);
    return new Promise(function(resolve){
      var api = null;
      try { api = navigator && navigator.clipboard ? navigator.clipboard : null; }
      catch (e){ api = null; }
      if (api && typeof api.writeText === 'function'){
        try {
          api.writeText(s).then(function(){ resolve(true); }, function(){ resolve(legacyCopy(s)); });
          return;
        } catch (e2){ /* fall through */ }
      }
      resolve(legacyCopy(s));
    });
  }

  function download(data, filename, mime){
    var name = String(filename || 'shosh-nail.txt');
    var type = mime || (typeof data === 'string' ? 'text/plain;charset=utf-8' : '');
    var b = body(), blob, url, a;
    if (!b || typeof Blob === 'undefined') return false;
    try {
      if (typeof Blob !== 'undefined' && data instanceof Blob) blob = data;
      else blob = new Blob([data === undefined || data === null ? '' : data], type ? { type: type } : undefined);
      url = URL.createObjectURL(blob);
      a = el('a', { href: url, download: name, rel: 'noopener', style: { display: 'none' } });
      b.appendChild(a);
      a.click();
      setTimeout(function(){
        try { if (a.parentNode) a.parentNode.removeChild(a); }
        catch (e){ /* ignore */ }
        try { URL.revokeObjectURL(url); }
        catch (e2){ /* ignore */ }
      }, 800);
      return true;
    } catch (e3){
      console.warn('[SN.UI] download failed', e3);
      return false;
    }
  }

  /* ==================================================================== */
  /* 10. misc                                                             */
  /* ==================================================================== */

  function debounce(fn, ms){
    var wait = typeof ms === 'number' && ms >= 0 ? ms : 200;
    var timer = null;
    if (typeof fn !== 'function'){
      var noop = function(){};
      noop.cancel = function(){};
      return noop;
    }
    function wrapped(){
      var ctx = this, args = arguments;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function(){
        timer = null;
        try { fn.apply(ctx, args); }
        catch (e){ console.warn('[SN.UI] debounced call failed', e); }
      }, wait);
    }
    wrapped.cancel = function(){
      if (timer){ clearTimeout(timer); timer = null; }
    };
    return wrapped;
  }

  /* ==================================================================== */
  /* 11. document-level wiring (installed once)                           */
  /* ==================================================================== */

  var docWired = false;

  function onDocClick(ev){
    var h;
    if (!menuOpen()) return;
    h = headerEl();
    if (h && ev.target && h.contains(ev.target)) return;
    setMenu(false);
  }

  function onDocKey(ev){
    var k = ev.key || '';
    var top;
    if (k !== 'Escape' && k !== 'Esc' && ev.keyCode !== 27) return;
    if (stack.length){
      top = stack[stack.length - 1];
      if (top && top.escape !== false){
        ev.stopPropagation();
        top.close();
      }
      return;
    }
    if (menuOpen()) setMenu(false, true);
  }

  var onResize = debounce(function(){
    if (menuOpen() && (window.innerWidth || 0) > 900) setMenu(false);
  }, 150);

  function wireDocument(){
    var d = doc();
    if (docWired || !d) return;
    docWired = true;
    d.addEventListener('click', onDocClick, false);
    d.addEventListener('keydown', onDocKey, false);
    if (window.addEventListener) window.addEventListener('resize', onResize, false);
  }

  /* ==================================================================== */
  /* 12. boot                                                             */
  /* ==================================================================== */

  var bootWired = false;

  function remount(){
    var d = doc(), active = d ? d.activeElement : null;
    var keepId = active && active.id && /^btn-(lang|theme|menu)$/.test(active.id) ? active.id : null;
    var btn;
    /* the owner can change the default theme in admin — respect it while the
       visitor has not picked one for themselves */
    if (!storedTheme()) applyTheme(resolveTheme());
    mountAnnounce();
    mountHeader(currentPage);
    mountFooter();
    applyI18n(d);
    if (keepId && d){
      btn = d.getElementById(keepId);
      if (btn){
        try { btn.focus({ preventScroll: true }); }
        catch (e){ try { btn.focus(); } catch (e2){ /* ignore */ } }
      }
    }
  }

  var remountSoon = debounce(remount, 80);

  /* iOS Safari refuses to apply :active until the document carries a touch
     listener, so every press state on the site is dead on an iPhone without
     this. One empty passive listener is the whole fix. */
  var touchUnlocked = false;
  function unlockTouchActive(){
    var d = doc();
    if (touchUnlocked || !d) return;
    touchUnlocked = true;
    try { d.addEventListener('touchstart', function(){}, { passive: true }); }
    catch (e) { try { d.addEventListener('touchstart', function(){}, false); } catch (e2) {} }
  }

  function boot(page){
    var d = doc();
    var p = page;
    if (!d) return;
    if (!has(PAGE_HREF, p)){
      p = (d.body && d.body.getAttribute('data-page')) || p || 'home';
    }
    currentPage = p;

    unlockTouchActive();
    applyTheme(themeGet());
    mountAnnounce();
    mountHeader(currentPage);
    mountFooter();
    applyI18n(d);
    wireDocument();

    if (!bootWired){
      bootWired = true;
      d.addEventListener('sn:lang', function(){ remount(); }, false);
      if (SN.Store && typeof SN.Store.subscribe === 'function'){
        try { SN.Store.subscribe(function(){ remountSoon(); }); }
        catch (e){ console.warn('[SN.UI] could not subscribe to the store', e); }
      }
      /* follow the OS only while the visitor has made no explicit choice */
      try {
        if (window.matchMedia){
          var mq = window.matchMedia('(prefers-color-scheme: dark)');
          var onScheme = function(){
            if (!storedTheme()) applyTheme(resolveTheme());
          };
          if (mq.addEventListener) mq.addEventListener('change', onScheme);
          else if (mq.addListener) mq.addListener(onScheme);
        }
      } catch (e2){ /* ignore */ }
    }
  }

  /* ==================================================================== */
  /* 13. export                                                           */
  /* ==================================================================== */

  var UI = {
    el: el,
    icon: icon,
    mountHeader: mountHeader,
    mountFooter: mountFooter,
    mountAnnounce: mountAnnounce,
    boot: boot,
    toast: toast,
    modal: modal,
    sheet: sheet,
    confirm: confirmBox,
    copy: copy,
    download: download,
    debounce: debounce,
    money: money,
    qs: qs,
    qsa: qsa,
    theme: {
      get: themeGet,
      set: themeSet,
      toggle: themeToggle
    }
  };

  /* Apply the theme immediately (before first paint of the page body) so a
     dark-mode visitor never sees a light flash while the page script loads. */
  if (doc()) applyTheme(themeGet());

  SN.UI = UI;
})();
