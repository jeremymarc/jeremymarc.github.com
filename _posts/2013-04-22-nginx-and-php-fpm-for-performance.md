---
layout: post
title: "Nginx and php-fpm for performance"
description: ""
category: 
tags: [nginx, mysql, php-fpm, performance]
---
{% include JB/setup %}

This article is a step-by-step nginx/php-fpm installation and configuration.
We will see how-to configure these services to get the best performances according 
to your server settings.

You should test your configuration files using a load testing tools (apache Benchmark, tsung etc)
and adjust it.

Installations and setups are based on Ubuntu.

```
$ uname -a
Linux 3.2.0-36-virtual #57-Ubuntu SMP Tue Jan 8 22:04:49 UTC 2013 x86_64 x86_64 x86_64 GNU/Linux
```

First of all, we need to make sure the system is up to date.

```
$ apt-get update
$ apt-get upgrade
```

## Nginx install
### Install
Lets start installing nginx (correct pronunciation sounds like "engine-ex") : 

```
$ apt-get install nginx
```

### Nginx global configuration file
The global nginx configuration file is located to /etc/nginx/nginx.conf

```
worker_processes  4;
events {
    worker_connections  15000;
    multi_accept on;
}

http {
    sendfile on;
    tcp_nodelay on;
    tcp_nopush on;

    client_body_timeout   10;
    client_header_timeout 10;
    keepalive_timeout     15;
    send_timeout          10;

    worker_rlimit_nofile 20000;
    
    client_body_buffer_size 8K;
    client_header_buffer_size 1k;
    client_max_body_size 2m;
    large_client_header_buffers 2 1k;

    server_tokens off;
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    gzip on;
    gzip_disable "MSIE [1-6]\.";
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

<u>worker_processes</u><br/>
2 * numbers of CPUs if dedicated, else use 1 * numbers of CPU.

The worker_processes and worker_connections from the event sections allows you to 
calculate maxclients value:<br/>
max_clients = worker_processes * worker_connections / keepalive_timeout<br>
_which is also limited by the number of socket connections available on the system._

To know the number of CPU on your system :

```
grep processor /proc/cpuinfo | wc -l
```
<br>
<u>worker_connections</u><br/>
Determines how much clients will be served per worker.
Keep it high to have a lot of connections availables.

<br>
<u>sendfile</u> Copy data using a system call for data transfer between the disk and the TCP socket. [2]<br>
<u>tcp_nodelay</u> We don't want to buffer data sent.<br>
<u>tcp_nopush</u> Send headers alltogether.<br>


<br>
<u>keepalive_timeout</u><br/>
Close live connections as soon as possible.


client_body_buffer_size 8K;<br>
client_header_buffer_size 1k;<br>
client_max_body_size 2m;<br>
large_client_header_buffers 2 1k;<br>

These directives handle buffer size. If these values are too lows, nginx will store
the responses in a temporary file (IO) so you want to prevent this.


### Nginx application file
Let's talk now about our website configuration file. We are using FASTCGI to serve 
all php files to nginx.

[https://gist.github.com/jeremymarc/5448381](Configuration file)

```
server {
    listen 80 default;
    server_name domain.com;
    rewrite ^ https://$server_name$request_uri? permanent;
}
```
(Optional) We want to redirect all non https request to the https url.

```
listen 443 default spdy;
```
Port to listen (443).<br/>
(Optional) Parameter to enable spdy; Check next chapter for more details.

```
location / {
    try_files $uri /app.php?$query_string;
}
 
location ~ \.php$ {
    fastcgi_pass backend;
    fastcgi_index index.php;
    include fastcgi_params;
}
```
Redirecting to our front controller and serving all php files to php-fpm using fastcgi.

```
location ~ ^/v/[^/]+(/.*) {
    ...
}
```
(Optional) Usefull for assets urls (https://domain.com/v/XXXX/main.css), to automatically
set the expire cache for static files and make sure everything is cleared at each new release
changing the value in the url after v.

_Note: You might consider moving all static files to a CDN to keep nginx load only 
for backend files. Other advantages of using a CDN is to serve static files quickly
for all your users, regardless of their location._


### Installing SPDY (Optional)
If you are planning to use SSL, you may want the support of [SPDY](http://www.chromium.org/spdy/spdy-whitepaper),
designed to make the initial load time faster, reducing the latency of web pages.

You will need to apply a [patch](http://nginx.org/patches/spdy/) to nginx sources to add SPDY support.

If you are using ubuntu, there is a [package](https://launchpad.net/~chris-lea/+archive/nginx-devel)
 which can facilitate the install for you.

```
sudo apt-get update
sudo apt-get -y install nginx nginx-common nginx-full
```

If not, you can follow the [README in spdy](http://nginx.org/patches/spdy/README.txt) to patch 
nginx sources.

You can check that SPDY is installed using browser extension :

+ [Chrome](https://chrome.google.com/webstore/detail/spdy-indicator/mpbpobfflnpcgagjijhmgnchggcjblin)
+ [Firefox](https://addons.mozilla.org/en-us/firefox/addon/spdy-indicator/)


### Install ngx_pagespeed (Optional)
[ngx_pagespeed](http://googledevelopers.blogspot.com/2013/04/speed-up-your-sites-with-pagespeed-for.html) 
speeds up your site and reduces page load time by automatically 
applying web performance best practices to pages and associated assets 
(CSS, JavaScript, images) without requiring you to modify your existing content or workflow.

There are a lot of filters you can apply to optimize performances 
(collapse_whitespace, combine_css, extend_cache, inline_javascript, insert_ga, remove_comments etc.)

You can [check the demo](http://ngxpagespeed.com/ngx_pagespeed_example/), which show before/after applying module filters :


## PHP-FPM install
### Why php-fpm ?
There are several ways to serve PHP applications mod_php, cgi, lighttpd fastcgi...
FastCGI has been written by the nginx team and it’s extremely tunable.


### Installing libs
Every new version of PHP improve performances and memory issues, so make sure to install the last version
(right now, php 5.4) [Benchmark between PHP5.3 and PHP5.4](http://news.php.net/php.internals/57760)

On Debian or Ubuntu, you can use Dotdeb14 to get almost immediate, hasle-less,
updates to PHP as well as access to some other software that’s not kept up-to-date
in the Ubuntu Repositories (Redis and Nginx, for example).
This saves you the hassle of having to wait for your distribution maintainers to
update the packages, which often takes weeks or months (or never).

To install PHP5.4, we will need to add dotdeb in our sources.

```
echo "deb http://packages.dotdeb.org stable all" > /etc/apt/sources.list.d/dotdeb.list
echo "deb-src http://packages.dotdeb.org stable all" >> /etc/apt/sources.list.d/dotdeb.list
echo "deb http://packages.dotdeb.org squeeze-php54 all" >> /etc/apt/sources.list.d/dotdeb.list
echo "deb-src http://packages.dotdeb.org squeeze-php54 all" >> /etc/apt/sources.list.d/dotdeb.list
curl -s http://www.dotdeb.org/dotdeb.gpg | apt-key add -
apt-get -y update
apt-get -y install php5 php5-cli
```

[For lazy people](http://xcitestudios.com/blog/wp-content/uploads/php54.sh)

```
$ curl http://xcitestudios.com/blog/wp-content/uploads/php54.sh | sudo bash
```

### Setting default configuration
```
$ vim /etc/php5/cli/php.ini
[PHP]
engine = On
expose_php = Off

max_execution_time = 7
memory_limit = -1
error_reporting = E_ALL ~ ~E_DEPRECATED
display_errors = Off
display_startup_errors = Off
html_errors = Off
default_socket_timeout = 5

file_uploads = On
upload_tmp_dir = /tmp/php
upload_max_filesize = 50M
post_max_size = 50M
max_file_uploads = 20

date.timezone = 'UTC'
```

_Note: We set the max_execution_time to only 7 seconds.
We don't want any requests taking more than few seconds, so if it's taking more than 7 seconds,
that means something goes wrong.<br>
Sometimes few tasks (like changing password using Blowfish encryption) can take more 
times, so adjust it to your needs._

### Installing php-fpm
```
$ apt-get install php5-fpm
```

Now we need to configure the vhost file <br>
_(usually in /etc/php5/fpm/pool.d/domain.conf)_.

```
[domain]
listen = /var/run/domain.sock
user = domain
group = domain
 
pm = dynamic
pm.max_children = 100
pm.start_servers = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 15
pm.max_requests = 1000
pm.status_path = /php_status
 
request_terminate_timeout = 0
request_slowlog_timeout = 0
slowlog = /var/log/php/fpm/domain.slowlog.log
 
; Redirect worker stdout and stderr into main error log. If not set, stdout and
; stderr will be redirected to /dev/null according to FastCGI specs.
; Default Value: no
catch_workers_output = yes
 
php_admin_value[error_log] = /var/log/domain.php.error.log
php_admin_value[session.save_path] = /home/domain/www/sessions
php_admin_value[session.gc_probability] = 0
```

```
listen = /var/run/domain.sock
```
Using unix domain socket is better than tcp socket.

```
user = domain
group = domain
```
Default value: www-data. Advantage of running php-fpm by the application user is you 
don't need to deal with cache and logs folder permissions.

```
pm.max_children = 100
pm.start_servers = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 15
pm.max_requests = 1000
```

The configuration variable pm.max_children controls the maximum amount of FPM processes 
that can ever run at the same time. 

<u>pm.max_children</u><br/>
This value can be calculate like this :<br/> 
pm.max_children = total RAM - (500MB) / process memory.

To find the average process memory, you can use this command [1]: 

```
ps -ylC php5-fpm --sort:rss | awk '!/RSS/ { s+=$8 } END { printf "%s\n", "Total memory used by PHP-FPM child processes: "; printf "%dM\n", s/1024 }'
```

Why 500MB ? <br/>
Depends of what is running on your system, but you want to keep memory for 
nginx (about 20MB), MySql and others services.

<u>pm.min_spare_servers and pm.max_spare_servers</u><br/>
Sets the desired minimum/maximum number of idle server processes (waiting to process).
If the number of 'idle' processes is less/great than this number then some children 
will be deleted/created. These values can be optimized for CPU with a high value and
for RAM with a low value.

<u>pm.start_servers</u><br/>
The number of children created on startup. Value must be between pm.min_spare_servers and pm.max_spare_servers.

<u>pm.max_requests</u><br/>
We want to keep it hight to prevent server respawn.
_Note: If you have a memory leak in your PHP code decrease this value to recreate it 
quickly and free the memory._

```
php_admin_value[error_log] = /var/log/domain.php.error.log
php_admin_value[session.save_path] = /home/domain/www/sessions
php_admin_value[session.gc_probability] = 0
```

The default value with Symfony2 is to store session inside the cache directory.
If you want to keep session active after restart, you should save it in another directory.
You can either do it in the php-fpm file, or directly inside the Symfony2 config.yml file
(framework.session.save_path);

_Note: Be careful to not leave session.save_path to a null value, as it can result
to a security issue : it will failback to /tmp and anybody on the server could
be able to hijack a session._

<br/>
_Links_ <br>
[1](http://myshell.co.uk/index.php/adjusting-child-processes-for-php-fpm-nginx/)
[2](http://www.techrepublic.com/article/use-sendfile-to-optimize-data-transfer/1044112)
