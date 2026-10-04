import { createStudioCompanionHostFacet } from "@hypit/studio-adapter";
import { visualTrackStudioTrackCompanions, visualTrackStudioParameterCompanions } from "./index.js";

export default {
  format: "hypit.node-package@1" as const,
  hostFacets: [createStudioCompanionHostFacet({
    tracks: visualTrackStudioTrackCompanions,
    parameters: visualTrackStudioParameterCompanions,
  })],
};
