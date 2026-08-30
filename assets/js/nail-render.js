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
     index close behind, pinky clearly shortest and thinnest. The proportions
     are adult, not infantile — the middle finger is about as long as the palm
     is tall (knuckle line y~=180, wrist crease y~=333), and the palm is
     clearly taller than it is wide. The thumb has its own entry below.
     This is the one table to touch when the hand looks off. */
  var HAND_GEOM = {
    pinky:  { x: 88,  y: 190, angle: -15, width: 24, length: 106 },
    ring:   { x: 117, y: 174, angle: -9,  width: 28, length: 136 },
    middle: { x: 148, y: 168, angle: -1,  width: 30, length: 142 },
    index:  { x: 179, y: 176, angle: 10,  width: 29, length: 130 },
    /* The thumb is not a capsule: it is a limb that BENDS, from a wide mound
       rooted in the palm heel (h0), through the knuckle (c / hc), out to a
       clearly narrower distal segment (p2 / h2). Two overlapping capsules
       always leave a step where they cross, so it is drawn as one tapered
       ribbon swept along this quadratic spine. `tip` is derived from the
       spine in initThumb() and exists only so the nail plate and the joint
       hints can be positioned exactly like every other finger's. */
    thumb:  {
      spine: { p0: [172, 336], c: [228, 290], p2: [271, 216],
               h0: 30, hc: 21, h2: 13.5 },
      tip: null
    }
  };

  /* --- the bent thumb ---------------------------------------------------- */
  function qAt(a, b, c, t) {
    var u = 1 - t;
    return u * u * a + 2 * u * t * b + t * t * c;
  }
  function spinePt(sp, t) {
    return {
      x: qAt(sp.p0[0], sp.c[0], sp.p2[0], t),
      y: qAt(sp.p0[1], sp.c[1], sp.p2[1], t),
      h: qAt(sp.h0, sp.hc, sp.h2, t)
    };
  }
  /* one closed outline: rounded root, both offset walls, rounded tip cap */
  function spinePath(sp, steps) {
    var N = steps || 26, i, t, a, b, dx, dy, L, nx, ny, pt;
    var left = [], right = [];
    for (i = 0; i <= N; i++) {
      t = i / N;
      pt = spinePt(sp, t);
      a = spinePt(sp, Math.max(0, t - 0.02));
      b = spinePt(sp, Math.min(1, t + 0.02));
      dx = b.x - a.x; dy = b.y - a.y;
      L = Math.sqrt(dx * dx + dy * dy) || 1;
      nx = -dy / L; ny = dx / L;
      left.push([pt.x + nx * pt.h, pt.y + ny * pt.h]);
      right.push([pt.x - nx * pt.h, pt.y - ny * pt.h]);
    }
    var p = pb();
    p.M(left[0][0], left[0][1]);
    for (i = 1; i <= N; i++) p.L(left[i][0], left[i][1]);
    p.A(sp.h2, sp.h2, 0, 0, 0, right[N][0], right[N][1]);
    for (i = N - 1; i >= 0; i--) p.L(right[i][0], right[i][1]);
    p.A(sp.h0, sp.h0, 0, 0, 0, left[0][0], left[0][1]);
    p.Z();
    return p.d();
  }

  /* derive the straight stand-in limb the nail plate rides on */
  (function initThumb() {
    var sp = HAND_GEOM.thumb.spine;
    var k = spinePt(sp, 0.45);          /* the knuckle: base of the stand-in */
    var a = spinePt(sp, 0.82), b = spinePt(sp, 1);
    /* aim the stand-in along the tangent AT THE TIP, so the plate lies flat
       on the last segment instead of following the chord of the whole bend */
    var dx = b.x - a.x, dy = b.y - a.y;
    var ang = Math.atan2(dx, -dy);
    var len = Math.sqrt((b.x - k.x) * (b.x - k.x) + (b.y - k.y) * (b.y - k.y));
    HAND_GEOM.thumb.tip = {
      x: b.x - Math.sin(ang) * len,
      y: b.y + Math.cos(ang) * len,
      angle: ang * 180 / Math.PI,
      width: k.h * 2,
      length: len,
      taper: sp.h2 / k.h
    };
  }());

  /* how far a finger capsule reaches back INTO the palm, in finger widths,
     so the two silhouettes fuse into one shape */
  var FINGER_ROOT = 1.5;
  /* the finger tip is this fraction of the base width */
  var FINGER_TAPER = 0.74;

  /* The rounded webs where two fingers separate. Without these the two
     capsules simply cross and the crotch comes to a hard point.
     `t` = how far down between the two bases the web sits, `r` = its radius. */
  var WEB = [
    { a: 'pinky',  b: 'ring',   drop: 7, r: 13 },
    { a: 'ring',   b: 'middle', drop: 7, r: 14 },
    { a: 'middle', b: 'index',  drop: 7, r: 14 },
    { x: 203, y: 273, r: 14 }               /* index <-> thumb */
  ];

  /* The palm: clearly taller than it is wide, tapering to the wrist, with the
     thenar (thumb mound) bulging out on the thumb side. In an adult hand the
     middle finger is about as long as the palm is tall — the knuckle line
     here sits at y~=182 and the wrist crease at y~=330, which is exactly the
     length of the middle finger above it. Same coordinates as HAND_GEOM. */
  var PALM_D =
    /* clockwise from the pinky-side knuckle. The first control leaves that
       corner along the pinky's own outer edge, so the hypothenar continues
       the little finger instead of notching into it. */
    'M82 212 ' +
    'C89 236 71 246 70 264 ' +       /* hypothenar bulge           */
    'C69 294 96 316 103 330 ' +      /* down to the wrist          */
    'C110 344 192 344 199 330 ' +    /* the heel of the hand       */
    'C206 314 206 288 206 252 ' +    /* up the index-side edge     */
    'C206 228 203 210 196 202 ' +    /* the index knuckle          */
    'C186 194 136 185 104 190 ' +    /* back across the knuckles   */
    'C93 192 84 200 82 212 Z';

  /* a wrist stub so the hand does not float */
  /* deliberately taller than the viewBox so it always runs off the bottom
     edge rather than ending in a visible rounded stub */
  var WRIST = { x: 103, y: 296, w: 96, h: 140, r: 20 };

  /* Nail plate seating. PLATE_W is a fraction of the finger's width AT THE
     NAIL BED (measured PLATE_AT of the way to the tip), never of its base, so
     a plate can never be wider than the fingertip it lies on.
     PLATE_SEAT decides how far back from the fingertip the cuticle sits: at
     length factor 1 the plate is seated so its free edge lands exactly on the
     fingertip, shorter sets pull just inside it, and only long / xlong reach
     past it. */
  var PLATE_W = 0.945;
  var PLATE_AT = 0.80;
  var PLATE_SEAT = 0.16;

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
  /* Skin in shadow is NOT skin plus grey. The light that finds its way back
     out of a shaded piece of skin has travelled through blood on the way, so
     as skin darkens it also turns toward red-orange and GAINS saturation.
     Multiplying the tone through a warm filter does exactly that; mixing it
     toward black, grey or plum does the opposite and is why shaded skin ends
     up looking bruised or dirty. t: 0 = lit, 1 = deepest. Every shadow tone
     on the hand comes from here. */
  function bloodShade(c, t) {
    var A = parseHex(c);
    if (!A) return '#000000';
    t = clamp(num(t, 0), 0, 1);
    return toHex(A.r * (1 - 0.21 * t), A.g * (1 - 0.55 * t), A.b * (1 - 0.65 * t));
  }
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
      /* a placement may carry its own artwork: `art` is a vector id drawn by
         SN.Art, `image` a data-url photo. Either overrides the store item. */
      art: typeof c.art === 'string' ? c.art : '',
      image: typeof c.image === 'string' ? c.image : '',
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
  /* 5. Paint helpers                                                        */
  /*                                                                         */
  /*  THE LIGHT. One source for the whole scene: high, to the LEFT, slightly */
  /*  in front. Everything in this file — the cast shadow's direction, the   */
  /*  bright side of the C-curve, the specular hot spot, the rim light, the  */
  /*  shading of the hand itself — is derived from this one vector, which is */
  /*  why the picture holds together. It points FROM the surface TOWARDS the */
  /*  light, in WORLD space (x right, y down).                              */
  /*                                                                         */
  /*  SHARED DEFS. A ten nail preview used to build ten copies of every      */
  /*  gradient and filter. Now a render pass opens one context and every     */
  /*  gradient / filter / clip is memoised on its own definition, so ten     */
  /*  identical nails cost exactly one of each. This is the whole mobile     */
  /*  performance story — filters are the expensive part, and they are now   */
  /*  both rare and shared.                                                  */
  /* ====================================================================== */

  var LIGHT = { x: -0.56, y: -0.83 };

  var CTX = null;

  function ctxOpen(defsEl) {
    var prev = CTX;
    CTX = { defs: defsEl, cache: {} };
    return prev;
  }
  function ctxClose(prev) { CTX = prev || null; }

  /* every def-maker funnels through here: same key -> same url(#id) */
  function shared(localDefs, key, make) {
    var d = (CTX && CTX.defs) ? CTX.defs : localDefs;
    if (CTX && CTX.cache[key]) return CTX.cache[key];
    var ref = make(d);
    if (CTX) CTX.cache[key] = ref;
    return ref;
  }

  function grad(defs, type, stops, attrs) {
    var key = 'g|' + type + '|' + JSON.stringify(stops) + '|' + JSON.stringify(attrs || 0);
    return shared(defs, key, function (d) {
      var id = uid(type === 'radialGradient' ? 'rg' : 'lg'), a = {}, k, i, s;
      if (attrs) for (k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) a[k] = attrs[k];
      a.id = id;
      var el = E(type, a);
      for (i = 0; i < stops.length; i++) {
        s = stops[i];
        el.appendChild(E('stop', {
          offset: f(clamp(s[0], 0, 1) * 100) + '%',
          'stop-color': s[1],
          'stop-opacity': f(s.length > 2 ? s[2] : 1)
        }));
      }
      add(d, el);
      return 'url(#' + id + ')';
    });
  }
  /* vertical  = along the nail, 0 at the free edge, 1 at the cuticle */
  function vGrad(defs, stops) { return grad(defs, 'linearGradient', stops, { x1: 0, y1: 0, x2: 0, y2: 1 }); }
  /* horizontal = across the nail, 0 at the left side wall                */
  function hGrad(defs, stops) { return grad(defs, 'linearGradient', stops, { x1: 0, y1: 0, x2: 1, y2: 0 }); }
  function dGrad(defs, stops, x1, y1, x2, y2) {
    return grad(defs, 'linearGradient', stops, { x1: f(x1), y1: f(y1), x2: f(x2), y2: f(y2) });
  }
  function radGrad(defs, stops, a) {
    return grad(defs, 'radialGradient', stops, a || { cx: 0.5, cy: 0.5, r: 0.6 });
  }

  /* Gaussian blur, quantised so near-identical requests collapse onto one
     definition. Blurs are the only expensive primitive in the file, so they
     are counted: a nail plate uses NONE, a hand uses two, and a pattern may
     use one shared group blur. */
  function blurF(defs, std) {
    var q = Math.max(0.05, Math.round(num(std, 1) * 4) / 4);
    return shared(defs, 'bl|' + q, function (d) {
      var id = uid('bl');
      add(d, E('filter', {
        id: id, x: '-45%', y: '-45%', width: '190%', height: '190%',
        'color-interpolation-filters': 'sRGB'
      }, [E('feGaussianBlur', { stdDeviation: f(q) })]));
      return 'url(#' + id + ')';
    });
  }

  /* organic distortion for marble veins — one definition for the whole page */
  function marbleF(defs, scale, freq, seed) {
    var q = Math.round(scale * 2) / 2;
    var fq = Math.round(freq * 1000) / 1000;
    return shared(defs, 'mb|' + q + '|' + fq + '|' + seed, function (d) {
      var id = uid('mb');
      add(d, E('filter', {
        id: id, x: '-30%', y: '-30%', width: '160%', height: '160%',
        'color-interpolation-filters': 'sRGB'
      }, [
        E('feTurbulence', {
          type: 'fractalNoise', baseFrequency: f(fq), numOctaves: 3,
          seed: seed, result: 'n'
        }),
        E('feDisplacementMap', {
          in: 'SourceGraphic', in2: 'n', scale: f(q),
          xChannelSelector: 'R', yChannelSelector: 'G'
        })
      ]));
      return 'url(#' + id + ')';
    });
  }

  /* A micro speckle used by matte / velvet / airbrushed ombré so a flat fill
     stops looking like a flat fill. One <pattern> for the whole page; it is
     plain geometry, so it rasterises to PNG like anything else. */
  function grainP(defs, tone, op, size) {
    var sz = Math.max(1, Math.round(num(size, 7) * 2) / 2);
    var dots = 26;
    return shared(defs, 'gr|' + tone + '|' + op + '|' + sz, function (d) {
      var id = uid('gr');
      var pt = E('pattern', {
        id: id, width: f(sz), height: f(sz), patternUnits: 'userSpaceOnUse'
      });
      var r = seeded('grain|' + tone), i;
      for (i = 0; i < dots; i++) {
        pt.appendChild(E('circle', {
          cx: f(r() * sz), cy: f(r() * sz), r: f(sz * r.r(0.007, 0.019)),
          fill: tone, opacity: f(op * r.r(0.45, 1))
        }));
      }
      add(d, pt);
      return 'url(#' + id + ')';
    });
  }

  function rect(x, y, w, h, attrs) {
    var a = attrs || {};
    a.x = f(x); a.y = f(y); a.width = f(w); a.height = f(h);
    return E('rect', a);
  }

  /* --------------------------------------------------------------- colour */
  /* Polish is not a flat fill. These three derive the whole tonal range of a
     plate from the one colour the customer picked, and they behave for the
     extremes on purpose: a WHITE nail needs its form carved by shadow (there
     is no headroom to brighten), a BLACK nail can only show form by catching
     light (there is no headroom to darken). Both are tested in the lab. */
  function cLit(c) { var l = lum(c); return lighten(c, 0.07 + (1 - l) * 0.20); }
  function cWall(c) { var l = lum(c); return darken(c, 0.15 + l * 0.19); }
  function cEdge(c) { var l = lum(c); return darken(c, 0.25 + l * 0.26); }
  /* light passes through the thin free edge of a press-on and comes back
     paler and slightly desaturated */
  function cTip(c) { var l = lum(c); return mix(lighten(c, 0.30 + (1 - l) * 0.16), '#FBF2F4', 0.22); }

  /* the plate's own light direction, in the plate's local coordinates
     (x across the nail, y from tip to cuticle) */
  function localLight(opts) {
    var a = rad(num(opts && opts.light, 0));
    var mx = (opts && opts.mirror) ? -LIGHT.x : LIGHT.x;
    var my = LIGHT.y;
    return { x: Math.cos(a) * mx + Math.sin(a) * my, y: -Math.sin(a) * mx + Math.cos(a) * my };
  }

  /* ====================================================================== */
  /* 6. Patterns (SPEC section 8)                                            */
  /*                                                                         */
  /*    Every one of these is a salon technique, not a diagram. They paint    */
  /*    inside the clipped plate box (0,0)-(w,h) using ctx:                   */
  /*      w,h  plate box     u   1/100 of the plate width (the scale unit)    */
  /*      c1   pattern.color c2  pattern.color2   base  the nail colour       */
  /*      S    pattern.scale 0.6..1.6 (motif size / tip depth)                */
  /*      L    the local light vector    q  detail budget 0.35..1             */
  /*      rnd  seeded PRNG   defs  where gradients & filters are registered   */
  /* ====================================================================== */

  var PATTERNS = {};

  /* --- the classic smile line ------------------------------------------- */
  function smile(x, depth, curve) {
    return pb().M(-x.w * 0.28, depth * (1 - curve))
      .C(x.w * 0.22, depth * (1 + curve * 1.5), x.w * 0.78, depth * (1 + curve * 1.5),
         x.w * 1.28, depth * (1 - curve)).d();
  }

  PATTERNS.french = function (g, x) {
    var d = x.h * 0.185 * x.S;
    var line = smile(x, d, 0.42);
    /* the tip itself, faintly deeper where it meets the smile line */
    add(g, E('path', {
      d: line + ' L' + f(x.w * 1.28) + ' ' + f(-x.h * 0.3) +
         ' L' + f(-x.w * 0.28) + ' ' + f(-x.h * 0.3) + ' Z',
      fill: vGrad(x.defs, [
        [0, cTip(x.c1)], [0.45, x.c1], [1, mix(x.c1, cWall(x.c1), 0.55)]
      ]), opacity: 0.94
    }));
    /* a real French tip is a SECOND layer: it has a lip that catches light on
       top of the smile line and drops a hairline of shadow below it */
    add(g, E('path', {
      d: line, fill: 'none', stroke: lighten(x.c1, 0.55),
      'stroke-width': f(x.u * 0.9), opacity: 0.75
    }));
    add(g, E('path', {
      d: line, fill: 'none', stroke: darken(x.base, 0.28),
      'stroke-width': f(x.u * 1.5), opacity: 0.20,
      transform: 'translate(0 ' + f(x.u * 1.3) + ')'
    }));
  };

  PATTERNS.frenchDeep = function (g, x) {
    var d = x.h * 0.34 * x.S;
    var line = smile(x, d, 0.30);
    add(g, E('path', {
      d: line + ' L' + f(x.w * 1.28) + ' ' + f(-x.h * 0.3) +
         ' L' + f(-x.w * 0.28) + ' ' + f(-x.h * 0.3) + ' Z',
      fill: vGrad(x.defs, [[0, cTip(x.c1)], [0.5, x.c1], [1, mix(x.c1, cWall(x.c1), 0.55)]])
    }));
    add(g, E('path', {
      d: line, fill: 'none', stroke: x.c2, 'stroke-width': f(x.u * 1.6), opacity: 0.7
    }));
    add(g, E('path', {
      d: line, fill: 'none', stroke: lighten(x.c1, 0.5), 'stroke-width': f(x.u * 0.7),
      opacity: 0.6, transform: 'translate(0 ' + f(-x.u * 1.1) + ')'
    }));
  };

  PATTERNS.tipsGlitter = function (g, x) {
    var depth = x.h * 0.42 * x.S, i, t, r, op, n = Math.round(120 * x.q);
    add(g, rect(-1, -1, x.w + 2, depth + 1, {
      fill: vGrad(x.defs, [[0, x.c1, 1], [0.42, x.c1, 0.55], [0.78, x.c1, 0.12], [1, x.c1, 0]])
    }));
    for (i = 0; i < n; i++) {
      t = x.rnd(); t = t * t;
      r = x.rnd.r(0.3, 1.8) * x.u;
      op = clamp(x.rnd.r(0.3, 1) * (1 - t * 0.5), 0.05, 1);
      add(g, E('circle', {
        cx: f(x.rnd() * x.w), cy: f(t * depth * 1.1), r: f(r),
        fill: x.rnd() < 0.5 ? '#FFFFFF' : (x.rnd() < 0.55 ? x.c1 : x.c2),
        opacity: f(op)
      }));
    }
  };

  /* airbrushed: a long soft ramp plus the fine grain a real airbrush leaves,
     which is what kills the banding an SVG gradient shows on a phone */
  PATTERNS.ombre = function (g, x) {
    var mid = clamp(0.5 * (2 - x.S), 0.16, 0.84);
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: vGrad(x.defs, [
        [0, x.c1], [mid * 0.5, mix(x.c1, x.c2, 0.22)], [mid, mix(x.c1, x.c2, 0.5)],
        [mid + (1 - mid) * 0.5, mix(x.c1, x.c2, 0.8)], [1, x.c2]
      ])
    }));
    if (x.q >= 0.7) {
      add(g, rect(-1, -1, x.w + 2, x.h + 2, {
        fill: grainP(x.defs, '#FFFFFF', 0.5, x.u * 15), opacity: 0.4
      }));
    }
  };

  PATTERNS.ombreV = function (g, x) {
    var mid = clamp(0.5 * (2 - x.S), 0.16, 0.84);
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: hGrad(x.defs, [
        [0, x.c1], [mid * 0.5, mix(x.c1, x.c2, 0.22)], [mid, mix(x.c1, x.c2, 0.5)],
        [mid + (1 - mid) * 0.5, mix(x.c1, x.c2, 0.8)], [1, x.c2]
      ])
    }));
    if (x.q >= 0.7) {
      add(g, rect(-1, -1, x.w + 2, x.h + 2, {
        fill: grainP(x.defs, '#FFFFFF', 0.5, x.u * 15), opacity: 0.4
      }));
    }
  };

  PATTERNS.half = function (g, x) {
    var y = clamp(0.5 * x.S, 0.18, 0.84) * x.h;
    add(g, rect(-1, -1, x.w + 2, y + 1, {
      fill: vGrad(x.defs, [[0, cTip(x.c2)], [0.4, x.c2], [1, mix(x.c2, cWall(x.c2), 0.4)]])
    }));
    add(g, rect(-1, y - x.u * 0.5, x.w + 2, x.u * 1, { fill: lighten(x.c1, 0.4), opacity: 0.7 }));
    add(g, rect(-1, y + x.u * 0.5, x.w + 2, x.u * 1.4, { fill: darken(x.base, 0.3), opacity: 0.18 }));
  };

  PATTERNS.diagonal = function (g, x) {
    var y0 = clamp(0.62 * x.S, 0.2, 0.95) * x.h;
    var y1 = clamp(0.20 * x.S, 0.04, 0.6) * x.h;
    add(g, E('path', {
      d: pb().M(-2, y0).L(x.w + 2, y1).L(x.w + 2, -2).L(-2, -2).Z().d(),
      fill: dGrad(x.defs, [[0, cTip(x.c1)], [0.45, x.c1], [1, cWall(x.c1)]], 0, 0, 0.7, 1)
    }));
    add(g, E('path', {
      d: pb().M(-2, y0).L(x.w + 2, y1).d(),
      fill: 'none', stroke: x.c2, 'stroke-width': f(x.u * 1.3), opacity: 0.85
    }));
    add(g, E('path', {
      d: pb().M(-2, y0 + x.u * 1.4).L(x.w + 2, y1 + x.u * 1.4).d(),
      fill: 'none', stroke: darken(x.base, 0.3), 'stroke-width': f(x.u * 1.2), opacity: 0.16
    }));
  };

  /* every painted dot is a tiny dome: a rim of its own shadow and a highlight
     on the light side, otherwise it reads as a hole punched in the colour */
  function dome(g, x, cx, cy, r, fill) {
    add(g, E('circle', { cx: f(cx), cy: f(cy), r: f(r), fill: fill }));
    add(g, E('circle', {
      cx: f(cx + x.L.x * r * 0.34), cy: f(cy + x.L.y * r * 0.34), r: f(r * 0.42),
      fill: '#FFFFFF', opacity: 0.28
    }));
  }

  PATTERNS.dots = function (g, x) {
    var cell = x.w * 0.28 * x.S, row = 0, cx, cy, r;
    for (cy = -cell * 0.3; cy < x.h + cell; cy += cell * 0.9) {
      for (cx = (row % 2 ? cell * 0.5 : 0) - cell * 0.2; cx < x.w + cell; cx += cell) {
        r = cell * 0.19 * x.rnd.r(0.84, 1.14);
        dome(g, x, cx + x.rnd.r(-1, 1) * cell * 0.09, cy + x.rnd.r(-1, 1) * cell * 0.09,
             r, x.rnd() < 0.74 ? x.c1 : x.c2);
      }
      row++;
    }
  };

  PATTERNS.stripes = function (g, x) {
    var gap = x.w * 0.20 * x.S, sw = gap * 0.30, cx;
    for (cx = gap * 0.42; cx < x.w + gap; cx += gap) {
      add(g, rect(cx - sw / 2, -2, sw, x.h + 4, {
        fill: hGrad(x.defs, [[0, cWall(x.c1)], [0.35, lighten(x.c1, 0.25)], [1, cWall(x.c1)]])
      }));
      add(g, rect(cx + gap * 0.5 - sw * 0.2, -2, sw * 0.4, x.h + 4, { fill: x.c2, opacity: 0.9 }));
    }
  };

  PATTERNS.chevron = function (g, x) {
    var step = x.h * 0.18 * x.S, dep = step * 0.8, i, y, n = Math.ceil((x.h * 1.1) / step) + 1;
    for (i = 0; i < n; i++) {
      y = x.h * 0.10 + i * step;
      add(g, E('path', {
        d: pb().M(-3, y).L(x.w / 2, y - dep).L(x.w + 3, y).d(),
        fill: 'none', stroke: i % 2 ? x.c2 : x.c1,
        'stroke-width': f(step * 0.24),
        'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: 0.95
      }));
      add(g, E('path', {
        d: pb().M(-3, y - step * 0.07).L(x.w / 2, y - dep - step * 0.07).L(x.w + 3, y - step * 0.07).d(),
        fill: 'none', stroke: '#FFFFFF', 'stroke-width': f(step * 0.06),
        'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: 0.3
      }));
    }
  };

  /* Real marble is stone seen THROUGH the polish: cloudy fields of the second
     colour, then veins that are thick where they start and thin to nothing.
     The organic wobble comes from one shared turbulence filter, not from the
     path data — hand drawn bezier veins always read as drawn. */
  PATTERNS.marble = function (g, x) {
    var warp = marbleF(x.defs, x.u * 2.2 * x.S, 0.026 / x.S, (hash32(String(x.key)) % 90) + 1);
    var i, j, p, px, py, dx, wob, cloud;

    cloud = add(g, E('g', { filter: warp }));
    add(cloud, rect(-2, -2, x.w + 4, x.h + 4, { fill: x.c2, opacity: 0.14 }));
    for (i = 0; i < 3; i++) {
      add(cloud, E('ellipse', {
        cx: f(x.rnd() * x.w), cy: f(x.rnd() * x.h),
        rx: f(x.w * x.rnd.r(0.34, 0.62) * x.S),
        ry: f(x.h * x.rnd.r(0.16, 0.30) * x.S),
        fill: radGrad(x.defs, [
          [0, i === 1 ? lighten(x.c2, 0.4) : x.c2, 0.7],
          [0.55, i === 1 ? lighten(x.c2, 0.4) : x.c2, 0.34],
          [1, x.c2, 0]
        ])
      }));
    }

    wob = add(g, E('g', { filter: warp }));
    for (i = 0; i < 4; i++) {
      p = pb();
      px = x.rnd.r(-0.15, 1.15) * x.w;
      py = -x.h * 0.12;
      p.M(px, py);
      for (j = 0; j < 4; j++) {
        dx = x.rnd.r(-0.34, 0.34) * x.w;
        p.Q(px + dx, py + x.h * 0.17, px + dx * 0.55, py + x.h * 0.33);
        px += dx * 0.55;
        py += x.h * 0.33;
      }
      /* A vein is thick where it starts and thins to nothing. Three passes,
         each shorter and finer than the last, with a dash that runs out —
         that is what stops it looking like a drawn line. */
      add(wob, E('path', {
        d: p.d(), fill: 'none', stroke: x.c1,
        'stroke-width': f(x.u * (3.2 - i * 0.55) * x.S),
        'stroke-linecap': 'round', opacity: f(0.20 - i * 0.03),
        'stroke-dasharray': f(x.h * (1.1 - i * 0.2)) + ' ' + f(x.h * 2)
      }));
      add(wob, E('path', {
        d: p.d(), fill: 'none', stroke: x.c1,
        'stroke-width': f(x.u * (1.5 - i * 0.26) * x.S),
        'stroke-linecap': 'round', opacity: f(0.44 - i * 0.06),
        'stroke-dasharray': f(x.h * (0.85 - i * 0.16)) + ' ' + f(x.h * 2)
      }));
      add(wob, E('path', {
        d: p.d(), fill: 'none', stroke: lighten(x.c1, 0.3),
        'stroke-width': f(x.u * (0.6 - i * 0.09) * x.S),
        'stroke-linecap': 'round', opacity: f(0.5 - i * 0.08),
        'stroke-dasharray': f(x.h * (0.5 - i * 0.09)) + ' ' + f(x.h * 2)
      }));
    }
  };

  /* chrome AS A PATTERN: the same mirror model the chrome finish uses, but
     driven by the customer's two colours instead of the nail colour */
  function mirrorFill(defs, c, tint) {
    /* Metal is a desaturated version of the colour with a lot of range on it */
    var m = mix(c, tint || c, 0.35);
    var g0 = mix(m, '#8E8792', 0.16);
    /* Slightly off vertical: a real hand is never square to the room, and a
       dead level band is the single biggest tell that this is a gradient. */
    return grad(defs, 'linearGradient', [
      [0.00, darken(g0, 0.34)],
      [0.15, darken(g0, 0.26)],
      [0.25, darken(g0, 0.22)],
      [0.265, lighten(g0, 0.74)],   /* the horizon: a hard edge, like a room */
      [0.33, lighten(g0, 0.40)],
      [0.42, lighten(g0, 0.10)],
      [0.50, darken(g0, 0.16)],
      [0.60, darken(g0, 0.30)],
      [0.615, darken(g0, 0.04)],
      [0.74, mix(g0, '#FFFFFF', 0.26)],
      [0.87, lighten(g0, 0.58)],
      [1.00, mix(g0, '#FFFFFF', 0.34)]
    ], { x1: 0.34, y1: 0, x2: 0.66, y2: 1 });
  }

  PATTERNS.chrome = function (g, x) {
    add(g, rect(-1, -1, x.w + 2, x.h + 2, { fill: mirrorFill(x.defs, x.c1, x.c2) }));
    /* the reflection is bent by the C-curve, so the bands bow */
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: hGrad(x.defs, [
        [0, '#0B0709', 0.5], [0.13, '#0B0709', 0.16],
        [0.32, '#FFFFFF', 0.22], [0.42, '#FFFFFF', 0.05],
        [0.72, '#0B0709', 0.12], [1, '#0B0709', 0.46]
      ])
    }));
    add(g, E('path', {
      d: x.d, fill: 'none', stroke: '#FFFFFF',
      'stroke-width': f(x.u * 1.4), opacity: 0.6
    }));
  };

  /* Glazed donut: a pearlescent veil, NOT a white wash. Fine shimmer plus a
     hue that travels across the surface — pink into blue into gold. */
  PATTERNS.glazed = function (g, x) {
    var i, n = Math.round(60 * x.q), r;
    /* The glazed donut is an IRIDESCENT veil, not a white wash: the hue has
       to travel across the surface — warm pink into violet into ice blue into
       gold — or it just looks like someone breathed on the nail. */
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      opacity: f(0.55 + x.S * 0.35),
      fill: dGrad(x.defs, [
        [0.00, mix(x.c1, '#FF9EC8', 0.55), 0.85],
        [0.20, mix(x.c2, '#B79BFF', 0.6), 0.7],
        [0.42, mix(x.c1, '#8ED6FF', 0.62), 0.72],
        [0.62, mix(x.c1, '#A8FFD5', 0.5), 0.62],
        [0.82, mix(x.c2, '#FFD98A', 0.6), 0.7],
        [1.00, mix(x.c1, '#FFB0D8', 0.55), 0.85]
      ], 0, 1, 1, 0)
    }));
    /* the pearl itself: a hard-edged bloom, the way a chrome powder buffs up */
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: dGrad(x.defs, [
        [0.10, '#FFFFFF', 0], [0.30, '#FFFFFF', 0.55],
        [0.44, '#FFFFFF', 0.15], [0.70, '#FFFFFF', 0]
      ], 0, 0, 1, 0.55)
    }));
    /* the pearl bloom sits where the light is */
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: radGrad(x.defs, [
        [0, '#FFFFFF', 0.8], [0.30, mix(x.c1, '#FFFFFF', 0.6), 0.5],
        [0.66, mix(x.c2, '#FFFFFF', 0.35), 0.2], [1, x.c2, 0]
      ], { cx: f(0.5 + x.L.x * 0.16), cy: f(0.34 + x.L.y * 0.10), r: 0.82 })
    }));
    for (i = 0; i < n; i++) {
      r = x.rnd.r(0.2, 0.8) * x.u;
      add(g, E('circle', {
        cx: f(x.rnd() * x.w), cy: f(x.rnd() * x.h), r: f(r),
        fill: x.rnd.pick(['#FFFFFF', '#FFD8EC', '#CFE6FF', '#FFF0C8', '#D9FFEC']),
        opacity: f(x.rnd.r(0.35, 0.9))
      }));
    }
  };

  /* A leopard rosette is a BROKEN ring — three or four separate arc strokes
     of different weights around a warmer, softer centre — never a dashed
     ellipse, which is the tell of a computer drawing one. */
  function rosette(g, x, cx, cy, s, ang, dark, warm) {
    var i, a0, a1, r1 = s * 0.54, r2 = s * 0.42, p, n = x.rnd.i(3, 4);
    var gg = add(g, E('g', { transform: 'rotate(' + f(ang) + ' ' + f(cx) + ' ' + f(cy) + ')' }));
    add(gg, E('ellipse', {
      cx: f(cx), cy: f(cy), rx: f(s * 0.34), ry: f(s * 0.28),
      fill: radGrad(x.defs, [[0, warm, 0.72], [0.55, warm, 0.42], [1, warm, 0]])
    }));
    a0 = x.rnd.r(0, 6.28);
    for (i = 0; i < n; i++) {
      a1 = a0 + (6.28 / n) * x.rnd.r(0.52, 0.78);
      p = pb().M(cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r2)
        .A(r1, r2, 0, 0, 1, cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r2);
      add(gg, E('path', {
        d: p.d(), fill: 'none', stroke: dark,
        'stroke-width': f(s * x.rnd.r(0.16, 0.25)),
        'stroke-linecap': 'round', opacity: f(x.rnd.r(0.82, 1))
      }));
      a0 += (6.28 / n) * x.rnd.r(0.95, 1.05);
    }
  }

  PATTERNS.leopard = function (g, x) {
    /* A rosette is a dark ring around a WARMER centre — whichever way round
       the customer picked her two colours, the ring has to be the darker one
       or the print reads as white worms instead of leopard. */
    var dark = lum(x.c1) <= lum(x.c2) ? x.c1 : x.c2;
    var warm = lum(x.c1) <= lum(x.c2) ? x.c2 : x.c1;
    var cell = x.w * 0.40 * x.S, row = 0, gx, gy, s;
    /* the centre of a rosette is a warmer TINT of the nail, never a hole
       punched in it, whatever the customer picked as her second colour */
    warm = mix(warm, mix(x.base, '#E8A055', 0.30), 0.45);
    if (Math.abs(lum(dark) - lum(warm)) < 0.14) warm = lighten(warm, 0.30);
    for (gy = -cell * 0.25; gy < x.h + cell * 0.45; gy += cell * 0.88) {
      for (gx = (row % 2 ? cell * 0.5 : 0) - cell * 0.2; gx < x.w + cell * 0.45; gx += cell) {
        s = x.w * 0.33 * x.S * x.rnd.r(0.66, 1.24);
        rosette(g, x, gx + x.rnd.r(-1, 1) * cell * 0.16, gy + x.rnd.r(-1, 1) * cell * 0.16,
                s, x.rnd.r(-70, 70), dark, warm);
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
          fill: (r + c) % 2 ? x.c2 : x.c1, opacity: 0.96
        }));
        c++;
      }
      r++;
    }
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: hGrad(x.defs, [[0, '#0B0709', 0.26], [0.36, '#FFFFFF', 0.1], [1, '#0B0709', 0.24]])
    }));
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

  /* painted motifs sit ON the colour: a hairline of shadow underneath them
     and a lit top edge, so they have thickness */
  function painted(g, x, d, fill, ang, cx, cy) {
    var tf = 'rotate(' + f(ang) + ' ' + f(cx) + ' ' + f(cy) + ')';
    add(g, E('path', {
      d: d, fill: darken(x.base, 0.34), opacity: 0.18,
      transform: tf + ' translate(' + f(x.u * 0.9) + ' ' + f(x.u * 1.2) + ')'
    }));
    add(g, E('path', { d: d, fill: fill, transform: tf }));
    add(g, E('path', {
      d: d, fill: 'none', stroke: lighten(fill, 0.45), 'stroke-width': f(x.u * 0.5),
      opacity: 0.5, transform: tf
    }));
  }

  PATTERNS.hearts = function (g, x) {
    motifs(g, x, function (cx, cy, s, ang, fill) {
      painted(g, x, heartPath(cx, cy, s * 0.78), fill, ang, cx, cy);
    });
  };

  PATTERNS.stars = function (g, x) {
    motifs(g, x, function (cx, cy, s, ang, fill) {
      painted(g, x, starPath(cx, cy, s * 0.44, 5, 0.42), fill, ang, cx, cy);
    });
  };

  PATTERNS.flames = function (g, x) {
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
    add(g, E('path', {
      d: tongues(1),
      fill: vGrad(x.defs, [[0, lighten(x.c2, 0.2)], [0.6, x.c2], [1, cWall(x.c2)]])
    }));
    add(g, E('path', {
      d: tongues(0.58),
      fill: vGrad(x.defs, [[0, lighten(x.c1, 0.3)], [0.7, x.c1], [1, cWall(x.c1)]])
    }));
  };

  PATTERNS.lace = function (g, x) {
    var i, y, sc, cx, p, n = Math.round(16 * x.q);
    for (i = 0; i < 4; i++) {
      y = x.h * 0.92 - i * (x.h * 0.115 * x.S);
      add(g, E('path', {
        d: pb().M(-x.w * 0.1, y)
          .C(x.w * 0.26, y - x.h * 0.09, x.w * 0.74, y - x.h * 0.09, x.w * 1.1, y).d(),
        fill: 'none', stroke: i % 2 ? x.c2 : x.c1,
        'stroke-width': f(x.u * (i === 0 ? 2.6 : 1.9) * x.S),
        'stroke-linecap': 'round',
        'stroke-dasharray': i === 0 ? null : f(x.u * 0.3) + ' ' + f(x.u * 3.2 * x.S),
        opacity: 0.95
      }));
    }
    sc = x.w * 0.16 * x.S;
    y = x.h * 0.92 - 4 * (x.h * 0.115 * x.S);
    p = pb().M(-x.w * 0.1, y + sc * 0.3);
    for (cx = -x.w * 0.1; cx < x.w * 1.1; cx += sc) {
      p.A(sc * 0.5, sc * 0.5, 0, 0, 1, cx + sc, y + sc * 0.3);
    }
    add(g, E('path', {
      d: p.d(), fill: 'none', stroke: x.c1,
      'stroke-width': f(x.u * 1.8 * x.S), opacity: 0.95
    }));
    for (i = 0; i < n; i++) {
      add(g, E('circle', {
        cx: f(x.rnd() * x.w), cy: f(x.h * x.rnd.r(0.45, 0.95)),
        r: f(x.u * x.rnd.r(0.4, 1.1) * x.S),
        fill: x.c1, opacity: f(x.rnd.r(0.4, 0.9))
      }));
    }
  };

  /* Magnetic cat eye. A deep, saturated base — magnetic gel is always dark —
     and one bright band pulled up out of it by the magnet, brightest at its
     core, falling off smoothly on both sides, with the faint chromatic shift
     along its length that a real magnetic pigment gives you. The falloff is
     built from stacked strokes and finished with ONE shared blur, so ten of
     them still cost one filter definition and one small filter region each. */
  PATTERNS.catEye = function (g, x) {
    var deep = darken(x.c2, 0.34);
    var band = pb()
      .M(-x.w * 0.14, x.h * 0.86)
      .C(x.w * 0.26, x.h * 0.72, x.w * 0.60, x.h * 0.48, x.w * 1.14, x.h * 0.14).d();
    var core = mix(x.c1, '#FFFFFF', 0.30);
    var shift = dGrad(x.defs, [
      [0, mix(core, '#FFD9B0', 0.45)], [0.42, core],
      [0.7, mix(core, '#CFE6FF', 0.35)], [1, mix(x.c1, '#E6C7FF', 0.3)]
    ], 0, 1, 1, 0);
    var gg, i;
    var W = [0.52, 0.38, 0.27, 0.185, 0.115, 0.07];
    var O = [0.12, 0.16, 0.21, 0.28, 0.38, 0.58];

    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: vGrad(x.defs, [[0, darken(deep, 0.12)], [0.5, deep], [1, darken(deep, 0.22)]])
    }));
    gg = add(g, E('g', { filter: blurF(x.defs, x.u * 1.5) }));
    for (i = 0; i < W.length; i++) {
      add(gg, E('path', {
        d: band, fill: 'none', stroke: i >= 4 ? shift : x.c1,
        'stroke-width': f(x.w * W[i] * (0.62 + x.S * 0.38)),
        'stroke-linecap': 'round', opacity: f(O[i])
      }));
    }
    add(gg, E('path', {
      d: band, fill: 'none', stroke: mix(core, '#FFFFFF', 0.5),
      'stroke-width': f(x.w * 0.028 * (0.62 + x.S * 0.38)),
      'stroke-linecap': 'round', opacity: 0.65
    }));
  };

  /* Aura: a bloom that glows OUT of the nail, tightest in the middle third */
  PATTERNS.aura = function (g, x) {
    var r = clamp(0.40 * x.S, 0.24, 0.66);
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: radGrad(x.defs, [
        [0, mix(x.c1, '#FFFFFF', 0.35), 0.95], [0.22, x.c1, 0.8],
        [0.5, mix(x.c1, x.c2, 0.55), 0.5], [0.78, x.c2, 0.22], [1, x.c2, 0]
      ], { cx: 0.5, cy: 0.40, r: f(r) })
    }));
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: radGrad(x.defs, [
        [0, '#FFFFFF', 0.4], [0.55, '#FFFFFF', 0.08], [1, '#FFFFFF', 0]
      ], { cx: 0.5, cy: 0.40, r: f(r * 0.55) })
    }));
  };

  /* ====================================================================== */
  /* 7. Finishes                                                             */
  /*                                                                         */
  /*  Each of the six has ONE thing that makes it unmistakable at a glance,   */
  /*  and the job here is to make that thing loud:                            */
  /*    gloss   a tight hot spot next to a broad wet reflection               */
  /*    matte   the ABSENCE of any specular at all                            */
  /*    glitter particles at different depths, denser toward the tip          */
  /*    chrome  a reflected room, with a hard horizon                         */
  /*    velvet  a diffused pile with a fuzzy edge                             */
  /*    jelly   you can see through it                                        */
  /*  ctx: w,h,u,d,color,defs,rnd,L (local light),q (detail budget)           */
  /* ====================================================================== */

  var FINISHES = {};

  /* the hot spot + the broad reflection, both placed by the light vector and
     both squeezed toward the bright line of the C-curve */
  function specular(g, x, strength) {
    var peak = clamp(0.5 + x.L.x * 0.18, 0.22, 0.78);
    var hy = clamp(0.34 + x.L.y * 0.09, 0.12, 0.52);
    var bx = peak * x.w, by = hy * x.h;
    var rw = x.w * 0.20, rh = Math.min(x.h * 0.22, x.w * 0.36);
    /* the broad, soft reflection — long, because the nail is a cylinder */
    add(g, E('ellipse', {
      cx: f(bx), cy: f(by + rh * 0.35), rx: f(rw), ry: f(rh * 1.5),
      fill: radGrad(x.defs, [
        [0, '#FFFFFF', f(0.62 * strength)], [0.5, '#FFFFFF', f(0.24 * strength)], [1, '#FFFFFF', 0]
      ]),
      transform: 'rotate(' + f(x.L.x * 14) + ' ' + f(bx) + ' ' + f(by + rh * 0.35) + ')'
    }));
    /* the hot spot: small and hard, this is what says "wet" */
    add(g, E('ellipse', {
      cx: f(bx - x.w * 0.028), cy: f(by - rh * 0.34), rx: f(x.w * 0.055), ry: f(rh * 0.28),
      fill: radGrad(x.defs, [
        [0, '#FFFFFF', f(1 * strength)], [0.5, '#FFFFFF', f(0.9 * strength)],
        [0.8, '#FFFFFF', f(0.28 * strength)], [1, '#FFFFFF', 0]
      ]),
      transform: 'rotate(' + f(x.L.x * 18) + ' ' + f(bx) + ' ' + f(by) + ')'
    }));
    /* the far side of the cylinder picks up a wide, weak bounce — a smear,
       never a second blob, or the nail grows a pair of eyes. At hand scale a
       plate is about twenty pixels across and this is simply not visible, so
       the detail budget drops it: ten nails, ten fewer gradient fills. */
    if (x.q < 0.7) return;
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: hGrad(x.defs, [
        [f(clamp(peak + 0.22, 0.3, 0.86)), '#FFFFFF', 0],
        [f(clamp(peak + 0.40, 0.5, 0.95)), '#FFFFFF', f(0.14 * strength)],
        [1, '#FFFFFF', 0]
      ])
    }));
  }

  FINISHES.gloss = function (g, x) {
    specular(g, x, 1);
  };

  /* No specular. None. A matte topcoat scatters everything, so all you get is
     a very wide, very weak lift on the lit side and a velvety micro texture —
     and the missing highlight is exactly what the eye reads as "matte". */
  FINISHES.matte = function (g, x) {
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: radGrad(x.defs, [
        [0, '#FFFFFF', 0.16], [0.55, '#FFFFFF', 0.05], [1, '#FFFFFF', 0]
      ], { cx: f(clamp(0.5 + x.L.x * 0.2, 0.2, 0.8)), cy: f(clamp(0.4 + x.L.y * 0.12, 0.12, 0.7)), r: 0.85 })
    }));
    if (x.q >= 0.7) {
      add(g, rect(-1, -1, x.w + 2, x.h + 2, {
        fill: grainP(x.defs, '#FFFFFF', 0.6, x.u * 13), opacity: 0.55
      }));
      add(g, rect(-1, -1, x.w + 2, x.h + 2, {
        fill: grainP(x.defs, darken(x.color, 0.55), 0.5, x.u * 17), opacity: 0.28
      }));
    }
    /* matte kills the rim: paint a little of the wall tone back over it */
    add(g, E('path', {
      d: x.d, fill: 'none', stroke: cWall(x.color),
      'stroke-width': f(x.u * 2.2), opacity: 0.42
    }));
  };

  /* Suspended particles at several depths, inside a gloss topcoat. Density
     rises toward the free edge, the way a real glitter gel settles. */
  FINISHES.glitter = function (g, x) {
    var i, r, cx, cy, t, n1 = Math.round(96 * x.q), n2 = Math.round(14 * x.q),
        n3 = Math.round(6 * x.q);
    var tones = ['#FFFFFF', lighten(x.color, 0.62), '#F8E6B6', lighten(x.color, 0.88), '#FCEFF8'];

    /* the suspension itself: a faint milky depth under the particles */
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: vGrad(x.defs, [[0, '#FFFFFF', 0.20], [0.45, '#FFFFFF', 0.06], [1, '#FFFFFF', 0.02]])
    }));
    /* deep dust — small, dim, out of focus */
    for (i = 0; i < n1; i++) {
      t = x.rnd(); t = t * t;                       /* bias toward the tip */
      cx = x.rnd() * x.w; cy = t * x.h;
      r = x.rnd.r(0.28, 1.15) * x.u;
      add(g, E('circle', {
        cx: f(cx), cy: f(cy), r: f(r), fill: x.rnd.pick(tones),
        opacity: f(x.rnd.r(0.18, 0.6))
      }));
    }
    /* flakes — larger, brighter, with a facet */
    for (i = 0; i < n2; i++) {
      t = x.rnd(); t = t * t;
      cx = x.rnd() * x.w; cy = t * x.h;
      r = x.rnd.r(1.3, 2.8) * x.u;
      add(g, E('path', {
        d: starPath(cx, cy, r, 3, 0.62), fill: x.rnd.pick(tones),
        opacity: f(x.rnd.r(0.55, 0.95)),
        transform: 'rotate(' + f(x.rnd.r(0, 120)) + ' ' + f(cx) + ' ' + f(cy) + ')'
      }));
    }
    /* the few that are catching the light dead on */
    for (i = 0; i < n3; i++) {
      t = x.rnd(); t = t * t;
      cx = x.rnd() * x.w; cy = t * x.h;
      r = x.rnd.r(2.6, 4.6) * x.u;
      add(g, E('path', {
        d: starPath(cx, cy, r, 4, 0.18), fill: '#FFFFFF',
        opacity: f(x.rnd.r(0.6, 1)),
        transform: 'rotate(' + f(x.rnd.r(0, 90)) + ' ' + f(cx) + ' ' + f(cy) + ')'
      }));
      add(g, E('circle', { cx: f(cx), cy: f(cy), r: f(r * 0.28), fill: '#FFFFFF', opacity: 0.9 }));
    }
    /* and it is all under a gloss topcoat */
    specular(g, x, 0.75);
  };

  /* A MIRROR, not shiny paint. Dark, bright, dark bands with a hard horizon
     where the reflected room ends, tinted by the colour, finished with a
     bright metal edge. */
  FINISHES.chrome = function (g, x) {
    add(g, rect(-1, -1, x.w + 2, x.h + 2, { fill: mirrorFill(x.defs, x.color) }));
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: hGrad(x.defs, [
        [0, '#07050A', 0.55], [0.12, '#07050A', 0.18],
        [f(clamp(0.5 + x.L.x * 0.2, 0.2, 0.8)), '#FFFFFF', 0.26],
        [0.55, '#FFFFFF', 0.04], [0.78, '#07050A', 0.14], [1, '#07050A', 0.5]
      ])
    }));
    /* a single hard streak — the edge of something in the room */
    add(g, E('path', {
      d: pb().M(x.w * 0.16, -2).L(x.w * 0.38, -2).L(x.w * 0.14, x.h + 2).L(-2, x.h + 2).Z().d(),
      fill: '#FFFFFF', opacity: 0.09
    }));
    add(g, E('path', {
      d: x.d, fill: 'none', stroke: '#FFFFFF', 'stroke-width': f(x.u * 1.5), opacity: 0.7
    }));
  };

  /* Flocked pile: light goes in and comes back diffused, the silhouette is
     slightly fuzzy, and there is a broad sheen instead of a highlight. */
  FINISHES.velvet = function (g, x) {
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: radGrad(x.defs, [
        [0, lighten(x.color, 0.42), 0.62], [0.45, lighten(x.color, 0.22), 0.28],
        [0.8, x.color, 0.05], [1, x.color, 0]
      ], { cx: f(clamp(0.5 + x.L.x * 0.14, 0.24, 0.76)), cy: f(clamp(0.4 + x.L.y * 0.1, 0.14, 0.7)), r: 0.72 })
    }));
    /* pile crushed at the rim always goes dark */
    add(g, E('path', {
      d: x.d, fill: 'none', stroke: darken(x.color, 0.45),
      'stroke-width': f(x.u * 8), opacity: 0.42, filter: blurF(x.defs, x.u * 2.2)
    }));
    if (x.q >= 0.7) {
      add(g, rect(-1, -1, x.w + 2, x.h + 2, {
        fill: grainP(x.defs, lighten(x.color, 0.8), 0.55, x.u * 11), opacity: 0.4
      }));
    }
  };

  /* Translucent. The plate opacity is dropped in nailSVG so whatever is
     behind it shows through; here we add the tell-tale pooling of colour at
     the edges and one glassy highlight. */
  FINISHES.jelly = function (g, x) {
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: radGrad(x.defs, [
        [0, '#FFFFFF', 0.34], [0.5, '#FFFFFF', 0.1], [1, '#FFFFFF', 0]
      ], { cx: 0.5, cy: 0.5, r: 0.62 })
    }));
    add(g, E('path', {
      d: x.d, fill: 'none', stroke: darken(x.color, 0.28),
      'stroke-width': f(x.u * 7), opacity: 0.5
    }));
    add(g, E('path', {
      d: x.d, fill: 'none', stroke: darken(x.color, 0.4),
      'stroke-width': f(x.u * 2.6), opacity: 0.45
    }));
    specular(g, x, 0.9);
  };

  /* ====================================================================== */
  /* 8. Charms                                                               */
  /*                                                                         */
  /*  Three sources, in priority order:                                       */
  /*    art    an id drawn by SN.Art (assets/js/nail-art.js) when it exists    */
  /*    image  a data-url photo, clipped round with its own contact shadow     */
  /*    glyph  the emoji fallback, which is what the store ships today         */
  /*  SN.Art may be absent, may throw, may return nothing: all three are        */
  /*  handled and fall through to the next source.                            */
  /* ====================================================================== */

  function str(v) { return (typeof v === 'string' && v) ? v : ''; }

  /* SN.Art draws its bevels and metals with a block of shared gradients that
     has to be present in the same <svg>, or the art comes out flat and — far
     worse — toPNG rasterises a standalone document with dangling references.
     Injected once per render context, so ten art charms cost one block. */
  function artDefs(localDefs) {
    if (!SN.Art || typeof SN.Art.defs !== 'function') return;
    shared(localDefs, 'sn-art-defs', function (d) {
      var src = null;
      try { src = SN.Art.defs(); } catch (e) { src = null; }
      if (src) while (src.firstChild) d.appendChild(src.firstChild);
      return 1;
    });
  }

  function charmShadow(g, size, L, defs) {
    add(g, E('ellipse', {
      cx: f(-L.x * size * 0.13), cy: f(-L.y * size * 0.13 + size * 0.05),
      rx: f(size * 0.52), ry: f(size * 0.5),
      fill: radGrad(defs, [
        [0, '#25141B', 0.42], [0.55, '#25141B', 0.22], [1, '#25141B', 0]
      ])
    }));
  }

  function charmEl(c, w, h, mirror, ink, L, defs, q) {
    var item = sFind('charms', c.id);
    var size = w * 0.26 * c.s;
    var tf = 'translate(' + f(c.x * w) + ' ' + f(c.y * h) + ')';
    var art = str(c.art) || (item ? str(item.art) : '');
    var img = str(c.image) || (item ? str(item.image) : '');
    var g, txt, glyph, node, clipId, tint;

    if (c.r) tf += ' rotate(' + f(c.r) + ')';
    if (mirror) tf += ' scale(-1 1)';
    g = E('g', { 'class': 'nail-charm', transform: tf });

    /* 1. a vector charm drawn by SN.Art (assets/js/nail-art.js). It may not be
       loaded, may not know this id, may throw, or may hand back an empty
       group — all four fall through to the next source. */
    if (art && SN.Art && typeof SN.Art.node === 'function' &&
        (typeof SN.Art.has !== 'function' || SN.Art.has(art))) {
      node = null;
      try {
        artDefs(defs);
        node = SN.Art.node(art, {
          size: size, color: ink, seed: String(c.id || art),
          lod: (num(q, 1) < 0.7) ? 'lite' : 'full'
        });
      } catch (e) { node = null; }
      if (node && node.nodeType === 1 && node.firstChild) {
        charmShadow(g, size, L, defs);
        add(g, node);
        return g;
      }
    }

    /* 2. a real photo */
    if (img) {
      charmShadow(g, size, L, defs);
      clipId = uid('cc');
      add(g, E('defs', null, [
        E('clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' }, [
          E('rect', {
            x: f(-size / 2), y: f(-size / 2), width: f(size), height: f(size),
            rx: f(size * 0.30), ry: f(size * 0.30)
          })
        ])
      ]));
      add(g, E('g', { 'clip-path': 'url(#' + clipId + ')' }, [
        E('image', {
          x: f(-size / 2), y: f(-size / 2), width: f(size), height: f(size),
          href: img, 'xlink:href': img, preserveAspectRatio: 'xMidYMid slice'
        })
      ]));
      /* it is sitting under the same topcoat as everything else */
      add(g, E('rect', {
        x: f(-size / 2), y: f(-size / 2), width: f(size), height: f(size),
        rx: f(size * 0.30), ry: f(size * 0.30),
        fill: 'none', stroke: '#FFFFFF', 'stroke-width': f(size * 0.035), opacity: 0.4
      }));
      add(g, E('ellipse', {
        cx: f(L.x * size * 0.2), cy: f(L.y * size * 0.2),
        rx: f(size * 0.2), ry: f(size * 0.13),
        fill: radGrad(defs, [[0, '#FFFFFF', 0.7], [1, '#FFFFFF', 0]]),
        transform: 'rotate(-22)'
      }));
      return g;
    }

    /* 3. the emoji glyph */
    glyph = (item && str(item.glyph)) ? item.glyph : '✦';
    tint = ink || '#3A2129';
    add(g, E('ellipse', {
      cx: f(-L.x * size * 0.10), cy: f(-L.y * size * 0.10 + size * 0.06),
      rx: f(size * 0.42), ry: f(size * 0.36),
      fill: radGrad(defs, [[0, '#25141B', 0.3], [0.6, '#25141B', 0.14], [1, '#25141B', 0]])
    }));
    txt = E('text', {
      x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': f(size), 'font-family': EMOJI_FONT, fill: tint
    });
    txt.appendChild(document.createTextNode(glyph));
    add(g, txt);
    return g;
  }

  /* ====================================================================== */
  /* 9. One nail plate — a curved, glossy, slightly translucent object       */
  /*                                                                         */
  /*  Bottom to top, and every layer obeys the one light:                     */
  /*    0  cast shadow on the finger, thrown away from the light              */
  /*    1  the C-CURVE — the plate is a section of a cylinder, so it is dark   */
  /*       at both side walls and brightest just off centre. This single      */
  /*       layer does more for realism than everything else combined.        */
  /*    2  lengthwise form: darker into the cuticle, brighter across the      */
  /*       upper third                                                        */
  /*    3  the free edge: paler and translucent, with a bright line on the    */
  /*       very edge                                                          */
  /*    4  the pattern                                                        */
  /*    5  the finish                                                         */
  /*    6  charms                                                             */
  /*    7  the contour: absorption at grazing angles all round, and a rim     */
  /*       light on the side facing the source                                */
  /*                                                                         */
  /*  opts: {shape,length,w,h,finishId,id|key,interactive,selected,onPick,     */
  /*         mirror,shadow,light,detail,bed}                                   */
  /* ====================================================================== */

  function nailSVG(nailState, opts) {
    opts = opts || {};
    var n = normNail(nailState);
    var s = shapeId(opts.shape);
    var w = num(opts.w, NAIL_BOX.w);
    var h = num(opts.h, 0);
    var key, u, kind, d, g, defs, clipId, plate, pg, fg, fn, i, ring, hover, sel, cls, onPick;
    var L, q, peak, ybright, tipD, body, jelly, clipG;

    if (!(w > 0)) w = NAIL_BOX.w;
    if (!(h > 0)) h = w * ASPECT[s] * lenFactor(opts.length);

    key = String(opts.key !== undefined && opts.key !== null ? opts.key
      : (opts.id !== undefined && opts.id !== null ? opts.id : 'nail'));
    u = w / 100;
    q = clamp(num(opts.detail, 1), 0.25, 1);
    kind = finishKind((opts.finishId !== undefined && opts.finishId !== null && opts.finishId !== '')
      ? opts.finishId : n.finish);
    d = path(s, w, h);
    sel = !!(opts.selected && selection(opts.selected)[key]);
    L = localLight(opts);
    jelly = kind === 'jelly';

    cls = 'nail' + (sel ? ' is-selected' : '');
    g = E('g', { 'class': cls, 'data-key': key });
    defs = add(g, E('defs'));
    clipId = shared(defs, 'cp|' + d, function (dd) {
      var id = uid('clip');
      add(dd, E('clipPath', { id: id, clipPathUnits: 'userSpaceOnUse' }, [E('path', { d: d })]));
      return id;
    });

    /* --- 0. the cast shadow, thrown away from the light ------------------ */
    /* No blur: the shape is filled with a radial ramp that has already faded
       to nothing by the time it reaches its own silhouette, which is soft for
       free and costs the phone nothing. */
    if (opts.shadow) {
      add(g, E('g', {
        transform: 'translate(' + f(w / 2 - L.x * u * 3.4) + ' ' + f(h / 2 - L.y * u * 3.4) + ') ' +
                   'scale(1.09) translate(' + f(-w / 2) + ' ' + f(-h / 2) + ')'
      }, [
        E('path', {
          d: d,
          fill: radGrad(defs, [
            [0, col(opts.shadow, '#3A2129'), 0.5],
            [0.5, col(opts.shadow, '#3A2129'), 0.34],
            [1, col(opts.shadow, '#3A2129'), 0]
          ], { cx: 0.5, cy: 0.55, r: 0.72 })
        })
      ]));
    }

    /* --- the nail bed under a translucent plate --------------------------- */
    if (opts.bed) {
      add(g, E('g', {
        transform: 'translate(' + f(w / 2) + ' ' + f(h * 0.02) + ') scale(1.035 1) ' +
                   'translate(' + f(-w / 2) + ' 0)'
      }, [
        E('path', {
          d: d,
          fill: vGrad(defs, [
            [0, col(opts.bed, '#E7BCA6')],
            [0.45, mix(col(opts.bed, '#E7BCA6'), '#FFFFFF', 0.10)],
            [1, mix(col(opts.bed, '#E7BCA6'), '#C98A76', 0.5)]
          ])
        }),
        /* the lunula */
        E('ellipse', {
          cx: f(w * 0.5), cy: f(h * 0.955), rx: f(w * 0.30), ry: f(h * 0.075),
          fill: radGrad(defs, [
            [0, '#FFFFFF', 0.6], [0.7, '#FFFFFF', 0.24], [1, '#FFFFFF', 0]
          ])
        })
      ]));
    }

    /* --- 1..3. the plate body -------------------------------------------- */
    peak = clamp(0.5 + L.x * 0.20, 0.22, 0.78);
    ybright = clamp(0.28 + L.y * 0.12, 0.10, 0.52);
    tipD = clamp(0.055 + 0.035 * (w * 1.55 / h), 0.04, 0.13);

    /* One clip application for the whole plate. Clipping turned out to be the
       most expensive thing on the page at ten nails — far more than the
       filters — so every layer that needs the silhouette shares a single
       clipped group instead of asking for its own. */
    clipG = add(g, E('g', { 'clip-path': 'url(#' + clipId + ')' }));
    body = add(clipG, E('g', jelly ? { opacity: 0.87 } : null));
    plate = body;

    /* 1. THE C-CURVE. Painted with real colours, not a translucent veil, so
       the customer's colour survives intact through the middle of the nail
       and only the walls turn away from the light. */
    add(plate, E('path', {
      d: d,
      fill: hGrad(defs, [
        [0.00, cEdge(n.color)],
        [0.05, cWall(n.color)],
        [f(Math.max(0.10, peak - 0.20)), n.color],
        [f(peak), cLit(n.color)],
        [f(Math.min(0.90, peak + 0.24)), n.color],
        [0.95, cWall(n.color)],
        [1.00, cEdge(n.color)]
      ])
    }));

    /* 2. lengthwise form */
    add(plate, E('path', {
      d: d,
      fill: vGrad(defs, [
        [0, '#FFFFFF', 0.10],
        [f(Math.max(0.03, ybright - 0.12)), '#FFFFFF', 0],
        [f(ybright), '#FFFFFF', 0.13],
        [f(Math.min(0.72, ybright + 0.28)), '#FFFFFF', 0],
        [0.82, '#150C10', 0.06],
        [1, '#150C10', 0.20]
      ])
    }));

    /* 3. the free edge: a press-on tip is thin, so light comes through it.
       Painted straight onto the plate path — a clipped overlay would cost
       another clip application, and clipping is the most expensive thing on
       the page once ten nails are on screen. */
    add(plate, E('path', {
      d: d,
      fill: vGrad(defs, [
        [0, cTip(n.color), 0.95],
        [f(tipD * 0.35), cTip(n.color), 0.52],
        [f(tipD * 0.72), cTip(n.color), 0.18],
        [f(tipD), cTip(n.color), 0]
      ])
    }));

    /* --- 4. pattern ------------------------------------------------------- */
    fn = PATTERNS[n.pattern.kind];
    if (typeof fn === 'function') {
      pg = add(plate, E('g'));
      try {
        fn(pg, {
          w: w, h: h, u: u, d: d, shape: s, base: n.color, defs: defs, key: key,
          c1: n.pattern.color, c2: n.pattern.color2, S: n.pattern.scale,
          L: L, q: q,
          rnd: seeded(key + '|' + s + '|' + n.pattern.kind + '|' + n.pattern.color)
        });
      } catch (e) {
        if (pg.parentNode) pg.parentNode.removeChild(pg);
        console.warn('[SN.Nail] pattern "' + n.pattern.kind + '" failed', e);
      }
      /* the C-curve is UNDER the pattern too — polish over art still curves */
      add(plate, E('path', {
        d: d,
        fill: hGrad(defs, [
          [0, '#0D0709', 0.34], [0.09, '#0D0709', 0.12],
          [f(peak), '#FFFFFF', 0.10], [f(Math.min(0.9, peak + 0.26)), '#FFFFFF', 0],
          [0.93, '#0D0709', 0.12], [1, '#0D0709', 0.34]
        ])
      }));
    }

    /* --- 5. finish -------------------------------------------------------- */
    fn = FINISHES[kind] || FINISHES.gloss;
    fg = add(clipG, E('g'));
    try {
      fn(fg, {
        w: w, h: h, u: u, d: d, color: n.color, defs: defs, L: L, q: q,
        rnd: seeded(key + '|' + s + '|' + kind + '|' + n.color)
      });
    } catch (e2) {
      if (fg.parentNode) fg.parentNode.removeChild(fg);
      console.warn('[SN.Nail] finish "' + kind + '" failed', e2);
    }

    /* --- 6. the contour --------------------------------------------------- */
    /* absorption all round: at a grazing angle you are looking through a lot
       more polish, so every edge goes deeper than the face of the nail */
    /* Both edge treatments share one clipped group: half a stroke sitting
       outside the silhouette is a halo, and a halo is what makes a render
       look like a sticker. */
    add(clipG, E('g', null, [
      E('path', {
        d: d, fill: 'none', stroke: cEdge(n.color),
        'stroke-width': f(u * 3.4), opacity: jelly ? 0.3 : 0.5
      }),
      /* the fine bright line along the free edge itself — a vertical fade on
         the stroke keeps it to the tip, which is the only part of a press-on
         thin enough to glow */
      E('path', {
        d: d, fill: 'none',
        stroke: vGrad(defs, [
          [0, '#FFFFFF', 0.8], [f(tipD * 0.8), '#FFFFFF', 0.5],
          [f(tipD * 1.9), '#FFFFFF', 0], [1, '#FFFFFF', 0]
        ]),
        'stroke-width': f(Math.max(u * 2.4, 0.7)),
        opacity: kind === 'matte' ? 0.3 : 0.85,
        transform: 'translate(0 ' + f(u * 1.1) + ')'
      }),
      /* the rim light, on the side facing the source, dying out on the other */
      kind === 'matte' ? null : E('path', {
        d: d, fill: 'none',
        stroke: dGrad(defs, [
          [0, '#FFFFFF', kind === 'chrome' ? 0.95 : 0.72],
          [0.30, '#FFFFFF', 0.20],
          [0.60, '#FFFFFF', 0],
          [1, '#150C10', 0.18]
        ], f(0.5 + L.x * 0.5), f(0.5 + L.y * 0.5), f(0.5 - L.x * 0.5), f(0.5 - L.y * 0.5)),
        'stroke-width': f(Math.max(u * 2.6, 0.8))
      })
    ]));


    /* --- 7. charms sit ON the topcoat, so they come after the contour ------ */
    if (n.charms.length) {
      pg = add(g, E('g', { 'class': 'nail-charms' }));
      for (i = 0; i < n.charms.length; i++) {
        add(pg, charmEl(n.charms[i], w, h, !!opts.mirror, against(n.color, 0.55), L, defs, q));
      }
    }

    /* --- interaction ------------------------------------------------------ */
    if (opts.interactive) {
      onPick = typeof opts.onPick === 'function' ? opts.onPick : null;
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', nailLabel(key));
      g.setAttribute('aria-pressed', sel ? 'true' : 'false');
      g.setAttribute('style', 'cursor:pointer;outline:none');

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

    if (defs && !defs.firstChild && defs.parentNode) defs.parentNode.removeChild(defs);
    return g;
  }

  /* ====================================================================== */
  /* 10. The hand                                                            */
  /*                                                                         */
  /*  THE MIRRORED HAND PROBLEM. A left hand really is a mirrored right hand, */
  /*  so the anatomy must flip — but scale(-1,1) flips the LIGHTING with it,  */
  /*  and then one hand is lit from the left while the other is lit from the  */
  /*  right. The eye reads that contradiction instantly and the whole picture */
  /*  turns to plastic. The fix, everywhere below: geometry is built once and */
  /*  mirrored, while every gradient, highlight and shadow is placed through  */
  /*  LX() / SX(), which pre-flips it so that AFTER the mirror it points the  */
  /*  same way in world space as on the right hand. Both hands are lit from   */
  /*  the upper left, always.                                                */
  /* ====================================================================== */

  function fingerTF(gm) {
    return 'translate(' + f(gm.x) + ' ' + f(gm.y) + ') rotate(' + f(gm.angle) + ')';
  }

  /* One limb in its own frame: base centre at (0,0), tip at (0,-length).
     A finger is not a capsule — it swells a little at each joint and the pad
     at the tip is wider than the shaft just behind it. */
  function limbPath(gm, rootMul) {
    var hb = gm.width / 2;
    var ht = hb * num(gm.taper, FINGER_TAPER);
    var y0 = gm.width * num(rootMul, FINGER_ROOT);
    var yTip = -(gm.length - ht);
    var span = y0 - yTip;
    var mid = hb * 0.955, knu = hb * 0.99, pad = ht * 1.045;
    /* one closed run: base -> left wall -> pad -> right wall -> base */
    var q = pb();
    q.M(-hb, y0);
    q.C(-hb, y0 - span * 0.16, -knu, y0 - span * 0.34, -knu, y0 - span * 0.44);
    q.C(-knu, y0 - span * 0.56, -mid, y0 - span * 0.62, -mid, y0 - span * 0.70);
    q.C(-mid, y0 - span * 0.82, -pad * 1.05, y0 - span * 0.88, -pad, yTip + ht * 0.30);
    q.C(-pad, yTip - ht * 0.42, -pad * 0.66, yTip - ht * 1.02, 0, yTip - ht * 1.03);
    q.C(pad * 0.66, yTip - ht * 1.02, pad, yTip - ht * 0.42, pad, yTip + ht * 0.30);
    q.C(pad * 1.05, y0 - span * 0.88, mid, y0 - span * 0.82, mid, y0 - span * 0.70);
    q.C(mid, y0 - span * 0.62, knu, y0 - span * 0.56, knu, y0 - span * 0.44);
    q.C(knu, y0 - span * 0.34, hb, y0 - span * 0.16, hb, y0);
    q.Z();
    return q.d();
  }
  function fingerPath(gm) { return limbPath(gm, FINGER_ROOT); }

  function webs(geom) {
    var out = [], i, w, A, B, cx, cy;
    for (i = 0; i < WEB.length; i++) {
      w = WEB[i];
      if (w.a) {
        A = geom[w.a]; B = geom[w.b];
        cx = (A.x + B.x) / 2;
        cy = (A.y + B.y) / 2 + w.drop;
      } else { cx = w.x; cy = w.y; }
      out.push({ cx: cx, cy: cy, r: w.r });
    }
    return out;
  }

  /* Both hands are the same anatomy, but a real pair is never pixel identical:
     the left splays a shade wider and sits a degree off, which is enough to
     stop the eye reading "stamped twice". */
  var HAND_VARIANT = {
    right: { splay: 0, lift: 0, wrist: 0 },
    left:  { splay: 1.6, lift: -1.4, wrist: -1.5 }
  };

  function geomFor(side) {
    var v = HAND_VARIANT[side] || HAND_VARIANT.right;
    var out = {}, k, src, i, fk;
    for (k in HAND_GEOM) if (Object.prototype.hasOwnProperty.call(HAND_GEOM, k)) out[k] = HAND_GEOM[k];
    if (!v.splay && !v.lift) return out;
    for (i = 0; i < FINGERS.length; i++) {
      fk = FINGERS[i].key;
      src = HAND_GEOM[fk];
      if (!src || src.spine) continue;
      out[fk] = {
        x: src.x, y: src.y + v.lift * (i === 2 ? 1 : 0.5),
        angle: src.angle + v.splay * (i - 1.7) * 0.4,
        width: src.width, length: src.length + (i === 1 ? 1.5 : 0)
      };
    }
    return out;
  }

  /* The silhouette is stamped four or five times per hand (clip, outline,
     knock-out, …) and the thumb alone walks a 26 step sweep to build its
     outline, so the geometry is resolved ONCE per hand and only the elements
     are rebuilt. Keyed on the numbers themselves, so tuning HAND_GEOM at
     runtime still takes effect. */
  var SIL_CACHE = {};
  function silhouette(geom) {
    var sig = '', i, k, gm, pts, out;
    for (i = 0; i < FINGERS.length; i++) {
      gm = geom[FINGERS[i].key];
      sig += gm.spine
        ? 's' + gm.spine.p0 + gm.spine.c + gm.spine.p2 + gm.spine.h0 + gm.spine.hc + gm.spine.h2
        : '|' + gm.x + ',' + gm.y + ',' + gm.angle + ',' + gm.width + ',' + gm.length;
    }
    if (SIL_CACHE[sig]) return SIL_CACHE[sig];
    out = [];
    out.push({ t: 'rect', a: {
      x: f(WRIST.x), y: f(WRIST.y), width: f(WRIST.w), height: f(WRIST.h),
      rx: f(WRIST.r), ry: f(WRIST.r)
    } });
    out.push({ t: 'path', a: { d: PALM_D } });
    pts = webs(geom);
    for (i = 0; i < pts.length; i++) {
      out.push({ t: 'circle', a: { cx: f(pts[i].cx), cy: f(pts[i].cy), r: f(pts[i].r) } });
    }
    for (i = 0; i < FINGERS.length; i++) {
      gm = geom[FINGERS[i].key];
      if (gm.spine) out.push({ t: 'path', a: { d: spinePath(gm.spine) } });
      else out.push({ t: 'path', a: { d: fingerPath(gm), transform: fingerTF(gm) } });
    }
    /* keep the map from growing without bound if someone animates the table */
    k = 0;
    for (i in SIL_CACHE) if (Object.prototype.hasOwnProperty.call(SIL_CACHE, i)) k++;
    if (k > 8) SIL_CACHE = {};
    SIL_CACHE[sig] = out;
    return out;
  }

  function skinShapes(geom, attrs) {
    var parts = silhouette(geom), out = [], i, k, a;
    for (i = 0; i < parts.length; i++) {
      a = {};
      for (k in parts[i].a) if (Object.prototype.hasOwnProperty.call(parts[i].a, k)) a[k] = parts[i].a[k];
      out.push(E(parts[i].t, mergeAttrs(a, attrs || {})));
    }
    return out;
  }
  function mergeAttrs(base, extra) {
    var k;
    for (k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) base[k] = extra[k];
    return base;
  }

  function nailLimbOf(geom, fk) {
    var gm = geom[fk];
    return (gm && gm.tip) ? gm.tip : gm;
  }

  function handContent(side, design, opts) {
    opts = opts || {};
    var mirror = side === 'left';
    var geom = geomFor(side);
    var skin = design.skin;
    var sh = skinShadow(skin);
    var W = HAND_VIEW.w, H = HAND_VIEW.h;
    /* the wrist deliberately runs off the bottom edge, so every full-bleed
       layer has to run off with it or the arm ends in a pale step */
    var HB = H + 120;
    var g = E('g', { 'class': 'sn-hand-body' });
    var defs = add(g, E('defs'));
    var clipId = uid('hand');
    var i, gm, fk, key, nw, nh, nhMed, back, dist, px, py, factor, aspect, shape, kn, el, edge, wp;
    var q = clamp(num(opts.detail, 0.55), 0.25, 1);

    /* world-space x: pre-flipped so that after the outer scale(-1,1) every
       light lands on the same side of the world as it does on the right hand */
    function LX(x) { return mirror ? W - x : x; }
    /* a signed offset (a shadow nudge, a gradient direction) */
    function SX(dx) { return mirror ? -dx : dx; }

    /* Skin palette, all derived from the one tone the customer picked. The
       range has to be WIDE — a hand rendered inside a five percent band of one
       colour is a paper cut-out, whatever else you do to it. Tested against
       the lightest and the deepest tone in the store. */
    var hi   = mix(skin, '#FFF3E0', 0.40);                   /* knuckles, tendons, lit side */
    var sh1  = mix(bloodShade(skin, 0.26), sh, 0.22);        /* the turn away from the light */
    var sh2  = bloodShade(skin, 0.54);                       /* the shaded side  */
    var occ  = mix(bloodShade(skin, 0.95), '#3C2028', 0.30); /* where light cannot get */
    var warm = mix(skin, '#E8734A', 0.30);                   /* fingertips, knuckles */

    /* A crease painted as a uniform stroke reads as a band of grey paint laid
       ON the skin. A real crease is a hair-fine dark line that dies away at
       both ends, with a faint LIT ridge just below it where the skin bulges
       over the joint. Two shared gradients taper every crease on the hand —
       one along the stroke for the finger folds, one down it for the long
       creases — and they are memoised like every other def, so ten nails
       still cost one of each. */
    function taperX(c) {
      return grad(defs, 'linearGradient',
        [[0, c, 0], [0.2, c, 0.66], [0.5, c, 1], [0.8, c, 0.66], [1, c, 0]],
        { x1: 0, y1: 0, x2: 1, y2: 0 });
    }
    function taperY(c, head) {
      return grad(defs, 'linearGradient',
        [[0, c, head], [0.22, c, 1], [0.62, c, 0.4], [1, c, 0]],
        { x1: 0, y1: 0, x2: 0, y2: 1 });
    }
    /* every paint that repeats per finger is resolved ONCE per hand: grad()
       hashes its stop list on every call, so asking five times for the same
       gradient costs five hashes and buys nothing */
    var CREASE_INK = taperX(occ), CREASE_LIT = taperX(hi);
    var VALLEY_INK = taperY(occ, 0.85);
    var KNUCKLE_FILL = radGrad(defs, [
      [0, mix(hi, warm, 0.22), 0.52], [0.55, hi, 0.2], [1, skin, 0]
    ]);
    var TIP_WARM = radGrad(defs, [[0, warm, 0.55], [0.55, warm, 0.24], [1, warm, 0]]);
    var BED_FILL = radGrad(defs, [
      [0, mix(skin, '#E48C90', 0.34), 0.75], [0.7, mix(skin, '#E48C90', 0.22), 0.4],
      [1, skin, 0]
    ]);

    add(defs, E('clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' },
      skinShapes(geom)));
    /* Every shading layer wants the same silhouette, so they all live inside
       ONE clipped group and ask only for their own filter / mask / opacity.
       Nine clip applications per hand became one. */
    var skinG = null;
    function clipped(kids, extra) {
      var a = {}, k;
      if (!skinG) skinG = add(g, E('g', { 'clip-path': 'url(#' + clipId + ')' }));
      if (extra) for (k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) a[k] = extra[k];
      return add(skinG, E('g', a, kids));
    }

    /* 1. one darker edge around the WHOLE silhouette (opaque on purpose: a
       translucent edge turns into a pale halo on a light page) */
    edge = mix(skin, occ, 0.42);
    add(g, E('g', {
      fill: edge, stroke: edge, 'stroke-width': 3,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round'
    }, skinShapes(geom)));

    /* 2. the hand as a whole is a slab lit from the world's upper left — on
       BOTH hands, which is the entire point of LX(). The ramp is opaque and
       covers the whole silhouette, so there is no flat fill underneath it —
       painting one would just be a layer nobody ever sees. */
    clipped([rect(0, 0, W, HB, {
      fill: grad(defs, 'linearGradient', [
        [0, mix(hi, '#FFFFFF', 0.25)], [0.18, hi], [0.42, mix(hi, skin, 0.4)],
        [0.62, skin], [0.84, mix(sh1, sh2, 0.45)], [1, mix(sh2, occ, 0.5)]
      ], {
        x1: f(LX(28)), y1: 20, x2: f(LX(292)), y2: 330,
        gradientUnits: 'userSpaceOnUse'
      })
    })]);

    /* 2b. the inner edge: flood the silhouette with the shadow tone, then knock
       it back out with a blurred copy nudged toward the light. What survives
       hugs the outline — thick on the shaded side, a hairline on the lit one.
       It has to happen HERE, under the form layers: run it last and it paints
       flat skin back over everything and the hand goes flat again. */
    clipped([
      rect(0, 0, W, HB, { fill: mix(sh2, occ, 0.45) }),
      E('g', {
        fill: skin,
        transform: 'translate(' + f(SX(-3.4)) + ' -4.6)',
        filter: blurF(defs, 5)
      }, skinShapes(geom))
    ], { opacity: 0.55 });

    /* 3. EVERY FINGER IS A CYLINDER. Without this a hand is four flat straps;
       with it, it has volume. The ramp runs across each finger in its own
       rotated frame, and is reversed on the mirrored hand so the lit side
       still faces the world's light and not the mirror's. */
    function cyl(mirrorIt, stops) {
      var out = [], i;
      if (!mirrorIt) return stops;
      for (i = stops.length - 1; i >= 0; i--) {
        out.push([1 - stops[i][0], stops[i][1], stops[i].length > 2 ? stops[i][2] : 1]);
      }
      return out;
    }
    var CYL = [
      [0.00, occ, 0.55], [0.07, sh2, 0.42], [0.20, sh1, 0.16],
      [0.36, '#FFFFFF', 0.20], [0.46, '#FFFFFF', 0.10],
      [0.66, sh1, 0.10], [0.85, sh2, 0.40], [1.00, occ, 0.60]
    ];
    /* the cylinders run the length of each finger and have to STOP somewhere;
       a straight cut across the back of the hand is worse than no shading at
       all, so the whole group fades out through one shared mask as it reaches
       the knuckles */
    var fadeMask = shared(defs, 'fmask|' + H + '|' + HB, function (dd) {
      var id = uid('fm');
      add(dd, E('mask', {
        id: id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: f(W), height: f(H + 120)
      }, [
        rect(0, 0, W, H + 120, {
          fill: grad(dd, 'linearGradient',
            [[0, '#FFFFFF'], [0.42, '#FFFFFF'], [0.55, '#000000'], [1, '#000000']],
            { x1: 0, y1: 0, x2: 0, y2: f(H), gradientUnits: 'userSpaceOnUse' })
        })
      ]));
      return 'url(#' + id + ')';
    });
    var CYL_FILL = grad(defs, 'linearGradient', cyl(mirror, CYL), { x1: 0, y1: 0, x2: 1, y2: 0 });
    kn = clipped([], { mask: fadeMask });
    for (i = 0; i < FINGERS.length; i++) {
      fk = FINGERS[i].key;
      gm = geom[fk];
      if (gm.spine) continue;
      add(kn, E('rect', {
        x: f(-gm.width * 0.62), y: f(-gm.length * 1.15),
        width: f(gm.width * 1.24), height: f(gm.length * 1.9),
        fill: CYL_FILL,
        transform: fingerTF(gm)
      }));
    }
    /* The thumb gets the same treatment, but ACROSS its own bend rather than
       along it — and faded out towards its root, because the root of the
       thumb is a disc buried in the palm and shading it like a cylinder puts
       a dark half-moon in the middle of the hand. */
    var thumbMask = shared(defs, 'tmask', function (dd) {
      var id = uid('tm');
      add(dd, E('mask', {
        id: id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: f(W), height: f(H + 120)
      }, [
        rect(0, 0, W, H + 120, {
          fill: grad(dd, 'linearGradient',
            [[0, '#000000'], [0.14, '#000000'], [0.44, '#FFFFFF'], [1, '#FFFFFF']],
            { x1: 172, y1: 336, x2: 271, y2: 216, gradientUnits: 'userSpaceOnUse' })
        })
      ]));
      return 'url(#' + id + ')';
    });
    kn = clipped([], { mask: thumbMask });
    add(kn, E('path', {
      d: spinePath(geom.thumb.spine),
      fill: grad(defs, 'linearGradient', cyl(mirror, [
        [0.00, occ, 0.32], [0.15, sh2, 0.2], [0.44, '#FFFFFF', 0.18],
        [0.58, '#FFFFFF', 0.06], [0.80, sh1, 0.14], [1.00, occ, 0.4]
      ]), {
        x1: f(LX(202)), y1: 264, x2: f(LX(248)), y2: 302, gradientUnits: 'userSpaceOnUse'
      })
    }));

    /* 4. the back of the hand is not flat either: knuckle mounds catch the
       light, the metacarpal valleys between them fall away, and the thenar
       (the muscle at the base of the thumb) is a real mass */
    kn = clipped([]);
    for (i = 0; i < FINGERS.length; i++) {
      fk = FINGERS[i].key;
      gm = geom[fk];
      if (gm.spine) continue;
      /* the knuckle itself. Its core is WARM, not just bright: the skin over
         a knuckle is thin and the blood sits right under it. */
      add(kn, E('ellipse', {
        cx: f(gm.x - SX(gm.width * 0.14)), cy: f(gm.y + 8),
        rx: f(gm.width * 0.56), ry: f(gm.width * 0.46),
        fill: KNUCKLE_FILL
      }));
      /* the crease under it, plus the lit bulge of skin just below the
         crease. The valley that used to sit beside every knuckle is gone —
         it landed on the same spot as the web shadow and the crevice
         shadow, and three subtle washes stacked into one visible patch. */
      add(kn, E('path', {
        d: pb().M(gm.x - gm.width * 0.32, gm.y + 20)
          .Q(gm.x, gm.y + 25.5, gm.x + gm.width * 0.32, gm.y + 20).d(),
        fill: 'none', stroke: CREASE_INK, 'stroke-width': 2.2, opacity: 0.15,
        'stroke-linecap': 'round'
      }));
      add(kn, E('path', {
        d: pb().M(gm.x - gm.width * 0.28, gm.y + 24.5)
          .Q(gm.x, gm.y + 29.5, gm.x + gm.width * 0.28, gm.y + 24.5).d(),
        fill: 'none', stroke: CREASE_LIT, 'stroke-width': 2.4, opacity: 0.2,
        'stroke-linecap': 'round'
      }));
    }
    /* the whole back of the hand domes up over the metacarpals */
    add(kn, E('ellipse', {
      cx: f(LX(128)), cy: 246, rx: 66, ry: 70,
      fill: radGrad(defs, [
        [0, hi, 0.42], [0.45, mix(hi, skin, 0.5), 0.2], [0.8, skin, 0.03], [1, skin, 0]
      ])
    }));
    add(kn, E('ellipse', {
      cx: f(LX(194)), cy: 268, rx: 44, ry: 62,
      fill: radGrad(defs, [[0, hi, 0.5], [0.5, hi, 0.22], [1, skin, 0]]),
      transform: 'rotate(' + f(SX(-12)) + ' ' + f(LX(194)) + ' 268)'
    }));
    add(kn, E('ellipse', {
      cx: f(LX(92)), cy: 262, rx: 26, ry: 62,
      fill: radGrad(defs, [[0, sh2, 0.20], [0.6, sh2, 0.09], [1, sh2, 0]]),
      transform: 'rotate(' + f(SX(8)) + ' ' + f(LX(92)) + ' 262)'
    }));
    /* warmth where blood is close to the surface — fingertips and knuckles */
    for (i = 0; i < FINGERS.length; i++) {
      gm = nailLimbOf(geom, FINGERS[i].key);
      add(kn, E('ellipse', {
        cx: 0, cy: f(-gm.length * 0.95), rx: f(gm.width * 0.5), ry: f(gm.width * 0.66),
        fill: TIP_WARM,
        transform: fingerTF(gm)
      }));
    }

    var CAST_FILL = grad(defs, 'linearGradient',
      cyl(mirror, [[0, occ, 0], [0.5, occ, 0.45], [1, occ, 1]]),
      { x1: 0, y1: 0, x2: 1, y2: 0 });

    /* one joint crease, in the finger's own frame: a fine tapered dark line
       and, just below it, the lit ridge of skin the fold pushes up */
    function crease(parent, gm, yc, ymid, sp, w, o) {
      var tf = fingerTF(gm);
      add(parent, E('path', {
        d: pb().M(-gm.width * sp, -gm.length * yc)
          .Q(0, -gm.length * ymid, gm.width * sp, -gm.length * yc).d(),
        fill: 'none', stroke: CREASE_INK, 'stroke-width': f(w), opacity: o,
        'stroke-linecap': 'round', transform: tf
      }));
      if (q < 0.5) return;
      add(parent, E('path', {
        d: pb().M(-gm.width * (sp - 0.03), -gm.length * (yc - 0.024))
          .Q(0, -gm.length * (ymid - 0.024), gm.width * (sp - 0.03), -gm.length * (yc - 0.024)).d(),
        fill: 'none', stroke: CREASE_LIT, 'stroke-width': f(w * 0.85), opacity: f(o * 0.8),
        'stroke-linecap': 'round', transform: tf
      }));
    }

    /* 5. contact shadows and creases. Ambient occlusion where two fingers
       touch and where each finger leaves the palm is what glues the pieces
       into one hand instead of a bundle of separate shapes. */
    kn = clipped([], { filter: blurF(defs, 1.6) });
    /* ONE soft wedge per gap, running from the deepest point of the web down
       the valley between the metacarpals and fading out into the back of the
       hand. It replaces three overlapping layers (crevice stroke, web
       ellipse, knuckle valley) that between them made a grey bruise. */
    wp = webs(geom);
    for (i = 0; i < wp.length - 1; i++) {
      add(kn, E('path', {
        d: pb().M(wp[i].cx - SX(1), wp[i].cy - 7)
          .Q(wp[i].cx + SX(3), wp[i].cy + 14, wp[i].cx + SX(5), wp[i].cy + 33).d(),
        fill: 'none', stroke: VALLEY_INK, 'stroke-width': 9, opacity: 0.13,
        'stroke-linecap': 'round'
      }));
    }
    /* The crook between thumb and index. It has to HUG the notch — a radial
       blob sitting in open skin here is read as a thumbprint of dirt, which
       is exactly what it looked like — so it is a thin crescent lying along
       the line where the thumb leaves the hand. */
    var crook = wp[wp.length - 1];
    add(kn, E('ellipse', {
      cx: f(crook.cx), cy: f(crook.cy - 4), rx: 15, ry: 7,
      fill: radGrad(defs, [[0, occ, 0.2], [0.55, occ, 0.09], [1, occ, 0]]),
      transform: 'rotate(' + f(SX(-38)) + ' ' + f(crook.cx) + ' ' + f(crook.cy - 4) + ')'
    }));
    for (i = 0; i < FINGERS.length; i++) {
      fk = FINGERS[i].key;
      gm = nailLimbOf(geom, fk);
      /* two knuckle creases — a real finger folds, twice */
      crease(kn, gm, 0.585, 0.55, 0.36, 2.2, 0.19);
      crease(kn, gm, 0.26, 0.215, 0.4, 2.6, 0.15);
      /* the shadow one finger drops on the next — darkest where the two
         touch, gone by the middle of the finger */
      add(kn, E('rect', {
        x: f(SX(1) > 0 ? gm.width * 0.3 : -gm.width * 0.64),
        y: f(-gm.length * 1.02), width: f(gm.width * 0.34), height: f(gm.length * 1.02),
        fill: CAST_FILL, opacity: 0.12, transform: fingerTF(gm)
      }));
    }
    /* tendons running from the knuckles back toward the wrist */
    for (i = 0; i < FINGERS.length - 1; i++) {
      gm = geom[FINGERS[i].key];
      if (gm.spine) continue;
      add(kn, E('path', {
        d: pb().M(gm.x, gm.y + 10)
          .C(gm.x + (148 - gm.x) * 0.34, gm.y + 56, gm.x + (150 - gm.x) * 0.6, gm.y + 92,
             gm.x + (152 - gm.x) * 0.74, gm.y + 132).d(),
        fill: 'none', stroke: hi, 'stroke-width': 7, opacity: 0.08, 'stroke-linecap': 'round'
      }));
      add(kn, E('path', {
        d: pb().M(gm.x + SX(7), gm.y + 14)
          .C(gm.x + SX(7) + (148 - gm.x) * 0.34, gm.y + 60,
             gm.x + SX(7) + (150 - gm.x) * 0.6, gm.y + 96,
             gm.x + SX(7) + (152 - gm.x) * 0.74, gm.y + 136).d(),
        fill: 'none', stroke: occ, 'stroke-width': 4, opacity: 0.035, 'stroke-linecap': 'round'
      }));
    }
    /* the crease where the thumb mound meets the palm: tapered away at both
       ends, with the lit edge of the mound running alongside it */
    add(kn, E('path', {
      d: 'M' + f(LX(192)) + ' 214 C' + f(LX(210)) + ' 240 ' + f(LX(216)) + ' 280 ' +
         f(LX(205)) + ' 316',
      fill: 'none', stroke: taperY(occ, 0), 'stroke-width': 3, opacity: 0.15,
      'stroke-linecap': 'round'
    }));
    add(kn, E('path', {
      d: 'M' + f(LX(197)) + ' 217 C' + f(LX(215)) + ' 242 ' + f(LX(221)) + ' 280 ' +
         f(LX(210)) + ' 313',
      fill: 'none', stroke: taperY(hi, 0), 'stroke-width': 3.4, opacity: 0.16,
      'stroke-linecap': 'round'
    }));
    /* the wrist reads as sitting behind the hand */

    /* 6. the nail beds and the fold of skin at the sides of each plate.
       Drawn before the plates so a jelly nail has something to show through. */
    shape = shapeId(design.shape);
    aspect = ASPECT[shape];
    factor = lenFactor(design.length);
    kn = clipped([]);
    /* the wrist crease, and then the arm falling away into shadow rather than
       stopping at a line. It rides in this group on purpose: a full width rect
       inside a blurred group makes the filter region — and the cost — jump. */
    add(kn, rect(0, 290, W, 220, {
      fill: grad(defs, 'linearGradient', [
        [0, occ, 0], [0.20, occ, 0.15], [0.34, occ, 0.19],
        [0.52, occ, 0.12], [1, occ, 0.24]
      ], { x1: 0, y1: 290, x2: 0, y2: 510, gradientUnits: 'userSpaceOnUse' })
    }));
    for (i = 0; i < FINGERS.length; i++) {
      fk = FINGERS[i].key;
      gm = nailLimbOf(geom, fk);
      nw = gm.width * (1 - (1 - num(gm.taper, FINGER_TAPER)) * PLATE_AT) * PLATE_W;
      nhMed = nw * aspect;
      nh = nhMed * factor;
      back = clamp(nhMed * (PLATE_SEAT + (1 - PLATE_SEAT) * Math.min(factor, 1)),
                   nw * 0.8, gm.length * 0.62);
      dist = gm.length - back;
      /* the bed: a hair wider than the plate, pinker than the finger */
      add(kn, E('ellipse', {
        cx: 0, cy: f(-dist + nhMed * 0.34), rx: f(nw * 0.56), ry: f(nhMed * 0.48),
        fill: BED_FILL,
        transform: fingerTF(gm)
      }));
      /* the fold of skin along each side wall */
      add(kn, E('path', {
        d: pb().M(-nw * 0.56, -dist + nhMed * 0.62)
          .Q(-nw * 0.62, -dist + nhMed * 0.1, -nw * 0.42, -dist - nh * 0.1).d(),
        fill: 'none', stroke: occ, 'stroke-width': 1.8, opacity: 0.30,
        transform: fingerTF(gm)
      }));
      add(kn, E('path', {
        d: pb().M(nw * 0.56, -dist + nhMed * 0.62)
          .Q(nw * 0.62, -dist + nhMed * 0.1, nw * 0.42, -dist - nh * 0.1).d(),
        fill: 'none', stroke: occ, 'stroke-width': 1.8, opacity: 0.30,
        transform: fingerTF(gm)
      }));
      /* the cuticle itself */
      add(kn, E('path', {
        d: pb().M(-nw * 0.5, -dist + nhMed * 0.10)
          .Q(0, -dist + nhMed * 0.30, nw * 0.5, -dist + nhMed * 0.10).d(),
        fill: 'none', stroke: occ, 'stroke-width': 2.2, opacity: 0.26,
        transform: fingerTF(gm)
      }));
    }

    /* 7. the plates */
    for (i = 0; i < FINGERS.length; i++) {
      fk = FINGERS[i].key;
      gm = nailLimbOf(geom, fk);
      key = side + fk.charAt(0).toUpperCase() + fk.slice(1);
      nw = gm.width * (1 - (1 - num(gm.taper, FINGER_TAPER)) * PLATE_AT) * PLATE_W;
      nhMed = nw * aspect;
      nh = nhMed * factor;
      back = clamp(nhMed * (PLATE_SEAT + (1 - PLATE_SEAT) * Math.min(factor, 1)),
                   nw * 0.8, gm.length * 0.62);
      dist = gm.length - back;
      px = gm.x + Math.sin(rad(gm.angle)) * dist;
      py = gm.y - Math.cos(rad(gm.angle)) * dist;
      el = nailSVG(design.nails[key], {
        shape: shape, w: nw, h: nh, key: key, mirror: mirror,
        /* the plate is rotated with the finger, so the light has to be told
           where it now is — and on the mirrored hand, told again */
        light: mirror ? -gm.angle : gm.angle,
        detail: q,
        finishId: design.nails[key] ? design.nails[key].finish : null,
        shadow: darken(sh, 0.22),
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

  /* every public entry point opens a shared-defs context, so one call builds
     one copy of each gradient / filter / clip however many nails it draws */
  function inCtx(svg, fn) {
    var defs = add(svg, E('defs'));
    var prev = ctxOpen(defs);
    try { fn(); }
    finally {
      ctxClose(prev);
      if (!defs.firstChild && defs.parentNode) defs.parentNode.removeChild(defs);
    }
    return svg;
  }

  function hand(opts) {
    opts = opts || {};
    var side = opts.side === 'left' ? 'left' : 'right';
    var design = normDesign(opts.design);
    var svg = newSvg(opts);
    svg.setAttribute('class', 'sn-svg sn-hand sn-hand-' + side);
    inCtx(svg, function () { add(svg, handGroup(side, design, opts)); });
    return sizeSvg(svg, opts.w, HAND_VIEW.w, HAND_VIEW.h);
  }

  function preview(design, opts) {
    opts = opts || {};
    var d = normDesign(design);
    var svg = newSvg(opts);
    var gap = 20, vw, vh;

    if (d.hand === 'both') {
      vw = HAND_VIEW.w * 2 + gap;
      vh = HAND_VIEW.h + 24;
      svg.setAttribute('class', 'sn-svg sn-preview sn-preview-both');
      inCtx(svg, function () {
        add(svg, E('g', { transform: 'translate(0 24)' }, [handGroup('left', d, opts)]));
        add(svg, E('g', { transform: 'translate(' + f(HAND_VIEW.w + gap) + ' 0)' },
          [handGroup('right', d, opts)]));
      });
    } else {
      vw = HAND_VIEW.w;
      vh = HAND_VIEW.h;
      svg.setAttribute('class', 'sn-svg sn-preview sn-preview-' + d.hand);
      inCtx(svg, function () { add(svg, handGroup(d.hand, d, opts)); });
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

  /* The fingertip a single() plate lies on. Same light as everywhere else:
     lit down the left wall, shaded down the right, warm where the blood is
     close to the surface at the very end of the finger. */
  function fingerTip(defs, skin, bx, by, bw, bh, vh) {
    var sh = skinShadow(skin);
    var warm = mix(skin, '#F0916F', 0.22);
    var deep = darken(sh, 0.28);
    var cx = bx + bw / 2;
    var fw = bw * 1.24;
    var half = fw / 2;
    var top = by + bh - Math.min(bh * 0.99, bw * 1.58);
    var bot = vh + fw * 0.5;
    var g = E('g', { 'class': 'sn-fingertip' });
    var cid = uid('ftc');
    var d = pb()
      .M(cx - half, top + half * 1.15)
      .C(cx - half, top + half * 0.30, cx - fw * 0.30, top, cx, top)
      .C(cx + fw * 0.30, top, cx + half, top + half * 0.30, cx + half, top + half * 1.15)
      .C(cx + half * 1.03, top + (bot - top) * 0.5, cx + half * 1.05, bot - fw, cx + half * 1.06, bot)
      .L(cx - half * 1.06, bot)
      .C(cx - half * 1.05, bot - fw, cx - half * 1.03, top + (bot - top) * 0.5, cx - half, top + half * 1.15)
      .Z().d();

    add(g, E('defs', null, [
      E('clipPath', { id: cid, clipPathUnits: 'userSpaceOnUse' }, [E('path', { d: d })])
    ]));
    add(g, E('path', {
      d: d, fill: skin, stroke: mix(skin, sh, 0.55), 'stroke-width': f(bw * 0.010)
    }));
    add(g, E('g', { 'clip-path': 'url(#' + cid + ')' }, [
      /* the cylinder of the finger */
      E('path', {
        d: d,
        fill: grad(defs, 'linearGradient', [
          [0, mix(sh, deep, 0.35)], [0.09, mix(skin, sh, 0.45)],
          [0.30, mix(skin, '#FFFFFF', 0.16)], [0.52, skin],
          [0.86, mix(skin, sh, 0.55)], [1, mix(sh, deep, 0.45)]
        ], {
          x1: f(cx - half * 1.06), y1: 0, x2: f(cx + half * 1.06), y2: 0,
          gradientUnits: 'userSpaceOnUse'
        })
      }),
      /* warmth in the pad of the finger, beyond the plate */
      E('ellipse', {
        cx: f(cx), cy: f(top + half * 0.62), rx: f(half * 1.0), ry: f(half * 0.95),
        fill: radGrad(defs, [[0, warm, 0.5], [0.65, warm, 0.18], [1, warm, 0]])
      }),
      /* the joint crease below the nail */
      E('path', {
        d: pb().M(cx - half * 0.88, by + bh + bw * 0.60)
          .Q(cx, by + bh + bw * 0.74, cx + half * 0.88, by + bh + bw * 0.60).d(),
        fill: 'none', stroke: deep, 'stroke-width': f(bw * 0.022), opacity: 0.20
      }),
      E('path', {
        d: pb().M(cx - half * 0.86, by + bh + bw * 0.50)
          .Q(cx, by + bh + bw * 0.64, cx + half * 0.86, by + bh + bw * 0.50).d(),
        fill: 'none', stroke: deep, 'stroke-width': f(bw * 0.016), opacity: 0.14
      })
    ]));
    return g;
  }

  function single(nailState, design, opts) {
    opts = opts || {};
    var d = normDesign(design);
    var shape = shapeId(opts.shape || d.shape);
    var bw = num(opts.boxW, NAIL_BOX.w);
    var bh = num(opts.boxH, 0);
    var key = String(opts.key !== undefined && opts.key !== null ? opts.key : 'nail');
    var vw, vh, svg, defs, g, prev, finger;

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
    prev = ctxOpen(defs);
    try {
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

      /* A press-on is not a floating shape: it lies on a finger. Drawing the
         fingertip behind it is what makes the plate read as an object rather
         than a sticker — and a jelly finish has nothing to be translucent
         against without it. Off when the caller asked for a bare chip. */
      finger = (opts.finger === undefined || opts.finger === null)
        ? (opts.bg !== false) : !!opts.finger;
      if (finger) add(svg, fingerTip(defs, d.skin, BOX_PAD.x, BOX_PAD.y, bw, bh, vh));

      g = nailSVG(nailState, {
        shape: shape, w: bw, h: bh, key: key,
        finishId: opts.finishId,
        detail: clamp(num(opts.detail, 1), 0.25, 1),
        shadow: finger ? darken(skinShadow(d.skin), 0.22) : null,
        bed: finger ? mix(d.skin, '#E1898C', 0.30) : null,
        interactive: !!opts.interactive,
        selected: opts.selected,
        onPick: opts.onPick
      });
      g.setAttribute('transform', 'translate(' + f(BOX_PAD.x) + ' ' + f(BOX_PAD.y) + ')');
      add(svg, g);
    } finally {
      ctxClose(prev);
    }

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
    var defs, shape, A, nw, nh, i, el, spread, cy, ca, sa, top, bot, lift, prev;
    var keys = ['rightRing', 'rightMiddle', 'rightIndex'];
    var order = [0, 2, 1];          /* outer plates first, centre one on top */
    var tilt = 16;                  /* how far the outer plates fan out */
    var over = 0.66;                /* centre spacing / plate width (< 1 = overlap) */

    svg.setAttribute('class', 'sn-svg sn-thumb');
    defs = add(svg, E('defs'));
    prev = ctxOpen(defs);
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
        shape: shape, w: nw, h: nh, key: keys[order[i]], shadow: '#7A4B58',
        light: (order[i] - 1) * tilt, detail: 0.55
      });
      el.setAttribute('transform',
        'translate(' + f(vw / 2 + (order[i] - 1) * spread) + ' ' +
                       f(cy - (order[i] === 1 ? 0 : lift)) + ') ' +
        'rotate(' + f((order[i] - 1) * tilt) + ') ' +
        'translate(' + f(-nw / 2) + ' ' + f(-nh) + ')');
      add(svg, el);
    }
    ctxClose(prev);
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
