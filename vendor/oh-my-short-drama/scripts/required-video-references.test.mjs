import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { validateRequiredVideoReferences, validateVideoReferenceBindings } from './reference-bindings.mjs'
import { validateWorkflowMotionPolicy } from './project-store.mjs'

const item = (type, role, key) => ({ type, role, order: 1, asset_key: key, version_id: 'v001' })
const complete = [
  item('image', 'character_identity', 'char-lead'),
  item('video', 'depth_reference', 'other-depth'),
  item('image', 'temporal_storyboard', 'board-temporal'),
  item('image', 'shot_board', 'board-shot'),
  item('audio', 'audio_reference', 'audio-reference'),
]

test('复刻必须使用深度，原创可选白模，且主运动参考互斥', () => {
  assert.equal(validateRequiredVideoReferences(complete, { referenceMode: 'depth' }), complete)
  assert.equal(validateRequiredVideoReferences(complete.filter((item) => item.role !== 'character_identity'), { referenceMode: 'depth' }).length, 4)
  for (const role of ['depth_reference', 'temporal_storyboard', 'shot_board', 'audio_reference']) {
    assert.throws(() => validateRequiredVideoReferences(complete.filter((item) => item.role !== role), { referenceMode: 'depth' }), new RegExp(role))
  }
  const previz = complete.map((entry) => entry.role === 'depth_reference' ? item('video', 'reference_video', 'other-previz') : entry)
  assert.equal(validateRequiredVideoReferences(previz, { referenceMode: 'previz' }), previz)
  assert.throws(() => validateRequiredVideoReferences([...previz, complete[1]], { referenceMode: 'previz' }), /不得混用 depth_reference/)
  const withoutMotion = complete.filter((entry) => entry.role !== 'depth_reference')
  assert.equal(validateRequiredVideoReferences(withoutMotion, { referenceMode: 'none' }), withoutMotion)
  assert.throws(() => validateRequiredVideoReferences(complete, { referenceMode: 'none' }), /不得携带 depth_reference/)
  assert.throws(() => validateRequiredVideoReferences([
    complete[0], complete[1], complete[2], { ...complete[3], asset_key: complete[2].asset_key }, complete[4],
  ], { referenceMode: 'depth' }), /两个独立参考版本/)
  assert.throws(() => validateRequiredVideoReferences([...complete, item('video', 'asset_board', 'bad-board')], { referenceMode: 'depth' }), /asset_board/)
})

test('通用素材绑定校验继续使用调用方选择的白模模式', async () => {
  const previz = complete.map((entry) => entry.role === 'depth_reference' ? item('video', 'reference_video', 'other-previz') : entry)
  await assert.rejects(
    validateVideoReferenceBindings(process.cwd(), 'runninghub', {
      model: 'minimax-h3-reference-to-video',
      reference_image_paths: ['/missing-character', '/missing-temporal', '/missing-shot'],
      reference_video_paths: ['/missing-previz'],
      reference_audio_paths: ['/missing-audio'],
    }, previz, { referenceMode: 'previz' }),
    (error) => error?.code === 'ENOENT'
  )
})

test('本地参考素材相对路径始终按项目根目录解析', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'short-drama-reference-'))
  context.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, '.short-drama'), { recursive: true })
  await mkdir(join(root, 'assets'), { recursive: true })
  await writeFile(join(root, 'assets/board.png'), 'preview')
  await writeFile(join(root, '.short-drama/assets.json'), JSON.stringify({
    assets: { board: { selectedVersionId: 'v001', staleVersionIds: [], versions: [{ id: 'v001', localPath: 'assets/board.png' }] } },
  }))

  await assert.doesNotReject(validateVideoReferenceBindings(root, 'runninghub', {
    model: 'minimax-h3-reference-to-video',
    reference_image_paths: ['assets/board.png'],
  }, [item('image', 'asset_board', 'board')], { requireComplete: false }))
})

test('复刻模式固定使用深度，标准模式允许不用主运动参考并禁止混用', () => {
  const depthPlan = { shots: [{ shot_number: 1, video_strategy: { depth_reference: {} }, previz_strategy: { mode: 'none' } }] }
  const previzPlan = { shots: [{ shot_number: 1, video_strategy: {}, previz_strategy: { mode: 'blender', purpose: 'motion-reference' } }] }
  assert.doesNotThrow(() => validateWorkflowMotionPolicy('viral-recreation', 'production-plan', depthPlan))
  assert.doesNotThrow(() => validateWorkflowMotionPolicy('standard', 'production-plan', depthPlan))
  assert.doesNotThrow(() => validateWorkflowMotionPolicy('standard', 'production-plan', previzPlan))
  assert.throws(() => validateWorkflowMotionPolicy('viral-recreation', 'production-plan', previzPlan), /必须使用原片深度/)
  assert.doesNotThrow(() => validateWorkflowMotionPolicy('standard', 'production-plan', { shots: [{ shot_number: 1, video_strategy: {}, previz_strategy: { mode: 'none' } }] }))
  assert.throws(() => validateWorkflowMotionPolicy('standard', 'production-plan', { shots: [{ ...depthPlan.shots[0], previz_strategy: { mode: 'blender', purpose: 'motion-reference' } }] }), /不得同时/)
})
