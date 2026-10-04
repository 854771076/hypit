import type { ModuleManifest, TypeRef } from "@hypit/protocol";

export const speechModuleRef = { name: "@hypit/speech", version: "1" } as const;
export const speechTypes = {
  duration: { module: speechModuleRef, name: "SpeechDuration" },
} satisfies Record<string, TypeRef>;
export const speechManifest: ModuleManifest = {
  format: "hypit.module@1", name: speechModuleRef.name, version: speechModuleRef.version,
  dependencies: [],
  types: [{ name: speechTypes.duration.name }],
  capabilities: [], producers: [],
};
export const speechDependency = { module: speechModuleRef } as const;
