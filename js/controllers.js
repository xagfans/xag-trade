/* global myApp, round */

myApp.controller("HeaderCtrl", ['$scope', '$rootScope', '$translate','$location', 'AuthenticationFactory', 'SettingFactory', 'XrpApi', 'ServerManager',
  function($scope, $rootScope,$translate,$location, AuthenticationFactory, SettingFactory, XrpApi, SM) {
    $scope.langKey = window.localStorage.getItem('lang') || 'cn'
    $scope.showClass = ''
    $scope.showLangeMenu = false
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
    $scope.changeLanguage = function (key) {
      $translate.use(key);
      $scope.langKey = key
      $scope.showLangeMenu = false
      SettingFactory.setLang(key);
    };
    $scope.mouseenterChange = function() {
      $scope.showClass = 'open'
      $scope.showLangeMenu = true
    }
    $scope.getLang = function(){
      return window.localStorage.getItem('lang') || 'cn'
    }
  }
]);

myApp.controller("FooterCtrl", [ '$scope', '$rootScope', '$translate', 'SettingFactory', '$http',
  function($scope, $rootScope, $translate, SettingFactory, $http) {
    $scope.changeLanguage = function (key) {
      console.log(key)
      $translate.use(key);
      $scope.langKey = key
      SettingFactory.setLang(key);
    };

    $scope.version = appinfo.version;
    $scope.new_version = "";
    $scope.diff = false;
    
    $http({
      method: 'GET',
      url: "https://trade.xag-labs.com/package.json"
    }).then(function(res) {
      console.log(res.data);
      $scope.new_version = res.data.version;
      $scope.diff = $scope.version != res.data.version && $scope.version != res.data.beta;
    }).catch(err => {
      console.log('ignore version check', err);
    });

  }]);

