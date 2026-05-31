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
          <span
            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(115deg,transparent_8%,rgb(125_211_252_/_0.46)_26%,rgb(244_114_182_/_0.4)_42%,rgb(253_224_71_/_0.36)_56%,transparent_78%)] bg-[length:220%_220%] opacity-55 mix-blend-screen motion-safe:animate-[foil-hologram_3.4s_ease-in-out_infinite]"
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute -inset-x-1 inset-y-0 rounded-[inherit] bg-[linear-gradient(100deg,transparent_18%,rgb(255_255_255_/_0.58)_42%,transparent_62%)] opacity-35 mix-blend-screen motion-safe:animate-[foil-sweep_2.2s_ease-in-out_infinite]"
            aria-hidden="true"
          />
        </>
      ) : null}
      {isReverseHolo ? (
        <span className="reverse-holo-sequins pointer-events-none absolute inset-0 rounded-[inherit]" aria-hidden="true" />
      ) : null}
    </span>
  )
}
