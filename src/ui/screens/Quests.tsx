import { potionById } from '../../game/data/items'
import { QUESTS, questTarget } from '../../game/data/quests'
import { isQuestDone, isQuestVisible } from '../../game/engine'
import type { Action, GameState } from '../../game/types'
import { Bar, Gold, Modal } from '../common'

/** 보상을 받을 수 있는 의뢰 수 (HUD 배지용) */
export const claimableQuests = (game: GameState) =>
  QUESTS.filter((q) => isQuestVisible(game, q.id) && isQuestDone(game, q.id) && !game.quests[q.id].claimed).length

interface Props {
  game: GameState
  act: (a: Action) => GameState
  onClose: () => void
}

export function Quests({ game, act, onClose }: Props) {
  // 받을 수 있는 것 → 진행 중 → 완료 순
  const rank = (id: string) => (game.quests[id].claimed ? 2 : isQuestDone(game, id) ? 0 : 1)
  const quests = QUESTS.filter((q) => isQuestVisible(game, q.id)).sort((a, b) => rank(a.id) - rank(b.id))
  return (
    <Modal title="의뢰 게시판" onClose={onClose} wide>
      <ul className="quests">
        {quests.map((q) => {
          const state = game.quests[q.id]
          const done = isQuestDone(game, q.id)
          return (
            <li key={q.id} className={`quest ${state.claimed ? 'quest-claimed' : ''}`}>
              <div className="quest-info">
                <strong>{q.title}</strong>
                <small>{q.desc}</small>
                <Bar kind="exp" value={state.progress} max={questTarget(q)} />
              </div>
              <div className="quest-reward">
                <Gold amount={q.reward.gold} />
                {q.reward.points && <span>스텟 +{q.reward.points}</span>}
                {q.reward.potion && <span>{potionById(q.reward.potion).name}</span>}
              </div>
              {state.claimed ? (
                <span className="owned">완료</span>
              ) : (
                <button className="btn btn-buy btn-primary" disabled={!done} onClick={() => act({ type: 'claimQuest', questId: q.id })}>
                  {done ? '보상 받기' : '진행 중'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}
