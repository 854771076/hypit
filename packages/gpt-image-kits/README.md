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

Import `@hypit/gpt-image-kits/storyboard` and select `board-type: single-frame`, `temporal`, or
`shot-board`. Supply the atomic `shot` and `continuity` contracts; `references`, `style`, and
`visible-text` are optional. `visible-text` is an allowlist for story text that belongs in the scene,
not permission to add captions or labels.

Temporal and shot boards default to six cells. Choose another count only when the action or beat
structure reads more accurately that way. Put every hard-to-reproduce state—such as a countdown value,
device change, hand contact, prop state or exact pose—in its own cell. After review, pass the board as a
semantic image reference to the video model; the generated result must be one full-frame video and never
show the board grid.

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
