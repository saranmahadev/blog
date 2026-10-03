---
title: "Part 2: building the graph"
description: "Parsing, edges, and the queries that make it useful."
date: 2026-09-20
order: 2
tags: [Graphs, Engineering]
featured: false
---
Building the graph is mostly parsing. Use a real parser for each language instead of regular expressions, and record both the definition and every reference.

## Keep edges typed

An edge that says only "related" is useless. Store whether it is a call, an import or an inheritance so queries can be precise.
