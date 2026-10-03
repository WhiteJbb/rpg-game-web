import { useEffect, useRef, useState } from 'react'
import { POTIONS, SPELLS, potionById, spellById } from '../../game/data/items'
import { monsterById } from '../../game/data/monsters'
import * as R from '../../game/rules'
import type { Action, GameEvent, GameState, Victory } from '../../game/types'
import { Art, Scene } from '../art'
import { Bar, Gold, Modal, josa } from '../common'

export type BattleOutcome = { type: 'victory'; victory: Victory } | { type: 'defeat' } | { type: 'fled' }

interface Props {
  game: GameState
  monsterId: string
  regionId: string
  act: (a: Action) => GameState
  onExit: (outcome: BattleOutcome) => void
}

interface Fx {
  key: number
  target: 'monster' | 'player'
  text: string
  kind: 'dmg' | 'crit' | 'heal' | 'miss'
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function Battle({ game, monsterId, regionId, act, onExit }: Props) {
  const m = monsterById(monsterId)
  const p = game.player
  // 화면에 보이는 수치. 이벤트를 하나씩 연출하면서 따라간다.
  const [shown, setShown] = useState({ php: p.hp, pmp: p.mp, mhp: game.battle?.monsterHp ?? m.hp })
  const [busy, setBusy] = useState(false)
  const [fx, setFx] = useState<Fx | null>(null)
  const [anim, setAnim] = useState<'' | 'monster-hit' | 'monster-lunge' | 'monster-dead' | 'spell'>('')
  const [caption, setCaption] = useState(
    game.battle?.charging ? `${josa(m.name, '이', '가')} 힘을 모으고 있다... (${game.battle.charging})` : `${josa(m.name, '이', '가')} 나타났다!`,
  )
  const [charging, setCharging] = useState(game.battle?.charging ?? null)
  const [menu, setMenu] = useState<null | 'spell' | 'potion'>(null)
  const [result, setResult] = useState<Extract<GameEvent, { t: 'victory' | 'defeat' }> | null>(null)
  const alive = useRef(true)
  const fxKey = useRef(0)
  useEffect(() => {
    alive.current = true
    return () => void (alive.current = false)
  }, [])

  const pop = (target: Fx['target'], text: string, kind: Fx['kind']) => setFx({ key: ++fxKey.current, target, text, kind })

  async function play(e: GameEvent) {
    switch (e.t) {
      case 'playerAttack':
        setCaption(e.crit ? '치명타!' : `${p.name}의 공격!`)
        setAnim('monster-hit')
        pop('monster', `${e.dmg}`, e.crit ? 'crit' : 'dmg')
        setShown((s) => ({ ...s, mhp: e.monsterHp }))
        return sleep(650)
      case 'playerSpell':
        setCaption(`${spellById(e.spellId).name}!`)
        setAnim('spell')
        await sleep(350)
        setAnim('monster-hit')
        pop('monster', `${e.dmg}`, 'crit')
        setShown((s) => ({ ...s, mhp: e.monsterHp, pmp: e.mp }))
        return sleep(650)
      case 'playerDefend':
        setCaption('몸을 웅크리고 방어 태세를 취했다.')
        setShown((s) => ({ ...s, pmp: s.pmp + e.mp }))
        return sleep(450)
      case 'potion':
        setCaption(`${josa(potionById(e.potionId).name, '을', '를')} 마셨다.`)
        pop('player', e.hp > 0 ? `+${e.hp}` : `+${e.mp} MP`, 'heal')
        setShown((s) => ({ ...s, php: s.php + e.hp, pmp: s.pmp + e.mp }))
        return sleep(600)
      case 'fleeFail':
        setCaption('도망치지 못했다!')
        return sleep(600)
      case 'monsterCharge':
        setCharging(e.skill)
        setCaption(`${josa(m.name, '이', '가')} 힘을 모으고 있다... (${e.skill})`)
        return sleep(800)
      case 'monsterAttack':
        setCharging(null)
        setCaption(e.skill ? `${m.name}의 ${e.skill}!` : `${m.name}의 공격!`)
        setAnim('monster-lunge')
        await sleep(250)
        pop('player', e.dodged ? '회피!' : `${e.dmg}`, e.dodged ? 'miss' : 'dmg')
        setShown((s) => ({ ...s, php: e.playerHp, mhp: e.monsterHp }))
        return sleep(600)
      case 'victory':
        setAnim('monster-dead')
        setCaption(`${josa(m.name, '을', '를')} 쓰러뜨렸다!`)
        await sleep(700)
        return setResult(e)
      case 'defeat':
        setCaption('눈앞이 캄캄해진다...')
        await sleep(700)
        return setResult(e)
    }
  }

  async function run(action: Action) {
    if (busy || result) return
    const next = act(action)
    if (next.events.some((e) => e.t === 'error')) return
    setMenu(null)
    setBusy(true)
    for (const e of next.events) {
      if (!alive.current) return
      if (e.t === 'fled') return onExit({ type: 'fled' })
      setAnim('')
      await play(e)
    }
    if (alive.current) setBusy(false)
  }

  const locked = busy || result !== null
  return (
    <Scene bg={regionId} className={`battle-scene ${anim === 'spell' ? 'flash' : ''}`}>
      <div className="enemy">
        <div className="enemy-plate panel">
          <strong>
            {m.boss && <span className="boss-tag">BOSS</span>} {m.name} <span className="lv">Lv.{m.level}</span>
          </strong>
          <Bar kind="enemy" value={shown.mhp} max={m.hp} />
        </div>
        <div className={`enemy-body ${anim} ${charging ? 'charging' : ''}`}>
          <Art kind="monsters" id={m.id} alt={m.name} className="enemy-art" fallback="👾" />
          {fx?.target === 'monster' && (
            <span key={fx.key} className={`pop pop-${fx.kind}`}>
              {fx.text}
            </span>
          )}
        </div>
      </div>

      <div className="battle-bottom">
        <p className="caption" aria-live="polite">
          {caption}
        </p>
        <div className="battle-row">
          <div className={`panel player-plate ${fx?.target === 'player' && fx.kind === 'dmg' ? 'shake' : ''}`} key={fx?.target === 'player' ? fx.key : 0}>
            <strong>
              {p.name} <span className="lv">Lv.{p.level}</span>
            </strong>
            {/* 결과가 나온 뒤에는 실제 값(레벨업 회복 포함)을 보여준다 */}
            <Bar kind="hp" label="HP" value={result?.t === 'victory' ? p.hp : shown.php} max={R.maxHp(p)} />
            <Bar kind="mp" label="MP" value={result?.t === 'victory' ? p.mp : shown.pmp} max={R.maxMp(p)} />
            {fx?.target === 'player' && (
              <span key={fx.key} className={`pop pop-${fx.kind}`}>
                {fx.text}
              </span>
            )}
          </div>

          {menu === null && (
            <div className="actions">
              <button className="btn btn-primary" disabled={locked} onClick={() => run({ type: 'attack' })}>
                공격
              </button>
              <button className="btn" disabled={locked} onClick={() => setMenu('spell')}>
                마법
              </button>
              <button className={`btn ${charging ? 'btn-hint' : ''}`} disabled={locked} onClick={() => run({ type: 'defend' })}>
                방어
              </button>
              <button className="btn" disabled={locked} onClick={() => setMenu('potion')}>
                포션
              </button>
              <button className="btn" disabled={locked || m.boss} onClick={() => run({ type: 'flee' })}>
                도망
              </button>
            </div>
          )}
          {menu === 'spell' && (
            <div className="actions actions-list">
              {SPELLS.filter((sp) => p.spells.includes(sp.id)).map((sp) => (
                <button key={sp.id} className="btn btn-item" disabled={locked || shown.pmp < sp.mp} onClick={() => run({ type: 'cast', spellId: sp.id })}>
                  <Art kind="items" id={sp.id} alt="" className="icon" fallback="✨" />
                  {sp.name}
                  <small>
                    위력 {sp.power} · MP {sp.mp}
                  </small>
                </button>
              ))}
              <button className="btn" onClick={() => setMenu(null)}>
                뒤로
              </button>
            </div>
          )}
          {menu === 'potion' && (
            <div className="actions actions-list">
              {POTIONS.map((po) => (
                <button key={po.id} className="btn btn-item" disabled={locked || p.potions[po.id] < 1} onClick={() => run({ type: 'usePotion', potionId: po.id })}>
                  <Art kind="items" id={po.id} alt="" className="icon" fallback="🧪" />
                  {po.name}
                  <small>×{p.potions[po.id]}</small>
                </button>
              ))}
              <button className="btn" onClick={() => setMenu(null)}>
                뒤로
              </button>
            </div>
          )}
        </div>
      </div>

      {result?.t === 'victory' && (
        <Modal title="승리!">
          <ul className="rewards">
            <li>경험치 +{result.exp}</li>
            <li>
              <Gold amount={result.gold} />
            </li>
            {result.drops.map((id, i) => (
              <li key={i}>
                <Art kind="items" id={id} alt="" className="icon-inline" fallback="🧪" /> {potionById(id).name}
              </li>
            ))}
          </ul>
          {result.levelUps > 0 && (
            <p className="levelup">
              레벨 업! Lv.{p.level} <small>스텟 포인트 +{result.levelUps * R.POINTS_PER_LEVEL}, HP·MP 회복</small>
            </p>
          )}
          <button className="btn btn-primary" autoFocus onClick={() => onExit({ type: 'victory', victory: result })}>
            계속
          </button>
        </Modal>
      )}
      {result?.t === 'defeat' && (
        <Modal title="쓰러졌다...">
          <p>정신을 차려 보니 마을 여관이었다.</p>
          {result.goldLost > 0 && (
            <p className="reward-line">
              치료비로 <Gold amount={result.goldLost} /> 를 잃었다.
            </p>
          )}
          <button className="btn btn-primary" autoFocus onClick={() => onExit({ type: 'defeat' })}>
            마을로
          </button>
        </Modal>
      )}
    </Scene>
  )
}
