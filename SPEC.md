# Shosh Nail — Build Specification (contract for all implementation agents)

> READ THIS FILE FULLY BEFORE WRITING ANY CODE. Every identifier below is a hard contract.
> Do not rename anything. Do not invent alternative APIs. If something you need is missing,
> implement it locally inside YOUR OWN file only — never edit a file you do not own.

## 0. Product

A bilingual (Arabic default / English) static website for a custom press-on nail business
called **شوش نيل / Shosh Nail**. Customers design a full nail set from scratch
(skin tone, hand, nail shape, length, per-nail sizing, per-nail color, finish, pattern,
charms), or buy a ready-made design from the shop. Everything on the site is editable by
the owner through an in-browser admin panel.

## 1. Hard constraints

- **No build step. No npm. No frameworks. No bundler.** Plain HTML + CSS + ES5/ES2017 JS.
- **No `type="module"`.** Classic `<script>` tags only, so the site works from `file://` and from GitHub Pages.
- Only external network resource allowed: Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`).
- All pages live at repo root. All asset paths are relative: `assets/css/...`, `assets/js/...`.
- Everything hangs off one global namespace: `window.SN`.
- Every JS file is wrapped: `(function(){ 'use strict'; ... })();` and assigns exactly one property on `SN`.
- No `console.log` left in shipped code (`console.warn`/`console.error` in catch blocks is fine).
- Must work offline after first load (no runtime fetch except the optional order webhook).
- Target browsers: modern Chrome/Safari/Firefox + iOS Safari 15+. No IE.
- Mobile-first. Everything must be usable at 360px width and look right up to 1600px.
- Accessibility: real `<button>`/`<label>` elements, `aria-label` on icon-only buttons,
  visible `:focus-visible` ring, keyboard operable, color contrast >= 4.5:1 for text.

## 2. File map & ownership

```
index.html          home            (owner: HOME)
design.html         custom studio   (owner: STUDIO)
shop.html           ready designs   (owner: SHOP)
faq.html            help + contact  (owner: FAQ)
admin.html          control panel   (owner: ADMIN)
404.html            fallback        (owner: HOME)
.nojekyll           empty file      (owner: HOME)
README.md                           (owner: HOME)
assets/css/base.css tokens+shell+components (owner: CSS)
assets/css/studio.css                (owner: STUDIO)
assets/css/admin.css                 (owner: ADMIN)
assets/js/data.js   seed content      (owner: DATA)
assets/js/store.js  state+storage     (owner: CORE)
assets/js/i18n.js   language          (owner: CORE)
assets/js/ui.js     shell+widgets     (owner: CORE)
assets/js/nail-render.js  SVG engine  (owner: RENDER)
assets/js/checkout.js  price+order    (owner: CHECKOUT)
assets/js/home.js                     (owner: HOME)
assets/js/studio.js                   (owner: STUDIO)
assets/js/shop.js                     (owner: SHOP)
assets/js/faq.js                      (owner: FAQ)
assets/js/admin.js                    (owner: ADMIN)
```

## 3. Script load order (identical in every page, in `<head>` with `defer`)

```html
<script defer src="assets/js/data.js"></script>
<script defer src="assets/js/store.js"></script>
<script defer src="assets/js/i18n.js"></script>
<script defer src="assets/js/nail-render.js"></script>
<script defer src="assets/js/ui.js"></script>
<script defer src="assets/js/checkout.js"></script>
<script defer src="assets/js/PAGE.js"></script>
```
`defer` guarantees order and DOM readiness. Page scripts must still guard with
`document.readyState` + `DOMContentLoaded` if they touch DOM at top level.
`admin.html` loads `admin.js` last; it does not need `checkout.js` but loading it is harmless — load it anyway for consistency.

## 4. Page HTML skeleton (every page uses exactly this)

```html
<!doctype html>
<html lang="ar" dir="rtl" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>...</title>
<meta name="description" content="...">
<meta name="theme-color" content="#C97B92">
<link rel="icon" href="data:image/svg+xml,..."><!-- inline nail glyph favicon -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=Reem+Kufi:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/base.css">
<!-- page-specific css if any -->
<!-- scripts (section 3) -->
</head>
<body data-page="home">
  <a class="skip-link" href="#main" data-i18n="a11y.skip"></a>
  <div id="sn-announce"></div>   <!-- filled by SN.UI -->
  <header id="sn-header"></header> <!-- filled by SN.UI.mountHeader -->
  <main id="main"> ... page content ... </main>
  <footer id="sn-footer"></footer> <!-- filled by SN.UI.mountFooter -->
</body>
</html>
```
`body[data-page]` values: `home | studio | shop | faq | admin`.
`admin.html` sets `<body data-page="admin">` and omits `#sn-announce`.

## 5. Data model (SN.DEFAULTS in data.js)

Bilingual text is ALWAYS the object `{ar:"...", en:"..."}` — call it a **T-object**.
Every collection item has a unique string `id`. Ids are stable slugs (e.g. `"almond"`, `"c-blush"`).

```js
SN.DEFAULTS = {
  version: 1,
  settings: {
    brand:      T,            // {ar:'شوش نيل', en:'Shosh Nail'}
    tagline:    T,
    about:      T,            // 2-3 sentences
    phone:      '+966500000000',
    whatsapp:   '966500000000',   // digits only, country code, no +
    email:      'hello@shoshnail.com',
    instagram:  'shosh.nail',     // handle without @
    snapchat:   'shosh.nail',
    tiktok:     '',
    city:       T,
    address:    T,
    hours:      T,
    currency:   T,                 // {ar:'ر.س', en:'SAR'}
    adminPass:  'shosh1234',
    notifyEndpoint: '',            // optional POST url (Web3Forms/Formspree)
    notifyKey:  '',                // optional access_key for Web3Forms
    notifyEmail:'',                // shown to owner in admin
    announce:   T,                 // top bar text; empty string in both = hidden
    announceOn: true,
    whatsappOrder: true,           // open WhatsApp on order submit
    theme: 'light'                 // default theme
  },
  pricing: {
    base: 120,            // full set of 10 nails
    perExtraColor: 3,     // per distinct color beyond the 1st
    perPatternNail: 8,    // per nail carrying a pattern
    perCharm: 4,          // per charm placed
    express: 40,
    giftWrap: 15,
    shipping: 20,
    freeShippingOver: 300,
    vat: 0,               // 0..1 ; 0 disables the VAT line
    depositPct: 0         // 0 disables
  },
  home: {
    heroTitle: T, heroSub: T, heroCta: T,
    heroImage: '',                        // data-url or url, '' = SVG hand illustration
    features: [ {id, icon:'sparkle', title:T, text:T} ],      // 3-4
    steps:    [ {id, title:T, text:T} ],                      // 4 (how it works)
    testimonials: [ {id, name:'...', text:T, stars:5} ],      // 3
    stats: [ {id, value:'+900', label:T} ]                    // 3
  },
  skinTones: [ {id, name:T, hex:'#EBC0A0', shadow:'#D2A184'} ],   // 6 tones light->deep
  shapes:    [ {id, name:T, price:0, desc:T} ],                    // 8, ids must exist in SN.Nail.SHAPES
  lengths:   [ {id, name:T, factor:0.75|1|1.25|1.55, price:0} ],   // 4: short/medium/long/xlong
  finishes:  [ {id, name:T, kind:'gloss'|'matte'|'glitter'|'chrome'|'velvet'|'jelly', price:0} ],
  colors:    [ {id, name:T, hex:'#F3D9DE', group:'nude'|'pink'|'red'|'bold'|'dark'|'pastel'|'neutral'} ], // >= 30
  patterns:  [ {id, name:T, kind:PATTERN_KIND, price:0} ],         // >= 12, kinds in section 8
  charms:    [ {id, name:T, glyph:'💎', image:'', price:0, group:'stones'|'stars'|'flowers'|'letters'|'hearts'|'misc'} ], // >= 28
  sizeGuide: [ {id:'s0', label:'0', mm:17.5}, ... ],                // 12 entries, label '0'..'11', mm 17.5 -> 7.0
  sizeSets:  [ {id:'S', name:T, sizes:{thumb:2,index:5,middle:4,ring:6,pinky:8}} ],  // S/M/L presets
  measureMethods: [ {id:'kit'|'ruler'|'preset', name:T, text:T, steps:[T,...]} ],
  paymentMethods: [ {id, name:T, note:T, icon:'bank'|'card'|'wallet'|'cod'|'applepay', enabled:true, details:T} ],
  designs: [ {                                    // ready-made shop items, >= 12
     id, name:T, desc:T, price:150, orders:0, featured:false, active:true,
     tags:['bridal','summer',...], image:'',      // '' => render from config
     config: DESIGN_CONFIG                        // see 6; used by "customize this"
  } ],
  faqCats: [ {id:'install'|'care'|'shipping'|'payment'|'general', name:T} ],
  faq: [ {id, cat:'install', q:T, a:T} ],          // >= 16, at least 4 under install
  orders: []                                       // filled at runtime
}
```

Content rules for DATA:
- Arabic copy must be natural Gulf-friendly MSA, not machine-translated English.
- English copy must be natural, not transliterated Arabic.
- Colors: real cosmetic names (`نيود دافئ / Warm Nude`, `كرزي / Cherry`...), hexes must be visually distinct.
- The 12 ready designs must be genuinely different (bridal, chrome, french, ombré, leopard, evergreen red, glazed donut, mocha, cat-eye, pearl, matte black, pastel checkers) with sensible `config` objects that render nicely, and varied `orders` counts (30..420) so "most ordered" is meaningful.
- FAQ must actually answer: كيفية التركيب خطوة بخطوة، مدة الثبات، الإزالة، إعادة الاستخدام، القياس، التوصيل، الدفع، التعديل والإلغاء، العناية.

## 6. DESIGN_CONFIG (the customer's design object)

```js
{
  v: 1,
  skin: '#EBC0A0',
  shape: 'almond',
  length: 'medium',
  hand: 'both',                  // 'both' | 'right' | 'left'
  measure: 'preset',             // measureMethods id
  sizes: { rightThumb:2, rightIndex:5, ..., leftPinky:8 },   // 10 keys, values = sizeGuide index 0..11
  nails: {                       // 10 keys, same key set as sizes
    rightThumb: {
      color: '#F3D9DE',
      finish: 'gloss',
      pattern: { kind:'none', color:'#FFFFFF', color2:'#E8B4C8', scale:1 },
      charms: [ { id:'ch-heart', x:0.5, y:0.35, s:1, r:0 } ]   // x,y normalized 0..1 inside nail box
    }, ...
  },
  qty: 1, express:false, giftWrap:false, notes:''
}
```

**Nail keys (exact, in this order):**
`rightThumb, rightIndex, rightMiddle, rightRing, rightPinky, leftThumb, leftIndex, leftMiddle, leftRing, leftPinky`

`SN.Nail.KEYS` exports that array. `SN.Nail.FINGERS` exports
`[{key:'thumb',name:T},{key:'index'},{key:'middle'},{key:'ring'},{key:'pinky'}]`.
Helper `SN.Nail.blank()` returns a fresh valid DESIGN_CONFIG using store defaults.

## 7. SN.Store (store.js)

localStorage key `shosh-nail-v1`. Admin session key `sessionStorage['shosh-admin']`.
Saved designs key `shosh-nail-mine`. Language key `shosh-lang`. Theme key `shosh-theme`.

```js
SN.Store.state                      // the live object (deep-merged DEFAULTS + saved)
SN.Store.ready(fn)                  // call fn(state) now if loaded, else on load
SN.Store.get(path, fallback)        // 'settings.phone' | 'pricing.base'
SN.Store.set(path, value)           // saves + notifies
SN.Store.list(key)                  // 'colors' -> array (live reference, do not splice)
SN.Store.find(key, id)              // -> item | null
SN.Store.add(key, item)             // assigns id if missing, appends, saves -> item
SN.Store.update(key, id, patch)     // shallow merge, saves -> item
SN.Store.remove(key, id)            // saves -> bool
SN.Store.move(key, id, delta)       // reorder by -1 / +1, saves
SN.Store.save()
SN.Store.reset()                    // wipe to DEFAULTS (orders kept unless reset(true))
SN.Store.exportFile()               // downloads shosh-nail-backup-<n>.json
SN.Store.importFile(file)           // -> Promise<void>, validates shape, throws on bad file
SN.Store.subscribe(fn)              // fn(state) after every mutation; -> unsubscribe fn
SN.Store.uid(prefix)                // 'ch-3f9a2'
SN.Store.mine()                     // customer's saved designs [{id,name,config,ts}]
SN.Store.saveMine(name, config)     // -> item
SN.Store.removeMine(id)
SN.Store.login(pass)                // -> bool, compares settings.adminPass
SN.Store.logout()
SN.Store.isAdmin()                  // -> bool
```
Deep-merge rule: on load, merge saved over DEFAULTS **for objects only**; arrays saved by the
user replace the default array entirely (so deletions stick). If `saved.version !== DEFAULTS.version`,
still merge, never throw. Wrap all storage access in try/catch (Safari private mode).
`SN.Store` must never throw on corrupt JSON — fall back to defaults and `console.warn`.

## 8. Pattern kinds (RENDER + DATA + STUDIO must agree)

`none, french, frenchDeep, tipsGlitter, ombre, ombreV, half, diagonal, dots, stripes,
chevron, marble, chrome, glazed, leopard, checkers, hearts, stars, flames, lace, catEye, aura`

Each is drawn by `SN.Nail` inside the nail path clip, using `pattern.color` (main accent)
and `pattern.color2` (secondary), with `pattern.scale` (0.6..1.6) affecting motif size or
tip depth. Unknown kind => draw nothing (never throw).

## 9. SN.Nail (nail-render.js) — pure SVG, no DOM deps

```js
SN.Nail.SHAPES = ['almond','coffin','stiletto','square','squoval','round','oval','lipstick'];
SN.Nail.KEYS   = [...10 keys...];
SN.Nail.FINGERS= [...];
SN.Nail.path(shapeId, w, h)                 // -> 'd' string, box (0,0)-(w,h), tip at y=0, cuticle at y=h
SN.Nail.nailSVG(nailState, opts)            // opts:{shape,length,w,h,finishId,id} -> <g> element
SN.Nail.hand(opts)                          // {side:'right'|'left', design, w, interactive:bool,
                                            //  selected:[keys], onPick(key,ev)} -> <svg>
SN.Nail.preview(design, opts)               // {w, interactive, selected, onPick} -> <svg> of chosen hand(s)
SN.Nail.single(nailState, design, opts)     // {w,h} -> <svg> one big nail (used by the editor)
SN.Nail.thumb(design, px)                   // -> <svg> compact 3-nail fan for cards
SN.Nail.toPNG(svgEl, opts)                  // {scale=2, bg='#FFF8F6'} -> Promise<Blob>
SN.Nail.toDataURL(svgEl, opts)              // -> Promise<string>
```
Requirements:
- Hands are stylised, not anatomical: palm = rounded blob path, fingers = capsules, all in `design.skin`
  with a slightly darker `shadow` edge. Left hand = right hand mirrored (`scale(-1,1)`).
- Finger geometry table (normalized, right hand, viewBox 0 0 300 380) must be a named const so it can be tuned.
- Nail plates sit at the finger tips, rotated to the finger angle, sized by
  `lengthFactor * shapeAspect * fingerWidth`, with the pinky smallest and thumb widest.
- Each nail `<g>` gets `data-key="rightIndex"`, `class="nail"`, and when interactive:
  `tabindex="0"`, `role="button"`, `aria-label`, `cursor:pointer`, plus `.is-selected` styling hook
  (a stroke drawn by RENDER itself, not CSS, so PNG export keeps/drops it — export must pass
  `interactive:false`).
- Finishes: `gloss` = white highlight blob + soft rim; `matte` = no highlight, slight noise-free flat;
  `glitter` = many tiny circles with varying opacity seeded deterministically from the nail key
  (NO Math.random — use a small seeded PRNG so re-render is stable);
  `chrome` = multi-stop linear gradient with light streak; `velvet` = radial soft sheen;
  `jelly` = 0.8 opacity + inner glow.
- All gradients/filters/clipPaths need unique ids: use a module counter `uid()` prefix `sn-`.
  Never reuse an id across two SVGs on the same page.
- `toPNG` must work without network: serialize with `XMLSerializer`, inline `<svg xmlns>`,
  draw to canvas via a `Blob`+`URL.createObjectURL` image. Emoji charms render as `<text>`;
  they rasterize fine in Chrome/Safari.
- Charms: `glyph` (emoji) drawn as `<text>` centered at (x,y) scaled by `s` rotated `r`;
  if `image` is set, draw `<image href>` instead.
- Never throw on partial/invalid state — coerce with defaults.

## 10. SN.I18n (i18n.js)

```js
SN.I18n.lang                        // 'ar' | 'en'
SN.I18n.dict                        // {ar:{...}, en:{...}} flat dotted keys
SN.I18n.extend(partial)             // deep-merge more keys (each page adds its own)
SN.I18n.set(lang)                   // persist, set <html lang/dir>, apply(), fire 'sn:lang'
SN.I18n.toggle()
SN.I18n.t(key, vars)                // 'total {n}' + {n:5}; missing key -> returns key
SN.I18n.pick(tobj)                  // T-object -> string, falls back to other lang then ''
SN.I18n.num(n)                      // Intl, ar uses Latin digits (easier to read prices) -> 'ar-SA' with numberingSystem latn
SN.I18n.money(n)                    // '120 ر.س' (ar) / 'SAR 120' (en)
SN.I18n.apply(root=document)        // fills [data-i18n], [data-i18n-ph], [data-i18n-title], [data-i18n-aria], [data-i18n-html]
SN.I18n.onChange(fn)                // -> unsubscribe
```
- `dir` is `rtl` for ar, `ltr` for en; also set `document.documentElement.lang`.
- Base dict in i18n.js covers: `nav.*, a11y.*, common.*` (save, cancel, delete, add, edit, close,
  search, all, back, next, prev, confirm, yes, no, copy, copied, download, share, reset, loading,
  empty, required, currency), `footer.*`, `theme.*`, `order.*` shared strings.
- Page-specific keys are added by the page file via `SN.I18n.extend(...)` BEFORE first render.
  **Never edit `i18n.js` from a page agent.**
- Key namespaces reserved: `nav`,`common`,`a11y`,`footer`,`theme`,`order`,`pay` (CORE);
  `home` (HOME); `studio` (STUDIO); `shop` (SHOP); `faq` (FAQ); `admin` (ADMIN); `co` (CHECKOUT).

## 11. SN.UI (ui.js)

```js
SN.UI.mountHeader(activePage)   // activePage in 'home|studio|shop|faq'
SN.UI.mountFooter()
SN.UI.mountAnnounce()
SN.UI.boot(page)                // = announce + header + footer + theme + i18n.apply + lang/theme wiring
SN.UI.toast(text, type)         // type: 'ok'|'err'|'info' ; text may be an i18n key or literal
SN.UI.modal(opts)               // {title, size:'sm|md|lg', body:Node|string, actions:[{label,cls,onClick(close)}], onClose}
                                // -> {el, close()} ; traps focus, ESC closes, click-backdrop closes
SN.UI.confirm(text)             // -> Promise<boolean> (styled, not window.confirm)
SN.UI.sheet(opts)               // bottom sheet on mobile, same API as modal (used by studio tools)
SN.UI.icon(name, size)          // -> svg string; set: menu,close,cart,heart,star,check,plus,minus,
                                //   trash,edit,copy,download,share,whatsapp,instagram,snapchat,tiktok,
                                //   phone,mail,sun,moon,globe,arrow,chevron,sparkle,brush,hand,ruler,
                                //   gem,shield,truck,clock,search,filter,undo,redo,dice,lock,image,grid,plusCircle
SN.UI.el(tag, attrs, children)  // tiny hyperscript helper; attrs supports class, html, text, on:{}
SN.UI.money(n)                  // delegates to I18n
SN.UI.debounce(fn, ms)
SN.UI.copy(text)                // -> Promise<bool>, clipboard with textarea fallback
SN.UI.download(blobOrString, filename, mime)
SN.UI.theme.get() / set(t) / toggle()
SN.UI.qs(sel, root) / qsa(sel, root)
```
Header markup produced by `mountHeader` (CSS owner styles exactly these classes):
```html
<div class="hdr-inner wrap">
  <a class="brand" href="index.html"><span class="brand-mark">…svg…</span><span class="brand-name display"></span></a>
  <nav class="nav" id="sn-nav" aria-label="…">
    <a class="nav-a" href="index.html" data-i18n="nav.home"></a>
    <a class="nav-a" href="design.html" data-i18n="nav.studio"></a>
    <a class="nav-a" href="shop.html" data-i18n="nav.shop"></a>
    <a class="nav-a" href="faq.html" data-i18n="nav.faq"></a>
  </nav>
  <div class="hdr-actions">
    <button class="icon-btn" id="btn-lang">…</button>
    <button class="icon-btn" id="btn-theme">…</button>
    <a class="btn btn-pri hdr-cta" href="design.html" data-i18n="nav.cta"></a>
    <button class="icon-btn only-mob" id="btn-menu" aria-expanded="false">…</button>
  </div>
</div>
```
Active link gets `.is-active` + `aria-current="page"`. Mobile menu toggles `.nav-open` on `#sn-header`.
Footer: brand + about + quick links + contact (phone/whatsapp/email/instagram/snapchat/tiktok from
Store, hidden when empty) + hours + a discreet `admin.html` link labelled `footer.admin` + copyright.
Header/footer must re-render on `sn:lang` and on Store changes (settings edits appear live).

## 12. SN.Checkout (checkout.js)

```js
SN.Checkout.priceCustom(design)     // -> {lines:[{key,label,amount,qty}], subtotal, shipping, vat, total, currency}
SN.Checkout.priceReady(item, qty, opts) // opts:{express,giftWrap}
SN.Checkout.open(opts)              // {kind:'custom'|'ready', design, item, qty} -> opens the checkout modal
SN.Checkout.summary(order, lang)    // -> multi-line plain text (used for WhatsApp + copy)
SN.Checkout.submit(order)           // -> Promise<order>; persists, notifies, returns saved order
SN.Checkout.waLink(text)            // -> https://wa.me/<whatsapp>?text=<encoded>
SN.Checkout.nextNumber()            // 'SN-0001' zero-padded, based on orders length + a stored counter
```
Pricing algorithm for a custom set (document each line, all rates from `SN.Store.state.pricing`):
1. `base`
2. `+ shape.price` `+ length.price` (from the picked items)
3. `+ finish.price` summed over the nails that use a priced finish
4. `+ perExtraColor * (distinctColors - 1)`
5. `+ perPatternNail * (# nails whose pattern.kind !== 'none')` (+ each pattern item's own `price`)
6. `+ perCharm * (total charms)` (+ each charm item's own `price`)
7. `* qty`
8. `+ express` if chosen, `+ giftWrap` if chosen
9. `+ shipping` unless `subtotal >= freeShippingOver`
10. `+ vat * subtotal` when `pricing.vat > 0`
Round every line to 2 decimals, display with `SN.I18n.money`.

Checkout modal steps: **1 المعلومات** (name*, phone*, city, address, note) →
**2 طريقة الدفع** (radio list from `paymentMethods` where `enabled`, shows `details` when picked) →
**3 التأكيد** (full summary + total + terms checkbox).
On confirm:
- build `order = {id, no, ts, kind, customer:{name,phone,city,address,note}, payment:{id,name}, design|item, qty, price, status:'new', lang}`
- `SN.Store.add('orders', order)`
- if `settings.notifyEndpoint` → `fetch(endpoint, {method:'POST', body: FormData|JSON})`; include
  `access_key: settings.notifyKey` when set (Web3Forms shape), plus `subject`, `from_name`, `message`
  (= `summary(order)`), `phone`. **Failure must never block the order** — catch, toast a warning.
- if `settings.whatsappOrder` → `window.open(waLink(summary(order)), '_blank')`
- show a success panel: order number, «تم إرسال طلبك», buttons: نسخ الملخص / فتح واتساب /
  تحميل صورة التصميم (custom only, via `SN.Nail.toPNG`) / تصميم جديد.
Validation: name >= 2 chars, phone matches `/^[+0-9\s-]{8,20}$/`. Inline error messages, no `alert()`.

## 13. Pages

### index.html (HOME)
Sections in order: hero (title/sub/CTA + live SVG hand preview built with `SN.Nail.preview` from a
showcase design, or `home.heroImage` when set) · stats strip · "كيف تطلب؟" 4 steps · features grid ·
**الأكثر طلباً** (top 4 designs by `orders`, cards identical in markup to shop cards) · color teaser
(a strip of swatches from `colors`) · testimonials · CTA band · (footer). All content from
`Store.state.home` + `designs`. Cards link to `shop.html#id` and have a «خصّص هذا» button that goes to
`design.html#load=<designId>`.

### design.html (STUDIO) — the core
Wizard with 6 steps, progress bar, step state kept in the URL hash so back/forward works
(`#step=4`). Left/top = live preview (sticky on desktop), right/bottom = controls.
1. **البشرة واليد** — skin tone swatches, hand choice (both/right/left).
2. **الشكل والطول** — shape cards (each drawn with `SN.Nail.single` so the user sees the real shape),
   length options showing the same nail at each factor.
3. **المقاسات** — method tabs: `preset` (S/M/L from `sizeSets`) · `ruler` (an on-screen mm ruler:
   a slider 7–18mm per finger, showing the matching size number, plus a "how to measure" illustration)
   · `kit` (order a sizing kit — informational text). Per-nail size grid, "طبّق على الكل" button,
   "نسخ لليد الثانية".
4. **الألوان والزخرفة** — the heavy step:
   - big interactive preview: click/tap a nail to select it (multi-select with a "تحديد الكل" and
     "تحديد يد" toggle), selected nails get a ring
   - tool tabs: اللون (grouped swatches + custom `<input type=color>` + recent colors)
     · اللمسة (finishes) · النقشة (pattern kinds + its 2 colors + scale slider)
     · الزخارف (charm grid; clicking adds to the selected nail; each placed charm is listed with
     move/scale/rotate/delete controls; drag to reposition on the big single-nail editor)
   - actions: نسخ الظفر / لصق على المحدد / عشوائي / تراجع / إعادة / تصفير
   - **undo/redo** stack (>= 30 steps) with Ctrl+Z / Ctrl+Shift+Z
5. **لمسات أخيرة** — qty, express, giftWrap, notes, save design («احفظ تصميمي») and share link.
6. **المراجعة** — full price breakdown table, both hands preview, «تأكيد الطلب» → `SN.Checkout.open`.
Also: `#load=<designId>` preloads a ready design's config; `#d=<base64url json>` loads a shared design;
«مشاركة» copies such a link. Autosave the in-progress design to `localStorage['shosh-draft']` on every
change (debounced) and restore it on load with a dismissible "تابع تصميمك السابق" bar.
`studio.css` owns `.studio-*` classes only.

### shop.html (SHOP)
Filter bar: search · tag chips · sort (الأكثر طلباً / الأحدث / السعر ↑ / السعر ↓) · price range.
Grid of cards (image or `SN.Nail.thumb`), badge «الأكثر طلباً» on the top 3 by `orders`,
quick-view modal with big preview + description + «اطلب الآن» (`SN.Checkout.open({kind:'ready'})`)
and «خصّص هذا التصميم» → `design.html#load=<id>`. Empty state when filters match nothing.
`#<id>` in the hash opens that design's quick view.

### faq.html (FAQ)
Search box + category tabs from `faqCats` + accordion (one open at a time, `<details>`-like but
button/aria based, deep-linkable via `#<faqId>`). Below: **التركيب خطوة بخطوة** numbered visual guide
(from the `install` FAQ items), **بطاقة التواصل** with big WhatsApp/phone/Instagram/Snapchat/TikTok/
email buttons pulled from settings, working hours, city/address, and a "أرسل استفسارك" box that
composes a WhatsApp message (no backend). Hide any contact row whose setting is empty.

### admin.html (ADMIN)
Password gate (`SN.Store.login`) rendered before anything else; wrong password shakes + toast.
Sidebar tabs: `general, home, pricing, shapes, lengths, colors, finishes, patterns, charms,
skinTones, sizes, designs, faq, payments, orders, backup`.
Every collection tab is a table/list with: add · inline edit (both ar+en inputs side by side) ·
duplicate · delete (with confirm) · reorder ↑↓ · live preview where meaningful (color swatch,
nail render for shapes/patterns/finishes, charm glyph).
- `designs` tab: full CRUD + image upload (FileReader → data-url, downscaled to <= 900px via canvas)
  + `orders` count + `featured` + `active` + tags editor + «افتح في الاستوديو» (`design.html#load=<id>`)
  + «التقط من مسودة الاستوديو» (reads `shosh-draft` and stores it as the item's `config`).
- `orders` tab: list newest first, filter by status (`new|confirmed|shipped|done|cancelled`),
  open a detail modal with the rendered design + summary + «فتح واتساب» + status change + delete,
  and «تصدير CSV».
- `backup` tab: export JSON · import JSON · reset to defaults · change admin password ·
  storage size used · a copy-paste box explaining the notify endpoint setup (Web3Forms/Formspree)
  in both languages.
Every change is immediate (`SN.Store.*`), with a toast. `admin.css` owns `.adm-*` classes only.

## 14. Design system (CSS owner defines; everyone uses these tokens only)

```css
:root{
  --bg:#FCF7F5; --bg-2:#FFFFFF; --bg-3:#F6EAE9; --bg-4:#FDF2F0;
  --ink:#2E1B24; --ink-2:#6B5560; --ink-3:#9C8791;
  --line:#EEDFE1; --line-2:#E2CDD1;
  --rose:#C97B92; --rose-2:#A85A73; --rose-3:#8C4459; --rose-soft:#F8E6EB;
  --gold:#C2A05E; --gold-soft:#F6EEDC; --plum:#4A2B39;
  --ok:#3E9A73; --ok-soft:#E4F3EC; --warn:#B8842A; --warn-soft:#FBF0DA;
  --err:#C0544F; --err-soft:#FAE7E5;
  --r-xs:8px; --r-sm:12px; --r:18px; --r-lg:26px; --r-xl:34px; --r-full:999px;
  --sh-1:0 1px 2px rgba(74,43,57,.06),0 4px 14px rgba(74,43,57,.06);
  --sh-2:0 10px 34px rgba(74,43,57,.13);
  --sh-3:0 20px 60px rgba(74,43,57,.18);
  --font:'Tajawal',system-ui,-apple-system,'Segoe UI',sans-serif;
  --font-ar:'Reem Kufi','Tajawal',sans-serif;
  --font-en:'Cormorant Garamond',Georgia,serif;
  --wrap:1180px; --hdr:66px; --ease:cubic-bezier(.4,0,.2,1);
}
[data-theme="dark"]{ --bg:#171014; --bg-2:#20161C; --bg-3:#2A1E25; --bg-4:#241A20;
  --ink:#F6EDF0; --ink-2:#C4AEB7; --ink-3:#947D88; --line:#33242C; --line-2:#432F39;
  --rose:#E29BB0; --rose-2:#D4879F; --rose-3:#F0B9C9; --rose-soft:#33222A;
  --gold:#D9BC7E; --gold-soft:#312717; --plum:#F0DDE4;
  --ok-soft:#16302A; --warn-soft:#31280F; --err-soft:#331D1C; }
```
`html[lang="ar"] .display{font-family:var(--font-ar)}` ·
`html[lang="en"] .display{font-family:var(--font-en);letter-spacing:.01em}`.
Component classes CSS must provide (used by all pages):
`.wrap .sec .sec-head .eyebrow .h1 .h2 .h3 .lead .muted .display
.btn .btn-pri .btn-ghost .btn-line .btn-sm .btn-lg .btn-block .btn-danger .icon-btn .chip .chip-on
.card .card-b .card-media .badge .badge-hot .tag .grid .grid-2 .grid-3 .grid-4 .flow
.field .field-row .label .input .select .textarea .switch .range .swatch .swatch-on
.tabs .tab .tab-on .accordion .acc-item .acc-head .acc-body
.table .table-wrap .toolbar .empty .spinner .divider .pill .stars
.toast-wrap .toast .modal-back .modal .modal-head .modal-body .modal-foot .sheet
.only-mob .only-desk .sr-only .skip-link`
Motion: transitions <= 240ms; honor `@media (prefers-reduced-motion: reduce)` by disabling transforms/animations.
Use logical properties (`margin-inline-start`, `padding-inline`, `inset-inline-start`) everywhere so RTL/LTR both work with one rule. No `left/right` unless inside a `[dir]`-scoped rule.

## 15. Definition of done (each agent self-checks before finishing)

- `node --check <file>.js` passes for every JS file you wrote.
- No reference to an API not listed in this spec.
- Every user-visible string is either `data-i18n` or `SN.I18n.pick/t` — no hardcoded Arabic or English
  in HTML/JS output except brand-neutral symbols.
- Switching language re-renders your page correctly, including dir flip.
- Switching theme keeps everything readable.
- Nothing throws in the console on load, on empty collections, or after `SN.Store.reset()`.
- Page works at 360px, 768px, 1440px.
