import { equipById, potionById, spellById } from './data/items'
import { monsterById, type Monster, type Special } from './data/monsters'
import { REGIONS, regionById } from './data/regions'
import * as R from './rules'
import type { Action, GameEvent, GameState, Player, PotionId, Rng } from './types'

export function newGame(name: string): GameState {
  const player: Player = {
    name: name.trim().slice(0, 12) || '모험가',
    level: 1,
    exp: 0,
    hp: 0,
    mp: 0,
    gold: 50,
    stats: { str: 5, agi: 5, def: 5, int: 5, crit: 0, luck: 0 },
    points: 5,
    potions: { 'hp-s': 3, 'hp-m': 0, 'hp-l': 0, mp: 1 },
    spells: ['fireball'],
    owned: [],
    weapon: null,
    armor: null,
  }
  player.hp = R.maxHp(player)
  player.mp = R.maxMp(player)
  return {
    version: 1,
    player,
    progress: Object.fromEntries(REGIONS.map((r) => [r.id, { kills: 0, bossDefeated: false }])),
    battle: null,
    events: [],
    cleared: false,
  }
}

export const isRegionOpen = (s: GameState, regionId: string) => {
  const req = regionById(regionId).requires
  return req === null || s.progress[req].bossDefeated
}

export const canChallengeBoss = (s: GameState, regionId: string) =>
  isRegionOpen(s, regionId) && s.progress[regionId].kills >= regionById(regionId).killsForBoss

const between = (rng: Rng, lo: number, hi: number) => lo + rng() * (hi - lo)

function pickWeighted<T extends { weight: number }>(rng: Rng, list: T[]): T {
  let roll = rng() * list.reduce((sum, x) => sum + x.weight, 0)
  for (const x of list) if ((roll -= x.weight) < 0) return x
  return list[list.length - 1]
}

/**
 * 게임의 유일한 상태 전이 함수. 입력 상태는 건드리지 않고 새 상태를 돌려준다.
 * 이번 액션으로 일어난 일은 `events`에 순서대로 담긴다.
 */
export function reduce(prev: GameState, action: Action, rng: Rng): GameState {
  const s = structuredClone(prev)
  s.events = []
  const p = s.player
  const emit = (e: GameEvent) => void s.events.push(e)
  const fail = (text: string) => (emit({ t: 'error', text }), s)
  const inBattle = s.battle !== null

  const battleOnly = ['attack', 'cast', 'defend', 'flee']
  if (battleOnly.includes(action.type) && !inBattle) return fail('전투 중이 아닙니다')
  if (inBattle && !battleOnly.includes(action.type) && action.type !== 'usePotion')
    return fail('전투 중에는 할 수 없습니다')

  const startBattle = (monsterId: string, regionId: string) => {
    const m = monsterById(monsterId)
    s.battle = { monsterId, regionId, isBoss: m.boss, monsterHp: m.hp, charging: null }
    emit({ t: 'encounter', monsterId })
  }

  const spend = (price: number) => {
    if (p.gold < price) return false
    p.gold -= price
    return true
  }

  switch (action.type) {
    case 'explore': {
      if (!isRegionOpen(s, action.regionId)) return fail('아직 갈 수 없는 지역입니다')
      const region = regionById(action.regionId)
      const roll = rng()
      if (roll < 0.07) {
        const gold = Math.round(monsterById(region.monsters[0].id).gold * between(rng, 2, 4) * R.goldBonus(p))
        p.gold += gold
        emit({ t: 'treasure', gold })
      } else if (roll < 0.12 && (p.hp < R.maxHp(p) || p.mp < R.maxMp(p))) {
        // 샘물은 회복할 것이 있을 때만 나온다
        const hp = Math.min(R.maxHp(p) - p.hp, Math.round(R.maxHp(p) * 0.3))
        const mp = Math.min(R.maxMp(p) - p.mp, Math.round(R.maxMp(p) * 0.3))
        p.hp += hp
        p.mp += mp
        emit({ t: 'spring', hp, mp })
      } else {
        startBattle(pickWeighted(rng, region.monsters).id, region.id)
      }
      return s
    }

    case 'challengeBoss': {
      if (!canChallengeBoss(s, action.regionId)) return fail('아직 보스에게 도전할 수 없습니다')
      startBattle(regionById(action.regionId).boss, action.regionId)
      return s
    }

    case 'buyPotion': {
      const potion = potionById(action.potionId)
      if (!spend(potion.price)) return fail('골드가 부족합니다')
      p.potions[potion.id]++
      emit({ t: 'bought', id: potion.id })
      return s
    }

    case 'buySpell': {
      const spell = spellById(action.spellId)
      if (p.spells.includes(spell.id)) return fail('이미 배운 마법입니다')
      if (!spend(spell.price)) return fail('골드가 부족합니다')
      p.spells.push(spell.id)
      emit({ t: 'bought', id: spell.id })
      return s
    }

    case 'buyEquip': {
      const eq = equipById(action.equipId)
      if (p.owned.includes(eq.id)) return fail('이미 가지고 있습니다')
      if (!spend(eq.price)) return fail('골드가 부족합니다')
      p.owned.push(eq.id)
      // 지금 장비보다 좋을 때만 자동 착용
      const worth = (id: string | null) => (id ? equipById(id).str + equipById(id).def + equipById(id).int : -1)
      if (worth(eq.id) > worth(p[eq.slot])) p[eq.slot] = eq.id
      clampVitals(p)
      emit({ t: 'bought', id: eq.id })
      return s
    }

    case 'equip': {
      const eq = equipById(action.equipId)
      if (!p.owned.includes(eq.id)) return fail('가지고 있지 않은 장비입니다')
      p[eq.slot] = eq.id
      clampVitals(p)
      return s
    }

    case 'allocate': {
      const n = Math.floor(action.amount)
      if (!(n >= 1) || n > p.points) return fail('스텟 포인트가 부족합니다')
      p.stats[action.stat] += n
      p.points -= n
      return s
    }

    case 'rest': {
      const cost = R.restCost(p)
      if (!spend(cost)) return fail('골드가 부족합니다')
      p.hp = R.maxHp(p)
      p.mp = R.maxMp(p)
      emit({ t: 'rest', cost })
      return s
    }

    case 'slot': {
      const bet = Math.floor(action.bet)
      if (!(bet >= 1)) return fail('1 골드 이상 걸어야 합니다')
      if (!spend(bet)) return fail('골드가 부족합니다')
      const spin = () => Math.floor(rng() * R.SLOT_SYMBOLS)
      const reels: [number, number, number] = [spin(), spin(), spin()]
      let payout = bet * R.slotMultiplier(reels)
      const refunded = payout === 0 && rng() < R.slotRefundChance(p)
      if (refunded) payout = bet
      p.gold += payout
      emit({ t: 'slot', reels, bet, payout, refunded })
      return s
    }

    case 'usePotion': {
      const potion = potionById(action.potionId)
      if (p.potions[potion.id] < 1) return fail('포션이 없습니다')
      const hp = Math.min(R.maxHp(p) - p.hp, potion.hp)
      const mp = Math.min(R.maxMp(p) - p.mp, potion.mp)
      if (hp + mp <= 0) return fail('지금은 마실 필요가 없습니다')
      p.potions[potion.id]--
      p.hp += hp
      p.mp += mp
      emit({ t: 'potion', potionId: potion.id, hp, mp })
      if (inBattle) monsterTurn(s, rng, false)
      return s
    }

    case 'attack': {
      const b = s.battle!
      const m = monsterById(b.monsterId)
      const crit = rng() < R.critChance(p)
      const raw = R.attackPower(p) * between(rng, 0.9, 1.1) * (crit ? R.CRIT_MULT : 1)
      const dmg = Math.min(b.monsterHp, R.mitigate(raw, m.def))
      b.monsterHp -= dmg
      emit({ t: 'playerAttack', dmg, crit, monsterHp: b.monsterHp })
      if (b.monsterHp <= 0) win(s, m, rng)
      else monsterTurn(s, rng, false)
      return s
    }

    case 'cast': {
      const b = s.battle!
      const m = monsterById(b.monsterId)
      const spell = spellById(action.spellId)
      if (!p.spells.includes(spell.id)) return fail('배우지 않은 마법입니다')
      if (p.mp < spell.mp) return fail('MP가 부족합니다')
      p.mp -= spell.mp
      const raw = R.spellPower(p, spell.power) * between(rng, 0.9, 1.1)
      const dmg = Math.min(b.monsterHp, R.mitigate(raw, m.res))
      b.monsterHp -= dmg
      emit({ t: 'playerSpell', spellId: spell.id, dmg, monsterHp: b.monsterHp, mp: p.mp })
      if (b.monsterHp <= 0) win(s, m, rng)
      else monsterTurn(s, rng, false)
      return s
    }

    case 'defend': {
      const mp = Math.min(R.maxMp(p) - p.mp, Math.round(R.maxMp(p) * 0.1))
      p.mp += mp
      emit({ t: 'playerDefend', mp })
      monsterTurn(s, rng, true)
      return s
    }

    case 'flee': {
      if (s.battle!.isBoss) return fail('보스에게서는 도망칠 수 없습니다')
      if (rng() < R.fleeChance(p)) {
        s.battle = null
        emit({ t: 'fled' })
      } else {
        emit({ t: 'fleeFail' })
        monsterTurn(s, rng, false)
      }
      return s
    }
  }
}

/** 장비 교체로 최대치가 줄었을 때 현재 HP/MP를 맞춘다 */
function clampVitals(p: Player) {
  p.hp = Math.min(p.hp, R.maxHp(p))
  p.mp = Math.min(p.mp, R.maxMp(p))
}

function monsterTurn(s: GameState, rng: Rng, defending: boolean) {
  const b = s.battle!
  const p = s.player
  const m = monsterById(b.monsterId)

  /** 한 번 때린다. 플레이어가 쓰러지면 true */
  const hit = (mult: number, skill: string | null, opts: { canDodge?: boolean; drain?: boolean } = {}) => {
    const dodged = (opts.canDodge ?? true) && rng() < R.dodgeChance(p)
    let dmg = 0
    if (!dodged) {
      const raw = m.atk * mult * between(rng, 0.9, 1.1)
      dmg = Math.min(p.hp, Math.max(1, Math.round(R.mitigate(raw, R.defensePower(p)) * (defending ? R.DEFEND_MULT : 1))))
      p.hp -= dmg
      if (opts.drain) b.monsterHp = Math.min(m.hp, b.monsterHp + dmg)
    }
    s.events.push({ t: 'monsterAttack', skill, dmg, dodged, playerHp: p.hp, monsterHp: b.monsterHp })
    return p.hp <= 0
  }

  let dead: boolean
  if (b.charging) {
    // 모았던 힘을 터뜨린다. 회피할 수 없고, 방어로만 줄일 수 있다.
    const skill = b.charging
    b.charging = null
    dead = hit(R.CHARGE_MULT, skill, { canDodge: false })
  } else {
    const special = rollSpecial(m, rng)
    if (!special) dead = hit(1, null)
    else if (special.kind === 'charge') {
      b.charging = special.name
      s.events.push({ t: 'monsterCharge', skill: special.name })
      dead = false
    } else if (special.kind === 'heavy') dead = hit(1.6, special.name)
    else if (special.kind === 'drain') dead = hit(1, special.name, { drain: true })
    else dead = hit(0.7, special.name) || hit(0.7, special.name)
  }

  if (dead) {
    const goldLost = Math.floor(p.gold * R.DEATH_GOLD_LOSS)
    p.gold -= goldLost
    p.hp = R.maxHp(p)
    p.mp = R.maxMp(p)
    s.battle = null
    s.events.push({ t: 'defeat', goldLost })
  }
}

function rollSpecial(m: Monster, rng: Rng): Special | null {
  for (const sp of m.specials) if (rng() < sp.chance) return sp
  return null
}

function win(s: GameState, m: Monster, rng: Rng) {
  const p = s.player
  const b = s.battle!
  const region = regionById(b.regionId)
  const progress = s.progress[region.id]

  const gold = Math.round(m.gold * between(rng, 0.8, 1.2) * R.goldBonus(p))
  p.gold += gold
  p.exp += m.exp

  const drops: PotionId[] = []
  for (const d of region.drops) {
    if (rng() < d.chance * R.dropBonus(p) * (m.boss ? 3 : 1)) {
      p.potions[d.id]++
      drops.push(d.id)
    }
  }

  let levelUps = 0
  while (p.level < R.MAX_LEVEL && p.exp >= R.expToNext(p.level)) {
    p.exp -= R.expToNext(p.level)
    p.level++
    p.points += R.POINTS_PER_LEVEL
    levelUps++
  }
  if (levelUps > 0) {
    p.hp = R.maxHp(p)
    p.mp = R.maxMp(p)
  } else {
    p.mp = Math.min(R.maxMp(p), p.mp + Math.round(R.maxMp(p) * 0.15))
  }

  let bossFirst: string | null = null
  if (m.boss) {
    if (!progress.bossDefeated) {
      progress.bossDefeated = true
      bossFirst = region.id
      if (region.id === REGIONS[REGIONS.length - 1].id) s.cleared = true
    }
  } else {
    progress.kills++
  }

  s.battle = null
  s.events.push({ t: 'victory', exp: m.exp, gold, drops, levelUps, bossFirst })
}
