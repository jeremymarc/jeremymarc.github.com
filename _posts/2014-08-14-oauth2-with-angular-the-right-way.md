---
layout: post
title: "Oauth2 with Angular: The right way."
description: ""
category:
tags: [angular, oauth2, security]
---
{% include JB/setup %}

## Oauth and Security
OAuth has become standard practice for APIs
https://tools.ietf.org/html/draft-ietf-oauth-v2-31

It security is based on the access token. Even if the communication between the authorization server
and the resource server is done over SSL, they are still risks that someone can have access to
the access token (could be accessible on client side, localStorage, cookie or event server log file ...).

By having a short lived access token, a compromised access token would limit the time an attacker
would have access. Refresh token mitigates the risk of a long-lived access token leaking.
Using refresh token, we can use a short lifetime for our access token, and use it to renew it.

If an attacker was able to get the refresh token they'd be able to get more access tokens at will
until such time as the OAuth server revoked the authorization of the client.


This is why the refresh token SHOULD NOT be exposed to JavaScript. Same reason for the client secret:
Client secret is like a passphrase that proves to the authentication server that the client app
is authorized to make a request on behalf of the user. This client secret must be protected at all costs;
if the secret is compromised, a new one must be generated and all authorized apps will have to be
updated with the new client secret.

The [RFC](http://tools.ietf.org/html/rfc6749#section-4.3.2) differentiate 2 types of clients:
ones which are considered as confidential, and the others.

Because of the sensitive nature of the client secrets and refresh token, it must not be used with public
clients (desktop apps, javascript client... which can of course be decompiled, examined...
Let's see how we can deal with refresh token to use short time access token and to renew automically
it with refresh token, without compromising our app security.


## Requesting our access token from username password

OAuth2 provides a "password" grant type which can be used to exchange a username/password
for an access token.
For example, the native Twitter app could use this grant type to log in on mobile or desktop apps.

{% highlight javascript %}
POST https://api.oauth2server.com/token
grant_type=password&
username=username&
password=password&
client_id=client_id

//no client secret here as the app is public
{% endhighlight %}

_Note: Since this obviously requires the application to collect the user's password, it should only
be used by apps created by the service itself._

_Note: the client secret is not included here under the assumption that most of the use cases
for password grants will be mobile or desktop apps, where the secret cannot be protected._

At this time, the oauth2 server will respond with the access token and refresh token. We will see below
how we can securely store the refresh token in our app.
For now, let's first deal with the access token, to automatically add it to all requests.

## Adding access token to all requests
You can either add the access token as a query param or http header. I would recommend using http header because it
has 2 main advantages:
- there is no risk that your access token will be stored in a log file on the server.
- it's better to have a "clean" url

### Adding Access Token to HTTP Header
Lets add the code to add the header authentication to all requests inside the run block
(a run block is the code which needs to run to kickstart the application).

{% highlight javascript  %}
angular.module('myapp')
.run(['$rootScope', '$injector', function($rootScope,$injector) {
    $injector.get("$http").defaults.transformRequest = function(data, headersGetter) {
      if (sessionService.isLogged()) {
        headersGetter()['Authorization'] = "Bearer " + sessionService.getAccessToken();
      }
      if (data) {
        return angular.toJson(data);
      }
    };
});
{% endhighlight %}
Now our access token is automically added to all requests.


## Using Refresh Token
This is working fine, until the access token lifetime expires.
In this case, the resource server will returns a 401 error (access denied).
At this time we will need to renew our access token using the refresh token ; but as seen below, The refresh token SHOULD NOT
be exposed to javascript, so how could we do?

One solution I have successfully used is to encrypt the refresh token and set it in a cookie (on the server side).
Once the client will try to renew the access_token, the server will receive the encrypted cookie it created before.
After decrypted it, you can use it on the server side to request a new access token and finally returns the new access
token in the response.

### Use Angular Http Interceptor to automatically renew the access token
We can use a angular response interceptor ($http interceptor) to automatically call our resource server to renew the access token when
a 401 request is catched.

Your code may looks like:
{% highlight javascript  %}
angular.module('myapp')
.factory('authHttpResponseInterceptor', function($q, $location, sessionService, $http) {
  return {
    response: function(response) {
      return response || $q.when(response);
    },
    responseError: function(rejection) {
      if (rejection.status === 401) {
        var token = $rootScope.refresh_token;

        authFactory.save({
          client_id: 'client_id',
          grant_type: 'refresh_token',
          // refresh_token: token, sent with the encrypted cookie
        }, function(obj) {
          //update access_token
        }, function() {
          //redirect to login page
         });
      }
      return $q.reject(rejection);
     }
  }
});
{% endhighlight %}
_Note: The encrypted refresh token will be automically sent with the request. You will have to decrypt it and pass it to the resource
server to renew the access token_.

The problem with this interceptor is if the client start doing multiples async requests, it will end up doing multiples call to renew
the token and the last call will invalidate the previous ones.
We need to store all failed calls in a queue and then retry all the requests previously failed due to HTTP 401 response when
we will get the new access token.

This is exactly what this [lib](https://github.com/witoldsz/angular-http-auth) is doing.

Its storing all failed (401) requests in a queue, and retry all of them when we are succesfully renewed our
access_token (by calling authService.loginConfirmed()).

{% highlight javascript  %}
  angular.module('http-auth-interceptor-buffer', [])

  .factory('httpBuffer', ['$injector', function($injector) {
    function retryHttpRequest(config, deferred) {
      function successCallback(response) {
        deferred.resolve(response);
      }
      $http = $http || $injector.get('$http');
      $http(config).then(successCallback, errorCallback);
    }
    return {
      /**
       * Retries all the buffered requests clears the buffer.
       */
      retryAll: function(updater) {
        for (var i = 0; i < buffer.length; ++i) {
          retryHttpRequest(updater(buffer[i].config), buffer[i].deferred);
        }
        buffer = [];
      }
    };
  }]);
{% endhighlight %}

Our code now looks like:
{% highlight javascript  %}
angular.module('myapp')
.run(function($rootScope, $idle, $modalStack, $http, uiSelect2Config, $injector, sessionService, $location, authService) {
  $rootScope.$on('event:auth-loginRequired', function() {
      var authFactory = $injector.get('authFactory');
      authFactory.save({
        client_id: '1_id',
        grant_type: 'refresh_token',
        // refresh_token: token, sent with the encrypted cookie
      }, function(obj) {
        authService.loginConfirmed();
      }, function() {
        //redirect to login page
      });
    });
{% endhighlight %}

## Conclusion
Using short time access token and renewing it with refresh token is the way to go with oauth. But you have to be carefull to not exposed
the client secret and the renew token. As the JavaScript client is not considered as [confidential](http://tools.ietf.org/html/rfc6749#section-4.3.2),
your server must allow the granting of a token without a client_secret.

For the renew token, storing it in a encrypted cookie is a working solution ; be carefull of XSS attack (someone could steal the encrypted cookie)
and use a proper encryption algorithm if you go with this solution.
