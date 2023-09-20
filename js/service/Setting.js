myApp.factory('SettingFactory', function($window) {
  return {
    // To add new preset network, add new entry here and in `translationKey` to all translations.
    // P.S. Undefined entries will be asked for in user interface.
    NETWORKS: {
      xag: {
        name: "XAG Public Network",
        translationKey: 'xag_url',
        networkType: 'xag',
        servers: [
          {server: 'g1.xrpgen.com', port: 443},
          {server: 'g2.xrpgen.com', port: 443},
          {server: 'jp.xag-labs.com', port: 443},
          {server: 'us.xag-labs.com', port: 443},
          {server: 'eu.xag-labs.com', port: 443},
          {server: 'sg.xag-labs.com', port: 443}
        ],
        coin: {
          name: "xrpgen",
          atom: "drop",
          code: "XAG",
          logo: "img/coin/xag.png"
        },
        tabs: ["history", "trade", "balance", "send", "trust", "service", "dapp"] // no contact tab
      }
    },

    setTimeout : function(timeout) {
      return $window.localStorage['timeout'] = timeout;
    },
    getTimeout : function() {
      return $window.localStorage['timeout'] || '30';
    },

    setMaxfee : function(maxfee) {
      return $window.localStorage['maxfee'] = maxfee;
    },
    getMaxfee : function() {
      return $window.localStorage['maxfee'] || '0.2';
    },

    setLang : function(lang) {
      return $window.localStorage['lang'] = lang;
    },
    getLang : function() {
      if ($window.localStorage['lang']) {
        return $window.localStorage['lang'];
      } else {
        var lang = navigator.language || navigator.userLanguage;
        if (lang.indexOf('zh') >= 0) {
          return 'cn';
        } else if (lang.indexOf('jp') >= 0) {
          return 'jp';
        } else {
          return 'en';
        }
      }
    },

    setNetworkType : function(network) {
      return $window.localStorage[`network_type`] = network in this.NETWORKS ? network : 'xag';
    },
    getNetworkType : function() {
      return $window.localStorage[`network_type`] || this.setNetworkType();
    },
    
    getCurrentNetwork : function() {
      var network = this.NETWORKS[this.getNetworkType()];
      if (this.getNetworkType() === 'other') {
        network.coin.code = this.getCoin();
      }
      return network;
    },
    setServers : function(serverArr, type) {
      type = type || this.getNetworkType();
      return $window.localStorage[`network_servers/${type}`] = JSON.stringify(serverArr);
    },
    getServers : function(type) {
      type = type || this.getNetworkType();
      if ($window.localStorage[`network_servers/${type}`]) {
        return JSON.parse($window.localStorage[`network_servers/${type}`]);
      } else {
        return JSON.parse(JSON.stringify(this.NETWORKS[type].servers));
      }
    },
    resetServers : function(type) {
      type = type || this.getNetworkType();
      console.log($window.localStorage[`network_servers/${type}`]);
      delete $window.localStorage[`network_servers/${type}`];
      console.log($window.localStorage[`network_servers/${type}`]);
    },
    setCoin : function(val) {
      return this.getNetworkType() === 'other' ? $window.localStorage[`network_coin/${this.getNetworkType()}`] = val : this.NETWORKS[this.getNetworkType()].coin.code;
    },
    getCoin : function(type) {
      type = type || this.getNetworkType();
      return type === 'other' ? $window.localStorage[`network_coin/${type}`] : this.NETWORKS[this.getNetworkType()].coin.code;
    },

    getTradepair : function() {
      if ($window.localStorage['tradepair']) {
        return JSON.parse($window.localStorage['tradepair']);
      } else {
        return {
          base_code   : this.getCurrentNetwork().coin.code,
          base_issuer : '',
          counter_code   : 'USDT',
          counter_issuer : 'rnzcChVKabxh3JLvh7qGanzqTCDW6fUSDT'
        }
      }
    },
    setTradepair : function(base_code, base_issuer, counter_code, counter_issuer) {
      var trade_pair = {
        base_code   : base_code,
        base_issuer : base_issuer,
        counter_code   : counter_code,
        counter_issuer : counter_issuer
      }
      $window.localStorage['tradepair'] = JSON.stringify(trade_pair);
    },

    getBridgeService : function() {
      return $window.localStorage['bridge_service'] || 'xagfans.com';
    },
    setBridgeService : function(gateway_name) {
      $window.localStorage['bridge_service'] = gateway_name;
    }
  };
});
