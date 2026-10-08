# `@hypit/provider-runninghub`

Hypit Runtime Provider for RunningHub's MiniMax H3 and video-to-depth workflows. It uploads request Resources to
RunningHub, submits the bundled workflow, polls the task, and stores the generated video in the
current Build.

```json
{
  "endpoints": {
    "runninghub.default": {
      "use": "@hypit/provider-runninghub",
      "pool": "runninghub.default",
      "config": {
        "apiKey": { "store": "platform", "key": "runninghub.api-key" }
      }
    }
  }
}
```

The MiniMax H3 workflow defaults to `2086743729407733762`; set `workflowId` only for a compatible
copy of that workflow. Video-to-depth uses fixed workflow `2098674379113979905`. The Provider exposes
`@hypit/minimax-h3@1#minimax-h3` and `@hypit/depth-video@1#depth-video`, limits concurrency to two
submissions by default, and limits each uploaded item to 200MB.
The depth workflow writes a video-only MP4 and does not copy the source video's audio track.

After a task id is checkpointed, transient query or output-download failures (`fetch failed`, timeout,
HTTP 429, or HTTP 5xx) keep that same operation pending and are retried without resubmission until the
configured operation deadline. If the
initial create response is lost before a task id is known, the Provider fails with
`RUNNINGHUB_SUBMISSION_OUTCOME_UNKNOWN`; it deliberately does not retry a potentially paid request.
