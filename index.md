---
layout: page
title: Jeremy Marc
tagline: Software Engineer
---
{% include JB/setup %}

<div class="post-list">
  <h2>Articles</h2>
  <ul>
      {% for post in site.posts %}
        <li><a href="{{post.url}}">{{post.title}}</a></li>
      {% endfor %}
   </ul>
</div>

<div class="socials">
    <a href="#" class="social email">Email</a>
    <a href="http://twitter.com/jeremymarc" class="social twitter">Twitter</a>
    <a href="skype:jeremymarc" class="social skype">Skype</a>
    <a href="http://github.com/jeremymarc" class="social github">Github</a>
</div>
<div id="bg-image"></div>
