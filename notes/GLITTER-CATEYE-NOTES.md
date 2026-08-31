# "كات آي جليتر" — a SECOND cat-eye type, measured from the shop's own product

The owner posted his girlfriend's real work on @shosh_nail. It is NOT the smooth coloured cat-eye
the earlier reference photos showed — it is a distinct, denser product, and it deserves its own
entry in the catalogue rather than being folded into `catEye`.

Reference (STUDY ONLY, never embed): refs/shosh-cateye-post.jpg, refs/shosh-nail-single.jpg
(one nail cropped and upscaled), refs/shosh-cateye-nail-zoom.jpg.
Both are Instagram screenshots, so the fine flake detail is compressed. The structure is clear
enough to build from; if the original files ever arrive, re-check the flake size against them.

## What the measurements say (luminance inside the plate, one nail)

    deep black       9.3%     the perimeter and the darkest gaps between flakes
    dark base       24.3%
    faint shimmer   26.2%
    mid shimmer     18.9%
    bright flakes   11.8%
    specular        9.5%     the two hard reflections

    flake coverage  27.1% of the plate above 0.55 luminance
    local contrast  0.277 std - very high, i.e. fine dense particles, not a smooth wash
    saturation      0.037 mean - the shimmer is PURE SILVER, it carries no hue at all

    luminance by third, cuticle -> tip:  0.540 / 0.376 / 0.247
    so the effect is brightest at the CUTICLE and fades toward the tip - the opposite of the
    tip-weighted glitter we already draw for `tipsGlitter`.

## How it differs from the `catEye` we just built
- the magnetic band is not a smooth gradient: it is a DENSE FIELD OF FINE SILVER FLAKES whose
  density follows the band, and individual flakes are resolvable
- the shimmer is achromatic silver regardless of the base colour
- the gradient runs along the nail's length, brightest at the cuticle
- two hard, narrow specular reflections (studio strip lights) rather than one soft sliver -
  they are what makes it read as a thick glossy gel coat

## What to build: a new pattern kind `glitterCatEye`
- base: the customer's dark colour, near black at the perimeter
- a lengthwise magnetic band, brightest toward the cuticle, as a DENSITY gradient over the flakes
  rather than a colour gradient
- flakes: a few hundred tiny deterministic specks at several sizes and opacities, brightest inside
  the band; silver by default, with an option to tint them for a gold or rose-gold version
- two narrow, hard-edged gloss reflections
- must stay legible at hand-preview size (~40px) - at that size the flakes merge into a sheen, and
  the band and the dark perimeter carry the read
- add it to data.js's patterns with an Arabic name like «كات آي جليتر» / "Glitter cat eye", and
  give the shop a ready-made design using it, since it is the product they actually sell
