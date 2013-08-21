---
layout: post
title: "Ng-model and custom form validation"
description: ""
category: 
tags: [javascript, angularjs]
---
{% include JB/setup %}

Last week, I was playing a bit with the popular angularjs framework and discover
how to handle with custom form validation.

I have a form with selects and  I want the user to be able to select multiples countries 
but each country selected has to be unique.

![screen1]({{ site.url }}/assets/images/screen1.png)

Here the simply html of the current form (without the Add/Remove all buttons) :
{% highlight html linenum %}   
    <form name="myForm" ng-submit="doSomething()">
        <div ng-repeat="price in prices">
            <select name="country" ng-model="price.country" required="required" ng-options="key as value for (key, value) in countries"></select>
        </div>
        <button type="submit" ng-disabled="myForm.$invalid">Save</button>
    </form>
{% endhighlight %}   

Let's now deal with the custom form validator [1] and create a angular directive
called unique. This validator will check if an existing country already exists in 
scope.prices.


{% highlight javascript  %}   
    angular.directive('unique', function() {
        return {
            require: 'ngModel',
            link: function(scope, elem, attr, ngModel) {

                function isUnique(value, minOccur) {
                    var isValid = true,
                        count = 0;

                    if ("undefined" == typeof(minOccur)) {
                        minOccur = 0;
                    }

                    $.each(scope.prices, function(index, el) {
                        if (el.country == value) {
                            if (++count > minOccur) {
                                isValid = false;
                                return;
                            }
                        }
                    });

                    return isValid;
                }

                function validate(value) {
                    var valid = isUnique(value);
                    ngModel.$setValidity('unique', valid);

                    return valid ? value : undefined;
                }

                //call on change
                ngModel.$parsers.unshift(function(value) {
                    ngModel.$setValidity('unique', isUnique(value));

                    return value;
                });

                //call on load
                ngModel.$formatters.unshift(function(value) {
                    ngModel.$setValidity('unique', isUnique(value, 1));

                    return value;
                });
            }
        }
    });
{% endhighlight %}   

_Note: ngModel.$parsers.unshift is called on value changed and BEFORE the value is selected (so 
the number of same element must be 0 to be invalid).<br>
While ngModel.$formatters.unshift is called during page load
(number of found elements must be > 1 to be invalid)._<br>

This directive is using "ngModel.$setValidity" to change the validity of the model.

To use it, just add "unique" in the html element 
{% highlight html  %}   
    <select ng-model="price.country" required="required" ng-options="key as value for (key, value) in countries" unique></select>
{% endhighlight %}   

Playing with ng-show, we can easily display an error message
{% highlight html %}   
 <span ng-show="myForm.element.$error.unique">
      "\{\{ data.country \}\}" is not unique.
</span>
{% endhighlight %}   


Angular automatically add classes to (in)valid form element (ng-valid/ng-invalid).

{% highlight html  %}   
    <style>
    .ng-invalid {
      border: 1px solid red;
    }
    </style>
{% endhighlight %}   

![screen2]({{ site.url }}/assets/images/screen2.png)

To finish, we can play with ng-disabled [3] on the submit button to prevent 
the user to send the form if the form is invalid.

{% highlight html linenum %}   
    <button type="submit" ng-disabled="myForm.$invalid">Update</button>
{% endhighlight %}   

![screen3]({{ site.url }}/assets/images/screen3.png)

_Note: myForm is invalid because we change the element validity in the directive using
ngModel.$setValidity_

<br/>
_Links_ <br>
[1](http://docs.angularjs.org/guide/forms)
[2](http://docs.angularjs.org/guide/directive)
[3](http://docs.angularjs.org/api/ng.directive:ngDisabled)
