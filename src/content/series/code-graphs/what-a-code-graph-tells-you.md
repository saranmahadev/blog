---
title: "What a code graph tells you that grep can't"
description: "Relationships, not strings: who calls what, and what breaks if it changes."
date: 2026-09-18
order: 1
tags: [Graphs, Engineering]
featured: true
---
Searching text finds where a name appears. A code graph answers a different question: what depends on this?

## Nodes and edges

Treat every function, class and file as a node. Treat every call, import and inheritance as an edge. Now "what breaks if I change this function?" is a graph query.

## Where it helps

- finding dead code
- estimating the blast radius of a change
- onboarding to a codebase you did not write
