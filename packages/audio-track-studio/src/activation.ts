import { createStudioCompanionHostFacet } from "@hypit/studio-adapter";
import { audioTrackStudioParameterCompanions, audioTrackStudioTrackCompanions } from "./index.js";

export default {
  format: "hypit.node-package@1" as const,
  hostFacets: [createStudioCompanionHostFacet({
    tracks: audioTrackStudioTrackCompanions,
    parameters: audioTrackStudioParameterCompanions,
  })],
};
