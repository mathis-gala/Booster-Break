import type { CardFinish } from '@tcg-collection/shared'

interface FoilCardImageProps {
  src: string
  alt: string
  finish?: CardFinish
  className: string
}

export function FoilCardImage({ src, alt, finish, className }: FoilCardImageProps) {
  const isHolo = finish === 'holo'
  const isReverseHolo = finish === 'reverse_holo'

  return (
    <span className="relative block overflow-hidden rounded-[inherit]">
      <img src={src} alt={alt} className={className} />
      {isHolo ? (
        <>
          <span className="holo-foil pointer-events-none absolute inset-0 rounded-[inherit]" aria-hidden="true" />
          <span className="holo-glint pointer-events-none absolute inset-0 rounded-[inherit]" aria-hidden="true" />
        </>
      ) : null}
      {isReverseHolo ? (
        <>
          <span
            className="reverse-holo-foil pointer-events-none absolute inset-0 rounded-[inherit]"
            aria-hidden="true"
          />
          <span
            className="reverse-holo-sweep pointer-events-none absolute inset-0 rounded-[inherit]"
            aria-hidden="true"
          />
        </>
      ) : null}
    </span>
  )
}
