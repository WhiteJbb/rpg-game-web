import { useState } from 'react'
import { EVENTS } from '../game/data/events'
import { EQUIPS, SPELLS } from '../game/data/items'
import { JOBS } from '../game/data/jobs'
import { MONSTERS, monsterById } from '../game/data/monsters'
import { REGIONS } from '../game/data/regions'
import { newBattle, newGame } from '../game/engine'
import * as R from '../game/rules'
import type { GameState } from '../game/types'
import type { Screen } from './App'
import { allArt } from './art'
import { Modal } from './common'

/** 주소에 ?debug 가 붙었을 때만 켜진다. 세이브도 따로 쓴다. */
export const DEBUG = new URLSearchParams(location.search).has('debug')

interface Props {
  game: GameState | null
  screen: Screen
  /** 리듀서를 거치지 않고 상태를 직접 고친다 */
  patch: (fn: (g: GameState) => void) => void
  goto: (s: Screen) => void
  onReset: () => void
}

const TABS = ['상태', '바로가기', '전투', '갤러리'] as const

const regionOf = (monsterId: string) =>
  REGIONS.find((r) => r.boss === monsterId || r.secretBoss === monsterId || r.monsters.some((m) => m.id === monsterId))!.id

export function Debug({ game, screen, patch, goto, onReset }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<(typeof TABS)[number]>('상태')
  const [level, setLevel] = useState('')
  const p = game?.player
  const cycle = game?.cycle ?? 0

  const heal = (g: GameState) => {
    g.player.hp = R.maxHp(g.player)
    g.player.mp = R.maxMp(g.player)
  }

  /** 전투 화면은 처음 뜰 때의 수치를 들고 있으므로, 상태를 고친 뒤 다시 띄운다 */
  const inBattle = (fn: (g: GameState) => void) => {
    if (!game?.battle) return
    patch(fn)
    goto({ n: 'battle', monsterId: game.battle.monsterId, regionId: game.battle.regionId, seq: Date.now() })
    setOpen(false)
  }

  const fight = (monsterId: string) => {
    const regionId = regionOf(monsterId)
    patch((g) => {
      g.pending = null
      g.battle = newBattle(monsterId, regionId, g.cycle)
    })
    goto({ n: 'battle', monsterId, regionId, seq: Date.now() })
    setOpen(false)
  }

  const leave = (s: Screen) => {
    patch((g) => {
      g.battle = null
      g.pending = null
    })
    goto(s)
    setOpen(false)
  }

  return (
    <>
      <button className="btn btn-small debug-fab" onClick={() => setOpen(true)}>
        🛠 DEBUG
      </button>
      {open && (
        <Modal title="디버그" onClose={() => setOpen(false)} wide>
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t} className={`btn btn-small ${tab === t ? 'btn-primary' : ''}`} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>

          {tab === '상태' && (
            <div className="debug-grid">
              <p className="debug-note">
                {p ? `${p.name} · Lv.${p.level} · ${game.cycle + 1}회차 · 화면: ${screen.n}` : '세이브 없음 (아무 버튼이나 누르면 새로 만든다)'}
                <br />
                디버그 모드는 별도 세이브를 쓴다. 실제 진행에는 영향이 없다.
              </p>
              <form
                className="debug-row"
                onSubmit={(e) => {
                  e.preventDefault()
                  const n = Math.max(1, Math.min(R.MAX_LEVEL, Math.floor(Number(level)) || 1))
                  patch((g) => {
                    // 그 레벨까지 정상적으로 올랐을 때의 스텟 포인트를 준다
                    g.player.points += Math.max(0, n - g.player.level) * R.POINTS_PER_LEVEL
                    g.player.level = n
                    g.player.exp = 0
                    heal(g)
                  })
                }}
              >
                <input type="number" min={1} max={R.MAX_LEVEL} placeholder="레벨" value={level} onChange={(e) => setLevel(e.target.value)} aria-label="레벨" />
                <button className="btn btn-small">레벨 설정</button>
              </form>
              <button className="btn btn-small" onClick={() => patch((g) => void (g.player.gold += 10000))}>골드 +10,000</button>
              <button className="btn btn-small" onClick={() => patch((g) => void (g.player.points += 20))}>스텟 포인트 +20</button>
              <button className="btn btn-small" onClick={() => patch(heal)}>HP·MP 가득</button>
              <button
                className="btn btn-small"
                onClick={() =>
                  patch((g) => {
                    g.player.owned = EQUIPS.map((e) => e.id)
                    g.player.spells = SPELLS.map((s) => s.id)
                    g.player.potions = { 'hp-s': 99, 'hp-m': 99, 'hp-l': 99, mp: 99 }
                  })
                }
              >
                모든 장비·마법·포션
              </button>
              <button className="btn btn-small" onClick={() => patch((g) => void (g.player.upgrades = Object.fromEntries(g.player.owned.map((id) => [id, R.MAX_UPGRADE]))))}>
                보유 장비 최대 강화
              </button>
              <div className="debug-row">
                직업:
                {[null, ...JOBS.map((j) => j.id)].map((id) => (
                  <button key={id ?? 'none'} className={`btn btn-small ${p?.job === id ? 'btn-primary' : ''}`} onClick={() => patch((g) => (void (g.player.job = id), heal(g)))}>
                    {id ? JOBS.find((j) => j.id === id)!.name : '없음'}
                  </button>
                ))}
              </div>
              <button className="btn btn-small" onClick={() => patch((g) => REGIONS.forEach((r) => void (g.progress[r.id] = { ...g.progress[r.id], kills: r.killsForBoss, bossDefeated: true })))}>
                모든 지역 개방 (보스 처치 처리)
              </button>
              <button className="btn btn-small" onClick={() => patch((g) => REGIONS.forEach((r) => void (g.progress[r.id].kills = r.killsForBoss)))}>보스 도전 조건 채우기</button>
              <button className="btn btn-small" onClick={() => patch((g) => void (g.cleared = !g.cleared))}>엔딩 본 상태: {game?.cleared ? '예' : '아니오'}</button>
              <div className="debug-row">
                회차: {cycle + 1}
                <button className="btn btn-small" onClick={() => patch((g) => void (g.cycle = Math.max(0, g.cycle - 1)))}>−</button>
                <button className="btn btn-small" onClick={() => patch((g) => void g.cycle++)}>+</button>
              </div>
              <button className="btn btn-small" onClick={() => patch((g) => Object.values(g.quests).forEach((q) => void (q.progress = 99)))}>모든 의뢰 완료 처리</button>
              <button className="btn btn-small btn-danger" onClick={() => (onReset(), setOpen(false))}>디버그 세이브 지우기</button>
            </div>
          )}

          {tab === '바로가기' && (
            <div className="debug-grid">
              <h3>몬스터와 전투 ({cycle + 1}회차 기준)</h3>
              <div className="debug-row">
                {MONSTERS.map((m) => (
                  <button key={m.id} className={`btn btn-small ${m.boss ? 'btn-boss' : ''}`} onClick={() => fight(m.id)}>
                    {m.name} <small>Lv.{monsterById(m.id, cycle).level}</small>
                  </button>
                ))}
              </div>
              <h3>사건</h3>
              <div className="debug-row">
                {EVENTS.map((e) => (
                  <button
                    key={e.id}
                    className="btn btn-small"
                    onClick={() => {
                      patch((g) => {
                        g.battle = null
                        g.pending = { eventId: e.id, regionId: 'meadow' }
                      })
                      goto({ n: 'region', id: 'meadow' })
                      setOpen(false)
                    }}
                  >
                    {e.title}
                  </button>
                ))}
              </div>
              <h3>화면</h3>
              <div className="debug-row">
                <button className="btn btn-small" onClick={() => leave({ n: 'town' })}>마을</button>
                <button className="btn btn-small" onClick={() => leave({ n: 'map' })}>지도</button>
                {REGIONS.map((r) => (
                  <button key={r.id} className="btn btn-small" onClick={() => leave({ n: 'region', id: r.id })}>
                    {r.name}
                  </button>
                ))}
                <button className="btn btn-small" onClick={() => leave({ n: 'ending' })}>엔딩 화면</button>
              </div>
            </div>
          )}

          {tab === '전투' && (
            <div className="debug-grid">
              {!game?.battle && <p className="debug-note">전투 중이 아니다. '바로가기'에서 몬스터를 고르면 된다.</p>}
              <div className="debug-row">
                <button className="btn btn-small" disabled={!game?.battle} onClick={() => inBattle((g) => void (g.battle!.monsterHp = 1))}>적 HP 1 (한 대면 승리)</button>
                <button className="btn btn-small" disabled={!game?.battle} onClick={() => inBattle((g) => void (g.player.hp = 1))}>내 HP 1 (한 대면 패배)</button>
                <button className="btn btn-small" disabled={!game?.battle} onClick={() => inBattle(heal)}>HP·MP 가득</button>
              </div>
              <h3>적에게</h3>
              <div className="debug-row">
                <button className="btn btn-small" disabled={!game?.battle} onClick={() => inBattle((g) => void (g.battle!.burn = { turns: 3, dmg: 10 }))}>화상</button>
                <button className="btn btn-small" disabled={!game?.battle} onClick={() => inBattle((g) => void (g.battle!.venom = { turns: 3, dmg: 10 }))}>맹독</button>
                <button className="btn btn-small" disabled={!game?.battle} onClick={() => inBattle((g) => void (g.battle!.chill = 2))}>빙결</button>
                <button className="btn btn-small" disabled={!game?.battle} onClick={() => inBattle((g) => void (g.battle!.stunned = true))}>기절</button>
                <button className="btn btn-small" disabled={!game?.battle} onClick={() => inBattle((g) => void (g.battle!.charging = '디버그 필살기'))}>힘 모으기</button>
              </div>
              <h3>나에게</h3>
              <div className="debug-row">
                <button className="btn btn-small" disabled={!game?.battle} onClick={() => inBattle((g) => void (g.battle!.poison = 3))}>중독</button>
                <button className="btn btn-small" disabled={!game?.battle} onClick={() => inBattle((g) => void (g.battle!.focus = true))}>집중 (다음 마법 강화)</button>
              </div>
            </div>
          )}

          {tab === '갤러리' && (
            <div className="debug-grid">
              {allArt().map(([kind, items]) => (
                <div key={kind}>
                  <h3>
                    {kind} <small>{items.length}장</small>
                  </h3>
                  <div className={`gallery gallery-${kind}`}>
                    {items.map((a) => (
                      <figure key={a.id}>
                        <img src={a.url} alt={a.id} loading="lazy" />
                        <figcaption>{a.id}</figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  )
}

/** 세이브가 없을 때 디버그 패널이 쓸 기본 상태 */
export const debugGame = () => newGame('디버그')
