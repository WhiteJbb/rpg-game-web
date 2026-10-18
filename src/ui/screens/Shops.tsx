import { useState, type ReactNode } from 'react'
import { EQUIPS, POTIONS, SLOTS, SPELLS, type Equip } from '../../game/data/items'
import { potionDesc } from '../common'
import * as R from '../../game/rules'
import type { Action, GameState } from '../../game/types'
import { Art, Scene } from '../art'
import { Confirm, Gold, SLOT_ICON, equipBonus, equipName, josa } from '../common'

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

function Good({ id, name, desc, fallback, tag, children }: { id: string; name: string; desc: string; fallback: string; tag?: string; children: ReactNode }) {
  return (
    <div className="good">
      <Art kind="items" id={id} alt="" className="good-art" fallback={fallback} />
      <div className="good-info">
        <strong>
          {name}
          {tag && <span className="tag">{tag}</span>}
        </strong>
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
      {POTIONS.filter((po) => (po.cycle ?? 0) <= game.cycle).map((po) => (
        <Good key={po.id} id={po.id} name={po.name} tag={po.cycle ? `${po.cycle + 1}회차` : undefined} fallback="🧪" desc={`${potionDesc(p, po)} · 보유 ${p.potions[po.id]}`}>
          <BuyButton price={po.price} gold={p.gold} onClick={() => act({ type: 'buyPotion', potionId: po.id })} />
        </Good>
      ))}
    </Shop>
  )
}

/** 이 금액부터는 한 번 더 묻는다 (구매·강화 버튼이 같은 자리라 잘못 누르기 쉽다) */
const BIG_SPEND = 10000

function useBigSpend(act: Props['act']) {
  const [asking, setAsking] = useState<{ text: string; yes: string; action: Action } | null>(null)
  const spend = (action: Action, price: number, text: string, yes: string) => (price >= BIG_SPEND ? setAsking({ text, yes, action }) : act(action))
  const confirm = asking && <Confirm text={asking.text} yes={asking.yes} onYes={() => (act(asking.action), setAsking(null))} onNo={() => setAsking(null)} />
  return { spend, confirm }
}

export function MagicShop({ game, act, onBack }: Props) {
  const p = game.player
  const { spend, confirm } = useBigSpend(act)
  return (
    <Shop bg="shop-magic" title="마법상점" onBack={onBack}>
      {confirm}
      {SPELLS.filter((sp) => (sp.cycle ?? 0) <= game.cycle).map((sp) => (
        <Good key={sp.id} id={sp.id} name={sp.name} tag={sp.cycle ? `${sp.cycle + 1}회차` : undefined} fallback="✨" desc={`위력 ${sp.power} · MP ${sp.mp} · ${sp.desc}`}>
          {p.spells.includes(sp.id) ? (
            <span className="owned">습득함</span>
          ) : (
            <BuyButton price={sp.price} gold={p.gold} onClick={() => spend({ type: 'buySpell', spellId: sp.id }, sp.price, `${josa(sp.name, '을', '를')} ${sp.price.toLocaleString()} 골드에 배울까요?`, '배운다')} />
          )}
        </Good>
      ))}
    </Shop>
  )
}

export function EquipShop({ game, act, onBack }: Props) {
  const p = game.player
  const [slot, setSlot] = useState<Equip['slot']>('weapon')
  const [showWeak, setShowWeak] = useState(false)
  const { spend, confirm } = useBigSpend(act)
  // 보스 전용 장비는 얻은 뒤에만 목록에 나온다
  const all = EQUIPS.filter((e) => e.slot === slot && (!e.dropFrom || p.owned.includes(e.id)) && (e.cycle ?? 0) <= game.cycle)
  // 지금 낀 장비(강화 포함)에 모든 수치가 뒤처지거나 합이 절반도 안 되는 미보유 장비는 접어 둔다
  const current = p[slot] ? EQUIPS.find((e) => e.id === p[slot])! : null
  const weak = (e: Equip) => current !== null && !p.owned.includes(e.id) && (R.outclasses(p, current, e) || R.equipWorth(p, e) * 2 < R.equipWorth(p, current))
  const hidden = all.filter(weak).length
  const list = showWeak ? all : all.filter((e) => !weak(e))
  return (
    <Shop bg="shop-equip" title="대장간" onBack={onBack}>
      {confirm}

      <div className="tabs" role="tablist">
        {SLOTS.map((s) => (
          <button key={s.id} role="tab" aria-selected={slot === s.id} className={`btn btn-small ${slot === s.id ? 'btn-primary' : ''}`} onClick={() => setSlot(s.id)}>
            {s.name}
          </button>
        ))}
      </div>
      {list.map((e) => (
        <Good key={e.id} id={e.id} name={equipName(p, e)} tag={e.cycle ? `${e.cycle + 1}회차` : undefined} fallback={SLOT_ICON[e.slot]} desc={`${equipBonus(p, e)}${p[e.slot] === e.id ? ' · 착용 중' : ''}`}>
          {p.owned.includes(e.id) ? (
            <div className="good-actions">
              {p[e.slot] !== e.id && (
                <button className="btn btn-buy" onClick={() => act({ type: 'equip', equipId: e.id })}>
                  착용
                </button>
              )}
              {(p.upgrades[e.id] ?? 0) < R.maxUpgrade(game.cycle) ? (
                <button
                  className="btn btn-buy"
                  disabled={p.gold < R.upgradeCost(p, e)}
                  onClick={() => spend({ type: 'upgradeEquip', equipId: e.id }, R.upgradeCost(p, e), `${e.name} +${(p.upgrades[e.id] ?? 0) + 1} 강화에 ${R.upgradeCost(p, e).toLocaleString()} 골드를 쓸까요?`, '강화')}
                >
                  강화 <Gold amount={R.upgradeCost(p, e)} />
                </button>
              ) : (
                <span className="owned">최대 강화</span>
              )}
            </div>
          ) : (
            <BuyButton price={e.price} gold={p.gold} onClick={() => spend({ type: 'buyEquip', equipId: e.id }, e.price, `${josa(e.name, '을', '를')} ${e.price.toLocaleString()} 골드에 살까요?`, '산다')} />
          )}
        </Good>
      ))}
      {hidden > 0 && (
        <button className="btn btn-small goods-more" onClick={() => setShowWeak(!showWeak)}>
          {showWeak ? '뒤처진 장비 접기' : `지금 장비보다 약한 장비 ${hidden}개 보기`}
        </button>
      )}
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
