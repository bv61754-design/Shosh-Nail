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
| `password.js` | كلمة مرور اللوحة | ثلاثة أسطر فقط — **الملف الوحيد اللي بتعدّلينه بيدك** |

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

### ملف واحد بس تعدّلينه بيدك: `password.js`

في جذر المشروع فيه ملف صغير اسمه `password.js`، **ثلاثة أسطر لا غير**، وهذا شكله:

```js
/* كلمة مرور لوحة التحكم — Shosh Nail admin password.
   غيّريها من لوحة التحكم ← تبويب «النسخ الاحتياطي» ← زر «انسخي السطر». */
window.SN_ADMIN = "shosh1234";
```

هذا هو **الملف الوحيد** اللي بتفتحينه وتعدّلينه بنفسك في كل الموقع. كل شي ثاني تسوّينه من
لوحة التحكم بالضغط، بدون ما تكتبين أي كود.

### ⚠️ غيّريها من أول يوم (خطوتين، من جوالك)

الكلمة الافتراضية مكتوبة في الملف ويقدر أي أحد يشوفها. تغييرها ما ياخذ دقيقتين، ولوحة
التحكم تمشّيك خطوة خطوة وتجهّز لك النص جاهز — أنتِ بس تنسخين وتلصقين:

1. ادخلي `admin.html` بالكلمة الافتراضية.
2. من القائمة الجانبية اختاري **النسخ الاحتياطي**، وانزلي لبطاقة **«كلمة مرور اللوحة»**.
3. **الخطوة 1:** اكتبي كلمة المرور الجديدة مرتين واضغطي **«حفظ ومتابعة للخطوة 2»**.
   من هذي اللحظة الكلمة الجديدة تشتغل على هذا الجهاز — بس مؤقتاً، لين تخلّصين الخطوة 2.
4. **الخطوة 2** تفتح لك لحالها، وفيها:
   - مربع فيه **نص `password.js` كامل وجاهز**؛
   - زر **«انسخي المحتوى»** — اضغطيه، ينتسخ النص كله؛
   - زر **«افتحي ملف كلمة المرور في GitHub»** — يفتح لك الملف الصحيح مباشرة.
5. في صفحة GitHub اللي فتحت: اضغطي **أيقونة القلم ✏️ (Edit)** فوق الملف، بعدها اضغطي مطوّلاً
   داخل النص واختاري **«تحديد الكل / Select all»** وامسحي كل الموجود، ثم اضغطي مطوّلاً
   واختاري **«لصق / Paste»**.
6. اضغطي الزر الأخضر **«Commit changes...»**، وبعدها في المربع اللي يطلع اضغطي
   **«Commit changes»** مرة ثانية. خلاص.
7. بعد دقيقة أو دقيقتين، كلمة المرور الجديدة تشتغل **على كل الأجهزة**.

> **النص اللي تنسخينه ما فيه كلمة مرورك نفسها.** فيه «بصمة» مشفّرة لها (تبدأ بـ `sha256:`)،
> واللوحة تعرف تقارن عليها بدون ما تعرف الكلمة. يعني آمن تمامًا إنه ينحفظ في GitHub وأي أحد
> يشوفه — ما راح يقدر يستخرج كلمتك منه.

> **لا تستخدمين كلمة مرور تستخدمينها في مكان ثاني** (الإيميل، البنك، إنستغرام…). خصّصي
> كلمة مرور لهذا الموقع لحاله.

> لو ما خلّصتي الخطوة 2، الكلمة الجديدة ما تثبت: أي جهاز ثاني — وحتى جهازك بعد ما تسكّرين
> الصفحة — يرجع يقبل الكلمة القديمة. اللوحة تنبّهك بهذا بشريط أصفر فوق، وتخليك ترجعين
> للخطوة 2 بدون ما تكتبين كلمة المرور من جديد.

### وش تحمي هذي الكلمة بالضبط؟ (اقرأيها مرة وارتاحي)

مهم تعرفين الصورة كاملة، وهي مطمئنة أكثر مما تتوقعين:

- كلمة المرور تحمي **الدخول للوحة التحكم**، يعني تمنع الفضول من العبث في شاشة التحكم.
- **لوحة التحكم ما تعدّل الموقع المنشور.** أي تعديل تسوّينه فيها يُحفظ في **نسخة داخل
  المتصفح اللي فُتحت منه** لا غير. حتى لو شخص دخل اللوحة، **ما يقدر يغيّر شي يشوفه زوار
  موقعك** — تعديله يبقى حبيس متصفحه هو.
- **المحتوى اللي يشوفه الزوار ما يتغيّر إلا بشي واحد:** رفع الملفات (push) على GitHub من
  حسابك أنتِ. وهذا محمي بحساب GitHub وكلمة مروره، مو بكلمة مرور اللوحة.

يعني: غيّري كلمة المرور عشان النظام يكون مرتّب، لكن لا تقلقين — موقعك مو في خطر.
واللي يحمي موقعك فعليًا هو **حساب GitHub تبعك**: خلّي كلمة مروره قوية وفعّلي فيه
التحقق بخطوتين (Two-factor authentication).

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
- **كلمة المرور:** ملف النسخة الاحتياطية فيه خانة `"adminPass"` — هذي مجرد نسخة محليّة
  على جهازك. كلمة المرور الحقيقية اللي يعتمد عليها الموقع موجودة في `password.js` كبصمة
  مشفّرة، والأفضل تخلّين `"adminPass"` فاضية كذا: `"adminPass": ""` قبل ما تلصقين المحتوى
  في `data.js`، عشان ما تنشرين أي شي زيادة.

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
ما فيه طريقة تسترجعين فيها الكلمة نفسها — الملف يحفظ بصمتها مو نصّها. بس ترجعين تدخلين
بسهولة: افتحي `password.js` في GitHub (نفس خطوات التغيير فوق)، واستبدلي السطر الأخير بـ
`window.SN_ADMIN = "shosh1234";` واعملي **Commit changes**. بعدها ادخلي اللوحة بالكلمة
الافتراضية وسوّي الخطوتين من جديد بكلمة تحفظينها.
لو كنتِ غيّرتيها على جهازك بس (ما خلّصتي الخطوة 2)، امسحي بيانات الموقع من إعدادات
المتصفح وبيرجع يقبل الكلمة اللي في `password.js` — وبتفقدين تعديلاتك غير المصدّرة،
فصدّري نسخة احتياطية أول.

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
| `password.js` | Panel password | Three lines — **the only file you ever edit by hand** |

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

### One file you ever edit by hand: `password.js`

At the root of the project there is a small file called `password.js`. It is **three lines
long**, and this is all of it:

```js
/* كلمة مرور لوحة التحكم — Shosh Nail admin password.
   غيّريها من لوحة التحكم ← تبويب «النسخ الاحتياطي» ← زر «انسخي السطر». */
window.SN_ADMIN = "shosh1234";
```

This is the **only** file you ever open and edit yourself. Everything else on the site is
changed by tapping around the control panel — you never write code.

### ⚠️ Change it on day one (two steps, from your phone)

The default password sits in the file where anyone can read it. Changing it takes two
minutes, and the panel walks you through it and prepares the exact text for you — all you do
is copy and paste:

1. Log in to `admin.html` with the default password.
2. Open the **Backup** tab in the sidebar and scroll to the **"Panel password"** card.
3. **Step 1:** type the new password twice and press **"Save and go to step 2"**. From that
   moment the new password works on this device — but only for now, until step 2 is done.
4. **Step 2** opens by itself and contains:
   - a box holding the **complete, ready-made contents of `password.js`**;
   - a **"Copy the contents"** button that copies all of it;
   - an **"Open the password file on GitHub"** button that takes you straight to the file.
5. On the GitHub page that opens: tap the **pencil icon ✏️ (Edit)** above the file, then
   press and hold inside the text, choose **"Select all"** and delete everything, then press
   and hold again and choose **"Paste"**.
6. Tap the green **"Commit changes..."** button, and in the box that appears tap
   **"Commit changes"** once more. That's it.
7. A minute or two later the new password works **on every device**.

> **The text you paste does not contain your password.** It contains a scrambled fingerprint
> of it (it starts with `sha256:`), and the panel can check a password against that
> fingerprint without ever knowing it. So it is perfectly safe to keep in GitHub where
> anyone can see it — your password cannot be recovered from it.

> **Never reuse a password you use anywhere else** (email, bank, Instagram…). Give this site
> a password of its own.

> If you stop before step 2, the new password never sticks: any other device — and your own,
> once you close the page — goes back to accepting the old one. The panel keeps a yellow
> warning strip at the top for this, and lets you reopen step 2 without retyping anything.

### What this password does and does not protect

It is worth knowing the whole picture — and it is more reassuring than you might expect:

- The password protects **access to the control panel**, i.e. it keeps curious people out of
  your editing screen.
- **The control panel does not edit the published site.** Every change you make there is
  saved into a copy of the content held **inside whichever browser it was opened in**. Even
  if someone did get in, **they could not change anything your visitors see** — their edit
  would stay stuck in their own browser.
- **The content visitors see changes in exactly one way:** by pushing files to GitHub from
  your account. That is protected by your GitHub account and its password, not by the panel
  password.

So: change the password to keep things tidy, but do not lose sleep over it. The thing that
genuinely protects your site is **your GitHub account** — give it a strong password and turn
on two-factor authentication.

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
- **The password.** The backup file has an `"adminPass"` field — that is only the local copy
  kept on your device. The password the site actually relies on lives in `password.js` as a
  fingerprint. Best to blank the field out — `"adminPass": ""` — before pasting the backup
  into `data.js`, so you publish nothing you did not mean to.

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
There is no way to recover the password itself — the file stores its fingerprint, not its
text. Getting back in is easy though: open `password.js` on GitHub (same steps as above),
replace the last line with `window.SN_ADMIN = "shosh1234";` and **Commit changes**. Then log
in with the default password and run the two steps again with something you will remember.
If you only ever changed it on your own device (you never finished step 2), clearing this
site's data in your browser settings falls back to whatever is in `password.js` — you will
lose unexported edits, so export a backup first.

**Visitors are not seeing my changes.**
You have not exported and updated `assets/js/data.js`. See "The fix: export, then update the file".

**Does it work offline?**
Yes, after the first load. Only the web fonts and the optional email notification need the network.

**Where are customers' saved designs stored?**
In each customer's own browser. There are no visitor accounts and no sign-in.
