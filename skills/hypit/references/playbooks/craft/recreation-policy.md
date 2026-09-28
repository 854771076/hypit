# 参考复刻策略与 P0 门禁

参考复刻开始时，在项目中单独记录以下策略；不得把这些事实揉成一段生成提示词：

```yaml
source_languages:
  - ja
  - en
dialogue_policy: preserve_source_per_utterance
dialogue_segments:
  - id: line-001
    speaker: female_lead
    language: ja
    confidence: 0.97
    original: "待って"
  - id: line-002
    speaker: male_lead
    language: en
    confidence: 0.94
    original: "No."
subtitle_language: zh-CN

audio_policy:
  voice: generated
  emotion_reference: source
  ambience: generated
  music: generated

text_policy:
  generated_subtitles: forbidden
  allowed_text:
    - countdown
  final_subtitles: postproduction

shot_policy:
  segmentation: detected_cuts
  preserve_micro_edits: true
  max_generated_duration: 6
  difficult_detail_storyboard:
    default_panels: 6
    panel_count: director_selected
    use_as_video_reference: true
  generated_video_repair: regenerate_from_prompt
```

YAML 是项目笔记格式。`allowed_text` 只用于提示词和人工审片，不触发自动 OCR 或阻塞。

## 固定执行顺序

1. `hypit media shots source.mp4 --json` 在原生帧时钟上检测切点。3–10 帧片段成为独立
   `editEvents`，由时间线完成。`narrativeFunction: review_required` 必须由导演拉片后填写，
   不能把像素变化冒充叙事理解。
2. 先按说话人和连续话轮切出对白区间，再对每个区间分别执行
   `hypit transcribe <utterance.wav> --language auto --subtitle-language zh-CN --to <utterance.json>`。
   整片一次检测只能给出主语言，不能证明混合语言对白。逐话轮记录语言和置信度；低于 0.8
   或没有置信度时，用 `--confirm-language <code>` 人工确认并重新转写。原文、翻译和字幕分别
   保存，禁止从中文字幕倒推对白语言。
3. 只对明确声明的原始参考执行
   `hypit media prepare-depth-source source.mp4 --source-role original-reference --to assets/source.depth-input.mp4`。
   工具仅验证视频并逐字节复制为深度输入，不执行 OCR，不修改、重编码或局部处理画面。
4. 对倒计时、设备状态、手部接触、精确姿态等难细节先生成分镜板，默认六格，AI/导演可按
   动作和可读性选择其他格数。每个必需状态独占一格并通过原分辨率检查；把整板作为语义图片
   参考传给视频模型，并在提示词里写清状态顺序、时间和“输出单幅全屏视频，不显示分镜网格”。
5. 写视频提示词时逐句保留 `说话人 [语言代码]: "原文"`。模型必须按每句话自己的语言发音，
   不翻译、不音译、不统一成主语言，也不根据字幕语言改变对白。

提示词必须写明“对白只存在于音频，不显示字幕、翻译、标题、水印、Logo 或 UI”。生成结果由人工审片，
不再执行自动文字识别或门禁。

`clean-text` 已禁用。生成视频发现数字、人物、动作、字幕或局部画面错误时，必须拒收，完善
分镜板、参考合同和提示词后重生成最小失败镜头；禁止对生成视频涂抹、局部重绘、拼贴覆盖、
区域替换或混入原片像素。
