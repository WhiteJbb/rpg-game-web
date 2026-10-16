import { useState } from 'react'
import { Scene } from '../art'
import { Confirm } from '../common'

interface Props {
  hasSave: boolean
  /** 저장된 세이브를 읽지 못했다 (따로 보관해 둠) */
  broken?: boolean
  onContinue: () => void
  onNew: (name: string) => void
}

export function Title({ hasSave, broken, onContinue, onNew }: Props) {
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
            {hasSave && (
              <button className="btn btn-primary btn-big" onClick={onContinue}>
                이어하기
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
