'use strict';

/*! tether 1.4.0 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require, exports, module);
  } else {
    root.Tether = factory();
  }
})(this, function (require, exports, module) {

  'use strict';

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ('value' in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
      }
    }return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
  }();

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError('Cannot call a class as a function');
    }
  }

  var TetherBase = undefined;
  if (typeof TetherBase === 'undefined') {
    TetherBase = { modules: [] };
  }

  var zeroElement = null;

  // Same as native getBoundingClientRect, except it takes into account parent <frame> offsets
  // if the element lies within a nested document (<frame> or <iframe>-like).
  function getActualBoundingClientRect(node) {
    var boundingRect = node.getBoundingClientRect();

    // The original object returned by getBoundingClientRect is immutable, so we clone it
    // We can't use extend because the properties are not considered part of the object by hasOwnProperty in IE9
    var rect = {};
    for (var k in boundingRect) {
      rect[k] = boundingRect[k];
    }

    if (node.ownerDocument !== document) {
      var _frameElement = node.ownerDocument.defaultView.frameElement;
      if (_frameElement) {
        var frameRect = getActualBoundingClientRect(_frameElement);
        rect.top += frameRect.top;
        rect.bottom += frameRect.top;
        rect.left += frameRect.left;
        rect.right += frameRect.left;
      }
    }

    return rect;
  }

  function getScrollParents(el) {
    // In firefox if the el is inside an iframe with display: none; window.getComputedStyle() will return null;
    // https://bugzilla.mozilla.org/show_bug.cgi?id=548397
    var computedStyle = getComputedStyle(el) || {};
    var position = computedStyle.position;
    var parents = [];

    if (position === 'fixed') {
      return [el];
    }

    var parent = el;
    while ((parent = parent.parentNode) && parent && parent.nodeType === 1) {
      var style = undefined;
      try {
        style = getComputedStyle(parent);
      } catch (err) {}

      if (typeof style === 'undefined' || style === null) {
        parents.push(parent);
        return parents;
      }

      var _style = style;
      var overflow = _style.overflow;
      var overflowX = _style.overflowX;
      var overflowY = _style.overflowY;

      if (/(auto|scroll)/.test(overflow + overflowY + overflowX)) {
        if (position !== 'absolute' || ['relative', 'absolute', 'fixed'].indexOf(style.position) >= 0) {
          parents.push(parent);
        }
      }
    }

    parents.push(el.ownerDocument.body);

    // If the node is within a frame, account for the parent window scroll
    if (el.ownerDocument !== document) {
      parents.push(el.ownerDocument.defaultView);
    }

    return parents;
  }

  var uniqueId = function () {
    var id = 0;
    return function () {
      return ++id;
    };
  }();

  var zeroPosCache = {};
  var getOrigin = function getOrigin() {
    // getBoundingClientRect is unfortunately too accurate.  It introduces a pixel or two of
    // jitter as the user scrolls that messes with our ability to detect if two positions
    // are equivilant or not.  We place an element at the top left of the page that will
    // get the same jitter, so we can cancel the two out.
    var node = zeroElement;
    if (!node || !document.body.contains(node)) {
      node = document.createElement('div');
      node.setAttribute('data-tether-id', uniqueId());
      extend(node.style, {
        top: 0,
        left: 0,
        position: 'absolute'
      });

      document.body.appendChild(node);

      zeroElement = node;
    }

    var id = node.getAttribute('data-tether-id');
    if (typeof zeroPosCache[id] === 'undefined') {
      zeroPosCache[id] = getActualBoundingClientRect(node);

      // Clear the cache when this position call is done
      defer(function () {
        delete zeroPosCache[id];
      });
    }

    return zeroPosCache[id];
  };

  function removeUtilElements() {
    if (zeroElement) {
      document.body.removeChild(zeroElement);
    }
    zeroElement = null;
  };

  function getBounds(el) {
    var doc = undefined;
    if (el === document) {
      doc = document;
      el = document.documentElement;
    } else {
      doc = el.ownerDocument;
    }

    var docEl = doc.documentElement;

    var box = getActualBoundingClientRect(el);

    var origin = getOrigin();

    box.top -= origin.top;
    box.left -= origin.left;

    if (typeof box.width === 'undefined') {
      box.width = document.body.scrollWidth - box.left - box.right;
    }
    if (typeof box.height === 'undefined') {
      box.height = document.body.scrollHeight - box.top - box.bottom;
    }

    box.top = box.top - docEl.clientTop;
    box.left = box.left - docEl.clientLeft;
    box.right = doc.body.clientWidth - box.width - box.left;
    box.bottom = doc.body.clientHeight - box.height - box.top;

    return box;
  }

  function getOffsetParent(el) {
    return el.offsetParent || document.documentElement;
  }

  var _scrollBarSize = null;
  function getScrollBarSize() {
    if (_scrollBarSize) {
      return _scrollBarSize;
    }
    var inner = document.createElement('div');
    inner.style.width = '100%';
    inner.style.height = '200px';

    var outer = document.createElement('div');
    extend(outer.style, {
      position: 'absolute',
      top: 0,
      left: 0,
      pointerEvents: 'none',
      visibility: 'hidden',
      width: '200px',
      height: '150px',
      overflow: 'hidden'
    });

    outer.appendChild(inner);

    document.body.appendChild(outer);

    var widthContained = inner.offsetWidth;
    outer.style.overflow = 'scroll';
    var widthScroll = inner.offsetWidth;

    if (widthContained === widthScroll) {
      widthScroll = outer.clientWidth;
    }

    document.body.removeChild(outer);

    var width = widthContained - widthScroll;

    _scrollBarSize = { width: width, height: width };
    return _scrollBarSize;
  }

  function extend() {
    var out = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var args = [];

    Array.prototype.push.apply(args, arguments);

    args.slice(1).forEach(function (obj) {
      if (obj) {
        for (var key in obj) {
          if ({}.hasOwnProperty.call(obj, key)) {
            out[key] = obj[key];
          }
        }
      }
    });

    return out;
  }

  function removeClass(el, name) {
    if (typeof el.classList !== 'undefined') {
      name.split(' ').forEach(function (cls) {
        if (cls.trim()) {
          el.classList.remove(cls);
        }
      });
    } else {
      var regex = new RegExp('(^| )' + name.split(' ').join('|') + '( |$)', 'gi');
      var className = getClassName(el).replace(regex, ' ');
      setClassName(el, className);
    }
  }

  function addClass(el, name) {
    if (typeof el.classList !== 'undefined') {
      name.split(' ').forEach(function (cls) {
        if (cls.trim()) {
          el.classList.add(cls);
        }
      });
    } else {
      removeClass(el, name);
      var cls = getClassName(el) + (' ' + name);
      setClassName(el, cls);
    }
  }

  function hasClass(el, name) {
    if (typeof el.classList !== 'undefined') {
      return el.classList.contains(name);
    }
    var className = getClassName(el);
    return new RegExp('(^| )' + name + '( |$)', 'gi').test(className);
  }

  function getClassName(el) {
    // Can't use just SVGAnimatedString here since nodes within a Frame in IE have
    // completely separately SVGAnimatedString base classes
    if (el.className instanceof el.ownerDocument.defaultView.SVGAnimatedString) {
      return el.className.baseVal;
    }
    return el.className;
  }

  function setClassName(el, className) {
    el.setAttribute('class', className);
  }

  function updateClasses(el, add, all) {
    // Of the set of 'all' classes, we need the 'add' classes, and only the
    // 'add' classes to be set.
    all.forEach(function (cls) {
      if (add.indexOf(cls) === -1 && hasClass(el, cls)) {
        removeClass(el, cls);
      }
    });

    add.forEach(function (cls) {
      if (!hasClass(el, cls)) {
        addClass(el, cls);
      }
    });
  }

  var deferred = [];

  var defer = function defer(fn) {
    deferred.push(fn);
  };

  var flush = function flush() {
    var fn = undefined;
    while (fn = deferred.pop()) {
      fn();
    }
  };

  var Evented = function () {
    function Evented() {
      _classCallCheck(this, Evented);
    }

    _createClass(Evented, [{
      key: 'on',
      value: function on(event, handler, ctx) {
        var once = arguments.length <= 3 || arguments[3] === undefined ? false : arguments[3];

        if (typeof this.bindings === 'undefined') {
          this.bindings = {};
        }
        if (typeof this.bindings[event] === 'undefined') {
          this.bindings[event] = [];
        }
        this.bindings[event].push({ handler: handler, ctx: ctx, once: once });
      }
    }, {
      key: 'once',
      value: function once(event, handler, ctx) {
        this.on(event, handler, ctx, true);
      }
    }, {
      key: 'off',
      value: function off(event, handler) {
        if (typeof this.bindings === 'undefined' || typeof this.bindings[event] === 'undefined') {
          return;
        }

        if (typeof handler === 'undefined') {
          delete this.bindings[event];
        } else {
          var i = 0;
          while (i < this.bindings[event].length) {
            if (this.bindings[event][i].handler === handler) {
              this.bindings[event].splice(i, 1);
            } else {
              ++i;
            }
          }
        }
      }
    }, {
      key: 'trigger',
      value: function trigger(event) {
        if (typeof this.bindings !== 'undefined' && this.bindings[event]) {
          var i = 0;

          for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }

          while (i < this.bindings[event].length) {
            var _bindings$event$i = this.bindings[event][i];
            var handler = _bindings$event$i.handler;
            var ctx = _bindings$event$i.ctx;
            var once = _bindings$event$i.once;

            var context = ctx;
            if (typeof context === 'undefined') {
              context = this;
            }

            handler.apply(context, args);

            if (once) {
              this.bindings[event].splice(i, 1);
            } else {
              ++i;
            }
          }
        }
      }
    }]);

    return Evented;
  }();

  TetherBase.Utils = {
    getActualBoundingClientRect: getActualBoundingClientRect,
    getScrollParents: getScrollParents,
    getBounds: getBounds,
    getOffsetParent: getOffsetParent,
    extend: extend,
    addClass: addClass,
    removeClass: removeClass,
    hasClass: hasClass,
    updateClasses: updateClasses,
    defer: defer,
    flush: flush,
    uniqueId: uniqueId,
    Evented: Evented,
    getScrollBarSize: getScrollBarSize,
    removeUtilElements: removeUtilElements
  };
  /* globals TetherBase, performance */

  'use strict';

  var _slicedToArray = function () {
    function sliceIterator(arr, i) {
      var _arr = [];var _n = true;var _d = false;var _e = undefined;try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;_e = err;
      } finally {
        try {
          if (!_n && _i['return']) _i['return']();
        } finally {
          if (_d) throw _e;
        }
      }return _arr;
    }return function (arr, i) {
      if (Array.isArray(arr)) {
        return arr;
      } else if (Symbol.iterator in Object(arr)) {
        return sliceIterator(arr, i);
      } else {
        throw new TypeError('Invalid attempt to destructure non-iterable instance');
      }
    };
  }();

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ('value' in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
      }
    }return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
  }();

  var _get = function get(_x6, _x7, _x8) {
    var _again = true;_function: while (_again) {
      var object = _x6,
          property = _x7,
          receiver = _x8;_again = false;if (object === null) object = Function.prototype;var desc = Object.getOwnPropertyDescriptor(object, property);if (desc === undefined) {
        var parent = Object.getPrototypeOf(object);if (parent === null) {
          return undefined;
        } else {
          _x6 = parent;_x7 = property;_x8 = receiver;_again = true;desc = parent = undefined;continue _function;
        }
      } else if ('value' in desc) {
        return desc.value;
      } else {
        var getter = desc.get;if (getter === undefined) {
          return undefined;
        }return getter.call(receiver);
      }
    }
  };

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError('Cannot call a class as a function');
    }
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== 'function' && superClass !== null) {
      throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass);
    }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  if (typeof TetherBase === 'undefined') {
    throw new Error('You must include the utils.js file before tether.js');
  }

  var _TetherBase$Utils = TetherBase.Utils;
  var getScrollParents = _TetherBase$Utils.getScrollParents;
  var getBounds = _TetherBase$Utils.getBounds;
  var getOffsetParent = _TetherBase$Utils.getOffsetParent;
  var extend = _TetherBase$Utils.extend;
  var addClass = _TetherBase$Utils.addClass;
  var removeClass = _TetherBase$Utils.removeClass;
  var updateClasses = _TetherBase$Utils.updateClasses;
  var defer = _TetherBase$Utils.defer;
  var flush = _TetherBase$Utils.flush;
  var getScrollBarSize = _TetherBase$Utils.getScrollBarSize;
  var removeUtilElements = _TetherBase$Utils.removeUtilElements;

  function within(a, b) {
    var diff = arguments.length <= 2 || arguments[2] === undefined ? 1 : arguments[2];

    return a + diff >= b && b >= a - diff;
  }

  var transformKey = function () {
    if (typeof document === 'undefined') {
      return '';
    }
    var el = document.createElement('div');

    var transforms = ['transform', 'WebkitTransform', 'OTransform', 'MozTransform', 'msTransform'];
    for (var i = 0; i < transforms.length; ++i) {
      var key = transforms[i];
      if (el.style[key] !== undefined) {
        return key;
      }
    }
  }();

  var tethers = [];

  var position = function position() {
    tethers.forEach(function (tether) {
      tether.position(false);
    });
    flush();
  };

  function now() {
    if (typeof performance !== 'undefined' && typeof performance.now !== 'undefined') {
      return performance.now();
    }
    return +new Date();
  }

  (function () {
    var lastCall = null;
    var lastDuration = null;
    var pendingTimeout = null;

    var tick = function tick() {
      if (typeof lastDuration !== 'undefined' && lastDuration > 16) {
        // We voluntarily throttle ourselves if we can't manage 60fps
        lastDuration = Math.min(lastDuration - 16, 250);

        // Just in case this is the last event, remember to position just once more
        pendingTimeout = setTimeout(tick, 250);
        return;
      }

      if (typeof lastCall !== 'undefined' && now() - lastCall < 10) {
        // Some browsers call events a little too frequently, refuse to run more than is reasonable
        return;
      }

      if (pendingTimeout != null) {
        clearTimeout(pendingTimeout);
        pendingTimeout = null;
      }

      lastCall = now();
      position();
      lastDuration = now() - lastCall;
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener !== 'undefined') {
      ['resize', 'scroll', 'touchmove'].forEach(function (event) {
        window.addEventListener(event, tick);
      });
    }
  })();

  var MIRROR_LR = {
    center: 'center',
    left: 'right',
    right: 'left'
  };

  var MIRROR_TB = {
    middle: 'middle',
    top: 'bottom',
    bottom: 'top'
  };

  var OFFSET_MAP = {
    top: 0,
    left: 0,
    middle: '50%',
    center: '50%',
    bottom: '100%',
    right: '100%'
  };

  var autoToFixedAttachment = function autoToFixedAttachment(attachment, relativeToAttachment) {
    var left = attachment.left;
    var top = attachment.top;

    if (left === 'auto') {
      left = MIRROR_LR[relativeToAttachment.left];
    }

    if (top === 'auto') {
      top = MIRROR_TB[relativeToAttachment.top];
    }

    return { left: left, top: top };
  };

  var attachmentToOffset = function attachmentToOffset(attachment) {
    var left = attachment.left;
    var top = attachment.top;

    if (typeof OFFSET_MAP[attachment.left] !== 'undefined') {
      left = OFFSET_MAP[attachment.left];
    }

    if (typeof OFFSET_MAP[attachment.top] !== 'undefined') {
      top = OFFSET_MAP[attachment.top];
    }

    return { left: left, top: top };
  };

  function addOffset() {
    var out = { top: 0, left: 0 };

    for (var _len = arguments.length, offsets = Array(_len), _key = 0; _key < _len; _key++) {
      offsets[_key] = arguments[_key];
    }

    offsets.forEach(function (_ref) {
      var top = _ref.top;
      var left = _ref.left;

      if (typeof top === 'string') {
        top = parseFloat(top, 10);
      }
      if (typeof left === 'string') {
        left = parseFloat(left, 10);
      }

      out.top += top;
      out.left += left;
    });

    return out;
  }

  function offsetToPx(offset, size) {
    if (typeof offset.left === 'string' && offset.left.indexOf('%') !== -1) {
      offset.left = parseFloat(offset.left, 10) / 100 * size.width;
    }
    if (typeof offset.top === 'string' && offset.top.indexOf('%') !== -1) {
      offset.top = parseFloat(offset.top, 10) / 100 * size.height;
    }

    return offset;
  }

  var parseOffset = function parseOffset(value) {
    var _value$split = value.split(' ');

    var _value$split2 = _slicedToArray(_value$split, 2);

    var top = _value$split2[0];
    var left = _value$split2[1];

    return { top: top, left: left };
  };
  var parseAttachment = parseOffset;

  var TetherClass = function (_Evented) {
    _inherits(TetherClass, _Evented);

    function TetherClass(options) {
      var _this = this;

      _classCallCheck(this, TetherClass);

      _get(Object.getPrototypeOf(TetherClass.prototype), 'constructor', this).call(this);
      this.position = this.position.bind(this);

      tethers.push(this);

      this.history = [];

      this.setOptions(options, false);

      TetherBase.modules.forEach(function (module) {
        if (typeof module.initialize !== 'undefined') {
          module.initialize.call(_this);
        }
      });

      this.position();
    }

    _createClass(TetherClass, [{
      key: 'getClass',
      value: function getClass() {
        var key = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];
        var classes = this.options.classes;

        if (typeof classes !== 'undefined' && classes[key]) {
          return this.options.classes[key];
        } else if (this.options.classPrefix) {
          return this.options.classPrefix + '-' + key;
        } else {
          return key;
        }
      }
    }, {
      key: 'setOptions',
      value: function setOptions(options) {
        var _this2 = this;

        var pos = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

        var defaults = {
          offset: '0 0',
          targetOffset: '0 0',
          targetAttachment: 'auto auto',
          classPrefix: 'tether'
        };

        this.options = extend(defaults, options);

        var _options = this.options;
        var element = _options.element;
        var target = _options.target;
        var targetModifier = _options.targetModifier;

        this.element = element;
        this.target = target;
        this.targetModifier = targetModifier;

        if (this.target === 'viewport') {
          this.target = document.body;
          this.targetModifier = 'visible';
        } else if (this.target === 'scroll-handle') {
          this.target = document.body;
          this.targetModifier = 'scroll-handle';
        }

        ['element', 'target'].forEach(function (key) {
          if (typeof _this2[key] === 'undefined') {
            throw new Error('Tether Error: Both element and target must be defined');
          }

          if (typeof _this2[key].jquery !== 'undefined') {
            _this2[key] = _this2[key][0];
          } else if (typeof _this2[key] === 'string') {
            _this2[key] = document.querySelector(_this2[key]);
          }
        });

        addClass(this.element, this.getClass('element'));
        if (!(this.options.addTargetClasses === false)) {
          addClass(this.target, this.getClass('target'));
        }

        if (!this.options.attachment) {
          throw new Error('Tether Error: You must provide an attachment');
        }

        this.targetAttachment = parseAttachment(this.options.targetAttachment);
        this.attachment = parseAttachment(this.options.attachment);
        this.offset = parseOffset(this.options.offset);
        this.targetOffset = parseOffset(this.options.targetOffset);

        if (typeof this.scrollParents !== 'undefined') {
          this.disable();
        }

        if (this.targetModifier === 'scroll-handle') {
          this.scrollParents = [this.target];
        } else {
          this.scrollParents = getScrollParents(this.target);
        }

        if (!(this.options.enabled === false)) {
          this.enable(pos);
        }
      }
    }, {
      key: 'getTargetBounds',
      value: function getTargetBounds() {
        if (typeof this.targetModifier !== 'undefined') {
          if (this.targetModifier === 'visible') {
            if (this.target === document.body) {
              return { top: pageYOffset, left: pageXOffset, height: innerHeight, width: innerWidth };
            } else {
              var bounds = getBounds(this.target);

              var out = {
                height: bounds.height,
                width: bounds.width,
                top: bounds.top,
                left: bounds.left
              };

              out.height = Math.min(out.height, bounds.height - (pageYOffset - bounds.top));
              out.height = Math.min(out.height, bounds.height - (bounds.top + bounds.height - (pageYOffset + innerHeight)));
              out.height = Math.min(innerHeight, out.height);
              out.height -= 2;

              out.width = Math.min(out.width, bounds.width - (pageXOffset - bounds.left));
              out.width = Math.min(out.width, bounds.width - (bounds.left + bounds.width - (pageXOffset + innerWidth)));
              out.width = Math.min(innerWidth, out.width);
              out.width -= 2;

              if (out.top < pageYOffset) {
                out.top = pageYOffset;
              }
              if (out.left < pageXOffset) {
                out.left = pageXOffset;
              }

              return out;
            }
          } else if (this.targetModifier === 'scroll-handle') {
            var bounds = undefined;
            var target = this.target;
            if (target === document.body) {
              target = document.documentElement;

              bounds = {
                left: pageXOffset,
                top: pageYOffset,
                height: innerHeight,
                width: innerWidth
              };
            } else {
              bounds = getBounds(target);
            }

            var style = getComputedStyle(target);

            var hasBottomScroll = target.scrollWidth > target.clientWidth || [style.overflow, style.overflowX].indexOf('scroll') >= 0 || this.target !== document.body;

            var scrollBottom = 0;
            if (hasBottomScroll) {
              scrollBottom = 15;
            }

            var height = bounds.height - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth) - scrollBottom;

            var out = {
              width: 15,
              height: height * 0.975 * (height / target.scrollHeight),
              left: bounds.left + bounds.width - parseFloat(style.borderLeftWidth) - 15
            };

            var fitAdj = 0;
            if (height < 408 && this.target === document.body) {
              fitAdj = -0.00011 * Math.pow(height, 2) - 0.00727 * height + 22.58;
            }

            if (this.target !== document.body) {
              out.height = Math.max(out.height, 24);
            }

            var scrollPercentage = this.target.scrollTop / (target.scrollHeight - height);
            out.top = scrollPercentage * (height - out.height - fitAdj) + bounds.top + parseFloat(style.borderTopWidth);

            if (this.target === document.body) {
              out.height = Math.max(out.height, 24);
            }

            return out;
          }
        } else {
          return getBounds(this.target);
        }
      }
    }, {
      key: 'clearCache',
      value: function clearCache() {
        this._cache = {};
      }
    }, {
      key: 'cache',
      value: function cache(k, getter) {
        // More than one module will often need the same DOM info, so
        // we keep a cache which is cleared on each position call
        if (typeof this._cache === 'undefined') {
          this._cache = {};
        }

        if (typeof this._cache[k] === 'undefined') {
          this._cache[k] = getter.call(this);
        }

        return this._cache[k];
      }
    }, {
      key: 'enable',
      value: function enable() {
        var _this3 = this;

        var pos = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

        if (!(this.options.addTargetClasses === false)) {
          addClass(this.target, this.getClass('enabled'));
        }
        addClass(this.element, this.getClass('enabled'));
        this.enabled = true;

        this.scrollParents.forEach(function (parent) {
          if (parent !== _this3.target.ownerDocument) {
            parent.addEventListener('scroll', _this3.position);
          }
        });

        if (pos) {
          this.position();
        }
      }
    }, {
      key: 'disable',
      value: function disable() {
        var _this4 = this;

        removeClass(this.target, this.getClass('enabled'));
        removeClass(this.element, this.getClass('enabled'));
        this.enabled = false;

        if (typeof this.scrollParents !== 'undefined') {
          this.scrollParents.forEach(function (parent) {
            parent.removeEventListener('scroll', _this4.position);
          });
        }
      }
    }, {
      key: 'destroy',
      value: function destroy() {
        var _this5 = this;

        this.disable();

        tethers.forEach(function (tether, i) {
          if (tether === _this5) {
            tethers.splice(i, 1);
          }
        });

        // Remove any elements we were using for convenience from the DOM
        if (tethers.length === 0) {
          removeUtilElements();
        }
      }
    }, {
      key: 'updateAttachClasses',
      value: function updateAttachClasses(elementAttach, targetAttach) {
        var _this6 = this;

        elementAttach = elementAttach || this.attachment;
        targetAttach = targetAttach || this.targetAttachment;
        var sides = ['left', 'top', 'bottom', 'right', 'middle', 'center'];

        if (typeof this._addAttachClasses !== 'undefined' && this._addAttachClasses.length) {
          // updateAttachClasses can be called more than once in a position call, so
          // we need to clean up after ourselves such that when the last defer gets
          // ran it doesn't add any extra classes from previous calls.
          this._addAttachClasses.splice(0, this._addAttachClasses.length);
        }

        if (typeof this._addAttachClasses === 'undefined') {
          this._addAttachClasses = [];
        }
        var add = this._addAttachClasses;

        if (elementAttach.top) {
          add.push(this.getClass('element-attached') + '-' + elementAttach.top);
        }
        if (elementAttach.left) {
          add.push(this.getClass('element-attached') + '-' + elementAttach.left);
        }
        if (targetAttach.top) {
          add.push(this.getClass('target-attached') + '-' + targetAttach.top);
        }
        if (targetAttach.left) {
          add.push(this.getClass('target-attached') + '-' + targetAttach.left);
        }

        var all = [];
        sides.forEach(function (side) {
          all.push(_this6.getClass('element-attached') + '-' + side);
          all.push(_this6.getClass('target-attached') + '-' + side);
        });

        defer(function () {
          if (!(typeof _this6._addAttachClasses !== 'undefined')) {
            return;
          }

          updateClasses(_this6.element, _this6._addAttachClasses, all);
          if (!(_this6.options.addTargetClasses === false)) {
            updateClasses(_this6.target, _this6._addAttachClasses, all);
          }

          delete _this6._addAttachClasses;
        });
      }
    }, {
      key: 'position',
      value: function position() {
        var _this7 = this;

        var flushChanges = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

        // flushChanges commits the changes immediately, leave true unless you are positioning multiple
        // tethers (in which case call Tether.Utils.flush yourself when you're done)

        if (!this.enabled) {
          return;
        }

        this.clearCache();

        // Turn 'auto' attachments into the appropriate corner or edge
        var targetAttachment = autoToFixedAttachment(this.targetAttachment, this.attachment);

        this.updateAttachClasses(this.attachment, targetAttachment);

        var elementPos = this.cache('element-bounds', function () {
          return getBounds(_this7.element);
        });

        var width = elementPos.width;
        var height = elementPos.height;

        if (width === 0 && height === 0 && typeof this.lastSize !== 'undefined') {
          var _lastSize = this.lastSize;

          // We cache the height and width to make it possible to position elements that are
          // getting hidden.
          width = _lastSize.width;
          height = _lastSize.height;
        } else {
          this.lastSize = { width: width, height: height };
        }

        var targetPos = this.cache('target-bounds', function () {
          return _this7.getTargetBounds();
        });
        var targetSize = targetPos;

        // Get an actual px offset from the attachment
        var offset = offsetToPx(attachmentToOffset(this.attachment), { width: width, height: height });
        var targetOffset = offsetToPx(attachmentToOffset(targetAttachment), targetSize);

        var manualOffset = offsetToPx(this.offset, { width: width, height: height });
        var manualTargetOffset = offsetToPx(this.targetOffset, targetSize);

        // Add the manually provided offset
        offset = addOffset(offset, manualOffset);
        targetOffset = addOffset(targetOffset, manualTargetOffset);

        // It's now our goal to make (element position + offset) == (target position + target offset)
        var left = targetPos.left + targetOffset.left - offset.left;
        var top = targetPos.top + targetOffset.top - offset.top;

        for (var i = 0; i < TetherBase.modules.length; ++i) {
          var _module2 = TetherBase.modules[i];
          var ret = _module2.position.call(this, {
            left: left,
            top: top,
            targetAttachment: targetAttachment,
            targetPos: targetPos,
            elementPos: elementPos,
            offset: offset,
            targetOffset: targetOffset,
            manualOffset: manualOffset,
            manualTargetOffset: manualTargetOffset,
            scrollbarSize: scrollbarSize,
            attachment: this.attachment
          });

          if (ret === false) {
            return false;
          } else if (typeof ret === 'undefined' || typeof ret !== 'object') {
            continue;
          } else {
            top = ret.top;
            left = ret.left;
          }
        }

        // We describe the position three different ways to give the optimizer
        // a chance to decide the best possible way to position the element
        // with the fewest repaints.
        var next = {
          // It's position relative to the page (absolute positioning when
          // the element is a child of the body)
          page: {
            top: top,
            left: left
          },

          // It's position relative to the viewport (fixed positioning)
          viewport: {
            top: top - pageYOffset,
            bottom: pageYOffset - top - height + innerHeight,
            left: left - pageXOffset,
            right: pageXOffset - left - width + innerWidth
          }
        };

        var doc = this.target.ownerDocument;
        var win = doc.defaultView;

        var scrollbarSize = undefined;
        if (win.innerHeight > doc.documentElement.clientHeight) {
          scrollbarSize = this.cache('scrollbar-size', getScrollBarSize);
          next.viewport.bottom -= scrollbarSize.height;
        }

        if (win.innerWidth > doc.documentElement.clientWidth) {
          scrollbarSize = this.cache('scrollbar-size', getScrollBarSize);
          next.viewport.right -= scrollbarSize.width;
        }

        if (['', 'static'].indexOf(doc.body.style.position) === -1 || ['', 'static'].indexOf(doc.body.parentElement.style.position) === -1) {
          // Absolute positioning in the body will be relative to the page, not the 'initial containing block'
          next.page.bottom = doc.body.scrollHeight - top - height;
          next.page.right = doc.body.scrollWidth - left - width;
        }

        if (typeof this.options.optimizations !== 'undefined' && this.options.optimizations.moveElement !== false && !(typeof this.targetModifier !== 'undefined')) {
          (function () {
            var offsetParent = _this7.cache('target-offsetparent', function () {
              return getOffsetParent(_this7.target);
            });
            var offsetPosition = _this7.cache('target-offsetparent-bounds', function () {
              return getBounds(offsetParent);
            });
            var offsetParentStyle = getComputedStyle(offsetParent);
            var offsetParentSize = offsetPosition;

            var offsetBorder = {};
            ['Top', 'Left', 'Bottom', 'Right'].forEach(function (side) {
              offsetBorder[side.toLowerCase()] = parseFloat(offsetParentStyle['border' + side + 'Width']);
            });

            offsetPosition.right = doc.body.scrollWidth - offsetPosition.left - offsetParentSize.width + offsetBorder.right;
            offsetPosition.bottom = doc.body.scrollHeight - offsetPosition.top - offsetParentSize.height + offsetBorder.bottom;

            if (next.page.top >= offsetPosition.top + offsetBorder.top && next.page.bottom >= offsetPosition.bottom) {
              if (next.page.left >= offsetPosition.left + offsetBorder.left && next.page.right >= offsetPosition.right) {
                // We're within the visible part of the target's scroll parent
                var scrollTop = offsetParent.scrollTop;
                var scrollLeft = offsetParent.scrollLeft;

                // It's position relative to the target's offset parent (absolute positioning when
                // the element is moved to be a child of the target's offset parent).
                next.offset = {
                  top: next.page.top - offsetPosition.top + scrollTop - offsetBorder.top,
                  left: next.page.left - offsetPosition.left + scrollLeft - offsetBorder.left
                };
              }
            }
          })();
        }

        // We could also travel up the DOM and try each containing context, rather than only
        // looking at the body, but we're gonna get diminishing returns.

        this.move(next);

        this.history.unshift(next);

        if (this.history.length > 3) {
          this.history.pop();
        }

        if (flushChanges) {
          flush();
        }

        return true;
      }

      // THE ISSUE
    }, {
      key: 'move',
      value: function move(pos) {
        var _this8 = this;

        if (!(typeof this.element.parentNode !== 'undefined')) {
          return;
        }

        var same = {};

        for (var type in pos) {
          same[type] = {};

          for (var key in pos[type]) {
            var found = false;

            for (var i = 0; i < this.history.length; ++i) {
              var point = this.history[i];
              if (typeof point[type] !== 'undefined' && !within(point[type][key], pos[type][key])) {
                found = true;
                break;
              }
            }

            if (!found) {
              same[type][key] = true;
            }
          }
        }

        var css = { top: '', left: '', right: '', bottom: '' };

        var transcribe = function transcribe(_same, _pos) {
          var hasOptimizations = typeof _this8.options.optimizations !== 'undefined';
          var gpu = hasOptimizations ? _this8.options.optimizations.gpu : null;
          if (gpu !== false) {
            var yPos = undefined,
                xPos = undefined;
            if (_same.top) {
              css.top = 0;
              yPos = _pos.top;
            } else {
              css.bottom = 0;
              yPos = -_pos.bottom;
            }

            if (_same.left) {
              css.left = 0;
              xPos = _pos.left;
            } else {
              css.right = 0;
              xPos = -_pos.right;
            }

            if (window.matchMedia) {
              // HubSpot/tether#207
              var retina = window.matchMedia('only screen and (min-resolution: 1.3dppx)').matches || window.matchMedia('only screen and (-webkit-min-device-pixel-ratio: 1.3)').matches;
              if (!retina) {
                xPos = Math.round(xPos);
                yPos = Math.round(yPos);
              }
            }

            css[transformKey] = 'translateX(' + xPos + 'px) translateY(' + yPos + 'px)';

            if (transformKey !== 'msTransform') {
              // The Z transform will keep this in the GPU (faster, and prevents artifacts),
              // but IE9 doesn't support 3d transforms and will choke.
              css[transformKey] += " translateZ(0)";
            }
          } else {
            if (_same.top) {
              css.top = _pos.top + 'px';
            } else {
              css.bottom = _pos.bottom + 'px';
            }

            if (_same.left) {
              css.left = _pos.left + 'px';
            } else {
              css.right = _pos.right + 'px';
            }
          }
        };

        var moved = false;
        if ((same.page.top || same.page.bottom) && (same.page.left || same.page.right)) {
          css.position = 'absolute';
          transcribe(same.page, pos.page);
        } else if ((same.viewport.top || same.viewport.bottom) && (same.viewport.left || same.viewport.right)) {
          css.position = 'fixed';
          transcribe(same.viewport, pos.viewport);
        } else if (typeof same.offset !== 'undefined' && same.offset.top && same.offset.left) {
          (function () {
            css.position = 'absolute';
            var offsetParent = _this8.cache('target-offsetparent', function () {
              return getOffsetParent(_this8.target);
            });

            if (getOffsetParent(_this8.element) !== offsetParent) {
              defer(function () {
                _this8.element.parentNode.removeChild(_this8.element);
                offsetParent.appendChild(_this8.element);
              });
            }

            transcribe(same.offset, pos.offset);
            moved = true;
          })();
        } else {
          css.position = 'absolute';
          transcribe({ top: true, left: true }, pos.page);
        }

        if (!moved) {
          if (this.options.bodyElement) {
            this.options.bodyElement.appendChild(this.element);
          } else {
            var offsetParentIsBody = true;
            var currentNode = this.element.parentNode;
            while (currentNode && currentNode.nodeType === 1 && currentNode.tagName !== 'BODY') {
              if (getComputedStyle(currentNode).position !== 'static') {
                offsetParentIsBody = false;
                break;
              }

              currentNode = currentNode.parentNode;
            }

            if (!offsetParentIsBody) {
              this.element.parentNode.removeChild(this.element);
              this.element.ownerDocument.body.appendChild(this.element);
            }
          }
        }

        // Any css change will trigger a repaint, so let's avoid one if nothing changed
        var writeCSS = {};
        var write = false;
        for (var key in css) {
          var val = css[key];
          var elVal = this.element.style[key];

          if (elVal !== val) {
            write = true;
            writeCSS[key] = val;
          }
        }

        if (write) {
          defer(function () {
            extend(_this8.element.style, writeCSS);
            _this8.trigger('repositioned');
          });
        }
      }
    }]);

    return TetherClass;
  }(Evented);

  TetherClass.modules = [];

  TetherBase.position = position;

  var Tether = extend(TetherClass, TetherBase);
  /* globals TetherBase */

  'use strict';

  var _slicedToArray = function () {
    function sliceIterator(arr, i) {
      var _arr = [];var _n = true;var _d = false;var _e = undefined;try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;_e = err;
      } finally {
        try {
          if (!_n && _i['return']) _i['return']();
        } finally {
          if (_d) throw _e;
        }
      }return _arr;
    }return function (arr, i) {
      if (Array.isArray(arr)) {
        return arr;
      } else if (Symbol.iterator in Object(arr)) {
        return sliceIterator(arr, i);
      } else {
        throw new TypeError('Invalid attempt to destructure non-iterable instance');
      }
    };
  }();

  var _TetherBase$Utils = TetherBase.Utils;
  var getBounds = _TetherBase$Utils.getBounds;
  var extend = _TetherBase$Utils.extend;
  var updateClasses = _TetherBase$Utils.updateClasses;
  var defer = _TetherBase$Utils.defer;

  var BOUNDS_FORMAT = ['left', 'top', 'right', 'bottom'];

  function getBoundingRect(tether, to) {
    if (to === 'scrollParent') {
      to = tether.scrollParents[0];
    } else if (to === 'window') {
      to = [pageXOffset, pageYOffset, innerWidth + pageXOffset, innerHeight + pageYOffset];
    }

    if (to === document) {
      to = to.documentElement;
    }

    if (typeof to.nodeType !== 'undefined') {
      (function () {
        var node = to;
        var size = getBounds(to);
        var pos = size;
        var style = getComputedStyle(to);

        to = [pos.left, pos.top, size.width + pos.left, size.height + pos.top];

        // Account any parent Frames scroll offset
        if (node.ownerDocument !== document) {
          var win = node.ownerDocument.defaultView;
          to[0] += win.pageXOffset;
          to[1] += win.pageYOffset;
          to[2] += win.pageXOffset;
          to[3] += win.pageYOffset;
        }

        BOUNDS_FORMAT.forEach(function (side, i) {
          side = side[0].toUpperCase() + side.substr(1);
          if (side === 'Top' || side === 'Left') {
            to[i] += parseFloat(style['border' + side + 'Width']);
          } else {
            to[i] -= parseFloat(style['border' + side + 'Width']);
          }
        });
      })();
    }

    return to;
  }

  TetherBase.modules.push({
    position: function position(_ref) {
      var _this = this;

      var top = _ref.top;
      var left = _ref.left;
      var targetAttachment = _ref.targetAttachment;

      if (!this.options.constraints) {
        return true;
      }

      var _cache = this.cache('element-bounds', function () {
        return getBounds(_this.element);
      });

      var height = _cache.height;
      var width = _cache.width;

      if (width === 0 && height === 0 && typeof this.lastSize !== 'undefined') {
        var _lastSize = this.lastSize;

        // Handle the item getting hidden as a result of our positioning without glitching
        // the classes in and out
        width = _lastSize.width;
        height = _lastSize.height;
      }

      var targetSize = this.cache('target-bounds', function () {
        return _this.getTargetBounds();
      });

      var targetHeight = targetSize.height;
      var targetWidth = targetSize.width;

      var allClasses = [this.getClass('pinned'), this.getClass('out-of-bounds')];

      this.options.constraints.forEach(function (constraint) {
        var outOfBoundsClass = constraint.outOfBoundsClass;
        var pinnedClass = constraint.pinnedClass;

        if (outOfBoundsClass) {
          allClasses.push(outOfBoundsClass);
        }
        if (pinnedClass) {
          allClasses.push(pinnedClass);
        }
      });

      allClasses.forEach(function (cls) {
        ['left', 'top', 'right', 'bottom'].forEach(function (side) {
          allClasses.push(cls + '-' + side);
        });
      });

      var addClasses = [];

      var tAttachment = extend({}, targetAttachment);
      var eAttachment = extend({}, this.attachment);

      this.options.constraints.forEach(function (constraint) {
        var to = constraint.to;
        var attachment = constraint.attachment;
        var pin = constraint.pin;

        if (typeof attachment === 'undefined') {
          attachment = '';
        }

        var changeAttachX = undefined,
            changeAttachY = undefined;
        if (attachment.indexOf(' ') >= 0) {
          var _attachment$split = attachment.split(' ');

          var _attachment$split2 = _slicedToArray(_attachment$split, 2);

          changeAttachY = _attachment$split2[0];
          changeAttachX = _attachment$split2[1];
        } else {
          changeAttachX = changeAttachY = attachment;
        }

        var bounds = getBoundingRect(_this, to);

        if (changeAttachY === 'target' || changeAttachY === 'both') {
          if (top < bounds[1] && tAttachment.top === 'top') {
            top += targetHeight;
            tAttachment.top = 'bottom';
          }

          if (top + height > bounds[3] && tAttachment.top === 'bottom') {
            top -= targetHeight;
            tAttachment.top = 'top';
          }
        }

        if (changeAttachY === 'together') {
          if (tAttachment.top === 'top') {
            if (eAttachment.top === 'bottom' && top < bounds[1]) {
              top += targetHeight;
              tAttachment.top = 'bottom';

              top += height;
              eAttachment.top = 'top';
            } else if (eAttachment.top === 'top' && top + height > bounds[3] && top - (height - targetHeight) >= bounds[1]) {
              top -= height - targetHeight;
              tAttachment.top = 'bottom';

              eAttachment.top = 'bottom';
            }
          }

          if (tAttachment.top === 'bottom') {
            if (eAttachment.top === 'top' && top + height > bounds[3]) {
              top -= targetHeight;
              tAttachment.top = 'top';

              top -= height;
              eAttachment.top = 'bottom';
            } else if (eAttachment.top === 'bottom' && top < bounds[1] && top + (height * 2 - targetHeight) <= bounds[3]) {
              top += height - targetHeight;
              tAttachment.top = 'top';

              eAttachment.top = 'top';
            }
          }

          if (tAttachment.top === 'middle') {
            if (top + height > bounds[3] && eAttachment.top === 'top') {
              top -= height;
              eAttachment.top = 'bottom';
            } else if (top < bounds[1] && eAttachment.top === 'bottom') {
              top += height;
              eAttachment.top = 'top';
            }
          }
        }

        if (changeAttachX === 'target' || changeAttachX === 'both') {
          if (left < bounds[0] && tAttachment.left === 'left') {
            left += targetWidth;
            tAttachment.left = 'right';
          }

          if (left + width > bounds[2] && tAttachment.left === 'right') {
            left -= targetWidth;
            tAttachment.left = 'left';
          }
        }

        if (changeAttachX === 'together') {
          if (left < bounds[0] && tAttachment.left === 'left') {
            if (eAttachment.left === 'right') {
              left += targetWidth;
              tAttachment.left = 'right';

              left += width;
              eAttachment.left = 'left';
            } else if (eAttachment.left === 'left') {
              left += targetWidth;
              tAttachment.left = 'right';

              left -= width;
              eAttachment.left = 'right';
            }
          } else if (left + width > bounds[2] && tAttachment.left === 'right') {
            if (eAttachment.left === 'left') {
              left -= targetWidth;
              tAttachment.left = 'left';

              left -= width;
              eAttachment.left = 'right';
            } else if (eAttachment.left === 'right') {
              left -= targetWidth;
              tAttachment.left = 'left';

              left += width;
              eAttachment.left = 'left';
            }
          } else if (tAttachment.left === 'center') {
            if (left + width > bounds[2] && eAttachment.left === 'left') {
              left -= width;
              eAttachment.left = 'right';
            } else if (left < bounds[0] && eAttachment.left === 'right') {
              left += width;
              eAttachment.left = 'left';
            }
          }
        }

        if (changeAttachY === 'element' || changeAttachY === 'both') {
          if (top < bounds[1] && eAttachment.top === 'bottom') {
            top += height;
            eAttachment.top = 'top';
          }

          if (top + height > bounds[3] && eAttachment.top === 'top') {
            top -= height;
            eAttachment.top = 'bottom';
          }
        }

        if (changeAttachX === 'element' || changeAttachX === 'both') {
          if (left < bounds[0]) {
            if (eAttachment.left === 'right') {
              left += width;
              eAttachment.left = 'left';
            } else if (eAttachment.left === 'center') {
              left += width / 2;
              eAttachment.left = 'left';
            }
          }

          if (left + width > bounds[2]) {
            if (eAttachment.left === 'left') {
              left -= width;
              eAttachment.left = 'right';
            } else if (eAttachment.left === 'center') {
              left -= width / 2;
              eAttachment.left = 'right';
            }
          }
        }

        if (typeof pin === 'string') {
          pin = pin.split(',').map(function (p) {
            return p.trim();
          });
        } else if (pin === true) {
          pin = ['top', 'left', 'right', 'bottom'];
        }

        pin = pin || [];

        var pinned = [];
        var oob = [];

        if (top < bounds[1]) {
          if (pin.indexOf('top') >= 0) {
            top = bounds[1];
            pinned.push('top');
          } else {
            oob.push('top');
          }
        }

        if (top + height > bounds[3]) {
          if (pin.indexOf('bottom') >= 0) {
            top = bounds[3] - height;
            pinned.push('bottom');
          } else {
            oob.push('bottom');
          }
        }

        if (left < bounds[0]) {
          if (pin.indexOf('left') >= 0) {
            left = bounds[0];
            pinned.push('left');
          } else {
            oob.push('left');
          }
        }

        if (left + width > bounds[2]) {
          if (pin.indexOf('right') >= 0) {
            left = bounds[2] - width;
            pinned.push('right');
          } else {
            oob.push('right');
          }
        }

        if (pinned.length) {
          (function () {
            var pinnedClass = undefined;
            if (typeof _this.options.pinnedClass !== 'undefined') {
              pinnedClass = _this.options.pinnedClass;
            } else {
              pinnedClass = _this.getClass('pinned');
            }

            addClasses.push(pinnedClass);
            pinned.forEach(function (side) {
              addClasses.push(pinnedClass + '-' + side);
            });
          })();
        }

        if (oob.length) {
          (function () {
            var oobClass = undefined;
            if (typeof _this.options.outOfBoundsClass !== 'undefined') {
              oobClass = _this.options.outOfBoundsClass;
            } else {
              oobClass = _this.getClass('out-of-bounds');
            }

            addClasses.push(oobClass);
            oob.forEach(function (side) {
              addClasses.push(oobClass + '-' + side);
            });
          })();
        }

        if (pinned.indexOf('left') >= 0 || pinned.indexOf('right') >= 0) {
          eAttachment.left = tAttachment.left = false;
        }
        if (pinned.indexOf('top') >= 0 || pinned.indexOf('bottom') >= 0) {
          eAttachment.top = tAttachment.top = false;
        }

        if (tAttachment.top !== targetAttachment.top || tAttachment.left !== targetAttachment.left || eAttachment.top !== _this.attachment.top || eAttachment.left !== _this.attachment.left) {
          _this.updateAttachClasses(eAttachment, tAttachment);
          _this.trigger('update', {
            attachment: eAttachment,
            targetAttachment: tAttachment
          });
        }
      });

      defer(function () {
        if (!(_this.options.addTargetClasses === false)) {
          updateClasses(_this.target, addClasses, allClasses);
        }
        updateClasses(_this.element, addClasses, allClasses);
      });

      return { top: top, left: left };
    }
  });
  /* globals TetherBase */

  'use strict';

  var _TetherBase$Utils = TetherBase.Utils;
  var getBounds = _TetherBase$Utils.getBounds;
  var updateClasses = _TetherBase$Utils.updateClasses;
  var defer = _TetherBase$Utils.defer;

  TetherBase.modules.push({
    position: function position(_ref) {
      var _this = this;

      var top = _ref.top;
      var left = _ref.left;

      var _cache = this.cache('element-bounds', function () {
        return getBounds(_this.element);
      });

      var height = _cache.height;
      var width = _cache.width;

      var targetPos = this.getTargetBounds();

      var bottom = top + height;
      var right = left + width;

      var abutted = [];
      if (top <= targetPos.bottom && bottom >= targetPos.top) {
        ['left', 'right'].forEach(function (side) {
          var targetPosSide = targetPos[side];
          if (targetPosSide === left || targetPosSide === right) {
            abutted.push(side);
          }
        });
      }

      if (left <= targetPos.right && right >= targetPos.left) {
        ['top', 'bottom'].forEach(function (side) {
          var targetPosSide = targetPos[side];
          if (targetPosSide === top || targetPosSide === bottom) {
            abutted.push(side);
          }
        });
      }

      var allClasses = [];
      var addClasses = [];

      var sides = ['left', 'top', 'right', 'bottom'];
      allClasses.push(this.getClass('abutted'));
      sides.forEach(function (side) {
        allClasses.push(_this.getClass('abutted') + '-' + side);
      });

      if (abutted.length) {
        addClasses.push(this.getClass('abutted'));
      }

      abutted.forEach(function (side) {
        addClasses.push(_this.getClass('abutted') + '-' + side);
      });

      defer(function () {
        if (!(_this.options.addTargetClasses === false)) {
          updateClasses(_this.target, addClasses, allClasses);
        }
        updateClasses(_this.element, addClasses, allClasses);
      });

      return true;
    }
  });
  /* globals TetherBase */

  'use strict';

  var _slicedToArray = function () {
    function sliceIterator(arr, i) {
      var _arr = [];var _n = true;var _d = false;var _e = undefined;try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;_e = err;
      } finally {
        try {
          if (!_n && _i['return']) _i['return']();
        } finally {
          if (_d) throw _e;
        }
      }return _arr;
    }return function (arr, i) {
      if (Array.isArray(arr)) {
        return arr;
      } else if (Symbol.iterator in Object(arr)) {
        return sliceIterator(arr, i);
      } else {
        throw new TypeError('Invalid attempt to destructure non-iterable instance');
      }
    };
  }();

  TetherBase.modules.push({
    position: function position(_ref) {
      var top = _ref.top;
      var left = _ref.left;

      if (!this.options.shift) {
        return;
      }

      var shift = this.options.shift;
      if (typeof this.options.shift === 'function') {
        shift = this.options.shift.call(this, { top: top, left: left });
      }

      var shiftTop = undefined,
          shiftLeft = undefined;
      if (typeof shift === 'string') {
        shift = shift.split(' ');
        shift[1] = shift[1] || shift[0];

        var _shift = shift;

        var _shift2 = _slicedToArray(_shift, 2);

        shiftTop = _shift2[0];
        shiftLeft = _shift2[1];

        shiftTop = parseFloat(shiftTop, 10);
        shiftLeft = parseFloat(shiftLeft, 10);
      } else {
        shiftTop = shift.top;
        shiftLeft = shift.left;
      }

      top += shiftTop;
      left += shiftLeft;

      return { top: top, left: left };
    }
  });
  return Tether;
});
;'use strict';

/*!
 * Bootstrap v4.0.0-alpha.6 (https://getbootstrap.com)
 * Copyright 2011-2017 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 */

if (typeof jQuery === 'undefined') {
  throw new Error('Bootstrap\'s JavaScript requires jQuery. jQuery must be included before Bootstrap\'s JavaScript.');
}

+function ($) {
  var version = $.fn.jquery.split(' ')[0].split('.');
  if (version[0] < 2 && version[1] < 9 || version[0] == 1 && version[1] == 9 && version[2] < 1 || version[0] >= 4) {
    throw new Error('Bootstrap\'s JavaScript requires at least jQuery v1.9.1 but less than v4.0.0');
  }
}(jQuery);

+function () {

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
      }
    }return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
  }();

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.0.0-alpha.6): util.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Util = function ($) {

    /**
     * ------------------------------------------------------------------------
     * Private TransitionEnd Helpers
     * ------------------------------------------------------------------------
     */

    var transition = false;

    var MAX_UID = 1000000;

    var TransitionEndEvent = {
      WebkitTransition: 'webkitTransitionEnd',
      MozTransition: 'transitionend',
      OTransition: 'oTransitionEnd otransitionend',
      transition: 'transitionend'
    };

    // shoutout AngusCroll (https://goo.gl/pxwQGp)
    function toType(obj) {
      return {}.toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
    }

    function isElement(obj) {
      return (obj[0] || obj).nodeType;
    }

    function getSpecialTransitionEndEvent() {
      return {
        bindType: transition.end,
        delegateType: transition.end,
        handle: function handle(event) {
          if ($(event.target).is(this)) {
            return event.handleObj.handler.apply(this, arguments); // eslint-disable-line prefer-rest-params
          }
          return undefined;
        }
      };
    }

    function transitionEndTest() {
      if (window.QUnit) {
        return false;
      }

      var el = document.createElement('bootstrap');

      for (var name in TransitionEndEvent) {
        if (el.style[name] !== undefined) {
          return {
            end: TransitionEndEvent[name]
          };
        }
      }

      return false;
    }

    function transitionEndEmulator(duration) {
      var _this = this;

      var called = false;

      $(this).one(Util.TRANSITION_END, function () {
        called = true;
      });

      setTimeout(function () {
        if (!called) {
          Util.triggerTransitionEnd(_this);
        }
      }, duration);

      return this;
    }

    function setTransitionEndSupport() {
      transition = transitionEndTest();

      $.fn.emulateTransitionEnd = transitionEndEmulator;

      if (Util.supportsTransitionEnd()) {
        $.event.special[Util.TRANSITION_END] = getSpecialTransitionEndEvent();
      }
    }

    /**
     * --------------------------------------------------------------------------
     * Public Util Api
     * --------------------------------------------------------------------------
     */

    var Util = {

      TRANSITION_END: 'bsTransitionEnd',

      getUID: function getUID(prefix) {
        do {
          // eslint-disable-next-line no-bitwise
          prefix += ~~(Math.random() * MAX_UID); // "~~" acts like a faster Math.floor() here
        } while (document.getElementById(prefix));
        return prefix;
      },
      getSelectorFromElement: function getSelectorFromElement(element) {
        var selector = element.getAttribute('data-target');

        if (!selector) {
          selector = element.getAttribute('href') || '';
          selector = /^#[a-z]/i.test(selector) ? selector : null;
        }

        return selector;
      },
      reflow: function reflow(element) {
        return element.offsetHeight;
      },
      triggerTransitionEnd: function triggerTransitionEnd(element) {
        $(element).trigger(transition.end);
      },
      supportsTransitionEnd: function supportsTransitionEnd() {
        return Boolean(transition);
      },
      typeCheckConfig: function typeCheckConfig(componentName, config, configTypes) {
        for (var property in configTypes) {
          if (configTypes.hasOwnProperty(property)) {
            var expectedTypes = configTypes[property];
            var value = config[property];
            var valueType = value && isElement(value) ? 'element' : toType(value);

            if (!new RegExp(expectedTypes).test(valueType)) {
              throw new Error(componentName.toUpperCase() + ': ' + ('Option "' + property + '" provided type "' + valueType + '" ') + ('but expected type "' + expectedTypes + '".'));
            }
          }
        }
      }
    };

    setTransitionEndSupport();

    return Util;
  }(jQuery);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.0.0-alpha.6): alert.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Alert = function ($) {

    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */

    var NAME = 'alert';
    var VERSION = '4.0.0-alpha.6';
    var DATA_KEY = 'bs.alert';
    var EVENT_KEY = '.' + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $.fn[NAME];
    var TRANSITION_DURATION = 150;

    var Selector = {
      DISMISS: '[data-dismiss="alert"]'
    };

    var Event = {
      CLOSE: 'close' + EVENT_KEY,
      CLOSED: 'closed' + EVENT_KEY,
      CLICK_DATA_API: 'click' + EVENT_KEY + DATA_API_KEY
    };

    var ClassName = {
      ALERT: 'alert',
      FADE: 'fade',
      SHOW: 'show'
    };

    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

    var Alert = function () {
      function Alert(element) {
        _classCallCheck(this, Alert);

        this._element = element;
      }

      // getters

      // public

      Alert.prototype.close = function close(element) {
        element = element || this._element;

        var rootElement = this._getRootElement(element);
        var customEvent = this._triggerCloseEvent(rootElement);

        if (customEvent.isDefaultPrevented()) {
          return;
        }

        this._removeElement(rootElement);
      };

      Alert.prototype.dispose = function dispose() {
        $.removeData(this._element, DATA_KEY);
        this._element = null;
      };

      // private

      Alert.prototype._getRootElement = function _getRootElement(element) {
        var selector = Util.getSelectorFromElement(element);
        var parent = false;

        if (selector) {
          parent = $(selector)[0];
        }

        if (!parent) {
          parent = $(element).closest('.' + ClassName.ALERT)[0];
        }

        return parent;
      };

      Alert.prototype._triggerCloseEvent = function _triggerCloseEvent(element) {
        var closeEvent = $.Event(Event.CLOSE);

        $(element).trigger(closeEvent);
        return closeEvent;
      };

      Alert.prototype._removeElement = function _removeElement(element) {
        var _this2 = this;

        $(element).removeClass(ClassName.SHOW);

        if (!Util.supportsTransitionEnd() || !$(element).hasClass(ClassName.FADE)) {
          this._destroyElement(element);
          return;
        }

        $(element).one(Util.TRANSITION_END, function (event) {
          return _this2._destroyElement(element, event);
        }).emulateTransitionEnd(TRANSITION_DURATION);
      };

      Alert.prototype._destroyElement = function _destroyElement(element) {
        $(element).detach().trigger(Event.CLOSED).remove();
      };

      // static

      Alert._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var $element = $(this);
          var data = $element.data(DATA_KEY);

          if (!data) {
            data = new Alert(this);
            $element.data(DATA_KEY, data);
          }

          if (config === 'close') {
            data[config](this);
          }
        });
      };

      Alert._handleDismiss = function _handleDismiss(alertInstance) {
        return function (event) {
          if (event) {
            event.preventDefault();
          }

          alertInstance.close(this);
        };
      };

      _createClass(Alert, null, [{
        key: 'VERSION',
        get: function get() {
          return VERSION;
        }
      }]);

      return Alert;
    }();

    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */

    $(document).on(Event.CLICK_DATA_API, Selector.DISMISS, Alert._handleDismiss(new Alert()));

    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $.fn[NAME] = Alert._jQueryInterface;
    $.fn[NAME].Constructor = Alert;
    $.fn[NAME].noConflict = function () {
      $.fn[NAME] = JQUERY_NO_CONFLICT;
      return Alert._jQueryInterface;
    };

    return Alert;
  }(jQuery);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.0.0-alpha.6): button.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Button = function ($) {

    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */

    var NAME = 'button';
    var VERSION = '4.0.0-alpha.6';
    var DATA_KEY = 'bs.button';
    var EVENT_KEY = '.' + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $.fn[NAME];

    var ClassName = {
      ACTIVE: 'active',
      BUTTON: 'btn',
      FOCUS: 'focus'
    };

    var Selector = {
      DATA_TOGGLE_CARROT: '[data-toggle^="button"]',
      DATA_TOGGLE: '[data-toggle="buttons"]',
      INPUT: 'input',
      ACTIVE: '.active',
      BUTTON: '.btn'
    };

    var Event = {
      CLICK_DATA_API: 'click' + EVENT_KEY + DATA_API_KEY,
      FOCUS_BLUR_DATA_API: 'focus' + EVENT_KEY + DATA_API_KEY + ' ' + ('blur' + EVENT_KEY + DATA_API_KEY)
    };

    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

    var Button = function () {
      function Button(element) {
        _classCallCheck(this, Button);

        this._element = element;
      }

      // getters

      // public

      Button.prototype.toggle = function toggle() {
        var triggerChangeEvent = true;
        var rootElement = $(this._element).closest(Selector.DATA_TOGGLE)[0];

        if (rootElement) {
          var input = $(this._element).find(Selector.INPUT)[0];

          if (input) {
            if (input.type === 'radio') {
              if (input.checked && $(this._element).hasClass(ClassName.ACTIVE)) {
                triggerChangeEvent = false;
              } else {
                var activeElement = $(rootElement).find(Selector.ACTIVE)[0];

                if (activeElement) {
                  $(activeElement).removeClass(ClassName.ACTIVE);
                }
              }
            }

            if (triggerChangeEvent) {
              input.checked = !$(this._element).hasClass(ClassName.ACTIVE);
              $(input).trigger('change');
            }

            input.focus();
          }
        }

        this._element.setAttribute('aria-pressed', !$(this._element).hasClass(ClassName.ACTIVE));

        if (triggerChangeEvent) {
          $(this._element).toggleClass(ClassName.ACTIVE);
        }
      };

      Button.prototype.dispose = function dispose() {
        $.removeData(this._element, DATA_KEY);
        this._element = null;
      };

      // static

      Button._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $(this).data(DATA_KEY);

          if (!data) {
            data = new Button(this);
            $(this).data(DATA_KEY, data);
          }

          if (config === 'toggle') {
            data[config]();
          }
        });
      };

      _createClass(Button, null, [{
        key: 'VERSION',
        get: function get() {
          return VERSION;
        }
      }]);

      return Button;
    }();

    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */

    $(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE_CARROT, function (event) {
      event.preventDefault();

      var button = event.target;

      if (!$(button).hasClass(ClassName.BUTTON)) {
        button = $(button).closest(Selector.BUTTON);
      }

      Button._jQueryInterface.call($(button), 'toggle');
    }).on(Event.FOCUS_BLUR_DATA_API, Selector.DATA_TOGGLE_CARROT, function (event) {
      var button = $(event.target).closest(Selector.BUTTON)[0];
      $(button).toggleClass(ClassName.FOCUS, /^focus(in)?$/.test(event.type));
    });

    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $.fn[NAME] = Button._jQueryInterface;
    $.fn[NAME].Constructor = Button;
    $.fn[NAME].noConflict = function () {
      $.fn[NAME] = JQUERY_NO_CONFLICT;
      return Button._jQueryInterface;
    };

    return Button;
  }(jQuery);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.0.0-alpha.6): carousel.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Carousel = function ($) {

    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */

    var NAME = 'carousel';
    var VERSION = '4.0.0-alpha.6';
    var DATA_KEY = 'bs.carousel';
    var EVENT_KEY = '.' + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $.fn[NAME];
    var TRANSITION_DURATION = 600;
    var ARROW_LEFT_KEYCODE = 37; // KeyboardEvent.which value for left arrow key
    var ARROW_RIGHT_KEYCODE = 39; // KeyboardEvent.which value for right arrow key

    var Default = {
      interval: 5000,
      keyboard: true,
      slide: false,
      pause: 'hover',
      wrap: true
    };

    var DefaultType = {
      interval: '(number|boolean)',
      keyboard: 'boolean',
      slide: '(boolean|string)',
      pause: '(string|boolean)',
      wrap: 'boolean'
    };

    var Direction = {
      NEXT: 'next',
      PREV: 'prev',
      LEFT: 'left',
      RIGHT: 'right'
    };

    var Event = {
      SLIDE: 'slide' + EVENT_KEY,
      SLID: 'slid' + EVENT_KEY,
      KEYDOWN: 'keydown' + EVENT_KEY,
      MOUSEENTER: 'mouseenter' + EVENT_KEY,
      MOUSELEAVE: 'mouseleave' + EVENT_KEY,
      LOAD_DATA_API: 'load' + EVENT_KEY + DATA_API_KEY,
      CLICK_DATA_API: 'click' + EVENT_KEY + DATA_API_KEY
    };

    var ClassName = {
      CAROUSEL: 'carousel',
      ACTIVE: 'active',
      SLIDE: 'slide',
      RIGHT: 'carousel-item-right',
      LEFT: 'carousel-item-left',
      NEXT: 'carousel-item-next',
      PREV: 'carousel-item-prev',
      ITEM: 'carousel-item'
    };

    var Selector = {
      ACTIVE: '.active',
      ACTIVE_ITEM: '.active.carousel-item',
      ITEM: '.carousel-item',
      NEXT_PREV: '.carousel-item-next, .carousel-item-prev',
      INDICATORS: '.carousel-indicators',
      DATA_SLIDE: '[data-slide], [data-slide-to]',
      DATA_RIDE: '[data-ride="carousel"]'
    };

    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

    var Carousel = function () {
      function Carousel(element, config) {
        _classCallCheck(this, Carousel);

        this._items = null;
        this._interval = null;
        this._activeElement = null;

        this._isPaused = false;
        this._isSliding = false;

        this._config = this._getConfig(config);
        this._element = $(element)[0];
        this._indicatorsElement = $(this._element).find(Selector.INDICATORS)[0];

        this._addEventListeners();
      }

      // getters

      // public

      Carousel.prototype.next = function next() {
        if (this._isSliding) {
          throw new Error('Carousel is sliding');
        }
        this._slide(Direction.NEXT);
      };

      Carousel.prototype.nextWhenVisible = function nextWhenVisible() {
        // Don't call next when the page isn't visible
        if (!document.hidden) {
          this.next();
        }
      };

      Carousel.prototype.prev = function prev() {
        if (this._isSliding) {
          throw new Error('Carousel is sliding');
        }
        this._slide(Direction.PREVIOUS);
      };

      Carousel.prototype.pause = function pause(event) {
        if (!event) {
          this._isPaused = true;
        }

        if ($(this._element).find(Selector.NEXT_PREV)[0] && Util.supportsTransitionEnd()) {
          Util.triggerTransitionEnd(this._element);
          this.cycle(true);
        }

        clearInterval(this._interval);
        this._interval = null;
      };

      Carousel.prototype.cycle = function cycle(event) {
        if (!event) {
          this._isPaused = false;
        }

        if (this._interval) {
          clearInterval(this._interval);
          this._interval = null;
        }

        if (this._config.interval && !this._isPaused) {
          this._interval = setInterval((document.visibilityState ? this.nextWhenVisible : this.next).bind(this), this._config.interval);
        }
      };

      Carousel.prototype.to = function to(index) {
        var _this3 = this;

        this._activeElement = $(this._element).find(Selector.ACTIVE_ITEM)[0];

        var activeIndex = this._getItemIndex(this._activeElement);

        if (index > this._items.length - 1 || index < 0) {
          return;
        }

        if (this._isSliding) {
          $(this._element).one(Event.SLID, function () {
            return _this3.to(index);
          });
          return;
        }

        if (activeIndex === index) {
          this.pause();
          this.cycle();
          return;
        }

        var direction = index > activeIndex ? Direction.NEXT : Direction.PREVIOUS;

        this._slide(direction, this._items[index]);
      };

      Carousel.prototype.dispose = function dispose() {
        $(this._element).off(EVENT_KEY);
        $.removeData(this._element, DATA_KEY);

        this._items = null;
        this._config = null;
        this._element = null;
        this._interval = null;
        this._isPaused = null;
        this._isSliding = null;
        this._activeElement = null;
        this._indicatorsElement = null;
      };

      // private

      Carousel.prototype._getConfig = function _getConfig(config) {
        config = $.extend({}, Default, config);
        Util.typeCheckConfig(NAME, config, DefaultType);
        return config;
      };

      Carousel.prototype._addEventListeners = function _addEventListeners() {
        var _this4 = this;

        if (this._config.keyboard) {
          $(this._element).on(Event.KEYDOWN, function (event) {
            return _this4._keydown(event);
          });
        }

        if (this._config.pause === 'hover' && !('ontouchstart' in document.documentElement)) {
          $(this._element).on(Event.MOUSEENTER, function (event) {
            return _this4.pause(event);
          }).on(Event.MOUSELEAVE, function (event) {
            return _this4.cycle(event);
          });
        }
      };

      Carousel.prototype._keydown = function _keydown(event) {
        if (/input|textarea/i.test(event.target.tagName)) {
          return;
        }

        switch (event.which) {
          case ARROW_LEFT_KEYCODE:
            event.preventDefault();
            this.prev();
            break;
          case ARROW_RIGHT_KEYCODE:
            event.preventDefault();
            this.next();
            break;
          default:
            return;
        }
      };

      Carousel.prototype._getItemIndex = function _getItemIndex(element) {
        this._items = $.makeArray($(element).parent().find(Selector.ITEM));
        return this._items.indexOf(element);
      };

      Carousel.prototype._getItemByDirection = function _getItemByDirection(direction, activeElement) {
        var isNextDirection = direction === Direction.NEXT;
        var isPrevDirection = direction === Direction.PREVIOUS;
        var activeIndex = this._getItemIndex(activeElement);
        var lastItemIndex = this._items.length - 1;
        var isGoingToWrap = isPrevDirection && activeIndex === 0 || isNextDirection && activeIndex === lastItemIndex;

        if (isGoingToWrap && !this._config.wrap) {
          return activeElement;
        }

        var delta = direction === Direction.PREVIOUS ? -1 : 1;
        var itemIndex = (activeIndex + delta) % this._items.length;

        return itemIndex === -1 ? this._items[this._items.length - 1] : this._items[itemIndex];
      };

      Carousel.prototype._triggerSlideEvent = function _triggerSlideEvent(relatedTarget, eventDirectionName) {
        var slideEvent = $.Event(Event.SLIDE, {
          relatedTarget: relatedTarget,
          direction: eventDirectionName
        });

        $(this._element).trigger(slideEvent);

        return slideEvent;
      };

      Carousel.prototype._setActiveIndicatorElement = function _setActiveIndicatorElement(element) {
        if (this._indicatorsElement) {
          $(this._indicatorsElement).find(Selector.ACTIVE).removeClass(ClassName.ACTIVE);

          var nextIndicator = this._indicatorsElement.children[this._getItemIndex(element)];

          if (nextIndicator) {
            $(nextIndicator).addClass(ClassName.ACTIVE);
          }
        }
      };

      Carousel.prototype._slide = function _slide(direction, element) {
        var _this5 = this;

        var activeElement = $(this._element).find(Selector.ACTIVE_ITEM)[0];
        var nextElement = element || activeElement && this._getItemByDirection(direction, activeElement);

        var isCycling = Boolean(this._interval);

        var directionalClassName = void 0;
        var orderClassName = void 0;
        var eventDirectionName = void 0;

        if (direction === Direction.NEXT) {
          directionalClassName = ClassName.LEFT;
          orderClassName = ClassName.NEXT;
          eventDirectionName = Direction.LEFT;
        } else {
          directionalClassName = ClassName.RIGHT;
          orderClassName = ClassName.PREV;
          eventDirectionName = Direction.RIGHT;
        }

        if (nextElement && $(nextElement).hasClass(ClassName.ACTIVE)) {
          this._isSliding = false;
          return;
        }

        var slideEvent = this._triggerSlideEvent(nextElement, eventDirectionName);
        if (slideEvent.isDefaultPrevented()) {
          return;
        }

        if (!activeElement || !nextElement) {
          // some weirdness is happening, so we bail
          return;
        }

        this._isSliding = true;

        if (isCycling) {
          this.pause();
        }

        this._setActiveIndicatorElement(nextElement);

        var slidEvent = $.Event(Event.SLID, {
          relatedTarget: nextElement,
          direction: eventDirectionName
        });

        if (Util.supportsTransitionEnd() && $(this._element).hasClass(ClassName.SLIDE)) {

          $(nextElement).addClass(orderClassName);

          Util.reflow(nextElement);

          $(activeElement).addClass(directionalClassName);
          $(nextElement).addClass(directionalClassName);

          $(activeElement).one(Util.TRANSITION_END, function () {
            $(nextElement).removeClass(directionalClassName + ' ' + orderClassName).addClass(ClassName.ACTIVE);

            $(activeElement).removeClass(ClassName.ACTIVE + ' ' + orderClassName + ' ' + directionalClassName);

            _this5._isSliding = false;

            setTimeout(function () {
              return $(_this5._element).trigger(slidEvent);
            }, 0);
          }).emulateTransitionEnd(TRANSITION_DURATION);
        } else {
          $(activeElement).removeClass(ClassName.ACTIVE);
          $(nextElement).addClass(ClassName.ACTIVE);

          this._isSliding = false;
          $(this._element).trigger(slidEvent);
        }

        if (isCycling) {
          this.cycle();
        }
      };

      // static

      Carousel._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $(this).data(DATA_KEY);
          var _config = $.extend({}, Default, $(this).data());

          if ((typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object') {
            $.extend(_config, config);
          }

          var action = typeof config === 'string' ? config : _config.slide;

          if (!data) {
            data = new Carousel(this, _config);
            $(this).data(DATA_KEY, data);
          }

          if (typeof config === 'number') {
            data.to(config);
          } else if (typeof action === 'string') {
            if (data[action] === undefined) {
              throw new Error('No method named "' + action + '"');
            }
            data[action]();
          } else if (_config.interval) {
            data.pause();
            data.cycle();
          }
        });
      };

      Carousel._dataApiClickHandler = function _dataApiClickHandler(event) {
        var selector = Util.getSelectorFromElement(this);

        if (!selector) {
          return;
        }

        var target = $(selector)[0];

        if (!target || !$(target).hasClass(ClassName.CAROUSEL)) {
          return;
        }

        var config = $.extend({}, $(target).data(), $(this).data());
        var slideIndex = this.getAttribute('data-slide-to');

        if (slideIndex) {
          config.interval = false;
        }

        Carousel._jQueryInterface.call($(target), config);

        if (slideIndex) {
          $(target).data(DATA_KEY).to(slideIndex);
        }

        event.preventDefault();
      };

      _createClass(Carousel, null, [{
        key: 'VERSION',
        get: function get() {
          return VERSION;
        }
      }, {
        key: 'Default',
        get: function get() {
          return Default;
        }
      }]);

      return Carousel;
    }();

    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */

    $(document).on(Event.CLICK_DATA_API, Selector.DATA_SLIDE, Carousel._dataApiClickHandler);

    $(window).on(Event.LOAD_DATA_API, function () {
      $(Selector.DATA_RIDE).each(function () {
        var $carousel = $(this);
        Carousel._jQueryInterface.call($carousel, $carousel.data());
      });
    });

    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $.fn[NAME] = Carousel._jQueryInterface;
    $.fn[NAME].Constructor = Carousel;
    $.fn[NAME].noConflict = function () {
      $.fn[NAME] = JQUERY_NO_CONFLICT;
      return Carousel._jQueryInterface;
    };

    return Carousel;
  }(jQuery);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.0.0-alpha.6): collapse.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Collapse = function ($) {

    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */

    var NAME = 'collapse';
    var VERSION = '4.0.0-alpha.6';
    var DATA_KEY = 'bs.collapse';
    var EVENT_KEY = '.' + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $.fn[NAME];
    var TRANSITION_DURATION = 600;

    var Default = {
      toggle: true,
      parent: ''
    };

    var DefaultType = {
      toggle: 'boolean',
      parent: 'string'
    };

    var Event = {
      SHOW: 'show' + EVENT_KEY,
      SHOWN: 'shown' + EVENT_KEY,
      HIDE: 'hide' + EVENT_KEY,
      HIDDEN: 'hidden' + EVENT_KEY,
      CLICK_DATA_API: 'click' + EVENT_KEY + DATA_API_KEY
    };

    var ClassName = {
      SHOW: 'show',
      COLLAPSE: 'collapse',
      COLLAPSING: 'collapsing',
      COLLAPSED: 'collapsed'
    };

    var Dimension = {
      WIDTH: 'width',
      HEIGHT: 'height'
    };

    var Selector = {
      ACTIVES: '.card > .show, .card > .collapsing',
      DATA_TOGGLE: '[data-toggle="collapse"]'
    };

    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

    var Collapse = function () {
      function Collapse(element, config) {
        _classCallCheck(this, Collapse);

        this._isTransitioning = false;
        this._element = element;
        this._config = this._getConfig(config);
        this._triggerArray = $.makeArray($('[data-toggle="collapse"][href="#' + element.id + '"],' + ('[data-toggle="collapse"][data-target="#' + element.id + '"]')));

        this._parent = this._config.parent ? this._getParent() : null;

        if (!this._config.parent) {
          this._addAriaAndCollapsedClass(this._element, this._triggerArray);
        }

        if (this._config.toggle) {
          this.toggle();
        }
      }

      // getters

      // public

      Collapse.prototype.toggle = function toggle() {
        if ($(this._element).hasClass(ClassName.SHOW)) {
          this.hide();
        } else {
          this.show();
        }
      };

      Collapse.prototype.show = function show() {
        var _this6 = this;

        if (this._isTransitioning) {
          throw new Error('Collapse is transitioning');
        }

        if ($(this._element).hasClass(ClassName.SHOW)) {
          return;
        }

        var actives = void 0;
        var activesData = void 0;

        if (this._parent) {
          actives = $.makeArray($(this._parent).find(Selector.ACTIVES));
          if (!actives.length) {
            actives = null;
          }
        }

        if (actives) {
          activesData = $(actives).data(DATA_KEY);
          if (activesData && activesData._isTransitioning) {
            return;
          }
        }

        var startEvent = $.Event(Event.SHOW);
        $(this._element).trigger(startEvent);
        if (startEvent.isDefaultPrevented()) {
          return;
        }

        if (actives) {
          Collapse._jQueryInterface.call($(actives), 'hide');
          if (!activesData) {
            $(actives).data(DATA_KEY, null);
          }
        }

        var dimension = this._getDimension();

        $(this._element).removeClass(ClassName.COLLAPSE).addClass(ClassName.COLLAPSING);

        this._element.style[dimension] = 0;
        this._element.setAttribute('aria-expanded', true);

        if (this._triggerArray.length) {
          $(this._triggerArray).removeClass(ClassName.COLLAPSED).attr('aria-expanded', true);
        }

        this.setTransitioning(true);

        var complete = function complete() {
          $(_this6._element).removeClass(ClassName.COLLAPSING).addClass(ClassName.COLLAPSE).addClass(ClassName.SHOW);

          _this6._element.style[dimension] = '';

          _this6.setTransitioning(false);

          $(_this6._element).trigger(Event.SHOWN);
        };

        if (!Util.supportsTransitionEnd()) {
          complete();
          return;
        }

        var capitalizedDimension = dimension[0].toUpperCase() + dimension.slice(1);
        var scrollSize = 'scroll' + capitalizedDimension;

        $(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(TRANSITION_DURATION);

        this._element.style[dimension] = this._element[scrollSize] + 'px';
      };

      Collapse.prototype.hide = function hide() {
        var _this7 = this;

        if (this._isTransitioning) {
          throw new Error('Collapse is transitioning');
        }

        if (!$(this._element).hasClass(ClassName.SHOW)) {
          return;
        }

        var startEvent = $.Event(Event.HIDE);
        $(this._element).trigger(startEvent);
        if (startEvent.isDefaultPrevented()) {
          return;
        }

        var dimension = this._getDimension();
        var offsetDimension = dimension === Dimension.WIDTH ? 'offsetWidth' : 'offsetHeight';

        this._element.style[dimension] = this._element[offsetDimension] + 'px';

        Util.reflow(this._element);

        $(this._element).addClass(ClassName.COLLAPSING).removeClass(ClassName.COLLAPSE).removeClass(ClassName.SHOW);

        this._element.setAttribute('aria-expanded', false);

        if (this._triggerArray.length) {
          $(this._triggerArray).addClass(ClassName.COLLAPSED).attr('aria-expanded', false);
        }

        this.setTransitioning(true);

        var complete = function complete() {
          _this7.setTransitioning(false);
          $(_this7._element).removeClass(ClassName.COLLAPSING).addClass(ClassName.COLLAPSE).trigger(Event.HIDDEN);
        };

        this._element.style[dimension] = '';

        if (!Util.supportsTransitionEnd()) {
          complete();
          return;
        }

        $(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(TRANSITION_DURATION);
      };

      Collapse.prototype.setTransitioning = function setTransitioning(isTransitioning) {
        this._isTransitioning = isTransitioning;
      };

      Collapse.prototype.dispose = function dispose() {
        $.removeData(this._element, DATA_KEY);

        this._config = null;
        this._parent = null;
        this._element = null;
        this._triggerArray = null;
        this._isTransitioning = null;
      };

      // private

      Collapse.prototype._getConfig = function _getConfig(config) {
        config = $.extend({}, Default, config);
        config.toggle = Boolean(config.toggle); // coerce string values
        Util.typeCheckConfig(NAME, config, DefaultType);
        return config;
      };

      Collapse.prototype._getDimension = function _getDimension() {
        var hasWidth = $(this._element).hasClass(Dimension.WIDTH);
        return hasWidth ? Dimension.WIDTH : Dimension.HEIGHT;
      };

      Collapse.prototype._getParent = function _getParent() {
        var _this8 = this;

        var parent = $(this._config.parent)[0];
        var selector = '[data-toggle="collapse"][data-parent="' + this._config.parent + '"]';

        $(parent).find(selector).each(function (i, element) {
          _this8._addAriaAndCollapsedClass(Collapse._getTargetFromElement(element), [element]);
        });

        return parent;
      };

      Collapse.prototype._addAriaAndCollapsedClass = function _addAriaAndCollapsedClass(element, triggerArray) {
        if (element) {
          var isOpen = $(element).hasClass(ClassName.SHOW);
          element.setAttribute('aria-expanded', isOpen);

          if (triggerArray.length) {
            $(triggerArray).toggleClass(ClassName.COLLAPSED, !isOpen).attr('aria-expanded', isOpen);
          }
        }
      };

      // static

      Collapse._getTargetFromElement = function _getTargetFromElement(element) {
        var selector = Util.getSelectorFromElement(element);
        return selector ? $(selector)[0] : null;
      };

      Collapse._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var $this = $(this);
          var data = $this.data(DATA_KEY);
          var _config = $.extend({}, Default, $this.data(), (typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object' && config);

          if (!data && _config.toggle && /show|hide/.test(config)) {
            _config.toggle = false;
          }

          if (!data) {
            data = new Collapse(this, _config);
            $this.data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (data[config] === undefined) {
              throw new Error('No method named "' + config + '"');
            }
            data[config]();
          }
        });
      };

      _createClass(Collapse, null, [{
        key: 'VERSION',
        get: function get() {
          return VERSION;
        }
      }, {
        key: 'Default',
        get: function get() {
          return Default;
        }
      }]);

      return Collapse;
    }();

    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */

    $(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
      event.preventDefault();

      var target = Collapse._getTargetFromElement(this);
      var data = $(target).data(DATA_KEY);
      var config = data ? 'toggle' : $(this).data();

      Collapse._jQueryInterface.call($(target), config);
    });

    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $.fn[NAME] = Collapse._jQueryInterface;
    $.fn[NAME].Constructor = Collapse;
    $.fn[NAME].noConflict = function () {
      $.fn[NAME] = JQUERY_NO_CONFLICT;
      return Collapse._jQueryInterface;
    };

    return Collapse;
  }(jQuery);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.0.0-alpha.6): dropdown.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Dropdown = function ($) {

    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */

    var NAME = 'dropdown';
    var VERSION = '4.0.0-alpha.6';
    var DATA_KEY = 'bs.dropdown';
    var EVENT_KEY = '.' + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $.fn[NAME];
    var ESCAPE_KEYCODE = 27; // KeyboardEvent.which value for Escape (Esc) key
    var ARROW_UP_KEYCODE = 38; // KeyboardEvent.which value for up arrow key
    var ARROW_DOWN_KEYCODE = 40; // KeyboardEvent.which value for down arrow key
    var RIGHT_MOUSE_BUTTON_WHICH = 3; // MouseEvent.which value for the right button (assuming a right-handed mouse)

    var Event = {
      HIDE: 'hide' + EVENT_KEY,
      HIDDEN: 'hidden' + EVENT_KEY,
      SHOW: 'show' + EVENT_KEY,
      SHOWN: 'shown' + EVENT_KEY,
      CLICK: 'click' + EVENT_KEY,
      CLICK_DATA_API: 'click' + EVENT_KEY + DATA_API_KEY,
      FOCUSIN_DATA_API: 'focusin' + EVENT_KEY + DATA_API_KEY,
      KEYDOWN_DATA_API: 'keydown' + EVENT_KEY + DATA_API_KEY
    };

    var ClassName = {
      BACKDROP: 'dropdown-backdrop',
      DISABLED: 'disabled',
      SHOW: 'show'
    };

    var Selector = {
      BACKDROP: '.dropdown-backdrop',
      DATA_TOGGLE: '[data-toggle="dropdown"]',
      FORM_CHILD: '.dropdown form',
      ROLE_MENU: '[role="menu"]',
      ROLE_LISTBOX: '[role="listbox"]',
      NAVBAR_NAV: '.navbar-nav',
      VISIBLE_ITEMS: '[role="menu"] li:not(.disabled) a, ' + '[role="listbox"] li:not(.disabled) a'
    };

    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

    var Dropdown = function () {
      function Dropdown(element) {
        _classCallCheck(this, Dropdown);

        this._element = element;

        this._addEventListeners();
      }

      // getters

      // public

      Dropdown.prototype.toggle = function toggle() {
        if (this.disabled || $(this).hasClass(ClassName.DISABLED)) {
          return false;
        }

        var parent = Dropdown._getParentFromElement(this);
        var isActive = $(parent).hasClass(ClassName.SHOW);

        Dropdown._clearMenus();

        if (isActive) {
          return false;
        }

        if ('ontouchstart' in document.documentElement && !$(parent).closest(Selector.NAVBAR_NAV).length) {

          // if mobile we use a backdrop because click events don't delegate
          var dropdown = document.createElement('div');
          dropdown.className = ClassName.BACKDROP;
          $(dropdown).insertBefore(this);
          $(dropdown).on('click', Dropdown._clearMenus);
        }

        var relatedTarget = {
          relatedTarget: this
        };
        var showEvent = $.Event(Event.SHOW, relatedTarget);

        $(parent).trigger(showEvent);

        if (showEvent.isDefaultPrevented()) {
          return false;
        }

        this.focus();
        this.setAttribute('aria-expanded', true);

        $(parent).toggleClass(ClassName.SHOW);
        $(parent).trigger($.Event(Event.SHOWN, relatedTarget));

        return false;
      };

      Dropdown.prototype.dispose = function dispose() {
        $.removeData(this._element, DATA_KEY);
        $(this._element).off(EVENT_KEY);
        this._element = null;
      };

      // private

      Dropdown.prototype._addEventListeners = function _addEventListeners() {
        $(this._element).on(Event.CLICK, this.toggle);
      };

      // static

      Dropdown._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $(this).data(DATA_KEY);

          if (!data) {
            data = new Dropdown(this);
            $(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (data[config] === undefined) {
              throw new Error('No method named "' + config + '"');
            }
            data[config].call(this);
          }
        });
      };

      Dropdown._clearMenus = function _clearMenus(event) {
        if (event && event.which === RIGHT_MOUSE_BUTTON_WHICH) {
          return;
        }

        var backdrop = $(Selector.BACKDROP)[0];
        if (backdrop) {
          backdrop.parentNode.removeChild(backdrop);
        }

        var toggles = $.makeArray($(Selector.DATA_TOGGLE));

        for (var i = 0; i < toggles.length; i++) {
          var parent = Dropdown._getParentFromElement(toggles[i]);
          var relatedTarget = {
            relatedTarget: toggles[i]
          };

          if (!$(parent).hasClass(ClassName.SHOW)) {
            continue;
          }

          if (event && (event.type === 'click' && /input|textarea/i.test(event.target.tagName) || event.type === 'focusin') && $.contains(parent, event.target)) {
            continue;
          }

          var hideEvent = $.Event(Event.HIDE, relatedTarget);
          $(parent).trigger(hideEvent);
          if (hideEvent.isDefaultPrevented()) {
            continue;
          }

          toggles[i].setAttribute('aria-expanded', 'false');

          $(parent).removeClass(ClassName.SHOW).trigger($.Event(Event.HIDDEN, relatedTarget));
        }
      };

      Dropdown._getParentFromElement = function _getParentFromElement(element) {
        var parent = void 0;
        var selector = Util.getSelectorFromElement(element);

        if (selector) {
          parent = $(selector)[0];
        }

        return parent || element.parentNode;
      };

      Dropdown._dataApiKeydownHandler = function _dataApiKeydownHandler(event) {
        if (!/(38|40|27|32)/.test(event.which) || /input|textarea/i.test(event.target.tagName)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (this.disabled || $(this).hasClass(ClassName.DISABLED)) {
          return;
        }

        var parent = Dropdown._getParentFromElement(this);
        var isActive = $(parent).hasClass(ClassName.SHOW);

        if (!isActive && event.which !== ESCAPE_KEYCODE || isActive && event.which === ESCAPE_KEYCODE) {

          if (event.which === ESCAPE_KEYCODE) {
            var toggle = $(parent).find(Selector.DATA_TOGGLE)[0];
            $(toggle).trigger('focus');
          }

          $(this).trigger('click');
          return;
        }

        var items = $(parent).find(Selector.VISIBLE_ITEMS).get();

        if (!items.length) {
          return;
        }

        var index = items.indexOf(event.target);

        if (event.which === ARROW_UP_KEYCODE && index > 0) {
          // up
          index--;
        }

        if (event.which === ARROW_DOWN_KEYCODE && index < items.length - 1) {
          // down
          index++;
        }

        if (index < 0) {
          index = 0;
        }

        items[index].focus();
      };

      _createClass(Dropdown, null, [{
        key: 'VERSION',
        get: function get() {
          return VERSION;
        }
      }]);

      return Dropdown;
    }();

    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */

    $(document).on(Event.KEYDOWN_DATA_API, Selector.DATA_TOGGLE, Dropdown._dataApiKeydownHandler).on(Event.KEYDOWN_DATA_API, Selector.ROLE_MENU, Dropdown._dataApiKeydownHandler).on(Event.KEYDOWN_DATA_API, Selector.ROLE_LISTBOX, Dropdown._dataApiKeydownHandler).on(Event.CLICK_DATA_API + ' ' + Event.FOCUSIN_DATA_API, Dropdown._clearMenus).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, Dropdown.prototype.toggle).on(Event.CLICK_DATA_API, Selector.FORM_CHILD, function (e) {
      e.stopPropagation();
    });

    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $.fn[NAME] = Dropdown._jQueryInterface;
    $.fn[NAME].Constructor = Dropdown;
    $.fn[NAME].noConflict = function () {
      $.fn[NAME] = JQUERY_NO_CONFLICT;
      return Dropdown._jQueryInterface;
    };

    return Dropdown;
  }(jQuery);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.0.0-alpha.6): modal.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Modal = function ($) {

    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */

    var NAME = 'modal';
    var VERSION = '4.0.0-alpha.6';
    var DATA_KEY = 'bs.modal';
    var EVENT_KEY = '.' + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $.fn[NAME];
    var TRANSITION_DURATION = 300;
    var BACKDROP_TRANSITION_DURATION = 150;
    var ESCAPE_KEYCODE = 27; // KeyboardEvent.which value for Escape (Esc) key

    var Default = {
      backdrop: true,
      keyboard: true,
      focus: true,
      show: true
    };

    var DefaultType = {
      backdrop: '(boolean|string)',
      keyboard: 'boolean',
      focus: 'boolean',
      show: 'boolean'
    };

    var Event = {
      HIDE: 'hide' + EVENT_KEY,
      HIDDEN: 'hidden' + EVENT_KEY,
      SHOW: 'show' + EVENT_KEY,
      SHOWN: 'shown' + EVENT_KEY,
      FOCUSIN: 'focusin' + EVENT_KEY,
      RESIZE: 'resize' + EVENT_KEY,
      CLICK_DISMISS: 'click.dismiss' + EVENT_KEY,
      KEYDOWN_DISMISS: 'keydown.dismiss' + EVENT_KEY,
      MOUSEUP_DISMISS: 'mouseup.dismiss' + EVENT_KEY,
      MOUSEDOWN_DISMISS: 'mousedown.dismiss' + EVENT_KEY,
      CLICK_DATA_API: 'click' + EVENT_KEY + DATA_API_KEY
    };

    var ClassName = {
      SCROLLBAR_MEASURER: 'modal-scrollbar-measure',
      BACKDROP: 'modal-backdrop',
      OPEN: 'modal-open',
      FADE: 'fade',
      SHOW: 'show'
    };

    var Selector = {
      DIALOG: '.modal-dialog',
      DATA_TOGGLE: '[data-toggle="modal"]',
      DATA_DISMISS: '[data-dismiss="modal"]',
      FIXED_CONTENT: '.fixed-top, .fixed-bottom, .is-fixed, .sticky-top'
    };

    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

    var Modal = function () {
      function Modal(element, config) {
        _classCallCheck(this, Modal);

        this._config = this._getConfig(config);
        this._element = element;
        this._dialog = $(element).find(Selector.DIALOG)[0];
        this._backdrop = null;
        this._isShown = false;
        this._isBodyOverflowing = false;
        this._ignoreBackdropClick = false;
        this._isTransitioning = false;
        this._originalBodyPadding = 0;
        this._scrollbarWidth = 0;
      }

      // getters

      // public

      Modal.prototype.toggle = function toggle(relatedTarget) {
        return this._isShown ? this.hide() : this.show(relatedTarget);
      };

      Modal.prototype.show = function show(relatedTarget) {
        var _this9 = this;

        if (this._isTransitioning) {
          throw new Error('Modal is transitioning');
        }

        if (Util.supportsTransitionEnd() && $(this._element).hasClass(ClassName.FADE)) {
          this._isTransitioning = true;
        }
        var showEvent = $.Event(Event.SHOW, {
          relatedTarget: relatedTarget
        });

        $(this._element).trigger(showEvent);

        if (this._isShown || showEvent.isDefaultPrevented()) {
          return;
        }

        this._isShown = true;

        this._checkScrollbar();
        this._setScrollbar();

        $(document.body).addClass(ClassName.OPEN);

        this._setEscapeEvent();
        this._setResizeEvent();

        $(this._element).on(Event.CLICK_DISMISS, Selector.DATA_DISMISS, function (event) {
          return _this9.hide(event);
        });

        $(this._dialog).on(Event.MOUSEDOWN_DISMISS, function () {
          $(_this9._element).one(Event.MOUSEUP_DISMISS, function (event) {
            if ($(event.target).is(_this9._element)) {
              _this9._ignoreBackdropClick = true;
            }
          });
        });

        this._showBackdrop(function () {
          return _this9._showElement(relatedTarget);
        });
      };

      Modal.prototype.hide = function hide(event) {
        var _this10 = this;

        if (event) {
          event.preventDefault();
        }

        if (this._isTransitioning) {
          throw new Error('Modal is transitioning');
        }

        var transition = Util.supportsTransitionEnd() && $(this._element).hasClass(ClassName.FADE);
        if (transition) {
          this._isTransitioning = true;
        }

        var hideEvent = $.Event(Event.HIDE);
        $(this._element).trigger(hideEvent);

        if (!this._isShown || hideEvent.isDefaultPrevented()) {
          return;
        }

        this._isShown = false;

        this._setEscapeEvent();
        this._setResizeEvent();

        $(document).off(Event.FOCUSIN);

        $(this._element).removeClass(ClassName.SHOW);

        $(this._element).off(Event.CLICK_DISMISS);
        $(this._dialog).off(Event.MOUSEDOWN_DISMISS);

        if (transition) {
          $(this._element).one(Util.TRANSITION_END, function (event) {
            return _this10._hideModal(event);
          }).emulateTransitionEnd(TRANSITION_DURATION);
        } else {
          this._hideModal();
        }
      };

      Modal.prototype.dispose = function dispose() {
        $.removeData(this._element, DATA_KEY);

        $(window, document, this._element, this._backdrop).off(EVENT_KEY);

        this._config = null;
        this._element = null;
        this._dialog = null;
        this._backdrop = null;
        this._isShown = null;
        this._isBodyOverflowing = null;
        this._ignoreBackdropClick = null;
        this._originalBodyPadding = null;
        this._scrollbarWidth = null;
      };

      // private

      Modal.prototype._getConfig = function _getConfig(config) {
        config = $.extend({}, Default, config);
        Util.typeCheckConfig(NAME, config, DefaultType);
        return config;
      };

      Modal.prototype._showElement = function _showElement(relatedTarget) {
        var _this11 = this;

        var transition = Util.supportsTransitionEnd() && $(this._element).hasClass(ClassName.FADE);

        if (!this._element.parentNode || this._element.parentNode.nodeType !== Node.ELEMENT_NODE) {
          // don't move modals dom position
          document.body.appendChild(this._element);
        }

        this._element.style.display = 'block';
        this._element.removeAttribute('aria-hidden');
        this._element.scrollTop = 0;

        if (transition) {
          Util.reflow(this._element);
        }

        $(this._element).addClass(ClassName.SHOW);

        if (this._config.focus) {
          this._enforceFocus();
        }

        var shownEvent = $.Event(Event.SHOWN, {
          relatedTarget: relatedTarget
        });

        var transitionComplete = function transitionComplete() {
          if (_this11._config.focus) {
            _this11._element.focus();
          }
          _this11._isTransitioning = false;
          $(_this11._element).trigger(shownEvent);
        };

        if (transition) {
          $(this._dialog).one(Util.TRANSITION_END, transitionComplete).emulateTransitionEnd(TRANSITION_DURATION);
        } else {
          transitionComplete();
        }
      };

      Modal.prototype._enforceFocus = function _enforceFocus() {
        var _this12 = this;

        $(document).off(Event.FOCUSIN) // guard against infinite focus loop
        .on(Event.FOCUSIN, function (event) {
          if (document !== event.target && _this12._element !== event.target && !$(_this12._element).has(event.target).length) {
            _this12._element.focus();
          }
        });
      };

      Modal.prototype._setEscapeEvent = function _setEscapeEvent() {
        var _this13 = this;

        if (this._isShown && this._config.keyboard) {
          $(this._element).on(Event.KEYDOWN_DISMISS, function (event) {
            if (event.which === ESCAPE_KEYCODE) {
              _this13.hide();
            }
          });
        } else if (!this._isShown) {
          $(this._element).off(Event.KEYDOWN_DISMISS);
        }
      };

      Modal.prototype._setResizeEvent = function _setResizeEvent() {
        var _this14 = this;

        if (this._isShown) {
          $(window).on(Event.RESIZE, function (event) {
            return _this14._handleUpdate(event);
          });
        } else {
          $(window).off(Event.RESIZE);
        }
      };

      Modal.prototype._hideModal = function _hideModal() {
        var _this15 = this;

        this._element.style.display = 'none';
        this._element.setAttribute('aria-hidden', 'true');
        this._isTransitioning = false;
        this._showBackdrop(function () {
          $(document.body).removeClass(ClassName.OPEN);
          _this15._resetAdjustments();
          _this15._resetScrollbar();
          $(_this15._element).trigger(Event.HIDDEN);
        });
      };

      Modal.prototype._removeBackdrop = function _removeBackdrop() {
        if (this._backdrop) {
          $(this._backdrop).remove();
          this._backdrop = null;
        }
      };

      Modal.prototype._showBackdrop = function _showBackdrop(callback) {
        var _this16 = this;

        var animate = $(this._element).hasClass(ClassName.FADE) ? ClassName.FADE : '';

        if (this._isShown && this._config.backdrop) {
          var doAnimate = Util.supportsTransitionEnd() && animate;

          this._backdrop = document.createElement('div');
          this._backdrop.className = ClassName.BACKDROP;

          if (animate) {
            $(this._backdrop).addClass(animate);
          }

          $(this._backdrop).appendTo(document.body);

          $(this._element).on(Event.CLICK_DISMISS, function (event) {
            if (_this16._ignoreBackdropClick) {
              _this16._ignoreBackdropClick = false;
              return;
            }
            if (event.target !== event.currentTarget) {
              return;
            }
            if (_this16._config.backdrop === 'static') {
              _this16._element.focus();
            } else {
              _this16.hide();
            }
          });

          if (doAnimate) {
            Util.reflow(this._backdrop);
          }

          $(this._backdrop).addClass(ClassName.SHOW);

          if (!callback) {
            return;
          }

          if (!doAnimate) {
            callback();
            return;
          }

          $(this._backdrop).one(Util.TRANSITION_END, callback).emulateTransitionEnd(BACKDROP_TRANSITION_DURATION);
        } else if (!this._isShown && this._backdrop) {
          $(this._backdrop).removeClass(ClassName.SHOW);

          var callbackRemove = function callbackRemove() {
            _this16._removeBackdrop();
            if (callback) {
              callback();
            }
          };

          if (Util.supportsTransitionEnd() && $(this._element).hasClass(ClassName.FADE)) {
            $(this._backdrop).one(Util.TRANSITION_END, callbackRemove).emulateTransitionEnd(BACKDROP_TRANSITION_DURATION);
          } else {
            callbackRemove();
          }
        } else if (callback) {
          callback();
        }
      };

      // ----------------------------------------------------------------------
      // the following methods are used to handle overflowing modals
      // todo (fat): these should probably be refactored out of modal.js
      // ----------------------------------------------------------------------

      Modal.prototype._handleUpdate = function _handleUpdate() {
        this._adjustDialog();
      };

      Modal.prototype._adjustDialog = function _adjustDialog() {
        var isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight;

        if (!this._isBodyOverflowing && isModalOverflowing) {
          this._element.style.paddingLeft = this._scrollbarWidth + 'px';
        }

        if (this._isBodyOverflowing && !isModalOverflowing) {
          this._element.style.paddingRight = this._scrollbarWidth + 'px';
        }
      };

      Modal.prototype._resetAdjustments = function _resetAdjustments() {
        this._element.style.paddingLeft = '';
        this._element.style.paddingRight = '';
      };

      Modal.prototype._checkScrollbar = function _checkScrollbar() {
        this._isBodyOverflowing = document.body.clientWidth < window.innerWidth;
        this._scrollbarWidth = this._getScrollbarWidth();
      };

      Modal.prototype._setScrollbar = function _setScrollbar() {
        var bodyPadding = parseInt($(Selector.FIXED_CONTENT).css('padding-right') || 0, 10);

        this._originalBodyPadding = document.body.style.paddingRight || '';

        if (this._isBodyOverflowing) {
          document.body.style.paddingRight = bodyPadding + this._scrollbarWidth + 'px';
        }
      };

      Modal.prototype._resetScrollbar = function _resetScrollbar() {
        document.body.style.paddingRight = this._originalBodyPadding;
      };

      Modal.prototype._getScrollbarWidth = function _getScrollbarWidth() {
        // thx d.walsh
        var scrollDiv = document.createElement('div');
        scrollDiv.className = ClassName.SCROLLBAR_MEASURER;
        document.body.appendChild(scrollDiv);
        var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
        document.body.removeChild(scrollDiv);
        return scrollbarWidth;
      };

      // static

      Modal._jQueryInterface = function _jQueryInterface(config, relatedTarget) {
        return this.each(function () {
          var data = $(this).data(DATA_KEY);
          var _config = $.extend({}, Modal.Default, $(this).data(), (typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object' && config);

          if (!data) {
            data = new Modal(this, _config);
            $(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (data[config] === undefined) {
              throw new Error('No method named "' + config + '"');
            }
            data[config](relatedTarget);
          } else if (_config.show) {
            data.show(relatedTarget);
          }
        });
      };

      _createClass(Modal, null, [{
        key: 'VERSION',
        get: function get() {
          return VERSION;
        }
      }, {
        key: 'Default',
        get: function get() {
          return Default;
        }
      }]);

      return Modal;
    }();

    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */

    $(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
      var _this17 = this;

      var target = void 0;
      var selector = Util.getSelectorFromElement(this);

      if (selector) {
        target = $(selector)[0];
      }

      var config = $(target).data(DATA_KEY) ? 'toggle' : $.extend({}, $(target).data(), $(this).data());

      if (this.tagName === 'A' || this.tagName === 'AREA') {
        event.preventDefault();
      }

      var $target = $(target).one(Event.SHOW, function (showEvent) {
        if (showEvent.isDefaultPrevented()) {
          // only register focus restorer if modal will actually get shown
          return;
        }

        $target.one(Event.HIDDEN, function () {
          if ($(_this17).is(':visible')) {
            _this17.focus();
          }
        });
      });

      Modal._jQueryInterface.call($(target), config, this);
    });

    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $.fn[NAME] = Modal._jQueryInterface;
    $.fn[NAME].Constructor = Modal;
    $.fn[NAME].noConflict = function () {
      $.fn[NAME] = JQUERY_NO_CONFLICT;
      return Modal._jQueryInterface;
    };

    return Modal;
  }(jQuery);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.0.0-alpha.6): scrollspy.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var ScrollSpy = function ($) {

    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */

    var NAME = 'scrollspy';
    var VERSION = '4.0.0-alpha.6';
    var DATA_KEY = 'bs.scrollspy';
    var EVENT_KEY = '.' + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $.fn[NAME];

    var Default = {
      offset: 10,
      method: 'auto',
      target: ''
    };

    var DefaultType = {
      offset: 'number',
      method: 'string',
      target: '(string|element)'
    };

    var Event = {
      ACTIVATE: 'activate' + EVENT_KEY,
      SCROLL: 'scroll' + EVENT_KEY,
      LOAD_DATA_API: 'load' + EVENT_KEY + DATA_API_KEY
    };

    var ClassName = {
      DROPDOWN_ITEM: 'dropdown-item',
      DROPDOWN_MENU: 'dropdown-menu',
      NAV_LINK: 'nav-link',
      NAV: 'nav',
      ACTIVE: 'active'
    };

    var Selector = {
      DATA_SPY: '[data-spy="scroll"]',
      ACTIVE: '.active',
      LIST_ITEM: '.list-item',
      LI: 'li',
      LI_DROPDOWN: 'li.dropdown',
      NAV_LINKS: '.nav-link',
      DROPDOWN: '.dropdown',
      DROPDOWN_ITEMS: '.dropdown-item',
      DROPDOWN_TOGGLE: '.dropdown-toggle'
    };

    var OffsetMethod = {
      OFFSET: 'offset',
      POSITION: 'position'
    };

    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

    var ScrollSpy = function () {
      function ScrollSpy(element, config) {
        var _this18 = this;

        _classCallCheck(this, ScrollSpy);

        this._element = element;
        this._scrollElement = element.tagName === 'BODY' ? window : element;
        this._config = this._getConfig(config);
        this._selector = this._config.target + ' ' + Selector.NAV_LINKS + ',' + (this._config.target + ' ' + Selector.DROPDOWN_ITEMS);
        this._offsets = [];
        this._targets = [];
        this._activeTarget = null;
        this._scrollHeight = 0;

        $(this._scrollElement).on(Event.SCROLL, function (event) {
          return _this18._process(event);
        });

        this.refresh();
        this._process();
      }

      // getters

      // public

      ScrollSpy.prototype.refresh = function refresh() {
        var _this19 = this;

        var autoMethod = this._scrollElement !== this._scrollElement.window ? OffsetMethod.POSITION : OffsetMethod.OFFSET;

        var offsetMethod = this._config.method === 'auto' ? autoMethod : this._config.method;

        var offsetBase = offsetMethod === OffsetMethod.POSITION ? this._getScrollTop() : 0;

        this._offsets = [];
        this._targets = [];

        this._scrollHeight = this._getScrollHeight();

        var targets = $.makeArray($(this._selector));

        targets.map(function (element) {
          var target = void 0;
          var targetSelector = Util.getSelectorFromElement(element);

          if (targetSelector) {
            target = $(targetSelector)[0];
          }

          if (target && (target.offsetWidth || target.offsetHeight)) {
            // todo (fat): remove sketch reliance on jQuery position/offset
            return [$(target)[offsetMethod]().top + offsetBase, targetSelector];
          }
          return null;
        }).filter(function (item) {
          return item;
        }).sort(function (a, b) {
          return a[0] - b[0];
        }).forEach(function (item) {
          _this19._offsets.push(item[0]);
          _this19._targets.push(item[1]);
        });
      };

      ScrollSpy.prototype.dispose = function dispose() {
        $.removeData(this._element, DATA_KEY);
        $(this._scrollElement).off(EVENT_KEY);

        this._element = null;
        this._scrollElement = null;
        this._config = null;
        this._selector = null;
        this._offsets = null;
        this._targets = null;
        this._activeTarget = null;
        this._scrollHeight = null;
      };

      // private

      ScrollSpy.prototype._getConfig = function _getConfig(config) {
        config = $.extend({}, Default, config);

        if (typeof config.target !== 'string') {
          var id = $(config.target).attr('id');
          if (!id) {
            id = Util.getUID(NAME);
            $(config.target).attr('id', id);
          }
          config.target = '#' + id;
        }

        Util.typeCheckConfig(NAME, config, DefaultType);

        return config;
      };

      ScrollSpy.prototype._getScrollTop = function _getScrollTop() {
        return this._scrollElement === window ? this._scrollElement.pageYOffset : this._scrollElement.scrollTop;
      };

      ScrollSpy.prototype._getScrollHeight = function _getScrollHeight() {
        return this._scrollElement.scrollHeight || Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      };

      ScrollSpy.prototype._getOffsetHeight = function _getOffsetHeight() {
        return this._scrollElement === window ? window.innerHeight : this._scrollElement.offsetHeight;
      };

      ScrollSpy.prototype._process = function _process() {
        var scrollTop = this._getScrollTop() + this._config.offset;
        var scrollHeight = this._getScrollHeight();
        var maxScroll = this._config.offset + scrollHeight - this._getOffsetHeight();

        if (this._scrollHeight !== scrollHeight) {
          this.refresh();
        }

        if (scrollTop >= maxScroll) {
          var target = this._targets[this._targets.length - 1];

          if (this._activeTarget !== target) {
            this._activate(target);
          }
          return;
        }

        if (this._activeTarget && scrollTop < this._offsets[0] && this._offsets[0] > 0) {
          this._activeTarget = null;
          this._clear();
          return;
        }

        for (var i = this._offsets.length; i--;) {
          var isActiveTarget = this._activeTarget !== this._targets[i] && scrollTop >= this._offsets[i] && (this._offsets[i + 1] === undefined || scrollTop < this._offsets[i + 1]);

          if (isActiveTarget) {
            this._activate(this._targets[i]);
          }
        }
      };

      ScrollSpy.prototype._activate = function _activate(target) {
        this._activeTarget = target;

        this._clear();

        var queries = this._selector.split(',');
        queries = queries.map(function (selector) {
          return selector + '[data-target="' + target + '"],' + (selector + '[href="' + target + '"]');
        });

        var $link = $(queries.join(','));

        if ($link.hasClass(ClassName.DROPDOWN_ITEM)) {
          $link.closest(Selector.DROPDOWN).find(Selector.DROPDOWN_TOGGLE).addClass(ClassName.ACTIVE);
          $link.addClass(ClassName.ACTIVE);
        } else {
          // todo (fat) this is kinda sus...
          // recursively add actives to tested nav-links
          $link.parents(Selector.LI).find('> ' + Selector.NAV_LINKS).addClass(ClassName.ACTIVE);
        }

        $(this._scrollElement).trigger(Event.ACTIVATE, {
          relatedTarget: target
        });
      };

      ScrollSpy.prototype._clear = function _clear() {
        $(this._selector).filter(Selector.ACTIVE).removeClass(ClassName.ACTIVE);
      };

      // static

      ScrollSpy._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $(this).data(DATA_KEY);
          var _config = (typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object' && config;

          if (!data) {
            data = new ScrollSpy(this, _config);
            $(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (data[config] === undefined) {
              throw new Error('No method named "' + config + '"');
            }
            data[config]();
          }
        });
      };

      _createClass(ScrollSpy, null, [{
        key: 'VERSION',
        get: function get() {
          return VERSION;
        }
      }, {
        key: 'Default',
        get: function get() {
          return Default;
        }
      }]);

      return ScrollSpy;
    }();

    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */

    $(window).on(Event.LOAD_DATA_API, function () {
      var scrollSpys = $.makeArray($(Selector.DATA_SPY));

      for (var i = scrollSpys.length; i--;) {
        var $spy = $(scrollSpys[i]);
        ScrollSpy._jQueryInterface.call($spy, $spy.data());
      }
    });

    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $.fn[NAME] = ScrollSpy._jQueryInterface;
    $.fn[NAME].Constructor = ScrollSpy;
    $.fn[NAME].noConflict = function () {
      $.fn[NAME] = JQUERY_NO_CONFLICT;
      return ScrollSpy._jQueryInterface;
    };

    return ScrollSpy;
  }(jQuery);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.0.0-alpha.6): tab.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Tab = function ($) {

    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */

    var NAME = 'tab';
    var VERSION = '4.0.0-alpha.6';
    var DATA_KEY = 'bs.tab';
    var EVENT_KEY = '.' + DATA_KEY;
    var DATA_API_KEY = '.data-api';
    var JQUERY_NO_CONFLICT = $.fn[NAME];
    var TRANSITION_DURATION = 150;

    var Event = {
      HIDE: 'hide' + EVENT_KEY,
      HIDDEN: 'hidden' + EVENT_KEY,
      SHOW: 'show' + EVENT_KEY,
      SHOWN: 'shown' + EVENT_KEY,
      CLICK_DATA_API: 'click' + EVENT_KEY + DATA_API_KEY
    };

    var ClassName = {
      DROPDOWN_MENU: 'dropdown-menu',
      ACTIVE: 'active',
      DISABLED: 'disabled',
      FADE: 'fade',
      SHOW: 'show'
    };

    var Selector = {
      A: 'a',
      LI: 'li',
      DROPDOWN: '.dropdown',
      LIST: 'ul:not(.dropdown-menu), ol:not(.dropdown-menu), nav:not(.dropdown-menu)',
      FADE_CHILD: '> .nav-item .fade, > .fade',
      ACTIVE: '.active',
      ACTIVE_CHILD: '> .nav-item > .active, > .active',
      DATA_TOGGLE: '[data-toggle="tab"], [data-toggle="pill"]',
      DROPDOWN_TOGGLE: '.dropdown-toggle',
      DROPDOWN_ACTIVE_CHILD: '> .dropdown-menu .active'
    };

    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

    var Tab = function () {
      function Tab(element) {
        _classCallCheck(this, Tab);

        this._element = element;
      }

      // getters

      // public

      Tab.prototype.show = function show() {
        var _this20 = this;

        if (this._element.parentNode && this._element.parentNode.nodeType === Node.ELEMENT_NODE && $(this._element).hasClass(ClassName.ACTIVE) || $(this._element).hasClass(ClassName.DISABLED)) {
          return;
        }

        var target = void 0;
        var previous = void 0;
        var listElement = $(this._element).closest(Selector.LIST)[0];
        var selector = Util.getSelectorFromElement(this._element);

        if (listElement) {
          previous = $.makeArray($(listElement).find(Selector.ACTIVE));
          previous = previous[previous.length - 1];
        }

        var hideEvent = $.Event(Event.HIDE, {
          relatedTarget: this._element
        });

        var showEvent = $.Event(Event.SHOW, {
          relatedTarget: previous
        });

        if (previous) {
          $(previous).trigger(hideEvent);
        }

        $(this._element).trigger(showEvent);

        if (showEvent.isDefaultPrevented() || hideEvent.isDefaultPrevented()) {
          return;
        }

        if (selector) {
          target = $(selector)[0];
        }

        this._activate(this._element, listElement);

        var complete = function complete() {
          var hiddenEvent = $.Event(Event.HIDDEN, {
            relatedTarget: _this20._element
          });

          var shownEvent = $.Event(Event.SHOWN, {
            relatedTarget: previous
          });

          $(previous).trigger(hiddenEvent);
          $(_this20._element).trigger(shownEvent);
        };

        if (target) {
          this._activate(target, target.parentNode, complete);
        } else {
          complete();
        }
      };

      Tab.prototype.dispose = function dispose() {
        $.removeClass(this._element, DATA_KEY);
        this._element = null;
      };

      // private

      Tab.prototype._activate = function _activate(element, container, callback) {
        var _this21 = this;

        var active = $(container).find(Selector.ACTIVE_CHILD)[0];
        var isTransitioning = callback && Util.supportsTransitionEnd() && (active && $(active).hasClass(ClassName.FADE) || Boolean($(container).find(Selector.FADE_CHILD)[0]));

        var complete = function complete() {
          return _this21._transitionComplete(element, active, isTransitioning, callback);
        };

        if (active && isTransitioning) {
          $(active).one(Util.TRANSITION_END, complete).emulateTransitionEnd(TRANSITION_DURATION);
        } else {
          complete();
        }

        if (active) {
          $(active).removeClass(ClassName.SHOW);
        }
      };

      Tab.prototype._transitionComplete = function _transitionComplete(element, active, isTransitioning, callback) {
        if (active) {
          $(active).removeClass(ClassName.ACTIVE);

          var dropdownChild = $(active.parentNode).find(Selector.DROPDOWN_ACTIVE_CHILD)[0];

          if (dropdownChild) {
            $(dropdownChild).removeClass(ClassName.ACTIVE);
          }

          active.setAttribute('aria-expanded', false);
        }

        $(element).addClass(ClassName.ACTIVE);
        element.setAttribute('aria-expanded', true);

        if (isTransitioning) {
          Util.reflow(element);
          $(element).addClass(ClassName.SHOW);
        } else {
          $(element).removeClass(ClassName.FADE);
        }

        if (element.parentNode && $(element.parentNode).hasClass(ClassName.DROPDOWN_MENU)) {

          var dropdownElement = $(element).closest(Selector.DROPDOWN)[0];
          if (dropdownElement) {
            $(dropdownElement).find(Selector.DROPDOWN_TOGGLE).addClass(ClassName.ACTIVE);
          }

          element.setAttribute('aria-expanded', true);
        }

        if (callback) {
          callback();
        }
      };

      // static

      Tab._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var $this = $(this);
          var data = $this.data(DATA_KEY);

          if (!data) {
            data = new Tab(this);
            $this.data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (data[config] === undefined) {
              throw new Error('No method named "' + config + '"');
            }
            data[config]();
          }
        });
      };

      _createClass(Tab, null, [{
        key: 'VERSION',
        get: function get() {
          return VERSION;
        }
      }]);

      return Tab;
    }();

    /**
     * ------------------------------------------------------------------------
     * Data Api implementation
     * ------------------------------------------------------------------------
     */

    $(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
      event.preventDefault();
      Tab._jQueryInterface.call($(this), 'show');
    });

    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $.fn[NAME] = Tab._jQueryInterface;
    $.fn[NAME].Constructor = Tab;
    $.fn[NAME].noConflict = function () {
      $.fn[NAME] = JQUERY_NO_CONFLICT;
      return Tab._jQueryInterface;
    };

    return Tab;
  }(jQuery);

  /* global Tether */

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.0.0-alpha.6): tooltip.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Tooltip = function ($) {

    /**
     * Check for Tether dependency
     * Tether - http://tether.io/
     */
    if (typeof Tether === 'undefined') {
      throw new Error('Bootstrap tooltips require Tether (http://tether.io/)');
    }

    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */

    var NAME = 'tooltip';
    var VERSION = '4.0.0-alpha.6';
    var DATA_KEY = 'bs.tooltip';
    var EVENT_KEY = '.' + DATA_KEY;
    var JQUERY_NO_CONFLICT = $.fn[NAME];
    var TRANSITION_DURATION = 150;
    var CLASS_PREFIX = 'bs-tether';

    var Default = {
      animation: true,
      template: '<div class="tooltip" role="tooltip">' + '<div class="tooltip-inner"></div></div>',
      trigger: 'hover focus',
      title: '',
      delay: 0,
      html: false,
      selector: false,
      placement: 'top',
      offset: '0 0',
      constraints: [],
      container: false
    };

    var DefaultType = {
      animation: 'boolean',
      template: 'string',
      title: '(string|element|function)',
      trigger: 'string',
      delay: '(number|object)',
      html: 'boolean',
      selector: '(string|boolean)',
      placement: '(string|function)',
      offset: 'string',
      constraints: 'array',
      container: '(string|element|boolean)'
    };

    var AttachmentMap = {
      TOP: 'bottom center',
      RIGHT: 'middle left',
      BOTTOM: 'top center',
      LEFT: 'middle right'
    };

    var HoverState = {
      SHOW: 'show',
      OUT: 'out'
    };

    var Event = {
      HIDE: 'hide' + EVENT_KEY,
      HIDDEN: 'hidden' + EVENT_KEY,
      SHOW: 'show' + EVENT_KEY,
      SHOWN: 'shown' + EVENT_KEY,
      INSERTED: 'inserted' + EVENT_KEY,
      CLICK: 'click' + EVENT_KEY,
      FOCUSIN: 'focusin' + EVENT_KEY,
      FOCUSOUT: 'focusout' + EVENT_KEY,
      MOUSEENTER: 'mouseenter' + EVENT_KEY,
      MOUSELEAVE: 'mouseleave' + EVENT_KEY
    };

    var ClassName = {
      FADE: 'fade',
      SHOW: 'show'
    };

    var Selector = {
      TOOLTIP: '.tooltip',
      TOOLTIP_INNER: '.tooltip-inner'
    };

    var TetherClass = {
      element: false,
      enabled: false
    };

    var Trigger = {
      HOVER: 'hover',
      FOCUS: 'focus',
      CLICK: 'click',
      MANUAL: 'manual'
    };

    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

    var Tooltip = function () {
      function Tooltip(element, config) {
        _classCallCheck(this, Tooltip);

        // private
        this._isEnabled = true;
        this._timeout = 0;
        this._hoverState = '';
        this._activeTrigger = {};
        this._isTransitioning = false;
        this._tether = null;

        // protected
        this.element = element;
        this.config = this._getConfig(config);
        this.tip = null;

        this._setListeners();
      }

      // getters

      // public

      Tooltip.prototype.enable = function enable() {
        this._isEnabled = true;
      };

      Tooltip.prototype.disable = function disable() {
        this._isEnabled = false;
      };

      Tooltip.prototype.toggleEnabled = function toggleEnabled() {
        this._isEnabled = !this._isEnabled;
      };

      Tooltip.prototype.toggle = function toggle(event) {
        if (event) {
          var dataKey = this.constructor.DATA_KEY;
          var context = $(event.currentTarget).data(dataKey);

          if (!context) {
            context = new this.constructor(event.currentTarget, this._getDelegateConfig());
            $(event.currentTarget).data(dataKey, context);
          }

          context._activeTrigger.click = !context._activeTrigger.click;

          if (context._isWithActiveTrigger()) {
            context._enter(null, context);
          } else {
            context._leave(null, context);
          }
        } else {

          if ($(this.getTipElement()).hasClass(ClassName.SHOW)) {
            this._leave(null, this);
            return;
          }

          this._enter(null, this);
        }
      };

      Tooltip.prototype.dispose = function dispose() {
        clearTimeout(this._timeout);

        this.cleanupTether();

        $.removeData(this.element, this.constructor.DATA_KEY);

        $(this.element).off(this.constructor.EVENT_KEY);
        $(this.element).closest('.modal').off('hide.bs.modal');

        if (this.tip) {
          $(this.tip).remove();
        }

        this._isEnabled = null;
        this._timeout = null;
        this._hoverState = null;
        this._activeTrigger = null;
        this._tether = null;

        this.element = null;
        this.config = null;
        this.tip = null;
      };

      Tooltip.prototype.show = function show() {
        var _this22 = this;

        if ($(this.element).css('display') === 'none') {
          throw new Error('Please use show on visible elements');
        }

        var showEvent = $.Event(this.constructor.Event.SHOW);
        if (this.isWithContent() && this._isEnabled) {
          if (this._isTransitioning) {
            throw new Error('Tooltip is transitioning');
          }
          $(this.element).trigger(showEvent);

          var isInTheDom = $.contains(this.element.ownerDocument.documentElement, this.element);

          if (showEvent.isDefaultPrevented() || !isInTheDom) {
            return;
          }

          var tip = this.getTipElement();
          var tipId = Util.getUID(this.constructor.NAME);

          tip.setAttribute('id', tipId);
          this.element.setAttribute('aria-describedby', tipId);

          this.setContent();

          if (this.config.animation) {
            $(tip).addClass(ClassName.FADE);
          }

          var placement = typeof this.config.placement === 'function' ? this.config.placement.call(this, tip, this.element) : this.config.placement;

          var attachment = this._getAttachment(placement);

          var container = this.config.container === false ? document.body : $(this.config.container);

          $(tip).data(this.constructor.DATA_KEY, this).appendTo(container);

          $(this.element).trigger(this.constructor.Event.INSERTED);

          this._tether = new Tether({
            attachment: attachment,
            element: tip,
            target: this.element,
            classes: TetherClass,
            classPrefix: CLASS_PREFIX,
            offset: this.config.offset,
            constraints: this.config.constraints,
            addTargetClasses: false
          });

          Util.reflow(tip);
          this._tether.position();

          $(tip).addClass(ClassName.SHOW);

          var complete = function complete() {
            var prevHoverState = _this22._hoverState;
            _this22._hoverState = null;
            _this22._isTransitioning = false;

            $(_this22.element).trigger(_this22.constructor.Event.SHOWN);

            if (prevHoverState === HoverState.OUT) {
              _this22._leave(null, _this22);
            }
          };

          if (Util.supportsTransitionEnd() && $(this.tip).hasClass(ClassName.FADE)) {
            this._isTransitioning = true;
            $(this.tip).one(Util.TRANSITION_END, complete).emulateTransitionEnd(Tooltip._TRANSITION_DURATION);
            return;
          }

          complete();
        }
      };

      Tooltip.prototype.hide = function hide(callback) {
        var _this23 = this;

        var tip = this.getTipElement();
        var hideEvent = $.Event(this.constructor.Event.HIDE);
        if (this._isTransitioning) {
          throw new Error('Tooltip is transitioning');
        }
        var complete = function complete() {
          if (_this23._hoverState !== HoverState.SHOW && tip.parentNode) {
            tip.parentNode.removeChild(tip);
          }

          _this23.element.removeAttribute('aria-describedby');
          $(_this23.element).trigger(_this23.constructor.Event.HIDDEN);
          _this23._isTransitioning = false;
          _this23.cleanupTether();

          if (callback) {
            callback();
          }
        };

        $(this.element).trigger(hideEvent);

        if (hideEvent.isDefaultPrevented()) {
          return;
        }

        $(tip).removeClass(ClassName.SHOW);

        this._activeTrigger[Trigger.CLICK] = false;
        this._activeTrigger[Trigger.FOCUS] = false;
        this._activeTrigger[Trigger.HOVER] = false;

        if (Util.supportsTransitionEnd() && $(this.tip).hasClass(ClassName.FADE)) {
          this._isTransitioning = true;
          $(tip).one(Util.TRANSITION_END, complete).emulateTransitionEnd(TRANSITION_DURATION);
        } else {
          complete();
        }

        this._hoverState = '';
      };

      // protected

      Tooltip.prototype.isWithContent = function isWithContent() {
        return Boolean(this.getTitle());
      };

      Tooltip.prototype.getTipElement = function getTipElement() {
        return this.tip = this.tip || $(this.config.template)[0];
      };

      Tooltip.prototype.setContent = function setContent() {
        var $tip = $(this.getTipElement());

        this.setElementContent($tip.find(Selector.TOOLTIP_INNER), this.getTitle());

        $tip.removeClass(ClassName.FADE + ' ' + ClassName.SHOW);

        this.cleanupTether();
      };

      Tooltip.prototype.setElementContent = function setElementContent($element, content) {
        var html = this.config.html;
        if ((typeof content === 'undefined' ? 'undefined' : _typeof(content)) === 'object' && (content.nodeType || content.jquery)) {
          // content is a DOM node or a jQuery
          if (html) {
            if (!$(content).parent().is($element)) {
              $element.empty().append(content);
            }
          } else {
            $element.text($(content).text());
          }
        } else {
          $element[html ? 'html' : 'text'](content);
        }
      };

      Tooltip.prototype.getTitle = function getTitle() {
        var title = this.element.getAttribute('data-original-title');

        if (!title) {
          title = typeof this.config.title === 'function' ? this.config.title.call(this.element) : this.config.title;
        }

        return title;
      };

      Tooltip.prototype.cleanupTether = function cleanupTether() {
        if (this._tether) {
          this._tether.destroy();
        }
      };

      // private

      Tooltip.prototype._getAttachment = function _getAttachment(placement) {
        return AttachmentMap[placement.toUpperCase()];
      };

      Tooltip.prototype._setListeners = function _setListeners() {
        var _this24 = this;

        var triggers = this.config.trigger.split(' ');

        triggers.forEach(function (trigger) {
          if (trigger === 'click') {
            $(_this24.element).on(_this24.constructor.Event.CLICK, _this24.config.selector, function (event) {
              return _this24.toggle(event);
            });
          } else if (trigger !== Trigger.MANUAL) {
            var eventIn = trigger === Trigger.HOVER ? _this24.constructor.Event.MOUSEENTER : _this24.constructor.Event.FOCUSIN;
            var eventOut = trigger === Trigger.HOVER ? _this24.constructor.Event.MOUSELEAVE : _this24.constructor.Event.FOCUSOUT;

            $(_this24.element).on(eventIn, _this24.config.selector, function (event) {
              return _this24._enter(event);
            }).on(eventOut, _this24.config.selector, function (event) {
              return _this24._leave(event);
            });
          }

          $(_this24.element).closest('.modal').on('hide.bs.modal', function () {
            return _this24.hide();
          });
        });

        if (this.config.selector) {
          this.config = $.extend({}, this.config, {
            trigger: 'manual',
            selector: ''
          });
        } else {
          this._fixTitle();
        }
      };

      Tooltip.prototype._fixTitle = function _fixTitle() {
        var titleType = _typeof(this.element.getAttribute('data-original-title'));
        if (this.element.getAttribute('title') || titleType !== 'string') {
          this.element.setAttribute('data-original-title', this.element.getAttribute('title') || '');
          this.element.setAttribute('title', '');
        }
      };

      Tooltip.prototype._enter = function _enter(event, context) {
        var dataKey = this.constructor.DATA_KEY;

        context = context || $(event.currentTarget).data(dataKey);

        if (!context) {
          context = new this.constructor(event.currentTarget, this._getDelegateConfig());
          $(event.currentTarget).data(dataKey, context);
        }

        if (event) {
          context._activeTrigger[event.type === 'focusin' ? Trigger.FOCUS : Trigger.HOVER] = true;
        }

        if ($(context.getTipElement()).hasClass(ClassName.SHOW) || context._hoverState === HoverState.SHOW) {
          context._hoverState = HoverState.SHOW;
          return;
        }

        clearTimeout(context._timeout);

        context._hoverState = HoverState.SHOW;

        if (!context.config.delay || !context.config.delay.show) {
          context.show();
          return;
        }

        context._timeout = setTimeout(function () {
          if (context._hoverState === HoverState.SHOW) {
            context.show();
          }
        }, context.config.delay.show);
      };

      Tooltip.prototype._leave = function _leave(event, context) {
        var dataKey = this.constructor.DATA_KEY;

        context = context || $(event.currentTarget).data(dataKey);

        if (!context) {
          context = new this.constructor(event.currentTarget, this._getDelegateConfig());
          $(event.currentTarget).data(dataKey, context);
        }

        if (event) {
          context._activeTrigger[event.type === 'focusout' ? Trigger.FOCUS : Trigger.HOVER] = false;
        }

        if (context._isWithActiveTrigger()) {
          return;
        }

        clearTimeout(context._timeout);

        context._hoverState = HoverState.OUT;

        if (!context.config.delay || !context.config.delay.hide) {
          context.hide();
          return;
        }

        context._timeout = setTimeout(function () {
          if (context._hoverState === HoverState.OUT) {
            context.hide();
          }
        }, context.config.delay.hide);
      };

      Tooltip.prototype._isWithActiveTrigger = function _isWithActiveTrigger() {
        for (var trigger in this._activeTrigger) {
          if (this._activeTrigger[trigger]) {
            return true;
          }
        }

        return false;
      };

      Tooltip.prototype._getConfig = function _getConfig(config) {
        config = $.extend({}, this.constructor.Default, $(this.element).data(), config);

        if (config.delay && typeof config.delay === 'number') {
          config.delay = {
            show: config.delay,
            hide: config.delay
          };
        }

        Util.typeCheckConfig(NAME, config, this.constructor.DefaultType);

        return config;
      };

      Tooltip.prototype._getDelegateConfig = function _getDelegateConfig() {
        var config = {};

        if (this.config) {
          for (var key in this.config) {
            if (this.constructor.Default[key] !== this.config[key]) {
              config[key] = this.config[key];
            }
          }
        }

        return config;
      };

      // static

      Tooltip._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $(this).data(DATA_KEY);
          var _config = (typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object' && config;

          if (!data && /dispose|hide/.test(config)) {
            return;
          }

          if (!data) {
            data = new Tooltip(this, _config);
            $(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (data[config] === undefined) {
              throw new Error('No method named "' + config + '"');
            }
            data[config]();
          }
        });
      };

      _createClass(Tooltip, null, [{
        key: 'VERSION',
        get: function get() {
          return VERSION;
        }
      }, {
        key: 'Default',
        get: function get() {
          return Default;
        }
      }, {
        key: 'NAME',
        get: function get() {
          return NAME;
        }
      }, {
        key: 'DATA_KEY',
        get: function get() {
          return DATA_KEY;
        }
      }, {
        key: 'Event',
        get: function get() {
          return Event;
        }
      }, {
        key: 'EVENT_KEY',
        get: function get() {
          return EVENT_KEY;
        }
      }, {
        key: 'DefaultType',
        get: function get() {
          return DefaultType;
        }
      }]);

      return Tooltip;
    }();

    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $.fn[NAME] = Tooltip._jQueryInterface;
    $.fn[NAME].Constructor = Tooltip;
    $.fn[NAME].noConflict = function () {
      $.fn[NAME] = JQUERY_NO_CONFLICT;
      return Tooltip._jQueryInterface;
    };

    return Tooltip;
  }(jQuery);

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.0.0-alpha.6): popover.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  var Popover = function ($) {

    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */

    var NAME = 'popover';
    var VERSION = '4.0.0-alpha.6';
    var DATA_KEY = 'bs.popover';
    var EVENT_KEY = '.' + DATA_KEY;
    var JQUERY_NO_CONFLICT = $.fn[NAME];

    var Default = $.extend({}, Tooltip.Default, {
      placement: 'right',
      trigger: 'click',
      content: '',
      template: '<div class="popover" role="tooltip">' + '<h3 class="popover-title"></h3>' + '<div class="popover-content"></div></div>'
    });

    var DefaultType = $.extend({}, Tooltip.DefaultType, {
      content: '(string|element|function)'
    });

    var ClassName = {
      FADE: 'fade',
      SHOW: 'show'
    };

    var Selector = {
      TITLE: '.popover-title',
      CONTENT: '.popover-content'
    };

    var Event = {
      HIDE: 'hide' + EVENT_KEY,
      HIDDEN: 'hidden' + EVENT_KEY,
      SHOW: 'show' + EVENT_KEY,
      SHOWN: 'shown' + EVENT_KEY,
      INSERTED: 'inserted' + EVENT_KEY,
      CLICK: 'click' + EVENT_KEY,
      FOCUSIN: 'focusin' + EVENT_KEY,
      FOCUSOUT: 'focusout' + EVENT_KEY,
      MOUSEENTER: 'mouseenter' + EVENT_KEY,
      MOUSELEAVE: 'mouseleave' + EVENT_KEY
    };

    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

    var Popover = function (_Tooltip) {
      _inherits(Popover, _Tooltip);

      function Popover() {
        _classCallCheck(this, Popover);

        return _possibleConstructorReturn(this, _Tooltip.apply(this, arguments));
      }

      // overrides

      Popover.prototype.isWithContent = function isWithContent() {
        return this.getTitle() || this._getContent();
      };

      Popover.prototype.getTipElement = function getTipElement() {
        return this.tip = this.tip || $(this.config.template)[0];
      };

      Popover.prototype.setContent = function setContent() {
        var $tip = $(this.getTipElement());

        // we use append for html objects to maintain js events
        this.setElementContent($tip.find(Selector.TITLE), this.getTitle());
        this.setElementContent($tip.find(Selector.CONTENT), this._getContent());

        $tip.removeClass(ClassName.FADE + ' ' + ClassName.SHOW);

        this.cleanupTether();
      };

      // private

      Popover.prototype._getContent = function _getContent() {
        return this.element.getAttribute('data-content') || (typeof this.config.content === 'function' ? this.config.content.call(this.element) : this.config.content);
      };

      // static

      Popover._jQueryInterface = function _jQueryInterface(config) {
        return this.each(function () {
          var data = $(this).data(DATA_KEY);
          var _config = (typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object' ? config : null;

          if (!data && /destroy|hide/.test(config)) {
            return;
          }

          if (!data) {
            data = new Popover(this, _config);
            $(this).data(DATA_KEY, data);
          }

          if (typeof config === 'string') {
            if (data[config] === undefined) {
              throw new Error('No method named "' + config + '"');
            }
            data[config]();
          }
        });
      };

      _createClass(Popover, null, [{
        key: 'VERSION',

        // getters

        get: function get() {
          return VERSION;
        }
      }, {
        key: 'Default',
        get: function get() {
          return Default;
        }
      }, {
        key: 'NAME',
        get: function get() {
          return NAME;
        }
      }, {
        key: 'DATA_KEY',
        get: function get() {
          return DATA_KEY;
        }
      }, {
        key: 'Event',
        get: function get() {
          return Event;
        }
      }, {
        key: 'EVENT_KEY',
        get: function get() {
          return EVENT_KEY;
        }
      }, {
        key: 'DefaultType',
        get: function get() {
          return DefaultType;
        }
      }]);

      return Popover;
    }(Tooltip);

    /**
     * ------------------------------------------------------------------------
     * jQuery
     * ------------------------------------------------------------------------
     */

    $.fn[NAME] = Popover._jQueryInterface;
    $.fn[NAME].Constructor = Popover;
    $.fn[NAME].noConflict = function () {
      $.fn[NAME] = JQUERY_NO_CONFLICT;
      return Popover._jQueryInterface;
    };

    return Popover;
  }(jQuery);
}();
;"use strict";

jQuery(document).foundation();
;'use strict';

// Joyride demo
$('#start-jr').on('click', function () {
  $(document).foundation('joyride', 'start');
});
;'use strict';

/**
 * File navigation.js.
 *
 * Handles toggling the navigation menu for small screens and enables TAB key
 * navigation support for dropdown menus.
 */
(function () {
	var container, button, menu, links, i, len;

	container = document.getElementById('site-navigation');
	if (!container) {
		return;
	}

	button = container.getElementsByTagName('button')[0];
	if ('undefined' === typeof button) {
		return;
	}

	menu = container.getElementsByTagName('ul')[0];

	// Hide menu toggle button if menu is empty and return early.
	if ('undefined' === typeof menu) {
		button.style.display = 'none';
		return;
	}

	menu.setAttribute('aria-expanded', 'false');
	if (-1 === menu.className.indexOf('nav-menu')) {
		menu.className += ' nav-menu';
	}

	button.onclick = function () {
		if (-1 !== container.className.indexOf('toggled')) {
			container.className = container.className.replace(' toggled', '');
			button.setAttribute('aria-expanded', 'false');
			menu.setAttribute('aria-expanded', 'false');
		} else {
			container.className += ' toggled';
			button.setAttribute('aria-expanded', 'true');
			menu.setAttribute('aria-expanded', 'true');
		}
	};

	// Get all the link elements within the menu.
	links = menu.getElementsByTagName('a');

	// Each time a menu link is focused or blurred, toggle focus.
	for (i = 0, len = links.length; i < len; i++) {
		links[i].addEventListener('focus', toggleFocus, true);
		links[i].addEventListener('blur', toggleFocus, true);
	}

	/**
  * Sets or removes .focus class on an element.
  */
	function toggleFocus() {
		var self = this;

		// Move up through the ancestors of the current link until we hit .nav-menu.
		while (-1 === self.className.indexOf('nav-menu')) {

			// On li elements toggle the class .focus.
			if ('li' === self.tagName.toLowerCase()) {
				if (-1 !== self.className.indexOf('focus')) {
					self.className = self.className.replace(' focus', '');
				} else {
					self.className += ' focus';
				}
			}

			self = self.parentElement;
		}
	}

	/**
  * Toggles `focus` class to allow submenu access on tablets.
  */
	(function (container) {
		var touchStartFn,
		    i,
		    parentLink = container.querySelectorAll('.menu-item-has-children > a, .page_item_has_children > a');

		if ('ontouchstart' in window) {
			touchStartFn = function (e) {
				var menuItem = this.parentNode,
				    i;

				if (!menuItem.classList.contains('focus')) {
					e.preventDefault();
					for (i = 0; i < menuItem.parentNode.children.length; ++i) {
						if (menuItem === menuItem.parentNode.children[i]) {
							continue;
						}
						menuItem.parentNode.children[i].classList.remove('focus');
					}
					menuItem.classList.add('focus');
				} else {
					menuItem.classList.remove('focus');
				}
			};

			for (i = 0; i < parentLink.length; ++i) {
				parentLink[i].addEventListener('touchstart', touchStartFn, false);
			}
		}
	})(container);
})();
;"use strict";
;'use strict';

$(document).ready(function () {
    var videos = $('iframe[src*="vimeo.com"], iframe[src*="youtube.com"]');

    videos.each(function () {
        var el = $(this);
        el.wrap('<div class="responsive-embed widescreen"/>');
    });
});
;'use strict';

/**
 * File skip-link-focus-fix.js.
 *
 * Helps with accessibility for keyboard only users.
 *
 * Learn more: https://git.io/vWdr2
 */
(function () {
	var isIe = /(trident|msie)/i.test(navigator.userAgent);

	if (isIe && document.getElementById && window.addEventListener) {
		window.addEventListener('hashchange', function () {
			var id = location.hash.substring(1),
			    element;

			if (!/^[A-z0-9_-]+$/.test(id)) {
				return;
			}

			element = document.getElementById(id);

			if (element) {
				if (!/^(?:a|select|input|button|textarea)$/i.test(element.tagName)) {
					element.tabIndex = -1;
				}

				element.focus();
			}
		}, false);
	}
})();
;'use strict';

$(window).bind(' load resize orientationChange ', function () {
   var footer = $("#footer-container");
   var pos = footer.position();
   var height = $(window).height();
   height = height - pos.top;
   height = height - footer.height() - 1;

   function stickyFooter() {
      footer.css({
         'margin-top': height + 'px'
      });
   }

   if (height > 0) {
      stickyFooter();
   }
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRldGhlci5qcyIsImJvb3RzdHJhcC5qcyIsImluaXQtZm91bmRhdGlvbi5qcyIsImpveXJpZGUtZGVtby5qcyIsIm5hdmlnYXRpb24uanMiLCJvZmZDYW52YXMuanMiLCJyZXNwb25zaXZlLXZpZGVvLmpzIiwic2tpcC1saW5rLWZvY3VzLWZpeC5qcyIsInN0aWNreWZvb3Rlci5qcyJdLCJuYW1lcyI6WyJyb290IiwiZmFjdG9yeSIsImRlZmluZSIsImFtZCIsImV4cG9ydHMiLCJtb2R1bGUiLCJyZXF1aXJlIiwiVGV0aGVyIiwiX2NyZWF0ZUNsYXNzIiwiZGVmaW5lUHJvcGVydGllcyIsInRhcmdldCIsInByb3BzIiwiaSIsImxlbmd0aCIsImRlc2NyaXB0b3IiLCJlbnVtZXJhYmxlIiwiY29uZmlndXJhYmxlIiwid3JpdGFibGUiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImtleSIsIkNvbnN0cnVjdG9yIiwicHJvdG9Qcm9wcyIsInN0YXRpY1Byb3BzIiwicHJvdG90eXBlIiwiX2NsYXNzQ2FsbENoZWNrIiwiaW5zdGFuY2UiLCJUeXBlRXJyb3IiLCJUZXRoZXJCYXNlIiwidW5kZWZpbmVkIiwibW9kdWxlcyIsInplcm9FbGVtZW50IiwiZ2V0QWN0dWFsQm91bmRpbmdDbGllbnRSZWN0Iiwibm9kZSIsImJvdW5kaW5nUmVjdCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsInJlY3QiLCJrIiwib3duZXJEb2N1bWVudCIsImRvY3VtZW50IiwiX2ZyYW1lRWxlbWVudCIsImRlZmF1bHRWaWV3IiwiZnJhbWVFbGVtZW50IiwiZnJhbWVSZWN0IiwidG9wIiwiYm90dG9tIiwibGVmdCIsInJpZ2h0IiwiZ2V0U2Nyb2xsUGFyZW50cyIsImVsIiwiY29tcHV0ZWRTdHlsZSIsImdldENvbXB1dGVkU3R5bGUiLCJwb3NpdGlvbiIsInBhcmVudHMiLCJwYXJlbnQiLCJwYXJlbnROb2RlIiwibm9kZVR5cGUiLCJzdHlsZSIsImVyciIsInB1c2giLCJfc3R5bGUiLCJvdmVyZmxvdyIsIm92ZXJmbG93WCIsIm92ZXJmbG93WSIsInRlc3QiLCJpbmRleE9mIiwiYm9keSIsInVuaXF1ZUlkIiwiaWQiLCJ6ZXJvUG9zQ2FjaGUiLCJnZXRPcmlnaW4iLCJjb250YWlucyIsImNyZWF0ZUVsZW1lbnQiLCJzZXRBdHRyaWJ1dGUiLCJleHRlbmQiLCJhcHBlbmRDaGlsZCIsImdldEF0dHJpYnV0ZSIsImRlZmVyIiwicmVtb3ZlVXRpbEVsZW1lbnRzIiwicmVtb3ZlQ2hpbGQiLCJnZXRCb3VuZHMiLCJkb2MiLCJkb2N1bWVudEVsZW1lbnQiLCJkb2NFbCIsImJveCIsIm9yaWdpbiIsIndpZHRoIiwic2Nyb2xsV2lkdGgiLCJoZWlnaHQiLCJzY3JvbGxIZWlnaHQiLCJjbGllbnRUb3AiLCJjbGllbnRMZWZ0IiwiY2xpZW50V2lkdGgiLCJjbGllbnRIZWlnaHQiLCJnZXRPZmZzZXRQYXJlbnQiLCJvZmZzZXRQYXJlbnQiLCJfc2Nyb2xsQmFyU2l6ZSIsImdldFNjcm9sbEJhclNpemUiLCJpbm5lciIsIm91dGVyIiwicG9pbnRlckV2ZW50cyIsInZpc2liaWxpdHkiLCJ3aWR0aENvbnRhaW5lZCIsIm9mZnNldFdpZHRoIiwid2lkdGhTY3JvbGwiLCJvdXQiLCJhcmd1bWVudHMiLCJhcmdzIiwiQXJyYXkiLCJhcHBseSIsInNsaWNlIiwiZm9yRWFjaCIsIm9iaiIsImhhc093blByb3BlcnR5IiwiY2FsbCIsInJlbW92ZUNsYXNzIiwibmFtZSIsImNsYXNzTGlzdCIsInNwbGl0IiwiY2xzIiwidHJpbSIsInJlbW92ZSIsInJlZ2V4IiwiUmVnRXhwIiwiam9pbiIsImNsYXNzTmFtZSIsImdldENsYXNzTmFtZSIsInJlcGxhY2UiLCJzZXRDbGFzc05hbWUiLCJhZGRDbGFzcyIsImFkZCIsImhhc0NsYXNzIiwiU1ZHQW5pbWF0ZWRTdHJpbmciLCJiYXNlVmFsIiwidXBkYXRlQ2xhc3NlcyIsImFsbCIsImRlZmVycmVkIiwiZm4iLCJmbHVzaCIsInBvcCIsIkV2ZW50ZWQiLCJ2YWx1ZSIsIm9uIiwiZXZlbnQiLCJoYW5kbGVyIiwiY3R4Iiwib25jZSIsImJpbmRpbmdzIiwib2ZmIiwic3BsaWNlIiwidHJpZ2dlciIsIl9sZW4iLCJfa2V5IiwiX2JpbmRpbmdzJGV2ZW50JGkiLCJjb250ZXh0IiwiVXRpbHMiLCJfc2xpY2VkVG9BcnJheSIsInNsaWNlSXRlcmF0b3IiLCJhcnIiLCJfYXJyIiwiX24iLCJfZCIsIl9lIiwiX2kiLCJTeW1ib2wiLCJpdGVyYXRvciIsIl9zIiwibmV4dCIsImRvbmUiLCJpc0FycmF5IiwiX2dldCIsImdldCIsIl94NiIsIl94NyIsIl94OCIsIl9hZ2FpbiIsIl9mdW5jdGlvbiIsIm9iamVjdCIsInByb3BlcnR5IiwicmVjZWl2ZXIiLCJGdW5jdGlvbiIsImRlc2MiLCJnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IiLCJnZXRQcm90b3R5cGVPZiIsImdldHRlciIsIl9pbmhlcml0cyIsInN1YkNsYXNzIiwic3VwZXJDbGFzcyIsImNyZWF0ZSIsImNvbnN0cnVjdG9yIiwic2V0UHJvdG90eXBlT2YiLCJfX3Byb3RvX18iLCJFcnJvciIsIl9UZXRoZXJCYXNlJFV0aWxzIiwid2l0aGluIiwiYSIsImIiLCJkaWZmIiwidHJhbnNmb3JtS2V5IiwidHJhbnNmb3JtcyIsInRldGhlcnMiLCJ0ZXRoZXIiLCJub3ciLCJwZXJmb3JtYW5jZSIsIkRhdGUiLCJsYXN0Q2FsbCIsImxhc3REdXJhdGlvbiIsInBlbmRpbmdUaW1lb3V0IiwidGljayIsIk1hdGgiLCJtaW4iLCJzZXRUaW1lb3V0IiwiY2xlYXJUaW1lb3V0Iiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsIk1JUlJPUl9MUiIsImNlbnRlciIsIk1JUlJPUl9UQiIsIm1pZGRsZSIsIk9GRlNFVF9NQVAiLCJhdXRvVG9GaXhlZEF0dGFjaG1lbnQiLCJhdHRhY2htZW50IiwicmVsYXRpdmVUb0F0dGFjaG1lbnQiLCJhdHRhY2htZW50VG9PZmZzZXQiLCJhZGRPZmZzZXQiLCJvZmZzZXRzIiwiX3JlZiIsInBhcnNlRmxvYXQiLCJvZmZzZXRUb1B4Iiwib2Zmc2V0Iiwic2l6ZSIsInBhcnNlT2Zmc2V0IiwiX3ZhbHVlJHNwbGl0IiwiX3ZhbHVlJHNwbGl0MiIsInBhcnNlQXR0YWNobWVudCIsIlRldGhlckNsYXNzIiwiX0V2ZW50ZWQiLCJvcHRpb25zIiwiX3RoaXMiLCJiaW5kIiwiaGlzdG9yeSIsInNldE9wdGlvbnMiLCJpbml0aWFsaXplIiwiZ2V0Q2xhc3MiLCJjbGFzc2VzIiwiY2xhc3NQcmVmaXgiLCJfdGhpczIiLCJwb3MiLCJkZWZhdWx0cyIsInRhcmdldE9mZnNldCIsInRhcmdldEF0dGFjaG1lbnQiLCJfb3B0aW9ucyIsImVsZW1lbnQiLCJ0YXJnZXRNb2RpZmllciIsImpxdWVyeSIsInF1ZXJ5U2VsZWN0b3IiLCJhZGRUYXJnZXRDbGFzc2VzIiwic2Nyb2xsUGFyZW50cyIsImRpc2FibGUiLCJlbmFibGVkIiwiZW5hYmxlIiwiZ2V0VGFyZ2V0Qm91bmRzIiwicGFnZVlPZmZzZXQiLCJwYWdlWE9mZnNldCIsImlubmVySGVpZ2h0IiwiaW5uZXJXaWR0aCIsImJvdW5kcyIsImhhc0JvdHRvbVNjcm9sbCIsInNjcm9sbEJvdHRvbSIsImJvcmRlclRvcFdpZHRoIiwiYm9yZGVyQm90dG9tV2lkdGgiLCJib3JkZXJMZWZ0V2lkdGgiLCJmaXRBZGoiLCJwb3ciLCJtYXgiLCJzY3JvbGxQZXJjZW50YWdlIiwic2Nyb2xsVG9wIiwiY2xlYXJDYWNoZSIsIl9jYWNoZSIsImNhY2hlIiwiX3RoaXMzIiwiX3RoaXM0IiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImRlc3Ryb3kiLCJfdGhpczUiLCJ1cGRhdGVBdHRhY2hDbGFzc2VzIiwiZWxlbWVudEF0dGFjaCIsInRhcmdldEF0dGFjaCIsIl90aGlzNiIsInNpZGVzIiwiX2FkZEF0dGFjaENsYXNzZXMiLCJzaWRlIiwiX3RoaXM3IiwiZmx1c2hDaGFuZ2VzIiwiZWxlbWVudFBvcyIsImxhc3RTaXplIiwiX2xhc3RTaXplIiwidGFyZ2V0UG9zIiwidGFyZ2V0U2l6ZSIsIm1hbnVhbE9mZnNldCIsIm1hbnVhbFRhcmdldE9mZnNldCIsIl9tb2R1bGUyIiwicmV0Iiwic2Nyb2xsYmFyU2l6ZSIsInBhZ2UiLCJ2aWV3cG9ydCIsIndpbiIsInBhcmVudEVsZW1lbnQiLCJvcHRpbWl6YXRpb25zIiwibW92ZUVsZW1lbnQiLCJvZmZzZXRQb3NpdGlvbiIsIm9mZnNldFBhcmVudFN0eWxlIiwib2Zmc2V0UGFyZW50U2l6ZSIsIm9mZnNldEJvcmRlciIsInRvTG93ZXJDYXNlIiwic2Nyb2xsTGVmdCIsIm1vdmUiLCJ1bnNoaWZ0IiwiX3RoaXM4Iiwic2FtZSIsInR5cGUiLCJmb3VuZCIsInBvaW50IiwiY3NzIiwidHJhbnNjcmliZSIsIl9zYW1lIiwiX3BvcyIsImhhc09wdGltaXphdGlvbnMiLCJncHUiLCJ5UG9zIiwieFBvcyIsIm1hdGNoTWVkaWEiLCJyZXRpbmEiLCJtYXRjaGVzIiwicm91bmQiLCJtb3ZlZCIsImJvZHlFbGVtZW50Iiwib2Zmc2V0UGFyZW50SXNCb2R5IiwiY3VycmVudE5vZGUiLCJ0YWdOYW1lIiwid3JpdGVDU1MiLCJ3cml0ZSIsInZhbCIsImVsVmFsIiwiQk9VTkRTX0ZPUk1BVCIsImdldEJvdW5kaW5nUmVjdCIsInRvIiwidG9VcHBlckNhc2UiLCJzdWJzdHIiLCJjb25zdHJhaW50cyIsInRhcmdldEhlaWdodCIsInRhcmdldFdpZHRoIiwiYWxsQ2xhc3NlcyIsImNvbnN0cmFpbnQiLCJvdXRPZkJvdW5kc0NsYXNzIiwicGlubmVkQ2xhc3MiLCJhZGRDbGFzc2VzIiwidEF0dGFjaG1lbnQiLCJlQXR0YWNobWVudCIsInBpbiIsImNoYW5nZUF0dGFjaFgiLCJjaGFuZ2VBdHRhY2hZIiwiX2F0dGFjaG1lbnQkc3BsaXQiLCJfYXR0YWNobWVudCRzcGxpdDIiLCJtYXAiLCJwIiwicGlubmVkIiwib29iIiwib29iQ2xhc3MiLCJhYnV0dGVkIiwidGFyZ2V0UG9zU2lkZSIsInNoaWZ0Iiwic2hpZnRUb3AiLCJzaGlmdExlZnQiLCJfc2hpZnQiLCJfc2hpZnQyIiwialF1ZXJ5IiwiJCIsInZlcnNpb24iLCJfdHlwZW9mIiwiX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4iLCJzZWxmIiwiUmVmZXJlbmNlRXJyb3IiLCJVdGlsIiwidHJhbnNpdGlvbiIsIk1BWF9VSUQiLCJUcmFuc2l0aW9uRW5kRXZlbnQiLCJXZWJraXRUcmFuc2l0aW9uIiwiTW96VHJhbnNpdGlvbiIsIk9UcmFuc2l0aW9uIiwidG9UeXBlIiwidG9TdHJpbmciLCJtYXRjaCIsImlzRWxlbWVudCIsImdldFNwZWNpYWxUcmFuc2l0aW9uRW5kRXZlbnQiLCJiaW5kVHlwZSIsImVuZCIsImRlbGVnYXRlVHlwZSIsImhhbmRsZSIsImlzIiwiaGFuZGxlT2JqIiwidHJhbnNpdGlvbkVuZFRlc3QiLCJRVW5pdCIsInRyYW5zaXRpb25FbmRFbXVsYXRvciIsImR1cmF0aW9uIiwiY2FsbGVkIiwib25lIiwiVFJBTlNJVElPTl9FTkQiLCJ0cmlnZ2VyVHJhbnNpdGlvbkVuZCIsInNldFRyYW5zaXRpb25FbmRTdXBwb3J0IiwiZW11bGF0ZVRyYW5zaXRpb25FbmQiLCJzdXBwb3J0c1RyYW5zaXRpb25FbmQiLCJzcGVjaWFsIiwiZ2V0VUlEIiwicHJlZml4IiwicmFuZG9tIiwiZ2V0RWxlbWVudEJ5SWQiLCJnZXRTZWxlY3RvckZyb21FbGVtZW50Iiwic2VsZWN0b3IiLCJyZWZsb3ciLCJvZmZzZXRIZWlnaHQiLCJCb29sZWFuIiwidHlwZUNoZWNrQ29uZmlnIiwiY29tcG9uZW50TmFtZSIsImNvbmZpZyIsImNvbmZpZ1R5cGVzIiwiZXhwZWN0ZWRUeXBlcyIsInZhbHVlVHlwZSIsIkFsZXJ0IiwiTkFNRSIsIlZFUlNJT04iLCJEQVRBX0tFWSIsIkVWRU5UX0tFWSIsIkRBVEFfQVBJX0tFWSIsIkpRVUVSWV9OT19DT05GTElDVCIsIlRSQU5TSVRJT05fRFVSQVRJT04iLCJTZWxlY3RvciIsIkRJU01JU1MiLCJFdmVudCIsIkNMT1NFIiwiQ0xPU0VEIiwiQ0xJQ0tfREFUQV9BUEkiLCJDbGFzc05hbWUiLCJBTEVSVCIsIkZBREUiLCJTSE9XIiwiX2VsZW1lbnQiLCJjbG9zZSIsInJvb3RFbGVtZW50IiwiX2dldFJvb3RFbGVtZW50IiwiY3VzdG9tRXZlbnQiLCJfdHJpZ2dlckNsb3NlRXZlbnQiLCJpc0RlZmF1bHRQcmV2ZW50ZWQiLCJfcmVtb3ZlRWxlbWVudCIsImRpc3Bvc2UiLCJyZW1vdmVEYXRhIiwiY2xvc2VzdCIsImNsb3NlRXZlbnQiLCJfZGVzdHJveUVsZW1lbnQiLCJkZXRhY2giLCJfalF1ZXJ5SW50ZXJmYWNlIiwiZWFjaCIsIiRlbGVtZW50IiwiZGF0YSIsIl9oYW5kbGVEaXNtaXNzIiwiYWxlcnRJbnN0YW5jZSIsInByZXZlbnREZWZhdWx0Iiwibm9Db25mbGljdCIsIkJ1dHRvbiIsIkFDVElWRSIsIkJVVFRPTiIsIkZPQ1VTIiwiREFUQV9UT0dHTEVfQ0FSUk9UIiwiREFUQV9UT0dHTEUiLCJJTlBVVCIsIkZPQ1VTX0JMVVJfREFUQV9BUEkiLCJ0b2dnbGUiLCJ0cmlnZ2VyQ2hhbmdlRXZlbnQiLCJpbnB1dCIsImZpbmQiLCJjaGVja2VkIiwiYWN0aXZlRWxlbWVudCIsImZvY3VzIiwidG9nZ2xlQ2xhc3MiLCJidXR0b24iLCJDYXJvdXNlbCIsIkFSUk9XX0xFRlRfS0VZQ09ERSIsIkFSUk9XX1JJR0hUX0tFWUNPREUiLCJEZWZhdWx0IiwiaW50ZXJ2YWwiLCJrZXlib2FyZCIsInNsaWRlIiwicGF1c2UiLCJ3cmFwIiwiRGVmYXVsdFR5cGUiLCJEaXJlY3Rpb24iLCJORVhUIiwiUFJFViIsIkxFRlQiLCJSSUdIVCIsIlNMSURFIiwiU0xJRCIsIktFWURPV04iLCJNT1VTRUVOVEVSIiwiTU9VU0VMRUFWRSIsIkxPQURfREFUQV9BUEkiLCJDQVJPVVNFTCIsIklURU0iLCJBQ1RJVkVfSVRFTSIsIk5FWFRfUFJFViIsIklORElDQVRPUlMiLCJEQVRBX1NMSURFIiwiREFUQV9SSURFIiwiX2l0ZW1zIiwiX2ludGVydmFsIiwiX2FjdGl2ZUVsZW1lbnQiLCJfaXNQYXVzZWQiLCJfaXNTbGlkaW5nIiwiX2NvbmZpZyIsIl9nZXRDb25maWciLCJfaW5kaWNhdG9yc0VsZW1lbnQiLCJfYWRkRXZlbnRMaXN0ZW5lcnMiLCJfc2xpZGUiLCJuZXh0V2hlblZpc2libGUiLCJoaWRkZW4iLCJwcmV2IiwiUFJFVklPVVMiLCJjeWNsZSIsImNsZWFySW50ZXJ2YWwiLCJzZXRJbnRlcnZhbCIsInZpc2liaWxpdHlTdGF0ZSIsImluZGV4IiwiYWN0aXZlSW5kZXgiLCJfZ2V0SXRlbUluZGV4IiwiZGlyZWN0aW9uIiwiX2tleWRvd24iLCJ3aGljaCIsIm1ha2VBcnJheSIsIl9nZXRJdGVtQnlEaXJlY3Rpb24iLCJpc05leHREaXJlY3Rpb24iLCJpc1ByZXZEaXJlY3Rpb24iLCJsYXN0SXRlbUluZGV4IiwiaXNHb2luZ1RvV3JhcCIsImRlbHRhIiwiaXRlbUluZGV4IiwiX3RyaWdnZXJTbGlkZUV2ZW50IiwicmVsYXRlZFRhcmdldCIsImV2ZW50RGlyZWN0aW9uTmFtZSIsInNsaWRlRXZlbnQiLCJfc2V0QWN0aXZlSW5kaWNhdG9yRWxlbWVudCIsIm5leHRJbmRpY2F0b3IiLCJjaGlsZHJlbiIsIm5leHRFbGVtZW50IiwiaXNDeWNsaW5nIiwiZGlyZWN0aW9uYWxDbGFzc05hbWUiLCJvcmRlckNsYXNzTmFtZSIsInNsaWRFdmVudCIsImFjdGlvbiIsIl9kYXRhQXBpQ2xpY2tIYW5kbGVyIiwic2xpZGVJbmRleCIsIiRjYXJvdXNlbCIsIkNvbGxhcHNlIiwiU0hPV04iLCJISURFIiwiSElEREVOIiwiQ09MTEFQU0UiLCJDT0xMQVBTSU5HIiwiQ09MTEFQU0VEIiwiRGltZW5zaW9uIiwiV0lEVEgiLCJIRUlHSFQiLCJBQ1RJVkVTIiwiX2lzVHJhbnNpdGlvbmluZyIsIl90cmlnZ2VyQXJyYXkiLCJfcGFyZW50IiwiX2dldFBhcmVudCIsIl9hZGRBcmlhQW5kQ29sbGFwc2VkQ2xhc3MiLCJoaWRlIiwic2hvdyIsImFjdGl2ZXMiLCJhY3RpdmVzRGF0YSIsInN0YXJ0RXZlbnQiLCJkaW1lbnNpb24iLCJfZ2V0RGltZW5zaW9uIiwiYXR0ciIsInNldFRyYW5zaXRpb25pbmciLCJjb21wbGV0ZSIsImNhcGl0YWxpemVkRGltZW5zaW9uIiwic2Nyb2xsU2l6ZSIsIm9mZnNldERpbWVuc2lvbiIsImlzVHJhbnNpdGlvbmluZyIsImhhc1dpZHRoIiwiX2dldFRhcmdldEZyb21FbGVtZW50IiwidHJpZ2dlckFycmF5IiwiaXNPcGVuIiwiJHRoaXMiLCJEcm9wZG93biIsIkVTQ0FQRV9LRVlDT0RFIiwiQVJST1dfVVBfS0VZQ09ERSIsIkFSUk9XX0RPV05fS0VZQ09ERSIsIlJJR0hUX01PVVNFX0JVVFRPTl9XSElDSCIsIkNMSUNLIiwiRk9DVVNJTl9EQVRBX0FQSSIsIktFWURPV05fREFUQV9BUEkiLCJCQUNLRFJPUCIsIkRJU0FCTEVEIiwiRk9STV9DSElMRCIsIlJPTEVfTUVOVSIsIlJPTEVfTElTVEJPWCIsIk5BVkJBUl9OQVYiLCJWSVNJQkxFX0lURU1TIiwiZGlzYWJsZWQiLCJfZ2V0UGFyZW50RnJvbUVsZW1lbnQiLCJpc0FjdGl2ZSIsIl9jbGVhck1lbnVzIiwiZHJvcGRvd24iLCJpbnNlcnRCZWZvcmUiLCJzaG93RXZlbnQiLCJiYWNrZHJvcCIsInRvZ2dsZXMiLCJoaWRlRXZlbnQiLCJfZGF0YUFwaUtleWRvd25IYW5kbGVyIiwic3RvcFByb3BhZ2F0aW9uIiwiaXRlbXMiLCJlIiwiTW9kYWwiLCJCQUNLRFJPUF9UUkFOU0lUSU9OX0RVUkFUSU9OIiwiRk9DVVNJTiIsIlJFU0laRSIsIkNMSUNLX0RJU01JU1MiLCJLRVlET1dOX0RJU01JU1MiLCJNT1VTRVVQX0RJU01JU1MiLCJNT1VTRURPV05fRElTTUlTUyIsIlNDUk9MTEJBUl9NRUFTVVJFUiIsIk9QRU4iLCJESUFMT0ciLCJEQVRBX0RJU01JU1MiLCJGSVhFRF9DT05URU5UIiwiX2RpYWxvZyIsIl9iYWNrZHJvcCIsIl9pc1Nob3duIiwiX2lzQm9keU92ZXJmbG93aW5nIiwiX2lnbm9yZUJhY2tkcm9wQ2xpY2siLCJfb3JpZ2luYWxCb2R5UGFkZGluZyIsIl9zY3JvbGxiYXJXaWR0aCIsIl90aGlzOSIsIl9jaGVja1Njcm9sbGJhciIsIl9zZXRTY3JvbGxiYXIiLCJfc2V0RXNjYXBlRXZlbnQiLCJfc2V0UmVzaXplRXZlbnQiLCJfc2hvd0JhY2tkcm9wIiwiX3Nob3dFbGVtZW50IiwiX3RoaXMxMCIsIl9oaWRlTW9kYWwiLCJfdGhpczExIiwiTm9kZSIsIkVMRU1FTlRfTk9ERSIsImRpc3BsYXkiLCJyZW1vdmVBdHRyaWJ1dGUiLCJfZW5mb3JjZUZvY3VzIiwic2hvd25FdmVudCIsInRyYW5zaXRpb25Db21wbGV0ZSIsIl90aGlzMTIiLCJoYXMiLCJfdGhpczEzIiwiX3RoaXMxNCIsIl9oYW5kbGVVcGRhdGUiLCJfdGhpczE1IiwiX3Jlc2V0QWRqdXN0bWVudHMiLCJfcmVzZXRTY3JvbGxiYXIiLCJfcmVtb3ZlQmFja2Ryb3AiLCJjYWxsYmFjayIsIl90aGlzMTYiLCJhbmltYXRlIiwiZG9BbmltYXRlIiwiYXBwZW5kVG8iLCJjdXJyZW50VGFyZ2V0IiwiY2FsbGJhY2tSZW1vdmUiLCJfYWRqdXN0RGlhbG9nIiwiaXNNb2RhbE92ZXJmbG93aW5nIiwicGFkZGluZ0xlZnQiLCJwYWRkaW5nUmlnaHQiLCJfZ2V0U2Nyb2xsYmFyV2lkdGgiLCJib2R5UGFkZGluZyIsInBhcnNlSW50Iiwic2Nyb2xsRGl2Iiwic2Nyb2xsYmFyV2lkdGgiLCJfdGhpczE3IiwiJHRhcmdldCIsIlNjcm9sbFNweSIsIm1ldGhvZCIsIkFDVElWQVRFIiwiU0NST0xMIiwiRFJPUERPV05fSVRFTSIsIkRST1BET1dOX01FTlUiLCJOQVZfTElOSyIsIk5BViIsIkRBVEFfU1BZIiwiTElTVF9JVEVNIiwiTEkiLCJMSV9EUk9QRE9XTiIsIk5BVl9MSU5LUyIsIkRST1BET1dOIiwiRFJPUERPV05fSVRFTVMiLCJEUk9QRE9XTl9UT0dHTEUiLCJPZmZzZXRNZXRob2QiLCJPRkZTRVQiLCJQT1NJVElPTiIsIl90aGlzMTgiLCJfc2Nyb2xsRWxlbWVudCIsIl9zZWxlY3RvciIsIl9vZmZzZXRzIiwiX3RhcmdldHMiLCJfYWN0aXZlVGFyZ2V0IiwiX3Njcm9sbEhlaWdodCIsIl9wcm9jZXNzIiwicmVmcmVzaCIsIl90aGlzMTkiLCJhdXRvTWV0aG9kIiwib2Zmc2V0TWV0aG9kIiwib2Zmc2V0QmFzZSIsIl9nZXRTY3JvbGxUb3AiLCJfZ2V0U2Nyb2xsSGVpZ2h0IiwidGFyZ2V0cyIsInRhcmdldFNlbGVjdG9yIiwiZmlsdGVyIiwiaXRlbSIsInNvcnQiLCJfZ2V0T2Zmc2V0SGVpZ2h0IiwibWF4U2Nyb2xsIiwiX2FjdGl2YXRlIiwiX2NsZWFyIiwiaXNBY3RpdmVUYXJnZXQiLCJxdWVyaWVzIiwiJGxpbmsiLCJzY3JvbGxTcHlzIiwiJHNweSIsIlRhYiIsIkEiLCJMSVNUIiwiRkFERV9DSElMRCIsIkFDVElWRV9DSElMRCIsIkRST1BET1dOX0FDVElWRV9DSElMRCIsIl90aGlzMjAiLCJwcmV2aW91cyIsImxpc3RFbGVtZW50IiwiaGlkZGVuRXZlbnQiLCJjb250YWluZXIiLCJfdGhpczIxIiwiYWN0aXZlIiwiX3RyYW5zaXRpb25Db21wbGV0ZSIsImRyb3Bkb3duQ2hpbGQiLCJkcm9wZG93bkVsZW1lbnQiLCJUb29sdGlwIiwiQ0xBU1NfUFJFRklYIiwiYW5pbWF0aW9uIiwidGVtcGxhdGUiLCJ0aXRsZSIsImRlbGF5IiwiaHRtbCIsInBsYWNlbWVudCIsIkF0dGFjaG1lbnRNYXAiLCJUT1AiLCJCT1RUT00iLCJIb3ZlclN0YXRlIiwiT1VUIiwiSU5TRVJURUQiLCJGT0NVU09VVCIsIlRPT0xUSVAiLCJUT09MVElQX0lOTkVSIiwiVHJpZ2dlciIsIkhPVkVSIiwiTUFOVUFMIiwiX2lzRW5hYmxlZCIsIl90aW1lb3V0IiwiX2hvdmVyU3RhdGUiLCJfYWN0aXZlVHJpZ2dlciIsIl90ZXRoZXIiLCJ0aXAiLCJfc2V0TGlzdGVuZXJzIiwidG9nZ2xlRW5hYmxlZCIsImRhdGFLZXkiLCJfZ2V0RGVsZWdhdGVDb25maWciLCJjbGljayIsIl9pc1dpdGhBY3RpdmVUcmlnZ2VyIiwiX2VudGVyIiwiX2xlYXZlIiwiZ2V0VGlwRWxlbWVudCIsImNsZWFudXBUZXRoZXIiLCJfdGhpczIyIiwiaXNXaXRoQ29udGVudCIsImlzSW5UaGVEb20iLCJ0aXBJZCIsInNldENvbnRlbnQiLCJfZ2V0QXR0YWNobWVudCIsInByZXZIb3ZlclN0YXRlIiwiX1RSQU5TSVRJT05fRFVSQVRJT04iLCJfdGhpczIzIiwiZ2V0VGl0bGUiLCIkdGlwIiwic2V0RWxlbWVudENvbnRlbnQiLCJjb250ZW50IiwiZW1wdHkiLCJhcHBlbmQiLCJ0ZXh0IiwiX3RoaXMyNCIsInRyaWdnZXJzIiwiZXZlbnRJbiIsImV2ZW50T3V0IiwiX2ZpeFRpdGxlIiwidGl0bGVUeXBlIiwiUG9wb3ZlciIsIlRJVExFIiwiQ09OVEVOVCIsIl9Ub29sdGlwIiwiX2dldENvbnRlbnQiLCJmb3VuZGF0aW9uIiwibWVudSIsImxpbmtzIiwibGVuIiwiZ2V0RWxlbWVudHNCeVRhZ05hbWUiLCJvbmNsaWNrIiwidG9nZ2xlRm9jdXMiLCJ0b3VjaFN0YXJ0Rm4iLCJwYXJlbnRMaW5rIiwicXVlcnlTZWxlY3RvckFsbCIsIm1lbnVJdGVtIiwicmVhZHkiLCJ2aWRlb3MiLCJpc0llIiwibmF2aWdhdG9yIiwidXNlckFnZW50IiwibG9jYXRpb24iLCJoYXNoIiwic3Vic3RyaW5nIiwidGFiSW5kZXgiLCJmb290ZXIiLCJzdGlja3lGb290ZXIiXSwibWFwcGluZ3MiOiI7O0FBQUE7O0FBRUMsV0FBU0EsSUFBVCxFQUFlQyxPQUFmLEVBQXdCO0FBQ3ZCLE1BQUksT0FBT0MsTUFBUCxLQUFrQixVQUFsQixJQUFnQ0EsT0FBT0MsR0FBM0MsRUFBZ0Q7QUFDOUNELFdBQU9ELE9BQVA7QUFDRCxHQUZELE1BRU8sSUFBSSxPQUFPRyxPQUFQLEtBQW1CLFFBQXZCLEVBQWlDO0FBQ3RDQyxXQUFPRCxPQUFQLEdBQWlCSCxRQUFRSyxPQUFSLEVBQWlCRixPQUFqQixFQUEwQkMsTUFBMUIsQ0FBakI7QUFDRCxHQUZNLE1BRUE7QUFDTEwsU0FBS08sTUFBTCxHQUFjTixTQUFkO0FBQ0Q7QUFD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QUVwSyxNQUFGLEVBQVUwQixJQUFWLENBQWUsaUNBQWYsRUFBa0QsWUFBWTtBQUMzRCxPQUFJcWxCLFNBQVMzYyxFQUFFLG1CQUFGLENBQWI7QUFDQSxPQUFJbEksTUFBTTZrQixPQUFPaHhCLFFBQVAsRUFBVjtBQUNBLE9BQUlvQyxTQUFTaVMsRUFBRXBLLE1BQUYsRUFBVTdILE1BQVYsRUFBYjtBQUNBQSxZQUFTQSxTQUFTK0osSUFBSTNNLEdBQXRCO0FBQ0E0QyxZQUFTQSxTQUFTNHVCLE9BQU81dUIsTUFBUCxFQUFULEdBQTBCLENBQW5DOztBQUVBLFlBQVM2dUIsWUFBVCxHQUF3QjtBQUN0QkQsYUFBT2pnQixHQUFQLENBQVc7QUFDUCx1QkFBYzNPLFNBQVM7QUFEaEIsT0FBWDtBQUdEOztBQUVELE9BQUlBLFNBQVMsQ0FBYixFQUFnQjtBQUNkNnVCO0FBQ0Q7QUFDSCxDQWhCRCIsImZpbGUiOiJjbGl4ZWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiEgdGV0aGVyIDEuNC4wICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSk7XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5UZXRoZXIgPSBmYWN0b3J5KCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24ocmVxdWlyZSwgZXhwb3J0cywgbW9kdWxlKSB7XG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF9jcmVhdGVDbGFzcyA9IChmdW5jdGlvbiAoKSB7IGZ1bmN0aW9uIGRlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoJ3ZhbHVlJyBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH0gcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfTsgfSkoKTtcblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb24nKTsgfSB9XG5cbnZhciBUZXRoZXJCYXNlID0gdW5kZWZpbmVkO1xuaWYgKHR5cGVvZiBUZXRoZXJCYXNlID09PSAndW5kZWZpbmVkJykge1xuICBUZXRoZXJCYXNlID0geyBtb2R1bGVzOiBbXSB9O1xufVxuXG52YXIgemVyb0VsZW1lbnQgPSBudWxsO1xuXG4vLyBTYW1lIGFzIG5hdGl2ZSBnZXRCb3VuZGluZ0NsaWVudFJlY3QsIGV4Y2VwdCBpdCB0YWtlcyBpbnRvIGFjY291bnQgcGFyZW50IDxmcmFtZT4gb2Zmc2V0c1xuLy8gaWYgdGhlIGVsZW1lbnQgbGllcyB3aXRoaW4gYSBuZXN0ZWQgZG9jdW1lbnQgKDxmcmFtZT4gb3IgPGlmcmFtZT4tbGlrZSkuXG5mdW5jdGlvbiBnZXRBY3R1YWxCb3VuZGluZ0NsaWVudFJlY3Qobm9kZSkge1xuICB2YXIgYm91bmRpbmdSZWN0ID0gbm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAvLyBUaGUgb3JpZ2luYWwgb2JqZWN0IHJldHVybmVkIGJ5IGdldEJvdW5kaW5nQ2xpZW50UmVjdCBpcyBpbW11dGFibGUsIHNvIHdlIGNsb25lIGl0XG4gIC8vIFdlIGNhbid0IHVzZSBleHRlbmQgYmVjYXVzZSB0aGUgcHJvcGVydGllcyBhcmUgbm90IGNvbnNpZGVyZWQgcGFydCBvZiB0aGUgb2JqZWN0IGJ5IGhhc093blByb3BlcnR5IGluIElFOVxuICB2YXIgcmVjdCA9IHt9O1xuICBmb3IgKHZhciBrIGluIGJvdW5kaW5nUmVjdCkge1xuICAgIHJlY3Rba10gPSBib3VuZGluZ1JlY3Rba107XG4gIH1cblxuICBpZiAobm9kZS5vd25lckRvY3VtZW50ICE9PSBkb2N1bWVudCkge1xuICAgIHZhciBfZnJhbWVFbGVtZW50ID0gbm9kZS5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3LmZyYW1lRWxlbWVudDtcbiAgICBpZiAoX2ZyYW1lRWxlbWVudCkge1xuICAgICAgdmFyIGZyYW1lUmVjdCA9IGdldEFjdHVhbEJvdW5kaW5nQ2xpZW50UmVjdChfZnJhbWVFbGVtZW50KTtcbiAgICAgIHJlY3QudG9wICs9IGZyYW1lUmVjdC50b3A7XG4gICAgICByZWN0LmJvdHRvbSArPSBmcmFtZVJlY3QudG9wO1xuICAgICAgcmVjdC5sZWZ0ICs9IGZyYW1lUmVjdC5sZWZ0O1xuICAgICAgcmVjdC5yaWdodCArPSBmcmFtZVJlY3QubGVmdDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVjdDtcbn1cblxuZnVuY3Rpb24gZ2V0U2Nyb2xsUGFyZW50cyhlbCkge1xuICAvLyBJbiBmaXJlZm94IGlmIHRoZSBlbCBpcyBpbnNpZGUgYW4gaWZyYW1lIHdpdGggZGlzcGxheTogbm9uZTsgd2luZG93LmdldENvbXB1dGVkU3R5bGUoKSB3aWxsIHJldHVybiBudWxsO1xuICAvLyBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD01NDgzOTdcbiAgdmFyIGNvbXB1dGVkU3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKGVsKSB8fCB7fTtcbiAgdmFyIHBvc2l0aW9uID0gY29tcHV0ZWRTdHlsZS5wb3NpdGlvbjtcbiAgdmFyIHBhcmVudHMgPSBbXTtcblxuICBpZiAocG9zaXRpb24gPT09ICdmaXhlZCcpIHtcbiAgICByZXR1cm4gW2VsXTtcbiAgfVxuXG4gIHZhciBwYXJlbnQgPSBlbDtcbiAgd2hpbGUgKChwYXJlbnQgPSBwYXJlbnQucGFyZW50Tm9kZSkgJiYgcGFyZW50ICYmIHBhcmVudC5ub2RlVHlwZSA9PT0gMSkge1xuICAgIHZhciBzdHlsZSA9IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKHBhcmVudCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7fVxuXG4gICAgaWYgKHR5cGVvZiBzdHlsZSA9PT0gJ3VuZGVmaW5lZCcgfHwgc3R5bGUgPT09IG51bGwpIHtcbiAgICAgIHBhcmVudHMucHVzaChwYXJlbnQpO1xuICAgICAgcmV0dXJuIHBhcmVudHM7XG4gICAgfVxuXG4gICAgdmFyIF9zdHlsZSA9IHN0eWxlO1xuICAgIHZhciBvdmVyZmxvdyA9IF9zdHlsZS5vdmVyZmxvdztcbiAgICB2YXIgb3ZlcmZsb3dYID0gX3N0eWxlLm92ZXJmbG93WDtcbiAgICB2YXIgb3ZlcmZsb3dZID0gX3N0eWxlLm92ZXJmbG93WTtcblxuICAgIGlmICgvKGF1dG98c2Nyb2xsKS8udGVzdChvdmVyZmxvdyArIG92ZXJmbG93WSArIG92ZXJmbG93WCkpIHtcbiAgICAgIGlmIChwb3NpdGlvbiAhPT0gJ2Fic29sdXRlJyB8fCBbJ3JlbGF0aXZlJywgJ2Fic29sdXRlJywgJ2ZpeGVkJ10uaW5kZXhPZihzdHlsZS5wb3NpdGlvbikgPj0gMCkge1xuICAgICAgICBwYXJlbnRzLnB1c2gocGFyZW50KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwYXJlbnRzLnB1c2goZWwub3duZXJEb2N1bWVudC5ib2R5KTtcblxuICAvLyBJZiB0aGUgbm9kZSBpcyB3aXRoaW4gYSBmcmFtZSwgYWNjb3VudCBmb3IgdGhlIHBhcmVudCB3aW5kb3cgc2Nyb2xsXG4gIGlmIChlbC5vd25lckRvY3VtZW50ICE9PSBkb2N1bWVudCkge1xuICAgIHBhcmVudHMucHVzaChlbC5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3KTtcbiAgfVxuXG4gIHJldHVybiBwYXJlbnRzO1xufVxuXG52YXIgdW5pcXVlSWQgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgaWQgPSAwO1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiArK2lkO1xuICB9O1xufSkoKTtcblxudmFyIHplcm9Qb3NDYWNoZSA9IHt9O1xudmFyIGdldE9yaWdpbiA9IGZ1bmN0aW9uIGdldE9yaWdpbigpIHtcbiAgLy8gZ2V0Qm91bmRpbmdDbGllbnRSZWN0IGlzIHVuZm9ydHVuYXRlbHkgdG9vIGFjY3VyYXRlLiAgSXQgaW50cm9kdWNlcyBhIHBpeGVsIG9yIHR3byBvZlxuICAvLyBqaXR0ZXIgYXMgdGhlIHVzZXIgc2Nyb2xscyB0aGF0IG1lc3NlcyB3aXRoIG91ciBhYmlsaXR5IHRvIGRldGVjdCBpZiB0d28gcG9zaXRpb25zXG4gIC8vIGFyZSBlcXVpdmlsYW50IG9yIG5vdC4gIFdlIHBsYWNlIGFuIGVsZW1lbnQgYXQgdGhlIHRvcCBsZWZ0IG9mIHRoZSBwYWdlIHRoYXQgd2lsbFxuICAvLyBnZXQgdGhlIHNhbWUgaml0dGVyLCBzbyB3ZSBjYW4gY2FuY2VsIHRoZSB0d28gb3V0LlxuICB2YXIgbm9kZSA9IHplcm9FbGVtZW50O1xuICBpZiAoIW5vZGUgfHwgIWRvY3VtZW50LmJvZHkuY29udGFpbnMobm9kZSkpIHtcbiAgICBub2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgbm9kZS5zZXRBdHRyaWJ1dGUoJ2RhdGEtdGV0aGVyLWlkJywgdW5pcXVlSWQoKSk7XG4gICAgZXh0ZW5kKG5vZGUuc3R5bGUsIHtcbiAgICAgIHRvcDogMCxcbiAgICAgIGxlZnQ6IDAsXG4gICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJ1xuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub2RlKTtcblxuICAgIHplcm9FbGVtZW50ID0gbm9kZTtcbiAgfVxuXG4gIHZhciBpZCA9IG5vZGUuZ2V0QXR0cmlidXRlKCdkYXRhLXRldGhlci1pZCcpO1xuICBpZiAodHlwZW9mIHplcm9Qb3NDYWNoZVtpZF0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgemVyb1Bvc0NhY2hlW2lkXSA9IGdldEFjdHVhbEJvdW5kaW5nQ2xpZW50UmVjdChub2RlKTtcblxuICAgIC8vIENsZWFyIHRoZSBjYWNoZSB3aGVuIHRoaXMgcG9zaXRpb24gY2FsbCBpcyBkb25lXG4gICAgZGVmZXIoZnVuY3Rpb24gKCkge1xuICAgICAgZGVsZXRlIHplcm9Qb3NDYWNoZVtpZF07XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gemVyb1Bvc0NhY2hlW2lkXTtcbn07XG5cbmZ1bmN0aW9uIHJlbW92ZVV0aWxFbGVtZW50cygpIHtcbiAgaWYgKHplcm9FbGVtZW50KSB7XG4gICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh6ZXJvRWxlbWVudCk7XG4gIH1cbiAgemVyb0VsZW1lbnQgPSBudWxsO1xufTtcblxuZnVuY3Rpb24gZ2V0Qm91bmRzKGVsKSB7XG4gIHZhciBkb2MgPSB1bmRlZmluZWQ7XG4gIGlmIChlbCA9PT0gZG9jdW1lbnQpIHtcbiAgICBkb2MgPSBkb2N1bWVudDtcbiAgICBlbCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgfSBlbHNlIHtcbiAgICBkb2MgPSBlbC5vd25lckRvY3VtZW50O1xuICB9XG5cbiAgdmFyIGRvY0VsID0gZG9jLmRvY3VtZW50RWxlbWVudDtcblxuICB2YXIgYm94ID0gZ2V0QWN0dWFsQm91bmRpbmdDbGllbnRSZWN0KGVsKTtcblxuICB2YXIgb3JpZ2luID0gZ2V0T3JpZ2luKCk7XG5cbiAgYm94LnRvcCAtPSBvcmlnaW4udG9wO1xuICBib3gubGVmdCAtPSBvcmlnaW4ubGVmdDtcblxuICBpZiAodHlwZW9mIGJveC53aWR0aCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBib3gud2lkdGggPSBkb2N1bWVudC5ib2R5LnNjcm9sbFdpZHRoIC0gYm94LmxlZnQgLSBib3gucmlnaHQ7XG4gIH1cbiAgaWYgKHR5cGVvZiBib3guaGVpZ2h0ID09PSAndW5kZWZpbmVkJykge1xuICAgIGJveC5oZWlnaHQgPSBkb2N1bWVudC5ib2R5LnNjcm9sbEhlaWdodCAtIGJveC50b3AgLSBib3guYm90dG9tO1xuICB9XG5cbiAgYm94LnRvcCA9IGJveC50b3AgLSBkb2NFbC5jbGllbnRUb3A7XG4gIGJveC5sZWZ0ID0gYm94LmxlZnQgLSBkb2NFbC5jbGllbnRMZWZ0O1xuICBib3gucmlnaHQgPSBkb2MuYm9keS5jbGllbnRXaWR0aCAtIGJveC53aWR0aCAtIGJveC5sZWZ0O1xuICBib3guYm90dG9tID0gZG9jLmJvZHkuY2xpZW50SGVpZ2h0IC0gYm94LmhlaWdodCAtIGJveC50b3A7XG5cbiAgcmV0dXJuIGJveDtcbn1cblxuZnVuY3Rpb24gZ2V0T2Zmc2V0UGFyZW50KGVsKSB7XG4gIHJldHVybiBlbC5vZmZzZXRQYXJlbnQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xufVxuXG52YXIgX3Njcm9sbEJhclNpemUgPSBudWxsO1xuZnVuY3Rpb24gZ2V0U2Nyb2xsQmFyU2l6ZSgpIHtcbiAgaWYgKF9zY3JvbGxCYXJTaXplKSB7XG4gICAgcmV0dXJuIF9zY3JvbGxCYXJTaXplO1xuICB9XG4gIHZhciBpbm5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBpbm5lci5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgaW5uZXIuc3R5bGUuaGVpZ2h0ID0gJzIwMHB4JztcblxuICB2YXIgb3V0ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZXh0ZW5kKG91dGVyLnN0eWxlLCB7XG4gICAgcG9zaXRpb246ICdhYnNvbHV0ZScsXG4gICAgdG9wOiAwLFxuICAgIGxlZnQ6IDAsXG4gICAgcG9pbnRlckV2ZW50czogJ25vbmUnLFxuICAgIHZpc2liaWxpdHk6ICdoaWRkZW4nLFxuICAgIHdpZHRoOiAnMjAwcHgnLFxuICAgIGhlaWdodDogJzE1MHB4JyxcbiAgICBvdmVyZmxvdzogJ2hpZGRlbidcbiAgfSk7XG5cbiAgb3V0ZXIuYXBwZW5kQ2hpbGQoaW5uZXIpO1xuXG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQob3V0ZXIpO1xuXG4gIHZhciB3aWR0aENvbnRhaW5lZCA9IGlubmVyLm9mZnNldFdpZHRoO1xuICBvdXRlci5zdHlsZS5vdmVyZmxvdyA9ICdzY3JvbGwnO1xuICB2YXIgd2lkdGhTY3JvbGwgPSBpbm5lci5vZmZzZXRXaWR0aDtcblxuICBpZiAod2lkdGhDb250YWluZWQgPT09IHdpZHRoU2Nyb2xsKSB7XG4gICAgd2lkdGhTY3JvbGwgPSBvdXRlci5jbGllbnRXaWR0aDtcbiAgfVxuXG4gIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQob3V0ZXIpO1xuXG4gIHZhciB3aWR0aCA9IHdpZHRoQ29udGFpbmVkIC0gd2lkdGhTY3JvbGw7XG5cbiAgX3Njcm9sbEJhclNpemUgPSB7IHdpZHRoOiB3aWR0aCwgaGVpZ2h0OiB3aWR0aCB9O1xuICByZXR1cm4gX3Njcm9sbEJhclNpemU7XG59XG5cbmZ1bmN0aW9uIGV4dGVuZCgpIHtcbiAgdmFyIG91dCA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzBdO1xuXG4gIHZhciBhcmdzID0gW107XG5cbiAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoYXJncywgYXJndW1lbnRzKTtcblxuICBhcmdzLnNsaWNlKDEpLmZvckVhY2goZnVuY3Rpb24gKG9iaikge1xuICAgIGlmIChvYmopIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKCh7fSkuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHtcbiAgICAgICAgICBvdXRba2V5XSA9IG9ialtrZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiByZW1vdmVDbGFzcyhlbCwgbmFtZSkge1xuICBpZiAodHlwZW9mIGVsLmNsYXNzTGlzdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBuYW1lLnNwbGl0KCcgJykuZm9yRWFjaChmdW5jdGlvbiAoY2xzKSB7XG4gICAgICBpZiAoY2xzLnRyaW0oKSkge1xuICAgICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKGNscyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCgnKF58ICknICsgbmFtZS5zcGxpdCgnICcpLmpvaW4oJ3wnKSArICcoIHwkKScsICdnaScpO1xuICAgIHZhciBjbGFzc05hbWUgPSBnZXRDbGFzc05hbWUoZWwpLnJlcGxhY2UocmVnZXgsICcgJyk7XG4gICAgc2V0Q2xhc3NOYW1lKGVsLCBjbGFzc05hbWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFkZENsYXNzKGVsLCBuYW1lKSB7XG4gIGlmICh0eXBlb2YgZWwuY2xhc3NMaXN0ICE9PSAndW5kZWZpbmVkJykge1xuICAgIG5hbWUuc3BsaXQoJyAnKS5mb3JFYWNoKGZ1bmN0aW9uIChjbHMpIHtcbiAgICAgIGlmIChjbHMudHJpbSgpKSB7XG4gICAgICAgIGVsLmNsYXNzTGlzdC5hZGQoY2xzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByZW1vdmVDbGFzcyhlbCwgbmFtZSk7XG4gICAgdmFyIGNscyA9IGdldENsYXNzTmFtZShlbCkgKyAoJyAnICsgbmFtZSk7XG4gICAgc2V0Q2xhc3NOYW1lKGVsLCBjbHMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhc0NsYXNzKGVsLCBuYW1lKSB7XG4gIGlmICh0eXBlb2YgZWwuY2xhc3NMaXN0ICE9PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBlbC5jbGFzc0xpc3QuY29udGFpbnMobmFtZSk7XG4gIH1cbiAgdmFyIGNsYXNzTmFtZSA9IGdldENsYXNzTmFtZShlbCk7XG4gIHJldHVybiBuZXcgUmVnRXhwKCcoXnwgKScgKyBuYW1lICsgJyggfCQpJywgJ2dpJykudGVzdChjbGFzc05hbWUpO1xufVxuXG5mdW5jdGlvbiBnZXRDbGFzc05hbWUoZWwpIHtcbiAgLy8gQ2FuJ3QgdXNlIGp1c3QgU1ZHQW5pbWF0ZWRTdHJpbmcgaGVyZSBzaW5jZSBub2RlcyB3aXRoaW4gYSBGcmFtZSBpbiBJRSBoYXZlXG4gIC8vIGNvbXBsZXRlbHkgc2VwYXJhdGVseSBTVkdBbmltYXRlZFN0cmluZyBiYXNlIGNsYXNzZXNcbiAgaWYgKGVsLmNsYXNzTmFtZSBpbnN0YW5jZW9mIGVsLm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcuU1ZHQW5pbWF0ZWRTdHJpbmcpIHtcbiAgICByZXR1cm4gZWwuY2xhc3NOYW1lLmJhc2VWYWw7XG4gIH1cbiAgcmV0dXJuIGVsLmNsYXNzTmFtZTtcbn1cblxuZnVuY3Rpb24gc2V0Q2xhc3NOYW1lKGVsLCBjbGFzc05hbWUpIHtcbiAgZWwuc2V0QXR0cmlidXRlKCdjbGFzcycsIGNsYXNzTmFtZSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUNsYXNzZXMoZWwsIGFkZCwgYWxsKSB7XG4gIC8vIE9mIHRoZSBzZXQgb2YgJ2FsbCcgY2xhc3Nlcywgd2UgbmVlZCB0aGUgJ2FkZCcgY2xhc3NlcywgYW5kIG9ubHkgdGhlXG4gIC8vICdhZGQnIGNsYXNzZXMgdG8gYmUgc2V0LlxuICBhbGwuZm9yRWFjaChmdW5jdGlvbiAoY2xzKSB7XG4gICAgaWYgKGFkZC5pbmRleE9mKGNscykgPT09IC0xICYmIGhhc0NsYXNzKGVsLCBjbHMpKSB7XG4gICAgICByZW1vdmVDbGFzcyhlbCwgY2xzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGFkZC5mb3JFYWNoKGZ1bmN0aW9uIChjbHMpIHtcbiAgICBpZiAoIWhhc0NsYXNzKGVsLCBjbHMpKSB7XG4gICAgICBhZGRDbGFzcyhlbCwgY2xzKTtcbiAgICB9XG4gIH0pO1xufVxuXG52YXIgZGVmZXJyZWQgPSBbXTtcblxudmFyIGRlZmVyID0gZnVuY3Rpb24gZGVmZXIoZm4pIHtcbiAgZGVmZXJyZWQucHVzaChmbik7XG59O1xuXG52YXIgZmx1c2ggPSBmdW5jdGlvbiBmbHVzaCgpIHtcbiAgdmFyIGZuID0gdW5kZWZpbmVkO1xuICB3aGlsZSAoZm4gPSBkZWZlcnJlZC5wb3AoKSkge1xuICAgIGZuKCk7XG4gIH1cbn07XG5cbnZhciBFdmVudGVkID0gKGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gRXZlbnRlZCgpIHtcbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgRXZlbnRlZCk7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoRXZlbnRlZCwgW3tcbiAgICBrZXk6ICdvbicsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIG9uKGV2ZW50LCBoYW5kbGVyLCBjdHgpIHtcbiAgICAgIHZhciBvbmNlID0gYXJndW1lbnRzLmxlbmd0aCA8PSAzIHx8IGFyZ3VtZW50c1szXSA9PT0gdW5kZWZpbmVkID8gZmFsc2UgOiBhcmd1bWVudHNbM107XG5cbiAgICAgIGlmICh0eXBlb2YgdGhpcy5iaW5kaW5ncyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhpcy5iaW5kaW5ncyA9IHt9O1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiB0aGlzLmJpbmRpbmdzW2V2ZW50XSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhpcy5iaW5kaW5nc1tldmVudF0gPSBbXTtcbiAgICAgIH1cbiAgICAgIHRoaXMuYmluZGluZ3NbZXZlbnRdLnB1c2goeyBoYW5kbGVyOiBoYW5kbGVyLCBjdHg6IGN0eCwgb25jZTogb25jZSB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdvbmNlJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gb25jZShldmVudCwgaGFuZGxlciwgY3R4KSB7XG4gICAgICB0aGlzLm9uKGV2ZW50LCBoYW5kbGVyLCBjdHgsIHRydWUpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ29mZicsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIG9mZihldmVudCwgaGFuZGxlcikge1xuICAgICAgaWYgKHR5cGVvZiB0aGlzLmJpbmRpbmdzID09PSAndW5kZWZpbmVkJyB8fCB0eXBlb2YgdGhpcy5iaW5kaW5nc1tldmVudF0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBkZWxldGUgdGhpcy5iaW5kaW5nc1tldmVudF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgIHdoaWxlIChpIDwgdGhpcy5iaW5kaW5nc1tldmVudF0ubGVuZ3RoKSB7XG4gICAgICAgICAgaWYgKHRoaXMuYmluZGluZ3NbZXZlbnRdW2ldLmhhbmRsZXIgPT09IGhhbmRsZXIpIHtcbiAgICAgICAgICAgIHRoaXMuYmluZGluZ3NbZXZlbnRdLnNwbGljZShpLCAxKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgKytpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ3RyaWdnZXInLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB0cmlnZ2VyKGV2ZW50KSB7XG4gICAgICBpZiAodHlwZW9mIHRoaXMuYmluZGluZ3MgIT09ICd1bmRlZmluZWQnICYmIHRoaXMuYmluZGluZ3NbZXZlbnRdKSB7XG4gICAgICAgIHZhciBpID0gMDtcblxuICAgICAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4gPiAxID8gX2xlbiAtIDEgOiAwKSwgX2tleSA9IDE7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICAgICAgICBhcmdzW19rZXkgLSAxXSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlIChpIDwgdGhpcy5iaW5kaW5nc1tldmVudF0ubGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIF9iaW5kaW5ncyRldmVudCRpID0gdGhpcy5iaW5kaW5nc1tldmVudF1baV07XG4gICAgICAgICAgdmFyIGhhbmRsZXIgPSBfYmluZGluZ3MkZXZlbnQkaS5oYW5kbGVyO1xuICAgICAgICAgIHZhciBjdHggPSBfYmluZGluZ3MkZXZlbnQkaS5jdHg7XG4gICAgICAgICAgdmFyIG9uY2UgPSBfYmluZGluZ3MkZXZlbnQkaS5vbmNlO1xuXG4gICAgICAgICAgdmFyIGNvbnRleHQgPSBjdHg7XG4gICAgICAgICAgaWYgKHR5cGVvZiBjb250ZXh0ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaGFuZGxlci5hcHBseShjb250ZXh0LCBhcmdzKTtcblxuICAgICAgICAgIGlmIChvbmNlKSB7XG4gICAgICAgICAgICB0aGlzLmJpbmRpbmdzW2V2ZW50XS5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICsraTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1dKTtcblxuICByZXR1cm4gRXZlbnRlZDtcbn0pKCk7XG5cblRldGhlckJhc2UuVXRpbHMgPSB7XG4gIGdldEFjdHVhbEJvdW5kaW5nQ2xpZW50UmVjdDogZ2V0QWN0dWFsQm91bmRpbmdDbGllbnRSZWN0LFxuICBnZXRTY3JvbGxQYXJlbnRzOiBnZXRTY3JvbGxQYXJlbnRzLFxuICBnZXRCb3VuZHM6IGdldEJvdW5kcyxcbiAgZ2V0T2Zmc2V0UGFyZW50OiBnZXRPZmZzZXRQYXJlbnQsXG4gIGV4dGVuZDogZXh0ZW5kLFxuICBhZGRDbGFzczogYWRkQ2xhc3MsXG4gIHJlbW92ZUNsYXNzOiByZW1vdmVDbGFzcyxcbiAgaGFzQ2xhc3M6IGhhc0NsYXNzLFxuICB1cGRhdGVDbGFzc2VzOiB1cGRhdGVDbGFzc2VzLFxuICBkZWZlcjogZGVmZXIsXG4gIGZsdXNoOiBmbHVzaCxcbiAgdW5pcXVlSWQ6IHVuaXF1ZUlkLFxuICBFdmVudGVkOiBFdmVudGVkLFxuICBnZXRTY3JvbGxCYXJTaXplOiBnZXRTY3JvbGxCYXJTaXplLFxuICByZW1vdmVVdGlsRWxlbWVudHM6IHJlbW92ZVV0aWxFbGVtZW50c1xufTtcbi8qIGdsb2JhbHMgVGV0aGVyQmFzZSwgcGVyZm9ybWFuY2UgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgX3NsaWNlZFRvQXJyYXkgPSAoZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBzbGljZUl0ZXJhdG9yKGFyciwgaSkgeyB2YXIgX2FyciA9IFtdOyB2YXIgX24gPSB0cnVlOyB2YXIgX2QgPSBmYWxzZTsgdmFyIF9lID0gdW5kZWZpbmVkOyB0cnkgeyBmb3IgKHZhciBfaSA9IGFycltTeW1ib2wuaXRlcmF0b3JdKCksIF9zOyAhKF9uID0gKF9zID0gX2kubmV4dCgpKS5kb25lKTsgX24gPSB0cnVlKSB7IF9hcnIucHVzaChfcy52YWx1ZSk7IGlmIChpICYmIF9hcnIubGVuZ3RoID09PSBpKSBicmVhazsgfSB9IGNhdGNoIChlcnIpIHsgX2QgPSB0cnVlOyBfZSA9IGVycjsgfSBmaW5hbGx5IHsgdHJ5IHsgaWYgKCFfbiAmJiBfaVsncmV0dXJuJ10pIF9pWydyZXR1cm4nXSgpOyB9IGZpbmFsbHkgeyBpZiAoX2QpIHRocm93IF9lOyB9IH0gcmV0dXJuIF9hcnI7IH0gcmV0dXJuIGZ1bmN0aW9uIChhcnIsIGkpIHsgaWYgKEFycmF5LmlzQXJyYXkoYXJyKSkgeyByZXR1cm4gYXJyOyB9IGVsc2UgaWYgKFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoYXJyKSkgeyByZXR1cm4gc2xpY2VJdGVyYXRvcihhcnIsIGkpOyB9IGVsc2UgeyB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGF0dGVtcHQgdG8gZGVzdHJ1Y3R1cmUgbm9uLWl0ZXJhYmxlIGluc3RhbmNlJyk7IH0gfTsgfSkoKTtcblxudmFyIF9jcmVhdGVDbGFzcyA9IChmdW5jdGlvbiAoKSB7IGZ1bmN0aW9uIGRlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoJ3ZhbHVlJyBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH0gcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfTsgfSkoKTtcblxudmFyIF9nZXQgPSBmdW5jdGlvbiBnZXQoX3g2LCBfeDcsIF94OCkgeyB2YXIgX2FnYWluID0gdHJ1ZTsgX2Z1bmN0aW9uOiB3aGlsZSAoX2FnYWluKSB7IHZhciBvYmplY3QgPSBfeDYsIHByb3BlcnR5ID0gX3g3LCByZWNlaXZlciA9IF94ODsgX2FnYWluID0gZmFsc2U7IGlmIChvYmplY3QgPT09IG51bGwpIG9iamVjdCA9IEZ1bmN0aW9uLnByb3RvdHlwZTsgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgcHJvcGVydHkpOyBpZiAoZGVzYyA9PT0gdW5kZWZpbmVkKSB7IHZhciBwYXJlbnQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqZWN0KTsgaWYgKHBhcmVudCA9PT0gbnVsbCkgeyByZXR1cm4gdW5kZWZpbmVkOyB9IGVsc2UgeyBfeDYgPSBwYXJlbnQ7IF94NyA9IHByb3BlcnR5OyBfeDggPSByZWNlaXZlcjsgX2FnYWluID0gdHJ1ZTsgZGVzYyA9IHBhcmVudCA9IHVuZGVmaW5lZDsgY29udGludWUgX2Z1bmN0aW9uOyB9IH0gZWxzZSBpZiAoJ3ZhbHVlJyBpbiBkZXNjKSB7IHJldHVybiBkZXNjLnZhbHVlOyB9IGVsc2UgeyB2YXIgZ2V0dGVyID0gZGVzYy5nZXQ7IGlmIChnZXR0ZXIgPT09IHVuZGVmaW5lZCkgeyByZXR1cm4gdW5kZWZpbmVkOyB9IHJldHVybiBnZXR0ZXIuY2FsbChyZWNlaXZlcik7IH0gfSB9O1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvbicpOyB9IH1cblxuZnVuY3Rpb24gX2luaGVyaXRzKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7IGlmICh0eXBlb2Ygc3VwZXJDbGFzcyAhPT0gJ2Z1bmN0aW9uJyAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ1N1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uLCBub3QgJyArIHR5cGVvZiBzdXBlckNsYXNzKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCBlbnVtZXJhYmxlOiBmYWxzZSwgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH0pOyBpZiAoc3VwZXJDbGFzcykgT2JqZWN0LnNldFByb3RvdHlwZU9mID8gT2JqZWN0LnNldFByb3RvdHlwZU9mKHN1YkNsYXNzLCBzdXBlckNsYXNzKSA6IHN1YkNsYXNzLl9fcHJvdG9fXyA9IHN1cGVyQ2xhc3M7IH1cblxuaWYgKHR5cGVvZiBUZXRoZXJCYXNlID09PSAndW5kZWZpbmVkJykge1xuICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBtdXN0IGluY2x1ZGUgdGhlIHV0aWxzLmpzIGZpbGUgYmVmb3JlIHRldGhlci5qcycpO1xufVxuXG52YXIgX1RldGhlckJhc2UkVXRpbHMgPSBUZXRoZXJCYXNlLlV0aWxzO1xudmFyIGdldFNjcm9sbFBhcmVudHMgPSBfVGV0aGVyQmFzZSRVdGlscy5nZXRTY3JvbGxQYXJlbnRzO1xudmFyIGdldEJvdW5kcyA9IF9UZXRoZXJCYXNlJFV0aWxzLmdldEJvdW5kcztcbnZhciBnZXRPZmZzZXRQYXJlbnQgPSBfVGV0aGVyQmFzZSRVdGlscy5nZXRPZmZzZXRQYXJlbnQ7XG52YXIgZXh0ZW5kID0gX1RldGhlckJhc2UkVXRpbHMuZXh0ZW5kO1xudmFyIGFkZENsYXNzID0gX1RldGhlckJhc2UkVXRpbHMuYWRkQ2xhc3M7XG52YXIgcmVtb3ZlQ2xhc3MgPSBfVGV0aGVyQmFzZSRVdGlscy5yZW1vdmVDbGFzcztcbnZhciB1cGRhdGVDbGFzc2VzID0gX1RldGhlckJhc2UkVXRpbHMudXBkYXRlQ2xhc3NlcztcbnZhciBkZWZlciA9IF9UZXRoZXJCYXNlJFV0aWxzLmRlZmVyO1xudmFyIGZsdXNoID0gX1RldGhlckJhc2UkVXRpbHMuZmx1c2g7XG52YXIgZ2V0U2Nyb2xsQmFyU2l6ZSA9IF9UZXRoZXJCYXNlJFV0aWxzLmdldFNjcm9sbEJhclNpemU7XG52YXIgcmVtb3ZlVXRpbEVsZW1lbnRzID0gX1RldGhlckJhc2UkVXRpbHMucmVtb3ZlVXRpbEVsZW1lbnRzO1xuXG5mdW5jdGlvbiB3aXRoaW4oYSwgYikge1xuICB2YXIgZGlmZiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IDEgOiBhcmd1bWVudHNbMl07XG5cbiAgcmV0dXJuIGEgKyBkaWZmID49IGIgJiYgYiA+PSBhIC0gZGlmZjtcbn1cblxudmFyIHRyYW5zZm9ybUtleSA9IChmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuICcnO1xuICB9XG4gIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gIHZhciB0cmFuc2Zvcm1zID0gWyd0cmFuc2Zvcm0nLCAnV2Via2l0VHJhbnNmb3JtJywgJ09UcmFuc2Zvcm0nLCAnTW96VHJhbnNmb3JtJywgJ21zVHJhbnNmb3JtJ107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdHJhbnNmb3Jtcy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBrZXkgPSB0cmFuc2Zvcm1zW2ldO1xuICAgIGlmIChlbC5zdHlsZVtrZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBrZXk7XG4gICAgfVxuICB9XG59KSgpO1xuXG52YXIgdGV0aGVycyA9IFtdO1xuXG52YXIgcG9zaXRpb24gPSBmdW5jdGlvbiBwb3NpdGlvbigpIHtcbiAgdGV0aGVycy5mb3JFYWNoKGZ1bmN0aW9uICh0ZXRoZXIpIHtcbiAgICB0ZXRoZXIucG9zaXRpb24oZmFsc2UpO1xuICB9KTtcbiAgZmx1c2goKTtcbn07XG5cbmZ1bmN0aW9uIG5vdygpIHtcbiAgaWYgKHR5cGVvZiBwZXJmb3JtYW5jZSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHBlcmZvcm1hbmNlLm5vdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm4gcGVyZm9ybWFuY2Uubm93KCk7XG4gIH1cbiAgcmV0dXJuICtuZXcgRGF0ZSgpO1xufVxuXG4oZnVuY3Rpb24gKCkge1xuICB2YXIgbGFzdENhbGwgPSBudWxsO1xuICB2YXIgbGFzdER1cmF0aW9uID0gbnVsbDtcbiAgdmFyIHBlbmRpbmdUaW1lb3V0ID0gbnVsbDtcblxuICB2YXIgdGljayA9IGZ1bmN0aW9uIHRpY2soKSB7XG4gICAgaWYgKHR5cGVvZiBsYXN0RHVyYXRpb24gIT09ICd1bmRlZmluZWQnICYmIGxhc3REdXJhdGlvbiA+IDE2KSB7XG4gICAgICAvLyBXZSB2b2x1bnRhcmlseSB0aHJvdHRsZSBvdXJzZWx2ZXMgaWYgd2UgY2FuJ3QgbWFuYWdlIDYwZnBzXG4gICAgICBsYXN0RHVyYXRpb24gPSBNYXRoLm1pbihsYXN0RHVyYXRpb24gLSAxNiwgMjUwKTtcblxuICAgICAgLy8gSnVzdCBpbiBjYXNlIHRoaXMgaXMgdGhlIGxhc3QgZXZlbnQsIHJlbWVtYmVyIHRvIHBvc2l0aW9uIGp1c3Qgb25jZSBtb3JlXG4gICAgICBwZW5kaW5nVGltZW91dCA9IHNldFRpbWVvdXQodGljaywgMjUwKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGxhc3RDYWxsICE9PSAndW5kZWZpbmVkJyAmJiBub3coKSAtIGxhc3RDYWxsIDwgMTApIHtcbiAgICAgIC8vIFNvbWUgYnJvd3NlcnMgY2FsbCBldmVudHMgYSBsaXR0bGUgdG9vIGZyZXF1ZW50bHksIHJlZnVzZSB0byBydW4gbW9yZSB0aGFuIGlzIHJlYXNvbmFibGVcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAocGVuZGluZ1RpbWVvdXQgIT0gbnVsbCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHBlbmRpbmdUaW1lb3V0KTtcbiAgICAgIHBlbmRpbmdUaW1lb3V0ID0gbnVsbDtcbiAgICB9XG5cbiAgICBsYXN0Q2FsbCA9IG5vdygpO1xuICAgIHBvc2l0aW9uKCk7XG4gICAgbGFzdER1cmF0aW9uID0gbm93KCkgLSBsYXN0Q2FsbDtcbiAgfTtcblxuICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyICE9PSAndW5kZWZpbmVkJykge1xuICAgIFsncmVzaXplJywgJ3Njcm9sbCcsICd0b3VjaG1vdmUnXS5mb3JFYWNoKGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIHRpY2spO1xuICAgIH0pO1xuICB9XG59KSgpO1xuXG52YXIgTUlSUk9SX0xSID0ge1xuICBjZW50ZXI6ICdjZW50ZXInLFxuICBsZWZ0OiAncmlnaHQnLFxuICByaWdodDogJ2xlZnQnXG59O1xuXG52YXIgTUlSUk9SX1RCID0ge1xuICBtaWRkbGU6ICdtaWRkbGUnLFxuICB0b3A6ICdib3R0b20nLFxuICBib3R0b206ICd0b3AnXG59O1xuXG52YXIgT0ZGU0VUX01BUCA9IHtcbiAgdG9wOiAwLFxuICBsZWZ0OiAwLFxuICBtaWRkbGU6ICc1MCUnLFxuICBjZW50ZXI6ICc1MCUnLFxuICBib3R0b206ICcxMDAlJyxcbiAgcmlnaHQ6ICcxMDAlJ1xufTtcblxudmFyIGF1dG9Ub0ZpeGVkQXR0YWNobWVudCA9IGZ1bmN0aW9uIGF1dG9Ub0ZpeGVkQXR0YWNobWVudChhdHRhY2htZW50LCByZWxhdGl2ZVRvQXR0YWNobWVudCkge1xuICB2YXIgbGVmdCA9IGF0dGFjaG1lbnQubGVmdDtcbiAgdmFyIHRvcCA9IGF0dGFjaG1lbnQudG9wO1xuXG4gIGlmIChsZWZ0ID09PSAnYXV0bycpIHtcbiAgICBsZWZ0ID0gTUlSUk9SX0xSW3JlbGF0aXZlVG9BdHRhY2htZW50LmxlZnRdO1xuICB9XG5cbiAgaWYgKHRvcCA9PT0gJ2F1dG8nKSB7XG4gICAgdG9wID0gTUlSUk9SX1RCW3JlbGF0aXZlVG9BdHRhY2htZW50LnRvcF07XG4gIH1cblxuICByZXR1cm4geyBsZWZ0OiBsZWZ0LCB0b3A6IHRvcCB9O1xufTtcblxudmFyIGF0dGFjaG1lbnRUb09mZnNldCA9IGZ1bmN0aW9uIGF0dGFjaG1lbnRUb09mZnNldChhdHRhY2htZW50KSB7XG4gIHZhciBsZWZ0ID0gYXR0YWNobWVudC5sZWZ0O1xuICB2YXIgdG9wID0gYXR0YWNobWVudC50b3A7XG5cbiAgaWYgKHR5cGVvZiBPRkZTRVRfTUFQW2F0dGFjaG1lbnQubGVmdF0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbGVmdCA9IE9GRlNFVF9NQVBbYXR0YWNobWVudC5sZWZ0XTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgT0ZGU0VUX01BUFthdHRhY2htZW50LnRvcF0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgdG9wID0gT0ZGU0VUX01BUFthdHRhY2htZW50LnRvcF07XG4gIH1cblxuICByZXR1cm4geyBsZWZ0OiBsZWZ0LCB0b3A6IHRvcCB9O1xufTtcblxuZnVuY3Rpb24gYWRkT2Zmc2V0KCkge1xuICB2YXIgb3V0ID0geyB0b3A6IDAsIGxlZnQ6IDAgfTtcblxuICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgb2Zmc2V0cyA9IEFycmF5KF9sZW4pLCBfa2V5ID0gMDsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgIG9mZnNldHNbX2tleV0gPSBhcmd1bWVudHNbX2tleV07XG4gIH1cblxuICBvZmZzZXRzLmZvckVhY2goZnVuY3Rpb24gKF9yZWYpIHtcbiAgICB2YXIgdG9wID0gX3JlZi50b3A7XG4gICAgdmFyIGxlZnQgPSBfcmVmLmxlZnQ7XG5cbiAgICBpZiAodHlwZW9mIHRvcCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRvcCA9IHBhcnNlRmxvYXQodG9wLCAxMCk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgbGVmdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGxlZnQgPSBwYXJzZUZsb2F0KGxlZnQsIDEwKTtcbiAgICB9XG5cbiAgICBvdXQudG9wICs9IHRvcDtcbiAgICBvdXQubGVmdCArPSBsZWZ0O1xuICB9KTtcblxuICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiBvZmZzZXRUb1B4KG9mZnNldCwgc2l6ZSkge1xuICBpZiAodHlwZW9mIG9mZnNldC5sZWZ0ID09PSAnc3RyaW5nJyAmJiBvZmZzZXQubGVmdC5pbmRleE9mKCclJykgIT09IC0xKSB7XG4gICAgb2Zmc2V0LmxlZnQgPSBwYXJzZUZsb2F0KG9mZnNldC5sZWZ0LCAxMCkgLyAxMDAgKiBzaXplLndpZHRoO1xuICB9XG4gIGlmICh0eXBlb2Ygb2Zmc2V0LnRvcCA9PT0gJ3N0cmluZycgJiYgb2Zmc2V0LnRvcC5pbmRleE9mKCclJykgIT09IC0xKSB7XG4gICAgb2Zmc2V0LnRvcCA9IHBhcnNlRmxvYXQob2Zmc2V0LnRvcCwgMTApIC8gMTAwICogc2l6ZS5oZWlnaHQ7XG4gIH1cblxuICByZXR1cm4gb2Zmc2V0O1xufVxuXG52YXIgcGFyc2VPZmZzZXQgPSBmdW5jdGlvbiBwYXJzZU9mZnNldCh2YWx1ZSkge1xuICB2YXIgX3ZhbHVlJHNwbGl0ID0gdmFsdWUuc3BsaXQoJyAnKTtcblxuICB2YXIgX3ZhbHVlJHNwbGl0MiA9IF9zbGljZWRUb0FycmF5KF92YWx1ZSRzcGxpdCwgMik7XG5cbiAgdmFyIHRvcCA9IF92YWx1ZSRzcGxpdDJbMF07XG4gIHZhciBsZWZ0ID0gX3ZhbHVlJHNwbGl0MlsxXTtcblxuICByZXR1cm4geyB0b3A6IHRvcCwgbGVmdDogbGVmdCB9O1xufTtcbnZhciBwYXJzZUF0dGFjaG1lbnQgPSBwYXJzZU9mZnNldDtcblxudmFyIFRldGhlckNsYXNzID0gKGZ1bmN0aW9uIChfRXZlbnRlZCkge1xuICBfaW5oZXJpdHMoVGV0aGVyQ2xhc3MsIF9FdmVudGVkKTtcblxuICBmdW5jdGlvbiBUZXRoZXJDbGFzcyhvcHRpb25zKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBUZXRoZXJDbGFzcyk7XG5cbiAgICBfZ2V0KE9iamVjdC5nZXRQcm90b3R5cGVPZihUZXRoZXJDbGFzcy5wcm90b3R5cGUpLCAnY29uc3RydWN0b3InLCB0aGlzKS5jYWxsKHRoaXMpO1xuICAgIHRoaXMucG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uLmJpbmQodGhpcyk7XG5cbiAgICB0ZXRoZXJzLnB1c2godGhpcyk7XG5cbiAgICB0aGlzLmhpc3RvcnkgPSBbXTtcblxuICAgIHRoaXMuc2V0T3B0aW9ucyhvcHRpb25zLCBmYWxzZSk7XG5cbiAgICBUZXRoZXJCYXNlLm1vZHVsZXMuZm9yRWFjaChmdW5jdGlvbiAobW9kdWxlKSB7XG4gICAgICBpZiAodHlwZW9mIG1vZHVsZS5pbml0aWFsaXplICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBtb2R1bGUuaW5pdGlhbGl6ZS5jYWxsKF90aGlzKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMucG9zaXRpb24oKTtcbiAgfVxuXG4gIF9jcmVhdGVDbGFzcyhUZXRoZXJDbGFzcywgW3tcbiAgICBrZXk6ICdnZXRDbGFzcycsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGdldENsYXNzKCkge1xuICAgICAgdmFyIGtleSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/ICcnIDogYXJndW1lbnRzWzBdO1xuICAgICAgdmFyIGNsYXNzZXMgPSB0aGlzLm9wdGlvbnMuY2xhc3NlcztcblxuICAgICAgaWYgKHR5cGVvZiBjbGFzc2VzICE9PSAndW5kZWZpbmVkJyAmJiBjbGFzc2VzW2tleV0pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9ucy5jbGFzc2VzW2tleV07XG4gICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5jbGFzc1ByZWZpeCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vcHRpb25zLmNsYXNzUHJlZml4ICsgJy0nICsga2V5O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgIH1cbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdzZXRPcHRpb25zJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gc2V0T3B0aW9ucyhvcHRpb25zKSB7XG4gICAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuICAgICAgdmFyIHBvcyA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IHRydWUgOiBhcmd1bWVudHNbMV07XG5cbiAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgb2Zmc2V0OiAnMCAwJyxcbiAgICAgICAgdGFyZ2V0T2Zmc2V0OiAnMCAwJyxcbiAgICAgICAgdGFyZ2V0QXR0YWNobWVudDogJ2F1dG8gYXV0bycsXG4gICAgICAgIGNsYXNzUHJlZml4OiAndGV0aGVyJ1xuICAgICAgfTtcblxuICAgICAgdGhpcy5vcHRpb25zID0gZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgICAgdmFyIF9vcHRpb25zID0gdGhpcy5vcHRpb25zO1xuICAgICAgdmFyIGVsZW1lbnQgPSBfb3B0aW9ucy5lbGVtZW50O1xuICAgICAgdmFyIHRhcmdldCA9IF9vcHRpb25zLnRhcmdldDtcbiAgICAgIHZhciB0YXJnZXRNb2RpZmllciA9IF9vcHRpb25zLnRhcmdldE1vZGlmaWVyO1xuXG4gICAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuICAgICAgdGhpcy50YXJnZXQgPSB0YXJnZXQ7XG4gICAgICB0aGlzLnRhcmdldE1vZGlmaWVyID0gdGFyZ2V0TW9kaWZpZXI7XG5cbiAgICAgIGlmICh0aGlzLnRhcmdldCA9PT0gJ3ZpZXdwb3J0Jykge1xuICAgICAgICB0aGlzLnRhcmdldCA9IGRvY3VtZW50LmJvZHk7XG4gICAgICAgIHRoaXMudGFyZ2V0TW9kaWZpZXIgPSAndmlzaWJsZSc7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMudGFyZ2V0ID09PSAnc2Nyb2xsLWhhbmRsZScpIHtcbiAgICAgICAgdGhpcy50YXJnZXQgPSBkb2N1bWVudC5ib2R5O1xuICAgICAgICB0aGlzLnRhcmdldE1vZGlmaWVyID0gJ3Njcm9sbC1oYW5kbGUnO1xuICAgICAgfVxuXG4gICAgICBbJ2VsZW1lbnQnLCAndGFyZ2V0J10uZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIGlmICh0eXBlb2YgX3RoaXMyW2tleV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUZXRoZXIgRXJyb3I6IEJvdGggZWxlbWVudCBhbmQgdGFyZ2V0IG11c3QgYmUgZGVmaW5lZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBfdGhpczJba2V5XS5qcXVlcnkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgX3RoaXMyW2tleV0gPSBfdGhpczJba2V5XVswXTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgX3RoaXMyW2tleV0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgX3RoaXMyW2tleV0gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKF90aGlzMltrZXldKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGFkZENsYXNzKHRoaXMuZWxlbWVudCwgdGhpcy5nZXRDbGFzcygnZWxlbWVudCcpKTtcbiAgICAgIGlmICghKHRoaXMub3B0aW9ucy5hZGRUYXJnZXRDbGFzc2VzID09PSBmYWxzZSkpIHtcbiAgICAgICAgYWRkQ2xhc3ModGhpcy50YXJnZXQsIHRoaXMuZ2V0Q2xhc3MoJ3RhcmdldCcpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuYXR0YWNobWVudCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RldGhlciBFcnJvcjogWW91IG11c3QgcHJvdmlkZSBhbiBhdHRhY2htZW50Jyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMudGFyZ2V0QXR0YWNobWVudCA9IHBhcnNlQXR0YWNobWVudCh0aGlzLm9wdGlvbnMudGFyZ2V0QXR0YWNobWVudCk7XG4gICAgICB0aGlzLmF0dGFjaG1lbnQgPSBwYXJzZUF0dGFjaG1lbnQodGhpcy5vcHRpb25zLmF0dGFjaG1lbnQpO1xuICAgICAgdGhpcy5vZmZzZXQgPSBwYXJzZU9mZnNldCh0aGlzLm9wdGlvbnMub2Zmc2V0KTtcbiAgICAgIHRoaXMudGFyZ2V0T2Zmc2V0ID0gcGFyc2VPZmZzZXQodGhpcy5vcHRpb25zLnRhcmdldE9mZnNldCk7XG5cbiAgICAgIGlmICh0eXBlb2YgdGhpcy5zY3JvbGxQYXJlbnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aGlzLmRpc2FibGUoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMudGFyZ2V0TW9kaWZpZXIgPT09ICdzY3JvbGwtaGFuZGxlJykge1xuICAgICAgICB0aGlzLnNjcm9sbFBhcmVudHMgPSBbdGhpcy50YXJnZXRdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zY3JvbGxQYXJlbnRzID0gZ2V0U2Nyb2xsUGFyZW50cyh0aGlzLnRhcmdldCk7XG4gICAgICB9XG5cbiAgICAgIGlmICghKHRoaXMub3B0aW9ucy5lbmFibGVkID09PSBmYWxzZSkpIHtcbiAgICAgICAgdGhpcy5lbmFibGUocG9zKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdnZXRUYXJnZXRCb3VuZHMnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBnZXRUYXJnZXRCb3VuZHMoKSB7XG4gICAgICBpZiAodHlwZW9mIHRoaXMudGFyZ2V0TW9kaWZpZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGlmICh0aGlzLnRhcmdldE1vZGlmaWVyID09PSAndmlzaWJsZScpIHtcbiAgICAgICAgICBpZiAodGhpcy50YXJnZXQgPT09IGRvY3VtZW50LmJvZHkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHRvcDogcGFnZVlPZmZzZXQsIGxlZnQ6IHBhZ2VYT2Zmc2V0LCBoZWlnaHQ6IGlubmVySGVpZ2h0LCB3aWR0aDogaW5uZXJXaWR0aCB9O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgYm91bmRzID0gZ2V0Qm91bmRzKHRoaXMudGFyZ2V0KTtcblxuICAgICAgICAgICAgdmFyIG91dCA9IHtcbiAgICAgICAgICAgICAgaGVpZ2h0OiBib3VuZHMuaGVpZ2h0LFxuICAgICAgICAgICAgICB3aWR0aDogYm91bmRzLndpZHRoLFxuICAgICAgICAgICAgICB0b3A6IGJvdW5kcy50b3AsXG4gICAgICAgICAgICAgIGxlZnQ6IGJvdW5kcy5sZWZ0XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBvdXQuaGVpZ2h0ID0gTWF0aC5taW4ob3V0LmhlaWdodCwgYm91bmRzLmhlaWdodCAtIChwYWdlWU9mZnNldCAtIGJvdW5kcy50b3ApKTtcbiAgICAgICAgICAgIG91dC5oZWlnaHQgPSBNYXRoLm1pbihvdXQuaGVpZ2h0LCBib3VuZHMuaGVpZ2h0IC0gKGJvdW5kcy50b3AgKyBib3VuZHMuaGVpZ2h0IC0gKHBhZ2VZT2Zmc2V0ICsgaW5uZXJIZWlnaHQpKSk7XG4gICAgICAgICAgICBvdXQuaGVpZ2h0ID0gTWF0aC5taW4oaW5uZXJIZWlnaHQsIG91dC5oZWlnaHQpO1xuICAgICAgICAgICAgb3V0LmhlaWdodCAtPSAyO1xuXG4gICAgICAgICAgICBvdXQud2lkdGggPSBNYXRoLm1pbihvdXQud2lkdGgsIGJvdW5kcy53aWR0aCAtIChwYWdlWE9mZnNldCAtIGJvdW5kcy5sZWZ0KSk7XG4gICAgICAgICAgICBvdXQud2lkdGggPSBNYXRoLm1pbihvdXQud2lkdGgsIGJvdW5kcy53aWR0aCAtIChib3VuZHMubGVmdCArIGJvdW5kcy53aWR0aCAtIChwYWdlWE9mZnNldCArIGlubmVyV2lkdGgpKSk7XG4gICAgICAgICAgICBvdXQud2lkdGggPSBNYXRoLm1pbihpbm5lcldpZHRoLCBvdXQud2lkdGgpO1xuICAgICAgICAgICAgb3V0LndpZHRoIC09IDI7XG5cbiAgICAgICAgICAgIGlmIChvdXQudG9wIDwgcGFnZVlPZmZzZXQpIHtcbiAgICAgICAgICAgICAgb3V0LnRvcCA9IHBhZ2VZT2Zmc2V0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG91dC5sZWZ0IDwgcGFnZVhPZmZzZXQpIHtcbiAgICAgICAgICAgICAgb3V0LmxlZnQgPSBwYWdlWE9mZnNldDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy50YXJnZXRNb2RpZmllciA9PT0gJ3Njcm9sbC1oYW5kbGUnKSB7XG4gICAgICAgICAgdmFyIGJvdW5kcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB2YXIgdGFyZ2V0ID0gdGhpcy50YXJnZXQ7XG4gICAgICAgICAgaWYgKHRhcmdldCA9PT0gZG9jdW1lbnQuYm9keSkge1xuICAgICAgICAgICAgdGFyZ2V0ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuXG4gICAgICAgICAgICBib3VuZHMgPSB7XG4gICAgICAgICAgICAgIGxlZnQ6IHBhZ2VYT2Zmc2V0LFxuICAgICAgICAgICAgICB0b3A6IHBhZ2VZT2Zmc2V0LFxuICAgICAgICAgICAgICBoZWlnaHQ6IGlubmVySGVpZ2h0LFxuICAgICAgICAgICAgICB3aWR0aDogaW5uZXJXaWR0aFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYm91bmRzID0gZ2V0Qm91bmRzKHRhcmdldCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZSh0YXJnZXQpO1xuXG4gICAgICAgICAgdmFyIGhhc0JvdHRvbVNjcm9sbCA9IHRhcmdldC5zY3JvbGxXaWR0aCA+IHRhcmdldC5jbGllbnRXaWR0aCB8fCBbc3R5bGUub3ZlcmZsb3csIHN0eWxlLm92ZXJmbG93WF0uaW5kZXhPZignc2Nyb2xsJykgPj0gMCB8fCB0aGlzLnRhcmdldCAhPT0gZG9jdW1lbnQuYm9keTtcblxuICAgICAgICAgIHZhciBzY3JvbGxCb3R0b20gPSAwO1xuICAgICAgICAgIGlmIChoYXNCb3R0b21TY3JvbGwpIHtcbiAgICAgICAgICAgIHNjcm9sbEJvdHRvbSA9IDE1O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBoZWlnaHQgPSBib3VuZHMuaGVpZ2h0IC0gcGFyc2VGbG9hdChzdHlsZS5ib3JkZXJUb3BXaWR0aCkgLSBwYXJzZUZsb2F0KHN0eWxlLmJvcmRlckJvdHRvbVdpZHRoKSAtIHNjcm9sbEJvdHRvbTtcblxuICAgICAgICAgIHZhciBvdXQgPSB7XG4gICAgICAgICAgICB3aWR0aDogMTUsXG4gICAgICAgICAgICBoZWlnaHQ6IGhlaWdodCAqIDAuOTc1ICogKGhlaWdodCAvIHRhcmdldC5zY3JvbGxIZWlnaHQpLFxuICAgICAgICAgICAgbGVmdDogYm91bmRzLmxlZnQgKyBib3VuZHMud2lkdGggLSBwYXJzZUZsb2F0KHN0eWxlLmJvcmRlckxlZnRXaWR0aCkgLSAxNVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICB2YXIgZml0QWRqID0gMDtcbiAgICAgICAgICBpZiAoaGVpZ2h0IDwgNDA4ICYmIHRoaXMudGFyZ2V0ID09PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgICAgICAgICBmaXRBZGogPSAtMC4wMDAxMSAqIE1hdGgucG93KGhlaWdodCwgMikgLSAwLjAwNzI3ICogaGVpZ2h0ICsgMjIuNTg7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHRoaXMudGFyZ2V0ICE9PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgICAgICAgICBvdXQuaGVpZ2h0ID0gTWF0aC5tYXgob3V0LmhlaWdodCwgMjQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBzY3JvbGxQZXJjZW50YWdlID0gdGhpcy50YXJnZXQuc2Nyb2xsVG9wIC8gKHRhcmdldC5zY3JvbGxIZWlnaHQgLSBoZWlnaHQpO1xuICAgICAgICAgIG91dC50b3AgPSBzY3JvbGxQZXJjZW50YWdlICogKGhlaWdodCAtIG91dC5oZWlnaHQgLSBmaXRBZGopICsgYm91bmRzLnRvcCArIHBhcnNlRmxvYXQoc3R5bGUuYm9yZGVyVG9wV2lkdGgpO1xuXG4gICAgICAgICAgaWYgKHRoaXMudGFyZ2V0ID09PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgICAgICAgICBvdXQuaGVpZ2h0ID0gTWF0aC5tYXgob3V0LmhlaWdodCwgMjQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBnZXRCb3VuZHModGhpcy50YXJnZXQpO1xuICAgICAgfVxuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2NsZWFyQ2FjaGUnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBjbGVhckNhY2hlKCkge1xuICAgICAgdGhpcy5fY2FjaGUgPSB7fTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdjYWNoZScsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGNhY2hlKGssIGdldHRlcikge1xuICAgICAgLy8gTW9yZSB0aGFuIG9uZSBtb2R1bGUgd2lsbCBvZnRlbiBuZWVkIHRoZSBzYW1lIERPTSBpbmZvLCBzb1xuICAgICAgLy8gd2Uga2VlcCBhIGNhY2hlIHdoaWNoIGlzIGNsZWFyZWQgb24gZWFjaCBwb3NpdGlvbiBjYWxsXG4gICAgICBpZiAodHlwZW9mIHRoaXMuX2NhY2hlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aGlzLl9jYWNoZSA9IHt9O1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIHRoaXMuX2NhY2hlW2tdID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aGlzLl9jYWNoZVtrXSA9IGdldHRlci5jYWxsKHRoaXMpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5fY2FjaGVba107XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnZW5hYmxlJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gZW5hYmxlKCkge1xuICAgICAgdmFyIF90aGlzMyA9IHRoaXM7XG5cbiAgICAgIHZhciBwb3MgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB0cnVlIDogYXJndW1lbnRzWzBdO1xuXG4gICAgICBpZiAoISh0aGlzLm9wdGlvbnMuYWRkVGFyZ2V0Q2xhc3NlcyA9PT0gZmFsc2UpKSB7XG4gICAgICAgIGFkZENsYXNzKHRoaXMudGFyZ2V0LCB0aGlzLmdldENsYXNzKCdlbmFibGVkJykpO1xuICAgICAgfVxuICAgICAgYWRkQ2xhc3ModGhpcy5lbGVtZW50LCB0aGlzLmdldENsYXNzKCdlbmFibGVkJykpO1xuICAgICAgdGhpcy5lbmFibGVkID0gdHJ1ZTtcblxuICAgICAgdGhpcy5zY3JvbGxQYXJlbnRzLmZvckVhY2goZnVuY3Rpb24gKHBhcmVudCkge1xuICAgICAgICBpZiAocGFyZW50ICE9PSBfdGhpczMudGFyZ2V0Lm93bmVyRG9jdW1lbnQpIHtcbiAgICAgICAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgX3RoaXMzLnBvc2l0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmIChwb3MpIHtcbiAgICAgICAgdGhpcy5wb3NpdGlvbigpO1xuICAgICAgfVxuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2Rpc2FibGUnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBkaXNhYmxlKCkge1xuICAgICAgdmFyIF90aGlzNCA9IHRoaXM7XG5cbiAgICAgIHJlbW92ZUNsYXNzKHRoaXMudGFyZ2V0LCB0aGlzLmdldENsYXNzKCdlbmFibGVkJykpO1xuICAgICAgcmVtb3ZlQ2xhc3ModGhpcy5lbGVtZW50LCB0aGlzLmdldENsYXNzKCdlbmFibGVkJykpO1xuICAgICAgdGhpcy5lbmFibGVkID0gZmFsc2U7XG5cbiAgICAgIGlmICh0eXBlb2YgdGhpcy5zY3JvbGxQYXJlbnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aGlzLnNjcm9sbFBhcmVudHMuZm9yRWFjaChmdW5jdGlvbiAocGFyZW50KSB7XG4gICAgICAgICAgcGFyZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIF90aGlzNC5wb3NpdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2Rlc3Ryb3knLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgICAgdmFyIF90aGlzNSA9IHRoaXM7XG5cbiAgICAgIHRoaXMuZGlzYWJsZSgpO1xuXG4gICAgICB0ZXRoZXJzLmZvckVhY2goZnVuY3Rpb24gKHRldGhlciwgaSkge1xuICAgICAgICBpZiAodGV0aGVyID09PSBfdGhpczUpIHtcbiAgICAgICAgICB0ZXRoZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIFJlbW92ZSBhbnkgZWxlbWVudHMgd2Ugd2VyZSB1c2luZyBmb3IgY29udmVuaWVuY2UgZnJvbSB0aGUgRE9NXG4gICAgICBpZiAodGV0aGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmVtb3ZlVXRpbEVsZW1lbnRzKCk7XG4gICAgICB9XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAndXBkYXRlQXR0YWNoQ2xhc3NlcycsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHVwZGF0ZUF0dGFjaENsYXNzZXMoZWxlbWVudEF0dGFjaCwgdGFyZ2V0QXR0YWNoKSB7XG4gICAgICB2YXIgX3RoaXM2ID0gdGhpcztcblxuICAgICAgZWxlbWVudEF0dGFjaCA9IGVsZW1lbnRBdHRhY2ggfHwgdGhpcy5hdHRhY2htZW50O1xuICAgICAgdGFyZ2V0QXR0YWNoID0gdGFyZ2V0QXR0YWNoIHx8IHRoaXMudGFyZ2V0QXR0YWNobWVudDtcbiAgICAgIHZhciBzaWRlcyA9IFsnbGVmdCcsICd0b3AnLCAnYm90dG9tJywgJ3JpZ2h0JywgJ21pZGRsZScsICdjZW50ZXInXTtcblxuICAgICAgaWYgKHR5cGVvZiB0aGlzLl9hZGRBdHRhY2hDbGFzc2VzICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzLl9hZGRBdHRhY2hDbGFzc2VzLmxlbmd0aCkge1xuICAgICAgICAvLyB1cGRhdGVBdHRhY2hDbGFzc2VzIGNhbiBiZSBjYWxsZWQgbW9yZSB0aGFuIG9uY2UgaW4gYSBwb3NpdGlvbiBjYWxsLCBzb1xuICAgICAgICAvLyB3ZSBuZWVkIHRvIGNsZWFuIHVwIGFmdGVyIG91cnNlbHZlcyBzdWNoIHRoYXQgd2hlbiB0aGUgbGFzdCBkZWZlciBnZXRzXG4gICAgICAgIC8vIHJhbiBpdCBkb2Vzbid0IGFkZCBhbnkgZXh0cmEgY2xhc3NlcyBmcm9tIHByZXZpb3VzIGNhbGxzLlxuICAgICAgICB0aGlzLl9hZGRBdHRhY2hDbGFzc2VzLnNwbGljZSgwLCB0aGlzLl9hZGRBdHRhY2hDbGFzc2VzLmxlbmd0aCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgdGhpcy5fYWRkQXR0YWNoQ2xhc3NlcyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhpcy5fYWRkQXR0YWNoQ2xhc3NlcyA9IFtdO1xuICAgICAgfVxuICAgICAgdmFyIGFkZCA9IHRoaXMuX2FkZEF0dGFjaENsYXNzZXM7XG5cbiAgICAgIGlmIChlbGVtZW50QXR0YWNoLnRvcCkge1xuICAgICAgICBhZGQucHVzaCh0aGlzLmdldENsYXNzKCdlbGVtZW50LWF0dGFjaGVkJykgKyAnLScgKyBlbGVtZW50QXR0YWNoLnRvcCk7XG4gICAgICB9XG4gICAgICBpZiAoZWxlbWVudEF0dGFjaC5sZWZ0KSB7XG4gICAgICAgIGFkZC5wdXNoKHRoaXMuZ2V0Q2xhc3MoJ2VsZW1lbnQtYXR0YWNoZWQnKSArICctJyArIGVsZW1lbnRBdHRhY2gubGVmdCk7XG4gICAgICB9XG4gICAgICBpZiAodGFyZ2V0QXR0YWNoLnRvcCkge1xuICAgICAgICBhZGQucHVzaCh0aGlzLmdldENsYXNzKCd0YXJnZXQtYXR0YWNoZWQnKSArICctJyArIHRhcmdldEF0dGFjaC50b3ApO1xuICAgICAgfVxuICAgICAgaWYgKHRhcmdldEF0dGFjaC5sZWZ0KSB7XG4gICAgICAgIGFkZC5wdXNoKHRoaXMuZ2V0Q2xhc3MoJ3RhcmdldC1hdHRhY2hlZCcpICsgJy0nICsgdGFyZ2V0QXR0YWNoLmxlZnQpO1xuICAgICAgfVxuXG4gICAgICB2YXIgYWxsID0gW107XG4gICAgICBzaWRlcy5mb3JFYWNoKGZ1bmN0aW9uIChzaWRlKSB7XG4gICAgICAgIGFsbC5wdXNoKF90aGlzNi5nZXRDbGFzcygnZWxlbWVudC1hdHRhY2hlZCcpICsgJy0nICsgc2lkZSk7XG4gICAgICAgIGFsbC5wdXNoKF90aGlzNi5nZXRDbGFzcygndGFyZ2V0LWF0dGFjaGVkJykgKyAnLScgKyBzaWRlKTtcbiAgICAgIH0pO1xuXG4gICAgICBkZWZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghKHR5cGVvZiBfdGhpczYuX2FkZEF0dGFjaENsYXNzZXMgIT09ICd1bmRlZmluZWQnKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHVwZGF0ZUNsYXNzZXMoX3RoaXM2LmVsZW1lbnQsIF90aGlzNi5fYWRkQXR0YWNoQ2xhc3NlcywgYWxsKTtcbiAgICAgICAgaWYgKCEoX3RoaXM2Lm9wdGlvbnMuYWRkVGFyZ2V0Q2xhc3NlcyA9PT0gZmFsc2UpKSB7XG4gICAgICAgICAgdXBkYXRlQ2xhc3NlcyhfdGhpczYudGFyZ2V0LCBfdGhpczYuX2FkZEF0dGFjaENsYXNzZXMsIGFsbCk7XG4gICAgICAgIH1cblxuICAgICAgICBkZWxldGUgX3RoaXM2Ll9hZGRBdHRhY2hDbGFzc2VzO1xuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAncG9zaXRpb24nLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBwb3NpdGlvbigpIHtcbiAgICAgIHZhciBfdGhpczcgPSB0aGlzO1xuXG4gICAgICB2YXIgZmx1c2hDaGFuZ2VzID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IGFyZ3VtZW50c1swXTtcblxuICAgICAgLy8gZmx1c2hDaGFuZ2VzIGNvbW1pdHMgdGhlIGNoYW5nZXMgaW1tZWRpYXRlbHksIGxlYXZlIHRydWUgdW5sZXNzIHlvdSBhcmUgcG9zaXRpb25pbmcgbXVsdGlwbGVcbiAgICAgIC8vIHRldGhlcnMgKGluIHdoaWNoIGNhc2UgY2FsbCBUZXRoZXIuVXRpbHMuZmx1c2ggeW91cnNlbGYgd2hlbiB5b3UncmUgZG9uZSlcblxuICAgICAgaWYgKCF0aGlzLmVuYWJsZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmNsZWFyQ2FjaGUoKTtcblxuICAgICAgLy8gVHVybiAnYXV0bycgYXR0YWNobWVudHMgaW50byB0aGUgYXBwcm9wcmlhdGUgY29ybmVyIG9yIGVkZ2VcbiAgICAgIHZhciB0YXJnZXRBdHRhY2htZW50ID0gYXV0b1RvRml4ZWRBdHRhY2htZW50KHRoaXMudGFyZ2V0QXR0YWNobWVudCwgdGhpcy5hdHRhY2htZW50KTtcblxuICAgICAgdGhpcy51cGRhdGVBdHRhY2hDbGFzc2VzKHRoaXMuYXR0YWNobWVudCwgdGFyZ2V0QXR0YWNobWVudCk7XG5cbiAgICAgIHZhciBlbGVtZW50UG9zID0gdGhpcy5jYWNoZSgnZWxlbWVudC1ib3VuZHMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBnZXRCb3VuZHMoX3RoaXM3LmVsZW1lbnQpO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciB3aWR0aCA9IGVsZW1lbnRQb3Mud2lkdGg7XG4gICAgICB2YXIgaGVpZ2h0ID0gZWxlbWVudFBvcy5oZWlnaHQ7XG5cbiAgICAgIGlmICh3aWR0aCA9PT0gMCAmJiBoZWlnaHQgPT09IDAgJiYgdHlwZW9mIHRoaXMubGFzdFNpemUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHZhciBfbGFzdFNpemUgPSB0aGlzLmxhc3RTaXplO1xuXG4gICAgICAgIC8vIFdlIGNhY2hlIHRoZSBoZWlnaHQgYW5kIHdpZHRoIHRvIG1ha2UgaXQgcG9zc2libGUgdG8gcG9zaXRpb24gZWxlbWVudHMgdGhhdCBhcmVcbiAgICAgICAgLy8gZ2V0dGluZyBoaWRkZW4uXG4gICAgICAgIHdpZHRoID0gX2xhc3RTaXplLndpZHRoO1xuICAgICAgICBoZWlnaHQgPSBfbGFzdFNpemUuaGVpZ2h0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5sYXN0U2l6ZSA9IHsgd2lkdGg6IHdpZHRoLCBoZWlnaHQ6IGhlaWdodCB9O1xuICAgICAgfVxuXG4gICAgICB2YXIgdGFyZ2V0UG9zID0gdGhpcy5jYWNoZSgndGFyZ2V0LWJvdW5kcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIF90aGlzNy5nZXRUYXJnZXRCb3VuZHMoKTtcbiAgICAgIH0pO1xuICAgICAgdmFyIHRhcmdldFNpemUgPSB0YXJnZXRQb3M7XG5cbiAgICAgIC8vIEdldCBhbiBhY3R1YWwgcHggb2Zmc2V0IGZyb20gdGhlIGF0dGFjaG1lbnRcbiAgICAgIHZhciBvZmZzZXQgPSBvZmZzZXRUb1B4KGF0dGFjaG1lbnRUb09mZnNldCh0aGlzLmF0dGFjaG1lbnQpLCB7IHdpZHRoOiB3aWR0aCwgaGVpZ2h0OiBoZWlnaHQgfSk7XG4gICAgICB2YXIgdGFyZ2V0T2Zmc2V0ID0gb2Zmc2V0VG9QeChhdHRhY2htZW50VG9PZmZzZXQodGFyZ2V0QXR0YWNobWVudCksIHRhcmdldFNpemUpO1xuXG4gICAgICB2YXIgbWFudWFsT2Zmc2V0ID0gb2Zmc2V0VG9QeCh0aGlzLm9mZnNldCwgeyB3aWR0aDogd2lkdGgsIGhlaWdodDogaGVpZ2h0IH0pO1xuICAgICAgdmFyIG1hbnVhbFRhcmdldE9mZnNldCA9IG9mZnNldFRvUHgodGhpcy50YXJnZXRPZmZzZXQsIHRhcmdldFNpemUpO1xuXG4gICAgICAvLyBBZGQgdGhlIG1hbnVhbGx5IHByb3ZpZGVkIG9mZnNldFxuICAgICAgb2Zmc2V0ID0gYWRkT2Zmc2V0KG9mZnNldCwgbWFudWFsT2Zmc2V0KTtcbiAgICAgIHRhcmdldE9mZnNldCA9IGFkZE9mZnNldCh0YXJnZXRPZmZzZXQsIG1hbnVhbFRhcmdldE9mZnNldCk7XG5cbiAgICAgIC8vIEl0J3Mgbm93IG91ciBnb2FsIHRvIG1ha2UgKGVsZW1lbnQgcG9zaXRpb24gKyBvZmZzZXQpID09ICh0YXJnZXQgcG9zaXRpb24gKyB0YXJnZXQgb2Zmc2V0KVxuICAgICAgdmFyIGxlZnQgPSB0YXJnZXRQb3MubGVmdCArIHRhcmdldE9mZnNldC5sZWZ0IC0gb2Zmc2V0LmxlZnQ7XG4gICAgICB2YXIgdG9wID0gdGFyZ2V0UG9zLnRvcCArIHRhcmdldE9mZnNldC50b3AgLSBvZmZzZXQudG9wO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IFRldGhlckJhc2UubW9kdWxlcy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgX21vZHVsZTIgPSBUZXRoZXJCYXNlLm1vZHVsZXNbaV07XG4gICAgICAgIHZhciByZXQgPSBfbW9kdWxlMi5wb3NpdGlvbi5jYWxsKHRoaXMsIHtcbiAgICAgICAgICBsZWZ0OiBsZWZ0LFxuICAgICAgICAgIHRvcDogdG9wLFxuICAgICAgICAgIHRhcmdldEF0dGFjaG1lbnQ6IHRhcmdldEF0dGFjaG1lbnQsXG4gICAgICAgICAgdGFyZ2V0UG9zOiB0YXJnZXRQb3MsXG4gICAgICAgICAgZWxlbWVudFBvczogZWxlbWVudFBvcyxcbiAgICAgICAgICBvZmZzZXQ6IG9mZnNldCxcbiAgICAgICAgICB0YXJnZXRPZmZzZXQ6IHRhcmdldE9mZnNldCxcbiAgICAgICAgICBtYW51YWxPZmZzZXQ6IG1hbnVhbE9mZnNldCxcbiAgICAgICAgICBtYW51YWxUYXJnZXRPZmZzZXQ6IG1hbnVhbFRhcmdldE9mZnNldCxcbiAgICAgICAgICBzY3JvbGxiYXJTaXplOiBzY3JvbGxiYXJTaXplLFxuICAgICAgICAgIGF0dGFjaG1lbnQ6IHRoaXMuYXR0YWNobWVudFxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAocmV0ID09PSBmYWxzZSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcmV0ID09PSAndW5kZWZpbmVkJyB8fCB0eXBlb2YgcmV0ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRvcCA9IHJldC50b3A7XG4gICAgICAgICAgbGVmdCA9IHJldC5sZWZ0O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFdlIGRlc2NyaWJlIHRoZSBwb3NpdGlvbiB0aHJlZSBkaWZmZXJlbnQgd2F5cyB0byBnaXZlIHRoZSBvcHRpbWl6ZXJcbiAgICAgIC8vIGEgY2hhbmNlIHRvIGRlY2lkZSB0aGUgYmVzdCBwb3NzaWJsZSB3YXkgdG8gcG9zaXRpb24gdGhlIGVsZW1lbnRcbiAgICAgIC8vIHdpdGggdGhlIGZld2VzdCByZXBhaW50cy5cbiAgICAgIHZhciBuZXh0ID0ge1xuICAgICAgICAvLyBJdCdzIHBvc2l0aW9uIHJlbGF0aXZlIHRvIHRoZSBwYWdlIChhYnNvbHV0ZSBwb3NpdGlvbmluZyB3aGVuXG4gICAgICAgIC8vIHRoZSBlbGVtZW50IGlzIGEgY2hpbGQgb2YgdGhlIGJvZHkpXG4gICAgICAgIHBhZ2U6IHtcbiAgICAgICAgICB0b3A6IHRvcCxcbiAgICAgICAgICBsZWZ0OiBsZWZ0XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gSXQncyBwb3NpdGlvbiByZWxhdGl2ZSB0byB0aGUgdmlld3BvcnQgKGZpeGVkIHBvc2l0aW9uaW5nKVxuICAgICAgICB2aWV3cG9ydDoge1xuICAgICAgICAgIHRvcDogdG9wIC0gcGFnZVlPZmZzZXQsXG4gICAgICAgICAgYm90dG9tOiBwYWdlWU9mZnNldCAtIHRvcCAtIGhlaWdodCArIGlubmVySGVpZ2h0LFxuICAgICAgICAgIGxlZnQ6IGxlZnQgLSBwYWdlWE9mZnNldCxcbiAgICAgICAgICByaWdodDogcGFnZVhPZmZzZXQgLSBsZWZ0IC0gd2lkdGggKyBpbm5lcldpZHRoXG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHZhciBkb2MgPSB0aGlzLnRhcmdldC5vd25lckRvY3VtZW50O1xuICAgICAgdmFyIHdpbiA9IGRvYy5kZWZhdWx0VmlldztcblxuICAgICAgdmFyIHNjcm9sbGJhclNpemUgPSB1bmRlZmluZWQ7XG4gICAgICBpZiAod2luLmlubmVySGVpZ2h0ID4gZG9jLmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQpIHtcbiAgICAgICAgc2Nyb2xsYmFyU2l6ZSA9IHRoaXMuY2FjaGUoJ3Njcm9sbGJhci1zaXplJywgZ2V0U2Nyb2xsQmFyU2l6ZSk7XG4gICAgICAgIG5leHQudmlld3BvcnQuYm90dG9tIC09IHNjcm9sbGJhclNpemUuaGVpZ2h0O1xuICAgICAgfVxuXG4gICAgICBpZiAod2luLmlubmVyV2lkdGggPiBkb2MuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoKSB7XG4gICAgICAgIHNjcm9sbGJhclNpemUgPSB0aGlzLmNhY2hlKCdzY3JvbGxiYXItc2l6ZScsIGdldFNjcm9sbEJhclNpemUpO1xuICAgICAgICBuZXh0LnZpZXdwb3J0LnJpZ2h0IC09IHNjcm9sbGJhclNpemUud2lkdGg7XG4gICAgICB9XG5cbiAgICAgIGlmIChbJycsICdzdGF0aWMnXS5pbmRleE9mKGRvYy5ib2R5LnN0eWxlLnBvc2l0aW9uKSA9PT0gLTEgfHwgWycnLCAnc3RhdGljJ10uaW5kZXhPZihkb2MuYm9keS5wYXJlbnRFbGVtZW50LnN0eWxlLnBvc2l0aW9uKSA9PT0gLTEpIHtcbiAgICAgICAgLy8gQWJzb2x1dGUgcG9zaXRpb25pbmcgaW4gdGhlIGJvZHkgd2lsbCBiZSByZWxhdGl2ZSB0byB0aGUgcGFnZSwgbm90IHRoZSAnaW5pdGlhbCBjb250YWluaW5nIGJsb2NrJ1xuICAgICAgICBuZXh0LnBhZ2UuYm90dG9tID0gZG9jLmJvZHkuc2Nyb2xsSGVpZ2h0IC0gdG9wIC0gaGVpZ2h0O1xuICAgICAgICBuZXh0LnBhZ2UucmlnaHQgPSBkb2MuYm9keS5zY3JvbGxXaWR0aCAtIGxlZnQgLSB3aWR0aDtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB0aGlzLm9wdGlvbnMub3B0aW1pemF0aW9ucyAhPT0gJ3VuZGVmaW5lZCcgJiYgdGhpcy5vcHRpb25zLm9wdGltaXphdGlvbnMubW92ZUVsZW1lbnQgIT09IGZhbHNlICYmICEodHlwZW9mIHRoaXMudGFyZ2V0TW9kaWZpZXIgIT09ICd1bmRlZmluZWQnKSkge1xuICAgICAgICAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBvZmZzZXRQYXJlbnQgPSBfdGhpczcuY2FjaGUoJ3RhcmdldC1vZmZzZXRwYXJlbnQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0T2Zmc2V0UGFyZW50KF90aGlzNy50YXJnZXQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHZhciBvZmZzZXRQb3NpdGlvbiA9IF90aGlzNy5jYWNoZSgndGFyZ2V0LW9mZnNldHBhcmVudC1ib3VuZHMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0Qm91bmRzKG9mZnNldFBhcmVudCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdmFyIG9mZnNldFBhcmVudFN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShvZmZzZXRQYXJlbnQpO1xuICAgICAgICAgIHZhciBvZmZzZXRQYXJlbnRTaXplID0gb2Zmc2V0UG9zaXRpb247XG5cbiAgICAgICAgICB2YXIgb2Zmc2V0Qm9yZGVyID0ge307XG4gICAgICAgICAgWydUb3AnLCAnTGVmdCcsICdCb3R0b20nLCAnUmlnaHQnXS5mb3JFYWNoKGZ1bmN0aW9uIChzaWRlKSB7XG4gICAgICAgICAgICBvZmZzZXRCb3JkZXJbc2lkZS50b0xvd2VyQ2FzZSgpXSA9IHBhcnNlRmxvYXQob2Zmc2V0UGFyZW50U3R5bGVbJ2JvcmRlcicgKyBzaWRlICsgJ1dpZHRoJ10pO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgb2Zmc2V0UG9zaXRpb24ucmlnaHQgPSBkb2MuYm9keS5zY3JvbGxXaWR0aCAtIG9mZnNldFBvc2l0aW9uLmxlZnQgLSBvZmZzZXRQYXJlbnRTaXplLndpZHRoICsgb2Zmc2V0Qm9yZGVyLnJpZ2h0O1xuICAgICAgICAgIG9mZnNldFBvc2l0aW9uLmJvdHRvbSA9IGRvYy5ib2R5LnNjcm9sbEhlaWdodCAtIG9mZnNldFBvc2l0aW9uLnRvcCAtIG9mZnNldFBhcmVudFNpemUuaGVpZ2h0ICsgb2Zmc2V0Qm9yZGVyLmJvdHRvbTtcblxuICAgICAgICAgIGlmIChuZXh0LnBhZ2UudG9wID49IG9mZnNldFBvc2l0aW9uLnRvcCArIG9mZnNldEJvcmRlci50b3AgJiYgbmV4dC5wYWdlLmJvdHRvbSA+PSBvZmZzZXRQb3NpdGlvbi5ib3R0b20pIHtcbiAgICAgICAgICAgIGlmIChuZXh0LnBhZ2UubGVmdCA+PSBvZmZzZXRQb3NpdGlvbi5sZWZ0ICsgb2Zmc2V0Qm9yZGVyLmxlZnQgJiYgbmV4dC5wYWdlLnJpZ2h0ID49IG9mZnNldFBvc2l0aW9uLnJpZ2h0KSB7XG4gICAgICAgICAgICAgIC8vIFdlJ3JlIHdpdGhpbiB0aGUgdmlzaWJsZSBwYXJ0IG9mIHRoZSB0YXJnZXQncyBzY3JvbGwgcGFyZW50XG4gICAgICAgICAgICAgIHZhciBzY3JvbGxUb3AgPSBvZmZzZXRQYXJlbnQuc2Nyb2xsVG9wO1xuICAgICAgICAgICAgICB2YXIgc2Nyb2xsTGVmdCA9IG9mZnNldFBhcmVudC5zY3JvbGxMZWZ0O1xuXG4gICAgICAgICAgICAgIC8vIEl0J3MgcG9zaXRpb24gcmVsYXRpdmUgdG8gdGhlIHRhcmdldCdzIG9mZnNldCBwYXJlbnQgKGFic29sdXRlIHBvc2l0aW9uaW5nIHdoZW5cbiAgICAgICAgICAgICAgLy8gdGhlIGVsZW1lbnQgaXMgbW92ZWQgdG8gYmUgYSBjaGlsZCBvZiB0aGUgdGFyZ2V0J3Mgb2Zmc2V0IHBhcmVudCkuXG4gICAgICAgICAgICAgIG5leHQub2Zmc2V0ID0ge1xuICAgICAgICAgICAgICAgIHRvcDogbmV4dC5wYWdlLnRvcCAtIG9mZnNldFBvc2l0aW9uLnRvcCArIHNjcm9sbFRvcCAtIG9mZnNldEJvcmRlci50b3AsXG4gICAgICAgICAgICAgICAgbGVmdDogbmV4dC5wYWdlLmxlZnQgLSBvZmZzZXRQb3NpdGlvbi5sZWZ0ICsgc2Nyb2xsTGVmdCAtIG9mZnNldEJvcmRlci5sZWZ0XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuICAgICAgfVxuXG4gICAgICAvLyBXZSBjb3VsZCBhbHNvIHRyYXZlbCB1cCB0aGUgRE9NIGFuZCB0cnkgZWFjaCBjb250YWluaW5nIGNvbnRleHQsIHJhdGhlciB0aGFuIG9ubHlcbiAgICAgIC8vIGxvb2tpbmcgYXQgdGhlIGJvZHksIGJ1dCB3ZSdyZSBnb25uYSBnZXQgZGltaW5pc2hpbmcgcmV0dXJucy5cblxuICAgICAgdGhpcy5tb3ZlKG5leHQpO1xuXG4gICAgICB0aGlzLmhpc3RvcnkudW5zaGlmdChuZXh0KTtcblxuICAgICAgaWYgKHRoaXMuaGlzdG9yeS5sZW5ndGggPiAzKSB7XG4gICAgICAgIHRoaXMuaGlzdG9yeS5wb3AoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGZsdXNoQ2hhbmdlcykge1xuICAgICAgICBmbHVzaCgpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBUSEUgSVNTVUVcbiAgfSwge1xuICAgIGtleTogJ21vdmUnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBtb3ZlKHBvcykge1xuICAgICAgdmFyIF90aGlzOCA9IHRoaXM7XG5cbiAgICAgIGlmICghKHR5cGVvZiB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZSAhPT0gJ3VuZGVmaW5lZCcpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHNhbWUgPSB7fTtcblxuICAgICAgZm9yICh2YXIgdHlwZSBpbiBwb3MpIHtcbiAgICAgICAgc2FtZVt0eXBlXSA9IHt9O1xuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBwb3NbdHlwZV0pIHtcbiAgICAgICAgICB2YXIgZm91bmQgPSBmYWxzZTtcblxuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5oaXN0b3J5Lmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICB2YXIgcG9pbnQgPSB0aGlzLmhpc3RvcnlbaV07XG4gICAgICAgICAgICBpZiAodHlwZW9mIHBvaW50W3R5cGVdICE9PSAndW5kZWZpbmVkJyAmJiAhd2l0aGluKHBvaW50W3R5cGVdW2tleV0sIHBvc1t0eXBlXVtrZXldKSkge1xuICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgICAgIHNhbWVbdHlwZV1ba2V5XSA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciBjc3MgPSB7IHRvcDogJycsIGxlZnQ6ICcnLCByaWdodDogJycsIGJvdHRvbTogJycgfTtcblxuICAgICAgdmFyIHRyYW5zY3JpYmUgPSBmdW5jdGlvbiB0cmFuc2NyaWJlKF9zYW1lLCBfcG9zKSB7XG4gICAgICAgIHZhciBoYXNPcHRpbWl6YXRpb25zID0gdHlwZW9mIF90aGlzOC5vcHRpb25zLm9wdGltaXphdGlvbnMgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICB2YXIgZ3B1ID0gaGFzT3B0aW1pemF0aW9ucyA/IF90aGlzOC5vcHRpb25zLm9wdGltaXphdGlvbnMuZ3B1IDogbnVsbDtcbiAgICAgICAgaWYgKGdwdSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICB2YXIgeVBvcyA9IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgeFBvcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBpZiAoX3NhbWUudG9wKSB7XG4gICAgICAgICAgICBjc3MudG9wID0gMDtcbiAgICAgICAgICAgIHlQb3MgPSBfcG9zLnRvcDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY3NzLmJvdHRvbSA9IDA7XG4gICAgICAgICAgICB5UG9zID0gLV9wb3MuYm90dG9tO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChfc2FtZS5sZWZ0KSB7XG4gICAgICAgICAgICBjc3MubGVmdCA9IDA7XG4gICAgICAgICAgICB4UG9zID0gX3Bvcy5sZWZ0O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjc3MucmlnaHQgPSAwO1xuICAgICAgICAgICAgeFBvcyA9IC1fcG9zLnJpZ2h0O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh3aW5kb3cubWF0Y2hNZWRpYSkge1xuICAgICAgICAgICAgLy8gSHViU3BvdC90ZXRoZXIjMjA3XG4gICAgICAgICAgICB2YXIgcmV0aW5hID0gd2luZG93Lm1hdGNoTWVkaWEoJ29ubHkgc2NyZWVuIGFuZCAobWluLXJlc29sdXRpb246IDEuM2RwcHgpJykubWF0Y2hlcyB8fCB3aW5kb3cubWF0Y2hNZWRpYSgnb25seSBzY3JlZW4gYW5kICgtd2Via2l0LW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDEuMyknKS5tYXRjaGVzO1xuICAgICAgICAgICAgaWYgKCFyZXRpbmEpIHtcbiAgICAgICAgICAgICAgeFBvcyA9IE1hdGgucm91bmQoeFBvcyk7XG4gICAgICAgICAgICAgIHlQb3MgPSBNYXRoLnJvdW5kKHlQb3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGNzc1t0cmFuc2Zvcm1LZXldID0gJ3RyYW5zbGF0ZVgoJyArIHhQb3MgKyAncHgpIHRyYW5zbGF0ZVkoJyArIHlQb3MgKyAncHgpJztcblxuICAgICAgICAgIGlmICh0cmFuc2Zvcm1LZXkgIT09ICdtc1RyYW5zZm9ybScpIHtcbiAgICAgICAgICAgIC8vIFRoZSBaIHRyYW5zZm9ybSB3aWxsIGtlZXAgdGhpcyBpbiB0aGUgR1BVIChmYXN0ZXIsIGFuZCBwcmV2ZW50cyBhcnRpZmFjdHMpLFxuICAgICAgICAgICAgLy8gYnV0IElFOSBkb2Vzbid0IHN1cHBvcnQgM2QgdHJhbnNmb3JtcyBhbmQgd2lsbCBjaG9rZS5cbiAgICAgICAgICAgIGNzc1t0cmFuc2Zvcm1LZXldICs9IFwiIHRyYW5zbGF0ZVooMClcIjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKF9zYW1lLnRvcCkge1xuICAgICAgICAgICAgY3NzLnRvcCA9IF9wb3MudG9wICsgJ3B4JztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY3NzLmJvdHRvbSA9IF9wb3MuYm90dG9tICsgJ3B4JztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoX3NhbWUubGVmdCkge1xuICAgICAgICAgICAgY3NzLmxlZnQgPSBfcG9zLmxlZnQgKyAncHgnO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjc3MucmlnaHQgPSBfcG9zLnJpZ2h0ICsgJ3B4JztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHZhciBtb3ZlZCA9IGZhbHNlO1xuICAgICAgaWYgKChzYW1lLnBhZ2UudG9wIHx8IHNhbWUucGFnZS5ib3R0b20pICYmIChzYW1lLnBhZ2UubGVmdCB8fCBzYW1lLnBhZ2UucmlnaHQpKSB7XG4gICAgICAgIGNzcy5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgICAgIHRyYW5zY3JpYmUoc2FtZS5wYWdlLCBwb3MucGFnZSk7XG4gICAgICB9IGVsc2UgaWYgKChzYW1lLnZpZXdwb3J0LnRvcCB8fCBzYW1lLnZpZXdwb3J0LmJvdHRvbSkgJiYgKHNhbWUudmlld3BvcnQubGVmdCB8fCBzYW1lLnZpZXdwb3J0LnJpZ2h0KSkge1xuICAgICAgICBjc3MucG9zaXRpb24gPSAnZml4ZWQnO1xuICAgICAgICB0cmFuc2NyaWJlKHNhbWUudmlld3BvcnQsIHBvcy52aWV3cG9ydCk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBzYW1lLm9mZnNldCAhPT0gJ3VuZGVmaW5lZCcgJiYgc2FtZS5vZmZzZXQudG9wICYmIHNhbWUub2Zmc2V0LmxlZnQpIHtcbiAgICAgICAgKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBjc3MucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICAgIHZhciBvZmZzZXRQYXJlbnQgPSBfdGhpczguY2FjaGUoJ3RhcmdldC1vZmZzZXRwYXJlbnQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0T2Zmc2V0UGFyZW50KF90aGlzOC50YXJnZXQpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKGdldE9mZnNldFBhcmVudChfdGhpczguZWxlbWVudCkgIT09IG9mZnNldFBhcmVudCkge1xuICAgICAgICAgICAgZGVmZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICBfdGhpczguZWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKF90aGlzOC5lbGVtZW50KTtcbiAgICAgICAgICAgICAgb2Zmc2V0UGFyZW50LmFwcGVuZENoaWxkKF90aGlzOC5lbGVtZW50KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRyYW5zY3JpYmUoc2FtZS5vZmZzZXQsIHBvcy5vZmZzZXQpO1xuICAgICAgICAgIG1vdmVkID0gdHJ1ZTtcbiAgICAgICAgfSkoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNzcy5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgICAgIHRyYW5zY3JpYmUoeyB0b3A6IHRydWUsIGxlZnQ6IHRydWUgfSwgcG9zLnBhZ2UpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIW1vdmVkKSB7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuYm9keUVsZW1lbnQpIHtcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuYm9keUVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgb2Zmc2V0UGFyZW50SXNCb2R5ID0gdHJ1ZTtcbiAgICAgICAgICB2YXIgY3VycmVudE5vZGUgPSB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZTtcbiAgICAgICAgICB3aGlsZSAoY3VycmVudE5vZGUgJiYgY3VycmVudE5vZGUubm9kZVR5cGUgPT09IDEgJiYgY3VycmVudE5vZGUudGFnTmFtZSAhPT0gJ0JPRFknKSB7XG4gICAgICAgICAgICBpZiAoZ2V0Q29tcHV0ZWRTdHlsZShjdXJyZW50Tm9kZSkucG9zaXRpb24gIT09ICdzdGF0aWMnKSB7XG4gICAgICAgICAgICAgIG9mZnNldFBhcmVudElzQm9keSA9IGZhbHNlO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY3VycmVudE5vZGUgPSBjdXJyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghb2Zmc2V0UGFyZW50SXNCb2R5KSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Lm93bmVyRG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBBbnkgY3NzIGNoYW5nZSB3aWxsIHRyaWdnZXIgYSByZXBhaW50LCBzbyBsZXQncyBhdm9pZCBvbmUgaWYgbm90aGluZyBjaGFuZ2VkXG4gICAgICB2YXIgd3JpdGVDU1MgPSB7fTtcbiAgICAgIHZhciB3cml0ZSA9IGZhbHNlO1xuICAgICAgZm9yICh2YXIga2V5IGluIGNzcykge1xuICAgICAgICB2YXIgdmFsID0gY3NzW2tleV07XG4gICAgICAgIHZhciBlbFZhbCA9IHRoaXMuZWxlbWVudC5zdHlsZVtrZXldO1xuXG4gICAgICAgIGlmIChlbFZhbCAhPT0gdmFsKSB7XG4gICAgICAgICAgd3JpdGUgPSB0cnVlO1xuICAgICAgICAgIHdyaXRlQ1NTW2tleV0gPSB2YWw7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHdyaXRlKSB7XG4gICAgICAgIGRlZmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBleHRlbmQoX3RoaXM4LmVsZW1lbnQuc3R5bGUsIHdyaXRlQ1NTKTtcbiAgICAgICAgICBfdGhpczgudHJpZ2dlcigncmVwb3NpdGlvbmVkJyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBUZXRoZXJDbGFzcztcbn0pKEV2ZW50ZWQpO1xuXG5UZXRoZXJDbGFzcy5tb2R1bGVzID0gW107XG5cblRldGhlckJhc2UucG9zaXRpb24gPSBwb3NpdGlvbjtcblxudmFyIFRldGhlciA9IGV4dGVuZChUZXRoZXJDbGFzcywgVGV0aGVyQmFzZSk7XG4vKiBnbG9iYWxzIFRldGhlckJhc2UgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgX3NsaWNlZFRvQXJyYXkgPSAoZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBzbGljZUl0ZXJhdG9yKGFyciwgaSkgeyB2YXIgX2FyciA9IFtdOyB2YXIgX24gPSB0cnVlOyB2YXIgX2QgPSBmYWxzZTsgdmFyIF9lID0gdW5kZWZpbmVkOyB0cnkgeyBmb3IgKHZhciBfaSA9IGFycltTeW1ib2wuaXRlcmF0b3JdKCksIF9zOyAhKF9uID0gKF9zID0gX2kubmV4dCgpKS5kb25lKTsgX24gPSB0cnVlKSB7IF9hcnIucHVzaChfcy52YWx1ZSk7IGlmIChpICYmIF9hcnIubGVuZ3RoID09PSBpKSBicmVhazsgfSB9IGNhdGNoIChlcnIpIHsgX2QgPSB0cnVlOyBfZSA9IGVycjsgfSBmaW5hbGx5IHsgdHJ5IHsgaWYgKCFfbiAmJiBfaVsncmV0dXJuJ10pIF9pWydyZXR1cm4nXSgpOyB9IGZpbmFsbHkgeyBpZiAoX2QpIHRocm93IF9lOyB9IH0gcmV0dXJuIF9hcnI7IH0gcmV0dXJuIGZ1bmN0aW9uIChhcnIsIGkpIHsgaWYgKEFycmF5LmlzQXJyYXkoYXJyKSkgeyByZXR1cm4gYXJyOyB9IGVsc2UgaWYgKFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoYXJyKSkgeyByZXR1cm4gc2xpY2VJdGVyYXRvcihhcnIsIGkpOyB9IGVsc2UgeyB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGF0dGVtcHQgdG8gZGVzdHJ1Y3R1cmUgbm9uLWl0ZXJhYmxlIGluc3RhbmNlJyk7IH0gfTsgfSkoKTtcblxudmFyIF9UZXRoZXJCYXNlJFV0aWxzID0gVGV0aGVyQmFzZS5VdGlscztcbnZhciBnZXRCb3VuZHMgPSBfVGV0aGVyQmFzZSRVdGlscy5nZXRCb3VuZHM7XG52YXIgZXh0ZW5kID0gX1RldGhlckJhc2UkVXRpbHMuZXh0ZW5kO1xudmFyIHVwZGF0ZUNsYXNzZXMgPSBfVGV0aGVyQmFzZSRVdGlscy51cGRhdGVDbGFzc2VzO1xudmFyIGRlZmVyID0gX1RldGhlckJhc2UkVXRpbHMuZGVmZXI7XG5cbnZhciBCT1VORFNfRk9STUFUID0gWydsZWZ0JywgJ3RvcCcsICdyaWdodCcsICdib3R0b20nXTtcblxuZnVuY3Rpb24gZ2V0Qm91bmRpbmdSZWN0KHRldGhlciwgdG8pIHtcbiAgaWYgKHRvID09PSAnc2Nyb2xsUGFyZW50Jykge1xuICAgIHRvID0gdGV0aGVyLnNjcm9sbFBhcmVudHNbMF07XG4gIH0gZWxzZSBpZiAodG8gPT09ICd3aW5kb3cnKSB7XG4gICAgdG8gPSBbcGFnZVhPZmZzZXQsIHBhZ2VZT2Zmc2V0LCBpbm5lcldpZHRoICsgcGFnZVhPZmZzZXQsIGlubmVySGVpZ2h0ICsgcGFnZVlPZmZzZXRdO1xuICB9XG5cbiAgaWYgKHRvID09PSBkb2N1bWVudCkge1xuICAgIHRvID0gdG8uZG9jdW1lbnRFbGVtZW50O1xuICB9XG5cbiAgaWYgKHR5cGVvZiB0by5ub2RlVHlwZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG5vZGUgPSB0bztcbiAgICAgIHZhciBzaXplID0gZ2V0Qm91bmRzKHRvKTtcbiAgICAgIHZhciBwb3MgPSBzaXplO1xuICAgICAgdmFyIHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZSh0byk7XG5cbiAgICAgIHRvID0gW3Bvcy5sZWZ0LCBwb3MudG9wLCBzaXplLndpZHRoICsgcG9zLmxlZnQsIHNpemUuaGVpZ2h0ICsgcG9zLnRvcF07XG5cbiAgICAgIC8vIEFjY291bnQgYW55IHBhcmVudCBGcmFtZXMgc2Nyb2xsIG9mZnNldFxuICAgICAgaWYgKG5vZGUub3duZXJEb2N1bWVudCAhPT0gZG9jdW1lbnQpIHtcbiAgICAgICAgdmFyIHdpbiA9IG5vZGUub3duZXJEb2N1bWVudC5kZWZhdWx0VmlldztcbiAgICAgICAgdG9bMF0gKz0gd2luLnBhZ2VYT2Zmc2V0O1xuICAgICAgICB0b1sxXSArPSB3aW4ucGFnZVlPZmZzZXQ7XG4gICAgICAgIHRvWzJdICs9IHdpbi5wYWdlWE9mZnNldDtcbiAgICAgICAgdG9bM10gKz0gd2luLnBhZ2VZT2Zmc2V0O1xuICAgICAgfVxuXG4gICAgICBCT1VORFNfRk9STUFULmZvckVhY2goZnVuY3Rpb24gKHNpZGUsIGkpIHtcbiAgICAgICAgc2lkZSA9IHNpZGVbMF0udG9VcHBlckNhc2UoKSArIHNpZGUuc3Vic3RyKDEpO1xuICAgICAgICBpZiAoc2lkZSA9PT0gJ1RvcCcgfHwgc2lkZSA9PT0gJ0xlZnQnKSB7XG4gICAgICAgICAgdG9baV0gKz0gcGFyc2VGbG9hdChzdHlsZVsnYm9yZGVyJyArIHNpZGUgKyAnV2lkdGgnXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdG9baV0gLT0gcGFyc2VGbG9hdChzdHlsZVsnYm9yZGVyJyArIHNpZGUgKyAnV2lkdGgnXSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pKCk7XG4gIH1cblxuICByZXR1cm4gdG87XG59XG5cblRldGhlckJhc2UubW9kdWxlcy5wdXNoKHtcbiAgcG9zaXRpb246IGZ1bmN0aW9uIHBvc2l0aW9uKF9yZWYpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdmFyIHRvcCA9IF9yZWYudG9wO1xuICAgIHZhciBsZWZ0ID0gX3JlZi5sZWZ0O1xuICAgIHZhciB0YXJnZXRBdHRhY2htZW50ID0gX3JlZi50YXJnZXRBdHRhY2htZW50O1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuY29uc3RyYWludHMpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHZhciBfY2FjaGUgPSB0aGlzLmNhY2hlKCdlbGVtZW50LWJvdW5kcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBnZXRCb3VuZHMoX3RoaXMuZWxlbWVudCk7XG4gICAgfSk7XG5cbiAgICB2YXIgaGVpZ2h0ID0gX2NhY2hlLmhlaWdodDtcbiAgICB2YXIgd2lkdGggPSBfY2FjaGUud2lkdGg7XG5cbiAgICBpZiAod2lkdGggPT09IDAgJiYgaGVpZ2h0ID09PSAwICYmIHR5cGVvZiB0aGlzLmxhc3RTaXplICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdmFyIF9sYXN0U2l6ZSA9IHRoaXMubGFzdFNpemU7XG5cbiAgICAgIC8vIEhhbmRsZSB0aGUgaXRlbSBnZXR0aW5nIGhpZGRlbiBhcyBhIHJlc3VsdCBvZiBvdXIgcG9zaXRpb25pbmcgd2l0aG91dCBnbGl0Y2hpbmdcbiAgICAgIC8vIHRoZSBjbGFzc2VzIGluIGFuZCBvdXRcbiAgICAgIHdpZHRoID0gX2xhc3RTaXplLndpZHRoO1xuICAgICAgaGVpZ2h0ID0gX2xhc3RTaXplLmhlaWdodDtcbiAgICB9XG5cbiAgICB2YXIgdGFyZ2V0U2l6ZSA9IHRoaXMuY2FjaGUoJ3RhcmdldC1ib3VuZHMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gX3RoaXMuZ2V0VGFyZ2V0Qm91bmRzKCk7XG4gICAgfSk7XG5cbiAgICB2YXIgdGFyZ2V0SGVpZ2h0ID0gdGFyZ2V0U2l6ZS5oZWlnaHQ7XG4gICAgdmFyIHRhcmdldFdpZHRoID0gdGFyZ2V0U2l6ZS53aWR0aDtcblxuICAgIHZhciBhbGxDbGFzc2VzID0gW3RoaXMuZ2V0Q2xhc3MoJ3Bpbm5lZCcpLCB0aGlzLmdldENsYXNzKCdvdXQtb2YtYm91bmRzJyldO1xuXG4gICAgdGhpcy5vcHRpb25zLmNvbnN0cmFpbnRzLmZvckVhY2goZnVuY3Rpb24gKGNvbnN0cmFpbnQpIHtcbiAgICAgIHZhciBvdXRPZkJvdW5kc0NsYXNzID0gY29uc3RyYWludC5vdXRPZkJvdW5kc0NsYXNzO1xuICAgICAgdmFyIHBpbm5lZENsYXNzID0gY29uc3RyYWludC5waW5uZWRDbGFzcztcblxuICAgICAgaWYgKG91dE9mQm91bmRzQ2xhc3MpIHtcbiAgICAgICAgYWxsQ2xhc3Nlcy5wdXNoKG91dE9mQm91bmRzQ2xhc3MpO1xuICAgICAgfVxuICAgICAgaWYgKHBpbm5lZENsYXNzKSB7XG4gICAgICAgIGFsbENsYXNzZXMucHVzaChwaW5uZWRDbGFzcyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBhbGxDbGFzc2VzLmZvckVhY2goZnVuY3Rpb24gKGNscykge1xuICAgICAgWydsZWZ0JywgJ3RvcCcsICdyaWdodCcsICdib3R0b20nXS5mb3JFYWNoKGZ1bmN0aW9uIChzaWRlKSB7XG4gICAgICAgIGFsbENsYXNzZXMucHVzaChjbHMgKyAnLScgKyBzaWRlKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdmFyIGFkZENsYXNzZXMgPSBbXTtcblxuICAgIHZhciB0QXR0YWNobWVudCA9IGV4dGVuZCh7fSwgdGFyZ2V0QXR0YWNobWVudCk7XG4gICAgdmFyIGVBdHRhY2htZW50ID0gZXh0ZW5kKHt9LCB0aGlzLmF0dGFjaG1lbnQpO1xuXG4gICAgdGhpcy5vcHRpb25zLmNvbnN0cmFpbnRzLmZvckVhY2goZnVuY3Rpb24gKGNvbnN0cmFpbnQpIHtcbiAgICAgIHZhciB0byA9IGNvbnN0cmFpbnQudG87XG4gICAgICB2YXIgYXR0YWNobWVudCA9IGNvbnN0cmFpbnQuYXR0YWNobWVudDtcbiAgICAgIHZhciBwaW4gPSBjb25zdHJhaW50LnBpbjtcblxuICAgICAgaWYgKHR5cGVvZiBhdHRhY2htZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBhdHRhY2htZW50ID0gJyc7XG4gICAgICB9XG5cbiAgICAgIHZhciBjaGFuZ2VBdHRhY2hYID0gdW5kZWZpbmVkLFxuICAgICAgICAgIGNoYW5nZUF0dGFjaFkgPSB1bmRlZmluZWQ7XG4gICAgICBpZiAoYXR0YWNobWVudC5pbmRleE9mKCcgJykgPj0gMCkge1xuICAgICAgICB2YXIgX2F0dGFjaG1lbnQkc3BsaXQgPSBhdHRhY2htZW50LnNwbGl0KCcgJyk7XG5cbiAgICAgICAgdmFyIF9hdHRhY2htZW50JHNwbGl0MiA9IF9zbGljZWRUb0FycmF5KF9hdHRhY2htZW50JHNwbGl0LCAyKTtcblxuICAgICAgICBjaGFuZ2VBdHRhY2hZID0gX2F0dGFjaG1lbnQkc3BsaXQyWzBdO1xuICAgICAgICBjaGFuZ2VBdHRhY2hYID0gX2F0dGFjaG1lbnQkc3BsaXQyWzFdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hhbmdlQXR0YWNoWCA9IGNoYW5nZUF0dGFjaFkgPSBhdHRhY2htZW50O1xuICAgICAgfVxuXG4gICAgICB2YXIgYm91bmRzID0gZ2V0Qm91bmRpbmdSZWN0KF90aGlzLCB0byk7XG5cbiAgICAgIGlmIChjaGFuZ2VBdHRhY2hZID09PSAndGFyZ2V0JyB8fCBjaGFuZ2VBdHRhY2hZID09PSAnYm90aCcpIHtcbiAgICAgICAgaWYgKHRvcCA8IGJvdW5kc1sxXSAmJiB0QXR0YWNobWVudC50b3AgPT09ICd0b3AnKSB7XG4gICAgICAgICAgdG9wICs9IHRhcmdldEhlaWdodDtcbiAgICAgICAgICB0QXR0YWNobWVudC50b3AgPSAnYm90dG9tJztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b3AgKyBoZWlnaHQgPiBib3VuZHNbM10gJiYgdEF0dGFjaG1lbnQudG9wID09PSAnYm90dG9tJykge1xuICAgICAgICAgIHRvcCAtPSB0YXJnZXRIZWlnaHQ7XG4gICAgICAgICAgdEF0dGFjaG1lbnQudG9wID0gJ3RvcCc7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGNoYW5nZUF0dGFjaFkgPT09ICd0b2dldGhlcicpIHtcbiAgICAgICAgaWYgKHRBdHRhY2htZW50LnRvcCA9PT0gJ3RvcCcpIHtcbiAgICAgICAgICBpZiAoZUF0dGFjaG1lbnQudG9wID09PSAnYm90dG9tJyAmJiB0b3AgPCBib3VuZHNbMV0pIHtcbiAgICAgICAgICAgIHRvcCArPSB0YXJnZXRIZWlnaHQ7XG4gICAgICAgICAgICB0QXR0YWNobWVudC50b3AgPSAnYm90dG9tJztcblxuICAgICAgICAgICAgdG9wICs9IGhlaWdodDtcbiAgICAgICAgICAgIGVBdHRhY2htZW50LnRvcCA9ICd0b3AnO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZUF0dGFjaG1lbnQudG9wID09PSAndG9wJyAmJiB0b3AgKyBoZWlnaHQgPiBib3VuZHNbM10gJiYgdG9wIC0gKGhlaWdodCAtIHRhcmdldEhlaWdodCkgPj0gYm91bmRzWzFdKSB7XG4gICAgICAgICAgICB0b3AgLT0gaGVpZ2h0IC0gdGFyZ2V0SGVpZ2h0O1xuICAgICAgICAgICAgdEF0dGFjaG1lbnQudG9wID0gJ2JvdHRvbSc7XG5cbiAgICAgICAgICAgIGVBdHRhY2htZW50LnRvcCA9ICdib3R0b20nO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0QXR0YWNobWVudC50b3AgPT09ICdib3R0b20nKSB7XG4gICAgICAgICAgaWYgKGVBdHRhY2htZW50LnRvcCA9PT0gJ3RvcCcgJiYgdG9wICsgaGVpZ2h0ID4gYm91bmRzWzNdKSB7XG4gICAgICAgICAgICB0b3AgLT0gdGFyZ2V0SGVpZ2h0O1xuICAgICAgICAgICAgdEF0dGFjaG1lbnQudG9wID0gJ3RvcCc7XG5cbiAgICAgICAgICAgIHRvcCAtPSBoZWlnaHQ7XG4gICAgICAgICAgICBlQXR0YWNobWVudC50b3AgPSAnYm90dG9tJztcbiAgICAgICAgICB9IGVsc2UgaWYgKGVBdHRhY2htZW50LnRvcCA9PT0gJ2JvdHRvbScgJiYgdG9wIDwgYm91bmRzWzFdICYmIHRvcCArIChoZWlnaHQgKiAyIC0gdGFyZ2V0SGVpZ2h0KSA8PSBib3VuZHNbM10pIHtcbiAgICAgICAgICAgIHRvcCArPSBoZWlnaHQgLSB0YXJnZXRIZWlnaHQ7XG4gICAgICAgICAgICB0QXR0YWNobWVudC50b3AgPSAndG9wJztcblxuICAgICAgICAgICAgZUF0dGFjaG1lbnQudG9wID0gJ3RvcCc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRBdHRhY2htZW50LnRvcCA9PT0gJ21pZGRsZScpIHtcbiAgICAgICAgICBpZiAodG9wICsgaGVpZ2h0ID4gYm91bmRzWzNdICYmIGVBdHRhY2htZW50LnRvcCA9PT0gJ3RvcCcpIHtcbiAgICAgICAgICAgIHRvcCAtPSBoZWlnaHQ7XG4gICAgICAgICAgICBlQXR0YWNobWVudC50b3AgPSAnYm90dG9tJztcbiAgICAgICAgICB9IGVsc2UgaWYgKHRvcCA8IGJvdW5kc1sxXSAmJiBlQXR0YWNobWVudC50b3AgPT09ICdib3R0b20nKSB7XG4gICAgICAgICAgICB0b3AgKz0gaGVpZ2h0O1xuICAgICAgICAgICAgZUF0dGFjaG1lbnQudG9wID0gJ3RvcCc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChjaGFuZ2VBdHRhY2hYID09PSAndGFyZ2V0JyB8fCBjaGFuZ2VBdHRhY2hYID09PSAnYm90aCcpIHtcbiAgICAgICAgaWYgKGxlZnQgPCBib3VuZHNbMF0gJiYgdEF0dGFjaG1lbnQubGVmdCA9PT0gJ2xlZnQnKSB7XG4gICAgICAgICAgbGVmdCArPSB0YXJnZXRXaWR0aDtcbiAgICAgICAgICB0QXR0YWNobWVudC5sZWZ0ID0gJ3JpZ2h0JztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsZWZ0ICsgd2lkdGggPiBib3VuZHNbMl0gJiYgdEF0dGFjaG1lbnQubGVmdCA9PT0gJ3JpZ2h0Jykge1xuICAgICAgICAgIGxlZnQgLT0gdGFyZ2V0V2lkdGg7XG4gICAgICAgICAgdEF0dGFjaG1lbnQubGVmdCA9ICdsZWZ0JztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoY2hhbmdlQXR0YWNoWCA9PT0gJ3RvZ2V0aGVyJykge1xuICAgICAgICBpZiAobGVmdCA8IGJvdW5kc1swXSAmJiB0QXR0YWNobWVudC5sZWZ0ID09PSAnbGVmdCcpIHtcbiAgICAgICAgICBpZiAoZUF0dGFjaG1lbnQubGVmdCA9PT0gJ3JpZ2h0Jykge1xuICAgICAgICAgICAgbGVmdCArPSB0YXJnZXRXaWR0aDtcbiAgICAgICAgICAgIHRBdHRhY2htZW50LmxlZnQgPSAncmlnaHQnO1xuXG4gICAgICAgICAgICBsZWZ0ICs9IHdpZHRoO1xuICAgICAgICAgICAgZUF0dGFjaG1lbnQubGVmdCA9ICdsZWZ0JztcbiAgICAgICAgICB9IGVsc2UgaWYgKGVBdHRhY2htZW50LmxlZnQgPT09ICdsZWZ0Jykge1xuICAgICAgICAgICAgbGVmdCArPSB0YXJnZXRXaWR0aDtcbiAgICAgICAgICAgIHRBdHRhY2htZW50LmxlZnQgPSAncmlnaHQnO1xuXG4gICAgICAgICAgICBsZWZ0IC09IHdpZHRoO1xuICAgICAgICAgICAgZUF0dGFjaG1lbnQubGVmdCA9ICdyaWdodCc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGxlZnQgKyB3aWR0aCA+IGJvdW5kc1syXSAmJiB0QXR0YWNobWVudC5sZWZ0ID09PSAncmlnaHQnKSB7XG4gICAgICAgICAgaWYgKGVBdHRhY2htZW50LmxlZnQgPT09ICdsZWZ0Jykge1xuICAgICAgICAgICAgbGVmdCAtPSB0YXJnZXRXaWR0aDtcbiAgICAgICAgICAgIHRBdHRhY2htZW50LmxlZnQgPSAnbGVmdCc7XG5cbiAgICAgICAgICAgIGxlZnQgLT0gd2lkdGg7XG4gICAgICAgICAgICBlQXR0YWNobWVudC5sZWZ0ID0gJ3JpZ2h0JztcbiAgICAgICAgICB9IGVsc2UgaWYgKGVBdHRhY2htZW50LmxlZnQgPT09ICdyaWdodCcpIHtcbiAgICAgICAgICAgIGxlZnQgLT0gdGFyZ2V0V2lkdGg7XG4gICAgICAgICAgICB0QXR0YWNobWVudC5sZWZ0ID0gJ2xlZnQnO1xuXG4gICAgICAgICAgICBsZWZ0ICs9IHdpZHRoO1xuICAgICAgICAgICAgZUF0dGFjaG1lbnQubGVmdCA9ICdsZWZ0JztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodEF0dGFjaG1lbnQubGVmdCA9PT0gJ2NlbnRlcicpIHtcbiAgICAgICAgICBpZiAobGVmdCArIHdpZHRoID4gYm91bmRzWzJdICYmIGVBdHRhY2htZW50LmxlZnQgPT09ICdsZWZ0Jykge1xuICAgICAgICAgICAgbGVmdCAtPSB3aWR0aDtcbiAgICAgICAgICAgIGVBdHRhY2htZW50LmxlZnQgPSAncmlnaHQnO1xuICAgICAgICAgIH0gZWxzZSBpZiAobGVmdCA8IGJvdW5kc1swXSAmJiBlQXR0YWNobWVudC5sZWZ0ID09PSAncmlnaHQnKSB7XG4gICAgICAgICAgICBsZWZ0ICs9IHdpZHRoO1xuICAgICAgICAgICAgZUF0dGFjaG1lbnQubGVmdCA9ICdsZWZ0JztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGNoYW5nZUF0dGFjaFkgPT09ICdlbGVtZW50JyB8fCBjaGFuZ2VBdHRhY2hZID09PSAnYm90aCcpIHtcbiAgICAgICAgaWYgKHRvcCA8IGJvdW5kc1sxXSAmJiBlQXR0YWNobWVudC50b3AgPT09ICdib3R0b20nKSB7XG4gICAgICAgICAgdG9wICs9IGhlaWdodDtcbiAgICAgICAgICBlQXR0YWNobWVudC50b3AgPSAndG9wJztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b3AgKyBoZWlnaHQgPiBib3VuZHNbM10gJiYgZUF0dGFjaG1lbnQudG9wID09PSAndG9wJykge1xuICAgICAgICAgIHRvcCAtPSBoZWlnaHQ7XG4gICAgICAgICAgZUF0dGFjaG1lbnQudG9wID0gJ2JvdHRvbSc7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGNoYW5nZUF0dGFjaFggPT09ICdlbGVtZW50JyB8fCBjaGFuZ2VBdHRhY2hYID09PSAnYm90aCcpIHtcbiAgICAgICAgaWYgKGxlZnQgPCBib3VuZHNbMF0pIHtcbiAgICAgICAgICBpZiAoZUF0dGFjaG1lbnQubGVmdCA9PT0gJ3JpZ2h0Jykge1xuICAgICAgICAgICAgbGVmdCArPSB3aWR0aDtcbiAgICAgICAgICAgIGVBdHRhY2htZW50LmxlZnQgPSAnbGVmdCc7XG4gICAgICAgICAgfSBlbHNlIGlmIChlQXR0YWNobWVudC5sZWZ0ID09PSAnY2VudGVyJykge1xuICAgICAgICAgICAgbGVmdCArPSB3aWR0aCAvIDI7XG4gICAgICAgICAgICBlQXR0YWNobWVudC5sZWZ0ID0gJ2xlZnQnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsZWZ0ICsgd2lkdGggPiBib3VuZHNbMl0pIHtcbiAgICAgICAgICBpZiAoZUF0dGFjaG1lbnQubGVmdCA9PT0gJ2xlZnQnKSB7XG4gICAgICAgICAgICBsZWZ0IC09IHdpZHRoO1xuICAgICAgICAgICAgZUF0dGFjaG1lbnQubGVmdCA9ICdyaWdodCc7XG4gICAgICAgICAgfSBlbHNlIGlmIChlQXR0YWNobWVudC5sZWZ0ID09PSAnY2VudGVyJykge1xuICAgICAgICAgICAgbGVmdCAtPSB3aWR0aCAvIDI7XG4gICAgICAgICAgICBlQXR0YWNobWVudC5sZWZ0ID0gJ3JpZ2h0JztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBwaW4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBpbiA9IHBpbi5zcGxpdCgnLCcpLm1hcChmdW5jdGlvbiAocCkge1xuICAgICAgICAgIHJldHVybiBwLnRyaW0oKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKHBpbiA9PT0gdHJ1ZSkge1xuICAgICAgICBwaW4gPSBbJ3RvcCcsICdsZWZ0JywgJ3JpZ2h0JywgJ2JvdHRvbSddO1xuICAgICAgfVxuXG4gICAgICBwaW4gPSBwaW4gfHwgW107XG5cbiAgICAgIHZhciBwaW5uZWQgPSBbXTtcbiAgICAgIHZhciBvb2IgPSBbXTtcblxuICAgICAgaWYgKHRvcCA8IGJvdW5kc1sxXSkge1xuICAgICAgICBpZiAocGluLmluZGV4T2YoJ3RvcCcpID49IDApIHtcbiAgICAgICAgICB0b3AgPSBib3VuZHNbMV07XG4gICAgICAgICAgcGlubmVkLnB1c2goJ3RvcCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG9vYi5wdXNoKCd0b3AnKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAodG9wICsgaGVpZ2h0ID4gYm91bmRzWzNdKSB7XG4gICAgICAgIGlmIChwaW4uaW5kZXhPZignYm90dG9tJykgPj0gMCkge1xuICAgICAgICAgIHRvcCA9IGJvdW5kc1szXSAtIGhlaWdodDtcbiAgICAgICAgICBwaW5uZWQucHVzaCgnYm90dG9tJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb29iLnB1c2goJ2JvdHRvbScpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChsZWZ0IDwgYm91bmRzWzBdKSB7XG4gICAgICAgIGlmIChwaW4uaW5kZXhPZignbGVmdCcpID49IDApIHtcbiAgICAgICAgICBsZWZ0ID0gYm91bmRzWzBdO1xuICAgICAgICAgIHBpbm5lZC5wdXNoKCdsZWZ0Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb29iLnB1c2goJ2xlZnQnKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAobGVmdCArIHdpZHRoID4gYm91bmRzWzJdKSB7XG4gICAgICAgIGlmIChwaW4uaW5kZXhPZigncmlnaHQnKSA+PSAwKSB7XG4gICAgICAgICAgbGVmdCA9IGJvdW5kc1syXSAtIHdpZHRoO1xuICAgICAgICAgIHBpbm5lZC5wdXNoKCdyaWdodCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG9vYi5wdXNoKCdyaWdodCcpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChwaW5uZWQubGVuZ3RoKSB7XG4gICAgICAgIChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIHBpbm5lZENsYXNzID0gdW5kZWZpbmVkO1xuICAgICAgICAgIGlmICh0eXBlb2YgX3RoaXMub3B0aW9ucy5waW5uZWRDbGFzcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHBpbm5lZENsYXNzID0gX3RoaXMub3B0aW9ucy5waW5uZWRDbGFzcztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGlubmVkQ2xhc3MgPSBfdGhpcy5nZXRDbGFzcygncGlubmVkJyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYWRkQ2xhc3Nlcy5wdXNoKHBpbm5lZENsYXNzKTtcbiAgICAgICAgICBwaW5uZWQuZm9yRWFjaChmdW5jdGlvbiAoc2lkZSkge1xuICAgICAgICAgICAgYWRkQ2xhc3Nlcy5wdXNoKHBpbm5lZENsYXNzICsgJy0nICsgc2lkZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pKCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChvb2IubGVuZ3RoKSB7XG4gICAgICAgIChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIG9vYkNsYXNzID0gdW5kZWZpbmVkO1xuICAgICAgICAgIGlmICh0eXBlb2YgX3RoaXMub3B0aW9ucy5vdXRPZkJvdW5kc0NsYXNzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgb29iQ2xhc3MgPSBfdGhpcy5vcHRpb25zLm91dE9mQm91bmRzQ2xhc3M7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9vYkNsYXNzID0gX3RoaXMuZ2V0Q2xhc3MoJ291dC1vZi1ib3VuZHMnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBhZGRDbGFzc2VzLnB1c2gob29iQ2xhc3MpO1xuICAgICAgICAgIG9vYi5mb3JFYWNoKGZ1bmN0aW9uIChzaWRlKSB7XG4gICAgICAgICAgICBhZGRDbGFzc2VzLnB1c2gob29iQ2xhc3MgKyAnLScgKyBzaWRlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSkoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBpbm5lZC5pbmRleE9mKCdsZWZ0JykgPj0gMCB8fCBwaW5uZWQuaW5kZXhPZigncmlnaHQnKSA+PSAwKSB7XG4gICAgICAgIGVBdHRhY2htZW50LmxlZnQgPSB0QXR0YWNobWVudC5sZWZ0ID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAocGlubmVkLmluZGV4T2YoJ3RvcCcpID49IDAgfHwgcGlubmVkLmluZGV4T2YoJ2JvdHRvbScpID49IDApIHtcbiAgICAgICAgZUF0dGFjaG1lbnQudG9wID0gdEF0dGFjaG1lbnQudG9wID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGlmICh0QXR0YWNobWVudC50b3AgIT09IHRhcmdldEF0dGFjaG1lbnQudG9wIHx8IHRBdHRhY2htZW50LmxlZnQgIT09IHRhcmdldEF0dGFjaG1lbnQubGVmdCB8fCBlQXR0YWNobWVudC50b3AgIT09IF90aGlzLmF0dGFjaG1lbnQudG9wIHx8IGVBdHRhY2htZW50LmxlZnQgIT09IF90aGlzLmF0dGFjaG1lbnQubGVmdCkge1xuICAgICAgICBfdGhpcy51cGRhdGVBdHRhY2hDbGFzc2VzKGVBdHRhY2htZW50LCB0QXR0YWNobWVudCk7XG4gICAgICAgIF90aGlzLnRyaWdnZXIoJ3VwZGF0ZScsIHtcbiAgICAgICAgICBhdHRhY2htZW50OiBlQXR0YWNobWVudCxcbiAgICAgICAgICB0YXJnZXRBdHRhY2htZW50OiB0QXR0YWNobWVudFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGRlZmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghKF90aGlzLm9wdGlvbnMuYWRkVGFyZ2V0Q2xhc3NlcyA9PT0gZmFsc2UpKSB7XG4gICAgICAgIHVwZGF0ZUNsYXNzZXMoX3RoaXMudGFyZ2V0LCBhZGRDbGFzc2VzLCBhbGxDbGFzc2VzKTtcbiAgICAgIH1cbiAgICAgIHVwZGF0ZUNsYXNzZXMoX3RoaXMuZWxlbWVudCwgYWRkQ2xhc3NlcywgYWxsQ2xhc3Nlcyk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4geyB0b3A6IHRvcCwgbGVmdDogbGVmdCB9O1xuICB9XG59KTtcbi8qIGdsb2JhbHMgVGV0aGVyQmFzZSAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfVGV0aGVyQmFzZSRVdGlscyA9IFRldGhlckJhc2UuVXRpbHM7XG52YXIgZ2V0Qm91bmRzID0gX1RldGhlckJhc2UkVXRpbHMuZ2V0Qm91bmRzO1xudmFyIHVwZGF0ZUNsYXNzZXMgPSBfVGV0aGVyQmFzZSRVdGlscy51cGRhdGVDbGFzc2VzO1xudmFyIGRlZmVyID0gX1RldGhlckJhc2UkVXRpbHMuZGVmZXI7XG5cblRldGhlckJhc2UubW9kdWxlcy5wdXNoKHtcbiAgcG9zaXRpb246IGZ1bmN0aW9uIHBvc2l0aW9uKF9yZWYpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdmFyIHRvcCA9IF9yZWYudG9wO1xuICAgIHZhciBsZWZ0ID0gX3JlZi5sZWZ0O1xuXG4gICAgdmFyIF9jYWNoZSA9IHRoaXMuY2FjaGUoJ2VsZW1lbnQtYm91bmRzJywgZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIGdldEJvdW5kcyhfdGhpcy5lbGVtZW50KTtcbiAgICB9KTtcblxuICAgIHZhciBoZWlnaHQgPSBfY2FjaGUuaGVpZ2h0O1xuICAgIHZhciB3aWR0aCA9IF9jYWNoZS53aWR0aDtcblxuICAgIHZhciB0YXJnZXRQb3MgPSB0aGlzLmdldFRhcmdldEJvdW5kcygpO1xuXG4gICAgdmFyIGJvdHRvbSA9IHRvcCArIGhlaWdodDtcbiAgICB2YXIgcmlnaHQgPSBsZWZ0ICsgd2lkdGg7XG5cbiAgICB2YXIgYWJ1dHRlZCA9IFtdO1xuICAgIGlmICh0b3AgPD0gdGFyZ2V0UG9zLmJvdHRvbSAmJiBib3R0b20gPj0gdGFyZ2V0UG9zLnRvcCkge1xuICAgICAgWydsZWZ0JywgJ3JpZ2h0J10uZm9yRWFjaChmdW5jdGlvbiAoc2lkZSkge1xuICAgICAgICB2YXIgdGFyZ2V0UG9zU2lkZSA9IHRhcmdldFBvc1tzaWRlXTtcbiAgICAgICAgaWYgKHRhcmdldFBvc1NpZGUgPT09IGxlZnQgfHwgdGFyZ2V0UG9zU2lkZSA9PT0gcmlnaHQpIHtcbiAgICAgICAgICBhYnV0dGVkLnB1c2goc2lkZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChsZWZ0IDw9IHRhcmdldFBvcy5yaWdodCAmJiByaWdodCA+PSB0YXJnZXRQb3MubGVmdCkge1xuICAgICAgWyd0b3AnLCAnYm90dG9tJ10uZm9yRWFjaChmdW5jdGlvbiAoc2lkZSkge1xuICAgICAgICB2YXIgdGFyZ2V0UG9zU2lkZSA9IHRhcmdldFBvc1tzaWRlXTtcbiAgICAgICAgaWYgKHRhcmdldFBvc1NpZGUgPT09IHRvcCB8fCB0YXJnZXRQb3NTaWRlID09PSBib3R0b20pIHtcbiAgICAgICAgICBhYnV0dGVkLnB1c2goc2lkZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHZhciBhbGxDbGFzc2VzID0gW107XG4gICAgdmFyIGFkZENsYXNzZXMgPSBbXTtcblxuICAgIHZhciBzaWRlcyA9IFsnbGVmdCcsICd0b3AnLCAncmlnaHQnLCAnYm90dG9tJ107XG4gICAgYWxsQ2xhc3Nlcy5wdXNoKHRoaXMuZ2V0Q2xhc3MoJ2FidXR0ZWQnKSk7XG4gICAgc2lkZXMuZm9yRWFjaChmdW5jdGlvbiAoc2lkZSkge1xuICAgICAgYWxsQ2xhc3Nlcy5wdXNoKF90aGlzLmdldENsYXNzKCdhYnV0dGVkJykgKyAnLScgKyBzaWRlKTtcbiAgICB9KTtcblxuICAgIGlmIChhYnV0dGVkLmxlbmd0aCkge1xuICAgICAgYWRkQ2xhc3Nlcy5wdXNoKHRoaXMuZ2V0Q2xhc3MoJ2FidXR0ZWQnKSk7XG4gICAgfVxuXG4gICAgYWJ1dHRlZC5mb3JFYWNoKGZ1bmN0aW9uIChzaWRlKSB7XG4gICAgICBhZGRDbGFzc2VzLnB1c2goX3RoaXMuZ2V0Q2xhc3MoJ2FidXR0ZWQnKSArICctJyArIHNpZGUpO1xuICAgIH0pO1xuXG4gICAgZGVmZXIoZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCEoX3RoaXMub3B0aW9ucy5hZGRUYXJnZXRDbGFzc2VzID09PSBmYWxzZSkpIHtcbiAgICAgICAgdXBkYXRlQ2xhc3NlcyhfdGhpcy50YXJnZXQsIGFkZENsYXNzZXMsIGFsbENsYXNzZXMpO1xuICAgICAgfVxuICAgICAgdXBkYXRlQ2xhc3NlcyhfdGhpcy5lbGVtZW50LCBhZGRDbGFzc2VzLCBhbGxDbGFzc2VzKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB0cnVlO1xuICB9XG59KTtcbi8qIGdsb2JhbHMgVGV0aGVyQmFzZSAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfc2xpY2VkVG9BcnJheSA9IChmdW5jdGlvbiAoKSB7IGZ1bmN0aW9uIHNsaWNlSXRlcmF0b3IoYXJyLCBpKSB7IHZhciBfYXJyID0gW107IHZhciBfbiA9IHRydWU7IHZhciBfZCA9IGZhbHNlOyB2YXIgX2UgPSB1bmRlZmluZWQ7IHRyeSB7IGZvciAodmFyIF9pID0gYXJyW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3M7ICEoX24gPSAoX3MgPSBfaS5uZXh0KCkpLmRvbmUpOyBfbiA9IHRydWUpIHsgX2Fyci5wdXNoKF9zLnZhbHVlKTsgaWYgKGkgJiYgX2Fyci5sZW5ndGggPT09IGkpIGJyZWFrOyB9IH0gY2F0Y2ggKGVycikgeyBfZCA9IHRydWU7IF9lID0gZXJyOyB9IGZpbmFsbHkgeyB0cnkgeyBpZiAoIV9uICYmIF9pWydyZXR1cm4nXSkgX2lbJ3JldHVybiddKCk7IH0gZmluYWxseSB7IGlmIChfZCkgdGhyb3cgX2U7IH0gfSByZXR1cm4gX2FycjsgfSByZXR1cm4gZnVuY3Rpb24gKGFyciwgaSkgeyBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7IHJldHVybiBhcnI7IH0gZWxzZSBpZiAoU3ltYm9sLml0ZXJhdG9yIGluIE9iamVjdChhcnIpKSB7IHJldHVybiBzbGljZUl0ZXJhdG9yKGFyciwgaSk7IH0gZWxzZSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgYXR0ZW1wdCB0byBkZXN0cnVjdHVyZSBub24taXRlcmFibGUgaW5zdGFuY2UnKTsgfSB9OyB9KSgpO1xuXG5UZXRoZXJCYXNlLm1vZHVsZXMucHVzaCh7XG4gIHBvc2l0aW9uOiBmdW5jdGlvbiBwb3NpdGlvbihfcmVmKSB7XG4gICAgdmFyIHRvcCA9IF9yZWYudG9wO1xuICAgIHZhciBsZWZ0ID0gX3JlZi5sZWZ0O1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuc2hpZnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc2hpZnQgPSB0aGlzLm9wdGlvbnMuc2hpZnQ7XG4gICAgaWYgKHR5cGVvZiB0aGlzLm9wdGlvbnMuc2hpZnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHNoaWZ0ID0gdGhpcy5vcHRpb25zLnNoaWZ0LmNhbGwodGhpcywgeyB0b3A6IHRvcCwgbGVmdDogbGVmdCB9KTtcbiAgICB9XG5cbiAgICB2YXIgc2hpZnRUb3AgPSB1bmRlZmluZWQsXG4gICAgICAgIHNoaWZ0TGVmdCA9IHVuZGVmaW5lZDtcbiAgICBpZiAodHlwZW9mIHNoaWZ0ID09PSAnc3RyaW5nJykge1xuICAgICAgc2hpZnQgPSBzaGlmdC5zcGxpdCgnICcpO1xuICAgICAgc2hpZnRbMV0gPSBzaGlmdFsxXSB8fCBzaGlmdFswXTtcblxuICAgICAgdmFyIF9zaGlmdCA9IHNoaWZ0O1xuXG4gICAgICB2YXIgX3NoaWZ0MiA9IF9zbGljZWRUb0FycmF5KF9zaGlmdCwgMik7XG5cbiAgICAgIHNoaWZ0VG9wID0gX3NoaWZ0MlswXTtcbiAgICAgIHNoaWZ0TGVmdCA9IF9zaGlmdDJbMV07XG5cbiAgICAgIHNoaWZ0VG9wID0gcGFyc2VGbG9hdChzaGlmdFRvcCwgMTApO1xuICAgICAgc2hpZnRMZWZ0ID0gcGFyc2VGbG9hdChzaGlmdExlZnQsIDEwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2hpZnRUb3AgPSBzaGlmdC50b3A7XG4gICAgICBzaGlmdExlZnQgPSBzaGlmdC5sZWZ0O1xuICAgIH1cblxuICAgIHRvcCArPSBzaGlmdFRvcDtcbiAgICBsZWZ0ICs9IHNoaWZ0TGVmdDtcblxuICAgIHJldHVybiB7IHRvcDogdG9wLCBsZWZ0OiBsZWZ0IH07XG4gIH1cbn0pO1xucmV0dXJuIFRldGhlcjtcblxufSkpO1xuIiwiLyohXG4gKiBCb290c3RyYXAgdjQuMC4wLWFscGhhLjYgKGh0dHBzOi8vZ2V0Ym9vdHN0cmFwLmNvbSlcbiAqIENvcHlyaWdodCAyMDExLTIwMTcgVGhlIEJvb3RzdHJhcCBBdXRob3JzIChodHRwczovL2dpdGh1Yi5jb20vdHdicy9ib290c3RyYXAvZ3JhcGhzL2NvbnRyaWJ1dG9ycylcbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL3R3YnMvYm9vdHN0cmFwL2Jsb2IvbWFzdGVyL0xJQ0VOU0UpXG4gKi9cblxuaWYgKHR5cGVvZiBqUXVlcnkgPT09ICd1bmRlZmluZWQnKSB7XG4gIHRocm93IG5ldyBFcnJvcignQm9vdHN0cmFwXFwncyBKYXZhU2NyaXB0IHJlcXVpcmVzIGpRdWVyeS4galF1ZXJ5IG11c3QgYmUgaW5jbHVkZWQgYmVmb3JlIEJvb3RzdHJhcFxcJ3MgSmF2YVNjcmlwdC4nKVxufVxuXG4rZnVuY3Rpb24gKCQpIHtcbiAgdmFyIHZlcnNpb24gPSAkLmZuLmpxdWVyeS5zcGxpdCgnICcpWzBdLnNwbGl0KCcuJylcbiAgaWYgKCh2ZXJzaW9uWzBdIDwgMiAmJiB2ZXJzaW9uWzFdIDwgOSkgfHwgKHZlcnNpb25bMF0gPT0gMSAmJiB2ZXJzaW9uWzFdID09IDkgJiYgdmVyc2lvblsyXSA8IDEpIHx8ICh2ZXJzaW9uWzBdID49IDQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCb290c3RyYXBcXCdzIEphdmFTY3JpcHQgcmVxdWlyZXMgYXQgbGVhc3QgalF1ZXJ5IHYxLjkuMSBidXQgbGVzcyB0aGFuIHY0LjAuMCcpXG4gIH1cbn0oalF1ZXJ5KTtcblxuXG4rZnVuY3Rpb24gKCkge1xuXG52YXIgX3R5cGVvZiA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiID8gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfSA6IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07XG5cbnZhciBfY3JlYXRlQ2xhc3MgPSBmdW5jdGlvbiAoKSB7IGZ1bmN0aW9uIGRlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfSByZXR1cm4gZnVuY3Rpb24gKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTsgcmV0dXJuIENvbnN0cnVjdG9yOyB9OyB9KCk7XG5cbmZ1bmN0aW9uIF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHNlbGYsIGNhbGwpIHsgaWYgKCFzZWxmKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gY2FsbCAmJiAodHlwZW9mIGNhbGwgPT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIGNhbGwgPT09IFwiZnVuY3Rpb25cIikgPyBjYWxsIDogc2VsZjsgfVxuXG5mdW5jdGlvbiBfaW5oZXJpdHMoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHsgaWYgKHR5cGVvZiBzdXBlckNsYXNzICE9PSBcImZ1bmN0aW9uXCIgJiYgc3VwZXJDbGFzcyAhPT0gbnVsbCkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb24sIG5vdCBcIiArIHR5cGVvZiBzdXBlckNsYXNzKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCBlbnVtZXJhYmxlOiBmYWxzZSwgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH0pOyBpZiAoc3VwZXJDbGFzcykgT2JqZWN0LnNldFByb3RvdHlwZU9mID8gT2JqZWN0LnNldFByb3RvdHlwZU9mKHN1YkNsYXNzLCBzdXBlckNsYXNzKSA6IHN1YkNsYXNzLl9fcHJvdG9fXyA9IHN1cGVyQ2xhc3M7IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxuLyoqXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogQm9vdHN0cmFwICh2NC4wLjAtYWxwaGEuNik6IHV0aWwuanNcbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL3R3YnMvYm9vdHN0cmFwL2Jsb2IvbWFzdGVyL0xJQ0VOU0UpXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICovXG5cbnZhciBVdGlsID0gZnVuY3Rpb24gKCQpIHtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIFByaXZhdGUgVHJhbnNpdGlvbkVuZCBIZWxwZXJzXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgdHJhbnNpdGlvbiA9IGZhbHNlO1xuXG4gIHZhciBNQVhfVUlEID0gMTAwMDAwMDtcblxuICB2YXIgVHJhbnNpdGlvbkVuZEV2ZW50ID0ge1xuICAgIFdlYmtpdFRyYW5zaXRpb246ICd3ZWJraXRUcmFuc2l0aW9uRW5kJyxcbiAgICBNb3pUcmFuc2l0aW9uOiAndHJhbnNpdGlvbmVuZCcsXG4gICAgT1RyYW5zaXRpb246ICdvVHJhbnNpdGlvbkVuZCBvdHJhbnNpdGlvbmVuZCcsXG4gICAgdHJhbnNpdGlvbjogJ3RyYW5zaXRpb25lbmQnXG4gIH07XG5cbiAgLy8gc2hvdXRvdXQgQW5ndXNDcm9sbCAoaHR0cHM6Ly9nb28uZ2wvcHh3UUdwKVxuICBmdW5jdGlvbiB0b1R5cGUob2JqKSB7XG4gICAgcmV0dXJuIHt9LnRvU3RyaW5nLmNhbGwob2JqKS5tYXRjaCgvXFxzKFthLXpBLVpdKykvKVsxXS50b0xvd2VyQ2FzZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNFbGVtZW50KG9iaikge1xuICAgIHJldHVybiAob2JqWzBdIHx8IG9iaikubm9kZVR5cGU7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRTcGVjaWFsVHJhbnNpdGlvbkVuZEV2ZW50KCkge1xuICAgIHJldHVybiB7XG4gICAgICBiaW5kVHlwZTogdHJhbnNpdGlvbi5lbmQsXG4gICAgICBkZWxlZ2F0ZVR5cGU6IHRyYW5zaXRpb24uZW5kLFxuICAgICAgaGFuZGxlOiBmdW5jdGlvbiBoYW5kbGUoZXZlbnQpIHtcbiAgICAgICAgaWYgKCQoZXZlbnQudGFyZ2V0KS5pcyh0aGlzKSkge1xuICAgICAgICAgIHJldHVybiBldmVudC5oYW5kbGVPYmouaGFuZGxlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIHByZWZlci1yZXN0LXBhcmFtc1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25FbmRUZXN0KCkge1xuICAgIGlmICh3aW5kb3cuUVVuaXQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdib290c3RyYXAnKTtcblxuICAgIGZvciAodmFyIG5hbWUgaW4gVHJhbnNpdGlvbkVuZEV2ZW50KSB7XG4gICAgICBpZiAoZWwuc3R5bGVbbmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGVuZDogVHJhbnNpdGlvbkVuZEV2ZW50W25hbWVdXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbkVuZEVtdWxhdG9yKGR1cmF0aW9uKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHZhciBjYWxsZWQgPSBmYWxzZTtcblxuICAgICQodGhpcykub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGNhbGxlZCA9IHRydWU7XG4gICAgfSk7XG5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghY2FsbGVkKSB7XG4gICAgICAgIFV0aWwudHJpZ2dlclRyYW5zaXRpb25FbmQoX3RoaXMpO1xuICAgICAgfVxuICAgIH0sIGR1cmF0aW9uKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0VHJhbnNpdGlvbkVuZFN1cHBvcnQoKSB7XG4gICAgdHJhbnNpdGlvbiA9IHRyYW5zaXRpb25FbmRUZXN0KCk7XG5cbiAgICAkLmZuLmVtdWxhdGVUcmFuc2l0aW9uRW5kID0gdHJhbnNpdGlvbkVuZEVtdWxhdG9yO1xuXG4gICAgaWYgKFV0aWwuc3VwcG9ydHNUcmFuc2l0aW9uRW5kKCkpIHtcbiAgICAgICQuZXZlbnQuc3BlY2lhbFtVdGlsLlRSQU5TSVRJT05fRU5EXSA9IGdldFNwZWNpYWxUcmFuc2l0aW9uRW5kRXZlbnQoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogUHVibGljIFV0aWwgQXBpXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBVdGlsID0ge1xuXG4gICAgVFJBTlNJVElPTl9FTkQ6ICdic1RyYW5zaXRpb25FbmQnLFxuXG4gICAgZ2V0VUlEOiBmdW5jdGlvbiBnZXRVSUQocHJlZml4KSB7XG4gICAgICBkbyB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1iaXR3aXNlXG4gICAgICAgIHByZWZpeCArPSB+fihNYXRoLnJhbmRvbSgpICogTUFYX1VJRCk7IC8vIFwifn5cIiBhY3RzIGxpa2UgYSBmYXN0ZXIgTWF0aC5mbG9vcigpIGhlcmVcbiAgICAgIH0gd2hpbGUgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHByZWZpeCkpO1xuICAgICAgcmV0dXJuIHByZWZpeDtcbiAgICB9LFxuICAgIGdldFNlbGVjdG9yRnJvbUVsZW1lbnQ6IGZ1bmN0aW9uIGdldFNlbGVjdG9yRnJvbUVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgdmFyIHNlbGVjdG9yID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdGFyZ2V0Jyk7XG5cbiAgICAgIGlmICghc2VsZWN0b3IpIHtcbiAgICAgICAgc2VsZWN0b3IgPSBlbGVtZW50LmdldEF0dHJpYnV0ZSgnaHJlZicpIHx8ICcnO1xuICAgICAgICBzZWxlY3RvciA9IC9eI1thLXpdL2kudGVzdChzZWxlY3RvcikgPyBzZWxlY3RvciA6IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZWxlY3RvcjtcbiAgICB9LFxuICAgIHJlZmxvdzogZnVuY3Rpb24gcmVmbG93KGVsZW1lbnQpIHtcbiAgICAgIHJldHVybiBlbGVtZW50Lm9mZnNldEhlaWdodDtcbiAgICB9LFxuICAgIHRyaWdnZXJUcmFuc2l0aW9uRW5kOiBmdW5jdGlvbiB0cmlnZ2VyVHJhbnNpdGlvbkVuZChlbGVtZW50KSB7XG4gICAgICAkKGVsZW1lbnQpLnRyaWdnZXIodHJhbnNpdGlvbi5lbmQpO1xuICAgIH0sXG4gICAgc3VwcG9ydHNUcmFuc2l0aW9uRW5kOiBmdW5jdGlvbiBzdXBwb3J0c1RyYW5zaXRpb25FbmQoKSB7XG4gICAgICByZXR1cm4gQm9vbGVhbih0cmFuc2l0aW9uKTtcbiAgICB9LFxuICAgIHR5cGVDaGVja0NvbmZpZzogZnVuY3Rpb24gdHlwZUNoZWNrQ29uZmlnKGNvbXBvbmVudE5hbWUsIGNvbmZpZywgY29uZmlnVHlwZXMpIHtcbiAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIGNvbmZpZ1R5cGVzKSB7XG4gICAgICAgIGlmIChjb25maWdUeXBlcy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcbiAgICAgICAgICB2YXIgZXhwZWN0ZWRUeXBlcyA9IGNvbmZpZ1R5cGVzW3Byb3BlcnR5XTtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBjb25maWdbcHJvcGVydHldO1xuICAgICAgICAgIHZhciB2YWx1ZVR5cGUgPSB2YWx1ZSAmJiBpc0VsZW1lbnQodmFsdWUpID8gJ2VsZW1lbnQnIDogdG9UeXBlKHZhbHVlKTtcblxuICAgICAgICAgIGlmICghbmV3IFJlZ0V4cChleHBlY3RlZFR5cGVzKS50ZXN0KHZhbHVlVHlwZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihjb21wb25lbnROYW1lLnRvVXBwZXJDYXNlKCkgKyAnOiAnICsgKCdPcHRpb24gXCInICsgcHJvcGVydHkgKyAnXCIgcHJvdmlkZWQgdHlwZSBcIicgKyB2YWx1ZVR5cGUgKyAnXCIgJykgKyAoJ2J1dCBleHBlY3RlZCB0eXBlIFwiJyArIGV4cGVjdGVkVHlwZXMgKyAnXCIuJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBzZXRUcmFuc2l0aW9uRW5kU3VwcG9ydCgpO1xuXG4gIHJldHVybiBVdGlsO1xufShqUXVlcnkpO1xuXG4vKipcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBCb290c3RyYXAgKHY0LjAuMC1hbHBoYS42KTogYWxlcnQuanNcbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL3R3YnMvYm9vdHN0cmFwL2Jsb2IvbWFzdGVyL0xJQ0VOU0UpXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICovXG5cbnZhciBBbGVydCA9IGZ1bmN0aW9uICgkKSB7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FID0gJ2FsZXJ0JztcbiAgdmFyIFZFUlNJT04gPSAnNC4wLjAtYWxwaGEuNic7XG4gIHZhciBEQVRBX0tFWSA9ICdicy5hbGVydCc7XG4gIHZhciBFVkVOVF9LRVkgPSAnLicgKyBEQVRBX0tFWTtcbiAgdmFyIERBVEFfQVBJX0tFWSA9ICcuZGF0YS1hcGknO1xuICB2YXIgSlFVRVJZX05PX0NPTkZMSUNUID0gJC5mbltOQU1FXTtcbiAgdmFyIFRSQU5TSVRJT05fRFVSQVRJT04gPSAxNTA7XG5cbiAgdmFyIFNlbGVjdG9yID0ge1xuICAgIERJU01JU1M6ICdbZGF0YS1kaXNtaXNzPVwiYWxlcnRcIl0nXG4gIH07XG5cbiAgdmFyIEV2ZW50ID0ge1xuICAgIENMT1NFOiAnY2xvc2UnICsgRVZFTlRfS0VZLFxuICAgIENMT1NFRDogJ2Nsb3NlZCcgKyBFVkVOVF9LRVksXG4gICAgQ0xJQ0tfREFUQV9BUEk6ICdjbGljaycgKyBFVkVOVF9LRVkgKyBEQVRBX0FQSV9LRVlcbiAgfTtcblxuICB2YXIgQ2xhc3NOYW1lID0ge1xuICAgIEFMRVJUOiAnYWxlcnQnLFxuICAgIEZBREU6ICdmYWRlJyxcbiAgICBTSE9XOiAnc2hvdydcbiAgfTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIENsYXNzIERlZmluaXRpb25cbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBBbGVydCA9IGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBBbGVydChlbGVtZW50KSB7XG4gICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgQWxlcnQpO1xuXG4gICAgICB0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtcbiAgICB9XG5cbiAgICAvLyBnZXR0ZXJzXG5cbiAgICAvLyBwdWJsaWNcblxuICAgIEFsZXJ0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uIGNsb3NlKGVsZW1lbnQpIHtcbiAgICAgIGVsZW1lbnQgPSBlbGVtZW50IHx8IHRoaXMuX2VsZW1lbnQ7XG5cbiAgICAgIHZhciByb290RWxlbWVudCA9IHRoaXMuX2dldFJvb3RFbGVtZW50KGVsZW1lbnQpO1xuICAgICAgdmFyIGN1c3RvbUV2ZW50ID0gdGhpcy5fdHJpZ2dlckNsb3NlRXZlbnQocm9vdEVsZW1lbnQpO1xuXG4gICAgICBpZiAoY3VzdG9tRXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9yZW1vdmVFbGVtZW50KHJvb3RFbGVtZW50KTtcbiAgICB9O1xuXG4gICAgQWxlcnQucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgJC5yZW1vdmVEYXRhKHRoaXMuX2VsZW1lbnQsIERBVEFfS0VZKTtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgIH07XG5cbiAgICAvLyBwcml2YXRlXG5cbiAgICBBbGVydC5wcm90b3R5cGUuX2dldFJvb3RFbGVtZW50ID0gZnVuY3Rpb24gX2dldFJvb3RFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudChlbGVtZW50KTtcbiAgICAgIHZhciBwYXJlbnQgPSBmYWxzZTtcblxuICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgIHBhcmVudCA9ICQoc2VsZWN0b3IpWzBdO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXBhcmVudCkge1xuICAgICAgICBwYXJlbnQgPSAkKGVsZW1lbnQpLmNsb3Nlc3QoJy4nICsgQ2xhc3NOYW1lLkFMRVJUKVswXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHBhcmVudDtcbiAgICB9O1xuXG4gICAgQWxlcnQucHJvdG90eXBlLl90cmlnZ2VyQ2xvc2VFdmVudCA9IGZ1bmN0aW9uIF90cmlnZ2VyQ2xvc2VFdmVudChlbGVtZW50KSB7XG4gICAgICB2YXIgY2xvc2VFdmVudCA9ICQuRXZlbnQoRXZlbnQuQ0xPU0UpO1xuXG4gICAgICAkKGVsZW1lbnQpLnRyaWdnZXIoY2xvc2VFdmVudCk7XG4gICAgICByZXR1cm4gY2xvc2VFdmVudDtcbiAgICB9O1xuXG4gICAgQWxlcnQucHJvdG90eXBlLl9yZW1vdmVFbGVtZW50ID0gZnVuY3Rpb24gX3JlbW92ZUVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgICQoZWxlbWVudCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpO1xuXG4gICAgICBpZiAoIVV0aWwuc3VwcG9ydHNUcmFuc2l0aW9uRW5kKCkgfHwgISQoZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkZBREUpKSB7XG4gICAgICAgIHRoaXMuX2Rlc3Ryb3lFbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgICQoZWxlbWVudCkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICByZXR1cm4gX3RoaXMyLl9kZXN0cm95RWxlbWVudChlbGVtZW50LCBldmVudCk7XG4gICAgICB9KS5lbXVsYXRlVHJhbnNpdGlvbkVuZChUUkFOU0lUSU9OX0RVUkFUSU9OKTtcbiAgICB9O1xuXG4gICAgQWxlcnQucHJvdG90eXBlLl9kZXN0cm95RWxlbWVudCA9IGZ1bmN0aW9uIF9kZXN0cm95RWxlbWVudChlbGVtZW50KSB7XG4gICAgICAkKGVsZW1lbnQpLmRldGFjaCgpLnRyaWdnZXIoRXZlbnQuQ0xPU0VEKS5yZW1vdmUoKTtcbiAgICB9O1xuXG4gICAgLy8gc3RhdGljXG5cbiAgICBBbGVydC5falF1ZXJ5SW50ZXJmYWNlID0gZnVuY3Rpb24gX2pRdWVyeUludGVyZmFjZShjb25maWcpIHtcbiAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgJGVsZW1lbnQgPSAkKHRoaXMpO1xuICAgICAgICB2YXIgZGF0YSA9ICRlbGVtZW50LmRhdGEoREFUQV9LRVkpO1xuXG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIGRhdGEgPSBuZXcgQWxlcnQodGhpcyk7XG4gICAgICAgICAgJGVsZW1lbnQuZGF0YShEQVRBX0tFWSwgZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnID09PSAnY2xvc2UnKSB7XG4gICAgICAgICAgZGF0YVtjb25maWddKHRoaXMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgQWxlcnQuX2hhbmRsZURpc21pc3MgPSBmdW5jdGlvbiBfaGFuZGxlRGlzbWlzcyhhbGVydEluc3RhbmNlKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIGlmIChldmVudCkge1xuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBhbGVydEluc3RhbmNlLmNsb3NlKHRoaXMpO1xuICAgICAgfTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKEFsZXJ0LCBudWxsLCBbe1xuICAgICAga2V5OiAnVkVSU0lPTicsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIFZFUlNJT047XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIEFsZXJ0O1xuICB9KCk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgJChkb2N1bWVudCkub24oRXZlbnQuQ0xJQ0tfREFUQV9BUEksIFNlbGVjdG9yLkRJU01JU1MsIEFsZXJ0Ll9oYW5kbGVEaXNtaXNzKG5ldyBBbGVydCgpKSk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBqUXVlcnlcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gICQuZm5bTkFNRV0gPSBBbGVydC5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUVdLkNvbnN0cnVjdG9yID0gQWxlcnQ7XG4gICQuZm5bTkFNRV0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUVdID0gSlFVRVJZX05PX0NPTkZMSUNUO1xuICAgIHJldHVybiBBbGVydC5falF1ZXJ5SW50ZXJmYWNlO1xuICB9O1xuXG4gIHJldHVybiBBbGVydDtcbn0oalF1ZXJ5KTtcblxuLyoqXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogQm9vdHN0cmFwICh2NC4wLjAtYWxwaGEuNik6IGJ1dHRvbi5qc1xuICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vdHdicy9ib290c3RyYXAvYmxvYi9tYXN0ZXIvTElDRU5TRSlcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKi9cblxudmFyIEJ1dHRvbiA9IGZ1bmN0aW9uICgkKSB7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FID0gJ2J1dHRvbic7XG4gIHZhciBWRVJTSU9OID0gJzQuMC4wLWFscGhhLjYnO1xuICB2YXIgREFUQV9LRVkgPSAnYnMuYnV0dG9uJztcbiAgdmFyIEVWRU5UX0tFWSA9ICcuJyArIERBVEFfS0VZO1xuICB2YXIgREFUQV9BUElfS0VZID0gJy5kYXRhLWFwaSc7XG4gIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QgPSAkLmZuW05BTUVdO1xuXG4gIHZhciBDbGFzc05hbWUgPSB7XG4gICAgQUNUSVZFOiAnYWN0aXZlJyxcbiAgICBCVVRUT046ICdidG4nLFxuICAgIEZPQ1VTOiAnZm9jdXMnXG4gIH07XG5cbiAgdmFyIFNlbGVjdG9yID0ge1xuICAgIERBVEFfVE9HR0xFX0NBUlJPVDogJ1tkYXRhLXRvZ2dsZV49XCJidXR0b25cIl0nLFxuICAgIERBVEFfVE9HR0xFOiAnW2RhdGEtdG9nZ2xlPVwiYnV0dG9uc1wiXScsXG4gICAgSU5QVVQ6ICdpbnB1dCcsXG4gICAgQUNUSVZFOiAnLmFjdGl2ZScsXG4gICAgQlVUVE9OOiAnLmJ0bidcbiAgfTtcblxuICB2YXIgRXZlbnQgPSB7XG4gICAgQ0xJQ0tfREFUQV9BUEk6ICdjbGljaycgKyBFVkVOVF9LRVkgKyBEQVRBX0FQSV9LRVksXG4gICAgRk9DVVNfQkxVUl9EQVRBX0FQSTogJ2ZvY3VzJyArIEVWRU5UX0tFWSArIERBVEFfQVBJX0tFWSArICcgJyArICgnYmx1cicgKyBFVkVOVF9LRVkgKyBEQVRBX0FQSV9LRVkpXG4gIH07XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDbGFzcyBEZWZpbml0aW9uXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgQnV0dG9uID0gZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEJ1dHRvbihlbGVtZW50KSB7XG4gICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgQnV0dG9uKTtcblxuICAgICAgdGhpcy5fZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgfVxuXG4gICAgLy8gZ2V0dGVyc1xuXG4gICAgLy8gcHVibGljXG5cbiAgICBCdXR0b24ucHJvdG90eXBlLnRvZ2dsZSA9IGZ1bmN0aW9uIHRvZ2dsZSgpIHtcbiAgICAgIHZhciB0cmlnZ2VyQ2hhbmdlRXZlbnQgPSB0cnVlO1xuICAgICAgdmFyIHJvb3RFbGVtZW50ID0gJCh0aGlzLl9lbGVtZW50KS5jbG9zZXN0KFNlbGVjdG9yLkRBVEFfVE9HR0xFKVswXTtcblxuICAgICAgaWYgKHJvb3RFbGVtZW50KSB7XG4gICAgICAgIHZhciBpbnB1dCA9ICQodGhpcy5fZWxlbWVudCkuZmluZChTZWxlY3Rvci5JTlBVVClbMF07XG5cbiAgICAgICAgaWYgKGlucHV0KSB7XG4gICAgICAgICAgaWYgKGlucHV0LnR5cGUgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICAgIGlmIChpbnB1dC5jaGVja2VkICYmICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkFDVElWRSkpIHtcbiAgICAgICAgICAgICAgdHJpZ2dlckNoYW5nZUV2ZW50ID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB2YXIgYWN0aXZlRWxlbWVudCA9ICQocm9vdEVsZW1lbnQpLmZpbmQoU2VsZWN0b3IuQUNUSVZFKVswXTtcblxuICAgICAgICAgICAgICBpZiAoYWN0aXZlRWxlbWVudCkge1xuICAgICAgICAgICAgICAgICQoYWN0aXZlRWxlbWVudCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLkFDVElWRSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodHJpZ2dlckNoYW5nZUV2ZW50KSB7XG4gICAgICAgICAgICBpbnB1dC5jaGVja2VkID0gISQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkFDVElWRSk7XG4gICAgICAgICAgICAkKGlucHV0KS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpbnB1dC5mb2N1cygpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQuc2V0QXR0cmlidXRlKCdhcmlhLXByZXNzZWQnLCAhJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUuQUNUSVZFKSk7XG5cbiAgICAgIGlmICh0cmlnZ2VyQ2hhbmdlRXZlbnQpIHtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS50b2dnbGVDbGFzcyhDbGFzc05hbWUuQUNUSVZFKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgQnV0dG9uLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24gZGlzcG9zZSgpIHtcbiAgICAgICQucmVtb3ZlRGF0YSh0aGlzLl9lbGVtZW50LCBEQVRBX0tFWSk7XG4gICAgICB0aGlzLl9lbGVtZW50ID0gbnVsbDtcbiAgICB9O1xuXG4gICAgLy8gc3RhdGljXG5cbiAgICBCdXR0b24uX2pRdWVyeUludGVyZmFjZSA9IGZ1bmN0aW9uIF9qUXVlcnlJbnRlcmZhY2UoY29uZmlnKSB7XG4gICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSAkKHRoaXMpLmRhdGEoREFUQV9LRVkpO1xuXG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIGRhdGEgPSBuZXcgQnV0dG9uKHRoaXMpO1xuICAgICAgICAgICQodGhpcykuZGF0YShEQVRBX0tFWSwgZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnID09PSAndG9nZ2xlJykge1xuICAgICAgICAgIGRhdGFbY29uZmlnXSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKEJ1dHRvbiwgbnVsbCwgW3tcbiAgICAgIGtleTogJ1ZFUlNJT04nLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBWRVJTSU9OO1xuICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBCdXR0b247XG4gIH0oKTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIERhdGEgQXBpIGltcGxlbWVudGF0aW9uXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAkKGRvY3VtZW50KS5vbihFdmVudC5DTElDS19EQVRBX0FQSSwgU2VsZWN0b3IuREFUQV9UT0dHTEVfQ0FSUk9ULCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgdmFyIGJ1dHRvbiA9IGV2ZW50LnRhcmdldDtcblxuICAgIGlmICghJChidXR0b24pLmhhc0NsYXNzKENsYXNzTmFtZS5CVVRUT04pKSB7XG4gICAgICBidXR0b24gPSAkKGJ1dHRvbikuY2xvc2VzdChTZWxlY3Rvci5CVVRUT04pO1xuICAgIH1cblxuICAgIEJ1dHRvbi5falF1ZXJ5SW50ZXJmYWNlLmNhbGwoJChidXR0b24pLCAndG9nZ2xlJyk7XG4gIH0pLm9uKEV2ZW50LkZPQ1VTX0JMVVJfREFUQV9BUEksIFNlbGVjdG9yLkRBVEFfVE9HR0xFX0NBUlJPVCwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdmFyIGJ1dHRvbiA9ICQoZXZlbnQudGFyZ2V0KS5jbG9zZXN0KFNlbGVjdG9yLkJVVFRPTilbMF07XG4gICAgJChidXR0b24pLnRvZ2dsZUNsYXNzKENsYXNzTmFtZS5GT0NVUywgL15mb2N1cyhpbik/JC8udGVzdChldmVudC50eXBlKSk7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogalF1ZXJ5XG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAkLmZuW05BTUVdID0gQnV0dG9uLl9qUXVlcnlJbnRlcmZhY2U7XG4gICQuZm5bTkFNRV0uQ29uc3RydWN0b3IgPSBCdXR0b247XG4gICQuZm5bTkFNRV0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUVdID0gSlFVRVJZX05PX0NPTkZMSUNUO1xuICAgIHJldHVybiBCdXR0b24uX2pRdWVyeUludGVyZmFjZTtcbiAgfTtcblxuICByZXR1cm4gQnV0dG9uO1xufShqUXVlcnkpO1xuXG4vKipcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBCb290c3RyYXAgKHY0LjAuMC1hbHBoYS42KTogY2Fyb3VzZWwuanNcbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL3R3YnMvYm9vdHN0cmFwL2Jsb2IvbWFzdGVyL0xJQ0VOU0UpXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICovXG5cbnZhciBDYXJvdXNlbCA9IGZ1bmN0aW9uICgkKSB7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FID0gJ2Nhcm91c2VsJztcbiAgdmFyIFZFUlNJT04gPSAnNC4wLjAtYWxwaGEuNic7XG4gIHZhciBEQVRBX0tFWSA9ICdicy5jYXJvdXNlbCc7XG4gIHZhciBFVkVOVF9LRVkgPSAnLicgKyBEQVRBX0tFWTtcbiAgdmFyIERBVEFfQVBJX0tFWSA9ICcuZGF0YS1hcGknO1xuICB2YXIgSlFVRVJZX05PX0NPTkZMSUNUID0gJC5mbltOQU1FXTtcbiAgdmFyIFRSQU5TSVRJT05fRFVSQVRJT04gPSA2MDA7XG4gIHZhciBBUlJPV19MRUZUX0tFWUNPREUgPSAzNzsgLy8gS2V5Ym9hcmRFdmVudC53aGljaCB2YWx1ZSBmb3IgbGVmdCBhcnJvdyBrZXlcbiAgdmFyIEFSUk9XX1JJR0hUX0tFWUNPREUgPSAzOTsgLy8gS2V5Ym9hcmRFdmVudC53aGljaCB2YWx1ZSBmb3IgcmlnaHQgYXJyb3cga2V5XG5cbiAgdmFyIERlZmF1bHQgPSB7XG4gICAgaW50ZXJ2YWw6IDUwMDAsXG4gICAga2V5Ym9hcmQ6IHRydWUsXG4gICAgc2xpZGU6IGZhbHNlLFxuICAgIHBhdXNlOiAnaG92ZXInLFxuICAgIHdyYXA6IHRydWVcbiAgfTtcblxuICB2YXIgRGVmYXVsdFR5cGUgPSB7XG4gICAgaW50ZXJ2YWw6ICcobnVtYmVyfGJvb2xlYW4pJyxcbiAgICBrZXlib2FyZDogJ2Jvb2xlYW4nLFxuICAgIHNsaWRlOiAnKGJvb2xlYW58c3RyaW5nKScsXG4gICAgcGF1c2U6ICcoc3RyaW5nfGJvb2xlYW4pJyxcbiAgICB3cmFwOiAnYm9vbGVhbidcbiAgfTtcblxuICB2YXIgRGlyZWN0aW9uID0ge1xuICAgIE5FWFQ6ICduZXh0JyxcbiAgICBQUkVWOiAncHJldicsXG4gICAgTEVGVDogJ2xlZnQnLFxuICAgIFJJR0hUOiAncmlnaHQnXG4gIH07XG5cbiAgdmFyIEV2ZW50ID0ge1xuICAgIFNMSURFOiAnc2xpZGUnICsgRVZFTlRfS0VZLFxuICAgIFNMSUQ6ICdzbGlkJyArIEVWRU5UX0tFWSxcbiAgICBLRVlET1dOOiAna2V5ZG93bicgKyBFVkVOVF9LRVksXG4gICAgTU9VU0VFTlRFUjogJ21vdXNlZW50ZXInICsgRVZFTlRfS0VZLFxuICAgIE1PVVNFTEVBVkU6ICdtb3VzZWxlYXZlJyArIEVWRU5UX0tFWSxcbiAgICBMT0FEX0RBVEFfQVBJOiAnbG9hZCcgKyBFVkVOVF9LRVkgKyBEQVRBX0FQSV9LRVksXG4gICAgQ0xJQ0tfREFUQV9BUEk6ICdjbGljaycgKyBFVkVOVF9LRVkgKyBEQVRBX0FQSV9LRVlcbiAgfTtcblxuICB2YXIgQ2xhc3NOYW1lID0ge1xuICAgIENBUk9VU0VMOiAnY2Fyb3VzZWwnLFxuICAgIEFDVElWRTogJ2FjdGl2ZScsXG4gICAgU0xJREU6ICdzbGlkZScsXG4gICAgUklHSFQ6ICdjYXJvdXNlbC1pdGVtLXJpZ2h0JyxcbiAgICBMRUZUOiAnY2Fyb3VzZWwtaXRlbS1sZWZ0JyxcbiAgICBORVhUOiAnY2Fyb3VzZWwtaXRlbS1uZXh0JyxcbiAgICBQUkVWOiAnY2Fyb3VzZWwtaXRlbS1wcmV2JyxcbiAgICBJVEVNOiAnY2Fyb3VzZWwtaXRlbSdcbiAgfTtcblxuICB2YXIgU2VsZWN0b3IgPSB7XG4gICAgQUNUSVZFOiAnLmFjdGl2ZScsXG4gICAgQUNUSVZFX0lURU06ICcuYWN0aXZlLmNhcm91c2VsLWl0ZW0nLFxuICAgIElURU06ICcuY2Fyb3VzZWwtaXRlbScsXG4gICAgTkVYVF9QUkVWOiAnLmNhcm91c2VsLWl0ZW0tbmV4dCwgLmNhcm91c2VsLWl0ZW0tcHJldicsXG4gICAgSU5ESUNBVE9SUzogJy5jYXJvdXNlbC1pbmRpY2F0b3JzJyxcbiAgICBEQVRBX1NMSURFOiAnW2RhdGEtc2xpZGVdLCBbZGF0YS1zbGlkZS10b10nLFxuICAgIERBVEFfUklERTogJ1tkYXRhLXJpZGU9XCJjYXJvdXNlbFwiXSdcbiAgfTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIENsYXNzIERlZmluaXRpb25cbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBDYXJvdXNlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDYXJvdXNlbChlbGVtZW50LCBjb25maWcpIHtcbiAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBDYXJvdXNlbCk7XG5cbiAgICAgIHRoaXMuX2l0ZW1zID0gbnVsbDtcbiAgICAgIHRoaXMuX2ludGVydmFsID0gbnVsbDtcbiAgICAgIHRoaXMuX2FjdGl2ZUVsZW1lbnQgPSBudWxsO1xuXG4gICAgICB0aGlzLl9pc1BhdXNlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5faXNTbGlkaW5nID0gZmFsc2U7XG5cbiAgICAgIHRoaXMuX2NvbmZpZyA9IHRoaXMuX2dldENvbmZpZyhjb25maWcpO1xuICAgICAgdGhpcy5fZWxlbWVudCA9ICQoZWxlbWVudClbMF07XG4gICAgICB0aGlzLl9pbmRpY2F0b3JzRWxlbWVudCA9ICQodGhpcy5fZWxlbWVudCkuZmluZChTZWxlY3Rvci5JTkRJQ0FUT1JTKVswXTtcblxuICAgICAgdGhpcy5fYWRkRXZlbnRMaXN0ZW5lcnMoKTtcbiAgICB9XG5cbiAgICAvLyBnZXR0ZXJzXG5cbiAgICAvLyBwdWJsaWNcblxuICAgIENhcm91c2VsLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgIGlmICh0aGlzLl9pc1NsaWRpbmcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYXJvdXNlbCBpcyBzbGlkaW5nJyk7XG4gICAgICB9XG4gICAgICB0aGlzLl9zbGlkZShEaXJlY3Rpb24uTkVYVCk7XG4gICAgfTtcblxuICAgIENhcm91c2VsLnByb3RvdHlwZS5uZXh0V2hlblZpc2libGUgPSBmdW5jdGlvbiBuZXh0V2hlblZpc2libGUoKSB7XG4gICAgICAvLyBEb24ndCBjYWxsIG5leHQgd2hlbiB0aGUgcGFnZSBpc24ndCB2aXNpYmxlXG4gICAgICBpZiAoIWRvY3VtZW50LmhpZGRlbikge1xuICAgICAgICB0aGlzLm5leHQoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgQ2Fyb3VzZWwucHJvdG90eXBlLnByZXYgPSBmdW5jdGlvbiBwcmV2KCkge1xuICAgICAgaWYgKHRoaXMuX2lzU2xpZGluZykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhcm91c2VsIGlzIHNsaWRpbmcnKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3NsaWRlKERpcmVjdGlvbi5QUkVWSU9VUyk7XG4gICAgfTtcblxuICAgIENhcm91c2VsLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uIHBhdXNlKGV2ZW50KSB7XG4gICAgICBpZiAoIWV2ZW50KSB7XG4gICAgICAgIHRoaXMuX2lzUGF1c2VkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKCQodGhpcy5fZWxlbWVudCkuZmluZChTZWxlY3Rvci5ORVhUX1BSRVYpWzBdICYmIFV0aWwuc3VwcG9ydHNUcmFuc2l0aW9uRW5kKCkpIHtcbiAgICAgICAgVXRpbC50cmlnZ2VyVHJhbnNpdGlvbkVuZCh0aGlzLl9lbGVtZW50KTtcbiAgICAgICAgdGhpcy5jeWNsZSh0cnVlKTtcbiAgICAgIH1cblxuICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLl9pbnRlcnZhbCk7XG4gICAgICB0aGlzLl9pbnRlcnZhbCA9IG51bGw7XG4gICAgfTtcblxuICAgIENhcm91c2VsLnByb3RvdHlwZS5jeWNsZSA9IGZ1bmN0aW9uIGN5Y2xlKGV2ZW50KSB7XG4gICAgICBpZiAoIWV2ZW50KSB7XG4gICAgICAgIHRoaXMuX2lzUGF1c2VkID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9pbnRlcnZhbCkge1xuICAgICAgICBjbGVhckludGVydmFsKHRoaXMuX2ludGVydmFsKTtcbiAgICAgICAgdGhpcy5faW50ZXJ2YWwgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fY29uZmlnLmludGVydmFsICYmICF0aGlzLl9pc1BhdXNlZCkge1xuICAgICAgICB0aGlzLl9pbnRlcnZhbCA9IHNldEludGVydmFsKChkb2N1bWVudC52aXNpYmlsaXR5U3RhdGUgPyB0aGlzLm5leHRXaGVuVmlzaWJsZSA6IHRoaXMubmV4dCkuYmluZCh0aGlzKSwgdGhpcy5fY29uZmlnLmludGVydmFsKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgQ2Fyb3VzZWwucHJvdG90eXBlLnRvID0gZnVuY3Rpb24gdG8oaW5kZXgpIHtcbiAgICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG4gICAgICB0aGlzLl9hY3RpdmVFbGVtZW50ID0gJCh0aGlzLl9lbGVtZW50KS5maW5kKFNlbGVjdG9yLkFDVElWRV9JVEVNKVswXTtcblxuICAgICAgdmFyIGFjdGl2ZUluZGV4ID0gdGhpcy5fZ2V0SXRlbUluZGV4KHRoaXMuX2FjdGl2ZUVsZW1lbnQpO1xuXG4gICAgICBpZiAoaW5kZXggPiB0aGlzLl9pdGVtcy5sZW5ndGggLSAxIHx8IGluZGV4IDwgMCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9pc1NsaWRpbmcpIHtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbmUoRXZlbnQuU0xJRCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiBfdGhpczMudG8oaW5kZXgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoYWN0aXZlSW5kZXggPT09IGluZGV4KSB7XG4gICAgICAgIHRoaXMucGF1c2UoKTtcbiAgICAgICAgdGhpcy5jeWNsZSgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBkaXJlY3Rpb24gPSBpbmRleCA+IGFjdGl2ZUluZGV4ID8gRGlyZWN0aW9uLk5FWFQgOiBEaXJlY3Rpb24uUFJFVklPVVM7XG5cbiAgICAgIHRoaXMuX3NsaWRlKGRpcmVjdGlvbiwgdGhpcy5faXRlbXNbaW5kZXhdKTtcbiAgICB9O1xuXG4gICAgQ2Fyb3VzZWwucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS5vZmYoRVZFTlRfS0VZKTtcbiAgICAgICQucmVtb3ZlRGF0YSh0aGlzLl9lbGVtZW50LCBEQVRBX0tFWSk7XG5cbiAgICAgIHRoaXMuX2l0ZW1zID0gbnVsbDtcbiAgICAgIHRoaXMuX2NvbmZpZyA9IG51bGw7XG4gICAgICB0aGlzLl9lbGVtZW50ID0gbnVsbDtcbiAgICAgIHRoaXMuX2ludGVydmFsID0gbnVsbDtcbiAgICAgIHRoaXMuX2lzUGF1c2VkID0gbnVsbDtcbiAgICAgIHRoaXMuX2lzU2xpZGluZyA9IG51bGw7XG4gICAgICB0aGlzLl9hY3RpdmVFbGVtZW50ID0gbnVsbDtcbiAgICAgIHRoaXMuX2luZGljYXRvcnNFbGVtZW50ID0gbnVsbDtcbiAgICB9O1xuXG4gICAgLy8gcHJpdmF0ZVxuXG4gICAgQ2Fyb3VzZWwucHJvdG90eXBlLl9nZXRDb25maWcgPSBmdW5jdGlvbiBfZ2V0Q29uZmlnKGNvbmZpZykge1xuICAgICAgY29uZmlnID0gJC5leHRlbmQoe30sIERlZmF1bHQsIGNvbmZpZyk7XG4gICAgICBVdGlsLnR5cGVDaGVja0NvbmZpZyhOQU1FLCBjb25maWcsIERlZmF1bHRUeXBlKTtcbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfTtcblxuICAgIENhcm91c2VsLnByb3RvdHlwZS5fYWRkRXZlbnRMaXN0ZW5lcnMgPSBmdW5jdGlvbiBfYWRkRXZlbnRMaXN0ZW5lcnMoKSB7XG4gICAgICB2YXIgX3RoaXM0ID0gdGhpcztcblxuICAgICAgaWYgKHRoaXMuX2NvbmZpZy5rZXlib2FyZCkge1xuICAgICAgICAkKHRoaXMuX2VsZW1lbnQpLm9uKEV2ZW50LktFWURPV04sIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIHJldHVybiBfdGhpczQuX2tleWRvd24oZXZlbnQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2NvbmZpZy5wYXVzZSA9PT0gJ2hvdmVyJyAmJiAhKCdvbnRvdWNoc3RhcnQnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkpIHtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbihFdmVudC5NT1VTRUVOVEVSLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICByZXR1cm4gX3RoaXM0LnBhdXNlKGV2ZW50KTtcbiAgICAgICAgfSkub24oRXZlbnQuTU9VU0VMRUFWRSwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzNC5jeWNsZShldmVudCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBDYXJvdXNlbC5wcm90b3R5cGUuX2tleWRvd24gPSBmdW5jdGlvbiBfa2V5ZG93bihldmVudCkge1xuICAgICAgaWYgKC9pbnB1dHx0ZXh0YXJlYS9pLnRlc3QoZXZlbnQudGFyZ2V0LnRhZ05hbWUpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgc3dpdGNoIChldmVudC53aGljaCkge1xuICAgICAgICBjYXNlIEFSUk9XX0xFRlRfS0VZQ09ERTpcbiAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIHRoaXMucHJldigpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEFSUk9XX1JJR0hUX0tFWUNPREU6XG4gICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB0aGlzLm5leHQoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfTtcblxuICAgIENhcm91c2VsLnByb3RvdHlwZS5fZ2V0SXRlbUluZGV4ID0gZnVuY3Rpb24gX2dldEl0ZW1JbmRleChlbGVtZW50KSB7XG4gICAgICB0aGlzLl9pdGVtcyA9ICQubWFrZUFycmF5KCQoZWxlbWVudCkucGFyZW50KCkuZmluZChTZWxlY3Rvci5JVEVNKSk7XG4gICAgICByZXR1cm4gdGhpcy5faXRlbXMuaW5kZXhPZihlbGVtZW50KTtcbiAgICB9O1xuXG4gICAgQ2Fyb3VzZWwucHJvdG90eXBlLl9nZXRJdGVtQnlEaXJlY3Rpb24gPSBmdW5jdGlvbiBfZ2V0SXRlbUJ5RGlyZWN0aW9uKGRpcmVjdGlvbiwgYWN0aXZlRWxlbWVudCkge1xuICAgICAgdmFyIGlzTmV4dERpcmVjdGlvbiA9IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLk5FWFQ7XG4gICAgICB2YXIgaXNQcmV2RGlyZWN0aW9uID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUFJFVklPVVM7XG4gICAgICB2YXIgYWN0aXZlSW5kZXggPSB0aGlzLl9nZXRJdGVtSW5kZXgoYWN0aXZlRWxlbWVudCk7XG4gICAgICB2YXIgbGFzdEl0ZW1JbmRleCA9IHRoaXMuX2l0ZW1zLmxlbmd0aCAtIDE7XG4gICAgICB2YXIgaXNHb2luZ1RvV3JhcCA9IGlzUHJldkRpcmVjdGlvbiAmJiBhY3RpdmVJbmRleCA9PT0gMCB8fCBpc05leHREaXJlY3Rpb24gJiYgYWN0aXZlSW5kZXggPT09IGxhc3RJdGVtSW5kZXg7XG5cbiAgICAgIGlmIChpc0dvaW5nVG9XcmFwICYmICF0aGlzLl9jb25maWcud3JhcCkge1xuICAgICAgICByZXR1cm4gYWN0aXZlRWxlbWVudDtcbiAgICAgIH1cblxuICAgICAgdmFyIGRlbHRhID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUFJFVklPVVMgPyAtMSA6IDE7XG4gICAgICB2YXIgaXRlbUluZGV4ID0gKGFjdGl2ZUluZGV4ICsgZGVsdGEpICUgdGhpcy5faXRlbXMubGVuZ3RoO1xuXG4gICAgICByZXR1cm4gaXRlbUluZGV4ID09PSAtMSA/IHRoaXMuX2l0ZW1zW3RoaXMuX2l0ZW1zLmxlbmd0aCAtIDFdIDogdGhpcy5faXRlbXNbaXRlbUluZGV4XTtcbiAgICB9O1xuXG4gICAgQ2Fyb3VzZWwucHJvdG90eXBlLl90cmlnZ2VyU2xpZGVFdmVudCA9IGZ1bmN0aW9uIF90cmlnZ2VyU2xpZGVFdmVudChyZWxhdGVkVGFyZ2V0LCBldmVudERpcmVjdGlvbk5hbWUpIHtcbiAgICAgIHZhciBzbGlkZUV2ZW50ID0gJC5FdmVudChFdmVudC5TTElERSwge1xuICAgICAgICByZWxhdGVkVGFyZ2V0OiByZWxhdGVkVGFyZ2V0LFxuICAgICAgICBkaXJlY3Rpb246IGV2ZW50RGlyZWN0aW9uTmFtZVxuICAgICAgfSk7XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkudHJpZ2dlcihzbGlkZUV2ZW50KTtcblxuICAgICAgcmV0dXJuIHNsaWRlRXZlbnQ7XG4gICAgfTtcblxuICAgIENhcm91c2VsLnByb3RvdHlwZS5fc2V0QWN0aXZlSW5kaWNhdG9yRWxlbWVudCA9IGZ1bmN0aW9uIF9zZXRBY3RpdmVJbmRpY2F0b3JFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgIGlmICh0aGlzLl9pbmRpY2F0b3JzRWxlbWVudCkge1xuICAgICAgICAkKHRoaXMuX2luZGljYXRvcnNFbGVtZW50KS5maW5kKFNlbGVjdG9yLkFDVElWRSkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLkFDVElWRSk7XG5cbiAgICAgICAgdmFyIG5leHRJbmRpY2F0b3IgPSB0aGlzLl9pbmRpY2F0b3JzRWxlbWVudC5jaGlsZHJlblt0aGlzLl9nZXRJdGVtSW5kZXgoZWxlbWVudCldO1xuXG4gICAgICAgIGlmIChuZXh0SW5kaWNhdG9yKSB7XG4gICAgICAgICAgJChuZXh0SW5kaWNhdG9yKS5hZGRDbGFzcyhDbGFzc05hbWUuQUNUSVZFKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBDYXJvdXNlbC5wcm90b3R5cGUuX3NsaWRlID0gZnVuY3Rpb24gX3NsaWRlKGRpcmVjdGlvbiwgZWxlbWVudCkge1xuICAgICAgdmFyIF90aGlzNSA9IHRoaXM7XG5cbiAgICAgIHZhciBhY3RpdmVFbGVtZW50ID0gJCh0aGlzLl9lbGVtZW50KS5maW5kKFNlbGVjdG9yLkFDVElWRV9JVEVNKVswXTtcbiAgICAgIHZhciBuZXh0RWxlbWVudCA9IGVsZW1lbnQgfHwgYWN0aXZlRWxlbWVudCAmJiB0aGlzLl9nZXRJdGVtQnlEaXJlY3Rpb24oZGlyZWN0aW9uLCBhY3RpdmVFbGVtZW50KTtcblxuICAgICAgdmFyIGlzQ3ljbGluZyA9IEJvb2xlYW4odGhpcy5faW50ZXJ2YWwpO1xuXG4gICAgICB2YXIgZGlyZWN0aW9uYWxDbGFzc05hbWUgPSB2b2lkIDA7XG4gICAgICB2YXIgb3JkZXJDbGFzc05hbWUgPSB2b2lkIDA7XG4gICAgICB2YXIgZXZlbnREaXJlY3Rpb25OYW1lID0gdm9pZCAwO1xuXG4gICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTkVYVCkge1xuICAgICAgICBkaXJlY3Rpb25hbENsYXNzTmFtZSA9IENsYXNzTmFtZS5MRUZUO1xuICAgICAgICBvcmRlckNsYXNzTmFtZSA9IENsYXNzTmFtZS5ORVhUO1xuICAgICAgICBldmVudERpcmVjdGlvbk5hbWUgPSBEaXJlY3Rpb24uTEVGVDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRpcmVjdGlvbmFsQ2xhc3NOYW1lID0gQ2xhc3NOYW1lLlJJR0hUO1xuICAgICAgICBvcmRlckNsYXNzTmFtZSA9IENsYXNzTmFtZS5QUkVWO1xuICAgICAgICBldmVudERpcmVjdGlvbk5hbWUgPSBEaXJlY3Rpb24uUklHSFQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChuZXh0RWxlbWVudCAmJiAkKG5leHRFbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUuQUNUSVZFKSkge1xuICAgICAgICB0aGlzLl9pc1NsaWRpbmcgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgc2xpZGVFdmVudCA9IHRoaXMuX3RyaWdnZXJTbGlkZUV2ZW50KG5leHRFbGVtZW50LCBldmVudERpcmVjdGlvbk5hbWUpO1xuICAgICAgaWYgKHNsaWRlRXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWFjdGl2ZUVsZW1lbnQgfHwgIW5leHRFbGVtZW50KSB7XG4gICAgICAgIC8vIHNvbWUgd2VpcmRuZXNzIGlzIGhhcHBlbmluZywgc28gd2UgYmFpbFxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2lzU2xpZGluZyA9IHRydWU7XG5cbiAgICAgIGlmIChpc0N5Y2xpbmcpIHtcbiAgICAgICAgdGhpcy5wYXVzZSgpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9zZXRBY3RpdmVJbmRpY2F0b3JFbGVtZW50KG5leHRFbGVtZW50KTtcblxuICAgICAgdmFyIHNsaWRFdmVudCA9ICQuRXZlbnQoRXZlbnQuU0xJRCwge1xuICAgICAgICByZWxhdGVkVGFyZ2V0OiBuZXh0RWxlbWVudCxcbiAgICAgICAgZGlyZWN0aW9uOiBldmVudERpcmVjdGlvbk5hbWVcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoVXRpbC5zdXBwb3J0c1RyYW5zaXRpb25FbmQoKSAmJiAkKHRoaXMuX2VsZW1lbnQpLmhhc0NsYXNzKENsYXNzTmFtZS5TTElERSkpIHtcblxuICAgICAgICAkKG5leHRFbGVtZW50KS5hZGRDbGFzcyhvcmRlckNsYXNzTmFtZSk7XG5cbiAgICAgICAgVXRpbC5yZWZsb3cobmV4dEVsZW1lbnQpO1xuXG4gICAgICAgICQoYWN0aXZlRWxlbWVudCkuYWRkQ2xhc3MoZGlyZWN0aW9uYWxDbGFzc05hbWUpO1xuICAgICAgICAkKG5leHRFbGVtZW50KS5hZGRDbGFzcyhkaXJlY3Rpb25hbENsYXNzTmFtZSk7XG5cbiAgICAgICAgJChhY3RpdmVFbGVtZW50KS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICQobmV4dEVsZW1lbnQpLnJlbW92ZUNsYXNzKGRpcmVjdGlvbmFsQ2xhc3NOYW1lICsgJyAnICsgb3JkZXJDbGFzc05hbWUpLmFkZENsYXNzKENsYXNzTmFtZS5BQ1RJVkUpO1xuXG4gICAgICAgICAgJChhY3RpdmVFbGVtZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuQUNUSVZFICsgJyAnICsgb3JkZXJDbGFzc05hbWUgKyAnICcgKyBkaXJlY3Rpb25hbENsYXNzTmFtZSk7XG5cbiAgICAgICAgICBfdGhpczUuX2lzU2xpZGluZyA9IGZhbHNlO1xuXG4gICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJChfdGhpczUuX2VsZW1lbnQpLnRyaWdnZXIoc2xpZEV2ZW50KTtcbiAgICAgICAgICB9LCAwKTtcbiAgICAgICAgfSkuZW11bGF0ZVRyYW5zaXRpb25FbmQoVFJBTlNJVElPTl9EVVJBVElPTik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkKGFjdGl2ZUVsZW1lbnQpLnJlbW92ZUNsYXNzKENsYXNzTmFtZS5BQ1RJVkUpO1xuICAgICAgICAkKG5leHRFbGVtZW50KS5hZGRDbGFzcyhDbGFzc05hbWUuQUNUSVZFKTtcblxuICAgICAgICB0aGlzLl9pc1NsaWRpbmcgPSBmYWxzZTtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS50cmlnZ2VyKHNsaWRFdmVudCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChpc0N5Y2xpbmcpIHtcbiAgICAgICAgdGhpcy5jeWNsZSgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBzdGF0aWNcblxuICAgIENhcm91c2VsLl9qUXVlcnlJbnRlcmZhY2UgPSBmdW5jdGlvbiBfalF1ZXJ5SW50ZXJmYWNlKGNvbmZpZykge1xuICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkYXRhID0gJCh0aGlzKS5kYXRhKERBVEFfS0VZKTtcbiAgICAgICAgdmFyIF9jb25maWcgPSAkLmV4dGVuZCh7fSwgRGVmYXVsdCwgJCh0aGlzKS5kYXRhKCkpO1xuXG4gICAgICAgIGlmICgodHlwZW9mIGNvbmZpZyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2YoY29uZmlnKSkgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgJC5leHRlbmQoX2NvbmZpZywgY29uZmlnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhY3Rpb24gPSB0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJyA/IGNvbmZpZyA6IF9jb25maWcuc2xpZGU7XG5cbiAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgZGF0YSA9IG5ldyBDYXJvdXNlbCh0aGlzLCBfY29uZmlnKTtcbiAgICAgICAgICAkKHRoaXMpLmRhdGEoREFUQV9LRVksIGRhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgZGF0YS50byhjb25maWcpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBhY3Rpb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgaWYgKGRhdGFbYWN0aW9uXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIG1ldGhvZCBuYW1lZCBcIicgKyBhY3Rpb24gKyAnXCInKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGF0YVthY3Rpb25dKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoX2NvbmZpZy5pbnRlcnZhbCkge1xuICAgICAgICAgIGRhdGEucGF1c2UoKTtcbiAgICAgICAgICBkYXRhLmN5Y2xlKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBDYXJvdXNlbC5fZGF0YUFwaUNsaWNrSGFuZGxlciA9IGZ1bmN0aW9uIF9kYXRhQXBpQ2xpY2tIYW5kbGVyKGV2ZW50KSB7XG4gICAgICB2YXIgc2VsZWN0b3IgPSBVdGlsLmdldFNlbGVjdG9yRnJvbUVsZW1lbnQodGhpcyk7XG5cbiAgICAgIGlmICghc2VsZWN0b3IpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgdGFyZ2V0ID0gJChzZWxlY3RvcilbMF07XG5cbiAgICAgIGlmICghdGFyZ2V0IHx8ICEkKHRhcmdldCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkNBUk9VU0VMKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBjb25maWcgPSAkLmV4dGVuZCh7fSwgJCh0YXJnZXQpLmRhdGEoKSwgJCh0aGlzKS5kYXRhKCkpO1xuICAgICAgdmFyIHNsaWRlSW5kZXggPSB0aGlzLmdldEF0dHJpYnV0ZSgnZGF0YS1zbGlkZS10bycpO1xuXG4gICAgICBpZiAoc2xpZGVJbmRleCkge1xuICAgICAgICBjb25maWcuaW50ZXJ2YWwgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgQ2Fyb3VzZWwuX2pRdWVyeUludGVyZmFjZS5jYWxsKCQodGFyZ2V0KSwgY29uZmlnKTtcblxuICAgICAgaWYgKHNsaWRlSW5kZXgpIHtcbiAgICAgICAgJCh0YXJnZXQpLmRhdGEoREFUQV9LRVkpLnRvKHNsaWRlSW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH07XG5cbiAgICBfY3JlYXRlQ2xhc3MoQ2Fyb3VzZWwsIG51bGwsIFt7XG4gICAgICBrZXk6ICdWRVJTSU9OJyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gVkVSU0lPTjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6ICdEZWZhdWx0JyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRGVmYXVsdDtcbiAgICAgIH1cbiAgICB9XSk7XG5cbiAgICByZXR1cm4gQ2Fyb3VzZWw7XG4gIH0oKTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIERhdGEgQXBpIGltcGxlbWVudGF0aW9uXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAkKGRvY3VtZW50KS5vbihFdmVudC5DTElDS19EQVRBX0FQSSwgU2VsZWN0b3IuREFUQV9TTElERSwgQ2Fyb3VzZWwuX2RhdGFBcGlDbGlja0hhbmRsZXIpO1xuXG4gICQod2luZG93KS5vbihFdmVudC5MT0FEX0RBVEFfQVBJLCBmdW5jdGlvbiAoKSB7XG4gICAgJChTZWxlY3Rvci5EQVRBX1JJREUpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICRjYXJvdXNlbCA9ICQodGhpcyk7XG4gICAgICBDYXJvdXNlbC5falF1ZXJ5SW50ZXJmYWNlLmNhbGwoJGNhcm91c2VsLCAkY2Fyb3VzZWwuZGF0YSgpKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBqUXVlcnlcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gICQuZm5bTkFNRV0gPSBDYXJvdXNlbC5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUVdLkNvbnN0cnVjdG9yID0gQ2Fyb3VzZWw7XG4gICQuZm5bTkFNRV0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUVdID0gSlFVRVJZX05PX0NPTkZMSUNUO1xuICAgIHJldHVybiBDYXJvdXNlbC5falF1ZXJ5SW50ZXJmYWNlO1xuICB9O1xuXG4gIHJldHVybiBDYXJvdXNlbDtcbn0oalF1ZXJ5KTtcblxuLyoqXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogQm9vdHN0cmFwICh2NC4wLjAtYWxwaGEuNik6IGNvbGxhcHNlLmpzXG4gKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS90d2JzL2Jvb3RzdHJhcC9ibG9iL21hc3Rlci9MSUNFTlNFKVxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqL1xuXG52YXIgQ29sbGFwc2UgPSBmdW5jdGlvbiAoJCkge1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ29uc3RhbnRzXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgTkFNRSA9ICdjb2xsYXBzZSc7XG4gIHZhciBWRVJTSU9OID0gJzQuMC4wLWFscGhhLjYnO1xuICB2YXIgREFUQV9LRVkgPSAnYnMuY29sbGFwc2UnO1xuICB2YXIgRVZFTlRfS0VZID0gJy4nICsgREFUQV9LRVk7XG4gIHZhciBEQVRBX0FQSV9LRVkgPSAnLmRhdGEtYXBpJztcbiAgdmFyIEpRVUVSWV9OT19DT05GTElDVCA9ICQuZm5bTkFNRV07XG4gIHZhciBUUkFOU0lUSU9OX0RVUkFUSU9OID0gNjAwO1xuXG4gIHZhciBEZWZhdWx0ID0ge1xuICAgIHRvZ2dsZTogdHJ1ZSxcbiAgICBwYXJlbnQ6ICcnXG4gIH07XG5cbiAgdmFyIERlZmF1bHRUeXBlID0ge1xuICAgIHRvZ2dsZTogJ2Jvb2xlYW4nLFxuICAgIHBhcmVudDogJ3N0cmluZydcbiAgfTtcblxuICB2YXIgRXZlbnQgPSB7XG4gICAgU0hPVzogJ3Nob3cnICsgRVZFTlRfS0VZLFxuICAgIFNIT1dOOiAnc2hvd24nICsgRVZFTlRfS0VZLFxuICAgIEhJREU6ICdoaWRlJyArIEVWRU5UX0tFWSxcbiAgICBISURERU46ICdoaWRkZW4nICsgRVZFTlRfS0VZLFxuICAgIENMSUNLX0RBVEFfQVBJOiAnY2xpY2snICsgRVZFTlRfS0VZICsgREFUQV9BUElfS0VZXG4gIH07XG5cbiAgdmFyIENsYXNzTmFtZSA9IHtcbiAgICBTSE9XOiAnc2hvdycsXG4gICAgQ09MTEFQU0U6ICdjb2xsYXBzZScsXG4gICAgQ09MTEFQU0lORzogJ2NvbGxhcHNpbmcnLFxuICAgIENPTExBUFNFRDogJ2NvbGxhcHNlZCdcbiAgfTtcblxuICB2YXIgRGltZW5zaW9uID0ge1xuICAgIFdJRFRIOiAnd2lkdGgnLFxuICAgIEhFSUdIVDogJ2hlaWdodCdcbiAgfTtcblxuICB2YXIgU2VsZWN0b3IgPSB7XG4gICAgQUNUSVZFUzogJy5jYXJkID4gLnNob3csIC5jYXJkID4gLmNvbGxhcHNpbmcnLFxuICAgIERBVEFfVE9HR0xFOiAnW2RhdGEtdG9nZ2xlPVwiY29sbGFwc2VcIl0nXG4gIH07XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDbGFzcyBEZWZpbml0aW9uXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgQ29sbGFwc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ29sbGFwc2UoZWxlbWVudCwgY29uZmlnKSB7XG4gICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgQ29sbGFwc2UpO1xuXG4gICAgICB0aGlzLl9pc1RyYW5zaXRpb25pbmcgPSBmYWxzZTtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBlbGVtZW50O1xuICAgICAgdGhpcy5fY29uZmlnID0gdGhpcy5fZ2V0Q29uZmlnKGNvbmZpZyk7XG4gICAgICB0aGlzLl90cmlnZ2VyQXJyYXkgPSAkLm1ha2VBcnJheSgkKCdbZGF0YS10b2dnbGU9XCJjb2xsYXBzZVwiXVtocmVmPVwiIycgKyBlbGVtZW50LmlkICsgJ1wiXSwnICsgKCdbZGF0YS10b2dnbGU9XCJjb2xsYXBzZVwiXVtkYXRhLXRhcmdldD1cIiMnICsgZWxlbWVudC5pZCArICdcIl0nKSkpO1xuXG4gICAgICB0aGlzLl9wYXJlbnQgPSB0aGlzLl9jb25maWcucGFyZW50ID8gdGhpcy5fZ2V0UGFyZW50KCkgOiBudWxsO1xuXG4gICAgICBpZiAoIXRoaXMuX2NvbmZpZy5wYXJlbnQpIHtcbiAgICAgICAgdGhpcy5fYWRkQXJpYUFuZENvbGxhcHNlZENsYXNzKHRoaXMuX2VsZW1lbnQsIHRoaXMuX3RyaWdnZXJBcnJheSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9jb25maWcudG9nZ2xlKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZ2V0dGVyc1xuXG4gICAgLy8gcHVibGljXG5cbiAgICBDb2xsYXBzZS5wcm90b3R5cGUudG9nZ2xlID0gZnVuY3Rpb24gdG9nZ2xlKCkge1xuICAgICAgaWYgKCQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpKSB7XG4gICAgICAgIHRoaXMuaGlkZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zaG93KCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIENvbGxhcHNlLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gc2hvdygpIHtcbiAgICAgIHZhciBfdGhpczYgPSB0aGlzO1xuXG4gICAgICBpZiAodGhpcy5faXNUcmFuc2l0aW9uaW5nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ29sbGFwc2UgaXMgdHJhbnNpdGlvbmluZycpO1xuICAgICAgfVxuXG4gICAgICBpZiAoJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUuU0hPVykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgYWN0aXZlcyA9IHZvaWQgMDtcbiAgICAgIHZhciBhY3RpdmVzRGF0YSA9IHZvaWQgMDtcblxuICAgICAgaWYgKHRoaXMuX3BhcmVudCkge1xuICAgICAgICBhY3RpdmVzID0gJC5tYWtlQXJyYXkoJCh0aGlzLl9wYXJlbnQpLmZpbmQoU2VsZWN0b3IuQUNUSVZFUykpO1xuICAgICAgICBpZiAoIWFjdGl2ZXMubGVuZ3RoKSB7XG4gICAgICAgICAgYWN0aXZlcyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGFjdGl2ZXMpIHtcbiAgICAgICAgYWN0aXZlc0RhdGEgPSAkKGFjdGl2ZXMpLmRhdGEoREFUQV9LRVkpO1xuICAgICAgICBpZiAoYWN0aXZlc0RhdGEgJiYgYWN0aXZlc0RhdGEuX2lzVHJhbnNpdGlvbmluZykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgc3RhcnRFdmVudCA9ICQuRXZlbnQoRXZlbnQuU0hPVyk7XG4gICAgICAkKHRoaXMuX2VsZW1lbnQpLnRyaWdnZXIoc3RhcnRFdmVudCk7XG4gICAgICBpZiAoc3RhcnRFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChhY3RpdmVzKSB7XG4gICAgICAgIENvbGxhcHNlLl9qUXVlcnlJbnRlcmZhY2UuY2FsbCgkKGFjdGl2ZXMpLCAnaGlkZScpO1xuICAgICAgICBpZiAoIWFjdGl2ZXNEYXRhKSB7XG4gICAgICAgICAgJChhY3RpdmVzKS5kYXRhKERBVEFfS0VZLCBudWxsKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgZGltZW5zaW9uID0gdGhpcy5fZ2V0RGltZW5zaW9uKCk7XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLkNPTExBUFNFKS5hZGRDbGFzcyhDbGFzc05hbWUuQ09MTEFQU0lORyk7XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGVbZGltZW5zaW9uXSA9IDA7XG4gICAgICB0aGlzLl9lbGVtZW50LnNldEF0dHJpYnV0ZSgnYXJpYS1leHBhbmRlZCcsIHRydWUpO1xuXG4gICAgICBpZiAodGhpcy5fdHJpZ2dlckFycmF5Lmxlbmd0aCkge1xuICAgICAgICAkKHRoaXMuX3RyaWdnZXJBcnJheSkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLkNPTExBUFNFRCkuYXR0cignYXJpYS1leHBhbmRlZCcsIHRydWUpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNldFRyYW5zaXRpb25pbmcodHJ1ZSk7XG5cbiAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICAkKF90aGlzNi5fZWxlbWVudCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLkNPTExBUFNJTkcpLmFkZENsYXNzKENsYXNzTmFtZS5DT0xMQVBTRSkuYWRkQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpO1xuXG4gICAgICAgIF90aGlzNi5fZWxlbWVudC5zdHlsZVtkaW1lbnNpb25dID0gJyc7XG5cbiAgICAgICAgX3RoaXM2LnNldFRyYW5zaXRpb25pbmcoZmFsc2UpO1xuXG4gICAgICAgICQoX3RoaXM2Ll9lbGVtZW50KS50cmlnZ2VyKEV2ZW50LlNIT1dOKTtcbiAgICAgIH07XG5cbiAgICAgIGlmICghVXRpbC5zdXBwb3J0c1RyYW5zaXRpb25FbmQoKSkge1xuICAgICAgICBjb21wbGV0ZSgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBjYXBpdGFsaXplZERpbWVuc2lvbiA9IGRpbWVuc2lvblswXS50b1VwcGVyQ2FzZSgpICsgZGltZW5zaW9uLnNsaWNlKDEpO1xuICAgICAgdmFyIHNjcm9sbFNpemUgPSAnc2Nyb2xsJyArIGNhcGl0YWxpemVkRGltZW5zaW9uO1xuXG4gICAgICAkKHRoaXMuX2VsZW1lbnQpLm9uZShVdGlsLlRSQU5TSVRJT05fRU5ELCBjb21wbGV0ZSkuZW11bGF0ZVRyYW5zaXRpb25FbmQoVFJBTlNJVElPTl9EVVJBVElPTik7XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGVbZGltZW5zaW9uXSA9IHRoaXMuX2VsZW1lbnRbc2Nyb2xsU2l6ZV0gKyAncHgnO1xuICAgIH07XG5cbiAgICBDb2xsYXBzZS5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uIGhpZGUoKSB7XG4gICAgICB2YXIgX3RoaXM3ID0gdGhpcztcblxuICAgICAgaWYgKHRoaXMuX2lzVHJhbnNpdGlvbmluZykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbGxhcHNlIGlzIHRyYW5zaXRpb25pbmcnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCEkKHRoaXMuX2VsZW1lbnQpLmhhc0NsYXNzKENsYXNzTmFtZS5TSE9XKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBzdGFydEV2ZW50ID0gJC5FdmVudChFdmVudC5ISURFKTtcbiAgICAgICQodGhpcy5fZWxlbWVudCkudHJpZ2dlcihzdGFydEV2ZW50KTtcbiAgICAgIGlmIChzdGFydEV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGRpbWVuc2lvbiA9IHRoaXMuX2dldERpbWVuc2lvbigpO1xuICAgICAgdmFyIG9mZnNldERpbWVuc2lvbiA9IGRpbWVuc2lvbiA9PT0gRGltZW5zaW9uLldJRFRIID8gJ29mZnNldFdpZHRoJyA6ICdvZmZzZXRIZWlnaHQnO1xuXG4gICAgICB0aGlzLl9lbGVtZW50LnN0eWxlW2RpbWVuc2lvbl0gPSB0aGlzLl9lbGVtZW50W29mZnNldERpbWVuc2lvbl0gKyAncHgnO1xuXG4gICAgICBVdGlsLnJlZmxvdyh0aGlzLl9lbGVtZW50KTtcblxuICAgICAgJCh0aGlzLl9lbGVtZW50KS5hZGRDbGFzcyhDbGFzc05hbWUuQ09MTEFQU0lORykucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLkNPTExBUFNFKS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuU0hPVyk7XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQuc2V0QXR0cmlidXRlKCdhcmlhLWV4cGFuZGVkJywgZmFsc2UpO1xuXG4gICAgICBpZiAodGhpcy5fdHJpZ2dlckFycmF5Lmxlbmd0aCkge1xuICAgICAgICAkKHRoaXMuX3RyaWdnZXJBcnJheSkuYWRkQ2xhc3MoQ2xhc3NOYW1lLkNPTExBUFNFRCkuYXR0cignYXJpYS1leHBhbmRlZCcsIGZhbHNlKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zZXRUcmFuc2l0aW9uaW5nKHRydWUpO1xuXG4gICAgICB2YXIgY29tcGxldGUgPSBmdW5jdGlvbiBjb21wbGV0ZSgpIHtcbiAgICAgICAgX3RoaXM3LnNldFRyYW5zaXRpb25pbmcoZmFsc2UpO1xuICAgICAgICAkKF90aGlzNy5fZWxlbWVudCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLkNPTExBUFNJTkcpLmFkZENsYXNzKENsYXNzTmFtZS5DT0xMQVBTRSkudHJpZ2dlcihFdmVudC5ISURERU4pO1xuICAgICAgfTtcblxuICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZVtkaW1lbnNpb25dID0gJyc7XG5cbiAgICAgIGlmICghVXRpbC5zdXBwb3J0c1RyYW5zaXRpb25FbmQoKSkge1xuICAgICAgICBjb21wbGV0ZSgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGNvbXBsZXRlKS5lbXVsYXRlVHJhbnNpdGlvbkVuZChUUkFOU0lUSU9OX0RVUkFUSU9OKTtcbiAgICB9O1xuXG4gICAgQ29sbGFwc2UucHJvdG90eXBlLnNldFRyYW5zaXRpb25pbmcgPSBmdW5jdGlvbiBzZXRUcmFuc2l0aW9uaW5nKGlzVHJhbnNpdGlvbmluZykge1xuICAgICAgdGhpcy5faXNUcmFuc2l0aW9uaW5nID0gaXNUcmFuc2l0aW9uaW5nO1xuICAgIH07XG5cbiAgICBDb2xsYXBzZS5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgICAkLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkpO1xuXG4gICAgICB0aGlzLl9jb25maWcgPSBudWxsO1xuICAgICAgdGhpcy5fcGFyZW50ID0gbnVsbDtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgICAgdGhpcy5fdHJpZ2dlckFycmF5ID0gbnVsbDtcbiAgICAgIHRoaXMuX2lzVHJhbnNpdGlvbmluZyA9IG51bGw7XG4gICAgfTtcblxuICAgIC8vIHByaXZhdGVcblxuICAgIENvbGxhcHNlLnByb3RvdHlwZS5fZ2V0Q29uZmlnID0gZnVuY3Rpb24gX2dldENvbmZpZyhjb25maWcpIHtcbiAgICAgIGNvbmZpZyA9ICQuZXh0ZW5kKHt9LCBEZWZhdWx0LCBjb25maWcpO1xuICAgICAgY29uZmlnLnRvZ2dsZSA9IEJvb2xlYW4oY29uZmlnLnRvZ2dsZSk7IC8vIGNvZXJjZSBzdHJpbmcgdmFsdWVzXG4gICAgICBVdGlsLnR5cGVDaGVja0NvbmZpZyhOQU1FLCBjb25maWcsIERlZmF1bHRUeXBlKTtcbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfTtcblxuICAgIENvbGxhcHNlLnByb3RvdHlwZS5fZ2V0RGltZW5zaW9uID0gZnVuY3Rpb24gX2dldERpbWVuc2lvbigpIHtcbiAgICAgIHZhciBoYXNXaWR0aCA9ICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoRGltZW5zaW9uLldJRFRIKTtcbiAgICAgIHJldHVybiBoYXNXaWR0aCA/IERpbWVuc2lvbi5XSURUSCA6IERpbWVuc2lvbi5IRUlHSFQ7XG4gICAgfTtcblxuICAgIENvbGxhcHNlLnByb3RvdHlwZS5fZ2V0UGFyZW50ID0gZnVuY3Rpb24gX2dldFBhcmVudCgpIHtcbiAgICAgIHZhciBfdGhpczggPSB0aGlzO1xuXG4gICAgICB2YXIgcGFyZW50ID0gJCh0aGlzLl9jb25maWcucGFyZW50KVswXTtcbiAgICAgIHZhciBzZWxlY3RvciA9ICdbZGF0YS10b2dnbGU9XCJjb2xsYXBzZVwiXVtkYXRhLXBhcmVudD1cIicgKyB0aGlzLl9jb25maWcucGFyZW50ICsgJ1wiXSc7XG5cbiAgICAgICQocGFyZW50KS5maW5kKHNlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uIChpLCBlbGVtZW50KSB7XG4gICAgICAgIF90aGlzOC5fYWRkQXJpYUFuZENvbGxhcHNlZENsYXNzKENvbGxhcHNlLl9nZXRUYXJnZXRGcm9tRWxlbWVudChlbGVtZW50KSwgW2VsZW1lbnRdKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gcGFyZW50O1xuICAgIH07XG5cbiAgICBDb2xsYXBzZS5wcm90b3R5cGUuX2FkZEFyaWFBbmRDb2xsYXBzZWRDbGFzcyA9IGZ1bmN0aW9uIF9hZGRBcmlhQW5kQ29sbGFwc2VkQ2xhc3MoZWxlbWVudCwgdHJpZ2dlckFycmF5KSB7XG4gICAgICBpZiAoZWxlbWVudCkge1xuICAgICAgICB2YXIgaXNPcGVuID0gJChlbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUuU0hPVyk7XG4gICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdhcmlhLWV4cGFuZGVkJywgaXNPcGVuKTtcblxuICAgICAgICBpZiAodHJpZ2dlckFycmF5Lmxlbmd0aCkge1xuICAgICAgICAgICQodHJpZ2dlckFycmF5KS50b2dnbGVDbGFzcyhDbGFzc05hbWUuQ09MTEFQU0VELCAhaXNPcGVuKS5hdHRyKCdhcmlhLWV4cGFuZGVkJywgaXNPcGVuKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBzdGF0aWNcblxuICAgIENvbGxhcHNlLl9nZXRUYXJnZXRGcm9tRWxlbWVudCA9IGZ1bmN0aW9uIF9nZXRUYXJnZXRGcm9tRWxlbWVudChlbGVtZW50KSB7XG4gICAgICB2YXIgc2VsZWN0b3IgPSBVdGlsLmdldFNlbGVjdG9yRnJvbUVsZW1lbnQoZWxlbWVudCk7XG4gICAgICByZXR1cm4gc2VsZWN0b3IgPyAkKHNlbGVjdG9yKVswXSA6IG51bGw7XG4gICAgfTtcblxuICAgIENvbGxhcHNlLl9qUXVlcnlJbnRlcmZhY2UgPSBmdW5jdGlvbiBfalF1ZXJ5SW50ZXJmYWNlKGNvbmZpZykge1xuICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciAkdGhpcyA9ICQodGhpcyk7XG4gICAgICAgIHZhciBkYXRhID0gJHRoaXMuZGF0YShEQVRBX0tFWSk7XG4gICAgICAgIHZhciBfY29uZmlnID0gJC5leHRlbmQoe30sIERlZmF1bHQsICR0aGlzLmRhdGEoKSwgKHR5cGVvZiBjb25maWcgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKGNvbmZpZykpID09PSAnb2JqZWN0JyAmJiBjb25maWcpO1xuXG4gICAgICAgIGlmICghZGF0YSAmJiBfY29uZmlnLnRvZ2dsZSAmJiAvc2hvd3xoaWRlLy50ZXN0KGNvbmZpZykpIHtcbiAgICAgICAgICBfY29uZmlnLnRvZ2dsZSA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgZGF0YSA9IG5ldyBDb2xsYXBzZSh0aGlzLCBfY29uZmlnKTtcbiAgICAgICAgICAkdGhpcy5kYXRhKERBVEFfS0VZLCBkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGlmIChkYXRhW2NvbmZpZ10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBtZXRob2QgbmFtZWQgXCInICsgY29uZmlnICsgJ1wiJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRhdGFbY29uZmlnXSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKENvbGxhcHNlLCBudWxsLCBbe1xuICAgICAga2V5OiAnVkVSU0lPTicsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIFZFUlNJT047XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiAnRGVmYXVsdCcsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIERlZmF1bHQ7XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIENvbGxhcHNlO1xuICB9KCk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgJChkb2N1bWVudCkub24oRXZlbnQuQ0xJQ0tfREFUQV9BUEksIFNlbGVjdG9yLkRBVEFfVE9HR0xFLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgdmFyIHRhcmdldCA9IENvbGxhcHNlLl9nZXRUYXJnZXRGcm9tRWxlbWVudCh0aGlzKTtcbiAgICB2YXIgZGF0YSA9ICQodGFyZ2V0KS5kYXRhKERBVEFfS0VZKTtcbiAgICB2YXIgY29uZmlnID0gZGF0YSA/ICd0b2dnbGUnIDogJCh0aGlzKS5kYXRhKCk7XG5cbiAgICBDb2xsYXBzZS5falF1ZXJ5SW50ZXJmYWNlLmNhbGwoJCh0YXJnZXQpLCBjb25maWcpO1xuICB9KTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIGpRdWVyeVxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgJC5mbltOQU1FXSA9IENvbGxhcHNlLl9qUXVlcnlJbnRlcmZhY2U7XG4gICQuZm5bTkFNRV0uQ29uc3RydWN0b3IgPSBDb2xsYXBzZTtcbiAgJC5mbltOQU1FXS5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICQuZm5bTkFNRV0gPSBKUVVFUllfTk9fQ09ORkxJQ1Q7XG4gICAgcmV0dXJuIENvbGxhcHNlLl9qUXVlcnlJbnRlcmZhY2U7XG4gIH07XG5cbiAgcmV0dXJuIENvbGxhcHNlO1xufShqUXVlcnkpO1xuXG4vKipcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBCb290c3RyYXAgKHY0LjAuMC1hbHBoYS42KTogZHJvcGRvd24uanNcbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL3R3YnMvYm9vdHN0cmFwL2Jsb2IvbWFzdGVyL0xJQ0VOU0UpXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICovXG5cbnZhciBEcm9wZG93biA9IGZ1bmN0aW9uICgkKSB7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FID0gJ2Ryb3Bkb3duJztcbiAgdmFyIFZFUlNJT04gPSAnNC4wLjAtYWxwaGEuNic7XG4gIHZhciBEQVRBX0tFWSA9ICdicy5kcm9wZG93bic7XG4gIHZhciBFVkVOVF9LRVkgPSAnLicgKyBEQVRBX0tFWTtcbiAgdmFyIERBVEFfQVBJX0tFWSA9ICcuZGF0YS1hcGknO1xuICB2YXIgSlFVRVJZX05PX0NPTkZMSUNUID0gJC5mbltOQU1FXTtcbiAgdmFyIEVTQ0FQRV9LRVlDT0RFID0gMjc7IC8vIEtleWJvYXJkRXZlbnQud2hpY2ggdmFsdWUgZm9yIEVzY2FwZSAoRXNjKSBrZXlcbiAgdmFyIEFSUk9XX1VQX0tFWUNPREUgPSAzODsgLy8gS2V5Ym9hcmRFdmVudC53aGljaCB2YWx1ZSBmb3IgdXAgYXJyb3cga2V5XG4gIHZhciBBUlJPV19ET1dOX0tFWUNPREUgPSA0MDsgLy8gS2V5Ym9hcmRFdmVudC53aGljaCB2YWx1ZSBmb3IgZG93biBhcnJvdyBrZXlcbiAgdmFyIFJJR0hUX01PVVNFX0JVVFRPTl9XSElDSCA9IDM7IC8vIE1vdXNlRXZlbnQud2hpY2ggdmFsdWUgZm9yIHRoZSByaWdodCBidXR0b24gKGFzc3VtaW5nIGEgcmlnaHQtaGFuZGVkIG1vdXNlKVxuXG4gIHZhciBFdmVudCA9IHtcbiAgICBISURFOiAnaGlkZScgKyBFVkVOVF9LRVksXG4gICAgSElEREVOOiAnaGlkZGVuJyArIEVWRU5UX0tFWSxcbiAgICBTSE9XOiAnc2hvdycgKyBFVkVOVF9LRVksXG4gICAgU0hPV046ICdzaG93bicgKyBFVkVOVF9LRVksXG4gICAgQ0xJQ0s6ICdjbGljaycgKyBFVkVOVF9LRVksXG4gICAgQ0xJQ0tfREFUQV9BUEk6ICdjbGljaycgKyBFVkVOVF9LRVkgKyBEQVRBX0FQSV9LRVksXG4gICAgRk9DVVNJTl9EQVRBX0FQSTogJ2ZvY3VzaW4nICsgRVZFTlRfS0VZICsgREFUQV9BUElfS0VZLFxuICAgIEtFWURPV05fREFUQV9BUEk6ICdrZXlkb3duJyArIEVWRU5UX0tFWSArIERBVEFfQVBJX0tFWVxuICB9O1xuXG4gIHZhciBDbGFzc05hbWUgPSB7XG4gICAgQkFDS0RST1A6ICdkcm9wZG93bi1iYWNrZHJvcCcsXG4gICAgRElTQUJMRUQ6ICdkaXNhYmxlZCcsXG4gICAgU0hPVzogJ3Nob3cnXG4gIH07XG5cbiAgdmFyIFNlbGVjdG9yID0ge1xuICAgIEJBQ0tEUk9QOiAnLmRyb3Bkb3duLWJhY2tkcm9wJyxcbiAgICBEQVRBX1RPR0dMRTogJ1tkYXRhLXRvZ2dsZT1cImRyb3Bkb3duXCJdJyxcbiAgICBGT1JNX0NISUxEOiAnLmRyb3Bkb3duIGZvcm0nLFxuICAgIFJPTEVfTUVOVTogJ1tyb2xlPVwibWVudVwiXScsXG4gICAgUk9MRV9MSVNUQk9YOiAnW3JvbGU9XCJsaXN0Ym94XCJdJyxcbiAgICBOQVZCQVJfTkFWOiAnLm5hdmJhci1uYXYnLFxuICAgIFZJU0lCTEVfSVRFTVM6ICdbcm9sZT1cIm1lbnVcIl0gbGk6bm90KC5kaXNhYmxlZCkgYSwgJyArICdbcm9sZT1cImxpc3Rib3hcIl0gbGk6bm90KC5kaXNhYmxlZCkgYSdcbiAgfTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIENsYXNzIERlZmluaXRpb25cbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBEcm9wZG93biA9IGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBEcm9wZG93bihlbGVtZW50KSB7XG4gICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgRHJvcGRvd24pO1xuXG4gICAgICB0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtcblxuICAgICAgdGhpcy5fYWRkRXZlbnRMaXN0ZW5lcnMoKTtcbiAgICB9XG5cbiAgICAvLyBnZXR0ZXJzXG5cbiAgICAvLyBwdWJsaWNcblxuICAgIERyb3Bkb3duLnByb3RvdHlwZS50b2dnbGUgPSBmdW5jdGlvbiB0b2dnbGUoKSB7XG4gICAgICBpZiAodGhpcy5kaXNhYmxlZCB8fCAkKHRoaXMpLmhhc0NsYXNzKENsYXNzTmFtZS5ESVNBQkxFRCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICB2YXIgcGFyZW50ID0gRHJvcGRvd24uX2dldFBhcmVudEZyb21FbGVtZW50KHRoaXMpO1xuICAgICAgdmFyIGlzQWN0aXZlID0gJChwYXJlbnQpLmhhc0NsYXNzKENsYXNzTmFtZS5TSE9XKTtcblxuICAgICAgRHJvcGRvd24uX2NsZWFyTWVudXMoKTtcblxuICAgICAgaWYgKGlzQWN0aXZlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKCdvbnRvdWNoc3RhcnQnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCAmJiAhJChwYXJlbnQpLmNsb3Nlc3QoU2VsZWN0b3IuTkFWQkFSX05BVikubGVuZ3RoKSB7XG5cbiAgICAgICAgLy8gaWYgbW9iaWxlIHdlIHVzZSBhIGJhY2tkcm9wIGJlY2F1c2UgY2xpY2sgZXZlbnRzIGRvbid0IGRlbGVnYXRlXG4gICAgICAgIHZhciBkcm9wZG93biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBkcm9wZG93bi5jbGFzc05hbWUgPSBDbGFzc05hbWUuQkFDS0RST1A7XG4gICAgICAgICQoZHJvcGRvd24pLmluc2VydEJlZm9yZSh0aGlzKTtcbiAgICAgICAgJChkcm9wZG93bikub24oJ2NsaWNrJywgRHJvcGRvd24uX2NsZWFyTWVudXMpO1xuICAgICAgfVxuXG4gICAgICB2YXIgcmVsYXRlZFRhcmdldCA9IHtcbiAgICAgICAgcmVsYXRlZFRhcmdldDogdGhpc1xuICAgICAgfTtcbiAgICAgIHZhciBzaG93RXZlbnQgPSAkLkV2ZW50KEV2ZW50LlNIT1csIHJlbGF0ZWRUYXJnZXQpO1xuXG4gICAgICAkKHBhcmVudCkudHJpZ2dlcihzaG93RXZlbnQpO1xuXG4gICAgICBpZiAoc2hvd0V2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5mb2N1cygpO1xuICAgICAgdGhpcy5zZXRBdHRyaWJ1dGUoJ2FyaWEtZXhwYW5kZWQnLCB0cnVlKTtcblxuICAgICAgJChwYXJlbnQpLnRvZ2dsZUNsYXNzKENsYXNzTmFtZS5TSE9XKTtcbiAgICAgICQocGFyZW50KS50cmlnZ2VyKCQuRXZlbnQoRXZlbnQuU0hPV04sIHJlbGF0ZWRUYXJnZXQpKTtcblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICBEcm9wZG93bi5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgICAkLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkpO1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS5vZmYoRVZFTlRfS0VZKTtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgIH07XG5cbiAgICAvLyBwcml2YXRlXG5cbiAgICBEcm9wZG93bi5wcm90b3R5cGUuX2FkZEV2ZW50TGlzdGVuZXJzID0gZnVuY3Rpb24gX2FkZEV2ZW50TGlzdGVuZXJzKCkge1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbihFdmVudC5DTElDSywgdGhpcy50b2dnbGUpO1xuICAgIH07XG5cbiAgICAvLyBzdGF0aWNcblxuICAgIERyb3Bkb3duLl9qUXVlcnlJbnRlcmZhY2UgPSBmdW5jdGlvbiBfalF1ZXJ5SW50ZXJmYWNlKGNvbmZpZykge1xuICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkYXRhID0gJCh0aGlzKS5kYXRhKERBVEFfS0VZKTtcblxuICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICBkYXRhID0gbmV3IERyb3Bkb3duKHRoaXMpO1xuICAgICAgICAgICQodGhpcykuZGF0YShEQVRBX0tFWSwgZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBpZiAoZGF0YVtjb25maWddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gbWV0aG9kIG5hbWVkIFwiJyArIGNvbmZpZyArICdcIicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkYXRhW2NvbmZpZ10uY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIERyb3Bkb3duLl9jbGVhck1lbnVzID0gZnVuY3Rpb24gX2NsZWFyTWVudXMoZXZlbnQpIHtcbiAgICAgIGlmIChldmVudCAmJiBldmVudC53aGljaCA9PT0gUklHSFRfTU9VU0VfQlVUVE9OX1dISUNIKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGJhY2tkcm9wID0gJChTZWxlY3Rvci5CQUNLRFJPUClbMF07XG4gICAgICBpZiAoYmFja2Ryb3ApIHtcbiAgICAgICAgYmFja2Ryb3AucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChiYWNrZHJvcCk7XG4gICAgICB9XG5cbiAgICAgIHZhciB0b2dnbGVzID0gJC5tYWtlQXJyYXkoJChTZWxlY3Rvci5EQVRBX1RPR0dMRSkpO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRvZ2dsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHBhcmVudCA9IERyb3Bkb3duLl9nZXRQYXJlbnRGcm9tRWxlbWVudCh0b2dnbGVzW2ldKTtcbiAgICAgICAgdmFyIHJlbGF0ZWRUYXJnZXQgPSB7XG4gICAgICAgICAgcmVsYXRlZFRhcmdldDogdG9nZ2xlc1tpXVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICghJChwYXJlbnQpLmhhc0NsYXNzKENsYXNzTmFtZS5TSE9XKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGV2ZW50ICYmIChldmVudC50eXBlID09PSAnY2xpY2snICYmIC9pbnB1dHx0ZXh0YXJlYS9pLnRlc3QoZXZlbnQudGFyZ2V0LnRhZ05hbWUpIHx8IGV2ZW50LnR5cGUgPT09ICdmb2N1c2luJykgJiYgJC5jb250YWlucyhwYXJlbnQsIGV2ZW50LnRhcmdldCkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBoaWRlRXZlbnQgPSAkLkV2ZW50KEV2ZW50LkhJREUsIHJlbGF0ZWRUYXJnZXQpO1xuICAgICAgICAkKHBhcmVudCkudHJpZ2dlcihoaWRlRXZlbnQpO1xuICAgICAgICBpZiAoaGlkZUV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICB0b2dnbGVzW2ldLnNldEF0dHJpYnV0ZSgnYXJpYS1leHBhbmRlZCcsICdmYWxzZScpO1xuXG4gICAgICAgICQocGFyZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuU0hPVykudHJpZ2dlcigkLkV2ZW50KEV2ZW50LkhJRERFTiwgcmVsYXRlZFRhcmdldCkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBEcm9wZG93bi5fZ2V0UGFyZW50RnJvbUVsZW1lbnQgPSBmdW5jdGlvbiBfZ2V0UGFyZW50RnJvbUVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgdmFyIHBhcmVudCA9IHZvaWQgMDtcbiAgICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudChlbGVtZW50KTtcblxuICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgIHBhcmVudCA9ICQoc2VsZWN0b3IpWzBdO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcGFyZW50IHx8IGVsZW1lbnQucGFyZW50Tm9kZTtcbiAgICB9O1xuXG4gICAgRHJvcGRvd24uX2RhdGFBcGlLZXlkb3duSGFuZGxlciA9IGZ1bmN0aW9uIF9kYXRhQXBpS2V5ZG93bkhhbmRsZXIoZXZlbnQpIHtcbiAgICAgIGlmICghLygzOHw0MHwyN3wzMikvLnRlc3QoZXZlbnQud2hpY2gpIHx8IC9pbnB1dHx0ZXh0YXJlYS9pLnRlc3QoZXZlbnQudGFyZ2V0LnRhZ05hbWUpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgICBpZiAodGhpcy5kaXNhYmxlZCB8fCAkKHRoaXMpLmhhc0NsYXNzKENsYXNzTmFtZS5ESVNBQkxFRCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgcGFyZW50ID0gRHJvcGRvd24uX2dldFBhcmVudEZyb21FbGVtZW50KHRoaXMpO1xuICAgICAgdmFyIGlzQWN0aXZlID0gJChwYXJlbnQpLmhhc0NsYXNzKENsYXNzTmFtZS5TSE9XKTtcblxuICAgICAgaWYgKCFpc0FjdGl2ZSAmJiBldmVudC53aGljaCAhPT0gRVNDQVBFX0tFWUNPREUgfHwgaXNBY3RpdmUgJiYgZXZlbnQud2hpY2ggPT09IEVTQ0FQRV9LRVlDT0RFKSB7XG5cbiAgICAgICAgaWYgKGV2ZW50LndoaWNoID09PSBFU0NBUEVfS0VZQ09ERSkge1xuICAgICAgICAgIHZhciB0b2dnbGUgPSAkKHBhcmVudCkuZmluZChTZWxlY3Rvci5EQVRBX1RPR0dMRSlbMF07XG4gICAgICAgICAgJCh0b2dnbGUpLnRyaWdnZXIoJ2ZvY3VzJyk7XG4gICAgICAgIH1cblxuICAgICAgICAkKHRoaXMpLnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGl0ZW1zID0gJChwYXJlbnQpLmZpbmQoU2VsZWN0b3IuVklTSUJMRV9JVEVNUykuZ2V0KCk7XG5cbiAgICAgIGlmICghaXRlbXMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGluZGV4ID0gaXRlbXMuaW5kZXhPZihldmVudC50YXJnZXQpO1xuXG4gICAgICBpZiAoZXZlbnQud2hpY2ggPT09IEFSUk9XX1VQX0tFWUNPREUgJiYgaW5kZXggPiAwKSB7XG4gICAgICAgIC8vIHVwXG4gICAgICAgIGluZGV4LS07XG4gICAgICB9XG5cbiAgICAgIGlmIChldmVudC53aGljaCA9PT0gQVJST1dfRE9XTl9LRVlDT0RFICYmIGluZGV4IDwgaXRlbXMubGVuZ3RoIC0gMSkge1xuICAgICAgICAvLyBkb3duXG4gICAgICAgIGluZGV4Kys7XG4gICAgICB9XG5cbiAgICAgIGlmIChpbmRleCA8IDApIHtcbiAgICAgICAgaW5kZXggPSAwO1xuICAgICAgfVxuXG4gICAgICBpdGVtc1tpbmRleF0uZm9jdXMoKTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKERyb3Bkb3duLCBudWxsLCBbe1xuICAgICAga2V5OiAnVkVSU0lPTicsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIFZFUlNJT047XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIERyb3Bkb3duO1xuICB9KCk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgJChkb2N1bWVudCkub24oRXZlbnQuS0VZRE9XTl9EQVRBX0FQSSwgU2VsZWN0b3IuREFUQV9UT0dHTEUsIERyb3Bkb3duLl9kYXRhQXBpS2V5ZG93bkhhbmRsZXIpLm9uKEV2ZW50LktFWURPV05fREFUQV9BUEksIFNlbGVjdG9yLlJPTEVfTUVOVSwgRHJvcGRvd24uX2RhdGFBcGlLZXlkb3duSGFuZGxlcikub24oRXZlbnQuS0VZRE9XTl9EQVRBX0FQSSwgU2VsZWN0b3IuUk9MRV9MSVNUQk9YLCBEcm9wZG93bi5fZGF0YUFwaUtleWRvd25IYW5kbGVyKS5vbihFdmVudC5DTElDS19EQVRBX0FQSSArICcgJyArIEV2ZW50LkZPQ1VTSU5fREFUQV9BUEksIERyb3Bkb3duLl9jbGVhck1lbnVzKS5vbihFdmVudC5DTElDS19EQVRBX0FQSSwgU2VsZWN0b3IuREFUQV9UT0dHTEUsIERyb3Bkb3duLnByb3RvdHlwZS50b2dnbGUpLm9uKEV2ZW50LkNMSUNLX0RBVEFfQVBJLCBTZWxlY3Rvci5GT1JNX0NISUxELCBmdW5jdGlvbiAoZSkge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogalF1ZXJ5XG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAkLmZuW05BTUVdID0gRHJvcGRvd24uX2pRdWVyeUludGVyZmFjZTtcbiAgJC5mbltOQU1FXS5Db25zdHJ1Y3RvciA9IERyb3Bkb3duO1xuICAkLmZuW05BTUVdLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgJC5mbltOQU1FXSA9IEpRVUVSWV9OT19DT05GTElDVDtcbiAgICByZXR1cm4gRHJvcGRvd24uX2pRdWVyeUludGVyZmFjZTtcbiAgfTtcblxuICByZXR1cm4gRHJvcGRvd247XG59KGpRdWVyeSk7XG5cbi8qKlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIEJvb3RzdHJhcCAodjQuMC4wLWFscGhhLjYpOiBtb2RhbC5qc1xuICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vdHdicy9ib290c3RyYXAvYmxvYi9tYXN0ZXIvTElDRU5TRSlcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKi9cblxudmFyIE1vZGFsID0gZnVuY3Rpb24gKCQpIHtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIENvbnN0YW50c1xuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIE5BTUUgPSAnbW9kYWwnO1xuICB2YXIgVkVSU0lPTiA9ICc0LjAuMC1hbHBoYS42JztcbiAgdmFyIERBVEFfS0VZID0gJ2JzLm1vZGFsJztcbiAgdmFyIEVWRU5UX0tFWSA9ICcuJyArIERBVEFfS0VZO1xuICB2YXIgREFUQV9BUElfS0VZID0gJy5kYXRhLWFwaSc7XG4gIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QgPSAkLmZuW05BTUVdO1xuICB2YXIgVFJBTlNJVElPTl9EVVJBVElPTiA9IDMwMDtcbiAgdmFyIEJBQ0tEUk9QX1RSQU5TSVRJT05fRFVSQVRJT04gPSAxNTA7XG4gIHZhciBFU0NBUEVfS0VZQ09ERSA9IDI3OyAvLyBLZXlib2FyZEV2ZW50LndoaWNoIHZhbHVlIGZvciBFc2NhcGUgKEVzYykga2V5XG5cbiAgdmFyIERlZmF1bHQgPSB7XG4gICAgYmFja2Ryb3A6IHRydWUsXG4gICAga2V5Ym9hcmQ6IHRydWUsXG4gICAgZm9jdXM6IHRydWUsXG4gICAgc2hvdzogdHJ1ZVxuICB9O1xuXG4gIHZhciBEZWZhdWx0VHlwZSA9IHtcbiAgICBiYWNrZHJvcDogJyhib29sZWFufHN0cmluZyknLFxuICAgIGtleWJvYXJkOiAnYm9vbGVhbicsXG4gICAgZm9jdXM6ICdib29sZWFuJyxcbiAgICBzaG93OiAnYm9vbGVhbidcbiAgfTtcblxuICB2YXIgRXZlbnQgPSB7XG4gICAgSElERTogJ2hpZGUnICsgRVZFTlRfS0VZLFxuICAgIEhJRERFTjogJ2hpZGRlbicgKyBFVkVOVF9LRVksXG4gICAgU0hPVzogJ3Nob3cnICsgRVZFTlRfS0VZLFxuICAgIFNIT1dOOiAnc2hvd24nICsgRVZFTlRfS0VZLFxuICAgIEZPQ1VTSU46ICdmb2N1c2luJyArIEVWRU5UX0tFWSxcbiAgICBSRVNJWkU6ICdyZXNpemUnICsgRVZFTlRfS0VZLFxuICAgIENMSUNLX0RJU01JU1M6ICdjbGljay5kaXNtaXNzJyArIEVWRU5UX0tFWSxcbiAgICBLRVlET1dOX0RJU01JU1M6ICdrZXlkb3duLmRpc21pc3MnICsgRVZFTlRfS0VZLFxuICAgIE1PVVNFVVBfRElTTUlTUzogJ21vdXNldXAuZGlzbWlzcycgKyBFVkVOVF9LRVksXG4gICAgTU9VU0VET1dOX0RJU01JU1M6ICdtb3VzZWRvd24uZGlzbWlzcycgKyBFVkVOVF9LRVksXG4gICAgQ0xJQ0tfREFUQV9BUEk6ICdjbGljaycgKyBFVkVOVF9LRVkgKyBEQVRBX0FQSV9LRVlcbiAgfTtcblxuICB2YXIgQ2xhc3NOYW1lID0ge1xuICAgIFNDUk9MTEJBUl9NRUFTVVJFUjogJ21vZGFsLXNjcm9sbGJhci1tZWFzdXJlJyxcbiAgICBCQUNLRFJPUDogJ21vZGFsLWJhY2tkcm9wJyxcbiAgICBPUEVOOiAnbW9kYWwtb3BlbicsXG4gICAgRkFERTogJ2ZhZGUnLFxuICAgIFNIT1c6ICdzaG93J1xuICB9O1xuXG4gIHZhciBTZWxlY3RvciA9IHtcbiAgICBESUFMT0c6ICcubW9kYWwtZGlhbG9nJyxcbiAgICBEQVRBX1RPR0dMRTogJ1tkYXRhLXRvZ2dsZT1cIm1vZGFsXCJdJyxcbiAgICBEQVRBX0RJU01JU1M6ICdbZGF0YS1kaXNtaXNzPVwibW9kYWxcIl0nLFxuICAgIEZJWEVEX0NPTlRFTlQ6ICcuZml4ZWQtdG9wLCAuZml4ZWQtYm90dG9tLCAuaXMtZml4ZWQsIC5zdGlja3ktdG9wJ1xuICB9O1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ2xhc3MgRGVmaW5pdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIE1vZGFsID0gZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIE1vZGFsKGVsZW1lbnQsIGNvbmZpZykge1xuICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIE1vZGFsKTtcblxuICAgICAgdGhpcy5fY29uZmlnID0gdGhpcy5fZ2V0Q29uZmlnKGNvbmZpZyk7XG4gICAgICB0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtcbiAgICAgIHRoaXMuX2RpYWxvZyA9ICQoZWxlbWVudCkuZmluZChTZWxlY3Rvci5ESUFMT0cpWzBdO1xuICAgICAgdGhpcy5fYmFja2Ryb3AgPSBudWxsO1xuICAgICAgdGhpcy5faXNTaG93biA9IGZhbHNlO1xuICAgICAgdGhpcy5faXNCb2R5T3ZlcmZsb3dpbmcgPSBmYWxzZTtcbiAgICAgIHRoaXMuX2lnbm9yZUJhY2tkcm9wQ2xpY2sgPSBmYWxzZTtcbiAgICAgIHRoaXMuX2lzVHJhbnNpdGlvbmluZyA9IGZhbHNlO1xuICAgICAgdGhpcy5fb3JpZ2luYWxCb2R5UGFkZGluZyA9IDA7XG4gICAgICB0aGlzLl9zY3JvbGxiYXJXaWR0aCA9IDA7XG4gICAgfVxuXG4gICAgLy8gZ2V0dGVyc1xuXG4gICAgLy8gcHVibGljXG5cbiAgICBNb2RhbC5wcm90b3R5cGUudG9nZ2xlID0gZnVuY3Rpb24gdG9nZ2xlKHJlbGF0ZWRUYXJnZXQpIHtcbiAgICAgIHJldHVybiB0aGlzLl9pc1Nob3duID8gdGhpcy5oaWRlKCkgOiB0aGlzLnNob3cocmVsYXRlZFRhcmdldCk7XG4gICAgfTtcblxuICAgIE1vZGFsLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gc2hvdyhyZWxhdGVkVGFyZ2V0KSB7XG4gICAgICB2YXIgX3RoaXM5ID0gdGhpcztcblxuICAgICAgaWYgKHRoaXMuX2lzVHJhbnNpdGlvbmluZykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01vZGFsIGlzIHRyYW5zaXRpb25pbmcnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKFV0aWwuc3VwcG9ydHNUcmFuc2l0aW9uRW5kKCkgJiYgJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUuRkFERSkpIHtcbiAgICAgICAgdGhpcy5faXNUcmFuc2l0aW9uaW5nID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHZhciBzaG93RXZlbnQgPSAkLkV2ZW50KEV2ZW50LlNIT1csIHtcbiAgICAgICAgcmVsYXRlZFRhcmdldDogcmVsYXRlZFRhcmdldFxuICAgICAgfSk7XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkudHJpZ2dlcihzaG93RXZlbnQpO1xuXG4gICAgICBpZiAodGhpcy5faXNTaG93biB8fCBzaG93RXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9pc1Nob3duID0gdHJ1ZTtcblxuICAgICAgdGhpcy5fY2hlY2tTY3JvbGxiYXIoKTtcbiAgICAgIHRoaXMuX3NldFNjcm9sbGJhcigpO1xuXG4gICAgICAkKGRvY3VtZW50LmJvZHkpLmFkZENsYXNzKENsYXNzTmFtZS5PUEVOKTtcblxuICAgICAgdGhpcy5fc2V0RXNjYXBlRXZlbnQoKTtcbiAgICAgIHRoaXMuX3NldFJlc2l6ZUV2ZW50KCk7XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkub24oRXZlbnQuQ0xJQ0tfRElTTUlTUywgU2VsZWN0b3IuREFUQV9ESVNNSVNTLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgcmV0dXJuIF90aGlzOS5oaWRlKGV2ZW50KTtcbiAgICAgIH0pO1xuXG4gICAgICAkKHRoaXMuX2RpYWxvZykub24oRXZlbnQuTU9VU0VET1dOX0RJU01JU1MsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJChfdGhpczkuX2VsZW1lbnQpLm9uZShFdmVudC5NT1VTRVVQX0RJU01JU1MsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIGlmICgkKGV2ZW50LnRhcmdldCkuaXMoX3RoaXM5Ll9lbGVtZW50KSkge1xuICAgICAgICAgICAgX3RoaXM5Ll9pZ25vcmVCYWNrZHJvcENsaWNrID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuX3Nob3dCYWNrZHJvcChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBfdGhpczkuX3Nob3dFbGVtZW50KHJlbGF0ZWRUYXJnZXQpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIE1vZGFsLnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24gaGlkZShldmVudCkge1xuICAgICAgdmFyIF90aGlzMTAgPSB0aGlzO1xuXG4gICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2lzVHJhbnNpdGlvbmluZykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01vZGFsIGlzIHRyYW5zaXRpb25pbmcnKTtcbiAgICAgIH1cblxuICAgICAgdmFyIHRyYW5zaXRpb24gPSBVdGlsLnN1cHBvcnRzVHJhbnNpdGlvbkVuZCgpICYmICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkZBREUpO1xuICAgICAgaWYgKHRyYW5zaXRpb24pIHtcbiAgICAgICAgdGhpcy5faXNUcmFuc2l0aW9uaW5nID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgdmFyIGhpZGVFdmVudCA9ICQuRXZlbnQoRXZlbnQuSElERSk7XG4gICAgICAkKHRoaXMuX2VsZW1lbnQpLnRyaWdnZXIoaGlkZUV2ZW50KTtcblxuICAgICAgaWYgKCF0aGlzLl9pc1Nob3duIHx8IGhpZGVFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2lzU2hvd24gPSBmYWxzZTtcblxuICAgICAgdGhpcy5fc2V0RXNjYXBlRXZlbnQoKTtcbiAgICAgIHRoaXMuX3NldFJlc2l6ZUV2ZW50KCk7XG5cbiAgICAgICQoZG9jdW1lbnQpLm9mZihFdmVudC5GT0NVU0lOKTtcblxuICAgICAgJCh0aGlzLl9lbGVtZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuU0hPVyk7XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkub2ZmKEV2ZW50LkNMSUNLX0RJU01JU1MpO1xuICAgICAgJCh0aGlzLl9kaWFsb2cpLm9mZihFdmVudC5NT1VTRURPV05fRElTTUlTUyk7XG5cbiAgICAgIGlmICh0cmFuc2l0aW9uKSB7XG4gICAgICAgICQodGhpcy5fZWxlbWVudCkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIHJldHVybiBfdGhpczEwLl9oaWRlTW9kYWwoZXZlbnQpO1xuICAgICAgICB9KS5lbXVsYXRlVHJhbnNpdGlvbkVuZChUUkFOU0lUSU9OX0RVUkFUSU9OKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2hpZGVNb2RhbCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBNb2RhbC5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgICAkLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkpO1xuXG4gICAgICAkKHdpbmRvdywgZG9jdW1lbnQsIHRoaXMuX2VsZW1lbnQsIHRoaXMuX2JhY2tkcm9wKS5vZmYoRVZFTlRfS0VZKTtcblxuICAgICAgdGhpcy5fY29uZmlnID0gbnVsbDtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgICAgdGhpcy5fZGlhbG9nID0gbnVsbDtcbiAgICAgIHRoaXMuX2JhY2tkcm9wID0gbnVsbDtcbiAgICAgIHRoaXMuX2lzU2hvd24gPSBudWxsO1xuICAgICAgdGhpcy5faXNCb2R5T3ZlcmZsb3dpbmcgPSBudWxsO1xuICAgICAgdGhpcy5faWdub3JlQmFja2Ryb3BDbGljayA9IG51bGw7XG4gICAgICB0aGlzLl9vcmlnaW5hbEJvZHlQYWRkaW5nID0gbnVsbDtcbiAgICAgIHRoaXMuX3Njcm9sbGJhcldpZHRoID0gbnVsbDtcbiAgICB9O1xuXG4gICAgLy8gcHJpdmF0ZVxuXG4gICAgTW9kYWwucHJvdG90eXBlLl9nZXRDb25maWcgPSBmdW5jdGlvbiBfZ2V0Q29uZmlnKGNvbmZpZykge1xuICAgICAgY29uZmlnID0gJC5leHRlbmQoe30sIERlZmF1bHQsIGNvbmZpZyk7XG4gICAgICBVdGlsLnR5cGVDaGVja0NvbmZpZyhOQU1FLCBjb25maWcsIERlZmF1bHRUeXBlKTtcbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfTtcblxuICAgIE1vZGFsLnByb3RvdHlwZS5fc2hvd0VsZW1lbnQgPSBmdW5jdGlvbiBfc2hvd0VsZW1lbnQocmVsYXRlZFRhcmdldCkge1xuICAgICAgdmFyIF90aGlzMTEgPSB0aGlzO1xuXG4gICAgICB2YXIgdHJhbnNpdGlvbiA9IFV0aWwuc3VwcG9ydHNUcmFuc2l0aW9uRW5kKCkgJiYgJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUuRkFERSk7XG5cbiAgICAgIGlmICghdGhpcy5fZWxlbWVudC5wYXJlbnROb2RlIHx8IHRoaXMuX2VsZW1lbnQucGFyZW50Tm9kZS5ub2RlVHlwZSAhPT0gTm9kZS5FTEVNRU5UX05PREUpIHtcbiAgICAgICAgLy8gZG9uJ3QgbW92ZSBtb2RhbHMgZG9tIHBvc2l0aW9uXG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5fZWxlbWVudCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gICAgICB0aGlzLl9lbGVtZW50LnJlbW92ZUF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nKTtcbiAgICAgIHRoaXMuX2VsZW1lbnQuc2Nyb2xsVG9wID0gMDtcblxuICAgICAgaWYgKHRyYW5zaXRpb24pIHtcbiAgICAgICAgVXRpbC5yZWZsb3codGhpcy5fZWxlbWVudCk7XG4gICAgICB9XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkuYWRkQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpO1xuXG4gICAgICBpZiAodGhpcy5fY29uZmlnLmZvY3VzKSB7XG4gICAgICAgIHRoaXMuX2VuZm9yY2VGb2N1cygpO1xuICAgICAgfVxuXG4gICAgICB2YXIgc2hvd25FdmVudCA9ICQuRXZlbnQoRXZlbnQuU0hPV04sIHtcbiAgICAgICAgcmVsYXRlZFRhcmdldDogcmVsYXRlZFRhcmdldFxuICAgICAgfSk7XG5cbiAgICAgIHZhciB0cmFuc2l0aW9uQ29tcGxldGUgPSBmdW5jdGlvbiB0cmFuc2l0aW9uQ29tcGxldGUoKSB7XG4gICAgICAgIGlmIChfdGhpczExLl9jb25maWcuZm9jdXMpIHtcbiAgICAgICAgICBfdGhpczExLl9lbGVtZW50LmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICAgICAgX3RoaXMxMS5faXNUcmFuc2l0aW9uaW5nID0gZmFsc2U7XG4gICAgICAgICQoX3RoaXMxMS5fZWxlbWVudCkudHJpZ2dlcihzaG93bkV2ZW50KTtcbiAgICAgIH07XG5cbiAgICAgIGlmICh0cmFuc2l0aW9uKSB7XG4gICAgICAgICQodGhpcy5fZGlhbG9nKS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgdHJhbnNpdGlvbkNvbXBsZXRlKS5lbXVsYXRlVHJhbnNpdGlvbkVuZChUUkFOU0lUSU9OX0RVUkFUSU9OKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRyYW5zaXRpb25Db21wbGV0ZSgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBNb2RhbC5wcm90b3R5cGUuX2VuZm9yY2VGb2N1cyA9IGZ1bmN0aW9uIF9lbmZvcmNlRm9jdXMoKSB7XG4gICAgICB2YXIgX3RoaXMxMiA9IHRoaXM7XG5cbiAgICAgICQoZG9jdW1lbnQpLm9mZihFdmVudC5GT0NVU0lOKSAvLyBndWFyZCBhZ2FpbnN0IGluZmluaXRlIGZvY3VzIGxvb3BcbiAgICAgIC5vbihFdmVudC5GT0NVU0lOLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgaWYgKGRvY3VtZW50ICE9PSBldmVudC50YXJnZXQgJiYgX3RoaXMxMi5fZWxlbWVudCAhPT0gZXZlbnQudGFyZ2V0ICYmICEkKF90aGlzMTIuX2VsZW1lbnQpLmhhcyhldmVudC50YXJnZXQpLmxlbmd0aCkge1xuICAgICAgICAgIF90aGlzMTIuX2VsZW1lbnQuZm9jdXMoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIE1vZGFsLnByb3RvdHlwZS5fc2V0RXNjYXBlRXZlbnQgPSBmdW5jdGlvbiBfc2V0RXNjYXBlRXZlbnQoKSB7XG4gICAgICB2YXIgX3RoaXMxMyA9IHRoaXM7XG5cbiAgICAgIGlmICh0aGlzLl9pc1Nob3duICYmIHRoaXMuX2NvbmZpZy5rZXlib2FyZCkge1xuICAgICAgICAkKHRoaXMuX2VsZW1lbnQpLm9uKEV2ZW50LktFWURPV05fRElTTUlTUywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKGV2ZW50LndoaWNoID09PSBFU0NBUEVfS0VZQ09ERSkge1xuICAgICAgICAgICAgX3RoaXMxMy5oaWRlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoIXRoaXMuX2lzU2hvd24pIHtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vZmYoRXZlbnQuS0VZRE9XTl9ESVNNSVNTKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgTW9kYWwucHJvdG90eXBlLl9zZXRSZXNpemVFdmVudCA9IGZ1bmN0aW9uIF9zZXRSZXNpemVFdmVudCgpIHtcbiAgICAgIHZhciBfdGhpczE0ID0gdGhpcztcblxuICAgICAgaWYgKHRoaXMuX2lzU2hvd24pIHtcbiAgICAgICAgJCh3aW5kb3cpLm9uKEV2ZW50LlJFU0laRSwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzMTQuX2hhbmRsZVVwZGF0ZShldmVudCk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJCh3aW5kb3cpLm9mZihFdmVudC5SRVNJWkUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBNb2RhbC5wcm90b3R5cGUuX2hpZGVNb2RhbCA9IGZ1bmN0aW9uIF9oaWRlTW9kYWwoKSB7XG4gICAgICB2YXIgX3RoaXMxNSA9IHRoaXM7XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgIHRoaXMuX2VsZW1lbnQuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG4gICAgICB0aGlzLl9pc1RyYW5zaXRpb25pbmcgPSBmYWxzZTtcbiAgICAgIHRoaXMuX3Nob3dCYWNrZHJvcChmdW5jdGlvbiAoKSB7XG4gICAgICAgICQoZG9jdW1lbnQuYm9keSkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLk9QRU4pO1xuICAgICAgICBfdGhpczE1Ll9yZXNldEFkanVzdG1lbnRzKCk7XG4gICAgICAgIF90aGlzMTUuX3Jlc2V0U2Nyb2xsYmFyKCk7XG4gICAgICAgICQoX3RoaXMxNS5fZWxlbWVudCkudHJpZ2dlcihFdmVudC5ISURERU4pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIE1vZGFsLnByb3RvdHlwZS5fcmVtb3ZlQmFja2Ryb3AgPSBmdW5jdGlvbiBfcmVtb3ZlQmFja2Ryb3AoKSB7XG4gICAgICBpZiAodGhpcy5fYmFja2Ryb3ApIHtcbiAgICAgICAgJCh0aGlzLl9iYWNrZHJvcCkucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuX2JhY2tkcm9wID0gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgTW9kYWwucHJvdG90eXBlLl9zaG93QmFja2Ryb3AgPSBmdW5jdGlvbiBfc2hvd0JhY2tkcm9wKGNhbGxiYWNrKSB7XG4gICAgICB2YXIgX3RoaXMxNiA9IHRoaXM7XG5cbiAgICAgIHZhciBhbmltYXRlID0gJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUuRkFERSkgPyBDbGFzc05hbWUuRkFERSA6ICcnO1xuXG4gICAgICBpZiAodGhpcy5faXNTaG93biAmJiB0aGlzLl9jb25maWcuYmFja2Ryb3ApIHtcbiAgICAgICAgdmFyIGRvQW5pbWF0ZSA9IFV0aWwuc3VwcG9ydHNUcmFuc2l0aW9uRW5kKCkgJiYgYW5pbWF0ZTtcblxuICAgICAgICB0aGlzLl9iYWNrZHJvcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICB0aGlzLl9iYWNrZHJvcC5jbGFzc05hbWUgPSBDbGFzc05hbWUuQkFDS0RST1A7XG5cbiAgICAgICAgaWYgKGFuaW1hdGUpIHtcbiAgICAgICAgICAkKHRoaXMuX2JhY2tkcm9wKS5hZGRDbGFzcyhhbmltYXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgICQodGhpcy5fYmFja2Ryb3ApLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpO1xuXG4gICAgICAgICQodGhpcy5fZWxlbWVudCkub24oRXZlbnQuQ0xJQ0tfRElTTUlTUywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKF90aGlzMTYuX2lnbm9yZUJhY2tkcm9wQ2xpY2spIHtcbiAgICAgICAgICAgIF90aGlzMTYuX2lnbm9yZUJhY2tkcm9wQ2xpY2sgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGV2ZW50LnRhcmdldCAhPT0gZXZlbnQuY3VycmVudFRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoX3RoaXMxNi5fY29uZmlnLmJhY2tkcm9wID09PSAnc3RhdGljJykge1xuICAgICAgICAgICAgX3RoaXMxNi5fZWxlbWVudC5mb2N1cygpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfdGhpczE2LmhpZGUoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChkb0FuaW1hdGUpIHtcbiAgICAgICAgICBVdGlsLnJlZmxvdyh0aGlzLl9iYWNrZHJvcCk7XG4gICAgICAgIH1cblxuICAgICAgICAkKHRoaXMuX2JhY2tkcm9wKS5hZGRDbGFzcyhDbGFzc05hbWUuU0hPVyk7XG5cbiAgICAgICAgaWYgKCFjYWxsYmFjaykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghZG9BbmltYXRlKSB7XG4gICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAkKHRoaXMuX2JhY2tkcm9wKS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgY2FsbGJhY2spLmVtdWxhdGVUcmFuc2l0aW9uRW5kKEJBQ0tEUk9QX1RSQU5TSVRJT05fRFVSQVRJT04pO1xuICAgICAgfSBlbHNlIGlmICghdGhpcy5faXNTaG93biAmJiB0aGlzLl9iYWNrZHJvcCkge1xuICAgICAgICAkKHRoaXMuX2JhY2tkcm9wKS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuU0hPVyk7XG5cbiAgICAgICAgdmFyIGNhbGxiYWNrUmVtb3ZlID0gZnVuY3Rpb24gY2FsbGJhY2tSZW1vdmUoKSB7XG4gICAgICAgICAgX3RoaXMxNi5fcmVtb3ZlQmFja2Ryb3AoKTtcbiAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChVdGlsLnN1cHBvcnRzVHJhbnNpdGlvbkVuZCgpICYmICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkZBREUpKSB7XG4gICAgICAgICAgJCh0aGlzLl9iYWNrZHJvcCkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGNhbGxiYWNrUmVtb3ZlKS5lbXVsYXRlVHJhbnNpdGlvbkVuZChCQUNLRFJPUF9UUkFOU0lUSU9OX0RVUkFUSU9OKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjYWxsYmFja1JlbW92ZSgpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyB0aGUgZm9sbG93aW5nIG1ldGhvZHMgYXJlIHVzZWQgdG8gaGFuZGxlIG92ZXJmbG93aW5nIG1vZGFsc1xuICAgIC8vIHRvZG8gKGZhdCk6IHRoZXNlIHNob3VsZCBwcm9iYWJseSBiZSByZWZhY3RvcmVkIG91dCBvZiBtb2RhbC5qc1xuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAgIE1vZGFsLnByb3RvdHlwZS5faGFuZGxlVXBkYXRlID0gZnVuY3Rpb24gX2hhbmRsZVVwZGF0ZSgpIHtcbiAgICAgIHRoaXMuX2FkanVzdERpYWxvZygpO1xuICAgIH07XG5cbiAgICBNb2RhbC5wcm90b3R5cGUuX2FkanVzdERpYWxvZyA9IGZ1bmN0aW9uIF9hZGp1c3REaWFsb2coKSB7XG4gICAgICB2YXIgaXNNb2RhbE92ZXJmbG93aW5nID0gdGhpcy5fZWxlbWVudC5zY3JvbGxIZWlnaHQgPiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0O1xuXG4gICAgICBpZiAoIXRoaXMuX2lzQm9keU92ZXJmbG93aW5nICYmIGlzTW9kYWxPdmVyZmxvd2luZykge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLnBhZGRpbmdMZWZ0ID0gdGhpcy5fc2Nyb2xsYmFyV2lkdGggKyAncHgnO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5faXNCb2R5T3ZlcmZsb3dpbmcgJiYgIWlzTW9kYWxPdmVyZmxvd2luZykge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLnBhZGRpbmdSaWdodCA9IHRoaXMuX3Njcm9sbGJhcldpZHRoICsgJ3B4JztcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgTW9kYWwucHJvdG90eXBlLl9yZXNldEFkanVzdG1lbnRzID0gZnVuY3Rpb24gX3Jlc2V0QWRqdXN0bWVudHMoKSB7XG4gICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLnBhZGRpbmdMZWZ0ID0gJyc7XG4gICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLnBhZGRpbmdSaWdodCA9ICcnO1xuICAgIH07XG5cbiAgICBNb2RhbC5wcm90b3R5cGUuX2NoZWNrU2Nyb2xsYmFyID0gZnVuY3Rpb24gX2NoZWNrU2Nyb2xsYmFyKCkge1xuICAgICAgdGhpcy5faXNCb2R5T3ZlcmZsb3dpbmcgPSBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoIDwgd2luZG93LmlubmVyV2lkdGg7XG4gICAgICB0aGlzLl9zY3JvbGxiYXJXaWR0aCA9IHRoaXMuX2dldFNjcm9sbGJhcldpZHRoKCk7XG4gICAgfTtcblxuICAgIE1vZGFsLnByb3RvdHlwZS5fc2V0U2Nyb2xsYmFyID0gZnVuY3Rpb24gX3NldFNjcm9sbGJhcigpIHtcbiAgICAgIHZhciBib2R5UGFkZGluZyA9IHBhcnNlSW50KCQoU2VsZWN0b3IuRklYRURfQ09OVEVOVCkuY3NzKCdwYWRkaW5nLXJpZ2h0JykgfHwgMCwgMTApO1xuXG4gICAgICB0aGlzLl9vcmlnaW5hbEJvZHlQYWRkaW5nID0gZG9jdW1lbnQuYm9keS5zdHlsZS5wYWRkaW5nUmlnaHQgfHwgJyc7XG5cbiAgICAgIGlmICh0aGlzLl9pc0JvZHlPdmVyZmxvd2luZykge1xuICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLnBhZGRpbmdSaWdodCA9IGJvZHlQYWRkaW5nICsgdGhpcy5fc2Nyb2xsYmFyV2lkdGggKyAncHgnO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBNb2RhbC5wcm90b3R5cGUuX3Jlc2V0U2Nyb2xsYmFyID0gZnVuY3Rpb24gX3Jlc2V0U2Nyb2xsYmFyKCkge1xuICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5wYWRkaW5nUmlnaHQgPSB0aGlzLl9vcmlnaW5hbEJvZHlQYWRkaW5nO1xuICAgIH07XG5cbiAgICBNb2RhbC5wcm90b3R5cGUuX2dldFNjcm9sbGJhcldpZHRoID0gZnVuY3Rpb24gX2dldFNjcm9sbGJhcldpZHRoKCkge1xuICAgICAgLy8gdGh4IGQud2Fsc2hcbiAgICAgIHZhciBzY3JvbGxEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIHNjcm9sbERpdi5jbGFzc05hbWUgPSBDbGFzc05hbWUuU0NST0xMQkFSX01FQVNVUkVSO1xuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzY3JvbGxEaXYpO1xuICAgICAgdmFyIHNjcm9sbGJhcldpZHRoID0gc2Nyb2xsRGl2Lm9mZnNldFdpZHRoIC0gc2Nyb2xsRGl2LmNsaWVudFdpZHRoO1xuICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChzY3JvbGxEaXYpO1xuICAgICAgcmV0dXJuIHNjcm9sbGJhcldpZHRoO1xuICAgIH07XG5cbiAgICAvLyBzdGF0aWNcblxuICAgIE1vZGFsLl9qUXVlcnlJbnRlcmZhY2UgPSBmdW5jdGlvbiBfalF1ZXJ5SW50ZXJmYWNlKGNvbmZpZywgcmVsYXRlZFRhcmdldCkge1xuICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkYXRhID0gJCh0aGlzKS5kYXRhKERBVEFfS0VZKTtcbiAgICAgICAgdmFyIF9jb25maWcgPSAkLmV4dGVuZCh7fSwgTW9kYWwuRGVmYXVsdCwgJCh0aGlzKS5kYXRhKCksICh0eXBlb2YgY29uZmlnID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZihjb25maWcpKSA9PT0gJ29iamVjdCcgJiYgY29uZmlnKTtcblxuICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICBkYXRhID0gbmV3IE1vZGFsKHRoaXMsIF9jb25maWcpO1xuICAgICAgICAgICQodGhpcykuZGF0YShEQVRBX0tFWSwgZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBpZiAoZGF0YVtjb25maWddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gbWV0aG9kIG5hbWVkIFwiJyArIGNvbmZpZyArICdcIicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkYXRhW2NvbmZpZ10ocmVsYXRlZFRhcmdldCk7XG4gICAgICAgIH0gZWxzZSBpZiAoX2NvbmZpZy5zaG93KSB7XG4gICAgICAgICAgZGF0YS5zaG93KHJlbGF0ZWRUYXJnZXQpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKE1vZGFsLCBudWxsLCBbe1xuICAgICAga2V5OiAnVkVSU0lPTicsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIFZFUlNJT047XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiAnRGVmYXVsdCcsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIERlZmF1bHQ7XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIE1vZGFsO1xuICB9KCk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgJChkb2N1bWVudCkub24oRXZlbnQuQ0xJQ0tfREFUQV9BUEksIFNlbGVjdG9yLkRBVEFfVE9HR0xFLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB2YXIgX3RoaXMxNyA9IHRoaXM7XG5cbiAgICB2YXIgdGFyZ2V0ID0gdm9pZCAwO1xuICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudCh0aGlzKTtcblxuICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgdGFyZ2V0ID0gJChzZWxlY3RvcilbMF07XG4gICAgfVxuXG4gICAgdmFyIGNvbmZpZyA9ICQodGFyZ2V0KS5kYXRhKERBVEFfS0VZKSA/ICd0b2dnbGUnIDogJC5leHRlbmQoe30sICQodGFyZ2V0KS5kYXRhKCksICQodGhpcykuZGF0YSgpKTtcblxuICAgIGlmICh0aGlzLnRhZ05hbWUgPT09ICdBJyB8fCB0aGlzLnRhZ05hbWUgPT09ICdBUkVBJykge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICB2YXIgJHRhcmdldCA9ICQodGFyZ2V0KS5vbmUoRXZlbnQuU0hPVywgZnVuY3Rpb24gKHNob3dFdmVudCkge1xuICAgICAgaWYgKHNob3dFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICAvLyBvbmx5IHJlZ2lzdGVyIGZvY3VzIHJlc3RvcmVyIGlmIG1vZGFsIHdpbGwgYWN0dWFsbHkgZ2V0IHNob3duXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgJHRhcmdldC5vbmUoRXZlbnQuSElEREVOLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICgkKF90aGlzMTcpLmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgX3RoaXMxNy5mb2N1cygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIE1vZGFsLl9qUXVlcnlJbnRlcmZhY2UuY2FsbCgkKHRhcmdldCksIGNvbmZpZywgdGhpcyk7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogalF1ZXJ5XG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAkLmZuW05BTUVdID0gTW9kYWwuX2pRdWVyeUludGVyZmFjZTtcbiAgJC5mbltOQU1FXS5Db25zdHJ1Y3RvciA9IE1vZGFsO1xuICAkLmZuW05BTUVdLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgJC5mbltOQU1FXSA9IEpRVUVSWV9OT19DT05GTElDVDtcbiAgICByZXR1cm4gTW9kYWwuX2pRdWVyeUludGVyZmFjZTtcbiAgfTtcblxuICByZXR1cm4gTW9kYWw7XG59KGpRdWVyeSk7XG5cbi8qKlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIEJvb3RzdHJhcCAodjQuMC4wLWFscGhhLjYpOiBzY3JvbGxzcHkuanNcbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL3R3YnMvYm9vdHN0cmFwL2Jsb2IvbWFzdGVyL0xJQ0VOU0UpXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICovXG5cbnZhciBTY3JvbGxTcHkgPSBmdW5jdGlvbiAoJCkge1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ29uc3RhbnRzXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgTkFNRSA9ICdzY3JvbGxzcHknO1xuICB2YXIgVkVSU0lPTiA9ICc0LjAuMC1hbHBoYS42JztcbiAgdmFyIERBVEFfS0VZID0gJ2JzLnNjcm9sbHNweSc7XG4gIHZhciBFVkVOVF9LRVkgPSAnLicgKyBEQVRBX0tFWTtcbiAgdmFyIERBVEFfQVBJX0tFWSA9ICcuZGF0YS1hcGknO1xuICB2YXIgSlFVRVJZX05PX0NPTkZMSUNUID0gJC5mbltOQU1FXTtcblxuICB2YXIgRGVmYXVsdCA9IHtcbiAgICBvZmZzZXQ6IDEwLFxuICAgIG1ldGhvZDogJ2F1dG8nLFxuICAgIHRhcmdldDogJydcbiAgfTtcblxuICB2YXIgRGVmYXVsdFR5cGUgPSB7XG4gICAgb2Zmc2V0OiAnbnVtYmVyJyxcbiAgICBtZXRob2Q6ICdzdHJpbmcnLFxuICAgIHRhcmdldDogJyhzdHJpbmd8ZWxlbWVudCknXG4gIH07XG5cbiAgdmFyIEV2ZW50ID0ge1xuICAgIEFDVElWQVRFOiAnYWN0aXZhdGUnICsgRVZFTlRfS0VZLFxuICAgIFNDUk9MTDogJ3Njcm9sbCcgKyBFVkVOVF9LRVksXG4gICAgTE9BRF9EQVRBX0FQSTogJ2xvYWQnICsgRVZFTlRfS0VZICsgREFUQV9BUElfS0VZXG4gIH07XG5cbiAgdmFyIENsYXNzTmFtZSA9IHtcbiAgICBEUk9QRE9XTl9JVEVNOiAnZHJvcGRvd24taXRlbScsXG4gICAgRFJPUERPV05fTUVOVTogJ2Ryb3Bkb3duLW1lbnUnLFxuICAgIE5BVl9MSU5LOiAnbmF2LWxpbmsnLFxuICAgIE5BVjogJ25hdicsXG4gICAgQUNUSVZFOiAnYWN0aXZlJ1xuICB9O1xuXG4gIHZhciBTZWxlY3RvciA9IHtcbiAgICBEQVRBX1NQWTogJ1tkYXRhLXNweT1cInNjcm9sbFwiXScsXG4gICAgQUNUSVZFOiAnLmFjdGl2ZScsXG4gICAgTElTVF9JVEVNOiAnLmxpc3QtaXRlbScsXG4gICAgTEk6ICdsaScsXG4gICAgTElfRFJPUERPV046ICdsaS5kcm9wZG93bicsXG4gICAgTkFWX0xJTktTOiAnLm5hdi1saW5rJyxcbiAgICBEUk9QRE9XTjogJy5kcm9wZG93bicsXG4gICAgRFJPUERPV05fSVRFTVM6ICcuZHJvcGRvd24taXRlbScsXG4gICAgRFJPUERPV05fVE9HR0xFOiAnLmRyb3Bkb3duLXRvZ2dsZSdcbiAgfTtcblxuICB2YXIgT2Zmc2V0TWV0aG9kID0ge1xuICAgIE9GRlNFVDogJ29mZnNldCcsXG4gICAgUE9TSVRJT046ICdwb3NpdGlvbidcbiAgfTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIENsYXNzIERlZmluaXRpb25cbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBTY3JvbGxTcHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU2Nyb2xsU3B5KGVsZW1lbnQsIGNvbmZpZykge1xuICAgICAgdmFyIF90aGlzMTggPSB0aGlzO1xuXG4gICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgU2Nyb2xsU3B5KTtcblxuICAgICAgdGhpcy5fZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICB0aGlzLl9zY3JvbGxFbGVtZW50ID0gZWxlbWVudC50YWdOYW1lID09PSAnQk9EWScgPyB3aW5kb3cgOiBlbGVtZW50O1xuICAgICAgdGhpcy5fY29uZmlnID0gdGhpcy5fZ2V0Q29uZmlnKGNvbmZpZyk7XG4gICAgICB0aGlzLl9zZWxlY3RvciA9IHRoaXMuX2NvbmZpZy50YXJnZXQgKyAnICcgKyBTZWxlY3Rvci5OQVZfTElOS1MgKyAnLCcgKyAodGhpcy5fY29uZmlnLnRhcmdldCArICcgJyArIFNlbGVjdG9yLkRST1BET1dOX0lURU1TKTtcbiAgICAgIHRoaXMuX29mZnNldHMgPSBbXTtcbiAgICAgIHRoaXMuX3RhcmdldHMgPSBbXTtcbiAgICAgIHRoaXMuX2FjdGl2ZVRhcmdldCA9IG51bGw7XG4gICAgICB0aGlzLl9zY3JvbGxIZWlnaHQgPSAwO1xuXG4gICAgICAkKHRoaXMuX3Njcm9sbEVsZW1lbnQpLm9uKEV2ZW50LlNDUk9MTCwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHJldHVybiBfdGhpczE4Ll9wcm9jZXNzKGV2ZW50KTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgIHRoaXMuX3Byb2Nlc3MoKTtcbiAgICB9XG5cbiAgICAvLyBnZXR0ZXJzXG5cbiAgICAvLyBwdWJsaWNcblxuICAgIFNjcm9sbFNweS5wcm90b3R5cGUucmVmcmVzaCA9IGZ1bmN0aW9uIHJlZnJlc2goKSB7XG4gICAgICB2YXIgX3RoaXMxOSA9IHRoaXM7XG5cbiAgICAgIHZhciBhdXRvTWV0aG9kID0gdGhpcy5fc2Nyb2xsRWxlbWVudCAhPT0gdGhpcy5fc2Nyb2xsRWxlbWVudC53aW5kb3cgPyBPZmZzZXRNZXRob2QuUE9TSVRJT04gOiBPZmZzZXRNZXRob2QuT0ZGU0VUO1xuXG4gICAgICB2YXIgb2Zmc2V0TWV0aG9kID0gdGhpcy5fY29uZmlnLm1ldGhvZCA9PT0gJ2F1dG8nID8gYXV0b01ldGhvZCA6IHRoaXMuX2NvbmZpZy5tZXRob2Q7XG5cbiAgICAgIHZhciBvZmZzZXRCYXNlID0gb2Zmc2V0TWV0aG9kID09PSBPZmZzZXRNZXRob2QuUE9TSVRJT04gPyB0aGlzLl9nZXRTY3JvbGxUb3AoKSA6IDA7XG5cbiAgICAgIHRoaXMuX29mZnNldHMgPSBbXTtcbiAgICAgIHRoaXMuX3RhcmdldHMgPSBbXTtcblxuICAgICAgdGhpcy5fc2Nyb2xsSGVpZ2h0ID0gdGhpcy5fZ2V0U2Nyb2xsSGVpZ2h0KCk7XG5cbiAgICAgIHZhciB0YXJnZXRzID0gJC5tYWtlQXJyYXkoJCh0aGlzLl9zZWxlY3RvcikpO1xuXG4gICAgICB0YXJnZXRzLm1hcChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB2YXIgdGFyZ2V0ID0gdm9pZCAwO1xuICAgICAgICB2YXIgdGFyZ2V0U2VsZWN0b3IgPSBVdGlsLmdldFNlbGVjdG9yRnJvbUVsZW1lbnQoZWxlbWVudCk7XG5cbiAgICAgICAgaWYgKHRhcmdldFNlbGVjdG9yKSB7XG4gICAgICAgICAgdGFyZ2V0ID0gJCh0YXJnZXRTZWxlY3RvcilbMF07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGFyZ2V0ICYmICh0YXJnZXQub2Zmc2V0V2lkdGggfHwgdGFyZ2V0Lm9mZnNldEhlaWdodCkpIHtcbiAgICAgICAgICAvLyB0b2RvIChmYXQpOiByZW1vdmUgc2tldGNoIHJlbGlhbmNlIG9uIGpRdWVyeSBwb3NpdGlvbi9vZmZzZXRcbiAgICAgICAgICByZXR1cm4gWyQodGFyZ2V0KVtvZmZzZXRNZXRob2RdKCkudG9wICsgb2Zmc2V0QmFzZSwgdGFyZ2V0U2VsZWN0b3JdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIHJldHVybiBpdGVtO1xuICAgICAgfSkuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICByZXR1cm4gYVswXSAtIGJbMF07XG4gICAgICB9KS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIF90aGlzMTkuX29mZnNldHMucHVzaChpdGVtWzBdKTtcbiAgICAgICAgX3RoaXMxOS5fdGFyZ2V0cy5wdXNoKGl0ZW1bMV0pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIFNjcm9sbFNweS5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgICAkLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkpO1xuICAgICAgJCh0aGlzLl9zY3JvbGxFbGVtZW50KS5vZmYoRVZFTlRfS0VZKTtcblxuICAgICAgdGhpcy5fZWxlbWVudCA9IG51bGw7XG4gICAgICB0aGlzLl9zY3JvbGxFbGVtZW50ID0gbnVsbDtcbiAgICAgIHRoaXMuX2NvbmZpZyA9IG51bGw7XG4gICAgICB0aGlzLl9zZWxlY3RvciA9IG51bGw7XG4gICAgICB0aGlzLl9vZmZzZXRzID0gbnVsbDtcbiAgICAgIHRoaXMuX3RhcmdldHMgPSBudWxsO1xuICAgICAgdGhpcy5fYWN0aXZlVGFyZ2V0ID0gbnVsbDtcbiAgICAgIHRoaXMuX3Njcm9sbEhlaWdodCA9IG51bGw7XG4gICAgfTtcblxuICAgIC8vIHByaXZhdGVcblxuICAgIFNjcm9sbFNweS5wcm90b3R5cGUuX2dldENvbmZpZyA9IGZ1bmN0aW9uIF9nZXRDb25maWcoY29uZmlnKSB7XG4gICAgICBjb25maWcgPSAkLmV4dGVuZCh7fSwgRGVmYXVsdCwgY29uZmlnKTtcblxuICAgICAgaWYgKHR5cGVvZiBjb25maWcudGFyZ2V0ICE9PSAnc3RyaW5nJykge1xuICAgICAgICB2YXIgaWQgPSAkKGNvbmZpZy50YXJnZXQpLmF0dHIoJ2lkJyk7XG4gICAgICAgIGlmICghaWQpIHtcbiAgICAgICAgICBpZCA9IFV0aWwuZ2V0VUlEKE5BTUUpO1xuICAgICAgICAgICQoY29uZmlnLnRhcmdldCkuYXR0cignaWQnLCBpZCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uZmlnLnRhcmdldCA9ICcjJyArIGlkO1xuICAgICAgfVxuXG4gICAgICBVdGlsLnR5cGVDaGVja0NvbmZpZyhOQU1FLCBjb25maWcsIERlZmF1bHRUeXBlKTtcblxuICAgICAgcmV0dXJuIGNvbmZpZztcbiAgICB9O1xuXG4gICAgU2Nyb2xsU3B5LnByb3RvdHlwZS5fZ2V0U2Nyb2xsVG9wID0gZnVuY3Rpb24gX2dldFNjcm9sbFRvcCgpIHtcbiAgICAgIHJldHVybiB0aGlzLl9zY3JvbGxFbGVtZW50ID09PSB3aW5kb3cgPyB0aGlzLl9zY3JvbGxFbGVtZW50LnBhZ2VZT2Zmc2V0IDogdGhpcy5fc2Nyb2xsRWxlbWVudC5zY3JvbGxUb3A7XG4gICAgfTtcblxuICAgIFNjcm9sbFNweS5wcm90b3R5cGUuX2dldFNjcm9sbEhlaWdodCA9IGZ1bmN0aW9uIF9nZXRTY3JvbGxIZWlnaHQoKSB7XG4gICAgICByZXR1cm4gdGhpcy5fc2Nyb2xsRWxlbWVudC5zY3JvbGxIZWlnaHQgfHwgTWF0aC5tYXgoZG9jdW1lbnQuYm9keS5zY3JvbGxIZWlnaHQsIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxIZWlnaHQpO1xuICAgIH07XG5cbiAgICBTY3JvbGxTcHkucHJvdG90eXBlLl9nZXRPZmZzZXRIZWlnaHQgPSBmdW5jdGlvbiBfZ2V0T2Zmc2V0SGVpZ2h0KCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3Njcm9sbEVsZW1lbnQgPT09IHdpbmRvdyA/IHdpbmRvdy5pbm5lckhlaWdodCA6IHRoaXMuX3Njcm9sbEVsZW1lbnQub2Zmc2V0SGVpZ2h0O1xuICAgIH07XG5cbiAgICBTY3JvbGxTcHkucHJvdG90eXBlLl9wcm9jZXNzID0gZnVuY3Rpb24gX3Byb2Nlc3MoKSB7XG4gICAgICB2YXIgc2Nyb2xsVG9wID0gdGhpcy5fZ2V0U2Nyb2xsVG9wKCkgKyB0aGlzLl9jb25maWcub2Zmc2V0O1xuICAgICAgdmFyIHNjcm9sbEhlaWdodCA9IHRoaXMuX2dldFNjcm9sbEhlaWdodCgpO1xuICAgICAgdmFyIG1heFNjcm9sbCA9IHRoaXMuX2NvbmZpZy5vZmZzZXQgKyBzY3JvbGxIZWlnaHQgLSB0aGlzLl9nZXRPZmZzZXRIZWlnaHQoKTtcblxuICAgICAgaWYgKHRoaXMuX3Njcm9sbEhlaWdodCAhPT0gc2Nyb2xsSGVpZ2h0KSB7XG4gICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2Nyb2xsVG9wID49IG1heFNjcm9sbCkge1xuICAgICAgICB2YXIgdGFyZ2V0ID0gdGhpcy5fdGFyZ2V0c1t0aGlzLl90YXJnZXRzLmxlbmd0aCAtIDFdO1xuXG4gICAgICAgIGlmICh0aGlzLl9hY3RpdmVUYXJnZXQgIT09IHRhcmdldCkge1xuICAgICAgICAgIHRoaXMuX2FjdGl2YXRlKHRhcmdldCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fYWN0aXZlVGFyZ2V0ICYmIHNjcm9sbFRvcCA8IHRoaXMuX29mZnNldHNbMF0gJiYgdGhpcy5fb2Zmc2V0c1swXSA+IDApIHtcbiAgICAgICAgdGhpcy5fYWN0aXZlVGFyZ2V0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fY2xlYXIoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gdGhpcy5fb2Zmc2V0cy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgdmFyIGlzQWN0aXZlVGFyZ2V0ID0gdGhpcy5fYWN0aXZlVGFyZ2V0ICE9PSB0aGlzLl90YXJnZXRzW2ldICYmIHNjcm9sbFRvcCA+PSB0aGlzLl9vZmZzZXRzW2ldICYmICh0aGlzLl9vZmZzZXRzW2kgKyAxXSA9PT0gdW5kZWZpbmVkIHx8IHNjcm9sbFRvcCA8IHRoaXMuX29mZnNldHNbaSArIDFdKTtcblxuICAgICAgICBpZiAoaXNBY3RpdmVUYXJnZXQpIHtcbiAgICAgICAgICB0aGlzLl9hY3RpdmF0ZSh0aGlzLl90YXJnZXRzW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBTY3JvbGxTcHkucHJvdG90eXBlLl9hY3RpdmF0ZSA9IGZ1bmN0aW9uIF9hY3RpdmF0ZSh0YXJnZXQpIHtcbiAgICAgIHRoaXMuX2FjdGl2ZVRhcmdldCA9IHRhcmdldDtcblxuICAgICAgdGhpcy5fY2xlYXIoKTtcblxuICAgICAgdmFyIHF1ZXJpZXMgPSB0aGlzLl9zZWxlY3Rvci5zcGxpdCgnLCcpO1xuICAgICAgcXVlcmllcyA9IHF1ZXJpZXMubWFwKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgICByZXR1cm4gc2VsZWN0b3IgKyAnW2RhdGEtdGFyZ2V0PVwiJyArIHRhcmdldCArICdcIl0sJyArIChzZWxlY3RvciArICdbaHJlZj1cIicgKyB0YXJnZXQgKyAnXCJdJyk7XG4gICAgICB9KTtcblxuICAgICAgdmFyICRsaW5rID0gJChxdWVyaWVzLmpvaW4oJywnKSk7XG5cbiAgICAgIGlmICgkbGluay5oYXNDbGFzcyhDbGFzc05hbWUuRFJPUERPV05fSVRFTSkpIHtcbiAgICAgICAgJGxpbmsuY2xvc2VzdChTZWxlY3Rvci5EUk9QRE9XTikuZmluZChTZWxlY3Rvci5EUk9QRE9XTl9UT0dHTEUpLmFkZENsYXNzKENsYXNzTmFtZS5BQ1RJVkUpO1xuICAgICAgICAkbGluay5hZGRDbGFzcyhDbGFzc05hbWUuQUNUSVZFKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHRvZG8gKGZhdCkgdGhpcyBpcyBraW5kYSBzdXMuLi5cbiAgICAgICAgLy8gcmVjdXJzaXZlbHkgYWRkIGFjdGl2ZXMgdG8gdGVzdGVkIG5hdi1saW5rc1xuICAgICAgICAkbGluay5wYXJlbnRzKFNlbGVjdG9yLkxJKS5maW5kKCc+ICcgKyBTZWxlY3Rvci5OQVZfTElOS1MpLmFkZENsYXNzKENsYXNzTmFtZS5BQ1RJVkUpO1xuICAgICAgfVxuXG4gICAgICAkKHRoaXMuX3Njcm9sbEVsZW1lbnQpLnRyaWdnZXIoRXZlbnQuQUNUSVZBVEUsIHtcbiAgICAgICAgcmVsYXRlZFRhcmdldDogdGFyZ2V0XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgU2Nyb2xsU3B5LnByb3RvdHlwZS5fY2xlYXIgPSBmdW5jdGlvbiBfY2xlYXIoKSB7XG4gICAgICAkKHRoaXMuX3NlbGVjdG9yKS5maWx0ZXIoU2VsZWN0b3IuQUNUSVZFKS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuQUNUSVZFKTtcbiAgICB9O1xuXG4gICAgLy8gc3RhdGljXG5cbiAgICBTY3JvbGxTcHkuX2pRdWVyeUludGVyZmFjZSA9IGZ1bmN0aW9uIF9qUXVlcnlJbnRlcmZhY2UoY29uZmlnKSB7XG4gICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSAkKHRoaXMpLmRhdGEoREFUQV9LRVkpO1xuICAgICAgICB2YXIgX2NvbmZpZyA9ICh0eXBlb2YgY29uZmlnID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZihjb25maWcpKSA9PT0gJ29iamVjdCcgJiYgY29uZmlnO1xuXG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIGRhdGEgPSBuZXcgU2Nyb2xsU3B5KHRoaXMsIF9jb25maWcpO1xuICAgICAgICAgICQodGhpcykuZGF0YShEQVRBX0tFWSwgZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBpZiAoZGF0YVtjb25maWddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gbWV0aG9kIG5hbWVkIFwiJyArIGNvbmZpZyArICdcIicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkYXRhW2NvbmZpZ10oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIF9jcmVhdGVDbGFzcyhTY3JvbGxTcHksIG51bGwsIFt7XG4gICAgICBrZXk6ICdWRVJTSU9OJyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gVkVSU0lPTjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6ICdEZWZhdWx0JyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRGVmYXVsdDtcbiAgICAgIH1cbiAgICB9XSk7XG5cbiAgICByZXR1cm4gU2Nyb2xsU3B5O1xuICB9KCk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgJCh3aW5kb3cpLm9uKEV2ZW50LkxPQURfREFUQV9BUEksIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2Nyb2xsU3B5cyA9ICQubWFrZUFycmF5KCQoU2VsZWN0b3IuREFUQV9TUFkpKTtcblxuICAgIGZvciAodmFyIGkgPSBzY3JvbGxTcHlzLmxlbmd0aDsgaS0tOykge1xuICAgICAgdmFyICRzcHkgPSAkKHNjcm9sbFNweXNbaV0pO1xuICAgICAgU2Nyb2xsU3B5Ll9qUXVlcnlJbnRlcmZhY2UuY2FsbCgkc3B5LCAkc3B5LmRhdGEoKSk7XG4gICAgfVxuICB9KTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIGpRdWVyeVxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgJC5mbltOQU1FXSA9IFNjcm9sbFNweS5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUVdLkNvbnN0cnVjdG9yID0gU2Nyb2xsU3B5O1xuICAkLmZuW05BTUVdLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgJC5mbltOQU1FXSA9IEpRVUVSWV9OT19DT05GTElDVDtcbiAgICByZXR1cm4gU2Nyb2xsU3B5Ll9qUXVlcnlJbnRlcmZhY2U7XG4gIH07XG5cbiAgcmV0dXJuIFNjcm9sbFNweTtcbn0oalF1ZXJ5KTtcblxuLyoqXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogQm9vdHN0cmFwICh2NC4wLjAtYWxwaGEuNik6IHRhYi5qc1xuICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vdHdicy9ib290c3RyYXAvYmxvYi9tYXN0ZXIvTElDRU5TRSlcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKi9cblxudmFyIFRhYiA9IGZ1bmN0aW9uICgkKSB7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FID0gJ3RhYic7XG4gIHZhciBWRVJTSU9OID0gJzQuMC4wLWFscGhhLjYnO1xuICB2YXIgREFUQV9LRVkgPSAnYnMudGFiJztcbiAgdmFyIEVWRU5UX0tFWSA9ICcuJyArIERBVEFfS0VZO1xuICB2YXIgREFUQV9BUElfS0VZID0gJy5kYXRhLWFwaSc7XG4gIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QgPSAkLmZuW05BTUVdO1xuICB2YXIgVFJBTlNJVElPTl9EVVJBVElPTiA9IDE1MDtcblxuICB2YXIgRXZlbnQgPSB7XG4gICAgSElERTogJ2hpZGUnICsgRVZFTlRfS0VZLFxuICAgIEhJRERFTjogJ2hpZGRlbicgKyBFVkVOVF9LRVksXG4gICAgU0hPVzogJ3Nob3cnICsgRVZFTlRfS0VZLFxuICAgIFNIT1dOOiAnc2hvd24nICsgRVZFTlRfS0VZLFxuICAgIENMSUNLX0RBVEFfQVBJOiAnY2xpY2snICsgRVZFTlRfS0VZICsgREFUQV9BUElfS0VZXG4gIH07XG5cbiAgdmFyIENsYXNzTmFtZSA9IHtcbiAgICBEUk9QRE9XTl9NRU5VOiAnZHJvcGRvd24tbWVudScsXG4gICAgQUNUSVZFOiAnYWN0aXZlJyxcbiAgICBESVNBQkxFRDogJ2Rpc2FibGVkJyxcbiAgICBGQURFOiAnZmFkZScsXG4gICAgU0hPVzogJ3Nob3cnXG4gIH07XG5cbiAgdmFyIFNlbGVjdG9yID0ge1xuICAgIEE6ICdhJyxcbiAgICBMSTogJ2xpJyxcbiAgICBEUk9QRE9XTjogJy5kcm9wZG93bicsXG4gICAgTElTVDogJ3VsOm5vdCguZHJvcGRvd24tbWVudSksIG9sOm5vdCguZHJvcGRvd24tbWVudSksIG5hdjpub3QoLmRyb3Bkb3duLW1lbnUpJyxcbiAgICBGQURFX0NISUxEOiAnPiAubmF2LWl0ZW0gLmZhZGUsID4gLmZhZGUnLFxuICAgIEFDVElWRTogJy5hY3RpdmUnLFxuICAgIEFDVElWRV9DSElMRDogJz4gLm5hdi1pdGVtID4gLmFjdGl2ZSwgPiAuYWN0aXZlJyxcbiAgICBEQVRBX1RPR0dMRTogJ1tkYXRhLXRvZ2dsZT1cInRhYlwiXSwgW2RhdGEtdG9nZ2xlPVwicGlsbFwiXScsXG4gICAgRFJPUERPV05fVE9HR0xFOiAnLmRyb3Bkb3duLXRvZ2dsZScsXG4gICAgRFJPUERPV05fQUNUSVZFX0NISUxEOiAnPiAuZHJvcGRvd24tbWVudSAuYWN0aXZlJ1xuICB9O1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ2xhc3MgRGVmaW5pdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIFRhYiA9IGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBUYWIoZWxlbWVudCkge1xuICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIFRhYik7XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBlbGVtZW50O1xuICAgIH1cblxuICAgIC8vIGdldHRlcnNcblxuICAgIC8vIHB1YmxpY1xuXG4gICAgVGFiLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gc2hvdygpIHtcbiAgICAgIHZhciBfdGhpczIwID0gdGhpcztcblxuICAgICAgaWYgKHRoaXMuX2VsZW1lbnQucGFyZW50Tm9kZSAmJiB0aGlzLl9lbGVtZW50LnBhcmVudE5vZGUubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFICYmICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkFDVElWRSkgfHwgJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUuRElTQUJMRUQpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHRhcmdldCA9IHZvaWQgMDtcbiAgICAgIHZhciBwcmV2aW91cyA9IHZvaWQgMDtcbiAgICAgIHZhciBsaXN0RWxlbWVudCA9ICQodGhpcy5fZWxlbWVudCkuY2xvc2VzdChTZWxlY3Rvci5MSVNUKVswXTtcbiAgICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudCh0aGlzLl9lbGVtZW50KTtcblxuICAgICAgaWYgKGxpc3RFbGVtZW50KSB7XG4gICAgICAgIHByZXZpb3VzID0gJC5tYWtlQXJyYXkoJChsaXN0RWxlbWVudCkuZmluZChTZWxlY3Rvci5BQ1RJVkUpKTtcbiAgICAgICAgcHJldmlvdXMgPSBwcmV2aW91c1twcmV2aW91cy5sZW5ndGggLSAxXTtcbiAgICAgIH1cblxuICAgICAgdmFyIGhpZGVFdmVudCA9ICQuRXZlbnQoRXZlbnQuSElERSwge1xuICAgICAgICByZWxhdGVkVGFyZ2V0OiB0aGlzLl9lbGVtZW50XG4gICAgICB9KTtcblxuICAgICAgdmFyIHNob3dFdmVudCA9ICQuRXZlbnQoRXZlbnQuU0hPVywge1xuICAgICAgICByZWxhdGVkVGFyZ2V0OiBwcmV2aW91c1xuICAgICAgfSk7XG5cbiAgICAgIGlmIChwcmV2aW91cykge1xuICAgICAgICAkKHByZXZpb3VzKS50cmlnZ2VyKGhpZGVFdmVudCk7XG4gICAgICB9XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkudHJpZ2dlcihzaG93RXZlbnQpO1xuXG4gICAgICBpZiAoc2hvd0V2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpIHx8IGhpZGVFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgICB0YXJnZXQgPSAkKHNlbGVjdG9yKVswXTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fYWN0aXZhdGUodGhpcy5fZWxlbWVudCwgbGlzdEVsZW1lbnQpO1xuXG4gICAgICB2YXIgY29tcGxldGUgPSBmdW5jdGlvbiBjb21wbGV0ZSgpIHtcbiAgICAgICAgdmFyIGhpZGRlbkV2ZW50ID0gJC5FdmVudChFdmVudC5ISURERU4sIHtcbiAgICAgICAgICByZWxhdGVkVGFyZ2V0OiBfdGhpczIwLl9lbGVtZW50XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBzaG93bkV2ZW50ID0gJC5FdmVudChFdmVudC5TSE9XTiwge1xuICAgICAgICAgIHJlbGF0ZWRUYXJnZXQ6IHByZXZpb3VzXG4gICAgICAgIH0pO1xuXG4gICAgICAgICQocHJldmlvdXMpLnRyaWdnZXIoaGlkZGVuRXZlbnQpO1xuICAgICAgICAkKF90aGlzMjAuX2VsZW1lbnQpLnRyaWdnZXIoc2hvd25FdmVudCk7XG4gICAgICB9O1xuXG4gICAgICBpZiAodGFyZ2V0KSB7XG4gICAgICAgIHRoaXMuX2FjdGl2YXRlKHRhcmdldCwgdGFyZ2V0LnBhcmVudE5vZGUsIGNvbXBsZXRlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbXBsZXRlKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIFRhYi5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgICAkLnJlbW92ZUNsYXNzKHRoaXMuX2VsZW1lbnQsIERBVEFfS0VZKTtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgIH07XG5cbiAgICAvLyBwcml2YXRlXG5cbiAgICBUYWIucHJvdG90eXBlLl9hY3RpdmF0ZSA9IGZ1bmN0aW9uIF9hY3RpdmF0ZShlbGVtZW50LCBjb250YWluZXIsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgX3RoaXMyMSA9IHRoaXM7XG5cbiAgICAgIHZhciBhY3RpdmUgPSAkKGNvbnRhaW5lcikuZmluZChTZWxlY3Rvci5BQ1RJVkVfQ0hJTEQpWzBdO1xuICAgICAgdmFyIGlzVHJhbnNpdGlvbmluZyA9IGNhbGxiYWNrICYmIFV0aWwuc3VwcG9ydHNUcmFuc2l0aW9uRW5kKCkgJiYgKGFjdGl2ZSAmJiAkKGFjdGl2ZSkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkZBREUpIHx8IEJvb2xlYW4oJChjb250YWluZXIpLmZpbmQoU2VsZWN0b3IuRkFERV9DSElMRClbMF0pKTtcblxuICAgICAgdmFyIGNvbXBsZXRlID0gZnVuY3Rpb24gY29tcGxldGUoKSB7XG4gICAgICAgIHJldHVybiBfdGhpczIxLl90cmFuc2l0aW9uQ29tcGxldGUoZWxlbWVudCwgYWN0aXZlLCBpc1RyYW5zaXRpb25pbmcsIGNhbGxiYWNrKTtcbiAgICAgIH07XG5cbiAgICAgIGlmIChhY3RpdmUgJiYgaXNUcmFuc2l0aW9uaW5nKSB7XG4gICAgICAgICQoYWN0aXZlKS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgY29tcGxldGUpLmVtdWxhdGVUcmFuc2l0aW9uRW5kKFRSQU5TSVRJT05fRFVSQVRJT04pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGxldGUoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGFjdGl2ZSkge1xuICAgICAgICAkKGFjdGl2ZSkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBUYWIucHJvdG90eXBlLl90cmFuc2l0aW9uQ29tcGxldGUgPSBmdW5jdGlvbiBfdHJhbnNpdGlvbkNvbXBsZXRlKGVsZW1lbnQsIGFjdGl2ZSwgaXNUcmFuc2l0aW9uaW5nLCBjYWxsYmFjaykge1xuICAgICAgaWYgKGFjdGl2ZSkge1xuICAgICAgICAkKGFjdGl2ZSkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLkFDVElWRSk7XG5cbiAgICAgICAgdmFyIGRyb3Bkb3duQ2hpbGQgPSAkKGFjdGl2ZS5wYXJlbnROb2RlKS5maW5kKFNlbGVjdG9yLkRST1BET1dOX0FDVElWRV9DSElMRClbMF07XG5cbiAgICAgICAgaWYgKGRyb3Bkb3duQ2hpbGQpIHtcbiAgICAgICAgICAkKGRyb3Bkb3duQ2hpbGQpLnJlbW92ZUNsYXNzKENsYXNzTmFtZS5BQ1RJVkUpO1xuICAgICAgICB9XG5cbiAgICAgICAgYWN0aXZlLnNldEF0dHJpYnV0ZSgnYXJpYS1leHBhbmRlZCcsIGZhbHNlKTtcbiAgICAgIH1cblxuICAgICAgJChlbGVtZW50KS5hZGRDbGFzcyhDbGFzc05hbWUuQUNUSVZFKTtcbiAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdhcmlhLWV4cGFuZGVkJywgdHJ1ZSk7XG5cbiAgICAgIGlmIChpc1RyYW5zaXRpb25pbmcpIHtcbiAgICAgICAgVXRpbC5yZWZsb3coZWxlbWVudCk7XG4gICAgICAgICQoZWxlbWVudCkuYWRkQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJChlbGVtZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuRkFERSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChlbGVtZW50LnBhcmVudE5vZGUgJiYgJChlbGVtZW50LnBhcmVudE5vZGUpLmhhc0NsYXNzKENsYXNzTmFtZS5EUk9QRE9XTl9NRU5VKSkge1xuXG4gICAgICAgIHZhciBkcm9wZG93bkVsZW1lbnQgPSAkKGVsZW1lbnQpLmNsb3Nlc3QoU2VsZWN0b3IuRFJPUERPV04pWzBdO1xuICAgICAgICBpZiAoZHJvcGRvd25FbGVtZW50KSB7XG4gICAgICAgICAgJChkcm9wZG93bkVsZW1lbnQpLmZpbmQoU2VsZWN0b3IuRFJPUERPV05fVE9HR0xFKS5hZGRDbGFzcyhDbGFzc05hbWUuQUNUSVZFKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdhcmlhLWV4cGFuZGVkJywgdHJ1ZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBzdGF0aWNcblxuICAgIFRhYi5falF1ZXJ5SW50ZXJmYWNlID0gZnVuY3Rpb24gX2pRdWVyeUludGVyZmFjZShjb25maWcpIHtcbiAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpO1xuICAgICAgICB2YXIgZGF0YSA9ICR0aGlzLmRhdGEoREFUQV9LRVkpO1xuXG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIGRhdGEgPSBuZXcgVGFiKHRoaXMpO1xuICAgICAgICAgICR0aGlzLmRhdGEoREFUQV9LRVksIGRhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgaWYgKGRhdGFbY29uZmlnXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIG1ldGhvZCBuYW1lZCBcIicgKyBjb25maWcgKyAnXCInKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGF0YVtjb25maWddKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBfY3JlYXRlQ2xhc3MoVGFiLCBudWxsLCBbe1xuICAgICAga2V5OiAnVkVSU0lPTicsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIFZFUlNJT047XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIFRhYjtcbiAgfSgpO1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogRGF0YSBBcGkgaW1wbGVtZW50YXRpb25cbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gICQoZG9jdW1lbnQpLm9uKEV2ZW50LkNMSUNLX0RBVEFfQVBJLCBTZWxlY3Rvci5EQVRBX1RPR0dMRSwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBUYWIuX2pRdWVyeUludGVyZmFjZS5jYWxsKCQodGhpcyksICdzaG93Jyk7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogalF1ZXJ5XG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAkLmZuW05BTUVdID0gVGFiLl9qUXVlcnlJbnRlcmZhY2U7XG4gICQuZm5bTkFNRV0uQ29uc3RydWN0b3IgPSBUYWI7XG4gICQuZm5bTkFNRV0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUVdID0gSlFVRVJZX05PX0NPTkZMSUNUO1xuICAgIHJldHVybiBUYWIuX2pRdWVyeUludGVyZmFjZTtcbiAgfTtcblxuICByZXR1cm4gVGFiO1xufShqUXVlcnkpO1xuXG4vKiBnbG9iYWwgVGV0aGVyICovXG5cbi8qKlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIEJvb3RzdHJhcCAodjQuMC4wLWFscGhhLjYpOiB0b29sdGlwLmpzXG4gKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS90d2JzL2Jvb3RzdHJhcC9ibG9iL21hc3Rlci9MSUNFTlNFKVxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqL1xuXG52YXIgVG9vbHRpcCA9IGZ1bmN0aW9uICgkKSB7XG5cbiAgLyoqXG4gICAqIENoZWNrIGZvciBUZXRoZXIgZGVwZW5kZW5jeVxuICAgKiBUZXRoZXIgLSBodHRwOi8vdGV0aGVyLmlvL1xuICAgKi9cbiAgaWYgKHR5cGVvZiBUZXRoZXIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCb290c3RyYXAgdG9vbHRpcHMgcmVxdWlyZSBUZXRoZXIgKGh0dHA6Ly90ZXRoZXIuaW8vKScpO1xuICB9XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FID0gJ3Rvb2x0aXAnO1xuICB2YXIgVkVSU0lPTiA9ICc0LjAuMC1hbHBoYS42JztcbiAgdmFyIERBVEFfS0VZID0gJ2JzLnRvb2x0aXAnO1xuICB2YXIgRVZFTlRfS0VZID0gJy4nICsgREFUQV9LRVk7XG4gIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QgPSAkLmZuW05BTUVdO1xuICB2YXIgVFJBTlNJVElPTl9EVVJBVElPTiA9IDE1MDtcbiAgdmFyIENMQVNTX1BSRUZJWCA9ICdicy10ZXRoZXInO1xuXG4gIHZhciBEZWZhdWx0ID0ge1xuICAgIGFuaW1hdGlvbjogdHJ1ZSxcbiAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJ0b29sdGlwXCIgcm9sZT1cInRvb2x0aXBcIj4nICsgJzxkaXYgY2xhc3M9XCJ0b29sdGlwLWlubmVyXCI+PC9kaXY+PC9kaXY+JyxcbiAgICB0cmlnZ2VyOiAnaG92ZXIgZm9jdXMnLFxuICAgIHRpdGxlOiAnJyxcbiAgICBkZWxheTogMCxcbiAgICBodG1sOiBmYWxzZSxcbiAgICBzZWxlY3RvcjogZmFsc2UsXG4gICAgcGxhY2VtZW50OiAndG9wJyxcbiAgICBvZmZzZXQ6ICcwIDAnLFxuICAgIGNvbnN0cmFpbnRzOiBbXSxcbiAgICBjb250YWluZXI6IGZhbHNlXG4gIH07XG5cbiAgdmFyIERlZmF1bHRUeXBlID0ge1xuICAgIGFuaW1hdGlvbjogJ2Jvb2xlYW4nLFxuICAgIHRlbXBsYXRlOiAnc3RyaW5nJyxcbiAgICB0aXRsZTogJyhzdHJpbmd8ZWxlbWVudHxmdW5jdGlvbiknLFxuICAgIHRyaWdnZXI6ICdzdHJpbmcnLFxuICAgIGRlbGF5OiAnKG51bWJlcnxvYmplY3QpJyxcbiAgICBodG1sOiAnYm9vbGVhbicsXG4gICAgc2VsZWN0b3I6ICcoc3RyaW5nfGJvb2xlYW4pJyxcbiAgICBwbGFjZW1lbnQ6ICcoc3RyaW5nfGZ1bmN0aW9uKScsXG4gICAgb2Zmc2V0OiAnc3RyaW5nJyxcbiAgICBjb25zdHJhaW50czogJ2FycmF5JyxcbiAgICBjb250YWluZXI6ICcoc3RyaW5nfGVsZW1lbnR8Ym9vbGVhbiknXG4gIH07XG5cbiAgdmFyIEF0dGFjaG1lbnRNYXAgPSB7XG4gICAgVE9QOiAnYm90dG9tIGNlbnRlcicsXG4gICAgUklHSFQ6ICdtaWRkbGUgbGVmdCcsXG4gICAgQk9UVE9NOiAndG9wIGNlbnRlcicsXG4gICAgTEVGVDogJ21pZGRsZSByaWdodCdcbiAgfTtcblxuICB2YXIgSG92ZXJTdGF0ZSA9IHtcbiAgICBTSE9XOiAnc2hvdycsXG4gICAgT1VUOiAnb3V0J1xuICB9O1xuXG4gIHZhciBFdmVudCA9IHtcbiAgICBISURFOiAnaGlkZScgKyBFVkVOVF9LRVksXG4gICAgSElEREVOOiAnaGlkZGVuJyArIEVWRU5UX0tFWSxcbiAgICBTSE9XOiAnc2hvdycgKyBFVkVOVF9LRVksXG4gICAgU0hPV046ICdzaG93bicgKyBFVkVOVF9LRVksXG4gICAgSU5TRVJURUQ6ICdpbnNlcnRlZCcgKyBFVkVOVF9LRVksXG4gICAgQ0xJQ0s6ICdjbGljaycgKyBFVkVOVF9LRVksXG4gICAgRk9DVVNJTjogJ2ZvY3VzaW4nICsgRVZFTlRfS0VZLFxuICAgIEZPQ1VTT1VUOiAnZm9jdXNvdXQnICsgRVZFTlRfS0VZLFxuICAgIE1PVVNFRU5URVI6ICdtb3VzZWVudGVyJyArIEVWRU5UX0tFWSxcbiAgICBNT1VTRUxFQVZFOiAnbW91c2VsZWF2ZScgKyBFVkVOVF9LRVlcbiAgfTtcblxuICB2YXIgQ2xhc3NOYW1lID0ge1xuICAgIEZBREU6ICdmYWRlJyxcbiAgICBTSE9XOiAnc2hvdydcbiAgfTtcblxuICB2YXIgU2VsZWN0b3IgPSB7XG4gICAgVE9PTFRJUDogJy50b29sdGlwJyxcbiAgICBUT09MVElQX0lOTkVSOiAnLnRvb2x0aXAtaW5uZXInXG4gIH07XG5cbiAgdmFyIFRldGhlckNsYXNzID0ge1xuICAgIGVsZW1lbnQ6IGZhbHNlLFxuICAgIGVuYWJsZWQ6IGZhbHNlXG4gIH07XG5cbiAgdmFyIFRyaWdnZXIgPSB7XG4gICAgSE9WRVI6ICdob3ZlcicsXG4gICAgRk9DVVM6ICdmb2N1cycsXG4gICAgQ0xJQ0s6ICdjbGljaycsXG4gICAgTUFOVUFMOiAnbWFudWFsJ1xuICB9O1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ2xhc3MgRGVmaW5pdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIFRvb2x0aXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gVG9vbHRpcChlbGVtZW50LCBjb25maWcpIHtcbiAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBUb29sdGlwKTtcblxuICAgICAgLy8gcHJpdmF0ZVxuICAgICAgdGhpcy5faXNFbmFibGVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuX3RpbWVvdXQgPSAwO1xuICAgICAgdGhpcy5faG92ZXJTdGF0ZSA9ICcnO1xuICAgICAgdGhpcy5fYWN0aXZlVHJpZ2dlciA9IHt9O1xuICAgICAgdGhpcy5faXNUcmFuc2l0aW9uaW5nID0gZmFsc2U7XG4gICAgICB0aGlzLl90ZXRoZXIgPSBudWxsO1xuXG4gICAgICAvLyBwcm90ZWN0ZWRcbiAgICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICB0aGlzLmNvbmZpZyA9IHRoaXMuX2dldENvbmZpZyhjb25maWcpO1xuICAgICAgdGhpcy50aXAgPSBudWxsO1xuXG4gICAgICB0aGlzLl9zZXRMaXN0ZW5lcnMoKTtcbiAgICB9XG5cbiAgICAvLyBnZXR0ZXJzXG5cbiAgICAvLyBwdWJsaWNcblxuICAgIFRvb2x0aXAucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uIGVuYWJsZSgpIHtcbiAgICAgIHRoaXMuX2lzRW5hYmxlZCA9IHRydWU7XG4gICAgfTtcblxuICAgIFRvb2x0aXAucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiBkaXNhYmxlKCkge1xuICAgICAgdGhpcy5faXNFbmFibGVkID0gZmFsc2U7XG4gICAgfTtcblxuICAgIFRvb2x0aXAucHJvdG90eXBlLnRvZ2dsZUVuYWJsZWQgPSBmdW5jdGlvbiB0b2dnbGVFbmFibGVkKCkge1xuICAgICAgdGhpcy5faXNFbmFibGVkID0gIXRoaXMuX2lzRW5hYmxlZDtcbiAgICB9O1xuXG4gICAgVG9vbHRpcC5wcm90b3R5cGUudG9nZ2xlID0gZnVuY3Rpb24gdG9nZ2xlKGV2ZW50KSB7XG4gICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgdmFyIGRhdGFLZXkgPSB0aGlzLmNvbnN0cnVjdG9yLkRBVEFfS0VZO1xuICAgICAgICB2YXIgY29udGV4dCA9ICQoZXZlbnQuY3VycmVudFRhcmdldCkuZGF0YShkYXRhS2V5KTtcblxuICAgICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgICBjb250ZXh0ID0gbmV3IHRoaXMuY29uc3RydWN0b3IoZXZlbnQuY3VycmVudFRhcmdldCwgdGhpcy5fZ2V0RGVsZWdhdGVDb25maWcoKSk7XG4gICAgICAgICAgJChldmVudC5jdXJyZW50VGFyZ2V0KS5kYXRhKGRhdGFLZXksIGNvbnRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGV4dC5fYWN0aXZlVHJpZ2dlci5jbGljayA9ICFjb250ZXh0Ll9hY3RpdmVUcmlnZ2VyLmNsaWNrO1xuXG4gICAgICAgIGlmIChjb250ZXh0Ll9pc1dpdGhBY3RpdmVUcmlnZ2VyKCkpIHtcbiAgICAgICAgICBjb250ZXh0Ll9lbnRlcihudWxsLCBjb250ZXh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb250ZXh0Ll9sZWF2ZShudWxsLCBjb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcblxuICAgICAgICBpZiAoJCh0aGlzLmdldFRpcEVsZW1lbnQoKSkuaGFzQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpKSB7XG4gICAgICAgICAgdGhpcy5fbGVhdmUobnVsbCwgdGhpcyk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fZW50ZXIobnVsbCwgdGhpcyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIFRvb2x0aXAucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX3RpbWVvdXQpO1xuXG4gICAgICB0aGlzLmNsZWFudXBUZXRoZXIoKTtcblxuICAgICAgJC5yZW1vdmVEYXRhKHRoaXMuZWxlbWVudCwgdGhpcy5jb25zdHJ1Y3Rvci5EQVRBX0tFWSk7XG5cbiAgICAgICQodGhpcy5lbGVtZW50KS5vZmYodGhpcy5jb25zdHJ1Y3Rvci5FVkVOVF9LRVkpO1xuICAgICAgJCh0aGlzLmVsZW1lbnQpLmNsb3Nlc3QoJy5tb2RhbCcpLm9mZignaGlkZS5icy5tb2RhbCcpO1xuXG4gICAgICBpZiAodGhpcy50aXApIHtcbiAgICAgICAgJCh0aGlzLnRpcCkucmVtb3ZlKCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2lzRW5hYmxlZCA9IG51bGw7XG4gICAgICB0aGlzLl90aW1lb3V0ID0gbnVsbDtcbiAgICAgIHRoaXMuX2hvdmVyU3RhdGUgPSBudWxsO1xuICAgICAgdGhpcy5fYWN0aXZlVHJpZ2dlciA9IG51bGw7XG4gICAgICB0aGlzLl90ZXRoZXIgPSBudWxsO1xuXG4gICAgICB0aGlzLmVsZW1lbnQgPSBudWxsO1xuICAgICAgdGhpcy5jb25maWcgPSBudWxsO1xuICAgICAgdGhpcy50aXAgPSBudWxsO1xuICAgIH07XG5cbiAgICBUb29sdGlwLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gc2hvdygpIHtcbiAgICAgIHZhciBfdGhpczIyID0gdGhpcztcblxuICAgICAgaWYgKCQodGhpcy5lbGVtZW50KS5jc3MoJ2Rpc3BsYXknKSA9PT0gJ25vbmUnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHVzZSBzaG93IG9uIHZpc2libGUgZWxlbWVudHMnKTtcbiAgICAgIH1cblxuICAgICAgdmFyIHNob3dFdmVudCA9ICQuRXZlbnQodGhpcy5jb25zdHJ1Y3Rvci5FdmVudC5TSE9XKTtcbiAgICAgIGlmICh0aGlzLmlzV2l0aENvbnRlbnQoKSAmJiB0aGlzLl9pc0VuYWJsZWQpIHtcbiAgICAgICAgaWYgKHRoaXMuX2lzVHJhbnNpdGlvbmluZykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVG9vbHRpcCBpcyB0cmFuc2l0aW9uaW5nJyk7XG4gICAgICAgIH1cbiAgICAgICAgJCh0aGlzLmVsZW1lbnQpLnRyaWdnZXIoc2hvd0V2ZW50KTtcblxuICAgICAgICB2YXIgaXNJblRoZURvbSA9ICQuY29udGFpbnModGhpcy5lbGVtZW50Lm93bmVyRG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LCB0aGlzLmVsZW1lbnQpO1xuXG4gICAgICAgIGlmIChzaG93RXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkgfHwgIWlzSW5UaGVEb20pIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdGlwID0gdGhpcy5nZXRUaXBFbGVtZW50KCk7XG4gICAgICAgIHZhciB0aXBJZCA9IFV0aWwuZ2V0VUlEKHRoaXMuY29uc3RydWN0b3IuTkFNRSk7XG5cbiAgICAgICAgdGlwLnNldEF0dHJpYnV0ZSgnaWQnLCB0aXBJZCk7XG4gICAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2FyaWEtZGVzY3JpYmVkYnknLCB0aXBJZCk7XG5cbiAgICAgICAgdGhpcy5zZXRDb250ZW50KCk7XG5cbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmFuaW1hdGlvbikge1xuICAgICAgICAgICQodGlwKS5hZGRDbGFzcyhDbGFzc05hbWUuRkFERSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcGxhY2VtZW50ID0gdHlwZW9mIHRoaXMuY29uZmlnLnBsYWNlbWVudCA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuY29uZmlnLnBsYWNlbWVudC5jYWxsKHRoaXMsIHRpcCwgdGhpcy5lbGVtZW50KSA6IHRoaXMuY29uZmlnLnBsYWNlbWVudDtcblxuICAgICAgICB2YXIgYXR0YWNobWVudCA9IHRoaXMuX2dldEF0dGFjaG1lbnQocGxhY2VtZW50KTtcblxuICAgICAgICB2YXIgY29udGFpbmVyID0gdGhpcy5jb25maWcuY29udGFpbmVyID09PSBmYWxzZSA/IGRvY3VtZW50LmJvZHkgOiAkKHRoaXMuY29uZmlnLmNvbnRhaW5lcik7XG5cbiAgICAgICAgJCh0aXApLmRhdGEodGhpcy5jb25zdHJ1Y3Rvci5EQVRBX0tFWSwgdGhpcykuYXBwZW5kVG8oY29udGFpbmVyKTtcblxuICAgICAgICAkKHRoaXMuZWxlbWVudCkudHJpZ2dlcih0aGlzLmNvbnN0cnVjdG9yLkV2ZW50LklOU0VSVEVEKTtcblxuICAgICAgICB0aGlzLl90ZXRoZXIgPSBuZXcgVGV0aGVyKHtcbiAgICAgICAgICBhdHRhY2htZW50OiBhdHRhY2htZW50LFxuICAgICAgICAgIGVsZW1lbnQ6IHRpcCxcbiAgICAgICAgICB0YXJnZXQ6IHRoaXMuZWxlbWVudCxcbiAgICAgICAgICBjbGFzc2VzOiBUZXRoZXJDbGFzcyxcbiAgICAgICAgICBjbGFzc1ByZWZpeDogQ0xBU1NfUFJFRklYLFxuICAgICAgICAgIG9mZnNldDogdGhpcy5jb25maWcub2Zmc2V0LFxuICAgICAgICAgIGNvbnN0cmFpbnRzOiB0aGlzLmNvbmZpZy5jb25zdHJhaW50cyxcbiAgICAgICAgICBhZGRUYXJnZXRDbGFzc2VzOiBmYWxzZVxuICAgICAgICB9KTtcblxuICAgICAgICBVdGlsLnJlZmxvdyh0aXApO1xuICAgICAgICB0aGlzLl90ZXRoZXIucG9zaXRpb24oKTtcblxuICAgICAgICAkKHRpcCkuYWRkQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpO1xuXG4gICAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICAgIHZhciBwcmV2SG92ZXJTdGF0ZSA9IF90aGlzMjIuX2hvdmVyU3RhdGU7XG4gICAgICAgICAgX3RoaXMyMi5faG92ZXJTdGF0ZSA9IG51bGw7XG4gICAgICAgICAgX3RoaXMyMi5faXNUcmFuc2l0aW9uaW5nID0gZmFsc2U7XG5cbiAgICAgICAgICAkKF90aGlzMjIuZWxlbWVudCkudHJpZ2dlcihfdGhpczIyLmNvbnN0cnVjdG9yLkV2ZW50LlNIT1dOKTtcblxuICAgICAgICAgIGlmIChwcmV2SG92ZXJTdGF0ZSA9PT0gSG92ZXJTdGF0ZS5PVVQpIHtcbiAgICAgICAgICAgIF90aGlzMjIuX2xlYXZlKG51bGwsIF90aGlzMjIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoVXRpbC5zdXBwb3J0c1RyYW5zaXRpb25FbmQoKSAmJiAkKHRoaXMudGlwKS5oYXNDbGFzcyhDbGFzc05hbWUuRkFERSkpIHtcbiAgICAgICAgICB0aGlzLl9pc1RyYW5zaXRpb25pbmcgPSB0cnVlO1xuICAgICAgICAgICQodGhpcy50aXApLm9uZShVdGlsLlRSQU5TSVRJT05fRU5ELCBjb21wbGV0ZSkuZW11bGF0ZVRyYW5zaXRpb25FbmQoVG9vbHRpcC5fVFJBTlNJVElPTl9EVVJBVElPTik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29tcGxldGUoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgVG9vbHRpcC5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uIGhpZGUoY2FsbGJhY2spIHtcbiAgICAgIHZhciBfdGhpczIzID0gdGhpcztcblxuICAgICAgdmFyIHRpcCA9IHRoaXMuZ2V0VGlwRWxlbWVudCgpO1xuICAgICAgdmFyIGhpZGVFdmVudCA9ICQuRXZlbnQodGhpcy5jb25zdHJ1Y3Rvci5FdmVudC5ISURFKTtcbiAgICAgIGlmICh0aGlzLl9pc1RyYW5zaXRpb25pbmcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUb29sdGlwIGlzIHRyYW5zaXRpb25pbmcnKTtcbiAgICAgIH1cbiAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICBpZiAoX3RoaXMyMy5faG92ZXJTdGF0ZSAhPT0gSG92ZXJTdGF0ZS5TSE9XICYmIHRpcC5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgdGlwLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGlwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIF90aGlzMjMuZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoJ2FyaWEtZGVzY3JpYmVkYnknKTtcbiAgICAgICAgJChfdGhpczIzLmVsZW1lbnQpLnRyaWdnZXIoX3RoaXMyMy5jb25zdHJ1Y3Rvci5FdmVudC5ISURERU4pO1xuICAgICAgICBfdGhpczIzLl9pc1RyYW5zaXRpb25pbmcgPSBmYWxzZTtcbiAgICAgICAgX3RoaXMyMy5jbGVhbnVwVGV0aGVyKCk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgJCh0aGlzLmVsZW1lbnQpLnRyaWdnZXIoaGlkZUV2ZW50KTtcblxuICAgICAgaWYgKGhpZGVFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgICQodGlwKS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuU0hPVyk7XG5cbiAgICAgIHRoaXMuX2FjdGl2ZVRyaWdnZXJbVHJpZ2dlci5DTElDS10gPSBmYWxzZTtcbiAgICAgIHRoaXMuX2FjdGl2ZVRyaWdnZXJbVHJpZ2dlci5GT0NVU10gPSBmYWxzZTtcbiAgICAgIHRoaXMuX2FjdGl2ZVRyaWdnZXJbVHJpZ2dlci5IT1ZFUl0gPSBmYWxzZTtcblxuICAgICAgaWYgKFV0aWwuc3VwcG9ydHNUcmFuc2l0aW9uRW5kKCkgJiYgJCh0aGlzLnRpcCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkZBREUpKSB7XG4gICAgICAgIHRoaXMuX2lzVHJhbnNpdGlvbmluZyA9IHRydWU7XG4gICAgICAgICQodGlwKS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgY29tcGxldGUpLmVtdWxhdGVUcmFuc2l0aW9uRW5kKFRSQU5TSVRJT05fRFVSQVRJT04pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGxldGUoKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5faG92ZXJTdGF0ZSA9ICcnO1xuICAgIH07XG5cbiAgICAvLyBwcm90ZWN0ZWRcblxuICAgIFRvb2x0aXAucHJvdG90eXBlLmlzV2l0aENvbnRlbnQgPSBmdW5jdGlvbiBpc1dpdGhDb250ZW50KCkge1xuICAgICAgcmV0dXJuIEJvb2xlYW4odGhpcy5nZXRUaXRsZSgpKTtcbiAgICB9O1xuXG4gICAgVG9vbHRpcC5wcm90b3R5cGUuZ2V0VGlwRWxlbWVudCA9IGZ1bmN0aW9uIGdldFRpcEVsZW1lbnQoKSB7XG4gICAgICByZXR1cm4gdGhpcy50aXAgPSB0aGlzLnRpcCB8fCAkKHRoaXMuY29uZmlnLnRlbXBsYXRlKVswXTtcbiAgICB9O1xuXG4gICAgVG9vbHRpcC5wcm90b3R5cGUuc2V0Q29udGVudCA9IGZ1bmN0aW9uIHNldENvbnRlbnQoKSB7XG4gICAgICB2YXIgJHRpcCA9ICQodGhpcy5nZXRUaXBFbGVtZW50KCkpO1xuXG4gICAgICB0aGlzLnNldEVsZW1lbnRDb250ZW50KCR0aXAuZmluZChTZWxlY3Rvci5UT09MVElQX0lOTkVSKSwgdGhpcy5nZXRUaXRsZSgpKTtcblxuICAgICAgJHRpcC5yZW1vdmVDbGFzcyhDbGFzc05hbWUuRkFERSArICcgJyArIENsYXNzTmFtZS5TSE9XKTtcblxuICAgICAgdGhpcy5jbGVhbnVwVGV0aGVyKCk7XG4gICAgfTtcblxuICAgIFRvb2x0aXAucHJvdG90eXBlLnNldEVsZW1lbnRDb250ZW50ID0gZnVuY3Rpb24gc2V0RWxlbWVudENvbnRlbnQoJGVsZW1lbnQsIGNvbnRlbnQpIHtcbiAgICAgIHZhciBodG1sID0gdGhpcy5jb25maWcuaHRtbDtcbiAgICAgIGlmICgodHlwZW9mIGNvbnRlbnQgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKGNvbnRlbnQpKSA9PT0gJ29iamVjdCcgJiYgKGNvbnRlbnQubm9kZVR5cGUgfHwgY29udGVudC5qcXVlcnkpKSB7XG4gICAgICAgIC8vIGNvbnRlbnQgaXMgYSBET00gbm9kZSBvciBhIGpRdWVyeVxuICAgICAgICBpZiAoaHRtbCkge1xuICAgICAgICAgIGlmICghJChjb250ZW50KS5wYXJlbnQoKS5pcygkZWxlbWVudCkpIHtcbiAgICAgICAgICAgICRlbGVtZW50LmVtcHR5KCkuYXBwZW5kKGNvbnRlbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkZWxlbWVudC50ZXh0KCQoY29udGVudCkudGV4dCgpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJGVsZW1lbnRbaHRtbCA/ICdodG1sJyA6ICd0ZXh0J10oY29udGVudCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIFRvb2x0aXAucHJvdG90eXBlLmdldFRpdGxlID0gZnVuY3Rpb24gZ2V0VGl0bGUoKSB7XG4gICAgICB2YXIgdGl0bGUgPSB0aGlzLmVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLW9yaWdpbmFsLXRpdGxlJyk7XG5cbiAgICAgIGlmICghdGl0bGUpIHtcbiAgICAgICAgdGl0bGUgPSB0eXBlb2YgdGhpcy5jb25maWcudGl0bGUgPT09ICdmdW5jdGlvbicgPyB0aGlzLmNvbmZpZy50aXRsZS5jYWxsKHRoaXMuZWxlbWVudCkgOiB0aGlzLmNvbmZpZy50aXRsZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRpdGxlO1xuICAgIH07XG5cbiAgICBUb29sdGlwLnByb3RvdHlwZS5jbGVhbnVwVGV0aGVyID0gZnVuY3Rpb24gY2xlYW51cFRldGhlcigpIHtcbiAgICAgIGlmICh0aGlzLl90ZXRoZXIpIHtcbiAgICAgICAgdGhpcy5fdGV0aGVyLmRlc3Ryb3koKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gcHJpdmF0ZVxuXG4gICAgVG9vbHRpcC5wcm90b3R5cGUuX2dldEF0dGFjaG1lbnQgPSBmdW5jdGlvbiBfZ2V0QXR0YWNobWVudChwbGFjZW1lbnQpIHtcbiAgICAgIHJldHVybiBBdHRhY2htZW50TWFwW3BsYWNlbWVudC50b1VwcGVyQ2FzZSgpXTtcbiAgICB9O1xuXG4gICAgVG9vbHRpcC5wcm90b3R5cGUuX3NldExpc3RlbmVycyA9IGZ1bmN0aW9uIF9zZXRMaXN0ZW5lcnMoKSB7XG4gICAgICB2YXIgX3RoaXMyNCA9IHRoaXM7XG5cbiAgICAgIHZhciB0cmlnZ2VycyA9IHRoaXMuY29uZmlnLnRyaWdnZXIuc3BsaXQoJyAnKTtcblxuICAgICAgdHJpZ2dlcnMuZm9yRWFjaChmdW5jdGlvbiAodHJpZ2dlcikge1xuICAgICAgICBpZiAodHJpZ2dlciA9PT0gJ2NsaWNrJykge1xuICAgICAgICAgICQoX3RoaXMyNC5lbGVtZW50KS5vbihfdGhpczI0LmNvbnN0cnVjdG9yLkV2ZW50LkNMSUNLLCBfdGhpczI0LmNvbmZpZy5zZWxlY3RvciwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMyNC50b2dnbGUoZXZlbnQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHRyaWdnZXIgIT09IFRyaWdnZXIuTUFOVUFMKSB7XG4gICAgICAgICAgdmFyIGV2ZW50SW4gPSB0cmlnZ2VyID09PSBUcmlnZ2VyLkhPVkVSID8gX3RoaXMyNC5jb25zdHJ1Y3Rvci5FdmVudC5NT1VTRUVOVEVSIDogX3RoaXMyNC5jb25zdHJ1Y3Rvci5FdmVudC5GT0NVU0lOO1xuICAgICAgICAgIHZhciBldmVudE91dCA9IHRyaWdnZXIgPT09IFRyaWdnZXIuSE9WRVIgPyBfdGhpczI0LmNvbnN0cnVjdG9yLkV2ZW50Lk1PVVNFTEVBVkUgOiBfdGhpczI0LmNvbnN0cnVjdG9yLkV2ZW50LkZPQ1VTT1VUO1xuXG4gICAgICAgICAgJChfdGhpczI0LmVsZW1lbnQpLm9uKGV2ZW50SW4sIF90aGlzMjQuY29uZmlnLnNlbGVjdG9yLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpczI0Ll9lbnRlcihldmVudCk7XG4gICAgICAgICAgfSkub24oZXZlbnRPdXQsIF90aGlzMjQuY29uZmlnLnNlbGVjdG9yLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpczI0Ll9sZWF2ZShldmVudCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAkKF90aGlzMjQuZWxlbWVudCkuY2xvc2VzdCgnLm1vZGFsJykub24oJ2hpZGUuYnMubW9kYWwnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzMjQuaGlkZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAodGhpcy5jb25maWcuc2VsZWN0b3IpIHtcbiAgICAgICAgdGhpcy5jb25maWcgPSAkLmV4dGVuZCh7fSwgdGhpcy5jb25maWcsIHtcbiAgICAgICAgICB0cmlnZ2VyOiAnbWFudWFsJyxcbiAgICAgICAgICBzZWxlY3RvcjogJydcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9maXhUaXRsZSgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBUb29sdGlwLnByb3RvdHlwZS5fZml4VGl0bGUgPSBmdW5jdGlvbiBfZml4VGl0bGUoKSB7XG4gICAgICB2YXIgdGl0bGVUeXBlID0gX3R5cGVvZih0aGlzLmVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLW9yaWdpbmFsLXRpdGxlJykpO1xuICAgICAgaWYgKHRoaXMuZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3RpdGxlJykgfHwgdGl0bGVUeXBlICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLW9yaWdpbmFsLXRpdGxlJywgdGhpcy5lbGVtZW50LmdldEF0dHJpYnV0ZSgndGl0bGUnKSB8fCAnJyk7XG4gICAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3RpdGxlJywgJycpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBUb29sdGlwLnByb3RvdHlwZS5fZW50ZXIgPSBmdW5jdGlvbiBfZW50ZXIoZXZlbnQsIGNvbnRleHQpIHtcbiAgICAgIHZhciBkYXRhS2V5ID0gdGhpcy5jb25zdHJ1Y3Rvci5EQVRBX0tFWTtcblxuICAgICAgY29udGV4dCA9IGNvbnRleHQgfHwgJChldmVudC5jdXJyZW50VGFyZ2V0KS5kYXRhKGRhdGFLZXkpO1xuXG4gICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgY29udGV4dCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKGV2ZW50LmN1cnJlbnRUYXJnZXQsIHRoaXMuX2dldERlbGVnYXRlQ29uZmlnKCkpO1xuICAgICAgICAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLmRhdGEoZGF0YUtleSwgY29udGV4dCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChldmVudCkge1xuICAgICAgICBjb250ZXh0Ll9hY3RpdmVUcmlnZ2VyW2V2ZW50LnR5cGUgPT09ICdmb2N1c2luJyA/IFRyaWdnZXIuRk9DVVMgOiBUcmlnZ2VyLkhPVkVSXSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICgkKGNvbnRleHQuZ2V0VGlwRWxlbWVudCgpKS5oYXNDbGFzcyhDbGFzc05hbWUuU0hPVykgfHwgY29udGV4dC5faG92ZXJTdGF0ZSA9PT0gSG92ZXJTdGF0ZS5TSE9XKSB7XG4gICAgICAgIGNvbnRleHQuX2hvdmVyU3RhdGUgPSBIb3ZlclN0YXRlLlNIT1c7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY2xlYXJUaW1lb3V0KGNvbnRleHQuX3RpbWVvdXQpO1xuXG4gICAgICBjb250ZXh0Ll9ob3ZlclN0YXRlID0gSG92ZXJTdGF0ZS5TSE9XO1xuXG4gICAgICBpZiAoIWNvbnRleHQuY29uZmlnLmRlbGF5IHx8ICFjb250ZXh0LmNvbmZpZy5kZWxheS5zaG93KSB7XG4gICAgICAgIGNvbnRleHQuc2hvdygpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnRleHQuX3RpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGNvbnRleHQuX2hvdmVyU3RhdGUgPT09IEhvdmVyU3RhdGUuU0hPVykge1xuICAgICAgICAgIGNvbnRleHQuc2hvdygpO1xuICAgICAgICB9XG4gICAgICB9LCBjb250ZXh0LmNvbmZpZy5kZWxheS5zaG93KTtcbiAgICB9O1xuXG4gICAgVG9vbHRpcC5wcm90b3R5cGUuX2xlYXZlID0gZnVuY3Rpb24gX2xlYXZlKGV2ZW50LCBjb250ZXh0KSB7XG4gICAgICB2YXIgZGF0YUtleSA9IHRoaXMuY29uc3RydWN0b3IuREFUQV9LRVk7XG5cbiAgICAgIGNvbnRleHQgPSBjb250ZXh0IHx8ICQoZXZlbnQuY3VycmVudFRhcmdldCkuZGF0YShkYXRhS2V5KTtcblxuICAgICAgaWYgKCFjb250ZXh0KSB7XG4gICAgICAgIGNvbnRleHQgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcihldmVudC5jdXJyZW50VGFyZ2V0LCB0aGlzLl9nZXREZWxlZ2F0ZUNvbmZpZygpKTtcbiAgICAgICAgJChldmVudC5jdXJyZW50VGFyZ2V0KS5kYXRhKGRhdGFLZXksIGNvbnRleHQpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgY29udGV4dC5fYWN0aXZlVHJpZ2dlcltldmVudC50eXBlID09PSAnZm9jdXNvdXQnID8gVHJpZ2dlci5GT0NVUyA6IFRyaWdnZXIuSE9WRVJdID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb250ZXh0Ll9pc1dpdGhBY3RpdmVUcmlnZ2VyKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjbGVhclRpbWVvdXQoY29udGV4dC5fdGltZW91dCk7XG5cbiAgICAgIGNvbnRleHQuX2hvdmVyU3RhdGUgPSBIb3ZlclN0YXRlLk9VVDtcblxuICAgICAgaWYgKCFjb250ZXh0LmNvbmZpZy5kZWxheSB8fCAhY29udGV4dC5jb25maWcuZGVsYXkuaGlkZSkge1xuICAgICAgICBjb250ZXh0LmhpZGUoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb250ZXh0Ll90aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChjb250ZXh0Ll9ob3ZlclN0YXRlID09PSBIb3ZlclN0YXRlLk9VVCkge1xuICAgICAgICAgIGNvbnRleHQuaGlkZSgpO1xuICAgICAgICB9XG4gICAgICB9LCBjb250ZXh0LmNvbmZpZy5kZWxheS5oaWRlKTtcbiAgICB9O1xuXG4gICAgVG9vbHRpcC5wcm90b3R5cGUuX2lzV2l0aEFjdGl2ZVRyaWdnZXIgPSBmdW5jdGlvbiBfaXNXaXRoQWN0aXZlVHJpZ2dlcigpIHtcbiAgICAgIGZvciAodmFyIHRyaWdnZXIgaW4gdGhpcy5fYWN0aXZlVHJpZ2dlcikge1xuICAgICAgICBpZiAodGhpcy5fYWN0aXZlVHJpZ2dlclt0cmlnZ2VyXSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgVG9vbHRpcC5wcm90b3R5cGUuX2dldENvbmZpZyA9IGZ1bmN0aW9uIF9nZXRDb25maWcoY29uZmlnKSB7XG4gICAgICBjb25maWcgPSAkLmV4dGVuZCh7fSwgdGhpcy5jb25zdHJ1Y3Rvci5EZWZhdWx0LCAkKHRoaXMuZWxlbWVudCkuZGF0YSgpLCBjb25maWcpO1xuXG4gICAgICBpZiAoY29uZmlnLmRlbGF5ICYmIHR5cGVvZiBjb25maWcuZGVsYXkgPT09ICdudW1iZXInKSB7XG4gICAgICAgIGNvbmZpZy5kZWxheSA9IHtcbiAgICAgICAgICBzaG93OiBjb25maWcuZGVsYXksXG4gICAgICAgICAgaGlkZTogY29uZmlnLmRlbGF5XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIFV0aWwudHlwZUNoZWNrQ29uZmlnKE5BTUUsIGNvbmZpZywgdGhpcy5jb25zdHJ1Y3Rvci5EZWZhdWx0VHlwZSk7XG5cbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfTtcblxuICAgIFRvb2x0aXAucHJvdG90eXBlLl9nZXREZWxlZ2F0ZUNvbmZpZyA9IGZ1bmN0aW9uIF9nZXREZWxlZ2F0ZUNvbmZpZygpIHtcbiAgICAgIHZhciBjb25maWcgPSB7fTtcblxuICAgICAgaWYgKHRoaXMuY29uZmlnKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB0aGlzLmNvbmZpZykge1xuICAgICAgICAgIGlmICh0aGlzLmNvbnN0cnVjdG9yLkRlZmF1bHRba2V5XSAhPT0gdGhpcy5jb25maWdba2V5XSkge1xuICAgICAgICAgICAgY29uZmlnW2tleV0gPSB0aGlzLmNvbmZpZ1trZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gY29uZmlnO1xuICAgIH07XG5cbiAgICAvLyBzdGF0aWNcblxuICAgIFRvb2x0aXAuX2pRdWVyeUludGVyZmFjZSA9IGZ1bmN0aW9uIF9qUXVlcnlJbnRlcmZhY2UoY29uZmlnKSB7XG4gICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSAkKHRoaXMpLmRhdGEoREFUQV9LRVkpO1xuICAgICAgICB2YXIgX2NvbmZpZyA9ICh0eXBlb2YgY29uZmlnID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZihjb25maWcpKSA9PT0gJ29iamVjdCcgJiYgY29uZmlnO1xuXG4gICAgICAgIGlmICghZGF0YSAmJiAvZGlzcG9zZXxoaWRlLy50ZXN0KGNvbmZpZykpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICBkYXRhID0gbmV3IFRvb2x0aXAodGhpcywgX2NvbmZpZyk7XG4gICAgICAgICAgJCh0aGlzKS5kYXRhKERBVEFfS0VZLCBkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGlmIChkYXRhW2NvbmZpZ10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBtZXRob2QgbmFtZWQgXCInICsgY29uZmlnICsgJ1wiJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRhdGFbY29uZmlnXSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKFRvb2x0aXAsIG51bGwsIFt7XG4gICAgICBrZXk6ICdWRVJTSU9OJyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gVkVSU0lPTjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6ICdEZWZhdWx0JyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRGVmYXVsdDtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6ICdOQU1FJyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gTkFNRTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6ICdEQVRBX0tFWScsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIERBVEFfS0VZO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogJ0V2ZW50JyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRXZlbnQ7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiAnRVZFTlRfS0VZJyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRVZFTlRfS0VZO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogJ0RlZmF1bHRUeXBlJyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRGVmYXVsdFR5cGU7XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIFRvb2x0aXA7XG4gIH0oKTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIGpRdWVyeVxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgJC5mbltOQU1FXSA9IFRvb2x0aXAuX2pRdWVyeUludGVyZmFjZTtcbiAgJC5mbltOQU1FXS5Db25zdHJ1Y3RvciA9IFRvb2x0aXA7XG4gICQuZm5bTkFNRV0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUVdID0gSlFVRVJZX05PX0NPTkZMSUNUO1xuICAgIHJldHVybiBUb29sdGlwLl9qUXVlcnlJbnRlcmZhY2U7XG4gIH07XG5cbiAgcmV0dXJuIFRvb2x0aXA7XG59KGpRdWVyeSk7XG5cbi8qKlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIEJvb3RzdHJhcCAodjQuMC4wLWFscGhhLjYpOiBwb3BvdmVyLmpzXG4gKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS90d2JzL2Jvb3RzdHJhcC9ibG9iL21hc3Rlci9MSUNFTlNFKVxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqL1xuXG52YXIgUG9wb3ZlciA9IGZ1bmN0aW9uICgkKSB7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FID0gJ3BvcG92ZXInO1xuICB2YXIgVkVSU0lPTiA9ICc0LjAuMC1hbHBoYS42JztcbiAgdmFyIERBVEFfS0VZID0gJ2JzLnBvcG92ZXInO1xuICB2YXIgRVZFTlRfS0VZID0gJy4nICsgREFUQV9LRVk7XG4gIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QgPSAkLmZuW05BTUVdO1xuXG4gIHZhciBEZWZhdWx0ID0gJC5leHRlbmQoe30sIFRvb2x0aXAuRGVmYXVsdCwge1xuICAgIHBsYWNlbWVudDogJ3JpZ2h0JyxcbiAgICB0cmlnZ2VyOiAnY2xpY2snLFxuICAgIGNvbnRlbnQ6ICcnLFxuICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cInBvcG92ZXJcIiByb2xlPVwidG9vbHRpcFwiPicgKyAnPGgzIGNsYXNzPVwicG9wb3Zlci10aXRsZVwiPjwvaDM+JyArICc8ZGl2IGNsYXNzPVwicG9wb3Zlci1jb250ZW50XCI+PC9kaXY+PC9kaXY+J1xuICB9KTtcblxuICB2YXIgRGVmYXVsdFR5cGUgPSAkLmV4dGVuZCh7fSwgVG9vbHRpcC5EZWZhdWx0VHlwZSwge1xuICAgIGNvbnRlbnQ6ICcoc3RyaW5nfGVsZW1lbnR8ZnVuY3Rpb24pJ1xuICB9KTtcblxuICB2YXIgQ2xhc3NOYW1lID0ge1xuICAgIEZBREU6ICdmYWRlJyxcbiAgICBTSE9XOiAnc2hvdydcbiAgfTtcblxuICB2YXIgU2VsZWN0b3IgPSB7XG4gICAgVElUTEU6ICcucG9wb3Zlci10aXRsZScsXG4gICAgQ09OVEVOVDogJy5wb3BvdmVyLWNvbnRlbnQnXG4gIH07XG5cbiAgdmFyIEV2ZW50ID0ge1xuICAgIEhJREU6ICdoaWRlJyArIEVWRU5UX0tFWSxcbiAgICBISURERU46ICdoaWRkZW4nICsgRVZFTlRfS0VZLFxuICAgIFNIT1c6ICdzaG93JyArIEVWRU5UX0tFWSxcbiAgICBTSE9XTjogJ3Nob3duJyArIEVWRU5UX0tFWSxcbiAgICBJTlNFUlRFRDogJ2luc2VydGVkJyArIEVWRU5UX0tFWSxcbiAgICBDTElDSzogJ2NsaWNrJyArIEVWRU5UX0tFWSxcbiAgICBGT0NVU0lOOiAnZm9jdXNpbicgKyBFVkVOVF9LRVksXG4gICAgRk9DVVNPVVQ6ICdmb2N1c291dCcgKyBFVkVOVF9LRVksXG4gICAgTU9VU0VFTlRFUjogJ21vdXNlZW50ZXInICsgRVZFTlRfS0VZLFxuICAgIE1PVVNFTEVBVkU6ICdtb3VzZWxlYXZlJyArIEVWRU5UX0tFWVxuICB9O1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ2xhc3MgRGVmaW5pdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIFBvcG92ZXIgPSBmdW5jdGlvbiAoX1Rvb2x0aXApIHtcbiAgICBfaW5oZXJpdHMoUG9wb3ZlciwgX1Rvb2x0aXApO1xuXG4gICAgZnVuY3Rpb24gUG9wb3ZlcigpIHtcbiAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBQb3BvdmVyKTtcblxuICAgICAgcmV0dXJuIF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9Ub29sdGlwLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICAgIH1cblxuICAgIC8vIG92ZXJyaWRlc1xuXG4gICAgUG9wb3Zlci5wcm90b3R5cGUuaXNXaXRoQ29udGVudCA9IGZ1bmN0aW9uIGlzV2l0aENvbnRlbnQoKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRUaXRsZSgpIHx8IHRoaXMuX2dldENvbnRlbnQoKTtcbiAgICB9O1xuXG4gICAgUG9wb3Zlci5wcm90b3R5cGUuZ2V0VGlwRWxlbWVudCA9IGZ1bmN0aW9uIGdldFRpcEVsZW1lbnQoKSB7XG4gICAgICByZXR1cm4gdGhpcy50aXAgPSB0aGlzLnRpcCB8fCAkKHRoaXMuY29uZmlnLnRlbXBsYXRlKVswXTtcbiAgICB9O1xuXG4gICAgUG9wb3Zlci5wcm90b3R5cGUuc2V0Q29udGVudCA9IGZ1bmN0aW9uIHNldENvbnRlbnQoKSB7XG4gICAgICB2YXIgJHRpcCA9ICQodGhpcy5nZXRUaXBFbGVtZW50KCkpO1xuXG4gICAgICAvLyB3ZSB1c2UgYXBwZW5kIGZvciBodG1sIG9iamVjdHMgdG8gbWFpbnRhaW4ganMgZXZlbnRzXG4gICAgICB0aGlzLnNldEVsZW1lbnRDb250ZW50KCR0aXAuZmluZChTZWxlY3Rvci5USVRMRSksIHRoaXMuZ2V0VGl0bGUoKSk7XG4gICAgICB0aGlzLnNldEVsZW1lbnRDb250ZW50KCR0aXAuZmluZChTZWxlY3Rvci5DT05URU5UKSwgdGhpcy5fZ2V0Q29udGVudCgpKTtcblxuICAgICAgJHRpcC5yZW1vdmVDbGFzcyhDbGFzc05hbWUuRkFERSArICcgJyArIENsYXNzTmFtZS5TSE9XKTtcblxuICAgICAgdGhpcy5jbGVhbnVwVGV0aGVyKCk7XG4gICAgfTtcblxuICAgIC8vIHByaXZhdGVcblxuICAgIFBvcG92ZXIucHJvdG90eXBlLl9nZXRDb250ZW50ID0gZnVuY3Rpb24gX2dldENvbnRlbnQoKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbGVtZW50LmdldEF0dHJpYnV0ZSgnZGF0YS1jb250ZW50JykgfHwgKHR5cGVvZiB0aGlzLmNvbmZpZy5jb250ZW50ID09PSAnZnVuY3Rpb24nID8gdGhpcy5jb25maWcuY29udGVudC5jYWxsKHRoaXMuZWxlbWVudCkgOiB0aGlzLmNvbmZpZy5jb250ZW50KTtcbiAgICB9O1xuXG4gICAgLy8gc3RhdGljXG5cbiAgICBQb3BvdmVyLl9qUXVlcnlJbnRlcmZhY2UgPSBmdW5jdGlvbiBfalF1ZXJ5SW50ZXJmYWNlKGNvbmZpZykge1xuICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkYXRhID0gJCh0aGlzKS5kYXRhKERBVEFfS0VZKTtcbiAgICAgICAgdmFyIF9jb25maWcgPSAodHlwZW9mIGNvbmZpZyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2YoY29uZmlnKSkgPT09ICdvYmplY3QnID8gY29uZmlnIDogbnVsbDtcblxuICAgICAgICBpZiAoIWRhdGEgJiYgL2Rlc3Ryb3l8aGlkZS8udGVzdChjb25maWcpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgZGF0YSA9IG5ldyBQb3BvdmVyKHRoaXMsIF9jb25maWcpO1xuICAgICAgICAgICQodGhpcykuZGF0YShEQVRBX0tFWSwgZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBpZiAoZGF0YVtjb25maWddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gbWV0aG9kIG5hbWVkIFwiJyArIGNvbmZpZyArICdcIicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkYXRhW2NvbmZpZ10oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIF9jcmVhdGVDbGFzcyhQb3BvdmVyLCBudWxsLCBbe1xuICAgICAga2V5OiAnVkVSU0lPTicsXG5cblxuICAgICAgLy8gZ2V0dGVyc1xuXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIFZFUlNJT047XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiAnRGVmYXVsdCcsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIERlZmF1bHQ7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiAnTkFNRScsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIE5BTUU7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiAnREFUQV9LRVknLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBEQVRBX0tFWTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6ICdFdmVudCcsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIEV2ZW50O1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogJ0VWRU5UX0tFWScsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIEVWRU5UX0tFWTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6ICdEZWZhdWx0VHlwZScsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIERlZmF1bHRUeXBlO1xuICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBQb3BvdmVyO1xuICB9KFRvb2x0aXApO1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogalF1ZXJ5XG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAkLmZuW05BTUVdID0gUG9wb3Zlci5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUVdLkNvbnN0cnVjdG9yID0gUG9wb3ZlcjtcbiAgJC5mbltOQU1FXS5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICQuZm5bTkFNRV0gPSBKUVVFUllfTk9fQ09ORkxJQ1Q7XG4gICAgcmV0dXJuIFBvcG92ZXIuX2pRdWVyeUludGVyZmFjZTtcbiAgfTtcblxuICByZXR1cm4gUG9wb3Zlcjtcbn0oalF1ZXJ5KTtcblxufSgpO1xuIiwialF1ZXJ5KGRvY3VtZW50KS5mb3VuZGF0aW9uKCk7XHJcbiIsIi8vIEpveXJpZGUgZGVtb1xyXG4kKCcjc3RhcnQtanInKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcclxuICAkKGRvY3VtZW50KS5mb3VuZGF0aW9uKCdqb3lyaWRlJywnc3RhcnQnKTtcclxufSk7IiwiLyoqXHJcbiAqIEZpbGUgbmF2aWdhdGlvbi5qcy5cclxuICpcclxuICogSGFuZGxlcyB0b2dnbGluZyB0aGUgbmF2aWdhdGlvbiBtZW51IGZvciBzbWFsbCBzY3JlZW5zIGFuZCBlbmFibGVzIFRBQiBrZXlcclxuICogbmF2aWdhdGlvbiBzdXBwb3J0IGZvciBkcm9wZG93biBtZW51cy5cclxuICovXHJcbiggZnVuY3Rpb24oKSB7XHJcblx0dmFyIGNvbnRhaW5lciwgYnV0dG9uLCBtZW51LCBsaW5rcywgaSwgbGVuO1xyXG5cclxuXHRjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggJ3NpdGUtbmF2aWdhdGlvbicgKTtcclxuXHRpZiAoICEgY29udGFpbmVyICkge1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHJcblx0YnV0dG9uID0gY29udGFpbmVyLmdldEVsZW1lbnRzQnlUYWdOYW1lKCAnYnV0dG9uJyApWzBdO1xyXG5cdGlmICggJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiBidXR0b24gKSB7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHRtZW51ID0gY29udGFpbmVyLmdldEVsZW1lbnRzQnlUYWdOYW1lKCAndWwnIClbMF07XHJcblxyXG5cdC8vIEhpZGUgbWVudSB0b2dnbGUgYnV0dG9uIGlmIG1lbnUgaXMgZW1wdHkgYW5kIHJldHVybiBlYXJseS5cclxuXHRpZiAoICd1bmRlZmluZWQnID09PSB0eXBlb2YgbWVudSApIHtcclxuXHRcdGJ1dHRvbi5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHJcblx0bWVudS5zZXRBdHRyaWJ1dGUoICdhcmlhLWV4cGFuZGVkJywgJ2ZhbHNlJyApO1xyXG5cdGlmICggLTEgPT09IG1lbnUuY2xhc3NOYW1lLmluZGV4T2YoICduYXYtbWVudScgKSApIHtcclxuXHRcdG1lbnUuY2xhc3NOYW1lICs9ICcgbmF2LW1lbnUnO1xyXG5cdH1cclxuXHJcblx0YnV0dG9uLm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcclxuXHRcdGlmICggLTEgIT09IGNvbnRhaW5lci5jbGFzc05hbWUuaW5kZXhPZiggJ3RvZ2dsZWQnICkgKSB7XHJcblx0XHRcdGNvbnRhaW5lci5jbGFzc05hbWUgPSBjb250YWluZXIuY2xhc3NOYW1lLnJlcGxhY2UoICcgdG9nZ2xlZCcsICcnICk7XHJcblx0XHRcdGJ1dHRvbi5zZXRBdHRyaWJ1dGUoICdhcmlhLWV4cGFuZGVkJywgJ2ZhbHNlJyApO1xyXG5cdFx0XHRtZW51LnNldEF0dHJpYnV0ZSggJ2FyaWEtZXhwYW5kZWQnLCAnZmFsc2UnICk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb250YWluZXIuY2xhc3NOYW1lICs9ICcgdG9nZ2xlZCc7XHJcblx0XHRcdGJ1dHRvbi5zZXRBdHRyaWJ1dGUoICdhcmlhLWV4cGFuZGVkJywgJ3RydWUnICk7XHJcblx0XHRcdG1lbnUuc2V0QXR0cmlidXRlKCAnYXJpYS1leHBhbmRlZCcsICd0cnVlJyApO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdC8vIEdldCBhbGwgdGhlIGxpbmsgZWxlbWVudHMgd2l0aGluIHRoZSBtZW51LlxyXG5cdGxpbmtzICAgID0gbWVudS5nZXRFbGVtZW50c0J5VGFnTmFtZSggJ2EnICk7XHJcblxyXG5cdC8vIEVhY2ggdGltZSBhIG1lbnUgbGluayBpcyBmb2N1c2VkIG9yIGJsdXJyZWQsIHRvZ2dsZSBmb2N1cy5cclxuXHRmb3IgKCBpID0gMCwgbGVuID0gbGlua3MubGVuZ3RoOyBpIDwgbGVuOyBpKysgKSB7XHJcblx0XHRsaW5rc1tpXS5hZGRFdmVudExpc3RlbmVyKCAnZm9jdXMnLCB0b2dnbGVGb2N1cywgdHJ1ZSApO1xyXG5cdFx0bGlua3NbaV0uYWRkRXZlbnRMaXN0ZW5lciggJ2JsdXInLCB0b2dnbGVGb2N1cywgdHJ1ZSApO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0cyBvciByZW1vdmVzIC5mb2N1cyBjbGFzcyBvbiBhbiBlbGVtZW50LlxyXG5cdCAqL1xyXG5cdGZ1bmN0aW9uIHRvZ2dsZUZvY3VzKCkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuXHRcdC8vIE1vdmUgdXAgdGhyb3VnaCB0aGUgYW5jZXN0b3JzIG9mIHRoZSBjdXJyZW50IGxpbmsgdW50aWwgd2UgaGl0IC5uYXYtbWVudS5cclxuXHRcdHdoaWxlICggLTEgPT09IHNlbGYuY2xhc3NOYW1lLmluZGV4T2YoICduYXYtbWVudScgKSApIHtcclxuXHJcblx0XHRcdC8vIE9uIGxpIGVsZW1lbnRzIHRvZ2dsZSB0aGUgY2xhc3MgLmZvY3VzLlxyXG5cdFx0XHRpZiAoICdsaScgPT09IHNlbGYudGFnTmFtZS50b0xvd2VyQ2FzZSgpICkge1xyXG5cdFx0XHRcdGlmICggLTEgIT09IHNlbGYuY2xhc3NOYW1lLmluZGV4T2YoICdmb2N1cycgKSApIHtcclxuXHRcdFx0XHRcdHNlbGYuY2xhc3NOYW1lID0gc2VsZi5jbGFzc05hbWUucmVwbGFjZSggJyBmb2N1cycsICcnICk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHNlbGYuY2xhc3NOYW1lICs9ICcgZm9jdXMnO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0c2VsZiA9IHNlbGYucGFyZW50RWxlbWVudDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRvZ2dsZXMgYGZvY3VzYCBjbGFzcyB0byBhbGxvdyBzdWJtZW51IGFjY2VzcyBvbiB0YWJsZXRzLlxyXG5cdCAqL1xyXG5cdCggZnVuY3Rpb24oIGNvbnRhaW5lciApIHtcclxuXHRcdHZhciB0b3VjaFN0YXJ0Rm4sIGksXHJcblx0XHRcdHBhcmVudExpbmsgPSBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCggJy5tZW51LWl0ZW0taGFzLWNoaWxkcmVuID4gYSwgLnBhZ2VfaXRlbV9oYXNfY2hpbGRyZW4gPiBhJyApO1xyXG5cclxuXHRcdGlmICggJ29udG91Y2hzdGFydCcgaW4gd2luZG93ICkge1xyXG5cdFx0XHR0b3VjaFN0YXJ0Rm4gPSBmdW5jdGlvbiggZSApIHtcclxuXHRcdFx0XHR2YXIgbWVudUl0ZW0gPSB0aGlzLnBhcmVudE5vZGUsIGk7XHJcblxyXG5cdFx0XHRcdGlmICggISBtZW51SXRlbS5jbGFzc0xpc3QuY29udGFpbnMoICdmb2N1cycgKSApIHtcclxuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHRcdGZvciAoIGkgPSAwOyBpIDwgbWVudUl0ZW0ucGFyZW50Tm9kZS5jaGlsZHJlbi5sZW5ndGg7ICsraSApIHtcclxuXHRcdFx0XHRcdFx0aWYgKCBtZW51SXRlbSA9PT0gbWVudUl0ZW0ucGFyZW50Tm9kZS5jaGlsZHJlbltpXSApIHtcclxuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRtZW51SXRlbS5wYXJlbnROb2RlLmNoaWxkcmVuW2ldLmNsYXNzTGlzdC5yZW1vdmUoICdmb2N1cycgKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdG1lbnVJdGVtLmNsYXNzTGlzdC5hZGQoICdmb2N1cycgKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0bWVudUl0ZW0uY2xhc3NMaXN0LnJlbW92ZSggJ2ZvY3VzJyApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGZvciAoIGkgPSAwOyBpIDwgcGFyZW50TGluay5sZW5ndGg7ICsraSApIHtcclxuXHRcdFx0XHRwYXJlbnRMaW5rW2ldLmFkZEV2ZW50TGlzdGVuZXIoICd0b3VjaHN0YXJ0JywgdG91Y2hTdGFydEZuLCBmYWxzZSApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSggY29udGFpbmVyICkgKTtcclxufSApKCk7XHJcbiIsIiIsIiQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB2aWRlb3MgPSAkKCdpZnJhbWVbc3JjKj1cInZpbWVvLmNvbVwiXSwgaWZyYW1lW3NyYyo9XCJ5b3V0dWJlLmNvbVwiXScpO1xyXG5cclxuICAgIHZpZGVvcy5lYWNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgZWwgPSAkKHRoaXMpO1xyXG4gICAgICAgIGVsLndyYXAoJzxkaXYgY2xhc3M9XCJyZXNwb25zaXZlLWVtYmVkIHdpZGVzY3JlZW5cIi8+Jyk7XHJcbiAgICB9KTtcclxufSk7XHJcbiIsIi8qKlxyXG4gKiBGaWxlIHNraXAtbGluay1mb2N1cy1maXguanMuXHJcbiAqXHJcbiAqIEhlbHBzIHdpdGggYWNjZXNzaWJpbGl0eSBmb3Iga2V5Ym9hcmQgb25seSB1c2Vycy5cclxuICpcclxuICogTGVhcm4gbW9yZTogaHR0cHM6Ly9naXQuaW8vdldkcjJcclxuICovXHJcbihmdW5jdGlvbigpIHtcclxuXHR2YXIgaXNJZSA9IC8odHJpZGVudHxtc2llKS9pLnRlc3QoIG5hdmlnYXRvci51c2VyQWdlbnQgKTtcclxuXHJcblx0aWYgKCBpc0llICYmIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyICkge1xyXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoICdoYXNoY2hhbmdlJywgZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciBpZCA9IGxvY2F0aW9uLmhhc2guc3Vic3RyaW5nKCAxICksXHJcblx0XHRcdFx0ZWxlbWVudDtcclxuXHJcblx0XHRcdGlmICggISAoIC9eW0EtejAtOV8tXSskLy50ZXN0KCBpZCApICkgKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIGlkICk7XHJcblxyXG5cdFx0XHRpZiAoIGVsZW1lbnQgKSB7XHJcblx0XHRcdFx0aWYgKCAhICggL14oPzphfHNlbGVjdHxpbnB1dHxidXR0b258dGV4dGFyZWEpJC9pLnRlc3QoIGVsZW1lbnQudGFnTmFtZSApICkgKSB7XHJcblx0XHRcdFx0XHRlbGVtZW50LnRhYkluZGV4ID0gLTE7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRlbGVtZW50LmZvY3VzKCk7XHJcblx0XHRcdH1cclxuXHRcdH0sIGZhbHNlICk7XHJcblx0fVxyXG59KSgpO1xyXG4iLCJcclxuJCh3aW5kb3cpLmJpbmQoJyBsb2FkIHJlc2l6ZSBvcmllbnRhdGlvbkNoYW5nZSAnLCBmdW5jdGlvbiAoKSB7XHJcbiAgIHZhciBmb290ZXIgPSAkKFwiI2Zvb3Rlci1jb250YWluZXJcIik7XHJcbiAgIHZhciBwb3MgPSBmb290ZXIucG9zaXRpb24oKTtcclxuICAgdmFyIGhlaWdodCA9ICQod2luZG93KS5oZWlnaHQoKTtcclxuICAgaGVpZ2h0ID0gaGVpZ2h0IC0gcG9zLnRvcDtcclxuICAgaGVpZ2h0ID0gaGVpZ2h0IC0gZm9vdGVyLmhlaWdodCgpIC0xO1xyXG5cclxuICAgZnVuY3Rpb24gc3RpY2t5Rm9vdGVyKCkge1xyXG4gICAgIGZvb3Rlci5jc3Moe1xyXG4gICAgICAgICAnbWFyZ2luLXRvcCc6IGhlaWdodCArICdweCdcclxuICAgICB9KTtcclxuICAgfVxyXG5cclxuICAgaWYgKGhlaWdodCA+IDApIHtcclxuICAgICBzdGlja3lGb290ZXIoKTtcclxuICAgfVxyXG59KTtcclxuIl19
