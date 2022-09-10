---
author: "Dev"
title: "Deploying my own Cloud on AWS 🚀"
date: "2022-09-09"
description: "Amazon Lightsail helped a lot."
tags: ["aws","cloud","lightsail"]
---
## Deploying My Own Cloud | Task - 3


I tried deploying my own cloud using Next Cloud which is a suite of client-server software for creating and using file hosting services. It is also free and open source which allows us to install on our own private server. Let see how it goes...

- I opened the Amazon LightSail and chose the **Ubuntu 20.04 LTS** Operating System
[![Vd3u-L0-Xm-L.png](https://i.postimg.cc/R0XY8SH7/Vd3u-L0-Xm-L.png)](https://postimg.cc/1gVMVZMX)

- I chose the $5 plan faster usage which is also free for three months
[![Dcg-Dfulk4.png](https://i.postimg.cc/DZ0N39rt/Dcg-Dfulk4.png)](https://postimg.cc/zbm7nPPj)

- After choosing the Instance type and gave the name as **NextCloud** and launched the instance.
[![Tmxqsa-X2l.png](https://i.postimg.cc/zBQczxp3/Tmxqsa-X2l.png)](https://postimg.cc/k6xcwF0d)

- It took seconds and launched the instance for deploying the NextCloud
[![DYo-Zac-RG.png](https://i.postimg.cc/gj6Bn3Bs/DYo-Zac-RG.png)](https://postimg.cc/FkNx6kvk)

- In the networking section, I added the **HTTPS**  protocol for later usage and since I am just exploring, avoided the static IP and used the existing public IP
[![sg81yr-Q-u.png](https://i.postimg.cc/8sQXWs2S/sg81yr-Q-u.png)](https://postimg.cc/FkpxXFFW)

- After the configurations, Launched the SSH using the browser
[![6-TPz-KOx-DR.png](https://i.postimg.cc/v8gQWjJq/6-TPz-KOx-DR.png)](https://postimg.cc/WtVLV9bg)

- I updated and upgraded the instance for the latest packages
[![O6a2j7u-UF.png](https://i.postimg.cc/zDsqp75J/O6a2j7u-UF.png)](https://postimg.cc/7bNvZgfc)
[![qrb-K970ea.png](https://i.postimg.cc/xTLnZmTL/qrb-K970ea.png)](https://postimg.cc/fJWGtJdb)

- During the upgrading process, it asked me What to do about the modified configuration and I chose the Keep the local version currently installed. 
[![ya-Hyh-VM38.png](https://i.postimg.cc/3x7YQwdV/ya-Hyh-VM38.png)](https://postimg.cc/KR9dnx7D)

- As I chose the Ubuntu OS, it comes with a snap package manager which makes this process easier and I installed the NextCloud using snap.

``` sudo snap install nextcloud ```

[![6-Izk-Bn-Oi-K.png](https://i.postimg.cc/htrgDqmj/6-Izk-Bn-Oi-K.png)](https://postimg.cc/XrptLmQS)

- After the installation, configured the nextcloud for login using the command

```sudo nextcloud.manual-installation <username> <password>```
[![i294-NSPFB.png](https://i.postimg.cc/Ls8Sh0kV/i294-NSPFB.png)](https://postimg.cc/VJppVgVS)

- When I looked about doing this work, Many of them integrated their sub-domain with this instance and that instance as trusted domain but I am not interested in doing that so I added the Public IP as the trusted domain.
[![SIBf-XFTo4.png](https://i.postimg.cc/0NXsSdc1/SIBf-XFTo4.png)](https://postimg.cc/f3dpndG8)

> If you want to provision SSL Certificate use the command (skipped): 
>
>`sudo nextcloud.enable-https lets-encrypt`


- Then I opened the Public IP on the browser and gave the credentials to log into it.
[![v9-Jx2y-UX4.png](https://i.postimg.cc/Y94wzGsG/v9-Jx2y-UX4.png)](https://postimg.cc/R6z8MF94)

- After the successful login, I got my own personal cloud to store files and manage work
[![AL4-m-Lb-U8.png](https://i.postimg.cc/rmv2nVBh/AL4-m-Lb-U8.png)](https://postimg.cc/Ppz7NjrZ)

- Since after messing around the cloud, I terminated the instance to avoid charges
[![b-K-Zv80f-U.png](https://i.postimg.cc/gcZWwhh1/b-K-Zv80f-U.png)](https://postimg.cc/QVhPwH0q)

### Conclusion
NextCloud had an awesome interface and tons of features. Also I got a upcoming blog idea!