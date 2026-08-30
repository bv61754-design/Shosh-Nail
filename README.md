# شوش نيل — Shosh Nail

موقع أظافر مركّبة، عربي أولاً مع إنجليزي، يشتغل بدون سيرفر وبدون أي برنامج تركيب.
A bilingual (Arabic-first) press-on nail site. Pure HTML, CSS and JavaScript — no build step,
no npm, no server, no database.

---

# 🇸🇦 بالعربي

## وش هذا الموقع؟

موقع كامل لمشروع أظافر مركّبة. العميلة تقدر:

- **تصمّم طقمها من الصفر** في «استوديو التصميم»: لون البشرة واليد، شكل الظفر وطوله، مقاس كل
  إصبع، ولون ولمسة ونقشة وزخارف لكل ظفر على حدة — وتشوف الطقم يتكوّن قدّامها لحظة بلحظة.
- **تطلب تصميمًا جاهزًا** من المتجر، أو تاخذه أساسًا وتعدّل عليه.
- **ترسل الطلب** على الواتساب مباشرة، أو على إيميلك عن طريق خدمة إشعارات مجانية (شرحها تحت).

وأنتِ — صاحبة المشروع — تتحكمين **بكل شيء** من داخل الموقع نفسه عن طريق `admin.html`:
الأسعار، الألوان، النقشات، الزخارف، التصاميم الجاهزة، الأسئلة الشائعة، بيانات التواصل، والطلبات.

**ما فيه سيرفر ولا قاعدة بيانات.** الموقع كامل ملفات ثابتة، ويقدر يُنشر مجانًا على GitHub Pages.

## صفحات الموقع

| الملف | الصفحة | وش فيها |
|---|---|---|
| `index.html` | الرئيسية | الواجهة، الأرقام، خطوات الطلب، المميزات، الأكثر طلبًا، الألوان، الآراء |
| `design.html` | استوديو التصميم | معالج من ٦ خطوات لتصميم الطقم من الصفر |
| `shop.html` | تصاميم جاهزة | متجر التصاميم مع بحث وتصفية وترتيب |
| `faq.html` | الأسئلة والتواصل | الأسئلة الشائعة + دليل التركيب + بطاقة التواصل |
| `admin.html` | لوحة التحكم | إدارة كل محتوى الموقع (بكلمة مرور) |
| `404.html` | صفحة غير موجودة | تظهر تلقائيًا لأي رابط خاطئ |

الملفات المساعدة كلها داخل `assets/`:
`assets/css/` للتنسيقات، و`assets/js/` للأكواد، و`assets/js/data.js` للمحتوى الأساسي.

## كيف تشغّلينه على جهازك؟

**أسهل طريقة:** افتحي ملف `index.html` بالضغط عليه مرتين. راح يفتح في المتصفح ويشتغل كامل.

**الطريقة الأفضل** (تخلي كل شي يشتغل تمامًا مثل الموقع المنشور، وينصح فيها إذا بتجربين
لوحة التحكم): افتحي «موجّه الأوامر» / Terminal داخل مجلد المشروع واكتبي:

```bash
python3 -m http.server 8000
```

بعدها افتحي المتصفح على العنوان: `http://localhost:8000`
لإيقافه اضغطي `Ctrl + C`.

> لو ما عندك بايثون، أي «خادم ملفات محلي» يسوّي نفس الشي.

## كيف تنشرينه على الإنترنت مجانًا (GitHub Pages)؟

1. ارفعي مجلد المشروع كامل على مستودع (repository) في GitHub.
2. من صفحة المستودع افتحي **Settings** (الإعدادات) من الشريط العلوي.
3. من القائمة الجانبية اختاري **Pages**.
4. تحت **Build and deployment → Source** اختاري **Deploy from a branch**.
5. تحت **Branch** اختاري الفرع `main` والمجلد `/ (root)`، ثم اضغطي **Save**.
6. انتظري دقيقة أو دقيقتين، وبيظهر لك رابط الموقع فوق الصفحة بهذا الشكل:
   `https://<اسم-حسابك>.github.io/<اسم-المستودع>/`

> في المشروع ملف فاضي اسمه `.nojekyll` — **لا تحذفينه**. وجوده يخلي GitHub ينشر الملفات
> زي ما هي بدون معالجة، وبدونه ممكن بعض الملفات ما تشتغل.

كل ما تعدّلين شي وترفعينه (push) على الفرع `main`، الموقع يتحدث تلقائيًا خلال دقيقة تقريبًا.

## لوحة التحكم — وأهم خطوة: غيّري كلمة المرور

افتحي `admin.html` (يعني `https://موقعك/admin.html`، أو من الرابط الصغير «لوحة التحكم» أسفل
أي صفحة).

**كلمة المرور الافتراضية: `shosh1234`**

### ⚠️ غيّريها من أول يوم

هذي كلمة المرور مكتوبة داخل ملفات الموقع، ويقدر أي شخص يشوفها. غيّريها فورًا:

1. ادخلي `admin.html` بكلمة المرور الافتراضية.
2. من القائمة الجانبية اختاري **النسخ الاحتياطي (backup)**.
3. اكتبي كلمة المرور الجديدة في خانة «تغيير كلمة مرور اللوحة» واحفظي.
4. **مهم جدًا:** بعدها اعملي **تصدير** للنسخة الاحتياطية وحدّثي ملف `assets/js/data.js`
   (الشرح في القسم اللي بعده) — وإلا كلمة المرور الجديدة راح تكون على متصفحك أنتِ فقط،
   وأي شخص يفتح الموقع من جهاز ثاني بيقدر يدخل بالكلمة القديمة.

> وحتى بعد التغيير: لوحة التحكم حماية بسيطة تمنع الفضول، مو حماية بنكية. لا تحطين فيها
> أي معلومات حساسة (أرقام بطاقات، كلمات مرور ثانية… إلخ).

## كيف يشتغل المحتوى؟ (اقرأي هذا القسم كامل — هو أهم شي في الملف)

### فيه مكانين للمحتوى

1. **المحتوى الأساسي** — موجود في ملف `assets/js/data.js`. هذا هو المحتوى اللي **يشوفه كل
   زوار الموقع**. هو المصدر الرسمي للحقيقة.
2. **تعديلاتك في لوحة التحكم** — تُحفظ في **متصفحك أنتِ فقط** (في مكان اسمه localStorage).

### وش معنى هذا عمليًا؟

> لمّا تعدّلين سعرًا أو تضيفين لونًا من لوحة التحكم، أنتِ تشوفين التعديل مباشرة —
> **لكن الزوار ما يشوفونه**، لأن التعديل محفوظ على جهازك أنتِ لا غير.
> وحتى لو فتحتي الموقع من جوالك أو من متصفح ثاني، ما راح تلقين التعديل.

### الحل: صدّري وحدّثي الملف (٤ خطوات، تسوّينها كل ما تخلصين جولة تعديلات)

1. **عدّلي براحتك** في `admin.html` — كل التبويبات: الأسعار، الألوان، التصاميم، الأسئلة… إلخ.
2. افتحي تبويب **النسخ الاحتياطي (backup)** واضغطي **تصدير**. راح ينزل عندك ملف اسمه
   `shosh-nail-backup-2026-08-29.json` (بتاريخ اليوم).
3. افتحي هذا الملف بأي محرر نصوص وانسخي **كل** محتواه.
4. افتحي `assets/js/data.js` وبدّلي **الكائن اللي بعد `SN.DEFAULTS =`** بالمحتوى اللي نسختيه.
   يعني الملف لازم يبقى بهذا الشكل:

```js
  SN.DEFAULTS = {
    ...    ← هنا تلصقين محتوى ملف النسخة الاحتياطية كامل
  };
```

احفظي الملف وارفعيه على GitHub → الزوار كلهم صاروا يشوفون التعديلات. ✅

#### تنبيهان مهمان قبل الرفع

- **امسحي الطلبات:** ملف النسخة الاحتياطية يحتوي على طلبات العميلات (أسماء وجوالات وعناوين).
  قبل ما تلصقينه في `data.js`، دوّري على السطر `"orders": [ ... ]` في آخر الملف وخلّيه
  فاضيًا كذا: `"orders": []`. **لا ترفعين بيانات عميلاتك على مستودع عام.**
- **كلمة المرور:** كلمة مرور اللوحة موجودة داخل الملف في `"adminPass"`. أي شخص يقدر يفتح
  `assets/js/data.js` ويقراها. هذا طبيعي في موقع بدون سيرفر — فقط كوني على علم فيه.

### استيراد نسخة احتياطية

من نفس التبويب، زر **استيراد** يخليك ترجعين لأي نسخة صدّرتيها سابقًا. مفيد لو:
- عدّلتي شي وندمتي عليه،
- أو تبين تنقلين إعداداتك لجهاز/متصفح ثاني،
- أو مسحتي بيانات المتصفح بالغلط.

> نصيحة: احتفظي بملفات النسخ الاحتياطية في مجلد على جهازك أو على الدرايف. هي مجانية وخفيفة.

### زر «إعادة الضبط»

يرجّع كل شي للمحتوى الأساسي الموجود في `assets/js/data.js` ويلغي تعديلاتك المحلية.
صدّري نسخة احتياطية قبل ما تستخدمينه.

## إشعار الطلبات على الإيميل (اختياري)

بشكل افتراضي، الطلب يُحفظ في اللوحة **ويفتح رسالة واتساب جاهزة** للعميلة ترسلها لك.
لو تبين يوصلك كمان **إيميل تلقائي بكل طلب**، فيه خدمتان مجانيتان جاهزتان:

### الخيار ١: Web3Forms (الأسهل — ما يحتاج تسجيل حساب)

1. افتحي `https://web3forms.com`.
2. اكتبي إيميلك في الخانة واضغطي **Create Access Key**.
3. بيوصلك إيميل فيه **Access Key** — كود طويل شكله كذا:
   `a1b2c3d4-e5f6-7890-abcd-ef1234567890`. انسخيه.
4. ادخلي `admin.html` ← تبويب **الإعدادات العامة (general)**، وعبّي الخانات:
   - **رابط الإشعار (notifyEndpoint):** `https://api.web3forms.com/submit`
   - **مفتاح الإشعار (notifyKey):** الكود اللي نسختيه
   - **إيميل الإشعار (notifyEmail):** إيميلك (للتذكير فقط، ما يُرسل)
5. احفظي، وسوّي طلب تجريبي من الموقع للتأكد إن الإيميل يوصل.
6. **لا تنسين** تصدّرين النسخة الاحتياطية وتحدّثين `data.js` (زي الشرح فوق) عشان الإعداد
   يشتغل لكل الزوار مو لك بس.

### الخيار ٢: Formspree

1. سجّلي في `https://formspree.io` وأنشئي **New Form**.
2. بيعطيك رابط شكله: `https://formspree.io/f/xyzabcde`. انسخيه.
3. ادخلي `admin.html` ← تبويب **الإعدادات العامة**:
   - **رابط الإشعار (notifyEndpoint):** الرابط اللي نسختيه
   - **مفتاح الإشعار (notifyKey):** اتركيه **فاضي** (فورمسبري ما يحتاج مفتاح)
4. أول طلب يوصلك، فورمسبري بيطلب منك تأكيد الإيميل مرة وحدة.
5. صدّري النسخة الاحتياطية وحدّثي `data.js`.

> **مطمئنة:** لو الخدمة وقعت أو النت انقطع، الطلب **ما يضيع** — يُحفظ في تبويب «الطلبات»
> في لوحة التحكم زي ما هو، وتوصلك رسالة تنبيه بس.

## أسئلة سريعة

**نسيت كلمة مرور اللوحة؟**
افتحي `assets/js/data.js` وشوفي قيمة `adminPass`. لو غيّرتيها من اللوحة ولا صدّرتيها، امسحي
بيانات الموقع من إعدادات المتصفح — بيرجع لكلمة المرور اللي في الملف (وبتفقدين تعديلاتك
غير المصدّرة، فصدّري أول).

**التعديلات ما ظهرت للزوار؟**
أكيد ما صدّرتي وحدّثتي `assets/js/data.js`. راجعي قسم «الحل: صدّري وحدّثي الملف».

**الموقع يشتغل بدون إنترنت؟**
نعم، بعد أول فتح. الشي الوحيد اللي يحتاج نت هو الخطوط وإشعار الإيميل الاختياري.

**فين تُحفظ تصاميم العميلات؟**
في متصفح العميلة نفسها. ما فيه حسابات ولا تسجيل دخول للزوار.

---

# 🇬🇧 In English

## What this is

A complete website for a custom press-on nail business. Customers can:

- **Design a full set from scratch** in the studio — skin tone, hand, nail shape, length,
  per-finger sizing, and a colour, finish, pattern and charms for every single nail, with a
  live preview updating as they go.
- **Order a ready-made design** from the shop, or use it as a starting point and customise it.
- **Send the order** straight to WhatsApp, or to your inbox via a free notification service.

You, the owner, control **everything** from `admin.html` inside the site itself: pricing,
colours, patterns, charms, ready designs, FAQ, contact details and orders.

**There is no server and no database.** The whole site is static files and can be published
free on GitHub Pages.

## Pages

| File | Page | What it does |
|---|---|---|
| `index.html` | Home | Hero, stats, how it works, features, most ordered, colours, reviews |
| `design.html` | Design studio | A six-step wizard for building a set from scratch |
| `shop.html` | Ready designs | The shop, with search, filters and sorting |
| `faq.html` | Help & contact | FAQ, a step-by-step application guide, contact card |
| `admin.html` | Control panel | Manage all site content (password protected) |
| `404.html` | Not found | Shown automatically for any bad link |

Everything else lives in `assets/`: `assets/css/` for styles, `assets/js/` for scripts, and
`assets/js/data.js` for the site's content.

## Running it locally

**Simplest:** double-click `index.html`. It opens in your browser and works fully.

**Better** (behaves exactly like the published site — recommended when testing the admin panel):
open a terminal in the project folder and run:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. Press `Ctrl + C` to stop it.

## Publishing free on GitHub Pages

1. Push the whole project folder to a GitHub repository.
2. On the repository page, open **Settings**.
3. In the sidebar, choose **Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Under **Branch**, pick `main` and the `/ (root)` folder, then press **Save**.
6. Wait a minute or two — your URL appears at the top of the page, in the form
   `https://<your-username>.github.io/<your-repo>/`

> The project contains an empty file called `.nojekyll` — **do not delete it.** It tells
> GitHub to publish the files exactly as they are; without it some files may not load.

Every push to `main` republishes the site automatically, usually within a minute.

## The admin panel — and the one thing you must do first

Open `admin.html` (i.e. `https://your-site/admin.html`, or via the small "control panel"
link at the bottom of any page).

**Default password: `shosh1234`**

### ⚠️ Change it on day one

This password is written inside the site's files, so anyone can read it. Change it immediately:

1. Log in to `admin.html` with the default password.
2. Open the **backup** tab in the sidebar.
3. Type a new password in the "change admin password" field and save.
4. **Crucially:** then **export** a backup and update `assets/js/data.js` (next section) —
   otherwise the new password only exists in *your* browser, and anyone opening the site on
   another device can still log in with the old one.

> Even after changing it, this is a "keep honest people out" lock, not bank-grade security.
> Never store anything genuinely sensitive in the panel.

## How content works (please read this whole section)

### Content lives in two places

1. **The seed content** — in `assets/js/data.js`. This is what **every visitor sees**. It is
   the single source of truth.
2. **Your admin edits** — saved in **your browser only** (in `localStorage`).

### What that means in practice

> When you change a price or add a colour in the admin panel, you see it right away —
> **but visitors do not**, because the change lives only on your machine.
> Even your own phone or a second browser will not show it.

### The fix: export, then update the file (four steps, after each editing session)

1. **Make your edits** in `admin.html` — any tab: pricing, colours, designs, FAQ, and so on.
2. Open the **backup** tab and press **export**. A file downloads named
   `shosh-nail-backup-2026-08-29.json` (with today's date).
3. Open that file in any text editor and copy **all** of it.
4. Open `assets/js/data.js` and replace **the object after `SN.DEFAULTS =`** with what you
   copied, so the file reads:

```js
  SN.DEFAULTS = {
    ...    ← paste the entire contents of the backup file here
  };
```

Save it, push it to GitHub, and every visitor now sees your changes. ✅

#### Two things to check before you push

- **Clear the orders.** The backup contains customer orders (names, phone numbers, addresses).
  Before pasting it into `data.js`, find `"orders": [ ... ]` near the end and empty it:
  `"orders": []`. **Never push customer data to a public repository.**
- **The password.** The admin password sits in the file as `"adminPass"`. Anyone can open
  `assets/js/data.js` and read it. That is inherent to a site with no server — just know it.

### Importing a backup

The same tab has an **import** button that restores any backup you exported. Useful if you
made a change you regret, want to move your settings to another browser, or cleared your
browser data by accident.

> Keep your backup files somewhere safe — a folder on your machine or your cloud drive.
> They are small and free.

### The "reset" button

Restores everything to the seed content in `assets/js/data.js` and discards your local edits.
Export a backup before you use it.

## Order notifications by email (optional)

By default, an order is stored in the admin panel and **opens a pre-filled WhatsApp message**
for the customer to send you. If you would also like an **automatic email for every order**,
two free services work out of the box.

### Option 1: Web3Forms (easiest — no account needed)

1. Go to `https://web3forms.com`.
2. Enter your email address and press **Create Access Key**.
3. You receive an email containing an **Access Key** — a long code like
   `a1b2c3d4-e5f6-7890-abcd-ef1234567890`. Copy it.
4. In `admin.html`, open the **general** tab and fill in:
   - **notifyEndpoint:** `https://api.web3forms.com/submit`
   - **notifyKey:** the key you copied
   - **notifyEmail:** your email address (a reminder for you; it is not sent)
5. Save, then place a test order on the site to confirm the email arrives.
6. **Do not forget** to export a backup and update `data.js` (as above), so the setting
   applies to all visitors and not just to you.

### Option 2: Formspree

1. Sign up at `https://formspree.io` and create a **New Form**.
2. You get an endpoint like `https://formspree.io/f/xyzabcde`. Copy it.
3. In `admin.html`, open the **general** tab:
   - **notifyEndpoint:** the endpoint you copied
   - **notifyKey:** leave it **empty** (Formspree does not use one)
4. On the first order, Formspree asks you to confirm your email address once.
5. Export a backup and update `data.js`.

> **Reassurance:** if the service is down or the connection drops, the order is **not lost** —
> it is still saved in the admin panel's orders tab, and you simply get a warning message.

## Quick answers

**Forgot the admin password?**
Look at `adminPass` in `assets/js/data.js`. If you changed it in the panel and never exported,
clear this site's data in your browser settings to fall back to the password in the file (you
will lose unexported edits, so export first).

**Visitors are not seeing my changes.**
You have not exported and updated `assets/js/data.js`. See "The fix: export, then update the file".

**Does it work offline?**
Yes, after the first load. Only the web fonts and the optional email notification need the network.

**Where are customers' saved designs stored?**
In each customer's own browser. There are no visitor accounts and no sign-in.
