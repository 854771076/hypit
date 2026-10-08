import assert from 'node:assert/strict'
import test from 'node:test'

import { deriveMotionReferenceMode, validateShotGenerationContract } from './reference-bindings.mjs'

const planShot = {
  video_strategy: {
    mode: 'generate',
    visible_character_keys: ['char-dijun', 'char-hongyun', 'char-zhenyuanzi'],
    visible_event_keys: ['dijun-robe-shift', 'hongyun-weight-shift'],
  },
  previz_strategy: { mode: 'none' },
}

const storyboardPanel = {
  visible_event_keys: ['dijun-robe-shift', 'hongyun-weight-shift'],
  characters: [
    { name: '帝俊', appearance: 'char-dijun@v001' },
    { name: '红云', appearance: 'char-hongyun@v001' },
    { name: '镇元子', appearance: 'char-zhenyuanzi@v001' },
  ],
}

const manifest = ['char-dijun', 'char-hongyun', 'char-zhenyuanzi'].map((asset_key, index) => ({
  type: 'image', order: index + 1, asset_key, version_id: 'v001', role: 'character_identity',
}))

const audioPolicy = {
  ambience: [{ range: { start_ms: 0, end_ms: 9000 }, sound: '石殿持续底噪', evidence: { source: 'scene_asset', detail: '紫霄宫大殿石材空间与既有空气流动' } }],
  action_sounds: [
    { range: { start_ms: 1800, end_ms: 2400 }, sound: '帝俊衣袖轻响', evidence_event_key: 'dijun-robe-shift' },
    { range: { start_ms: 4200, end_ms: 4700 }, sound: '红云后撤时衣料与鞋底轻响', evidence_event_key: 'hongyun-weight-shift' },
  ],
}

test('standard 镜头未启用白模时主运动参考模式为 none', () => {
  assert.equal(deriveMotionReferenceMode(planShot), 'none')
  assert.equal(deriveMotionReferenceMode({ ...planShot, previz_strategy: { mode: 'blender', purpose: 'motion-reference' } }), 'previz')
  assert.equal(deriveMotionReferenceMode({ ...planShot, video_strategy: { ...planShot.video_strategy, depth_reference: {} } }), 'depth')
})

test('提交前要求计划、分镜和人物参考完整覆盖同一可见人物全集', () => {
  assert.doesNotThrow(() => validateShotGenerationContract({ planShot, storyboardPanel, manifest, audioPolicy }))
  assert.throws(() => validateShotGenerationContract({ planShot, storyboardPanel, manifest: manifest.slice(0, 1), audioPolicy }), /人物参考.*缺少.*char-hongyun.*char-zhenyuanzi/)
  assert.throws(() => validateShotGenerationContract({ planShot, storyboardPanel: { characters: storyboardPanel.characters.slice(0, 1) }, manifest, audioPolicy }), /分镜人物.*缺少.*char-hongyun.*char-zhenyuanzi/)
  assert.throws(() => validateShotGenerationContract({ planShot, storyboardPanel: { ...storyboardPanel, visible_event_keys: ['dijun-robe-shift'] }, manifest, audioPolicy }), /分镜可见事件.*缺少.*hongyun-weight-shift/)
})

test('动作声必须绑定计划中的可见事件，环境底必须有来源证据', () => {
  assert.throws(() => validateShotGenerationContract({
    planShot,
    storyboardPanel,
    manifest,
    audioPolicy: { ...audioPolicy, action_sounds: [{ range: { start_ms: 0, end_ms: 9000 }, sound: '脚步与紫气能量声' }] },
  }), /动作声.*evidence_event_key/)
  assert.throws(() => validateShotGenerationContract({
    planShot,
    storyboardPanel,
    manifest,
    audioPolicy: { ...audioPolicy, action_sounds: [{ range: { start_ms: 0, end_ms: 9000 }, sound: '紫气能量声', evidence_event_key: 'energy-flight' }] },
  }), /可见事件.*energy-flight/)
  assert.throws(() => validateShotGenerationContract({
    planShot,
    storyboardPanel,
    manifest,
    audioPolicy: { ...audioPolicy, ambience: [{ range: { start_ms: 0, end_ms: 9000 }, sound: '神秘环境声' }] },
  }), /环境底.*来源证据/)
})
