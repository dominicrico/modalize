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

  $[PLUGIN_NAME] = {
    lookup: []
  };

  var NAMESPACE = global.MODALIZE_GLOBALS && global.MODALIZE_GLOBALS.NAMESPACE || PLUGIN_NAME;

  var EVENTS_ANIMATIONSTART = $.map(
    ['animationstart', 'webkitAnimationStart', 'MSAnimationStart', 'oAnimationStart'],

    function(event) {
      return event + '.' + NAMESPACE;
    }

  ).join(' ');

  var EVENTS_ANIMATIONEND = $.map(
    ['animationend', 'webkitAnimationEnd', 'MSAnimationEnd', 'oAnimationEnd'],

    function(event) {
      return event + '.' + NAMESPACE;
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
    opened: 'opened'
  };

  var REASONS = {
    CONFIRM: 'confirmation',
    CANCEL: 'cancellation'
  };

  var ANIMATION = (function() {
    var animation = document.createElement('div').style;

    return animation.animationName !== undefined || animation.WebkitAnimationName !== undefined || animation.MozAnimationName !== undefined || animation.msAnimationName !== undefined || animation.OAnimationName !== undefined;
  })();

  var current_modal;

  var scrollTop;

  function setNamespace() {
    var namespace = NAMESPACE;

    for (var i = 0; i < arguments.length; i++) {
      namespace += '-' + arguments[i];
    }

    return namespace;
  }

  function getAniDuration($elem) {
    if (ANIMATION &&
        $elem.css('animation-name') === 'none' &&
        $elem.css('-ms-animation-name') === 'none' &&
        $elem.css('-o-animation-name') === 'none' &&
        $elem.css('-moz-animation-name') === 'none' &&
        $elem.css('-webkit-animation-name') === 'none') {
      return 0;
    }

    var duration = $elem.css('animation-duration') ||
        $elem.css('-ms-animation-duration') ||
        $elem.css('-o-animation-duration') ||
        $elem.css('-moz-animation-duration') ||
        $elem.css('-webkit-animation-duration') ||
        '0s';

    var delay = $elem.css('animation-delay') ||
        $elem.css('-ms-animation-delay') ||
        $elem.css('-o-animation-delay') ||
        $elem.css('-moz-animation-delay') ||
        $elem.css('-webkit-animation-delay') ||
        '0s';

    var iterations = $elem.css('animation-iteration-count') ||
        $elem.css('-ms-animation-iteration-count') ||
        $elem.css('-o-animation-iteration-count') ||
        $elem.css('-moz-animation-iteration-count') ||
        $elem.css('-webkit-animation-iteration-count') ||
        '1';

    duration = duration.split(', ');
    delay = delay.split(', ');
    iterations = iterations.split(', ');

    var num, max = Number.NEGATIVE_INFINITY;

    for (var i = 0; i < duration.length; i++) {
      num = parseFloat(duration[i]) * parseFloat(iterations[i], 10) + parseFloat(delay[i]);

      if( num > max) {
        max = num
      }
    }

    return num;
  }

  function unbindEvents(modal, event) {
    var $modalElems = ['$bg', '$overlay', '$wrapper', '$modal'];
    $.each($modalElems, function(i, elem) {
      modal[elem].off(event);
    });
  }

  function bindEvents(modal, event, callback) {
    var $modalElems = ['$bg', '$overlay', '$wrapper', '$modal'];
    $.each($modalElems, function(i, elem) {
      modal[elem].on(event, callback);
    });
  }

  function toggleTabs(modal) {

    if (modal.state === STATES.opening || modal.state === STATES.closing) {
      return;
    }

    var $tabs = modal.$modal.find('.' + PLUGIN_NAME + '-tabs > ul li'), $elem;

    modal.$modal.find('.' + PLUGIN_NAME + '-tabs [data-' + PLUGIN_NAME + '-tab]').hide()
    modal.$modal.find('.' + PLUGIN_NAME + '-tabs [data-' + PLUGIN_NAME + '-tab]:first').show()
    modal.$modal.find('.' + PLUGIN_NAME + '-tabs [data-' + PLUGIN_NAME + '-show]:first').addClass('active');

    modal.tab = modal.$modal.find('.' + PLUGIN_NAME + '-tabs ul li:first').attr('[data-' + PLUGIN_NAME + '-show]');

    $.each($tabs, function(i, elem) {
      $elem = $(elem);
      $elem.css('width', (100 / $tabs.length) + '%');
      if($elem.data(PLUGIN_NAME + '-show') !== undefined) {
        $elem.on('click.' + NAMESPACE, function(e){
          e.preventDefault();
          var $target = $(e.currentTarget);

          modal.$modal.find('.' + PLUGIN_NAME + '-tabs .modalize-tab-select').removeClass('active');
          modal.$modal.find('.' + PLUGIN_NAME + '-tabs .' + PLUGIN_NAME + '-tab').hide();
          modal.$modal.find('.' + PLUGIN_NAME + '-tabs [data-' + PLUGIN_NAME + '-tab=' + $target.data(PLUGIN_NAME + '-show') + ']').show();

          $target.addClass('active');

          modal.tab = $target.data(PLUGIN_NAME + '-show');
        });
      }
    });
  }

  function offToggleTabs(modal) {
    var $tabs = modal.$modal.find('.' + PLUGIN_NAME + '-tabs ul li'), $elem;

    modal.$modal.find('.' + PLUGIN_NAME + '-tabs [data-' + PLUGIN_NAME + '-tab]').hide()
    $.each($tabs, function(i, elem) {
      $elem = $(elem);

      if($elem.data(PLUGIN_NAME + '-show') !== undefined) {
        $elem.off('click.' + NAMESPACE);
      }
    });
  }

  function getScrollBar() {
    if ($(document.body).height() <= $(window).height()) {
      return 0;
    }

    var wrapper = document.createElement('div'),
        inner = document.createElement('div'),
        widthScroll,
        width;

    wrapper.style.visibility = 'hidden';
    wrapper.style.width = '100px';
    wrapper.style.overflow = 'scroll';

    inner.style.width = '100%';

    document.body.appendChild(wrapper);
    wrapper.appendChild(inner);

    width = wrapper.offsetWidth;
    widthScroll = inner.offsetWidth;

    wrapper.parentNode.removeChild(wrapper);

    return width - widthScroll;
  }

  function screenLocker(lock) {
    var $html = $('html'),
        lockClass = setNamespace('locked'),
        rightPadding,
        $body;
    if (lock) {
      if (!$html.hasClass(lockClass)) {
        $body = $(document.body);

        rightPadding = parseInt($body.css('padding-right'), 10) + getScrollBar();

        $body.css('padding-right', rightPadding + 'px');
        $html.addClass(lockClass);
      }
    } else {
      if ($html.hasClass(lockClass)) {
        $body = $(document.body);

        rightPadding = parseInt($body.css('padding-right'), 10) - getScrollBar();

        $body.css('padding-right', rightPadding + 'px');
        $html.removeClass(lockClass);
      }
    }

  }

  function changeState(modal, state, silent, reason) {
    var newState = setNamespace('is', state),
        stateColl = [
          setNamespace('is', STATES.closing),
          setNamespace('is', STATES.closed),
          setNamespace('is', STATES.opening),
          setNamespace('is', STATES.opened),
        ]. join(' ');

    modal.$bg.removeClass(stateColl).addClass(newState);
    modal.$overlay.removeClass(stateColl).addClass(newState);
    modal.$wrapper.removeClass(stateColl).addClass(newState);
    modal.$modal.removeClass(stateColl).addClass(newState);

    modal.state = state;

    !silent && modal.$modal.trigger({
      type: state,
      reason: reason
    }, [{ reason: reason }])
  }

  function aniSync(beforeAni, afterAni, modal) {
    var runningAnimsCounter = 0;

    var handleStart = function(elem) {
      if(elem.target !== this) {
        return;
      }

      runningAnimsCounter++;
    };

    var handleEnd = function(elem) {
      if(elem.target !== this) {
        return;
      }

      if(--runningAnimsCounter === 0) {
        unbindEvents(modal, EVENTS_ANIMATIONSTART + ' ' + EVENTS_ANIMATIONEND);

        afterAni();
      }
    };

    bindEvents(modal, EVENTS_ANIMATIONSTART, handleStart);
    bindEvents(modal, EVENTS_ANIMATIONEND, handleEnd);

    beforeAni();

    if(getAniDuration(modal.$bg) === 0 &&
       getAniDuration(modal.$overlay) === 0 &&
       getAniDuration(modal.$wrapper) === 0 &&
       getAniDuration(modal.$modal) === 0) {

      unbindEvents(modal, EVENTS_ANIMATIONSTART + ' ' + EVENTS_ANIMATIONEND);

      afterAni();

    }
  }

  function kill(modal) {
    if (modal.state === STATES.closed) {
      return;
    }

    unbindEvents(modal, EVENTS_ANIMATIONSTART + ' ' + EVENTS_ANIMATIONEND);

    modal.$bg.removeClass(modal.settings.mods);
    modal.$overlay.removeClass(modal.settings.mods).hide();
    modal.$wrapper.hide();
    screenLocker(false);
    changeState(modal, STATES.closed, true);
  }

  function hashChange() {
    var id = window.location.hash.replace('#', ''),
        modal,
        $elem;

    if (!id) {
      if (current_modal && current_modal.state === STATES.opened && current_modal.settings.trackUrlHash) {
        current_modal.close();
      }
    } else {
      try {
        $elem = $('[data-' + PLUGIN_NAME + '-id=' + id.replace(new RegExp('/', 'g'), '\\/') + ']');
      } catch(err) {

      }

      if ($elem && $elem.length) {
        modal = $[PLUGIN_NAME].lookup[$elem.data(PLUGIN_NAME)];

        if (modal && modal.settings.trackUrlHash) {
          modal.open();
        }
      }
    }
  }

  function optionParse(options){
    var obj = {}, arr, len, val, i;

    options = options.replace(/\s*:\s*/g, ':').replace(/\s*,\s*/g, ',');

    arr = options.split(',');

    for(i = 0, len = arr.length; i < len; i++) {
      arr[i] = arr[i].split(':');
      val = arr[i][1];

      if(typeof val === 'string' || val instanceof String) {
        val = !isNaN(val) ? +val : ((val == 'false') ? false : true);
      }

      obj[arr[i][0]] = val;
    }

    return obj;
  }

  function modalize($modal, options) {
    var $body = $(document.body),
        modalize = this;

    modalize.settings = $.extend({}, DEFAULTS, options);
    modalize.index = $[PLUGIN_NAME].lookup.push(modalize) -1;
    modalize.state = STATES.closed;
    modalize.tab = undefined;

    modalize.$overlay = $('.' + setNamespace('overlay'));

    if (!modalize.$overlay.length) {
      modalize.$overlay = $('<div>').addClass(setNamespace('overlay') + ' ' + setNamespace('is', STATES.closed)).hide();
      $body.append(modalize.$overlay);
    }

    modalize.$bg = $('.' + setNamespace('bg')).addClass(setNamespace('is', STATES.closed));

    modalize.$modal = $modal.addClass(NAMESPACE + ' ' + setNamespace('is-initialized') + ' ' + modalize.settings.mods + ' ' + setNamespace('is', STATES.closed)).attr('tabindex', '-1');

    modalize.$wrapper = $('<div>').addClass(setNamespace('wrapper') + ' ' + modalize.settings.mods + ' ' + setNamespace('is', STATES.closed)).hide().append(modalize.$modal);

    $body.append(modalize.$wrapper);

    modalize.$wrapper.on('click.' + NAMESPACE, '[data-' + PLUGIN_NAME + '-action="close"]', function(e) {
      e.preventDefault();

      modalize.close();
    });

    modalize.$wrapper.on('click.' + NAMESPACE, '[data-' + PLUGIN_NAME + '-action="cancel"]', function(e) {
      e.preventDefault();

      modalize.$modal.trigger(REASONS.CANCEL);

      if (modalize.settings.closeOnCancel) {
        modalize.close(REASONS.CANCEL);
      }
    });

    modalize.$wrapper.on('click.' + NAMESPACE, '[data-' + PLUGIN_NAME + '-action="confirm"]', function(e) {
      e.preventDefault();

      modalize.$modal.trigger(REASONS.CONFIRM);

      if (modalize.settings.closeOnConfirm) {
        modalize.close(REASONS.CONFIRM);
      }
    });

    modalize.$wrapper.on('click.' + NAMESPACE, function(e){
      if (!$(e.target).hasClass(setNamespace('wrapper'))) {
        return;
      }

      if (modalize.settings.closeOnOuterClick) {
        modalize.close();
      }
    });

  }

  modalize.prototype.open = function(){
    var modalize = this,
        id,
        url;

    if (modalize.state === STATES.opening || modalize.state === STATES.closing) {
      return;
    }

    id = modalize.$modal.attr('data-' + PLUGIN_NAME + '-id');

    if (id && modalize.settings.trackUrlHash) {
      scrollTop = $(window).scrollTop();
      location.hash = id;
    }

    if (current_modal && current_modal !== modalize) {
      kill(current_modal);
    }

    current_modal = modalize;
    screenLocker(true);

    modalize.$bg.addClass(modalize.settings.mods);
    modalize.$overlay.addClass(modalize.settings.mods).show();
    modalize.$wrapper.show().scrollTop();
    modalize.$modal.focus();

    if (modalize.$modal.find('.' + PLUGIN_NAME + '-ajax').length) {

      modalize.$modal.find('.' + PLUGIN_NAME + '-ajax').empty();

      url = modalize.$modal.find('.' + PLUGIN_NAME + '-ajax').attr('data-' + PLUGIN_NAME + '-ajax');

      $.ajax({
        method: 'GET',
        url: url,
        beforeSend: function(){
          modalize.$modal.find('.' + PLUGIN_NAME + '-confirm, .' + PLUGIN_NAME + '-cancel').hide();
          modalize.$modal.find('.' + PLUGIN_NAME + '-ajax').html('<h2><i class="icon-cycle icon-spin"></i> Loading data...</h2>');
        },
        success: function(data){
          modalize.$modal.find('.' + PLUGIN_NAME + '-confirm, .' + PLUGIN_NAME + '-cancel').show();
          modalize.$modal.find('.' + PLUGIN_NAME + '-ajax').html(data.output);
          if (modalize.$modal.find('.' + PLUGIN_NAME + '-tabs').length) {
            toggleTabs(modalize);
          }
        },
        error: function(err) {
          modalize.$modal.find('.' + PLUGIN_NAME + '-ajax').html('<span>Ooops... Something went completly wrong! Sorry!</span>');
        }
      })
    }

    if (modalize.$modal.find('.' + PLUGIN_NAME + '-tabs').length) {
      toggleTabs(modalize);
    }

    aniSync(
      function(){
        changeState(modalize, STATES.opening);
      },
      function(){
        changeState(modalize, STATES.opened);
      },
      modalize
    );
  };

  modalize.prototype.close = function(reason) {
    var modalize = this;

    if (modalize.state === STATES.opening || modalize.state === STATES.closing) {
      return;
    }

    if (modalize.settings.trackUrlHash && modalize.$modal.attr('data-' + PLUGIN_NAME + '-id') === window.location.hash.substring(1)) {
      window.location.hash = '';
      $(window).scrollTop(scrollTop);
    }

    modalize.$bg.addClass(modalize.settings.mods);
    modalize.$overlay.addClass(modalize.settings.mods).show();
    modalize.$wrapper.show().scrollTop();
    modalize.$modal.focus();

    if (modalize.$modal.find('.' + PLUGIN_NAME + '-ajax').length) {
      modalize.$modal.find('.' + PLUGIN_NAME + '-ajax').empty();
    }

    if (modalize.$modal.find('.' + PLUGIN_NAME + '-tabs').length) {
      offToggleTabs(modalize);
    }

    aniSync(
      function(){
        changeState(modalize, STATES.closing);
      },
      function(){
        modalize.$bg.removeClass(modalize.settings.mods);
        modalize.$overlay.removeClass(modalize.settings.mods).hide();
        modalize.$wrapper.hide();
        screenLocker(false);

        changeState(modalize, STATES.closed, false, reason);
      },
      modalize
    );
  };

  modalize.prototype.currentState = function() {
    return this.state;
  };

  modalize.prototype.currentTab = function() {
    return this.tab;
  };

  modalize.prototype.destroy = function() {
    var lookup = $[PLUGIN_NAME].lookup,
        instances;

    kill(this);
    this.$wrapper.remove();
    delete lookup[this.index];

    instances = $.grep(lookup, function(modal) {
      return !!modal;
    }).length;

    if (instances === 0) {
      this.$overlay.remove();
      this.$bg.removeClass(
        setNamespace('is', STATES.closing) + ' ' +
        setNamespace('is', STATES.closed) + ' ' +
        setNamespace('is', STATES.opening) + ' ' +
        setNamespace('is', STATES.opened)
      );
    }
  };

  $.fn[PLUGIN_NAME] = function(opts) {
    var modal, $elem;

    this.each(function(i, elem) {
      $elem = $(elem);

      if ($elem.data(PLUGIN_NAME) == null) {
        modal = new modalize($elem, opts);
        $elem.data(PLUGIN_NAME, modal.index);

        if ( modal.settings.trackUrlHash && $elem.attr('data-' + PLUGIN_NAME + '-id' ) === window.location.hash.substr(1)) {
          modal.open();
        }
      } else {
        modal = $[PLUGIN_NAME].lookup[$elem.data(PLUGIN_NAME)];
      }
    });

    return modal;
  };

  $(document).ready(function(){

    var $document = $(document);

    $document.on('click', '[data-' + PLUGIN_NAME + '-target]', function(e){
      e.preventDefault();

      var elem = e.currentTarget,
          id = elem.getAttribute('data-' + PLUGIN_NAME + '-target'),
          $target = $('[data-' + PLUGIN_NAME + '-id=' + id + ']');

      $[PLUGIN_NAME].lookup[$target.data(PLUGIN_NAME)].open();
    });

    $document.on('keydown.' + NAMESPACE, function(e) {
      if (current_modal && current_modal.settings.closeOnEsc && current_modal.state === STATES.opened && e.keyCode === 27) {
        current_modal.close();
      }
    });

    $(window).on('hashchange.' + NAMESPACE, hashChange);

    $document.find('.' + NAMESPACE).each(function(i, container){
      var $container = $(container), options = $container.data(PLUGIN_NAME + '-options');

      if (!options) {
        options = {};
      } else if (typeof options === 'string' || options instanceof String) {
        options = optionParse(options);
      }

      $container[PLUGIN_NAME](options);
    });

  });
});


