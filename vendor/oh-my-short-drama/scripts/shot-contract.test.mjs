import assert from 'node:assert/strict'
import test from 'node:test'

import { sameShotContract } from './shot-fingerprint.mjs'

const plan = {
  provider: 'runninghub', model_or_workflow: 'minimax-h3-reference-to-video', prompt_profile: 'h3', input_mode: 'Ref2VA', duration_seconds: 5,
  reference_assets: [{ key: 'scene-hall', version_id: 'v001', role: 'location_identity' }],
}
const prompt = {
  provider: 'runninghub', model_or_workflow: 'minimax-h3-reference-to-video', prompt_profile: 'h3', input_mode: 'Ref2VA', duration: 5,
  references: [
    { type: 'image', order: 7, asset_key: 'scene-hall', version_id: 'v001', role: 'location_identity' },
    { type: 'image', order: 8, asset_key: 'board-temporal', version_id: 'v001', role: 'temporal_storyboard' },
  ],
}

test('执行期顺序和派生参考不制造假不一致', () => {
  assert.equal(sameShotContract(plan, prompt), true)
})

test('素材语义角色被构造器改写时在提交前拒绝', () => {
  assert.equal(sameShotContract(plan, {
    ...prompt,
    references: prompt.references.map((item) => item.asset_key === 'scene-hall' ? { ...item, role: 'asset_board' } : item),
  }), false)
})

test('槽位不足时允许省略计划中的非人物候选素材', () => {
  assert.equal(sameShotContract({
    ...plan,
    reference_assets: [
      { key: 'char-lead', version_id: 'v001', role: 'character_identity' },
      ...plan.reference_assets,
      { key: 'prop-cup', version_id: 'v001', role: 'prop_identity' },
    ],
  }, {
    ...prompt,
    references: [
      { type: 'image', order: 1, asset_key: 'char-lead', version_id: 'v001', role: 'character_identity' },
      ...prompt.references,
    ],
  }), true)
})

test('人物身份参考不得因槽位不足被省略', () => {
  assert.equal(sameShotContract({
    ...plan,
    reference_assets: [{ key: 'char-lead', version_id: 'v001', role: 'character_identity' }, ...plan.reference_assets],
  }, prompt), false)
})
