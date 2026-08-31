# Shosh Nail — the measurement lab

Everything used to decide whether the rendered nail on
[Shosh-Nail](https://github.com/bv61754-design/Shosh-Nail) reads as a
photograph or as a drawing. **No site code is here** and nothing here ships to
a customer.

The reason it exists in its own history: over sixteen cycles of work, **eight
separate targets turned out to be wrong**, each one costing at least a cycle
before it was caught. `TARGETS.md` is the record of every one of them — what
was believed, what the control showed, and what the corrected number is. It is
the most valuable file in this repository. Read it before trusting any number.

## The one rule

> Measure the REFERENCE the same way you measure the RENDER — same pixel
> width, same kind of colour, same erosion — or the scoreboard lies.

Every one of the eight retractions came from breaking that rule in a different
way. Three worth knowing before you start:

- **Size.** The studio draws a nail **42–55 device px across**, not 165. The
  gradient metrics are strongly scale-dependent, so a target measured on a
  445 px reference means nothing at 50 px. Render at the real size with
  `node measure/hand3.js out.png "#hex" "" 488`.
- **Tone.** Highlight-area and peak/body targets depend on how light the polish
  is. A pale nail and a mid-tone nail give different numbers for the same
  correct render.
- **Frame.** Noise and hue-spread targets are **ratios against the plate's own
  photograph**, never absolute figures from someone else's photograph. The
  skin beside the plate is the target.

## Layout

    TARGETS.md      the corrected targets and all eight retractions, in order
    measure/        the scoreboard, the scale study, the per-metric probes
    gloss/          the six-page smoke test, PNG export, perf, fidelity
    tell/           early per-region probes
    recolour/       recolouring a real photographed nail in place (P = C.d + s)
    notes/          written observations on the reference photographs

## Running it

Needs `python3` with numpy, scipy and Pillow, and `node` with
`playwright-core`. The browser scripts drive a local copy of the site:

    cd /path/to/Shosh-Nail && python3 -m http.server 8123
    node measure/hand3.js out.png "#E9C2C0" "" 488     # studio size
    python3 measure/score.py out.png nude              # the scoreboard
    python3 measure/hueratio.py out.png nude           # hue spread vs its own skin
    python3 measure/grain.py out.png                   # noise vs its own skin
    python3 measure/scale2.py                          # the reference at every width

`measure/hand3.js` takes `out.png`, a hex colour, an optional JSON tune object,
and a CSS width. **488 reproduces `design.html`'s own stage**; leaving the
width off gives ~135 px plates, which is the zoomed harness — fine for looking
at, wrong for any comparison against a target.

## What is deliberately not here

**The reference photographs.** They were supplied for study only and are not
redistributed. Scripts that read them expect a `refs/` directory beside this
README:

| file | what it is | used by |
|---|---|---|
| `gloss-nail-1.png` | one plain dusty-pink press-on on dark cloth, filling the frame | `scale.py`, `scale2.py`, `flatmap.py`, `recolour/*`, `tools/gloss-map.py` in the site repo |
| `shosh-cateye-post.jpg` | the shop's own black cat-eye product shot | `tools/spec-map.py` in the site repo |
| `cateye-4-pink-velvet.jpg` | pale press-ons worn on a hand | `across.py`, `satlum.py`, `ref-ratio.py`, `plateshape.py` |
| `cateye-2-red.jpg`, `cateye-3-purple.jpg` | worn sets, other colours | `plateshape.py` |

Also absent: the rendered PNGs and their JSON polygon sidecars. Those are
outputs — every one of them regenerates from the scripts above.

## The measurement that mattered most

Not any single number, but the habit behind them: **run the control before
believing a measurement.** `measure/measure-off.js` and `measure/studio-off.js`
hide the plates and re-measure. If the number is the same with them hidden, it
belongs to the photograph and not to the render. That one check overturned four
separate "findings" that had already been acted on.
