# Asset and shot preproduction

Read this for reference-led recreation or a multi-shot generated narrative before writing final video
prompts. Its purpose is to make identity, world, action and continuity explicit before paid video
generation. It does not introduce a separate project state machine: keep decisions in the production's
Brief, Treatment, project notes, assets and Author Sources.

Use [Shot production contracts](shot-production-contracts.md) when writing the production's copyable
`ASSETS.md`, `SHOTS.md`, ordered reference manifest and generation gate.

## Complete the asset inventory first

Inventory every visible character, prop, location and dressing element. Completeness means nothing
visible is omitted from the production contract: narratively significant and continuity-bearing assets
receive stable keys and versions, while ordinary one-use dressing is explicitly recorded inside its
scene asset instead of becoming an independent prop asset.

| Asset | Record and prepare |
| --- | --- |
| Character | canonical identity, aliases, face, hair, body proportions, makeup, costume signature, shoes, accessories, expressions, recurring voice and each persistent appearance version |
| Scene | macro location, useful micro spaces, scale, fixed architecture, entrances and exits, camera sides, foreground/midground/background anchors, key-light source and direction, palette and important materials |
| Prop | form, scale class, material, color, markings, ownership or carrying relationship and every persistent state such as open/closed, intact/damaged or full/empty |
| Voice and sound | speaker identity, language, accent, pitch, timbre, pace, room perspective and any recurring environmental bed |

Treat a change of costume, age, damage, contents, time of day or stable set dressing as a version, not
as an informal prompt variation. Resolve missing identity, ownership, state and version decisions before
storyboarding. Do not infer an exact age, unseen side, prop state or spatial relationship from a name or
genre convention.

## Produce optional selected asset boards

Asset boards are reusable evidence, not a decorative contact sheet. They are optional in the default
shot contract; when continuity risk or the user's plan calls for them, generate, inspect and select them
before the shots that depend on them.

- A character board includes a face close-up, front/side/back full-body views and the approved costume,
  footwear, accessories, makeup and useful expressions. A material change receives its own appearance
  version derived from the selected base identity.
- A scene board is normally empty of named performers and includes consistent multi-angle views, a
  readable layout or axonometric view, entrances/exits, fixed anchors, key-light direction, palette and
  material samples. Its views must describe one coherent space.
- A prop board includes a clean principal view, front/side/back views and necessary construction details.
  A changed state derives from the selected base prop and changes only the evidenced state.

Inspect original-resolution boards for identity, geometry, version and accidental text before adopting
them. Keep the selected file, its role and provenance with the production. A remote URL or task receipt
alone is not an asset.

The installed `@hypit/gpt-image-kits/asset-sheet` Prompt Kit provides character, scene and prop board
treatments without making the board itself a workflow node.

## Make each shot an atomic production unit

One shot has one time and place, one continuous camera behavior and one principal causal action chain.
Split independent contacts, locations, montage beats or unrelated actions. For tightly controlled social
recreation, editorial units commonly last one to three seconds even when the selected model requires a
longer generated request; preserve the useful handle and trim only after reviewing the complete output.

Every shot should state:

- the first readable state, action onset, contact or change, completed result and briefly stable tail;
- character count, left/right and depth order, facing, gaze, movement and entry/exit edge;
- held objects, hand ownership and prop state before, during and after contact;
- camera side, axis, framing, lens character, movement curve and intended cut relationship;
- key-light direction, exposure, color and scene anchors that must remain continuous;
- exact dialogue, performed duration and native sound intent.

## Produce both required storyboard views

Every generated shot requires both a temporal storyboard and a shot board. The first fixes successive
states inside the shot; the second fixes coverage, blocking and relationships. Additional single-frame
or spatial previz material is optional when it exposes a separate risk:

| Board | Use it for |
| --- | --- |
| Single frame | a static composition, expression, decisive instant or literal first/last-frame anchor |
| Temporal storyboard | successive states inside one continuous shot: action phases, camera path or planned countdown states |
| Shot board | multiple narrative beats, speaker/listener coverage, blocking, several hands, prop contact or a relationship that needs readable staging |
| Spatial previz | complex routes, fights, crowd geometry, axis risk, spatial reveals or a continuous camera move that still images cannot verify |

A temporal storyboard describes one shot across time. A shot board explains coverage or staging. Do not
use extra cells merely for visual variety. Review every cell for reading order and internal continuity,
then review the board against adjacent shots.

Multi-cell temporal and shot boards default to six cells. The director may choose fewer or more when the
action, beat count or legibility requires it; record the chosen count and reason. A hard-to-reproduce
detail—countdown readings, device states, exact poses, hand contacts or prop changes—must expose every
required state in its own reviewed cell. Pass the selected board to the video model as a semantic image
reference so it controls state and order without appearing as a grid in the result.

When a multi-cell board is supplied as a semantic reference, explicitly say that cells communicate time
and action order only. The generated video must be one full-frame moving image with no grid, borders,
panel divisions, arrows, labels, numbers, paper texture, split screen or collage. Never use an entire
multi-cell board as a literal first- or last-frame image; extract and approve the required cell instead.

The installed `@hypit/gpt-image-kits/storyboard` Prompt Kit supports the single-frame, temporal and
shot-board treatments above. Use spatial previz only when still boards cannot establish the route or
camera relationship.

## Bind a per-shot reference manifest

Before compiling the model prompt, create one ordered reference manifest for the shot. Each entry names
the selected file/version and one primary responsibility:

| Role | Responsibility |
| --- | --- |
| `identity` | the matching character face, body, costume and appearance version |
| `scene` | the matching location view, geometry, fixed anchors, light and materials |
| `prop-state` | the exact prop identity and current persistent state |
| `temporal-storyboard` | successive action states, camera path and reading order |
| `shot-board` | coverage, blocking, staging and character relationships |
| `depth` | source-derived spatial structure, subject motion and camera motion only |
| `motion-previz` | reviewed route or choreography when the model and Provider can consume it |
| `first-frame` / `last-frame` | a literal pixel boundary, not a semantic sheet |
| `audio-reference` | source-language voice, delivery, emotion and acoustic perspective |

Do not mechanically attach the complete asset library to every request. Select optional asset views that
know the current shot and fit the model's real reference limits. Never silently discard the required
depth, temporal-storyboard, shot-board, audio-reference or video-prompt responsibility. If the selected
Endpoint cannot accept the full mandatory contract, choose another Endpoint before submission.

For reference-led recreation, make and inspect the depth video before the final shot. Keep it separate
from the character and setting boards. A grayscale depth reference supplies structure, motion and camera
behavior; it does not supply appearance or native depth conditioning. It is mandatory in the default
contract and cannot be replaced by prose.

## Establish cross-shot continuity

For each shot record a start and end state covering character positions and poses, screen direction,
gaze, held objects, prop state, entry/exit edge, axis, camera side and key-light direction. Differences
must be either an intended change with evidence or an unresolved conflict.

Use an accepted previous tail as the next first frame only when scene, camera setup, axis and physical
state genuinely continue. A new angle, location, axis or intentional state jump should begin from its own
approved storyboard or keyframe. If the previous generated version changes, re-extract and reapprove its
tail instead of retaining a stale frame.

## Compile for the selected model

The prompt is part of the reference contract, not another media asset. Translate each manifest role into
the selected model's syntax and preserve the actual submission order.

- H3 uses the bundled H3 guide. Full-reference work uses Ref2VA labels and its six English sections;
  dialogue, lyrics and visible story text keep their original language.
- Seedance reference syntax belongs to the selected Endpoint. StarRouter uses independently ordered
  `@图片N` and `@视频N` labels and currently rejects Seedance audio-reference inputs; other Endpoints and
  existing Kits may use `@imageN`, `@videoN` and `@audioN`. Do not put any Seedance dialect in H3 prompts
  or H3 sections in Seedance prompts. StarRouter Seedance therefore cannot satisfy this default mandatory
  contract; choose an Endpoint that accepts its audio reference.
- For an atomic Seedance recreation shot, `@hypit/seedance-kits/recreation-shot` compiles the ordered
  manifest, shot, continuity, dialogue, native sound and approved visible-text contracts. Its wording
  does not create references: connect the actual Resources in the same order. Seedance Surfaces default
  `generate-audio` to `true`, including for wordless action; set it to `false` only when the Brief
  explicitly requires silence or the selected Endpoint cannot generate audio. Record either waiver.
- Visible dialogue defaults to joint picture-and-audio generation. Bind exact lines, measured delivery,
  the mandatory audio reference, mouth action, ambience and physical sound in the same request. For a
  multilingual source, label every turn with its detected and confirmed language code; do not translate
  or normalize all turns to one file-level language.
- Put exact countdown readings and other difficult changing states into separate cells of the selected
  temporal storyboard. Approve the cells at original resolution, then connect that board as a
  semantic reference to the video request and describe the exact state order and timing in the prompt.
  Reject malformed output and revise the board or prompt before regenerating the shot.

Do not use original source picture or audio to patch a failed generated shot when the Brief requires a
complete remake. Do not paint over, inpaint, composite over, splice-repair or locally retouch generated
video. Regenerate the smallest failing unit after changing its prompt, board, reference selection,
continuity contract or model choice.

## Stop before paid generation when evidence is incomplete

Do not submit the final shot while any applicable item is missing:

- the asset inventory has unresolved identity, version, ownership or state;
- a selected optional character, scene or prop board is absent or unreviewed;
- the shot contains several independent causal chains instead of one atomic unit;
- either its temporal storyboard or shot board has not passed identity, space, time, physical, light,
  composition and narrative-order review;
- the depth result, audio reference or video prompt is missing;
- the reference manifest omits a required responsibility or exceeds Provider limits;
- cross-shot start/end states conflict or rely on a stale previous tail;
- prompt mode, model Surface and actual references disagree;
- joint audio dialogue does not fit the requested duration.

After generation, [Review](../../production/review.md) owns full audiovisual inspection and the decision
to accept or regenerate the shot.
