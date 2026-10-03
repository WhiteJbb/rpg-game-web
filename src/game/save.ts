import { MONSTERS } from './data/monsters'
import { REGIONS } from './data/regions'
import { maxHp, maxMp } from './rules'
import type { GameState } from './types'

export const SAVE_KEY = 'planet-earth-save'
const VERSION = 1

export const serialize = (s: GameState): string => JSON.stringify({ ...s, events: [] })

const isNum = (x: unknown) => typeof x === 'number' && Number.isFinite(x)

/** 깨졌거나 버전이 다른 세이브는 null (새 게임으로 시작) */
export function deserialize(raw: string | null): GameState | null {
  if (!raw) return null
  try {
    const s = JSON.parse(raw) as GameState
    const p = s?.player
    if (s.version !== VERSION || typeof p?.name !== 'string') return null
    if (![p.level, p.exp, p.hp, p.mp, p.gold, p.points, ...Object.values(p.stats), ...Object.values(p.potions)].every(isNum)) return null
    if (!Array.isArray(p.spells) || !Array.isArray(p.owned)) return null
    if (!REGIONS.every((r) => isNum(s.progress?.[r.id]?.kills))) return null
    // 진행 중이던 전투가 알 수 없는 상태면 전투만 버린다
    const b = s.battle
    const battle = b && MONSTERS.some((m) => m.id === b.monsterId) && REGIONS.some((r) => r.id === b.regionId) && isNum(b.monsterHp) ? b : null
    p.hp = Math.max(1, Math.min(p.hp, maxHp(p)))
    p.mp = Math.max(0, Math.min(p.mp, maxMp(p)))
    return { ...s, battle, events: [], cleared: Boolean(s.cleared) }
  } catch {
    return null
  }
}
