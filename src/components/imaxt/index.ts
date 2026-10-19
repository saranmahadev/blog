import '@/styles/imaxt.css';
import SponsorSlot from '../sponsor/SponsorSlot.astro';
import Beat from './Beat.astro';
import CodeWalk from './CodeWalk.astro';
import Compare from './Compare.astro';
import CurvedText from './CurvedText.astro';
import Event from './Event.astro';
import Marquee from './Marquee.astro';
import PullQuote from './PullQuote.astro';
import Scrolly from './Scrolly.astro';
import Side from './Side.astro';
import Sidenote from './Sidenote.astro';
import Stat from './Stat.astro';
import Statement from './Statement.astro';
import StatRow from './StatRow.astro';
import Step from './Step.astro';
import Steps from './Steps.astro';
import Timeline from './Timeline.astro';

/** Passed to <Content components={imaxt} />, so .mdx posts can use every block without imports. */
export const imaxt = { Beat, CodeWalk, Compare, CurvedText, Event, Marquee, PullQuote, Scrolly, Side, Sidenote, Stat, Statement, StatRow, Step, Steps, Timeline, SponsorSlot };
export { default as ImaxtCover } from './ImaxtCover.astro';
