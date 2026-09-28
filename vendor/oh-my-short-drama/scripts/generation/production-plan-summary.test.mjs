import assert from 'node:assert/strict'
import test from 'node:test'

import { planSummary } from './mcp.mjs'

test('视频门禁只展示制作计划和素材数量，不计算具体价格', () => {
  const references = [
    { role: 'depth_reference', asset_key: 'depth-a', version_id: 'v001' },
    { role: 'temporal_storyboard', asset_key: 'board-story', version_id: 'v001' },
    { role: 'shot_board', asset_key: 'board-shot', version_id: 'v001' },
    { role: 'asset_board', asset_key: 'char-a', version_id: 'v001' },
    { role: 'audio_reference', asset_key: 'audio-a', version_id: 'v001' },
  ]
  const summary = planSummary({ episode_key: 'ep-001', version_id: 'v001', plans: [{
    ok: true, shot_number: 1, target: 'shot-ep001-001', provider: 'starrouter', missing_urls: [],
    production: { model: 'model-a', duration: 5, resolution: '720p', ratio: '9:16', size: null, generate_audio: true, watermark: false, references },
  }] })
  assert.deepEqual(summary.material_count, { depth_videos: 1, temporal_storyboards: 1, shot_boards: 1, asset_boards: 1, audio_references: 1 })
  assert.equal(JSON.stringify(summary).includes('price'), false)
  assert.equal(JSON.stringify(summary).includes('cost'), false)
});
