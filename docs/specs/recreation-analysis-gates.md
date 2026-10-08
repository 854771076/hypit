# Reference recreation analysis gates

Status: implemented.

## Public seams

- `hypit media shots <file> --json` returns `hypit.shot-analysis@1` with native-frame cuts, shots and
  independent 3–10 frame edit events. Pixel analysis never invents narrative meaning.
- `hypit transcribe <file> --language auto` detects source language, records confidence, stops for
  confirmation below the selected threshold, then retranscribes with the explicit dialogue language.
- `hypit media prepare-depth-source` accepts only a declared original reference, validates it as video,
  and copies its bytes without changing pixels. `clean-text` is disabled; generated outputs with unwanted
  text are rejected during review and regenerated.

## Acceptance

- Synthetic 24 fps cuts at frames 12, 24 and 36 are returned on those frames.
- Automatic transcription invokes `auto` followed by the accepted explicit language; low confidence
  produces no transcript until confirmed.
- Transcript artifacts keep source, dialogue and subtitle languages separate and do not treat pending
  translation or subtitles as produced material.
- Depth-source preparation succeeds independently of source subtitles, watermarks or story text.
- Every key-character shot requires an approved identity review before Timeline admission.
- Provider failures preserve service evidence; an unknown StarRouter submission outcome is never retried,
  while transient polling and download failures resume from the checkpointed task.
- Result inspection separates available target Outputs from reusable intermediates and groups by Type.

Automated biometric identity scoring remains optional; the implemented default is an explicit human
identity-review gate against the selected character board.
