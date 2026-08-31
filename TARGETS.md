# Scale- and tone-matched targets (measured, not assumed)

Three of the original targets were wrong, each in a different way. Every one
of them cost a cycle before it was caught. Measure the REFERENCE the same way
you measure the RENDER, at the same pixel size and on the same kind of colour.

## 1. The gradient/flatness targets are SCALE-dependent

The real nail (refs/gloss-nail-1.png) measured at several pixel widths, same
metric (`median |grad| per 1% of width`, gaussian 1.2 pre-smooth):

    445 px wide   |grad| 0.0196   dead-flat  3.4%
    330 px         0.0156                    5.6%
    220 px         0.0130                    8.4%
    165 px         0.0121                    9.3%   <-- our studio size
    110 px         0.0113                   10.0%

The original 0.0190 / 3.5% came from the 445 px source. At the size a customer
actually sees a nail in the studio (~165 device px at DSR 3, 1280 viewport)
the honest target is **0.0121 and 9.3%**.

## 2. The highlight-area targets are TONE-dependent

Scoring a real photograph of pale pink press-ons (refs/cateye-4-pink-velvet.jpg)
with the same code gives area above 2x its own median = **0.00%** and above 3x
= **0.00%**. Identical to ours. The 8.4% / 3.8% figures came from a mid-tone
dusty pink; a pale nail cannot be three times its own median without leaving
the page. Do not chase them on a nude.

Real pale reference: peak/body 1.74, leastSat 0.28, median lum 0.53.

## 3. The one that is exposure-independent, and the most useful

**nail median / skin median**, on the same hand, in the same frame.
Real hand wearing pale press-ons: **1.18** — the nail is BRIGHTER than the
finger. Nothing else caught that this render was at 0.89 and reading grey.

## Also retracted

- "The plates make the cloth beside them brighter where the hand darkens it."
  Artefact. Hiding the plates gives the identical bands (+7.1 / +4.7 / +0.1 /
  -2.7). Run night/measure-off.js before believing any proximity measurement.
- "Patterns lose the surface." Not true. Patterned nails score BETTER than
  plain on dead-flat area, chroma slope and least-saturated.

## Cycle 6: two dead ends closed with evidence

**Translucency does not work here.** The idea: let the photographed natural
nail read through a pale plate, for free per-finger structure. The control
kills it — the photograph UNDER each plate measures |grad| 0.0077 with 27.2%
dead-flat, against the plate's own 0.0089 / 18.8%. It is smoother than what it
would be showing through. Reverted.

**The structure gap does not respond to noise.** Sweeping the grain amplitude
at 0.11 / 0.16 / 0.25 with the band widened to four octaves gives |grad|
0.0091 / 0.0092 / 0.0092 — flat. Whatever is missing is STRUCTURED variation
the render does not model, not missing grain. Stop adding noise.

**And the context for the target.** In the same photograph, at plate scale,
normalised the same way:

    skin                        |grad| 0.0136   flat  6.0%
    bare natural nails                 0.0077        27.2%
    our plate                          0.0089        18.8%
    reference press-on (other camera)  0.0121         9.3%

So the plate is already more alive than the nails in this photograph and less
alive than the skin beside them, and the 0.0121 target sits near the skin —
reachable in principle, but not by noise.

## The owner's own report, 31 Aug 07:30 (his words, and they measure out)

"حُلت مشكلة الظلال لكن يبدو أن قاعدته ليست لاصقة على الأظافر" — the shadow
problem is solved, but the plate's BASE does not look glued down.

He is right, and it is the same defect at both ends of the plate: the edges are
drawn as if the plate were laid on top, not bonded.

**THE FREE EDGE, measured.** Luminance along the nail, cuticle to tip, over the
nail's own median, nine real pale press-ons on a real hand
(refs/cateye-4-pink-velvet.jpg) against our ten plates:

    REAL   0.94 1.03 1.04 1.04 1.04 1.03 1.02 1.03 1.04 1.03 1.02 1.00
           0.99 0.97 0.97 0.96 0.97 0.97 0.97 0.97 0.99 1.02 1.06 1.10
    OURS   0.98 0.95 0.94 0.95 0.95 0.97 1.01 1.04 1.05 1.06 1.07 1.07
           1.09 1.10 1.10 1.07 1.07 1.03 0.98 0.93 0.86 0.82 0.74 0.55

    tip (last 15%) / body (middle 50%):   real 1.04, tip peak 1.10
                                          ours 0.70

Our free edge goes DARK where a real one goes BRIGHT. At the sides of a plate
you see a grazing reflection of the room; at the TIP you are looking at the cut
end of a millimetre of acrylic, which is thick, scattering and pale. The env
rim was mixing dark cloth into it at nearly full strength.

**THE CUTICLE.** What makes a press-on read as bonded rather than placed:
  - the skin fold rides slightly OVER the plate's edge, so you never see the
    plate's own cuticle edge as a free curve
  - a hairline of occlusion exactly at the join, not a soft shadow near it
  - the lateral folds overlap the plate's sides near the base too
  - no visible step: the glue fills it
Ours ends in a clean curve lying on top of the skin. That is "placed on".

## Cycle 8 — RETRACTED. The bright free edge was a design, not physics

`refs/cateye-4-pink-velvet.jpg` is a pale PEARL/CAT-EYE finish, translucent,
long, photographed over a pale grey table. Its tips are bright because a thin
translucent free edge over a BRIGHT background is lit through. That is a
product choice, not what a free edge does.

Two plain, opaque press-ons, measured the same way:

    his own dusty pink (refs/gloss-nail-1.png)   tip/body 0.74
    the shop's black glitter (shosh-cateye-post) tip/body 0.54
    the pale velvet hand                         tip/body 1.04   <- the design

Ours, as committed at 5dc2c38: **0.76**. Already right. The cycle-8 changes
(map tip fade 0.090 -> 0.160, brighter free-edge stops) pushed it to 0.80,
AWAY from plain-nail reality. Both dropped. Fourth wrong target.

## Cycle 9 — nail/skin 1.18 is wrong too, and it is not a finish target

Patch-sampled on the same photograph (9 nail patches, 10 skin patches, medians,
`night/ref-ratio.py`, boxes checked by eye in `night/boxes-velvet2.png`):

    real hand wearing pale press-ons:  nail 0.576  skin 0.538  **nail/skin 1.07**

Not 1.18. And even 1.07 is mostly a statement about how light that model's
polish was next to that model's skin — implied paint/skin about 1.19 — where
the shop's Rosy Nude sits at 1.02 of the studio hand's skin. A finish cannot
be asked to close that; only a lighter colour can. Stop using it as a target.
Fifth wrong target.

## Cycle 9 — the metrics that ARE paint-independent, and where they came from

Sample the nail interior, sort the pixels by luminance, take decile medians of
luminance and of saturation (`night/cyc9.py`, `night/satlum.py`):

                                 REF plain   REF velvet   ours before   ours after
    body sat / paint sat            ~0.90        ~0.90        0.69          0.85
    sat top decile / bottom          0.30         0.17        0.63          0.63
    lum decile 10 / decile 1         2.7          1.93         1.53          1.55

A real nail keeps nearly all of its pigment across nine deciles and washes out
ONLY in the top one, where the lamp is. Ours was washed out everywhere.

**Cause: the screen blend, not the veil's colour.** Screening anything onto a
base that is already bright drives every channel toward 1 and the brightest
channel arrives first, so the chroma closes. Tested: veil tinted at full chroma
instead of lightened toward white -> 0.71. Veil in the nail's own colour
untouched -> 0.73. Only cutting how much veil there is works: at 0.30 the body
holds 0.85 (nude) and 0.90 (red, which is the reference figure exactly).

**And the reflection sheet cannot be turned up.** `specReflect` already emits
opacity `k*(0.86 + r*0.24)`, so for gloss it is at 0.86-1.10 and SVG clamps it
at 1. Sweeping a gain of 1.0 / 1.6 / 2.2 gave identical numbers to three
decimal places. More concentrated specular has to come from `tools/spec-map.py`
(a brighter, tighter sheet), not from the renderer.

**Still open after cycle 9.** `lumD10/D1` 1.55 against 1.93-2.7: a pale nail
still has no deep tone in it. The bottom is missing, not the top, and the top
cannot supply it — screen has no headroom on a base already at 0.85.

## Cycle 9, second half — the map was paying for the nudge out of the nail

`photoGloss` lays the shade map down oversized so a multiply layer never stops
short of the silhouette. The oversize was 1.09-1.16 plus offsets of 7%/5% and
five degrees, and the map filled its own image, so the plate only ever saw the
middle of the measurement. Cropping the shipped map the way the renderer was
effectively cropping it:

    whole map    d95/d5  1.85
    central 92%          1.71
    central 84%          1.64
    central 72%          1.55   <- and the plates measured exactly 1.55

The missing range was the map's own. Most of it is the transverse curve: the
map's columns run 0.53 at the shaded wall to 0.95 across — the nail bending
away from the light, i.e. the structured variation cycle 6 concluded was
missing and could not be had from noise. `tools/gloss-map.py` now emits the
nail at KEEP=0.90 inside an edge-replicated border and the nudge was shrunk to
fit the border. lumD10/D1 1.55 -> 1.60, |grad| 0.0133 -> 0.0141, flat 8.4% ->
7.4%. No seam at any of the ten silhouettes at 3x.

Why only +0.05 and not +0.25: the map is warped so every row is full width, and
it is laid back down as a plain RECTANGLE. On an almond or a stiletto the
extreme columns land outside the silhouette and are clipped, so the shaded wall
only reaches the plate where the nail is widest. Un-warping it back onto the
silhouette on the way down is the next real step, and it is a renderer change,
not a map change.

## Reproducibility, established

`python3 tools/gloss-map.py refs/gloss-nail-1.png --write` reproduces the
shipped map byte for byte (the tool used to report this as "could not find the
shade: field", which is a no-match/no-change bug, now fixed). So the asset can
be regenerated from the photograph at any time.

## Cycle 10 — the across-nail profile, and a measurement bug that hid it

New harness: `night/across.py` (profile perpendicular to the long axis, 16
bands, luminance over the nail's own median; takes an erosion in px as arg 4).

**Sample the render the way the reference was sampled.** The reference numbers
come from a rectangle strictly INSIDE a nail, so they contain no silhouette and
no contour. Comparing them against a plate eroded by 3 px is not the same
measurement — erode 19 px (about 6 CSS px) and our own profile changes by 0.05
at the walls. Use `19`.

**And orient each plate before averaging.** PCA gives the short axis an
arbitrary SIGN, and the ten plates on the two hands are lit from opposite
sides, so averaging raw profiles cancels the very asymmetry being measured.
Fixed in across.py: each plate is flipped darker-half-left before the mean.
Two tuning rounds were wasted on the cancelled version.

    his plain dusty pink  0.67 0.76 0.81 0.86 0.91 0.94 0.97 1.00
                          1.00 1.07 1.11 1.13 1.16 1.18 1.16 1.13
    the pale press-ons    0.81 0.87 0.91 0.93 0.95 0.97 0.97 1.00
                          1.00 1.03 1.06 1.08 1.09 1.09 1.09 1.07
    the shop's black      0.91 1.03 1.30 1.58 1.58 1.13 0.86 0.69
                          0.65 0.57 0.67 0.82 1.43 1.67 1.44 0.97
    ours (e19)            0.72 0.81 0.91 0.99 1.01 1.00 1.01 1.02
                          1.03 1.02 1.01 1.02 1.03 0.99 0.90 0.83

A pale nail is a RAMP (diffuse pigment following the cosine of the light); a
black one is two specular streaks over a dark trough (no diffuse to ramp).
Ours is a symmetric arch: right for the black, too tidy for the pale.

**Shipped:** the lit wall's grazing reflection of the SOURCE, as a narrow screen
band on top of the room's rim. nude |grad| 0.0133 -> 0.0140, black 0.0516 ->
0.0530, nude lumD10/D1 1.58 -> 1.60, red 2.30 -> 2.37, nothing else moved.

**Reverted, with numbers:** rebuilding the C-curve as a ramp. It buys the
across-profile (lit wall 0.85 -> 0.92, swing 1.42 -> 1.58) and pays with four
other measures — nude dead-flat 7.4% -> 10.9%, nude bodySat 0.85 -> 0.83, red
|grad| 0.024 -> 0.021, black to 2.06 of its own swatch with |grad| 0.053 ->
0.037. The failure is structural, not a tuning miss: a ramp has to REPLACE the
arch's lit lobe, and the lengthwise form and the measured surface both sit on
top of that lobe, so all three have to move together or the plate just gets
brighter and flatter.

**Also ruled out along the way** (each measured, each no):
- taking the dark cloth off the lit wall (`kl`/`kr` scaling): no measurable
  change to the across-profile, and it lifts a black plate to 2.06 of its
  swatch. The room is on both walls; the source goes on top.
- pushing the lit wall's stops to nearly full `cLit` (`ramp * 1.7`): identical
  numbers. The outermost bands are not controlled by the C-curve's wall stops.

## Cycle 11 — the reflection sheet, and the silhouette question answered

**The sheet was short only at the very top, not "1.5-2.8% against 1.7-6.4%".**
Measured against the source photograph the same way (four nails a box fits
cleanly inside — the fifth box straddles an edge into bokeh and its numbers are
inflated, `night/postbox2.png`):

                    >0.60          >0.85          >0.95         peak
    photograph   5.1-10.4%      0.6-4.3%      0.13-1.29%   0.992-1.000
    shipped      6.2- 8.0%      1.5-2.8%      0.04-0.33%   0.965-0.973

Matched in the shoulders. The gap is entirely above 0.95, and the cause is the
0.9 px gaussian in `reflection()`: a gaussian is a mean and the peak of a small
bright thing is what a mean removes. Fixed by restoring the pre-blur maximum.

**leastSat: we are BELOW the reference, not above.** `percentile(sat,2)/median`
measured with score.py's own code on the real photographs: his plain dusty pink
**0.27**, the pale press-ons **0.36-0.38**. Ours: nude 0.17, red 0.15. The
scoreboard's "real 0.23-0.28" is about right for a mid-tone and we are under it,
so this metric wants our highlight BROADER, not whiter. Same gap as satTop/Bot
seen from the other end: our bright REGION holds too much pigment while our
brightest PIXELS go too white. The fix is a wider sheet core, in spec-map.py.

**Silhouette individuality: measured, and it is real.** `night/shape.py` on the
ten plates —

    aspect W/L   0.589 0.619 0.619 0.619 0.619 0.662 0.619 0.619 0.619 0.619
    normalised half-width profile: the ten differ by at most 0.012 anywhere

Eight of ten are the same number because `nh = nw * aspect * factor * fore`
(nail-render.js ~5355): the length is a fixed multiple of the measured width, so
only `fore` and the tip-clear clamp break the tie.

BUT: a press-on SET is one shape by definition — the customer buys a shape — and
the pale-press-on reference does show nine plates of one outline. What a real set
varies is length per finger, not curve. So the honest version of this item is
narrow: `an.tip / an.bed` is already measured per finger and runs 1.75 (thumb),
1.14, 1.16, 1.26, 1.03 (pinky), a 1.7x spread that the constant `aspect`
currently flattens. Worth doing; it is a length grading, not ten different
curves. Not attempted this cycle.

## Cycle 12 — the lateral folds, and a segmentation that lied

Shipped: the skin folds now ride over the plate's SIDES near the base, the same
way the cuticle fold rides over its end — one diagonal gradient per side in the
same mask, opaque at the outer corner of the base, gone inward and upward by
halfway along. A plate sits in a groove; the groove's walls overlap it.

**No metric moves, and that is the expected result.** Every measurement in this
harness samples the plate interior with an erosion, so a change at the JOIN is
invisible to all of them. Do not read "no change" as "no effect" here — and do
not go looking for a number to justify it. It is a look-at-it change and it was
looked at: 1:1 studio, 1:1 zoomed pair, 3x on the index and both thumbs.

**Retracted before it cost a cycle: the 2.29x silhouette spread.** Segmenting
the nine plates in the pale reference by warmth percentile gives W/L from 0.353
to 0.810, but `night/plateseg.png` shows the segmentation finding fragments and
background, not nail outlines — and several blobs are exactly window-height,
i.e. clipped by the sampling window. The number is meaningless. Pale plates on
pale skin with overlapping fingers is not a threshold problem.

What survives without it: `nh = nw * aspect * factor * fore` makes eight of ten
plates identical in W/L to three decimals (`night/shape.py`), and `an.tip /
an.bed` is measured per finger at 1.75 / 1.14 / 1.16 / 1.26 / 1.03. But a
press-on SET is one shape by design and the reference hand does wear nine
plates of one outline, so the honest scope is a length grading, not ten curves.
Left for a cycle that can measure it.

## Cycle 13 — THE SCOREBOARD WAS CALIBRATED THREE TIMES TOO LARGE

The studio draws a nail at **42-55 device px across**, not 165. Measured off the
plate polygons of the real `design.html` stage at a 1280 viewport, DSR 3:
widths 42 55 55 51 45 44 54 55 52 44. The scale table at the top of this file
says "165 px <- our studio size" and that line is wrong; 165 px is what
`night/hand2.js` at w:1200 produces, which is the ZOOMED harness. Every cycle
that read a target off that row was reading a target for a nail three times the
size of the one on the page.

`night/hand3.js` now takes a width: `node night/hand3.js out.png "#hex" "" 488`
reproduces the studio's own plate widths exactly. Use it for anything compared
against a target.

**The scale-matched reference, his own plain press-on** (`night/scale2.py`):

    445 px  |grad| 0.0192  flat  3.4%  peak/body 1.93  >2x 0.12%  leastSat 0.27
    220     0.0119   9.4%   1.92  0.11%  0.27
    110     0.0105  11.3%   1.91  0.09%  0.27
     55     0.0100  10.3%   1.90  0.00%  0.27
     42     0.0099   9.3%   1.87  0.00%  0.28

**The nude, at studio size, after this cycle:**

    |grad|      0.0096   against 0.0099-0.0100    MET
    peak/body     1.33   against 1.33-1.73        MET (tone-matched, below)
    >2x           0.00%  against 0.00%            MET
    >3x           0.00%  against 0.00%            MET
    leastSat      0.26   against 0.27 / 0.36-0.38 at the plain figure
    dead-flat    13.1%   against 9.3-10.3%        STILL 1.3x
    chromaSlope  +0.053  against "negative"       never validated on a reference

**peak/body is tone-dependent, like >2x and >3x before it.** Four real PALE
press-ons, interior boxes resampled to a 55 px nail: 1.33, 1.42, 1.73, 1.36.
Ours measured identically: 1.27, 1.36, 1.33. The 1.74/1.90 figures are from
mid-tone nails. And it cannot be chased from the top: our peak is 0.948 of white
where the real pale one is 0.908 — the entire difference is the BODY, ours 0.685
against 0.478, which is which colour was photographed.

**Shipped:** `REFL_PALE = 0.15`. A reflection is the same brightness whatever is
under it; a photograph of one is not. On a dark polish the specular lands on an
empty sensor and blows out, on a pale one the diffuse has already used the range
and the sum is compressed. Scaling the additive layer by the paint's lightness
took the nude's leastSat 0.20 -> 0.26 for peak/body 1.38 -> 1.33, and leaves
black alone (0.07 either way).

**The one clear gap left on the nude is dead-flat area, 13.1% against 9.3-10.3%.**
Not |grad|, which is met. So the missing thing is not overall variation but
SMALL-SCALE variation: an eighth of the plate has no gradient at all where a
real nail has a tenth. Grain was already ruled out (cycle 6, three amplitudes,
flat response).

## Cycle 14 — the dead-flat "gap" is inside the real spread; the grain was mis-scaled too

**Eighth retraction.** 9.7% dead-flat was ONE nail. Interior boxes of the same
relative size, resampled to a 55 px nail (`night/inner.py`):

    pale press-on 1  |grad| 0.0139  flat  9.8%
    pale press-on 2         0.0092        9.4%
    pale press-on 3         0.0087       17.8%
    pale press-on 4         0.0127       18.9%
    his plain               0.0085       11.7%
    OURS                    0.0078       17.5%

Real press-ons vary two to one on this number and ours is inside the range. Do
not treat a single reference nail as a target for a metric whose real spread
has never been measured.

**What IS consistently outside: interior |grad| 0.0078 against 0.0085-0.0139.**
All five references are above us. That is the honest remaining gap, and it is
smaller than the whole-nail numbers suggested.

**Grain had the same scale error as the scoreboard.** Amplitude and frequency
were set on a 135 px plate; at 42-55 px the grain measured 1.20 of the skin's
own high-frequency sigma — the plate was the noisiest object in the frame.
0.12/0.22 instead of 0.16/0.55: noise ratio 1.15, dead-flat 11.7% -> 11.0%,
|grad| 0.0096 -> 0.0098, leastSat 0.26 -> 0.27, black dead-flat 7.4% -> 5.2%.

**And grain is confirmed NOT to be the lever for interior structure**, now at
the right size and against the right metric: amplitude 0.12-0.20 over
frequencies 0.22 / 0.10 / 0.06 moves interior |grad| only 0.0076 -> 0.0084 and
costs a 1.27 noise ratio. Cycle 6 was right for the wrong reason.

## Cycle 15 — the owner was right again: ONE HUE over the whole plate

New metric, and it should have existed from the start: the **circular standard
deviation of the chroma direction** inside the nail (`night/huesd.py`,
`night/hueratio.py`). Plain std of an angle is meaningless across the +-180 wrap
— that cost one wrong diagnosis before it was caught.

    his own plain dusty pink   6.55 deg
    three pale press-ons       4.91 / 4.26 / 5.13
    ours, nude                 1.71
    ours, red                  0.58

`out = colour x SHADE + REFLECTION` cannot produce more than one hue: a
greyscale multiply scales all three channels equally and adding a grey leaves
HSV hue untouched. The plate was a FILL, by construction, and that is what the
eye kept calling a drawing.

**AND THE TARGET IS THE PLATE'S OWN FRAME.** The skin in our studio photograph
measures 2.16 deg. In the pale reference, the nails measure 4.26-5.13 against
that frame's own skin at 4.39 — ratio 0.97-1.17. Chasing the reference's
absolute 4-6 deg would have made our plate three times noisier than the
photograph it sits in. Ratio, never the absolute.

**Shipped:** per-channel grain. The colour matrix fed the turbulence's RED into
all three outputs, so the grain was pure grey. GRAIN_CHROMA = 0.22 of the total
is now independent per channel: plate/skin hue ratio 0.79 -> 1.16, luminance
noise ratio 1.15 -> 1.11 as a bonus.

**Two closed dead ends, both measured:**
- `polishShade()`, a Beer-Lambert self-filter on the wall colours: 1.71 -> 1.49.
  The walls are a sliver; the body is the plate.
- a per-channel gamma (`feComponentTransfer`) over the whole diffuse stack —
  the physically correct curve, verified in the DOM with the right exponents:
  1.71 -> 1.45. On a saturated colour the weak channels sit near zero and a
  gamma on them barely rotates the chroma direction.

**Still open:** red is at 0.80 deg where nude is 2.51. A saturated colour's hue
is intrinsically more stable under the same noise, which is probably correct —
but there is no real red press-on photographed to check it against.

## Cycle 16 — the blind panel FAILED, and that is the finding

Five independent lenses judged seven images (the real photograph plus six
recolours of it), unlabelled, scrambled, not told how many of each:

    truth     onyx        PHOTO       emerald     rosy        sand        red         purple
    light     REAL/82     cg/88       cg/90       cg/96       cg/97       cg/93       cg/87
    colour    cg/99       REAL/85     cg/93       cg/97       cg/97       cg/93       cg/92
    edge      cg/93       cg/65       cg/96       cg/86       cg/88       REAL/68     cg/92
    texture   cg/95       cg/58       ?/50        cg/92       cg/92       REAL/58     cg/58
    shopper   cg/88       ?/60        cg/65       cg/85       cg/88       cg/75       cg/58

**Four of five failed to find the real photograph. Three named a recolour as
the most real. The "ordinary shopper" lens called NOTHING a photograph —
including the genuine one.** The instrument does not measure what it claims:
prime a judge with "some of these may be computer-generated" and it finds
reasons in all of them. Do not run this test again in this form.

The one lens that got it right (colour) did so forensically, not perceptually —
it found that every other image is an exact per-pixel function of B and nothing
is a function-parent of B. All seven share identical cloth pixels, which leaks
the parent. A valid test needs different scenes, not variants of one.

**Its one ground-truth-checkable claim was FALSE.** The light lens reported the
pale recolours' highlights going negative in red. Measured, highlight core minus
body, every variant: rosy +0.002/+0.101/+0.103, sand +0.003/+0.060/+0.123 —
nothing negative anywhere. But the direction was right, and it led to the real
number below.

## Cycle 16 — the pale-colour wall, finally quantified

    the photograph's own grey (mid-tone polish)   body 0.495 -> highlight 0.896
    the same d and s with Rosy Nude #E9C2C0       body 0.952 -> highlight 1.024
    the same d and s with Red #C0392B             body 0.546 -> highlight 0.910

A pale polish arrives at the ceiling before the specular is even added. Exposure
does not help — it scales body and highlight together, so the CONTRAST RATIO is
invariant: stopping down 1.0 / 0.8 / 0.66 gives a red highlight-minus-body range
of 0.002 / 0.001 / -0.001.

And this is not a bug. Four real pale press-ons measure body luminance
0.502-0.639 while the Rosy Nude swatch is 0.793. **The swatch is lighter than
the photographed reality by about a third**, and that is the whole remaining
difference. Rendering the chip faithfully means rendering something no camera
would produce.

Put to the owner with a picture (recolour/choice.png): the same colour at chip
brightness (body 0.86), at camera brightness (body 0.56), and the real
photograph (0.50). His call, not the renderer's.
