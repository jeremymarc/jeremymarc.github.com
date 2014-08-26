---
layout: post
title: "Rails, SearchKick and ActAsTaggableOn"
description: ""
category: 
tags: [rails, searchkick, ActAsTaggableOn]
---
{% include JB/setup %}

If you are using [SearchKick](https://github.com/ankane/searchkick) with [ActAsTaggableOn](https://github.com/mbleigh/acts-as-taggable-on),
you may have hit some issues updating a single entity after adding a tag.

To make it works, you have to extend the Tagging class (inside the ActsAsTaggableOne module) by adding an after_save method.

Solution:
Monkey patch Tagging class like this (I have created a config/initializers/act_as_taggable.rb initializer file)

{% highlight ruby %}
module ActsAsTaggableOn
  class Tagging < ::ActiveRecord::Base
    after_save :reindex_contact

    def reindex_contact
      taggable.reload.reindex
    end
  end
end
{% endhighlight %}

_Note: Do not use after_commit, as its only triggered on the "parent" class (Contact for me.)_

Thanks to [Andrew Kane](https://twitter.com/andrewkane) for helping me on this.
