import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

import { ANTI_GRID_CLAIM_EN, NO_GENERATED_TEXT_CLAIM_EN } from './grid-detect.mjs'
import { planGenerationGroups, registerBuildOutputs, reusableBuildTargetOutputs, submittedBuildId, validatePendingBuild, validateRuntimeProfile } from './hypit-runtime.mjs'

const script = resolve(import.meta.dirname, 'hypit-runtime.mjs')
const projectStore = resolve(import.meta.dirname, 'project-store.mjs')

test('失败或取消的 Build 仍可回收已经产生的目标媒体，活动 Build 不可回收', () => {
  const output = { name: 'shot-001.video', target: true, kind: 'resource' }
  assert.deepEqual(reusableBuildTargetOutputs({ format: 'hypit.cli-inspect@1', build: { outcome: 'failed', outputs: [output] } }), ['shot-001.video'])
  assert.deepEqual(reusableBuildTargetOutputs({ format: 'hypit.cli-inspect@1', build: { outcome: 'open', outputs: [output] } }), [])
})

test('提交中检查点按唯一标题恢复原 Build，不把未知结果当成新提交', () => {
  const machine = { format: 'hypit.cli-builds@1', builds: [{ id: 'build-original', title: 'short-drama-unique' }] }
  assert.equal(submittedBuildId(machine, 'short-drama-unique'), 'build-original')
  assert.equal(submittedBuildId(machine, 'missing'), null)
  assert.throws(() => submittedBuildId({ ...machine, builds: [...machine.builds, ...machine.builds] }, 'short-drama-unique'), /多个同名/)
})

test('镜头组只开放一个前沿镜头，不同组可以同时就绪', () => {
  const shots = [
    { shot_number: 1, continuity: { mode: 'independent' } },
    { shot_number: 2, continuity: { mode: 'previous-tail', source_shot_number: 1 } },
    { shot_number: 3, continuity: { mode: 'independent' } },
  ]
  assert.deepEqual(planGenerationGroups(shots, {
    1: { reusable: false }, 2: { reusable: false, tail_ready: false }, 3: { reusable: false },
  }), [
    { id: 'generation-group-001', shot_numbers: [1, 2], status: 'ready', ready_shot_number: 1, deferred_shot_numbers: [2] },
    { id: 'generation-group-003', shot_numbers: [3], status: 'ready', ready_shot_number: 3, deferred_shot_numbers: [] },
  ])
  assert.equal(planGenerationGroups(shots, {
    1: { reusable: true }, 2: { reusable: false, tail_ready: false, tail_error: '缺少尾帧' }, 3: { reusable: true },
  })[0].status, 'waiting-tail')
  assert.equal(planGenerationGroups(shots, {
    1: { reusable: false, pending_review: true }, 2: { reusable: false }, 3: { reusable: true },
  })[0].status, 'waiting-review')
  assert.throws(() => planGenerationGroups([shots[2], shots[0]], {}), /递增 shot_number/)
})

async function initProject(root, workflow, video) {
  const metadata = resolve(root, 'project-input.json')
  await writeFile(metadata, `${JSON.stringify({ key: 'runtime-test', title: 'Runtime test', workflow: { type: workflow, version: 1 } })}\n`)
  const initialized = spawnSync(process.execPath, [projectStore, 'init', root, metadata], { encoding: 'utf8' })
  assert.equal(initialized.status, 0, initialized.stderr)
  const path = resolve(root, '.short-drama/project.json')
  const project = JSON.parse(await readFile(path, 'utf8'))
  project.providers.video = video
  project.format.aspect_ratio = '9:16'
  project.updatedAt = new Date().toISOString()
  await writeFile(path, `${JSON.stringify(project)}\n`)
}

test('短剧视频合同编译为 Hypit Author/Run Source，且无人镜头无需人物参考', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'hypit-short-drama-runtime-'))
  try {
    await mkdir(resolve(root, 'episodes/ep-001/video-prompts'), { recursive: true })
    await mkdir(resolve(root, 'episodes/ep-001/production-plan'), { recursive: true })
    await mkdir(resolve(root, 'assets/storyboards/temporal'), { recursive: true })
    await mkdir(resolve(root, 'assets/storyboards/shot'), { recursive: true })
    await mkdir(resolve(root, 'assets/videos/previz'), { recursive: true })
    await mkdir(resolve(root, 'assets/audio/reference'), { recursive: true })
    await mkdir(resolve(root, 'assets/other/first-frame'), { recursive: true })
    for (const path of ['assets/storyboards/temporal/v001.png', 'assets/storyboards/shot/v001.png', 'assets/videos/previz/v001.mp4', 'assets/audio/reference/v001.wav', 'assets/other/first-frame/v001.png']) await writeFile(resolve(root, path), 'fixture')
    await initProject(root, 'standard', { provider: 'runninghub', model_or_workflow: 'minimax-h3-reference-to-video', prompt_profile: 'h3', parameters: { resolution: '768P', ratio: '9:16' } })
    const assets = {
      assets: Object.fromEntries([
        ['board-temporal', 'assets/storyboards/temporal/v001.png', 'storyboard'],
        ['board-shot', 'assets/storyboards/shot/v001.png', 'storyboard'],
        ['other-previz-ep001-001', 'assets/videos/previz/v001.mp4', 'other'],
        ['audio-reference', 'assets/audio/reference/v001.wav', 'audio'],
        ['first-frame', 'assets/other/first-frame/v001.png', 'other'],
      ].map(([key, localPath, type]) => [key, { key, type, selectedVersionId: 'v001', staleVersionIds: [], versions: [{ id: 'v001', localPath }] }]))
    }
    await writeFile(resolve(root, '.short-drama/assets.json'), `${JSON.stringify(assets)}\n`)
    const prompt = `subject_definitions:\nA room.\nsummary:\nAn empty room changes.\nretention_analysis:\nPreserve the room.\ndetailed_description:\n${ANTI_GRID_CLAIM_EN}\n${NO_GENERATED_TEXT_CLAIM_EN}\nThe chair turns.\n${ANTI_GRID_CLAIM_EN}\noverall_soundscape:\nRoom tone.\nnon_diegetic_music:\nN/A`
    const references = [
      { type: 'video', order: 1, asset_key: 'other-previz-ep001-001', version_id: 'v001', role: 'reference_video' },
      { type: 'image', order: 1, asset_key: 'first-frame', version_id: 'v001', role: 'first_frame', person_reference: false },
      { type: 'image', order: 2, asset_key: 'board-temporal', version_id: 'v001', role: 'temporal_storyboard', person_reference: false },
      { type: 'image', order: 3, asset_key: 'board-shot', version_id: 'v001', role: 'shot_board', person_reference: false },
      { type: 'audio', order: 1, asset_key: 'audio-reference', version_id: 'v001', role: 'audio_reference' },
    ]
    const document = { episode_key: 'ep-001', source_versions: {}, unresolved: [], approved: true, shots: [{ shot_number: 1, production_plan_version: 'v001', storyboard_version: 'v001', provider: 'runninghub', model_or_workflow: 'minimax-h3-reference-to-video', prompt_profile: 'h3', input_mode: 'Ref2VA', prompt, duration: 5, references, continuity: {}, audio_policy: {}, errors: [] }] }
    const production = { approved: true, unresolved: [], shots: [{ shot_number: 1, provider: 'runninghub', model_or_workflow: 'minimax-h3-reference-to-video', prompt_profile: 'h3', input_mode: 'Ref2VA', duration_seconds: 5, reference_assets: [], video_strategy: {}, previz_strategy: { mode: 'blender', purpose: 'motion-reference', fps: 12 }, audio_strategy: { mode: 'generated' }, review_checks: ['画面'] }] }
    await writeFile(resolve(root, 'episodes/ep-001/production-plan/v001.json'), `${JSON.stringify(production)}\n`)
    await writeFile(resolve(root, 'episodes/ep-001/production-plan/selected.json'), `${JSON.stringify({ versionId: 'v001', path: 'episodes/ep-001/production-plan/v001.json' })}\n`)
    await writeFile(resolve(root, 'episodes/ep-001/video-prompts/v001.json'), `${JSON.stringify(document)}\n`)
    await writeFile(resolve(root, 'episodes/ep-001/video-prompts/selected.json'), `${JSON.stringify({ versionId: 'v001', path: 'episodes/ep-001/video-prompts/v001.json' })}\n`)

    const result = spawnSync(process.execPath, [script, 'compile', '--project-root', root, '--episode', 'ep-001'], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    const output = JSON.parse(result.stdout)
    const source = await readFile(resolve(root, output.author_source), 'utf8')
    const runPath = resolve(root, output.run_source)
    const run = await readFile(runPath, 'utf8')
    assert.match(source, /<h3:ReferenceVideo id="shot-001"/)
    assert.match(source, /first-frame=\{ref-s001-r002\}/)
    assert.doesNotMatch(source, /<h3:Reference image=\{ref-s001-r002\}/)
    assert.match(source, /<h3:Reference video=\{ref-s001-r001\}/)
    assert.doesNotMatch(source, /character_identity/)
    assert.match(run, /<target output="shot-001.video"\/>/)
    const promptPath = resolve(root, 'episodes/ep-001/video-prompts/v001.json')
    const runtimePath = resolve(root, 'runtime.json')
    await writeFile(runtimePath, '{}\n')
    const sha256 = (value) => createHash('sha256').update(value).digest('hex')
    const pending = { schema_version: 2, phase: 'accepted', episode_key: 'ep-001', version_id: 'v001', build_id: 'build-test-001', submission_title: 'short-drama-test', created_at: new Date().toISOString(), prompt_document: { path: 'episodes/ep-001/video-prompts/v001.json', sha256: sha256(await readFile(promptPath)) }, run_source: { path: output.run_source, sha256: sha256(run) }, runtime_profile: { path: 'runtime.json', sha256: sha256(await readFile(runtimePath)) } }
    assert.equal((await validatePendingBuild(root, 'ep-001', pending, runtimePath)).build_id, pending.build_id)
    await writeFile(runtimePath, '{"changed":true}\n')
    await assert.rejects(validatePendingBuild(root, 'ep-001', pending, runtimePath), /Runtime Profile 已变化/)
    await writeFile(runtimePath, '{}\n')
    await writeFile(runPath, `${run}\n<!-- changed -->\n`)
    await assert.rejects(validatePendingBuild(root, 'ep-001', pending), /Run已变化/)
    await writeFile(runPath, run)
    const checked = spawnSync('hypit', ['check', resolve(root, output.run_source), '--workspace', root], { encoding: 'utf8' })
    assert.equal(checked.status, 0, checked.stderr || checked.stdout)
    const candidates = await registerBuildOutputs(root, 'ep-001', 'v001', 'build-test-001', async (_name, destination) => { await writeFile(destination, 'video') })
    assert.equal(candidates.length, 1)
    assert.equal(candidates[0].selected, false)
    const registered = JSON.parse(await readFile(resolve(root, '.short-drama/assets.json'), 'utf8')).assets['shot-ep001-001']
    assert.equal(registered.selectedVersionId, undefined)
    assert.equal(registered.versions[0].provenance.task_id, 'build-test-001')
    assert.equal(registered.versions[0].provenance.parameters.hypit_output, 'shot-001.video')
    const awaitingReview = spawnSync(process.execPath, [script, 'compile', '--project-root', root, '--episode', 'ep-001'], { encoding: 'utf8' })
    assert.equal(awaitingReview.status, 0, awaitingReview.stderr)
    const awaitingReviewPlan = JSON.parse(awaitingReview.stdout)
    assert.equal(awaitingReviewPlan.target_count, 0)
    assert.equal(awaitingReviewPlan.generation_groups[0].status, 'waiting-review')
    const selectedLedger = JSON.parse(await readFile(resolve(root, '.short-drama/assets.json'), 'utf8'))
    selectedLedger.assets['shot-ep001-001'].selectedVersionId = 'v001'
    await writeFile(resolve(root, '.short-drama/assets.json'), `${JSON.stringify(selectedLedger)}\n`)
    await writeFile(resolve(root, '.short-drama/shot-reviews.json'), `${JSON.stringify({ version: 1, reviews: { 'shot-ep001-001@v001': {
      approved: true,
      asset_sha256: registered.versions[0].sha256,
      watchedFull: true,
      watch_evidence: { method: 'agent-video-tool', duration_seconds: 5, start: { time_seconds: 0, observation: '0秒主体进入画面且清晰可辨' }, middle: { time_seconds: 2.5, observation: '2.5秒主体动作保持连续稳定' }, end: { time_seconds: 5, observation: '5秒尾帧状态清晰且可剪辑' } },
      criteria: [{ criterion: '画面', status: 'passed', observation: '第60帧主体与动作符合制作计划' }],
    } } })}\n`)
    const reusedCompile = spawnSync(process.execPath, [script, 'compile', '--project-root', root, '--episode', 'ep-001'], { encoding: 'utf8' })
    assert.equal(reusedCompile.status, 0, reusedCompile.stderr)
    assert.equal(JSON.parse(reusedCompile.stdout).target_count, 0)
    assert.doesNotMatch(await readFile(resolve(root, '.short-drama/hypit/ep-001/v001.svrun'), 'utf8'), /<target /)
    const mismatchedLedger = JSON.parse(await readFile(resolve(root, '.short-drama/assets.json'), 'utf8'))
    mismatchedLedger.assets['board-temporal'].versions.push({ id: 'v002', localPath: 'assets/storyboards/temporal/v001.png' })
    mismatchedLedger.assets['board-temporal'].selectedVersionId = 'v002'
    await writeFile(resolve(root, '.short-drama/assets.json'), `${JSON.stringify(mismatchedLedger)}\n`)
    const staleReference = spawnSync(process.execPath, [script, 'compile', '--project-root', root, '--episode', 'ep-001'], { encoding: 'utf8' })
    assert.notEqual(staleReference.status, 0)
    assert.match(staleReference.stderr, /参考素材不是当前 selected/)
    mismatchedLedger.assets['board-temporal'].selectedVersionId = 'v001'
    await writeFile(resolve(root, '.short-drama/assets.json'), `${JSON.stringify(mismatchedLedger)}\n`)
    const resumed = await registerBuildOutputs(root, 'ep-001', 'v001', 'build-test-001', async () => { throw new Error('不得重复导出已登记 Output') })
    assert.equal(resumed[0].reused, true)
    assert.equal(JSON.parse(await readFile(resolve(root, '.short-drama/assets.json'), 'utf8')).assets['shot-ep001-001'].versions.length, 1)
    let exportedUnavailable = false
    const partial = await registerBuildOutputs(root, 'ep-001', 'v001', 'build-test-partial', async () => { exportedUnavailable = true }, [])
    assert.deepEqual(partial, [])
    assert.equal(exportedUnavailable, false)
    await writeFile(resolve(root, 'episodes/ep-001/video-prompts/v002.json'), `${JSON.stringify(document)}\n`)
    await writeFile(resolve(root, 'episodes/ep-001/video-prompts/selected.json'), `${JSON.stringify({ versionId: 'v002', path: 'episodes/ep-001/video-prompts/v002.json' })}\n`)
    const recovered = await registerBuildOutputs(root, 'ep-001', 'v001', 'build-test-old-version', async (_name, destination) => { await writeFile(destination, 'old-version-video') }, ['shot-001.video'])
    assert.equal(recovered.length, 1)
    assert.equal(JSON.parse(await readFile(resolve(root, '.short-drama/assets.json'), 'utf8')).assets['shot-ep001-001'].versions.at(-1).provenance.prompt_document.version_id, 'v001')
    await writeFile(resolve(root, 'episodes/ep-001/video-prompts/selected.json'), `${JSON.stringify({ versionId: 'v001', path: 'episodes/ep-001/video-prompts/v001.json' })}\n`)
    await writeFile(resolve(root, 'episodes/ep-001/video-prompts/v001.json'), `${JSON.stringify({ ...document, shots: [{ ...document.shots[0], references: [...references, { type: 'image', order: 3, asset_key: 'char-a', version_id: 'v001', role: 'character_identity' }] }] })}\n`)
    const invalidIdentity = spawnSync(process.execPath, [script, 'compile', '--project-root', root, '--episode', 'ep-001'], { encoding: 'utf8' })
    assert.notEqual(invalidIdentity.status, 0)
    assert.match(invalidIdentity.stderr, /引用不一致/)
    await writeFile(resolve(root, 'episodes/ep-001/video-prompts/v001.json'), `${JSON.stringify(document)}\n`)
    const gated = spawnSync(process.execPath, [script, 'check', '--project-root', root, '--episode', 'ep-001'], { encoding: 'utf8' })
    assert.notEqual(gated.status, 0)
    assert.match(gated.stderr, /只能在 media-production 阶段/)
    const outside = `${root}-outside.json`
    await writeFile(outside, `${JSON.stringify(document)}\n`)
    await writeFile(resolve(root, 'episodes/ep-001/video-prompts/selected.json'), `${JSON.stringify({ versionId: 'v001', path: outside })}\n`)
    const escaped = spawnSync(process.execPath, [script, 'compile', '--project-root', root, '--episode', 'ep-001'], { encoding: 'utf8' })
    assert.notEqual(escaped.status, 0)
    assert.match(escaped.stderr, /路径逃逸项目目录/)
    await rm(outside, { force: true })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('复刻镜头复用已生成并审核选中的深度视频，不在最终 Build 重复付费生成', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'hypit-short-drama-depth-runtime-'))
  try {
    for (const path of ['episodes/ep-001/video-prompts', 'episodes/ep-001/production-plan', 'assets/storyboards/temporal', 'assets/storyboards/shot', 'assets/videos/source', 'assets/videos/depth', 'assets/audio/reference', 'assets/other/first-frame']) await mkdir(resolve(root, path), { recursive: true })
    for (const path of ['assets/storyboards/temporal/v001.png', 'assets/storyboards/shot/v001.png', 'assets/videos/source/v001.mp4', 'assets/videos/depth/v001.mp4', 'assets/audio/reference/v001.wav', 'assets/other/first-frame/v001.png']) await writeFile(resolve(root, path), 'fixture')
    await initProject(root, 'viral-recreation', { provider: 'starrouter', model_or_workflow: 'dreamina-seedance-2-0-260128', prompt_profile: 'seedance2', parameters: { resolution: '720p', ratio: '9:16', generate_audio: true } })
    const entries = [
      ['board-temporal', 'assets/storyboards/temporal/v001.png', 'storyboard'], ['board-shot', 'assets/storyboards/shot/v001.png', 'storyboard'],
      ['source-shot', 'assets/videos/source/v001.mp4', 'video'], ['audio-reference', 'assets/audio/reference/v001.wav', 'audio'],
      ['first-frame', 'assets/other/first-frame/v001.png', 'other'],
    ]
    const assets = Object.fromEntries(entries.map(([key, localPath, type]) => [key, { key, type, selectedVersionId: 'v001', staleVersionIds: [], versions: [{ id: 'v001', localPath, ...(type === 'storyboard' ? {} : { duration_seconds: 5 }) }] }]))
    assets['shot-ep001-depth-001'] = { key: 'shot-ep001-depth-001', type: 'video', selectedVersionId: 'v001', staleVersionIds: [], versions: [{ id: 'v001', localPath: 'assets/videos/depth/v001.mp4', duration_seconds: 5, provenance: { origin: 'generated', created_by: 'provider', provider: 'runninghub', model_or_workflow: '2098674379113979905', source_assets: [{ key: 'source-shot', version_id: 'v001' }] } }] }
    await writeFile(resolve(root, '.short-drama/assets.json'), `${JSON.stringify({ assets })}\n`)
    const production = { approved: true, unresolved: [], shots: [{ shot_number: 1, provider: 'starrouter', model_or_workflow: 'dreamina-seedance-2-0-260128', prompt_profile: 'seedance2', input_mode: 'full-reference', duration_seconds: 5, reference_assets: [], video_strategy: { depth_reference: { mode: 'generate', provider: 'runninghub', workflow_id: '2098674379113979905', source_asset_key: 'source-shot', source_version_id: 'v001', expected_output_asset_key: 'shot-ep001-depth-001' } } }] }
    await writeFile(resolve(root, 'episodes/ep-001/production-plan/v001.json'), `${JSON.stringify(production)}\n`)
    await writeFile(resolve(root, 'episodes/ep-001/production-plan/selected.json'), `${JSON.stringify({ versionId: 'v001', path: 'episodes/ep-001/production-plan/v001.json' })}\n`)
    const prompt = `${ANTI_GRID_CLAIM_EN}\n${NO_GENERATED_TEXT_CLAIM_EN}\n[0–5s] @图片1 and @图片2 control the reviewed boards; @视频1 controls depth and motion; @音频1 controls performance.\n${ANTI_GRID_CLAIM_EN}`
    const references = [
      { type: 'video', order: 1, asset_key: 'shot-ep001-depth-001', version_id: 'v001', role: 'depth_reference', person_reference: true },
      { type: 'image', order: 1, asset_key: 'first-frame', version_id: 'v001', role: 'first_frame', person_reference: false },
      { type: 'image', order: 2, asset_key: 'board-temporal', version_id: 'v001', role: 'temporal_storyboard', person_reference: true },
      { type: 'image', order: 3, asset_key: 'board-shot', version_id: 'v001', role: 'shot_board', person_reference: true },
      { type: 'audio', order: 1, asset_key: 'audio-reference', version_id: 'v001', role: 'audio_reference' },
    ]
    const document = { episode_key: 'ep-001', source_versions: { production_plan: 'v001' }, unresolved: [], approved: true, shots: [{ shot_number: 1, production_plan_version: 'v001', storyboard_version: 'v001', provider: 'starrouter', model_or_workflow: 'dreamina-seedance-2-0-260128', prompt_profile: 'seedance2', input_mode: 'full-reference', prompt, duration: 5, references, continuity: {}, audio_policy: {}, errors: [] }] }
    await writeFile(resolve(root, 'episodes/ep-001/video-prompts/v001.json'), `${JSON.stringify(document)}\n`)
    await writeFile(resolve(root, 'episodes/ep-001/video-prompts/selected.json'), `${JSON.stringify({ versionId: 'v001', path: 'episodes/ep-001/video-prompts/v001.json' })}\n`)
    const result = spawnSync(process.execPath, [script, 'compile', '--project-root', root, '--episode', 'ep-001'], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    const output = JSON.parse(result.stdout)
    const source = await readFile(resolve(root, output.author_source), 'utf8')
    assert.doesNotMatch(source, /@hypit\/depth-video|<depth:Video/)
    assert.match(source, /<seedance:Reference video=\{ref-s001-r001\} person-reference="true" duration-seconds="5"\/>/)
    assert.match(source, /first-frame=\{ref-s001-r002\} first-frame-person-reference="false"/)
    assert.doesNotMatch(source, /<seedance:Reference image=\{ref-s001-r002\}/)
    const checked = spawnSync('hypit', ['check', resolve(root, output.run_source), '--workspace', root], { encoding: 'utf8' })
    assert.equal(checked.status, 0, checked.stderr || checked.stdout)
    const missingClassification = structuredClone(document)
    delete missingClassification.shots[0].references[0].person_reference
    await writeFile(resolve(root, 'episodes/ep-001/video-prompts/v001.json'), `${JSON.stringify(missingClassification)}\n`)
    const invalid = spawnSync(process.execPath, [script, 'compile', '--project-root', root, '--episode', 'ep-001'], { encoding: 'utf8' })
    assert.notEqual(invalid.status, 0)
    assert.match(invalid.stderr, /必须声明 person_reference/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('Runtime Profile 必须把模型能力显式绑定到制作计划选定的厂商', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'hypit-short-drama-profile-'))
  try {
    const path = resolve(root, 'runtime.json')
    const document = { shots: [{ shot_number: 1, prompt_profile: 'seedance2', provider: 'starrouter' }] }
    await writeFile(path, `${JSON.stringify({ endpoints: { video: { use: '@hypit/provider-starrouter' } }, bindings: { '@hypit/seedance@1#seedance-2': 'video' } })}\n`)
    assert.equal(await validateRuntimeProfile(path, document), true)
    await writeFile(path, `${JSON.stringify({ endpoints: { video: { use: '@hypit/provider-runninghub' } }, bindings: { '@hypit/seedance@1#seedance-2': 'video' } })}\n`)
    await assert.rejects(validateRuntimeProfile(path, document), /显式绑定到 starrouter/)
  } finally { await rm(root, { recursive: true, force: true }) }
})
