/*! Shosh Nail — assets/js/home.js
 *  SN.Home : the landing page (owner: HOME)
 *  Contract: SPEC.md sections 4, 11, 13. Attaches exactly one property: window.SN.Home
 *
 *  Renders, in the order fixed by SPEC section 13:
 *    hero · stats · steps · features · most ordered · colour teaser ·
 *    testimonials · closing CTA band
 *  Everything comes from SN.Store.state.home / .designs / .colors, so an owner
 *  edit in admin.html shows up here the moment it is saved. The same file also
 *  drives 404.html (body[data-view="404"]), which only needs the shell.
 */
(function () {
  'use strict';

  var SN = (window.SN = window.SN || {});

  /* ==================================================================== */
  /* 0. dictionary — namespace `home` (SPEC section 10)                    */
  /* ==================================================================== */

  var DICT = {
    ar: {
      home: {
        /* hero */
        eyebrow: 'أظافر مركّبة مصنوعة يدويًا',
        heroTitleFb: 'أظافر تشبهك… من أول لمسة',
        heroSubFb: 'جاوبي على سبعة أسئلة بالصور، ونبني لك طقمًا كاملًا على ذوقك.',
        heroCtaFb: 'ابدئي اختبار الستايل',
        heroCta2: 'شوفي التصاميم الجاهزة',
        heroAlt: 'معاينة حيّة لطقم أظافر مصمّم داخل الموقع',
        note1: 'شحن مجاني للطلبات فوق {n}',
        note2: 'مقاس مضبوط لكل ظفر على حدة',
        note3: 'تشوفين تصميمك قبل ما تطلبينه',

        /* the hero looks — the same hand, three different sets */
        lookCap: 'كلها مصمّمة داخل الموقع · {name}',
        lookPick: 'اعرضي طقم {name}',
        look: {
          pearl: 'وردي ولؤلؤ',
          chrome: 'كروم برقّة الذهب',
          sunset: 'صيفي مرجاني'
        },

        /* stats */
        statsTitle: 'أرقام شوش نيل',

        /* steps */
        stepsEyebrow: 'بأربع خطوات فقط',
        stepsTitle: 'كيف تطلبين طقمك؟',
        stepsSub: 'من أول فكرة في بالك لين العلبة توصل باب بيتك — الطريق قصير وواضح.',
        stepN: 'الخطوة {n}',

        /* features */
        featEyebrow: 'ليش شوش نيل؟',
        featTitle: 'تفاصيل تفرق فعلاً',
        featSub: 'شغل يدوي، خامة مريحة، ومقاس مفصّل عليك — مو مقاس عام يمشي حاله.',

        /* most ordered */
        topEyebrow: 'اختيارات العميلات',
        topTitle: 'الأكثر طلباً',
        topSub: 'التصاميم اللي ما تهدأ الطلبات عليها. اطلبيها زي ما هي، أو خذيها أساس وعدّلي عليها براحتك.',
        topAll: 'تصفّحي كل التصاميم',
        proofSets: '{n} طقم جاهز للطلب',
        proofTop: 'الأكثر طلباً: {name} · {n} طلب',
        topEmpty: 'ما فيه تصاميم جاهزة معروضة حالياً — بس تقدرين تسوّين اختبار الستايل ونختار لك طقمك.',
        topEmptyCta: 'ابدئي اختبار الستايل',
        order: 'اطلبيه',
        ordersN: '{n} طلب',
        openInShop: 'افتحي تفاصيل {name}',

        /* colours */
        colorsEyebrow: 'مكتبة الألوان',
        colorsTitle: 'اللون اللي في بالك… عندنا',
        colorsSub: '{n} لون جاهز بين نيود هادئ ووردي وأحمر وألوان جريئة، وإذا ما لقيتي لونك بالضبط تقدرين تختارينه بنفسك بالكود.',
        colorsCta: 'اختاري ألوانك',

        /* testimonials */
        testiEyebrow: 'كلامهنّ يكفي',
        testiTitle: 'وش قالت العميلات؟',
        testiSub: 'آراء وصلتنا من بنات جرّبن الطقم وصار جزء من روتينهنّ.',
        starsN: '{n} من 5',
        testiEmpty: 'ما فيه آراء منشورة حالياً.',

        /* closing band */
        bandTitle: 'جاهزة تصمّمين طقمك؟',
        bandText: 'ما تحتاجين خبرة ولا برنامج — كل شي داخل الموقع، وتشوفين النتيجة قدّامك خطوة بخطوة.',
        bandCta: 'ابدئي اختبار الستايل',
        bandCta2: 'عندي سؤال أول',

        /* 404 */
        nf: {
          title: 'الصفحة غير موجودة',
          text: 'يمكن الرابط قديم أو فيه حرف ناقص. لا تشيلين هم — كل شي على بُعد ضغطة.',
          home: 'الرجوع للرئيسية',
          studio: 'ابدئي اختبار الستايل',
          shop: 'التصاميم الجاهزة',
          faq: 'الأسئلة والتواصل'
        }
      }
    },

    en: {
      home: {
        eyebrow: 'Handcrafted press-on nails',
        heroTitleFb: 'Nails that look like you — from the very first touch',
        heroSubFb: 'Answer seven picture questions and we build you a whole set in your taste.',
        heroCtaFb: 'Take the style quiz',
        heroCta2: 'Browse ready-made sets',
        heroAlt: 'A live preview of a nail set designed on this site',
        note1: 'Free shipping over {n}',
        note2: 'Every nail sized individually',
        note3: 'See your design before you order',

        lookCap: 'All designed on this site · {name}',
        lookPick: 'Show the {name} set',
        look: {
          pearl: 'Rose and pearl',
          chrome: 'Chrome with gold',
          sunset: 'Coral summer'
        },

        statsTitle: 'Shosh Nail in numbers',

        stepsEyebrow: 'Four steps, that is all',
        stepsTitle: 'How ordering works',
        stepsSub: 'From the idea in your head to the box at your door — short, clear, no guesswork.',
        stepN: 'Step {n}',

        featEyebrow: 'Why Shosh Nail',
        featTitle: 'The details that actually matter',
        featSub: 'Handmade, comfortable to wear, and measured to your own hands — never one-size-fits-most.',

        topEyebrow: 'Customer favourites',
        topTitle: 'Most ordered',
        topSub: 'The sets our customers keep coming back for. Order one as it is, or use it as a starting point and make it yours.',
        topAll: 'Browse every design',
        proofSets: '{n} sets ready to order',
        proofTop: 'Most ordered: {name} · {n} orders',
        topEmpty: 'No ready-made sets are on show right now — but you can still take the style quiz and we will pick your set.',
        topEmptyCta: 'Take the style quiz',
        order: 'Order it',
        ordersN: '{n} orders',
        openInShop: 'Open the details for {name}',

        colorsEyebrow: 'The colour library',
        colorsTitle: 'Whatever shade you pictured',
        colorsSub: '{n} ready shades across soft nudes, pinks, reds and bold statement colours — and if yours is not here, pick it by code and we will mix it.',
        colorsCta: 'Choose your colours',

        testiEyebrow: 'In their words',
        testiTitle: 'What customers say',
        testiSub: 'Notes from women who tried a set and made it part of the routine.',
        starsN: '{n} out of 5',
        testiEmpty: 'No reviews are published yet.',

        bandTitle: 'Ready to design your set?',
        bandText: 'No experience and no software needed — everything happens right here, and you see the result at every step.',
        bandCta: 'Take the style quiz',
        bandCta2: 'I have a question first',

        nf: {
          title: 'This page does not exist',
          text: 'The link may be old, or a character may be missing. Nothing is lost — everything is one tap away.',
          home: 'Back to the home page',
          studio: 'Take the style quiz',
          shop: 'Ready-made designs',
          faq: 'Help and contact'
        }
      }
    }
  };

  if (SN.I18n && typeof SN.I18n.extend === 'function') SN.I18n.extend(DICT);

  /* ==================================================================== */
  /* 1. private helpers (nothing here is exported)                        */
  /* ==================================================================== */

  var UI = null;   /* resolved lazily: ui.js is deferred just before us */

  function ui() {
    if (!UI) UI = SN.UI || null;
    return UI;
  }

  function el(tag, attrs, kids) {
    var u = ui();
    if (u && typeof u.el === 'function') return u.el(tag, attrs, kids);
    /* ui.js missing entirely — degrade to an empty node rather than throw */
    return document.createElement(typeof tag === 'string' && tag ? tag : 'div');
  }

  function icon(name, size) {
    var u = ui();
    return (u && typeof u.icon === 'function') ? u.icon(name, size) : '';
  }

  function t(key, vars) {
    return (SN.I18n && typeof SN.I18n.t === 'function') ? SN.I18n.t(key, vars) : String(key || '');
  }

  function pick(tobj) {
    if (SN.I18n && typeof SN.I18n.pick === 'function') return SN.I18n.pick(tobj);
    if (typeof tobj === 'string') return tobj;
    if (tobj && typeof tobj === 'object') return String(tobj.ar || tobj.en || '');
    return '';
  }

  function money(n) {
    if (SN.I18n && typeof SN.I18n.money === 'function') return SN.I18n.money(n);
    return String(n);
  }

  function num(n) {
    if (SN.I18n && typeof SN.I18n.num === 'function') return SN.I18n.num(n);
    return String(n);
  }

  function list(key) {
    if (SN.Store && typeof SN.Store.list === 'function') {
      try { return SN.Store.list(key) || []; }
      catch (e) { return []; }
    }
    return [];
  }

  function cfg(path, fallback) {
    if (SN.Store && typeof SN.Store.get === 'function') {
      try { return SN.Store.get(path, fallback); }
      catch (e) { return fallback; }
    }
    return fallback;
  }

  function q(id) {
    return document.getElementById(id);
  }

  /* Show or hide the whole <section> a container lives in, so an emptied
     collection never leaves a heading floating above nothing. */
  function showSection(node, show) {
    var sec = null;
    if (!node) return;
    if (typeof node.closest === 'function') sec = node.closest('section');
    if (!sec) sec = node;
    sec.hidden = !show;
  }

  /* a full-width child inside one of the .grid-* containers */
  function fullRow(kids) {
    return el('div', { style: { gridColumn: '1 / -1' } }, kids);
  }

  /* replace a container's children with `kids` (array of Node) */
  function fill(node, kids) {
    var i;
    if (!node) return null;
    while (node.firstChild) node.removeChild(node.firstChild);
    if (!kids) return node;
    if (!Array.isArray(kids)) kids = [kids];
    for (i = 0; i < kids.length; i++) if (kids[i]) node.appendChild(kids[i]);
    return node;
  }

  function setText(node, text) {
    if (node) node.textContent = text === null || text === undefined ? '' : String(text);
  }

  function initial(name) {
    var s = String(name === null || name === undefined ? '' : name).trim();
    return s ? s.charAt(0) : '•';
  }

  function toNum(v, fb) {
    var n2 = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n2) ? n2 : fb;
  }

  /* ==================================================================== */
  /* 2. the hero showcase — three hand-built, valid DESIGN_CONFIGs         */
  /*    (SPEC section 6). Used only when settings home.heroImage is empty. */
  /*                                                                      */
  /*    The hero does not show a nail set. It shows the SAME hand wearing  */
  /*    three different sets, one after another, because that — not a      */
  /*    sentence about it — is what says "this is made to order".          */
  /* ==================================================================== */

  /* One look per finger, mirrored onto both hands. Deliberately mid-tone
     colours rather than sheer nudes: the hero has to read as a *product*
     from across the room, on the light ground and on the dark one. */
  var LOOKS = [
    {
      id: 'pearl', shape: 'almond', length: 'long',
      /* solid rose — the plainest possible nail, so the set has somewhere to rest */
      thumb: { color: '#D493A8', finish: 'gloss', pattern: { kind: 'none', color: '#FFFFFF', color2: '#D493A8', scale: 1 } },
      /* the classic french */
      index: { color: '#EFCBD0', finish: 'gloss', pattern: { kind: 'french', color: '#FFFFFF', color2: '#D89AAE', scale: 1 } },
      /* a finish, not a pattern: velvet reads as a soft matte sheen */
      middle: { color: '#D493A8', finish: 'velvet', pattern: { kind: 'none', color: '#FFFFFF', color2: '#D493A8', scale: 1 } },
      /* the accent nail: ombré base carrying the charms */
      ring: {
        color: '#F0D7DC', finish: 'gloss',
        pattern: { kind: 'ombre', color: '#C3728F', color2: '#F0D7DC', scale: 1 },
        charms: [
          { id: 'ch-pearl', x: 0.5, y: 0.24, s: 0.78, r: 0 },
          { id: 'ch-round', x: 0.33, y: 0.46, s: 0.6, r: -12 },
          { id: 'ch-pearl', x: 0.67, y: 0.5, s: 0.54, r: 0 }
        ]
      },
      /* a printed motif in the brand gold */
      pinky: { color: '#D493A8', finish: 'gloss', pattern: { kind: 'dots', color: '#FFFFFF', color2: '#C2A05E', scale: 0.9 } }
    },

    {
      id: 'chrome', shape: 'stiletto', length: 'long',
      thumb: { color: '#4A1F3D', finish: 'chrome', pattern: { kind: 'none', color: '#C2A05E', color2: '#4A1F3D', scale: 1 } },
      index: { color: '#4A1F3D', finish: 'chrome', pattern: { kind: 'chrome', color: '#C2A05E', color2: '#4A1F3D', scale: 1 } },
      middle: { color: '#EDE4E9', finish: 'chrome', pattern: { kind: 'none', color: '#C2A05E', color2: '#EDE4E9', scale: 1 } },
      ring: {
        color: '#4A1F3D', finish: 'chrome',
        pattern: { kind: 'aura', color: '#C2A05E', color2: '#4A1F3D', scale: 1.1 },
        charms: [
          { id: 'ch-star', x: 0.5, y: 0.28, s: 0.7, r: 0 },
          { id: 'ch-star', x: 0.36, y: 0.5, s: 0.46, r: 14 }
        ]
      },
      pinky: { color: '#4A1F3D', finish: 'chrome', pattern: { kind: 'stars', color: '#C2A05E', color2: '#4A1F3D', scale: 0.85 } }
    },

    {
      id: 'sunset', shape: 'squoval', length: 'medium',
      thumb: { color: '#FAC7AC', finish: 'gloss', pattern: { kind: 'none', color: '#FFFFFF', color2: '#FAC7AC', scale: 1 } },
      index: { color: '#F3705A', finish: 'gloss', pattern: { kind: 'none', color: '#FFFFFF', color2: '#F3705A', scale: 1 } },
      middle: { color: '#FAC7AC', finish: 'gloss', pattern: { kind: 'french', color: '#FFFFFF', color2: '#F3705A', scale: 1 } },
      ring: {
        color: '#F3705A', finish: 'gloss',
        pattern: { kind: 'ombre', color: '#F2782B', color2: '#FAC7AC', scale: 1 },
        charms: [{ id: 'ch-daisy', x: 0.5, y: 0.32, s: 0.82, r: 0 }]
      },
      pinky: { color: '#F2782B', finish: 'gloss', pattern: { kind: 'dots', color: '#FFFFFF', color2: '#FAC7AC', scale: 0.9 } }
    }
  ];

  function fingerOf(key) {
    var s = String(key || '');
    var f = s.indexOf('left') === 0 ? s.slice(4) : (s.indexOf('right') === 0 ? s.slice(5) : s);
    return f.charAt(0).toLowerCase() + f.slice(1);
  }

  function showcaseDesign(look) {
    var d, keys, i, k, plan, tones, tone, c;

    look = look || LOOKS[0];
    if (!SN.Nail || typeof SN.Nail.blank !== 'function') return null;
    try { d = SN.Nail.blank(); }
    catch (e) { return null; }
    if (!d || !d.nails) return null;

    /* a mid-warm tone reads well on both the light and the dark ground */
    tones = list('skinTones');
    tone = tones.length > 1 ? tones[1] : tones[0];
    if (tone && typeof tone.hex === 'string' && tone.hex) d.skin = tone.hex;

    d.hand = 'both';
    d.shape = look.shape;
    d.length = look.length;

    keys = (SN.Nail.KEYS && SN.Nail.KEYS.length) ? SN.Nail.KEYS : [];
    for (i = 0; i < keys.length; i++) {
      k = keys[i];
      plan = look[fingerOf(k)];
      if (!plan || !d.nails[k]) continue;
      d.nails[k].color = plan.color;
      d.nails[k].finish = plan.finish;
      d.nails[k].pattern = {
        kind: plan.pattern.kind,
        color: plan.pattern.color,
        color2: plan.pattern.color2,
        scale: plan.pattern.scale
      };
      d.nails[k].charms = [];
      if (plan.charms) {
        for (c = 0; c < plan.charms.length; c++) {
          d.nails[k].charms.push({
            id: plan.charms[c].id,
            x: plan.charms[c].x,
            y: plan.charms[c].y,
            s: plan.charms[c].s,
            r: plan.charms[c].r
          });
        }
      }
    }
    return d;
  }

  /* ==================================================================== */
  /* 3. reveal-on-scroll                                                  */
  /* ==================================================================== */

  var observer = null;
  var watched = [];
  /* the fade-up belongs to the first paint only; a language flip or an admin
     edit re-renders in place and must not blank the page the visitor reads */
  var firstPass = true;

  function reducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  function ensureObserver() {
    if (observer || typeof window.IntersectionObserver !== 'function') return observer;
    try {
      observer = new window.IntersectionObserver(function (entries) {
        var i, en;
        for (i = 0; i < entries.length; i++) {
          en = entries[i];
          if (!en.isIntersecting) continue;
          if (en.target.classList) en.target.classList.add('is-in');
          try { observer.unobserve(en.target); }
          catch (e) { /* ignore */ }
        }
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    } catch (e) {
      observer = null;   /* no observer -> reveal() becomes a no-op */
    }
    return observer;
  }

  /* Mark `node` so it fades up when it scrolls into view. Falls back to
     "always visible" when IO is unavailable or motion is turned down. */
  function reveal(node, delayIndex) {
    var obs;
    if (!node || !node.classList) return node;
    if (!firstPass || reducedMotion()) return node;
    obs = ensureObserver();
    if (!obs) return node;
    node.classList.add('home-rv');
    if (delayIndex) {
      try { node.style.transitionDelay = Math.min(delayIndex, 3) * 60 + 'ms'; }
      catch (e) { /* ignore */ }
    }
    obs.observe(node);
    watched.push(node);
    return node;
  }

  /* Stop watching everything the previous pass marked. `reveal()` only arms
     nodes on the first pass, so a re-render (language flip, admin edit) never
     re-arms them — anything still waiting for `.is-in` would be stranded at
     opacity 0 forever. Strip the reveal class here so those nodes fall back to
     their plain visible state; nodes that already faded in lose nothing. */
  function dropObserved() {
    var i, node;
    for (i = 0; i < watched.length; i++) {
      node = watched[i];
      if (observer) {
        try { observer.unobserve(node); }
        catch (e) { /* ignore */ }
      }
      if (!node || !node.classList) continue;
      try {
        node.classList.remove('home-rv');
        node.classList.remove('is-in');
        node.style.transitionDelay = '';
      } catch (e2) { /* ignore */ }
    }
    watched.length = 0;
  }

  /* ==================================================================== */
  /* 4. section renderers                                                 */
  /* ==================================================================== */

  /* ── 4.1 hero ─────────────────────────────────────────────────────── */

  /* The rotating deck. Layers are rendered on demand and then kept, so the
     first paint costs exactly one hand render and the rest arrive while she
     is reading. The timer only runs while the hero is on screen and the tab
     is in front, and it never starts at all under reduced motion. */
  var deck = {
    stage: null,
    layers: [],      /* index -> {node, dot} */
    idx: 0,
    timer: 0,
    io: null,
    onScreen: true
  };

  var DECK_MS = 4600;

  function deckStop() {
    if (deck.timer) { window.clearInterval(deck.timer); deck.timer = 0; }
    if (deck.io) {
      try { deck.io.disconnect(); }
      catch (e) { /* ignore */ }
      deck.io = null;
    }
    deck.stage = null;
    deck.cap = null;
    deck.layers = [];
    deck.idx = 0;
    deck.onScreen = true;
  }

  function deckLayer(i) {
    var entry = deck.layers[i];
    var svg = null, design;
    if (!entry || entry.built || !entry.node) return entry;
    entry.built = true;
    design = showcaseDesign(LOOKS[i]);
    if (design && SN.Nail && typeof SN.Nail.preview === 'function') {
      try {
        svg = SN.Nail.preview(design, {
          w: 0, interactive: false,
          ariaLabel: t('home.lookCap', { name: t('home.look.' + LOOKS[i].id) })
        });
      } catch (e) { svg = null; console.warn('[SN.Home] hero preview failed', e); }
    }
    if (svg) entry.node.appendChild(svg);
    return entry;
  }

  function deckShow(i) {
    var n = deck.layers.length, j, entry;
    if (!n) return;
    i = ((i % n) + n) % n;
    deck.idx = i;
    deckLayer(i);
    for (j = 0; j < n; j++) {
      entry = deck.layers[j];
      if (!entry) continue;
      if (entry.node && entry.node.classList) {
        if (j === i) entry.node.classList.add('is-on');
        else entry.node.classList.remove('is-on');
      }
      if (entry.dot) entry.dot.setAttribute('aria-pressed', j === i ? 'true' : 'false');
    }
    if (deck.cap) {
      setText(deck.cap, t('home.lookCap', { name: t('home.look.' + LOOKS[i].id) }));
    }
    /* keep the next one warm so the cross-fade never waits on a render */
    window.setTimeout(function () { deckLayer((i + 1) % n); }, 400);
  }

  function deckTick() {
    if (!deck.onScreen) return;
    try { if (document.hidden) return; }
    catch (e) { /* ignore */ }
    deckShow(deck.idx + 1);
  }

  function deckPlay() {
    if (deck.timer || deck.layers.length < 2 || reducedMotion()) return;
    deck.timer = window.setInterval(deckTick, DECK_MS);
  }

  /* a tap on a dot is hers, so the auto-advance restarts from that moment
     instead of flipping the set half a second after she chose it */
  function deckPick(i) {
    deckShow(i);
    if (deck.timer) { window.clearInterval(deck.timer); deck.timer = 0; }
    deckPlay();
  }

  function buildDeck(host) {
    var wrapEl = el('div', { 'class': 'home-hero-deck' });
    var nav = el('div', { 'class': 'home-hero-nav' });
    var i, node, dot;

    for (i = 0; i < LOOKS.length; i++) {
      node = el('div', { 'class': 'home-hero-look' });
      dot = (function (idx) {
        return el('button', {
          type: 'button',
          'class': 'home-hero-dot',
          'aria-pressed': 'false',
          'aria-label': t('home.lookPick', { name: t('home.look.' + LOOKS[idx].id) }),
          title: t('home.look.' + LOOKS[idx].id),
          on: { click: function () { deckPick(idx); } }
        });
      })(i);
      wrapEl.appendChild(node);
      nav.appendChild(dot);
      deck.layers.push({ node: node, dot: dot, built: false });
    }

    deck.cap = el('p', { 'class': 'home-hero-cap' });
    host.appendChild(wrapEl);
    host.appendChild(nav);
    host.appendChild(deck.cap);
    deck.stage = host;

    deckShow(0);

    if (reducedMotion() || LOOKS.length < 2) return;
    if (typeof window.IntersectionObserver === 'function') {
      try {
        deck.io = new window.IntersectionObserver(function (entries) {
          var k;
          for (k = 0; k < entries.length; k++) deck.onScreen = entries[k].isIntersecting;
        }, { threshold: 0.15 });
        deck.io.observe(host);
      } catch (e) { deck.io = null; }
    }
    deckPlay();
  }

  function renderHero() {
    var title = q('home-hero-t');
    var sub = q('home-hero-sub');
    var cta = q('home-hero-cta');
    var notes = q('home-hero-notes');
    var art = q('home-hero-art');
    var img, stage, free, items;

    if (title) setText(title, pick(cfg('home.heroTitle', null)) || t('home.heroTitleFb'));
    if (sub) setText(sub, pick(cfg('home.heroSub', null)) || t('home.heroSubFb'));
    if (cta) setText(cta, pick(cfg('home.heroCta', null)) || t('home.heroCtaFb'));

    /* trust notes — the shipping threshold is read live from pricing */
    if (notes) {
      free = toNum(cfg('pricing.freeShippingOver', 0), 0);
      items = [];
      if (free > 0) items.push({ ico: 'truck', text: t('home.note1', { n: money(free) }) });
      items.push({ ico: 'ruler', text: t('home.note2') });
      items.push({ ico: 'sparkle', text: t('home.note3') });
      fill(notes, items.map(function (it) {
        return el('li', { 'class': 'home-note' }, [
          el('span', { html: icon(it.ico, 18), 'aria-hidden': 'true' }),
          el('span', { text: it.text })
        ]);
      }));
    }

    if (!art) return;
    img = String(cfg('home.heroImage', '') || '');
    stage = el('div', { 'class': 'home-hero-stage home-float' });

    if (img) {
      stage.appendChild(el('img', {
        src: img,
        alt: t('home.heroAlt'),
        loading: 'eager',
        decoding: 'async'
      }));
      fill(art, [stage]);
      return;
    }

    buildDeck(stage);

    /* nothing renderable (no image, no engine) — leave the column empty
       rather than shipping a broken box */
    if (!stage.querySelector('svg')) { deckStop(); fill(art, []); return; }
    fill(art, [stage]);
  }

  /* ── 4.1b the style quiz card ─────────────────────────────────────── */

  /* She comes in from an Instagram link with one thumb and no patience, so
     the quiz does not get a link in a list — its first question is printed
     right on the home page, in real rendered nails. Tapping a tile answers
     that question and opens the quiz already on question two, which turns
     "start a quiz" into "you have already started". */
  function renderQuiz() {
    var card = q('home-quiz');
    var note = q('home-quiz-note');
    var proof = q('home-quiz-proof');
    var cta = q('home-quiz-cta');
    var tiles = q('home-quiz-tiles');
    var tease = q('home-quiz-tease');
    var ready = !!(SN.Quiz && typeof SN.Quiz.teaser === 'function');
    var teaser = null, kids = [], i;

    if (note) {
      fill(note, [
        el('span', { 'class': 'ico', html: icon('clock', 16), 'aria-hidden': 'true' }),
        el('span', { text: t('quiz.cardNote') })
      ]);
    }
    if (proof) {
      fill(proof, [
        el('span', { 'class': 'ico', html: icon('sparkle', 16), 'aria-hidden': 'true' }),
        el('span', { text: t('quiz.cardProof') })
      ]);
    }

    if (tiles && ready) {
      try { teaser = SN.Quiz.teaser(); }
      catch (e) { teaser = null; }
    }
    if (tiles && teaser && teaser.options && teaser.options.length) {
      if (tease) setText(tease, t('quiz.cardTease'));
      for (i = 0; i < teaser.options.length; i++) {
        kids.push((function (opt) {
          return el('button', {
            type: 'button',
            'class': 'home-qtile sn-pickable',
            on: {
              click: function () {
                var seed = {};
                seed[teaser.key] = opt.id;
                if (SN.Quiz && typeof SN.Quiz.open === 'function') SN.Quiz.open({ seed: seed });
              }
            }
          }, [
            el('span', { 'class': 'home-qtile-art', 'aria-hidden': 'true' }, opt.art ? [opt.art] : []),
            el('span', { 'class': 'home-qtile-t', text: opt.label })
          ]);
        })(teaser.options[i]));
      }
      fill(tiles, kids);
    } else if (tiles) {
      fill(tiles, []);
    }

    if (cta && !cta.getAttribute('data-wired')) {
      cta.setAttribute('data-wired', '1');
      cta.addEventListener('click', function (ev) {
        /* let a modified click (new tab) do the native thing */
        if (ev && (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button > 0)) return;
        if (SN.Quiz && typeof SN.Quiz.open === 'function') {
          if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
          SN.Quiz.open();
        }
        /* no SN.Quiz: the href stands, and quiz.js opens on the hash if it
           ever does load — otherwise nothing worse than a no-op happens */
      }, false);
    }

    /* the one luxury sweep on this page, and only once it is actually seen */
    if (card && firstPass && !reducedMotion() && typeof window.IntersectionObserver === 'function') {
      shineWhenSeen(card);
    }

    /* A deferred script runs while readyState is already "interactive", so
       this file's first paint happens BEFORE quiz.js has been evaluated and
       SN.Quiz does not exist yet. Come back for the tiles once the whole
       set of page scripts has run. */
    if (!ready && !quizArtPending) {
      quizArtPending = true;
      document.addEventListener('DOMContentLoaded', function () { renderQuiz(); }, false);
    }
  }

  var quizArtPending = false;

  var shineIo = null;

  function shineWhenSeen(node) {
    if (!node || node.getAttribute('data-shine') === '1') return;
    try {
      if (!shineIo) {
        shineIo = new window.IntersectionObserver(function (entries) {
          var i, target;
          for (i = 0; i < entries.length; i++) {
            if (!entries[i].isIntersecting) continue;
            target = entries[i].target;
            target.setAttribute('data-shine', '1');
            if (target.classList) target.classList.add('sn-shine');
            try { shineIo.unobserve(target); }
            catch (e) { /* ignore */ }
          }
        }, { threshold: 0.35 });
      }
      shineIo.observe(node);
    } catch (e2) { /* no observer — the card simply never sweeps */ }
  }

  /* ── 4.2 stats strip ──────────────────────────────────────────────── */

  function renderStats() {
    var host = q('home-stats');
    var stats = list('home.stats');
    var i, s, kids = [];

    if (!host) return;
    fill(host, []);
    showSection(host, stats.length > 0);
    if (!stats.length) return;

    for (i = 0; i < stats.length; i++) {
      s = stats[i];
      if (!s) continue;
      kids.push(el('li', { 'class': 'home-stat' }, [
        el('span', { 'class': 'home-stat-v', text: String(s.value === undefined || s.value === null ? '' : s.value) }),
        el('span', { 'class': 'home-stat-l', text: pick(s.label) })
      ]));
    }
    fill(host, kids);
    reveal(host);
  }

  /* ── 4.3 how it works ─────────────────────────────────────────────── */

  function renderSteps() {
    var host = q('home-steps');
    var steps = list('home.steps');
    var i, s, kids = [];

    if (!host) return;
    fill(host, []);
    showSection(host, steps.length > 0);
    if (!steps.length) return;

    for (i = 0; i < steps.length; i++) {
      s = steps[i];
      if (!s) continue;
      kids.push(reveal(el('li', { 'class': 'home-step' }, [
        el('span', {
          'class': 'home-step-n',
          text: num(i + 1),
          'aria-label': t('home.stepN', { n: num(i + 1) })
        }),
        el('h3', { 'class': 'home-step-t', text: pick(s.title) }),
        el('p', { 'class': 'home-step-x', text: pick(s.text) })
      ]), i));
    }
    fill(host, kids);
  }

  /* ── 4.4 features ─────────────────────────────────────────────────── */

  function renderFeatures() {
    var host = q('home-features');
    var feats = list('home.features');
    var i, f, kids = [];

    if (!host) return;
    fill(host, []);
    showSection(host, feats.length > 0);
    if (!feats.length) return;

    for (i = 0; i < feats.length; i++) {
      f = feats[i];
      if (!f) continue;
      kids.push(reveal(el('article', { 'class': 'card card-flat home-feat' }, [
        el('span', {
          'class': 'home-feat-ico',
          html: icon(f.icon || 'sparkle', 26),
          'aria-hidden': 'true'
        }),
        el('h3', { 'class': 'home-feat-t', text: pick(f.title) }),
        el('p', { 'class': 'home-feat-x', text: pick(f.text) })
      ]), i));
    }
    fill(host, kids);
  }

  /* ── 4.5 most ordered ─────────────────────────────────────────────── */

  /* Order a ready-made item. checkout.js owns the modal; when it has not
     loaded (or an older cached copy is around) fall back to the shop's
     deep link so the button is never a dead end. */
  function orderReady(item) {
    if (!item) return;
    if (SN.Checkout && typeof SN.Checkout.open === 'function') {
      try {
        SN.Checkout.open({ kind: 'ready', item: item, qty: 1 });
        return;
      } catch (e) { console.warn('[SN.Home] checkout failed to open', e); }
    }
    window.location.href = 'shop.html#' + encodeURIComponent(String(item.id || ''));
  }

  function cardMedia(item) {
    var media = el('div', { 'class': 'card-media' });
    var img = String(item.image || '');
    var svg = null;

    if (img) {
      media.appendChild(el('img', {
        src: img,
        alt: pick(item.name),
        loading: 'lazy',
        decoding: 'async'
      }));
      return media;
    }
    if (SN.Nail && typeof SN.Nail.thumb === 'function') {
      try { svg = SN.Nail.thumb(item.config, 0); }
      catch (e) { svg = null; }
    }
    if (svg) media.appendChild(svg);
    return media;
  }

  /* The design card. SHOP renders the identical tree so the two pages read
     as one grid — keep the class list and the node order in sync. */
  function designCard(item, hot) {
    var id = String(item.id || '');
    var name = pick(item.name);
    var orders = Math.max(0, Math.round(toNum(item.orders, 0)));
    var media = cardMedia(item);
    var foot = [];
    var badge = null;

    /* the badge is a child of .card, not of .card-media: base.css gives
       `.card-media > *` position:relative, which would cancel .badge-float */
    if (hot) {
      badge = el('span', { 'class': 'badge badge-hot badge-float' }, [
        el('span', { html: icon('star', 13), 'aria-hidden': 'true' }),
        el('span', { text: t('home.topTitle') })
      ]);
    }

    foot.push(el('span', { 'class': 'card-price price', text: money(toNum(item.price, 0)) }));
    if (orders > 0) {
      foot.push(el('span', { 'class': 'badge', text: t('home.ordersN', { n: num(orders) }) }));
    }

    return el('article', { 'class': 'card home-card' }, [
      media,
      badge,
      el('div', { 'class': 'card-b' }, [
        el('h3', { 'class': 'card-t' }, [
          el('a', {
            'class': 'card-link',
            href: 'shop.html#' + encodeURIComponent(id),
            title: t('home.openInShop', { name: name }),
            text: name
          })
        ]),
        el('p', { 'class': 'card-x clamp-2', text: pick(item.desc) }),
        el('div', { 'class': 'card-f' }, foot),
        el('div', { 'class': 'btns home-card-btns' }, [
          el('button', {
            type: 'button',
            'class': 'btn btn-pri btn-sm',
            text: t('home.order'),
            on: { click: function () { orderReady(item); } }
          })
        ])
      ])
    ]);
  }

  function topDesigns(n) {
    var all = list('designs');
    var out = [], i, d;
    for (i = 0; i < all.length; i++) {
      d = all[i];
      if (d && d.active !== false) out.push(d);
    }
    out.sort(function (a, b) {
      var d2 = toNum(b.orders, 0) - toNum(a.orders, 0);
      if (d2 !== 0) return d2;
      return toNum(b.featured ? 1 : 0, 0) - toNum(a.featured ? 1 : 0, 0);
    });
    return out.slice(0, n);
  }

  /* Social proof, counted rather than claimed. Deliberately ONE specific
     fact — which single set leads and by how many real orders — instead of a
     grand total: a total would be a second, larger number sitting a screen
     away from the owner's own «+1200 طقم تم تسليمه» and quietly contradicting
     it. A named leader with its own count cannot contradict anything. */
  function renderProof() {
    var host = q('home-proof');
    var all = list('designs');
    var kids = [];
    var live = 0, i, d;
    var top = topDesigns(1)[0] || null;
    var topOrders = top ? Math.round(toNum(top.orders, 0)) : 0;

    if (!host) return;
    for (i = 0; i < all.length; i++) {
      d = all[i];
      if (d && d.active !== false) live++;
    }

    if (top && topOrders > 0) {
      kids.push(el('span', { 'class': 'pill pill-rose' }, [
        el('span', { html: icon('star', 14), 'aria-hidden': 'true' }),
        el('span', { text: t('home.proofTop', { name: pick(top.name), n: num(topOrders) }) })
      ]));
    }
    if (live > 0) {
      kids.push(el('span', { 'class': 'pill' }, [
        el('span', { html: icon('grid', 14), 'aria-hidden': 'true' }),
        el('span', { text: t('home.proofSets', { n: num(live) }) })
      ]));
    }
    fill(host, kids);
  }

  function renderTop() {
    var host = q('home-top');
    var items = topDesigns(4);
    var i, kids = [];

    if (!host) return;
    renderProof();

    if (!items.length) {
      fill(host, [fullRow([
        el('div', { 'class': 'empty' }, [
          el('span', { 'class': 'empty-ico', html: icon('sparkle', 30), 'aria-hidden': 'true' }),
          el('p', { 'class': 'empty-t', text: t('home.topEmpty') }),
          el('p', { 'class': 'mt-2' }, [
            el('a', { 'class': 'btn btn-pri', href: 'index.html#quiz', text: t('home.topEmptyCta') })
          ])
        ])
      ])]);
      return;
    }

    for (i = 0; i < items.length; i++) {
      kids.push(reveal(designCard(items[i], i === 0), i));
    }
    fill(host, kids);
  }

  /* ── 4.6 colour teaser ────────────────────────────────────────────── */

  function renderColors() {
    var host = q('home-colors');
    var sub = q('home-colors-sub');
    var colors = list('colors');
    var picked = [], seen = {}, i, c, hex, kids = [];
    var MAX = 18, step;

    if (sub) setText(sub, t('home.colorsSub', { n: num(colors.length) }));
    if (!host) return;

    /* Walk the palette with a stride so the strip samples every group
       instead of showing eighteen nudes in a row, then top up in order. */
    step = Math.max(1, Math.floor(colors.length / MAX));
    for (i = 0; i < colors.length && picked.length < MAX; i += step) {
      c = colors[i];
      hex = c && typeof c.hex === 'string' ? c.hex : '';
      if (!hex || seen[hex]) continue;
      seen[hex] = true;
      picked.push(c);
    }
    for (i = 0; i < colors.length && picked.length < MAX; i++) {
      c = colors[i];
      hex = c && typeof c.hex === 'string' ? c.hex : '';
      if (!hex || seen[hex]) continue;
      seen[hex] = true;
      picked.push(c);
    }

    fill(host, []);
    showSection(host, picked.length > 0);
    if (!picked.length) return;

    for (i = 0; i < picked.length; i++) {
      kids.push(el('span', {
        'class': 'swatch home-sw',
        style: { backgroundColor: picked[i].hex },
        title: pick(picked[i].name)
      }));
    }
    fill(host, kids);
    reveal(host);
  }

  /* ── 4.7 testimonials ─────────────────────────────────────────────── */

  /* base.css documents .stars as a run of ★ glyphs (`.stars-off` greys the
     remainder), which reads as a filled rating — the icon set's star is an
     outline and would look like an empty score. */
  function starRow(stars) {
    var n = Math.max(0, Math.min(5, Math.round(toNum(stars, 5))));
    var kids = [];
    if (n > 0) kids.push(el('span', { text: new Array(n + 1).join('★') }));
    if (n < 5) kids.push(el('span', { 'class': 'stars-off', text: new Array(6 - n).join('★') }));
    return el('span', {
      'class': 'stars',
      role: 'img',
      'aria-label': t('home.starsN', { n: num(n) })
    }, kids);
  }

  function renderTestimonials() {
    var host = q('home-testimonials');
    var items = list('home.testimonials');
    var i, it, name, kids = [];

    if (!host) return;
    if (!items.length) {
      fill(host, [fullRow([el('p', { 'class': 'empty', text: t('home.testiEmpty') })])]);
      return;
    }

    for (i = 0; i < items.length; i++) {
      it = items[i];
      if (!it) continue;
      name = typeof it.name === 'string' ? it.name : pick(it.name);
      kids.push(reveal(el('figure', { 'class': 'card card-flat home-quote' }, [
        starRow(it.stars),
        el('blockquote', { 'class': 'home-quote-x', text: pick(it.text) }),
        el('figcaption', { 'class': 'home-quote-w' }, [
          el('span', { 'class': 'home-quote-av', text: initial(name), 'aria-hidden': 'true' }),
          el('span', { 'class': 'home-quote-n', text: name })
        ])
      ]), i));
    }
    fill(host, kids);
  }

  /* ==================================================================== */
  /* 5. orchestration                                                     */
  /* ==================================================================== */

  var isHome = false;

  function render() {
    if (!isHome) return;
    dropObserved();
    deckStop();
    try {
      renderHero();
      renderQuiz();
      renderStats();
      renderSteps();
      renderFeatures();
      renderTop();
      renderColors();
      renderTestimonials();
    } catch (e) {
      console.error('[SN.Home] render failed', e);
    }
    firstPass = false;
    /* the freshly built tree carries data-i18n on nothing today, but a future
       edit might — and re-applying is free and idempotent */
    if (SN.I18n && typeof SN.I18n.apply === 'function') SN.I18n.apply(document);
  }

  var renderSoon = render;
  var booted = false;
  var painted = false;

  function paint() {
    painted = true;
    render();
  }

  function init() {
    var u = ui();
    var page = (document.body && document.body.getAttribute('data-page')) || 'home';
    var view = (document.body && document.body.getAttribute('data-view')) || '';

    if (booted) return;
    booted = true;

    isHome = view !== '404' && !!q('home-hero-t');

    if (u && typeof u.boot === 'function') u.boot(page);
    if (u && typeof u.debounce === 'function') renderSoon = u.debounce(render, 80);

    /* The store is normally hydrated by now, in which case ready() runs its
       callback synchronously and this IS the first paint. Registering before
       painting keeps it to exactly one pass, so the reveal animation is not
       thrown away by a second render a tick later. */
    if (SN.Store && typeof SN.Store.ready === 'function') SN.Store.ready(paint);
    if (!painted) paint();

    if (SN.I18n && typeof SN.I18n.apply === 'function') SN.I18n.apply(document);

    /* live updates: language flips and every owner edit in admin.html */
    if (SN.I18n && typeof SN.I18n.onChange === 'function') SN.I18n.onChange(function () { render(); });
    if (SN.Store && typeof SN.Store.subscribe === 'function') {
      SN.Store.subscribe(function () { renderSoon(); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, false);
  } else {
    init();
  }

  SN.Home = { render: render, showcase: showcaseDesign };
})();
