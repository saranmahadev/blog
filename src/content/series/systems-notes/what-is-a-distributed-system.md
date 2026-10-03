---
title: "What is a distributed system, really?"
description: "Start with the failures, not the diagrams."
date: 2026-09-15
order: 1
tags: [Systems]
featured: false
---
A distributed system is any program whose parts run on more than one machine and have to agree on something. The interesting part is not the machines. It is that any message can be late, lost or duplicated.

## Start with failure

If you assume the network is reliable, you will design the wrong system. Assume messages can vanish, and the rest of the series follows from that.

Next: how a group of machines picks a leader.
