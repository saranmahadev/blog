---
author: "Dev"
title: "Well, I build an another Google...(Seriously I did) 😉!"
date: "2022-09-10"
description: "Alternative solutions to Google"
tags: ["Searxng", "Google", "NextCloud"]
---

## Introduction

In the internet, no one can offer services for free without servers. Google is spending more than 25 Billion dollars in servers for offering different services. So how do they pay their bills? how a free search engine can provide service to billions of users at the lowest latency possible in the market. Well, they make you as a product and sell you to different companies. 

## You are Sold!

Google has your

- Search interests
- Video interests
- Calendar
- Files
- and more...

So Google knows you better than your parents😸! They sell all your interests to the product companies and show personalized to gain revenue. There is a big legal aspect behind this problem and as a developer I don't care (Most of the citizens in the world's attitude)!

## What are u going to do about it?

Some people are really angry and care about their privacy very seriously and they have addressed this issue with creating various open source solutions. Seriously, there is lot of alternatives. So lets replace Google!

### Google Search

For replacing, I went with **SearXNG**,  a free internet metasearch engine which aggregates results from more than 70 search services where the users are neither tracked nor profiled.

Step By Step Procedure Installation:

1. Create a VM instance (a server) in any cloud platform, I went with Microsoft Azure.

![vm.png](/1009200201.png)

2. Make sure to install git, docker and docker-compose installation in the instance.

```
sudo apt-get install git docker.io docker-compose
```
![reqs.png](/1009200202.png)

3. Get the docker-compose version of **searchxng**.

```
git clone https://github.com/searxng/searxng-docker.git
```

4. Move into the directory and edit the `.env` file, add your domain and email address to the file.

![env.png](/1009200203.png)

5. Let's start the engine.

```
docker-compose up -d
```

![image.png](/1009200204.png)

### Replacing Google Drive, Sheets, Slides, Docs

Next Cloud is an awesome solution and I have explained the installation in this [post](./amazon-lightsail-nextcloud) but I went with the more advanced solution using docker and configured the drive.saranmahadev.tech

![image.png](/1009200205.png)

### Replacing Gmail

Attained my own email server, a very long time ago...

![image.png](/1009200206.png)


## Conclusion

So I have tried my best to attain maximum privacy and basically recreated Google with different open source projects and if you have more suggestions that can replace enterprise level companies tracking us, let me know!
