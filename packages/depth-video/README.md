# `@hypit/depth-video`

Convert one video into a grayscale depth video.

The depth Artifact is video-only: source audio is deliberately omitted so an original soundtrack or
dialogue cannot leak into a later reference-generation request.

```svml
<import as="depth" from="@hypit/depth-video@1"/>
<depth:Video id="depth-map" source={performance.video}/>
```

The capability is `@hypit/depth-video@1#depth-video`. Bind it to a RunningHub Endpoint to use
workflow `2098674379113979905`; the Provider uploads the source video and stores the returned MP4.

## Use the result as a video-generation reference

The output is an ordinary video Artifact, so the existing MiniMax H3 and Seedance reference Surfaces
can consume it without another Model or Provider capability. Keep the character image separate and
tell the generation model that the grayscale video carries only depth, motion and camera structure.

```xml
<import as="depth" from="@hypit/depth-video@1"/>
<import as="h3" from="@hypit/minimax-h3@1"/>
<import as="seedance" from="@hypit/seedance@1"/>
<import as="text" from="@hypit/text@1"/>

<depth:Video id="depth-map" source={original-shot.video}/>
<text:Value id="h3-shot-prompt">
  Keep the identity and appearance from the character image. Use the grayscale depth video only for
  spatial layout, subject motion and camera movement. Follow the authored shot direction.
</text:Value>
<text:Value id="seedance-shot-prompt">
  Use @图片1 for character identity and appearance. Use @视频1 only for depth, spatial layout,
  subject motion and camera movement. Follow the authored shot direction.
</text:Value>

<h3:ReferenceVideo id="h3-shot" prompt={h3-shot-prompt} duration="6" resolution="768P" aspect-ratio="9:16">
  <h3:Reference image={character.image}/>
  <h3:Reference video={depth-map.video}/>
</h3:ReferenceVideo>

<seedance:ReferenceVideo id="seedance-shot" model="standard" prompt={seedance-shot-prompt}
  duration="6" resolution="720p" aspect-ratio="9:16">
  <seedance:Reference image={character.image} person-reference="true"/>
  <seedance:Reference video={depth-map.video} person-reference="false" duration-seconds="6"/>
</seedance:ReferenceVideo>
```

For StarRouter Seedance, the prompt must label the inputs as `@图片1` and `@视频1`, and each video
reference must declare its measured `duration-seconds`; all reference videos together must be 2–15
seconds. This path is depth-reference generation, not native depth/ControlNet conditioning.
