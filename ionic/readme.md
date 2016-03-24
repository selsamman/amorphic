Support for Ionic 1 is considered alpha.  
Basically you can create an application that shares a controller and model with the server. 
Angular rather than bindster is used for binding.

To use this it is recommended that you include a nodejs directory at the root of your ionic project
and include these in your dependencies:

        "q": "1.x",
        "amorphic": "0.2.x",
        "semotus": "x",
        "supertype": "x",

The current copy of your controller and model files live in www/apps and then mimics the apps directory in nodejs.
The provided hook will do the following:

* Copy the amorphic components from nodejs into your www/lib
* Copy the app files from www/apps to nodejs/apps

Use the amorphicService to connect to the back-end.  Replace servicesModule with your module (e.g. angular.module('starter.services', [])).

To initialize amorphic it must be resolved before any states that use it are entered.  So set up a resolver::

        initAmorphic = {initAmorphic: function (Amorphic, $rootScope) {
          return Amorphic.init(window.cordova ? 'http://myservert.com' : "", "myappname");
        }}
        
Note the appname is the directory name for your app in the apps folder. And then use it in any states that require amorphic
        
          .state('tab.dash', {
            resolve: initAmorphic,
            ....});

Be sure to whitelist the server

    $sceDelegateProvider.resourceUrlWhitelist(
      [
        'http://speecheffect.com/**'
      ]
    );

In the angular controller you can reference the amorphic controller (apps/myappname/public/js/controller.js) 
using the getSessionw method of the Amorphic service.  From there you call methods are bind to properties.

    controllerModule.controller('MyCtrl', function ($scope, $state, $stateParams, Amorphic) {
 
     $scope.$on('$ionicView.enter', function () {
       $scope.amorphicController = Amorphic.getSession();
     }
