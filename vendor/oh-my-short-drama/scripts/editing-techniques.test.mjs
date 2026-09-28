import test from 'node:test'
import assert from 'node:assert/strict'
import { compileAudioAutomation, validateEditCraft } from './editing-techniques.mjs'

const segments = [
  { shot_key: 'shot-ep001-001', timeline_start_ms: 0, timeline_end_ms: 1000, transition: { type: 'action-cut', duration_frames: 0 } },
  { shot_key: 'shot-ep001-002', timeline_start_ms: 1000, timeline_end_ms: 2000, transition: { type: 'hard-cut', duration_frames: 0 } },
  { shot_key: 'shot-ep001-003', timeline_start_ms: 2000, timeline_end_ms: 3000, transition: { type: 'none', duration_frames: 0 } },
]

const editPoints = [
  { cut_ms: 1000, anchor: { type: 'action-impact', time_ms: 1020, evidence: '拳头接触桌面的可见瞬间与撞击声瞬态' }, transition_reason: '动作冲击把下一镜反应带入', audio_bridge: { type: 'none', duration_ms: 0 } },
  { cut_ms: 2000, anchor: { type: 'ambience-shift', time_ms: 2000, evidence: '室内低频在转入室外风声时改变' }, transition_reason: '气氛突变使用硬切', audio_bridge: { type: 'none', duration_ms: 0 } },
]
const fullSound = { role: 'sfx', timeline_start_ms: 0, timeline_end_ms: 3000, volume_envelope: [] }

test('每个镜头边界必须绑定两帧内的专业卡点依据', () => {
  const base = { fps: 24, segments, edit_points: editPoints, audio_tracks: [fullSound], audio_tracks_complete: true, mix: null }
  assert.doesNotThrow(() => validateEditCraft(base))
  assert.throws(() => validateEditCraft({ ...base, edit_points: editPoints.slice(0, 1) }), /每个镜头边界/)
  assert.throws(() => validateEditCraft({ ...base, edit_points: [{ ...editPoints[0], anchor: { ...editPoints[0].anchor, time_ms: 1100 } }, editPoints[1]] }), /两帧/)
  assert.throws(() => validateEditCraft({ ...base, edit_points: [{ ...editPoints[0], anchor: { ...editPoints[0].anchor, type: 'music-beat' } }, editPoints[1]] }), /action-cut/)
})

test('BGM 必须有恒功率首尾淡化，并在对白重叠时启用 ducking', () => {
  const bgm = { role: 'bgm', timeline_start_ms: 0, timeline_end_ms: 3000, volume_envelope: [{ time_ms: 0, gain_db: -6 }, { time_ms: 3000, gain_db: -6 }], fades: { in_ms: 250, out_ms: 400, curve: 'constant-power' } }
  const dialogue = { role: 'dialogue', timeline_start_ms: 1000, timeline_end_ms: 2000, volume_envelope: [] }
  const mix = { target_lufs: -15, true_peak_dbtp: -1, bgm_ducking: { enabled: true, reduction_db: -12, attack_ms: 200, release_ms: 400 } }
  const base = { fps: 24, segments, edit_points: editPoints, audio_tracks: [bgm, dialogue], audio_tracks_complete: true, mix }
  assert.doesNotThrow(() => validateEditCraft(base))
  assert.throws(() => validateEditCraft({ ...base, audio_tracks: [{ ...bgm, fades: undefined }, dialogue] }), /恒功率首尾淡化/)
  assert.throws(() => validateEditCraft({ ...base, mix: { target_lufs: -15, true_peak_dbtp: -1 } }), /bgm_ducking/)
})

test('constant-power 声音桥必须由切点两侧真实重叠音轨实现', () => {
  const bridgeSegments = segments.map((segment, index) => index === 0 ? { ...segment, transition: { type: 'dissolve', duration_frames: 8 } } : segment)
  const bridgePoints = [{ ...editPoints[0], anchor: { type: 'ambience-shift', time_ms: 1000, evidence: '室内气氛转到室外风声' }, audio_bridge: { type: 'constant-power', duration_ms: 400 } }, editPoints[1]]
  const outgoing = { role: 'ambient', timeline_start_ms: 0, timeline_end_ms: 1200, volume_envelope: [], fades: { in_ms: 100, out_ms: 400, curve: 'constant-power' } }
  const incoming = { role: 'ambient', timeline_start_ms: 800, timeline_end_ms: 3000, volume_envelope: [], fades: { in_ms: 400, out_ms: 100, curve: 'constant-power' } }
  const base = { fps: 24, segments: bridgeSegments, edit_points: bridgePoints, audio_tracks: [outgoing, incoming], audio_tracks_complete: true, mix: null }
  assert.doesNotThrow(() => validateEditCraft(base))
  assert.throws(() => validateEditCraft({ ...base, audio_tracks: [outgoing, { ...incoming, timeline_start_ms: 1000 }] }), /真实重叠/)
})

test('旧单镜时间线仍可保留未迁移的原生音轨', () => {
  assert.doesNotThrow(() => validateEditCraft({ fps: 24, segments: [segments[0]], audio_tracks: [{ role: 'native', timeline_start_ms: 0, timeline_end_ms: 1000 }], mix: null }))
})

test('渲染前把 BGM 淡化和对白 ducking 编译为逐帧确定音量包络', () => {
  const timeline = {
    fps: 10,
    audio_tracks: [
      { role: 'bgm', timeline_start_ms: 0, timeline_end_ms: 3000, volume_envelope: [{ time_ms: 0, gain_db: -6 }, { time_ms: 3000, gain_db: -6 }], fades: { in_ms: 500, out_ms: 500, curve: 'constant-power' } },
      { role: 'dialogue', timeline_start_ms: 1000, timeline_end_ms: 2000, volume_envelope: [] },
    ],
    mix: { bgm_ducking: { enabled: true, reduction_db: -12, attack_ms: 200, release_ms: 400 } },
  }
  const [bgm] = compileAudioAutomation(timeline)
  const gain = (time) => bgm.volume_envelope.find((point) => point.time_ms === time).gain_db
  assert.ok(gain(0) <= -65)
  assert.equal(gain(500), -6)
  assert.equal(gain(1000), -18)
  assert.equal(gain(2000), -18)
  assert.equal(gain(2400), -6)
  assert.ok(gain(2900) <= -65)
})
