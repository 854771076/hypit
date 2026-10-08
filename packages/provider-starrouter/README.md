# `@hypit/provider-starrouter`

Hypit Runtime Provider for StarRouter. It exposes the Distribution's GPT Image 2, MiniMax H3,
Seedance 2 and Seedance 2 Fast capabilities, polls video jobs, and stores generated files in the
current Build. GPT Image reference images are uploaded directly to the edit endpoint. Video reference
media can use an embedding Host's `publicAssetUrl` callback or the Runtime Profile's `publicAssets`
object store; no CLI or vendor script participates in submission.

Seedance image and video references require matching `@图片1`, `@图片2`, … and `@视频1`, `@视频2`, …
labels in the prompt. Each video reference must declare `duration-seconds`; their total must be 2–15
seconds. Each audio reference must also declare `duration-seconds`; their total must not exceed 15
seconds. Prompts must label audio references as `@音频1`, `@音频2`, … in order.

```json
{
  "endpoints": {
    "starrouter.default": {
      "use": "@hypit/provider-starrouter",
      "pool": "starrouter.default",
      "config": {
        "apiKey": { "store": "platform", "key": "starrouter.api-key" },
        "publicAssets": {
          "bucket": "hypit-media",
          "prefix": "starrouter",
          "region": "auto",
          "endpoint": "https://ACCOUNT_ID.r2.cloudflarestorage.com",
          "forcePathStyle": true,
          "publicBaseUrl": "https://media.example.com/starrouter",
          "accessKeyId": { "store": "platform", "key": "media.access-key-id" },
          "secretAccessKey": { "store": "platform", "key": "media.secret-access-key" }
        }
      }
    }
  }
}
```

`publicBaseUrl` must expose the configured bucket and prefix over HTTPS. The Provider reads each
Build-local Resource, uploads it under its opaque Resource id, and passes only that URL to StarRouter.
S3, R2 and compatible stores are supported; temporary anonymous file hosts are intentionally not a
default transport. Configure a short retention lifecycle on this prefix; the Provider does not delete
an input while a remote generation task may still be reading it.

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
