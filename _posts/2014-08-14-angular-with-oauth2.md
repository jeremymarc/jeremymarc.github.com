---
layout: post
title: "Oauth2 with Angular"
description: ""
category:
tags: [angular, oauth2]
---
{% include JB/setup %}

### Oauth and Security
OAuth has become standard practice for APIs
https://tools.ietf.org/html/draft-ietf-oauth-v2-31

It security is based on the access token. By having a short lived access token, a compromised access token
would limit the time an attacker would have access.

Even if the communication between the authorization server and the resource server is done over SSL,
they are still risks that someone can have access to the refresh token (can be saved on client side,
localStorage, cookie or event server log file ...).

Refresh token mitigates the risk of a long-lived access token leaking. Using refresh token, we can use a
short lifetime for our access token, and use it to renew it.

You should ask what if the refresh token is compromised too?
Its useless, because to get a new access token, you will have to send more than the refresh token.
You will need to send client id and client secret in the same request.

### Adding access token to all requests
Once we have a valid access token, we will have to use it, either as a query param or as an http header.

#### Angular: Adding access token as a query param
Let's create an angular factory which will wrap your resource and add the access token to the request.

{% highlight javascript  %}
angular.module('myapp')
.factory('tokenHandlerFactory', function() {
  var tokenHandler = {};
  var token = "";

  tokenHandler.set = function(newToken) {
    token = newToken;
  };

  tokenHandler.get = function() {
    return token;
  };

  tokenHandler.wrapActions = function(resource, actions) {
    // copy original resource
    var wrappedResource = resource;
    for (var i=0; i < actions.length; i++) {
      tokenWrapper(wrappedResource, actions[i]);
    };
    // return modified copy of resource
    return wrappedResource;
  };

  // wraps resource action to send request with auth token
  var tokenWrapper = function(resource, action) {
    // copy original action
    resource['_' + action]  = resource[action];
    // create new action wrapping the original and sending token
    resource[action] = function(data, success, error) {
      return resource['_' + action](
        angular.extend({}, data || {}, {access_token: tokenHandler.get()}),
        success,
        error
      );
    };
  };

  return tokenHandler;
})

angular.module('myapp')
.factory('userFactory', ['$resource', 'tokenHandlerFactory', function($resource, tokenHandler) {
    var resource = $resource('/api/users/:id', {id: '@id'}, {});
    return tokenHandler.wrapActions(resource, ["query", "get"]);
}])
{% endhighlight %}

You have to call tokenHandlerFactory.set(access_token) once u got the valid access token.
After that, you can call directly your API factory (ex: userFactory.query()) as you would normally and the access token
will be automatically added.

### Using Refresh Token
This is working fine, until the access token lifetime expires.
In this case, the resource server will returns a 401 error (access denied).
At this time we will need to renew our access token using the refresh token.

We can use a angular response interceptor ($http interceptor) to automatically call our resource server to renew the token.

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
        var token = localStorage.getItem('refresh_token');

        authFactory.save({
          client_id: 'client_id',
          client_secret: 'client_secret',
          grant_type: 'refresh_token',
          refresh_token: token,
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
The problem with this simple solution is if the client start doing multiples async requests, it will end up doing multiples call to renew the token
and the last call will invalidate the previous ones.
We need to store all failed calls in a queue and then retry all the requests previously failed due to HTTP 401 response when
we will get the new access token.

This is exactly what this [lib](https://github.com/witoldsz/angular-http-auth) is doing.

{% highlight javascript  %}
  angular.module('http-auth-interceptor-buffer', [])

  .factory('httpBuffer', ['$injector', function($injector) {
    /** Holds all the requests, so they can be re-requested in future. */
    var buffer = [];

    /** Service initialized later because of circular dependency problem. */
    var $http;

    function retryHttpRequest(config, deferred) {
      function successCallback(response) {
        deferred.resolve(response);
      }
      function errorCallback(response) {
        deferred.reject(response);
      }
      $http = $http || $injector.get('$http');
      $http(config).then(successCallback, errorCallback);
    }

    return {
      /**
       * Appends HTTP request configuration object with deferred response attached to buffer.
       */
      append: function(config, deferred) {
        buffer.push({
          config: config,
          deferred: deferred
        });
      },

      /**
       * Abandon or reject (if reason provided) all the buffered requests.
       */
      rejectAll: function(reason) {
        if (reason) {
          for (var i = 0; i < buffer.length; ++i) {
            buffer[i].deferred.reject(reason);
          }
        }
        buffer = [];
      },

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

Its storing all failed (401) requests in a queue, and retry all of them when we are succesfully renewed our access_token (by calling authService.loginConfirmed())

Our code now looks like:
{% highlight javascript  %}
angular.module('myapp')
.run(function($rootScope, $idle, $modalStack, $http, uiSelect2Config, $injector, sessionService, $location, authService) {
  $rootScope.$on('event:auth-loginRequired', function() {
      var token = localStorage.getItem('refresh_token');
      if (token) {
        var authFactory = $injector.get('authFactory');
        authFactory.save({
          client_id: '1_id',
          client_secret: 'secret',
          grant_type: 'refresh_token',
          refresh_token: token,
        }, function(obj) {
          authService.loginConfirmed();
        }, function() {
          //redirect to login page
        });
      } else {
        //redirect to login page
      }
    });
{% endhighlight %}

Replaying the requests after successfully getting the new token is still giving 401 ; the lib is retrying all previous request but with the old access_token
as the lib store the whole url with parameters and we are using the access_token as a query param.


### Moving Access Token to HTTP Header
Lets add the code to add the header authentication to all requests inside the run block (a run block is the code which needs to run to kickstart the application).

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

    $rootScope.$on('event:auth-loginRequired', function() {
      var token = localStorage.getItem('refresh_token');
      if (token) {
        var authFactory = $injector.get('authFactory');
        authFactory.save({
          client_id: '1_id',
          client_secret: 'secret',
          grant_type: 'refresh_token',
          refresh_token: token,
        }, function(obj) {
          authService.loginConfirmed();
        }, function() {
          $location.path('/login');
        });
      } else {
        $location.path('/login');
      }
    });
});
{% endhighlight %}
_Note: Sending client_id and client_secret from the client side is a bad practice and make refresh token completely useless. Anyone
can access them and renew any access token only with a valid refresh token.
A better solution would have to store the client secret on the server side, and wrap this call into another one._
