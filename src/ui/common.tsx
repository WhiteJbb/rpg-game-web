import { useEffect, useState, type ReactNode } from 'react'
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

/** 받침 유무에 따라 조사를 고른다: josa('슬라임', '이', '가') → '슬라임이' */
export function josa(word: string, withFinal: string, withoutFinal: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  const hasFinal = code >= 0 && code <= 11171 ? code % 28 !== 0 : false
  return word + (hasFinal ? withFinal : withoutFinal)
}

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

export function Hud({ player, onCharacter }: { player: Player; onCharacter?: () => void }) {
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
      {onCharacter && (
        <button className="btn btn-small hud-char" onClick={onCharacter}>
          캐릭터{player.points > 0 && <span className="badge">{player.points}</span>}
        </button>
      )}
    </header>
  )
}

export function Modal({ title, onClose, children, wide }: { title?: string; onClose?: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!onClose) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`panel modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <button className="btn modal-close" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        )}
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
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
