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
