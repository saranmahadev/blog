---
author: "Dev"
title: "Setting Up a Reverse Proxy🔗"
date: "2023-01-02"
description: "A reverse proxy is a server that sits in front of one or more web servers and forwards client requests to the appropriate web server."
tags: ["proxy","nginx"]
---

# Reverse Proxy

A reverse proxy is a server that sits in front of one or more web servers and forwards client requests to the appropriate web server. Reverse proxies are used for a variety of purposes, including load balancing, SSL termination, and as a general abstract layer between clients and servers.

To set up a reverse proxy, you will need to install a web server with reverse proxy capabilities, such as NGINX or HAProxy. Once you have installed the web server, you will need to configure it to act as a reverse proxy. This typically involves specifying the backend servers that the reverse proxy should forward requests to, and any additional settings such as load balancing algorithms or SSL termination.

## To set up a reverse proxy using NGINX:

1. Install NGINX on the server that will act as the reverse proxy.
2. Create a configuration file in the /etc/nginx/conf.d directory.
3. Add the following configuration to the file, replacing server_name with the name of your server, and backend_server with the IP address or hostname of your backend server:
```
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://backend_server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
4. Save the configuration file and exit.
5. Restart NGINX to apply the changes: `sudo systemctl restart nginx`

This will set up a basic reverse proxy that forwards all client requests to the specified backend server. You can customize the configuration further to add features such as load balancing or SSL termination.
