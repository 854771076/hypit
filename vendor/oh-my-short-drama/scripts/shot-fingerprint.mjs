import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { canonical } from './task-ledger.mjs'

export function comparableShot(kind, item) {
  if (!item) return null
  if (kind !== 'video-prompts') return canonical(item)
  const { production_plan_version, storyboard_version, ...content } = item
  return canonical(content)
}

export function shotItems(kind, document) { return kind === 'storyboard' ? document.panels : document.shots }

export function samePlanReferences(plan, prompt) {
  // 视频模型槽位有限：提示词可从计划候选池省略非人物素材，但不能引入计划外素材、改写语义角色或漏掉人物身份。
  const planned = (plan || []).map(({ key, version_id, role }) => ({ asset_key: key, version_id, role }))
  const prompted = (prompt || []).filter((item) => !(
    ['depth_reference', 'temporal_storyboard', 'shot_board', 'audio_reference', 'first_frame'].includes(item.role)
    || item.role === 'storyboard-frame' && item.asset_key?.startsWith('other-')
    || item.type === 'video' && item.role === 'reference_video' && /^other-previz-ep\d{3}-\d{3}$/.test(item.asset_key || '')
  )).map(({ asset_key, version_id, role }) => ({ asset_key, version_id, role }))
  const id = (item) => JSON.stringify(item)
  const plannedIds = new Set(planned.map(id))
  const promptedIds = prompted.map(id)
  const requiredIds = planned.filter((item) => item.role === 'character_identity').map(id)
  return promptedIds.length === new Set(promptedIds).size
    && promptedIds.every((item) => plannedIds.has(item))
    && requiredIds.every((item) => promptedIds.includes(item))
}

export function sameShotContract(plan, prompt) {
  return plan?.provider === prompt?.provider
    && plan.model_or_workflow === prompt.model_or_workflow
    && plan.prompt_profile === prompt.prompt_profile
    && plan.input_mode === prompt.input_mode
    && plan.duration_seconds === prompt.duration
    && samePlanReferences(plan.reference_assets, prompt.references)
}

export function changedShotNumbers(kind, previous, next) {
  const map = (document) => new Map((shotItems(kind, document) || []).map((item) => [item.shot_number, JSON.stringify(comparableShot(kind, item))]))
  const before = map(previous)
  const after = map(next)
  return [...new Set([...before.keys(), ...after.keys()])].filter((number) => before.get(number) !== after.get(number)).sort((a, b) => a - b)
}

export async function sameShotVersion(root, episodeKey, kind, referencedVersion, selectedVersion, shotNumber) {
  if (referencedVersion === selectedVersion) return true
  const directory = resolve(root, 'episodes', episodeKey, kind)
  const [referenced, selected] = await Promise.all([
    readFile(resolve(directory, `${referencedVersion}.json`), 'utf8').then(JSON.parse),
    readFile(resolve(directory, `${selectedVersion}.json`), 'utf8').then(JSON.parse),
  ])
  const find = (document) => (shotItems(kind, document) || []).find((item) => item.shot_number === shotNumber)
  return JSON.stringify(comparableShot(kind, find(referenced))) === JSON.stringify(comparableShot(kind, find(selected)))
}

if (process.argv[2] === '--self-check') {
  const before = { shots: [{ shot_number: 1, prompt: '不变', storyboard_version: 'v001', production_plan_version: 'v001' }, { shot_number: 2, prompt: '旧' }] }
  const after = { shots: [{ shot_number: 1, prompt: '不变', storyboard_version: 'v002', production_plan_version: 'v002' }, { shot_number: 2, prompt: '新' }] }
  if (JSON.stringify(changedShotNumbers('video-prompts', before, after)) !== '[2]') throw new Error('镜头指纹自检失败')
  console.log('ok')
}
