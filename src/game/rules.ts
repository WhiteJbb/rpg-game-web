import { equipById } from './data/items'
import type { Player, StatKey } from './types'

export const POINTS_PER_LEVEL = 4
export const MAX_LEVEL = 50
export const CRIT_MULT = 1.75
export const DEFEND_MULT = 0.4
export const CHARGE_MULT = 2.4
export const DEATH_GOLD_LOSS = 0.2
export const SLOT_SYMBOLS = 5 // 0번 심볼이 잭팟(왕관)
export const EVENT_CHANCE = 0.15
export const BURN_TURNS = 3
export const BURN_RATIO = 0.3 // 맞힌 피해 대비 턴당 화상 피해
export const CHILL_TURNS = 2
export const CHILL_MULT = 0.7
export const POISON_TURNS = 3
export const POISON_RATIO = 0.06 // 최대 HP 대비 턴당 독 피해
export const PIERCE_RES = 0.3

export const expToNext = (level: number) => Math.round(18 * Math.pow(level, 1.7))
export const maxHp = (p: Player) => 100 + (p.level - 1) * 18

/** 기본 스텟 + 착용 장비 보너스 */
export function totalStat(p: Player, stat: StatKey): number {
  let v = p.stats[stat]
  for (const id of [p.weapon, p.armor]) if (id) v += equipById(id)[stat] ?? 0
  return v
}

export const maxMp = (p: Player) => 30 + (p.level - 1) * 4 + totalStat(p, 'int') * 2
export const attackPower = (p: Player) => totalStat(p, 'str') * 2
export const defensePower = (p: Player) => totalStat(p, 'def') * 1.5
export const spellPower = (p: Player, base: number) => base * (1 + totalStat(p, 'int') * 0.05)

// 확률 스텟은 전부 상한이 있다 (원작의 회피 100% 무적 문제 방지)
export const dodgeChance = (p: Player) => Math.min(0.4, totalStat(p, 'agi') * 0.008)
export const critChance = (p: Player) => Math.min(0.5, 0.05 + totalStat(p, 'crit') * 0.01)
export const fleeChance = (p: Player) => Math.min(0.9, 0.5 + totalStat(p, 'agi') * 0.01)
export const goldBonus = (p: Player) => 1 + Math.min(0.5, totalStat(p, 'luck') * 0.01)
export const dropBonus = (p: Player) => 1 + Math.min(1, totalStat(p, 'luck') * 0.02)
export const slotRefundChance = (p: Player) => Math.min(0.1, totalStat(p, 'luck') * 0.005)

/** 방어가 아무리 높아도 피해가 0이 되지 않는 감쇠식 */
export const mitigate = (raw: number, def: number) => Math.max(1, Math.round((raw * raw) / (raw + def)))

export const restCost = (p: Player) => p.level * 6

/** 슬롯머신 배당 (베팅액 배수). 기대값은 운 환급을 포함해도 1 미만이다. */
export function slotMultiplier(reels: [number, number, number]): number {
  const [a, b, c] = reels
  if (a === b && b === c) return a === 0 ? 20 : 8
  if (a === b || b === c || a === c) return 1
  return 0
}
