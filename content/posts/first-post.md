---
author: "Dev"
title: "Migration to Hugo | Start from Scratch 🏃‍♂️"
date: "2022-08-27"
description: "Every day is a chance to begin again. Don't focus on the failures of yesterday, start today with positive thoughts and expectations"
tags: ["scratch","beginning", "Hugo", "Blogging"]
---

> Every day is a chance to begin again. Don't focus on the failures of yesterday, start today with positive thoughts and expectations

# A New Beginning

In today's trend everyone tend to create content on Internet with passion and some people even make it as a career. I had the passion to share my knowledge about different technologies and did it on an emerging developer blogging platform. Unfortunately lost all my content on the platform and nearly killed more than 1 and a half year hard work. Well...! This time let's do it different. 

# JAM Stack

>  Mistake - 1
>
> NO BACKUP

Since I had all the trust on the platform, didn't worry about the backups. I was wrong and we have to have backups in order to migrate from one platform to another. The best solution for both Backup and Content Management is the **JAM Stack**. 



With a wide research and exploring lot of other options like 

- Hexo
- 11ty
- Gatsby
- Jekyll
- and more..

I have decided to go with **HUGO**.

# HUGO

Hugo is an opensource static site generator which is written in Go programming making it an blazingly fast and modern generator. It is very simple to adapt and can be configured very easily with dedicated learning of 15 min. I am not interested in building my own theme and configuring like a millions of things where I end up working for a week to just write "Hello World!" on a website. So I went to explore different themes on the market and ended up with the interesting and lovable template - PaperMod by adityatelange.



## PROCESS

**Step 1:**

I have installed the latest Hugo version(might vary now).

<iframe   src="https://carbon.now.sh/embed?bg=rgba%28248%2C231%2C28%2C1%29&t=blackboard&wt=none&l=application%2Fx-sh&width=863.25&ds=true&dsyoff=20px&dsblur=68px&wc=true&wa=false&pv=56px&ph=56px&ln=false&fl=1&fm=Hack&fs=14px&lh=133%25&si=false&es=2x&wm=false&code=%2524%2520hugo%2520version%250Ahugo%2520v0.101.0"   style="width: 863px; height: 217px; border:0; transform: scale(1); overflow:hidden;"   sandbox="allow-scripts allow-same-origin"> </iframe>

**Step 2:**

Created the new site naming "Dev Maestro".

<iframe   src="https://carbon.now.sh/embed?bg=rgba%28248%2C231%2C28%2C1%29&t=blackboard&wt=none&l=application%2Fx-sh&width=863.25&ds=true&dsyoff=20px&dsblur=68px&wc=true&wa=false&pv=56px&ph=56px&ln=false&fl=1&fm=Hack&fs=14px&lh=133%25&si=false&es=2x&wm=false&code=%2524%2520hugo%2520new%2520site%2520devmaestro%250A%2524%2520cd%2520devmaestro%250A%28devmaestro%29%2520%2524"   style="width: 863px; height: 225px; border:0; transform: scale(1);"   sandbox="allow-scripts allow-same-origin"> </iframe>

**Step 3:**

Added the theme as a submodule to get further updates from the theme repo.

<iframe   src="https://carbon.now.sh/embed?bg=rgba%28248%2C231%2C28%2C1%29&t=blackboard&wt=none&l=application%2Fx-sh&width=863.25&ds=true&dsyoff=20px&dsblur=68px&wc=true&wa=false&pv=56px&ph=56px&ln=false&fl=1&fm=Hack&fs=14px&lh=133%25&si=false&es=2x&wm=false&code=%2524%2520git%2520submodule%2520add%2520--depth%253D1%2520https%253A%252F%252Fgithub.com%252Fadityatelange%252Fhugo-PaperMod.git%2520themes%252FPaperMod"   style="width: 863px; height: 206px; border:0; transform: scale(1); overflow:hidden;"   sandbox="allow-scripts allow-same-origin"> </iframe>

Step 4:

Edited the **YAML** file as needed for the site and wrote the first post which you are reading right now.

Step 5:

Deployed the site to GitHub Pages and connected it to the domain blog.saranmahadev.tech using the CNAME file.

# NEVER GIVE UP!

Everyday we will be encountering issues handle that issue as a boss and make sure to remember that You are the hero/heroine of your story and so act like it!



