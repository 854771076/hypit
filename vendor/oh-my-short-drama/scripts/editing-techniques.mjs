const ANCHORS = new Set(['music-beat', 'action-impact', 'motion-apex', 'dialogue-boundary', 'sound-cue', 'ambience-shift', 'eyeline', 'composition'])
const AUDIO_BRIDGES = new Set(['none', 'constant-power', 'j-cut', 'l-cut'])
const FADED_ROLES = new Set(['ambient', 'bgm', 'native'])

const nonEmpty = (value) => typeof value === 'string' && value.trim()
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) throw new Error(`${label} 字段无效`)
}

function validateEditPoints(timeline) {
  const boundaries = timeline.segments.slice(0, -1)
  if (!boundaries.length) return
  if (!Array.isArray(timeline.edit_points) || timeline.edit_points.length !== boundaries.length) throw new Error('多镜时间线必须为每个镜头边界提供 edit_points 卡点依据')
  const frameMs = 1000 / timeline.fps
  timeline.edit_points.forEach((point, index) => {
    const outgoing = boundaries[index]
    const incoming = timeline.segments[index + 1]
    const cutMs = outgoing.timeline_end_ms
    exactKeys(point, ['cut_ms', 'anchor', 'transition_reason', 'audio_bridge'], `edit_points[${index}]`)
    exactKeys(point.anchor, ['type', 'time_ms', 'evidence'], `edit_points[${index}].anchor`)
    exactKeys(point.audio_bridge, ['type', 'duration_ms'], `edit_points[${index}].audio_bridge`)
    if (incoming.timeline_start_ms !== cutMs || point.cut_ms !== cutMs) throw new Error(`edit_points[${index}] 必须精确绑定相邻镜头切点`)
    if (!ANCHORS.has(point.anchor.type) || !Number.isInteger(point.anchor.time_ms) || !nonEmpty(point.anchor.evidence) || Math.abs(point.anchor.time_ms - cutMs) > frameMs * 2) throw new Error(`edit_points[${index}] 卡点依据必须位于切点两帧内`)
    if (!nonEmpty(point.transition_reason)) throw new Error(`edit_points[${index}].transition_reason 必填`)
    if (!AUDIO_BRIDGES.has(point.audio_bridge.type) || !Number.isInteger(point.audio_bridge.duration_ms) || point.audio_bridge.duration_ms < 0 || point.audio_bridge.duration_ms > 2000) throw new Error(`edit_points[${index}].audio_bridge 无效`)
    if (point.audio_bridge.type === 'none' ? point.audio_bridge.duration_ms !== 0 : point.audio_bridge.duration_ms < 20) throw new Error(`edit_points[${index}].audio_bridge 时长无效`)

    const transition = outgoing.transition
    if (transition.type === 'action-cut' && !['action-impact', 'motion-apex'].includes(point.anchor.type)) throw new Error(`edit_points[${index}] action-cut 必须绑定动作冲击或动作峰值`)
    if (transition.type === 'eyeline-cut' && point.anchor.type !== 'eyeline') throw new Error(`edit_points[${index}] eyeline-cut 必须绑定视线落点`)
    if (transition.type === 'composition-match' && point.anchor.type !== 'composition') throw new Error(`edit_points[${index}] composition-match 必须绑定构图匹配`)
    if (['j-cut', 'l-cut'].includes(transition.type) && point.audio_bridge.type !== transition.type) throw new Error(`edit_points[${index}] ${transition.type} 必须由同类型重叠音轨实现`)
    if (['fade', 'dissolve'].includes(transition.type)) {
      if (transition.duration_frames < 6 || transition.duration_frames > 12) throw new Error(`edit_points[${index}] fade/dissolve 必须为 6–12 帧`)
      if (point.audio_bridge.type !== 'constant-power') throw new Error(`edit_points[${index}] fade/dissolve 必须配套 constant-power 声音交叉淡化`)
    }
    validateAudioBridge(timeline, point, index)
  })
}

function validateAudioBridge(timeline, point, index) {
  const tracks = timeline.audio_tracks || []
  const duration = point.audio_bridge.duration_ms
  if (point.audio_bridge.type === 'none') return
  if (point.audio_bridge.type === 'j-cut') {
    if (!tracks.some((track) => track.role !== 'bgm' && track.timeline_start_ms <= point.cut_ms - duration && track.timeline_end_ms > point.cut_ms)) throw new Error(`edit_points[${index}] j-cut 缺少真实先行重叠音轨`)
    return
  }
  if (point.audio_bridge.type === 'l-cut') {
    if (!tracks.some((track) => track.role !== 'bgm' && track.timeline_start_ms < point.cut_ms && track.timeline_end_ms >= point.cut_ms + duration)) throw new Error(`edit_points[${index}] l-cut 缺少真实延续重叠音轨`)
    return
  }
  const half = duration / 2
  const tolerance = 1000 / timeline.fps
  const bridgeTracks = tracks.filter((track) => ['ambient', 'native'].includes(track.role))
  const valid = bridgeTracks.some((outgoing) => bridgeTracks.some((incoming) => outgoing !== incoming
    && Math.abs(incoming.timeline_start_ms - (point.cut_ms - half)) <= tolerance
    && Math.abs(outgoing.timeline_end_ms - (point.cut_ms + half)) <= tolerance
    && outgoing.timeline_end_ms - incoming.timeline_start_ms >= duration
    && outgoing.fades?.out_ms === duration
    && incoming.fades?.in_ms === duration))
  if (!valid) throw new Error(`edit_points[${index}] constant-power 必须绑定切点两侧真实重叠且等长淡化的环境/原生音轨`)
}

function validateTrackFades(track, index, timeline) {
  if (!FADED_ROLES.has(track.role)) return
  if (timeline.segments.length === 1 && !track.fades) return
  if (!track.fades) throw new Error(`audio_tracks[${index}] ${track.role} 必须配置合理的恒功率首尾淡化`)
  exactKeys(track.fades, ['in_ms', 'out_ms', 'curve'], `audio_tracks[${index}].fades`)
  const duration = track.timeline_end_ms - track.timeline_start_ms
  const frameMs = Math.ceil(1000 / timeline.fps)
  if (track.fades.curve !== 'constant-power' || !Number.isInteger(track.fades.in_ms) || !Number.isInteger(track.fades.out_ms) || track.fades.in_ms < frameMs || track.fades.out_ms < frameMs || track.fades.in_ms > duration || track.fades.out_ms > duration) throw new Error(`audio_tracks[${index}] ${track.role} 必须配置合理的恒功率首尾淡化`)
  if (track.role !== 'bgm') return
  const envelope = track.volume_envelope
  if (!Array.isArray(envelope) || envelope.length < 2 || envelope[0]?.time_ms !== track.timeline_start_ms || envelope.at(-1)?.time_ms !== track.timeline_end_ms || envelope.some((point, pointIndex) => !Number.isFinite(point.gain_db) || point.gain_db < -60 || point.gain_db > 12 || pointIndex > 0 && point.time_ms <= envelope[pointIndex - 1].time_ms)) throw new Error(`audio_tracks[${index}] BGM 必须提供覆盖首尾且严格递增的音量包络`)
}

function validateDucking(timeline) {
  const tracks = timeline.audio_tracks || []
  const bgm = tracks.filter((track) => track.role === 'bgm')
  const speech = tracks.filter((track) => ['dialogue', 'voiceover'].includes(track.role))
  if (!bgm.some((music) => speech.some((line) => music.timeline_start_ms < line.timeline_end_ms && music.timeline_end_ms > line.timeline_start_ms))) return
  const ducking = timeline.mix?.bgm_ducking
  if (!ducking || ducking.enabled !== true || !Number.isFinite(ducking.reduction_db) || ducking.reduction_db < -24 || ducking.reduction_db > -3 || !Number.isInteger(ducking.attack_ms) || ducking.attack_ms < 20 || ducking.attack_ms > 1000 || !Number.isInteger(ducking.release_ms) || ducking.release_ms < 50 || ducking.release_ms > 2000) throw new Error('BGM 与对白重叠时必须配置 mix.bgm_ducking')
}

export function validateEditCraft(timeline) {
  if (!timeline || !Number.isInteger(timeline.fps) || timeline.fps <= 0 || !Array.isArray(timeline.segments) || !Array.isArray(timeline.audio_tracks || [])) throw new Error('专业剪辑合同缺少 fps、segments 或 audio_tracks')
  if (timeline.segments.length > 1) {
    if (timeline.audio_tracks_complete !== true) throw new Error('多镜专业时间线必须声明 audio_tracks_complete=true，由独立音轨完整承载声音')
    const ranges = (timeline.audio_tracks || []).map((track) => [track.timeline_start_ms, track.timeline_end_ms]).sort((left, right) => left[0] - right[0])
    let coveredUntil = 0
    for (const [start, end] of ranges) {
      if (start > coveredUntil) break
      coveredUntil = Math.max(coveredUntil, end)
    }
    if (coveredUntil < timeline.segments.at(-1).timeline_end_ms) throw new Error('audio_tracks_complete=true 时独立音轨必须覆盖完整时间线')
  }
  validateEditPoints(timeline)
  ;(timeline.audio_tracks || []).forEach((track, index) => validateTrackFades(track, index, timeline))
  validateDucking(timeline)
  return timeline
}

function envelopeGain(points, timeMs) {
  if (!points?.length) return 0
  if (timeMs <= points[0].time_ms) return points[0].gain_db
  if (timeMs >= points.at(-1).time_ms) return points.at(-1).gain_db
  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index]
    const right = points[index + 1]
    if (timeMs >= left.time_ms && timeMs <= right.time_ms) return left.gain_db + (right.gain_db - left.gain_db) * ((timeMs - left.time_ms) / (right.time_ms - left.time_ms))
  }
  return 0
}

function constantPowerFadeDb(track, timeMs, frameMs) {
  if (!track.fades) return 0
  const elapsed = timeMs - track.timeline_start_ms
  const remaining = track.timeline_end_ms - timeMs
  const fadeIn = elapsed < track.fades.in_ms ? Math.sin(clamp(elapsed / track.fades.in_ms, 0, 1) * Math.PI / 2) : 1
  const fadeOut = remaining <= track.fades.out_ms ? Math.sin(clamp((remaining - frameMs) / Math.max(track.fades.out_ms - frameMs, 1), 0, 1) * Math.PI / 2) : 1
  return 20 * Math.log10(Math.max(fadeIn * fadeOut, 0.001))
}

function smoothstep(value) {
  const progress = clamp(value, 0, 1)
  return progress * progress * (3 - 2 * progress)
}

function duckingGainDb(timeMs, speech, ducking) {
  if (!ducking?.enabled) return 0
  let gain = 0
  for (const range of speech) {
    let amount = 0
    if (timeMs >= range.timeline_start_ms && timeMs <= range.timeline_end_ms) amount = ducking.reduction_db
    else if (timeMs >= range.timeline_start_ms - ducking.attack_ms && timeMs < range.timeline_start_ms) amount = ducking.reduction_db * smoothstep((timeMs - range.timeline_start_ms + ducking.attack_ms) / ducking.attack_ms)
    else if (timeMs > range.timeline_end_ms && timeMs <= range.timeline_end_ms + ducking.release_ms) amount = ducking.reduction_db * (1 - smoothstep((timeMs - range.timeline_end_ms) / ducking.release_ms))
    gain = Math.min(gain, amount)
  }
  return gain
}

export function compileAudioAutomation(timeline) {
  const speech = (timeline.audio_tracks || []).filter((track) => ['dialogue', 'voiceover'].includes(track.role))
  const step = 1000 / timeline.fps
  return (timeline.audio_tracks || []).map((track) => {
    if (!track.fades && track.role !== 'bgm') return structuredClone(track)
    const points = []
    for (let time = track.timeline_start_ms; time < track.timeline_end_ms; time += step) {
      const timeMs = Math.round(time)
      const ducking = track.role === 'bgm' ? duckingGainDb(timeMs, speech, timeline.mix?.bgm_ducking) : 0
      points.push({ time_ms: timeMs, gain_db: Number((envelopeGain(track.volume_envelope, timeMs) + constantPowerFadeDb(track, timeMs, step) + ducking).toFixed(3)) })
    }
    const timeMs = track.timeline_end_ms
    const ducking = track.role === 'bgm' ? duckingGainDb(timeMs, speech, timeline.mix?.bgm_ducking) : 0
    points.push({ time_ms: timeMs, gain_db: Number((envelopeGain(track.volume_envelope, timeMs) + constantPowerFadeDb(track, timeMs, step) + ducking).toFixed(3)) })
    return { ...structuredClone(track), volume_envelope: points }
  })
}
