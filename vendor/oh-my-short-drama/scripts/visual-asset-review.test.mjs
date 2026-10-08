import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { importAssetFile, selectAssetVersion } from './asset-ledger.mjs'
import { putVisualAssetReview } from './review-ledger.mjs'

const artStyle = { id: 'style-3d-toon', name: '三渲二国漫', description: '三维建模与二维轮廓结合', prompt: '3D toon-shaded Chinese animation', visualBible: { version: 1, palette: {}, baseline: {}, lighting: {}, narrative_arc: [], motion_language: {}, negative_constraints: [] } }
const dimension = (observation) => ({ status: 'passed', observation })
const review = (assetKey) => ({
  review_type: 'visual-asset', assetKey, versionId: 'v001', inspected_full: true, approved: true,
  structure_identity: dimension('九视角中的建筑骨架、入口和固定锚点保持一致'),
  sheet_consistency: dimension('全部视图比例、材质和光向一致，没有跨格漂移'),
  unsupported_content: dimension('未见具名人物、剧情动作、字幕、水印或额外物件'),
  art_style_fidelity: { status: 'passed', art_style_id: artStyle.id, observation: '可见三维体块、克制的卡通着色器和统一描边，符合三渲二国漫画风' },
})

test('场景候选必须按当前用户画风审核后才能选版', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'visual-asset-review-'))
  await mkdir(resolve(root, '.short-drama'), { recursive: true })
  await writeFile(resolve(root, '.short-drama/assets.json'), '{"version":1,"assets":{}}\n')
  await writeFile(resolve(root, '.short-drama/shot-reviews.json'), '{"version":1,"reviews":{}}\n')
  await writeFile(resolve(root, '.short-drama/project.json'), `${JSON.stringify({ creative: { art_style: artStyle } })}\n`)
  await mkdir(resolve(root, 'episodes/ep-001/asset-plan'), { recursive: true })
  await writeFile(resolve(root, 'episodes/ep-001/asset-plan/v001.json'), '{"episode_key":"ep-001","scenes":[{"key":"scene-hall"}]}\n')
  await writeFile(resolve(root, 'episodes/ep-001/asset-plan/selected.json'), '{"versionId":"v001","path":"episodes/ep-001/asset-plan/v001.json"}\n')
  const source = resolve(root, 'candidate.png')
  await writeFile(source, Buffer.from('candidate-scene'))
  await importAssetFile(root, 'scene-hall', source, { origin: 'generated', created_by: 'provider', provider: 'starrouter', model_or_workflow: 'gpt-image-2', task_id: 'task-scene', prompt_document: { kind: 'asset-plan', episode_key: 'ep-001', version_id: 'v001', asset_key: 'scene-hall' }, source_assets: [], parameters: {} }, '大殿')
  await assert.rejects(() => selectAssetVersion(root, 'scene-hall', 'v001'), /当前画风/)
  const result = await putVisualAssetReview(root, review('scene-hall'))
  assert.equal(result.selected, true)
  assert.match(result.art_style_sha256, /^[0-9a-f]{64}$/)
})
