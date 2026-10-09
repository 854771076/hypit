# `@hypit/provider-linghu-studio`

Hypit 的灵狐工作室 Runtime Provider。它通过灵狐工作室 Model API 提交图片和视频任务，轮询任务状态，并把生成文件登记到当前 Build。认证只使用用户创建的 API Key，不读取网页登录态。

## 创建 API Key

1. 打开[灵狐工作室](https://ai-short-studio.vvicat.dev/zh)，登录后进入[设置 → API Keys](https://ai-short-studio.vvicat.dev/zh/settings/api-keys)。
2. 新建 API Key。至少勾选 `models:read`，并按实际用途勾选 `models:image`、`models:video`；只生成视频时只需 `models:read` 和 `models:video`。
3. 立即复制以 `vvk_` 开头的密钥。完整密钥只显示一次，不要把它写入项目文件或聊天记录。
4. 在灵狐工作室创建或选择一个项目，记录该项目的 `projectId`。Model API 只允许访问当前 API Key 所属用户自己的项目。

可先用 API Key 查询当前账户可用的目录模型：

```bash
curl -H 'Authorization: Bearer vvk_...' \
  https://ai-short-studio.vvicat.dev/api/v1/models/video
```

响应中每个模型的 `modelKey` 是 Runtime Profile 的远端模型值。图片模型查询 `/api/v1/models/image`。目录会随账户配置变化，因此 Provider 不硬编码远端模型 key。

## Hypit 配置

先在 Hypit Dashboard 的凭据页把 API Key 保存为 `linghu-studio.api-key`，再把 Endpoint 加入项目 Runtime Profile：

```json
{
  "endpoints": {
    "linghu-studio.default": {
      "use": "@hypit/provider-linghu-studio",
      "pool": "linghu-studio.default",
      "config": {
        "apiKey": { "store": "platform", "key": "linghu-studio.api-key" },
        "projectId": "灵狐工作室项目 ID",
        "models": {
          "@hypit/seedance@1#seedance-2": "目录返回的 modelKey",
          "@hypit/minimax-h3@1#minimax-h3": "目录返回的 modelKey",
          "@hypit/gpt-image@1#gpt-image-2": "目录返回的 modelKey"
        }
      }
    }
  }
}
```

`models` 的键是 Hypit 能力，值是灵狐目录中的 `modelKey`。只需配置实际使用的能力；未映射的能力不会被该 Endpoint 接单。当前适配的 Hypit 能力包括 Seedance 2/2 Fast/2 Mini/2.5、MiniMax H3、Grok Imagine、PixVerse、GPT Image 2、Nano Banana 和 Seedream 5 Lite。灵狐通用 TTS API 与现有 Hypit 音色设计/克隆模型的语义不同，因此本次没有把两者错误映射成同一能力。

## 参考素材

灵狐 Model API 只接受可公开下载的 HTTP(S) 素材 URL。纯文本生成不需要额外配置；图片、首尾帧、参考视频或参考音频需要配置 S3、R2 或兼容对象存储：

```json
{
  "publicAssets": {
    "bucket": "hypit-media",
    "prefix": "linghu-studio",
    "region": "auto",
    "endpoint": "https://ACCOUNT_ID.r2.cloudflarestorage.com",
    "forcePathStyle": true,
    "publicBaseUrl": "https://media.example.com",
    "accessKeyId": { "store": "platform", "key": "media.access-key-id" },
    "secretAccessKey": { "store": "platform", "key": "media.secret-access-key" }
  }
}
```

`publicBaseUrl` 必须通过 HTTPS 暴露对应 bucket 和 prefix。建议给该前缀设置较短的生命周期；远端任务完成前不要删除输入素材。未配置 `publicAssets` 时，带参考素材的请求会在计划阶段显示为不支持，不会先产生付费请求再失败。

Provider 会把 Hypit operation id 作为 `Idempotency-Key`。提交响应在网络中丢失时不会自动重投，以免产生重复付费任务；已有 `taskId` 后的瞬时轮询或下载错误会在操作期限内继续重试同一个任务。
