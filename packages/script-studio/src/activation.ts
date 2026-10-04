import { createStudioCompanionHostFacet } from "@hypit/studio-adapter";

import { scriptStudioTemporalDomains } from "./index.js";

export default {
  format: "hypit.node-package@1" as const,
  hostFacets: [createStudioCompanionHostFacet({ temporalDomains: scriptStudioTemporalDomains })],
};
