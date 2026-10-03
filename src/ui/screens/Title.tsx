import { useState } from 'react'
import { Scene } from '../art'

interface Props {
  hasSave: boolean
  onContinue: () => void
  onNew: (name: string) => void
}

export function Title({ hasSave, onContinue, onNew }: Props) {
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const start = () => {
    if (hasSave && !confirm('저장된 모험이 지워집니다. 새로 시작할까요?')) return
    onNew(name)
  }
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
            <label htmlFor="name">모험가의 이름</label>
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
          </>
        )}
      </div>
    </Scene>
  )
}
