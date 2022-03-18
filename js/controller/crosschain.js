/* global myApp */
myApp.controller("CrossChainCtrl", ['$scope', '$rootScope', '$routeParams', 'XrpApi', 'XrpPath', 'Id', 'SettingFactory', 'AuthenticationFactory', 'Federation', '$http',
  function($scope, $rootScope, $routeParams, XrpApi, XrpPath, Id, SettingFactory, AuthenticationFactory, Federation, $http) {
    var native = $rootScope.currentNetwork.coin;
    $scope.showTips = true;

    $scope.page = "deposit";
    $scope.pickPage = function(page) {
      $scope.page = page;
      if (page == "withdraw") {
        $scope.resolveWithdraw($scope.token.code, $scope.token.issuer);
      }
    }

    $scope.tokenList = [];
    for (var keystr in $rootScope.lines) {
        let code = $rootScope.lines[keystr].code;
        let issuer = $rootScope.lines[keystr].issuer;
        if (code != 'USDT' && issuer != 'rnzcChVKabxh3JLvh7qGanzqTCDW6fUSDT') {
          $scope.tokenList.push({code: code, issuer: issuer});
        }        
    }
    $scope.token = {};
    $scope.pickToken = function(code, issuer) {
      $scope.token.code = code;
      $scope.token.issuer = issuer;
      $scope.token.logo = $rootScope.getGateway(code, issuer).logo;
      $scope.token.balance = $rootScope.getBalance(code, issuer);

      $scope.deposit_error = "";
      $scope.deposit_info = {};
      $scope.deposit_msgs = [];
      $scope.pickPage($scope.page);
    };
    $scope.pickToken('USDT', 'rnzcChVKabxh3JLvh7qGanzqTCDW6fUSDT');

    $scope.deposit_error = "";
    $scope.deposit_info = {};
    $scope.deposit_msgs = [];
    $scope.deposit_working = false;
    $scope.resolveDeposit = function(code, issuer) {
      $scope.deposit_error = "";
      $scope.deposit_info = {};
      $scope.deposit_msgs = [];

      let api = getDepositApi(code, issuer);
      if (!api) {
        $scope.deposit_error = "NoWTAA";
      } else {
        let url = api + "?address=" + $rootScope.address + "&currency=" + fmtCode(code) + "&network=xrpgen&lang=" + SettingFactory.getLang(); 
        console.debug('resolve ' + url);
        $scope.deposit_working = true;
        $http({
          method: 'GET',
          url: url
        }).then(res => {
          if (res.data.error) {
            $scope.deposit_error  = res.data.error_message || res.data.error;
          } else if (!validateWtaaDeposit(res.data)) {
            $scope.deposit_error = "NoWTAA";
          } else {
            $scope.deposit_info = res.data;
            $scope.deposit_msgs = res.data.extra_info;
          }
          //console.log(res);      
        }).catch(err => {
          $scope.deposit_error = err.error_message || err.error || err.message;
          console.error(err);
        }).finally(() => {
          $scope.deposit_working = false;
        });
      }
    }

    function getDepositApi(code, issuer) {
      console.log($rootScope.getGateway(code, issuer));
      let service = $rootScope.getGateway(code, issuer).service;
      return service && service.deposit ? service.deposit : "";
    }
    function getWithdrawApi(code, issuer) {
      console.log($rootScope.getGateway(code, issuer));
      let service = $rootScope.getGateway(code, issuer).service;
      return service && service.withdraw ? service.withdraw : "";
    }
    function getDomain(code, issuer) {
      console.log($rootScope.getGateway(code, issuer));
      let domain = $rootScope.getGateway(code, issuer).name;
      return domain;
    }

    function validateWtaaDeposit(data) {
      if (typeof data !== "object") {
        return false;
      }
      if (!data.extra_info && typeof data.extra_info !== "array") {
        return false;
      }
      if (!data.address) {
        return false;
      }
      return true;
    }

    $scope.hasLine = function(code, issuer) {      
      let keystr = key(code, issuer);
      if (!$rootScope.lines[keystr]) {
        return false;
      }
      return $rootScope.lines[keystr].limit > 0;
    };

    $scope.asset = {code: native.code};
    $scope.mode = 'input';
    $scope.asset.amount = 0;
    $scope.send_error = "";
    $scope.sending;

    $scope.resetQuote= function(){
      $scope.mode = 'input';
      $scope.service_amount = 0;
      $scope.asset.amount = 0;
      $scope.send = [];
      $scope.send_error = "";
      $scope.stopPath(true);
    }
    
    $scope.hash = "";
    $scope.tx_state = "";
    $scope.$on("txSuccess", function(e, tx) {
      console.debug('txSuccess event', tx);
      if (tx.hash == $scope.hash) $scope.tx_state = "success";
      $scope.$apply();
    });
    $scope.$on("txFail", function(e, tx) {
      console.debug('txFail event', tx);
      if (tx.hash == $scope.hash) $scope.tx_state = "fail";
      $scope.$apply();
    });

    $scope.act_loading;
    $scope.resetService = function(){
      $scope.hash = "";
      $scope.tx_state = "";
      $scope.send_error = '';
      $scope.real_address = '';
      $scope.send = [];
      $scope.extra_fields = [];
      $scope.invoice = "";
      $scope.memos = [];
      $scope.mode = 'input';

      $scope.service_error = "";
      $scope.service_amount = 0;
      $scope.service_currency = null;

      $scope.quote_url = "";
      $scope.quote_error = "";
    }
    
    $scope.pickCode = function(code) {
      console.log($scope.asset.code, '->', code);
      $scope.asset.code = code;
      $scope.updatePath();
    };
    
    $scope.stopPath = function(clean) {
      $scope.finding = false;
      clearInterval(timer);
      XrpPath.close();
      if (clean) {
        $scope.paths = [];
        $scope.found = false;
      }
    }
    
    $scope.updatePath = function() {
      $scope.invalid_amount = !$scope.asset.amount || $scope.asset.amount <= 0;
      if ($scope.invalid_amount) {
        $scope.stopPath(true);
        return;
      }
      
      var amount = null;
      if ($scope.asset.code == native.code) {
        amount = round($scope.asset.amount * 1000000).toString();
      } else {
        amount = {
            currency : realCode($scope.asset.code),
            issuer : $scope.real_address,
            value : $scope.asset.amount.toString()
        }
      }

      $scope.found = false;
      $scope.finding = true;
      $scope.send_error = '';
      $scope.lastUpdate = 0;
      
      var snapshot = $scope.real_address;
      console.log('open', amount);
      XrpPath.open($rootScope.address, snapshot, amount, function(err, data) {
        if (snapshot !== $scope.real_address){
          console.warn($scope.real_address, 'is not same as', snapshot);
          return;
        }
        startTimer();

        if (err) {
          $scope.send_error = err.message;
          $scope.stopPath();
        } else {
          console.log('path', data);
          $scope.found = true;
          $scope.paths = [];
          var current = null;
          data.alternatives.forEach(alt => {
            if ("string" === typeof alt.source_amount) {
              $scope.paths.push({
                  origin : alt,
                  code  : native.code,
                  value : round(alt.source_amount / 1000000, 6).toString(),
                  rate  : round(alt.source_amount/1000000/$scope.asset.amount, 6).toString()
              });
            } else {
              // Selected currency should be the first option
              var path = {
                  origin : alt,
                  code  : alt.source_amount.currency,
                  value : round(alt.source_amount.value, 6).toString(),
                  rate  : round(alt.source_amount.value/$scope.asset.amount, 6).toString()
              }
              if (alt.source_amount.currency == $scope.asset.code) {
                current = path;
              } else {
                $scope.paths.push(path);
              }
            }
          });
          if (current) {
            $scope.paths.unshift(current);
          }
        }
        $scope.$apply();
      });
    };

    $scope.resolveWithdraw = function(code, issuer) {
      $scope.resetService();
      $scope.stopPath(true);

      let api = getWithdrawApi(code, issuer);
      let domain = getDomain(code, issuer);
      $scope.act_loading = true;
      $scope.service_error = "";
      $http({
        method: 'GET',
        url: api,
        params: {
          type : 'wtaa',
          domain: domain,
          destination: fmtCode(code),
          address: $rootScope.address,
          client : 'xagtrade-' + appinfo.version,
          network: "xag",
          lang: SettingFactory.getLang()
        }
      }).then(res => {
        console.log(res.data);
        if (res.data.result === 'error') {
          $scope.service_error = res.data.error_message || res.data.error;
        } else {
          let data = res.data.data;
          if (data.domain == domain) {
            $scope.service_currency = (data.currencies || data.assets)[0].currency;
            $scope.extra_fields = data.extra_fields;
            $scope.quote_destination = data.destination;
            $scope.quote_domain = data.domain;
            $scope.quote_url = data.quote_url;
          } else {
            $scope.service_error = "The domain field in response must be " + domain;
          }
        }
        $scope.act_loading = false;
      }).catch(err => {
        $scope.service_error = err.message || 'NetworkError';
        $scope.act_loading = false;
        console.log("resolveWithdraw", err);
      });
    };

    $scope.$watch('service_currency', function () { $scope.quote(); }, true);
    $scope.$watch('service_amount',   function () { $scope.quote(); }, true);
    $scope.$watch('extra_fields',     function () { $scope.quote(); }, true);

    $scope.quote_data;
    $scope.quote = function() {
      if (!$scope.serviceForm || !$scope.serviceForm.$valid || !$scope.service_amount) {
        return;
      }
      let data = {
        type: "quote",
        amount       : $scope.service_amount + "/" + $scope.service_currency,
        destination  : $scope.quote_destination,
        domain       : $scope.quote_domain,
        address      : $rootScope.address,
        client       : 'xagtrade-' + appinfo.version,
        network      : 'xag',
        lang         : SettingFactory.getLang()
      };
      $scope.extra_fields.forEach(field => {
        if (field.name) {
          data[field.name] = field.value;
        }
      });

      var snapshot = JSON.stringify(data);
      $scope.quote_data = snapshot;
      $scope.quote_error = "";
      $scope.quote_loading = true;
      $http({
        method: 'GET',
        url: $scope.quote_url || $scope.fed_url,
        params: data
      }).then(function(res) {
        if (snapshot !== $scope.quote_data) {
          return;
        }
        console.log(res.data);
        if (res.data.result === 'error' || res.data.error) {
          $scope.quote_error = res.data.error_message || res.data.error;
          $scope.send = [];
          $scope.stopPath(true);
        } else {
          $scope.send = res.data.quote.send;
          $scope.asset = {code: $scope.send[0].currency, amount: $scope.send[0].value};
          $scope.tag = res.data.quote.destination_tag;
          $scope.invoice = res.data.quote.invoice_id;
          $scope.memos = res.data.quote.memos;
          $scope.real_address = res.data.quote.destination_address || res.data.quote.address;
          $scope.updatePath();
        }
        $scope.quote_loading = false;
      }).catch(function(err) {
        if (snapshot !== $scope.quote_data) {
          return;
        }
        $scope.send = [];
        $scope.stopPath(true);
        console.error('quote', err);
        $scope.quote_error = err.message;
        $scope.quote_loading = false;
      });
    };
    
    $scope.pickPath = function(code) {
      $scope.path = $scope.paths.find(item => {return item.code == code});
      if (!$scope.path && code == native.code) {
        // send XRP/native
        $scope.path = {
            origin : null,
            code  : native.code,
            value : $scope.asset.amount.toString(),
            rate  : "1"
        }
      }
      $scope.stopPath();
      $scope.mode = 'confirm';
    };
    $scope.cancelConfirm = function() {
      $scope.mode = 'input';
      $scope.updatePath();
    }

    $scope.send_confirmed = function() {
      $scope.mode = 'submit';
      $scope.sending = true;
      $scope.send_error = '';
      $scope.hash = "";
      $scope.tx_state = "";
      console.log('sending', $scope.asset, $scope.tag);
      
      var alt = $scope.path.origin;
      var srcAmount, dstAmount;
      if (alt) {
        if ("string" === typeof alt.source_amount) {
          srcAmount = {
              currency : 'drops',
              value : round(alt.source_amount * 1.001).toString()
          }
        } else {
          srcAmount = {
              currency : alt.source_amount.currency,
              counterparty : alt.source_amount.issuer,
              value : new BigNumber(alt.source_amount.value).multipliedBy(1.001).toString()
          }
        }
      } else {
        srcAmount = {
            currency : 'drops',
            value : round($scope.asset.amount * 1000000).toString()
        }
      }
      if ($scope.asset.code == native.code) {
        dstAmount = {
            currency : 'drops',
            value : round($scope.asset.amount * 1000000).toString()
        }
      } else {
        dstAmount = {
            currency : $scope.asset.code,
            counterparty : $scope.real_address,
            value : $scope.asset.amount.toString()
        }
      }
      
      var payment = !alt ? XrpApi.payment($scope.real_address, srcAmount, dstAmount, $scope.tag, $scope.invoice, $scope.memos) :
                       XrpApi.pathPayment($scope.real_address, srcAmount, dstAmount, alt.paths_computed, $scope.tag, $scope.invoice, $scope.memos);
      payment.then(hash => {
        $scope.hash = hash;
        $scope.tx_state = "submitted";
        $scope.sending = false;
        $scope.service_amount = 0;
        $scope.asset.amount = 0;
        $rootScope.$apply();
      }).catch(err => {
        $scope.sending = false;
        console.error(err);
        $scope.send_error = err.message;
        $rootScope.$apply();
      });
    };

    function autoCompleteURL(address) {
      address = address || "";
      if (address.indexOf("@") >=0) {
        return address;
      }
      //TODO: XLM address + @ripplefox.com
      return address;
    }

    function fmtbal(code, value) {
      if (['BTC', 'ETH', 'LTC'].indexOf(code) >= 0) {
        return round(value, 6) + " " + code;
      } else {
        return round(value) + " " + code;
      }
     
    };
    
    // exchange address
    var special_destinations = {
      'r3ipidkRUZWq8JYVjnSnNMf3v7o69vgLEW' : {name: 'RippleFox'},
    }
    
    $scope.bClass = function (code) {
      let result = Object.keys($rootScope.lines)
      let index = result.findIndex(function(e){
        return e === code
      })
      let className = code && code.length == 40 ? hexToAscii(code) : code;
      return className;
    }

    var timer = null;
    var lastUpdateTime;
    function startTimer() {
      clearInterval(timer);
      lastUpdateTime = new Date();
      timer = setInterval(function() {
        $scope.$apply(function() {
          $scope.lastUpdate = round((new Date() - lastUpdateTime) / 1000);
        });
      }, 1000);
    };
    
    $scope.$on("$destroy", function() {
      $scope.stopPath();
    });

} ]);

