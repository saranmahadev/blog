---
title: "Part 2: leader election"
description: "Who is in charge, and how everyone agrees on it."
date: 2026-09-29
order: 2
tags: [Systems]
featured: false
---
A leader makes coordination simple: one machine decides, the others follow. The hard part is agreeing on who the leader is, especially when machines fail.

## Terms, not clocks

Instead of trusting clocks, many systems number each leadership period (a "term"). A machine that sees a higher term steps down.

## What to remember

- there is at most one leader per term
- a new term starts when the leader is suspected dead
- a leader needs a majority to act

Next: consensus.
