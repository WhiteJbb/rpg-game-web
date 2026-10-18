import { useState } from 'react'
import { jobById } from '../../game/data/jobs'
import type { GameState } from '../../game/types'
import { Scene } from '../art'
import { Confirm } from '../common'

interface Props {
  save: GameState | null
  /** 저장된 세이브를 읽지 못했다 (따로 보관해 둠) */
  broken?: boolean
  onContinue: () => void
  onNew: (name: string) => void
}

export function Title({ save, broken, onContinue, onNew }: Props) {
  const hasSave = save !== null
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [confirming, setConfirming] = useState(false)
  const start = () => (hasSave ? setConfirming(true) : onNew(name))
  return (
    <Scene bg="title" className="title-scene">
      <h1 className="logo">
        행성 <span>:</span> 지구
      </h1>
      <div className="title-menu">
        {naming ? (
          <form
            className="panel name-form"
            onSubmit={(e) => {
              e.preventDefault()
              start()
            }}
          >
            <label htmlFor="name">모험가의 이름 <small>(12자까지)</small></label>
            <input id="name" value={name} maxLength={12} autoFocus placeholder="모험가" onChange={(e) => setName(e.target.value)} />
            <div className="row">
              <button type="button" className="btn" onClick={() => setNaming(false)}>
                뒤로
              </button>
              <button type="submit" className="btn btn-primary">
                모험 시작
              </button>
            </div>
          </form>
        ) : (
          <>
            {save && (
              <button className="btn btn-primary btn-big" onClick={onContinue}>
                이어하기
                <small className="title-save">
                  {save.player.name} · Lv.{save.player.level}
                  {save.player.job && ` · ${jobById(save.player.job).name}`}
                  {save.cycle > 0 && ` · ${save.cycle + 1}회차`}
                  {save.battle && ' · 전투 중'}
                </small>
              </button>
            )}

            <button className={`btn btn-big ${hasSave ? '' : 'btn-primary'}`} onClick={() => setNaming(true)}>
              새로 시작
            </button>
            {broken && <p className="panel title-note">저장된 모험을 읽을 수 없어 따로 보관해 두었다. 새 버전에서 고쳐질 수 있다.</p>}
          </>
        )}
      </div>
      {confirming && <Confirm text="저장된 모험이 지워집니다. 새로 시작할까요?" yes="새로 시작" onYes={() => onNew(name)} onNo={() => setConfirming(false)} />}
    </Scene>
  )
}
