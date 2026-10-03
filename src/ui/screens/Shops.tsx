import type { ReactNode } from 'react'
import { EQUIPS, POTIONS, SPELLS } from '../../game/data/items'
import * as R from '../../game/rules'
import type { Action, GameState } from '../../game/types'
import { Art, Scene } from '../art'
import { Gold } from '../common'

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
        <Good key={po.id} id={po.id} name={po.name} fallback="🧪" desc={`${po.hp ? `HP +${po.hp}` : `MP +${po.mp}`} · 보유 ${p.potions[po.id]}`}>
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
        <Good key={sp.id} id={sp.id} name={sp.name} fallback="✨" desc={`위력 ${sp.power} · MP ${sp.mp}`}>
          {p.spells.includes(sp.id) ? <span className="owned">습득함</span> : <BuyButton price={sp.price} gold={p.gold} onClick={() => act({ type: 'buySpell', spellId: sp.id })} />}
        </Good>
      ))}
    </Shop>
  )
}

const bonus = (e: (typeof EQUIPS)[number]) =>
  [e.str && `힘 +${e.str}`, e.def && `방어 +${e.def}`, e.int && `지력 +${e.int}`].filter(Boolean).join(' · ')

export function EquipShop({ game, act, onBack }: Props) {
  const p = game.player
  return (
    <Shop bg="shop-equip" title="대장간" onBack={onBack}>
      {EQUIPS.map((e) => (
        <Good key={e.id} id={e.id} name={e.name} fallback={e.slot === 'weapon' ? '🗡️' : '🛡️'} desc={`${e.slot === 'weapon' ? '무기' : '방어구'} · ${bonus(e)}`}>
          {p[e.slot] === e.id ? (
            <span className="owned">착용 중</span>
          ) : p.owned.includes(e.id) ? (
            <button className="btn btn-buy" onClick={() => act({ type: 'equip', equipId: e.id })}>
              착용
            </button>
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
