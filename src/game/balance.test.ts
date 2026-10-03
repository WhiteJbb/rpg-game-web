import { describe, expect, it } from 'vitest'
import { simulate } from './bot'
import { REGIONS } from './data/regions'

/** 난이도 측정. 목표 범위를 벗어나면 실패한다. 수치를 바꿨으면 여기 출력되는 표를 보고 맞춘다. */
const SEEDS = Array.from({ length: 12 }, (_, i) => i + 1)
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

describe('난이도', () => {
  for (const build of ['warrior', 'mage', 'rogue'] as const) {
    it(`${build}: 긴장감은 있되 막히지 않는다`, () => {
      const runs = SEEDS.map((seed) => simulate(build, seed))
      const rows = REGIONS.map((r) => {
        const st = runs.map((run) => run.stats[r.id])
        const normal = st.map((x) => x.battles - x.bossTries)
        return {
          지역: r.id,
          전투수: +avg(st.map((x) => x.battles)).toFixed(1),
          사망: +avg(st.map((x) => x.deaths)).toFixed(2),
          '턴/전투': +avg(st.map((x) => x.turns / x.battles)).toFixed(1),
          'HP손실%': +avg(st.map((x, i) => (x.hpLost / Math.max(1, normal[i])) * 100)).toFixed(0),
          보스시도: +avg(st.map((x) => x.bossTries)).toFixed(2),
          보스레벨: +avg(st.map((x) => x.bossLevel)).toFixed(1),
          보스턴: +avg(st.map((x) => x.bossTurns)).toFixed(1),
        }
      })
      const battles = avg(runs.map((run) => Object.values(run.stats).reduce((a, x) => a + x.battles, 0)))
      const deaths = avg(runs.map((run) => Object.values(run.stats).reduce((a, x) => a + x.deaths, 0)))
      console.log(build, { 클리어: runs.filter((r) => r.cleared).length + '/' + runs.length, 전투: +battles.toFixed(0), 사망: +deaths.toFixed(1), 포션: +avg(runs.map((r) => r.potionsUsed)).toFixed(0), 레벨: +avg(runs.map((r) => r.level)).toFixed(1) })
      console.table(rows)

      expect(runs.every((r) => r.cleared)).toBe(true)
      // 한 번도 안 죽으면 싱겁고, 너무 자주 죽으면 짜증난다
      expect(deaths).toBeGreaterThanOrEqual(1)
      expect(deaths).toBeLessThanOrEqual(8)
      // 엔딩까지의 길이
      expect(battles).toBeGreaterThan(90)
      expect(battles).toBeLessThan(200)
      // 보스는 평균 한두 번 안에 잡힌다 (늘 한 번에 잡히지도, 한 보스에서 한없이 막히지도 않는다)
      const tries = avg(rows.map((row) => row.보스시도))
      expect(tries).toBeGreaterThanOrEqual(1.1)
      expect(tries).toBeLessThanOrEqual(2.5)
      for (const row of rows) expect(row.보스시도).toBeLessThanOrEqual(3.5)
    })
  }
})
