import { validateArtStyleFidelity } from './art-style-review.mjs'

const DIMENSIONS = ['structure_identity', 'sheet_consistency', 'unsupported_content']

function dimension(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(['observation', 'status'])) throw new Error(`视觉资产审核 ${label} 字段无效`)
  if (!['passed', 'failed'].includes(value.status) || typeof value.observation !== 'string' || value.observation.trim().length < 8) throw new Error(`视觉资产审核 ${label} 必须包含状态与实际可见证据`)
}

export function validateVisualAssetReview(assetType, review, artStyle) {
  if (!['scene', 'prop'].includes(assetType)) throw new Error('通用视觉资产审核只适用于场景或道具')
  if (!review || typeof review !== 'object' || Array.isArray(review)) throw new Error('视觉资产审核必须是对象')
  for (const field of DIMENSIONS) dimension(review[field], field)
  validateArtStyleFidelity(artStyle, review.art_style_fidelity)
  if (review.inspected_full !== true) throw new Error('视觉资产必须检查完整设定板及必要的局部预览')
  if (typeof review.approved !== 'boolean') throw new Error('视觉资产审核 approved 必须是布尔值')
  const failed = [...DIMENSIONS, 'art_style_fidelity'].filter((field) => review[field].status === 'failed')
  if (review.approved && failed.length) throw new Error(`视觉资产审核 ${failed.join('、')} 未通过，不得批准`)
  return review.approved && failed.length === 0
}
