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
        heroSubFb: 'اختاري الشكل والطول واللون والنقشة، وشوفي الطقم يتكوّن قدّامك لحظة بلحظة.',
        heroCtaFb: 'ابدئي التصميم',
        heroCta2: 'شوفي التصاميم الجاهزة',
        heroAlt: 'معاينة حيّة لطقم أظافر مصمّم داخل الموقع',
        note1: 'شحن مجاني للطلبات فوق {n}',
        note2: 'مقاس مضبوط لكل ظفر على حدة',
        note3: 'تشوفين تصميمك قبل ما تطلبينه',

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
        topEmpty: 'ما فيه تصاميم جاهزة معروضة حالياً — بس تقدرين تصمّمين طقمك من الصفر.',
        topEmptyCta: 'ابدئي من الصفر',
        order: 'اطلبه',
        customize: 'خصّصه',
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
        bandCta: 'ابدئي التصميم الآن',
        bandCta2: 'عندي سؤال أول',

        /* 404 */
        nf: {
          title: 'الصفحة غير موجودة',
          text: 'يمكن الرابط قديم أو فيه حرف ناقص. لا تشيلين هم — كل شي على بُعد ضغطة.',
          home: 'الرجوع للرئيسية',
          studio: 'ادخلي الاستوديو',
          shop: 'التصاميم الجاهزة',
          faq: 'الأسئلة والتواصل'
        }
      }
    },

    en: {
      home: {
        eyebrow: 'Handcrafted press-on nails',
        heroTitleFb: 'Nails that look like you — from the very first touch',
        heroSubFb: 'Pick the shape, length, colour and pattern, and watch your set come together live.',
        heroCtaFb: 'Start designing',
        heroCta2: 'Browse ready-made sets',
        heroAlt: 'A live preview of a nail set designed on this site',
        note1: 'Free shipping over {n}',
        note2: 'Every nail sized individually',
        note3: 'See your design before you order',

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
        topEmpty: 'No ready-made sets are on show right now — but you can still build one from scratch.',
        topEmptyCta: 'Start from scratch',
        order: 'Order it',
        customize: 'Customise',
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
        bandCta: 'Start designing',
        bandCta2: 'I have a question first',

        nf: {
          title: 'This page does not exist',
          text: 'The link may be old, or a character may be missing. Nothing is lost — everything is one tap away.',
          home: 'Back to the home page',
          studio: 'Open the studio',
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
  /* 2. the hero showcase — a hand-built, valid DESIGN_CONFIG              */
  /*    (SPEC section 6). Used only when settings home.heroImage is empty. */
  /* ==================================================================== */

  /* One look per finger, mirrored onto both hands. Deliberately mid-tone
     roses rather than sheer nudes: the hero has to read as a *product* from
     across the room, on the light ground and on the dark one. */
  var SHOWCASE = {
    /* solid rose — the plainest possible nail, so the set has somewhere to rest */
    thumb: {
      color: '#D493A8', finish: 'gloss',
      pattern: { kind: 'none', color: '#FFFFFF', color2: '#D493A8', scale: 1 }
    },
    /* the classic french */
    index: {
      color: '#EFCBD0', finish: 'gloss',
      pattern: { kind: 'french', color: '#FFFFFF', color2: '#D89AAE', scale: 1 }
    },
    /* a finish, not a pattern: velvet reads as a soft matte sheen */
    middle: {
      color: '#D493A8', finish: 'velvet',
      pattern: { kind: 'none', color: '#FFFFFF', color2: '#D493A8', scale: 1 }
    },
    /* the accent nail: ombré base carrying the charms */
    ring: {
      color: '#F0D7DC', finish: 'gloss',
      pattern: { kind: 'ombre', color: '#C3728F', color2: '#F0D7DC', scale: 1 },
      charms: [
        { id: 'ch-pearl', x: 0.5, y: 0.24, s: 0.78, r: 0 },
        { id: 'ch-sparkles', x: 0.33, y: 0.46, s: 0.66, r: -12 },
        { id: 'ch-pearl', x: 0.67, y: 0.5, s: 0.54, r: 0 }
      ]
    },
    /* a printed motif in the brand gold */
    pinky: {
      color: '#D493A8', finish: 'gloss',
      pattern: { kind: 'dots', color: '#FFFFFF', color2: '#C2A05E', scale: 0.9 }
    }
  };

  function fingerOf(key) {
    var s = String(key || '');
    var f = s.indexOf('left') === 0 ? s.slice(4) : (s.indexOf('right') === 0 ? s.slice(5) : s);
    return f.charAt(0).toLowerCase() + f.slice(1);
  }

  function showcaseDesign() {
    var d, keys, i, k, look, tones, tone;

    if (!SN.Nail || typeof SN.Nail.blank !== 'function') return null;
    try { d = SN.Nail.blank(); }
    catch (e) { return null; }
    if (!d || !d.nails) return null;

    /* a mid-warm tone reads well on both the light and the dark ground */
    tones = list('skinTones');
    tone = tones.length > 1 ? tones[1] : tones[0];
    if (tone && typeof tone.hex === 'string' && tone.hex) d.skin = tone.hex;

    d.hand = 'both';
    d.shape = 'almond';
    d.length = 'long';

    keys = (SN.Nail.KEYS && SN.Nail.KEYS.length) ? SN.Nail.KEYS : [];
    for (i = 0; i < keys.length; i++) {
      k = keys[i];
      look = SHOWCASE[fingerOf(k)];
      if (!look || !d.nails[k]) continue;
      d.nails[k].color = look.color;
      d.nails[k].finish = look.finish;
      d.nails[k].pattern = {
        kind: look.pattern.kind,
        color: look.pattern.color,
        color2: look.pattern.color2,
        scale: look.pattern.scale
      };
      d.nails[k].charms = [];
      if (look.charms) {
        for (var c = 0; c < look.charms.length; c++) {
          d.nails[k].charms.push({
            id: look.charms[c].id,
            x: look.charms[c].x,
            y: look.charms[c].y,
            s: look.charms[c].s,
            r: look.charms[c].r
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

  function dropObserved() {
    var i;
    if (!observer) { watched.length = 0; return; }
    for (i = 0; i < watched.length; i++) {
      try { observer.unobserve(watched[i]); }
      catch (e) { /* ignore */ }
    }
    watched.length = 0;
  }

  /* ==================================================================== */
  /* 4. section renderers                                                 */
  /* ==================================================================== */

  /* ── 4.1 hero ─────────────────────────────────────────────────────── */

  function renderHero() {
    var title = q('home-hero-t');
    var sub = q('home-hero-sub');
    var cta = q('home-hero-cta');
    var notes = q('home-hero-notes');
    var art = q('home-hero-art');
    var img, stage, svg, design, free, items;

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
    } else {
      design = showcaseDesign();
      svg = null;
      if (design && SN.Nail && typeof SN.Nail.preview === 'function') {
        try { svg = SN.Nail.preview(design, { w: 0, interactive: false, ariaLabel: t('home.heroAlt') }); }
        catch (e) { svg = null; console.warn('[SN.Home] hero preview failed', e); }
      }
      if (svg) stage.appendChild(svg);
    }

    /* nothing renderable (no image, no engine) — leave the column empty
       rather than shipping a broken box */
    if (!stage.firstChild) { fill(art, []); return; }
    fill(art, [stage]);
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
          }),
          el('a', {
            'class': 'btn btn-ghost btn-sm',
            href: 'design.html#load=' + encodeURIComponent(id),
            text: t('home.customize')
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

  function renderTop() {
    var host = q('home-top');
    var items = topDesigns(4);
    var i, kids = [];

    if (!host) return;

    if (!items.length) {
      fill(host, [fullRow([
        el('div', { 'class': 'empty' }, [
          el('span', { 'class': 'empty-ico', html: icon('sparkle', 30), 'aria-hidden': 'true' }),
          el('p', { 'class': 'empty-t', text: t('home.topEmpty') }),
          el('p', { 'class': 'mt-2' }, [
            el('a', { 'class': 'btn btn-pri', href: 'design.html', text: t('home.topEmptyCta') })
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
    try {
      renderHero();
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
