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

    /* =====================================================================
       PATTERNS — `kind` values come from SPEC section 8.
       ===================================================================== */
    patterns: [
      { id: 'p-none', kind: 'none', price: 0, name: { ar: 'بدون نقشة', en: 'Plain' } },
      { id: 'p-french', kind: 'french', price: 6, name: { ar: 'فرنش كلاسيك', en: 'Classic French' } },
      { id: 'p-french-deep', kind: 'frenchDeep', price: 8, name: { ar: 'فرنش عريض', en: 'Deep French' } },
      { id: 'p-tips-glitter', kind: 'tipsGlitter', price: 7, name: { ar: 'أطراف غليتر', en: 'Glitter Tips' } },
      { id: 'p-ombre', kind: 'ombre', price: 8, name: { ar: 'أومبريه', en: 'Ombré' } },
      { id: 'p-ombre-v', kind: 'ombreV', price: 8, name: { ar: 'أومبريه عمودي', en: 'Vertical Ombré' } },
      { id: 'p-half', kind: 'half', price: 5, name: { ar: 'نصف ونصف', en: 'Half and Half' } },
      { id: 'p-diagonal', kind: 'diagonal', price: 5, name: { ar: 'قطري', en: 'Diagonal' } },
      { id: 'p-dots', kind: 'dots', price: 6, name: { ar: 'نقاط', en: 'Polka Dots' } },
      { id: 'p-stripes', kind: 'stripes', price: 6, name: { ar: 'خطوط', en: 'Stripes' } },
      { id: 'p-chevron', kind: 'chevron', price: 7, name: { ar: 'شيفرون', en: 'Chevron' } },
      { id: 'p-checkers', kind: 'checkers', price: 9, name: { ar: 'مربعات', en: 'Checkers' } },
      { id: 'p-hearts', kind: 'hearts', price: 8, name: { ar: 'قلوب', en: 'Hearts' } },
      { id: 'p-stars', kind: 'stars', price: 8, name: { ar: 'نجوم', en: 'Stars' } },
      { id: 'p-aura', kind: 'aura', price: 10, name: { ar: 'هالة', en: 'Aura' } },
      { id: 'p-glazed', kind: 'glazed', price: 10, name: { ar: 'جليزد دونات', en: 'Glazed Donut' } },
      { id: 'p-flames', kind: 'flames', price: 11, name: { ar: 'لهب', en: 'Flames' } },
      { id: 'p-marble', kind: 'marble', price: 12, name: { ar: 'رخامي', en: 'Marble' } },
      { id: 'p-chrome', kind: 'chrome', price: 12, name: { ar: 'كروم مرآة', en: 'Mirror Chrome' } },
      { id: 'p-leopard', kind: 'leopard', price: 12, name: { ar: 'نمر', en: 'Leopard' } },
      { id: 'p-lace', kind: 'lace', price: 14, name: { ar: 'دانتيل', en: 'Lace' } },
      { id: 'p-cat-eye', kind: 'catEye', price: 15, name: { ar: 'كات آي', en: 'Cat Eye' } }
    ],

    /* =====================================================================
       CHARMS — emoji / glyph decorations placed on a nail.
       ===================================================================== */
    charms: [
      /* stones */
      { id: 'ch-diamond', glyph: '💎', image: '', price: 6, group: 'stones', name: { ar: 'ألماسة', en: 'Diamond' } },
      { id: 'ch-crystal-blue', glyph: '🔷', image: '', price: 4, group: 'stones', name: { ar: 'كريستال أزرق', en: 'Blue Crystal' } },
      { id: 'ch-crystal-gold', glyph: '🔶', image: '', price: 4, group: 'stones', name: { ar: 'كريستال ذهبي', en: 'Gold Crystal' } },
      { id: 'ch-pearl', glyph: '⚪', image: '', price: 3, group: 'stones', name: { ar: 'لؤلؤة', en: 'Pearl Bead' } },
      { id: 'ch-rhinestone', glyph: '◆', image: '', price: 3, group: 'stones', name: { ar: 'حجر ماسي', en: 'Rhinestone' } },
      { id: 'ch-stud', glyph: '●', image: '', price: 2, group: 'stones', name: { ar: 'حبة معدن', en: 'Metal Stud' } },
      /* stars */
      { id: 'ch-star', glyph: '⭐', image: '', price: 3, group: 'stars', name: { ar: 'نجمة', en: 'Star' } },
      { id: 'ch-sparkles', glyph: '✨', image: '', price: 3, group: 'stars', name: { ar: 'لمعة', en: 'Sparkles' } },
      { id: 'ch-glow-star', glyph: '🌟', image: '', price: 4, group: 'stars', name: { ar: 'نجمة متوهجة', en: 'Glowing Star' } },
      { id: 'ch-star4', glyph: '✦', image: '', price: 2, group: 'stars', name: { ar: 'نجمة رباعية', en: 'Four-point Star' } },
      { id: 'ch-star-outline', glyph: '✩', image: '', price: 2, group: 'stars', name: { ar: 'نجمة مفرغة', en: 'Outline Star' } },
      { id: 'ch-moon', glyph: '🌙', image: '', price: 4, group: 'stars', name: { ar: 'هلال', en: 'Crescent Moon' } },
      /* flowers */
      { id: 'ch-daisy', glyph: '🌼', image: '', price: 3, group: 'flowers', name: { ar: 'أقحوانة', en: 'Daisy' } },
      { id: 'ch-blossom', glyph: '🌸', image: '', price: 3, group: 'flowers', name: { ar: 'زهرة كرز', en: 'Cherry Blossom' } },
      { id: 'ch-rose', glyph: '🌹', image: '', price: 4, group: 'flowers', name: { ar: 'وردة', en: 'Rose' } },
      { id: 'ch-hibiscus', glyph: '🌺', image: '', price: 4, group: 'flowers', name: { ar: 'كركديه', en: 'Hibiscus' } },
      { id: 'ch-tulip', glyph: '🌷', image: '', price: 4, group: 'flowers', name: { ar: 'تيوليب', en: 'Tulip' } },
      { id: 'ch-leaf', glyph: '🍃', image: '', price: 2, group: 'flowers', name: { ar: 'ورقة خضراء', en: 'Leaf' } },
      /* letters */
      { id: 'ch-letter-a', glyph: 'A', image: '', price: 5, group: 'letters', name: { ar: 'حرف A', en: 'Letter A' } },
      { id: 'ch-letter-m', glyph: 'M', image: '', price: 5, group: 'letters', name: { ar: 'حرف M', en: 'Letter M' } },
      { id: 'ch-letter-s', glyph: 'S', image: '', price: 5, group: 'letters', name: { ar: 'حرف S', en: 'Letter S' } },
      { id: 'ch-letter-sheen', glyph: 'ش', image: '', price: 5, group: 'letters', name: { ar: 'حرف ش', en: 'Letter Sheen' } },
      { id: 'ch-letter-noon', glyph: 'ن', image: '', price: 5, group: 'letters', name: { ar: 'حرف ن', en: 'Letter Noon' } },
      { id: 'ch-letter-meem', glyph: 'م', image: '', price: 4, group: 'letters', name: { ar: 'حرف م', en: 'Letter Meem' } },
      /* hearts */
      { id: 'ch-heart', glyph: '❤️', image: '', price: 3, group: 'hearts', name: { ar: 'قلب أحمر', en: 'Red Heart' } },
      { id: 'ch-heart-pink', glyph: '💗', image: '', price: 3, group: 'hearts', name: { ar: 'قلب وردي', en: 'Pink Heart' } },
      { id: 'ch-heart-white', glyph: '🤍', image: '', price: 3, group: 'hearts', name: { ar: 'قلب أبيض', en: 'White Heart' } },
      { id: 'ch-heart-sparkle', glyph: '💖', image: '', price: 4, group: 'hearts', name: { ar: 'قلب لامع', en: 'Sparkling Heart' } },
      { id: 'ch-heart-outline', glyph: '♡', image: '', price: 2, group: 'hearts', name: { ar: 'قلب مفرغ', en: 'Outline Heart' } },
      /* misc */
      { id: 'ch-bow', glyph: '🎀', image: '', price: 5, group: 'misc', name: { ar: 'فيونكة', en: 'Bow' } },
      { id: 'ch-butterfly', glyph: '🦋', image: '', price: 5, group: 'misc', name: { ar: 'فراشة', en: 'Butterfly' } },
      { id: 'ch-crown', glyph: '👑', image: '', price: 6, group: 'misc', name: { ar: 'تاج', en: 'Crown' } },
      { id: 'ch-ring', glyph: '💍', image: '', price: 6, group: 'misc', name: { ar: 'خاتم', en: 'Ring' } },
      { id: 'ch-cherry', glyph: '🍒', image: '', price: 4, group: 'misc', name: { ar: 'كرز', en: 'Cherries' } },
      { id: 'ch-strawberry', glyph: '🍓', image: '', price: 4, group: 'misc', name: { ar: 'فراولة', en: 'Strawberry' } },
      { id: 'ch-kiss', glyph: '💋', image: '', price: 4, group: 'misc', name: { ar: 'قبلة', en: 'Kiss' } },
      { id: 'ch-cloud', glyph: '☁️', image: '', price: 3, group: 'misc', name: { ar: 'غيمة', en: 'Cloud' } },
      { id: 'ch-snowflake', glyph: '❄️', image: '', price: 3, group: 'misc', name: { ar: 'ندفة ثلج', en: 'Snowflake' } }
    ],

    /* =====================================================================
       SIZE GUIDE — index 0 (widest) .. 11 (narrowest), width in millimetres.
       ===================================================================== */
    sizeGuide: [
      { id: 's0', label: '0', mm: 17.5 },
      { id: 's1', label: '1', mm: 16.5 },
      { id: 's2', label: '2', mm: 15.5 },
      { id: 's3', label: '3', mm: 14.5 },
      { id: 's4', label: '4', mm: 13.5 },
      { id: 's5', label: '5', mm: 12.5 },
      { id: 's6', label: '6', mm: 11.8 },
      { id: 's7', label: '7', mm: 11.0 },
      { id: 's8', label: '8', mm: 10.2 },
      { id: 's9', label: '9', mm: 9.4 },
      { id: 's10', label: '10', mm: 8.2 },
      { id: 's11', label: '11', mm: 7.0 }
    ],

    /* =====================================================================
       SIZE PRESETS — values are sizeGuide indexes.
       ===================================================================== */
    sizeSets: [
      { id: 'S', name: { ar: 'صغير S', en: 'Small S' }, sizes: { thumb: 3, index: 6, middle: 5, ring: 7, pinky: 9 } },
      { id: 'M', name: { ar: 'وسط M', en: 'Medium M' }, sizes: { thumb: 2, index: 5, middle: 4, ring: 6, pinky: 8 } },
      { id: 'L', name: { ar: 'كبير L', en: 'Large L' }, sizes: { thumb: 1, index: 4, middle: 3, ring: 5, pinky: 7 } }
    ],

    /* =====================================================================
       HOW TO MEASURE
       ===================================================================== */
    measureMethods: [
      {
        id: 'preset',
        name: { ar: 'مقاس جاهز', en: 'Ready preset' },
        text: {
          ar: 'أسرع طريقة: اختاري S أو M أو L وإحنا نوزّع المقاسات على أصابعك حسب المتوسط المعتمد عندنا. تناسب أغلب العميلات، وتقدرين تعدّلين أي إصبع لحاله بعدها لو حسّيتي إنه أضيق أو أوسع.',
          en: 'The quickest route: pick S, M or L and we spread our standard sizes across your fingers. It works for most hands, and you can still fine-tune any single finger afterwards.'
        },
        steps: [
          { ar: 'اختاري المقاس اللي يقارب حجم يدك: S لليد الصغيرة، M للمتوسطة، L للكبيرة.', en: 'Pick the preset closest to your hand: S for small, M for medium, L for large.' },
          { ar: 'راجعي رقم المقاس المقترح لكل إصبع في الجدول.', en: 'Check the suggested size number for each finger in the table.' },
          { ar: 'عدّلي أي إصبع لحاله إذا كنتِ متأكدة إنه يحتاج أوسع أو أضيق.', en: 'Adjust any individual finger if you know it needs to be wider or narrower.' },
          { ar: 'إذا كنتِ بين مقاسين، اختاري الأوسع — الأوسع يلتصق أفضل من الأضيق.', en: 'If you fall between two sizes, always take the wider one — it adheres far better than a tight fit.' }
        ]
      },
      {
        id: 'ruler',
        name: { ar: 'قياس بالمسطرة', en: 'Measure with a ruler' },
        text: {
          ar: 'الطريقة الأدق وما تاخذ منك أكثر من خمس دقائق. تحتاجين مسطرة بالمليمتر أو شريط قياس خياطة، وتقيسين عرض كل ظفر من الحافة لحافة عند أوسع نقطة، ثم تدخلين الرقم في الموقع وإحنا نحوّله لمقاس.',
          en: 'The most accurate method and it takes about five minutes. You need a millimetre ruler or a tailor’s tape: measure each nail across its widest point, enter the number here and we convert it to a size.'
        },
        steps: [
          { ar: 'حطّي المسطرة أفقيًا فوق الظفر عند أوسع نقطة فيه، وليس عند الجلد.', en: 'Lay the ruler flat across the nail at its widest point, not over the cuticle skin.' },
          { ar: 'اقرأي العرض بالمليمتر من الحافة اليمنى للحافة اليسرى، وقرّبيه لأقرب نصف مليمتر.', en: 'Read the width in millimetres from edge to edge and round to the nearest half millimetre.' },
          { ar: 'كرّري القياس لكل إصبع في اليدين — الأصابع غالبًا ما تكون متطابقة بين اليدين.', en: 'Repeat for every finger on both hands — the two hands are rarely identical.' },
          { ar: 'أدخلي الأرقام في محدّد المليمتر داخل الموقع، وبيظهر لك رقم المقاس تلقائيًا.', en: 'Enter the numbers into the millimetre slider on the site and the matching size appears automatically.' },
          { ar: 'لو طلع القياس بين رقمين، اختاري الأوسع دائمًا.', en: 'If a measurement lands between two numbers, always choose the wider size.' }
        ]
      },
      {
        id: 'kit',
        name: { ar: 'عدّة القياس', en: 'Sizing kit' },
        text: {
          ar: 'لو ما تبين تخاطرين بالقياس، نرسل لك عدّة قياس فيها كل المقاسات الاثني عشر تجرّبينها على أظافرك مثل الخواتم. تحتفظين بأرقامك للطلبات الجاية، وقيمة العدّة تُخصم من طلبك الأول.',
          en: 'If you would rather not guess, we post you a sizing kit with all twelve sizes to try on like rings. You keep your numbers for every future order, and the kit price is deducted from your first set.'
        },
        steps: [
          { ar: 'اطلبي عدّة القياس عبر الواتساب واذكري عنوانك.', en: 'Request the sizing kit on WhatsApp and share your address.' },
          { ar: 'جرّبي المقاسات على كل ظفر بدون لاصق، والمقاس الصحيح هو اللي يغطي الظفر من حافة لحافة بدون ما يضغط الجلد.', en: 'Try the sizes on each nail without adhesive — the right one covers the nail edge to edge without pressing on the skin.' },
          { ar: 'دوّني رقم كل إصبع في الكرت المرفق.', en: 'Write each finger’s number on the card included in the kit.' },
          { ar: 'أرسلي لنا الأرقام أو أدخليها في الاستوديو عند الطلب.', en: 'Send us the numbers or enter them in the studio when you order.' }
        ]
      }
    ],

    /* =====================================================================
       PAYMENT METHODS
       ===================================================================== */
    paymentMethods: [
      {
        id: 'pm-bank', icon: 'bank', enabled: true,
        name: { ar: 'تحويل بنكي', en: 'Bank transfer' },
        note: { ar: 'حوّلي المبلغ وأرسلي صورة الإيصال على الواتساب.', en: 'Transfer the amount and send us the receipt on WhatsApp.' },
        details: {
          ar: 'الاسم: مؤسسة شوش نيل\nالبنك: البنك الأهلي السعودي\nالآيبان: SA00 0000 0000 0000 0000 0000\n\nبعد التحويل أرسلي صورة الإيصال على الواتساب مع رقم الطلب، ويتم تأكيد الطلب خلال ساعة عمل واحدة.',
          en: 'Account name: Shosh Nail\nBank: Saudi National Bank\nIBAN: SA00 0000 0000 0000 0000 0000\n\nAfter transferring, send the receipt on WhatsApp with your order number. Orders are confirmed within one working hour.'
        }
      },
      {
        id: 'pm-mada', icon: 'card', enabled: true,
        name: { ar: 'مدى / بطاقة', en: 'Mada / Card' },
        note: { ar: 'نرسل لك رابط دفع آمن على الواتساب.', en: 'We send you a secure payment link on WhatsApp.' },
        details: {
          ar: 'بعد تأكيد الطلب نرسل لك رابط دفع آمن على الواتساب يقبل مدى وفيزا وماستركارد. الرابط صالح لمدة 24 ساعة، وبمجرد نجاح الدفع يدخل طلبك مرحلة التجهيز مباشرة.',
          en: 'Once your order is placed we send a secure payment link on WhatsApp that accepts Mada, Visa and Mastercard. The link is valid for 24 hours, and your set enters production the moment payment clears.'
        }
      },
      {
        id: 'pm-applepay', icon: 'applepay', enabled: true,
        name: { ar: 'Apple Pay', en: 'Apple Pay' },
        note: { ar: 'ادفعي بلمسة من جوالك عبر رابط الدفع.', en: 'Pay in one tap from your phone through the payment link.' },
        details: {
          ar: 'اختاري Apple Pay وسنرسل لك رابط الدفع نفسه على الواتساب. افتحيه من جوال الآيفون أو الآيباد وأكملي الدفع بلمسة واحدة، ويصلك إشعار التأكيد فورًا.',
          en: 'Choose Apple Pay and we will send you the payment link on WhatsApp. Open it on your iPhone or iPad and confirm with a single tap — your confirmation arrives instantly.'
        }
      },
      {
        id: 'pm-stcpay', icon: 'wallet', enabled: true,
        name: { ar: 'STC Pay', en: 'STC Pay' },
        note: { ar: 'تحويل مباشر على محفظة STC Pay.', en: 'Send directly to our STC Pay wallet.' },
        details: {
          ar: 'رقم محفظة STC Pay: 0500000000\nالاسم: شوش نيل\n\nبعد التحويل أرسلي لقطة الشاشة على الواتساب مع رقم الطلب حتى نأكّد استلام المبلغ.',
          en: 'STC Pay wallet number: 0500000000\nName: Shosh Nail\n\nAfter sending, share a screenshot on WhatsApp along with your order number so we can confirm receipt.'
        }
      },
      {
        id: 'pm-cod', icon: 'cod', enabled: true,
        name: { ar: 'الدفع عند الاستلام', en: 'Cash on delivery' },
        note: { ar: 'متاح داخل الرياض فقط برسوم إضافية 15 ر.س.', en: 'Available inside Riyadh only, with a 15 SAR fee.' },
        details: {
          ar: 'الدفع عند الاستلام متاح داخل مدينة الرياض فقط، وتُضاف رسوم 15 ر.س على قيمة الطلب. جهّزي المبلغ نقدًا أو عبر الشبكة مع المندوب، ويُرجى الرد على اتصال المندوب حتى لا يتأخر التسليم.',
          en: 'Cash on delivery is available inside Riyadh only and adds a 15 SAR fee to the order. Please have the amount ready in cash or by card for the courier, and answer their call so the delivery is not delayed.'
        }
      }
    ],

    /* =====================================================================
       READY-MADE DESIGNS — 12 items, each with a complete DESIGN_CONFIG.
       ===================================================================== */
    designs: [
      {
        id: 'd-bride',
        name: { ar: 'عروس', en: 'Bridal Veil' },
        desc: {
          ar: 'طقم عروس بلون عاجي هادئ ونقشة دانتيل ناعمة، مع ظفر بنصر مكسو بلمعة لؤلؤية وحبات لؤلؤ وألماس صغير. طول لوز أنيق يطلع فاخر في الصور من غير ما يعيقك في يومك.',
          en: 'An ivory bridal set veiled in fine lace, with ring nails dressed in pearl sheen, tiny pearls and a single diamond. An elegant almond length that photographs like couture without getting in your way all day.'
        },
        price: 260, orders: 310, featured: true, active: true,
        tags: ['bridal', 'luxe', 'pearl'], image: '',
        config: mkConfig({
          skin: '#EFCDB6', shape: 'almond', length: 'long', sizes: mkSizes(1, 4, 3, 5, 7),
          def: { c: '#FAF3EE', f: 'gloss', p: ['lace', '#FFFFFF', '#EDE4E9', 1] },
          over: {
            rightThumb: { c: '#FAF3EE', f: 'gloss', p: ['french', '#FFFFFF', '#F1E7E2', 1] },
            leftThumb: { c: '#FAF3EE', f: 'gloss', p: ['french', '#FFFFFF', '#F1E7E2', 1] },
            rightRing: {
              c: '#F1E7E2', f: 'chrome', p: ['glazed', '#FFFFFF', '#EDE4E9', 1.1],
              ch: [['ch-pearl', 0.5, 0.28, 0.85, 0], ['ch-diamond', 0.38, 0.48, 0.7, 0], ['ch-pearl', 0.62, 0.52, 0.6, 0]]
            },
            leftRing: {
              c: '#F1E7E2', f: 'chrome', p: ['glazed', '#FFFFFF', '#EDE4E9', 1.1],
              ch: [['ch-pearl', 0.5, 0.28, 0.85, 0], ['ch-diamond', 0.38, 0.48, 0.7, 0], ['ch-pearl', 0.62, 0.52, 0.6, 0]]
            }
          }
        })
      },
      {
        id: 'd-chrome',
        name: { ar: 'كروم مرآة', en: 'Mirror Chrome' },
        desc: {
          ar: 'انعكاس معدني صافي يغيّر لونه مع الضوء، وظفر بنصر بهالة ليلكية تكسر البرودة. طقم يلفت النظر بدون أي نقشة زائدة.',
          en: 'A clean metallic mirror that shifts with the light, softened by a lilac aura on the ring nails. All the attention, none of the fuss.'
        },
        price: 210, orders: 265, featured: true, active: true,
        tags: ['chrome', 'party', 'luxe'], image: '',
        config: mkConfig({
          skin: '#E3B48F', shape: 'coffin', length: 'long', sizes: mkSizes(1, 4, 3, 5, 7),
          def: { c: '#C8BBB0', f: 'chrome', p: ['chrome', '#FAF3EE', '#A9A29B', 1] },
          over: {
            rightRing: { c: '#CFC7D6', f: 'chrome', p: ['aura', '#FFFFFF', '#C9B6EA', 1.1] },
            leftRing: { c: '#CFC7D6', f: 'chrome', p: ['aura', '#FFFFFF', '#C9B6EA', 1.1] }
          }
        })
      },
      {
        id: 'd-french',
        name: { ar: 'فرنش كلاسيك', en: 'Classic French' },
        desc: {
          ar: 'الفرنش اللي ما يخيب: قاعدة نيود وردية شفافة وخط أبيض رفيع مرسوم بدقة على الطرف. يناسب الدوام والمناسبات وكل ما بينهما.',
          en: 'The French that never fails: a sheer rosy nude base and a precise thin white smile line. Right for the office, right for the wedding, right for everything in between.'
        },
        price: 150, orders: 420, featured: true, active: true,
        tags: ['french', 'classic', 'minimal'], image: '',
        config: mkConfig({
          skin: '#EFCDB6', shape: 'squoval', length: 'medium', sizes: mkSizes(2, 5, 4, 6, 8),
          def: { c: '#E9C2C0', f: 'gloss', p: ['french', '#FFFFFF', '#E9C2C0', 1] }
        })
      },
      {
        id: 'd-glazed',
        name: { ar: 'جليزد دونات', en: 'Glazed Donut' },
        desc: {
          ar: 'اللمعة اللؤلؤية الشهيرة فوق قاعدة بورسلين هادئة، مع طرف دافئ على الإبهام. نظيف، عصري، ويليق مع أي لون ملابس.',
          en: 'That famous pearlescent glaze over a quiet porcelain base, warmed up on the thumbs. Clean, current, and it goes with absolutely everything you own.'
        },
        price: 175, orders: 385, featured: true, active: true,
        tags: ['pearl', 'minimal', 'summer'], image: '',
        config: mkConfig({
          skin: '#E3B48F', shape: 'almond', length: 'medium', sizes: mkSizes(2, 5, 4, 6, 8),
          def: { c: '#F1E7E2', f: 'chrome', p: ['glazed', '#FFFFFF', '#EDE4E9', 1] },
          over: {
            rightThumb: { c: '#E7C3AE', f: 'chrome', p: ['glazed', '#FFFFFF', '#F4CBD2', 0.9] },
            leftThumb: { c: '#E7C3AE', f: 'chrome', p: ['glazed', '#FFFFFF', '#F4CBD2', 0.9] }
          }
        })
      },
      {
        id: 'd-ombre-rose',
        name: { ar: 'أومبريه وردي', en: 'Rose Ombré' },
        desc: {
          ar: 'تدرّج وردي يبدأ فاتح من الجذر ويغمق بهدوء عند الطرف، وظفرا البنصر بغليتر خفيف ولمعة. أنثوي وناعم بدون مبالغة.',
          en: 'A pink gradient that starts pale at the cuticle and deepens gently toward the tip, with a whisper of glitter on the ring nails. Feminine, soft, never loud.'
        },
        price: 165, orders: 350, featured: false, active: true,
        tags: ['ombre', 'pink', 'romantic'], image: '',
        config: mkConfig({
          skin: '#EFCDB6', shape: 'almond', length: 'medium', sizes: mkSizes(2, 5, 4, 6, 8),
          def: { c: '#F7DDE2', f: 'gloss', p: ['ombre', '#F4CBD2', '#E88AA5', 1] },
          over: {
            rightRing: {
              c: '#F7DDE2', f: 'glitter', p: ['ombre', '#F4CBD2', '#EE5B94', 1.2],
              ch: [['ch-sparkles', 0.5, 0.3, 0.8, 0]]
            },
            leftRing: {
              c: '#F7DDE2', f: 'glitter', p: ['ombre', '#F4CBD2', '#EE5B94', 1.2],
              ch: [['ch-sparkles', 0.5, 0.3, 0.8, 0]]
            }
          }
        })
      },
      {
        id: 'd-red',
        name: { ar: 'أحمر كلاسيك', en: 'Timeless Red' },
        desc: {
          ar: 'أحمر كرزي غني بلمعة مرآة، بشكل بيضاوي مريح، مع حجر ألماس صغير على البنصر. اللون اللي ما يخرج من الموضة أبداً.',
          en: 'A rich cherry red with a mirror gloss on a comfortable oval, finished with one small stone on each ring nail. The shade that has never once gone out of style.'
        },
        price: 145, orders: 300, featured: false, active: true,
        tags: ['red', 'classic', 'party'], image: '',
        config: mkConfig({
          skin: '#EFCDB6', shape: 'oval', length: 'medium', sizes: mkSizes(2, 5, 4, 6, 8),
          def: { c: '#C2192F', f: 'gloss' },
          over: {
            rightRing: { c: '#C2192F', f: 'gloss', ch: [['ch-diamond', 0.5, 0.3, 0.7, 0]] },
            leftRing: { c: '#C2192F', f: 'gloss', ch: [['ch-diamond', 0.5, 0.3, 0.7, 0]] }
          }
        })
      },
      {
        id: 'd-leopard',
        name: { ar: 'نمر', en: 'Leopard Luxe' },
        desc: {
          ar: 'نقشة نمر مرسومة بيد على قاعدة رملية دافئة، مع أظافر توفي سادة تريح العين بين النقشات. جريء وراقي في نفس الوقت.',
          en: 'Hand-drawn leopard spots on a warm sand base, broken up by plain toffee nails so the eye gets a rest. Bold and grown-up at the same time.'
        },
        price: 190, orders: 140, featured: false, active: true,
        tags: ['animal', 'autumn', 'nude'], image: '',
        config: mkConfig({
          skin: '#D19A6E', shape: 'coffin', length: 'long', sizes: mkSizes(1, 4, 3, 5, 7),
          def: { c: '#E8D2B8', f: 'gloss', p: ['leopard', '#3E2A23', '#C08A5E', 1] },
          over: {
            rightIndex: { c: '#B98F6F', f: 'gloss' },
            leftIndex: { c: '#B98F6F', f: 'gloss' },
            rightPinky: { c: '#B98F6F', f: 'gloss' },
            leftPinky: { c: '#B98F6F', f: 'gloss' }
          }
        })
      },
      {
        id: 'd-mocha',
        name: { ar: 'موكا', en: 'Mocha Mousse' },
        desc: {
          ar: 'بنّي قهوة دافئ بطول قصير عملي، مع فرنش مقلوب بلون اللاتيه على البنصر بلمسة مطفية. مثالي لليد اللي تشتغل طول اليوم.',
          en: 'A warm coffee brown at a practical short length, with a latte French on the ring nails in a soft matte. Made for hands that work all day.'
        },
        price: 155, orders: 205, featured: false, active: true,
        tags: ['nude', 'minimal', 'autumn'], image: '',
        config: mkConfig({
          skin: '#D19A6E', shape: 'square', length: 'short', sizes: mkSizes(3, 6, 5, 7, 9),
          def: { c: '#9A6B52', f: 'gloss' },
          over: {
            rightIndex: { c: '#B98F6F', f: 'gloss' },
            leftIndex: { c: '#B98F6F', f: 'gloss' },
            rightRing: { c: '#D8B49A', f: 'matte', p: ['french', '#9A6B52', '#D8B49A', 1.1] },
            leftRing: { c: '#D8B49A', f: 'matte', p: ['french', '#9A6B52', '#D8B49A', 1.1] }
          }
        })
      },
      {
        id: 'd-cateye',
        name: { ar: 'كات آي', en: 'Velvet Cat Eye' },
        desc: {
          ar: 'خط مغناطيسي لامع يتحرك مع الضوء فوق برقوقي عميق، والإبهام بكحلي مزرق. طقم مسائي يشد الانتباه من مسافة.',
          en: 'A magnetic ribbon of light travelling across deep plum, with midnight navy thumbs. An evening set that reads from across the room.'
        },
        price: 230, orders: 120, featured: false, active: true,
        tags: ['party', 'winter', 'luxe'], image: '',
        config: mkConfig({
          skin: '#B87A4E', shape: 'stiletto', length: 'xlong', sizes: mkSizes(1, 4, 3, 5, 7),
          def: { c: '#4A1F3D', f: 'velvet', p: ['catEye', '#C9B6EA', '#7A3FC0', 1] },
          over: {
            rightThumb: { c: '#1D2A4A', f: 'velvet', p: ['catEye', '#BBD8F2', '#2F5BEA', 1.1] },
            leftThumb: { c: '#1D2A4A', f: 'velvet', p: ['catEye', '#BBD8F2', '#2F5BEA', 1.1] }
          }
        })
      },
      {
        id: 'd-pearl',
        name: { ar: 'لؤلؤي', en: 'Pearl Drop' },
        desc: {
          ar: 'قاعدة لؤلؤية بلمسة فيلفيت ناعمة وهالة بيضاء خفيفة، مع ثلاث حبات لؤلؤ متدرجة على البنصر. هادئ وفخم بنفس الوقت.',
          en: 'A pearl base in a soft velvet finish with a faint white halo, and three graduated pearls resting on each ring nail. Quiet luxury, exactly.'
        },
        price: 200, orders: 95, featured: false, active: true,
        tags: ['pearl', 'bridal', 'minimal'], image: '',
        config: mkConfig({
          skin: '#EFCDB6', shape: 'oval', length: 'medium', sizes: mkSizes(2, 5, 4, 6, 8),
          def: { c: '#EDE4E9', f: 'velvet', p: ['aura', '#FFFFFF', '#CFC7D6', 0.9] },
          over: {
            rightRing: {
              c: '#F1E7E2', f: 'gloss',
              ch: [['ch-pearl', 0.42, 0.3, 0.8, 0], ['ch-pearl', 0.58, 0.42, 0.62, 0], ['ch-pearl', 0.48, 0.55, 0.5, 0]]
            },
            leftRing: {
              c: '#F1E7E2', f: 'gloss',
              ch: [['ch-pearl', 0.42, 0.3, 0.8, 0], ['ch-pearl', 0.58, 0.42, 0.62, 0], ['ch-pearl', 0.48, 0.55, 0.5, 0]]
            }
          }
        })
      },
      {
        id: 'd-matte-black',
        name: { ar: 'أسود مطفي', en: 'Matte Noir' },
        desc: {
          ar: 'أسود مطفي كامل بشكل كوفن، مع نجوم ذهبية صغيرة على البنصر وأظافر فحمية تكسر السواد. قوي وأنيق وما يحتاج أكثر.',
          en: 'Full matte black on a coffin shape, with small gold stars on the ring nails and charcoal accents to break the black. Strong, sharp, and it needs nothing else.'
        },
        price: 135, orders: 170, featured: false, active: true,
        tags: ['matte', 'party', 'winter'], image: '',
        config: mkConfig({
          skin: '#E3B48F', shape: 'coffin', length: 'long', sizes: mkSizes(1, 4, 3, 5, 7),
          def: { c: '#17131A', f: 'matte' },
          over: {
            rightIndex: { c: '#3A3A3E', f: 'matte' },
            leftIndex: { c: '#3A3A3E', f: 'matte' },
            rightRing: { c: '#17131A', f: 'matte', p: ['stars', '#C2A05E', '#17131A', 0.9], ch: [['ch-star4', 0.5, 0.3, 0.7, 0]] },
            leftRing: { c: '#17131A', f: 'matte', p: ['stars', '#C2A05E', '#17131A', 0.9], ch: [['ch-star4', 0.5, 0.3, 0.7, 0]] }
          }
        })
      },
      {
        id: 'd-checkers',
        name: { ar: 'مربعات باستيل', en: 'Pastel Checkers' },
        desc: {
          ar: 'كل ظفر بمربعات بلون باستيل مختلف على قاعدة حليبية: نعناعي، ليلكي، زبدي وخوخي. طول قصير مرح ومريح للاستخدام اليومي.',
          en: 'Every nail checked in a different pastel over a milky base: mint, lilac, butter and peach. A playful short length you can genuinely live in.'
        },
        price: 130, orders: 60, featured: false, active: true,
        tags: ['pastel', 'summer', 'fun'], image: '',
        config: mkConfig({
          skin: '#EFCDB6', shape: 'square', length: 'short', sizes: mkSizes(3, 6, 5, 7, 9),
          def: { c: '#FAF3EE', f: 'gloss', p: ['checkers', '#B4E4CE', '#FAF3EE', 1] },
          over: {
            rightIndex: { c: '#FAF3EE', f: 'gloss', p: ['checkers', '#C9B6EA', '#FAF3EE', 1] },
            leftIndex: { c: '#FAF3EE', f: 'gloss', p: ['checkers', '#C9B6EA', '#FAF3EE', 1] },
            rightRing: { c: '#FAF3EE', f: 'gloss', p: ['checkers', '#F6E6A8', '#FAF3EE', 1] },
            leftRing: { c: '#FAF3EE', f: 'gloss', p: ['checkers', '#F6E6A8', '#FAF3EE', 1] },
            rightPinky: { c: '#FAF3EE', f: 'gloss', p: ['checkers', '#FAC7AC', '#FAF3EE', 1] },
            leftPinky: { c: '#FAF3EE', f: 'gloss', p: ['checkers', '#FAC7AC', '#FAF3EE', 1] }
          }
        })
      }
    ],

    /* =====================================================================
       FAQ
       ===================================================================== */
    faqCats: [
      { id: 'install', name: { ar: 'التركيب', en: 'Application' } },
      { id: 'care', name: { ar: 'العناية والإزالة', en: 'Care & removal' } },
      { id: 'shipping', name: { ar: 'الشحن والتوصيل', en: 'Shipping' } },
      { id: 'payment', name: { ar: 'الدفع', en: 'Payment' } },
      { id: 'general', name: { ar: 'أسئلة عامة', en: 'General' } }
    ],

    faq: [
      /* ---------------- install ---------------- */
      {
        id: 'fq-apply-steps', cat: 'install',
        q: { ar: 'كيف أركّب الطقم خطوة بخطوة؟', en: 'How do I apply the set, step by step?' },
        a: {
          ar: 'خذي وقتك، العملية كلها ما تاخذ أكثر من عشر دقائق:\n1) اغسلي يديك بالماء والصابون وجفّفيها زين، وتأكدي إن الظفر خالي من أي كريم أو زيت.\n2) ادفعي الجلد الزائد للخلف بلطف بعود الجلد الموجود في العلبة.\n3) ابردي سطح الظفر ببرد خفيف حتى تروح اللمعة — هذي الخطوة هي سر الثبات الطويل.\n4) امسحي كل ظفر بمنديل الكحول المرفق واتركيه يجف نص دقيقة.\n5) رتّبي الأظافر العشرة قدامك من الإبهام للخنصر وجرّبيها بدون لاصق قبل لا تبدئين.\n6) الصقي اللاصقة على ظهر الظفر المركّب واضغطيها زين، أو حطي نقطة جل لاصق بحجم حبة العدس.\n7) ركّبي الظفر من عند الجلد بزاوية 45 درجة ثم نزّليه للأمام، واضغطي 15–20 ثانية بقوة ثابتة.\n8) تجنّبي الماء أول ساعة حتى يتماسك اللاصق تمامًا.',
          en: 'Take your time — the whole thing takes under ten minutes:\n1) Wash and dry your hands well, and make sure the nail is free of any cream or oil.\n2) Gently push the cuticle back with the wooden stick in the box.\n3) Lightly buff the nail surface until the shine is gone — this single step is the secret to a long hold.\n4) Wipe each nail with the alcohol pad provided and let it dry for thirty seconds.\n5) Lay all ten nails out from thumb to pinky and dry-fit them before you glue anything.\n6) Press an adhesive tab onto the back of the press-on, or add a lentil-sized drop of nail glue.\n7) Place the nail at the cuticle at a 45 degree angle, roll it down flat, and press firmly for 15–20 seconds.\n8) Keep your hands out of water for the first hour so the adhesive can fully set.'
        }
      },
      {
        id: 'fq-box-contents', cat: 'install',
        q: { ar: 'وش الموجود داخل العلبة؟', en: 'What comes inside the box?' },
        a: {
          ar: 'كل طلب يوصلك فيه: الأظافر العشرة مرتبة على كرت بأرقام الأصابع، شريط لاصقات بمقاسات متنوعة، أنبوب جل لاصق، مبرد صغير، عود جلد خشبي، ومنديل كحول للتنظيف — بالإضافة لكرت شرح مصوّر بالعربي والإنجليزي.',
          en: 'Every order arrives with: your ten nails laid out on a labelled card, a strip of adhesive tabs in assorted sizes, a tube of nail glue, a mini file, a wooden cuticle stick and an alcohol prep pad — plus an illustrated instruction card in Arabic and English.'
        }
      },
      {
        id: 'fq-tabs-or-glue', cat: 'install',
        q: { ar: 'أستخدم اللاصقات ولا الجل؟', en: 'Should I use the adhesive tabs or the glue?' },
        a: {
          ar: 'اللاصقات مناسبة للاستخدام القصير من يوم إلى ثلاثة أيام، وميزتها إنك تشيلينها بسهولة وتعيدين استخدام الطقم مرة ثانية. الجل اللاصق يعطيك ثبات من أسبوع إلى ثلاثة أسابيع لكنه يحتاج نقع بالماء الدافئ عند الإزالة. لو أول مرة تجربين، ابدئي باللاصقات.',
          en: 'Adhesive tabs are for shorter wear of one to three days; they peel off easily and let you reuse the set. Nail glue gives you one to three weeks of hold but needs a warm-water soak to remove. If this is your first time, start with the tabs.'
        }
      },
      {
        id: 'fq-how-long', cat: 'install',
        q: { ar: 'كم يثبت الطقم بعد التركيب؟', en: 'How long will the set stay on?' },
        a: {
          ar: 'باللاصقات: من يوم إلى ثلاثة أيام. بالجل اللاصق: من أسبوع إلى ثلاثة أسابيع حسب طبيعة أظافرك وطبيعة يومك. أكثر شي يقصّر العمر هو تخطي خطوة تنظيف الظفر بالكحول أو تركيبه على ظفر فيه بقايا كريم.',
          en: 'With tabs, one to three days. With glue, one to three weeks depending on your nails and how hands-on your day is. The biggest cause of early lifting is skipping the alcohol wipe or applying over leftover hand cream.'
        }
      },
      {
        id: 'fq-fix-crooked', cat: 'install',
        q: { ar: 'ركّبت ظفر مايل أو ما التصق زين — وش أسوي؟', en: 'A nail went on crooked or is not sticking — what now?' },
        a: {
          ar: 'لا تشدّينه أبدًا. لو لسه اللاصق طري، ارفعيه بلطف بعود الجلد من الطرف وأعيدي تركيبه مباشرة. لو جف، انقعي الإصبع في ماء دافئ مع قطرات صابون لمدة خمس دقائق وبيرتخي لحاله. نظّفي بقايا اللاصق عن الظفر المركّب بالكحول قبل ما تعيدين الاستخدام.',
          en: 'Never pull it off. If the adhesive is still soft, lift the edge gently with the cuticle stick and reposition straight away. If it has set, soak that finger in warm soapy water for five minutes and it will release on its own. Clean any adhesive residue off the press-on with alcohol before reusing it.'
        }
      },
      {
        id: 'fq-pick-right-nail', cat: 'install',
        q: { ar: 'كيف أتأكد إن كل ظفر على إصبعه الصح؟', en: 'How do I make sure each nail goes on the right finger?' },
        a: {
          ar: 'كل طقم يوصلك مرتب على كرت مكتوب عليه اسم الإصبع ورقم المقاس، والأظافر مرقّمة من الخلف. قبل ما تبدئين بالتركيب، حطي كل ظفر فوق إصبعه بدون لاصق: المقاس الصحيح يغطي الظفر من حافة لحافة ولا يضغط على الجلد من الجوانب.',
          en: 'Your set arrives on a card marked with the finger name and size number, and each nail is numbered on the back. Before gluing anything, place every nail on its finger dry: the correct size covers the nail edge to edge without pressing into the side skin.'
        }
      },
      /* ---------------- care & removal ---------------- */
      {
        id: 'fq-care-daily', cat: 'care',
        q: { ar: 'كيف أعتني فيها عشان تدوم أطول؟', en: 'How do I care for them so they last?' },
        a: {
          ar: 'استخدمي بطن أصابعك بدل أطرافها عند فتح العلب أو الكتابة، وحطي قفازات عند التنظيف بالمواد الكيميائية، ومرّري زيت الجلد حول الظفر يوميًا. وإذا حسّيتي بحافة بدت ترتفع، ثبّتيها بنقطة جل صغيرة فورًا قبل ما تدخل الماء تحتها.',
          en: 'Use the pads of your fingers rather than the tips when opening things or typing, wear gloves for chemical cleaning, and massage cuticle oil around the nail daily. If you feel an edge starting to lift, seal it with a tiny dot of glue right away before water gets underneath.'
        }
      },
      {
        id: 'fq-water', cat: 'care',
        q: { ar: 'أقدر أغسل الصحون أو أسبح وأنا لابستها؟', en: 'Can I wash dishes or swim while wearing them?' },
        a: {
          ar: 'نعم، بس بحذر. الماء العادي ما يضر بعد أول ساعة، لكن الماء الحار جدًا والنقع الطويل يرخّي اللاصق. للغسيل والتنظيف الأفضل تلبسين قفازات، وبعد السباحة جفّفي يديك زين وتفقّدي الحواف.',
          en: 'Yes, but carefully. Normal water is fine after the first hour, though very hot water and long soaks will soften the adhesive. Wear gloves for dishes and cleaning, and after swimming dry your hands well and check the edges.'
        }
      },
      {
        id: 'fq-removal', cat: 'care',
        q: { ar: 'كيف أزيلها بدون ما أأذي أظافري؟', en: 'How do I remove them without damaging my nails?' },
        a: {
          ar: 'انقعي يديك في وعاء ماء دافئ مع قطرات صابون أو قليل من الزيت لمدة 10–15 دقيقة. بعدها استخدمي عود الجلد الخشبي وارفعي الظفر من الطرف بحركة هادئة متدرجة. إذا حسّيتي بأي شد أو مقاومة، ارجعي انقعي أكثر. الشد بالقوة هو السبب الوحيد تقريبًا لتقشّر الظفر الطبيعي.',
          en: 'Soak your hands in warm water with a few drops of soap or oil for 10 to 15 minutes. Then use the wooden stick to ease each nail up from the free edge in slow, gradual movements. If you feel any pulling, soak longer. Forcing them off is almost the only way people damage their natural nail.'
        }
      },
      {
        id: 'fq-natural-nails', cat: 'care',
        q: { ar: 'هل تضر أظافري الطبيعية؟', en: 'Will they damage my natural nails?' },
        a: {
          ar: 'لا، إذا رُكّبت وأُزيلت صح. نحن ما نستخدم أي مادة تحتاج حفر أو مبرد كهربائي، والبرد الخفيف اللي نطلبه سطحي جدًا. ننصح بترك أظافرك ترتاح يومين بين كل طقم وطقم، ومع مرطب جلد يومي بتلاحظين إن حالتها أفضل من قبل.',
          en: 'No, provided they are applied and removed properly. Nothing in our kit requires drilling or an e-file, and the light buffing we ask for is very superficial. We do recommend giving your nails a two-day break between sets, and with daily cuticle oil most customers find their nails end up in better shape than before.'
        }
      },
      {
        id: 'fq-reuse', cat: 'care',
        q: { ar: 'أقدر أعيد استخدام نفس الطقم؟', en: 'Can I reuse the same set?' },
        a: {
          ar: 'أكيد. الطقم الواحد يتحمّل من خمس إلى عشر مرات إذا أزلتيه بالنقع. بعد كل استخدام نظّفي بقايا اللاصق من داخل الظفر بعود خشبي وقليل من الكحول، وخليه يجف قبل ما ترجعينه للعلبة. اللاصقات وحدها هي اللي تُستهلك، وتقدرين تطلبين شريط بديل منها.',
          en: 'Absolutely. One set will take five to ten wears if you always soak it off. After each wear, scrape the adhesive residue from the inside with a wooden stick and a little alcohol, then let it dry before returning it to the box. Only the adhesive tabs get used up, and you can order replacement strips from us.'
        }
      },
      {
        id: 'fq-storage', cat: 'care',
        q: { ar: 'كيف أخزّنها بين الاستخدامات؟', en: 'How should I store them between wears?' },
        a: {
          ar: 'رجّعيها لنفس العلبة على الكرت المرقّم عشان ما تختلط المقاسات، وخليها بعيدة عن الشمس المباشرة والحرارة العالية مثل داخل السيارة، لأن الحرارة تقدر تلوي الظفر وتغيّر انحناءه.',
          en: 'Put them back on the numbered card in their box so the sizes do not get mixed up, and keep them out of direct sun and high heat such as a parked car — heat can warp the curve of the nail.'
        }
      },
      {
        id: 'fq-file-shorter', cat: 'care',
        q: { ar: 'أقدر أقص الطول أو أغيّر الشكل؟', en: 'Can I file them shorter or reshape them?' },
        a: {
          ar: 'تقدرين تبردين الطول وتخفّفينه بالمبرد المرفق، والأفضل تسوّينها قبل التركيب وبحركة باتجاه واحد. تغيير الشكل بالكامل (مثلاً من كوفن إلى لوز) ممكن لكنه يقصّر الظفر كثير، فلو ما أنتِ متأكدة من الشكل اطلبيه أقصر من البداية.',
          en: 'You can file the length down with the file provided — do it before applying and always in one direction. Changing the shape completely, say coffin to almond, is possible but costs a lot of length, so if you are unsure it is better to order shorter from the start.'
        }
      },
      {
        id: 'fq-lost-one', cat: 'care',
        q: { ar: 'طاح ظفر واحد بس — أقدر أستبدله؟', en: 'I lost a single nail — can I replace it?' },
        a: {
          ar: 'نعم. أرسلي لنا رقم طلبك واسم الإصبع والمقاس على الواتساب ونجهّز لك ظفر بديل بنفس التصميم. الظفر الواحد البديل بـ 25 ر.س شامل الشحن العادي.',
          en: 'Yes. Send us your order number, the finger and the size on WhatsApp and we will make a replacement in the same design. A single replacement nail is 25 SAR including standard shipping.'
        }
      },
      /* ---------------- shipping ---------------- */
      {
        id: 'fq-lead-time', cat: 'shipping',
        q: { ar: 'كم يستغرق تجهيز الطلب وتوصيله؟', en: 'How long does the order take?' },
        a: {
          ar: 'التجهيز اليدوي ياخذ من 3 إلى 5 أيام عمل حسب تفاصيل التصميم، والشحن بعدها من يوم إلى ثلاثة أيام داخل المملكة. لو مناسبتك قريبة اختاري «التجهيز المستعجل» عند الطلب وننجزه خلال 48 ساعة.',
          en: 'Handcrafting takes 3 to 5 working days depending on the detail in your design, and delivery inside the Kingdom is another 1 to 3 days. If your date is close, add the rush option at checkout and we finish within 48 hours.'
        }
      },
      {
        id: 'fq-shipping-areas', cat: 'shipping',
        q: { ar: 'وين توصلون وكم رسوم الشحن؟', en: 'Where do you deliver and how much is shipping?' },
        a: {
          ar: 'نوصّل لجميع مدن ومحافظات المملكة عن طريق شركات الشحن المحلية برسوم ثابتة 20 ر.س، والشحن مجاني للطلبات فوق 300 ر.س. داخل الرياض يتوفر أيضًا استلام من الاستوديو بموعد مسبق بدون رسوم.',
          en: 'We deliver to every city in the Kingdom through local couriers for a flat 20 SAR, free on orders over 300 SAR. Inside Riyadh you can also collect from the studio by appointment at no charge.'
        }
      },
      {
        id: 'fq-tracking', cat: 'shipping',
        q: { ar: 'كيف أتابع شحنتي؟', en: 'How do I track my parcel?' },
        a: {
          ar: 'أول ما نسلّم الطلب لشركة الشحن نرسل لك رقم التتبع على نفس رقم الواتساب اللي طلبتي فيه. إذا مر أكثر من أربعة أيام على رقم التتبع بدون تحديث، راسلينا ونتابع الموضوع نيابة عنك.',
          en: 'The moment we hand the parcel over we send the tracking number to the same WhatsApp number you ordered from. If four days pass with no update on the tracking, message us and we will chase the courier for you.'
        }
      },
      /* ---------------- payment ---------------- */
      {
        id: 'fq-pay-methods', cat: 'payment',
        q: { ar: 'وش طرق الدفع المتاحة؟', en: 'What payment methods do you accept?' },
        a: {
          ar: 'نستقبل التحويل البنكي، ومدى والبطاقات الائتمانية عبر رابط دفع آمن، و Apple Pay، و STC Pay، بالإضافة للدفع عند الاستلام داخل الرياض برسوم إضافية 15 ر.س.',
          en: 'We accept bank transfer, Mada and credit cards through a secure payment link, Apple Pay, STC Pay, and cash on delivery inside Riyadh for an extra 15 SAR.'
        }
      },
      {
        id: 'fq-confirm-order', cat: 'payment',
        q: { ar: 'متى يتأكد طلبي بعد الدفع؟', en: 'When is my order confirmed after paying?' },
        a: {
          ar: 'بعد ما ترسلين إيصال التحويل أو يتم الدفع عبر الرابط، نأكّد الطلب خلال ساعة عمل واحدة ونبدأ التجهيز في نفس اليوم. يوصلك رقم الطلب على الواتساب ويكون مرجعك في أي استفسار لاحق.',
          en: 'Once you send the transfer receipt or the payment link clears, we confirm within one working hour and start crafting the same day. Your order number arrives on WhatsApp and is your reference for anything after that.'
        }
      },
      {
        id: 'fq-price-includes', cat: 'payment',
        q: { ar: 'هل السعر شامل كل شي؟', en: 'Is the price all-inclusive?' },
        a: {
          ar: 'السعر الظاهر لك في المراجعة شامل الطقم كامل بعشرة أظافر مع عدّة التركيب والتغليف. الشحن يظهر كسطر منفصل ويصير مجاني فوق 300 ر.س، والخيارات الإضافية مثل التجهيز المستعجل أو التغليف كهدية تظهر كسطور واضحة قبل التأكيد — ما فيه أي رسوم مخفية.',
          en: 'The price you see at review covers the full ten-nail set with the application kit and packaging. Shipping appears as its own line and is free over 300 SAR, and extras like rush crafting or gift wrapping are listed separately before you confirm — there are no hidden fees.'
        }
      },
      /* ---------------- general ---------------- */
      {
        id: 'fq-know-size', cat: 'general',
        q: { ar: 'كيف أعرف مقاس أظافري؟', en: 'How do I find my nail size?' },
        a: {
          ar: 'عندك ثلاث طرق داخل الاستوديو: مقاس جاهز S أو M أو L لو تبين تختصرين، أو قياس بالمسطرة حيث تقيسين عرض كل ظفر بالمليمتر عند أوسع نقطة وندخل الرقم لك، أو عدّة القياس اللي نرسلها لك بالبريد وتجرّبينها مثل الخواتم. وإذا طلع قياسك بين رقمين، اختاري الأوسع دائمًا.',
          en: 'There are three routes inside the studio: a ready preset (S, M or L) if you want it quick; the ruler method, where you measure each nail in millimetres at its widest point; or a sizing kit we post out that you try on like rings. And whenever you land between two numbers, always take the wider one.'
        }
      },
      {
        id: 'fq-sizing-kit', cat: 'general',
        q: { ar: 'أقدر أطلب عدّة القياس لحالها؟', en: 'Can I order the sizing kit on its own?' },
        a: {
          ar: 'نعم، عدّة القياس متاحة لحالها بـ 35 ر.س شامل الشحن، وقيمتها تُخصم كاملة من أول طلب طقم لك. راسلينا على الواتساب واذكري عنوانك ونرسلها خلال يومين.',
          en: 'Yes — the sizing kit is 35 SAR including shipping, and the full amount is deducted from your first set. Message us on WhatsApp with your address and it ships within two days.'
        }
      },
      {
        id: 'fq-change-cancel', cat: 'general',
        q: { ar: 'أقدر أعدّل أو ألغي طلبي؟', en: 'Can I change or cancel my order?' },
        a: {
          ar: 'تقدرين تعدّلين أو تلغين مجانًا خلال 12 ساعة من تأكيد الطلب، لأن التجهيز يبدأ بعدها مباشرة. بعد بدء التنفيذ صعب نلغي لأن الطقم مفصّل بمقاسك أنتِ وما ينباع لغيرك، لكن راسلينا ونشوف وش نقدر نسوي.',
          en: 'You can change or cancel free of charge within 12 hours of confirming, since crafting starts right after that. Once we have begun we usually cannot cancel, because the set is cut to your own measurements and cannot be sold to anyone else — but message us and we will see what we can do.'
        }
      },
      {
        id: 'fq-from-photo', cat: 'general',
        q: { ar: 'أقدر أطلب تصميم من صورة عندي؟', en: 'Can I order a design from a photo I have?' },
        a: {
          ar: 'أكيد. أرسلي الصورة على الواتساب مع المقاس والطول اللي تبينه، ونرد عليك بالسعر ومدة التنفيذ خلال ساعات. بعض التصاميم المرسومة يدويًا تحتاج وقت أطول قليلاً، وبنوضّح لك ذلك قبل التأكيد.',
          en: 'Of course. Send the photo on WhatsApp with the length and sizes you want, and we will come back with a price and a timeline within hours. Some hand-painted designs need a little longer, and we will tell you before you confirm.'
        }
      },
      {
        id: 'fq-returns', cat: 'general',
        q: { ar: 'هل يوجد استرجاع أو استبدال؟', en: 'Do you accept returns or exchanges?' },
        a: {
          ar: 'الأطقم مفصّلة حسب الطلب فما نقدر نستقبل استرجاع بعد الاستخدام لأسباب صحية. لكن لو وصلك الطلب بعيب في التصنيع أو بمقاس غير اللي طلبتيه، أرسلي لنا صورة خلال 48 ساعة من الاستلام ونعيد تجهيزه لك مجانًا مع شحن مجاني للطقم البديل.',
          en: 'Sets are made to order, so for hygiene reasons we cannot take returns after wear. However, if your order arrives with a manufacturing fault or in a size other than the one you chose, send us a photo within 48 hours of delivery and we will remake it free of charge with free shipping on the replacement.'
        }
      }
    ],

    orders: []
  };
})();
