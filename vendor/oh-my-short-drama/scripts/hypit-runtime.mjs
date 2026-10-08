#!/usr/bin/env node
import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'

import { validateProject, validateVideoPrompts, validateWorkflowMotionPolicy } from './project-store.mjs'
import { validateCharacterIdentityBinding, validateDepthReferenceBinding, validatePreviousTailBinding, validateRequiredVideoReferences } from './reference-bindings.mjs'
import { validateMotionReferenceBinding } from './previz-contract.mjs'
import { sameShotContract, sameShotVersion } from './shot-fingerprint.mjs'
import { inspectStage, missingDepthReviews, missingPrevizAssets, missingPrevizReviews, missingStoryboardAssets, missingStoryboardReviews } from './workflow-gates.mjs'
import { stages } from './workflow-stages.mjs'
import { importAssetFile } from './asset-ledger.mjs'
import { fileSha256 } from './safe-files.mjs'
import { validApprovedVideoReview } from './review-ledger.mjs'

const xml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const posix = (value) => value.split(sep).join('/')
const localRef = (from, to) => {
  const path = posix(relative(from, to))
  return path.startsWith('.') ? path : `./${path}`
}

export function reusableBuildTargetOutputs(machine) {
  if (machine?.format !== 'hypit.cli-inspect@1' || !['complete', 'failed', 'cancelled'].includes(machine.build?.outcome)) return []
  return (machine.build.outputs || []).filter((item) => item.target === true && item.kind === 'resource').map((item) => item.name)
}

async function projectFile(root, value, label) {
  const path = await realpath(resolve(root, value))
  if (path !== root && !path.startsWith(`${root}${sep}`)) throw new Error(`${label} 路径逃逸项目目录`)
  return path
}

function args(values) {
  const result = { command: values[0] }
  for (let index = 1; index < values.length; index += 1) {
    const key = values[index]
    if (key === '--confirmed') { result.confirmed = true; continue }
    if (!key?.startsWith('--') || !values[index + 1] || values[index + 1].startsWith('--')) throw new Error(`参数无效：${key || ''}`)
    result[key.slice(2).replaceAll('-', '_')] = values[++index]
  }
  return result
}

async function selectedDocument(root, episode) {
  const selection = JSON.parse(await readFile(resolve(root, 'episodes', episode, 'video-prompts/selected.json'), 'utf8'))
  if (!/^v\d{3}$/.test(selection.versionId || '') || typeof selection.path !== 'string') throw new Error('视频提示词 selected.json 无效')
  const path = await projectFile(root, selection.path, '视频提示词')
  if (path !== resolve(root, 'episodes', episode, 'video-prompts', `${selection.versionId}.json`)) throw new Error('视频提示词 selected.json 路径与版本不一致')
  const document = JSON.parse(await readFile(path, 'utf8'))
  validateVideoPrompts(document, episode)
  if (!document.approved || document.unresolved.length) throw new Error('视频提示词必须 approved 且无未决项')
  return { selection, document }
}

async function versionedDocument(root, episode, versionId) {
  if (!/^v\d{3}$/.test(versionId || '')) throw new Error('视频提示词版本无效')
  const path = await projectFile(root, `episodes/${episode}/video-prompts/${versionId}.json`, '视频提示词')
  const document = JSON.parse(await readFile(path, 'utf8'))
  validateVideoPrompts(document, episode)
  return document
}

export async function validatePendingBuild(rootValue, episode, pending, runtimeArg) {
  const root = await realpath(resolve(rootValue))
  if (pending?.schema_version !== 2 || !['submitting', 'accepted'].includes(pending.phase) || pending.episode_key !== episode || !/^v\d{3}$/.test(pending.version_id || '') || typeof pending.submission_title !== 'string' || !pending.submission_title.trim() || !Number.isFinite(Date.parse(pending.created_at))) throw new Error('待回收 Build 记录无效，拒绝再次付费提交')
  if (pending.phase === 'accepted' && (typeof pending.build_id !== 'string' || !pending.build_id.trim())) throw new Error('待回收 Build 记录缺少 Build ID，拒绝再次付费提交')
  if (pending.phase === 'submitting' && pending.build_id !== null) throw new Error('提交中 Build 记录不得预填 Build ID')
  const expectedPrompt = `episodes/${episode}/video-prompts/${pending.version_id}.json`
  const expectedRun = `.short-drama/hypit/${episode}/${pending.version_id}.svrun`
  for (const [label, record, expected] of [['提示词', pending.prompt_document, expectedPrompt], ['Run', pending.run_source, expectedRun]]) {
    if (record?.path !== expected || !/^[0-9a-f]{64}$/.test(record.sha256 || '')) throw new Error(`待回收 Build ${label}绑定无效，拒绝再次付费提交`)
    const path = await projectFile(root, record.path, `待回收 Build ${label}`)
    if (await fileSha256(path) !== record.sha256) throw new Error(`待回收 Build ${label}已变化；请恢复提交时文件后继续回收，拒绝再次付费提交`)
  }
  if (typeof pending.runtime_profile?.path !== 'string' || !pending.runtime_profile.path || !/^[0-9a-f]{64}$/.test(pending.runtime_profile.sha256 || '')) throw new Error('待回收 Build Runtime 绑定无效，拒绝再次付费提交')
  const recordedRuntime = await realpath(resolve(root, pending.runtime_profile.path))
  if (runtimeArg && await realpath(resolve(runtimeArg)) !== recordedRuntime) throw new Error('待回收 Build 必须使用提交时的 Runtime Profile')
  if (await fileSha256(recordedRuntime) !== pending.runtime_profile.sha256) throw new Error('待回收 Build Runtime Profile 已变化；请恢复提交时文件后继续回收')
  await versionedDocument(root, episode, pending.version_id)
  return pending
}

export function submittedBuildId(machine, title) {
  if (machine?.format !== 'hypit.cli-builds@1' || !Array.isArray(machine.builds)) throw new Error('Hypit Build 目录合同无效')
  const matches = machine.builds.filter((item) => item?.title === title)
  if (matches.length > 1) throw new Error(`发现多个同名 Hypit Build：${title}`)
  if (!matches.length) return null
  if (typeof matches[0].id !== 'string' || !matches[0].id.trim()) throw new Error(`Hypit Build 目录缺少 ID：${title}`)
  return matches[0].id
}

function discoverSubmittedBuild(root, title) {
  let before
  const cursors = new Set()
  do {
    const listed = spawnSync('hypit', ['builds', '--workspace', root, '--limit', '100', ...(before ? ['--before', before] : []), '--json'], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
    if (listed.status !== 0) throw new Error(listed.stderr.trim() || listed.stdout.trim() || 'Hypit Build 目录查询失败')
    const machine = JSON.parse(listed.stdout)
    const buildId = submittedBuildId(machine, title)
    if (buildId) return buildId
    before = machine.next
    if (before && cursors.has(before)) throw new Error('Hypit Build 目录分页游标重复')
    if (before) cursors.add(before)
  } while (before)
  return null
}

async function writePendingBuild(path, value) {
  const temporary = `${path}.${randomUUID()}.tmp`
  try {
    await writeFile(temporary, `${JSON.stringify(value)}\n`, { flag: 'wx' })
    await rename(temporary, path)
  } finally {
    await rm(temporary, { force: true })
  }
}

async function selectedProductionPlan(root, episode) {
  const selection = JSON.parse(await readFile(resolve(root, 'episodes', episode, 'production-plan/selected.json'), 'utf8'))
  if (!/^v\d{3}$/.test(selection.versionId || '') || typeof selection.path !== 'string') throw new Error('制作计划 selected.json 无效')
  const path = await projectFile(root, selection.path, '制作计划')
  if (path !== resolve(root, 'episodes', episode, 'production-plan', `${selection.versionId}.json`)) throw new Error('制作计划 selected.json 路径与版本不一致')
  const document = JSON.parse(await readFile(path, 'utf8'))
  if (!document.approved || document.unresolved?.length || !Array.isArray(document.shots)) throw new Error('制作计划必须 approved 且无未决项')
  return { selection, document }
}

function selectedVersion(ledger, reference) {
  const asset = ledger.assets?.[reference.asset_key]
  const version = asset?.versions?.find((item) => item.id === reference.version_id)
  if (!version || asset.selectedVersionId !== reference.version_id || asset.staleVersionIds?.includes(reference.version_id)) throw new Error(`参考素材不是当前 selected 且未失效版本：${reference.asset_key}@${reference.version_id}`)
  const compatible = { image: ['character', 'scene', 'prop', 'storyboard', 'other', 'image'], video: ['video', 'other'], audio: ['audio'] }
  if (!compatible[reference.type]?.includes(asset.type)) throw new Error(`参考素材类型不兼容：${reference.asset_key}@${reference.version_id}`)
  return version
}

async function assertProductionReady(root, episode) {
  const state = JSON.parse(await readFile(resolve(root, '.short-drama/state.json'), 'utf8'))
  if (state.stage !== 'media-production') throw new Error(`production 只能在 media-production 阶段执行；当前阶段为 ${state.stage}`)
  for (const stage of stages.slice(0, stages.indexOf(state.stage))) {
    if (!state.completed?.includes(stage)) throw new Error(`生成门禁未通过：上游阶段 ${stage} 未完成`)
    const gate = await inspectStage(root, stage)
    if (!gate.ready) throw new Error(`生成门禁未通过：${stage}：${gate.missing.join('；')}`)
  }
  const validation = spawnSync(process.execPath, [resolve(import.meta.dirname, 'validate-project.mjs'), root], { encoding: 'utf8' })
  if (validation.status !== 0) throw new Error((validation.stderr || validation.stdout).trim() || '项目完整校验失败')
  const [{ selection: planSelection, document: plan }, storyboardSelection, assets, reviews] = await Promise.all([
    selectedProductionPlan(root, episode),
    readFile(resolve(root, 'episodes', episode, 'storyboard/selected.json'), 'utf8').then(JSON.parse),
    readFile(resolve(root, '.short-drama/assets.json'), 'utf8').then(JSON.parse),
    readFile(resolve(root, '.short-drama/shot-reviews.json'), 'utf8').then(JSON.parse),
  ])
  const missing = [
    ...await missingStoryboardAssets(root, episode, storyboardSelection.versionId, plan.shots, assets),
    ...missingStoryboardReviews(episode, plan.shots, assets, reviews),
    ...await missingDepthReviews(root, episode, plan.shots.filter((shot) => shot.video_strategy?.depth_reference), assets, reviews),
    ...await missingPrevizAssets(root, episode, storyboardSelection.versionId, plan.shots, assets, planSelection.versionId),
    ...missingPrevizReviews(episode, plan.shots, assets, reviews),
  ]
  if (missing.length) throw new Error(`视频生成门禁未通过：${missing.join('；')}`)
}

function h3Settings(project) {
  const parameters = project.providers?.video?.parameters || {}
  const resolution = parameters.size ?? parameters.resolution ?? '768P'
  if (!['768P', '2K'].includes(resolution)) throw new Error(`Hypit Runtime 的 MiniMax H3 分辨率必须是 768P 或 2K，不能把 ${resolution} 静默改写`)
  return { resolution, ratio: parameters.ratio || project.format?.aspect_ratio || '9:16' }
}

function seedanceModel(model) {
  if (model === 'dreamina-seedance-2-0-260128') return 'standard'
  if (model === 'dreamina-seedance-2-0-fast-260128') return 'fast'
  throw new Error(`当前 Hypit Runtime 未绑定该 Seedance 模型：${model}`)
}

function seedanceDuration(version, reference) {
  const duration = version.duration_seconds ?? version.provenance?.parameters?.duration ?? version.provenance?.parameters?.duration_seconds
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Seedance ${reference.type} 参考缺少 duration_seconds：${reference.asset_key}@${reference.version_id}`)
  return duration
}

async function reusableSelectedShot(root, episode, promptVersion, shot, planShot, ledger, reviews) {
  const key = `shot-${episode.replace('-', '')}-${String(shot.shot_number).padStart(3, '0')}`
  const asset = ledger.assets?.[key]
  const version = asset?.versions?.find((item) => item.id === asset.selectedVersionId)
  const source = version?.provenance?.prompt_document
  if (asset?.type !== 'video' || !version || asset.staleVersionIds?.includes(version.id) || source?.episode_key !== episode || source?.shot_number !== shot.shot_number || !/^v\d{3}$/.test(source.version_id || '')) return false
  try { for (const reference of shot.references) selectedVersion(ledger, reference) } catch { return false }
  const expectedSources = shot.references.map((item) => `${item.asset_key}@${item.version_id}`).sort()
  const actualSources = (version.provenance?.source_assets || []).map((item) => `${item.key}@${item.version_id}`).sort()
  if (JSON.stringify(actualSources) !== JSON.stringify(expectedSources)) return false
  if (!await sameShotVersion(root, episode, 'video-prompts', source.version_id, promptVersion, shot.shot_number).catch(() => false)) return false
  const review = reviews.reviews?.[`${key}@${version.id}`]
  if (!validApprovedVideoReview(review, version.sha256, shot.duration, planShot.review_checks)) return false
  const audioMode = typeof planShot.audio_strategy === 'string' ? planShot.audio_strategy : planShot.audio_strategy?.mode
  if (shot.prompt_profile === 'h3' && audioMode === 'native') {
    const audit = await readFile(resolve(root, '.short-drama/audio-audits', `${key}@${version.id}.json`), 'utf8').then(JSON.parse).catch(() => null)
    if (!audit?.approved || audit.sha256 !== version.sha256) return false
  }
  return true
}

async function hasUnreviewedCandidate(root, episode, promptVersion, shot, ledger, reviews) {
  const key = `shot-${episode.replace('-', '')}-${String(shot.shot_number).padStart(3, '0')}`
  const asset = ledger.assets?.[key]
  for (const version of asset?.versions || []) {
    if (asset.staleVersionIds?.includes(version.id) || reviews.reviews?.[`${key}@${version.id}`]) continue
    const source = version.provenance?.prompt_document
    if (source?.episode_key !== episode || source?.shot_number !== shot.shot_number || !/^v\d{3}$/.test(source.version_id || '')) continue
    if (await sameShotVersion(root, episode, 'video-prompts', source.version_id, promptVersion, shot.shot_number).catch(() => false)) return true
  }
  return false
}

export function planGenerationGroups(shots, states = {}) {
  const groups = []
  let group = null
  let previous = null
  for (const shot of shots) {
    if (!Number.isInteger(shot.shot_number) || shot.shot_number < 1 || previous && shot.shot_number <= previous.shot_number) throw new Error('生成镜头必须按递增 shot_number 排列')
    const link = shot.continuity || {}
    if (link.mode === 'previous-tail') {
      if (!group || link.source_shot_number !== previous?.shot_number) throw new Error(`第 ${shot.shot_number} 镜 previous-tail 必须紧接上一镜`)
    } else {
      group = { id: `generation-group-${String(shot.shot_number).padStart(3, '0')}`, shot_numbers: [] }
      groups.push(group)
    }
    group.shot_numbers.push(shot.shot_number)
    previous = shot
  }
  return groups.map((item) => {
    const pending = item.shot_numbers.find((number) => !states[number]?.reusable)
    if (pending === undefined) return { ...item, status: 'complete', ready_shot_number: null, deferred_shot_numbers: [] }
    const state = states[pending] || {}
    const shot = shots.find((entry) => entry.shot_number === pending)
    const deferred = item.shot_numbers.filter((number) => number !== pending && !states[number]?.reusable)
    if (state.pending_review) return { ...item, status: 'waiting-review', ready_shot_number: null, waiting_shot_number: pending, deferred_shot_numbers: deferred }
    if (shot.continuity?.mode === 'previous-tail' && !state.tail_ready) return { ...item, status: 'waiting-tail', ready_shot_number: null, waiting_shot_number: pending, deferred_shot_numbers: deferred, reason: state.tail_error || '请先从上一镜当前审核选版提取尾帧' }
    return { ...item, status: 'ready', ready_shot_number: pending, deferred_shot_numbers: deferred }
  })
}

export async function validateRuntimeProfile(profileArg, document) {
  const profile = JSON.parse(await readFile(await realpath(resolve(profileArg)), 'utf8'))
  const capabilities = { h3: '@hypit/minimax-h3@1#minimax-h3', seedance2: '@hypit/seedance@1#seedance-2' }
  const providers = { runninghub: '@hypit/provider-runninghub', starrouter: '@hypit/provider-starrouter' }
  for (const shot of document.shots) {
    const capability = capabilities[shot.prompt_profile]
    const endpointName = profile.bindings?.[capability]
    const expected = providers[shot.provider]
    if (!capability || !expected || typeof endpointName !== 'string' || profile.endpoints?.[endpointName]?.use !== expected) throw new Error(`第 ${shot.shot_number} 镜 Runtime Profile 未把 ${capability || shot.prompt_profile} 显式绑定到 ${shot.provider}`)
  }
  return true
}

export async function compileEpisode(projectRoot, episode) {
  const root = await realpath(resolve(projectRoot))
  if (!/^ep-\d{3}$/.test(episode || '')) throw new Error('episode 必须为 ep-001 格式')
  const [{ selection, document }, production, project, ledger, reviews] = await Promise.all([
    selectedDocument(root, episode),
    selectedProductionPlan(root, episode),
    readFile(resolve(root, '.short-drama/project.json'), 'utf8').then(JSON.parse).then(validateProject),
    readFile(resolve(root, '.short-drama/assets.json'), 'utf8').then(JSON.parse),
    readFile(resolve(root, '.short-drama/shot-reviews.json'), 'utf8').then(JSON.parse),
  ])
  const output = resolve(root, '.short-drama/hypit', episode)
  validateWorkflowMotionPolicy(project.workflow.type, 'production-plan', production.document)
  validateWorkflowMotionPolicy(project.workflow.type, 'video-prompts', document)
  const states = {}
  for (const shot of document.shots) {
    const provider = project.providers?.video
    if (provider?.provider !== shot.provider || provider?.model_or_workflow !== shot.model_or_workflow) throw new Error(`第 ${shot.shot_number} 镜与 project.json 视频 Provider 配置不一致`)
    const planShot = production.document.shots.find((item) => item.shot_number === shot.shot_number)
    if (!planShot || shot.production_plan_version !== production.selection.versionId) throw new Error(`第 ${shot.shot_number} 镜未绑定当前 selected 制作计划`)
    for (const [field, actual] of Object.entries({ provider: shot.provider, model_or_workflow: shot.model_or_workflow, prompt_profile: shot.prompt_profile, input_mode: shot.input_mode, duration_seconds: shot.duration })) if (planShot[field] !== actual) throw new Error(`第 ${shot.shot_number} 镜与制作计划 ${field} 不一致`)
    if (!sameShotContract(planShot, shot)) throw new Error(`第 ${shot.shot_number} 镜制作计划与视频提示词引用不一致，拒绝计划或付费提交`)
    const referenceMode = planShot.video_strategy?.depth_reference
      ? 'depth'
      : planShot.previz_strategy?.purpose === 'motion-reference' ? 'previz' : 'none'
    if (shot.prompt_profile === 'seedance2') for (const reference of shot.references) {
      if (reference.type !== 'audio' && typeof reference.person_reference !== 'boolean') throw new Error(`第 ${shot.shot_number} 镜 Seedance 图片/视频引用必须声明 person_reference`)
      if (reference.type === 'audio' && reference.person_reference !== undefined) throw new Error(`第 ${shot.shot_number} 镜 Seedance 音频引用不得声明 person_reference`)
    }
    validateRequiredVideoReferences(shot.references, { referenceMode })
    if (referenceMode === 'depth') validateDepthReferenceBinding(planShot, shot.references, ledger)
    else if (referenceMode === 'previz') validateMotionReferenceBinding(episode, planShot, shot, ledger)
    for (const reference of shot.references.filter((item) => item.role === 'character_identity')) await validateCharacterIdentityBinding(root, reference)
    let tailReady = shot.continuity?.mode !== 'previous-tail'
    let tailError = null
    if (!tailReady) try { await validatePreviousTailBinding(root, shot, shot.references); tailReady = true }
    catch (error) { tailError = error.message }
    const reusable = tailReady && await reusableSelectedShot(root, episode, selection.versionId, shot, planShot, ledger, reviews)
    const state = { reusable, pending_review: !reusable && tailReady && await hasUnreviewedCandidate(root, episode, selection.versionId, shot, ledger, reviews), tail_ready: tailReady, tail_error: tailError }
    states[shot.shot_number] = state
  }
  const generationGroups = planGenerationGroups(document.shots, states)
  const readyShots = new Set(generationGroups.map((group) => group.ready_shot_number).filter(Number.isInteger))
  const imports = new Set(['  <import as="media" from="@hypit/media@1"/>', '  <import as="text" from="@hypit/text@1"/>'])
  const bodies = []
  const targets = []
  for (const shot of document.shots.filter((item) => readyShots.has(item.shot_number))) {
    const number = String(shot.shot_number).padStart(3, '0')
    const provider = project.providers?.video
    await validatePreviousTailBinding(root, shot, shot.references)
    const refs = []
    for (const [index, reference] of shot.references.entries()) {
      const version = selectedVersion(ledger, reference)
      const path = await projectFile(root, version.localPath, `${reference.asset_key}@${reference.version_id}`)
      const id = `ref-s${number}-r${String(index + 1).padStart(3, '0')}`
      const element = { image: 'Image', video: 'Video', audio: 'Audio' }[reference.type]
      if (!element) throw new Error(`不支持的参考类型：${reference.type}`)
      bodies.push(`  <media:${element} id="${id}" src="${xml(localRef(output, path))}"/>`)
      refs.push({ id, reference, version })
    }
    const promptId = `prompt-${number}`
    const shotId = `shot-${number}`
    const firstFrame = refs.find((item) => item.reference.role === 'first_frame')
    const subjectReferences = refs.filter((item) => item !== firstFrame)
    bodies.push(`  <text:Value id="${promptId}">${xml(shot.prompt)}</text:Value>`)
    if (shot.prompt_profile === 'h3') {
      if (shot.input_mode !== 'Ref2VA') throw new Error(`第 ${shot.shot_number} 镜当前 Runtime 编译器仅支持 H3 Ref2VA`)
      imports.add('  <import as="h3" from="@hypit/minimax-h3@1"/>')
      const settings = h3Settings(project)
      const first = firstFrame ? ` first-frame={${firstFrame.id}}` : ''
      bodies.push(`  <h3:ReferenceVideo id="${shotId}" prompt={${promptId}} duration="${shot.duration}" resolution="${settings.resolution}" aspect-ratio="${settings.ratio}"${first}>`)
      for (const item of subjectReferences) bodies.push(`    <h3:Reference ${item.reference.type}={${item.id}}/>`)
      bodies.push('  </h3:ReferenceVideo>')
    } else if (shot.prompt_profile === 'seedance2') {
      imports.add('  <import as="seedance" from="@hypit/seedance@1"/>')
      const parameters = provider.parameters || {}
      const first = firstFrame ? ` first-frame={${firstFrame.id}} first-frame-person-reference="${firstFrame.reference.person_reference}"` : ''
      bodies.push(`  <seedance:ReferenceVideo id="${shotId}" model="${seedanceModel(shot.model_or_workflow)}" prompt={${promptId}} duration="${shot.duration}" resolution="${parameters.resolution || '720p'}" aspect-ratio="${parameters.ratio || project.format?.aspect_ratio || '9:16'}" generate-audio="${parameters.generate_audio !== false}"${first}>`)
      for (const item of subjectReferences) {
        const visual = item.reference.type === 'audio' ? '' : ` person-reference="${item.reference.person_reference}"`
        const duration = item.reference.type === 'image' ? '' : ` duration-seconds="${seedanceDuration(item.version, item.reference)}"`
        bodies.push(`    <seedance:Reference ${item.reference.type}={${item.id}}${visual}${duration}/>`)
      }
      bodies.push('  </seedance:ReferenceVideo>')
    } else throw new Error(`第 ${shot.shot_number} 镜暂不支持 prompt_profile=${shot.prompt_profile}`)
    targets.push(`  <target output="${shotId}.video"/>`)
  }
  await mkdir(output, { recursive: true })
  const authorPath = resolve(output, `${selection.versionId}.svml`)
  const runPath = resolve(output, `${selection.versionId}.svrun`)
  const author = `<?svml using="@hypit/markup@1"?>\n\n<svml>\n${[...imports].join('\n')}\n\n${bodies.join('\n')}\n</svml>\n`
  const run = `<?svml using="@hypit/run-markup@1"?>\n\n<svrun version="1">\n  <author source="./${selection.versionId}.svml"/>\n${targets.join('\n')}\n</svrun>\n`
  await Promise.all([writeFile(authorPath, author, 'utf8'), writeFile(runPath, run, 'utf8')])
  return {
    episode_key: episode,
    version_id: selection.versionId,
    shot_count: document.shots.length,
    target_count: targets.length,
    reused_shot_count: Object.values(states).filter((state) => state.reusable).length,
    deferred_shot_count: document.shots.length - targets.length - Object.values(states).filter((state) => state.reusable).length,
    generation_groups: generationGroups,
    author_source: posix(relative(root, authorPath)),
    run_source: posix(relative(root, runPath)),
  }
}

export async function registerBuildOutputs(projectRoot, episode, versionId, buildId, exportOutput, availableOutputs) {
  const root = await realpath(resolve(projectRoot))
  const document = await versionedDocument(root, episode, versionId)
  const available = availableOutputs === undefined ? null : new Set(availableOutputs)
  const temporary = await mkdtemp(resolve(tmpdir(), 'hypit-short-drama-output-'))
  try {
    const candidates = []
    for (const shot of document.shots) {
      const number = String(shot.shot_number).padStart(3, '0')
      const output = `shot-${number}.video`
      if (available && !available.has(output)) continue
      const ledger = JSON.parse(await readFile(resolve(root, '.short-drama/assets.json'), 'utf8'))
      const existing = ledger.assets?.[`shot-${episode.replace('-', '')}-${number}`]?.versions?.find((version) => version.provenance?.task_id === buildId && version.provenance?.parameters?.hypit_output === output)
      if (existing) { candidates.push({ asset_key: `shot-${episode.replace('-', '')}-${number}`, version_id: existing.id, output_path: resolve(root, existing.localPath), selected: false, reused: true }); continue }
      const exported = resolve(temporary, `${output}.mp4`)
      await exportOutput(output, exported)
      candidates.push(await importAssetFile(root, `shot-${episode.replace('-', '')}-${number}`, exported, {
        origin: 'generated', created_by: 'provider', provider: shot.provider, model_or_workflow: shot.model_or_workflow, task_id: buildId,
        prompt_document: { episode_key: episode, version_id: versionId, shot_number: shot.shot_number },
        source_assets: shot.references.map((item) => ({ key: item.asset_key, version_id: item.version_id })),
        parameters: { duration: shot.duration, hypit_build_id: buildId, hypit_output: output },
      }, `${episode} 第 ${shot.shot_number} 镜`))
    }
    return candidates
  } finally { await rm(temporary, { recursive: true, force: true }) }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const input = args(process.argv.slice(2))
    if (!['compile', 'check', 'plan', 'build'].includes(input.command) || !input.project_root || !input.episode) throw new Error('用法：hypit-runtime.mjs <compile|check|plan|build> --project-root <项目> --episode ep-001 [--runtime <Profile>] [--confirmed]')
    if (['plan', 'build'].includes(input.command) && !input.runtime) throw new Error(`production ${input.command} 必须显式指定 --runtime`)
    if (input.command !== 'build' && input.confirmed) throw new Error('--confirmed 只适用于 production build')
    const root = await realpath(resolve(input.project_root))
    const pendingPath = resolve(root, '.short-drama/hypit', input.episode, 'pending-build.json')
    let pending = null
    if (input.command === 'build') try {
      pending = await validatePendingBuild(root, input.episode, JSON.parse(await readFile(pendingPath, 'utf8')), resolve(root, input.runtime))
    } catch (error) { if (error?.code !== 'ENOENT') throw error }
    if (pending?.phase === 'submitting') {
      const buildId = discoverSubmittedBuild(root, pending.submission_title)
      if (buildId) {
        pending = { ...pending, phase: 'accepted', build_id: buildId }
        await writePendingBuild(pendingPath, pending)
      } else {
        // Hypit 的本地 Build 目录是提交事实源；查无记录说明上次进程未越过持久化边界，可以安全重新提交。
        await rm(pendingPath, { force: true })
        pending = null
      }
    } else if (pending?.phase === 'accepted') {
      const buildId = discoverSubmittedBuild(root, pending.submission_title)
      if (!buildId || buildId !== pending.build_id) throw new Error('待回收 Build ID 与唯一提交标题不一致，拒绝再次付费提交')
    }
    if (!pending && input.command !== 'compile') await assertProductionReady(root, input.episode)
    const compiled = pending ? null : await compileEpisode(root, input.episode)
    if (['plan', 'build'].includes(input.command)) await validateRuntimeProfile(resolve(root, input.runtime), pending ? await versionedDocument(root, input.episode, pending.version_id) : (await selectedDocument(root, input.episode)).document)
    if (input.command === 'compile') console.log(JSON.stringify(compiled, null, 2))
    else {
      if (input.command === 'build' && !pending && input.confirmed !== true) throw new Error('付费 Build 必须显式传入 --confirmed；先执行 production plan 查看制作计划')
      const runtimePath = input.runtime ? resolve(root, input.runtime) : null
      const waitForBuild = async (buildId) => {
        const watched = spawnSync('hypit', ['status', buildId, '--workspace', root, '--runtime', runtimePath, '--watch', '--json'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 })
        let status
        try { status = JSON.parse(watched.stdout) } catch {}
        if (status?.format === 'hypit.cli-status@1' && ['complete', 'failed', 'cancelled'].includes(status.build?.work?.outcome)) return status
        if (watched.status !== 0) throw new Error(watched.stderr.trim() || watched.stdout.trim() || `Hypit Build ${buildId} 等待失败`)
        throw new Error(`Hypit Build ${buildId} 未进入终态：${watched.stdout.trim()}`)
      }
      const inspectBuild = (buildId) => {
        const inspected = spawnSync('hypit', ['inspect', buildId, '--workspace', root, '--json'], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
        if (inspected.status !== 0) throw new Error(inspected.stderr.trim() || inspected.stdout.trim() || `Hypit Build ${buildId} 结果检查失败`)
        const machine = JSON.parse(inspected.stdout)
        if (machine?.format !== 'hypit.cli-inspect@1' || machine.build?.id !== buildId || !['complete', 'failed', 'cancelled'].includes(machine.build?.outcome)) throw new Error(`Hypit Build ${buildId} 结果合同无效`)
        return machine.build
      }
      const exportCandidates = async (buildId, versionId, outputs) => registerBuildOutputs(root, input.episode, versionId, buildId, async (output, destination) => {
        const exported = spawnSync('hypit', ['get', buildId, '--workspace', root, '--output', output, '--to', destination, '--json'], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
        if (exported.status !== 0) throw new Error(exported.stderr.trim() || exported.stdout.trim() || `Hypit Output 导出失败：${output}`)
      }, outputs)
      const collectBuild = async (buildId, versionId) => {
        await waitForBuild(buildId)
        const result = inspectBuild(buildId)
        const outputs = reusableBuildTargetOutputs({ format: 'hypit.cli-inspect@1', build: result })
        const candidates = await exportCandidates(buildId, versionId, outputs)
        await rm(pendingPath, { force: true })
        if (result.outcome !== 'complete' || result.availableTargetCount !== result.targetCount) throw new Error(`Hypit Build ${buildId} ${result.outcome}；已安全回收 ${candidates.length}/${result.targetCount} 个可用镜头，修订失败镜头后重新计划`)
        return candidates
      }
      let resumed = false
      if (pending) {
        const candidates = await collectBuild(pending.build_id, pending.version_id)
        console.log(JSON.stringify({ format: 'hypit.short-drama-build@1', resumed: true, build_id: pending.build_id, candidates }, null, 2))
        resumed = true
      }
      if (!resumed) {
        if (input.command === 'build' && compiled.target_count === 0) throw new Error('当前没有可提交镜头：请先审核并选版组内前镜，或执行 prepare_previous_tail 准备下一镜首帧')
        const submissionTitle = input.command === 'build' ? `short-drama-${input.episode}-${compiled.version_id}-${randomUUID()}` : null
        if (submissionTitle) {
          const promptPath = resolve(root, 'episodes', input.episode, 'video-prompts', `${compiled.version_id}.json`)
          const runPath = resolve(root, compiled.run_source)
          await writePendingBuild(pendingPath, {
            schema_version: 2, phase: 'submitting', episode_key: input.episode, version_id: compiled.version_id, build_id: null,
            submission_title: submissionTitle, created_at: new Date().toISOString(),
            prompt_document: { path: posix(relative(root, promptPath)), sha256: await fileSha256(promptPath) },
            run_source: { path: compiled.run_source, sha256: await fileSha256(runPath) },
            runtime_profile: { path: posix(relative(root, runtimePath)), sha256: await fileSha256(await realpath(runtimePath)) },
          })
        }
        const command = [input.command, resolve(input.project_root, compiled.run_source), '--workspace', resolve(input.project_root), ...(runtimePath ? ['--runtime', runtimePath] : []), ...(submissionTitle ? ['--title', submissionTitle, '--json'] : [])]
        const result = input.command === 'plan' && compiled.target_count === 0
          ? { status: 0, stdout: '', stderr: '' }
          : spawnSync('hypit', command, { cwd: resolve(input.project_root), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 })
        let recoveredSubmission = false
        if (result.status !== 0) {
          if (!submissionTitle) throw new Error(result.stderr.trim() || result.stdout.trim() || `hypit ${input.command} 失败`)
          const buildId = discoverSubmittedBuild(root, submissionTitle)
          if (!buildId) {
            await rm(pendingPath, { force: true })
            throw new Error(result.stderr.trim() || result.stdout.trim() || `hypit ${input.command} 失败`)
          }
          const checkpoint = await validatePendingBuild(root, input.episode, JSON.parse(await readFile(pendingPath, 'utf8')), runtimePath)
          await writePendingBuild(pendingPath, { ...checkpoint, phase: 'accepted', build_id: buildId })
          const candidates = await collectBuild(buildId, compiled.version_id)
          console.log(JSON.stringify({ format: 'hypit.short-drama-build@1', recovered_submission: true, build_id: buildId, candidates }, null, 2))
          recoveredSubmission = true
        }
        if (recoveredSubmission) {
          // 已从唯一提交标题找回 Build，此分支不得再次解析失败命令的输出或创建新 Build。
        } else if (input.command !== 'build') {
          let hypitPlan = result.stdout.trim()
          try { hypitPlan = hypitPlan ? JSON.parse(hypitPlan) : null } catch {}
          console.log(JSON.stringify({ format: 'hypit.short-drama-plan@1', ...compiled, hypit_plan: hypitPlan }, null, 2))
        }
        else {
          const machine = JSON.parse(result.stdout)
          if (machine?.format !== 'hypit.cli-build@1' || typeof machine.build?.id !== 'string' || machine.build.title !== submissionTitle) throw new Error(`Hypit Build 未成功提交或标题不匹配：${result.stdout.trim()}`)
          const checkpoint = await validatePendingBuild(root, input.episode, JSON.parse(await readFile(pendingPath, 'utf8')), runtimePath)
          await writePendingBuild(pendingPath, { ...checkpoint, phase: 'accepted', build_id: machine.build.id })
          const candidates = await collectBuild(machine.build.id, compiled.version_id)
          console.log(JSON.stringify({ ...machine, candidates }, null, 2))
        }
      }
    }
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
