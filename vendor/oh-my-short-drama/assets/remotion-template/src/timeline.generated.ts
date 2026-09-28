// 占位时间线；render-edit.mjs 会在渲染或冻结前用当前分集的真实时间线覆盖此文件。
// 保留它只为确保模板无需额外准备即可编译。
export const timeline = {
  fps: 24,
  width: 1920,
  height: 1080,
  episode_key: 'ep-000',
  duration_ms: 1,
  subtitle_layout: { fontSize: 39, speakerFontSize: 22, marginH: 154, marginV: 86 },
  segments: [],
  audio_tracks: [],
  subtitles: [],
  labels: [],
  graphics: [],
}
