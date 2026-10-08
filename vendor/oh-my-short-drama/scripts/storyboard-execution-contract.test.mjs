import assert from 'node:assert/strict'
import test from 'node:test'

import { validateStoryboardExecutionContract } from './project-store.mjs'

test('分镜执行合同拒绝旧项目中的空泛站位与动作占位词', () => {
  assert.throws(() => validateStoryboardExecutionContract({
    characters: [{ name: '东王公', slot: '按画面描述的前中后景站位' }],
    motion_plan: { start_state: '按上一叙事节拍的稳定姿态进入', verb: '完成本镜主要动作与反应' },
  }), /画面左右、景深、朝向与视线目标/)
})

test('分镜执行合同接受可见且可核验的几何状态', () => {
  assert.doesNotThrow(() => validateStoryboardExecutionContract({
    characters: [{ name: '东王公', slot: '画面右侧中景，身体朝左，视线落在左侧空席，双脚停在台阶下' }],
    motion_plan: { start_state: '右脚落在台阶下，右肩朝向空席', verb: '向后退一步', end_state: '停在画面右缘，仍面向左侧空席' },
  }))
})
