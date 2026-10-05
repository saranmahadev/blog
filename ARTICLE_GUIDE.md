# Article guide

How every article on **Drafted, by Dev** is written and built: the voice, the story format, the site's visual language (Imaxt), and every rule the build enforces.

This guide is written for two readers: **Dev**, as a checklist before publishing, and **Claude**, so a drafting session with only this file can produce a post that sounds like Dev and builds on the first try.

## Contents

- [Instructions for Claude](#instructions-for-claude)
- **Part A. Voice** · [1. The voice](#1-the-voice) · [2. Story craft](#2-story-craft)
- **Part B. The format** · [3. Knowledge first](#3-knowledge-first) · [4. Honesty](#4-stories-and-explainers-honesty) · [5. Never overwhelm the reader](#5-never-overwhelm-the-reader)
- **Part C. Imaxt** · [6. Principles](#6-imaxt-principles) · [7. The blocks](#7-the-blocks) · [8. Tones](#8-tones) · [9. Covers](#9-covers) · [10. Diagrams](#10-diagrams) · [11. Code](#11-code) · [12. Patterns that work](#12-patterns-that-work)
- **Part D. Rules** · [13. Files and URLs](#13-files-and-urls) · [14. Front matter](#14-front-matter) · [15. Series](#15-series) · [16. MDX gotchas](#16-mdx-gotchas) · [17. Accessibility](#17-accessibility) · [18. Performance and security](#18-performance-and-security) · [19. Feeds and search](#19-feeds-and-search) · [20. Privacy and honesty](#20-privacy-and-honesty) · [21. Editorial](#21-editorial) · [22. Sponsors and banners](#22-sponsors-and-banners)
- **Part E. Templates** · [23. Skeletons](#23-skeletons) · [24. Worked example](#24-worked-example) · [25. Before you publish](#25-before-you-publish) · [26. When the build fails](#26-when-the-build-fails)

---

## Instructions for Claude

Read this whole file before drafting. Then:

1. **Ask first, draft second.** Before writing, get from Dev: the one idea of the article, who it is for, and (for a story) the real moments, in order. If a story has no real moments from Dev, stop and ask. Never fill the gap with invented memories.
2. **Teach first.** Every post must give a stranger something they can use or understand better (section 3). Never narrate how this site was built, how a decision was made, or what was said in a chat. Drafted may appear only as one short aside.
3. **Never invent facts.** Every factual claim must be true and checkable. In a story, never invent events, quotes or people. If a claim needs a source, say so in your reply to Dev and keep the post clean (MDX does not allow HTML comments, so leave no markers in the file).
4. **Protect people.** No real person's name, workplace or private detail unless Dev has said it is fine (section 20).
5. **Output a complete `.mdx` file** with valid front matter and only blocks documented in Part C. Use `draft: true`.
6. **Run the checks** (`pnpm check && pnpm build`, then `pnpm check:dist`) when you can, and report the result honestly. Walk through the checklist in section 25 and say which items you could not verify.
7. **Do not touch voice for effect.** If a sentence sounds like marketing, rewrite it plainly. When unsure, choose the plainer word.

---

# Part A. Voice

## 1. The voice

Everything below is taken from Dev's own writing, the essay *Symptoms That You Should Pursue Coding*. Each rule has a quoted line as evidence. If a rule and a quote ever disagree, the quote wins.

### The fingerprints

| Trait | What it looks like | Evidence |
| --- | --- | --- |
| **Opens inside a moment, not a thesis.** | A concrete time, place or belief, in plain words. | "There was a time when I was quite certain about what I was going to become." |
| **Looks back and reinterprets.** | "Looking back" turns an old event into a clue. | "Looking back, though, I realize I had a plan for my future without really knowing what I was naturally curious about." |
| **Admits what he did not know.** | Honest about the gap between then and now, no flexing. | "The funny thing is that I didn't know much." · "I didn't know it then, but that was probably the first real spark." |
| **A bridge sentence ends a section.** | A short line that tilts the reader into the next idea. | "That took a while to discover, and strangely enough, the first clue came from a classroom." |
| **The inner question, in italics.** | The thought as it happened, in quotation marks and italics. | *"Wait, so this is how programming works?"* |
| **Contrast that lands.** | Two clauses, one correction. | "It wasn't a question I needed answered; it was a question I **wanted** answered." |
| **Small, honest scenes.** | A specific, slightly funny detail beats a general claim. | "I danced. Literally. Then I went around showing people." |
| **Deflates his own drama.** | Undercuts the big claim with the true, small one. | "It was just a lab exercise. Nothing revolutionary had been built, nobody was going to use the program, and there was no startup waiting to acquire it. But I didn't care." |
| **One bold line per section.** | The takeaway, set in bold, short enough to quote. | "**Knowledge was turning into creation.**" · "**I was slowly becoming one.**" |
| **Turns to "you" at the end of a beat.** | A gentle instruction, never an order. | "If that moment gives you disproportionate happiness, pay attention." |
| **Plain words, short technical vocabulary.** | Technical terms appear when they carry meaning, defined by feeling first. | "a few tags, some text, a little structure, and suddenly I could create something that looked like a webpage." |
| **Indian-English texture, kept.** | A natural turn of phrase is a feature, not an error. | "There is a weightage to all of this." |
| **Rhythm: long, then short.** | A medium sentence builds, a short one lands. | "I wasn't consciously trying to become a software developer. **I was slowly becoming one.**" |
| **Closes on the series idea.** | The last lines name what the whole series is for. | "You become one when you start following your curiosity far enough that you eventually **build something with it**." |

### Section headings

Headings are second-person symptoms or plain statements, in Title Case, and each reads as a sentence the reader could say about themselves:

- "You Don't Just Use Technology. You Wonder About It."
- "You Start Building Before You Know Enough to Build"
- "You Celebrate When the Bug Finally Dies"
- "Technology Slowly Stops Feeling Like Work"

On this site headings double as the **Contents** list in the article's left rail, so each one must make sense on its own and be scannable. Use `##` for sections and `###` for sub-parts (section 17).

### Sentence rules

1. **First person, past tense for the story, present tense for the reflection.** "I found the bug" (then) · "That is the kind of curiosity that keeps pulling people deeper" (now).
2. **Medium sentences, with a short one every few lines.** Most sentences run 15 to 30 words. A sentence of 3 to 8 words lands the point. Never three short ones in a row.
3. **One idea per paragraph, 2 to 5 sentences.**
4. **Colons and semicolons are welcome, em dashes sparingly** (at most two in a section). Never use a dash where a full stop is cleaner.
5. **Rhetorical questions come in runs of two to four**, then an answer. ("How was the page created? How did one page connect to another? What happened when I clicked something?")
6. **Bold is for the single takeaway sentence of a section** and for the one word that carries a contrast (**wanted**). Never bold for emphasis in every paragraph. Italics are for the inner voice.
7. **Say the small true thing.** "I spent hours trying to make pages work together" beats "I was passionate about building."
8. **Contractions are natural** (didn't, wasn't, isn't), as in the essay.
9. **Numbers and units:** write what was measured and what it was measured against ("p95 query time, 5 ms"). If you do not know, say so.

### Technical posts: same voice, more precise

When a post explains a technical idea, keep the voice and add precision:

- Define a term **the first time it appears**, in the same sentence, in plain words. ("Idempotent means doing it twice has the same effect as doing it once.")
- Prefer **one specific claim** over three vague ones. ("Each stage retries on its own" beats "the system is highly resilient.")
- Verify every code sample and number before it goes in, and show only output that really came from running it. Do not describe the machine, tool versions or test setup, and do not narrate how the code was run ("I ran this on…"). Where a result varies per run or per version, say so in one plain sentence.
- Say "I don't know" or "I'm not sure" when true. Never fill a gap with confidence.
- Use the analogy **before** the term (the substitute teacher's doors came before the word *inheritance* meant anything), then give the real term.

### Words and phrases to avoid

Marketing and filler: *game-changer, unlock, supercharge, leverage (as a verb), dive deep / deep dive (in a heading), in today's fast-paced world, it goes without saying, ultimate guide, 10x, seamless, robust (unless you mean it), cutting-edge, world-class, simply (before something hard), just (before something hard), obviously, trivial.* Also avoid stock openings such as "In this article we will…" and stock closings such as "I hope you enjoyed…". Use the story to open and the series idea to close.

### Before and after

| Instead of | Write |
| --- | --- |
| "Programming sparked my passion in school." | "Then one day, a substitute teacher came into our class and started explaining **inheritance**." |
| "Debugging is very rewarding." | "I found the bug, fixed it, ran the program again, and it worked. I danced. Literally." |
| "Curiosity is the key trait of great developers." | "Nobody asked you to know this. It isn't on an exam or part of your assignment. You just want to know." |
| "Let's dive deep into reverse proxies!" | "A reverse proxy is the machine your request actually reaches first. Let me show you what it does with it." |
| "Our robust pipeline guarantees reliability." | "If a job dies halfway, it restarts from the last checkpoint instead of from the beginning." |

---

## 2. Story craft

A story here means a **scene with a feeling**, not a plot with a villain.

1. **Cold open.** Start in a moment ("There was a time…", "One day, a substitute teacher came in…", "It was 2 a.m. and the server was still down"). No definitions, no thesis.
2. **Scene before explanation.** Let the reader see a door, a screen, a classroom, before anything is explained. The idea arrives because the scene asked for it.
3. **Stakes stay small and true.** A lab exercise, a broken page, a confusing meeting. The pull of the piece comes from honesty, not drama.
4. **One question per beat.** Every beat should leave the reader with one question (*"Wait, so this is how programming works?"*). The fact moment answers that question and no other.
5. **Dialogue is rare and short.** Use it only to carry a feeling, in quotation marks. In a story, never write dialogue you cannot stand behind; paraphrase instead ("he said something like…").
6. **Time may be compressed, only if you say so.** "Over the next few weeks" is fine. Merging three real events into one scene is not, unless the article says it did.
7. **Endings turn to the reader.** The last beat names a pattern, then points at "you" ("If that moment gives you disproportionate happiness, pay attention").
8. **Length of a beat:** as long as the scene needs. Follow it with at most one fact moment and one visual (section 5). A beat that keeps adding scenes without a new idea should be cut or split, never padded.

---

# Part B. The format

## 3. Knowledge first

A post on Drafted earns its place by what the reader **takes away**. Ask of every post: *would a stranger learn something they can use, or understand something better, that they could not get from a headline?* If the honest answer is "it records what we did", it is not ready.

### The rule

- **Teach the general idea first.** A post about caching teaches caching, not how this site chose its cache settings.
- **Never narrate the process.** No "we decided", no chat history, no build diary, no tour of the site's features as if they were the point.
- **Drafted may appear as one short aside**, in a `Sidenote` or a single sentence ("On this page, …"), only when it helps the reader check the idea for themselves.
- **Give the reader something to do.** A "Try it" experiment, a checklist, a rule of thumb, a number they can test.
- **Say when the idea does not apply.** Every technique has a limit; naming it is what separates knowledge from enthusiasm.

### Two kinds of posts

| | **Explainer** | **Story** |
| --- | --- | --- |
| **Purpose** | Teach how something works and when to use it | Show how curiosity or experience led somewhere |
| **Voice** | Dev's voice, explanatory, present tense | First person, past tense for events, present for reflection |
| **Facts** | Standard knowledge or checkable on the page | True and checkable; the events really happened |
| **Structure** | Hook, numbered stops or sections, one block each, "Try it", a short checklist | Cold open, beats, a fact moment only where the story asks a question, the turn to "you", the close |
| **Invented content** | Only an imagined world introduced as such (section 4, rule 7) | Never, except an imagined world introduced as such |

There are **no labels** such as "true story" or "note". The honesty rules (section 20) apply to everything, so labels are not needed.

### Anatomy of an explainer

1. **Hook** (short, usually under 150 words): a moment the reader recognises ("You tapped a link.").
2. **A map** (optional): a `Scrolly` or `Steps` showing the stops.
3. **Stops or sections**, each with: what happens, one block that shows it, one "Try it" `Sidenote`, one idea to remember.
4. **A checklist** the reader can apply ("If you build your own").
5. **One bold takeaway** at the end.

### Anatomy of a story

1. **Cold open** (a moment, kept short), then the question the story is really about.
2. **As many beats as the idea needs**, each a `##` section with a new idea: story, then at most one fact moment (one to three sentences and one block) **only if the story raised a question the fact answers**, then a reflection line.
3. **The turn** ("So, should you…?") that speaks to "you", and **the close** that names the series idea.
4. **Never two fact moments back to back**; at most three per article; facts first in the story's own words, block second.
5. **Cut repetition.** Each section must add a new idea. If a paragraph restates the previous one in different words, delete it. Say a thing once, in the best words.

## 4. Stories and explainers: honesty

1. No invented statistics. If a number is a placeholder, label it **Mock data** (`<Sidenote label="Mock data">…</Sidenote>`).
2. No real person's name, employer or private detail without Dev's explicit say-so. Prefer "a teacher", "a colleague".
3. Quotes: a quotation mark means something was actually said, or the sentence is marked as paraphrase.
4. Do not claim a result you did not see. "I think", "as far as I could tell" and "I did not test this" are fine sentences.
5. A personal story is real, told well. Do not compose scenes that never happened as if they happened to Dev, and do not disguise a real person. The one exception is an imagined world (rule 7).
6. Plans and ideas that are not built yet are described as ideas, in plain words ("This is a map of what I am building, and much of it is still an idea.").
7. **An imagined world is allowed** when the post reveals it as imagined, in warm plain words, near the end and not in the opening, the title or the description (for example, "Devato was never real. It is a food ordering app that exists in my imagination, and by now, in yours"). Until the reveal, it is told as a plain scene with no hedging, and it never claims to have happened to a real person. It is never presented as something that happened, never evidence for a claim, and never uses a real person or company. Write it in second person ("you") or with a clearly fictional character. Every technical idea inside it must be true and checkable: the world is imagined, the reasons are real.

## 5. Never overwhelm the reader

Detail is spice. Give the reader one idea at a time.

| Limit | Value |
| --- | --- |
| Fact moments per story beat | **1 at most** |
| Fact moments per story | **3 at most** |
| Blocks per explainer stop | **1 at most**, plus a "Try it" aside |
| Sentences before the block | **1 to 3** |
| New technical terms per beat | **2 at most**, each defined where it first appears |
| Blocks on screen at once | **1 loud block** (Statement, Stat, PullQuote, Scrolly, Marquee, CurvedText) |
| `wide` or `bleed` blocks per article | **1 at most** |
| Nodes in one diagram | **8 at most** |
| Code in a `CodeWalk` | **12 lines at most** |

**Where does the deeper detail go?** If a fact deserves more depth than the beat can hold, put it in a `Sidenote` (short, skippable) or save it for a later post in the series. Never grow the beat.

**Length is not a target.** There is no minimum or maximum word count. A post is as long as the value it gives: write until the reader has what they came for, then stop. The only test is whether every section earns its place by adding something the reader did not already have. Reading time is computed from the word count (about 220 words a minute) and shown to readers, so a long post is honest about its length. For a long post, make it easy to move through: clear headings that work as the Contents list, one idea per section, a recap line near the top if it belongs to a series, and a takeaway the reader can reuse. If a post grows past what one reading can hold, split it into a series rather than thinning every part.

---

# Part C. Imaxt

Imaxt is the site's visual language: **typography and layout instead of images**. Posts use no photographs or illustrations. A figure is built from type, colour, structure and a diagram. Every block lives in `src/components/imaxt/`, is available in any `.mdx` post **without an import**, and is shown live, with its source, on the hidden page `/imaxt/` (the Lab). When in doubt, copy from the Lab.

## 6. Imaxt principles

1. **A block has a job.** If you cannot say in a sentence what the block does for the reader, delete it.
2. **One idea per block.** A block repeats and shows an idea already said in prose. It does not add a second idea.
3. **Restraint.** One loud block per screen. At most one `wide` or `bleed` block per article. No two interactive blocks in a row.
4. **Words first.** Every block follows at least one sentence of prose that introduces it. Never place two blocks next to each other.
5. **No images.** Posts do not use photographs, screenshots, GIFs, logos or illustrations (section 18). Use type, structure and diagrams.
6. **Meaning never lives in colour alone.** Every block prints its numbers and labels as text.
7. **Motion is optional.** Count-ups, marquees and spinning stamps stop for readers who prefer reduced motion, and the final value is always in the HTML. Do not depend on motion to convey anything.
8. **Essays stay quiet.** In a personal story use prose, `Statement`, `PullQuote`, `Sidenote`, and at most a `Timeline` or one diagram. Save `Scrolly`, `Marquee`, `CurvedText` and `Heatmap` for technical posts or one deliberate flourish.

## 7. The blocks

All 19 blocks. Each card gives the job, the props, a copy-ready snippet, when to use it, when not to, and how it behaves for accessibility and in feeds.

**How to write them in MDX.**
- Short text goes inline inside the tag on one line. Markdown inside works (`**bold**`, `*italic*`).
- If a block holds paragraphs, lists or code, leave a blank line between the tag and the content.
- Array and object props use curly braces: `items={[ … ]}`. Strings use quotes.
- Tone names are listed in section 8.
- `wide` and `bleed` are boolean flags (write the bare word).

### Statement
**Job:** one sentence set large, the thought the reader should carry. Use it for the hook, a turning point, or a bold takeaway.

| Prop | Values | Default |
| --- | --- | --- |
| `tone` | `mint` `lilac` `sky` `rose` `accent` `ink` | none (plain) |
| `align` | `left` `center` | `left` |
| `wide` | flag | off |
| `bleed` | flag (full-width) | off |

```mdx
<Statement>One font file can be **many typefaces**. The trick is the *axes*.</Statement>

<Statement tone="mint" align="center">Boring is *dependable*.</Statement>
```

- **Use when:** the sentence is the point of the section; at the open of a technical post; at the turn of an essay.
- **Do not use when:** the sentence is routine, or when it would be the second loud block on screen. Max one per screen, two or three per article.
- **A11y / feeds:** plain text, full contrast in all tones. Kept as text in feeds.
- **Role:** the *reflection line* or the *hook*. Never a fact moment by itself.

### Stat and StatRow
**Job:** a number that matters, with its label. `StatRow` lines up two to four stats.

| `Stat` prop | Values |
| --- | --- |
| `value` | string or number (a numeric value counts up once on scroll) |
| `unit` | e.g. `ms`, `%`, `×` |
| `label` | what the number measures (required) |
| `note` | a short qualifier (optional) |
| `tone` | any tone |

```mdx
<StatRow>
  <Stat value="5" unit="ms" label="p95 query time" tone="mint" />
  <Stat value="10×" label="fewer calls" tone="sky" />
  <Stat value="0" label="images in this post" />
</StatRow>
```

- **Use when:** a real, sourced number is the fact. A single `Stat` can sit alone.
- **Do not use when:** the number is invented (label it **Mock data**), or has no unit or label.
- **A11y / feeds:** the final value is in the HTML; the count-up is skipped for reduced motion. Feeds keep the text.
- **Role:** a fact moment ("how big, how fast, how many").

### PullQuote
**Job:** a sentence lifted out in large italic type, optionally attributed.

| Prop | Values |
| --- | --- |
| `by` | attribution text, shown with a dash (optional) |
| `wide` | flag |

```mdx
<PullQuote by="Design rule">The best API is the one you can describe in a single paragraph.</PullQuote>
```

- **Use when:** a line from the story deserves a second look, or a real quotation (with attribution).
- **Do not use when:** it would repeat the previous sentence word for word, or the quote is not real (never put invented words in someone's mouth).
- **A11y / feeds:** a real `blockquote` in a `figure`. Kept in feeds.
- **Role:** reflection line or the inner voice.

### Compare and Side
**Job:** two sides of an idea, before and after, old and new. `Side kind="before"` is the plain side, `kind="after"` is the highlighted side.

| `Side` prop | Values | Default |
| --- | --- | --- |
| `kind` | `before` `after` | `after` |
| `label` | short heading | none |
| `tone` | any tone | accent for `after` |

```mdx
<Compare>
  <Side kind="before" label="Before">Three pipelines, three sets of bugs</Side>
  <Side label="After">One small API, one set of bugs</Side>
</Compare>
```

- **Use when:** the fact is a **contrast** (copy the same code everywhere vs inherit it once).
- **Do not use when:** there is no real contrast, or when you would need more than two sides (use `Steps` or a diagram).
- **A11y / feeds:** a labelled group; keep each side to a line or two. Kept as text in feeds.
- **Role:** the most reliable fact moment: a scene shows a problem, `Compare` shows the fix.

### Steps and Step
**Job:** an ordered sequence, numbered automatically.

| `Step` prop | Values |
| --- | --- |
| `title` | short step name (required) |

```mdx
<Steps>
  <Step title="Chunk">Split each document into pieces.</Step>
  <Step title="Embed">Turn every chunk into a vector.</Step>
  <Step title="Write">Store it under a stable id.</Step>
</Steps>
```

- **Use when:** the order matters (3 to 6 steps).
- **Do not use when:** the steps are not really a sequence (use `Compare` or prose), or there are more than six (split the idea).
- **A11y / feeds:** a real ordered list. Kept in feeds.
- **Role:** a fact moment ("what happens when you click a link").

### Timeline and Event
**Job:** things in time order, each with a date or label. Good for a journey.

| `Event` prop | Values |
| --- | --- |
| `date` | the label shown (a real date, `Step 1`, `Year 2`) |
| `title` | the headline of the event |

```mdx
<Timeline>
  <Event date="Class 9" title="A substitute teacher">Inheritance finally made sense.</Event>
  <Event date="A few months later" title="Localhost">My first page appeared on my own screen.</Event>
  <Event date="Later" title="Lab exercise">I fixed a bug and danced.</Event>
</Timeline>
```

- **Use when:** the order and the passing of time are the point (a personal journey, a protocol round-trip).
- **Do not use when:** the items are parallel (use `Compare`), or the dates would be invented.
- **A11y / feeds:** a real ordered list. Kept in feeds.
- **Role:** a recap of a journey, or a fact moment for time-based facts.

### Bars
**Job:** compare a few measured values as horizontal bars, with printed numbers.

| Prop | Values | Default |
| --- | --- | --- |
| `items` | `[{ label, value }]` | required |
| `max` | the value that fills the bar | the largest value |
| `unit` | e.g. `%`, `ms` | none |
| `tone` | any tone | accent |

```mdx
<Bars unit="%" max={100} tone="accent" items={[
  { label: "Model A", value: 72 },
  { label: "Model B", value: 81 },
  { label: "Model C", value: 64 },
]} />
```

- **Use when:** three to six comparable measurements.
- **Do not use when:** the data is invented (label **Mock data**), the values are not comparable, or there is only one value (use `Stat`).
- **A11y / feeds:** the value is printed beside each bar; bars are decorative. Kept as a list in feeds.
- **Role:** a fact moment for "which is bigger".

### Heatmap
**Job:** a small grid where cell shade shows the value; every cell also prints its number.

| Prop | Values |
| --- | --- |
| `rows`, `cols` | arrays of labels |
| `data` | `number[][]`, rows by columns |
| `caption` | required, describes the table |
| `unit` | optional |
| `min`, `max` | values mapped to the lightest and darkest shade |
| `wide` | flag |

```mdx
<Heatmap
  caption="Common modes, one digit per audience"
  rows={["600", "640", "644", "755"]}
  cols={["Owner", "Group", "Others"]}
  data={[[6, 0, 0], [6, 4, 0], [6, 4, 4], [7, 5, 5]]}
  min={0}
  max={7}
/>
```

- **Use when:** the fact is a pattern across two dimensions.
- **Do not use when:** the grid is bigger than about 6 × 6, or one dimension is meaningless.
- **A11y / feeds:** a real table with a caption and printed numbers; shading is capped to keep text contrast. Kept as a table in feeds.
- **Role:** a fact moment in a technical story.

### Sidenote
**Job:** a short aside, set apart with an accent bar and a small label. Use it for a definition, a "Try it" experiment, a caveat, a **Mock data** warning, or a one-line "On this page" note about how Drafted does something.

| Prop | Values | Default |
| --- | --- | --- |
| `label` | short label | `Note` |

```mdx
<Sidenote label="Note">Idempotent means doing it twice has the same effect as doing it once.</Sidenote>
```

Common labels: `Try it`, `Definition`, `Mock data`, `On this page`, `Going deeper`.

- **Use when:** a definition, a caveat, or the depth you want to keep out of the main flow. Keep to one to three sentences.
- **Do not use when:** the aside is essential (put it in the prose), or you would stack two in a row.
- **A11y / feeds:** an `aside`; text. Kept in feeds.
- **Role:** a skippable fact or an experiment, never the main point.

### CodeWalk
**Job:** a code block with a step-by-step walkthrough; clicking a step highlights the lines it talks about.

| Prop | Values |
| --- | --- |
| `steps` | `[{ lines, title, text? }]` where `lines` is `"1"` or `"2-4"` (1-based) |
| `wide` | flag |

````mdx
<CodeWalk steps={[
  { lines: "1", title: "Stable id", text: "Same chunk, same id." },
  { lines: "2-3", title: "Upsert", text: "Replaces instead of duplicating." },
]}>

```ts
const id = `${doc.id}:${chunk.index}`;
await index.upsert({ id, vector });
await checkpoint.save(id);
```

</CodeWalk>
````

- **Use when:** each line group has a reason worth explaining. Keep the code to 12 lines or fewer, with a blank line before and after the fence.
- **Do not use when:** the code is boilerplate, or the story has not yet explained why it matters.
- **A11y / feeds:** without JavaScript every line stays fully visible; steps are buttons. In feeds the code and the step text remain as text.
- **Role:** a fact moment ("the exact lines that do the work").

### Marquee
**Job:** a band of large words sliding across, for rhythm between sections.

| Prop | Values | Default |
| --- | --- | --- |
| `words` | `string[]` | required |
| `tone` | any tone | accent |
| `bleed` | flag | off |
| `seconds` | loop duration | 34 |

```mdx
<Marquee words={["Embed", "Filter", "Rank", "Repeat"]} tone="accent" />
```

- **Use when:** once, as a punctuation mark between parts of a technical post.
- **Do not use when:** in a personal essay, or when the words carry information (the words are read as one comma-separated label).
- **A11y / feeds:** exposed as a single image with the words as its label; stops under reduced motion. Left out of feeds (its words are decoration).
- **Role:** none. It is rhythm only.

### CurvedText
**Job:** type bent along an arc, wave or circle, for a stamp or a flourish.

| Prop | Values | Default |
| --- | --- | --- |
| `text` | the words | required |
| `shape` | `arc` `wave` `circle` | `arc` |
| `mark` | one glyph in the middle of a circle | none |
| `tone` | any tone | none |
| `spin` | flag (rotate a circle) | off |
| `decorative` | flag (hide from screen readers) | off |

```mdx
<CurvedText text="Drag the sliders" shape="arc" />

<CurvedText text="Drafted" shape="circle" mark="D" tone="mint" spin decorative />
```

- **Use when:** as a closing stamp or a one-off flourish. Add `decorative` when the text repeats nearby content.
- **Do not use when:** the words matter and are not repeated (curved text is slower to read), or more than once per article.
- **A11y / feeds:** an SVG with an accessible name; not carried into feeds.
- **Role:** none. A signature.

### Scrolly and Beat
**Job:** an animated, pinned statement beside the prose that swaps as each beat scrolls into view. On narrow screens, and without JavaScript, every beat shows its own heading inline.

| Prop | Values | Default |
| --- | --- | --- |
| `Scrolly` `tone` | any tone | `sky` |
| `Beat` `stage` | the big word shown pinned (required) | |
| `Beat` `sub` | small label such as `step 1` | none |

```mdx
<Scrolly tone="sky">
  <Beat stage="Chunk" sub="step 1">Split each document into pieces that make sense on their own.</Beat>
  <Beat stage="Embed" sub="step 2">Turn every chunk into a vector. Batch the calls and retry the failures.</Beat>
  <Beat stage="Write" sub="step 3">Store the vector and its metadata under a stable id.</Beat>
</Scrolly>
```

- **Use when:** a technical process with three to five stages deserves a moment.
- **Do not use when:** in an essay, with fewer than three beats, or with long beat text (keep each beat to one or two sentences).
- **A11y / feeds:** the pinned stage is hidden from screen readers (the inline heading carries the meaning). Feeds keep each beat's text.
- **Role:** a fact moment for a process, in technical posts only.

### TypeLab
**Job:** an interactive font playground (a small React island that loads only when scrolled into view).

| Prop | Values |
| --- | --- |
| `sample` | the sample sentence |
| `family` | `archivo` `fraunces` `source-serif` |

```mdx
<TypeLab sample="Same letters, different voice" />
```

- **Use when:** the post is about typography. It is a demonstration, not decoration.
- **Do not use when:** the post is not about type; or more than once.
- **A11y / feeds:** controls are real buttons and labelled inputs. In feeds it is replaced by a "read it on the site" link.
- **Role:** a fact moment you can play with.

## 8. Tones

Tones are six colour moods: `mint`, `lilac`, `sky`, `rose`, `accent` (the emerald brand colour), `ink` (near-black).

- **Pair a post with its series.** A series has a tone (set in its `index.md`). Use the same tone family for blocks inside that series so the series feels like one object. Stand-alone posts use `accent` or no tone.
- **Use tone to group, not to decorate.** Two related blocks share a tone; unrelated ones do not.
- **Every tone passes contrast in light and dark.** Do not override colours. If a combination looks off, change the tone, not the CSS.
- **Never rely on colour alone.** Every block prints its label and number.

## 9. Covers

Every post has a **typographic cover**, built from type in the post's series colour. It appears in the article hero and as the share image.

```yaml
cover:
  kind: word        # word | stat | quote | stack
  text: "Restart"   # at most 70 characters
  sub: "safely, every time"  # optional, at most 40 characters
```

| `kind` | Looks like | Best for |
| --- | --- | --- |
| `word` | One giant word | A single concept ("Restart", "Curious") |
| `stat` | One giant number | A post about a measured fact ("640") |
| `quote` | A quoted line | A personal story whose line is the point |
| `stack` | The title stacked in big lines (the default if `cover` is omitted) | Anything else |

Choose by the story: a **personal story** usually takes a `quote` cover (its best line) or a `word`; a **technical story** takes `stat`, `word` or `stack`. Keep `text` short enough to read at a glance. Do not use image covers: they are possible in the schema but not used on this site.

## 10. Diagrams

Write a diagram as a `mermaid` fenced code block in any `.md` or `.mdx` post. It is drawn to SVG **at build time** (no client JavaScript), skinned to the Imaxt look, and rendered once per theme so it is correct in light and dark.

````mdx
```mermaid caption="A forward proxy sits between clients and the internet"
flowchart LR
  accTitle: Forward proxy
  accDescr: A client sends a request to the forward proxy, which forwards it to a server on the internet. The response returns to the proxy and then to the client.
  C[Client] --> P[Forward proxy]
  P --> S[Server]
  S --> P
  P --> C
```
````

**Rules (the build fails without the first):**
1. Every diagram needs `accTitle:` and `accDescr:` lines. They become the accessible name and description. Write the description as a sentence that explains what happens, not "a diagram of…".
2. Add `caption="…"` after the language for a visible caption. Add `wide` to make it wider.
3. At most **eight nodes**. If you need more, split the idea or use `Steps`.
4. Use diagrams for **how something works** (flow, sequence, state, structure), not for numbers (use `Bars`) or time (use `Timeline`).
5. Types that work well: `flowchart LR/TD`, `sequenceDiagram`, `stateDiagram-v2`.
6. In feeds, a diagram becomes its caption and description. Make sure they are meaningful on their own.

## 11. Code

- Use fenced code with a language (`ts`, `sh`, `python`). Code is highlighted at build time with a dark theme.
- Keep examples short and runnable. Show the one thing the post is about.
- Use `CodeWalk` when each line group needs explaining; use a plain fence for anything else.
- **Never include real secrets**: API keys, passwords, tokens, private URLs, real emails. Use `YOUR_KEY` and `example.com`.
- Shell prompts: do not include `$` so the code can be copied.

## 12. Patterns that work

| Pattern | Use it for | Sequence |
| --- | --- | --- |
| **Scene → Compare** | A concept with a before and after | The scene shows the pain; one sentence names the idea; `Compare`. |
| **Scene → Steps** | "What actually happens when…" | The scene asks the question; one sentence; `Steps` (3 to 6). |
| **Scene → diagram** | How a system moves | The scene asks how; the diagram answers with a caption. |
| **Numbers → StatRow** | A result worth believing | One sentence of context; two to three real stats. |
| **Journey → Timeline** | A personal arc or a protocol | Prose summary; `Timeline` as a recap. |
| **Aha → Statement** | A turning point | A paragraph of build-up; the one-sentence realisation set large. |
| **Code reveal → CodeWalk** | The exact lines that matter | The story explains why; `CodeWalk` shows where. |
| **Closing stamp** | The end of a series post | A `CurvedText` circle with the series mark, `decorative`. |

---

# Part D. Rules

## 13. Files and URLs

| Kind | File | URL |
| --- | --- | --- |
| Stand-alone post | `src/content/posts/<slug>.md` or `.mdx` | `/<slug>/` |
| Series | `src/content/series/<series>/index.md` | `/<series>/` |
| Series post | `src/content/series/<series>/<post>.md` or `.mdx` | `/<series>/<post>/` |

- **Slugs** are the file name: lowercase letters, digits and hyphens only (`^[a-z0-9-]+$`), up to 120 characters. Make them short and descriptive (`hnsw-in-fifteen-minutes`). Private comments only work for slugs of this shape, so the rule is real, not a style preference.
- A top-level slug is **a post or a series, never both**. The build fails on a collision.
- **Reserved slugs** cannot be used: `about`, `imaxt`, `projects`, `blog`, `series`, `tags`, `search`, `login`, `register`, `reset`, `profile`, `inbox`, `admin`, `security`, `privacy`, `api`, `archive`, `topics`, `rss`, `rss.xml`, `atom.xml`, `feed.json`, `feed.xsl`, `sitemap`, `404`, `_astro`, `images`, `fonts`, `icons`, `favicon.svg`, `robots.txt`.
- Use `.mdx` when a post uses any Imaxt block; use `.md` for plain prose and code.
- A series post whose series `index.md` is missing or a draft is **not published**.
- Live examples to read before drafting: *Symptoms That You Should Pursue Coding* (a story) and the *Dev Universe* map (an idea, described as one).

## 14. Front matter

Validated at build time (`src/content.config.ts`). A wrong field fails the build with the file and the field named.

```yaml
---
title: "Symptoms That You Should Pursue Coding"
description: "A substitute teacher, a first webpage and a bug I celebrated: how curiosity quietly pointed me at code."
date: 2026-10-04
updated: 2026-10-10        # optional; shown to search engines as the last-modified date
author: Dev                # optional, defaults to Dev
tags: [Curious to Coder, Technology]
draft: true                # true hides it from production; flip to false to publish
featured: false            # the newest featured post becomes the Home lead story
cover:
  kind: quote
  text: "Curious enough to keep reading"
  sub: "Curious to Coder"
order: 1                   # series posts only: position in the series
---
```

| Field | Required | Rule |
| --- | --- | --- |
| `title` | yes | A sentence a reader would click, up to about 70 characters. Concrete, not clickbait. |
| `description` | yes | **200 characters or fewer.** It is the subtitle, the search snippet, the share text and the feed summary. Write it like a good first sentence, not a summary. |
| `date` | yes | `YYYY-MM-DD`. Posts are sorted newest first. |
| `updated` | no | Set when you change a published post materially, and say so at the end of the post. |
| `author` | no | Defaults to `Dev`. |
| `tags` | no | A list. Title Case, reuse existing tags (check `/topics/`), two to four per post. |
| `draft` | no | Keep `true` until the checklist in section 25 is done. |
| `featured` | no | Only for the post you want as the Home lead. |
| `cover` | no | See section 9. |
| `canonical` | no | A URL, only if the post was first published elsewhere. |
| `order` | series posts | A whole number from 1. Posts sort by `order`, then `date`. |

## 15. Series

A series is an ordered set of posts with its own landing page and reading progress.

`src/content/series/<series>/index.md`:

```yaml
---
title: "Curious to Coder"
description: "Finding the curiosity that already exists in you, and following it far enough to build something."
tone: "lilac"        # mint | lilac | sky | rose (omit to derive one from the slug)
pattern: "rings"     # dots | rings | grid | stripes | check (omit to derive one)
draft: false
---
```

- **The opener's job:** make the promise and name the series idea. It is usually a story that proves the idea. (In *Curious to Coder*, *Symptoms That You Should Pursue Coding* ends "Welcome to **Curious to Coder**" and names the series idea.)
- **Each middle post:** one story, one idea. Do not rely on readers having read the previous post; add a one-sentence recap.
- **The finale's job:** close the loop. Return to the opener's image or question, and say what the reader can now do.
- **Order** with `order: 1, 2, 3…`. The site adds *Previous* and *Up next* cards and a progress bar; do not write your own link list.
- **A series post must not repeat the series title in its own title.** The series name is shown above it.
- A series' tone gives its posts and covers a shared colour; use the same tone in blocks (section 8).

## 16. MDX gotchas

MDX is Markdown with components, and it is stricter than Markdown.

| You write | What breaks | Do this instead |
| --- | --- | --- |
| `{` or `}` in plain prose | Read as a JavaScript expression | Escape: `\{` and `\}`, or put it in `` `code` `` |
| `<` in plain prose (`a < b`) | Read as the start of a tag | Write `&lt;`, or put it in `` `code` `` |
| `<!-- comment -->` | MDX does not support HTML comments | Use `{/* comment */}`, or leave it out |
| Markdown inside a block that has no blank lines | Not parsed as Markdown | Put a blank line after the opening tag and before the closing tag |
| A block opened and not closed | Build error | Match every `<Tag>` with `</Tag>` (or self-close `<Tag />`) |
| A prop with a JS value in quotes (`max="100"`) | It becomes a string | Use braces for numbers and arrays (`max={100}`) |
| Importing a component | Not needed | Imaxt blocks are already available |
| A line starting with a number and a dot, or `*`, in the middle of prose | Becomes a list | Reword, or escape the first character |
| An `#` heading in the body | A second page title, wrecks the heading order | Use `##` and `###` only |

## 17. Accessibility

CI scans every key page with axe (WCAG 2.1 A and AA) in light and dark, and fails on serious or critical issues.

1. **Headings.** The post title is the page's only `h1`. Use `##` for sections, `###` for sub-parts, and never skip a level. Sections show in the **Contents** rail, so write them to make sense alone.
2. **Diagrams** need `accTitle` and `accDescr` (section 10).
3. **Links** have meaningful text ("the Firebase docs", not "click here"). Internal links are relative (`/dev-universe/a-connected-ecosystem/`).
4. **Colour** is never the only carrier of meaning. Tones are tested for contrast; do not hard-code colours.
5. **Motion** respects reduced-motion settings. Do not describe a block only by its animation.
6. **Tables** (and `Heatmap`) have a caption.
7. **Language.** Plain words and short sentences are an accessibility feature too.

## 18. Performance and security

The site sends a strict **Content-Security-Policy**, and CI loads pages in a real browser and fails on any violation.

**Never put these in a post:**
- Images of any kind, including remote images and screenshots (the policy allows only the site's own assets, and the site is designed without images).
- `<iframe>`, YouTube or other embeds, social widgets, tracking pixels, analytics snippets. Link out instead: `[Watch the talk](https://…)`.
- `<script>`, inline `style` blocks, or event attributes (`onclick`). Only the site's own islands run (for example `TypeLab`).
- External fonts or stylesheets.

**Budgets enforced in CI (Lighthouse):** performance 90, accessibility 95, SEO 95 on Home and the heaviest posts. A post with many blocks is fine; a post that pulls anything from another site is not.

## 19. Feeds and search

Posts appear in RSS, Atom and JSON Feed with their **full text**, cleaned for readers.

- Text, lists, tables, `Statement`, `Stat`, `Compare`, `Steps`, `Timeline`, `Bars`, `Heatmap`, `Sidenote`, code and `CodeWalk` code are kept.
- **Diagrams** become their caption plus description, so write both well.
- **Tables** need raw HTML in MDX so they can carry a `<caption>`: wrap `<table>` in `<div class="table-wrap">`. Do not write the text `javascript:` (for example a label such as "JavaScript:") anywhere in a post: the feed check treats it as an unsafe link and fails the build. Write "JavaScript prints:" instead.
- **Interactive blocks** (`TypeLab`, `Scrolly`) lose their interactivity; the post then ends with "This post has interactive parts that need the site" and a link.
- `description` is used as the feed summary, the meta description and the share text.
- The **share image** (1200 × 630) is rendered from the cover at build time.
- Posts get `Article` and `BreadcrumbList` structured data, a sitemap entry (with `updated` as last-modified) and a search entry. Add `data-pagefind-ignore` only to something you want out of search.
- Feeds exist for all posts, each series (`/<series>/rss.xml`) and each topic (`/topics/<tag>/rss.xml`). A post appears in a topic feed through its tags, which is why tags matter.

## 20. Privacy and honesty

1. **Comments are private conversations** between one reader and Dev. Never quote, screenshot or paraphrase a reader's message in a post without their clear permission, and never identify them.
2. **Other people.** No real name, employer, school, city or distinguishing detail of someone else without their permission. Prefer "a teacher", "a friend", "a colleague".
3. **No secrets.** Never include keys, tokens, passwords, internal URLs, or anyone's email address.
4. **Sources.** A number or claim that is not from Dev's own work needs a link or a plain "I read this in…". Never invent a source.
5. **Mock data** is labelled **Mock data**, always.
6. **Corrections.** If a published fact was wrong, fix it, set `updated`, and add a final line ("Updated 10 Oct: I had the port wrong in the example"). Do not silently rewrite.
7. **Drafting help.** Whether to mention that an article was drafted with AI help is Dev's decision. The default is no disclosure line; if Dev wants one, add it as a `Sidenote label="Note"` at the end.

## 21. Editorial

- **One idea per article.** If the title needs "and", it is two articles.
- **Titles:** concrete, up to about 70 characters, no clickbait, no colon-subtitles unless they help. Sentence case or Title Case, but consistent.
- **Descriptions:** 200 characters or fewer; name the scene or the question, not the topic.
- **The first screen decides.** The opening scene and the first heading are what the reader sees first. Make them the best lines.
- **Links:** internal links relative and descriptive; external links only where they add something, with the link text saying where it goes.
- **Dates and updates:** `date` is the publication date; `updated` changes only for material edits.
- **Length** (section 5): no fixed length. Value decides, and every section must earn its place.
- **Read it aloud.** If a sentence is hard to say, it is hard to read.

---

## 22. Sponsors and banners

Banners are **automatic and data-driven**. Authors never write them and never need to think about them, except to keep them out of the wrong places.

- **Placement:** an *inline* banner (720 x 90) after the introduction and before the first `##` heading of an `.mdx` post; an *end* banner (720 x 200) after the last paragraph, before the series cards and the message box; a *rail* banner (300 x 250) in the right column on wide screens. One banner per slot per page. Plain `.md` posts get the end and rail banners only.
- **Write so the first heading comes after a real introduction.** The inline banner sits just before it, so a post with no introduction paragraph gets no inline banner, and a one-line introduction followed at once by a banner reads badly.
- **Opt a post out** with `sponsors: false` in its front matter. Do this for a personal story where a banner would break the mood, and for any post about a sponsor or competitor.
- **Never** write a banner, a sponsor name or a "sponsored" sentence into a post. Do not link to a sponsor from the text as if it were editorial.
- **Labels:** every banner, paid or our own, says *Sponsored* and its link is marked `rel="sponsored"`.
- **Adding or retiring a banner:** add `src/content/sponsors/<name>.json` (copy `example.json`), put any image in `public/sponsors/` at the exact size, set `start` and `end` dates, and run `pnpm check:sponsors`. To retire one, set `"active": false` or let its `end` date pass. Paid banners come before our own; our own fill every slot that is not booked.
- **Our own banners promote only things that exist.** Add a banner for a new part of Dev Universe when it launches, not before.
- **Our own banners rotate and animate; paid ones never do.** Give a new house banner a `motion` (`aurora`, `orbit`, `pulse`, `sweep`, `grid`) and a tone other than `accent` (its text contrast is too low). The more banners, the longer the rotation; keep the headline short enough for the 90-pixel inline slot.
- **Prices** live in `src/lib/ad-prices.ts` and nowhere else.

# Part E. Templates

## 23. Skeletons

Copy a skeleton, replace the angle-bracketed parts, keep the structure. Each starts with `draft: true`.

### A. Explainer (stand-alone or series post)

`src/content/posts/<slug>.mdx`

````mdx
---
title: "<What the reader will understand, as a sentence they would click>"
description: "<The question the post answers, in 200 characters or fewer.>"
date: 2026-10-04
tags: [<Topic>, <Topic>]
draft: true
featured: false
cover:
  kind: quote
  text: "<The best line, 70 characters or fewer>"
---

<The hook: a moment the reader recognises, in 80 to 150 words.>

## <Stop or section 1: a plain statement of the idea>

<What happens, in plain words. Define each new term where it first appears.>

<Compare>
  <Side kind="before" label="<Before>"><one line></Side>
  <Side label="<After>"><one line></Side>
</Compare>

<Sidenote label="Try it"><A two-step experiment the reader can run in their own browser or terminal.></Sidenote>

## <Stop or section 2>

<What happens. One idea to remember.>

<Steps>
  <Step title="<One>"><short></Step>
  <Step title="<Two>"><short></Step>
  <Step title="<Three>"><short></Step>
</Steps>

## <A checklist the reader can apply>

<Steps>
  <Step title="<Habit one>"><one line></Step>
  <Step title="<Habit two>"><one line></Step>
</Steps>

**<One bold takeaway sentence.>**
````

### B. Story (stand-alone)

`src/content/posts/<slug>.mdx`

````mdx
---
title: "<A sentence the reader would click>"
description: "<The scene or the question, in 200 characters or fewer.>"
date: 2026-10-04
tags: [<Topic>]
draft: true
featured: false
cover:
  kind: quote
  text: "<The best line, 70 characters or fewer>"
---

<The cold open: a real moment, a place, a belief, in plain words. 80 to 150 words.>

<The question: one or two sentences about what this is really about.>

## <Beat 1 heading, a symptom in second person or a plain statement>

<Story: as long as the scene needs. A scene with a feeling. Everything in it happened.>

<One sentence that names the idea the scene raised, only if a fact answers a question the story asked.>

<Compare>
  <Side kind="before" label="<Before>"><one line></Side>
  <Side label="<After>"><one line></Side>
</Compare>

## <Beat 2 heading>

<Story. No fact moment here; not every beat needs one. Say a new thing, not the last thing again.>

## <The turn: "So, should you…?" or similar>

<The pattern in one sentence. Then what to pay attention to.> **<The line you want them to keep.>**

<The close: two to four short lines naming the series idea.>
````

### C. Series

`src/content/series/<series>/index.md`

```yaml
---
title: "<Series title>"
description: "<What the series is for, in 200 characters or fewer.>"
tone: "<mint | lilac | sky | rose>"
pattern: "<dots | rings | grid | stripes | check>"
---
```

Each post in the series is a story or an explainer from the skeletons above, with `order: 1`, `order: 2` and so on. The first post makes the promise and names the series idea; the last returns to it.

## 24. Worked example

Dev's essay *Symptoms That You Should Pursue Coding* is a story, and the first post of *Curious to Coder*. The first draft ran to about 2,300 words, and the same point (curiosity is worth following) came back in three closing sections and after almost every symptom. The rewrite is about 1,300 words. Here is what changed, and why. It shows the method: **one new idea per section, say it once, keep the best lines.**

| Section | What it does | Fact moment | Cut |
| --- | --- | --- | --- |
| Open | The IPS plan, the realisation "a plan without knowing what I was naturally curious about." | none | A third of the opening detail |
| The First Spark | The substitute teacher and inheritance; "a question I **wanted** answered." | `Compare` (copy the code vs inherit it) | A second paragraph repeating "signs for years" |
| You Wonder How It Works | HTML on localhost; "I could make something." | `Steps` (ask, answer, draw) | The repeated "worth noticing" nudge |
| You Build Before You Know Enough | `clrscr`, `getch`; **Knowledge was turning into creation.** | none | The curriculum paragraph |
| You Think You Could Make It Better | The meal-tracking app; what could exist instead. | none | The list of rhetorical questions |
| You Celebrate When the Bug Dies | The lab exercise and the dance. | none | The second reflection paragraph |
| You Get Annoyed by What Could Be Automated | "Why am I doing this manually?" | `Statement` | A paragraph restating the question |
| You Ask Questions Nobody Asked You to Ask | The microphone in a meeting. | Mermaid diagram | The closing paragraph |
| So, Should You Pursue Coding? | One turn: the pattern, the bold line, "a coder is someone curious enough to see a problem and courageous enough to do something about it." | none | The separate "Who Is a Coder?" section |
| Curious to Coder | The welcome and the last two lines. | none | The repeated "curiosity" restatements |

Seven sections, one new idea each. Four fact moments, none back to back.

## 25. Before you publish

Tick every box. Claude: say which you could not verify.

**Voice**
- [ ] Opens inside a moment, not a thesis.
- [ ] Every section has a small true detail, an honest "I didn't know" or "looking back", and (where it fits) a bold takeaway.
- [ ] No banned words (section 1). No "In this article…". Closes on the series idea.
- [ ] Read it aloud; every hard-to-say sentence is rewritten.

**Format**
- [ ] A stranger would learn something they can use. The post does not narrate how the site, a chat or a decision happened. Length is whatever that value needs, no more.
- [ ] Every beat adds a new idea (no fixed number of beats); fact moments within the section 5 limits; none back to back.
- [ ] Each fact moment answers a question the story just raised, in the story's words first.
- [ ] No more than two new terms per beat, each defined where it first appears.
- [ ] At most one loud block per screen; at most one `wide`/`bleed`.
- [ ] Nothing invented, nothing real disguised, every fact true and checkable. Plans are described as ideas.
- [ ] Each section adds a new idea. No paragraph restates the one before it.

**Front matter and files**
- [ ] File is in the right folder; slug is valid and not reserved; `.mdx` if blocks are used.
- [ ] `description` is 200 characters or fewer; `cover.text` is 70 or fewer; `cover.sub` is 40 or fewer.
- [ ] `tags` are reused, Title Case, Series posts have `order`.

**Safety and accessibility**
- [ ] Every diagram has `accTitle` and `accDescr`; every table or `Heatmap` has a caption.
- [ ] Headings use `##` and `###` only, in order.
- [ ] No images, iframes, scripts, external assets, secrets, or other people's private details. Mock data is labelled.

**Build**
- [ ] `pnpm check && pnpm build` passes.
- [ ] `pnpm check:dist` passes (links, feeds, policy, accessibility, Lighthouse), after `pnpm build`.
- [ ] Preview the page: contents rail makes sense, covers read well, diagrams show in light and dark.
- [ ] Set `draft: false`, open a pull request, add the `build` label, wait for green, merge, and watch the deploy.
- [ ] After deploy, check the post, its series page and `/rss.xml`.

## 26. When the build fails

| You see | Cause | Fix |
| --- | --- | --- |
| `"<slug>" is a reserved route and cannot be used as a slug` | The file name is in the reserved list | Rename the file (section 13) |
| `Slug "<x>" is used by both a series and a standalone post` | A post and a series share a name | Rename one |
| Front matter error naming `description` | Over 200 characters | Shorten it |
| Front matter error naming `cover.text` or `cover.sub` | Over 70 or 40 characters | Shorten it |
| Front matter error on `date` | Not a valid date | Use `YYYY-MM-DD` |
| `Expected a closing tag for <Tag>` | A block is not closed | Close it or self-close it |
| `Could not parse expression with acorn` | A stray `{`, `}` or `<` in prose | Escape it (section 16) |
| A diagram fails to build | Missing `accTitle` or `accDescr`, or invalid Mermaid | Add both lines; check the syntax |
| An unknown component error | A misspelt block name | Use the exact names in section 7 |
| A series post is missing from the site | Its series `index.md` is missing or `draft: true` | Add or publish the series |
| `pnpm check:csp` fails | A post pulls something from another site, or has an inline script | Remove it; link out instead (section 18) |
| `pnpm check:feeds` fails | A broken link, or markup that cannot appear in a feed | Fix the link; avoid inline widgets outside the Imaxt blocks |
| `pnpm check:a11y` fails | Contrast, heading order or a missing name | Use tones, fix the heading level, add the label |
| `pnpm check:links` fails | An internal link or `#anchor` does not exist | Fix the link, or the heading it points to |

## Keeping this guide true

When a block, a front-matter field or a rule changes, update this guide in the same pull request. The sources of truth are `src/components/imaxt/` (blocks), `src/content.config.ts` (front matter), `src/lib/content.ts` (reserved slugs), `src/plugins/rehype-imaxt-diagram.mjs` (diagrams) and the live Lab at `/imaxt/`.
