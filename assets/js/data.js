/* ==========================================================================
   Shosh Nail — assets/js/data.js
   Owner: DATA. Seed content only (SN.DEFAULTS, see SPEC.md section 5).
   Loaded first; must not depend on any other SN module.
   Bilingual text is always a T-object: { ar: '...', en: '...' }.
   ========================================================================== */
(function () {
  'use strict';

  var SN = (window.SN = window.SN || {});

  /* ---------------------------------------------------------------------
     Private builders (local to this file — not part of the public API).
     They only exist so the 12 ready-made designs below stay readable:
     every call returns brand new plain objects, never a shared reference.
     --------------------------------------------------------------------- */

  /* the 10 nail keys, in SPEC order. Kept local because nail-render.js
     (which owns SN.Nail.KEYS) is loaded AFTER this file. */
  var NAIL_KEYS = [
    'rightThumb', 'rightIndex', 'rightMiddle', 'rightRing', 'rightPinky',
    'leftThumb', 'leftIndex', 'leftMiddle', 'leftRing', 'leftPinky'
  ];

  /* descriptor -> full nail state
     d = { c:hex, f:finishId, p:[kind, color, color2, scale], ch:[[charmId,x,y,s,r], ...] } */
  function mkNail(d) {
    d = d || {};
    var p = d.p || [];
    var ch = d.ch || [];
    var charms = [];
    for (var i = 0; i < ch.length; i++) {
      var a = ch[i];
      charms.push({
        id: a[0],
        x: typeof a[1] === 'number' ? a[1] : 0.5,
        y: typeof a[2] === 'number' ? a[2] : 0.35,
        s: typeof a[3] === 'number' ? a[3] : 1,
        r: typeof a[4] === 'number' ? a[4] : 0
      });
    }
    return {
      color: d.c || '#F3D9DE',
      finish: d.f || 'gloss',
      pattern: {
        kind: p[0] || 'none',
        color: p[1] || '#FFFFFF',
        color2: p[2] || '#E8B4C8',
        scale: typeof p[3] === 'number' ? p[3] : 1
      },
      charms: charms
    };
  }

  /* base descriptor + per-key overrides -> the 10-key nails map */
  function mkNails(base, over) {
    var out = {};
    for (var i = 0; i < NAIL_KEYS.length; i++) {
      var k = NAIL_KEYS[i];
      out[k] = mkNail(over && over[k] ? over[k] : base);
    }
    return out;
  }

  /* same size on both hands -> the 10-key sizes map (values = sizeGuide index) */
  function mkSizes(thumb, index, middle, ring, pinky) {
    return {
      rightThumb: thumb, rightIndex: index, rightMiddle: middle, rightRing: ring, rightPinky: pinky,
      leftThumb: thumb, leftIndex: index, leftMiddle: middle, leftRing: ring, leftPinky: pinky
    };
  }

  /* -> a complete, valid DESIGN_CONFIG (SPEC section 6) */
  function mkConfig(o) {
    return {
      v: 1,
      skin: o.skin,
      shape: o.shape,
      length: o.length,
      hand: o.hand || 'both',
      measure: o.measure || 'preset',
      sizes: o.sizes || mkSizes(2, 5, 4, 6, 8),
      nails: mkNails(o.def, o.over),
      qty: 1,
      express: false,
      giftWrap: false,
      notes: ''
    };
  }

  SN.DEFAULTS = {
    version: 1,

    /* =====================================================================
       SETTINGS
       ===================================================================== */
    settings: {
      brand: { ar: 'شوش نيل', en: 'Shosh Nail' },
      tagline: {
        ar: 'أظافر مركّبة تُفصّل على ذوقك ومقاسك',
        en: 'Press-on nails, made to your taste and your fit'
      },
      about: {
        ar: 'شوش نيل استوديو صغير متخصص في الأظافر المركّبة المصنوعة يدويًا لكل عميلة على حدة. تختارين الشكل والطول واللون والنقشة، ونجهّز الطقم بمقاسك أنتِ — ظفرًا ظفرًا — بخامة مرنة مريحة ولمعة تدوم. توصلك العلبة كاملة مع اللاصقات وعدّة التركيب، وتلبسينها في أقل من عشر دقائق بدون صالون ولا مواعيد.',
        en: 'Shosh Nail is a small studio making handcrafted press-on sets, one customer at a time. You choose the shape, length, colour and pattern, and we build the set to your own measurements — nail by nail — in a flexible, comfortable material with a lasting shine. Your box arrives complete with adhesives and a prep kit, so you can wear it in under ten minutes, no salon and no appointment.'
      },
      phone: '+966500000000',
      whatsapp: '966500000000',
      email: 'hello@shoshnail.com',
      instagram: 'shosh.nail',
      snapchat: 'shosh.nail',
      tiktok: '',
      city: { ar: 'الرياض', en: 'Riyadh' },
      address: {
        ar: 'حي الياسمين، الرياض — الاستلام من الاستوديو بموعد مسبق',
        en: 'Al Yasmin District, Riyadh — studio pickup by appointment'
      },
      hours: {
        ar: 'السبت – الخميس: 11 ص – 9 م · الجمعة: 4 م – 10 م',
        en: 'Sat – Thu: 11am – 9pm · Fri: 4pm – 10pm'
      },
      currency: { ar: 'ر.س', en: 'SAR' },
      adminPass: 'shosh1234',
      notifyEndpoint: '',
      notifyKey: '',
      notifyEmail: '',
      announce: {
        ar: 'شحن مجاني للطلبات فوق 300 ر.س · التجهيز خلال 3–5 أيام',
        en: 'Free shipping over SAR 300 · Crafted and shipped in 3–5 days'
      },
      announceOn: true,
      whatsappOrder: true,
      theme: 'light'
    },

    /* =====================================================================
       PRICING (all rates in SAR)
       ===================================================================== */
    pricing: {
      base: 120,
      perExtraColor: 3,
      perPatternNail: 8,
      perCharm: 4,
      express: 40,
      giftWrap: 15,
      shipping: 20,
      freeShippingOver: 300,
      vat: 0,
      depositPct: 0
    },

    /* =====================================================================
       HOME PAGE CONTENT
       ===================================================================== */
    home: {
      heroTitle: {
        ar: 'أظافر تشبهك… من أول لمسة',
        en: 'Nails that look like you — from the very first touch'
      },
      heroSub: {
        ar: 'اختاري الشكل والطول واللون والنقشة والزخارف، وشوفي الطقم يتكوّن قدّامك لحظة بلحظة. نجهّزه بمقاسك بالضبط ويوصلك جاهز تلبسينه في دقائق.',
        en: 'Pick the shape, length, colour, pattern and charms, and watch your set come together live. We craft it to your exact sizes and send it ready to wear in minutes.'
      },
      heroCta: { ar: 'ابدئي التصميم', en: 'Start designing' },
      heroImage: '',
      features: [
        {
          id: 'f-custom',
          icon: 'brush',
          title: { ar: 'تصميم من الصفر', en: 'Designed from scratch' },
          text: {
            ar: 'كل ظفر تتحكمين فيه لحاله: لون، لمسة، نقشة وزخارف. ما فيه قوالب جاهزة إلا إذا حبيتيها.',
            en: 'Every single nail is yours to control: colour, finish, pattern and charms. No templates unless you want one.'
          }
        },
        {
          id: 'f-fit',
          icon: 'ruler',
          title: { ar: 'مقاسك أنتِ بالضبط', en: 'Measured to your hands' },
          text: {
            ar: 'اثنا عشر مقاسًا لكل إصبع، مع طريقة قياس بالمسطرة أو عدّة قياس ترسل لك قبل الطلب.',
            en: 'Twelve sizes for every finger, with an on-screen ruler or a sizing kit we post to you before you order.'
          }
        },
        {
          id: 'f-quality',
          icon: 'gem',
          title: { ar: 'خامة تدوم وتريح', en: 'Comfort that lasts' },
          text: {
            ar: 'أكريليك مرن خفيف على الظفر الطبيعي، بحواف مصقولة ولمعة تصمد من أسبوع إلى ثلاثة أسابيع.',
            en: 'A flexible, lightweight acrylic that is kind to your natural nail, with polished edges and a shine that holds for one to three weeks.'
          }
        },
        {
          id: 'f-ship',
          icon: 'truck',
          title: { ar: 'تجهيز وتوصيل سريع', en: 'Made and delivered fast' },
          text: {
            ar: 'نجهّز طقمك خلال 3–5 أيام عمل، ويوصلك لكل مدن المملكة. وفيه خيار مستعجل إذا مناسبتك قريبة.',
            en: 'Your set is crafted in 3–5 working days and delivered anywhere in the Kingdom — with a rush option when the date is close.'
          }
        }
      ],
      steps: [
        {
          id: 'st-1',
          title: { ar: 'صمّمي أو اختاري', en: 'Design it or pick it' },
          text: {
            ar: 'ادخلي الاستوديو وصمّمي طقمك من الصفر، أو اختاري تصميمًا جاهزًا من المتجر وعدّلي عليه براحتك.',
            en: 'Open the studio and build a set from scratch, or start from a ready-made design in the shop and tweak it.'
          }
        },
        {
          id: 'st-2',
          title: { ar: 'حدّدي مقاسك', en: 'Set your sizes' },
          text: {
            ar: 'اختاري مقاس جاهز (S / M / L)، أو قيسي عرض كل ظفر بالمليمتر عن طريق المسطرة داخل الموقع.',
            en: 'Choose a preset (S / M / L) or measure each nail in millimetres with the on-screen ruler.'
          }
        },
        {
          id: 'st-3',
          title: { ar: 'أكّدي الطلب', en: 'Confirm your order' },
          text: {
            ar: 'راجعي التفاصيل والسعر، واختاري طريقة الدفع اللي تناسبك. يوصلك التأكيد على الواتساب مباشرة.',
            en: 'Review the details and the price, then pick the payment method that suits you. Confirmation lands on WhatsApp right away.'
          }
        },
        {
          id: 'st-4',
          title: { ar: 'الّبسيها في دقائق', en: 'Wear them in minutes' },
          text: {
            ar: 'العلبة توصلك بكل شي: اللاصقات، المبرد، عود الجلد ومنديل التنظيف — مع كرت شرح خطوة بخطوة.',
            en: 'The box arrives with everything: adhesive tabs, a file, a cuticle stick, a prep wipe and a step-by-step card.'
          }
        }
      ],
      testimonials: [
        {
          id: 'ts-1',
          name: 'رهف',
          text: {
            ar: 'أول مرة أطلب أظافر مركّبة وتطلع بمقاسي بالضبط. لبستها في عرس أختي وصمدت أسبوعين كاملين بدون ما يطيح ولا واحد.',
            en: 'First time press-ons have actually fit me properly. I wore them at my sister’s wedding and not one nail lifted in two whole weeks.'
          },
          stars: 5
        },
        {
          id: 'ts-2',
          name: 'جواهر',
          text: {
            ar: 'الشي اللي عجبني إني شفت التصميم قدامي قبل ما أطلب. غيّرت اللون والنقشة كم مرة لين طلع زي ما في بالي.',
            en: 'What sold me was seeing the design live before ordering. I changed the colour and pattern a few times until it matched exactly what was in my head.'
          },
          stars: 5
        },
        {
          id: 'ts-3',
          name: 'لمى',
          text: {
            ar: 'التغليف ذوق والتفاصيل نظيفة، والأهم إنها خفيفة على الظفر ما تعوّقني بالشغل. صرت أطلب كل شهر.',
            en: 'Beautiful packaging, clean detailing, and best of all they are light enough that they never get in the way at work. I order every month now.'
          },
          stars: 5
        }
      ],
      stats: [
        { id: 'stat-1', value: '+1200', label: { ar: 'طقم تم تسليمه', en: 'sets delivered' } },
        { id: 'stat-2', value: '4.9', label: { ar: 'من 5 — تقييم العميلات', en: 'out of 5 — customer rating' } },
        { id: 'stat-3', value: '3–5', label: { ar: 'أيام للتجهيز والشحن', en: 'days to craft and ship' } }
      ]
    },

    /* =====================================================================
       SKIN TONES (light -> deep). `shadow` is the darker edge of the hand.
       ===================================================================== */
    skinTones: [
      { id: 'st-porcelain', name: { ar: 'فاتح جداً', en: 'Porcelain' }, hex: '#F6DFD0', shadow: '#E2C2B0' },
      { id: 'st-fair', name: { ar: 'فاتح', en: 'Fair' }, hex: '#EFCDB6', shadow: '#D8AF95' },
      { id: 'st-wheat', name: { ar: 'حنطي', en: 'Wheatish' }, hex: '#E3B48F', shadow: '#C7946F' },
      { id: 'st-golden', name: { ar: 'قمحي', en: 'Golden Tan' }, hex: '#D19A6E', shadow: '#B27B51' },
      { id: 'st-honey', name: { ar: 'عسلي', en: 'Honey' }, hex: '#B87A4E', shadow: '#985E36' },
      { id: 'st-deep', name: { ar: 'غامق', en: 'Deep Cocoa' }, hex: '#7E4B2D', shadow: '#5F341B' }
    ],

    /* =====================================================================
       SHAPES — ids must match SN.Nail.SHAPES exactly.
       ===================================================================== */
    shapes: [
      {
        id: 'almond', price: 0,
        name: { ar: 'لوز', en: 'Almond' },
        desc: { ar: 'أطراف ناعمة مدبّبة قليلاً — تطوّل الأصابع وتناسب كل المناسبات.', en: 'Softly tapered tips that lengthen the finger and suit absolutely everything.' }
      },
      {
        id: 'coffin', price: 10,
        name: { ar: 'كوفن', en: 'Coffin' },
        desc: { ar: 'أطراف مستقيمة مع جوانب مسحوبة — الشكل الأشهر للأطقم الطويلة.', en: 'A straight tip with tapered sides — the signature look for long sets.' }
      },
      {
        id: 'stiletto', price: 12,
        name: { ar: 'ستيليتو', en: 'Stiletto' },
        desc: { ar: 'مدبّب وجريء، يلفت النظر من أول نظرة ويحتاج طولًا كافيًا.', en: 'Sharp and daring, impossible to miss — and it needs the length to work.' }
      },
      {
        id: 'square', price: 0,
        name: { ar: 'مربّع', en: 'Square' },
        desc: { ar: 'حواف مستقيمة وزوايا واضحة — كلاسيكي ومريح للأظافر القصيرة.', en: 'Flat edge, clean corners — a classic that sits beautifully on shorter lengths.' }
      },
      {
        id: 'squoval', price: 5,
        name: { ar: 'مربّع مدوّر', en: 'Squoval' },
        desc: { ar: 'مربّع بزوايا مخفّفة، ثابت وعملي ويناسب اليد اليومية.', en: 'A square with the corners softened — sturdy, practical, made for everyday hands.' }
      },
      {
        id: 'round', price: 0,
        name: { ar: 'دائري', en: 'Round' },
        desc: { ar: 'أبسط شكل وأقربه لخط الظفر الطبيعي، يعطي مظهرًا نظيفًا وهادئًا.', en: 'The simplest shape and the closest to your natural edge — quiet and clean.' }
      },
      {
        id: 'oval', price: 3,
        name: { ar: 'بيضاوي', en: 'Oval' },
        desc: { ar: 'انسيابي وأنثوي، يوهم بأصابع أطول بدون طول زائد.', en: 'Fluid and feminine, it stretches the finger without adding real length.' }
      },
      {
        id: 'lipstick', price: 15,
        name: { ar: 'ليبستيك', en: 'Lipstick' },
        desc: { ar: 'طرف مائل مقصوص بزاوية مثل قلم أحمر الشفاه — لمسة جريئة ومختلفة.', en: 'A slanted tip cut on an angle like a lipstick bullet — bold and different.' }
      }
    ],

    /* =====================================================================
       LENGTHS
       ===================================================================== */
    lengths: [
      {
        id: 'short', factor: 0.72, price: 0,
        name: { ar: 'قصير', en: 'Short' }
      },
      {
        id: 'medium', factor: 1, price: 0,
        name: { ar: 'متوسط', en: 'Medium' }
      },
      {
        id: 'long', factor: 1.28, price: 8,
        name: { ar: 'طويل', en: 'Long' }
      },
      {
        id: 'xlong', factor: 1.6, price: 15,
        name: { ar: 'طويل جداً', en: 'Extra Long' }
      }
    ],

    /* =====================================================================
       FINISHES
       ===================================================================== */
    finishes: [
      { id: 'gloss', kind: 'gloss', price: 0, name: { ar: 'لامع', en: 'Glossy' } },
      { id: 'matte', kind: 'matte', price: 4, name: { ar: 'مطفي', en: 'Matte' } },
      { id: 'jelly', kind: 'jelly', price: 6, name: { ar: 'جيلي شفاف', en: 'Jelly' } },
      { id: 'glitter', kind: 'glitter', price: 8, name: { ar: 'غليتر', en: 'Glitter' } },
      { id: 'velvet', kind: 'velvet', price: 10, name: { ar: 'فيلفيت', en: 'Velvet' } },
      { id: 'chrome', kind: 'chrome', price: 12, name: { ar: 'كروم', en: 'Chrome' } }
    ],

    /* =====================================================================
       COLORS — 45 real polish shades across 7 groups.
       ===================================================================== */
    colors: [
      /* nude */
      { id: 'c-nude-warm', hex: '#E7C3AE', group: 'nude', name: { ar: 'نيود دافئ', en: 'Warm Nude' } },
      { id: 'c-nude-rose', hex: '#E9C2C0', group: 'nude', name: { ar: 'نيود وردي', en: 'Rosy Nude' } },
      { id: 'c-latte', hex: '#D8B49A', group: 'nude', name: { ar: 'لاتيه', en: 'Latte' } },
      { id: 'c-sand', hex: '#E8D2B8', group: 'nude', name: { ar: 'رملي', en: 'Desert Sand' } },
      { id: 'c-toffee', hex: '#B98F6F', group: 'nude', name: { ar: 'توفي', en: 'Toffee' } },
      { id: 'c-caramel', hex: '#C08A5E', group: 'nude', name: { ar: 'كراميل', en: 'Caramel' } },
      { id: 'c-mocha', hex: '#9A6B52', group: 'nude', name: { ar: 'موكا', en: 'Mocha' } },
      /* pink */
      { id: 'c-ballet', hex: '#F7DDE2', group: 'pink', name: { ar: 'بالية', en: 'Ballet Slipper' } },
      { id: 'c-blush', hex: '#F4CBD2', group: 'pink', name: { ar: 'بلاش', en: 'Blush' } },
      { id: 'c-peony', hex: '#E88AA5', group: 'pink', name: { ar: 'فاوانيا', en: 'Peony' } },
      { id: 'c-bubblegum', hex: '#F58FB2', group: 'pink', name: { ar: 'علكة وردية', en: 'Bubblegum' } },
      { id: 'c-hot-pink', hex: '#EE5B94', group: 'pink', name: { ar: 'وردي صارخ', en: 'Hot Pink' } },
      { id: 'c-fuchsia', hex: '#D6417E', group: 'pink', name: { ar: 'فوشيا', en: 'Fuchsia' } },
      { id: 'c-dusty-rose', hex: '#C98A93', group: 'pink', name: { ar: 'وردي مغبّر', en: 'Dusty Rose' } },
      /* red */
      { id: 'c-coral', hex: '#F3705A', group: 'red', name: { ar: 'مرجاني', en: 'Coral' } },
      { id: 'c-scarlet', hex: '#D8362F', group: 'red', name: { ar: 'قرمزي', en: 'Scarlet' } },
      { id: 'c-cherry', hex: '#C2192F', group: 'red', name: { ar: 'كرزي', en: 'Cherry' } },
      { id: 'c-brick', hex: '#A8412F', group: 'red', name: { ar: 'طوبي', en: 'Brick' } },
      { id: 'c-ruby', hex: '#9E1B3C', group: 'red', name: { ar: 'ياقوتي', en: 'Ruby' } },
      { id: 'c-wine', hex: '#7B1E31', group: 'red', name: { ar: 'نبيذي', en: 'Wine' } },
      /* bold */
      { id: 'c-tangerine', hex: '#F2782B', group: 'bold', name: { ar: 'يوسفي', en: 'Tangerine' } },
      { id: 'c-lime', hex: '#A8CE2C', group: 'bold', name: { ar: 'ليموني', en: 'Lime' } },
      { id: 'c-turquoise', hex: '#1FB6B0', group: 'bold', name: { ar: 'تركوازي', en: 'Turquoise' } },
      { id: 'c-emerald', hex: '#157F5E', group: 'bold', name: { ar: 'زمردي', en: 'Emerald' } },
      { id: 'c-electric-blue', hex: '#2F5BEA', group: 'bold', name: { ar: 'أزرق كهربائي', en: 'Electric Blue' } },
      { id: 'c-violet', hex: '#7A3FC0', group: 'bold', name: { ar: 'بنفسجي', en: 'Violet' } },
      /* dark */
      { id: 'c-charcoal', hex: '#3A3A3E', group: 'dark', name: { ar: 'فحمي', en: 'Charcoal' } },
      { id: 'c-onyx', hex: '#17131A', group: 'dark', name: { ar: 'أسود عميق', en: 'Onyx Black' } },
      { id: 'c-espresso', hex: '#3E2A23', group: 'dark', name: { ar: 'إسبريسو', en: 'Espresso' } },
      { id: 'c-navy', hex: '#1D2A4A', group: 'dark', name: { ar: 'كحلي', en: 'Midnight Navy' } },
      { id: 'c-deep-plum', hex: '#4A1F3D', group: 'dark', name: { ar: 'برقوقي', en: 'Deep Plum' } },
      { id: 'c-forest', hex: '#1F3B2C', group: 'dark', name: { ar: 'أخضر داكن', en: 'Forest' } },
      /* pastel */
      { id: 'c-lilac', hex: '#C9B6EA', group: 'pastel', name: { ar: 'ليلكي', en: 'Lilac' } },
      { id: 'c-mint', hex: '#B4E4CE', group: 'pastel', name: { ar: 'نعناعي', en: 'Mint' } },
      { id: 'c-sky', hex: '#BBD8F2', group: 'pastel', name: { ar: 'سماوي', en: 'Baby Blue' } },
      { id: 'c-butter', hex: '#F6E6A8', group: 'pastel', name: { ar: 'زبدي', en: 'Butter' } },
      { id: 'c-peach', hex: '#FAC7AC', group: 'pastel', name: { ar: 'خوخي', en: 'Peach' } },
      { id: 'c-pistachio', hex: '#D3E3AE', group: 'pastel', name: { ar: 'فستقي', en: 'Pistachio' } },
      { id: 'c-lavender-grey', hex: '#CFC7D6', group: 'pastel', name: { ar: 'رمادي ليلكي', en: 'Lavender Grey' } },
      /* neutral */
      { id: 'c-milk', hex: '#FAF3EE', group: 'neutral', name: { ar: 'حليبي', en: 'Milk White' } },
      { id: 'c-porcelain', hex: '#F1E7E2', group: 'neutral', name: { ar: 'بورسلين', en: 'Porcelain' } },
      { id: 'c-pearl', hex: '#EDE4E9', group: 'neutral', name: { ar: 'لؤلؤي', en: 'Pearl' } },
      { id: 'c-greige', hex: '#C8BBB0', group: 'neutral', name: { ar: 'بيج رمادي', en: 'Greige' } },
      { id: 'c-stone', hex: '#A9A29B', group: 'neutral', name: { ar: 'حجري', en: 'Stone' } },
      { id: 'c-taupe', hex: '#8C7A70', group: 'neutral', name: { ar: 'بني رمادي', en: 'Taupe' } }
    ],
