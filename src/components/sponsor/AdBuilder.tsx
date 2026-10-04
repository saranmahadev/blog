// The Advertise page's builder: pick a tier and a term, build a banner from our Imaxt text style or preview your own image,
// see the price in your currency, and open an email that is already written. Runs only in the visitor's browser: nothing is
// uploaded, stored or sent by the site.
import { useEffect, useMemo, useRef, useState } from 'react';
import Banner from './Banner';
import { CURRENCIES, CURRENCY_KEYS, TERMS, TIERS, TIER_IDS, money, priceFor, type Currency, type TermDays, type TierId } from '@/lib/ad-prices';
import { buildRequest, slotsOf } from '@/lib/mailto';
import { IMAGE_TYPES, LIMITS, MAX_IMAGE_BYTES, SLOTS, type Slot } from '@/lib/sponsors';

type Pic = { name: string; url: string; bytes: number; type: string; w: number; h: number };
const TONES = ['mint', 'lilac', 'sky', 'rose', 'accent', 'ink'] as const;

const currencyFor = (locale: string): Currency => {
  const region = locale.split('-')[1]?.toUpperCase();
  if (region === 'IN') return 'INR';
  if (region === 'GB') return 'GBP';
  if (region && ['DE', 'FR', 'ES', 'IT', 'NL', 'IE', 'PT', 'BE', 'AT', 'FI', 'GR'].includes(region)) return 'EUR';
  if (region && ['US', 'CA', 'AU', 'NZ', 'SG'].includes(region)) return 'USD';
  return 'INR';
};

/** What is wrong with a picture for a slot, in plain words. Empty means it is ready. */
export function checkImage(p: Pic, slot: Slot): string[] {
  const size = SLOTS[slot];
  const problems: string[] = [];
  if (!(IMAGE_TYPES as readonly string[]).includes(p.type)) problems.push('Use a PNG, JPEG, WebP or SVG file.');
  if (p.bytes > MAX_IMAGE_BYTES) problems.push(`The file is ${Math.round(p.bytes / 1024)} KB. The limit is ${MAX_IMAGE_BYTES / 1024} KB.`);
  if (p.type === 'image/svg+xml') {
    if (Math.abs(p.w / p.h - size.w / size.h) > 0.02) problems.push(`The shape must match ${size.w} x ${size.h}.`);
  } else if (!((p.w === size.w && p.h === size.h) || (p.w === size.w * 2 && p.h === size.h * 2))) {
    problems.push(`The picture is ${p.w} x ${p.h}. It must be ${size.w} x ${size.h}, or ${size.w * 2} x ${size.h * 2} for sharper screens.`);
  }
  return problems;
}

export default function AdBuilder() {
  const [currency, setCurrency] = useState<Currency>('INR');
  const [tier, setTier] = useState<TierId>('standard');
  const [pick, setPick] = useState<Slot>('inline');
  const [days, setDays] = useState<TermDays>(30);
  const [kind, setKind] = useState<'text' | 'image'>('text');
  const [headline, setHeadline] = useState('Your headline goes here');
  const [line, setLine] = useState('One sentence that tells readers why to click.');
  const [cta, setCta] = useState('Learn more');
  const [tone, setTone] = useState<(typeof TONES)[number]>('mint');
  const [link, setLink] = useState('');
  const [alt, setAlt] = useState('');
  const [pics, setPics] = useState<Partial<Record<Slot, Pic>>>({});
  const [company, setCompany] = useState('');
  const [contact, setContact] = useState('');
  const [start, setStart] = useState('');
  const [notes, setNotes] = useState('');
  const [view, setView] = useState<Slot>('inline');
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setCurrency(currencyFor(navigator.language || 'en-IN')); }, []);

  const slots = slotsOf({ tier, slot: pick });
  const previewSlot = slots.includes(view) ? view : slots[0];
  const total = priceFor(tier, currency, days);
  const today = new Date().toISOString().slice(0, 10);

  const imageProblems = useMemo(() => Object.fromEntries(slots.map((s) => [s, pics[s] ? checkImage(pics[s]!, s) : ['No image chosen yet.']])) as Record<Slot, string[]>, [slots, pics]);

  function onFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      const img = new Image();
      img.onload = () => setPics((p) => ({ ...p, [previewSlot]: { name: file.name, url, bytes: file.size, type: file.type, w: img.naturalWidth, h: img.naturalHeight } }));
      img.onerror = () => setPics((p) => ({ ...p, [previewSlot]: { name: file.name, url, bytes: file.size, type: 'unreadable', w: 0, h: 0 } }));
      img.src = url;
    };
    reader.readAsDataURL(file);
  }

  const request = () => buildRequest({
    company: company.trim(), contact: contact.trim(), link: link.trim(), tier, slot: pick, days, currency, start,
    kind, headline, line, cta, tone, images: Object.fromEntries(slots.map((s) => [s, pics[s]?.name ?? ''])), alt, notes: notes.trim(),
  });

  function problems(): string[] {
    const out: string[] = [];
    if (!company.trim()) out.push('Add your company or project name.');
    if (!contact.trim()) out.push('Add the name of a contact person.');
    try { if (new URL(link.trim()).protocol !== 'https:') throw new Error(); } catch { out.push('Add the link readers should go to. It must start with https://'); }
    if (start && start < today) out.push('Choose a start date that is not in the past.');
    if (kind === 'text') {
      if (!headline.trim()) out.push('Add a headline.');
      if (!cta.trim()) out.push('Add the button text.');
    } else {
      if (alt.trim().length < 5) out.push('Describe the banner in the alt text box, for readers who cannot see it.');
      for (const s of slots) if (imageProblems[s].length) out.push(`${SLOTS[s].label}: ${imageProblems[s][0]}`);
    }
    return out;
  }

  function open() {
    const found = problems();
    setErrors(found);
    if (found.length) { setStatus(''); return; }
    window.location.href = request().href;
    setStatus('Your email app should open with the request written. If nothing happened, use "Copy the request" and paste it into an email to the address shown.');
  }

  async function copy() {
    const found = problems();
    setErrors(found);
    if (found.length) return;
    const { subject, body } = request();
    const text = `Subject: ${subject}\n\n${body}`;
    try { await navigator.clipboard.writeText(text); setStatus('Copied. Paste it into an email.'); }
    catch { setStatus('Your browser blocked copying. Select the text in the box below and copy it.'); }
  }

  const sample = {
    kind, href: link.trim() || 'https://example.com', label: 'Sponsored', headline, line, cta, tone,
    image: pics[previewSlot]?.url, alt, preview: true,
  } as const;

  return (
    <div className="adv">
      <div className="adv-row">
        <label className="adv-field adv-narrow">
          <span className="mono">Show prices in</span>
          <select className="inp" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            {CURRENCY_KEYS.map((c) => <option key={c} value={c}>{c} · {CURRENCIES[c].name}</option>)}
          </select>
        </label>
      </div>

      <fieldset className="adv-set">
        <legend className="head">1. Choose a tier</legend>
        <div className="adv-tiers">
          {TIER_IDS.map((id) => (
            <label key={id} className={`slab adv-tier${tier === id ? ' on' : ''}`}>
              <input type="radio" name="tier" value={id} checked={tier === id} onChange={() => setTier(id)} />
              <span className="head adv-tier-n">{TIERS[id].name}</span>
              <span className="adv-tier-p">{money(TIERS[id].per30[currency], currency)} <small>per 30 days</small></span>
              <span className="serif">{TIERS[id].blurb}</span>
              <span className="mono">{TIERS[id].slots.map((s) => SLOTS[s].label).join(' · ')}</span>
              {tier === id && <span className="mono adv-on">Selected</span>}
            </label>
          ))}
        </div>
        {TIERS[tier].choose && (
          <div className="adv-row" role="radiogroup" aria-label="Which slot for the Starter tier">
            {TIERS[tier].slots.map((s) => (
              <label key={s} className="adv-chip"><input type="radio" name="pick" checked={pick === s} onChange={() => { setPick(s); setView(s); }} /> {SLOTS[s].label} ({SLOTS[s].w} x {SLOTS[s].h})</label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="adv-set">
        <legend className="head">2. Choose how long</legend>
        <p className="serif muted">Every booking has an end date. There are no permanent slots, and the longest term is 90 days.</p>
        <div className="adv-row">
          {TERMS.map((t) => (
            <label key={t.days} className="adv-chip"><input type="radio" name="term" checked={days === t.days} onChange={() => setDays(t.days)} /> {t.days} days{t.discount ? ` · ${Math.round(t.discount * 100)}% off` : ''} · {money(priceFor(tier, currency, t.days), currency)}</label>
          ))}
        </div>
      </fieldset>

      <fieldset className="adv-set">
        <legend className="head">3. Make the banner</legend>
        <div className="seg" role="tablist" aria-label="How to make the banner">
          <button type="button" role="tab" aria-selected={kind === 'text'} className={kind === 'text' ? 'on' : ''} onClick={() => setKind('text')}>Build it with Imaxt</button>
          <button type="button" role="tab" aria-selected={kind === 'image'} className={kind === 'image' ? 'on' : ''} onClick={() => setKind('image')}>Use my own image</button>
        </div>

        {kind === 'text' ? (
          <div className="adv-form">
            <label className="adv-field"><span className="mono">Headline ({headline.length}/{LIMITS.headline})</span><input className="inp" maxLength={LIMITS.headline} value={headline} onChange={(e) => setHeadline(e.target.value)} /></label>
            <label className="adv-field"><span className="mono">One line ({line.length}/{LIMITS.line}). The inline banner shows about 55 characters on one line.</span><input className="inp" maxLength={LIMITS.line} value={line} onChange={(e) => setLine(e.target.value)} /></label>
            <label className="adv-field"><span className="mono">Button text ({cta.length}/{LIMITS.cta})</span><input className="inp" maxLength={LIMITS.cta} value={cta} onChange={(e) => setCta(e.target.value)} /></label>
            <fieldset className="adv-tones"><legend className="mono">Colour</legend>
              {TONES.map((t) => <label key={t} className="adv-chip"><input type="radio" name="tone" checked={tone === t} onChange={() => setTone(t)} /> {t}</label>)}
            </fieldset>
          </div>
        ) : (
          <div className="adv-form">
            <p className="serif muted">Pick an image for the slot you are previewing: <strong>{SLOTS[previewSlot].label}</strong>, {SLOTS[previewSlot].w} x {SLOTS[previewSlot].h} pixels (or double that), PNG, JPEG, WebP or SVG, up to {MAX_IMAGE_BYTES / 1024} KB. Your file stays in your browser.</p>
            <label className="adv-field"><span className="mono">Image for {SLOTS[previewSlot].label}</span><input ref={fileRef} className="inp" type="file" accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => onFile(e.target.files?.[0])} /></label>
            <label className="adv-field"><span className="mono">Alt text: what the banner says, for people who cannot see it</span><input className="inp" value={alt} onChange={(e) => setAlt(e.target.value)} /></label>
            <ul className="adv-checks" aria-label="Image checks">
              {slots.map((s) => (
                <li key={s}><strong>{SLOTS[s].label} ({SLOTS[s].w} x {SLOTS[s].h}):</strong> {imageProblems[s].length ? <span>Not ready. {imageProblems[s][0]}</span> : <span>Ready ({pics[s]!.name}).</span>}</li>
              ))}
            </ul>
          </div>
        )}
        <label className="adv-field"><span className="mono">Where the banner links to (https)</span><input className="inp" type="url" inputMode="url" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} /></label>
      </fieldset>

      <section className="adv-set" aria-label="Preview">
        <h3 className="head">4. See exactly what readers will see</h3>
        {slots.length > 1 && (
          <div className="adv-row" role="radiogroup" aria-label="Preview which placement">
            {slots.map((s) => <label key={s} className="adv-chip"><input type="radio" name="view" checked={previewSlot === s} onChange={() => setView(s)} /> {SLOTS[s].label}</label>)}
          </div>
        )}
        <p className="serif muted">{SLOTS[previewSlot].label}: {SLOTS[previewSlot].w} x {SLOTS[previewSlot].h}, shown {SLOTS[previewSlot].where}. It scales down in proportion on narrower screens, so keep text away from the edges. Use the theme button in the header to see it in light and dark.</p>
        <div className="adv-stage">
          {kind === 'image' && !pics[previewSlot]
            ? <p className="mono adv-empty">Choose an image above to preview it here.</p>
            : <Banner slot={previewSlot} {...sample} />}
        </div>
      </section>

      <fieldset className="adv-set">
        <legend className="head">5. Book by email</legend>
        <div className="slab adv-sum" role="status" aria-live="polite">
          <div className="head">Your booking</div>
          <p><strong>{TIERS[tier].name}</strong>: {slots.map((s) => SLOTS[s].label).join(', ')} · {days} days · <strong>{money(total, currency)}</strong> ({currency}), paid in advance.</p>
          <p className="muted">The banner runs for {days} days from the agreed start date and then ends. There are no permanent slots.</p>
        </div>
        <div className="adv-form">
          <label className="adv-field"><span className="mono">Company or project</span><input className="inp" value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" /></label>
          <label className="adv-field"><span className="mono">Your name</span><input className="inp" value={contact} onChange={(e) => setContact(e.target.value)} autoComplete="name" /></label>
          <label className="adv-field adv-narrow"><span className="mono">Preferred start (optional)</span><input className="inp" type="date" min={today} value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label className="adv-field"><span className="mono">Anything else (optional)</span><textarea className="inp" rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        </div>
        {errors.length > 0 && <ul className="adv-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        <div className="adv-row">
          <button type="button" className="btn ink" onClick={open}>Open my email app <span aria-hidden="true">→</span></button>
          <button type="button" className="btn" onClick={copy}>Copy the request</button>
        </div>
        {status && <p className="serif" role="status">{status}</p>}
        {kind === 'image' && <p className="hint">An email link cannot attach files. When your email opens, attach the image file{slots.length > 1 ? 's' : ''} you previewed.</p>}
      </fieldset>
    </div>
  );
}
