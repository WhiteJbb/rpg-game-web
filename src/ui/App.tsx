import { useEffect, useState } from 'react'
import { BOSS_CLEAR, ENDING, INTRO } from '../game/data/story'
import { newGame, reduce } from '../game/engine'
import { SAVE_KEY, deserialize, serialize } from '../game/save'
import type { Action, GameState } from '../game/types'
import { Scene } from './art'
import { Dialog, Hud } from './common'
import { Battle, type BattleOutcome } from './screens/Battle'
import { Casino } from './screens/Casino'
import { Character } from './screens/Character'
import { Region } from './screens/Region'
import { EquipShop, Inn, MagicShop, PotionShop } from './screens/Shops'
import { Title } from './screens/Title'
import { Town, type Place } from './screens/Town'
import { WorldMap } from './screens/WorldMap'

type Screen =
  | { n: 'title' }
  | { n: 'town' }
  | { n: 'map' }
  | { n: 'region'; id: string }
  | { n: 'battle'; monsterId: string; regionId: string; seq: number }
  | { n: 'place'; place: Exclude<Place, 'gate'> }
  | { n: 'story'; bg: string; lines: string[]; next: Screen }

function loadSave(): GameState | null {
  try {
    return deserialize(localStorage.getItem(SAVE_KEY))
  } catch {
    return null // 저장소를 쓸 수 없는 환경 (사생활 보호 모드 등)
  }
}

export function App() {
  const [game, setGame] = useState<GameState | null>(loadSave)
  const [screen, setScreen] = useState<Screen>({ n: 'title' })
  const [showChar, setShowChar] = useState(false)
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null)

  useEffect(() => {
    try {
      if (game) localStorage.setItem(SAVE_KEY, serialize(game))
      else localStorage.removeItem(SAVE_KEY)
    } catch {
      /* 저장 실패해도 플레이는 계속 */
    }
  }, [game])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 1800)
    return () => clearTimeout(id)
  }, [toast])

  const say = (text: string) => setToast({ key: Date.now(), text })

  const act = (action: Action): GameState => {
    const next = reduce(game!, action, Math.random)
    setGame(next)
    for (const e of next.events) {
      if (e.t === 'error') say(e.text)
      else if (e.t === 'bought') say('구매 완료!')
      else if (e.t === 'rest') say('푹 쉬었다. HP와 MP가 전부 회복되었다!')
    }
    return next
  }

  const resume = (g: GameState) =>
    setScreen(g.battle ? { n: 'battle', monsterId: g.battle.monsterId, regionId: g.battle.regionId, seq: 0 } : { n: 'town' })

  const afterBattle = (outcome: BattleOutcome, regionId: string) => {
    if (outcome.type === 'defeat') return setScreen({ n: 'town' })
    const cleared = outcome.type === 'victory' ? outcome.victory.bossFirst : null
    if (!cleared) return setScreen({ n: 'region', id: regionId })
    const afterStory: Screen = game!.cleared ? { n: 'story', bg: 'town', lines: ENDING, next: { n: 'town' } } : { n: 'map' }
    setScreen({ n: 'story', bg: regionId, lines: BOSS_CLEAR[regionId], next: afterStory })
  }

  if (screen.n === 'title' || !game) {
    return (
      <Title
        hasSave={game !== null}
        onContinue={() => resume(game!)}
        onNew={(name) => {
          setGame(newGame(name))
          setScreen({ n: 'story', bg: 'meadow', lines: INTRO, next: { n: 'town' } })
        }}
      />
    )
  }

  const shopProps = { game, act, onBack: () => setScreen({ n: 'town' }) }
  let body
  switch (screen.n) {
    case 'story':
      body = (
        <Scene bg={screen.bg} className="story-scene">
          <Dialog key={screen.lines[0]} lines={screen.lines} onDone={() => setScreen(screen.next)} />
        </Scene>
      )
      break
    case 'town':
      body = <Town onEnter={(place) => setScreen(place === 'gate' ? { n: 'map' } : { n: 'place', place })} />
      break
    case 'map':
      body = <WorldMap game={game} onRegion={(id) => setScreen({ n: 'region', id })} onTown={() => setScreen({ n: 'town' })} />
      break
    case 'region':
      body = (
        <Region
          game={game}
          regionId={screen.id}
          act={act}
          onBattle={(monsterId) => setScreen({ n: 'battle', monsterId, regionId: screen.id, seq: Date.now() })}
          onBack={() => setScreen({ n: 'map' })}
        />
      )
      break
    case 'battle':
      body = (
        <Battle
          key={screen.seq}
          game={game}
          monsterId={screen.monsterId}
          regionId={screen.regionId}
          act={act}
          onExit={(outcome) => afterBattle(outcome, screen.regionId)}
        />
      )
      break
    case 'place':
      body =
        screen.place === 'inn' ? <Inn {...shopProps} /> :
        screen.place === 'potion-shop' ? <PotionShop {...shopProps} /> :
        screen.place === 'magic-shop' ? <MagicShop {...shopProps} /> :
        screen.place === 'smithy' ? <EquipShop {...shopProps} /> :
        <Casino {...shopProps} />
      break
  }

  const inBattle = screen.n === 'battle'
  return (
    <div className="game">
      {!inBattle && screen.n !== 'story' && <Hud player={game.player} onCharacter={() => setShowChar(true)} />}
      {body}
      {showChar && (
        <Character
          game={game}
          act={act}
          onClose={() => setShowChar(false)}
          onReset={() => {
            setShowChar(false)
            setGame(null)
            setScreen({ n: 'title' })
          }}
        />
      )}
      {toast && (
        <div key={toast.key} className="toast" role="status">
          {toast.text}
        </div>
      )}
    </div>
  )
}
