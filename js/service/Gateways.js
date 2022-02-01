/* global _, myApp */

myApp.factory('Gateways', ['$rootScope', function($rootScope) {
    let _gateways = {
        "xagfans.com" : {
          name : 'xagfans.com',
          website : 'https://xagfans.com/',
          service : [],
          assets : [
            {code : 'USDT', issuer : 'rnzcChVKabxh3JLvh7qGanzqTCDW6fUSDT', list: true, name: "USDT", logo: "img/coin/usdt.svg"},
            {code : 'Ripple', issuer : 'rMeL8gHJifANAfVchSDkTUmUWjHMvCeXrp', list: true, name: "Ripple XRP", logo: "img/coin/xrp.png"},
            {code : 'XLM', issuer : 'rUWABeB63z3pq2L6Ke4BTQAPS6hbBtFXLM', list: true, name: "Stellar Lumens", logo: "img/coin/xlm.png"}
          ],
          logo : "img/coin/xag.png"
        }
    };

    function inList(code, issuer) {
      for (var name in _gateways) {
        var found = _gateways[name].assets.find(item => {
          return key(item.code, item.issuer) == key(code, issuer);
        });
        if (found) {
          return true;
        }
      }
      return false;
    }
    
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

      getAll(lines) {
        var list = JSON.parse(JSON.stringify(_gateways));
        list["localhost"] = {
          assets : []
        }
        for(var keystr in lines) {
          let code = lines[keystr].code;
          let issuer = lines[keystr].issuer;
          if (!inList(code, issuer)) {
            list["localhost"].assets.push({
              code: code, 
              issuer: issuer,
              logo: 'img/unknown.png'
            });
          }
        }
        return list;
      },
      
      get gateways() {
        return _gateways;
      },
      
      get defaultTradeAssets() {
        return [
          {code : 'USDT', issuer : 'rnzcChVKabxh3JLvh7qGanzqTCDW6fUSDT'}
        ]
      }
    };
  } ]);
