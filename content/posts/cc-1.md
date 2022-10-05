---
author: "Dev"
title: "Deploying my resume on EC2 🚀 | Cloud Resume Challenge - Task 1"
date: "2022-10-01"
description: "Created my resume with HTML and CSS."
tags: ["aws","ec2","html", "css", "Cloud Resume Challenge"]
---

# Deploying my resume on EC2 🚀

## Introduction

I have decided to take the Cloud Resume Challenge by Forrest Brazeal which is a complicated process. I have already did that on Azure but due to the limitations of Student Subscription, I was unable to complete the challenge and I modified the challenge due to the lack of knowledge and due to complicated aspects. This time, I am going to do it in the Amazon Web Services(AWS) without modifying and skipping any step on the flow.

## Deploying the site on EC2

As the first step, I am going to create the resume and deploy it on the EC2. We are going on a long road where as the first step I have to take *AWS Cloud Practitioner* before proceeding to the entire challenge and I am working on it. To get the hands dirty, I have just hustled around the Apache Server and built the resume site.

## Steps to deploy

### Step 1 - Create an Instance

1. Log into the AWS Account.
  [![Page-1-Image-1.jpg](https://i.postimg.cc/cJ8vYg4b/Page-1-Image-1.jpg)](https://postimg.cc/94CXHf9d)

2. Create an t2.micro instance which comes under free tier
  [![Page-1-Image-2.jpg](https://i.postimg.cc/5NNjgk2v/Page-1-Image-2.jpg)](https://postimg.cc/23Mz8Gv8)

3. SSH into the server
  [![Page-2-Image-3.jpg](https://i.postimg.cc/J7QGbWMM/Page-2-Image-3.jpg)](https://postimg.cc/rzKVk3DP)

4. Upgrade the instance
  [![Page-2-Image-4.jpg](https://i.postimg.cc/B69XCSjQ/Page-2-Image-4.jpg)](https://postimg.cc/7C9HHy1p)

5. Install Apache2 Service
  [![Page-3-Image-5.jpg](https://i.postimg.cc/HxwjZqM0/Page-3-Image-5.jpg)](https://postimg.cc/YGSpjybj)

6. Allow the "Apache Full" 
  [![Page-3-Image-6.jpg](https://i.postimg.cc/sx3xtTPk/Page-3-Image-6.jpg)](https://postimg.cc/5YkfzqRg)
  
7. Restart the apache2 service using the command `sudo service apache2 restart`

8. Make sure that the service is running
  [![Page-4-Image-7.jpg](https://i.postimg.cc/9F80ntDk/Page-4-Image-7.jpg)](https://postimg.cc/PPDdLDzb)
  
9. Get the Public IP Address from the EC2 Console and place it in the browser to verify the apache installation
  [![Page-4-Image-8.jpg](https://i.postimg.cc/Gm4tw8Ym/Page-4-Image-8.jpg)](https://postimg.cc/jDrtyjZp)
  
10. Create a resume with HTML, CSS
  [![Page-5-Image-10.jpg](https://i.postimg.cc/BvDvbrmW/Page-5-Image-10.jpg)](https://postimg.cc/PLXHFRGK)
  
11. The static site folder is in the location `/var/www/html/` and go to the folder and import the site
  [![Page-7-Image-13.jpg](https://i.postimg.cc/6pF39WLL/Page-7-Image-13.jpg)](https://postimg.cc/9DtVbjkr)

12. That's it, we are online 
  [![Page-7-Image-14.jpg](https://i.postimg.cc/tJRRrYpy/Page-7-Image-14.jpg)](https://postimg.cc/DJDK0fSY)
  
 
