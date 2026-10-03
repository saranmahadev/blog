import { useEffect, useId, useState } from 'react';

type FamilyKey = 'archivo' | 'fraunces' | 'source-serif';
type Axis = { tag: 'wght' | 'wdth' | 'opsz'; label: string; min: number; max: number; def: number };

// Only the axes the site actually ships are offered.
const FAMILIES: Record<FamilyKey, { label: string; css: string; axes: Axis[]; italic?: boolean }> = {
  archivo: {
    label: 'Archivo',
    css: "'Archivo Variable', 'Archivo', sans-serif",
    axes: [
      { tag: 'wght', label: 'Weight', min: 100, max: 900, def: 800 },
      { tag: 'wdth', label: 'Width', min: 62, max: 125, def: 80 },
    ],
  },
  fraunces: {
    label: 'Fraunces',
    css: "'Fraunces Variable', 'Fraunces', Georgia, serif",
    italic: true,
    axes: [
      { tag: 'wght', label: 'Weight', min: 100, max: 900, def: 600 },
      { tag: 'opsz', label: 'Optical size', min: 9, max: 144, def: 144 },
    ],
  },
  'source-serif': {
    label: 'Source Serif 4',
    css: "'Source Serif 4 Variable', 'Source Serif 4', Georgia, serif",
    axes: [{ tag: 'wght', label: 'Weight', min: 200, max: 900, def: 400 }],
  },
};

interface Props { sample?: string; family?: FamilyKey }

export default function TypeLab({ sample = 'Typography is the interface', family: initial = 'fraunces' }: Props) {
  const uid = useId();
  const [family, setFamily] = useState<FamilyKey>(initial);
  const [text, setText] = useState(sample);
  const [size, setSize] = useState(64);
  const [lineHeight, setLineHeight] = useState(1.05);
  const [tracking, setTracking] = useState(-0.02);
  const [italic, setItalic] = useState(false);
  const [axes, setAxes] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  // Until hydration finishes the controls are visibly inert.
  useEffect(() => setReady(true), []);

  const f = FAMILIES[family];
  const value = (a: Axis) => axes[`${family}:${a.tag}`] ?? a.def;
  const settings = f.axes.filter((a) => a.tag !== 'wght').map((a) => `"${a.tag}" ${value(a)}`).join(', ');
  const weight = value(f.axes.find((a) => a.tag === 'wght')!);
  const style = {
    fontFamily: f.css,
    fontWeight: weight,
    fontStyle: f.italic && italic ? 'italic' : 'normal',
    fontVariationSettings: settings || 'normal',
    fontSize: `${size}px`,
    lineHeight,
    letterSpacing: `${tracking}em`,
  } as const;
  const css = [
    `font-family: ${f.css};`,
    `font-weight: ${weight};`,
    f.italic && italic ? 'font-style: italic;' : null,
    settings ? `font-variation-settings: ${settings};` : null,
    `font-size: ${size}px;`,
    `line-height: ${lineHeight};`,
    `letter-spacing: ${tracking}em;`,
  ].filter(Boolean).join('\n');

  const reset = () => {
    setAxes({}); setSize(64); setLineHeight(1.05); setTracking(-0.02); setItalic(false); setText(sample);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(css); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard unavailable */ }
  };

  const slider = (id: string, label: string, min: number, max: number, step: number, v: number, set: (n: number) => void, unit = '') => (
    <div className="imx-tl-ctl">
      <label htmlFor={`${uid}-${id}`} className="imx-label">{label}</label>
      <input id={`${uid}-${id}`} type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(Number(e.target.value))} />
      <output htmlFor={`${uid}-${id}`} className="imx-tl-val">{v}{unit}</output>
    </div>
  );

  return (
    <div className="imx-typelab imx-slab" data-ready={ready ? '' : undefined}>
      <div className="imx-tl-head">
        <div className="imx-tl-fam" role="group" aria-label="Typeface">
          {(Object.keys(FAMILIES) as FamilyKey[]).map((k) => (
            <button key={k} type="button" aria-pressed={family === k} onClick={() => setFamily(k)}>{FAMILIES[k].label}</button>
          ))}
        </div>
        <button type="button" className="imx-tl-reset" onClick={reset}>Reset</button>
      </div>

      <div className="imx-tl-stage">
        <div className="imx-tl-preview" style={style} aria-live="off">{text || ' '}</div>
      </div>

      <div className="imx-tl-controls">
        <div className="imx-tl-ctl imx-tl-text">
          <label htmlFor={`${uid}-text`} className="imx-label">Sample text</label>
          <input id={`${uid}-text`} type="text" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        {f.axes.map((a) => slider(a.tag, a.label, a.min, a.max, 1, value(a), (n) => setAxes((s) => ({ ...s, [`${family}:${a.tag}`]: n }))))}
        {slider('size', 'Size', 16, 140, 1, size, setSize, 'px')}
        {slider('lh', 'Line height', 0.8, 2, 0.01, lineHeight, setLineHeight)}
        {slider('ls', 'Tracking', -0.1, 0.3, 0.005, tracking, setTracking, 'em')}
        {f.italic && (
          <label className="imx-tl-check"><input type="checkbox" checked={italic} onChange={(e) => setItalic(e.target.checked)} /> Italic</label>
        )}
      </div>

      <div className="imx-tl-out">
        <pre><code>{css}</code></pre>
        <button type="button" className="btn sm" onClick={copy}>{copied ? 'Copied' : 'Copy CSS'}</button>
      </div>
    </div>
  );
}
