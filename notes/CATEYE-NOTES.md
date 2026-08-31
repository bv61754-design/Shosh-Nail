# Cat-eye (magnetic gel) — what the four owner-supplied reference photos actually show

The photos are in this same folder. READ THEM with the Read tool — you can see images.
They are REFERENCE ONLY. Do not embed, trace, or copy any photo into the repo. Study how the
physical effect behaves, then author the look from scratch in SVG.

  cateye-1-oxblood.jpg   long stiletto, near-black oxblood base, blood-red band
  cateye-2-red.jpg       long almond, black base, bright crimson band
  cateye-3-purple.jpg    almond, black base, magenta-purple band
  cateye-4-pink-velvet.jpg  the pale "velvet / pearl" variant: milky pink, soft white band

## What the current code gets wrong

`PATTERNS.catEye` draws the band DIAGONALLY, corner to corner
(M -0.14w,0.86h → C … → 1.14w,0.14h), over a flat dark vertical gradient.
Every reference photo shows something different, in three specific ways:

1. **The band runs LENGTHWISE — cuticle to tip — centred on the nail's long axis**, not corner to
   corner. It follows the nail's own curve. (A diagonal magnet pull exists as a real variation, but
   it is not the default and it is not what these show.)
2. **There is a dark frame around the ENTIRE perimeter.** This is the signature of magnetic gel: the
   magnet pulls the metallic pigment to the band and away from the edges, so cuticle, tip and BOTH
   side walls go much darker than the base — close to black in photos 1-3. The current render has no
   vignette at all, and this single omission is most of why it does not read as cat eye.
3. **The falloff is smooth and wide, and it never blows out to white.** The core is a saturated,
   luminous version of the colour — not a white streak. The current code mixes the core 30% toward
   white and adds a near-white centre line; the photos show the brightest point staying firmly in
   the hue.

## What to build, from the photos

- **Band**: centred lengthwise, widest around the middle third, tapering slightly toward the cuticle
  and the tip. At its widest it covers roughly 45-55% of the nail width in photos 1-3.
- **Radial-along-a-line falloff**: brightest at the band's core, dropping through a mid tone to the
  deep base, over a distance of roughly a quarter of the nail's width on each side. No hard edge
  anywhere.
- **Perimeter vignette**: darkest at the very edge, easing inward. Strongest at the side walls and
  the cuticle, slightly less at the tip. In photos 1-3 the edge is essentially black.
- **The core hue** is the customer's chosen colour at high saturation and raised lightness. Derive
  the deep base from the SAME hue, heavily darkened — in the photos the dark is clearly a very dark
  version of the red / purple, not neutral black.
- **Fine shimmer**: the magnetic pigment is visible as very fine sparkle INSIDE the band, densest
  along the core. Small, subtle, deterministic.
- **Gloss on top**: small, SHARP, bright speculars — a few short elongated spots near the upper
  third and along the ridge — not one big soft blob. Photo 4 shows the classic single sharp streak.
- **The pale variant (photo 4)** must work too: when the customer picks a light colour, the base
  cannot go black. Scale the vignette and the contrast with the colour's lightness, so a pale pink
  gives a milky base with a soft pearl band, exactly like photo 4.

## Must keep working

- The customer's two chosen colours drive it: `pattern.color` = the band, `pattern.color2` = the base.
  Sensible results when the two are similar, when they are opposites, and when the base is light.
- `pattern.scale` (0.6-1.6) should change the band's WIDTH, and can slightly affect its softness.
- Test across the full colour range in the store: near-black, deep red, purple, hot pink, pale nude,
  white, and a neon. Every one must look like cat eye, not like a smudge.
