# Photo-hand mode — the customer designs on a REAL hand

## Why
The owner said the drawn hand is "unrealistic and very cartoonish". No vector illustration will pass
for a photo. He supplied photographs of a real feminine hand and gave explicit permission to use
them. This is the path to genuine realism, and it is what makes "the customer receives what she
sees" true.

## The asset (already in the repo)
  assets/img/hand-real.jpg     1017x681 — the master
  assets/img/hand-real-sm.jpg   820x549  — the phone variant
A LEFT hand, back of hand up, fingers pointing to the image's left, thumb toward the top, laid flat
on DARK charcoal linen in soft even daylight. The owner supplied a dark-background version
specifically to make the cut-out clean, and it does: the fabric's r-g is NEGATIVE (-0.02..-0.04)
while skin is POSITIVE (+0.07..+0.16), so `(r-g) > 0.020 && lum > 0.14` separates them with a wide
margin. Mask covers ~42% of the frame. The earlier beige-linen photo is kept in refs as a fallback
but should not be used - its background sits right on the skin threshold. Short natural unpolished nails — which is exactly right,
because the designed press-on is drawn OVER the natural nail and a press-on is larger, so it covers.
The right hand is this image mirrored horizontally.

Reference copies, with a measurement grid and a skin mask, are in the scratch refs folder:
  hand-b.png, hand-b-grid.png (5% gridlines, labelled), hand-b-mask.png
Two more usable photos are there too: hand-a.png (wood, thumb partly cropped) and hand-c.png
(angled three-quarter view, carries a sparkle watermark in the lower right — avoid or crop it).

## What to build

`SN.Nail.photoHand(opts)` alongside the existing `hand()`, same call shape
({side, design, w, interactive, selected, onPick}), returning an <svg> that contains:
  1. an <image> of the photo (href the small variant under ~500px CSS width, the master above it),
     mirrored via a transform when side === 'right';
  2. the customer's ten nail plates drawn on top, one per finger, each translated, rotated and
     scaled to its anchor;
  3. a soft contact shadow under each plate so it sits on the finger rather than floating.

### Anchors — the only hard part
Five per hand: thumb, index, middle, ring, pinky. Each is
  { x, y, angle, width, length }
normalised to the photo (0..1 of its width/height), where (x, y) is the CUTICLE point (where the
plate meets the skin), `angle` is the direction the finger points in degrees, and `width` is the
finger's width at the nail bed as a fraction of the photo width. `length` scales with the customer's
chosen length factor.

Calibrate them BY LOOKING, not by arithmetic: build a scratch page that draws the photo with a
bright marker at each anchor plus the plate outline, screenshot it, Read it, and nudge the numbers
until each plate sits exactly where a real press-on would — cuticle on the cuticle, side walls
inside the skin folds, free edge extending past the fingertip. Expect many rounds. The hand-b-grid
image gives 5% gridlines to read coordinates from.
Rough starting point from the automatic edge scan (fingertip extremes, % of width/height):
  thumb   tip near (40%, 18%)      index tip near (23%, 30%)
  middle  tip near (16.5%, 45%)    ring  tip near (21%, 60%)
  pinky   tip near (30%, 75%)
Those are TIPS, not cuticles — the cuticle sits roughly one nail-length back along the finger axis.

### Skin tone
The photo is one tone. Offer it as a preview MODE, not a replacement:
  - "معاينة واقعية" (photo) — the default in the studio, because it sells;
  - "معاينة مرسومة" (the existing vector hand) — used when she is choosing a skin tone, and for the
    downloadable design image, where a drawn hand exports cleanly.
Optionally allow a gentle hue/lightness shift of the photo toward the chosen skin tone, but only if
it still looks like skin — verify on the darkest tone before shipping it, and drop it if it does not.

### Constraints
- `toPNG` must still work. An <image> with an external href will NOT rasterise onto a canvas from a
  data-less SVG — either inline the photo as a data URI for export, or export from the vector hand.
  Decide, implement, and verify by actually exporting.
- `pointToNorm` and charm dragging must keep working in photo mode.
- The photo must lazy-load and must never block the first paint.
- Nothing may throw if the image 404s — fall back to the vector hand.

## Skin-tone recolouring — VALIDATED, port this exact algorithm to canvas

Do NOT ship six photos. Ship ONE and recolour it in the browser on a <canvas>, cached per tone.
The photo is same-origin so the canvas is not tainted, which also keeps toPNG export working.

Measured on the real asset (assets/img/hand-real.jpg):
  dark linen: r-g ≈ -0.020..-0.042, luminance ≈ 0.15..0.26
  skin:       r-g ≈ +0.073..+0.158, luminance ≈ 0.34..0.76
Separator: `(r-g) > 0.020 && lum > 0.14`. r-g is the strong discriminator - luminance alone
overlaps between bright fabric and shadowed fingers.

Build the mask ONCE at load, then reuse:
  1. threshold as above
  2. median 9 (drop speckles), then max 9 then min 9 (close holes, restore the edge)
  3. keep only the connected component containing a point inside the back of the hand (~62% x, 45% y)
  4. gaussian blur ~2.2px for a soft edge
  Result covers ~42% of the frame on the dark asset.

Recolour, per pixel, inside the mask:
  lum   = 0.2126r + 0.7152g + 0.0722b
  smean = mean lum over the mask          (0.620 for this asset)
  ratio = clamp(lum / smean, 0, 3) ^ 0.92 (the gamma stops highlights blowing out)
  out   = targetRGB * ratio + (rgb - lum) * 0.45   (that last term keeps knuckle redness and veins)
  final = mix(original, clamp(out,0,1), mask)

Verified against all six store tones: shading, veins, knuckles, wrinkles and the real cast shadow
all survive, and the deepest tone stays believable. The linen deliberately does NOT change — the
surface is the same, only the person is different.

For performance: compute the mask once into an ImageData, keep it, and only re-run the cheap
per-pixel recolour when the tone changes. Cache each tone's canvas.

## UPDATE — a real RIGHT hand photo now exists; stop mirroring

The owner supplied a second photograph: the same person's RIGHT hand, same dark linen, same lighting.
  assets/img/hand-real-right.jpg     1081x816 — the master
  assets/img/hand-real-right-sm.jpg   820x619 — the phone variant
(the existing hand-real.jpg / hand-real-sm.jpg are the LEFT hand)

This removes the mirror entirely. Two consequences, both improvements:
- the pair is no longer perfectly symmetrical, which was the one thing that gave the composition away
- the right hand's anchors must be calibrated against ITS OWN photo, not derived from the left's

The same mask threshold works unchanged on the new photo: `(r-g) > 0.020 && lum > 0.14`, seeded from
a point inside the back of the hand (~66% x, 48% y), gives a clean 34.8% coverage.
Measured on the right-hand photo: linen r-g = -0.033..-0.044, skin r-g = +0.094..+0.164.

## UPDATE — the composition must be PORTRAIT

Both the owner and my own read of the render agree: the landscape, wrists-together pose is wrong.
Fingers point UP, wrists at the bottom, the two hands side by side with the thumbs facing inward.
The owner also made a second point worth honouring: portrait suits the phone, and it makes the nails
render LARGER, which is what the customer is actually trying to judge.
Both source photos are landscape with the fingers pointing left, so each needs a quarter turn.
