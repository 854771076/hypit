import { sealGraphFragment } from "@hypit/elaborator";
import { narrativeTemporalTypes } from "@hypit/narrative-temporal";
import { temporalTypes } from "@hypit/temporal";

import { narrativeAlignmentAdjustProducers, narrativeAlignmentAdjustTypes } from "./manifest.js";

const input = (name: string) => ({ kind: "fragment-input" as const, name });

export const narrativeAlignmentAdjustFragment = sealGraphFragment({
  inputs: [
    { name: "source", type: narrativeTemporalTypes.narrativeAlignment },
    { name: "domain", type: temporalTypes.localDomain },
    { name: "plan", type: narrativeAlignmentAdjustTypes.plan },
  ],
  operations: [{
    id: "adjust",
    producer: narrativeAlignmentAdjustProducers.adjust,
    inputs: { source: input("source"), domain: input("domain"), plan: input("plan") },
    result: { kind: "output", name: "alignment" },
  }],
  exports: [{
    name: "alignment",
    type: narrativeTemporalTypes.narrativeAlignment,
    root: { kind: "fragment-operation", operation: "adjust" },
  }],
});
