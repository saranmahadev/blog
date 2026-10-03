---
title: "Why I'm building a generic vector database API"
description: "Every retrieval project ends up rebuilding the same plumbing. This series pulls it into one small, dependable API."
date: 2026-10-03
order: 1
tags: [AI, RAG, Databases]
featured: true
---
**The short version.** Most retrieval projects need the same four things: a place to put vectors, a way to filter them, a way to update them safely, and an API that doesn't change every month. Axon is my attempt to make that boring.

## The problem

I have now built the same ingestion and search plumbing three times. Each version was [a little better](/axon/the-ingestion-pipeline/) and a little more tied to its project. None of them could be reused without a rewrite.

### Three copies of the same code

The copies differ in details, but the shape is identical:

- take documents, split them, embed them
- store vectors with metadata
- search with filters, then rank

<figure class="wide">
  <div class="cover tone-sky cv-grid" style="height:320px"><span class="cv-tag mono">Figure 1 · wide block</span></div>
  <figcaption class="mono muted" style="margin-top:12px;text-align:center">Images, diagrams and code can break out of the text column.</figcaption>
</figure>

> The best API is the one you can describe in a single paragraph.

## A small API

Here is the whole surface in one request, which is the test I'd like it to keep passing:

```ts
// one call: embed, filter, rank
const hits = await axon.search({
  index: "docs",
  query: "how do I rotate keys?",
  filter: { tag: "security" },
  limit: 5,
});
```

<div class="callout slab tone-sky"><strong class="mono" style="font-size:12px;padding-top:4px">Note</strong><span>Callouts use a soft tone so the accent stays for actions.</span></div>

## What comes next

Part 2 covers ingestion: chunking, embedding, and writing safely when a job fails halfway.
