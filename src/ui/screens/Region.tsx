import { useState } from 'react'
import { monsterById } from '../../game/data/monsters'
import { regionById } from '../../game/data/regions'
import { canChallengeBoss } from '../../game/engine'
import type { Action, GameEvent, GameState } from '../../game/types'
import { Art, Scene } from '../art'
import { Gold, Modal } from '../common'

interface Props {
  game: GameState
  regionId: string
  act: (a: Action) => GameState
  onBattle: (monsterId: string) => void
  onBack: () => void
}

export function Region({ game, regionId, act, onBattle, onBack }: Props) {
  const region = regionById(regionId)
  const progress = game.progress[regionId]
  const boss = monsterById(region.boss)
  const [found, setFound] = useState<Extract<GameEvent, { t: 'treasure' | 'spring' }> | null>(null)

  const go = (action: Action) => {
    for (const e of act(action).events) {
      if (e.t === 'encounter') onBattle(e.monsterId)
      else if (e.t === 'treasure' || e.t === 'spring') setFound(e)
    }
  }

  const bossReady = canChallengeBoss(game, regionId)
  return (
    <Scene bg={regionId} className="region-scene">
      <div className="region-head panel">
        <h2>{region.name}</h2>
        <p>{region.desc}</p>
      </div>
      <div className="region-actions">
        <button className="btn btn-primary btn-big" onClick={() => go({ type: 'explore', regionId })}>
          탐색하기
        </button>
        <button className="btn btn-boss" disabled={!bossReady} onClick={() => go({ type: 'challengeBoss', regionId })}>
          <Art kind="monsters" id={boss.id} alt="" className="boss-thumb" fallback="👑" />
          <span>
            {progress.bossDefeated ? '보스 재도전' : '보스 도전'} — {boss.name}
            <small>
              {bossReady ? `권장 Lv.${boss.level}` : `몬스터 ${progress.kills} / ${region.killsForBoss} 처치 시 등장`}
            </small>
          </span>
        </button>
        <button className="btn" onClick={onBack}>
          지도로 돌아가기
        </button>
      </div>
      {found && (
        <Modal title={found.t === 'treasure' ? '보물상자 발견!' : '맑은 샘물 발견!'} onClose={() => setFound(null)}>
          {found.t === 'treasure' ? (
            <p className="reward-line">
              <Gold amount={found.gold} /> 획득
            </p>
          ) : (
            <p className="reward-line">
              HP +{found.hp} · MP +{found.mp}
            </p>
          )}
          <button className="btn btn-primary" autoFocus onClick={() => setFound(null)}>
            좋아!
          </button>
        </Modal>
      )}
    </Scene>
  )
}
