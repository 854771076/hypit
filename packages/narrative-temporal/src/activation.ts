import { createAdmissionPackageFacet } from "@hypit/admission";
import { createProducerPackageFacet } from "@hypit/producer";
import { createMarkupSurfaceFacet } from "@hypit/markup";
import { decodeNarrativeProjectionSurface, narrativeProjectionMarkupSurface, narrativeTemporalComponent,
  narrativeTemporalManifest, narrativeTemporalModuleRef } from "./index.js";

export const hypitPackage = {
  format: "hypit.package@1" as const,
  modules: [{ manifest: narrativeTemporalManifest }],
  facets: [
    ...[narrativeTemporalComponent].flatMap((component) => [createProducerPackageFacet(component), createAdmissionPackageFacet(component)]),createMarkupSurfaceFacet({ module: narrativeTemporalModuleRef,
    declaration: narrativeProjectionMarkupSurface, handler: decodeNarrativeProjectionSurface })],
};
export default hypitPackage;
