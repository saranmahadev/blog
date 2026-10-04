import '@/styles/imaxt.css';
// One banner, drawn the same way on an article page and in the Advertise page's live preview, so what a sponsor previews
// is exactly what readers see. It has no state and needs no JavaScript on article pages.
import { LIMITS, SLOTS, type Slot } from '@/lib/sponsors';

export type BannerProps = {
  slot: Slot;
  kind: 'image' | 'text';
  href: string;
  /** Our own banners say "Dev Universe"; paid ones say "Sponsored". */
  label: string;
  house?: boolean;
  image?: string;
  image2x?: string;
  mobileImage?: string;
  alt?: string;
  headline?: string;
  line?: string;
  cta?: string;
  tone?: string;
  /** House banners only: the animation behind the banner. */
  motion?: string;
  /** Draw only the banner, with no wrapper or label (inside the rotator, which supplies both). */
  bare?: boolean;
  /** In the builder, the banner is shown but cannot be followed. */
  preview?: boolean;
};

export default function Banner(p: BannerProps) {
  const size = SLOTS[p.slot];
  const external = /^https?:\/\//.test(p.href);
  const rel = 'sponsored noopener';
  const link = p.preview ? { href: '#', onClick: (e: { preventDefault: () => void }) => e.preventDefault(), 'aria-disabled': true as const } : { href: p.href, rel: external ? rel : undefined };
  const content = (
    <>
      {p.kind === 'image' && p.image ? (
        <a className="sponsor-box sponsor-img" {...link}>
          <picture>
            {p.mobileImage && size.mobile && <source media="(max-width: 600px)" srcSet={p.mobileImage} width={size.mobile.w} height={size.mobile.h} />}
            <img src={p.image} srcSet={p.image2x ? `${p.image} 1x, ${p.image2x} 2x` : undefined} width={size.w} height={size.h} alt={p.alt ?? ''} loading={p.preview ? undefined : 'lazy'} decoding="async" />
          </picture>
        </a>
      ) : (
        <a className={`sponsor-box sponsor-text${p.motion ? ` sponsor-fx fx-${p.motion}` : ''}`} data-tone={p.tone ?? 'mint'} {...link}>
          <span className="sponsor-copy">
            <strong className="sponsor-head">{(p.headline ?? '').slice(0, LIMITS.headline)}</strong>
            {p.line ? <span className="sponsor-line">{p.line.slice(0, LIMITS.line)}</span> : null}
          </span>
          <span className="sponsor-cta">{(p.cta ?? 'Learn more').slice(0, LIMITS.cta)} <span aria-hidden="true">→</span></span>
        </a>
      )}
    </>
  );
  if (p.bare) return content;
  return (
    <aside className={`sponsor sponsor-${p.slot}`} aria-label={p.label} data-sponsor data-pagefind-ignore>
      <span className="sponsor-tag">{p.label}</span>
      {content}
    </aside>
  );
}
