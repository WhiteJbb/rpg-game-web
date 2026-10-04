import { useEffect, useRef, useState } from 'react'
import { POTIONS, SPELLS, equipById, potionById, spellById } from '../../game/data/items'
import { monsterById } from '../../game/data/monsters'
import * as R from '../../game/rules'
import type { Action, GameEvent, GameState, StatusKind, Victory } from '../../game/types'
import { jobById } from '../../game/data/jobs'
import { Art, Scene, artUrl, heroArt } from '../art'
import { Bar, Gold, Modal, josa } from '../common'
import { sfx } from '../sfx'

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

const STATUS_NAME: Record<StatusKind, string> = { burn: '화상', chill: '빙결', stun: '기절', poison: '중독', venom: '맹독' }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function Battle({ game, monsterId, regionId, act, onExit }: Props) {
  const m = monsterById(monsterId, game.cycle)
  const p = game.player
  // 화면에 보이는 수치. 이벤트를 하나씩 연출하면서 따라간다.
  const [shown, setShown] = useState({ php: p.hp, pmp: p.mp, mhp: game.battle?.monsterHp ?? m.hp })
  const [busy, setBusy] = useState(false)
  const [fx, setFx] = useState<Fx | null>(null)
  const [anim, setAnim] = useState<'' | 'monster-hit' | 'monster-lunge' | 'monster-dead' | 'spell'>('')
  const [heroAnim, setHeroAnim] = useState<'' | 'hero-attack' | 'hero-cast' | 'hero-hurt'>('')
  const [spellFx, setSpellFx] = useState<{ key: number; id: string } | null>(null)
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
        sfx(e.crit ? 'crit' : 'hit')
        setHeroAnim('hero-attack')
        setCaption(e.crit ? '치명타!' : `${p.name}의 공격!`)
        setAnim('monster-hit')
        pop('monster', `${e.dmg}`, e.crit ? 'crit' : 'dmg')
        setShown((s) => ({ ...s, mhp: e.monsterHp }))
        return sleep(650)
      case 'playerSpell':
        setCaption(`${spellById(e.spellId).name}!`)
        setAnim('spell')
        setHeroAnim('hero-cast')
        setSpellFx({ key: ++fxKey.current, id: e.spellId })
        sfx('spell')
        await sleep(350)
        sfx('hit')
        setAnim('monster-hit')
        pop('monster', `${e.dmg}`, 'crit')
        setShown((s) => ({ ...s, mhp: e.monsterHp, pmp: e.mp }))
        return sleep(650)
      case 'playerDefend':
        sfx('defend')
        setCaption('몸을 웅크리고 방어 태세를 취했다.')
        setShown((s) => ({ ...s, pmp: s.pmp + e.mp }))
        return sleep(450)
      case 'potion':
        setCaption(`${josa(potionById(e.potionId).name, '을', '를')} 마셨다.`)
        sfx('heal')
        pop('player', e.hp > 0 ? `+${e.hp}` : `+${e.mp} MP`, 'heal')
        setShown((s) => ({ ...s, php: s.php + e.hp, pmp: s.pmp + e.mp }))
        return sleep(600)
      case 'status':
        sfx(e.target === 'player' ? 'error' : 'spell')
        setCaption(
          e.target === 'monster'
            ? `${josa(m.name, '이', '가')} ${STATUS_NAME[e.kind]} 상태가 되었다!`
            : e.kind === 'stun'
              ? '머리가 핑 돈다... 한 턴을 놓쳤다!'
              : '독이 온몸에 퍼진다!',
        )
        return sleep(700)
      case 'skill': {
        const skill = jobById(e.job).skill
        setCaption(`${skill.name}!`)
        setShown((s) => ({ ...s, pmp: e.mp, mhp: e.monsterHp }))
        if (e.job === 'mage') {
          sfx('heal')
          setHeroAnim('hero-cast')
          pop('player', '집중!', 'heal')
          return sleep(600)
        }
        sfx('crit')
        setHeroAnim('hero-attack')
        setAnim('monster-hit')
        pop('monster', `${e.dmg}`, 'crit')
        return sleep(700)
      }
      case 'venomTick':
        sfx('hit')
        setCaption(`${m.name}의 몸에 독이 퍼진다!`)
        setAnim('monster-hit')
        pop('monster', `${e.dmg}`, 'dmg')
        setShown((s) => ({ ...s, mhp: e.monsterHp }))
        return sleep(600)
      case 'burnTick':
        sfx('hit')
        setCaption(`${josa(m.name, '이', '가')} 불길에 휩싸여 있다!`)
        setAnim('monster-hit')
        pop('monster', `${e.dmg}`, 'dmg')
        setShown((s) => ({ ...s, mhp: e.monsterHp }))
        return sleep(600)
      case 'poisonTick':
        sfx('hurt')
        setCaption('독 때문에 몸이 욱신거린다.')
        pop('player', `${e.dmg}`, 'dmg')
        setShown((s) => ({ ...s, php: e.playerHp }))
        return sleep(600)
      case 'monsterStunned':
        setCaption(`${josa(m.name, '은', '는')} 기절해서 움직이지 못한다!`)
        return sleep(700)
      case 'fleeFail':
        sfx('error')
        setCaption('도망치지 못했다!')
        return sleep(600)
      case 'monsterCharge':
        sfx('charge')
        setCharging(e.skill)
        setCaption(`${josa(m.name, '이', '가')} 힘을 모으고 있다... (${e.skill})`)
        return sleep(800)
      case 'monsterAttack':
        setCharging(null)
        setCaption(e.skill ? `${m.name}의 ${e.skill}!` : `${m.name}의 공격!`)
        setAnim('monster-lunge')
        await sleep(250)
        sfx(e.dodged ? 'dodge' : 'hurt')
        if (!e.dodged) setHeroAnim('hero-hurt')
        pop('player', e.dodged ? '회피!' : `${e.dmg}`, e.dodged ? 'miss' : 'dmg')
        setShown((s) => ({ ...s, php: e.playerHp, mhp: e.monsterHp }))
        return sleep(600)
      case 'victory':
        setAnim('monster-dead')
        setCaption(`${josa(m.name, '을', '를')} 쓰러뜨렸다!`)
        await sleep(700)
        sfx(e.levelUps > 0 ? 'levelup' : 'victory')
        return setResult(e)
      case 'defeat':
        sfx('defeat')
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
      setHeroAnim('')
      await play(e)
    }
    if (alive.current) setBusy(false)
  }

  const locked = busy || result !== null
  const skill = p.job ? jobById(p.job).skill : null
  const b = game.battle
  return (
    <Scene bg={artUrl('backgrounds', monsterId) ? monsterId : regionId} className={`battle-scene ${anim === 'spell' ? 'flash' : ''}`}>
      <div className="enemy">
        <div className="enemy-plate panel">
          <strong>
            {m.boss && <span className="boss-tag">BOSS</span>} {m.name} <span className="lv">Lv.{m.level}</span>
          </strong>
          <Bar kind="enemy" value={shown.mhp} max={m.hp} />
          {!locked && b && (b.burn || b.venom || b.chill > 0 || b.stunned) && (
            <div className="statuses">
              {b.burn && <span className="status status-burn">화상 {b.burn.turns}</span>}
              {b.venom && <span className="status status-poison">맹독 {b.venom.turns}</span>}
              {b.chill > 0 && <span className="status status-chill">빙결 {b.chill}</span>}
              {b.stunned && <span className="status status-stun">기절</span>}
            </div>
          )}
        </div>
        <div className={`enemy-body ${anim} ${charging ? 'charging' : ''}`}>
          <Art kind="monsters" id={m.id} alt={m.name} className="enemy-art" fallback="👾" />
          {spellFx && <Art key={spellFx.key} kind="items" id={spellFx.id} alt="" className={`spell-fx spell-fx-${spellFx.id}`} fallback="✨" />}
          {fx?.target === 'monster' && (
            <span key={fx.key} className={`pop pop-${fx.kind}`}>
              {fx.text}
            </span>
          )}
        </div>
        {artUrl('characters', 'hero-back') && <Art kind="characters" id={heroArt(p.job, true)} alt="" className={`hero ${heroAnim}`} />}
      </div>

      <div className="battle-bottom">
        <p className="caption" aria-live="polite">
          {caption}
        </p>
        <div className="battle-row">
          <div className={`panel player-plate ${fx?.target === 'player' && fx.kind === 'dmg' ? 'shake' : ''}`} key={fx?.target === 'player' ? fx.key : 0}>
            <strong>
              {p.name} <span className="lv">Lv.{p.level}</span>
              {!locked && b && b.poison > 0 && <span className="status status-poison">중독 {b.poison}</span>}
              {!locked && b?.focus && <span className="status status-chill">집중</span>}
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
            <div className={`actions ${skill ? 'actions-6' : ''}`}>
              <button className="btn btn-primary" disabled={locked} onClick={() => run({ type: 'attack' })}>
                공격
              </button>
              {skill && (
                <button className="btn btn-skill" disabled={locked || shown.pmp < skill.mp} title={skill.desc} onClick={() => run({ type: 'skill' })}>
                  <span className="item-text">
                    {skill.name}
                    {skill.mp > 0 && (
                      <small>
                        <b className="mp-cost">MP {skill.mp}</b>
                      </small>
                    )}
                  </span>
                </button>
              )}
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
                <button key={sp.id} className="btn btn-item" disabled={locked || shown.pmp < R.spellCost(p, sp.mp)} onClick={() => run({ type: 'cast', spellId: sp.id })}>
                  <Art kind="items" id={sp.id} alt="" className="icon" fallback="✨" />
                  <span className="item-text">
                    {sp.name}
                    <small>
                      <b className="mp-cost">MP {R.spellCost(p, sp.mp)}</b> · {sp.desc}
                    </small>
                  </span>
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
                  <span className="item-text">
                    {po.name}
                    <small>
                      {po.hp ? `HP +${R.potionHeal(p, po).hp}` : `MP +${R.potionHeal(p, po).mp}`} · {p.potions[po.id]}개
                    </small>
                  </span>
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
            {result.equipDrop && (
              <li className="levelup">
                <Art kind="items" id={result.equipDrop} alt="" className="icon-inline" fallback="🎁" /> {equipById(result.equipDrop).name} 획득!
              </li>
            )}
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
