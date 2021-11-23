/* global _, myApp */

myApp.factory('Gateways', ['$rootScope', function($rootScope) {
    let _gateways = {
        "xagfans.com" : {
          name : 'xagfans.com',
          website : 'https://xagfans.com/',
          service : [],
          assets : [
            {code : 'USD', issuer : 'rnzcChVKabxh3JLvh7qGanzqTCDW6fUSDT', list: true, name: "USDT", logo: "img/coin/usdt.svg"}
          ],
          logo : "img/coin/xag.png"
        }
    };
    
    function key(code, issuer) {
      return code == 'XRP' ? code : code + '.' + issuer;
    };
    
    let _asset2gateway = {};
    for (var name in _gateways) {
      var gateway = _gateways[name];
      gateway.assets.forEach(asset =>{
        if (asset.logo) {
          _asset2gateway[key(asset.code, asset.issuer)] = {
              name : gateway.name,
              website : gateway.website,
              logo : asset.logo
          };
        }
        _asset2gateway[asset.issuer] = {
            name : gateway.name,
            website : gateway.website,
            logo : gateway.logo
        }
      });
    }
    
    return {
      getGateway(code, issuer) {
        if (code === $rootScope.currentNetwork.coin.code) {
          return {
            logo : $rootScope.currentNetwork.coin.logo
          }
        }
        return _asset2gateway[key(code, issuer)] || _asset2gateway[issuer] || {logo : 'img/unknown.png'};
      },
      
      get gateways() {
        return _gateways;
      },
      
      get defaultTradeAssets() {
        return [
          {code : 'USD', issuer : 'rnzcChVKabxh3JLvh7qGanzqTCDW6fUSDT'}
        ]
      }
    };
  } ]);
