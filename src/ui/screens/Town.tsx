import { Art, Scene } from '../art'

export type Place = 'inn' | 'potion-shop' | 'magic-shop' | 'smithy' | 'casino' | 'gate'

const PLACES: { id: Place; name: string; fallback: string }[] = [
  { id: 'inn', name: '여관', fallback: '🛏️' },
  { id: 'potion-shop', name: '물약상점', fallback: '🧪' },
  { id: 'gate', name: '모험 떠나기', fallback: '🗺️' },
  { id: 'smithy', name: '대장간', fallback: '⚒️' },
  { id: 'magic-shop', name: '마법상점', fallback: '🔮' },
  { id: 'casino', name: '슬롯머신', fallback: '🎰' },
]

export function Town({ onEnter }: { onEnter: (place: Place) => void }) {
  return (
    <Scene bg="town" className="town-scene">
      <nav className="town-places" aria-label="마을">
        {PLACES.map((p) => (
          <button key={p.id} className={`place place-${p.id}`} onClick={() => onEnter(p.id)}>
            <Art kind="buildings" id={p.id} alt="" className="place-art" fallback={p.fallback} />
            <span className="sign">{p.name}</span>
          </button>
        ))}
      </nav>
    </Scene>
  )
}
