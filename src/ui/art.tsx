import type { CSSProperties, ReactNode } from 'react'

export type ArtKind = 'backgrounds' | 'monsters' | 'buildings' | 'characters' | 'items' | 'events'

// 파일명 = 데이터 id. 이미지가 아직 없으면 플레이스홀더로 대체된다.
const files = import.meta.glob('../assets/**/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

export const artUrl = (kind: ArtKind, id: string): string | undefined => files[`../assets/${kind}/${id}.webp`]

interface ArtProps {
  kind: ArtKind
  id: string
  alt: string
  className?: string
  /** 이미지가 없을 때 보여줄 글자(이모지) */
  fallback?: string
  style?: CSSProperties
}

/** 직업에 맞는 주인공 그림 id. 그 직업 그림이 아직 없으면 기본 모습. */
export function heroArt(job: string | null, back = false): string {
  const suffix = back ? '-back' : ''
  return job && artUrl('characters', `hero-${job}${suffix}`) ? `hero-${job}${suffix}` : `hero${suffix}`
}

export function Art({ kind, id, alt, className = '', fallback = '❔', style }: ArtProps) {
  const url = artUrl(kind, id)
  if (url) return <img className={`art ${className}`} src={url} alt={alt} draggable={false} style={style} />
  return (
    <span className={`art art-missing ${className}`} role="img" aria-label={alt} style={style}>
      {fallback}
    </span>
  )
}

export function Scene({ bg, className = '', children }: { bg: string; className?: string; children: ReactNode }) {
  const url = artUrl('backgrounds', bg)
  return (
    <div className={`scene ${className}`} data-bg={bg} style={url ? { backgroundImage: `url(${url})` } : undefined}>
      {children}
    </div>
  )
}
