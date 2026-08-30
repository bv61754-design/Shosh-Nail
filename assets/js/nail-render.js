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

  /* ---------------------------------------------------------------------- *
   * HAND ANATOMY                                                            *
   *                                                                         *
   * Right hand, viewBox 0 0 300 380, seen from the BACK (that is where the  *
   * nails are), thumb on the +x side.                                       *
   *                                                                         *
   *   x, y    centre of the MCP knuckle — the finger's base                 *
   *   angle   degrees, 0 = straight up, positive splays toward +x           *
   *   width   the finger's width AT THE KNUCKLE (it tapers from here)       *
   *   length  knuckle -> the very end of the fingertip                      *
   *   curve   lateral bow of the centreline, in finger lengths; real        *
   *           fingers are not straight and no two bow the same way          *
   *   creases where the two visible joint folds sit, as fractions of length *
   *                                                                         *
   * PROPORTIONS. What made the old hand read as a cartoon was NOT the        *
   * fingers on their own — it was the palm they were sitting on. Measured:   *
   *   - the palm used to be 1.40x as tall as it is wide (crotch to wrist     *
   *     crease, over the width across the knuckles). A real one is about as  *
   *     tall as it is wide. This table puts it at 0.91, and the wrist crease *
   *     came up the frame with it. A long palm makes any finger look stubby. *
   *   - the middle finger's VISIBLE length — from the crotch, because that   *
   *     is all the eye sees — used to be 0.86x the height of the palm. On a  *
   *     hand like the reference photographs it is clearly longer than the    *
   *     palm is tall; here it is 1.33x.                                     *
   *   - adjacent fingers all but touch at the knuckles: 1.5 to 4 units of    *
   *     gap, not the 6 to 8 that turned every crotch into an open V.         *
   *   - each finger is about 5 times as long as it is wide, from the crotch. *
   * This is the one table to touch when the hand looks off.                 *
   * ---------------------------------------------------------------------- */
  var HAND_GEOM = {
    pinky:  { x: 74,    y: 220, angle: -9.6, width: 28.4, length: 110,
              curve: -0.050, creases: [0.585, 0.255], knuck: 0.90 },
    ring:   { x: 109.5, y: 198, angle: -5.6, width: 32.0, length: 139,
              curve: -0.020, creases: [0.570, 0.243], knuck: 1.00 },
    middle: { x: 145,   y: 190, angle: 1.2,  width: 33.4, length: 148,
              curve: 0.014,  creases: [0.598, 0.252], knuck: 1.07 },
    index:  { x: 180.5, y: 199, angle: 8.2,  width: 32.2, length: 133,
              curve: 0.042,  creases: [0.582, 0.236], knuck: 0.97 },
    /* The thumb is not a capsule: it is a limb that BENDS, from a wide mound
       rooted in the palm heel (h0), through the knuckle (hc), out to a
       clearly narrower distal segment (h2). It is swept along this quadratic
       spine. `tip` is derived from the spine in initThumb() and exists only
       so the nail plate can be seated exactly like every other finger's. */
    thumb:  {
      spine: { p0: [182, 296], c: [230, 284], p2: [256, 222],
               h0: 23.5, hc: 16.8, h2: 11.6 },
      tip: null
    }
  };

  /* How a finger's width runs from knuckle (t=0) to fingertip (t=1), as a
     fraction of `width`. A real finger is NOT a tube: it narrows steadily,
     swells a little over each of the two joints, dips again in the shafts
     between them, and ends narrower still at the nail bed. Measured on a
     real hand the nail bed is about four fifths of the knuckle, and the
     joints break that ramp by two or three percent each way — which is
     small, but it is the difference between a finger and a length of hose. */
  var FINGER_PROFILE = [
    [0.00, 1.000], [0.10, 0.984], [0.26, 0.906], [0.39, 0.944],
    [0.52, 0.872], [0.65, 0.906], [0.77, 0.846], [0.89, 0.832],
    [1.00, 0.800]
  ];
  /* the very tip is a touch narrower than the nail bed, so the cap is not a
     half circle stuck on the end of a strap */
  var TIP_MUL = 0.93;
  /* how far BELOW the knuckle each finger's walls start, in finger lengths,
     and how much wider they are down there */
  var ROOT_T = 0.05;
  var ROOT_FLARE = 1.04;

  /* The crotches. `drop` is how far BELOW the midpoint of the two knuckles
     the deepest point of the web sits. Small numbers on purpose: on a real
     hand these are narrow slots, and the fingers run parallel out of them for
     a good part of their length before they start to separate. */
  var WEB = [
    { a: 'pinky',  b: 'ring',   drop: 6.0 },
    { a: 'ring',   b: 'middle', drop: 7.5 },
    { a: 'middle', b: 'index',  drop: 7.5 }
  ];
  /* the notch where the thumb leaves the hand */
  var CROOK = { x: 198, y: 266 };

  /* The palm, as the handful of control points the silhouette runs through
     between the pinky's outer wall and the index's outer one. Kept as data
     so the outline stays one continuous authored curve rather than a blob
     path unioned with four capsules — that union is what produced the
     mitten. y~=333 is the wrist crease; the forearm below it deliberately
     runs off the bottom of the viewBox so it never ends in a stub. */
  var PALM = {
    /* pinky side, read from the pinky's knuckle down to the wrist */
    ulnar:  [[58, 232], [52, 255], [54, 282], [66, 305], [80, 320]],
    wristL: [99, 334],
    wristR: [178, 333],
    /* the last of the thumb mound, between the thumb's root and the wrist */
    thenar: [[189, 326]],
    /* the second metacarpal, read from the index's knuckle down to the crook */
    radial: [[197, 224], [198, 245]],
    armY: 440, armSpread: -4
  };
  /* where along the thumb's spine the crook joins its upper wall */
  var THUMB_CROOK_T = 0.30;

  /* Nail plate seating. PLATE_W is a fraction of the finger's width AT THE
     CUTICLE — resolved from FINGER_PROFILE at whatever t the cuticle lands
     on — so a plate can never be wider than the fingertip it lies on, and
     it always covers the same generous share of it. On a real press-on the
     side walls sit right up against the skin folds: only a thin strip of
     flesh shows beside the plate, so this number is high on purpose.
     PLATE_SEAT decides how far back from the fingertip the cuticle sits: at
     length factor 1 the plate is seated so its free edge lands exactly on
     the fingertip, shorter sets pull just inside it, and only long / xlong
     reach past it. */
  var PLATE_W = 0.845;
  var PLATE_SEAT = 0.16;


  /* ====================================================================== */
  /* 1b. Turning that table into an outline                                  */
  /*                                                                         */
  /*  The hand used to be a blob path unioned with four capsules and four    */
  /*  circles. A union cannot be shaped: wherever two pieces crossed you got */
  /*  whatever the boolean gave you, which is why every crotch was an open V */
  /*  and the knuckle line a smooth arc. Here the whole silhouette — palm,   */
  /*  four fingers, webs, thumb, wrist — is ONE authored polyline, sampled   */
  /*  from the geometry above and smoothed into a single path. Every part of */
  /*  the outline is therefore something a person chose, and it costs one    */
  /*  path element instead of nine.                                          */
  /* ====================================================================== */

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

  /* FINGER_PROFILE, read with a smoothstep between knots so the walls never
     show a facet where two knots meet */
  function profileAt(t) {
    var P = FINGER_PROFILE, i, a, b, u;
    if (t < 0) return P[0][1] + (-t / ROOT_T) * (ROOT_FLARE - P[0][1]);
    if (t === 0) return P[0][1];
    if (t >= 1) return P[P.length - 1][1];
    for (i = 1; i < P.length; i++) {
      if (t <= P[i][0]) {
        a = P[i - 1]; b = P[i];
        u = (t - a[0]) / ((b[0] - a[0]) || 1);
        u = u * u * (3 - 2 * u);
        return a[1] + (b[1] - a[1]) * u;
      }
    }
    return P[P.length - 1][1];
  }
  /* the thumb's stand-in limb is already a measured width, so it opts out */
  function widthAt(gm, t) {
    return gm.flat ? gm.width : gm.width * profileAt(t);
  }

  /* One finger's two walls, in world coordinates.
     Returns { L: [...], R: [...], apex: [x,y], tEnd: n } where L runs base ->
     tip on the -x side, R the same on the +x side, and apex is the very end
     of the fingertip. */
  function limbWalls(gm, N) {
    var a = rad(gm.angle);
    var ux = Math.sin(a), uy = -Math.cos(a);       /* along the finger */
    var vx = Math.cos(a), vy = Math.sin(a);        /* across it, toward +x */
    var Ln = gm.length, bow = num(gm.curve, 0) * Ln;
    var hTip = (gm.width / 2) * profileAt(1) * TIP_MUL;
    var tEnd = clamp(1 - hTip / Ln, 0.4, 0.99);
    var L = [], R = [], i, t, cx, cy, s, h, dx, dy, len, nx, ny, p0, p1;
    var t0 = gm.flat ? 0 : -ROOT_T;
    N = N || 16;
    function C(t) {
      s = Math.sin(Math.PI * t) * bow;
      return [gm.x + ux * Ln * t + vx * s, gm.y + uy * Ln * t + vy * s];
    }
    for (i = 0; i <= N; i++) {
      t = t0 + (tEnd - t0) * i / N;
      p0 = C(t - 0.01);
      p1 = C(Math.min(1, t + 0.01));
      dx = p1[0] - p0[0]; dy = p1[1] - p0[1];
      len = Math.sqrt(dx * dx + dy * dy) || 1;
      nx = dy / len; ny = -dx / len;               /* points toward -x */
      cx = C(t)[0]; cy = C(t)[1];
      h = widthAt(gm, t) / 2;
      L.push([cx + nx * h, cy + ny * h]);
      R.push([cx - nx * h, cy - ny * h]);
    }
    return { L: L, R: R, apex: C(1), tEnd: tEnd, hTip: hTip };
  }

  /* The cap. Not a half circle: a fingertip under a press-on is a rounded
     wedge, fuller on the way up than on the way down, so three points do
     more than an arc ever did. */
  function tipCap(w, out) {
    var l = w.L[w.L.length - 1], r = w.R[w.R.length - 1], a = w.apex;
    var mx = (l[0] + r[0]) / 2, my = (l[1] + r[1]) / 2;
    var dx = a[0] - mx, dy = a[1] - my;
    var sx = (r[0] - l[0]) / 2, sy = (r[1] - l[1]) / 2;
    out.push([l[0] + dx * 0.46 - sx * 0.045, l[1] + dy * 0.46 - sy * 0.045]);
    out.push([mx + dx * 0.88 - sx * 0.30, my + dy * 0.88 - sy * 0.30]);
    out.push([mx + dx * 0.97, my + dy * 0.97]);
    out.push([mx + dx * 0.88 + sx * 0.30, my + dy * 0.88 + sy * 0.30]);
    out.push([r[0] + dx * 0.46 + sx * 0.045, r[1] + dy * 0.46 + sy * 0.045]);
  }

  function pushRun(out, arr, from, to) {
    var i;
    if (from <= to) { for (i = from; i <= to; i++) out.push(arr[i]); }
    else { for (i = from; i >= to; i--) out.push(arr[i]); }
  }

  /* the deepest point of one crotch, plus the two shoulders that lead into
     it, so the web reads as a narrow slot instead of a rounded valley */
  function webRun(out, w, A, B) {
    var pa = A.R[0], pb2 = B.L[0];
    /* ONE point. Two fingers at the knuckle are barely a unit apart, so any
       attempt to round the bottom of the slot puts two shoulder points wider
       apart than the walls they sit between, the smoothing crosses itself and
       a white bite appears at the base of every crotch. The corner smoothing
       rounds a single point into exactly the narrow slot this wants. */
    out.push([(pa[0] + pb2[0]) / 2, (pa[1] + pb2[1]) / 2 + w.drop]);
  }

  /* a polyline -> one smooth path. Every corner is replaced by a quadratic
     through the midpoints of its two edges, which is exactly the curvature a
     hand outline wants and costs nothing. */
  function smoothClosed(pts) {
    var n = pts.length, i, p, q, mx, my;
    if (n < 3) return '';
    var d = pb();
    d.M((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
    for (i = 1; i < n; i++) {
      p = pts[i]; q = pts[(i + 1) % n];
      mx = (p[0] + q[0]) / 2; my = (p[1] + q[1]) / 2;
      d.Q(p[0], p[1], mx, my);
    }
    p = pts[0]; q = pts[1];
    d.Q(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    d.Z();
    return d.d();
  }

  /* derive the straight stand-in limb the thumb's nail plate rides on */
  (function initThumb() {
    var sp = HAND_GEOM.thumb.spine;
    var k = spinePt(sp, 0.42);
    var a = spinePt(sp, 0.84), b = spinePt(sp, 1);
    /* aim it along the tangent AT THE TIP so the plate lies flat on the last
       segment instead of following the chord of the whole bend */
    var dx = b.x - a.x, dy = b.y - a.y;
    var ang = Math.atan2(dx, -dy);
    var len = Math.sqrt((b.x - k.x) * (b.x - k.x) + (b.y - k.y) * (b.y - k.y));
    HAND_GEOM.thumb.tip = {
      x: b.x - Math.sin(ang) * len,
      y: b.y + Math.cos(ang) * len,
      angle: ang * 180 / Math.PI,
      width: spinePt(sp, 0.88).h * 2,
      length: len,
      flat: true,
      creases: [0.42, 0.16],
      knuck: 0.9
    };
  }());

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

  /* ====================================================================== */
  /* Cat eye — magnetic gel                                                  */
  /*                                                                         */
  /*  A magnet held under the nail drags the metallic pigment into ONE band   */
  /*  along the nail's long axis and empties everywhere else. So the effect   */
  /*  is never just a bright stripe: it is a bright stripe INSIDE a dark      */
  /*  frame. Every reference photo shows the same four things —               */
  /*    1. the band runs cuticle-to-tip, centred on the long axis, widest    */
  /*       through the middle third and narrowing toward both ends;           */
  /*    2. a vignette on all four edges, deepest at the side walls, so the    */
  /*       perimeter reads almost black next to the band;                     */
  /*    3. a core that stays in the customer's hue — saturated and luminous,  */
  /*       never blown out to white;                                          */
  /*    4. very fine pigment sparkle inside the band, and two or three small  */
  /*       SHARP speculars on the gloss above it.                             */
  /*  How dark the frame goes is driven by how light the base colour is, so   */
  /*  a pale nude gives the milky "velvet pearl" variant instead of mud.      */
  /* ====================================================================== */

  /* HSL in and out. The whole effect is hue-preserving — the deep base has to
     be a very dark version of the customer's colour, not a mix toward black,
     which is why plain darken() is not enough here. `w` is the minimum
     channel: distance to white, and the honest measure of "is this a pale
     colour" for a saturated hue that luminance would call light. */
  function ceHsl(hex) {
    var p = parseHex(hex) || { r: 0, g: 0, b: 0 };
    var r = p.r / 255, g = p.g / 255, b = p.b / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn;
    var l = (mx + mn) / 2, s = 0, hh = 0;
    if (dl > 0.0001) {
      s = l > 0.5 ? dl / (2 - mx - mn) : dl / (mx + mn);
      if (mx === r) hh = (g - b) / dl + (g < b ? 6 : 0);
      else if (mx === g) hh = (b - r) / dl + 2;
      else hh = (r - g) / dl + 4;
      hh /= 6;
    }
    return { h: hh, s: s, l: l, w: mn };
  }
  function ceHex(h, s, l) {
    h = num(h, 0);
    h = h - Math.floor(h);
    s = clamp(num(s, 0), 0, 1);
    l = clamp(num(l, 0), 0, 1);
    var q2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p2 = 2 * l - q2;
    function ch(t) {
      t = t - Math.floor(t);
      if (t < 1 / 6) return p2 + (q2 - p2) * 6 * t;
      if (t < 1 / 2) return q2;
      if (t < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - t) * 6;
      return p2;
    }
    return toHex(ch(h + 1 / 3) * 255, ch(h) * 255, ch(h - 1 / 3) * 255);
  }

  /* A pointed lens, centred on the origin, `L` long and `W` wide. This is the
     shape a specular takes on a domed nail: a sliver with two sharp ends, not
     a blob. */
  function ceSliver(L, W) {
    return pb()
      .M(0, -L).C(W, -L * 0.42, W, L * 0.42, 0, L)
      .C(-W, L * 0.42, -W, -L * 0.42, 0, -L).Z().d();
  }

  /* A radial ramp stretched along the nail's long axis. Object-bounding-box
     units on purpose: ten nails at ten different pixel sizes then share one
     gradient definition instead of asking for ten. */
  function ceRamp(defs, stops, rx, ry, cy) {
    return radGrad(defs, stops, {
      cx: 0.5, cy: f(cy), r: f(rx),
      gradientTransform: 'translate(0.5 ' + f(cy) + ') scale(1 ' + f(ry / rx) +
        ') translate(-0.5 ' + f(-cy) + ')'
    });
  }

  /* Every colour and every number the pattern needs, derived from the two
     customer colours in one place so the layers below stay readable. */
  function ceMix(x) {
    var c1 = col(x.c1, '#FFFFFF');
    var c2 = col(x.c2, '#3A1E28');
    var A = ceHsl(c1), B = ceHsl(c2);
    var h1 = A.h, s1 = A.s, h2 = B.h, s2 = B.s;
    var S = clamp(num(x.S, 1), 0.5, 1.8);

    /* The studio hands out white as the default band colour. A grey streak is
       not cat eye, so a colourless band borrows the base's hue: the magnet
       concentrates the customer's colour, it does not bleach it. */
    if (s1 < 0.17 && s2 > 0.20) { h1 = h2; s1 = clamp(s2 * 0.92, 0.34, 1); }
    /* And the reverse: the "black" in the photographs is never neutral, it is
       a very dark version of the red / the purple. A colourless base picks up
       the band's hue so the frame stays part of the same nail. */
    if (s2 < 0.13 && s1 > 0.22) { h2 = h1; s2 = clamp(s1 * 0.55, 0, 0.62); }

    /* how milky the whole thing goes. Measured as distance to WHITE, not as
       luminance: a neon green and a pale nude sit at the same luminance and
       want opposite treatments — the neon still needs a near-black frame. */
    var pale = clamp((B.w - 0.38) / 0.36, 0, 1);

    var deepL = 0.048 + 0.038 * s2;
    /* On the milky variant the base is the MIDDLE tone, not the top one: the
       pearl band has to sit above it and the emptied edge below it. Taking
       the customer's colour down a step is what buys room for both — leave it
       at face value and the whole nail flattens into one pale wash. */
    var milkL = clamp(B.l - 0.10, 0.68, 0.85);
    var baseL = deepL + (milkL - deepL) * pale;
    var baseS = clamp(s2 * (1.14 - 0.40 * pale) + 0.05 * (1 - pale), 0, 1);
    /* The brightest pixel in every one of the reference photographs is the
       PURE pigment, not a lightened version of it: HSL 0.5 for a saturated
       hue. Push past that and red turns coral and purple turns lilac, which
       is exactly the "white streak" failure. The band looks luminous because
       of what surrounds it, not because it was brightened. Only the milky
       variant climbs, and there the hue thins out as it does. */
    var coreL = clamp(Math.max(0.485 + 0.30 * pale, baseL + 0.11 + 0.05 * pale), 0, 0.97);
    var coreS = clamp(s1 * (1.25 - 0.90 * pale) + 0.10 * (1 - pale), 0, 1);

    var deep = ceHex(h2, baseS, baseL);
    var core = ceHex(h1, coreS, coreL);

    return {
      pale: pale,
      deep: deep,
      /* the emptied perimeter — the same hue again, taken down as far as the
         base allows. On a milky nail this is only a shade deeper. */
      edge: ceHex(h2, clamp(baseS * (1 + 0.34 * pale), 0, 1),
                  baseL * (0.30 + 0.42 * pale)),
      lift: ceHex(h2, baseS * 0.92, clamp(baseL * (1.22 - 0.14 * pale), 0, 0.94)),
      core: core,
      /* the very centre of the pull — a hair above the core and no more */
      hot: ceHex(h1, clamp(coreS * 1.02, 0, 1),
                 clamp(coreL + 0.055 * (1 - pale) + 0.02 * pale, 0, 0.96)),
      /* the shoulder of the band. Taken toward the deep base rather than
         built fresh, so the falloff always reads as one material however far
         apart the customer's two colours are. */
      band: mix(core, deep, 0.54 - 0.20 * pale),
      spark: mix(core, '#FFFFFF', 0.42 + 0.34 * pale),
      /* Where the ramp reaches zero, in fractions of the plate box — NOT the
         width of the visible band. The band the eye reads is the inner half of
         it, so at scale 1 this puts a bright core about a fifth of the nail
         wide inside a soft field about half the nail wide, which is what the
         photographs measure. 0.6 -> a tight wire, 1.6 -> a wide sweep that
         leaves only a rim of frame. */
      bw: clamp(0.50 * (0.60 + 0.40 * S), 0.30, 0.70),
      /* and how far it reaches toward the two ends. Longer than half the nail,
         so the taper is the ellipse's flank and the band still has colour in
         it when the vignette takes over at the tip. */
      bh: 0.88,
      /* the pull sits a little above centre, toward the cuticle, in all four
         photographs — the magnet is held against the finger, not the tip */
      cy: 0.555,
      /* the frame is nearly black on a dark nail and no more than a shade of
         warmth at the edge on a milky one; both are in the photographs */
      vr: 1 - 0.45 * pale,
      vx: 0.74 - 0.38 * pale,
      vy: 0.80 - 0.42 * pale
    };
  }

  PATTERNS.catEye = function (g, x) {
    var m = ceMix(x);
    var q = clamp(num(x.q, 1), 0.25, 1);
    var Lx = num(x.L && x.L.x, -0.4), Ly = num(x.L && x.L.y, 0.5);
    var i, n, a, rr, dx, dy, px, py, op, sz, ring, gl, hx, hy;
    /* the concentric border: stroke widths as fractions of the nail width,
       and how much each one darkens */
    var RW = [0.60, 0.44, 0.31, 0.20, 0.115, 0.05];
    var RO = [0.08, 0.10, 0.125, 0.16, 0.22, 0.34];

    /* 1. the emptied plate. Flat, in the deepest version of the base hue,
          with a touch more life through the middle where the gel is thickest. */
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: vGrad(x.defs, [
        [0, m.edge], [0.14, m.deep], [0.55, m.lift], [0.9, m.deep], [1, m.edge]
      ])
    }));

    /* 2. THE BAND, in two passes. A single ramp can only give an oval hot
          spot; the photographs show a long bright LINE sitting inside a much
          broader soft field, because the magnet concentrates the pigment on
          its axis and merely thins it either side. So: the field first —
          an elongated radial ramp whose contours are ellipses, widest through
          the middle third and tapering toward both ends, with no hard edge
          anywhere. */
    add(g, rect(0, 0, x.w, x.h, {
      fill: ceRamp(x.defs, [
        [0.00, m.core, 1],
        [0.20, m.core, 0.97],
        [0.36, m.band, 0.92],
        [0.52, mix(m.band, m.deep, 0.34), 0.80],
        [0.68, mix(m.band, m.deep, 0.66), 0.56],
        [0.83, mix(m.band, m.deep, 0.88), 0.29],
        [1.00, m.deep, 0]
      ], m.bw, m.bh, m.cy)
    }));
    /* then the line itself: narrow, and stretched far enough along the axis
       that it stays a streak the whole length of the nail instead of pooling
       in the middle. */
    add(g, rect(0, 0, x.w, x.h, {
      fill: ceRamp(x.defs, [
        [0.00, m.hot, 0.80],
        [0.28, m.core, 0.66],
        [0.58, m.core, 0.32],
        [0.82, m.band, 0.10],
        [1.00, m.band, 0]
      ], m.bw * 0.46, m.bh * 1.30, m.cy)
    }));

    /* 3. the pigment itself. Magnetic pigment is a suspension of tiny
          reflective flakes and they line up ALONG the field, which is why the
          sparkle in the photographs reads as fine radial silk fanning out of
          the band rather than as scattered glitter. So each fleck is a short
          streak pointed away from the core, densest on the axis and thinning
          toward the shoulders — over one shared micro-speckle tile that buys
          the density a hundred separate flecks would otherwise cost. The
          milky variant leans on this far harder than the dark ones do: in the
          pale photograph the band and the base are barely a step apart in
          tone, and it is the silk that tells them apart at all. */
    add(g, rect(0, 0, x.w, x.h, {
      fill: grainP(x.defs, m.spark, 0.62 + 0.30 * m.pale, x.u * 24),
      opacity: f(0.6 + 0.4 * m.pale)
    }));
    n = Math.round((26 + 16 * m.pale) * q);
    for (i = 0; i < n; i++) {
      a = x.rnd() * 6.2832;
      rr = Math.pow(x.rnd(), 0.55) * 0.86;
      dx = Math.cos(a) * rr * m.bw;
      dy = Math.sin(a) * rr * m.bh;
      px = 0.5 + dx;
      py = m.cy + dy;
      op = (1 - rr * 0.85) * x.rnd.r(0.20, 0.60) * (1 + 0.55 * m.pale);
      sz = x.rnd.r(0.40, 1.10) * (1 + 0.45 * m.pale);
      /* nothing that would not survive the vignette above it */
      if (py < 0.04 || py > 0.97 || op < 0.05) continue;
      add(g, E('ellipse', {
        cx: f(px * x.w), cy: f(py * x.h),
        rx: f(x.u * sz), ry: f(x.u * sz * 0.28),
        fill: m.spark, opacity: f(op),
        transform: 'rotate(' + f(Math.atan2(dy * x.h, dx * x.w) * 57.2958) +
          ' ' + f(px * x.w) + ' ' + f(py * x.h) + ')'
      }));
    }

    /* 4. THE FRAME, and it is the whole trick. Whatever the magnet pulls into
          the band it takes from the edges, so a cat eye is a bright stripe
          inside a dark border — leave the border out and the nail just looks
          like a stripe of paint. Built in two parts.
          First the border itself, as concentric strokes of the silhouette:
          the frame in the photographs hugs the nail's OUTLINE, staying the
          same thickness around the point of an almond, which an x/y gradient
          on the bounding box cannot do. Half of every stroke falls outside
          the clip, so each one lays down an inward band of half its width and
          the stack ramps smoothly inward. ONE shared blur across the whole
          stack turns those steps into a continuous ramp — the only filter the
          pattern uses, and it is defined once for the page however many nails
          are on it. */
    ring = add(g, E('g', {
      fill: 'none', stroke: m.edge, filter: blurF(x.defs, x.u * 2.6)
    }));
    for (i = 0; i < RW.length; i++) {
      add(ring, E('path', {
        d: x.d, 'stroke-width': f(x.w * RW[i]), opacity: f(RO[i] * m.vr)
      }));
    }

    /* Then across the nail — the side walls lose more pigment than the ends,
       so they get a second, wider pass on top of the border. */
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: hGrad(x.defs, [
        [0.00, m.edge, f(m.vx)],
        [0.045, m.edge, f(m.vx * 0.90)],
        [0.105, m.edge, f(m.vx * 0.62)],
        [0.175, m.edge, f(m.vx * 0.32)],
        [0.26, m.edge, f(m.vx * 0.11)],
        [0.37, m.edge, 0],
        [0.63, m.edge, 0],
        [0.74, m.edge, f(m.vx * 0.11)],
        [0.825, m.edge, f(m.vx * 0.32)],
        [0.895, m.edge, f(m.vx * 0.62)],
        [0.955, m.edge, f(m.vx * 0.90)],
        [1.00, m.edge, f(m.vx)]
      ])
    }));
    /* then along it: a broad fade into the free edge, and a narrower but
       harder line at the cuticle where the gel meets skin. */
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: vGrad(x.defs, [
        [0.00, m.edge, f(m.vy)],
        [0.06, m.edge, f(m.vy * 0.72)],
        [0.15, m.edge, f(m.vy * 0.42)],
        [0.26, m.edge, f(m.vy * 0.19)],
        [0.38, m.edge, f(m.vy * 0.05)],
        [0.48, m.edge, 0],
        [0.865, m.edge, 0],
        [0.93, m.edge, f(m.vy * 0.22)],
        [0.975, m.edge, f(m.vy * 0.62)],
        [1.00, m.edge, f(m.vy * 0.95)]
      ])
    }));

    /* 5. gloss. Two speculars, both small, both SHARP, and both shaped like
          slivers with pointed ends — the long one high on the ridge where the
          dome is steepest, a short one off its shoulder. The pale photograph
          shows exactly this: one clean sliver, nothing soft. A single fat
          blob is the tell of a drawing, and it is never in the photographs. */
    hx = clamp(0.44 - Lx * 0.13, 0.28, 0.66) * x.w;
    hy = clamp(0.64 + Ly * 0.06, 0.50, 0.76) * x.h;
    gl = add(g, E('g', { opacity: f(0.58 + 0.34 * m.pale) }));
    add(gl, E('path', {
      d: ceSliver(x.h * (0.060 + 0.020 * m.pale), x.w * 0.020),
      fill: '#FFFFFF', opacity: 0.9,
      transform: 'translate(' + f(hx) + ' ' + f(hy) + ') rotate(' + f(-7 + Lx * 9) + ')'
    }));
    add(gl, E('path', {
      d: ceSliver(x.h * 0.026, x.w * 0.011), fill: '#FFFFFF', opacity: 0.5,
      transform: 'translate(' + f(hx + x.w * 0.10) + ' ' + f(hy - x.h * 0.15) +
        ') rotate(' + f(-14 + Lx * 9) + ')'
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
    var L, q, peak, ybright, tipD, body, jelly, clipG, glow, wallLit, wallDark;

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

    /* 3. the free edge: a press-on tip is thin, so light comes through it —
       but only as much as the pigment lets through. A pale polish is nearly
       translucent at the tip; a saturated black one absorbs instead of
       scattering, and a bright band across the tip of a black nail is half of
       what makes a render read as a printed sticker. `glow` is that, and it
       is the only thing here that knows the difference.
       Painted straight onto the plate path — a clipped overlay would cost
       another clip application, and clipping is the most expensive thing on
       the page once ten nails are on screen. */
    glow = 0.42 + 0.58 * lum(n.color);
    add(plate, E('path', {
      d: d,
      fill: vGrad(defs, [
        [0, cTip(n.color), f(0.95 * glow)],
        [f(tipD * 0.35), cTip(n.color), f(0.52 * glow)],
        [f(tipD * 0.72), cTip(n.color), f(0.18 * glow)],
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
    /* A press-on has no outline. Draw one — a light keyline all the way round
       — and over black, oxblood or deep purple the plate stops being a nail
       and becomes a cut-out sticker lying on the finger. What a real one has
       is three things, none of them a line of constant colour:
         · polish absorbing at a grazing angle, all round
         · a THIN wall of acrylic that passes light, so it lights up in the
           nail's OWN colour washed pale, and only where the source actually
           reaches it — a couple of millimetres of rim, then nothing
         · the opposite wall pressed into the skin, which is DARKER than the
           plate, never brighter: that is the contact, and it is what sits the
           nail on the finger instead of on top of the photograph
       All three come from n.color and L, so a black nail gets a graphite rim
       and a nude one a pale one, and neither gets a white pen line.
       They share one clipped group: half a stroke sitting outside the
       silhouette is a halo, and a halo is the other half of the sticker. */
    wallLit = cTip(n.color);
    wallDark = darken(n.color, 0.46 + lum(n.color) * 0.24);
    add(clipG, E('g', null, [
      E('path', {
        d: d, fill: 'none', stroke: cEdge(n.color),
        'stroke-width': f(u * 3.4), opacity: jelly ? 0.3 : 0.5
      }),
      /* the free edge itself: the one part of a press-on thin enough to pass
         light along its whole length, so this one is not steered by L — but
         it is the nail's own colour, and it fades out by the first third */
      E('path', {
        d: d, fill: 'none',
        stroke: vGrad(defs, [
          [0, wallLit, 0.78], [f(tipD * 0.8), wallLit, 0.46],
          [f(tipD * 1.9), wallLit, 0], [1, wallLit, 0]
        ]),
        'stroke-width': f(Math.max(u * 2.2, 0.6)),
        opacity: f((kind === 'matte' ? 0.34 : 0.9) * glow),
        transform: 'translate(0 ' + f(u * 1.1) + ')'
      }),
      /* the two walls in one pass: lit rim into nothing into contact. The
         middle stops are transparent, so the gradient never interpolates the
         pale colour into the dark one — it just stops being there. */
      E('path', {
        d: d, fill: 'none',
        stroke: dGrad(defs, [
          [0, kind === 'chrome' ? lighten(wallLit, 0.4) : wallLit,
            f(kind === 'matte' ? 0.3 : 0.8)],
          [0.24, wallLit, f(kind === 'matte' ? 0.12 : 0.3)],
          [0.5, wallLit, 0],
          [0.68, wallDark, 0],
          [1, wallDark, jelly ? 0.3 : 0.55]
        ], f(0.5 + L.x * 0.5), f(0.5 + L.y * 0.5), f(0.5 - L.x * 0.5), f(0.5 - L.y * 0.5)),
        'stroke-width': f(Math.max(u * 2.8, 0.9))
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

  /* FINGERS is thumb-first because that is the order the studio lists them.
     The outline has to walk the hand the other way, little finger to index. */
  var FOUR = ['pinky', 'ring', 'middle', 'index'];

  function fingerTF(gm) {
    return 'translate(' + f(gm.x) + ' ' + f(gm.y) + ') rotate(' + f(gm.angle) + ')';
  }

  /* the world position of the deepest point of each crotch — the shading
     wants them too, for the valleys that run back over the metacarpals */
  function webs(geom) {
    var out = [], i, w, A, B;
    for (i = 0; i < WEB.length; i++) {
      w = WEB[i];
      A = geom[w.a]; B = geom[w.b];
      out.push({
        cx: (A.x + B.x) / 2,
        cy: (A.y + B.y) / 2 + w.drop + ROOT_T * B.length,
        r: 4
      });
    }
    out.push({ cx: CROOK.x, cy: CROOK.y, r: 9 });
    return out;
  }

  /* Both hands are the same anatomy, but a real pair is never pixel
     identical: the left splays a shade wider and sits a degree off, which is
     enough to stop the eye reading "stamped twice". */
  var HAND_VARIANT = {
    right: { splay: 0, lift: 0 },
    left:  { splay: 1.5, lift: -1.6 }
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
        angle: src.angle + v.splay * (i - 1.7) * 0.34,
        width: src.width, length: src.length + (i === 1 ? 1.6 : 0),
        curve: src.curve * (i === 4 ? 1.25 : 0.85),
        creases: src.creases, knuck: src.knuck
      };
    }
    return out;
  }

  /* The silhouette is stamped four or five times per hand (clip, outline,
     knock-out, …), so it is resolved ONCE per hand and only the elements are
     rebuilt. Keyed on the numbers themselves, so tuning HAND_GEOM at runtime
     still takes effect. */
  var SIL_CACHE = {};

  /* THE OUTLINE. Read it top to bottom and you are walking round a hand:
     up the little-finger side of the palm, out and back along each finger in
     turn with a narrow web between, down the second metacarpal into the
     crook, out along the thumb, back down the thenar and off the bottom of
     the frame at the wrist. */
  function outlineD(geom) {
    var pts = [], i, W = [], sp, T, tc;

    for (i = 0; i < FOUR.length; i++) W.push(limbWalls(geom[FOUR[i]], 15));

    /* the forearm, running off the bottom edge so it never ends in a stub */
    pts.push([PALM.wristL[0] - PALM.armSpread, PALM.armY]);
    pts.push(PALM.wristL);
    /* up the hypothenar to the pinky's outer wall */
    for (i = PALM.ulnar.length - 1; i >= 0; i--) pts.push(PALM.ulnar[i]);

    for (i = 0; i < 4; i++) {
      pushRun(pts, W[i].L, 0, W[i].L.length - 1);
      tipCap(W[i], pts);
      pushRun(pts, W[i].R, W[i].R.length - 1, 0);
      if (i < 3) webRun(pts, WEB[i], W[i], W[i + 1]);
    }

    /* down the second metacarpal into the crook between index and thumb */
    for (i = 0; i < PALM.radial.length; i++) pts.push(PALM.radial[i]);
    pts.push([CROOK.x, CROOK.y]);

    /* the thumb, joined to the crook part way along its upper wall */
    sp = geom.thumb.spine;
    /* the thumb is swept along its own spine, not along a straight axis */
    T = spineWalls(sp, 20);
    tc = Math.round(THUMB_CROOK_T * (T.L.length - 1));
    pushRun(pts, T.L, tc, T.L.length - 1);
    tipCap(T, pts);
    pushRun(pts, T.R, T.R.length - 1, 0);

    /* back down the thumb mound to the wrist */
    for (i = 0; i < PALM.thenar.length; i++) pts.push(PALM.thenar[i]);
    pts.push(PALM.wristR);
    pts.push([PALM.wristR[0] + PALM.armSpread, PALM.armY]);

    return smoothClosed(pts);
  }

  /* the thumb's walls, offset along its quadratic spine */
  function spineWalls(sp, N) {
    var L = [], R = [], i, t, p, a, b, dx, dy, len, nx, ny;
    for (i = 0; i <= N; i++) {
      t = i / N;
      p = spinePt(sp, t);
      a = spinePt(sp, Math.max(0, t - 0.02));
      b = spinePt(sp, Math.min(1, t + 0.02));
      dx = b.x - a.x; dy = b.y - a.y;
      len = Math.sqrt(dx * dx + dy * dy) || 1;
      nx = dy / len; ny = -dx / len;
      L.push([p.x + nx * p.h, p.y + ny * p.h]);
      R.push([p.x - nx * p.h, p.y - ny * p.h]);
    }
    return { L: L, R: R, apex: [spinePt(sp, 1).x, spinePt(sp, 1).y], hTip: sp.h2 };
  }
  /* the thumb on its own, for the shading that runs across its bend */
  function spinePath(sp, steps) {
    var w = spineWalls(sp, steps || 20), pts = [], i;
    pushRun(pts, w.L, 0, w.L.length - 1);
    tipCap(w, pts);
    pushRun(pts, w.R, w.R.length - 1, 0);
    return smoothClosed(pts);
  }

  function silhouette(geom) {
    var sig = '', i, k, gm, sp = geom.thumb.spine;
    for (i = 0; i < FOUR.length; i++) {
      gm = geom[FOUR[i]];
      sig += '|' + gm.x + ',' + gm.y + ',' + gm.angle + ',' + gm.width +
             ',' + gm.length + ',' + gm.curve;
    }
    sig += 's' + sp.p0 + sp.c + sp.p2 + sp.h0 + sp.hc + sp.h2;
    if (SIL_CACHE[sig]) return SIL_CACHE[sig];
    k = 0;
    for (i in SIL_CACHE) if (Object.prototype.hasOwnProperty.call(SIL_CACHE, i)) k++;
    if (k > 8) SIL_CACHE = {};
    SIL_CACHE[sig] = outlineD(geom);
    return SIL_CACHE[sig];
  }

  /* one element, not nine — every layer that wants the hand's shape asks for
     this and gets a single path */
  function skinShapes(geom, attrs) {
    var a = { d: silhouette(geom) }, k;
    if (attrs) for (k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) a[k] = attrs[k];
    return [E('path', a)];
  }

  function nailLimbOf(geom, fk) {
    var gm = geom[fk];
    return (gm && gm.tip) ? gm.tip : gm;
  }

  /* Where the plate sits on one finger. The cuticle's position depends on the
     plate's height and the plate's width depends on how wide the finger is at
     the cuticle, so it is solved rather than assumed — two passes is plenty
     and it keeps the side walls hard against the skin folds at every length. */
  function plateFor(gm, aspect, factor) {
    var w = widthAt(gm, 0.90) * PLATE_W, nhMed, nh, back, dist, i;
    for (i = 0; i < 2; i++) {
      nhMed = w * aspect;
      back = clamp(nhMed * (PLATE_SEAT + (1 - PLATE_SEAT) * Math.min(factor, 1)),
                   w * 0.8, gm.length * 0.62);
      dist = gm.length - back;
      /* measured a little PAST the cuticle, because that is where the plate
         is widest and where it would otherwise overhang the fingertip */
      w = widthAt(gm, clamp(dist / gm.length + 0.05, 0, 1)) * PLATE_W;
    }
    nhMed = w * aspect;
    nh = nhMed * factor;
    back = clamp(nhMed * (PLATE_SEAT + (1 - PLATE_SEAT) * Math.min(factor, 1)),
                 w * 0.8, gm.length * 0.62);
    dist = gm.length - back;
    return { w: w, hMed: nhMed, h: nh, dist: dist };
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
    var i, gm, fk, key, nw, nh, nhMed, dist, px, py, factor, aspect, shape, kn, el, edge, wp, pl, v;
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
    var CREASE_INK = taperX(occ);
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
    /* A 3px ink line around the whole hand is the single loudest cartoon
       tell there is. All this has to do is stop the antialiased edge showing
       the page through it, so it is a hairline in a tone close to the skin. */
    edge = mix(skin, occ, 0.30);
    add(g, E('g', {
      fill: edge, stroke: edge, 'stroke-width': 1.1,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round'
    }, skinShapes(geom)));

    /* 2. the hand as a whole is a slab lit from the world's upper left — on
       BOTH hands, which is the entire point of LX(). The ramp is opaque and
       covers the whole silhouette, so there is no flat fill underneath it —
       painting one would just be a layer nobody ever sees. */
    clipped([rect(0, 0, W, HB, {
      fill: grad(defs, 'linearGradient', [
        [0, mix(hi, '#FFFFFF', 0.34)], [0.14, hi], [0.36, mix(hi, skin, 0.3)],
        [0.56, skin], [0.76, mix(sh1, sh2, 0.5)], [1, mix(sh2, occ, 0.35)]
      ], {
        x1: f(LX(64)), y1: 44, x2: f(LX(252)), y2: 340,
        gradientUnits: 'userSpaceOnUse'
      })
    })]);

    /* 2b. THE EDGES, and the rule they follow: a real hand is CRISP where it
       turns away from the light and SOFT where it turns toward it. Both rims
       come from the same trick — a full-bleed wash shown only through a mask
       that is the silhouette knocked out by a blurred copy of itself, nudged
       one way or the other. What survives is a band that is fat on the side
       the copy moved away from and a hairline on the other.
       It matters that this is a MASK. Painting the wash and then repainting
       the skin tone over the middle of it, which is how this used to work,
       lays a flat colour over three quarters of the hand and every gradient
       underneath dies — that is most of why the hand looked like paper. */
    function edgeMask(dx, dy, blur) {
      var mid = uid('em');
      add(defs, E('mask', {
        id: mid, maskUnits: 'userSpaceOnUse',
        x: -20, y: -20, width: f(W + 40), height: f(HB + 40)
      }, [
        rect(-20, -20, W + 40, HB + 40, { fill: '#FFFFFF' }),
        E('g', {
          fill: '#000000', transform: 'translate(' + f(dx) + ' ' + f(dy) + ')',
          filter: blurF(defs, blur)
        }, skinShapes(geom))
      ]));
      return 'url(#' + mid + ')';
    }
    /* the shaded side: tight, dark, and it stops fast */
    clipped([rect(0, 0, W, HB, { fill: mix(sh2, occ, 0.55) })],
      { mask: edgeMask(SX(-2.4), -3.0, 2.75), opacity: 0.82 });
    /* the lit side: wider, weaker, and it dies away into the form */
    clipped([rect(0, 0, W, HB, { fill: mix(hi, '#FFFFFF', 0.38) })],
      { mask: edgeMask(SX(3.2), 4.0, 5.25), opacity: 0.32 });

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
      [0.00, occ, 0.42], [0.09, sh2, 0.30], [0.24, sh1, 0.13],
      [0.34, '#FFFFFF', 0.09], [0.44, '#FFFFFF', 0.12],
      [0.56, '#FFFFFF', 0.07], [0.66, sh1, 0.07],
      [0.78, sh1, 0.20], [0.90, sh2, 0.46], [1.00, occ, 0.66]
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
        x: f(-gm.width * 0.47), y: f(-gm.length * 1.15),
        width: f(gm.width * 0.94), height: f(gm.length * 1.9),
        fill: CYL_FILL,
        transform: fingerTF(gm)
      }));
    }
    /* The thumb gets the same treatment, but ACROSS its own bend rather than
       along it — and faded out towards its root, because the root of the
       thumb is a disc buried in the palm and shading it like a cylinder puts
       a dark half-moon in the middle of the hand. */
    var tsp = geom.thumb.spine;
    var thumbMask = shared(defs, 'tmask|' + tsp.p0 + tsp.p2, function (dd) {
      var id = uid('tm');
      add(dd, E('mask', {
        id: id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: f(W), height: f(H + 120)
      }, [
        rect(0, 0, W, H + 120, {
          fill: grad(dd, 'linearGradient',
            [[0, '#000000'], [0.14, '#000000'], [0.44, '#FFFFFF'], [1, '#FFFFFF']],
            { x1: f(tsp.p0[0]), y1: f(tsp.p0[1]), x2: f(tsp.p2[0]), y2: f(tsp.p2[1]),
              gradientUnits: 'userSpaceOnUse' })
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
      ]), (function () {
        /* across the thumb's own bend at its midpoint, wherever that now is */
        var m = spinePt(tsp, 0.5), t1 = spinePt(tsp, 0.56), a0 = spinePt(tsp, 0.44);
        var dx = t1.x - a0.x, dy = t1.y - a0.y, L = Math.sqrt(dx * dx + dy * dy) || 1;
        var nx = -dy / L, ny = dx / L, r = m.h * 1.15;
        return {
          x1: f(LX(m.x + nx * r)), y1: f(m.y + ny * r),
          x2: f(LX(m.x - nx * r)), y2: f(m.y - ny * r),
          gradientUnits: 'userSpaceOnUse'
        };
      }()))
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
         a knuckle is thin and the blood sits right under it. Each one is a
         slightly different size — `knuck` — because on a real hand they are.
         What is NOT here any more: the crease under it and the lit ridge
         under that. At this scale a knuckle reads entirely as a soft mound;
         drawing the fold as well is illustration, not observation. */
      v = num(gm.knuck, 1);
      add(kn, E('ellipse', {
        cx: f(gm.x - SX(gm.width * 0.13)), cy: f(gm.y + 7),
        rx: f(gm.width * 0.54 * v), ry: f(gm.width * 0.44 * v),
        fill: KNUCKLE_FILL, opacity: 0.95
      }));
    }
    /* the whole back of the hand domes up over the metacarpals */
    add(kn, E('ellipse', {
      cx: f(LX(126)), cy: 250, rx: 66, ry: 58,
      fill: radGrad(defs, [
        [0, hi, 0.52], [0.45, mix(hi, skin, 0.5), 0.24], [0.8, skin, 0.03], [1, skin, 0]
      ])
    }));
    add(kn, E('ellipse', {
      cx: f(LX(178)), cy: 274, rx: 34, ry: 46,
      fill: radGrad(defs, [[0, hi, 0.26], [0.5, hi, 0.12], [1, skin, 0]]),
      transform: 'rotate(' + f(SX(-14)) + ' ' + f(LX(178)) + ' 274)'
    }));
    add(kn, E('ellipse', {
      cx: f(LX(74)), cy: 268, rx: 26, ry: 54,
      fill: radGrad(defs, [[0, sh2, 0.20], [0.6, sh2, 0.09], [1, sh2, 0]]),
      transform: 'rotate(' + f(SX(8)) + ' ' + f(LX(74)) + ' 268)'
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
    function crease(parent, gm, yc, sp, w, o) {
      var hw = widthAt(gm, yc) / 2;
      add(parent, E('path', {
        d: pb().M(-hw * sp, -gm.length * yc)
          .Q(0, -gm.length * (yc - 0.022), hw * sp, -gm.length * yc).d(),
        fill: 'none', stroke: CREASE_INK, 'stroke-width': f(w), opacity: o,
        'stroke-linecap': 'round', transform: fingerTF(gm)
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
        fill: 'none', stroke: VALLEY_INK, 'stroke-width': 11, opacity: 0.19,
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
      /* the two joints a straight finger actually shows, at the height this
         finger's own table entry puts them — no two fingers fold in the same
         place, and four identical pairs of arcs is what a cartoon looks like */
      v = gm.creases || [0.58, 0.25];
      if (q >= 0.4) {
        crease(kn, gm, v[0], 0.62, 1.7, 0.115);
        crease(kn, gm, v[1], 0.68, 1.9, 0.095);
      }
      /* the shadow one finger drops on the next — darkest where the two
         touch, gone by the middle of the finger */
      add(kn, E('rect', {
        x: f(SX(1) > 0 ? gm.width * 0.26 : -gm.width * 0.66),
        y: f(-gm.length * 1.02), width: f(gm.width * 0.40), height: f(gm.length * 1.02),
        fill: CAST_FILL, opacity: 0.21, transform: fingerTF(gm)
      }));
    }
    /* tendons running from the knuckles back toward the wrist */
    for (i = 0; q >= 0.4 && i < FINGERS.length - 1; i++) {
      gm = geom[FINGERS[i].key];
      if (gm.spine) continue;
      /* A tendon on the back of a relaxed hand is a hint of a ridge, not a
         cord. One pale stroke each, and the dark companion that used to run
         beside it is gone: together they drew a diagram of a hand. */
      add(kn, E('path', {
        d: pb().M(gm.x, gm.y + 14)
          .C(gm.x + (140 - gm.x) * 0.34, gm.y + 50, gm.x + (142 - gm.x) * 0.6, gm.y + 82,
             gm.x + (144 - gm.x) * 0.74, gm.y + 114).d(),
        fill: 'none', stroke: hi, 'stroke-width': 10, opacity: 0.075, 'stroke-linecap': 'round'
      }));
    }
    /* the crease where the thumb mound meets the palm: tapered away at both
       ends, with the lit edge of the mound running alongside it */
    add(kn, E('path', {
      d: 'M' + f(LX(190)) + ' 214 C' + f(LX(200)) + ' 242 ' + f(LX(200)) + ' 282 ' +
         f(LX(190)) + ' 316',
      fill: 'none', stroke: taperY(occ, 0), 'stroke-width': 3, opacity: 0.115,
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
    add(kn, rect(0, 296, W, 214, {
      fill: grad(defs, 'linearGradient', [
        [0, occ, 0], [0.14, occ, 0.13], [0.24, occ, 0.18],
        [0.38, occ, 0.13], [0.7, occ, 0.24], [1, occ, 0.30]
      ], { x1: 0, y1: 290, x2: 0, y2: 505, gradientUnits: 'userSpaceOnUse' })
    }));
    for (i = 0; i < FINGERS.length; i++) {
      fk = FINGERS[i].key;
      gm = nailLimbOf(geom, fk);
      pl = plateFor(gm, aspect, factor);
      nw = pl.w; nhMed = pl.hMed; nh = pl.h; dist = pl.dist;
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
      pl = plateFor(gm, aspect, factor);
      nw = pl.w; nh = pl.h; dist = pl.dist;
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

  /* preview() picks the mode and hands off; the drawn hand lives on unchanged
     underneath it, because it is still the fallback, still what the shape and
     length cards are cut from, and still the one hand that needs no asset. */
  function preview(design, opts) {
    opts = opts || {};
    var d = normDesign(design);
    if (previewMode(opts) === 'photo') {
      try { return photoPreview(d, opts); }
      catch (e) { photoOK = false; if (SN.Nail) SN.Nail.PHOTO_OK = false; }
    }
    return vectorPreview(d, opts);
  }

  function vectorPreview(design, opts) {
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
  /* 12b. photoHand() — the customer's set on a REAL hand                    */
  /*                                                                         */
  /*  assets/img/hand-real.jpg is ONE photograph: a left hand, back up,      */
  /*  fingers pointing to the image's left, thumb toward the top, flat on    */
  /*  dark charcoal linen. It is the LEFT hand as shot; the right hand is    */
  /*  the same frame mirrored.                                              */
  /*                                                                         */
  /*  Every nail photograph ever taken is FINGERS UP, so the composition     */
  /*  takes a quarter turn on its way to the screen (see photoTurn), and a   */
  /*  pair stands side by side with the wrists at the bottom and the thumbs  */
  /*  facing each other. Nothing else knows about the turn: the mask, the    */
  /*  anchors, the crop and the mirror all stay in the photo's own frame.    */
  /*                                                                         */
  /*  The one photograph carries every skin tone: the linen and the skin     */
  /*  separate cleanly on r-g (the fabric is NEGATIVE, skin is strongly      */
  /*  POSITIVE), so a mask is built once on a canvas and each tone is        */
  /*  recoloured through it and cached. Same origin, so the canvas is never  */
  /*  tainted and the recoloured data URL rasterises straight into toPNG.    */
  /* ====================================================================== */

  var PHOTO = {
    src: 'assets/img/hand-real.jpg',
    small: 'assets/img/hand-real-sm.jpg',
    /* the intrinsic size of the master; both variants share this framing */
    w: 1017, h: 681,
    /* a point that is certainly inside the back of the hand */
    seedX: 0.62, seedY: 0.45,
    /* The window every preview is cut to, in the photo's own frame. It is
       quoted here the way it was measured — cx/cw run along the fingers,
       cy/ch across them — but on screen the turn swaps them, so cw is the
       composition's HEIGHT and ch is one hand's WIDTH.
       The window reaches slightly OUTSIDE the photograph on the left and the
       top, because an extra long stiletto on the middle finger ends 25px past
       the frame's edge and on the thumb 10px above it; that margin is filled
       by mirroring the photo about its own edges, and since everything out
       there is plain linen the joins are invisible.
       ch stops 57px past the little finger rather than at the frame's bottom
       edge: the strip below it is pure linen, and carrying it would push a
       pair of hands to 1.6:1 — too wide to fill a phone. As cut, one hand is
       0.73:1 and the pair 1.46:1, which is the shape of a real two hand shot
       and works from 390px to 1400px without either hand being cropped. */
    cx: -46, cy: -22, cw: 900, ch: 656,
    /* mean luminance over the mask, measured on this exact file */
    smean: 0.6214
  };

  /* ---------------------------------------------------------------------- *
   * PHOTO ANCHORS — the whole job.                                          *
   *                                                                         *
   * Five per hand, for the LEFT hand (the frame exactly as it was shot),    *
   * everything normalised to the photo so the master and the phone variant  *
   * are interchangeable:                                                    *
   *                                                                         *
   *   x, y    the CUTICLE point — where the plate meets the skin            *
   *   angle   the direction the finger points, degrees, 0 = straight up,    *
   *           positive turning toward +x. This is the same convention       *
   *           HAND_GEOM uses, so the placement transform is identical to    *
   *           the one the drawn hand uses for its plates.                   *
   *   width   the finger's width at the nail bed (fraction of photo width)  *
   *   tip     cuticle -> the very end of the fingertip. A press-on always   *
   *           clears the flesh, so this is the floor under a short plate.   *
   *                                                                         *
   * Read off the photograph, not computed: the fingertip extremes and the   *
   * finger centrelines come from the skin mask, the cuticle position and    *
   * the nail-bed width were then nudged by eye against a calibration page   *
   * that draws the plates and a marker at every anchor.                     *
   * ---------------------------------------------------------------------- */
  var PHOTO_ANCHOR = {
    thumb:  { x: 0.5451, y: 0.1636, angle: -53.5, width: 0.0777, tip: 0.0850 },
    index:  { x: 0.2340, y: 0.2849, angle: -81.2, width: 0.0718, tip: 0.0541 },
    middle: { x: 0.1622, y: 0.4501, angle: -84.8, width: 0.0728, tip: 0.0546 },
    ring:   { x: 0.1986, y: 0.6079, angle: -82.4, width: 0.0659, tip: 0.0546 },
    pinky:  { x: 0.2970, y: 0.7942, angle: -88.5, width: 0.0580, tip: 0.0398 }
  };

  /* mirroring happens about the centre of the crop window, not the centre of
     the frame, so the right hand lands inside the same window as the left */
  function mirrorAxis() { return PHOTO.cx * 2 + PHOTO.cw; }

  /* ---------------------------------------------------------------------- *
   * THE QUARTER TURN.                                                       *
   *                                                                         *
   * The shot is landscape with the fingers pointing to the image's left, so  *
   * turning it a quarter turn clockwise stands the fingers up. Doing that    *
   * on the way OUT means the anchors, the mask, the tiles and the crop all   *
   * stay in the photograph's own frame — and so does the light, which is     *
   * the point: the plates' highlights are computed against the photograph's  *
   * light, and rotating the picture rotates that light with it.              *
   *                                                                         *
   * The mirrored hand turns the other way. Mirroring the frame in x and      *
   * then turning both hands the same way would stand the second one on its   *
   * head; turning it anticlockwise instead makes it the first hand reflected *
   * in a VERTICAL line, which is what a pair of hands is. The reflection     *
   * axis is the join between the two windows, so the two hands meet on the   *
   * same column of pixels and the seam disappears.                           *
   * ---------------------------------------------------------------------- */
  function photoTurn(side) {
    if (side !== 'right') return 'rotate(90)';
    return 'translate(' + f(-(PHOTO.cy * 2 + PHOTO.ch)) + ' ' + f(mirrorAxis()) + ') rotate(-90)';
  }

  /* the crop window as the screen sees it, after the turn: what was measured
     across the fingers is now the width, and what ran along them the height */
  function turnedView() {
    return { x: -(PHOTO.cy + PHOTO.ch), y: PHOTO.cx, w: PHOTO.ch, h: PHOTO.cw };
  }

  /* A press-on is not as wide as the finger: its side walls stop just inside
     the skin folds, or it looks like a sticker laid over the knuckle. */
  var PHOTO_PLATE_W = 0.82;
  /* the tip of a plate always clears the flesh by this much */
  var PHOTO_TIP_CLEAR = 1.03;

  /* ------------------------------------------------------ photo runtime -- */

  var photoOK = true;          /* optimistic: proven false only by a failure */
  var photo = {
    state: 'idle',             /* idle | loading | ready | failed */
    promise: null,
    src: '',
    w: 0, h: 0,
    base: null,                /* Uint8ClampedArray, the untouched pixels     */
    mask: null,                /* Uint8Array 0..255, soft edged skin coverage */
    smean: PHOTO.smean,
    ratio: null,               /* lum -> shading ratio LUT                    */
    work: null,                /* the canvas every tone is painted on         */
    tones: {},                 /* hex -> data URL                             */
    order: []
  };

  function canvasCtx(w, h) {
    var c, x;
    try {
      if (typeof document === 'undefined' || !document.createElement) return null;
      c = document.createElement('canvas');
      if (!c || !c.getContext) return null;
      c.width = w; c.height = h;
      /* the tone canvas is read back on every recolour; without this hint the
         browser keeps it on the GPU and each readback stalls the frame */
      x = c.getContext('2d', { willReadFrequently: true }) || c.getContext('2d');
      return x ? { canvas: c, ctx: x } : null;
    } catch (e) { return null; }
  }

  /* everything the photo mode needs, checked once, cheaply, at load */
  (function () {
    if (typeof window === 'undefined' || typeof document === 'undefined') { photoOK = false; return; }
    if (typeof window.Promise !== 'function' || typeof window.Image !== 'function') { photoOK = false; return; }
    if (typeof Uint8Array !== 'function' || typeof Int32Array !== 'function') { photoOK = false; return; }
    if (!canvasCtx(1, 1)) photoOK = false;
  }());

  function photoFile() {
    var wide = 9999;
    try {
      wide = Math.max(window.innerWidth || 0, (document.documentElement || {}).clientWidth || 0) ||
             9999;
    } catch (e) { wide = 9999; }
    return wide <= 520 ? PHOTO.small : PHOTO.src;
  }

  function setHref(el, url) {
    try {
      el.setAttribute('href', url);
      el.setAttributeNS(XLINK, 'xlink:href', url);
    } catch (e) { /* ignore */ }
  }

  /* ---- mask ------------------------------------------------------------- *
   * threshold -> median 9 -> dilate 9 -> erode 9 -> keep the component the   *
   * back of the hand is in -> soften the edge. Over a BINARY image a median  *
   * is a majority vote and a dilate/erode are a floor/ceiling on the same    *
   * 3x3 sum, so all three are one separable box sum with a different test —  *
   * nine compares per pixel become two adds.                                 */

  function boxSum3(src, tmp, dst, w, h) {
    var x, y, o, i;
    for (y = 0; y < h; y++) {
      o = y * w;
      for (x = 0; x < w; x++) {
        i = o + x;
        tmp[i] = src[i] + src[x > 0 ? i - 1 : i] + src[x < w - 1 ? i + 1 : i];
      }
    }
    for (y = 0; y < h; y++) {
      o = y * w;
      for (x = 0; x < w; x++) {
        i = o + x;
        dst[i] = tmp[i] + tmp[y > 0 ? i - w : i] + tmp[y < h - 1 ? i + w : i];
      }
    }
  }

  function morph(src, tmp, sum, w, h, keep) {
    var i, n = w * h;
    boxSum3(src, tmp, sum, w, h);
    for (i = 0; i < n; i++) src[i] = sum[i] >= keep ? 1 : 0;
  }

  /* one 4-connected component, flood filled from the back of the hand */
  function component(src, w, h, sx, sy) {
    var n = w * h, out = new Uint8Array(n), stack = new Int32Array(n), top = 0;
    var seed = -1, i, p, x, r;
    for (r = 0; r < 60 && seed < 0; r += 4) {
      for (i = -r; i <= r && seed < 0; i += 4) {
        p = (sy + i) * w + sx;
        if (p >= 0 && p < n && src[p]) seed = p;
        p = sy * w + (sx + i);
        if (p >= 0 && p < n && src[p]) seed = p;
      }
    }
    if (seed < 0) return src;
    stack[top++] = seed;
    out[seed] = 1;
    while (top > 0) {
      p = stack[--top];
      x = p % w;
      if (x > 0 && src[p - 1] && !out[p - 1]) { out[p - 1] = 1; stack[top++] = p - 1; }
      if (x < w - 1 && src[p + 1] && !out[p + 1]) { out[p + 1] = 1; stack[top++] = p + 1; }
      if (p >= w && src[p - w] && !out[p - w]) { out[p - w] = 1; stack[top++] = p - w; }
      if (p < n - w && src[p + w] && !out[p + w]) { out[p + w] = 1; stack[top++] = p + w; }
    }
    return out;
  }

  /* separable moving-sum box blur; three passes are a good enough gaussian */
  function blurPass(src, dst, w, h, r) {
    var x, y, o, s, i, d = 2 * r + 1;
    for (y = 0; y < h; y++) {
      o = y * w;
      s = 0;
      for (i = -r; i <= r; i++) s += src[o + clamp(i, 0, w - 1)];
      for (x = 0; x < w; x++) {
        dst[o + x] = s / d;
        s += src[o + clamp(x + r + 1, 0, w - 1)] - src[o + clamp(x - r, 0, w - 1)];
      }
    }
    for (x = 0; x < w; x++) {
      s = 0;
      for (i = -r; i <= r; i++) s += dst[clamp(i, 0, h - 1) * w + x];
      for (y = 0; y < h; y++) {
        src[y * w + x] = s / d;
        s += dst[clamp(y + r + 1, 0, h - 1) * w + x] - dst[clamp(y - r, 0, h - 1) * w + x];
      }
    }
  }

  function buildMask(data, w, h) {
    var n = w * h, i, i4, r, g, b, l;
    var bin = new Uint8Array(n), tmp = new Uint8Array(n), sum = new Uint8Array(n);
    var soft, buf, keep;

    /* r-g is the discriminator: the linen's is negative, skin's is strongly
       positive. Luminance alone overlaps between lit fabric and shaded fingers. */
    for (i = 0; i < n; i++) {
      i4 = i << 2;
      r = data[i4]; g = data[i4 + 1]; b = data[i4 + 2];
      l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      bin[i] = (r - g > 5.1 && l > 35.7) ? 1 : 0;
    }
    morph(bin, tmp, sum, w, h, 5);   /* median 9  — drop speckles           */
    morph(bin, tmp, sum, w, h, 1);   /* dilate 9  — close holes             */
    morph(bin, tmp, sum, w, h, 9);   /* erode 9   — put the edge back       */

    keep = component(bin, w, h,
      Math.round(PHOTO.seedX * w), Math.round(PHOTO.seedY * h));

    soft = new Float32Array(n);
    buf = new Float32Array(n);
    for (i = 0; i < n; i++) soft[i] = keep[i] ? 255 : 0;
    blurPass(soft, buf, w, h, 2);
    blurPass(soft, buf, w, h, 2);
    blurPass(soft, buf, w, h, 2);

    tmp = new Uint8Array(n);
    for (i = 0; i < n; i++) tmp[i] = soft[i] < 0 ? 0 : (soft[i] > 255 ? 255 : soft[i]);

    /* the mean luminance UNDER the mask is what every tone is scaled against;
       measuring it beats trusting a constant when the phone variant is loaded */
    r = 0; g = 0;
    for (i = 0; i < n; i++) {
      if (!keep[i]) continue;
      i4 = i << 2;
      r += 0.2126 * data[i4] + 0.7152 * data[i4 + 1] + 0.0722 * data[i4 + 2];
      g++;
    }
    if (g > 0) photo.smean = clamp((r / g) / 255, 0.2, 0.95);
    return tmp;
  }

  /* ---- load ------------------------------------------------------------- */

  function loadPhoto() {
    if (photo.promise) return photo.promise;
    photo.state = 'loading';
    photo.promise = new Promise(function (resolve, reject) {
      var img, done = false, cv;
      function fail(e) {
        if (done) return;
        done = true;
        photo.state = 'failed';
        photoOK = false;
        if (SN.Nail) SN.Nail.PHOTO_OK = false;
        reject(e instanceof Error ? e : new Error('SN.Nail: the hand photograph is unavailable'));
      }
      try {
        photo.src = photoFile();
        img = new window.Image();
        img.decoding = 'async';
        img.onload = function () {
          if (done) return;
          try {
            photo.w = img.naturalWidth || PHOTO.w;
            photo.h = img.naturalHeight || PHOTO.h;
            cv = canvasCtx(photo.w, photo.h);
            if (!cv) { fail(new Error('SN.Nail: no 2D canvas')); return; }
            cv.ctx.drawImage(img, 0, 0, photo.w, photo.h);
            photo.base = cv.ctx.getImageData(0, 0, photo.w, photo.h).data;
            photo.mask = buildMask(photo.base, photo.w, photo.h);
            photo.work = cv;
            photo.ratio = ratioLUT(photo.smean);
            photo.state = 'ready';
            done = true;
            resolve(photo);
          } catch (e2) { fail(e2); }
        };
        img.onerror = function () { fail(new Error('SN.Nail: the hand photograph did not load')); };
        img.src = photo.src;
        photo.img = img;
      } catch (e3) { fail(e3); }
    });
    photo.promise['catch'](function () { /* handled through photoOK */ });
    return photo.promise;
  }

  /* ---- recolour --------------------------------------------------------- *
   *  lum    = 0.2126r + 0.7152g + 0.0722b                                    *
   *  ratio  = clamp(lum / smean, 0, 3) ^ 0.92   (the gamma stops highlights  *
   *           blowing out on a deep tone)                                    *
   *  out    = curve[lum] + (rgb - lum) * res    (the residue is what keeps   *
   *           knuckle redness, veins and the nail beds alive)                *
   *  final  = mix(original, out, mask)                                       *
   *  Validated against all six store tones — the linen deliberately does     *
   *  NOT change: the surface is the same, only the person is different.      */

  function ratioLUT(smean) {
    var t = new Float32Array(256), i, v;
    for (i = 0; i < 256; i++) {
      v = (i / 255) / (smean || 0.62);
      if (v < 0) v = 0; else if (v > 3) v = 3;
      t[i] = Math.pow(v, 0.92);
    }
    return t;
  }

  /* ---------------------------------------------------------------------- *
   * THE TONE CURVE — one channel LUT per target, built once per tone.        *
   *                                                                         *
   * Scaling the target by the ratio alone (target * ratio) keeps the SAME    *
   * chroma no matter how bright the pixel, so on a deep tone every specular  *
   * highlight came back as a saturated orange and the hand read terracotta   *
   * instead of brown. It is the wrong physics: a highlight is light bounced  *
   * off the surface film before any pigment touches it, so it carries the    *
   * colour of the LAMP, not of the skin. The darker the skin, the bigger     *
   * the gap between the two and the more obvious the mistake.                *
   *                                                                         *
   * So chroma is scaled separately from luminance. `c` is how much of the    *
   * target's own colour survives at a given brightness:                      *
   *   above mid   c falls off as the pixel brightens, fastest on the deepest *
   *               tones, so highlights wash toward neutral without losing    *
   *               one step of luminance                                      *
   *   below mid   c rises a little, because skin in shadow gains saturation  *
   *               rather than losing it — the warmth stays at the bottom     *
   * `dark` deliberately reaches zero by the time the target is as light as   *
   * the store's Fair, so the two palest tones come out bit for bit as they   *
   * did before and only the tones that were wrong move.                      *
   * ---------------------------------------------------------------------- */
  var TONE_DESAT = 3.2;    /* how hard highlights neutralise on a deep tone  */
  var TONE_WARM = 0.20;    /* how much chroma the shadow end gains           */

  function toneCurve(p) {
    var lut = photo.ratio || ratioLUT(photo.smean);
    var tl = 0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b;
    var dark = clamp((1 - tl / 255 - 0.18) / 0.62, 0, 1);
    var k = TONE_DESAT * dark, sh = TONE_WARM * dark;
    var R = new Float32Array(256), G = new Float32Array(256), B = new Float32Array(256);
    var i, rr, c;
    for (i = 0; i < 256; i++) {
      rr = lut[i];
      c = rr > 1 ? 1 / (1 + (rr - 1) * k) : 1 + (1 - rr) * sh;
      c = clamp(c, 0.25, 1.25);
      R[i] = rr * (c * p.r + (1 - c) * tl);
      G[i] = rr * (c * p.g + (1 - c) * tl);
      B[i] = rr * (c * p.b + (1 - c) * tl);
    }
    /* the residue is the ORIGINAL hand's chroma, in absolute levels, so on a
       deep tone it is proportionally far too strong — dialling it back with
       the same `dark` is what stops the veins reading as orange piping */
    return { r: R, g: G, b: B, res: 0.45 * (1 - 0.88 * dark * dark) };
  }

  function paintTone(hex) {
    var p = parseHex(hex) || { r: 235, g: 192, b: 160 };
    var w = photo.w, h = photo.h, n = w * h;
    var src = photo.base, mask = photo.mask, cur = toneCurve(p);
    var cr = cur.r, cg = cur.g, cb = cur.b, res = cur.res;
    var out = photo.work.ctx.createImageData(w, h);
    var d = out.data;
    var i, i4, r, g, b, l, li, k, or_, og, ob;

    for (i = 0; i < n; i++) {
      i4 = i << 2;
      r = src[i4]; g = src[i4 + 1]; b = src[i4 + 2];
      k = mask[i];
      d[i4 + 3] = 255;
      if (k === 0) { d[i4] = r; d[i4 + 1] = g; d[i4 + 2] = b; continue; }
      l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      li = l < 0 ? 0 : (l > 255 ? 255 : l | 0);
      or_ = cr[li] + (r - l) * res;
      og = cg[li] + (g - l) * res;
      ob = cb[li] + (b - l) * res;
      if (or_ < 0) or_ = 0; else if (or_ > 255) or_ = 255;
      if (og < 0) og = 0; else if (og > 255) og = 255;
      if (ob < 0) ob = 0; else if (ob > 255) ob = 255;
      if (k === 255) { d[i4] = or_; d[i4 + 1] = og; d[i4 + 2] = ob; continue; }
      k /= 255;
      d[i4] = r + (or_ - r) * k;
      d[i4 + 1] = g + (og - g) * k;
      d[i4 + 2] = b + (ob - b) * k;
    }
    photo.work.ctx.putImageData(out, 0, 0);
    /* a photograph belongs in a photographic container — a PNG of this frame
       is ten times the bytes for no visible gain, and both rasterise the same */
    return photo.work.canvas.toDataURL('image/jpeg', 0.92);
  }

  function toneKey(hex) { return col(hex, DEF.skin); }

  /* the cached data URL for a tone, or null when it has not been made yet */
  function toneCached(hex) {
    var k = toneKey(hex);
    return (photo.state === 'ready' && photo.tones[k]) ? photo.tones[k] : null;
  }

  function toneURL(hex) {
    var k = toneKey(hex);
    return loadPhoto().then(function () {
      if (photo.tones[k]) return photo.tones[k];
      photo.tones[k] = paintTone(k);
      photo.order.push(k);
      while (photo.order.length > 8) delete photo.tones[photo.order.shift()];
      return photo.tones[k];
    });
  }

  /* ---- the svg ---------------------------------------------------------- */

  function photoAnchors(side) {
    var out = [], i, k, a, m = side === 'right';
    for (i = 0; i < FINGERS.length; i++) {
      k = FINGERS[i].key;
      a = PHOTO_ANCHOR[k];
      out.push({
        finger: k,
        x: m ? mirrorAxis() - a.x * PHOTO.w : a.x * PHOTO.w,
        y: a.y * PHOTO.h,
        angle: m ? -a.angle : a.angle,
        width: a.width * PHOTO.w,
        tip: a.tip * PHOTO.w
      });
    }
    return out;
  }

  /* A press-on does not float: it casts a hairline seam where its walls meet
     the skin and a soft drop under the free edge, which overhangs the flesh
     entirely. Both are drawn in the plate's own frame, with the photo's key
     light (up and to the left) rotated into it. */
  function contactShadow(defs, d, w, h, ang, mirror, q) {
    var s = w * 0.085;
    var ox = (mirror ? LIGHT.x : -LIGHT.x) * s;   /* world, away from the light */
    var oy = -LIGHT.y * s;
    var c = Math.cos(rad(ang)), sn = Math.sin(rad(ang));
    var lx = c * ox + sn * oy;
    var ly = -sn * ox + c * oy;
    var g = E('g', { 'class': 'sn-plate-shadow', 'pointer-events': 'none' });
    add(g, E('g', {
      transform: 'translate(' + f(lx * 1.7) + ' ' + f(ly * 1.7) + ') ' +
                 'translate(' + f(w / 2) + ' ' + f(h / 2) + ') scale(1.045) ' +
                 'translate(' + f(-w / 2) + ' ' + f(-h / 2) + ')',
      filter: blurF(defs, Math.max(1.2, w * 0.055 * q))
    }, [E('path', { d: d, fill: '#20130F', opacity: 0.42 })]));
    add(g, E('g', {
      transform: 'translate(' + f(lx * 0.45) + ' ' + f(ly * 0.45) + ')',
      filter: blurF(defs, Math.max(0.6, w * 0.018))
    }, [E('path', { d: d, fill: '#2C1A16', opacity: 0.34 })]));
    return g;
  }

  function photoContent(side, design, opts, onFail) {
    var outer = E('g', { 'class': 'sn-photo-body sn-photo-' + side });
    var defs = add(outer, E('defs'));
    /* the quarter turn wraps everything; inside it the photograph's own frame
       is untouched, which is why the anchors below need no adjustment */
    var turn = add(outer, E('g', { 'class': 'sn-photo-turn', transform: photoTurn(side) }));
    /* two hands sit side by side, and each frame is wider than the window it
       is cut to, so without this the second one paints over the first */
    var g = add(turn, E('g', { 'clip-path': photoClip(defs) }));
    var mirror = side === 'right';
    var shape = shapeId(design.shape);
    var aspect = ASPECT[shape];
    var factor = lenFactor(design.length);
    var anchors = photoAnchors(side);
    var q = clamp(num(opts.detail, 0.7), 0.25, 1);
    var tone = toneKey(design.skin);
    var id = photoImage(defs, tone, onFail);
    var frame = E('g', { 'class': 'sn-photo-frame' });
    var i, an, nw, nh, key, el, wrap, t;

    /* the photograph, then itself mirrored about each of its own edges, so the
       window can reach past the frame without ever showing a hole */
    for (t = 0; t < PHOTO_TILES.length; t++) {
      add(frame, E('use', {
        href: '#' + id, 'xlink:href': '#' + id, transform: PHOTO_TILES[t]
      }));
    }
    if (mirror) {
      add(g, E('g', { transform: 'translate(' + f(mirrorAxis()) + ' 0) scale(-1 1)' }, [frame]));
    } else {
      add(g, frame);
    }

    for (i = 0; i < anchors.length; i++) {
      an = anchors[i];
      key = side + an.finger.charAt(0).toUpperCase() + an.finger.slice(1);
      nw = an.width * PHOTO_PLATE_W;
      nh = nw * aspect * factor;
      /* even the shortest press-on covers the natural nail and clears the
         flesh — that is what makes it a press-on and not a sticker */
      if (nh < an.tip * PHOTO_TIP_CLEAR) nh = an.tip * PHOTO_TIP_CLEAR;

      wrap = E('g', {
        'class': 'sn-photo-nail',
        transform: 'translate(' + f(an.x) + ' ' + f(an.y) + ') rotate(' + f(an.angle) + ') ' +
                   'translate(' + f(-nw / 2) + ' ' + f(-nh) + ')'
      });
      add(wrap, contactShadow(defs, path(shape, nw, nh), nw, nh, an.angle, mirror, q));
      el = nailSVG(design.nails[key], {
        shape: shape, w: nw, h: nh, key: key, mirror: false,
        light: an.angle,
        detail: q,
        finishId: design.nails[key] ? design.nails[key].finish : null,
        interactive: !!opts.interactive,
        selected: opts.selected,
        onPick: opts.onPick
      });
      add(wrap, el);
      add(g, wrap);
    }
    if (defs && !defs.firstChild && defs.parentNode) defs.parentNode.removeChild(defs);
    return outer;
  }

  /* The frame, plus itself mirrored about x = 0, about y = 0 and about both.
     Each mirror overshoots its seam by one unit and the untouched frame is
     painted LAST, so every tile edge has an opaque tile underneath it — draw
     them flush and the renderer's antialiasing leaves a hairline of page
     background along each join. */
  var PHOTO_TILES = [
    'translate(1 1) scale(-1 -1)',
    'translate(0 1) scale(1 -1)',
    'translate(1 0) scale(-1 1)',
    null
  ];

  /* ONE <image> per svg, in the shared defs, referenced by every tile of every
     hand: the recoloured tone is a quarter megabyte of base64, and putting it
     on eight elements would put eight copies of it in the DOM */
  function photoImage(defs, tone, onFail) {
    return shared(defs, 'pimg|' + tone, function (d) {
      var id = uid('pimg');
      var cached = toneCached(tone);
      var im = E('image', {
        id: id, x: 0, y: 0, width: f(PHOTO.w), height: f(PHOTO.h),
        preserveAspectRatio: 'none', 'data-sn-photo-tone': tone
      });
      function fail() {
        photoOK = false;
        if (SN.Nail) SN.Nail.PHOTO_OK = false;
        if (typeof onFail === 'function') onFail();
      }
      /* the raw file first so the frame paints as soon as it decodes, then the
         recoloured canvas swaps in — never the other way round, or the first
         paint waits on a mask build it does not need */
      setHref(im, cached || photoFile());
      if (!cached) {
        /* Safari does not reliably fire 'error' on an SVG <image>; the HTML
           Image inside loadPhoto always does, so this is the path that
           actually catches a missing asset there */
        toneURL(tone).then(function (url) { setHref(im, url); }, fail);
      }
      im.addEventListener('error', fail);
      add(d, im);
      return id;
    });
  }

  function photoClip(defs) {
    return shared(defs, 'pcrop', function (d) {
      var id = uid('pcrop');
      add(d, E('clipPath', { id: id, clipPathUnits: 'userSpaceOnUse' },
        [rect(PHOTO.cx, PHOTO.cy, PHOTO.cw, PHOTO.ch)]));
      return 'url(#' + id + ')';
    });
  }

  /* the 404 / no-canvas path: the same <svg> node quietly becomes the drawn
     hand, so a caller that already put it in the document keeps its element */
  function degrade(live, make) {
    var rep, keep = ['viewBox', 'width', 'height', 'style', 'class', 'preserveAspectRatio'], i, v;
    try { rep = make(); } catch (e) { return; }
    if (!rep || !live) return;
    while (live.firstChild) live.removeChild(live.firstChild);
    while (rep.firstChild) live.appendChild(rep.firstChild);
    for (i = 0; i < keep.length; i++) {
      v = rep.getAttribute(keep[i]);
      if (v === null) live.removeAttribute(keep[i]); else live.setAttribute(keep[i], v);
    }
  }

  function photoHand(opts) {
    opts = opts || {};
    var side = opts.side === 'right' ? 'right' : 'left';
    var design, svg;
    if (!photoOK) return hand(opts);
    design = normDesign(opts.design);
    svg = newSvg(opts);
    svg.setAttribute('class', 'sn-svg sn-hand sn-photo-hand sn-hand-' + side);
    inCtx(svg, function () {
      add(svg, photoContent(side, design, opts, function () {
        degrade(svg, function () { return hand(opts); });
      }));
    });
    return sizeCrop(svg, opts.w, 1);
  }

  /* the viewBox is the turned crop window, repeated `n` times across */
  function sizeCrop(svg, w, n) {
    var v = turnedView(), nw = num(w, 0), vw = v.w * n, vh = v.h;
    svg.setAttribute('viewBox', f(v.x) + ' ' + f(v.y) + ' ' + f(vw) + ' ' + f(vh));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    if (nw > 0) {
      svg.setAttribute('width', f(nw));
      svg.setAttribute('height', f(nw * vh / vw));
      svg.setAttribute('style', 'display:block;max-width:100%;height:auto');
    } else {
      svg.setAttribute('style', 'display:block;width:100%;height:auto');
    }
    return svg;
  }

  /* photo unless the caller says otherwise, or unless the asset is not there */
  function previewMode(opts) {
    var m = opts && opts.mode;
    if (m === 'vector' || m === 'drawn' || m === 'svg') return 'vector';
    return photoOK ? 'photo' : 'vector';
  }

  /* Two hands stand side by side, fingers up, wrists at the bottom, thumbs
     facing each other — the pose every nail photograph uses. The left hand
     as shot goes on the left, where its thumb points inward; the right hand
     is that frame reflected in the join between the two windows, so the two
     halves meet on the same column of pixels and the seam disappears. */
  function photoPreview(d, opts) {
    var svg = newSvg(opts);
    function fail() { degrade(svg, function () { return vectorPreview(d, opts); }); }
    if (d.hand === 'both') {
      svg.setAttribute('class', 'sn-svg sn-preview sn-photo-preview sn-preview-both');
      inCtx(svg, function () {
        add(svg, photoContent('left', d, opts, fail));
        add(svg, E('g', { transform: 'translate(' + f(turnedView().w) + ' 0)' },
          [photoContent('right', d, opts, fail)]));
      });
      return sizeCrop(svg, opts.w, 2);
    }
    svg.setAttribute('class', 'sn-svg sn-preview sn-photo-preview sn-preview-' + d.hand);
    inCtx(svg, function () { add(svg, photoContent(d.hand, d, opts, fail)); });
    return sizeCrop(svg, opts.w, 1);
  }

  /* every photo <image> in a tree, upgraded to its recoloured data URL. An
     <image> pointing at a plain file path does not rasterise onto a canvas,
     so export waits for this — after the first tone it is already resolved. */
  function exportReady(el) {
    var root, imgs, list = [], i, im, href;
    try {
      root = resolveSvg(el);
      imgs = (root && root.querySelectorAll)
        ? root.querySelectorAll('image[data-sn-photo-tone]') : null;
      for (i = 0; imgs && i < imgs.length; i++) {
        im = imgs[i];
        href = im.getAttribute('href') || im.getAttributeNS(XLINK, 'href') || '';
        if (href.indexOf('data:') === 0) continue;
        list.push(toneURL(im.getAttribute('data-sn-photo-tone')).then(
          (function (node) { return function (url) { setHref(node, url); }; }(im)),
          function () { /* the drawn hand is already the fallback */ }
        ));
      }
      return list.length ? Promise.all(list) : Promise.resolve(null);
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  /* warm the photo up without blocking anything — safe to call many times */
  function preloadPhoto() {
    if (!photoOK) return Promise.resolve(false);
    return loadPhoto().then(function () { return true; }, function () { return false; });
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

  /* a photo-mode design carries an <image>; make sure its href is the
     recoloured data URL before anything is serialised, then rasterise */
  function rasterize(el, opts) {
    return exportReady(el).then(function () { return rasterizeNow(el, opts); });
  }

  function rasterizeNow(el, opts) {
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

    PHOTO: PHOTO,
    PHOTO_ANCHOR: PHOTO_ANCHOR,
    PHOTO_OK: photoOK,

    path: path,
    nailSVG: nailSVG,
    hand: hand,
    photoHand: photoHand,
    preloadPhoto: preloadPhoto,
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
