/*! Shosh Nail — assets/js/studio.js
 *  SN.Studio : the custom design studio (owner: STUDIO)
 *  Contract: SPEC.md sections 4, 6, 9, 10, 11, 12, 13. One property: window.SN.Studio
 *
 *  A six step wizard over a single DESIGN_CONFIG (SPEC section 6):
 *    1 skin + hand · 2 shape + length · 3 sizes · 4 colours + decoration ·
 *    5 finishing touches · 6 review
 *
 *  Everything is driven by one `state` object; each step has its own builder
 *  and the preview pane is re-rendered from the same design, so the picture on
 *  screen is always literally what will be ordered.
 *
 *  Hash contract:
 *    #step=4            the wizard step (kept in sync so Back/Forward work)
 *    #load=<designId>   preload a ready-made design from Store.designs
 *    #d=<base64url>     load a shared design (validated, never throws)
 *  Autosave: localStorage['shosh-draft'] (debounced), restored behind a
 *  dismissible bar. Recent custom colours live in 'shosh-studio-recent'.
 */
(function () {
  'use strict';

  var SN = (window.SN = window.SN || {});
  var D = document;

  /* ====================================================================== */
  /* 0. Dictionary — namespace `studio` (SPEC section 10)                    */
  /* ====================================================================== */

  var DICT = {
    ar: {
      studio: {
        eyebrow: 'استوديو التصميم',
        title: 'صمّمي طقمك من الصفر',
        sub: 'ست خطوات بس، وتشوفين طقمك يتكوّن قدّامك ظفر بظفر.',
        stepsNav: 'خطوات التصميم',
        preview: 'معاينة التصميم',
        expand: 'تكبير المعاينة',
        collapse: 'تصغير المعاينة',
        stepOf: 'الخطوة {n} من {total}',
        estimate: 'السعر التقديري',

        s1: 'البشرة واليد',
        s2: 'الشكل والطول',
        s3: 'المقاسات',
        s4: 'الألوان والزخرفة',
        s5: 'لمسات أخيرة',
        s6: 'المراجعة',

        /* step 1 */
        skinTitle: 'لون البشرة',
        skinText: 'اختاري الأقرب للون يدك عشان تشوفين التصميم على طبيعته.',
        handTitle: 'تبين الطقم لأي يد؟',
        handText: 'الطقم الكامل عشرة أظافر لليدين. تقدرين تطلبين يد وحدة لو تبين.',
        handBoth: 'اليدين',
        handRight: 'اليد اليمنى',
        handLeft: 'اليد اليسرى',
        handNote: 'طلب يد وحدة = خمسة أظافر.',

        /* step 2 */
        shapeTitle: 'شكل الظفر',
        shapeText: 'كل شكل معروض بالرسم الحقيقي — اضغطي عليه وشوفيه على يدك فوق.',
        lenTitle: 'الطول',
        lenText: 'نفس الشكل بأربعة أطوال. الأطوال الزايدة تحتاج عناية أكثر بس تعطي شكل أجرأ.',
        included: 'مشمول',

        /* step 3 */
        methodTitle: 'طريقة القياس',
        methodText: 'اختاري الطريقة اللي تريّحك — تقدرين تعدّلين أي إصبع بعدها.',
        presetTitle: 'المقاسات الجاهزة',
        presetPick: 'اختاري المقاس الأقرب ليدك',
        rulerTitle: 'قيسي كل ظفر بالمليمتر',
        rulerText: 'حرّكي المؤشر لعرض الظفر بالمليمتر، ورقم المقاس يتحدّث تلقائيًا.',
        mmRuler: 'مسطرة على الشاشة',
        mmNote: 'المسطرة مرسومة بمقاس حقيقي تقريبًا — تختلف قليلًا حسب حجم الشاشة ونسبة التكبير، فاعتمديها للتقريب فقط.',
        mmUnit: 'مم',
        sizeNo: 'مقاس',
        howTitle: 'كيف تقيسين صح؟',
        kitTitle: 'عدّة القياس',
        kitCta: 'اطلبي عدّة القياس على واتساب',
        kitMsg: 'السلام عليكم، أبغى أطلب عدّة القياس من شوش نيل.',
        sizeTitle: 'مقاسات أصابعك',
        sizeText: 'الرقم الأصغر يعني ظفر أعرض. لو كنتِ بين مقاسين اختاري الأوسع.',
        applyAll: 'طبّق على الكل',
        applyAllDone: 'انطبّق المقاس على كل الأصابع',
        copyHand: 'انسخ لليد الثانية',
        copyDone: 'انتسخت المقاسات لليد الثانية',
        rightHand: 'اليد اليمنى',
        leftHand: 'اليد اليسرى',

        /* step 4 */
        selTitle: 'اختاري الأظافر',
        selHint: 'اضغطي على أي ظفر في المعاينة لتحديده، وباستمرار الضغط على Shift تحدّدين أكثر من ظفر.',
        selAll: 'تحديد الكل',
        selRight: 'تحديد اليد اليمنى',
        selLeft: 'تحديد اليد اليسرى',
        selNone: 'إلغاء التحديد',
        selCount: '{n} ظفر محدّد',
        selCount1: 'ظفر واحد محدّد',
        selEmpty: 'ما فيه ظفر محدّد — اضغطي على ظفر من المعاينة فوق.',
        toolColor: 'اللون',
        toolFinish: 'اللمسة',
        toolPattern: 'النقشة',
        toolCharm: 'الزخارف',
        groupAll: 'كل الألوان',
        customColor: 'لون مخصص',
        recent: 'الألوان الأخيرة',
        finishTitle: 'لمسة السطح',
        patternTitle: 'النقشة',
        patColor: 'اللون الأساسي للنقشة',
        patColor2: 'اللون الثاني',
        patScale: 'حجم النقشة',
        charmTitle: 'أضيفي زخرفة',
        charmList: 'زخارف الظفر المحدّد',
        charmNone: 'ما فيه زخارف على هذا الظفر بعد — اختاري وحدة من فوق.',
        charmAdded: 'انضافت الزخرفة',
        charmLimit: 'وصلتي أقصى عدد زخارف لهذا الظفر.',
        editorTitle: 'حرّكي الزخارف',
        dragHint: 'اسحبي أي زخرفة بإصبعك أو بالماوس لتحطّينها في مكانها المضبوط.',
        editorEmpty: 'ما فيه زخارف تتحرّك — أضيفي وحدة أول.',
        moveUp: 'تحريك للأعلى',
        moveDown: 'تحريك للأسفل',
        moveLeft: 'تحريك لليسار',
        moveRight: 'تحريك لليمين',
        bigger: 'تكبير',
        smaller: 'تصغير',
        rotL: 'تدوير لليسار',
        rotR: 'تدوير لليمين',
        removeCharm: 'إزالة الزخرفة',
        copyNail: 'نسخ الظفر',
        pasteNail: 'لصق على المحدّد',
        noCopy: 'ما نسختي أي ظفر بعد',
        copiedNail: 'انتسخ الظفر',
        pastedNail: 'انلصق على الأظافر المحدّدة',
        randomize: 'عشوائي',
        clearNail: 'تصفير الظفر',
        cleared: 'رجّعنا الظفر لأصله',
        needSel: 'حدّدي ظفرًا واحدًا على الأقل',
        nothingUndo: 'ما فيه شي نتراجع عنه',
        nothingRedo: 'ما فيه شي نعيده',

        /* step 5 */
        qtyTitle: 'كم طقم تبين؟',
        qtyText: 'نفس التصميم بنفس المقاسات، ينفّذ أكثر من مرة.',
        extrasTitle: 'إضافات',
        notesTitle: 'ملاحظاتك',
        notesPh: 'أي تفصيل تبين ننتبه له؟ اكتبيه هنا.',
        saveTitle: 'احفظي تصميمك',
        saveText: 'التصميم ينحفظ في هذا المتصفح فقط، وتقدرين ترجعين له بأي وقت.',
        saveBtn: 'احفظ تصميمي',
        saveName: 'سمّي التصميم',
        saveNamePh: 'مثال: طقم العيد',
        savedOk: 'انحفظ تصميمك',
        myDesigns: 'تصاميمي المحفوظة',
        noSaved: 'ما عندك تصاميم محفوظة في هذا الجهاز.',
        loadBtn: 'فتح',
        loadedSaved: 'فتحنا التصميم المحفوظ',
        shareTitle: 'مشاركة التصميم',
        shareText: 'ينسخ رابط يفتح نفس التصميم عند أي شخص — أرسليه لصديقتك أو احفظيه لنفسك.',
        shareBtn: 'نسخ رابط التصميم',
        shareOk: 'انتسخ الرابط',
        shareFail: 'ما قدرنا ننسخ الرابط، انسخيه يدويًا.',

        /* step 6 */
        reviewTitle: 'مراجعة أخيرة',
        reviewText: 'شوفي كل شي قبل ما ترسلين الطلب — وتقدرين ترجعين لأي خطوة وتعدّلين.',
        specTitle: 'مواصفات الطقم',
        nailsTitle: 'تفاصيل كل ظفر',
        priceTitle: 'تفاصيل السعر',
        confirm: 'تأكيد الطلب',
        png: 'تحميل صورة',
        pngOk: 'نزّلنا صورة تصميمك',
        pngFail: 'ما قدرنا نحفظ الصورة',
        print: 'طباعة',
        lblShape: 'الشكل',
        lblLength: 'الطول',
        lblSkin: 'البشرة',
        lblHand: 'اليد',
        lblMeasure: 'طريقة القياس',
        lblQty: 'عدد الأطقم',
        lblColors: 'عدد الألوان',
        lblPatterns: 'أظافر منقوشة',
        lblCharms: 'عدد الزخارف',
        plain: 'بدون نقشة',
        noCharms: 'بدون زخارف',
        charmsN: '{n} زخرفة',
        charmsN1: 'زخرفة وحدة',

        /* misc */
        restoreTitle: 'عندك تصميم ما خلّصتيه',
        restoreText: 'حفظنا لك آخر تصميم شغّالة عليه في هذا الجهاز.',
        restoreYes: 'تابعي تصميمك',
        restoreNo: 'ابدئي من جديد',
        loadedReady: 'فتحنا التصميم الجاهز — عدّلي عليه براحتك',
        loadedShared: 'فتحنا التصميم المشترك',
        badShared: 'الرابط المشترك غير صالح، فبدأنا بتصميم جديد',
        newDesign: 'تصميم جديد',
        newConfirm: 'نبدأ تصميم جديد؟ اللي سوّيتيه راح ينمسح.',
        stepDone: 'تمت',

        /* progress — the journey line under the step strip */
        progStart: 'ست خطوات قصيرة وطقمك يصير جاهز.',
        progLeft: 'باقي {n} خطوات وتخلصين.',
        progLeft2: 'باقي خطوتين وتخلصين.',
        progLeft1: 'باقي خطوة وحدة — قرّبتي!',
        progAll: 'كل الخطوات تمّت — طقمك جاهز للطلب.',

        /* gentle invitations when a step is still on its defaults */
        nudge1: 'اخترنا لك بشرة ويدين مبدئيًا — عدّليها عشان الطقم يطلع على لون يدك بالضبط.',
        nudge2: 'الشكل والطول لسا على المبدئي — جرّبي شكل ثاني وشوفيه على يدك فوق.',
        nudge3: 'المقاسات الحين على الوسط — لو تعرفين مقاسك عدّليه ويجيك مضبوط.',
        nudge4: 'كل الأظافر بلون واحد — جرّبي لون على البنصر أو نقشة خفيفة، وترجعين بضغطة وحدة.',

        /* step-4 shortcuts */
        applyLook: 'طبّقي الشكل على الكل',
        mirrorLook: 'انسخي لليد الثانية',
        appliedLook: 'انطبّق الشكل على كل الأظافر',
        mirroredLook: 'انتسخ الشكل لليد الثانية',
        undoSafe: 'جرّبي براحتك — أي شي تسوّينه ترجّعينه بزر التراجع.',

        /* the randomiser */
        randHint: 'كل ضغطة تعطيك تركيبة ألوان منسّقة جاهزة للتصوير.',
        randRoll: 'نخلط الألوان…',
        randDone: 'لوك {name}',

        /* review + sharing */
        reviewProud: 'هذا طقمك',
        reviewOwn: 'كل تفصيلة فيه اخترتيها بنفسك.',
        reviewTotal: 'الإجمالي',
        priceHonest: 'كل بند فوق محسوب من اختياراتك — ما فيه رسوم مخفية.',
        shareImg: 'مشاركة الصورة',
        shareImgText: 'أرسلي صورة طقمك لصديقتك أو انشريها في ستوريك.',
        sharedOk: 'انشاركت صورة تصميمك',
        preparing: 'نجهّز الصورة…'
      }
    },

    en: {
      studio: {
        eyebrow: 'Design studio',
        title: 'Build your set from scratch',
        sub: 'Six short steps, and you watch the set come together nail by nail.',
        stepsNav: 'Design steps',
        preview: 'Design preview',
        expand: 'Enlarge preview',
        collapse: 'Shrink preview',
        stepOf: 'Step {n} of {total}',
        estimate: 'Estimated price',

        s1: 'Skin & hand',
        s2: 'Shape & length',
        s3: 'Sizes',
        s4: 'Colour & art',
        s5: 'Finishing',
        s6: 'Review',

        skinTitle: 'Skin tone',
        skinText: 'Pick the closest match to your hand so the preview looks like the real thing.',
        handTitle: 'Which hand is this set for?',
        handText: 'A full set is ten nails for both hands. You can order a single hand instead.',
        handBoth: 'Both hands',
        handRight: 'Right hand',
        handLeft: 'Left hand',
        handNote: 'A single hand means five nails.',

        shapeTitle: 'Nail shape',
        shapeText: 'Every shape is drawn for real — tap one and see it on the hand above.',
        lenTitle: 'Length',
        lenText: 'The same shape at four lengths. Longer sets look bolder and need a little more care.',
        included: 'Included',

        methodTitle: 'How would you like to size?',
        methodText: 'Pick whichever suits you — you can still fine-tune any finger afterwards.',
        presetTitle: 'Ready presets',
        presetPick: 'Choose the preset closest to your hand',
        rulerTitle: 'Measure every nail in millimetres',
        rulerText: 'Slide to your nail width in millimetres and the size number follows along.',
        mmRuler: 'On-screen ruler',
        mmNote: 'This ruler is drawn close to real scale — it shifts a little with screen size and zoom, so use it as a guide.',
        mmUnit: 'mm',
        sizeNo: 'Size',
        howTitle: 'How to measure properly',
        kitTitle: 'Sizing kit',
        kitCta: 'Request a sizing kit on WhatsApp',
        kitMsg: 'Hi! I would like to request the Shosh Nail sizing kit.',
        sizeTitle: 'Your finger sizes',
        sizeText: 'A smaller number means a wider nail. Between two sizes? Always take the wider one.',
        applyAll: 'Apply to all',
        applyAllDone: 'Size applied to every finger',
        copyHand: 'Copy to the other hand',
        copyDone: 'Sizes copied to the other hand',
        rightHand: 'Right hand',
        leftHand: 'Left hand',

        selTitle: 'Choose the nails',
        selHint: 'Tap any nail in the preview to select it; hold Shift to select several at once.',
        selAll: 'Select all',
        selRight: 'Select right hand',
        selLeft: 'Select left hand',
        selNone: 'Clear selection',
        selCount: '{n} nails selected',
        selCount1: '1 nail selected',
        selEmpty: 'No nail selected — tap one in the preview above.',
        toolColor: 'Colour',
        toolFinish: 'Finish',
        toolPattern: 'Pattern',
        toolCharm: 'Charms',
        groupAll: 'All colours',
        customColor: 'Custom shade',
        recent: 'Recent colours',
        finishTitle: 'Surface finish',
        patternTitle: 'Pattern',
        patColor: 'Main pattern colour',
        patColor2: 'Second colour',
        patScale: 'Pattern size',
        charmTitle: 'Add a charm',
        charmList: 'Charms on the selected nail',
        charmNone: 'No charms on this nail yet — pick one above.',
        charmAdded: 'Charm added',
        charmLimit: 'That nail is carrying as many charms as it can.',
        editorTitle: 'Place the charms',
        dragHint: 'Drag any charm with your finger or the mouse to place it exactly where you want it.',
        editorEmpty: 'Nothing to move yet — add a charm first.',
        moveUp: 'Move up',
        moveDown: 'Move down',
        moveLeft: 'Move left',
        moveRight: 'Move right',
        bigger: 'Bigger',
        smaller: 'Smaller',
        rotL: 'Rotate left',
        rotR: 'Rotate right',
        removeCharm: 'Remove charm',
        copyNail: 'Copy nail',
        pasteNail: 'Paste on selected',
        noCopy: 'Nothing copied yet',
        copiedNail: 'Nail copied',
        pastedNail: 'Pasted onto the selected nails',
        randomize: 'Surprise me',
        clearNail: 'Reset nail',
        cleared: 'Nail reset',
        needSel: 'Select at least one nail first',
        nothingUndo: 'Nothing to undo',
        nothingRedo: 'Nothing to redo',

        qtyTitle: 'How many sets?',
        qtyText: 'The same design and the same sizes, made more than once.',
        extrasTitle: 'Extras',
        notesTitle: 'Your notes',
        notesPh: 'Anything we should know? Write it here.',
        saveTitle: 'Save your design',
        saveText: 'It is stored in this browser only, and you can come back to it any time.',
        saveBtn: 'Save my design',
        saveName: 'Name this design',
        saveNamePh: 'e.g. Eid set',
        savedOk: 'Design saved',
        myDesigns: 'My saved designs',
        noSaved: 'No designs saved on this device yet.',
        loadBtn: 'Open',
        loadedSaved: 'Saved design opened',
        shareTitle: 'Share the design',
        shareText: 'Copies a link that opens this exact design for anyone — send it to a friend or keep it for yourself.',
        shareBtn: 'Copy design link',
        shareOk: 'Link copied',
        shareFail: 'We could not copy the link, please copy it by hand.',

        reviewTitle: 'One last look',
        reviewText: 'Check everything before you send the order — you can jump back to any step.',
        specTitle: 'Set specification',
        nailsTitle: 'Nail by nail',
        priceTitle: 'Price breakdown',
        confirm: 'Confirm the order',
        png: 'Download image',
        pngOk: 'Your design image was saved',
        pngFail: 'We could not save the image',
        print: 'Print',
        lblShape: 'Shape',
        lblLength: 'Length',
        lblSkin: 'Skin tone',
        lblHand: 'Hands',
        lblMeasure: 'Sizing method',
        lblQty: 'Sets',
        lblColors: 'Distinct colours',
        lblPatterns: 'Patterned nails',
        lblCharms: 'Charms',
        plain: 'No pattern',
        noCharms: 'No charms',
        charmsN: '{n} charms',
        charmsN1: '1 charm',

        restoreTitle: 'You have an unfinished design',
        restoreText: 'We kept the last design you were working on in this browser.',
        restoreYes: 'Continue it',
        restoreNo: 'Start fresh',
        loadedReady: 'Ready design opened — tweak it however you like',
        loadedShared: 'Shared design opened',
        badShared: 'That shared link was not valid, so we started a new design',
        newDesign: 'New design',
        newConfirm: 'Start a new design? Everything you did will be cleared.',
        stepDone: 'done',

        progStart: 'Six short steps and your set is ready.',
        progLeft: '{n} steps to go.',
        progLeft2: 'Two steps to go.',
        progLeft1: 'One step to go — almost there!',
        progAll: 'Every step done — your set is ready to order.',

        nudge1: 'We started you on a default tone and both hands — set yours so the preview matches your real hand.',
        nudge2: 'Shape and length are still the defaults — try another shape and see it on your hand above.',
        nudge3: 'Sizes are on the medium preset — set yours and the fit comes out right.',
        nudge4: 'Every nail is still one colour — try a shade on the ring finger or a light pattern. One tap brings it back.',

        applyLook: 'Apply this look to all',
        mirrorLook: 'Copy to the other hand',
        appliedLook: 'That look is on every nail now',
        mirroredLook: 'Copied to the other hand',
        undoSafe: 'Play freely — undo brings anything back.',

        randHint: 'Every tap gives you a styled colour set, ready to photograph.',
        randRoll: 'Mixing your shades…',
        randDone: '{name} look',

        reviewProud: 'This is your set',
        reviewOwn: 'Every detail on it is your own choice.',
        reviewTotal: 'Total',
        priceHonest: 'Every line above comes from your own choices — no hidden fees.',
        shareImg: 'Share the image',
        shareImgText: 'Send your set to a friend or post it to your story.',
        sharedOk: 'Your design image was shared',
        preparing: 'Preparing the image…'
      }
    }
  };

  if (SN.I18n && typeof SN.I18n.extend === 'function') SN.I18n.extend(DICT);

  /* ====================================================================== */
  /* 1. Small private helpers                                               */
  /* ====================================================================== */

  var STEP_COUNT = 6;
  var DRAFT_KEY = 'shosh-draft';
  var RECENT_KEY = 'shosh-studio-recent';
  var HIST_MAX = 40;
  var CHARM_MAX = 8;
  var MM_MIN = 7;
  var MM_MAX = 18;

  function el(tag, attrs, kids) { return SN.UI.el(tag, attrs, kids); }
  function icon(name, size) { return (SN.UI && SN.UI.icon) ? SN.UI.icon(name, size) : ''; }
  function t(key, vars) { return (SN.I18n && SN.I18n.t) ? SN.I18n.t(key, vars) : String(key); }
  function pick(tobj) {
    if (SN.I18n && SN.I18n.pick) return SN.I18n.pick(tobj);
    if (!tobj) return '';
    return typeof tobj === 'string' ? tobj : (tobj.ar || tobj.en || '');
  }
  function money(n) { return (SN.I18n && SN.I18n.money) ? SN.I18n.money(n) : String(n); }
  function nfm(n) { return (SN.I18n && SN.I18n.num) ? SN.I18n.num(n) : String(n); }
  /* "{n} nails selected" reads wrong at one, and Arabic wants its own singular
     too, so every counted string ships a `<key>1` twin used when n === 1. */
  function countT(key, n) {
    return n === 1
      ? t('studio.' + key + '1')
      : t('studio.' + key, { n: nfm(n) });
  }
  function toast(msg, type) { if (SN.UI && SN.UI.toast) SN.UI.toast(msg, type || 'info'); }

  function list(key) {
    var v = (SN.Store && SN.Store.list) ? SN.Store.list(key) : null;
    return Array.isArray(v) ? v : [];
  }
  function findItem(key, id) {
    return (SN.Store && SN.Store.find) ? SN.Store.find(key, id) : null;
  }
  function setting(path, fb) {
    return (SN.Store && SN.Store.get) ? SN.Store.get(path, fb) : fb;
  }

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function has(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }

  function clone(v) {
    var out, i, k;
    if (Array.isArray(v)) {
      out = [];
      for (i = 0; i < v.length; i++) out.push(clone(v[i]));
      return out;
    }
    if (isObj(v)) {
      out = {};
      for (k in v) if (has(v, k)) out[k] = clone(v[k]);
      return out;
    }
    return v;
  }

  function hex(v, fb) {
    var s = typeof v === 'string' ? v.trim() : '';
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toUpperCase();
    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
      return ('#' + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)).toUpperCase();
    }
    return fb;
  }

  function keys() { return (SN.Nail && SN.Nail.KEYS) ? SN.Nail.KEYS : []; }
  function fingers() { return (SN.Nail && SN.Nail.FINGERS) ? SN.Nail.FINGERS : []; }

  function sideOf(key) { return String(key).indexOf('left') === 0 ? 'left' : 'right'; }
  function fingerOf(key) {
    var s = String(key);
    var f = s.indexOf('left') === 0 ? s.slice(4) : (s.indexOf('right') === 0 ? s.slice(5) : s);
    return f.charAt(0).toLowerCase() + f.slice(1);
  }
  function keyOf(side, finger) { return side + finger.charAt(0).toUpperCase() + finger.slice(1); }
  function fingerName(f) {
    var arr = fingers(), i;
    for (i = 0; i < arr.length; i++) if (arr[i].key === f) return pick(arr[i].name) || f;
    return f;
  }
  function handName(side) { return side === 'left' ? t('studio.leftHand') : t('studio.rightHand'); }
  function nailName(key) { return fingerName(fingerOf(key)) + ' · ' + handName(sideOf(key)); }

  /* slugs used for the focus-restore hook — kept to a safe character set */
  function fk(v) { return String(v).replace(/[^A-Za-z0-9_:-]/g, ''); }

  function keepFocus(host, build) {
    var a = D.activeElement;
    var mark = null, node;
    if (host && a && host.contains(a) && a.getAttribute) {
      mark = a.getAttribute('data-fk') || null;
    }
    build();
    if (mark && host) {
      node = host.querySelector('[data-fk="' + mark + '"]');
      if (node && node.focus) {
        try { node.focus({ preventScroll: true }); }
        catch (e) { try { node.focus(); } catch (e2) { /* ignore */ } }
      }
    }
  }

  function empty(node) {
    if (!node) return node;
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { window.localStorage.removeItem(k); return true; } catch (e) { return false; } }

  /* ====================================================================== */
  /* 1b. Motion — every effect in this file goes through here                */
  /* ====================================================================== */
  /* The studio owns no stylesheet, so the vocabulary here is base.css's
     motion system (section 20): `.sn-pulse` for a small win, `.sn-glow` for a
     value that just changed, `.sn-burst` for a payoff, `.sn-in` for something
     arriving. Only the two things that system has no word for — a charm
     dropping onto a nail, and one lifting under a finger — are scripted, and
     they read their timing out of the same tokens.

     Everything passes one gate, `reduced()`, read live so switching the OS
     setting takes effect without a reload. Only transform and opacity are
     animated, and nothing loops. */

  var SVGNS = 'http://www.w3.org/2000/svg';

  var motionMQ = null;
  try {
    motionMQ = (window.matchMedia) ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  } catch (e) { motionMQ = null; }

  function reduced() { return !!(motionMQ && motionMQ.matches); }

  /* read a design token so scripted motion cannot drift from the stylesheet */
  var tokens = {};
  function token(name, fallback) {
    var v;
    if (has(tokens, name)) return tokens[name];
    try { v = window.getComputedStyle(D.documentElement).getPropertyValue(name); }
    catch (e) { v = ''; }
    v = String(v || '').trim();
    tokens[name] = v || fallback;
    return tokens[name];
  }
  function tokenMs(name, fallback) {
    var v = token(name, ''), n;
    if (/ms\s*$/.test(v)) n = parseFloat(v);
    else if (/s\s*$/.test(v)) n = parseFloat(v) * 1000;
    else n = NaN;
    return isFinite(n) && n > 0 ? n : fallback;
  }

  function easeOut() { return token('--ease-out', 'cubic-bezier(.16,.86,.42,1)'); }
  function drop() { return tokenMs('--dur-3', 420); }

  function play(node, frames, opts) {
    if (!node || reduced() || typeof node.animate !== 'function') return null;
    try { return node.animate(frames, opts); }
    catch (e) { return null; }
  }

  /* A rendered nail carries its own `transform` attribute (position + finger
     angle). A CSS transform would REPLACE it, so anything we animate gets a
     plain wrapper <g> of its own to scale inside. */
  function fxWrap(node) {
    var parent = node ? node.parentNode : null, g;
    if (!parent || !D.createElementNS) return null;
    if (parent.getAttribute && parent.getAttribute('data-fx') === '1') return parent;
    try {
      g = D.createElementNS(SVGNS, 'g');
      g.setAttribute('data-fx', '1');
      g.style.transformBox = 'fill-box';      /* scale about the nail, not the page */
      g.style.transformOrigin = '50% 50%';
      parent.insertBefore(g, node);
      g.appendChild(node);
      return g;
    } catch (e) { return null; }
  }

  /* the acknowledgement: a nail that was just changed gives one small bounce.
     `.sn-pulse` is the house class for exactly this; the wrapper is rebuilt on
     every repaint, so a fresh element means repeat taps never queue. */
  function popNails(list, host) {
    var stage = host || refs.stage, step = tokenMs('--stagger', 44), i, node, wrap;
    if (!stage || reduced() || !Array.isArray(list)) return;
    if (!onScreen(rectOf(stage))) return;      /* nothing to acknowledge off-screen */
    for (i = 0; i < list.length && i < 10; i++) {
      node = stage.querySelector ? stage.querySelector('g.nail[data-key="' + fk(list[i]) + '"]') : null;
      wrap = node ? fxWrap(node) : null;
      if (!wrap) continue;
      wrap.setAttribute('class', 'sn-pulse');
      try { wrap.style.animationDelay = Math.min(i * step * 0.6, 240) + 'ms'; }
      catch (e) { /* the pulse is worth having even without the stagger */ }
    }
  }

  /* ---- the payoff ------------------------------------------------------ */
  /* base.css ships `.sn-burst` as a 12-spark rose-and-gold burst that needs a
     position:relative host. Ours is pinned to the viewport instead of parented
     into the preview, because the mobile stage is a clipped strip and a burst
     cut in half is worse than none. The layer is forced to `direction:ltr` so
     its logical insets resolve to the same physical corner a DOMRect is
     measured from, in Arabic and English alike. */

  function sparkleAt(rect, scale) {
    var host, burst, k = num(scale, 1), i;
    if (!rect || reduced() || !D.body) return;
    if (!onScreen(rect)) return;              /* never burst off the visible page */

    burst = el('div', { 'class': 'sn-burst', 'aria-hidden': 'true' });
    for (i = 0; i < 12; i++) burst.appendChild(el('i', {}));

    host = el('div', { 'aria-hidden': 'true' }, [burst]);
    host.style.cssText = 'direction:ltr;position:fixed;z-index:70;pointer-events:none;' +
      'inline-size:' + rect.width + 'px;block-size:' + rect.height + 'px;' +
      'inset-block-start:' + rect.top + 'px;inset-inline-start:' + rect.left + 'px;' +
      (k === 1 ? '' : 'transform:scale(' + k + ');');
    D.body.appendChild(host);

    /* .sn-burst takes itself off screen; this takes it out of the document */
    window.setTimeout(function () {
      if (host && host.parentNode) host.parentNode.removeChild(host);
    }, Math.round(tokenMs('--dur-3', 420) * 2.4) + 260);
  }

  function rectOf(node) {
    if (!node || typeof node.getBoundingClientRect !== 'function') return null;
    try {
      var r = node.getBoundingClientRect();
      return (r && r.width && r.height) ? r : null;
    } catch (e) { return null; }
  }

  function onScreen(r) {
    return !!r && r.top < (window.innerHeight || 0) - 40 && r.bottom > 60;
  }

  function editorCanvasEl() {
    return refs.editor ? refs.editor.querySelector('.studio-canvas') : null;
  }

  /* The charm grid is long, so by the time she taps a charm the nail it lands
     on is usually below the fold — she would tap and see nothing happen. Bring
     the big nail back into view first, THEN celebrate. */
  function withCharmInView(done) {
    var canvas = editorCanvasEl();
    if (onScreen(rectOf(canvas)) || onScreen(rectOf(refs.stage))) { done(); return; }
    if (!canvas || typeof canvas.scrollIntoView !== 'function') { done(); return; }
    try { canvas.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); }
    catch (e) { try { canvas.scrollIntoView(); } catch (e2) { /* ignore */ } }
    window.setTimeout(done, reduced() ? 60 : 420);
  }

  /* the sparkle goes where SHE is looking: the big editor nail when it is on
     screen, otherwise the small hand in the preview — and nowhere at all if
     neither is, because a burst off the bottom of the page is wasted work */
  function sparkleOnCharm(key, index) {
    var canvas = editorCanvasEl();
    var svg = canvas ? canvas.firstChild : null;
    var marks = (svg && svg.querySelectorAll) ? svg.querySelectorAll('g.nail-charm') : null;
    var r = (marks && marks[index]) ? rectOf(marks[index]) : null;
    if (onScreen(r)) { sparkleAt(r, 0.62); return; }
    r = refs.stage ? rectOf(refs.stage.querySelector('g.nail[data-key="' + fk(key) + '"]')) : null;
    if (onScreen(r)) sparkleAt(r, 0.5);
  }

  /* ====================================================================== */
  /* 2. base64url — UTF-8 safe both ways, never throws                      */
  /* ====================================================================== */

  function utf8Bytes(str) {
    var out = '', i, bytes;
    if (typeof window.TextEncoder === 'function') {
      try {
        bytes = new window.TextEncoder().encode(str);
        for (i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
        return out;
      } catch (e) { /* fall through */ }
    }
    return unescape(encodeURIComponent(str));
  }

  function fromUtf8(binary) {
    var i, bytes;
    if (typeof window.TextDecoder === 'function') {
      try {
        bytes = new Uint8Array(binary.length);
        for (i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i) & 0xFF;
        return new window.TextDecoder('utf-8').decode(bytes);
      } catch (e) { /* fall through */ }
    }
    return decodeURIComponent(escape(binary));
  }

  function b64urlEncode(text) {
    try {
      return window.btoa(utf8Bytes(String(text)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
      console.warn('[SN.Studio] could not encode the design', e);
      return '';
    }
  }

  function b64urlDecode(text) {
    var s = String(text === undefined || text === null ? '' : text);
    var pad;
    try {
      s = s.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
      pad = s.length % 4;
      if (pad === 2) s += '==';
      else if (pad === 3) s += '=';
      else if (pad === 1) return '';
      return fromUtf8(window.atob(s));
    } catch (e) {
      return '';
    }
  }

  /* ====================================================================== */
  /* 3. The design: blank, validation, queries                              */
  /* ====================================================================== */

  function blank() {
    var d = (SN.Nail && SN.Nail.blank) ? SN.Nail.blank() : null;
    return isObj(d) ? d : {
      v: 1, skin: '#EFCDB6', shape: 'almond', length: 'medium', hand: 'both',
      measure: 'preset', sizes: {}, nails: {}, qty: 1, express: false, giftWrap: false, notes: ''
    };
  }

  function idExists(coll, id) {
    var arr = list(coll), i;
    for (i = 0; i < arr.length; i++) if (arr[i] && arr[i].id === id) return true;
    return false;
  }

  function patternKinds() {
    var out = ['none'], arr = list('patterns'), i, k;
    var known = (SN.Nail && SN.Nail.PATTERN_KINDS) ? SN.Nail.PATTERN_KINDS : null;
    for (i = 0; i < arr.length; i++) {
      k = arr[i] && typeof arr[i].kind === 'string' ? arr[i].kind : '';
      if (k && out.indexOf(k) === -1) out.push(k);
    }
    if (out.length === 1 && known) return known.slice();
    return out;
  }

  /* Defensive normaliser: takes anything (a shared link, an old draft, a ready
     design's config) and returns a valid DESIGN_CONFIG. Never throws. */
  function sanitize(raw) {
    var base = blank();
    var src = isObj(raw) ? raw : {};
    var out = base;
    var kk = keys(), i, j, k, n, sn, p, ch, c, kinds, arr, cap;

    out.v = 1;
    out.skin = hex(src.skin, base.skin);
    if (typeof src.shape === 'string' && idExists('shapes', src.shape)) out.shape = src.shape;
    if (typeof src.length === 'string' && idExists('lengths', src.length)) out.length = src.length;
    if (src.hand === 'right' || src.hand === 'left' || src.hand === 'both') out.hand = src.hand;
    if (typeof src.measure === 'string' && idExists('measureMethods', src.measure)) out.measure = src.measure;

    cap = Math.max(0, list('sizeGuide').length - 1) || 11;
    for (i = 0; i < kk.length; i++) {
      k = kk[i];
      if (isObj(src.sizes) && src.sizes[k] !== undefined) {
        out.sizes[k] = clamp(Math.round(num(src.sizes[k], out.sizes[k])), 0, cap);
      } else {
        out.sizes[k] = clamp(Math.round(num(out.sizes[k], 5)), 0, cap);
      }
    }

    kinds = patternKinds();
    for (i = 0; i < kk.length; i++) {
      k = kk[i];
      n = out.nails[k];
      sn = (isObj(src.nails) && isObj(src.nails[k])) ? src.nails[k] : null;
      if (!isObj(n)) {
        n = { color: '#E9C2C0', finish: 'gloss', pattern: { kind: 'none', color: '#FFFFFF', color2: '#E8B4C8', scale: 1 }, charms: [] };
        out.nails[k] = n;
      }
      if (!sn) continue;
      n.color = hex(sn.color, n.color);
      if (typeof sn.finish === 'string' && idExists('finishes', sn.finish)) n.finish = sn.finish;
      p = isObj(sn.pattern) ? sn.pattern : {};
      n.pattern = {
        kind: (typeof p.kind === 'string' && kinds.indexOf(p.kind) !== -1) ? p.kind : 'none',
        color: hex(p.color, '#FFFFFF'),
        color2: hex(p.color2, '#E8B4C8'),
        scale: clamp(num(p.scale, 1), 0.6, 1.6)
      };
      arr = [];
      if (Array.isArray(sn.charms)) {
        for (j = 0; j < sn.charms.length && arr.length < CHARM_MAX; j++) {
          ch = sn.charms[j];
          if (!isObj(ch) || typeof ch.id !== 'string') continue;
          if (!idExists('charms', ch.id)) continue;
          c = {
            id: ch.id,
            x: clamp(num(ch.x, 0.5), 0, 1),
            y: clamp(num(ch.y, 0.35), 0, 1),
            s: clamp(num(ch.s, 1), 0.4, 2.4),
            r: clamp(Math.round(num(ch.r, 0)), -180, 180)
          };
          arr.push(c);
        }
      }
      n.charms = arr;
    }

    out.qty = clamp(Math.round(num(src.qty, 1)), 1, 20);
    out.express = !!src.express;
    out.giftWrap = !!src.giftWrap;
    out.notes = typeof src.notes === 'string' ? src.notes.slice(0, 600) : '';
    return out;
  }

  function activeKeys(d) {
    var kk = keys(), out = [], i, side;
    var hand = d && d.hand ? d.hand : 'both';
    for (i = 0; i < kk.length; i++) {
      side = sideOf(kk[i]);
      if (hand === 'both' || hand === side) out.push(kk[i]);
    }
    return out;
  }

  function nailOf(key) {
    var n = state.design && state.design.nails ? state.design.nails[key] : null;
    return isObj(n) ? n : null;
  }

  function distinctColors(d) {
    var kk = activeKeys(d), seen = {}, count = 0, i, n, c;
    for (i = 0; i < kk.length; i++) {
      n = d.nails[kk[i]];
      c = n ? String(n.color).toUpperCase() : '';
      if (c && !has(seen, c)) { seen[c] = true; count++; }
    }
    return count;
  }
  function countPatterns(d) {
    var kk = activeKeys(d), c = 0, i, n;
    for (i = 0; i < kk.length; i++) {
      n = d.nails[kk[i]];
      if (n && n.pattern && n.pattern.kind && n.pattern.kind !== 'none') c++;
    }
    return c;
  }
  function countCharms(d) {
    var kk = activeKeys(d), c = 0, i, n;
    for (i = 0; i < kk.length; i++) {
      n = d.nails[kk[i]];
      if (n && Array.isArray(n.charms)) c += n.charms.length;
    }
    return c;
  }

  /* ---- size guide ---- */
  function guide() { return list('sizeGuide'); }
  function guideMm(index) {
    var g = guide();
    var it = g[clamp(Math.round(num(index, 0)), 0, Math.max(0, g.length - 1))];
    return it ? num(it.mm, 12) : (17.5 - num(index, 0) * 0.95);
  }
  function guideLabel(index) {
    var g = guide();
    var i = clamp(Math.round(num(index, 0)), 0, Math.max(0, g.length - 1));
    var it = g[i];
    return it && it.label !== undefined ? String(it.label) : String(i);
  }
  function mmToIndex(mm) {
    var g = guide(), best = 0, bestD = Infinity, i, d;
    if (!g.length) return clamp(Math.round((17.5 - num(mm, 12)) / 0.95), 0, 11);
    for (i = 0; i < g.length; i++) {
      d = Math.abs(num(g[i].mm, 99) - num(mm, 12));
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  /* ====================================================================== */
  /* 4. State                                                               */
  /* ====================================================================== */

  var state = {
    step: 1,
    reached: 1,
    design: null,
    sel: [],
    tool: 'color',
    colorGroup: 'all',
    charmGroup: 'all',
    activeCharm: -1,
    paneOpen: false,
    clip: null,
    booted: false,
    /* progress: a step she has actually touched counts as done even when her
       choice happens to equal the default — deliberate is deliberate */
    touch: {},
    doneSeen: {},
    allDoneSeen: false,
    rolling: false,
    /* consumed once by the next renderStage(): the nails that should visibly
       acknowledge the change that is being painted */
    pop: null,
    landCharm: -1,
    landStage: null
  };

  var hist = { past: [], future: [] };
  var pendingSnap = null;
  var refs = {};
  var hashLock = false;
  var reviewSvg = null;

  /* ====================================================================== */
  /* 5. History (undo / redo)                                               */
  /* ====================================================================== */

  function pushHist() {
    hist.past.push(clone(state.design));
    if (hist.past.length > HIST_MAX) hist.past.shift();
    hist.future.length = 0;
    pendingSnap = null;
  }

  /* begin/commit wrap a continuous gesture (slider drag, charm drag, typing)
     into ONE history entry instead of one per event */
  function begin() { if (!pendingSnap) pendingSnap = clone(state.design); }
  function commit() {
    if (!pendingSnap) return;
    hist.past.push(pendingSnap);
    if (hist.past.length > HIST_MAX) hist.past.shift();
    hist.future.length = 0;
    pendingSnap = null;
  }

  function undo() {
    if (!hist.past.length) { toast(t('studio.nothingUndo'), 'info'); return; }
    hist.future.push(clone(state.design));
    state.design = sanitize(hist.past.pop());
    pendingSnap = null;
    pruneSelection();
    refresh();
  }
  function redo() {
    if (!hist.future.length) { toast(t('studio.nothingRedo'), 'info'); return; }
    hist.past.push(clone(state.design));
    state.design = sanitize(hist.future.pop());
    pendingSnap = null;
    pruneSelection();
    refresh();
  }

  function mutate(fn) {
    pushHist();
    try { fn(); }
    catch (e) { console.warn('[SN.Studio] change failed', e); }
    refresh();
  }

  /* ====================================================================== */
  /* 6. Draft autosave + restore bar                                        */
  /* ====================================================================== */

  var saveDraft = function () { /* replaced with a debounced version on boot */ };

  function writeDraft() {
    var text;
    try { text = JSON.stringify(state.design); }
    catch (e) { return; }
    if (text) lsSet(DRAFT_KEY, text);
  }

  function readDraft() {
    var raw = lsGet(DRAFT_KEY), data;
    if (!raw) return null;
    try { data = JSON.parse(raw); }
    catch (e) { return null; }
    return isObj(data) ? data : null;
  }

  function sameDesign(a, b) {
    try { return JSON.stringify(sanitize(a)) === JSON.stringify(sanitize(b)); }
    catch (e) { return false; }
  }

  function showRestore(cfg) {
    var host = refs.restore;
    if (!host) return;
    empty(host);
    host.appendChild(el('div', { 'class': 'studio-restore-in' }, [
      el('span', { 'class': 'studio-restore-ico', html: icon('undo', 20), 'aria-hidden': 'true' }),
      el('div', { 'class': 'studio-restore-txt' }, [
        el('span', { text: t('studio.restoreTitle') }),
        el('small', { text: t('studio.restoreText') })
      ]),
      el('div', { 'class': 'studio-restore-acts' }, [
        el('button', {
          'class': 'btn btn-pri btn-sm', type: 'button', text: t('studio.restoreYes'),
          on: {
            click: function () {
              state.design = sanitize(cfg);
              hist.past.length = 0; hist.future.length = 0;
              pruneSelection();
              primeProgress();
              hideRestore();
              saveDraft();
              renderAll();
            }
          }
        }),
        el('button', {
          'class': 'btn btn-ghost btn-sm', type: 'button', text: t('studio.restoreNo'),
          on: {
            click: function () {
              lsDel(DRAFT_KEY);
              hideRestore();
              writeDraft();
            }
          }
        })
      ])
    ]));
    host.hidden = false;
  }

  function hideRestore() {
    if (!refs.restore) return;
    refs.restore.hidden = true;
    empty(refs.restore);
  }

  /* ---- recent custom colours ---- */
  function recentColors() {
    var raw = lsGet(RECENT_KEY), arr = [], data, i, h;
    try { data = raw ? JSON.parse(raw) : null; }
    catch (e) { data = null; }
    if (!Array.isArray(data)) return arr;
    for (i = 0; i < data.length && arr.length < 12; i++) {
      h = hex(data[i], '');
      if (h && arr.indexOf(h) === -1) arr.push(h);
    }
    return arr;
  }
  function rememberColor(h) {
    var c = hex(h, ''), arr;
    if (!c) return;
    arr = recentColors();
    arr = arr.filter(function (x) { return x !== c; });
    arr.unshift(c);
    if (arr.length > 12) arr.length = 12;
    try { lsSet(RECENT_KEY, JSON.stringify(arr)); }
    catch (e) { /* ignore */ }
  }

  /* ====================================================================== */
  /* 7. Selection                                                           */
  /* ====================================================================== */

  function pruneSelection() {
    var ok = activeKeys(state.design), out = [], i;
    for (i = 0; i < state.sel.length; i++) {
      if (ok.indexOf(state.sel[i]) !== -1 && out.indexOf(state.sel[i]) === -1) out.push(state.sel[i]);
    }
    if (!out.length) out = ok.slice();
    state.sel = out;
    if (state.activeCharm >= 0) {
      var n = nailOf(state.sel[0]);
      if (!n || !n.charms || state.activeCharm >= n.charms.length) state.activeCharm = -1;
    }
  }

  function selectKeys(arr) {
    var ok = activeKeys(state.design), out = [], i;
    for (i = 0; i < arr.length; i++) {
      if (ok.indexOf(arr[i]) !== -1 && out.indexOf(arr[i]) === -1) out.push(arr[i]);
    }
    state.sel = out;
    state.activeCharm = -1;
    renderStage();
    if (state.step === 4) { renderSelBar(); renderPanel(); renderEditor(); }
  }

  function onPickNail(key, ev) {
    var add = !!(ev && (ev.shiftKey || ev.ctrlKey || ev.metaKey));
    var i;
    if (add) {
      i = state.sel.indexOf(key);
      if (i === -1) state.sel.push(key);
      else if (state.sel.length > 1) state.sel.splice(i, 1);
    } else {
      state.sel = [key];
    }
    state.activeCharm = -1;
    if (state.step !== 4) setStep(4);
    else { renderStage(); renderSelBar(); renderPanel(); renderEditor(); }
  }

  function eachSelected(fn) {
    var i, n;
    for (i = 0; i < state.sel.length; i++) {
      n = nailOf(state.sel[i]);
      if (n) fn(n, state.sel[i]);
    }
  }

  function firstSelected() {
    return state.sel.length ? nailOf(state.sel[0]) : null;
  }

  /* ====================================================================== */
  /* 7b. Progress — what is genuinely finished                              */
  /* ====================================================================== */
  /* A step is done when it holds a real decision, not when it has been walked
     past. Two ways to earn it: she touched a control in that step (`touch`),
     or the design already differs from a pristine one — which is what makes a
     restored draft or a shared link open with its progress intact. Step 6 is
     the order itself, so the journey bar counts steps 1..5. */

  var JOURNEY = 5;

  /* `blank()` rebuilds ten nails from store defaults; stepDone() asks for it
     a dozen times per render, so hold one copy and drop it when the shop data
     changes underneath us */
  var pristine = null;
  function blankRef() {
    if (!pristine) pristine = blank();
    return pristine;
  }

  function nailLook(n) {
    var p = (n && isObj(n.pattern)) ? n.pattern : {};
    return [
      hex(n && n.color, ''), String(n && n.finish), String(p.kind),
      hex(p.color, ''), hex(p.color2, ''), String(num(p.scale, 1)),
      String((n && n.charms ? n.charms.length : 0))
    ].join('|');
  }

  function stepDone(n) {
    var d = state.design, b, kk, i;
    if (state.touch[n]) return true;
    if (!d) return false;
    b = blankRef();
    if (n === 1) return hex(d.skin, 'a') !== hex(b.skin, 'b') || d.hand !== b.hand;
    if (n === 2) return d.shape !== b.shape || d.length !== b.length;
    if (n === 3) {
      if (d.measure !== b.measure) return true;
      kk = keys();
      for (i = 0; i < kk.length; i++) {
        if (num(d.sizes[kk[i]], -1) !== num(b.sizes[kk[i]], -2)) return true;
      }
      return false;
    }
    if (n === 4) {
      kk = activeKeys(d);
      for (i = 0; i < kk.length; i++) {
        if (nailLook(d.nails[kk[i]]) !== nailLook(b.nails[kk[i]])) return true;
      }
      return false;
    }
    if (n === 5) {
      return num(d.qty, 1) !== num(b.qty, 1) || !!d.express || !!d.giftWrap ||
        !!String(d.notes || '').trim();
    }
    return false;
  }

  function doneCount() {
    var c = 0, i;
    for (i = 1; i <= JOURNEY; i++) if (stepDone(i)) c++;
    return c;
  }

  function progressText() {
    var left = JOURNEY - doneCount();
    if (left <= 0) return t('studio.progAll');
    if (left === JOURNEY) return t('studio.progStart');
    if (left === 1) return t('studio.progLeft1');
    if (left === 2) return t('studio.progLeft2');
    return t('studio.progLeft', { n: nfm(left) });
  }

  /* the warm confirmation: the tick that was just earned blooms once and
     throws the smallest of the bursts. Once per step, never on a re-render. */
  function celebrateStep(n) {
    var host = refs.steps, btn, dot;
    if (!host || !host.querySelector || reduced()) return;
    btn = host.querySelector('[data-fk="' + fk('step-' + n) + '"]');
    if (!btn || !onScreen(rectOf(btn))) return;
    dot = btn.querySelector('.studio-step-n') || btn;
    dot.classList.add('sn-glow');
    sparkleAt(rectOf(dot), 0.42);
  }

  /* called after every render of the step strip */
  function noteCompletions() {
    var i, fresh = [];
    for (i = 1; i <= JOURNEY; i++) {
      if (stepDone(i) && !state.doneSeen[i]) { state.doneSeen[i] = true; fresh.push(i); }
    }
    for (i = 0; i < fresh.length; i++) celebrateStep(fresh[i]);
    if (!state.allDoneSeen && doneCount() >= JOURNEY) {
      state.allDoneSeen = true;
      toast(t('studio.progAll'), 'ok');
    }
  }

  /* Adopt whatever progress the design already carries WITHOUT celebrating it:
     restoring a draft or opening a shared link is not five achievements. */
  function primeProgress() {
    var i;
    for (i = 1; i <= JOURNEY; i++) if (stepDone(i)) state.doneSeen[i] = true;
    if (doneCount() >= JOURNEY) state.allDoneSeen = true;
  }

  function markTouch(n) {
    if (state.touch[n]) return;
    state.touch[n] = true;
    renderSteps();
  }

  /* ====================================================================== */
  /* 8. The preview pane                                                    */
  /* ====================================================================== */

  function renderStage() {
    var host = refs.stage, live, focusKey = null, a = D.activeElement, node;
    if (!host || !SN.Nail) return;
    if (a && host.contains(a) && a.getAttribute) focusKey = a.getAttribute('data-key');

    empty(host);
    live = state.step === 4;
    try {
      host.appendChild(SN.Nail.preview(state.design, {
        interactive: live,
        selected: live ? state.sel : null,
        onPick: onPickNail
      }));
    } catch (e) {
      console.warn('[SN.Studio] preview failed', e);
    }
    if (focusKey) {
      node = host.querySelector('[data-key="' + fk(focusKey) + '"]');
      if (node && node.focus) { try { node.focus({ preventScroll: true }); } catch (e2) { /* ignore */ } }
    }
    /* the hand acknowledges the tap that caused this repaint, then forgets it —
       a queue of one, so a drag repainting at 60fps never stacks animations */
    if (state.pop) { popNails(state.pop, host); state.pop = null; }
    if (state.landStage) {
      landInStage(state.landStage.key, state.landStage.index);
      state.landStage = null;
    }
    renderPaneFoot();
  }

  /* queue the nails that should react to the change about to be applied */
  function react(list) {
    state.pop = Array.isArray(list) ? list.slice(0, 10) : null;
  }

  /* On a phone the sticky strip at the top is the hand she can actually see —
     the big editor is usually far below it — so the charm has to land THERE
     too, not only on the editor plate. */
  function landInStage(key, index) {
    var host = refs.stage, nail, marks;
    if (!host || reduced() || index < 0) return;
    nail = host.querySelector ? host.querySelector('g.nail[data-key="' + fk(key) + '"]') : null;
    marks = nail ? nail.querySelectorAll('g.nail-charm') : null;
    if (!marks || !marks[index]) return;
    play(fxWrap(marks[index]), [
      { transform: 'translate(0,-9px) scale(2.2)', opacity: 0 },
      { transform: 'translate(0,0) scale(.82)', opacity: 1, offset: 0.6 },
      { transform: 'scale(1.1)', offset: 0.8 },
      { transform: 'scale(1)', opacity: 1 }
    ], { duration: drop(), easing: easeOut() });
  }

  /* what a tap will affect, said plainly: one nail gets named, a hand gets
     named, anything else gets counted */
  function selectionLabel() {
    var kk = activeKeys(state.design), n = state.sel.length, right = 0, i;
    if (!n) return countT('selCount', 0);
    if (n === 1) return nailName(state.sel[0]);
    if (n === kk.length) return countT('selCount', n);
    for (i = 0; i < state.sel.length; i++) if (sideOf(state.sel[i]) === 'right') right++;
    if (right === n && n === 5) return t('studio.rightHand') + ' · ' + countT('selCount', n);
    if (!right && n === 5) return t('studio.leftHand') + ' · ' + countT('selCount', n);
    return countT('selCount', n);
  }

  function renderPaneFoot() {
    var host = refs.paneFoot;
    if (!host) return;
    empty(host);
    host.appendChild(el('p', {
      'class': 'studio-pane-note',
      text: state.step === 4
        ? selectionLabel()
        : t('studio.stepOf', { n: nfm(state.step), total: nfm(STEP_COUNT) })
    }));
    /* undo and redo live beside the preview as well as in the toolbar: she is
       looking here when she changes her mind, and a visible way back is what
       makes experimenting feel safe */
    if (state.step === 4) {
      host.appendChild(historyBtn('undo', 'common.undo', undo, !hist.past.length, 'foot-undo'));
      host.appendChild(historyBtn('redo', 'common.redo', redo, !hist.future.length, 'foot-redo'));
    }
    host.appendChild(el('button', {
      'class': 'btn btn-ghost btn-sm only-mob', type: 'button',
      'data-fk': 'pane-toggle',
      text: state.paneOpen ? t('studio.collapse') : t('studio.expand'),
      'aria-expanded': state.paneOpen ? 'true' : 'false',
      on: {
        click: function () {
          state.paneOpen = !state.paneOpen;
          if (refs.pane && refs.pane.classList) refs.pane.classList.toggle('is-open', state.paneOpen);
          renderPaneFoot();
        }
      }
    }));
  }

  /* ====================================================================== */
  /* 9. Shared little builders                                              */
  /* ====================================================================== */

  function section(titleKey, textKey, kids, cls) {
    var head = el('div', { 'class': 'studio-sec-head' }, [
      titleKey ? el('h2', { text: t(titleKey) }) : null,
      textKey ? el('p', { text: t(textKey) }) : null
    ]);
    return el('section', { 'class': 'studio-sec' + (cls ? ' ' + cls : '') }, [head].concat(kids || []));
  }

  function priceTag(p) {
    var v = num(p, 0);
    return el('span', {
      'class': 'studio-delta' + (v > 0 ? '' : ' is-free'),
      text: v > 0 ? '+ ' + money(v) : t('studio.included')
    });
  }

  function iconButton(name, label, onClick, cls, fkey) {
    return el('button', {
      'class': 'icon-btn' + (cls ? ' ' + cls : ''), type: 'button',
      html: icon(name, 16),
      'aria-label': label, title: label,
      'data-fk': fkey ? fk(fkey) : null,
      on: { click: onClick }
    });
  }

  /* The two shortcuts that stop the flow feeling like data entry — "apply to
     all" and "copy to the other hand" — are not ghost buttons anywhere in the
     studio. They read as offers. */
  function shortcutBtn(ico, labelKey, fkey, primary, onClick) {
    return el('button', {
      'class': 'btn ' + (primary ? 'btn-pri' : 'btn-line') + ' btn-sm',
      type: 'button', 'data-fk': fk(fkey),
      on: { click: onClick }
    }, [
      el('span', { 'class': 'btn-ico', html: icon(ico, 16), 'aria-hidden': 'true' }),
      el('span', { text: t(labelKey) })
    ]);
  }

  /* An invitation, never a scold: shown only while the step is still exactly
     as we left it, and it disappears the instant she chooses anything. */
  function defaultsNote(n) {
    if (stepDone(n)) return null;
    return el('p', { 'class': 'note' }, [
      el('span', { 'class': 'ico', html: icon('sparkle', 18), 'aria-hidden': 'true' }),
      el('span', { text: t('studio.nudge' + n) })
    ]);
  }

  function historyBtn(name, labelKey, onClick, off, fkey) {
    var b = el('button', {
      'class': 'icon-btn icon-btn-sm', type: 'button',
      html: icon(name, 16),
      'aria-label': t(labelKey), title: t(labelKey),
      'data-fk': fk(fkey),
      on: { click: onClick }
    });
    if (off) b.disabled = true;
    return b;
  }

  function chip(label, on, onClick, fkey) {
    return el('button', {
      'class': 'chip' + (on ? ' chip-on' : ''), type: 'button',
      text: label,
      'data-fk': fkey ? fk(fkey) : null,
      aria: { pressed: !!on },
      on: { click: onClick }
    });
  }

  /* a plain nail state for silhouette/finish/pattern previews */
  function sampleNail(over) {
    var n = firstSelected() || nailOf(activeKeys(state.design)[0]) || null;
    var out = {
      color: n ? n.color : '#E9C2C0',
      finish: n ? n.finish : 'gloss',
      pattern: { kind: 'none', color: '#FFFFFF', color2: '#E8B4C8', scale: 1 },
      charms: []
    };
    var k;
    if (isObj(over)) for (k in over) if (has(over, k)) out[k] = over[k];
    return out;
  }

  /* height of one single() viewBox in user units — lets the option cards draw
     every shape / length at its TRUE relative size inside a fixed-height box */
  function boxVH(shape, lengthVal) {
    var NB = (SN.Nail && SN.Nail.NAIL_BOX) || { w: 100, h: 150 };
    var PAD = (SN.Nail && SN.Nail.BOX_PAD) || { x: 22, y: 20, right: 22, bottom: 22 };
    var A = (SN.Nail && SN.Nail.ASPECT && SN.Nail.ASPECT[shape]) ? SN.Nail.ASPECT[shape] : 1.4;
    var f = (SN.Nail && SN.Nail.lengthFactor) ? SN.Nail.lengthFactor(lengthVal) : 1;
    return num(PAD.y, 20) + clamp(num(NB.w, 100) * A * f, 90, 240) + num(PAD.bottom, 22);
  }

  /* opts: {shape, length, finishId, h, cls}
     `length` is only forwarded when the caller wants true proportions; without
     it single() uses its stable 100x150 box so a grid of patterns lines up. */
  function miniNail(nailState, opts) {
    var o = isObj(opts) ? opts : {};
    var conf = {
      shape: o.shape || state.design.shape,
      finishId: o.finishId,
      h: o.h || 64,
      bg: false,
      key: 'sample'
    };
    var box = el('span', { 'class': o.cls || 'studio-mini-media' });
    if (o.length !== undefined && o.length !== null) conf.length = o.length;
    try { box.appendChild(SN.Nail.single(nailState, state.design, conf)); }
    catch (e) { /* a bad shape id must never break the grid */ }
    return box;
  }

  /* ====================================================================== */
  /* 10. Step 1 — skin & hand                                               */
  /* ====================================================================== */

  function buildStep1(host) {
    var tones = list('skinTones');
    var nudge = defaultsNote(1);
    if (nudge) host.appendChild(nudge);
    var skins = el('div', { 'class': 'studio-skins' });
    var i;

    for (i = 0; i < tones.length; i++) {
      (function (tn) {
        var h = hex(tn.hex, '#EFCDB6');
        skins.appendChild(el('button', {
          'class': 'studio-skin', type: 'button',
          'data-fk': fk('skin-' + tn.id),
          aria: { pressed: state.design.skin === h },
          on: {
            click: function () {
              markTouch(1);
              react(activeKeys(state.design));
              mutate(function () { state.design.skin = h; });
            }
          }
        }, [
          el('span', { 'class': 'studio-skin-dot', style: { background: h }, 'aria-hidden': 'true' }),
          el('span', { text: pick(tn.name) })
        ]));
      }(tones[i]));
    }
    if (!tones.length) skins.appendChild(el('p', { 'class': 'muted', text: t('common.empty') }));

    host.appendChild(section('studio.skinTitle', 'studio.skinText', [skins]));

    var hands = el('div', { 'class': 'studio-hands' });
    var opts = [
      { id: 'both', label: 'studio.handBoth', n: 2 },
      { id: 'right', label: 'studio.handRight', n: 1 },
      { id: 'left', label: 'studio.handLeft', n: 1, flip: true }
    ];
    for (i = 0; i < opts.length; i++) {
      (function (o) {
        var ico = el('span', { 'class': 'studio-hand-ico', 'aria-hidden': 'true' });
        ico.appendChild(el('span', { html: icon('hand', 26), 'class': o.flip ? 'studio-flip' : null }));
        if (o.n === 2) ico.appendChild(el('span', { html: icon('hand', 26), 'class': 'studio-flip' }));
        hands.appendChild(el('button', {
          'class': 'studio-hand-card', type: 'button',
          'data-fk': fk('hand-' + o.id),
          aria: { pressed: state.design.hand === o.id },
          on: {
            click: function () {
              markTouch(1);
              mutate(function () {
                state.design.hand = o.id;
                state.sel = activeKeys(state.design);
                state.activeCharm = -1;
                /* queued from inside the change, so the single repaint that
                   follows carries the reaction — never a second render */
                react(state.sel);
              });
            }
          }
        }, [ico, el('span', { text: t(o.label) })]));
      }(opts[i]));
    }

    host.appendChild(section('studio.handTitle', 'studio.handText', [
      hands,
      el('p', { 'class': 'studio-hint' }, [
        el('span', { html: icon('sparkle', 16), 'aria-hidden': 'true' }),
        el('span', { text: t('studio.handNote') })
      ])
    ]));
  }

  /* ====================================================================== */
  /* 11. Step 2 — shape & length                                            */
  /* ====================================================================== */

  function buildStep2(host) {
    var shapes = list('shapes');
    var nudge = defaultsNote(2);
    if (nudge) host.appendChild(nudge);
    var lengths = list('lengths');
    var grid = el('div', { 'class': 'studio-opts' });
    var lgrid = el('div', { 'class': 'studio-opts studio-opts-len' });
    var maxShapeVH = 1, maxLenVH = 1;
    var i;

    /* one scale for the whole row, so the cards compare like for like */
    for (i = 0; i < shapes.length; i++) {
      maxShapeVH = Math.max(maxShapeVH, boxVH(shapes[i].id, state.design.length));
    }
    for (i = 0; i < lengths.length; i++) {
      maxLenVH = Math.max(maxLenVH, boxVH(state.design.shape, lengths[i].id));
    }

    for (i = 0; i < shapes.length; i++) {
      (function (sh) {
        grid.appendChild(el('button', {
          'class': 'studio-opt', type: 'button',
          'data-fk': fk('shape-' + sh.id),
          aria: { pressed: state.design.shape === sh.id },
          on: {
            click: function () {
              markTouch(2);
              react(activeKeys(state.design));
              mutate(function () { state.design.shape = sh.id; });
            }
          }
        }, [
          miniNail(sampleNail(), {
            shape: sh.id, length: state.design.length, cls: 'studio-opt-media',
            h: Math.round(120 * boxVH(sh.id, state.design.length) / maxShapeVH)
          }),
          el('span', { 'class': 'studio-opt-name', text: pick(sh.name) }),
          el('span', { 'class': 'studio-opt-desc', text: pick(sh.desc) }),
          priceTag(sh.price)
        ]));
      }(shapes[i]));
    }
    if (!shapes.length) grid.appendChild(el('p', { 'class': 'muted', text: t('common.empty') }));

    for (i = 0; i < lengths.length; i++) {
      (function (ln) {
        lgrid.appendChild(el('button', {
          'class': 'studio-opt', type: 'button',
          'data-fk': fk('len-' + ln.id),
          aria: { pressed: state.design.length === ln.id },
          on: {
            click: function () {
              markTouch(2);
              react(activeKeys(state.design));
              mutate(function () { state.design.length = ln.id; });
            }
          }
        }, [
          miniNail(sampleNail(), {
            length: ln.id, cls: 'studio-opt-media',
            h: Math.round(166 * boxVH(state.design.shape, ln.id) / maxLenVH)
          }),
          el('span', { 'class': 'studio-opt-name', text: pick(ln.name) }),
          priceTag(ln.price)
        ]));
      }(lengths[i]));
    }
    if (!lengths.length) lgrid.appendChild(el('p', { 'class': 'muted', text: t('common.empty') }));

    host.appendChild(section('studio.shapeTitle', 'studio.shapeText', [grid]));
    host.appendChild(section('studio.lenTitle', 'studio.lenText', [lgrid]));
  }

  /* ====================================================================== */
  /* 12. Step 3 — sizes                                                     */
  /* ====================================================================== */

  function mmRulerSVG() {
    var mm = 60, i, x, svg = '';
    svg += '<svg xmlns="http://www.w3.org/2000/svg" width="' + mm + 'mm" height="15mm" ' +
           'viewBox="0 0 ' + mm + ' 15" role="img" aria-label="' + t('studio.mmRuler') + '">';
    svg += '<rect x="0" y="0" width="' + mm + '" height="15" rx="1.2" fill="#FFFFFF" ' +
           'stroke="#E2CDD1" stroke-width="0.3"/>';
    for (i = 0; i <= mm; i++) {
      x = i;
      if (i % 10 === 0) {
        svg += '<line x1="' + x + '" y1="0.5" x2="' + x + '" y2="7" stroke="#8C4459" stroke-width="0.35"/>';
        svg += '<text x="' + (x + 0.8) + '" y="11.5" font-size="3.2" fill="#6B5560" ' +
               'font-family="system-ui,sans-serif">' + i + '</text>';
      } else if (i % 5 === 0) {
        svg += '<line x1="' + x + '" y1="0.5" x2="' + x + '" y2="5" stroke="#A85A73" stroke-width="0.3"/>';
      } else {
        svg += '<line x1="' + x + '" y1="0.5" x2="' + x + '" y2="3" stroke="#C97B92" stroke-width="0.22"/>';
      }
    }
    svg += '<text x="' + (mm - 9) + '" y="14.2" font-size="3" fill="#9C8791" ' +
           'font-family="system-ui,sans-serif">' + t('studio.mmUnit') + '</text>';
    svg += '</svg>';
    return svg;
  }

  function measureIllustration() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 96" width="200" height="96" ' +
      'role="img" aria-label="' + t('studio.howTitle') + '">' +
      '<rect x="0" y="0" width="200" height="96" rx="10" fill="#FDF2F0"/>' +
      '<path d="M70 78c0-26 4-46 30-46s30 20 30 46z" fill="#EFCDB6"/>' +
      '<path d="M78 46c2-14 8-22 22-22s20 8 22 22c1 8-2 14-4 20H82c-2-6-5-12-4-20z" fill="#E9C2C0"/>' +
      '<path d="M78 44c4-4 10-6 22-6s18 2 22 6" fill="none" stroke="#C97B92" stroke-width="1.4" opacity=".55"/>' +
      '<path d="M74 34h52" stroke="#8C4459" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M78 30l-4 4 4 4M122 30l4 4-4 4" fill="none" stroke="#8C4459" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round"/>' +
      '<rect x="60" y="14" width="80" height="10" rx="2" fill="#FFFFFF" stroke="#E2CDD1"/>' +
      '<path d="M68 14v6M76 14v4M84 14v6M92 14v4M100 14v6M108 14v4M116 14v6M124 14v4M132 14v6" ' +
      'stroke="#C97B92" stroke-width="1"/>' +
      '</svg>';
  }

  function applySizeSet(set) {
    var kk = keys(), i, f;
    if (!set || !isObj(set.sizes)) return;
    for (i = 0; i < kk.length; i++) {
      f = fingerOf(kk[i]);
      if (set.sizes[f] !== undefined) {
        state.design.sizes[kk[i]] = clamp(Math.round(num(set.sizes[f], 5)), 0, Math.max(0, guide().length - 1) || 11);
      }
    }
  }

  function currentSetId() {
    var sets = list('sizeSets'), kk = keys(), i, j, ok, f;
    for (i = 0; i < sets.length; i++) {
      ok = true;
      for (j = 0; j < kk.length; j++) {
        f = fingerOf(kk[j]);
        if (!isObj(sets[i].sizes) || Math.round(num(sets[i].sizes[f], -1)) !== Math.round(num(state.design.sizes[kk[j]], -2))) {
          ok = false; break;
        }
      }
      if (ok) return sets[i].id;
    }
    return '';
  }

  function sizeGridEl() {
    var wrap = el('div', { 'class': 'studio-sizegrid' });
    var hand = state.design.hand;
    var sides = hand === 'both' ? ['right', 'left'] : [hand];
    var fs = fingers();
    var i, j, key;
    for (i = 0; i < sides.length; i++) {
      wrap.appendChild(el('p', { 'class': 'studio-sizehand', text: handName(sides[i]) }));
      for (j = 0; j < fs.length; j++) {
        key = keyOf(sides[i], fs[j].key);
        wrap.appendChild(el('div', { 'class': 'studio-sizecell' }, [
          el('b', { text: guideLabel(state.design.sizes[key]) }),
          el('span', { text: pick(fs[j].name) }),
          el('span', { text: nfm(guideMm(state.design.sizes[key])) + ' ' + t('studio.mmUnit') })
        ]));
      }
    }
    return wrap;
  }

  function renderSizeGrid() {
    if (!refs.sizeGrid) return;
    keepFocus(refs.sizeGrid, function () {
      empty(refs.sizeGrid);
      refs.sizeGrid.appendChild(sizeGridEl());
    });
  }

  function buildPresetPanel(host) {
    var sets = list('sizeSets');
    var grid = el('div', { 'class': 'studio-presets' });
    var active = currentSetId();
    var fs = fingers();
    var i;

    for (i = 0; i < sets.length; i++) {
      (function (set) {
        var nums = el('div', { 'class': 'studio-preset-nums' });
        var j, f;
        for (j = 0; j < fs.length; j++) {
          f = fs[j].key;
          nums.appendChild(el('span', { 'class': 'studio-preset-num' }, [
            el('b', { text: isObj(set.sizes) ? String(num(set.sizes[f], 0)) : '—' }),
            el('span', { text: pick(fs[j].name) })
          ]));
        }
        grid.appendChild(el('button', {
          'class': 'studio-preset', type: 'button',
          'data-fk': fk('set-' + set.id),
          aria: { pressed: active === set.id },
          on: {
            click: function () {
              markTouch(3);
              mutate(function () { applySizeSet(set); });
            }
          }
        }, [
          el('span', { 'class': 'studio-preset-name', text: pick(set.name) }),
          nums
        ]));
      }(sets[i]));
    }
    if (!sets.length) grid.appendChild(el('p', { 'class': 'muted', text: t('common.empty') }));
    host.appendChild(el('div', { 'class': 'flow' }, [
      el('p', { 'class': 'studio-group-t', text: t('studio.presetPick') }),
      grid
    ]));
  }

  function buildRulerPanel(host, method) {
    var hand = state.design.hand;
    var sides = hand === 'both' ? ['right', 'left'] : [hand];
    var fs = fingers();
    var rows = el('div', { 'class': 'studio-mmrows' });
    var i, j;

    for (i = 0; i < sides.length; i++) {
      rows.appendChild(el('p', { 'class': 'studio-mmhand', text: handName(sides[i]) }));
      for (j = 0; j < fs.length; j++) {
        (function (key, label) {
          var mmSpan = el('span', { 'class': 'studio-mmnum' });
          var szSpan = el('span', { 'class': 'studio-mmsize' });
          var input;

          function paint() {
            var idx = state.design.sizes[key];
            mmSpan.textContent = nfm(guideMm(idx)) + ' ' + t('studio.mmUnit');
            szSpan.textContent = guideLabel(idx);
          }

          input = el('input', {
            'class': 'range', type: 'range',
            min: String(MM_MIN), max: String(MM_MAX), step: '0.5',
            value: String(clamp(guideMm(state.design.sizes[key]), MM_MIN, MM_MAX)),
            'data-fk': fk('mm-' + key),
            'aria-label': label,
            on: {
              pointerdown: begin,
              keydown: begin,
              input: function (ev) {
                begin();
                markTouch(3);
                state.design.sizes[key] = mmToIndex(num(ev.target.value, 12));
                paint();
                renderSizeGrid();
                saveDraft();
              },
              change: function () { commit(); renderActionsSafe(); }
            }
          });

          paint();
          rows.appendChild(el('div', { 'class': 'studio-mmrow' }, [
            el('span', { 'class': 'studio-mmname', text: label }),
            input,
            el('span', { 'class': 'studio-mmval' }, [
              mmSpan,
              el('span', { 'class': 'sr-only', text: t('studio.sizeNo') }),
              szSpan
            ])
          ]));
        }(keyOf(sides[i], fs[j].key), pick(fs[j].name)));
      }
    }

    host.appendChild(el('div', { 'class': 'flow' }, [
      el('p', { 'class': 'studio-group-t', text: t('studio.rulerTitle') }),
      el('p', { 'class': 'muted small', text: t('studio.rulerText') }),
      rows,
      el('div', { 'class': 'studio-ruler ltr', html: mmRulerSVG() }),
      el('p', { 'class': 'studio-hint' }, [
        el('span', { html: icon('ruler', 16), 'aria-hidden': 'true' }),
        el('span', { text: t('studio.mmNote') })
      ])
    ]));
    host.appendChild(howBlock(method));
  }

  function howBlock(method) {
    var steps = (method && Array.isArray(method.steps)) ? method.steps : [];
    var ol = el('ol', { 'class': 'studio-steps-list' });
    var i;
    for (i = 0; i < steps.length; i++) {
      ol.appendChild(el('li', { 'class': 'studio-how' }, [el('span', { text: pick(steps[i]) })]));
    }
    return el('div', { 'class': 'flow' }, [
      el('p', { 'class': 'studio-group-t', text: t('studio.howTitle') }),
      el('div', { 'class': 'studio-ruler', html: measureIllustration() }),
      steps.length ? ol : el('p', { 'class': 'muted', text: pick(method && method.text) })
    ]);
  }

  function waHref(text) {
    if (SN.Checkout && typeof SN.Checkout.waLink === 'function') return SN.Checkout.waLink(text);
    var wa = String(setting('settings.whatsapp', '')).replace(/[^0-9]/g, '');
    return wa ? 'https://wa.me/' + wa + '?text=' + encodeURIComponent(text) : '';
  }

  function buildKitPanel(host, method) {
    var link = waHref(t('studio.kitMsg'));
    host.appendChild(el('div', { 'class': 'flow' }, [
      el('p', { 'class': 'studio-group-t', text: t('studio.kitTitle') }),
      el('p', { 'class': 'lead', text: pick(method && method.text) }),
      link ? el('a', {
        'class': 'btn btn-pri', href: link, target: '_blank', rel: 'noopener'
      }, [
        el('span', { 'class': 'btn-ico', html: icon('whatsapp', 18), 'aria-hidden': 'true' }),
        el('span', { text: t('studio.kitCta') })
      ]) : null
    ]));
    host.appendChild(howBlock(method));
  }

  function buildStep3(host) {
    var methods = list('measureMethods');
    var nudge = defaultsNote(3);
    if (nudge) host.appendChild(nudge);
    var tabs = el('div', { 'class': 'tabs', role: 'tablist' });
    var panel = el('div', { 'class': 'flow' });
    var current = state.design.measure;
    var method = null;
    var i;

    if (!methods.length) methods = [{ id: 'preset', name: { ar: 'مقاس جاهز', en: 'Preset' }, steps: [] }];
    for (i = 0; i < methods.length; i++) if (methods[i].id === current) method = methods[i];
    if (!method) { method = methods[0]; current = method.id; }

    for (i = 0; i < methods.length; i++) {
      (function (m) {
        tabs.appendChild(el('button', {
          'class': 'tab' + (m.id === current ? ' tab-on' : ''), type: 'button', role: 'tab',
          'data-fk': fk('meth-' + m.id),
          aria: { selected: m.id === current },
          text: pick(m.name),
          on: {
            click: function () {
              markTouch(3);
              mutate(function () { state.design.measure = m.id; });
            }
          }
        }));
      }(methods[i]));
    }

    if (current === 'ruler') buildRulerPanel(panel, method);
    else if (current === 'kit') buildKitPanel(panel, method);
    else buildPresetPanel(panel);

    host.appendChild(section('studio.methodTitle', 'studio.methodText', [tabs, panel]));

    /* ---- always-on summary + bulk tools ---- */
    var g = guide();
    var sel = el('select', { 'class': 'select', 'data-fk': 'size-all', 'aria-label': t('studio.applyAll') });
    for (i = 0; i < g.length; i++) {
      sel.appendChild(el('option', {
        value: String(i),
        text: t('studio.sizeNo') + ' ' + String(g[i].label) + ' · ' + nfm(num(g[i].mm, 0)) + ' ' + t('studio.mmUnit')
      }));
    }
    if (g.length) sel.value = String(clamp(Math.round(num(state.design.sizes[activeKeys(state.design)[0]], 5)), 0, g.length - 1));

    refs.sizeGrid = el('div', {});
    refs.sizeGrid.appendChild(sizeGridEl());

    host.appendChild(section('studio.sizeTitle', 'studio.sizeText', [
      refs.sizeGrid,
      el('div', { 'class': 'studio-row' }, [
        sel,
        shortcutBtn('grid', 'studio.applyAll', 'apply-all', true, function () {
          var v = clamp(Math.round(num(sel.value, 5)), 0, Math.max(0, guide().length - 1) || 11);
          markTouch(3);
          mutate(function () {
            var kk = keys(), j;
            for (j = 0; j < kk.length; j++) state.design.sizes[kk[j]] = v;
          });
          toast(t('studio.applyAllDone'), 'ok');
        }),
        state.design.hand === 'both'
          ? shortcutBtn('hand', 'studio.copyHand', 'copy-hand', false, function () {
            var from = 'right', to = 'left';
            markTouch(3);
            mutate(function () {
              var fs = fingers(), j;
              for (j = 0; j < fs.length; j++) {
                state.design.sizes[keyOf(to, fs[j].key)] = state.design.sizes[keyOf(from, fs[j].key)];
              }
            });
            toast(t('studio.copyDone'), 'ok');
          })
          : null
      ])
    ]));
  }

  /* ====================================================================== */
  /* 13. Step 4 — colours & decoration                                      */
  /* ====================================================================== */

  function renderSelBar() {
    var host = refs.selBar;
    if (!host) return;
    keepFocus(host, function () {
      var kk = activeKeys(state.design);
      var right = [], left = [], i;
      for (i = 0; i < kk.length; i++) (sideOf(kk[i]) === 'right' ? right : left).push(kk[i]);

      empty(host);
      host.appendChild(el('div', { 'class': 'studio-selbar' }, [
        chip(t('studio.selAll'), state.sel.length === kk.length, function () { selectKeys(kk); }, 'sel-all'),
        right.length ? chip(t('studio.selRight'), false, function () { selectKeys(right); }, 'sel-r') : null,
        left.length ? chip(t('studio.selLeft'), false, function () { selectKeys(left); }, 'sel-l') : null,
        chip(t('studio.selNone'), !state.sel.length, function () { selectKeys([]); }, 'sel-none'),
        el('span', { 'class': 'studio-selcount', text: selectionLabel() })
      ]));
      host.appendChild(el('p', { 'class': 'studio-hint' }, [
        el('span', { html: icon('sparkle', 16), 'aria-hidden': 'true' }),
        el('span', { text: t('studio.selHint') })
      ]));
    });
  }

  function setTool(name) {
    state.tool = name;
    renderTools();
    renderPanel();
  }

  function renderTools() {
    var host = refs.tools;
    var tools = [
      { id: 'color', label: 'studio.toolColor', ico: 'brush' },
      { id: 'finish', label: 'studio.toolFinish', ico: 'sparkle' },
      { id: 'pattern', label: 'studio.toolPattern', ico: 'grid' },
      { id: 'charm', label: 'studio.toolCharm', ico: 'gem' }
    ];
    var i;
    if (!host) return;
    keepFocus(host, function () {
      empty(host);
      for (i = 0; i < tools.length; i++) {
        (function (tool) {
          host.appendChild(el('button', {
            'class': 'studio-toolbtn', type: 'button', role: 'tab',
            'data-fk': fk('tool-' + tool.id),
            aria: { selected: state.tool === tool.id },
            on: { click: function () { setTool(tool.id); } }
          }, [
            el('span', { html: icon(tool.ico, 16), 'aria-hidden': 'true' }),
            el('span', { text: t(tool.label) })
          ]));
        }(tools[i]));
      }
    });
  }

  /* ---- the colour tool ---- */
  function buildColorPanel(host) {
    var colors = list('colors');
    var groups = [], byGroup = {}, i, g, cur;
    var n = firstSelected();
    var recents = recentColors();

    for (i = 0; i < colors.length; i++) {
      g = (colors[i] && typeof colors[i].group === 'string' && colors[i].group) ? colors[i].group : 'misc';
      if (!has(byGroup, g)) { byGroup[g] = []; groups.push(g); }
      byGroup[g].push(colors[i]);
    }

    cur = n ? String(n.color).toUpperCase() : '';

    var chips = el('div', { 'class': 'chips' });
    chips.appendChild(chip(t('studio.groupAll'), state.colorGroup === 'all',
      function () { state.colorGroup = 'all'; renderPanel(); }, 'cg-all'));
    for (i = 0; i < groups.length; i++) {
      (function (gr) {
        chips.appendChild(chip(groupLabel(gr), state.colorGroup === gr,
          function () { state.colorGroup = gr; renderPanel(); }, 'cg-' + gr));
      }(groups[i]));
    }
    host.appendChild(chips);

    function swatchesFor(arr) {
      var box = el('div', { 'class': 'studio-swatches' }), j;
      for (j = 0; j < arr.length; j++) {
        (function (c) {
          var h = hex(c.hex, '#EEEEEE');
          box.appendChild(el('button', {
            'class': 'swatch', type: 'button',
            style: { background: h },
            'data-fk': fk('col-' + c.id),
            title: pick(c.name),
            'aria-label': pick(c.name),
            aria: { pressed: cur === h },
            on: { click: function () { applyColor(h); } }
          }));
        }(arr[j]));
      }
      return box;
    }

    if (state.colorGroup === 'all') {
      for (i = 0; i < groups.length; i++) {
        host.appendChild(el('div', { 'class': 'studio-group' }, [
          el('p', { 'class': 'studio-group-t', text: groupLabel(groups[i]) }),
          swatchesFor(byGroup[groups[i]])
        ]));
      }
    } else if (byGroup[state.colorGroup]) {
      host.appendChild(swatchesFor(byGroup[state.colorGroup]));
    } else {
      state.colorGroup = 'all';
      for (i = 0; i < groups.length; i++) host.appendChild(swatchesFor(byGroup[groups[i]]));
    }
    if (!colors.length) host.appendChild(el('p', { 'class': 'muted', text: t('common.empty') }));

    /* custom shade */
    var input = el('input', {
      type: 'color', 'class': 'studio-colorin',
      value: cur || '#E9C2C0',
      'data-fk': 'custom-color',
      'aria-label': t('studio.customColor'),
      on: {
        pointerdown: begin,
        input: function (ev) {
          begin();
          var h = hex(ev.target.value, '');
          if (!h) return;
          eachSelected(function (nl) { nl.color = h; });
          hexOut.textContent = h;
          renderStage();
          saveDraft();
        },
        change: function (ev) {
          var h = hex(ev.target.value, '');
          commit();
          if (h) rememberColor(h);
          renderPanel();
        }
      }
    });
    var hexOut = el('span', { 'class': 'studio-hex', text: cur || '—' });

    host.appendChild(el('div', { 'class': 'studio-group' }, [
      el('p', { 'class': 'studio-group-t', text: t('studio.customColor') }),
      el('div', { 'class': 'studio-custom' }, [input, hexOut])
    ]));

    if (recents.length) {
      var rbox = el('div', { 'class': 'studio-swatches' });
      for (i = 0; i < recents.length; i++) {
        (function (h) {
          rbox.appendChild(el('button', {
            'class': 'swatch swatch-sm', type: 'button',
            style: { background: h }, title: h, 'aria-label': h,
            'data-fk': fk('rec-' + h.slice(1)),
            aria: { pressed: cur === h },
            on: { click: function () { applyColor(h); } }
          }));
        }(recents[i]));
      }
      host.appendChild(el('div', { 'class': 'studio-group' }, [
        el('p', { 'class': 'studio-group-t', text: t('studio.recent') }),
        rbox
      ]));
    }
  }

  var GROUP_LABEL = {
    nude: { ar: 'نيود', en: 'Nude' },
    pink: { ar: 'وردي', en: 'Pink' },
    red: { ar: 'أحمر', en: 'Red' },
    bold: { ar: 'ألوان جريئة', en: 'Bold' },
    dark: { ar: 'غامق', en: 'Dark' },
    pastel: { ar: 'باستيل', en: 'Pastel' },
    neutral: { ar: 'محايد', en: 'Neutral' },
    misc: { ar: 'متنوّع', en: 'Other' },
    stones: { ar: 'أحجار', en: 'Stones' },
    stars: { ar: 'نجوم', en: 'Stars' },
    flowers: { ar: 'ورود', en: 'Flowers' },
    letters: { ar: 'حروف', en: 'Letters' },
    hearts: { ar: 'قلوب', en: 'Hearts' }
  };
  function groupLabel(g) {
    return GROUP_LABEL[g] ? pick(GROUP_LABEL[g]) : String(g);
  }

  function applyColor(h) {
    if (!state.sel.length) { toast(t('studio.needSel'), 'info'); return; }
    rememberColor(h);
    markTouch(4);
    react(state.sel);
    mutate(function () {
      eachSelected(function (n) { n.color = h; });
    });
  }

  /* ---- the finish tool ---- */
  function buildFinishPanel(host) {
    var arr = list('finishes');
    var grid = el('div', { 'class': 'studio-minis' });
    var n = firstSelected();
    var i;
    for (i = 0; i < arr.length; i++) {
      (function (f) {
        grid.appendChild(el('button', {
          'class': 'studio-mini', type: 'button',
          'data-fk': fk('fin-' + f.id),
          aria: { pressed: !!n && n.finish === f.id },
          on: {
            click: function () {
              if (!state.sel.length) { toast(t('studio.needSel'), 'info'); return; }
              markTouch(4);
              react(state.sel);
              mutate(function () { eachSelected(function (nl) { nl.finish = f.id; }); });
            }
          }
        }, [
          miniNail(sampleNail({ finish: f.id }), { finishId: f.id, h: 64 }),
          el('span', { 'class': 'studio-mini-name', text: pick(f.name) }),
          priceTag(f.price)
        ]));
      }(arr[i]));
    }
    if (!arr.length) grid.appendChild(el('p', { 'class': 'muted', text: t('common.empty') }));
    host.appendChild(el('p', { 'class': 'studio-group-t', text: t('studio.finishTitle') }));
    host.appendChild(grid);
  }

  /* ---- the pattern tool ---- */
  function buildPatternPanel(host) {
    var arr = list('patterns');
    var grid = el('div', { 'class': 'studio-minis' });
    var n = firstSelected();
    var pat = n && isObj(n.pattern) ? n.pattern : { kind: 'none', color: '#FFFFFF', color2: '#E8B4C8', scale: 1 };
    var i;

    for (i = 0; i < arr.length; i++) {
      (function (p) {
        var sample = sampleNail({
          pattern: { kind: p.kind, color: pat.color, color2: pat.color2, scale: pat.scale }
        });
        grid.appendChild(el('button', {
          'class': 'studio-mini', type: 'button',
          'data-fk': fk('pat-' + p.id),
          aria: { pressed: pat.kind === p.kind },
          on: {
            click: function () {
              if (!state.sel.length) { toast(t('studio.needSel'), 'info'); return; }
              markTouch(4);
              react(state.sel);
              mutate(function () {
                eachSelected(function (nl) {
                  nl.pattern.kind = typeof p.kind === 'string' ? p.kind : 'none';
                });
              });
            }
          }
        }, [
          miniNail(sample, { h: 64 }),
          el('span', { 'class': 'studio-mini-name', text: pick(p.name) }),
          priceTag(p.price)
        ]));
      }(arr[i]));
    }
    if (!arr.length) grid.appendChild(el('p', { 'class': 'muted', text: t('common.empty') }));

    host.appendChild(el('p', { 'class': 'studio-group-t', text: t('studio.patternTitle') }));
    host.appendChild(grid);

    function colorField(labelKey, prop, fkey) {
      var input = el('input', {
        type: 'color', 'class': 'studio-colorin',
        value: hex(pat[prop], '#FFFFFF'),
        'data-fk': fkey,
        'aria-label': t(labelKey),
        on: {
          pointerdown: begin,
          input: function (ev) {
            var h = hex(ev.target.value, '');
            if (!h) return;
            begin();
            markTouch(4);
            eachSelected(function (nl) { nl.pattern[prop] = h; });
            renderStage();
            saveDraft();
          },
          change: function () { commit(); renderPanel(); }
        }
      });
      return el('div', { 'class': 'field' }, [
        el('span', { 'class': 'label', text: t(labelKey) }),
        input
      ]);
    }

    var scale = el('input', {
      'class': 'range', type: 'range', min: '0.6', max: '1.6', step: '0.05',
      value: String(clamp(num(pat.scale, 1), 0.6, 1.6)),
      'data-fk': 'pat-scale',
      'aria-label': t('studio.patScale'),
      on: {
        pointerdown: begin,
        keydown: begin,
        input: function (ev) {
          var v = clamp(num(ev.target.value, 1), 0.6, 1.6);
          begin();
          markTouch(4);
          eachSelected(function (nl) { nl.pattern.scale = v; });
          renderStage();
          saveDraft();
        },
        change: function () { commit(); renderPanel(); }
      }
    });

    host.appendChild(el('div', { 'class': 'field-row' }, [
      colorField('studio.patColor', 'color', 'pat-c1'),
      colorField('studio.patColor2', 'color2', 'pat-c2')
    ]));
    host.appendChild(el('div', { 'class': 'field' }, [
      el('span', { 'class': 'label', text: t('studio.patScale') }),
      scale
    ]));
  }

  /* ---- the charm tool ---- */
  function buildCharmPanel(host) {
    var arr = list('charms');
    var groups = [], byGroup = {}, i, g;

    for (i = 0; i < arr.length; i++) {
      g = (arr[i] && typeof arr[i].group === 'string' && arr[i].group) ? arr[i].group : 'misc';
      if (!has(byGroup, g)) { byGroup[g] = []; groups.push(g); }
      byGroup[g].push(arr[i]);
    }

    var chips = el('div', { 'class': 'chips' });
    chips.appendChild(chip(t('common.all'), state.charmGroup === 'all',
      function () { state.charmGroup = 'all'; renderPanel(); }, 'chg-all'));
    for (i = 0; i < groups.length; i++) {
      (function (gr) {
        chips.appendChild(chip(groupLabel(gr), state.charmGroup === gr,
          function () { state.charmGroup = gr; renderPanel(); }, 'chg-' + gr));
      }(groups[i]));
    }

    function gridFor(items) {
      var box = el('div', { 'class': 'studio-charms' }), j;
      for (j = 0; j < items.length; j++) {
        (function (c) {
          box.appendChild(el('button', {
            'class': 'studio-charm', type: 'button',
            'data-fk': fk('ch-' + c.id),
            title: pick(c.name) + (num(c.price, 0) > 0 ? ' · ' + money(c.price) : ''),
            on: { click: function () { addCharm(c.id); } }
          }, [
            el('span', { 'class': 'studio-charm-g', text: c.glyph || '✦', 'aria-hidden': 'true' }),
            el('span', { 'class': 'studio-charm-n', text: pick(c.name) })
          ]));
        }(items[j]));
      }
      return box;
    }

    host.appendChild(el('p', { 'class': 'studio-group-t', text: t('studio.charmTitle') }));
    host.appendChild(chips);
    if (state.charmGroup === 'all') {
      for (i = 0; i < groups.length; i++) {
        host.appendChild(el('div', { 'class': 'studio-group' }, [
          el('p', { 'class': 'studio-group-t', text: groupLabel(groups[i]) }),
          gridFor(byGroup[groups[i]])
        ]));
      }
    } else if (byGroup[state.charmGroup]) {
      host.appendChild(gridFor(byGroup[state.charmGroup]));
    } else {
      state.charmGroup = 'all';
      for (i = 0; i < groups.length; i++) host.appendChild(gridFor(byGroup[groups[i]]));
    }
    if (!arr.length) host.appendChild(el('p', { 'class': 'muted', text: t('common.empty') }));
  }

  /* THE charm moment. It does not simply appear: it drops onto the plate,
     settles a touch past its resting size, and throws one small spark. Once —
     and the spark IS the confirmation, so the toast only speaks up when motion
     is switched off and there is nothing to see. */
  function addCharm(id) {
    var n = firstSelected();
    if (!state.sel.length || !n) { toast(t('studio.needSel'), 'info'); return; }
    if (n.charms.length >= CHARM_MAX) { toast(t('studio.charmLimit'), 'info'); return; }
    markTouch(4);
    /* the view moves BEFORE the charm is placed, so the drop happens in front
       of her rather than somewhere down the page */
    withCharmInView(function () { placeCharm(id); });
  }

  function placeCharm(id) {
    var n = firstSelected();
    var key = state.sel.length ? state.sel[0] : '';
    var landed = -1;
    if (!n || n.charms.length >= CHARM_MAX) return;
    react(state.sel);
    mutate(function () {
      eachSelected(function (nl) {
        if (nl.charms.length < CHARM_MAX) nl.charms.push({ id: id, x: 0.5, y: 0.35, s: 1, r: 0 });
      });
      var f = firstSelected();
      landed = f ? f.charms.length - 1 : -1;
      state.activeCharm = landed;
      state.landCharm = landed;
      state.landStage = { key: key, index: landed };
    });
    if (reduced()) { toast(t('studio.charmAdded'), 'ok'); return; }
    /* the spark waits for the drop to finish, so the two read as one gesture */
    if (landed >= 0) window.setTimeout(function () { sparkleOnCharm(key, landed); }, 300);
  }

  /* ---- the charm list + big editor ---- */
  function charmRows() {
    var n = firstSelected();
    var box = el('div', { 'class': 'studio-clist' });
    var i;
    if (!n) return box;
    if (!n.charms.length) {
      box.appendChild(el('p', { 'class': 'muted small', text: t('studio.charmNone') }));
      return box;
    }
    for (i = 0; i < n.charms.length; i++) {
      (function (c, index) {
        var item = findItem('charms', c.id);
        function nudge(dx, dy) {
          return function () {
            mutate(function () {
              c.x = clamp(c.x + dx, 0, 1);
              c.y = clamp(c.y + dy, 0, 1);
            });
          };
        }
        box.appendChild(el('div', {
          'class': 'studio-crow' + (state.activeCharm === index ? ' is-on' : ''),
          on: { click: function () { state.activeCharm = index; renderEditor(); renderCharmList(); } }
        }, [
          el('span', { 'class': 'studio-crow-g', text: (item && item.glyph) || '✦', 'aria-hidden': 'true' }),
          el('span', { 'class': 'studio-crow-n', text: item ? pick(item.name) : c.id }),
          el('span', { 'class': 'studio-pad' }, [
            el('span', {}),
            padBtn(0, t('studio.moveUp'), nudge(0, -0.05), 'cu-' + index),
            el('span', {}),
            padBtn(270, t('studio.moveLeft'), nudge(-0.05, 0), 'cs-' + index),
            padBtn(180, t('studio.moveDown'), nudge(0, 0.05), 'cd-' + index),
            padBtn(90, t('studio.moveRight'), nudge(0.05, 0), 'ce-' + index)
          ]),
          el('span', { 'class': 'studio-crow-acts' }, [
            iconButton('plus', t('studio.bigger'), function () {
              mutate(function () { c.s = clamp(c.s + 0.15, 0.4, 2.4); });
            }, 'icon-btn-sm', 'cb-' + index),
            iconButton('minus', t('studio.smaller'), function () {
              mutate(function () { c.s = clamp(c.s - 0.15, 0.4, 2.4); });
            }, 'icon-btn-sm', 'cm-' + index),
            iconButton('undo', t('studio.rotL'), function () {
              mutate(function () { c.r = clamp(c.r - 15, -180, 180); });
            }, 'icon-btn-sm', 'cl-' + index),
            iconButton('redo', t('studio.rotR'), function () {
              mutate(function () { c.r = clamp(c.r + 15, -180, 180); });
            }, 'icon-btn-sm', 'cr-' + index),
            iconButton('trash', t('studio.removeCharm'), function () {
              mutate(function () {
                var nl = firstSelected();
                if (nl) nl.charms.splice(index, 1);
                state.activeCharm = -1;
              });
            }, 'icon-btn-sm', 'cx-' + index)
          ])
        ]));
      }(n.charms[i], i));
    }
    return box;
  }

  /* Our own arrow glyph, drawn pointing up and rotated here: the shared
     .ico-chevron is mirrored by base.css in RTL, which would flip the pad. */
  function arrowSVG(deg) {
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ' +
      'focusable="false" style="display:block;transform:rotate(' + deg + 'deg)">' +
      '<path d="M12 19.2V5.6M5.8 11.4L12 5.2l6.2 6.2"/></svg>';
  }

  /* deg: 0 up · 90 right · 180 down · 270 left */
  function padBtn(deg, label, onClick, fkey) {
    return el('button', {
      'class': 'icon-btn icon-btn-sm', type: 'button',
      'aria-label': label, title: label,
      'data-fk': fk(fkey),
      html: arrowSVG(deg),
      on: { click: onClick }
    });
  }

  function renderCharmList() {
    if (!refs.charmList) return;
    keepFocus(refs.charmList, function () {
      empty(refs.charmList);
      refs.charmList.appendChild(charmRows());
    });
  }

  /* pointer dragging on the big single-nail editor */
  var drag = { on: false, index: -1, raf: 0 };

  /* letting go: the charm drops the last of its lift and settles */
  function settleCharm(svg, index) {
    var marks = (svg && svg.querySelectorAll && index >= 0) ? svg.querySelectorAll('g.nail-charm') : null;
    if (!marks || !marks[index]) return;
    play(fxWrap(marks[index]), [
      { transform: 'scale(1.16)' },
      { transform: 'scale(.97)', offset: 0.55 },
      { transform: 'scale(1)' }
    ], { duration: Math.round(drop() * 0.62), easing: easeOut() });
  }

  function editorCanvas() {
    var key = state.sel.length ? state.sel[0] : activeKeys(state.design)[0];
    var n = nailOf(key);
    var box = el('div', { 'class': 'studio-canvas', 'data-fk': 'editor-canvas' });
    if (!n) return box;

    /* Only the <svg> inside `box` is ever replaced: `box` itself has to stay
       alive for the whole gesture, because it owns the pointer capture. */
    /* the charm that is under her finger sits proud of the plate — a static
       transform, not an animation, because the SVG is repainted every frame */
    function dressCharms(svg) {
      var marks = (svg && svg.querySelectorAll) ? svg.querySelectorAll('g.nail-charm') : null;
      var wrap;
      if (!marks || !marks.length) return;
      if (drag.on && drag.index >= 0 && marks[drag.index] && !reduced()) {
        wrap = fxWrap(marks[drag.index]);
        if (wrap) wrap.style.transform = 'scale(1.16)';
      }
      if (state.landCharm >= 0 && marks[state.landCharm]) {
        wrap = fxWrap(marks[state.landCharm]);
        state.landCharm = -1;
        play(wrap, [
          { transform: 'translate(0,-16px) scale(2)', opacity: 0 },
          { transform: 'translate(0,0) scale(.84)', opacity: 1, offset: 0.6 },
          { transform: 'scale(1.08)', offset: 0.8 },
          { transform: 'scale(1)', opacity: 1 }
        ], { duration: drop(), easing: easeOut() });
      }
    }

    function paint() {
      var svg = null;
      empty(box);
      try {
        svg = SN.Nail.single(n, state.design, {
          key: key, shape: state.design.shape, w: 250, bg: true,
          ariaLabel: nailName(key)
        });
        box.appendChild(svg);
        dressCharms(svg);
      } catch (e) { /* a partial state must never break the editor */ }
    }

    function pt(ev) {
      var svg = box.firstChild;
      if (!svg || !SN.Nail || !SN.Nail.pointToNorm) return null;
      return SN.Nail.pointToNorm(svg, ev.clientX, ev.clientY);
    }

    /* nearest charm within its own drawn radius (charm box is 100 x 150) */
    function hit(px, py) {
      var best = -1, bestD = Infinity, i, c, dx, dy, d, r;
      for (i = 0; i < n.charms.length; i++) {
        c = n.charms[i];
        dx = (px - c.x) * 100;
        dy = (py - c.y) * 150;
        d = Math.sqrt(dx * dx + dy * dy);
        r = 16 * clamp(num(c.s, 1), 0.4, 2.4) + 8;
        if (d < r && d < bestD) { bestD = d; best = i; }
      }
      return best;
    }

    function move(ev) {
      var p;
      if (!drag.on || drag.index < 0 || !n.charms[drag.index]) return;
      p = pt(ev);
      if (!p) return;
      if (ev.cancelable) ev.preventDefault();
      n.charms[drag.index].x = clamp(p.x, 0, 1);
      n.charms[drag.index].y = clamp(p.y, 0, 1);
      if (window.requestAnimationFrame) {
        if (drag.raf) return;
        drag.raf = window.requestAnimationFrame(function () {
          drag.raf = 0;
          paint();
          renderStage();
        });
      } else {
        paint();
        renderStage();
      }
    }

    function endDrag(ev) {
      var released;
      if (!drag.on) return;
      released = drag.index;
      drag.on = false;
      drag.index = -1;
      if (drag.raf && window.cancelAnimationFrame) {
        window.cancelAnimationFrame(drag.raf);
        drag.raf = 0;
      }
      if (box.classList) box.classList.remove('is-drag');
      box.style.transform = '';
      try { if (ev && ev.pointerId !== undefined) box.releasePointerCapture(ev.pointerId); }
      catch (e) { /* ignore */ }
      commit();
      saveDraft();
      paint();
      settleCharm(box.firstChild, released);
      renderStage();
      renderActionsSafe();
    }

    box.addEventListener('pointerdown', function (ev) {
      var p = pt(ev), i;
      if (!p) return;
      i = hit(p.x, p.y);
      if (i === -1) return;
      if (ev.cancelable) ev.preventDefault();
      drag.on = true;
      drag.index = i;
      state.activeCharm = i;
      markTouch(4);
      begin();                       /* one history entry for the whole drag */
      if (box.classList) box.classList.add('is-drag');
      /* the nail itself answers the grab, so the charm feels attached to it */
      if (!reduced()) {
        box.style.transition = 'transform var(--dur-1) var(--ease-out)';
        box.style.transform = 'scale(1.025)';
      }
      paint();
      try { box.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
      renderCharmList();
    }, false);

    box.addEventListener('pointermove', move, false);
    box.addEventListener('pointerup', endDrag, false);
    box.addEventListener('pointercancel', endDrag, false);

    paint();
    return box;
  }

  function renderEditor() {
    var host = refs.editor;
    if (!host) return;
    empty(host);
    var n = firstSelected();
    host.appendChild(el('p', { 'class': 'studio-group-t', text: t('studio.editorTitle') }));
    host.appendChild(el('div', { 'class': 'studio-editor' }, [
      editorCanvas(),
      el('p', {
        'class': 'studio-canvas-hint',
        text: (n && n.charms.length) ? t('studio.dragHint') : t('studio.editorEmpty')
      })
    ]));
  }

  function renderPanel() {
    var host = refs.panel;
    if (!host) return;
    keepFocus(host, function () {
      empty(host);
      if (!state.sel.length) {
        host.appendChild(el('p', { 'class': 'note note-warn', text: t('studio.selEmpty') }));
        return;
      }
      if (state.tool === 'finish') buildFinishPanel(host);
      else if (state.tool === 'pattern') buildPatternPanel(host);
      else if (state.tool === 'charm') buildCharmPanel(host);
      else buildColorPanel(host);
    });
  }

  /* ---- copy / paste / randomise / reset ---- */
  function randomOf(arr) { return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null; }

  /* ---- the randomiser --------------------------------------------------
     The old one drew three colours out of one random family and hoped. It
     produced noise about as often as it produced a look. This one starts from
     a hand-written palette — a trio that a person already decided goes
     together — and then SNAPS each colour to the nearest shade the owner
     actually stocks, so an owner who reworks her colour list keeps control of
     what comes out. Pattern, finish and charm are chosen from the shortlist
     that palette was written for, and the whole set gets ONE layout, which is
     what separates a manicure from a colour test. */

  var PALETTES = [
    { name: { ar: 'ماء الورد', en: 'Rosewater' }, hexes: ['#F0C8D2', '#E0A2B3', '#FFF3F0'],
      finish: 'gloss', patterns: ['french', 'glazed', 'aura', 'ombre'], charms: ['stones', 'hearts', 'flowers'] },
    { name: { ar: 'لاتيه', en: 'Latte' }, hexes: ['#C9A184', '#8C6449', '#F6EADF'],
      finish: 'velvet', patterns: ['french', 'ombre', 'marble', 'frenchDeep'], charms: ['stones', 'misc'] },
    { name: { ar: 'كرزي', en: 'Cherry' }, hexes: ['#9E1F32', '#6B1526', '#FBE6E6'],
      finish: 'gloss', patterns: ['french', 'half', 'hearts', 'diagonal'], charms: ['hearts', 'stones'] },
    { name: { ar: 'لؤلؤ', en: 'Pearl' }, hexes: ['#F4EFEA', '#DCE4EC', '#FFFFFF'],
      finish: 'chrome', patterns: ['glazed', 'aura', 'chrome', 'french'], charms: ['stones', 'stars'] },
    { name: { ar: 'غروب', en: 'Sunset' }, hexes: ['#F0906E', '#E8624F', '#FDE7D6'],
      finish: 'glitter', patterns: ['ombre', 'aura', 'tipsGlitter', 'ombreV'], charms: ['stars', 'misc'] },
    { name: { ar: 'برقوق', en: 'Plum' }, hexes: ['#6B3A52', '#A76A85', '#F3E2E8'],
      finish: 'matte', patterns: ['half', 'diagonal', 'marble', 'frenchDeep'], charms: ['stones', 'stars'] },
    { name: { ar: 'سماء', en: 'Sky' }, hexes: ['#BBD3E8', '#C9BEE6', '#FFFFFF'],
      finish: 'jelly', patterns: ['ombre', 'checkers', 'dots', 'aura'], charms: ['stars', 'flowers'] },
    { name: { ar: 'زيتوني', en: 'Olive' }, hexes: ['#95A279', '#5E6B4C', '#F2EFE2'],
      finish: 'matte', patterns: ['leopard', 'dots', 'stripes', 'french'], charms: ['flowers', 'misc'] },
    { name: { ar: 'شامبين', en: 'Champagne' }, hexes: ['#E4CBA0', '#C2A05E', '#FBF3E5'],
      finish: 'chrome', patterns: ['chrome', 'glazed', 'tipsGlitter', 'french'], charms: ['stones', 'stars'] },
    { name: { ar: 'توت', en: 'Berry' }, hexes: ['#C0417C', '#E06AA0', '#FBE0EC'],
      finish: 'gloss', patterns: ['ombreV', 'hearts', 'stars', 'french'], charms: ['hearts', 'stars'] }
  ];

  var LAYOUTS = ['accent', 'alternate', 'allOver'];
  var FINGER_ORDER = ['thumb', 'index', 'middle', 'ring', 'pinky'];

  /* snap a palette colour onto the closest shade the shop really sells */
  function nearestColor(target) {
    var arr = list('colors'), best = target, bd = Infinity, i, h, d, dr, dg, db;
    var tr = parseInt(target.slice(1, 3), 16);
    var tg = parseInt(target.slice(3, 5), 16);
    var tb = parseInt(target.slice(5, 7), 16);
    for (i = 0; i < arr.length; i++) {
      h = hex(arr[i] && arr[i].hex, '');
      if (!h) continue;
      dr = parseInt(h.slice(1, 3), 16) - tr;
      dg = parseInt(h.slice(3, 5), 16) - tg;
      db = parseInt(h.slice(5, 7), 16) - tb;
      d = dr * dr * 0.9 + dg * dg * 1.2 + db * db * 0.7;   /* eyes weight green */
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  }

  function planLook(pal) {
    var kinds = patternKinds(), avail = [], i;
    var finishes = list('finishes'), fin = '';
    var charms = list('charms'), pool = [];

    for (i = 0; i < pal.patterns.length; i++) {
      if (kinds.indexOf(pal.patterns[i]) !== -1) avail.push(pal.patterns[i]);
    }
    for (i = 0; i < finishes.length; i++) if (finishes[i].id === pal.finish) fin = pal.finish;
    if (!fin) fin = (randomOf(finishes) || {}).id || 'gloss';
    for (i = 0; i < charms.length; i++) {
      if (pal.charms.indexOf(charms[i].group) !== -1) pool.push(charms[i]);
    }
    if (!pool.length) pool = charms;

    return {
      name: pal.name,
      base: nearestColor(pal.hexes[0]),
      second: nearestColor(pal.hexes[1]),
      light: nearestColor(pal.hexes[2]),
      finish: fin,
      kind: avail.length ? randomOf(avail) : 'none',
      layout: randomOf(LAYOUTS),
      accent: Math.random() < 0.72 ? 'ring' : 'middle',
      charm: (Math.random() < 0.6 && pool.length) ? randomOf(pool).id : null,
      scale: Math.round((0.9 + Math.random() * 0.35) * 100) / 100
    };
  }

  function applyLook(p) {
    var kk = activeKeys(state.design), i, key, f, fi, n, isAccent, col, patterned;
    for (i = 0; i < kk.length; i++) {
      key = kk[i];
      n = state.design.nails[key];
      if (!n) continue;
      f = fingerOf(key);
      fi = FINGER_ORDER.indexOf(f);
      isAccent = f === p.accent;

      if (p.layout === 'alternate') col = (fi % 2) ? p.second : p.base;
      else if (p.layout === 'allOver') col = p.light;
      else col = p.base;
      if (isAccent) col = (p.layout === 'allOver') ? p.base : p.light;

      patterned = p.kind !== 'none' && (isAccent || p.layout === 'allOver');

      n.color = col;
      n.finish = p.finish;
      n.pattern = {
        kind: patterned ? p.kind : 'none',
        color: p.light,
        color2: p.second,
        scale: p.scale
      };
      n.charms = (isAccent && p.charm) ? [{ id: p.charm, x: 0.5, y: 0.3, s: 1, r: 0 }] : [];
    }
  }

  function revealLook(pal) {
    var r;
    markTouch(4);
    react(activeKeys(state.design));
    refresh();
    toast(t('studio.randDone', { name: pick(pal.name) }), 'ok');
    r = rectOf(refs.stage);
    if (r) window.setTimeout(function () { sparkleAt(r, 1.15); }, 120);
  }

  /* A beat of anticipation, then the reveal. Three throwaway looks flash past
     at ~110ms — long enough to register as a shuffle, short enough that she is
     never waiting — and the whole roll is ONE undo step. */
  function randomize() {
    var pal, plan, ticks = 0, atStep = state.step;
    if (state.rolling) return;
    if (!list('colors').length) { toast(t('common.empty'), 'info'); return; }

    pal = randomOf(PALETTES);
    plan = planLook(pal);

    if (reduced()) {
      mutate(function () { applyLook(plan); });
      markTouch(4);
      toast(t('studio.randDone', { name: pick(pal.name) }), 'ok');
      return;
    }

    state.rolling = true;
    begin();
    renderActionsSafe();

    (function spin() {
      /* she moved on mid-shuffle: land the final look at once, no theatre */
      if (state.step !== atStep) { ticks = 3; }
      if (ticks < 3) {
        ticks++;
        applyLook(planLook(randomOf(PALETTES)));
        renderStage();
        window.setTimeout(spin, 108);
        return;
      }
      applyLook(plan);
      commit();
      state.rolling = false;
      revealLook(pal);
    }());
  }

  function renderActions() {
    var host = refs.actions, rollBtn;
    if (!host) return;
    keepFocus(host, function () {
      empty(host);

      /* Row 1 — the offers. The randomiser is the headline: it is the only
         filled button on the step, it says what it does, and it is the first
         thing a thumb reaches. Beside it, the two shortcuts that stop this
         feeling like ten separate jobs. */
      rollBtn = shortcutBtn('dice', 'studio.randomize', 'a-rand', true, randomize);
      /* while it shuffles the button says so but stays focusable: disabling it
         would drop keyboard focus for the third of a second the roll lasts.
         Repeat presses are already swallowed by `state.rolling`. */
      if (state.rolling) {
        rollBtn.setAttribute('aria-busy', 'true');
        rollBtn.lastChild.textContent = t('studio.randRoll');
      }
      host.appendChild(el('div', { 'class': 'studio-actions' }, [
        rollBtn,
        shortcutBtn('grid', 'studio.applyLook', 'a-all', false, applyLookToAll),
        state.design.hand === 'both'
          ? shortcutBtn('hand', 'studio.mirrorLook', 'a-mirror', false, mirrorLook)
          : null
      ]));
      host.appendChild(el('p', { 'class': 'studio-hint' }, [
        el('span', { 'class': 'ico', html: icon('sparkle', 16), 'aria-hidden': 'true' }),
        el('span', { text: t('studio.randHint') })
      ]));

      /* Row 2 — the quieter tools, with undo and redo pulled to the front so
         the way back is the first thing she sees, not the last. */
      host.appendChild(el('div', { 'class': 'studio-actions' }, [
        actionBtn('undo', 'common.undo', undo, 'a-undo', !hist.past.length),
        actionBtn('redo', 'common.redo', redo, 'a-redo', !hist.future.length),
        actionBtn('copy', 'studio.copyNail', function () {
          var n = firstSelected();
          if (!n) { toast(t('studio.needSel'), 'info'); return; }
          state.clip = clone(n);
          toast(t('studio.copiedNail'), 'ok');
          renderActions();
        }, 'a-copy'),
        actionBtn('plusCircle', 'studio.pasteNail', function () {
          if (!state.clip) { toast(t('studio.noCopy'), 'info'); return; }
          if (!state.sel.length) { toast(t('studio.needSel'), 'info'); return; }
          markTouch(4);
          react(state.sel);
          mutate(function () {
            eachSelected(function (n) {
              var c = clone(state.clip);
              n.color = c.color;
              n.finish = c.finish;
              n.pattern = c.pattern;
              n.charms = c.charms;
            });
          });
          toast(t('studio.pastedNail'), 'ok');
        }, 'a-paste', !state.clip),
        actionBtn('close', 'studio.clearNail', function () {
          if (!state.sel.length) { toast(t('studio.needSel'), 'info'); return; }
          react(state.sel);
          mutate(function () {
            var fresh = blank();
            var src = fresh.nails[keys()[0]] || null;
            eachSelected(function (n) {
              n.color = src ? src.color : '#E9C2C0';
              n.finish = src ? src.finish : 'gloss';
              n.pattern = { kind: 'none', color: '#FFFFFF', color2: '#E8B4C8', scale: 1 };
              n.charms = [];
            });
            state.activeCharm = -1;
          });
          toast(t('studio.cleared'), 'ok');
        }, 'a-clear')
      ]));
      if (!hist.past.length) {
        host.appendChild(el('p', { 'class': 'studio-hint' }, [
          el('span', { 'class': 'ico', html: icon('undo', 16), 'aria-hidden': 'true' }),
          el('span', { text: t('studio.undoSafe') })
        ]));
      }
    });
  }

  /* copy the look she is standing on to every nail she ordered */
  function applyLookToAll() {
    var src = firstSelected(), kk = activeKeys(state.design);
    if (!src) { toast(t('studio.needSel'), 'info'); return; }
    markTouch(4);
    react(kk);
    mutate(function () {
      var look = clone(src), i, n;
      for (i = 0; i < kk.length; i++) {
        n = state.design.nails[kk[i]];
        if (!n) continue;
        n.color = look.color;
        n.finish = look.finish;
        n.pattern = clone(look.pattern);
        n.charms = clone(look.charms);
      }
    });
    toast(t('studio.appliedLook'), 'ok');
  }

  /* the right hand is the one she designs; the left one just follows */
  function mirrorLook() {
    var fs = fingers(), kk = activeKeys(state.design);
    if (state.design.hand !== 'both') return;
    markTouch(4);
    react(kk);
    mutate(function () {
      var i, from, to;
      for (i = 0; i < fs.length; i++) {
        from = state.design.nails[keyOf('right', fs[i].key)];
        to = state.design.nails[keyOf('left', fs[i].key)];
        if (!from || !to) continue;
        to.color = from.color;
        to.finish = from.finish;
        to.pattern = clone(from.pattern);
        to.charms = clone(from.charms);
      }
    });
    toast(t('studio.mirroredLook'), 'ok');
  }

  function renderActionsSafe() { if (state.step === 4) renderActions(); }

  function actionBtn(ico, labelKey, onClick, fkey, disabled) {
    var name = ico;
    return el('button', {
      'class': 'btn btn-ghost btn-sm', type: 'button',
      'data-fk': fk(fkey),
      disabled: !!disabled,
      on: { click: onClick }
    }, [
      el('span', { 'class': 'btn-ico', html: icon(name, 16), 'aria-hidden': 'true' }),
      el('span', { text: t(labelKey) })
    ]);
  }

  function buildStep4(host) {
    refs.selBar = el('div', {});
    refs.tools = el('div', { 'class': 'studio-tools', role: 'tablist' });
    refs.panel = el('div', { 'class': 'flow', role: 'tabpanel' });
    refs.actions = el('div', {});
    refs.editor = el('div', { 'class': 'flow' });
    refs.charmList = el('div', {});
    var nudge = defaultsNote(4);

    if (nudge) host.appendChild(nudge);
    host.appendChild(section('studio.selTitle', null, [refs.selBar, refs.actions]));
    host.appendChild(el('section', { 'class': 'studio-sec' }, [refs.tools, refs.panel]));
    host.appendChild(section('studio.charmList', null, [refs.editor, refs.charmList]));

    renderSelBar();
    renderTools();
    renderPanel();
    renderActions();
    renderEditor();
    renderCharmList();
  }

  /* ====================================================================== */
  /* 14. Step 5 — finishing touches                                         */
  /* ====================================================================== */

  function toggleRow(labelKey, noteKey, price, on, onChange, fkey) {
    var input = el('input', {
      type: 'checkbox', 'data-fk': fk(fkey),
      on: { change: function (ev) { onChange(!!ev.target.checked); } }
    });
    if (on) input.checked = true;
    return el('label', { 'class': 'studio-toggle' + (on ? ' is-on' : '') }, [
      el('span', { 'class': 'switch' }, [input, el('span', { 'aria-hidden': 'true' })]),
      el('span', { 'class': 'studio-toggle-txt' }, [
        el('b', { text: t(labelKey) }),
        el('small', { text: t(noteKey) })
      ]),
      el('span', { 'class': 'studio-toggle-price', text: '+ ' + money(price) })
    ]);
  }

  function savedList() {
    var items = (SN.Store && SN.Store.mine) ? SN.Store.mine() : [];
    var box = el('div', { 'class': 'studio-saved' });
    var i;
    if (!items.length) {
      box.appendChild(el('p', { 'class': 'muted small', text: t('studio.noSaved') }));
      return box;
    }
    for (i = 0; i < items.length; i++) {
      (function (item) {
        var thumb = el('span', { 'class': 'studio-savedthumb', 'aria-hidden': 'true' });
        var when = '';
        try { when = new Date(num(item.ts, Date.now())).toLocaleDateString(SN.I18n && SN.I18n.lang === 'en' ? 'en-GB' : 'ar-SA'); }
        catch (e) { when = ''; }
        try { thumb.appendChild(SN.Nail.thumb(item.config, 46)); }
        catch (e2) { /* ignore */ }
        box.appendChild(el('div', { 'class': 'studio-savedrow' }, [
          thumb,
          el('span', { 'class': 'studio-savedmeta' }, [
            el('b', { text: item.name || t('studio.newDesign') }),
            el('small', { text: when })
          ]),
          el('span', { 'class': 'studio-savedacts' }, [
            el('button', {
              'class': 'btn btn-line btn-sm', type: 'button', text: t('studio.loadBtn'),
              'data-fk': fk('load-' + item.id),
              on: {
                click: function () {
                  pushHist();
                  state.design = sanitize(item.config);
                  pruneSelection();
                  primeProgress();
                  saveDraft();
                  renderAll();
                  toast(t('studio.loadedSaved'), 'ok');
                }
              }
            }),
            iconButton('trash', t('common.delete'), function () {
              var p = (SN.UI && SN.UI.confirm) ? SN.UI.confirm(t('common.deleteConfirm')) : null;
              function go(ok) {
                if (!ok) return;
                if (SN.Store && SN.Store.removeMine) SN.Store.removeMine(item.id);
                renderStep();
                toast(t('common.deleted'), 'ok');
              }
              if (p && typeof p.then === 'function') p.then(go);
              else go(true);
            }, 'icon-btn-sm', 'del-' + item.id)
          ])
        ]));
      }(items[i]));
    }
    return box;
  }

  function shareUrl() {
    var base = String(window.location.href).split('#')[0];
    var code = '';
    try { code = b64urlEncode(JSON.stringify(state.design)); }
    catch (e) { code = ''; }
    return code ? base + '#d=' + code : base;
  }

  function askName(onDone) {
    var input = el('input', {
      'class': 'input', type: 'text', maxlength: '60',
      placeholder: t('studio.saveNamePh'), value: ''
    });
    var m;
    if (!SN.UI || !SN.UI.modal) { onDone(''); return; }
    m = SN.UI.modal({
      size: 'sm',
      title: t('studio.saveName'),
      body: el('div', { 'class': 'field' }, [
        el('label', { 'class': 'label', text: t('studio.saveName') }),
        input
      ]),
      actions: [
        { label: t('common.cancel'), cls: 'btn-ghost', onClick: function (close) { close(); } },
        {
          label: t('common.save'), cls: 'btn-pri',
          onClick: function (close) {
            var v = String(input.value || '').trim();
            close();
            onDone(v);
          }
        }
      ]
    });
    if (m && m.body) {
      window.setTimeout(function () { try { input.focus(); } catch (e) { /* ignore */ } }, 40);
    }
  }

  function buildStep5(host) {
    var pricing = setting('pricing', {}) || {};
    /* nothing on this step is required — one set, no extras, no note is a
       complete answer — so arriving here is what finishes it */
    window.setTimeout(function () { markTouch(5); }, 0);
    var qtyOut = el('span', { 'class': 'studio-qty-n', text: nfm(state.design.qty) });

    function setQty(v) {
      mutate(function () { state.design.qty = clamp(Math.round(v), 1, 20); });
    }

    host.appendChild(section('studio.qtyTitle', 'studio.qtyText', [
      el('div', { 'class': 'studio-qty' }, [
        iconButton('minus', t('a11y.decrease'), function () { setQty(state.design.qty - 1); }, '', 'qty-down'),
        qtyOut,
        iconButton('plus', t('a11y.increase'), function () { setQty(state.design.qty + 1); }, '', 'qty-up')
      ])
    ]));

    host.appendChild(section('studio.extrasTitle', null, [
      el('div', { 'class': 'studio-toggles' }, [
        toggleRow('order.express', 'order.expressNote', num(pricing.express, 0), state.design.express,
          function (v) { mutate(function () { state.design.express = v; }); }, 'ex'),
        toggleRow('order.giftWrap', 'order.giftWrapNote', num(pricing.giftWrap, 0), state.design.giftWrap,
          function (v) { mutate(function () { state.design.giftWrap = v; }); }, 'gw')
      ])
    ]));

    var notes = el('textarea', {
      'class': 'textarea', maxlength: '600',
      placeholder: t('studio.notesPh'),
      'data-fk': 'notes',
      'aria-label': t('studio.notesTitle'),
      on: {
        focus: begin,
        input: function (ev) { state.design.notes = String(ev.target.value).slice(0, 600); saveDraft(); },
        change: function () { commit(); }
      }
    });
    notes.value = state.design.notes || '';
    host.appendChild(section('studio.notesTitle', null, [notes]));

    var link = el('span', { 'class': 'studio-sharelink', text: shareUrl().slice(0, 120) + '…' });

    host.appendChild(section('studio.saveTitle', 'studio.saveText', [
      el('div', { 'class': 'studio-row' }, [
        el('button', {
          'class': 'btn btn-pri', type: 'button', 'data-fk': 'save-mine',
          on: {
            click: function () {
              askName(function (name) {
                if (SN.Store && SN.Store.saveMine) {
                  SN.Store.saveMine(name || t('studio.newDesign'), state.design);
                }
                toast(t('studio.savedOk'), 'ok');
                renderStep();
              });
            }
          }
        }, [
          el('span', { 'class': 'btn-ico', html: icon('heart', 18), 'aria-hidden': 'true' }),
          el('span', { text: t('studio.saveBtn') })
        ]),
        el('button', {
          'class': 'btn btn-line', type: 'button', 'data-fk': 'share',
          on: { click: copyShareLink }
        }, [
          el('span', { 'class': 'btn-ico', html: icon('share', 18), 'aria-hidden': 'true' }),
          el('span', { text: t('studio.shareBtn') })
        ]),
        el('button', {
          'class': 'btn btn-ghost', type: 'button', 'data-fk': 'new-design',
          text: t('studio.newDesign'),
          on: {
            click: function () {
              var p2 = (SN.UI && SN.UI.confirm) ? SN.UI.confirm(t('studio.newConfirm')) : null;
              function go(ok) {
                if (!ok) return;
                pushHist();
                state.design = sanitize(blank());
                state.sel = activeKeys(state.design);
                state.activeCharm = -1;
                state.touch = {};
                state.doneSeen = {};
                state.allDoneSeen = false;
                saveDraft();
                renderAll();
              }
              if (p2 && typeof p2.then === 'function') p2.then(go);
              else go(true);
            }
          }
        })
      ]),
      el('div', { 'class': 'studio-share' }, [
        el('span', { 'class': 'muted small', text: t('studio.shareText') }),
        link
      ])
    ]));

    host.appendChild(section('studio.myDesigns', null, [savedList()]));
  }

  /* ====================================================================== */
  /* 15. Step 6 — review                                                    */
  /* ====================================================================== */

  function specList() {
    var d = state.design;
    var shape = findItem('shapes', d.shape);
    var len = findItem('lengths', d.length);
    var meth = findItem('measureMethods', d.measure);
    var tone = null, tones = list('skinTones'), i;
    var dl = el('dl', { 'class': 'studio-spec' });

    for (i = 0; i < tones.length; i++) if (hex(tones[i].hex, '') === hex(d.skin, '')) tone = tones[i];

    function row(labelKey, value) {
      dl.appendChild(el('div', { 'class': 'studio-specrow' }, [
        el('dt', { text: t(labelKey) }),
        el('dd', { text: value })
      ]));
    }

    row('studio.lblShape', shape ? pick(shape.name) : String(d.shape));
    row('studio.lblLength', len ? pick(len.name) : String(d.length));
    row('studio.lblSkin', tone ? pick(tone.name) : String(d.skin));
    row('studio.lblHand', d.hand === 'both' ? t('studio.handBoth') : (d.hand === 'right' ? t('studio.handRight') : t('studio.handLeft')));
    row('studio.lblMeasure', meth ? pick(meth.name) : String(d.measure));
    row('studio.lblQty', nfm(d.qty));
    row('studio.lblColors', nfm(distinctColors(d)));
    row('studio.lblPatterns', nfm(countPatterns(d)));
    row('studio.lblCharms', nfm(countCharms(d)));
    return dl;
  }

  function nailSummary() {
    var d = state.design;
    var kk = activeKeys(d);
    var box = el('div', { 'class': 'studio-nailsum' });
    var i, n, pat, patName, arr, j;

    for (i = 0; i < kk.length; i++) {
      n = d.nails[kk[i]];
      if (!n) continue;
      patName = t('studio.plain');
      if (n.pattern && n.pattern.kind && n.pattern.kind !== 'none') {
        arr = list('patterns');
        for (j = 0; j < arr.length; j++) if (arr[j].kind === n.pattern.kind) { patName = pick(arr[j].name); break; }
      }
      pat = patName + ' · ' + (n.charms.length ? countT('charmsN', n.charms.length) : t('studio.noCharms'));
      box.appendChild(el('div', { 'class': 'studio-nailrow' }, [
        el('i', { style: { background: n.color }, 'aria-hidden': 'true' }),
        el('span', {}, [
          el('b', { text: nailName(kk[i]) + ' ' }),
          el('small', { 'class': 'muted', text: pat })
        ]),
        el('b', { text: t('studio.sizeNo') + ' ' + guideLabel(d.sizes[kk[i]]) })
      ]));
    }
    return box;
  }

  function priceTable() {
    var res = (SN.Checkout && SN.Checkout.priceCustom) ? SN.Checkout.priceCustom(state.design) : null;
    var wrap = el('div', { 'class': 'table-wrap' });
    var tbl = el('table', { 'class': 'table table-sum' });
    var tb = el('tbody', {});
    var i, line;

    if (!res) return el('p', { 'class': 'muted', text: t('common.error') });

    for (i = 0; i < res.lines.length; i++) {
      line = res.lines[i];
      tb.appendChild(el('tr', {}, [
        el('td', { text: line.label + (num(line.qty, 1) > 1 ? ' × ' + nfm(line.qty) : '') }),
        el('td', { 'class': 'end nowrap', text: money(line.amount) })
      ]));
    }
    tb.appendChild(el('tr', {}, [
      el('td', { text: t('common.subtotal') }),
      el('td', { 'class': 'end nowrap', text: money(res.subtotal) })
    ]));
    tb.appendChild(el('tr', {}, [
      el('td', { text: t('common.shipping') }),
      el('td', { 'class': 'end nowrap', text: res.shipping > 0 ? money(res.shipping) : t('common.free') })
    ]));
    if (res.vat > 0) {
      tb.appendChild(el('tr', {}, [
        el('td', { text: t('common.vat') }),
        el('td', { 'class': 'end nowrap', text: money(res.vat) })
      ]));
    }
    tbl.appendChild(tb);
    wrap.appendChild(tbl);

    return el('div', { 'class': 'flow' }, [
      wrap,
      el('div', { 'class': 'studio-total' }, [
        el('span', { text: t('common.total') }),
        el('b', { text: money(res.total) })
      ])
    ]);
  }

  /* The last screen before she orders is not a receipt — it is the thing she
     already owns, shown large, with the price told honestly underneath and one
     obvious way forward. The details she can audit sit below the fold. */
  function buildStep6(host) {
    /* one quiet moment of pride as the finished set arrives: the house
       entrance, and the one slow sweep of light the system reserves for a
       moment like this */
    var art = el('div', { 'class': 'studio-review-art' + (reduced() ? '' : ' sn-in sn-shine') });
    var res = (SN.Checkout && SN.Checkout.priceCustom) ? SN.Checkout.priceCustom(state.design) : null;

    reviewSvg = null;
    try {
      reviewSvg = SN.Nail.preview(state.design, { interactive: false });
      art.appendChild(reviewSvg);
    } catch (e) { /* ignore */ }

    host.appendChild(section('studio.reviewProud', 'studio.reviewOwn', [
      art,
      el('div', { 'class': 'studio-total' }, [
        el('span', { text: t('studio.reviewTotal') }),
        el('b', { text: res ? money(res.total) : '—' })
      ]),
      el('button', {
        'class': 'btn btn-pri btn-lg btn-block', type: 'button', 'data-fk': 'confirm',
        text: t('studio.confirm'),
        on: { click: openCheckout }
      }),
      el('p', { 'class': 'muted small', text: t('studio.priceHonest') })
    ]));

    /* Sharing sits directly under the set, not buried at the end: a photo sent
       to a friend is how this shop grows. */
    host.appendChild(section('studio.shareImg', 'studio.shareImgText', [
      el('div', { 'class': 'studio-row' }, [
        shortcutBtn('share', 'studio.shareImg', 'share-img', false, shareImage),
        shortcutBtn('download', 'studio.png', 'png', false, downloadPNG),
        shortcutBtn('copy', 'studio.shareBtn', 'share-link', false, copyShareLink),
        el('button', {
          'class': 'btn btn-ghost btn-sm', type: 'button', 'data-fk': 'print',
          on: { click: function () { try { window.print(); } catch (e) { /* ignore */ } } }
        }, [
          el('span', { 'class': 'btn-ico', html: icon('image', 16), 'aria-hidden': 'true' }),
          el('span', { text: t('studio.print') })
        ])
      ])
    ]));

    host.appendChild(section('studio.specTitle', null, [specList()]));
    host.appendChild(section('studio.nailsTitle', null, [nailSummary()]));
    host.appendChild(section('studio.priceTitle', null, [
      priceTable(),
      el('button', {
        'class': 'btn btn-pri btn-lg btn-block', type: 'button', 'data-fk': 'confirm-2',
        text: t('studio.confirm'),
        on: { click: openCheckout }
      })
    ]));

  }

  function openCheckout() {
    if (!SN.Checkout || typeof SN.Checkout.open !== 'function') {
      toast(t('common.error'), 'err');
      return;
    }
    state.touch[6] = true;
    renderSteps();
    SN.Checkout.open({ kind: 'custom', design: clone(state.design) });
  }

  /* ---- the shareable picture ------------------------------------------- */
  /* `SN.Nail.toPNG` gives us the hands on a flat ground. What gets posted is
     the branded card: the set centred on the house cream, the shop's name and
     handle under it. Every step degrades to the plain render rather than
     failing — an older browser still gets its image. */

  function brandImage(blob) {
    return new Promise(function (resolve) {
      var img, url = '';
      var brand = pick(setting('settings.brand', null)) || 'Shosh Nail';
      var handle = String(setting('settings.instagram', '') || '').replace(/^@/, '');
      if (!blob || !window.URL || !window.URL.createObjectURL || !D.createElement) { resolve(blob); return; }
      try { url = window.URL.createObjectURL(blob); }
      catch (e) { resolve(blob); return; }

      function done(out) {
        try { window.URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
        resolve(out || blob);
      }

      img = new window.Image();
      img.onerror = function () { done(null); };
      img.onload = function () {
        /* a 4:5 portrait — the shape Instagram gives the most room to */
        var W = 1080, H = 1350, pad = 60, capH = 200;
        var cv, ctx, g, s, dw, dh, x, y, blockH;
        try {
          cv = D.createElement('canvas');
          if (!cv.getContext || !cv.toBlob) { done(null); return; }
          cv.width = W; cv.height = H;
          ctx = cv.getContext('2d');

          g = ctx.createLinearGradient(0, 0, W, H);
          g.addColorStop(0, '#FDF5F2');
          g.addColorStop(1, '#F2DFE3');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, W, H);

          s = Math.min((W - pad * 2) / img.width, (H - pad * 2 - capH) / img.height);
          dw = img.width * s;
          dh = img.height * s;
          /* the set and its caption are ONE block, centred together — art
             floating in a sea of empty gradient reads as a mistake */
          blockH = dh + capH;
          x = (W - dw) / 2;
          y = (H - blockH) / 2;

          /* the render brings its own pale ground; give it rounded corners and
             a soft shadow so it reads as a card, not a seam */
          ctx.save();
          ctx.shadowColor = 'rgba(74,43,57,.16)';
          ctx.shadowBlur = 44;
          ctx.shadowOffsetY = 16;
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, dw, dh, 34);
          else ctx.rect(x, y, dw, dh);
          ctx.fillStyle = '#FFF8F6';
          ctx.fill();
          ctx.restore();

          ctx.save();
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, dw, dh, 34);
          else ctx.rect(x, y, dw, dh);
          ctx.clip();
          ctx.drawImage(img, x, y, dw, dh);
          ctx.restore();

          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = '#8C4459';
          ctx.font = '700 62px Tajawal, "Reem Kufi", sans-serif';
          ctx.fillText(brand, W / 2, y + dh + 108);
          if (handle) {
            ctx.fillStyle = '#A85A73';
            ctx.font = '500 38px Tajawal, sans-serif';
            ctx.fillText('@' + handle, W / 2, y + dh + 166);
          }

          cv.toBlob(function (out) { done(out); }, 'image/png');
        } catch (e) { done(null); }
      };
      img.src = url;
    });
  }

  function designPNG() {
    if (!reviewSvg || !SN.Nail || !SN.Nail.toPNG || typeof window.Promise !== 'function') return null;
    toast(t('studio.preparing'), 'info');
    return SN.Nail.toPNG(reviewSvg, { scale: 2 }).then(brandImage);
  }

  function downloadPNG() {
    var p = designPNG();
    if (!p) { toast(t('studio.pngFail'), 'err'); return; }
    p.then(function (blob) {
      if (SN.UI && SN.UI.download) SN.UI.download(blob, 'shosh-nail-design.png', 'image/png');
      toast(t('studio.pngOk'), 'ok');
    }, function () {
      toast(t('studio.pngFail'), 'err');
    });
  }

  function shareImage() {
    var p = designPNG();
    if (!p) { toast(t('studio.pngFail'), 'err'); return; }
    p.then(function (blob) {
      var nav = window.navigator, file = null, sent = null;
      try {
        if (typeof window.File === 'function') {
          file = new window.File([blob], 'shosh-nail-design.png', { type: 'image/png' });
        }
      } catch (e) { file = null; }
      try {
        if (file && nav && nav.share && nav.canShare && nav.canShare({ files: [file] })) {
          sent = nav.share({
            files: [file],
            title: pick(setting('settings.brand', null)) || 'Shosh Nail',
            text: t('studio.shareImgText')
          });
        }
      } catch (e2) { sent = null; }
      if (sent && typeof sent.then === 'function') {
        sent.then(function () { toast(t('studio.sharedOk'), 'ok'); }, function () { /* she cancelled */ });
        return;
      }
      /* no share sheet on this device — hand her the file instead */
      if (SN.UI && SN.UI.download) SN.UI.download(blob, 'shosh-nail-design.png', 'image/png');
      toast(t('studio.pngOk'), 'ok');
    }, function () {
      toast(t('studio.pngFail'), 'err');
    });
  }

  function copyShareLink() {
    var p = (SN.UI && SN.UI.copy) ? SN.UI.copy(shareUrl()) : null;
    if (p && typeof p.then === 'function') {
      p.then(function (ok) { toast(ok ? t('studio.shareOk') : t('studio.shareFail'), ok ? 'ok' : 'err'); });
    } else {
      toast(t('studio.shareFail'), 'err');
    }
  }

  /* ====================================================================== */
  /* 16. Progress bar, action bar, step routing                             */
  /* ====================================================================== */

  var STEP_LABELS = ['studio.s1', 'studio.s2', 'studio.s3', 'studio.s4', 'studio.s5', 'studio.s6'];

  function renderSteps() {
    var host = refs.steps, i, pct;
    if (!host) return;
    keepFocus(host, function () {
      empty(host);
      for (i = 1; i <= STEP_COUNT; i++) {
        (function (n) {
          var done = stepDone(n);
          var on = n === state.step;
          host.appendChild(el('button', {
            'class': 'studio-step-btn' + (done ? ' is-done' : '') + (on ? ' is-on' : ''),
            type: 'button',
            'data-fk': fk('step-' + n),
            disabled: n > state.reached,
            aria: {
              current: on ? 'step' : false,
              label: t(STEP_LABELS[n - 1]) + (done ? ' — ' + t('studio.stepDone') : '')
            },
            on: { click: function () { setStep(n); } }
          }, [
            el('span', { 'class': 'studio-step-n', html: done ? icon('check', 14) : String(n) }),
            el('span', { 'class': 'studio-step-lbl', text: t(STEP_LABELS[n - 1]) })
          ]));
        }(i));
      }
    });
    /* the bar measures decisions made, not chips walked past */
    pct = Math.max(4, Math.round(doneCount() / JOURNEY * 100));
    if (refs.progress && refs.progress.firstChild) {
      try { refs.progress.firstChild.style.setProperty('inline-size', pct + '%'); }
      catch (e) { refs.progress.firstChild.style.width = pct + '%'; }
    }
    if (refs.progressNote) {
      refs.progressNote.textContent = progressText();
      refs.progressNote.setAttribute('data-full', doneCount() >= JOURNEY ? '1' : '0');
    }
    revealStep();
    noteCompletions();
  }

  /* On a narrow screen the six chips overflow the strip, and the browser's
     resting scroll position leaves the later ones outside it — clipped off the
     end in LTR, off the start in RTL, which is why the RTL strip cut the label
     in half from step 4 on. Centre the active chip when it is not fully in
     view. Two details matter: the move is expressed as a delta, because
     `scrollLeft` counts rightwards in every engine but its origin differs
     between them (0..max vs -max..0), and it has to clear half a chip, because
     `scroll-snap-type: proximity` drags any smaller nudge straight back. */
  function revealStep() {
    var host = refs.steps, btn, hr, br, delta;
    if (!host || typeof host.getBoundingClientRect !== 'function') return;
    btn = host.querySelector ? host.querySelector('.studio-step-btn.is-on') : null;
    if (!btn) return;
    try {
      hr = host.getBoundingClientRect();
      br = btn.getBoundingClientRect();
      if (!hr.width || !br.width) return;                    /* not laid out yet */
      if (br.left >= hr.left - 1 && br.right <= hr.right + 1) return;
      delta = (br.left + br.width / 2) - (hr.left + hr.width / 2);
      host.scrollLeft += delta;
    } catch (e) { /* a detached strip must never break the wizard */ }
  }

  function totalNow() {
    var res;
    if (!SN.Checkout || !SN.Checkout.priceCustom) return null;
    res = SN.Checkout.priceCustom(state.design);
    return res ? res.total : null;
  }

  function renderBar() {
    var host = refs.bar, total;
    if (!host) return;
    keepFocus(host, function () {
      empty(host);
      total = totalNow();
      host.appendChild(el('div', { 'class': 'studio-bar-in wrap' }, [
        el('button', {
          'class': 'btn btn-ghost', type: 'button', 'data-fk': 'bar-back',
          disabled: state.step <= 1,
          text: t('common.back'),
          on: { click: function () { setStep(state.step - 1); } }
        }),
        el('div', { 'class': 'studio-bar-mid' }, [
          el('b', { text: t(STEP_LABELS[state.step - 1]) }),
          el('span', {
            text: total === null
              ? t('studio.stepOf', { n: nfm(state.step), total: nfm(STEP_COUNT) })
              : t('studio.estimate') + ': ' + money(total)
          })
        ]),
        state.step >= STEP_COUNT
          ? el('button', {
            'class': 'btn btn-pri', type: 'button', 'data-fk': 'bar-confirm',
            text: t('studio.confirm'),
            on: { click: openCheckout }
          })
          : el('button', {
            'class': 'btn btn-pri', type: 'button', 'data-fk': 'bar-next',
            text: t('common.next'),
            on: { click: function () { setStep(state.step + 1); } }
          })
      ]));
    });
  }

  function renderStep() {
    var host = refs.step;
    if (!host) return;
    refs.sizeGrid = null;
    refs.selBar = refs.tools = refs.panel = refs.actions = refs.editor = refs.charmList = null;
    keepFocus(host, function () {
      empty(host);
      try {
        if (state.step === 1) buildStep1(host);
        else if (state.step === 2) buildStep2(host);
        else if (state.step === 3) buildStep3(host);
        else if (state.step === 4) buildStep4(host);
        else if (state.step === 5) buildStep5(host);
        else buildStep6(host);
      } catch (e) {
        console.warn('[SN.Studio] step render failed', e);
        empty(host);
        host.appendChild(el('p', { 'class': 'note note-err', text: t('common.error') }));
      }
    });
    if (SN.I18n && SN.I18n.apply) SN.I18n.apply(host);
  }

  function renderAll() {
    renderSteps();
    renderStage();
    renderStep();
    renderBar();
  }

  /* a design change: save, repaint the preview and whatever the step shows */
  function refresh() {
    saveDraft();
    renderStage();
    if (state.step === 4) {
      renderSelBar();
      renderPanel();
      renderActions();
      renderEditor();
      renderCharmList();
    } else {
      renderStep();
    }
    renderBar();
  }

  function setStep(n, silent) {
    var next = clamp(Math.round(num(n, 1)), 1, STEP_COUNT);
    if (next > state.reached) state.reached = next;
    state.step = next;
    if (next === 4 && !state.sel.length) pruneSelection();
    if (!silent) writeHash();
    renderAll();
    scrollToTop();
  }

  function scrollToTop() {
    try {
      var target = refs.pane;
      if (!target) return;
      if (window.innerWidth > 900) return;
      var y = target.getBoundingClientRect().top + (window.pageYOffset || 0) - 70;
      if ((window.pageYOffset || 0) > y) window.scrollTo(0, Math.max(0, y));
    } catch (e) { /* ignore */ }
  }

  /* ====================================================================== */
  /* 17. Hash routing                                                       */
  /* ====================================================================== */

  function parseHash() {
    var raw = String(window.location.hash || '').replace(/^#/, '');
    var out = {}, pairs, i, kv;
    if (!raw) return out;
    pairs = raw.split('&');
    for (i = 0; i < pairs.length; i++) {
      kv = pairs[i].split('=');
      if (kv.length >= 2) out[kv[0]] = kv.slice(1).join('=');
      else if (kv[0]) out[kv[0]] = '';
    }
    return out;
  }

  function writeHash() {
    var value = '#step=' + state.step;
    if (String(window.location.hash || '') === value) return;
    hashLock = true;
    try { window.location.hash = value; }
    catch (e) { /* ignore */ }
    window.setTimeout(function () { hashLock = false; }, 0);
  }

  function replaceHash(value) {
    try {
      if (window.history && window.history.replaceState) {
        hashLock = true;
        window.history.replaceState(null, '', String(window.location.href).split('#')[0] + value);
        window.setTimeout(function () { hashLock = false; }, 0);
        return;
      }
    } catch (e) { /* ignore */ }
    hashLock = true;
    try { window.location.hash = value; } catch (e2) { /* ignore */ }
    window.setTimeout(function () { hashLock = false; }, 0);
  }

  function onHashChange() {
    var h;
    if (hashLock) return;
    h = parseHash();
    if (has(h, 'step')) {
      var n = clamp(Math.round(num(h.step, 1)), 1, STEP_COUNT);
      if (n !== state.step) {
        if (n > state.reached) state.reached = n;
        state.step = n;
        renderAll();
      }
      return;
    }
    if (has(h, 'd') || has(h, 'load')) {
      applyHashDesign(h);
      renderAll();
    }
  }

  function safeDecode(v) {
    try { return decodeURIComponent(String(v)); }
    catch (e) { return String(v); }
  }

  function applyHashDesign(h) {
    var text, data, item;
    if (has(h, 'load') && h.load) {
      item = findItem('designs', safeDecode(h.load));
      if (item && isObj(item.config)) {
        state.design = sanitize(item.config);
        pruneSelection();
        primeProgress();
        toast(t('studio.loadedReady'), 'ok');
        replaceHash('#step=1');
        return true;
      }
      return false;
    }
    if (has(h, 'd') && h.d) {
      text = b64urlDecode(h.d);
      if (!text) { toast(t('studio.badShared'), 'err'); replaceHash('#step=1'); return false; }
      try { data = JSON.parse(text); }
      catch (e) { data = null; }
      if (!isObj(data)) { toast(t('studio.badShared'), 'err'); replaceHash('#step=1'); return false; }
      state.design = sanitize(data);
      pruneSelection();
      primeProgress();
      toast(t('studio.loadedShared'), 'ok');
      replaceHash('#step=1');
      return true;
    }
    return false;
  }

  /* ====================================================================== */
  /* 18. Keyboard                                                           */
  /* ====================================================================== */

  function editable(node) {
    var tag;
    if (!node || !node.tagName) return false;
    tag = node.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    return !!node.isContentEditable;
  }

  function onKeyDown(ev) {
    var k = String(ev.key || '').toLowerCase();
    if (!(ev.ctrlKey || ev.metaKey)) return;
    if (editable(ev.target)) return;
    if (k === 'z' && !ev.shiftKey) { ev.preventDefault(); undo(); return; }
    if ((k === 'z' && ev.shiftKey) || k === 'y') { ev.preventDefault(); redo(); }
  }

  /* ====================================================================== */
  /* 19. Boot                                                               */
  /* ====================================================================== */

  function grabRefs() {
    refs.restore = D.getElementById('studio-restore');
    refs.steps = D.getElementById('studio-steps');
    refs.stage = D.getElementById('studio-stage');
    refs.paneFoot = D.getElementById('studio-pane-foot');
    refs.pane = D.getElementById('studio-pane');
    refs.step = D.getElementById('studio-step');
    refs.bar = D.getElementById('studio-bar');
    refs.eyebrow = D.getElementById('studio-eyebrow');
  }

  function mountProgress() {
    var host = refs.steps;
    if (!host || !host.parentNode) return;
    refs.progress = el('div', { 'class': 'studio-progress' }, [el('i', {})]);
    /* the journey read out in words — "one step to go" does more for finishing
       than a bar ever does. aria-live so it is spoken as it changes. */
    refs.progressNote = el('p', {
      'class': 'studio-pane-note',
      aria: { live: 'polite' },
      style: { marginBlockStart: '7px', marginBlockEnd: '0' },
      text: progressText()
    });
    host.parentNode.insertBefore(refs.progress, host.nextSibling);
    refs.progress.parentNode.insertBefore(refs.progressNote, refs.progress.nextSibling);
  }

  function init() {
    var h, loaded = false, draft;

    if (state.booted) return;
    state.booted = true;

    if (!SN.UI || !SN.Nail || !SN.Store) {
      console.warn('[SN.Studio] core modules are missing — the studio cannot start.');
      return;
    }

    grabRefs();
    if (SN.UI.boot) SN.UI.boot('studio');
    saveDraft = SN.UI.debounce ? SN.UI.debounce(writeDraft, 400) : writeDraft;

    state.design = sanitize(blank());
    state.sel = activeKeys(state.design);

    h = parseHash();
    loaded = applyHashDesign(h);

    if (!loaded) {
      draft = readDraft();
      /* only offer a restore when the draft is actually different from a
         pristine start — otherwise every visit opens with a pointless bar */
      if (draft && !sameDesign(draft, state.design)) showRestore(draft);
    }

    if (has(h, 'step')) {
      state.step = clamp(Math.round(num(h.step, 1)), 1, STEP_COUNT);
      state.reached = state.step;
    } else if (!loaded) {
      writeHash();
    }

    if (refs.eyebrow) {
      refs.eyebrow.appendChild(el('span', { html: icon('brush', 16), 'aria-hidden': 'true' }));
      refs.eyebrow.appendChild(el('span', { text: t('studio.eyebrow') }));
    }

    primeProgress();
    mountProgress();
    renderAll();

    if (SN.I18n && SN.I18n.apply) SN.I18n.apply(D);
    if (SN.I18n && SN.I18n.onChange) {
      SN.I18n.onChange(function () {
        if (refs.eyebrow) {
          empty(refs.eyebrow);
          refs.eyebrow.appendChild(el('span', { html: icon('brush', 16), 'aria-hidden': 'true' }));
          refs.eyebrow.appendChild(el('span', { text: t('studio.eyebrow') }));
        }
        renderAll();
      });
    }
    if (SN.Store && SN.Store.subscribe) {
      SN.Store.subscribe(SN.UI.debounce ? SN.UI.debounce(function () {
        pristine = null;                 /* the owner may have edited defaults */
        state.design = sanitize(state.design);
        pruneSelection();
        renderAll();
      }, 200) : function () { pristine = null; renderAll(); });
    }

    window.addEventListener('hashchange', onHashChange, false);
    D.addEventListener('keydown', onKeyDown, false);
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init, false);
  else init();

  /* ====================================================================== */
  /* 20. Public surface (one property, per SPEC section 1)                  */
  /* ====================================================================== */

  SN.Studio = {
    init: init,
    design: function () { return clone(state.design); },
    load: function (cfg) {
      state.design = sanitize(cfg);
      hist.past.length = 0;
      hist.future.length = 0;
      pruneSelection();
      primeProgress();
      saveDraft();
      renderAll();
      return clone(state.design);
    },
    step: function (n) {
      if (n === undefined) return state.step;
      setStep(n);
      return state.step;
    },
    shareUrl: shareUrl,
    encode: b64urlEncode,
    decode: b64urlDecode,
    sanitize: sanitize
  };
})();
