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
    /* The drawn hand has one light and every plate borrows it, rotated into
       the plate's own frame. A PHOTOGRAPH does not work that way — its light
       is whatever fell on it, and a finger lying at its own angle can end up
       lit from the other side entirely (the left thumb does). So a caller
       that has MEASURED the light off the photograph passes it straight in,
       and the derivation below is only for hands we draw ourselves. */
    var v = opts && opts.lightVec, n;
    if (v && (num(v.x, 0) || num(v.y, 0))) {
      n = Math.sqrt(num(v.x, 0) * num(v.x, 0) + num(v.y, 0) * num(v.y, 0)) || 1;
      return { x: num(v.x, 0) / n, y: num(v.y, 0) / n };
    }
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

  /* A French tip is a SECOND COAT lying on top of the first, and everything
     that makes one look painted rather than printed is about that edge:
       · the coat is THICKEST at the smile line and thins toward the free
         edge, where light passes through it — so it is brightest and most
         opaque along the smile, not palest there. Getting this backwards is
         what makes a rendered French read as a grey wedge.
       · its edge stands a hair proud of the base, so it catches a fine lip
         of light along the top of the line
       · and it drops a hairline of shadow onto the colour just below it.
     Those three, at a fraction of a millimetre each, are the whole trick. */
  PATTERNS.french = function (g, x) {
    var d = x.h * 0.185 * x.S;
    var line = smile(x, d, 0.42);
    add(g, E('path', {
      d: line + ' L' + f(x.w * 1.28) + ' ' + f(-x.h * 0.3) +
         ' L' + f(-x.w * 0.28) + ' ' + f(-x.h * 0.3) + ' Z',
      /* the path's own box runs from well above the free edge down to the
         belly of the smile, so the free edge sits near the middle of it */
      fill: vGrad(x.defs, [
        [0.42, mix(x.c1, cTip(x.c1), 0.75)],
        [0.60, mix(x.c1, cTip(x.c1), 0.34)],
        [0.82, x.c1],
        [1.00, mix(x.c1, cLit(x.c1), 0.45)]
      ]), opacity: 0.96
    }));
    /* the shadow the lip drops onto the colour below it */
    add(g, E('path', {
      d: line, fill: 'none', stroke: darken(x.base, 0.34),
      'stroke-width': f(Math.max(x.u * 1.4, 0.7)), opacity: 0.26,
      transform: 'translate(0 ' + f(x.u * 1.1) + ')'
    }));
    /* and the lip itself, sitting just inside the tip */
    add(g, E('path', {
      d: line, fill: 'none', stroke: cTip(x.c1),
      'stroke-width': f(Math.max(x.u * 0.8, 0.5)), opacity: 0.85,
      transform: 'translate(0 ' + f(-x.u * 0.45) + ')'
    }));
  };

  PATTERNS.frenchDeep = function (g, x) {
    var d = x.h * 0.34 * x.S;
    var line = smile(x, d, 0.30);
    add(g, E('path', {
      d: line + ' L' + f(x.w * 1.28) + ' ' + f(-x.h * 0.3) +
         ' L' + f(-x.w * 0.28) + ' ' + f(-x.h * 0.3) + ' Z',
      fill: vGrad(x.defs, [
        [0.34, mix(x.c1, cTip(x.c1), 0.70)],
        [0.56, mix(x.c1, cTip(x.c1), 0.30)],
        [0.84, x.c1],
        [1.00, mix(x.c1, cLit(x.c1), 0.40)]
      ])
    }));
    /* the deep French is drawn with a contrast liner along the smile */
    add(g, E('path', {
      d: line, fill: 'none', stroke: x.c2,
      'stroke-width': f(Math.max(x.u * 1.5, 0.7)), opacity: 0.7
    }));
    add(g, E('path', {
      d: line, fill: 'none', stroke: darken(x.base, 0.32),
      'stroke-width': f(Math.max(x.u * 1.3, 0.6)), opacity: 0.22,
      transform: 'translate(0 ' + f(x.u * 1.5) + ')'
    }));
    add(g, E('path', {
      d: line, fill: 'none', stroke: cTip(x.c1),
      'stroke-width': f(Math.max(x.u * 0.7, 0.45)), opacity: 0.7,
      transform: 'translate(0 ' + f(-x.u * 1.2) + ')'
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
  /* ------------------------------------------------------------- marble */
  /*  A vein in stone is not a line. It is a SEAM, so it has a width that     */
  /*  swells and dies, it branches, and it fades out where the mineral ran    */
  /*  out — it never simply stops. A stroked path cannot do any of that: a    */
  /*  stroke has one width and two ends, and a dash to hide the ends only     */
  /*  trades a drawn line for a dotted one. So every vein here is a FILLED    */
  /*  ribbon whose half-width is a curve that starts at nothing and returns   */
  /*  to nothing, which is the whole difference between marble and a squiggle */
  /*  drawn on a nail.                                                        */
  /* ---------------------------------------------------------------------- */

  /* the spine of one seam: a drifting line down the plate, sampled */
  function veinSpine(x, x0, y0, y1, drift, n) {
    var pts = [], i, t, dx = 0, vx = 0;
    for (i = 0; i <= n; i++) {
      t = i / n;
      /* a random walk with momentum reads as geology; a fresh random offset
         at every step reads as noise */
      vx = vx * 0.68 + x.rnd.r(-1, 1) * drift;
      dx += vx;
      pts.push([x0 + dx + Math.sin(t * 4.3 + x0) * drift * 1.4, y0 + (y1 - y0) * t]);
    }
    return pts;
  }

  /* that spine, given a body: half-width rises from nothing, wanders, and
     returns to nothing, so both ends come to a point on their own */
  function veinRibbon(x, pts, wMax, bias) {
    var n = pts.length - 1, i, t, hw, L = [], R = [], a;
    for (i = 0; i <= n; i++) {
      t = i / n;
      /* sin gives a clean taper at both ends; the exponent slides the belly
         of the seam up or down its length */
      hw = wMax * Math.pow(Math.sin(Math.PI * Math.pow(t, bias)), 0.72) *
        (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 11 + pts[0][0])));
      /* offset perpendicular to the local direction */
      a = Math.atan2(pts[Math.min(n, i + 1)][1] - pts[Math.max(0, i - 1)][1],
                     pts[Math.min(n, i + 1)][0] - pts[Math.max(0, i - 1)][0]);
      L.push([pts[i][0] + Math.sin(a) * hw, pts[i][1] - Math.cos(a) * hw]);
      R.push([pts[i][0] - Math.sin(a) * hw, pts[i][1] + Math.cos(a) * hw]);
    }
    for (i = n; i >= 0; i--) L.push(R[i]);
    /* the same corner-rounding the hand silhouette uses: a ribbon assembled
       from straight segments has facets, and a faceted vein is a drawing */
    return smoothClosed(L);
  }

  PATTERNS.marble = function (g, x) {
    var warp = marbleF(x.defs, x.u * 2.2 * x.S, 0.026 / x.S, (hash32(String(x.key)) % 90) + 1);
    var q = clamp(num(x.q, 1), 0.25, 1);
    var i, j, cloud, wob, pts, sub, k, wMax, tone, halo, y0;
    var nV = Math.max(2, Math.round(3 * q));

    /* 1. the stone. Soft overlapping fields of the secondary colour, warped
          by one shared turbulence so no two nails cloud the same way. */
    cloud = add(g, E('g', { filter: warp }));
    add(cloud, rect(-2, -2, x.w + 4, x.h + 4, { fill: x.c2, opacity: 0.16 }));
    for (i = 0; i < 4; i++) {
      add(cloud, E('ellipse', {
        cx: f(x.rnd.r(0.05, 0.95) * x.w), cy: f(x.rnd.r(0.05, 0.95) * x.h),
        rx: f(x.w * x.rnd.r(0.30, 0.58) * x.S),
        ry: f(x.h * x.rnd.r(0.14, 0.28) * x.S),
        fill: radGrad(x.defs, [
          [0, i === 1 ? lighten(x.c2, 0.42) : mix(x.c2, x.c1, 0.22), 0.52],
          [0.52, i === 1 ? lighten(x.c2, 0.42) : x.c2, 0.26],
          [1, x.c2, 0]
        ]),
        transform: 'rotate(' + f(x.rnd.r(-40, 40)) + ' ' +
          f(x.rnd() * x.w) + ' ' + f(x.rnd() * x.h) + ')'
      }));
    }

    /* 2. the seams. Three passes per vein: a wide soft bleed where the
          mineral stained the stone around it, the seam itself, and a fine
          bright thread of light along its crown. All three are ribbons, so
          all three come to a point. */
    wob = add(g, E('g', { filter: warp }));
    halo = mix(x.c1, x.base, 0.42);
    for (i = 0; i < nV; i++) {
      wMax = x.u * x.rnd.r(1.6, 3.2) * x.S;
      /* A seam that runs the whole plate is a hair lying on the nail: the
         taper has nowhere to happen. Every one of these starts and finishes
         INSIDE the stone, over between half and all of its length. */
      y0 = x.rnd.r(-0.14, 0.34) * x.h;
      pts = veinSpine(x, x.rnd.r(0.08, 0.92) * x.w, y0,
                      y0 + x.rnd.r(0.52, 1.10) * x.h, x.w * 0.10 * x.S, 12);
      tone = i % 2 ? mix(x.c1, x.c2, 0.34) : x.c1;
      add(wob, E('path', {
        d: veinRibbon(x, pts, wMax * 3.6, x.rnd.r(0.75, 1.35)),
        fill: halo, opacity: 0.19
      }));
      add(wob, E('path', {
        d: veinRibbon(x, pts, wMax, x.rnd.r(0.8, 1.3)), fill: tone, opacity: 0.36
      }));
      add(wob, E('path', {
        d: veinRibbon(x, pts, wMax * 0.32, x.rnd.r(0.7, 1.4)),
        fill: lighten(tone, 0.46), opacity: 0.42
      }));
      /* one branch, leaving the seam part way down and dying out quickly —
         a seam that never forks is a drawn line however well it tapers */
      if (i < 2) {
        k = 2 + (i % 4);
        sub = [];
        for (j = 0; j < 6; j++) {
          sub.push([pts[Math.min(pts.length - 1, k)][0] +
                    (j * j) * x.w * 0.020 * (i % 2 ? -1 : 1) * x.S,
                    pts[Math.min(pts.length - 1, k)][1] +
                    j * x.h * 0.048 * x.S * x.rnd.r(0.8, 1.2)]);
        }
        add(wob, E('path', {
          d: veinRibbon(x, sub, wMax * 0.58, 1), fill: tone, opacity: 0.34
        }));
      }
    }
  };

  /* ---------------------------------------------------------------- chrome */
  /*  A chrome nail is a MIRROR the size of a fingernail, and what it mirrors  */
  /*  is a room. That is the whole model, and everything a render usually      */
  /*  gets wrong about chrome follows from not having one:                     */
  /*    · a room has a HORIZON — the hard line where the lit ceiling ends and  */
  /*      the darker floor begins. It is an EDGE, not a blend. One hard edge   */
  /*      does more for chrome than any amount of gradient polish.             */
  /*    · a room has more than one of them: a second, weaker step where a wall */
  /*      meets a window, and a third dark one at the cuticle where the mirror */
  /*      is looking back down at the hand holding it.                          */
  /*    · above the horizon it goes almost white; below it, almost black. The  */
  /*      RANGE is what says metal. Mid greys say paint.                       */
  /*    · metal is never neutral: it keeps a tint of the colour it was         */
  /*      powdered with, strongest in the mid tones and burnt out of the        */
  /*      highlight.                                                            */
  /*    · and the mirror is CURVED, so everything in it is squeezed toward the */
  /*      sides — which the crosswise pass on top of this does.                */
  /* ------------------------------------------------------------------------ */

  /* one reflected edge: two stops a whisker apart, so the ramp between them
     is a single pixel wide however large the nail is drawn */
  function edgeAt(out, t, below, above) {
    out.push([t, below]);
    out.push([t + 0.004, above]);
  }

  function mirrorFill(defs, c, tint) {
    /* the metal itself: the colour, softened toward a neutral so the darks can
       reach black and the lights white without going muddy or candied */
    var m = mix(col(c, '#C9CDD6'), tint ? col(tint, c) : c, 0.30);
    var g0 = mix(m, '#8E8792', 0.20);
    var sky = mix(g0, '#FFFFFF', 0.90);
    var lit = mix(g0, '#FFFFFF', 0.55);
    var flr = mix(darken(g0, 0.74), '#09090C', 0.46);
    var st = [];
    /* the room, read from the cuticle outward. The bands are DELIBERATELY
       uneven — a room is not a flag — and each one carries a ramp of its own,
       because a reflected surface is lit across its own width too. */
    /* the mirror is looking back down at the hand that wears it, so the very
       bottom of the reflection is warm and dark, not neutral */
    st.push([0.00, mix(darken(g0, 0.44), '#7A5044', 0.28)]);
    st.push([0.11, mix(darken(g0, 0.30), '#7A5044', 0.16)]);
    /* a window low in the wall behind the hand */
    edgeAt(st, 0.205, darken(g0, 0.34), mix(sky, lit, 0.30));
    st.push([0.265, mix(g0, '#FFFFFF', 0.42)]);
    st.push([0.325, mix(g0, '#FFFFFF', 0.10)]);
    st.push([0.385, darken(g0, 0.32)]);
    st.push([0.45, darken(g0, 0.56)]);
    /* THE HORIZON. One hard edge between a dark band and a near white one is
       worth more than every soft stop in this list put together. */
    edgeAt(st, 0.505, darken(g0, 0.60), sky);
    st.push([0.575, mix(sky, lit, 0.35)]);
    st.push([0.655, lit]);
    /* the far wall meeting the ceiling: a second step, weaker */
    edgeAt(st, 0.715, mix(lit, g0, 0.55), darken(g0, 0.36));
    st.push([0.79, darken(g0, 0.54)]);
    st.push([0.855, darken(g0, 0.44)]);
    st.push([0.90, mix(g0, '#FFFFFF', 0.30)]);
    /* and beyond the fingertip, the dark of the room again */
    st.push([1.00, mix(flr, g0, 0.18)]);
    /* A nail is a section of a CYLINDER, so it does not reflect the room in
       straight bands: every horizontal in the room comes back as a shallow
       arc. A radial ramp centred well below the cuticle and stretched wide
       gives exactly that arc, and it is the single change that stops chrome
       reading as a striped decal. */
    return radGrad(defs, st, {
      cx: 0.5, cy: 1.15, r: 1.2,
      gradientTransform: 'translate(0.5 1.15) scale(1.85 1) translate(-0.5 -1.15)'
    });
  }

  /* The curvature. A cylinder compresses everything it reflects toward its
     silhouette, so the same room repeats, darker and squashed, at both side
     walls — and there is a hard vertical line down the ridge where the two
     halves of the reflection meet. */
  function mirrorCurve(g, x, lx) {
    var peak = clamp(0.46 - num(lx, -0.4) * 0.16, 0.28, 0.68);
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: hGrad(x.defs, [
        [0.00, '#08070A', 0.70],
        [0.06, '#08070A', 0.34],
        [0.115, '#FFFFFF', 0.20],
        [0.175, '#08070A', 0.10],
        [f(Math.max(0.22, peak - 0.16)), '#08070A', 0.02],
        [f(peak), '#FFFFFF', 0.14],
        [f(Math.min(0.85, peak + 0.17)), '#08070A', 0.03],
        [0.875, '#08070A', 0.14],
        [0.925, '#FFFFFF', 0.17],
        [0.965, '#08070A', 0.38],
        [1.00, '#08070A', 0.72]
      ])
    }));
    /* the seam down the ridge, where the two halves of the reflection meet.
       Narrow and soft-shouldered, not a drawn line. */
    add(g, rect(f((peak - 0.035) * x.w), -1, f(x.w * 0.07), x.h + 2, {
      fill: hGrad(x.defs, [
        [0, '#FFFFFF', 0], [0.46, '#FFFFFF', 0.18],
        [0.54, '#FFFFFF', 0.18], [1, '#FFFFFF', 0]
      ])
    }));
  }

  PATTERNS.chrome = function (g, x) {
    add(g, rect(-1, -1, x.w + 2, x.h + 2, { fill: mirrorFill(x.defs, x.c1, x.c2) }));
    mirrorCurve(g, x, x.L && x.L.x);
    /* the free edge of a chrome nail is the brightest thing on it: the powder
       wraps the rim and catches the light end on */
    add(g, E('path', {
      d: x.d, fill: 'none', stroke: '#FFFFFF',
      'stroke-width': f(x.u * 1.6), opacity: 0.75
    }));
  };

  /* ------------------------------------------------------------- glazed */
  /*  The glazed donut is a NUDE NAIL YOU CAN STILL SEE, with a pearl powder  */
  /*  buffed over it. Everything that goes wrong with it goes wrong the same  */
  /*  way: the veil is painted too strong, the base disappears, and what is   */
  /*  left is a white nail with a rainbow on it. So the base is barely        */
  /*  touched through the middle, and the effect lives in three thin things:  */
  /*    · a milky sheen that builds toward the free edge, where the powder    */
  /*      is buffed hardest and the plate is thinnest                          */
  /*    · an iridescent SHIFT that is strongest at grazing angles — at the     */
  /*      side walls and across the ridge — pink one side, ice the other       */
  /*    · a pearl shimmer fine enough that you read it as a sheen and not as   */
  /*      glitter, which is one shared tile plus a dozen bright ones           */
  /* ---------------------------------------------------------------------- */
  PATTERNS.glazed = function (g, x) {
    var S = clamp(num(x.S, 1), 0.5, 1.6);
    var q = clamp(num(x.q, 1), 0.25, 1);
    var i, n, cx, cy, rr;
    /* pearl powder is never a cold white — it is bone, with the base's own
       warmth still in it, which is what keeps a nude nail a nude nail */
    var pearl = mix(mix(col(x.c1, '#FFFFFF'), '#FFF7F3', 0.5), lighten(x.base, 0.6), 0.24);
    var warm = mix(col(x.c2, '#E8B4C8'), '#FFCFE0', 0.55);
    var cool = mix(col(x.c2, '#E8B4C8'), '#CDE8FF', 0.80);
    var peak = clamp(0.5 + num(x.L && x.L.x, -0.4) * 0.18, 0.26, 0.74);

    /* 1. the milk. Weakest at the cuticle — you are meant to see the nude
          through it — and heaviest at the free edge. */
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: vGrad(x.defs, [
        [0.00, pearl, f(0.46 * S)],
        [0.16, pearl, f(0.34 * S)],
        [0.42, pearl, f(0.21 * S)],
        [0.72, pearl, f(0.13 * S)],
        [1.00, pearl, f(0.07 * S)]
      ])
    }));

    /* 2. the shift. Pearl is interference, so it does its work where the
          light leaves at a shallow angle: the two walls and the crown of the
          ridge. Across the nail one way, along it the other, both weak — it
          is a hue TRAVELLING, never a coat of colour. */
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: hGrad(x.defs, [
        [0.00, warm, f(0.52 * S)],
        [0.14, warm, f(0.30 * S)],
        [f(Math.max(0.22, peak - 0.16)), warm, f(0.06 * S)],
        [f(peak), '#FFFFFF', f(0.10 * S)],
        [f(Math.min(0.80, peak + 0.18)), cool, f(0.10 * S)],
        [0.88, cool, f(0.34 * S)],
        [1.00, cool, f(0.56 * S)]
      ])
    }));
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: dGrad(x.defs, [
        [0.00, mix(warm, '#FFC7A8', 0.5), f(0.30 * S)],
        [0.34, mix(x.c1, '#C9AEFF', 0.62), f(0.16 * S)],
        [0.62, mix(cool, '#9FE8FF', 0.4), f(0.18 * S)],
        [1.00, mix(warm, '#FFE7A8', 0.55), f(0.30 * S)]
      ], 0.08, 1, 0.92, 0.06)
    }));

    /* 3. the bloom, where the powder was buffed hardest */
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: radGrad(x.defs, [
        [0, '#FFFFFF', f(0.66 * S)], [0.26, '#FFFFFF', f(0.34 * S)],
        [0.60, pearl, f(0.10 * S)], [1, pearl, 0]
      ], {
        cx: f(clamp(peak - 0.04, 0.2, 0.8)),
        cy: f(clamp(0.30 + num(x.L && x.L.y, 0.5) * 0.10, 0.12, 0.48)), r: 0.52
      })
    }));

    /* 4. the shimmer. Fine enough to read as a sheen: one shared tile for the
          field, and a dozen that are actually catching the light. */
    add(g, rect(0, 0, x.w, x.h, {
      fill: flakeP(x.defs, '#FFFFFF', x.u * 11, nd(52, q), 0.014, 0.034, 12, 11),
      opacity: 0.72
    }));
    add(g, rect(0, 0, x.w, x.h, {
      fill: flakeP(x.defs, mix(warm, '#FFFFFF', 0.25), x.u * 15, nd(38, q), 0.015, 0.036, -29, 12),
      opacity: 0.55
    }));
    n = Math.round(14 * q);
    for (i = 0; i < n; i++) {
      cx = x.rnd() * x.w; cy = x.rnd() * x.h; rr = x.rnd.r(0.30, 0.85) * x.u;
      add(g, E('circle', {
        cx: f(cx), cy: f(cy), r: f(rr),
        fill: x.rnd.pick(['#FFFFFF', '#FFE4F0', '#DCEEFF', '#FFF4D8']),
        opacity: f(x.rnd.r(0.45, 0.9))
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


  /* ====================================================================== */
  /* Glitter cat eye — the shop's OWN product                                */
  /*                                                                         */
  /*  Measured off one nail of @shosh_nail's own set, and it is a different   */
  /*  MATERIAL from the smooth coloured `catEye` above, not a variant of it.  */
  /*  What the measurements say, and what every layer below is for:           */
  /*                                                                          */
  /*    · the plate is 9% deep black, 24% dark base, then 26/19/12% of three   */
  /*      shimmer tiers — i.e. the magnetic band is not a smooth ramp, it is   */
  /*      a DENSE FIELD OF FINE FLAKES, 27% of the plate above 0.55 luminance, */
  /*      at 0.277 local standard deviation. Individual flakes resolve.        */
  /*    · saturation of that shimmer is 0.037: it is PURE SILVER, and it stays */
  /*      silver whatever colour the base is. pattern.color is the way out of  */
  /*      that — a gold or rose-gold version, still barely saturated.          */
  /*    · luminance by third, cuticle -> tip, is 0.540 / 0.376 / 0.247. The    */
  /*      effect is brightest at the CUTICLE and fades to the free edge, the   */
  /*      exact opposite of the tip-weighted `tipsGlitter`.                    */
  /*    · and there are TWO narrow HARD reflections, not one soft sliver.      */
  /*      A pair of strip lights, unblurred, is what says "thick glossy gel"   */
  /*      rather than "a drawing of a shiny thing".                            */
  /*                                                                          */
  /*  The density gradient is done by DARKENING, not by placing fewer specks:  */
  /*  a uniform flake field under a veil that opens over the band costs three  */
  /*  shared <pattern> tiles and three rects, and it survives being shrunk to  */
  /*  a 40px hand preview — where the flakes merge into a sheen and the band   */
  /*  plus the near-black perimeter carry the whole read.                      */
  /* ====================================================================== */

  /* A speckle tile with resolvable grains, unlike grainP's dust. Shared for
     the whole page: one definition however many nails ask for it. */
  function flakeP(defs, tone, size, dots, r0, r1, rot, seed) {
    /* Quantised onto a 22%-per-step ladder. Nothing in the hand is scaled —
       a plate is placed with a translate and a rotate — so a flake is the
       same physical size on the thumb as on the pinky, and the ten plates,
       whose widths span barely a third, then all land on the same one or two
       rungs and SHARE these tiles instead of asking for thirty. That is the
       difference between this pattern costing a few hundred nodes on a ten
       nail preview and costing a few thousand. */
    var sz = Math.max(1, num(size, 10));
    sz = Math.round(Math.pow(1.22, Math.round(Math.log(sz) / Math.log(1.22))) * 100) / 100;
    return shared(defs, 'fk|' + tone + '|' + sz + '|' + dots + '|' + r0 + '|' + r1 +
      '|' + rot + '|' + seed,
      function (d) {
        var id = uid('fk');
        var pt = E('pattern', {
          id: id, width: f(sz), height: f(sz), patternUnits: 'userSpaceOnUse',
          /* A tile is a lattice, and a lattice on a nail is instantly a
             printed fabric. Three tiles at three incommensurate sizes AND
             three angles never line up, so what the eye gets back is a field
             with no direction in it. */
          patternTransform: 'rotate(' + f(rot) + ')'
        });
        var r = seeded('flake|' + seed + '|' + tone), i, rr, cx, cy;
        for (i = 0; i < dots; i++) {
          rr = sz * r.r(r0, r1);
          /* Inset from the tile edge: a grain sliced in half by the tile
             boundary is a straight line, and a grid of straight lines is
             exactly the lattice the three tiles exist to hide. */
          cx = r.r(rr, sz - rr); cy = r.r(rr, sz - rr);
          /* a crushed-foil flake is a stubby lozenge, not a dot: giving each
             one its own aspect and angle is what stops the tile reading as a
             dotted screen when it repeats */
          pt.appendChild(E('ellipse', {
            cx: f(cx), cy: f(cy),
            rx: f(rr), ry: f(rr * r.r(0.22, 0.78)),
            fill: tone, opacity: f(r.r(0.30, 1)),
            transform: 'rotate(' + f(r.r(0, 180)) + ' ' + f(cx) + ' ' + f(cy) + ')'
          }));
        }
        add(d, pt);
        return 'url(#' + id + ')';
      });
  }

  /* how many grains a tile carries at the current detail budget. Deliberately
     shallow: a hand preview still has to shimmer, it just does not have to
     resolve. */
  function nd(base, q) { return Math.round(base * (0.58 + 0.42 * clamp(q, 0.25, 1))); }

  /* A long, near-parallel-sided reflection with tapered ends, centred on the
     origin and running along the nail. HARD edged on purpose. */
  function gcStrip(L, W, bow) {
    return pb()
      .M(-W * 0.50, -L * 0.90)
      .C(-W * 0.18, -L * 1.03, W * 0.18, -L * 1.03, W * 0.58, -L * 0.88)
      .C(W * 0.98, -L * 0.40, W * 0.98 + bow, L * 0.22, W * 0.70 + bow, L * 0.84)
      .C(W * 0.38 + bow, L * 1.02, -W * 0.20 + bow, L * 1.02, -W * 0.54 + bow, L * 0.82)
      .C(-W * 0.92, L * 0.24, -W * 0.92, -L * 0.40, -W * 0.50, -L * 0.90)
      .Z().d();
  }

  /* Every colour and number in one place. `base` decides the dark; `c1`
     decides whether the shimmer is silver, gold or rose gold. */
  function gcMix(x) {
    var B = ceHsl(col(x.base, '#141118'));
    var A = ceHsl(col(x.c1, '#FFFFFF'));
    var S = clamp(num(x.S, 1), 0.5, 1.8);
    /* The product is a dark nail. However light a colour the customer picks,
       the hue survives and the value does not: this is near-black gel with
       silver in it, and a pastel version of it is a different product. */
    var bl = clamp(0.055 + B.l * 0.20, 0.055, 0.26);
    var bs = clamp(B.s * 1.05, 0, 0.92);
    /* Silver is the measured truth (saturation 0.037). Anything the customer
       puts in pattern.color is read as a TINT on that silver, never as a
       colour: capped low, so gold reads as gold leaf and not as yellow paint,
       and a stray default like white or pink stays silver. */
    var tint = A.s < 0.14 ? 0 : clamp((A.s - 0.10) * 1.5, 0, 1);
    var th = A.h;
    function shim(l, k) {
      return ceHex(th, tint * clamp(k, 0, 1), clamp(l, 0, 1));
    }
    return {
      edge: ceHex(B.h, clamp(bs * 1.1, 0, 1), bl * 0.36),
      deep: ceHex(B.h, bs, bl),
      lift: ceHex(B.h, bs * 0.94, clamp(bl * 1.55, 0, 0.34)),
      /* the three shimmer tiers the histogram counts, plus the specular */
      dust: shim(0.66, 0.30),
      mid: shim(0.80, 0.26),
      hot: shim(0.93, 0.20),
      spec: shim(0.985, 0.10),
      /* how wide the band's opening is, in fractions of the plate width.
         0.6 -> a tight wire of shimmer inside a black frame,
         1.6 -> the flake field reaches nearly to the side walls. */
      bw: clamp(0.30 * S, 0.17, 0.52)
    };
  }

  PATTERNS.glitterCatEye = function (g, x) {
    var m = gcMix(x);
    var q = clamp(num(x.q, 1), 0.25, 1);
    var Lx = num(x.L && x.L.x, -0.4), Ly = num(x.L && x.L.y, 0.5);
    var i, n, px, py, sz, op, t, band, sx, hx, hy, gl, ring;
    /* the concentric frame, as fractions of the nail width */
    var RW = [0.40, 0.26, 0.155, 0.075, 0.030];
    var RO = [0.16, 0.22, 0.30, 0.40, 0.56];

    /* 1. the dark plate. Lengthwise, because the gel is thickest and least
          emptied near the cuticle — 0.540 there against 0.247 at the tip. */
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: vGrad(x.defs, [
        [0, m.edge], [0.10, m.deep], [0.62, m.lift], [0.94, m.deep], [1, m.edge]
      ])
    }));

    /* 2. THE FLAKE FIELD, at three grains, laid over the whole plate. Density
          is handled by the veil in step 3, not by thinning these out: a tile
          costs one definition and buys a few hundred grains, which is the
          only way 27% coverage survives ten nails on a phone. */
    add(g, rect(0, 0, x.w, x.h, {
      fill: flakeP(x.defs, m.dust, x.u * 14, nd(100, q), 0.020, 0.048, 0, 1), opacity: 1
    }));
    add(g, rect(0, 0, x.w, x.h, {
      fill: flakeP(x.defs, m.mid, x.u * 18.5, nd(86, q), 0.020, 0.045, 24, 2), opacity: 0.95
    }));
    add(g, rect(0, 0, x.w, x.h, {
      fill: flakeP(x.defs, m.hot, x.u * 25, nd(62, q), 0.021, 0.047, -37, 3), opacity: 0.9
    }));

    /* 3. THE BAND, cut as a veil rather than painted as a light. Everywhere
          the magnet did not pull the pigment, the black base comes back over
          the flakes — which is what a density gradient looks like. Across the
          nail first: the opening is pattern.scale wide. */
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: hGrad(x.defs, [
        [0.00, m.edge, 0.97],
        [f(clamp(0.5 - m.bw * 1.80, 0.02, 0.40)), m.edge, 0.90],
        [f(clamp(0.5 - m.bw * 1.30, 0.05, 0.44)), m.deep, 0.66],
        [f(clamp(0.5 - m.bw * 0.86, 0.08, 0.46)), m.deep, 0.26],
        [f(clamp(0.5 - m.bw * 0.34, 0.11, 0.49)), m.deep, 0],
        [f(clamp(0.5 + m.bw * 0.34, 0.51, 0.89)), m.deep, 0],
        [f(clamp(0.5 + m.bw * 0.90, 0.53, 0.92)), m.deep, 0.30],
        [f(clamp(0.5 + m.bw * 1.32, 0.55, 0.95)), m.deep, 0.68],
        [f(clamp(0.5 + m.bw * 1.74, 0.58, 0.99)), m.edge, 0.90],
        [1.00, m.edge, 0.97]
      ])
    }));
    /* and the other side of the same coin: where the magnet gathered the
       pigment there is simply MORE of it, so the band gets a whisper of the
       shimmer tone added back over the field. Weak on purpose — the band has
       to read as density, and a bright wash is what turns it into paint. */
    add(g, rect(0, 0, x.w, x.h, {
      fill: ceRamp(x.defs, [
        [0.00, m.hot, 0.30], [0.28, m.mid, 0.24],
        [0.60, m.dust, 0.13], [1.00, m.dust, 0]
      ], clamp(m.bw * 1.20, 0.2, 0.62), 0.80, 0.62)
    }));
    /* then along it — the measured 0.540 / 0.376 / 0.247 by third. Nothing is
       added at the cuticle; the tip simply has more of the base put back. */
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: vGrad(x.defs, [
        [0.00, m.edge, 0.94],
        [0.06, m.edge, 0.70],
        [0.18, m.deep, 0.50],
        [0.36, m.deep, 0.30],
        [0.58, m.deep, 0.13],
        [0.82, m.deep, 0.01],
        [0.96, m.deep, 0.06],
        [1.00, m.edge, 0.34]
      ])
    }));
    /* the measured cuticle third, 0.540 against 0.247 at the free edge. Not a
       highlight — a broad rise in how much of the field is lit at all, which
       is what a magnet held against the finger actually leaves behind. */
    add(g, rect(0, 0, x.w, x.h, {
      fill: ceRamp(x.defs, [
        [0.00, m.mid, 0.26], [0.40, m.dust, 0.17],
        [0.74, m.dust, 0.06], [1.00, m.dust, 0]
      ], clamp(m.bw * 2.0, 0.34, 0.92), 0.58, 0.88)
    }));

    /* 4. the flakes that RESOLVE. The tiles give the field its density; these
          give it its 0.277 local contrast — the few dozen grains per nail that
          are catching the light dead on. Placed with a bias toward the band
          and toward the cuticle, so they thin out exactly where the veil
          above has already taken the field down. */
    n = Math.round(62 * q * q);
    band = m.bw * 1.25;
    for (i = 0; i < n; i++) {
      /* a triangular draw around the axis: dense on the band, tailing off */
      sx = (x.rnd() + x.rnd() - 1);
      px = 0.5 + sx * band;
      /* toward the cuticle: sqrt bias up the nail */
      py = 0.10 + Math.pow(x.rnd(), 0.62) * 0.88;
      if (px < 0.06 || px > 0.94) continue;
      t = (1 - Math.abs(sx)) * (0.35 + 0.65 * py);
      op = clamp(t * x.rnd.r(0.45, 1), 0.05, 1);
      sz = x.u * x.rnd.r(0.36, 1.05);
      add(g, E('ellipse', {
        cx: f(px * x.w), cy: f(py * x.h), rx: f(sz), ry: f(sz * x.rnd.r(0.4, 0.95)),
        fill: x.rnd() < 0.30 ? m.spec : (x.rnd() < 0.55 ? m.hot : m.mid),
        opacity: f(op),
        transform: 'rotate(' + f(x.rnd.r(0, 180)) + ' ' + f(px * x.w) + ' ' + f(py * x.h) + ')'
      }));
    }

    /* 5. THE FRAME. Concentric strokes of the silhouette, so the black hugs
          the point of an almond at a constant thickness the way it does in
          the photograph — a bounding-box gradient cannot. Half of each stroke
          falls outside the clip, so the stack ramps inward; one shared blur
          turns the steps into a continuous ramp. */
    ring = add(g, E('g', {
      fill: 'none', stroke: m.edge, filter: blurF(x.defs, x.u * 2.4)
    }));
    for (i = 0; i < RW.length; i++) {
      add(ring, E('path', { d: x.d, 'stroke-width': f(x.w * RW[i]), opacity: f(RO[i]) }));
    }

    /* 6. THE GLOSS. Two narrow HARD reflections — a pair of studio strip
          lights in a thick gel top coat. Not blurred, not soft, not one fat
          blob: the pair, and their hard edges, are the whole reason the
          material reads as a coating with depth rather than as a texture. */
    hx = clamp(0.42 - Lx * 0.10, 0.26, 0.62) * x.w;
    hy = clamp(0.58 + Ly * 0.05, 0.46, 0.70) * x.h;
    gl = add(g, E('g'));
    add(gl, E('path', {
      d: gcStrip(x.h * 0.33, x.w * 0.068, x.w * 0.020),
      fill: vGrad(x.defs, [
        [0, m.spec, 0.16], [0.18, m.spec, 0.86], [0.70, m.spec, 0.90], [1, m.spec, 0.20]
      ]),
      transform: 'translate(' + f(hx) + ' ' + f(hy) + ') rotate(' + f(-5 + Lx * 6) + ')'
    }));
    add(gl, E('path', {
      d: gcStrip(x.h * 0.27, x.w * 0.030, x.w * 0.010),
      fill: vGrad(x.defs, [
        [0, m.spec, 0.12], [0.24, m.spec, 0.72], [0.74, m.spec, 0.70], [1, m.spec, 0.14]
      ]),
      transform: 'translate(' + f(hx + x.w * 0.185) + ' ' + f(hy - x.h * 0.055) +
        ') rotate(' + f(-9 + Lx * 6) + ')'
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
  /* SIZE, BRIGHTNESS AND EDGE ARE MEASURED. The reflection on the shop's own
     nail (see nail-gloss.js) covers about a third of the width and a fifth of
     the length, peaks at three quarters of pure white, and climbs from nothing
     to two thirds of that peak across two per cent of the nail. That last
     number is the whole difference between "wet" and "airbrushed": a drawn
     highlight is nearly always too big and too soft, and a soft-edged white
     cloud on a nail reads as fog, not as glass. Where it goes is still the
     light's business — a photograph of one nail in one pose cannot know where
     a finger is pointing. */
  function specular(g, x, strength) {
    /* x.gloss is how much MEASURED reflection already landed on this plate. A
       drawn bloom beside a real reflection reads as a smudge, so it stands
       down to a faint sheen and lets the photograph carry the highlight. */
    strength = strength * (1 - 0.80 * clamp(num(x.gloss, 0), 0, 1));
    if (strength <= 0.02) return;
    var peak = clamp(0.5 + x.L.x * 0.18, 0.22, 0.78);
    var hy = clamp(0.34 + x.L.y * 0.09, 0.12, 0.52);
    var bx = peak * x.w, by = hy * x.h;
    var rw = x.w * 0.125, rh = Math.min(x.h * 0.123, x.w * 0.22);
    /* The wet band. A nail is a section of a CYLINDER, so it smears whatever
       it reflects ALONG its own length — which is why this is taller than it
       is wide even though the measurement, taken at the flat cuticle end of a
       nail lying on cloth, came out the other way round. Area and brightness
       are the measured ones; the elongation is the geometry. */
    add(g, E('ellipse', {
      cx: f(bx), cy: f(by + rh * 0.35), rx: f(rw), ry: f(rh * 1.5),
      fill: radGrad(x.defs, [
        [0, '#FFFFFF', f(0.70 * strength)],
        [0.42, '#FFFFFF', f(0.52 * strength)],
        [0.72, '#FFFFFF', f(0.17 * strength)],
        [1, '#FFFFFF', 0]
      ]),
      transform: 'rotate(' + f(x.L.x * 14) + ' ' + f(bx) + ' ' + f(by + rh * 0.35) + ')'
    }));
    /* the hot spot: small and hard, this is what says "wet" */
    add(g, E('ellipse', {
      cx: f(bx - x.w * 0.026), cy: f(by - rh * 0.42), rx: f(x.w * 0.042), ry: f(rh * 0.30),
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
    mirrorCurve(g, x, x.L.x);
    /* one reflected upright — the edge of a door frame, a mirror, a person.
       A mirror with nothing in it is a gradient; one irregular vertical thing
       in the room is what makes the eye read the rest as a reflection. */
    add(g, E('path', {
      d: pb().M(x.w * 0.20, -2).L(x.w * 0.335, -2).L(x.w * 0.30, x.h * 0.52)
        .L(x.w * 0.145, x.h + 2).L(x.w * 0.03, x.h + 2).L(x.w * 0.17, x.h * 0.5).Z().d(),
      fill: '#F6F4F8', opacity: 0.16
    }));
    add(g, E('path', {
      d: x.d, fill: 'none', stroke: '#FFFFFF', 'stroke-width': f(x.u * 1.7), opacity: 0.78
    }));
  };

  /* ------------------------------------------------------------- velvet */
  /*  A flocked pile is not matte paint. Light does not bounce off it, it     */
  /*  goes IN, rattles around a forest of fibres and comes back out having    */
  /*  forgotten where it came from — so there is no specular anywhere on it.  */
  /*  What there is instead, and what makes velvet unmistakable:               */
  /*    · a broad diffuse BLOOM, far wider and far softer than a highlight     */
  /*    · a bright fringe just inside the silhouette on the side AWAY from     */
  /*      the light: at a grazing angle you are looking along the fibres and   */
  /*      every one of them is lit. This is the single loudest velvet cue and  */
  /*      the one a matte finish never has.                                    */
  /*    · the pile CRUSHED where it is pressed — the near rim and the cuticle  */
  /*      — which always goes darker than the field                            */
  /*    · and a silhouette that is not quite a hard edge, because the fibres   */
  /*      stand up past it                                                     */
  /* ---------------------------------------------------------------------- */
  FINISHES.velvet = function (g, x) {
    var q = clamp(num(x.q, 1), 0.25, 1);
    var lit = mix(lighten(x.color, 0.55), '#FFF6F2', 0.22);
    var cx = clamp(0.5 + x.L.x * 0.16, 0.22, 0.78);
    var cy = clamp(0.40 + x.L.y * 0.10, 0.14, 0.70);
    /* the far side, where the pile is seen end on */
    var far = clamp(0.5 - x.L.x * 0.5, 0.08, 0.92);
    var dk;

    /* 1. the bloom — broad, soft, and nowhere near white */
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: radGrad(x.defs, [
        [0, lit, 0.62], [0.30, lighten(x.color, 0.34), 0.38],
        [0.68, lighten(x.color, 0.14), 0.13], [1, x.color, 0]
      ], { cx: f(cx), cy: f(cy), r: 0.88 })
    }));

    /* 2. the grazing fringe, across the nail: bright where you are looking
          ALONG the fibres, dark where the pile is pressed toward you. Both
          sit a little inboard of the silhouette — the last few percent of the
          plate is already the wall turning away, and putting the fringe out
          there just cancels against it. */
    dk = darken(x.color, 0.44);
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: hGrad(x.defs, far > 0.5 ? [
        [0.00, dk, 0.52], [0.07, dk, 0.34], [0.22, x.color, 0],
        [0.68, x.color, 0], [0.82, lit, 0.34], [0.915, lit, 0.72],
        [0.975, lit, 0.52], [1.00, lit, 0.24]
      ] : [
        [0.00, lit, 0.24], [0.025, lit, 0.52], [0.085, lit, 0.72],
        [0.18, lit, 0.34], [0.32, x.color, 0], [0.78, x.color, 0],
        [0.93, dk, 0.34], [1.00, dk, 0.52]
      ])
    }));
    /* and along it: the free edge stands the fibres up, the cuticle presses
       them flat */
    add(g, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: vGrad(x.defs, [
        [0.00, lit, 0.42], [0.09, lit, 0.18], [0.24, x.color, 0],
        [0.74, x.color, 0], [0.90, darken(x.color, 0.40), 0.24],
        [1.00, darken(x.color, 0.48), 0.46]
      ])
    }));

    /* 3. the fuzz. One blurred stroke of the pile's own light tone straddling
          the outline: inside the clip it lands as a soft band that has no
          edge of its own, which is what a fibre fringe looks like. */
    add(g, E('path', {
      d: x.d, fill: 'none', stroke: lighten(x.color, 0.34),
      'stroke-width': f(Math.max(x.u * 3.2, 1)), opacity: 0.42,
      filter: blurF(x.defs, x.u * 2.6)
    }));
    /* the pile crushed hard against the wall, under the fuzz */
    add(g, E('path', {
      d: x.d, fill: 'none', stroke: darken(x.color, 0.50),
      'stroke-width': f(Math.max(x.u * 9, 2)), opacity: 0.34,
      filter: blurF(x.defs, x.u * 3.5)
    }));

    /* 4. the pile itself. Two grains at different scales, because a flocked
          surface is fibres in clumps, not a single frequency. */
    if (q >= 0.5) {
      add(g, rect(-1, -1, x.w + 2, x.h + 2, {
        fill: grainP(x.defs, lit, 0.6, x.u * 8), opacity: 0.42
      }));
      add(g, rect(-1, -1, x.w + 2, x.h + 2, {
        fill: grainP(x.defs, darken(x.color, 0.62), 0.55, x.u * 12.5), opacity: 0.36
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
  /* 8b. The measured surface                                               */
  /*                                                                         */
  /*  Every other layer in this file is drawn. This one is measured. SN.Gloss */
  /*  (nail-gloss.js) is the diffuse shading of one real press-on from the    */
  /*  shop, photographed and separated from its own pink, so that             */
  /*  out = colour x shade puts a real surface under whichever colour the     */
  /*  customer picked. Its striations, its milky depth and the bright band    */
  /*  down its length are things no gradient was going to invent.             */
  /*                                                                         */
  /*  It is stretched over the plate box and clipped to the real outline. It  */
  /*  was warped row by row out of the photographed nail's silhouette into a  */
  /*  plain rectangle first, so "across the nail" means the same thing on a   */
  /*  stiletto as on a square.                                                */
  /*                                                                         */
  /*  Strength is per finish, and it is not a dimmer on one effect: a matte   */
  /*  nail keeps ALL of the form the photograph measured and loses only the   */
  /*  highlight, which is drawn separately — that is what matte is.           */
  /* ====================================================================== */

  var GLOSS_MIX = {
    gloss: 0.95, jelly: 0.78, glitter: 0.72, chrome: 0.45, matte: 0.62, velvet: 0.5
  };
  function glossMix(kind) {
    var v = GLOSS_MIX[kind];
    return typeof v === 'number' ? v : GLOSS_MIX.gloss;
  }

  /* One <image> per SVG root, referenced by every nail on it. The maps are
     data: URIs about 18 KB together, and ten copies of that in the markup was
     the whole reason this goes through shared()/<use> instead of ten <image>
     elements. */
  function glossImg(defs, which, tiles) {
    var G = SN.Gloss, uri = G && G[which], n = Math.max(1, num(tiles, 1));
    if (typeof uri !== 'string' || !uri) return null;
    return shared(defs, 'glossimg|' + which, function (dd) {
      var id = uid('gl');
      add(dd, E('image', {
        id: id, x: 0, y: 0, width: n, height: 1,
        preserveAspectRatio: 'none', href: uri, 'xlink:href': uri
      }));
      return id;
    });
  }

  /* ====================================================================== */
  /* 8d. THE REFLECTION                                                      */
  /*                                                                         */
  /*  A plate drawn as colour x shade is a MULTIPLY and nothing else, and a  */
  /*  multiply can only ever darken. So the brightest pixel on it was 1.18x  */
  /*  its own body, against 1.78-2.14x on the shop's real press-ons; nothing */
  /*  anywhere on it reached three times its own median, where a real nail   */
  /*  has 4-31% of its area up there; and its least saturated 2% still sat   */
  /*  at 87% of the plate's own saturation, against 23% on a real one.       */
  /*  Nothing on it was white. Its chroma even climbed toward the highlight, */
  /*  which is the arithmetic signature of tinted paint and the opposite of  */
  /*  what light does.                                                       */
  /*                                                                         */
  /*      out = colour x SHADE + REFLECTION                                  */
  /*                                                                         */
  /*  And a reflection is WHITE. That one fact is the whole reason this is   */
  /*  affordable: it does not multiply out against 45 colours x 8 shapes x   */
  /*  4 lengths x 6 finishes x 22 patterns x 43 charms — one 8 KB greyscale  */
  /*  sheet is correct for every combination of them.                        */
  /*                                                                         */
  /*  The sheet holds FIVE reflections, pulled off five nails in one of the  */
  /*  shop's own photographs (see tools/spec-map.py). Each finger is dealt a */
  /*  different one, mirrored on the hand whose light comes from the other   */
  /*  side, so ten fingers are not ten copies of one photograph.             */
  /* ====================================================================== */

  var SPEC_MIX = {
    gloss: 1, jelly: 0.85, glitter: 0.5, chrome: 0.34, matte: 0, velvet: 0
  };

  /* THE VEIL — a broad, low return of the whole room, tinted with the nail's
     own colour, sitting UNDER the measured surface. Scaled by that colour's
     lightness, which is what scattering actually is: a milky nude sends light
     back out of the pigment, an onyx absorbs it. A WHITE veil was tried and
     took a black nail to 0.43 of the skin's luminance — grey, not black.

     VEIL_K = 0.30, and the reason is the one thing a screen blend cannot help
     doing. Screening ANY colour onto a base that is already bright pushes
     every channel toward 1, and the brightest channel gets there first, so
     the gap between the channels — the chroma — closes. Measured on ten
     plates against the two real press-ons we have photographs of: a real
     nail's body holds 0.90 of its paint's own saturation and washes out only
     in the top luminance decile, where the lamp is. This render held 0.69 of
     it and washed out EVERYWHERE, which is the whole reason a nude was
     reading as grey stone against the finger. At 0.30 the body is back to
     0.87 and the measured reflection underneath finally shows as a reflection
     instead of a milky film over one.

     Tested and rejected on the way: tinting the veil with the colour at full
     chroma instead of lightened toward white (0.69 -> 0.71), and the veil in
     the nail's own colour untouched (0.73). It is not the veil's colour that
     desaturates, it is the blend, so the only real lever is how much of it
     there is. The 1.18 nail/skin figure this layer used to be sized by was a
     bad measurement — patch-sampled on the same photograph it is 1.07, and
     even that is a fact about how light the reference's polish was next to
     that model's skin, not something a finish can be asked to deliver. */
  var VEIL_K = 0.30;


  function specVeil(host, x, kind) {
    var k = SPEC_MIX[kind], vk;
    if (typeof k !== 'number') k = SPEC_MIX.gloss;
    if (!x.on || k <= 0) return;
    vk = k * VEIL_K * Math.pow(clamp(lum(col(x.color, '#C98BA0')), 0, 1), 1.6);
    if (vk <= 0.003) return;
    add(host, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: radGrad(x.defs, [
        [0, lighten(col(x.color, '#C98BA0'), 0.34), f(0.62 * vk)],
        [0.48, lighten(col(x.color, '#C98BA0'), 0.30), f(0.44 * vk)],
        [0.80, lighten(col(x.color, '#C98BA0'), 0.24), f(0.17 * vk)],
        [1, lighten(col(x.color, '#C98BA0'), 0.2), 0]
      ], { cx: f(clamp(0.5 + x.L.x * 0.10, 0.3, 0.7)), cy: 0.42, r: 0.86 }),
      style: 'mix-blend-mode:screen'
    }));
  }

  /* A REFLECTION IS THE SAME BRIGHTNESS WHATEVER IS UNDER IT — but a
     PHOTOGRAPH of one is not. On a dark polish the diffuse contributes almost
     nothing, so the specular lands on an empty sensor and blows out; on a pale
     one the diffuse has already used most of the range, and what the camera
     records where the two meet is compressed, not summed. Measured at the size
     the studio actually draws a nail (42-55 device px across, not the 165 an
     earlier note assumed), a real pale press-on peaks at 0.908 of white over a
     body of 0.478 while this render peaked at 0.984 over 0.685: our specular
     was the HOTTER of the two, on a body that was already brighter.
     What that costs is chroma at the top. The least-saturated 2% over the
     median — the one number that catches a highlight going too white — reads
     0.27 on his own plain press-on and 0.36-0.38 on the pale ones, and this
     render read 0.20. Scaling the additive layer down by the paint's own
     lightness is the cheapest honest model of that compression, and it moves
     the nude to 0.27 while leaving a black nail's reflection alone (0.07
     either way, and its peak/body 5.36 -> 5.32). */
  var REFL_PALE = 0.15;

  function specReflect(host, x, kind) {
    var G = SN.Gloss, n = G ? Math.max(1, num(G.specN, 1)) : 1;
    var k = SPEC_MIX[kind], id, tile, r = x.rnd, sc, dx, dy, a, sx;
    if (typeof k !== 'number') k = SPEC_MIX.gloss;
    if (!x.on || k <= 0) return 0;
    id = glossImg(x.defs, 'spec', n);
    if (!id) return 0;
    tile = Math.floor(r() * n) % n;
    /* the same kind of seeded nudge the surface gets, so the reflection and
       the surface under it belong to one object */
    sc = 1.0 + r() * 0.10;
    dx = (r() - 0.5) * x.w * 0.10;
    dy = (r() - 0.5) * x.h * 0.06;
    a  = (r() - 0.5) * 7;
    sx = (x.L.x > 0 ? -1 : 1) * x.w * sc;
    add(host, E('use', {
      href: '#' + id, 'xlink:href': '#' + id,
      transform: 'translate(' + f(x.w / 2 + dx) + ' ' + f(x.h / 2 + dy) + ') ' +
                 'rotate(' + f(a) + ') ' +
                 'scale(' + f(sx) + ' ' + f(x.h * sc) + ') ' +
                 'translate(' + f(-(tile + 0.5)) + ' -0.5)',
      opacity: f(k * (0.86 + r() * 0.24) * (1 - REFL_PALE * clamp(lum(col(x.color, '#C98BA0')), 0, 1))),
      style: 'mix-blend-mode:screen'
    }));
    return k;
  }

  /* Returns how much of the photographic specular actually landed, so the
     vector highlight downstream can get out of its way instead of adding a
     second, drawn hot spot next to the measured one. */
  function photoGloss(host, x, kind) {
    var id, tf, r = x.rnd, sc, dx, dy, a;
    if (!x.on) return;
    id = glossImg(x.defs, 'shade', 1);
    if (!id) return;

    /* ONE measurement on ten fingers would put the same surface at the same
       angle on every nail of the hand, and ten identical anythings is the
       single most artificial thing a render can do — real fingers each sit at
       their own small angle. So each nail gets its own seeded nudge: a little
       scale, a little offset, a degree or two of tilt. Seeded, so the same
       nail is the same nail on every repaint.
       The map is laid down oversized on purpose: after the nudge it still
       covers the whole plate, and a multiply layer that stops short leaves a
       seam exactly where the silhouette is. But the oversize used to be 1.09
       to 1.16 with offsets of 7% and 5% and five degrees of tilt, and a map
       that fills its own image can only pay for that out of the NAIL: the
       plate was seeing the middle 72% of the measurement and none of its
       edges, where a nail keeps most of its form. That cost the whole
       transverse curve — the map's own columns run 0.53 at the shaded wall
       to 0.95 across — and it read as the plate having no shape in it.
       So tools/gloss-map.py now emits the nail at 90% of the image inside an
       edge-replicated border, and the nudge is small enough to spend itself
       on that border: at the worst combination of scale, offset and tilt the
       plate still lands inside the padding, and the nail's own edges land on
       the plate's edges instead of a hand's width outside them. */
    sc = 1.05 + r() * 0.05;
    dx = (r() - 0.5) * x.w * 0.036;
    dy = (r() - 0.5) * x.h * 0.028;
    a  = (r() - 0.5) * 3;
    /* The photograph was lit from the upper left. When the finger's own
       rotation puts this nail's light on the other side, the measurement has
       to turn round with it or half the hand is lit from the wrong way. */
    tf = 'translate(' + f(x.w / 2 + dx) + ' ' + f(x.h / 2 + dy) + ') ' +
         'rotate(' + f(a) + ') ' +
         'scale(' + f((x.L.x > 0 ? -1 : 1) * x.w * sc) + ' ' + f(x.h * sc) + ') ' +
         'translate(-0.5 -0.5)';

    add(host, E('use', {
      href: '#' + id, 'xlink:href': '#' + id, transform: tf,
      opacity: f(x.mix * (0.94 + r() * 0.12)), style: 'mix-blend-mode:multiply'
    }));
  }

  /* ====================================================================== */
  /* 8c. THE RIM REFLECTS THE ROOM                                           */
  /*                                                                         */
  /*  Measured, and it is the biggest single thing between this render and a */
  /*  photograph. Inside ONE nail, a real press-on photographed under window  */
  /*  light runs from luminance 0.245 to 0.884 — 1.85 stops. The plate as it  */
  /*  was drawn ran 0.482 to 0.840 — 0.80 stops. It was missing a whole stop, */
  /*  all of it at the BOTTOM: nothing in it was ever dark.                   */
  /*                                                                         */
  /*  The reason is Fresnel. A polished surface reflects almost nothing when  */
  /*  you look straight down it and almost EVERYTHING at a grazing angle, and */
  /*  the rim of a nail seen from above is exactly grazing. So the rim is not */
  /*  the polish shaded down — it IS whatever is beside the hand, which here  */
  /*  is dark cloth at luminance 0.2. That is where a real nail's blacks come */
  /*  from, and no amount of darkening the polish's own colour produces them: */
  /*  a dark red nail shaded darker is still red, while a real one goes       */
  /*  cloth-coloured at the edge and red again a millimetre in.               */
  /*                                                                         */
  /*  Falloff read off the real nail: the outermost pixel is 0.62x the        */
  /*  interior and it is back to 0.91x by 6% of the width, which inverts to   */
  /*  roughly 0.85 reflectance at the silhouette, 0.2 at 6% in, gone by 30%.  */
  /*  Two gradients do it — across and along — with transparent middles so    */
  /*  the two environment colours never interpolate through each other.       */
  /*                                                                         */
  /*  env: { l, r, t, b } — what is out there to the left, to the right, past */
  /*  the free edge and behind the cuticle. Photo hands measure it off the    */
  /*  photograph (baked into the anchors); the drawn hand knows its own       */
  /*  background. Missing = skip, and nothing else changes.                   */
  /* ====================================================================== */

  var RIM = [
    [0.000, 0.86], [0.014, 0.62], [0.035, 0.40],
    [0.065, 0.20], [0.120, 0.09], [0.300, 0.00]
  ];

  /*  AND ONE WALL SEES THE LIGHT ITSELF. The rim above is the room, and the   */
  /*  room is dark on both sides of a hand on this cloth, which is why a plate */
  /*  came out with two dark edges and nothing between them. But a wall's      */
  /*  grazing sweep runs from horizontal to vertical, so it does not only look */
  /*  sideways at the cloth — on the side the light is coming from it also     */
  /*  looks straight into the source, and a window is brighter than the whole  */
  /*  rest of the room put together. That reflection is what you actually see  */
  /*  on a real press-on: a thin bright line down one edge, following the      */
  /*  silhouette, sharper than any shading.                                    */
  /*                                                                          */
  /*  It goes ON TOP of the room, not instead of it. Taking the cloth off the  */
  /*  lit wall was tried and it is wrong twice: the horizontal part of the     */
  /*  sweep is still looking at cloth whichever side the light is on, and on a */
  /*  black nail — where the cloth is most of what the wall has — removing it  */
  /*  lifted the whole plate to 2.06 of its own swatch and flattened it.       */
  /*                                                                          */
  /*  Narrower than the dark rim, because a source is small and a room is      */
  /*  everywhere: it is gone by 11% of the width where the room's rim runs to  */
  /*  30%. Scaled by how sideways the light is, so a nail lit from straight    */
  /*  overhead gets none of it.                                                */
  var RIMLIT = [
    [0.000, 0.66], [0.012, 0.42], [0.030, 0.21],
    [0.060, 0.08], [0.115, 0.00]
  ];

  /*  What the lit wall is mirroring. Daylight through a window, slightly warm;
      an anchor may override it with env.s when its own light is measured. */
  var RIM_SOURCE = '#FFF3E6';

  function rimStops(c, flip, table) {
    var out = [], i, t, T = table || RIM;
    for (i = 0; i < T.length; i++) {
      t = flip ? 1 - T[i][0] : T[i][0];
      out.push([f(t), c, f(T[i][1])]);
    }
    if (flip) out.reverse();
    return out;
  }

  function envRim(host, x) {
    var e = x.env, k = clamp(num(x.k, 1), 0, 1), st, lx, litR, side, sc;
    if (!e || k <= 0.02) return;
    /* Which wall faces the light, and how sideways that light is. L.x > 0 is
       a light off to the right — the same convention the veil's centre and the
       measured surface's mirroring already use. */
    lx = x.L ? num(x.L.x, 0) : 0;
    litR = lx > 0;
    side = clamp(Math.abs(lx), 0, 1);
    /* across the nail: left wall then right wall, transparent in between */
    st = rimStops(col(e.l, '#2E3338'), false)
      .concat(rimStops(col(e.r, '#2E3338'), true));
    add(host, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: hGrad(x.defs, st), opacity: f(k)
    }));
    /* and the grazing band on the wall that faces it */
    if (side > 0.05) {
      sc = col(e.s, RIM_SOURCE);
      st = litR ? [[0, sc, 0]].concat(rimStops(sc, true, RIMLIT))
                : rimStops(sc, false, RIMLIT).concat([[1, sc, 0]]);
      add(host, rect(-1, -1, x.w + 2, x.h + 2, {
        fill: hGrad(x.defs, st), opacity: f(k * side),
        style: 'mix-blend-mode:screen'
      }));
    }
    /* Along it, and the two ends are not the same thing at all.
       THE FREE EDGE IS NOT A GRAZING REFLECTION. At the sides the plate turns
       away and you see the room; at the tip you are looking at the CUT END of
       a millimetre of acrylic, which is thick and scattering, so the dark
       cloth beyond the fingertip does not belong on it at anything like the
       strength the sides get. It had 0.55 of the nail's median there and the
       free-edge layer below could not lift it. How bright the tip should end
       up is a property of the PRODUCT, not of physics: a translucent pearl
       over a pale table measures 1.04 of the body, his own opaque dusty pink
       0.74 and the shop's black glitter 0.54. Ours sits at 0.76, which is
       where a plain opaque press-on belongs, so this gradient is nearly
       switched off at the tip end and the free-edge layer carries it.
       The cuticle end stays gentle for its own reason: the plate and the skin
       nearly touch there, so there is no grazing view of anything. */
    st = rimStops(col(e.t, '#2E3338'), false).map(function (p) {
      return [p[0], p[1], f(num(p[2], 0) * 0.14)];
    }).concat(rimStops(col(e.b, '#8A6154'), true).map(function (p) {
      return [p[0], p[1], f(num(p[2], 0) * 0.55)];
    }));
    add(host, rect(-1, -1, x.w + 2, x.h + 2, {
      fill: vGrad(x.defs, st), opacity: f(k * 0.85)
    }));
  }

  /* ====================================================================== */
  /* 8e. GRAIN                                                               */
  /*                                                                         */
  /*  The plate is composited onto a PHOTOGRAPH, and a photograph has noise.  */
  /*  Measured on the studio hand at three times device scale: the skin       */
  /*  beside a plate carries a high-frequency sigma of 0.0142 and the cloth   */
  /*  0.0215, while the plate itself carried 0.0092 — smooth in a way nothing */
  /*  else in the frame is. That gap is most of why an eighth of a pale plate */
  /*  measured as having NO gradient anywhere: not because the shading is     */
  /*  wrong, but because a real surface is never noiseless and this one was.  */
  /*                                                                          */
  /*  Grain matching is the oldest trick in compositing and it is nearly free */
  /*  here: one feTurbulence, baked once into a shared <pattern>, tiled over  */
  /*  the plate in OVERLAY so the perturbation scales with the level — which  */
  /*  is what sensor noise does — and so it never lifts a black nail off its  */
  /*  black. No payload at all: the noise is generated, not shipped.          */
  /*                                                                          */
  /*  The tile is measured in the plate's own user units, and on the photo    */
  /*  hands a user unit IS a pixel of the photograph, so the grain lands at   */
  /*  the same scale as the grain it is matching.                             */
  /*                                                                          */
  /*  0.12 and 0.22, not 0.16 and 0.55, and both numbers moved for one reason: */
  /*  the old pair was tuned on a plate 135 device px across and the studio    */
  /*  draws one at 42-55. At the size the page actually renders, the old grain */
  /*  measured 1.20 of the skin's own high-frequency sigma — the plate was the */
  /*  noisiest thing in the frame rather than the best match to it — while     */
  /*  three quarters of the amplitude at two fifths of the frequency measures  */
  /*  1.15 and delivers MORE of the variation that survives a 1.2 px blur,     */
  /*  which is the only variation a viewer at that size can see: dead-flat     */
  /*  area 11.7% -> 11.0% against 9.7% on the reference. Less noise, more      */
  /*  structure.                                                              */
  /*                                                                          */
  /*  What grain still cannot do, measured again at the right size and against */
  /*  the right metric: the INTERIOR of the plate. Sweeping amplitude 0.12 to  */
  /*  0.20 over frequencies 0.22 / 0.10 / 0.06 moves the interior median       */
  /*  |grad| from 0.0076 only to 0.0084, and takes the noise ratio to 1.27 to  */
  /*  do it, where five real press-ons measure 0.0085-0.0139. Whatever is      */
  /*  missing inside a plate is structure, not noise — the conclusion an       */
  /*  earlier cycle reached at the wrong size, now confirmed at the right one. */
  /* ====================================================================== */

  /* How much of the grain is independent per channel. The plate has to match
     the photograph it sits IN, not another photograph: the skin in our own
     studio frame measures 2.16 degrees of chroma-direction spread, and in the
     pale reference the nails measure 4.26-5.13 against that frame's own skin at
     4.39 — a ratio of 0.97 to 1.17. Ours was 0.79, too uniform. Swept at studio
     size: 0.00 -> 0.79, 0.18 -> 1.01, 0.25 -> 1.16, 0.35 -> 1.33. 0.22 sits at
     1.08, inside the range, and the luminance noise does not move at all. */
  var GRAIN_CHROMA = 0.22;

  function grainPat(defs, amp, freq) {
    var k = Math.round(clamp(num(amp, 0.5), 0.05, 3) * 100) / 100;
    var bf = Math.round(clamp(num(freq, 2.2), 0.2, 8) * 100) / 100;
    return shared(defs, 'filmgrain|' + k + '|' + bf + '|' + f(GRAIN_CHROMA), function (dd) {
      /* A SENSOR'S NOISE IS NOT GREY. This matrix used to feed the turbulence's
         RED channel into all three outputs, so every grain pixel was a pure
         grey: it moved luminance and could not move hue by construction. A real
         sensor reads three independent wells and a JPEG then keeps some of that
         chroma jitter, and it is a large part of why a photographed nail is not
         one flat hue. Measured as the circular standard deviation of the chroma
         direction inside the nail — his own plain press-on 6.55 deg, three pale
         ones 4.91 / 4.26 / 5.13, ours 1.71 on a nude and 0.58 on a red: three
         to eleven times too uniform, and blurring the references shows a large
         part of theirs living at the pixel scale, exactly where grain lives.
         So each output channel now gets a shared monochrome part plus its OWN
         independent part. GRAIN_CHROMA sets the split; chroma noise is quieter
         than luminance noise in every real sensor, so it is well under half. */
      var fid = uid('gnf'), pid = uid('gn');
      var kc = k * GRAIN_CHROMA, km = k - kc, o = f(0.5 - 0.5 * k);
      var rows = f(km + kc) + ' 0 0 0 ' + o + '  ' +
                 f(km) + ' ' + f(kc) + ' 0 0 ' + o + '  ' +
                 f(km) + ' 0 ' + f(kc) + ' 0 ' + o + '  0 0 0 0 1';
      add(dd, E('filter', {
        id: fid, x: '0%', y: '0%', width: '100%', height: '100%',
        'color-interpolation-filters': 'sRGB'
      }, [
        E('feTurbulence', {
          type: 'fractalNoise', baseFrequency: f(bf), numOctaves: '4',
          seed: '11', stitchTiles: 'stitch', result: 'n'
        }),
        E('feColorMatrix', { 'in': 'n', type: 'matrix', values: rows })
      ]));
      add(dd, E('pattern', {
        id: pid, width: 64, height: 64, patternUnits: 'userSpaceOnUse'
      }, [E('rect', { x: 0, y: 0, width: 64, height: 64, filter: 'url(#' + fid + ')' })]));
      return 'url(#' + pid + ')';
    });
  }

  function filmGrain(host, x) {
    if (!x.on) return;
    add(host, rect(-2, -2, x.w + 4, x.h + 4, {
      fill: grainPat(x.defs, x.amp, x.freq), style: 'mix-blend-mode:overlay',
      'pointer-events': 'none'
    }));
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
    var cs;
    var gDamp, gd, gOn, gRefl;

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
    /* how much of the plate's form the photograph is about to supply */
    /* The three-nail fan on a shop card is 30 px across; there the maps are
       18 KB of data URI per card and not one visible pixel, so the callers
       that want them say so. Everything that draws a nail big enough to look
       at does. */
    gOn = (opts.gloss === undefined || opts.gloss === null ? q >= 0.62 : !!opts.gloss)
      && !!(SN.Gloss && typeof SN.Gloss.shade === 'string');
    gDamp = gOn ? glossMix(kind) : 0;
    tipD = clamp(0.075 + 0.045 * (w * 1.55 / h), 0.055, 0.17);

    /* One clip application for the whole plate. Clipping turned out to be the
       most expensive thing on the page at ten nails — far more than the
       filters — so every layer that needs the silhouette shares a single
       clipped group instead of asking for its own. */
    /* isolation: the multiply/screen layers of the measured topcoat must
       blend against the plate and nothing else — without this they would
       reach through to the finger photograph underneath. */
    clipG = add(g, E('g', {
      'clip-path': 'url(#' + clipId + ')', style: 'isolation:isolate'
    }));
    body = add(clipG, E('g', jelly ? { opacity: 0.87 } : null));
    plate = body;

    /* 1. THE C-CURVE. Painted with real colours, not a translucent veil, so
       the customer's colour survives intact through the middle of the nail
       and only the walls turn away from the light.

       IT IS AN ARCH HERE AND A RAMP IN LIFE, and the difference was measured
       and then NOT acted on, which needs saying. Across the nail — measured
       perpendicular to the long axis, luminance over the nail's own median,
       sixteen bands:

         his plain dusty pink  0.67 0.76 0.81 0.86 0.91 0.94 0.97 1.00
                               1.00 1.07 1.11 1.13 1.16 1.18 1.16 1.13
         the pale press-ons    0.81 0.87 0.91 0.93 0.95 0.97 0.97 1.00
                               1.00 1.03 1.06 1.08 1.09 1.09 1.09 1.07
         the shop's black      0.91 1.03 1.30 1.58 1.58 1.13 0.86 0.69
                               0.65 0.57 0.67 0.82 1.43 1.67 1.44 0.97
         ours                  0.72 0.81 0.91 0.99 1.01 1.00 1.01 1.02
                               1.03 1.02 1.01 1.02 1.03 0.99 0.90 0.83

       A pale nail is a RAMP — dark at the shaded wall, brightest at the lit
       one — because most of what you see on it is diffuse pigment following
       the cosine of the light. A black one is not: it is two specular streaks
       over a dark trough with both walls near the median, because a black gel
       returns almost nothing diffusely. Ours is an arch, symmetric, flat in
       the middle: right for the black, too tidy for the pale.

       Rebuilding it as a ramp scaled by the paint's lightness was tried in
       full. It does move the across-profile the right way — the lit wall goes
       0.85 to 0.92 and the swing 1.42 to 1.58 — and it costs more than that
       everywhere else: dead-flat area 7.4% to 10.9% on the nude, body
       saturation 0.85 to 0.83, |grad| 0.024 to 0.021 on the red, and the black
       plate to 2.06 of its own swatch with its |grad| down from 0.053 to 0.037.
       One metric bought with four. Reverted, and left here so the next attempt
       starts from the measurements rather than from the idea: what a ramp needs
       is to REPLACE the arch's lit lobe, not to be added around it, and that
       means the lengthwise form and the measured surface have to move with it. */
    cs = [
      [0.00, cEdge(n.color)],
      [0.05, cWall(n.color)],
      [f(Math.max(0.10, peak - 0.20)), n.color],
      [f(peak), cLit(n.color)],
      [f(Math.min(0.90, peak + 0.24)), n.color],
      [0.95, cWall(n.color)],
      [1.00, cEdge(n.color)]
    ];
    add(plate, E('path', { d: d, fill: hGrad(defs, cs) }));

    /* 2. lengthwise form. When the measured topcoat is coming (photoGloss,
       below) it already carries this — it was photographed off a nail that
       had it — so the drawn version steps down instead of shading twice and
       turning the middle of the plate to mud. */
    gd = 1 - 0.40 * gDamp;
    add(plate, E('path', {
      d: d,
      fill: vGrad(defs, [
        [0, '#FFFFFF', f(0.10 * gd)],
        [f(Math.max(0.03, ybright - 0.12)), '#FFFFFF', 0],
        [f(ybright), '#FFFFFF', f(0.13 * gd)],
        [f(Math.min(0.72, ybright + 0.28)), '#FFFFFF', 0],
        [0.82, '#150C10', f(0.06 * gd)],
        [1, '#150C10', f(0.20 * gd)]
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
    /* THE CUT END OF THE ACRYLIC. Measured along nine real press-ons on a real
       hand, the tip is the brightest part of the whole nail — 1.10 of the
       body, where this render had 0.70. A millimetre of acrylic seen end-on
       scatters; it does not reflect the dark thing behind the hand. Even an
       onyx press-on has a pale free edge, which is why the floor here is 0.62
       and not 0.42: the wall is the same acrylic whatever is suspended in it. */
    glow = 0.62 + 0.38 * lum(n.color);
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

    /* --- 4a2. the veil, UNDER the measured surface ------------------------ */
    /* It used to sit above the shade map, and a smooth screen layer above a
       textured multiply washes the texture out: at the size a nail is
       actually looked at, the plate measured 0.0078 median gradient against
       0.0121 for a real nail at the same pixel width, and the map alone was
       0.0092 — the compositing was losing structure the map had. Underneath,
       the surface modulates the veil instead of the veil flattening the
       surface. */
    specVeil(clipG, { w: w, h: h, on: gOn, L: L, defs: defs, color: n.color }, kind);

    /* --- 4b. the measured topcoat, over the colour and over the art ------- */
    photoGloss(clipG, {
      w: w, h: h, on: gOn, L: L, defs: defs, mix: gDamp,
      rnd: seeded(key + '|gloss|' + s)
    }, kind);

    /* --- 4c. and the reflection over it ----------------------------------- */
    gRefl = specReflect(clipG, {
      w: w, h: h, on: gOn, L: L, defs: defs, color: n.color,
      rnd: seeded(key + '|refl|' + s)
    }, kind);

    /* --- 5. finish -------------------------------------------------------- */
    fn = FINISHES[kind] || FINISHES.gloss;
    fg = add(clipG, E('g'));
    try {
      fn(fg, {
        w: w, h: h, u: u, d: d, color: n.color, defs: defs, L: L, q: q,
        gloss: gRefl,
        rnd: seeded(key + '|' + s + '|' + kind + '|' + n.color)
      });
    } catch (e2) {
      if (fg.parentNode) fg.parentNode.removeChild(fg);
      console.warn('[SN.Nail] finish "' + kind + '" failed', e2);
    }

    /* --- 5b. the rim reflects the room ------------------------------------ */
    /* After the finish: a reflection happens at the surface, on top of every
       layer of colour under it. Before the contour, which is the wall itself
       and has to stay readable over it. */
    envRim(clipG, {
      w: w, h: h, defs: defs, env: opts.env, L: L,
      k: kind === 'matte' ? 0.22 : (kind === 'velvet' ? 0.16 : (kind === 'chrome' ? 0.5 : 1))
    });

    /* --- 5c. grain, over every layer of colour and light ------------------- */
    filmGrain(clipG, {
      w: w, h: h, defs: defs, on: gOn,
      amp: num(opts.grain, 0.12), freq: num(opts.grainFreq, 0.22)
    });

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
      /* Absorption at a grazing angle, all round — EXCEPT at the free edge.
         At the point of an almond the plate is only a few pixels wide and this
         stroke covers the whole of it, which is why the last twenty-fourth of
         the nail measured 0.64 of the body where nine real press-ons measure
         1.10. The very tip is not polish seen edge-on, it is the cut end of
         the acrylic, and it is the palest thing on the nail. */
      E('path', {
        d: d, fill: 'none',
        stroke: vGrad(defs, [
          [0, wallLit, 0.10],
          [f(tipD * 0.9), cEdge(n.color), 1],
          [1, cEdge(n.color), 1]
        ]),
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
        gloss: true,
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
        /* The studio's option grids are full of 64px samples — a shape picker,
           a length picker, forty-odd colour chips. Each one carrying its own
           copy of the measured map is half a megabyte of data URI for detail
           nobody can see at that size, so the map starts at the size where it
           starts to show. */
        gloss: (opts.gloss === undefined || opts.gloss === null) ? (bh >= 110) : !!opts.gloss,
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
  /*  TWO photographs of the same hands, on the same dark charcoal linen,    */
  /*  under the same daylight:                                               */
  /*                                                                         */
  /*    assets/img/hand-real.jpg        1017x681  the LEFT hand              */
  /*    assets/img/hand-real-right.jpg  1081x816  the RIGHT hand             */
  /*                                                                         */
  /*  Both were shot back-of-hand up with the fingers pointing to the        */
  /*  image's left, so the left hand carries its thumb at the top of the     */
  /*  frame and the right hand carries its thumb at the bottom. There is no  */
  /*  mirror anywhere in the normal path: a mirrored pair folds the linen's  */
  /*  creases about the centre line, and no photograph of two hands has      */
  /*  ever done that. It is the single thing that gave the old pair away.    */
  /*                                                                         */
  /*  Every nail photograph ever taken is FINGERS UP, so each frame takes a  */
  /*  quarter turn on its way to the screen (see photoTurn), and the pair    */
  /*  stands side by side with the wrists at the bottom and the thumbs       */
  /*  facing each other. It happens that BOTH frames turn the same way —     */
  /*  clockwise — because the two poses are already each other's opposite;   */
  /*  that is what puts each thumb on the inside of its own panel. Nothing   */
  /*  else knows about the turn: the masks, the anchors and the crops all    */
  /*  stay in their own photograph's frame.                                  */
  /*                                                                         */
  /*  Each photograph carries every skin tone: linen and skin separate       */
  /*  cleanly on r-g (the fabric is NEGATIVE, skin strongly POSITIVE), so a  */
  /*  mask is built once per photo on a canvas and each tone is recoloured   */
  /*  through it and cached, per photo. Same origin, so the canvas is never  */
  /*  tainted and the recoloured data URL rasterises straight into toPNG.    */
  /* ====================================================================== */

  /* ---------------------------------------------------------------------- *
   * THE TWO FRAMES.                                                         *
   *                                                                         *
   *   w, h          the master's intrinsic size; both variants share the     *
   *                 framing, so everything below is normalised to it        *
   *   seedX, seedY  a point that is certainly inside the back of the hand   *
   *   cx..ch        the window the preview is cut to, in the photo's own    *
   *                 frame. cx/cw run ALONG the fingers, cy/ch across them,  *
   *                 so after the turn cw is the panel's HEIGHT on screen    *
   *                 and ch its WIDTH.                                       *
   *   smean         mean luminance under the mask, measured on this file.   *
   *                 It is re-measured at load; the constant is only the     *
   *                 value used before the pixels arrive. Recolouring each   *
   *                 photo against ITS OWN mean is what lands both hands on  *
   *                 the same tone — the two masks differ by 0.001 here, so  *
   *                 the pair reads as one person either way, but the rule   *
   *                 holds if the owner ever reshoots one of them.           *
   *   linenA/linenB the linen gain at y = 0 and at y = h, straight-line      *
   *                 interpolated in between. See THE LINEN RAMP below.      *
   *                                                                         *
   * The left window reaches slightly OUTSIDE its photograph on the left and *
   * the top, because an extra long stiletto on the middle finger ends 25px  *
   * past the frame's edge and on the thumb 10px above it. That margin is    *
   * filled by mirroring the frame about its own edges (photoTiles), and     *
   * since everything out there is plain linen the joins are invisible. The  *
   * right window sits wholly inside its frame and so needs no tiles at all. *
   *                                                                         *
   * The two windows are cut to the same PHYSICAL scale: the right hand was  *
   * shot ~2% larger (its fingers measure 74/77/72/63px across the nail bed  *
   * against the left's 74/76/68/60), so its window runs 918px along the     *
   * fingers against 900 and is divided back down by CELL_H/cw on the way    *
   * out. That is what makes the two hands the same person's hands and not a *
   * big one next to a small one. ACROSS the fingers it needs more room —    *
   * 712 against 656 — because this hand is splayed wider and its thumb      *
   * reaches further from the palm; that is pose, not size, and the scale    *
   * carries it through unchanged. As cut, the pair is 1354 x 900 — 1.50:1,  *
   * the shape of a real two hand shot, and it works from 390px to 1400px.   *
   * ---------------------------------------------------------------------- */

  var PHOTO = {
    key: 'left',
    src: 'assets/img/hand-real.jpg',
    small: 'assets/img/hand-real-sm.jpg',
    w: 1017, h: 681,
    seedX: 0.62, seedY: 0.45,
    cx: -46, cy: -22, cw: 900, ch: 656,
    smean: 0.6213,
    linenA: 0.760, linenB: 1.018
  };

  var PHOTO_RIGHT = {
    key: 'right',
    src: 'assets/img/hand-real-right.jpg',
    small: 'assets/img/hand-real-right-sm.jpg',
    w: 1081, h: 816,
    seedX: 0.66, seedY: 0.48,
    cx: 8, cy: 84, cw: 918, ch: 712,
    smean: 0.6223,
    linenA: 0.994, linenB: 1.044
  };

  /* ---------------------------------------------------------------------- *
   * PHOTO ANCHORS — the whole job.                                          *
   *                                                                         *
   * Five per hand, in that hand's own photograph, everything normalised to  *
   * that photograph so the master and the phone variant are interchangeable:*
   *                                                                         *
   *   x, y    the CUTICLE point — where the plate meets the skin            *
   *   angle   the direction the finger points, degrees, 0 = straight up,    *
   *           positive turning toward +x. This is the same convention       *
   *           HAND_GEOM uses, so the placement transform is identical to    *
   *           the one the drawn hand uses for its plates.                   *
   *   width   the finger's width at the nail bed (fraction of photo width)  *
   *   bed     the NATURAL NAIL's width at its widest, same unit. This, not  *
   *           `width`, is what sizes the plate — a press-on is fitted to    *
   *           the nail, not to the finger, and sizing it off the finger is  *
   *           what made the plates hang over the sides into the background. *
   *           Measured off each photograph by straightening every fingertip *
   *           along its own axis and reading the nail's lateral folds:      *
   *           two thirds of the finger's width on the four fingers, and     *
   *           much less on the thumbs, which are seen obliquely.            *
   *   tip     cuticle -> the very end of the fingertip. A press-on always   *
   *           clears the flesh, so this is the floor under a short plate.   *
   *   lx, ly  the PHOTOGRAPH'S OWN LIGHT, in this plate's frame: +x across  *
   *           the nail toward the right wall, +y from the free edge toward  *
   *           the cuticle. Fitted as the luminance gradient over each real  *
   *           nail bed. Every finger is lit from its +x side; the LEFT      *
   *           thumb is the one digit lit from the other side, and a single  *
   *           global light vector rotated into each plate got that one      *
   *           backwards, which is why its highlight sat on the wrong wall.  *
   *   env     WHAT THE PLATE'S RIM REFLECTS: the mean colour of the         *
   *           photograph an inch and a half out to the left, to the right    *
   *           and past the fingertip. On this hand that is dark cloth at     *
   *           luminance 0.17-0.30 on all three sides. The fourth side, the   *
   *           cuticle, is the customer's own skin and is derived at runtime. *
   *           See envRim(): this is the one thing that was making the        *
   *           plates read as drawings.                                       *
   *   fore    OPTIONAL foreshortening, default 1: how much of the plate's   *
   *           length survives projection. Only a digit whose nail tilts     *
   *           away from the camera needs it. See photoContent.             *
   *                                                                         *
   * Read off each photograph, not computed and NEVER derived from the other *
   * hand: the two hands are posed differently — the right one's fingers are *
   * splayed a little wider and its index sits almost straight where the     *
   * left's leans 9 degrees — and that difference is exactly what stops the  *
   * pair reading as one picture and its reflection.                         *
   * ---------------------------------------------------------------------- */
  var PHOTO_ANCHOR = {
    /* the thumb's cuticle was a third of a finger-width too far back and its
       plate was sized off the whole thumb, so it sat across the knuckle and
       hung off into the cloth. Re-read off the straightened thumb. */
    thumb:  { x: 0.5197, y: 0.1489, angle: -56.1, width: 0.0777, bed: 0.0364, tip: 0.0637, lx: -0.94, ly: -0.34, env: ['#2A2C31', '#41474C', '#4C555A'] },
    index:  { x: 0.2340, y: 0.2849, angle: -81.2, width: 0.0718, bed: 0.0474, tip: 0.0541, lx:  1.00, ly: -0.01, env: ['#3A3B3F', '#3F464D', '#363E44'] },
    middle: { x: 0.1624, y: 0.4464, angle: -84.8, width: 0.0728, bed: 0.0472, tip: 0.0546, lx: 1, ly: -0.06, env: ['#292E34', '#3D4349', '#41484E'] },
    ring:   { x: 0.199, y: 0.6037, angle: -82.4, width: 0.0659, bed: 0.0435, tip: 0.0546, lx: 1, ly: -0.07, env: ['#292F35', '#5C3F38', '#373E43'] },
    pinky:  { x: 0.2971, y: 0.7889, angle: -88.5, width: 0.058, bed: 0.0387, tip: 0.0398, lx: 0.87, ly: 0.48, env: ['#30373B', '#1A1A1B', '#33393D'] }
  };

  /* The right hand, in hand-real-right.jpg. Its thumb is at the BOTTOM of
     the frame, so the finger order down the frame is pinky, ring, middle,
     index, thumb — the reverse of the left photograph's.
     Four rounds of draw-screenshot-read-nudge over the calibration page got
     here: the fingers went in from the skin mask (the plate centred on the
     nail bed to within half a pixel on all four, and the cuticle landing at
     the same point on the nail's own red-to-pale step as the left hand's do)
     and the thumb went in by eye, because it lies flatter than the left one
     and its nail tilts away — which is what `fore` is for. */
  var PHOTO_ANCHOR_RIGHT = {
    thumb:  { x: 0.5031, y: 0.8209, angle: -121.3, width: 0.07, bed: 0.0364, tip: 0.0567, lx: 0.99, ly: 0.11, fore: 0.85, env: ['#16191D', '#25282D', '#2B3237'] },
    index:  { x: 0.2699, y: 0.6059, angle: -88.1, width: 0.0674, bed: 0.0445, tip: 0.0560, lx: 1.00, ly: -0.03, env: ['#313A3F', '#1B1917', '#353B42'] },
    middle: { x: 0.23, y: 0.4455, angle: -84.8, width: 0.0694, bed: 0.0458, tip: 0.055, lx: 1, ly: 0.07, env: ['#31353B', '#3F444B', '#434951'] },
    ring:   { x: 0.2951, y: 0.3157, angle: -81.4, width: 0.0656, bed: 0.0433, tip: 0.0527, lx: 1, ly: -0.07, env: ['#3B3A3D', '#394047', '#40484F'] },
    pinky:  { x: 0.4105, y: 0.1905, angle: -74.3, width: 0.0573, bed: 0.0361, tip: 0.0384, lx: 1, ly: 0.08, env: ['#40464C', '#424D53', '#464E55'] }
  };

  var PHOTO_ANCHORS = { left: PHOTO_ANCHOR, right: PHOTO_ANCHOR_RIGHT };

  function sideOf(s) { return s === 'right' ? 'right' : 'left'; }

  /* mirroring — only ever the FALLBACK, when one file is missing — happens
     about the centre of the crop window, not the centre of the frame, so the
     substitute lands inside the same window as the hand it stands in for */
  function mirrorAxis(def) { return def.cx * 2 + def.cw; }

  /* ---------------------------------------------------------------------- *
   * THE QUARTER TURN.                                                       *
   *                                                                         *
   * Both shots are landscape with the fingers pointing to the image's left, *
   * so a quarter turn CLOCKWISE stands the fingers up in both. Doing it on  *
   * the way OUT means the anchors, the masks, the tiles and the crops all   *
   * stay in the photographs' own frames — and so does the light, which is   *
   * the point: the plates' highlights are computed against the photograph's *
   * light, and rotating the picture rotates that light with it.             *
   *                                                                         *
   * rotate(90) sends (x, y) to (-y, x): the fingertips (small x) go to the  *
   * top, and the frame's own top edge (small y) goes to the RIGHT. The left *
   * hand carries its thumb at the top of its frame, so its thumb lands on   *
   * the right of its panel; the right hand carries its thumb at the bottom, *
   * so its thumb lands on the left of its panel. Side by side, the thumbs   *
   * face each other, which is how two hands are photographed.               *
   *                                                                         *
   * The mirrored substitute turns the other way instead. Mirroring a frame  *
   * in x and then turning it the same way would stand it on its head;       *
   * turning it anticlockwise makes it the first hand reflected in a         *
   * VERTICAL line, which is what a pair of hands is, and it lands on        *
   * exactly the same window.                                                *
   * ---------------------------------------------------------------------- */
  function photoTurn(def, mirror) {
    if (!mirror) return 'rotate(90)';
    return 'translate(' + f(-(def.cy * 2 + def.ch)) + ' ' + f(mirrorAxis(def)) + ') rotate(-90)';
  }

  /* Every panel is drawn this many user units tall, whichever photograph is
     behind it; a window cut from a frame shot at a different distance is
     scaled to match, so both hands come out life size against each other. */
  var CELL_H = PHOTO.cw;

  function cellScale(def) { return CELL_H / def.cw; }
  function cellW(def) { return def.ch * cellScale(def); }

  /* the crop window placed into the composition: the turn puts it at
     x in [-(cy+ch), -cy], y in [cx, cx+cw], and this brings that to
     [ox, ox + cellW] x [0, CELL_H] */
  function cellPlace(def, ox) {
    return 'translate(' + f(ox) + ' 0) scale(' + f(cellScale(def)) + ') ' +
           'translate(' + f(def.cy + def.ch) + ' ' + f(-def.cx) + ')';
  }

  /* A press-on is fitted to the NAIL, not to the finger. It covers the nail
     plate edge to edge and a whisker of the fold — that whisker is this
     number, and everything else about its width comes from anchor.bed. Sized
     off the finger instead, as this used to be, the plate reaches the skin's
     own silhouette and the eye reads a sticker lying on a photograph. */
  var PHOTO_PRESS_OVER = 1.06;
  /* the tip of a plate always clears the flesh by this much */
  var PHOTO_TIP_CLEAR = 1.03;

  /* ------------------------------------------------------ photo runtime -- */

  var photoAble = true;        /* optimistic: proven false only by a failure */
  var photoOK = true;          /* photoAble AND at least one file that loads */

  function photoState(def) {
    return {
      def: def,
      ok: true,
      state: 'idle',           /* idle | loading | ready | failed            */
      promise: null,
      src: '',
      w: 0, h: 0,
      base: null,              /* Uint8ClampedArray, the untouched pixels     */
      mask: null,              /* Uint8Array 0..255, soft edged skin coverage */
      gain: null,              /* Float32Array per row, the linen ramp        */
      smean: def.smean,
      ratio: null,             /* lum -> shading ratio LUT                    */
      work: null,              /* the canvas every tone is painted on         */
      tiles: null,             /* the edge mirrors this window actually needs */
      tones: {},               /* hex -> data URL                             */
      order: []
    };
  }

  var photos = { left: photoState(PHOTO), right: photoState(PHOTO_RIGHT) };

  function photoDown(key) {
    photos[key].ok = false;
    photoOK = photoAble && (photos.left.ok || photos.right.ok);
    if (SN.Nail) SN.Nail.PHOTO_OK = photoOK;
  }

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
    if (typeof window === 'undefined' || typeof document === 'undefined') { photoAble = false; }
    else if (typeof window.Promise !== 'function' || typeof window.Image !== 'function') { photoAble = false; }
    else if (typeof Uint8Array !== 'function' || typeof Int32Array !== 'function') { photoAble = false; }
    else if (!canvasCtx(1, 1)) photoAble = false;
    photoOK = photoAble;
  }());

  function photoFile(def) {
    var wide = 9999;
    try {
      wide = Math.max(window.innerWidth || 0, (document.documentElement || {}).clientWidth || 0) ||
             9999;
    } catch (e) { wide = 9999; }
    return wide <= 520 ? def.small : def.src;
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
   * nine compares per pixel become two adds. The same thresholds hold on     *
   * both photographs: 42.0% coverage on the left frame, 34.8% on the right.  */

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

  /* ---------------------------------------------------------------------- *
   * THE LINEN RAMP.                                                         *
   *                                                                         *
   * The recolour deliberately leaves the linen alone — same surface, only    *
   * the person changes — but the two frames are not lit identically across   *
   * the cloth. Both are brightest at the top of their own frame and fall     *
   * away toward the bottom, and the turn puts the left photo's bright edge   *
   * ON the join while the right photo's dark edge lands there: median linen  *
   * luminance 77 meeting 41, a step you cannot miss on a flat dark fabric.   *
   *                                                                         *
   * So each frame's linen carries a straight-line gain in y. Each gain is    *
   * pinned to 1 at the panel's OUTER edge — the cloth there is whatever the  *
   * camera saw — and set at the join by measuring the rendered pair and      *
   * moving both sides onto the same number. Measured across the seam now:    *
   * 51, 52 | 52, 51, against 45 | 60 before, and the whole pair falls from   *
   * about 30 at the far left to 71 at the far right like one piece of cloth  *
   * under one light. Skin is untouched (the gain is weighted by 1 - mask),   *
   * and the gain runs with y only, so the x edge mirror is exactly seamless; *
   * the y one folds a 22px strip back on itself, where the ramp is off by    *
   * 0.8% — a third of a level on linen this dark.                            *
   * ---------------------------------------------------------------------- */
  function linenGain(def, h) {
    var g = new Float32Array(h), i;
    for (i = 0; i < h; i++) {
      g[i] = def.linenA + (def.linenB - def.linenA) * (i / (h > 1 ? h - 1 : 1));
    }
    return g;
  }

  function buildMask(st, data, w, h) {
    var n = w * h, i, i4, r, g, b, l;
    var bin = new Uint8Array(n), tmp = new Uint8Array(n), sum = new Uint8Array(n);
    var soft, buf, keep, def = st.def;

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
      Math.round(def.seedX * w), Math.round(def.seedY * h));

    soft = new Float32Array(n);
    buf = new Float32Array(n);
    for (i = 0; i < n; i++) soft[i] = keep[i] ? 255 : 0;
    blurPass(soft, buf, w, h, 2);
    blurPass(soft, buf, w, h, 2);
    blurPass(soft, buf, w, h, 2);

    tmp = new Uint8Array(n);
    for (i = 0; i < n; i++) tmp[i] = soft[i] < 0 ? 0 : (soft[i] > 255 ? 255 : soft[i]);

    /* the mean luminance UNDER the mask is what every tone is scaled against;
       measuring it per photo beats trusting a constant, and it is what makes
       two frames with slightly different exposure land on the same skin */
    r = 0; g = 0;
    for (i = 0; i < n; i++) {
      if (!keep[i]) continue;
      i4 = i << 2;
      r += 0.2126 * data[i4] + 0.7152 * data[i4 + 1] + 0.0722 * data[i4 + 2];
      g++;
    }
    if (g > 0) st.smean = clamp((r / g) / 255, 0.2, 0.95);
    return tmp;
  }

  /* the edge mirrors this window actually needs. Each mirror overshoots its
     seam by one unit and the untouched frame is painted LAST, so every tile
     edge has an opaque tile underneath it — draw them flush and the
     renderer's antialiasing leaves a hairline of page background along the
     join. A window that stays inside its frame gets no tiles at all. */
  function photoTiles(def) {
    var xs = [null], ys = [null], out = [], i, j, sx, sy, tx, ty;
    if (def.cx < 0) xs.push(0);
    if (def.cx + def.cw > def.w) xs.push(def.w);
    if (def.cy < 0) ys.push(0);
    if (def.cy + def.ch > def.h) ys.push(def.h);
    for (i = 0; i < xs.length; i++) {
      for (j = 0; j < ys.length; j++) {
        if (xs[i] === null && ys[j] === null) continue;
        sx = xs[i] === null ? 1 : -1;
        sy = ys[j] === null ? 1 : -1;
        tx = xs[i] === null ? 0 : 2 * xs[i] + 1;
        ty = ys[j] === null ? 0 : 2 * ys[j] + 1;
        out.push('translate(' + f(tx) + ' ' + f(ty) + ') scale(' + sx + ' ' + sy + ')');
      }
    }
    out.push(null);
    return out;
  }

  /* ---- load ------------------------------------------------------------- */

  function loadPhoto(key) {
    var st = photos[sideOf(key)];
    if (st.promise) return st.promise;
    if (!photoAble) {
      st.promise = Promise.reject(new Error('SN.Nail: no canvas for the hand photograph'));
      st.promise['catch'](function () { /* handled through st.ok */ });
      photoDown(st.def.key);
      return st.promise;
    }
    st.state = 'loading';
    st.promise = new Promise(function (resolve, reject) {
      var img, done = false, cv;
      function fail(e) {
        if (done) return;
        done = true;
        st.state = 'failed';
        photoDown(st.def.key);
        reject(e instanceof Error ? e : new Error('SN.Nail: a hand photograph is unavailable'));
      }
      try {
        st.src = photoFile(st.def);
        img = new window.Image();
        img.decoding = 'async';
        img.onload = function () {
          if (done) return;
          try {
            st.w = img.naturalWidth || st.def.w;
            st.h = img.naturalHeight || st.def.h;
            cv = canvasCtx(st.w, st.h);
            if (!cv) { fail(new Error('SN.Nail: no 2D canvas')); return; }
            cv.ctx.drawImage(img, 0, 0, st.w, st.h);
            st.base = cv.ctx.getImageData(0, 0, st.w, st.h).data;
            st.mask = buildMask(st, st.base, st.w, st.h);
            st.gain = linenGain(st.def, st.h);
            st.work = cv;
            st.ratio = ratioLUT(st.smean);
            st.state = 'ready';
            done = true;
            resolve(st);
          } catch (e2) { fail(e2); }
        };
        img.onerror = function () { fail(new Error('SN.Nail: a hand photograph did not load')); };
        img.src = st.src;
        st.img = img;
      } catch (e3) { fail(e3); }
    });
    st.promise['catch'](function () { /* handled through st.ok */ });
    return st.promise;
  }

  /* ---- recolour --------------------------------------------------------- *
   *  lum    = 0.2126r + 0.7152g + 0.0722b                                    *
   *  ratio  = clamp(lum / smean, 0, 3) ^ 0.92   (the gamma stops highlights  *
   *           blowing out on a deep tone)                                    *
   *  out    = curve[lum] + (rgb - lum) * res    (the residue is what keeps   *
   *           knuckle redness, veins and the nail beds alive)                *
   *  final  = mix(original * linen gain, out, mask)                          *
   *  Validated against all six store tones — the linen deliberately does     *
   *  NOT change colour: the surface is the same, only the person differs.    */

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

  function toneCurve(st, p) {
    var lut = st.ratio || ratioLUT(st.smean);
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

  function paintTone(st, hex) {
    var p = parseHex(hex) || { r: 235, g: 192, b: 160 };
    var w = st.w, h = st.h;
    var src = st.base, mask = st.mask, gain = st.gain, cur = toneCurve(st, p);
    var cr = cur.r, cg = cur.g, cb = cur.b, res = cur.res;
    var out = st.work.ctx.createImageData(w, h);
    var d = out.data;
    var i, i4, r, g, b, l, li, k, or_, og, ob, y, gn, e;

    for (y = 0; y < h; y++) {
      gn = gain ? gain[y] : 1;
      for (i = y * w, e = i + w; i < e; i++) {
        i4 = i << 2;
        r = src[i4] * gn; g = src[i4 + 1] * gn; b = src[i4 + 2] * gn;
        if (r > 255) r = 255;
        if (g > 255) g = 255;
        if (b > 255) b = 255;
        k = mask[i];
        d[i4 + 3] = 255;
        if (k === 0) { d[i4] = r; d[i4 + 1] = g; d[i4 + 2] = b; continue; }
        /* inside the mask the recolour reads the UNTOUCHED pixel: the ramp is
           the cloth's lighting, not the hand's */
        r = src[i4]; g = src[i4 + 1]; b = src[i4 + 2];
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
        d[i4] = r * gn + (or_ - r * gn) * k;
        d[i4 + 1] = g * gn + (og - g * gn) * k;
        d[i4 + 2] = b * gn + (ob - b * gn) * k;
      }
    }
    st.work.ctx.putImageData(out, 0, 0);
    /* a photograph belongs in a photographic container — a PNG of this frame
       is ten times the bytes for no visible gain, and both rasterise the same */
    return st.work.canvas.toDataURL('image/jpeg', 0.92);
  }

  function toneKey(hex) { return col(hex, DEF.skin); }

  /* ---------------------------------------------------------------------- *
   * TWO HANDLES ON THE SAME RECOLOURED FRAME.                               *
   *                                                                         *
   *   .data  a data: URL. Export needs it: an <svg> rasterised through an    *
   *          <img> is a restricted context that fetches nothing external,    *
   *          so a plain path or a blob: href arrives at the canvas blank.    *
   *   .ref   a blob: URL of the same bytes, and what the LIVE page uses.     *
   *                                                                         *
   * The difference is only how long the string is, and the string is what    *
   * costs: a recoloured frame is a quarter megabyte of base64, and writing   *
   * that onto an href measured 1.4ms — twice per hand, on every repaint of   *
   * a preview that repaints on every tap. A blob: URL is fifty characters.   *
   * exportReady swaps them back for the real thing before anything is        *
   * serialised, so toPNG is unaffected.                                      *
   * ---------------------------------------------------------------------- */
  function blobRef(url) {
    var i, bin, n, arr, k;
    try {
      if (typeof atob !== 'function' || typeof Blob !== 'function' ||
          typeof URL === 'undefined' || !URL.createObjectURL) return url;
      i = url.indexOf(',');
      if (i < 0) return url;
      bin = atob(url.slice(i + 1));
      n = bin.length;
      arr = new Uint8Array(n);
      for (k = 0; k < n; k++) arr[k] = bin.charCodeAt(k) & 255;
      return URL.createObjectURL(new Blob([arr], { type: 'image/jpeg' }));
    } catch (e) { return url; }
  }

  function dropTone(st, k) {
    var e = st.tones[k];
    if (e && e.ref !== e.data) {
      try { URL.revokeObjectURL(e.ref); } catch (e2) { /* ignore */ }
    }
    delete st.tones[k];
  }

  /* the cached entry for a tone on one photo, or null when it is not made */
  function toneCached(key, hex) {
    var st = photos[sideOf(key)], k = toneKey(hex);
    return (st.state === 'ready' && st.tones[k]) ? st.tones[k] : null;
  }

  function toneURL(key, hex) {
    var side = sideOf(key), k = toneKey(hex);
    return loadPhoto(side).then(function (st) {
      var data;
      if (st.tones[k]) return st.tones[k];
      data = paintTone(st, k);
      st.tones[k] = { data: data, ref: blobRef(data) };
      st.order.push(k);
      while (st.order.length > 8) dropTone(st, st.order.shift());
      return st.tones[k];
    });
  }

  /* ---- the svg ---------------------------------------------------------- */

  /* Which photograph actually draws a given side. Normally its own — and
     `mirror` is the graceful degradation: if one file 404s but the other
     loaded, the survivor stands in for it, reflected, exactly as the pair
     was built before the second photograph existed. With neither, the whole
     preview quietly becomes the drawn hand instead. */
  function photoPlan(side) {
    var s = sideOf(side), o = s === 'right' ? 'left' : 'right';
    if (!photoAble) return null;
    if (photos[s].ok) return { side: s, src: s, mirror: false, def: photos[s].def };
    if (photos[o].ok) return { side: s, src: o, mirror: true, def: photos[o].def };
    return null;
  }

  function photoAnchors(plan) {
    var def = plan.def, m = plan.mirror;
    var set = PHOTO_ANCHORS[m ? plan.src : plan.side];
    var ax = m ? mirrorAxis(def) : 0;
    var out = [], i, k, a;
    for (i = 0; i < FINGERS.length; i++) {
      k = FINGERS[i].key;
      a = set[k];
      out.push({
        finger: k,
        env: a.env || null,
        x: m ? ax - a.x * def.w : a.x * def.w,
        y: a.y * def.h,
        angle: m ? -a.angle : a.angle,
        width: a.width * def.w,
        bed: a.bed * def.w,
        tip: a.tip * def.w,
        /* a mirrored stand-in reflects the light with the hand */
        lx: (m ? -1 : 1) * num(a.lx, 0),
        ly: num(a.ly, 0),
        fore: num(a.fore, 1)
      });
    }
    return out;
  }

  /* A press-on does not float. Two things stop it, and neither is a drop
     shadow in the graphic-design sense:

       THE SEAM. The wall of the shell meets the skin at a hard angle, and
       along the wall facing away from the light that join is a dark HAIRLINE
       — tight, no more than a couple of percent of the plate's width, and
       darker than any part of the plate. It is small and it does almost all
       of the work: it is the only thing in the picture that says the plate
       has a thickness and that the skin is underneath it rather than behind.

       THE DROP. Past the fingertip the plate overhangs into thin air, and
       whatever is behind the hand catches its shadow. Same silhouette, softer,
       further out. Over the finger this same shadow lands on skin, which is
       correct — it is one object and one light.

     Both are drawn in the plate's own frame with the light the caller
     measured, so the left thumb — the one digit in either photograph lit from
     its other side — throws its seam the other way like it should. */
  function contactShadow(defs, d, w, h, L, q) {
    var s = w * 0.055;
    var ox = -L.x * s, oy = -L.y * s;
    var g = E('g', { 'class': 'sn-plate-shadow', 'pointer-events': 'none' });
    /* The drop. Barely bigger than the plate — the size is in the OFFSET, not
       in a scale-up. Grown instead of moved it becomes a halo all the way
       round, and a halo is a sticker's outline, which is the opposite of what
       this is for. */
    add(g, E('g', {
      transform: 'translate(' + f(ox * 2.9) + ' ' + f(oy * 2.9) + ') ' +
                 'translate(' + f(w / 2) + ' ' + f(h / 2) + ') scale(1.02) ' +
                 'translate(' + f(-w / 2) + ' ' + f(-h / 2) + ')',
      filter: blurF(defs, Math.max(1.0, w * 0.06 * q))
    }, [E('path', {
      d: d,
      /* Graded along the nail, because the gap under the plate is. Over the
         nail bed the shell is glued flat and there is nothing for light to get
         under; past the fingertip it overhangs into air and whatever is behind
         the hand catches it. Measured on the studio hand: the cloth 8-22 px
         from the HAND is 23 to 33 levels darker than cloth further off — that
         is the hand's own shadow in the photograph — while the cloth beside a
         plate was 12.6 levels BRIGHTER. Every real object in that frame
         darkens the cloth beside it, and the plates were making it glow. */
      fill: vGrad(defs, [
        [0, '#170C09', 0.80], [0.28, '#170C09', 0.60],
        [0.60, '#170C09', 0.22], [0.85, '#170C09', 0.04], [1, '#170C09', 0]
      ])
    })]));
    /* The seam. Offset far enough that it only ever shows on ONE side. */
    add(g, E('g', {
      transform: 'translate(' + f(ox * 1.05) + ' ' + f(oy * 1.05) + ')',
      filter: blurF(defs, Math.max(0.4, w * 0.022))
    }, [E('path', { d: d, fill: '#23120E', opacity: 0.4 })]));
    return g;
  }

  /* one hand, placed at `ox` in the composition and cut to its own window */
  function photoContent(plan, ox, design, opts, onFail) {
    var def = plan.def;
    var outer = E('g', {
      'class': 'sn-photo-body sn-photo-' + plan.side,
      transform: cellPlace(def, ox)
    });
    var defs = add(outer, E('defs'));
    /* the quarter turn wraps everything; inside it the photograph's own frame
       is untouched, which is why the anchors below need no adjustment */
    var turn = add(outer, E('g', {
      'class': 'sn-photo-turn', transform: photoTurn(def, plan.mirror)
    }));
    /* two hands sit side by side, and each frame is wider than the window it
       is cut to, so without this the second one paints over the first */
    var g = add(turn, E('g', { 'clip-path': photoClip(defs, plan.src) }));
    var shape = shapeId(design.shape);
    var aspect = ASPECT[shape];
    var factor = lenFactor(design.length);
    var anchors = photoAnchors(plan);
    var q = clamp(num(opts.detail, 0.7), 0.25, 1);
    var tone = toneKey(design.skin);
    var id = photoImage(defs, plan.src, tone, onFail);
    var frame = E('g', { 'class': 'sn-photo-frame' });
    var tiles = photos[plan.src].tiles ||
                (photos[plan.src].tiles = photoTiles(def));
    var i, an, nw, nh, key, el, wrap, t, lv, fold;

    /* the photograph, plus itself mirrored about whichever of its own edges
       the window reaches past, so the crop never shows a hole */
    for (t = 0; t < tiles.length; t++) {
      add(frame, E('use', tiles[t]
        ? { href: '#' + id, 'xlink:href': '#' + id, transform: tiles[t] }
        : { href: '#' + id, 'xlink:href': '#' + id }));
    }
    if (plan.mirror) {
      add(g, E('g', { transform: 'translate(' + f(mirrorAxis(def)) + ' 0) scale(-1 1)' }, [frame]));
    } else {
      add(g, frame);
    }

    for (i = 0; i < anchors.length; i++) {
      an = anchors[i];
      key = plan.side + an.finger.charAt(0).toUpperCase() + an.finger.slice(1);
      nw = an.bed * PHOTO_PRESS_OVER;
      /* `fore` is foreshortening, and only the thumbs ever need it: a digit
         lying with its nail tilted away from the camera keeps its full width
         but loses length, so the same press-on projects shorter on it. Without
         this the right thumb — pressed flatter than the left — came out with a
         visibly longer nail than its partner on the same "medium". */
      nh = nw * aspect * factor * an.fore;
      /* even the shortest press-on covers the natural nail and clears the
         flesh — that is what makes it a press-on and not a sticker */
      if (nh < an.tip * PHOTO_TIP_CLEAR) nh = an.tip * PHOTO_TIP_CLEAR;

      wrap = E('g', {
        'class': 'sn-photo-nail',
        transform: 'translate(' + f(an.x) + ' ' + f(an.y) + ') rotate(' + f(an.angle) + ') ' +
                   'translate(' + f(-nw / 2) + ' ' + f(-nh) + ')'
      });
      lv = { x: an.lx, y: an.ly };
      add(wrap, contactShadow(defs, path(shape, nw, nh), nw, nh, localLight({ lightVec: lv }), q));
      el = nailSVG(design.nails[key], {
        shape: shape, w: nw, h: nh, key: key, mirror: false,
        /* measured off the photograph, not derived from a global light */
        lightVec: lv,
        env: an.env ? {
          l: an.env[0], r: an.env[1], t: an.env[2],
          /* behind the cuticle is the customer's own finger, in its own shade */
          b: darken(mix(design.skin, '#C08872', 0.35), 0.30)
        } : null,
        detail: q,
        finishId: design.nails[key] ? design.nails[key].finish : null,
        interactive: !!opts.interactive,
        selected: opts.selected,
        onPick: opts.onPick
      });
      add(wrap, el);

      /* THE FOLD RIDES OVER THE PLATE.
         The owner's report was that the base does not look glued down, and he
         is right: the plate ended in a clean curve lying on top of the skin,
         which is what "placed on" looks like. On a hand the eponychium sits
         slightly OVER the shell's cuticle edge — you never see that edge as a
         free curve — and there is a hairline of occlusion exactly at the join
         rather than a soft shadow near it.
         Nothing here is invented. The finger is already in the photograph, so
         a narrow band of the photograph itself is masked back over the plate's
         cuticle end, fading out within about a twelfth of the nail's length.
         The skin that rides over the plate is that finger's own skin, in its
         own light, at its own angle, different on all ten. */
      fold = uid('fold');
      add(defs, E('mask', {
        id: fold, maskUnits: 'userSpaceOnUse',
        x: f(an.x - nh * 1.6), y: f(an.y - nh * 1.6),
        width: f(nh * 3.2), height: f(nh * 3.2)
      }, [
        E('g', { transform: wrap.getAttribute('transform') }, [
          E('rect', {
            x: f(-nw * 0.14), y: f(nh * 0.945), width: f(nw * 1.28), height: f(nh * 0.22),
            fill: vGrad(defs, [
              [0, '#000000', 0], [0.16, '#FFFFFF', 0.40],
              [0.25, '#FFFFFF', 1], [1, '#FFFFFF', 1]
            ])
          }),
          /* AND THE SAME THING DOWN THE SIDES. A nail plate does not lie on
             the finger, it sits IN a groove: the lateral folds run up both of
             its edges, deepest at the base where the groove is deepest and
             thinning away toward the free edge, and they overlap the plate,
             not merely meet it. Every reference photograph shows it — it is
             what stops the sides reading as a curve drawn on a finger. One
             diagonal gradient per side does it, opaque at the outer corner of
             the base and gone both inward and upward, so the overlap is
             widest exactly where the groove is and has faded out by halfway
             along. Like the cuticle fold above, the skin that rides over the
             plate is this finger's own skin out of the photograph, in its own
             light — nothing is drawn. */
          E('rect', {
            x: f(-nw * 0.14), y: f(nh * 0.40), width: f(nw * 0.30), height: f(nh * 0.765),
            fill: grad(defs, 'linearGradient', [
              [0, '#FFFFFF', 1], [0.30, '#FFFFFF', 0.72],
              [0.62, '#FFFFFF', 0.18], [1, '#FFFFFF', 0]
            ], { x1: 0, y1: 1, x2: 0.92, y2: 0.18 })
          }),
          E('rect', {
            x: f(nw * 0.84), y: f(nh * 0.40), width: f(nw * 0.30), height: f(nh * 0.765),
            fill: grad(defs, 'linearGradient', [
              [0, '#FFFFFF', 1], [0.30, '#FFFFFF', 0.72],
              [0.62, '#FFFFFF', 0.18], [1, '#FFFFFF', 0]
            ], { x1: 1, y1: 1, x2: 0.08, y2: 0.18 })
          })
        ])
      ]));
      add(wrap.parentNode || g, E('g', {
        mask: 'url(#' + fold + ')', 'class': 'sn-photo-fold', 'pointer-events': 'none'
      }, [E('use', { href: '#' + id, 'xlink:href': '#' + id })]));

      /* and the hairline where the two surfaces actually meet */
      add(wrap, E('path', {
        d: path(shape, nw, nh), fill: 'none',
        stroke: vGrad(defs, [
          [0, '#2A1A15', 0], [0.90, '#2A1A15', 0], [0.965, '#2A1A15', 0.40], [1, '#2A1A15', 0.5]
        ]),
        'stroke-width': f(Math.max(nw * 0.020, 0.5)), 'pointer-events': 'none'
      }));
      add(g, wrap);
    }
    if (defs && !defs.firstChild && defs.parentNode) defs.parentNode.removeChild(defs);
    return outer;
  }

  /* ONE <image> per photograph per svg, in the shared defs, referenced by
     every tile of every hand: a recoloured tone is a quarter megabyte of
     base64, and putting it on eight elements would put eight copies in the
     DOM. Keyed by photograph AND tone, so the pair carries exactly two. */
  function photoImage(defs, key, tone, onFail) {
    var side = sideOf(key), def = photos[side].def;
    return shared(defs, 'pimg|' + side + '|' + tone, function (d) {
      var id = uid('pimg');
      var cached = toneCached(side, tone);
      var im = E('image', {
        id: id, x: 0, y: 0, width: f(def.w), height: f(def.h),
        preserveAspectRatio: 'none',
        'data-sn-photo-tone': tone, 'data-sn-photo-side': side
      });
      function fail() {
        photoDown(side);
        if (typeof onFail === 'function') onFail();
      }
      /* the raw file first so the frame paints as soon as it decodes, then the
         recoloured canvas swaps in — never the other way round, or the first
         paint waits on a mask build it does not need */
      setHref(im, cached ? cached.ref : photoFile(def));
      if (!cached) {
        /* Safari does not reliably fire 'error' on an SVG <image>; the HTML
           Image inside loadPhoto always does, so this is the path that
           actually catches a missing asset there */
        toneURL(side, tone).then(function (e) { setHref(im, e.ref); }, fail);
      }
      im.addEventListener('error', fail);
      add(d, im);
      return id;
    });
  }

  /* Each window is clipped one unit wider than its slot on every side. Two
     panels drawn flush leave a hairline of page background down the join —
     at 2x it measured a full white pixel against linen — because the clip
     edge and the next panel's edge land on the same fractional coordinate
     and both antialias away from it. A unit of bleed makes them overlap
     instead; the later panel paints over it, so nothing moves. */
  var PHOTO_BLEED = 1;

  function photoClip(defs, key) {
    var side = sideOf(key), def = photos[side].def, b = PHOTO_BLEED;
    return shared(defs, 'pcrop|' + side, function (d) {
      var id = uid('pcrop');
      add(d, E('clipPath', { id: id, clipPathUnits: 'userSpaceOnUse' },
        [rect(def.cx - b, def.cy - b, def.cw + b * 2, def.ch + b * 2)]));
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
    var side = sideOf(opts.side), plan = photoPlan(side);
    var design, svg;
    if (!plan) return hand(opts);
    design = normDesign(opts.design);
    svg = newSvg(opts);
    svg.setAttribute('class', 'sn-svg sn-hand sn-photo-hand sn-hand-' + side);
    inCtx(svg, function () {
      add(svg, photoContent(plan, 0, design, opts, function () {
        /* the photograph this was built on has just been marked missing:
           build again, which now picks the survivor or the drawn hand */
        degrade(svg, function () { return photoHand(opts); });
      }));
    });
    return sizeCells(svg, opts.w, [plan]);
  }

  /* the viewBox is the composition: every panel CELL_H tall, laid left to
     right, each as wide as its own window scaled to that height */
  function sizeCells(svg, w, plans) {
    var vw = 0, nw = num(w, 0), i;
    for (i = 0; i < plans.length; i++) vw += cellW(plans[i].def);
    svg.setAttribute('viewBox', '0 0 ' + f(vw) + ' ' + f(CELL_H));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    if (nw > 0) {
      svg.setAttribute('width', f(nw));
      svg.setAttribute('height', f(nw * CELL_H / vw));
      svg.setAttribute('style', 'display:block;max-width:100%;height:auto');
    } else {
      svg.setAttribute('style', 'display:block;width:100%;height:auto');
    }
    return svg;
  }

  /* photo unless the caller says otherwise, or unless the assets are gone */
  function previewMode(opts) {
    var m = opts && opts.mode;
    if (m === 'vector' || m === 'drawn' || m === 'svg') return 'vector';
    return photoOK ? 'photo' : 'vector';
  }

  /* Two hands stand side by side, fingers up, wrists at the bottom, thumbs
     facing each other — the pose every nail photograph uses. Each hand is
     its own photograph, so the linen's weave and folds do not agree across
     the join the way a reflection's would, which is the whole point. */
  function photoPreview(d, opts) {
    var svg = newSvg(opts), plans, i, ox;
    function fail() {
      degrade(svg, function () {
        return photoOK ? photoPreview(d, opts) : vectorPreview(d, opts);
      });
    }
    if (d.hand === 'both') {
      plans = [photoPlan('left'), photoPlan('right')];
    } else {
      plans = [photoPlan(d.hand)];
    }
    for (i = 0; i < plans.length; i++) if (!plans[i]) return vectorPreview(d, opts);
    svg.setAttribute('class', 'sn-svg sn-preview sn-photo-preview sn-preview-' + d.hand);
    inCtx(svg, function () {
      var x = 0, j;
      for (j = 0; j < plans.length; j++) {
        ox = x;
        add(svg, photoContent(plans[j], ox, d, opts, fail));
        x += cellW(plans[j].def);
      }
    });
    return sizeCells(svg, opts.w, plans);
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
        list.push(toneURL(im.getAttribute('data-sn-photo-side'),
                          im.getAttribute('data-sn-photo-tone')).then(
          (function (node) { return function (e) { setHref(node, e.data); }; }(im)),
          function () { /* the drawn hand is already the fallback */ }
        ));
      }
      return list.length ? Promise.all(list) : Promise.resolve(null);
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  /* warm both photographs up without blocking anything — safe to call many
     times, and one missing file never fails the other */
  function preloadPhoto() {
    if (!photoAble) return Promise.resolve(false);
    function one(k) { return loadPhoto(k).then(function () { return true; }, function () { return false; }); }
    return Promise.all([one('left'), one('right')]).then(function (r) {
      return !!(r[0] || r[1]);
    });
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
    PHOTO_RIGHT: PHOTO_RIGHT,
    PHOTO_ANCHOR: PHOTO_ANCHOR,
    PHOTO_ANCHOR_RIGHT: PHOTO_ANCHOR_RIGHT,
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
