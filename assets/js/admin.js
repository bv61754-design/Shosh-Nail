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
          methodsX: 'الشرح اللي يظهر للعميلة في خطوة المقاسات داخل الاستوديو.'
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
          image: 'صورة',
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
          charmImage: 'اختياري: صورة بدل الإيموجي. الصورة تغلب على الرمز.',
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
          intro: 'كل الأسعار بالعملة اللي حددتيها في الإعدادات. أي تعديل يظهر مباشرة في الاستوديو وصفحة الطلب.',
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
          sampleNo: 'ما قدرنا نحسب المثال الآن.'
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
          imageX: 'اختيارية. إذا ما فيه صورة نرسم التصميم تلقائياً من إعداداته.',
          upload: 'رفع صورة',
          clearImage: 'حذف الصورة',
          openStudio: 'افتحي في الاستوديو',
          capture: 'التقطي من مسودة الاستوديو',
          captureAsk: 'بنستبدل إعدادات هذا التصميم بالمسودة الحالية من الاستوديو. تمام؟',
          captureNone: 'ما فيه مسودة محفوظة في الاستوديو حالياً.',
          captureOk: 'تم نقل المسودة إلى هذا التصميم',
          imgOk: 'تم رفع الصورة',
          imgErr: 'ما قدرنا نقرأ الصورة، جرّبي صورة ثانية.',
          imgBig: 'الصورة كبيرة — يفضّل تصغيرها قبل الرفع حتى لا تمتلئ مساحة التخزين.',
          imgType: 'الملف لازم يكون صورة.',
          preview: 'معاينة'
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
          kindLbl: 'النوع'
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
          methodsX: 'The guidance shown to the customer on the sizing step of the studio.'
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
          image: 'Image',
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
          charmImage: 'Optional image instead of the emoji. An image always wins over the glyph.',
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
          intro: 'All rates use the currency you set in the general settings. Changes appear instantly in the studio and at checkout.',
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
          sampleNo: 'The sample could not be calculated right now.'
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
          imageX: 'Optional. With no photo we render the design from its configuration.',
          upload: 'Upload image',
          clearImage: 'Remove image',
          openStudio: 'Open in the studio',
          capture: 'Capture from the studio draft',
          captureAsk: 'This replaces the configuration of this design with your current studio draft. Continue?',
          captureNone: 'There is no saved studio draft right now.',
          captureOk: 'The draft was copied into this design',
          imgOk: 'Image uploaded',
          imgErr: 'We could not read that image — please try another one.',
          imgBig: 'That image is heavy — shrink it before uploading so storage does not fill up.',
          imgType: 'The file has to be an image.',
          preview: 'Preview'
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
          kindLbl: 'Type'
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
    return optsFrom(list);
  }
  function patternKindOpts() {
    var list = (SN.Nail && SN.Nail.PATTERN_KINDS) || ['none'];
    return optsFrom(list);
  }
  function shapeIdList() {
    var list = (SN.Nail && SN.Nail.SHAPES) || ['almond'];
    return list.join(' · ');
  }
  function colorGroupOpts() {
    return optsFrom(['nude', 'pink', 'red', 'bold', 'dark', 'pastel', 'neutral']);
  }
  function charmGroupOpts() {
    return optsFrom(['stones', 'stars', 'flowers', 'letters', 'hearts', 'misc']);
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
  function imageField(f, ctx) {
    var pv = el('div', { 'class': 'adm-imgpv' });
    var file = el('input', { 'class': 'sr-only adm-file', type: 'file', accept: 'image/*' });
    var url = el('input', {
      'class': 'input', type: 'text', dir: 'ltr', placeholder: 'data:image/… , https://…',
      autocomplete: 'off', value: str(ctx.get(f.p))
    });

    function paint() {
      var v = str(ctx.get(f.p));
      empty(pv);
      if (v) pv.appendChild(el('img', { src: v, alt: '', loading: 'lazy' }));
      else pv.appendChild(el('span', { 'class': 'adm-imgno', html: icon('image', 22) }));
    }
    function put(v) {
      ctx.set(f.p, v);
      url.value = v;
      paint();
      if (typeof ctx.after === 'function') ctx.after(f.p, v);
    }
    url.addEventListener('change', function () { put(trim(url.value)); savedToast(); }, false);
    file.addEventListener('change', function () {
      var fl = file.files && file.files[0];
      if (!fl) return;
      if (!/^image\//.test(str(fl.type))) { toast(t('admin.d.imgType'), 'err'); file.value = ''; return; }
      downscale(fl, 900).then(function (dataUrl) {
        put(dataUrl);
        toast(t('admin.d.imgOk'), 'ok');
        if (dataUrl.length > 900000) toast(t('admin.d.imgBig'), 'info');
      }).catch(function () {
        toast(t('admin.d.imgErr'), 'err');
      });
      file.value = '';
    }, false);
    paint();

    return fieldBox(f, [
      el('div', { 'class': 'adm-imgrow' }, [
        pv,
        el('div', { 'class': 'adm-imgact' }, [
          el('button', {
            'class': 'btn btn-line btn-sm', type: 'button',
            on: { click: function () { file.click(); } }
          }, [
            el('span', { 'class': 'adm-bico', html: icon('image', 15), 'aria-hidden': 'true' }),
            el('span', { text: t('admin.d.upload') })
          ]),
          el('button', {
            'class': 'btn btn-ghost btn-sm adm-danger-t', type: 'button', text: t('admin.d.clearImage'),
            on: { click: function () { put(''); savedToast(); } }
          }),
          file
        ])
      ]),
      url
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
  /* 5. Image downscaling                                                    */
  /* ====================================================================== */

  function downscale(file, maxPx) {
    return new Promise(function (resolve, reject) {
      var fr;
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
            var sc = 1, cw, ch, cv, cx, png;
            if (!w || !h) { reject(new Error('size')); return; }
            if (Math.max(w, h) > maxPx) sc = maxPx / Math.max(w, h);
            cw = Math.max(1, Math.round(w * sc));
            ch = Math.max(1, Math.round(h * sc));
            cv = D.createElement('canvas');
            cv.width = cw; cv.height = ch;
            cx = cv.getContext ? cv.getContext('2d') : null;
            if (!cx) { reject(new Error('canvas')); return; }
            png = /png/i.test(str(file.type));
            if (!png) { cx.fillStyle = '#FFFFFF'; cx.fillRect(0, 0, cw, ch); }
            cx.drawImage(img, 0, 0, cw, ch);
            resolve(cv.toDataURL(png ? 'image/png' : 'image/jpeg', 0.85));
          } catch (e) { reject(e); }
        };
        img.src = String(fr.result);
      };
      try { fr.readAsDataURL(file); }
      catch (e) { reject(e); }
    });
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
          F('price', 'num', 'admin.f.price', { step: 1, min: 0, hint: 'admin.h.price' })
        ],
        blank: function () { return { id: '', name: { ar: '', en: '' }, kind: 'gloss', price: 0 }; },
        preview: function (it) {
          return nailChip(baseNail({ color: '#D9BCC4', finish: str(it.kind) || 'gloss' }), { shape: 'almond' });
        },
        sub: function (it) { return str(it.kind) + ' · ' + money(numOf(it.price, 0)); }
      };

      case 'patterns': return {
        key: 'patterns',
        fields: [
          F('name', 't', 'admin.f.name'),
          F('kind', 'select', 'admin.f.kind', { opts: patternKindOpts }),
          F('price', 'num', 'admin.f.price', { step: 1, min: 0, hint: 'admin.h.price' })
        ],
        blank: function () { return { id: '', name: { ar: '', en: '' }, kind: 'none', price: 0 }; },
        preview: function (it) {
          return nailChip(baseNail({
            color: '#E9C2C0',
            pattern: { kind: str(it.kind) || 'none', color: '#FFFFFF', color2: '#C08BA6', scale: 1 }
          }), { shape: 'almond' });
        },
        sub: function (it) { return str(it.kind) + ' · ' + money(numOf(it.price, 0)); }
      };

      case 'colors': return {
        key: 'colors',
        searchable: true,
        fields: [
          F('name', 't', 'admin.f.name'),
          F('hex', 'color', 'admin.f.hex'),
          F('group', 'select', 'admin.f.group', { opts: colorGroupOpts })
        ],
        blank: function () { return { id: '', name: { ar: '', en: '' }, hex: '#E9C2C0', group: 'nude' }; },
        preview: function (it) { return swatchChip(it.hex); },
        sub: function (it) { return str(it.group) + ' · ' + str(it.hex); }
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
          F('glyph', 'text', 'admin.f.glyph', { hint: 'admin.h.glyph' }),
          F('price', 'num', 'admin.f.price', { step: 1, min: 0, hint: 'admin.h.price' }),
          F('group', 'select', 'admin.f.group', { opts: charmGroupOpts }),
          F('image', 'image', 'admin.f.image', { wide: true, hint: 'admin.h.charmImage' })
        ],
        blank: function () {
          return { id: '', name: { ar: '', en: '' }, glyph: '✨', image: '', price: 0, group: 'misc' };
        },
        preview: function (it) {
          if (str(it.image)) return el('span', { 'class': 'adm-sw adm-sw-img' }, el('img', { src: str(it.image), alt: '' }));
          return el('span', { 'class': 'adm-glyph', text: str(it.glyph) || '•' });
        },
        sub: function (it) { return str(it.group) + ' · ' + money(numOf(it.price, 0)); }
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
      var blank = typeof def.blank === 'function' ? def.blank() : {};
      var made;
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
        el('span', { text: t('admin.addNew') })
      ])
    ]));

    if (o.help) host.appendChild(el('p', { 'class': 'hint adm-crud-help', text: o.help }));
    host.appendChild(rowsBox);
    repaint();
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

  function readDraft() {
    var raw = null, data;
    try { raw = window.localStorage.getItem('shosh-draft'); }
    catch (e) { raw = null; }
    if (!raw) return null;
    try { data = JSON.parse(raw); }
    catch (e2) { return null; }
    return isObj(data) ? data : null;
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
        F('image', 'image', 'admin.d.image', { wide: true, hint: 'admin.d.imageX' })
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
      extra: function (it, repaint) {
        return el('div', { 'class': 'adm-dact' }, [
          el('a', {
            'class': 'btn btn-line btn-sm', href: 'design.html#load=' + encodeURIComponent(str(it.id)),
            text: t('admin.d.openStudio')
          }),
          el('button', {
            'class': 'btn btn-ghost btn-sm', type: 'button', text: t('admin.d.capture'),
            on: { click: function () {
              var draft = readDraft();
              if (!draft) { toast(t('admin.d.captureNone'), 'err'); return; }
              confirmBox(t('admin.d.captureAsk')).then(function (yes) {
                if (!yes) return;
                SN.Store.update('designs', it.id, { config: draft });
                toast(t('admin.d.captureOk'), 'ok');
                if (typeof repaint === 'function') repaint();
              });
            } }
          })
        ]);
      }
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

  function openOrder(o, repaint) {
    var body = el('div', { 'class': 'adm-omodal' });
    var text = '';
    var sel;

    try {
      if (SN.Checkout && typeof SN.Checkout.summary === 'function') text = SN.Checkout.summary(o, lang());
    } catch (e) { text = ''; }

    body.appendChild(orderPreviewNode(o));

    body.appendChild(el('dl', { 'class': 'adm-ometa' }, [
      el('dt', { text: t('order.number') }), el('dd', { text: str(o.no) || '—' }),
      el('dt', { text: t('common.date') }), el('dd', { text: orderStamp(o.ts) }),
      el('dt', { text: t('order.name') }), el('dd', { text: str(o.customer && o.customer.name) || '—' }),
      el('dt', { text: t('order.phone') }), el('dd', { 'class': 'ltr', text: str(o.customer && o.customer.phone) || '—' }),
      el('dt', { text: t('order.city') }), el('dd', { text: str(o.customer && o.customer.city) || '—' }),
      el('dt', { text: t('order.address') }), el('dd', { text: str(o.customer && o.customer.address) || '—' }),
      el('dt', { text: t('pay.title') }), el('dd', { text: str(o.payment && o.payment.name) || '—' }),
      el('dt', { text: t('admin.o.kindLbl') }), el('dd', { text: t(o.kind === 'ready' ? 'order.ready' : 'order.custom') }),
      el('dt', { text: t('order.qty') }), el('dd', { text: String(numOf(o.qty, 1)) }),
      el('dt', { text: t('admin.o.totalLbl') }), el('dd', { text: money(orderTotal(o)) })
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

    body.appendChild(el('div', { 'class': 'adm-osum' }, [
      el('h4', { 'class': 'label', text: t('admin.o.sum') }),
      el('pre', { 'class': 'adm-pre', text: text })
    ]));

    body.appendChild(el('div', { 'class': 'adm-obtns' }, [
      el('button', {
        'class': 'btn btn-line btn-sm', type: 'button', text: t('admin.o.copySum'),
        on: { click: function () {
          SN.UI.copy(text).then(function (ok) {
            toast(t(ok ? 'common.copied' : 'common.error'), ok ? 'ok' : 'err');
          });
        } }
      }),
      el('button', {
        'class': 'btn btn-pri btn-sm', type: 'button', text: t('admin.o.waReply'),
        on: { click: function () {
          var link = custWaLink(o.customer && o.customer.phone, text);
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

    var m = SN.UI.modal({
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
      'shosh-nail-orders-' + orderStamp(Date.now()).slice(0, 10) + '.csv',
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
            on: { click: function () { S.orderStatus = id; paintChips(); paintRows(); } }
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

    function repaint() { paintChips(); paintRows(); sideCounts(); }

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
        el('button', {
          'class': 'btn btn-line btn-sm toolbar-end', type: 'button', text: t('admin.o.exportCsv'),
          on: { click: exportOrders }
        })
      ]),
      chips,
      listBox
    ]));

    paintChips();
    paintRows();
    return box;
  }

  /* ====================================================================== */
  /* 16. Tab: backup                                                         */
  /* ====================================================================== */

  function storageKb() {
    var n = 0;
    try { n = str(JSON.stringify(SN.Store.state)).length; }
    catch (e) { n = 0; }
    return Math.round(n / 1024);
  }

  function renderBackup() {
    var box = el('div', { 'class': 'adm-tabbody' });
    var fileIn = el('input', { 'class': 'sr-only adm-file', type: 'file', accept: 'application/json,.json' });
    var kb = storageKb();
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
      el('p', { 'class': 'strong', text: t('admin.b.storeUsed', { n: kb }) }),
      el('div', { 'class': 'note ' + (kb > 4096 ? 'note-warn' : 'note-ok') }, [
        el('span', { 'class': 'ico', html: icon(kb > 4096 ? 'shield' : 'check', 16), 'aria-hidden': 'true' }),
        el('span', { text: kb > 4096 ? t('admin.b.storeWarn') : t('admin.b.storeOk') })
      ])
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

  var PASS_KEY = 'shosh-admin-pwfile';
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

  var RENDER = {
    general: renderGeneral,
    home: renderHome,
    pricing: renderPricing,
    shapes: simpleTab('shapes'),
    lengths: simpleTab('lengths'),
    colors: simpleTab('colors'),
    finishes: simpleTab('finishes'),
    patterns: simpleTab('patterns'),
    charms: simpleTab('charms'),
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
  /* 18. Shell: gate, sidebar, body                                          */
  /* ====================================================================== */

  function renderGate() {
    var root = refs.root;
    var input = el('input', {
      'class': 'input', type: 'password', id: 'adm-pass',
      placeholder: t('admin.gatePassPh'), autocomplete: 'current-password'
    });
    var err = el('p', { 'class': 'field-err' });
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
    }, false);

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
      el('p', { 'class': 'hint', text: t('admin.gateHint') }),
      el('a', { 'class': 'link adm-gate-back', href: 'index.html', text: t('admin.gateBack') })
    ]);

    root.appendChild(el('div', { 'class': 'adm-gate' }, cardEl));
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
      if (ev && ev.key === 'shosh-nail-v1' && SN.Store.isAdmin()) renderBody();
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
