import Statement from './Statement.astro';
import Stat from './Stat.astro';
import StatRow from './StatRow.astro';
import PullQuote from './PullQuote.astro';
import Compare from './Compare.astro';
import Side from './Side.astro';
import Steps from './Steps.astro';
import Step from './Step.astro';
import Timeline from './Timeline.astro';
import Event from './Event.astro';
import Bars from './Bars.astro';
import Sidenote from './Sidenote.astro';
import CodeWalk from './CodeWalk.astro';
import Marquee from './Marquee.astro';

/** Passed to <Content components={imaxt} />, so .mdx posts can use every block without imports. */
export const imaxt = { Statement, Stat, StatRow, PullQuote, Compare, Side, Steps, Step, Timeline, Event, Bars, Sidenote, CodeWalk, Marquee };
export { default as ImaxtCover } from './ImaxtCover.astro';
