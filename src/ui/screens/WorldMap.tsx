import { monsterById } from '../../game/data/monsters'
import { REGIONS } from '../../game/data/regions'
import { isRegionOpen } from '../../game/engine'
import type { GameState } from '../../game/types'
import { artUrl } from '../art'

/** 지도 그림 위 각 장소의 위치(%). 지도 이미지가 바뀌면 여기를 맞춘다. */
const SPOTS: Record<string, { x: number; y: number }> = {
  meadow: { x: 17, y: 80 },
  'wolf-den': { x: 17, y: 20 },
  'elf-forest': { x: 66, y: 40 },
  'vampire-castle': { x: 87, y: 16 },
  town: { x: 52, y: 78 },
}

interface Props {
  game: GameState
  onRegion: (id: string) => void
  onTown: () => void
}

export function WorldMap({ game, onRegion, onTown }: Props) {
  const url = artUrl('backgrounds', 'world-map')
  return (
    <div className="scene map-scene">
      <div className="map-frame" style={url ? { backgroundImage: `url(${url})` } : undefined}>
        {REGIONS.map((r) => {
          const open = isRegionOpen(game, r.id)
          const done = game.progress[r.id].bossDefeated
          return (
            <button
              key={r.id}
              className={`spot ${open ? '' : 'spot-locked'} ${done ? 'spot-done' : ''}`}
              style={{ left: `${SPOTS[r.id].x}%`, top: `${SPOTS[r.id].y}%` }}
              disabled={!open}
              onClick={() => onRegion(r.id)}
            >
              <span className="spot-pin">{open ? (done ? '★' : '●') : '🔒'}</span>
              <span className="sign">
                {r.name}
                <small>Lv.{monsterById(r.monsters[0].id).level}~</small>
              </span>
            </button>
          )
        })}
        <button className="spot spot-town" style={{ left: `${SPOTS.town.x}%`, top: `${SPOTS.town.y}%` }} onClick={onTown}>
          <span className="spot-pin">🏠</span>
          <span className="sign">마을로</span>
        </button>
      </div>
    </div>
  )
}
