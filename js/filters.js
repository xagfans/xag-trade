/* global myApp */

myApp.filter('shortaddress', function() {
  return function(address) {
    if (!address || address.length < 8) {
      return address;
    }
    var start = address.substring(0, 8);
    var end = address.substring(address.length - 8);
    return start + '...' + end;
  }
});

myApp.filter('fmtnum', function($filter) {
  return function(input) {
    var num = parseFloat(input);
    if (num >= 1000) {
      return $filter('number')(input, 0);
    } else if (num >= 100) {
      return round(num, 2).toString();
    } else if (num >= 10) {
      return round(num, 3).toString();
    } else if (num >= 1) {
      return round(num, 4).toString();
    } else {
      return parseFloat(num.toPrecision(5)).toString();
    }
  }
});

myApp.filter('rpcurrency', function($filter) {
  return function(input, nativecode) {
    nativecode = nativecode || 'XRP';
    return input == 'XRP' ? nativecode : input;
  }
});