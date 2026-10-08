# Shot production contracts

Read this when creating `ASSETS.md` and `SHOTS.md` for reference-led recreation or a generated
multi-shot narrative. These are project notes, not a second state machine. Keep only fields that carry
a real decision, reference edge or review obligation.

## Record selected assets in `ASSETS.md`

Give every continuity-bearing asset a stable key and version. A selected board is usable only after
original-resolution review.

```markdown
## character:lead / appearance:v1
- canonical facts: face, hair, body proportions, grooming and makeup
- costume signature: clothing, shoes, accessories
- performance anchors: posture, gait, habitual gaze or gesture
- selected board: productions/<target>/assets/lead-v1.png
- provenance: generated from <references>; reviewed <date>
- forbidden drift: alternate face, hairstyle, costume or body type

## scene:kitchen / version:v1
- geometry: entrances, exits, fixed architecture and camera sides
- anchors: foreground, midground and background objects
- light: motivated source, direction, quality and color
- selected board: productions/<target>/assets/kitchen-v1.png

## prop:cup / state:full
- form: scale, material, color and markings
- ownership: lead character, right hand after contact
- selected board: productions/<target>/assets/cup-full.png
```

Use the installed `@hypit/gpt-image-kits/asset-sheet` Prompt Kit to prepare character, scene or prop
boards. A changed costume, damaged object, different contents or changed time-of-day is another version,
not an informal prompt variation.

## Make every `SHOTS.md` entry executable

One entry owns one atomic production unit. Use human-readable prose; the headings below are a contract,
not a requirement to serialize the document as JSON.

Begin `SHOTS.md` with a semantic event table. Script words, actions and state changes own timing; seconds
and frames are reproducible compilation evidence. When a selected audiovisual result, accepted speech
timing or upstream shot duration changes, recompile every dependent event before generating or editing.

```markdown
## Semantic event timeline

| event id | semantic anchor | source evidence | depends on | fps | target frame/time | observed frame/time | delta/status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| male-face-reveal | after the woman's final word and settled reaction | reference 00:23.600 | S11 | 30 | 708 / 23.600 s | pending selected Film | pending; pass at ≤1 frame |
```

```markdown
## shot:S03
- source evidence: reference 00:08.200–00:10.000; transcript words or observed action
- narrative job: what changes and why the shot exists
- generated duration / intended edit: 5 s / 2.3 s
- provider / model / mode: StarRouter / Seedance / ReferenceVideo
- picture-and-sound: joint native audio
- first readable state: people, positions, gaze, held objects and prop states
- causal action: onset → path → contact/change → response/recovery
- stable tail: final positions, pose, gaze, held objects and remaining motion
- camera: side, axis, framing, lens character and one movement curve
- light and look: source, direction, exposure, white balance, texture and diffusion
- exact dialogue: one row per turn with speaker, original text, detected/confirmed language code,
  confidence, measured delivery and whether the speaker is visible
- sound: voice identity, ambience, action sounds and room perspective
- temporal storyboard: selected path, cell count and review status
- shot board: selected path, cell count and review status
- depth: `generate | reuse`; Provider, workflow/model, source shot, expected local Output,
  selected Result or reuse candidate and review status
- audio reference: selected path, language/voice/emotion responsibility and review status
- video prompt: selected Text Output/version and review status
- continuity in/out: previous shot relation, screen direction, entry/exit edge and intended cut
- timing: semantic event/word anchors, target compiled frames, observed selected-Result frames, delta/status,
  generated duration and intended edit
- approved visible text: exact text, storyboard path, panel/state order, format, geometry, visual review and
  prompt timing; `none` when absent
- selected audiovisual Result/version: current generated picture-and-sound source
- identity review: `required | approved | rejected | not_applicable`; list every required character,
  selected character-board version when present or required-board identity evidence, reviewer, evidence
  frames and decision
- native audio / speech timing / Caption timing / lip-sync review: selected versions and review status
- candidate budget: ordinary shots default to 2; named high-risk shots may use up to 3 when approved
- attempt ledger: candidate, observed failure cause, changed variable and decision
- same-cause failure count / next fallback: stop paid retries at 2 and return to storyboard, reference
  selection, continuity or model choice
- generation status: blocked | ready | submitted | accepted | rejected
- review risks: identity, hands/contact, text, audio, transition or other shot-specific risks
```

`generated duration` is the Provider request length. `intended edit` is the expected retained portion.
Do not hide the difference by shrinking dialogue or action to an implausible speed.

For the bundled RunningHub depth route, the ordinary generated contract is
`provider: runninghub`, `workflow: 2098674379113979905`, one source shot and one expected local depth
Output. The source shot may feed only this preprocessing edge when the Brief forbids source picture and
audio in the remake.

The selected generated audiovisual Result is the authority for its performed timing. Selecting or
regenerating a speaking shot invalidates every older word alignment, Caption timing and lip-sync review
derived from that shot. Return it and dependent edit events to `blocked`, then transcribe/review and
recompile from the new selected audio. Source audio may support analysis but must not enter a complete
remake's Timeline.

## Bind the ordered reference manifest

Append one row for every actual generation reference. Order and model labels must match the submitted
Surface children exactly. This table is a StarRouter Seedance example; another Endpoint may use a
different prompt-label dialect.

```markdown
| order | model label | role | selected file/version | responsibility | person reference | measured duration |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | @图片1 | identity | lead-v1.png | face, body, costume | true | — |
| 2 | @图片2 | scene | kitchen-v1.png | geometry, materials, light | false | — |
| 3 | @图片3 | temporal-storyboard | S03-temporal.png | action stages and reading order | true | — |
| 4 | @图片4 | shot-board | S03-shot-board.png | coverage, blocking and staging | true | — |
| 5 | @视频1 | depth | S03-depth.mp4 | structure, motion and camera | false | 5.0 s |
| 6 | @音频1 | audio-reference | S03-reference.wav | voice, delivery, emotion and room | false | 4.8 s |
```

Use H3 Ref2VA labels instead of Seedance labels for H3. Preserve the actual input order in every H3
section. One reference has one primary responsibility even when it supplies useful supporting detail.
A remote task id or URL is provenance, not the selected local asset.

## Apply the generation gate

Mark a shot `ready` only when:

- every selected optional asset board exists and passed review;
- every visible key character has an `approved` identity review against a selected character board or
  the identity evidence in both required boards;
  `required` or `rejected` blocks Timeline admission and requires regenerating that shot;
- both its temporal storyboard and shot board are connected and reviewed;
- its depth video, audio reference and reviewed video prompt are connected;
- start and tail states agree with adjacent accepted shots;
- manifest labels, order, files and Provider metadata match the actual Surface;
- joint native audio is enabled for every final shot, including wordless ambience and action, unless an
  explicit silent-video requirement or Endpoint limitation is recorded as a waiver;
- visible dialogue fits the duration and names the correct speaker;
- every source dialogue turn has its own confirmed language code and the prompt repeats that code beside
  the exact line, including when adjacent turns use different languages;
- approved visible text is exact, while incidental subtitles, glyphs, logos and watermarks are banned;
- source picture and source audio are absent when the Brief requires a complete remake.

For an exact countdown or device state, create a temporal storyboard—six cells by default—with each
required reading or state isolated in its own cell. Approve the original-resolution cells, then
pass the board as a semantic image reference to the video model and state the exact sequence and timing
in the prompt. The output must be one normal full-frame video, never the visible grid. Dialogue subtitles
remain a separate downstream Caption concern.

Stop after two candidates fail for the same observed cause. Do not buy another draw with equivalent
inputs: change the owning storyboard, reference binding, continuity contract or model, record the new
decision and obtain approval for any additional candidate budget.

Never repair a rejected generated shot by painting, inpainting, compositing, replacing a local region or
splicing source pixels into it. Correct the prompt and references, then regenerate the smallest failing
shot and run the same review again.

After generation, update the entry with the actual Result and acceptance decision. If a reference or an
accepted previous tail changes, return the dependent shot to `blocked` until its manifest and continuity
state are reviewed again.
