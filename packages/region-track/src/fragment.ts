import { sealGraphFragment } from "@hypit/elaborator";
import { spatialTypes } from "@hypit/spatial";
import { svsRecipeType } from "@hypit/svs";
import { timelineTypes } from "@hypit/timeline";

import { regionTrackProducers, regionTrackTypes } from "./manifest.js";

const input = (name: string) => ({ kind: "fragment-input" as const, name });

export const regionTrackFragment = sealGraphFragment({
  inputs: [
    { name: "within", type: spatialTypes.frame },
    { name: "timeline", type: timelineTypes.timeline },
    { name: "recipe", type: svsRecipeType },
  ],
  operations: [{ id: "resolve", producer: regionTrackProducers.resolve, inputs: {
    within: input("within"), timeline: input("timeline"), recipe: input("recipe"),
  }, result: { kind: "output", name: "track" } }],
  exports: [{ name: "track", type: regionTrackTypes.track, root: { kind: "fragment-operation", operation: "resolve" } }],
});
