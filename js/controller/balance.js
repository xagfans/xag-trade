/* global myApp */

myApp.controller("BalanceCtrl", [ '$scope', '$rootScope', 'XrpApi', 'Gateways',
  function($scope, $rootScope, XrpApi, Gateways) {
    $scope.working = false;
    $scope.refresh = function() {
      if ($scope.working) { return; }
      $scope.working = true;
      XrpApi.queryAccount(function(err){
        $scope.$apply(function(){
          $scope.working = false;
          $scope.removeState = {};
        });
        // console.log($rootScope.lines);
      });
    };
    $scope.refresh();

    $scope.delTrust = function(code, issuer) {
      $scope.setRemoving(code, issuer, true);
      XrpApi.changeTrust(code, issuer, "0").then(result => {
        console.log(code + '.' + issuer + " remove submitted.")
        $scope.setRemoving(code, issuer, false);
        //$scope.$apply();
      }).catch(err => {
        console.error(err);
        $scope.setRemoving(code, issuer, false);
        $scope.$apply();
      });
    };

    $scope.removeState = {};
    $scope.setRemoving = function(code, issuer, state) {
      if (!$scope.removeState[code]) {
        $scope.removeState[code] = {};
      }
      $scope.removeState[code][issuer] = state;
    };
    $scope.isRemoving = function(code, issuer) {
      if ($scope.removeState[code] && $scope.removeState[code][issuer]) {
        return $scope.removeState[code][issuer];
      } else {
        return false;
      }
    }
    $scope.bClass = function (code) {
      let result = Object.keys($rootScope.lines)
      let index = result.findIndex(function(e){
        return e === code
      })
      let className = code
      // if (index === 0) {
      //   className += ' noMarginRight addTo__top'
      // }
      // if (index === 1) {
      //   className += ' absoluteClass'
      // }
      return className
    }
    $scope.aClass = function () {
      let result = Object.keys($rootScope.lines)
      if (result.length ==1) {
        return ' absoluteClass'
      } else if (result.length === 0) {
        return ' addTo__top'
      }
      return ''
    }
    $scope.$on("balanceUpdate", function() {
      console.debug('balanceUpdate event got');
    });

  } ]);
