import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import test from 'node:test'

process.env.RUNNINGHUB_API_KEY = 'test-runninghub-key'
const { runninghub } = await import('./runninghub.mjs')

test('逐镜深度视频固定工作流并替换视频输入', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'depth-video-adapter-'))
  const source = resolve(root, 'shot.mp4')
  await writeFile(source, 'video-fixture')
  const originalFetch = globalThis.fetch
  let submitted
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith('/openapi/v2/media/upload/binary')) return new Response(JSON.stringify({ code: 0, data: { filename: 'uploaded-shot.mp4' } }), { status: 200 })
    submitted = JSON.parse(options.body)
    return new Response(JSON.stringify({ code: 0, data: { taskId: 'depth-task-1' } }), { status: 200 })
  }
  try {
    const result = await runninghub.submitVideo({ model: 'depth-video', workflow_id: '2098674379113979905', confirmed: true, reference_paths: [source], reference_manifest: [{ type: 'video', order: 1, asset_key: 'shot-ep001-source-001', version_id: 'v001', role: 'source_video' }] })
    const workflow = JSON.parse(submitted.workflow)
    assert.equal(submitted.workflowId, '2098674379113979905')
    assert.equal(workflow['21'].inputs.video, 'uploaded-shot.mp4')
    assert.equal(workflow['33'].inputs.value0[0], '2')
    assert.equal(result.task_id, 'depth-task-1')
  } finally {
    globalThis.fetch = originalFetch
    await rm(root, { recursive: true, force: true })
  }
})

test('RunningHub H3 Ref2VA 保留深度、分镜板和音频语义角色', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'runninghub-h3-references-'))
  const paths = await Promise.all(['identity.png', 'depth.mp4', 'dialogue.wav'].map(async (name) => { const path = resolve(root, name); await writeFile(path, name); return path }))
  const originalFetch = globalThis.fetch
  let submitted
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith('/openapi/v2/media/upload/binary')) {
      const file = options.body.get('file')
      return new Response(JSON.stringify({ code: 0, data: { filename: `uploaded-${file.name}` } }), { status: 200 })
    }
    submitted = JSON.parse(options.body)
    return new Response(JSON.stringify({ code: 0, data: { taskId: 'h3-task-1' } }), { status: 200 })
  }
  try {
    await runninghub.submitVideo({
      model: 'minimax-h3-reference-to-video', confirmed: true, prompt_profile: 'h3', input_mode: 'Ref2VA', duration: 5, ratio: '16:9', resolution: '1K',
      prompt: 'subject_definitions: A\nsummary: A\nretention_analysis: A\ndetailed_description: A\noverall_soundscape: A\nnon_diegetic_music: N/A',
      reference_image_paths: [paths[0]], reference_video_paths: [paths[1]], reference_audio_paths: [paths[2]],
      reference_manifest: [
        { type: 'image', order: 1, asset_key: 'char-a', version_id: 'v001', role: 'character_identity' },
        { type: 'video', order: 1, asset_key: 'shot-ep001-depth-001', version_id: 'v001', role: 'depth_reference' },
        { type: 'audio', order: 1, asset_key: 'audio-ep001-reference-001', version_id: 'v001', role: 'audio_reference' },
      ],
    })
    const workflow = JSON.parse(submitted.workflow)
    assert.equal(workflow['100'].inputs.image, 'uploaded-identity.png')
    assert.equal(workflow['120'].inputs.video, 'uploaded-depth.mp4')
    assert.equal(workflow['140'].inputs.audio, 'uploaded-dialogue.wav')
  } finally {
    globalThis.fetch = originalFetch
    await rm(root, { recursive: true, force: true })
  }
})
