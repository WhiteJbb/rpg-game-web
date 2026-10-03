import { MONSTERS } from './data/monsters'
import { QUESTS } from './data/quests'
import { REGIONS, regionById } from './data/regions'
import { newBattle } from './engine'
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
    if (typeof p.upgrades !== 'object' || p.upgrades === null) p.upgrades = {}
    p.accessory ??= null
    p.hp = Math.max(1, Math.min(p.hp, maxHp(p)))
    p.mp = Math.max(0, Math.min(p.mp, maxMp(p)))

    // 진행 중이던 전투가 알 수 없는 상태면 전투만 버린다. 나중에 추가된 필드는 기본값으로 채운다.
    const b = s.battle
    const valid = b && MONSTERS.some((m) => m.id === b.monsterId) && REGIONS.some((r) => r.id === b.regionId) && isNum(b.monsterHp)
    const cycle = isNum(s.cycle) && s.cycle > 0 ? Math.floor(s.cycle) : 0
    const battle = valid ? { ...newBattle(b.monsterId, b.regionId, cycle), ...b } : null

    // 퀘스트가 생기기 전의 세이브: 이미 잡은 보스는 토벌 완료로 인정한다
    const quests = Object.fromEntries(
      QUESTS.map((q) => {
        const saved = s.quests?.[q.id]
        const bossDone =
          q.goal.kind === 'boss' && q.regionId && q.goal.monsterId === regionById(q.regionId).boss && s.progress[q.regionId].bossDefeated ? 1 : 0
        return [q.id, { progress: Math.max(isNum(saved?.progress) ? saved.progress : 0, bossDone), claimed: Boolean(saved?.claimed) }]
      }),
    )
    const record = { wins: isNum(s.record?.wins) ? s.record.wins : 0, defeats: isNum(s.record?.defeats) ? s.record.defeats : 0 }
    return { ...s, cycle, battle, pending: null, quests, record, events: [], cleared: Boolean(s.cleared) }
  } catch {
    return null
  }
}

/** 다른 기기로 옮길 수 있는 한 줄짜리 세이브 코드 */
export function exportSave(s: GameState): string {
  const bytes = new TextEncoder().encode(serialize(s))
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
}

/** 세이브 코드를 읽는다. 올바르지 않으면 null */
export function importSave(code: string): GameState | null {
  try {
    const bytes = Uint8Array.from(atob(code.trim()), (c) => c.charCodeAt(0))
    return deserialize(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}
