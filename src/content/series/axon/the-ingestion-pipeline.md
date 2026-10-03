---
title: "The ingestion pipeline"
description: "Chunking, embedding and writing, without losing your place on failure."
date: 2026-10-01
order: 2
tags: [AI, RAG]
featured: false
---
Ingestion is where retrieval systems quietly break. Documents arrive in odd shapes, jobs die halfway, and the same file gets processed twice.

## Make every step restartable

Split the pipeline into three stages (chunk, embed, write) and store a small checkpoint after each. If a job stops, it resumes from the last checkpoint instead of starting over.

## Write idempotently

Give every chunk a stable id derived from its source and position. Writing the same chunk twice then replaces it instead of duplicating it.

```ts
const id = `${doc.id}:${chunk.index}`;
await index.upsert({ id, vector, metadata });
```

Next in the series: query and ranking.
