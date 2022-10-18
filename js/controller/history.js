/* global myApp */

myApp.controller("HistoryCtrl", [ '$scope', '$rootScope', 'XrpApi', 'AuthenticationFactory',
  function($scope, $rootScope, XrpApi, AuthenticationFactory) {
    const address = $rootScope.address;
    $scope.loading = false;
    $scope.marker = null;

    $scope.load_more = function() {
      if ($scope.loading) { return; }
      $scope.loading = true;
      XrpApi.checkTx($scope.marker).then(data => {
        $scope.loading = false;
        $scope.error_msg = "";
        $scope.marker = data.id;
        data.transactions.forEach(tx => {
          $scope.history.push(processTx(tx));
        });
        console.debug(data);
        $scope.$apply();
      }).catch(err => {
        $scope.loading = false;
        $scope.error_msg = err.message;
        $scope.$apply();
      });
    };

    $scope.refresh = function() {
      $scope.history = [];
      $scope.marker = null;
      $scope.load_more();
    };
    $scope.refresh();

    function processTx(tx) {
      var t = {};
      if (tx.type == 'payment') {
        t.source = tx.specification.source.address;
        t.destination = tx.specification.destination.address;
        t.tag = tx.specification.destination.tag;
        if (address == t.source && address == t.destination) {
          t.type = 'convert';
        } else if (address == t.source) {
          t.type = 'sent';
        } else if (address == t.destination) {
          t.type = 'received';
        }
        if (tx.outcome.result != "tesSUCCESS") {
          t.type = "fail"
        }
        t.delivered = tx.outcome.deliveredAmount;
        t.spent = tx.specification.source.maxAmount
      }
      if (tx.type == 'trustline') {
        if (address == tx.specification.counterparty) {
          t.counterparty = tx.address;
          t.type = 'trusted';
        } else {
          t.counterparty = tx.specification.counterparty;
          t.type = 'trusting';
        }
        t.currency = tx.specification.currency;
        t.limit = tx.specification.limit;
      }
      if (tx.type == 'order' && address == tx.address) {
        t.type = tx.specification.direction;
        t.quantity = tx.specification.quantity;
        t.total = tx.specification.totalPrice;
        t.price = new BigNumber(t.total.value).dividedBy(t.quantity.value).toString();
      }
      if (tx.type == 'orderCancellation') {
        t.type = 'cancel';
        t.seq = tx.specification.orderSequence;
      }

      t.memos = tx.specification.memos || [];
      let msgObj = t.memos.find(memo => {
        return memo.type == "msg";
      })
      t.msg = msgObj ? msgObj.data : "";
      msgObj = t.memos.find(memo => {
        return memo.type == "address";
      })
      t.address = msgObj ? msgObj.data : "";

      t.date = tx.outcome.timestamp;
      tx.transaction = t;
      tx.effects = filterOrderbookChanges(tx.outcome.orderbookChanges, address, tx);

      return tx;
    }

    function filterOrderbookChanges(orderbookChanges, address, tx) {
      var effects = []
      //The status of the order. One of "created", "filled", "partially-filled", "cancelled".
      for (let account in orderbookChanges) {
        let orders = orderbookChanges[account];
        orders.forEach(order => {
          let e = {};
          if (account == address) {
            switch (order.status) {
              case "cancelled":
                e.type = 'offer_cancel_' + order.direction;
                e.force = address != tx.address;
                break;
              case "filled":
                e.filled = true;
              case "partially-filled":
                e.type = order.direction == 'buy' ? 'offer_bought' : 'offer_sold';
                break;
              case "created":
                e.type = 'offer_create_' + order.direction;
                break;
              default:
                console.error("Unsupported " + order.status, tx);
            }
          } else {
            switch (order.status) {
              case "filled":
              case "partially-filled":
                if (address == tx.address) {
                  e.type = order.direction == 'sell' ? 'offer_bought' : 'offer_sold';
                }
                break;
              case "cancelled":
              case "created":
                break;
              default:
                console.error("Unsupported " + order.status, tx);
            }
          }
          e.quantity = order.quantity;
          e.total = order.totalPrice;
          e.price = new BigNumber(e.total.value).dividedBy(e.quantity.value).toString();
          if (e.type) {
            effects.push(e);
          }
        });
      }
      return effects;
    }

  } ]);

