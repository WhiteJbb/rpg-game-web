import { useState, type ReactNode } from 'react'
import { EQUIPS, POTIONS, SLOTS, SPELLS, type Equip } from '../../game/data/items'
import * as R from '../../game/rules'
import type { Action, GameState } from '../../game/types'
import { Art, Scene } from '../art'
import { Gold, SLOT_ICON, equipBonus, equipName } from '../common'

interface Props {
  game: GameState
  act: (a: Action) => GameState
  onBack: () => void
}

function Shop({ bg, title, onBack, children }: { bg: string; title: string; onBack: () => void; children: ReactNode }) {
  return (
    <Scene bg={bg} className="shop-scene">
      <div className="panel shop">
        <div className="shop-head">
          <h2>{title}</h2>
          <button className="btn btn-small" onClick={onBack}>
            나가기
          </button>
        </div>
        <div className="goods">{children}</div>
      </div>
    </Scene>
  )
}

function Good({ id, name, desc, fallback, children }: { id: string; name: string; desc: string; fallback: string; children: ReactNode }) {
  return (
    <div className="good">
      <Art kind="items" id={id} alt="" className="good-art" fallback={fallback} />
      <div className="good-info">
        <strong>{name}</strong>
        <small>{desc}</small>
      </div>
      {children}
    </div>
  )
}

function BuyButton({ price, gold, onClick }: { price: number; gold: number; onClick: () => void }) {
  return (
    <button className="btn btn-buy" disabled={gold < price} onClick={onClick}>
      <Gold amount={price} />
    </button>
  )
}

export function PotionShop({ game, act, onBack }: Props) {
  const p = game.player
  return (
    <Shop bg="shop-potion" title="물약상점" onBack={onBack}>
      {POTIONS.map((po) => (
        <Good key={po.id} id={po.id} name={po.name} fallback="🧪" desc={`${po.hp ? `HP +${R.potionHeal(p, po).hp}` : `MP +${R.potionHeal(p, po).mp}`} · 보유 ${p.potions[po.id]}`}>
          <BuyButton price={po.price} gold={p.gold} onClick={() => act({ type: 'buyPotion', potionId: po.id })} />
        </Good>
      ))}
    </Shop>
  )
}

export function MagicShop({ game, act, onBack }: Props) {
  const p = game.player
  return (
    <Shop bg="shop-magic" title="마법상점" onBack={onBack}>
      {SPELLS.map((sp) => (
        <Good key={sp.id} id={sp.id} name={sp.name} fallback="✨" desc={`위력 ${sp.power} · MP ${sp.mp} · ${sp.desc}`}>
          {p.spells.includes(sp.id) ? <span className="owned">습득함</span> : <BuyButton price={sp.price} gold={p.gold} onClick={() => act({ type: 'buySpell', spellId: sp.id })} />}
        </Good>
      ))}
    </Shop>
  )
}

export function EquipShop({ game, act, onBack }: Props) {
  const p = game.player
  const [slot, setSlot] = useState<Equip['slot']>('weapon')
  // 보스 전용 장비는 얻은 뒤에만 목록에 나온다
  const list = EQUIPS.filter((e) => e.slot === slot && (!e.dropFrom || p.owned.includes(e.id)) && (e.cycle ?? 0) <= game.cycle)
  return (
    <Shop bg="shop-equip" title="대장간" onBack={onBack}>
      <div className="tabs" role="tablist">
        {SLOTS.map((s) => (
          <button key={s.id} role="tab" aria-selected={slot === s.id} className={`btn btn-small ${slot === s.id ? 'btn-primary' : ''}`} onClick={() => setSlot(s.id)}>
            {s.name}
          </button>
        ))}
      </div>
      {list.map((e) => (
        <Good key={e.id} id={e.id} name={equipName(p, e)} fallback={SLOT_ICON[e.slot]} desc={`${equipBonus(p, e)}${p[e.slot] === e.id ? ' · 착용 중' : ''}`}>
          {p.owned.includes(e.id) ? (
            <div className="good-actions">
              {p[e.slot] !== e.id && (
                <button className="btn btn-buy" onClick={() => act({ type: 'equip', equipId: e.id })}>
                  착용
                </button>
              )}
              {(p.upgrades[e.id] ?? 0) < R.maxUpgrade(game.cycle) ? (
                <button className="btn btn-buy" disabled={p.gold < R.upgradeCost(p, e)} onClick={() => act({ type: 'upgradeEquip', equipId: e.id })}>
                  강화 <Gold amount={R.upgradeCost(p, e)} />
                </button>
              ) : (
                <span className="owned">최대 강화</span>
              )}
            </div>
          ) : (
            <BuyButton price={e.price} gold={p.gold} onClick={() => act({ type: 'buyEquip', equipId: e.id })} />
          )}
        </Good>
      ))}
    </Shop>
  )
}

export function Inn({ game, act, onBack }: Props) {
  const p = game.player
  const full = p.hp >= R.maxHp(p) && p.mp >= R.maxMp(p)
  return (
    <Scene bg="inn" className="shop-scene">
      <div className="panel shop inn">
        <div className="shop-head">
          <h2>여관</h2>
          <button className="btn btn-small" onClick={onBack}>
            나가기
          </button>
        </div>
        <p>"어서 오세요. 푹 쉬고 가면 HP와 MP가 전부 회복된답니다."</p>
        <button className="btn btn-primary btn-big" disabled={full || p.gold < R.restCost(p)} onClick={() => act({ type: 'rest' })}>
          {full ? '이미 쌩쌩하다' : '쉬어 가기'} {!full && <Gold amount={R.restCost(p)} />}
        </button>
        {!full && p.gold < R.restCost(p) && <p className="hint">골드가 모자란다... 몬스터를 잡아 벌어 오자.</p>}
      </div>
    </Scene>
  )
}
