---
layout: index
title: Jeremy Marc
---

<header class="header">
  <section>
  <img src="https://pbs.twimg.com/profile_images/2434069277/2vo98iy0usjsx7vncbri.jpeg">
  <h1>Jeremy Marc</h1>
  <h3>Software Engineer</h3>

  <div class="media">
  <a href="https://twitter.com/jeremymarc" class="icon-twitter" title="My Twitter"></a>
  <a href="https://github.com/jeremymarc" class="icon-github" title="My GitHub"></a>
  <a href="mailto:jeremy.marc@me.com" class="icon-comments" title="Say hello"></a>
  </div>
  </section>
</header>

<article class="article">
  <div class="lhc">
  <section>
  <h2>Latest articles</h2>
  <ul>{% for post in site.posts %} <li><a href="{{post.url}}">{{post.title}}</a></li>{% endfor %}</ul>
  </section>
</div>

<div class="rhc">
  <section>
    <h2>Libraries</h2>
    <ul>
      <li><a href="http://jeremymarc.github.io/jquery.formtag.js/" title="Transform a form into mutliples button tag elements">jQuery.formtag - <span>new!</span></a></li>
      <li><a href="https://github.com/jeremymarc/AkamaiPhpClient" title="PHP Client for Akamai Rest API">Akamai PHP Client - <span>new!</span></a></li>
      <li><a href="https://github.com/jeremymarc/JmBalancedPaymentBundle" title="integrate BalancedPayment library to accept credit cards and debit bank accounts for your business.">JmBalancedPaymentBundle</a></li>
      <li><a href="https://github.com/Remixjobs/RjEmailBundle" title="Easily manage and send dynamic emails in multiple languages using Twig and Sonata.">RjEmailBundle</a></li>
      <li><a href="https://github.com/jeremymarc/JmABBundle" title="Allow you to manage HTML Templates stored in your database. Templates are written with Twig, use I18N, and can be set with two versions for AB Testing.">JmABBundle</a></li>
    </ul>
  </section>

  <section>
    <h2>Apps</h2>
    <ul>
      <li><a href="http://remixjobs.com" title="RemixJobs, French IT Jobboard">RemixJobs</a></li>
      <li><a href="http://juiiicy.com" title="A new way to find freelance projects from the best designers">Juiiicy</a></li>
    </ul>
  </section>

  <section>
    <h2>I've worked for</h2>
    <ul>
      <li><a href="http://sweetlabs.com/">SweetLabs (San Diego)</a></li>
      <li><a href="http://efounders.co/">eFounders, Startup Studio (Paris)</a></li>
    </ul>
  </section>
</div>
</article>
