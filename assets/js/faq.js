/*! Shosh Nail — assets/js/faq.js
 *  SN.Faq : help centre + contact page (owner: FAQ)
 *  Contract: SPEC.md sections 4, 10, 11, 13. Attaches exactly one
 *  property: window.SN.Faq
 *
 *  What lives here, in render order:
 *    hero with a live search that matches BOTH languages at once (so an
 *    English word finds an Arabic answer) and highlights the hit ·
 *    category tabs built from faqCats with a live per-category count ·
 *    an aria accordion, one panel open at a time, deep-linkable by #id,
 *    with a copy-link and an "ask about this" shortcut per question ·
 *    a numbered application guide parsed out of the `install` answers ·
 *    a contact card assembled row by row from settings (an empty setting
 *    never renders a broken link) · an enquiry box that composes a
 *    WhatsApp message and optionally posts to settings.notifyEndpoint.
 *
 *  Everything reads live from SN.Store, so an owner edit in admin.html
 *  shows up here the moment it is saved.
 */
(function () {
  'use strict';

  var SN = (window.SN = window.SN || {});

  /* ==================================================================== */
  /* 0. dictionary — namespace `faq` (SPEC section 10)                     */
  /* ==================================================================== */

  var DICT = {
    ar: {
      faq: {
        /* hero */
        eyebrow: 'مركز المساعدة',
        title: 'أسئلتك وكل الإجابات',
        lead: 'جمعنا لك كل اللي تسأل عنه العميلات: التركيب، مدة الثبات، الإزالة، المقاسات، الشحن والدفع. اكتبي كلمة وحدة في البحث وتطلع لك الإجابة على طول، وإذا ما لقيتي جوابك راسلينا وبنرد عليك بأنفسنا.',
        searchLabel: 'البحث في الأسئلة',
        searchPh: 'اكتبي كلمة… مثل: ثبات، إزالة، مقاس، شحن',
        clearSearch: 'مسح كلمة البحث',
        jumpLabel: 'روابط سريعة داخل الصفحة',
        jumpGuide: 'التركيب خطوة بخطوة',
        jumpContact: 'بطاقة التواصل',
        jumpAsk: 'أرسلي استفسارك',

        /* list + tabs */
        catsLabel: 'تصفية الأسئلة حسب القسم',
        all: 'الكل',
        resultsN: '{n} من {total} سؤال',
        resultsQ: '{n} نتيجة للبحث عن «{q}»',
        noneT: 'ما لقينا سؤال بهذي الكلمة',
        noneX: 'جرّبي كلمة أقصر، أو افتحي قسم «الكل»، أو أرسلي لنا سؤالك مباشرة من البطاقة تحت وبنجاوبك.',
        clearAll: 'مسح البحث والتصفية',
        copyLink: 'نسخ الرابط',
        linkCopied: 'انتسخ رابط السؤال',
        copyFail: 'ما قدرنا ننسخ الرابط — انسخيه من شريط العنوان',
        askAbout: 'اسألي عن هذي النقطة',
        aboutQ: 'بخصوص: {q}',

        /* guide */
        guideEyebrow: 'دليل عملي',
        guideTitle: 'طريقة التركيب خطوة بخطوة',
        guideLead: 'عشر دقائق وبس. اتبعي الترتيب زي ما هو ولا تتخطين خطوة التنظيف — هي الفرق بين طقم يثبت يومين وطقم يثبت أسبوعين.',
        guideTime: 'الوقت المتوقع: 10 دقائق',
        stepN: 'الخطوة {n}',
        guideFull: 'اقرئي الشرح كامل',
        moreTitle: 'أسئلة ثانية عن التركيب',

        tipsTitle: 'نصائح للثبات',
        tip1T: 'البرد الخفيف أولاً',
        tip1X: 'شيلي لمعة سطح الظفر ببرد خفيف قبل أي شي؛ هذي أهم خطوة وأكثر وحدة تُنسى.',
        tip2T: 'مسحة كحول قبل اللاصق',
        tip2X: 'الكحول يشيل الزيوت وبقايا الكريم، واللاصق يمسك على سطح نظيف تمامًا.',
        tip3T: 'اضغطي 20 ثانية',
        tip3X: 'ضغط ثابت بدون تحريك على كل ظفر، ولا تركّبين ظفرين بنفس الوقت.',
        tip4T: 'أول ساعة بدون ماء',
        tip4X: 'خلي يديك جافة أول ساعة عشان اللاصق يتماسك، وبعدها عيشي يومك عادي.',

        removeTitle: 'طريقة الإزالة',
        removeX: 'انقعي يديك في ماء دافئ مع قطرات صابون أو زيت من 10 إلى 15 دقيقة، وبعدها ارفعي كل ظفر بلطف من الطرف بعود الجلد الخشبي. إذا حسّيتي بأي شد، ارجعي انقعي أكثر — الشد بالقوة هو السبب الوحيد تقريبًا لتقشّر الظفر الطبيعي.',
        removeMore: 'التفاصيل كاملة',

        /* contact card */
        contactEyebrow: 'تواصل مباشر',
        contactTitle: 'بطاقة التواصل',
        contactLead: 'ما فيه رد آلي — رسالتك توصلنا شخصيًا، وعادة نرد خلال ساعة داخل أوقات الرد.',
        cardTitle: 'كلّمينا على طول',
        cardX: 'اختاري القناة اللي تريحك، كلها توصل لنا مباشرة وإحنا نرد بأنفسنا.',
        waBtn: 'راسلينا على واتساب',
        waMsg: 'هلا شوش نيل، عندي استفسار بخصوص الأظافر المركّبة.',
        callT: 'اتصال مباشر',
        mailT: 'البريد الإلكتروني',
        igT: 'انستقرام',
        scT: 'سناب شات',
        ttT: 'تيك توك',
        hoursT: 'أوقات الرد',
        cityT: 'نشحن من',
        noChannels: 'قنوات التواصل تُضاف من لوحة التحكم.',

        /* ask box */
        askTitle: 'أرسلي استفسارك',
        askLead: 'اكتبي سؤالك هنا ونجهّزه لك جاهز في رسالة، بدون تسجيل ولا انتظار.',
        askName: 'اسمك',
        askNamePh: 'مثلاً: نورة',
        askCat: 'موضوع الاستفسار',
        askQ: 'سؤالك',
        askQPh: 'اكتبي سؤالك بالتفصيل، وإذا كان عن طلب سابق اذكري رقم الطلب.',
        askSend: 'إرسال على واتساب',
        askSendMail: 'إرسال بالبريد',
        askSendOnly: 'إرسال الاستفسار',
        askErrName: 'اكتبي اسمك عشان نعرف كيف نناديك',
        askErrQ: 'وضّحي سؤالك شوي أكثر (10 أحرف على الأقل)',
        askNote: 'الرسالة تنفتح لك جاهزة في واتساب وأنتِ ترسلينها — ما نحفظ بياناتك في الموقع.',
        askNoteMail: 'الرسالة تنفتح لك جاهزة في برنامج البريد عندك.',
        askNoteSend: 'استفسارك يوصل مباشرة لفريق شوش نيل.',
        askNoteNone: 'قنوات التواصل غير مفعّلة حاليًا — تُضاف من لوحة التحكم.',
        askOkWa: 'جهّزنا رسالتك، اضغطي إرسال داخل واتساب',
        askOkMail: 'جهّزنا رسالتك في برنامج البريد عندك',
        askOkSent: 'وصلنا استفسارك، وبنرد عليك قريب',
        askIntro: 'استفسار من موقع شوش نيل',
        askLblName: 'الاسم',
        askLblCat: 'الموضوع',
        askLblQ: 'السؤال',
        askSubject: 'استفسار جديد من صفحة الأسئلة',
        catOther: 'موضوع آخر'
      }
    },

    en: {
      faq: {
        eyebrow: 'Help centre',
        title: 'Your questions, answered',
        lead: 'Everything customers ask us: applying the set, how long it lasts, removal, sizing, shipping and payment. Type one word in the search and the answer comes straight up — and if it is not here, message us and we will reply ourselves.',
        searchLabel: 'Search the questions',
        searchPh: 'Try a word — wear time, removal, size, shipping',
        clearSearch: 'Clear the search',
        jumpLabel: 'Quick links on this page',
        jumpGuide: 'Step-by-step application',
        jumpContact: 'Contact card',
        jumpAsk: 'Send us a question',

        catsLabel: 'Filter questions by section',
        all: 'All',
        resultsN: '{n} of {total} questions',
        resultsQ: '{n} results for “{q}”',
        noneT: 'Nothing matches that word',
        noneX: 'Try a shorter word, switch back to “All”, or send us the question directly from the card below and we will answer it.',
        clearAll: 'Clear search and filter',
        copyLink: 'Copy link',
        linkCopied: 'Link to this question copied',
        copyFail: 'We could not copy the link — copy it from the address bar',
        askAbout: 'Ask about this',
        aboutQ: 'About: {q}',

        guideEyebrow: 'Practical guide',
        guideTitle: 'How to apply, step by step',
        guideLead: 'Ten minutes, start to finish. Keep the order as it is and never skip the prep step — it is the difference between two days of wear and two weeks.',
        guideTime: 'Takes about 10 minutes',
        stepN: 'Step {n}',
        guideFull: 'Read the full answer',
        moreTitle: 'More on applying',

        tipsTitle: 'Make it last',
        tip1T: 'Buff first, always',
        tip1X: 'Take the shine off the nail plate with a light buff before anything else. It is the step people skip, and the one that matters most.',
        tip2T: 'Alcohol before adhesive',
        tip2X: 'The alcohol pad lifts oils and leftover hand cream so the adhesive grips a genuinely clean surface.',
        tip3T: 'Hold for 20 seconds',
        tip3X: 'Steady pressure on one nail at a time, with no wiggling — never press two nails at once.',
        tip4T: 'No water for an hour',
        tip4X: 'Keep your hands dry for the first hour while the adhesive cures, then carry on with your day.',

        removeTitle: 'How to remove them',
        removeX: 'Soak your hands in warm water with a few drops of soap or oil for 10 to 15 minutes, then ease each nail up from the free edge with the wooden stick. If you feel any pulling, soak for longer — forcing them off is almost the only way people damage a natural nail.',
        removeMore: 'Read the full answer',

        contactEyebrow: 'Talk to us',
        contactTitle: 'Contact card',
        contactLead: 'No bots and no ticket queue — your message reaches us personally, and we usually reply within the hour while we are answering.',
        cardTitle: 'Reach us directly',
        cardX: 'Pick whichever channel suits you — they all reach us directly, and we answer in person.',
        waBtn: 'Message us on WhatsApp',
        callT: 'Call us',
        mailT: 'Email',
        igT: 'Instagram',
        scT: 'Snapchat',
        ttT: 'TikTok',
        hoursT: 'When we reply',
        cityT: 'We ship from',
        waMsg: 'Hi Shosh Nail, I have a question about your press-on sets.',
        noChannels: 'Contact channels are added from the admin panel.',

        askTitle: 'Send us a question',
        askLead: 'Write your question here and we will have the message ready to send — no sign-up, no waiting.',
        askName: 'Your name',
        askNamePh: 'e.g. Noura',
        askCat: 'What is it about?',
        askQ: 'Your question',
        askQPh: 'Give us the details, and if it is about an existing order please add the order number.',
        askSend: 'Send on WhatsApp',
        askSendMail: 'Send by email',
        askSendOnly: 'Send question',
        askErrName: 'Add your name so we know who we are talking to',
        askErrQ: 'Tell us a little more (at least 10 characters)',
        askNote: 'The message opens ready in WhatsApp for you to send — nothing is stored on this site.',
        askNoteMail: 'The message opens ready in your email app.',
        askNoteSend: 'Your question goes straight to the Shosh Nail team.',
        askNoteNone: 'No contact channel is set up yet — they are added from the admin panel.',
        askOkWa: 'Your message is ready, hit send inside WhatsApp',
        askOkMail: 'Your message is ready in your email app',
        askOkSent: 'We have your question and will get back to you shortly',
        askIntro: 'Question from the Shosh Nail website',
        askLblName: 'Name',
        askLblCat: 'Topic',
        askLblQ: 'Question',
        askSubject: 'New question from the FAQ page',
        catOther: 'Something else'
      }
    }
  };

  if (SN.I18n && typeof SN.I18n.extend === 'function') SN.I18n.extend(DICT);

  /* ==================================================================== */
  /* 1. tiny private helpers (nothing here is exported)                    */
  /* ==================================================================== */

  var ALL = '__all__';
  var OTHER = '__other__';
  var STEP_ICONS = ['hand', 'brush', 'sparkle', 'shield', 'grid', 'gem', 'clock', 'check', 'heart', 'star'];
  var TIP_ICONS = ['brush', 'shield', 'clock', 'hand'];

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function str(v) { return v === null || v === undefined ? '' : String(v); }
  function trim(v) { return str(v).replace(/^\s+|\s+$/g, ''); }

  function t(key, vars) {
    if (SN.I18n && typeof SN.I18n.t === 'function') return SN.I18n.t(key, vars);
    return str(key);
  }
  function pick(tobj) {
    if (SN.I18n && typeof SN.I18n.pick === 'function') return SN.I18n.pick(tobj);
    if (typeof tobj === 'string') return tobj;
    return isObj(tobj) ? str(tobj.ar || tobj.en) : '';
  }
  function numf(n) {
    if (SN.I18n && typeof SN.I18n.num === 'function') return SN.I18n.num(n);
    return str(n);
  }

  function el(tag, attrs, kids) {
    if (SN.UI && typeof SN.UI.el === 'function') return SN.UI.el(tag, attrs, kids);
    return document.createElement(tag || 'div');   /* never reached: ui.js loads first */
  }
  function icon(name, size) {
    if (SN.UI && typeof SN.UI.icon === 'function') return SN.UI.icon(name, size);
    return '';
  }
  function toast(text, kind) {
    if (SN.UI && typeof SN.UI.toast === 'function') SN.UI.toast(text, kind);
  }
  function debounce(fn, ms) {
    if (SN.UI && typeof SN.UI.debounce === 'function') return SN.UI.debounce(fn, ms);
    return fn;
  }

  function sget(path, fallback) {
    try {
      if (SN.Store && typeof SN.Store.get === 'function') return SN.Store.get(path, fallback);
    } catch (e) { /* store not ready */ }
    return fallback;
  }
  function slist(key) {
    var v;
    try {
      if (SN.Store && typeof SN.Store.list === 'function') v = SN.Store.list(key);
    } catch (e) { v = null; }
    return Array.isArray(v) ? v : [];
  }

  function byId(id) { return document.getElementById(id); }
  function show(node, on) {
    if (!node) return;
    if (on) node.removeAttribute('hidden');
    else node.setAttribute('hidden', '');
  }
  function clear(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }
  function esc(s) {
    return str(s).replace(/[&<>"']/g, function (c) {
      if (c === '&') return '&amp;';
      if (c === '<') return '&lt;';
      if (c === '>') return '&gt;';
      if (c === '"') return '&quot;';
      return '&#39;';
    });
  }
  function reduced() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  /* ------------------------------------------------------- normalisation
     Search must ignore tashkeel, alef/ya/ta-marbuta spelling and letter
     case, yet the highlight has to land on the ORIGINAL characters — so
     every normalised character keeps a map back to its source index. */
  var DROP = /[ً-ٰٕـۖ-ۜ]/;

  function normChar(c) {
    if (DROP.test(c)) return '';
    if (c === 'أ' || c === 'إ' || c === 'آ' || c === 'ٱ') return 'ا';
    if (c === 'ى') return 'ي';
    if (c === 'ئ') return 'ي';
    if (c === 'ة') return 'ه';
    if (c === 'ؤ') return 'و';
    if (c >= '٠' && c <= '٩') return String.fromCharCode(c.charCodeAt(0) - 0x0660 + 48);
    if (c >= '۰' && c <= '۹') return String.fromCharCode(c.charCodeAt(0) - 0x06F0 + 48);
    return c.toLowerCase();
  }

  function normalize(s) {
    var v = str(s), out = '', i;
    for (i = 0; i < v.length; i++) out += normChar(v.charAt(i));
    return out;
  }

  function normIndexed(s) {
    var v = str(s), out = '', map = [], i, j, n;
    for (i = 0; i < v.length; i++) {
      n = normChar(v.charAt(i));
      for (j = 0; j < n.length; j++) { out += n.charAt(j); map.push(i); }
    }
    map.push(v.length);
    return { n: out, map: map };
  }

  /* escaped HTML with every occurrence of `q` wrapped in <mark> */
  function hl(text, q) {
    var src = str(text);
    var needle = normalize(q);
    var ix, out = '', pos = 0, from = 0, at, s0, e0;
    if (!needle) return esc(src);
    ix = normIndexed(src);
    while ((at = ix.n.indexOf(needle, from)) !== -1) {
      s0 = ix.map[at];
      e0 = ix.map[at + needle.length];
      if (s0 === undefined) break;
      if (e0 === undefined) e0 = src.length;
      if (s0 > pos) out += esc(src.slice(pos, s0));
      if (e0 > s0 && e0 > pos) {
        out += '<mark class="faq-hl">' + esc(src.slice(Math.max(pos, s0), e0)) + '</mark>';
        pos = e0;
      }
      from = at + needle.length;
    }
    out += esc(src.slice(pos));
    return out;
  }

  /* ==================================================================== */
  /* 2. data access                                                        */
  /* ==================================================================== */

  var HAY = {};   /* id -> {src, n} search haystack cache */

  function faqList() { return slist('faq'); }
  function catList() { return slist('faqCats'); }

  function catOf(id) {
    var list = catList(), i;
    for (i = 0; i < list.length; i++) {
      if (isObj(list[i]) && str(list[i].id) === str(id)) return list[i];
    }
    return null;
  }
  function catName(id) {
    var c = catOf(id);
    return c ? pick(c.name) : '';
  }

  function both(o) {
    if (isObj(o)) return str(o.ar) + ' ' + str(o.en);
    return str(o);
  }

  /* Both languages go in the haystack, so an English word finds an Arabic
     answer. The category name is in there too: Arabic inflection means
     "إزالة" never appears literally inside "كيف أزيلها…", and matching the
     section is how that question gets found at all. Whenever the hit comes
     from the section, the section badge is the thing that lights up — see
     itemNode() — so a row is never in the list without saying why. */
  function haystack(it) {
    var id = str(it.id);
    var c = catOf(it.cat);
    var src = both(it.q) + '\n' + both(it.a) + '\n' + id + '\n' + (c ? both(c.name) : str(it.cat));
    var hit = HAY[id];
    if (hit && hit.src === src) return hit.n;
    hit = { src: src, n: normalize(src) };
    HAY[id] = hit;
    return hit.n;
  }

  function findFaq(id) {
    var list = faqList(), i, want = str(id);
    if (!want) return null;
    for (i = 0; i < list.length; i++) {
      if (isObj(list[i]) && str(list[i].id) === want) return list[i];
    }
    return null;
  }

  function byCat(cat) {
    var list = faqList(), out = [], i;
    for (i = 0; i < list.length; i++) {
      if (isObj(list[i]) && list[i].id && str(list[i].cat) === str(cat)) out.push(list[i]);
    }
    return out;
  }

  /* search-only pass (drives both the list and the per-category counts) */
  function searched() {
    var list = faqList(), q = normalize(st.q), out = [], i, it;
    for (i = 0; i < list.length; i++) {
      it = list[i];
      if (!isObj(it) || !it.id) continue;
      if (q && haystack(it).indexOf(q) === -1) continue;
      out.push(it);
    }
    return out;
  }

  function filtered() {
    var base = searched(), out = [], i;
    if (st.cat === ALL) return base;
    for (i = 0; i < base.length; i++) {
      if (str(base[i].cat) === st.cat) out.push(base[i]);
    }
    return out;
  }

  /* ==================================================================== */
  /* 3. text shaping                                                       */
  /* ==================================================================== */

  /* ")", "." and ":" can never sit inside a number, so they need no space
     after them; a dash does — otherwise "15–20 seconds" reads as item 15. */
  var NUM_LINE = /^\s*(\d{1,2})\s*(?:[)\.:]\s*|[-–—]\s+)(.+)$/;

  function lines(text) {
    return str(text).split(/\r?\n/);
  }

  function numberedLines(text) {
    var ls = lines(text), out = [], i, m;
    for (i = 0; i < ls.length; i++) {
      m = NUM_LINE.exec(ls[i]);
      if (m) out.push(trim(m[2]));
    }
    return out;
  }

  /* an answer becomes <p> blocks, with any numbered run promoted to <ol> */
  function answerHtml(text, q) {
    var ls = lines(text), out = '', buf = [], i, ln, m;

    function flush() {
      var k;
      if (!buf.length) return;
      out += '<ol class="faq-ol">';
      for (k = 0; k < buf.length; k++) out += '<li>' + buf[k] + '</li>';
      out += '</ol>';
      buf = [];
    }

    for (i = 0; i < ls.length; i++) {
      ln = trim(ls[i]);
      if (!ln) continue;
      m = NUM_LINE.exec(ln);
      if (m) { buf.push(hl(trim(m[2]), q)); continue; }
      flush();
      out += '<p>' + hl(ln, q) + '</p>';
    }
    flush();
    if (!out) out = '<p>' + hl(str(text), q) + '</p>';
    return out;
  }

  function clip(s, n) {
    var v = trim(s), cut;
    if (v.length <= n) return v;
    cut = v.slice(0, n);
    cut = cut.replace(/\s+\S*$/, '');
    return (cut || v.slice(0, n)) + '…';
  }

  function stripQ(s) { return trim(s).replace(/[?؟]\s*$/, ''); }

  function firstSentence(s) {
    var v = trim(lines(s)[0]);
    var m = /^([\s\S]{18,150}?[\.!؟?])(\s|$)/.exec(v);
    return m ? trim(m[1]) : clip(v, 150);
  }

  /* "buff the surface, this is the secret" -> {t:'buff the surface', x:'this is the secret'} */
  function splitStep(s) {
    var v = trim(s), at = v.search(/[،,—]/);
    if (at > 8 && at < 64) {
      return { t: trim(v.slice(0, at)), x: trim(v.slice(at + 1)) };
    }
    return { t: clip(v, 110), x: '' };
  }

  /* ==================================================================== */
  /* 4. state + dom                                                        */
  /* ==================================================================== */

  var st = { q: '', cat: ALL, open: '' };
  var dom = {};
  var inited = false;
  var guideSrc = '';        /* id of the faq item the numbered guide came from */

  function cacheDom() {
    dom.main = byId('main');
    dom.q = byId('faq-q');
    dom.qClear = byId('faq-q-clear');
    dom.searchIco = byId('faq-search-ico');
    dom.jump = byId('faq-jump');
    dom.tabs = byId('faq-tabs');
    dom.count = byId('faq-count');
    dom.list = byId('faq-list');
    dom.empty = byId('faq-empty');
    dom.emptyIco = byId('faq-empty-ico');
    dom.reset = byId('faq-reset');
    dom.steps = byId('faq-steps');
    dom.guideFoot = byId('faq-guide-foot');
    dom.tips = byId('faq-tips');
    dom.remove = byId('faq-remove');
    dom.more = byId('faq-more');
    dom.moreChips = byId('faq-more-chips');
    dom.card = byId('faq-card');
    dom.ask = byId('faq-ask');
    dom.askIco = byId('faq-ask-ico');
    dom.askForm = byId('faq-ask-form');
    dom.askName = byId('faq-ask-name');
    dom.askNameErr = byId('faq-ask-name-err');
    dom.askCat = byId('faq-ask-cat');
    dom.askQ = byId('faq-ask-q');
    dom.askQErr = byId('faq-ask-q-err');
    dom.askSend = byId('faq-ask-send');
    dom.askNote = byId('faq-ask-note');
  }

  function scrollTo(node) {
    if (!node) return;
    try {
      node.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    } catch (e) {
      try { node.scrollIntoView(true); }
      catch (e2) { /* ancient engine — leave the page where it is */ }
    }
  }
  function focusSoft(node) {
    if (!node || typeof node.focus !== 'function') return;
    try { node.focus({ preventScroll: true }); }
    catch (e) {
      try { node.focus(); }
      catch (e2) { /* ignore */ }
    }
  }

  /* ==================================================================== */
  /* 5. tabs + question list                                               */
  /* ==================================================================== */

  function renderTabs() {
    var base, cats = catList(), counts = {}, i, c, id, n, total;
    if (!dom.tabs) return;

    /* the owner may have deleted the category we are sitting on */
    if (st.cat !== ALL && !catOf(st.cat)) st.cat = ALL;

    base = searched();
    clear(dom.tabs);

    total = base.length;
    for (i = 0; i < base.length; i++) {
      id = str(base[i].cat);
      counts[id] = (counts[id] || 0) + 1;
    }

    dom.tabs.appendChild(tabBtn(ALL, t('faq.all'), total));
    for (i = 0; i < cats.length; i++) {
      c = cats[i];
      if (!isObj(c) || !c.id) continue;
      id = str(c.id);
      n = counts[id] || 0;
      dom.tabs.appendChild(tabBtn(id, pick(c.name) || id, n));
    }
  }

  function tabBtn(id, label, n) {
    var on = st.cat === id;
    return el('button', {
      'class': 'tab' + (on ? ' is-on' : '') + (!on && !n ? ' faq-tab-dim' : ''),
      type: 'button',
      'data-cat': id,
      'aria-pressed': on ? 'true' : 'false',
      on: {
        click: function () {
          if (st.cat === id) return;
          st.cat = id;
          render();
        }
      }
    }, [
      el('span', { text: label }),
      el('span', { 'class': 'tab-n', text: numf(n) })
    ]);
  }

  function renderCount() {
    var shown = filtered().length, total = faqList().length;
    if (!dom.count) return;
    if (st.q) dom.count.textContent = t('faq.resultsQ', { n: numf(shown), q: st.q });
    else dom.count.textContent = t('faq.resultsN', { n: numf(shown), total: numf(total) });
  }

  function itemNode(it) {
    var id = str(it.id);
    var pid = 'faq-p-' + id;
    var bid = 'faq-b-' + id;
    var open = st.open === id;
    var cname = catName(it.cat);
    var head, body, foot;

    head = el('button', {
      'class': 'acc-head',
      type: 'button',
      id: bid,
      'aria-expanded': open ? 'true' : 'false',
      'aria-controls': pid,
      on: { click: function () { toggleItem(id); } }
    }, [
      el('span', { 'class': 'faq-q-t', html: hl(pick(it.q), st.q) }),
      /* the section badge only earns its place while every section is shown */
      (cname && st.cat === ALL) ? el('span', { 'class': 'faq-q-n', html: hl(cname, st.q) }) : null,
      el('span', { 'class': 'faq-chev', html: icon('chevron', 18) })
    ]);

    foot = el('div', { 'class': 'faq-a-foot' }, [
      cname ? el('span', { 'class': 'pill pill-rose faq-a-cat', html: hl(cname, st.q) }) : null,
      el('button', {
        'class': 'btn btn-ghost btn-sm',
        type: 'button',
        on: { click: function () { copyLink(id); } }
      }, [
        el('span', { html: icon('copy', 16) }),
        el('span', { text: t('faq.copyLink') })
      ]),
      el('button', {
        'class': 'btn btn-line btn-sm',
        type: 'button',
        on: { click: function () { askAbout(it); } }
      }, [
        el('span', { html: icon('whatsapp', 16) }),
        el('span', { text: t('faq.askAbout') })
      ])
    ]);

    body = el('div', {
      'class': 'acc-body',
      id: pid,
      role: 'region',
      'aria-labelledby': bid
    }, [
      el('div', { 'class': 'acc-in' }, [
        el('div', { 'class': 'faq-a', html: answerHtml(pick(it.a), st.q) }),
        foot
      ])
    ]);

    return el('div', {
      'class': 'acc-item faq-item' + (open ? ' is-open' : ''),
      id: id,
      'data-id': id
    }, [
      el('h3', { 'class': 'faq-q' }, [head]),
      body
    ]);
  }

  function renderList() {
    var items = filtered(), i;
    if (!dom.list) return;
    clear(dom.list);
    for (i = 0; i < items.length; i++) dom.list.appendChild(itemNode(items[i]));
    show(dom.list, items.length > 0);
    show(dom.empty, items.length === 0);
  }

  function itemNodeById(id) {
    var kids = dom.list ? dom.list.childNodes : null, i, k;
    if (!kids) return null;
    for (i = 0; i < kids.length; i++) {
      k = kids[i];
      if (k && k.getAttribute && k.getAttribute('data-id') === str(id)) return k;
    }
    return null;
  }

  function syncOpen() {
    var kids = dom.list ? dom.list.childNodes : null, i, k, on, btn;
    if (!kids) return;
    for (i = 0; i < kids.length; i++) {
      k = kids[i];
      if (!k || !k.getAttribute) continue;
      on = k.getAttribute('data-id') === st.open;
      if (k.classList) {
        if (on) k.classList.add('is-open');
        else k.classList.remove('is-open');
      }
      btn = k.querySelector ? k.querySelector('.acc-head') : null;
      if (btn) btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    }
  }

  function toggleItem(id) {
    st.open = st.open === str(id) ? '' : str(id);
    syncOpen();
  }

  /* open a question wherever it is: clears the filter first when needed */
  function reveal(id, moveFocus) {
    var want = str(id), node, btn;
    if (!findFaq(want)) return false;

    st.open = want;
    if (!itemNodeById(want)) {
      st.q = '';
      st.cat = ALL;
      if (dom.q) dom.q.value = '';
      show(dom.qClear, false);
      render();
    } else {
      syncOpen();
    }

    node = itemNodeById(want);
    if (!node) return false;
    scrollTo(node);
    if (moveFocus) {
      btn = node.querySelector ? node.querySelector('.acc-head') : null;
      if (btn) focusSoft(btn);
    }
    return true;
  }

  function pageLink(id) {
    var base = str(location.href).split('#')[0];
    return base + '#' + str(id);
  }

  function copyLink(id) {
    var url = pageLink(id);
    if (!SN.UI || typeof SN.UI.copy !== 'function') {
      toast(t('faq.copyFail'), 'err');
      return;
    }
    SN.UI.copy(url).then(function (ok) {
      toast(ok ? t('faq.linkCopied') : t('faq.copyFail'), ok ? 'ok' : 'err');
    }, function () {
      toast(t('faq.copyFail'), 'err');
    });
  }

  /* ==================================================================== */
  /* 6. the step-by-step guide                                             */
  /* ==================================================================== */

  function guideSteps() {
    var items = byCat('install'), best = null, i, ls, out, s;

    /* first choice: a genuinely numbered answer (data.js ships one) */
    for (i = 0; i < items.length; i++) {
      ls = numberedLines(pick(items[i].a));
      if (!best || ls.length > best.ls.length) best = { id: str(items[i].id), ls: ls };
    }
    if (best && best.ls.length >= 3) {
      out = [];
      for (i = 0; i < best.ls.length && i < 10; i++) {
        s = splitStep(best.ls[i]);
        s.id = best.id;
        out.push(s);
      }
      return { id: best.id, steps: out };
    }

    /* fallback: one card per install question */
    out = [];
    for (i = 0; i < items.length && out.length < 8; i++) {
      out.push({
        t: stripQ(pick(items[i].q)),
        x: firstSentence(pick(items[i].a)),
        id: str(items[i].id)
      });
    }
    return { id: '', steps: out };
  }

  function renderGuide() {
    var g = guideSteps(), i, s, rest, chips;

    guideSrc = g.id;

    if (dom.steps) {
      clear(dom.steps);
      for (i = 0; i < g.steps.length; i++) {
        s = g.steps[i];
        dom.steps.appendChild(el('li', { 'class': 'faq-step', 'data-n': String(i + 1) }, [
          el('span', { 'class': 'faq-step-ico', html: icon(STEP_ICONS[i % STEP_ICONS.length], 22) }),
          el('p', { 'class': 'faq-step-n', text: t('faq.stepN', { n: numf(i + 1) }) }),
          el('p', { 'class': 'faq-step-t', text: s.t }),
          s.x ? el('p', { 'class': 'faq-step-x', text: s.x }) : null
        ]));
      }
      show(dom.steps, g.steps.length > 0);
    }

    if (dom.guideFoot) {
      clear(dom.guideFoot);
      if (g.steps.length) {
        dom.guideFoot.appendChild(el('span', { 'class': 'pill pill-gold' }, [
          el('span', { html: icon('clock', 15) }),
          el('span', { text: t('faq.guideTime') })
        ]));
      }
      if (g.id) {
        dom.guideFoot.appendChild(el('button', {
          'class': 'btn btn-line btn-sm',
          type: 'button',
          on: { click: function () { reveal(g.id, true); } }
        }, [
          el('span', { text: t('faq.guideFull') }),
          el('span', { html: icon('arrow', 16) })
        ]));
      }
      show(dom.guideFoot, dom.guideFoot.childNodes.length > 0);
    }

    if (dom.tips) {
      clear(dom.tips);
      for (i = 1; i <= 4; i++) {
        dom.tips.appendChild(el('div', { 'class': 'faq-tip' }, [
          el('span', { html: icon(TIP_ICONS[i - 1], 20) }),
          el('div', {}, [
            el('p', { 'class': 'faq-tip-t', text: t('faq.tip' + i + 'T') }),
            el('p', { 'class': 'faq-tip-x', text: t('faq.tip' + i + 'X') })
          ])
        ]));
      }
    }

    renderRemoval();

    /* the install questions the numbered guide did not consume. With no
       numbered source the cards ARE the questions, so there is no remainder. */
    if (dom.more && dom.moreChips) {
      rest = guideSrc ? byCat('install') : [];
      chips = [];
      for (i = 0; i < rest.length; i++) {
        if (str(rest[i].id) === guideSrc) continue;
        chips.push(chipFor(rest[i]));
      }
      clear(dom.moreChips);
      for (i = 0; i < chips.length; i++) dom.moreChips.appendChild(chips[i]);
      show(dom.more, chips.length > 0);
    }
  }

  function chipFor(it) {
    var id = str(it.id);
    return el('button', {
      'class': 'chip',
      type: 'button',
      on: { click: function () { reveal(id, true); } }
    }, [el('span', { text: stripQ(pick(it.q)) })]);
  }

  /* the removal note prefers the real answer, falls back to our own copy */
  function removalItem() {
    var list = faqList(), i, it, hay, best = null;
    for (i = 0; i < list.length; i++) {
      it = list[i];
      if (!isObj(it) || !it.id) continue;
      hay = normalize(both(it.q));
      if (!/(ازال|ازيل|remov)/.test(hay)) continue;
      if (str(it.cat) === 'care') return it;
      if (!best) best = it;
    }
    return best;
  }

  function renderRemoval() {
    var it = removalItem(), body, txt;
    if (!dom.remove) return;
    clear(dom.remove);

    txt = it ? clip(lines(pick(it.a))[0], 340) : t('faq.removeX');
    body = el('div', { 'class': 'faq-remove-b' }, [
      el('p', { 'class': 'faq-remove-t', text: t('faq.removeTitle') }),
      el('p', { text: txt })
    ]);
    if (it) {
      body.appendChild(el('p', {}, [
        el('button', {
          'class': 'btn btn-ghost btn-sm',
          type: 'button',
          on: { click: function () { reveal(str(it.id), true); } }
        }, [
          el('span', { text: t('faq.removeMore') }),
          el('span', { html: icon('arrow', 16) })
        ])
      ]));
    }

    dom.remove.appendChild(el('span', { html: icon('shield', 20) }));
    dom.remove.appendChild(body);
  }

  /* ==================================================================== */
  /* 7. contact card                                                       */
  /* ==================================================================== */

  function digitsOnly(v) { return str(v).replace(/[^0-9]/g, ''); }
  function telHref(v) { return 'tel:' + str(v).replace(/[^0-9+]/g, ''); }

  function handleOf(v) { return trim(v).replace(/^@+/, ''); }
  function socialHref(base, v) {
    var h = handleOf(v);
    if (!h) return '';
    if (/^https?:\/\//i.test(h)) return h;
    return base + h;
  }
  function socialLabel(v) {
    var h = handleOf(v);
    if (!h) return '';
    if (/^https?:\/\//i.test(h)) return h.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    return '@' + h;
  }

  function waHref(msg) {
    var n;
    if (SN.Checkout && typeof SN.Checkout.waLink === 'function') {
      try {
        n = SN.Checkout.waLink(msg);
        if (n) return n;
      } catch (e) { /* fall through to the local build */ }
    }
    n = digitsOnly(sget('settings.whatsapp', ''));
    if (!n) return '';
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent(str(msg));
  }

  function linkRow(iconName, href, title, value, external) {
    var kids = [
      el('span', { html: icon(iconName, 20) }),
      el('span', { 'class': 'faq-link-b' }, [
        el('span', { 'class': 'faq-link-t', text: title }),
        el('span', { 'class': 'faq-link-v ltr', text: value })
      ])
    ];
    if (external) kids.push(el('span', { 'class': 'sr-only', text: t('a11y.newWindow') }));
    return el('a', {
      'class': 'faq-link',
      href: href,
      target: external ? '_blank' : null,
      rel: external ? 'noopener noreferrer' : null
    }, kids);
  }

  function infoRow(iconName, title, value) {
    return el('div', { 'class': 'faq-info-row' }, [
      el('span', { html: icon(iconName, 18) }),
      el('div', {}, [
        el('span', { 'class': 'faq-info-t', text: title }),
        el('p', { 'class': 'faq-info-v', text: value })
      ])
    ]);
  }

  function renderContact() {
    var phone = trim(sget('settings.phone', ''));
    var mail = trim(sget('settings.email', ''));
    var ig = handleOf(sget('settings.instagram', ''));
    var sc = handleOf(sget('settings.snapchat', ''));
    var tk = handleOf(sget('settings.tiktok', ''));
    var hours = pick(sget('settings.hours', null));
    var city = pick(sget('settings.city', null));
    var wa = waHref(t('faq.waMsg'));
    var links, info;

    if (!dom.card) return;
    clear(dom.card);

    dom.card.appendChild(el('div', { 'class': 'faq-card-h' }, [
      el('span', { html: icon('sparkle', 22) }),
      el('div', {}, [
        el('p', { 'class': 'faq-card-t', text: t('faq.cardTitle') }),
        el('p', { 'class': 'faq-card-x', text: t('faq.cardX') })
      ])
    ]));

    if (wa) {
      dom.card.appendChild(el('a', {
        'class': 'btn btn-pri btn-lg btn-block faq-wa',
        href: wa,
        target: '_blank',
        rel: 'noopener noreferrer'
      }, [
        el('span', { html: icon('whatsapp', 22) }),
        el('span', { text: t('faq.waBtn') }),
        el('span', { 'class': 'sr-only', text: t('a11y.newWindow') })
      ]));
    }

    links = el('div', { 'class': 'faq-links' });
    if (phone) links.appendChild(linkRow('phone', telHref(phone), t('faq.callT'), phone, false));
    if (mail) links.appendChild(linkRow('mail', 'mailto:' + mail, t('faq.mailT'), mail, false));
    if (ig) links.appendChild(linkRow('instagram', socialHref('https://instagram.com/', ig), t('faq.igT'), socialLabel(ig), true));
    if (sc) links.appendChild(linkRow('snapchat', socialHref('https://snapchat.com/add/', sc), t('faq.scT'), socialLabel(sc), true));
    if (tk) links.appendChild(linkRow('tiktok', socialHref('https://tiktok.com/@', tk), t('faq.ttT'), socialLabel(tk), true));
    if (links.childNodes.length) dom.card.appendChild(links);

    info = el('div', { 'class': 'faq-info' });
    if (hours) info.appendChild(infoRow('clock', t('faq.hoursT'), hours));
    /* The city is only the base we ship from — this business has no shop
       address and nothing is ever collected in person. */
    if (city) info.appendChild(infoRow('globe', t('faq.cityT'), city));
    if (info.childNodes.length) dom.card.appendChild(info);

    if (!wa && !links.childNodes.length && !info.childNodes.length) {
      dom.card.appendChild(el('p', { 'class': 'hint', text: t('faq.noChannels') }));
    }
  }

  /* ==================================================================== */
  /* 8. the enquiry box                                                    */
  /* ==================================================================== */

  /* which channel the submit button will use, in order of preference */
  function channel() {
    if (waHref('x')) return 'wa';
    if (trim(sget('settings.email', ''))) return 'mail';
    if (trim(sget('settings.notifyEndpoint', ''))) return 'send';
    return '';
  }

  function renderAsk() {
    var cats = catList(), keep, i, c, ch;

    if (dom.askCat) {
      keep = dom.askCat.value;
      clear(dom.askCat);
      for (i = 0; i < cats.length; i++) {
        c = cats[i];
        if (!isObj(c) || !c.id) continue;
        dom.askCat.appendChild(el('option', { value: str(c.id), text: pick(c.name) || str(c.id) }));
      }
      dom.askCat.appendChild(el('option', { value: OTHER, text: t('faq.catOther') }));
      if (keep) {
        try { dom.askCat.value = keep; }
        catch (e) { /* the category was deleted meanwhile */ }
        if (!dom.askCat.value) dom.askCat.value = OTHER;
      }
    }

    ch = channel();
    if (dom.askSend) {
      clear(dom.askSend);
      dom.askSend.appendChild(el('span', {
        html: icon(ch === 'wa' ? 'whatsapp' : (ch === 'mail' ? 'mail' : 'arrow'), 18)
      }));
      dom.askSend.appendChild(el('span', {
        text: ch === 'wa' ? t('faq.askSend') : (ch === 'mail' ? t('faq.askSendMail') : t('faq.askSendOnly'))
      }));
      if (ch) {
        dom.askSend.removeAttribute('disabled');
        dom.askSend.removeAttribute('aria-disabled');
      } else {
        dom.askSend.setAttribute('disabled', '');
        dom.askSend.setAttribute('aria-disabled', 'true');
      }
    }
    if (dom.askNote) {
      dom.askNote.textContent = ch === 'wa' ? t('faq.askNote')
        : ch === 'mail' ? t('faq.askNoteMail')
          : ch === 'send' ? t('faq.askNoteSend')
            : t('faq.askNoteNone');
    }
  }

  function setErr(input, box, msg) {
    if (box) box.textContent = str(msg);
    if (!input) return;
    if (msg) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
  function clearErrs() {
    setErr(dom.askName, dom.askNameErr, '');
    setErr(dom.askQ, dom.askQErr, '');
  }

  function askCatLabel() {
    var v = dom.askCat ? str(dom.askCat.value) : '';
    if (!v || v === OTHER) return t('faq.catOther');
    return catName(v) || v;
  }

  function askMessage(name, question) {
    return [
      t('faq.askIntro'),
      t('faq.askLblName') + ': ' + name,
      t('faq.askLblCat') + ': ' + askCatLabel(),
      t('faq.askLblQ') + ':',
      question
    ].join('\n');
  }

  /* optional POST — never blocks and never breaks the flow */
  function notify(name, message) {
    var url = trim(sget('settings.notifyEndpoint', ''));
    var key = trim(sget('settings.notifyKey', ''));
    var payload, fd, k, json;
    if (!url || typeof fetch !== 'function') return;

    payload = {
      subject: t('faq.askSubject'),
      from_name: name,
      message: message
    };
    if (key) payload.access_key = key;

    json = /formspree/i.test(url) || /\.json(\?|#|$)/i.test(url);
    try {
      if (json || typeof FormData === 'undefined') {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        })['catch'](function (e) { console.warn('[SN.Faq] enquiry notify failed', e); });
        return;
      }
      fd = new FormData();
      for (k in payload) {
        if (Object.prototype.hasOwnProperty.call(payload, k)) fd.append(k, str(payload[k]));
      }
      fetch(url, { method: 'POST', body: fd })['catch'](function (e) {
        console.warn('[SN.Faq] enquiry notify failed', e);
      });
    } catch (e2) {
      console.warn('[SN.Faq] enquiry notify failed', e2);
    }
  }

  function submitAsk(ev) {
    var name = dom.askName ? trim(dom.askName.value) : '';
    var question = dom.askQ ? trim(dom.askQ.value) : '';
    var ch = channel();
    var bad = null, msg, href, mailTo;

    if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
    clearErrs();

    if (name.length < 2) {
      setErr(dom.askName, dom.askNameErr, t('faq.askErrName'));
      bad = bad || dom.askName;
    }
    if (question.length < 10) {
      setErr(dom.askQ, dom.askQErr, t('faq.askErrQ'));
      bad = bad || dom.askQ;
    }
    if (bad) { focusSoft(bad); return; }
    if (!ch) { toast(t('faq.askNoteNone'), 'err'); return; }

    msg = askMessage(name, question);

    if (ch === 'wa') {
      href = waHref(msg);
      /* opened synchronously inside the click so the popup blocker allows it */
      if (href) { try { window.open(href, '_blank', 'noopener'); } catch (e) { location.href = href; } }
      toast(t('faq.askOkWa'), 'ok');
    } else if (ch === 'mail') {
      mailTo = trim(sget('settings.email', ''));
      href = 'mailto:' + mailTo +
        '?subject=' + encodeURIComponent(t('faq.askSubject')) +
        '&body=' + encodeURIComponent(msg);
      try { window.open(href, '_blank', 'noopener'); } catch (e2) { location.href = href; }
      toast(t('faq.askOkMail'), 'ok');
    } else {
      toast(t('faq.askOkSent'), 'ok');
    }

    notify(name, msg);

    if (dom.askQ) dom.askQ.value = '';
  }

  /* prefill the box from a question the visitor was reading */
  function askAbout(it) {
    var v;
    if (!dom.askQ) return;
    if (dom.askCat && it && it.cat) {
      try { dom.askCat.value = str(it.cat); }
      catch (e) { /* ignore */ }
      if (!dom.askCat.value) dom.askCat.value = OTHER;
    }
    v = t('faq.aboutQ', { q: stripQ(pick(it ? it.q : '')) }) + '\n\n';
    dom.askQ.value = v;
    clearErrs();
    scrollTo(dom.ask);
    focusSoft(dom.askQ);
    try { dom.askQ.setSelectionRange(v.length, v.length); }
    catch (e2) { /* ignore */ }
  }

  /* ==================================================================== */
  /* 9. render + wiring                                                    */
  /* ==================================================================== */

  function renderJump() {
    var items = [
      { href: '#faq-guide', key: 'faq.jumpGuide', ico: 'hand' },
      { href: '#faq-contact', key: 'faq.jumpContact', ico: 'phone' },
      { href: '#faq-ask', key: 'faq.jumpAsk', ico: 'mail' }
    ], i;
    if (!dom.jump) return;
    clear(dom.jump);
    for (i = 0; i < items.length; i++) {
      dom.jump.appendChild(el('a', { 'class': 'chip', href: items[i].href }, [
        el('span', { html: icon(items[i].ico, 15) }),
        el('span', { text: t(items[i].key) })
      ]));
    }
  }

  function render() {
    renderTabs();
    renderCount();
    renderList();
    renderGuide();
    renderContact();
    renderAsk();
    if (SN.I18n && typeof SN.I18n.apply === 'function') SN.I18n.apply(dom.main || document);
  }

  function onSearch() {
    st.q = dom.q ? trim(dom.q.value) : '';
    show(dom.qClear, !!st.q);
    renderTabs();
    renderCount();
    renderList();
  }

  function resetFilters() {
    st.q = '';
    st.cat = ALL;
    if (dom.q) dom.q.value = '';
    show(dom.qClear, false);
    render();
    focusSoft(dom.q);
  }

  function hashId() {
    var h = str(location.hash).replace(/^#/, '');
    try { h = decodeURIComponent(h); }
    catch (e) { /* keep the raw value */ }
    return h;
  }

  function openFromHash(moveFocus) {
    var id = hashId();
    if (!id) return;
    if (!findFaq(id)) return;      /* #faq-guide, #faq-contact … are section anchors */
    reveal(id, moveFocus);
  }

  function wire() {
    var onType = debounce(onSearch, 120);

    if (dom.q) {
      dom.q.addEventListener('input', onType, false);
      dom.q.addEventListener('search', onSearch, false);
      dom.q.addEventListener('keydown', function (ev) {
        if (ev && ev.key === 'Escape' && dom.q.value) {
          ev.preventDefault();
          resetFilters();
        }
      }, false);
    }
    if (dom.qClear) dom.qClear.addEventListener('click', resetFilters, false);
    if (dom.reset) dom.reset.addEventListener('click', resetFilters, false);
    if (dom.askForm) dom.askForm.addEventListener('submit', submitAsk, false);
    if (dom.askName) {
      dom.askName.addEventListener('input', function () { setErr(dom.askName, dom.askNameErr, ''); }, false);
    }
    if (dom.askQ) {
      dom.askQ.addEventListener('input', function () { setErr(dom.askQ, dom.askQErr, ''); }, false);
    }

    window.addEventListener('hashchange', function () { openFromHash(true); }, false);
  }

  function paintStaticIcons() {
    if (dom.searchIco) dom.searchIco.innerHTML = icon('search', 20);
    if (dom.emptyIco) dom.emptyIco.innerHTML = icon('search', 40);
    if (dom.askIco) dom.askIco.innerHTML = icon('mail', 22);
    if (dom.qClear && !dom.qClear.innerHTML) dom.qClear.innerHTML = icon('close', 18);
  }

  function start() {
    if (inited) return;
    inited = true;

    if (SN.UI && typeof SN.UI.boot === 'function') SN.UI.boot('faq');

    cacheDom();
    paintStaticIcons();
    renderJump();
    wire();

    if (SN.Store && typeof SN.Store.ready === 'function') SN.Store.ready(first);
    else first();
  }

  function first() {
    render();
    openFromHash(false);

    if (SN.I18n && typeof SN.I18n.onChange === 'function') {
      SN.I18n.onChange(function () {
        HAY = {};              /* cached haystacks are language-agnostic, but ids may have changed */
        renderJump();
        render();
      });
    }

    if (SN.Store && typeof SN.Store.subscribe === 'function') {
      try {
        SN.Store.subscribe(debounce(function () {
          if (st.open && !findFaq(st.open)) st.open = '';
          render();
        }, 90));
      } catch (e) { console.warn('[SN.Faq] could not subscribe to the store', e); }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, false);
  } else {
    start();
  }

  /* ==================================================================== */
  /* 10. export                                                            */
  /* ==================================================================== */

  SN.Faq = {
    init: start,
    render: render,
    open: function (id) { return reveal(id, true); },
    search: function (q) {
      st.q = trim(q);
      if (dom.q) dom.q.value = st.q;
      show(dom.qClear, !!st.q);
      render();
      return st.q;
    },
    state: st
  };
})();
