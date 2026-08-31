# Shosh Nail

A custom press-on nail shop: the customer picks a colour, shape, length,
finish, pattern and charms, and sees the result on a photographed hand before
ordering. Built as a gift for the owner's partner, who sells press-ons on
Instagram as **@shosh_nail**. She is Iraqi and her customers are Iraqi.

Plain HTML, CSS and vanilla JS. **No build step, no npm, no framework, no ES
modules.** Classic `<script defer>` tags and one global, `window.SN`. Keep it
that way — the whole thing has to be openable from a file and editable by
someone who is not a programmer.

## Hard rules

1. **Never touch `assets/js/password.js`.** It holds the owner's own committed
   password hash. Not a line of it, ever.
2. **The branch `claude/custom-nails-design-site-yc2op1` IS the live site.**
   Everything pushed there is what customers see. Never push red.
3. **Reference photographs are study-only.** The owner's instruction, verbatim:
   *"لا اطلب منك استخدام الصورة التي سارسلها لك مباشرة فقط اقرأها وصمم اظافر
   مثلها."* Read them, measure them, learn from them — never embed, trace, or
   commit them, and never derive shipped data from a copyrighted one.
4. **`Math.random()` is banned in `assets/js/nail-render.js`.** Every per-nail
   variation is seeded, so the same nail is the same nail on every repaint.

## Before pushing, every time

    node --check <every file touched>
    python3 -m http.server 8123
    node <lab>/gloss/smoke.js      # six pages, zero console errors, no h-scroll
    node <lab>/gloss/export.js     # SN.Nail.toPNG still rasterises
    # then render the studio hand and LOOK at it at 1:1, never zoomed

At 4× zoom, correct grain looks like sand and every highlight looks like a
smear. That has twice nearly thrown out a correct setting.

## The render

`SPEC.md` is the architecture. The short version of the plate model:

    out = colour × SHADE + REFLECTION

`SHADE` is a greyscale multiply map and `REFLECTION` an additive sheet, both in
`assets/js/nail-gloss.js`, both **measured off real photographs** by
`tools/gloss-map.py` and `tools/spec-map.py`. Either tool regenerates its asset
from a photograph; `gloss-map.py` reproduces the shipped map byte for byte.

## Measuring it — read this before trusting any number

The measurement harness and the calibrated targets live on the **`lab` branch
of this same repository** (`git checkout lab`), with completely separate
history. Start at its `TARGETS.md`.

Over sixteen cycles, **eight separate targets turned out to be wrong**, each
costing at least a cycle. The rule that catches them:

> Measure the REFERENCE the same way you measure the RENDER — same pixel width,
> same kind of colour, same erosion — or the scoreboard lies.

Three that keep biting:

- **Size.** The studio draws a nail **42–55 device px across**, not 165. The
  gradient metrics are strongly scale-dependent.
- **Tone.** Highlight-area and peak/body targets depend on how light the polish
  is. A pale nail and a mid-tone one give different numbers for a correct
  render.
- **Frame.** Noise and hue-spread targets are **ratios against the plate's own
  photograph** — the skin beside it — never absolutes from another photograph.

And always **run the control**: hide the plates and re-measure. If the number
is unchanged, it belongs to the photograph, not the render. That one check
overturned four findings that had already been acted on.

## Open, and blocked on the owner

- **Iraqi localisation.** Still on Saudi defaults. Needs from him: currency
  ر.س → د.ع and prices in IQD, +966 → +964, Riyadh → his city, the payment
  methods he actually takes (cash on delivery / Zain Cash / Asia Hawala / Key
  Card / Mastercard), and delivery fees in-city vs the other governorates.
  **This sells more than any further render work.**
- **The photographic plate.** The agreed direction: stop drawing the nail
  entirely — photograph a real hand wearing a real set once, then change only
  the hue (`P = C·d + s`, proven in `recolour/` on the lab branch). Needs three
  shots per hand with the camera not moving between them: bare, wearing the
  set, and a repeat. A mid-tone polish, plain gloss, dark cloth, from directly
  above, window light, no flash.
- **Full audit** — security, accessibility, performance. He deferred it
  explicitly to the very end.

## Talking to him

He is not a programmer and writes in Arabic; reply in Arabic. He has an
extremely good eye — every time he said the render still looked drawn, he was
right and the measurements later proved it. Take that seriously over any
scoreboard. Give him numbers, before and after, and say plainly what you
retracted.
