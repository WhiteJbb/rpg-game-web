import { describe, expect, it } from 'vitest'
import { EQUIPS, POTIONS, SPELLS } from './data/items'
import { monsterById } from './data/monsters'
import { REGIONS } from './data/regions'
import { canChallengeBoss, isRegionOpen, newGame, reduce } from './engine'
import * as R from './rules'
import { deserialize, serialize } from './save'
import type { GameState, PotionId, Rng, StatKey } from './types'

function seeded(seed: number): Rng {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const errorOf = (s: GameState) => s.events.find((e) => e.t === 'error')

describe('rules', () => {
  it('방어가 아무리 높아도 최소 1의 피해', () => {
    expect(R.mitigate(5, 100000)).toBe(1)
    expect(R.mitigate(100, 0)).toBe(100)
  })

  it('확률 스텟에는 상한이 있다', () => {
    const p = newGame('t').player
    p.stats = { str: 999, agi: 999, def: 999, int: 999, crit: 999, luck: 999 }
    expect(R.dodgeChance(p)).toBeLessThanOrEqual(0.4)
    expect(R.critChance(p)).toBeLessThanOrEqual(0.5)
    expect(R.fleeChance(p)).toBeLessThanOrEqual(0.9)
  })

  it('슬롯머신 기대값은 운이 최대여도 1 미만', () => {
    let ev = 0
    const n = R.SLOT_SYMBOLS
    for (let a = 0; a < n; a++)
      for (let b = 0; b < n; b++)
        for (let c = 0; c < n; c++) {
          const mult = R.slotMultiplier([a, b, c])
          ev += (mult === 0 ? 0.1 : mult) / n ** 3 // 0.1 = 환급 확률 상한
        }
    expect(ev).toBeLessThan(1)
    expect(ev).toBeGreaterThan(0.8)
  })
})

describe('engine', () => {
  it('입력 상태를 변경하지 않는다', () => {
    const s = newGame('t')
    const before = serialize(s)
    reduce(s, { type: 'explore', regionId: 'meadow' }, seeded(1))
    expect(serialize(s)).toBe(before)
  })

  it('잠긴 지역과 조건 미달 보스는 거부', () => {
    const s = newGame('t')
    expect(isRegionOpen(s, 'wolf-den')).toBe(false)
    expect(errorOf(reduce(s, { type: 'explore', regionId: 'wolf-den' }, seeded(1)))).toBeTruthy()
    expect(canChallengeBoss(s, 'meadow')).toBe(false)
    expect(errorOf(reduce(s, { type: 'challengeBoss', regionId: 'meadow' }, seeded(1)))).toBeTruthy()
  })

  it('골드가 부족하면 살 수 없고, 사면 골드가 줄고 자동 착용', () => {
    let s = newGame('t')
    s.player.gold = 39
    expect(errorOf(reduce(s, { type: 'buyEquip', equipId: 'wooden-stick' }, seeded(1)))).toBeTruthy()
    s.player.gold = 40
    s = reduce(s, { type: 'buyEquip', equipId: 'wooden-stick' }, seeded(1))
    expect(s.player.gold).toBe(0)
    expect(s.player.weapon).toBe('wooden-stick')
    expect(R.totalStat(s.player, 'str')).toBe(8)
    // 더 나쁜 장비를 사면 착용 중인 장비를 유지한다
    s.player.gold = 290
    s = reduce(s, { type: 'buyEquip', equipId: 'bronze-sword' }, seeded(1))
    s = reduce(s, { type: 'buyEquip', equipId: 'wooden-stick' }, seeded(1))
    expect(errorOf(s)).toBeTruthy() // 이미 보유
    s.player.owned = ['bronze-sword']
    s = reduce(s, { type: 'buyEquip', equipId: 'wooden-stick' }, seeded(1))
    expect(s.player.weapon).toBe('bronze-sword')
  })

  it('스텟 분배는 보유 포인트 안에서만', () => {
    const s = newGame('t')
    expect(errorOf(reduce(s, { type: 'allocate', stat: 'str', amount: 6 }, seeded(1)))).toBeTruthy()
    expect(errorOf(reduce(s, { type: 'allocate', stat: 'str', amount: -1 }, seeded(1)))).toBeTruthy()
    const after = reduce(s, { type: 'allocate', stat: 'str', amount: 5 }, seeded(1))
    expect(after.player.stats.str).toBe(10)
    expect(after.player.points).toBe(0)
  })

  it('전투 중에는 상점/휴식 불가, 전투 밖에서는 공격 불가', () => {
    const s = newGame('t')
    expect(errorOf(reduce(s, { type: 'attack' }, seeded(1)))).toBeTruthy()
    s.battle = { monsterId: 'slime', regionId: 'meadow', isBoss: false, monsterHp: 10, charging: null }
    expect(errorOf(reduce(s, { type: 'rest' }, seeded(1)))).toBeTruthy()
    expect(errorOf(reduce(s, { type: 'buyPotion', potionId: 'hp-s' }, seeded(1)))).toBeTruthy()
  })

  it('승리하면 보상을 받고, 레벨업하면 포인트와 체력을 얻는다', () => {
    let s = newGame('t')
    s.player.exp = R.expToNext(1) - 1
    s.player.hp = 10
    s.battle = { monsterId: 'slime', regionId: 'meadow', isBoss: false, monsterHp: 1, charging: null }
    s = reduce(s, { type: 'attack' }, seeded(1))
    const v = s.events.find((e) => e.t === 'victory')
    expect(v && v.t === 'victory' && v.levelUps).toBe(1)
    expect(s.battle).toBeNull()
    expect(s.player.level).toBe(2)
    expect(s.player.points).toBe(5 + R.POINTS_PER_LEVEL)
    expect(s.player.hp).toBe(R.maxHp(s.player))
    expect(s.progress.meadow.kills).toBe(1)
  })

  it('쓰러지면 골드 일부를 잃고 회복된 채 전투가 끝난다 (레벨·스텟은 그대로)', () => {
    let s = newGame('t')
    s.player.hp = 1
    s.player.gold = 100
    s.player.stats.agi = 0
    s.battle = { monsterId: 'ogre', regionId: 'meadow', isBoss: true, monsterHp: 9999, charging: '몽둥이 풀스윙' }
    s = reduce(s, { type: 'attack' }, seeded(1))
    expect(s.events.some((e) => e.t === 'defeat')).toBe(true)
    expect(s.battle).toBeNull()
    expect(s.player.gold).toBe(80)
    expect(s.player.level).toBe(1)
    expect(s.player.hp).toBe(R.maxHp(s.player))
  })

  it('방어하면 모은 공격의 피해가 줄어든다', () => {
    const base = newGame('t')
    base.player.stats.agi = 0
    base.battle = { monsterId: 'ogre', regionId: 'meadow', isBoss: true, monsterHp: 9999, charging: '몽둥이 풀스윙' }
    const hpAfter = (type: 'defend' | 'attack') => reduce(base, { type }, seeded(7)).player.hp
    const lostDefending = base.player.hp - hpAfter('defend')
    expect(lostDefending).toBeGreaterThan(0)
    expect(lostDefending).toBeLessThan((base.player.hp - hpAfter('attack')) * 0.7)
  })

  it('보스에게서는 도망칠 수 없다', () => {
    const s = newGame('t')
    s.battle = { monsterId: 'ogre', regionId: 'meadow', isBoss: true, monsterHp: 100, charging: null }
    expect(errorOf(reduce(s, { type: 'flee' }, seeded(1)))).toBeTruthy()
  })

  it('세이브는 왕복 가능하고, 깨진 데이터는 null', () => {
    const s = newGame('홍길동')
    expect(deserialize(serialize(s))).toEqual(s)
    expect(deserialize('{"version":99}')).toBeNull()
    expect(deserialize('not json')).toBeNull()
    expect(deserialize('{"version":1,"player":{"name":"t"},"progress":null}')).toBeNull()
    const stale = JSON.parse(serialize(s))
    stale.battle = { monsterId: 'removed-monster', regionId: 'meadow', isBoss: false, monsterHp: 5, charging: null }
    expect(deserialize(JSON.stringify(stale))?.battle).toBeNull()
    expect(deserialize(null)).toBeNull()
  })

  it('데이터의 id 참조가 모두 유효하다', () => {
    for (const r of REGIONS) {
      for (const m of r.monsters) expect(monsterById(m.id).boss).toBe(false)
      expect(monsterById(r.boss).boss).toBe(true)
      if (r.requires) expect(REGIONS.some((x) => x.id === r.requires)).toBe(true)
    }
  })
})

/**
 * 봇이 처음부터 엔딩까지 플레이한다. 게임이 끝까지 진행 가능한지와
 * 밸런스(전투 수, 사망 수)가 의도한 범위인지 확인한다.
 */
type Build = 'warrior' | 'mage'

function playThrough(build: Build, seed: number) {
  const rng = seeded(seed)
  let s = newGame('bot')
  const act = (a: Parameters<typeof reduce>[1]) => (s = reduce(s, a, rng))
  let battles = 0
  let deaths = 0
  const weights: Record<Build, [StatKey, number][]> = {
    warrior: [['str', 0.5], ['def', 0.3], ['agi', 0.1], ['crit', 0.1]],
    mage: [['int', 0.55], ['def', 0.3], ['agi', 0.15]],
  }

  const town = () => {
    const p = () => s.player
    // 스텟: 목표 비율에서 가장 모자란 스텟부터
    while (p().points > 0) {
      const total = weights[build].reduce((sum, [k]) => sum + p().stats[k], 0) + 1
      const [stat] = [...weights[build]].sort((a, b) => p().stats[a[0]] / total - a[1] - (p().stats[b[0]] / total - b[1]))[0]
      act({ type: 'allocate', stat, amount: 1 })
    }
    // 장비: 살 수 있는 것 중 주 스텟이 가장 높은 것
    const main = build === 'warrior' ? 'str' : 'int'
    for (const slot of ['weapon', 'armor'] as const) {
      const score = (id: string | null) => {
        const e = EQUIPS.find((e) => e.id === id)
        return e ? (slot === 'weapon' ? e[main] * 2 + e.str : e.def + e.int * (build === 'mage' ? 1 : 0)) : 0
      }
      const best = EQUIPS.filter((e) => e.slot === slot && e.price <= p().gold && score(e.id) > score(p()[slot])).sort((a, b) => score(b.id) - score(a.id))[0]
      if (best) act({ type: 'buyEquip', equipId: best.id })
    }
    if (build === 'mage') {
      const spell = SPELLS.filter((sp) => !p().spells.includes(sp.id) && sp.price <= p().gold && sp.power > 22).sort((a, b) => b.power - a.power)[0]
      if (spell) act({ type: 'buySpell', spellId: spell.id })
    }
    if ((p().hp < R.maxHp(p()) * 0.6 || p().mp < R.maxMp(p()) * 0.5) && p().gold >= R.restCost(p())) act({ type: 'rest' })
    // 포션: 최대 HP의 절반 이하를 회복하는 것 중 가장 큰 것을 5개까지
    const hpPotion = [...POTIONS].filter((x) => x.hp > 0 && x.hp <= Math.max(60, R.maxHp(p()) * 0.6)).pop()!
    while (p().potions[hpPotion.id] < 5 && p().gold >= hpPotion.price) act({ type: 'buyPotion', potionId: hpPotion.id })
    if (build === 'mage') while (p().potions.mp < 4 && p().gold >= 70) act({ type: 'buyPotion', potionId: 'mp' })
  }

  const fight = () => {
    battles++
    while (s.battle) {
      const p = s.player
      const hpPotion = (['hp-l', 'hp-m', 'hp-s'] as PotionId[]).find((id) => p.potions[id] > 0)
      if (s.battle.charging) act({ type: 'defend' })
      else if (p.hp < R.maxHp(p) * 0.35 && hpPotion) act({ type: 'usePotion', potionId: hpPotion })
      else if (build === 'mage') {
        const spell = SPELLS.filter((sp) => p.spells.includes(sp.id) && sp.mp <= p.mp).sort((a, b) => b.power - a.power)[0]
        if (spell) act({ type: 'cast', spellId: spell.id })
        else if (p.potions.mp > 0) act({ type: 'usePotion', potionId: 'mp' })
        else act({ type: 'attack' })
      } else act({ type: 'attack' })
    }
    if (s.events.some((e) => e.t === 'defeat')) deaths++
  }

  for (let step = 0; step < 3000 && !s.cleared; step++) {
    town()
    // 보스 레벨에 닿을 때까지는 사냥, 닿으면 보스 도전
    const region = REGIONS.filter((r) => isRegionOpen(s, r.id)).pop()!
    const boss = monsterById(region.boss)
    if (canChallengeBoss(s, region.id) && s.player.level >= boss.level) act({ type: 'challengeBoss', regionId: region.id })
    else act({ type: 'explore', regionId: region.id })
    if (s.battle) fight()
  }
  return { cleared: s.cleared, battles, deaths, level: s.player.level }
}

describe('전체 플레이 시뮬레이션', () => {
  for (const build of ['warrior', 'mage'] as const) {
    it(`${build} 빌드로 엔딩까지 갈 수 있다`, () => {
      const runs = [1, 2, 3, 4, 5].map((seed) => playThrough(build, seed))
      console.log(build, runs)
      for (const r of runs) {
        expect(r.cleared).toBe(true)
        expect(r.battles).toBeGreaterThan(80) // 너무 쉽게 끝나지 않는다
        expect(r.battles).toBeLessThan(450) // 지루한 반복 사냥을 요구하지 않는다
        expect(r.deaths).toBeLessThan(r.battles * 0.15)
      }
    })
  }
})
