import { useState } from 'react'
import { QUESTS } from '../../game/data/quests'
import type { GameState } from '../../game/types'
import { Scene } from '../art'
import { Confirm } from '../common'

export function Ending({ game, onContinue, onNewCycle }: { game: GameState; onContinue: () => void; onNewCycle: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const claimed = QUESTS.filter((q) => game.quests[q.id].claimed).length
  return (
    <Scene bg="ending" className="ending-scene">
      <h1 className="logo">
        행성 <span>:</span> 지구
      </h1>
      <div className="panel ending-card">
        <h2>
          {game.player.name}의 모험 끝{game.cycle > 0 && ` (${game.cycle + 1}회차)`}
        </h2>
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
        <div className="choices">
          <button className="btn btn-primary" autoFocus onClick={onContinue}>
            마을로 돌아가 계속하기
          </button>
          <button className="btn" onClick={() => setConfirming(true)}>
            {game.cycle + 2}회차 시작
          </button>
        </div>
        <small>성 지하에서 무언가 깨어난 기척이 느껴진다...</small>
      </div>
      {confirming && (
        <Confirm
          text="레벨·스텟·장비·골드는 그대로 두고 세계를 처음으로 되돌립니다. 몬스터가 훨씬 강해지고, 지역과 의뢰 진행은 초기화됩니다."
          yes="다음 회차로"
          onYes={onNewCycle}
          onNo={() => setConfirming(false)}
        />
      )}
    </Scene>
  )
}
