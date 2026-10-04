import { createMarkupSurfaceHostFacet } from "@hypit/markup";

import {
  decodeRegionTrackSurface,
  regionTrackComponent,
  regionTrackManifest,
  regionTrackMarkupSurface,
  regionTrackModuleRef,
} from "./index.js";

export const hypitPackage = {
  format: "hypit.node-package@1" as const,
  modules: [{ manifest: regionTrackManifest }],
  components: [regionTrackComponent],
  hostFacets: [createMarkupSurfaceHostFacet({
    module: regionTrackModuleRef,
    declaration: regionTrackMarkupSurface,
    handler: decodeRegionTrackSurface,
  })],
};
export default hypitPackage;
