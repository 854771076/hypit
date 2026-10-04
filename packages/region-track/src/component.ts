import type { ComponentPackage } from "@hypit/component-kit";
import { canonicalize } from "@hypit/protocol";
import type { StoredValue } from "@hypit/protocol";
import type { SpatialFrame } from "@hypit/spatial";
import type { SvsRecipe } from "@hypit/svs";
import type { Timeline } from "@hypit/timeline";

import { regionTrackProducers, regionTrackTypes } from "./manifest.js";
import { assertRegionTrack, resolveRegionTrack } from "./region.js";
import type { RegionTrack } from "./types.js";

function inline<T>(value: StoredValue | undefined, label: string): T {
  if (value?.kind !== "inline") throw new Error(`${label} must be inline.`);
  return value.value as unknown as T;
}
const output = (value: unknown) => ({ kind: "inline" as const, value: canonicalize(value) });

export const regionTrackComponent = {
  producers: [{ producer: regionTrackProducers.resolve, handler: ({ inputs }) => ({ outputs: { track: output(resolveRegionTrack(
    inline<SvsRecipe>(inputs.recipe?.value, "Recipe"),
    inline<SpatialFrame>(inputs.within?.value, "SpatialFrame"),
    inline<Timeline>(inputs.timeline?.value, "Timeline"),
  )) }, needs: {} }) }],
  validators: [{ type: regionTrackTypes.track, handler: ({ value }) => assertRegionTrack(inline<RegionTrack>(value, "RegionTrack")) }],
} satisfies ComponentPackage;
