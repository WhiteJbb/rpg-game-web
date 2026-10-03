import { useState } from 'react'
import { eventById } from '../../game/data/events'
import { potionById } from '../../game/data/items'
import { monsterById } from '../../game/data/monsters'
import { regionById } from '../../game/data/regions'
import { canChallengeBoss, canChallengeSecret, choiceGoldCost } from '../../game/engine'
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

type Result = Extract<GameEvent, { t: 'eventResult' }> & { eventId: string; ambush: string | null }

export function Region({ game, regionId, act, onBattle, onBack }: Props) {
  const region = regionById(regionId)
  const progress = game.progress[regionId]
  const boss = monsterById(region.boss, game.cycle)
  const secret = canChallengeSecret(game, regionId) ? monsterById(region.secretBoss!, game.cycle) : null
  const [result, setResult] = useState<Result | null>(null)

  const go = (action: Action) => {
    for (const e of act(action).events) if (e.t === 'encounter') onBattle(e.monsterId)
  }

  const choose = (eventId: string, index: number) => {
    const events = act({ type: 'choose', index }).events
    const r = events.find((e) => e.t === 'eventResult')
    if (!r || r.t !== 'eventResult') return
    const ambush = events.find((e) => e.t === 'encounter')
    setResult({ ...r, eventId, ambush: ambush?.t === 'encounter' ? ambush.monsterId : null })
  }

  const closeResult = () => {
    const ambush = result?.ambush
    setResult(null)
    if (ambush) onBattle(ambush)
  }

  const pending = game.pending && eventById(game.pending.eventId)
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
        {secret && (
          <button className="btn btn-boss btn-secret" onClick={() => go({ type: 'challengeBoss', regionId, secret: true })}>
            <Art kind="monsters" id={secret.id} alt="" className={`boss-thumb ${progress.secretDefeated ? '' : 'unknown'}`} fallback="🐉" />
            <span>
              {progress.secretDefeated ? `재도전 — ${secret.name}` : '지하에서 무언가 깨어났다...'}
              <small>권장 Lv.{secret.level + 4}</small>
            </span>
          </button>
        )}
        <button className="btn" onClick={onBack}>
          지도로 돌아가기
        </button>
      </div>

      {pending && (
        <Modal title={pending.title}>
          <Art kind="events" id={pending.id} alt="" className="event-art" fallback="❓" />
          <p>{pending.text}</p>
          <div className="choices">
            {pending.choices.map((c, i) => {
              const gold = choiceGoldCost(regionId, c, game.cycle)
              const potion = c.cost?.potion
              const unaffordable = game.player.gold < gold || (potion !== undefined && game.player.potions[potion] < 1)
              return (
                <button key={i} className={`btn ${i === 0 ? 'btn-primary' : ''}`} disabled={unaffordable} onClick={() => choose(pending.id, i)}>
                  {c.label}
                  {gold > 0 && <Gold amount={gold} />}
                  {potion && <small>(보유 {game.player.potions[potion]})</small>}
                </button>
              )
            })}
          </div>
        </Modal>
      )}

      {result && (
        <Modal title={eventById(result.eventId).title}>
          <Art kind="events" id={result.eventId} alt="" className="event-art" fallback="❓" />
          <p>{result.text}</p>
          <ul className="rewards">
            {result.gold > 0 && (
              <li>
                <Gold amount={result.gold} /> 획득
              </li>
            )}
            {result.exp > 0 && <li>경험치 +{result.exp}</li>}
            {result.hp !== 0 && <li className={result.hp < 0 ? 'loss' : ''}>HP {result.hp > 0 ? `+${result.hp}` : result.hp}</li>}
            {result.mp !== 0 && <li>MP +{result.mp}</li>}
            {result.potion && (
              <li>
                <Art kind="items" id={result.potion} alt="" className="icon-inline" fallback="🧪" /> {potionById(result.potion).name}
              </li>
            )}
            {result.levelUps > 0 && <li className="levelup">레벨 업! Lv.{game.player.level}</li>}
          </ul>
          <button className="btn btn-primary" autoFocus onClick={closeResult}>
            {result.ambush ? '싸운다!' : '계속'}
          </button>
        </Modal>
      )}
    </Scene>
  )
}
