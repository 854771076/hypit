import { artifactTypes } from "@hypit/artifact";
import { sealGenerationPortRequest, sealGenerationPortTable } from "@hypit/generation";
import type { GenerationPortValue } from "@hypit/generation";
import { defineExactModelModule } from "@hypit/model-kit";

export const depthVideoModuleRef = { name: "@hypit/depth-video", version: "1" } as const;

export const depthVideoPorts = sealGenerationPortTable({
  model: "depth-video",
  result: "video",
  ports: [{ name: "source", value: { kind: "media", accepts: ["video"] }, minItems: 1, maxItems: 1 }],
  requires: [],
});

export function sealDepthVideoRequest(ports: Readonly<Record<string, readonly GenerationPortValue[]>>) {
  return sealGenerationPortRequest(depthVideoPorts, ports);
}

export const depthVideoDefinition = defineExactModelModule({
  module: depthVideoModuleRef,
  endpoints: [{ key: "video", requestTypeName: "DepthVideoRequest",
    producerName: "request-depth-video", ports: depthVideoPorts }],
});
export const depthVideoEndpoint = depthVideoDefinition.endpoints.video!;

export const depthVideoSurface = {
  name: "video", tag: "Video", mode: "structured" as const,
  outputs: [depthVideoEndpoint.draftType, depthVideoEndpoint.mediaBindings.source!.type],
  vocabulary: {
    summary: "Converts one source video into a grayscale depth video.",
    attributes: [
      { name: "id", kind: "identifier" as const, required: true, summary: "Names the processed depth video." },
      { name: "source", kind: "reference" as const, required: true, accepts: [artifactTypes.blob],
        summary: "Chooses the source video Artifact." },
    ],
    ports: [{ name: "video", type: artifactTypes.blob, summary: "The generated depth video Artifact." }],
    example: '<depth:Video id="depth" source={performance.video}/>',
    notes: [
      "The source determines duration, frame rate and dimensions.",
      "The result is an ordinary video Artifact. MiniMax H3 and Seedance can consume it as a structural reference, but that does not become native depth or ControlNet conditioning.",
    ],
  },
};
