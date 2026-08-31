/*! Shosh Nail — assets/js/quiz.js
 *  SN.Quiz : the style quiz (owner: HOME)
 *  Contract: SPEC.md sections 4, 6, 9, 10, 11, 12. Attaches exactly one
 *  property: window.SN.Quiz
 *
 *  Seven one-tap questions that read her TASTE rather than her spec — the
 *  occasion, the mood, the colour she keeps coming back to, the season, how
 *  much she wants her hands noticed, gold or silver, the length — and at the
 *  end a real DESIGN_CONFIG (SPEC section 6) with a name, a sentence that
 *  says why it suits her, the set read out nail by nail, and two alternates
 *  (أهدى شوي / أجرأ شوي) so she explores instead of accepting or leaving.
 *
 *  Design notes
 *  ------------
 *  · The whole thing rides inside SN.UI.modal, so focus trapping, ESC, the
 *    backdrop and the scroll lock all come from the shell rather than from a
 *    second implementation of them here.
 *  · Every option tile is drawn in the colours she has already chosen — the
 *    quiz visibly builds her set as she taps.
 *  · Nothing here is random. A tiny FNV hash of her own answers picks between
 *    equally good options (which lace, which charm, which name), so the same
 *    answers always rebuild the same set — a shared link and a retake agree —
 *    while two friends who answered differently get visibly different sets.
 *  · Every store lookup falls back: an owner who deletes half the palette in
 *    admin.html gets a plainer result, never a broken one.
 *  · The result card carries the shop name and handle, because the screenshot
 *    of it is the cheapest advertising this shop will ever get.
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
        cardTitle: 'خلّينا نطلع لك طقمك أنتِ',
        cardText: 'سبع أسئلة، كلها صور وضغطة وحدة — وفي الآخر يطلع لك طقم كامل: اسمه، لونه، شكله، وزخرفته ظفر ظفر. اطلبيه زي ما هو أو عدّلي عليه.',
        cardCta: 'ابدئي الاختبار',
        cardNote: 'أقل من دقيقة · بدون كتابة',
        cardProof: 'كل بنت تطلع لها نتيجة غير',
        cardTease: 'ابدئي من هنا — الطقم لأي مناسبة؟',

        /* the shell */
        title: 'اختبار الستايل',
        stepN: 'سؤال {n} من {total}',
        progress: 'تقدّمك في الاختبار',
        back: 'رجوع',
        close: 'إغلاق الاختبار',
        picked: 'اخترتي: {name}',

        /* Q1 — occasion */
        q1: 'الطقم لأي مناسبة؟',
        h1: 'أول شي نعرفه: وين بتلبسينه؟',
        occasion: {
          wedding: 'عرس أو خطوبة',
          daily: 'دوام ويوميات',
          party: 'سهرة وطلعة',
          holiday: 'سفر وإجازة'
        },

        /* Q2 — the mood */
        q2: 'وش الإحساس اللي يشبهك؟',
        h2: 'من هنا نختار شكل الظفر واللمعة.',
        vibe: {
          calm: 'هادئ ونظيف',
          romantic: 'ناعم ورومانسي',
          bold: 'جريء وواضح',
          glam: 'لامع وفخم'
        },

        /* Q3 — the colour she keeps coming back to */
        q3: 'وش اللون اللي دايمًا ترجعين له؟',
        h3: 'اللي تلقين نفسك مختارته كل مرة، من غير ما تفكرين.',
        palette: {
          nude: 'نيود وبيج',
          pink: 'وردي',
          red: 'أحمر ومرجاني',
          dark: 'غامق وعميق',
          pastel: 'باستيل هادئ',
          bright: 'ألوان جريئة'
        },

        /* Q4 — season */
        q4: 'الجو اللي تحبين طقمك يشبهه؟',
        h4: 'كل فصل له درجات تليق فيه — وهذي درجاتك أنتِ.',
        season: {
          spring: 'ربيع',
          summer: 'صيف',
          autumn: 'خريف',
          winter: 'شتاء'
        },
        seasonOf: {
          spring: 'الربيع',
          summer: 'الصيف',
          autumn: 'الخريف',
          winter: 'الشتاء'
        },

        /* Q5 — how much attention */
        q5: 'كم تحبين يدك تلفت النظر؟',
        h5: 'من هدوء واثق، لين يد ما أحد يعديها.',
        attention: {
          quiet: 'بهدوء',
          soft: 'لفتة خفيفة',
          clear: 'واضحة',
          max: 'ما أحد يعديها'
        },

        /* Q6 — gold or silver */
        q6: 'ذهبي وإلا فضي؟',
        h6: 'نفس السؤال اللي تسألينه لنفسك قبل ما تختارين إكسسوارك.',
        metal: {
          gold: 'ذهبي',
          silver: 'فضي',
          none: 'بدون معدن'
        },

        /* Q7 — length */
        q7: 'وش الطول المريح لك؟',
        h7: 'الطول أكثر شي يغيّر شكل يدك في الصورة.',

        /* the anticipation beat */
        waitTitle: 'نجمع لك طقمك…',
        waitText: 'نختار اللون والشكل والزخرفة على ذوقك.',

        /* the reveal */
        doneTitle: 'طقمك جاهز',
        previewAlt: 'معاينة طقم «{name}»',
        subLine: '{occ} · {season} · {len}',
        variants: {
          calmer: 'أهدى شوي',
          match: 'المختار لك',
          bolder: 'أجرأ شوي'
        },
        variantsHint: 'قلّبي بين الثلاثة — كلها مبنية على إجاباتك.',
        variantsLabel: 'ثلاث نسخ من طقمك',

        /* The name is read off the two colours the set is actually wearing —
           a lilac-grey winter set can never come back called "cool mint" —
           and the second name in each pair is picked by her other answers. */
        name: {
          nude: {
            spring: ['حرير عاري', 'نيود ناعم'],
            summer: ['رمال دافئة', 'كراميل'],
            autumn: ['لاتيه', 'موكا'],
            winter: ['بورسلين', 'رماد ناعم']
          },
          pink: {
            spring: ['باليه', 'فاوانيا'],
            summer: ['سكر وردي', 'وردي صريح'],
            autumn: ['وردة متأخرة', 'وردي مغبّر'],
            winter: ['خدود وردية', 'فوشيا']
          },
          red: {
            spring: ['مرجان', 'مرجاني فاتح'],
            summer: ['شفق', 'قرمزي'],
            autumn: ['قرفة', 'طوبي دافئ'],
            winter: ['كرزة', 'أحمر الموعد']
          },
          dark: {
            spring: ['برقوق', 'بنفسج داكن'],
            summer: ['ليل أزرق', 'كحلي'],
            autumn: ['غابة', 'أخضر داكن'],
            winter: ['بعد منتصف الليل', 'أسود ولؤلؤ']
          },
          pastel: {
            spring: ['ليلك', 'غيمة ليلكية'],
            summer: ['نعناع بارد', 'نسمة'],
            autumn: ['ضحى', 'خوخ وزبدة'],
            winter: ['غيمة', 'رمادي ناعم']
          },
          bright: {
            spring: ['بنفسج', 'بنفسجي صريح'],
            summer: ['تركواز', 'بحر'],
            autumn: ['يوسفي', 'برتقالي دافئ'],
            winter: ['شرارة زرقاء', 'أزرق كهربائي']
          }
        },

        /* why it suits her — three halves that can never describe a set she
           is not looking at, because each one is read off the built design */
        why: '{occ} — {col}، {att}.',
        whyOcc: {
          wedding: 'طقم مضبوط لعرس أو خطوبة',
          daily: 'طقم يمشي معك من الدوام لين آخر اليوم',
          party: 'طقم للسهرة واللي بعدها',
          holiday: 'طقم خفيف للسفر والصور'
        },
        whyCol: 'بدرجة {c} تليق بجو {s}',
        whyColPlain: 'بدرجة {c}',
        whyAtt: {
          quiet: 'ونظيف بدون زخرفة، هدوء واثق',
          soft: 'وظفر واحد مميّز يكفي عشان اللفتة',
          clear: 'وزخرفة على ظفرين، واضحة من غير مبالغة',
          max: 'ومزيّن على طول اليد، لأنك ما جيتي تمرّين مرور الكرام'
        },

        /* nail by nail */
        recipeTitle: 'طقمك ظفر ظفر',
        recipeNote: 'واليد الثانية بنفس الترتيب.',
        charmsN: '{n} زينة',
        plain: 'سادة',

        /* skin */
        skinTitle: 'شوفيه على بشرتك',

        /* price + actions */
        priceFrom: 'يبدأ من {p}',
        priceNote: 'السعر شامل الشحن، ويتغيّر لو زدتي أو نقّصتي في التصميم.',
        order: 'اطلبيه الآن',
        again: 'أعيدي الاختبار',
        share: 'شاركيه',
        saveImg: 'احفظي الصورة',
        shareTitle: 'طقمي من شوش نيل',
        shareText: 'طلع لي طقم «{name}» من اختبار الستايل في {brand} 💅 سوّي الاختبار وشوفي طقمك:',
        shareCopied: 'انتسخ الرابط — الصقيه في ستوريتك',
        shareFail: 'ما قدرنا ننسخ الرابط',
        savedImg: 'انحفظت الصورة',
        saveFail: 'ما قدرنا نحفظ الصورة',
        savingImg: 'نجهّز الصورة…',
        yourPicks: 'اختياراتك',

        /* short chips */
        chipOccasion: {
          wedding: 'للعرس',
          daily: 'لليوميات',
          party: 'للسهرة',
          holiday: 'للسفر'
        },
        chipAttention: {
          quiet: 'بدون زخرفة',
          soft: 'ظفر مميّز',
          clear: 'ظفرين مزيّنين',
          max: 'مزيّن بالكامل'
        },
        chipMetal: {
          gold: 'لمسة ذهب',
          silver: 'لمسة فضة',
          none: 'بدون معدن'
        },

        savedNote: 'التصميم صار جاهز — عدّلي فيه اللي تبينه قبل ما تطلبين.',
        failTitle: 'ما قدرنا نبني الطقم',
        failText: 'جرّبي مرة ثانية، أو اختاري تصميمًا جاهزًا من المتجر.',
        failCta: 'جرّبي مرة ثانية'
      }
    },

    en: {
      quiz: {
        cardEyebrow: 'Style quiz',
        cardTitle: 'Let us build the set that is yours',
        cardText: 'Seven questions, all pictures, one tap each — and at the end a full set: its name, its colour, its shape and its decoration nail by nail. Order it as it is, or open it up and change anything.',
        cardCta: 'Take the quiz',
        cardNote: 'Under a minute · nothing to type',
        cardProof: 'No two answers give the same set',
        cardTease: 'Start here — what is the set for?',

        title: 'Style quiz',
        stepN: 'Question {n} of {total}',
        progress: 'Quiz progress',
        back: 'Back',
        close: 'Close the quiz',
        picked: 'Picked: {name}',

        q1: 'What is the set for?',
        h1: 'First things first: where will you be wearing it?',
        occasion: {
          wedding: 'A wedding or engagement',
          daily: 'Work and everyday',
          party: 'A night out',
          holiday: 'Travel and holidays'
        },

        q2: 'Which mood feels like you?',
        h2: 'This picks the shape of the nail and the way it shines.',
        vibe: {
          calm: 'Clean and calm',
          romantic: 'Soft and romantic',
          bold: 'Bold and loud',
          glam: 'Glossy and glam'
        },

        q3: 'Which colour do you keep coming back to?',
        h3: 'The one you reach for every time without thinking.',
        palette: {
          nude: 'Nudes and beige',
          pink: 'Pinks',
          red: 'Reds and coral',
          dark: 'Deep and dark',
          pastel: 'Quiet pastels',
          bright: 'Bright and loud'
        },

        q4: 'Which season should it feel like?',
        h4: 'Every season has its shades — these are yours.',
        season: {
          spring: 'Spring',
          summer: 'Summer',
          autumn: 'Autumn',
          winter: 'Winter'
        },
        seasonOf: {
          spring: 'spring',
          summer: 'summer',
          autumn: 'autumn',
          winter: 'winter'
        },

        q5: 'How much attention should your hands get?',
        h5: 'From quietly confident, to a hand nobody walks past.',
        attention: {
          quiet: 'Quietly',
          soft: 'A small moment',
          clear: 'Clearly',
          max: 'Nobody walks past'
        },

        q6: 'Gold or silver?',
        h6: 'The same question you ask yourself before you pick your jewellery.',
        metal: {
          gold: 'Gold',
          silver: 'Silver',
          none: 'No metal'
        },

        q7: 'Which length is comfortable for you?',
        h7: 'Length changes the look of your hand more than anything else.',

        waitTitle: 'Building your set…',
        waitText: 'Choosing the colour, the shape and the details.',

        doneTitle: 'Your set is ready',
        previewAlt: 'Preview of the “{name}” set',
        subLine: '{occ} · {season} · {len}',
        variants: {
          calmer: 'A little softer',
          match: 'Your match',
          bolder: 'A little bolder'
        },
        variantsHint: 'Flip between the three — all of them come from your answers.',
        variantsLabel: 'Three versions of your set',

        name: {
          nude: {
            spring: ['Bare Silk', 'Soft Nude'],
            summer: ['Warm Sands', 'Caramel'],
            autumn: ['Latte', 'Mocha'],
            winter: ['Porcelain', 'Soft Ash']
          },
          pink: {
            spring: ['Ballet', 'Peony'],
            summer: ['Pink Sugar', 'Loud Pink'],
            autumn: ['Late Rose', 'Dusty Rose'],
            winter: ['Blushed', 'Fuchsia']
          },
          red: {
            spring: ['Coral', 'Light Coral'],
            summer: ['Sunset', 'Scarlet'],
            autumn: ['Cinnamon', 'Warm Brick'],
            winter: ['Cherry', 'Date Night Red']
          },
          dark: {
            spring: ['Plum', 'Dark Violet'],
            summer: ['Midnight Blue', 'Navy'],
            autumn: ['Forest', 'Deep Green'],
            winter: ['After Hours', 'Onyx and Pearl']
          },
          pastel: {
            spring: ['Lilac', 'Lilac Cloud'],
            summer: ['Cool Mint', 'Sea Breeze'],
            autumn: ['Morning Light', 'Peach and Butter'],
            winter: ['Cloud', 'Soft Grey']
          },
          bright: {
            spring: ['Violet', 'Bold Violet'],
            summer: ['Turquoise', 'Sea'],
            autumn: ['Tangerine', 'Warm Orange'],
            winter: ['Electric Blue', 'Electric']
          }
        },

        why: '{occ} — {col}, {att}.',
        whyOcc: {
          wedding: 'A set made for a wedding or an engagement',
          daily: 'A set that goes from the desk to the end of the day',
          party: 'A set for the night out and whatever follows it',
          holiday: 'A light set for travelling and photographs'
        },
        whyCol: 'in {c}, a shade that belongs to {s}',
        whyColPlain: 'in {c}',
        whyAtt: {
          quiet: 'and left bare — quiet confidence',
          soft: 'with one accent nail, which is all the moment needs',
          clear: 'with two nails dressed, clear and never too much',
          max: 'and decorated across the whole hand, because you did not come to go unnoticed'
        },

        recipeTitle: 'Your set, nail by nail',
        recipeNote: 'The other hand is exactly the same.',
        charmsN: '{n} charms',
        plain: 'Plain',

        skinTitle: 'See it on your skin',

        priceFrom: 'From {p}',
        priceNote: 'Shipping included. The total moves if you add to or simplify the design.',
        order: 'Order it now',
        again: 'Retake the quiz',
        share: 'Share it',
        saveImg: 'Save the picture',
        shareTitle: 'My Shosh Nail set',
        shareText: 'The style quiz built me the “{name}” set at {brand} 💅 Take it and see yours:',
        shareCopied: 'Link copied — paste it into your story',
        shareFail: 'We could not copy the link',
        savedImg: 'Picture saved',
        saveFail: 'We could not save the picture',
        savingImg: 'Preparing the picture…',
        yourPicks: 'Your picks',

        chipOccasion: {
          wedding: 'For a wedding',
          daily: 'Everyday',
          party: 'For a night out',
          holiday: 'For travel'
        },
        chipAttention: {
          quiet: 'Bare',
          soft: 'One accent nail',
          clear: 'Two nails dressed',
          max: 'Fully decorated'
        },
        chipMetal: {
          gold: 'A touch of gold',
          silver: 'A touch of silver',
          none: 'No metal'
        },

        savedNote: 'Your set is ready — change anything you like before you order.',
        failTitle: 'We could not build the set',
        failText: 'Try once more, or pick a ready design from the shop.',
        failCta: 'Try again'
      }
    }
  };

  if (SN.I18n && typeof SN.I18n.extend === 'function') SN.I18n.extend(DICT);

  /* ==================================================================== */
  /* 1. tiny private helpers                                               */
  /* ==================================================================== */

  var HOLD = 210;      /* how long the pick flourish is allowed to be seen  */
  var WAIT = 820;      /* the anticipation beat before the reveal           */

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

  /* a dictionary value that is an array (the name lists) */
  function tList(key) {
    var d = SN.I18n && SN.I18n.dict ? SN.I18n.dict : null;
    var lang = (SN.I18n && SN.I18n.lang) || 'ar';
    var node = d && d[lang] ? d[lang] : null;
    var parts = String(key || '').split('.'), i;
    for (i = 0; i < parts.length && node; i++) node = node[parts[i]];
    if (Array.isArray(node)) return node;
    node = DICT[lang] && DICT[lang].quiz ? DICT[lang].quiz : null;
    parts = String(key || '').replace(/^quiz\./, '').split('.');
    for (i = 0; i < parts.length && node; i++) node = node[parts[i]];
    return Array.isArray(node) ? node : [];
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

  function toast(text, kind) {
    var u = ui();
    if (u && typeof u.toast === 'function') u.toast(text, kind || 'info');
  }

  /* FNV-1a. The only source of "variety" in the whole file, and it is a pure
     function of her answers — same answers in, same set out, for ever. */
  function hash(str) {
    var h = 2166136261, i;
    str = String(str || '');
    for (i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  }

  /* deterministic pick out of an array */
  function at(arr, h) {
    if (!arr || !arr.length) return null;
    return arr[h % arr.length];
  }

  /* ==================================================================== */
  /* 2. the recipe                                                         */
  /*                                                                       */
  /*    Seven answers in, one DESIGN_CONFIG out. Every id below is looked   */
  /*    up in the store first and only falls back to a literal when the     */
  /*    owner has removed it, so the quiz keeps working on an edited        */
  /*    catalogue.                                                          */
  /* ==================================================================== */

  /* what the set is FOR: it decides the accent nail's artwork and the family
     of little things that sit on top of it */
  var OCCASIONS = [
    {
      id: 'wedding', ico: 'gem',
      accents: ['lace', 'glazed', 'french'],
      charms: ['ch-pearl', 'ch-teardrop', 'ch-blossom', 'ch-round'],
      hint: { vibe: 'romantic', palette: 'pink', season: 'spring', attention: 'clear', metal: 'gold' }
    },
    {
      id: 'daily', ico: 'clock',
      accents: ['french', 'frenchDeep', 'half'],
      charms: ['ch-stud', 'ch-caviar', 'ch-round', 'ch-pearl'],
      hint: { vibe: 'calm', palette: 'nude', season: 'spring', attention: 'soft', metal: 'gold' }
    },
    {
      id: 'party', ico: 'sparkle',
      accents: ['tipsGlitter', 'aura', 'chrome'],
      charms: ['ch-star', 'ch-star-3d', 'ch-moon', 'ch-round'],
      hint: { vibe: 'bold', palette: 'dark', season: 'winter', attention: 'clear', metal: 'silver' }
    },
    {
      id: 'holiday', ico: 'sun',
      accents: ['dots', 'ombre', 'french'],
      charms: ['ch-daisy', 'ch-blossom', 'ch-butterfly', 'ch-heart'],
      hint: { vibe: 'romantic', palette: 'pastel', season: 'summer', attention: 'clear', metal: 'gold' }
    }
  ];

  /* the mood: the silhouette, the way the surface catches light, and the
     pattern the extra nails wear */
  var VIBES = [
    { id: 'calm', shapes: ['almond', 'squoval', 'oval'], finish: 'gloss', alt: 'matte', fillers: ['french', 'half'] },
    { id: 'romantic', shapes: ['almond', 'oval', 'round'], finish: 'gloss', alt: 'velvet', fillers: ['ombre', 'glazed'] },
    { id: 'bold', shapes: ['coffin', 'square', 'squoval'], finish: 'gloss', alt: 'matte', fillers: ['diagonal', 'half'] },
    { id: 'glam', shapes: ['stiletto', 'coffin', 'almond'], finish: 'chrome', alt: 'glitter', fillers: ['chrome', 'aura'] }
  ];

  /* the colour she keeps coming back to, read through the season she picked.
     Each cell is [base, accent, third] — real catalogue ids, so every result
     is orderable; the groups and the literal hexes are the safety nets. */
  var PALETTES = [
    {
      id: 'nude', groups: ['nude', 'neutral'], fb: ['#E9C2C0', '#FAF3EE', '#C08A5E'],
      s: {
        spring: ['c-nude-rose', 'c-milk', 'c-blush'],
        summer: ['c-sand', 'c-caramel', 'c-nude-warm'],
        autumn: ['c-latte', 'c-mocha', 'c-toffee'],
        winter: ['c-porcelain', 'c-taupe', 'c-greige']
      }
    },
    {
      id: 'pink', groups: ['pink', 'pastel'], fb: ['#F4CBD2', '#E88AA5', '#EDE4E9'],
      s: {
        spring: ['c-ballet', 'c-peony', 'c-blush'],
        summer: ['c-bubblegum', 'c-hot-pink', 'c-peach'],
        autumn: ['c-dusty-rose', 'c-wine', 'c-toffee'],
        winter: ['c-blush', 'c-fuchsia', 'c-pearl']
      }
    },
    {
      id: 'red', groups: ['red', 'bold'], fb: ['#C2192F', '#EDE4E9', '#F3705A'],
      s: {
        spring: ['c-coral', 'c-milk', 'c-peach'],
        summer: ['c-scarlet', 'c-tangerine', 'c-coral'],
        autumn: ['c-brick', 'c-caramel', 'c-mocha'],
        winter: ['c-cherry', 'c-pearl', 'c-ruby']
      }
    },
    {
      id: 'dark', groups: ['dark'], fb: ['#17131A', '#EDE4E9', '#4A1F3D'],
      s: {
        spring: ['c-deep-plum', 'c-lilac', 'c-dusty-rose'],
        summer: ['c-navy', 'c-sky', 'c-pearl'],
        autumn: ['c-forest', 'c-caramel', 'c-espresso'],
        winter: ['c-onyx', 'c-pearl', 'c-charcoal']
      }
    },
    {
      id: 'pastel', groups: ['pastel', 'neutral'], fb: ['#C9B6EA', '#FAF3EE', '#B4E4CE'],
      s: {
        spring: ['c-lilac', 'c-milk', 'c-mint'],
        summer: ['c-mint', 'c-sky', 'c-butter'],
        autumn: ['c-butter', 'c-peach', 'c-pistachio'],
        winter: ['c-lavender-grey', 'c-milk', 'c-sky']
      }
    },
    {
      id: 'bright', groups: ['bold', 'pink'], fb: ['#7A3FC0', '#EDE4E9', '#1FB6B0'],
      s: {
        spring: ['c-violet', 'c-bubblegum', 'c-lilac'],
        summer: ['c-turquoise', 'c-milk', 'c-lime'],
        autumn: ['c-tangerine', 'c-espresso', 'c-butter'],
        winter: ['c-electric-blue', 'c-pearl', 'c-violet']
      }
    }
  ];

  /* the season also leaves one visible motif on the set, not just a palette */
  var SEASONS = [
    { id: 'spring', motif: 'hearts' },
    { id: 'summer', motif: 'dots' },
    { id: 'autumn', motif: 'leopard' },
    { id: 'winter', motif: 'stars' }
  ];

  /* how much she wants her hands noticed: how far the decoration spreads */
  var ATTENTION = [
    { id: 'quiet', nails: 0, charms: 0 },
    { id: 'soft', nails: 1, charms: 2 },
    { id: 'clear', nails: 2, charms: 3 },
    { id: 'max', nails: 4, charms: 4 }
  ];

  /* gold or silver — the same question as her jewellery, and it changes both
     the metal in the artwork and the little things placed on the accent nail */
  var METALS = [
    { id: 'gold', hex: '#C2A05E', charms: ['ch-foil-gold', 'ch-goldleaf', 'ch-chain', 'ch-crown'] },
    { id: 'silver', hex: '#CBD0D6', charms: ['ch-foil-silver', 'ch-chrome-smear', 'ch-stud-square', 'ch-holo-hex'] },
    /* "no metal" has to mean it: the crystals and studs step aside for pearl,
       petals and a bow, and the artwork keeps her own accent colour */
    { id: 'none', hex: '', only: true, charms: ['ch-pearl', 'ch-blossom', 'ch-heart', 'ch-bow'] }
  ];

  /* ring first — it is the accent nail on every hand in the world */
  var DRESS_ORDER = ['Ring', 'Index', 'Pinky', 'Middle'];

  /* charm placements, in the order they get added to the accent nail */
  var SPOTS = [
    { x: 0.5, y: 0.26, s: 0.78, r: 0 },
    { x: 0.36, y: 0.45, s: 0.56, r: -10 },
    { x: 0.63, y: 0.48, s: 0.5, r: 8 },
    { x: 0.5, y: 0.62, s: 0.42, r: 0 }
  ];

  var FALLBACK_ANS = {
    occasion: 'daily', vibe: 'calm', palette: 'nude',
    season: 'spring', attention: 'soft', metal: 'gold', length: 'medium'
  };

  function rowOf(table, id) {
    var i;
    for (i = 0; i < table.length; i++) if (table[i].id === id) return table[i];
    return table[0];
  }

  function indexOfId(table, id) {
    var i;
    for (i = 0; i < table.length; i++) if (table[i].id === id) return i;
    return 0;
  }

  /* a colour hex: the curated id, then anything in the right group, then a
     literal that is guaranteed to render */
  function hexOf(id, groups, fallback) {
    var colors = list('colors'), c, i, j;
    c = findIn('colors', id);
    if (c && typeof c.hex === 'string' && c.hex) return c.hex;
    for (j = 0; groups && j < groups.length; j++) {
      for (i = 0; i < colors.length; i++) {
        c = colors[i];
        if (c && c.group === groups[j] && typeof c.hex === 'string' && c.hex) return c.hex;
      }
    }
    return fallback;
  }

  /* the three working colours for one palette in one season */
  function shades(pal, seasonId) {
    var ids = (pal.s && pal.s[seasonId]) ? pal.s[seasonId] : pal.s.spring;
    return {
      base: hexOf(ids[0], pal.groups, pal.fb[0]),
      accent: hexOf(ids[1], pal.groups, pal.fb[1]),
      third: hexOf(ids[2], pal.groups, pal.fb[2])
    };
  }

  /* A silver french on a lavender-grey nail is a beautiful idea and an
     invisible one. Every accent colour is checked against the nail it will be
     drawn on and stepped aside for one that can actually be seen. */
  function lum(hex) {
    var h = String(hex || '').replace('#', '');
    var r, g, b;
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return 0.5;
    r = parseInt(h.slice(0, 2), 16) / 255;
    g = parseInt(h.slice(2, 4), 16) / 255;
    b = parseInt(h.slice(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  var MIN_STEP = 0.16;

  function visibleOn(base, prefer, alt, alt2) {
    var lb = lum(base);
    if (prefer && Math.abs(lum(prefer) - lb) >= MIN_STEP) return prefer;
    if (alt && Math.abs(lum(alt) - lb) >= MIN_STEP) return alt;
    if (alt2 && Math.abs(lum(alt2) - lb) >= MIN_STEP) return alt2;
    return lb > 0.5 ? '#4A2B39' : '#FAF3EE';
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

  function patternName(kind) {
    var arr = list('patterns'), i;
    for (i = 0; i < arr.length; i++) {
      if (arr[i] && arr[i].kind === kind) return pick(arr[i].name);
    }
    return '';
  }

  function finishName(id) {
    var f = findIn('finishes', id);
    return f ? pick(f.name) : '';
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

  /* n distinct charm ids that actually exist in the catalogue */
  function charmsFrom(pools, h, n) {
    var out = [], flat = [], i, j, c;
    for (i = 0; i < pools.length; i++) {
      for (j = 0; j < pools[i].length; j++) {
        c = findIn('charms', pools[i][j]);
        if (c && flat.indexOf(c.id) === -1) flat.push(c.id);
      }
    }
    if (!flat.length) {
      c = list('charms')[0];
      if (c) flat.push(c.id);
    }
    if (!flat.length) return [];
    for (i = 0; i < n; i++) out.push(flat[(h + i) % flat.length]);
    return out;
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

  /* A half-answered set still has to look like something worth tapping: the
     occasion she has already chosen lends its own taste to everything she has
     not reached yet, so the very first screen shows four visibly different
     sets instead of four nudes that differ only in outline. */
  function normAnswers(answers) {
    var a = {}, k, occ;
    occ = rowOf(OCCASIONS, (answers && answers.occasion) || FALLBACK_ANS.occasion);
    for (k in FALLBACK_ANS) {
      if (Object.prototype.hasOwnProperty.call(FALLBACK_ANS, k)) {
        a[k] = (answers && answers[k]) ||
          (occ.hint && occ.hint[k]) ||
          FALLBACK_ANS[k];
      }
    }
    a.skin = (answers && answers.skin) ? answers.skin : '';
    a.tag = (answers && answers.tag) ? answers.tag : '';
    return a;
  }

  function fingerOf(key) {
    var side = String(key).indexOf('left') === 0 ? 'left' : 'right';
    return String(key).slice(side.length);
  }

  /* ---- the build: seven answers in, one DESIGN_CONFIG out -------------- */

  function build(answers) {
    var a = normAnswers(answers);
    var d = blankDesign();
    var occ, vibe, pal, sea, att, met, sh, seed;
    var keys, i, key, fng, slot;
    var baseFinish, accentPattern, filler, metalHex, artColor, soloColor, charms;

    if (!d) return null;

    occ = rowOf(OCCASIONS, a.occasion);
    vibe = rowOf(VIBES, a.vibe);
    pal = rowOf(PALETTES, a.palette);
    sea = rowOf(SEASONS, a.season);
    att = rowOf(ATTENTION, a.attention);
    met = rowOf(METALS, a.metal);
    sh = shades(pal, sea.id);

    /* Several small seeds rather than one: each question then changes only what
       it is asking about. Tapping through "gold or silver" must not reshape
       the nail under her thumb — that reads as a glitch, not as a choice. */
    seed = function (parts) { return hash(parts.join('|')); };
    metalHex = met.hex || sh.accent;
    artColor = visibleOn(sh.base, metalHex, sh.accent, sh.third);
    soloColor = visibleOn(sh.base, sh.accent, sh.third, metalHex);
    baseFinish = finishOk(vibe.finish);
    accentPattern = patternOk(at(occ.accents, seed([occ.id, vibe.id, sea.id])));
    filler = patternOk(at(vibe.fillers, seed([vibe.id, pal.id])));
    charms = charmsFrom(
      met.only ? [met.charms] : [occ.charms, met.charms],
      seed([occ.id, met.id, att.id]),
      Math.max(0, att.charms)
    );

    d.skin = skinHex(a.skin || (list('skinTones')[1] || {}).id);
    d.hand = 'both';
    d.shape = shapeOk(at(vibe.shapes, seed([vibe.id, pal.id, sea.id, a.length])));
    d.length = lengthOk(a.length);
    d.qty = 1;
    d.express = false;
    d.giftWrap = false;
    d.notes = '';

    keys = (SN.Nail && SN.Nail.KEYS && SN.Nail.KEYS.length) ? SN.Nail.KEYS : [];

    /* every nail starts as a clean solid in her colour */
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      if (!d.nails[key]) continue;
      d.nails[key].color = sh.base;
      d.nails[key].finish = baseFinish;
      d.nails[key].pattern = { kind: 'none', color: sh.accent, color2: sh.base, scale: 1 };
      d.nails[key].charms = [];
    }

    /* then the decoration spreads, ring nail first, mirrored on both hands */
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      if (!d.nails[key]) continue;
      fng = fingerOf(key);
      slot = DRESS_ORDER.indexOf(fng);

      /* "quietly": nothing printed at all — the accent nail is set apart by
         its finish instead, which is the most expensive-looking thing a bare
         set can do and still costs her almost nothing */
      if (att.nails === 0) {
        if (fng === 'Ring') d.nails[key].finish = finishOk(vibe.alt);
        continue;
      }
      if (slot === -1 || slot >= att.nails) continue;

      if (fng === 'Ring') {
        d.nails[key].pattern = {
          kind: accentPattern, color: artColor, color2: sh.base, scale: 1
        };
      } else if (fng === 'Index') {
        /* one nail simply in the other colour — the most worn accent there is */
        d.nails[key].color = soloColor;
        d.nails[key].pattern = { kind: 'none', color: sh.base, color2: soloColor, scale: 1 };
      } else if (fng === 'Pinky') {
        d.nails[key].pattern = {
          kind: patternOk(sea.motif), color: artColor, color2: sh.base, scale: 0.9
        };
      } else {
        d.nails[key].pattern = {
          kind: filler, color: visibleOn(sh.base, sh.third, sh.accent, metalHex), color2: sh.base, scale: 1
        };
      }
    }

    /* charms land on the accent nail only — a charm on all ten reads
       cluttered and prices the set out of her reach for no gain */
    if (charms.length && att.nails > 0) {
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        if (!d.nails[key] || fingerOf(key) !== 'Ring') continue;
        d.nails[key].charms = charms.slice(0, SPOTS.length).map(function (id, j) {
          return { id: id, x: SPOTS[j].x, y: SPOTS[j].y, s: SPOTS[j].s, r: SPOTS[j].r };
        });
      }
    }

    return d;
  }

  /* ---- the two alternates --------------------------------------------- */

  var SOFTER = { glam: 'romantic', bold: 'romantic', romantic: 'calm', calm: 'calm' };
  var SHARPER = { calm: 'bold', romantic: 'bold', bold: 'glam', glam: 'glam' };

  function lengthIds() {
    var arr = list('lengths'), out = [], i;
    for (i = 0; i < arr.length; i++) if (arr[i] && arr[i].id) out.push(arr[i].id);
    return out.length ? out : ['short', 'medium', 'long', 'xlong'];
  }

  function shiftAnswers(answers, dir) {
    var a = normAnswers(answers);
    var ids = lengthIds();
    var li = ids.indexOf(a.length);
    var ai = indexOfId(ATTENTION, a.attention);

    if (li < 0) li = Math.min(1, ids.length - 1);
    if (dir < 0) {
      a.attention = ATTENTION[Math.max(0, ai - 1)].id;
      a.length = ids[Math.max(0, li - 1)];
      a.vibe = SOFTER[a.vibe] || a.vibe;
      a.tag = 'calmer';
    } else {
      a.attention = ATTENTION[Math.min(ATTENTION.length - 1, ai + 1)].id;
      a.length = ids[Math.min(ids.length - 1, li + 1)];
      a.vibe = SHARPER[a.vibe] || a.vibe;
      a.tag = 'bolder';
    }
    return a;
  }

  /* ---- the words that go with a built set ------------------------------ */

  /* The three alternates share her palette and her season, so they share the
     name too — what tells them apart is printed on the tab above the card. */
  function nameFor(ans) {
    var a = normAnswers(ans);
    var pal = rowOf(PALETTES, a.palette).id;
    var sea = rowOf(SEASONS, a.season).id;
    var names = tList('quiz.name.' + pal + '.' + sea);
    if (!names.length) return t('quiz.doneTitle');
    return String(at(names, hash([a.occasion, a.vibe, a.attention, a.metal, a.length].join('|'))) || names[0]);
  }

  function whyFor(ans, design) {
    var a = normAnswers(ans);
    var cName = design ? colorName(design.nails.rightThumb.color) : '';
    var sName = t('quiz.seasonOf.' + rowOf(SEASONS, a.season).id);
    var col = cName
      ? t('quiz.whyCol', { c: cName, s: sName })
      : t('quiz.whyColPlain', { c: t('quiz.palette.' + rowOf(PALETTES, a.palette).id) });
    return t('quiz.why', {
      occ: t('quiz.whyOcc.' + rowOf(OCCASIONS, a.occasion).id),
      col: col,
      att: t('quiz.whyAtt.' + rowOf(ATTENTION, a.attention).id)
    });
  }

  function subFor(ans, design) {
    var a = normAnswers(ans);
    var len = findIn('lengths', design ? design.length : a.length);
    return t('quiz.subLine', {
      occ: t('quiz.chipOccasion.' + rowOf(OCCASIONS, a.occasion).id),
      season: t('quiz.season.' + rowOf(SEASONS, a.season).id),
      len: len ? pick(len.name) : ''
    });
  }

  function chipsFor(ans, design) {
    var a = normAnswers(ans);
    var shape = design ? findIn('shapes', design.shape) : null;
    var out = [], cName = design ? colorName(design.nails.rightThumb.color) : '';

    if (shape) out.push(pick(shape.name));
    if (cName) out.push(cName);
    out.push(t('quiz.chipAttention.' + rowOf(ATTENTION, a.attention).id));
    if (a.metal !== 'none' && rowOf(ATTENTION, a.attention).charms > 0) {
      out.push(t('quiz.chipMetal.' + rowOf(METALS, a.metal).id));
    }
    return out;
  }

  /* the set read out nail by nail, in the language she is reading */
  function recipeOf(design) {
    var fingers = (SN.Nail && SN.Nail.FINGERS) ? SN.Nail.FINGERS : [];
    var out = [], i, f, key, n, bits, pn;

    for (i = 0; i < fingers.length; i++) {
      f = fingers[i];
      key = 'right' + f.key.charAt(0).toUpperCase() + f.key.slice(1);
      n = design && design.nails ? design.nails[key] : null;
      if (!n) continue;
      bits = [];
      if (colorName(n.color)) bits.push(colorName(n.color));
      if (finishName(n.finish)) bits.push(finishName(n.finish));
      pn = (n.pattern && n.pattern.kind !== 'none') ? patternName(n.pattern.kind) : '';
      if (pn) bits.push(pn);
      else if (bits.length < 2) bits.push(t('quiz.plain'));
      if (n.charms && n.charms.length) {
        bits.push(t('quiz.charmsN', { n: num(n.charms.length) }));
      }
      out.push({ key: key, label: pick(f.name), text: bits.join(' · '), nail: n });
    }
    return out;
  }

  function priceOf(design) {
    var p = null;
    if (SN.Checkout && typeof SN.Checkout.priceCustom === 'function') {
      try { p = SN.Checkout.priceCustom(design); }
      catch (e) { p = null; }
    }
    return (p && isFinite(p.total)) ? p.total : null;
  }

  /* one complete answer to "what did the quiz make for me?" */
  function makeVariant(id, ans) {
    var design = build(ans);
    if (!design) return null;
    return {
      id: id,
      ans: ans,
      design: design,
      name: nameFor(ans),
      sub: subFor(ans, design),
      why: whyFor(ans, design),
      chips: chipsFor(ans, design),
      note: t('quiz.chipAttention.' + rowOf(ATTENTION, normAnswers(ans).attention).id),
      price: priceOf(design)
    };
  }

  /* main + the two alternates, with an alternate dropped when the answers
     leave it identical to the main set (there is nothing to explore in a
     second copy of the same thing) */
  function variantsFor(ans) {
    var main = makeVariant('match', normAnswers(ans));
    var out = [], calmer, bolder, seen;
    if (!main) return [];
    seen = JSON.stringify(main.design);

    calmer = makeVariant('calmer', shiftAnswers(ans, -1));
    bolder = makeVariant('bolder', shiftAnswers(ans, 1));

    if (calmer && JSON.stringify(calmer.design) !== seen) out.push(calmer);
    out.push(main);
    if (bolder && JSON.stringify(bolder.design) !== seen) out.push(bolder);
    return out;
  }

  /* ==================================================================== */
  /* 3. the questions and their artwork                                    */
  /* ==================================================================== */

  var STEPS = [
    { key: 'occasion', q: 'quiz.q1', hint: 'quiz.h1', art: 'thumb', cols: 2 },
    { key: 'vibe', q: 'quiz.q2', hint: 'quiz.h2', art: 'thumb', cols: 2 },
    { key: 'palette', q: 'quiz.q3', hint: 'quiz.h3', art: 'strip', cols: 3 },
    { key: 'season', q: 'quiz.q4', hint: 'quiz.h4', art: 'thumb', cols: 2 },
    { key: 'attention', q: 'quiz.q5', hint: 'quiz.h5', art: 'thumb', cols: 2 },
    { key: 'metal', q: 'quiz.q6', hint: 'quiz.h6', art: 'nail', cols: 3 },
    { key: 'length', q: 'quiz.q7', hint: 'quiz.h7', art: 'len', cols: 2 }
  ];

  var TOTAL = STEPS.length;

  function tableFor(key) {
    if (key === 'occasion') return OCCASIONS;
    if (key === 'vibe') return VIBES;
    if (key === 'palette') return PALETTES;
    if (key === 'season') return SEASONS;
    if (key === 'attention') return ATTENTION;
    if (key === 'metal') return METALS;
    return null;
  }

  /* the options for a step, as {id, label} — the length step reads straight
     from the store so an owner edit shows up in the quiz too */
  function optionsFor(key) {
    var out = [], arr, i;

    if (key === 'length') {
      arr = list('lengths');
      for (i = 0; i < arr.length && i < 4; i++) {
        if (arr[i] && arr[i].id) out.push({ id: arr[i].id, label: pick(arr[i].name) });
      }
      return out;
    }
    arr = tableFor(key) || [];
    for (i = 0; i < arr.length; i++) {
      out.push({ id: arr[i].id, label: t('quiz.' + key + '.' + arr[i].id), row: arr[i] });
    }
    return out;
  }

  /* the artwork inside one tile: the set she would actually get if she tapped
     it, in the colours she has already chosen. Every branch falls back to a
     plain colour block, so a half-loaded render engine still leaves her
     something to tap that says what it means. */
  function tileArt(step, opt, answers) {
    var box = el('span', { 'class': 'quiz-art', 'aria-hidden': 'true' });
    var probe = {}, k, d, node = null, sh, pal, i;

    if (step.art === 'strip') {
      pal = rowOf(PALETTES, opt.id);
      sh = shades(pal, (answers && answers.season) || 'spring');
      box.setAttribute('class', 'quiz-art quiz-art-strip');
      [sh.base, sh.accent, sh.third].forEach(function (hex) {
        box.appendChild(el('span', { 'class': 'quiz-sw', style: { backgroundColor: hex } }));
      });
      return box;
    }

    for (k in answers) {
      if (Object.prototype.hasOwnProperty.call(answers, k)) probe[k] = answers[k];
    }
    probe[step.key] = opt.id;

    /* a tile for "how much decoration" or "gold or silver" has to be showing
       decoration at all, whatever she answered before it */
    if (step.key === 'metal' && !probe.attention) probe.attention = 'clear';
    if (step.key === 'attention' && !probe.occasion) probe.occasion = 'party';

    d = build(probe);

    if (d && SN.Nail) {
      try {
        if (step.art === 'len' && typeof SN.Nail.single === 'function') {
          node = SN.Nail.single(d.nails.rightRing, d, {
            w: 96, natural: true, length: d.length, bg: false, key: 'ql-' + opt.id
          });
        } else if (step.art === 'nail' && typeof SN.Nail.single === 'function') {
          node = SN.Nail.single(d.nails.rightRing, d, {
            w: 92, natural: true, length: d.length, bg: false, key: 'qn-' + step.key + '-' + opt.id
          });
        } else if (typeof SN.Nail.thumb === 'function') {
          node = SN.Nail.thumb(d, 128);
        }
      } catch (e) { node = null; }
    }

    if (node) box.appendChild(node);
    else {
      i = d ? d.nails.rightRing.color : '#E9C2C0';
      box.appendChild(el('span', { 'class': 'quiz-skin', style: { backgroundColor: i } }));
    }
    return box;
  }

  /* ==================================================================== */
  /* 4. state + the shell                                                  */
  /* ==================================================================== */

  var st = {
    open: false,
    step: 0,          /* 0..TOTAL-1 = a question, TOTAL = wait, TOTAL+1 = reveal */
    ans: {},
    m: null,
    root: null,
    stage: null,
    live: null,
    vars: [],
    vi: 0,
    lit: false,          /* the sparkle burst is a first-reveal thing only */
    skin: '',
    timer: 0,
    busy: false,
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

  function optionTile(step, opt, grid) {
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
      var sibs = grid ? grid.querySelectorAll('.quiz-opt') : [], j;
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
  }

  function questionScreen() {
    var step = STEPS[st.step];
    var opts = optionsFor(step.key);
    var grid = el('div', {
      'class': 'quiz-opts quiz-cols-' + step.cols + (reducedMotion() ? '' : ' sn-stagger sn-stagger-sm'),
      role: 'group',
      'aria-label': t(step.q)
    });
    var i;

    if (!opts.length) {
      /* the owner emptied this collection — skip rather than show a dead end */
      window.setTimeout(function () { answer(step.key, null); }, 0);
    }
    for (i = 0; i < opts.length; i++) grid.appendChild(optionTile(step, opts[i], grid));

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

  /* ==================================================================== */
  /* 5. the reveal                                                         */
  /* ==================================================================== */

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
        el('button', {
          type: 'button', 'class': 'btn btn-pri btn-lg', text: t('quiz.failCta'),
          on: { click: restart }
        })
      ])
    ]);
  }

  function current() {
    return st.vars.length ? st.vars[Math.min(st.vi, st.vars.length - 1)] : null;
  }

  /* the design as it will be ordered: her chosen skin tone applied on top */
  function shown(v) {
    var d;
    if (!v) return null;
    if (!st.skin) return v.design;
    try {
      d = JSON.parse(JSON.stringify(v.design));
      d.skin = skinHex(st.skin);
      return d;
    } catch (e) { return v.design; }
  }

  function previewNode(v) {
    var svg = null;
    if (SN.Nail && typeof SN.Nail.preview === 'function') {
      try {
        svg = SN.Nail.preview(shown(v), {
          w: 0, interactive: false,
          ariaLabel: t('quiz.previewAlt', { name: v.name })
        });
      } catch (e) { svg = null; }
    }
    return svg;
  }

  /* the three versions, as one row of taps */
  function variantRow() {
    var row = el('div', {
      'class': 'quiz-vars',
      role: 'group',
      'aria-label': t('quiz.variantsLabel')
    });
    var i;
    if (st.vars.length < 2) return null;
    for (i = 0; i < st.vars.length; i++) {
      row.appendChild((function (v, idx) {
        return el('button', {
          type: 'button',
          'class': 'quiz-var sn-pickable' + (idx === st.vi ? ' is-on' : ''),
          'aria-pressed': idx === st.vi ? 'true' : 'false',
          on: {
            click: function () {
              if (idx === st.vi) return;
              st.vi = idx;
              paintResult();
              say(v.name);
            }
          }
        }, [
          el('span', { 'class': 'quiz-var-t', text: t('quiz.variants.' + v.id) }),
          el('span', { 'class': 'quiz-var-n', text: v.note })
        ]);
      })(st.vars[i], i));
    }
    return row;
  }

  function brandStrip() {
    var brand = pick(cfg('settings.brand', null)) || '';
    var handle = String(cfg('settings.instagram', '') || '').replace(/^@/, '');
    var kids = [];
    if (brand) kids.push(el('span', { 'class': 'quiz-brand-n display', text: brand }));
    if (handle) {
      kids.push(el('span', { 'class': 'quiz-brand-h', dir: 'ltr', text: '@' + handle }));
    }
    if (!kids.length) return null;
    return el('p', { 'class': 'quiz-brand' }, kids);
  }

  /* the set read out nail by nail, each row carrying the real nail */
  function recipeBlock(v) {
    var rows = recipeOf(shown(v));
    var host = el('ul', { 'class': 'quiz-recipe-list' });
    var i, r, art;

    if (!rows.length) return null;
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      art = null;
      if (SN.Nail && typeof SN.Nail.single === 'function') {
        try {
          art = SN.Nail.single(r.nail, shown(v), {
            w: 40, natural: true, bg: false, key: 'qr-' + v.id + '-' + r.key
          });
        } catch (e) { art = null; }
      }
      host.appendChild(el('li', { 'class': 'quiz-recipe-row' }, [
        el('span', { 'class': 'quiz-recipe-art', 'aria-hidden': 'true' }, art ? [art] : []),
        el('span', { 'class': 'quiz-recipe-txt' }, [
          el('span', { 'class': 'quiz-recipe-n', text: r.label }),
          el('span', { 'class': 'quiz-recipe-x', text: r.text })
        ])
      ]));
    }

    return el('section', { 'class': 'quiz-recipe' }, [
      el('h4', { 'class': 'quiz-recipe-t', text: t('quiz.recipeTitle') }),
      host,
      el('p', { 'class': 'tiny muted', text: t('quiz.recipeNote') })
    ]);
  }

  function skinRow() {
    var tones = list('skinTones');
    var row, i;
    if (tones.length < 2) return null;
    row = el('div', { 'class': 'quiz-skins', role: 'group', 'aria-label': t('quiz.skinTitle') });
    for (i = 0; i < tones.length; i++) {
      row.appendChild((function (tone) {
        var on = (st.skin || (tones[1] || tones[0]).id) === tone.id;
        return el('button', {
          type: 'button',
          'class': 'quiz-skin-b sn-pickable',
          'aria-pressed': on ? 'true' : 'false',
          'aria-label': pick(tone.name),
          title: pick(tone.name),
          style: { backgroundColor: tone.hex || '#EFCDB6' },
          on: {
            click: function () {
              st.skin = tone.id;
              paintResult();
            }
          }
        });
      })(tones[i]));
    }
    return el('div', { 'class': 'quiz-skinbox' }, [
      el('p', { 'class': 'tiny muted quiz-skin-t', text: t('quiz.skinTitle') }),
      row
    ]);
  }

  /* ---- sharing --------------------------------------------------------- */

  function quizURL() {
    var base;
    try {
      base = window.location.href.split('#')[0];
      if (/\/$/.test(base)) base += 'index.html';
      return base + '#quiz';
    } catch (e) { return 'index.html#quiz'; }
  }

  function shareIt(v) {
    var brand = pick(cfg('settings.brand', null)) || '';
    var text = t('quiz.shareText', { name: v.name, brand: brand });
    var url = quizURL();
    var u = ui();

    try {
      if (navigator && typeof navigator.share === 'function') {
        navigator.share({ title: t('quiz.shareTitle'), text: text, url: url })['catch'](function () { });
        return;
      }
    } catch (e) { /* fall through to the clipboard */ }

    if (u && typeof u.copy === 'function') {
      u.copy(text + ' ' + url).then(function (ok) {
        toast(t(ok ? 'quiz.shareCopied' : 'quiz.shareFail'), ok ? 'ok' : 'err');
      }, function () { toast(t('quiz.shareFail'), 'err'); });
      return;
    }
    toast(t('quiz.shareFail'), 'err');
  }

  /* The postable picture: her set on real hands, framed, with the set's name
     and the shop's handle drawn into the image itself so a repost still
     points home. Built as one <svg> and rasterised by the render engine. */
  function shareCard(v) {
    var NS = 'http://www.w3.org/2000/svg';
    var W = 1080, H = 1350;
    var BAND = { y: 246, h: 700, w: 1000 };
    var svg = document.createElementNS(NS, 'svg');
    var inner = previewNode(v);
    var brand = pick(cfg('settings.brand', null)) || '';
    var handle = String(cfg('settings.instagram', '') || '').replace(/^@/, '');
    var vb, iw, ih, scale, dw, dh, dx, dy, defs, grad, clip, box, wrap;
    var rtl = (SN.I18n && SN.I18n.lang) === 'ar';

    function node(tag, attrs) {
      var n = document.createElementNS(NS, tag), k;
      for (k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, String(attrs[k]));
      }
      return n;
    }

    function text(str, y, size, weight, colour, ltr) {
      var n = node('text', {
        x: W / 2, y: y, 'text-anchor': 'middle',
        'font-family': 'Tajawal, Reem Kufi, system-ui, -apple-system, Segoe UI, sans-serif',
        'font-size': size, 'font-weight': weight, fill: colour,
        /* the handle is a Latin string: left to right even on the Arabic card,
           or the @ is bidi-reordered to the far end and stops being a handle */
        direction: (ltr || !rtl) ? 'ltr' : 'rtl'
      });
      n.textContent = String(str || '');
      svg.appendChild(n);
      return n;
    }

    if (!inner) return null;
    svg.setAttribute('xmlns', NS);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', String(W));
    svg.setAttribute('height', String(H));

    defs = node('defs');
    grad = node('linearGradient', { id: 'sn-qc-bg', x1: 0, y1: 0, x2: 0.35, y2: 1 });
    grad.appendChild(node('stop', { offset: 0, 'stop-color': '#FDF2F0' }));
    grad.appendChild(node('stop', { offset: 1, 'stop-color': '#F4E3E4' }));
    defs.appendChild(grad);
    svg.appendChild(defs);
    svg.appendChild(node('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#sn-qc-bg)' }));

    text(v.name, 148, 84, 700, '#8C4459');
    text(v.sub, 212, 36, 500, '#7A6069');

    /* the preview is styled for the page (width:100%), which a nested <svg>
       would obey instead of the box we are giving it here */
    vb = String(inner.getAttribute('viewBox') || '').split(/[\s,]+/);
    iw = parseFloat(vb[2]) || 1;
    ih = parseFloat(vb[3]) || 1;
    scale = Math.min(BAND.w / iw, BAND.h / ih);
    dw = iw * scale;
    dh = ih * scale;
    dx = (W - dw) / 2;
    dy = BAND.y + (BAND.h - dh) / 2;

    inner.removeAttribute('style');
    inner.removeAttribute('class');
    inner.removeAttribute('role');
    inner.removeAttribute('aria-label');
    inner.setAttribute('x', String(dx));
    inner.setAttribute('y', String(dy));
    inner.setAttribute('width', String(dw));
    inner.setAttribute('height', String(dh));

    clip = node('clipPath', { id: 'sn-qc-clip' });
    clip.appendChild(node('rect', { x: dx, y: dy, width: dw, height: dh, rx: 34 }));
    defs.appendChild(clip);
    wrap = node('g', { 'clip-path': 'url(#sn-qc-clip)' });
    wrap.appendChild(inner);
    svg.appendChild(wrap);

    box = node('rect', {
      x: dx, y: dy, width: dw, height: dh, rx: 34,
      fill: 'none', stroke: '#E2CDD1', 'stroke-width': 2
    });
    svg.appendChild(box);

    /* SVG has no line box, so the sentence is broken here — three lines at
       most, because a fourth would crowd the shop's name off the card */
    (function () {
      var words = String(v.why || '').split(/\s+/);
      var lines = [], line = '', i, y;
      for (i = 0; i < words.length; i++) {
        if (!words[i]) continue;
        if (line && (line + ' ' + words[i]).length > 46) {
          lines.push(line);
          line = words[i];
          if (lines.length === 3) break;
        } else {
          line = line ? line + ' ' + words[i] : words[i];
        }
      }
      if (line && lines.length < 3) lines.push(line);
      for (i = 0; i < lines.length; i++) {
        y = dy + dh + 62 + i * 44;
        text(lines[i], y, 32, 500, '#6B5560');
      }
    })();

    if (brand) text(brand, H - 116, 56, 700, '#8C4459');
    if (handle) text('@' + handle, H - 62, 36, 500, '#B08A3F', true);
    return svg;
  }

  function saveImage(v) {
    var card = shareCard(v);
    var u = ui();
    if (!card || !SN.Nail || typeof SN.Nail.toPNG !== 'function' || !u || typeof u.download !== 'function') {
      toast(t('quiz.saveFail'), 'err');
      return;
    }
    if (st.busy) return;
    st.busy = true;
    toast(t('quiz.savingImg'), 'info');
    SN.Nail.toPNG(card, { scale: 1, bg: '#FDF2F0' }).then(function (blob) {
      st.busy = false;
      u.download(blob, 'shosh-nail-' + v.id + '.png', 'image/png');
      toast(t('quiz.savedImg'), 'ok');
    }, function (e) {
      st.busy = false;
      console.warn('[SN.Quiz] could not export the card', e);
      toast(t('quiz.saveFail'), 'err');
    });
  }

  function orderIt(v) {
    if (!v) return;
    if (SN.Checkout && typeof SN.Checkout.open === 'function') {
      try {
        SN.Checkout.open({ kind: 'custom', design: shown(v) });
        return;
      } catch (e) { console.warn('[SN.Quiz] checkout failed to open', e); }
    }
    toast(t('common.error'), 'err');
  }

  /* ---- the whole reveal ------------------------------------------------ */

  function doneScreen(first) {
    var v = current();
    var art = el('div', { 'class': 'quiz-hero' });
    var svg = v ? previewNode(v) : null;
    var chips = [], i;

    if (!v) return failScreen();
    if (svg) art.appendChild(svg);

    for (i = 0; i < v.chips.length; i++) {
      if (v.chips[i]) chips.push(el('span', { 'class': 'tag', text: v.chips[i] }));
    }

    return el('div', { 'class': 'quiz-screen quiz-done' }, [
      (first && !reducedMotion()) ? burst() : null,

      variantRow(),
      st.vars.length > 1
        ? el('p', { 'class': 'tiny muted center', text: t('quiz.variantsHint') })
        : null,

      /* everything inside .quiz-card is what a screenshot carries */
      el('div', { 'class': 'quiz-card' + (reducedMotion() ? '' : ' sn-in') }, [
        el('p', { 'class': 'eyebrow quiz-eyebrow', text: t('quiz.doneTitle') }),
        el('h3', { 'class': 'quiz-name display', text: v.name }),
        el('p', { 'class': 'quiz-sub', text: v.sub }),
        art,
        el('p', { 'class': 'quiz-hint quiz-blurb', text: v.why }),
        chips.length
          ? el('div', { 'class': 'quiz-picks', 'aria-label': t('quiz.yourPicks') }, chips)
          : null,
        brandStrip()
      ]),

      v.price === null ? null : el('p', {
        'class': 'quiz-price price', text: t('quiz.priceFrom', { p: money(v.price) })
      }),

      el('div', { 'class': 'btns quiz-actions' }, [
        el('button', {
          type: 'button', 'class': 'btn btn-pri btn-lg', text: t('quiz.order'),
          on: { click: function () { orderIt(current()); } }
        })
      ]),
      el('p', {
        'class': 'hint quiz-note center',
        text: v.price === null ? t('quiz.savedNote') : t('quiz.priceNote')
      }),

      skinRow(),
      recipeBlock(v),

      el('div', { 'class': 'btns quiz-more' }, [
        el('button', {
          type: 'button', 'class': 'btn btn-ghost btn-sm', on: { click: function () { shareIt(current()); } }
        }, [
          el('span', { html: icon('share', 15), 'aria-hidden': 'true' }),
          el('span', { text: t('quiz.share') })
        ]),
        el('button', {
          type: 'button', 'class': 'btn btn-ghost btn-sm', on: { click: function () { saveImage(current()); } }
        }, [
          el('span', { html: icon('download', 15), 'aria-hidden': 'true' }),
          el('span', { text: t('quiz.saveImg') })
        ]),
        el('button', {
          type: 'button', 'class': 'btn btn-ghost btn-sm', text: t('quiz.again'),
          on: { click: restart }
        })
      ])
    ]);
  }

  /* ==================================================================== */
  /* 6. flow                                                               */
  /* ==================================================================== */

  /* `#sn-announce` is the owner's marketing bar, NOT a live region — writing
     into it would delete the announcement. The quiz carries its own. */
  function say(text) {
    if (st.live) st.live.textContent = String(text || '');
  }

  function scroller() {
    if (st.m && st.m.body) return st.m.body;
    if (st.stage && typeof st.stage.closest === 'function') return st.stage.closest('.modal-body');
    return null;
  }

  function paint() {
    if (!st.stage) return;
    if (st.step < TOTAL) fill(st.stage, [topBar(), questionScreen()]);
    else if (st.step === TOTAL) fill(st.stage, [topBar(), waitScreen()]);
    else {
      fill(st.stage, [doneScreen(!st.lit)]);
      st.lit = true;
    }
    if (SN.I18n && typeof SN.I18n.apply === 'function' && st.m && st.m.dialog) {
      SN.I18n.apply(st.m.dialog);
    }
  }

  /* a variant swap or a skin swap: repaint the reveal without throwing her
     back to the top of it */
  function paintResult() {
    var box = scroller();
    var top = box ? box.scrollTop : 0;
    if (!st.stage) return;
    fill(st.stage, [doneScreen(false)]);
    if (box) box.scrollTop = top;
  }

  function firstUnanswered() {
    var i;
    for (i = 0; i < TOTAL; i++) {
      if (!st.ans[STEPS[i].key]) return i;
    }
    return TOTAL;
  }

  function reveal() {
    var i;
    st.lit = false;
    st.vars = variantsFor(st.ans);
    st.vi = 0;
    for (i = 0; i < st.vars.length; i++) if (st.vars[i].id === 'match') st.vi = i;
    st.step = TOTAL + 1;
    paint();
    say(t('quiz.doneTitle'));
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
    st.timer = window.setTimeout(function () {
      st.timer = 0;
      reveal();
    }, reducedMotion() ? 0 : WAIT);
  }

  function back() {
    clearTimer();
    if (st.step <= 0) return;
    st.step -= 1;
    paint();
  }

  function restart() {
    var box;
    clearTimer();
    st.ans = {};
    st.vars = [];
    st.vi = 0;
    st.lit = false;
    st.skin = '';
    st.step = 0;
    paint();
    box = scroller();
    if (box) box.scrollTop = 0;
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
    var k;

    if (st.open) return;
    if (!u || typeof u.modal !== 'function') {
      console.warn('[SN.Quiz] SN.UI.modal is missing — the quiz cannot open.');
      return;
    }

    clearTimer();
    st.ans = {};
    st.vars = [];
    st.vi = 0;
    st.skin = '';
    st.busy = false;
    if (o.seed) {
      for (k in o.seed) {
        if (Object.prototype.hasOwnProperty.call(o.seed, k)) st.ans[k] = o.seed[k];
      }
    }
    st.step = firstUnanswered();
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

    if (st.step >= TOTAL) reveal();
    else paint();
    if (o.hash !== false) setHash(true);
  }

  /* ==================================================================== */
  /* 7. boot                                                               */
  /* ==================================================================== */

  function hashIsQuiz() {
    var h = String(window.location.hash || '');
    return h === '#quiz' || h === '#!quiz';
  }

  function start() {
    /* a language flip must not lose her place: repaint in the new language
       with every answer still where she left it */
    if (SN.I18n && typeof SN.I18n.onChange === 'function') {
      SN.I18n.onChange(function () {
        if (!st.open) return;
        if (st.step > TOTAL) { st.vars = variantsFor(st.ans); }
        paint();
      });
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
  /* 8. export                                                             */
  /* ==================================================================== */

  SN.Quiz = {
    open: open,
    close: close,
    isOpen: function () { return st.open; },
    build: build,
    variants: variantsFor,
    name: nameFor,
    total: TOTAL,

    /* the first question, rendered on the home page so the quiz starts
       before the modal ever opens */
    teaser: function () {
      var step = STEPS[0];
      var opts = optionsFor(step.key), out = [], i;
      for (i = 0; i < opts.length; i++) {
        out.push({
          id: opts[i].id,
          label: opts[i].label,
          art: tileArt(step, opts[i], {})
        });
      }
      return { key: step.key, question: t(step.q), options: out };
    },

    answers: function () {
      var out = {}, k;
      for (k in st.ans) if (Object.prototype.hasOwnProperty.call(st.ans, k)) out[k] = st.ans[k];
      return out;
    }
  };
})();
