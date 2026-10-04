import type { ComponentPackage } from "@hypit/component-kit";
import type { StoredValue } from "@hypit/protocol";
import { timelineTypes } from "./manifest.js";
import { assertTimelineIdentity } from "./identity.js";
import type { Timeline } from "./types.js";

function track(value: StoredValue | undefined): Timeline {
  if (value?.kind !== "inline") throw new Error("Timeline must be inline.");
  return value.value as unknown as Timeline;
}

export const timelineComponent = {
  producers: [],
  validators: [{
    type: timelineTypes.track,
    handler: ({ value }) => assertTimelineIdentity(track(value)),
  }],
} satisfies ComponentPackage;
