# `@hypit/provider-starrouter`

Hypit Runtime Provider for StarRouter. It exposes the Distribution's GPT Image 2, MiniMax H3,
Seedance 2 and Seedance 2 Fast capabilities, polls video jobs, and stores generated files in the
current Build. Video reference media requires the embedding Host to provide `publicAssetUrl`;
GPT Image reference images are uploaded directly to the edit endpoint.

Seedance image and video references require matching `@图片1`, `@图片2`, … and `@视频1`, `@视频2`, …
labels in the prompt. Each video reference must declare `duration-seconds`; their total must be 2–15
seconds. Audio references remain unsupported because the current Seedance request does not carry the
duration metadata StarRouter requires to validate them.

```json
{
  "endpoints": {
    "starrouter.default": {
      "use": "@hypit/provider-starrouter",
      "pool": "starrouter.default",
      "config": {
        "apiKey": { "store": "platform", "key": "starrouter.api-key" }
      }
    }
  }
}
```

## Seedance face-reference review retry

StarRouter may reject a Seedance 2 character image with
`InputImageSensitiveContentDetected.PrivacyInformation` or `fail_to_fetch_task`. An Endpoint can opt
into the same BytePlus Ark asset-review path used by the verified StarRouter integration:

```json
{
  "bytePlusAccessKeyId": { "store": "platform", "key": "byteplus.access-key-id" },
  "bytePlusAccessKeySecret": { "store": "platform", "key": "byteplus.access-key-secret" },
  "seedanceAssetGroupId": "group-…",
  "seedanceAssetProjectName": "hypit"
}
```

All three required values—both credentials and `seedanceAssetGroupId`—must be configured together.
When one of the two known errors occurs, the Provider submits each HTTP(S) image reference to
BytePlus Ark, waits until it becomes active, replaces only those image URLs with `asset://…`, and
retries the paid StarRouter submission once. The retry is limited to Dreamina Seedance 2/2 Fast;
other errors and models fail normally. Omitting this optional configuration preserves the ordinary
StarRouter path and requires no BytePlus credentials.
