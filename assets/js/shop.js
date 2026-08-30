/*! Shosh Nail — assets/js/shop.js
 *  SN.Shop : the ready-made designs store (owner: SHOP)
 *  Contract: SPEC.md sections 4, 10, 11, 12, 13. Attaches exactly one
 *  property: window.SN.Shop
 *
 *  What lives here, in render order:
 *    hero strip with a live count · «الأكثر طلباً» rail (top 6 by orders,
 *    snap carousel on a phone / grid on a desktop) · the catalogue with a
 *    sticky toolbar (search · tag chips · sort · price range) · cards ·
 *    a quick-view modal that prices the set through SN.Checkout.priceReady.
 *
 *  Everything reads from SN.Store.state.designs, so an owner edit in
 *  admin.html shows up here the moment it is saved. The whole filter set is
 *  mirrored into the URL query, and the open quick view into the hash, so a
 *  customer can share exactly what she is looking at.
 */
(function () {
  'use strict';

  var SN = (window.SN = window.SN || {});

  /* ==================================================================== */
  /* 0. dictionary — namespace `shop` (SPEC section 10)                    */
  /* ==================================================================== */

  var DICT = {
    ar: {
      shop: {
        eyebrow: 'جاهزة للطلب',
        title: 'التصاميم الجاهزة',
        lead: 'مجموعة مختارة من أطقم شوش نيل، كل طقم مرسوم ظفر بظفر. اطلبيه زي ما هو بمقاسك، أو افتحيه في الاستوديو وغيّري فيه اللي تبينه.',

        /* hero pills */
        countN: '{n} تصميم معروض',
        fromPrice: 'الأسعار تبدأ من {p}',
        madeN: 'أكثر من {n} طلب منفّذ',

        /* rail */
        topEyebrow: 'اختيارات العميلات',
        topTitle: 'الأكثر طلباً',
        topSub: 'التصاميم اللي ما تهدأ الطلبات عليها. اضغطي على أي طقم وتشوفينه بالتفصيل.',
        rankN: '#{n}',
        rankAria: 'المركز {n} في الأكثر طلباً',

        /* catalogue */
        allTitle: 'كل التصاميم',
        allSub: 'دوّري بالاسم أو الوسم، رتّبي بالسعر، وحدّدي ميزانيتك — والنتائج تتحدث لحظة بلحظة.',
        searchLabel: 'البحث في التصاميم',
        searchPh: 'ابحثي باسم التصميم أو وصفه أو وسمه…',
        clearSearch: 'مسح كلمة البحث',
        sortLabel: 'ترتيب النتائج',
        sort: {
          orders: 'الأكثر طلباً',
          'new': 'الأحدث',
          priceUp: 'السعر: من الأقل',
          priceDown: 'السعر: من الأعلى'
        },
        priceBtn: 'نطاق السعر',
        priceFrom: 'من',
        priceTo: 'إلى',
        priceNote: 'حرّكي المؤشرين عشان تحددين ميزانيتك، والنتائج تتصفّى مباشرة.',
        tagsLabel: 'التصفية بالوسوم',
        tagAll: 'الكل',
        fav: 'المفضلة',
        favAdd: 'أضيفي «{name}» للمفضلة',
        favRemove: 'شيلي «{name}» من المفضلة',
        favOn: 'انحفظ في المفضلة',
        favOff: 'انشال من المفضلة',
        favEmpty: 'ما عندك تصاميم محفوظة بعد — اضغطي على القلب في أي تصميم يعجبك ويرجع لك هنا.',
        clearFilters: 'مسح الفلاتر',
        resultsN: 'عرض {n} من {total} تصميم',

        /* cards */
        ordersN: '{n} طلب',
        order: 'اطلبيه',
        orderNow: 'اطلبيه الآن',
        customize: 'خصّصيه',
        customizeLong: 'خصّصي هذا التصميم',
        openDetails: 'افتحي تفاصيل «{name}»',

        /* empty states */
        emptyTitle: 'ما لقينا تصميم بهالمواصفات',
        emptyText: 'جرّبي كلمة بحث ثانية، أو وسّعي نطاق السعر، أو امسحي الفلاتر وابدئي من جديد.',
        emptyAll: 'ما فيه تصاميم جاهزة معروضة حالياً — بس تقدرين تصمّمين طقمك من الصفر وقتما تحبين.',
        emptyAllCta: 'ابدئي التصميم',
        notFound: 'التصميم اللي تدوّرين عليه ما عاد متوفر.',

        /* quick view */
        qvTags: 'الوسوم',
        qvOptions: 'خيارات الطلب',
        qvTotal: 'الإجمالي',
        qvNote: 'السعر شامل الشحن والضريبة إن وجدت، ويتحدث مع كل تغيير.',
        qvPreviewAlt: 'معاينة تصميم «{name}»',

        /* tags */
        tag: {
          bridal: 'عروس',
          luxe: 'فخامة',
          pearl: 'لؤلؤي',
          chrome: 'كروم',
          party: 'مناسبات',
          french: 'فرنش',
          classic: 'كلاسيك',
          minimal: 'بسيط',
          summer: 'صيفي',
          ombre: 'أومبريه',
          pink: 'وردي',
          romantic: 'رومانسي',
          red: 'أحمر',
          animal: 'نقشة نمر',
          autumn: 'خريفي',
          nude: 'نيود',
          winter: 'شتوي',
          matte: 'مطفي',
          pastel: 'باستيل',
          fun: 'مرح'
        }
      }
    },

    en: {
      shop: {
        eyebrow: 'Ready to order',
        title: 'Ready-Made Designs',
        lead: 'A hand-picked shelf of Shosh Nail sets, every one painted nail by nail. Order it exactly as it is in your own size, or open it in the studio and make it yours.',

        countN: '{n} designs on show',
        fromPrice: 'Prices from {p}',
        madeN: 'Over {n} sets made',

        topEyebrow: 'Customer favourites',
        topTitle: 'Most ordered',
        topSub: 'The sets the orders never stop coming for. Tap any one of them to see it up close.',
        rankN: '#{n}',
        rankAria: 'Number {n} in most ordered',

        allTitle: 'Every design',
        allSub: 'Search by name or tag, sort by price, set your budget — the results update as you type.',
        searchLabel: 'Search the designs',
        searchPh: 'Search by name, description or tag…',
        clearSearch: 'Clear the search',
        sortLabel: 'Sort the results',
        sort: {
          orders: 'Most ordered',
          'new': 'Newest first',
          priceUp: 'Price: low to high',
          priceDown: 'Price: high to low'
        },
        priceBtn: 'Price range',
        priceFrom: 'From',
        priceTo: 'To',
        priceNote: 'Slide both handles to set your budget — the grid filters as you go.',
        tagsLabel: 'Filter by tag',
        tagAll: 'All',
        fav: 'Favourites',
        favAdd: 'Add “{name}” to favourites',
        favRemove: 'Remove “{name}” from favourites',
        favOn: 'Saved to favourites',
        favOff: 'Removed from favourites',
        favEmpty: 'Nothing saved yet — tap the heart on any design you love and it will wait for you here.',
        clearFilters: 'Clear filters',
        resultsN: 'Showing {n} of {total} designs',

        ordersN: '{n} orders',
        order: 'Order it',
        orderNow: 'Order it now',
        customize: 'Customise',
        customizeLong: 'Customise this design',
        openDetails: 'Open the details for “{name}”',

        emptyTitle: 'Nothing matches that yet',
        emptyText: 'Try another word, widen the price range, or clear the filters and start again.',
        emptyAll: 'No ready-made sets are on show right now — but you can always build your own from scratch.',
        emptyAllCta: 'Start designing',
        notFound: 'That design is no longer available.',

        qvTags: 'Tags',
        qvOptions: 'Order options',
        qvTotal: 'Total',
        qvNote: 'The total includes shipping and VAT where they apply, and updates with every change.',
        qvPreviewAlt: 'Preview of the “{name}” design',

        tag: {
          bridal: 'Bridal',
          luxe: 'Luxe',
          pearl: 'Pearl',
          chrome: 'Chrome',
          party: 'Party',
          french: 'French',
          classic: 'Classic',
          minimal: 'Minimal',
          summer: 'Summer',
          ombre: 'Ombré',
          pink: 'Pink',
          romantic: 'Romantic',
          red: 'Red',
          animal: 'Animal print',
          autumn: 'Autumn',
          nude: 'Nude',
          winter: 'Winter',
          matte: 'Matte',
          pastel: 'Pastel',
          fun: 'Playful'
        }
      }
    }
  };

  if (SN.I18n && typeof SN.I18n.extend === 'function') SN.I18n.extend(DICT);

  /* ==================================================================== */
  /* 1. tiny private helpers (nothing here is exported)                    */
  /* ==================================================================== */

  var FAV_KEY = 'shosh-fav';
  var SORTS = { orders: 1, 'new': 1, priceUp: 1, priceDown: 1 };
  var RAIL_N = 6;
  var THUMB_PX = 280;
  var RAIL_PX = 200;

  var UI = null;

  function ui() {
    if (!UI) UI = SN.UI || null;
    return UI;
  }

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
    return (tobj && (tobj.ar || tobj.en)) || '';
  }

  function money(n) {
    if (SN.I18n && typeof SN.I18n.money === 'function') return SN.I18n.money(n);
    return String(numOf(n, 0));
  }

  function num(n) {
    if (SN.I18n && typeof SN.I18n.num === 'function') return SN.I18n.num(n);
    return String(n);
  }

  function toast(msg, kind) {
    var u = ui();
    if (u && typeof u.toast === 'function') u.toast(msg, kind);
  }

  function numOf(v, fb) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n) ? n : (fb || 0);
  }

  function intIn(v, fb, lo, hi) {
    var n = Math.round(numOf(v, fb));
    if (!isFinite(n)) n = fb;
    if (n < lo) n = lo;
    if (n > hi) n = hi;
    return n;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function clear(node) {
    if (!node) return null;
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function fill(node, kids) {
    var i;
    if (!node) return null;
    clear(node);
    if (!kids) return node;
    if (!Array.isArray(kids)) kids = [kids];
    for (i = 0; i < kids.length; i++) {
      if (kids[i]) node.appendChild(kids[i]);
    }
    return node;
  }

  function show(node, on) {
    if (!node) return;
    if (on) node.removeAttribute('hidden');
    else node.setAttribute('hidden', '');
  }

  /* Fold the differences a shopper should not have to type: Arabic
     diacritics, tatweel, the alef / ya / ta-marbuta variants, bidi marks and
     case. Written with \u escapes so the fold survives any file encoding,
     and deliberately leaving the Arabic-Indic digits \u0660-\u0669 alone. */
  function norm(s) {
    var v = String(s === null || s === undefined ? '' : s).toLowerCase();
    v = v.replace(/[\u064B-\u065F\u0670\u0640]/g, '');   /* harakat + tatweel */
    v = v.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627');   /* alef family */
    v = v.replace(/\u0649/g, '\u064A');                       /* alef maqsura */
    v = v.replace(/\u0629/g, '\u0647');                       /* ta marbuta   */
    v = v.replace(/[\u200B-\u200F\u061C\uFEFF]/g, '');       /* bidi marks   */
    return v.replace(/\s+/g, ' ').trim();
  }

  function list(key) {
    if (SN.Store && typeof SN.Store.list === 'function') {
      try { return SN.Store.list(key) || []; }
      catch (e) { return []; }
    }
    return [];
  }

  /* ==================================================================== */
  /* 2. favourites — localStorage['shosh-fav']                             */
  /* ==================================================================== */

  var favIds = null;

  function favLoad() {
    var raw = null, arr = null, out = [], i;
    if (favIds) return favIds;
    try { raw = window.localStorage.getItem(FAV_KEY); }
    catch (e) { raw = null; }
    try { arr = raw ? JSON.parse(raw) : null; }
    catch (e2) { arr = null; }
    if (Array.isArray(arr)) {
      for (i = 0; i < arr.length; i++) {
        if (typeof arr[i] === 'string' && arr[i] && out.indexOf(arr[i]) === -1) out.push(arr[i]);
      }
    }
    favIds = out;
    return favIds;
  }

  function favSave() {
    try { window.localStorage.setItem(FAV_KEY, JSON.stringify(favLoad())); }
    catch (e) { /* private mode — favourites just will not stick */ }
  }

  function isFav(id) {
    return favLoad().indexOf(String(id)) !== -1;
  }

  function favToggle(id) {
    var arr = favLoad();
    var i = arr.indexOf(String(id));
    if (i === -1) arr.push(String(id));
    else arr.splice(i, 1);
    favSave();
    return i === -1;
  }

  function favCount() {
    var arr = favLoad(), rows = activeRows(), n = 0, i;
    for (i = 0; i < rows.length; i++) {
      if (arr.indexOf(String(rows[i].it.id)) !== -1) n++;
    }
    return n;
  }

  /* ==================================================================== */
  /* 3. state                                                              */
  /* ==================================================================== */

  var st = {
    q: '',          /* the normalised needle actually used for matching */
    qRaw: '',       /* exactly what the shopper typed — shown + shared     */
    tags: [],
    sort: 'orders',
    min: null,      /* null = "at the low bound" */
    max: null,      /* null = "at the high bound" */
    fav: false
  };

  var range = { lo: 0, hi: 0 };
  var dom = {};
  var io = null;
  var qv = null;          /* the open quick view, or null */
  var urlLock = false;    /* set while we write location.hash ourselves */
  var inited = false;

  /* ==================================================================== */
  /* 4. data                                                               */
  /* ==================================================================== */

  /* Only `active !== false` designs ever reach the page. The original index
     rides along so "newest" can mean "added last" without touching the store. */
  function activeRows() {
    var all = list('designs');
    var out = [], i, d;
    for (i = 0; i < all.length; i++) {
      d = all[i];
      if (d && typeof d === 'object' && d.active !== false && d.id) out.push({ it: d, i: i });
    }
    return out;
  }

  function findDesign(id) {
    var rows = activeRows(), key = String(id || ''), i;
    if (!key) return null;
    for (i = 0; i < rows.length; i++) {
      if (String(rows[i].it.id) === key) return rows[i].it;
    }
    return null;
  }

  function tagLabel(tag) {
    var key = 'shop.tag.' + String(tag || '');
    var s = t(key);
    return (s && s !== key) ? s : String(tag || '');
  }

  function haystack(item) {
    var parts = [], tags = Array.isArray(item.tags) ? item.tags : [], i;
    parts.push(item.name && item.name.ar, item.name && item.name.en);
    parts.push(item.desc && item.desc.ar, item.desc && item.desc.en);
    parts.push(item.id);
    for (i = 0; i < tags.length; i++) {
      parts.push(tags[i]);
      parts.push(tagLabel(tags[i]));
    }
    return norm(parts.join(' '));
  }

  function priceBounds(rows) {
    var lo = Infinity, hi = 0, i, p;
    for (i = 0; i < rows.length; i++) {
      p = numOf(rows[i].it.price, 0);
      if (p < lo) lo = p;
      if (p > hi) hi = p;
    }
    if (!isFinite(lo)) lo = 0;
    lo = Math.max(0, Math.floor(lo / 5) * 5);
    hi = Math.ceil(hi / 5) * 5;
    if (hi <= lo) hi = lo + 5;
    return { lo: lo, hi: hi };
  }

  function allTags(rows) {
    var counts = {}, order = [], i, j, tags, tag;
    for (i = 0; i < rows.length; i++) {
      tags = Array.isArray(rows[i].it.tags) ? rows[i].it.tags : [];
      for (j = 0; j < tags.length; j++) {
        tag = String(tags[j] || '').trim();
        if (!tag) continue;
        if (!Object.prototype.hasOwnProperty.call(counts, tag)) {
          counts[tag] = 0;
          order.push(tag);
        }
        counts[tag]++;
      }
    }
    order.sort(function (a, b) {
      if (counts[b] !== counts[a]) return counts[b] - counts[a];
      return tagLabel(a).localeCompare(tagLabel(b));
    });
    return { order: order, counts: counts };
  }

  function matches(row) {
    var it = row.it, i, tags;
    var p = numOf(it.price, 0);

    if (st.fav && !isFav(it.id)) return false;

    if (st.min !== null && p < st.min) return false;
    if (st.max !== null && p > st.max) return false;

    if (st.tags.length) {
      tags = Array.isArray(it.tags) ? it.tags : [];
      for (i = 0; i < st.tags.length; i++) {
        if (tags.indexOf(st.tags[i]) === -1) return false;   /* AND across chips */
      }
    }

    if (st.q) {
      if (haystack(it).indexOf(st.q) === -1) return false;
    }
    return true;
  }

  function sortRows(rows) {
    var mode = st.sort;
    rows.sort(function (a, b) {
      var d;
      if (mode === 'priceUp') {
        d = numOf(a.it.price, 0) - numOf(b.it.price, 0);
        if (d) return d;
      } else if (mode === 'priceDown') {
        d = numOf(b.it.price, 0) - numOf(a.it.price, 0);
        if (d) return d;
      } else if (mode === 'new') {
        d = b.i - a.i;
        if (d) return d;
      } else {
        d = numOf(b.it.orders, 0) - numOf(a.it.orders, 0);
        if (d) return d;
        d = (b.it.featured ? 1 : 0) - (a.it.featured ? 1 : 0);
        if (d) return d;
      }
      return a.i - b.i;
    });
    return rows;
  }

  function filtered() {
    var rows = activeRows(), out = [], i;
    for (i = 0; i < rows.length; i++) {
      if (matches(rows[i])) out.push(rows[i]);
    }
    return sortRows(out);
  }

  function topRows(n) {
    var rows = activeRows();
    rows.sort(function (a, b) {
      var d = numOf(b.it.orders, 0) - numOf(a.it.orders, 0);
      if (d) return d;
      d = (b.it.featured ? 1 : 0) - (a.it.featured ? 1 : 0);
      if (d) return d;
      return a.i - b.i;
    });
    return rows.slice(0, n);
  }

  function anyFilter() {
    return !!(st.q || st.tags.length || st.fav || st.min !== null || st.max !== null);
  }

  /* ==================================================================== */
  /* 5. URL <-> state                                                      */
  /* ==================================================================== */

  function dec(s) {
    try { return decodeURIComponent(String(s === null || s === undefined ? '' : s).replace(/\+/g, ' ')); }
    catch (e) { return String(s === null || s === undefined ? '' : s); }
  }

  function readQuery() {
    var raw = String(window.location.search || '');
    var out = {}, parts, i, eq, k;
    if (raw.charAt(0) === '?') raw = raw.slice(1);
    if (!raw) return out;
    parts = raw.split('&');
    for (i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      eq = parts[i].indexOf('=');
      k = dec(eq === -1 ? parts[i] : parts[i].slice(0, eq));
      if (k) out[k] = eq === -1 ? '' : dec(parts[i].slice(eq + 1));
    }
    return out;
  }

  function queryString() {
    var p = [];
    if (st.q) p.push('q=' + encodeURIComponent(st.qRaw || st.q));
    if (st.tags.length) p.push('tag=' + encodeURIComponent(st.tags.join(',')));
    if (st.sort && st.sort !== 'orders') p.push('sort=' + encodeURIComponent(st.sort));
    if (st.min !== null) p.push('min=' + encodeURIComponent(String(st.min)));
    if (st.max !== null) p.push('max=' + encodeURIComponent(String(st.max)));
    if (st.fav) p.push('fav=1');
    return p.join('&');
  }

  function hashId() {
    var h = String(window.location.hash || '');
    if (h.charAt(0) === '#') h = h.slice(1);
    if (h.charAt(0) === '!') h = h.slice(1);
    return dec(h);
  }

  /* One writer for the whole address bar: query = filters, hash = quick view.
     replaceState keeps the history clean; on file:// it throws, so the hash
     alone is kept in sync there and the query simply is not shareable. */
  function syncUrl() {
    var qs = queryString();
    var h = qv ? '#' + encodeURIComponent(qv.id) : '';
    var url = (window.location.pathname || '') + (qs ? '?' + qs : '') + h;

    if (window.history && typeof window.history.replaceState === 'function') {
      try {
        window.history.replaceState(window.history.state, '', url);
        return;
      } catch (e) { /* file:// or a sandboxed frame — fall through */ }
    }

    urlLock = true;
    try {
      if (h) { if (window.location.hash !== h) window.location.hash = h; }
      else if (window.location.hash) { window.location.hash = ''; }
    } catch (e2) { /* ignore */ }
    window.setTimeout(function () { urlLock = false; }, 0);
  }

  function applyQuery(q) {
    var tags = [], raw, i, part, lo, hi;

    st.qRaw = String(q.q || '');
    st.q = norm(st.qRaw);
    if (q.tag) {
      raw = String(q.tag).split(',');
      for (i = 0; i < raw.length; i++) {
        part = raw[i].trim();
        if (part && tags.indexOf(part) === -1) tags.push(part);
      }
    }
    st.tags = tags;
    st.sort = Object.prototype.hasOwnProperty.call(SORTS, q.sort) ? q.sort : 'orders';
    st.fav = q.fav === '1' || q.fav === 'true';

    lo = q.min === undefined || q.min === '' ? null : numOf(q.min, NaN);
    hi = q.max === undefined || q.max === '' ? null : numOf(q.max, NaN);
    st.min = (lo === null || !isFinite(lo)) ? null : lo;
    st.max = (hi === null || !isFinite(hi)) ? null : hi;
  }

  /* Keep a user-set range meaningful when the owner edits prices. */
  function clampRange() {
    var rows = activeRows();
    range = priceBounds(rows);
    if (st.min !== null) {
      st.min = intIn(st.min, range.lo, range.lo, range.hi);
      if (st.min <= range.lo) st.min = null;
    }
    if (st.max !== null) {
      st.max = intIn(st.max, range.hi, range.lo, range.hi);
      if (st.max >= range.hi) st.max = null;
    }
    if (st.min !== null && st.max !== null && st.min > st.max) st.max = st.min;
  }

  /* ==================================================================== */
  /* 6. lazy media                                                         */
  /* ==================================================================== */

  function makeIO() {
    if (!window.IntersectionObserver) return null;
    try {
      return new window.IntersectionObserver(function (entries, obs) {
        var i;
        for (i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            fillMedia(entries[i].target);
            try { obs.unobserve(entries[i].target); }
            catch (e) { /* ignore */ }
          }
        }
      }, { rootMargin: '400px 0px' });
    } catch (e2) { return null; }
  }

  /* A design thumb is a full SVG nail render; building 40 of them up front
     would stutter on a phone, so each one waits until it is nearly on screen. */
  function fillMedia(node) {
    var id, item, px, kid = null, img;
    if (!node || node.getAttribute('data-done') === '1') return;
    node.setAttribute('data-done', '1');

    id = node.getAttribute('data-media');
    item = findDesign(id);
    if (!item) return;

    px = numOf(node.getAttribute('data-px'), 0);
    img = String(item.image || '');

    if (img) {
      kid = el('img', {
        src: img,
        alt: pick(item.name),
        loading: 'lazy',
        decoding: 'async'
      });
    } else if (SN.Nail && typeof SN.Nail.thumb === 'function') {
      try { kid = SN.Nail.thumb(item.config, px); }
      catch (e) { kid = null; }
    }
    if (kid) fill(node, kid);
  }

  function wireMedia(root) {
    var nodes, i;
    if (!root || typeof root.querySelectorAll !== 'function') return;
    nodes = root.querySelectorAll('[data-media]');
    for (i = 0; i < nodes.length; i++) {
      if (io) io.observe(nodes[i]);
      else fillMedia(nodes[i]);
    }
  }

  function mediaBox(item, px) {
    return el('div', {
      'class': 'card-media shop-media',
      'data-media': String(item.id || ''),
      'data-px': String(px),
      'aria-hidden': 'true'
    }, [el('span', { 'class': 'shop-media-ph' })]);
  }

  /* ==================================================================== */
  /* 7. cards                                                              */
  /* ==================================================================== */

  function openFromEvent(id) {
    return function (ev) {
      if (ev && typeof ev.preventDefault === 'function') {
        /* let a modified click (new tab / new window) behave natively */
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button > 0) return;
        ev.preventDefault();
      }
      openQuick(id);
    };
  }

  function favButton(item) {
    var id = String(item.id || '');
    var name = pick(item.name);
    var on = isFav(id);
    var btn = el('button', {
      type: 'button',
      'class': 'icon-btn icon-btn-sm shop-fav',
      'aria-pressed': on ? 'true' : 'false',
      'aria-label': t(on ? 'shop.favRemove' : 'shop.favAdd', { name: name }),
      title: t(on ? 'shop.favRemove' : 'shop.favAdd', { name: name }),
      html: icon('heart', 17)
    });
    btn.addEventListener('click', function (ev) {
      var nowOn;
      if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
      if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
      nowOn = favToggle(id);
      toast(t(nowOn ? 'shop.favOn' : 'shop.favOff'), 'ok');
      /* a favourites-only view must drop the card it just lost */
      if (st.fav) render();
      else {
        btn.setAttribute('aria-pressed', nowOn ? 'true' : 'false');
        btn.setAttribute('aria-label', t(nowOn ? 'shop.favRemove' : 'shop.favAdd', { name: name }));
        btn.setAttribute('title', t(nowOn ? 'shop.favRemove' : 'shop.favAdd', { name: name }));
        renderChips();
      }
      if (qv && qv.id === id && qv.syncFav) qv.syncFav();
    }, false);
    return btn;
  }

  function tagRow(item, max) {
    var tags = Array.isArray(item.tags) ? item.tags : [];
    var kids = [], i, n = Math.min(tags.length, max);
    for (i = 0; i < n; i++) {
      kids.push(el('span', { 'class': 'tag', text: tagLabel(tags[i]) }));
    }
    if (!kids.length) return null;
    return el('div', { 'class': 'shop-tags' }, kids);
  }

  function orderReady(item) {
    if (!item) return;
    if (SN.Checkout && typeof SN.Checkout.open === 'function') {
      try {
        SN.Checkout.open({ kind: 'ready', item: item, qty: 1 });
        return;
      } catch (e) { console.warn('[SN.Shop] checkout failed to open', e); }
    }
    toast(t('common.error'), 'err');
  }

  /* The catalogue card. HOME renders the same tree for its "most ordered"
     strip — keep the class list and the node order in step. */
  function designCard(item) {
    var id = String(item.id || '');
    var name = pick(item.name);
    var orders = Math.max(0, Math.round(numOf(item.orders, 0)));
    var media = mediaBox(item, THUMB_PX);
    var foot = [];
    var nameLink;

    media.addEventListener('click', openFromEvent(id), false);

    foot.push(el('span', { 'class': 'card-price price', text: money(numOf(item.price, 0)) }));
    if (orders > 0) {
      foot.push(el('span', { 'class': 'badge', text: t('shop.ordersN', { n: num(orders) }) }));
    }

    nameLink = el('a', {
      'class': 'card-link',
      href: '#' + encodeURIComponent(id),
      title: t('shop.openDetails', { name: name }),
      text: name
    });
    nameLink.addEventListener('click', openFromEvent(id), false);

    return el('article', { 'class': 'card shop-card shop-in', 'data-id': id }, [
      media,
      favButton(item),
      el('div', { 'class': 'card-b' }, [
        el('h3', { 'class': 'card-t' }, [nameLink]),
        el('p', { 'class': 'card-x clamp-2', text: pick(item.desc) }),
        tagRow(item, 3),
        el('div', { 'class': 'card-f' }, foot),
        el('div', { 'class': 'btns shop-card-btns' }, [
          el('button', {
            type: 'button',
            'class': 'btn btn-pri btn-sm',
            text: t('shop.order'),
            on: { click: function () { orderReady(item); } }
          }),
          el('a', {
            'class': 'btn btn-ghost btn-sm',
            href: 'design.html#load=' + encodeURIComponent(id),
            text: t('shop.customize')
          })
        ])
      ])
    ]);
  }

  /* The compact rail tile: rank badge + social proof, the whole tile opens
     the quick view. Deliberately button-free so six fit across a desktop. */
  function railCard(item, rank) {
    var id = String(item.id || '');
    var name = pick(item.name);
    var orders = Math.max(0, Math.round(numOf(item.orders, 0)));
    var media = mediaBox(item, RAIL_PX);
    var link;

    link = el('a', {
      'class': 'shop-rail-link',
      href: '#' + encodeURIComponent(id),
      title: t('shop.openDetails', { name: name })
    }, [
      media,
      el('div', { 'class': 'shop-rail-b' }, [
        el('span', { 'class': 'shop-rail-t', text: name }),
        el('span', { 'class': 'shop-rail-f' }, [
          el('span', { 'class': 'shop-rail-price price', text: money(numOf(item.price, 0)) }),
          orders > 0
            ? el('span', { 'class': 'shop-rail-orders', text: t('shop.ordersN', { n: num(orders) }) })
            : null
        ])
      ])
    ]);
    link.addEventListener('click', openFromEvent(id), false);

    return el('article', { 'class': 'card shop-rail-card', 'data-id': id }, [
      el('span', {
        'class': 'shop-rank ltr' + (rank <= 3 ? ' is-top' : ''),
        text: t('shop.rankN', { n: num(rank) }),
        title: t('shop.rankAria', { n: num(rank) })
      }),
      link
    ]);
  }

  /* ==================================================================== */
  /* 8. quick view                                                         */
  /* ==================================================================== */

  function previewArt(item) {
    var box = el('div', { 'class': 'shop-qv-art' });
    var img = String(item.image || '');
    var svg = null;

    if (img) {
      box.appendChild(el('img', { src: img, alt: pick(item.name), decoding: 'async' }));
      return box;
    }
    if (SN.Nail && typeof SN.Nail.preview === 'function') {
      try {
        svg = SN.Nail.preview(item.config, {
          w: 0,
          ariaLabel: t('shop.qvPreviewAlt', { name: pick(item.name) })
        });
      } catch (e) { svg = null; }
    }
    if (svg) box.appendChild(svg);
    else box.appendChild(el('span', { 'class': 'muted small', text: t('common.empty') }));
    return box;
  }

  function qtyStepper(state) {
    var input = el('input', {
      'class': 'input',
      type: 'number',
      min: '1',
      max: '99',
      step: '1',
      inputmode: 'numeric',
      value: String(state.qty),
      'aria-label': t('order.qty')
    });

    function set(n) {
      state.qty = intIn(n, 1, 1, 99);
      input.value = String(state.qty);
      state.paint();
    }

    input.addEventListener('change', function () { set(input.value); }, false);
    input.addEventListener('blur', function () { set(input.value); }, false);

    return el('div', { 'class': 'shop-qty' }, [
      el('button', {
        type: 'button', 'class': 'icon-btn icon-btn-sm',
        'aria-label': t('a11y.decrease'),
        html: icon('minus', 16),
        on: { click: function () { set(state.qty - 1); } }
      }),
      input,
      el('button', {
        type: 'button', 'class': 'icon-btn icon-btn-sm',
        'aria-label': t('a11y.increase'),
        html: icon('plus', 16),
        on: { click: function () { set(state.qty + 1); } }
      })
    ]);
  }

  function toggleRow(labelKey, noteKey, on, onChange) {
    var input = el('input', { type: 'checkbox', checked: on ? true : null });
    input.addEventListener('change', function () { onChange(!!input.checked); }, false);
    return el('label', { 'class': 'switch' }, [
      input,
      el('span', { 'aria-hidden': 'true' }),
      el('span', { 'class': 'switch-lbl' }, [
        el('span', { 'class': 'strong', text: t(labelKey) }),
        el('span', { 'class': 'hint', text: t(noteKey) })
      ])
    ]);
  }

  function priceBlock(state) {
    var it = state.item;
    var p = null, kids = [], lines, i, host;

    if (SN.Checkout && typeof SN.Checkout.priceReady === 'function') {
      try { p = SN.Checkout.priceReady(it, state.qty, { express: state.express, giftWrap: state.gift }); }
      catch (e) { p = null; }
    }

    host = el('div', { 'class': 'shop-qv-lines' });
    lines = (p && Array.isArray(p.lines)) ? p.lines : [];
    for (i = 0; i < lines.length; i++) {
      if (!lines[i]) continue;
      kids.push(el('span', { 'class': 'shop-qv-line' }, [
        el('span', { text: String(lines[i].label || '') }),
        el('span', { 'class': 'price', text: money(numOf(lines[i].amount, 0)) })
      ]));
    }
    if (p) {
      kids.push(el('span', { 'class': 'shop-qv-line' }, [
        el('span', { text: t('order.shipping') }),
        el('span', {
          'class': 'price',
          text: numOf(p.shipping, 0) > 0 ? money(p.shipping) : t('common.free')
        })
      ]));
      if (numOf(p.vat, 0) > 0) {
        kids.push(el('span', { 'class': 'shop-qv-line' }, [
          el('span', { text: t('common.vat') }),
          el('span', { 'class': 'price', text: money(p.vat) })
        ]));
      }
    }
    fill(host, kids);

    return el('div', { 'class': 'shop-qv-sum' }, [
      host,
      el('div', { 'class': 'shop-qv-total' }, [
        el('span', { text: t('shop.qvTotal') }),
        el('b', { 'class': 'price', text: money(p ? p.total : numOf(it.price, 0) * state.qty) })
      ])
    ]);
  }

  function buildQV(state) {
    var it = state.item;
    var name = pick(it.name);
    var orders = Math.max(0, Math.round(numOf(it.orders, 0)));
    var tags = Array.isArray(it.tags) ? it.tags : [];
    var head = [], tagKids = [], i;
    var totalHost, favBtn;

    head.push(el('span', { 'class': 'shop-qv-price price', text: money(numOf(it.price, 0)) }));
    if (orders > 0) {
      head.push(el('span', { 'class': 'badge badge-hot' }, [
        el('span', { html: icon('star', 13), 'aria-hidden': 'true' }),
        el('span', { text: t('shop.ordersN', { n: num(orders) }) })
      ]));
    }
    favBtn = favButton(it);
    /* inside the modal the heart is a normal inline control, not an overlay */
    favBtn.setAttribute('class', 'icon-btn icon-btn-line');
    head.push(favBtn);
    state.syncFav = function () {
      var on = isFav(String(it.id || ''));
      favBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      favBtn.setAttribute('aria-label', t(on ? 'shop.favRemove' : 'shop.favAdd', { name: name }));
    };

    for (i = 0; i < tags.length; i++) {
      tagKids.push(el('span', { 'class': 'tag', text: tagLabel(tags[i]) }));
    }

    totalHost = el('div', {}, [priceBlock(state)]);
    state.totalHost = totalHost;

    return el('div', { 'class': 'shop-qv' }, [
      previewArt(it),
      el('div', { 'class': 'shop-qv-info' }, [
        el('div', { 'class': 'shop-qv-head' }, head),
        el('p', { 'class': 'shop-qv-desc', text: pick(it.desc) }),
        tagKids.length
          ? el('div', { 'class': 'shop-tags', 'aria-label': t('shop.qvTags') }, tagKids)
          : null,

        el('div', { 'class': 'shop-qv-opts' }, [
          el('span', { 'class': 'label', text: t('shop.qvOptions') }),
          el('div', { 'class': 'shop-qv-row' }, [
            el('span', { 'class': 'strong', text: t('order.qty') }),
            qtyStepper(state)
          ]),
          toggleRow('order.express', 'order.expressNote', state.express, function (v) {
            state.express = v;
            state.paint();
          }),
          toggleRow('order.giftWrap', 'order.giftWrapNote', state.gift, function (v) {
            state.gift = v;
            state.paint();
          }),
          totalHost
        ]),

        el('p', { 'class': 'hint', text: t('shop.qvNote') }),

        el('div', { 'class': 'btns shop-qv-actions' }, [
          el('button', {
            type: 'button',
            'class': 'btn btn-pri btn-lg',
            text: t('shop.orderNow'),
            on: {
              click: function () {
                if (SN.Checkout && typeof SN.Checkout.open === 'function') {
                  try {
                    SN.Checkout.open({
                      kind: 'ready',
                      item: it,
                      qty: state.qty,
                      express: state.express,
                      giftWrap: state.gift
                    });
                    return;
                  } catch (e) { console.warn('[SN.Shop] checkout failed to open', e); }
                }
                toast(t('common.error'), 'err');
              }
            }
          }),
          el('a', {
            'class': 'btn btn-line btn-lg',
            href: 'design.html#load=' + encodeURIComponent(String(it.id || '')),
            text: t('shop.customizeLong')
          })
        ])
      ])
    ]);
  }

  function paintQV(state) {
    if (!state || !state.host) return;
    fill(state.host, buildQV(state));
    if (state.m && state.m.dialog && SN.I18n && typeof SN.I18n.apply === 'function') {
      SN.I18n.apply(state.m.dialog);
    }
    retitle(state);
  }

  function retitle(state) {
    var h;
    if (!state || !state.m || !state.m.dialog) return;
    h = state.m.dialog.querySelector('.modal-title');
    if (h) h.textContent = pick(state.item.name);
  }

  function openQuick(id, fromHash) {
    var key = String(id || '');
    var item = findDesign(key);
    var state, m, host;
    var u = ui();

    if (!key) return;
    if (qv && qv.id === key) return;

    if (!item) {
      if (!fromHash) toast(t('shop.notFound'), 'err');
      if (qv) closeQuick(true);
      qv = null;
      syncUrl();
      return;
    }
    if (!u || typeof u.modal !== 'function') {
      window.location.href = 'design.html#load=' + encodeURIComponent(key);
      return;
    }

    if (qv) closeQuick(true);

    host = el('div', { 'class': 'shop-qv-host' });
    state = {
      id: key,
      item: item,
      qty: 1,
      express: false,
      gift: false,
      host: host,
      silent: false,
      m: null
    };
    state.paint = function () {
      if (!state.totalHost) return;
      fill(state.totalHost, priceBlock(state));
    };

    m = u.modal({
      title: pick(item.name),
      size: 'lg',
      cls: 'shop-qv-modal',
      body: host,
      onClose: function () {
        if (qv === state) qv = null;
        if (!state.silent) syncUrl();
      }
    });

    state.m = m;
    qv = state;
    paintQV(state);
    syncUrl();
  }

  function closeQuick(silent) {
    var cur = qv;
    if (!cur) return;
    cur.silent = !!silent;
    qv = null;
    try { if (cur.m && typeof cur.m.close === 'function') cur.m.close(); }
    catch (e) { /* ignore */ }
  }

  /* ==================================================================== */
  /* 9. rendering                                                          */
  /* ==================================================================== */

  function reveal(node) {
    if (!node) return node;
    window.setTimeout(function () {
      if (node.classList) node.classList.add('is-in');
    }, 20);
    return node;
  }

  function renderHero() {
    var rows = activeRows();
    var kids = [], total = 0, i, b;

    if (!dom.heroMeta) return;
    for (i = 0; i < rows.length; i++) total += Math.max(0, numOf(rows[i].it.orders, 0));

    kids.push(el('span', { 'class': 'pill pill-rose' }, [
      el('span', { html: icon('grid', 14), 'aria-hidden': 'true' }),
      el('span', { text: t('shop.countN', { n: num(rows.length) }) })
    ]));

    if (rows.length) {
      b = priceBounds(rows);
      kids.push(el('span', { 'class': 'pill' }, [
        el('span', { html: icon('gem', 14), 'aria-hidden': 'true' }),
        el('span', { text: t('shop.fromPrice', { p: money(b.lo) }) })
      ]));
    }
    if (total > 0) {
      kids.push(el('span', { 'class': 'pill pill-gold' }, [
        el('span', { html: icon('sparkle', 14), 'aria-hidden': 'true' }),
        el('span', { text: t('shop.madeN', { n: num(Math.round(total)) }) })
      ]));
    }
    fill(dom.heroMeta, kids);
  }

  function renderRail() {
    var rows = topRows(RAIL_N);
    var kids = [], i;

    if (!dom.rail || !dom.railSec) return;
    if (!rows.length) {
      show(dom.railSec, false);
      clear(dom.rail);
      return;
    }
    for (i = 0; i < rows.length; i++) kids.push(railCard(rows[i].it, i + 1));
    fill(dom.rail, kids);
    show(dom.railSec, true);
    wireMedia(dom.rail);
  }

  function chip(key, label, on, count, onClick) {
    var kids = [el('span', { text: label })];
    if (count !== null && count !== undefined) {
      kids.push(el('span', { 'class': 'shop-chip-n', text: num(count) }));
    }
    return el('button', {
      type: 'button',
      'class': 'chip',
      'data-chip': key,
      'aria-pressed': on ? 'true' : 'false',
      on: { click: onClick }
    }, kids);
  }

  /* The chip row is rebuilt wholesale on every render, so a keyboard user who
     just toggled a chip would lose the focus ring — put it back on the same
     chip once the new row is in place. */
  function focusedChip() {
    var act = document.activeElement;
    if (!dom.chips || !act || !act.getAttribute) return null;
    if (typeof dom.chips.contains === 'function' && !dom.chips.contains(act)) return null;
    return act.getAttribute('data-chip');
  }

  function refocusChip(key) {
    var kids, i;
    if (!key || !dom.chips) return;
    kids = dom.chips.childNodes;
    for (i = 0; i < kids.length; i++) {
      if (kids[i] && kids[i].getAttribute && kids[i].getAttribute('data-chip') === key) {
        try { kids[i].focus({ preventScroll: true }); }
        catch (e) { try { kids[i].focus(); } catch (e2) { /* ignore */ } }
        return;
      }
    }
  }

  function renderChips() {
    var rows = activeRows();
    var tags = allTags(rows);
    var favN = favCount();
    var keep = focusedChip();
    var kids = [], i;

    if (!dom.chips) return;

    kids.push(chip('all', t('shop.tagAll'), !st.tags.length && !st.fav, null, function () {
      st.tags = [];
      st.fav = false;
      commit();
    }));

    /* a bare "0" beside المفضلة reads like a broken counter, so it only
       appears once she has actually saved something */
    kids.push(chip('fav', t('shop.fav'), st.fav, favN || null, function () {
      st.fav = !st.fav;
      commit();
    }));

    for (i = 0; i < tags.order.length; i++) {
      kids.push((function (tag) {
        return chip('tag:' + tag, tagLabel(tag), st.tags.indexOf(tag) !== -1, tags.counts[tag], function () {
          var at = st.tags.indexOf(tag);
          if (at === -1) st.tags.push(tag);
          else st.tags.splice(at, 1);
          commit();
        });
      })(tags.order[i]));
    }

    fill(dom.chips, kids);
    refocusChip(keep);
  }

  function renderToolbar() {
    var open = dom.price && !dom.price.hasAttribute('hidden');

    /* the search box is never rewritten from here: a store or language
       re-render must not swallow what the shopper is halfway through typing */
    if (dom.searchIco) dom.searchIco.innerHTML = icon('search', 18);
    if (dom.qClear) dom.qClear.innerHTML = icon('close', 15);
    show(dom.qClear, !!(dom.q && dom.q.value));

    if (dom.sort) dom.sort.value = st.sort;

    if (dom.priceT) {
      fill(dom.priceT, [
        el('span', { html: icon('filter', 16), 'aria-hidden': 'true' }),
        el('span', { text: t('shop.priceBtn') })
      ]);
      dom.priceT.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    if (dom.min && dom.max) {
      dom.min.min = String(range.lo);
      dom.min.max = String(range.hi);
      dom.max.min = String(range.lo);
      dom.max.max = String(range.hi);
      dom.min.value = String(st.min === null ? range.lo : st.min);
      dom.max.value = String(st.max === null ? range.hi : st.max);
    }
    if (dom.minV) dom.minV.textContent = money(st.min === null ? range.lo : st.min);
    if (dom.maxV) dom.maxV.textContent = money(st.max === null ? range.hi : st.max);

    if (dom.clear) {
      fill(dom.clear, [
        el('span', { html: icon('undo', 15), 'aria-hidden': 'true' }),
        el('span', { text: t('shop.clearFilters') })
      ]);
      show(dom.clear, anyFilter());
    }
  }

  function emptyState(hasAny) {
    var kids = [
      el('span', { 'class': 'empty-ico', html: icon(hasAny ? 'search' : 'sparkle', 30), 'aria-hidden': 'true' }),
      el('p', { 'class': 'empty-t', text: hasAny ? t('shop.emptyTitle') : t('shop.emptyAll') })
    ];

    if (hasAny) {
      kids.push(el('p', { 'class': 'empty-x', text: t('shop.emptyText') }));
      if (st.fav && !favCount()) {
        kids.push(el('p', { 'class': 'empty-x', text: t('shop.favEmpty') }));
      }
      kids.push(el('p', { 'class': 'mt-2' }, [
        el('button', {
          type: 'button',
          'class': 'btn btn-pri',
          text: t('shop.clearFilters'),
          on: { click: clearFilters }
        })
      ]));
    } else {
      kids.push(el('p', { 'class': 'mt-2' }, [
        el('a', { 'class': 'btn btn-pri', href: 'design.html', text: t('shop.emptyAllCta') })
      ]));
    }
    return el('div', { 'class': 'empty' }, kids);
  }

  function renderGrid() {
    var rows = filtered();
    var total = activeRows().length;
    var kids = [], i;

    if (!dom.grid) return;

    if (dom.result) {
      dom.result.textContent = t('shop.resultsN', { n: num(rows.length), total: num(total) });
    }

    if (!rows.length) {
      clear(dom.grid);
      show(dom.grid, false);
      fill(dom.empty, emptyState(total > 0));
      show(dom.empty, true);
      return;
    }

    for (i = 0; i < rows.length; i++) kids.push(reveal(designCard(rows[i].it)));
    fill(dom.grid, kids);
    show(dom.grid, true);
    clear(dom.empty);
    show(dom.empty, false);
    wireMedia(dom.grid);
  }

  function render() {
    if (io) { try { io.disconnect(); } catch (e) { /* ignore */ } }
    clampRange();
    renderHero();
    renderRail();
    renderToolbar();
    renderChips();
    renderGrid();
    /* scoped to <main>: the header/footer are SN.UI's to re-fill, and an
       open checkout sheet must not be re-applied from under it */
    if (SN.I18n && typeof SN.I18n.apply === 'function') SN.I18n.apply(dom.main || document);
  }

  /* every filter mutation funnels through here: paint, then share-able URL */
  function commit() {
    render();
    syncUrl();
  }

  function clearFilters() {
    st.q = '';
    st.qRaw = '';
    st.tags = [];
    st.fav = false;
    st.min = null;
    st.max = null;
    if (dom.q) dom.q.value = '';
    commit();
    if (dom.q && typeof dom.q.focus === 'function') {
      try { dom.q.focus({ preventScroll: true }); }
      catch (e) { try { dom.q.focus(); } catch (e2) { /* ignore */ } }
    }
  }

  /* ==================================================================== */
  /* 10. wiring                                                            */
  /* ==================================================================== */

  function cacheDom() {
    dom.main = byId('main');
    dom.heroMeta = byId('shop-hero-meta');
    dom.railSec = byId('shop-top-sec');
    dom.rail = byId('shop-rail');
    dom.bar = byId('shop-bar');
    dom.searchIco = byId('shop-search-ico');
    dom.q = byId('shop-q');
    dom.qClear = byId('shop-q-clear');
    dom.sort = byId('shop-sort');
    dom.priceT = byId('shop-price-t');
    dom.price = byId('shop-price');
    dom.min = byId('shop-min');
    dom.max = byId('shop-max');
    dom.minV = byId('shop-min-v');
    dom.maxV = byId('shop-max-v');
    dom.chips = byId('shop-chips');
    dom.result = byId('shop-result');
    dom.clear = byId('shop-clear');
    dom.grid = byId('shop-grid');
    dom.empty = byId('shop-empty');
  }

  function debounce(fn, ms) {
    var u = ui();
    if (u && typeof u.debounce === 'function') return u.debounce(fn, ms);
    return fn;
  }

  function wire() {
    var runSearch = debounce(function () {
      var raw = dom.q ? String(dom.q.value || '') : '';
      var v = norm(raw);
      st.qRaw = raw;
      if (v === st.q) { syncUrl(); return; }
      st.q = v;
      commit();
    }, 200);

    var runRange = debounce(function () {
      commit();
    }, 160);

    if (dom.q) {
      dom.q.addEventListener('input', function () {
        show(dom.qClear, !!dom.q.value);
        runSearch();
      }, false);
      dom.q.addEventListener('search', function () {
        show(dom.qClear, !!dom.q.value);
        runSearch();
      }, false);
      dom.q.addEventListener('keydown', function (ev) {
        if ((ev.key === 'Escape' || ev.keyCode === 27) && dom.q.value) {
          ev.stopPropagation();
          dom.q.value = '';
          st.q = '';
          st.qRaw = '';
          commit();
        }
      }, false);
    }

    if (dom.qClear) {
      dom.qClear.addEventListener('click', function () {
        if (dom.q) dom.q.value = '';
        st.q = '';
        st.qRaw = '';
        commit();
        if (dom.q && typeof dom.q.focus === 'function') dom.q.focus();
      }, false);
    }

    if (dom.sort) {
      dom.sort.addEventListener('change', function () {
        var v = dom.sort.value;
        st.sort = Object.prototype.hasOwnProperty.call(SORTS, v) ? v : 'orders';
        commit();
      }, false);
    }

    if (dom.priceT && dom.price) {
      dom.priceT.addEventListener('click', function () {
        var open = dom.price.hasAttribute('hidden');
        show(dom.price, open);
        dom.priceT.setAttribute('aria-expanded', open ? 'true' : 'false');
      }, false);
    }

    if (dom.min) {
      dom.min.addEventListener('input', function () {
        var v = intIn(dom.min.value, range.lo, range.lo, range.hi);
        var hi = st.max === null ? range.hi : st.max;
        if (v > hi) { st.max = v; if (dom.max) dom.max.value = String(v); }
        st.min = v <= range.lo ? null : v;
        if (dom.minV) dom.minV.textContent = money(v);
        if (dom.maxV) dom.maxV.textContent = money(st.max === null ? range.hi : st.max);
        runRange();
      }, false);
    }

    if (dom.max) {
      dom.max.addEventListener('input', function () {
        var v = intIn(dom.max.value, range.hi, range.lo, range.hi);
        var lo = st.min === null ? range.lo : st.min;
        if (v < lo) { st.min = v <= range.lo ? null : v; if (dom.min) dom.min.value = String(v); }
        st.max = v >= range.hi ? null : v;
        if (dom.maxV) dom.maxV.textContent = money(v);
        if (dom.minV) dom.minV.textContent = money(st.min === null ? range.lo : st.min);
        runRange();
      }, false);
    }

    if (dom.clear) dom.clear.addEventListener('click', clearFilters, false);

    window.addEventListener('hashchange', function () {
      var id;
      if (urlLock) return;
      id = hashId();
      if (id) openQuick(id, true);
      else if (qv) closeQuick(true);
    }, false);

    /* a soft shadow once the toolbar leaves its resting place — one layout
       read per animation frame, never one per scroll event */
    if (dom.bar) {
      try { window.addEventListener('scroll', onScroll, { passive: true }); }
      catch (e) { window.addEventListener('scroll', onScroll, false); }
      onScroll();
    }
  }

  var stuckTick = false;

  function onScroll() {
    if (stuckTick) return;
    stuckTick = true;
    var run = function () {
      var top;
      stuckTick = false;
      if (!dom.bar || !dom.bar.classList) return;
      top = dom.bar.getBoundingClientRect().top;
      if (top <= 84) dom.bar.classList.add('is-stuck');
      else dom.bar.classList.remove('is-stuck');
    };
    if (window.requestAnimationFrame) window.requestAnimationFrame(run);
    else window.setTimeout(run, 32);
  }

  /* ==================================================================== */
  /* 11. boot                                                              */
  /* ==================================================================== */

  function start() {
    var u;
    if (inited) return;
    inited = true;

    UI = SN.UI || null;
    u = ui();
    if (u && typeof u.boot === 'function') u.boot('shop');

    cacheDom();
    io = makeIO();
    applyQuery(readQuery());
    if (dom.q && st.qRaw) dom.q.value = st.qRaw;
    /* a shared link that carries a budget should arrive with it on show */
    if (dom.price && dom.priceT && (st.min !== null || st.max !== null)) {
      show(dom.price, true);
      dom.priceT.setAttribute('aria-expanded', 'true');
    }
    wire();

    if (SN.Store && typeof SN.Store.ready === 'function') {
      SN.Store.ready(function () { first(); });
    } else {
      first();
    }
  }

  function first() {
    /* read the deep link BEFORE the first syncUrl() — that call would
       otherwise rewrite the address bar without a hash and lose it */
    var deep = hashId();

    render();
    if (deep) openQuick(deep, true);
    syncUrl();

    if (SN.I18n && typeof SN.I18n.onChange === 'function') {
      SN.I18n.onChange(function () {
        render();
        if (qv) paintQV(qv);
      });
    }

    if (SN.Store && typeof SN.Store.subscribe === 'function') {
      try {
        SN.Store.subscribe(debounce(function () {
          render();
          if (qv) {
            var it = findDesign(qv.id);
            if (!it) closeQuick(false);
            else { qv.item = it; paintQV(qv); }
          }
        }, 80));
      } catch (e) { console.warn('[SN.Shop] could not subscribe to the store', e); }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, false);
  } else {
    start();
  }

  /* ==================================================================== */
  /* 12. export                                                            */
  /* ==================================================================== */

  SN.Shop = {
    init: start,
    render: render,
    open: function (id) { openQuick(id); },
    close: function () { closeQuick(false); },
    state: st
  };
})();
