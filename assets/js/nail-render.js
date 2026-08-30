/* ==========================================================================
   Shosh Nail — assets/js/nail-render.js
   Owner: RENDER. The SVG nail engine (SPEC.md section 9).

   Pure SVG: no DOM dependency beyond document.createElementNS, no CSS
   variables (everything must survive being rasterised to PNG offline).
   Attaches exactly one property to the namespace: SN.Nail

   Coordinate contract for a single nail plate:
     the plate is drawn in a box (0,0)-(w,h)
       y = 0  -> the free edge (tip)
       y = h  -> the cuticle (always a smooth rounded arc)
     charm coordinates are normalised inside that box: x,y in 0..1
     ( x = 0 is the left side wall, y = 0 is the tip ).

   Randomness is ALWAYS seeded (mulberry32 over an FNV-1a string hash) so a
   glitter / marble / leopard nail looks identical on every re-render.
   Math.random() must never appear in this file.
   ========================================================================== */
(function () {
  'use strict';

  var SN = (window.SN = window.SN || {});

  var NS = 'http://www.w3.org/2000/svg';
  var XLINK = 'http://www.w3.org/1999/xlink';

  /* Emoji charms are rendered as <text>; this stack rasterises everywhere. */
  var EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",' +
                   '"Twemoji Mozilla","EmojiOne Color",system-ui,sans-serif';

  /* ====================================================================== */
  /* 1. Constants                                                            */
  /* ====================================================================== */

  var KEYS = [
    'rightThumb', 'rightIndex', 'rightMiddle', 'rightRing', 'rightPinky',
    'leftThumb', 'leftIndex', 'leftMiddle', 'leftRing', 'leftPinky'
  ];

  var FINGERS = [
    { key: 'thumb',  name: { ar: 'الإبهام', en: 'Thumb' } },
    { key: 'index',  name: { ar: 'السبابة', en: 'Index' } },
    { key: 'middle', name: { ar: 'الوسطى', en: 'Middle' } },
    { key: 'ring',   name: { ar: 'البنصر', en: 'Ring' } },
    { key: 'pinky',  name: { ar: 'الخنصر', en: 'Pinky' } }
  ];

  var HAND_NAME = {
    right: { ar: 'اليد اليمنى', en: 'Right hand' },
    left:  { ar: 'اليد اليسرى', en: 'Left hand' }
  };

  var SHAPES = ['almond', 'coffin', 'stiletto', 'square', 'squoval', 'round', 'oval', 'lipstick'];

  /* height / width of one plate, per shape, at length factor 1.
     A real press-on nail is clearly TALLER than it is wide — anything under
     ~1.3 immediately reads as an egg rather than a nail, so these are the
     single most load bearing numbers in the file. */
  var ASPECT = {
    almond: 1.62, coffin: 1.58, stiletto: 1.96, square: 1.40,
    squoval: 1.43, round: 1.36, oval: 1.52, lipstick: 1.50
  };

  /* fallbacks used only when SN.Store has nothing to say */
  var LEN_FALLBACK = { short: 0.72, medium: 1, long: 1.28, xlong: 1.6 };
  var FINISH_KINDS = ['gloss', 'matte', 'glitter', 'chrome', 'velvet', 'jelly'];

  var DEF = {
    skin: '#EFCDB6',
    skinShadow: '#D8AF95',
    color: '#E9C2C0',
    accent: '#FFFFFF',
    accent2: '#E8B4C8',
    finish: 'gloss',
    shape: 'almond',
    length: 'medium',
    sizes: { thumb: 2, index: 5, middle: 4, ring: 6, pinky: 8 }
  };

  /* The reference box used by SN.Nail.single() — the charm editor converts a
     pointer position into normalised x,y against exactly this box. It never
     changes with the chosen shape, so charms stay put when the shape does. */
  var NAIL_BOX = { w: 100, h: 150 };
  /* padding around that box inside single()'s viewBox */
  var BOX_PAD = { x: 22, y: 20, right: 22, bottom: 22 };

  var HAND_VIEW = { w: 300, h: 380 };

  /* Finger geometry, right hand, viewBox 0 0 300 380, thumb on the right
     (we are looking at the BACK of the hand, which is where the nails are).
       x, y   knuckle / base centre of the finger, on the knuckle line
       angle  degrees, 0 = straight up, positive splays towards +x
       width  width of the finger AT ITS BASE (it tapers towards the tip)
       length base -> fingertip
     Relative lengths matter more than absolute ones: middle longest, ring and
     index close behind, pinky clearly shortest and thinnest, thumb short and
     thick and coming off the SIDE of the palm.
     This is the one table to touch when the hand looks off. */
  var HAND_GEOM = {
    pinky:  { x: 84,  y: 248, angle: -14, width: 30, length: 101 },
    ring:   { x: 116, y: 231, angle: -6,  width: 34, length: 137 },
    middle: { x: 151, y: 223, angle: 0,   width: 36, length: 150 },
    index:  { x: 186, y: 232, angle: 8,   width: 35, length: 132 },
    thumb:  { x: 202, y: 294, angle: 40,  width: 44, length: 90 }
  };

  /* how far a finger capsule reaches back INTO the palm, in finger widths,
     so the two silhouettes fuse into one shape */
  var FINGER_ROOT = 1.5;
  /* the finger tip is this fraction of the base width */
  var FINGER_TAPER = 0.74;

  /* The palm: a slightly tapered rounded rectangle — clearly wider across the
     knuckles than at the wrist — with the thenar (thumb mound) bulging out on
     the thumb side. Same coordinate system as HAND_GEOM. */
  var PALM_D =
    'M65 254 ' +
    'C66 232 82 219 107 216 ' +      /* pinky-side knuckle corner  */
    'C142 212 180 214 207 227 ' +    /* across the knuckle line    */
    'C224 236 234 258 236 284 ' +    /* the thenar (thumb mound)   */
    'C238 310 226 336 204 346 ' +    /* in towards the wrist       */
    'C188 353 114 353 98 344 ' +     /* the heel of the hand       */
    'C78 333 65 298 65 254 Z';

  /* a wrist stub so the hand does not float */
  /* deliberately taller than the viewBox so it always runs off the bottom
     edge rather than ending in a visible rounded stub */
  var WRIST = { x: 98, y: 324, w: 104, h: 110, r: 22 };

  /* plate width as a fraction of the finger's BASE width, and how far the
     plate's cuticle sits back from the fingertip, in finger widths. Press-on
     nails are the dominant feature of a fingertip — keep these generous. */
  var PLATE_W = 0.84;
  var PLATE_BACK = 1.12;

  /* ====================================================================== */
  /* 2. Tiny helpers                                                         */
  /* ====================================================================== */

  var counter = 0;
  function uid(tag) { counter += 1; return 'sn-' + (tag || 'id') + '-' + counter.toString(36); }

  function num(v, d) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    return (typeof n === 'number' && isFinite(n)) ? n : d;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function f(v) {
    var n = Math.round(num(v, 0) * 100) / 100;
    if (n === 0) return '0';
    return String(n);
  }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function rad(deg) { return deg * Math.PI / 180; }

  /* ------------------------------------------------------------- elements */
  function E(name, attrs, kids) {
    var el = document.createElementNS(NS, name), k, v;
    if (attrs) {
      for (k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'xlink:href') el.setAttributeNS(XLINK, 'xlink:href', String(v));
        else el.setAttribute(k, String(v));
      }
    }
    if (kids) {
      if (!Array.isArray(kids)) kids = [kids];
      for (var i = 0; i < kids.length; i++) if (kids[i]) el.appendChild(kids[i]);
    }
    return el;
  }
  function add(parent, kid) { if (parent && kid) parent.appendChild(kid); return kid; }

  /* a small path builder — keeps every 'd' string readable and typo free */
  function pb() {
    var s = [];
    var api = {
      M: function (x, y) { s.push('M' + f(x) + ' ' + f(y)); return api; },
      L: function (x, y) { s.push('L' + f(x) + ' ' + f(y)); return api; },
      C: function (a, b, c, d, x, y) {
        s.push('C' + f(a) + ' ' + f(b) + ' ' + f(c) + ' ' + f(d) + ' ' + f(x) + ' ' + f(y));
        return api;
      },
      Q: function (a, b, x, y) { s.push('Q' + f(a) + ' ' + f(b) + ' ' + f(x) + ' ' + f(y)); return api; },
      A: function (rx, ry, rot, la, sw, x, y) {
        s.push('A' + f(rx) + ' ' + f(ry) + ' ' + rot + ' ' + la + ' ' + sw + ' ' + f(x) + ' ' + f(y));
        return api;
      },
      Z: function () { s.push('Z'); return api; },
      d: function () { return s.join(' '); }
    };
    return api;
  }

  /* --------------------------------------------------------- seeded random */
  function hash32(str) {
    var h = 2166136261, i;
    str = String(str);
    for (i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* rnd() -> 0..1 ; rnd.r(a,b) -> float ; rnd.i(a,b) -> int ; rnd.pick(arr) */
  function seeded(seed) {
    var r = mulberry32(hash32(seed));
    r.r = function (a, b) { return a + (b - a) * r(); };
    r.i = function (a, b) { return Math.floor(a + (b - a + 1) * r()); };
    r.pick = function (arr) { return (arr && arr.length) ? arr[Math.floor(r() * arr.length) % arr.length] : null; };
    return r;
  }

  /* --------------------------------------------------------------- colour */
  function parseHex(hex) {
    if (typeof hex !== 'string') return null;
    var h = hex.replace(/^#/, '').trim();
    if (/^[0-9a-fA-F]{3}$/.test(h)) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }
  /* uppercase everywhere, so a colour coming back out of here still matches
     the swatch hexes in the store by plain string comparison */
  function hex2(n) {
    var s = Math.round(clamp(n, 0, 255)).toString(16).toUpperCase();
    return s.length < 2 ? '0' + s : s;
  }
  function toHex(r, g, b) { return '#' + hex2(r) + hex2(g) + hex2(b); }
  /* any user value -> a safe hex string. Hex only on purpose: every colour
     that gets in here is later mixed / lightened / darkened. */
  function col(v, fallback) {
    var p = parseHex(v);
    return p ? toHex(p.r, p.g, p.b) : fallback;
  }
  function mix(a, b, t) {
    var A = parseHex(a), B = parseHex(b);
    if (!A || !B) return A ? toHex(A.r, A.g, A.b) : (B ? toHex(B.r, B.g, B.b) : '#000000');
    t = clamp(num(t, 0.5), 0, 1);
    return toHex(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t);
  }
  function lighten(c, t) { return mix(c, '#FFFFFF', t); }
  function darken(c, t) { return mix(c, '#1A0F14', t); }
  function lum(c) {
    var p = parseHex(c);
    if (!p) return 0.5;
    return (0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b) / 255;
  }
  function isDark(c) { return lum(c) < 0.45; }
  /* a colour that always reads against `c` */
  function against(c, amount) {
    amount = num(amount, 0.32);
    return isDark(c) ? lighten(c, amount + 0.18) : darken(c, amount);
  }

  /* ----------------------------------------------------------- SN.* bridges */
  function store() {
    return (SN.Store && typeof SN.Store.list === 'function') ? SN.Store : null;
  }
  function sList(key) {
    var s = store();
    if (!s) return [];
    try { var a = s.list(key); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function sFind(key, id) {
    var s = store();
    if (!s || id === null || id === undefined || id === '') return null;
    try { return s.find(key, id) || null; }
    catch (e) { return null; }
  }
  function pick(t) {
    if (SN.I18n && typeof SN.I18n.pick === 'function') {
      try { return SN.I18n.pick(t); } catch (e) { /* fall through */ }
    }
    if (typeof t === 'string') return t;
    if (isObj(t)) return t.ar || t.en || '';
    return '';
  }
  function tr(key, fallback) {
    if (SN.I18n && typeof SN.I18n.t === 'function') {
      try {
        var v = SN.I18n.t(key);
        if (v && v !== key) return v;
      } catch (e) { /* fall through */ }
    }
    return fallback;
  }

  /* ====================================================================== */
  /* 3. Coercion — nothing in this file may throw on partial data            */
  /* ====================================================================== */

  function shapeId(v) {
    v = typeof v === 'string' ? v : '';
    for (var i = 0; i < SHAPES.length; i++) if (SHAPES[i] === v) return v;
    return DEF.shape;
  }

  function lenFactor(v) {
    if (typeof v === 'number' && isFinite(v) && v > 0) return clamp(v, 0.4, 2.4);
    var it = sFind('lengths', v);
    if (it && num(it.factor, 0) > 0) return clamp(num(it.factor, 1), 0.4, 2.4);
    if (typeof v === 'string' && LEN_FALLBACK[v]) return LEN_FALLBACK[v];
    return 1;
  }

  function finishKind(v) {
    if (typeof v === 'string') {
      for (var i = 0; i < FINISH_KINDS.length; i++) if (FINISH_KINDS[i] === v) return v;
      var it = sFind('finishes', v);
      if (it && typeof it.kind === 'string') {
        for (var j = 0; j < FINISH_KINDS.length; j++) if (FINISH_KINDS[j] === it.kind) return it.kind;
      }
    }
    return DEF.finish;
  }

  function normCharm(c) {
    if (!isObj(c)) return null;
    return {
      id: typeof c.id === 'string' ? c.id : '',
      x: clamp(num(c.x, 0.5), -0.4, 1.4),
      y: clamp(num(c.y, 0.35), -0.4, 1.4),
      s: clamp(num(c.s, 1), 0.25, 4),
      r: clamp(num(c.r, 0), -360, 360)
    };
  }

  function normNail(n) {
    n = isObj(n) ? n : {};
    var p = isObj(n.pattern) ? n.pattern : {};
    var charms = [], i, c;
    if (Array.isArray(n.charms)) {
      for (i = 0; i < n.charms.length; i++) {
        c = normCharm(n.charms[i]);
        if (c) charms.push(c);
      }
    }
    return {
      color: col(n.color, DEF.color),
      finish: typeof n.finish === 'string' ? n.finish : DEF.finish,
      pattern: {
        kind: typeof p.kind === 'string' ? p.kind : 'none',
        color: col(p.color, DEF.accent),
        color2: col(p.color2, DEF.accent2),
        scale: clamp(num(p.scale, 1), 0.6, 1.6)
      },
      charms: charms
    };
  }

  function normSizes(s) {
    var out = {}, i, k, base = DEF.sizes;
    s = isObj(s) ? s : {};
    for (i = 0; i < KEYS.length; i++) {
      k = KEYS[i];
      out[k] = clamp(Math.round(num(s[k], base[fingerOf(k)])), 0, 11);
    }
    return out;
  }

  function fingerOf(key) {
    var s = String(key || '');
    var f2 = s.indexOf('left') === 0 ? s.slice(4) : (s.indexOf('right') === 0 ? s.slice(5) : s);
    f2 = f2.charAt(0).toLowerCase() + f2.slice(1);
    for (var i = 0; i < FINGERS.length; i++) if (FINGERS[i].key === f2) return f2;
    return 'index';
  }
  function sideOf(key) { return String(key || '').indexOf('left') === 0 ? 'left' : 'right'; }

  function normDesign(d) {
    d = isObj(d) ? d : {};
    var nails = {}, i, k;
    var src = isObj(d.nails) ? d.nails : {};
    for (i = 0; i < KEYS.length; i++) {
      k = KEYS[i];
      nails[k] = normNail(src[k]);
    }
    return {
      v: 1,
      skin: col(d.skin, DEF.skin),
      shape: shapeId(d.shape),
      length: (typeof d.length === 'string' || typeof d.length === 'number') ? d.length : DEF.length,
      hand: (d.hand === 'right' || d.hand === 'left') ? d.hand : 'both',
      measure: typeof d.measure === 'string' ? d.measure : 'preset',
      sizes: normSizes(d.sizes),
      nails: nails,
      qty: Math.max(1, Math.round(num(d.qty, 1))),
      express: !!d.express,
      giftWrap: !!d.giftWrap,
      notes: typeof d.notes === 'string' ? d.notes : ''
    };
  }

  /* the darker edge that belongs to a skin tone (from the store when known) */
  function skinShadow(hex) {
    var list = sList('skinTones'), i;
    for (i = 0; i < list.length; i++) {
      if (isObj(list[i]) && col(list[i].hex, '') === hex && parseHex(list[i].shadow)) {
        return col(list[i].shadow, DEF.skinShadow);
      }
    }
    return darken(hex, 0.18);
  }

  /* opts.selected may be an array of keys or a {key:true} map */
  function selection(sel) {
    var map = {}, i;
    if (Array.isArray(sel)) {
      for (i = 0; i < sel.length; i++) map[String(sel[i])] = true;
    } else if (isObj(sel)) {
      for (i in sel) if (Object.prototype.hasOwnProperty.call(sel, i) && sel[i]) map[i] = true;
    } else if (typeof sel === 'string' && sel) {
      map[sel] = true;
    }
    return map;
  }

  function nailLabel(key) {
    var side = sideOf(key), fk = fingerOf(key), i, name = fk;
    for (i = 0; i < FINGERS.length; i++) if (FINGERS[i].key === fk) name = pick(FINGERS[i].name) || fk;
    return tr('a11y.selectNail', 'Select nail') + ': ' + name + ' — ' + pick(HAND_NAME[side]);
  }

  /* ====================================================================== */
  /* 4. Shapes — SN.Nail.path(shapeId, w, h)                                 */
  /*                                                                         */
  /*    Every silhouette is walked the same way:                             */
  /*      left cuticle corner -> up the left wall -> across the tip ->       */
  /*      down the right wall -> right cuticle corner -> cuticle arc -> Z    */
  /*    Only the tip segment differs, so all eight shapes share one          */
  /*    believable cuticle and the same side flare.                          */
  /* ====================================================================== */

  /* The plate is widest at WIDE_Y (a fraction of h, measured from the tip).
     Real nails are widest just above the cuticle and then run parallel or
     taper slightly IN toward the tip — they never barrel out. */
  var WIDE_Y = 0.74;
  /* how far the cuticle arc dips below its corners, as a fraction of h.
     A cuticle line is a shallow, wide arc — almost flat. */
  var CUTICLE_DIP = 0.035;
  /* where the side walls meet the cuticle corners. The cuticle line is a
     little narrower than the widest point, which is what gives a nail its
     rounded shoulders instead of a chopped-off bottom. */
  var CUTICLE_X = 0.150;

  /* A side wall: a cubic from the current point to (x1,y1) that is straight
     to the eye. `bow` (in user units, signed on x) lets a wall bulge a hair
     outward so the silhouette never looks mechanically ruled. */
  function wall(p, x0, y0, x1, y1, bow) {
    var dx = x1 - x0, dy = y1 - y0;
    bow = bow || 0;
    p.C(x0 + dx * 0.32 + bow, y0 + dy * 0.34,
        x0 + dx * 0.70 + bow * 0.75, y0 + dy * 0.70,
        x1, y1);
  }

  /* Draws the outline from the left widest point (0, yW) across the tip and
     back down to the right widest point (w, yW). */
  function tipSegment(p, s, w, h, yW) {
    var xl, xr, r, rx, ry, bw;

    if (s === 'square') {
      /* dead straight, near vertical sidewalls + a flat free edge */
      xl = w * 0.030; xr = w - xl;
      r = w * 0.055;
      wall(p, 0, yW, xl, r, -w * 0.002);
      p.Q(xl, 0, xl + r, 0);
      p.L(xr - r, 0);
      p.Q(xr, 0, xr, r);
      wall(p, xr, r, w, yW, w * 0.002);
      return;
    }

    if (s === 'squoval') {
      /* same straight walls, generously softened corners */
      xl = w * 0.035; xr = w - xl;
      r = w * 0.290;
      wall(p, 0, yW, xl, r, -w * 0.003);
      p.C(xl, r * 0.42, xl + r * 0.42, 0, xl + r, 0);
      p.L(xr - r, 0);
      p.C(xr - r * 0.42, 0, xr, r * 0.42, xr, r);
      wall(p, xr, r, w, yW, w * 0.003);
      return;
    }

    if (s === 'round') {
      /* parallel walls, then a true semicircle — this is what separates
         'round' from 'oval' at a glance */
      xl = w * 0.022; xr = w - xl;
      rx = (xr - xl) / 2;
      ry = rx;
      wall(p, 0, yW, xl, ry, -w * 0.002);
      p.A(rx, ry, 0, 0, 1, xr, ry);
      wall(p, xr, ry, w, yW, w * 0.002);
      return;
    }

    if (s === 'oval') {
      /* one continuous curve from the widest point to the tip — there is no
         straight section anywhere, and the tip is narrower than round's */
      xl = w * 0.045; xr = w - xl;
      rx = (xr - xl) / 2;
      ry = h * 0.455;
      wall(p, 0, yW, xl, ry, -w * 0.004);
      p.A(rx, ry, 0, 0, 1, xr, ry);
      wall(p, xr, ry, w, yW, w * 0.004);
      return;
    }

    if (s === 'coffin') {
      /* ballerina: straight sidewalls for two thirds, taper only in the top
         third, ending on a flat tip ~57% of the base width */
      bw = 0.55;
      xl = w * (1 - bw) / 2; xr = w - xl;
      r = w * 0.05;
      wall(p, 0, yW, w * 0.028, h * 0.365, -w * 0.001);   /* straight wall */
      wall(p, w * 0.028, h * 0.365, xl, r, 0);            /* the taper */
      p.Q(xl, 0, xl + r, 0);
      p.L(xr - r, 0);
      p.Q(xr, 0, xr, r);
      wall(p, xr, r, w - w * 0.028, h * 0.365, 0);
      wall(p, w - w * 0.028, h * 0.365, w, yW, w * 0.001);
      return;
    }

    if (s === 'stiletto') {
      /* long, nearly straight walls converging on a sharp point */
      wall(p, 0, yW, w * 0.275, h * 0.215, -w * 0.008);
      p.C(w * 0.365, h * 0.115, w * 0.455, h * 0.042, w * 0.5, 0);
      p.C(w * 0.545, h * 0.042, w * 0.635, h * 0.115, w * 0.725, h * 0.215);
      wall(p, w * 0.725, h * 0.215, w, yW, w * 0.008);
      return;
    }

    if (s === 'lipstick') {
      /* a clean straight diagonal slice: one wall runs almost to the top,
         the other stops low, and a ruled line joins them */
      wall(p, 0, yW, w * 0.035, h * 0.145, -w * 0.003);
      p.C(w * 0.035, h * 0.055, w * 0.10, h * 0.012, w * 0.195, h * 0.032);
      p.L(w * 0.845, h * 0.352);                          /* the slice */
      p.C(w * 0.945, h * 0.40, w * 0.985, h * 0.455, w * 0.99, h * 0.545);
      wall(p, w * 0.99, h * 0.545, w, yW, w * 0.002);
      return;
    }

    /* almond (and the fallback for anything unknown): straight tapered walls
       resolving into a soft, narrow point */
    wall(p, 0, yW, w * 0.150, h * 0.300, -w * 0.010);
    p.C(w * 0.225, h * 0.150, w * 0.355, h * 0.040, w * 0.450, h * 0.011);
    p.Q(w * 0.5, h * -0.006, w * 0.550, h * 0.011);
    p.C(w * 0.645, h * 0.040, w * 0.775, h * 0.150, w * 0.850, h * 0.300);
    wall(p, w * 0.850, h * 0.300, w, yW, w * 0.010);
  }

  function path(shape, w, h) {
    var s = shapeId(shape);
    w = num(w, NAIL_BOX.w);
    h = num(h, 0);
    if (!(w > 0)) w = NAIL_BOX.w;
    if (!(h > 0)) h = w * ASPECT[s];

    var yW = h * WIDE_Y;                       /* widest point, near the cuticle */
    var dip = h * CUTICLE_DIP;                 /* how deep the cuticle arc sinks */
    var clx = w * CUTICLE_X, crx = w - clx;
    var cy = h - dip;                          /* the cuticle corners */
    /* control y that puts the middle of the arc exactly `dip` lower */
    var ccy = cy + dip * 1.334;
    var p = pb();

    p.M(clx, cy);
    /* left cuticle corner rolling out to the widest point */
    p.C(w * 0.045, cy - dip * 0.12, 0, h * 0.865, 0, yW);
    tipSegment(p, s, w, h, yW);
    /* right widest point rolling back into the cuticle corner */
    p.C(w, h * 0.865, w - w * 0.045, cy - dip * 0.12, crx, cy);
    /* the cuticle: a shallow, wide arc — never a dome */
    p.C(crx - (crx - clx) * 0.27, ccy, clx + (crx - clx) * 0.27, ccy, clx, cy);
    p.Z();
    return p.d();
  }

  /* ====================================================================== */
  /* 5. Paint helpers (gradients / filters, all with unique ids)             */
  /* ====================================================================== */

  function grad(defs, type, stops, attrs) {
    var id = uid(type === 'radialGradient' ? 'rg' : 'lg');
    var a = attrs || {}, i, s;
    a.id = id;
    var el = E(type, a);
    for (i = 0; i < stops.length; i++) {
      s = stops[i];
      el.appendChild(E('stop', {
        offset: f(s[0] * 100) + '%',
        'stop-color': s[1],
        'stop-opacity': f(s.length > 2 ? s[2] : 1)
      }));
    }
    add(defs, el);
    return 'url(#' + id + ')';
  }
  function linGrad(defs, stops, a) { return grad(defs, 'linearGradient', stops, a || { x1: 0, y1: 0, x2: 0, y2: 1 }); }
  function radGrad(defs, stops, a) { return grad(defs, 'radialGradient', stops, a || { cx: 0.5, cy: 0.5, r: 0.6 }); }

  function blurF(defs, std) {
    var id = uid('bl');
    add(defs, E('filter', {
      id: id, x: '-45%', y: '-45%', width: '190%', height: '190%',
      'color-interpolation-filters': 'sRGB'
    }, [E('feGaussianBlur', { stdDeviation: f(Math.max(0.01, std)) })]));
    return 'url(#' + id + ')';
  }

  function rect(x, y, w, h, attrs) {
    var a = attrs || {};
    a.x = f(x); a.y = f(y); a.width = f(w); a.height = f(h);
    return E('rect', a);
  }

  /* ====================================================================== */
  /* 6. Patterns (SPEC section 8). Each one paints inside the clipped plate  */
  /*    box (0,0)-(w,h) using ctx:                                           */
  /*      w,h  plate box      u    1/100 of the plate width (a scale unit)   */
  /*      c1   pattern.color  c2   pattern.color2                            */
  /*      S    pattern.scale 0.6..1.6 (motif size / tip depth)               */
  /*      rnd  seeded PRNG    defs <defs> to hang gradients & filters on     */
  /* ====================================================================== */

  var PATTERNS = {};

  PATTERNS.french = function (g, x) {
    var d = x.h * 0.20 * x.S;
    var p = pb();
    p.M(-x.w * 0.25, d * 0.52)
      .C(x.w * 0.24, d * 1.36, x.w * 0.76, d * 1.36, x.w * 1.25, d * 0.52)
      .L(x.w * 1.25, -x.h * 0.2).L(-x.w * 0.25, -x.h * 0.2).Z();
    add(g, E('path', { d: p.d(), fill: x.c1 }));
    add(g, E('path', {
      d: pb().M(-x.w * 0.25, d * 0.52)
        .C(x.w * 0.24, d * 1.36, x.w * 0.76, d * 1.36, x.w * 1.25, d * 0.52).d(),
      fill: 'none', stroke: lighten(x.c1, 0.45), 'stroke-width': f(x.u * 0.7), opacity: 0.5
    }));
  };

  PATTERNS.frenchDeep = function (g, x) {
    var d = x.h * 0.36 * x.S;
    var p = pb();
    p.M(-x.w * 0.25, d * 0.28)
      .C(x.w * 0.26, d * 1.16, x.w * 0.62, d * 1.30, x.w * 1.25, d * 0.70)
      .L(x.w * 1.25, -x.h * 0.2).L(-x.w * 0.25, -x.h * 0.2).Z();
    add(g, E('path', { d: p.d(), fill: x.c1 }));
    add(g, E('path', {
      d: pb().M(-x.w * 0.25, d * 0.28)
        .C(x.w * 0.26, d * 1.16, x.w * 0.62, d * 1.30, x.w * 1.25, d * 0.70).d(),
      fill: 'none', stroke: x.c2, 'stroke-width': f(x.u * 1.1), opacity: 0.55
    }));
  };

  PATTERNS.tipsGlitter = function (g, x) {
    var depth = x.h * 0.44 * x.S, i, t, r, op;
    add(g, rect(-1, -1, x.w + 2, depth + 1, {
      fill: linGrad(x.defs, [[0, x.c1, 0.6], [0.65, x.c1, 0.18], [1, x.c1, 0]], { x1: 0, y1: 0, x2: 0, y2: 1 })
    }));
    for (i = 0; i < 110; i++) {
      t = x.rnd(); t = t * t;
      r = x.rnd.r(0.35, 1.9) * x.u;
      op = clamp(x.rnd.r(0.3, 1) * (1 - t * 0.55), 0.05, 1);
      add(g, E('circle', {
        cx: f(x.rnd() * x.w), cy: f(t * depth * 1.1), r: f(r),
        fill: x.rnd() < 0.5 ? '#FFFFFF' : (x.rnd() < 0.55 ? x.c1 : x.c2),
        opacity: f(op)
      }));
    }
  };

  PATTERNS.ombre = function (g, x) {
    var mid = clamp(0.5 * (2 - x.S), 0.16, 0.84);
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      opacity: 0.96,
      fill: linGrad(x.defs, [[0, x.c1], [mid, mix(x.c1, x.c2, 0.5)], [1, x.c2]], { x1: 0, y1: 0, x2: 0, y2: 1 })
    }));
  };

  PATTERNS.ombreV = function (g, x) {
    var mid = clamp(0.5 * (2 - x.S), 0.16, 0.84);
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      opacity: 0.96,
      fill: linGrad(x.defs, [[0, x.c1], [mid, mix(x.c1, x.c2, 0.5)], [1, x.c2]], { x1: 0, y1: 0, x2: 1, y2: 0 })
    }));
  };

  PATTERNS.half = function (g, x) {
    var y = clamp(0.5 * x.S, 0.18, 0.84) * x.h;
    add(g, rect(-1, -1, x.w + 2, y + 1, { fill: x.c2 }));
    add(g, rect(-1, y - x.u * 0.6, x.w + 2, x.u * 1.2, { fill: x.c1, opacity: 0.75 }));
  };

  PATTERNS.diagonal = function (g, x) {
    var y0 = clamp(0.62 * x.S, 0.2, 0.95) * x.h;
    var y1 = clamp(0.20 * x.S, 0.04, 0.6) * x.h;
    add(g, E('path', {
      d: pb().M(-2, y0).L(x.w + 2, y1).L(x.w + 2, -2).L(-2, -2).Z().d(),
      fill: x.c1
    }));
    add(g, E('path', {
      d: pb().M(-2, y0).L(x.w + 2, y1).d(),
      fill: 'none', stroke: x.c2, 'stroke-width': f(x.u * 1.3), opacity: 0.8
    }));
  };

  PATTERNS.dots = function (g, x) {
    var cell = x.w * 0.28 * x.S, row = 0, cx, cy, r;
    for (cy = -cell * 0.3; cy < x.h + cell; cy += cell * 0.9) {
      for (cx = (row % 2 ? cell * 0.5 : 0) - cell * 0.2; cx < x.w + cell; cx += cell) {
        r = cell * 0.19 * x.rnd.r(0.82, 1.16);
        add(g, E('circle', {
          cx: f(cx + x.rnd.r(-1, 1) * cell * 0.10),
          cy: f(cy + x.rnd.r(-1, 1) * cell * 0.10),
          r: f(r),
          fill: x.rnd() < 0.74 ? x.c1 : x.c2,
          opacity: f(x.rnd.r(0.82, 1))
        }));
      }
      row++;
    }
  };

  PATTERNS.stripes = function (g, x) {
    var gap = x.w * 0.20 * x.S, sw = gap * 0.30, cx;
    for (cx = gap * 0.42; cx < x.w + gap; cx += gap) {
      add(g, rect(cx - sw / 2, -2, sw, x.h + 4, { fill: x.c1, opacity: 0.95 }));
      add(g, rect(cx + gap * 0.5 - sw * 0.2, -2, sw * 0.4, x.h + 4, { fill: x.c2, opacity: 0.85 }));
    }
  };

  PATTERNS.chevron = function (g, x) {
    var step = x.h * 0.18 * x.S, dep = step * 0.8, i, y, n = Math.ceil((x.h * 1.1) / step) + 1;
    for (i = 0; i < n; i++) {
      y = x.h * 0.10 + i * step;
      add(g, E('path', {
        d: pb().M(-3, y).L(x.w / 2, y - dep).L(x.w + 3, y).d(),
        fill: 'none',
        stroke: i % 2 ? x.c2 : x.c1,
        'stroke-width': f(step * 0.24),
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        opacity: 0.95
      }));
    }
  };

  PATTERNS.marble = function (g, x) {
    var soft = blurF(x.defs, x.u * 2.6);
    var fine = blurF(x.defs, x.u * 0.55);
    var i, j, p, px, py, dx;

    add(g, rect(-1, -1, x.w + 2, x.h + 2, { fill: x.c2, opacity: 0.16 }));
    for (i = 0; i < 3; i++) {
      add(g, E('ellipse', {
        cx: f(x.rnd() * x.w), cy: f(x.rnd() * x.h),
        rx: f(x.w * x.rnd.r(0.34, 0.62) * x.S),
        ry: f(x.h * x.rnd.r(0.18, 0.34) * x.S),
        fill: i === 1 ? lighten(x.c2, 0.35) : x.c2,
        opacity: f(x.rnd.r(0.3, 0.55)), filter: soft
      }));
    }
    for (i = 0; i < 4; i++) {
      p = pb();
      px = x.rnd.r(-0.1, 1.1) * x.w;
      p.M(px, -3);
      py = -3;
      for (j = 0; j < 4; j++) {
        dx = x.rnd.r(-0.26, 0.26) * x.w;
        p.Q(px + dx, py + x.h * 0.16, px + dx * 0.6, py + x.h * 0.31);
        px += dx * 0.6;
        py += x.h * 0.31;
      }
      add(g, E('path', {
        d: p.d(), fill: 'none', stroke: x.c1,
        'stroke-width': f(x.u * (1.7 - i * 0.28) * x.S),
        'stroke-linecap': 'round', opacity: f(0.85 - i * 0.12), filter: fine
      }));
    }
  };

  PATTERNS.chrome = function (g, x) {
    var gid = linGrad(x.defs, [
      [0, darken(x.c2, 0.28)],
      [0.14, lighten(x.c1, 0.5)],
      [0.3, x.c1],
      [0.44, '#FFFFFF'],
      [0.56, x.c1],
      [0.7, x.c2],
      [0.86, darken(x.c2, 0.34)],
      [1, lighten(x.c1, 0.42)]
    ], { x1: 0.05, y1: 0, x2: 0.95, y2: 1 });
    add(g, rect(-1, -1, x.w + 2, x.h + 2, { fill: gid, opacity: 0.94 }));
    add(g, E('ellipse', {
      cx: f(x.w * 0.34), cy: f(x.h * 0.42),
      rx: f(x.w * 0.10 * x.S), ry: f(x.h * 0.42),
      fill: '#FFFFFF', opacity: 0.5,
      transform: 'rotate(-18 ' + f(x.w * 0.34) + ' ' + f(x.h * 0.42) + ')',
      filter: blurF(x.defs, x.u * 1.6)
    }));
  };

  PATTERNS.glazed = function (g, x) {
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: radGrad(x.defs, [
        [0, '#FFFFFF', 0.75], [0.4, x.c1, 0.45], [0.72, x.c2, 0.32], [1, x.c2, 0]
      ], { cx: 0.38, cy: 0.26, r: 0.9 })
    }));
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      opacity: f(0.42 * x.S),
      fill: linGrad(x.defs, [
        [0, mix(x.c1, '#FFD9EC', 0.55), 0.55],
        [0.34, mix(x.c2, '#D8ECFF', 0.5), 0.5],
        [0.66, mix(x.c1, '#DFFBEA', 0.45), 0.45],
        [1, mix(x.c2, '#FFF1CE', 0.5), 0.55]
      ], { x1: 0, y1: 1, x2: 1, y2: 0 })
    }));
  };

  PATTERNS.leopard = function (g, x) {
    /* a jittered grid, not pure noise — a real leopard print covers evenly */
    var cell = x.w * 0.42 * x.S, sp, cx, cy, ang, row = 0, gx, gy;
    for (gy = -cell * 0.2; gy < x.h + cell * 0.4; gy += cell * 0.86) {
      for (gx = (row % 2 ? cell * 0.5 : 0) - cell * 0.15; gx < x.w + cell * 0.4; gx += cell) {
        sp = x.w * 0.21 * x.S * x.rnd.r(0.78, 1.2);
        cx = gx + x.rnd.r(-1, 1) * cell * 0.16;
        cy = gy + x.rnd.r(-1, 1) * cell * 0.16;
        ang = x.rnd.r(-70, 70);
        add(g, E('ellipse', {
          cx: f(cx), cy: f(cy), rx: f(sp * 0.52), ry: f(sp * 0.40),
          fill: 'none', stroke: x.c1, 'stroke-width': f(sp * 0.21),
          'stroke-dasharray': f(sp * 0.85) + ' ' + f(sp * 0.52),
          'stroke-linecap': 'round',
          transform: 'rotate(' + f(ang) + ' ' + f(cx) + ' ' + f(cy) + ')',
          opacity: 0.92
        }));
        add(g, E('ellipse', {
          cx: f(cx + sp * 0.03), cy: f(cy - sp * 0.02),
          rx: f(sp * 0.25), ry: f(sp * 0.18),
          fill: x.c2, opacity: 0.95,
          transform: 'rotate(' + f(ang) + ' ' + f(cx) + ' ' + f(cy) + ')'
        }));
      }
      row++;
    }
  };

  PATTERNS.checkers = function (g, x) {
    var cell = x.w * 0.24 * x.S, r = 0, c, cy, cx;
    for (cy = -cell; cy < x.h + cell; cy += cell) {
      c = 0;
      for (cx = -cell; cx < x.w + cell; cx += cell) {
        add(g, rect(cx, cy, cell + 0.4, cell + 0.4, {
          fill: (r + c) % 2 ? x.c2 : x.c1, opacity: 0.95
        }));
        c++;
      }
      r++;
    }
  };

  function heartPath(cx, cy, s) {
    return pb()
      .M(cx, cy + s * 0.36)
      .C(cx - s * 0.60, cy - s * 0.08, cx - s * 0.44, cy - s * 0.66, cx, cy - s * 0.26)
      .C(cx + s * 0.44, cy - s * 0.66, cx + s * 0.60, cy - s * 0.08, cx, cy + s * 0.36)
      .Z().d();
  }

  function starPath(cx, cy, r, points, innerRatio) {
    var p = pb(), i, a, rr;
    points = points || 5;
    innerRatio = num(innerRatio, 0.42);
    for (i = 0; i < points * 2; i++) {
      a = rad(-90 + (180 / points) * i);
      rr = i % 2 ? r * innerRatio : r;
      if (i === 0) p.M(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      else p.L(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    return p.Z().d();
  }

  function motifs(g, x, draw) {
    var cell = x.w * 0.34 * x.S, row = 0, cx, cy, jx, jy;
    for (cy = -cell * 0.15; cy < x.h + cell * 0.6; cy += cell * 0.92) {
      for (cx = (row % 2 ? cell * 0.5 : 0) - cell * 0.1; cx < x.w + cell * 0.5; cx += cell) {
        jx = cx + x.rnd.r(-1, 1) * cell * 0.12;
        jy = cy + x.rnd.r(-1, 1) * cell * 0.12;
        draw(jx, jy, cell * x.rnd.r(0.68, 0.92), x.rnd.r(-22, 22), x.rnd() < 0.74 ? x.c1 : x.c2);
      }
      row++;
    }
  }

  PATTERNS.hearts = function (g, x) {
    motifs(g, x, function (cx, cy, s, ang, fill) {
      add(g, E('path', {
        d: heartPath(cx, cy, s * 0.78), fill: fill, opacity: 0.95,
        transform: 'rotate(' + f(ang) + ' ' + f(cx) + ' ' + f(cy) + ')'
      }));
    });
  };

  PATTERNS.stars = function (g, x) {
    motifs(g, x, function (cx, cy, s, ang, fill) {
      add(g, E('path', {
        d: starPath(cx, cy, s * 0.44, 5, 0.42), fill: fill, opacity: 0.95,
        transform: 'rotate(' + f(ang) + ' ' + f(cx) + ' ' + f(cy) + ')'
      }));
    });
  };

  PATTERNS.flames = function (g, x) {
    /* tongues licking up from the cuticle towards the tip */
    function fy(t) { return x.h * (1 - (1 - t) * x.S); }
    function tongues(shrink) {
      var p = pb(), k = shrink;
      function y(t) { return x.h - (x.h - fy(t)) * k; }
      p.M(-3, x.h + 4).L(-3, y(0.64));
      p.C(x.w * 0.05, y(0.52), x.w * 0.09, y(0.44), x.w * 0.16, y(0.28));
      p.C(x.w * 0.20, y(0.44), x.w * 0.24, y(0.54), x.w * 0.31, y(0.58));
      p.C(x.w * 0.37, y(0.46), x.w * 0.41, y(0.28), x.w * 0.47, y(0.12));
      p.C(x.w * 0.53, y(0.30), x.w * 0.57, y(0.48), x.w * 0.63, y(0.56));
      p.C(x.w * 0.71, y(0.46), x.w * 0.77, y(0.32), x.w * 0.85, y(0.22));
      p.C(x.w * 0.91, y(0.38), x.w * 0.97, y(0.52), x.w + 3, y(0.60));
      p.L(x.w + 3, x.h + 4).Z();
      return p.d();
    }
    add(g, E('path', { d: tongues(1), fill: x.c2, opacity: 0.95 }));
    add(g, E('path', { d: tongues(0.58), fill: x.c1, opacity: 0.95 }));
  };

  PATTERNS.lace = function (g, x) {
    var i, y, sc, cx, p;
    /* fine dotted arcs hugging the cuticle */
    for (i = 0; i < 4; i++) {
      y = x.h * 0.90 - i * (x.h * 0.085 * x.S);
      add(g, E('path', {
        d: pb().M(-x.w * 0.1, y)
          .C(x.w * 0.26, y - x.h * 0.09, x.w * 0.74, y - x.h * 0.09, x.w * 1.1, y).d(),
        fill: 'none',
        stroke: i % 2 ? x.c2 : x.c1,
        'stroke-width': f(x.u * (i === 0 ? 1.6 : 1) * x.S),
        'stroke-linecap': 'round',
        'stroke-dasharray': i === 0 ? null : f(x.u * 0.2) + ' ' + f(x.u * 3.4 * x.S),
        opacity: 0.9
      }));
    }
    /* a scalloped edge, the way real lace finishes */
    sc = x.w * 0.16 * x.S;
    y = x.h * 0.90 - 4 * (x.h * 0.085 * x.S);
    p = pb().M(-x.w * 0.1, y + sc * 0.3);
    for (cx = -x.w * 0.1; cx < x.w * 1.1; cx += sc) {
      p.A(sc * 0.5, sc * 0.5, 0, 0, 1, cx + sc, y + sc * 0.3);
    }
    add(g, E('path', {
      d: p.d(), fill: 'none', stroke: x.c1,
      'stroke-width': f(x.u * 0.9 * x.S), opacity: 0.85
    }));
    for (i = 0; i < 14; i++) {
      add(g, E('circle', {
        cx: f(x.rnd() * x.w), cy: f(x.h * x.rnd.r(0.45, 0.95)),
        r: f(x.u * x.rnd.r(0.4, 1.1) * x.S),
        fill: x.c1, opacity: f(x.rnd.r(0.4, 0.9))
      }));
    }
  };

  PATTERNS.catEye = function (g, x) {
    var band = pb()
      .M(-4, x.h * 0.76)
      .C(x.w * 0.30, x.h * 0.60, x.w * 0.66, x.h * 0.44, x.w + 4, x.h * 0.20).d();
    var soft = blurF(x.defs, x.u * 3.4);
    var tight = blurF(x.defs, x.u * 1.1);

    add(g, rect(-1, -1, x.w + 2, x.h + 2, { fill: x.c2, opacity: 0.8 }));
    add(g, E('path', {
      d: band, fill: 'none', stroke: darken(x.c2, 0.45),
      'stroke-width': f(x.w * 0.62), opacity: 0.75, filter: soft
    }));
    add(g, E('path', {
      d: band, fill: 'none', stroke: x.c1,
      'stroke-width': f(x.w * 0.26 * x.S), opacity: 0.85, filter: tight
    }));
    add(g, E('path', {
      d: band, fill: 'none', stroke: lighten(x.c1, 0.62),
      'stroke-width': f(x.w * 0.075 * x.S), opacity: 0.95, filter: blurF(x.defs, x.u * 0.5)
    }));
  };

  PATTERNS.aura = function (g, x) {
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: radGrad(x.defs, [
        [0, x.c1, 0.95], [0.34, x.c1, 0.6], [0.62, x.c2, 0.42], [1, x.c2, 0]
      ], { cx: 0.5, cy: 0.42, r: f(0.42 * x.S) }),
      filter: blurF(x.defs, x.u * 2.2)
    }));
  };

  /* ====================================================================== */
  /* 7. Finishes                                                             */
  /*    ctx: w,h,u, d (the plate path), color (the nail colour), defs, rnd    */
  /* ====================================================================== */

  var FINISHES = {};

  FINISHES.gloss = function (g, x) {
    var blob = radGrad(x.defs, [[0, '#FFFFFF', 0.9], [0.5, '#FFFFFF', 0.42], [1, '#FFFFFF', 0]]);
    var spark = radGrad(x.defs, [[0, '#FFFFFF', 0.75], [1, '#FFFFFF', 0]]);
    /* the highlight is a light source, not a stretched copy of the plate:
       cap its height against the WIDTH so a long stiletto does not grow a
       highlight the whole length of the nail */
    var by = Math.min(x.h * 0.31, x.w * 0.42);
    var br = Math.min(x.h * 0.19, x.w * 0.27);
    add(g, E('ellipse', {
      cx: f(x.w * 0.33), cy: f(by),
      rx: f(x.w * 0.19), ry: f(br), fill: blob,
      transform: 'rotate(-18 ' + f(x.w * 0.33) + ' ' + f(by) + ')'
    }));
    add(g, E('ellipse', {
      cx: f(x.w * 0.63), cy: f(Math.min(x.h * 0.13, x.w * 0.18)),
      rx: f(x.w * 0.12), ry: f(Math.min(x.h * 0.05, x.w * 0.07)), fill: spark, opacity: 0.7,
      transform: 'rotate(-24 ' + f(x.w * 0.63) + ' ' + f(Math.min(x.h * 0.13, x.w * 0.18)) + ')'
    }));
    add(g, rect(-1, x.h * 0.5, x.w + 2, x.h * 0.55, {
      fill: linGrad(x.defs, [[0, '#2B171F', 0], [1, '#2B171F', 0.14]], { x1: 0, y1: 0, x2: 0, y2: 1 })
    }));
    add(g, E('path', {
      d: x.d, fill: 'none', stroke: '#FFFFFF',
      'stroke-width': f(x.u * 1.9), opacity: 0.34
    }));
  };

  FINISHES.matte = function (g, x) {
    add(g, rect(-1, -1, x.w + 2, x.h + 2, { fill: '#EEE7E7', opacity: 0.14 }));
    add(g, rect(-1, x.h * 0.46, x.w + 2, x.h * 0.6, {
      fill: linGrad(x.defs, [[0, '#2B171F', 0], [1, '#2B171F', 0.11]], { x1: 0, y1: 0, x2: 0, y2: 1 })
    }));
    add(g, rect(-1, -1, x.w + 2, x.h * 0.3, {
      fill: linGrad(x.defs, [[0, '#FFFFFF', 0.09], [1, '#FFFFFF', 0]], { x1: 0, y1: 0, x2: 0, y2: 1 })
    }));
  };

  FINISHES.glitter = function (g, x) {
    var i, r, cx, cy, tone, tones = ['#FFFFFF', lighten(x.color, 0.6), '#F7E7B8', lighten(x.color, 0.85), '#FDF3FA'];
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: linGrad(x.defs, [[0, '#FFFFFF', 0.16], [0.5, '#FFFFFF', 0.04], [1, '#FFFFFF', 0.12]], { x1: 0, y1: 0, x2: 1, y2: 1 })
    }));
    for (i = 0; i < 78; i++) {
      cx = x.rnd() * x.w;
      cy = x.rnd() * x.h;
      r = x.rnd.r(0.35, 1.7) * x.u;
      tone = x.rnd.pick(tones);
      add(g, E('circle', { cx: f(cx), cy: f(cy), r: f(r), fill: tone, opacity: f(x.rnd.r(0.28, 0.95)) }));
    }
    for (i = 0; i < 7; i++) {
      cx = x.rnd() * x.w;
      cy = x.rnd() * x.h;
      r = x.rnd.r(2.2, 4.2) * x.u;
      add(g, E('path', {
        d: starPath(cx, cy, r, 4, 0.24), fill: '#FFFFFF',
        opacity: f(x.rnd.r(0.5, 0.95)),
        transform: 'rotate(' + f(x.rnd.r(0, 90)) + ' ' + f(cx) + ' ' + f(cy) + ')'
      }));
    }
  };

  FINISHES.chrome = function (g, x) {
    var c = x.color;
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      opacity: 0.8,
      fill: linGrad(x.defs, [
        [0, darken(c, 0.4)], [0.16, lighten(c, 0.55)], [0.32, c],
        [0.46, '#FFFFFF'], [0.58, c], [0.74, darken(c, 0.3)], [1, lighten(c, 0.5)]
      ], { x1: 0.08, y1: 0, x2: 0.92, y2: 1 })
    }));
    add(g, E('ellipse', {
      cx: f(x.w * 0.30), cy: f(x.h * 0.44),
      rx: f(x.w * 0.09), ry: f(x.h * 0.4), fill: '#FFFFFF', opacity: 0.55,
      transform: 'rotate(-20 ' + f(x.w * 0.30) + ' ' + f(x.h * 0.44) + ')',
      filter: blurF(x.defs, x.u * 1.5)
    }));
    add(g, E('path', {
      d: x.d, fill: 'none', stroke: '#FFFFFF', 'stroke-width': f(x.u * 1.6), opacity: 0.45
    }));
  };

  FINISHES.velvet = function (g, x) {
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: radGrad(x.defs, [[0, '#FFFFFF', 0.34], [0.55, '#FFFFFF', 0.1], [1, '#FFFFFF', 0]],
        { cx: 0.44, cy: 0.34, r: 0.68 })
    }));
    add(g, E('path', {
      d: x.d, fill: 'none', stroke: darken(x.color, 0.42),
      'stroke-width': f(x.u * 7), opacity: 0.5, filter: blurF(x.defs, x.u * 2.6)
    }));
    add(g, E('path', {
      d: x.d, fill: 'none', stroke: lighten(x.color, 0.5),
      'stroke-width': f(x.u * 1.2), opacity: 0.3
    }));
  };

  FINISHES.jelly = function (g, x) {
    add(g, E('ellipse', {
      cx: f(x.w * 0.5), cy: f(x.h * 0.56),
      rx: f(x.w * 0.44), ry: f(x.h * 0.36),
      fill: radGrad(x.defs, [[0, '#FFFFFF', 0.4], [0.6, '#FFFFFF', 0.12], [1, '#FFFFFF', 0]])
    }));
    add(g, E('path', {
      d: x.d, fill: 'none', stroke: '#FFFFFF', 'stroke-width': f(x.u * 3), opacity: 0.5
    }));
    add(g, E('path', {
      d: x.d, fill: 'none', stroke: darken(x.color, 0.22), 'stroke-width': f(x.u * 1), opacity: 0.35
    }));
    add(g, E('ellipse', {
      cx: f(x.w * 0.32), cy: f(Math.min(x.h * 0.26, x.w * 0.36)),
      rx: f(x.w * 0.16), ry: f(Math.min(x.h * 0.14, x.w * 0.20)),
      fill: radGrad(x.defs, [[0, '#FFFFFF', 0.8], [1, '#FFFFFF', 0]]),
      transform: 'rotate(-18 ' + f(x.w * 0.32) + ' ' + f(Math.min(x.h * 0.26, x.w * 0.36)) + ')'
    }));
  };

  /* ====================================================================== */
  /* 8. Charms                                                               */
  /* ====================================================================== */

  /* `ink` is only used by monochrome glyphs (◆ ● ✦ …): colour-emoji fonts
     ignore fill, so this simply guarantees a plain glyph stays readable
     whatever the nail underneath it is doing. */
  function charmEl(c, w, h, mirror, ink) {
    var item = sFind('charms', c.id);
    var size = w * 0.26 * c.s;
    var tf = 'translate(' + f(c.x * w) + ' ' + f(c.y * h) + ')';
    var img = (item && typeof item.image === 'string') ? item.image : '';
    var g, txt, glyph;

    if (c.r) tf += ' rotate(' + f(c.r) + ')';
    /* on a mirrored hand the glyph itself must not read backwards */
    if (mirror) tf += ' scale(-1 1)';

    g = E('g', { 'class': 'nail-charm', transform: tf });
    if (img) {
      add(g, E('image', {
        x: f(-size / 2), y: f(-size / 2), width: f(size), height: f(size),
        href: img, 'xlink:href': img, preserveAspectRatio: 'xMidYMid meet'
      }));
      return g;
    }
    glyph = (item && typeof item.glyph === 'string' && item.glyph) ? item.glyph : '✦';
    txt = E('text', {
      x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': f(size), 'font-family': EMOJI_FONT,
      fill: ink || '#3A2129'
    });
    txt.appendChild(document.createTextNode(glyph));
    add(g, txt);
    return g;
  }

  /* ====================================================================== */
  /* 9. One nail plate                                                       */
  /*    opts: {shape, length, w, h, finishId, id|key, interactive, selected,  */
  /*           onPick, mirror, shadow}                                        */
  /*    Layer order: [drop shadow] base -> pattern -> finish -> charms -> rim */
  /* ====================================================================== */

  function nailSVG(nailState, opts) {
    opts = opts || {};
    var n = normNail(nailState);
    var s = shapeId(opts.shape);
    var w = num(opts.w, NAIL_BOX.w);
    var h = num(opts.h, 0);
    var key, u, kind, d, g, defs, clipId, plate, pg, fg, fn, i, ring, hover, sel, cls, onPick;

    if (!(w > 0)) w = NAIL_BOX.w;
    if (!(h > 0)) h = w * ASPECT[s] * lenFactor(opts.length);

    key = String(opts.key !== undefined && opts.key !== null ? opts.key
      : (opts.id !== undefined && opts.id !== null ? opts.id : 'nail'));
    u = w / 100;
    kind = finishKind((opts.finishId !== undefined && opts.finishId !== null && opts.finishId !== '')
      ? opts.finishId : n.finish);
    d = path(s, w, h);
    sel = !!(opts.selected && selection(opts.selected)[key]);

    cls = 'nail' + (sel ? ' is-selected' : '');
    g = E('g', { 'class': cls, 'data-key': key });
    defs = add(g, E('defs'));
    clipId = uid('clip');
    add(defs, E('clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' }, [E('path', { d: d })]));

    /* soft contact shadow so the plate sits ON the finger */
    if (opts.shadow) {
      add(g, E('path', {
        d: d, fill: col(opts.shadow, '#3A2129'), opacity: 0.4,
        filter: blurF(defs, u * 1.8),
        transform: 'translate(0 ' + f(u * 2.4) + ')'
      }));
    }

    /* --- base + pattern (jelly makes the whole plate translucent) --------- */
    plate = add(g, E('g', kind === 'jelly' ? { opacity: 0.78 } : null));
    add(plate, E('path', { d: d, fill: n.color }));
    if (kind !== 'matte') {
      add(plate, E('path', {
        d: d,
        fill: linGrad(defs, [[0, '#FFFFFF', 0.18], [0.42, '#FFFFFF', 0.04], [1, '#2B171F', 0.08]],
          { x1: 0, y1: 0, x2: 0, y2: 1 })
      }));
    }

    fn = PATTERNS[n.pattern.kind];
    if (typeof fn === 'function') {
      pg = add(plate, E('g', { 'clip-path': 'url(#' + clipId + ')' }));
      try {
        fn(pg, {
          w: w, h: h, u: u, d: d, shape: s, base: n.color, defs: defs,
          c1: n.pattern.color, c2: n.pattern.color2, S: n.pattern.scale,
          rnd: seeded(key + '|' + s + '|' + n.pattern.kind + '|' + n.pattern.color)
        });
      } catch (e) {
        if (pg.parentNode) pg.parentNode.removeChild(pg);
        console.warn('[SN.Nail] pattern "' + n.pattern.kind + '" failed', e);
      }
    }

    /* --- finish ---------------------------------------------------------- */
    fn = FINISHES[kind] || FINISHES.gloss;
    fg = add(g, E('g', { 'clip-path': 'url(#' + clipId + ')' }));
    try {
      fn(fg, {
        w: w, h: h, u: u, d: d, color: n.color, defs: defs,
        rnd: seeded(key + '|' + s + '|' + kind + '|' + n.color)
      });
    } catch (e2) {
      if (fg.parentNode) fg.parentNode.removeChild(fg);
      console.warn('[SN.Nail] finish "' + kind + '" failed', e2);
    }

    /* --- charms ---------------------------------------------------------- */
    if (n.charms.length) {
      pg = add(g, E('g', { 'class': 'nail-charms' }));
      for (i = 0; i < n.charms.length; i++) {
        add(pg, charmEl(n.charms[i], w, h, !!opts.mirror, against(n.color, 0.55)));
      }
    }

    /* --- rim / free edge ------------------------------------------------- */
    add(g, E('path', {
      d: d, fill: 'none', stroke: darken(n.color, 0.3),
      'stroke-width': f(u * 1.1), opacity: 0.35
    }));
    add(g, E('g', { 'clip-path': 'url(#' + clipId + ')' }, [
      E('path', {
        d: d, fill: 'none', stroke: '#FFFFFF', 'stroke-width': f(u * 1.4),
        opacity: kind === 'matte' ? 0.14 : 0.4,
        transform: 'translate(0 ' + f(u * 2) + ')'
      })
    ]));

    /* --- interaction ----------------------------------------------------- */
    if (opts.interactive) {
      onPick = typeof opts.onPick === 'function' ? opts.onPick : null;
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', nailLabel(key));
      g.setAttribute('aria-pressed', sel ? 'true' : 'false');
      g.setAttribute('style', 'cursor:pointer;outline:none');

      /* The ring is drawn in plate units, but a plate on a hand is only ~30
         units wide, so a purely proportional stroke lands under one device
         pixel and the selection reads as nothing at all. Floor it. */
      hover = add(g, E('path', {
        d: d, fill: 'none', stroke: '#FFFFFF',
        'stroke-width': f(Math.max(u * 3.2, 1.6)),
        opacity: 0, 'pointer-events': 'none', 'data-sn-ui': 'hover'
      }));
      ring = add(g, E('g', {
        'pointer-events': 'none', 'data-sn-ui': 'ring', opacity: sel ? 1 : 0
      }, [
        E('path', {
          d: d, fill: 'none', stroke: '#FFFFFF',
          'stroke-width': f(Math.max(u * 6, 3)), opacity: 0.9
        }),
        E('path', {
          d: d, fill: 'none', stroke: '#C97B92',
          'stroke-width': f(Math.max(u * 2.8, 1.5))
        })
      ]));

      g.addEventListener('click', function (ev) { if (onPick) onPick(key, ev); });
      g.addEventListener('keydown', function (ev) {
        var k = ev.key || ev.keyCode;
        if (k === 'Enter' || k === ' ' || k === 'Spacebar' || k === 13 || k === 32) {
          ev.preventDefault();
          if (onPick) onPick(key, ev);
        }
      });
      g.addEventListener('mouseenter', function () { hover.setAttribute('opacity', '0.55'); });
      g.addEventListener('mouseleave', function () { hover.setAttribute('opacity', '0'); });
      g.addEventListener('focus', function () {
        hover.setAttribute('opacity', '0.85');
        hover.setAttribute('stroke', '#C97B92');
        hover.setAttribute('stroke-dasharray',
          f(Math.max(u * 5, 2.5)) + ' ' + f(Math.max(u * 4, 2)));
      });
      g.addEventListener('blur', function () {
        hover.setAttribute('opacity', '0');
        hover.setAttribute('stroke', '#FFFFFF');
        hover.removeAttribute('stroke-dasharray');
      });
    }

    return g;
  }

  /* ====================================================================== */
  /* 10. The hand                                                            */
  /* ====================================================================== */

  function fingerTF(gm) {
    return 'translate(' + f(gm.x) + ' ' + f(gm.y) + ') rotate(' + f(gm.angle) + ')';
  }

  /* One finger, in its own local frame: the base centre is (0,0) and the tip
     is at (0,-length). Wider at the base than at the tip, rounded cap, and a
     root that runs back into the palm so the two shapes fuse. */
  function fingerPath(gm) {
    var hb = gm.width / 2;
    var ht = hb * FINGER_TAPER;
    var root = gm.width * FINGER_ROOT;
    var yTip = -(gm.length - ht);
    var span = root - yTip;
    var p = pb();
    p.M(-hb, root);
    p.C(-hb, root - span * 0.42, -ht - (hb - ht) * 0.40, yTip + span * 0.30, -ht, yTip);
    p.A(ht, ht, 0, 0, 1, ht, yTip);
    p.C(ht + (hb - ht) * 0.40, yTip + span * 0.30, hb, root - span * 0.42, hb, root);
    p.Z();
    return p.d();
  }

  /* fresh copies every call — the same silhouette is needed several times */
  function skinShapes(attrs) {
    var out = [], i, gm, a = attrs || {};
    out.push(E('rect', mergeAttrs({
      x: f(WRIST.x), y: f(WRIST.y), width: f(WRIST.w), height: f(WRIST.h),
      rx: f(WRIST.r), ry: f(WRIST.r)
    }, a)));
    out.push(E('path', mergeAttrs({ d: PALM_D }, a)));
    for (i = 0; i < FINGERS.length; i++) {
      gm = HAND_GEOM[FINGERS[i].key];
      out.push(E('path', mergeAttrs({ d: fingerPath(gm), transform: fingerTF(gm) }, a)));
    }
    return out;
  }
  function mergeAttrs(base, extra) {
    var k;
    for (k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) base[k] = extra[k];
    return base;
  }

  function handContent(side, design, opts) {
    opts = opts || {};
    var mirror = side === 'left';
    var skin = design.skin;
    var sh = skinShadow(skin);
    var W = HAND_VIEW.w, H = HAND_VIEW.h;
    var g = E('g', { 'class': 'sn-hand-body' });
    var defs = add(g, E('defs'));
    var clipId = uid('hand');
    var i, gm, fk, key, nw, nh, dist, px, py, factor, aspect, shape, kn, el, vol;

    add(defs, E('clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' }, skinShapes()));

    /* 1. one soft darker edge around the WHOLE silhouette. Stroking each
       shape underneath the fills means the interior strokes get painted over
       and only the outline of the union survives — no wireframe of finger
       outlines running across the palm. */
    add(g, E('g', {
      fill: sh, stroke: sh, 'stroke-width': 5.5,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: 0.55
    }, skinShapes()));

    /* 2. the flat silhouette */
    add(g, E('g', { fill: skin }, skinShapes()));

    /* 3. a soft shadow banked along the lower / outer edge */
    add(g, E('g', { 'clip-path': 'url(#' + clipId + ')' }, [
      rect(0, 0, W, H, { fill: sh }),
      E('g', { fill: skin, transform: 'translate(-7 -9)', filter: blurF(defs, 8) }, skinShapes())
    ]));

    /* 4. volume. ONE gradient in user space over the whole hand — a per-shape
       gradient would seam visibly wherever a finger crosses the palm. */
    vol = grad(defs, 'linearGradient', [
      [0, '#FFFFFF', 0.30], [0.26, '#FFFFFF', 0.05], [0.58, sh, 0], [1, sh, 0.30]
    ], { x1: 44, y1: 0, x2: 264, y2: 0, gradientUnits: 'userSpaceOnUse' });
    add(g, E('g', { 'clip-path': 'url(#' + clipId + ')' }, [rect(0, 0, W, H, { fill: vol })]));

    /* 5. knuckle + joint hints */
    kn = add(g, E('g', { 'clip-path': 'url(#' + clipId + ')', filter: blurF(defs, 2.6) }));
    for (i = 0; i < FINGERS.length; i++) {
      gm = HAND_GEOM[FINGERS[i].key];
      add(kn, E('ellipse', {
        cx: 0, cy: f(-gm.length * 0.50), rx: f(gm.width * 0.30), ry: 2.4,
        fill: sh, opacity: 0.20, transform: fingerTF(gm)
      }));
      add(kn, E('ellipse', {
        cx: 0, cy: f(-gm.length * 0.16), rx: f(gm.width * 0.34), ry: 2.8,
        fill: sh, opacity: 0.16, transform: fingerTF(gm)
      }));
    }
    /* the soft dome on the back of the hand */
    add(kn, E('ellipse', {
      cx: 146, cy: 284, rx: 56, ry: 44, fill: '#FFFFFF', opacity: 0.12
    }));
    /* the wrist reads as sitting behind the hand */
    add(kn, E('ellipse', {
      cx: f(WRIST.x + WRIST.w / 2), cy: 386, rx: f(WRIST.w * 0.66), ry: 34,
      fill: sh, opacity: 0.3
    }));

    /* 6. the nails — sized from their own finger, so the pinky's plate is the
       smallest and the thumb's the widest */
    shape = shapeId(design.shape);
    aspect = ASPECT[shape];
    factor = lenFactor(design.length);
    for (i = 0; i < FINGERS.length; i++) {
      fk = FINGERS[i].key;
      gm = HAND_GEOM[fk];
      key = side + fk.charAt(0).toUpperCase() + fk.slice(1);
      nw = gm.width * PLATE_W;
      nh = nw * aspect * factor;
      dist = gm.length - gm.width * PLATE_BACK;
      px = gm.x + Math.sin(rad(gm.angle)) * dist;
      py = gm.y - Math.cos(rad(gm.angle)) * dist;
      el = nailSVG(design.nails[key], {
        shape: shape, w: nw, h: nh, key: key, mirror: mirror,
        finishId: design.nails[key] ? design.nails[key].finish : null,
        shadow: darken(sh, 0.25),
        interactive: !!opts.interactive,
        selected: opts.selected,
        onPick: opts.onPick
      });
      el.setAttribute('transform',
        'translate(' + f(px) + ' ' + f(py) + ') rotate(' + f(gm.angle) + ') ' +
        'translate(' + f(-nw / 2) + ' ' + f(-nh) + ')');
      add(g, el);
    }
    return g;
  }

  function handGroup(side, design, opts) {
    var inner = handContent(side, design, opts);
    if (side === 'left') {
      return E('g', { transform: 'translate(' + HAND_VIEW.w + ' 0) scale(-1 1)' }, [inner]);
    }
    return inner;
  }

  /* w / h are CSS pixel sizes for the element itself; leave both out and the
     svg simply fills its container (viewBox + width:100%). */
  function sizeSvg(svg, w, vw, vh, h) {
    var nw = num(w, 0), nh = num(h, 0);
    svg.setAttribute('viewBox', '0 0 ' + f(vw) + ' ' + f(vh));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    if (nw > 0 && nh > 0) {
      svg.setAttribute('width', f(nw));
      svg.setAttribute('height', f(nh));
      svg.setAttribute('style', 'display:block;max-width:100%');
    } else if (nw > 0) {
      svg.setAttribute('width', f(nw));
      svg.setAttribute('height', f(nw * vh / vw));
      svg.setAttribute('style', 'display:block;max-width:100%;height:auto');
    } else if (nh > 0) {
      svg.setAttribute('width', f(nh * vw / vh));
      svg.setAttribute('height', f(nh));
      svg.setAttribute('style', 'display:block;max-width:100%');
    } else {
      svg.setAttribute('style', 'display:block;width:100%;height:auto');
    }
    return svg;
  }

  function newSvg(opts) {
    var svg = E('svg', { xmlns: NS, 'class': 'sn-svg', focusable: 'false' });
    opts = opts || {};
    if (opts.interactive) {
      svg.setAttribute('role', 'group');
      svg.setAttribute('aria-label', tr('a11y.selectNail', 'Select nail'));
    } else if (typeof opts.ariaLabel === 'string' && opts.ariaLabel) {
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', opts.ariaLabel);
    } else {
      svg.setAttribute('aria-hidden', 'true');
    }
    return svg;
  }

  function hand(opts) {
    opts = opts || {};
    var side = opts.side === 'left' ? 'left' : 'right';
    var design = normDesign(opts.design);
    var svg = newSvg(opts);
    svg.setAttribute('class', 'sn-svg sn-hand sn-hand-' + side);
    add(svg, handGroup(side, design, opts));
    return sizeSvg(svg, opts.w, HAND_VIEW.w, HAND_VIEW.h);
  }

  function preview(design, opts) {
    opts = opts || {};
    var d = normDesign(design);
    var svg = newSvg(opts);
    var gap = 20, vw, vh;

    if (d.hand === 'both') {
      /* mirrored pair; the left hand rides a little lower so the pair reads
         as a natural composition rather than a stamped duplicate */
      vw = HAND_VIEW.w * 2 + gap;
      vh = HAND_VIEW.h + 24;
      svg.setAttribute('class', 'sn-svg sn-preview sn-preview-both');
      add(svg, E('g', { transform: 'translate(0 24)' }, [handGroup('left', d, opts)]));
      add(svg, E('g', { transform: 'translate(' + f(HAND_VIEW.w + gap) + ' 0)' }, [handGroup('right', d, opts)]));
    } else {
      vw = HAND_VIEW.w;
      vh = HAND_VIEW.h;
      svg.setAttribute('class', 'sn-svg sn-preview sn-preview-' + d.hand);
      add(svg, handGroup(d.hand, d, opts));
    }
    return sizeSvg(svg, opts.w, vw, vh);
  }

  /* ====================================================================== */
  /* 11. single() — one big nail, the charm placement editor's canvas        */
  /*                                                                         */
  /*  Coordinate mapping the studio can rely on:                             */
  /*    viewBox = 0 0 (BOX_PAD.x + boxW + BOX_PAD.right)                     */
  /*                  (BOX_PAD.y + boxH + BOX_PAD.bottom)                    */
  /*    the plate box starts at (BOX_PAD.x, BOX_PAD.y) and is boxW x boxH    */
  /*    user units (100 x 150 by default — SN.Nail.NAIL_BOX), tip at the top. */
  /*  A charm at {x, y} sits at (BOX_PAD.x + x*boxW, BOX_PAD.y + y*boxH).    */
  /*  Going the other way is SN.Nail.pointToNorm(svgEl, clientX, clientY),   */
  /*  which reads the box straight off the data-nx/ny/nw/nh attributes that  */
  /*  single() stamps on the <svg>, so it keeps working if the box changes.  */
  /* ====================================================================== */

  function single(nailState, design, opts) {
    opts = opts || {};
    var d = normDesign(design);
    var shape = shapeId(opts.shape || d.shape);
    var bw = num(opts.boxW, NAIL_BOX.w);
    var bh = num(opts.boxH, 0);
    var key = String(opts.key !== undefined && opts.key !== null ? opts.key : 'nail');
    var vw, vh, svg, defs, g;

    if (!(bw > 0)) bw = NAIL_BOX.w;
    if (!(bh > 0)) {
      /* default box = the stable 100 x 150 editor canvas.
         Pass opts.length (id or factor) — or opts.natural to take it from the
         design — when you want true shape/length proportions instead, e.g. the
         length picker. Charms are normalised to the box either way, so they
         never drift when the box changes. */
      if (opts.natural || opts.length !== undefined && opts.length !== null) {
        bh = clamp(bw * ASPECT[shape] * lenFactor(
          (opts.length === undefined || opts.length === null) ? d.length : opts.length
        ), 90, 240);
      } else {
        bh = NAIL_BOX.h;
      }
    }
    vw = BOX_PAD.x + bw + BOX_PAD.right;
    vh = BOX_PAD.y + bh + BOX_PAD.bottom;

    svg = newSvg(opts);
    svg.setAttribute('class', 'sn-svg sn-single');
    svg.setAttribute('data-key', key);
    defs = add(svg, E('defs'));

    if (opts.bg !== false) {
      add(svg, E('rect', {
        x: 1, y: 1, width: f(vw - 2), height: f(vh - 2), rx: 20,
        fill: typeof opts.bg === 'string' && opts.bg ? opts.bg : '#C97B92',
        'fill-opacity': typeof opts.bg === 'string' && opts.bg ? 1 : 0.07
      }));
      add(svg, E('rect', {
        x: 1, y: 1, width: f(vw - 2), height: f(vh - 2), rx: 20,
        fill: radGrad(defs, [[0, '#FFFFFF', 0.18], [1, '#FFFFFF', 0]], { cx: 0.5, cy: 0.3, r: 0.8 })
      }));
    }

    g = nailSVG(nailState, {
      shape: shape, w: bw, h: bh, key: key,
      finishId: opts.finishId,
      interactive: !!opts.interactive,
      selected: opts.selected,
      onPick: opts.onPick
    });
    g.setAttribute('transform', 'translate(' + f(BOX_PAD.x) + ' ' + f(BOX_PAD.y) + ')');
    add(svg, g);

    svg.setAttribute('data-nx', f(BOX_PAD.x));
    svg.setAttribute('data-ny', f(BOX_PAD.y));
    svg.setAttribute('data-nw', f(bw));
    svg.setAttribute('data-nh', f(bh));
    return sizeSvg(svg, opts.w, vw, vh, opts.h);
  }

  function pointToNorm(svgEl, clientX, clientY) {
    var out = { x: 0.5, y: 0.5 };
    var root, m, p, ux, uy, r, bx, by, bw, bh;
    try {
      root = resolveSvg(svgEl);
      if (!root) return out;
      bx = num(root.getAttribute('data-nx'), BOX_PAD.x);
      by = num(root.getAttribute('data-ny'), BOX_PAD.y);
      bw = num(root.getAttribute('data-nw'), NAIL_BOX.w);
      bh = num(root.getAttribute('data-nh'), NAIL_BOX.h);
      if (!(bw > 0)) bw = NAIL_BOX.w;
      if (!(bh > 0)) bh = NAIL_BOX.h;

      m = root.getScreenCTM ? root.getScreenCTM() : null;
      if (m && m.inverse) {
        if (typeof window.DOMPoint === 'function') {
          p = new window.DOMPoint(clientX, clientY).matrixTransform(m.inverse());
        } else if (root.createSVGPoint) {
          p = root.createSVGPoint();
          p.x = clientX; p.y = clientY;
          p = p.matrixTransform(m.inverse());
        }
      }
      if (p) { ux = p.x; uy = p.y; }
      else {
        /* last resort: assume the viewBox is stretched over the client rect */
        r = root.getBoundingClientRect();
        var vb = (root.getAttribute('viewBox') || '').split(/[\s,]+/);
        var vw = num(vb[2], BOX_PAD.x + NAIL_BOX.w + BOX_PAD.right);
        var vh = num(vb[3], BOX_PAD.y + NAIL_BOX.h + BOX_PAD.bottom);
        if (!r.width || !r.height) return out;
        ux = (clientX - r.left) / r.width * vw;
        uy = (clientY - r.top) / r.height * vh;
      }
      return { x: clamp((ux - bx) / bw, 0, 1), y: clamp((uy - by) / bh, 0, 1) };
    } catch (e) {
      return out;
    }
  }

  /* ====================================================================== */
  /* 12. thumb() — the little 3 nail fan used on shop cards                  */
  /* ====================================================================== */

  function thumb(design, px) {
    var d = normDesign(design);
    var size = num(px, 0);
    var vw = 120, vh = 120, pad = 3;
    var svg = newSvg({});
    var defs, shape, A, nw, nh, i, el, spread, cy, ca, sa, top, bot, lift;
    var keys = ['rightRing', 'rightMiddle', 'rightIndex'];
    var order = [0, 2, 1];          /* outer plates first, centre one on top */
    var tilt = 16;                  /* how far the outer plates fan out */
    var over = 0.66;                /* centre spacing / plate width (< 1 = overlap) */

    svg.setAttribute('class', 'sn-svg sn-thumb');
    defs = add(svg, E('defs'));
    add(svg, E('ellipse', {
      cx: 60, cy: 62, rx: 59, ry: 52,
      fill: radGrad(defs, [[0, '#C97B92', 0.16], [1, '#C97B92', 0]])
    }));

    shape = shapeId(d.shape);
    A = ASPECT[shape] * lenFactor(d.length);      /* plate height / width */
    ca = Math.cos(rad(tilt));
    sa = Math.sin(rad(tilt));

    /* Pick the largest plate width that still lets the whole fan sit inside
       the box, whatever the shape and length are: solve both the horizontal
       and the vertical constraint for nw and take the tighter one. */
    nw = Math.min(
      46,
      (vw / 2 - pad) / (over + 0.5 * ca + A * sa),
      (vh - 2 * pad) / (A * ca + 0.5 * sa + 0.16)
    );
    nw = Math.max(nw, 8);
    nh = nw * A;
    spread = nw * over;
    lift = nw * 0.16;

    /* park the fan vertically centred whatever the length */
    top = nh * ca + (nw / 2) * sa;
    bot = (nw / 2) * sa;
    cy = (vh - (top + lift + bot)) / 2 + lift + top;

    for (i = 0; i < order.length; i++) {
      el = nailSVG(d.nails[keys[order[i]]], {
        shape: shape, w: nw, h: nh, key: keys[order[i]], shadow: '#7A4B58'
      });
      el.setAttribute('transform',
        'translate(' + f(vw / 2 + (order[i] - 1) * spread) + ' ' +
                       f(cy - (order[i] === 1 ? 0 : lift)) + ') ' +
        'rotate(' + f((order[i] - 1) * tilt) + ') ' +
        'translate(' + f(-nw / 2) + ' ' + f(-nh) + ')');
      add(svg, el);
    }
    return sizeSvg(svg, size, vw, vh);
  }

  /* ====================================================================== */
  /* 13. Raster export — works offline, no network, no external images       */
  /* ====================================================================== */

  function resolveSvg(el) {
    if (!el || !el.tagName) return null;
    if (String(el.tagName).toLowerCase() === 'svg') return el;
    if (el.ownerSVGElement) return el.ownerSVGElement;
    return el.querySelector ? el.querySelector('svg') : null;
  }

  /* a detached copy with every interactive-only artefact removed */
  function exportClone(el) {
    var root = resolveSvg(el), c, nodes, i, n2, st;
    if (!root) throw new Error('SN.Nail: an <svg> element is required for export');
    c = root.cloneNode(true);
    c.setAttribute('xmlns', NS);
    c.setAttribute('xmlns:xlink', XLINK);

    nodes = c.querySelectorAll('[data-sn-ui]');
    for (i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].parentNode) nodes[i].parentNode.removeChild(nodes[i]);
    }
    nodes = c.querySelectorAll('[tabindex],[role],[style],[aria-pressed]');
    for (i = 0; i < nodes.length; i++) {
      n2 = nodes[i];
      n2.removeAttribute('tabindex');
      n2.removeAttribute('aria-pressed');
      if (n2.getAttribute('role') === 'button') n2.removeAttribute('role');
      st = n2.getAttribute('style');
      if (st && st.indexOf('cursor') !== -1) n2.removeAttribute('style');
    }
    c.removeAttribute('style');
    c.removeAttribute('aria-hidden');
    return c;
  }

  function rasterize(el, opts) {
    return new Promise(function (resolve, reject) {
      var o = opts || {};
      var c, vb, vw, vh, scale, W, H, str, canvas, ctx, img;
      var url = null, settled = false, timer = null, fallback = false;

      function done(err) {
        if (settled) return;
        settled = true;
        if (timer) { clearTimeout(timer); timer = null; }
        if (url) { try { URL.revokeObjectURL(url); } catch (e0) { /* ignore */ } url = null; }
        if (err) reject(err); else resolve(canvas);
      }

      try {
        c = exportClone(el);
        vb = (c.getAttribute('viewBox') || '').split(/[\s,]+/);
        vw = num(vb[2], num(c.getAttribute('width'), 0));
        vh = num(vb[3], num(c.getAttribute('height'), 0));
        if (!(vw > 0)) vw = HAND_VIEW.w;
        if (!(vh > 0)) vh = HAND_VIEW.h;
        scale = clamp(num(o.scale, 2), 0.2, 8);
        W = Math.max(1, Math.round(vw * scale));
        H = Math.max(1, Math.round(vh * scale));
        c.setAttribute('width', String(W));
        c.setAttribute('height', String(H));

        str = '<?xml version="1.0" encoding="UTF-8"?>' +
          new XMLSerializer().serializeToString(c);

        canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        ctx = canvas.getContext ? canvas.getContext('2d') : null;
        if (!ctx) { done(new Error('SN.Nail: this browser has no 2D canvas context')); return; }

        img = new Image();
        img.onload = function () {
          try {
            var bg = (o.bg === null || o.bg === false) ? null
              : (typeof o.bg === 'string' && o.bg ? o.bg : '#FFF8F6');
            if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); }
            ctx.drawImage(img, 0, 0, W, H);
            done(null);
          } catch (e1) {
            done(new Error('SN.Nail: could not draw the design onto the canvas — ' +
              (e1 && e1.message ? e1.message : e1)));
          }
        };
        img.onerror = function () {
          if (!fallback) {
            /* Safari occasionally refuses blob: SVG images — retry inline */
            fallback = true;
            if (url) { try { URL.revokeObjectURL(url); } catch (e2) { /* ignore */ } url = null; }
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
            return;
          }
          done(new Error('SN.Nail: the design image could not be decoded'));
        };
        timer = setTimeout(function () {
          done(new Error('SN.Nail: rendering the design to an image timed out'));
        }, 15000);

        try {
          url = URL.createObjectURL(new Blob([str], { type: 'image/svg+xml;charset=utf-8' }));
          img.src = url;
        } catch (e3) {
          fallback = true;
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
        }
      } catch (e4) {
        done(e4 instanceof Error ? e4 : new Error('SN.Nail: export failed — ' + e4));
      }
    });
  }

  function dataURLToBlob(dataURL) {
    var parts = String(dataURL).split(',');
    var mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/png';
    var bin = atob(parts[1] || '');
    var len = bin.length;
    var arr = new Uint8Array(len);
    for (var i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function toPNG(svgEl, opts) {
    return rasterize(svgEl, opts).then(function (canvas) {
      return new Promise(function (res, rej) {
        try {
          if (canvas.toBlob) {
            canvas.toBlob(function (b) {
              if (b) res(b);
              else rej(new Error('SN.Nail: the browser could not encode the PNG'));
            }, 'image/png');
          } else {
            res(dataURLToBlob(canvas.toDataURL('image/png')));
          }
        } catch (e) {
          rej(new Error('SN.Nail: PNG export failed — ' + (e && e.message ? e.message : e)));
        }
      });
    });
  }

  function toDataURL(svgEl, opts) {
    return rasterize(svgEl, opts).then(function (canvas) {
      try { return canvas.toDataURL('image/png'); }
      catch (e) {
        throw new Error('SN.Nail: PNG export failed — ' + (e && e.message ? e.message : e));
      }
    });
  }

  /* ====================================================================== */
  /* 14. blank() — a fresh, valid DESIGN_CONFIG (SPEC section 6)             */
  /* ====================================================================== */

  function firstId(key, preferred, fallback) {
    var list = sList(key), i;
    for (i = 0; i < list.length; i++) {
      if (isObj(list[i]) && list[i].id === preferred) return preferred;
    }
    for (i = 0; i < list.length; i++) {
      if (isObj(list[i]) && typeof list[i].id === 'string' && list[i].id) return list[i].id;
    }
    return fallback;
  }

  function softNude() {
    var list = sList('colors'), i, it;
    for (i = 0; i < list.length; i++) {
      it = list[i];
      if (isObj(it) && it.id === 'c-nude-rose' && parseHex(it.hex)) return col(it.hex, DEF.color);
    }
    for (i = 0; i < list.length; i++) {
      it = list[i];
      if (isObj(it) && it.group === 'nude' && parseHex(it.hex)) return col(it.hex, DEF.color);
    }
    return DEF.color;
  }

  function blank() {
    var tones = sList('skinTones');
    var skin = (tones[0] && isObj(tones[0]) && parseHex(tones[0].hex)) ? col(tones[0].hex, DEF.skin) : DEF.skin;
    var sets = sList('sizeSets'), set = null, per, i, k, fk;
    var nude = softNude();
    var finish = firstId('finishes', 'gloss', 'gloss');
    var sizes = {}, nails = {};

    for (i = 0; i < sets.length; i++) if (isObj(sets[i]) && sets[i].id === 'M') set = sets[i];
    if (!set && sets.length && isObj(sets[0])) set = sets[0];
    per = (set && isObj(set.sizes)) ? set.sizes : DEF.sizes;

    for (i = 0; i < KEYS.length; i++) {
      k = KEYS[i];
      fk = fingerOf(k);
      sizes[k] = clamp(Math.round(num(per[fk], DEF.sizes[fk])), 0, 11);
      nails[k] = {
        color: nude,
        finish: finish,
        pattern: { kind: 'none', color: '#FFFFFF', color2: DEF.accent2, scale: 1 },
        charms: []
      };
    }

    return {
      v: 1,
      skin: skin,
      shape: firstId('shapes', 'almond', 'almond'),
      length: firstId('lengths', 'medium', 'medium'),
      hand: 'both',
      measure: firstId('measureMethods', 'preset', 'preset'),
      sizes: sizes,
      nails: nails,
      qty: 1,
      express: false,
      giftWrap: false,
      notes: ''
    };
  }

  /* ====================================================================== */
  /* 15. Public API                                                          */
  /* ====================================================================== */

  SN.Nail = {
    SHAPES: SHAPES,
    KEYS: KEYS,
    FINGERS: FINGERS,
    PATTERN_KINDS: ['none'].concat(Object.keys(PATTERNS)),
    FINISH_KINDS: FINISH_KINDS,
    ASPECT: ASPECT,
    NAIL_BOX: NAIL_BOX,
    BOX_PAD: BOX_PAD,
    HAND_VIEW: HAND_VIEW,
    HAND_GEOM: HAND_GEOM,

    path: path,
    nailSVG: nailSVG,
    hand: hand,
    preview: preview,
    single: single,
    thumb: thumb,
    pointToNorm: pointToNorm,
    toPNG: toPNG,
    toDataURL: toDataURL,
    blank: blank,
    lengthFactor: lenFactor,
    finishKind: finishKind
  };
})();
