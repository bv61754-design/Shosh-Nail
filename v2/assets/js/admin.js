/*! Shosh Nail — assets/js/admin.js
 *  SN.Admin : the owner control panel (owner: ADMIN)
 *  Contract: SPEC.md section 13 (admin.html). Attaches exactly one property: window.SN.Admin
 *
 *  Everything the owner can see on the public site is editable here. The panel is
 *  built out of ONE generic, schema-driven CRUD renderer (`crud()`), so the twelve
 *  collection tabs share a single implementation instead of twelve copies.
 *
 *  Storage rules: every mutation goes through SN.Store.*, which persists and
 *  notifies. Text/number inputs commit on a short debounce and again on blur, so
 *  there is no "save" button anywhere except the password form.
 */
(function () {
  'use strict';

  var SN = (window.SN = window.SN || {});
  var D = document;

  /* ====================================================================== */
  /* 0. Dictionary — namespace `admin` (SPEC section 10)                     */
  /* ====================================================================== */

  var DICT = {
    ar: {
      admin: {
        /* ---- gate ---- */
        gateTitle: 'لوحة تحكم شوش نيل',
        gateSub: 'اكتبي كلمة المرور عشان تدخلين وتعدّلين محتوى الموقع.',
        gatePass: 'كلمة المرور',
        gatePassPh: 'كلمة مرور اللوحة',
        gateEnter: 'دخول',
        gateWrong: 'كلمة المرور غير صحيحة، جرّبي مرة ثانية.',
        gateEmpty: 'اكتبي كلمة المرور أولاً.',
        gateHint: 'كلمة المرور الافتراضية هي shosh1234 — غيّريها من تبويب «النسخ الاحتياطي» أول ما تدخلين.',
        gateBack: 'الرجوع للموقع',

        /* ---- gate diagnostics + recovery (shown after a failed attempt) ----
           هذه النصوص تخاطب صاحب الموقع بصيغة المذكّر. */
        gd: {
          missing: 'ملف كلمة المرور لم يصل إلى الموقع بعد. غالباً ما يعني هذا أن النشر ما زال جارياً، أو أن المتصفح يعرض نسخة قديمة من الموقع. انتظر دقيقة واحدة ثم أعد تحميل الصفحة.',
          hash: 'الموقع استلم كلمة المرور الجديدة بالفعل، إذاً المشكلة في القيمة المكتوبة. تحقق من وجود مسافة زائدة، ومن لغة لوحة المفاتيح، ومن الأحرف الكبيرة والصغيرة.',
          plain: 'الموقع استلم ملف كلمة المرور بالفعل، إذاً المشكلة في القيمة المكتوبة. تحقق من وجود مسافة زائدة، ومن لغة لوحة المفاتيح، ومن الأحرف الكبيرة والصغيرة.',
          stale: 'كان المتصفح يعرض نسخة قديمة من ملف كلمة المرور، وقد تم تحديثه الآن. جرّب الدخول مرة أخرى.',
          refresh: 'تحديث',
          refreshing: 'جارٍ التحديث…',
          refreshOk: 'تم تحديث ملف كلمة المرور.',

          recQ: 'ما أقدر أدخل؟',
          recX: 'إذا لم تنفع كلمة المرور بأي شكل، فهذه طريقة مضمونة للعودة إلى اللوحة، ويمكن تنفيذها كاملة من الجوال.',
          recOpen: 'افتح ملف password.js على GitHub',
          recNoLink: 'افتح مستودع الموقع على GitHub من حسابك، ثم افتح الملف password.js الموجود في الجذر.',
          recLineLbl: 'السطر الثالث — انسخه ثم بدّل الكلمة التي بين علامتي التنصيص',
          recLine: 'window.SN_ADMIN = "كلمة-مرور-جديدة";',
          recCopy: 'انسخ السطر',
          recCopyOk: 'تم نسخ السطر.',
          rec1: 'اضغط على «افتح ملف password.js على GitHub» في الأعلى، وسجّل الدخول بحسابك إذا طُلب منك ذلك.',
          rec2: 'اضغط على زر التعديل (رمز القلم) في أعلى الملف.',
          rec3: 'امسح السطر الثالث بالكامل، وضع مكانه هذا السطر:',
          rec4: 'بدّل «كلمة-مرور-جديدة» بكلمة مرور بسيطة تكتبها مباشرة بين علامتي التنصيص، بحروف إنجليزية وأرقام وبدون مسافات.',
          rec5: 'اضغط «Commit changes»، ثم اضغط «Commit changes» مرة أخرى في النافذة التي تظهر.',
          rec6: 'انتظر دقيقة واحدة، ثم أعد تحميل هذه الصفحة وادخل بكلمة المرور الجديدة.',
          recWarn: 'انتبه: هذه الصيغة تحفظ كلمة المرور كنص مقروء داخل الملف، ويستطيع أي شخص يفتح المستودع أن يقرأها.',
          recAfter: 'بعد أن تدخل، افتح تبويب «النسخ الاحتياطي» وغيّر كلمة المرور من هناك، حتى تعود محفوظة كبصمة مشفّرة بدل النص المقروء.'
        },

        /* ---- shell ---- */
        panel: 'لوحة التحكم',
        logout: 'خروج',
        loggedOut: 'تم تسجيل الخروج',
        menu: 'قائمة الأقسام',
        sections: 'الأقسام',
        defaultPass: 'كلمة المرور لا زالت الافتراضية (shosh1234). أي شخص يفتح الرابط يقدر يعدّل الموقع.',
        defaultPassCta: 'غيّري كلمة المرور الآن',
        viewSite: 'عرض الموقع',

        /* ---- tabs ---- */
        tab: {
          general: 'الإعدادات العامة',
          home: 'الصفحة الرئيسية',
          pricing: 'الأسعار',
          shapes: 'أشكال الأظافر',
          lengths: 'الأطوال',
          colors: 'الألوان',
          finishes: 'اللمسات النهائية',
          patterns: 'النقشات',
          charms: 'الزخارف',
          skinTones: 'ألوان البشرة',
          sizes: 'المقاسات',
          designs: 'التصاميم الجاهزة',
          faq: 'الأسئلة الشائعة',
          payments: 'طرق الدفع',
          orders: 'الطلبات',
          backup: 'النسخ الاحتياطي'
        },

        /* ---- أسماء المجموعات والأنواع (بدل المعرّفات الإنجليزية) ---- */
        grp: {
          nude: 'نيود', pink: 'وردي', red: 'أحمر', bold: 'جريء',
          dark: 'غامق', pastel: 'باستيل', neutral: 'محايد',
          stones: 'أحجار', stars: 'نجوم', flowers: 'ورود',
          letters: 'حروف', hearts: 'قلوب', misc: 'متنوعة'
        },
        kind: {
          gloss: 'لمّاع', matte: 'مطفي', glitter: 'جليتر',
          chrome: 'كروم', velvet: 'مخملي', jelly: 'جيلي',
          none: 'بدون نقشة', french: 'فرنش', frenchDeep: 'فرنش عميق',
          tipsGlitter: 'أطراف جليتر', ombre: 'أومبريه', ombreV: 'أومبريه عمودي',
          half: 'نصفين', diagonal: 'قطري', dots: 'نقاط', stripes: 'خطوط',
          chevron: 'شيفرون', marble: 'رخام', chrome2: 'كروم',
          glazed: 'دونات لامع', leopard: 'نمر', checkers: 'مربعات',
          hearts: 'قلوب', stars: 'نجوم', flames: 'لهب', lace: 'دانتيل',
          catEye: 'عين القط', aura: 'هالة'
        },

        /* ---- generic list ---- */
        addNew: 'إضافة جديد',
        addTo: 'إضافة إلى {n}',
        up: 'تحريك للأعلى',
        down: 'تحريك للأسفل',
        dup: 'نسخة مطابقة',
        del: 'حذف',
        expand: 'فتح التعديل',
        collapse: 'إغلاق التعديل',
        itemsN: '{n} عنصر',
        noItems: 'ما فيه عناصر في هذي القائمة',
        noItemsHint: 'اضغطي «إضافة جديد» عشان تبدئين.',
        noMatch: 'ما فيه نتيجة للبحث',
        searchPh: 'بحث داخل القائمة…',
        untitled: 'بدون اسم',
        moved: 'تم تغيير الترتيب',
        dupOk: 'تم إنشاء نسخة',
        delOk: 'تم الحذف',
        addOk: 'تمت الإضافة',
        delAsk: 'متأكدة من حذف «{n}»؟ ما راح نقدر نرجّعه.',
        idLbl: 'المعرّف',
        copyStr: 'نسخة',
        shapeIds: 'الأشكال المرسومة في المحرّك هي: {n} — أي شكل جديد بمعرّف مختلف بيُرسم على هيئة «لوز».',
        sz: {
          guide: 'جدول المقاسات',
          guideX: 'العلاقة بين رقم المقاس وعرض الظفر بالمليمتر. رقم 0 هو الأوسع.',
          sets: 'المقاسات الجاهزة (S / M / L)',
          setsX: 'كل مجموعة توزّع رقم مقاس على كل إصبع، والعميلة تقدر تعدّل بعدها.',
          methods: 'طرق القياس',
          methodsX: 'الشرح اللي يظهر للعميلة عن المقاسات.'
        },
        fq: {
          cats: 'تصنيفات الأسئلة',
          catsX: 'التبويبات اللي تظهر فوق الأسئلة في صفحة الأسئلة والتواصل.',
          list: 'الأسئلة والأجوبة',
          listX: 'أسئلة تصنيف «التركيب» تظهر كمان كدليل مرقّم في أسفل الصفحة.'
        },

        /* ---- field labels ---- */
        f: {
          name: 'الاسم',
          person: 'اسم العميلة',
          price: 'السعر الإضافي',
          desc: 'الوصف',
          text: 'النص',
          title: 'العنوان',
          label: 'الوصف المختصر',
          value: 'الرقم أو القيمة',
          factor: 'معامل الطول',
          kind: 'النوع',
          hex: 'اللون',
          shadow: 'لون الظل',
          group: 'المجموعة',
          glyph: 'الرمز (إيموجي)',
          icon: 'الأيقونة',
          cat: 'التصنيف',
          q: 'السؤال',
          a: 'الإجابة',
          note: 'ملاحظة مختصرة',
          details: 'التفاصيل الكاملة',
          enabled: 'مفعّلة للعميلات',
          sizeLabel: 'رقم المقاس',
          mm: 'العرض بالمليمتر',
          thumb: 'الإبهام',
          index: 'السبابة',
          middle: 'الوسطى',
          ring: 'البنصر',
          pinky: 'الخنصر',
          steps: 'الخطوات',
          stars: 'التقييم (من 5)',
          tags: 'الوسوم'
        },

        /* ---- field hints ---- */
        h: {
          price: 'يُضاف على سعر الطقم الأساسي. اكتبي 0 إذا ما فيه فرق سعر.',
          factor: 'نسبة الطول مقارنة بالمتوسط: 0.72 قصير، 1 متوسط، 1.28 طويل، 1.6 طويل جداً.',
          shadow: 'درجة أغمق شوي من لون البشرة — تُستخدم لحواف اليد في الرسم.',
          glyph: 'الصقي أي إيموجي هنا (💎 ⭐ 🌸) أو رمز نصّي قصير.',
          details: 'تظهر للعميلة لما تختار هذي الطريقة عند الدفع. اكتبي الآيبان أو رقم المحفظة هنا.',
          mm: 'عرض الظفر بالمليمتر لهذا الرقم. الأرقام الصغيرة = مقاس أوسع.',
          sizes: 'الأرقام هي ترتيب المقاس في جدول المقاسات (0 = الأوسع).',
          steps: 'خطوات مرقّمة تظهر للعميلة في صفحة المقاسات.',
          person: 'اكتبي الاسم بالعربي وبالحروف اللاتينية، عشان يقرأه الزائر باللغتين.',
          stars: 'من 1 إلى 5 — تظهر كنجوم في الصفحة الرئيسية.',
          statValue: 'مثال: +1200 أو 4.9 أو 3–5.'
        },

        /* ---- general tab ---- */
        g: {
          identity: 'الهوية',
          identityX: 'اسم المتجر ووصفه والعملة — تظهر في الهيدر والتذييل وكل الصفحات.',
          contact: 'التواصل',
          contactX: 'أي حقل تتركينه فاضي يختفي تلقائياً من الموقع.',
          announce: 'الشريط العلوي',
          announceX: 'شريط صغير فوق الهيدر لإعلان العروض أو مواعيد التجهيز.',
          notify: 'الإشعارات',
          notifyX: 'وصول تنبيه لك على الإيميل بكل طلب جديد. الشرح الكامل في تبويب «النسخ الاحتياطي».',
          options: 'الخيارات',
          preview: 'معاينة مباشرة'
        },
        f2: {
          brand: 'اسم المتجر',
          tagline: 'الجملة التعريفية',
          about: 'نبذة عن المتجر',
          currency: 'رمز العملة',
          theme: 'المظهر الافتراضي',
          phone: 'رقم الجوال',
          whatsapp: 'رقم الواتساب',
          email: 'البريد الإلكتروني',
          instagram: 'حساب انستقرام',
          snapchat: 'حساب سناب شات',
          tiktok: 'حساب تيك توك',
          city: 'المدينة',
          address: 'العنوان',
          hours: 'أوقات العمل',
          announceOn: 'إظهار الشريط العلوي',
          announceTxt: 'نص الشريط',
          notifyEndpoint: 'رابط الإشعار (Endpoint)',
          notifyKey: 'مفتاح الوصول (Access Key)',
          notifyEmail: 'الإيميل اللي تستقبلين عليه',
          whatsappOrder: 'فتح الواتساب عند تأكيد الطلب'
        },
        gh: {
          brand: 'يظهر في الهيدر والتذييل وفي رسالة الطلب.',
          about: 'جملتين أو ثلاث — تظهر في التذييل وصفحة الأسئلة.',
          currency: 'مثال: ر.س بالعربي و SAR بالإنجليزي.',
          theme: 'المظهر اللي يشوفه الزائر أول مرة، ويقدر يغيّره بنفسه.',
          phone: 'بصيغة دولية مع علامة +، مثال: ‎+966500000000',
          whatsapp: 'أرقام فقط مع رمز الدولة وبدون + وبدون صفر، مثال: 966500000000',
          social: 'اسم الحساب فقط بدون @ وبدون رابط.',
          announceTxt: 'إذا تركتي النص فاضي بالغتين يختفي الشريط.',
          whatsappOrder: 'عند التأكيد يفتح واتساب برسالة فيها ملخص الطلب جاهزة للإرسال.'
        },
        errPhone: 'صيغة الرقم غير صحيحة — استخدمي أرقام مع + في البداية.',
        errWa: 'رقم الواتساب لازم يكون أرقام فقط مع رمز الدولة (9 إلى 15 رقم).',
        errMail: 'صيغة البريد الإلكتروني غير صحيحة.',
        errHex: 'اكتبي اللون بصيغة ‎#RRGGBB',

        /* ---- home tab ---- */
        hm: {
          hero: 'الواجهة (Hero)',
          heroX: 'أول ما تشوفه الزائرة في الصفحة الرئيسية.',
          heroTitle: 'العنوان الرئيسي',
          heroSub: 'النص التعريفي',
          heroCta: 'نص زر البداية',
          heroImage: 'صورة الواجهة',
          heroImageX: 'اختياري. إذا تركتيها فاضية نعرض رسمة اليد المتحركة بدلها.',
          features: 'المميزات',
          featuresX: 'ثلاث إلى أربع بطاقات تشرح ليش شوش نيل.',
          steps: 'خطوات الطلب',
          stepsX: 'أربع خطوات تشرح كيف تطلب العميلة.',
          testimonials: 'آراء العميلات',
          stats: 'الأرقام'
        },

        /* ---- pricing tab ---- */
        p: {
          intro: 'كل الأسعار بالعملة اللي حددتيها في الإعدادات. أي تعديل يظهر مباشرة في اختبار الستايل وصفحة الطلب.',
          base: 'سعر الطقم الأساسي',
          baseX: 'سعر طقم كامل من 10 أظافر قبل أي إضافات.',
          singleHandFactor: 'نسبة طقم اليد الواحدة',
          singleHandFactorX: 'من 0 إلى 1 — كم يدفع طلب اليد الواحدة (5 أظافر) من سعر الطقم. 0.6 = 60٪، و1 = السعر كامل. باقي الرسوم تنقص وحدها.',
          perExtraColor: 'كل لون إضافي',
          perExtraColorX: 'يُحتسب على كل لون بعد اللون الأول في الطقم.',
          perPatternNail: 'كل ظفر فيه نقشة',
          perPatternNailX: 'يُحتسب على عدد الأظافر اللي عليها نقشة، بالإضافة لسعر النقشة نفسها.',
          perCharm: 'كل زخرفة',
          perCharmX: 'يُحتسب على كل حبة زخرفة موضوعة، بالإضافة لسعر الزخرفة نفسها.',
          express: 'التنفيذ السريع',
          expressX: 'رسوم إضافية إذا اختارت العميلة التنفيذ خلال 24–48 ساعة.',
          giftWrap: 'تغليف الهدية',
          giftWrapX: 'رسوم العلبة الأنيقة مع بطاقة الإهداء.',
          shipping: 'الشحن',
          shippingX: 'تُضاف على كل طلب ما عدا الطلبات اللي تتجاوز حد الشحن المجاني.',
          freeShippingOver: 'الشحن مجاني فوق',
          freeShippingOverX: 'إذا وصل المجموع لهذا الرقم يصير الشحن مجاني. اكتبي 0 لتعطيل الميزة.',
          vat: 'ضريبة القيمة المضافة',
          vatX: 'كنسبة من 0 إلى 1 — يعني 0.15 = 15%. اكتبي 0 لإخفاء سطر الضريبة.',
          depositPct: 'نسبة العربون',
          depositPctX: 'كنسبة من 0 إلى 1 — 0.5 = نص المبلغ مقدماً. اكتبي 0 لتعطيلها.',
          sample: 'سعر طقم نموذجي',
          sampleX: 'حساب مباشر لطقم متوسط: 3 ألوان، ظفران عليهم نقشة، وزخرفتان — يتحدّث مع كل تعديل فوق.',
          sampleNo: 'ما قدرنا نحسب المثال الآن.',
          extras: 'أسعار العناصر (كل سعر إضافي في الموقع)',
          extrasX: 'هذي أسعار العناصر نفسها: شكل، طول، لمسة، نقشة، زخرفة، وسعر كل تصميم جاهز. عدّلي أي رقم هنا وينحفظ فوراً — ما يحتاج تفتحين تبويب ثاني.',
          extrasNone: 'ما فيه عناصر في هذي القائمة بعد.',
          extrasOpen: 'فتح القائمة',
          extrasShow: '{n} عنصر'
        },

        /* ---- designs tab ---- */
        d: {
          intro: 'التصاميم اللي تظهر في صفحة «تصاميم جاهزة». رتّبيها بالسهمين، والأكثر طلباً يطلع تلقائياً حسب عدد الطلبات.',
          price: 'السعر',
          orders: 'عدد الطلبات',
          ordersX: 'يُستخدم لترتيب «الأكثر طلباً» في المتجر والصفحة الرئيسية.',
          featured: 'مميّز',
          active: 'ظاهر في المتجر',
          tags: 'الوسوم',
          tagsPh: 'وسم جديد ثم Enter',
          tagAdd: 'إضافة وسم',
          tagDel: 'حذف الوسم',
          image: 'صورة التصميم',
          preview: 'معاينة'
        },

        /* ---- الصور الحقيقية (مشترك بين كل التبويبات) ---- */
        img: {
          head: 'الصورة الحقيقية',
          upload: 'رفع صورة من الجوال',
          replace: 'تغيير الصورة',
          clear: 'حذف الصورة والرجوع للرسمة',
          none: 'ما فيه صورة — نعرض الرسمة المرسومة',
          meta: '{n} كيلوبايت · {w}×{h}',
          ok: 'تم رفع الصورة ({n} كيلوبايت)',
          err: 'ما قدرنا نقرأ الصورة، جرّبي صورة ثانية.',
          type: 'الملف لازم يكون صورة (JPG أو PNG).',
          working: 'جاري تجهيز الصورة…',
          full: 'ما فيه مساحة تكفي: الصورة {n} كيلوبايت والمتبقي {r} كيلوبايت فقط. احذفي صوراً قديمة، أو نزّلي نسخة احتياطية من تبويب «النسخ الاحتياطي».',
          rejected: 'المتصفح رفض الحفظ لأن المساحة امتلأت — رجّعنا الصورة السابقة.',
          used: 'المساحة المستخدمة: {n} من {t} كيلوبايت',
          warnNear: 'المساحة قاربت على الامتلاء — احذفي صوراً كبيرة قبل ما ترفعين غيرها.',
          urlLbl: 'أو الصقي رابط الصورة',
          shrink: 'تُصغَّر تلقائياً إلى {n} بكسل وتُحفظ بصيغة JPEG خفيفة (PNG إذا كانت خلفيتها شفافة).',
          colorX: 'صوّري اللون على ظفر حقيقي تحت إضاءة طبيعية — هذي الصورة هي اللي تشوفها العميلة بدل المربّع الملوّن.',
          finishX: 'صورة تبيّن لمعة أو مطفأة اللمسة على ظفر حقيقي.',
          patternX: 'صورة لظفر منفّذ بهذي النقشة فعلياً.',
          charmX: 'صورة للزخرفة الحقيقية على خلفية فاتحة. الصورة تغلب على الرسمة والإيموجي.',
          designX: 'صورة الطقم كامل. إذا ما فيه صورة نرسم التصميم من إعداداته.'
        },

        /* ---- مكتبة الرسومات (SN.Art) ---- */
        art: {
          lbl: 'رسمة من المكتبة',
          x: 'رسومات متجهية مرسومة داخل الموقع — تظهر على الظفر مباشرة بدون صورة.',
          pick: 'اختاري رسمة',
          change: 'تغيير الرسمة',
          none: 'بدون رسمة',
          clear: 'إزالة الرسمة',
          title: 'مكتبة الزخارف',
          searchPh: 'ابحثي عن رسمة…',
          letter: 'الحرف',
          letterX: 'حرف واحد بالعربي أو بالإنجليزي — يُرسم بالذهب أو الفضة.',
          noMatch: 'ما فيه رسمة بهذا الاسم',
          off: 'مكتبة الرسومات غير متاحة الآن. تقدرين ترفعين صورة حقيقية بدلها.',
          groups: {
            stones: 'أحجار',
            metal: 'معادن',
            flowers: 'ورود',
            shapes: 'أشكال',
            letters: 'حروف',
            effects: 'لمعة وتأثيرات'
          }
        },

        /* ---- إضافة زخرفة جديدة ---- */
        nd: {
          add: 'إضافة زخرفة',
          title: 'زخرفة جديدة',
          edit: 'مصدر الشكل',
          nameAr: 'الاسم بالعربي',
          nameEn: 'الاسم بالإنجليزي',
          src: 'شكل الزخرفة',
          srcArt: 'رسمة من المكتبة',
          srcImg: 'صورة حقيقية',
          srcGlyph: 'رمز إيموجي',
          need: 'اختاري رسمة أو ارفعي صورة أو اكتبي إيموجي.',
          needName: 'اكتبي اسم الزخرفة بالعربي على الأقل.',
          create: 'إضافة الزخرفة',
          created: 'تمت إضافة الزخرفة',
          intro: 'كل زخرفة يقدر اختبار الستايل يحطها في الطقم. تقدرين تختارين لها رسمة من المكتبة، أو ترفعين صورة الزخرفة الحقيقية عشان العميلة تشوف اللي راح يوصلها بالضبط.'
        },

        /* ---- orders tab ---- */
        o: {
          intro: 'الطلبات مرتّبة من الأحدث. اضغطي على أي طلب لعرض التفاصيل والرد على العميلة.',
          all: 'الكل',
          searchPh: 'ابحثي برقم الطلب أو الاسم أو الجوال…',
          exportCsv: 'تصدير CSV',
          exportOk: 'تم تصدير ملف الطلبات',
          detail: 'تفاصيل الطلب',
          copySum: 'نسخ الملخص',
          waReply: 'الرد على العميلة في واتساب',
          waNo: 'ما فيه رقم جوال مسجّل لهذا الطلب.',
          statusLbl: 'حالة الطلب',
          statusOk: 'تم تحديث حالة الطلب',
          delAsk: 'حذف الطلب {n}؟ ما راح نقدر نرجّعه.',
          empty: 'ما فيه طلبات بعد',
          emptyHint: 'أول ما توصل طلبات من الموقع بتظهر هنا مباشرة.',
          noMatch: 'ما فيه طلب يطابق البحث',
          customer: 'بيانات العميلة',
          design: 'التصميم',
          sum: 'ملخص الطلب',
          csvNo: 'ما فيه طلبات للتصدير.',
          totalLbl: 'الإجمالي',
          kindLbl: 'النوع',
          editHead: 'تعديل بيانات الطلب',
          editX: 'أي تعديل هنا يُحفظ فوراً. تصميم العميلة ما يتأثر إطلاقاً.',
          priceLbl: 'الإجمالي بعد التعديل',
          priceX: 'اكتبي المبلغ النهائي المتفق عليه — يظهر في القائمة وفي ملف CSV.',
          qtyX: 'عدد الأطقم في هذا الطلب.',
          noteLbl: 'ملاحظة العميلة',
          noteX: 'تقدرين تكتبين هنا ملاحظاتك أنت كمان (مثلاً: تم التحصيل).',
          savedOk: 'تم حفظ التعديل',
          delStatus: 'حذف كل «{n}»',
          delAll: 'حذف كل الطلبات',
          delStatusAsk: 'حذف {c} طلب في حالة «{n}»؟ ما راح نقدر نرجّعها.',
          delAllAsk: 'حذف كل الطلبات ({c})؟ ما راح نقدر نرجّعها.',
          delAllAsk2: 'تأكيد أخير — بعد الحذف ما فيه رجعة. نكمّل؟',
          delManyOk: 'تم حذف {c} طلب',
          delNone: 'ما فيه طلبات في هذي الحالة.',
          designSafe: 'التصميم محفوظ كما أرسلته العميلة'
        },

        /* ---- backup tab ---- */
        b: {
          dataHead: 'النسخ الاحتياطي والاستعادة',
          dataX: 'احفظي نسخة من محتوى موقعك كل فترة. الملف يحتوي كل شيء: الإعدادات والألوان والتصاميم والطلبات.',
          exportBtn: 'تنزيل نسخة احتياطية (JSON)',
          exportOk: 'تم تنزيل النسخة الاحتياطية',
          exportErr: 'ما قدرنا ننزّل الملف.',
          importBtn: 'استيراد نسخة احتياطية',
          importAsk: 'الاستيراد بيستبدل كل محتوى الموقع الحالي بالملف المختار. متأكدة؟',
          importOk: 'تم استيراد النسخة بنجاح',
          resetHead: 'إعادة الضبط',
          resetX: 'ترجع كل المحتوى للنسخة الأصلية اللي جاء بها الموقع. الطلبات تبقى محفوظة.',
          resetBtn: 'إعادة الضبط للنسخة الأصلية',
          resetAsk1: 'بترجع كل التعديلات للنسخة الأصلية. متأكدة؟',
          resetAsk2: 'تأكيد أخير: كل الألوان والتصاميم والنصوص اللي عدّلتيها بتروح. نكمّل؟',
          resetOk: 'تمت إعادة الضبط',
          passHead: 'كلمة مرور اللوحة',
          passX: 'خطوتين بس: تكتبين كلمة المرور الجديدة، ثم تنسخين نص جاهز وتلصقينه في ملف واحد على GitHub.',
          passS1: 'الخطوة 1 — اختاري كلمة المرور الجديدة',
          passS1X: 'اكتبيها مرتين عشان نتأكد ما فيه غلط طباعة. 6 خانات على الأقل.',
          passNew: 'كلمة المرور الجديدة',
          passNew2: 'اكتبيها مرة ثانية',
          passShow: 'إظهار كلمة المرور',
          passHide: 'إخفاء كلمة المرور',
          passSave: 'حفظ ومتابعة للخطوة 2',
          passShort: 'كلمة المرور لازم تكون 6 خانات على الأقل.',
          passEmpty: 'اكتبي كلمة المرور الجديدة أولاً.',
          passMismatch: 'الكلمتان ما تطابقن. راجعي الكتابة في الخانتين.',
          passOk: 'تم الحفظ على هذا الجهاز مؤقتاً — باقي الخطوة 2 عشان تثبت',
          passLocalFail: 'ما قدرنا نحفظها على هذا الجهاز، بس أكملي الخطوة 2 وبتشتغل على كل الأجهزة.',
          passS2: 'الخطوة 2 — عشان تشتغل على كل الأجهزة',
          passS2X: 'كلمة المرور الجديدة شغّالة الحين على هذا الجهاز وفي هذي الجلسة بس. الخطوة 2 هي اللي تثبّتها فعلياً: بدونها، أي جهاز ثاني — وحتى هذا الجهاز بعد ما تسكّرين الصفحة — يرجع يقبل الكلمة القديمة.',
          passFileLbl: 'محتوى ملف password.js — انسخيه كامل',
          passCopy: 'انسخي المحتوى',
          passCopyOk: 'تم نسخ المحتوى — افتحي الرابط والصقيه',
          passOpen: 'افتحي ملف كلمة المرور في GitHub',
          passOpenNo: 'ما نقدر نفتح الرابط تلقائياً. افتحي مستودع الموقع في GitHub، وادخلي على الملف password.js.',
          passHowHead: 'وش تسوين بالضبط بعد ما تنسخين:',
          passH1: '1) اضغطي زر «افتحي ملف كلمة المرور في GitHub» فوق. لو طلب منك تسجيل الدخول، ادخلي بحسابك.',
          passH2: '2) فوق الملف بتلقين أيقونة قلم رصاص ✏️ (اسمها Edit). اضغطيها عشان يصير الملف قابل للتعديل.',
          passH3: '3) اضغطي مطوّلاً داخل نص الملف واختاري «تحديد الكل / Select all»، وامسحي كل الموجود.',
          passH4: '4) اضغطي مطوّلاً مرة ثانية واختاري «لصق / Paste». المفروض يصير في الملف نفس النص اللي نسختيه، ولا شيء غيره.',
          passH5: '5) اضغطي الزر الأخضر «Commit changes...» فوق، ثم في المربع اللي يطلع اضغطي «Commit changes» مرة ثانية.',
          passH6: '6) انتظري دقيقة إلى دقيقتين، وبعدها افتحي الموقع من أي جهاز — كلمة المرور الجديدة صارت شغّالة.',
          passSafe: 'النص اللي نسختيه ما فيه كلمة المرور نفسها، فيه «بصمة» مشفّرة لها. يعني لو شافه أحد ما يقدر يعرف كلمتك، وآمن إنه ينحفظ في GitHub.',
          passSafePlain: 'هذي النسخة فيها كلمة المرور نفسها مكتوبة، وملفات GitHub يقدر يشوفها أي أحد. اختاري كلمة مرور تخص هذا الموقع فقط.',
          passReuse: 'لا تستخدمين كلمة مرور تستخدمينها في الإيميل أو البنك أو أي حساب ثاني. خصّصي كلمة مرور لهذا الموقع لحالها.',
          passGuard: 'ملاحظة مهمة: هذي الكلمة تحمي لوحة التحكم فقط. اللوحة تعدّل نسخة المحتوى داخل المتصفح اللي فُتحت منه، وما تقدر تغيّر اللي يشوفه زوار الموقع. المحتوى المنشور ما يتغيّر إلا لما ترفعينه من حسابك على GitHub.',
          passRedo: 'أعيدي فتح الخطوة 2',
          passRedoX: 'محتوى الملف محفوظ لك في هذي الجلسة، ما يحتاج تكتبين كلمة المرور من جديد.',
          storeHead: 'مساحة التخزين',
          storeX: 'كل شيء محفوظ داخل متصفح هذا الجهاز. الصور الكبيرة هي أكثر شيء يستهلك المساحة.',
          storeUsed: 'المستخدم حالياً: {n} كيلوبايت',
          storeWarn: 'المساحة قاربت الحد — احذفي بعض الصور الكبيرة أو صغّريها قبل الرفع.',
          storeOk: 'المساحة مريحة.',
          storeCap: 'الحد الآمن في هذا المتصفح: {n} كيلوبايت تقريباً.',
          storeImgs: 'الصور المرفوعة: {c} صورة تشغل {n} كيلوبايت.',
          storeImgsNone: 'ما فيه صور مرفوعة — كل شيء مرسوم داخل الموقع.',
          storeBar: 'مؤشر امتلاء المساحة',
          storeFullWarn: 'المساحة ممتلئة تقريباً. احذفي صوراً أو نزّلي نسخة احتياطية وأعيدي الضبط.',
          notifyHead: 'إشعار الطلبات على الإيميل',
          notifyX: 'الموقع ثابت وبدون سيرفر، فالإشعارات تمر عبر خدمة مجانية توصّل الطلب لإيميلك. الخدمتان الأشهر: Web3Forms و Formspree.',
          notifyS1: '1) افتحي web3forms.com واكتبي إيميلك واضغطي «Create Access Key» — يوصلك مفتاح على الإيميل.',
          notifyS2: '2) الصقي المفتاح في خانة «مفتاح الوصول»، واكتبي في خانة «رابط الإشعار»: https://api.web3forms.com/submit',
          notifyS3: '3) أو لو تفضّلين Formspree: سجّلي في formspree.io، أنشئي فورم جديد، وانسخي رابطه (يشبه https://formspree.io/f/xxxxxxx) والصقيه في خانة الرابط واتركي المفتاح فاضي.',
          notifyS4: '4) اكتبي إيميلك في خانة «الإيميل اللي تستقبلين عليه» عشان يظهر لك هنا للتذكير.',
          notifyS5: '5) اضغطي «اختبار الإشعار» تحت، وتأكدي إن الرسالة وصلت لبريدك (راجعي مجلد الرسائل غير المرغوبة أول مرة).',
          notifyGo: 'الحقول نفسها موجودة في تبويب «الإعدادات العامة» تحت «الإشعارات».',
          test: 'اختبار الإشعار',
          testNone: 'اكتبي رابط الإشعار أولاً في الإعدادات العامة.',
          testSending: 'جاري الإرسال…',
          testOk: 'تم إرسال رسالة الاختبار — راجعي بريدك.',
          testErr: 'ما نجح الإرسال ({n}). تأكدي من الرابط والمفتاح.',
          testNet: 'ما قدرنا نتصل بالخدمة. تأكدي من الاتصال بالإنترنت ومن صحة الرابط.',
          testSubject: 'رسالة اختبار من لوحة تحكم شوش نيل',
          testBody: 'هذي رسالة اختبار أرسلتها لوحة تحكم شوش نيل للتأكد من وصول إشعارات الطلبات. إذا وصلتك، فالإعداد تمام.'
        }
      }
    },

    en: {
      admin: {
        gateTitle: 'Shosh Nail control panel',
        gateSub: 'Enter your password to manage the content of the site.',
        gatePass: 'Password',
        gatePassPh: 'Panel password',
        gateEnter: 'Sign in',
        gateWrong: 'That password is not right — please try again.',
        gateEmpty: 'Please type your password first.',
        gateHint: 'The default password is shosh1234 — change it from the Backup tab as soon as you are in.',
        gateBack: 'Back to the site',

        gd: {
          missing: 'Your password file has not reached the site yet. Usually that means it is still publishing, or your browser is showing an old copy of the site. Wait a minute, then reload this page.',
          hash: 'The site did receive your new password, so the problem is the value that was typed. Check for an extra space, the keyboard language, and upper/lower case.',
          plain: 'The site did receive your password file, so the problem is the value that was typed. Check for an extra space, the keyboard language, and upper/lower case.',
          stale: 'Your browser was showing an old copy of the password file, and it has just been refreshed. Please try signing in again now.',
          refresh: 'Refresh',
          refreshing: 'Refreshing…',
          refreshOk: 'Password file refreshed.',

          recQ: 'Cannot sign in?',
          recX: 'If the password will not work at all, this is a guaranteed way back into the panel, and you can do all of it from your phone.',
          recOpen: 'Open password.js on GitHub',
          recNoLink: 'Open your site repository on GitHub from your account, then open the file password.js at its root.',
          recLineLbl: 'The third line — copy it, then change the word between the quotation marks',
          recLine: 'window.SN_ADMIN = "new-password";',
          recCopy: 'Copy the line',
          recCopyOk: 'Line copied.',
          rec1: 'Tap “Open password.js on GitHub” above, and sign in with your account if you are asked to.',
          rec2: 'Tap the edit button (the pencil icon) at the top of the file.',
          rec3: 'Delete the whole third line and put this line in its place:',
          rec4: 'Replace new-password with a simple password typed directly between the quotation marks — English letters and digits, no spaces.',
          rec5: 'Tap “Commit changes”, then tap “Commit changes” again in the window that appears.',
          rec6: 'Wait one minute, then reload this page and sign in with the new password.',
          recWarn: 'Note: this form stores the password as readable text inside the file, and anyone who opens the repository can read it.',
          recAfter: 'Once you are back in, open the Backup tab and change the password there, so it is stored as a scrambled fingerprint again instead of readable text.'
        },

        panel: 'Control panel',
        logout: 'Sign out',
        loggedOut: 'Signed out',
        menu: 'Sections menu',
        sections: 'Sections',
        defaultPass: 'The password is still the default one (shosh1234). Anyone with the link can edit your site.',
        defaultPassCta: 'Change the password now',
        viewSite: 'View site',

        tab: {
          general: 'General settings',
          home: 'Home page',
          pricing: 'Pricing',
          shapes: 'Nail shapes',
          lengths: 'Lengths',
          colors: 'Colours',
          finishes: 'Finishes',
          patterns: 'Patterns',
          charms: 'Charms',
          skinTones: 'Skin tones',
          sizes: 'Sizing',
          designs: 'Ready designs',
          faq: 'FAQ',
          payments: 'Payment methods',
          orders: 'Orders',
          backup: 'Backup & security'
        },

        grp: {
          nude: 'Nude', pink: 'Pink', red: 'Red', bold: 'Bold',
          dark: 'Dark', pastel: 'Pastel', neutral: 'Neutral',
          stones: 'Stones', stars: 'Stars', flowers: 'Flowers',
          letters: 'Letters', hearts: 'Hearts', misc: 'Other'
        },
        kind: {
          gloss: 'Glossy', matte: 'Matte', glitter: 'Glitter',
          chrome: 'Chrome', velvet: 'Velvet', jelly: 'Jelly',
          none: 'No pattern', french: 'French', frenchDeep: 'Deep french',
          tipsGlitter: 'Glitter tips', ombre: 'Ombré', ombreV: 'Vertical ombré',
          half: 'Half and half', diagonal: 'Diagonal', dots: 'Dots', stripes: 'Stripes',
          chevron: 'Chevron', marble: 'Marble', chrome2: 'Chrome',
          glazed: 'Glazed donut', leopard: 'Leopard', checkers: 'Checkers',
          hearts: 'Hearts', stars: 'Stars', flames: 'Flames', lace: 'Lace',
          catEye: 'Cat eye', aura: 'Aura'
        },

        addNew: 'Add new',
        addTo: 'Add to {n}',
        up: 'Move up',
        down: 'Move down',
        dup: 'Duplicate',
        del: 'Delete',
        expand: 'Open editor',
        collapse: 'Close editor',
        itemsN: '{n} items',
        noItems: 'This list is empty',
        noItemsHint: 'Press “Add new” to create the first one.',
        noMatch: 'Nothing matches your search',
        searchPh: 'Search this list…',
        untitled: 'Untitled',
        moved: 'Order updated',
        dupOk: 'Duplicate created',
        delOk: 'Deleted',
        addOk: 'Added',
        delAsk: 'Delete “{n}”? This cannot be undone.',
        idLbl: 'ID',
        copyStr: 'copy',
        shapeIds: 'The renderer draws these shapes: {n} — a new shape with any other id falls back to almond.',
        sz: {
          guide: 'Size chart',
          guideX: 'How each size number maps to a nail width in millimetres. 0 is the widest.',
          sets: 'Ready presets (S / M / L)',
          setsX: 'Each preset spreads a size number across the fingers; customers can still fine-tune.',
          methods: 'Measuring methods',
          methodsX: 'The sizing guidance shown to the customer.'
        },
        fq: {
          cats: 'FAQ categories',
          catsX: 'The tabs shown above the questions on the help page.',
          list: 'Questions & answers',
          listX: 'Questions in the “Application” category also become the numbered guide at the bottom of the page.'
        },

        f: {
          name: 'Name',
          person: 'Customer name',
          price: 'Extra price',
          desc: 'Description',
          text: 'Text',
          title: 'Title',
          label: 'Short label',
          value: 'Number or value',
          factor: 'Length factor',
          kind: 'Kind',
          hex: 'Colour',
          shadow: 'Shadow colour',
          group: 'Group',
          glyph: 'Glyph (emoji)',
          icon: 'Icon',
          cat: 'Category',
          q: 'Question',
          a: 'Answer',
          note: 'Short note',
          details: 'Full details',
          enabled: 'Offered to customers',
          sizeLabel: 'Size number',
          mm: 'Width in mm',
          thumb: 'Thumb',
          index: 'Index',
          middle: 'Middle',
          ring: 'Ring',
          pinky: 'Pinky',
          steps: 'Steps',
          stars: 'Rating (out of 5)',
          tags: 'Tags'
        },

        h: {
          price: 'Added on top of the base set price. Use 0 when there is no surcharge.',
          factor: 'Length relative to medium: 0.72 short, 1 medium, 1.28 long, 1.6 extra long.',
          shadow: 'A slightly darker shade of the skin tone — used for the hand edges in the drawing.',
          glyph: 'Paste any emoji here (💎 ⭐ 🌸) or a short text symbol.',
          details: 'Shown to the customer when she picks this method at checkout. Put the IBAN or wallet number here.',
          mm: 'Nail width in millimetres for this size number. Lower numbers are wider.',
          sizes: 'Values are positions in the size chart (0 is the widest).',
          steps: 'Numbered steps shown to the customer on the sizing step.',
          person: 'Write the name in Arabic and in Latin letters, so it reads naturally in both languages.',
          stars: '1 to 5 — displayed as stars on the home page.',
          statValue: 'For example +1200, 4.9 or 3–5.'
        },

        g: {
          identity: 'Identity',
          identityX: 'Shop name, description and currency — used across the header, footer and every page.',
          contact: 'Contact',
          contactX: 'Any field you leave empty disappears from the site automatically.',
          announce: 'Announcement bar',
          announceX: 'A slim bar above the header for offers or production times.',
          notify: 'Notifications',
          notifyX: 'Get an email for every new order. The full walkthrough lives in the Backup tab.',
          options: 'Options',
          preview: 'Live preview'
        },
        f2: {
          brand: 'Shop name',
          tagline: 'Tagline',
          about: 'About the shop',
          currency: 'Currency symbol',
          theme: 'Default theme',
          phone: 'Phone number',
          whatsapp: 'WhatsApp number',
          email: 'Email address',
          instagram: 'Instagram handle',
          snapchat: 'Snapchat handle',
          tiktok: 'TikTok handle',
          city: 'City',
          address: 'Address',
          hours: 'Working hours',
          announceOn: 'Show the announcement bar',
          announceTxt: 'Bar text',
          notifyEndpoint: 'Notification endpoint',
          notifyKey: 'Access key',
          notifyEmail: 'Your receiving email',
          whatsappOrder: 'Open WhatsApp when an order is confirmed'
        },
        gh: {
          brand: 'Appears in the header, the footer and every order message.',
          about: 'Two or three sentences — shown in the footer and on the help page.',
          currency: 'For example ر.س in Arabic and SAR in English.',
          theme: 'What a first-time visitor sees; they can still switch it themselves.',
          phone: 'International format with a leading +, e.g. +966500000000',
          whatsapp: 'Digits only, with the country code, no + and no leading zero, e.g. 966500000000',
          social: 'The handle only — no @ and no full link.',
          announceTxt: 'Leave the text empty in both languages and the bar disappears.',
          whatsappOrder: 'On confirmation WhatsApp opens with the full order summary ready to send.'
        },
        errPhone: 'That phone format is not valid — use digits with a leading +.',
        errWa: 'The WhatsApp number must be digits with the country code (9 to 15 digits).',
        errMail: 'That email address is not valid.',
        errHex: 'Use the #RRGGBB colour format',

        hm: {
          hero: 'Hero',
          heroX: 'The very first thing a visitor sees on the home page.',
          heroTitle: 'Headline',
          heroSub: 'Intro paragraph',
          heroCta: 'Button label',
          heroImage: 'Hero image',
          heroImageX: 'Optional. Leave it empty and we draw the animated hand illustration instead.',
          features: 'Features',
          featuresX: 'Three or four cards explaining why Shosh Nail.',
          steps: 'How to order',
          stepsX: 'Four steps describing the ordering journey.',
          testimonials: 'Testimonials',
          stats: 'Stats strip'
        },

        p: {
          intro: 'All rates use the currency you set in the general settings. Changes appear instantly in the style quiz and at checkout.',
          base: 'Base set price',
          baseX: 'A complete set of 10 nails before any extras.',
          singleHandFactor: 'Single-hand share',
          singleHandFactorX: 'Between 0 and 1 — the share of the base price a one-hand order (5 nails) pays. 0.6 charges 60%, 1 charges the full set. The other rates shrink on their own.',
          perExtraColor: 'Per extra colour',
          perExtraColorX: 'Charged for every distinct colour after the first one in the set.',
          perPatternNail: 'Per patterned nail',
          perPatternNailX: 'Charged per nail carrying a pattern, on top of the pattern’s own price.',
          perCharm: 'Per charm',
          perCharmX: 'Charged per placed charm, on top of the charm’s own price.',
          express: 'Rush production',
          expressX: 'Surcharge when the customer picks the 24–48 hour turnaround.',
          giftWrap: 'Gift wrapping',
          giftWrapX: 'The price of the gift box with its card.',
          shipping: 'Shipping',
          shippingX: 'Added to every order except those over the free-shipping threshold.',
          freeShippingOver: 'Free shipping over',
          freeShippingOverX: 'Orders reaching this subtotal ship free. Set 0 to switch the perk off.',
          vat: 'VAT',
          vatX: 'A rate between 0 and 1 — 0.15 means 15%. Set 0 to hide the VAT line.',
          depositPct: 'Deposit percentage',
          depositPctX: 'A rate between 0 and 1 — 0.5 asks for half up front. Set 0 to disable.',
          sample: 'Sample set price',
          sampleX: 'A live quote for a typical set: 3 colours, 2 patterned nails and 2 charms — it updates as you edit above.',
          sampleNo: 'The sample could not be calculated right now.',
          extras: 'Item prices (every extra price on the site)',
          extrasX: 'The price carried by the items themselves: each shape, length, finish, pattern, charm, and every ready-made design. Edit any number here and it saves instantly — no need to open another tab.',
          extrasNone: 'Nothing in this list yet.',
          extrasOpen: 'Open the list',
          extrasShow: '{n} items'
        },

        d: {
          intro: 'The designs shown in the shop. Reorder them with the arrows; “most ordered” is derived from the order counts.',
          price: 'Price',
          orders: 'Orders count',
          ordersX: 'Drives the “most ordered” ranking in the shop and on the home page.',
          featured: 'Featured',
          active: 'Visible in the shop',
          tags: 'Tags',
          tagsPh: 'New tag, then Enter',
          tagAdd: 'Add tag',
          tagDel: 'Remove tag',
          image: 'Design photo',
          preview: 'Preview'
        },

        img: {
          head: 'Real photo',
          upload: 'Upload a photo',
          replace: 'Replace photo',
          clear: 'Remove photo, use the drawing',
          none: 'No photo — the drawn version is used',
          meta: '{n} KB · {w}×{h}',
          ok: 'Photo uploaded ({n} KB)',
          err: 'We could not read that image — please try another one.',
          type: 'The file has to be an image (JPG or PNG).',
          working: 'Preparing the photo…',
          full: 'Not enough room: the photo is {n} KB and only {r} KB is left. Remove some old photos, or download a backup from the Backup tab.',
          rejected: 'The browser refused to save — storage is full. The previous photo was put back.',
          used: 'Storage used: {n} of {t} KB',
          warnNear: 'Storage is nearly full — remove large photos before uploading more.',
          urlLbl: 'Or paste an image link',
          shrink: 'Automatically resized to {n}px and saved as a light JPEG (PNG when the source is transparent).',
          colorX: 'Photograph the polish on a real nail in daylight — the customer sees this instead of a flat colour square.',
          finishX: 'A photo showing how glossy or matte this finish looks on a real nail.',
          patternX: 'A photo of a nail actually painted with this pattern.',
          charmX: 'A photo of the real charm on a light background. The photo wins over the drawing and the emoji.',
          designX: 'A photo of the finished set. With no photo we render the design from its configuration.'
        },

        art: {
          lbl: 'Drawing from the library',
          x: 'Vector artwork drawn by the site itself — it appears on the nail with no photo at all.',
          pick: 'Pick a drawing',
          change: 'Change the drawing',
          none: 'No drawing',
          clear: 'Remove the drawing',
          title: 'Decoration library',
          searchPh: 'Search the library…',
          letter: 'Letter',
          letterX: 'A single Arabic or Latin character — drawn in gold or silver.',
          noMatch: 'Nothing matches that name',
          off: 'The drawing library is not available right now. You can upload a real photo instead.',
          groups: {
            stones: 'Stones',
            metal: 'Metal',
            flowers: 'Flowers',
            shapes: 'Shapes',
            letters: 'Letters',
            effects: 'Effects'
          }
        },

        nd: {
          add: 'Add a decoration',
          title: 'New decoration',
          edit: 'Artwork source',
          nameAr: 'Arabic name',
          nameEn: 'English name',
          src: 'What it looks like',
          srcArt: 'Drawing from the library',
          srcImg: 'Real photo',
          srcGlyph: 'Emoji symbol',
          need: 'Pick a drawing, upload a photo, or type an emoji.',
          needName: 'Give the decoration an Arabic name at least.',
          create: 'Add the decoration',
          created: 'Decoration added',
          intro: 'Every decoration can be placed on a set by the style quiz. Give it a drawing from the library, or upload a photo of the real charm so she sees exactly what will arrive.'
        },

        o: {
          intro: 'Orders are listed newest first. Open any order to see the details and reply to the customer.',
          all: 'All',
          searchPh: 'Search by order number, name or phone…',
          exportCsv: 'Export CSV',
          exportOk: 'Orders file exported',
          detail: 'Order details',
          copySum: 'Copy summary',
          waReply: 'Reply on WhatsApp',
          waNo: 'This order has no phone number saved.',
          statusLbl: 'Order status',
          statusOk: 'Status updated',
          delAsk: 'Delete order {n}? This cannot be undone.',
          empty: 'No orders yet',
          emptyHint: 'As soon as an order comes in from the site it will show up here.',
          noMatch: 'No order matches your search',
          customer: 'Customer',
          design: 'Design',
          sum: 'Order summary',
          csvNo: 'There are no orders to export.',
          totalLbl: 'Total',
          kindLbl: 'Type',
          editHead: 'Edit the order',
          editX: 'Every change here saves straight away. The customer’s design is never touched.',
          priceLbl: 'Adjusted total',
          priceX: 'The final agreed amount — it shows in the list and in the CSV export.',
          qtyX: 'How many sets this order is for.',
          noteLbl: 'Customer note',
          noteX: 'You can add your own notes here too (for example: paid in cash).',
          savedOk: 'Change saved',
          delStatus: 'Delete every “{n}”',
          delAll: 'Delete every order',
          delStatusAsk: 'Delete {c} order(s) with the status “{n}”? This cannot be undone.',
          delAllAsk: 'Delete all {c} orders? This cannot be undone.',
          delAllAsk2: 'Final check — there is no way back after this. Continue?',
          delManyOk: '{c} order(s) deleted',
          delNone: 'There are no orders with that status.',
          designSafe: 'The design is kept exactly as the customer sent it'
        },

        b: {
          dataHead: 'Backup & restore',
          dataX: 'Save a copy of your content now and then. The file holds everything: settings, colours, designs and orders.',
          exportBtn: 'Download a backup (JSON)',
          exportOk: 'Backup downloaded',
          exportErr: 'The file could not be downloaded.',
          importBtn: 'Import a backup',
          importAsk: 'Importing replaces all of your current content with the chosen file. Are you sure?',
          importOk: 'Backup imported successfully',
          resetHead: 'Reset',
          resetX: 'Puts every piece of content back to the version the site shipped with. Orders are kept.',
          resetBtn: 'Reset to the original content',
          resetAsk1: 'This rolls every edit back to the original content. Are you sure?',
          resetAsk2: 'Final check: every colour, design and text you changed will be lost. Continue?',
          resetOk: 'Everything was reset',
          passHead: 'Panel password',
          passX: 'Two steps only: pick the new password, then copy a ready-made text and paste it into one file on GitHub.',
          passS1: 'Step 1 — choose the new password',
          passS1X: 'Type it twice so a typo cannot slip through. At least 6 characters.',
          passNew: 'New password',
          passNew2: 'Type it again',
          passShow: 'Show the password',
          passHide: 'Hide the password',
          passSave: 'Save and go to step 2',
          passShort: 'The password needs at least 6 characters.',
          passEmpty: 'Type the new password first.',
          passMismatch: 'The two entries do not match. Check what you typed in both boxes.',
          passOk: 'Saved on this device for now — step 2 makes it stick',
          passLocalFail: 'We could not save it on this device, but finish step 2 and it will work everywhere.',
          passS2: 'Step 2 — so it works on every device',
          passS2X: 'The new password works on this device, in this session only. Step 2 is what makes it real: without it, any other device — and this one too, once you close the page — goes back to accepting the old password.',
          passFileLbl: 'The contents of password.js — copy all of it',
          passCopy: 'Copy the contents',
          passCopyOk: 'Copied — now open the link and paste it',
          passOpen: 'Open the password file on GitHub',
          passOpenNo: 'We cannot open the link automatically. Open your site repository on GitHub and go to the file password.js.',
          passHowHead: 'Exactly what to do after you copy:',
          passH1: '1) Tap “Open the password file on GitHub” above. If it asks you to sign in, sign in with your account.',
          passH2: '2) Above the file there is a pencil icon ✏️ (its name is Edit). Tap it so the file becomes editable.',
          passH3: '3) Press and hold inside the file text, choose “Select all”, and delete everything that is there.',
          passH4: '4) Press and hold again and choose “Paste”. The file should now hold exactly the text you copied and nothing else.',
          passH5: '5) Tap the green “Commit changes...” button at the top, then in the box that appears tap “Commit changes” once more.',
          passH6: '6) Wait one or two minutes, then open the site on any device — the new password is live.',
          passSafe: 'The text you copied does not contain the password itself, only a scrambled fingerprint of it. Nobody can read your password from it, so it is safe to keep in GitHub.',
          passSafePlain: 'This version contains the password itself, and files on GitHub can be read by anyone. Use a password you use only for this site.',
          passReuse: 'Never use a password you also use for your email, your bank, or any other account. Give this site a password of its own.',
          passGuard: 'Worth knowing: this password protects the control panel only. The panel edits a copy of your content inside whichever browser it is opened in; it cannot change what visitors see. The published content only changes when you push it to GitHub from your account.',
          passRedo: 'Open step 2 again',
          passRedoX: 'The file contents are kept for you during this session — no need to type the password again.',
          storeHead: 'Storage usage',
          storeX: 'Everything lives inside this browser. Large images are by far the biggest consumer of space.',
          storeUsed: 'Currently used: {n} KB',
          storeWarn: 'You are close to the limit — remove or shrink some large images.',
          storeOk: 'Plenty of room left.',
          storeCap: 'Safe limit in this browser: about {n} KB.',
          storeImgs: 'Uploaded photos: {c} photo(s) taking {n} KB.',
          storeImgsNone: 'No photos uploaded — everything is drawn by the site.',
          storeBar: 'Storage usage',
          storeFullWarn: 'Storage is almost full. Remove photos, or download a backup and reset.',
          notifyHead: 'Order notifications by email',
          notifyX: 'The site is static with no server, so notifications go through a free relay that emails you each order. The two best known are Web3Forms and Formspree.',
          notifyS1: '1) Open web3forms.com, type your email and press “Create Access Key” — the key arrives in your inbox.',
          notifyS2: '2) Paste that key into “Access key”, and put https://api.web3forms.com/submit into “Notification endpoint”.',
          notifyS3: '3) Prefer Formspree? Sign up at formspree.io, create a form, copy its URL (it looks like https://formspree.io/f/xxxxxxx) into the endpoint field and leave the key empty.',
          notifyS4: '4) Write your address in “Your receiving email” so it is here as a reminder.',
          notifyS5: '5) Press “Send a test” below and check that the message arrives (look in spam the first time).',
          notifyGo: 'The same fields live in the General settings tab under “Notifications”.',
          test: 'Send a test',
          testNone: 'Add the notification endpoint in the general settings first.',
          testSending: 'Sending…',
          testOk: 'Test message sent — check your inbox.',
          testErr: 'Sending failed ({n}). Check the endpoint and the key.',
          testNet: 'We could not reach the service. Check your connection and the endpoint URL.',
          testSubject: 'Test message from the Shosh Nail control panel',
          testBody: 'This is a test message sent by the Shosh Nail control panel to confirm that order notifications arrive. If you are reading it, the setup works.'
        }
      }
    }
  };

  if (SN.I18n && typeof SN.I18n.extend === 'function') SN.I18n.extend(DICT);

  /* ====================================================================== */
  /* 1. Tiny helpers                                                         */
  /* ====================================================================== */

  function el(tag, attrs, kids) { return SN.UI.el(tag, attrs, kids); }
  function icon(n, s) { return (SN.UI && SN.UI.icon) ? SN.UI.icon(n, s) : ''; }
  function t(k, v) { return (SN.I18n && SN.I18n.t) ? SN.I18n.t(k, v) : String(k); }
  function pick(o) {
    if (SN.I18n && SN.I18n.pick) return SN.I18n.pick(o);
    if (!o) return '';
    return typeof o === 'string' ? o : (o.ar || o.en || '');
  }
  function money(n) { return (SN.I18n && SN.I18n.money) ? SN.I18n.money(n) : String(n); }
  function lang() { return (SN.I18n && SN.I18n.lang === 'en') ? 'en' : 'ar'; }
  function toast(m, k) { if (SN.UI && SN.UI.toast) SN.UI.toast(m, k); }
  function confirmBox(m) {
    if (SN.UI && SN.UI.confirm) return SN.UI.confirm(m);
    return Promise.resolve(false);
  }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function str(v) { return v === null || v === undefined ? '' : String(v); }
  function trim(v) { return str(v).trim(); }
  function numOf(v, fb) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n) ? n : fb;
  }
  function empty(node) { if (node) { while (node.firstChild) node.removeChild(node.firstChild); } }
  function clone(v) {
    try { return JSON.parse(JSON.stringify(v)); }
    catch (e) { return null; }
  }

  function getIn(obj, path) {
    var p = str(path).split('.'), cur = obj, i;
    for (i = 0; i < p.length; i++) {
      if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
      cur = cur[p[i]];
    }
    return cur;
  }
  function setIn(obj, path, value) {
    var p = str(path).split('.'), cur = obj, i;
    if (!isObj(obj) || !p.length) return;
    for (i = 0; i < p.length - 1; i++) {
      if (!isObj(cur[p[i]])) cur[p[i]] = {};
      cur = cur[p[i]];
    }
    cur[p[p.length - 1]] = value;
  }

  /* store shortcuts, all null-safe */
  function sList(key) {
    var a = (SN.Store && SN.Store.list) ? SN.Store.list(key) : null;
    return Array.isArray(a) ? a : [];
  }
  function sGet(path, fb) { return (SN.Store && SN.Store.get) ? SN.Store.get(path, fb) : fb; }
  function sSet(path, v) { if (SN.Store && SN.Store.set) SN.Store.set(path, v); }

  var lastToastAt = 0;
  function savedToast() {
    var now = Date.now();
    if (now - lastToastAt < 1500) return;
    lastToastAt = now;
    toast(t('common.saved'), 'ok');
  }
  function flashSaved(node) {
    var host = node;
    while (host && host.classList && !host.classList.contains('adm-f')) host = host.parentNode;
    if (!host || !host.classList) host = node;
    if (!host || !host.classList) return;
    host.classList.remove('is-saved');
    /* force a reflow so the animation restarts on rapid edits */
    if (host.offsetWidth >= 0) host.classList.add('is-saved');
    setTimeout(function () {
      if (host && host.classList) host.classList.remove('is-saved');
    }, 900);
  }

  /* ====================================================================== */
  /* 2. Panel state                                                          */
  /* ====================================================================== */

  var TABS = [
    { id: 'general', ico: 'globe' },
    { id: 'home', ico: 'star' },
    { id: 'pricing', ico: 'cart' },
    { id: 'shapes', ico: 'nail' },
    { id: 'lengths', ico: 'arrow' },
    { id: 'colors', ico: 'brush' },
    { id: 'finishes', ico: 'sparkle' },
    { id: 'patterns', ico: 'grid' },
    { id: 'charms', ico: 'gem' },
    { id: 'skinTones', ico: 'hand' },
    { id: 'sizes', ico: 'ruler' },
    { id: 'designs', ico: 'image' },
    { id: 'faq', ico: 'search' },
    { id: 'payments', ico: 'shield' },
    { id: 'orders', ico: 'truck' },
    { id: 'backup', ico: 'download' }
  ];

  var S = {
    tab: 'general',
    open: {},          /* key+'/'+id -> true (expanded rows survive re-render) */
    q: {},             /* per-list search text */
    orderStatus: 'all',
    orderQ: '',
    navOpen: false,
    booted: false
  };

  var refs = { root: null, body: null, side: null, title: null, warn: null };

  function validTab(id) {
    var i;
    for (i = 0; i < TABS.length; i++) if (TABS[i].id === id) return true;
    return false;
  }

  function hashTab() {
    var h = str(location.hash).replace(/^#/, '');
    var m = /(?:^|&)tab=([A-Za-z]+)/.exec(h);
    return (m && validTab(m[1])) ? m[1] : null;
  }

  function goTab(id) {
    if (!validTab(id)) return;
    if (S.tab === id && hashTab() === id) { renderBody(); return; }
    S.tab = id;
    try { location.hash = 'tab=' + id; }
    catch (e) { renderBody(); }
  }

  /* ====================================================================== */
  /* 3. Option lists for <select> fields                                     */
  /* ====================================================================== */

  function optsFrom(values, prefix) {
    var out = [], i;
    for (i = 0; i < values.length; i++) out.push({ v: values[i], l: prefix ? (prefix + values[i]) : values[i] });
    return out;
  }
  function finishKindOpts() {
    var list = (SN.Nail && SN.Nail.FINISH_KINDS) || ['gloss', 'matte', 'glitter', 'chrome', 'velvet', 'jelly'];
    return namedOpts(list, 'admin.kind.');
  }
  function patternKindOpts() {
    var list = (SN.Nail && SN.Nail.PATTERN_KINDS) || ['none'];
    return namedOpts(list, 'admin.kind.');
  }
  function shapeIdList() {
    var list = (SN.Nail && SN.Nail.SHAPES) || ['almond'];
    return list.join(' · ');
  }
  /* one id -> the readable name, wherever a row summary shows it */
  function named(prefix, id) {
    var key = prefix + str(id), v = t(key);
    return v === key ? str(id) : v;
  }
  function groupName(g) { return named('admin.grp.', g); }
  function kindName(k) { return named('admin.kind.', k); }

  /* an id the data model needs, shown under a name the owner reads */
  function namedOpts(values, prefix) {
    var out = [], i, key, label;
    for (i = 0; i < values.length; i++) {
      key = prefix + values[i];
      label = t(key);
      out.push({ v: values[i], l: label === key ? values[i] : label });
    }
    return out;
  }
  function colorGroupOpts() {
    return namedOpts(['nude', 'pink', 'red', 'bold', 'dark', 'pastel', 'neutral'], 'admin.grp.');
  }
  function charmGroupOpts() {
    return namedOpts(['stones', 'stars', 'flowers', 'letters', 'hearts', 'misc'], 'admin.grp.');
  }
  function payIconOpts() {
    return optsFrom(['bank', 'card', 'wallet', 'cod', 'applepay']);
  }
  function uiIconOpts() {
    return optsFrom(['sparkle', 'brush', 'hand', 'ruler', 'gem', 'shield', 'truck', 'clock',
      'heart', 'star', 'check', 'image', 'grid', 'globe', 'phone', 'mail', 'nail']);
  }
  function themeOpts() {
    return [{ v: 'light', l: t('theme.light') }, { v: 'dark', l: t('theme.dark') }];
  }
  function faqCatOpts() {
    var list = sList('faqCats'), out = [], i;
    for (i = 0; i < list.length; i++) {
      if (isObj(list[i])) out.push({ v: str(list[i].id), l: pick(list[i].name) || str(list[i].id) });
    }
    if (!out.length) out.push({ v: '', l: t('common.none') });
    return out;
  }

  /* ====================================================================== */
  /* 4. Field engine                                                         */
  /* ====================================================================== */

  /* A field descriptor: {p:path, type, label:key, hint:key|string, opts:fn,
     min, max, step, ph:key, valid:fn, err:key, dir:'ltr'}                    */
  function F(p, type, label, extra) {
    var o = { p: p, type: type, label: label }, k;
    if (extra) { for (k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k]; } }
    return o;
  }

  function labelOf(f) {
    var v = str(f.label);
    if (!v) return '';
    return v.indexOf('.') === -1 ? v : t(v);
  }
  function hintOf(f) {
    var v = str(f.hint);
    if (!v) return '';
    return v.indexOf('.') === -1 ? v : t(v);
  }

  /* wraps one control in a labelled block */
  function fieldBox(f, kids, forId) {
    var hint = hintOf(f);
    return el('div', { 'class': 'field adm-f' }, [
      labelOf(f) ? el('label', { 'class': 'label', 'for': forId || null, text: labelOf(f) }) : null,
      kids,
      hint ? el('p', { 'class': 'hint', text: hint }) : null
    ]);
  }

  var fieldSeq = 0;
  function fid() { fieldSeq++; return 'adm-i' + fieldSeq; }

  /* commit helper shared by every text-ish control */
  function bindText(node, f, ctx, read) {
    var errBox = null;
    function write() {
      var raw = read(node);
      var cur = ctx.get(f.p);
      var ok = true;
      if (typeof f.valid === 'function' && trim(raw) !== '') ok = !!f.valid(raw);
      if (errBox) errBox.textContent = ok ? '' : t(f.err || 'common.invalid');
      node.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok) return;
      if (str(cur) === str(raw)) return;
      ctx.set(f.p, raw);
      flashSaved(node);
      savedToast();
      if (typeof ctx.after === 'function') ctx.after(f.p, raw);
    }
    var deb = SN.UI.debounce(write, 450);
    node.addEventListener('input', function () { deb(); }, false);
    node.addEventListener('change', function () { deb.cancel(); write(); }, false);
    node.addEventListener('blur', function () { deb.cancel(); write(); }, false);
    return {
      setErrBox: function (b) { errBox = b; },
      flush: function () { deb.cancel(); write(); }
    };
  }

  function textInput(f, ctx, path, dir) {
    var id = fid();
    var node = el('input', {
      'class': 'input', type: f.inputType || 'text', id: id,
      dir: dir || null,
      placeholder: f.ph ? t(f.ph) : null,
      autocomplete: 'off', spellcheck: 'false'
    });
    node.value = str(ctx.get(path));
    return { node: node, id: id };
  }

  function areaInput(f, ctx, path, dir) {
    var id = fid();
    var node = el('textarea', { 'class': 'textarea', id: id, dir: dir || null, rows: f.rows || 4 });
    node.value = str(ctx.get(path));
    return { node: node, id: id };
  }

  /* T-object: Arabic + English side by side */
  function tField(f, ctx, area) {
    var mkAr = area ? areaInput : textInput;
    var ar = mkAr({ p: f.p + '.ar', ph: f.ph, rows: f.rows }, ctx, f.p + '.ar', 'rtl');
    var en = mkAr({ p: f.p + '.en', ph: f.ph, rows: f.rows }, ctx, f.p + '.en', 'ltr');
    var fa = { p: f.p + '.ar', valid: f.valid, err: f.err };
    var fe = { p: f.p + '.en', valid: f.valid, err: f.err };
    bindText(ar.node, fa, ctx, function (n) { return n.value; });
    bindText(en.node, fe, ctx, function (n) { return n.value; });
    return fieldBox(f, el('div', { 'class': 'adm-pair' }, [
      el('div', { 'class': 'adm-lang' }, [
        el('label', { 'class': 'adm-tag', 'for': ar.id, text: 'ع' }),
        ar.node
      ]),
      el('div', { 'class': 'adm-lang' }, [
        el('label', { 'class': 'adm-tag', 'for': en.id, text: 'EN' }),
        en.node
      ])
    ]));
  }

  function plainField(f, ctx, area) {
    var box = area ? areaInput(f, ctx, f.p, f.dir) : textInput(f, ctx, f.p, f.dir);
    var errBox = el('span', { 'class': 'field-err' });
    var b = bindText(box.node, f, ctx, function (n) { return n.value; });
    b.setErrBox(errBox);
    return fieldBox(f, [box.node, errBox], box.id);
  }

  function numField(f, ctx) {
    var id = fid();
    var node = el('input', {
      'class': 'input adm-num', type: 'number', id: id, inputmode: 'decimal',
      min: f.min !== undefined ? f.min : null,
      max: f.max !== undefined ? f.max : null,
      step: f.step !== undefined ? f.step : 1
    });
    var cur = numOf(ctx.get(f.p), f.def !== undefined ? f.def : 0);
    node.value = String(cur);
    bindText(node, f, ctx, function (n) {
      var v = numOf(n.value, NaN);
      if (!isFinite(v)) v = f.def !== undefined ? f.def : 0;
      if (f.min !== undefined && v < f.min) v = f.min;
      if (f.max !== undefined && v > f.max) v = f.max;
      if (f.int) v = Math.round(v);
      return v;
    });
    return fieldBox(f, node, id);
  }

  function hexOk(v) { return /^#[0-9a-fA-F]{6}$/.test(trim(v)); }
  function normHex(v) {
    var s = trim(v);
    if (/^[0-9a-fA-F]{6}$/.test(s)) s = '#' + s;
    if (/^#[0-9a-fA-F]{3}$/.test(s)) s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    return hexOk(s) ? s.toUpperCase() : '';
  }

  function colorField(f, ctx) {
    var id = fid();
    var cur = normHex(ctx.get(f.p)) || '#CCCCCC';
    var swatch = el('input', { 'class': 'input adm-cin', type: 'color', id: id, value: cur });
    var hex = el('input', {
      'class': 'input adm-hex', type: 'text', dir: 'ltr',
      autocomplete: 'off', spellcheck: 'false', maxlength: 7, value: cur
    });
    var errBox = el('span', { 'class': 'field-err' });

    function apply(v, from) {
      var h = normHex(v);
      if (!h) { errBox.textContent = t('admin.errHex'); return; }
      errBox.textContent = '';
      if (from !== 'swatch') swatch.value = h;
      if (from !== 'hex') hex.value = h;
      if (str(ctx.get(f.p)).toUpperCase() === h) return;
      ctx.set(f.p, h);
      flashSaved(hex);
      savedToast();
      if (typeof ctx.after === 'function') ctx.after(f.p, h);
    }
    swatch.addEventListener('input', SN.UI.debounce(function () { apply(swatch.value, 'swatch'); }, 220), false);
    swatch.addEventListener('change', function () { apply(swatch.value, 'swatch'); }, false);
    hex.addEventListener('change', function () { apply(hex.value, 'hex'); }, false);
    hex.addEventListener('blur', function () { apply(hex.value, 'hex'); }, false);

    return fieldBox(f, [el('div', { 'class': 'adm-colrow' }, [swatch, hex]), errBox], id);
  }

  function selectField(f, ctx) {
    var id = fid();
    var opts = typeof f.opts === 'function' ? f.opts() : (f.opts || []);
    var node = el('select', { 'class': 'select', id: id });
    var cur = str(ctx.get(f.p)), i, found = false;
    for (i = 0; i < opts.length; i++) {
      node.appendChild(el('option', { value: opts[i].v, text: str(opts[i].l) }));
      if (str(opts[i].v) === cur) found = true;
    }
    if (!found && cur) node.appendChild(el('option', { value: cur, text: cur }));
    node.value = cur;
    node.addEventListener('change', function () {
      if (str(ctx.get(f.p)) === node.value) return;
      ctx.set(f.p, node.value);
      flashSaved(node);
      savedToast();
      if (typeof ctx.after === 'function') ctx.after(f.p, node.value);
    }, false);
    return fieldBox(f, node, id);
  }

  function boolField(f, ctx) {
    var box = el('input', { type: 'checkbox' });
    var lbl = el('label', { 'class': 'switch' }, [
      box,
      el('span', { 'aria-hidden': 'true' }),
      el('span', { 'class': 'switch-lbl', text: labelOf(f) })
    ]);
    var hint = hintOf(f);
    box.checked = !!ctx.get(f.p);
    box.addEventListener('change', function () {
      ctx.set(f.p, !!box.checked);
      flashSaved(lbl);
      savedToast();
      if (typeof ctx.after === 'function') ctx.after(f.p, !!box.checked);
    }, false);
    return el('div', { 'class': 'field adm-f adm-f-bool' }, [
      lbl,
      hint ? el('p', { 'class': 'hint', text: hint }) : null
    ]);
  }

  /* array of plain strings, rendered as removable chips */
  function tagsField(f, ctx) {
    var wrap = el('div', { 'class': 'adm-tags' });
    var input = el('input', {
      'class': 'input adm-taginput', type: 'text',
      placeholder: t('admin.d.tagsPh'), autocomplete: 'off'
    });

    function list() {
      var v = ctx.get(f.p);
      return Array.isArray(v) ? v : [];
    }
    function commit(next) {
      ctx.set(f.p, next);
      savedToast();
      paint();
      if (typeof ctx.after === 'function') ctx.after(f.p, next);
    }
    function paint() {
      var arr = list(), i;
      empty(wrap);
      for (i = 0; i < arr.length; i++) {
        (function (idx) {
          wrap.appendChild(el('span', { 'class': 'chip adm-chip' }, [
            el('span', { text: str(arr[idx]) }),
            el('button', {
              'class': 'adm-chip-x', type: 'button',
              'aria-label': t('admin.d.tagDel') + ': ' + str(arr[idx]),
              html: icon('close', 12),
              on: { click: function () {
                var next = list().slice();
                next.splice(idx, 1);
                commit(next);
              } }
            })
          ]));
        }(i));
      }
      if (!arr.length) wrap.appendChild(el('span', { 'class': 'hint', text: t('common.none') }));
    }
    function add() {
      var v = trim(input.value), arr = list().slice(), i;
      if (!v) return;
      for (i = 0; i < arr.length; i++) { if (str(arr[i]) === v) { input.value = ''; return; } }
      arr.push(v);
      input.value = '';
      commit(arr);
    }
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.keyCode === 13) { ev.preventDefault(); add(); }
    }, false);
    paint();

    return fieldBox(f, [
      wrap,
      el('div', { 'class': 'adm-tagadd' }, [
        input,
        el('button', {
          'class': 'btn btn-line btn-sm', type: 'button', text: t('admin.d.tagAdd'),
          on: { click: add }
        })
      ])
    ]);
  }

  /* array of T-objects (measureMethods.steps) */
  function tlistField(f, ctx) {
    var host = el('div', { 'class': 'adm-tlist' });

    function list() {
      var v = ctx.get(f.p);
      return Array.isArray(v) ? v : [];
    }
    function commit(next) {
      ctx.set(f.p, next);
      savedToast();
      if (typeof ctx.after === 'function') ctx.after(f.p, next);
    }
    function paint() {
      var arr = list(), i;
      empty(host);
      for (i = 0; i < arr.length; i++) {
        (function (idx) {
          var item = isObj(arr[idx]) ? arr[idx] : { ar: str(arr[idx]), en: '' };
          var ar = el('input', { 'class': 'input', type: 'text', dir: 'rtl', value: str(item.ar) });
          var en = el('input', { 'class': 'input', type: 'text', dir: 'ltr', value: str(item.en) });
          function save() {
            var next = list().slice();
            next[idx] = { ar: ar.value, en: en.value };
            ctx.set(f.p, next);
            savedToast();
          }
          var deb = SN.UI.debounce(save, 450);
          ar.addEventListener('input', function () { deb(); }, false);
          en.addEventListener('input', function () { deb(); }, false);
          ar.addEventListener('blur', function () { deb.cancel(); save(); }, false);
          en.addEventListener('blur', function () { deb.cancel(); save(); }, false);

          host.appendChild(el('div', { 'class': 'adm-tlrow' }, [
            el('span', { 'class': 'adm-tlno', text: String(idx + 1) }),
            el('div', { 'class': 'adm-pair' }, [
              el('div', { 'class': 'adm-lang' }, [el('span', { 'class': 'adm-tag', text: 'ع' }), ar]),
              el('div', { 'class': 'adm-lang' }, [el('span', { 'class': 'adm-tag', text: 'EN' }), en])
            ]),
            el('div', { 'class': 'adm-tlact' }, [
              iconBtn('undo', t('admin.up'), function () {
                var next = list().slice(), tmp;
                if (idx <= 0) return;
                tmp = next[idx - 1]; next[idx - 1] = next[idx]; next[idx] = tmp;
                commit(next); paint();
              }, 'adm-mini'),
              iconBtn('redo', t('admin.down'), function () {
                var next = list().slice(), tmp;
                if (idx >= next.length - 1) return;
                tmp = next[idx + 1]; next[idx + 1] = next[idx]; next[idx] = tmp;
                commit(next); paint();
              }, 'adm-mini'),
              iconBtn('trash', t('common.delete'), function () {
                var next = list().slice();
                next.splice(idx, 1);
                commit(next); paint();
              }, 'adm-mini adm-danger')
            ])
          ]));
        }(i));
      }
      if (!arr.length) host.appendChild(el('p', { 'class': 'hint', text: t('common.none') }));
      host.appendChild(el('button', {
        'class': 'btn btn-line btn-sm adm-tladd', type: 'button',
        on: { click: function () {
          var next = list().slice();
          next.push({ ar: '', en: '' });
          commit(next); paint();
        } }
      }, [
        el('span', { 'class': 'adm-bico', html: icon('plus', 15), 'aria-hidden': 'true' }),
        el('span', { text: t('common.add') })
      ]));
    }
    paint();
    return fieldBox(f, host);
  }

  /* image field: preview + upload + url + clear */
  /* The image control. One implementation behind every photo on the site:
     a thumbnail, its real weight in KB, an upload, a paste-a-link box, and a
     clear button that always returns to the drawn/rendered default.
     `f.maxPx` decides how hard it is shrunk. */
  function imageField(f, ctx) {
    var maxPx = numOf(f.maxPx, MAX_DESIGN);
    var pv = el('div', { 'class': 'adm-imgpv' });
    var meta = el('p', { 'class': 'adm-imgmeta hint' });
    var file = el('input', { 'class': 'sr-only adm-file', type: 'file', accept: 'image/*' });
    var upBtn, clearBtn, url;

    function setMeta(w, h) {
      var v = str(ctx.get(f.p));
      if (!v) { meta.textContent = t('admin.img.none'); meta.classList.remove('is-on'); return; }
      meta.classList.add('is-on');
      meta.textContent = t('admin.img.meta', {
        n: Math.max(1, kbOf(v.length)),
        w: numOf(w, 0) || '?',
        h: numOf(h, 0) || '?'
      });
    }

    function paint() {
      var v = str(ctx.get(f.p)), im;
      empty(pv);
      if (v) {
        im = el('img', { src: v, alt: '', loading: 'lazy' });
        im.addEventListener('load', function () { setMeta(im.naturalWidth, im.naturalHeight); }, false);
        pv.appendChild(im);
        pv.classList.add('is-on');
      } else {
        pv.appendChild(el('span', { 'class': 'adm-imgno', html: icon('image', 22) }));
        pv.classList.remove('is-on');
      }
      setMeta(0, 0);
      if (upBtn) upBtn.querySelector('.adm-blbl').textContent = v ? t('admin.img.replace') : t('admin.img.upload');
      if (clearBtn) clearBtn.disabled = !v;
    }

    function put(v, quiet) {
      if (!putImage(ctx, f.p, v)) { url.value = str(ctx.get(f.p)); return false; }
      url.value = str(ctx.get(f.p));
      paint();
      if (typeof ctx.after === 'function') ctx.after(f.p, v);
      if (!quiet) savedToast();
      return true;
    }

    url = el('input', {
      'class': 'input adm-imgurl', type: 'text', dir: 'ltr',
      placeholder: 'data:image/… , https://…',
      'aria-label': t('admin.img.urlLbl'),
      autocomplete: 'off', value: str(ctx.get(f.p))
    });
    url.addEventListener('change', function () { put(trim(url.value)); }, false);

    file.addEventListener('change', function () {
      var fl = file.files && file.files[0];
      if (!fl) return;
      file.value = '';
      if (!/^image\//.test(str(fl.type))) { toast(t('admin.img.type'), 'err'); return; }
      meta.textContent = t('admin.img.working');
      downscale(fl, maxPx).then(function (res) {
        if (put(res.url, true)) toast(t('admin.img.ok', { n: Math.max(1, kbOf(res.chars)) }), 'ok');
        else paint();
      }).catch(function () {
        toast(t('admin.img.err'), 'err');
        paint();
      });
    }, false);

    upBtn = el('button', {
      'class': 'btn btn-line btn-sm adm-imgup', type: 'button',
      on: { click: function () { file.click(); } }
    }, [
      el('span', { 'class': 'adm-bico', html: icon('image', 15), 'aria-hidden': 'true' }),
      el('span', { 'class': 'adm-blbl', text: t('admin.img.upload') })
    ]);

    clearBtn = el('button', {
      'class': 'btn btn-ghost btn-sm adm-danger-t', type: 'button', text: t('admin.img.clear'),
      on: { click: function () { put('', true); toast(t('common.deleted'), 'ok'); } }
    });

    paint();

    return fieldBox(f, [
      el('div', { 'class': 'adm-imgrow' }, [
        pv,
        el('div', { 'class': 'adm-imgact' }, [
          meta,
          el('div', { 'class': 'adm-btnrow' }, [upBtn, clearBtn]),
          file
        ])
      ]),
      url,
      el('p', { 'class': 'hint adm-imgshrink', text: t('admin.img.shrink', { n: maxPx }) })
    ]);
  }

  function renderField(f, ctx) {
    switch (f.type) {
      case 't': return tField(f, ctx, false);
      case 'tarea': return tField(f, ctx, true);
      case 'text': return plainField(f, ctx, false);
      case 'area': return plainField(f, ctx, true);
      case 'num': return numField(f, ctx);
      case 'color': return colorField(f, ctx);
      case 'select': return selectField(f, ctx);
      case 'bool': return boolField(f, ctx);
      case 'tags': return tagsField(f, ctx);
      case 'tlist': return tlistField(f, ctx);
      case 'image': return imageField(f, ctx);
      case 'art': return artField(f, ctx);
      default: return null;
    }
  }

  function renderFields(fields, ctx, cls) {
    var box = el('div', { 'class': 'adm-fields' + (cls ? ' ' + cls : '') }), i, n;
    for (i = 0; i < fields.length; i++) {
      n = renderField(fields[i], ctx);
      if (n) {
        if (fields[i].wide) n.classList.add('adm-wide');
        box.appendChild(n);
      }
    }
    return box;
  }

  /* ====================================================================== */
  /* 5. Real photographs: storage budget, downscaling, the image control      */
  /*                                                                         */
  /*  «العميلة تستلم اللي شافته» — the whole point of this block. The owner    */
  /*  can attach a real photograph to a colour, a finish, a pattern, a        */
  /*  decoration and a ready-made design, so the customer is looking at the   */
  /*  actual polish and the actual charm, not only at our drawing.            */
  /*                                                                         */
  /*  Every photo lives in localStorage as a data-url, alongside the rest of  */
  /*  the content. That is a small, hard, per-browser box — around 5 MB — so  */
  /*  three rules apply to every single upload:                               */
  /*    1. shrink it on a canvas first (240px for swatches and charms, 900px  */
  /*       for a whole design), re-encoded as JPEG at 0.82, and PNG only when */
  /*       the source really carries transparency;                            */
  /*    2. refuse an upload that would not fit, with the numbers spelled out, */
  /*       instead of letting the browser throw QuotaExceededError;           */
  /*    3. after writing, verify the browser actually kept it, and roll the   */
  /*       old value back if it did not.                                      */
  /* ====================================================================== */

  var LS_KEY      = 'shosh2-nail-v1';
  var BUDGET_MAX  = 4700 * 1024;   /* an upload past this is refused outright */
  var BUDGET_WARN = 4096 * 1024;   /* ~4 MB: start warning him               */
  var JPEG_Q      = 0.82;
  var MAX_SWATCH  = 240;           /* colours, finishes, patterns, charms    */
  var MAX_DESIGN  = 900;           /* a whole ready-made set                 */

  function kbOf(chars) { return Math.round(numOf(chars, 0) / 1024); }

  /* how many characters the whole content weighs right now */
  function stateChars() {
    try { return str(JSON.stringify(SN.Store.state)).length; }
    catch (e) { return 0; }
  }

  /* how many characters actually made it into localStorage */
  function lsChars() {
    var v;
    try { v = window.localStorage.getItem(LS_KEY); }
    catch (e) { return 0; }
    return v ? String(v).length : 0;
  }

  function budgetLeft() { return BUDGET_MAX - stateChars(); }

  function isDataImage(v) { return typeof v === 'string' && v.slice(0, 11) === 'data:image/'; }

  /* Walks the saved content and totals every embedded photo, so the backup
     tab can tell him what the photos actually cost him. Depth-limited: the
     content tree is shallow, and a cycle must never hang the panel. */
  function imageAudit() {
    var out = { count: 0, chars: 0 };
    function walk(v, depth) {
      var i, k;
      if (depth > 8 || !v) return;
      if (typeof v === 'string') {
        if (isDataImage(v)) { out.count++; out.chars += v.length; }
        return;
      }
      if (Array.isArray(v)) {
        for (i = 0; i < v.length; i++) walk(v[i], depth + 1);
        return;
      }
      if (typeof v === 'object') {
        for (k in v) { if (Object.prototype.hasOwnProperty.call(v, k)) walk(v[k], depth + 1); }
      }
    }
    try { walk(SN.Store.state, 0); }
    catch (e) { /* a corrupt branch must not break the meter */ }
    return out;
  }

  /* True when the last save really landed. A browser that refuses to store
     (quota, or Safari private mode) leaves the old, shorter string behind.
     When localStorage is unavailable altogether we cannot verify anything —
     say yes rather than punish an upload we have no evidence against. */
  function writeLanded() {
    var got = lsChars();
    if (!got) return true;
    return got >= stateChars() - 64;
  }

  /* THE one way a photograph is written. Returns true when it stuck. */
  function putImage(ctx, path, url) {
    var old = str(ctx.get(path));
    var need, free;
    url = str(url);
    if (url === old) return true;
    if (url) {
      need = url.length - old.length;
      free = budgetLeft();
      if (need > free) {
        toast(t('admin.img.full', { n: kbOf(url.length), r: Math.max(0, kbOf(free)) }), 'err');
        return false;
      }
    }
    ctx.set(path, url);
    if (url && !writeLanded()) {
      ctx.set(path, old);
      toast(t('admin.img.rejected'), 'err');
      return false;
    }
    if (url && stateChars() > BUDGET_WARN) toast(t('admin.img.warnNear'), 'info');
    return true;
  }

  /* ---------------------------------------------------------------------- */
  /* Downscaling. -> Promise<{url, chars, w, h, png}>                         */
  /*                                                                         */
  /*  Transparency decides the format, not the file extension: a PNG shot on  */
  /*  a phone is opaque and becomes a JPEG a quarter of the size, while a cut- */
  /*  out charm on a transparent background stays a PNG so it does not gain a */
  /*  white box on the nail.                                                  */
  /* ---------------------------------------------------------------------- */

  function hasAlpha(cx, w, h) {
    var data, i, step;
    try { data = cx.getImageData(0, 0, w, h).data; }
    catch (e) { return true; }   /* cannot look: keep the safe format */
    /* every 7th pixel is plenty to spot a cut-out, and stays fast on a phone */
    step = 4 * 7;
    for (i = 3; i < data.length; i += step) { if (data[i] < 250) return true; }
    return false;
  }

  function downscale(file, maxPx) {
    return new Promise(function (resolve, reject) {
      var fr;
      maxPx = numOf(maxPx, MAX_DESIGN);
      if (!file || typeof FileReader === 'undefined') { reject(new Error('no-file')); return; }
      fr = new FileReader();
      fr.onerror = function () { reject(new Error('read')); };
      fr.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('decode')); };
        img.onload = function () {
          try {
            var w = img.naturalWidth || img.width;
            var h = img.naturalHeight || img.height;
            var sc = 1, cw, ch, cv, cx, maybeAlpha, png, url;
            if (!w || !h) { reject(new Error('size')); return; }
            if (Math.max(w, h) > maxPx) sc = maxPx / Math.max(w, h);
            cw = Math.max(1, Math.round(w * sc));
            ch = Math.max(1, Math.round(h * sc));
            cv = D.createElement('canvas');
            cv.width = cw; cv.height = ch;
            cx = cv.getContext ? cv.getContext('2d') : null;
            if (!cx) { reject(new Error('canvas')); return; }

            /* only these can carry an alpha channel at all */
            maybeAlpha = /png|webp|gif|svg|avif/i.test(str(file.type));
            cx.drawImage(img, 0, 0, cw, ch);
            png = maybeAlpha ? hasAlpha(cx, cw, ch) : false;

            if (!png) {
              /* JPEG has no alpha: composite on white first, or Chrome and
                 Safari disagree about what shows through. */
              cx.clearRect(0, 0, cw, ch);
              cx.fillStyle = '#FFFFFF';
              cx.fillRect(0, 0, cw, ch);
              cx.drawImage(img, 0, 0, cw, ch);
            }
            url = cv.toDataURL(png ? 'image/png' : 'image/jpeg', JPEG_Q);
            if (!isDataImage(url)) { reject(new Error('encode')); return; }
            resolve({ url: url, chars: url.length, w: cw, h: ch, png: png });
          } catch (e) { reject(e); }
        };
        img.src = String(fr.result);
      };
      try { fr.readAsDataURL(file); }
      catch (e) { reject(e); }
    });
  }


  /* ====================================================================== */
  /* 5b. SN.Art — the drawn decoration library                               */
  /*                                                                         */
  /*  A decoration can be three things, and the render engine tries them in   */
  /*  this order: `art` (a vector id drawn by SN.Art), `image` (a real photo) */
  /*  and `glyph` (the emoji fallback). This block gives the owner a visual   */
  /*  picker over the vector library, so «add a new decoration» never means   */
  /*  «type an id you had to read out of a source file».                      */
  /* ====================================================================== */

  var NS_SVG = 'http://www.w3.org/2000/svg';
  var artTried = false;
  var artDefsDone = false;

  function artOn() {
    return !!(SN.Art && typeof SN.Art.node === 'function' &&
      Array.isArray(SN.Art.LIST) && SN.Art.LIST.length);
  }

  /* nail-art.js is a first-party file in this repository, but admin.html is
     not ours to edit. Pull it in on demand: same origin, no build step, no
     module, and a complete no-op the moment the page already carries the
     <script> tag itself. Loading it lazily also keeps it off every other tab. */
  function artLoad(cb) {
    var s;
    if (artOn()) { cb(true); return; }
    if (artTried) { cb(false); return; }
    artTried = true;
    try {
      s = D.createElement('script');
      s.src = 'assets/js/nail-art.js';
      s.async = false;
      s.onload = function () { cb(artOn()); };
      s.onerror = function () { cb(false); };
      D.head.appendChild(s);
    } catch (e) { cb(false); }
  }

  /* SN.Art draws its bevels with a block of SHARED gradients whose ids are
     stable. One copy anywhere in the document resolves every url(#sna-…) on
     the page, so the picker grid costs one block, not one per tile. */
  function ensureArtDefs() {
    var svg, defs;
    if (artDefsDone || !artOn() || typeof SN.Art.defs !== 'function' || !D.body) return;
    try {
      defs = SN.Art.defs();
      if (!defs) return;
      svg = D.createElementNS(NS_SVG, 'svg');
      svg.setAttribute('class', 'adm-artdefs');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('width', '0');
      svg.setAttribute('height', '0');
      svg.appendChild(defs);
      D.body.appendChild(svg);
      artDefsDone = true;
    } catch (e) { /* flat art is still art */ }
  }

  /* 'letter:ش' / 'letter-silver:A' carry their character inside the id */
  var ART_LETTER = /^(letter|letter-silver):([\s\S]{1,2})$/;
  function artBase(id) { var m = ART_LETTER.exec(str(id)); return m ? m[1] : str(id); }
  function artChar(id) { var m = ART_LETTER.exec(str(id)); return m ? m[2] : ''; }

  function artEntry(id) {
    var list = artOn() ? SN.Art.LIST : [], base = artBase(id), i;
    for (i = 0; i < list.length; i++) {
      if (isObj(list[i]) && str(list[i].id) === base) return list[i];
    }
    return null;
  }
  function artIsLetter(id) { return artBase(id).indexOf('letter') === 0; }
  function artName(id) {
    var e = artEntry(id), ch = artChar(id);
    if (!e) return str(id);
    return pick(e.name) + (ch ? ' « ' + ch + ' »' : '');
  }
  function artGroupName(g) {
    var k = 'admin.art.groups.' + g, v = t(k);
    return v === k ? g : v;
  }

  /* one library drawing as a standalone <svg>, sized in CSS pixels */
  function artSVG(id, px) {
    var svg = D.createElementNS(NS_SVG, 'svg'), node;
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('width', String(px));
    svg.setAttribute('height', String(px));
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    if (!artOn()) return svg;
    ensureArtDefs();
    try {
      node = SN.Art.node(artBase(id), { char: artChar(id) || 'ش', seed: str(id) });
      if (node) svg.appendChild(node);
    } catch (e) { /* a broken id must never break the grid */ }
    return svg;
  }

  /* -------------------------------------------------------- picker modal */
  function buildArtPicker(current, onPick) {
    var grid   = el('div', { 'class': 'adm-artgrid' });
    var chips  = el('div', { 'class': 'chips adm-artchips' });
    var q      = el('input', { 'class': 'input', type: 'search', placeholder: t('admin.art.searchPh') });
    var ch     = el('input', {
      'class': 'input adm-artchar', type: 'text', maxlength: '2',
      value: artChar(current) || 'ش', 'aria-label': t('admin.art.letter')
    });
    var letterBox;
    var group = artIsLetter(current) ? 'letters' : 'all';
    var m;

    /* the character box only makes sense for the two letter generators, so it
       stays out of the way until he is actually looking at them */
    function syncLetter() {
      if (!letterBox) return;
      if (group === 'letters') letterBox.classList.remove('adm-hide');
      else letterBox.classList.add('adm-hide');
    }

    function idFor(item) {
      var base = str(item.id);
      if (base.indexOf('letter') !== 0) return base;
      return base + ':' + (trim(ch.value).slice(0, 2) || 'ش');
    }

    function paintGrid() {
      var list = artOn() ? SN.Art.LIST : [], needle = trim(q.value).toLowerCase(), i, it, shown = 0;
      empty(grid);
      for (i = 0; i < list.length; i++) {
        it = list[i];
        if (!isObj(it)) continue;
        if (group !== 'all' && str(it.group) !== group) continue;
        if (needle && (pick(it.name) + ' ' + str(it.id)).toLowerCase().indexOf(needle) === -1) continue;
        shown++;
        (function (item) {
          var id = idFor(item);
          grid.appendChild(el('button', {
            'class': 'adm-arttile' + (artBase(current) === str(item.id) ? ' is-on' : ''),
            type: 'button', title: pick(item.name),
            on: { click: function () { onPick(idFor(item)); if (m && m.close) m.close(); } }
          }, [
            artSVG(id, 46),
            el('span', { 'class': 'adm-arttl', text: pick(item.name) })
          ]));
        }(it));
      }
      if (!shown) grid.appendChild(emptyBox(t('admin.art.noMatch'), ''));
    }

    (function () {
      var groups = ['all'].concat((artOn() && SN.Art.GROUPS) || []), i;
      for (i = 0; i < groups.length; i++) {
        (function (g) {
          chips.appendChild(el('button', {
            'class': 'chip' + (group === g ? ' chip-on' : ''), type: 'button',
            text: g === 'all' ? t('common.all') : artGroupName(g),
            on: { click: function () {
              group = g;
              var bs = chips.querySelectorAll('.chip'), i2;
              for (i2 = 0; i2 < bs.length; i2++) bs[i2].classList.remove('chip-on');
              this.classList.add('chip-on');
              syncLetter();
              paintGrid();
            } }
          }));
        }(groups[i]));
      }
    }());

    letterBox = el('div', { 'class': 'field adm-artletter adm-hide' }, [
      el('span', { 'class': 'label', text: t('admin.art.letter') }),
      ch,
      el('p', { 'class': 'hint', text: t('admin.art.letterX') })
    ]);
    syncLetter();

    q.addEventListener('input', SN.UI.debounce(paintGrid, 180), false);
    ch.addEventListener('input', SN.UI.debounce(paintGrid, 180), false);
    paintGrid();

    m = SN.UI.modal({
      size: 'lg',
      title: t('admin.art.title'),
      body: el('div', { 'class': 'adm-artpick' }, [
        el('div', { 'class': 'search adm-artsearch' }, [
          el('span', { 'class': 'search-ico', html: icon('search', 16), 'aria-hidden': 'true' }),
          q
        ]),
        chips,
        letterBox,
        grid
      ]),
      actions: [{ label: t('common.cancel'), cls: 'btn-ghost' }]
    });
    return m;
  }

  function openArtPicker(current, onPick) {
    artLoad(function (ok) {
      if (!ok) { toast(t('admin.art.off'), 'err'); return; }
      ensureArtDefs();
      buildArtPicker(current, onPick);
    });
  }

  /* --------------------------------------------------------- art control */
  function artControl(get, set) {
    var pv      = el('span', { 'class': 'adm-artpv' });
    var nameEl  = el('span', { 'class': 'adm-artname' });
    var pickBtn, clearBtn, box;

    function paint() {
      var v = str(get());
      empty(pv);
      if (v && artOn()) pv.appendChild(artSVG(v, 40));
      else pv.appendChild(el('span', { 'class': 'adm-imgno', html: icon('sparkle', 18) }));
      nameEl.textContent = v ? artName(v) : t('admin.art.none');
      pickBtn.querySelector('.adm-blbl').textContent = v ? t('admin.art.change') : t('admin.art.pick');
      clearBtn.disabled = !v;
    }

    pickBtn = el('button', {
      'class': 'btn btn-line btn-sm', type: 'button',
      on: { click: function () {
        openArtPicker(str(get()), function (id) { set(id); paint(); });
      } }
    }, [
      el('span', { 'class': 'adm-bico', html: icon('gem', 15), 'aria-hidden': 'true' }),
      el('span', { 'class': 'adm-blbl', text: t('admin.art.pick') })
    ]);

    clearBtn = el('button', {
      'class': 'btn btn-ghost btn-sm adm-danger-t', type: 'button', text: t('admin.art.clear'),
      on: { click: function () { set(''); paint(); } }
    });

    box = el('div', { 'class': 'adm-artf' }, [
      pv,
      el('div', { 'class': 'adm-artinfo' }, [
        nameEl,
        el('div', { 'class': 'adm-btnrow' }, [pickBtn, clearBtn])
      ])
    ]);
    paint();
    /* the library is lazy: repaint the tile once it has actually arrived */
    if (str(get())) artLoad(function () { paint(); });
    return box;
  }

  function artField(f, ctx) {
    return fieldBox(f, artControl(
      function () { return ctx.get(f.p); },
      function (v) {
        ctx.set(f.p, v);
        savedToast();
        if (typeof ctx.after === 'function') ctx.after(f.p, v);
      }
    ));
  }

  /* ====================================================================== */
  /* 6. Small building blocks                                                */
  /* ====================================================================== */

  function iconBtn(name, label, onClick, cls) {
    return el('button', {
      'class': 'icon-btn icon-btn-sm ' + (cls || ''), type: 'button',
      'aria-label': label, title: label,
      html: icon(name, 16),
      on: { click: onClick }
    });
  }

  function sectionHead(title, sub) {
    return el('div', { 'class': 'adm-sechead' }, [
      el('h3', { 'class': 'h4 display', text: title }),
      sub ? el('p', { 'class': 'hint', text: sub }) : null
    ]);
  }

  function card(kids, cls) {
    return el('section', { 'class': 'adm-card' + (cls ? ' ' + cls : '') }, kids);
  }

  function emptyBox(title, hint) {
    return el('div', { 'class': 'empty' }, [
      el('span', { 'class': 'empty-ico', html: icon('sparkle', 26), 'aria-hidden': 'true' }),
      el('p', { 'class': 'empty-t', text: title }),
      hint ? el('p', { 'class': 'empty-x muted', text: hint }) : null
    ]);
  }

  /* mini nail render used as a live preview inside collection rows */
  function nailChip(nail, opts) {
    var box = el('span', { 'class': 'adm-nailpv' });
    var svg;
    if (!SN.Nail || typeof SN.Nail.single !== 'function') return box;
    try {
      svg = SN.Nail.single(nail, { shape: (opts && opts.shape) || 'almond', length: (opts && opts.length) || 'medium' }, {
        w: 40, bg: false,
        shape: (opts && opts.shape) || 'almond',
        length: (opts && opts.length) || 'medium',
        natural: true
      });
      if (svg) box.appendChild(svg);
    } catch (e) { /* a bad shape id must never break the row */ }
    return box;
  }

  function baseNail(extra) {
    var n = {
      color: '#E9C2C0', finish: 'gloss',
      pattern: { kind: 'none', color: '#FFFFFF', color2: '#E8B4C8', scale: 1 },
      charms: []
    }, k;
    if (extra) { for (k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) n[k] = extra[k]; } }
    return n;
  }

  function swatchChip(hex, hex2) {
    return el('span', {
      'class': 'adm-sw',
      style: hex2
        ? { background: 'linear-gradient(135deg,' + str(hex) + ' 0 55%,' + str(hex2) + ' 55% 100%)' }
        : { background: str(hex) || '#CCC' }
    });
  }

  /* a real photograph, cropped square — the row preview for anything the
     owner has photographed himself */
  function photoChip(url) {
    return el('span', { 'class': 'adm-sw adm-sw-img' },
      el('img', { src: str(url), alt: '', loading: 'lazy' }));
  }

  /* a decoration shown the way the render engine will actually draw it:
     photo first, then the vector library, then the emoji fallback */
  function charmChip(it) {
    if (str(it.image)) return photoChip(it.image);
    if (str(it.art) && artOn()) {
      return el('span', { 'class': 'adm-sw adm-sw-art' }, artSVG(str(it.art), 30));
    }
    return el('span', { 'class': 'adm-glyph', text: str(it.glyph) || '•' });
  }

  /* ====================================================================== */
  /* 7. Collection schemas                                                   */
  /* ====================================================================== */

  function schema(id) {
    switch (id) {
      case 'shapes': return {
        key: 'shapes',
        fields: [
          F('name', 't', 'admin.f.name'),
          F('price', 'num', 'admin.f.price', { step: 1, min: 0, hint: 'admin.h.price' }),
          F('desc', 'tarea', 'admin.f.desc', { wide: true, rows: 3 })
        ],
        blank: function () {
          return { id: '', name: { ar: '', en: '' }, price: 0, desc: { ar: '', en: '' } };
        },
        preview: function (it) { return nailChip(baseNail(), { shape: str(it.id) }); },
        sub: function (it) { return str(it.id) + ' · ' + money(numOf(it.price, 0)); }
      };

      case 'lengths': return {
        key: 'lengths',
        fields: [
          F('name', 't', 'admin.f.name'),
          F('factor', 'num', 'admin.f.factor', { step: 0.01, min: 0.3, max: 2.4, def: 1, hint: 'admin.h.factor' }),
          F('price', 'num', 'admin.f.price', { step: 1, min: 0, hint: 'admin.h.price' })
        ],
        blank: function () { return { id: '', name: { ar: '', en: '' }, factor: 1, price: 0 }; },
        preview: function (it) { return nailChip(baseNail(), { shape: 'almond', length: numOf(it.factor, 1) }); },
        sub: function (it) { return '×' + numOf(it.factor, 1) + ' · ' + money(numOf(it.price, 0)); }
      };

      case 'finishes': return {
        key: 'finishes',
        fields: [
          F('name', 't', 'admin.f.name'),
          F('kind', 'select', 'admin.f.kind', { opts: finishKindOpts }),
          F('price', 'num', 'admin.f.price', { step: 1, min: 0, hint: 'admin.h.price' }),
          F('image', 'image', 'admin.img.head', { wide: true, maxPx: MAX_SWATCH, hint: 'admin.img.finishX' })
        ],
        blank: function () { return { id: '', name: { ar: '', en: '' }, kind: 'gloss', price: 0, image: '' }; },
        preview: function (it) {
          if (str(it.image)) return photoChip(it.image);
          return nailChip(baseNail({ color: '#D9BCC4', finish: str(it.kind) || 'gloss' }), { shape: 'almond' });
        },
        sub: function (it) { return kindName(it.kind) + ' · ' + money(numOf(it.price, 0)); }
      };

      case 'patterns': return {
        key: 'patterns',
        fields: [
          F('name', 't', 'admin.f.name'),
          F('kind', 'select', 'admin.f.kind', { opts: patternKindOpts }),
          F('price', 'num', 'admin.f.price', { step: 1, min: 0, hint: 'admin.h.price' }),
          F('image', 'image', 'admin.img.head', { wide: true, maxPx: MAX_SWATCH, hint: 'admin.img.patternX' })
        ],
        blank: function () { return { id: '', name: { ar: '', en: '' }, kind: 'none', price: 0, image: '' }; },
        preview: function (it) {
          if (str(it.image)) return photoChip(it.image);
          return nailChip(baseNail({
            color: '#E9C2C0',
            pattern: { kind: str(it.kind) || 'none', color: '#FFFFFF', color2: '#C08BA6', scale: 1 }
          }), { shape: 'almond' });
        },
        sub: function (it) { return kindName(it.kind) + ' · ' + money(numOf(it.price, 0)); }
      };

      case 'colors': return {
        key: 'colors',
        searchable: true,
        fields: [
          F('name', 't', 'admin.f.name'),
          F('hex', 'color', 'admin.f.hex'),
          F('group', 'select', 'admin.f.group', { opts: colorGroupOpts }),
          F('image', 'image', 'admin.img.head', { wide: true, maxPx: MAX_SWATCH, hint: 'admin.img.colorX' })
        ],
        blank: function () { return { id: '', name: { ar: '', en: '' }, hex: '#E9C2C0', group: 'nude', image: '' }; },
        preview: function (it) {
          if (str(it.image)) return photoChip(it.image);
          return swatchChip(it.hex);
        },
        sub: function (it) { return groupName(it.group) + ' · ' + str(it.hex); }
      };

      case 'skinTones': return {
        key: 'skinTones',
        fields: [
          F('name', 't', 'admin.f.name'),
          F('hex', 'color', 'admin.f.hex'),
          F('shadow', 'color', 'admin.f.shadow', { hint: 'admin.h.shadow' })
        ],
        blank: function () { return { id: '', name: { ar: '', en: '' }, hex: '#EFCDB6', shadow: '#D8AF95' }; },
        preview: function (it) { return swatchChip(it.hex, it.shadow); },
        sub: function (it) { return str(it.hex) + ' / ' + str(it.shadow); }
      };

      case 'charms': return {
        key: 'charms',
        searchable: true,
        fields: [
          F('name', 't', 'admin.f.name'),
          F('price', 'num', 'admin.f.price', { step: 1, min: 0, hint: 'admin.h.price' }),
          F('group', 'select', 'admin.f.group', { opts: charmGroupOpts }),
          F('art', 'art', 'admin.art.lbl', { wide: true, hint: 'admin.art.x' }),
          F('image', 'image', 'admin.img.head', { wide: true, maxPx: MAX_SWATCH, hint: 'admin.img.charmX' }),
          F('glyph', 'text', 'admin.f.glyph', { hint: 'admin.h.glyph' })
        ],
        blank: function () {
          return { id: '', name: { ar: '', en: '' }, glyph: '✨', art: '', image: '', price: 0, group: 'misc' };
        },
        addForm: function (done) { openCharmForm(done); },
        addLabel: 'admin.nd.add',
        preview: charmChip,
        sub: function (it) { return groupName(it.group) + ' · ' + money(numOf(it.price, 0)); }
      };

      case 'payments': return {
        key: 'paymentMethods',
        fields: [
          F('name', 't', 'admin.f.name'),
          F('note', 't', 'admin.f.note'),
          F('icon', 'select', 'admin.f.icon', { opts: payIconOpts }),
          F('enabled', 'bool', 'admin.f.enabled'),
          F('details', 'tarea', 'admin.f.details', { wide: true, rows: 5, hint: 'admin.h.details' })
        ],
        blank: function () {
          return {
            id: '', name: { ar: '', en: '' }, note: { ar: '', en: '' },
            icon: 'bank', enabled: true, details: { ar: '', en: '' }
          };
        },
        preview: function (it) { return el('span', { 'class': 'adm-ico-pv', html: icon(str(it.icon) || 'bank', 20) }); },
        sub: function (it) { return it.enabled === false ? t('common.no') : t('common.yes'); }
      };

      case 'faqCats': return {
        key: 'faqCats',
        fields: [F('name', 't', 'admin.f.name')],
        blank: function () { return { id: '', name: { ar: '', en: '' } }; },
        preview: function () { return el('span', { 'class': 'adm-ico-pv', html: icon('grid', 18) }); },
        sub: function (it) { return str(it.id); }
      };

      case 'faq': return {
        key: 'faq',
        searchable: true,
        label: function (it) { return pick(it.q); },
        fields: [
          F('cat', 'select', 'admin.f.cat', { opts: faqCatOpts }),
          F('q', 't', 'admin.f.q', { wide: true }),
          F('a', 'tarea', 'admin.f.a', { wide: true, rows: 6 })
        ],
        blank: function () {
          var cats = sList('faqCats');
          return {
            id: '', cat: cats.length ? str(cats[0].id) : 'general',
            q: { ar: '', en: '' }, a: { ar: '', en: '' }
          };
        },
        preview: function () { return el('span', { 'class': 'adm-ico-pv', html: icon('search', 18) }); },
        sub: function (it) {
          var c = null, list = sList('faqCats'), i;
          for (i = 0; i < list.length; i++) if (str(list[i].id) === str(it.cat)) c = list[i];
          return c ? pick(c.name) : str(it.cat);
        }
      };

      case 'sizeGuide': return {
        key: 'sizeGuide',
        label: function (it) { return t('common.size') + ' ' + str(it.label); },
        fields: [
          F('label', 'text', 'admin.f.sizeLabel', { dir: 'ltr' }),
          F('mm', 'num', 'admin.f.mm', { step: 0.1, min: 4, max: 26, def: 12, hint: 'admin.h.mm' })
        ],
        blank: function () { return { id: '', label: '0', mm: 12 }; },
        preview: function (it) { return el('span', { 'class': 'adm-num-pv', text: str(it.label) }); },
        sub: function (it) { return numOf(it.mm, 0) + ' mm'; }
      };

      case 'sizeSets': return {
        key: 'sizeSets',
        fields: [
          F('name', 't', 'admin.f.name'),
          F('sizes.thumb', 'num', 'admin.f.thumb', { min: 0, max: 11, step: 1, int: true, def: 2 }),
          F('sizes.index', 'num', 'admin.f.index', { min: 0, max: 11, step: 1, int: true, def: 5 }),
          F('sizes.middle', 'num', 'admin.f.middle', { min: 0, max: 11, step: 1, int: true, def: 4 }),
          F('sizes.ring', 'num', 'admin.f.ring', { min: 0, max: 11, step: 1, int: true, def: 6 }),
          F('sizes.pinky', 'num', 'admin.f.pinky', { min: 0, max: 11, step: 1, int: true, def: 8, hint: 'admin.h.sizes' })
        ],
        blank: function () {
          return { id: '', name: { ar: '', en: '' }, sizes: { thumb: 2, index: 5, middle: 4, ring: 6, pinky: 8 } };
        },
        preview: function (it) { return el('span', { 'class': 'adm-num-pv', text: str(it.id) || '·' }); },
        sub: function (it) {
          var s = isObj(it.sizes) ? it.sizes : {};
          return [s.thumb, s.index, s.middle, s.ring, s.pinky].join(' · ');
        }
      };

      case 'measureMethods': return {
        key: 'measureMethods',
        fields: [
          F('name', 't', 'admin.f.name'),
          F('text', 'tarea', 'admin.f.text', { wide: true, rows: 4 }),
          F('steps', 'tlist', 'admin.f.steps', { wide: true, hint: 'admin.h.steps' })
        ],
        blank: function () {
          return { id: '', name: { ar: '', en: '' }, text: { ar: '', en: '' }, steps: [] };
        },
        preview: function () { return el('span', { 'class': 'adm-ico-pv', html: icon('ruler', 18) }); },
        sub: function (it) { return str(it.id); }
      };

      case 'features': return {
        key: 'home.features',
        fields: [
          F('icon', 'select', 'admin.f.icon', { opts: uiIconOpts }),
          F('title', 't', 'admin.f.title'),
          F('text', 'tarea', 'admin.f.text', { wide: true, rows: 3 })
        ],
        blank: function () {
          return { id: '', icon: 'sparkle', title: { ar: '', en: '' }, text: { ar: '', en: '' } };
        },
        label: function (it) { return pick(it.title); },
        preview: function (it) { return el('span', { 'class': 'adm-ico-pv', html: icon(str(it.icon) || 'sparkle', 20) }); }
      };

      case 'steps': return {
        key: 'home.steps',
        fields: [
          F('title', 't', 'admin.f.title'),
          F('text', 'tarea', 'admin.f.text', { wide: true, rows: 3 })
        ],
        blank: function () { return { id: '', title: { ar: '', en: '' }, text: { ar: '', en: '' } }; },
        label: function (it) { return pick(it.title); },
        preview: function (it, i) { return el('span', { 'class': 'adm-num-pv', text: String(i + 1) }); }
      };

      case 'testimonials': return {
        key: 'home.testimonials',
        fields: [
          /* the name is a T-object like every other visible string, so an
             Arabic reviewer keeps her Arabic name on the English page and
             gets a readable Latin spelling instead of a stray RTL word */
          F('name', 't', 'admin.f.person', { hint: 'admin.h.person' }),
          F('stars', 'num', 'admin.f.stars', { min: 1, max: 5, step: 1, int: true, def: 5, hint: 'admin.h.stars' }),
          F('text', 'tarea', 'admin.f.text', { wide: true, rows: 4 })
        ],
        blank: function () { return { id: '', name: { ar: '', en: '' }, stars: 5, text: { ar: '', en: '' } }; },
        /* pick() also accepts a plain string, so a testimonial saved by an
           older build still shows its name in the list */
        label: function (it) { return pick(it.name); },
        preview: function (it) { return el('span', { 'class': 'adm-num-pv', text: String(numOf(it.stars, 5)) + '★' }); }
      };

      case 'stats': return {
        key: 'home.stats',
        fields: [
          F('value', 'text', 'admin.f.value', { dir: 'ltr', hint: 'admin.h.statValue' }),
          F('label', 't', 'admin.f.label')
        ],
        blank: function () { return { id: '', value: '', label: { ar: '', en: '' } }; },
        label: function (it) { return str(it.value); },
        preview: function (it) { return el('span', { 'class': 'adm-num-pv', text: str(it.value) || '·' }); }
      };

      default: return null;
    }
  }

  /* ====================================================================== */
  /* 8. The generic CRUD list — one implementation for every collection      */
  /* ====================================================================== */

  function itemLabel(def, it) {
    var v = typeof def.label === 'function' ? def.label(it) : pick(it && it.name);
    return trim(v) || t('admin.untitled');
  }

  function crud(def, opts) {
    var o = opts || {};
    var host = el('section', { 'class': 'adm-crud' });
    var rowsBox = el('div', { 'class': 'adm-rows' });
    var countPill = el('span', { 'class': 'pill adm-count' });
    var searchInput = null;

    function items() { return sList(def.key); }

    function repaint() {
      var list = items(), q = trim(S.q[def.key] || '').toLowerCase(), i, it, shown = 0;
      empty(rowsBox);
      countPill.textContent = t('admin.itemsN', { n: list.length });
      for (i = 0; i < list.length; i++) {
        it = list[i];
        if (!isObj(it)) continue;
        if (q && !matches(def, it, q)) continue;
        shown++;
        rowsBox.appendChild(row(def, it, i, list.length, repaint));
      }
      if (!list.length) rowsBox.appendChild(emptyBox(t('admin.noItems'), t('admin.noItemsHint')));
      else if (!shown) rowsBox.appendChild(emptyBox(t('admin.noMatch'), t('common.emptyHint')));
      if (typeof o.onChange === 'function') o.onChange();
    }

    function addItem() {
      var blank, made;
      /* a collection may prefer a guided form over an empty row */
      if (typeof def.addForm === 'function') {
        def.addForm(function () { repaint(); sideCounts(); });
        return;
      }
      blank = typeof def.blank === 'function' ? def.blank() : {};
      if (blank && blank.id === '') delete blank.id;
      made = SN.Store.add(def.key, blank);
      if (made && made.id) S.open[def.key + '/' + made.id] = true;
      toast(t('admin.addOk'), 'ok');
      repaint();
      sideCounts();
    }

    host.appendChild(el('div', { 'class': 'adm-crud-h' }, [
      el('div', { 'class': 'adm-crud-t' }, [
        o.title ? el('h3', { 'class': 'h4 display', text: o.title }) : null,
        countPill
      ]),
      def.searchable ? (function () {
        searchInput = el('input', {
          'class': 'input', type: 'search', placeholder: t('admin.searchPh'),
          value: str(S.q[def.key] || '')
        });
        searchInput.addEventListener('input', SN.UI.debounce(function () {
          S.q[def.key] = searchInput.value;
          repaint();
        }, 200), false);
        return el('div', { 'class': 'search adm-crud-s' }, [
          el('span', { 'class': 'search-ico', html: icon('search', 16), 'aria-hidden': 'true' }),
          searchInput
        ]);
      }()) : null,
      el('button', {
        'class': 'btn btn-pri btn-sm adm-add', type: 'button',
        on: { click: addItem }
      }, [
        el('span', { 'class': 'adm-bico', html: icon('plus', 16), 'aria-hidden': 'true' }),
        el('span', { text: def.addLabel ? t(def.addLabel) : t('admin.addNew') })
      ])
    ]));

    if (o.help) host.appendChild(el('p', { 'class': 'hint adm-crud-help', text: o.help }));
    host.appendChild(rowsBox);
    repaint();
    /* a tab that has to wait for something async (the art library) repaints
       through this instead of rebuilding itself */
    host.snRepaint = repaint;
    return host;
  }

  function matches(def, it, q) {
    var hay = [];
    hay.push(itemLabel(def, it));
    hay.push(str(it.id));
    if (it.name) { hay.push(str(it.name.ar)); hay.push(str(it.name.en)); }
    if (it.q) { hay.push(str(it.q.ar)); hay.push(str(it.q.en)); }
    if (it.group) hay.push(str(it.group));
    if (it.kind) hay.push(str(it.kind));
    if (it.hex) hay.push(str(it.hex));
    if (Array.isArray(it.tags)) hay.push(it.tags.join(' '));
    return hay.join(' ').toLowerCase().indexOf(q) !== -1;
  }

  function row(def, it, index, total, repaint) {
    var okey = def.key + '/' + it.id;
    var open = !!S.open[okey];
    var bodyBox = el('div', { 'class': 'adm-row-b' + (open ? '' : ' adm-hide') });
    var head, toggle, pvBox, upBtn, downBtn;

    function fillBody() {
      var extra;
      if (bodyBox.firstChild) return;
      bodyBox.appendChild(renderFields(def.fields, ctx));
      if (typeof def.extra === 'function') {
        try { extra = def.extra(it, repaint); }
        catch (e) { extra = null; }
        if (extra) bodyBox.appendChild(extra);
      }
      bodyBox.appendChild(el('p', { 'class': 'hint adm-rowid ltr', text: t('admin.idLbl') + ': ' + str(it.id) }));
    }

    var ctx = {
      get: function (p) { return getIn(it, p); },
      set: function (p, v) {
        var top = str(p).split('.')[0], patch = {};
        setIn(it, p, v);
        patch[top] = it[top];
        SN.Store.update(def.key, it.id, patch);
      },
      after: function () { refreshRow(); }
    };

    function refreshRow() {
      var lbl = head.querySelector('.adm-row-name');
      var sub = head.querySelector('.adm-row-sub');
      if (lbl) lbl.textContent = itemLabel(def, it);
      if (sub) sub.textContent = def.sub ? str(def.sub(it)) : str(it.id);
      if (pvBox && typeof def.preview === 'function') {
        empty(pvBox);
        try { pvBox.appendChild(def.preview(it, index)); }
        catch (e) { /* a preview must never break the row */ }
      }
    }

    pvBox = el('span', { 'class': 'adm-row-pv', 'aria-hidden': 'true' });
    if (typeof def.preview === 'function') {
      try { pvBox.appendChild(def.preview(it, index)); }
      catch (e) { /* ignore */ }
    }

    toggle = el('button', {
      'class': 'adm-row-t', type: 'button', 'aria-expanded': open ? 'true' : 'false',
      on: { click: function () {
        var isOpen = bodyBox.classList.contains('adm-hide');
        if (isOpen) {
          fillBody();
          bodyBox.classList.remove('adm-hide');
          toggle.setAttribute('aria-expanded', 'true');
          S.open[okey] = true;
        } else {
          bodyBox.classList.add('adm-hide');
          toggle.setAttribute('aria-expanded', 'false');
          delete S.open[okey];
        }
      } }
    }, [
      el('span', { 'class': 'adm-row-name', text: itemLabel(def, it) }),
      el('span', { 'class': 'adm-row-sub', text: def.sub ? str(def.sub(it)) : str(it.id) }),
      el('span', { 'class': 'adm-row-chev', html: icon('chevron', 15), 'aria-hidden': 'true' })
    ]);

    upBtn = iconBtn('undo', t('admin.up'), function () {
      if (index <= 0) return;
      SN.Store.move(def.key, it.id, -1);
      toast(t('admin.moved'), 'ok');
      repaint();
    });
    downBtn = iconBtn('redo', t('admin.down'), function () {
      if (index >= total - 1) return;
      SN.Store.move(def.key, it.id, 1);
      toast(t('admin.moved'), 'ok');
      repaint();
    });
    if (index <= 0) upBtn.disabled = true;
    if (index >= total - 1) downBtn.disabled = true;

    head = el('div', { 'class': 'adm-row-h' }, [
      pvBox,
      toggle,
      el('div', { 'class': 'adm-row-a' }, [
        upBtn,
        downBtn,
        iconBtn('copy', t('admin.dup'), function () {
          var copy = clone(it);
          if (!copy) return;
          delete copy.id;
          if (isObj(copy.name)) {
            copy.name = {
              ar: trim(copy.name.ar) ? copy.name.ar + ' (' + t('admin.copyStr') + ')' : '',
              en: trim(copy.name.en) ? copy.name.en + ' (' + t('admin.copyStr') + ')' : ''
            };
          }
          SN.Store.add(def.key, copy);
          toast(t('admin.dupOk'), 'ok');
          repaint();
          sideCounts();
        }),
        iconBtn('trash', t('common.delete'), function () {
          confirmBox(t('admin.delAsk', { n: itemLabel(def, it) })).then(function (yes) {
            if (!yes) return;
            SN.Store.remove(def.key, it.id);
            delete S.open[okey];
            toast(t('admin.delOk'), 'ok');
            repaint();
            sideCounts();
          });
        }, 'adm-danger')
      ])
    ]);

    if (open) fillBody();

    return el('article', { 'class': 'adm-row', 'data-id': str(it.id) }, [head, bodyBox]);
  }


  /* ====================================================================== */
  /* 8b. Adding a decoration without touching code                           */
  /*                                                                         */
  /*  Name in both languages, a group, a price, and then the one decision     */
  /*  that matters: what it looks like. Either a drawing picked out of the    */
  /*  SN.Art library — shown as the real vectors, never as an id to type —    */
  /*  or a photograph of the actual charm.                                    */
  /* ====================================================================== */

  function openCharmForm(done) {
    var draft = {
      name: { ar: '', en: '' }, group: 'misc', price: 0,
      art: '', image: '', glyph: ''
    };
    var err = el('p', { 'class': 'field-err adm-ndErr' });
    var m;

    var ctx = {
      get: function (p) { return getIn(draft, p); },
      set: function (p, v) { setIn(draft, p, v); err.textContent = ''; }
    };

    function create() {
      var made;
      err.textContent = '';
      if (!trim(draft.name.ar) && !trim(draft.name.en)) {
        err.textContent = t('admin.nd.needName');
        return;
      }
      if (!trim(draft.art) && !trim(draft.image) && !trim(draft.glyph)) {
        err.textContent = t('admin.nd.need');
        return;
      }
      if (draft.image && draft.image.length > budgetLeft()) {
        toast(t('admin.img.full', {
          n: kbOf(draft.image.length), r: Math.max(0, kbOf(budgetLeft()))
        }), 'err');
        return;
      }
      made = SN.Store.add('charms', clone(draft));
      if (!made) { toast(t('common.error'), 'err'); return; }
      if (draft.image && !writeLanded()) {
        SN.Store.remove('charms', made.id);
        toast(t('admin.img.rejected'), 'err');
        return;
      }
      S.open['charms/' + made.id] = true;
      toast(t('admin.nd.created'), 'ok');
      if (typeof done === 'function') done();
      if (m && m.close) m.close();
    }

    m = SN.UI.modal({
      size: 'lg',
      title: t('admin.nd.title'),
      body: el('div', { 'class': 'adm-ndform' }, [
        el('p', { 'class': 'hint', text: t('admin.nd.intro') }),
        renderFields([
          F('name', 't', 'admin.f.name', { wide: true }),
          F('group', 'select', 'admin.f.group', { opts: charmGroupOpts }),
          F('price', 'num', 'admin.f.price', { step: 1, min: 0, hint: 'admin.h.price' }),
          F('art', 'art', 'admin.nd.srcArt', { wide: true, hint: 'admin.art.x' }),
          F('image', 'image', 'admin.nd.srcImg', { wide: true, maxPx: MAX_SWATCH, hint: 'admin.img.charmX' }),
          F('glyph', 'text', 'admin.nd.srcGlyph', { hint: 'admin.h.glyph' })
        ], ctx),
        err
      ]),
      actions: [
        { label: t('common.cancel'), cls: 'btn-ghost' },
        { label: t('admin.nd.create'), cls: 'btn-pri', onClick: function () { create(); } }
      ]
    });
    return m;
  }

  /* ====================================================================== */
  /* 9. Tab: general                                                         */
  /* ====================================================================== */

  var RE_PHONE = /^\+?[0-9][0-9\s-]{7,19}$/;
  var RE_WA = /^[0-9]{9,15}$/;
  var RE_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function settingsCtx(after) {
    return {
      get: function (p) { return sGet('settings.' + p, undefined); },
      set: function (p, v) { sSet('settings.' + p, v); },
      after: after
    };
  }

  function renderGeneral() {
    var box = el('div', { 'class': 'adm-tabbody' });
    var pv = el('div', { 'class': 'adm-brandpv' });

    function paintPv() {
      empty(pv);
      pv.appendChild(el('div', { 'class': 'adm-brandpv-in' }, [
        el('span', { 'class': 'brand-mark adm-brandpv-m', html: icon('nail', 26), 'aria-hidden': 'true' }),
        el('div', {}, [
          el('span', { 'class': 'brand-name display adm-brandpv-n', text: pick(sGet('settings.brand', null)) || t('admin.untitled') }),
          el('span', { 'class': 'adm-brandpv-t', text: pick(sGet('settings.tagline', null)) })
        ])
      ]));
      pv.appendChild(el('p', { 'class': 'hint', text: t('admin.g.preview') }));
    }
    var ctx = settingsCtx(paintPv);
    paintPv();

    box.appendChild(card([
      sectionHead(t('admin.g.identity'), t('admin.g.identityX')),
      pv,
      renderFields([
        F('brand', 't', 'admin.f2.brand', { hint: 'admin.gh.brand' }),
        F('tagline', 't', 'admin.f2.tagline'),
        F('currency', 't', 'admin.f2.currency', { hint: 'admin.gh.currency' }),
        F('theme', 'select', 'admin.f2.theme', { opts: themeOpts, hint: 'admin.gh.theme' }),
        F('about', 'tarea', 'admin.f2.about', { wide: true, rows: 5, hint: 'admin.gh.about' })
      ], ctx)
    ]));

    box.appendChild(card([
      sectionHead(t('admin.g.contact'), t('admin.g.contactX')),
      renderFields([
        F('phone', 'text', 'admin.f2.phone', { dir: 'ltr', hint: 'admin.gh.phone', valid: function (v) { return RE_PHONE.test(trim(v)); }, err: 'admin.errPhone' }),
        F('whatsapp', 'text', 'admin.f2.whatsapp', { dir: 'ltr', hint: 'admin.gh.whatsapp', valid: function (v) { return RE_WA.test(trim(v)); }, err: 'admin.errWa' }),
        F('email', 'text', 'admin.f2.email', { dir: 'ltr', inputType: 'email', valid: function (v) { return RE_MAIL.test(trim(v)); }, err: 'admin.errMail' }),
        F('instagram', 'text', 'admin.f2.instagram', { dir: 'ltr', hint: 'admin.gh.social' }),
        F('snapchat', 'text', 'admin.f2.snapchat', { dir: 'ltr' }),
        F('tiktok', 'text', 'admin.f2.tiktok', { dir: 'ltr' }),
        F('city', 't', 'admin.f2.city'),
        F('hours', 't', 'admin.f2.hours'),
        F('address', 'tarea', 'admin.f2.address', { wide: true, rows: 3 })
      ], ctx)
    ]));

    box.appendChild(card([
      sectionHead(t('admin.g.announce'), t('admin.g.announceX')),
      renderFields([
        F('announceOn', 'bool', 'admin.f2.announceOn'),
        F('announce', 't', 'admin.f2.announceTxt', { wide: true, hint: 'admin.gh.announceTxt' })
      ], ctx)
    ]));

    box.appendChild(card([
      sectionHead(t('admin.g.notify'), t('admin.g.notifyX')),
      renderFields([
        F('notifyEndpoint', 'text', 'admin.f2.notifyEndpoint', { dir: 'ltr', wide: true }),
        F('notifyKey', 'text', 'admin.f2.notifyKey', { dir: 'ltr' }),
        F('notifyEmail', 'text', 'admin.f2.notifyEmail', { dir: 'ltr', inputType: 'email' })
      ], ctx),
      el('p', { 'class': 'hint', text: t('admin.b.notifyGo') })
    ]));

    box.appendChild(card([
      sectionHead(t('admin.g.options')),
      renderFields([
        F('whatsappOrder', 'bool', 'admin.f2.whatsappOrder', { hint: 'admin.gh.whatsappOrder' })
      ], ctx)
    ]));

    return box;
  }

  /* ====================================================================== */
  /* 10. Tab: home                                                           */
  /* ====================================================================== */

  /* A testimonial name used to be a plain string. The field is a T-object now,
     so a name saved by an older build would show two empty boxes and vanish on
     the first keystroke. Lift it into the Arabic side once, before the editor
     is built — idempotent, and it touches nothing that is already a T-object. */
  function upgradeTestimonialNames() {
    var list = sList('home.testimonials'), i, it;
    for (i = 0; i < list.length; i++) {
      it = list[i];
      if (!isObj(it) || typeof it.name !== 'string') continue;
      SN.Store.update('home.testimonials', it.id, { name: { ar: it.name, en: '' } });
    }
  }

  function renderHome() {
    var box = el('div', { 'class': 'adm-tabbody' });
    var ctx = {
      get: function (p) { return sGet('home.' + p, undefined); },
      set: function (p, v) { sSet('home.' + p, v); }
    };

    box.appendChild(card([
      sectionHead(t('admin.hm.hero'), t('admin.hm.heroX')),
      renderFields([
        F('heroTitle', 't', 'admin.hm.heroTitle', { wide: true }),
        F('heroSub', 'tarea', 'admin.hm.heroSub', { wide: true, rows: 4 }),
        F('heroCta', 't', 'admin.hm.heroCta'),
        F('heroImage', 'image', 'admin.hm.heroImage', { wide: true, hint: 'admin.hm.heroImageX' })
      ], ctx)
    ]));

    box.appendChild(card([crud(schema('features'), { title: t('admin.hm.features'), help: t('admin.hm.featuresX') })]));
    box.appendChild(card([crud(schema('steps'), { title: t('admin.hm.steps'), help: t('admin.hm.stepsX') })]));
    upgradeTestimonialNames();
    box.appendChild(card([crud(schema('testimonials'), { title: t('admin.hm.testimonials') })]));
    box.appendChild(card([crud(schema('stats'), { title: t('admin.hm.stats') })]));

    return box;
  }

  /* ====================================================================== */
  /* 11. Tab: pricing                                                        */
  /* ====================================================================== */

  var PRICE_FIELDS = [
    { k: 'base', step: 5, min: 0 },
    /* sits right under `base` because it is a share of it, not a rate of its own */
    { k: 'singleHandFactor', step: 0.05, min: 0, max: 1, def: 0.6 },
    { k: 'perExtraColor', step: 1, min: 0 },
    { k: 'perPatternNail', step: 1, min: 0 },
    { k: 'perCharm', step: 1, min: 0 },
    { k: 'express', step: 5, min: 0 },
    { k: 'giftWrap', step: 1, min: 0 },
    { k: 'shipping', step: 1, min: 0 },
    { k: 'freeShippingOver', step: 10, min: 0 },
    { k: 'vat', step: 0.01, min: 0, max: 1 },
    { k: 'depositPct', step: 0.05, min: 0, max: 1 }
  ];

  function sampleDesign() {
    var d, keys, cols, pats, charms, i, kind, chId;
    if (!SN.Nail || typeof SN.Nail.blank !== 'function') return null;
    try { d = SN.Nail.blank(); }
    catch (e) { return null; }
    if (!d || !isObj(d.nails)) return null;

    keys = SN.Nail.KEYS || [];
    cols = sList('colors');
    pats = sList('patterns');
    charms = sList('charms');

    function hexAt(i2) {
      var c = cols[i2];
      return (c && normHex(c.hex)) || ['#E9C2C0', '#C9A0A8', '#7E5A64'][i2 % 3];
    }
    kind = 'french';
    for (i = 0; i < pats.length; i++) {
      if (pats[i] && str(pats[i].kind) && str(pats[i].kind) !== 'none') { kind = str(pats[i].kind); break; }
    }
    chId = charms.length ? str(charms[0].id) : '';

    for (i = 0; i < keys.length; i++) {
      if (!isObj(d.nails[keys[i]])) continue;
      d.nails[keys[i]].color = hexAt(i === 3 || i === 8 ? 1 : (i === 4 || i === 9 ? 2 : 0));
      if (i === 3 || i === 8) {
        d.nails[keys[i]].pattern = { kind: kind, color: '#FFFFFF', color2: hexAt(2), scale: 1 };
        if (chId) d.nails[keys[i]].charms = [{ id: chId, x: 0.5, y: 0.35, s: 1, r: 0 }];
      }
    }
    d.qty = 1;
    d.express = false;
    d.giftWrap = false;
    return d;
  }

  function priceTable(p) {
    var body = el('tbody'), i, lines = (p && Array.isArray(p.lines)) ? p.lines : [];
    for (i = 0; i < lines.length; i++) {
      body.appendChild(el('tr', {}, [
        el('td', { text: str(lines[i].label) + (numOf(lines[i].qty, 1) > 1 ? ' ×' + numOf(lines[i].qty, 1) : '') }),
        el('td', { 'class': 'num', text: money(numOf(lines[i].amount, 0)) })
      ]));
    }
    body.appendChild(el('tr', {}, [
      el('td', { text: t('common.subtotal') }),
      el('td', { 'class': 'num', text: money(numOf(p && p.subtotal, 0)) })
    ]));
    body.appendChild(el('tr', {}, [
      el('td', { text: t('order.shipping') }),
      el('td', { 'class': 'num', text: numOf(p && p.shipping, 0) > 0 ? money(p.shipping) : t('common.free') })
    ]));
    if (numOf(p && p.vat, 0) > 0) {
      body.appendChild(el('tr', {}, [
        el('td', { text: t('order.vat') }),
        el('td', { 'class': 'num', text: money(p.vat) })
      ]));
    }
    body.appendChild(el('tr', { 'class': 'is-total' }, [
      el('td', { text: t('order.total') }),
      el('td', { 'class': 'num', text: money(numOf(p && p.total, 0)) })
    ]));
    if (numOf(p && p.deposit, 0) > 0) {
      body.appendChild(el('tr', {}, [
        el('td', { 'class': 'muted', text: t('order.deposit') }),
        el('td', { 'class': 'num', text: money(p.deposit) })
      ]));
    }
    return el('div', { 'class': 'table-wrap' }, el('table', { 'class': 'table table-sum' }, body));
  }


  /* ---------------------------------------------------------------------- */
  /*  Every price on the site, in one place.                                 */
  /*                                                                         */
  /*  The rates above are only half the story: a shape, a length, a finish,  */
  /*  a pattern, a charm and each ready-made design all carry a price of      */
  /*  their own, and they live in six different tabs. He asked to edit ALL    */
  /*  prices, so they are all repeated here, grouped and collapsed, writing   */
  /*  straight back to the same store the other tabs use.                     */
  /* ---------------------------------------------------------------------- */

  var PRICE_GROUPS = [
    { key: 'shapes', lbl: 'admin.tab.shapes' },
    { key: 'lengths', lbl: 'admin.tab.lengths' },
    { key: 'finishes', lbl: 'admin.tab.finishes' },
    { key: 'patterns', lbl: 'admin.tab.patterns' },
    { key: 'charms', lbl: 'admin.tab.charms' },
    { key: 'designs', lbl: 'admin.tab.designs' }
  ];

  function priceRow(key, it, onChange) {
    var ctx = {
      get: function (p) { return getIn(it, p); },
      set: function (p, v) {
        var patch = {};
        setIn(it, p, v);
        patch[str(p).split('.')[0]] = it[str(p).split('.')[0]];
        SN.Store.update(key, it.id, patch);
      },
      after: onChange
    };
    return numField(
      F('price', 'num', trim(pick(it.name)) || str(it.id), { min: 0, step: 1, def: 0 }),
      ctx
    );
  }

  function priceGroupBlock(g, onChange) {
    var items = sList(g.key);
    var fields = el('div', { 'class': 'adm-fields adm-pgbody adm-hide' });
    var head, filled = false, i;

    function fill() {
      if (filled) return;
      filled = true;
      if (!items.length) {
        fields.appendChild(el('p', { 'class': 'hint', text: t('admin.p.extrasNone') }));
        return;
      }
      for (i = 0; i < items.length; i++) {
        if (isObj(items[i])) fields.appendChild(priceRow(g.key, items[i], onChange));
      }
    }

    head = el('button', {
      'class': 'adm-pghead', type: 'button', 'aria-expanded': 'false',
      on: { click: function () {
        var open = !fields.classList.contains('adm-hide');
        if (open) {
          fields.classList.add('adm-hide');
          head.setAttribute('aria-expanded', 'false');
        } else {
          fill();
          fields.classList.remove('adm-hide');
          head.setAttribute('aria-expanded', 'true');
        }
      } }
    }, [
      el('span', { 'class': 'adm-pgt', text: t(g.lbl) }),
      el('span', { 'class': 'pill adm-count', text: t('admin.p.extrasShow', { n: items.length }) }),
      el('span', { 'class': 'adm-row-chev', html: icon('chevron', 15), 'aria-hidden': 'true' })
    ]);

    return el('div', { 'class': 'adm-pgroup' }, [head, fields]);
  }

  function renderPricing() {
    var box = el('div', { 'class': 'adm-tabbody' });
    var sampleBox = el('div', { 'class': 'adm-sample' });
    var fields = [], i;

    function paintSample() {
      var d = sampleDesign(), p = null;
      empty(sampleBox);
      if (d && SN.Checkout && typeof SN.Checkout.priceCustom === 'function') {
        try { p = SN.Checkout.priceCustom(d); }
        catch (e) { p = null; }
      }
      if (!p) { sampleBox.appendChild(el('p', { 'class': 'hint', text: t('admin.p.sampleNo') })); return; }
      sampleBox.appendChild(priceTable(p));
    }

    var ctx = {
      get: function (p) { return sGet('pricing.' + p, 0); },
      set: function (p, v) { sSet('pricing.' + p, v); },
      after: paintSample
    };

    for (i = 0; i < PRICE_FIELDS.length; i++) {
      fields.push(F(PRICE_FIELDS[i].k, 'num', 'admin.p.' + PRICE_FIELDS[i].k, {
        step: PRICE_FIELDS[i].step,
        min: PRICE_FIELDS[i].min,
        max: PRICE_FIELDS[i].max,
        def: PRICE_FIELDS[i].def !== undefined ? PRICE_FIELDS[i].def : 0,
        hint: 'admin.p.' + PRICE_FIELDS[i].k + 'X'
      }));
    }

    box.appendChild(card([
      sectionHead(t('admin.tab.pricing'), t('admin.p.intro')),
      renderFields(fields, ctx)
    ]));

    box.appendChild(card([
      sectionHead(t('admin.p.sample'), t('admin.p.sampleX')),
      sampleBox
    ]));

    box.appendChild(card((function () {
      var kids = [sectionHead(t('admin.p.extras'), t('admin.p.extrasX'))], i;
      for (i = 0; i < PRICE_GROUPS.length; i++) {
        kids.push(priceGroupBlock(PRICE_GROUPS[i], paintSample));
      }
      return kids;
    }())));

    paintSample();
    return box;
  }

  /* ====================================================================== */
  /* 12. Tab: sizes (three collections in one place)                         */
  /* ====================================================================== */

  function renderSizes() {
    var box = el('div', { 'class': 'adm-tabbody' });
    box.appendChild(card([crud(schema('sizeGuide'), {
      title: t('admin.sz.guide'), help: t('admin.sz.guideX'), onChange: sideCounts
    })]));
    box.appendChild(card([crud(schema('sizeSets'), {
      title: t('admin.sz.sets'), help: t('admin.sz.setsX'), onChange: sideCounts
    })]));
    box.appendChild(card([crud(schema('measureMethods'), {
      title: t('admin.sz.methods'), help: t('admin.sz.methodsX'), onChange: sideCounts
    })]));
    return box;
  }

  /* ====================================================================== */
  /* 13. Tab: FAQ (categories + questions)                                   */
  /* ====================================================================== */

  function renderFaq() {
    var box = el('div', { 'class': 'adm-tabbody' });
    box.appendChild(card([crud(schema('faqCats'), { title: t('admin.fq.cats'), help: t('admin.fq.catsX') })]));
    box.appendChild(card([crud(schema('faq'), { title: t('admin.fq.list'), help: t('admin.fq.listX') })]));
    return box;
  }

  /* ====================================================================== */
  /* 14. Tab: designs                                                        */
  /* ====================================================================== */

  function designThumb(it) {
    var box = el('span', { 'class': 'adm-dthumb' });
    var svg;
    if (str(it.image)) {
      box.appendChild(el('img', { src: str(it.image), alt: '', loading: 'lazy' }));
      return box;
    }
    if (SN.Nail && typeof SN.Nail.thumb === 'function') {
      try {
        svg = SN.Nail.thumb(it.config, 72);
        if (svg) box.appendChild(svg);
      } catch (e) { /* ignore */ }
    }
    return box;
  }

  function renderDesigns() {
    var box = el('div', { 'class': 'adm-tabbody' });
    var def = {
      key: 'designs',
      searchable: true,
      fields: [
        F('name', 't', 'admin.f.name', { wide: true }),
        F('price', 'num', 'admin.d.price', { step: 5, min: 0 }),
        F('orders', 'num', 'admin.d.orders', { step: 1, min: 0, int: true, hint: 'admin.d.ordersX' }),
        F('featured', 'bool', 'admin.d.featured'),
        F('active', 'bool', 'admin.d.active'),
        F('desc', 'tarea', 'admin.f.desc', { wide: true, rows: 4 }),
        F('tags', 'tags', 'admin.d.tags', { wide: true }),
        F('image', 'image', 'admin.d.image', { wide: true, maxPx: MAX_DESIGN, hint: 'admin.img.designX' })
      ],
      blank: function () {
        var cfg = null;
        if (SN.Nail && typeof SN.Nail.blank === 'function') {
          try { cfg = SN.Nail.blank(); } catch (e) { cfg = null; }
        }
        return {
          id: '', name: { ar: '', en: '' }, desc: { ar: '', en: '' },
          price: numOf(sGet('pricing.base', 120), 120), orders: 0,
          featured: false, active: true, tags: [], image: '', config: cfg || {}
        };
      },
      preview: designThumb,
      sub: function (it) {
        var bits = [money(numOf(it.price, 0)), t('admin.d.orders') + ': ' + numOf(it.orders, 0)];
        if (it.featured) bits.push(t('admin.d.featured'));
        if (it.active === false) bits.push(t('common.no'));
        return bits.join(' · ');
      },
    };
    box.appendChild(card([crud(def, { title: t('admin.tab.designs'), help: t('admin.d.intro'), onChange: sideCounts })]));
    return box;
  }

  /* ====================================================================== */
  /* 15. Tab: orders                                                         */
  /* ====================================================================== */

  var STATUSES = ['new', 'confirmed', 'shipped', 'done', 'cancelled'];

  function orderList() {
    var arr = sList('orders').slice();
    arr.sort(function (a, b) { return numOf(b && b.ts, 0) - numOf(a && a.ts, 0); });
    return arr;
  }

  function orderStamp(ts) {
    var d = new Date(numOf(ts, 0));
    function p(n) { return (n < 10 ? '0' : '') + n; }
    if (isNaN(d.getTime())) return '—';
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function statusName(s) { return t('order.status.' + (STATUSES.indexOf(str(s)) === -1 ? 'new' : str(s))); }

  function orderTotal(o) {
    return numOf(o && o.price && o.price.total, 0);
  }

  function custWaLink(phone, text) {
    var digits = str(phone).replace(/[^0-9]/g, '');
    if (!digits) return '';
    if (digits.length <= 10 && digits.charAt(0) === '0') digits = '966' + digits.slice(1);
    return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(str(text));
  }

  function orderPreviewNode(o) {
    var wrap = el('div', { 'class': 'adm-opv' });
    var ref, node = null;
    try {
      if (o.kind === 'ready') {
        ref = (isObj(o.item) && o.item.id) ? SN.Store.find('designs', o.item.id) : null;
        if (ref && str(ref.image)) node = el('img', { src: str(ref.image), alt: '' });
        else if (ref && SN.Nail && SN.Nail.thumb) node = SN.Nail.thumb(ref.config, 180);
      } else if (isObj(o.design) && SN.Nail && SN.Nail.preview) {
        node = SN.Nail.preview(o.design, { w: 300 });
      }
    } catch (e) { node = null; }
    if (node) wrap.appendChild(node);
    return wrap;
  }

  /* An order is the one record on the site the owner did not write himself,
     so editing it is deliberately careful: the customer's DESIGN is never in
     the field list, and every patch names only the branch it touched
     (`customer`, `qty`, `price`, `status`). SN.Store.update merges shallowly,
     so `design` / `item` come through untouched. */
  function openOrder(o, repaint) {
    var body = el('div', { 'class': 'adm-omodal' });
    var sumBox = el('pre', { 'class': 'adm-pre' });
    var sel, m;

    if (!isObj(o.customer)) o.customer = {};
    if (!isObj(o.price)) o.price = { total: 0 };

    function summaryText() {
      try {
        if (SN.Checkout && typeof SN.Checkout.summary === 'function') {
          return str(SN.Checkout.summary(o, lang()));
        }
      } catch (e) { /* a summary is a convenience, never a blocker */ }
      return '';
    }
    function paintSummary() { sumBox.textContent = summaryText(); }

    var octx = {
      get: function (p) { return getIn(o, p); },
      set: function (p, v) {
        var top = str(p).split('.')[0], patch = {};
        setIn(o, p, v);
        patch[top] = o[top];
        SN.Store.update('orders', o.id, patch);
      },
      after: function () {
        paintSummary();
        if (typeof repaint === 'function') repaint();
      }
    };

    body.appendChild(orderPreviewNode(o));

    /* the facts that identify the order and must not drift */
    body.appendChild(el('dl', { 'class': 'adm-ometa' }, [
      el('dt', { text: t('order.number') }), el('dd', { 'class': 'ltr', text: str(o.no) || '—' }),
      el('dt', { text: t('common.date') }), el('dd', { text: orderStamp(o.ts) }),
      el('dt', { text: t('admin.o.kindLbl') }), el('dd', { text: t(o.kind === 'ready' ? 'order.ready' : 'order.custom') }),
      el('dt', { text: t('pay.title') }), el('dd', { text: str(o.payment && o.payment.name) || '—' })
    ]));

    sel = el('select', { 'class': 'select' });
    (function () {
      var i;
      for (i = 0; i < STATUSES.length; i++) {
        sel.appendChild(el('option', { value: STATUSES[i], text: t('order.status.' + STATUSES[i]) }));
      }
      sel.value = STATUSES.indexOf(str(o.status)) === -1 ? 'new' : str(o.status);
    }());
    sel.addEventListener('change', function () {
      SN.Store.update('orders', o.id, { status: sel.value });
      o.status = sel.value;
      toast(t('admin.o.statusOk'), 'ok');
      if (typeof repaint === 'function') repaint();
    }, false);

    body.appendChild(el('div', { 'class': 'field adm-f' }, [
      el('span', { 'class': 'label', text: t('admin.o.statusLbl') }),
      sel
    ]));

    /* ---- the editable half ---- */
    body.appendChild(el('div', { 'class': 'adm-oedit' }, [
      sectionHead(t('admin.o.editHead'), t('admin.o.editX')),
      renderFields([
        F('customer.name', 'text', 'order.name'),
        F('customer.phone', 'text', 'order.phone', { dir: 'ltr' }),
        F('customer.city', 'text', 'order.city'),
        F('customer.address', 'text', 'order.address', { wide: true }),
        F('qty', 'num', 'order.qty', { min: 1, step: 1, int: true, def: 1, hint: 'admin.o.qtyX' }),
        F('price.total', 'num', 'admin.o.priceLbl', { min: 0, step: 1, def: 0, hint: 'admin.o.priceX' }),
        F('customer.note', 'area', 'admin.o.noteLbl', { wide: true, rows: 3, hint: 'admin.o.noteX' })
      ], octx),
      el('div', { 'class': 'note' }, [
        el('span', { 'class': 'ico', html: icon('shield', 16), 'aria-hidden': 'true' }),
        el('span', { text: t('admin.o.designSafe') })
      ])
    ]));

    body.appendChild(el('div', { 'class': 'adm-osum' }, [
      el('h4', { 'class': 'label', text: t('admin.o.sum') }),
      sumBox
    ]));
    paintSummary();

    body.appendChild(el('div', { 'class': 'adm-obtns' }, [
      el('button', {
        'class': 'btn btn-line btn-sm', type: 'button', text: t('admin.o.copySum'),
        on: { click: function () {
          SN.UI.copy(summaryText()).then(function (ok) {
            toast(t(ok ? 'common.copied' : 'common.error'), ok ? 'ok' : 'err');
          });
        } }
      }),
      el('button', {
        'class': 'btn btn-pri btn-sm', type: 'button', text: t('admin.o.waReply'),
        on: { click: function () {
          var link = custWaLink(o.customer && o.customer.phone, summaryText());
          if (!link) { toast(t('admin.o.waNo'), 'err'); return; }
          window.open(link, '_blank', 'noopener');
        } }
      }),
      el('button', {
        'class': 'btn btn-ghost btn-sm adm-danger-t', type: 'button', text: t('common.delete'),
        on: { click: function () {
          confirmBox(t('admin.o.delAsk', { n: str(o.no) })).then(function (yes) {
            if (!yes) return;
            SN.Store.remove('orders', o.id);
            toast(t('common.deleted'), 'ok');
            if (m && m.close) m.close();
            if (typeof repaint === 'function') repaint();
            sideCounts();
          });
        } }
      })
    ]));

    m = SN.UI.modal({
      size: 'lg',
      title: t('admin.o.detail') + ' — ' + (str(o.no) || ''),
      body: body,
      actions: [{ label: t('common.close'), cls: 'btn-ghost' }]
    });
    return m;
  }

  function csvCell(v) {
    var s = str(v).replace(/"/g, '""');
    return '"' + s + '"';
  }

  function exportOrders() {
    var list = orderList(), rows = [], i, o, head;
    if (!list.length) { toast(t('admin.o.csvNo'), 'err'); return; }
    head = [t('order.number'), t('common.date'), t('common.status'), t('admin.o.kindLbl'),
      t('order.name'), t('order.phone'), t('order.city'), t('order.address'), t('order.note'),
      t('pay.title'), t('order.qty'), t('admin.o.totalLbl')];
    rows.push(head.map(csvCell).join(','));
    for (i = 0; i < list.length; i++) {
      o = list[i];
      if (!isObj(o)) continue;
      rows.push([
        str(o.no), orderStamp(o.ts), statusName(o.status),
        t(o.kind === 'ready' ? 'order.ready' : 'order.custom'),
        str(o.customer && o.customer.name), str(o.customer && o.customer.phone),
        str(o.customer && o.customer.city), str(o.customer && o.customer.address),
        str(o.customer && o.customer.note), str(o.payment && o.payment.name),
        String(numOf(o.qty, 1)), String(orderTotal(o))
      ].map(csvCell).join(','));
    }
    SN.UI.download('\uFEFF' + rows.join('\r\n'),
      'shosh2-nail-orders-' + orderStamp(Date.now()).slice(0, 10) + '.csv',
      'text/csv;charset=utf-8');
    toast(t('admin.o.exportOk'), 'ok');
  }

  function renderOrders() {
    var box = el('div', { 'class': 'adm-tabbody' });
    var chips = el('div', { 'class': 'chips adm-ochips' });
    var listBox = el('div', { 'class': 'adm-orows' });
    var search = el('input', {
      'class': 'input', type: 'search', placeholder: t('admin.o.searchPh'), value: S.orderQ
    });

    function counts() {
      var all = sList('orders'), out = { all: all.length }, i, s;
      for (i = 0; i < STATUSES.length; i++) out[STATUSES[i]] = 0;
      for (i = 0; i < all.length; i++) {
        s = str(all[i] && all[i].status);
        if (out[s] === undefined) s = 'new';
        out[s] = numOf(out[s], 0) + 1;
      }
      return out;
    }

    function paintChips() {
      var c = counts(), list = ['all'].concat(STATUSES), i;
      empty(chips);
      for (i = 0; i < list.length; i++) {
        (function (id) {
          chips.appendChild(el('button', {
            'class': 'chip' + (S.orderStatus === id ? ' chip-on' : ''), type: 'button',
            'aria-pressed': S.orderStatus === id ? 'true' : 'false',
            on: { click: function () { S.orderStatus = id; paintChips(); paintRows(); syncBulk(); } }
          }, [
            el('span', { text: id === 'all' ? t('admin.o.all') : t('order.status.' + id) }),
            el('span', { 'class': 'tab-n', text: String(numOf(c[id], 0)) })
          ]));
        }(list[i]));
      }
    }

    function paintRows() {
      var list = orderList(), q = trim(S.orderQ).toLowerCase(), i, o, shown = 0;
      empty(listBox);
      for (i = 0; i < list.length; i++) {
        o = list[i];
        if (!isObj(o)) continue;
        if (S.orderStatus !== 'all' && str(o.status || 'new') !== S.orderStatus) continue;
        if (q && [str(o.no), str(o.customer && o.customer.name), str(o.customer && o.customer.phone)]
          .join(' ').toLowerCase().indexOf(q) === -1) continue;
        shown++;
        listBox.appendChild(orderRow(o));
      }
      if (!list.length) listBox.appendChild(emptyBox(t('admin.o.empty'), t('admin.o.emptyHint')));
      else if (!shown) listBox.appendChild(emptyBox(t('admin.o.noMatch'), t('common.emptyHint')));
    }

    /* «امسح كل الطلبات القديمة» — deleting one at a time is not a workflow.
       Acts on whatever the chips are currently filtering to. */
    function bulkDelete() {
      var list = sList('orders'), target = [], i, o, st, ask;
      for (i = 0; i < list.length; i++) {
        o = list[i];
        if (!isObj(o)) continue;
        st = STATUSES.indexOf(str(o.status)) === -1 ? 'new' : str(o.status);
        if (S.orderStatus === 'all' || st === S.orderStatus) target.push(str(o.id));
      }
      if (!target.length) { toast(t('admin.o.delNone'), 'err'); return; }

      function wipe() {
        var k;
        for (k = 0; k < target.length; k++) SN.Store.remove('orders', target[k]);
        toast(t('admin.o.delManyOk', { c: target.length }), 'ok');
        repaint();
      }

      ask = S.orderStatus === 'all'
        ? t('admin.o.delAllAsk', { c: target.length })
        : t('admin.o.delStatusAsk', { c: target.length, n: t('order.status.' + S.orderStatus) });

      confirmBox(ask).then(function (yes) {
        if (!yes) return;
        /* wiping the whole book is the one action worth asking twice */
        if (S.orderStatus !== 'all') { wipe(); return; }
        confirmBox(t('admin.o.delAllAsk2')).then(function (yes2) { if (yes2) wipe(); });
      });
    }

    var bulkBtn = el('button', {
      'class': 'btn btn-ghost btn-sm adm-danger-t adm-obulk', type: 'button',
      on: { click: bulkDelete }
    }, [
      el('span', { 'class': 'adm-bico', html: icon('trash', 15), 'aria-hidden': 'true' }),
      el('span', { 'class': 'adm-blbl', text: t('admin.o.delAll') })
    ]);

    function syncBulk() {
      var lbl = bulkBtn.querySelector('.adm-blbl');
      if (!lbl) return;
      lbl.textContent = S.orderStatus === 'all'
        ? t('admin.o.delAll')
        : t('admin.o.delStatus', { n: t('order.status.' + S.orderStatus) });
    }

    function repaint() { paintChips(); paintRows(); syncBulk(); sideCounts(); }

    function orderRow(o) {
      var st = STATUSES.indexOf(str(o.status)) === -1 ? 'new' : str(o.status);
      return el('article', { 'class': 'adm-orow', 'data-status': st }, [
        el('button', {
          'class': 'adm-orow-t', type: 'button',
          on: { click: function () { openOrder(o, repaint); } }
        }, [
          el('span', { 'class': 'adm-ono', dir: 'ltr', text: str(o.no) || '—' }),
          el('span', { 'class': 'adm-oname', text: str(o.customer && o.customer.name) || t('admin.untitled') }),
          el('span', { 'class': 'adm-ometa2 ltr', text: str(o.customer && o.customer.phone) }),
          el('span', { 'class': 'adm-odate', text: orderStamp(o.ts) }),
          el('span', { 'class': 'adm-ototal', text: money(orderTotal(o)) }),
          el('span', { 'class': 'badge adm-ost adm-ost-' + st, text: statusName(st) })
        ]),
        el('div', { 'class': 'adm-orow-a' }, [
          iconBtn('edit', t('admin.o.detail'), function () { openOrder(o, repaint); }),
          iconBtn('trash', t('common.delete'), function () {
            confirmBox(t('admin.o.delAsk', { n: str(o.no) })).then(function (yes) {
              if (!yes) return;
              SN.Store.remove('orders', o.id);
              toast(t('common.deleted'), 'ok');
              repaint();
            });
          }, 'adm-danger')
        ])
      ]);
    }

    search.addEventListener('input', SN.UI.debounce(function () {
      S.orderQ = search.value;
      paintRows();
    }, 200), false);

    box.appendChild(card([
      sectionHead(t('admin.tab.orders'), t('admin.o.intro')),
      el('div', { 'class': 'toolbar adm-otools' }, [
        el('div', { 'class': 'search adm-osearch' }, [
          el('span', { 'class': 'search-ico', html: icon('search', 16), 'aria-hidden': 'true' }),
          search
        ]),
        el('div', { 'class': 'adm-btnrow toolbar-end' }, [
          el('button', {
            'class': 'btn btn-line btn-sm', type: 'button', text: t('admin.o.exportCsv'),
            on: { click: exportOrders }
          }),
          bulkBtn
        ])
      ]),
      chips,
      listBox
    ]));

    paintChips();
    paintRows();
    syncBulk();
    return box;
  }

  /* ====================================================================== */
  /* 16. Tab: backup                                                         */
  /* ====================================================================== */

  /* The photo budget, in one honest picture: how full the box is, what the
     photos alone cost, and the one sentence that tells him what to do. */
  function storageMeter() {
    var used  = stateChars();
    var pics  = imageAudit();
    var pct   = Math.min(100, Math.round(used / BUDGET_MAX * 100));
    var full  = used > BUDGET_MAX * 0.92;
    var near  = used > BUDGET_WARN;
    var bar   = el('span', {
      'class': 'adm-meter-i' + (full ? ' is-full' : (near ? ' is-warn' : '')),
      style: { inlineSize: pct + '%' }
    });

    return el('div', { 'class': 'adm-storefigs' }, [
      el('p', { 'class': 'strong', text: t('admin.b.storeUsed', { n: kbOf(used) }) }),
      el('div', {
        'class': 'adm-meter', role: 'img',
        'aria-label': t('admin.b.storeBar') + ' — ' + pct + '%'
      }, bar),
      el('p', { 'class': 'hint', text: t('admin.b.storeCap', { n: kbOf(BUDGET_MAX) }) }),
      el('p', {
        'class': 'hint',
        text: pics.count
          ? t('admin.b.storeImgs', { c: pics.count, n: kbOf(pics.chars) })
          : t('admin.b.storeImgsNone')
      }),
      el('div', { 'class': 'note ' + (full ? 'note-err' : (near ? 'note-warn' : 'note-ok')) }, [
        el('span', {
          'class': 'ico', 'aria-hidden': 'true',
          html: icon(near ? 'shield' : 'check', 16)
        }),
        el('span', {
          text: full ? t('admin.b.storeFullWarn') : (near ? t('admin.b.storeWarn') : t('admin.b.storeOk'))
        })
      ])
    ]);
  }

  function renderBackup() {
    var box = el('div', { 'class': 'adm-tabbody' });
    var fileIn = el('input', { 'class': 'sr-only adm-file', type: 'file', accept: 'application/json,.json' });
    var testOut = el('p', { 'class': 'hint adm-testout' });

    /* ---- data ---- */
    fileIn.addEventListener('change', function () {
      var f = fileIn.files && fileIn.files[0];
      if (!f) return;
      confirmBox(t('admin.b.importAsk')).then(function (yes) {
        fileIn.value = '';
        if (!yes) return;
        SN.Store.importFile(f).then(function () {
          toast(t('admin.b.importOk'), 'ok');
          renderPanel();
        }).catch(function (err) {
          var msg = err && (lang() === 'en' ? err.en : err.ar);
          toast(msg || t('common.error'), 'err');
        });
      });
    }, false);

    box.appendChild(card([
      sectionHead(t('admin.b.dataHead'), t('admin.b.dataX')),
      el('div', { 'class': 'adm-btnrow' }, [
        el('button', {
          'class': 'btn btn-pri btn-sm', type: 'button', text: t('admin.b.exportBtn'),
          on: { click: function () {
            var ok = SN.Store.exportFile();
            toast(t(ok ? 'admin.b.exportOk' : 'admin.b.exportErr'), ok ? 'ok' : 'err');
          } }
        }),
        el('button', {
          'class': 'btn btn-line btn-sm', type: 'button', text: t('admin.b.importBtn'),
          on: { click: function () { fileIn.click(); } }
        }),
        fileIn
      ])
    ]));

    /* ---- reset ---- */
    box.appendChild(card([
      sectionHead(t('admin.b.resetHead'), t('admin.b.resetX')),
      el('div', { 'class': 'adm-btnrow' }, [
        el('button', {
          'class': 'btn btn-danger btn-sm', type: 'button', text: t('admin.b.resetBtn'),
          on: { click: function () {
            confirmBox(t('admin.b.resetAsk1')).then(function (a) {
              if (!a) return;
              confirmBox(t('admin.b.resetAsk2')).then(function (b) {
                if (!b) return;
                SN.Store.reset();
                toast(t('admin.b.resetOk'), 'ok');
                renderPanel();
              });
            });
          } }
        })
      ])
    ]));

    /* ---- password (two-step flow, see section 16b) ---- */
    box.appendChild(passwordCard());

    /* ---- storage ---- */
    box.appendChild(card([
      sectionHead(t('admin.b.storeHead'), t('admin.b.storeX')),
      storageMeter()
    ]));

    /* ---- notification explainer ---- */
    box.appendChild(card([
      sectionHead(t('admin.b.notifyHead'), t('admin.b.notifyX')),
      el('ol', { 'class': 'adm-steps' }, [
        el('li', { text: t('admin.b.notifyS1') }),
        el('li', { text: t('admin.b.notifyS2') }),
        el('li', { text: t('admin.b.notifyS3') }),
        el('li', { text: t('admin.b.notifyS4') }),
        el('li', { text: t('admin.b.notifyS5') })
      ]),
      el('p', { 'class': 'hint', text: t('admin.b.notifyGo') }),
      el('div', { 'class': 'adm-btnrow' }, [
        el('button', {
          'class': 'btn btn-line btn-sm', type: 'button', text: t('admin.b.test'),
          on: { click: function (ev) { testNotify(ev.currentTarget, testOut); } }
        })
      ]),
      testOut
    ]));

    return box;
  }

  /* ====================================================================== */
  /* 16b. The password flow                                                  */
  /*                                                                         */
  /*  Changing settings.adminPass only ever affects THIS browser, so the      */
  /*  panel walks the owner through the second half as well: it hands her     */
  /*  the complete text of password.js (the one file she edits) and a direct  */
  /*  link to it on GitHub. Everything degrades gracefully when store.js has  */
  /*  not shipped the helpers yet.                                            */
  /* ====================================================================== */

  var PASS_KEY = 'shosh2-admin-pwfile';
  var passFileMem = '';        /* used when sessionStorage is unavailable */
  var wantPassFocus = false;   /* set by the default-password banner */

  function passFileRemember(text) {
    passFileMem = str(text);
    try { window.sessionStorage.setItem(PASS_KEY, passFileMem); }
    catch (e) { /* private mode: the in-memory copy still carries re-renders */ }
  }

  function passFileRecall() {
    if (passFileMem) return passFileMem;
    try { passFileMem = str(window.sessionStorage.getItem(PASS_KEY)); }
    catch (e) { passFileMem = ''; }
    return passFileMem;
  }

  function passFileWrap(value) {
    return '/* كلمة مرور لوحة التحكم — Shosh Nail admin password.\n' +
           '   غيّريها من لوحة التحكم ← تبويب «النسخ الاحتياطي» ← زر «انسخي السطر». */\n' +
           'window.SN_ADMIN = ' + JSON.stringify(str(value)) + ';\n';
  }

  /* the full text of password.js for `pass` — hashed whenever store.js can */
  function passFileFor(pass) {
    var St = SN.Store, text = '', hash = '';
    if (St && typeof St.passwordFile === 'function') {
      try { text = str(St.passwordFile(pass)); } catch (e) { text = ''; }
    }
    if (!text && St && typeof St.hashPass === 'function') {
      try { hash = str(St.hashPass(pass)); } catch (e) { hash = ''; }
      if (hash) text = passFileWrap(hash);
    }
    return text || passFileWrap(pass);
  }

  function passFileHashed(text) { return /sha256:[0-9a-f]{64}/.test(str(text)); }

  function repoFileURL(path) {
    var St = SN.Store, url = '', repo, branch;
    if (St && typeof St.repoEditURL === 'function') {
      try { url = str(St.repoEditURL(path)); } catch (e) { url = ''; }
      if (url) return url;
    }
    repo = trim(sGet('settings.repo', ''));
    branch = trim(sGet('settings.repoBranch', ''));
    if (!repo || !branch) return '';
    return 'https://github.com/' + repo + '/edit/' + branch + '/' + str(path);
  }

  function isDefaultPass() {
    var St = SN.Store;
    if (St && typeof St.isDefaultPass === 'function') {
      try { return !!St.isDefaultPass(); } catch (e) { /* fall back below */ }
    }
    return str(sGet('settings.adminPass', '')) === 'shosh1234';
  }

  function passCanLogin(pass) {
    if (!SN.Store || typeof SN.Store.login !== 'function') return false;
    try { return !!SN.Store.login(pass); } catch (e) { return false; }
  }

  /* remember the new password for THIS browser, hashed when store.js allows */
  function passSaveLocal(pass) {
    var hash = '';
    if (SN.Store && typeof SN.Store.hashPass === 'function') {
      try { hash = str(SN.Store.hashPass(pass)); } catch (e) { hash = ''; }
    }
    if (hash) {
      sSet('settings.adminPass', hash);
      if (passCanLogin(pass)) return true;
    }
    sSet('settings.adminPass', str(pass));
    return passCanLogin(pass);
  }

  /* the default-password banner disappears as soon as it is no longer true */
  function dropWarnBanner() {
    var w = refs.warn;
    if (!w || isDefaultPass()) return;
    if (w.parentNode) w.parentNode.removeChild(w);
    refs.warn = null;
  }

  function passwordCard() {
    var url    = repoFileURL('password.js');
    var id1    = fid(), id2 = fid();
    var n1     = el('input', { 'class': 'input', type: 'password', id: id1, autocomplete: 'new-password' });
    var n2     = el('input', { 'class': 'input', type: 'password', id: id2, autocomplete: 'new-password' });
    var err    = el('p', { 'class': 'field-err', role: 'alert' });
    var pre    = el('pre', {
      'class': 'adm-pre', dir: 'ltr', tabindex: '0',
      'aria-label': t('admin.b.passFileLbl')
    });
    var safe   = el('span');
    var head2  = el('h4', { 'class': 'h4 display', tabindex: '-1', text: t('admin.b.passS2') });
    var step2  = el('div', { 'class': 'adm-tabbody adm-hide' });
    var showBtn, form, saved;

    /* --- step 1 --------------------------------------------------------- */
    showBtn = el('button', {
      'class': 'btn btn-ghost btn-sm', type: 'button',
      'aria-pressed': 'false', text: t('admin.b.passShow'),
      on: { click: function (ev) {
        var on = n1.type === 'password';
        n1.type = n2.type = on ? 'text' : 'password';
        ev.currentTarget.setAttribute('aria-pressed', on ? 'true' : 'false');
        ev.currentTarget.textContent = t(on ? 'admin.b.passHide' : 'admin.b.passShow');
      } }
    });

    form = el('form', { 'class': 'adm-passform', novalidate: 'novalidate' }, [
      el('div', { 'class': 'adm-fields' }, [
        el('div', { 'class': 'field adm-f' }, [
          el('label', { 'class': 'label', 'for': id1, text: t('admin.b.passNew') }), n1
        ]),
        el('div', { 'class': 'field adm-f' }, [
          el('label', { 'class': 'label', 'for': id2, text: t('admin.b.passNew2') }), n2
        ])
      ]),
      err,
      el('div', { 'class': 'adm-btnrow' }, [
        el('button', { 'class': 'btn btn-pri', type: 'submit', text: t('admin.b.passSave') }),
        showBtn
      ])
    ]);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      err.textContent = '';
      if (!str(n1.value)) { err.textContent = t('admin.b.passEmpty'); n1.focus(); return; }
      if (str(n1.value).length < 6) { err.textContent = t('admin.b.passShort'); n1.focus(); return; }
      if (n1.value !== n2.value) { err.textContent = t('admin.b.passMismatch'); n2.select(); return; }

      saved = passSaveLocal(n1.value);
      showStep2(passFileFor(n1.value), true);
      n1.value = ''; n2.value = '';
      toast(t(saved ? 'admin.b.passOk' : 'admin.b.passLocalFail'), saved ? 'ok' : 'err');
      dropWarnBanner();
    }, false);

    /* --- step 2 --------------------------------------------------------- */
    step2.appendChild(el('div', { 'class': 'divider', 'aria-hidden': 'true' }));
    step2.appendChild(el('div', { 'class': 'adm-sechead' }, [
      head2,
      el('p', { 'class': 'hint', text: t('admin.b.passS2X') })
    ]));
    step2.appendChild(el('div', { 'class': 'adm-osum' }, [
      el('h5', { 'class': 'label', text: t('admin.b.passFileLbl') }),
      pre
    ]));
    step2.appendChild(el('div', { 'class': 'adm-btnrow' }, [
      el('button', {
        'class': 'btn btn-pri btn-lg', type: 'button', text: t('admin.b.passCopy'),
        /* long labels must wrap inside the pill on a phone, not spill out of it */
        style: { whiteSpace: 'normal' },
        on: { click: function () {
          SN.UI.copy(pre.textContent).then(function (ok) {
            toast(t(ok ? 'admin.b.passCopyOk' : 'common.error'), ok ? 'ok' : 'err');
          });
        } }
      }),
      url ? el('a', {
        'class': 'btn btn-line btn-lg', href: url, target: '_blank', rel: 'noopener',
        style: { whiteSpace: 'normal' },
        text: t('admin.b.passOpen')
      }) : null
    ]));
    if (!url) {
      step2.appendChild(el('div', { 'class': 'note note-warn' }, [
        el('span', { 'class': 'ico', html: icon('shield', 16), 'aria-hidden': 'true' }),
        el('span', { text: t('admin.b.passOpenNo') })
      ]));
    }
    step2.appendChild(el('p', { 'class': 'strong', text: t('admin.b.passHowHead') }));
    step2.appendChild(el('ol', { 'class': 'adm-steps' }, [
      el('li', { text: t('admin.b.passH1') }),
      el('li', { text: t('admin.b.passH2') }),
      el('li', { text: t('admin.b.passH3') }),
      el('li', { text: t('admin.b.passH4') }),
      el('li', { text: t('admin.b.passH5') }),
      el('li', { text: t('admin.b.passH6') })
    ]));
    step2.appendChild(el('div', { 'class': 'note note-ok' }, [
      el('span', { 'class': 'ico', html: icon('shield', 16), 'aria-hidden': 'true' }),
      safe
    ]));
    step2.appendChild(el('div', { 'class': 'note note-warn' }, [
      el('span', { 'class': 'ico', html: icon('lock', 16), 'aria-hidden': 'true' }),
      el('span', { text: t('admin.b.passReuse') })
    ]));
    step2.appendChild(el('div', { 'class': 'note' }, [
      el('span', { 'class': 'ico', html: icon('shield', 16), 'aria-hidden': 'true' }),
      el('span', { text: t('admin.b.passGuard') })
    ]));

    function showStep2(text, move) {
      pre.textContent = str(text);
      safe.textContent = t(passFileHashed(text) ? 'admin.b.passSafe' : 'admin.b.passSafePlain');
      step2.classList.remove('adm-hide');
      passFileRemember(text);
      if (!move) return;
      try { head2.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      catch (e) { /* older browsers just stay put */ }
      try { head2.focus({ preventScroll: true }); }
      catch (e2) { try { head2.focus(); } catch (e3) { /* ignore */ } }
    }

    /* she can always come back to step 2 without retyping anything */
    if (passFileRecall()) showStep2(passFileRecall(), false);

    return card([
      sectionHead(t('admin.b.passHead'), t('admin.b.passX')),
      el('div', { 'class': 'adm-sechead' }, [
        el('h4', { 'class': 'h4 display', id: 'adm-pass-step1', tabindex: '-1', text: t('admin.b.passS1') }),
        el('p', { 'class': 'hint', text: t('admin.b.passS1X') })
      ]),
      form,
      passFileRecall() ? el('p', { 'class': 'hint', text: t('admin.b.passRedoX') }) : null,
      step2
    ], 'adm-passcard');
  }

  /* jump from the warning banner straight into step 1 */
  function focusPasswordCard() {
    var node = D.getElementById('adm-pass-step1');
    if (!node) return;
    try { node.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    catch (e) { /* ignore */ }
    try { node.focus({ preventScroll: true }); }
    catch (e2) { try { node.focus(); } catch (e3) { /* ignore */ } }
  }

  function testNotify(btn, out) {
    var ep = trim(sGet('settings.notifyEndpoint', ''));
    var key = trim(sGet('settings.notifyKey', ''));
    var mail = trim(sGet('settings.notifyEmail', ''));
    var brand = pick(sGet('settings.brand', null)) || 'Shosh Nail';
    var payload = {
      subject: t('admin.b.testSubject'),
      from_name: brand,
      message: t('admin.b.testBody'),
      phone: trim(sGet('settings.phone', ''))
    };
    if (key) payload.access_key = key;
    if (mail) payload.email = mail;

    if (!ep) { toast(t('admin.b.testNone'), 'err'); if (out) out.textContent = t('admin.b.testNone'); return; }
    if (typeof fetch !== 'function') { toast(t('admin.b.testNet'), 'err'); return; }

    if (btn) { btn.disabled = true; btn.classList.add('is-busy'); }
    if (out) out.textContent = t('admin.b.testSending');

    fetch(ep, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (btn) { btn.disabled = false; btn.classList.remove('is-busy'); }
      if (res && res.ok) {
        toast(t('admin.b.testOk'), 'ok');
        if (out) out.textContent = t('admin.b.testOk');
      } else {
        var msg = t('admin.b.testErr', { n: res ? res.status : '?' });
        toast(msg, 'err');
        if (out) out.textContent = msg;
      }
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.classList.remove('is-busy'); }
      toast(t('admin.b.testNet'), 'err');
      if (out) out.textContent = t('admin.b.testNet');
    });
  }

  /* ====================================================================== */
  /* 17. Tab dispatch                                                        */
  /* ====================================================================== */

  function simpleTab(id) {
    return function () {
      var box = el('div', { 'class': 'adm-tabbody' });
      var def = schema(id);
      if (!def) return box;
      box.appendChild(card([crud(def, {
        title: t('admin.tab.' + id),
        help: id === 'shapes' ? t('admin.shapeIds', { n: shapeIdList() }) : null,
        onChange: sideCounts
      })]));
      return box;
    };
  }

  /* the charms tab waits for the vector library before it can draw the row
     previews, so it repaints once instead of rebuilding the whole tab */
  function renderCharms() {
    var box = el('div', { 'class': 'adm-tabbody' });
    var list = crud(schema('charms'), {
      title: t('admin.tab.charms'), help: t('admin.nd.intro'), onChange: sideCounts
    });
    box.appendChild(card([list]));
    artLoad(function (ok) {
      if (ok && typeof list.snRepaint === 'function') list.snRepaint();
    });
    return box;
  }

  var RENDER = {
    general: renderGeneral,
    home: renderHome,
    pricing: renderPricing,
    shapes: simpleTab('shapes'),
    lengths: simpleTab('lengths'),
    colors: simpleTab('colors'),
    finishes: simpleTab('finishes'),
    patterns: simpleTab('patterns'),
    charms: renderCharms,
    skinTones: simpleTab('skinTones'),
    sizes: renderSizes,
    designs: renderDesigns,
    faq: renderFaq,
    payments: simpleTab('payments'),
    orders: renderOrders,
    backup: renderBackup
  };

  function tabCount(id) {
    switch (id) {
      case 'general': case 'pricing': case 'backup': return null;
      case 'home': return sList('home.features').length + sList('home.steps').length +
        sList('home.testimonials').length + sList('home.stats').length;
      case 'sizes': return sList('sizeGuide').length + sList('sizeSets').length + sList('measureMethods').length;
      case 'payments': return sList('paymentMethods').length;
      case 'faq': return sList('faq').length;
      default: return sList(id).length;
    }
  }

  /* ====================================================================== */
  /* 17b. Locked out: gate diagnostics + plain-text recovery                 */
  /*                                                                         */
  /*  A wrong-password message alone tells the owner nothing about WHY. The   */
  /*  usual cause is environmental, not typographic: password.js is still     */
  /*  publishing, or the phone is serving a cached copy of it. After a failed */
  /*  attempt we ask SN.Store.refreshPass() what actually reached the browser */
  /*  and say so in one short paragraph, plus a one-tap «تحديث» retry.        */
  /*                                                                         */
  /*  Both helpers are optional. When store.js does not expose them we show   */
  /*  nothing extra at all — the gate keeps behaving exactly as before.       */
  /* ====================================================================== */

  var gateFailed = false;    /* survives the re-render caused by a language switch */
  var gateStatus = null;
  var gateKey    = '';
  var staleSeen  = false;    /* `stale` stays true for the rest of the session */

  function storeFn(name) {
    var St = SN.Store;
    return (St && typeof St[name] === 'function') ? St[name] : null;
  }

  /* {loaded, source, kind, stale} — anything else becomes null */
  function normPassStatus(s) {
    if (!isObj(s)) return null;
    return { loaded: !!s.loaded, source: str(s.source), kind: str(s.kind), stale: !!s.stale };
  }

  function passDiagOn() { return !!(storeFn('refreshPass') || storeFn('passStatus')); }

  function passStatusNow() {
    var fn = storeFn('passStatus');
    if (!fn) return null;
    try { return normPassStatus(fn.call(SN.Store)); }
    catch (e) { return null; }
  }

  /* -> Promise<status|null>, or null when refreshPass() is not available */
  function passRefresh() {
    var fn = storeFn('refreshPass'), p;
    if (!fn) return null;
    try { p = fn.call(SN.Store); }
    catch (e) { return null; }
    if (!p || typeof p.then !== 'function') return null;
    return p.then(
      function (s) { return normPassStatus(s); },
      function () { return null; }
    );
  }

  /* Which of the three situations he is in. Order matters: a file that never
     arrived outranks a stale one, and a fresh copy outranks "check your typing".
     `stale` latches on for the rest of the session, so we announce it once and
     from then on report what the file actually holds. */
  function diagKey(st) {
    if (!st) return '';
    if (!st.loaded) return 'admin.gd.missing';
    if (st.stale && !staleSeen) { staleSeen = true; return 'admin.gd.stale'; }
    if (st.kind === 'hash') return 'admin.gd.hash';
    return 'admin.gd.plain';
  }

  function diagTone(key) {
    if (key === 'admin.gd.missing') return ' note-warn';
    if (key === 'admin.gd.stale') return ' note-ok';
    return '';
  }

  function diagIcon(key) {
    if (key === 'admin.gd.missing') return 'clock';
    if (key === 'admin.gd.stale') return 'check';
    return 'lock';
  }

  /* The diagnostic block that lives inside the login card, hidden until the
     first failed attempt. `onRetry(status)` lets the gate re-run the login with
     whatever is still typed, so a stale copy fixes itself in one tap. */
  function gateDiagBox(onRetry) {
    var note = el('div', { 'class': 'note' });
    var ico  = el('span', { 'class': 'ico', 'aria-hidden': 'true' });
    var msg  = el('span');
    var btn;
    var box;

    note.appendChild(ico);
    note.appendChild(msg);

    btn = el('button', {
      'class': 'btn btn-line btn-sm', type: 'button',
      style: { whiteSpace: 'normal' },
      on: { click: function () { run(true); } }
    }, [
      el('span', { html: icon('undo', 16), 'aria-hidden': 'true' }),
      el('span', { text: t('admin.gd.refresh') })
    ]);

    box = el('div', {
      'class': 'adm-gd adm-hide',
      role: 'status', 'aria-live': 'polite',
      style: { inlineSize: '100%', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'start' }
    }, [note, el('div', { 'class': 'adm-btnrow' }, [btn])]);

    /* `key` given => repaint a verdict already reached (language switch) */
    function paint(st, key) {
      var k = key || diagKey(st);
      if (!k) return;
      gateStatus = st;
      gateKey = k;
      note.className = 'note' + diagTone(k);
      ico.innerHTML = icon(diagIcon(k), 16);
      msg.textContent = t(k);
      box.classList.remove('adm-hide');
    }

    /* refresh, repaint, retry the login; `announce` only for his own tap */
    function run(announce) {
      var p = passRefresh();
      var label = btn.querySelector('span:last-child');
      if (!p) {
        /* no refreshPass(): fall back to the synchronous snapshot */
        paint(passStatusNow());
        return;
      }
      btn.disabled = true;
      if (label) label.textContent = t('admin.gd.refreshing');
      p.then(function (st) {
        btn.disabled = false;
        if (label) label.textContent = t('admin.gd.refresh');
        if (!st) { paint(passStatusNow()); return; }
        if (typeof onRetry === 'function' && onRetry(st)) return;
        paint(st);
        if (announce) toast(t('admin.gd.refreshOk'), 'ok');
      });
    }

    box.show = function () { gateFailed = true; run(false); };
    /* a language switch rebuilds the gate — bring the last verdict back with it */
    if (gateFailed) { if (gateKey) paint(gateStatus, gateKey); else run(false); }
    return box;
  }

  /* The «ما أقدر أدخل؟» disclosure that sits under the card: the plain-text
     line he can commit from his phone when nothing else works. */
  function gateRecovery() {
    var url  = repoFileURL('password.js');
    var hid  = 'adm-gd-rq';
    var bid  = 'adm-gd-rb';
    var line = t('admin.gd.recLine');
    var pre  = el('pre', {
      'class': 'adm-pre', dir: 'ltr', tabindex: '0',
      'aria-label': t('admin.gd.recLineLbl'), text: line
    });
    var item, head, body;

    head = el('button', {
      'class': 'acc-head', type: 'button', id: hid,
      'aria-expanded': 'false', 'aria-controls': bid,
      on: { click: function () {
        var open = head.getAttribute('aria-expanded') === 'true';
        head.setAttribute('aria-expanded', open ? 'false' : 'true');
        if (open) item.classList.remove('is-open');
        else item.classList.add('is-open');
      } }
    }, [
      el('span', { text: t('admin.gd.recQ') }),
      /* icon() already returns an <svg class="ico ico-chevron"> — the wrapper
         must NOT repeat .ico, or the open state rotates it twice */
      el('span', {
        html: icon('chevron', 18), 'aria-hidden': 'true',
        style: { flex: '0 0 auto', display: 'flex' }
      })
    ]);

    body = el('div', {
      'class': 'acc-body', id: bid, role: 'region', 'aria-labelledby': hid
    }, [
      el('div', { 'class': 'acc-in' }, [
        el('p', { 'class': 'muted', style: { marginBlock: '0 12px' }, text: t('admin.gd.recX') }),

        url ? el('div', { 'class': 'adm-btnrow', style: { marginBlockEnd: '12px' } }, [
          el('a', {
            'class': 'btn btn-line btn-sm', href: url, target: '_blank', rel: 'noopener',
            style: { whiteSpace: 'normal' }, text: t('admin.gd.recOpen')
          })
        ]) : el('div', { 'class': 'note note-warn', style: { marginBlockEnd: '12px' } }, [
          el('span', { 'class': 'ico', html: icon('shield', 16), 'aria-hidden': 'true' }),
          el('span', { text: t('admin.gd.recNoLink') })
        ]),

        el('ol', { 'class': 'adm-steps', style: { listStyleType: 'decimal' } }, [
          el('li', { text: t('admin.gd.rec1') }),
          el('li', { text: t('admin.gd.rec2') }),
          el('li', { text: t('admin.gd.rec3') })
        ]),

        el('div', { 'class': 'adm-osum', style: { marginBlock: '12px' } }, [
          el('h5', { 'class': 'label', style: { margin: '0' }, text: t('admin.gd.recLineLbl') }),
          pre,
          el('div', { 'class': 'adm-btnrow' }, [
            el('button', {
              'class': 'btn btn-pri btn-sm', type: 'button',
              style: { whiteSpace: 'normal' },
              on: { click: function () {
                SN.UI.copy(line).then(function (ok) {
                  toast(t(ok ? 'admin.gd.recCopyOk' : 'common.error'), ok ? 'ok' : 'err');
                });
              } }
            }, [
              el('span', { html: icon('copy', 16), 'aria-hidden': 'true' }),
              el('span', { text: t('admin.gd.recCopy') })
            ])
          ])
        ]),

        el('ol', { 'class': 'adm-steps', start: '4', style: { listStyleType: 'decimal' } }, [
          el('li', { text: t('admin.gd.rec4') }),
          el('li', { text: t('admin.gd.rec5') }),
          el('li', { text: t('admin.gd.rec6') })
        ]),

        el('div', { 'class': 'note note-warn', style: { marginBlockStart: '12px' } }, [
          el('span', { 'class': 'ico', html: icon('lock', 16), 'aria-hidden': 'true' }),
          el('span', { text: t('admin.gd.recWarn') })
        ]),
        el('div', { 'class': 'note', style: { marginBlockStart: '10px' } }, [
          el('span', { 'class': 'ico', html: icon('shield', 16), 'aria-hidden': 'true' }),
          el('span', { text: t('admin.gd.recAfter') })
        ])
      ])
    ]);

    item = el('div', { 'class': 'acc-item' }, [head, body]);
    return el('div', { 'class': 'accordion adm-gd-rec' }, [item]);
  }

  /* ====================================================================== */
  /* 18. Shell: gate, sidebar, body                                          */
  /* ====================================================================== */

  function renderGate() {
    var root = refs.root;
    var input = el('input', {
      'class': 'input', type: 'password', id: 'adm-pass',
      placeholder: t('admin.gatePassPh'), autocomplete: 'current-password'
    });
    var err = el('p', { 'class': 'field-err' });
    var diag = passDiagOn() ? gateDiagBox(retryWith) : null;
    var cardEl, form;

    if (!root) return;
    empty(root);
    root.classList.remove('is-in');

    form = el('form', { 'class': 'adm-gate-f', novalidate: 'novalidate' }, [
      el('div', { 'class': 'field' }, [
        el('label', { 'class': 'label', 'for': 'adm-pass', text: t('admin.gatePass') }),
        input,
        err
      ]),
      el('button', { 'class': 'btn btn-pri btn-block', type: 'submit', text: t('admin.gateEnter') })
    ]);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var v = input.value;
      if (!trim(v)) {
        err.textContent = t('admin.gateEmpty');
        shake();
        return;
      }
      if (SN.Store.login(v)) {
        err.textContent = '';
        renderPanel(true);
        return;
      }
      err.textContent = t('admin.gateWrong');
      input.select();
      shake();
      toast(t('admin.gateWrong'), 'err');
      /* only now — the first impression stays clean */
      if (diag) diag.show();
    }, false);

    /* Called back by the diagnostic after a refresh: if the browser had simply
       been holding an old password.js, the value already typed now works. */
    function retryWith() {
      var v = str(input.value);
      if (!trim(v) || !SN.Store || typeof SN.Store.login !== 'function') return false;
      try {
        if (!SN.Store.login(v)) return false;
      } catch (e) { return false; }
      err.textContent = '';
      gateFailed = false;
      gateStatus = null;
      gateKey = '';
      renderPanel(true);
      return true;
    }

    function shake() {
      if (!cardEl || !cardEl.classList) return;
      cardEl.classList.remove('is-shake');
      if (cardEl.offsetWidth >= 0) cardEl.classList.add('is-shake');
      setTimeout(function () { if (cardEl.classList) cardEl.classList.remove('is-shake'); }, 520);
    }

    cardEl = el('div', { 'class': 'adm-gate-c panel' }, [
      el('span', { 'class': 'adm-gate-ico', html: icon('lock', 26), 'aria-hidden': 'true' }),
      el('h1', { 'class': 'h3 display', text: t('admin.gateTitle') }),
      el('p', { 'class': 'muted', text: t('admin.gateSub') }),
      form,
      diag,
      el('p', { 'class': 'hint', text: t('admin.gateHint') }),
      el('a', { 'class': 'link adm-gate-back', href: 'index.html', text: t('admin.gateBack') })
    ]);

    /* one column so the recovery disclosure sits under the card, not beside it
       (.adm-gate is a centring flex row and admin.css is not ours to change) */
    root.appendChild(el('div', { 'class': 'adm-gate' }, [
      el('div', {
        'class': 'adm-gate-col',
        style: {
          inlineSize: '100%', maxInlineSize: '420px',
          display: 'flex', flexDirection: 'column', gap: '14px'
        }
      }, [cardEl, gateRecovery()])
    ]));
    try { input.focus(); } catch (e) { /* ignore */ }
  }

  function sideCounts() {
    var side = refs.side, i, btn, n, pillEl;
    if (!side) return;
    for (i = 0; i < TABS.length; i++) {
      btn = side.querySelector('[data-tab="' + TABS[i].id + '"]');
      if (!btn) continue;
      pillEl = btn.querySelector('.adm-navn');
      n = tabCount(TABS[i].id);
      if (!pillEl) continue;
      if (n === null) { pillEl.textContent = ''; pillEl.classList.add('adm-hide'); }
      else { pillEl.textContent = String(n); pillEl.classList.remove('adm-hide'); }
    }
  }

  function setNav(open) {
    S.navOpen = !!open;
    if (refs.root && refs.root.classList) {
      if (S.navOpen) refs.root.classList.add('is-nav');
      else refs.root.classList.remove('is-nav');
    }
    var btn = D.getElementById('adm-menu');
    if (btn) btn.setAttribute('aria-expanded', S.navOpen ? 'true' : 'false');
  }

  function buildSide() {
    var nav = el('nav', { 'class': 'adm-nav', 'aria-label': t('admin.sections') });
    var i;
    for (i = 0; i < TABS.length; i++) {
      (function (tab) {
        var n = tabCount(tab.id);
        var btn = el('button', {
          'class': 'adm-navb' + (S.tab === tab.id ? ' is-on' : ''), type: 'button',
          'data-tab': tab.id,
          'aria-current': S.tab === tab.id ? 'true' : null,
          on: { click: function () { setNav(false); goTab(tab.id); } }
        }, [
          el('span', { 'class': 'adm-navi', html: icon(tab.ico, 18), 'aria-hidden': 'true' }),
          el('span', { 'class': 'adm-navt', text: t('admin.tab.' + tab.id) }),
          el('span', { 'class': 'adm-navn' + (n === null ? ' adm-hide' : ''), text: n === null ? '' : String(n) })
        ]);
        nav.appendChild(btn);
      }(TABS[i]));
    }
    return el('aside', { 'class': 'adm-side', id: 'adm-side' }, [
      el('div', { 'class': 'adm-side-h' }, [
        el('span', { 'class': 'adm-side-t', text: t('admin.sections') }),
        el('button', {
          'class': 'icon-btn only-mob', type: 'button', 'aria-label': t('common.close'),
          html: icon('close', 18),
          on: { click: function () { setNav(false); } }
        })
      ]),
      nav
    ]);
  }

  function renderBody() {
    var host = refs.body, fn, node;
    if (!host) return;
    empty(host);
    fn = RENDER[S.tab] || RENDER.general;
    try { node = fn(); }
    catch (e) {
      console.warn('[SN.Admin] tab render failed', e);
      node = emptyBox(t('common.error'), '');
    }
    if (node) host.appendChild(node);
    if (refs.title) refs.title.textContent = t('admin.tab.' + S.tab);
    /* mark the active button without rebuilding the sidebar */
    if (refs.side) {
      var btns = refs.side.querySelectorAll('.adm-navb'), i, on;
      for (i = 0; i < btns.length; i++) {
        on = btns[i].getAttribute('data-tab') === S.tab;
        if (on) { btns[i].classList.add('is-on'); btns[i].setAttribute('aria-current', 'true'); }
        else { btns[i].classList.remove('is-on'); btns[i].removeAttribute('aria-current'); }
      }
    }
    sideCounts();
    if (SN.I18n && SN.I18n.apply) SN.I18n.apply(host);
    if (wantPassFocus && S.tab === 'backup') { wantPassFocus = false; focusPasswordCard(); }
  }

  function renderPanel(focusIn) {
    var root = refs.root, warn = null, shell;
    if (!root) return;
    empty(root);
    root.classList.add('is-in');

    refs.title = el('h1', {
      'class': 'h4 display adm-title', tabindex: '-1',
      text: t('admin.tab.' + S.tab)
    });

    root.appendChild(el('div', { 'class': 'adm-top' }, [
      el('button', {
        'class': 'icon-btn only-mob adm-menu', id: 'adm-menu', type: 'button',
        'aria-label': t('admin.menu'), 'aria-expanded': 'false', 'aria-controls': 'adm-side',
        html: icon('menu', 20),
        on: { click: function () { setNav(!S.navOpen); } }
      }),
      refs.title,
      el('div', { 'class': 'adm-top-a' }, [
        el('a', { 'class': 'btn btn-ghost btn-sm only-desk', href: 'index.html', text: t('admin.viewSite') }),
        el('button', {
          'class': 'btn btn-line btn-sm', type: 'button', text: t('admin.logout'),
          on: { click: function () {
            SN.Store.logout();
            toast(t('admin.loggedOut'), 'info');
            renderGate();
          } }
        })
      ])
    ]));

    refs.warn = null;
    if (isDefaultPass()) {
      warn = el('div', { 'class': 'note note-warn adm-warn' }, [
        el('span', { 'class': 'ico', html: icon('shield', 18), 'aria-hidden': 'true' }),
        el('span', { text: t('admin.defaultPass') }),
        el('button', {
          'class': 'btn btn-sm btn-line adm-warn-cta', type: 'button',
          text: t('admin.defaultPassCta'),
          on: { click: function () {
            setNav(false);
            wantPassFocus = true;
            goTab('backup');
          } }
        })
      ]);
      refs.warn = warn;
      root.appendChild(warn);
    }

    refs.side = buildSide();
    refs.body = el('div', { 'class': 'adm-main', id: 'adm-main-body' });

    shell = el('div', { 'class': 'adm-shell' }, [refs.side, refs.body]);
    root.appendChild(shell);
    root.appendChild(el('div', {
      'class': 'adm-scrim', 'aria-hidden': 'true',
      on: { click: function () { setNav(false); } }
    }));

    setNav(false);
    renderBody();

    if (focusIn && refs.title) {
      try { refs.title.focus({ preventScroll: true }); }
      catch (e) { try { refs.title.focus(); } catch (e2) { /* ignore */ } }
    }
  }

  function renderAll() {
    if (SN.Store && SN.Store.isAdmin && SN.Store.isAdmin()) renderPanel();
    else renderGate();
  }

  /* ====================================================================== */
  /* 19. Boot                                                                */
  /* ====================================================================== */

  function init() {
    if (S.booted) return;
    if (!SN.UI || !SN.Store || !SN.I18n) return;
    S.booted = true;

    refs.root = D.getElementById('adm-root');
    if (!refs.root) return;

    var fromHash = hashTab();
    if (fromHash) S.tab = fromHash;

    SN.UI.boot('admin');
    SN.I18n.apply();

    window.addEventListener('hashchange', function () {
      var id = hashTab();
      if (!id || id === S.tab) {
        if (id === S.tab && SN.Store.isAdmin()) renderBody();
        return;
      }
      S.tab = id;
      if (SN.Store.isAdmin()) renderBody();
    }, false);

    SN.I18n.onChange(function () { renderAll(); });

    /* keep the panel honest if another tab clears the session */
    window.addEventListener('storage', function (ev) {
      if (ev && ev.key === 'shosh2-nail-v1' && SN.Store.isAdmin()) renderBody();
    }, false);

    renderAll();
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init, false);
  else init();

  SN.Admin = {
    init: init,
    render: renderAll,
    tabs: TABS
  };
})();
