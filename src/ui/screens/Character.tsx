import { useState } from 'react'
import { EQUIPS, POTIONS, SLOTS, SPELLS, equipById } from '../../game/data/items'
import * as R from '../../game/rules'
import type { Action, GameState, StatKey } from '../../game/types'
import { Art } from '../art'
import { Bar, Confirm, Gold, Modal, SLOT_ICON, equipBonus, equipName } from '../common'
import { SaveManager } from './SaveManager'

const pct = (n: number) => `${Math.round(n * 100)}%`

const STATS: { key: StatKey; name: string; effect: (g: GameState) => string }[] = [
  { key: 'str', name: '힘', effect: (g) => `공격력 ${R.attackPower(g.player)}` },
  { key: 'int', name: '지력', effect: (g) => `마법 위력 ×${(1 + R.totalStat(g.player, 'int') * R.SPELL_INT_SCALE).toFixed(2)}, 최대 MP` },
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
  onImport: (g: GameState) => void
  onNewCycle: () => void
}

const STEPS = [1, 5, 'all'] as const

export function Character({ game, act, onClose, onReset, onImport, onNewCycle }: Props) {
  const p = game.player
  const owned = EQUIPS.filter((e) => p.owned.includes(e.id))
  const [resetting, setResetting] = useState(false)
  const [step, setStep] = useState<(typeof STEPS)[number]>(1)
  const [asking, setAsking] = useState<null | 'respec' | 'cycle' | 'save'>(null)
  const amount = step === 'all' ? p.points : Math.min(step, p.points)
  const spent = Object.values(p.stats).reduce((a, b) => a + b, 0) - 20
  if (resetting) return <Confirm text="정말 모든 진행을 지우고 처음으로 돌아갈까요?" yes="전부 지운다" onYes={onReset} onNo={() => setResetting(false)} />
  return (
    <Modal title={`${p.name} · Lv.${p.level}${game.cycle > 0 ? ` · ${game.cycle + 1}회차` : ''}`} onClose={onClose} wide>
      {asking === 'respec' && (
        <Confirm
          text={`${R.respecCost(p).toLocaleString()} 골드를 내고 찍은 스텟 ${spent}포인트를 전부 돌려받을까요?`}
          yes="초기화"
          onYes={() => (act({ type: 'respec' }), setAsking(null))}
          onNo={() => setAsking(null)}
        />
      )}
      {asking === 'cycle' && (
        <Confirm
          text="레벨·스텟·장비·골드는 그대로 두고 세계를 처음으로 되돌립니다. 몬스터가 훨씬 강해지고, 지역과 의뢰 진행은 초기화됩니다."
          yes="다음 회차로"
          onYes={onNewCycle}
          onNo={() => setAsking(null)}
        />
      )}
      {asking === 'save' && <SaveManager game={game} onImport={onImport} onClose={() => setAsking(null)} />}
      <div className="char">
        <div className="char-left">
          <Art kind="characters" id="hero" alt={p.name} className="char-art" fallback="🧑‍🌾" />
          <Bar kind="exp" label="EXP" value={p.exp} max={R.expToNext(p.level)} />
          <p className="char-gear">
            {SLOTS.map((slot) => (
              <span key={slot.id}>
                {slot.name}: {p[slot.id] ? equipName(p, equipById(p[slot.id]!)) : '없음'}
                <br />
              </span>
            ))}
          </p>
        </div>
        <div className="char-right">
          <h3>
            스텟 <small>남은 포인트 {p.points}</small>
          </h3>
          <div className="stat-tools">
            <span>한 번에</span>
            {STEPS.map((st) => (
              <button key={st} className={`btn btn-small ${step === st ? 'btn-primary' : ''}`} aria-pressed={step === st} onClick={() => setStep(st)}>
                {st === 'all' ? '전부' : `+${st}`}
              </button>
            ))}
            <button className="btn btn-small stat-respec" disabled={spent <= 0 || p.gold < R.respecCost(p)} onClick={() => setAsking('respec')}>
              초기화 <Gold amount={R.respecCost(p)} />
            </button>
          </div>
          <ul className="stats">
            {STATS.map((st) => (
              <li key={st.key}>
                <span className="stat-name">{st.name}</span>
                <span className="stat-val">
                  {p.stats[st.key]}
                  {R.totalStat(p, st.key) !== p.stats[st.key] && <em> +{R.totalStat(p, st.key) - p.stats[st.key]}</em>}
                </span>
                <small>{st.effect(game)}</small>
                <button className="btn btn-plus" disabled={p.points < 1} aria-label={`${st.name} 올리기`} onClick={() => act({ type: 'allocate', stat: st.key, amount })}>
                  +
                </button>
              </li>
            ))}
          </ul>

          <h3>포션</h3>
          <div className="bag">
            {POTIONS.map((po) => (
              <button key={po.id} className="btn btn-item" disabled={p.potions[po.id] < 1} onClick={() => act({ type: 'usePotion', potionId: po.id })} title="마시기">
                <Art kind="items" id={po.id} alt="" className="icon" fallback="🧪" />
                <span className="item-text">
                  {po.name}
                  <small>
                    {po.hp ? `HP +${po.hp}` : `MP +${po.mp}`} · {p.potions[po.id]}개
                  </small>
                </span>
              </button>
            ))}
          </div>

          {SLOTS.map((slot) => {
            const items = owned.filter((e) => e.slot === slot.id)
            return (
              <div key={slot.id}>
                <h3>
                  {slot.name} <small>{items.length}개</small>
                </h3>
                <div className="bag">
                  {items.length === 0 && <span className="empty">아직 없다</span>}
                  {items.map((e) => (
                    <button key={e.id} className="btn btn-item" disabled={p[e.slot] === e.id} onClick={() => act({ type: 'equip', equipId: e.id })}>
                      <Art kind="items" id={e.id} alt="" className="icon" fallback={SLOT_ICON[e.slot]} />
                      <span className="item-text">
                        {equipName(p, e)}
                        <small>
                          {equipBonus(p, e)}
                          {p[e.slot] === e.id && ' · 착용 중'}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          <h3>마법</h3>
          <div className="bag">
            {SPELLS.filter((sp) => p.spells.includes(sp.id)).map((sp) => (
              <span key={sp.id} className="chip">
                <Art kind="items" id={sp.id} alt="" className="icon" fallback="✨" />
                <span className="item-text">
                  {sp.name}
                  <small>
                    <b className="mp-cost">MP {sp.mp}</b> · {sp.desc}
                  </small>
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="row char-foot">
        <div className="row">
          <button className="btn btn-small btn-danger" onClick={() => setResetting(true)}>
            처음부터 다시
          </button>
          <button className="btn btn-small" onClick={() => setAsking('save')}>
            세이브 옮기기
          </button>
          {game.cleared && (
            <button className="btn btn-small" onClick={() => setAsking('cycle')}>
              {game.cycle + 2}회차 시작
            </button>
          )}
        </div>
        <button className="btn btn-primary" onClick={onClose}>
          닫기
        </button>
      </div>
    </Modal>
  )
}
