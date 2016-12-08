(function(){
  'use strict';
  
  var module = angular.module('slDirectives', []);

  module.directive('backImg', function(){
    return function(scope, element, attrs){
      attrs.$observe('backImg', function(value) {
        element.css({
          'background-image': "url('" + value +"')",
          'background-size' : 'contain',
          'background-repeat': 'no-repeat',
          'background-position': 'center'
        });
      });
    };
  });

})();
