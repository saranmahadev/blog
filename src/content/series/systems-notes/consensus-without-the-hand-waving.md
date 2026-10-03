---
title: "Consensus without the hand-waving"
description: "What it means for machines to agree, and the cost of getting there."
date: 2026-09-24
order: 3
tags: [Systems]
featured: true
---
Consensus is the problem of getting several machines to agree on one value, even when some of them fail. Almost every database you use depends on a solution to it.

## The two promises

A consensus protocol promises that nobody decides differently (safety) and that a decision is eventually reached (liveness). You can always keep the first; the second needs the network to behave for long enough.

## Why a majority

Any two majorities overlap by at least one machine. That overlap is how a new leader learns what the old one decided.
