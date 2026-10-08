import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { resolveCharacterProfile, validateCharacterIdentityBinding } from './reference-bindings.mjs'

const appeal = {
  age_class: 'adult',
  appeal_mode: 'adult-charisma',
  screen_presence: '清冷利落，目光坚定',
  grooming_and_makeup: '利落高马尾，干净锋利的眼妆',
  costume_signature: '墨黑短风衣与银色领针',
  memory_anchors: ['银色领针', '高马尾'],
  prohibited_treatment: [],
}

async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), 'character-identity-'))
  await mkdir(resolve(root, 'assets/characters'), { recursive: true })
  const profile = {
    name: '林晚',
    age_range: '28岁',
    gender: 'female',
    role_level: 'S',
    audience_appeal: appeal,
    performance_bible: {
      center_of_gravity: '稳定偏前', gait: '步幅短而果断',
      habitual_actions: ['确认威胁时短暂收紧下颌'], eyeline_behavior: '先看目标再抬头对视',
      blink_rhythm: '平静时偏慢，受压时短暂停眨', stress_response: '先维持平静面具，下颌收紧后缓慢恢复',
      forbidden_performance: ['无触发地频繁挑眉'],
    },
    expected_appearances: [{ id: 1, change_reason: '初次登场' }],
  }
  const bytes = Buffer.from(`${JSON.stringify({ characters: [profile] }, null, 2)}\n`)
  await writeFile(resolve(root, 'assets/characters/profiles.json'), bytes)
  const reference = {
    type: 'image', order: 1, asset_key: 'char-lin-wan', version_id: 'v001', role: 'identity',
    identity_binding: {
      profile_name: '林晚',
      profile_sha256: createHash('sha256').update(bytes).digest('hex'),
      appearance_id: 1,
    },
    identity_constraints: {
      age_class: 'adult',
      grooming_and_makeup: appeal.grooming_and_makeup,
      costume_signature: appeal.costume_signature,
      memory_anchors: appeal.memory_anchors,
    },
    performance_constraints: profile.performance_bible,
  }
  return { root, profile, reference }
}

test('角色参考必须精确绑定人物档案版本与 appearance', async () => {
  const { root, profile, reference } = await fixture()
  assert.equal((await resolveCharacterProfile(root, reference)).name, profile.name)
  assert.equal((await validateCharacterIdentityBinding(root, reference)).appearance_id, 1)
})

test('表演约束字段顺序不同但结构等价时仍可通过绑定', async () => {
  const { root, reference } = await fixture()
  const source = reference.performance_constraints
  const reordered = {
    forbidden_performance: source.forbidden_performance,
    stress_response: source.stress_response,
    blink_rhythm: source.blink_rhythm,
    eyeline_behavior: source.eyeline_behavior,
    habitual_actions: source.habitual_actions,
    gait: source.gait,
    center_of_gravity: source.center_of_gravity,
  }
  assert.equal((await validateCharacterIdentityBinding(root, { ...reference, performance_constraints: reordered })).appearance_id, 1)
})

test('角色参考不得猜测档案名、appearance 或记忆锚点', async () => {
  const { root, reference } = await fixture()
  await assert.rejects(() => validateCharacterIdentityBinding(root, { ...reference, identity_binding: { ...reference.identity_binding, profile_name: 'char-lin-wan' } }), /人物档案|profile_name/)
  await assert.rejects(() => validateCharacterIdentityBinding(root, { ...reference, identity_binding: { ...reference.identity_binding, appearance_id: 2 } }), /appearance/)
  await assert.rejects(() => validateCharacterIdentityBinding(root, { ...reference, identity_constraints: { ...reference.identity_constraints, memory_anchors: ['临时新增的伤疤'] } }), /记忆锚点/)
  await assert.rejects(() => validateCharacterIdentityBinding(root, { ...reference, performance_constraints: { ...reference.performance_constraints, eyeline_behavior: '始终直视镜头' } }), /表演约束/)
})

test('档案内容变化后旧 SHA 绑定失效', async () => {
  const { root, reference } = await fixture()
  await writeFile(resolve(root, 'assets/characters/profiles.json'), '{"characters":[]}\n')
  await assert.rejects(() => resolveCharacterProfile(root, reference), /SHA-256/)
})

test('分镜与视频提示词必须传播可见身份约束但不得编造锚点', async () => {
  const files = [
    'skills/short-drama/assets/modules/build-drama-storyboard/prompts/agent_storyboard_detail.zh.txt',
    'skills/short-drama/assets/modules/build-drama-storyboard/prompts/agent_storyboard_detail.en.txt',
    'skills/short-drama/assets/modules/write-drama-video-prompts/prompts/h3_video.zh.txt',
    'skills/short-drama/assets/modules/write-drama-video-prompts/prompts/h3_video.en.txt',
    'skills/short-drama/assets/modules/write-drama-video-prompts/prompts/seedance2_video.zh.txt',
    'skills/short-drama/assets/modules/write-drama-video-prompts/prompts/seedance2_video.en.txt',
  ]
  for (const file of files) {
    const text = await import('node:fs/promises').then(({ readFile }) => readFile(new URL(`../${file}`, import.meta.url), 'utf8'))
    for (const token of ['identity_binding', 'identity_constraints', 'performance_constraints', 'eyeline_behavior', 'stress_response', 'forbidden_performance', 'memory_anchors', 'costume_signature']) assert.ok(text.includes(token), `${file} 缺少 ${token}`)
  }
})
