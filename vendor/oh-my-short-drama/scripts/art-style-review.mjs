import { createHash } from 'node:crypto'

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
}

export function artStyleSha256(style) {
  if (!style || typeof style !== 'object' || Array.isArray(style) || typeof style.id !== 'string' || !style.id.trim()) throw new Error('项目缺少可审核的当前画风')
  return createHash('sha256').update(JSON.stringify(canonical(style))).digest('hex')
}

export function compileArtStylePrompt(style, locale = 'zh') {
  artStyleSha256(style)
  const bible = style.visualBible || {}
  const rendering = style.renderingContract || {}
  const value = {
    style_id: style.id,
    style_name: style.name,
    medium_and_rendering: {
      medium: rendering.medium || style.prompt,
      rendering_method: rendering.rendering_method || style.prompt,
      surface_language: rendering.surface_language || style.description,
      image_formation: rendering.image_formation || style.prompt,
    },
    palette_and_tone: { palette: bible.palette || {}, baseline: bible.baseline || {} },
    lighting: bible.lighting || {},
    forbidden_medium_substitutions: rendering.forbidden_substitutions || [],
    negative_constraints: bible.negative_constraints || [],
  }
  const heading = locale === 'en' ? '[SELECTED ART STYLE CONTRACT — SOURCE OF TRUTH]' : '【已选画风合同——唯一风格事实源】'
  const rule = locale === 'en'
    ? 'Preserve this exact medium and rendering system. Layout words such as sheet, grid, storyboard, cinematic, or reference must never replace it with concept art, photography, 2D painting, or 3D rendering unless that medium is explicitly selected here.'
    : '必须保持这里明确选定的媒介与渲染体系。设定板、宫格、故事板、电影感、参考图等版式或质量词不得把它替换成概念原画、真人摄影、二维厚涂或三维渲染；只有合同明确选择的媒介才可使用。'
  return `${heading}\n${JSON.stringify(value, null, 2)}\n${rule}`
}

export function validateArtStyleFidelity(style, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('视觉审核缺少 art_style_fidelity')
  const expected = ['status', 'art_style_id', 'observation']
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(expected.sort())) throw new Error('视觉审核 art_style_fidelity 字段无效')
  if (!['passed', 'failed'].includes(value.status)) throw new Error('视觉审核 art_style_fidelity.status 无效')
  if (value.art_style_id !== style.id) throw new Error('视觉审核绑定的画风不是项目当前选定画风')
  if (typeof value.observation !== 'string' || value.observation.trim().length < 12) throw new Error('视觉审核 art_style_fidelity 必须记录画面中实际可见的媒介、渲染、材质、色彩或光线证据')
  return value
}
