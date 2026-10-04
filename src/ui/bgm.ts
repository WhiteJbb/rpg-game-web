import { isMuted } from './sfx'

// 파일명 = 트랙 id. 실제 다운로드는 재생할 때 일어난다.
const files = import.meta.glob('../assets/bgm/*.m4a', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

const VOLUME = 0.35
const FADE_MS = 600

let wanted: string | null = null
let current: { id: string; audio: HTMLAudioElement } | null = null

const fades = new WeakMap<HTMLAudioElement, number>()

function fade(audio: HTMLAudioElement, to: number, done?: () => void) {
  clearInterval(fades.get(audio)) // 진행 중이던 페이드와 겹치지 않게
  const from = audio.volume
  const start = performance.now()
  const id = window.setInterval(() => {
    const t = Math.min(1, (performance.now() - start) / FADE_MS)
    audio.volume = from + (to - from) * t
    if (t === 1) {
      clearInterval(id)
      done?.()
    }
  }, 50)
  fades.set(audio, id)
}

function apply() {
  const target = isMuted() || document.hidden ? null : wanted
  if (current && current.id !== target) {
    const old = current.audio
    current = null
    fade(old, 0, () => old.pause())
  }
  if (!target || current) return
  const url = files[`../assets/bgm/${target}.m4a`]
  if (!url) return // 아직 음악이 없는 장면
  const audio = new Audio(url)
  audio.loop = true
  audio.volume = 0
  current = { id: target, audio }
  // 첫 클릭 전에는 브라우저가 재생을 막는다. 그 경우 아래 pointerdown에서 다시 시도한다.
  audio.play().then(
    // 불러오는 사이 곡이 바뀌었으면 뒤늦게 켜지 않는다 (두 곡이 겹쳐 들리던 원인)
    () => (current?.audio === audio ? fade(audio, VOLUME) : audio.pause()),
    () => {
      if (current?.audio === audio) current = null
    },
  )
}

/** 장면에 맞는 배경음악으로 바꾼다. 같은 곡이면 그대로 이어서 재생한다. */
export function setBgm(id: string) {
  wanted = id
  apply()
}

/** 음소거 설정이 바뀌었을 때 호출 */
export const refreshBgm = apply

document.addEventListener('pointerdown', apply)
document.addEventListener('visibilitychange', apply)
