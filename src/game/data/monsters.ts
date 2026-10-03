export type SpecialKind = 'heavy' | 'double' | 'drain' | 'charge' | 'poison' | 'stun'

export interface Special {
  kind: SpecialKind
  name: string
  chance: number
}

export interface Monster {
  id: string
  name: string
  level: number
  hp: number
  atk: number
  def: number
  res: number
  exp: number
  gold: number
  boss: boolean
  specials: Special[]
}

interface Mods {
  hp?: number
  atk?: number
  def?: number
  res?: number
  boss?: boolean
}

interface Def {
  id: string
  name: string
  level: number
  mods: Mods
  specials: Special[]
}

const mk = (id: string, name: string, level: number, mods: Mods, specials: Special[] = []): Def => ({ id, name, level, mods, specials })

/** 회차가 오를 때마다 모든 몬스터의 레벨이 이만큼 오른다 (1회차 최종 보스 레벨) */
export const CYCLE_LEVELS = 26

const BOSS_HP = 2.6
const BOSS_ATK = 1.2

/** 레벨 기준선 × 몬스터별 배율. 밸런스는 기준선 한 곳에서 조절한다. */
function build({ id, name, level, mods, specials }: Def, cycle: number): Monster {
  const boss = mods.boss ?? false
  const l = level + cycle * CYCLE_LEVELS
  return {
    id,
    name,
    level: l,
    hp: Math.round((25 + 16 * l + 0.58 * l * l) * (mods.hp ?? 1) * (boss ? BOSS_HP : 1)),
    atk: Math.round((10 + 4.6 * l) * (mods.atk ?? 1) * (boss ? BOSS_ATK : 1)),
    def: Math.round((2 + 1.6 * l) * (mods.def ?? 1)),
    res: Math.round((2 + 1.6 * l) * (mods.res ?? 1)),
    exp: Math.round((3 + 4 * Math.pow(l, 1.5)) * (boss ? 6 : 1)),
    gold: Math.round((4 + 6 * Math.pow(l, 1.2)) * (boss ? 8 : 1)),
    boss,
    specials,
  }
}

const DEFS: Def[] = [
  // 몬스터의 초원
  mk('slime', '슬라임', 1, { hp: 0.8, atk: 0.8, def: 0.5 }),
  mk('goblin', '고블린', 2, {}, [{ kind: 'double', name: '연속 찌르기', chance: 0.2 }]),
  mk('kobold', '코볼트', 3, { def: 1.2 }, [{ kind: 'heavy', name: '곡괭이 내려찍기', chance: 0.25 }]),
  mk('ogre', '오우거', 5, { boss: true, hp: 0.85 }, [{ kind: 'charge', name: '몽둥이 풀스윙', chance: 0.3 }]),
  // 늑대의 굴
  mk('wild-dog', '들개', 6, { hp: 0.85 }, [{ kind: 'double', name: '물어뜯기', chance: 0.25 }]),
  mk('wolf', '늑대', 7, {}, [{ kind: 'heavy', name: '목덜미 물기', chance: 0.25 }]),
  mk('alpha-wolf', '알파늑대', 9, { atk: 1.1 }, [{ kind: 'double', name: '사냥 본능', chance: 0.3 }]),
  mk('werewolf', '웨어울프', 11, { boss: true, hp: 0.9, atk: 0.9 }, [
    { kind: 'charge', name: '광란의 발톱', chance: 0.3 },
    { kind: 'double', name: '할퀴기', chance: 0.25 },
  ]),
  // 엘프의 숲
  mk('pixie', '픽시', 12, { hp: 0.7, def: 0.7, res: 1.6 }, [{ kind: 'drain', name: '정기 흡수', chance: 0.3 }]),
  mk('dark-elf', '다크엘프', 14, { res: 1.3 }, [{ kind: 'poison', name: '독화살', chance: 0.3 }]),
  mk('treant', '트렌트', 16, { hp: 1.3, def: 1.7, res: 0.5, atk: 0.9 }, [{ kind: 'heavy', name: '뿌리 내려치기', chance: 0.25 }]),
  mk('elf-queen', '엘프여왕', 18, { boss: true, res: 1.5, hp: 1.1 }, [
    { kind: 'charge', name: '정령의 심판', chance: 0.3 },
    { kind: 'drain', name: '생명의 덩굴', chance: 0.2 },
  ]),
  // 뱀파이어의 성
  mk('bat', '흡혈박쥐', 19, { hp: 0.7 }, [{ kind: 'drain', name: '흡혈', chance: 0.35 }]),
  mk('zombie', '좀비', 21, { hp: 1.4, atk: 0.9, def: 0.8 }, [{ kind: 'poison', name: '썩은 손톱', chance: 0.3 }]),
  mk('gargoyle', '가고일', 23, { def: 1.8, res: 0.6 }, [{ kind: 'stun', name: '돌날개 강타', chance: 0.25 }]),
  mk('vampire-lord', '뱀파이어 로드', 26, { boss: true, hp: 1.1, res: 1.6 }, [
    { kind: 'charge', name: '피의 만찬', chance: 0.3 },
    { kind: 'drain', name: '흡혈', chance: 0.3 },
  ]),
  // 엔딩 이후의 숨은 보스
  mk('ancient-dragon', '고룡', 32, { boss: true, hp: 1.15 }, [
    { kind: 'charge', name: '멸망의 숨결', chance: 0.35 },
    { kind: 'heavy', name: '꼬리 휩쓸기', chance: 0.25 },
  ]),
]

/** 1회차 기준 몬스터 목록 */
export const MONSTERS: Monster[] = DEFS.map((d) => build(d, 0))

const cache = new Map<string, Monster>()

export const monsterById = (id: string, cycle = 0): Monster => {
  const key = `${id}:${cycle}`
  let m = cache.get(key)
  if (!m) {
    const def = DEFS.find((d) => d.id === id)
    if (!def) throw new Error(`unknown monster: ${id}`)
    cache.set(key, (m = build(def, cycle)))
  }
  return m
}
