---
title: "Forward proxies, explained with one diagram"
description: "What a forward proxy does, who runs it, and why."
date: 2026-09-08
tags: [Proxies, Linux]
featured: true
---
A forward proxy sits in front of clients. Requests go to the proxy, and the proxy talks to the internet on their behalf.

```mermaid caption="A forward proxy sits between clients and the internet"
flowchart LR
  accTitle: Forward proxy
  accDescr: A client sends a request to the forward proxy, which forwards it to a server on the internet. The response returns to the proxy and then to the client.
  A[Client] -->|request| P[Forward proxy]
  P -->|forwarded| S[Server]
  S -->|response| P
  P -->|response| A
```

## Why use one

- control which sites clients can reach
- cache common responses
- hide client addresses from the servers they contact
