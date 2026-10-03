// Renders ```mermaid fences to inline SVG at build time (no JavaScript is shipped to readers).
// Each diagram is rendered once per theme (light and dark) and CSS shows the one that matches the
// site theme, so every Mermaid diagram type is correct in dark mode, not just the ones we restyle.
// Diagrams must declare accTitle and accDescr; the build fails otherwise.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createMermaidRenderer } from 'mermaid-isomorphic';
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';
import { visit } from 'unist-util-visit';

const require = createRequire(import.meta.url);
const CACHE_DIR = path.resolve('node_modules/.cache/drafted-mermaid');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/opt/pw-browsers/chromium',
].filter(Boolean);
const executablePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p));

// Mermaid measures text in the headless browser, so it must have the same fonts the site uses.
function fontCss() {
  const dir = (pkg) => path.dirname(require.resolve(`${pkg}/package.json`));
  const file = (pkg, name) => pathToFileURL(path.join(dir(pkg), 'files', name)).href;
  const css = `
@font-face{font-family:'Archivo';src:url(${file('@fontsource-variable/archivo', 'archivo-latin-wdth-normal.woff2')});font-weight:100 900;font-stretch:62% 125%}
@font-face{font-family:'Space Mono';src:url(${file('@fontsource/space-mono', 'space-mono-latin-400-normal.woff2')});font-weight:400}`;
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const out = path.join(CACHE_DIR, 'fonts.css');
  fs.writeFileSync(out, css);
  return pathToFileURL(out).href;
}

const common = {
  theme: 'base',
  htmlLabels: false,
  flowchart: { htmlLabels: false, curve: 'basis', padding: 14 },
  sequence: { useMaxWidth: true },
};
const THEMES = {
  light: {
    ...common,
    themeVariables: {
      fontFamily: 'Archivo, sans-serif', fontSize: '16px', background: 'transparent',
      primaryColor: '#b6f0d3', primaryTextColor: '#1c1c1c', primaryBorderColor: '#1c1c1c',
      secondaryColor: '#d6cbff', secondaryTextColor: '#1c1c1c', secondaryBorderColor: '#1c1c1c',
      tertiaryColor: '#b8dcff', tertiaryTextColor: '#1c1c1c', tertiaryBorderColor: '#1c1c1c',
      lineColor: '#1c1c1c', textColor: '#1c1c1c', mainBkg: '#b6f0d3', nodeBorder: '#1c1c1c',
      clusterBkg: '#fffdf6', clusterBorder: '#1c1c1c', edgeLabelBackground: '#fffdf6',
      noteBkgColor: '#ebe6d8', noteTextColor: '#1c1c1c', noteBorderColor: '#1c1c1c',
      actorBkg: '#b6f0d3', actorBorder: '#1c1c1c', actorTextColor: '#1c1c1c', actorLineColor: '#1c1c1c',
      signalColor: '#1c1c1c', signalTextColor: '#1c1c1c', labelBoxBkgColor: '#d6cbff', labelBoxBorderColor: '#1c1c1c',
      labelTextColor: '#1c1c1c', loopTextColor: '#1c1c1c', activationBkgColor: '#d6cbff', activationBorderColor: '#1c1c1c',
      sequenceNumberColor: '#ffffff', pie1: '#0f7b4d', pie2: '#d6cbff', pie3: '#b8dcff', pie4: '#ffc6d6', pie5: '#b6f0d3',
      pieTitleTextColor: '#1c1c1c', pieSectionTextColor: '#1c1c1c', pieStrokeColor: '#1c1c1c', pieOuterStrokeColor: '#1c1c1c',
    },
  },
  dark: {
    ...common,
    themeVariables: {
      fontFamily: 'Archivo, sans-serif', fontSize: '16px', background: 'transparent',
      primaryColor: '#28493b', primaryTextColor: '#f4f1e8', primaryBorderColor: '#f4f1e8',
      secondaryColor: '#40386a', secondaryTextColor: '#f4f1e8', secondaryBorderColor: '#f4f1e8',
      tertiaryColor: '#2c4565', tertiaryTextColor: '#f4f1e8', tertiaryBorderColor: '#f4f1e8',
      lineColor: '#f4f1e8', textColor: '#f4f1e8', mainBkg: '#28493b', nodeBorder: '#f4f1e8',
      clusterBkg: '#2a2a2a', clusterBorder: '#f4f1e8', edgeLabelBackground: '#2a2a2a',
      noteBkgColor: '#262626', noteTextColor: '#f4f1e8', noteBorderColor: '#f4f1e8',
      actorBkg: '#28493b', actorBorder: '#f4f1e8', actorTextColor: '#f4f1e8', actorLineColor: '#f4f1e8',
      signalColor: '#f4f1e8', signalTextColor: '#f4f1e8', labelBoxBkgColor: '#40386a', labelBoxBorderColor: '#f4f1e8',
      labelTextColor: '#f4f1e8', loopTextColor: '#f4f1e8', activationBkgColor: '#40386a', activationBorderColor: '#f4f1e8',
      sequenceNumberColor: '#1c1c1c', pie1: '#6aad91', pie2: '#40386a', pie3: '#2c4565', pie4: '#5d3446', pie5: '#28493b',
      pieTitleTextColor: '#f4f1e8', pieSectionTextColor: '#f4f1e8', pieStrokeColor: '#f4f1e8', pieOuterStrokeColor: '#f4f1e8',
    },
  },
};

let renderer;
let fontsUrl;
const getRenderer = () => (renderer ??= createMermaidRenderer({ launchOptions: { executablePath, args: ['--no-sandbox'] } }));

const hash = (s) => createHash('sha1').update(s).digest('hex');

async function renderOne(source, variant, file) {
  const config = THEMES[variant];
  const key = hash(source + variant + JSON.stringify(config) + 'v2');
  const cached = path.join(CACHE_DIR, `${key}.json`);
  if (fs.existsSync(cached)) return JSON.parse(fs.readFileSync(cached, 'utf8'));
  fontsUrl ??= fontCss();
  const prefix = `m${hash(source).slice(0, 8)}${variant[0]}`;
  const [result] = await getRenderer()([source], { css: fontsUrl, mermaidConfig: config, prefix });
  if (result.status !== 'fulfilled') {
    const first = source.trim().split('\n')[0];
    throw new Error(`Mermaid could not render the diagram starting "${first}" in ${file ?? 'a post'}: ${String(result.reason?.message ?? result.reason).slice(0, 300)}`);
  }
  const { svg, title, description } = result.value;
  const out = { svg, title, description };
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cached, JSON.stringify(out));
  return out;
}

const textOf = (node) => (node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join(''));
const parseMeta = (meta = '') => ({
  caption: /caption="([^"]*)"/.exec(meta)?.[1],
  wide: /(^|\s)wide(\s|$)/.test(meta),
});
const svgNode = (svg) => fromHtmlIsomorphic(svg, { fragment: true }).children.find((n) => n.type === 'element');

export function rehypeImaxtDiagram() {
  return async (tree, file) => {
    const found = [];
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'pre' || !parent || index == null) return;
      const code = node.children.find((c) => c.type === 'element' && c.tagName === 'code');
      const cls = code?.properties?.className;
      if (!code || !Array.isArray(cls) || !cls.includes('language-mermaid')) return;
      found.push({ parent, index, node, source: textOf(code), meta: code.data?.meta });
    });
    if (!found.length) return;

    const rendered = await Promise.all(
      found.map(async (f) => {
        const [light, dark] = await Promise.all([renderOne(f.source, 'light', file.path), renderOne(f.source, 'dark', file.path)]);
        return { light, dark };
      }),
    );

    found.forEach((f, i) => {
      const { light, dark } = rendered[i];
      if (!light.title || !light.description) {
        throw new Error(
          `Diagram in ${file.path ?? 'a post'} needs an accessible title and description. Add "accTitle: ..." and "accDescr: ..." to the diagram.`,
        );
      }
      const { caption, wide } = parseMeta(f.meta);
      const body = (variant, data) => ({
        type: 'element',
        tagName: 'div',
        properties: { className: ['diagram-body'], 'data-variant': variant },
        children: [svgNode(data.svg)],
      });
      const children = [body('light', light), body('dark', dark)];
      if (caption) children.push({ type: 'element', tagName: 'figcaption', properties: { className: ['diagram-cap'] }, children: [{ type: 'text', value: caption }] });
      f.parent.children[f.index] = {
        type: 'element',
        tagName: 'figure',
        properties: { className: wide ? ['diagram', 'diagram-wide'] : ['diagram'] },
        children,
      };
    });
  };
}
