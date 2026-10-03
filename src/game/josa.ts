/** 받침 유무에 따라 조사를 고른다: josa('슬라임', '이', '가') → '슬라임이' */
export function josa(word: string, withFinal: string, withoutFinal: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  const hasFinal = code >= 0 && code <= 11171 ? code % 28 !== 0 : false
  return word + (hasFinal ? withFinal : withoutFinal)
}
