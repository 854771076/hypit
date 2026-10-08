import assert from 'node:assert/strict'
import test from 'node:test'

import { validApprovedVideoReview, validTimedCriteria, validWatchEvidence } from './review-ledger.mjs'

const evidence = {
  method: 'human-playback', duration_seconds: 10,
  start: { time_seconds: 0, observation: '0秒人物在左柱旁建立观察方向' },
  middle: { time_seconds: 5, observation: '5秒两张空席与后排人物同时可辨' },
  end: { time_seconds: 10, observation: '10秒回到全景且所有人物位置稳定' },
}

test('播放证据必须包含来源、合理时间点和不同观察', () => {
  assert.equal(validWatchEvidence(evidence, 10), true)
  assert.equal(validWatchEvidence({ ...evidence, method: undefined }, 10), false)
  assert.equal(validWatchEvidence({ ...evidence, middle: evidence.start }, 10), false)
})

test('通过项观察必须绑定具体秒数或帧号', () => {
  assert.equal(validTimedCriteria([{ observation: '第60帧人物转头成立' }, { observation: '5秒空席仍可见' }]), true)
  assert.equal(validTimedCriteria([{ observation: '人物动作合理' }]), false)
})

test('已批准视频仍须绑定媒体哈希和真实播放证据', () => {
  const record = {
    approved: true,
    asset_sha256: 'abc',
    watchedFull: true,
    watch_evidence: evidence,
    criteria: [{ criterion: 'visual', status: 'passed', observation: '第 60 帧主体动作连续' }],
  }
  assert.equal(validApprovedVideoReview(record, 'abc', 10, ['visual']), true)
  assert.equal(validApprovedVideoReview({ ...record, asset_sha256: 'def' }, 'abc', 10, ['visual']), false)
})
