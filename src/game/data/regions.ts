import type { PotionId } from '../types'

export interface Region {
  id: string
  name: string
  desc: string
  /** 일반 몬스터와 등장 가중치 */
  monsters: { id: string; weight: number }[]
  boss: string
  /** 엔딩 이후에만 도전할 수 있는 숨은 보스. 회차마다 다음 보스로 바뀌고, 끝까지 가면 처음부터 돈다 */
  secretBosses?: string[]
  /** 보스에게 도전하려면 이 지역에서 쓰러뜨려야 하는 수 */
  killsForBoss: number
  /** 이 지역의 보스를 쓰러뜨려야 입장 가능 */
  requires: string | null
  drops: { id: PotionId; chance: number }[]
}

export const REGIONS: Region[] = [
  {
    id: 'meadow',
    name: '몬스터의 초원',
    desc: '곳곳에서 섬뜩한 눈빛이 느껴진다...',
    monsters: [{ id: 'slime', weight: 50 }, { id: 'goblin', weight: 30 }, { id: 'kobold', weight: 20 }],
    boss: 'ogre',
    killsForBoss: 12,
    requires: null,
    drops: [{ id: 'hp-s', chance: 0.25 }],
  },
  {
    id: 'wolf-den',
    name: '늑대의 굴',
    desc: '축축한 굴 속에서 으르렁거리는 소리가 들린다...',
    monsters: [{ id: 'wild-dog', weight: 50 }, { id: 'wolf', weight: 30 }, { id: 'alpha-wolf', weight: 20 }],
    boss: 'werewolf',
    killsForBoss: 12,
    requires: 'meadow',
    drops: [{ id: 'hp-s', chance: 0.25 }, { id: 'hp-m', chance: 0.08 }],
  },
  {
    id: 'elf-forest',
    name: '엘프의 숲',
    desc: '고요한 숲에 정령들의 기척이 감돈다...',
    monsters: [{ id: 'pixie', weight: 50 }, { id: 'dark-elf', weight: 30 }, { id: 'treant', weight: 20 }],
    boss: 'elf-queen',
    killsForBoss: 12,
    requires: 'wolf-den',
    drops: [{ id: 'hp-m', chance: 0.2 }, { id: 'mp', chance: 0.1 }],
  },
  {
    id: 'vampire-castle',
    name: '뱀파이어의 성',
    desc: '차가운 성 안에서 피 냄새가 진동한다...',
    monsters: [{ id: 'bat', weight: 50 }, { id: 'zombie', weight: 30 }, { id: 'gargoyle', weight: 20 }],
    boss: 'vampire-lord',
    secretBosses: ['ancient-dragon', 'lich-king', 'night-avatar'],
    killsForBoss: 12,
    requires: 'elf-forest',
    drops: [{ id: 'hp-m', chance: 0.25 }, { id: 'hp-l', chance: 0.08 }, { id: 'mp', chance: 0.12 }],
  },
]

export const secretBossOf = (r: Region, cycle: number) => r.secretBosses?.[cycle % r.secretBosses.length]

export const isSecretBoss = (monsterId: string) => REGIONS.some((r) => r.secretBosses?.includes(monsterId))

export const regionById = (id: string): Region => {
  const r = REGIONS.find((r) => r.id === id)
  if (!r) throw new Error(`unknown region: ${id}`)
  return r
}
