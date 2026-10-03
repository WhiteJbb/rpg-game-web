import { EVENTS } from './data/events'
import { EQUIPS, POTIONS, SPELLS, type Equip } from './data/items'
import { canTakeJob, jobById } from './data/jobs'
import { monsterById } from './data/monsters'
import { QUESTS } from './data/quests'
import { REGIONS } from './data/regions'
import { canChallengeBoss, isQuestDone, isQuestVisible, isRegionOpen, newGame, reduce } from './engine'
import * as R from './rules'
import type { Action, PotionId, Rng, StatKey } from './types'

/**
 * 테스트용 봇. 최적으로만 움직이지 않고 "보통 플레이어"처럼 군다:
 * 보스가 열리면 권장 레벨보다 조금 낮아도 도전하고, 마을에는 가끔만 들르고,
 * 힘 모으기를 가끔 놓친다. 난이도 측정과 '끝까지 갈 수 있는가' 확인에 쓴다.
 */
export function seeded(seed: number): Rng {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Build = 'warrior' | 'mage' | 'rogue'

const WEIGHTS: Record<Build, [StatKey, number][]> = {
  warrior: [['str', 0.5], ['def', 0.3], ['agi', 0.1], ['crit', 0.1]],
  mage: [['int', 0.55], ['def', 0.3], ['agi', 0.15]],
  rogue: [['str', 0.35], ['crit', 0.25], ['agi', 0.25], ['def', 0.15]],
}

interface RegionStat {
  battles: number
  deaths: number
  turns: number
  hpLost: number // 전투당 잃은 HP 비율의 합
  bossTries: number
  bossLevel: number // 보스를 잡았을 때의 레벨
  bossTurns: number
}

export function simulate(build: Build, seed: number, cycles = 1, secretBoss = false) {
  const rng = seeded(seed)
  const lapse = seeded(seed * 7919) // 플레이어의 실수는 게임 난수와 별개
  let s = newGame('bot')
  const act = (a: Action) => (s = reduce(s, a, rng))
  const p = () => s.player
  const stats: Record<string, RegionStat> = Object.fromEntries(
    REGIONS.map((r) => [r.id, { battles: 0, deaths: 0, turns: 0, hpLost: 0, bossTries: 0, bossLevel: 0, bossTurns: 0 }]),
  )
  let potionsUsed = 0

  const score = (e: Equip) => {
    const w = Object.fromEntries(WEIGHTS[build]) as Partial<Record<StatKey, number>>
    return (['str', 'def', 'int', 'agi', 'crit', 'luck'] as StatKey[]).reduce((sum, k) => sum + (e[k] ?? 0) * ((w[k] ?? 0) + 0.1), 0)
  }

  const town = () => {
    for (const q of QUESTS) if (!s.quests[q.id].claimed && isQuestVisible(s, q.id) && isQuestDone(s, q.id)) act({ type: 'claimQuest', questId: q.id })
    while (p().points > 0) {
      const total = WEIGHTS[build].reduce((sum, [k]) => sum + p().stats[k], 0) + 1
      const [stat] = [...WEIGHTS[build]].sort((a, b) => p().stats[a[0]] / total - a[1] - (p().stats[b[0]] / total - b[1]))[0]
      act({ type: 'allocate', stat, amount: 1 })
    }
    if (!p().job && canTakeJob(p(), build)) act({ type: 'changeJob', job: build })
    for (const slot of ['weapon', 'armor', 'accessory'] as const) {
      const current = p()[slot]
      const best = EQUIPS.filter((e) => e.slot === slot && !e.dropFrom && !p().owned.includes(e.id) && e.price <= p().gold * 0.8)
        .filter((e) => !current || score(e) > score(EQUIPS.find((x) => x.id === current)!))
        .sort((a, b) => score(b) - score(a))[0]
      if (best) {
        act({ type: 'buyEquip', equipId: best.id })
        act({ type: 'equip', equipId: best.id })
      }
    }
    // 남는 골드의 절반까지는 착용 장비 강화에 쓴다
    for (let i = 0; i < 20; i++) {
      const target = [p().weapon, p().armor, p().accessory]
        .filter((id): id is string => id !== null && (p().upgrades[id] ?? 0) < R.MAX_UPGRADE)
        .map((id) => EQUIPS.find((e) => e.id === id)!)
        .sort((x, y) => R.upgradeCost(p(), x) - R.upgradeCost(p(), y))[0]
      if (!target || R.upgradeCost(p(), target) > p().gold * 0.5) break
      act({ type: 'upgradeEquip', equipId: target.id })
    }
    if (build === 'mage') {
      const spell = SPELLS.filter((sp) => !p().spells.includes(sp.id) && sp.price <= p().gold * 0.8).sort((a, b) => b.power - a.power)[0]
      if (spell) act({ type: 'buySpell', spellId: spell.id })
    }
    if ((p().hp < R.maxHp(p()) * 0.7 || p().mp < R.maxMp(p()) * 0.5) && p().gold >= R.restCost(p())) act({ type: 'rest' })
    const hpPotion = [...POTIONS].filter((x) => x.hp > 0 && x.hp <= Math.max(60, R.maxHp(p()) * 0.7)).pop()!
    while (p().potions[hpPotion.id] < 4 && p().gold >= hpPotion.price) act({ type: 'buyPotion', potionId: hpPotion.id })
    if (build === 'mage') while (p().potions.mp < 3 && p().gold >= 70) act({ type: 'buyPotion', potionId: 'mp' })
  }

  const bestHpPotion = () => (['hp-l', 'hp-m', 'hp-s'] as PotionId[]).find((id) => p().potions[id] > 0)

  /** 전투 한 판. 이겼으면 true */
  const fight = (regionId: string, boss: boolean) => {
    const st = stats[regionId]
    const hpBefore = p().hp
    let turns = 0
    while (s.battle) {
      turns++
      const potion = bestHpPotion()
      // 힘 모으기를 열 번에 두 번은 놓친다
      if (s.battle.charging && lapse() > 0.2) act({ type: 'defend' })
      else if (p().hp < R.maxHp(p()) * 0.35 && potion) {
        act({ type: 'usePotion', potionId: potion })
        potionsUsed++
      } else if (build === 'mage') {
        const spell = SPELLS.filter((sp) => p().spells.includes(sp.id) && R.spellCost(p(), sp.mp) <= p().mp).sort((a, b) => b.power - a.power)[0]
        if (spell) act({ type: 'cast', spellId: spell.id })
        else if (p().job) act({ type: 'skill' }) // 명상
        else if (p().potions.mp > 0) act({ type: 'usePotion', potionId: 'mp' })
        else act({ type: 'attack' })
      } else if (p().job && p().mp >= jobById(p().job!).skill.mp) act({ type: 'skill' })
      else act({ type: 'attack' })
    }
    const lost = s.events.some((e) => e.t === 'defeat')
    st.battles++
    st.turns += turns
    if (lost) st.deaths++
    else st.hpLost += Math.max(0, hpBefore - p().hp) / R.maxHp(p())
    if (boss) {
      st.bossTries++
      if (!lost) {
        st.bossLevel = p().level
        st.bossTurns = turns
      }
    }
    return !lost
  }

  let sinceTown = 0
  let retryAfter = 0 // 보스에게 진 뒤 몇 판 더 사냥하고 재도전할지
  town()
  for (let step = 0; step < 8000 && (!s.cleared || s.cycle < cycles - 1); step++) {
    if (s.cleared) act({ type: 'newCycle' })
    const region = REGIONS.filter((r) => isRegionOpen(s, r.id)).pop()!
    const boss = monsterById(region.boss, s.cycle)
    // 물약이 떨어졌거나 한참 싸웠으면 마을에 들른다
    if (sinceTown >= 6 || (p().hp < R.maxHp(p()) * 0.4 && !bestHpPotion())) {
      town()
      sinceTown = 0
    }
    if (canChallengeBoss(s, region.id) && retryAfter <= 0 && p().level >= boss.level - 2) {
      town()
      sinceTown = 0
      act({ type: 'challengeBoss', regionId: region.id })
      if (!fight(region.id, true)) retryAfter = 4
      continue
    }
    act({ type: 'explore', regionId: region.id })
    if (s.pending) {
      const last = EVENTS.find((e) => e.id === s.pending!.eventId)!.choices.length - 1
      act({ type: 'choose', index: 0 })
      if (s.pending) act({ type: 'choose', index: last })
    }
    if (s.battle) {
      fight(region.id, false)
      retryAfter--
      sinceTown++
    }
  }
  // 엔딩 뒤 숨은 보스: 지면 성에서 몇 판 더 싸우고 다시 도전한다
  let secretTries = 0
  while (secretBoss && s.cleared && !s.progress['vampire-castle'].secretDefeated && secretTries < 40) {
    town()
    secretTries++
    act({ type: 'challengeBoss', regionId: 'vampire-castle', secret: true })
    if (fight('vampire-castle', true)) break
    for (let i = 0; i < 6; i++) {
      act({ type: 'explore', regionId: 'vampire-castle' })
      if (s.pending) act({ type: 'choose', index: EVENTS.find((e) => e.id === s.pending!.eventId)!.choices.length - 1 })
      if (s.battle) fight('vampire-castle', false)
      if (i === 2) town()
    }
  }
  return { secretTries, secretDefeated: Boolean(s.progress['vampire-castle'].secretDefeated), cleared: s.cleared, cycle: s.cycle, level: p().level, gold: p().gold, potionsUsed, stats }
}
