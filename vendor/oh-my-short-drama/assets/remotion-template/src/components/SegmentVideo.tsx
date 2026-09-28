import type React from 'react'
import { AbsoluteFill, Freeze, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import type { Segment } from '../load-timeline'
import { fadeInCurve, fadeOutCurve, msToFrame, segmentRate } from './transitions'

export const SegmentClip: React.FC<{
  seg: Segment
  fadeInFrames?: number
  fadeOutFrames?: number
  // 把源素材窗口向前平移若干“源帧”；转场覆盖层借此定位并冻结上一镜最后一帧。
  trimBeforeOffsetFrames?: number
  holdFrame?: boolean
  muteAudio?: boolean
}> = ({ seg, fadeInFrames = 0, fadeOutFrames = 0, trimBeforeOffsetFrames = 0, holdFrame = false, muteAudio = false }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const opacity = fadeOutFrames > 0 ? fadeOutCurve(frame, fadeOutFrames) : fadeInFrames > 0 ? fadeInCurve(frame, fadeInFrames) : 1
  const trimBefore = msToFrame(seg.source_in_ms, fps) + trimBeforeOffsetFrames
  const trimAfter = msToFrame(seg.source_out_ms, fps)
  const playbackRate = segmentRate(seg)
  const video = <OffthreadVideo src={staticFile(seg.file)} muted={muteAudio} trimBefore={trimBefore} trimAfter={trimAfter} playbackRate={playbackRate} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  return <AbsoluteFill style={{ opacity, backgroundColor: 'black' }}>{holdFrame ? <Freeze frame={0}>{video}</Freeze> : video}</AbsoluteFill>
}
