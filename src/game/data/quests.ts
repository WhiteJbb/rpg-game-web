import { josa } from '../josa'
import type { PotionId } from '../types'
import { monsterById } from './monsters'
import { REGIONS } from './regions'

export type QuestGoal =
  | { kind: 'kill'; monsterId: string; count: number }
  | { kind: 'boss'; monsterId: string }
  | { kind: 'flawless'; count: number }

export interface Quest {
  id: string
  title: string
  desc: string
  /** 이 지역이 열려야 게시판에 나타난다 (null이면 처음부터) */
  regionId: string | null
  goal: QuestGoal
  reward: { gold: number; points?: number; potion?: PotionId }
}

export const questTarget = (q: Quest) => (q.goal.kind === 'boss' ? 1 : q.goal.count)

// 지역마다 사냥 의뢰 2개 + 보스 토벌 1개
const regionQuests: Quest[] = REGIONS.flatMap((r, i): Quest[] => {
  const [common, , rare] = r.monsters.map((m) => monsterById(m.id))
  const boss = monsterById(r.boss)
  const potion: PotionId = i < 2 ? 'hp-s' : 'hp-m'
  return [
    {
      id: `${r.id}-hunt`,
      title: `${common.name} 소탕`,
      desc: `${r.name}의 ${josa(common.name, '을', '를')} 6마리 처치`,
      regionId: r.id,
      goal: { kind: 'kill', monsterId: common.id, count: 6 },
      reward: { gold: common.gold * 8, potion },
    },
    {
      id: `${r.id}-rare`,
      title: `${rare.name} 사냥`,
      desc: `${r.name}의 ${josa(rare.name, '을', '를')} 3마리 처치`,
      regionId: r.id,
      goal: { kind: 'kill', monsterId: rare.id, count: 3 },
      reward: { gold: rare.gold * 6, points: 1 },
    },
    {
      id: `${r.id}-boss`,
      title: `${boss.name} 토벌`,
      desc: `${r.name}의 주인 ${josa(boss.name, '을', '를')} 쓰러뜨린다`,
      regionId: r.id,
      goal: { kind: 'boss', monsterId: boss.id },
      reward: { gold: boss.gold, points: 3 },
    },
  ]
})

export const QUESTS: Quest[] = [
  ...regionQuests,
  {
    id: 'flawless',
    title: '상처 하나 없이',
    desc: '한 대도 맞지 않고 전투에서 3번 승리',
    regionId: null,
    goal: { kind: 'flawless', count: 3 },
    reward: { gold: 150, points: 2 },
  },
]

export const questById = (id: string): Quest => {
  const q = QUESTS.find((q) => q.id === id)
  if (!q) throw new Error(`unknown quest: ${id}`)
  return q
}
