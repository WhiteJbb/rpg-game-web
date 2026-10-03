// 효과음은 오디오 파일 없이 Web Audio로 합성한다.

type Tone = { f: number; to?: number; d: number; at?: number; type?: OscillatorType; g?: number }
type Noise = { noise: number; d: number; at?: number; g?: number } // noise = 저역 통과 주파수
type Step = Tone | Noise

/** 음을 차례로 울리는 짧은 멜로디 */
const melody = (freqs: number[], gap: number, d: number, type: OscillatorType = 'triangle', g = 0.2): Step[] =>
  freqs.map((f, i) => ({ f, d, at: i * gap, type, g }))

const SOUNDS = {
  click: [{ f: 660, d: 0.04, type: 'triangle', g: 0.12 }],
  tick: [{ f: 1000, d: 0.02, type: 'square', g: 0.04 }],
  hit: [{ noise: 1800, d: 0.12, g: 0.5 }, { f: 180, to: 70, d: 0.12, type: 'square', g: 0.2 }],
  crit: [{ noise: 3000, d: 0.18, g: 0.6 }, { f: 320, to: 60, d: 0.2, type: 'sawtooth', g: 0.25 }, { f: 1200, d: 0.08, at: 0.02, g: 0.2 }],
  spell: [{ f: 400, to: 1400, d: 0.3, type: 'sine', g: 0.25 }, { f: 800, to: 2000, d: 0.3, at: 0.05, g: 0.1 }],
  hurt: [{ noise: 900, d: 0.15, g: 0.5 }, { f: 140, to: 50, d: 0.18, type: 'sawtooth', g: 0.25 }],
  dodge: [{ noise: 5000, d: 0.12, g: 0.15 }, { f: 900, to: 1500, d: 0.1, type: 'sine', g: 0.1 }],
  defend: [{ f: 220, d: 0.08, type: 'square', g: 0.15 }, { noise: 2500, d: 0.06, g: 0.25 }],
  charge: [{ f: 80, to: 260, d: 0.6, type: 'sawtooth', g: 0.18 }],
  heal: melody([523, 659, 784], 0.08, 0.14, 'sine'),
  coin: [{ f: 988, d: 0.06, type: 'square', g: 0.1 }, { f: 1319, d: 0.18, at: 0.06, type: 'square', g: 0.1 }],
  error: [{ f: 160, d: 0.12, type: 'square', g: 0.12 }, { f: 120, d: 0.16, at: 0.1, type: 'square', g: 0.12 }],
  encounter: melody([330, 262, 330, 392], 0.08, 0.1, 'square', 0.1),
  victory: melody([523, 659, 784, 1047], 0.1, 0.22),
  levelup: melody([392, 523, 659, 784, 1047, 1319], 0.07, 0.2),
  defeat: melody([440, 349, 294, 220], 0.22, 0.4, 'sine'),
  jackpot: melody([523, 659, 784, 1047, 784, 1047, 1319], 0.09, 0.2, 'square', 0.1),
} satisfies Record<string, Step[]>

export type SoundName = keyof typeof SOUNDS

const MUTE_KEY = 'planet-earth-muted'
let muted = false
try {
  muted = localStorage.getItem(MUTE_KEY) === '1'
} catch {
  /* 저장소를 못 써도 소리는 난다 */
}

let ctx: AudioContext | null = null
let noiseBuffer: AudioBuffer | null = null

export const isMuted = () => muted

export function setMuted(value: boolean) {
  muted = value
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0')
  } catch {
    /* 무시 */
  }
}

export function sfx(name: SoundName) {
  if (muted) return
  try {
    // 브라우저 정책상 사용자 조작 이후에만 소리가 난다. 모든 호출은 클릭에서 시작된다.
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const now = ctx.currentTime
    for (const step of SOUNDS[name] as Step[]) {
      const start = now + (step.at ?? 0)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime((step.g ?? 0.2) * 0.6, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + step.d)
      gain.connect(ctx.destination)
      if ('noise' in step) {
        if (!noiseBuffer) {
          noiseBuffer = ctx.createBuffer(1, ctx.sampleRate / 2, ctx.sampleRate)
          const data = noiseBuffer.getChannelData(0)
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
        }
        const src = ctx.createBufferSource()
        src.buffer = noiseBuffer
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = step.noise
        src.connect(filter).connect(gain)
        src.start(start)
        src.stop(start + step.d)
      } else {
        const osc = ctx.createOscillator()
        osc.type = step.type ?? 'triangle'
        osc.frequency.setValueAtTime(step.f, start)
        if (step.to) osc.frequency.exponentialRampToValueAtTime(step.to, start + step.d)
        osc.connect(gain)
        osc.start(start)
        osc.stop(start + step.d)
      }
    }
  } catch {
    /* 오디오를 못 쓰는 환경에서도 게임은 계속된다 */
  }
}
