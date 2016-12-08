(function(){
  'use strict';

  var module = angular.module('app', ['onsen', 'ngStorage', 'slDirectives', 'slServices', 'ui.select', 'ngSanitize']);

  module.config(function($compileProvider) {
    $compileProvider.debugInfoEnabled(false);
  });

  module.controller('mainCtrl', ['$rootScope', '$scope', 'gApp', '$timeout', function($rootScope, $scope, gApp, $timeout) {
    $scope.gotoReview = function() {
      if (gApp.persist.claimList.length === 0) {
        ons.notification.alert({
          title: "No Claims Found",
          message: "If you received a request for photos, please choose 'Start a claim'. Once you have sent in photos for a claim, it will appear in this list."});
      }
      else {
        app.navi.pushPage('recentclaimlist.html');
      }
    };

    // network status
    document.addEventListener("online", function() {
      $rootScope.netStatus = (navigator.connection.type !== Connection.NONE);
      $rootScope.$apply();
    }, false);

    document.addEventListener("offline", function() {
      $rootScope.netStatus = false;
      $rootScope.$apply();
    }, false);


    $rootScope.isLandscape = false;

    // orientation change
    ons.orientation.on('change', function(event) {
      $timeout(function() {
        $rootScope.isLandscape = ! event.isPortrait;        
      });
    });

  }]);


  module.controller('helpCtrl', ['$scope', function($scope) {
    $scope.openHelp = function() {
      window.open('http://www.scaclaims.com', '_blank', 'location=no');
    };
  }]);


  module.controller('newclaimCtrl', ['$scope', 'gApp', 'slPost', function($scope, gApp, slPost) {
    //TODO: remove the below 2 lines of code in production mode
    // $scope.filenum = '49';
    // $scope.vin = '9113';

    $scope.sendPost = function() {
      var o = {
        FileNumber: $scope.filenum,
        VIN: $scope.vin
      };

      gApp.setUniqueID($scope.filenum + '-');

      slPost(gApp.getBaseURL("ClaimVerification"), o, response);
    };


    function response (data, error) {
      if (error) {
        ons.notification.alert({
          title: "File Not Found",
          message: "Please Check and Try again."
        });
      }
      else {
        gApp.claimInfoSource = data;
        gApp.saveClaimInfo(data);
        app.navi.pushPage('claimdetail.html');
      }
    }

  }]);


  module.controller('claimdetailCtrl', ['$scope', 'gApp', 'slPost', function($scope, gApp, slPost) {
    $scope.data = gApp.claimInfoSource;

    $scope.sendPost = function() {
      var o = {
        FileNumber: parseInt(gApp.claimInfoSource.FileNumber)
      };

      slPost(gApp.getBaseURL("StartClaim"), o, response);
    };

    function response(data, error) {
      if (error) {
        gApp.postFail($scope.sendPost,
          function(){
            app.navi.popPage();
          });
      }
      else {
        gApp.photo.list = [];
        gApp.photo.file = [];
        gApp.photo.desc = [];
        gApp.photo.index = 0;
        gApp.photo.edit = false;
        gApp.photo.listhash = {};
        gApp.photo.guideImage = [];
        gApp.photo.extra = [];
        gApp.video = null;

        var len = data.length;
        for (var i = 0; i < len; i++) {
          gApp.photo.list.push(data[i].DocumentType);
          gApp.photo.file.push('');
          gApp.photo.desc.push(data[i].Description);
        }

        app.navi.pushPage('photo.html');
      }
    }

  }]);

  
  module.controller('photoCtrl', ['$rootScope', '$scope', '$timeout', 'gApp', 'Utils', function($rootScope, $scope, $timeout, gApp, Utils) {
    // check network status
    $rootScope.netStatus = navigator.connection && (navigator.connection.type !== Connection.NONE);

    $scope.mode = 'photo'; // | 'extra' | 'video'
    $scope.videofile = {fullPath: ''};

    // setup image and what happens after they take the pic
    function activate() {
      var index = gApp.photo.index;

      $scope.label = gApp.photo.list[index];
      $scope.desc = gApp.photo.desc[index];
      $scope.imageurl = ' ';

      if (! gApp.photo.edit) {
        var typecrush = $scope.label.replace(/\s/g, "");
        if (gApp.photo.listhash.hasOwnProperty(typecrush)) {
          gApp.photo.listhash[typecrush]++;
        }
        else {
          gApp.photo.listhash[typecrush] = 1;
        }

        var imageurl,
          n = gApp.photo.listhash[typecrush];
        if (n > 1) {
          imageurl = "img/example/" + $scope.label + " " + n + ".jpg";
        }
        else {
          imageurl = "img/example/" + $scope.label + ".jpg";
        }


        Utils.isImage(imageurl).then(function (result) {
          gApp.photo.guideImage[index] = $scope.imageurl = (result ? imageurl : '');
        });
      }
      else {
        $scope.imageurl = gApp.photo.guideImage[index];
      }
    }

    function onSuccess(image) {
      var idx = gApp.photo.index;

      Utils.printLocDateOnImage("data:image/jpeg;base64," + image).then(function(image2) {
        if ($scope.mode === 'photo') {
          gApp.photo.file[idx] = image2;
          nextPhoto();          
        }
        else if ($scope.mode === 'extra') {
          gApp.photo.extra.push(image2);
        }

      });
    }

    function onFail(message) {
      console.log('Failed because: ' + message);
    }

    $scope.takePhoto = function() {
      navigator.camera.getPicture(onSuccess, onFail, {
        quality: 50,
        sourceType : Camera.PictureSourceType.CAMERA,
        destinationType: Camera.DestinationType.DATA_URL,
        targetWidth: 1290,
        targetHeight: 960,
        allowEdit: false,
        encodingType: Camera.EncodingType.JPEG,
        correctOrientation: true,
        popoverOptions: new CameraPopoverOptions(300, 300, 100, 100, Camera.PopoverArrowDirection.ARROW_ANY)
      });
    };

    $scope.usePhoto = function() {
      navigator.camera.getPicture(onSuccess, onFail, {
        quality: 50,
        sourceType : Camera.PictureSourceType.PHOTOLIBRARY,
        destinationType: Camera.DestinationType.DATA_URL,
        targetWidth: 1290,
        targetHeight: 960,
        allowEdit: false,
        encodingType: Camera.EncodingType.JPEG,
        correctOrientation: true,
        popoverOptions: new CameraPopoverOptions(300, 300, 100, 100, Camera.PopoverArrowDirection.ARROW_ANY)
      });
    };
    
    $scope.takeVideo = function() {
      var videoOptions = {
        limit: 1,
        duration: 15,
        quality: 0
      };

      var prevVideoFile = $scope.videofile;
      $scope.videofile = {};

      // capture a video from camera
      navigator.device.capture.captureVideo( function(mediaFiles) {
        if (mediaFiles.length == 1) {
          $timeout(function() {
            $scope.videofile = mediaFiles[0];
            gApp.video = mediaFiles[0];
          });
        }
        else {
          $scope.videofile = prevVideoFile;
          gApp.video = prevVideoFile;
        }
      }, angular.noop, videoOptions);
    };

    function nextPhoto() {
      if (gApp.photo.edit) {
        app.navi.popPage();
        $rootScope.$broadcast('photoReplaced', gApp.photo.index);
      }
      else if ($scope.mode === 'photo') {
        if (gApp.photo.index >= gApp.photo.list.length - 1) {
          $scope.mode = 'extra';
          $scope.imageurl = 'img/example/Take Additional Photo.jpg';
        }
        else {
          gApp.photo.index ++;
          activate();
        }
      }
      else if ($scope.mode === 'extra') {
          $scope.mode = 'video';
      }
      else if ($scope.mode === 'video') {
        app.navi.pushPage('photolist.html');
      }
    }

    $scope.skip = function() {
      if (gApp.photo.edit) {
        app.navi.popPage();
      }
      else {
        nextPhoto();
      }
    };


    // calculate image height
    var scrHeight = (screen.height > screen.width) ? screen.width : screen.height;
    $scope.imageheight = scrHeight - 155;

    activate();

  }]);


  module.controller('photolistCtrl', ['$scope', '$timeout', 'gApp', 'Utils', 'slPost', function($scope, $timeout, gApp, Utils, slPost) {
    var photos = gApp.photo,
      len = photos.list.length;

    $scope.extra = gApp.photo.extra;
    
    $scope.data = [];
    for (var i = 0; i < len; i++) {
      $scope.data.push({
        label: photos.list[i],
        file: photos.file[i]
      });
    }

    $scope.$on('photoReplaced', function(event, index) {
      $timeout(function() {
        $scope.data[index] = {
          label: photos.list[index],
          file: photos.file[index]
        };
      });
    });


    $scope.replacePhoto = function(index) {
      gApp.photo.edit = true;
      gApp.photo.index = index;

      app.navi.pushPage('photo.html');
    };

    $scope.onAdditionalPhoto = function() {
      var options = {
        quality: 50,
        sourceType : Camera.PictureSourceType.CAMERA,
        destinationType: Camera.DestinationType.DATA_URL,
        targetWidth: 1290,
        targetHeight: 960,
        allowEdit: false,
        encodingType: Camera.EncodingType.JPEG,
        correctOrientation: true,
        popoverOptions: new CameraPopoverOptions(300, 300, 100, 100, Camera.PopoverArrowDirection.ARROW_ANY)
      };

      navigator.camera.getPicture(function(image) {
        Utils.printLocDateOnImage("data:image/jpeg;base64," + image).then(function(image2) {
          $timeout(function() {
            gApp.photo.extra.push(image2);
          });
        });
      },
      angular.noop, options);
    };

    // Inspection Report
    var o = {
      PersonID: '6c64d5f5-aa26-4827-963a-0b25035a6b6f',
      FileNumber: gApp.claimInfoSource.FileNumber,
      EntityID: '72A7741E-B372-4239-AFC2-B3F73881D2A4',
      Type: 1,
      AppraiserNote: "",
      InspectionLocation: "Owner",
      VehicleDrivable1: "Yes",
      PriorDamage1: "No",
      OwnerPresentInspection: "Yes"
    };

    // data array for select
    $scope.da = {
      location: [
        {label: 'Owner'},
        {label: 'Tow Yard'},
        {label: 'Shop'},
        {label: 'Other'}
      ]
    };

    $scope.type = 1;
    $scope.location = $scope.da.location[0];
    $scope.flag1 = true;
    $scope.flag2 = true;
    $scope.flag3 = false;
    $scope.note = '';

    $scope.onSelectType = function(idx) {
      $scope.type = o.Type = idx;
    };

    $scope.onSelectLocation = function($item, $model) {
      o.InspectionLocation = $item.label;
    };

    $scope.submit = function() {
      o.AppraiserNote = $scope.note;
      o.VehicleDrivable1 = ($scope.flag2 === true ? "Yes" : "No");
      o.PriorDamage1 = ($scope.flag3 === true ? "Yes" : "No");
      o.OwnerPresentInspection = ($scope.flag1 === true ? "Yes" : "No");


      slPost(gApp.getBaseURL("AppraiserReportSL"), o, function(data, error) {
        if (error) {
          gApp.postFail($scope.submit, angular.noop);
        }
        else if(data.Confirmation.trim() == "Recorded"){
          app.navi.pushPage('sendphotobatch.html');
        }
      });
    };

  }]);


  module.controller('sendphotobatchCtrl', ['$scope', 'gApp', 'slPost', '$timeout', function($scope, gApp, slPost, $timeout) {
    var filenum = parseInt(gApp.claimInfoSource.FileNumber),
        nextphoto = 0,
        total = 0,
        i = 0;

    // count the number of photos
    for (i = 0; i < gApp.photo.list.length; i++) {
      if (gApp.photo.file[i].trim() !== '')
        total = total + 1;
    }

    // count the number of additional photos
    for (i = 0; i < gApp.photo.extra.length; i++) {
      if (gApp.photo.extra[i].trim() !== '')
        total = total + 1;
    }

    $scope.total = total;
    $scope.counter = (total > 0) ? 0 : (-1);

    $scope.mode = 'photo';


    // To disable a navigator back button handler
    app.navi.getDeviceBackButtonHandler().disable();

    // start to send photos
    sendNext();

    function sendNext() {
      sendPost(nextphoto);
    }

    function sendPost(index) {
      if (gApp.photo.file[index] !== '') {
        var typecrush = gApp.photo.list[index].replace(/\s/g, "");
        var o = {
            FileName: filenum + "_" + typecrush + ".jpg",
            FileNumber: filenum,
            DocType: gApp.photo.list[index],
            "Image64String": gApp.photo.file[index],
            DeviceUniqueIdentifier: gApp.uniqueId
          };

        slPost(gApp.getBaseURL('UploadPhotoPublic'), o, response);
      }
      else {
        $timeout(function() {
          response(null, 0);
        }, 200);
      }
    }

    function response(data, error) {
      if (error) {
        gApp.postFail(angular.bind(null, sendPost, nextphoto),
          function(){
            app.navi.popPage();
        });
      }
      else if (nextphoto >= gApp.photo.list.length - 1) {
        if (gApp.photo.extra.length > 0) {
          nextphoto = 0;
          sendNext2();
        }
        else {
          if (gApp.video) {
            tryUploadVideo();
          }
          else {
            completeBatch();
          }
        }
      }
      else {
        if (data)
          $scope.counter = ($scope.counter + 1 < total) ? ($scope.counter + 1) : (total - 1);

        nextphoto ++;
        sendNext();
      }
    }

    // for Additional Photos
    function sendNext2() {
      sendPost2(nextphoto);
    }

    function sendPost2(index) {
      var typecrush = 'extra' + index;
      var o = {
        FileName: filenum + "_" + typecrush + ".jpg",
        FileNumber: filenum,
        DocType: '00000000-0000-0000-0000-000000000000',
        "Image64String": gApp.photo.extra[index],
        DeviceUniqueIdentifier: gApp.uniqueId
      };

      slPost(gApp.getBaseURL('UploadPhotoPublic'), o, response2);
    }

    function response2(data, error) {
      if (error) {
        gApp.postFail(angular.bind(null, sendPost2, nextphoto),
          function(){
            app.navi.popPage();
          });
      }
      else if (nextphoto >= gApp.photo.extra.length - 1) {
        if (gApp.video) {
          tryUploadVideo();
        }
        else {
          completeBatch();
        }
      }
      else {
        $scope.counter = ($scope.counter + 1 < total) ? ($scope.counter + 1) : (total - 1);

        nextphoto ++;
        sendNext2();
      }
    }

    function tryUploadVideo() {
      $scope.mode = 'video';

      var params = {
        FileName: filenum + '_video.mp4',
        FileNumber: filenum,
        DocType: '00000000-0000-0000-0000-000000000000',
        DeviceUniqueIdentifier: gApp.uniqueId
      };

      var ft = new FileTransfer(),
          opt = new FileUploadOptions();

      opt.fileName = params.FileName;
      opt.params = params;

      gApp.setBusy(true);
      ft.upload(gApp.video.fullPath, encodeURI(gApp.getBaseURL("UploadPhoto2")),
          function() {
            gApp.setBusy(false);
            completeBatch();
          },
          function() {
            gApp.setBusy(false);

            gApp.postFail(function() {
                  $timeout(function() {
                    tryUploadVideo();
                  });
                },
                function(){
                  completeBatch();
                });
          },
          opt
      );
    }

    function completeBatch() {
      // enable a navigator back button handler again
      app.navi.getDeviceBackButtonHandler().enable();

      // we're done
      ons.notification.alert({
        title: 'Success',
        message: 'Photos sent for this claim, please check your email for further instructions.',
        buttonLabel: 'Done',
        callback: function() {
          navigator.camera.cleanup(angular.noop, angular.noop);
          app.navi.resetToPage('main.html', {animation: 'slide'});
        }
      });
    }

  }]);


  module.controller('recentclaimlistCtrl', ['$scope', 'gApp', 'slPost', function($scope, gApp, slPost) {
    var curIndex = 0;

    $scope.list = gApp.persist.claimList;

    $scope.sendPost = function(index) {
      curIndex = index | curIndex;

      var data = angular.copy($scope.list[curIndex]);
      gApp.claimInfoSource = data;

      var o = {
        FileNumber: parseInt(data.FileNumber)
      };

      slPost(gApp.getBaseURL("FileReview"), o, response);
    };

    function response(data, error) {
      if (error) {
        gApp.postFail($scope.sendPost,
          function(){
            app.navi.popPage();
          });
      }
      else {
        gApp.claimStatusSource = data;

        var mt = parseInt(data.MessageType);
        switch (mt) {
          case 1:
            app.navi.pushPage('repairestimate.html');
            break;
          case 2:
            app.navi.pushPage('reviewresult.html', {title: 'Review Required', message: 'Further review required.'});
            break;
          default:
            app.navi.pushPage('reviewresult.html', {title: 'In Progress', message: 'Claim in progress.'});
            break;
        }
      }
    }

  }]);


  module.controller('repairestimateCtrl', ['$scope', 'gApp', 'slPost', function($scope, gApp, slPost) {
    $scope.claimInfo = gApp.claimInfoSource;
    $scope.claimStatus = gApp.claimStatusSource;

    $scope.sendPost = function() {
      var o = {
        FileNumber: gApp.claimInfoSource.FileNumber
      };

      slPost(gApp.getBaseURL("RequestPDF"), o, response1);
    };

    function response1(data, error) {
      if (error) {
        gApp.postFail($scope.sendPost,
          function(){
            app.navi.popPage();
          });
      }
      else {
        var ft = new FileTransfer();
        ft.download(encodeURI(data.URLLoc), "cdvfile://localhost/temporary/est/" + gApp.claimInfoSource.FileNumber + ".pdf",
          function(entry) {
            cordova.plugins.fileOpener2.open(entry.toURL(), 'application/pdf');
          }
        );
      }
    }

    $scope.sendCheck = function() {
      var o = {
        FileNumber: gApp.claimInfoSource.FileNumber
      };

      slPost(gApp.getBaseURL("SendCheck"), o, response2);
    };

    function response2(data, error) {
      if (error) {
        gApp.postFail($scope.sendCheck,
          function(){
            app.navi.popPage();
          });
      }
      else {
        app.navi.pushPage('reviewresult.html', {title: 'Send me a Check', message: data.Confirmation});
      }
    }
  }]);


  module.controller('reviewresultCtrl', ['$scope', 'gApp', function($scope, gApp) {
    var page = app.navi.getCurrentPage();

    $scope.claimInfo = gApp.claimInfoSource;
    $scope.title = page.options.title;
    $scope.message = page.options.message;
  }]);


  module.controller('repairshopCtrl', ['$scope', 'gApp', 'slPost', function($scope, gApp, slPost) {
    $scope.claimInfo = gApp.claimInfoSource;

    $scope.sendPost = function() {
      var o = {
        FileNumber: parseInt(gApp.claimInfoSource.FileNumber),
        ShopName: $scope.shopname,
        EmailAddress: $scope.email,
        Phone: $scope.phone
      };

      slPost(gApp.getBaseURL("SendtoShop"), o, response);
    };

    function response(data, error) {
      if (error) {
        gApp.postFail($scope.sendPost,
          function(){
            app.navi.popPage();
          });
      }
      else {
        if (data && data.Confirmation) {
          ons.notification.alert({
            title: 'Confirmation',
            message: 'Email Sent.',
            buttonLabel: 'Done',
            callback: function() {
              app.navi.resetToPage('main.html', {animation: 'slide'});
            }
          });
        }
      }
    }
  }]);

})();

