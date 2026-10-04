import { artifactManifest } from "@hypit/artifact";
import { compositionComponent, compositionManifest } from "@hypit/composition";
import { mediaComponent, mediaManifest } from "@hypit/media";
import { narrativeManifest } from "@hypit/narrative";
import { narrativeTemporalManifest } from "@hypit/narrative-temporal";
import { timelineManifest } from "@hypit/timeline";
import { spatialComponent, spatialManifest } from "@hypit/spatial";
import { speechManifest } from "@hypit/speech";
import { speechAlignmentManifest } from "@hypit/speech-alignment";
import { speechEvidenceManifest } from "@hypit/speech-evidence";
import { svsManifest } from "@hypit/svs";
import { temporalManifest } from "@hypit/temporal";
import { visualIrManifest } from "@hypit/visual-ir";

/** Shared test fixture only; production packages import only the contracts they use. */
export const videoContractManifests = [
  artifactManifest,
  narrativeManifest,
  narrativeTemporalManifest,
  mediaManifest,
  speechManifest,
  speechAlignmentManifest,
  speechEvidenceManifest,
  svsManifest,
  timelineManifest,
  spatialManifest,
  temporalManifest,
  visualIrManifest,
  compositionManifest,
] as const;

export { compositionComponent, mediaComponent, spatialComponent };
