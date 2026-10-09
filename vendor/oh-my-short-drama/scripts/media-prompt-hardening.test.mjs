import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'
import { validateShotGenerationContract } from './reference-bindings.mjs'
import { render } from './render-prompt.mjs'

const prompts = resolve(import.meta.dirname, '../skills/short-drama/assets/modules')
const read = (path) => readFile(resolve(prompts, path), 'utf8')
const readFixture = async (name) => JSON.parse(await readFile(resolve(import.meta.dirname, 'fixtures', name), 'utf8'))

test('双分镜提示词锁定空间账本并禁止把导演标注污染成剧情特效', async () => {
  for (const name of ['panel_grid_image.zh.txt', 'panel_storyboard_image.zh.txt']) {
    const prompt = await read(`generate-storyboard-images/prompts/${name}`)
    for (const token of ['空间账本', '画面左/中/右', '从左到右顺序', '发射源', '门形光效']) assert.match(prompt, new RegExp(token.replaceAll('/', '\\/')))
  }
  const shotBoard = await read('generate-storyboard-images/prompts/panel_storyboard_image.zh.txt')
  assert.match(shotBoard, /禁止彩色箭头、圈线、路径线、色块、导演批注/)
  assert.match(shotBoard, /禁止把它绑定为 video-prompts 的 shot_board/)
})

test('视频提示词把环境底、同步动作、画外音和旁白编译为可执行声场', async () => {
  for (const name of ['h3_video.zh.txt', 'seedance2_video.zh.txt']) {
    const prompt = await read(`write-drama-video-prompts/prompts/${name}`)
    for (const token of ['空间反射', '动作声', '画外', '旁白', '未声明 BGM']) assert.match(prompt, new RegExp(token))
    assert.match(prompt, /嘴唇|闭嘴/)
  }
  for (const name of ['h3_video.zh.txt', 'seedance2_video.zh.txt', 'panel_grid_video.zh.txt', 'panel_storyboard_video.zh.txt']) {
    const prompt = await read(`write-drama-video-prompts/prompts/${name}`)
    assert.match(prompt, /evidence_event_key/)
    assert.match(prompt, /visible_event_keys/)
  }
})

test('制作计划和分镜模板声明完整可见人物与声音事件证据合同', async () => {
  for (const name of ['production_plan.zh.txt', 'production_plan.en.txt']) {
    const prompt = await read(`plan-drama-production/prompts/${name}`)
    assert.match(prompt, /visible_character_keys/)
    assert.match(prompt, /visible_event_keys/)
    assert.match(prompt, /evidence_event_key/)
  }
  for (const name of ['agent_storyboard_detail.zh.txt', 'agent_storyboard_detail.en.txt']) {
    const prompt = await read(`build-drama-storyboard/prompts/${name}`)
    assert.match(prompt, /visible_event_keys/)
    assert.match(prompt, /char-\*/)
  }
})

test('制作规划只在静态双板无法证明复杂调度时启用白模', async () => {
  const prompt = await read('plan-drama-production/prompts/production_plan.zh.txt')
  assert.match(prompt, /前置选择门/)
  assert.match(prompt, /selection_basis/)
  assert.match(prompt, /不得因为默认值或模型习惯直接把所有镜头标成 shot-board/)
  assert.match(prompt, /required_board_types/)
  assert.match(prompt, /standard 默认写 `storyboard_strategy\.mode=image`/)
  assert.match(prompt, /复杂路线、多人交互、精确接触、轴线风险或连续运镜/)
  assert.match(prompt, /可选白模/)
})

test('画风在前期被编译为媒介合同且分镜不再硬编码真人', async () => {
  const style = {
    id: 'test-2d', name: '二维测试', description: '二维赛璐璐动画', prompt: 'clean 2D cel animation',
    renderingContract: { medium: '2d-animation', rendering_method: 'clean cel shading', surface_language: 'drawn line and flat color', image_formation: 'line art and 2D compositing', forbidden_substitutions: ['live-action photography', '3D render'] },
    visualBible: { version: 1, palette: {}, baseline: {}, lighting: {}, narrative_arc: [], motion_language: {}, negative_constraints: [] },
  }
  const compiled = render('风格：{style}', { style })
  assert.match(compiled, /已选画风合同/)
  assert.match(compiled, /"medium": "2d-animation"/)
  assert.match(compiled, /live-action photography/)
  const board = await read('generate-storyboard-images/prompts/panel_storyboard_image.zh.txt')
  assert.doesNotMatch(board, /真人风格必须/)
  assert.match(board, /不得把“故事板工作稿”自动理解成.*真人写实/)
  for (const name of ['character_asset_sheet.zh.txt', 'scene_asset_sheet.zh.txt', 'prop_generate.zh.txt']) {
    const module = name.startsWith('character') ? 'generate-character-images' : name.startsWith('scene') ? 'generate-scene-assets' : 'generate-prop-assets'
    const prompt = await read(`${module}/prompts/${name}`)
    assert.match(prompt, /项目画风与模板示例冲突时，以项目画风为准/)
  }
})

test('所有视频提示词合同都把自然运动拆成异步表演、物理链和次级运动', async () => {
  const names = [
    'h3_video.zh.txt',
    'h3_video.en.txt',
    'seedance2_video.zh.txt',
    'seedance2_video.en.txt',
    'panel_grid_video.zh.txt',
    'panel_grid_video.en.txt',
    'panel_storyboard_video.zh.txt',
    'panel_storyboard_video.en.txt',
  ]
  for (const name of names) {
    const prompt = await read(`write-drama-video-prompts/prompts/${name}`)
    const chinese = name.endsWith('.zh.txt')
    for (const pattern of chinese
      ? [/主要动作/, /注意对象/, /反应延迟/, /不同步/, /眨眼/, /重心/, /头发/, /衰减/, /固定(?:机位|镜头)|locked-off/i]
      : [/primary action/i, /attention target/i, /reaction latency/i, /unsynchronized/i, /blinks/i, /center-of-mass/i, /hair/i, /damped/i, /locked-off/i]) {
      assert.match(prompt, pattern, `${name} 缺少 ${pattern}`)
    }
  }
})

test('自然表演、眼神心理戏和次级运动从分镜前期开始规划', async () => {
  for (const name of ['agent_storyboard_plan.zh.txt', 'agent_acting_direction.zh.txt', 'agent_storyboard_detail.zh.txt']) {
    const prompt = await read(`build-drama-storyboard/prompts/${name}`)
    for (const pattern of [/performance_bible|performance_constraints|表演主档案|角色完整描述/, /注意对象/, /反应触发/, /反应延迟/, /眨眼/, /头发|衣摆/, /眼神|注视对象/, /微表情|起势—峰值—释放/]) assert.match(prompt, pattern, `${name} 缺少前期约束 ${pattern}`)
  }
  for (const name of ['agent_storyboard_plan.en.txt', 'agent_acting_direction.en.txt', 'agent_storyboard_detail.en.txt']) {
    const prompt = await read(`build-drama-storyboard/prompts/${name}`)
    for (const pattern of [/performance_bible|performance_constraints|performance bible|character descriptions/i, /attention target/i, /reaction trigger/i, /reaction latency/i, /blink/i, /hair|hems/i, /gaze target|gaze shift/i, /micro-expression|onset—apex—release/i]) assert.match(prompt, pattern, `${name} missing preproduction constraint ${pattern}`)
  }
})

test('分镜与视频提示词把眼神、心理节拍、微表情和人物档案约束编译为可见行为', async () => {
  const videoNames = [
    'h3_video.zh.txt', 'h3_video.en.txt', 'seedance2_video.zh.txt', 'seedance2_video.en.txt',
    'panel_grid_video.zh.txt', 'panel_grid_video.en.txt', 'panel_storyboard_video.zh.txt', 'panel_storyboard_video.en.txt',
  ]
  for (const name of videoNames) {
    const prompt = await read(`write-drama-video-prompts/prompts/${name}`)
    const profilePatterns = /^(h3|seedance2)_/.test(name)
      ? [/eyeline_behavior/, /stress_response/, /forbidden_performance/]
      : [/forbidden_performance/]
    for (const pattern of [/performance_constraints/, ...profilePatterns, /gaze|眼神/i, /mask|面具/i, /onset|起势/i, /apex|峰值/i, /release|释放/i]) {
      assert.match(prompt, pattern, `${name} 缺少 ${pattern}`)
    }
  }
  for (const name of ['panel_grid_image.zh.txt', 'panel_grid_image.en.txt', 'panel_storyboard_image.zh.txt', 'panel_storyboard_image.en.txt']) {
    const prompt = await read(`generate-storyboard-images/prompts/${name}`)
    assert.match(prompt, /performance_constraints/)
    assert.match(prompt, /gaze|眼神/i)
    assert.match(prompt, /listener|听者/i)
  }
})

test('历史高难群像镜头改写锁定四坐两空、异步表演和有证据声音', async () => {
  const fixture = await readFixture('historical-shot-010-h3-rewrite.json')
  assert.equal(fixture.test_mode, 'offline-contract-only')
  assert.equal(fixture.derived_plan_patch.storyboard_strategy.mode, 'image')
  assert.equal(fixture.derived_plan_patch.previz_strategy, null)
  assert.equal(fixture.reference_plan.images.length, 9)
  assert.equal(fixture.reference_plan.videos.length, 0)
  assert.equal(fixture.hard_spatial_contract.seat_count, 6)
  assert.deepEqual(fixture.hard_spatial_contract.left_to_right, [
    '老子坐第一席', '元始坐第二席', '通天坐第三席', '女娲坐第四席', '第五席空置', '第六席空置',
  ])
  const prompt = fixture.prompt
  for (const token of [
    'exactly six separate cushions', 'cushion five is empty', 'cushion six is empty',
    'eyes move first', 'reacts later and independently', 'never turn, blink, nod or shift weight on the same beat',
    'low-amplitude peak and releases', 'no footsteps because nobody walks',
    'No visible mouth speaks', 'no energy hum', 'no undeclared music',
  ]) assert.ok(prompt.includes(token), `历史镜头改写缺少：${token}`)
  assert.match(prompt, /<d>\[zh-CN\] 看来上次他俩哭爹喊娘/)
  assert.match(prompt, /0\.00-9\.00: a continuous low stone-hall room tone/)
  const characterManifest = fixture.reference_plan.images.slice(0, 7).map((reference, index) => {
    const [asset_key, version_id] = reference.split('@')
    return { type: 'image', order: index + 1, asset_key, version_id, role: 'character_identity' }
  })
  assert.doesNotThrow(() => validateShotGenerationContract({
    planShot: fixture.derived_plan_patch,
    storyboardPanel: fixture.storyboard_contract,
    manifest: characterManifest,
    audioPolicy: fixture.audio_policy_contract,
  }))
})
