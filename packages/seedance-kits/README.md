# `@hypit/seedance-kits`

Data-only authoring Kits for recurring Seedance semantics. They are `TextTemplate` source modules,
not model wrappers, Providers or new execution nodes.

Import a selected public Source from the installed package, for example
`@hypit/seedance-kits/speaker`. The package manager or active Distribution owns the installed
version; Source Closure reads that Source and its relative dependencies without copying it into the
video project or reaching through a physical `../../packages/...` path.

Each Kit is rendered by the domain-neutral `text:Render` Surface. Its Text output then feeds one of
the three low-level `@hypit/seedance` invocation modes. Reference media and duration remain
ordinary explicit graph edges:

```svml
<import as="text" from="@hypit/text@1"/>
<import as="seedance" from="@hypit/seedance@1"/>
<import as="broll-kit" source="@hypit/seedance-kits/broll"/>

<text:Render id="broll-prompt" template={broll-kit.broll-v1} recipe={recipes.broll}>
  <text:Set name="story" text={copy.broll}/>
</text:Render>

<seedance:ReferenceVideo id="broll" model="mini" prompt={broll-prompt}
  duration="5" resolution="720p" aspect-ratio="9:16">
  <seedance:Reference image={scene} person-reference="false"/>
  <seedance:Reference image={product} person-reference="false"/>
</seedance:ReferenceVideo>
```

Speaker uses the same graph vocabulary. The Kit assumes `@image1` is the visible person and
`@audio1` is the voice-timbre reference; it owns no media counting or generation wrapper:

```svml
<import as="speaker-kit" source="@hypit/seedance-kits/speaker"/>

<text:Render id="hook-prompt"
  template={speaker-kit.speaker-v1}
  recipe={recipes.speaker.host}>
  <text:Set name="dialogue" text={story.segment.hook.dialogue}/>
  <text:Set name="action" text={hook-action}/>
</text:Render>

<seedance:ReferenceVideo id="hook-take" model="mini"
  prompt={hook-prompt} duration="8"
  resolution="720p" aspect-ratio="9:16" generate-audio="true">
  <seedance:Reference image={presenter} person-reference="true"/>
  <seedance:Reference audio={voice}/>
</seedance:ReferenceVideo>
```

## Choose a template

Each import below has the prefix `@hypit/seedance-kits/`. The selected Source exports the listed
template id. Its linked `.svs` file owns the exact fixed wording, default choices and allowed values.

| Import suffix / template | Intended relationship and media references | Text slots |
| --- | --- | --- |
| `speaker` / [`speaker-v1`](kits/speaker-v1.svs) | One visible speaker: `@image1` is the character-and-scene view; `@audio1` is that speaker's voice. | Required `dialogue`; optional `action` |
| `broll` / [`broll-v1`](kits/broll-v1.svs) | A visual micro-story with native ambience and action sound by default; images appear in authored reference order, with their roles explained in the story. | Required `story`; `audio-mode` defaults to `joint-native`, while `silent` is an explicit waiver |
| `podcast` / [`podcast-v1`](kits/podcast-v1.svs) | Two fixed views: images 1/2 show A/B, and audio 1/2 supplies their corresponding voices. | Required `dialogue`; optional `action` |
| `call` / [`call-v1`](kits/call-v1.svs) | Image 1 shows A in the main tile and B in the inset; image 2 reverses them. Both are live views, with audio 1/2 for A/B. | Required `dialogue`; optional `action` |
| `street-interview` / [`street-interview-v1`](kits/street-interview-v1.svs) | Images 1/2/3 are interviewer A, guest B and shared street setups; audio 1/2 is A/B. A holds the microphone. | Required `dialogue`; optional `action` |
| `motion-reference` / [`motion-reference-v1`](kits/motion-reference-v1.svs) | Image 1 supplies the subject; video 1 supplies body motion, gestures and pose dynamics. | Optional `direction` |
| `camera-reference` / [`camera-reference-v1`](kits/camera-reference-v1.svs) | Image 1 supplies the subject; video 1 supplies camera framing, lens, movement and photographic rhythm. | Optional `direction` |
| `recreation-shot` / [`recreation-shot-v1`](kits/recreation-shot-v1.svs) | One atomic joint picture-and-sound shot. Its default contract requires a depth video, a temporal storyboard, a shot board, a video prompt and an audio reference; selected asset boards remain optional. | Required `depth-video`, `temporal-storyboard`, `shot-board`, `audio-reference`, `video-prompt`, `timing`, `continuity`, `sound`; optional `asset-boards`, `dialogue`, `visible-text`; `reference-dialect` defaults to `provider` |

For example, `source="@hypit/seedance-kits/call"` imported as `kit` exposes `kit.call-v1`.
Text slots use `text:Set`; scalar Recipe choices use the selected template's named axes. Reading the
template reveals what each choice actually asks the generator to do. Rendering the Text Output as a
Run Target lets an author inspect the assembled prompt without generating media.

The recreation template's required slots describe required Resource edges; connect the corresponding
video, two board images and audio Resource to the selected Surface in the same order. StarRouter's
Seedance route currently cannot attach the mandatory audio reference, so its dialect deliberately
blocks this default contract instead of silently dropping that input.

Speaker, B-roll, Podcast, Call and Street Interview expose prompt choices through their Text
Templates. The examples above use author-chosen literal durations. Measure adopted speech with
`hypit measure` first, then choose a duration within the selected model's declared range; there is
no duration-estimation node on the generation route.

## Recipe, dialogue and action

The Recipe carries recurring choices exposed by the selected template. `dialogue` receives the
Script Segment's `.dialogue` Text, retaining pronunciation and Role turns. Optional `action` supplies
this passage's attitude, vocal delivery, attention, interaction and any motivated cuts admitted by
the Kit. In Speaker, `performance` selects the recurring approach to voice and visible expression;
`gesture` selects body language, while `action` directs the particular thought and response.
Do not retype the complete spoken text into action or treat each Role turn as a required new Take.
For B-roll, `story` carries the visual events rather than spoken dialogue. Its default `joint-native`
audio mode requests synchronized ambience and action sound; select `silent` only for an explicit
silent-video requirement and set `generate-audio="false"` on that Surface.

These files are reusable packaged authoring material. When one production needs a different prompt
structure, author a project-local Text Template and import that Source explicitly rather than
modifying the installed package. A Kit is not a Core restriction or a hidden media-generation wrapper.
Reference order, duration, audio generation and output aspect ratio remain explicit on the model
Surface. Setting a prompt option cannot create a media reference or execute a postprocess.

For `recreation-shot`, fill the required depth-video, temporal-storyboard, shot-board, audio-reference
and video-prompt slots with the exact model labels and responsibilities used by the corresponding
`seedance:Reference` children. The default `provider` dialect follows the selected Endpoint. StarRouter
does not currently accept Seedance audio-reference inputs, so this Kit does not expose a StarRouter
dialect; select a compatible Endpoint instead of silently dropping the reference.

Include only references the shot needs; never name a missing edge. Seedance Surfaces default to
`generate-audio="true"`, including wordless action shots. Set it to `false` only when an explicit
silent-video requirement or documented Endpoint limitation is recorded as a waiver in `SHOTS.md`.
A multi-cell storyboard is
semantic evidence only—the generated result must remain one full-frame video.

Multi-cell storyboards use six cells by default; another count is valid when it expresses the shot more
accurately. Hard details such as countdown readings, device states, exact contacts and poses belong in
separate reviewed cells. Attach both selected boards as actual image References and state their roles in
`temporal-storyboard` and `shot-board`.

For multilingual dialogue, write every turn as `SPEAKER [language-code]: "exact original line"`. The
Kit instructs Seedance to preserve each turn's declared language without translation or switching to the
clip's dominant language. A rejected generated shot is regenerated after changing its prompt, board or
reference contract; never locally paint, patch or composite over the video.

`timing` names the semantic events, dialogue-word anchors and intended retained edit span that matter
inside this generated request. Seconds and frames are compiled evidence, not a replacement for those
anchors. When selected speech or an upstream shot changes, recompile downstream event frames before
submitting another paid generation.

## Speaker: edited UGC from one useful view

For ordinary direct-to-camera social video, explicitly select
`edit-rhythm: pause-trim-jump-cuts` as the starting rhythm. Read the Hypit Skill's Video direction page
for the directing judgment, and the [Speaker template](kits/speaker-v1.svs) for the exact wording of
its Recipe choices. Choose `performance` and `gesture` for the character's intended presence.

Reuse the same person-and-scene image and voice for ordinary Takes belonging to one UGC performance.
Each Take can begin from that shared reference and meet the others at a natural cut. There is no
required previous-tail-frame chain. Independent generation follows the intended edited form.

For example, a lively ranking host can use:

```svs
speaker.host {
  composition-stability: strict-locked;
  camera-motion: none;
  edit-rhythm: pause-trim-jump-cuts;
  performance: high-energy-ugc;
  gesture: expressive;
}
```

`edit-rhythm: pause-trim-jump-cuts` asks the model for an edited pause-trim rhythm at phrase boundaries.
It is compatible with a fixed camera and active performance. The template uses `continuous-take`
when `edit-rhythm` is omitted; select that value when the passage calls for a continuous
shot. Actual speed changes, trimming or audio extraction are explicit media operations; selecting
this Recipe does not perform them on the returned video.

## Podcast: two views and living listeners

`@image1` is Host A's view, `@image2` is Host B's view; `@audio1` and `@audio2` correspond to those hosts.
If Script uses names such as GIRL and GUY, state their correspondence to A/B in action. One Segment
can contain the entire short exchange. Choose speaker or reaction cuts for the conversation rather
than splitting it into a generation per line.

Derive a complementary host view from the first useful scene image. Product variations normally
derive from each host's own view plus the product reference. Action can state the meaningful handoff
and resulting possession. Silent listeners can adjust posture, glance down and look back up; they
must not speak the partner's lines. A split-screen opening has a different layout from this two-view
template and can use its own explicit prompt and combined reference image.

## Street interview: three supplied setups

The image order is interviewer A, guest B, shared two-person setup; the voice order is A, then B.
The interviewer always holds the microphone, moving it between speaking positions. The guest does
not take ownership merely because the microphone is extended toward them.

Action chooses cuts among the supplied setups. Guest answers can favor the guest close view, brief
neutral questions the shared view, and a meaningful interviewer reaction their close view. Small
opening and closing actions can establish an encounter: the guest looks up from another activity
as the interviewer approaches, and begins to leave after the final answer. These are examples of
motivated direction, not mandatory actions on every request.

## Keep gesture and scene direction readable

Use attitude and a few decisive actions. Prefer an explanatory hand movement or emphatic gesture
over exact numerical finger arrangements; speech or downstream graphics can state the number.
Avoid exaggerated reactions or constantly moving every person simply to prevent stillness.

For a multi-scene B-roll montage, `story` can name the references in scene order and give each a small
action. Choose an edit language compatible with cuts. “Continuous within each scene” and “one
continuous shot for the whole montage” ask for different results.

Every Seedance image/video Reference requires `person-reference="true|false"`: true if the supplied
material contains a person, false otherwise. Audio must omit it. The
[Seedance author package](../seedance/README.md#visual-reference-metadata) explains `person-reference`
and its frame variants. The Kit supplies direction; the actual reference edges supply media and
metadata. For movement-led work, a reference video can carry the motion while the text explains what
to preserve and change.
