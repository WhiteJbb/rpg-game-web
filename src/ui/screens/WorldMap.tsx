import { useEffect, useRef } from 'react'
import { monsterById } from '../../game/data/monsters'
import { REGIONS, regionById } from '../../game/data/regions'
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
  const frame = useRef<HTMLDivElement>(null)
  // 세로 화면에서는 지도가 가로로 넘친다. 가장 멀리 열린 지역이 보이게 밀어 둔다 (넘치지 않으면 아무 일도 없다)
  useEffect(() => {
    const last = REGIONS.filter((r) => isRegionOpen(game, r.id)).at(-1)!
    const el = frame.current
    if (el) el.parentElement!.scrollLeft = (SPOTS[last.id].x / 100) * el.offsetWidth - el.parentElement!.clientWidth / 2
  }, [game])
  return (
    <div className="scene map-scene">
      <div ref={frame} className="map-frame" style={url ? { backgroundImage: `url(${url})` } : undefined}>
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
                <small>{open || !r.requires ? `Lv.${monsterById(r.monsters[0].id, game.cycle).level}~` : `${monsterById(regionById(r.requires).boss).name} 처치 시 개방`}</small>
              </span>
            </button>
          )
        })}
        <button className="spot spot-town" style={{ left: `${SPOTS.town.x}%`, top: `${SPOTS.town.y}%` }} onClick={onTown}>
          <span className="spot-pin">🏠</span>
          <span className="sign">마을로</span>
        </button>
      </div>
      <div className="map-hint">
        <span>← 좌우로 밀어서 둘러보기 →</span>
        <button className="btn btn-small" onClick={onTown}>
          🏠 마을로
        </button>
      </div>
    </div>
  )
}
