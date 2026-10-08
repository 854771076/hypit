# `@hypit/minimax-h3`

Exact author/compute contracts and package-owned author Surfaces for MiniMax H3 video generation.

Text, frame-guided and subject-reference modes use explicit Surfaces rather than one dynamic
port mode; `ReferenceVideo` additionally accepts a first-frame continuation anchor. Each produces an ordinary video Artifact. This package owns request semantics
and validation only; Provider calls, credentials, retries and queueing belong to a Runtime Endpoint
selected in the Runtime Profile.

```xml
<h3:TextVideo id="idea" prompt={prompt} duration="6" resolution="768P" aspect-ratio="9:16"/>
<h3:FrameVideo id="motion" prompt={motionPrompt} duration="6" resolution="2K"
  first-frame={cover.image} last-frame={ending.image}/>
<h3:ReferenceVideo id="montage" prompt={montagePrompt} duration="8" resolution="768P" aspect-ratio="9:16"
  first-frame={priorTail.image}>
  <h3:Reference image={person.image}/>
  <h3:Reference video={gesture.video}/>
</h3:ReferenceVideo>
```

The Surface makes every prompt/media dependency an explicit graph edge and leaves execution to a Provider.
`FrameVideo` accepts a first frame, a last frame, or both; either frame is an ordinary image Artifact edge.
`ReferenceVideo` may additionally carry `first-frame` beside its complete image/video/audio reference set,
which supports reviewed previous-tail continuation without dropping the Ref2VA inputs.

Write prompts with the Hypit Skill's bundled H3 prompt-writing guide. `TextVideo` and `FrameVideo` use the exact
T2VA/I2VA/FL2VA/L2VA structure: `integrated_multimodal_description`, `overall_soundscape`, then
`non_diegetic_music`, preceded by the required keyframe-alignment instruction when applicable.
`ReferenceVideo` uses the Ref2VA sections in this exact order: `subject_definitions`, `summary`,
`retention_analysis`, `detailed_description`, `overall_soundscape`, `non_diegetic_music`. Keep labels
stable across all sections and write the rewrite in English while preserving dialogue, lyrics and
visible scene text in their original language.

For multilingual source dialogue, label every exact line with its confirmed language code inside the
six-section prompt, for example `WOMAN [ja]: <d>待って</d>` and `MAN [en]: <d>No.</d>`. Do not infer the
spoken language from translated subtitles or apply one dominant language to the whole clip. Difficult
visual state changes use a reviewed multi-cell storyboard—six cells by default—as a semantic image
reference. Failed video is regenerated from an improved prompt or reference contract, never locally
painted, patched or composited.

For Ref2VA, import the packaged data-only Prompt Kit as
`@hypit/minimax-h3/reference-shot`. Its `reference-shot-v1` template requires the six Ref2VA sections,
plus `depth-video`, `temporal-storyboard`, `shot-board` and `audio-reference` contract slots; optional
`asset-boards` describes any selected character, scene or prop boards. It emits the extra reference
contracts inside `subject_definitions`, preserving the required six-section order. The actual Resources
still belong on `h3:ReferenceVideo`; the Kit only assembles their prompt contract.

A `@hypit/depth-video` output may be supplied through `Reference video={...}` to transfer spatial,
motion and camera cues. H3 still receives an ordinary reference video; prompt it as a grayscale depth
or structure reference and do not describe this path as native depth conditioning.
