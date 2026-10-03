import { useEffect, useState } from 'react'
import { BOSS_CLEAR, ENDING, INTRO, NEW_CYCLE, SECRET_CLEAR } from '../game/data/story'
import { newGame, reduce } from '../game/engine'
import { SAVE_KEY, deserialize, serialize } from '../game/save'
import type { Action, GameState } from '../game/types'
import { JOBS, canTakeJob, jobById } from '../game/data/jobs'
import { monsterById } from '../game/data/monsters'
import { Scene } from './art'
import { setBgm } from './bgm'
import { Dialog, Hud, MuteButton } from './common'
import { sfx } from './sfx'
import { Battle, type BattleOutcome } from './screens/Battle'
import { Casino } from './screens/Casino'
import { Character } from './screens/Character'
import { Ending } from './screens/Ending'
import { Region } from './screens/Region'
import { Quests, claimableQuests } from './screens/Quests'
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
  | { n: 'ending' }

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
  const [showQuests, setShowQuests] = useState(false)
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

  // 모든 버튼에 공통 클릭음
  useEffect(() => {
    const onClick = (e: MouseEvent) => (e.target as Element).closest?.('button:not(.mute)') && sfx('click')
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // 장면별 배경음악. 대사 장면은 엔딩만 따로 두고 나머지는 직전 곡을 이어 간다.
  const track =
    screen.n === 'title' || !game ? 'title' :
    screen.n === 'region' ? screen.id :
    screen.n === 'battle' ? (monsterById(screen.monsterId).boss ? 'boss' : 'battle') :
    screen.n === 'story' ? (screen.lines === ENDING ? 'ending' : null) :
    screen.n === 'ending' ? 'ending' :
    'town'
  useEffect(() => {
    if (track) setBgm(track)
  }, [track])

  const say = (text: string) => setToast({ key: Date.now(), text })

  const act = (action: Action): GameState => {
    const next = reduce(game!, action, Math.random)
    setGame(next)
    for (const e of next.events) {
      if (e.t === 'error') (say(e.text), sfx('error'))
      else if (e.t === 'bought') (say('구매 완료!'), sfx('coin'))
      else if (e.t === 'rest') (say('푹 쉬었다. HP와 MP가 전부 회복되었다!'), sfx('heal'))
      else if (e.t === 'encounter') sfx('encounter')
      else if (e.t === 'event') sfx('encounter')
      else if (e.t === 'eventResult') sfx(e.levelUps > 0 ? 'levelup' : e.hp < 0 ? 'hurt' : e.gold > 0 ? 'coin' : e.hp + e.mp > 0 ? 'heal' : 'click')
      else if (e.t === 'upgraded') (say(`강화 성공! +${e.level}`), sfx('levelup'))
      else if (e.t === 'jobChanged') (say(`${jobById(e.job).name}(으)로 전직했다!`), sfx('levelup'))
      else if (e.t === 'respec') (say(`스텟 ${e.points}포인트를 돌려받았다.`), sfx('heal'))
      else if (e.t === 'questClaimed') (say('의뢰 완료! 보상을 받았다.'), sfx('victory'))
    }
    return next
  }

  const resume = (g: GameState) =>
    setScreen(g.battle ? { n: 'battle', monsterId: g.battle.monsterId, regionId: g.battle.regionId, seq: 0 } : { n: 'town' })

  const afterBattle = (outcome: BattleOutcome, regionId: string) => {
    if (outcome.type === 'defeat') return setScreen({ n: 'town' })
    if (outcome.type === 'fled') (say('무사히 도망쳤다!'), sfx('dodge'))
    if (outcome.type === 'victory' && outcome.victory.secretFirst)
      return setScreen({ n: 'story', bg: regionId, lines: SECRET_CLEAR, next: { n: 'region', id: regionId } })
    const cleared = outcome.type === 'victory' ? outcome.victory.bossFirst : null
    if (!cleared) return setScreen({ n: 'region', id: regionId })
    const afterStory: Screen = game!.cleared ? { n: 'story', bg: 'ending', lines: ENDING, next: { n: 'ending' } } : { n: 'map' }
    setScreen({ n: 'story', bg: regionId, lines: BOSS_CLEAR[regionId], next: afterStory })
  }

  const startNewCycle = () => {
    act({ type: 'newCycle' })
    setShowChar(false)
    setScreen({ n: 'story', bg: 'meadow', lines: NEW_CYCLE, next: { n: 'town' } })
  }

  if (screen.n === 'title' || !game) {
    return (
      <>
        <MuteButton className="mute-float" />
        <Title
          hasSave={game !== null}
          onContinue={() => resume(game!)}
          onNew={(name) => {
            setGame(newGame(name))
            setScreen({ n: 'story', bg: 'meadow', lines: INTRO, next: { n: 'town' } })
          }}
        />
      </>
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
    case 'ending':
      body = <Ending game={game} onContinue={() => setScreen({ n: 'town' })} onNewCycle={startNewCycle} />
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
      {!inBattle && screen.n !== 'story' && screen.n !== 'ending' ? <Hud player={game.player} jobReady={!game.player.job && JOBS.some((j) => canTakeJob(game.player, j.id))} onCharacter={() => setShowChar(true)} onQuests={() => setShowQuests(true)} questBadge={claimableQuests(game)} /> : <MuteButton className="mute-float" />}
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
          onImport={(g) => {
            setShowChar(false)
            setGame(g)
            setScreen({ n: 'town' })
            say('세이브를 불러왔다!')
          }}
          onNewCycle={startNewCycle}
        />
      )}
      {showQuests && <Quests game={game} act={act} onClose={() => setShowQuests(false)} />}
      {toast && (
        <div key={toast.key} className="toast" role="status">
          {toast.text}
        </div>
      )}
    </div>
  )
}
