---
title: "Linux file permissions, finally"
description: "Read the numbers once and never look them up again."
date: 2026-09-11
tags: [Linux]
featured: false
---
Each permission is a number: read is 4, write is 2, execute is 1. Add them up per group.

```sh
chmod 640 notes.txt   # owner: read+write, group: read, others: none
```

Three digits, three audiences: owner, group, everyone else.
