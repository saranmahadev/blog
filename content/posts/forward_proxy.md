---
author: "Dev"
title: "Setting up a Forward Proxy🔗"
date: "2023-01-02"
description: "A forward proxy is a server that sits in front of a group of clients and forwards their requests to the internet."
tags: ["proxy","squid"]
---

## Forward Proxy

A forward proxy is a server that sits in front of a group of clients and forwards their requests to the internet. Forward proxies are used to protect the privacy of clients, to bypass internet filters and censorship, and to cache frequently requested content for improved performance.

To set up a forward proxy, you will need to install a web server with forward proxy capabilities, such as Squid. Once you have installed the web server, you will need to configure it to act as a forward proxy. This typically involves specifying the IP addresses or hostnames of the clients that are allowed to use the proxy, and any additional settings such as cache sizes or access controls.

### To setup a forward proxy:

1. Install Squid on the server that will act as the forward proxy.
2. Edit the `/etc/squid/squid.conf` configuration file.
3. Add the following lines to the configuration file, replacing `acl` with a list of IP addresses or hostnames of the clients that are allowed to use the proxy:
```
acl allowed_clients src 1.2.3.4 5.6.7.8
http_access allow allowed_clients
```
4. Save the configuration file and exit.
5. Restart Squid to apply the changes: `sudo systemctl restart squid`

This will set up a basic forward proxy that allows the specified clients to connect to the internet through the proxy. You can customize the configuration further to add features such as caching or access controls.
