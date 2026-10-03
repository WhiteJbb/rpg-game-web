import type { PotionId } from '../types'

/** 배수(gold, exp)는 그 지역 첫 몬스터의 보상 기준, 비율(hp, mp)은 최대치 기준. */
export interface Outcome {
  weight: number
  text: string
  gold?: number
  exp?: number
  hp?: number
  mp?: number
  potion?: PotionId
  /** 몬스터가 덮친다 */
  ambush?: boolean
}

export interface Choice {
  label: string
  cost?: { gold?: number; potion?: PotionId }
  outcomes: Outcome[]
}

export interface EventDef {
  id: string
  title: string
  text: string
  /** 다쳤을 때만 등장 */
  onlyWhenHurt?: boolean
  /** 마지막 선택지는 항상 비용 없이 지나갈 수 있어야 한다 */
  choices: Choice[]
}

const pass = (label: string, text: string): Choice => ({ label, outcomes: [{ weight: 1, text }] })

export const EVENTS: EventDef[] = [
  {
    id: 'chest',
    title: '낡은 보물상자',
    text: '수풀 사이에 낡은 상자가 놓여 있다. 뚜껑 틈으로 금빛이 새어 나온다.',
    choices: [
      {
        label: '열어 본다',
        outcomes: [
          { weight: 65, text: '금화가 가득 들어 있었다!', gold: 4 },
          { weight: 15, text: '금화 위에 포션까지 얹혀 있었다. 오늘 운수 좋은 날.', gold: 2, potion: 'hp-m' },
          { weight: 20, text: '상자가 아니었다! 숨어 있던 몬스터가 덮쳐 온다!', ambush: true },
        ],
      },
      pass('그냥 지나간다', '수상한 건 건드리지 않는 게 상책이다.'),
    ],
  },
  {
    id: 'spring',
    title: '맑은 샘물',
    text: '바위틈에서 맑은 물이 솟아오른다. 보기만 해도 기운이 난다.',
    onlyWhenHurt: true,
    choices: [
      { label: '벌컥벌컥 마신다', outcomes: [{ weight: 1, text: '온몸에 힘이 돌아온다.', hp: 0.4, mp: 0.4 }] },
      { label: '병에 담아 간다', outcomes: [{ weight: 1, text: '빈 병에 샘물을 담았다. 포션 대신 쓸 수 있겠다.', potion: 'hp-s' }] },
    ],
  },
  {
    id: 'merchant',
    title: '떠돌이 상인',
    text: '"어이, 모험가 양반! 뭐가 들었는지는 나도 모르는 물약, 싸게 줄게."',
    choices: [
      {
        label: '수상한 물약을 산다',
        cost: { gold: 3 },
        outcomes: [
          { weight: 45, text: '제법 쓸 만한 포션이었다.', potion: 'hp-m' },
          { weight: 25, text: '푸른빛이 도는 MP 포션이었다.', potion: 'mp' },
          { weight: 15, text: '이건... 최고급 포션이잖아! 상인이 뒤늦게 아까워한다.', potion: 'hp-l' },
          { weight: 15, text: '그냥 맹물이었다. 상인은 벌써 저만치 달아났다.' },
        ],
      },
      pass('거절한다', '"쳇, 안목이 없구먼." 상인은 투덜대며 떠났다.'),
    ],
  },
  {
    id: 'bush',
    title: '수상한 덤불',
    text: '덤불이 부스럭거린다. 안에서 무언가 반짝이는 것 같기도 하다.',
    choices: [
      {
        label: '헤쳐 본다',
        outcomes: [
          { weight: 45, text: '누군가 떨어뜨린 지갑을 주웠다.', gold: 3 },
          { weight: 30, text: '가시덤불이었다! 온몸이 따끔거린다.', hp: -0.15 },
          { weight: 25, text: '반짝이던 건 몬스터의 눈이었다!', ambush: true },
        ],
      },
      pass('돌아서 간다', '괜한 호기심은 접어 두기로 했다.'),
    ],
  },
  {
    id: 'traveler',
    title: '다친 여행자',
    text: '길가에 여행자가 주저앉아 있다. "몬스터에게 당했어요... 혹시 포션 있으신가요?"',
    choices: [
      {
        label: 'HP 포션(소)을 건넨다',
        cost: { potion: 'hp-s' },
        outcomes: [
          { weight: 70, text: '"고맙습니다! 이건 제가 길에서 배운 요령이에요." 값진 경험을 얻었다.', exp: 6 },
          { weight: 30, text: '"은혜는 잊지 않겠습니다." 여행자가 묵직한 주머니를 쥐여 주었다.', gold: 6, exp: 2 },
        ],
      },
      pass('못 본 척 지나간다', '마음이 조금 무겁다.'),
    ],
  },
  {
    id: 'statue',
    title: '오래된 석상',
    text: '이끼 낀 석상 앞에 빈 그릇이 놓여 있다. 왠지 뭔가 바라는 눈치다.',
    choices: [
      {
        label: '골드를 바친다',
        cost: { gold: 2 },
        outcomes: [
          { weight: 70, text: '석상의 눈이 잠깐 빛났다. 몸이 가벼워진다.', hp: 1, mp: 1 },
          { weight: 30, text: '머릿속에 낯선 지식이 흘러들어온다.', exp: 8 },
        ],
      },
      {
        label: '기도만 한다',
        outcomes: [
          { weight: 50, text: '마음이 차분해진다.', mp: 0.5 },
          { weight: 30, text: '아무 일도 일어나지 않았다.' },
          { weight: 20, text: '"빈손으로 왔느냐." 머리 위로 돌멩이가 떨어졌다.', hp: -0.1 },
        ],
      },
      pass('지나간다', '석상이 뒤통수를 노려보는 기분이 든다.'),
    ],
  },
]

export const eventById = (id: string): EventDef => {
  const e = EVENTS.find((e) => e.id === id)
  if (!e) throw new Error(`unknown event: ${id}`)
  return e
}
