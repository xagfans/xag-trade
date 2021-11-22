/* global myApp, nw */

myApp.controller('RegisterCtrl', ['$scope', '$rootScope', '$translate', '$window', '$location', 'FileDialog', 'AuthenticationFactory', 'Id',
  function($scope, $rootScope, $translate, $window, $location, FileDialog, AuthenticationFactory, Id) {
    $scope.password = '';
    $scope.passwordSet = {};
    $scope.password1 = '';
    $scope.password2 = '';
    $scope.key = '';
    $scope.mode = 'register_new_account';
    $scope.submitLoading = false;

    $scope.changeMode = function(mode) {
      $scope.mode = mode;
    };
    $scope.showPass = function(flag) {
      $scope.showPassword = flag;
    };
    $scope.showSec = function(flag) {
      $scope.showSecret = flag;
    };

    $scope.reset = function() {
      $scope.password = '';
      $scope.password1 = '';
      $scope.password2 = '';
      $scope.masterkey = '';
      $scope.words = '';
      $scope.key = '';
      $scope.mode = 'register_new_account';
      $scope.submitLoading = false;

      if ($scope.registerForm) $scope.registerForm.$setPristine(true);
    };

    $scope.fileInputClick = function() {
      const txtfilename = Id.generateFilename();
      $scope.walletfile = txtfilename;
      $scope.mode = 'register_empty_wallet';
      $scope.save_error = '';
    };

    $scope.submitForm = function() {
      if (!$scope.masterkey) {
        $scope.mnemonic = $scope.mnemonic || Id.generateMnemonic();
        const keypair = Id.generateAccount($scope.mnemonic);
        $scope.masterkey = keypair.secret;
      }

      const options = {
        address: Id.fromSecret($scope.masterkey).address,  
        secrets: [$scope.masterkey],
        mnemonic: $scope.mnemonic,
        password: $scope.password1,
        path: $scope.walletfile
      };
      AuthenticationFactory.create(AuthenticationFactory.TYPE.FILESYSTEM, options, (err, authdata) => {
        if (err) {
          console.error('Registration failed!', err);
          $scope.save_error = err.message;
          $scope.$apply();
          return;
        }

        $scope.password = new Array($scope.password1.length+1).join("*");
        $scope.key = `${new Array(56).join("*")}`;
        $scope.mode = 'welcome';
        $scope.lang = $translate.use();
        if (['cn', 'jp'].indexOf($scope.lang) >= 0) {
          $scope.mnemonic_lang = Id.getMnemonicLang($scope.mnemonic, $scope.lang);
        }
        $scope.$apply();

        console.log(authdata);
        const blob = new Blob([authdata.blob], {type : 'text/plain'});
        if (navigator.msSaveBlob) {
          navigator.msSaveBlob(blob, authdata._path);
        } else {
          var e = document.createEvent('MouseEvents'),
          a = document.createElement('a');
          a.download = authdata._path;
          a.href = URL.createObjectURL(blob);
          a.dataset.downloadurl = ['text/plain', a.download, a.href].join(':');
          e.initEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
          a.dispatchEvent(e);
          URL.revokeObjectURL(a.href); // clean the url.createObjectURL resource
        }

      });
    };

    $scope.submitSecretKeyForm = function(){
      $scope.masterkey = $scope.secretKey;
      $scope.fileInputClick();
    };
    
    $scope.submitWordsForm = function(){
      $scope.mnemonic = Id.getMnemonicInEnglish($scope.words);
      $scope.masterkey = Id.generateAccount($scope.mnemonic).secret;
      $scope.fileInputClick();
    };
    
    $scope.gotoFund = function() {
      $scope.mode = 'register_empty_wallet';
      $scope.reset();

      $location.path('/');
    };
  }
]);
