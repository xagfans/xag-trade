/* global myApp, round */

myApp.controller("HeaderCtrl", ['$scope', '$rootScope', '$location', 'AuthenticationFactory', 'SettingFactory', 'XrpApi', 'ServerManager', 
  function($scope, $rootScope, $location, AuthenticationFactory, SettingFactory, XrpApi, SM) {

    $rootScope.online = SM.online;
    $scope.$on("networkChange", function() {
      $rootScope.online = SM.online;
    });
  
    $scope.isActive = function(route) {
      return route === $location.path();
    }

    $scope.logout = function () {
      XrpApi.logout();
      AuthenticationFactory.logout();
      $rootScope.reset();
      $location.path("/login");
    }
  }
]);

myApp.controller("FooterCtrl", [ '$scope', '$rootScope', '$translate', 'SettingFactory', '$http',
  function($scope, $rootScope, $translate, SettingFactory, $http) {
    $scope.changeLanguage = function (key) {
      $translate.use(key);
      SettingFactory.setLang(key);
    };

    $scope.version = appinfo.version;
  }]);

