---
layout: post
title: "Simple backups with RSnapShot"
description: "Simple backups with RSnapShot"
category: 
tags: [debian, backup]
---
{% include JB/setup %}

The goal is to create a complete duplicate of your server (files and mysql).
To achieve this, we will use [rsnapshot](https://github.com/DrHyde/rsnapshot)
 a filesystem snapshot utility, written in PERL, for making backups of local 
and remote systems using ssh and rsync.

Rsnapshot is using [hard link] (http://en.wikipedia.org/wiki/Hard_link) to create
differencial backups from the first full backup.


## 1. Installing rsnapshot (00:00)
```
apt-get install rsnapshot
```

## 2. Configuring rsnapshot (00:13)
The main configuration file is /etc/rsnapshot.yml.
You can use a specific configuration file for your daily/weekly/monthly backups 
if needed.

The configuration is pretty simple but very strict : always use tabs delimitaters 
instead of spaces for the options and directories need a trailing slash at the end.

You can get my configuration file from this [url](https://gist.github.com/4259910)

```
backup_script  /usr/bin/ssh root@domain.com 'mysqldump -uroot -ppassword --all-databases --single-transaction | gzip --rsyncable' > all.sql.gz mysql/  
backup root@domain.com:/      files/  
```
These command copy all you production server files and dump all your databases
using mysqldump tool.

If you prefer to get separate files for each databases, you can use a [shell
script](http://bash.cyberciti.biz/dl/408.sh.zip) which need to be installed 
on the production server.

```
wget http://bash.cyberciti.biz/dl/408.sh.zip
unzip 408.sh.zip
mv 408.sh rsnapshot.mysql
```

Edit the script to specify the output directory to save the mysql backup

```
BAKRSNROOT=/backup/mysql
```

/etc/rsnapshot.yml :

```
backup_script   /usr/bin/ssh root@domain.com '/root/rsnapshot.mysql'    unused1/  
backup root@domain.com:/backup/mysql/      files/  
```

***We are adding the second line because the script is saving mysql datas to the
prod server.***

## 3. Test your configuration file (1:28)
You can simply test the configuration file using this command :

```
rsnapshot configtest
```

## 4. Set up the cronjob (1:34)
We want to run our backups everyday at midnight. 
If an error occured, we will receive an email with all informations :

```
0 0 * * * rsnapshot daily > /tmp/rsnapshot.out 2>&1 || cat /tmp/rsnapshot.out | mail -s "Backups failed on `hostname`" user@domain.com < /dev/null
```

## 5. Create a script to get daily emails when backup is done (1:58)
If you are a Campfire user and want to get chat notifications when backups
are done, just add this command to your cronjob :

```
curl -i -u $KEY:X -H 'Content-Type:application/json' -d
"{\"message\":{\"body\":\"Backups finished\"}}" CAMPFIRE_URL
```
