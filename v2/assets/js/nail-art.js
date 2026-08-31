/* =========================================================================
   SN.Art — nail-art decoration library  (owner: ART)
   -------------------------------------------------------------------------
   A vector library of the objects a nail technician actually glues onto a
   press-on nail: faceted rhinestones, pearls, gold studs, foil flakes,
   charms, dried flowers, glitter. No emoji, no clip art, no photographs.

   Public API (contract — do not rename):
     SN.Art.LIST            [{ id, group, name:{ar,en}, tint }]
     SN.Art.node(id, opts)  -> SVGGElement drawn inside a 100x100 box whose
                               centre is (50,50)
     SN.Art.has(id)         -> bool
     SN.Art.defs()          -> a fresh <defs> element of SHARED gradients and
                               clip paths, never null.

   defs() — HOW TO USE IT. Append the returned <defs> as the FIRST child of
   every <svg> root that will contain decorations (once per <svg>, not once
   per charm). The ids inside are stable and identical in every copy, so the
   duplicate ids across two SVGs on one page are harmless — url(#sna-…)
   resolves to an identical definition either way. Doing it per <svg> is what
   keeps SN.Nail.toPNG working: a serialised standalone <svg> then carries
   its own gradients and rasterises correctly offline.
   Every clip path is clipPathUnits="userSpaceOnUse" over the same 0..100 box
   the art is drawn in, so it lines up whatever transform the host applies.

   opts = {
     size   : number  — when given, the returned <g> is pre-transformed so the
                        art occupies size x size centred on (0,0). Omit it and
                        the art is left in raw 0..100 coordinates.
     color  : '#rrggbb' — honoured only by items whose LIST entry has tint:true
     color2 : '#rrggbb' — secondary accent (butterfly lower wings, bow tails…)
     seed   : any      — deterministic variation (torn foil, glitter scatter)
     metal  : 'gold'|'silver'|'rose' — optional override for metal items
     char   : '1 character' — for the letter generator
     lod    : 'lite'   — cheaper path for the small hand preview
   }

   Letters: the id 'letter' (gold) and 'letter-silver' render ANY single
   Arabic or Latin character. Pass it either as opts.char or baked into the
   id: 'letter:ش', 'letter-silver:A'.

   Performance notes (ten nails render at once on a phone):
     · ZERO SVG filters. Every bevel, sphere and dispersion effect is a
       gradient or a flat overlay, so there is no offscreen render pass.
     · All gradients live in the shared defs() block and are reused by every
       decoration on the page — nothing is allocated per charm.
     · opts.lod:'lite' halves the facet/particle count for the hand preview.

   Deterministic only: variation comes from a local mulberry32 PRNG seeded
   from opts.seed. Math.random is never called.
   ========================================================================= */
(function () {
  'use strict';

  var SN = window.SN = window.SN || {};
  var NS = 'http://www.w3.org/2000/svg';

  /* ====================================================================== */
  /* 1. Tiny helpers                                                        */
  /* ====================================================================== */

  function num(v, d) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    return (typeof n === 'number' && isFinite(n)) ? n : d;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function f(v) {
    var n = Math.round(num(v, 0) * 1000) / 1000;
    return n === 0 ? '0' : String(n);
  }
  function rad(d) { return d * Math.PI / 180; }

  function E(name, attrs, kids) {
    var el = document.createElementNS(NS, name), k, v, i;
    if (attrs) {
      for (k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        el.setAttribute(k, String(v));
      }
    }
    if (kids) {
      if (!Array.isArray(kids)) kids = [kids];
      for (i = 0; i < kids.length; i++) if (kids[i]) el.appendChild(kids[i]);
    }
    return el;
  }
  function add(p, k) { if (p && k) p.appendChild(k); return k; }
  function G(a, k) { return E('g', a, k); }
  function P(d, a) { a = a || {}; a.d = d; return E('path', a); }
  function circ(cx, cy, r, a) {
    a = a || {}; a.cx = f(cx); a.cy = f(cy); a.r = f(r); return E('circle', a);
  }
  function ell(cx, cy, rx, ry, a) {
    a = a || {}; a.cx = f(cx); a.cy = f(cy); a.rx = f(rx); a.ry = f(ry);
    return E('ellipse', a);
  }

  /* polygon -> 'd' string */
  function poly(pts, close) {
    var s = '', i;
    for (i = 0; i < pts.length; i++) s += (i ? 'L' : 'M') + f(pts[i][0]) + ' ' + f(pts[i][1]);
    return s + (close === false ? '' : 'Z');
  }

  /* ------------------------------------------------------- seeded random */
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
  function seeded(seed) {
    var r = mulberry32(hash32(seed === undefined || seed === null ? 'sn-art' : seed));
    r.r = function (a, b) { return a + (b - a) * r(); };
    r.i = function (a, b) { return Math.floor(a + (b - a + 1) * r()); };
    r.pick = function (arr) { return (arr && arr.length) ? arr[Math.floor(r() * arr.length) % arr.length] : null; };
    return r;
  }

  /* --------------------------------------------------------------- colour */
  function rgb(hex) {
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
  function hex(c) {
    function p(v) { v = Math.round(clamp(v, 0, 255)); return (v < 16 ? '0' : '') + v.toString(16); }
    return '#' + p(c.r) + p(c.g) + p(c.b);
  }
  function mix(a, b, t) {
    var x = rgb(a) || { r: 0, g: 0, b: 0 }, y = rgb(b) || { r: 255, g: 255, b: 255 };
    return hex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
  }
  function lighten(c, t) { return mix(c, '#FFFFFF', t); }
  function darken(c, t) { return mix(c, '#1A0E14', t); }
  function okColor(c, fallback) { return rgb(c) ? c : fallback; }

  /* ====================================================================== */
  /* 2. Shared <defs> — every gradient the whole library uses               */
  /*    Ids are STABLE (prefix sna-) so one block serves every decoration.  */
  /* ====================================================================== */

  function stops(list) {
    var out = [], i, s;
    for (i = 0; i < list.length; i++) {
      s = list[i];
      out.push(E('stop', {
        offset: f(s[0] * 100) + '%',
        'stop-color': s[1],
        'stop-opacity': s.length > 2 ? f(s[2]) : null
      }));
    }
    return out;
  }
  function lg(id, x1, y1, x2, y2, st) {
    return E('linearGradient', {
      id: id, x1: f(x1), y1: f(y1), x2: f(x2), y2: f(y2)
    }, stops(st));
  }
  function rg(id, cx, cy, r, fx, fy, st) {
    return E('radialGradient', {
      id: id, cx: f(cx), cy: f(cy), r: f(r), fx: f(fx), fy: f(fy)
    }, stops(st));
  }

  /* metal ramps: dark rim -> bright band -> warm reflection -> dark rim */
  var GOLD_RAMP = [
    [0.00, '#6B4A11'], [0.10, '#A5761F'], [0.26, '#E9C465'], [0.40, '#FDF3C8'],
    [0.50, '#FFFFF2'], [0.60, '#F0CE74'], [0.74, '#C08F2B'], [0.88, '#8A6014'],
    [1.00, '#553A0C']
  ];
  var SILVER_RAMP = [
    [0.00, '#48525E'], [0.10, '#7C8894'], [0.26, '#B9C4CF'], [0.40, '#F1F6FA'],
    [0.50, '#FFFFFF'], [0.60, '#D5DDE6'], [0.74, '#96A2AE'], [0.88, '#68727E'],
    [1.00, '#3D454F']
  ];
  var ROSE_RAMP = [
    [0.00, '#7A3A2C'], [0.10, '#A85B49'], [0.26, '#DF9A85'], [0.40, '#FBDCCF'],
    [0.50, '#FFF3EC'], [0.60, '#EEB49D'], [0.74, '#C2745E'], [0.88, '#8E4634'],
    [1.00, '#602A20']
  ];

  var DEFS_BUILT = null;

  function buildDefs() {
    var d = E('defs', { 'data-sn-art-defs': '1' }), i;

    /* contact shadow — a warm black falloff, reads on skin and on polish */
    add(d, rg('sna-sh', 0.5, 0.5, 0.5, 0.5, 0.5, [
      [0, '#2A1420', 0.55], [0.5, '#2A1420', 0.36], [0.82, '#2A1420', 0.12], [1, '#2A1420', 0]
    ]));

    /* metal ramps, two orientations each so neighbouring faces differ */
    add(d, lg('sna-gold', 0.12, 0, 0.72, 1, GOLD_RAMP));
    add(d, lg('sna-gold-h', 0, 0.2, 1, 0.7, GOLD_RAMP));
    add(d, lg('sna-silver', 0.12, 0, 0.72, 1, SILVER_RAMP));
    add(d, lg('sna-silver-h', 0, 0.2, 1, 0.7, SILVER_RAMP));
    add(d, lg('sna-rose', 0.12, 0, 0.72, 1, ROSE_RAMP));
    add(d, lg('sna-rose-h', 0, 0.2, 1, 0.7, ROSE_RAMP));

    /* metal spheres (studs, beads) */
    add(d, rg('sna-gold-b', 0.5, 0.5, 0.58, 0.32, 0.26, [
      [0, '#FFFBE2'], [0.16, '#F7DD97'], [0.42, '#DDAE43'], [0.72, '#9C701A'],
      [0.9, '#6E4C10'], [1, '#4E360A']
    ]));
    add(d, rg('sna-silver-b', 0.5, 0.5, 0.58, 0.32, 0.26, [
      [0, '#FFFFFF'], [0.16, '#E4EBF2'], [0.42, '#AEB9C5'], [0.72, '#727D89'],
      [0.9, '#4F5862'], [1, '#39414A']
    ]));
    add(d, rg('sna-rose-b', 0.5, 0.5, 0.58, 0.32, 0.26, [
      [0, '#FFF4EE'], [0.16, '#F5C9B6'], [0.42, '#D9917A'], [0.72, '#9E5340'],
      [0.9, '#71372A'], [1, '#52251B']
    ]));

    /* pearl: soft terminator, warm bounce light at the bottom edge */
    add(d, rg('sna-pearl', 0.5, 0.5, 0.6, 0.33, 0.26, [
      [0, '#FFFFFF'], [0.14, '#FEFCF9'], [0.38, '#F4EBE6'], [0.62, '#E3D3CC'],
      [0.84, '#C7B2AB'], [0.95, '#BCA7A2'], [1, '#D9C7C0']
    ]));

    /* generic sphere shading laid OVER any base colour (tintable beads) */
    add(d, rg('sna-bead', 0.5, 0.5, 0.6, 0.32, 0.25, [
      [0, '#FFFFFF', 0.85], [0.2, '#FFFFFF', 0.4], [0.46, '#FFFFFF', 0.06],
      [0.72, '#2A1620', 0.1], [1, '#2A1620', 0.4]
    ]));

    /* overlays that tint ANY base colour without a per-item gradient */
    add(d, lg('sna-glo', 0, 0, 0.25, 1, [
      [0, '#FFFFFF', 0.8], [0.34, '#FFFFFF', 0.28], [0.62, '#FFFFFF', 0.04], [1, '#FFFFFF', 0]
    ]));
    add(d, lg('sna-dk', 0, 0, 0.3, 1, [
      [0, '#2A1620', 0], [0.42, '#2A1620', 0.04], [0.78, '#2A1620', 0.24], [1, '#2A1620', 0.44]
    ]));

    /* dispersion fringe of a faceted stone */
    add(d, lg('sna-rainbow', 0, 0, 1, 1, [
      [0, '#FF4E7A'], [0.2, '#FFB13D'], [0.4, '#F5F16B'], [0.6, '#5FE0A6'],
      [0.8, '#5CC8FF'], [1, '#B98CFF']
    ]));

    /* aurora / chrome iridescence */
    add(d, lg('sna-holo', 0.05, 0.1, 0.95, 0.9, [
      [0, '#B6F4FF'], [0.16, '#C9C7FF'], [0.34, '#FFC3EC'], [0.5, '#FFF0B8'],
      [0.66, '#C6FFD9'], [0.82, '#9EDCFF'], [1, '#E4C9FF']
    ]));
    add(d, lg('sna-chrome', 0, 0.05, 0.6, 1, [
      [0, '#8D9AA8'], [0.2, '#DCE6EE'], [0.36, '#FFFFFF'], [0.46, '#C3D0DB'],
      [0.58, '#7E8B99'], [0.72, '#D7E2EA'], [0.86, '#A6B3C0'], [1, '#66717D']
    ]));

    /* opal: milky body plus three drifting colour clouds */
    add(d, rg('sna-opal', 0.5, 0.5, 0.6, 0.36, 0.3, [
      [0, '#FFFFFF'], [0.3, '#F6F1EC'], [0.66, '#E7E2E4'], [0.9, '#D2CBD2'], [1, '#BEB6BE']
    ]));
    add(d, rg('sna-op1', 0.5, 0.5, 0.5, 0.5, 0.5, [
      [0, '#4FE0E8', 0.9], [0.55, '#4FE0E8', 0.35], [1, '#4FE0E8', 0]
    ]));
    add(d, rg('sna-op2', 0.5, 0.5, 0.5, 0.5, 0.5, [
      [0, '#FF8FD0', 0.85], [0.55, '#FF8FD0', 0.32], [1, '#FF8FD0', 0]
    ]));
    add(d, rg('sna-op3', 0.5, 0.5, 0.5, 0.5, 0.5, [
      [0, '#FFE06A', 0.85], [0.5, '#9BF0A8', 0.3], [1, '#9BF0A8', 0]
    ]));

    /* shared clips — usable by any item because every decoration is drawn
       in the same 0..100 user space */
    add(d, E('clipPath', { id: 'sna-clip-oval', clipPathUnits: 'userSpaceOnUse' },
      [ell(50, 50, 37, 34)]));
    add(d, E('clipPath', { id: 'sna-clip-disc', clipPathUnits: 'userSpaceOnUse' },
      [circ(50, 50, 40)]));

    /* glass dome highlight (evil eye, gummy bear, encapsulated shards) */
    add(d, rg('sna-dome', 0.5, 0.5, 0.62, 0.34, 0.22, [
      [0, '#FFFFFF', 0.55], [0.34, '#FFFFFF', 0.14], [0.7, '#FFFFFF', 0], [1, '#2A1620', 0.16]
    ]));

    return d;
  }

  function defs() {
    if (!DEFS_BUILT) DEFS_BUILT = buildDefs();
    return DEFS_BUILT.cloneNode(true);
  }

  /* ====================================================================== */
  /* 3. Shading engine                                                      */
  /* ====================================================================== */

  var LIGHT = 232;   /* light comes from the upper-left, in SVG degrees      */

  /* 0 (facing away) .. 1 (facing the light) */
  function lit(angleDeg) {
    return 0.5 + 0.5 * Math.cos(rad(angleDeg - LIGHT));
  }
  function angOf(x, y, cx, cy) {
    return Math.atan2(y - cy, x - cx) * 180 / Math.PI;
  }

  /* A batch of facets. Facets are bucketed by brightness and flushed as ONE
     <path> per bucket, so a 16-facet brilliant costs ~7 elements instead of
     16 — which is what makes ten stone-covered nails cheap on a phone. */
  function facetSet(strength) {
    var map = {}, all = [], S = strength === undefined ? 1 : strength;
    return {
      add: function (d, b) {
        var lvl = Math.round(clamp(b, 0, 1) * 10);
        (map[lvl] = map[lvl] || []).push(d);
        all.push(d);
        return this;
      },
      flush: function (g, edgeOp) {
        var k, b, op, a;
        for (k in map) {
          if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
          b = parseInt(k, 10) / 10;
          if (b >= 0.5) {
            op = Math.pow((b - 0.5) * 2, 1.3) * 0.7 * S;
            a = { d: map[k].join(' '), fill: '#FFFFFF' };
          } else {
            op = Math.pow((0.5 - b) * 2, 1.3) * 0.46 * S;
            a = { d: map[k].join(' '), fill: '#2A1620' };
          }
          if (op < 0.012) continue;
          a['fill-opacity'] = f(op);
          add(g, E('path', a));
        }
        if (edgeOp !== 0 && all.length) {
          add(g, E('path', {
            d: all.join(' '), fill: 'none', stroke: '#FFFFFF',
            'stroke-opacity': f(edgeOp === undefined ? 0.3 : edgeOp),
            'stroke-width': 0.7, 'stroke-linejoin': 'round'
          }));
        }
        return g;
      }
    };
  }

  function shadow(cx, cy, rx, ry, op) {
    return ell(cx, cy, rx, ry, { fill: 'url(#sna-sh)', opacity: f(op === undefined ? 0.5 : op) });
  }

  /* a bevelled solid: triangles from the centre to every edge.
     Used for every metal stud, crown, bolt, cross and puffy star. */
  function bevelPoly(g, pts, paint, o) {
    var cx = 0, cy = 0, i, n = pts.length, a, b, cxx, cyy;
    var fs = facetSet(o.strength === undefined ? 0.9 : o.strength);
    for (i = 0; i < n; i++) { cx += pts[i][0]; cy += pts[i][1]; }
    cx /= n; cy /= n;
    add(g, P(poly(pts), {
      fill: paint, stroke: o.rim, 'stroke-width': o.rimW || 1.6, 'stroke-linejoin': 'round'
    }));
    for (i = 0; i < n; i++) {
      a = pts[i]; b = pts[(i + 1) % n];
      cxx = (a[0] + b[0] + cx) / 3; cyy = (a[1] + b[1] + cy) / 3;
      fs.add(poly([a, b, [cx, cy]]), lit(angOf(cxx, cyy, cx, cy)));
    }
    fs.flush(g, 0.2);
    return g;
  }

  function starPts(cx, cy, R, r, n, rot) {
    var pts = [], i, a;
    for (i = 0; i < n * 2; i++) {
      a = rad(rot + i * 180 / n);
      pts.push([cx + Math.cos(a) * (i % 2 ? r : R), cy + Math.sin(a) * (i % 2 ? r : R)]);
    }
    return pts;
  }

  /* ---------------------------------------------------------------------- */
  /* Faceted stone engine.                                                   */
  /*   spec = { d, pts, table, cx, cy, split, frames, spec:[x,y,rx,ry,rot],   */
  /*            sh:[cx,cy,rx,ry], fringe }                                    */
  /* ---------------------------------------------------------------------- */
  function cutStone(g, o, spec) {
    var col = o.color, i, n, t, tab, a, b, ta, tb, cx = spec.cx, cy = spec.cy;
    var pts = spec.pts, cxx, cyy, lite = o.lite, ring, frames, k, sc;
    var fs = facetSet(0.88);

    add(g, shadow(spec.sh[0], spec.sh[1], spec.sh[2], spec.sh[3], spec.shOp || 0.5));

    /* body */
    add(g, P(spec.d, { fill: col }));
    add(g, P(spec.d, { fill: 'url(#sna-dk)', opacity: 0.42 }));

    /* facets */
    n = pts.length;
    frames = spec.frames || 1;
    for (k = 0; k < frames; k++) {
      sc = 1 - (1 - spec.table) * (k / frames);
      t = 1 - (1 - spec.table) * ((k + 1) / frames);
      tab = [];
      ring = [];
      for (i = 0; i < n; i++) {
        ring.push([cx + (pts[i][0] - cx) * sc, cy + (pts[i][1] - cy) * sc]);
        tab.push([cx + (pts[i][0] - cx) * t, cy + (pts[i][1] - cy) * t]);
      }
      for (i = 0; i < n; i++) {
        a = ring[i]; b = ring[(i + 1) % n]; ta = tab[i]; tb = tab[(i + 1) % n];
        if (spec.split && !lite) {
          cxx = (a[0] + b[0] + ta[0]) / 3; cyy = (a[1] + b[1] + ta[1]) / 3;
          fs.add(poly([a, b, ta]), lit(angOf(cxx, cyy, cx, cy)));
          cxx = (b[0] + tb[0] + ta[0]) / 3; cyy = (b[1] + tb[1] + ta[1]) / 3;
          fs.add(poly([b, tb, ta]), lit(angOf(cxx, cyy, cx, cy)) * 0.78 + 0.07);
        } else {
          cxx = (a[0] + b[0] + ta[0] + tb[0]) / 4; cyy = (a[1] + b[1] + ta[1] + tb[1]) / 4;
          fs.add(poly([a, b, tb, ta]), lit(angOf(cxx, cyy, cx, cy)));
        }
      }
      if (k === frames - 1) {
        /* pavilion starburst seen through the table (brilliant cuts only —
           a step cut like the baguette shows clean concentric bands) */
        if (!lite && spec.split) {
          for (i = 0; i < n; i++) {
            fs.add(poly([tab[i], tab[(i + 1) % n], [cx, cy]]),
              i % 2 ? 0.8 : 0.34);
          }
        }
        fs.flush(g, 0.32);
        add(g, P(poly(tab), {
          fill: '#FFFFFF', 'fill-opacity': 0.1,
          stroke: '#FFFFFF', 'stroke-opacity': 0.45, 'stroke-width': 1
        }));
      }
    }

    /* dispersion fringe + girdle */
    if (spec.fringe !== false && !lite) {
      add(g, P(spec.d, {
        fill: 'none', stroke: 'url(#sna-rainbow)', 'stroke-width': 4.2,
        opacity: 0.45,
        transform: 'translate(' + f(cx) + ' ' + f(cy) + ') scale(0.93) translate(' +
          f(-cx) + ' ' + f(-cy) + ')'
      }));
    }
    add(g, P(spec.d, {
      fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.55, 'stroke-width': 1.3
    }));
    add(g, P(spec.d, {
      fill: 'none', stroke: '#33202B', 'stroke-opacity': 0.3, 'stroke-width': 0.6
    }));

    /* specular hit */
    a = spec.spec;
    add(g, ell(a[0], a[1], a[2], a[3], {
      fill: '#FFFFFF', opacity: 0.92,
      transform: a[4] ? 'rotate(' + f(a[4]) + ' ' + f(a[0]) + ' ' + f(a[1]) + ')' : null
    }));
    if (!lite) {
      add(g, ell(a[0] - a[2] * 0.9, a[1] + a[3] * 1.9, a[2] * 0.42, a[3] * 0.42, {
        fill: '#FFFFFF', opacity: 0.6
      }));
    }
    return g;
  }

  /* a 4-point sparkle glint */
  function glint(cx, cy, r, op) {
    var w = r * 0.2;
    return P('M' + f(cx) + ' ' + f(cy - r) +
      'Q' + f(cx + w) + ' ' + f(cy - w) + ' ' + f(cx + r) + ' ' + f(cy) +
      'Q' + f(cx + w) + ' ' + f(cy + w) + ' ' + f(cx) + ' ' + f(cy + r) +
      'Q' + f(cx - w) + ' ' + f(cy + w) + ' ' + f(cx - r) + ' ' + f(cy) +
      'Q' + f(cx - w) + ' ' + f(cy - w) + ' ' + f(cx) + ' ' + f(cy - r) + 'Z',
      { fill: '#FFFFFF', opacity: f(op === undefined ? 0.85 : op) });
  }

  /* torn metallic flake outline (foil) */
  function tornPts(rnd, cx, cy, r, n, jag) {
    var pts = [], i, a, rr, prev = 1;
    for (i = 0; i < n; i++) {
      a = rad(i * 360 / n + rnd.r(-9, 9));
      /* correlate each radius with the last one so the edge tears in long
         ragged runs instead of turning into a star */
      prev = clamp(prev * 0.55 + rnd.r(1 - jag, 1) * 0.45, 1 - jag, 1);
      rr = r * prev;
      pts.push([cx + Math.cos(a) * rr * 1.1, cy + Math.sin(a) * rr * 0.82]);
    }
    return pts;
  }

  /* ====================================================================== */
  /* 4. Metal palette resolution                                            */
  /* ====================================================================== */

  var METALS = {
    gold: { ramp: 'url(#sna-gold)', rampH: 'url(#sna-gold-h)', ball: 'url(#sna-gold-b)', rim: '#5C400E', hi: '#FFF6D2', mid: '#D9A93E' },
    silver: { ramp: 'url(#sna-silver)', rampH: 'url(#sna-silver-h)', ball: 'url(#sna-silver-b)', rim: '#3F4750', hi: '#FFFFFF', mid: '#AEB9C5' },
    rose: { ramp: 'url(#sna-rose)', rampH: 'url(#sna-rose-h)', ball: 'url(#sna-rose-b)', rim: '#662C21', hi: '#FFEFE6', mid: '#D9917A' }
  };

  function metalOf(o, dflt) {
    var m = (o && typeof o.metal === 'string') ? o.metal.toLowerCase() : '';
    return METALS[m] || METALS[dflt] || METALS.gold;
  }

  /* ====================================================================== */
  /* 5. The library                                                         */
  /* ====================================================================== */

  var ITEMS = {};
  var LIST = [];

  function item(id, group, ar, en, tint, def, def2, draw) {
    ITEMS[id] = { id: id, group: group, tint: !!tint, def: def, def2: def2, draw: draw };
    LIST.push({ id: id, group: group, name: { ar: ar, en: en }, tint: !!tint });
  }

  /* ---------------------------------------------------------------------- */
  /* 5.1 STONES                                                             */
  /* ---------------------------------------------------------------------- */

  /* round brilliant — the workhorse rhinestone */
  item('st-round', 'stones', 'حجر كريستال دائري', 'Round Rhinestone', true, '#EDF5FD', null,
    function (g, o) {
      /* geometry of a real round brilliant seen from above:
         girdle -> upper-girdle sawtooth -> bezel kites + star facets -> table,
         with the pavilion starburst reflected back through the table.      */
      var R = 40, B = 32, T = 15, cx = 50, cy = 50;
      var lite = o.lite, N = lite ? 8 : 16, H = N / 2, i, k, a;
      var gp = [], bp = [], tp = [], A, C, D, m, fs = facetSet(0.92);

      add(g, shadow(50.5, 54, 42, 40, 0.46));
      add(g, circ(cx, cy, R, { fill: o.color }));
      add(g, circ(cx, cy, R, { fill: 'url(#sna-dk)', opacity: 0.34 }));

      for (i = 0; i < N; i++) {
        a = rad(i * 360 / N);
        gp.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
        a = rad((i + 0.5) * 360 / N);
        bp.push([cx + Math.cos(a) * B, cy + Math.sin(a) * B]);
      }
      for (k = 0; k < H; k++) {
        a = rad(k * 360 / H);
        tp.push([cx + Math.cos(a) * T, cy + Math.sin(a) * T]);
      }

      /* upper-girdle sawtooth: alternating bright/dark slivers on the rim */
      if (!lite) {
        for (i = 0; i < N; i++) {
          m = [(gp[i][0] + gp[(i + 1) % N][0]) / 2, (gp[i][1] + gp[(i + 1) % N][1]) / 2];
          fs.add(poly([gp[i], gp[(i + 1) % N], bp[i]]),
            clamp(lit(angOf(m[0], m[1], cx, cy)) * 1.25 - 0.1, 0, 1));
          fs.add(poly([gp[i], bp[(i - 1 + N) % N], bp[i]]),
            clamp(lit(angOf(gp[i][0], gp[i][1], cx, cy)) * 0.6 + 0.13, 0, 1));
        }
      }

      /* bezel kites (apex on the table) and star facets (apex on the rim) */
      for (k = 0; k < H; k++) {
        A = tp[k];
        C = bp[(k * 2 - 1 + N) % N];
        D = bp[(k * 2) % N];
        m = [(A[0] + C[0] + D[0]) / 3, (A[1] + C[1] + D[1]) / 3];
        fs.add(poly([A, C, gp[k * 2], D]), lit(angOf(m[0], m[1], cx, cy)));

        A = tp[k]; C = tp[(k + 1) % H]; D = bp[(k * 2) % N];
        m = [(A[0] + C[0] + D[0]) / 3, (A[1] + C[1] + D[1]) / 3];
        fs.add(poly([A, C, D]), clamp(lit(angOf(m[0], m[1], cx, cy)) * 0.72 + 0.1, 0, 1));
      }

      /* pavilion reflection inside the table — the bright core with its
         radiating facet lines */
      for (k = 0; k < H; k++) {
        fs.add(poly([tp[k], tp[(k + 1) % H], [cx, cy]]), k % 2 ? 0.86 : 0.3);
      }
      fs.flush(g, 0.34);

      /* dispersion: a thin rainbow fringe hugging the girdle + colour sparks */
      if (!lite) {
        add(g, circ(cx, cy, R - 1.6, {
          fill: 'none', stroke: 'url(#sna-rainbow)', 'stroke-width': 3.2, opacity: 0.55
        }));
        add(g, circ(cx + 14, cy + 30, 3, { fill: '#5FD0FF', opacity: 0.6 }));
        add(g, circ(cx - 22, cy + 25, 2.6, { fill: '#FF6FB2', opacity: 0.55 }));
        add(g, circ(cx + 29, cy + 6, 2.4, { fill: '#FFD256', opacity: 0.6 }));
        add(g, circ(cx - 30, cy - 12, 2.2, { fill: '#7DE9B4', opacity: 0.45 }));
      }
      /* table outline */
      add(g, P(poly(tp), {
        fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.5, 'stroke-width': 1
      }));
      /* girdle: bright inner line over a dark contact edge */
      add(g, circ(cx, cy, R, { fill: 'none', stroke: '#33202B', 'stroke-opacity': 0.22, 'stroke-width': 1.2 }));
      add(g, circ(cx, cy, R - 1, { fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.6, 'stroke-width': 1.2 }));
      /* specular hit sitting on one crown facet */
      add(g, ell(36, 32, 6.6, 4, { fill: '#FFFFFF', opacity: 0.95, transform: 'rotate(-40 36 32)' }));
      add(g, ell(62, 63, 3.6, 2.2, { fill: '#FFFFFF', opacity: 0.5, transform: 'rotate(-40 62 63)' }));
      if (!lite) add(g, glint(35, 30.5, 8.5, 0.9));
    });

  item('st-pear', 'stones', 'حجر دمعة', 'Teardrop Stone', true, '#F2E3EE', null,
    function (g, o) {
      var d = 'M50 8 C58 22 72 34 72 54 C72 74 62 90 50 90 C38 90 28 74 28 54 C28 34 42 22 50 8Z';
      cutStone(g, o, {
        d: d, cx: 50, cy: 56, table: 0.4, split: true,
        pts: [[50, 12], [62, 28], [69, 44], [70, 60], [63, 79], [50, 88],
        [37, 79], [30, 60], [31, 44], [38, 28]],
        spec: [41, 34, 6, 4, -40], sh: [51, 56, 44, 44], shOp: 0.44
      });
    });

  item('st-marquise', 'stones', 'حجر ماركيز', 'Marquise Stone', true, '#EAE1F5', null,
    function (g, o) {
      var d = 'M50 5 C64 22 72 38 72 50 C72 62 64 78 50 95 C36 78 28 62 28 50 C28 38 36 22 50 5Z';
      cutStone(g, o, {
        d: d, cx: 50, cy: 50, table: 0.36, split: true,
        pts: [[50, 9], [63, 26], [69, 42], [69, 58], [63, 74], [50, 91],
        [37, 74], [31, 58], [31, 42], [37, 26]],
        spec: [42, 30, 5, 3.4, -62], sh: [51, 53, 44, 46], shOp: 0.44
      });
    });

  item('st-princess', 'stones', 'حجر مربع برنسيس', 'Princess-cut Stone', true, '#E9F1F7', null,
    function (g, o) {
      var d = 'M17 13 L83 13 L87 17 L87 83 L83 87 L17 87 L13 83 L13 17Z';
      cutStone(g, o, {
        d: d, cx: 50, cy: 50, table: 0.34, split: true,
        pts: [[16, 14], [84, 14], [86, 16], [86, 84], [84, 86], [16, 86], [14, 84], [14, 16]],
        spec: [30, 27, 8, 4.4, -42], sh: [51, 53, 40, 40], shOp: 0.44
      });
    });

  item('st-baguette', 'stones', 'حجر باغيت', 'Baguette Stone', true, '#EFF2F6', null,
    function (g, o) {
      var d = 'M28 9 L72 9 L72 91 L28 91Z';
      cutStone(g, o, {
        d: d, cx: 50, cy: 50, table: 0.42, split: false, frames: 2, fringe: false,
        pts: [[29, 10], [71, 10], [71, 90], [29, 90]],
        spec: [38, 26, 5.5, 3.2, -78], sh: [51, 53, 26, 44], shOp: 0.42
      });
    });

  item('st-heart', 'stones', 'حجر قلب', 'Heart-cut Stone', true, '#F7D9E2', null,
    function (g, o) {
      var d = 'M50 92 C30 76 12 60 12 40 C12 26 22 16 34 16 C42 16 47 21 50 27 ' +
        'C53 21 58 16 66 16 C78 16 88 26 88 40 C88 60 70 76 50 92Z';
      cutStone(g, o, {
        d: d, cx: 50, cy: 47, table: 0.36, split: true,
        pts: [[50, 30], [62, 19], [76, 19], [85, 32], [82, 50], [68, 68],
        [50, 86], [32, 68], [18, 50], [15, 32], [24, 19], [38, 19]],
        spec: [34, 31, 7, 4.2, -40], sh: [51, 54, 42, 40], shOp: 0.44
      });
    });

  item('st-pearl', 'stones', 'نصف لؤلؤة', 'Half Pearl', false, null, null,
    function (g, o) {
      add(g, shadow(51, 54, 40, 38, 0.5));
      add(g, circ(50, 50, 37, { fill: 'url(#sna-pearl)' }));
      /* terminator + bounce light */
      add(g, circ(50, 50, 37, { fill: 'url(#sna-dk)', opacity: 0.5 }));
      add(g, ell(58, 68, 20, 10, { fill: '#FFF3EC', opacity: 0.3, transform: 'rotate(-24 58 68)' }));
      add(g, ell(38, 36, 9.5, 6.5, { fill: '#FFFFFF', opacity: 0.95, transform: 'rotate(-36 38 36)' }));
      add(g, ell(35.5, 34, 4, 2.6, { fill: '#FFFFFF', transform: 'rotate(-36 35.5 34)' }));
      add(g, circ(50, 50, 36.4, { fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.4, 'stroke-width': 1 }));
      if (!o.lite) add(g, ell(50, 50, 37, 37, { fill: 'none', stroke: '#9E8A85', 'stroke-opacity': 0.3, 'stroke-width': 0.7 }));
    });

  item('st-pearl-color', 'stones', 'لؤلؤة ملونة', 'Coloured Pearl', true, '#E7B9C8', null,
    function (g, o) {
      add(g, shadow(51, 54, 40, 38, 0.5));
      add(g, circ(50, 50, 37, { fill: o.color }));
      add(g, circ(50, 50, 37, { fill: 'url(#sna-bead)' }));
      add(g, ell(58, 68, 19, 9, { fill: lighten(o.color, 0.55), opacity: 0.35, transform: 'rotate(-24 58 68)' }));
      add(g, ell(38, 36, 9, 6, { fill: '#FFFFFF', opacity: 0.92, transform: 'rotate(-36 38 36)' }));
      add(g, ell(35.5, 34, 3.6, 2.3, { fill: '#FFFFFF', transform: 'rotate(-36 35.5 34)' }));
      add(g, circ(50, 50, 36.4, { fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.35, 'stroke-width': 1 }));
    });

  item('st-opal', 'stones', 'حجر أوبال', 'Opal Cabochon', false, null, null,
    function (g, o) {
      var rnd = o.rnd, i, n = o.lite ? 6 : 13, a, r, s, x, y, pts, k, ang;
      var flash = ['#2FD2E0', '#FF7CBE', '#FFD44F', '#68DC8A', '#9A86FF'];
      var gc;
      add(g, shadow(51, 54, 40, 37, 0.48));
      add(g, ell(50, 50, 37, 34, { fill: 'url(#sna-opal)' }));
      gc = add(g, E('g', { 'clip-path': 'url(#sna-clip-oval)' }));
      /* play of colour: angular flashes over soft drifting clouds */
      for (i = 0; i < n; i++) {
        a = rad(i * 360 / n + 21);
        r = 8 + (i % 4) * 6;
        x = 50 + Math.cos(a) * r * 1.05;
        y = 50 + Math.sin(a) * r * 0.95;
        s = 8 + (i % 3) * 4;
        add(gc, ell(x, y, s * 1.5, s * 0.95, {
          fill: 'url(#sna-op' + (1 + (i % 3)) + ')', opacity: f(0.6 + rnd() * 0.35),
          transform: 'rotate(' + f(i * 47) + ' ' + f(x) + ' ' + f(y) + ')'
        }));
        if (!o.lite) {
          pts = [];
          for (k = 0; k < 5; k++) {
            ang = rad(k * 72 + i * 27);
            pts.push([x + Math.cos(ang) * s * rnd.r(1.2, 2.1),
            y + Math.sin(ang) * s * rnd.r(0.3, 0.62)]);
          }
          add(gc, P(poly(pts), {
            fill: flash[i % flash.length], opacity: f(rnd.r(0.3, 0.56)),
            transform: 'rotate(' + f(i * 57 % 180 - 90) + ' ' + f(x) + ' ' + f(y) + ')'
          }));
        }
      }
      add(g, ell(50, 50, 37, 34, { fill: 'url(#sna-dk)', opacity: 0.42 }));
      add(g, ell(50, 50, 37, 34, { fill: 'url(#sna-dome)' }));
      add(g, ell(38, 34, 10, 5.6, { fill: '#FFFFFF', opacity: 0.9, transform: 'rotate(-30 38 34)' }));
      add(g, ell(50, 50, 37, 34, { fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.35, 'stroke-width': 1 }));
    });

  item('st-caviar', 'stones', 'خرز كافيار', 'Caviar Beads', true, '#F0E4EA', null,
    function (g, o) {
      /* real caviar beads are ~0.6mm and packed shoulder to shoulder */
      /* Real caviar beads are ~0.6mm and packed shoulder to shoulder. The
         whole cluster is drawn as FOUR paths (rim / body / sheen / glint)
         instead of four elements per bead — 54 beads for the price of 4. */
      var rnd = o.rnd, i, n = o.lite ? 26 : 60, x, y, r, a, rr;
      var rim = [], body = [], sheen = [], glints = [];
      function dot(px, py, pr) {
        return 'M' + f(px - pr) + ' ' + f(py) + 'a' + f(pr) + ' ' + f(pr) + ' 0 1 0 ' +
          f(pr * 2) + ' 0a' + f(pr) + ' ' + f(pr) + ' 0 1 0 ' + f(-pr * 2) + ' 0Z';
      }
      add(g, shadow(51, 56, 38, 33, 0.44));
      for (i = 0; i < n; i++) {
        a = rad(rnd.r(0, 360));
        rr = 30 * Math.pow(rnd(), 0.62);
        x = 50 + Math.cos(a) * rr;
        y = 50 + Math.sin(a) * rr * 0.88;
        r = rnd.r(3.2, 4.7);
        rim.push(dot(x, y, r));
        body.push(dot(x - r * 0.13, y - r * 0.15, r * 0.87));
        sheen.push(dot(x - r * 0.24, y - r * 0.28, r * 0.5));
        glints.push(dot(x - r * 0.34, y - r * 0.38, r * 0.2));
      }
      add(g, P(rim.join(' '), { fill: darken(o.color, 0.45) }));
      add(g, P(body.join(' '), { fill: o.color }));
      add(g, P(sheen.join(' '), { fill: lighten(o.color, 0.4) }));
      add(g, P(glints.join(' '), { fill: '#FFFFFF', opacity: 0.92 }));
    });

  /* ---------------------------------------------------------------------- */
  /* 5.2 METAL                                                              */
  /* ---------------------------------------------------------------------- */

  item('mt-ball', 'metal', 'حبة معدن', 'Metal Stud Ball', false, null, null,
    function (g, o) {
      var m = metalOf(o, 'gold');
      add(g, shadow(51.5, 55, 34, 31, 0.55));
      add(g, circ(50, 50, 30, { fill: m.ball }));
      add(g, circ(50, 50, 30, { fill: 'none', stroke: m.rim, 'stroke-opacity': 0.55, 'stroke-width': 1.2 }));
      add(g, ell(40, 39, 8.5, 6, { fill: '#FFFFFF', opacity: 0.68, transform: 'rotate(-36 40 39)' }));
      add(g, ell(38, 37, 3.4, 2.4, { fill: '#FFFFFF', opacity: 0.95, transform: 'rotate(-36 38 37)' }));
      add(g, ell(60, 66, 12, 5, { fill: m.hi, opacity: 0.3, transform: 'rotate(-30 60 66)' }));
    });

  item('mt-star', 'metal', 'نجمة معدنية', 'Star Stud', false, null, null,
    function (g, o) {
      var m = metalOf(o, 'gold');
      add(g, shadow(51.5, 56, 40, 34, 0.5));
      bevelPoly(g, starPts(50, 51, 42, 17.5, 5, -90), m.ramp, { rim: m.rim, rimW: 1.4 });
      add(g, glint(43, 33, 9, 0.7));
    });

  item('mt-moon', 'metal', 'هلال معدني', 'Crescent Stud', false, null, null,
    function (g, o) {
      var m = metalOf(o, 'gold');
      var d = 'M62 10 C40 16 26 31 26 50 C26 69 40 84 62 90 ' +
        'C46 80 38 66 38 50 C38 34 46 20 62 10Z';
      add(g, shadow(48, 55, 32, 42, 0.5));
      add(g, P(d, { fill: m.ramp, stroke: m.rim, 'stroke-width': 1.3, 'stroke-linejoin': 'round' }));
      add(g, P('M62 10 C46 20 38 34 38 50 C38 66 46 80 62 90 C52 78 47 64 47 50 C47 36 52 22 62 10Z',
        { fill: '#FFFFFF', opacity: 0.26 }));
      add(g, P('M30 34 C27 39 26 44 26 50 C26 60 30 68 36 75 C33 67 32 59 32 50 C32 44 33 39 30 34Z',
        { fill: '#FFFFFF', opacity: 0.42 }));
      add(g, P(d, { fill: 'url(#sna-dk)', opacity: 0.55 }));
      add(g, glint(35, 33, 8, 0.75));
    });

  item('mt-triangle', 'metal', 'مثلث معدني', 'Triangle Stud', false, null, null,
    function (g, o) {
      var m = metalOf(o, 'gold');
      add(g, shadow(51, 60, 38, 26, 0.5));
      bevelPoly(g, [[50, 13], [88, 79], [12, 79]], m.rampH, { rim: m.rim, rimW: 1.5 });
      add(g, P('M50 13 L88 79 L12 79Z', {
        fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.35, 'stroke-width': 1.2,
        'stroke-linejoin': 'round'
      }));
      add(g, glint(40, 42, 8, 0.6));
    });

  item('mt-square', 'metal', 'مربع معدني', 'Square Stud', false, null, null,
    function (g, o) {
      var m = metalOf(o, 'gold');
      add(g, shadow(51.5, 56, 36, 33, 0.5));
      bevelPoly(g, [[16, 16], [84, 16], [84, 84], [16, 84]], m.ramp, { rim: m.rim, rimW: 1.5 });
      add(g, P(poly([[27, 27], [73, 27], [73, 73], [27, 73]]), {
        fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.3, 'stroke-width': 1
      }));
      add(g, glint(36, 34, 8, 0.6));
    });

  item('mt-chain', 'metal', 'سلسلة ذهب', 'Gold Chain', false, null, null,
    function (g, o) {
      var m = metalOf(o, 'gold'), i, n = 5, x, y, a;
      add(g, shadow(51, 57, 44, 18, 0.42));
      for (i = 0; i < n; i++) {
        x = 12 + i * 19;
        y = 50 + Math.sin(rad(i * 62)) * 7;
        a = (i % 2) ? 0 : 62;
        add(g, ell(x, y, 12, 7.5, {
          fill: 'none', stroke: m.ramp, 'stroke-width': 4.6,
          transform: 'rotate(' + f(a) + ' ' + f(x) + ' ' + f(y) + ')'
        }));
        add(g, ell(x, y, 12, 7.5, {
          fill: 'none', stroke: m.rim, 'stroke-opacity': 0.45, 'stroke-width': 0.8,
          transform: 'rotate(' + f(a) + ' ' + f(x) + ' ' + f(y) + ')'
        }));
        if (!o.lite) {
          add(g, ell(x, y, 12, 7.5, {
            fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.65, 'stroke-width': 1.3,
            'stroke-dasharray': '7 40', 'stroke-dashoffset': 4,
            transform: 'rotate(' + f(a) + ' ' + f(x) + ' ' + f(y) + ')'
          }));
        }
      }
    });

  function foilFlake(g, o, paint, rimCol, str) {
    var rnd = o.rnd, n = o.lite ? 10 : 16;
    var pts = tornPts(rnd, 50, 50, 36, n, 0.34), i, a, b, ridge = [], rp, m;
    var fs = facetSet(str === undefined ? 1.2 : str);
    add(g, shadow(52, 56, 42, 34, 0.42));
    add(g, P(poly(pts), { fill: paint }));
    /* two crumple ridges: every edge folds back to the nearer ridge point,
       which is how a torn leaf of foil actually creases */
    ridge.push([50 - rnd.r(6, 16), 50 - rnd.r(2, 12)]);
    ridge.push([50 + rnd.r(6, 16), 50 + rnd.r(2, 12)]);
    for (i = 0; i < pts.length; i++) {
      a = pts[i]; b = pts[(i + 1) % pts.length];
      m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      rp = (Math.abs(m[0] - ridge[0][0]) + Math.abs(m[1] - ridge[0][1]) <
        Math.abs(m[0] - ridge[1][0]) + Math.abs(m[1] - ridge[1][1])) ? ridge[0] : ridge[1];
      fs.add(poly([a, b, rp]),
        clamp(lit(angOf(m[0], m[1], rp[0], rp[1])) * 1.3 - 0.12 + (i % 2 ? 0.1 : -0.1), 0, 1));
    }
    fs.flush(g, 0.22);
    add(g, P(poly(pts), { fill: 'url(#sna-dk)', opacity: str === undefined ? 0.4 : 0.4 * str }));
    add(g, P(poly(pts), {
      fill: 'none', stroke: rimCol, 'stroke-opacity': 0.5, 'stroke-width': 0.9,
      'stroke-linejoin': 'round'
    }));
    if (!o.lite) add(g, glint(ridge[0][0] - 4, ridge[0][1] - 6, 7, 0.75));
  }

  item('mt-foil-gold', 'metal', 'رقاقة ذهب', 'Gold Foil Flake', false, null, null,
    function (g, o) { foilFlake(g, o, 'url(#sna-gold-h)', '#5C400E'); });

  item('mt-foil-silver', 'metal', 'رقاقة فضة', 'Silver Foil Flake', false, null, null,
    function (g, o) { foilFlake(g, o, 'url(#sna-silver-h)', '#3F4750'); });

  item('mt-flake-aurora', 'metal', 'رقاقة أورورا', 'Aurora Flake', false, null, null,
    function (g, o) { foilFlake(g, o, 'url(#sna-holo)', '#6C7C8C', 0.62); });

  item('mt-charm-dangle', 'metal', 'دلاية معدنية', 'Dangling Charm', false, null, null,
    function (g, o) {
      var m = metalOf(o, 'gold');
      add(g, shadow(52, 74, 26, 20, 0.48));
      /* jump ring */
      add(g, circ(50, 22, 11, { fill: 'none', stroke: m.ramp, 'stroke-width': 5 }));
      add(g, circ(50, 22, 11, { fill: 'none', stroke: m.rim, 'stroke-opacity': 0.5, 'stroke-width': 0.8 }));
      add(g, circ(50, 22, 11, {
        fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.7, 'stroke-width': 1.5,
        'stroke-dasharray': '7 60', 'stroke-dashoffset': 6
      }));
      /* link */
      add(g, P('M50 33 L50 42', { stroke: m.ramp, 'stroke-width': 4.5, fill: 'none' }));
      /* teardrop pendant */
      var d = 'M50 40 C63 55 72 62 72 72 C72 84 62 92 50 92 C38 92 28 84 28 72 C28 62 37 55 50 40Z';
      add(g, P(d, { fill: m.ramp, stroke: m.rim, 'stroke-width': 1.3 }));
      add(g, P(d, { fill: 'url(#sna-dk)', opacity: 0.5 }));
      add(g, ell(42, 66, 7.5, 12, { fill: '#FFFFFF', opacity: 0.34, transform: 'rotate(20 42 66)' }));
      add(g, ell(41, 63, 3.4, 5.4, { fill: '#FFFFFF', opacity: 0.8, transform: 'rotate(20 41 63)' }));
    });

  item('mt-frame', 'metal', 'إطار معدني', 'Metal Frame', false, null, null,
    function (g, o) {
      var m = metalOf(o, 'gold');
      add(g, shadow(51, 55, 40, 40, 0.34));
      add(g, ell(50, 50, 37, 37, { fill: 'none', stroke: m.ramp, 'stroke-width': 6 }));
      add(g, ell(50, 50, 40, 40, { fill: 'none', stroke: m.rim, 'stroke-opacity': 0.5, 'stroke-width': 0.9 }));
      add(g, ell(50, 50, 34, 34, { fill: 'none', stroke: m.rim, 'stroke-opacity': 0.45, 'stroke-width': 0.9 }));
      add(g, ell(50, 50, 38.4, 38.4, {
        fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.75, 'stroke-width': 1.5,
        'stroke-dasharray': '26 200', 'stroke-dashoffset': 150
      }));
      add(g, ell(50, 50, 35.6, 35.6, {
        fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.4, 'stroke-width': 1.1,
        'stroke-dasharray': '18 200', 'stroke-dashoffset': 40
      }));
    });

  /* ---------------------------------------------------------------------- */
  /* 5.3 FLOWERS                                                            */
  /* ---------------------------------------------------------------------- */

  /* a glossy 3D petal: base colour, self-shading along its own axis and a
     darker rim, so it reads as a moulded acrylic petal and not a flat shape */
  var PETAL = 'M0 0 C-11 -7 -14 -23 0 -35 C14 -23 11 -7 0 0Z';
  var PETAL_R = 'M0 0 C-17 -9 -20 -27 0 -39 C20 -27 17 -9 0 0Z';

  function petal(g, d, col, cx, cy, ang, sc, o) {
    var tf = 'translate(' + f(cx) + ' ' + f(cy) + ') rotate(' + f(ang) + ')' +
      (sc && sc !== 1 ? ' scale(' + f(sc) + ')' : '');
    add(g, P(d, {
      fill: col, transform: tf,
      stroke: darken(col, 0.4), 'stroke-opacity': 0.4, 'stroke-width': 0.9,
      'stroke-linejoin': 'round'
    }));
    add(g, P(d, { fill: 'url(#sna-glo)', opacity: 0.5, transform: tf }));
    if (!o.lite) {
      add(g, P(d, { fill: 'url(#sna-dk)', opacity: 0.34, transform: tf }));
      /* the gloss streak running up the petal */
      add(g, ell(-3, -20, 3, 9, {
        fill: '#FFFFFF', opacity: 0.4, transform: tf + ' rotate(-9 -3 -20)'
      }));
    }
  }

  item('fl-daisy', 'flowers', 'زهرة أقحوان', 'Daisy', true, '#FFFFFF', '#E4C271',
    function (g, o) {
      var i;
      add(g, shadow(51, 56, 42, 38, 0.4));
      for (i = 0; i < 5; i++) petal(g, PETAL_R, o.color, 50, 50, i * 72 + 180, 0.88, o);
      /* pearl centre, seated in its own little shadow */
      add(g, ell(50, 52, 12, 11, { fill: '#2A1620', opacity: 0.16 }));
      add(g, circ(50, 50, 11, { fill: o.color2 }));
      add(g, circ(50, 50, 11, { fill: 'url(#sna-bead)' }));
      add(g, ell(46.6, 46.4, 3.2, 2.2, { fill: '#FFFFFF', opacity: 0.9, transform: 'rotate(-36 46.6 46.4)' }));
      /* one global specular so the whole charm shares a light source */
      if (!o.lite) add(g, ell(34, 30, 11, 5, { fill: '#FFFFFF', opacity: 0.35, transform: 'rotate(-34 34 30)' }));
    });

  item('fl-rose', 'flowers', 'وردة صغيرة', 'Rose Swirl', true, '#D9758F', null,
    function (g, o) {
      var c = o.color, i;
      add(g, shadow(51, 56, 40, 38, 0.42));
      /* three rings of petals curling into a bud — a rose, not a lollipop */
      for (i = 0; i < 5; i++) petal(g, PETAL_R, darken(c, 0.22), 50, 51, i * 72 + 200, 1, o);
      for (i = 0; i < 5; i++) petal(g, PETAL_R, c, 50, 50.5, i * 72 + 236, 0.74, o);
      for (i = 0; i < 4; i++) petal(g, PETAL_R, lighten(c, 0.18), 50, 50, i * 90 + 214, 0.5, o);
      /* the furled centre */
      add(g, P('M50 50 C44 50 41 46 42 42 C43 37 49 35 53 38 C58 41 58 48 53 51', {
        fill: 'none', stroke: darken(c, 0.34), 'stroke-width': 5, 'stroke-linecap': 'round'
      }));
      add(g, P('M50 50 C44 50 41 46 42 42 C43 37 49 35 53 38 C58 41 58 48 53 51', {
        fill: 'none', stroke: lighten(c, 0.3), 'stroke-width': 1.8, 'stroke-linecap': 'round',
        transform: 'translate(-1 -1.4)'
      }));
      add(g, circ(46.5, 44.5, 2.6, { fill: '#FFFFFF', opacity: 0.55 }));
      if (!o.lite) add(g, ell(34, 33, 12, 5.5, { fill: '#FFFFFF', opacity: 0.28, transform: 'rotate(-34 34 33)' }));
    });

  item('fl-blossom', 'flowers', 'عنقود زهر', 'Blossom Cluster', true, '#F3AEC4', '#FFF2C9',
    function (g, o) {
      var spots = [[35, 36, 0.5, 0], [66, 47, 0.42, 26], [49, 74, 0.36, 52]];
      var i, k, sp;
      add(g, shadow(51, 60, 42, 34, 0.38));
      for (i = 0; i < spots.length; i++) {
        sp = spots[i];
        for (k = 0; k < 5; k++) {
          petal(g, PETAL_R, o.color, sp[0], sp[1], k * 72 + sp[3] + 180, sp[2], o);
        }
        add(g, circ(sp[0], sp[1], 39 * sp[2] * 0.3, { fill: o.color2 }));
        add(g, circ(sp[0], sp[1], 39 * sp[2] * 0.3, { fill: 'url(#sna-bead)', opacity: 0.8 }));
      }
    });

  item('fl-leaf', 'flowers', 'غصن أوراق', 'Leaf Sprig', true, '#5C8F5E', null,
    function (g, o) {
      var c = o.color, dark = darken(c, 0.4), i, p, tf;
      var stem = 'M50 93 C47 76 49 54 55 34 C57 26 59 18 59 9';
      /* points ON the stem, so every leaf is actually attached to it */
      var seats = [[49.6, 82, -46, 1], [49.4, 70, -134, 0.94], [51.4, 58, -40, 0.88],
      [54, 46, -136, 0.8], [56.6, 33, -36, 0.7], [58.4, 21, -132, 0.6]];
      var blade = 'M0 0 C9 -5 21 -4 27 4 C21 12 9 13 0 8 C-3 6 -3 2 0 0Z';
      add(g, shadow(52, 62, 32, 38, 0.32));
      add(g, P(stem, { fill: 'none', stroke: dark, 'stroke-width': 3.4, 'stroke-linecap': 'round' }));
      add(g, P(stem, {
        fill: 'none', stroke: lighten(c, 0.25), 'stroke-width': 1.2, 'stroke-linecap': 'round',
        transform: 'translate(-0.9 0)'
      }));
      for (i = 0; i < seats.length; i++) {
        p = seats[i];
        tf = 'translate(' + f(p[0]) + ' ' + f(p[1]) + ') rotate(' + f(p[2]) + ') scale(' + f(p[3]) + ')';
        add(g, P(blade, {
          fill: c, transform: tf, stroke: dark, 'stroke-opacity': 0.55, 'stroke-width': 1,
          'stroke-linejoin': 'round'
        }));
        add(g, P(blade, { fill: 'url(#sna-glo)', opacity: 0.45, transform: tf }));
        if (!o.lite) {
          add(g, P(blade, { fill: 'url(#sna-dk)', opacity: 0.3, transform: tf }));
          add(g, P('M2 4 L24 4 M8 4 L13 -1 M8 4 L13 9 M15 4 L20 0 M15 4 L20 8', {
            fill: 'none', stroke: dark, 'stroke-opacity': 0.4, 'stroke-width': 0.7, transform: tf
          }));
        }
      }
    });

  item('fl-dried', 'flowers', 'زهرة مجففة', 'Pressed Dried Flower', true, '#C98BA6', null,
    function (g, o) {
      var c = o.color, i, k, a, cx, cy, vein, dark = darken(c, 0.42);
      add(g, shadow(51, 56, 42, 38, 0.3));
      for (i = 0; i < 6; i++) {
        a = i * 60 - 90 + (i % 2 ? 7 : -5);
        cx = 50 + Math.cos(rad(a)) * 24;
        cy = 50 + Math.sin(rad(a)) * 23;
        /* translucent, slightly crumpled petal */
        add(g, P('M0 -20 C11 -16 15 -6 13 4 C11 14 5 20 0 21 C-5 20 -11 14 -13 4 C-15 -6 -11 -16 0 -20Z', {
          fill: c, opacity: 0.55, stroke: dark, 'stroke-opacity': 0.45, 'stroke-width': 0.8,
          transform: 'translate(' + f(cx) + ' ' + f(cy) + ') rotate(' + f(a + 90) + ') scale(' + f(0.9 + (i % 3) * 0.07) + ')'
        }));
        if (!o.lite) {
          vein = 'M0 -17 L0 19 M0 -6 L-8 10 M0 -6 L8 10 M0 5 L-6 16 M0 5 L6 16';
          add(g, P(vein, {
            fill: 'none', stroke: dark, 'stroke-opacity': 0.26, 'stroke-width': 0.6,
            transform: 'translate(' + f(cx) + ' ' + f(cy) + ') rotate(' + f(a + 90) + ') scale(' + f(0.9 + (i % 3) * 0.07) + ')'
          }));
        }
      }
      add(g, circ(50, 50, 8.5, { fill: mix(c, '#6B4A11', 0.6), opacity: 0.85 }));
      for (k = 0; k < 7; k++) {
        a = rad(k * 51);
        add(g, circ(50 + Math.cos(a) * 5, 50 + Math.sin(a) * 5, 1.6, { fill: '#F6E3B8', opacity: 0.85 }));
      }
      /* the gel that encapsulates it */
      add(g, ell(44, 40, 13, 8, { fill: '#FFFFFF', opacity: 0.22, transform: 'rotate(-32 44 40)' }));
    });

  /* ---------------------------------------------------------------------- */
  /* 5.4 SHAPES                                                             */
  /* ---------------------------------------------------------------------- */

  item('sh-bow', 'shapes', 'فيونكة', '3D Bow', true, '#E4899F', null,
    function (g, o) {
      var c = o.color, dark = darken(c, 0.36), mid = darken(c, 0.15);
      var loopL = 'M47 50 C36 33 19 27 11 36 C3 45 12 63 30 63 C38 63 44 57 47 50Z';
      var loopR = 'M53 50 C64 33 81 27 89 36 C97 45 88 63 70 63 C62 63 56 57 53 50Z';
      var knot = 'M50 37 C58 37 63 42 63 50 C63 58 58 63 50 63 C42 63 37 58 37 50 C37 42 42 37 50 37Z';
      add(g, shadow(51, 62, 44, 24, 0.44));
      /* tails, folded under */
      add(g, P('M46 53 C41 67 33 79 24 89 C34 89 42 85 48 74Z', {
        fill: darken(c, 0.24), stroke: dark, 'stroke-opacity': 0.5, 'stroke-width': 0.9
      }));
      add(g, P('M54 53 C59 67 67 79 76 89 C66 89 58 85 52 74Z', {
        fill: mid, stroke: dark, 'stroke-opacity': 0.5, 'stroke-width': 0.9
      }));
      add(g, P('M46 56 C43 66 38 76 32 84 M54 56 C57 66 62 76 68 84', {
        fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.3, 'stroke-width': 1.4
      }));
      /* loops: base, self-shading, gloss */
      [loopL, loopR].forEach(function (d, i) {
        add(g, P(d, {
          fill: c, stroke: dark, 'stroke-opacity': 0.55, 'stroke-width': 1.1,
          'stroke-linejoin': 'round'
        }));
        add(g, P(d, { fill: 'url(#sna-glo)', opacity: i ? 0.34 : 0.6 }));
        add(g, P(d, { fill: 'url(#sna-dk)', opacity: 0.4 }));
      });
      /* the ribbon rolls into the knot */
      add(g, P('M46 50 C37 45 26 43 16 46 M54 50 C63 45 74 43 84 46', {
        fill: 'none', stroke: dark, 'stroke-opacity': 0.4, 'stroke-width': 1.2
      }));
      if (!o.lite) {
        add(g, P('M40 41 C31 37 22 37 15 41', {
          fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.65, 'stroke-width': 2.6,
          'stroke-linecap': 'round'
        }));
        add(g, P('M60 41 C69 37 78 37 85 41', {
          fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.4, 'stroke-width': 2.2,
          'stroke-linecap': 'round'
        }));
      }
      /* knot */
      add(g, P(knot, { fill: mid, stroke: dark, 'stroke-opacity': 0.6, 'stroke-width': 1.1 }));
      add(g, P(knot, { fill: 'url(#sna-bead)', opacity: 0.85 }));
      add(g, ell(45, 44, 4.6, 3, { fill: '#FFFFFF', opacity: 0.85, transform: 'rotate(-34 45 44)' }));
    });

  item('sh-butterfly', 'shapes', 'فراشة', 'Butterfly', true, '#7EA6E0', '#F3B7D4',
    function (g, o) {
      var c = o.color, c2 = o.color2, dark = darken(c, 0.5), i;
      var upper = 'M50 46 C42 22 28 8 18 12 C6 17 6 34 16 44 C24 52 38 52 50 46Z';
      var lower = 'M50 50 C42 62 32 76 24 82 C14 89 6 82 10 70 C14 58 32 50 50 50Z';
      var body = 'M50 32 C53 32 55 37 55 46 C55 58 53 70 50 79 C47 70 45 58 45 46 C45 37 47 32 50 32Z';
      function wing(host, d, col, veins) {
        add(host, P(d, { fill: col, stroke: dark, 'stroke-opacity': 0.55, 'stroke-width': 1.2, 'stroke-linejoin': 'round' }));
        add(host, P(d, { fill: 'url(#sna-glo)', opacity: 0.55 }));
        add(host, P(d, { fill: 'url(#sna-dk)', opacity: 0.42 }));
        if (veins && !o.lite) {
          add(host, P(veins, { fill: 'none', stroke: dark, 'stroke-opacity': 0.32, 'stroke-width': 0.9 }));
        }
      }
      add(g, shadow(51, 60, 44, 30, 0.38));
      [1, 0].forEach(function (mirror) {
        var host = add(g, E('g', mirror ? { transform: 'translate(100 0) scale(-1 1)' } : null));
        wing(host, upper, c, 'M47 43 C37 33 27 21 19 15 M47 45 C35 41 23 35 13 33 M47 47 C39 43 30 40 21 39');
        wing(host, lower, c2, 'M48 52 C39 59 31 69 25 77 M48 54 C40 58 32 65 27 72');
        if (!o.lite) {
          /* the pale cell spots along the wing margin */
          add(host, circ(21, 19, 2.8, { fill: '#FFFFFF', opacity: 0.72 }));
          add(host, circ(14, 32, 2.3, { fill: '#FFFFFF', opacity: 0.62 }));
          add(host, circ(24, 41, 2, { fill: '#FFFFFF', opacity: 0.5 }));
          add(host, circ(16, 74, 2.4, { fill: '#FFFFFF', opacity: 0.6 }));
          add(host, circ(25, 68, 1.9, { fill: '#FFFFFF', opacity: 0.5 }));
          /* gloss streak across the upper wing */
          add(host, ell(28, 22, 11, 3.6, { fill: '#FFFFFF', opacity: 0.4, transform: 'rotate(30 28 22)' }));
        }
      });
      /* body + antennae */
      add(g, P(body, { fill: dark }));
      add(g, P(body, { fill: 'url(#sna-glo)', opacity: 0.4 }));
      add(g, ell(48.6, 41, 1.5, 7, { fill: '#FFFFFF', opacity: 0.4 }));
      add(g, P('M48 32 C44 23 38 17 32 14 M52 32 C56 23 62 17 68 14', {
        fill: 'none', stroke: dark, 'stroke-width': 1.7, 'stroke-linecap': 'round'
      }));
      add(g, circ(32, 13, 2.6, { fill: dark }));
      add(g, circ(68, 13, 2.6, { fill: dark }));
      add(g, circ(31.2, 12.2, 0.9, { fill: '#FFFFFF', opacity: 0.6 }));
    });

  item('sh-heart', 'shapes', 'قلب', 'Puffy Heart', true, '#DE4A63', null,
    function (g, o) {
      var d = 'M50 90 C30 74 12 59 12 40 C12 26 22 16 34 16 C42 16 47 21 50 27 ' +
        'C53 21 58 16 66 16 C78 16 88 26 88 40 C88 59 70 74 50 90Z';
      add(g, shadow(51, 56, 42, 40, 0.44));
      add(g, P(d, { fill: o.color }));
      add(g, P(d, { fill: 'url(#sna-bead)', opacity: 0.9 }));
      add(g, P(d, { fill: 'none', stroke: darken(o.color, 0.4), 'stroke-opacity': 0.45, 'stroke-width': 1 }));
      add(g, ell(33, 33, 10, 6.6, { fill: '#FFFFFF', opacity: 0.75, transform: 'rotate(-38 33 33)' }));
      add(g, ell(30.5, 31, 4, 2.6, { fill: '#FFFFFF', opacity: 0.95, transform: 'rotate(-38 30.5 31)' }));
      add(g, ell(63, 62, 9, 5, { fill: lighten(o.color, 0.55), opacity: 0.35, transform: 'rotate(-38 63 62)' }));
    });

  item('sh-star', 'shapes', 'نجمة', 'Puffy Star', true, '#F0C24B', null,
    function (g, o) {
      add(g, shadow(51, 56, 40, 35, 0.42));
      bevelPoly(g, starPts(50, 51, 42, 17.5, 5, -90), o.color,
        { rim: darken(o.color, 0.45), rimW: 1.2, strength: 1 });
      add(g, glint(43, 33, 9, 0.72));
    });

  item('sh-moon-star', 'shapes', 'هلال ونجمة', 'Moon & Star', true, '#D9AE4E', null,
    function (g, o) {
      var c = o.color, dark = darken(c, 0.45);
      var d = 'M58 14 C38 20 26 34 26 52 C26 70 38 84 58 90 C43 80 36 67 36 52 C36 37 43 24 58 14Z';
      add(g, shadow(48, 58, 34, 38, 0.42));
      add(g, P(d, { fill: c, stroke: dark, 'stroke-opacity': 0.5, 'stroke-width': 1.1 }));
      add(g, P(d, { fill: 'url(#sna-glo)', opacity: 0.6 }));
      add(g, P(d, { fill: 'url(#sna-dk)', opacity: 0.55 }));
      bevelPoly(g, starPts(74, 30, 19, 8, 5, -90), lighten(c, 0.12),
        { rim: dark, rimW: 1, strength: 1 });
      add(g, glint(33, 36, 7, 0.7));
    });

  item('sh-evil-eye', 'shapes', 'عين زرقاء', 'Evil Eye Bead', false, null, null,
    function (g, o) {
      add(g, shadow(51, 55, 40, 38, 0.5));
      add(g, circ(50, 50, 37, { fill: '#F3F6FA' }));
      add(g, circ(50, 50, 37, { fill: 'url(#sna-dk)', opacity: 0.7 }));
      add(g, circ(50, 50, 27, { fill: '#2A63C4' }));
      add(g, circ(50, 50, 16, { fill: '#F5F8FC' }));
      add(g, circ(50, 50, 9, { fill: '#12224A' }));
      add(g, circ(50, 50, 37, { fill: 'url(#sna-dome)' }));
      add(g, ell(38, 34, 9.5, 6, { fill: '#FFFFFF', opacity: 0.85, transform: 'rotate(-34 38 34)' }));
      add(g, ell(36, 32, 3.6, 2.3, { fill: '#FFFFFF', transform: 'rotate(-34 36 32)' }));
      add(g, circ(50, 50, 37, { fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.4, 'stroke-width': 1 }));
    });

  item('sh-cherry', 'shapes', 'حبتا كرز', 'Cherry Pair', false, null, null,
    function (g, o) {
      add(g, shadow(52, 78, 40, 18, 0.42));
      add(g, P('M50 16 C42 32 32 46 30 62 M50 16 C58 32 66 44 70 58', {
        fill: 'none', stroke: '#4E7A3E', 'stroke-width': 3.4, 'stroke-linecap': 'round'
      }));
      add(g, P('M50 16 C56 8 66 6 74 10 C68 18 58 20 50 16Z', {
        fill: '#5F9147', stroke: '#3C6330', 'stroke-opacity': 0.6, 'stroke-width': 0.9
      }));
      add(g, circ(30, 74, 17, { fill: '#C61F35' }));
      add(g, circ(30, 74, 17, { fill: 'url(#sna-bead)' }));
      add(g, circ(70, 71, 15, { fill: '#A9152A' }));
      add(g, circ(70, 71, 15, { fill: 'url(#sna-bead)' }));
      add(g, ell(24, 68, 4.6, 3, { fill: '#FFFFFF', opacity: 0.9, transform: 'rotate(-36 24 68)' }));
      add(g, ell(65, 65, 4, 2.6, { fill: '#FFFFFF', opacity: 0.85, transform: 'rotate(-36 65 65)' }));
    });

  item('sh-bear', 'shapes', 'دبدوب', 'Tiny Bear', true, '#E8A45C', null,
    function (g, o) {
      var c = o.color, dark = darken(c, 0.45);
      add(g, shadow(52, 84, 32, 14, 0.4));
      add(g, circ(28, 26, 12, { fill: c, stroke: dark, 'stroke-opacity': 0.4, 'stroke-width': 1 }));
      add(g, circ(72, 26, 12, { fill: c, stroke: dark, 'stroke-opacity': 0.4, 'stroke-width': 1 }));
      add(g, ell(50, 36, 27, 24, { fill: c, stroke: dark, 'stroke-opacity': 0.45, 'stroke-width': 1.1 }));
      add(g, P('M50 58 C68 58 78 70 78 82 C78 90 70 92 50 92 C30 92 22 90 22 82 C22 70 32 58 50 58Z', {
        fill: c, stroke: dark, 'stroke-opacity': 0.45, 'stroke-width': 1.1
      }));
      add(g, ell(50, 36, 27, 24, { fill: 'url(#sna-bead)', opacity: 0.75 }));
      add(g, P('M50 58 C68 58 78 70 78 82 C78 90 70 92 50 92 C30 92 22 90 22 82 C22 70 32 58 50 58Z', {
        fill: 'url(#sna-bead)', opacity: 0.6
      }));
      add(g, ell(50, 45, 11, 8, { fill: lighten(c, 0.42), opacity: 0.85 }));
      add(g, circ(41, 33, 3.4, { fill: dark }));
      add(g, circ(59, 33, 3.4, { fill: dark }));
      add(g, ell(50, 43, 4, 3, { fill: dark }));
      add(g, circ(39.4, 31.6, 1.3, { fill: '#FFFFFF', opacity: 0.9 }));
      add(g, circ(57.4, 31.6, 1.3, { fill: '#FFFFFF', opacity: 0.9 }));
    });

  item('sh-crown', 'shapes', 'تاج', 'Crown', false, null, null,
    function (g, o) {
      var m = metalOf(o, 'gold');
      var pts = [[12, 82], [12, 26], [30, 44], [50, 18], [70, 44], [88, 26], [88, 82]];
      add(g, shadow(51, 86, 40, 12, 0.45));
      bevelPoly(g, pts, m.ramp, { rim: m.rim, rimW: 1.4 });
      add(g, P('M12 68 L88 68', { stroke: m.rim, 'stroke-opacity': 0.5, 'stroke-width': 1.2, fill: 'none' }));
      add(g, P('M12 68 L88 68', { stroke: '#FFFFFF', 'stroke-opacity': 0.35, 'stroke-width': 0.8, fill: 'none', transform: 'translate(0 -2)' }));
      add(g, circ(50, 24, 5.4, { fill: '#E86A86' }));
      add(g, circ(50, 24, 5.4, { fill: 'url(#sna-bead)' }));
      add(g, circ(28, 76, 4.4, { fill: '#63A8E0' }));
      add(g, circ(28, 76, 4.4, { fill: 'url(#sna-bead)' }));
      add(g, circ(72, 76, 4.4, { fill: '#63A8E0' }));
      add(g, circ(72, 76, 4.4, { fill: 'url(#sna-bead)' }));
    });

  item('sh-cross', 'shapes', 'صليب', 'Cross', false, null, null,
    function (g, o) {
      var m = metalOf(o, 'gold');
      var pts = [[40, 8], [60, 8], [60, 34], [88, 34], [88, 54], [60, 54],
      [60, 92], [40, 92], [40, 54], [12, 54], [12, 34], [40, 34]];
      add(g, shadow(51, 56, 40, 42, 0.42));
      bevelPoly(g, pts, m.ramp, { rim: m.rim, rimW: 1.4 });
      add(g, glint(40, 28, 8, 0.55));
    });

  item('sh-bolt', 'shapes', 'برق', 'Lightning Bolt', true, '#F2C43F', null,
    function (g, o) {
      var pts = [[62, 6], [30, 52], [48, 52], [38, 94], [72, 44], [52, 44]];
      add(g, shadow(51, 56, 30, 44, 0.4));
      bevelPoly(g, pts, o.color, { rim: darken(o.color, 0.45), rimW: 1.2, strength: 1 });
      add(g, glint(46, 30, 8, 0.6));
    });

  /* ---------------------------------------------------------------------- */
  /* 5.5 LETTERS — any Arabic or Latin character as a metal charm           */
  /* ---------------------------------------------------------------------- */

  var AR_FONT = "'Reem Kufi','Tajawal',system-ui,sans-serif";
  var LA_FONT = "'Cormorant Garamond',Georgia,'Times New Roman',serif";

  function letterNode(g, o, which) {
    var m = metalOf(o, which);
    var ch = (typeof o.char === 'string' && o.char) ? o.char.slice(0, 2) : 'A';
    var arabic = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(ch);
    var size = arabic ? 76 : 82;
    function txt(a) {
      a.x = 50; a.y = arabic ? 52 : 51;
      a['text-anchor'] = 'middle';
      a['dominant-baseline'] = 'central';
      a['font-size'] = f(size);
      a['font-family'] = arabic ? AR_FONT : LA_FONT;
      a['font-weight'] = arabic ? '600' : '600';
      var t = E('text', a);
      t.appendChild(document.createTextNode(ch));
      return t;
    }
    add(g, shadow(52, 60, 38, 34, 0.4));
    /* extruded depth */
    add(g, txt({ fill: m.rim, opacity: 0.75, transform: 'translate(0 3)' }));
    /* dark bevel edge */
    add(g, txt({
      fill: 'none', stroke: m.rim, 'stroke-width': 3.6,
      'stroke-linejoin': 'round', opacity: 0.95
    }));
    /* the metal face */
    add(g, txt({ fill: m.ramp }));
    /* top sheen */
    add(g, txt({ fill: 'url(#sna-glo)', opacity: 0.55 }));
    /* crisp top highlight line */
    if (!o.lite) {
      add(g, txt({
        fill: 'none', stroke: '#FFFFFF', 'stroke-width': 0.9,
        opacity: 0.4, transform: 'translate(0 -1.2)'
      }));
    }
    return g;
  }

  item('letter', 'letters', 'حرف ذهبي', 'Gold Initial', false, null, null,
    function (g, o) { letterNode(g, o, 'gold'); });
  item('letter-silver', 'letters', 'حرف فضي', 'Silver Initial', false, null, null,
    function (g, o) { letterNode(g, o, 'silver'); });

  /* ---------------------------------------------------------------------- */
  /* 5.6 EFFECTS                                                            */
  /* ---------------------------------------------------------------------- */

  item('fx-glitter', 'effects', 'رقعة جليتر', 'Glitter Patch', true, '#E8B4C8', null,
    function (g, o) {
      var rnd = o.rnd, n = o.lite ? 46 : 86, i, a, rr, x, y, s, t, col;
      var pal = [lighten(o.color, 0.2), o.color, darken(o.color, 0.25),
        '#FFF0BE', '#FFFFFF', lighten(o.color, 0.55), '#E7D6A8'];
      /* soft patch base: three nested washes instead of one hard disc */
      add(g, ell(50, 50, 41, 39, { fill: o.color, opacity: 0.08 }));
      add(g, ell(50, 50, 33, 31, { fill: o.color, opacity: 0.09 }));
      add(g, ell(50, 50, 24, 22, { fill: o.color, opacity: 0.1 }));
      for (i = 0; i < n; i++) {
        a = rad(rnd.r(0, 360));
        rr = 42 * Math.pow(rnd(), 0.58);
        x = 50 + Math.cos(a) * rr;
        y = 50 + Math.sin(a) * rr * 0.94;
        s = rnd.r(1.4, 3.6) * (1 - rr / 130) * (o.lite ? 1.45 : 1);
        col = pal[rnd.i(0, pal.length - 1)];
        t = rnd();
        if (t < 0.42) {
          add(g, circ(x, y, s, { fill: col, opacity: f(rnd.r(0.55, 1)) }));
        } else {
          add(g, P(poly([[x, y - s * 1.5], [x + s, y], [x, y + s * 1.5], [x - s, y]]), {
            fill: col, opacity: f(rnd.r(0.6, 1))
          }));
        }
      }
      if (!o.lite) {
        add(g, glint(36, 36, 9, 0.9));
        add(g, glint(64, 58, 7, 0.75));
        add(g, glint(52, 28, 5.5, 0.65));
      }
    });

  item('fx-chrome-smear', 'effects', 'مسحة كروم', 'Chrome Smear', false, null, null,
    function (g, o) {
      /* chrome powder is buffed on, so the patch has a ragged soft edge and
         a mirror streak where the applicator dragged */
      var rnd = o.rnd, i, n = o.lite ? 4 : 6, y0, y1, w, op;
      add(g, shadow(52, 64, 40, 20, 0.24));
      /* the powder is buffed on in overlapping passes; round caps give the
         patch a soft edge with no filter */
      for (i = 0; i < n; i++) {
        y0 = 38 + i * (30 / n);
        y1 = y0 + rnd.r(-4, 4);
        w = rnd.r(17, 25) * (1 - Math.abs(i - (n - 1) / 2) / n * 0.45);
        op = rnd.r(0.7, 1) * (1 - Math.abs(i - (n - 1) / 2) / (n * 1.1));
        add(g, P('M' + f(16 + rnd.r(0, 8)) + ' ' + f(y0 + 8) +
          'C' + f(36) + ' ' + f(y0 - 4) + ' ' + f(62) + ' ' + f(y1 - 6) +
          ' ' + f(84 - rnd.r(0, 8)) + ' ' + f(y1 + 2), {
          fill: 'none', stroke: 'url(#sna-chrome)', 'stroke-width': f(w),
          'stroke-linecap': 'round', opacity: f(clamp(op, 0.12, 1))
        }));
      }
      add(g, P('M20 44 C40 30 62 30 82 40 C64 56 40 60 20 52Z', {
        fill: 'url(#sna-holo)', opacity: 0.3
      }));
      /* the buffed mirror streak */
      add(g, P('M20 58 C32 44 52 36 72 38', {
        fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.9, 'stroke-width': 5,
        'stroke-linecap': 'round'
      }));
      add(g, P('M24 66 C38 56 56 50 76 51', {
        fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.4, 'stroke-width': 2.4,
        'stroke-linecap': 'round'
      }));
      add(g, P('M18 66 C30 58 50 54 74 56', {
        fill: 'none', stroke: '#5E6A76', 'stroke-opacity': 0.3, 'stroke-width': 3,
        'stroke-linecap': 'round'
      }));
      if (!o.lite) add(g, glint(66, 42, 8, 0.85));
    });

  item('fx-holo-hex', 'effects', 'ترتر هولوغرافيك', 'Holo Hex Flakes', false, null, null,
    function (g, o) {
      var rnd = o.rnd, n = o.lite ? 20 : 34, i, a, rr, x, y, s, k, pts, ang;
      for (i = 0; i < n; i++) {
        a = rad(rnd.r(0, 360));
        rr = 36 * Math.pow(rnd(), 0.95);
        x = 50 + Math.cos(a) * rr;
        y = 50 + Math.sin(a) * rr * 0.92;
        s = o.lite ? rnd.r(5, 10) : rnd.r(3, 6.8);
        pts = [];
        for (k = 0; k < 6; k++) {
          ang = rad(k * 60);
          pts.push([x + Math.cos(ang) * s, y + Math.sin(ang) * s * rnd.r(0.55, 0.95)]);
        }
        ang = rnd.r(0, 60);
        add(g, P(poly(pts), {
          fill: rnd() > 0.26 ? 'url(#sna-holo)' : '#FFFFFF',
          opacity: f(rnd.r(0.68, 1)),
          transform: 'rotate(' + f(ang) + ' ' + f(x) + ' ' + f(y) + ')',
          stroke: '#7E8B99', 'stroke-opacity': 0.35, 'stroke-width': 0.5
        }));
      }
      if (!o.lite) { add(g, glint(40, 38, 8, 0.85)); add(g, glint(66, 62, 6, 0.7)); }
    });

  item('fx-goldleaf', 'effects', 'ورق ذهب', 'Gold Leaf Shard', false, null, null,
    function (g, o) {
      var m = metalOf(o, 'gold');
      var rnd = o.rnd, i, k, n = o.lite ? 3 : 4, pts, cx, cy, r, a, b, mid;
      var fs = facetSet(1.25), rims = [];
      add(g, shadow(52, 56, 42, 36, 0.34));
      for (i = 0; i < n; i++) {
        cx = 50 + (rnd() - 0.5) * (o.lite ? 30 : 46);
        cy = 50 + (rnd() - 0.5) * (o.lite ? 28 : 42);
        r = o.lite ? rnd.r(17, 26) : rnd.r(11, 19);
        pts = tornPts(rnd, cx, cy, r, 7, 0.34);
        add(g, P(poly(pts), { fill: m.rampH }));
        mid = [cx + (rnd() - 0.5) * r * 0.5, cy + (rnd() - 0.5) * r * 0.5];
        for (k = 0; k < pts.length; k++) {
          a = pts[k]; b = pts[(k + 1) % pts.length];
          fs.add(poly([a, b, mid]), k % 2 ? 0.93 : 0.1);
        }
        rims.push(poly(pts));
      }
      fs.flush(g, 0.2);
      add(g, P(rims.join(' '), {
        fill: 'none', stroke: m.rim, 'stroke-opacity': 0.45, 'stroke-width': 0.8,
        'stroke-linejoin': 'round'
      }));
      /* the clear gel that encapsulates the leaf */
      add(g, ell(50, 50, 44, 42, { fill: 'url(#sna-dome)', opacity: 0.22 }));
      add(g, ell(38, 34, 13, 7, { fill: '#FFFFFF', opacity: 0.3, transform: 'rotate(-32 38 34)' }));
    });

  /* ====================================================================== */
  /* 6. Public entry points                                                 */
  /* ====================================================================== */

  var LETTER_RE = /^(letter|letter-silver):([\s\S]{1,2})$/;

  function resolve(id) {
    var m;
    if (typeof id !== 'string') return null;
    if (ITEMS[id]) return { def: ITEMS[id], ch: null };
    m = LETTER_RE.exec(id);
    if (m && ITEMS[m[1]]) return { def: ITEMS[m[1]], ch: m[2] };
    return null;
  }

  function has(id) { return !!resolve(id); }

  function node(id, opts) {
    var r = resolve(id), o, g, inner, s, def;
    opts = opts || {};
    g = E('g', { 'class': 'sn-art', 'data-art': typeof id === 'string' ? id : '' });
    if (!r) return g;
    def = r.def;

    o = {
      color: def.tint ? okColor(opts.color, def.def || '#E8B4C8') : (def.def || null),
      color2: okColor(opts.color2, def.def2 || (def.tint ? lighten(okColor(opts.color, def.def || '#E8B4C8'), 0.4) : null)),
      seed: opts.seed,
      rnd: seeded(String(id) + '|' + (opts.seed === undefined || opts.seed === null ? '' : opts.seed)),
      lite: opts.lod === 'lite',
      metal: opts.metal,
      char: r.ch || opts.char || opts.text
    };

    s = num(opts.size, 0);
    if (s > 0) {
      inner = add(g, E('g', {
        transform: 'translate(' + f(-s / 2) + ' ' + f(-s / 2) + ') scale(' + f(s / 100) + ')'
      }));
    } else {
      inner = g;
    }

    try {
      def.draw(inner, o);
    } catch (err) {
      if (window.console && console.warn) console.warn('SN.Art: ' + id, err);
    }
    return g;
  }

  SN.Art = {
    LIST: LIST,
    GROUPS: ['stones', 'metal', 'flowers', 'shapes', 'letters', 'effects'],
    node: node,
    has: has,
    defs: defs
  };
})();
