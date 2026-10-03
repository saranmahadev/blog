---
title: "HNSW in fifteen minutes"
description: "The index behind most vector search, with one picture."
date: 2026-09-14
tags: [Databases, AI]
featured: false
---
HNSW stands for hierarchical navigable small world. It is a graph where each point links to a few near neighbours, with a few long links on upper layers to jump across the space quickly.

## How a search works

Start at the top layer, move to the closest neighbour until you cannot improve, then drop a layer and repeat. The bottom layer gives the final candidates.
