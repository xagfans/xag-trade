/* global _, myApp, round, RippleAPI */

myApp.factory('XrpApi', ['$rootScope', 'AuthenticationFactory', 'ServerManager', 'XrpPath', 'XrpOrderbook',
  function($rootScope, AuthenticationFactory, SM, XrpPath, XrpOrderbook) {

    let _ownerCount = 0;
    let _xrpBalance = "";
    let _sequence = 0;
    
    let _balances = {}; // all balances include xrp
    let _trustlines = {}; // no xrp line
    let _history = [];
    let _myHandleAccountEvent = undefined;
    let _remote;
    let _client = ""; // foxlet version
    
    function key(code, issuer) {
      return code == 'XRP' ? code : code + '.' + issuer;
    };
    
    function toTimestamp(rpepoch) {
      return (rpepoch + 0x386D4380) * 1000;
    };
    
    function convertAmount(amount) {
      if ("object" === typeof amount) {
        amount.value = new BigNumber(new BigNumber(amount.value).toPrecision(16)).toString();
        return amount;
      } else {
        return new BigNumber(new BigNumber(amount).toPrecision(16)).toString()
      }
    };

    return {
      set remote(remote) {
        _remote = remote;
        XrpPath.remote = remote;
        XrpOrderbook.remote = remote;
        
        if (this.address) {
          this.queryAccount();
          this.listenStream();
        }
      },
      
      set client(info) {
        _client = info;
      },
      
      connect() {
        if (!_remote) throw new Error("NotConnectedError");
        return _remote.isConnected() ? Promise.resolve() : _remote.connect();
      },
      
      init() {
        if (this.address && _remote) {
          this.queryAccount();
          this.listenStream();
        }
      },
      
      logout() {
        _ownerCount = 0;
        _xrpBalance = "";
        _sequence = 0;
        _balances = {}; // all balances include xrp
        _trustlines = {}; // no xrp line
        _history = [];
        this._closeStream();
      },
      
      get address() {
        return AuthenticationFactory.address;
      },
      
      // used by auth factory only
      sign(txtJson, secret, maxFee) {
        if (maxFee) {
          return new RippleAPI({maxFeeXRP: maxFee}).sign(txtJson, secret);
        } else {
          return _remote.sign(txtJson, secret);
        }
      },
      
      verifyTx(hash, minLedger, maxLedger) {
        const options = {
          minLedgerVersion: minLedger,
          maxLedgerVersion: maxLedger
        };
        _remote.getTransaction(hash, options).then(data => {
          if (data.outcome.result === 'tesSUCCESS') {
            $rootScope.$broadcast('txSuccess', { hash: hash, options: options});
          } else {
            console.error(data);
            $rootScope.$broadcast('txFail', { hash: hash});
          }
        }).catch(err => {
          console.warn('verify fail', err);
          /* If transaction not in latest validated ledger, try again until max ledger hit */
          if (err instanceof _remote.errors.PendingLedgerVersionError) {
             setTimeout(() => this.verifyTx(hash, minLedger, maxLedger), 1000);
          } else {
            console.error("Transaction may have failed.");
          }
        });
      },
      
      checkFunded(address) {
        return new Promise(async (resolve, reject)=>{
          await this.connect();
          _remote.getAccountInfo(address || this.address).then(() => {
              resolve(true);
          }).catch(e => {
              if (e.data.error === 'actNotFound') {
                resolve(false);
              } else {
                reject(e);
              }
          });
        });
      },
      
      checkInfo(address) {
        return new Promise(async (resolve, reject)=>{
          try {
            await this.connect();
            let info = await _remote.getAccountInfo(address || this.address);
            resolve(info);
          } catch(e){
            if (e.data && e.data.error === 'actNotFound') {
              e.unfunded = true;
            }
            reject(e);
          };
        });
      },
      
      checkObjects(address) {
        return new Promise(async (resolve, reject)=>{
          try {
            await this.connect();
            let info = await _remote.getAccountObjects(address || this.address);
            resolve(info);
          } catch(e){
            if (e.data && e.data.error === 'actNotFound') {
              e.unfunded = true;
            }
            reject(e);
          };
        });
      },
      
      checkSettings(address) {
        return new Promise(async (resolve, reject)=>{
          try {
            await this.connect();
            let data = await _remote.getSettings(address || this.address);
            resolve(data);
          } catch(e){
            if (e.data && e.data.error === 'actNotFound') {
              e.unfunded = true;
            }
            reject(e);
          };
        });
      },
      
      checkCurrencies(address) {
        return new Promise(async (resolve, reject)=>{
          try {
            await this.connect();
            let data = await _remote.request('account_currencies', {account: address || this.address});
            resolve(data);
          } catch(e){
            if (e.data && e.data.error === 'actNotFound') {
              e.unfunded = true;
            }
            reject(e);
          };
        });
      },
      
      checkBalances(address) {
        return new Promise(async (resolve, reject)=>{
          try {
            await this.connect();
            let bal = await _remote.getBalances(address || this.address);
            resolve(bal);
          } catch(e) {
            console.error('getBalance', e);
            reject(e);
          }
        });
      },
      
      checkTrustlines(address) {
        return new Promise(async (resolve, reject)=>{
          await this.connect();
          _remote.getTrustlines(address || this.address).then((ret) => {
            let lines = {};
            ret.forEach((item)=>{
              var keystr = key(item.specification.currency, item.specification.counterparty);
              lines[keystr] = item.specification; //{limit: "100000000", currency: "USD", counterparty: "rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y", ripplingDisabled: true}
              lines[keystr].balance = item.state.balance;
            });
            _trustlines = lines;
            console.log('lines:', ret);
            resolve(lines);
          }).catch(e => {
            console.error('getTrustlines', e);
            reject(e);
          });
        });
      },
      
      checkOffers(address) {
        address = address || this.address;
        return new Promise(async (resolve, reject)=>{
          try {
            await this.connect();
            let page = await _remote.getOrders(address, {limit: 200});
            resolve(page);
          } catch (err) {
            reject(err);
          }
        });
      },
      
      checkTx(last_id, address) {
        var address = address || this.address;
        var opt = {
            minLedgerVersion: SM.minLedgerVersion,
            limit: 25
        };
        if (last_id) {
          console.log("start", last_id);
          opt.start = last_id;
          delete opt.minLedgerVersion;
        }
        return new Promise(async (resolve, reject)=>{
          try {
            await this.connect();
            let data = await _remote.getTransactions(address, opt);
            let last_id = null;
            if (data.length) {
              last_id = data[data.length-1].id;
            }
            console.log(data);
            resolve({id: last_id, transactions: data});
          } catch (err) {
            if (err.message == "Server is missing ledger history in the specified range") {
              console.warn(err.message);
              resolve({id: null, transactions: []});
            } else {
              console.error('getTx', err, err.message);
              reject(err);
            }
          }
        });
      },
      
      changeSettings(settings) {
        return new Promise(async (resolve, reject)=> {
          try {
            let prepared = await _remote.prepareSettings(this.address, settings);
            const {signedTransaction} = AuthenticationFactory.sign(this, prepared.txJSON);
            let result = await _remote.submit(signedTransaction, true);
            if ("tesSUCCESS" !== result.engine_result) {
              console.warn(result);
              return reject(new Error(result.engine_result_message || result.engine_result));
            }
            resolve(result);
          } catch (err) {
            console.info('changeSettings', err.data || err);
            reject(err);
          }
        });
      },
      
      changeTrust(code, issuer, limit, ripplingDisabled = true) {
        const trustline = {
          currency: code,
          counterparty: issuer,
          limit: limit,
          ripplingDisabled: ripplingDisabled
        };
        trustline.memos = [{data: _client, type: 'client', format: 'text'}];
        return new Promise(async (resolve, reject)=> {
          try {
            let ledger = await _remote.getLedger();
            let prepared = await _remote.prepareTrustline(this.address, trustline);
            const {signedTransaction, id} = AuthenticationFactory.sign(this, prepared.txJSON);
            let result = await _remote.submit(signedTransaction, true);
            this.verifyTx(id, ledger.ledgerVersion, prepared.instructions.maxLedgerVersion);
            if ("tesSUCCESS" !== result.engine_result && "terQUEUED" !== result.engine_result) {
              console.warn(result);
              return reject(new Error(result.engine_result_message || result.engine_result));
            }
            resolve(id);
          } catch (err) {
            console.info('changeTrust', err);
            reject(err);
          }
        });
      },
      
      payment(destinationAddress, srcAmount, destAmount, tag, invoice, memos) {
        const payment = {
            "source": {
              "address": this.address,
              "maxAmount": convertAmount(srcAmount)
            },
            "destination": {
              "address": destinationAddress,
              "amount": convertAmount(destAmount)
            }
        }
        if (tag) payment.destination.tag = Number(tag);
        if (invoice) payment.invoiceID = invoice;
        payment.memos = [{data: _client, type: 'client', format: 'text'}].concat(memos || []);
        return new Promise(async (resolve, reject)=>{
          try {
            let ledger = await _remote.getLedger();
            let prepared = await _remote.preparePayment(this.address, payment);
            const {signedTransaction, id} = AuthenticationFactory.sign(this, prepared.txJSON);
            let result = await _remote.submit(signedTransaction, true);
            this.verifyTx(id, ledger.ledgerVersion, prepared.instructions.maxLedgerVersion);
            if ("tesSUCCESS" !== result.engine_result && "terQUEUED" !== result.engine_result) {
              console.warn(result);
              return reject(new Error(result.engine_result_message || result.engine_result));
            }
            resolve(id);
          } catch (err) {
            if (err.data) {
              console.error(err.data);
              return reject(new Error(err.data.engine_result_message || err.data.engine_result || err.data.error_exception || 'UNKNOWN'));
            } 
            console.error('payment', payment, err);
            reject(err);
          }
        });
      },
      
      pathPayment(destinationAddress, srcAmount, destAmount, paths, tag, invoice, memos, partial) {
        //remove the type, type_hex to pass checkTxSerialization in sign function
        paths.forEach(path => {
          path.forEach(asset => {
            delete asset.type;
            delete asset.type_hex;
          });
        });
        const payment = {
            "source": {
              "address": this.address,
              "maxAmount": convertAmount(srcAmount)
            },
            "destination": {
              "address": destinationAddress,
              "amount": convertAmount(destAmount)
            },
            //"paths" : JSON.stringify(paths),
            "allowPartialPayment": !!partial
        }
        if (paths.length) payment.paths = JSON.stringify(paths);
        if (tag) payment.destination.tag = Number(tag);
        if (invoice) payment.invoiceID = invoice;
        payment.memos = [{data: _client, type: 'client', format: 'text'}].concat(memos || []);
        return new Promise(async (resolve, reject)=>{
          try {
            let ledger = await _remote.getLedger();
            let prepared = await _remote.preparePayment(this.address, payment);
            const {signedTransaction, id} = AuthenticationFactory.sign(this, prepared.txJSON);
            let result = await _remote.submit(signedTransaction, true);
            this.verifyTx(id, ledger.ledgerVersion, prepared.instructions.maxLedgerVersion);
            if ("tesSUCCESS" !== result.engine_result && "terQUEUED" !== result.engine_result) {
              console.warn(result);
              return reject(new Error(result.engine_result_message || result.engine_result));
            }
            resolve(id);
          } catch (err) {
            if (err.data) {
              console.error(err.data);
              return reject(new Error(err.data.engine_result_message || err.data.engine_result || err.data.error_exception || 'UNKNOWN'));
            } 
            console.error('pathPayment', payment, err);
            reject(err);
          }
        });
      },
      
      convert(srcAmount, destAmount, paths) {
        return this.pathPayment(this.address, srcAmount, destAmount, paths, null, null, null, true);
      },
      
      offer(options) {
        let totalPriceValue = new BigNumber(options.amount).multipliedBy(options.price).toString();
        const order = {
          'direction': options.type,
          'quantity'  : {value: convertAmount(options.amount)},
          'totalPrice': {value: convertAmount(totalPriceValue)}
        };
        if (options.base_issuer) {
          order.quantity.currency = options.base;
          order.quantity.counterparty = options.base_issuer;
        } else {
          order.quantity.currency = 'XRP';
          order.quantity.value = round(order.quantity.value, 6).toString();
        }
        if (options.counter_issuer) {
          order.totalPrice.currency = options.counter;
          order.totalPrice.counterparty = options.counter_issuer;
        } else {
          order.totalPrice.currency = 'XRP';
          order.totalPrice.value = round(order.totalPrice.value, 6).toString();
        }
        order.memos = [{data: _client, type: 'client', format: 'text'}];
        return new Promise(async (resolve, reject) => {
          try {
            let ledger = await _remote.getLedger();
            let prepared = await _remote.prepareOrder(this.address, order);
            const {signedTransaction, id} = AuthenticationFactory.sign(this, prepared.txJSON);
            let result = await _remote.submit(signedTransaction, true);
            this.verifyTx(id, ledger.ledgerVersion, prepared.instructions.maxLedgerVersion);
            if ("tesSUCCESS" !== result.engine_result && "terQUEUED" !== result.engine_result) {
              console.warn(result);
              return reject(new Error(result.engine_result_message || result.engine_result));
            }
            resolve(id);
          } catch (err) {
            console.error('offer', err);
            reject(err);
          }
        });
      },
      
      cancelOffer (offer_id) {
        const orderCancellation = {orderSequence: offer_id};
        orderCancellation.memos = [{data: _client, type: 'client', format: 'text'}];
        return new Promise(async (resolve, reject) => {
          try {
            let ledger = await _remote.getLedger();
            let prepared = await _remote.prepareOrderCancellation(this.address, orderCancellation);
            const {signedTransaction, id} = AuthenticationFactory.sign(this, prepared.txJSON);
            let result = await _remote.submit(signedTransaction, true);
            this.verifyTx(id, ledger.ledgerVersion, prepared.instructions.maxLedgerVersion);
            if ("tesSUCCESS" !== result.engine_result && "terQUEUED" !== result.engine_result) {
              console.warn(result);
              return reject(new Error(result.engine_result_message || result.engine_result || error.error_exception || 'UNKNOWN'));
            }
            resolve(id);
          } catch (err) {
            console.error('cancelOffer', err);
            reject(err);
          }
        });
      },
      
      deleteAccount(dest_account) {
        const localInstructions = { maxFee: '5.0'};
        return new Promise(async (resolve, reject) => {
          try {
            let prepared = await _remote.prepareTransaction({
              TransactionType: 'AccountDelete',
              Account: this.address,
              Destination: dest_account
            }, localInstructions);
            console.log(prepared);
            var obj = JSON.parse(prepared.txJSON);
            obj.Fee = "5000000";
            const {signedTransaction} = AuthenticationFactory.sign(this, JSON.stringify(obj), "5");
            let result = await _remote.submit(signedTransaction, true);
            if ("tesSUCCESS" !== result.engine_result) {
              console.warn(result);
              return reject(new Error(result.engine_result_message || result.engine_result));
            }
            resolve(result);
          } catch (err) {
            console.error('deleteAccount', err);
            reject(err);
          }
        });
      },
      
      queryAccount(callback) {
        this.checkInfo().then(info => {
          _xrpBalance = info.xrpBalance;
          _ownerCount = info.ownerCount;
          _sequence = info.sequence;
          return this.checkTrustlines();
        }).then(lines => {
          this._updateRootInfo();
          if (callback) { callback(); }
        }).catch(err => {
          if (err.data && err.data.error === 'actNotFound') {
            $rootScope.unfunded = true;
            $rootScope.$apply();
          }
          if (callback) { callback(err); }
        });
      },
      
      _updateRootInfo() {
        $rootScope.balance = _xrpBalance;
        $rootScope.reserve = SM.reserveBaseXRP + SM.reserveIncrementXRP * _ownerCount;
        
        var lines = {};
        for(var keystr in _trustlines) {
          var line = _trustlines[keystr];
          if (line.balance == "0" && line.limit == "0") {
            continue;
          }
          if (!lines[line.currency]) {
            lines[line.currency] = {};
          }
          lines[line.currency][line.counterparty] = {
              code    : line.currency,
              issuer  : line.counterparty,
              balance : line.balance,
              limit   : line.limit,
              ripplingDisabled: line.ripplingDisabled
          };
        }
        $rootScope.lines = lines;
        $rootScope.$broadcast("balanceUpdate");
        $rootScope.$apply();
      },
      
      listenStream() {
        this._closeStream();
        console.log('subscribe', this.address);
        var self = this;
        _myHandleAccountEvent = function(e) {
          self._handleAccountEvent(e)
        }
        _remote.connection.on('transaction', _myHandleAccountEvent);
        _remote.request('subscribe', {
          accounts: [ this.address ]
        }).then(response => {
          console.log('subscribe done', response);
        }).catch(error => {
          console.log('subscribe', error);
        });
      },

      _closeStream() {
        if(_myHandleAccountEvent) {
          console.log('unsubscribe', this.address);
          _remote.connection.removeListener('transaction', _myHandleAccountEvent);
          _myHandleAccountEvent = undefined;
          _remote.request('unsubscribe', {
            accounts: [ this.address ]
          }).then(response => {
            console.log('unsubscribe done', response);
          }).catch(function(error) {
            console.log('unsubscribe', error);
          });
        }
      },
      
      _handleAccountEvent(event) {
        console.log('event', event);
        $rootScope.$broadcast("accountEvent");
        this.queryAccount();
      }

    };
  } ]);
