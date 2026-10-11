import { imaxt as imaxtBlocks } from '@inflate-ai/imaxt-astro';
import '@/styles/imaxt.css';
import SponsorSlot from '../sponsor/SponsorSlot.astro';

/** Passed to <Content components={imaxt} />, so .mdx posts can use every block without imports. */
export const imaxt = { ...imaxtBlocks, SponsorSlot };
export { default as ImaxtCover } from './ImaxtCover.astro';
