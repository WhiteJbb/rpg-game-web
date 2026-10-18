import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Equip, Potion } from '../game/data/items'
import * as R from '../game/rules'
import type { Player } from '../game/types'
import { Art } from './art'
import { refreshBgm } from './bgm'
import { isMuted, setMuted, sfx } from './sfx'

export function MuteButton({ className = '' }: { className?: string }) {
  const [muted, set] = useState(isMuted)
  const toggle = () => {
    setMuted(!muted)
    set(!muted)
    refreshBgm()
    sfx('click')
  }
  return (
    <button className={`btn btn-small mute ${className}`} aria-label={muted ? '소리 켜기' : '소리 끄기'} aria-pressed={muted} onClick={toggle}>
      {muted ? '🔇' : '🔊'}
    </button>
  )
}

export { josa } from '../game/josa'

/** 장비 보너스를 한 줄로: '힘 +8 · 방어 +3' */
export const equipBonus = (p: Player, e: Equip) =>
  (
    [
      ['힘', 'str'],
      ['방어', 'def'],
      ['지력', 'int'],
      ['민첩', 'agi'],
      ['치명', 'crit'],
      ['운', 'luck'],
    ] as const
  )
    .filter(([, key]) => e[key])
    .map(([label, key]) => `${label} +${R.equipStat(p, e, key)}`)
    .join(' · ')

/** 포션 회복량 한 줄: 'HP +60' / 'MP +40' / 'HP·MP 전부' */
export const potionDesc = (p: Player, po: Potion) => {
  const h = R.potionHeal(p, po)
  return po.hp && po.mp ? `HP +${h.hp} · MP +${h.mp}` : po.hp ? `HP +${h.hp}` : `MP +${h.mp}`
}

export const SLOT_ICON = { weapon: '🗡️', armor: '🛡️', accessory: '💍' } as const

/** 강화 단계가 붙은 장비 이름: '청동검 +3' */
export const equipName = (p: Player, e: Equip) => (p.upgrades[e.id] ? `${e.name} +${p.upgrades[e.id]}` : e.name)

export function Bar({ kind, value, max, label }: { kind: 'hp' | 'mp' | 'exp' | 'enemy'; value: number; max: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={`bar bar-${kind}`} role="meter" aria-valuenow={value} aria-valuemax={max} aria-label={label ?? kind}>
      <div className="bar-fill" style={{ width: `${pct}%` }} />
      <span className="bar-text">
        {label ? `${label} ` : ''}
        {value} / {max}
      </span>
    </div>
  )
}

export function Gold({ amount }: { amount: number }) {
  return (
    <span className="gold">
      <Art kind="items" id="gold" alt="골드" className="icon-inline" fallback="🪙" />
      {amount.toLocaleString()}
    </span>
  )
}

export function Hud({ player, onCharacter, onQuests, questBadge = 0, jobReady = false }: { player: Player; onCharacter?: () => void; onQuests?: () => void; questBadge?: number; jobReady?: boolean }) {
  return (
    <header className="hud">
      <div className="hud-id">
        <strong>{player.name}</strong>
        <span className="lv">Lv.{player.level}</span>
      </div>
      <div className="hud-bars">
        <Bar kind="hp" label="HP" value={player.hp} max={R.maxHp(player)} />
        <Bar kind="mp" label="MP" value={player.mp} max={R.maxMp(player)} />
      </div>
      <Gold amount={player.gold} />
      <MuteButton />
      {onQuests && (
        <button className="btn btn-small hud-char" onClick={onQuests}>
          의뢰{questBadge > 0 && <span className="badge">{questBadge}</span>}
        </button>
      )}
      {onCharacter && (
        <button className="btn btn-small hud-char" onClick={onCharacter}>
          캐릭터{(player.points > 0 || jobReady) && <span className="badge">{jobReady ? '전직' : player.points}</span>}
        </button>
      )}
    </header>
  )
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

export function Modal({ title, onClose, children, wide }: { title?: string; onClose?: () => void; children: ReactNode; wide?: boolean }) {
  const panel = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  // 창이 뜨기 전에 포커스가 있던 곳 (렌더 시점에 잡는다 — 커밋 뒤에는 autoFocus가 이미 창 안으로 옮긴 뒤다)
  const opener = useRef<HTMLElement | null>(null)
  if (opener.current === null) opener.current = document.activeElement as HTMLElement | null
  // 포커스를 창 안에 가둔다: 열릴 때 첫 요소로, Tab은 창 안에서만 돌고, 닫히면 열기 전 요소로 돌아간다.
  // Escape·Tab은 맨 위에 떠 있는 창만 받는다 (확인창 위에서 Escape를 눌러도 뒤의 창은 그대로)
  useEffect(() => {
    const el = panel.current!
    const before = opener.current
    if (!el.contains(document.activeElement)) el.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    const onKey = (e: KeyboardEvent) => {
      const all = document.querySelectorAll('.modal-backdrop')
      if (all[all.length - 1] !== el.parentElement) return
      if (e.key === 'Escape') return closeRef.current?.()
      if (e.key !== 'Tab') return
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const i = items.indexOf(document.activeElement as HTMLElement)
      const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : i < 0 || i === items.length - 1 ? 0 : i + 1
      e.preventDefault()
      items[next].focus()
    }
    window.addEventListener('keydown', onKey)
    return () => (window.removeEventListener('keydown', onKey), before?.focus())
  }, [])
  // 스크롤되는 창(캐릭터 창) 안에서 열어도 화면 밖으로 밀리지 않게 .game 바로 아래에 그린다
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div ref={panel} className={`panel modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        {(title || onClose) && (
          <div className="modal-head">
            <h2>{title}</h2>
            {onClose && (
              <button className="btn modal-close" aria-label="닫기" onClick={onClose}>
                ✕
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.querySelector('.game') ?? document.body,
  )
}

/** 브라우저 기본 confirm() 대신 쓰는 확인 창 */

export function Confirm({ text, yes, onYes, onNo }: { text: string; yes: string; onYes: () => void; onNo: () => void }) {
  return (
    <Modal onClose={onNo}>
      <p className="confirm-text">{text}</p>
      <div className="row confirm-row">
        <button className="btn" onClick={onNo}>
          취소
        </button>
        <button className="btn btn-primary" autoFocus onClick={onYes}>
          {yes}
        </button>
      </div>
    </Modal>
  )
}

/** 화면 아래 대사창. 클릭할 때마다 다음 줄로 넘어간다. */
export function Dialog({ lines, onDone }: { lines: string[]; onDone: () => void }) {
  const [i, setI] = useState(0)
  const next = () => (i + 1 < lines.length ? setI(i + 1) : onDone())
  return (
    <button className="dialog panel" onClick={next} autoFocus>
      <p key={i} className="dialog-text">
        {lines[i]}
      </p>
      <span className="dialog-next">{i + 1 < lines.length ? '▼' : '■'}</span>
    </button>
  )
}
