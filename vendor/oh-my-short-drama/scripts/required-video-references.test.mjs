import assert from 'node:assert/strict'
import test from 'node:test'

import { validateRequiredVideoReferences } from './reference-bindings.mjs'

const item = (type, role, key) => ({ type, role, order: 1, asset_key: key, version_id: 'v001' })
const complete = [
  item('video', 'depth_reference', 'other-depth'),
  item('image', 'temporal_storyboard', 'board-temporal'),
  item('image', 'shot_board', 'board-shot'),
  item('audio', 'audio_reference', 'audio-reference'),
]

test('付费视频提交必须包含深度、故事版、分镜板和音频参考', () => {
  assert.equal(validateRequiredVideoReferences(complete), complete)
  for (const role of ['depth_reference', 'temporal_storyboard', 'shot_board', 'audio_reference']) {
    assert.throws(() => validateRequiredVideoReferences(complete.filter((item) => item.role !== role)), new RegExp(role))
  }
  assert.throws(() => validateRequiredVideoReferences([
    complete[0], complete[1], { ...complete[2], asset_key: complete[1].asset_key }, complete[3],
  ]), /两个独立参考版本/)
  assert.throws(() => validateRequiredVideoReferences([...complete, item('video', 'asset_board', 'bad-board')]), /asset_board/)
})
