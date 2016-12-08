(function(){
  'use strict';
  
  var module = angular.module('slServices', [])
  
    .config(function($localStorageProvider) {
      $localStorageProvider.setKeyPrefix('streamline/');
    });

  // global application instance
  module.service('gApp', ['$timeout', '$localStorage', function($timeout, $localStorage) {
    this.server = {
      baseURL: "http://webservices.sca-appraisal.com/api/"
    };

    this.busyState = false;

    this.persist = $localStorage.$default({
      inProgress: false,
      claimList: []
    });

    this.photo = {
      list: [],
      file: [],
      index: 0,
      edit: false,
      extra: []
    };

    this.video = null;

    this.uniqueId = parseInt(Date.now());
    this.screen = null;
    this.stack = null;
    this.claimInfoSource = null;
    this.claimStatusSource = null;

    // function : setUniqueID
    this.setUniqueID = function(seed) {
      var uid = (typeof device === "object") ? device.uuid : ("browser" + parseInt(Date.now()));
      this.uniqueId = uid;

      return this;
    };

    // function : setBusy
    this.setBusy = function(state, now) {
      if (state == this.busyState)
        return;

      var me = this;

      if (state) {
        this.busyState = true;

        $timeout(function() {
          if (me.busyState === true)
            app.slBusy.show();
        }, 100);
      }
      else {
        this.busyState = false;

        if (!now) {
          $timeout(function() {
            app.slBusy.hide();
          }, 500);
        }
        else {
          app.slBusy.hide();
        }
      }
    };

    this.getBaseURL = function(query) {
      return (this.server.baseURL + query);
    };

    this.postFail = function(yescb, nocb) {
      ons.notification.confirm({
        message: 'Unable to contact the server. Would you like to try again?',
        title: 'Error',
        buttonLabels: ['Yes', 'No'],
        primaryButtonIndex: 1,
        callback: function(index) {
          // -1: Cancel
          // 0-: Button index from the left
          if (index === 0) { // yes
            if (angular.isFunction(yescb)) yescb();
          }
          else if (index == 1) {
            if (angular.isFunction(nocb)) nocb();
          }
        }
      });
    };

    this.showConfirmDialog = function(title, text, cbfunc) {
      var opts = {
        message: text,
        title: title,
        buttonLabel: 'Ok'
      };

      if (cbfunc) {
        opts.callback = cbfunc;
      }

      ons.notification.alert(opts);
    };

    this.saveClaimInfo = function(data) {
      var p = this.persist.claimList,
        newdata = angular.copy(data);

      for (var i = 0; i < p.length; i++) {
        if (p[i].FileNumber == data.FileNumber) {
          p[i] = newdata;
          return;
        }
      }

      p.push(newdata);
    };

    this.clearLocalData = function() {
      $localStorage.$reset({
        inProgress: false,
        claimList: []
      });
    };

    // initialize
    this.setUniqueID();

  }]);


  // function - slPost
  module.factory('slPost', ['$http', 'gApp', function($http, gApp) {
    return function(url, data, callback, context, timeout) {

      if (!timeout) {
        timeout = 15 * 1000;
      }

      gApp.setBusy(true);

      var handler = function(d, e) {
        gApp.setBusy(false, true);

        if (callback) {
          if (context) {
            callback.call(context, d, 0);
          }
          else {
            callback(d, e);
          }
        }
      };

      $http.post(url, data, {timeout: timeout}).
        success(function(data, status, headers, config, statusText) {
          handler(data, 0);
        }).
        error(function(data, status, headers, config, statusText) {
          handler(status, true);
        });
    };
  }]);

  // Utils
  module.factory('Utils', function($q) {
    return {
      isImage: function(src) {
        var deferred = $q.defer();

        var image = new Image();
        image.onerror = function() {
          deferred.resolve(false);
        };
        image.onload = function() {
          deferred.resolve(true);
        };
        image.src = src;

        return deferred.promise;
      },

      printLocDateOnImage: function(imgDataURL) {
        var deferred = $q.defer(),
            image = new Image();

        image.onload = function() {
          var canvas = $('#PhotoEdit')[0];
          canvas.width = image.width;
          canvas.height = image.height;

          var ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0);


          var timestamp = (new Date()).toLocaleString();
          var measurewidth = ctx.measureText(timestamp).width;
          var xleft = canvas.width - measurewidth - 25;

          ctx.font = "15px";
          ctx.fillStyle = "#000";
          ctx.fillRect(xleft, canvas.height - 50, measurewidth + 50, 50);
          ctx.fillStyle = "#FFF";
          ctx.fillText(timestamp, xleft + 10, canvas.height - 10);

          navigator.geolocation.getCurrentPosition(function success(pos) {
            var locstr = pos.coords.latitude.toFixed(5) + "  ,  " + pos.coords.longitude.toFixed(5);
            ctx.fillText(locstr, xleft + 10, canvas.height - 30);
            deferred.resolve(canvas.toDataURL());
          }, function error() {
            deferred.resolve(canvas.toDataURL());
          }, {
            maximumAge: 3000, timeout: 5000
          });

        };

        image.src = imgDataURL;

        return deferred.promise;
      }
    };
  });

})();
