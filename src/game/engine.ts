import { EVENTS, eventById, type Choice } from './data/events'
import { EQUIPS, equipById, equipWorth, potionById, spellById } from './data/items'
import { monsterById, type Monster, type Special } from './data/monsters'
import { QUESTS, questById, questTarget } from './data/quests'
import { REGIONS, regionById } from './data/regions'
import * as R from './rules'
import type { Action, Battle, GameEvent, GameState, Player, PotionId, Rng } from './types'

export const BASE_STATS: Player['stats'] = { str: 5, agi: 5, def: 5, int: 5, crit: 0, luck: 0 }

const freshProgress = () => Object.fromEntries(REGIONS.map((r) => [r.id, { kills: 0, bossDefeated: false }]))
const freshQuests = () => Object.fromEntries(QUESTS.map((q) => [q.id, { progress: 0, claimed: false }]))

export function newGame(name: string): GameState {
  const player: Player = {
    name: name.trim().slice(0, 12) || '모험가',
    level: 1,
    exp: 0,
    hp: 0,
    mp: 0,
    gold: 50,
    stats: { ...BASE_STATS },
    points: 5,
    potions: { 'hp-s': 3, 'hp-m': 0, 'hp-l': 0, mp: 1 },
    spells: ['fireball'],
    owned: [],
    weapon: null,
    armor: null,
    upgrades: {},
  }
  player.hp = R.maxHp(player)
  player.mp = R.maxMp(player)
  return {
    version: 1,
    cycle: 0,
    player,
    progress: freshProgress(),
    battle: null,
    pending: null,
    quests: freshQuests(),
    record: { wins: 0, defeats: 0 },
    events: [],
    cleared: false,
  }
}

export const newBattle = (monsterId: string, regionId: string, cycle = 0): Battle => {
  const m = monsterById(monsterId, cycle)
  return { monsterId, regionId, isBoss: m.boss, monsterHp: m.hp, charging: null, burn: null, chill: 0, stunned: false, poison: 0, damaged: false }
}

export const isRegionOpen = (s: GameState, regionId: string) => {
  const req = regionById(regionId).requires
  return req === null || s.progress[req].bossDefeated
}

export const canChallengeBoss = (s: GameState, regionId: string) =>
  isRegionOpen(s, regionId) && s.progress[regionId].kills >= regionById(regionId).killsForBoss

export const canChallengeSecret = (s: GameState, regionId: string) =>
  regionById(regionId).secretBoss !== undefined && s.cleared && isRegionOpen(s, regionId)

export const isQuestVisible = (s: GameState, questId: string) => {
  const q = questById(questId)
  if (q.afterClear && !s.cleared && s.quests[questId].progress === 0) return false
  return q.regionId === null || isRegionOpen(s, q.regionId)
}

export const isQuestDone = (s: GameState, questId: string) => s.quests[questId].progress >= questTarget(questById(questId))

/** 사건 선택지의 골드 비용 (지역 기준 골드 × 배수) */
export const choiceGoldCost = (regionId: string, choice: Choice, cycle = 0) =>
  Math.round(monsterById(regionById(regionId).monsters[0].id, cycle).gold * (choice.cost?.gold ?? 0))

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

  if (s.pending && action.type !== 'choose') return fail('눈앞의 일부터 정해야 한다')
  const battleOnly = ['attack', 'cast', 'defend', 'flee']
  if (battleOnly.includes(action.type) && !inBattle) return fail('전투 중이 아닙니다')
  if (inBattle && !battleOnly.includes(action.type) && action.type !== 'usePotion')
    return fail('전투 중에는 할 수 없습니다')

  const startBattle = (monsterId: string, regionId: string) => {
    s.battle = newBattle(monsterId, regionId, s.cycle)
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
      if (rng() < R.EVENT_CHANCE) {
        const hurt = p.hp < R.maxHp(p) || p.mp < R.maxMp(p)
        const pool = EVENTS.filter((e) => hurt || !e.onlyWhenHurt)
        const ev = pool[Math.floor(rng() * pool.length)]
        s.pending = { eventId: ev.id, regionId: region.id }
        emit({ t: 'event', eventId: ev.id })
      } else {
        startBattle(pickWeighted(rng, region.monsters).id, region.id)
      }
      return s
    }

    case 'choose': {
      if (!s.pending) return fail('선택할 일이 없습니다')
      const { eventId, regionId } = s.pending
      const region = regionById(regionId)
      const choice = eventById(eventId).choices[action.index]
      if (!choice) return fail('고를 수 없는 선택지입니다')
      const base = monsterById(region.monsters[0].id, s.cycle)
      const potionCost = choice.cost?.potion
      if (potionCost && p.potions[potionCost] < 1) return fail(`${potionById(potionCost).name}이 없습니다`)
      if (!spend(choiceGoldCost(regionId, choice, s.cycle))) return fail('골드가 부족합니다')
      if (potionCost) p.potions[potionCost]--

      const o = pickWeighted(rng, choice.outcomes)
      const gold = Math.round(base.gold * (o.gold ?? 0) * R.goldBonus(p))
      const exp = Math.round(base.exp * (o.exp ?? 0))
      // 사건으로는 쓰러지지 않는다 (HP 1은 남는다)
      const hp = Math.max(1 - p.hp, Math.min(R.maxHp(p) - p.hp, Math.round(R.maxHp(p) * (o.hp ?? 0))))
      const mp = Math.max(-p.mp, Math.min(R.maxMp(p) - p.mp, Math.round(R.maxMp(p) * (o.mp ?? 0))))
      p.gold += gold
      p.hp += hp
      p.mp += mp
      if (o.potion) p.potions[o.potion]++
      const levelUps = gainExp(p, exp)
      s.pending = null
      emit({ t: 'eventResult', text: o.text, gold, hp, mp, exp, potion: o.potion ?? null, levelUps })
      if (o.ambush) startBattle(pickWeighted(rng, region.monsters).id, region.id)
      return s
    }

    case 'challengeBoss': {
      const region = regionById(action.regionId)
      if (action.secret) {
        if (!canChallengeSecret(s, region.id)) return fail('아직 도전할 수 없습니다')
        startBattle(region.secretBoss!, region.id)
        return s
      }
      if (!canChallengeBoss(s, region.id)) return fail('아직 보스에게 도전할 수 없습니다')
      startBattle(region.boss, region.id)
      return s
    }

    case 'claimQuest': {
      const quest = QUESTS.find((q) => q.id === action.questId)
      if (!quest || !isQuestVisible(s, quest.id)) return fail('받을 수 없는 의뢰입니다')
      const state = s.quests[quest.id]
      if (state.claimed) return fail('이미 보상을 받았습니다')
      if (!isQuestDone(s, quest.id)) return fail('아직 완료하지 못했습니다')
      state.claimed = true
      p.gold += quest.reward.gold
      p.points += quest.reward.points ?? 0
      if (quest.reward.potion) p.potions[quest.reward.potion]++
      emit({ t: 'questClaimed', id: quest.id })
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
      if (eq.dropFrom) return fail('상점에서 팔지 않는 장비입니다')
      if (p.owned.includes(eq.id)) return fail('이미 가지고 있습니다')
      if (!spend(eq.price)) return fail('골드가 부족합니다')
      obtainEquip(p, eq.id)
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

    case 'upgradeEquip': {
      const eq = equipById(action.equipId)
      if (!p.owned.includes(eq.id)) return fail('가지고 있지 않은 장비입니다')
      const level = p.upgrades[eq.id] ?? 0
      if (level >= R.MAX_UPGRADE) return fail('더 강화할 수 없습니다')
      if (!spend(R.upgradeCost(p, eq))) return fail('골드가 부족합니다')
      p.upgrades[eq.id] = level + 1
      emit({ t: 'upgraded', id: eq.id, level: level + 1 })
      return s
    }

    case 'respec': {
      const keys = Object.keys(BASE_STATS) as (keyof typeof BASE_STATS)[]
      const points = keys.reduce((sum, k) => sum + p.stats[k] - BASE_STATS[k], 0)
      if (points <= 0) return fail('되돌릴 스텟이 없습니다')
      const cost = R.respecCost(p)
      if (!spend(cost)) return fail('골드가 부족합니다')
      p.stats = { ...BASE_STATS }
      p.points += points
      clampVitals(p)
      emit({ t: 'respec', cost, points })
      return s
    }

    case 'newCycle': {
      if (!s.cleared) return fail('엔딩을 본 뒤에 시작할 수 있습니다')
      // 레벨·스텟·장비·골드는 그대로, 세계만 처음으로 (몬스터는 더 강해진다)
      s.cycle++
      s.progress = freshProgress()
      s.quests = freshQuests()
      s.cleared = false
      p.hp = R.maxHp(p)
      p.mp = R.maxMp(p)
      emit({ t: 'newCycle', cycle: s.cycle })
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
      if (inBattle) enemyPhase(s, rng, false)
      return s
    }

    case 'attack': {
      const b = s.battle!
      const m = monsterById(b.monsterId, s.cycle)
      const crit = rng() < R.critChance(p)
      const raw = R.attackPower(p) * between(rng, 0.9, 1.1) * (crit ? R.CRIT_MULT : 1)
      const dmg = Math.min(b.monsterHp, R.mitigate(raw, m.def))
      b.monsterHp -= dmg
      emit({ t: 'playerAttack', dmg, crit, monsterHp: b.monsterHp })
      if (b.monsterHp <= 0) win(s, m, rng)
      else enemyPhase(s, rng, false)
      return s
    }

    case 'cast': {
      const b = s.battle!
      const m = monsterById(b.monsterId, s.cycle)
      const spell = spellById(action.spellId)
      if (!p.spells.includes(spell.id)) return fail('배우지 않은 마법입니다')
      if (p.mp < spell.mp) return fail('MP가 부족합니다')
      p.mp -= spell.mp
      const raw = R.spellPower(p, spell.power) * between(rng, 0.9, 1.1)
      const res = spell.effect === 'pierce' ? m.res * R.PIERCE_RES : m.res
      const dmg = Math.min(b.monsterHp, R.mitigate(raw, res))
      b.monsterHp -= dmg
      emit({ t: 'playerSpell', spellId: spell.id, dmg, monsterHp: b.monsterHp, mp: p.mp })
      if (b.monsterHp <= 0) {
        win(s, m, rng)
        return s
      }
      // 보스는 기절에 잘 걸리지 않는다
      const chance = spell.effect === 'stun' && m.boss ? spell.chance / 2 : spell.chance
      if (spell.effect !== 'pierce' && rng() < chance) {
        if (spell.effect === 'burn') b.burn = { turns: R.BURN_TURNS, dmg: Math.max(1, Math.round(dmg * R.BURN_RATIO)) }
        else if (spell.effect === 'chill') b.chill = R.CHILL_TURNS
        else b.stunned = true
        emit({ t: 'status', target: 'monster', kind: spell.effect })
      }
      enemyPhase(s, rng, false)
      return s
    }

    case 'defend': {
      const mp = Math.min(R.maxMp(p) - p.mp, Math.round(R.maxMp(p) * 0.1))
      p.mp += mp
      emit({ t: 'playerDefend', mp })
      enemyPhase(s, rng, true)
      return s
    }

    case 'flee': {
      if (s.battle!.isBoss) return fail('보스에게서는 도망칠 수 없습니다')
      if (rng() < R.fleeChance(p)) {
        s.battle = null
        emit({ t: 'fled' })
      } else {
        emit({ t: 'fleeFail' })
        enemyPhase(s, rng, false)
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

/** 장비를 얻는다. 지금 장비보다 좋을 때만 자동 착용. */
function obtainEquip(p: Player, id: string) {
  const eq = equipById(id)
  p.owned.push(id)
  const current = p[eq.slot]
  if (!current || equipWorth(eq) > equipWorth(equipById(current))) p[eq.slot] = id
  clampVitals(p)
}

/** 경험치를 얻고 오른 레벨 수를 돌려준다. 레벨이 오르면 전부 회복. */
function gainExp(p: Player, exp: number): number {
  p.exp += exp
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
  }
  return levelUps
}

/** 플레이어 행동 뒤의 적 차례: 화상 → (기절이 아니면) 몬스터 행동 → 독 */
function enemyPhase(s: GameState, rng: Rng, defending: boolean) {
  const b = s.battle!
  const p = s.player
  const m = monsterById(b.monsterId, s.cycle)

  if (b.burn) {
    const dmg = Math.min(b.monsterHp, b.burn.dmg)
    b.monsterHp -= dmg
    if (--b.burn.turns <= 0) b.burn = null
    s.events.push({ t: 'burnTick', dmg, monsterHp: b.monsterHp })
    if (b.monsterHp <= 0) return win(s, m, rng)
  }

  if (b.stunned) {
    b.stunned = false
    s.events.push({ t: 'monsterStunned' })
  } else if (monsterAct(s, m, rng, defending)) {
    return lose(s)
  }

  if (b.poison > 0) {
    b.poison--
    // 독으로는 쓰러지지 않는다
    const dmg = Math.min(p.hp - 1, Math.round(R.maxHp(p) * R.POISON_RATIO))
    if (dmg > 0) {
      p.hp -= dmg
      b.damaged = true
      s.events.push({ t: 'poisonTick', dmg, playerHp: p.hp })
    }
  }
}

/** 몬스터가 행동한다. 플레이어가 쓰러지면 true */
function monsterAct(s: GameState, m: Monster, rng: Rng, defending: boolean): boolean {
  const b = s.battle!
  const p = s.player
  const weaken = b.chill > 0 ? R.CHILL_MULT : 1
  if (b.chill > 0) b.chill--

  const hit = (mult: number, skill: string | null, opts: { canDodge?: boolean; drain?: boolean } = {}) => {
    const dodged = (opts.canDodge ?? true) && rng() < R.dodgeChance(p)
    let dmg = 0
    if (!dodged) {
      const raw = m.atk * mult * weaken * between(rng, 0.9, 1.1)
      dmg = Math.min(p.hp, Math.max(1, Math.round(R.mitigate(raw, R.defensePower(p)) * (defending ? R.DEFEND_MULT : 1))))
      p.hp -= dmg
      b.damaged = true
      if (opts.drain) b.monsterHp = Math.min(m.hp, b.monsterHp + dmg)
    }
    s.events.push({ t: 'monsterAttack', skill, dmg, dodged, playerHp: p.hp, monsterHp: b.monsterHp })
    return { dead: p.hp <= 0, landed: !dodged }
  }

  if (b.charging) {
    // 모았던 힘을 터뜨린다. 회피할 수 없고, 방어로만 줄일 수 있다.
    const skill = b.charging
    b.charging = null
    return hit(R.CHARGE_MULT, skill, { canDodge: false }).dead
  }

  const special = rollSpecial(m, rng)
  if (!special) return hit(1, null).dead
  switch (special.kind) {
    case 'charge':
      b.charging = special.name
      s.events.push({ t: 'monsterCharge', skill: special.name })
      return false
    case 'heavy':
      return hit(1.6, special.name).dead
    case 'drain':
      return hit(1, special.name, { drain: true }).dead
    case 'double':
      return hit(0.7, special.name).dead || hit(0.7, special.name).dead
    case 'poison': {
      const r = hit(1, special.name)
      if (r.landed && !r.dead) {
        b.poison = R.POISON_TURNS
        s.events.push({ t: 'status', target: 'player', kind: 'poison' })
      }
      return r.dead
    }
    case 'stun': {
      // 기절한 플레이어는 한 턴을 잃는다: 몬스터가 곧바로 한 번 더 때린다
      const r = hit(1, special.name)
      if (!r.landed || r.dead) return r.dead
      s.events.push({ t: 'status', target: 'player', kind: 'stun' })
      return hit(1, null, { canDodge: false }).dead
    }
  }
}

function rollSpecial(m: Monster, rng: Rng): Special | null {
  for (const sp of m.specials) if (rng() < sp.chance) return sp
  return null
}

function lose(s: GameState) {
  const p = s.player
  const goldLost = Math.floor(p.gold * R.DEATH_GOLD_LOSS)
  p.gold -= goldLost
  p.hp = R.maxHp(p)
  p.mp = R.maxMp(p)
  s.battle = null
  s.record.defeats++
  s.events.push({ t: 'defeat', goldLost })
}

function win(s: GameState, m: Monster, rng: Rng) {
  const p = s.player
  const b = s.battle!
  const region = regionById(b.regionId)
  const progress = s.progress[region.id]

  const gold = Math.round(m.gold * between(rng, 0.8, 1.2) * R.goldBonus(p))
  p.gold += gold

  const drops: PotionId[] = []
  for (const d of region.drops) {
    if (rng() < d.chance * R.dropBonus(p) * (m.boss ? 3 : 1)) {
      p.potions[d.id]++
      drops.push(d.id)
    }
  }

  const levelUps = gainExp(p, m.exp)
  if (levelUps === 0) p.mp = Math.min(R.maxMp(p), p.mp + Math.round(R.maxMp(p) * 0.15))

  let bossFirst: string | null = null
  let secretFirst = false
  let equipDrop: string | null = null
  if (m.id === region.secretBoss) {
    secretFirst = !progress.secretDefeated
    progress.secretDefeated = true
  } else if (m.boss) {
    if (!progress.bossDefeated) {
      progress.bossDefeated = true
      bossFirst = region.id
      if (region.id === REGIONS[REGIONS.length - 1].id) s.cleared = true
    }
  } else {
    progress.kills++
  }
  if (bossFirst || secretFirst) {
    const drop = EQUIPS.find((e) => e.dropFrom === m.id)
    if (drop && !p.owned.includes(drop.id)) {
      obtainEquip(p, drop.id)
      equipDrop = drop.id
    }
  }

  for (const q of QUESTS) {
    const g = q.goal
    const hit =
      (g.kind === 'kill' && g.monsterId === m.id) || (g.kind === 'boss' && g.monsterId === m.id) || (g.kind === 'flawless' && !b.damaged)
    if (hit) s.quests[q.id].progress = Math.min(questTarget(q), s.quests[q.id].progress + 1)
  }

  s.battle = null
  s.record.wins++
  s.events.push({ t: 'victory', exp: m.exp, gold, drops, levelUps, bossFirst, equipDrop, secretFirst })
}
