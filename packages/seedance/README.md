# `@hypit/seedance`

Exact Seedance author model module. It owns the request schema and exactly three invocation Surfaces;
it does not contain service credentials, HTTP code, queues, runtime routing or usage-specific Prompt assembly.

The three model invocation shapes are deliberately separate:

- `TextVideo`: Prompt only; this is the only shape that exposes Web Search.
- `FrameVideo`: required first frame and optional last frame.
- `ReferenceVideo`: one or more image, video or audio references within the model's port limits.

All three preserve the remote result as one atomic `GeneratedVideoSet`, then expose its first ordered
member as an ordinary `BlobArtifact`. Their prompt ports consume ordinary `Text`, so a Script projection,
generic Text Template or third-party author module can feed them without becoming part of Seedance.

`standard`, `fast`, `mini` and `2.5` select model variants independently of the invocation shape. Duration is
the author's literal, in whole seconds inside the model's declared range; measure the spoken line first
with `hypit measure` and write the number here. Nothing in the graph computes it, so a Build plan is
complete before it starts.

All three Surfaces default `generate-audio` to `true`, so generated picture, dialogue, ambience and
action sound stay in one request. Set `generate-audio="false"` only for an explicit silent-video
requirement or when the selected Endpoint cannot generate audio.

## Reference audio

The Seedance package rejects reference audio declared as `audio/mp4` or `audio/x-m4a`. Convert the
audio to WAV or MP3 before using it; `media:ExtractAudio` produces WAV and can consume an upstream
component's media output. Renaming a file or changing its declared media type is not conversion.

Known imports are checked during Surface decoding. Future audio stays a graph input and is checked
when its Blob arrives. The same rule applies to drafts, complete requests, planning and direct
generation Producers. `sealSeedanceRequest` uses the endpoint's model-aware request builder;
`seedanceComponent` and `seedanceDefinition.component` expose the same implementation.

This checks the Blob's declared media type, not its bytes or codec. The selected Provider remains
responsible for any additional service-specific input limits.

## Visual reference metadata

Every supplied image or video must explicitly declare `person-reference`: `true` if it contains
a person, `false` otherwise. Classify the supplied material, not the requested result.

```xml
<seedance:ReferenceVideo id="take" model="mini" prompt={direction} duration="8"
  first-frame={prior-tail.image} first-frame-person-reference="true">
  <seedance:Reference image={presenter.image} person-reference="true"/>
  <seedance:Reference video={presenter.video} person-reference="true"/>
  <seedance:Reference image={room.image} person-reference="false"/>
</seedance:ReferenceVideo>
```

Missing or non-boolean declarations are rejected; there is no default or automatic face detection.
Audio must omit this field. `FrameVideo` and a first-frame-guided `ReferenceVideo` require
`first-frame-person-reference`; when a last frame is supplied, `FrameVideo` also requires
`last-frame-person-reference`. A last-frame classification requires a last frame.

| Supplied visual input | Authored attribute | Request port |
| --- | --- | --- |
| Each `Reference image={...}` | `person-reference` | `referenceImage` |
| Each `Reference video={...}` | `person-reference` | `referenceVideo` |
| `FrameVideo` or `ReferenceVideo` first frame | `first-frame-person-reference` | `firstFrame` |
| `FrameVideo` last frame | `last-frame-person-reference` | `lastFrame` |

These forms apply to `standard`, `fast`, `mini` and `2.5`. For example:

```xml
<seedance:FrameVideo id="turn" model="fast" prompt={direction} duration="5"
  first-frame={presenter.image} first-frame-person-reference="true"
  last-frame={empty-room.image} last-frame-person-reference="false"/>
```

`ReferenceVideo` may combine that explicit first frame with its full image/video/audio reference set;
the first frame remains the `firstFrame` request port instead of becoming another `referenceImage`.

Inspect the selected video excerpt, not only its opening frame. An empty room stays `false` when
the prompt asks to add a person. The flag does not lock identity; direction and references own that.

The SVML author declares this parameter on each reference input. Admitted files, generated
images/videos and reused Results use the same attributes. For a future output, declare the intended
reference classification explicitly; if its contents are uncertain, generate and inspect that
material before using it downstream.

Direct requests require the same boolean in `fields.personReference`. Providers interpret it through
their service's media handling; it is not a prompt sentence or a Core-level identity. A Provider maps
it according to its own upload and request API.

Video references can carry motion or camera behavior while image references carry the target
appearance. Request duration and reference-clip duration are different limits. Check the selected
Endpoint's reference duration and media limits when choosing an excerpt; the author's output duration
alone does not validate the input clip.

StarRouter requires the measured duration on each video reference and validates a 2–15 second total:

```xml
<seedance:ReferenceVideo id="depth-guided" model="standard" prompt={direction} duration="6">
  <seedance:Reference image={character.image} person-reference="true"/>
  <seedance:Reference video={depth.video} person-reference="false" duration-seconds="6"/>
</seedance:ReferenceVideo>
```

The prompt must contain the corresponding `@图片1` and `@视频1` labels. A depth video remains an
ordinary structural reference rather than a native depth/ControlNet input.

StarRouter audio references use the same explicit contract: add `duration-seconds` to every audio
Reference, keep their total at or below 15 seconds, and include the corresponding `@音频N` labels in
the prompt. Other Providers may ignore this metadata when their API does not require it.
