# `@hypit/gpt-image-kits`

These data-only Text Templates assemble recurring image prompts:

- `phone-ugc-v1` directs one natural phone-video frame.
- `asset-sheet-v1` creates a selected character, scene or prop setting board.
- `storyboard-v1` creates a single-frame, temporal or shot-board reference for one atomic shot.
- `story-text-frame-v1` creates one exact model-generated story-text state for standalone review or use as a reference.

`phone-ugc-v1`'s
[source](kits/phone-ugc-v1.svs) emits a fixed iPhone-video capture paragraph, followed by the supplied
Text slots in `person` → `shot` → `setting` order, with paragraph separators.
Import it as `@hypit/gpt-image-kits/phone-ugc-v1`.

For creative direction, see the Image direction page in the Hypit Skill.

## Production boards

Import `@hypit/gpt-image-kits/asset-sheet` and select `asset-type: character`, `scene`, or `prop`.
Supply the canonical asset contract through `asset`; `views`, `style`, `references`, and `visible-text`
are optional. `visible-text` is the exact allowlist for persistent packaging, clothing, prop, or scene
markings and does not permit sheet annotations. Every output describes one stable asset version rather
than alternatives.

Import `@hypit/gpt-image-kits/storyboard` and select the `board-type` that matches the planning job below.
Supply the atomic `shot` and `continuity` contracts; `references`, `style`, and
`visible-text` are optional. `visible-text` is an allowlist for story text that belongs in the scene,
not permission to add captions or labels.

Use the four types for different jobs:

- `single-frame` / `KEYFRAME`: lock one decisive look, layout, first frame, last frame, or continuity checkpoint.
- `temporal` / `TEMPORAL STORYBOARD`: explain physical motion inside one continuous shot, from onset through change to a stable tail.
- `narrative` / `NARRATIVE STORYBOARD`: explain audience-readable causality, discovery, reveal, or emotional reaction; it is not a camera coverage plan.
- `shot-board` / `SHOT BOARD`: specify technical coverage, framing, blocking, screen direction, and the views that must cut; it is not a substitute for motion or emotional beats.
- `blocking`: map routes and spatial relationships for entrances, exits, crossings, handoffs, and camera paths.
- `action` / `ACTION BREAKDOWN STORYBOARD`: stage fights, stunts, impacts, and chases as preparation → contact → reaction → recovery.
- `choreography`: teach dance, sports, martial-arts, or other complex body mechanics one pose/transition at a time.
- `comprehensive`: combine story, camera, blocking, action, sound, light, props, and continuity for a high-risk hero sequence.
- `director-track`: add a review header, style/continuity locks, tension curve, and aligned camera/action rhythm tracks.
- `previz-3d`: use neutral proxy figures and simple geometry to prove scale, contact, axis, and camera movement.
- `scene-overview`: lock an aerial/top-down world layout, zones, paths, entrances, exits, and landmarks before shot planning.
- `scene-plan`: create a top-down floor plan for rooms, boundaries, furniture, doors, windows, and camera marks.
- `scene-turnaround`: show one approved location from several consistent angles without changing its geometry.

Choose the smallest type that resolves the current uncertainty. A narrative or action board explains what the audience must understand; a shot board explains how to cover it. Do not use a comprehensive or director-track board by default when a keyframe or single-purpose board is sufficient.

For video, `previz-3d` is an additional spatial-risk reference; it never replaces the temporal storyboard
or the companion `shot-board`. The selector reports `companionBoardType: "shot-board"` for this case.

For programmatic selection, import `@hypit/gpt-image-kits/storyboard-strategy` and call
`selectStoryboardStrategy({ brief, forVideo, spatialRisk })`. The selector returns the recommended
`boardType`, an optional `companionBoardType` (`shot-board` for video), whether 3D previz is needed,
`requiredBoardTypes`, and the matched signals/reason for audit. `requiredBoardTypes` is the complete
production contract; for a complex video it can be `["previz-3d", "temporal", "shot-board"]`.
An explicit `boardType` always wins, so a director can lock
the result after review. If no signal matches, image work defaults to `single-frame`; video work defaults
to `temporal` plus a companion `shot-board`.

Multi-cell boards default to six cells. Choose another count only when the action or beat structure reads
more accurately that way. Put every hard-to-reproduce state—such as a countdown value, device change,
hand contact, prop state or exact pose—in its own cell. After review, pass the board as a semantic image
reference to the video model; the generated result must be one full-frame video and never show the board grid.

Both Kits only produce Text. Connect every referenced image explicitly on the image Surface in the
same order described by `references`, and inspect the original-resolution result before adopting it.

`@hypit/gpt-image-kits/story-text-frame` remains available for a standalone single story-text image.
For changing text inside generated video, prefer a temporal storyboard containing every required state
and give that board to the video model. This Kit is not for dialogue subtitles.

## Blocks and inputs

The capture block is fixed by this template version. Selecting a different capture language means
selecting or authoring another Text Template. The caller supplies the variable direction:

| Text slot | Required | Content |
| --- | --- | --- |
| `person` | No | Person or cast, appearance and styling; identity references and what they preserve. |
| `shot` | Yes | Camera view, framing, posture, gaze, action and interaction with people or props. |
| `setting` | No | Surrounding place, palette, structures and objects; scene references and what they preserve. |

For a complete new character-and-scene image, supply all three as ordinary paragraphs. A derived
view may inherit its person or setting from connected references and omit those slots. Omitted
blocks add no empty paragraphs. State the necessary reference responsibilities in the slot they
affect. Each slot accepts an ordinary Text Output and can describe more than one person or relationship.
The template produces Text; the image Surface consumes it. Actual reference Resources and model
parameters are connected on that Surface.

## Assemble the prompt

Given authored Text Outputs `portrait-person`, `portrait-shot` and `portrait-setting`, this fragment assembles the
prompt and passes it to `gpt:Image`:

```svml
<import as="text" from="@hypit/text@1"/>
<import as="gpt" from="@hypit/gpt-image@1"/>
<import as="ugc" source="@hypit/gpt-image-kits/phone-ugc-v1"/>

<text:Render id="portrait-prompt" template={ugc.phone-ugc-v1}>
  <text:Set name="person" text={portrait-person}/>
  <text:Set name="shot" text={portrait-shot}/>
  <text:Set name="setting" text={portrait-setting}/>
</text:Render>

<gpt:Image id="portrait" prompt={portrait-prompt} aspect-ratio="9:16" resolution="2K"/>
```

Connect reference images through `gpt:Reference` children on `gpt:Image` in the order described by
the prompt. For example, a `person` paragraph can inherit identity from reference 1 while `shot`
describes holding the product from reference 2. The Text does not create Resource bindings.
