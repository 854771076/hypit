import { readFile, realpath } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { validateTemporaryReferenceUrl } from './media-hosting/publish.mjs'
import { selectedAssetVersion } from './asset-ledger.mjs'
import { assertCharacterReadyForVisuals } from './character-appeal.mjs'

const compact = (values) => (values || []).filter((value) => typeof value === 'string' && value.trim())
const AUDIO_EVIDENCE_SOURCES = new Set(['script', 'storyboard', 'scene_asset', 'audio_reference'])

const REQUIRED_VIDEO_REFERENCES = new Map([
  ['temporal_storyboard', 'image'],
  ['shot_board', 'image'],
  ['audio_reference', 'audio'],
])

function exactFields(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} 必须是对象`)
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...fields].sort())) throw new Error(`${label} 字段必须且只能是：${fields.join(', ')}`)
}

function exactText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} 必须是非空字符串`)
}

function keySet(value, label, { prefix } = {}) {
  if (!Array.isArray(value)) throw new Error(`${label} 必须是数组`)
  const keys = value.map((item) => {
    exactText(item, label)
    if (prefix && !item.startsWith(prefix)) throw new Error(`${label} 只能包含 ${prefix}*`)
    return item
  })
  if (new Set(keys).size !== keys.length) throw new Error(`${label} 不得重复`)
  return new Set(keys)
}

function compareSets(expected, actual, label) {
  const missing = [...expected].filter((key) => !actual.has(key))
  const extra = [...actual].filter((key) => !expected.has(key))
  if (missing.length || extra.length) throw new Error(`${label}与制作计划不一致${missing.length ? `，缺少：${missing.join('、')}` : ''}${extra.length ? `，多出：${extra.join('、')}` : ''}`)
}

function storyboardCharacterKey(character) {
  for (const value of [character?.asset_key, character?.key, character?.appearance]) {
    if (typeof value !== 'string') continue
    const key = value.split('@', 1)[0]
    if (key.startsWith('char-')) return key
  }
  return null
}

export function deriveMotionReferenceMode(planShot) {
  if (planShot?.video_strategy?.depth_reference) return 'depth'
  if (planShot?.previz_strategy?.mode === 'blender' && planShot.previz_strategy.purpose === 'motion-reference') return 'previz'
  return 'none'
}

export function validateShotGenerationContract({ planShot, storyboardPanel, manifest, audioPolicy }) {
  const plannedCharacters = keySet(planShot?.video_strategy?.visible_character_keys, '制作计划 visible_character_keys', { prefix: 'char-' })
  const storyboardCharacters = keySet((storyboardPanel?.characters || []).map(storyboardCharacterKey), '分镜人物 character keys', { prefix: 'char-' })
  const referenceCharacters = keySet((manifest || []).filter((item) => item?.role === 'character_identity').map((item) => item.asset_key), '人物参考 character keys', { prefix: 'char-' })
  compareSets(plannedCharacters, storyboardCharacters, '分镜人物')
  compareSets(plannedCharacters, referenceCharacters, '人物参考')

  const plannedEvents = keySet(planShot?.video_strategy?.visible_event_keys, '制作计划 visible_event_keys')
  const storyboardEvents = keySet(storyboardPanel?.visible_event_keys, '分镜 visible_event_keys')
  compareSets(plannedEvents, storyboardEvents, '分镜可见事件')

  for (const [index, item] of (audioPolicy?.ambience || []).entries()) {
    const evidence = item?.evidence
    if (!evidence || !AUDIO_EVIDENCE_SOURCES.has(evidence.source) || typeof evidence.detail !== 'string' || !evidence.detail.trim()) throw new Error(`环境底 ambience[${index}] 缺少有效来源证据`)
  }
  for (const [index, item] of (audioPolicy?.action_sounds || []).entries()) {
    if (typeof item?.evidence_event_key !== 'string' || !item.evidence_event_key.trim()) throw new Error(`动作声 action_sounds[${index}] 缺少 evidence_event_key`)
    if (!plannedEvents.has(item.evidence_event_key)) throw new Error(`动作声 action_sounds[${index}] 绑定了不存在的可见事件：${item.evidence_event_key}`)
  }
  return { visible_character_keys: [...plannedCharacters], visible_event_keys: [...plannedEvents] }
}

export function validateRequiredVideoReferences(manifest, { referenceMode = 'depth' } = {}) {
  if (!Array.isArray(manifest)) throw new Error('视频 reference_manifest 必须是数组')
  if (!['depth', 'previz', 'none'].includes(referenceMode)) throw new Error('视频主运动参考模式无效')
  const identities = manifest.filter((item) => item?.role === 'character_identity')
  if (identities.some((item) => item.type !== 'image' || !item.asset_key?.startsWith('char-'))) throw new Error('character_identity 必须引用 char-* 图片资产')
  const depthReferences = manifest.filter((item) => item?.role === 'depth_reference')
  const previzReferences = manifest.filter((item) => item?.role === 'reference_video')
  if (referenceMode === 'depth' && (depthReferences.length !== 1 || depthReferences[0].type !== 'video' || previzReferences.length)) throw new Error('复刻视频生成必须且只能包含一个 video/depth_reference，且不得混用 reference_video')
  if (referenceMode === 'previz' && (previzReferences.length !== 1 || previzReferences[0].type !== 'video' || depthReferences.length)) throw new Error('启用空间预演的视频生成必须且只能包含一个 video/reference_video，且不得混用 depth_reference')
  if (referenceMode === 'none' && (depthReferences.length || previzReferences.length)) throw new Error('未启用主运动参考的镜头不得携带 depth_reference 或 reference_video')
  for (const [role, type] of REQUIRED_VIDEO_REFERENCES) {
    const matches = manifest.filter((item) => item?.role === role)
    if (matches.length !== 1 || matches[0].type !== type) throw new Error(`视频生成必须且只能包含一个 ${type}/${role} 参考`)
  }
  const temporal = manifest.find((item) => item.role === 'temporal_storyboard')
  const shot = manifest.find((item) => item.role === 'shot_board')
  if (temporal.asset_key === shot.asset_key && temporal.version_id === shot.version_id) throw new Error('故事版与分镜板必须是两个独立参考版本')
  for (const item of manifest.filter((entry) => entry?.role === 'asset_board')) if (item.type !== 'image') throw new Error('asset_board 只能是图片参考')
  return manifest
}

export function validateDepthReferenceBinding(planShot, manifest, assets) {
  const contract = planShot?.video_strategy?.depth_reference
  const reference = manifest?.find((item) => item?.role === 'depth_reference')
  if (!contract || !reference || reference.asset_key !== contract.expected_output_asset_key) throw new Error('深度视频引用与制作计划预期输出不一致')
  const asset = assets?.assets?.[reference.asset_key]
  const version = asset?.versions?.find((item) => item.id === reference.version_id)
  const provenance = version?.provenance
  if (asset?.selectedVersionId !== reference.version_id || asset.staleVersionIds?.includes(reference.version_id) || provenance?.origin !== 'generated' || provenance.created_by !== 'provider' || provenance.provider !== contract.provider || provenance.model_or_workflow !== contract.workflow_id) throw new Error('深度视频必须是当前 selected、未失效且由计划中的 RunningHub 工作流生成的版本')
  if (!provenance.source_assets?.some((item) => item.key === contract.source_asset_key && item.version_id === contract.source_version_id)) throw new Error('深度视频 provenance 未绑定制作计划中的时间参考源版本')
  return reference
}

export async function resolveCharacterProfile(rootArg, reference) {
  exactFields(reference?.identity_binding, ['profile_name', 'profile_sha256', 'appearance_id'], 'identity_binding')
  const binding = reference.identity_binding
  exactText(binding.profile_name, 'identity_binding.profile_name')
  if (!/^[a-f0-9]{64}$/.test(binding.profile_sha256)) throw new Error('identity_binding.profile_sha256 必须是 SHA-256')
  if (!Number.isInteger(binding.appearance_id) || binding.appearance_id < 1) throw new Error('identity_binding.appearance_id 必须是正整数')

  const root = await realpath(resolve(rootArg))
  const bytes = await readFile(resolve(root, 'assets/characters/profiles.json'))
  const actualSha = createHash('sha256').update(bytes).digest('hex')
  if (actualSha !== binding.profile_sha256) throw new Error('人物档案 SHA-256 与 identity_binding 不一致')
  const store = JSON.parse(bytes.toString('utf8'))
  if (!Array.isArray(store.characters)) throw new Error('人物档案 characters 必须是数组')
  const matches = store.characters.filter((character) => character?.name === binding.profile_name)
  if (matches.length !== 1) throw new Error(`人物档案必须精确匹配唯一 profile_name：${binding.profile_name}`)
  const profile = matches[0]
  if (!profile.expected_appearances?.some((appearance) => appearance?.id === binding.appearance_id)) throw new Error(`人物档案不存在 appearance_id=${binding.appearance_id}`)
  return profile
}

export async function validateCharacterIdentityBinding(rootArg, reference) {
  const profile = await resolveCharacterProfile(rootArg, reference)
  exactFields(reference?.identity_constraints, ['age_class', 'grooming_and_makeup', 'costume_signature', 'memory_anchors'], 'identity_constraints')
  exactFields(reference?.performance_constraints, ['center_of_gravity', 'gait', 'habitual_actions', 'eyeline_behavior', 'blink_rhythm', 'stress_response', 'forbidden_performance'], 'performance_constraints')
  const constraints = reference.identity_constraints
  const performance = reference.performance_constraints
  const appeal = assertCharacterReadyForVisuals(profile)
  if (constraints.age_class !== appeal.age_class) throw new Error('角色身份年龄分级与人物档案不一致')
  if (constraints.grooming_and_makeup !== appeal.grooming_and_makeup) throw new Error('角色身份妆造与人物档案不一致')
  if (constraints.costume_signature !== appeal.costume_signature) throw new Error('角色身份服装标识与人物档案不一致')
  if (JSON.stringify(constraints.memory_anchors) !== JSON.stringify(appeal.memory_anchors)) throw new Error('角色身份记忆锚点与人物档案不一致')
  // JSON 对象的字段顺序不承载业务含义；按结构比较，避免等价约束因序列化顺序不同被误拒。
  if (!isDeepStrictEqual(performance, profile.performance_bible)) throw new Error('角色表演约束与人物档案不一致')
  return { profile_name: profile.name, appearance_id: reference.identity_binding.appearance_id, ...structuredClone(constraints), performance_constraints: structuredClone(performance) }
}

function inputs(provider, args) {
  if (provider === 'runninghub') {
    if (args.model === 'minimax-h3-reference-to-video') return {
      image: compact(args.reference_image_paths ?? args.reference_paths),
      video: compact(args.reference_video_paths),
      audio: compact(args.reference_audio_paths),
      local: true,
    }
    return { sequential: compact(args.reference_paths), local: true }
  }
  const content = Array.isArray(args.metadata?.content) ? args.metadata.content : []
  if (provider === 'starrouter' && content.length) return {
    image: content.filter((item) => item?.type === 'image_url').map((item) => item.image_url?.url).filter(Boolean),
    video: content.filter((item) => item?.type === 'video_url').map((item) => item.video_url?.url).filter(Boolean),
    audio: content.filter((item) => item?.type === 'audio_url').map((item) => item.audio_url?.url).filter(Boolean),
  }
  if (provider === 'comfly') return {
    image: compact([args.frame_url, args.input_reference, ...(args.images || []), ...(args.reference_image_urls || [])]),
    video: compact(args.reference_video_urls), audio: compact(args.reference_audio_urls),
  }
  const h3Images = compact(args.images).length ? compact(args.images) : compact([args.input_reference || args.frame_url])
  return {
    image: args.prompt_profile === 'h3'
      ? [...h3Images, ...compact(args.reference_image_urls || args.reference_urls)]
      : compact([args.frame_url, ...(args.reference_image_urls || args.reference_urls || [])]),
    video: compact(args.reference_video_urls), audio: compact(args.reference_audio_urls),
  }
}

export async function validatePreviousTailBinding(rootArg, shot, manifest) {
  if (shot?.continuity?.mode !== 'previous-tail') return
  if (!['full-reference', 'Ref2VA'].includes(shot.input_mode)) throw new Error('previous-tail 必须在完整参考模式中携带上一镜尾帧连续性锚点')
  if (shot.continuity.required_provider_capability !== 'video.first-frame' || !Number.isInteger(shot.continuity.source_shot_number) || shot.continuity.source_shot_number < 1) throw new Error('previous-tail 连续性合同缺少 video.first-frame 或有效来源镜号')
  const firstImage = (manifest || []).filter((item) => item?.type === 'image').sort((left, right) => left.order - right.order)[0]
  if (!firstImage || firstImage.order !== 1 || firstImage.role !== 'first_frame') throw new Error('previous-tail 必须是第一个 image 引用并使用 role=first_frame')
  const match = /^other-transition-(ep\d{3})-(\d{3})$/.exec(firstImage.asset_key)
  if (!match || Number(match[2]) !== shot.shot_number) throw new Error('previous-tail first_frame 资产与目标镜号不一致')

  const root = await realpath(resolve(rootArg))
  const tail = await selectedAssetVersion(root, firstImage.asset_key)
  if (tail.version.id !== firstImage.version_id || tail.version.provenance?.origin !== 'transformed' || tail.version.provenance.created_by !== 'codex' || tail.version.provenance.model_or_workflow !== 'ffmpeg-extract-frame') throw new Error('previous-tail first_frame 必须是当前 selected 的确定性尾帧派生资产')
  const sourceKey = `shot-${match[1]}-${String(shot.continuity.source_shot_number).padStart(3, '0')}`
  const sourceReference = tail.version.provenance.source_assets?.find((item) => item.key === sourceKey)
  const source = await selectedAssetVersion(root, sourceKey)
  if (!sourceReference || sourceReference.version_id !== source.version.id || tail.version.provenance.parameters?.source_sha256 !== source.version.sha256) throw new Error('previous-tail 来源版本或 SHA-256 与上一镜当前 selected 版本不一致')
  const promptReference = tail.version.provenance.prompt_document
  if (promptReference?.kind !== 'continuity-plan' || promptReference.episode_key !== match[1].replace('ep', 'ep-') || promptReference.shot_number !== shot.shot_number) throw new Error('previous-tail 缺少匹配目标镜头的连续性计划来源')
}

export async function validateVideoReferenceBindings(rootArg, provider, args, manifest, { requireSelected = true, requireComplete = true, referenceMode = 'depth', at = Date.now() } = {}) {
  if (requireComplete) validateRequiredVideoReferences(manifest, { referenceMode })
  const root = await realpath(resolve(rootArg))
  const actual = inputs(provider, args)
  if (actual.sequential) {
    if (actual.sequential.length !== manifest.length) throw new Error('视频 reference_manifest 与本地 reference_paths 数量不一致')
  } else for (const type of ['image', 'video', 'audio']) {
    if ((actual[type] || []).length !== manifest.filter((item) => item?.type === type).length) throw new Error(`视频 ${type} 实际参考素材与 reference_manifest 数量不一致`)
  }
  const ledger = JSON.parse(await readFile(resolve(root, '.short-drama/assets.json'), 'utf8'))
  for (const [index, reference] of manifest.entries()) {
    if (reference?.asset_key?.startsWith('char-')) await validateCharacterIdentityBinding(root, reference)
    const asset = ledger.assets?.[reference.asset_key]
    const version = asset?.versions?.find((item) => item.id === reference.version_id)
    if (!version || requireSelected && (asset.staleVersionIds?.includes(reference.version_id) || asset.selectedVersionId !== reference.version_id)) throw new Error(`参考素材不是${requireSelected ? '当前 selected 且未失效的' : '已登记的'}版本：${reference.asset_key}@${reference.version_id}`)
    const value = actual.sequential?.[index] ?? actual[reference.type]?.[reference.order - 1]
    if (!value) throw new Error(`参考素材缺少实际输入：${reference.asset_key}@${reference.version_id}`)
    if (actual.local) {
      if (await realpath(resolve(root, value)) !== await realpath(resolve(root, version.localPath))) throw new Error(`本地参考路径与资产版本不一致：${reference.asset_key}@${reference.version_id}`)
    } else await validateTemporaryReferenceUrl(root, value, reference, at)
  }
}
