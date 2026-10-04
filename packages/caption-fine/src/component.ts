import type { Timeline } from "@hypit/timeline";
import type { CaptionDocument, CaptionProgram, CaptionTiming } from "@hypit/caption";
import type { ComponentPackage } from "@hypit/component-kit";
import type { StoredValue } from "@hypit/protocol";
import { canonicalize } from "@hypit/protocol";
import type { RegionTrack } from "@hypit/region-track";
import type { SpatialFrame } from "@hypit/spatial";

import { captionFineProducers } from "./manifest.js";
import { renderFineCaption } from "./render.js";
import { scheduleFineCaption } from "./schedule.js";
import type { FineCaptionSchedule } from "./types.js";

function inline<T>(value: StoredValue | undefined, subject: string): T {
  if (value?.kind !== "inline") throw new Error(`${subject} must be inline`);
  return value.value as T;
}

export const captionFineComponent = {
  producers: [
    {
      producer: captionFineProducers.schedule,
      handler: ({ inputs }) => ({
        outputs: { schedule: { kind: "inline", value: canonicalize(scheduleFineCaption(
          inline<CaptionTiming>(inputs.timing?.value, "CaptionTiming"),
          inline<CaptionProgram>(inputs.program?.value, "CaptionProgram"),
          inline<CaptionDocument>(inputs.document?.value, "CaptionDocument"),
        )) } },
        needs: {},
      }),
    },
    {
      producer: captionFineProducers.render,
      handler: ({ inputs }) => ({
        outputs: { track: { kind: "inline", value: canonicalize(renderFineCaption(
          inline<FineCaptionSchedule>(inputs.schedule?.value, "FineCaptionSchedule"),
          inline<CaptionProgram>(inputs.program?.value, "CaptionProgram"),
          inline<CaptionDocument>(inputs.document?.value, "CaptionDocument"),
          inline<Timeline>(inputs.timeline?.value, "Timeline"),
          inline<SpatialFrame>(inputs.within?.value, "SpatialFrame"),
        )) } },
        needs: {},
      }),
    },
    {
      producer: captionFineProducers.renderWithRegions,
      handler: ({ inputs }) => ({
        outputs: { track: { kind: "inline", value: canonicalize(renderFineCaption(
          inline<FineCaptionSchedule>(inputs.schedule?.value, "FineCaptionSchedule"),
          inline<CaptionProgram>(inputs.program?.value, "CaptionProgram"),
          inline<CaptionDocument>(inputs.document?.value, "CaptionDocument"),
          inline<Timeline>(inputs.timeline?.value, "Timeline"),
          inline<SpatialFrame>(inputs.within?.value, "SpatialFrame"),
          inline<RegionTrack>(inputs.regions?.value, "RegionTrack"),
        )) } },
        needs: {},
      }),
    },
  ],
} satisfies ComponentPackage;
