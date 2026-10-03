import { EQUIPS, POTIONS, SPELLS, equipById } from '../../game/data/items'
import * as R from '../../game/rules'
import type { Action, GameState, StatKey } from '../../game/types'
import { Art } from '../art'
import { Bar, Modal } from '../common'

const pct = (n: number) => `${Math.round(n * 100)}%`

const STATS: { key: StatKey; name: string; effect: (g: GameState) => string }[] = [
  { key: 'str', name: '힘', effect: (g) => `공격력 ${R.attackPower(g.player)}` },
  { key: 'int', name: '지력', effect: (g) => `마법 위력 ×${(1 + R.totalStat(g.player, 'int') * 0.05).toFixed(2)}, 최대 MP` },
  { key: 'def', name: '방어', effect: (g) => `방어력 ${Math.round(R.defensePower(g.player))}` },
  { key: 'agi', name: '민첩', effect: (g) => `회피 ${pct(R.dodgeChance(g.player))}, 도망 ${pct(R.fleeChance(g.player))}` },
  { key: 'crit', name: '치명', effect: (g) => `치명타 ${pct(R.critChance(g.player))}` },
  { key: 'luck', name: '운', effect: (g) => `골드 +${pct(R.goldBonus(g.player) - 1)}, 드롭률 ×${R.dropBonus(g.player).toFixed(2)}` },
]

interface Props {
  game: GameState
  act: (a: Action) => GameState
  onClose: () => void
  onReset: () => void
}

export function Character({ game, act, onClose, onReset }: Props) {
  const p = game.player
  const owned = EQUIPS.filter((e) => p.owned.includes(e.id))
  return (
    <Modal title={`${p.name} · Lv.${p.level}`} onClose={onClose} wide>
      <div className="char">
        <div className="char-left">
          <Art kind="characters" id="hero" alt={p.name} className="char-art" fallback="🧑‍🌾" />
          <Bar kind="exp" label="EXP" value={p.exp} max={R.expToNext(p.level)} />
          <p className="char-gear">
            무기: {p.weapon ? equipById(p.weapon).name : '없음'}
            <br />
            방어구: {p.armor ? equipById(p.armor).name : '없음'}
          </p>
        </div>
        <div className="char-right">
          <h3>
            스텟 <small>남은 포인트 {p.points}</small>
          </h3>
          <ul className="stats">
            {STATS.map((st) => (
              <li key={st.key}>
                <span className="stat-name">{st.name}</span>
                <span className="stat-val">
                  {p.stats[st.key]}
                  {R.totalStat(p, st.key) !== p.stats[st.key] && <em> +{R.totalStat(p, st.key) - p.stats[st.key]}</em>}
                </span>
                <small>{st.effect(game)}</small>
                <button className="btn btn-plus" disabled={p.points < 1} aria-label={`${st.name} 올리기`} onClick={() => act({ type: 'allocate', stat: st.key, amount: 1 })}>
                  +
                </button>
              </li>
            ))}
          </ul>

          <h3>가방</h3>
          <div className="bag">
            {POTIONS.map((po) => (
              <button key={po.id} className="btn btn-item" disabled={p.potions[po.id] < 1} onClick={() => act({ type: 'usePotion', potionId: po.id })} title="마시기">
                <Art kind="items" id={po.id} alt="" className="icon" fallback="🧪" />
                {po.name}
                <small>×{p.potions[po.id]}</small>
              </button>
            ))}
            {owned.map((e) => (
              <button key={e.id} className="btn btn-item" disabled={p[e.slot] === e.id} onClick={() => act({ type: 'equip', equipId: e.id })}>
                <Art kind="items" id={e.id} alt="" className="icon" fallback={e.slot === 'weapon' ? '🗡️' : '🛡️'} />
                {e.name}
                <small>
                  {[e.str && `힘+${e.str}`, e.def && `방어+${e.def}`, e.int && `지력+${e.int}`].filter(Boolean).join(' ')} · {p[e.slot] === e.id ? '착용 중' : '착용'}
                </small>
              </button>
            ))}
          </div>

          <h3>마법</h3>
          <div className="bag">
            {SPELLS.filter((sp) => p.spells.includes(sp.id)).map((sp) => (
              <span key={sp.id} className="chip">
                <Art kind="items" id={sp.id} alt="" className="icon" fallback="✨" />
                {sp.name} <small>MP {sp.mp}</small>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="row char-foot">
        <button className="btn btn-small btn-danger" onClick={() => confirm('정말 모든 진행을 지우고 처음으로 돌아갈까요?') && onReset()}>
          처음부터 다시
        </button>
        <button className="btn btn-primary" onClick={onClose}>
          닫기
        </button>
      </div>
    </Modal>
  )
}
