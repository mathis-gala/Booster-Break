import type { CardFinish } from '@tcg-collection/shared'

interface FoilCardImageProps {
  src: string
  alt: string
  finish?: CardFinish
  className: string
}

export function FoilCardImage({ src, alt, finish, className }: FoilCardImageProps) {
  const isFoil = finish === 'holo' || finish === 'reverse_holo'
  const foilClass =
    finish === 'reverse_holo'
      ? 'bg-[radial-gradient(circle_at_var(--foil-x,_28%)_var(--foil-y,_18%),rgb(255_255_255_/_0.72),transparent_20%),linear-gradient(135deg,rgb(216_180_254_/_0.44),transparent_28%,rgb(94_234_212_/_0.38)_56%,rgb(251_113_133_/_0.34))]'
      : 'bg-[linear-gradient(115deg,transparent_8%,rgb(125_211_252_/_0.46)_26%,rgb(244_114_182_/_0.4)_42%,rgb(253_224_71_/_0.36)_56%,transparent_78%)]'

  return (
    <span className="relative block overflow-hidden rounded-[inherit]">
      <img src={src} alt={alt} className={className} />
      {isFoil ? (
        <>
          <span
            className={`pointer-events-none absolute inset-0 rounded-[inherit] bg-[length:220%_220%] opacity-55 mix-blend-screen motion-safe:animate-[foil-hologram_3.4s_ease-in-out_infinite] ${foilClass}`}
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute -inset-x-1 inset-y-0 rounded-[inherit] bg-[linear-gradient(100deg,transparent_18%,rgb(255_255_255_/_0.58)_42%,transparent_62%)] opacity-35 mix-blend-screen motion-safe:animate-[foil-sweep_2.2s_ease-in-out_infinite]"
            aria-hidden="true"
          />
        </>
      ) : null}
    </span>
  )
}
