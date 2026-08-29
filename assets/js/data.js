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
