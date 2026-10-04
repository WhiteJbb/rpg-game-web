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

/**
 * 1회차 범위(숨은 보스 레벨)까지는 제곱 곡선, 그 뒤로는 직선으로 오른다. 플레이어의 성장(레벨당 스텟, 강화)이
 * 직선이라 제곱 곡선을 그대로 두면 회차가 오를수록 전투가 한없이 길어진다. 2회차 이후의 난이도는 두 기울기로 맞춘다.
 */
const CURVE_END = 32
const HP_SLOPE = 62
const ATK_SLOPE = 6.5
const curve = (l: number, a: number, b: number, c: number, slope: number) => {
  const m = Math.min(l, CURVE_END)
  return c + b * m + a * m * m + slope * (l - m)
}

/** 레벨 기준선 × 몬스터별 배율. 밸런스는 기준선 한 곳에서 조절한다. */
function build({ id, name, level, mods, specials }: Def, cycle: number): Monster {
  const boss = mods.boss ?? false
  const l = level + cycle * CYCLE_LEVELS
  return {
    id,
    name,
    level: l,
    // 제곱 항은 전직(Lv.10) 이후 강해지는 플레이어를 따라가기 위한 것
    hp: Math.round(curve(l, 0.68, 16, 25, HP_SLOPE) * (mods.hp ?? 1) * (boss ? BOSS_HP : 1)),
    atk: Math.round(curve(l, 0.018, 4.6, 10, ATK_SLOPE) * (mods.atk ?? 1) * (boss ? BOSS_ATK : 1)),
    def: Math.round((2 + 1.6 * l) * (mods.def ?? 1)),
    // 마법 저항은 곡선 끝에서 멈춘다. 저항 공식이 비율식이라, 계속 오르면 지력을 올려도 마법 피해가 늘지 않는다
    res: Math.round((2 + 1.6 * Math.min(l, CURVE_END)) * (mods.res ?? 1)),
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
  mk('elf-queen', '엘프여왕', 18, { boss: true, res: 1.5, hp: 1.15, atk: 1.12 }, [
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
  mk('lich-king', '망자의 왕', 32, { boss: true, hp: 1.05, res: 1.8 }, [
    { kind: 'charge', name: '죽음의 선고', chance: 0.3 },
    { kind: 'drain', name: '영혼 흡수', chance: 0.25 },
    { kind: 'poison', name: '역병', chance: 0.2 },
  ]),
  mk('night-avatar', '밤의 화신', 32, { boss: true, hp: 1.2, def: 1.3, res: 1.3 }, [
    { kind: 'charge', name: '끝없는 밤', chance: 0.35 },
    { kind: 'stun', name: '별의 추락', chance: 0.2 },
    { kind: 'double', name: '초승달 베기', chance: 0.25 },
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
