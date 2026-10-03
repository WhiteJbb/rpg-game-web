import type { GameState } from './types'

export const SAVE_KEY = 'planet-earth-save'
const VERSION = 1

export const serialize = (s: GameState): string => JSON.stringify({ ...s, events: [] })

/** 깨졌거나 버전이 다른 세이브는 null (새 게임으로 시작) */
export function deserialize(raw: string | null): GameState | null {
  if (!raw) return null
  try {
    const s = JSON.parse(raw) as GameState
    if (s?.version !== VERSION || typeof s.player?.name !== 'string' || typeof s.progress !== 'object') return null
    return { ...s, events: [] }
  } catch {
    return null
  }
}
