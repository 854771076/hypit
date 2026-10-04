import type { ComponentPackage } from "@hypit/component-kit";
import { canonicalize } from "@hypit/protocol";
import type { StoredValue } from "@hypit/protocol";
import type { NarrativeAlignment } from "@hypit/narrative-temporal";
import type { LocalTemporalDomain } from "@hypit/temporal";

import { narrativeAlignmentAdjustProducers } from "./manifest.js";
import { adjustNarrativeAlignment } from "./program.js";
import type { NarrativeAlignmentAdjustmentPlan } from "./types.js";

function inline<T>(value: StoredValue | undefined, subject: string): T {
  if (value?.kind !== "inline") throw new Error(`${subject} must be inline.`);
  return value.value as unknown as T;
}

export const narrativeAlignmentAdjustComponent = {
  producers: [{
    producer: narrativeAlignmentAdjustProducers.adjust,
    handler: ({ inputs }) => ({
      outputs: {
        alignment: {
          kind: "inline",
          value: canonicalize(adjustNarrativeAlignment(
            inline<NarrativeAlignment>(inputs.source?.value, "NarrativeAlignment"),
            inline<LocalTemporalDomain>(inputs.domain?.value, "LocalTemporalDomain"),
            inline<NarrativeAlignmentAdjustmentPlan>(inputs.plan?.value, "NarrativeAlignment adjustment plan"),
          )),
        },
      },
      needs: {},
    }),
  }],
} satisfies ComponentPackage;
