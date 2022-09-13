---
author: "Dev"
title: "Listing the files in EC2 from s3 using Amazon Linux 🤠"
date: "2022-09-12"
description: "EC2 accessing Amazon s3 Bucket"
tags: ["aws","ec2","s3"]
---

# Listing the files in EC2 from s3 using Amazon Linux 🤠

## Tasks

1.	Login as root user and create IAM group called Administrators. Attach the admin managed policy, to the administrator group.
2.	Customize a sign-in link, and write down the new link name in full.
3.	Create a password policy for your account.
4.	While logged in as the root user, create a new IAM user called Administrator.
5.	Add the new user created above to the Administrators group.
6.	On the details page for the administrator user, create a password.
7.	Log out as the root user.
8.	Use the customized sign-in link to sign in as Administrator.
9.	While signed in as Administrator, create an Amazon EC2-type role named TestClient.
10.	Attach the managed policy, <ReadOnlyAccess> to the TestClient.
11.	Launch an Amazon Linux EC2 instance with the new role attached.
12.	SSH into the new instance, and use the CLI to list the contents of an Amazon S3 bucket.
13.	Now, add a policy to your IAM Administrator user with a conflicting permission. Use the policy generator to create a new policy. Create the policy with effect: Deny; AWS Service: Amazon S3;Actions:*; and ARN:*.
14.	Attach the new policy to the Administrators group.
15.	Use the CLI to attempt to list the contents of an Amazon S3 bucket. The policy that allows access and the policy that denies access should resolve to deny access.


### Task 1

- Entered my credentials and logged into the AWS Management Console

    [![0.jpg](https://i.postimg.cc/vHCsNBDn/0.jpg)](https://postimg.cc/PPb9LdWf)

    [![1.jpg](https://i.postimg.cc/qvnTVTC5/1.jpg)](https://postimg.cc/689SnFcr)

- Launched the AWS IAM and created a group with AdministratorAccess Policy attached to it

    [![2.jpg](https://i.postimg.cc/Bv0GJVTQ/2.jpg)](https://postimg.cc/212twT9P)

### Task 2

- Customized the Sign In URL 

    [![3.jpg](https://i.postimg.cc/R0LxhLd1/3.jpg)](https://postimg.cc/HJnhP5fj)

### Task 3

- Adjusted the Password Policy in the IAM

    [![4.jpg](https://i.postimg.cc/XJNSCB1R/4.jpg)](https://postimg.cc/Tys48160)
    [![5.jpg](https://i.postimg.cc/QdWX87vS/5.jpg)](https://postimg.cc/9DC31Dmq)

### Task 4

- Created Administrator User and assigned the user to Administrator Group
    
    [![6.jpg](https://i.postimg.cc/SsmqfvRt/6.jpg)](https://postimg.cc/2q9PzT44)

### Task 5

- Logged into the Administrator User 

    [![7.jpg](https://i.postimg.cc/N06BTcsH/7.jpg)](https://postimg.cc/3yxs5zD8)

### Task 6

- Created a TestClient Role for the EC2 which allows to read the files from s3
    
    ```
    {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "ec2.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
    }
    ```
    
### Task 7

- Created an instance with TestClient Role

    [![8.jpg](https://i.postimg.cc/rsPkcyJv/8.jpg)](https://postimg.cc/5QLGSVD3)
    
- Created an s3 bucket named as tcsions3bucket

    [![9.jpg](https://i.postimg.cc/T27GnQ6C/9.jpg)](https://postimg.cc/RqHjB7qH)

- Uploaded 3 different files to the bucke

    [![10.jpg](https://i.postimg.cc/gkxpsRcd/10.jpg)](https://postimg.cc/SJbHNnzt)
    
### Task 8

- Logged into the ec2 server using SSH

    [11.jpg](https://postimg.cc/qNLPFpqD)
    
### Task 9

- Listed the availables buckets using the command: ``` aws s3 ls```
- Listed the list of objects in the bucket using the command: ```aws s3 ls s3://tcsions3bucket```

    [![12.jpg](https://i.postimg.cc/FRGvWVJF/12.jpg)](https://postimg.cc/S2XHj8rH)
    
### Task 10

- Updated the policy of the role which denies the access to the s3.

    ```
    {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Deny",
            "Principal": {
                "Service": "ec2.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
    }
    ```

- After the policy updation, the listing is denied from the ec2.

    [![13.jpg](https://i.postimg.cc/sxXrtGpY/13.jpg)](https://postimg.cc/ft6pdLqy)
    
## Conclusion

Thus I listed the files of the s3 bucket in the ec2 using iam service.

    
    
    