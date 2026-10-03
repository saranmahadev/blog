---
title: "Reverse proxies: the other half"
description: "The mirror image of the forward proxy post."
date: 2026-09-05
tags: [Proxies, Linux]
featured: false
---
A reverse proxy sits in front of servers. Clients talk to it as if it were the server, and it forwards requests to the right backend.

```mermaid caption="A reverse proxy fronts several backends"
flowchart LR
  accTitle: Reverse proxy
  accDescr: Clients send requests to one public address, the reverse proxy, which forwards each request to one of two backend services.
  C[Clients] -->|one address| R[Reverse proxy]
  R --> B1[Backend A]
  R --> B2[Backend B]
```

## What it gives you

- one public address for many services
- TLS in one place
- load balancing and caching
