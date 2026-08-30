/*! Shosh Nail — assets/js/quiz.js
 *  SN.Quiz : the style quiz (owner: HOME)
 *  Contract: SPEC.md sections 4, 6, 9, 10, 11, 12. Attaches exactly one
 *  property: window.SN.Quiz
 *
 *  Six one-tap questions, every answer a picture or a swatch, and at the end
 *  a real DESIGN_CONFIG (SPEC section 6) assembled from the answers, rendered
 *  with SN.Nail.preview, with two ways out: open it in the studio
 *  (design.html#d=<base64url>) or order it as it is (SN.Checkout.open).
 *
 *  Design notes
 *  ------------
 *  · The whole thing rides inside SN.UI.modal, so focus trapping, ESC, the
 *    backdrop and the scroll lock all come from the shell rather than from a
 *    second implementation of them here.
 *  · Every option tile after the first question is drawn in the colours she
 *    has already chosen — the quiz visibly builds her set as she taps.
 *  · Nothing here is random. The same answers always produce the same set, so
 *    a shared link and a retake agree with each other.
 *  · Every store lookup falls back: an owner who deletes half the palette in
 *    admin.html gets a plainer result, never a broken one.
 *
 *  Deep link: `#quiz` on any page that loads this file.
 */
(function () {
  'use strict';

  var SN = (window.SN = window.SN || {});

  /* ==================================================================== */
  /* 0. dictionary — namespace `quiz`                                      */
  /* ==================================================================== */

  var DICT = {
    ar: {
      quiz: {
        /* the entry point on the home page */
        cardEyebrow: 'اختبار الستايل',
        cardTitle: 'ما تدرين وش يناسبك؟',
        cardText: 'ست أسئلة سريعة، كلها صور — ولا سؤال يحتاج كتابة — وفي الآخر نطلع لك طقم مفصّل على ذوقك، تطلبينه على طول أو تعدّلين عليه براحتك.',
        cardCta: 'ابدئي الاختبار',
        cardNote: 'أقل من دقيقة',

        /* the shell */
        title: 'اختبار الستايل',
        stepN: 'سؤال {n} من {total}',
        progress: 'تقدّمك في الاختبار',
        back: 'رجوع',
        close: 'إغلاق الاختبار',
        picked: 'اخترتي: {name}',

        /* Q1 — the vibe */
        q1: 'وش الإحساس اللي تدوّرين عليه؟',
        h1: 'اختاري الجو اللي يشبهك، وكل شي بعده يبني عليه.',
        vibe: {
          calm: 'هادئ ونظيف',
          romantic: 'ناعم ورومانسي',
          bold: 'جريء وواضح',
          glam: 'لامع وفخم'
        },

        /* Q2 — length */
        q2: 'تحبينها طويلة وإلا مرتاحة؟',
        h2: 'الطول أكثر شي يغيّر شكل يدك في الصورة.',

        /* Q3 — colour */
        q3: 'كم تحبين لونك جريء؟',
        h3: 'من نيود يمشي مع كل شي، لين لون ما يمر عليه أحد بدون ما يلتفت.',
        tone: {
          soft: 'هادئ ونيود',
          sweet: 'وردي ناعم',
          bright: 'واضح وجريء',
          deep: 'غامق وعميق'
        },

        /* Q4 — occasion */
        q4: 'الطقم لأي مناسبة؟',
        h4: 'على أساسها نختار الزخرفة واللمعة.',
        occasion: {
          wedding: 'عرس أو خطوبة',
          daily: 'الدوام واليوميات',
          party: 'سهرة وحفلة',
          holiday: 'سفر وإجازة'
        },

        /* Q5 — decoration */
        q5: 'كم تحبين الزخرفة؟',
        h5: 'من ظفر نظيف تمامًا، لين طقم كامل مزيّن.',
        decor: {
          none: 'نظيف بدون زخرفة',
          accent: 'ظفر واحد مميّز',
          some: 'ظفرين وشوي لمعة',
          lots: 'زيّنيها كلها'
        },

        /* Q6 — skin tone */
        q6: 'وش أقرب لون لبشرتك؟',
        h6: 'عشان نوريك الطقم على يد تشبه يدك، مو على يد ثانية.',

        /* the anticipation beat */
        waitTitle: 'نجمع لك الطقم…',
        waitText: 'نختار اللون والشكل والزخرفة على ذوقك.',

        /* the reveal — the name follows the colour and the sentence is built
           from two halves so it can never describe a set she is not seeing */
        doneTitle: 'طقمك المثالي',
        previewAlt: 'معاينة طقم «{name}»',
        name: {
          soft: 'صفاء',
          sweet: 'همسة وردية',
          bright: 'لفتة',
          deep: 'بريق الليل'
        },
        mood: {
          calm: 'خطوط ناعمة ولمعة هادية',
          romantic: 'نعومة وتدرّج خفيف',
          bold: 'شكل حاد وحضور واضح',
          glam: 'لمعة مرايا وتفاصيل تلمع'
        },
        shade: {
          soft: 'بدرجات نيود تمشي مع كل شي',
          sweet: 'بوردي ناعم وهادي',
          bright: 'بلون جريء ما يمر عليه أحد',
          deep: 'بدرجة غامقة وعميقة'
        },
        blurb: '{mood}، {shade}.',
        priceFrom: 'يبدأ من {p}',
        priceNote: 'السعر شامل الشحن، ويتغيّر لو زدتي أو نقّصتي في التصميم.',
        order: 'اطلبيه الآن',
        studio: 'عدّليه في الاستوديو',
        again: 'أعيدي الاختبار',
        yourPicks: 'اختياراتك',
        /* short forms — a chip is a label, not a sentence */
        chipOccasion: {
          wedding: 'للعرس',
          daily: 'لليوميات',
          party: 'للسهرة',
          holiday: 'للسفر'
        },
        chipDecor: {
          none: 'بدون زخرفة',
          accent: 'ظفر مميّز',
          some: 'ظفرين مزيّنين',
          lots: 'مزيّن بالكامل'
        },
        savedNote: 'التصميم صار جاهز — عدّلي فيه اللي تبينه قبل ما تطلبين.',
        failTitle: 'ما قدرنا نبني الطقم',
        failText: 'جرّبي مرة ثانية، أو ادخلي الاستوديو وصمّمي طقمك من الصفر.',
        failCta: 'ادخلي الاستوديو'
      }
    },

    en: {
      quiz: {
        cardEyebrow: 'Style quiz',
        cardTitle: 'Not sure what suits you?',
        cardText: 'Six quick questions, all pictures — nothing to type — and at the end we build a set around your taste. Order it as it is, or open it up and change anything you like.',
        cardCta: 'Take the quiz',
        cardNote: 'Under a minute',

        title: 'Style quiz',
        stepN: 'Question {n} of {total}',
        progress: 'Quiz progress',
        back: 'Back',
        close: 'Close the quiz',
        picked: 'Picked: {name}',

        q1: 'What are you in the mood for?',
        h1: 'Pick the mood that feels like you — everything after this builds on it.',
        vibe: {
          calm: 'Clean and calm',
          romantic: 'Soft and romantic',
          bold: 'Bold and loud',
          glam: 'Glossy and glam'
        },

        q2: 'Long, or comfortable?',
        h2: 'Length changes the look of your hand more than anything else.',

        q3: 'How brave is your colour?',
        h3: 'From a nude that goes with everything, to a shade nobody walks past.',
        tone: {
          soft: 'Quiet nudes',
          sweet: 'Soft pinks',
          bright: 'Bright and bold',
          deep: 'Deep and dark'
        },

        q4: 'What is the set for?',
        h4: 'It tells us how much sparkle to put on.',
        occasion: {
          wedding: 'A wedding or engagement',
          daily: 'Work and everyday',
          party: 'A night out',
          holiday: 'Travel and holidays'
        },

        q5: 'How much decoration?',
        h5: 'From completely bare, to a full set dressed up.',
        decor: {
          none: 'Bare, no decoration',
          accent: 'One accent nail',
          some: 'Two nails and some shine',
          lots: 'Decorate them all'
        },

        q6: 'Which is closest to your skin?',
        h6: 'So you see the set on a hand like yours, not on somebody else’s.',

        waitTitle: 'Building your set…',
        waitText: 'Choosing the colour, the shape and the details.',

        doneTitle: 'Your perfect set',
        previewAlt: 'Preview of the “{name}” set',
        name: {
          soft: 'Serene',
          sweet: 'Rose Whisper',
          bright: 'Statement',
          deep: 'Midnight Gleam'
        },
        mood: {
          calm: 'Soft lines and a quiet shine',
          romantic: 'Softness and a gentle fade',
          bold: 'A sharp shape with real presence',
          glam: 'Mirror shine and detail that catches the light'
        },
        shade: {
          soft: 'in nudes that go with everything',
          sweet: 'in soft, quiet pinks',
          bright: 'in a colour nobody walks past',
          deep: 'in a deep, dark shade'
        },
        blurb: '{mood}, {shade}.',
        priceFrom: 'From {p}',
        priceNote: 'Shipping included. The total moves if you add to or simplify the design.',
        order: 'Order it now',
        studio: 'Tweak it in the studio',
        again: 'Retake the quiz',
        yourPicks: 'Your picks',
        chipOccasion: {
          wedding: 'For a wedding',
          daily: 'Everyday',
          party: 'For a night out',
          holiday: 'For travel'
        },
        chipDecor: {
          none: 'Bare',
          accent: 'One accent nail',
          some: 'Two nails',
          lots: 'Fully decorated'
        },
        savedNote: 'Your set is ready — change anything you like before you order.',
        failTitle: 'We could not build the set',
        failText: 'Try once more, or open the studio and design your own from scratch.',
        failCta: 'Open the studio'
      }
    }
  };

  if (SN.I18n && typeof SN.I18n.extend === 'function') SN.I18n.extend(DICT);

  /* ==================================================================== */
  /* 1. tiny private helpers                                               */
  /* ==================================================================== */

  var TOTAL = 6;
  var HOLD = 240;      /* how long the pick flourish is allowed to be seen  */
  var WAIT = 900;      /* the anticipation beat before the reveal           */

  function ui() { return SN.UI || null; }

  function el(tag, attrs, kids) {
    var u = ui();
    if (u && typeof u.el === 'function') return u.el(tag, attrs, kids);
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

  function findIn(key, id) {
    var arr = list(key), i;
    for (i = 0; i < arr.length; i++) {
      if (arr[i] && String(arr[i].id) === String(id)) return arr[i];
    }
    return null;
  }

  function fill(node, kids) {
    var i;
    if (!node) return null;
    while (node.firstChild) node.removeChild(node.firstChild);
    if (!kids) return node;
    if (!Array.isArray(kids)) kids = [kids];
    for (i = 0; i < kids.length; i++) if (kids[i]) node.appendChild(kids[i]);
    return node;
  }

  function reducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  /* base64url, UTF-8 safe both ways — the exact shape design.html reads back */
  function b64url(text) {
    var bin = '', i, bytes;
    try {
      if (typeof window.TextEncoder === 'function') {
        bytes = new window.TextEncoder().encode(String(text));
        for (i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      } else {
        bin = unescape(encodeURIComponent(String(text)));
      }
      return window.btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
      console.warn('[SN.Quiz] could not encode the design', e);
      return '';
    }
  }

  /* ==================================================================== */
  /* 2. the recipe                                                         */
  /*                                                                       */
  /*    Six answers in, one DESIGN_CONFIG out. Every id below is looked up  */
  /*    in the store first and only falls back to a literal when the owner  */
  /*    has removed it, so the quiz keeps working on an edited catalogue.   */
  /* ==================================================================== */

  /* The mood sets the silhouette, the finish and the signature pattern —
     and, until she has answered them herself, the palette and the occasion
     too, so the very first screen already shows four visibly different sets
     instead of four nudes that differ only in outline. */
  var VIBES = [
    { id: 'calm', shape: 'almond', finish: 'gloss', pattern: 'french', scale: 1, tone: 'soft', occasion: 'daily' },
    { id: 'romantic', shape: 'almond', finish: 'gloss', pattern: 'ombre', scale: 1, tone: 'sweet', occasion: 'wedding' },
    { id: 'bold', shape: 'coffin', finish: 'gloss', pattern: 'diagonal', scale: 1, tone: 'bright', occasion: 'party' },
    { id: 'glam', shape: 'stiletto', finish: 'chrome', pattern: 'chrome', scale: 1, tone: 'deep', occasion: 'party' }
  ];

  /* the colour question picks the palette: a curated first choice, then the
     colour groups it belongs to, then a literal hex that always renders.
     The accent is deliberately a long way from the base — a tip or a fade
     that only just differs from the nail under it reads as a printing fault
     on a phone-sized thumbnail. */
  var TONES = [
    {
      id: 'soft',
      base: ['c-nude-rose', 'c-ballet', 'c-porcelain'], baseGroups: ['nude', 'neutral'], baseHex: '#E9C2C0',
      accent: ['c-toffee', 'c-caramel', 'c-latte'], accentGroups: ['nude'], accentHex: '#B98F6F',
      strip: ['nude', 'neutral', 'pastel']
    },
    {
      id: 'sweet',
      base: ['c-blush', 'c-ballet', 'c-peony'], baseGroups: ['pink', 'pastel'], baseHex: '#F4CBD2',
      accent: ['c-hot-pink', 'c-peony', 'c-fuchsia'], accentGroups: ['pink'], accentHex: '#EE5B94',
      strip: ['pink', 'pastel']
    },
    {
      id: 'bright',
      base: ['c-coral', 'c-hot-pink', 'c-scarlet'], baseGroups: ['red', 'bold'], baseHex: '#F3705A',
      accent: ['c-cherry', 'c-wine', 'c-fuchsia'], accentGroups: ['red'], accentHex: '#C2192F',
      strip: ['red', 'bold']
    },
    {
      id: 'deep',
      base: ['c-wine', 'c-deep-plum', 'c-espresso'], baseGroups: ['dark'], baseHex: '#7B1E31',
      accent: ['c-pearl', 'c-milk', 'c-porcelain'], accentGroups: ['neutral'], accentHex: '#EDE4E9',
      strip: ['dark', 'red', 'neutral']
    }
  ];

  /* the occasion decides what goes on the accent nail */
  var OCCASIONS = [
    { id: 'wedding', ico: 'gem', accent: 'lace', charms: ['ch-pearl', 'ch-round', 'ch-blossom', 'ch-teardrop'] },
    { id: 'daily', ico: 'clock', accent: 'french', charms: ['ch-stud', 'ch-caviar', 'ch-round', 'ch-pearl'] },
    { id: 'party', ico: 'sparkle', accent: 'tipsGlitter', charms: ['ch-star', 'ch-round', 'ch-moon', 'ch-star-3d'] },
    { id: 'holiday', ico: 'sun', accent: 'dots', charms: ['ch-daisy', 'ch-blossom', 'ch-butterfly', 'ch-heart'] }
  ];

  /* how far the decoration spreads: patterned nails per hand, charms on the
     accent nail. The order below is the order nails get dressed. */
  var DECORS = [
    { id: 'none', nails: 0, charms: 0 },
    { id: 'accent', nails: 1, charms: 2 },
    { id: 'some', nails: 2, charms: 3 },
    { id: 'lots', nails: 4, charms: 4 }
  ];

  /* ring first — it is the accent nail on every hand in the world */
  var DRESS_ORDER = ['Ring', 'Index', 'Pinky', 'Middle', 'Thumb'];

  /* charm placements, in the order they get added to the accent nail */
  var SPOTS = [
    { x: 0.5, y: 0.26, s: 0.78, r: 0 },
    { x: 0.36, y: 0.45, s: 0.56, r: -10 },
    { x: 0.63, y: 0.48, s: 0.5, r: 8 },
    { x: 0.5, y: 0.62, s: 0.42, r: 0 }
  ];

  var FALLBACK_ANS = {
    vibe: 'calm', length: 'medium', tone: '',
    occasion: '', decor: 'accent', skin: 'st-fair'
  };

  function rowOf(table, id) {
    var i;
    for (i = 0; i < table.length; i++) if (table[i].id === id) return table[i];
    return table[0];
  }

  /* a colour hex: the curated ids, then anything in the right group, then a
     literal that is guaranteed to render */
  function hexFor(ids, groups, fallback) {
    var colors = list('colors'), i, j, c;
    for (i = 0; i < ids.length; i++) {
      c = findIn('colors', ids[i]);
      if (c && typeof c.hex === 'string' && c.hex) return c.hex;
    }
    for (j = 0; j < groups.length; j++) {
      for (i = 0; i < colors.length; i++) {
        c = colors[i];
        if (c && c.group === groups[j] && typeof c.hex === 'string' && c.hex) return c.hex;
      }
    }
    return fallback;
  }

  function colorName(hex) {
    var colors = list('colors'), i;
    for (i = 0; i < colors.length; i++) {
      if (colors[i] && String(colors[i].hex).toUpperCase() === String(hex).toUpperCase()) {
        return pick(colors[i].name);
      }
    }
    return '';
  }

  /* A strip of real swatches for the colour question. The two colours this
     answer would actually put on her nails come first, so the tile is a
     promise rather than a mood board. */
  function stripFor(tone) {
    var colors = list('colors'), out = [], i, j, c;
    var MAX = 4;

    out.push(hexFor(tone.base, tone.baseGroups, tone.baseHex));
    c = hexFor(tone.accent, tone.accentGroups, tone.accentHex);
    if (out.indexOf(c) === -1) out.push(c);

    for (j = 0; j < tone.strip.length && out.length < MAX; j++) {
      for (i = 0; i < colors.length && out.length < MAX; i++) {
        c = colors[i];
        if (c && c.group === tone.strip[j] && c.hex && out.indexOf(c.hex) === -1) out.push(c.hex);
      }
    }
    while (out.length < MAX) out.push(out[out.length - 1] || tone.baseHex);
    return out;
  }

  function shapeOk(id) {
    var arr = (SN.Nail && SN.Nail.SHAPES) ? SN.Nail.SHAPES : [];
    if (findIn('shapes', id)) return id;
    if (arr.length && arr.indexOf(id) !== -1) return id;
    return (list('shapes')[0] || {}).id || 'almond';
  }

  function finishOk(id) {
    if (findIn('finishes', id)) return id;
    return (list('finishes')[0] || {}).id || 'gloss';
  }

  function lengthOk(id) {
    if (findIn('lengths', id)) return id;
    return (list('lengths')[0] || {}).id || 'medium';
  }

  function patternOk(kind) {
    var kinds = (SN.Nail && SN.Nail.PATTERN_KINDS) ? SN.Nail.PATTERN_KINDS : null;
    if (kinds && kinds.indexOf(kind) === -1) return 'none';
    return kind;
  }

  function charmOk(ids) {
    var i, c;
    for (i = 0; i < ids.length; i++) {
      c = findIn('charms', ids[i]);
      if (c) return c.id;
    }
    c = list('charms')[0];
    return c ? c.id : '';
  }

  function skinHex(id) {
    var tone = findIn('skinTones', id);
    var all = list('skinTones');
    if (tone && tone.hex) return tone.hex;
    if (all.length) return all[Math.min(1, all.length - 1)].hex || '#EFCDB6';
    return '#EFCDB6';
  }

  function blankDesign() {
    var d = null;
    if (SN.Nail && typeof SN.Nail.blank === 'function') {
      try { d = SN.Nail.blank(); }
      catch (e) { d = null; }
    }
    if (d && d.nails) return d;
    return null;
  }

  /* ---- the build: six answers in, one DESIGN_CONFIG out --------------- */

  function build(answers) {
    var a = {}, k;
    var d, vibe, tone, occ, dec;
    var base, accent, keys, i, key, finger, side, dressed, charmId, n;

    for (k in FALLBACK_ANS) {
      if (Object.prototype.hasOwnProperty.call(FALLBACK_ANS, k)) {
        a[k] = (answers && answers[k]) ? answers[k] : FALLBACK_ANS[k];
      }
    }

    d = blankDesign();
    if (!d) return null;

    vibe = rowOf(VIBES, a.vibe);
    /* an unanswered palette or occasion follows the mood she already chose */
    tone = rowOf(TONES, a.tone || vibe.tone);
    occ = rowOf(OCCASIONS, a.occasion || vibe.occasion);
    dec = rowOf(DECORS, a.decor);

    base = hexFor(tone.base, tone.baseGroups, tone.baseHex);
    accent = hexFor(tone.accent, tone.accentGroups, tone.accentHex);

    d.skin = skinHex(a.skin);
    d.hand = 'both';
    d.shape = shapeOk(vibe.shape);
    d.length = lengthOk(a.length);
    d.qty = 1;
    d.express = false;
    d.giftWrap = false;
    d.notes = '';

    charmId = charmOk(occ.charms);
    keys = (SN.Nail && SN.Nail.KEYS && SN.Nail.KEYS.length) ? SN.Nail.KEYS : [];

    /* every nail starts as a clean solid in her colour */
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      if (!d.nails[key]) continue;
      d.nails[key].color = base;
      d.nails[key].finish = finishOk(vibe.finish);
      d.nails[key].pattern = { kind: 'none', color: accent, color2: base, scale: 1 };
      d.nails[key].charms = [];
    }

    /* then the decoration spreads, ring nail first, mirrored on both hands */
    dressed = DRESS_ORDER.slice(0, Math.max(0, Math.min(DECORS[DECORS.length - 1].nails, dec.nails)));
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      if (!d.nails[key]) continue;
      side = key.indexOf('left') === 0 ? 'left' : 'right';
      finger = key.slice(side.length);
      if (dressed.indexOf(finger) === -1) continue;

      /* the accent nail wears the occasion, the rest wear the mood */
      d.nails[key].pattern = {
        kind: patternOk(finger === 'Ring' ? occ.accent : vibe.pattern),
        color: finger === 'Ring' ? accent : accent,
        color2: base,
        scale: vibe.scale
      };
    }

    /* charms land on the accent nail only — a charm on all ten reads cluttered
       and prices the set out of her reach for no gain */
    if (charmId && dec.charms > 0 && dec.nails > 0) {
      n = Math.min(dec.charms, SPOTS.length);
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        if (!d.nails[key]) continue;
        side = key.indexOf('left') === 0 ? 'left' : 'right';
        if (key.slice(side.length) !== 'Ring') continue;
        d.nails[key].charms = SPOTS.slice(0, n).map(function (s) {
          return { id: charmId, x: s.x, y: s.y, s: s.s, r: s.r };
        });
      }
    }

    return d;
  }

  /* the chips under the reveal: what she actually chose, in her words */
  function pickChips(answers) {
    var a = answers || {};
    var vibe = rowOf(VIBES, a.vibe);
    var shape = findIn('shapes', shapeOk(vibe.shape));
    var len = findIn('lengths', lengthOk(a.length));
    var tone = rowOf(TONES, a.tone || vibe.tone);
    var hex = hexFor(tone.base, tone.baseGroups, tone.baseHex);
    var name = colorName(hex);
    var out = [];

    if (shape) out.push(pick(shape.name));
    if (len) out.push(pick(len.name));
    if (name) out.push(name);
    out.push(t('quiz.chipOccasion.' + rowOf(OCCASIONS, a.occasion || vibe.occasion).id));
    out.push(t('quiz.chipDecor.' + rowOf(DECORS, a.decor).id));
    return out;
  }

  /* ==================================================================== */
  /* 3. option tiles                                                       */
  /* ==================================================================== */

  var STEPS = [
    { key: 'vibe', q: 'quiz.q1', hint: 'quiz.h1', art: 'thumb', cols: 2 },
    { key: 'length', q: 'quiz.q2', hint: 'quiz.h2', art: 'nail', cols: 2 },
    { key: 'tone', q: 'quiz.q3', hint: 'quiz.h3', art: 'strip', cols: 2 },
    { key: 'occasion', q: 'quiz.q4', hint: 'quiz.h4', art: 'icon', cols: 2 },
    { key: 'decor', q: 'quiz.q5', hint: 'quiz.h5', art: 'thumb', cols: 2 },
    { key: 'skin', q: 'quiz.q6', hint: 'quiz.h6', art: 'skin', cols: 3 }
  ];

  /* the options for a step, as {id, label} — the two data-driven steps read
     straight from the store so an owner edit shows up in the quiz too */
  function optionsFor(key) {
    var out = [], arr, i;

    if (key === 'length') {
      arr = list('lengths');
      for (i = 0; i < arr.length && i < 4; i++) {
        if (arr[i] && arr[i].id) out.push({ id: arr[i].id, label: pick(arr[i].name) });
      }
      return out;
    }
    if (key === 'skin') {
      arr = list('skinTones');
      for (i = 0; i < arr.length && i < 6; i++) {
        if (arr[i] && arr[i].id) out.push({ id: arr[i].id, label: pick(arr[i].name), hex: arr[i].hex });
      }
      return out;
    }

    arr = key === 'vibe' ? VIBES : (key === 'tone' ? TONES : (key === 'occasion' ? OCCASIONS : DECORS));
    for (i = 0; i < arr.length; i++) {
      out.push({ id: arr[i].id, label: t('quiz.' + key + '.' + arr[i].id), row: arr[i] });
    }
    return out;
  }

  /* the artwork inside one tile. Every branch falls back to a plain colour
     block, so a missing or half-loaded render engine still gives her
     something to tap that says what it means. */
  function tileArt(step, opt, answers) {
    var box = el('span', { 'class': 'quiz-art', 'aria-hidden': 'true' });
    var probe = {}, k, d, node = null, hexes, i, tone;

    if (step.art === 'strip') {
      tone = rowOf(TONES, opt.id);
      hexes = stripFor(tone);
      for (i = 0; i < hexes.length; i++) {
        box.appendChild(el('span', { 'class': 'quiz-sw', style: { backgroundColor: hexes[i] } }));
      }
      box.setAttribute('class', 'quiz-art quiz-art-strip');
      return box;
    }

    if (step.art === 'skin') {
      box.setAttribute('class', 'quiz-art quiz-art-skin');
      box.appendChild(el('span', {
        'class': 'quiz-skin',
        style: { backgroundColor: opt.hex || '#EFCDB6' }
      }));
      return box;
    }

    if (step.art === 'icon') {
      box.setAttribute('class', 'quiz-art quiz-art-icon');
      box.appendChild(el('span', { 'class': 'quiz-ico', html: icon(opt.row ? opt.row.ico : 'sparkle', 30) }));
      return box;
    }

    /* nail artwork: build the set she would get if she picked this one */
    for (k in answers) {
      if (Object.prototype.hasOwnProperty.call(answers, k)) probe[k] = answers[k];
    }
    probe[step.key] = opt.id;
    d = build(probe);

    if (d && SN.Nail) {
      try {
        if (step.art === 'nail' && typeof SN.Nail.single === 'function') {
          node = SN.Nail.single(d.nails.rightRing, d, {
            w: 96, natural: true, length: d.length, bg: false, key: 'quiz-' + opt.id
          });
        } else if (typeof SN.Nail.thumb === 'function') {
          node = SN.Nail.thumb(d, 128);
        }
      } catch (e) { node = null; }
    }

    if (node) box.appendChild(node);
    else {
      box.appendChild(el('span', {
        'class': 'quiz-skin',
        style: { backgroundColor: d ? d.nails.rightRing.color : '#E9C2C0' }
      }));
    }
    return box;
  }

  /* ==================================================================== */
  /* 4. state + the shell                                                  */
  /* ==================================================================== */

  var st = {
    open: false,
    step: 0,          /* 0..5 = a question, 6 = the wait, 7 = the reveal */
    ans: {},
    m: null,
    root: null,
    stage: null,
    live: null,
    design: null,
    timer: 0,
    hashLock: false
  };

  function clearTimer() {
    if (st.timer) {
      window.clearTimeout(st.timer);
      st.timer = 0;
    }
  }

  function setHash(on) {
    var base = (window.location.pathname || '') + (window.location.search || '');
    st.hashLock = true;
    try {
      if (window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(window.history.state, '', base + (on ? '#quiz' : ''));
      } else if (on) {
        window.location.hash = 'quiz';
      } else if (window.location.hash) {
        window.location.hash = '';
      }
    } catch (e) { /* file:// or a sandboxed frame — the quiz still works */ }
    window.setTimeout(function () { st.hashLock = false; }, 0);
  }

  /* ---- the progress row ---------------------------------------------- */

  function dots() {
    var row = el('div', {
      'class': 'quiz-dots',
      role: 'progressbar',
      'aria-label': t('quiz.progress'),
      'aria-valuemin': '1',
      'aria-valuemax': String(TOTAL),
      'aria-valuenow': String(Math.min(TOTAL, st.step + 1))
    });
    var i, cls;
    for (i = 0; i < TOTAL; i++) {
      cls = 'quiz-dot';
      if (i < st.step) cls += ' is-done';
      else if (i === st.step) cls += ' is-on';
      row.appendChild(el('span', { 'class': cls }));
    }
    return row;
  }

  function topBar() {
    var showBack = st.step > 0 && st.step < TOTAL;
    return el('div', { 'class': 'quiz-top' }, [
      el('button', {
        type: 'button',
        'class': 'btn btn-ghost btn-sm quiz-back' + (showBack ? '' : ' is-hidden'),
        'aria-hidden': showBack ? null : 'true',
        tabindex: showBack ? null : '-1',
        on: { click: back }
      }, [
        el('span', { 'class': 'quiz-back-ico', html: icon('chevron', 15), 'aria-hidden': 'true' }),
        el('span', { text: t('quiz.back') })
      ]),
      dots(),
      /* mirrors the back button so the dots sit dead centre either way */
      el('span', { 'class': 'quiz-top-pad', 'aria-hidden': 'true' })
    ]);
  }

  /* ---- a question screen --------------------------------------------- */

  function questionScreen() {
    var step = STEPS[st.step];
    var opts = optionsFor(step.key);
    var grid = el('div', {
      'class': 'quiz-opts quiz-cols-' + step.cols + (reducedMotion() ? '' : ' sn-stagger'),
      role: 'group',
      'aria-label': t(step.q)
    });
    var i;

    if (!opts.length) {
      /* the owner emptied this collection — skip rather than show a dead end */
      window.setTimeout(function () { answer(step.key, null); }, 0);
    }

    for (i = 0; i < opts.length; i++) {
      grid.appendChild((function (opt) {
        var on = st.ans[step.key] === opt.id;
        var btn = el('button', {
          type: 'button',
          'class': 'quiz-opt sn-pickable',
          'aria-pressed': on ? 'true' : 'false'
        }, [
          tileArt(step, opt, st.ans),
          el('span', { 'class': 'quiz-opt-t', text: opt.label })
        ]);
        btn.addEventListener('click', function () {
          var sibs = grid.querySelectorAll('.quiz-opt'), j;
          if (st.timer) return;                       /* one tap, not three */
          for (j = 0; j < sibs.length; j++) sibs[j].setAttribute('aria-pressed', 'false');
          btn.setAttribute('aria-pressed', 'true');
          say(t('quiz.picked', { name: opt.label }));
          st.timer = window.setTimeout(function () {
            st.timer = 0;
            answer(step.key, opt.id);
          }, reducedMotion() ? 0 : HOLD);
        }, false);
        return btn;
      })(opts[i]));
    }

    return el('div', { 'class': 'quiz-screen' + (reducedMotion() ? '' : ' sn-in') }, [
      el('p', {
        'class': 'eyebrow quiz-eyebrow',
        text: t('quiz.stepN', { n: num(st.step + 1), total: num(TOTAL) })
      }),
      el('h3', { 'class': 'quiz-q display', text: t(step.q) }),
      el('p', { 'class': 'quiz-hint', text: t(step.hint) }),
      grid
    ]);
  }

  /* ---- the anticipation beat ------------------------------------------ */

  function waitScreen() {
    var fan = el('div', { 'class': 'quiz-wait-fan', 'aria-hidden': 'true' });
    var i;
    for (i = 0; i < 3; i++) fan.appendChild(el('span', { 'class': 'sk quiz-wait-n' }));

    return el('div', { 'class': 'quiz-screen quiz-wait' }, [
      fan,
      el('p', { 'class': 'quiz-wait-t display', text: t('quiz.waitTitle') }),
      el('p', { 'class': 'quiz-hint', text: t('quiz.waitText') })
    ]);
  }

  /* ---- the reveal ------------------------------------------------------ */

  function burst() {
    var b = el('div', { 'class': 'sn-burst', 'aria-hidden': 'true' }), i;
    for (i = 0; i < 12; i++) b.appendChild(el('i'));
    return b;
  }

  function failScreen() {
    return el('div', { 'class': 'quiz-screen quiz-done' }, [
      el('p', { 'class': 'empty-t', text: t('quiz.failTitle') }),
      el('p', { 'class': 'quiz-hint', text: t('quiz.failText') }),
      el('div', { 'class': 'btns quiz-actions' }, [
        el('a', { 'class': 'btn btn-pri btn-lg', href: 'design.html', text: t('quiz.failCta') })
      ])
    ]);
  }

  function priceOf(design) {
    var p = null;
    if (SN.Checkout && typeof SN.Checkout.priceCustom === 'function') {
      try { p = SN.Checkout.priceCustom(design); }
      catch (e) { p = null; }
    }
    return (p && isFinite(p.total)) ? p.total : null;
  }

  function doneScreen() {
    var d = st.design;
    var vibe = rowOf(VIBES, st.ans.vibe);
    var tone = rowOf(TONES, st.ans.tone || vibe.tone);
    var name = t('quiz.name.' + tone.id);
    var blurb = t('quiz.blurb', {
      mood: t('quiz.mood.' + vibe.id),
      shade: t('quiz.shade.' + tone.id)
    });
    var chips = pickChips(st.ans);
    var total = priceOf(d);
    var art = el('div', { 'class': 'quiz-hero' });
    var svg = null, i, kids;
    var link = 'design.html';
    var code;

    if (SN.Nail && typeof SN.Nail.preview === 'function') {
      try {
        svg = SN.Nail.preview(d, { w: 0, interactive: false, ariaLabel: t('quiz.previewAlt', { name: name }) });
      } catch (e) { svg = null; }
    }
    if (svg) art.appendChild(svg);

    code = b64url(JSON.stringify(d));
    if (code) link = 'design.html#d=' + code;

    kids = [];
    for (i = 0; i < chips.length; i++) {
      if (chips[i]) kids.push(el('span', { 'class': 'tag', text: chips[i] }));
    }

    return el('div', { 'class': 'quiz-screen quiz-done' }, [
      reducedMotion() ? null : burst(),
      el('p', { 'class': 'eyebrow quiz-eyebrow', text: t('quiz.doneTitle') }),
      el('h3', { 'class': 'quiz-name display', text: name }),
      art,
      el('p', { 'class': 'quiz-hint quiz-blurb', text: blurb }),
      kids.length ? el('div', { 'class': 'quiz-picks', 'aria-label': t('quiz.yourPicks') }, kids) : null,
      total === null ? null : el('p', { 'class': 'quiz-price price', text: t('quiz.priceFrom', { p: money(total) }) }),
      el('div', { 'class': 'btns quiz-actions' }, [
        el('button', {
          type: 'button',
          'class': 'btn btn-pri btn-lg',
          text: t('quiz.order'),
          on: { click: orderIt }
        }),
        el('a', {
          'class': 'btn btn-line btn-lg',
          href: link,
          text: t('quiz.studio')
        })
      ]),
      el('p', { 'class': 'hint quiz-note', text: total === null ? t('quiz.savedNote') : t('quiz.priceNote') }),
      el('button', {
        type: 'button',
        'class': 'btn btn-ghost btn-sm quiz-again',
        text: t('quiz.again'),
        on: { click: restart }
      })
    ]);
  }

  /* ==================================================================== */
  /* 5. flow                                                               */
  /* ==================================================================== */

  /* `#sn-announce` is the owner's marketing bar, NOT a live region — writing
     into it would delete the announcement. The quiz carries its own. */
  function say(text) {
    if (st.live) st.live.textContent = String(text || '');
  }

  function paint() {
    if (!st.stage) return;
    if (st.step < TOTAL) fill(st.stage, [topBar(), questionScreen()]);
    else if (st.step === TOTAL) fill(st.stage, [topBar(), waitScreen()]);
    else fill(st.stage, [st.design ? doneScreen() : failScreen()]);
    if (SN.I18n && typeof SN.I18n.apply === 'function' && st.m && st.m.dialog) {
      SN.I18n.apply(st.m.dialog);
    }
  }

  function answer(key, id) {
    if (id) st.ans[key] = id;
    if (st.step < TOTAL - 1) {
      st.step += 1;
      paint();
      return;
    }
    /* last answer in: hold one beat, then reveal */
    st.step = TOTAL;
    paint();
    clearTimer();
    st.design = build(st.ans);
    st.timer = window.setTimeout(function () {
      st.timer = 0;
      st.step = TOTAL + 1;
      paint();
      say(t('quiz.doneTitle'));
    }, reducedMotion() ? 0 : WAIT);
  }

  function back() {
    clearTimer();
    if (st.step <= 0) return;
    st.step -= 1;
    paint();
  }

  function restart() {
    clearTimer();
    st.ans = {};
    st.step = 0;
    st.design = null;
    paint();
  }

  function orderIt() {
    if (!st.design) return;
    if (SN.Checkout && typeof SN.Checkout.open === 'function') {
      try {
        SN.Checkout.open({ kind: 'custom', design: st.design });
        return;
      } catch (e) { console.warn('[SN.Quiz] checkout failed to open', e); }
    }
    if (ui() && typeof ui().toast === 'function') ui().toast(t('common.error'), 'err');
  }

  function close() {
    var m = st.m;
    clearTimer();
    st.m = null;
    st.root = null;
    st.stage = null;
    st.live = null;
    st.open = false;
    try { if (m && typeof m.close === 'function') m.close(); }
    catch (e) { /* ignore */ }
  }

  function open(opts) {
    var u = ui();
    var o = opts || {};

    if (st.open) return;
    if (!u || typeof u.modal !== 'function') {
      window.location.href = 'design.html';
      return;
    }

    clearTimer();
    st.ans = {};
    st.step = 0;
    st.design = null;
    st.live = el('span', { 'class': 'sr-only', role: 'status', 'aria-live': 'polite' });
    st.stage = el('div', { 'class': 'quiz' });
    st.root = el('div', {}, [st.live, st.stage]);
    st.open = true;

    st.m = u.modal({
      title: t('quiz.title'),
      size: 'lg',
      cls: 'quiz-modal',
      body: st.root,
      onClose: function () {
        clearTimer();
        st.open = false;
        st.m = null;
        st.root = null;
        st.stage = null;
        st.live = null;
        if (o.hash !== false) setHash(false);
      }
    });

    paint();
    if (o.hash !== false) setHash(true);
  }

  /* ==================================================================== */
  /* 6. boot                                                               */
  /* ==================================================================== */

  function hashIsQuiz() {
    var h = String(window.location.hash || '');
    return h === '#quiz' || h === '#!quiz';
  }

  function start() {
    /* a language flip must not lose her place: repaint in the new language
       with every answer still where she left it */
    if (SN.I18n && typeof SN.I18n.onChange === 'function') {
      SN.I18n.onChange(function () { if (st.open) paint(); });
    }

    window.addEventListener('hashchange', function () {
      if (st.hashLock) return;
      if (hashIsQuiz()) { if (!st.open) open(); }
      else if (st.open) close();
    }, false);

    if (hashIsQuiz()) {
      if (SN.Store && typeof SN.Store.ready === 'function') SN.Store.ready(function () { open(); });
      else open();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, false);
  } else {
    start();
  }

  /* ==================================================================== */
  /* 7. export                                                             */
  /* ==================================================================== */

  SN.Quiz = {
    open: open,
    close: close,
    isOpen: function () { return st.open; },
    build: build,
    answers: function () {
      var out = {}, k;
      for (k in st.ans) if (Object.prototype.hasOwnProperty.call(st.ans, k)) out[k] = st.ans[k];
      return out;
    },
    link: function (design) {
      var code = b64url(JSON.stringify(design || build(st.ans)));
      return code ? 'design.html#d=' + code : 'design.html';
    }
  };
})();
