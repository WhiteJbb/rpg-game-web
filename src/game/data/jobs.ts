import type { JobId, Player } from '../types'

export type { JobId }
/** 계열: 2차 직업은 1차 직업의 계열을 이어받고 패시브·기술이 강해진다 */
export type JobLine = 'warrior' | 'mage' | 'rogue'

export interface Job {
  id: JobId
  name: string
  line: JobLine
  tier: 1 | 2
  /** 2차 직업: 이 직업이어야 전직할 수 있다 */
  from?: JobId
  desc: string
  /** 전직 조건 설명과 판정 (직접 찍은 스텟 기준, 장비 보너스 제외) */
  requirement: string
  /** 조건에 쓰이는 현재 수치 */
  current: (p: Player) => number
  passive: string
  skill: { name: string; mp: number; desc: string }
}

export const JOB_LEVEL = 10
export const JOB_NEED = 25
export const JOB2_LEVEL = 25
export const JOB2_NEED = 50

export const JOBS: Job[] = [
  {
    id: 'warrior',
    name: '전사',
    line: 'warrior',
    tier: 1,
    desc: '무거운 갑옷과 한 방. 맞으면서 버티고 더 세게 돌려준다.',
    requirement: `힘 ${JOB_NEED} 이상`,
    current: (p) => p.stats.str,
    passive: '최대 HP +10%',
    skill: { name: '강타', mp: 20, desc: '강한 일격. 적 방어의 절반을 무시한다' },
  },
  {
    id: 'mage',
    name: '마법사',
    line: 'mage',
    tier: 1,
    desc: '마력을 다루는 법을 깨우쳤다. 마법을 더 자주, 더 세게 쓴다.',
    requirement: `지력 ${JOB_NEED} 이상`,
    current: (p) => p.stats.int,
    passive: '마법 MP 소모 -20%',
    skill: { name: '명상', mp: 0, desc: 'MP를 크게 회복하고 다음 마법을 1.5배로 강화한다' },
  },
  {
    id: 'rogue',
    name: '도적',
    line: 'rogue',
    tier: 1,
    desc: '빠르고 정확하게. 급소를 노리고, 맞기 전에 피한다.',
    requirement: `민첩 + 치명 ${JOB_NEED} 이상`,
    current: (p) => p.stats.agi + p.stats.crit,
    passive: '회피 +10% (상한 55%)',
    skill: { name: '급소 찌르기', mp: 18, desc: '반드시 치명타. 적을 중독시킨다' },
  },
  {
    id: 'knight',
    name: '기사',
    line: 'warrior',
    tier: 2,
    from: 'warrior',
    desc: '왕국의 검. 더 두꺼운 갑옷을 입고, 어떤 방어도 부순다.',
    requirement: `전사 · Lv.${JOB2_LEVEL} · 힘 ${JOB2_NEED} 이상`,
    current: (p) => p.stats.str,
    passive: '최대 HP +20%',
    skill: { name: '파쇄', mp: 28, desc: '더 강한 일격. 적 방어를 전부 무시한다' },
  },
  {
    id: 'archmage',
    name: '대마법사',
    line: 'mage',
    tier: 2,
    from: 'mage',
    desc: '마력의 흐름을 지배한다. 마법이 숨 쉬듯 나온다.',
    requirement: `마법사 · Lv.${JOB2_LEVEL} · 지력 ${JOB2_NEED} 이상`,
    current: (p) => p.stats.int,
    passive: '마법 MP 소모 -35%',
    skill: { name: '마력 폭주', mp: 0, desc: 'MP를 절반 회복하고 다음 마법을 2배로 강화한다' },
  },
  {
    id: 'assassin',
    name: '암살자',
    line: 'rogue',
    tier: 2,
    from: 'rogue',
    desc: '그림자에서 그림자로. 한 번 찔리면 끝까지 퍼진다.',
    requirement: `도적 · Lv.${JOB2_LEVEL} · 민첩 + 치명 ${JOB2_NEED} 이상`,
    current: (p) => p.stats.agi + p.stats.crit,
    passive: '회피 +15% (상한 60%)',
    skill: { name: '암살', mp: 26, desc: '반드시 치명타, 더 세게. 더 독한 독이 더 오래 퍼진다' },
  },
]

export const jobById = (id: string): Job => {
  const j = JOBS.find((j) => j.id === id)
  if (!j) throw new Error(`unknown job: ${id}`)
  return j
}

export const jobLine = (id: JobId | null): JobLine | null => (id ? jobById(id).line : null)
export const jobTier = (id: JobId | null): 0 | 1 | 2 => (id ? jobById(id).tier : 0)
/** 전직 조건에 필요한 수치 */
export const jobNeed = (job: Job) => (job.tier === 2 ? JOB2_NEED : JOB_NEED)

export const canTakeJob = (p: Player, id: JobId) => {
  const j = jobById(id)
  if (j.tier === 2) return p.job === j.from && p.level >= JOB2_LEVEL && j.current(p) >= JOB2_NEED
  return p.level >= JOB_LEVEL && j.current(p) >= JOB_NEED
}
