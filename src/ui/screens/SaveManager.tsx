import { useState } from 'react'
import { exportSave, importSave } from '../../game/save'
import type { GameState } from '../../game/types'
import { Confirm, Modal } from '../common'

interface Props {
  game: GameState
  onImport: (g: GameState) => void
  onClose: () => void
}

/** 세이브를 코드로 내보내고 가져온다 (다른 브라우저·기기로 옮기기용) */
export function SaveManager({ game, onImport, onClose }: Props) {
  const code = exportSave(game)
  const [input, setInput] = useState('')
  const [note, setNote] = useState('')
  const [incoming, setIncoming] = useState<GameState | null>(null)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setNote('복사했습니다. 다른 기기에서 붙여 넣으세요.')
    } catch {
      setNote('자동 복사가 막혀 있습니다. 위 칸을 길게 눌러 직접 복사하세요.')
    }
  }

  const load = () => {
    const g = importSave(input)
    if (g) setIncoming(g)
    else setNote('올바른 세이브 코드가 아닙니다.')
  }

  if (incoming)
    return (
      <Confirm
        text={`'${incoming.player.name}' Lv.${incoming.player.level} 세이브를 불러올까요? 지금 진행은 덮어씁니다.`}
        yes="불러오기"
        onYes={() => onImport(incoming)}
        onNo={() => setIncoming(null)}
      />
    )

  return (
    <Modal title="세이브 옮기기" onClose={onClose}>
      <p>이 코드를 복사해 두면 다른 브라우저나 기기에서 이어서 할 수 있습니다.</p>
      <textarea className="save-code" readOnly value={code} rows={3} onFocus={(e) => e.target.select()} aria-label="내 세이브 코드" />
      <button className="btn" onClick={copy}>
        코드 복사
      </button>
      <h3>가져오기</h3>
      <textarea className="save-code" value={input} rows={3} placeholder="세이브 코드를 붙여 넣으세요" onChange={(e) => setInput(e.target.value)} aria-label="가져올 세이브 코드" />
      <button className="btn btn-primary" disabled={!input.trim()} onClick={load}>
        이 코드로 불러오기
      </button>
      {note && <p className="hint">{note}</p>}
    </Modal>
  )
}
