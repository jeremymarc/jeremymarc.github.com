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
