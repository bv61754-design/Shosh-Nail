/*! Shosh Nail — assets/js/checkout.js
 *  SN.Checkout : pricing, the 3-step order flow, order persistence + notification.
 *  Contract: SPEC.md section 12. Attaches exactly one property: window.SN.Checkout
 *
 *  Public API (character for character with the spec):
 *    SN.Checkout.priceCustom(design)
 *    SN.Checkout.priceReady(item, qty, opts)
 *    SN.Checkout.open(opts)
 *    SN.Checkout.summary(order, lang)
 *    SN.Checkout.submit(order)
 *    SN.Checkout.waLink(text)
 *    SN.Checkout.nextNumber()
 *
 *  Every price line carries {key, label, amount, qty}; the lines always sum to
 *  `subtotal`, and `subtotal + shipping + vat === total`, so a caller can render
 *  the array straight into a breakdown table without doing any maths of its own.
 */
(function () {
  'use strict';

  var SN = (window.SN = window.SN || {});

  var CUST_KEY = 'shosh2-customer';
  var SEQ_PATH = 'settings.orderSeq';   /* persisted counter, lives inside settings */

  var FALLBACK_KEYS = [
    'rightThumb', 'rightIndex', 'rightMiddle', 'rightRing', 'rightPinky',
    'leftThumb', 'leftIndex', 'leftMiddle', 'leftRing', 'leftPinky'
  ];

  var FALLBACK_FINGERS = [
    { key: 'thumb', name: { ar: 'الإبهام', en: 'Thumb' } },
    { key: 'index', name: { ar: 'السبابة', en: 'Index' } },
    { key: 'middle', name: { ar: 'الوسطى', en: 'Middle' } },
    { key: 'ring', name: { ar: 'البنصر', en: 'Ring' } },
    { key: 'pinky', name: { ar: 'الخنصر', en: 'Pinky' } }
  ];

  var RATE_DEFAULTS = {
    base: 120, singleHandFactor: 0.6, perExtraColor: 3, perPatternNail: 8,
    perCharm: 4, express: 40, giftWrap: 15, shipping: 20, freeShippingOver: 300,
    vat: 0, depositPct: 0
  };

  var PAY_ICON = {
    bank: 'shield', card: 'lock', wallet: 'phone',
    cod: 'truck', applepay: 'phone'
  };

  /* ====================================================================== */
  /* 1. Dictionary — namespaces 'co' and 'pay' only                          */
  /* ====================================================================== */

  if (SN.I18n && typeof SN.I18n.extend === 'function') {
    SN.I18n.extend({
      ar: {
        co: {
          title: 'إتمام الطلب',
          lead: 'ثلاث خطوات بسيطة ويوصلنا طلبك.',
          custom: 'تصميم مخصص من استوديو التصميم',
          customSub: 'طقم مصنوع بمقاسك أنتِ، ظفرًا ظفرًا.',
          readySub: 'تصميم جاهز من المتجر.',
          options: 'خيارات الطلب',
          qtyHint: 'كل طقم يحتوي على 10 أظافر مع اللاصقات وعدّة التركيب.',
          qtyHintOne: 'طقم اليد الواحدة فيه 5 أظافر مع اللاصقات وعدّة التركيب.',
          review: 'مراجعة الطلب',
          breakdown: 'تفاصيل السعر',
          itemCol: 'البند',
          amountCol: 'المبلغ',
          edit: 'تعديل',
          designTitle: 'تفاصيل التصميم',
          nailsTitle: 'تفصيل الأظافر',
          savedHint: 'نحفظ بياناتك على جهازك أنتِ فقط، عشان طلبك الجاي يكون أسرع.',
          noPay: 'ما فيه طريقة دفع مفعّلة حالياً',
          noPayText: 'أرسلي طلبك وإحنا نتفق معك على طريقة الدفع مباشرة عند التواصل.',
          noWa: 'ما فيه رقم واتساب مسجّل حالياً',
          noWaText: 'انسخي ملخص الطلب وأرسليه لنا على أي وسيلة من هذي:',
          contact: 'طرق التواصل',
          imgErr: 'ما قدرنا نجهّز صورة التصميم، جرّبي مرة ثانية.',
          imgWait: 'جاري تجهيز الصورة…',
          saveErr: 'ما قدرنا نحفظ الطلب، جرّبي مرة ثانية.',
          mm: 'مم',
          line: {
            base: 'الطقم الأساسي',
            baseOne: 'الطقم الأساسي (يد واحدة)',
            shape: 'الشكل',
            length: 'الطول',
            finish: 'اللمسة',
            colors: 'ألوان إضافية',
            patternNails: 'أظافر منقوشة',
            pattern: 'النقشة',
            charms: 'زخارف مركّبة',
            charm: 'زخرفة',
            qty: 'أطقم إضافية'
          },
          f: {
            shape: 'الشكل',
            length: 'الطول',
            hand: 'اليد',
            skin: 'لون البشرة',
            sizes: 'المقاسات',
            color: 'اللون',
            finish: 'اللمسة',
            pattern: 'النقشة',
            charms: 'الزخارف',
            design: 'التصميم',
            none: 'بدون'
          },
          hand: {
            both: 'اليدين',
            right: 'اليد اليمنى',
            left: 'اليد اليسرى'
          },
          s: {
            newOrder: 'طلب جديد',
            type: 'نوع الطلب',
            nails: 'الأظافر',
            price: 'تفاصيل السعر'
          }
        },
        pay: {
          picked: 'الطريقة المختارة',
          noneTitle: 'ما فيه طرق دفع مضافة',
          noneText: 'نتواصل معك ونتفق على طريقة الدفع المناسبة بعد وصول الطلب.'
        }
      },
      en: {
        co: {
          title: 'Checkout',
          lead: 'Three quick steps and your order is with us.',
          custom: 'Custom design from the design studio',
          customSub: 'A set built to your own measurements, nail by nail.',
          readySub: 'A ready design from the shop.',
          options: 'Order options',
          qtyHint: 'Every set holds 10 nails, with adhesives and a prep kit.',
          qtyHintOne: 'A single-hand set holds 5 nails, with adhesives and a prep kit.',
          review: 'Review your order',
          breakdown: 'Price breakdown',
          itemCol: 'Item',
          amountCol: 'Amount',
          edit: 'Edit',
          designTitle: 'Design details',
          nailsTitle: 'Nail by nail',
          savedHint: 'We keep your details on this device only, so your next order is quicker.',
          noPay: 'No payment method is enabled yet',
          noPayText: 'Send your order anyway — we will agree on payment with you directly.',
          noWa: 'No WhatsApp number is saved yet',
          noWaText: 'Copy the order summary and send it to us on any of these:',
          contact: 'Contact us',
          imgErr: 'We could not prepare the design image, please try again.',
          imgWait: 'Preparing the image…',
          saveErr: 'We could not save the order, please try again.',
          mm: 'mm',
          line: {
            base: 'Base set',
            baseOne: 'Base set (one hand)',
            shape: 'Shape',
            length: 'Length',
            finish: 'Finish',
            colors: 'Extra colours',
            patternNails: 'Patterned nails',
            pattern: 'Pattern',
            charms: 'Placed charms',
            charm: 'Charm',
            qty: 'Additional sets'
          },
          f: {
            shape: 'Shape',
            length: 'Length',
            hand: 'Hand',
            skin: 'Skin tone',
            sizes: 'Sizes',
            color: 'Colour',
            finish: 'Finish',
            pattern: 'Pattern',
            charms: 'Charms',
            design: 'Design',
            none: 'None'
          },
          hand: {
            both: 'Both hands',
            right: 'Right hand',
            left: 'Left hand'
          },
          s: {
            newOrder: 'New order',
            type: 'Order type',
            nails: 'Nails',
            price: 'Price breakdown'
          }
        },
        pay: {
          picked: 'Chosen method',
          noneTitle: 'No payment methods added',
          noneText: 'We will contact you and agree on the best payment method once the order arrives.'
        }
      }
    });
  }

  /* ====================================================================== */
  /* 2. Tiny helpers                                                         */
  /* ====================================================================== */

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function has(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }

  function numOf(v, fb) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n) ? n : (fb === undefined ? 0 : fb);
  }

  function intOf(v, fb, lo, hi) {
    var n = parseInt(v, 10);
    if (!isFinite(n)) n = fb;
    if (typeof lo === 'number' && n < lo) n = lo;
    if (typeof hi === 'number' && n > hi) n = hi;
    return n;
  }

  function r2(n) {
    var v = numOf(n, 0);
    return Math.round(v * 100) / 100;
  }

  function str(v) { return v === null || v === undefined ? '' : String(v); }
  function trim(v) { return str(v).replace(/^\s+|\s+$/g, ''); }

  function clone(v) {
    var i, k, out;
    if (Array.isArray(v)) {
      out = [];
      for (i = 0; i < v.length; i++) out.push(clone(v[i]));
      return out;
    }
    if (isObj(v)) {
      out = {};
      for (k in v) { if (has(v, k)) out[k] = clone(v[k]); }
      return out;
    }
    return v;
  }

  function pad4(n) {
    var s = String(Math.max(0, intOf(n, 0, 0)));
    while (s.length < 4) s = '0' + s;
    return s;
  }

  /* ---------------------------------------------------------- store access */

  function sget(path, fb) {
    try { return (SN.Store && SN.Store.get) ? SN.Store.get(path, fb) : fb; }
    catch (e) { return fb; }
  }

  function slist(key) {
    var a;
    try { a = (SN.Store && SN.Store.list) ? SN.Store.list(key) : null; }
    catch (e) { a = null; }
    return Array.isArray(a) ? a : [];
  }

  function findItem(key, id) {
    if (id === undefined || id === null || id === '') return null;
    try { return (SN.Store && SN.Store.find) ? SN.Store.find(key, id) : null; }
    catch (e) { return null; }
  }

  function rates() {
    var p = sget('pricing', null);
    var out = {}, k;
    for (k in RATE_DEFAULTS) {
      if (has(RATE_DEFAULTS, k)) out[k] = numOf(isObj(p) ? p[k] : undefined, RATE_DEFAULTS[k]);
    }
    return out;
  }

  /* ------------------------------------------------------------ language */

  function curLang() {
    return (SN.I18n && SN.I18n.lang === 'en') ? 'en' : 'ar';
  }

  function normLang(l) {
    if (l === 'ar' || l === 'en') return l;
    return curLang();
  }

  /* Translate into an explicit language (SN.I18n.t only knows the current one). */
  function tl(key, lang, vars) {
    var I = SN.I18n, L = normLang(lang), s, d;
    var k = str(key);
    if (!k) return '';
    if (!I || !I.dict) return k;
    d = I.dict[L];
    s = d ? d[k] : undefined;
    if (s === undefined || s === null) {
      d = I.dict[L === 'ar' ? 'en' : 'ar'];
      s = d ? d[k] : undefined;
    }
    if (s === undefined || s === null) return k;
    s = String(s);
    if (!isObj(vars)) return s;
    return s.replace(/\{(\w+)\}/g, function (m, name) {
      return has(vars, name) ? str(vars[name]) : m;
    });
  }

  function T(key, vars) {
    if (SN.I18n && typeof SN.I18n.t === 'function') return SN.I18n.t(key, vars);
    return tl(key, curLang(), vars);
  }

  /* T-object -> string in an explicit language. */
  function pickL(tobj, lang) {
    var L = normLang(lang), a, b;
    if (typeof tobj === 'string') return tobj;
    if (!isObj(tobj)) return '';
    a = tobj[L];
    b = tobj[L === 'ar' ? 'en' : 'ar'];
    if (typeof a === 'string' && a) return a;
    if (typeof b === 'string' && b) return b;
    return '';
  }

  function fmtNum(v, lang) {
    var I = SN.I18n, L = normLang(lang), n = r2(v);
    if (I && typeof I.num === 'function' && L === curLang()) return I.num(n);
    try {
      return new Intl.NumberFormat(L === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US',
        { maximumFractionDigits: 2 }).format(n);
    } catch (e) { /* older engine */ }
    return String(n);
  }

  function currencyOf(lang) {
    var c = pickL(sget('settings.currency', null), lang);
    return c || tl('common.currency', lang);
  }

  function moneyL(n, lang) {
    var I = SN.I18n, L = normLang(lang), cur, s;
    if (I && typeof I.money === 'function' && L === curLang()) return I.money(r2(n));
    cur = currencyOf(L);
    s = fmtNum(n, L);
    if (!cur) return s;
    return L === 'ar' ? (s + ' ' + cur) : (cur + ' ' + s);
  }

  /* ---------------------------------------------------------- nail model */

  function nailKeys() {
    return (SN.Nail && Array.isArray(SN.Nail.KEYS) && SN.Nail.KEYS.length)
      ? SN.Nail.KEYS : FALLBACK_KEYS;
  }

  function fingers() {
    return (SN.Nail && Array.isArray(SN.Nail.FINGERS) && SN.Nail.FINGERS.length)
      ? SN.Nail.FINGERS : FALLBACK_FINGERS;
  }

  function handOf(design) {
    var h = isObj(design) ? design.hand : null;
    return (h === 'right' || h === 'left') ? h : 'both';
  }

  /* Share of `pricing.base` a single-hand set pays. Clamped to 0..1 (the admin
     field uses the same range) so a hand-edited backup can never make half a
     set cost more than a whole one; 1 restores the full base price exactly. */
  function handFactor(P) {
    var f = numOf(P && P.singleHandFactor, RATE_DEFAULTS.singleHandFactor);
    if (!(f > 0)) return 0;
    return f > 1 ? 1 : f;
  }

  /* Only the nails the customer actually receives are priced and listed. */
  function activeKeys(design) {
    var all = nailKeys(), h = handOf(design), out = [], i;
    if (h === 'both') return all.slice();
    for (i = 0; i < all.length; i++) {
      if (String(all[i]).indexOf(h) === 0) out.push(all[i]);
    }
    return out.length ? out : all.slice();
  }

  function fingerKeyOf(key) {
    var s = str(key), cut = 0, f;
    if (s.indexOf('right') === 0) cut = 5;
    else if (s.indexOf('left') === 0) cut = 4;
    f = s.slice(cut);
    return f ? f.charAt(0).toLowerCase() + f.slice(1) : s;
  }

  function fingerName(key, lang) {
    var fk = fingerKeyOf(key), list = fingers(), i;
    for (i = 0; i < list.length; i++) {
      if (list[i] && list[i].key === fk) return pickL(list[i].name, lang) || fk;
    }
    return fk;
  }

  function nailOf(design, key) {
    var n = (isObj(design) && isObj(design.nails)) ? design.nails[key] : null;
    return isObj(n) ? n : {};
  }

  /* Canonical form of a colour so the distinct-colour count cannot be fooled
     by case or by the 3-digit shorthand: '#fff' and '#FFFFFF' are one colour. */
  function hexKey(v) {
    var s = trim(v).toUpperCase();
    if (/^#[0-9A-F]{3}$/.test(s)) {
      s = '#' + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3);
    }
    return s;
  }

  /* ====================================================================== */
  /* 3. Pricing                                                              */
  /* ====================================================================== */

  function itemLabel(baseKey, coll, id, lang, fallback) {
    var it = findItem(coll, id);
    var name = it ? (pickL(it.name, lang) || str(id)) : '';
    if (!name) return fallback || tl(baseKey, lang);
    return tl(baseKey, lang) + ': ' + name;
  }

  function addLine(lines, key, label, amount, qty) {
    var a = r2(amount);
    if (!a) return;
    lines.push({ key: key, label: label, amount: a, qty: intOf(qty, 1, 0) });
  }

  function sumLines(lines) {
    var s = 0, i;
    for (i = 0; i < lines.length; i++) s += numOf(lines[i].amount, 0);
    return r2(s);
  }

  /* shipping / vat / total, shared by both price builders */
  function finish(lines, lang) {
    var P = rates();
    var sub = sumLines(lines);
    var free = P.freeShippingOver > 0 && sub >= P.freeShippingOver;
    var ship = (free || P.shipping <= 0) ? 0 : r2(P.shipping);
    var vat = P.vat > 0 ? r2(P.vat * sub) : 0;
    var total = r2(sub + ship + vat);
    return {
      lines: lines,
      subtotal: sub,
      shipping: ship,
      vat: vat,
      total: total,
      /* Informational only: the slice of `total` the owner asks for up front.
         It is NOT a line and never touches subtotal/shipping/vat/total, so the
         lines still sum to the subtotal exactly as before. 0 = disabled. */
      deposit: P.depositPct > 0 ? r2(Math.min(1, P.depositPct) * total) : 0,
      currency: currencyOf(lang)
    };
  }

  function addExtras(lines, express, giftWrap, lang) {
    var P = rates();
    if (express) addLine(lines, 'express', tl('order.express', lang), P.express, 1);
    if (giftWrap) addLine(lines, 'giftWrap', tl('order.giftWrap', lang), P.giftWrap, 1);
  }

  /* The 10-step custom-set algorithm from SPEC.md section 12. */
  function buildCustom(design, lang) {
    var L = normLang(lang);
    var P = rates();
    var d = isObj(design) ? design : {};
    var keys = activeKeys(d);
    var lines = [];
    var colorSeen = {}, colorCount = 0;
    var finishCount = {}, patternCount = {}, charmCount = {};
    var patternNails = 0, charmTotal = 0;
    var i, j, key, nail, hex, fid, pat, kind, charms, ch, cid;
    var list, it, perSet, qty, oneHand;

    /* 1 — base. One set, charged once: `qty` on a line is the multiplier that
       produced `amount` (5 matte nails × 4 = 20), so the base line must carry
       qty 1 or the breakdown reads as ten sets at 120 and stops adding up.
       A one-hand order receives 5 nails, so it pays `singleHandFactor` of the
       base — the owner's own number, because a half set is not half the work.
       Only this line is scaled: the per-nail charges below already halve by
       themselves, since `keys` holds five nails instead of ten. The line is
       keyed 'base:one' so `relabel` can name it correctly in either language
       long after the order was placed. */
    oneHand = handOf(d) !== 'both';
    lines.push({
      key: oneHand ? 'base:one' : 'base',
      label: tl(oneHand ? 'co.line.baseOne' : 'co.line.base', L),
      amount: r2(oneHand ? P.base * handFactor(P) : P.base),
      qty: 1
    });

    /* 2 — shape + length surcharges */
    it = findItem('shapes', d.shape);
    if (it) addLine(lines, 'shape:' + str(d.shape),
      itemLabel('co.line.shape', 'shapes', d.shape, L), numOf(it.price, 0), 1);

    it = findItem('lengths', d.length);
    if (it) addLine(lines, 'length:' + str(d.length),
      itemLabel('co.line.length', 'lengths', d.length, L), numOf(it.price, 0), 1);

    /* walk the nails once and collect every count we need */
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      nail = nailOf(d, key);

      hex = hexKey(nail.color);
      if (hex && !has(colorSeen, hex)) { colorSeen[hex] = true; colorCount++; }

      fid = str(nail.finish);
      if (fid) finishCount[fid] = (has(finishCount, fid) ? finishCount[fid] : 0) + 1;

      pat = isObj(nail.pattern) ? nail.pattern : null;
      kind = pat ? str(pat.kind) : '';
      if (kind && kind !== 'none') {
        patternNails++;
        patternCount[kind] = (has(patternCount, kind) ? patternCount[kind] : 0) + 1;
      }

      charms = Array.isArray(nail.charms) ? nail.charms : [];
      for (j = 0; j < charms.length; j++) {
        ch = charms[j];
        cid = isObj(ch) ? str(ch.id) : '';
        charmTotal++;
        if (cid) charmCount[cid] = (has(charmCount, cid) ? charmCount[cid] : 0) + 1;
      }
    }

    /* 3 — priced finishes, emitted in the owner's own order */
    list = slist('finishes');
    for (i = 0; i < list.length; i++) {
      it = list[i];
      if (!isObj(it) || !has(finishCount, it.id)) continue;
      addLine(lines, 'finish:' + str(it.id),
        itemLabel('co.line.finish', 'finishes', it.id, L),
        numOf(it.price, 0) * finishCount[it.id], finishCount[it.id]);
    }

    /* 4 — every distinct colour beyond the first */
    if (colorCount > 1) {
      addLine(lines, 'colors', tl('co.line.colors', L),
        P.perExtraColor * (colorCount - 1), colorCount - 1);
    }

    /* 5 — per patterned nail, then each pattern's own price */
    if (patternNails > 0) {
      addLine(lines, 'patternNails', tl('co.line.patternNails', L),
        P.perPatternNail * patternNails, patternNails);
    }
    list = slist('patterns');
    for (i = 0; i < list.length; i++) {
      it = list[i];
      if (!isObj(it) || !has(patternCount, it.kind)) continue;
      addLine(lines, 'pattern:' + str(it.id),
        itemLabel('co.line.pattern', 'patterns', it.id, L),
        numOf(it.price, 0) * patternCount[it.kind], patternCount[it.kind]);
      /* the owner may keep two entries with the same kind (a duplicated row);
         only the first one is charged */
      delete patternCount[it.kind];
    }

    /* 6 — per charm placed, then each charm's own price */
    if (charmTotal > 0) {
      addLine(lines, 'charms', tl('co.line.charms', L), P.perCharm * charmTotal, charmTotal);
    }
    list = slist('charms');
    for (i = 0; i < list.length; i++) {
      it = list[i];
      if (!isObj(it) || !has(charmCount, it.id)) continue;
      addLine(lines, 'charm:' + str(it.id),
        itemLabel('co.line.charm', 'charms', it.id, L),
        numOf(it.price, 0) * charmCount[it.id], charmCount[it.id]);
    }

    /* 7 — quantity. Every line above is one set; the extra sets get their
           own line so the array still sums to the subtotal. */
    perSet = sumLines(lines);
    qty = intOf(d.qty, 1, 1, 99);
    if (qty > 1) {
      addLine(lines, 'qty', tl('co.line.qty', L), perSet * (qty - 1), qty - 1);
    }

    /* 8 — express / gift wrap, charged once per order */
    addExtras(lines, d.express, d.giftWrap, L);

    /* 9 + 10 — shipping and VAT */
    return finish(lines, L);
  }

  function buildReady(item, qty, opts, lang) {
    var L = normLang(lang);
    var it = isObj(item) ? item : {};
    var o = isObj(opts) ? opts : {};
    var q = intOf(qty, 1, 1, 99);
    var lines = [];
    var name = pickL(it.name, L) || tl('order.ready', L);

    lines.push({
      key: 'item:' + str(it.id),
      label: name,
      amount: r2(numOf(it.price, 0) * q),
      qty: q
    });

    addExtras(lines, o.express, o.giftWrap, L);
    return finish(lines, L);
  }

  function priceCustom(design) {
    try { return buildCustom(design, curLang()); }
    catch (e) {
      console.warn('[SN.Checkout] priceCustom failed', e);
      return finish([], curLang());
    }
  }

  function priceReady(item, qty, opts) {
    try { return buildReady(item, qty, opts, curLang()); }
    catch (e) {
      console.warn('[SN.Checkout] priceReady failed', e);
      return finish([], curLang());
    }
  }

  /* Re-label a stored line into another language, from its key alone. */
  function relabel(line, lang) {
    var L = normLang(lang);
    var key = str(line && line.key);
    var cut = key.indexOf(':');
    var base = cut === -1 ? key : key.slice(0, cut);
    var id = cut === -1 ? '' : key.slice(cut + 1);
    var fb = str(line && line.label);
    var it;

    switch (base) {
      case 'base': return tl(id === 'one' ? 'co.line.baseOne' : 'co.line.base', L);
      case 'shape': return itemLabel('co.line.shape', 'shapes', id, L, fb);
      case 'length': return itemLabel('co.line.length', 'lengths', id, L, fb);
      case 'finish': return itemLabel('co.line.finish', 'finishes', id, L, fb);
      case 'colors': return tl('co.line.colors', L);
      case 'patternNails': return tl('co.line.patternNails', L);
      case 'pattern': return itemLabel('co.line.pattern', 'patterns', id, L, fb);
      case 'charms': return tl('co.line.charms', L);
      case 'charm': return itemLabel('co.line.charm', 'charms', id, L, fb);
      case 'qty': return tl('co.line.qty', L);
      case 'express': return tl('order.express', L);
      case 'giftWrap': return tl('order.giftWrap', L);
      case 'item':
        it = findItem('designs', id);
        return (it && pickL(it.name, L)) || fb || tl('order.ready', L);
      default: return fb;
    }
  }

  /* The price to show for an order: prefer what was stored when it was placed
     (rates may have changed since), only re-labelled into the asked language. */
  function priceOf(order, lang) {
    var L = normLang(lang);
    var o = isObj(order) ? order : {};
    var p = isObj(o.price) ? o.price : null;
    var lines = [], i, src;

    if (p && Array.isArray(p.lines)) {
      src = p.lines;
      for (i = 0; i < src.length; i++) {
        if (!isObj(src[i])) continue;
        lines.push({
          key: str(src[i].key),
          label: relabel(src[i], L) || str(src[i].label),
          amount: r2(src[i].amount),
          qty: intOf(src[i].qty, 1, 0)
        });
      }
      return {
        lines: lines,
        subtotal: r2(p.subtotal),
        shipping: r2(p.shipping),
        vat: r2(p.vat),
        total: r2(p.total),
        deposit: r2(p.deposit),
        currency: currencyOf(L)
      };
    }

    if (o.kind === 'ready') {
      return buildReady(o.item, o.qty, { express: o.express, giftWrap: o.giftWrap }, L);
    }
    return buildCustom(o.design, L);
  }

  /* ====================================================================== */
  /* 4. Order numbers                                                        */
  /* ====================================================================== */

  function nextNumber() {
    var orders = slist('orders');
    var stored = intOf(sget(SEQ_PATH, 0), 0, 0);
    var top = 0, i, m, n;

    for (i = 0; i < orders.length; i++) {
      m = /(\d+)\s*$/.exec(str(orders[i] && orders[i].no));
      n = m ? intOf(m[1], 0, 0) : 0;
      if (n > top) top = n;
    }
    if (orders.length > top) top = orders.length;
    if (stored > top) top = stored;

    top += 1;
    try { if (SN.Store && SN.Store.set) SN.Store.set(SEQ_PATH, top); }
    catch (e) { console.warn('[SN.Checkout] could not persist the order counter', e); }
    return 'SN-' + pad4(top);
  }

  /* ====================================================================== */
  /* 5. WhatsApp                                                             */
  /* ====================================================================== */

  function waDigits() {
    return str(sget('settings.whatsapp', '')).replace(/[^0-9]/g, '');
  }

  function waLink(text) {
    var n = waDigits();
    if (!n) return '';
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent(str(text));
  }

  /* ====================================================================== */
  /* 6. Plain-text summary (WhatsApp + copy)                                 */
  /* ====================================================================== */

  function stampOf(ts) {
    var d = new Date(numOf(ts, Date.now()));
    function p(n) { return (n < 10 ? '0' : '') + n; }
    if (isNaN(d.getTime())) d = new Date();
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function colorName(hex, lang) {
    var want = hexKey(hex), list, i;
    if (!want) return '';
    list = slist('colors');
    for (i = 0; i < list.length; i++) {
      if (isObj(list[i]) && hexKey(list[i].hex) === want) {
        return pickL(list[i].name, lang) || want;
      }
    }
    return want;
  }

  function skinName(hex, lang) {
    var want = hexKey(hex), list, i;
    if (!want) return '';
    list = slist('skinTones');
    for (i = 0; i < list.length; i++) {
      if (isObj(list[i]) && hexKey(list[i].hex) === want) {
        return pickL(list[i].name, lang) || want;
      }
    }
    return want;
  }

  function patternName(kind, lang) {
    var k = str(kind), list, i;
    if (!k || k === 'none') return '';
    list = slist('patterns');
    for (i = 0; i < list.length; i++) {
      if (isObj(list[i]) && str(list[i].kind) === k) return pickL(list[i].name, lang) || k;
    }
    return k;
  }

  function charmsText(nail, lang) {
    var list = Array.isArray(nail.charms) ? nail.charms : [];
    var order = [], count = {}, out = [], i, id, it, name;
    for (i = 0; i < list.length; i++) {
      id = isObj(list[i]) ? str(list[i].id) : '';
      if (!id) continue;
      if (!has(count, id)) { count[id] = 0; order.push(id); }
      count[id]++;
    }
    for (i = 0; i < order.length; i++) {
      it = findItem('charms', order[i]);
      name = it ? (pickL(it.name, lang) || order[i]) : order[i];
      if (it && it.glyph) name = str(it.glyph) + ' ' + name;
      out.push(count[order[i]] > 1 ? (name + ' ×' + count[order[i]]) : name);
    }
    return out.join(normLang(lang) === 'ar' ? '، ' : ', ');
  }

  function sizeLabel(idx) {
    var guide = slist('sizeGuide');
    var i = intOf(idx, -1, -1);
    if (i >= 0 && i < guide.length && isObj(guide[i])) {
      return str(guide[i].label !== undefined ? guide[i].label : i);
    }
    return i >= 0 ? String(i) : '—';
  }

  function sizesLine(design, side, lang) {
    var list = fingers(), out = [], i, key, fk;
    for (i = 0; i < list.length; i++) {
      fk = list[i] && list[i].key;
      if (!fk) continue;
      key = side + fk.charAt(0).toUpperCase() + fk.slice(1);
      out.push((pickL(list[i].name, lang) || fk) + ' ' +
        sizeLabel(isObj(design) && isObj(design.sizes) ? design.sizes[key] : undefined));
    }
    return out.join(' · ');
  }

  function sidesOf(design) {
    var h = handOf(design);
    return h === 'both' ? ['right', 'left'] : [h];
  }

  function designBlock(design, lang, out) {
    var L = normLang(lang);
    var d = isObj(design) ? design : {};
    var sides = sidesOf(d), keys = activeKeys(d);
    var i, j, side, key, nail, parts, txt, name;

    out.push(tl('co.designTitle', L));
    name = findItem('shapes', d.shape);
    out.push(tl('co.f.shape', L) + ': ' + (name ? (pickL(name.name, L) || str(d.shape)) : str(d.shape)));
    name = findItem('lengths', d.length);
    out.push(tl('co.f.length', L) + ': ' + (name ? (pickL(name.name, L) || str(d.length)) : str(d.length)));
    out.push(tl('co.f.hand', L) + ': ' + tl('co.hand.' + handOf(d), L));
    if (d.skin) out.push(tl('co.f.skin', L) + ': ' + (skinName(d.skin, L) || str(d.skin)));

    for (i = 0; i < sides.length; i++) {
      out.push(tl('co.f.sizes', L) + ' — ' + tl('co.hand.' + sides[i], L) + ': ' +
        sizesLine(d, sides[i], L));
    }

    out.push('');
    out.push(tl('co.s.nails', L));
    for (i = 0; i < sides.length; i++) {
      side = sides[i];
      if (sides.length > 1) out.push('[' + tl('co.hand.' + side, L) + ']');
      for (j = 0; j < keys.length; j++) {
        key = keys[j];
        if (String(key).indexOf(side) !== 0) continue;
        nail = nailOf(d, key);
        parts = [];
        txt = colorName(nail.color, L);
        if (txt) parts.push(txt);
        name = findItem('finishes', nail.finish);
        txt = name ? (pickL(name.name, L) || str(nail.finish)) : str(nail.finish);
        if (txt) parts.push(txt);
        txt = patternName(isObj(nail.pattern) ? nail.pattern.kind : '', L);
        if (txt) parts.push(txt);
        txt = charmsText(nail, L);
        if (txt) parts.push(txt);
        if (!parts.length) parts.push(tl('co.f.none', L));
        out.push('- ' + fingerName(key, L) + ': ' + parts.join(' · '));
      }
    }
  }

  function summary(order, lang) {
    var L = normLang(lang);
    var o = isObj(order) ? order : {};
    var out = [];
    var brand, cust, p, lines, i, line, label, txt, ritem, ref;

    try {
      brand = pickL(sget('settings.brand', null), L);
      out.push((brand ? brand + ' — ' : '') + tl('co.s.newOrder', L));
      if (o.no) out.push(tl('order.number', L) + ': ' + str(o.no));
      out.push(tl('order.date', L) + ': ' + stampOf(o.ts));
      out.push('');

      cust = isObj(o.customer) ? o.customer : {};
      out.push(tl('order.customer', L));
      if (trim(cust.name)) out.push(tl('order.name', L) + ': ' + trim(cust.name));
      if (trim(cust.phone)) out.push(tl('order.phone', L) + ': ' + trim(cust.phone));
      if (trim(cust.city)) out.push(tl('order.city', L) + ': ' + trim(cust.city));
      if (trim(cust.address)) out.push(tl('order.address', L) + ': ' + trim(cust.address));
      if (trim(cust.note)) out.push(tl('order.note', L) + ': ' + trim(cust.note));
      out.push('');

      out.push(tl('co.s.type', L) + ': ' +
        tl(o.kind === 'ready' ? 'order.ready' : 'order.custom', L));
      out.push(tl('order.qty', L) + ': ' + fmtNum(intOf(o.qty, 1, 1), L));
      txt = isObj(o.payment) ? str(o.payment.name) : '';
      if (isObj(o.payment) && o.payment.id) {
        line = findItem('paymentMethods', o.payment.id);
        if (line) txt = pickL(line.name, L) || txt;
      }
      if (txt) out.push(tl('pay.title', L) + ': ' + txt);
      out.push('');

      if (o.kind === 'ready') {
        ritem = isObj(o.item) ? o.item : {};
        txt = '';
        if (ritem.id) {
          ref = findItem('designs', ritem.id);
          if (ref) txt = pickL(ref.name, L);
        }
        if (!txt) txt = pickL(ritem.name, L);
        out.push(tl('co.designTitle', L));
        out.push(tl('co.f.design', L) + ': ' + (txt || '—'));
      } else if (isObj(o.design)) {
        designBlock(o.design, L, out);
      }
      out.push('');

      p = priceOf(o, L);
      lines = Array.isArray(p.lines) ? p.lines : [];
      out.push(tl('co.s.price', L));
      /* the itemised lines already carry a colon inside the label
         («الشكل: كوفن»), so they are separated with a dash instead */
      for (i = 0; i < lines.length; i++) {
        label = str(lines[i].label);
        if (intOf(lines[i].qty, 1, 0) > 1) label += ' ×' + fmtNum(lines[i].qty, L);
        out.push(label + ' — ' + moneyL(lines[i].amount, L));
      }
      out.push(tl('common.subtotal', L) + ': ' + moneyL(p.subtotal, L));
      out.push(tl('order.shipping', L) + ': ' +
        (p.shipping > 0 ? moneyL(p.shipping, L) : tl('common.free', L)));
      if (p.vat > 0) out.push(tl('order.vat', L) + ': ' + moneyL(p.vat, L));
      out.push(tl('order.total', L) + ': ' + moneyL(p.total, L));
      if (p.deposit > 0) out.push(tl('order.deposit', L) + ': ' + moneyL(p.deposit, L));
    } catch (e) {
      console.warn('[SN.Checkout] summary failed', e);
      if (!out.length) out.push(tl('co.s.newOrder', L));
    }

    return out.join('\n').replace(/\n{3,}/g, '\n\n');
  }

  /* ====================================================================== */
  /* 7. Persist + notify                                                     */
  /* ====================================================================== */

  function isJsonEndpoint(url) {
    var u = str(url);
    return /formspree/i.test(u) || /\.json(\?|#|$)/i.test(u);
  }

  function notify(order) {
    var o = isObj(order) ? order : {};
    var endpoint = trim(sget('settings.notifyEndpoint', ''));
    var key = trim(sget('settings.notifyKey', ''));
    var L = normLang(o.lang);
    var brand = pickL(sget('settings.brand', null), L);
    var msg, subject, name, phone, fd, k, payload;

    if (!endpoint || typeof fetch !== 'function') return null;

    msg = summary(o, L);
    subject = tl('co.s.newOrder', L) + ' ' + str(o.no) + (brand ? ' — ' + brand : '');
    name = trim(isObj(o.customer) ? o.customer.name : '') || str(o.no);
    phone = trim(isObj(o.customer) ? o.customer.phone : '');

    payload = {
      subject: subject,
      from_name: name,
      message: msg,
      phone: phone
    };
    if (key) payload.access_key = key;

    if (isJsonEndpoint(endpoint)) {
      return fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (typeof FormData === 'undefined') return null;
    fd = new FormData();
    for (k in payload) { if (has(payload, k)) fd.append(k, str(payload[k])); }
    return fetch(endpoint, { method: 'POST', body: fd });
  }

  function submit(order) {
    var o = isObj(order) ? clone(order) : {};
    var saved, link, req;

    if (!o.no) o.no = nextNumber();
    if (!o.ts) o.ts = Date.now();
    if (!o.status) o.status = 'new';
    if (!o.lang) o.lang = curLang();
    if (o.kind !== 'ready') o.kind = 'custom';

    try {
      saved = (SN.Store && SN.Store.add) ? SN.Store.add('orders', o) : o;
    } catch (e) {
      console.warn('[SN.Checkout] could not persist the order', e);
      saved = o;
    }
    if (!isObj(saved)) saved = o;

    /* The webhook must never hold the customer up, and must never break the
       order when it fails — fire it, catch everything, carry on. */
    try {
      req = notify(saved);
      if (req && typeof req.then === 'function') {
        req.then(function (res) {
          if (res && res.ok === false) {
            console.warn('[SN.Checkout] the notify endpoint answered ' + res.status);
            if (SN.UI && SN.UI.toast) SN.UI.toast(T('order.notifyErr'), 'info');
          }
        }, function (err) {
          console.warn('[SN.Checkout] order notification failed', err);
          if (SN.UI && SN.UI.toast) SN.UI.toast(T('order.notifyErr'), 'info');
        });
      }
    } catch (e2) {
      console.warn('[SN.Checkout] order notification failed', e2);
    }

    /* Opened synchronously inside the click gesture so no popup blocker eats it. */
    try {
      if (sget('settings.whatsappOrder', true)) {
        link = waLink(summary(saved, saved.lang));
        if (link) window.open(link, '_blank', 'noopener');
      }
    } catch (e3) {
      console.warn('[SN.Checkout] could not open WhatsApp', e3);
    }

    return Promise.resolve(saved);
  }

  /* ====================================================================== */
  /* 8. Saved customer block                                                 */
  /* ====================================================================== */

  function loadCustomer() {
    var raw = null, o = null;
    try { raw = window.localStorage.getItem(CUST_KEY); }
    catch (e) { raw = null; }
    if (!raw) return {};
    try { o = JSON.parse(raw); }
    catch (e2) { o = null; }
    if (!isObj(o)) return {};
    return {
      name: str(o.name), phone: str(o.phone),
      city: str(o.city), address: str(o.address)
    };
  }

  function saveCustomer(c) {
    var o = isObj(c) ? c : {};
    try {
      window.localStorage.setItem(CUST_KEY, JSON.stringify({
        name: trim(o.name), phone: trim(o.phone),
        city: trim(o.city), address: trim(o.address)
      }));
    } catch (e) { /* Safari private mode — nothing to pre-fill next time */ }
  }

  /* ====================================================================== */
  /* 9. The checkout dialog                                                  */
  /* ====================================================================== */

  var PHONE_RE = /^[+0-9\s-]{8,20}$/;
  var IBAN_RE = /\bSA[0-9][0-9\s]{20,34}/i;

  function ibanIn(text) {
    var m = IBAN_RE.exec(str(text));
    var flat;
    if (!m) return '';
    flat = m[0].replace(/\s+/g, '').toUpperCase();
    return flat.length === 24 ? flat : '';
  }

  function clear(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function payIcon(name) {
    var n = str(name);
    return has(PAY_ICON, n) ? PAY_ICON[n] : 'check';
  }

  function enabledPayments() {
    var list = slist('paymentMethods'), out = [], i;
    for (i = 0; i < list.length; i++) {
      if (isObj(list[i]) && list[i].enabled !== false) out.push(list[i]);
    }
    return out;
  }

  function contactRows(U) {
    var rows = [];
    var phone = trim(sget('settings.phone', ''));
    var mail = trim(sget('settings.email', ''));
    var ig = trim(sget('settings.instagram', '')).replace(/^@/, '');
    var sc = trim(sget('settings.snapchat', '')).replace(/^@/, '');
    var tt = trim(sget('settings.tiktok', '')).replace(/^@/, '');

    function row(iconName, label, href, ltr) {
      rows.push(U.el('a', {
        'class': 'btn btn-line btn-sm',
        href: href, rel: 'noopener', target: '_blank'
      }, [
        U.el('span', { 'class': 'btn-ico', html: U.icon(iconName, 16), 'aria-hidden': 'true' }),
        U.el('span', { 'class': ltr ? 'ltr' : null, text: label })
      ]));
    }

    if (phone) row('phone', phone, 'tel:' + phone.replace(/\s+/g, ''), true);
    if (mail) row('mail', mail, 'mailto:' + mail, true);
    if (ig) row('instagram', '@' + ig, 'https://instagram.com/' + encodeURIComponent(ig), true);
    if (sc) row('snapchat', '@' + sc, 'https://snapchat.com/add/' + encodeURIComponent(sc), true);
    if (tt) row('tiktok', '@' + tt, 'https://tiktok.com/@' + encodeURIComponent(tt), true);
    return rows;
  }

  function open(opts) {
    var U = SN.UI;
    var o = isObj(opts) ? opts : {};
    var kind = o.kind === 'ready' ? 'ready' : 'custom';
    var item = kind === 'ready' ? (isObj(o.item) ? o.item : null) : null;
    var design = null;
    var st, refs = {}, m, foot, stepHost, offLang = null;
    var payName = 'sn-pay-' + Math.random().toString(36).slice(2, 7);

    if (!U || typeof U.sheet !== 'function' || typeof U.el !== 'function') return null;

    if (kind === 'ready' && !item) {
      if (U.toast) U.toast(T('common.error'), 'err');
      return null;
    }

    if (kind === 'custom') {
      design = clone(isObj(o.design) ? o.design
        : (SN.Nail && SN.Nail.blank ? SN.Nail.blank() : {}));
      if (!isObj(design)) design = {};
    }

    st = {
      step: 1,
      reached: 1,
      kind: kind,
      item: item,
      design: design,
      qty: kind === 'custom' ? intOf(design.qty, 1, 1, 99) : intOf(o.qty, 1, 1, 99),
      express: kind === 'custom' ? !!design.express : !!o.express,
      giftWrap: kind === 'custom' ? !!design.giftWrap : !!o.giftWrap,
      cust: loadCustomer(),
      note: kind === 'custom' ? str(design.notes) : '',
      payId: '',
      terms: false,
      busy: false,
      done: false,
      order: null
    };

    /* ------------------------------------------------------------- pricing */

    function syncDesign() {
      if (st.kind !== 'custom' || !isObj(st.design)) return;
      st.design.qty = st.qty;
      st.design.express = st.express;
      st.design.giftWrap = st.giftWrap;
      st.design.notes = st.note;
    }

    function price() {
      syncDesign();
      return st.kind === 'ready'
        ? priceReady(st.item, st.qty, { express: st.express, giftWrap: st.giftWrap })
        : priceCustom(st.design);
    }

    /* ------------------------------------------------------------ chrome */

    function stepTab(n, key) {
      var on = st.step === n;
      return U.el('button', {
        'class': 'tab' + (on ? ' tab-on' : ''),
        type: 'button',
        'aria-current': on ? 'true' : null,
        disabled: n > st.reached ? true : null,
        on: {
          click: function () {
            if (n === st.step) return;
            if (n < st.step) go(n);
            else if (n <= st.reached && stepValid(st.step)) go(n);
          }
        }
      }, [
        U.el('span', { 'class': 'tab-n', text: String(n) }),
        U.el('span', { text: T(key) })
      ]);
    }

    /* The step + total bar sticks to the top of the scrolling modal body.
       It carries the body's top padding itself (see flushBody below) instead
       of pulling itself up with a negative margin: a sticky box is clamped
       inside its containing block, so the negative margin was ignored while
       the box still painted 24px lower than the space it reserved — which is
       exactly how much of the first heading it used to cover. */
    function buildBar() {
      var bar = U.el('div', {
        'class': 'stack',
        style: {
          position: 'sticky',
          insetBlockStart: '0',
          zIndex: '4',
          gap: '10px',
          background: 'var(--bg-2)',
          paddingBlockStart: 'clamp(16px,3vw,24px)',
          paddingBlockEnd: '12px',
          borderBlockEnd: '1px solid var(--line)'
        }
      });
      refs.tabs = U.el('div', {
        'class': 'tabs',
        style: { marginBlockEnd: '0', flex: '1 1 220px' },
        'aria-label': T('common.step')
      });
      refs.totalLbl = U.el('span', {
        'class': 'tiny muted', style: { display: 'block' }, text: T('order.total')
      });
      refs.totalVal = U.el('strong', {
        'class': 'num h4',
        style: { display: 'block', color: 'var(--rose-3)', lineHeight: '1.3' },
        text: ''
      });
      refs.bar = U.el('span', { style: { display: 'block' } });

      bar.appendChild(U.el('div', { 'class': 'row', style: { gap: '12px' } }, [
        refs.tabs,
        U.el('div', { 'class': 'row-end', style: { textAlign: 'end' } }, [
          refs.totalLbl,
          refs.totalVal
        ])
      ]));
      bar.appendChild(U.el('div', { 'class': 'progress' }, refs.bar));
      return bar;
    }

    function syncBar() {
      var p = price();
      clear(refs.tabs);
      refs.tabs.setAttribute('aria-label', T('common.step'));
      refs.tabs.appendChild(stepTab(1, 'order.step1'));
      refs.tabs.appendChild(stepTab(2, 'order.step2'));
      refs.tabs.appendChild(stepTab(3, 'order.step3'));
      refs.totalLbl.textContent = T('order.total');
      refs.totalVal.textContent = moneyL(p.total, curLang());
      try { refs.bar.style.setProperty('inline-size', Math.round((st.step / 3) * 100) + '%'); }
      catch (e) { refs.bar.style.width = Math.round((st.step / 3) * 100) + '%'; }
      return p;
    }

    /* --------------------------------------------------------- validation */

    function setErr(input, box, msg) {
      if (box) box.textContent = msg || '';
      if (input) {
        if (msg) input.setAttribute('aria-invalid', 'true');
        else input.removeAttribute('aria-invalid');
      }
    }

    function validateInfo(paint) {
      var okName = trim(st.cust.name).length >= 2;
      var okPhone = PHONE_RE.test(trim(st.cust.phone));
      if (paint) {
        setErr(refs.name, refs.nameErr, okName ? '' : T('order.nameErr'));
        setErr(refs.phone, refs.phoneErr, okPhone ? '' : T('order.phoneErr'));
        if (!okName && refs.name) { try { refs.name.focus(); } catch (e) { /* ignore */ } }
        else if (!okPhone && refs.phone) { try { refs.phone.focus(); } catch (e2) { /* ignore */ } }
      }
      return okName && okPhone;
    }

    function validatePay(paint) {
      var ok = !!st.payId || enabledPayments().length === 0;
      if (paint && refs.payErr) refs.payErr.textContent = ok ? '' : T('pay.required');
      if (paint && !ok && refs.payFirst) { try { refs.payFirst.focus(); } catch (e) { /* ignore */ } }
      return ok;
    }

    function validateTerms(paint) {
      var ok = !!st.terms;
      if (paint && refs.termsErr) refs.termsErr.textContent = ok ? '' : T('order.termsErr');
      if (paint && !ok && refs.terms) { try { refs.terms.focus(); } catch (e) { /* ignore */ } }
      return ok;
    }

    function stepValid(n) {
      if (n === 1) return validateInfo(false);
      if (n === 2) return validatePay(false);
      return true;
    }

    /* ------------------------------------------------------------ step 1 */

    function textField(labelKey, phKey, value, multiline, onInput, required) {
      var id = 'sn-co-' + labelKey.replace(/\W+/g, '-') + '-' + Math.random().toString(36).slice(2, 6);
      var errId = id + '-err';
      var input = U.el(multiline ? 'textarea' : 'input', {
        'class': multiline ? 'textarea' : 'input',
        id: id,
        rows: multiline ? '2' : null,
        type: multiline ? null : 'text',
        value: str(value),
        placeholder: phKey ? T(phKey) : null,
        'aria-describedby': errId,
        'aria-required': required ? 'true' : null,
        on: { input: function (ev) { onInput(ev.target.value); } }
      });
      var err = U.el('span', { 'class': 'field-err', id: errId, role: 'alert' });
      var field = U.el('div', { 'class': 'field' }, [
        U.el('label', { 'class': 'label', 'for': id }, [
          U.el('span', { text: T(labelKey) }),
          required ? U.el('span', { style: { color: 'var(--err)' }, text: ' *' }) : null
        ]),
        input, err
      ]);
      if (multiline) { try { input.value = str(value); } catch (e) { /* ignore */ } }
      return { field: field, input: input, err: err };
    }

    function qtyRow() {
      var input = U.el('input', {
        'class': 'input num',
        type: 'number', min: '1', max: '99', step: '1',
        value: String(st.qty),
        'aria-label': T('order.qty'),
        style: { inlineSize: '84px', textAlign: 'center' },
        on: {
          change: function (ev) {
            st.qty = intOf(ev.target.value, 1, 1, 99);
            ev.target.value = String(st.qty);
            syncBar();
          }
        }
      });
      function bump(d) {
        st.qty = intOf(st.qty + d, 1, 1, 99);
        try { input.value = String(st.qty); } catch (e) { /* ignore */ }
        syncBar();
      }
      return U.el('div', { 'class': 'field' }, [
        U.el('span', { 'class': 'label', text: T('order.qty') }),
        U.el('div', { 'class': 'row', style: { gap: '8px' } }, [
          U.el('button', {
            'class': 'icon-btn icon-btn-line', type: 'button',
            'aria-label': T('a11y.decrease'), html: U.icon('minus', 16),
            on: { click: function () { bump(-1); } }
          }),
          input,
          U.el('button', {
            'class': 'icon-btn icon-btn-line', type: 'button',
            'aria-label': T('a11y.increase'), html: U.icon('plus', 16),
            on: { click: function () { bump(1); } }
          })
        ]),
        U.el('span', {
          'class': 'hint',
          /* a one-hand custom set is 5 nails, not 10 */
          text: T(st.kind === 'custom' && handOf(st.design) !== 'both'
            ? 'co.qtyHintOne' : 'co.qtyHint')
        })
      ]);
    }

    function toggleRow(labelKey, noteKey, rate, getter, setter) {
      var input = U.el('input', {
        type: 'checkbox',
        checked: getter() ? true : null,
        on: {
          change: function (ev) { setter(!!ev.target.checked); syncBar(); }
        }
      });
      return U.el('label', { 'class': 'switch', style: { alignItems: 'flex-start' } }, [
        input,
        U.el('span', { 'class': 'switch-ui' }),
        U.el('span', { 'class': 'switch-lbl' }, [
          U.el('span', { 'class': 'row', style: { gap: '6px' } }, [
            U.el('strong', { text: T(labelKey) }),
            rate > 0 ? U.el('span', { 'class': 'pill pill-rose tiny num', text: '+ ' + moneyL(rate, curLang()) }) : null
          ]),
          U.el('span', { 'class': 'hint', style: { display: 'block' }, text: T(noteKey) })
        ])
      ]);
    }

    function stepInfo() {
      var P = rates();
      var box = U.el('div', { 'class': 'stack', style: { gap: '16px' } });
      var head = U.el('h3', { 'class': 'h4', tabindex: '-1', text: T('order.customer') });
      var f;

      box.appendChild(head);
      refs.head = head;

      box.appendChild(U.el('div', { 'class': 'panel panel-soft', style: { padding: '12px 14px' } }, [
        U.el('strong', { style: { display: 'block' }, text: kindTitle() }),
        U.el('span', { 'class': 'hint', style: { display: 'block' }, text: kindSub() })
      ]));

      f = textField('order.name', 'order.namePh', st.cust.name, false,
        function (v) { st.cust.name = v; setErr(refs.name, refs.nameErr, ''); }, true);
      refs.name = f.input; refs.nameErr = f.err;
      box.appendChild(f.field);

      f = textField('order.phone', 'order.phonePh', st.cust.phone, false,
        function (v) { st.cust.phone = v; setErr(refs.phone, refs.phoneErr, ''); }, true);
      refs.phone = f.input; refs.phoneErr = f.err;
      try { refs.phone.setAttribute('inputmode', 'tel'); refs.phone.setAttribute('dir', 'ltr'); }
      catch (e) { /* ignore */ }
      box.appendChild(f.field);

      f = textField('order.city', 'order.cityPh', st.cust.city, false,
        function (v) { st.cust.city = v; });
      box.appendChild(f.field);

      f = textField('order.address', 'order.addressPh', st.cust.address, true,
        function (v) { st.cust.address = v; });
      box.appendChild(f.field);

      f = textField('order.note', 'order.notePh', st.note, true,
        function (v) { st.note = v; });
      box.appendChild(f.field);

      box.appendChild(U.el('hr', { 'class': 'divider', style: { marginBlock: '4px' } }));
      box.appendChild(U.el('h3', { 'class': 'h4', text: T('co.options') }));
      box.appendChild(qtyRow());
      box.appendChild(toggleRow('order.express', 'order.expressNote', P.express,
        function () { return st.express; }, function (v) { st.express = v; }));
      box.appendChild(toggleRow('order.giftWrap', 'order.giftWrapNote', P.giftWrap,
        function () { return st.giftWrap; }, function (v) { st.giftWrap = v; }));
      box.appendChild(U.el('p', { 'class': 'hint', text: T('co.savedHint') }));
      return box;
    }

    /* ------------------------------------------------------------ step 2 */

    function payDetails(method) {
      var L = curLang();
      var text = method ? pickL(method.details, L) : '';
      var iban = ibanIn(text);
      var wrap;
      if (!method) return null;
      if (!text) text = pickL(method.note, L);
      if (!text) return null;

      wrap = U.el('div', { 'class': 'note', style: { flexDirection: 'column', gap: '10px' } }, [
        U.el('strong', { text: T('pay.details') }),
        U.el('span', { style: { whiteSpace: 'pre-line' }, text: text })
      ]);
      if (iban) {
        wrap.appendChild(U.el('button', {
          'class': 'btn btn-line btn-sm', type: 'button',
          on: {
            click: function () {
              if (!U.copy) return;
              U.copy(iban).then(function (ok) {
                if (U.toast) U.toast(T(ok ? 'pay.ibanCopied' : 'common.error'), ok ? 'ok' : 'err');
              });
            }
          }
        }, [
          U.el('span', { 'class': 'btn-ico', html: U.icon('copy', 16), 'aria-hidden': 'true' }),
          U.el('span', { text: T('pay.copyIban') })
        ]));
      }
      return wrap;
    }

    function stepPay() {
      var L = curLang();
      var list = enabledPayments();
      var box = U.el('div', { 'class': 'stack', style: { gap: '14px' } });
      var head = U.el('h3', { 'class': 'h4', tabindex: '-1', text: T('pay.title') });
      var group, i, det, first = null;

      refs.head = head;
      refs.payFirst = null;
      box.appendChild(head);

      if (!list.length) {
        box.appendChild(U.el('div', { 'class': 'note note-warn' }, [
          U.el('span', { html: U.icon('sparkle', 18), 'aria-hidden': 'true' }),
          U.el('span', {}, [
            U.el('strong', { style: { display: 'block' }, text: T('pay.noneTitle') }),
            U.el('span', { text: T('pay.noneText') })
          ])
        ]));
        st.payId = '';
        return box;
      }

      box.appendChild(U.el('p', { 'class': 'hint', text: T('pay.choose') }));
      det = U.el('div');
      group = U.el('div', {
        'class': 'stack', style: { gap: '10px' },
        role: 'radiogroup', 'aria-label': T('pay.title')
      });

      for (i = 0; i < list.length; i++) {
        (function (method) {
          var input = U.el('input', {
            type: 'radio', name: payName, value: str(method.id),
            checked: st.payId === method.id ? true : null,
            on: {
              change: function () {
                st.payId = str(method.id);
                if (refs.payErr) refs.payErr.textContent = '';
                clear(det);
                var d = payDetails(method);
                if (d) det.appendChild(d);
                syncBar();
              }
            }
          });
          if (!first) first = input;
          group.appendChild(U.el('label', { 'class': 'check check-card' }, [
            input,
            U.el('span', { style: { minInlineSize: '0' } }, [
              U.el('span', { 'class': 'row', style: { gap: '8px' } }, [
                U.el('span', {
                  html: U.icon(payIcon(method.icon), 18),
                  style: { color: 'var(--rose-2)', display: 'inline-flex' },
                  'aria-hidden': 'true'
                }),
                U.el('strong', { text: pickL(method.name, L) || str(method.id) })
              ]),
              U.el('span', { 'class': 'hint', style: { display: 'block' }, text: pickL(method.note, L) })
            ])
          ]));
        }(list[i]));
      }

      refs.payFirst = first;
      box.appendChild(group);
      refs.payErr = U.el('span', { 'class': 'field-err', role: 'alert' });
      box.appendChild(refs.payErr);
      box.appendChild(det);
      box.appendChild(U.el('p', { 'class': 'hint', text: T('pay.secure') }));

      if (st.payId) {
        var picked = findItem('paymentMethods', st.payId);
        var d = payDetails(picked);
        if (d) det.appendChild(d);
      }
      return box;
    }

    /* ------------------------------------------------------------ step 3 */

    function reviewRow(labelKey, value) {
      if (!trim(value)) return null;
      return U.el('div', { 'class': 'row', style: { gap: '8px', alignItems: 'baseline' } }, [
        U.el('span', { 'class': 'tiny muted', style: { minInlineSize: '76px' }, text: T(labelKey) }),
        U.el('span', { text: trim(value) })
      ]);
    }

    function priceTable(p) {
      var body = U.el('tbody');
      var lines = Array.isArray(p.lines) ? p.lines : [];
      var i, label;

      function row(label2, amount, cls, isTotal) {
        return U.el('tr', { 'class': isTotal ? 'is-total' : null }, [
          U.el('td', {}, label2),
          U.el('td', { 'class': 'num' + (cls ? ' ' + cls : ''), text: amount })
        ]);
      }

      for (i = 0; i < lines.length; i++) {
        label = [U.el('span', { text: str(lines[i].label) })];
        if (intOf(lines[i].qty, 1, 0) > 1) {
          label.push(U.el('span', {
            'class': 'tiny muted num',
            text: '  ×' + fmtNum(lines[i].qty, curLang())
          }));
        }
        body.appendChild(row(label, moneyL(lines[i].amount, curLang())));
      }
      body.appendChild(row([U.el('span', { text: T('common.subtotal') })],
        moneyL(p.subtotal, curLang())));
      body.appendChild(row([U.el('span', { text: T('order.shipping') })],
        p.shipping > 0 ? moneyL(p.shipping, curLang()) : T('common.free')));
      if (p.vat > 0) {
        body.appendChild(row([U.el('span', { text: T('order.vat') })], moneyL(p.vat, curLang())));
      }
      body.appendChild(row([U.el('span', { text: T('order.total') })],
        moneyL(p.total, curLang()), null, true));
      if (p.deposit > 0) {
        body.appendChild(row([U.el('span', { 'class': 'muted', text: T('order.deposit') })],
          moneyL(p.deposit, curLang())));
      }

      return U.el('div', { 'class': 'table-wrap' }, U.el('table', { 'class': 'table table-sum' }, body));
    }

    function stepConfirm() {
      var L = curLang();
      var p = price();
      var box = U.el('div', { 'class': 'stack', style: { gap: '16px' } });
      var head = U.el('h3', { 'class': 'h4', tabindex: '-1', text: T('co.review') });
      var method = findItem('paymentMethods', st.payId);
      var thumbBox = null, svg, panel;

      refs.head = head;
      box.appendChild(head);

      panel = U.el('div', { 'class': 'panel panel-soft', 'style': { padding: '14px' } }, [
        U.el('div', { 'class': 'row', style: { gap: '8px', marginBlockEnd: '8px' } }, [
          U.el('strong', { text: T('order.customer') }),
          U.el('button', {
            'class': 'btn btn-ghost btn-sm row-end', type: 'button',
            text: T('co.edit'),
            on: { click: function () { go(1); } }
          })
        ]),
        reviewRow('order.name', st.cust.name),
        reviewRow('order.phone', st.cust.phone),
        reviewRow('order.city', st.cust.city),
        reviewRow('order.address', st.cust.address),
        reviewRow('order.note', st.note)
      ]);
      box.appendChild(panel);

      box.appendChild(U.el('div', { 'class': 'panel panel-soft', style: { padding: '14px' } }, [
        U.el('div', { 'class': 'row', style: { gap: '8px', marginBlockEnd: '8px' } }, [
          U.el('strong', { text: T('pay.title') }),
          U.el('button', {
            'class': 'btn btn-ghost btn-sm row-end', type: 'button',
            text: T('co.edit'),
            on: { click: function () { go(2); } }
          })
        ]),
        U.el('div', {
          text: method ? (pickL(method.name, L) || str(method.id)) : T('pay.noneText')
        })
      ]));

      if (st.kind === 'custom' && SN.Nail && typeof SN.Nail.thumb === 'function') {
        try {
          svg = SN.Nail.thumb(st.design, 132);
          if (svg) {
            thumbBox = U.el('div', { 'class': 'row', style: { gap: '12px' } }, [
              svg,
              U.el('div', {}, [
                U.el('strong', { style: { display: 'block' }, text: T('co.custom') }),
                U.el('span', { 'class': 'hint', text: T('co.customSub') })
              ])
            ]);
          }
        } catch (e) { thumbBox = null; }
      }
      if (thumbBox) box.appendChild(thumbBox);

      box.appendChild(U.el('h3', { 'class': 'h4', text: T('co.breakdown') }));
      box.appendChild(priceTable(p));

      refs.terms = U.el('input', {
        type: 'checkbox',
        checked: st.terms ? true : null,
        on: {
          change: function (ev) {
            st.terms = !!ev.target.checked;
            if (refs.termsErr) refs.termsErr.textContent = '';
          }
        }
      });
      box.appendChild(U.el('label', { 'class': 'check check-card' }, [
        refs.terms,
        U.el('span', { text: T('order.terms') })
      ]));
      refs.termsErr = U.el('span', { 'class': 'field-err', role: 'alert' });
      box.appendChild(refs.termsErr);
      return box;
    }

    /* ----------------------------------------------------------- success */

    function successPanel(order) {
      /* deliberately NOT .empty — that component dims its text and restyles
         any .ico inside it, which would mute the confirmation. */
      var box = U.el('div', {
        style: {
          display: 'grid', placeItems: 'center', gap: '14px',
          textAlign: 'center', paddingBlock: '14px'
        }
      });
      var link = waLink('');
      var btns = U.el('div', { 'class': 'btns', style: { justifyContent: 'center' } });
      var imgBtn;

      box.appendChild(U.el('span', {
        html: U.icon('check', 34),
        style: {
          display: 'inline-flex', color: 'var(--ok)', background: 'var(--ok-soft)',
          inlineSize: '68px', blockSize: '68px', borderRadius: '999px',
          alignItems: 'center', justifyContent: 'center'
        },
        'aria-hidden': 'true'
      }));
      box.appendChild(U.el('h3', { 'class': 'h2 display', tabindex: '-1', text: T('order.sent') }));
      box.appendChild(U.el('div', {
        'class': 'pill pill-gold num',
        style: { fontSize: '1.15rem', fontWeight: '800' },
        text: str(order.no)
      }));
      box.appendChild(U.el('p', { 'class': 'lead', text: T('order.thanks') }));

      btns.appendChild(U.el('button', {
        'class': 'btn btn-line', type: 'button',
        on: {
          click: function () {
            if (!U.copy) return;
            U.copy(summary(order, curLang())).then(function (ok) {
              if (U.toast) U.toast(T(ok ? 'common.copied' : 'common.error'), ok ? 'ok' : 'err');
            });
          }
        }
      }, [
        U.el('span', { 'class': 'btn-ico', html: U.icon('copy', 18), 'aria-hidden': 'true' }),
        U.el('span', { text: T('order.copySummary') })
      ]));

      if (link) {
        btns.appendChild(U.el('a', {
          'class': 'btn btn-pri',
          href: waLink(summary(order, curLang())),
          target: '_blank', rel: 'noopener'
        }, [
          U.el('span', { 'class': 'btn-ico', html: U.icon('whatsapp', 18), 'aria-hidden': 'true' }),
          U.el('span', { text: T('order.openWa') })
        ]));
      }

      if (st.kind === 'custom' && SN.Nail &&
        typeof SN.Nail.preview === 'function' && typeof SN.Nail.toPNG === 'function') {
        imgBtn = U.el('button', {
          'class': 'btn btn-line', type: 'button',
          on: {
            click: function () {
              var svg;
              if (imgBtn.disabled) return;
              imgBtn.disabled = true;
              if (U.toast) U.toast(T('co.imgWait'), 'info');
              try {
                svg = SN.Nail.preview(order.design, { w: 760, interactive: false });
              } catch (e) {
                imgBtn.disabled = false;
                if (U.toast) U.toast(T('co.imgErr'), 'err');
                return;
              }
              SN.Nail.toPNG(svg, { scale: 2, bg: '#FFF8F6' }).then(function (blob) {
                imgBtn.disabled = false;
                if (U.download) U.download(blob, 'shosh-nail-' + str(order.no) + '.png', 'image/png');
              }, function (err) {
                imgBtn.disabled = false;
                console.warn('[SN.Checkout] design image export failed', err);
                if (U.toast) U.toast(T('co.imgErr'), 'err');
              });
            }
          }
        }, [
          U.el('span', { 'class': 'btn-ico', html: U.icon('download', 18), 'aria-hidden': 'true' }),
          U.el('span', { text: T('order.downloadImg') })
        ]);
        btns.appendChild(imgBtn);
      }

      btns.appendChild(U.el('a', {
        'class': 'btn btn-ghost', href: 'index.html#quiz'
      }, [
        U.el('span', { 'class': 'btn-ico', html: U.icon('sparkle', 18), 'aria-hidden': 'true' }),
        U.el('span', { text: T('order.newDesign') })
      ]));
      box.appendChild(btns);

      if (!link) {
        box.appendChild(U.el('div', {
          'class': 'note note-warn',
          style: {
            marginBlockStart: '6px', flexDirection: 'column', gap: '10px',
            textAlign: 'start', inlineSize: '100%'
          }
        }, [
          U.el('strong', { text: T('co.noWa') }),
          U.el('span', { text: T('co.noWaText') }),
          U.el('div', { 'class': 'btns' }, contactRows(U))
        ]));
      }
      return box;
    }

    function showSuccess(order, focus) {
      st.done = true;
      st.order = order;
      clear(m.body);
      clear(foot);
      flushBody(false);            /* no sticky bar on this panel */
      m.body.appendChild(successPanel(order));
      foot.appendChild(U.el('button', {
        'class': 'btn btn-ghost', type: 'button', text: T('common.close'),
        on: { click: function () { m.close(); } }
      }));
      if (focus) {
        try {
          var h = U.qs ? U.qs('.h2', m.body) : null;
          if (h && h.focus) h.focus();
        } catch (e) { /* ignore */ }
      }
      if (focus && typeof o.onDone === 'function') {
        try { o.onDone(order); }
        catch (e2) { console.warn('[SN.Checkout] onDone handler failed', e2); }
      }
    }

    /* ------------------------------------------------------------ submit */

    function buildOrder() {
      var L = curLang();
      var method = findItem('paymentMethods', st.payId);
      var p = price();
      var order = {
        no: nextNumber(),
        ts: Date.now(),
        kind: st.kind,
        customer: {
          name: trim(st.cust.name),
          phone: trim(st.cust.phone),
          city: trim(st.cust.city),
          address: trim(st.cust.address),
          note: trim(st.note)
        },
        payment: {
          id: method ? str(method.id) : '',
          name: method ? (pickL(method.name, L) || str(method.id)) : ''
        },
        qty: st.qty,
        express: st.express,
        giftWrap: st.giftWrap,
        price: p,
        status: 'new',
        lang: L
      };
      if (st.kind === 'ready') {
        order.item = {
          id: str(st.item.id),
          name: pickL(st.item.name, L),
          price: numOf(st.item.price, 0)
        };
      } else {
        order.design = clone(st.design);
      }
      return order;
    }

    function doSubmit() {
      var order;
      if (st.busy) return;
      if (!validateInfo(false)) { go(1); validateInfo(true); return; }
      if (!validatePay(false)) { go(2); validatePay(true); return; }
      if (!validateTerms(true)) return;

      st.busy = true;
      renderFoot();
      saveCustomer(st.cust);
      order = buildOrder();

      submit(order).then(function (saved) {
        st.busy = false;
        showSuccess(isObj(saved) ? saved : order, true);
      }, function (err) {
        st.busy = false;
        console.warn('[SN.Checkout] submit failed', err);
        if (U.toast) U.toast(T('co.saveErr'), 'err');
        renderFoot();
      });
    }

    /* ----------------------------------------------------------- footer */

    function renderFoot() {
      clear(foot);
      if (st.done) return;

      foot.appendChild(U.el('button', {
        'class': 'btn btn-ghost', type: 'button',
        disabled: st.busy ? true : null,
        text: st.step === 1 ? T('common.cancel') : T('common.back'),
        on: {
          click: function () {
            if (st.step === 1) m.close();
            else go(st.step - 1);
          }
        }
      }));

      if (st.step < 3) {
        foot.appendChild(U.el('button', {
          'class': 'btn btn-pri', type: 'button', text: T('common.next'),
          on: {
            click: function () {
              if (st.step === 1) {
                if (!validateInfo(true)) return;
                saveCustomer(st.cust);
              } else if (st.step === 2 && !validatePay(true)) return;
              go(st.step + 1);
            }
          }
        }));
      } else {
        foot.appendChild(U.el('button', {
          'class': 'btn btn-pri', type: 'button',
          disabled: st.busy ? true : null,
          on: { click: doSubmit }
        }, [
          st.busy ? U.el('span', { 'class': 'spinner', style: { inlineSize: '16px', blockSize: '16px' } }) : null,
          U.el('span', { text: st.busy ? T('order.sending') : T('order.submit') })
        ]));
      }
    }

    /* ------------------------------------------------------------ render */

    function kindTitle() {
      if (st.kind === 'ready') return pickL(st.item.name, curLang()) || T('order.ready');
      return T('co.custom');
    }

    function kindSub() {
      return st.kind === 'ready' ? T('co.readySub') : T('co.customSub');
    }

    function renderStep(focus) {
      clear(stepHost);
      if (st.step === 2) stepHost.appendChild(stepPay());
      else if (st.step === 3) stepHost.appendChild(stepConfirm());
      else stepHost.appendChild(stepInfo());
      syncBar();
      renderFoot();
      if (focus && refs.head && refs.head.focus) {
        try { refs.head.focus({ preventScroll: true }); }
        catch (e) { try { refs.head.focus(); } catch (e2) { /* ignore */ } }
      }
      try { if (m && m.body) m.body.scrollTop = 0; }
      catch (e3) { /* ignore */ }
    }

    function go(n) {
      var next = intOf(n, 1, 1, 3);
      if (next === st.step) return;
      st.step = next;
      if (next > st.reached) st.reached = next;
      renderStep(true);
    }

    /* -------------------------------------------------------------- mount */

    /* While the wizard is on screen the sticky bar owns the modal body's top
       padding, so the bar covers the full width of the scrollport and nothing
       can slip past it. The success panel carries no bar, so it gets the
       normal padding back. */
    function flushBody(on) {
      var v = on ? '0px' : '';
      if (!m || !m.body || !m.body.style) return;
      try { m.body.style.paddingBlockStart = v; }
      catch (e) {
        try { m.body.style.paddingTop = v; } catch (e2) { /* ignore */ }
      }
    }

    var bodyRoot = U.el('div', { 'class': 'stack', style: { gap: '16px' } });
    stepHost = U.el('div');
    bodyRoot.appendChild(buildBar());
    bodyRoot.appendChild(stepHost);

    m = U.sheet({
      title: T('co.title'),
      size: 'md',
      cls: 'modal-checkout',
      body: bodyRoot,
      actions: [],
      onClose: function () {
        if (offLang) { try { offLang(); } catch (e) { /* ignore */ } offLang = null; }
        if (typeof o.onClose === 'function') {
          try { o.onClose(); } catch (e2) { /* ignore */ }
        }
      }
    });

    if (!m || !m.dialog) return null;

    flushBody(true);

    foot = U.el('div', { 'class': 'modal-foot' });
    m.dialog.appendChild(foot);

    renderStep(false);

    if (SN.I18n && typeof SN.I18n.onChange === 'function') {
      offLang = SN.I18n.onChange(function () {
        var title;
        try {
          title = U.qs ? U.qs('.modal-title', m.dialog) : null;
          if (title) title.textContent = T('co.title');
        } catch (e) { /* ignore */ }
        if (st.done) {
          if (st.order) showSuccess(st.order, false);
          return;
        }
        renderStep(false);
      });
    }

    return m;
  }

  /* ====================================================================== */
  /* 10. Export                                                              */
  /* ====================================================================== */

  SN.Checkout = {
    priceCustom: priceCustom,
    priceReady: priceReady,
    open: open,
    summary: summary,
    submit: submit,
    waLink: waLink,
    nextNumber: nextNumber
  };
})();
