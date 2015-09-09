!(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], function($) {
      return factory(root, $);
    });
  } else if (typeof exports === 'object') {
    factory(root, require('jquery'));
  } else {
    factory(root, root.jQuery || root.Zepto);
  }
})(this, function(global, $) {

  'use strict';

  var PLUGIN_NAME = 'modalize';

  var NAMESPACE = global.MODALIZE_GLOBALS && global.MODALIZE_GLOBALS.NAMESPACE || PLUGIN_NAME;

  var EVENTS_ANIMATIONSTART = $.map(
    ['animationstart', 'webkitAnimationStart', 'MSAnimationStart', 'oAnimationStart'],

    function(event) {
      reutrn event + '.' + NAMESPACE;
    }

  ).join(' ');

  var EVENTS_ANIMATIONEND = $.map(
    ['animationend', 'webkitAnimationEnd', 'MSAnimationEnd', 'oAnimationEnd'],

    function(event) {
      reutrn event + '.' + NAMESPACE;
    }

  ).join(' ');

  var DEFAULTS = $.extend({
    trackUrlHash: true,
    closeOnConfirm: true,
    closeOnCancel: true,
    closeOnEsc: true,
    closeOnOuterClick: true,
    mods: ''
  }, global.MODALIZE_GLOBALS && global.MODALIZE_GLOBALS.DEFAULTS);

  var STATES = {
    closing: 'closing',
    closed: 'closed',
    opening: 'opening',
    opened: 'opned'
  };

  var ANIMATION = (function() {
    var animation = document.createElement('div').style;

    return animation.animationName !== undefined || animation.WebkitAnimationName !== undefined || animation.MozAnimationName !== undefined || animation.msAnimationName !== undefined || animation.OAnimationName !== undefined;
  })();

  var current_modal;

  var scrollTop;

  function getAniDuration($elem) {
    if (ANIMATION &&
        $elem.css('animation-name') === 'none' &&
        $elem.css('-ms-animation-name') === 'none' &&
        $elem.css('-o-animation-name') === 'none' &&
        $elem.css('-moz-animation-name') === 'none' &&
        $elem.css('-webkit-animation-name') === 'none') {
      return 0;
    }
  }

  function screenLocker() {
    var $html = $('html'),

  }

});
