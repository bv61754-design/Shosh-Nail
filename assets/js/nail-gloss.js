/* =========================================================================
   SN.Gloss — the surface of a real nail, measured off a real nail (owner: NAIL)
   -------------------------------------------------------------------------
   Everything else on this site is drawn. This is not. It is one photograph of
   one press-on from the shop — taken flat, from directly above, in window
   light with no flash — reduced to the one thing a photograph of a pink nail
   can honestly tell a black one:

       out = colour x SHADE

   HOW THE SPLIT WAS MADE. Write a pixel as P = C.d + s, with C the polish's
   own colour, d the diffuse shading and s a white specular. The chromatic
   part of P (P minus its own grey) is C.d alone — s is grey and drops out —
   so d comes straight off the chroma, and s is whatever grey is left over.
   Fitted back against the photograph this reconstructs it to a mean error of
   0.003, under one level in 255, which is the check that the model is the
   right one and not a convenient story. What is stored here is d.

   WHY d AND NOT THE PHOTOGRAPH. A photograph is one colour. d is every
   colour: the pink of the nail that was photographed lives entirely in the C
   term, so the same measured surface drives a black nail, a red one and a
   nude one, each keeping its own pigment.

   WHAT WAS THROWN AWAY, AND WHY. s — the specular — was thrown away. The nail
   was lying on cloth, which tips its cuticle end toward the window and catches
   a hard bright wedge there with a dark one under it. That is the reflection
   of one room in one pose; on a finger there is nothing there, and the same
   wedge repeated on ten fingers is the most artificial thing a render can do.
   The bottom of the map fades out with it. The specular the nails DO get is
   drawn by SN.Nail, where the light of the hand can place it — but its size,
   its brightness and the hardness of its edge are the ones measured here:
   about a third of the width, a fifth of the length, peaking at 0.75 of pure
   white, and rising from nothing to two thirds of that peak across 2 per cent
   of the nail. That is what a real topcoat does, and it is much smaller,
   brighter and harder-edged than a drawn highlight tends to be.

   WHAT SURVIVES is the part that is about the material and not about the room:
   the lengthwise striations of the gel, its milky depth, the bright band down
   the length where the plate turns toward the light, the way the side walls
   fall away. None of that depends on which room it was in.

   The map is warped out of the photographed nail's silhouette into a plain
   rectangle first — every row of the nail stretched to the full width — so u
   means "across the nail here", not "across the photograph". That is what
   lets one measurement sit on all eight shapes.

   Public API (contract — do not rename):
     SN.Gloss.W, SN.Gloss.H    map size in pixels
     SN.Gloss.shade            data: URI, greyscale. 1.0 = the chosen colour,
                               and nothing is ever brighter than that.

   Orientation matches SN.Nail's plate box exactly: y = 0 is the FREE EDGE,
   y = 1 is the CUTICLE, x = 0 is the left side wall.
   ========================================================================= */
(function (w) {
  'use strict';
  var SN = w.SN || (w.SN = {});

  SN.Gloss = {
    W: 128,
    H: 192,
    shade: 'data:image/png;base64,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'
  };
}(window));
