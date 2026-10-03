import { QUESTS } from '../../game/data/quests'
import type { GameState } from '../../game/types'
import { Scene } from '../art'

export function Ending({ game, onContinue }: { game: GameState; onContinue: () => void }) {
  const claimed = QUESTS.filter((q) => game.quests[q.id].claimed).length
  return (
    <Scene bg="ending" className="ending-scene">
      <h1 className="logo">
        행성 <span>:</span> 지구
      </h1>
      <div className="panel ending-card">
        <h2>{game.player.name}의 모험 끝</h2>
        <dl className="record">
          <dt>레벨</dt>
          <dd>{game.player.level}</dd>
          <dt>승리</dt>
          <dd>{game.record.wins}회</dd>
          <dt>쓰러진 횟수</dt>
          <dd>{game.record.defeats}회</dd>
          <dt>완료한 의뢰</dt>
          <dd>
            {claimed} / {QUESTS.length}
          </dd>
        </dl>
        <p>플레이해 주셔서 감사합니다.</p>
        <button className="btn btn-primary" autoFocus onClick={onContinue}>
          마을로 돌아가 계속하기
        </button>
      </div>
    </Scene>
  )
}
