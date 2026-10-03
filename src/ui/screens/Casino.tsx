import { useEffect, useRef, useState } from 'react'
import { SLOT_SYMBOLS } from '../../game/rules'
import type { Action, GameState } from '../../game/types'
import { Art, Scene } from '../art'
import { Gold } from '../common'

// 0번이 잭팟
const SYMBOLS = [
  { id: 'slot-crown', fallback: '👑' },
  { id: 'slot-cherry', fallback: '🍒' },
  { id: 'slot-bell', fallback: '🔔' },
  { id: 'slot-clover', fallback: '🍀' },
  { id: 'slot-gem', fallback: '💎' },
]

interface Props {
  game: GameState
  act: (a: Action) => GameState
  onBack: () => void
}

export function Casino({ game, act, onBack }: Props) {
  const gold = game.player.gold
  const [bet, setBet] = useState(Math.max(1, Math.min(10, gold)))
  const [reels, setReels] = useState<[number, number, number]>([0, 0, 0])
  const [spinning, setSpinning] = useState(false)
  const [message, setMessage] = useState('같은 그림 2개면 본전, 3개면 8배, 왕관 3개면 20배!')
  // 결과는 이미 정해져 있고(상태에 반영됨), 화면에는 릴이 멈춘 뒤에 보여준다
  const [shownGold, setShownGold] = useState(gold)
  const timer = useRef(0)
  useEffect(() => () => clearInterval(timer.current), [])

  const spin = () => {
    if (spinning) return
    const next = act({ type: 'slot', bet })
    const e = next.events.find((e) => e.t === 'slot')
    if (!e || e.t !== 'slot') return
    setSpinning(true)
    setShownGold(gold - bet)
    setMessage('두구두구두구...')
    let ticks = 0
    timer.current = window.setInterval(() => {
      ticks++
      const roll = () => Math.floor(Math.random() * SLOT_SYMBOLS)
      // 릴이 왼쪽부터 차례로 멈춘다
      setReels([ticks > 8 ? e.reels[0] : roll(), ticks > 13 ? e.reels[1] : roll(), ticks > 18 ? e.reels[2] : roll()])
      if (ticks > 18) {
        clearInterval(timer.current)
        setSpinning(false)
        setShownGold(next.player.gold)
        setMessage(
          e.refunded
            ? '꽝... 인 줄 알았는데 동전이 도로 굴러 나왔다! (운)'
            : e.payout > e.bet
              ? `당첨!! +${e.payout.toLocaleString()} 골드`
              : e.payout === e.bet
                ? '본전! 한 번 더?'
                : '꽝... 다음엔 될 것 같은 기분이 든다.',
        )
      }
    }, 80)
  }

  const clamp = (n: number) => Math.max(1, Math.min(gold, Math.floor(n) || 1))
  return (
    <Scene bg="casino" className="shop-scene">
      <div className="panel shop casino">
        <div className="shop-head">
          <h2>슬롯머신</h2>
          <button className="btn btn-small" disabled={spinning} onClick={onBack}>
            나가기
          </button>
        </div>
        <div className={`reels ${spinning ? 'spinning' : ''}`}>
          {reels.map((r, i) => (
            <div className="reel" key={i}>
              <Art kind="items" id={SYMBOLS[r].id} alt="" className="reel-art" fallback={SYMBOLS[r].fallback} />
            </div>
          ))}
        </div>
        <p className="casino-msg" aria-live="polite">
          {message}
        </p>
        <p className="reward-line">
          보유 <Gold amount={spinning ? shownGold : gold} />
        </p>
        <div className="bet">
          <input type="number" min={1} max={gold} value={bet} disabled={spinning} onChange={(e) => setBet(clamp(Number(e.target.value)))} aria-label="베팅 금액" />
          {[10, 100].map((n) => (
            <button key={n} className="btn btn-small" disabled={spinning || gold < 1} onClick={() => setBet(clamp(bet + n))}>
              +{n}
            </button>
          ))}
          <button className="btn btn-small" disabled={spinning || gold < 1} onClick={() => setBet(clamp(gold / 2))}>
            절반
          </button>
        </div>
        <button className="btn btn-primary btn-big" disabled={spinning || gold < 1 || bet > gold} onClick={spin}>
          돌린다!
        </button>
      </div>
    </Scene>
  )
}
