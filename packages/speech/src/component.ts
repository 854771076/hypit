import type { ComponentPackage } from "@hypit/component-kit";
import type { StoredValue } from "@hypit/protocol";

import { assertSpeechDurationIdentity } from "./identity.js";
import { speechTypes } from "./manifest.js";
import type { SpeechDuration } from "./types.js";

function inline<T>(value: StoredValue, subject: string): T {
  if (value.kind !== "inline") throw new Error(`${subject} must be inline.`);
  return value.value as T;
}

export const speechComponent = {
  validators: [
    { type: speechTypes.duration, handler: ({ value }) => assertSpeechDurationIdentity(inline<SpeechDuration>(value, "SpeechDuration")) },
  ],
} satisfies ComponentPackage;
