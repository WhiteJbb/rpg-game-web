import type { Player } from '../types'

export type JobId = 'warrior' | 'mage' | 'rogue'

export interface Job {
  id: JobId
  name: string
  desc: string
  /** 전직 조건 설명과 판정 (직접 찍은 스텟 기준, 장비 보너스 제외) */
  requirement: string
  meets: (p: Player) => boolean
  passive: string
  skill: { name: string; mp: number; desc: string }
}

export const JOB_LEVEL = 10
const NEED = 25

export const JOBS: Job[] = [
  {
    id: 'warrior',
    name: '전사',
    desc: '무거운 갑옷과 한 방. 맞으면서 버티고 더 세게 돌려준다.',
    requirement: `힘 ${NEED} 이상`,
    meets: (p) => p.stats.str >= NEED,
    passive: '최대 HP +10%',
    skill: { name: '강타', mp: 20, desc: '강한 일격. 적 방어의 절반을 무시한다' },
  },
  {
    id: 'mage',
    name: '마법사',
    desc: '마력을 다루는 법을 깨우쳤다. 마법을 더 자주, 더 세게 쓴다.',
    requirement: `지력 ${NEED} 이상`,
    meets: (p) => p.stats.int >= NEED,
    passive: '마법 MP 소모 -20%',
    skill: { name: '명상', mp: 0, desc: 'MP를 크게 회복하고 다음 마법을 1.5배로 강화한다' },
  },
  {
    id: 'rogue',
    name: '도적',
    desc: '빠르고 정확하게. 급소를 노리고, 맞기 전에 피한다.',
    requirement: `민첩 + 치명 ${NEED} 이상`,
    meets: (p) => p.stats.agi + p.stats.crit >= NEED,
    passive: '회피 +10% (상한 55%)',
    skill: { name: '급소 찌르기', mp: 18, desc: '반드시 치명타. 적을 중독시킨다' },
  },
]

export const jobById = (id: string): Job => {
  const j = JOBS.find((j) => j.id === id)
  if (!j) throw new Error(`unknown job: ${id}`)
  return j
}

export const canTakeJob = (p: Player, id: JobId) => p.level >= JOB_LEVEL && jobById(id).meets(p)
