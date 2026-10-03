# Drafted: design system

The visual design for **Drafted** (by Dev). The live site implements this in `src/`; this folder is the reference.

| Path | What it is |
| --- | --- |
| `preview/*.html` | Static pages, open in a browser (light theme). Start with `Main.html` |
| `screenshots/*.jpg` | Full-page renders: all pages in light, Home and Article in dark |
| `mock/` | Source of the Design canvas (`*.dc.html`, `mock.css`, `canvas.json`), including the palette pickers |
| `tools/build-previews.py` | Regenerates `preview/` from `mock/` |

## Principles

Three layers, one rule each:

1. **Structure is brutalist:** 1.5px ink rules, hairline dividers, heavy condensed headlines, mono labels.
2. **Content tiles are slabs:** flat colour, 1.5px border, 14px radius, a 4px hard offset shadow. They press 2px on hover.
3. **Controls are clay:** buttons, icon buttons, switches and segmented controls with soft dual shadows. Tags are flat outlined labels, not clay.

The article body stays Medium-clean: serif text, narrow measure, no decoration.

## Colour

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| Ink (primary) | `#1c1c1c` | `#f4f1e8` | Text, rules, primary buttons |
| Accent (secondary) | `#0f7b4d` emerald | `#6aad91` | Series band, links, active states, secondary buttons |
| Paper | `#f6f3ea` | `#1c1c1c` | Page background |
| Surface | `#ebe6d8` | `#262626` | Inputs, table heads, thumbnails |
| Card | `#fffdf6` | `#2a2a2a` | Slab surface |
| Focus ring | `#3a3dff` | same | Keyboard focus only |
| Tones | mint `#b6f0d3`, lilac `#d6cbff`, sky `#b8dcff`, rose `#ffc6d6` | muted dark equivalents | Series colours |

Contrast: white on emerald 5.3:1, emerald on paper 4.8:1, lightened emerald on ink 6.5:1. Text on the accent is chosen for contrast (white on emerald).
The accent is for actions, links and highlights; it never carries body text.

## Type

| Role | Font | Notes |
| --- | --- | --- |
| Display | Archivo, weight 800, width 80 | 48 to 200px, tight leading |
| Headline | Archivo, weight 800, width 85 | 20 to 40px |
| Reading | Source Serif 4 | 21px / 1.7, about 68 characters |
| UI | Archivo 400 to 700 | 14 to 16px |
| Labels | Space Mono, uppercase | Kickers and section labels only; dates and meta use regular 14px |

## Layout

- Content width caps at 1680px with gutters of `clamp(16px, 3vw, 48px)`; bands run edge to edge.
- Home: lead story (about 6.2fr) beside top stories (3.2fr) and a numbered Latest column (2.8fr), then an accent Series band, then a two-column text-first feed.
- Article: 260px contents and series rail, text column (max 720px), 300px actions rail. Wide blocks may extend 60px into the gutters. Below 1024px the rails collapse.
- Covers: tone-on-tone patterns only on the lead story, series tiles and article hero. Elsewhere, a flat tone square with the post's initial.

## Imaxt

Imaxt is the blog's signature feature: typography and layout used as the visuals, because posts carry no images. Blocks: Statement, Stat/StatRow, PullQuote, Compare, Steps, Timeline, Bars, Sidenote, CodeWalk, Marquee, plus typographic covers. Display type is Fraunces (optical-size axis) alongside Archivo's width and weight axes; it loads only on pages that use it. Reference: the `/imaxt/` Lab page on the live site. v2 adds Heatmap, CurvedText, Scrolly, TypeLab and Mermaid diagrams (built at build time, themed for light and dark). The design canvas for Imaxt is added in a later step.

## The accent in code

One token, `--accent`, plus `--on-accent` (text on it) and `--accent-lt` (the lightened value used on dark surfaces). Change the accent in `src/styles/tokens.css`; nothing else needs editing.
