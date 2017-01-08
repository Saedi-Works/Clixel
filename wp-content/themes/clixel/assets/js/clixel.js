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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRldGhlci5qcyIsImJvb3RzdHJhcC5qcyIsIm5hdmlnYXRpb24uanMiLCJza2lwLWxpbmstZm9jdXMtZml4LmpzIl0sIm5hbWVzIjpbInJvb3QiLCJmYWN0b3J5IiwiZGVmaW5lIiwiYW1kIiwiZXhwb3J0cyIsIm1vZHVsZSIsInJlcXVpcmUiLCJUZXRoZXIiLCJfY3JlYXRlQ2xhc3MiLCJkZWZpbmVQcm9wZXJ0aWVzIiwidGFyZ2V0IiwicHJvcHMiLCJpIiwibGVuZ3RoIiwiZGVzY3JpcHRvciIsImVudW1lcmFibGUiLCJjb25maWd1cmFibGUiLCJ3cml0YWJsZSIsIk9iamVjdCIsImRlZmluZVByb3BlcnR5Iiwia2V5IiwiQ29uc3RydWN0b3IiLCJwcm90b1Byb3BzIiwic3RhdGljUHJvcHMiLCJwcm90b3R5cGUiLCJfY2xhc3NDYWxsQ2hlY2siLCJpbnN0YW5jZSIsIlR5cGVFcnJvciIsIlRldGhlckJhc2UiLCJ1bmRlZmluZWQiLCJtb2R1bGVzIiwiemVyb0VsZW1lbnQiLCJnZXRBY3R1YWxCb3VuZGluZ0NsaWVudFJlY3QiLCJub2RlIiwiYm91bmRpbmdSZWN0IiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0IiwicmVjdCIsImsiLCJvd25lckRvY3VtZW50IiwiZG9jdW1lbnQiLCJfZnJhbWVFbGVtZW50IiwiZGVmYXVsdFZpZXciLCJmcmFtZUVsZW1lbnQiLCJmcmFtZVJlY3QiLCJ0b3AiLCJib3R0b20iLCJsZWZ0IiwicmlnaHQiLCJnZXRTY3JvbGxQYXJlbnRzIiwiZWwiLCJjb21wdXRlZFN0eWxlIiwiZ2V0Q29tcHV0ZWRTdHlsZSIsInBvc2l0aW9uIiwicGFyZW50cyIsInBhcmVudCIsInBhcmVudE5vZGUiLCJub2RlVHlwZSIsInN0eWxlIiwiZXJyIiwicHVzaCIsIl9zdHlsZSIsIm92ZXJmbG93Iiwib3ZlcmZsb3dYIiwib3ZlcmZsb3dZIiwidGVzdCIsImluZGV4T2YiLCJib2R5IiwidW5pcXVlSWQiLCJpZCIsInplcm9Qb3NDYWNoZSIsImdldE9yaWdpbiIsImNvbnRhaW5zIiwiY3JlYXRlRWxlbWVudCIsInNldEF0dHJpYnV0ZSIsImV4dGVuZCIsImFwcGVuZENoaWxkIiwiZ2V0QXR0cmlidXRlIiwiZGVmZXIiLCJyZW1vdmVVdGlsRWxlbWVudHMiLCJyZW1vdmVDaGlsZCIsImdldEJvdW5kcyIsImRvYyIsImRvY3VtZW50RWxlbWVudCIsImRvY0VsIiwiYm94Iiwib3JpZ2luIiwid2lkdGgiLCJzY3JvbGxXaWR0aCIsImhlaWdodCIsInNjcm9sbEhlaWdodCIsImNsaWVudFRvcCIsImNsaWVudExlZnQiLCJjbGllbnRXaWR0aCIsImNsaWVudEhlaWdodCIsImdldE9mZnNldFBhcmVudCIsIm9mZnNldFBhcmVudCIsIl9zY3JvbGxCYXJTaXplIiwiZ2V0U2Nyb2xsQmFyU2l6ZSIsImlubmVyIiwib3V0ZXIiLCJwb2ludGVyRXZlbnRzIiwidmlzaWJpbGl0eSIsIndpZHRoQ29udGFpbmVkIiwib2Zmc2V0V2lkdGgiLCJ3aWR0aFNjcm9sbCIsIm91dCIsImFyZ3VtZW50cyIsImFyZ3MiLCJBcnJheSIsImFwcGx5Iiwic2xpY2UiLCJmb3JFYWNoIiwib2JqIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwicmVtb3ZlQ2xhc3MiLCJuYW1lIiwiY2xhc3NMaXN0Iiwic3BsaXQiLCJjbHMiLCJ0cmltIiwicmVtb3ZlIiwicmVnZXgiLCJSZWdFeHAiLCJqb2luIiwiY2xhc3NOYW1lIiwiZ2V0Q2xhc3NOYW1lIiwicmVwbGFjZSIsInNldENsYXNzTmFtZSIsImFkZENsYXNzIiwiYWRkIiwiaGFzQ2xhc3MiLCJTVkdBbmltYXRlZFN0cmluZyIsImJhc2VWYWwiLCJ1cGRhdGVDbGFzc2VzIiwiYWxsIiwiZGVmZXJyZWQiLCJmbiIsImZsdXNoIiwicG9wIiwiRXZlbnRlZCIsInZhbHVlIiwib24iLCJldmVudCIsImhhbmRsZXIiLCJjdHgiLCJvbmNlIiwiYmluZGluZ3MiLCJvZmYiLCJzcGxpY2UiLCJ0cmlnZ2VyIiwiX2xlbiIsIl9rZXkiLCJfYmluZGluZ3MkZXZlbnQkaSIsImNvbnRleHQiLCJVdGlscyIsIl9zbGljZWRUb0FycmF5Iiwic2xpY2VJdGVyYXRvciIsImFyciIsIl9hcnIiLCJfbiIsIl9kIiwiX2UiLCJfaSIsIlN5bWJvbCIsIml0ZXJhdG9yIiwiX3MiLCJuZXh0IiwiZG9uZSIsImlzQXJyYXkiLCJfZ2V0IiwiZ2V0IiwiX3g2IiwiX3g3IiwiX3g4IiwiX2FnYWluIiwiX2Z1bmN0aW9uIiwib2JqZWN0IiwicHJvcGVydHkiLCJyZWNlaXZlciIsIkZ1bmN0aW9uIiwiZGVzYyIsImdldE93blByb3BlcnR5RGVzY3JpcHRvciIsImdldFByb3RvdHlwZU9mIiwiZ2V0dGVyIiwiX2luaGVyaXRzIiwic3ViQ2xhc3MiLCJzdXBlckNsYXNzIiwiY3JlYXRlIiwiY29uc3RydWN0b3IiLCJzZXRQcm90b3R5cGVPZiIsIl9fcHJvdG9fXyIsIkVycm9yIiwiX1RldGhlckJhc2UkVXRpbHMiLCJ3aXRoaW4iLCJhIiwiYiIsImRpZmYiLCJ0cmFuc2Zvcm1LZXkiLCJ0cmFuc2Zvcm1zIiwidGV0aGVycyIsInRldGhlciIsIm5vdyIsInBlcmZvcm1hbmNlIiwiRGF0ZSIsImxhc3RDYWxsIiwibGFzdER1cmF0aW9uIiwicGVuZGluZ1RpbWVvdXQiLCJ0aWNrIiwiTWF0aCIsIm1pbiIsInNldFRpbWVvdXQiLCJjbGVhclRpbWVvdXQiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiTUlSUk9SX0xSIiwiY2VudGVyIiwiTUlSUk9SX1RCIiwibWlkZGxlIiwiT0ZGU0VUX01BUCIsImF1dG9Ub0ZpeGVkQXR0YWNobWVudCIsImF0dGFjaG1lbnQiLCJyZWxhdGl2ZVRvQXR0YWNobWVudCIsImF0dGFjaG1lbnRUb09mZnNldCIsImFkZE9mZnNldCIsIm9mZnNldHMiLCJfcmVmIiwicGFyc2VGbG9hdCIsIm9mZnNldFRvUHgiLCJvZmZzZXQiLCJzaXplIiwicGFyc2VPZmZzZXQiLCJfdmFsdWUkc3BsaXQiLCJfdmFsdWUkc3BsaXQyIiwicGFyc2VBdHRhY2htZW50IiwiVGV0aGVyQ2xhc3MiLCJfRXZlbnRlZCIsIm9wdGlvbnMiLCJfdGhpcyIsImJpbmQiLCJoaXN0b3J5Iiwic2V0T3B0aW9ucyIsImluaXRpYWxpemUiLCJnZXRDbGFzcyIsImNsYXNzZXMiLCJjbGFzc1ByZWZpeCIsIl90aGlzMiIsInBvcyIsImRlZmF1bHRzIiwidGFyZ2V0T2Zmc2V0IiwidGFyZ2V0QXR0YWNobWVudCIsIl9vcHRpb25zIiwiZWxlbWVudCIsInRhcmdldE1vZGlmaWVyIiwianF1ZXJ5IiwicXVlcnlTZWxlY3RvciIsImFkZFRhcmdldENsYXNzZXMiLCJzY3JvbGxQYXJlbnRzIiwiZGlzYWJsZSIsImVuYWJsZWQiLCJlbmFibGUiLCJnZXRUYXJnZXRCb3VuZHMiLCJwYWdlWU9mZnNldCIsInBhZ2VYT2Zmc2V0IiwiaW5uZXJIZWlnaHQiLCJpbm5lcldpZHRoIiwiYm91bmRzIiwiaGFzQm90dG9tU2Nyb2xsIiwic2Nyb2xsQm90dG9tIiwiYm9yZGVyVG9wV2lkdGgiLCJib3JkZXJCb3R0b21XaWR0aCIsImJvcmRlckxlZnRXaWR0aCIsImZpdEFkaiIsInBvdyIsIm1heCIsInNjcm9sbFBlcmNlbnRhZ2UiLCJzY3JvbGxUb3AiLCJjbGVhckNhY2hlIiwiX2NhY2hlIiwiY2FjaGUiLCJfdGhpczMiLCJfdGhpczQiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiZGVzdHJveSIsIl90aGlzNSIsInVwZGF0ZUF0dGFjaENsYXNzZXMiLCJlbGVtZW50QXR0YWNoIiwidGFyZ2V0QXR0YWNoIiwiX3RoaXM2Iiwic2lkZXMiLCJfYWRkQXR0YWNoQ2xhc3NlcyIsInNpZGUiLCJfdGhpczciLCJmbHVzaENoYW5nZXMiLCJlbGVtZW50UG9zIiwibGFzdFNpemUiLCJfbGFzdFNpemUiLCJ0YXJnZXRQb3MiLCJ0YXJnZXRTaXplIiwibWFudWFsT2Zmc2V0IiwibWFudWFsVGFyZ2V0T2Zmc2V0IiwiX21vZHVsZTIiLCJyZXQiLCJzY3JvbGxiYXJTaXplIiwicGFnZSIsInZpZXdwb3J0Iiwid2luIiwicGFyZW50RWxlbWVudCIsIm9wdGltaXphdGlvbnMiLCJtb3ZlRWxlbWVudCIsIm9mZnNldFBvc2l0aW9uIiwib2Zmc2V0UGFyZW50U3R5bGUiLCJvZmZzZXRQYXJlbnRTaXplIiwib2Zmc2V0Qm9yZGVyIiwidG9Mb3dlckNhc2UiLCJzY3JvbGxMZWZ0IiwibW92ZSIsInVuc2hpZnQiLCJfdGhpczgiLCJzYW1lIiwidHlwZSIsImZvdW5kIiwicG9pbnQiLCJjc3MiLCJ0cmFuc2NyaWJlIiwiX3NhbWUiLCJfcG9zIiwiaGFzT3B0aW1pemF0aW9ucyIsImdwdSIsInlQb3MiLCJ4UG9zIiwibWF0Y2hNZWRpYSIsInJldGluYSIsIm1hdGNoZXMiLCJyb3VuZCIsIm1vdmVkIiwiYm9keUVsZW1lbnQiLCJvZmZzZXRQYXJlbnRJc0JvZHkiLCJjdXJyZW50Tm9kZSIsInRhZ05hbWUiLCJ3cml0ZUNTUyIsIndyaXRlIiwidmFsIiwiZWxWYWwiLCJCT1VORFNfRk9STUFUIiwiZ2V0Qm91bmRpbmdSZWN0IiwidG8iLCJ0b1VwcGVyQ2FzZSIsInN1YnN0ciIsImNvbnN0cmFpbnRzIiwidGFyZ2V0SGVpZ2h0IiwidGFyZ2V0V2lkdGgiLCJhbGxDbGFzc2VzIiwiY29uc3RyYWludCIsIm91dE9mQm91bmRzQ2xhc3MiLCJwaW5uZWRDbGFzcyIsImFkZENsYXNzZXMiLCJ0QXR0YWNobWVudCIsImVBdHRhY2htZW50IiwicGluIiwiY2hhbmdlQXR0YWNoWCIsImNoYW5nZUF0dGFjaFkiLCJfYXR0YWNobWVudCRzcGxpdCIsIl9hdHRhY2htZW50JHNwbGl0MiIsIm1hcCIsInAiLCJwaW5uZWQiLCJvb2IiLCJvb2JDbGFzcyIsImFidXR0ZWQiLCJ0YXJnZXRQb3NTaWRlIiwic2hpZnQiLCJzaGlmdFRvcCIsInNoaWZ0TGVmdCIsIl9zaGlmdCIsIl9zaGlmdDIiLCJqUXVlcnkiLCIkIiwidmVyc2lvbiIsIl90eXBlb2YiLCJfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybiIsInNlbGYiLCJSZWZlcmVuY2VFcnJvciIsIlV0aWwiLCJ0cmFuc2l0aW9uIiwiTUFYX1VJRCIsIlRyYW5zaXRpb25FbmRFdmVudCIsIldlYmtpdFRyYW5zaXRpb24iLCJNb3pUcmFuc2l0aW9uIiwiT1RyYW5zaXRpb24iLCJ0b1R5cGUiLCJ0b1N0cmluZyIsIm1hdGNoIiwiaXNFbGVtZW50IiwiZ2V0U3BlY2lhbFRyYW5zaXRpb25FbmRFdmVudCIsImJpbmRUeXBlIiwiZW5kIiwiZGVsZWdhdGVUeXBlIiwiaGFuZGxlIiwiaXMiLCJoYW5kbGVPYmoiLCJ0cmFuc2l0aW9uRW5kVGVzdCIsIlFVbml0IiwidHJhbnNpdGlvbkVuZEVtdWxhdG9yIiwiZHVyYXRpb24iLCJjYWxsZWQiLCJvbmUiLCJUUkFOU0lUSU9OX0VORCIsInRyaWdnZXJUcmFuc2l0aW9uRW5kIiwic2V0VHJhbnNpdGlvbkVuZFN1cHBvcnQiLCJlbXVsYXRlVHJhbnNpdGlvbkVuZCIsInN1cHBvcnRzVHJhbnNpdGlvbkVuZCIsInNwZWNpYWwiLCJnZXRVSUQiLCJwcmVmaXgiLCJyYW5kb20iLCJnZXRFbGVtZW50QnlJZCIsImdldFNlbGVjdG9yRnJvbUVsZW1lbnQiLCJzZWxlY3RvciIsInJlZmxvdyIsIm9mZnNldEhlaWdodCIsIkJvb2xlYW4iLCJ0eXBlQ2hlY2tDb25maWciLCJjb21wb25lbnROYW1lIiwiY29uZmlnIiwiY29uZmlnVHlwZXMiLCJleHBlY3RlZFR5cGVzIiwidmFsdWVUeXBlIiwiQWxlcnQiLCJOQU1FIiwiVkVSU0lPTiIsIkRBVEFfS0VZIiwiRVZFTlRfS0VZIiwiREFUQV9BUElfS0VZIiwiSlFVRVJZX05PX0NPTkZMSUNUIiwiVFJBTlNJVElPTl9EVVJBVElPTiIsIlNlbGVjdG9yIiwiRElTTUlTUyIsIkV2ZW50IiwiQ0xPU0UiLCJDTE9TRUQiLCJDTElDS19EQVRBX0FQSSIsIkNsYXNzTmFtZSIsIkFMRVJUIiwiRkFERSIsIlNIT1ciLCJfZWxlbWVudCIsImNsb3NlIiwicm9vdEVsZW1lbnQiLCJfZ2V0Um9vdEVsZW1lbnQiLCJjdXN0b21FdmVudCIsIl90cmlnZ2VyQ2xvc2VFdmVudCIsImlzRGVmYXVsdFByZXZlbnRlZCIsIl9yZW1vdmVFbGVtZW50IiwiZGlzcG9zZSIsInJlbW92ZURhdGEiLCJjbG9zZXN0IiwiY2xvc2VFdmVudCIsIl9kZXN0cm95RWxlbWVudCIsImRldGFjaCIsIl9qUXVlcnlJbnRlcmZhY2UiLCJlYWNoIiwiJGVsZW1lbnQiLCJkYXRhIiwiX2hhbmRsZURpc21pc3MiLCJhbGVydEluc3RhbmNlIiwicHJldmVudERlZmF1bHQiLCJub0NvbmZsaWN0IiwiQnV0dG9uIiwiQUNUSVZFIiwiQlVUVE9OIiwiRk9DVVMiLCJEQVRBX1RPR0dMRV9DQVJST1QiLCJEQVRBX1RPR0dMRSIsIklOUFVUIiwiRk9DVVNfQkxVUl9EQVRBX0FQSSIsInRvZ2dsZSIsInRyaWdnZXJDaGFuZ2VFdmVudCIsImlucHV0IiwiZmluZCIsImNoZWNrZWQiLCJhY3RpdmVFbGVtZW50IiwiZm9jdXMiLCJ0b2dnbGVDbGFzcyIsImJ1dHRvbiIsIkNhcm91c2VsIiwiQVJST1dfTEVGVF9LRVlDT0RFIiwiQVJST1dfUklHSFRfS0VZQ09ERSIsIkRlZmF1bHQiLCJpbnRlcnZhbCIsImtleWJvYXJkIiwic2xpZGUiLCJwYXVzZSIsIndyYXAiLCJEZWZhdWx0VHlwZSIsIkRpcmVjdGlvbiIsIk5FWFQiLCJQUkVWIiwiTEVGVCIsIlJJR0hUIiwiU0xJREUiLCJTTElEIiwiS0VZRE9XTiIsIk1PVVNFRU5URVIiLCJNT1VTRUxFQVZFIiwiTE9BRF9EQVRBX0FQSSIsIkNBUk9VU0VMIiwiSVRFTSIsIkFDVElWRV9JVEVNIiwiTkVYVF9QUkVWIiwiSU5ESUNBVE9SUyIsIkRBVEFfU0xJREUiLCJEQVRBX1JJREUiLCJfaXRlbXMiLCJfaW50ZXJ2YWwiLCJfYWN0aXZlRWxlbWVudCIsIl9pc1BhdXNlZCIsIl9pc1NsaWRpbmciLCJfY29uZmlnIiwiX2dldENvbmZpZyIsIl9pbmRpY2F0b3JzRWxlbWVudCIsIl9hZGRFdmVudExpc3RlbmVycyIsIl9zbGlkZSIsIm5leHRXaGVuVmlzaWJsZSIsImhpZGRlbiIsInByZXYiLCJQUkVWSU9VUyIsImN5Y2xlIiwiY2xlYXJJbnRlcnZhbCIsInNldEludGVydmFsIiwidmlzaWJpbGl0eVN0YXRlIiwiaW5kZXgiLCJhY3RpdmVJbmRleCIsIl9nZXRJdGVtSW5kZXgiLCJkaXJlY3Rpb24iLCJfa2V5ZG93biIsIndoaWNoIiwibWFrZUFycmF5IiwiX2dldEl0ZW1CeURpcmVjdGlvbiIsImlzTmV4dERpcmVjdGlvbiIsImlzUHJldkRpcmVjdGlvbiIsImxhc3RJdGVtSW5kZXgiLCJpc0dvaW5nVG9XcmFwIiwiZGVsdGEiLCJpdGVtSW5kZXgiLCJfdHJpZ2dlclNsaWRlRXZlbnQiLCJyZWxhdGVkVGFyZ2V0IiwiZXZlbnREaXJlY3Rpb25OYW1lIiwic2xpZGVFdmVudCIsIl9zZXRBY3RpdmVJbmRpY2F0b3JFbGVtZW50IiwibmV4dEluZGljYXRvciIsImNoaWxkcmVuIiwibmV4dEVsZW1lbnQiLCJpc0N5Y2xpbmciLCJkaXJlY3Rpb25hbENsYXNzTmFtZSIsIm9yZGVyQ2xhc3NOYW1lIiwic2xpZEV2ZW50IiwiYWN0aW9uIiwiX2RhdGFBcGlDbGlja0hhbmRsZXIiLCJzbGlkZUluZGV4IiwiJGNhcm91c2VsIiwiQ29sbGFwc2UiLCJTSE9XTiIsIkhJREUiLCJISURERU4iLCJDT0xMQVBTRSIsIkNPTExBUFNJTkciLCJDT0xMQVBTRUQiLCJEaW1lbnNpb24iLCJXSURUSCIsIkhFSUdIVCIsIkFDVElWRVMiLCJfaXNUcmFuc2l0aW9uaW5nIiwiX3RyaWdnZXJBcnJheSIsIl9wYXJlbnQiLCJfZ2V0UGFyZW50IiwiX2FkZEFyaWFBbmRDb2xsYXBzZWRDbGFzcyIsImhpZGUiLCJzaG93IiwiYWN0aXZlcyIsImFjdGl2ZXNEYXRhIiwic3RhcnRFdmVudCIsImRpbWVuc2lvbiIsIl9nZXREaW1lbnNpb24iLCJhdHRyIiwic2V0VHJhbnNpdGlvbmluZyIsImNvbXBsZXRlIiwiY2FwaXRhbGl6ZWREaW1lbnNpb24iLCJzY3JvbGxTaXplIiwib2Zmc2V0RGltZW5zaW9uIiwiaXNUcmFuc2l0aW9uaW5nIiwiaGFzV2lkdGgiLCJfZ2V0VGFyZ2V0RnJvbUVsZW1lbnQiLCJ0cmlnZ2VyQXJyYXkiLCJpc09wZW4iLCIkdGhpcyIsIkRyb3Bkb3duIiwiRVNDQVBFX0tFWUNPREUiLCJBUlJPV19VUF9LRVlDT0RFIiwiQVJST1dfRE9XTl9LRVlDT0RFIiwiUklHSFRfTU9VU0VfQlVUVE9OX1dISUNIIiwiQ0xJQ0siLCJGT0NVU0lOX0RBVEFfQVBJIiwiS0VZRE9XTl9EQVRBX0FQSSIsIkJBQ0tEUk9QIiwiRElTQUJMRUQiLCJGT1JNX0NISUxEIiwiUk9MRV9NRU5VIiwiUk9MRV9MSVNUQk9YIiwiTkFWQkFSX05BViIsIlZJU0lCTEVfSVRFTVMiLCJkaXNhYmxlZCIsIl9nZXRQYXJlbnRGcm9tRWxlbWVudCIsImlzQWN0aXZlIiwiX2NsZWFyTWVudXMiLCJkcm9wZG93biIsImluc2VydEJlZm9yZSIsInNob3dFdmVudCIsImJhY2tkcm9wIiwidG9nZ2xlcyIsImhpZGVFdmVudCIsIl9kYXRhQXBpS2V5ZG93bkhhbmRsZXIiLCJzdG9wUHJvcGFnYXRpb24iLCJpdGVtcyIsImUiLCJNb2RhbCIsIkJBQ0tEUk9QX1RSQU5TSVRJT05fRFVSQVRJT04iLCJGT0NVU0lOIiwiUkVTSVpFIiwiQ0xJQ0tfRElTTUlTUyIsIktFWURPV05fRElTTUlTUyIsIk1PVVNFVVBfRElTTUlTUyIsIk1PVVNFRE9XTl9ESVNNSVNTIiwiU0NST0xMQkFSX01FQVNVUkVSIiwiT1BFTiIsIkRJQUxPRyIsIkRBVEFfRElTTUlTUyIsIkZJWEVEX0NPTlRFTlQiLCJfZGlhbG9nIiwiX2JhY2tkcm9wIiwiX2lzU2hvd24iLCJfaXNCb2R5T3ZlcmZsb3dpbmciLCJfaWdub3JlQmFja2Ryb3BDbGljayIsIl9vcmlnaW5hbEJvZHlQYWRkaW5nIiwiX3Njcm9sbGJhcldpZHRoIiwiX3RoaXM5IiwiX2NoZWNrU2Nyb2xsYmFyIiwiX3NldFNjcm9sbGJhciIsIl9zZXRFc2NhcGVFdmVudCIsIl9zZXRSZXNpemVFdmVudCIsIl9zaG93QmFja2Ryb3AiLCJfc2hvd0VsZW1lbnQiLCJfdGhpczEwIiwiX2hpZGVNb2RhbCIsIl90aGlzMTEiLCJOb2RlIiwiRUxFTUVOVF9OT0RFIiwiZGlzcGxheSIsInJlbW92ZUF0dHJpYnV0ZSIsIl9lbmZvcmNlRm9jdXMiLCJzaG93bkV2ZW50IiwidHJhbnNpdGlvbkNvbXBsZXRlIiwiX3RoaXMxMiIsImhhcyIsIl90aGlzMTMiLCJfdGhpczE0IiwiX2hhbmRsZVVwZGF0ZSIsIl90aGlzMTUiLCJfcmVzZXRBZGp1c3RtZW50cyIsIl9yZXNldFNjcm9sbGJhciIsIl9yZW1vdmVCYWNrZHJvcCIsImNhbGxiYWNrIiwiX3RoaXMxNiIsImFuaW1hdGUiLCJkb0FuaW1hdGUiLCJhcHBlbmRUbyIsImN1cnJlbnRUYXJnZXQiLCJjYWxsYmFja1JlbW92ZSIsIl9hZGp1c3REaWFsb2ciLCJpc01vZGFsT3ZlcmZsb3dpbmciLCJwYWRkaW5nTGVmdCIsInBhZGRpbmdSaWdodCIsIl9nZXRTY3JvbGxiYXJXaWR0aCIsImJvZHlQYWRkaW5nIiwicGFyc2VJbnQiLCJzY3JvbGxEaXYiLCJzY3JvbGxiYXJXaWR0aCIsIl90aGlzMTciLCIkdGFyZ2V0IiwiU2Nyb2xsU3B5IiwibWV0aG9kIiwiQUNUSVZBVEUiLCJTQ1JPTEwiLCJEUk9QRE9XTl9JVEVNIiwiRFJPUERPV05fTUVOVSIsIk5BVl9MSU5LIiwiTkFWIiwiREFUQV9TUFkiLCJMSVNUX0lURU0iLCJMSSIsIkxJX0RST1BET1dOIiwiTkFWX0xJTktTIiwiRFJPUERPV04iLCJEUk9QRE9XTl9JVEVNUyIsIkRST1BET1dOX1RPR0dMRSIsIk9mZnNldE1ldGhvZCIsIk9GRlNFVCIsIlBPU0lUSU9OIiwiX3RoaXMxOCIsIl9zY3JvbGxFbGVtZW50IiwiX3NlbGVjdG9yIiwiX29mZnNldHMiLCJfdGFyZ2V0cyIsIl9hY3RpdmVUYXJnZXQiLCJfc2Nyb2xsSGVpZ2h0IiwiX3Byb2Nlc3MiLCJyZWZyZXNoIiwiX3RoaXMxOSIsImF1dG9NZXRob2QiLCJvZmZzZXRNZXRob2QiLCJvZmZzZXRCYXNlIiwiX2dldFNjcm9sbFRvcCIsIl9nZXRTY3JvbGxIZWlnaHQiLCJ0YXJnZXRzIiwidGFyZ2V0U2VsZWN0b3IiLCJmaWx0ZXIiLCJpdGVtIiwic29ydCIsIl9nZXRPZmZzZXRIZWlnaHQiLCJtYXhTY3JvbGwiLCJfYWN0aXZhdGUiLCJfY2xlYXIiLCJpc0FjdGl2ZVRhcmdldCIsInF1ZXJpZXMiLCIkbGluayIsInNjcm9sbFNweXMiLCIkc3B5IiwiVGFiIiwiQSIsIkxJU1QiLCJGQURFX0NISUxEIiwiQUNUSVZFX0NISUxEIiwiRFJPUERPV05fQUNUSVZFX0NISUxEIiwiX3RoaXMyMCIsInByZXZpb3VzIiwibGlzdEVsZW1lbnQiLCJoaWRkZW5FdmVudCIsImNvbnRhaW5lciIsIl90aGlzMjEiLCJhY3RpdmUiLCJfdHJhbnNpdGlvbkNvbXBsZXRlIiwiZHJvcGRvd25DaGlsZCIsImRyb3Bkb3duRWxlbWVudCIsIlRvb2x0aXAiLCJDTEFTU19QUkVGSVgiLCJhbmltYXRpb24iLCJ0ZW1wbGF0ZSIsInRpdGxlIiwiZGVsYXkiLCJodG1sIiwicGxhY2VtZW50IiwiQXR0YWNobWVudE1hcCIsIlRPUCIsIkJPVFRPTSIsIkhvdmVyU3RhdGUiLCJPVVQiLCJJTlNFUlRFRCIsIkZPQ1VTT1VUIiwiVE9PTFRJUCIsIlRPT0xUSVBfSU5ORVIiLCJUcmlnZ2VyIiwiSE9WRVIiLCJNQU5VQUwiLCJfaXNFbmFibGVkIiwiX3RpbWVvdXQiLCJfaG92ZXJTdGF0ZSIsIl9hY3RpdmVUcmlnZ2VyIiwiX3RldGhlciIsInRpcCIsIl9zZXRMaXN0ZW5lcnMiLCJ0b2dnbGVFbmFibGVkIiwiZGF0YUtleSIsIl9nZXREZWxlZ2F0ZUNvbmZpZyIsImNsaWNrIiwiX2lzV2l0aEFjdGl2ZVRyaWdnZXIiLCJfZW50ZXIiLCJfbGVhdmUiLCJnZXRUaXBFbGVtZW50IiwiY2xlYW51cFRldGhlciIsIl90aGlzMjIiLCJpc1dpdGhDb250ZW50IiwiaXNJblRoZURvbSIsInRpcElkIiwic2V0Q29udGVudCIsIl9nZXRBdHRhY2htZW50IiwicHJldkhvdmVyU3RhdGUiLCJfVFJBTlNJVElPTl9EVVJBVElPTiIsIl90aGlzMjMiLCJnZXRUaXRsZSIsIiR0aXAiLCJzZXRFbGVtZW50Q29udGVudCIsImNvbnRlbnQiLCJlbXB0eSIsImFwcGVuZCIsInRleHQiLCJfdGhpczI0IiwidHJpZ2dlcnMiLCJldmVudEluIiwiZXZlbnRPdXQiLCJfZml4VGl0bGUiLCJ0aXRsZVR5cGUiLCJQb3BvdmVyIiwiVElUTEUiLCJDT05URU5UIiwiX1Rvb2x0aXAiLCJfZ2V0Q29udGVudCIsIm1lbnUiLCJsaW5rcyIsImxlbiIsImdldEVsZW1lbnRzQnlUYWdOYW1lIiwib25jbGljayIsInRvZ2dsZUZvY3VzIiwidG91Y2hTdGFydEZuIiwicGFyZW50TGluayIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJtZW51SXRlbSIsImlzSWUiLCJuYXZpZ2F0b3IiLCJ1c2VyQWdlbnQiLCJsb2NhdGlvbiIsImhhc2giLCJzdWJzdHJpbmciLCJ0YWJJbmRleCJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7QUFFQyxXQUFTQSxJQUFULEVBQWVDLE9BQWYsRUFBd0I7QUFDdkIsTUFBSSxPQUFPQyxNQUFQLEtBQWtCLFVBQWxCLElBQWdDQSxPQUFPQyxHQUEzQyxFQUFnRDtBQUM5Q0QsV0FBT0QsT0FBUDtBQUNELEdBRkQsTUFFTyxJQUFJLE9BQU9HLE9BQVAsS0FBbUIsUUFBdkIsRUFBaUM7QUFDdENDLFdBQU9ELE9BQVAsR0FBaUJILFFBQVFLLE9BQVIsRUFBaUJGLE9BQWpCLEVBQTBCQyxNQUExQixDQUFqQjtBQUNELEdBRk0sTUFFQTtBQUNMTCxTQUFLTyxNQUFMLEdBQWNOLFNBQWQ7QUFDRDtBQUNGLENBUkEsRUFRQyxJQVJELEVBUU8sVUFBU0ssT0FBVCxFQUFrQkYsT0FBbEIsRUFBMkJDLE1BQTNCLEVBQW1DOztBQUUzQzs7QUFFQSxNQUFJRyxlQUFnQixZQUFZO0FBQUUsYUFBU0MsZ0JBQVQsQ0FBMEJDLE1BQTFCLEVBQWtDQyxLQUFsQyxFQUF5QztBQUFF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RCxPQUFJbEosS0FBS3l2QixTQUFTQyxJQUFULENBQWNDLFNBQWQsQ0FBeUIsQ0FBekIsQ0FBVDtBQUFBLE9BQ0Nua0IsT0FERDs7QUFHQSxPQUFLLENBQUksZ0JBQWdCNUwsSUFBaEIsQ0FBc0JJLEVBQXRCLENBQVQsRUFBd0M7QUFDdkM7QUFDQTs7QUFFRHdMLGFBQVVyTixTQUFTeVgsY0FBVCxDQUF5QjVWLEVBQXpCLENBQVY7O0FBRUEsT0FBS3dMLE9BQUwsRUFBZTtBQUNkLFFBQUssQ0FBSSx3Q0FBd0M1TCxJQUF4QyxDQUE4QzRMLFFBQVF1RixPQUF0RCxDQUFULEVBQTZFO0FBQzVFdkYsYUFBUW9rQixRQUFSLEdBQW1CLENBQUMsQ0FBcEI7QUFDQTs7QUFFRHBrQixZQUFRc08sS0FBUjtBQUNBO0FBQ0QsR0FqQkQsRUFpQkcsS0FqQkg7QUFrQkE7QUFDRCxDQXZCRCIsImZpbGUiOiJjbGl4ZWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiEgdGV0aGVyIDEuNC4wICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSk7XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5UZXRoZXIgPSBmYWN0b3J5KCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24ocmVxdWlyZSwgZXhwb3J0cywgbW9kdWxlKSB7XG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF9jcmVhdGVDbGFzcyA9IChmdW5jdGlvbiAoKSB7IGZ1bmN0aW9uIGRlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoJ3ZhbHVlJyBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH0gcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfTsgfSkoKTtcblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb24nKTsgfSB9XG5cbnZhciBUZXRoZXJCYXNlID0gdW5kZWZpbmVkO1xuaWYgKHR5cGVvZiBUZXRoZXJCYXNlID09PSAndW5kZWZpbmVkJykge1xuICBUZXRoZXJCYXNlID0geyBtb2R1bGVzOiBbXSB9O1xufVxuXG52YXIgemVyb0VsZW1lbnQgPSBudWxsO1xuXG4vLyBTYW1lIGFzIG5hdGl2ZSBnZXRCb3VuZGluZ0NsaWVudFJlY3QsIGV4Y2VwdCBpdCB0YWtlcyBpbnRvIGFjY291bnQgcGFyZW50IDxmcmFtZT4gb2Zmc2V0c1xuLy8gaWYgdGhlIGVsZW1lbnQgbGllcyB3aXRoaW4gYSBuZXN0ZWQgZG9jdW1lbnQgKDxmcmFtZT4gb3IgPGlmcmFtZT4tbGlrZSkuXG5mdW5jdGlvbiBnZXRBY3R1YWxCb3VuZGluZ0NsaWVudFJlY3Qobm9kZSkge1xuICB2YXIgYm91bmRpbmdSZWN0ID0gbm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAvLyBUaGUgb3JpZ2luYWwgb2JqZWN0IHJldHVybmVkIGJ5IGdldEJvdW5kaW5nQ2xpZW50UmVjdCBpcyBpbW11dGFibGUsIHNvIHdlIGNsb25lIGl0XG4gIC8vIFdlIGNhbid0IHVzZSBleHRlbmQgYmVjYXVzZSB0aGUgcHJvcGVydGllcyBhcmUgbm90IGNvbnNpZGVyZWQgcGFydCBvZiB0aGUgb2JqZWN0IGJ5IGhhc093blByb3BlcnR5IGluIElFOVxuICB2YXIgcmVjdCA9IHt9O1xuICBmb3IgKHZhciBrIGluIGJvdW5kaW5nUmVjdCkge1xuICAgIHJlY3Rba10gPSBib3VuZGluZ1JlY3Rba107XG4gIH1cblxuICBpZiAobm9kZS5vd25lckRvY3VtZW50ICE9PSBkb2N1bWVudCkge1xuICAgIHZhciBfZnJhbWVFbGVtZW50ID0gbm9kZS5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3LmZyYW1lRWxlbWVudDtcbiAgICBpZiAoX2ZyYW1lRWxlbWVudCkge1xuICAgICAgdmFyIGZyYW1lUmVjdCA9IGdldEFjdHVhbEJvdW5kaW5nQ2xpZW50UmVjdChfZnJhbWVFbGVtZW50KTtcbiAgICAgIHJlY3QudG9wICs9IGZyYW1lUmVjdC50b3A7XG4gICAgICByZWN0LmJvdHRvbSArPSBmcmFtZVJlY3QudG9wO1xuICAgICAgcmVjdC5sZWZ0ICs9IGZyYW1lUmVjdC5sZWZ0O1xuICAgICAgcmVjdC5yaWdodCArPSBmcmFtZVJlY3QubGVmdDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVjdDtcbn1cblxuZnVuY3Rpb24gZ2V0U2Nyb2xsUGFyZW50cyhlbCkge1xuICAvLyBJbiBmaXJlZm94IGlmIHRoZSBlbCBpcyBpbnNpZGUgYW4gaWZyYW1lIHdpdGggZGlzcGxheTogbm9uZTsgd2luZG93LmdldENvbXB1dGVkU3R5bGUoKSB3aWxsIHJldHVybiBudWxsO1xuICAvLyBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD01NDgzOTdcbiAgdmFyIGNvbXB1dGVkU3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKGVsKSB8fCB7fTtcbiAgdmFyIHBvc2l0aW9uID0gY29tcHV0ZWRTdHlsZS5wb3NpdGlvbjtcbiAgdmFyIHBhcmVudHMgPSBbXTtcblxuICBpZiAocG9zaXRpb24gPT09ICdmaXhlZCcpIHtcbiAgICByZXR1cm4gW2VsXTtcbiAgfVxuXG4gIHZhciBwYXJlbnQgPSBlbDtcbiAgd2hpbGUgKChwYXJlbnQgPSBwYXJlbnQucGFyZW50Tm9kZSkgJiYgcGFyZW50ICYmIHBhcmVudC5ub2RlVHlwZSA9PT0gMSkge1xuICAgIHZhciBzdHlsZSA9IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKHBhcmVudCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7fVxuXG4gICAgaWYgKHR5cGVvZiBzdHlsZSA9PT0gJ3VuZGVmaW5lZCcgfHwgc3R5bGUgPT09IG51bGwpIHtcbiAgICAgIHBhcmVudHMucHVzaChwYXJlbnQpO1xuICAgICAgcmV0dXJuIHBhcmVudHM7XG4gICAgfVxuXG4gICAgdmFyIF9zdHlsZSA9IHN0eWxlO1xuICAgIHZhciBvdmVyZmxvdyA9IF9zdHlsZS5vdmVyZmxvdztcbiAgICB2YXIgb3ZlcmZsb3dYID0gX3N0eWxlLm92ZXJmbG93WDtcbiAgICB2YXIgb3ZlcmZsb3dZID0gX3N0eWxlLm92ZXJmbG93WTtcblxuICAgIGlmICgvKGF1dG98c2Nyb2xsKS8udGVzdChvdmVyZmxvdyArIG92ZXJmbG93WSArIG92ZXJmbG93WCkpIHtcbiAgICAgIGlmIChwb3NpdGlvbiAhPT0gJ2Fic29sdXRlJyB8fCBbJ3JlbGF0aXZlJywgJ2Fic29sdXRlJywgJ2ZpeGVkJ10uaW5kZXhPZihzdHlsZS5wb3NpdGlvbikgPj0gMCkge1xuICAgICAgICBwYXJlbnRzLnB1c2gocGFyZW50KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwYXJlbnRzLnB1c2goZWwub3duZXJEb2N1bWVudC5ib2R5KTtcblxuICAvLyBJZiB0aGUgbm9kZSBpcyB3aXRoaW4gYSBmcmFtZSwgYWNjb3VudCBmb3IgdGhlIHBhcmVudCB3aW5kb3cgc2Nyb2xsXG4gIGlmIChlbC5vd25lckRvY3VtZW50ICE9PSBkb2N1bWVudCkge1xuICAgIHBhcmVudHMucHVzaChlbC5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3KTtcbiAgfVxuXG4gIHJldHVybiBwYXJlbnRzO1xufVxuXG52YXIgdW5pcXVlSWQgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgaWQgPSAwO1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiArK2lkO1xuICB9O1xufSkoKTtcblxudmFyIHplcm9Qb3NDYWNoZSA9IHt9O1xudmFyIGdldE9yaWdpbiA9IGZ1bmN0aW9uIGdldE9yaWdpbigpIHtcbiAgLy8gZ2V0Qm91bmRpbmdDbGllbnRSZWN0IGlzIHVuZm9ydHVuYXRlbHkgdG9vIGFjY3VyYXRlLiAgSXQgaW50cm9kdWNlcyBhIHBpeGVsIG9yIHR3byBvZlxuICAvLyBqaXR0ZXIgYXMgdGhlIHVzZXIgc2Nyb2xscyB0aGF0IG1lc3NlcyB3aXRoIG91ciBhYmlsaXR5IHRvIGRldGVjdCBpZiB0d28gcG9zaXRpb25zXG4gIC8vIGFyZSBlcXVpdmlsYW50IG9yIG5vdC4gIFdlIHBsYWNlIGFuIGVsZW1lbnQgYXQgdGhlIHRvcCBsZWZ0IG9mIHRoZSBwYWdlIHRoYXQgd2lsbFxuICAvLyBnZXQgdGhlIHNhbWUgaml0dGVyLCBzbyB3ZSBjYW4gY2FuY2VsIHRoZSB0d28gb3V0LlxuICB2YXIgbm9kZSA9IHplcm9FbGVtZW50O1xuICBpZiAoIW5vZGUgfHwgIWRvY3VtZW50LmJvZHkuY29udGFpbnMobm9kZSkpIHtcbiAgICBub2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgbm9kZS5zZXRBdHRyaWJ1dGUoJ2RhdGEtdGV0aGVyLWlkJywgdW5pcXVlSWQoKSk7XG4gICAgZXh0ZW5kKG5vZGUuc3R5bGUsIHtcbiAgICAgIHRvcDogMCxcbiAgICAgIGxlZnQ6IDAsXG4gICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJ1xuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub2RlKTtcblxuICAgIHplcm9FbGVtZW50ID0gbm9kZTtcbiAgfVxuXG4gIHZhciBpZCA9IG5vZGUuZ2V0QXR0cmlidXRlKCdkYXRhLXRldGhlci1pZCcpO1xuICBpZiAodHlwZW9mIHplcm9Qb3NDYWNoZVtpZF0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgemVyb1Bvc0NhY2hlW2lkXSA9IGdldEFjdHVhbEJvdW5kaW5nQ2xpZW50UmVjdChub2RlKTtcblxuICAgIC8vIENsZWFyIHRoZSBjYWNoZSB3aGVuIHRoaXMgcG9zaXRpb24gY2FsbCBpcyBkb25lXG4gICAgZGVmZXIoZnVuY3Rpb24gKCkge1xuICAgICAgZGVsZXRlIHplcm9Qb3NDYWNoZVtpZF07XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gemVyb1Bvc0NhY2hlW2lkXTtcbn07XG5cbmZ1bmN0aW9uIHJlbW92ZVV0aWxFbGVtZW50cygpIHtcbiAgaWYgKHplcm9FbGVtZW50KSB7XG4gICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh6ZXJvRWxlbWVudCk7XG4gIH1cbiAgemVyb0VsZW1lbnQgPSBudWxsO1xufTtcblxuZnVuY3Rpb24gZ2V0Qm91bmRzKGVsKSB7XG4gIHZhciBkb2MgPSB1bmRlZmluZWQ7XG4gIGlmIChlbCA9PT0gZG9jdW1lbnQpIHtcbiAgICBkb2MgPSBkb2N1bWVudDtcbiAgICBlbCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgfSBlbHNlIHtcbiAgICBkb2MgPSBlbC5vd25lckRvY3VtZW50O1xuICB9XG5cbiAgdmFyIGRvY0VsID0gZG9jLmRvY3VtZW50RWxlbWVudDtcblxuICB2YXIgYm94ID0gZ2V0QWN0dWFsQm91bmRpbmdDbGllbnRSZWN0KGVsKTtcblxuICB2YXIgb3JpZ2luID0gZ2V0T3JpZ2luKCk7XG5cbiAgYm94LnRvcCAtPSBvcmlnaW4udG9wO1xuICBib3gubGVmdCAtPSBvcmlnaW4ubGVmdDtcblxuICBpZiAodHlwZW9mIGJveC53aWR0aCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBib3gud2lkdGggPSBkb2N1bWVudC5ib2R5LnNjcm9sbFdpZHRoIC0gYm94LmxlZnQgLSBib3gucmlnaHQ7XG4gIH1cbiAgaWYgKHR5cGVvZiBib3guaGVpZ2h0ID09PSAndW5kZWZpbmVkJykge1xuICAgIGJveC5oZWlnaHQgPSBkb2N1bWVudC5ib2R5LnNjcm9sbEhlaWdodCAtIGJveC50b3AgLSBib3guYm90dG9tO1xuICB9XG5cbiAgYm94LnRvcCA9IGJveC50b3AgLSBkb2NFbC5jbGllbnRUb3A7XG4gIGJveC5sZWZ0ID0gYm94LmxlZnQgLSBkb2NFbC5jbGllbnRMZWZ0O1xuICBib3gucmlnaHQgPSBkb2MuYm9keS5jbGllbnRXaWR0aCAtIGJveC53aWR0aCAtIGJveC5sZWZ0O1xuICBib3guYm90dG9tID0gZG9jLmJvZHkuY2xpZW50SGVpZ2h0IC0gYm94LmhlaWdodCAtIGJveC50b3A7XG5cbiAgcmV0dXJuIGJveDtcbn1cblxuZnVuY3Rpb24gZ2V0T2Zmc2V0UGFyZW50KGVsKSB7XG4gIHJldHVybiBlbC5vZmZzZXRQYXJlbnQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xufVxuXG52YXIgX3Njcm9sbEJhclNpemUgPSBudWxsO1xuZnVuY3Rpb24gZ2V0U2Nyb2xsQmFyU2l6ZSgpIHtcbiAgaWYgKF9zY3JvbGxCYXJTaXplKSB7XG4gICAgcmV0dXJuIF9zY3JvbGxCYXJTaXplO1xuICB9XG4gIHZhciBpbm5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBpbm5lci5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgaW5uZXIuc3R5bGUuaGVpZ2h0ID0gJzIwMHB4JztcblxuICB2YXIgb3V0ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZXh0ZW5kKG91dGVyLnN0eWxlLCB7XG4gICAgcG9zaXRpb246ICdhYnNvbHV0ZScsXG4gICAgdG9wOiAwLFxuICAgIGxlZnQ6IDAsXG4gICAgcG9pbnRlckV2ZW50czogJ25vbmUnLFxuICAgIHZpc2liaWxpdHk6ICdoaWRkZW4nLFxuICAgIHdpZHRoOiAnMjAwcHgnLFxuICAgIGhlaWdodDogJzE1MHB4JyxcbiAgICBvdmVyZmxvdzogJ2hpZGRlbidcbiAgfSk7XG5cbiAgb3V0ZXIuYXBwZW5kQ2hpbGQoaW5uZXIpO1xuXG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQob3V0ZXIpO1xuXG4gIHZhciB3aWR0aENvbnRhaW5lZCA9IGlubmVyLm9mZnNldFdpZHRoO1xuICBvdXRlci5zdHlsZS5vdmVyZmxvdyA9ICdzY3JvbGwnO1xuICB2YXIgd2lkdGhTY3JvbGwgPSBpbm5lci5vZmZzZXRXaWR0aDtcblxuICBpZiAod2lkdGhDb250YWluZWQgPT09IHdpZHRoU2Nyb2xsKSB7XG4gICAgd2lkdGhTY3JvbGwgPSBvdXRlci5jbGllbnRXaWR0aDtcbiAgfVxuXG4gIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQob3V0ZXIpO1xuXG4gIHZhciB3aWR0aCA9IHdpZHRoQ29udGFpbmVkIC0gd2lkdGhTY3JvbGw7XG5cbiAgX3Njcm9sbEJhclNpemUgPSB7IHdpZHRoOiB3aWR0aCwgaGVpZ2h0OiB3aWR0aCB9O1xuICByZXR1cm4gX3Njcm9sbEJhclNpemU7XG59XG5cbmZ1bmN0aW9uIGV4dGVuZCgpIHtcbiAgdmFyIG91dCA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzBdO1xuXG4gIHZhciBhcmdzID0gW107XG5cbiAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoYXJncywgYXJndW1lbnRzKTtcblxuICBhcmdzLnNsaWNlKDEpLmZvckVhY2goZnVuY3Rpb24gKG9iaikge1xuICAgIGlmIChvYmopIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKCh7fSkuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHtcbiAgICAgICAgICBvdXRba2V5XSA9IG9ialtrZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiByZW1vdmVDbGFzcyhlbCwgbmFtZSkge1xuICBpZiAodHlwZW9mIGVsLmNsYXNzTGlzdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBuYW1lLnNwbGl0KCcgJykuZm9yRWFjaChmdW5jdGlvbiAoY2xzKSB7XG4gICAgICBpZiAoY2xzLnRyaW0oKSkge1xuICAgICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKGNscyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCgnKF58ICknICsgbmFtZS5zcGxpdCgnICcpLmpvaW4oJ3wnKSArICcoIHwkKScsICdnaScpO1xuICAgIHZhciBjbGFzc05hbWUgPSBnZXRDbGFzc05hbWUoZWwpLnJlcGxhY2UocmVnZXgsICcgJyk7XG4gICAgc2V0Q2xhc3NOYW1lKGVsLCBjbGFzc05hbWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFkZENsYXNzKGVsLCBuYW1lKSB7XG4gIGlmICh0eXBlb2YgZWwuY2xhc3NMaXN0ICE9PSAndW5kZWZpbmVkJykge1xuICAgIG5hbWUuc3BsaXQoJyAnKS5mb3JFYWNoKGZ1bmN0aW9uIChjbHMpIHtcbiAgICAgIGlmIChjbHMudHJpbSgpKSB7XG4gICAgICAgIGVsLmNsYXNzTGlzdC5hZGQoY2xzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByZW1vdmVDbGFzcyhlbCwgbmFtZSk7XG4gICAgdmFyIGNscyA9IGdldENsYXNzTmFtZShlbCkgKyAoJyAnICsgbmFtZSk7XG4gICAgc2V0Q2xhc3NOYW1lKGVsLCBjbHMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhc0NsYXNzKGVsLCBuYW1lKSB7XG4gIGlmICh0eXBlb2YgZWwuY2xhc3NMaXN0ICE9PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBlbC5jbGFzc0xpc3QuY29udGFpbnMobmFtZSk7XG4gIH1cbiAgdmFyIGNsYXNzTmFtZSA9IGdldENsYXNzTmFtZShlbCk7XG4gIHJldHVybiBuZXcgUmVnRXhwKCcoXnwgKScgKyBuYW1lICsgJyggfCQpJywgJ2dpJykudGVzdChjbGFzc05hbWUpO1xufVxuXG5mdW5jdGlvbiBnZXRDbGFzc05hbWUoZWwpIHtcbiAgLy8gQ2FuJ3QgdXNlIGp1c3QgU1ZHQW5pbWF0ZWRTdHJpbmcgaGVyZSBzaW5jZSBub2RlcyB3aXRoaW4gYSBGcmFtZSBpbiBJRSBoYXZlXG4gIC8vIGNvbXBsZXRlbHkgc2VwYXJhdGVseSBTVkdBbmltYXRlZFN0cmluZyBiYXNlIGNsYXNzZXNcbiAgaWYgKGVsLmNsYXNzTmFtZSBpbnN0YW5jZW9mIGVsLm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcuU1ZHQW5pbWF0ZWRTdHJpbmcpIHtcbiAgICByZXR1cm4gZWwuY2xhc3NOYW1lLmJhc2VWYWw7XG4gIH1cbiAgcmV0dXJuIGVsLmNsYXNzTmFtZTtcbn1cblxuZnVuY3Rpb24gc2V0Q2xhc3NOYW1lKGVsLCBjbGFzc05hbWUpIHtcbiAgZWwuc2V0QXR0cmlidXRlKCdjbGFzcycsIGNsYXNzTmFtZSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUNsYXNzZXMoZWwsIGFkZCwgYWxsKSB7XG4gIC8vIE9mIHRoZSBzZXQgb2YgJ2FsbCcgY2xhc3Nlcywgd2UgbmVlZCB0aGUgJ2FkZCcgY2xhc3NlcywgYW5kIG9ubHkgdGhlXG4gIC8vICdhZGQnIGNsYXNzZXMgdG8gYmUgc2V0LlxuICBhbGwuZm9yRWFjaChmdW5jdGlvbiAoY2xzKSB7XG4gICAgaWYgKGFkZC5pbmRleE9mKGNscykgPT09IC0xICYmIGhhc0NsYXNzKGVsLCBjbHMpKSB7XG4gICAgICByZW1vdmVDbGFzcyhlbCwgY2xzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGFkZC5mb3JFYWNoKGZ1bmN0aW9uIChjbHMpIHtcbiAgICBpZiAoIWhhc0NsYXNzKGVsLCBjbHMpKSB7XG4gICAgICBhZGRDbGFzcyhlbCwgY2xzKTtcbiAgICB9XG4gIH0pO1xufVxuXG52YXIgZGVmZXJyZWQgPSBbXTtcblxudmFyIGRlZmVyID0gZnVuY3Rpb24gZGVmZXIoZm4pIHtcbiAgZGVmZXJyZWQucHVzaChmbik7XG59O1xuXG52YXIgZmx1c2ggPSBmdW5jdGlvbiBmbHVzaCgpIHtcbiAgdmFyIGZuID0gdW5kZWZpbmVkO1xuICB3aGlsZSAoZm4gPSBkZWZlcnJlZC5wb3AoKSkge1xuICAgIGZuKCk7XG4gIH1cbn07XG5cbnZhciBFdmVudGVkID0gKGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gRXZlbnRlZCgpIHtcbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgRXZlbnRlZCk7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoRXZlbnRlZCwgW3tcbiAgICBrZXk6ICdvbicsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIG9uKGV2ZW50LCBoYW5kbGVyLCBjdHgpIHtcbiAgICAgIHZhciBvbmNlID0gYXJndW1lbnRzLmxlbmd0aCA8PSAzIHx8IGFyZ3VtZW50c1szXSA9PT0gdW5kZWZpbmVkID8gZmFsc2UgOiBhcmd1bWVudHNbM107XG5cbiAgICAgIGlmICh0eXBlb2YgdGhpcy5iaW5kaW5ncyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhpcy5iaW5kaW5ncyA9IHt9O1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiB0aGlzLmJpbmRpbmdzW2V2ZW50XSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhpcy5iaW5kaW5nc1tldmVudF0gPSBbXTtcbiAgICAgIH1cbiAgICAgIHRoaXMuYmluZGluZ3NbZXZlbnRdLnB1c2goeyBoYW5kbGVyOiBoYW5kbGVyLCBjdHg6IGN0eCwgb25jZTogb25jZSB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdvbmNlJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gb25jZShldmVudCwgaGFuZGxlciwgY3R4KSB7XG4gICAgICB0aGlzLm9uKGV2ZW50LCBoYW5kbGVyLCBjdHgsIHRydWUpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ29mZicsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIG9mZihldmVudCwgaGFuZGxlcikge1xuICAgICAgaWYgKHR5cGVvZiB0aGlzLmJpbmRpbmdzID09PSAndW5kZWZpbmVkJyB8fCB0eXBlb2YgdGhpcy5iaW5kaW5nc1tldmVudF0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBkZWxldGUgdGhpcy5iaW5kaW5nc1tldmVudF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgIHdoaWxlIChpIDwgdGhpcy5iaW5kaW5nc1tldmVudF0ubGVuZ3RoKSB7XG4gICAgICAgICAgaWYgKHRoaXMuYmluZGluZ3NbZXZlbnRdW2ldLmhhbmRsZXIgPT09IGhhbmRsZXIpIHtcbiAgICAgICAgICAgIHRoaXMuYmluZGluZ3NbZXZlbnRdLnNwbGljZShpLCAxKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgKytpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ3RyaWdnZXInLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB0cmlnZ2VyKGV2ZW50KSB7XG4gICAgICBpZiAodHlwZW9mIHRoaXMuYmluZGluZ3MgIT09ICd1bmRlZmluZWQnICYmIHRoaXMuYmluZGluZ3NbZXZlbnRdKSB7XG4gICAgICAgIHZhciBpID0gMDtcblxuICAgICAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4gPiAxID8gX2xlbiAtIDEgOiAwKSwgX2tleSA9IDE7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICAgICAgICBhcmdzW19rZXkgLSAxXSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlIChpIDwgdGhpcy5iaW5kaW5nc1tldmVudF0ubGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIF9iaW5kaW5ncyRldmVudCRpID0gdGhpcy5iaW5kaW5nc1tldmVudF1baV07XG4gICAgICAgICAgdmFyIGhhbmRsZXIgPSBfYmluZGluZ3MkZXZlbnQkaS5oYW5kbGVyO1xuICAgICAgICAgIHZhciBjdHggPSBfYmluZGluZ3MkZXZlbnQkaS5jdHg7XG4gICAgICAgICAgdmFyIG9uY2UgPSBfYmluZGluZ3MkZXZlbnQkaS5vbmNlO1xuXG4gICAgICAgICAgdmFyIGNvbnRleHQgPSBjdHg7XG4gICAgICAgICAgaWYgKHR5cGVvZiBjb250ZXh0ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaGFuZGxlci5hcHBseShjb250ZXh0LCBhcmdzKTtcblxuICAgICAgICAgIGlmIChvbmNlKSB7XG4gICAgICAgICAgICB0aGlzLmJpbmRpbmdzW2V2ZW50XS5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICsraTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1dKTtcblxuICByZXR1cm4gRXZlbnRlZDtcbn0pKCk7XG5cblRldGhlckJhc2UuVXRpbHMgPSB7XG4gIGdldEFjdHVhbEJvdW5kaW5nQ2xpZW50UmVjdDogZ2V0QWN0dWFsQm91bmRpbmdDbGllbnRSZWN0LFxuICBnZXRTY3JvbGxQYXJlbnRzOiBnZXRTY3JvbGxQYXJlbnRzLFxuICBnZXRCb3VuZHM6IGdldEJvdW5kcyxcbiAgZ2V0T2Zmc2V0UGFyZW50OiBnZXRPZmZzZXRQYXJlbnQsXG4gIGV4dGVuZDogZXh0ZW5kLFxuICBhZGRDbGFzczogYWRkQ2xhc3MsXG4gIHJlbW92ZUNsYXNzOiByZW1vdmVDbGFzcyxcbiAgaGFzQ2xhc3M6IGhhc0NsYXNzLFxuICB1cGRhdGVDbGFzc2VzOiB1cGRhdGVDbGFzc2VzLFxuICBkZWZlcjogZGVmZXIsXG4gIGZsdXNoOiBmbHVzaCxcbiAgdW5pcXVlSWQ6IHVuaXF1ZUlkLFxuICBFdmVudGVkOiBFdmVudGVkLFxuICBnZXRTY3JvbGxCYXJTaXplOiBnZXRTY3JvbGxCYXJTaXplLFxuICByZW1vdmVVdGlsRWxlbWVudHM6IHJlbW92ZVV0aWxFbGVtZW50c1xufTtcbi8qIGdsb2JhbHMgVGV0aGVyQmFzZSwgcGVyZm9ybWFuY2UgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgX3NsaWNlZFRvQXJyYXkgPSAoZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBzbGljZUl0ZXJhdG9yKGFyciwgaSkgeyB2YXIgX2FyciA9IFtdOyB2YXIgX24gPSB0cnVlOyB2YXIgX2QgPSBmYWxzZTsgdmFyIF9lID0gdW5kZWZpbmVkOyB0cnkgeyBmb3IgKHZhciBfaSA9IGFycltTeW1ib2wuaXRlcmF0b3JdKCksIF9zOyAhKF9uID0gKF9zID0gX2kubmV4dCgpKS5kb25lKTsgX24gPSB0cnVlKSB7IF9hcnIucHVzaChfcy52YWx1ZSk7IGlmIChpICYmIF9hcnIubGVuZ3RoID09PSBpKSBicmVhazsgfSB9IGNhdGNoIChlcnIpIHsgX2QgPSB0cnVlOyBfZSA9IGVycjsgfSBmaW5hbGx5IHsgdHJ5IHsgaWYgKCFfbiAmJiBfaVsncmV0dXJuJ10pIF9pWydyZXR1cm4nXSgpOyB9IGZpbmFsbHkgeyBpZiAoX2QpIHRocm93IF9lOyB9IH0gcmV0dXJuIF9hcnI7IH0gcmV0dXJuIGZ1bmN0aW9uIChhcnIsIGkpIHsgaWYgKEFycmF5LmlzQXJyYXkoYXJyKSkgeyByZXR1cm4gYXJyOyB9IGVsc2UgaWYgKFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoYXJyKSkgeyByZXR1cm4gc2xpY2VJdGVyYXRvcihhcnIsIGkpOyB9IGVsc2UgeyB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGF0dGVtcHQgdG8gZGVzdHJ1Y3R1cmUgbm9uLWl0ZXJhYmxlIGluc3RhbmNlJyk7IH0gfTsgfSkoKTtcblxudmFyIF9jcmVhdGVDbGFzcyA9IChmdW5jdGlvbiAoKSB7IGZ1bmN0aW9uIGRlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoJ3ZhbHVlJyBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH0gcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfTsgfSkoKTtcblxudmFyIF9nZXQgPSBmdW5jdGlvbiBnZXQoX3g2LCBfeDcsIF94OCkgeyB2YXIgX2FnYWluID0gdHJ1ZTsgX2Z1bmN0aW9uOiB3aGlsZSAoX2FnYWluKSB7IHZhciBvYmplY3QgPSBfeDYsIHByb3BlcnR5ID0gX3g3LCByZWNlaXZlciA9IF94ODsgX2FnYWluID0gZmFsc2U7IGlmIChvYmplY3QgPT09IG51bGwpIG9iamVjdCA9IEZ1bmN0aW9uLnByb3RvdHlwZTsgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgcHJvcGVydHkpOyBpZiAoZGVzYyA9PT0gdW5kZWZpbmVkKSB7IHZhciBwYXJlbnQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqZWN0KTsgaWYgKHBhcmVudCA9PT0gbnVsbCkgeyByZXR1cm4gdW5kZWZpbmVkOyB9IGVsc2UgeyBfeDYgPSBwYXJlbnQ7IF94NyA9IHByb3BlcnR5OyBfeDggPSByZWNlaXZlcjsgX2FnYWluID0gdHJ1ZTsgZGVzYyA9IHBhcmVudCA9IHVuZGVmaW5lZDsgY29udGludWUgX2Z1bmN0aW9uOyB9IH0gZWxzZSBpZiAoJ3ZhbHVlJyBpbiBkZXNjKSB7IHJldHVybiBkZXNjLnZhbHVlOyB9IGVsc2UgeyB2YXIgZ2V0dGVyID0gZGVzYy5nZXQ7IGlmIChnZXR0ZXIgPT09IHVuZGVmaW5lZCkgeyByZXR1cm4gdW5kZWZpbmVkOyB9IHJldHVybiBnZXR0ZXIuY2FsbChyZWNlaXZlcik7IH0gfSB9O1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvbicpOyB9IH1cblxuZnVuY3Rpb24gX2luaGVyaXRzKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7IGlmICh0eXBlb2Ygc3VwZXJDbGFzcyAhPT0gJ2Z1bmN0aW9uJyAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ1N1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uLCBub3QgJyArIHR5cGVvZiBzdXBlckNsYXNzKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCBlbnVtZXJhYmxlOiBmYWxzZSwgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH0pOyBpZiAoc3VwZXJDbGFzcykgT2JqZWN0LnNldFByb3RvdHlwZU9mID8gT2JqZWN0LnNldFByb3RvdHlwZU9mKHN1YkNsYXNzLCBzdXBlckNsYXNzKSA6IHN1YkNsYXNzLl9fcHJvdG9fXyA9IHN1cGVyQ2xhc3M7IH1cblxuaWYgKHR5cGVvZiBUZXRoZXJCYXNlID09PSAndW5kZWZpbmVkJykge1xuICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBtdXN0IGluY2x1ZGUgdGhlIHV0aWxzLmpzIGZpbGUgYmVmb3JlIHRldGhlci5qcycpO1xufVxuXG52YXIgX1RldGhlckJhc2UkVXRpbHMgPSBUZXRoZXJCYXNlLlV0aWxzO1xudmFyIGdldFNjcm9sbFBhcmVudHMgPSBfVGV0aGVyQmFzZSRVdGlscy5nZXRTY3JvbGxQYXJlbnRzO1xudmFyIGdldEJvdW5kcyA9IF9UZXRoZXJCYXNlJFV0aWxzLmdldEJvdW5kcztcbnZhciBnZXRPZmZzZXRQYXJlbnQgPSBfVGV0aGVyQmFzZSRVdGlscy5nZXRPZmZzZXRQYXJlbnQ7XG52YXIgZXh0ZW5kID0gX1RldGhlckJhc2UkVXRpbHMuZXh0ZW5kO1xudmFyIGFkZENsYXNzID0gX1RldGhlckJhc2UkVXRpbHMuYWRkQ2xhc3M7XG52YXIgcmVtb3ZlQ2xhc3MgPSBfVGV0aGVyQmFzZSRVdGlscy5yZW1vdmVDbGFzcztcbnZhciB1cGRhdGVDbGFzc2VzID0gX1RldGhlckJhc2UkVXRpbHMudXBkYXRlQ2xhc3NlcztcbnZhciBkZWZlciA9IF9UZXRoZXJCYXNlJFV0aWxzLmRlZmVyO1xudmFyIGZsdXNoID0gX1RldGhlckJhc2UkVXRpbHMuZmx1c2g7XG52YXIgZ2V0U2Nyb2xsQmFyU2l6ZSA9IF9UZXRoZXJCYXNlJFV0aWxzLmdldFNjcm9sbEJhclNpemU7XG52YXIgcmVtb3ZlVXRpbEVsZW1lbnRzID0gX1RldGhlckJhc2UkVXRpbHMucmVtb3ZlVXRpbEVsZW1lbnRzO1xuXG5mdW5jdGlvbiB3aXRoaW4oYSwgYikge1xuICB2YXIgZGlmZiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IDEgOiBhcmd1bWVudHNbMl07XG5cbiAgcmV0dXJuIGEgKyBkaWZmID49IGIgJiYgYiA+PSBhIC0gZGlmZjtcbn1cblxudmFyIHRyYW5zZm9ybUtleSA9IChmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuICcnO1xuICB9XG4gIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gIHZhciB0cmFuc2Zvcm1zID0gWyd0cmFuc2Zvcm0nLCAnV2Via2l0VHJhbnNmb3JtJywgJ09UcmFuc2Zvcm0nLCAnTW96VHJhbnNmb3JtJywgJ21zVHJhbnNmb3JtJ107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdHJhbnNmb3Jtcy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBrZXkgPSB0cmFuc2Zvcm1zW2ldO1xuICAgIGlmIChlbC5zdHlsZVtrZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBrZXk7XG4gICAgfVxuICB9XG59KSgpO1xuXG52YXIgdGV0aGVycyA9IFtdO1xuXG52YXIgcG9zaXRpb24gPSBmdW5jdGlvbiBwb3NpdGlvbigpIHtcbiAgdGV0aGVycy5mb3JFYWNoKGZ1bmN0aW9uICh0ZXRoZXIpIHtcbiAgICB0ZXRoZXIucG9zaXRpb24oZmFsc2UpO1xuICB9KTtcbiAgZmx1c2goKTtcbn07XG5cbmZ1bmN0aW9uIG5vdygpIHtcbiAgaWYgKHR5cGVvZiBwZXJmb3JtYW5jZSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHBlcmZvcm1hbmNlLm5vdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm4gcGVyZm9ybWFuY2Uubm93KCk7XG4gIH1cbiAgcmV0dXJuICtuZXcgRGF0ZSgpO1xufVxuXG4oZnVuY3Rpb24gKCkge1xuICB2YXIgbGFzdENhbGwgPSBudWxsO1xuICB2YXIgbGFzdER1cmF0aW9uID0gbnVsbDtcbiAgdmFyIHBlbmRpbmdUaW1lb3V0ID0gbnVsbDtcblxuICB2YXIgdGljayA9IGZ1bmN0aW9uIHRpY2soKSB7XG4gICAgaWYgKHR5cGVvZiBsYXN0RHVyYXRpb24gIT09ICd1bmRlZmluZWQnICYmIGxhc3REdXJhdGlvbiA+IDE2KSB7XG4gICAgICAvLyBXZSB2b2x1bnRhcmlseSB0aHJvdHRsZSBvdXJzZWx2ZXMgaWYgd2UgY2FuJ3QgbWFuYWdlIDYwZnBzXG4gICAgICBsYXN0RHVyYXRpb24gPSBNYXRoLm1pbihsYXN0RHVyYXRpb24gLSAxNiwgMjUwKTtcblxuICAgICAgLy8gSnVzdCBpbiBjYXNlIHRoaXMgaXMgdGhlIGxhc3QgZXZlbnQsIHJlbWVtYmVyIHRvIHBvc2l0aW9uIGp1c3Qgb25jZSBtb3JlXG4gICAgICBwZW5kaW5nVGltZW91dCA9IHNldFRpbWVvdXQodGljaywgMjUwKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGxhc3RDYWxsICE9PSAndW5kZWZpbmVkJyAmJiBub3coKSAtIGxhc3RDYWxsIDwgMTApIHtcbiAgICAgIC8vIFNvbWUgYnJvd3NlcnMgY2FsbCBldmVudHMgYSBsaXR0bGUgdG9vIGZyZXF1ZW50bHksIHJlZnVzZSB0byBydW4gbW9yZSB0aGFuIGlzIHJlYXNvbmFibGVcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAocGVuZGluZ1RpbWVvdXQgIT0gbnVsbCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHBlbmRpbmdUaW1lb3V0KTtcbiAgICAgIHBlbmRpbmdUaW1lb3V0ID0gbnVsbDtcbiAgICB9XG5cbiAgICBsYXN0Q2FsbCA9IG5vdygpO1xuICAgIHBvc2l0aW9uKCk7XG4gICAgbGFzdER1cmF0aW9uID0gbm93KCkgLSBsYXN0Q2FsbDtcbiAgfTtcblxuICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyICE9PSAndW5kZWZpbmVkJykge1xuICAgIFsncmVzaXplJywgJ3Njcm9sbCcsICd0b3VjaG1vdmUnXS5mb3JFYWNoKGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIHRpY2spO1xuICAgIH0pO1xuICB9XG59KSgpO1xuXG52YXIgTUlSUk9SX0xSID0ge1xuICBjZW50ZXI6ICdjZW50ZXInLFxuICBsZWZ0OiAncmlnaHQnLFxuICByaWdodDogJ2xlZnQnXG59O1xuXG52YXIgTUlSUk9SX1RCID0ge1xuICBtaWRkbGU6ICdtaWRkbGUnLFxuICB0b3A6ICdib3R0b20nLFxuICBib3R0b206ICd0b3AnXG59O1xuXG52YXIgT0ZGU0VUX01BUCA9IHtcbiAgdG9wOiAwLFxuICBsZWZ0OiAwLFxuICBtaWRkbGU6ICc1MCUnLFxuICBjZW50ZXI6ICc1MCUnLFxuICBib3R0b206ICcxMDAlJyxcbiAgcmlnaHQ6ICcxMDAlJ1xufTtcblxudmFyIGF1dG9Ub0ZpeGVkQXR0YWNobWVudCA9IGZ1bmN0aW9uIGF1dG9Ub0ZpeGVkQXR0YWNobWVudChhdHRhY2htZW50LCByZWxhdGl2ZVRvQXR0YWNobWVudCkge1xuICB2YXIgbGVmdCA9IGF0dGFjaG1lbnQubGVmdDtcbiAgdmFyIHRvcCA9IGF0dGFjaG1lbnQudG9wO1xuXG4gIGlmIChsZWZ0ID09PSAnYXV0bycpIHtcbiAgICBsZWZ0ID0gTUlSUk9SX0xSW3JlbGF0aXZlVG9BdHRhY2htZW50LmxlZnRdO1xuICB9XG5cbiAgaWYgKHRvcCA9PT0gJ2F1dG8nKSB7XG4gICAgdG9wID0gTUlSUk9SX1RCW3JlbGF0aXZlVG9BdHRhY2htZW50LnRvcF07XG4gIH1cblxuICByZXR1cm4geyBsZWZ0OiBsZWZ0LCB0b3A6IHRvcCB9O1xufTtcblxudmFyIGF0dGFjaG1lbnRUb09mZnNldCA9IGZ1bmN0aW9uIGF0dGFjaG1lbnRUb09mZnNldChhdHRhY2htZW50KSB7XG4gIHZhciBsZWZ0ID0gYXR0YWNobWVudC5sZWZ0O1xuICB2YXIgdG9wID0gYXR0YWNobWVudC50b3A7XG5cbiAgaWYgKHR5cGVvZiBPRkZTRVRfTUFQW2F0dGFjaG1lbnQubGVmdF0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbGVmdCA9IE9GRlNFVF9NQVBbYXR0YWNobWVudC5sZWZ0XTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgT0ZGU0VUX01BUFthdHRhY2htZW50LnRvcF0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgdG9wID0gT0ZGU0VUX01BUFthdHRhY2htZW50LnRvcF07XG4gIH1cblxuICByZXR1cm4geyBsZWZ0OiBsZWZ0LCB0b3A6IHRvcCB9O1xufTtcblxuZnVuY3Rpb24gYWRkT2Zmc2V0KCkge1xuICB2YXIgb3V0ID0geyB0b3A6IDAsIGxlZnQ6IDAgfTtcblxuICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgb2Zmc2V0cyA9IEFycmF5KF9sZW4pLCBfa2V5ID0gMDsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgIG9mZnNldHNbX2tleV0gPSBhcmd1bWVudHNbX2tleV07XG4gIH1cblxuICBvZmZzZXRzLmZvckVhY2goZnVuY3Rpb24gKF9yZWYpIHtcbiAgICB2YXIgdG9wID0gX3JlZi50b3A7XG4gICAgdmFyIGxlZnQgPSBfcmVmLmxlZnQ7XG5cbiAgICBpZiAodHlwZW9mIHRvcCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRvcCA9IHBhcnNlRmxvYXQodG9wLCAxMCk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgbGVmdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGxlZnQgPSBwYXJzZUZsb2F0KGxlZnQsIDEwKTtcbiAgICB9XG5cbiAgICBvdXQudG9wICs9IHRvcDtcbiAgICBvdXQubGVmdCArPSBsZWZ0O1xuICB9KTtcblxuICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiBvZmZzZXRUb1B4KG9mZnNldCwgc2l6ZSkge1xuICBpZiAodHlwZW9mIG9mZnNldC5sZWZ0ID09PSAnc3RyaW5nJyAmJiBvZmZzZXQubGVmdC5pbmRleE9mKCclJykgIT09IC0xKSB7XG4gICAgb2Zmc2V0LmxlZnQgPSBwYXJzZUZsb2F0KG9mZnNldC5sZWZ0LCAxMCkgLyAxMDAgKiBzaXplLndpZHRoO1xuICB9XG4gIGlmICh0eXBlb2Ygb2Zmc2V0LnRvcCA9PT0gJ3N0cmluZycgJiYgb2Zmc2V0LnRvcC5pbmRleE9mKCclJykgIT09IC0xKSB7XG4gICAgb2Zmc2V0LnRvcCA9IHBhcnNlRmxvYXQob2Zmc2V0LnRvcCwgMTApIC8gMTAwICogc2l6ZS5oZWlnaHQ7XG4gIH1cblxuICByZXR1cm4gb2Zmc2V0O1xufVxuXG52YXIgcGFyc2VPZmZzZXQgPSBmdW5jdGlvbiBwYXJzZU9mZnNldCh2YWx1ZSkge1xuICB2YXIgX3ZhbHVlJHNwbGl0ID0gdmFsdWUuc3BsaXQoJyAnKTtcblxuICB2YXIgX3ZhbHVlJHNwbGl0MiA9IF9zbGljZWRUb0FycmF5KF92YWx1ZSRzcGxpdCwgMik7XG5cbiAgdmFyIHRvcCA9IF92YWx1ZSRzcGxpdDJbMF07XG4gIHZhciBsZWZ0ID0gX3ZhbHVlJHNwbGl0MlsxXTtcblxuICByZXR1cm4geyB0b3A6IHRvcCwgbGVmdDogbGVmdCB9O1xufTtcbnZhciBwYXJzZUF0dGFjaG1lbnQgPSBwYXJzZU9mZnNldDtcblxudmFyIFRldGhlckNsYXNzID0gKGZ1bmN0aW9uIChfRXZlbnRlZCkge1xuICBfaW5oZXJpdHMoVGV0aGVyQ2xhc3MsIF9FdmVudGVkKTtcblxuICBmdW5jdGlvbiBUZXRoZXJDbGFzcyhvcHRpb25zKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBUZXRoZXJDbGFzcyk7XG5cbiAgICBfZ2V0KE9iamVjdC5nZXRQcm90b3R5cGVPZihUZXRoZXJDbGFzcy5wcm90b3R5cGUpLCAnY29uc3RydWN0b3InLCB0aGlzKS5jYWxsKHRoaXMpO1xuICAgIHRoaXMucG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uLmJpbmQodGhpcyk7XG5cbiAgICB0ZXRoZXJzLnB1c2godGhpcyk7XG5cbiAgICB0aGlzLmhpc3RvcnkgPSBbXTtcblxuICAgIHRoaXMuc2V0T3B0aW9ucyhvcHRpb25zLCBmYWxzZSk7XG5cbiAgICBUZXRoZXJCYXNlLm1vZHVsZXMuZm9yRWFjaChmdW5jdGlvbiAobW9kdWxlKSB7XG4gICAgICBpZiAodHlwZW9mIG1vZHVsZS5pbml0aWFsaXplICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBtb2R1bGUuaW5pdGlhbGl6ZS5jYWxsKF90aGlzKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMucG9zaXRpb24oKTtcbiAgfVxuXG4gIF9jcmVhdGVDbGFzcyhUZXRoZXJDbGFzcywgW3tcbiAgICBrZXk6ICdnZXRDbGFzcycsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGdldENsYXNzKCkge1xuICAgICAgdmFyIGtleSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/ICcnIDogYXJndW1lbnRzWzBdO1xuICAgICAgdmFyIGNsYXNzZXMgPSB0aGlzLm9wdGlvbnMuY2xhc3NlcztcblxuICAgICAgaWYgKHR5cGVvZiBjbGFzc2VzICE9PSAndW5kZWZpbmVkJyAmJiBjbGFzc2VzW2tleV0pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9ucy5jbGFzc2VzW2tleV07XG4gICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5jbGFzc1ByZWZpeCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vcHRpb25zLmNsYXNzUHJlZml4ICsgJy0nICsga2V5O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgIH1cbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdzZXRPcHRpb25zJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gc2V0T3B0aW9ucyhvcHRpb25zKSB7XG4gICAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuICAgICAgdmFyIHBvcyA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IHRydWUgOiBhcmd1bWVudHNbMV07XG5cbiAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgb2Zmc2V0OiAnMCAwJyxcbiAgICAgICAgdGFyZ2V0T2Zmc2V0OiAnMCAwJyxcbiAgICAgICAgdGFyZ2V0QXR0YWNobWVudDogJ2F1dG8gYXV0bycsXG4gICAgICAgIGNsYXNzUHJlZml4OiAndGV0aGVyJ1xuICAgICAgfTtcblxuICAgICAgdGhpcy5vcHRpb25zID0gZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgICAgdmFyIF9vcHRpb25zID0gdGhpcy5vcHRpb25zO1xuICAgICAgdmFyIGVsZW1lbnQgPSBfb3B0aW9ucy5lbGVtZW50O1xuICAgICAgdmFyIHRhcmdldCA9IF9vcHRpb25zLnRhcmdldDtcbiAgICAgIHZhciB0YXJnZXRNb2RpZmllciA9IF9vcHRpb25zLnRhcmdldE1vZGlmaWVyO1xuXG4gICAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuICAgICAgdGhpcy50YXJnZXQgPSB0YXJnZXQ7XG4gICAgICB0aGlzLnRhcmdldE1vZGlmaWVyID0gdGFyZ2V0TW9kaWZpZXI7XG5cbiAgICAgIGlmICh0aGlzLnRhcmdldCA9PT0gJ3ZpZXdwb3J0Jykge1xuICAgICAgICB0aGlzLnRhcmdldCA9IGRvY3VtZW50LmJvZHk7XG4gICAgICAgIHRoaXMudGFyZ2V0TW9kaWZpZXIgPSAndmlzaWJsZSc7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMudGFyZ2V0ID09PSAnc2Nyb2xsLWhhbmRsZScpIHtcbiAgICAgICAgdGhpcy50YXJnZXQgPSBkb2N1bWVudC5ib2R5O1xuICAgICAgICB0aGlzLnRhcmdldE1vZGlmaWVyID0gJ3Njcm9sbC1oYW5kbGUnO1xuICAgICAgfVxuXG4gICAgICBbJ2VsZW1lbnQnLCAndGFyZ2V0J10uZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIGlmICh0eXBlb2YgX3RoaXMyW2tleV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUZXRoZXIgRXJyb3I6IEJvdGggZWxlbWVudCBhbmQgdGFyZ2V0IG11c3QgYmUgZGVmaW5lZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBfdGhpczJba2V5XS5qcXVlcnkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgX3RoaXMyW2tleV0gPSBfdGhpczJba2V5XVswXTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgX3RoaXMyW2tleV0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgX3RoaXMyW2tleV0gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKF90aGlzMltrZXldKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGFkZENsYXNzKHRoaXMuZWxlbWVudCwgdGhpcy5nZXRDbGFzcygnZWxlbWVudCcpKTtcbiAgICAgIGlmICghKHRoaXMub3B0aW9ucy5hZGRUYXJnZXRDbGFzc2VzID09PSBmYWxzZSkpIHtcbiAgICAgICAgYWRkQ2xhc3ModGhpcy50YXJnZXQsIHRoaXMuZ2V0Q2xhc3MoJ3RhcmdldCcpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuYXR0YWNobWVudCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RldGhlciBFcnJvcjogWW91IG11c3QgcHJvdmlkZSBhbiBhdHRhY2htZW50Jyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMudGFyZ2V0QXR0YWNobWVudCA9IHBhcnNlQXR0YWNobWVudCh0aGlzLm9wdGlvbnMudGFyZ2V0QXR0YWNobWVudCk7XG4gICAgICB0aGlzLmF0dGFjaG1lbnQgPSBwYXJzZUF0dGFjaG1lbnQodGhpcy5vcHRpb25zLmF0dGFjaG1lbnQpO1xuICAgICAgdGhpcy5vZmZzZXQgPSBwYXJzZU9mZnNldCh0aGlzLm9wdGlvbnMub2Zmc2V0KTtcbiAgICAgIHRoaXMudGFyZ2V0T2Zmc2V0ID0gcGFyc2VPZmZzZXQodGhpcy5vcHRpb25zLnRhcmdldE9mZnNldCk7XG5cbiAgICAgIGlmICh0eXBlb2YgdGhpcy5zY3JvbGxQYXJlbnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aGlzLmRpc2FibGUoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMudGFyZ2V0TW9kaWZpZXIgPT09ICdzY3JvbGwtaGFuZGxlJykge1xuICAgICAgICB0aGlzLnNjcm9sbFBhcmVudHMgPSBbdGhpcy50YXJnZXRdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zY3JvbGxQYXJlbnRzID0gZ2V0U2Nyb2xsUGFyZW50cyh0aGlzLnRhcmdldCk7XG4gICAgICB9XG5cbiAgICAgIGlmICghKHRoaXMub3B0aW9ucy5lbmFibGVkID09PSBmYWxzZSkpIHtcbiAgICAgICAgdGhpcy5lbmFibGUocG9zKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdnZXRUYXJnZXRCb3VuZHMnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBnZXRUYXJnZXRCb3VuZHMoKSB7XG4gICAgICBpZiAodHlwZW9mIHRoaXMudGFyZ2V0TW9kaWZpZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGlmICh0aGlzLnRhcmdldE1vZGlmaWVyID09PSAndmlzaWJsZScpIHtcbiAgICAgICAgICBpZiAodGhpcy50YXJnZXQgPT09IGRvY3VtZW50LmJvZHkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHRvcDogcGFnZVlPZmZzZXQsIGxlZnQ6IHBhZ2VYT2Zmc2V0LCBoZWlnaHQ6IGlubmVySGVpZ2h0LCB3aWR0aDogaW5uZXJXaWR0aCB9O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgYm91bmRzID0gZ2V0Qm91bmRzKHRoaXMudGFyZ2V0KTtcblxuICAgICAgICAgICAgdmFyIG91dCA9IHtcbiAgICAgICAgICAgICAgaGVpZ2h0OiBib3VuZHMuaGVpZ2h0LFxuICAgICAgICAgICAgICB3aWR0aDogYm91bmRzLndpZHRoLFxuICAgICAgICAgICAgICB0b3A6IGJvdW5kcy50b3AsXG4gICAgICAgICAgICAgIGxlZnQ6IGJvdW5kcy5sZWZ0XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBvdXQuaGVpZ2h0ID0gTWF0aC5taW4ob3V0LmhlaWdodCwgYm91bmRzLmhlaWdodCAtIChwYWdlWU9mZnNldCAtIGJvdW5kcy50b3ApKTtcbiAgICAgICAgICAgIG91dC5oZWlnaHQgPSBNYXRoLm1pbihvdXQuaGVpZ2h0LCBib3VuZHMuaGVpZ2h0IC0gKGJvdW5kcy50b3AgKyBib3VuZHMuaGVpZ2h0IC0gKHBhZ2VZT2Zmc2V0ICsgaW5uZXJIZWlnaHQpKSk7XG4gICAgICAgICAgICBvdXQuaGVpZ2h0ID0gTWF0aC5taW4oaW5uZXJIZWlnaHQsIG91dC5oZWlnaHQpO1xuICAgICAgICAgICAgb3V0LmhlaWdodCAtPSAyO1xuXG4gICAgICAgICAgICBvdXQud2lkdGggPSBNYXRoLm1pbihvdXQud2lkdGgsIGJvdW5kcy53aWR0aCAtIChwYWdlWE9mZnNldCAtIGJvdW5kcy5sZWZ0KSk7XG4gICAgICAgICAgICBvdXQud2lkdGggPSBNYXRoLm1pbihvdXQud2lkdGgsIGJvdW5kcy53aWR0aCAtIChib3VuZHMubGVmdCArIGJvdW5kcy53aWR0aCAtIChwYWdlWE9mZnNldCArIGlubmVyV2lkdGgpKSk7XG4gICAgICAgICAgICBvdXQud2lkdGggPSBNYXRoLm1pbihpbm5lcldpZHRoLCBvdXQud2lkdGgpO1xuICAgICAgICAgICAgb3V0LndpZHRoIC09IDI7XG5cbiAgICAgICAgICAgIGlmIChvdXQudG9wIDwgcGFnZVlPZmZzZXQpIHtcbiAgICAgICAgICAgICAgb3V0LnRvcCA9IHBhZ2VZT2Zmc2V0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG91dC5sZWZ0IDwgcGFnZVhPZmZzZXQpIHtcbiAgICAgICAgICAgICAgb3V0LmxlZnQgPSBwYWdlWE9mZnNldDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy50YXJnZXRNb2RpZmllciA9PT0gJ3Njcm9sbC1oYW5kbGUnKSB7XG4gICAgICAgICAgdmFyIGJvdW5kcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB2YXIgdGFyZ2V0ID0gdGhpcy50YXJnZXQ7XG4gICAgICAgICAgaWYgKHRhcmdldCA9PT0gZG9jdW1lbnQuYm9keSkge1xuICAgICAgICAgICAgdGFyZ2V0ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuXG4gICAgICAgICAgICBib3VuZHMgPSB7XG4gICAgICAgICAgICAgIGxlZnQ6IHBhZ2VYT2Zmc2V0LFxuICAgICAgICAgICAgICB0b3A6IHBhZ2VZT2Zmc2V0LFxuICAgICAgICAgICAgICBoZWlnaHQ6IGlubmVySGVpZ2h0LFxuICAgICAgICAgICAgICB3aWR0aDogaW5uZXJXaWR0aFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYm91bmRzID0gZ2V0Qm91bmRzKHRhcmdldCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZSh0YXJnZXQpO1xuXG4gICAgICAgICAgdmFyIGhhc0JvdHRvbVNjcm9sbCA9IHRhcmdldC5zY3JvbGxXaWR0aCA+IHRhcmdldC5jbGllbnRXaWR0aCB8fCBbc3R5bGUub3ZlcmZsb3csIHN0eWxlLm92ZXJmbG93WF0uaW5kZXhPZignc2Nyb2xsJykgPj0gMCB8fCB0aGlzLnRhcmdldCAhPT0gZG9jdW1lbnQuYm9keTtcblxuICAgICAgICAgIHZhciBzY3JvbGxCb3R0b20gPSAwO1xuICAgICAgICAgIGlmIChoYXNCb3R0b21TY3JvbGwpIHtcbiAgICAgICAgICAgIHNjcm9sbEJvdHRvbSA9IDE1O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBoZWlnaHQgPSBib3VuZHMuaGVpZ2h0IC0gcGFyc2VGbG9hdChzdHlsZS5ib3JkZXJUb3BXaWR0aCkgLSBwYXJzZUZsb2F0KHN0eWxlLmJvcmRlckJvdHRvbVdpZHRoKSAtIHNjcm9sbEJvdHRvbTtcblxuICAgICAgICAgIHZhciBvdXQgPSB7XG4gICAgICAgICAgICB3aWR0aDogMTUsXG4gICAgICAgICAgICBoZWlnaHQ6IGhlaWdodCAqIDAuOTc1ICogKGhlaWdodCAvIHRhcmdldC5zY3JvbGxIZWlnaHQpLFxuICAgICAgICAgICAgbGVmdDogYm91bmRzLmxlZnQgKyBib3VuZHMud2lkdGggLSBwYXJzZUZsb2F0KHN0eWxlLmJvcmRlckxlZnRXaWR0aCkgLSAxNVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICB2YXIgZml0QWRqID0gMDtcbiAgICAgICAgICBpZiAoaGVpZ2h0IDwgNDA4ICYmIHRoaXMudGFyZ2V0ID09PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgICAgICAgICBmaXRBZGogPSAtMC4wMDAxMSAqIE1hdGgucG93KGhlaWdodCwgMikgLSAwLjAwNzI3ICogaGVpZ2h0ICsgMjIuNTg7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHRoaXMudGFyZ2V0ICE9PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgICAgICAgICBvdXQuaGVpZ2h0ID0gTWF0aC5tYXgob3V0LmhlaWdodCwgMjQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBzY3JvbGxQZXJjZW50YWdlID0gdGhpcy50YXJnZXQuc2Nyb2xsVG9wIC8gKHRhcmdldC5zY3JvbGxIZWlnaHQgLSBoZWlnaHQpO1xuICAgICAgICAgIG91dC50b3AgPSBzY3JvbGxQZXJjZW50YWdlICogKGhlaWdodCAtIG91dC5oZWlnaHQgLSBmaXRBZGopICsgYm91bmRzLnRvcCArIHBhcnNlRmxvYXQoc3R5bGUuYm9yZGVyVG9wV2lkdGgpO1xuXG4gICAgICAgICAgaWYgKHRoaXMudGFyZ2V0ID09PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgICAgICAgICBvdXQuaGVpZ2h0ID0gTWF0aC5tYXgob3V0LmhlaWdodCwgMjQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBnZXRCb3VuZHModGhpcy50YXJnZXQpO1xuICAgICAgfVxuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2NsZWFyQ2FjaGUnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBjbGVhckNhY2hlKCkge1xuICAgICAgdGhpcy5fY2FjaGUgPSB7fTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdjYWNoZScsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGNhY2hlKGssIGdldHRlcikge1xuICAgICAgLy8gTW9yZSB0aGFuIG9uZSBtb2R1bGUgd2lsbCBvZnRlbiBuZWVkIHRoZSBzYW1lIERPTSBpbmZvLCBzb1xuICAgICAgLy8gd2Uga2VlcCBhIGNhY2hlIHdoaWNoIGlzIGNsZWFyZWQgb24gZWFjaCBwb3NpdGlvbiBjYWxsXG4gICAgICBpZiAodHlwZW9mIHRoaXMuX2NhY2hlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aGlzLl9jYWNoZSA9IHt9O1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIHRoaXMuX2NhY2hlW2tdID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aGlzLl9jYWNoZVtrXSA9IGdldHRlci5jYWxsKHRoaXMpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5fY2FjaGVba107XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnZW5hYmxlJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gZW5hYmxlKCkge1xuICAgICAgdmFyIF90aGlzMyA9IHRoaXM7XG5cbiAgICAgIHZhciBwb3MgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB0cnVlIDogYXJndW1lbnRzWzBdO1xuXG4gICAgICBpZiAoISh0aGlzLm9wdGlvbnMuYWRkVGFyZ2V0Q2xhc3NlcyA9PT0gZmFsc2UpKSB7XG4gICAgICAgIGFkZENsYXNzKHRoaXMudGFyZ2V0LCB0aGlzLmdldENsYXNzKCdlbmFibGVkJykpO1xuICAgICAgfVxuICAgICAgYWRkQ2xhc3ModGhpcy5lbGVtZW50LCB0aGlzLmdldENsYXNzKCdlbmFibGVkJykpO1xuICAgICAgdGhpcy5lbmFibGVkID0gdHJ1ZTtcblxuICAgICAgdGhpcy5zY3JvbGxQYXJlbnRzLmZvckVhY2goZnVuY3Rpb24gKHBhcmVudCkge1xuICAgICAgICBpZiAocGFyZW50ICE9PSBfdGhpczMudGFyZ2V0Lm93bmVyRG9jdW1lbnQpIHtcbiAgICAgICAgICBwYXJlbnQuYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgX3RoaXMzLnBvc2l0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmIChwb3MpIHtcbiAgICAgICAgdGhpcy5wb3NpdGlvbigpO1xuICAgICAgfVxuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2Rpc2FibGUnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBkaXNhYmxlKCkge1xuICAgICAgdmFyIF90aGlzNCA9IHRoaXM7XG5cbiAgICAgIHJlbW92ZUNsYXNzKHRoaXMudGFyZ2V0LCB0aGlzLmdldENsYXNzKCdlbmFibGVkJykpO1xuICAgICAgcmVtb3ZlQ2xhc3ModGhpcy5lbGVtZW50LCB0aGlzLmdldENsYXNzKCdlbmFibGVkJykpO1xuICAgICAgdGhpcy5lbmFibGVkID0gZmFsc2U7XG5cbiAgICAgIGlmICh0eXBlb2YgdGhpcy5zY3JvbGxQYXJlbnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aGlzLnNjcm9sbFBhcmVudHMuZm9yRWFjaChmdW5jdGlvbiAocGFyZW50KSB7XG4gICAgICAgICAgcGFyZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIF90aGlzNC5wb3NpdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2Rlc3Ryb3knLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgICAgdmFyIF90aGlzNSA9IHRoaXM7XG5cbiAgICAgIHRoaXMuZGlzYWJsZSgpO1xuXG4gICAgICB0ZXRoZXJzLmZvckVhY2goZnVuY3Rpb24gKHRldGhlciwgaSkge1xuICAgICAgICBpZiAodGV0aGVyID09PSBfdGhpczUpIHtcbiAgICAgICAgICB0ZXRoZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIFJlbW92ZSBhbnkgZWxlbWVudHMgd2Ugd2VyZSB1c2luZyBmb3IgY29udmVuaWVuY2UgZnJvbSB0aGUgRE9NXG4gICAgICBpZiAodGV0aGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmVtb3ZlVXRpbEVsZW1lbnRzKCk7XG4gICAgICB9XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAndXBkYXRlQXR0YWNoQ2xhc3NlcycsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHVwZGF0ZUF0dGFjaENsYXNzZXMoZWxlbWVudEF0dGFjaCwgdGFyZ2V0QXR0YWNoKSB7XG4gICAgICB2YXIgX3RoaXM2ID0gdGhpcztcblxuICAgICAgZWxlbWVudEF0dGFjaCA9IGVsZW1lbnRBdHRhY2ggfHwgdGhpcy5hdHRhY2htZW50O1xuICAgICAgdGFyZ2V0QXR0YWNoID0gdGFyZ2V0QXR0YWNoIHx8IHRoaXMudGFyZ2V0QXR0YWNobWVudDtcbiAgICAgIHZhciBzaWRlcyA9IFsnbGVmdCcsICd0b3AnLCAnYm90dG9tJywgJ3JpZ2h0JywgJ21pZGRsZScsICdjZW50ZXInXTtcblxuICAgICAgaWYgKHR5cGVvZiB0aGlzLl9hZGRBdHRhY2hDbGFzc2VzICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzLl9hZGRBdHRhY2hDbGFzc2VzLmxlbmd0aCkge1xuICAgICAgICAvLyB1cGRhdGVBdHRhY2hDbGFzc2VzIGNhbiBiZSBjYWxsZWQgbW9yZSB0aGFuIG9uY2UgaW4gYSBwb3NpdGlvbiBjYWxsLCBzb1xuICAgICAgICAvLyB3ZSBuZWVkIHRvIGNsZWFuIHVwIGFmdGVyIG91cnNlbHZlcyBzdWNoIHRoYXQgd2hlbiB0aGUgbGFzdCBkZWZlciBnZXRzXG4gICAgICAgIC8vIHJhbiBpdCBkb2Vzbid0IGFkZCBhbnkgZXh0cmEgY2xhc3NlcyBmcm9tIHByZXZpb3VzIGNhbGxzLlxuICAgICAgICB0aGlzLl9hZGRBdHRhY2hDbGFzc2VzLnNwbGljZSgwLCB0aGlzLl9hZGRBdHRhY2hDbGFzc2VzLmxlbmd0aCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgdGhpcy5fYWRkQXR0YWNoQ2xhc3NlcyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhpcy5fYWRkQXR0YWNoQ2xhc3NlcyA9IFtdO1xuICAgICAgfVxuICAgICAgdmFyIGFkZCA9IHRoaXMuX2FkZEF0dGFjaENsYXNzZXM7XG5cbiAgICAgIGlmIChlbGVtZW50QXR0YWNoLnRvcCkge1xuICAgICAgICBhZGQucHVzaCh0aGlzLmdldENsYXNzKCdlbGVtZW50LWF0dGFjaGVkJykgKyAnLScgKyBlbGVtZW50QXR0YWNoLnRvcCk7XG4gICAgICB9XG4gICAgICBpZiAoZWxlbWVudEF0dGFjaC5sZWZ0KSB7XG4gICAgICAgIGFkZC5wdXNoKHRoaXMuZ2V0Q2xhc3MoJ2VsZW1lbnQtYXR0YWNoZWQnKSArICctJyArIGVsZW1lbnRBdHRhY2gubGVmdCk7XG4gICAgICB9XG4gICAgICBpZiAodGFyZ2V0QXR0YWNoLnRvcCkge1xuICAgICAgICBhZGQucHVzaCh0aGlzLmdldENsYXNzKCd0YXJnZXQtYXR0YWNoZWQnKSArICctJyArIHRhcmdldEF0dGFjaC50b3ApO1xuICAgICAgfVxuICAgICAgaWYgKHRhcmdldEF0dGFjaC5sZWZ0KSB7XG4gICAgICAgIGFkZC5wdXNoKHRoaXMuZ2V0Q2xhc3MoJ3RhcmdldC1hdHRhY2hlZCcpICsgJy0nICsgdGFyZ2V0QXR0YWNoLmxlZnQpO1xuICAgICAgfVxuXG4gICAgICB2YXIgYWxsID0gW107XG4gICAgICBzaWRlcy5mb3JFYWNoKGZ1bmN0aW9uIChzaWRlKSB7XG4gICAgICAgIGFsbC5wdXNoKF90aGlzNi5nZXRDbGFzcygnZWxlbWVudC1hdHRhY2hlZCcpICsgJy0nICsgc2lkZSk7XG4gICAgICAgIGFsbC5wdXNoKF90aGlzNi5nZXRDbGFzcygndGFyZ2V0LWF0dGFjaGVkJykgKyAnLScgKyBzaWRlKTtcbiAgICAgIH0pO1xuXG4gICAgICBkZWZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghKHR5cGVvZiBfdGhpczYuX2FkZEF0dGFjaENsYXNzZXMgIT09ICd1bmRlZmluZWQnKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHVwZGF0ZUNsYXNzZXMoX3RoaXM2LmVsZW1lbnQsIF90aGlzNi5fYWRkQXR0YWNoQ2xhc3NlcywgYWxsKTtcbiAgICAgICAgaWYgKCEoX3RoaXM2Lm9wdGlvbnMuYWRkVGFyZ2V0Q2xhc3NlcyA9PT0gZmFsc2UpKSB7XG4gICAgICAgICAgdXBkYXRlQ2xhc3NlcyhfdGhpczYudGFyZ2V0LCBfdGhpczYuX2FkZEF0dGFjaENsYXNzZXMsIGFsbCk7XG4gICAgICAgIH1cblxuICAgICAgICBkZWxldGUgX3RoaXM2Ll9hZGRBdHRhY2hDbGFzc2VzO1xuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAncG9zaXRpb24nLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBwb3NpdGlvbigpIHtcbiAgICAgIHZhciBfdGhpczcgPSB0aGlzO1xuXG4gICAgICB2YXIgZmx1c2hDaGFuZ2VzID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IGFyZ3VtZW50c1swXTtcblxuICAgICAgLy8gZmx1c2hDaGFuZ2VzIGNvbW1pdHMgdGhlIGNoYW5nZXMgaW1tZWRpYXRlbHksIGxlYXZlIHRydWUgdW5sZXNzIHlvdSBhcmUgcG9zaXRpb25pbmcgbXVsdGlwbGVcbiAgICAgIC8vIHRldGhlcnMgKGluIHdoaWNoIGNhc2UgY2FsbCBUZXRoZXIuVXRpbHMuZmx1c2ggeW91cnNlbGYgd2hlbiB5b3UncmUgZG9uZSlcblxuICAgICAgaWYgKCF0aGlzLmVuYWJsZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmNsZWFyQ2FjaGUoKTtcblxuICAgICAgLy8gVHVybiAnYXV0bycgYXR0YWNobWVudHMgaW50byB0aGUgYXBwcm9wcmlhdGUgY29ybmVyIG9yIGVkZ2VcbiAgICAgIHZhciB0YXJnZXRBdHRhY2htZW50ID0gYXV0b1RvRml4ZWRBdHRhY2htZW50KHRoaXMudGFyZ2V0QXR0YWNobWVudCwgdGhpcy5hdHRhY2htZW50KTtcblxuICAgICAgdGhpcy51cGRhdGVBdHRhY2hDbGFzc2VzKHRoaXMuYXR0YWNobWVudCwgdGFyZ2V0QXR0YWNobWVudCk7XG5cbiAgICAgIHZhciBlbGVtZW50UG9zID0gdGhpcy5jYWNoZSgnZWxlbWVudC1ib3VuZHMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBnZXRCb3VuZHMoX3RoaXM3LmVsZW1lbnQpO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciB3aWR0aCA9IGVsZW1lbnRQb3Mud2lkdGg7XG4gICAgICB2YXIgaGVpZ2h0ID0gZWxlbWVudFBvcy5oZWlnaHQ7XG5cbiAgICAgIGlmICh3aWR0aCA9PT0gMCAmJiBoZWlnaHQgPT09IDAgJiYgdHlwZW9mIHRoaXMubGFzdFNpemUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHZhciBfbGFzdFNpemUgPSB0aGlzLmxhc3RTaXplO1xuXG4gICAgICAgIC8vIFdlIGNhY2hlIHRoZSBoZWlnaHQgYW5kIHdpZHRoIHRvIG1ha2UgaXQgcG9zc2libGUgdG8gcG9zaXRpb24gZWxlbWVudHMgdGhhdCBhcmVcbiAgICAgICAgLy8gZ2V0dGluZyBoaWRkZW4uXG4gICAgICAgIHdpZHRoID0gX2xhc3RTaXplLndpZHRoO1xuICAgICAgICBoZWlnaHQgPSBfbGFzdFNpemUuaGVpZ2h0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5sYXN0U2l6ZSA9IHsgd2lkdGg6IHdpZHRoLCBoZWlnaHQ6IGhlaWdodCB9O1xuICAgICAgfVxuXG4gICAgICB2YXIgdGFyZ2V0UG9zID0gdGhpcy5jYWNoZSgndGFyZ2V0LWJvdW5kcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIF90aGlzNy5nZXRUYXJnZXRCb3VuZHMoKTtcbiAgICAgIH0pO1xuICAgICAgdmFyIHRhcmdldFNpemUgPSB0YXJnZXRQb3M7XG5cbiAgICAgIC8vIEdldCBhbiBhY3R1YWwgcHggb2Zmc2V0IGZyb20gdGhlIGF0dGFjaG1lbnRcbiAgICAgIHZhciBvZmZzZXQgPSBvZmZzZXRUb1B4KGF0dGFjaG1lbnRUb09mZnNldCh0aGlzLmF0dGFjaG1lbnQpLCB7IHdpZHRoOiB3aWR0aCwgaGVpZ2h0OiBoZWlnaHQgfSk7XG4gICAgICB2YXIgdGFyZ2V0T2Zmc2V0ID0gb2Zmc2V0VG9QeChhdHRhY2htZW50VG9PZmZzZXQodGFyZ2V0QXR0YWNobWVudCksIHRhcmdldFNpemUpO1xuXG4gICAgICB2YXIgbWFudWFsT2Zmc2V0ID0gb2Zmc2V0VG9QeCh0aGlzLm9mZnNldCwgeyB3aWR0aDogd2lkdGgsIGhlaWdodDogaGVpZ2h0IH0pO1xuICAgICAgdmFyIG1hbnVhbFRhcmdldE9mZnNldCA9IG9mZnNldFRvUHgodGhpcy50YXJnZXRPZmZzZXQsIHRhcmdldFNpemUpO1xuXG4gICAgICAvLyBBZGQgdGhlIG1hbnVhbGx5IHByb3ZpZGVkIG9mZnNldFxuICAgICAgb2Zmc2V0ID0gYWRkT2Zmc2V0KG9mZnNldCwgbWFudWFsT2Zmc2V0KTtcbiAgICAgIHRhcmdldE9mZnNldCA9IGFkZE9mZnNldCh0YXJnZXRPZmZzZXQsIG1hbnVhbFRhcmdldE9mZnNldCk7XG5cbiAgICAgIC8vIEl0J3Mgbm93IG91ciBnb2FsIHRvIG1ha2UgKGVsZW1lbnQgcG9zaXRpb24gKyBvZmZzZXQpID09ICh0YXJnZXQgcG9zaXRpb24gKyB0YXJnZXQgb2Zmc2V0KVxuICAgICAgdmFyIGxlZnQgPSB0YXJnZXRQb3MubGVmdCArIHRhcmdldE9mZnNldC5sZWZ0IC0gb2Zmc2V0LmxlZnQ7XG4gICAgICB2YXIgdG9wID0gdGFyZ2V0UG9zLnRvcCArIHRhcmdldE9mZnNldC50b3AgLSBvZmZzZXQudG9wO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IFRldGhlckJhc2UubW9kdWxlcy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgX21vZHVsZTIgPSBUZXRoZXJCYXNlLm1vZHVsZXNbaV07XG4gICAgICAgIHZhciByZXQgPSBfbW9kdWxlMi5wb3NpdGlvbi5jYWxsKHRoaXMsIHtcbiAgICAgICAgICBsZWZ0OiBsZWZ0LFxuICAgICAgICAgIHRvcDogdG9wLFxuICAgICAgICAgIHRhcmdldEF0dGFjaG1lbnQ6IHRhcmdldEF0dGFjaG1lbnQsXG4gICAgICAgICAgdGFyZ2V0UG9zOiB0YXJnZXRQb3MsXG4gICAgICAgICAgZWxlbWVudFBvczogZWxlbWVudFBvcyxcbiAgICAgICAgICBvZmZzZXQ6IG9mZnNldCxcbiAgICAgICAgICB0YXJnZXRPZmZzZXQ6IHRhcmdldE9mZnNldCxcbiAgICAgICAgICBtYW51YWxPZmZzZXQ6IG1hbnVhbE9mZnNldCxcbiAgICAgICAgICBtYW51YWxUYXJnZXRPZmZzZXQ6IG1hbnVhbFRhcmdldE9mZnNldCxcbiAgICAgICAgICBzY3JvbGxiYXJTaXplOiBzY3JvbGxiYXJTaXplLFxuICAgICAgICAgIGF0dGFjaG1lbnQ6IHRoaXMuYXR0YWNobWVudFxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAocmV0ID09PSBmYWxzZSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcmV0ID09PSAndW5kZWZpbmVkJyB8fCB0eXBlb2YgcmV0ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRvcCA9IHJldC50b3A7XG4gICAgICAgICAgbGVmdCA9IHJldC5sZWZ0O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFdlIGRlc2NyaWJlIHRoZSBwb3NpdGlvbiB0aHJlZSBkaWZmZXJlbnQgd2F5cyB0byBnaXZlIHRoZSBvcHRpbWl6ZXJcbiAgICAgIC8vIGEgY2hhbmNlIHRvIGRlY2lkZSB0aGUgYmVzdCBwb3NzaWJsZSB3YXkgdG8gcG9zaXRpb24gdGhlIGVsZW1lbnRcbiAgICAgIC8vIHdpdGggdGhlIGZld2VzdCByZXBhaW50cy5cbiAgICAgIHZhciBuZXh0ID0ge1xuICAgICAgICAvLyBJdCdzIHBvc2l0aW9uIHJlbGF0aXZlIHRvIHRoZSBwYWdlIChhYnNvbHV0ZSBwb3NpdGlvbmluZyB3aGVuXG4gICAgICAgIC8vIHRoZSBlbGVtZW50IGlzIGEgY2hpbGQgb2YgdGhlIGJvZHkpXG4gICAgICAgIHBhZ2U6IHtcbiAgICAgICAgICB0b3A6IHRvcCxcbiAgICAgICAgICBsZWZ0OiBsZWZ0XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gSXQncyBwb3NpdGlvbiByZWxhdGl2ZSB0byB0aGUgdmlld3BvcnQgKGZpeGVkIHBvc2l0aW9uaW5nKVxuICAgICAgICB2aWV3cG9ydDoge1xuICAgICAgICAgIHRvcDogdG9wIC0gcGFnZVlPZmZzZXQsXG4gICAgICAgICAgYm90dG9tOiBwYWdlWU9mZnNldCAtIHRvcCAtIGhlaWdodCArIGlubmVySGVpZ2h0LFxuICAgICAgICAgIGxlZnQ6IGxlZnQgLSBwYWdlWE9mZnNldCxcbiAgICAgICAgICByaWdodDogcGFnZVhPZmZzZXQgLSBsZWZ0IC0gd2lkdGggKyBpbm5lcldpZHRoXG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHZhciBkb2MgPSB0aGlzLnRhcmdldC5vd25lckRvY3VtZW50O1xuICAgICAgdmFyIHdpbiA9IGRvYy5kZWZhdWx0VmlldztcblxuICAgICAgdmFyIHNjcm9sbGJhclNpemUgPSB1bmRlZmluZWQ7XG4gICAgICBpZiAod2luLmlubmVySGVpZ2h0ID4gZG9jLmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQpIHtcbiAgICAgICAgc2Nyb2xsYmFyU2l6ZSA9IHRoaXMuY2FjaGUoJ3Njcm9sbGJhci1zaXplJywgZ2V0U2Nyb2xsQmFyU2l6ZSk7XG4gICAgICAgIG5leHQudmlld3BvcnQuYm90dG9tIC09IHNjcm9sbGJhclNpemUuaGVpZ2h0O1xuICAgICAgfVxuXG4gICAgICBpZiAod2luLmlubmVyV2lkdGggPiBkb2MuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoKSB7XG4gICAgICAgIHNjcm9sbGJhclNpemUgPSB0aGlzLmNhY2hlKCdzY3JvbGxiYXItc2l6ZScsIGdldFNjcm9sbEJhclNpemUpO1xuICAgICAgICBuZXh0LnZpZXdwb3J0LnJpZ2h0IC09IHNjcm9sbGJhclNpemUud2lkdGg7XG4gICAgICB9XG5cbiAgICAgIGlmIChbJycsICdzdGF0aWMnXS5pbmRleE9mKGRvYy5ib2R5LnN0eWxlLnBvc2l0aW9uKSA9PT0gLTEgfHwgWycnLCAnc3RhdGljJ10uaW5kZXhPZihkb2MuYm9keS5wYXJlbnRFbGVtZW50LnN0eWxlLnBvc2l0aW9uKSA9PT0gLTEpIHtcbiAgICAgICAgLy8gQWJzb2x1dGUgcG9zaXRpb25pbmcgaW4gdGhlIGJvZHkgd2lsbCBiZSByZWxhdGl2ZSB0byB0aGUgcGFnZSwgbm90IHRoZSAnaW5pdGlhbCBjb250YWluaW5nIGJsb2NrJ1xuICAgICAgICBuZXh0LnBhZ2UuYm90dG9tID0gZG9jLmJvZHkuc2Nyb2xsSGVpZ2h0IC0gdG9wIC0gaGVpZ2h0O1xuICAgICAgICBuZXh0LnBhZ2UucmlnaHQgPSBkb2MuYm9keS5zY3JvbGxXaWR0aCAtIGxlZnQgLSB3aWR0aDtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB0aGlzLm9wdGlvbnMub3B0aW1pemF0aW9ucyAhPT0gJ3VuZGVmaW5lZCcgJiYgdGhpcy5vcHRpb25zLm9wdGltaXphdGlvbnMubW92ZUVsZW1lbnQgIT09IGZhbHNlICYmICEodHlwZW9mIHRoaXMudGFyZ2V0TW9kaWZpZXIgIT09ICd1bmRlZmluZWQnKSkge1xuICAgICAgICAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBvZmZzZXRQYXJlbnQgPSBfdGhpczcuY2FjaGUoJ3RhcmdldC1vZmZzZXRwYXJlbnQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0T2Zmc2V0UGFyZW50KF90aGlzNy50YXJnZXQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHZhciBvZmZzZXRQb3NpdGlvbiA9IF90aGlzNy5jYWNoZSgndGFyZ2V0LW9mZnNldHBhcmVudC1ib3VuZHMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0Qm91bmRzKG9mZnNldFBhcmVudCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdmFyIG9mZnNldFBhcmVudFN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShvZmZzZXRQYXJlbnQpO1xuICAgICAgICAgIHZhciBvZmZzZXRQYXJlbnRTaXplID0gb2Zmc2V0UG9zaXRpb247XG5cbiAgICAgICAgICB2YXIgb2Zmc2V0Qm9yZGVyID0ge307XG4gICAgICAgICAgWydUb3AnLCAnTGVmdCcsICdCb3R0b20nLCAnUmlnaHQnXS5mb3JFYWNoKGZ1bmN0aW9uIChzaWRlKSB7XG4gICAgICAgICAgICBvZmZzZXRCb3JkZXJbc2lkZS50b0xvd2VyQ2FzZSgpXSA9IHBhcnNlRmxvYXQob2Zmc2V0UGFyZW50U3R5bGVbJ2JvcmRlcicgKyBzaWRlICsgJ1dpZHRoJ10pO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgb2Zmc2V0UG9zaXRpb24ucmlnaHQgPSBkb2MuYm9keS5zY3JvbGxXaWR0aCAtIG9mZnNldFBvc2l0aW9uLmxlZnQgLSBvZmZzZXRQYXJlbnRTaXplLndpZHRoICsgb2Zmc2V0Qm9yZGVyLnJpZ2h0O1xuICAgICAgICAgIG9mZnNldFBvc2l0aW9uLmJvdHRvbSA9IGRvYy5ib2R5LnNjcm9sbEhlaWdodCAtIG9mZnNldFBvc2l0aW9uLnRvcCAtIG9mZnNldFBhcmVudFNpemUuaGVpZ2h0ICsgb2Zmc2V0Qm9yZGVyLmJvdHRvbTtcblxuICAgICAgICAgIGlmIChuZXh0LnBhZ2UudG9wID49IG9mZnNldFBvc2l0aW9uLnRvcCArIG9mZnNldEJvcmRlci50b3AgJiYgbmV4dC5wYWdlLmJvdHRvbSA+PSBvZmZzZXRQb3NpdGlvbi5ib3R0b20pIHtcbiAgICAgICAgICAgIGlmIChuZXh0LnBhZ2UubGVmdCA+PSBvZmZzZXRQb3NpdGlvbi5sZWZ0ICsgb2Zmc2V0Qm9yZGVyLmxlZnQgJiYgbmV4dC5wYWdlLnJpZ2h0ID49IG9mZnNldFBvc2l0aW9uLnJpZ2h0KSB7XG4gICAgICAgICAgICAgIC8vIFdlJ3JlIHdpdGhpbiB0aGUgdmlzaWJsZSBwYXJ0IG9mIHRoZSB0YXJnZXQncyBzY3JvbGwgcGFyZW50XG4gICAgICAgICAgICAgIHZhciBzY3JvbGxUb3AgPSBvZmZzZXRQYXJlbnQuc2Nyb2xsVG9wO1xuICAgICAgICAgICAgICB2YXIgc2Nyb2xsTGVmdCA9IG9mZnNldFBhcmVudC5zY3JvbGxMZWZ0O1xuXG4gICAgICAgICAgICAgIC8vIEl0J3MgcG9zaXRpb24gcmVsYXRpdmUgdG8gdGhlIHRhcmdldCdzIG9mZnNldCBwYXJlbnQgKGFic29sdXRlIHBvc2l0aW9uaW5nIHdoZW5cbiAgICAgICAgICAgICAgLy8gdGhlIGVsZW1lbnQgaXMgbW92ZWQgdG8gYmUgYSBjaGlsZCBvZiB0aGUgdGFyZ2V0J3Mgb2Zmc2V0IHBhcmVudCkuXG4gICAgICAgICAgICAgIG5leHQub2Zmc2V0ID0ge1xuICAgICAgICAgICAgICAgIHRvcDogbmV4dC5wYWdlLnRvcCAtIG9mZnNldFBvc2l0aW9uLnRvcCArIHNjcm9sbFRvcCAtIG9mZnNldEJvcmRlci50b3AsXG4gICAgICAgICAgICAgICAgbGVmdDogbmV4dC5wYWdlLmxlZnQgLSBvZmZzZXRQb3NpdGlvbi5sZWZ0ICsgc2Nyb2xsTGVmdCAtIG9mZnNldEJvcmRlci5sZWZ0XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuICAgICAgfVxuXG4gICAgICAvLyBXZSBjb3VsZCBhbHNvIHRyYXZlbCB1cCB0aGUgRE9NIGFuZCB0cnkgZWFjaCBjb250YWluaW5nIGNvbnRleHQsIHJhdGhlciB0aGFuIG9ubHlcbiAgICAgIC8vIGxvb2tpbmcgYXQgdGhlIGJvZHksIGJ1dCB3ZSdyZSBnb25uYSBnZXQgZGltaW5pc2hpbmcgcmV0dXJucy5cblxuICAgICAgdGhpcy5tb3ZlKG5leHQpO1xuXG4gICAgICB0aGlzLmhpc3RvcnkudW5zaGlmdChuZXh0KTtcblxuICAgICAgaWYgKHRoaXMuaGlzdG9yeS5sZW5ndGggPiAzKSB7XG4gICAgICAgIHRoaXMuaGlzdG9yeS5wb3AoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGZsdXNoQ2hhbmdlcykge1xuICAgICAgICBmbHVzaCgpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBUSEUgSVNTVUVcbiAgfSwge1xuICAgIGtleTogJ21vdmUnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBtb3ZlKHBvcykge1xuICAgICAgdmFyIF90aGlzOCA9IHRoaXM7XG5cbiAgICAgIGlmICghKHR5cGVvZiB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZSAhPT0gJ3VuZGVmaW5lZCcpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHNhbWUgPSB7fTtcblxuICAgICAgZm9yICh2YXIgdHlwZSBpbiBwb3MpIHtcbiAgICAgICAgc2FtZVt0eXBlXSA9IHt9O1xuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBwb3NbdHlwZV0pIHtcbiAgICAgICAgICB2YXIgZm91bmQgPSBmYWxzZTtcblxuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5oaXN0b3J5Lmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICB2YXIgcG9pbnQgPSB0aGlzLmhpc3RvcnlbaV07XG4gICAgICAgICAgICBpZiAodHlwZW9mIHBvaW50W3R5cGVdICE9PSAndW5kZWZpbmVkJyAmJiAhd2l0aGluKHBvaW50W3R5cGVdW2tleV0sIHBvc1t0eXBlXVtrZXldKSkge1xuICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgICAgIHNhbWVbdHlwZV1ba2V5XSA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciBjc3MgPSB7IHRvcDogJycsIGxlZnQ6ICcnLCByaWdodDogJycsIGJvdHRvbTogJycgfTtcblxuICAgICAgdmFyIHRyYW5zY3JpYmUgPSBmdW5jdGlvbiB0cmFuc2NyaWJlKF9zYW1lLCBfcG9zKSB7XG4gICAgICAgIHZhciBoYXNPcHRpbWl6YXRpb25zID0gdHlwZW9mIF90aGlzOC5vcHRpb25zLm9wdGltaXphdGlvbnMgIT09ICd1bmRlZmluZWQnO1xuICAgICAgICB2YXIgZ3B1ID0gaGFzT3B0aW1pemF0aW9ucyA/IF90aGlzOC5vcHRpb25zLm9wdGltaXphdGlvbnMuZ3B1IDogbnVsbDtcbiAgICAgICAgaWYgKGdwdSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICB2YXIgeVBvcyA9IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgeFBvcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBpZiAoX3NhbWUudG9wKSB7XG4gICAgICAgICAgICBjc3MudG9wID0gMDtcbiAgICAgICAgICAgIHlQb3MgPSBfcG9zLnRvcDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY3NzLmJvdHRvbSA9IDA7XG4gICAgICAgICAgICB5UG9zID0gLV9wb3MuYm90dG9tO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChfc2FtZS5sZWZ0KSB7XG4gICAgICAgICAgICBjc3MubGVmdCA9IDA7XG4gICAgICAgICAgICB4UG9zID0gX3Bvcy5sZWZ0O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjc3MucmlnaHQgPSAwO1xuICAgICAgICAgICAgeFBvcyA9IC1fcG9zLnJpZ2h0O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh3aW5kb3cubWF0Y2hNZWRpYSkge1xuICAgICAgICAgICAgLy8gSHViU3BvdC90ZXRoZXIjMjA3XG4gICAgICAgICAgICB2YXIgcmV0aW5hID0gd2luZG93Lm1hdGNoTWVkaWEoJ29ubHkgc2NyZWVuIGFuZCAobWluLXJlc29sdXRpb246IDEuM2RwcHgpJykubWF0Y2hlcyB8fCB3aW5kb3cubWF0Y2hNZWRpYSgnb25seSBzY3JlZW4gYW5kICgtd2Via2l0LW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDEuMyknKS5tYXRjaGVzO1xuICAgICAgICAgICAgaWYgKCFyZXRpbmEpIHtcbiAgICAgICAgICAgICAgeFBvcyA9IE1hdGgucm91bmQoeFBvcyk7XG4gICAgICAgICAgICAgIHlQb3MgPSBNYXRoLnJvdW5kKHlQb3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGNzc1t0cmFuc2Zvcm1LZXldID0gJ3RyYW5zbGF0ZVgoJyArIHhQb3MgKyAncHgpIHRyYW5zbGF0ZVkoJyArIHlQb3MgKyAncHgpJztcblxuICAgICAgICAgIGlmICh0cmFuc2Zvcm1LZXkgIT09ICdtc1RyYW5zZm9ybScpIHtcbiAgICAgICAgICAgIC8vIFRoZSBaIHRyYW5zZm9ybSB3aWxsIGtlZXAgdGhpcyBpbiB0aGUgR1BVIChmYXN0ZXIsIGFuZCBwcmV2ZW50cyBhcnRpZmFjdHMpLFxuICAgICAgICAgICAgLy8gYnV0IElFOSBkb2Vzbid0IHN1cHBvcnQgM2QgdHJhbnNmb3JtcyBhbmQgd2lsbCBjaG9rZS5cbiAgICAgICAgICAgIGNzc1t0cmFuc2Zvcm1LZXldICs9IFwiIHRyYW5zbGF0ZVooMClcIjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKF9zYW1lLnRvcCkge1xuICAgICAgICAgICAgY3NzLnRvcCA9IF9wb3MudG9wICsgJ3B4JztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY3NzLmJvdHRvbSA9IF9wb3MuYm90dG9tICsgJ3B4JztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoX3NhbWUubGVmdCkge1xuICAgICAgICAgICAgY3NzLmxlZnQgPSBfcG9zLmxlZnQgKyAncHgnO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjc3MucmlnaHQgPSBfcG9zLnJpZ2h0ICsgJ3B4JztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHZhciBtb3ZlZCA9IGZhbHNlO1xuICAgICAgaWYgKChzYW1lLnBhZ2UudG9wIHx8IHNhbWUucGFnZS5ib3R0b20pICYmIChzYW1lLnBhZ2UubGVmdCB8fCBzYW1lLnBhZ2UucmlnaHQpKSB7XG4gICAgICAgIGNzcy5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgICAgIHRyYW5zY3JpYmUoc2FtZS5wYWdlLCBwb3MucGFnZSk7XG4gICAgICB9IGVsc2UgaWYgKChzYW1lLnZpZXdwb3J0LnRvcCB8fCBzYW1lLnZpZXdwb3J0LmJvdHRvbSkgJiYgKHNhbWUudmlld3BvcnQubGVmdCB8fCBzYW1lLnZpZXdwb3J0LnJpZ2h0KSkge1xuICAgICAgICBjc3MucG9zaXRpb24gPSAnZml4ZWQnO1xuICAgICAgICB0cmFuc2NyaWJlKHNhbWUudmlld3BvcnQsIHBvcy52aWV3cG9ydCk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBzYW1lLm9mZnNldCAhPT0gJ3VuZGVmaW5lZCcgJiYgc2FtZS5vZmZzZXQudG9wICYmIHNhbWUub2Zmc2V0LmxlZnQpIHtcbiAgICAgICAgKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBjc3MucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICAgIHZhciBvZmZzZXRQYXJlbnQgPSBfdGhpczguY2FjaGUoJ3RhcmdldC1vZmZzZXRwYXJlbnQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0T2Zmc2V0UGFyZW50KF90aGlzOC50YXJnZXQpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKGdldE9mZnNldFBhcmVudChfdGhpczguZWxlbWVudCkgIT09IG9mZnNldFBhcmVudCkge1xuICAgICAgICAgICAgZGVmZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICBfdGhpczguZWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKF90aGlzOC5lbGVtZW50KTtcbiAgICAgICAgICAgICAgb2Zmc2V0UGFyZW50LmFwcGVuZENoaWxkKF90aGlzOC5lbGVtZW50KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRyYW5zY3JpYmUoc2FtZS5vZmZzZXQsIHBvcy5vZmZzZXQpO1xuICAgICAgICAgIG1vdmVkID0gdHJ1ZTtcbiAgICAgICAgfSkoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNzcy5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgICAgIHRyYW5zY3JpYmUoeyB0b3A6IHRydWUsIGxlZnQ6IHRydWUgfSwgcG9zLnBhZ2UpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIW1vdmVkKSB7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuYm9keUVsZW1lbnQpIHtcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuYm9keUVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgb2Zmc2V0UGFyZW50SXNCb2R5ID0gdHJ1ZTtcbiAgICAgICAgICB2YXIgY3VycmVudE5vZGUgPSB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZTtcbiAgICAgICAgICB3aGlsZSAoY3VycmVudE5vZGUgJiYgY3VycmVudE5vZGUubm9kZVR5cGUgPT09IDEgJiYgY3VycmVudE5vZGUudGFnTmFtZSAhPT0gJ0JPRFknKSB7XG4gICAgICAgICAgICBpZiAoZ2V0Q29tcHV0ZWRTdHlsZShjdXJyZW50Tm9kZSkucG9zaXRpb24gIT09ICdzdGF0aWMnKSB7XG4gICAgICAgICAgICAgIG9mZnNldFBhcmVudElzQm9keSA9IGZhbHNlO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY3VycmVudE5vZGUgPSBjdXJyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghb2Zmc2V0UGFyZW50SXNCb2R5KSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50Lm93bmVyRG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBBbnkgY3NzIGNoYW5nZSB3aWxsIHRyaWdnZXIgYSByZXBhaW50LCBzbyBsZXQncyBhdm9pZCBvbmUgaWYgbm90aGluZyBjaGFuZ2VkXG4gICAgICB2YXIgd3JpdGVDU1MgPSB7fTtcbiAgICAgIHZhciB3cml0ZSA9IGZhbHNlO1xuICAgICAgZm9yICh2YXIga2V5IGluIGNzcykge1xuICAgICAgICB2YXIgdmFsID0gY3NzW2tleV07XG4gICAgICAgIHZhciBlbFZhbCA9IHRoaXMuZWxlbWVudC5zdHlsZVtrZXldO1xuXG4gICAgICAgIGlmIChlbFZhbCAhPT0gdmFsKSB7XG4gICAgICAgICAgd3JpdGUgPSB0cnVlO1xuICAgICAgICAgIHdyaXRlQ1NTW2tleV0gPSB2YWw7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHdyaXRlKSB7XG4gICAgICAgIGRlZmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBleHRlbmQoX3RoaXM4LmVsZW1lbnQuc3R5bGUsIHdyaXRlQ1NTKTtcbiAgICAgICAgICBfdGhpczgudHJpZ2dlcigncmVwb3NpdGlvbmVkJyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBUZXRoZXJDbGFzcztcbn0pKEV2ZW50ZWQpO1xuXG5UZXRoZXJDbGFzcy5tb2R1bGVzID0gW107XG5cblRldGhlckJhc2UucG9zaXRpb24gPSBwb3NpdGlvbjtcblxudmFyIFRldGhlciA9IGV4dGVuZChUZXRoZXJDbGFzcywgVGV0aGVyQmFzZSk7XG4vKiBnbG9iYWxzIFRldGhlckJhc2UgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgX3NsaWNlZFRvQXJyYXkgPSAoZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBzbGljZUl0ZXJhdG9yKGFyciwgaSkgeyB2YXIgX2FyciA9IFtdOyB2YXIgX24gPSB0cnVlOyB2YXIgX2QgPSBmYWxzZTsgdmFyIF9lID0gdW5kZWZpbmVkOyB0cnkgeyBmb3IgKHZhciBfaSA9IGFycltTeW1ib2wuaXRlcmF0b3JdKCksIF9zOyAhKF9uID0gKF9zID0gX2kubmV4dCgpKS5kb25lKTsgX24gPSB0cnVlKSB7IF9hcnIucHVzaChfcy52YWx1ZSk7IGlmIChpICYmIF9hcnIubGVuZ3RoID09PSBpKSBicmVhazsgfSB9IGNhdGNoIChlcnIpIHsgX2QgPSB0cnVlOyBfZSA9IGVycjsgfSBmaW5hbGx5IHsgdHJ5IHsgaWYgKCFfbiAmJiBfaVsncmV0dXJuJ10pIF9pWydyZXR1cm4nXSgpOyB9IGZpbmFsbHkgeyBpZiAoX2QpIHRocm93IF9lOyB9IH0gcmV0dXJuIF9hcnI7IH0gcmV0dXJuIGZ1bmN0aW9uIChhcnIsIGkpIHsgaWYgKEFycmF5LmlzQXJyYXkoYXJyKSkgeyByZXR1cm4gYXJyOyB9IGVsc2UgaWYgKFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoYXJyKSkgeyByZXR1cm4gc2xpY2VJdGVyYXRvcihhcnIsIGkpOyB9IGVsc2UgeyB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGF0dGVtcHQgdG8gZGVzdHJ1Y3R1cmUgbm9uLWl0ZXJhYmxlIGluc3RhbmNlJyk7IH0gfTsgfSkoKTtcblxudmFyIF9UZXRoZXJCYXNlJFV0aWxzID0gVGV0aGVyQmFzZS5VdGlscztcbnZhciBnZXRCb3VuZHMgPSBfVGV0aGVyQmFzZSRVdGlscy5nZXRCb3VuZHM7XG52YXIgZXh0ZW5kID0gX1RldGhlckJhc2UkVXRpbHMuZXh0ZW5kO1xudmFyIHVwZGF0ZUNsYXNzZXMgPSBfVGV0aGVyQmFzZSRVdGlscy51cGRhdGVDbGFzc2VzO1xudmFyIGRlZmVyID0gX1RldGhlckJhc2UkVXRpbHMuZGVmZXI7XG5cbnZhciBCT1VORFNfRk9STUFUID0gWydsZWZ0JywgJ3RvcCcsICdyaWdodCcsICdib3R0b20nXTtcblxuZnVuY3Rpb24gZ2V0Qm91bmRpbmdSZWN0KHRldGhlciwgdG8pIHtcbiAgaWYgKHRvID09PSAnc2Nyb2xsUGFyZW50Jykge1xuICAgIHRvID0gdGV0aGVyLnNjcm9sbFBhcmVudHNbMF07XG4gIH0gZWxzZSBpZiAodG8gPT09ICd3aW5kb3cnKSB7XG4gICAgdG8gPSBbcGFnZVhPZmZzZXQsIHBhZ2VZT2Zmc2V0LCBpbm5lcldpZHRoICsgcGFnZVhPZmZzZXQsIGlubmVySGVpZ2h0ICsgcGFnZVlPZmZzZXRdO1xuICB9XG5cbiAgaWYgKHRvID09PSBkb2N1bWVudCkge1xuICAgIHRvID0gdG8uZG9jdW1lbnRFbGVtZW50O1xuICB9XG5cbiAgaWYgKHR5cGVvZiB0by5ub2RlVHlwZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG5vZGUgPSB0bztcbiAgICAgIHZhciBzaXplID0gZ2V0Qm91bmRzKHRvKTtcbiAgICAgIHZhciBwb3MgPSBzaXplO1xuICAgICAgdmFyIHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZSh0byk7XG5cbiAgICAgIHRvID0gW3Bvcy5sZWZ0LCBwb3MudG9wLCBzaXplLndpZHRoICsgcG9zLmxlZnQsIHNpemUuaGVpZ2h0ICsgcG9zLnRvcF07XG5cbiAgICAgIC8vIEFjY291bnQgYW55IHBhcmVudCBGcmFtZXMgc2Nyb2xsIG9mZnNldFxuICAgICAgaWYgKG5vZGUub3duZXJEb2N1bWVudCAhPT0gZG9jdW1lbnQpIHtcbiAgICAgICAgdmFyIHdpbiA9IG5vZGUub3duZXJEb2N1bWVudC5kZWZhdWx0VmlldztcbiAgICAgICAgdG9bMF0gKz0gd2luLnBhZ2VYT2Zmc2V0O1xuICAgICAgICB0b1sxXSArPSB3aW4ucGFnZVlPZmZzZXQ7XG4gICAgICAgIHRvWzJdICs9IHdpbi5wYWdlWE9mZnNldDtcbiAgICAgICAgdG9bM10gKz0gd2luLnBhZ2VZT2Zmc2V0O1xuICAgICAgfVxuXG4gICAgICBCT1VORFNfRk9STUFULmZvckVhY2goZnVuY3Rpb24gKHNpZGUsIGkpIHtcbiAgICAgICAgc2lkZSA9IHNpZGVbMF0udG9VcHBlckNhc2UoKSArIHNpZGUuc3Vic3RyKDEpO1xuICAgICAgICBpZiAoc2lkZSA9PT0gJ1RvcCcgfHwgc2lkZSA9PT0gJ0xlZnQnKSB7XG4gICAgICAgICAgdG9baV0gKz0gcGFyc2VGbG9hdChzdHlsZVsnYm9yZGVyJyArIHNpZGUgKyAnV2lkdGgnXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdG9baV0gLT0gcGFyc2VGbG9hdChzdHlsZVsnYm9yZGVyJyArIHNpZGUgKyAnV2lkdGgnXSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pKCk7XG4gIH1cblxuICByZXR1cm4gdG87XG59XG5cblRldGhlckJhc2UubW9kdWxlcy5wdXNoKHtcbiAgcG9zaXRpb246IGZ1bmN0aW9uIHBvc2l0aW9uKF9yZWYpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdmFyIHRvcCA9IF9yZWYudG9wO1xuICAgIHZhciBsZWZ0ID0gX3JlZi5sZWZ0O1xuICAgIHZhciB0YXJnZXRBdHRhY2htZW50ID0gX3JlZi50YXJnZXRBdHRhY2htZW50O1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuY29uc3RyYWludHMpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHZhciBfY2FjaGUgPSB0aGlzLmNhY2hlKCdlbGVtZW50LWJvdW5kcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBnZXRCb3VuZHMoX3RoaXMuZWxlbWVudCk7XG4gICAgfSk7XG5cbiAgICB2YXIgaGVpZ2h0ID0gX2NhY2hlLmhlaWdodDtcbiAgICB2YXIgd2lkdGggPSBfY2FjaGUud2lkdGg7XG5cbiAgICBpZiAod2lkdGggPT09IDAgJiYgaGVpZ2h0ID09PSAwICYmIHR5cGVvZiB0aGlzLmxhc3RTaXplICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdmFyIF9sYXN0U2l6ZSA9IHRoaXMubGFzdFNpemU7XG5cbiAgICAgIC8vIEhhbmRsZSB0aGUgaXRlbSBnZXR0aW5nIGhpZGRlbiBhcyBhIHJlc3VsdCBvZiBvdXIgcG9zaXRpb25pbmcgd2l0aG91dCBnbGl0Y2hpbmdcbiAgICAgIC8vIHRoZSBjbGFzc2VzIGluIGFuZCBvdXRcbiAgICAgIHdpZHRoID0gX2xhc3RTaXplLndpZHRoO1xuICAgICAgaGVpZ2h0ID0gX2xhc3RTaXplLmhlaWdodDtcbiAgICB9XG5cbiAgICB2YXIgdGFyZ2V0U2l6ZSA9IHRoaXMuY2FjaGUoJ3RhcmdldC1ib3VuZHMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gX3RoaXMuZ2V0VGFyZ2V0Qm91bmRzKCk7XG4gICAgfSk7XG5cbiAgICB2YXIgdGFyZ2V0SGVpZ2h0ID0gdGFyZ2V0U2l6ZS5oZWlnaHQ7XG4gICAgdmFyIHRhcmdldFdpZHRoID0gdGFyZ2V0U2l6ZS53aWR0aDtcblxuICAgIHZhciBhbGxDbGFzc2VzID0gW3RoaXMuZ2V0Q2xhc3MoJ3Bpbm5lZCcpLCB0aGlzLmdldENsYXNzKCdvdXQtb2YtYm91bmRzJyldO1xuXG4gICAgdGhpcy5vcHRpb25zLmNvbnN0cmFpbnRzLmZvckVhY2goZnVuY3Rpb24gKGNvbnN0cmFpbnQpIHtcbiAgICAgIHZhciBvdXRPZkJvdW5kc0NsYXNzID0gY29uc3RyYWludC5vdXRPZkJvdW5kc0NsYXNzO1xuICAgICAgdmFyIHBpbm5lZENsYXNzID0gY29uc3RyYWludC5waW5uZWRDbGFzcztcblxuICAgICAgaWYgKG91dE9mQm91bmRzQ2xhc3MpIHtcbiAgICAgICAgYWxsQ2xhc3Nlcy5wdXNoKG91dE9mQm91bmRzQ2xhc3MpO1xuICAgICAgfVxuICAgICAgaWYgKHBpbm5lZENsYXNzKSB7XG4gICAgICAgIGFsbENsYXNzZXMucHVzaChwaW5uZWRDbGFzcyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBhbGxDbGFzc2VzLmZvckVhY2goZnVuY3Rpb24gKGNscykge1xuICAgICAgWydsZWZ0JywgJ3RvcCcsICdyaWdodCcsICdib3R0b20nXS5mb3JFYWNoKGZ1bmN0aW9uIChzaWRlKSB7XG4gICAgICAgIGFsbENsYXNzZXMucHVzaChjbHMgKyAnLScgKyBzaWRlKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdmFyIGFkZENsYXNzZXMgPSBbXTtcblxuICAgIHZhciB0QXR0YWNobWVudCA9IGV4dGVuZCh7fSwgdGFyZ2V0QXR0YWNobWVudCk7XG4gICAgdmFyIGVBdHRhY2htZW50ID0gZXh0ZW5kKHt9LCB0aGlzLmF0dGFjaG1lbnQpO1xuXG4gICAgdGhpcy5vcHRpb25zLmNvbnN0cmFpbnRzLmZvckVhY2goZnVuY3Rpb24gKGNvbnN0cmFpbnQpIHtcbiAgICAgIHZhciB0byA9IGNvbnN0cmFpbnQudG87XG4gICAgICB2YXIgYXR0YWNobWVudCA9IGNvbnN0cmFpbnQuYXR0YWNobWVudDtcbiAgICAgIHZhciBwaW4gPSBjb25zdHJhaW50LnBpbjtcblxuICAgICAgaWYgKHR5cGVvZiBhdHRhY2htZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBhdHRhY2htZW50ID0gJyc7XG4gICAgICB9XG5cbiAgICAgIHZhciBjaGFuZ2VBdHRhY2hYID0gdW5kZWZpbmVkLFxuICAgICAgICAgIGNoYW5nZUF0dGFjaFkgPSB1bmRlZmluZWQ7XG4gICAgICBpZiAoYXR0YWNobWVudC5pbmRleE9mKCcgJykgPj0gMCkge1xuICAgICAgICB2YXIgX2F0dGFjaG1lbnQkc3BsaXQgPSBhdHRhY2htZW50LnNwbGl0KCcgJyk7XG5cbiAgICAgICAgdmFyIF9hdHRhY2htZW50JHNwbGl0MiA9IF9zbGljZWRUb0FycmF5KF9hdHRhY2htZW50JHNwbGl0LCAyKTtcblxuICAgICAgICBjaGFuZ2VBdHRhY2hZID0gX2F0dGFjaG1lbnQkc3BsaXQyWzBdO1xuICAgICAgICBjaGFuZ2VBdHRhY2hYID0gX2F0dGFjaG1lbnQkc3BsaXQyWzFdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hhbmdlQXR0YWNoWCA9IGNoYW5nZUF0dGFjaFkgPSBhdHRhY2htZW50O1xuICAgICAgfVxuXG4gICAgICB2YXIgYm91bmRzID0gZ2V0Qm91bmRpbmdSZWN0KF90aGlzLCB0byk7XG5cbiAgICAgIGlmIChjaGFuZ2VBdHRhY2hZID09PSAndGFyZ2V0JyB8fCBjaGFuZ2VBdHRhY2hZID09PSAnYm90aCcpIHtcbiAgICAgICAgaWYgKHRvcCA8IGJvdW5kc1sxXSAmJiB0QXR0YWNobWVudC50b3AgPT09ICd0b3AnKSB7XG4gICAgICAgICAgdG9wICs9IHRhcmdldEhlaWdodDtcbiAgICAgICAgICB0QXR0YWNobWVudC50b3AgPSAnYm90dG9tJztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b3AgKyBoZWlnaHQgPiBib3VuZHNbM10gJiYgdEF0dGFjaG1lbnQudG9wID09PSAnYm90dG9tJykge1xuICAgICAgICAgIHRvcCAtPSB0YXJnZXRIZWlnaHQ7XG4gICAgICAgICAgdEF0dGFjaG1lbnQudG9wID0gJ3RvcCc7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGNoYW5nZUF0dGFjaFkgPT09ICd0b2dldGhlcicpIHtcbiAgICAgICAgaWYgKHRBdHRhY2htZW50LnRvcCA9PT0gJ3RvcCcpIHtcbiAgICAgICAgICBpZiAoZUF0dGFjaG1lbnQudG9wID09PSAnYm90dG9tJyAmJiB0b3AgPCBib3VuZHNbMV0pIHtcbiAgICAgICAgICAgIHRvcCArPSB0YXJnZXRIZWlnaHQ7XG4gICAgICAgICAgICB0QXR0YWNobWVudC50b3AgPSAnYm90dG9tJztcblxuICAgICAgICAgICAgdG9wICs9IGhlaWdodDtcbiAgICAgICAgICAgIGVBdHRhY2htZW50LnRvcCA9ICd0b3AnO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZUF0dGFjaG1lbnQudG9wID09PSAndG9wJyAmJiB0b3AgKyBoZWlnaHQgPiBib3VuZHNbM10gJiYgdG9wIC0gKGhlaWdodCAtIHRhcmdldEhlaWdodCkgPj0gYm91bmRzWzFdKSB7XG4gICAgICAgICAgICB0b3AgLT0gaGVpZ2h0IC0gdGFyZ2V0SGVpZ2h0O1xuICAgICAgICAgICAgdEF0dGFjaG1lbnQudG9wID0gJ2JvdHRvbSc7XG5cbiAgICAgICAgICAgIGVBdHRhY2htZW50LnRvcCA9ICdib3R0b20nO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0QXR0YWNobWVudC50b3AgPT09ICdib3R0b20nKSB7XG4gICAgICAgICAgaWYgKGVBdHRhY2htZW50LnRvcCA9PT0gJ3RvcCcgJiYgdG9wICsgaGVpZ2h0ID4gYm91bmRzWzNdKSB7XG4gICAgICAgICAgICB0b3AgLT0gdGFyZ2V0SGVpZ2h0O1xuICAgICAgICAgICAgdEF0dGFjaG1lbnQudG9wID0gJ3RvcCc7XG5cbiAgICAgICAgICAgIHRvcCAtPSBoZWlnaHQ7XG4gICAgICAgICAgICBlQXR0YWNobWVudC50b3AgPSAnYm90dG9tJztcbiAgICAgICAgICB9IGVsc2UgaWYgKGVBdHRhY2htZW50LnRvcCA9PT0gJ2JvdHRvbScgJiYgdG9wIDwgYm91bmRzWzFdICYmIHRvcCArIChoZWlnaHQgKiAyIC0gdGFyZ2V0SGVpZ2h0KSA8PSBib3VuZHNbM10pIHtcbiAgICAgICAgICAgIHRvcCArPSBoZWlnaHQgLSB0YXJnZXRIZWlnaHQ7XG4gICAgICAgICAgICB0QXR0YWNobWVudC50b3AgPSAndG9wJztcblxuICAgICAgICAgICAgZUF0dGFjaG1lbnQudG9wID0gJ3RvcCc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRBdHRhY2htZW50LnRvcCA9PT0gJ21pZGRsZScpIHtcbiAgICAgICAgICBpZiAodG9wICsgaGVpZ2h0ID4gYm91bmRzWzNdICYmIGVBdHRhY2htZW50LnRvcCA9PT0gJ3RvcCcpIHtcbiAgICAgICAgICAgIHRvcCAtPSBoZWlnaHQ7XG4gICAgICAgICAgICBlQXR0YWNobWVudC50b3AgPSAnYm90dG9tJztcbiAgICAgICAgICB9IGVsc2UgaWYgKHRvcCA8IGJvdW5kc1sxXSAmJiBlQXR0YWNobWVudC50b3AgPT09ICdib3R0b20nKSB7XG4gICAgICAgICAgICB0b3AgKz0gaGVpZ2h0O1xuICAgICAgICAgICAgZUF0dGFjaG1lbnQudG9wID0gJ3RvcCc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChjaGFuZ2VBdHRhY2hYID09PSAndGFyZ2V0JyB8fCBjaGFuZ2VBdHRhY2hYID09PSAnYm90aCcpIHtcbiAgICAgICAgaWYgKGxlZnQgPCBib3VuZHNbMF0gJiYgdEF0dGFjaG1lbnQubGVmdCA9PT0gJ2xlZnQnKSB7XG4gICAgICAgICAgbGVmdCArPSB0YXJnZXRXaWR0aDtcbiAgICAgICAgICB0QXR0YWNobWVudC5sZWZ0ID0gJ3JpZ2h0JztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsZWZ0ICsgd2lkdGggPiBib3VuZHNbMl0gJiYgdEF0dGFjaG1lbnQubGVmdCA9PT0gJ3JpZ2h0Jykge1xuICAgICAgICAgIGxlZnQgLT0gdGFyZ2V0V2lkdGg7XG4gICAgICAgICAgdEF0dGFjaG1lbnQubGVmdCA9ICdsZWZ0JztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoY2hhbmdlQXR0YWNoWCA9PT0gJ3RvZ2V0aGVyJykge1xuICAgICAgICBpZiAobGVmdCA8IGJvdW5kc1swXSAmJiB0QXR0YWNobWVudC5sZWZ0ID09PSAnbGVmdCcpIHtcbiAgICAgICAgICBpZiAoZUF0dGFjaG1lbnQubGVmdCA9PT0gJ3JpZ2h0Jykge1xuICAgICAgICAgICAgbGVmdCArPSB0YXJnZXRXaWR0aDtcbiAgICAgICAgICAgIHRBdHRhY2htZW50LmxlZnQgPSAncmlnaHQnO1xuXG4gICAgICAgICAgICBsZWZ0ICs9IHdpZHRoO1xuICAgICAgICAgICAgZUF0dGFjaG1lbnQubGVmdCA9ICdsZWZ0JztcbiAgICAgICAgICB9IGVsc2UgaWYgKGVBdHRhY2htZW50LmxlZnQgPT09ICdsZWZ0Jykge1xuICAgICAgICAgICAgbGVmdCArPSB0YXJnZXRXaWR0aDtcbiAgICAgICAgICAgIHRBdHRhY2htZW50LmxlZnQgPSAncmlnaHQnO1xuXG4gICAgICAgICAgICBsZWZ0IC09IHdpZHRoO1xuICAgICAgICAgICAgZUF0dGFjaG1lbnQubGVmdCA9ICdyaWdodCc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGxlZnQgKyB3aWR0aCA+IGJvdW5kc1syXSAmJiB0QXR0YWNobWVudC5sZWZ0ID09PSAncmlnaHQnKSB7XG4gICAgICAgICAgaWYgKGVBdHRhY2htZW50LmxlZnQgPT09ICdsZWZ0Jykge1xuICAgICAgICAgICAgbGVmdCAtPSB0YXJnZXRXaWR0aDtcbiAgICAgICAgICAgIHRBdHRhY2htZW50LmxlZnQgPSAnbGVmdCc7XG5cbiAgICAgICAgICAgIGxlZnQgLT0gd2lkdGg7XG4gICAgICAgICAgICBlQXR0YWNobWVudC5sZWZ0ID0gJ3JpZ2h0JztcbiAgICAgICAgICB9IGVsc2UgaWYgKGVBdHRhY2htZW50LmxlZnQgPT09ICdyaWdodCcpIHtcbiAgICAgICAgICAgIGxlZnQgLT0gdGFyZ2V0V2lkdGg7XG4gICAgICAgICAgICB0QXR0YWNobWVudC5sZWZ0ID0gJ2xlZnQnO1xuXG4gICAgICAgICAgICBsZWZ0ICs9IHdpZHRoO1xuICAgICAgICAgICAgZUF0dGFjaG1lbnQubGVmdCA9ICdsZWZ0JztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodEF0dGFjaG1lbnQubGVmdCA9PT0gJ2NlbnRlcicpIHtcbiAgICAgICAgICBpZiAobGVmdCArIHdpZHRoID4gYm91bmRzWzJdICYmIGVBdHRhY2htZW50LmxlZnQgPT09ICdsZWZ0Jykge1xuICAgICAgICAgICAgbGVmdCAtPSB3aWR0aDtcbiAgICAgICAgICAgIGVBdHRhY2htZW50LmxlZnQgPSAncmlnaHQnO1xuICAgICAgICAgIH0gZWxzZSBpZiAobGVmdCA8IGJvdW5kc1swXSAmJiBlQXR0YWNobWVudC5sZWZ0ID09PSAncmlnaHQnKSB7XG4gICAgICAgICAgICBsZWZ0ICs9IHdpZHRoO1xuICAgICAgICAgICAgZUF0dGFjaG1lbnQubGVmdCA9ICdsZWZ0JztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGNoYW5nZUF0dGFjaFkgPT09ICdlbGVtZW50JyB8fCBjaGFuZ2VBdHRhY2hZID09PSAnYm90aCcpIHtcbiAgICAgICAgaWYgKHRvcCA8IGJvdW5kc1sxXSAmJiBlQXR0YWNobWVudC50b3AgPT09ICdib3R0b20nKSB7XG4gICAgICAgICAgdG9wICs9IGhlaWdodDtcbiAgICAgICAgICBlQXR0YWNobWVudC50b3AgPSAndG9wJztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b3AgKyBoZWlnaHQgPiBib3VuZHNbM10gJiYgZUF0dGFjaG1lbnQudG9wID09PSAndG9wJykge1xuICAgICAgICAgIHRvcCAtPSBoZWlnaHQ7XG4gICAgICAgICAgZUF0dGFjaG1lbnQudG9wID0gJ2JvdHRvbSc7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGNoYW5nZUF0dGFjaFggPT09ICdlbGVtZW50JyB8fCBjaGFuZ2VBdHRhY2hYID09PSAnYm90aCcpIHtcbiAgICAgICAgaWYgKGxlZnQgPCBib3VuZHNbMF0pIHtcbiAgICAgICAgICBpZiAoZUF0dGFjaG1lbnQubGVmdCA9PT0gJ3JpZ2h0Jykge1xuICAgICAgICAgICAgbGVmdCArPSB3aWR0aDtcbiAgICAgICAgICAgIGVBdHRhY2htZW50LmxlZnQgPSAnbGVmdCc7XG4gICAgICAgICAgfSBlbHNlIGlmIChlQXR0YWNobWVudC5sZWZ0ID09PSAnY2VudGVyJykge1xuICAgICAgICAgICAgbGVmdCArPSB3aWR0aCAvIDI7XG4gICAgICAgICAgICBlQXR0YWNobWVudC5sZWZ0ID0gJ2xlZnQnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsZWZ0ICsgd2lkdGggPiBib3VuZHNbMl0pIHtcbiAgICAgICAgICBpZiAoZUF0dGFjaG1lbnQubGVmdCA9PT0gJ2xlZnQnKSB7XG4gICAgICAgICAgICBsZWZ0IC09IHdpZHRoO1xuICAgICAgICAgICAgZUF0dGFjaG1lbnQubGVmdCA9ICdyaWdodCc7XG4gICAgICAgICAgfSBlbHNlIGlmIChlQXR0YWNobWVudC5sZWZ0ID09PSAnY2VudGVyJykge1xuICAgICAgICAgICAgbGVmdCAtPSB3aWR0aCAvIDI7XG4gICAgICAgICAgICBlQXR0YWNobWVudC5sZWZ0ID0gJ3JpZ2h0JztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBwaW4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBpbiA9IHBpbi5zcGxpdCgnLCcpLm1hcChmdW5jdGlvbiAocCkge1xuICAgICAgICAgIHJldHVybiBwLnRyaW0oKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKHBpbiA9PT0gdHJ1ZSkge1xuICAgICAgICBwaW4gPSBbJ3RvcCcsICdsZWZ0JywgJ3JpZ2h0JywgJ2JvdHRvbSddO1xuICAgICAgfVxuXG4gICAgICBwaW4gPSBwaW4gfHwgW107XG5cbiAgICAgIHZhciBwaW5uZWQgPSBbXTtcbiAgICAgIHZhciBvb2IgPSBbXTtcblxuICAgICAgaWYgKHRvcCA8IGJvdW5kc1sxXSkge1xuICAgICAgICBpZiAocGluLmluZGV4T2YoJ3RvcCcpID49IDApIHtcbiAgICAgICAgICB0b3AgPSBib3VuZHNbMV07XG4gICAgICAgICAgcGlubmVkLnB1c2goJ3RvcCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG9vYi5wdXNoKCd0b3AnKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAodG9wICsgaGVpZ2h0ID4gYm91bmRzWzNdKSB7XG4gICAgICAgIGlmIChwaW4uaW5kZXhPZignYm90dG9tJykgPj0gMCkge1xuICAgICAgICAgIHRvcCA9IGJvdW5kc1szXSAtIGhlaWdodDtcbiAgICAgICAgICBwaW5uZWQucHVzaCgnYm90dG9tJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb29iLnB1c2goJ2JvdHRvbScpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChsZWZ0IDwgYm91bmRzWzBdKSB7XG4gICAgICAgIGlmIChwaW4uaW5kZXhPZignbGVmdCcpID49IDApIHtcbiAgICAgICAgICBsZWZ0ID0gYm91bmRzWzBdO1xuICAgICAgICAgIHBpbm5lZC5wdXNoKCdsZWZ0Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb29iLnB1c2goJ2xlZnQnKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAobGVmdCArIHdpZHRoID4gYm91bmRzWzJdKSB7XG4gICAgICAgIGlmIChwaW4uaW5kZXhPZigncmlnaHQnKSA+PSAwKSB7XG4gICAgICAgICAgbGVmdCA9IGJvdW5kc1syXSAtIHdpZHRoO1xuICAgICAgICAgIHBpbm5lZC5wdXNoKCdyaWdodCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG9vYi5wdXNoKCdyaWdodCcpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChwaW5uZWQubGVuZ3RoKSB7XG4gICAgICAgIChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIHBpbm5lZENsYXNzID0gdW5kZWZpbmVkO1xuICAgICAgICAgIGlmICh0eXBlb2YgX3RoaXMub3B0aW9ucy5waW5uZWRDbGFzcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHBpbm5lZENsYXNzID0gX3RoaXMub3B0aW9ucy5waW5uZWRDbGFzcztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGlubmVkQ2xhc3MgPSBfdGhpcy5nZXRDbGFzcygncGlubmVkJyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYWRkQ2xhc3Nlcy5wdXNoKHBpbm5lZENsYXNzKTtcbiAgICAgICAgICBwaW5uZWQuZm9yRWFjaChmdW5jdGlvbiAoc2lkZSkge1xuICAgICAgICAgICAgYWRkQ2xhc3Nlcy5wdXNoKHBpbm5lZENsYXNzICsgJy0nICsgc2lkZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pKCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChvb2IubGVuZ3RoKSB7XG4gICAgICAgIChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIG9vYkNsYXNzID0gdW5kZWZpbmVkO1xuICAgICAgICAgIGlmICh0eXBlb2YgX3RoaXMub3B0aW9ucy5vdXRPZkJvdW5kc0NsYXNzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgb29iQ2xhc3MgPSBfdGhpcy5vcHRpb25zLm91dE9mQm91bmRzQ2xhc3M7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9vYkNsYXNzID0gX3RoaXMuZ2V0Q2xhc3MoJ291dC1vZi1ib3VuZHMnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBhZGRDbGFzc2VzLnB1c2gob29iQ2xhc3MpO1xuICAgICAgICAgIG9vYi5mb3JFYWNoKGZ1bmN0aW9uIChzaWRlKSB7XG4gICAgICAgICAgICBhZGRDbGFzc2VzLnB1c2gob29iQ2xhc3MgKyAnLScgKyBzaWRlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSkoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBpbm5lZC5pbmRleE9mKCdsZWZ0JykgPj0gMCB8fCBwaW5uZWQuaW5kZXhPZigncmlnaHQnKSA+PSAwKSB7XG4gICAgICAgIGVBdHRhY2htZW50LmxlZnQgPSB0QXR0YWNobWVudC5sZWZ0ID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAocGlubmVkLmluZGV4T2YoJ3RvcCcpID49IDAgfHwgcGlubmVkLmluZGV4T2YoJ2JvdHRvbScpID49IDApIHtcbiAgICAgICAgZUF0dGFjaG1lbnQudG9wID0gdEF0dGFjaG1lbnQudG9wID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGlmICh0QXR0YWNobWVudC50b3AgIT09IHRhcmdldEF0dGFjaG1lbnQudG9wIHx8IHRBdHRhY2htZW50LmxlZnQgIT09IHRhcmdldEF0dGFjaG1lbnQubGVmdCB8fCBlQXR0YWNobWVudC50b3AgIT09IF90aGlzLmF0dGFjaG1lbnQudG9wIHx8IGVBdHRhY2htZW50LmxlZnQgIT09IF90aGlzLmF0dGFjaG1lbnQubGVmdCkge1xuICAgICAgICBfdGhpcy51cGRhdGVBdHRhY2hDbGFzc2VzKGVBdHRhY2htZW50LCB0QXR0YWNobWVudCk7XG4gICAgICAgIF90aGlzLnRyaWdnZXIoJ3VwZGF0ZScsIHtcbiAgICAgICAgICBhdHRhY2htZW50OiBlQXR0YWNobWVudCxcbiAgICAgICAgICB0YXJnZXRBdHRhY2htZW50OiB0QXR0YWNobWVudFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGRlZmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghKF90aGlzLm9wdGlvbnMuYWRkVGFyZ2V0Q2xhc3NlcyA9PT0gZmFsc2UpKSB7XG4gICAgICAgIHVwZGF0ZUNsYXNzZXMoX3RoaXMudGFyZ2V0LCBhZGRDbGFzc2VzLCBhbGxDbGFzc2VzKTtcbiAgICAgIH1cbiAgICAgIHVwZGF0ZUNsYXNzZXMoX3RoaXMuZWxlbWVudCwgYWRkQ2xhc3NlcywgYWxsQ2xhc3Nlcyk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4geyB0b3A6IHRvcCwgbGVmdDogbGVmdCB9O1xuICB9XG59KTtcbi8qIGdsb2JhbHMgVGV0aGVyQmFzZSAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfVGV0aGVyQmFzZSRVdGlscyA9IFRldGhlckJhc2UuVXRpbHM7XG52YXIgZ2V0Qm91bmRzID0gX1RldGhlckJhc2UkVXRpbHMuZ2V0Qm91bmRzO1xudmFyIHVwZGF0ZUNsYXNzZXMgPSBfVGV0aGVyQmFzZSRVdGlscy51cGRhdGVDbGFzc2VzO1xudmFyIGRlZmVyID0gX1RldGhlckJhc2UkVXRpbHMuZGVmZXI7XG5cblRldGhlckJhc2UubW9kdWxlcy5wdXNoKHtcbiAgcG9zaXRpb246IGZ1bmN0aW9uIHBvc2l0aW9uKF9yZWYpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdmFyIHRvcCA9IF9yZWYudG9wO1xuICAgIHZhciBsZWZ0ID0gX3JlZi5sZWZ0O1xuXG4gICAgdmFyIF9jYWNoZSA9IHRoaXMuY2FjaGUoJ2VsZW1lbnQtYm91bmRzJywgZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIGdldEJvdW5kcyhfdGhpcy5lbGVtZW50KTtcbiAgICB9KTtcblxuICAgIHZhciBoZWlnaHQgPSBfY2FjaGUuaGVpZ2h0O1xuICAgIHZhciB3aWR0aCA9IF9jYWNoZS53aWR0aDtcblxuICAgIHZhciB0YXJnZXRQb3MgPSB0aGlzLmdldFRhcmdldEJvdW5kcygpO1xuXG4gICAgdmFyIGJvdHRvbSA9IHRvcCArIGhlaWdodDtcbiAgICB2YXIgcmlnaHQgPSBsZWZ0ICsgd2lkdGg7XG5cbiAgICB2YXIgYWJ1dHRlZCA9IFtdO1xuICAgIGlmICh0b3AgPD0gdGFyZ2V0UG9zLmJvdHRvbSAmJiBib3R0b20gPj0gdGFyZ2V0UG9zLnRvcCkge1xuICAgICAgWydsZWZ0JywgJ3JpZ2h0J10uZm9yRWFjaChmdW5jdGlvbiAoc2lkZSkge1xuICAgICAgICB2YXIgdGFyZ2V0UG9zU2lkZSA9IHRhcmdldFBvc1tzaWRlXTtcbiAgICAgICAgaWYgKHRhcmdldFBvc1NpZGUgPT09IGxlZnQgfHwgdGFyZ2V0UG9zU2lkZSA9PT0gcmlnaHQpIHtcbiAgICAgICAgICBhYnV0dGVkLnB1c2goc2lkZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChsZWZ0IDw9IHRhcmdldFBvcy5yaWdodCAmJiByaWdodCA+PSB0YXJnZXRQb3MubGVmdCkge1xuICAgICAgWyd0b3AnLCAnYm90dG9tJ10uZm9yRWFjaChmdW5jdGlvbiAoc2lkZSkge1xuICAgICAgICB2YXIgdGFyZ2V0UG9zU2lkZSA9IHRhcmdldFBvc1tzaWRlXTtcbiAgICAgICAgaWYgKHRhcmdldFBvc1NpZGUgPT09IHRvcCB8fCB0YXJnZXRQb3NTaWRlID09PSBib3R0b20pIHtcbiAgICAgICAgICBhYnV0dGVkLnB1c2goc2lkZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHZhciBhbGxDbGFzc2VzID0gW107XG4gICAgdmFyIGFkZENsYXNzZXMgPSBbXTtcblxuICAgIHZhciBzaWRlcyA9IFsnbGVmdCcsICd0b3AnLCAncmlnaHQnLCAnYm90dG9tJ107XG4gICAgYWxsQ2xhc3Nlcy5wdXNoKHRoaXMuZ2V0Q2xhc3MoJ2FidXR0ZWQnKSk7XG4gICAgc2lkZXMuZm9yRWFjaChmdW5jdGlvbiAoc2lkZSkge1xuICAgICAgYWxsQ2xhc3Nlcy5wdXNoKF90aGlzLmdldENsYXNzKCdhYnV0dGVkJykgKyAnLScgKyBzaWRlKTtcbiAgICB9KTtcblxuICAgIGlmIChhYnV0dGVkLmxlbmd0aCkge1xuICAgICAgYWRkQ2xhc3Nlcy5wdXNoKHRoaXMuZ2V0Q2xhc3MoJ2FidXR0ZWQnKSk7XG4gICAgfVxuXG4gICAgYWJ1dHRlZC5mb3JFYWNoKGZ1bmN0aW9uIChzaWRlKSB7XG4gICAgICBhZGRDbGFzc2VzLnB1c2goX3RoaXMuZ2V0Q2xhc3MoJ2FidXR0ZWQnKSArICctJyArIHNpZGUpO1xuICAgIH0pO1xuXG4gICAgZGVmZXIoZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCEoX3RoaXMub3B0aW9ucy5hZGRUYXJnZXRDbGFzc2VzID09PSBmYWxzZSkpIHtcbiAgICAgICAgdXBkYXRlQ2xhc3NlcyhfdGhpcy50YXJnZXQsIGFkZENsYXNzZXMsIGFsbENsYXNzZXMpO1xuICAgICAgfVxuICAgICAgdXBkYXRlQ2xhc3NlcyhfdGhpcy5lbGVtZW50LCBhZGRDbGFzc2VzLCBhbGxDbGFzc2VzKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB0cnVlO1xuICB9XG59KTtcbi8qIGdsb2JhbHMgVGV0aGVyQmFzZSAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfc2xpY2VkVG9BcnJheSA9IChmdW5jdGlvbiAoKSB7IGZ1bmN0aW9uIHNsaWNlSXRlcmF0b3IoYXJyLCBpKSB7IHZhciBfYXJyID0gW107IHZhciBfbiA9IHRydWU7IHZhciBfZCA9IGZhbHNlOyB2YXIgX2UgPSB1bmRlZmluZWQ7IHRyeSB7IGZvciAodmFyIF9pID0gYXJyW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3M7ICEoX24gPSAoX3MgPSBfaS5uZXh0KCkpLmRvbmUpOyBfbiA9IHRydWUpIHsgX2Fyci5wdXNoKF9zLnZhbHVlKTsgaWYgKGkgJiYgX2Fyci5sZW5ndGggPT09IGkpIGJyZWFrOyB9IH0gY2F0Y2ggKGVycikgeyBfZCA9IHRydWU7IF9lID0gZXJyOyB9IGZpbmFsbHkgeyB0cnkgeyBpZiAoIV9uICYmIF9pWydyZXR1cm4nXSkgX2lbJ3JldHVybiddKCk7IH0gZmluYWxseSB7IGlmIChfZCkgdGhyb3cgX2U7IH0gfSByZXR1cm4gX2FycjsgfSByZXR1cm4gZnVuY3Rpb24gKGFyciwgaSkgeyBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7IHJldHVybiBhcnI7IH0gZWxzZSBpZiAoU3ltYm9sLml0ZXJhdG9yIGluIE9iamVjdChhcnIpKSB7IHJldHVybiBzbGljZUl0ZXJhdG9yKGFyciwgaSk7IH0gZWxzZSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgYXR0ZW1wdCB0byBkZXN0cnVjdHVyZSBub24taXRlcmFibGUgaW5zdGFuY2UnKTsgfSB9OyB9KSgpO1xuXG5UZXRoZXJCYXNlLm1vZHVsZXMucHVzaCh7XG4gIHBvc2l0aW9uOiBmdW5jdGlvbiBwb3NpdGlvbihfcmVmKSB7XG4gICAgdmFyIHRvcCA9IF9yZWYudG9wO1xuICAgIHZhciBsZWZ0ID0gX3JlZi5sZWZ0O1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuc2hpZnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc2hpZnQgPSB0aGlzLm9wdGlvbnMuc2hpZnQ7XG4gICAgaWYgKHR5cGVvZiB0aGlzLm9wdGlvbnMuc2hpZnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHNoaWZ0ID0gdGhpcy5vcHRpb25zLnNoaWZ0LmNhbGwodGhpcywgeyB0b3A6IHRvcCwgbGVmdDogbGVmdCB9KTtcbiAgICB9XG5cbiAgICB2YXIgc2hpZnRUb3AgPSB1bmRlZmluZWQsXG4gICAgICAgIHNoaWZ0TGVmdCA9IHVuZGVmaW5lZDtcbiAgICBpZiAodHlwZW9mIHNoaWZ0ID09PSAnc3RyaW5nJykge1xuICAgICAgc2hpZnQgPSBzaGlmdC5zcGxpdCgnICcpO1xuICAgICAgc2hpZnRbMV0gPSBzaGlmdFsxXSB8fCBzaGlmdFswXTtcblxuICAgICAgdmFyIF9zaGlmdCA9IHNoaWZ0O1xuXG4gICAgICB2YXIgX3NoaWZ0MiA9IF9zbGljZWRUb0FycmF5KF9zaGlmdCwgMik7XG5cbiAgICAgIHNoaWZ0VG9wID0gX3NoaWZ0MlswXTtcbiAgICAgIHNoaWZ0TGVmdCA9IF9zaGlmdDJbMV07XG5cbiAgICAgIHNoaWZ0VG9wID0gcGFyc2VGbG9hdChzaGlmdFRvcCwgMTApO1xuICAgICAgc2hpZnRMZWZ0ID0gcGFyc2VGbG9hdChzaGlmdExlZnQsIDEwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2hpZnRUb3AgPSBzaGlmdC50b3A7XG4gICAgICBzaGlmdExlZnQgPSBzaGlmdC5sZWZ0O1xuICAgIH1cblxuICAgIHRvcCArPSBzaGlmdFRvcDtcbiAgICBsZWZ0ICs9IHNoaWZ0TGVmdDtcblxuICAgIHJldHVybiB7IHRvcDogdG9wLCBsZWZ0OiBsZWZ0IH07XG4gIH1cbn0pO1xucmV0dXJuIFRldGhlcjtcblxufSkpO1xuIiwiLyohXG4gKiBCb290c3RyYXAgdjQuMC4wLWFscGhhLjYgKGh0dHBzOi8vZ2V0Ym9vdHN0cmFwLmNvbSlcbiAqIENvcHlyaWdodCAyMDExLTIwMTcgVGhlIEJvb3RzdHJhcCBBdXRob3JzIChodHRwczovL2dpdGh1Yi5jb20vdHdicy9ib290c3RyYXAvZ3JhcGhzL2NvbnRyaWJ1dG9ycylcbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL3R3YnMvYm9vdHN0cmFwL2Jsb2IvbWFzdGVyL0xJQ0VOU0UpXG4gKi9cblxuaWYgKHR5cGVvZiBqUXVlcnkgPT09ICd1bmRlZmluZWQnKSB7XG4gIHRocm93IG5ldyBFcnJvcignQm9vdHN0cmFwXFwncyBKYXZhU2NyaXB0IHJlcXVpcmVzIGpRdWVyeS4galF1ZXJ5IG11c3QgYmUgaW5jbHVkZWQgYmVmb3JlIEJvb3RzdHJhcFxcJ3MgSmF2YVNjcmlwdC4nKVxufVxuXG4rZnVuY3Rpb24gKCQpIHtcbiAgdmFyIHZlcnNpb24gPSAkLmZuLmpxdWVyeS5zcGxpdCgnICcpWzBdLnNwbGl0KCcuJylcbiAgaWYgKCh2ZXJzaW9uWzBdIDwgMiAmJiB2ZXJzaW9uWzFdIDwgOSkgfHwgKHZlcnNpb25bMF0gPT0gMSAmJiB2ZXJzaW9uWzFdID09IDkgJiYgdmVyc2lvblsyXSA8IDEpIHx8ICh2ZXJzaW9uWzBdID49IDQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCb290c3RyYXBcXCdzIEphdmFTY3JpcHQgcmVxdWlyZXMgYXQgbGVhc3QgalF1ZXJ5IHYxLjkuMSBidXQgbGVzcyB0aGFuIHY0LjAuMCcpXG4gIH1cbn0oalF1ZXJ5KTtcblxuXG4rZnVuY3Rpb24gKCkge1xuXG52YXIgX3R5cGVvZiA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiID8gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfSA6IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07XG5cbnZhciBfY3JlYXRlQ2xhc3MgPSBmdW5jdGlvbiAoKSB7IGZ1bmN0aW9uIGRlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfSByZXR1cm4gZnVuY3Rpb24gKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTsgcmV0dXJuIENvbnN0cnVjdG9yOyB9OyB9KCk7XG5cbmZ1bmN0aW9uIF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHNlbGYsIGNhbGwpIHsgaWYgKCFzZWxmKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gY2FsbCAmJiAodHlwZW9mIGNhbGwgPT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIGNhbGwgPT09IFwiZnVuY3Rpb25cIikgPyBjYWxsIDogc2VsZjsgfVxuXG5mdW5jdGlvbiBfaW5oZXJpdHMoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHsgaWYgKHR5cGVvZiBzdXBlckNsYXNzICE9PSBcImZ1bmN0aW9uXCIgJiYgc3VwZXJDbGFzcyAhPT0gbnVsbCkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb24sIG5vdCBcIiArIHR5cGVvZiBzdXBlckNsYXNzKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCBlbnVtZXJhYmxlOiBmYWxzZSwgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH0pOyBpZiAoc3VwZXJDbGFzcykgT2JqZWN0LnNldFByb3RvdHlwZU9mID8gT2JqZWN0LnNldFByb3RvdHlwZU9mKHN1YkNsYXNzLCBzdXBlckNsYXNzKSA6IHN1YkNsYXNzLl9fcHJvdG9fXyA9IHN1cGVyQ2xhc3M7IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxuLyoqXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogQm9vdHN0cmFwICh2NC4wLjAtYWxwaGEuNik6IHV0aWwuanNcbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL3R3YnMvYm9vdHN0cmFwL2Jsb2IvbWFzdGVyL0xJQ0VOU0UpXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICovXG5cbnZhciBVdGlsID0gZnVuY3Rpb24gKCQpIHtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIFByaXZhdGUgVHJhbnNpdGlvbkVuZCBIZWxwZXJzXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgdHJhbnNpdGlvbiA9IGZhbHNlO1xuXG4gIHZhciBNQVhfVUlEID0gMTAwMDAwMDtcblxuICB2YXIgVHJhbnNpdGlvbkVuZEV2ZW50ID0ge1xuICAgIFdlYmtpdFRyYW5zaXRpb246ICd3ZWJraXRUcmFuc2l0aW9uRW5kJyxcbiAgICBNb3pUcmFuc2l0aW9uOiAndHJhbnNpdGlvbmVuZCcsXG4gICAgT1RyYW5zaXRpb246ICdvVHJhbnNpdGlvbkVuZCBvdHJhbnNpdGlvbmVuZCcsXG4gICAgdHJhbnNpdGlvbjogJ3RyYW5zaXRpb25lbmQnXG4gIH07XG5cbiAgLy8gc2hvdXRvdXQgQW5ndXNDcm9sbCAoaHR0cHM6Ly9nb28uZ2wvcHh3UUdwKVxuICBmdW5jdGlvbiB0b1R5cGUob2JqKSB7XG4gICAgcmV0dXJuIHt9LnRvU3RyaW5nLmNhbGwob2JqKS5tYXRjaCgvXFxzKFthLXpBLVpdKykvKVsxXS50b0xvd2VyQ2FzZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNFbGVtZW50KG9iaikge1xuICAgIHJldHVybiAob2JqWzBdIHx8IG9iaikubm9kZVR5cGU7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRTcGVjaWFsVHJhbnNpdGlvbkVuZEV2ZW50KCkge1xuICAgIHJldHVybiB7XG4gICAgICBiaW5kVHlwZTogdHJhbnNpdGlvbi5lbmQsXG4gICAgICBkZWxlZ2F0ZVR5cGU6IHRyYW5zaXRpb24uZW5kLFxuICAgICAgaGFuZGxlOiBmdW5jdGlvbiBoYW5kbGUoZXZlbnQpIHtcbiAgICAgICAgaWYgKCQoZXZlbnQudGFyZ2V0KS5pcyh0aGlzKSkge1xuICAgICAgICAgIHJldHVybiBldmVudC5oYW5kbGVPYmouaGFuZGxlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIHByZWZlci1yZXN0LXBhcmFtc1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25FbmRUZXN0KCkge1xuICAgIGlmICh3aW5kb3cuUVVuaXQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdib290c3RyYXAnKTtcblxuICAgIGZvciAodmFyIG5hbWUgaW4gVHJhbnNpdGlvbkVuZEV2ZW50KSB7XG4gICAgICBpZiAoZWwuc3R5bGVbbmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGVuZDogVHJhbnNpdGlvbkVuZEV2ZW50W25hbWVdXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbkVuZEVtdWxhdG9yKGR1cmF0aW9uKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHZhciBjYWxsZWQgPSBmYWxzZTtcblxuICAgICQodGhpcykub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGNhbGxlZCA9IHRydWU7XG4gICAgfSk7XG5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghY2FsbGVkKSB7XG4gICAgICAgIFV0aWwudHJpZ2dlclRyYW5zaXRpb25FbmQoX3RoaXMpO1xuICAgICAgfVxuICAgIH0sIGR1cmF0aW9uKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0VHJhbnNpdGlvbkVuZFN1cHBvcnQoKSB7XG4gICAgdHJhbnNpdGlvbiA9IHRyYW5zaXRpb25FbmRUZXN0KCk7XG5cbiAgICAkLmZuLmVtdWxhdGVUcmFuc2l0aW9uRW5kID0gdHJhbnNpdGlvbkVuZEVtdWxhdG9yO1xuXG4gICAgaWYgKFV0aWwuc3VwcG9ydHNUcmFuc2l0aW9uRW5kKCkpIHtcbiAgICAgICQuZXZlbnQuc3BlY2lhbFtVdGlsLlRSQU5TSVRJT05fRU5EXSA9IGdldFNwZWNpYWxUcmFuc2l0aW9uRW5kRXZlbnQoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogUHVibGljIFV0aWwgQXBpXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBVdGlsID0ge1xuXG4gICAgVFJBTlNJVElPTl9FTkQ6ICdic1RyYW5zaXRpb25FbmQnLFxuXG4gICAgZ2V0VUlEOiBmdW5jdGlvbiBnZXRVSUQocHJlZml4KSB7XG4gICAgICBkbyB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1iaXR3aXNlXG4gICAgICAgIHByZWZpeCArPSB+fihNYXRoLnJhbmRvbSgpICogTUFYX1VJRCk7IC8vIFwifn5cIiBhY3RzIGxpa2UgYSBmYXN0ZXIgTWF0aC5mbG9vcigpIGhlcmVcbiAgICAgIH0gd2hpbGUgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHByZWZpeCkpO1xuICAgICAgcmV0dXJuIHByZWZpeDtcbiAgICB9LFxuICAgIGdldFNlbGVjdG9yRnJvbUVsZW1lbnQ6IGZ1bmN0aW9uIGdldFNlbGVjdG9yRnJvbUVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgdmFyIHNlbGVjdG9yID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdGFyZ2V0Jyk7XG5cbiAgICAgIGlmICghc2VsZWN0b3IpIHtcbiAgICAgICAgc2VsZWN0b3IgPSBlbGVtZW50LmdldEF0dHJpYnV0ZSgnaHJlZicpIHx8ICcnO1xuICAgICAgICBzZWxlY3RvciA9IC9eI1thLXpdL2kudGVzdChzZWxlY3RvcikgPyBzZWxlY3RvciA6IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZWxlY3RvcjtcbiAgICB9LFxuICAgIHJlZmxvdzogZnVuY3Rpb24gcmVmbG93KGVsZW1lbnQpIHtcbiAgICAgIHJldHVybiBlbGVtZW50Lm9mZnNldEhlaWdodDtcbiAgICB9LFxuICAgIHRyaWdnZXJUcmFuc2l0aW9uRW5kOiBmdW5jdGlvbiB0cmlnZ2VyVHJhbnNpdGlvbkVuZChlbGVtZW50KSB7XG4gICAgICAkKGVsZW1lbnQpLnRyaWdnZXIodHJhbnNpdGlvbi5lbmQpO1xuICAgIH0sXG4gICAgc3VwcG9ydHNUcmFuc2l0aW9uRW5kOiBmdW5jdGlvbiBzdXBwb3J0c1RyYW5zaXRpb25FbmQoKSB7XG4gICAgICByZXR1cm4gQm9vbGVhbih0cmFuc2l0aW9uKTtcbiAgICB9LFxuICAgIHR5cGVDaGVja0NvbmZpZzogZnVuY3Rpb24gdHlwZUNoZWNrQ29uZmlnKGNvbXBvbmVudE5hbWUsIGNvbmZpZywgY29uZmlnVHlwZXMpIHtcbiAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIGNvbmZpZ1R5cGVzKSB7XG4gICAgICAgIGlmIChjb25maWdUeXBlcy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcbiAgICAgICAgICB2YXIgZXhwZWN0ZWRUeXBlcyA9IGNvbmZpZ1R5cGVzW3Byb3BlcnR5XTtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBjb25maWdbcHJvcGVydHldO1xuICAgICAgICAgIHZhciB2YWx1ZVR5cGUgPSB2YWx1ZSAmJiBpc0VsZW1lbnQodmFsdWUpID8gJ2VsZW1lbnQnIDogdG9UeXBlKHZhbHVlKTtcblxuICAgICAgICAgIGlmICghbmV3IFJlZ0V4cChleHBlY3RlZFR5cGVzKS50ZXN0KHZhbHVlVHlwZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihjb21wb25lbnROYW1lLnRvVXBwZXJDYXNlKCkgKyAnOiAnICsgKCdPcHRpb24gXCInICsgcHJvcGVydHkgKyAnXCIgcHJvdmlkZWQgdHlwZSBcIicgKyB2YWx1ZVR5cGUgKyAnXCIgJykgKyAoJ2J1dCBleHBlY3RlZCB0eXBlIFwiJyArIGV4cGVjdGVkVHlwZXMgKyAnXCIuJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBzZXRUcmFuc2l0aW9uRW5kU3VwcG9ydCgpO1xuXG4gIHJldHVybiBVdGlsO1xufShqUXVlcnkpO1xuXG4vKipcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBCb290c3RyYXAgKHY0LjAuMC1hbHBoYS42KTogYWxlcnQuanNcbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL3R3YnMvYm9vdHN0cmFwL2Jsb2IvbWFzdGVyL0xJQ0VOU0UpXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICovXG5cbnZhciBBbGVydCA9IGZ1bmN0aW9uICgkKSB7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FID0gJ2FsZXJ0JztcbiAgdmFyIFZFUlNJT04gPSAnNC4wLjAtYWxwaGEuNic7XG4gIHZhciBEQVRBX0tFWSA9ICdicy5hbGVydCc7XG4gIHZhciBFVkVOVF9LRVkgPSAnLicgKyBEQVRBX0tFWTtcbiAgdmFyIERBVEFfQVBJX0tFWSA9ICcuZGF0YS1hcGknO1xuICB2YXIgSlFVRVJZX05PX0NPTkZMSUNUID0gJC5mbltOQU1FXTtcbiAgdmFyIFRSQU5TSVRJT05fRFVSQVRJT04gPSAxNTA7XG5cbiAgdmFyIFNlbGVjdG9yID0ge1xuICAgIERJU01JU1M6ICdbZGF0YS1kaXNtaXNzPVwiYWxlcnRcIl0nXG4gIH07XG5cbiAgdmFyIEV2ZW50ID0ge1xuICAgIENMT1NFOiAnY2xvc2UnICsgRVZFTlRfS0VZLFxuICAgIENMT1NFRDogJ2Nsb3NlZCcgKyBFVkVOVF9LRVksXG4gICAgQ0xJQ0tfREFUQV9BUEk6ICdjbGljaycgKyBFVkVOVF9LRVkgKyBEQVRBX0FQSV9LRVlcbiAgfTtcblxuICB2YXIgQ2xhc3NOYW1lID0ge1xuICAgIEFMRVJUOiAnYWxlcnQnLFxuICAgIEZBREU6ICdmYWRlJyxcbiAgICBTSE9XOiAnc2hvdydcbiAgfTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIENsYXNzIERlZmluaXRpb25cbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBBbGVydCA9IGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBBbGVydChlbGVtZW50KSB7XG4gICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgQWxlcnQpO1xuXG4gICAgICB0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtcbiAgICB9XG5cbiAgICAvLyBnZXR0ZXJzXG5cbiAgICAvLyBwdWJsaWNcblxuICAgIEFsZXJ0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uIGNsb3NlKGVsZW1lbnQpIHtcbiAgICAgIGVsZW1lbnQgPSBlbGVtZW50IHx8IHRoaXMuX2VsZW1lbnQ7XG5cbiAgICAgIHZhciByb290RWxlbWVudCA9IHRoaXMuX2dldFJvb3RFbGVtZW50KGVsZW1lbnQpO1xuICAgICAgdmFyIGN1c3RvbUV2ZW50ID0gdGhpcy5fdHJpZ2dlckNsb3NlRXZlbnQocm9vdEVsZW1lbnQpO1xuXG4gICAgICBpZiAoY3VzdG9tRXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9yZW1vdmVFbGVtZW50KHJvb3RFbGVtZW50KTtcbiAgICB9O1xuXG4gICAgQWxlcnQucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgJC5yZW1vdmVEYXRhKHRoaXMuX2VsZW1lbnQsIERBVEFfS0VZKTtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgIH07XG5cbiAgICAvLyBwcml2YXRlXG5cbiAgICBBbGVydC5wcm90b3R5cGUuX2dldFJvb3RFbGVtZW50ID0gZnVuY3Rpb24gX2dldFJvb3RFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudChlbGVtZW50KTtcbiAgICAgIHZhciBwYXJlbnQgPSBmYWxzZTtcblxuICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgIHBhcmVudCA9ICQoc2VsZWN0b3IpWzBdO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXBhcmVudCkge1xuICAgICAgICBwYXJlbnQgPSAkKGVsZW1lbnQpLmNsb3Nlc3QoJy4nICsgQ2xhc3NOYW1lLkFMRVJUKVswXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHBhcmVudDtcbiAgICB9O1xuXG4gICAgQWxlcnQucHJvdG90eXBlLl90cmlnZ2VyQ2xvc2VFdmVudCA9IGZ1bmN0aW9uIF90cmlnZ2VyQ2xvc2VFdmVudChlbGVtZW50KSB7XG4gICAgICB2YXIgY2xvc2VFdmVudCA9ICQuRXZlbnQoRXZlbnQuQ0xPU0UpO1xuXG4gICAgICAkKGVsZW1lbnQpLnRyaWdnZXIoY2xvc2VFdmVudCk7XG4gICAgICByZXR1cm4gY2xvc2VFdmVudDtcbiAgICB9O1xuXG4gICAgQWxlcnQucHJvdG90eXBlLl9yZW1vdmVFbGVtZW50ID0gZnVuY3Rpb24gX3JlbW92ZUVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgICQoZWxlbWVudCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpO1xuXG4gICAgICBpZiAoIVV0aWwuc3VwcG9ydHNUcmFuc2l0aW9uRW5kKCkgfHwgISQoZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkZBREUpKSB7XG4gICAgICAgIHRoaXMuX2Rlc3Ryb3lFbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgICQoZWxlbWVudCkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICByZXR1cm4gX3RoaXMyLl9kZXN0cm95RWxlbWVudChlbGVtZW50LCBldmVudCk7XG4gICAgICB9KS5lbXVsYXRlVHJhbnNpdGlvbkVuZChUUkFOU0lUSU9OX0RVUkFUSU9OKTtcbiAgICB9O1xuXG4gICAgQWxlcnQucHJvdG90eXBlLl9kZXN0cm95RWxlbWVudCA9IGZ1bmN0aW9uIF9kZXN0cm95RWxlbWVudChlbGVtZW50KSB7XG4gICAgICAkKGVsZW1lbnQpLmRldGFjaCgpLnRyaWdnZXIoRXZlbnQuQ0xPU0VEKS5yZW1vdmUoKTtcbiAgICB9O1xuXG4gICAgLy8gc3RhdGljXG5cbiAgICBBbGVydC5falF1ZXJ5SW50ZXJmYWNlID0gZnVuY3Rpb24gX2pRdWVyeUludGVyZmFjZShjb25maWcpIHtcbiAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgJGVsZW1lbnQgPSAkKHRoaXMpO1xuICAgICAgICB2YXIgZGF0YSA9ICRlbGVtZW50LmRhdGEoREFUQV9LRVkpO1xuXG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIGRhdGEgPSBuZXcgQWxlcnQodGhpcyk7XG4gICAgICAgICAgJGVsZW1lbnQuZGF0YShEQVRBX0tFWSwgZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnID09PSAnY2xvc2UnKSB7XG4gICAgICAgICAgZGF0YVtjb25maWddKHRoaXMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgQWxlcnQuX2hhbmRsZURpc21pc3MgPSBmdW5jdGlvbiBfaGFuZGxlRGlzbWlzcyhhbGVydEluc3RhbmNlKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIGlmIChldmVudCkge1xuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBhbGVydEluc3RhbmNlLmNsb3NlKHRoaXMpO1xuICAgICAgfTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKEFsZXJ0LCBudWxsLCBbe1xuICAgICAga2V5OiAnVkVSU0lPTicsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIFZFUlNJT047XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIEFsZXJ0O1xuICB9KCk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgJChkb2N1bWVudCkub24oRXZlbnQuQ0xJQ0tfREFUQV9BUEksIFNlbGVjdG9yLkRJU01JU1MsIEFsZXJ0Ll9oYW5kbGVEaXNtaXNzKG5ldyBBbGVydCgpKSk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBqUXVlcnlcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gICQuZm5bTkFNRV0gPSBBbGVydC5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUVdLkNvbnN0cnVjdG9yID0gQWxlcnQ7XG4gICQuZm5bTkFNRV0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUVdID0gSlFVRVJZX05PX0NPTkZMSUNUO1xuICAgIHJldHVybiBBbGVydC5falF1ZXJ5SW50ZXJmYWNlO1xuICB9O1xuXG4gIHJldHVybiBBbGVydDtcbn0oalF1ZXJ5KTtcblxuLyoqXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogQm9vdHN0cmFwICh2NC4wLjAtYWxwaGEuNik6IGJ1dHRvbi5qc1xuICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vdHdicy9ib290c3RyYXAvYmxvYi9tYXN0ZXIvTElDRU5TRSlcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKi9cblxudmFyIEJ1dHRvbiA9IGZ1bmN0aW9uICgkKSB7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FID0gJ2J1dHRvbic7XG4gIHZhciBWRVJTSU9OID0gJzQuMC4wLWFscGhhLjYnO1xuICB2YXIgREFUQV9LRVkgPSAnYnMuYnV0dG9uJztcbiAgdmFyIEVWRU5UX0tFWSA9ICcuJyArIERBVEFfS0VZO1xuICB2YXIgREFUQV9BUElfS0VZID0gJy5kYXRhLWFwaSc7XG4gIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QgPSAkLmZuW05BTUVdO1xuXG4gIHZhciBDbGFzc05hbWUgPSB7XG4gICAgQUNUSVZFOiAnYWN0aXZlJyxcbiAgICBCVVRUT046ICdidG4nLFxuICAgIEZPQ1VTOiAnZm9jdXMnXG4gIH07XG5cbiAgdmFyIFNlbGVjdG9yID0ge1xuICAgIERBVEFfVE9HR0xFX0NBUlJPVDogJ1tkYXRhLXRvZ2dsZV49XCJidXR0b25cIl0nLFxuICAgIERBVEFfVE9HR0xFOiAnW2RhdGEtdG9nZ2xlPVwiYnV0dG9uc1wiXScsXG4gICAgSU5QVVQ6ICdpbnB1dCcsXG4gICAgQUNUSVZFOiAnLmFjdGl2ZScsXG4gICAgQlVUVE9OOiAnLmJ0bidcbiAgfTtcblxuICB2YXIgRXZlbnQgPSB7XG4gICAgQ0xJQ0tfREFUQV9BUEk6ICdjbGljaycgKyBFVkVOVF9LRVkgKyBEQVRBX0FQSV9LRVksXG4gICAgRk9DVVNfQkxVUl9EQVRBX0FQSTogJ2ZvY3VzJyArIEVWRU5UX0tFWSArIERBVEFfQVBJX0tFWSArICcgJyArICgnYmx1cicgKyBFVkVOVF9LRVkgKyBEQVRBX0FQSV9LRVkpXG4gIH07XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDbGFzcyBEZWZpbml0aW9uXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgQnV0dG9uID0gZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEJ1dHRvbihlbGVtZW50KSB7XG4gICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgQnV0dG9uKTtcblxuICAgICAgdGhpcy5fZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgfVxuXG4gICAgLy8gZ2V0dGVyc1xuXG4gICAgLy8gcHVibGljXG5cbiAgICBCdXR0b24ucHJvdG90eXBlLnRvZ2dsZSA9IGZ1bmN0aW9uIHRvZ2dsZSgpIHtcbiAgICAgIHZhciB0cmlnZ2VyQ2hhbmdlRXZlbnQgPSB0cnVlO1xuICAgICAgdmFyIHJvb3RFbGVtZW50ID0gJCh0aGlzLl9lbGVtZW50KS5jbG9zZXN0KFNlbGVjdG9yLkRBVEFfVE9HR0xFKVswXTtcblxuICAgICAgaWYgKHJvb3RFbGVtZW50KSB7XG4gICAgICAgIHZhciBpbnB1dCA9ICQodGhpcy5fZWxlbWVudCkuZmluZChTZWxlY3Rvci5JTlBVVClbMF07XG5cbiAgICAgICAgaWYgKGlucHV0KSB7XG4gICAgICAgICAgaWYgKGlucHV0LnR5cGUgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICAgIGlmIChpbnB1dC5jaGVja2VkICYmICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkFDVElWRSkpIHtcbiAgICAgICAgICAgICAgdHJpZ2dlckNoYW5nZUV2ZW50ID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB2YXIgYWN0aXZlRWxlbWVudCA9ICQocm9vdEVsZW1lbnQpLmZpbmQoU2VsZWN0b3IuQUNUSVZFKVswXTtcblxuICAgICAgICAgICAgICBpZiAoYWN0aXZlRWxlbWVudCkge1xuICAgICAgICAgICAgICAgICQoYWN0aXZlRWxlbWVudCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLkFDVElWRSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodHJpZ2dlckNoYW5nZUV2ZW50KSB7XG4gICAgICAgICAgICBpbnB1dC5jaGVja2VkID0gISQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkFDVElWRSk7XG4gICAgICAgICAgICAkKGlucHV0KS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpbnB1dC5mb2N1cygpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQuc2V0QXR0cmlidXRlKCdhcmlhLXByZXNzZWQnLCAhJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUuQUNUSVZFKSk7XG5cbiAgICAgIGlmICh0cmlnZ2VyQ2hhbmdlRXZlbnQpIHtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS50b2dnbGVDbGFzcyhDbGFzc05hbWUuQUNUSVZFKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgQnV0dG9uLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24gZGlzcG9zZSgpIHtcbiAgICAgICQucmVtb3ZlRGF0YSh0aGlzLl9lbGVtZW50LCBEQVRBX0tFWSk7XG4gICAgICB0aGlzLl9lbGVtZW50ID0gbnVsbDtcbiAgICB9O1xuXG4gICAgLy8gc3RhdGljXG5cbiAgICBCdXR0b24uX2pRdWVyeUludGVyZmFjZSA9IGZ1bmN0aW9uIF9qUXVlcnlJbnRlcmZhY2UoY29uZmlnKSB7XG4gICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSAkKHRoaXMpLmRhdGEoREFUQV9LRVkpO1xuXG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIGRhdGEgPSBuZXcgQnV0dG9uKHRoaXMpO1xuICAgICAgICAgICQodGhpcykuZGF0YShEQVRBX0tFWSwgZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnID09PSAndG9nZ2xlJykge1xuICAgICAgICAgIGRhdGFbY29uZmlnXSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKEJ1dHRvbiwgbnVsbCwgW3tcbiAgICAgIGtleTogJ1ZFUlNJT04nLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBWRVJTSU9OO1xuICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBCdXR0b247XG4gIH0oKTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIERhdGEgQXBpIGltcGxlbWVudGF0aW9uXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAkKGRvY3VtZW50KS5vbihFdmVudC5DTElDS19EQVRBX0FQSSwgU2VsZWN0b3IuREFUQV9UT0dHTEVfQ0FSUk9ULCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgdmFyIGJ1dHRvbiA9IGV2ZW50LnRhcmdldDtcblxuICAgIGlmICghJChidXR0b24pLmhhc0NsYXNzKENsYXNzTmFtZS5CVVRUT04pKSB7XG4gICAgICBidXR0b24gPSAkKGJ1dHRvbikuY2xvc2VzdChTZWxlY3Rvci5CVVRUT04pO1xuICAgIH1cblxuICAgIEJ1dHRvbi5falF1ZXJ5SW50ZXJmYWNlLmNhbGwoJChidXR0b24pLCAndG9nZ2xlJyk7XG4gIH0pLm9uKEV2ZW50LkZPQ1VTX0JMVVJfREFUQV9BUEksIFNlbGVjdG9yLkRBVEFfVE9HR0xFX0NBUlJPVCwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdmFyIGJ1dHRvbiA9ICQoZXZlbnQudGFyZ2V0KS5jbG9zZXN0KFNlbGVjdG9yLkJVVFRPTilbMF07XG4gICAgJChidXR0b24pLnRvZ2dsZUNsYXNzKENsYXNzTmFtZS5GT0NVUywgL15mb2N1cyhpbik/JC8udGVzdChldmVudC50eXBlKSk7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogalF1ZXJ5XG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAkLmZuW05BTUVdID0gQnV0dG9uLl9qUXVlcnlJbnRlcmZhY2U7XG4gICQuZm5bTkFNRV0uQ29uc3RydWN0b3IgPSBCdXR0b247XG4gICQuZm5bTkFNRV0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUVdID0gSlFVRVJZX05PX0NPTkZMSUNUO1xuICAgIHJldHVybiBCdXR0b24uX2pRdWVyeUludGVyZmFjZTtcbiAgfTtcblxuICByZXR1cm4gQnV0dG9uO1xufShqUXVlcnkpO1xuXG4vKipcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBCb290c3RyYXAgKHY0LjAuMC1hbHBoYS42KTogY2Fyb3VzZWwuanNcbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL3R3YnMvYm9vdHN0cmFwL2Jsb2IvbWFzdGVyL0xJQ0VOU0UpXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICovXG5cbnZhciBDYXJvdXNlbCA9IGZ1bmN0aW9uICgkKSB7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FID0gJ2Nhcm91c2VsJztcbiAgdmFyIFZFUlNJT04gPSAnNC4wLjAtYWxwaGEuNic7XG4gIHZhciBEQVRBX0tFWSA9ICdicy5jYXJvdXNlbCc7XG4gIHZhciBFVkVOVF9LRVkgPSAnLicgKyBEQVRBX0tFWTtcbiAgdmFyIERBVEFfQVBJX0tFWSA9ICcuZGF0YS1hcGknO1xuICB2YXIgSlFVRVJZX05PX0NPTkZMSUNUID0gJC5mbltOQU1FXTtcbiAgdmFyIFRSQU5TSVRJT05fRFVSQVRJT04gPSA2MDA7XG4gIHZhciBBUlJPV19MRUZUX0tFWUNPREUgPSAzNzsgLy8gS2V5Ym9hcmRFdmVudC53aGljaCB2YWx1ZSBmb3IgbGVmdCBhcnJvdyBrZXlcbiAgdmFyIEFSUk9XX1JJR0hUX0tFWUNPREUgPSAzOTsgLy8gS2V5Ym9hcmRFdmVudC53aGljaCB2YWx1ZSBmb3IgcmlnaHQgYXJyb3cga2V5XG5cbiAgdmFyIERlZmF1bHQgPSB7XG4gICAgaW50ZXJ2YWw6IDUwMDAsXG4gICAga2V5Ym9hcmQ6IHRydWUsXG4gICAgc2xpZGU6IGZhbHNlLFxuICAgIHBhdXNlOiAnaG92ZXInLFxuICAgIHdyYXA6IHRydWVcbiAgfTtcblxuICB2YXIgRGVmYXVsdFR5cGUgPSB7XG4gICAgaW50ZXJ2YWw6ICcobnVtYmVyfGJvb2xlYW4pJyxcbiAgICBrZXlib2FyZDogJ2Jvb2xlYW4nLFxuICAgIHNsaWRlOiAnKGJvb2xlYW58c3RyaW5nKScsXG4gICAgcGF1c2U6ICcoc3RyaW5nfGJvb2xlYW4pJyxcbiAgICB3cmFwOiAnYm9vbGVhbidcbiAgfTtcblxuICB2YXIgRGlyZWN0aW9uID0ge1xuICAgIE5FWFQ6ICduZXh0JyxcbiAgICBQUkVWOiAncHJldicsXG4gICAgTEVGVDogJ2xlZnQnLFxuICAgIFJJR0hUOiAncmlnaHQnXG4gIH07XG5cbiAgdmFyIEV2ZW50ID0ge1xuICAgIFNMSURFOiAnc2xpZGUnICsgRVZFTlRfS0VZLFxuICAgIFNMSUQ6ICdzbGlkJyArIEVWRU5UX0tFWSxcbiAgICBLRVlET1dOOiAna2V5ZG93bicgKyBFVkVOVF9LRVksXG4gICAgTU9VU0VFTlRFUjogJ21vdXNlZW50ZXInICsgRVZFTlRfS0VZLFxuICAgIE1PVVNFTEVBVkU6ICdtb3VzZWxlYXZlJyArIEVWRU5UX0tFWSxcbiAgICBMT0FEX0RBVEFfQVBJOiAnbG9hZCcgKyBFVkVOVF9LRVkgKyBEQVRBX0FQSV9LRVksXG4gICAgQ0xJQ0tfREFUQV9BUEk6ICdjbGljaycgKyBFVkVOVF9LRVkgKyBEQVRBX0FQSV9LRVlcbiAgfTtcblxuICB2YXIgQ2xhc3NOYW1lID0ge1xuICAgIENBUk9VU0VMOiAnY2Fyb3VzZWwnLFxuICAgIEFDVElWRTogJ2FjdGl2ZScsXG4gICAgU0xJREU6ICdzbGlkZScsXG4gICAgUklHSFQ6ICdjYXJvdXNlbC1pdGVtLXJpZ2h0JyxcbiAgICBMRUZUOiAnY2Fyb3VzZWwtaXRlbS1sZWZ0JyxcbiAgICBORVhUOiAnY2Fyb3VzZWwtaXRlbS1uZXh0JyxcbiAgICBQUkVWOiAnY2Fyb3VzZWwtaXRlbS1wcmV2JyxcbiAgICBJVEVNOiAnY2Fyb3VzZWwtaXRlbSdcbiAgfTtcblxuICB2YXIgU2VsZWN0b3IgPSB7XG4gICAgQUNUSVZFOiAnLmFjdGl2ZScsXG4gICAgQUNUSVZFX0lURU06ICcuYWN0aXZlLmNhcm91c2VsLWl0ZW0nLFxuICAgIElURU06ICcuY2Fyb3VzZWwtaXRlbScsXG4gICAgTkVYVF9QUkVWOiAnLmNhcm91c2VsLWl0ZW0tbmV4dCwgLmNhcm91c2VsLWl0ZW0tcHJldicsXG4gICAgSU5ESUNBVE9SUzogJy5jYXJvdXNlbC1pbmRpY2F0b3JzJyxcbiAgICBEQVRBX1NMSURFOiAnW2RhdGEtc2xpZGVdLCBbZGF0YS1zbGlkZS10b10nLFxuICAgIERBVEFfUklERTogJ1tkYXRhLXJpZGU9XCJjYXJvdXNlbFwiXSdcbiAgfTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIENsYXNzIERlZmluaXRpb25cbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBDYXJvdXNlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDYXJvdXNlbChlbGVtZW50LCBjb25maWcpIHtcbiAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBDYXJvdXNlbCk7XG5cbiAgICAgIHRoaXMuX2l0ZW1zID0gbnVsbDtcbiAgICAgIHRoaXMuX2ludGVydmFsID0gbnVsbDtcbiAgICAgIHRoaXMuX2FjdGl2ZUVsZW1lbnQgPSBudWxsO1xuXG4gICAgICB0aGlzLl9pc1BhdXNlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5faXNTbGlkaW5nID0gZmFsc2U7XG5cbiAgICAgIHRoaXMuX2NvbmZpZyA9IHRoaXMuX2dldENvbmZpZyhjb25maWcpO1xuICAgICAgdGhpcy5fZWxlbWVudCA9ICQoZWxlbWVudClbMF07XG4gICAgICB0aGlzLl9pbmRpY2F0b3JzRWxlbWVudCA9ICQodGhpcy5fZWxlbWVudCkuZmluZChTZWxlY3Rvci5JTkRJQ0FUT1JTKVswXTtcblxuICAgICAgdGhpcy5fYWRkRXZlbnRMaXN0ZW5lcnMoKTtcbiAgICB9XG5cbiAgICAvLyBnZXR0ZXJzXG5cbiAgICAvLyBwdWJsaWNcblxuICAgIENhcm91c2VsLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgIGlmICh0aGlzLl9pc1NsaWRpbmcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYXJvdXNlbCBpcyBzbGlkaW5nJyk7XG4gICAgICB9XG4gICAgICB0aGlzLl9zbGlkZShEaXJlY3Rpb24uTkVYVCk7XG4gICAgfTtcblxuICAgIENhcm91c2VsLnByb3RvdHlwZS5uZXh0V2hlblZpc2libGUgPSBmdW5jdGlvbiBuZXh0V2hlblZpc2libGUoKSB7XG4gICAgICAvLyBEb24ndCBjYWxsIG5leHQgd2hlbiB0aGUgcGFnZSBpc24ndCB2aXNpYmxlXG4gICAgICBpZiAoIWRvY3VtZW50LmhpZGRlbikge1xuICAgICAgICB0aGlzLm5leHQoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgQ2Fyb3VzZWwucHJvdG90eXBlLnByZXYgPSBmdW5jdGlvbiBwcmV2KCkge1xuICAgICAgaWYgKHRoaXMuX2lzU2xpZGluZykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhcm91c2VsIGlzIHNsaWRpbmcnKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3NsaWRlKERpcmVjdGlvbi5QUkVWSU9VUyk7XG4gICAgfTtcblxuICAgIENhcm91c2VsLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uIHBhdXNlKGV2ZW50KSB7XG4gICAgICBpZiAoIWV2ZW50KSB7XG4gICAgICAgIHRoaXMuX2lzUGF1c2VkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKCQodGhpcy5fZWxlbWVudCkuZmluZChTZWxlY3Rvci5ORVhUX1BSRVYpWzBdICYmIFV0aWwuc3VwcG9ydHNUcmFuc2l0aW9uRW5kKCkpIHtcbiAgICAgICAgVXRpbC50cmlnZ2VyVHJhbnNpdGlvbkVuZCh0aGlzLl9lbGVtZW50KTtcbiAgICAgICAgdGhpcy5jeWNsZSh0cnVlKTtcbiAgICAgIH1cblxuICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLl9pbnRlcnZhbCk7XG4gICAgICB0aGlzLl9pbnRlcnZhbCA9IG51bGw7XG4gICAgfTtcblxuICAgIENhcm91c2VsLnByb3RvdHlwZS5jeWNsZSA9IGZ1bmN0aW9uIGN5Y2xlKGV2ZW50KSB7XG4gICAgICBpZiAoIWV2ZW50KSB7XG4gICAgICAgIHRoaXMuX2lzUGF1c2VkID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9pbnRlcnZhbCkge1xuICAgICAgICBjbGVhckludGVydmFsKHRoaXMuX2ludGVydmFsKTtcbiAgICAgICAgdGhpcy5faW50ZXJ2YWwgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fY29uZmlnLmludGVydmFsICYmICF0aGlzLl9pc1BhdXNlZCkge1xuICAgICAgICB0aGlzLl9pbnRlcnZhbCA9IHNldEludGVydmFsKChkb2N1bWVudC52aXNpYmlsaXR5U3RhdGUgPyB0aGlzLm5leHRXaGVuVmlzaWJsZSA6IHRoaXMubmV4dCkuYmluZCh0aGlzKSwgdGhpcy5fY29uZmlnLmludGVydmFsKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgQ2Fyb3VzZWwucHJvdG90eXBlLnRvID0gZnVuY3Rpb24gdG8oaW5kZXgpIHtcbiAgICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG4gICAgICB0aGlzLl9hY3RpdmVFbGVtZW50ID0gJCh0aGlzLl9lbGVtZW50KS5maW5kKFNlbGVjdG9yLkFDVElWRV9JVEVNKVswXTtcblxuICAgICAgdmFyIGFjdGl2ZUluZGV4ID0gdGhpcy5fZ2V0SXRlbUluZGV4KHRoaXMuX2FjdGl2ZUVsZW1lbnQpO1xuXG4gICAgICBpZiAoaW5kZXggPiB0aGlzLl9pdGVtcy5sZW5ndGggLSAxIHx8IGluZGV4IDwgMCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9pc1NsaWRpbmcpIHtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbmUoRXZlbnQuU0xJRCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiBfdGhpczMudG8oaW5kZXgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoYWN0aXZlSW5kZXggPT09IGluZGV4KSB7XG4gICAgICAgIHRoaXMucGF1c2UoKTtcbiAgICAgICAgdGhpcy5jeWNsZSgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBkaXJlY3Rpb24gPSBpbmRleCA+IGFjdGl2ZUluZGV4ID8gRGlyZWN0aW9uLk5FWFQgOiBEaXJlY3Rpb24uUFJFVklPVVM7XG5cbiAgICAgIHRoaXMuX3NsaWRlKGRpcmVjdGlvbiwgdGhpcy5faXRlbXNbaW5kZXhdKTtcbiAgICB9O1xuXG4gICAgQ2Fyb3VzZWwucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS5vZmYoRVZFTlRfS0VZKTtcbiAgICAgICQucmVtb3ZlRGF0YSh0aGlzLl9lbGVtZW50LCBEQVRBX0tFWSk7XG5cbiAgICAgIHRoaXMuX2l0ZW1zID0gbnVsbDtcbiAgICAgIHRoaXMuX2NvbmZpZyA9IG51bGw7XG4gICAgICB0aGlzLl9lbGVtZW50ID0gbnVsbDtcbiAgICAgIHRoaXMuX2ludGVydmFsID0gbnVsbDtcbiAgICAgIHRoaXMuX2lzUGF1c2VkID0gbnVsbDtcbiAgICAgIHRoaXMuX2lzU2xpZGluZyA9IG51bGw7XG4gICAgICB0aGlzLl9hY3RpdmVFbGVtZW50ID0gbnVsbDtcbiAgICAgIHRoaXMuX2luZGljYXRvcnNFbGVtZW50ID0gbnVsbDtcbiAgICB9O1xuXG4gICAgLy8gcHJpdmF0ZVxuXG4gICAgQ2Fyb3VzZWwucHJvdG90eXBlLl9nZXRDb25maWcgPSBmdW5jdGlvbiBfZ2V0Q29uZmlnKGNvbmZpZykge1xuICAgICAgY29uZmlnID0gJC5leHRlbmQoe30sIERlZmF1bHQsIGNvbmZpZyk7XG4gICAgICBVdGlsLnR5cGVDaGVja0NvbmZpZyhOQU1FLCBjb25maWcsIERlZmF1bHRUeXBlKTtcbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfTtcblxuICAgIENhcm91c2VsLnByb3RvdHlwZS5fYWRkRXZlbnRMaXN0ZW5lcnMgPSBmdW5jdGlvbiBfYWRkRXZlbnRMaXN0ZW5lcnMoKSB7XG4gICAgICB2YXIgX3RoaXM0ID0gdGhpcztcblxuICAgICAgaWYgKHRoaXMuX2NvbmZpZy5rZXlib2FyZCkge1xuICAgICAgICAkKHRoaXMuX2VsZW1lbnQpLm9uKEV2ZW50LktFWURPV04sIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIHJldHVybiBfdGhpczQuX2tleWRvd24oZXZlbnQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2NvbmZpZy5wYXVzZSA9PT0gJ2hvdmVyJyAmJiAhKCdvbnRvdWNoc3RhcnQnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkpIHtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbihFdmVudC5NT1VTRUVOVEVSLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICByZXR1cm4gX3RoaXM0LnBhdXNlKGV2ZW50KTtcbiAgICAgICAgfSkub24oRXZlbnQuTU9VU0VMRUFWRSwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzNC5jeWNsZShldmVudCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBDYXJvdXNlbC5wcm90b3R5cGUuX2tleWRvd24gPSBmdW5jdGlvbiBfa2V5ZG93bihldmVudCkge1xuICAgICAgaWYgKC9pbnB1dHx0ZXh0YXJlYS9pLnRlc3QoZXZlbnQudGFyZ2V0LnRhZ05hbWUpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgc3dpdGNoIChldmVudC53aGljaCkge1xuICAgICAgICBjYXNlIEFSUk9XX0xFRlRfS0VZQ09ERTpcbiAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIHRoaXMucHJldigpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEFSUk9XX1JJR0hUX0tFWUNPREU6XG4gICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB0aGlzLm5leHQoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfTtcblxuICAgIENhcm91c2VsLnByb3RvdHlwZS5fZ2V0SXRlbUluZGV4ID0gZnVuY3Rpb24gX2dldEl0ZW1JbmRleChlbGVtZW50KSB7XG4gICAgICB0aGlzLl9pdGVtcyA9ICQubWFrZUFycmF5KCQoZWxlbWVudCkucGFyZW50KCkuZmluZChTZWxlY3Rvci5JVEVNKSk7XG4gICAgICByZXR1cm4gdGhpcy5faXRlbXMuaW5kZXhPZihlbGVtZW50KTtcbiAgICB9O1xuXG4gICAgQ2Fyb3VzZWwucHJvdG90eXBlLl9nZXRJdGVtQnlEaXJlY3Rpb24gPSBmdW5jdGlvbiBfZ2V0SXRlbUJ5RGlyZWN0aW9uKGRpcmVjdGlvbiwgYWN0aXZlRWxlbWVudCkge1xuICAgICAgdmFyIGlzTmV4dERpcmVjdGlvbiA9IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLk5FWFQ7XG4gICAgICB2YXIgaXNQcmV2RGlyZWN0aW9uID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUFJFVklPVVM7XG4gICAgICB2YXIgYWN0aXZlSW5kZXggPSB0aGlzLl9nZXRJdGVtSW5kZXgoYWN0aXZlRWxlbWVudCk7XG4gICAgICB2YXIgbGFzdEl0ZW1JbmRleCA9IHRoaXMuX2l0ZW1zLmxlbmd0aCAtIDE7XG4gICAgICB2YXIgaXNHb2luZ1RvV3JhcCA9IGlzUHJldkRpcmVjdGlvbiAmJiBhY3RpdmVJbmRleCA9PT0gMCB8fCBpc05leHREaXJlY3Rpb24gJiYgYWN0aXZlSW5kZXggPT09IGxhc3RJdGVtSW5kZXg7XG5cbiAgICAgIGlmIChpc0dvaW5nVG9XcmFwICYmICF0aGlzLl9jb25maWcud3JhcCkge1xuICAgICAgICByZXR1cm4gYWN0aXZlRWxlbWVudDtcbiAgICAgIH1cblxuICAgICAgdmFyIGRlbHRhID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUFJFVklPVVMgPyAtMSA6IDE7XG4gICAgICB2YXIgaXRlbUluZGV4ID0gKGFjdGl2ZUluZGV4ICsgZGVsdGEpICUgdGhpcy5faXRlbXMubGVuZ3RoO1xuXG4gICAgICByZXR1cm4gaXRlbUluZGV4ID09PSAtMSA/IHRoaXMuX2l0ZW1zW3RoaXMuX2l0ZW1zLmxlbmd0aCAtIDFdIDogdGhpcy5faXRlbXNbaXRlbUluZGV4XTtcbiAgICB9O1xuXG4gICAgQ2Fyb3VzZWwucHJvdG90eXBlLl90cmlnZ2VyU2xpZGVFdmVudCA9IGZ1bmN0aW9uIF90cmlnZ2VyU2xpZGVFdmVudChyZWxhdGVkVGFyZ2V0LCBldmVudERpcmVjdGlvbk5hbWUpIHtcbiAgICAgIHZhciBzbGlkZUV2ZW50ID0gJC5FdmVudChFdmVudC5TTElERSwge1xuICAgICAgICByZWxhdGVkVGFyZ2V0OiByZWxhdGVkVGFyZ2V0LFxuICAgICAgICBkaXJlY3Rpb246IGV2ZW50RGlyZWN0aW9uTmFtZVxuICAgICAgfSk7XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkudHJpZ2dlcihzbGlkZUV2ZW50KTtcblxuICAgICAgcmV0dXJuIHNsaWRlRXZlbnQ7XG4gICAgfTtcblxuICAgIENhcm91c2VsLnByb3RvdHlwZS5fc2V0QWN0aXZlSW5kaWNhdG9yRWxlbWVudCA9IGZ1bmN0aW9uIF9zZXRBY3RpdmVJbmRpY2F0b3JFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgIGlmICh0aGlzLl9pbmRpY2F0b3JzRWxlbWVudCkge1xuICAgICAgICAkKHRoaXMuX2luZGljYXRvcnNFbGVtZW50KS5maW5kKFNlbGVjdG9yLkFDVElWRSkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLkFDVElWRSk7XG5cbiAgICAgICAgdmFyIG5leHRJbmRpY2F0b3IgPSB0aGlzLl9pbmRpY2F0b3JzRWxlbWVudC5jaGlsZHJlblt0aGlzLl9nZXRJdGVtSW5kZXgoZWxlbWVudCldO1xuXG4gICAgICAgIGlmIChuZXh0SW5kaWNhdG9yKSB7XG4gICAgICAgICAgJChuZXh0SW5kaWNhdG9yKS5hZGRDbGFzcyhDbGFzc05hbWUuQUNUSVZFKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBDYXJvdXNlbC5wcm90b3R5cGUuX3NsaWRlID0gZnVuY3Rpb24gX3NsaWRlKGRpcmVjdGlvbiwgZWxlbWVudCkge1xuICAgICAgdmFyIF90aGlzNSA9IHRoaXM7XG5cbiAgICAgIHZhciBhY3RpdmVFbGVtZW50ID0gJCh0aGlzLl9lbGVtZW50KS5maW5kKFNlbGVjdG9yLkFDVElWRV9JVEVNKVswXTtcbiAgICAgIHZhciBuZXh0RWxlbWVudCA9IGVsZW1lbnQgfHwgYWN0aXZlRWxlbWVudCAmJiB0aGlzLl9nZXRJdGVtQnlEaXJlY3Rpb24oZGlyZWN0aW9uLCBhY3RpdmVFbGVtZW50KTtcblxuICAgICAgdmFyIGlzQ3ljbGluZyA9IEJvb2xlYW4odGhpcy5faW50ZXJ2YWwpO1xuXG4gICAgICB2YXIgZGlyZWN0aW9uYWxDbGFzc05hbWUgPSB2b2lkIDA7XG4gICAgICB2YXIgb3JkZXJDbGFzc05hbWUgPSB2b2lkIDA7XG4gICAgICB2YXIgZXZlbnREaXJlY3Rpb25OYW1lID0gdm9pZCAwO1xuXG4gICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTkVYVCkge1xuICAgICAgICBkaXJlY3Rpb25hbENsYXNzTmFtZSA9IENsYXNzTmFtZS5MRUZUO1xuICAgICAgICBvcmRlckNsYXNzTmFtZSA9IENsYXNzTmFtZS5ORVhUO1xuICAgICAgICBldmVudERpcmVjdGlvbk5hbWUgPSBEaXJlY3Rpb24uTEVGVDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRpcmVjdGlvbmFsQ2xhc3NOYW1lID0gQ2xhc3NOYW1lLlJJR0hUO1xuICAgICAgICBvcmRlckNsYXNzTmFtZSA9IENsYXNzTmFtZS5QUkVWO1xuICAgICAgICBldmVudERpcmVjdGlvbk5hbWUgPSBEaXJlY3Rpb24uUklHSFQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChuZXh0RWxlbWVudCAmJiAkKG5leHRFbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUuQUNUSVZFKSkge1xuICAgICAgICB0aGlzLl9pc1NsaWRpbmcgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgc2xpZGVFdmVudCA9IHRoaXMuX3RyaWdnZXJTbGlkZUV2ZW50KG5leHRFbGVtZW50LCBldmVudERpcmVjdGlvbk5hbWUpO1xuICAgICAgaWYgKHNsaWRlRXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWFjdGl2ZUVsZW1lbnQgfHwgIW5leHRFbGVtZW50KSB7XG4gICAgICAgIC8vIHNvbWUgd2VpcmRuZXNzIGlzIGhhcHBlbmluZywgc28gd2UgYmFpbFxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2lzU2xpZGluZyA9IHRydWU7XG5cbiAgICAgIGlmIChpc0N5Y2xpbmcpIHtcbiAgICAgICAgdGhpcy5wYXVzZSgpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9zZXRBY3RpdmVJbmRpY2F0b3JFbGVtZW50KG5leHRFbGVtZW50KTtcblxuICAgICAgdmFyIHNsaWRFdmVudCA9ICQuRXZlbnQoRXZlbnQuU0xJRCwge1xuICAgICAgICByZWxhdGVkVGFyZ2V0OiBuZXh0RWxlbWVudCxcbiAgICAgICAgZGlyZWN0aW9uOiBldmVudERpcmVjdGlvbk5hbWVcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoVXRpbC5zdXBwb3J0c1RyYW5zaXRpb25FbmQoKSAmJiAkKHRoaXMuX2VsZW1lbnQpLmhhc0NsYXNzKENsYXNzTmFtZS5TTElERSkpIHtcblxuICAgICAgICAkKG5leHRFbGVtZW50KS5hZGRDbGFzcyhvcmRlckNsYXNzTmFtZSk7XG5cbiAgICAgICAgVXRpbC5yZWZsb3cobmV4dEVsZW1lbnQpO1xuXG4gICAgICAgICQoYWN0aXZlRWxlbWVudCkuYWRkQ2xhc3MoZGlyZWN0aW9uYWxDbGFzc05hbWUpO1xuICAgICAgICAkKG5leHRFbGVtZW50KS5hZGRDbGFzcyhkaXJlY3Rpb25hbENsYXNzTmFtZSk7XG5cbiAgICAgICAgJChhY3RpdmVFbGVtZW50KS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICQobmV4dEVsZW1lbnQpLnJlbW92ZUNsYXNzKGRpcmVjdGlvbmFsQ2xhc3NOYW1lICsgJyAnICsgb3JkZXJDbGFzc05hbWUpLmFkZENsYXNzKENsYXNzTmFtZS5BQ1RJVkUpO1xuXG4gICAgICAgICAgJChhY3RpdmVFbGVtZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuQUNUSVZFICsgJyAnICsgb3JkZXJDbGFzc05hbWUgKyAnICcgKyBkaXJlY3Rpb25hbENsYXNzTmFtZSk7XG5cbiAgICAgICAgICBfdGhpczUuX2lzU2xpZGluZyA9IGZhbHNlO1xuXG4gICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJChfdGhpczUuX2VsZW1lbnQpLnRyaWdnZXIoc2xpZEV2ZW50KTtcbiAgICAgICAgICB9LCAwKTtcbiAgICAgICAgfSkuZW11bGF0ZVRyYW5zaXRpb25FbmQoVFJBTlNJVElPTl9EVVJBVElPTik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkKGFjdGl2ZUVsZW1lbnQpLnJlbW92ZUNsYXNzKENsYXNzTmFtZS5BQ1RJVkUpO1xuICAgICAgICAkKG5leHRFbGVtZW50KS5hZGRDbGFzcyhDbGFzc05hbWUuQUNUSVZFKTtcblxuICAgICAgICB0aGlzLl9pc1NsaWRpbmcgPSBmYWxzZTtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS50cmlnZ2VyKHNsaWRFdmVudCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChpc0N5Y2xpbmcpIHtcbiAgICAgICAgdGhpcy5jeWNsZSgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBzdGF0aWNcblxuICAgIENhcm91c2VsLl9qUXVlcnlJbnRlcmZhY2UgPSBmdW5jdGlvbiBfalF1ZXJ5SW50ZXJmYWNlKGNvbmZpZykge1xuICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkYXRhID0gJCh0aGlzKS5kYXRhKERBVEFfS0VZKTtcbiAgICAgICAgdmFyIF9jb25maWcgPSAkLmV4dGVuZCh7fSwgRGVmYXVsdCwgJCh0aGlzKS5kYXRhKCkpO1xuXG4gICAgICAgIGlmICgodHlwZW9mIGNvbmZpZyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2YoY29uZmlnKSkgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgJC5leHRlbmQoX2NvbmZpZywgY29uZmlnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhY3Rpb24gPSB0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJyA/IGNvbmZpZyA6IF9jb25maWcuc2xpZGU7XG5cbiAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgZGF0YSA9IG5ldyBDYXJvdXNlbCh0aGlzLCBfY29uZmlnKTtcbiAgICAgICAgICAkKHRoaXMpLmRhdGEoREFUQV9LRVksIGRhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgZGF0YS50byhjb25maWcpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBhY3Rpb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgaWYgKGRhdGFbYWN0aW9uXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIG1ldGhvZCBuYW1lZCBcIicgKyBhY3Rpb24gKyAnXCInKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGF0YVthY3Rpb25dKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoX2NvbmZpZy5pbnRlcnZhbCkge1xuICAgICAgICAgIGRhdGEucGF1c2UoKTtcbiAgICAgICAgICBkYXRhLmN5Y2xlKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBDYXJvdXNlbC5fZGF0YUFwaUNsaWNrSGFuZGxlciA9IGZ1bmN0aW9uIF9kYXRhQXBpQ2xpY2tIYW5kbGVyKGV2ZW50KSB7XG4gICAgICB2YXIgc2VsZWN0b3IgPSBVdGlsLmdldFNlbGVjdG9yRnJvbUVsZW1lbnQodGhpcyk7XG5cbiAgICAgIGlmICghc2VsZWN0b3IpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgdGFyZ2V0ID0gJChzZWxlY3RvcilbMF07XG5cbiAgICAgIGlmICghdGFyZ2V0IHx8ICEkKHRhcmdldCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkNBUk9VU0VMKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBjb25maWcgPSAkLmV4dGVuZCh7fSwgJCh0YXJnZXQpLmRhdGEoKSwgJCh0aGlzKS5kYXRhKCkpO1xuICAgICAgdmFyIHNsaWRlSW5kZXggPSB0aGlzLmdldEF0dHJpYnV0ZSgnZGF0YS1zbGlkZS10bycpO1xuXG4gICAgICBpZiAoc2xpZGVJbmRleCkge1xuICAgICAgICBjb25maWcuaW50ZXJ2YWwgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgQ2Fyb3VzZWwuX2pRdWVyeUludGVyZmFjZS5jYWxsKCQodGFyZ2V0KSwgY29uZmlnKTtcblxuICAgICAgaWYgKHNsaWRlSW5kZXgpIHtcbiAgICAgICAgJCh0YXJnZXQpLmRhdGEoREFUQV9LRVkpLnRvKHNsaWRlSW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH07XG5cbiAgICBfY3JlYXRlQ2xhc3MoQ2Fyb3VzZWwsIG51bGwsIFt7XG4gICAgICBrZXk6ICdWRVJTSU9OJyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gVkVSU0lPTjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6ICdEZWZhdWx0JyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRGVmYXVsdDtcbiAgICAgIH1cbiAgICB9XSk7XG5cbiAgICByZXR1cm4gQ2Fyb3VzZWw7XG4gIH0oKTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIERhdGEgQXBpIGltcGxlbWVudGF0aW9uXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAkKGRvY3VtZW50KS5vbihFdmVudC5DTElDS19EQVRBX0FQSSwgU2VsZWN0b3IuREFUQV9TTElERSwgQ2Fyb3VzZWwuX2RhdGFBcGlDbGlja0hhbmRsZXIpO1xuXG4gICQod2luZG93KS5vbihFdmVudC5MT0FEX0RBVEFfQVBJLCBmdW5jdGlvbiAoKSB7XG4gICAgJChTZWxlY3Rvci5EQVRBX1JJREUpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICRjYXJvdXNlbCA9ICQodGhpcyk7XG4gICAgICBDYXJvdXNlbC5falF1ZXJ5SW50ZXJmYWNlLmNhbGwoJGNhcm91c2VsLCAkY2Fyb3VzZWwuZGF0YSgpKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBqUXVlcnlcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gICQuZm5bTkFNRV0gPSBDYXJvdXNlbC5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUVdLkNvbnN0cnVjdG9yID0gQ2Fyb3VzZWw7XG4gICQuZm5bTkFNRV0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUVdID0gSlFVRVJZX05PX0NPTkZMSUNUO1xuICAgIHJldHVybiBDYXJvdXNlbC5falF1ZXJ5SW50ZXJmYWNlO1xuICB9O1xuXG4gIHJldHVybiBDYXJvdXNlbDtcbn0oalF1ZXJ5KTtcblxuLyoqXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogQm9vdHN0cmFwICh2NC4wLjAtYWxwaGEuNik6IGNvbGxhcHNlLmpzXG4gKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS90d2JzL2Jvb3RzdHJhcC9ibG9iL21hc3Rlci9MSUNFTlNFKVxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqL1xuXG52YXIgQ29sbGFwc2UgPSBmdW5jdGlvbiAoJCkge1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ29uc3RhbnRzXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgTkFNRSA9ICdjb2xsYXBzZSc7XG4gIHZhciBWRVJTSU9OID0gJzQuMC4wLWFscGhhLjYnO1xuICB2YXIgREFUQV9LRVkgPSAnYnMuY29sbGFwc2UnO1xuICB2YXIgRVZFTlRfS0VZID0gJy4nICsgREFUQV9LRVk7XG4gIHZhciBEQVRBX0FQSV9LRVkgPSAnLmRhdGEtYXBpJztcbiAgdmFyIEpRVUVSWV9OT19DT05GTElDVCA9ICQuZm5bTkFNRV07XG4gIHZhciBUUkFOU0lUSU9OX0RVUkFUSU9OID0gNjAwO1xuXG4gIHZhciBEZWZhdWx0ID0ge1xuICAgIHRvZ2dsZTogdHJ1ZSxcbiAgICBwYXJlbnQ6ICcnXG4gIH07XG5cbiAgdmFyIERlZmF1bHRUeXBlID0ge1xuICAgIHRvZ2dsZTogJ2Jvb2xlYW4nLFxuICAgIHBhcmVudDogJ3N0cmluZydcbiAgfTtcblxuICB2YXIgRXZlbnQgPSB7XG4gICAgU0hPVzogJ3Nob3cnICsgRVZFTlRfS0VZLFxuICAgIFNIT1dOOiAnc2hvd24nICsgRVZFTlRfS0VZLFxuICAgIEhJREU6ICdoaWRlJyArIEVWRU5UX0tFWSxcbiAgICBISURERU46ICdoaWRkZW4nICsgRVZFTlRfS0VZLFxuICAgIENMSUNLX0RBVEFfQVBJOiAnY2xpY2snICsgRVZFTlRfS0VZICsgREFUQV9BUElfS0VZXG4gIH07XG5cbiAgdmFyIENsYXNzTmFtZSA9IHtcbiAgICBTSE9XOiAnc2hvdycsXG4gICAgQ09MTEFQU0U6ICdjb2xsYXBzZScsXG4gICAgQ09MTEFQU0lORzogJ2NvbGxhcHNpbmcnLFxuICAgIENPTExBUFNFRDogJ2NvbGxhcHNlZCdcbiAgfTtcblxuICB2YXIgRGltZW5zaW9uID0ge1xuICAgIFdJRFRIOiAnd2lkdGgnLFxuICAgIEhFSUdIVDogJ2hlaWdodCdcbiAgfTtcblxuICB2YXIgU2VsZWN0b3IgPSB7XG4gICAgQUNUSVZFUzogJy5jYXJkID4gLnNob3csIC5jYXJkID4gLmNvbGxhcHNpbmcnLFxuICAgIERBVEFfVE9HR0xFOiAnW2RhdGEtdG9nZ2xlPVwiY29sbGFwc2VcIl0nXG4gIH07XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDbGFzcyBEZWZpbml0aW9uXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgQ29sbGFwc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ29sbGFwc2UoZWxlbWVudCwgY29uZmlnKSB7XG4gICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgQ29sbGFwc2UpO1xuXG4gICAgICB0aGlzLl9pc1RyYW5zaXRpb25pbmcgPSBmYWxzZTtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBlbGVtZW50O1xuICAgICAgdGhpcy5fY29uZmlnID0gdGhpcy5fZ2V0Q29uZmlnKGNvbmZpZyk7XG4gICAgICB0aGlzLl90cmlnZ2VyQXJyYXkgPSAkLm1ha2VBcnJheSgkKCdbZGF0YS10b2dnbGU9XCJjb2xsYXBzZVwiXVtocmVmPVwiIycgKyBlbGVtZW50LmlkICsgJ1wiXSwnICsgKCdbZGF0YS10b2dnbGU9XCJjb2xsYXBzZVwiXVtkYXRhLXRhcmdldD1cIiMnICsgZWxlbWVudC5pZCArICdcIl0nKSkpO1xuXG4gICAgICB0aGlzLl9wYXJlbnQgPSB0aGlzLl9jb25maWcucGFyZW50ID8gdGhpcy5fZ2V0UGFyZW50KCkgOiBudWxsO1xuXG4gICAgICBpZiAoIXRoaXMuX2NvbmZpZy5wYXJlbnQpIHtcbiAgICAgICAgdGhpcy5fYWRkQXJpYUFuZENvbGxhcHNlZENsYXNzKHRoaXMuX2VsZW1lbnQsIHRoaXMuX3RyaWdnZXJBcnJheSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9jb25maWcudG9nZ2xlKSB7XG4gICAgICAgIHRoaXMudG9nZ2xlKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZ2V0dGVyc1xuXG4gICAgLy8gcHVibGljXG5cbiAgICBDb2xsYXBzZS5wcm90b3R5cGUudG9nZ2xlID0gZnVuY3Rpb24gdG9nZ2xlKCkge1xuICAgICAgaWYgKCQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpKSB7XG4gICAgICAgIHRoaXMuaGlkZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zaG93KCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIENvbGxhcHNlLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gc2hvdygpIHtcbiAgICAgIHZhciBfdGhpczYgPSB0aGlzO1xuXG4gICAgICBpZiAodGhpcy5faXNUcmFuc2l0aW9uaW5nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ29sbGFwc2UgaXMgdHJhbnNpdGlvbmluZycpO1xuICAgICAgfVxuXG4gICAgICBpZiAoJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUuU0hPVykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgYWN0aXZlcyA9IHZvaWQgMDtcbiAgICAgIHZhciBhY3RpdmVzRGF0YSA9IHZvaWQgMDtcblxuICAgICAgaWYgKHRoaXMuX3BhcmVudCkge1xuICAgICAgICBhY3RpdmVzID0gJC5tYWtlQXJyYXkoJCh0aGlzLl9wYXJlbnQpLmZpbmQoU2VsZWN0b3IuQUNUSVZFUykpO1xuICAgICAgICBpZiAoIWFjdGl2ZXMubGVuZ3RoKSB7XG4gICAgICAgICAgYWN0aXZlcyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGFjdGl2ZXMpIHtcbiAgICAgICAgYWN0aXZlc0RhdGEgPSAkKGFjdGl2ZXMpLmRhdGEoREFUQV9LRVkpO1xuICAgICAgICBpZiAoYWN0aXZlc0RhdGEgJiYgYWN0aXZlc0RhdGEuX2lzVHJhbnNpdGlvbmluZykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgc3RhcnRFdmVudCA9ICQuRXZlbnQoRXZlbnQuU0hPVyk7XG4gICAgICAkKHRoaXMuX2VsZW1lbnQpLnRyaWdnZXIoc3RhcnRFdmVudCk7XG4gICAgICBpZiAoc3RhcnRFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChhY3RpdmVzKSB7XG4gICAgICAgIENvbGxhcHNlLl9qUXVlcnlJbnRlcmZhY2UuY2FsbCgkKGFjdGl2ZXMpLCAnaGlkZScpO1xuICAgICAgICBpZiAoIWFjdGl2ZXNEYXRhKSB7XG4gICAgICAgICAgJChhY3RpdmVzKS5kYXRhKERBVEFfS0VZLCBudWxsKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgZGltZW5zaW9uID0gdGhpcy5fZ2V0RGltZW5zaW9uKCk7XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLkNPTExBUFNFKS5hZGRDbGFzcyhDbGFzc05hbWUuQ09MTEFQU0lORyk7XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGVbZGltZW5zaW9uXSA9IDA7XG4gICAgICB0aGlzLl9lbGVtZW50LnNldEF0dHJpYnV0ZSgnYXJpYS1leHBhbmRlZCcsIHRydWUpO1xuXG4gICAgICBpZiAodGhpcy5fdHJpZ2dlckFycmF5Lmxlbmd0aCkge1xuICAgICAgICAkKHRoaXMuX3RyaWdnZXJBcnJheSkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLkNPTExBUFNFRCkuYXR0cignYXJpYS1leHBhbmRlZCcsIHRydWUpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNldFRyYW5zaXRpb25pbmcodHJ1ZSk7XG5cbiAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICAkKF90aGlzNi5fZWxlbWVudCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLkNPTExBUFNJTkcpLmFkZENsYXNzKENsYXNzTmFtZS5DT0xMQVBTRSkuYWRkQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpO1xuXG4gICAgICAgIF90aGlzNi5fZWxlbWVudC5zdHlsZVtkaW1lbnNpb25dID0gJyc7XG5cbiAgICAgICAgX3RoaXM2LnNldFRyYW5zaXRpb25pbmcoZmFsc2UpO1xuXG4gICAgICAgICQoX3RoaXM2Ll9lbGVtZW50KS50cmlnZ2VyKEV2ZW50LlNIT1dOKTtcbiAgICAgIH07XG5cbiAgICAgIGlmICghVXRpbC5zdXBwb3J0c1RyYW5zaXRpb25FbmQoKSkge1xuICAgICAgICBjb21wbGV0ZSgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBjYXBpdGFsaXplZERpbWVuc2lvbiA9IGRpbWVuc2lvblswXS50b1VwcGVyQ2FzZSgpICsgZGltZW5zaW9uLnNsaWNlKDEpO1xuICAgICAgdmFyIHNjcm9sbFNpemUgPSAnc2Nyb2xsJyArIGNhcGl0YWxpemVkRGltZW5zaW9uO1xuXG4gICAgICAkKHRoaXMuX2VsZW1lbnQpLm9uZShVdGlsLlRSQU5TSVRJT05fRU5ELCBjb21wbGV0ZSkuZW11bGF0ZVRyYW5zaXRpb25FbmQoVFJBTlNJVElPTl9EVVJBVElPTik7XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGVbZGltZW5zaW9uXSA9IHRoaXMuX2VsZW1lbnRbc2Nyb2xsU2l6ZV0gKyAncHgnO1xuICAgIH07XG5cbiAgICBDb2xsYXBzZS5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uIGhpZGUoKSB7XG4gICAgICB2YXIgX3RoaXM3ID0gdGhpcztcblxuICAgICAgaWYgKHRoaXMuX2lzVHJhbnNpdGlvbmluZykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbGxhcHNlIGlzIHRyYW5zaXRpb25pbmcnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCEkKHRoaXMuX2VsZW1lbnQpLmhhc0NsYXNzKENsYXNzTmFtZS5TSE9XKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBzdGFydEV2ZW50ID0gJC5FdmVudChFdmVudC5ISURFKTtcbiAgICAgICQodGhpcy5fZWxlbWVudCkudHJpZ2dlcihzdGFydEV2ZW50KTtcbiAgICAgIGlmIChzdGFydEV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGRpbWVuc2lvbiA9IHRoaXMuX2dldERpbWVuc2lvbigpO1xuICAgICAgdmFyIG9mZnNldERpbWVuc2lvbiA9IGRpbWVuc2lvbiA9PT0gRGltZW5zaW9uLldJRFRIID8gJ29mZnNldFdpZHRoJyA6ICdvZmZzZXRIZWlnaHQnO1xuXG4gICAgICB0aGlzLl9lbGVtZW50LnN0eWxlW2RpbWVuc2lvbl0gPSB0aGlzLl9lbGVtZW50W29mZnNldERpbWVuc2lvbl0gKyAncHgnO1xuXG4gICAgICBVdGlsLnJlZmxvdyh0aGlzLl9lbGVtZW50KTtcblxuICAgICAgJCh0aGlzLl9lbGVtZW50KS5hZGRDbGFzcyhDbGFzc05hbWUuQ09MTEFQU0lORykucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLkNPTExBUFNFKS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuU0hPVyk7XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQuc2V0QXR0cmlidXRlKCdhcmlhLWV4cGFuZGVkJywgZmFsc2UpO1xuXG4gICAgICBpZiAodGhpcy5fdHJpZ2dlckFycmF5Lmxlbmd0aCkge1xuICAgICAgICAkKHRoaXMuX3RyaWdnZXJBcnJheSkuYWRkQ2xhc3MoQ2xhc3NOYW1lLkNPTExBUFNFRCkuYXR0cignYXJpYS1leHBhbmRlZCcsIGZhbHNlKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zZXRUcmFuc2l0aW9uaW5nKHRydWUpO1xuXG4gICAgICB2YXIgY29tcGxldGUgPSBmdW5jdGlvbiBjb21wbGV0ZSgpIHtcbiAgICAgICAgX3RoaXM3LnNldFRyYW5zaXRpb25pbmcoZmFsc2UpO1xuICAgICAgICAkKF90aGlzNy5fZWxlbWVudCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLkNPTExBUFNJTkcpLmFkZENsYXNzKENsYXNzTmFtZS5DT0xMQVBTRSkudHJpZ2dlcihFdmVudC5ISURERU4pO1xuICAgICAgfTtcblxuICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZVtkaW1lbnNpb25dID0gJyc7XG5cbiAgICAgIGlmICghVXRpbC5zdXBwb3J0c1RyYW5zaXRpb25FbmQoKSkge1xuICAgICAgICBjb21wbGV0ZSgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGNvbXBsZXRlKS5lbXVsYXRlVHJhbnNpdGlvbkVuZChUUkFOU0lUSU9OX0RVUkFUSU9OKTtcbiAgICB9O1xuXG4gICAgQ29sbGFwc2UucHJvdG90eXBlLnNldFRyYW5zaXRpb25pbmcgPSBmdW5jdGlvbiBzZXRUcmFuc2l0aW9uaW5nKGlzVHJhbnNpdGlvbmluZykge1xuICAgICAgdGhpcy5faXNUcmFuc2l0aW9uaW5nID0gaXNUcmFuc2l0aW9uaW5nO1xuICAgIH07XG5cbiAgICBDb2xsYXBzZS5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgICAkLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkpO1xuXG4gICAgICB0aGlzLl9jb25maWcgPSBudWxsO1xuICAgICAgdGhpcy5fcGFyZW50ID0gbnVsbDtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgICAgdGhpcy5fdHJpZ2dlckFycmF5ID0gbnVsbDtcbiAgICAgIHRoaXMuX2lzVHJhbnNpdGlvbmluZyA9IG51bGw7XG4gICAgfTtcblxuICAgIC8vIHByaXZhdGVcblxuICAgIENvbGxhcHNlLnByb3RvdHlwZS5fZ2V0Q29uZmlnID0gZnVuY3Rpb24gX2dldENvbmZpZyhjb25maWcpIHtcbiAgICAgIGNvbmZpZyA9ICQuZXh0ZW5kKHt9LCBEZWZhdWx0LCBjb25maWcpO1xuICAgICAgY29uZmlnLnRvZ2dsZSA9IEJvb2xlYW4oY29uZmlnLnRvZ2dsZSk7IC8vIGNvZXJjZSBzdHJpbmcgdmFsdWVzXG4gICAgICBVdGlsLnR5cGVDaGVja0NvbmZpZyhOQU1FLCBjb25maWcsIERlZmF1bHRUeXBlKTtcbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfTtcblxuICAgIENvbGxhcHNlLnByb3RvdHlwZS5fZ2V0RGltZW5zaW9uID0gZnVuY3Rpb24gX2dldERpbWVuc2lvbigpIHtcbiAgICAgIHZhciBoYXNXaWR0aCA9ICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoRGltZW5zaW9uLldJRFRIKTtcbiAgICAgIHJldHVybiBoYXNXaWR0aCA/IERpbWVuc2lvbi5XSURUSCA6IERpbWVuc2lvbi5IRUlHSFQ7XG4gICAgfTtcblxuICAgIENvbGxhcHNlLnByb3RvdHlwZS5fZ2V0UGFyZW50ID0gZnVuY3Rpb24gX2dldFBhcmVudCgpIHtcbiAgICAgIHZhciBfdGhpczggPSB0aGlzO1xuXG4gICAgICB2YXIgcGFyZW50ID0gJCh0aGlzLl9jb25maWcucGFyZW50KVswXTtcbiAgICAgIHZhciBzZWxlY3RvciA9ICdbZGF0YS10b2dnbGU9XCJjb2xsYXBzZVwiXVtkYXRhLXBhcmVudD1cIicgKyB0aGlzLl9jb25maWcucGFyZW50ICsgJ1wiXSc7XG5cbiAgICAgICQocGFyZW50KS5maW5kKHNlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uIChpLCBlbGVtZW50KSB7XG4gICAgICAgIF90aGlzOC5fYWRkQXJpYUFuZENvbGxhcHNlZENsYXNzKENvbGxhcHNlLl9nZXRUYXJnZXRGcm9tRWxlbWVudChlbGVtZW50KSwgW2VsZW1lbnRdKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gcGFyZW50O1xuICAgIH07XG5cbiAgICBDb2xsYXBzZS5wcm90b3R5cGUuX2FkZEFyaWFBbmRDb2xsYXBzZWRDbGFzcyA9IGZ1bmN0aW9uIF9hZGRBcmlhQW5kQ29sbGFwc2VkQ2xhc3MoZWxlbWVudCwgdHJpZ2dlckFycmF5KSB7XG4gICAgICBpZiAoZWxlbWVudCkge1xuICAgICAgICB2YXIgaXNPcGVuID0gJChlbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUuU0hPVyk7XG4gICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdhcmlhLWV4cGFuZGVkJywgaXNPcGVuKTtcblxuICAgICAgICBpZiAodHJpZ2dlckFycmF5Lmxlbmd0aCkge1xuICAgICAgICAgICQodHJpZ2dlckFycmF5KS50b2dnbGVDbGFzcyhDbGFzc05hbWUuQ09MTEFQU0VELCAhaXNPcGVuKS5hdHRyKCdhcmlhLWV4cGFuZGVkJywgaXNPcGVuKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBzdGF0aWNcblxuICAgIENvbGxhcHNlLl9nZXRUYXJnZXRGcm9tRWxlbWVudCA9IGZ1bmN0aW9uIF9nZXRUYXJnZXRGcm9tRWxlbWVudChlbGVtZW50KSB7XG4gICAgICB2YXIgc2VsZWN0b3IgPSBVdGlsLmdldFNlbGVjdG9yRnJvbUVsZW1lbnQoZWxlbWVudCk7XG4gICAgICByZXR1cm4gc2VsZWN0b3IgPyAkKHNlbGVjdG9yKVswXSA6IG51bGw7XG4gICAgfTtcblxuICAgIENvbGxhcHNlLl9qUXVlcnlJbnRlcmZhY2UgPSBmdW5jdGlvbiBfalF1ZXJ5SW50ZXJmYWNlKGNvbmZpZykge1xuICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciAkdGhpcyA9ICQodGhpcyk7XG4gICAgICAgIHZhciBkYXRhID0gJHRoaXMuZGF0YShEQVRBX0tFWSk7XG4gICAgICAgIHZhciBfY29uZmlnID0gJC5leHRlbmQoe30sIERlZmF1bHQsICR0aGlzLmRhdGEoKSwgKHR5cGVvZiBjb25maWcgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKGNvbmZpZykpID09PSAnb2JqZWN0JyAmJiBjb25maWcpO1xuXG4gICAgICAgIGlmICghZGF0YSAmJiBfY29uZmlnLnRvZ2dsZSAmJiAvc2hvd3xoaWRlLy50ZXN0KGNvbmZpZykpIHtcbiAgICAgICAgICBfY29uZmlnLnRvZ2dsZSA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgZGF0YSA9IG5ldyBDb2xsYXBzZSh0aGlzLCBfY29uZmlnKTtcbiAgICAgICAgICAkdGhpcy5kYXRhKERBVEFfS0VZLCBkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGlmIChkYXRhW2NvbmZpZ10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBtZXRob2QgbmFtZWQgXCInICsgY29uZmlnICsgJ1wiJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRhdGFbY29uZmlnXSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKENvbGxhcHNlLCBudWxsLCBbe1xuICAgICAga2V5OiAnVkVSU0lPTicsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIFZFUlNJT047XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiAnRGVmYXVsdCcsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIERlZmF1bHQ7XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIENvbGxhcHNlO1xuICB9KCk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgJChkb2N1bWVudCkub24oRXZlbnQuQ0xJQ0tfREFUQV9BUEksIFNlbGVjdG9yLkRBVEFfVE9HR0xFLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgdmFyIHRhcmdldCA9IENvbGxhcHNlLl9nZXRUYXJnZXRGcm9tRWxlbWVudCh0aGlzKTtcbiAgICB2YXIgZGF0YSA9ICQodGFyZ2V0KS5kYXRhKERBVEFfS0VZKTtcbiAgICB2YXIgY29uZmlnID0gZGF0YSA/ICd0b2dnbGUnIDogJCh0aGlzKS5kYXRhKCk7XG5cbiAgICBDb2xsYXBzZS5falF1ZXJ5SW50ZXJmYWNlLmNhbGwoJCh0YXJnZXQpLCBjb25maWcpO1xuICB9KTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIGpRdWVyeVxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgJC5mbltOQU1FXSA9IENvbGxhcHNlLl9qUXVlcnlJbnRlcmZhY2U7XG4gICQuZm5bTkFNRV0uQ29uc3RydWN0b3IgPSBDb2xsYXBzZTtcbiAgJC5mbltOQU1FXS5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICQuZm5bTkFNRV0gPSBKUVVFUllfTk9fQ09ORkxJQ1Q7XG4gICAgcmV0dXJuIENvbGxhcHNlLl9qUXVlcnlJbnRlcmZhY2U7XG4gIH07XG5cbiAgcmV0dXJuIENvbGxhcHNlO1xufShqUXVlcnkpO1xuXG4vKipcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBCb290c3RyYXAgKHY0LjAuMC1hbHBoYS42KTogZHJvcGRvd24uanNcbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL3R3YnMvYm9vdHN0cmFwL2Jsb2IvbWFzdGVyL0xJQ0VOU0UpXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICovXG5cbnZhciBEcm9wZG93biA9IGZ1bmN0aW9uICgkKSB7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FID0gJ2Ryb3Bkb3duJztcbiAgdmFyIFZFUlNJT04gPSAnNC4wLjAtYWxwaGEuNic7XG4gIHZhciBEQVRBX0tFWSA9ICdicy5kcm9wZG93bic7XG4gIHZhciBFVkVOVF9LRVkgPSAnLicgKyBEQVRBX0tFWTtcbiAgdmFyIERBVEFfQVBJX0tFWSA9ICcuZGF0YS1hcGknO1xuICB2YXIgSlFVRVJZX05PX0NPTkZMSUNUID0gJC5mbltOQU1FXTtcbiAgdmFyIEVTQ0FQRV9LRVlDT0RFID0gMjc7IC8vIEtleWJvYXJkRXZlbnQud2hpY2ggdmFsdWUgZm9yIEVzY2FwZSAoRXNjKSBrZXlcbiAgdmFyIEFSUk9XX1VQX0tFWUNPREUgPSAzODsgLy8gS2V5Ym9hcmRFdmVudC53aGljaCB2YWx1ZSBmb3IgdXAgYXJyb3cga2V5XG4gIHZhciBBUlJPV19ET1dOX0tFWUNPREUgPSA0MDsgLy8gS2V5Ym9hcmRFdmVudC53aGljaCB2YWx1ZSBmb3IgZG93biBhcnJvdyBrZXlcbiAgdmFyIFJJR0hUX01PVVNFX0JVVFRPTl9XSElDSCA9IDM7IC8vIE1vdXNlRXZlbnQud2hpY2ggdmFsdWUgZm9yIHRoZSByaWdodCBidXR0b24gKGFzc3VtaW5nIGEgcmlnaHQtaGFuZGVkIG1vdXNlKVxuXG4gIHZhciBFdmVudCA9IHtcbiAgICBISURFOiAnaGlkZScgKyBFVkVOVF9LRVksXG4gICAgSElEREVOOiAnaGlkZGVuJyArIEVWRU5UX0tFWSxcbiAgICBTSE9XOiAnc2hvdycgKyBFVkVOVF9LRVksXG4gICAgU0hPV046ICdzaG93bicgKyBFVkVOVF9LRVksXG4gICAgQ0xJQ0s6ICdjbGljaycgKyBFVkVOVF9LRVksXG4gICAgQ0xJQ0tfREFUQV9BUEk6ICdjbGljaycgKyBFVkVOVF9LRVkgKyBEQVRBX0FQSV9LRVksXG4gICAgRk9DVVNJTl9EQVRBX0FQSTogJ2ZvY3VzaW4nICsgRVZFTlRfS0VZICsgREFUQV9BUElfS0VZLFxuICAgIEtFWURPV05fREFUQV9BUEk6ICdrZXlkb3duJyArIEVWRU5UX0tFWSArIERBVEFfQVBJX0tFWVxuICB9O1xuXG4gIHZhciBDbGFzc05hbWUgPSB7XG4gICAgQkFDS0RST1A6ICdkcm9wZG93bi1iYWNrZHJvcCcsXG4gICAgRElTQUJMRUQ6ICdkaXNhYmxlZCcsXG4gICAgU0hPVzogJ3Nob3cnXG4gIH07XG5cbiAgdmFyIFNlbGVjdG9yID0ge1xuICAgIEJBQ0tEUk9QOiAnLmRyb3Bkb3duLWJhY2tkcm9wJyxcbiAgICBEQVRBX1RPR0dMRTogJ1tkYXRhLXRvZ2dsZT1cImRyb3Bkb3duXCJdJyxcbiAgICBGT1JNX0NISUxEOiAnLmRyb3Bkb3duIGZvcm0nLFxuICAgIFJPTEVfTUVOVTogJ1tyb2xlPVwibWVudVwiXScsXG4gICAgUk9MRV9MSVNUQk9YOiAnW3JvbGU9XCJsaXN0Ym94XCJdJyxcbiAgICBOQVZCQVJfTkFWOiAnLm5hdmJhci1uYXYnLFxuICAgIFZJU0lCTEVfSVRFTVM6ICdbcm9sZT1cIm1lbnVcIl0gbGk6bm90KC5kaXNhYmxlZCkgYSwgJyArICdbcm9sZT1cImxpc3Rib3hcIl0gbGk6bm90KC5kaXNhYmxlZCkgYSdcbiAgfTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIENsYXNzIERlZmluaXRpb25cbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBEcm9wZG93biA9IGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBEcm9wZG93bihlbGVtZW50KSB7XG4gICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgRHJvcGRvd24pO1xuXG4gICAgICB0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtcblxuICAgICAgdGhpcy5fYWRkRXZlbnRMaXN0ZW5lcnMoKTtcbiAgICB9XG5cbiAgICAvLyBnZXR0ZXJzXG5cbiAgICAvLyBwdWJsaWNcblxuICAgIERyb3Bkb3duLnByb3RvdHlwZS50b2dnbGUgPSBmdW5jdGlvbiB0b2dnbGUoKSB7XG4gICAgICBpZiAodGhpcy5kaXNhYmxlZCB8fCAkKHRoaXMpLmhhc0NsYXNzKENsYXNzTmFtZS5ESVNBQkxFRCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICB2YXIgcGFyZW50ID0gRHJvcGRvd24uX2dldFBhcmVudEZyb21FbGVtZW50KHRoaXMpO1xuICAgICAgdmFyIGlzQWN0aXZlID0gJChwYXJlbnQpLmhhc0NsYXNzKENsYXNzTmFtZS5TSE9XKTtcblxuICAgICAgRHJvcGRvd24uX2NsZWFyTWVudXMoKTtcblxuICAgICAgaWYgKGlzQWN0aXZlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKCdvbnRvdWNoc3RhcnQnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCAmJiAhJChwYXJlbnQpLmNsb3Nlc3QoU2VsZWN0b3IuTkFWQkFSX05BVikubGVuZ3RoKSB7XG5cbiAgICAgICAgLy8gaWYgbW9iaWxlIHdlIHVzZSBhIGJhY2tkcm9wIGJlY2F1c2UgY2xpY2sgZXZlbnRzIGRvbid0IGRlbGVnYXRlXG4gICAgICAgIHZhciBkcm9wZG93biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBkcm9wZG93bi5jbGFzc05hbWUgPSBDbGFzc05hbWUuQkFDS0RST1A7XG4gICAgICAgICQoZHJvcGRvd24pLmluc2VydEJlZm9yZSh0aGlzKTtcbiAgICAgICAgJChkcm9wZG93bikub24oJ2NsaWNrJywgRHJvcGRvd24uX2NsZWFyTWVudXMpO1xuICAgICAgfVxuXG4gICAgICB2YXIgcmVsYXRlZFRhcmdldCA9IHtcbiAgICAgICAgcmVsYXRlZFRhcmdldDogdGhpc1xuICAgICAgfTtcbiAgICAgIHZhciBzaG93RXZlbnQgPSAkLkV2ZW50KEV2ZW50LlNIT1csIHJlbGF0ZWRUYXJnZXQpO1xuXG4gICAgICAkKHBhcmVudCkudHJpZ2dlcihzaG93RXZlbnQpO1xuXG4gICAgICBpZiAoc2hvd0V2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5mb2N1cygpO1xuICAgICAgdGhpcy5zZXRBdHRyaWJ1dGUoJ2FyaWEtZXhwYW5kZWQnLCB0cnVlKTtcblxuICAgICAgJChwYXJlbnQpLnRvZ2dsZUNsYXNzKENsYXNzTmFtZS5TSE9XKTtcbiAgICAgICQocGFyZW50KS50cmlnZ2VyKCQuRXZlbnQoRXZlbnQuU0hPV04sIHJlbGF0ZWRUYXJnZXQpKTtcblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICBEcm9wZG93bi5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgICAkLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkpO1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS5vZmYoRVZFTlRfS0VZKTtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgIH07XG5cbiAgICAvLyBwcml2YXRlXG5cbiAgICBEcm9wZG93bi5wcm90b3R5cGUuX2FkZEV2ZW50TGlzdGVuZXJzID0gZnVuY3Rpb24gX2FkZEV2ZW50TGlzdGVuZXJzKCkge1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbihFdmVudC5DTElDSywgdGhpcy50b2dnbGUpO1xuICAgIH07XG5cbiAgICAvLyBzdGF0aWNcblxuICAgIERyb3Bkb3duLl9qUXVlcnlJbnRlcmZhY2UgPSBmdW5jdGlvbiBfalF1ZXJ5SW50ZXJmYWNlKGNvbmZpZykge1xuICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkYXRhID0gJCh0aGlzKS5kYXRhKERBVEFfS0VZKTtcblxuICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICBkYXRhID0gbmV3IERyb3Bkb3duKHRoaXMpO1xuICAgICAgICAgICQodGhpcykuZGF0YShEQVRBX0tFWSwgZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBpZiAoZGF0YVtjb25maWddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gbWV0aG9kIG5hbWVkIFwiJyArIGNvbmZpZyArICdcIicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkYXRhW2NvbmZpZ10uY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIERyb3Bkb3duLl9jbGVhck1lbnVzID0gZnVuY3Rpb24gX2NsZWFyTWVudXMoZXZlbnQpIHtcbiAgICAgIGlmIChldmVudCAmJiBldmVudC53aGljaCA9PT0gUklHSFRfTU9VU0VfQlVUVE9OX1dISUNIKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGJhY2tkcm9wID0gJChTZWxlY3Rvci5CQUNLRFJPUClbMF07XG4gICAgICBpZiAoYmFja2Ryb3ApIHtcbiAgICAgICAgYmFja2Ryb3AucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChiYWNrZHJvcCk7XG4gICAgICB9XG5cbiAgICAgIHZhciB0b2dnbGVzID0gJC5tYWtlQXJyYXkoJChTZWxlY3Rvci5EQVRBX1RPR0dMRSkpO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRvZ2dsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHBhcmVudCA9IERyb3Bkb3duLl9nZXRQYXJlbnRGcm9tRWxlbWVudCh0b2dnbGVzW2ldKTtcbiAgICAgICAgdmFyIHJlbGF0ZWRUYXJnZXQgPSB7XG4gICAgICAgICAgcmVsYXRlZFRhcmdldDogdG9nZ2xlc1tpXVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICghJChwYXJlbnQpLmhhc0NsYXNzKENsYXNzTmFtZS5TSE9XKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGV2ZW50ICYmIChldmVudC50eXBlID09PSAnY2xpY2snICYmIC9pbnB1dHx0ZXh0YXJlYS9pLnRlc3QoZXZlbnQudGFyZ2V0LnRhZ05hbWUpIHx8IGV2ZW50LnR5cGUgPT09ICdmb2N1c2luJykgJiYgJC5jb250YWlucyhwYXJlbnQsIGV2ZW50LnRhcmdldCkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBoaWRlRXZlbnQgPSAkLkV2ZW50KEV2ZW50LkhJREUsIHJlbGF0ZWRUYXJnZXQpO1xuICAgICAgICAkKHBhcmVudCkudHJpZ2dlcihoaWRlRXZlbnQpO1xuICAgICAgICBpZiAoaGlkZUV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICB0b2dnbGVzW2ldLnNldEF0dHJpYnV0ZSgnYXJpYS1leHBhbmRlZCcsICdmYWxzZScpO1xuXG4gICAgICAgICQocGFyZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuU0hPVykudHJpZ2dlcigkLkV2ZW50KEV2ZW50LkhJRERFTiwgcmVsYXRlZFRhcmdldCkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBEcm9wZG93bi5fZ2V0UGFyZW50RnJvbUVsZW1lbnQgPSBmdW5jdGlvbiBfZ2V0UGFyZW50RnJvbUVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgdmFyIHBhcmVudCA9IHZvaWQgMDtcbiAgICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudChlbGVtZW50KTtcblxuICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgIHBhcmVudCA9ICQoc2VsZWN0b3IpWzBdO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcGFyZW50IHx8IGVsZW1lbnQucGFyZW50Tm9kZTtcbiAgICB9O1xuXG4gICAgRHJvcGRvd24uX2RhdGFBcGlLZXlkb3duSGFuZGxlciA9IGZ1bmN0aW9uIF9kYXRhQXBpS2V5ZG93bkhhbmRsZXIoZXZlbnQpIHtcbiAgICAgIGlmICghLygzOHw0MHwyN3wzMikvLnRlc3QoZXZlbnQud2hpY2gpIHx8IC9pbnB1dHx0ZXh0YXJlYS9pLnRlc3QoZXZlbnQudGFyZ2V0LnRhZ05hbWUpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgICBpZiAodGhpcy5kaXNhYmxlZCB8fCAkKHRoaXMpLmhhc0NsYXNzKENsYXNzTmFtZS5ESVNBQkxFRCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgcGFyZW50ID0gRHJvcGRvd24uX2dldFBhcmVudEZyb21FbGVtZW50KHRoaXMpO1xuICAgICAgdmFyIGlzQWN0aXZlID0gJChwYXJlbnQpLmhhc0NsYXNzKENsYXNzTmFtZS5TSE9XKTtcblxuICAgICAgaWYgKCFpc0FjdGl2ZSAmJiBldmVudC53aGljaCAhPT0gRVNDQVBFX0tFWUNPREUgfHwgaXNBY3RpdmUgJiYgZXZlbnQud2hpY2ggPT09IEVTQ0FQRV9LRVlDT0RFKSB7XG5cbiAgICAgICAgaWYgKGV2ZW50LndoaWNoID09PSBFU0NBUEVfS0VZQ09ERSkge1xuICAgICAgICAgIHZhciB0b2dnbGUgPSAkKHBhcmVudCkuZmluZChTZWxlY3Rvci5EQVRBX1RPR0dMRSlbMF07XG4gICAgICAgICAgJCh0b2dnbGUpLnRyaWdnZXIoJ2ZvY3VzJyk7XG4gICAgICAgIH1cblxuICAgICAgICAkKHRoaXMpLnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGl0ZW1zID0gJChwYXJlbnQpLmZpbmQoU2VsZWN0b3IuVklTSUJMRV9JVEVNUykuZ2V0KCk7XG5cbiAgICAgIGlmICghaXRlbXMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGluZGV4ID0gaXRlbXMuaW5kZXhPZihldmVudC50YXJnZXQpO1xuXG4gICAgICBpZiAoZXZlbnQud2hpY2ggPT09IEFSUk9XX1VQX0tFWUNPREUgJiYgaW5kZXggPiAwKSB7XG4gICAgICAgIC8vIHVwXG4gICAgICAgIGluZGV4LS07XG4gICAgICB9XG5cbiAgICAgIGlmIChldmVudC53aGljaCA9PT0gQVJST1dfRE9XTl9LRVlDT0RFICYmIGluZGV4IDwgaXRlbXMubGVuZ3RoIC0gMSkge1xuICAgICAgICAvLyBkb3duXG4gICAgICAgIGluZGV4Kys7XG4gICAgICB9XG5cbiAgICAgIGlmIChpbmRleCA8IDApIHtcbiAgICAgICAgaW5kZXggPSAwO1xuICAgICAgfVxuXG4gICAgICBpdGVtc1tpbmRleF0uZm9jdXMoKTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKERyb3Bkb3duLCBudWxsLCBbe1xuICAgICAga2V5OiAnVkVSU0lPTicsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIFZFUlNJT047XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIERyb3Bkb3duO1xuICB9KCk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgJChkb2N1bWVudCkub24oRXZlbnQuS0VZRE9XTl9EQVRBX0FQSSwgU2VsZWN0b3IuREFUQV9UT0dHTEUsIERyb3Bkb3duLl9kYXRhQXBpS2V5ZG93bkhhbmRsZXIpLm9uKEV2ZW50LktFWURPV05fREFUQV9BUEksIFNlbGVjdG9yLlJPTEVfTUVOVSwgRHJvcGRvd24uX2RhdGFBcGlLZXlkb3duSGFuZGxlcikub24oRXZlbnQuS0VZRE9XTl9EQVRBX0FQSSwgU2VsZWN0b3IuUk9MRV9MSVNUQk9YLCBEcm9wZG93bi5fZGF0YUFwaUtleWRvd25IYW5kbGVyKS5vbihFdmVudC5DTElDS19EQVRBX0FQSSArICcgJyArIEV2ZW50LkZPQ1VTSU5fREFUQV9BUEksIERyb3Bkb3duLl9jbGVhck1lbnVzKS5vbihFdmVudC5DTElDS19EQVRBX0FQSSwgU2VsZWN0b3IuREFUQV9UT0dHTEUsIERyb3Bkb3duLnByb3RvdHlwZS50b2dnbGUpLm9uKEV2ZW50LkNMSUNLX0RBVEFfQVBJLCBTZWxlY3Rvci5GT1JNX0NISUxELCBmdW5jdGlvbiAoZSkge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogalF1ZXJ5XG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAkLmZuW05BTUVdID0gRHJvcGRvd24uX2pRdWVyeUludGVyZmFjZTtcbiAgJC5mbltOQU1FXS5Db25zdHJ1Y3RvciA9IERyb3Bkb3duO1xuICAkLmZuW05BTUVdLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgJC5mbltOQU1FXSA9IEpRVUVSWV9OT19DT05GTElDVDtcbiAgICByZXR1cm4gRHJvcGRvd24uX2pRdWVyeUludGVyZmFjZTtcbiAgfTtcblxuICByZXR1cm4gRHJvcGRvd247XG59KGpRdWVyeSk7XG5cbi8qKlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIEJvb3RzdHJhcCAodjQuMC4wLWFscGhhLjYpOiBtb2RhbC5qc1xuICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vdHdicy9ib290c3RyYXAvYmxvYi9tYXN0ZXIvTElDRU5TRSlcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKi9cblxudmFyIE1vZGFsID0gZnVuY3Rpb24gKCQpIHtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIENvbnN0YW50c1xuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIE5BTUUgPSAnbW9kYWwnO1xuICB2YXIgVkVSU0lPTiA9ICc0LjAuMC1hbHBoYS42JztcbiAgdmFyIERBVEFfS0VZID0gJ2JzLm1vZGFsJztcbiAgdmFyIEVWRU5UX0tFWSA9ICcuJyArIERBVEFfS0VZO1xuICB2YXIgREFUQV9BUElfS0VZID0gJy5kYXRhLWFwaSc7XG4gIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QgPSAkLmZuW05BTUVdO1xuICB2YXIgVFJBTlNJVElPTl9EVVJBVElPTiA9IDMwMDtcbiAgdmFyIEJBQ0tEUk9QX1RSQU5TSVRJT05fRFVSQVRJT04gPSAxNTA7XG4gIHZhciBFU0NBUEVfS0VZQ09ERSA9IDI3OyAvLyBLZXlib2FyZEV2ZW50LndoaWNoIHZhbHVlIGZvciBFc2NhcGUgKEVzYykga2V5XG5cbiAgdmFyIERlZmF1bHQgPSB7XG4gICAgYmFja2Ryb3A6IHRydWUsXG4gICAga2V5Ym9hcmQ6IHRydWUsXG4gICAgZm9jdXM6IHRydWUsXG4gICAgc2hvdzogdHJ1ZVxuICB9O1xuXG4gIHZhciBEZWZhdWx0VHlwZSA9IHtcbiAgICBiYWNrZHJvcDogJyhib29sZWFufHN0cmluZyknLFxuICAgIGtleWJvYXJkOiAnYm9vbGVhbicsXG4gICAgZm9jdXM6ICdib29sZWFuJyxcbiAgICBzaG93OiAnYm9vbGVhbidcbiAgfTtcblxuICB2YXIgRXZlbnQgPSB7XG4gICAgSElERTogJ2hpZGUnICsgRVZFTlRfS0VZLFxuICAgIEhJRERFTjogJ2hpZGRlbicgKyBFVkVOVF9LRVksXG4gICAgU0hPVzogJ3Nob3cnICsgRVZFTlRfS0VZLFxuICAgIFNIT1dOOiAnc2hvd24nICsgRVZFTlRfS0VZLFxuICAgIEZPQ1VTSU46ICdmb2N1c2luJyArIEVWRU5UX0tFWSxcbiAgICBSRVNJWkU6ICdyZXNpemUnICsgRVZFTlRfS0VZLFxuICAgIENMSUNLX0RJU01JU1M6ICdjbGljay5kaXNtaXNzJyArIEVWRU5UX0tFWSxcbiAgICBLRVlET1dOX0RJU01JU1M6ICdrZXlkb3duLmRpc21pc3MnICsgRVZFTlRfS0VZLFxuICAgIE1PVVNFVVBfRElTTUlTUzogJ21vdXNldXAuZGlzbWlzcycgKyBFVkVOVF9LRVksXG4gICAgTU9VU0VET1dOX0RJU01JU1M6ICdtb3VzZWRvd24uZGlzbWlzcycgKyBFVkVOVF9LRVksXG4gICAgQ0xJQ0tfREFUQV9BUEk6ICdjbGljaycgKyBFVkVOVF9LRVkgKyBEQVRBX0FQSV9LRVlcbiAgfTtcblxuICB2YXIgQ2xhc3NOYW1lID0ge1xuICAgIFNDUk9MTEJBUl9NRUFTVVJFUjogJ21vZGFsLXNjcm9sbGJhci1tZWFzdXJlJyxcbiAgICBCQUNLRFJPUDogJ21vZGFsLWJhY2tkcm9wJyxcbiAgICBPUEVOOiAnbW9kYWwtb3BlbicsXG4gICAgRkFERTogJ2ZhZGUnLFxuICAgIFNIT1c6ICdzaG93J1xuICB9O1xuXG4gIHZhciBTZWxlY3RvciA9IHtcbiAgICBESUFMT0c6ICcubW9kYWwtZGlhbG9nJyxcbiAgICBEQVRBX1RPR0dMRTogJ1tkYXRhLXRvZ2dsZT1cIm1vZGFsXCJdJyxcbiAgICBEQVRBX0RJU01JU1M6ICdbZGF0YS1kaXNtaXNzPVwibW9kYWxcIl0nLFxuICAgIEZJWEVEX0NPTlRFTlQ6ICcuZml4ZWQtdG9wLCAuZml4ZWQtYm90dG9tLCAuaXMtZml4ZWQsIC5zdGlja3ktdG9wJ1xuICB9O1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ2xhc3MgRGVmaW5pdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIE1vZGFsID0gZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIE1vZGFsKGVsZW1lbnQsIGNvbmZpZykge1xuICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIE1vZGFsKTtcblxuICAgICAgdGhpcy5fY29uZmlnID0gdGhpcy5fZ2V0Q29uZmlnKGNvbmZpZyk7XG4gICAgICB0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtcbiAgICAgIHRoaXMuX2RpYWxvZyA9ICQoZWxlbWVudCkuZmluZChTZWxlY3Rvci5ESUFMT0cpWzBdO1xuICAgICAgdGhpcy5fYmFja2Ryb3AgPSBudWxsO1xuICAgICAgdGhpcy5faXNTaG93biA9IGZhbHNlO1xuICAgICAgdGhpcy5faXNCb2R5T3ZlcmZsb3dpbmcgPSBmYWxzZTtcbiAgICAgIHRoaXMuX2lnbm9yZUJhY2tkcm9wQ2xpY2sgPSBmYWxzZTtcbiAgICAgIHRoaXMuX2lzVHJhbnNpdGlvbmluZyA9IGZhbHNlO1xuICAgICAgdGhpcy5fb3JpZ2luYWxCb2R5UGFkZGluZyA9IDA7XG4gICAgICB0aGlzLl9zY3JvbGxiYXJXaWR0aCA9IDA7XG4gICAgfVxuXG4gICAgLy8gZ2V0dGVyc1xuXG4gICAgLy8gcHVibGljXG5cbiAgICBNb2RhbC5wcm90b3R5cGUudG9nZ2xlID0gZnVuY3Rpb24gdG9nZ2xlKHJlbGF0ZWRUYXJnZXQpIHtcbiAgICAgIHJldHVybiB0aGlzLl9pc1Nob3duID8gdGhpcy5oaWRlKCkgOiB0aGlzLnNob3cocmVsYXRlZFRhcmdldCk7XG4gICAgfTtcblxuICAgIE1vZGFsLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gc2hvdyhyZWxhdGVkVGFyZ2V0KSB7XG4gICAgICB2YXIgX3RoaXM5ID0gdGhpcztcblxuICAgICAgaWYgKHRoaXMuX2lzVHJhbnNpdGlvbmluZykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01vZGFsIGlzIHRyYW5zaXRpb25pbmcnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKFV0aWwuc3VwcG9ydHNUcmFuc2l0aW9uRW5kKCkgJiYgJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUuRkFERSkpIHtcbiAgICAgICAgdGhpcy5faXNUcmFuc2l0aW9uaW5nID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHZhciBzaG93RXZlbnQgPSAkLkV2ZW50KEV2ZW50LlNIT1csIHtcbiAgICAgICAgcmVsYXRlZFRhcmdldDogcmVsYXRlZFRhcmdldFxuICAgICAgfSk7XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkudHJpZ2dlcihzaG93RXZlbnQpO1xuXG4gICAgICBpZiAodGhpcy5faXNTaG93biB8fCBzaG93RXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9pc1Nob3duID0gdHJ1ZTtcblxuICAgICAgdGhpcy5fY2hlY2tTY3JvbGxiYXIoKTtcbiAgICAgIHRoaXMuX3NldFNjcm9sbGJhcigpO1xuXG4gICAgICAkKGRvY3VtZW50LmJvZHkpLmFkZENsYXNzKENsYXNzTmFtZS5PUEVOKTtcblxuICAgICAgdGhpcy5fc2V0RXNjYXBlRXZlbnQoKTtcbiAgICAgIHRoaXMuX3NldFJlc2l6ZUV2ZW50KCk7XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkub24oRXZlbnQuQ0xJQ0tfRElTTUlTUywgU2VsZWN0b3IuREFUQV9ESVNNSVNTLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgcmV0dXJuIF90aGlzOS5oaWRlKGV2ZW50KTtcbiAgICAgIH0pO1xuXG4gICAgICAkKHRoaXMuX2RpYWxvZykub24oRXZlbnQuTU9VU0VET1dOX0RJU01JU1MsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJChfdGhpczkuX2VsZW1lbnQpLm9uZShFdmVudC5NT1VTRVVQX0RJU01JU1MsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIGlmICgkKGV2ZW50LnRhcmdldCkuaXMoX3RoaXM5Ll9lbGVtZW50KSkge1xuICAgICAgICAgICAgX3RoaXM5Ll9pZ25vcmVCYWNrZHJvcENsaWNrID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuX3Nob3dCYWNrZHJvcChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBfdGhpczkuX3Nob3dFbGVtZW50KHJlbGF0ZWRUYXJnZXQpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIE1vZGFsLnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24gaGlkZShldmVudCkge1xuICAgICAgdmFyIF90aGlzMTAgPSB0aGlzO1xuXG4gICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2lzVHJhbnNpdGlvbmluZykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01vZGFsIGlzIHRyYW5zaXRpb25pbmcnKTtcbiAgICAgIH1cblxuICAgICAgdmFyIHRyYW5zaXRpb24gPSBVdGlsLnN1cHBvcnRzVHJhbnNpdGlvbkVuZCgpICYmICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkZBREUpO1xuICAgICAgaWYgKHRyYW5zaXRpb24pIHtcbiAgICAgICAgdGhpcy5faXNUcmFuc2l0aW9uaW5nID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgdmFyIGhpZGVFdmVudCA9ICQuRXZlbnQoRXZlbnQuSElERSk7XG4gICAgICAkKHRoaXMuX2VsZW1lbnQpLnRyaWdnZXIoaGlkZUV2ZW50KTtcblxuICAgICAgaWYgKCF0aGlzLl9pc1Nob3duIHx8IGhpZGVFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2lzU2hvd24gPSBmYWxzZTtcblxuICAgICAgdGhpcy5fc2V0RXNjYXBlRXZlbnQoKTtcbiAgICAgIHRoaXMuX3NldFJlc2l6ZUV2ZW50KCk7XG5cbiAgICAgICQoZG9jdW1lbnQpLm9mZihFdmVudC5GT0NVU0lOKTtcblxuICAgICAgJCh0aGlzLl9lbGVtZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuU0hPVyk7XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkub2ZmKEV2ZW50LkNMSUNLX0RJU01JU1MpO1xuICAgICAgJCh0aGlzLl9kaWFsb2cpLm9mZihFdmVudC5NT1VTRURPV05fRElTTUlTUyk7XG5cbiAgICAgIGlmICh0cmFuc2l0aW9uKSB7XG4gICAgICAgICQodGhpcy5fZWxlbWVudCkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIHJldHVybiBfdGhpczEwLl9oaWRlTW9kYWwoZXZlbnQpO1xuICAgICAgICB9KS5lbXVsYXRlVHJhbnNpdGlvbkVuZChUUkFOU0lUSU9OX0RVUkFUSU9OKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2hpZGVNb2RhbCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBNb2RhbC5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgICAkLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkpO1xuXG4gICAgICAkKHdpbmRvdywgZG9jdW1lbnQsIHRoaXMuX2VsZW1lbnQsIHRoaXMuX2JhY2tkcm9wKS5vZmYoRVZFTlRfS0VZKTtcblxuICAgICAgdGhpcy5fY29uZmlnID0gbnVsbDtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgICAgdGhpcy5fZGlhbG9nID0gbnVsbDtcbiAgICAgIHRoaXMuX2JhY2tkcm9wID0gbnVsbDtcbiAgICAgIHRoaXMuX2lzU2hvd24gPSBudWxsO1xuICAgICAgdGhpcy5faXNCb2R5T3ZlcmZsb3dpbmcgPSBudWxsO1xuICAgICAgdGhpcy5faWdub3JlQmFja2Ryb3BDbGljayA9IG51bGw7XG4gICAgICB0aGlzLl9vcmlnaW5hbEJvZHlQYWRkaW5nID0gbnVsbDtcbiAgICAgIHRoaXMuX3Njcm9sbGJhcldpZHRoID0gbnVsbDtcbiAgICB9O1xuXG4gICAgLy8gcHJpdmF0ZVxuXG4gICAgTW9kYWwucHJvdG90eXBlLl9nZXRDb25maWcgPSBmdW5jdGlvbiBfZ2V0Q29uZmlnKGNvbmZpZykge1xuICAgICAgY29uZmlnID0gJC5leHRlbmQoe30sIERlZmF1bHQsIGNvbmZpZyk7XG4gICAgICBVdGlsLnR5cGVDaGVja0NvbmZpZyhOQU1FLCBjb25maWcsIERlZmF1bHRUeXBlKTtcbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfTtcblxuICAgIE1vZGFsLnByb3RvdHlwZS5fc2hvd0VsZW1lbnQgPSBmdW5jdGlvbiBfc2hvd0VsZW1lbnQocmVsYXRlZFRhcmdldCkge1xuICAgICAgdmFyIF90aGlzMTEgPSB0aGlzO1xuXG4gICAgICB2YXIgdHJhbnNpdGlvbiA9IFV0aWwuc3VwcG9ydHNUcmFuc2l0aW9uRW5kKCkgJiYgJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUuRkFERSk7XG5cbiAgICAgIGlmICghdGhpcy5fZWxlbWVudC5wYXJlbnROb2RlIHx8IHRoaXMuX2VsZW1lbnQucGFyZW50Tm9kZS5ub2RlVHlwZSAhPT0gTm9kZS5FTEVNRU5UX05PREUpIHtcbiAgICAgICAgLy8gZG9uJ3QgbW92ZSBtb2RhbHMgZG9tIHBvc2l0aW9uXG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5fZWxlbWVudCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gICAgICB0aGlzLl9lbGVtZW50LnJlbW92ZUF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nKTtcbiAgICAgIHRoaXMuX2VsZW1lbnQuc2Nyb2xsVG9wID0gMDtcblxuICAgICAgaWYgKHRyYW5zaXRpb24pIHtcbiAgICAgICAgVXRpbC5yZWZsb3codGhpcy5fZWxlbWVudCk7XG4gICAgICB9XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkuYWRkQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpO1xuXG4gICAgICBpZiAodGhpcy5fY29uZmlnLmZvY3VzKSB7XG4gICAgICAgIHRoaXMuX2VuZm9yY2VGb2N1cygpO1xuICAgICAgfVxuXG4gICAgICB2YXIgc2hvd25FdmVudCA9ICQuRXZlbnQoRXZlbnQuU0hPV04sIHtcbiAgICAgICAgcmVsYXRlZFRhcmdldDogcmVsYXRlZFRhcmdldFxuICAgICAgfSk7XG5cbiAgICAgIHZhciB0cmFuc2l0aW9uQ29tcGxldGUgPSBmdW5jdGlvbiB0cmFuc2l0aW9uQ29tcGxldGUoKSB7XG4gICAgICAgIGlmIChfdGhpczExLl9jb25maWcuZm9jdXMpIHtcbiAgICAgICAgICBfdGhpczExLl9lbGVtZW50LmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICAgICAgX3RoaXMxMS5faXNUcmFuc2l0aW9uaW5nID0gZmFsc2U7XG4gICAgICAgICQoX3RoaXMxMS5fZWxlbWVudCkudHJpZ2dlcihzaG93bkV2ZW50KTtcbiAgICAgIH07XG5cbiAgICAgIGlmICh0cmFuc2l0aW9uKSB7XG4gICAgICAgICQodGhpcy5fZGlhbG9nKS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgdHJhbnNpdGlvbkNvbXBsZXRlKS5lbXVsYXRlVHJhbnNpdGlvbkVuZChUUkFOU0lUSU9OX0RVUkFUSU9OKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRyYW5zaXRpb25Db21wbGV0ZSgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBNb2RhbC5wcm90b3R5cGUuX2VuZm9yY2VGb2N1cyA9IGZ1bmN0aW9uIF9lbmZvcmNlRm9jdXMoKSB7XG4gICAgICB2YXIgX3RoaXMxMiA9IHRoaXM7XG5cbiAgICAgICQoZG9jdW1lbnQpLm9mZihFdmVudC5GT0NVU0lOKSAvLyBndWFyZCBhZ2FpbnN0IGluZmluaXRlIGZvY3VzIGxvb3BcbiAgICAgIC5vbihFdmVudC5GT0NVU0lOLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgaWYgKGRvY3VtZW50ICE9PSBldmVudC50YXJnZXQgJiYgX3RoaXMxMi5fZWxlbWVudCAhPT0gZXZlbnQudGFyZ2V0ICYmICEkKF90aGlzMTIuX2VsZW1lbnQpLmhhcyhldmVudC50YXJnZXQpLmxlbmd0aCkge1xuICAgICAgICAgIF90aGlzMTIuX2VsZW1lbnQuZm9jdXMoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIE1vZGFsLnByb3RvdHlwZS5fc2V0RXNjYXBlRXZlbnQgPSBmdW5jdGlvbiBfc2V0RXNjYXBlRXZlbnQoKSB7XG4gICAgICB2YXIgX3RoaXMxMyA9IHRoaXM7XG5cbiAgICAgIGlmICh0aGlzLl9pc1Nob3duICYmIHRoaXMuX2NvbmZpZy5rZXlib2FyZCkge1xuICAgICAgICAkKHRoaXMuX2VsZW1lbnQpLm9uKEV2ZW50LktFWURPV05fRElTTUlTUywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKGV2ZW50LndoaWNoID09PSBFU0NBUEVfS0VZQ09ERSkge1xuICAgICAgICAgICAgX3RoaXMxMy5oaWRlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoIXRoaXMuX2lzU2hvd24pIHtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vZmYoRXZlbnQuS0VZRE9XTl9ESVNNSVNTKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgTW9kYWwucHJvdG90eXBlLl9zZXRSZXNpemVFdmVudCA9IGZ1bmN0aW9uIF9zZXRSZXNpemVFdmVudCgpIHtcbiAgICAgIHZhciBfdGhpczE0ID0gdGhpcztcblxuICAgICAgaWYgKHRoaXMuX2lzU2hvd24pIHtcbiAgICAgICAgJCh3aW5kb3cpLm9uKEV2ZW50LlJFU0laRSwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzMTQuX2hhbmRsZVVwZGF0ZShldmVudCk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJCh3aW5kb3cpLm9mZihFdmVudC5SRVNJWkUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBNb2RhbC5wcm90b3R5cGUuX2hpZGVNb2RhbCA9IGZ1bmN0aW9uIF9oaWRlTW9kYWwoKSB7XG4gICAgICB2YXIgX3RoaXMxNSA9IHRoaXM7XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgIHRoaXMuX2VsZW1lbnQuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG4gICAgICB0aGlzLl9pc1RyYW5zaXRpb25pbmcgPSBmYWxzZTtcbiAgICAgIHRoaXMuX3Nob3dCYWNrZHJvcChmdW5jdGlvbiAoKSB7XG4gICAgICAgICQoZG9jdW1lbnQuYm9keSkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLk9QRU4pO1xuICAgICAgICBfdGhpczE1Ll9yZXNldEFkanVzdG1lbnRzKCk7XG4gICAgICAgIF90aGlzMTUuX3Jlc2V0U2Nyb2xsYmFyKCk7XG4gICAgICAgICQoX3RoaXMxNS5fZWxlbWVudCkudHJpZ2dlcihFdmVudC5ISURERU4pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIE1vZGFsLnByb3RvdHlwZS5fcmVtb3ZlQmFja2Ryb3AgPSBmdW5jdGlvbiBfcmVtb3ZlQmFja2Ryb3AoKSB7XG4gICAgICBpZiAodGhpcy5fYmFja2Ryb3ApIHtcbiAgICAgICAgJCh0aGlzLl9iYWNrZHJvcCkucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuX2JhY2tkcm9wID0gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgTW9kYWwucHJvdG90eXBlLl9zaG93QmFja2Ryb3AgPSBmdW5jdGlvbiBfc2hvd0JhY2tkcm9wKGNhbGxiYWNrKSB7XG4gICAgICB2YXIgX3RoaXMxNiA9IHRoaXM7XG5cbiAgICAgIHZhciBhbmltYXRlID0gJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUuRkFERSkgPyBDbGFzc05hbWUuRkFERSA6ICcnO1xuXG4gICAgICBpZiAodGhpcy5faXNTaG93biAmJiB0aGlzLl9jb25maWcuYmFja2Ryb3ApIHtcbiAgICAgICAgdmFyIGRvQW5pbWF0ZSA9IFV0aWwuc3VwcG9ydHNUcmFuc2l0aW9uRW5kKCkgJiYgYW5pbWF0ZTtcblxuICAgICAgICB0aGlzLl9iYWNrZHJvcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICB0aGlzLl9iYWNrZHJvcC5jbGFzc05hbWUgPSBDbGFzc05hbWUuQkFDS0RST1A7XG5cbiAgICAgICAgaWYgKGFuaW1hdGUpIHtcbiAgICAgICAgICAkKHRoaXMuX2JhY2tkcm9wKS5hZGRDbGFzcyhhbmltYXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgICQodGhpcy5fYmFja2Ryb3ApLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpO1xuXG4gICAgICAgICQodGhpcy5fZWxlbWVudCkub24oRXZlbnQuQ0xJQ0tfRElTTUlTUywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKF90aGlzMTYuX2lnbm9yZUJhY2tkcm9wQ2xpY2spIHtcbiAgICAgICAgICAgIF90aGlzMTYuX2lnbm9yZUJhY2tkcm9wQ2xpY2sgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGV2ZW50LnRhcmdldCAhPT0gZXZlbnQuY3VycmVudFRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoX3RoaXMxNi5fY29uZmlnLmJhY2tkcm9wID09PSAnc3RhdGljJykge1xuICAgICAgICAgICAgX3RoaXMxNi5fZWxlbWVudC5mb2N1cygpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfdGhpczE2LmhpZGUoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChkb0FuaW1hdGUpIHtcbiAgICAgICAgICBVdGlsLnJlZmxvdyh0aGlzLl9iYWNrZHJvcCk7XG4gICAgICAgIH1cblxuICAgICAgICAkKHRoaXMuX2JhY2tkcm9wKS5hZGRDbGFzcyhDbGFzc05hbWUuU0hPVyk7XG5cbiAgICAgICAgaWYgKCFjYWxsYmFjaykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghZG9BbmltYXRlKSB7XG4gICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAkKHRoaXMuX2JhY2tkcm9wKS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgY2FsbGJhY2spLmVtdWxhdGVUcmFuc2l0aW9uRW5kKEJBQ0tEUk9QX1RSQU5TSVRJT05fRFVSQVRJT04pO1xuICAgICAgfSBlbHNlIGlmICghdGhpcy5faXNTaG93biAmJiB0aGlzLl9iYWNrZHJvcCkge1xuICAgICAgICAkKHRoaXMuX2JhY2tkcm9wKS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuU0hPVyk7XG5cbiAgICAgICAgdmFyIGNhbGxiYWNrUmVtb3ZlID0gZnVuY3Rpb24gY2FsbGJhY2tSZW1vdmUoKSB7XG4gICAgICAgICAgX3RoaXMxNi5fcmVtb3ZlQmFja2Ryb3AoKTtcbiAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChVdGlsLnN1cHBvcnRzVHJhbnNpdGlvbkVuZCgpICYmICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkZBREUpKSB7XG4gICAgICAgICAgJCh0aGlzLl9iYWNrZHJvcCkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGNhbGxiYWNrUmVtb3ZlKS5lbXVsYXRlVHJhbnNpdGlvbkVuZChCQUNLRFJPUF9UUkFOU0lUSU9OX0RVUkFUSU9OKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjYWxsYmFja1JlbW92ZSgpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyB0aGUgZm9sbG93aW5nIG1ldGhvZHMgYXJlIHVzZWQgdG8gaGFuZGxlIG92ZXJmbG93aW5nIG1vZGFsc1xuICAgIC8vIHRvZG8gKGZhdCk6IHRoZXNlIHNob3VsZCBwcm9iYWJseSBiZSByZWZhY3RvcmVkIG91dCBvZiBtb2RhbC5qc1xuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAgIE1vZGFsLnByb3RvdHlwZS5faGFuZGxlVXBkYXRlID0gZnVuY3Rpb24gX2hhbmRsZVVwZGF0ZSgpIHtcbiAgICAgIHRoaXMuX2FkanVzdERpYWxvZygpO1xuICAgIH07XG5cbiAgICBNb2RhbC5wcm90b3R5cGUuX2FkanVzdERpYWxvZyA9IGZ1bmN0aW9uIF9hZGp1c3REaWFsb2coKSB7XG4gICAgICB2YXIgaXNNb2RhbE92ZXJmbG93aW5nID0gdGhpcy5fZWxlbWVudC5zY3JvbGxIZWlnaHQgPiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0O1xuXG4gICAgICBpZiAoIXRoaXMuX2lzQm9keU92ZXJmbG93aW5nICYmIGlzTW9kYWxPdmVyZmxvd2luZykge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLnBhZGRpbmdMZWZ0ID0gdGhpcy5fc2Nyb2xsYmFyV2lkdGggKyAncHgnO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5faXNCb2R5T3ZlcmZsb3dpbmcgJiYgIWlzTW9kYWxPdmVyZmxvd2luZykge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLnBhZGRpbmdSaWdodCA9IHRoaXMuX3Njcm9sbGJhcldpZHRoICsgJ3B4JztcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgTW9kYWwucHJvdG90eXBlLl9yZXNldEFkanVzdG1lbnRzID0gZnVuY3Rpb24gX3Jlc2V0QWRqdXN0bWVudHMoKSB7XG4gICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLnBhZGRpbmdMZWZ0ID0gJyc7XG4gICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLnBhZGRpbmdSaWdodCA9ICcnO1xuICAgIH07XG5cbiAgICBNb2RhbC5wcm90b3R5cGUuX2NoZWNrU2Nyb2xsYmFyID0gZnVuY3Rpb24gX2NoZWNrU2Nyb2xsYmFyKCkge1xuICAgICAgdGhpcy5faXNCb2R5T3ZlcmZsb3dpbmcgPSBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoIDwgd2luZG93LmlubmVyV2lkdGg7XG4gICAgICB0aGlzLl9zY3JvbGxiYXJXaWR0aCA9IHRoaXMuX2dldFNjcm9sbGJhcldpZHRoKCk7XG4gICAgfTtcblxuICAgIE1vZGFsLnByb3RvdHlwZS5fc2V0U2Nyb2xsYmFyID0gZnVuY3Rpb24gX3NldFNjcm9sbGJhcigpIHtcbiAgICAgIHZhciBib2R5UGFkZGluZyA9IHBhcnNlSW50KCQoU2VsZWN0b3IuRklYRURfQ09OVEVOVCkuY3NzKCdwYWRkaW5nLXJpZ2h0JykgfHwgMCwgMTApO1xuXG4gICAgICB0aGlzLl9vcmlnaW5hbEJvZHlQYWRkaW5nID0gZG9jdW1lbnQuYm9keS5zdHlsZS5wYWRkaW5nUmlnaHQgfHwgJyc7XG5cbiAgICAgIGlmICh0aGlzLl9pc0JvZHlPdmVyZmxvd2luZykge1xuICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLnBhZGRpbmdSaWdodCA9IGJvZHlQYWRkaW5nICsgdGhpcy5fc2Nyb2xsYmFyV2lkdGggKyAncHgnO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBNb2RhbC5wcm90b3R5cGUuX3Jlc2V0U2Nyb2xsYmFyID0gZnVuY3Rpb24gX3Jlc2V0U2Nyb2xsYmFyKCkge1xuICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5wYWRkaW5nUmlnaHQgPSB0aGlzLl9vcmlnaW5hbEJvZHlQYWRkaW5nO1xuICAgIH07XG5cbiAgICBNb2RhbC5wcm90b3R5cGUuX2dldFNjcm9sbGJhcldpZHRoID0gZnVuY3Rpb24gX2dldFNjcm9sbGJhcldpZHRoKCkge1xuICAgICAgLy8gdGh4IGQud2Fsc2hcbiAgICAgIHZhciBzY3JvbGxEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIHNjcm9sbERpdi5jbGFzc05hbWUgPSBDbGFzc05hbWUuU0NST0xMQkFSX01FQVNVUkVSO1xuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzY3JvbGxEaXYpO1xuICAgICAgdmFyIHNjcm9sbGJhcldpZHRoID0gc2Nyb2xsRGl2Lm9mZnNldFdpZHRoIC0gc2Nyb2xsRGl2LmNsaWVudFdpZHRoO1xuICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChzY3JvbGxEaXYpO1xuICAgICAgcmV0dXJuIHNjcm9sbGJhcldpZHRoO1xuICAgIH07XG5cbiAgICAvLyBzdGF0aWNcblxuICAgIE1vZGFsLl9qUXVlcnlJbnRlcmZhY2UgPSBmdW5jdGlvbiBfalF1ZXJ5SW50ZXJmYWNlKGNvbmZpZywgcmVsYXRlZFRhcmdldCkge1xuICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkYXRhID0gJCh0aGlzKS5kYXRhKERBVEFfS0VZKTtcbiAgICAgICAgdmFyIF9jb25maWcgPSAkLmV4dGVuZCh7fSwgTW9kYWwuRGVmYXVsdCwgJCh0aGlzKS5kYXRhKCksICh0eXBlb2YgY29uZmlnID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZihjb25maWcpKSA9PT0gJ29iamVjdCcgJiYgY29uZmlnKTtcblxuICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICBkYXRhID0gbmV3IE1vZGFsKHRoaXMsIF9jb25maWcpO1xuICAgICAgICAgICQodGhpcykuZGF0YShEQVRBX0tFWSwgZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBpZiAoZGF0YVtjb25maWddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gbWV0aG9kIG5hbWVkIFwiJyArIGNvbmZpZyArICdcIicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkYXRhW2NvbmZpZ10ocmVsYXRlZFRhcmdldCk7XG4gICAgICAgIH0gZWxzZSBpZiAoX2NvbmZpZy5zaG93KSB7XG4gICAgICAgICAgZGF0YS5zaG93KHJlbGF0ZWRUYXJnZXQpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKE1vZGFsLCBudWxsLCBbe1xuICAgICAga2V5OiAnVkVSU0lPTicsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIFZFUlNJT047XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiAnRGVmYXVsdCcsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIERlZmF1bHQ7XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIE1vZGFsO1xuICB9KCk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgJChkb2N1bWVudCkub24oRXZlbnQuQ0xJQ0tfREFUQV9BUEksIFNlbGVjdG9yLkRBVEFfVE9HR0xFLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB2YXIgX3RoaXMxNyA9IHRoaXM7XG5cbiAgICB2YXIgdGFyZ2V0ID0gdm9pZCAwO1xuICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudCh0aGlzKTtcblxuICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgdGFyZ2V0ID0gJChzZWxlY3RvcilbMF07XG4gICAgfVxuXG4gICAgdmFyIGNvbmZpZyA9ICQodGFyZ2V0KS5kYXRhKERBVEFfS0VZKSA/ICd0b2dnbGUnIDogJC5leHRlbmQoe30sICQodGFyZ2V0KS5kYXRhKCksICQodGhpcykuZGF0YSgpKTtcblxuICAgIGlmICh0aGlzLnRhZ05hbWUgPT09ICdBJyB8fCB0aGlzLnRhZ05hbWUgPT09ICdBUkVBJykge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICB2YXIgJHRhcmdldCA9ICQodGFyZ2V0KS5vbmUoRXZlbnQuU0hPVywgZnVuY3Rpb24gKHNob3dFdmVudCkge1xuICAgICAgaWYgKHNob3dFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICAvLyBvbmx5IHJlZ2lzdGVyIGZvY3VzIHJlc3RvcmVyIGlmIG1vZGFsIHdpbGwgYWN0dWFsbHkgZ2V0IHNob3duXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgJHRhcmdldC5vbmUoRXZlbnQuSElEREVOLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICgkKF90aGlzMTcpLmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgX3RoaXMxNy5mb2N1cygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIE1vZGFsLl9qUXVlcnlJbnRlcmZhY2UuY2FsbCgkKHRhcmdldCksIGNvbmZpZywgdGhpcyk7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogalF1ZXJ5XG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAkLmZuW05BTUVdID0gTW9kYWwuX2pRdWVyeUludGVyZmFjZTtcbiAgJC5mbltOQU1FXS5Db25zdHJ1Y3RvciA9IE1vZGFsO1xuICAkLmZuW05BTUVdLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgJC5mbltOQU1FXSA9IEpRVUVSWV9OT19DT05GTElDVDtcbiAgICByZXR1cm4gTW9kYWwuX2pRdWVyeUludGVyZmFjZTtcbiAgfTtcblxuICByZXR1cm4gTW9kYWw7XG59KGpRdWVyeSk7XG5cbi8qKlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIEJvb3RzdHJhcCAodjQuMC4wLWFscGhhLjYpOiBzY3JvbGxzcHkuanNcbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL3R3YnMvYm9vdHN0cmFwL2Jsb2IvbWFzdGVyL0xJQ0VOU0UpXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICovXG5cbnZhciBTY3JvbGxTcHkgPSBmdW5jdGlvbiAoJCkge1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ29uc3RhbnRzXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgTkFNRSA9ICdzY3JvbGxzcHknO1xuICB2YXIgVkVSU0lPTiA9ICc0LjAuMC1hbHBoYS42JztcbiAgdmFyIERBVEFfS0VZID0gJ2JzLnNjcm9sbHNweSc7XG4gIHZhciBFVkVOVF9LRVkgPSAnLicgKyBEQVRBX0tFWTtcbiAgdmFyIERBVEFfQVBJX0tFWSA9ICcuZGF0YS1hcGknO1xuICB2YXIgSlFVRVJZX05PX0NPTkZMSUNUID0gJC5mbltOQU1FXTtcblxuICB2YXIgRGVmYXVsdCA9IHtcbiAgICBvZmZzZXQ6IDEwLFxuICAgIG1ldGhvZDogJ2F1dG8nLFxuICAgIHRhcmdldDogJydcbiAgfTtcblxuICB2YXIgRGVmYXVsdFR5cGUgPSB7XG4gICAgb2Zmc2V0OiAnbnVtYmVyJyxcbiAgICBtZXRob2Q6ICdzdHJpbmcnLFxuICAgIHRhcmdldDogJyhzdHJpbmd8ZWxlbWVudCknXG4gIH07XG5cbiAgdmFyIEV2ZW50ID0ge1xuICAgIEFDVElWQVRFOiAnYWN0aXZhdGUnICsgRVZFTlRfS0VZLFxuICAgIFNDUk9MTDogJ3Njcm9sbCcgKyBFVkVOVF9LRVksXG4gICAgTE9BRF9EQVRBX0FQSTogJ2xvYWQnICsgRVZFTlRfS0VZICsgREFUQV9BUElfS0VZXG4gIH07XG5cbiAgdmFyIENsYXNzTmFtZSA9IHtcbiAgICBEUk9QRE9XTl9JVEVNOiAnZHJvcGRvd24taXRlbScsXG4gICAgRFJPUERPV05fTUVOVTogJ2Ryb3Bkb3duLW1lbnUnLFxuICAgIE5BVl9MSU5LOiAnbmF2LWxpbmsnLFxuICAgIE5BVjogJ25hdicsXG4gICAgQUNUSVZFOiAnYWN0aXZlJ1xuICB9O1xuXG4gIHZhciBTZWxlY3RvciA9IHtcbiAgICBEQVRBX1NQWTogJ1tkYXRhLXNweT1cInNjcm9sbFwiXScsXG4gICAgQUNUSVZFOiAnLmFjdGl2ZScsXG4gICAgTElTVF9JVEVNOiAnLmxpc3QtaXRlbScsXG4gICAgTEk6ICdsaScsXG4gICAgTElfRFJPUERPV046ICdsaS5kcm9wZG93bicsXG4gICAgTkFWX0xJTktTOiAnLm5hdi1saW5rJyxcbiAgICBEUk9QRE9XTjogJy5kcm9wZG93bicsXG4gICAgRFJPUERPV05fSVRFTVM6ICcuZHJvcGRvd24taXRlbScsXG4gICAgRFJPUERPV05fVE9HR0xFOiAnLmRyb3Bkb3duLXRvZ2dsZSdcbiAgfTtcblxuICB2YXIgT2Zmc2V0TWV0aG9kID0ge1xuICAgIE9GRlNFVDogJ29mZnNldCcsXG4gICAgUE9TSVRJT046ICdwb3NpdGlvbidcbiAgfTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIENsYXNzIERlZmluaXRpb25cbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBTY3JvbGxTcHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU2Nyb2xsU3B5KGVsZW1lbnQsIGNvbmZpZykge1xuICAgICAgdmFyIF90aGlzMTggPSB0aGlzO1xuXG4gICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgU2Nyb2xsU3B5KTtcblxuICAgICAgdGhpcy5fZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICB0aGlzLl9zY3JvbGxFbGVtZW50ID0gZWxlbWVudC50YWdOYW1lID09PSAnQk9EWScgPyB3aW5kb3cgOiBlbGVtZW50O1xuICAgICAgdGhpcy5fY29uZmlnID0gdGhpcy5fZ2V0Q29uZmlnKGNvbmZpZyk7XG4gICAgICB0aGlzLl9zZWxlY3RvciA9IHRoaXMuX2NvbmZpZy50YXJnZXQgKyAnICcgKyBTZWxlY3Rvci5OQVZfTElOS1MgKyAnLCcgKyAodGhpcy5fY29uZmlnLnRhcmdldCArICcgJyArIFNlbGVjdG9yLkRST1BET1dOX0lURU1TKTtcbiAgICAgIHRoaXMuX29mZnNldHMgPSBbXTtcbiAgICAgIHRoaXMuX3RhcmdldHMgPSBbXTtcbiAgICAgIHRoaXMuX2FjdGl2ZVRhcmdldCA9IG51bGw7XG4gICAgICB0aGlzLl9zY3JvbGxIZWlnaHQgPSAwO1xuXG4gICAgICAkKHRoaXMuX3Njcm9sbEVsZW1lbnQpLm9uKEV2ZW50LlNDUk9MTCwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHJldHVybiBfdGhpczE4Ll9wcm9jZXNzKGV2ZW50KTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgIHRoaXMuX3Byb2Nlc3MoKTtcbiAgICB9XG5cbiAgICAvLyBnZXR0ZXJzXG5cbiAgICAvLyBwdWJsaWNcblxuICAgIFNjcm9sbFNweS5wcm90b3R5cGUucmVmcmVzaCA9IGZ1bmN0aW9uIHJlZnJlc2goKSB7XG4gICAgICB2YXIgX3RoaXMxOSA9IHRoaXM7XG5cbiAgICAgIHZhciBhdXRvTWV0aG9kID0gdGhpcy5fc2Nyb2xsRWxlbWVudCAhPT0gdGhpcy5fc2Nyb2xsRWxlbWVudC53aW5kb3cgPyBPZmZzZXRNZXRob2QuUE9TSVRJT04gOiBPZmZzZXRNZXRob2QuT0ZGU0VUO1xuXG4gICAgICB2YXIgb2Zmc2V0TWV0aG9kID0gdGhpcy5fY29uZmlnLm1ldGhvZCA9PT0gJ2F1dG8nID8gYXV0b01ldGhvZCA6IHRoaXMuX2NvbmZpZy5tZXRob2Q7XG5cbiAgICAgIHZhciBvZmZzZXRCYXNlID0gb2Zmc2V0TWV0aG9kID09PSBPZmZzZXRNZXRob2QuUE9TSVRJT04gPyB0aGlzLl9nZXRTY3JvbGxUb3AoKSA6IDA7XG5cbiAgICAgIHRoaXMuX29mZnNldHMgPSBbXTtcbiAgICAgIHRoaXMuX3RhcmdldHMgPSBbXTtcblxuICAgICAgdGhpcy5fc2Nyb2xsSGVpZ2h0ID0gdGhpcy5fZ2V0U2Nyb2xsSGVpZ2h0KCk7XG5cbiAgICAgIHZhciB0YXJnZXRzID0gJC5tYWtlQXJyYXkoJCh0aGlzLl9zZWxlY3RvcikpO1xuXG4gICAgICB0YXJnZXRzLm1hcChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB2YXIgdGFyZ2V0ID0gdm9pZCAwO1xuICAgICAgICB2YXIgdGFyZ2V0U2VsZWN0b3IgPSBVdGlsLmdldFNlbGVjdG9yRnJvbUVsZW1lbnQoZWxlbWVudCk7XG5cbiAgICAgICAgaWYgKHRhcmdldFNlbGVjdG9yKSB7XG4gICAgICAgICAgdGFyZ2V0ID0gJCh0YXJnZXRTZWxlY3RvcilbMF07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGFyZ2V0ICYmICh0YXJnZXQub2Zmc2V0V2lkdGggfHwgdGFyZ2V0Lm9mZnNldEhlaWdodCkpIHtcbiAgICAgICAgICAvLyB0b2RvIChmYXQpOiByZW1vdmUgc2tldGNoIHJlbGlhbmNlIG9uIGpRdWVyeSBwb3NpdGlvbi9vZmZzZXRcbiAgICAgICAgICByZXR1cm4gWyQodGFyZ2V0KVtvZmZzZXRNZXRob2RdKCkudG9wICsgb2Zmc2V0QmFzZSwgdGFyZ2V0U2VsZWN0b3JdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIHJldHVybiBpdGVtO1xuICAgICAgfSkuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICByZXR1cm4gYVswXSAtIGJbMF07XG4gICAgICB9KS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIF90aGlzMTkuX29mZnNldHMucHVzaChpdGVtWzBdKTtcbiAgICAgICAgX3RoaXMxOS5fdGFyZ2V0cy5wdXNoKGl0ZW1bMV0pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIFNjcm9sbFNweS5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgICAkLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkpO1xuICAgICAgJCh0aGlzLl9zY3JvbGxFbGVtZW50KS5vZmYoRVZFTlRfS0VZKTtcblxuICAgICAgdGhpcy5fZWxlbWVudCA9IG51bGw7XG4gICAgICB0aGlzLl9zY3JvbGxFbGVtZW50ID0gbnVsbDtcbiAgICAgIHRoaXMuX2NvbmZpZyA9IG51bGw7XG4gICAgICB0aGlzLl9zZWxlY3RvciA9IG51bGw7XG4gICAgICB0aGlzLl9vZmZzZXRzID0gbnVsbDtcbiAgICAgIHRoaXMuX3RhcmdldHMgPSBudWxsO1xuICAgICAgdGhpcy5fYWN0aXZlVGFyZ2V0ID0gbnVsbDtcbiAgICAgIHRoaXMuX3Njcm9sbEhlaWdodCA9IG51bGw7XG4gICAgfTtcblxuICAgIC8vIHByaXZhdGVcblxuICAgIFNjcm9sbFNweS5wcm90b3R5cGUuX2dldENvbmZpZyA9IGZ1bmN0aW9uIF9nZXRDb25maWcoY29uZmlnKSB7XG4gICAgICBjb25maWcgPSAkLmV4dGVuZCh7fSwgRGVmYXVsdCwgY29uZmlnKTtcblxuICAgICAgaWYgKHR5cGVvZiBjb25maWcudGFyZ2V0ICE9PSAnc3RyaW5nJykge1xuICAgICAgICB2YXIgaWQgPSAkKGNvbmZpZy50YXJnZXQpLmF0dHIoJ2lkJyk7XG4gICAgICAgIGlmICghaWQpIHtcbiAgICAgICAgICBpZCA9IFV0aWwuZ2V0VUlEKE5BTUUpO1xuICAgICAgICAgICQoY29uZmlnLnRhcmdldCkuYXR0cignaWQnLCBpZCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uZmlnLnRhcmdldCA9ICcjJyArIGlkO1xuICAgICAgfVxuXG4gICAgICBVdGlsLnR5cGVDaGVja0NvbmZpZyhOQU1FLCBjb25maWcsIERlZmF1bHRUeXBlKTtcblxuICAgICAgcmV0dXJuIGNvbmZpZztcbiAgICB9O1xuXG4gICAgU2Nyb2xsU3B5LnByb3RvdHlwZS5fZ2V0U2Nyb2xsVG9wID0gZnVuY3Rpb24gX2dldFNjcm9sbFRvcCgpIHtcbiAgICAgIHJldHVybiB0aGlzLl9zY3JvbGxFbGVtZW50ID09PSB3aW5kb3cgPyB0aGlzLl9zY3JvbGxFbGVtZW50LnBhZ2VZT2Zmc2V0IDogdGhpcy5fc2Nyb2xsRWxlbWVudC5zY3JvbGxUb3A7XG4gICAgfTtcblxuICAgIFNjcm9sbFNweS5wcm90b3R5cGUuX2dldFNjcm9sbEhlaWdodCA9IGZ1bmN0aW9uIF9nZXRTY3JvbGxIZWlnaHQoKSB7XG4gICAgICByZXR1cm4gdGhpcy5fc2Nyb2xsRWxlbWVudC5zY3JvbGxIZWlnaHQgfHwgTWF0aC5tYXgoZG9jdW1lbnQuYm9keS5zY3JvbGxIZWlnaHQsIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxIZWlnaHQpO1xuICAgIH07XG5cbiAgICBTY3JvbGxTcHkucHJvdG90eXBlLl9nZXRPZmZzZXRIZWlnaHQgPSBmdW5jdGlvbiBfZ2V0T2Zmc2V0SGVpZ2h0KCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3Njcm9sbEVsZW1lbnQgPT09IHdpbmRvdyA/IHdpbmRvdy5pbm5lckhlaWdodCA6IHRoaXMuX3Njcm9sbEVsZW1lbnQub2Zmc2V0SGVpZ2h0O1xuICAgIH07XG5cbiAgICBTY3JvbGxTcHkucHJvdG90eXBlLl9wcm9jZXNzID0gZnVuY3Rpb24gX3Byb2Nlc3MoKSB7XG4gICAgICB2YXIgc2Nyb2xsVG9wID0gdGhpcy5fZ2V0U2Nyb2xsVG9wKCkgKyB0aGlzLl9jb25maWcub2Zmc2V0O1xuICAgICAgdmFyIHNjcm9sbEhlaWdodCA9IHRoaXMuX2dldFNjcm9sbEhlaWdodCgpO1xuICAgICAgdmFyIG1heFNjcm9sbCA9IHRoaXMuX2NvbmZpZy5vZmZzZXQgKyBzY3JvbGxIZWlnaHQgLSB0aGlzLl9nZXRPZmZzZXRIZWlnaHQoKTtcblxuICAgICAgaWYgKHRoaXMuX3Njcm9sbEhlaWdodCAhPT0gc2Nyb2xsSGVpZ2h0KSB7XG4gICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2Nyb2xsVG9wID49IG1heFNjcm9sbCkge1xuICAgICAgICB2YXIgdGFyZ2V0ID0gdGhpcy5fdGFyZ2V0c1t0aGlzLl90YXJnZXRzLmxlbmd0aCAtIDFdO1xuXG4gICAgICAgIGlmICh0aGlzLl9hY3RpdmVUYXJnZXQgIT09IHRhcmdldCkge1xuICAgICAgICAgIHRoaXMuX2FjdGl2YXRlKHRhcmdldCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fYWN0aXZlVGFyZ2V0ICYmIHNjcm9sbFRvcCA8IHRoaXMuX29mZnNldHNbMF0gJiYgdGhpcy5fb2Zmc2V0c1swXSA+IDApIHtcbiAgICAgICAgdGhpcy5fYWN0aXZlVGFyZ2V0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fY2xlYXIoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gdGhpcy5fb2Zmc2V0cy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgdmFyIGlzQWN0aXZlVGFyZ2V0ID0gdGhpcy5fYWN0aXZlVGFyZ2V0ICE9PSB0aGlzLl90YXJnZXRzW2ldICYmIHNjcm9sbFRvcCA+PSB0aGlzLl9vZmZzZXRzW2ldICYmICh0aGlzLl9vZmZzZXRzW2kgKyAxXSA9PT0gdW5kZWZpbmVkIHx8IHNjcm9sbFRvcCA8IHRoaXMuX29mZnNldHNbaSArIDFdKTtcblxuICAgICAgICBpZiAoaXNBY3RpdmVUYXJnZXQpIHtcbiAgICAgICAgICB0aGlzLl9hY3RpdmF0ZSh0aGlzLl90YXJnZXRzW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBTY3JvbGxTcHkucHJvdG90eXBlLl9hY3RpdmF0ZSA9IGZ1bmN0aW9uIF9hY3RpdmF0ZSh0YXJnZXQpIHtcbiAgICAgIHRoaXMuX2FjdGl2ZVRhcmdldCA9IHRhcmdldDtcblxuICAgICAgdGhpcy5fY2xlYXIoKTtcblxuICAgICAgdmFyIHF1ZXJpZXMgPSB0aGlzLl9zZWxlY3Rvci5zcGxpdCgnLCcpO1xuICAgICAgcXVlcmllcyA9IHF1ZXJpZXMubWFwKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgICByZXR1cm4gc2VsZWN0b3IgKyAnW2RhdGEtdGFyZ2V0PVwiJyArIHRhcmdldCArICdcIl0sJyArIChzZWxlY3RvciArICdbaHJlZj1cIicgKyB0YXJnZXQgKyAnXCJdJyk7XG4gICAgICB9KTtcblxuICAgICAgdmFyICRsaW5rID0gJChxdWVyaWVzLmpvaW4oJywnKSk7XG5cbiAgICAgIGlmICgkbGluay5oYXNDbGFzcyhDbGFzc05hbWUuRFJPUERPV05fSVRFTSkpIHtcbiAgICAgICAgJGxpbmsuY2xvc2VzdChTZWxlY3Rvci5EUk9QRE9XTikuZmluZChTZWxlY3Rvci5EUk9QRE9XTl9UT0dHTEUpLmFkZENsYXNzKENsYXNzTmFtZS5BQ1RJVkUpO1xuICAgICAgICAkbGluay5hZGRDbGFzcyhDbGFzc05hbWUuQUNUSVZFKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHRvZG8gKGZhdCkgdGhpcyBpcyBraW5kYSBzdXMuLi5cbiAgICAgICAgLy8gcmVjdXJzaXZlbHkgYWRkIGFjdGl2ZXMgdG8gdGVzdGVkIG5hdi1saW5rc1xuICAgICAgICAkbGluay5wYXJlbnRzKFNlbGVjdG9yLkxJKS5maW5kKCc+ICcgKyBTZWxlY3Rvci5OQVZfTElOS1MpLmFkZENsYXNzKENsYXNzTmFtZS5BQ1RJVkUpO1xuICAgICAgfVxuXG4gICAgICAkKHRoaXMuX3Njcm9sbEVsZW1lbnQpLnRyaWdnZXIoRXZlbnQuQUNUSVZBVEUsIHtcbiAgICAgICAgcmVsYXRlZFRhcmdldDogdGFyZ2V0XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgU2Nyb2xsU3B5LnByb3RvdHlwZS5fY2xlYXIgPSBmdW5jdGlvbiBfY2xlYXIoKSB7XG4gICAgICAkKHRoaXMuX3NlbGVjdG9yKS5maWx0ZXIoU2VsZWN0b3IuQUNUSVZFKS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuQUNUSVZFKTtcbiAgICB9O1xuXG4gICAgLy8gc3RhdGljXG5cbiAgICBTY3JvbGxTcHkuX2pRdWVyeUludGVyZmFjZSA9IGZ1bmN0aW9uIF9qUXVlcnlJbnRlcmZhY2UoY29uZmlnKSB7XG4gICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSAkKHRoaXMpLmRhdGEoREFUQV9LRVkpO1xuICAgICAgICB2YXIgX2NvbmZpZyA9ICh0eXBlb2YgY29uZmlnID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZihjb25maWcpKSA9PT0gJ29iamVjdCcgJiYgY29uZmlnO1xuXG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIGRhdGEgPSBuZXcgU2Nyb2xsU3B5KHRoaXMsIF9jb25maWcpO1xuICAgICAgICAgICQodGhpcykuZGF0YShEQVRBX0tFWSwgZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBpZiAoZGF0YVtjb25maWddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gbWV0aG9kIG5hbWVkIFwiJyArIGNvbmZpZyArICdcIicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkYXRhW2NvbmZpZ10oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIF9jcmVhdGVDbGFzcyhTY3JvbGxTcHksIG51bGwsIFt7XG4gICAgICBrZXk6ICdWRVJTSU9OJyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gVkVSU0lPTjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6ICdEZWZhdWx0JyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRGVmYXVsdDtcbiAgICAgIH1cbiAgICB9XSk7XG5cbiAgICByZXR1cm4gU2Nyb2xsU3B5O1xuICB9KCk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgJCh3aW5kb3cpLm9uKEV2ZW50LkxPQURfREFUQV9BUEksIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2Nyb2xsU3B5cyA9ICQubWFrZUFycmF5KCQoU2VsZWN0b3IuREFUQV9TUFkpKTtcblxuICAgIGZvciAodmFyIGkgPSBzY3JvbGxTcHlzLmxlbmd0aDsgaS0tOykge1xuICAgICAgdmFyICRzcHkgPSAkKHNjcm9sbFNweXNbaV0pO1xuICAgICAgU2Nyb2xsU3B5Ll9qUXVlcnlJbnRlcmZhY2UuY2FsbCgkc3B5LCAkc3B5LmRhdGEoKSk7XG4gICAgfVxuICB9KTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIGpRdWVyeVxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgJC5mbltOQU1FXSA9IFNjcm9sbFNweS5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUVdLkNvbnN0cnVjdG9yID0gU2Nyb2xsU3B5O1xuICAkLmZuW05BTUVdLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgJC5mbltOQU1FXSA9IEpRVUVSWV9OT19DT05GTElDVDtcbiAgICByZXR1cm4gU2Nyb2xsU3B5Ll9qUXVlcnlJbnRlcmZhY2U7XG4gIH07XG5cbiAgcmV0dXJuIFNjcm9sbFNweTtcbn0oalF1ZXJ5KTtcblxuLyoqXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogQm9vdHN0cmFwICh2NC4wLjAtYWxwaGEuNik6IHRhYi5qc1xuICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vdHdicy9ib290c3RyYXAvYmxvYi9tYXN0ZXIvTElDRU5TRSlcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKi9cblxudmFyIFRhYiA9IGZ1bmN0aW9uICgkKSB7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FID0gJ3RhYic7XG4gIHZhciBWRVJTSU9OID0gJzQuMC4wLWFscGhhLjYnO1xuICB2YXIgREFUQV9LRVkgPSAnYnMudGFiJztcbiAgdmFyIEVWRU5UX0tFWSA9ICcuJyArIERBVEFfS0VZO1xuICB2YXIgREFUQV9BUElfS0VZID0gJy5kYXRhLWFwaSc7XG4gIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QgPSAkLmZuW05BTUVdO1xuICB2YXIgVFJBTlNJVElPTl9EVVJBVElPTiA9IDE1MDtcblxuICB2YXIgRXZlbnQgPSB7XG4gICAgSElERTogJ2hpZGUnICsgRVZFTlRfS0VZLFxuICAgIEhJRERFTjogJ2hpZGRlbicgKyBFVkVOVF9LRVksXG4gICAgU0hPVzogJ3Nob3cnICsgRVZFTlRfS0VZLFxuICAgIFNIT1dOOiAnc2hvd24nICsgRVZFTlRfS0VZLFxuICAgIENMSUNLX0RBVEFfQVBJOiAnY2xpY2snICsgRVZFTlRfS0VZICsgREFUQV9BUElfS0VZXG4gIH07XG5cbiAgdmFyIENsYXNzTmFtZSA9IHtcbiAgICBEUk9QRE9XTl9NRU5VOiAnZHJvcGRvd24tbWVudScsXG4gICAgQUNUSVZFOiAnYWN0aXZlJyxcbiAgICBESVNBQkxFRDogJ2Rpc2FibGVkJyxcbiAgICBGQURFOiAnZmFkZScsXG4gICAgU0hPVzogJ3Nob3cnXG4gIH07XG5cbiAgdmFyIFNlbGVjdG9yID0ge1xuICAgIEE6ICdhJyxcbiAgICBMSTogJ2xpJyxcbiAgICBEUk9QRE9XTjogJy5kcm9wZG93bicsXG4gICAgTElTVDogJ3VsOm5vdCguZHJvcGRvd24tbWVudSksIG9sOm5vdCguZHJvcGRvd24tbWVudSksIG5hdjpub3QoLmRyb3Bkb3duLW1lbnUpJyxcbiAgICBGQURFX0NISUxEOiAnPiAubmF2LWl0ZW0gLmZhZGUsID4gLmZhZGUnLFxuICAgIEFDVElWRTogJy5hY3RpdmUnLFxuICAgIEFDVElWRV9DSElMRDogJz4gLm5hdi1pdGVtID4gLmFjdGl2ZSwgPiAuYWN0aXZlJyxcbiAgICBEQVRBX1RPR0dMRTogJ1tkYXRhLXRvZ2dsZT1cInRhYlwiXSwgW2RhdGEtdG9nZ2xlPVwicGlsbFwiXScsXG4gICAgRFJPUERPV05fVE9HR0xFOiAnLmRyb3Bkb3duLXRvZ2dsZScsXG4gICAgRFJPUERPV05fQUNUSVZFX0NISUxEOiAnPiAuZHJvcGRvd24tbWVudSAuYWN0aXZlJ1xuICB9O1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ2xhc3MgRGVmaW5pdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIFRhYiA9IGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBUYWIoZWxlbWVudCkge1xuICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIFRhYik7XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBlbGVtZW50O1xuICAgIH1cblxuICAgIC8vIGdldHRlcnNcblxuICAgIC8vIHB1YmxpY1xuXG4gICAgVGFiLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gc2hvdygpIHtcbiAgICAgIHZhciBfdGhpczIwID0gdGhpcztcblxuICAgICAgaWYgKHRoaXMuX2VsZW1lbnQucGFyZW50Tm9kZSAmJiB0aGlzLl9lbGVtZW50LnBhcmVudE5vZGUubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFICYmICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkFDVElWRSkgfHwgJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUuRElTQUJMRUQpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHRhcmdldCA9IHZvaWQgMDtcbiAgICAgIHZhciBwcmV2aW91cyA9IHZvaWQgMDtcbiAgICAgIHZhciBsaXN0RWxlbWVudCA9ICQodGhpcy5fZWxlbWVudCkuY2xvc2VzdChTZWxlY3Rvci5MSVNUKVswXTtcbiAgICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudCh0aGlzLl9lbGVtZW50KTtcblxuICAgICAgaWYgKGxpc3RFbGVtZW50KSB7XG4gICAgICAgIHByZXZpb3VzID0gJC5tYWtlQXJyYXkoJChsaXN0RWxlbWVudCkuZmluZChTZWxlY3Rvci5BQ1RJVkUpKTtcbiAgICAgICAgcHJldmlvdXMgPSBwcmV2aW91c1twcmV2aW91cy5sZW5ndGggLSAxXTtcbiAgICAgIH1cblxuICAgICAgdmFyIGhpZGVFdmVudCA9ICQuRXZlbnQoRXZlbnQuSElERSwge1xuICAgICAgICByZWxhdGVkVGFyZ2V0OiB0aGlzLl9lbGVtZW50XG4gICAgICB9KTtcblxuICAgICAgdmFyIHNob3dFdmVudCA9ICQuRXZlbnQoRXZlbnQuU0hPVywge1xuICAgICAgICByZWxhdGVkVGFyZ2V0OiBwcmV2aW91c1xuICAgICAgfSk7XG5cbiAgICAgIGlmIChwcmV2aW91cykge1xuICAgICAgICAkKHByZXZpb3VzKS50cmlnZ2VyKGhpZGVFdmVudCk7XG4gICAgICB9XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkudHJpZ2dlcihzaG93RXZlbnQpO1xuXG4gICAgICBpZiAoc2hvd0V2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpIHx8IGhpZGVFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgICB0YXJnZXQgPSAkKHNlbGVjdG9yKVswXTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fYWN0aXZhdGUodGhpcy5fZWxlbWVudCwgbGlzdEVsZW1lbnQpO1xuXG4gICAgICB2YXIgY29tcGxldGUgPSBmdW5jdGlvbiBjb21wbGV0ZSgpIHtcbiAgICAgICAgdmFyIGhpZGRlbkV2ZW50ID0gJC5FdmVudChFdmVudC5ISURERU4sIHtcbiAgICAgICAgICByZWxhdGVkVGFyZ2V0OiBfdGhpczIwLl9lbGVtZW50XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBzaG93bkV2ZW50ID0gJC5FdmVudChFdmVudC5TSE9XTiwge1xuICAgICAgICAgIHJlbGF0ZWRUYXJnZXQ6IHByZXZpb3VzXG4gICAgICAgIH0pO1xuXG4gICAgICAgICQocHJldmlvdXMpLnRyaWdnZXIoaGlkZGVuRXZlbnQpO1xuICAgICAgICAkKF90aGlzMjAuX2VsZW1lbnQpLnRyaWdnZXIoc2hvd25FdmVudCk7XG4gICAgICB9O1xuXG4gICAgICBpZiAodGFyZ2V0KSB7XG4gICAgICAgIHRoaXMuX2FjdGl2YXRlKHRhcmdldCwgdGFyZ2V0LnBhcmVudE5vZGUsIGNvbXBsZXRlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbXBsZXRlKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIFRhYi5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgICAkLnJlbW92ZUNsYXNzKHRoaXMuX2VsZW1lbnQsIERBVEFfS0VZKTtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgIH07XG5cbiAgICAvLyBwcml2YXRlXG5cbiAgICBUYWIucHJvdG90eXBlLl9hY3RpdmF0ZSA9IGZ1bmN0aW9uIF9hY3RpdmF0ZShlbGVtZW50LCBjb250YWluZXIsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgX3RoaXMyMSA9IHRoaXM7XG5cbiAgICAgIHZhciBhY3RpdmUgPSAkKGNvbnRhaW5lcikuZmluZChTZWxlY3Rvci5BQ1RJVkVfQ0hJTEQpWzBdO1xuICAgICAgdmFyIGlzVHJhbnNpdGlvbmluZyA9IGNhbGxiYWNrICYmIFV0aWwuc3VwcG9ydHNUcmFuc2l0aW9uRW5kKCkgJiYgKGFjdGl2ZSAmJiAkKGFjdGl2ZSkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkZBREUpIHx8IEJvb2xlYW4oJChjb250YWluZXIpLmZpbmQoU2VsZWN0b3IuRkFERV9DSElMRClbMF0pKTtcblxuICAgICAgdmFyIGNvbXBsZXRlID0gZnVuY3Rpb24gY29tcGxldGUoKSB7XG4gICAgICAgIHJldHVybiBfdGhpczIxLl90cmFuc2l0aW9uQ29tcGxldGUoZWxlbWVudCwgYWN0aXZlLCBpc1RyYW5zaXRpb25pbmcsIGNhbGxiYWNrKTtcbiAgICAgIH07XG5cbiAgICAgIGlmIChhY3RpdmUgJiYgaXNUcmFuc2l0aW9uaW5nKSB7XG4gICAgICAgICQoYWN0aXZlKS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgY29tcGxldGUpLmVtdWxhdGVUcmFuc2l0aW9uRW5kKFRSQU5TSVRJT05fRFVSQVRJT04pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGxldGUoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGFjdGl2ZSkge1xuICAgICAgICAkKGFjdGl2ZSkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBUYWIucHJvdG90eXBlLl90cmFuc2l0aW9uQ29tcGxldGUgPSBmdW5jdGlvbiBfdHJhbnNpdGlvbkNvbXBsZXRlKGVsZW1lbnQsIGFjdGl2ZSwgaXNUcmFuc2l0aW9uaW5nLCBjYWxsYmFjaykge1xuICAgICAgaWYgKGFjdGl2ZSkge1xuICAgICAgICAkKGFjdGl2ZSkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLkFDVElWRSk7XG5cbiAgICAgICAgdmFyIGRyb3Bkb3duQ2hpbGQgPSAkKGFjdGl2ZS5wYXJlbnROb2RlKS5maW5kKFNlbGVjdG9yLkRST1BET1dOX0FDVElWRV9DSElMRClbMF07XG5cbiAgICAgICAgaWYgKGRyb3Bkb3duQ2hpbGQpIHtcbiAgICAgICAgICAkKGRyb3Bkb3duQ2hpbGQpLnJlbW92ZUNsYXNzKENsYXNzTmFtZS5BQ1RJVkUpO1xuICAgICAgICB9XG5cbiAgICAgICAgYWN0aXZlLnNldEF0dHJpYnV0ZSgnYXJpYS1leHBhbmRlZCcsIGZhbHNlKTtcbiAgICAgIH1cblxuICAgICAgJChlbGVtZW50KS5hZGRDbGFzcyhDbGFzc05hbWUuQUNUSVZFKTtcbiAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdhcmlhLWV4cGFuZGVkJywgdHJ1ZSk7XG5cbiAgICAgIGlmIChpc1RyYW5zaXRpb25pbmcpIHtcbiAgICAgICAgVXRpbC5yZWZsb3coZWxlbWVudCk7XG4gICAgICAgICQoZWxlbWVudCkuYWRkQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJChlbGVtZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuRkFERSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChlbGVtZW50LnBhcmVudE5vZGUgJiYgJChlbGVtZW50LnBhcmVudE5vZGUpLmhhc0NsYXNzKENsYXNzTmFtZS5EUk9QRE9XTl9NRU5VKSkge1xuXG4gICAgICAgIHZhciBkcm9wZG93bkVsZW1lbnQgPSAkKGVsZW1lbnQpLmNsb3Nlc3QoU2VsZWN0b3IuRFJPUERPV04pWzBdO1xuICAgICAgICBpZiAoZHJvcGRvd25FbGVtZW50KSB7XG4gICAgICAgICAgJChkcm9wZG93bkVsZW1lbnQpLmZpbmQoU2VsZWN0b3IuRFJPUERPV05fVE9HR0xFKS5hZGRDbGFzcyhDbGFzc05hbWUuQUNUSVZFKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdhcmlhLWV4cGFuZGVkJywgdHJ1ZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBzdGF0aWNcblxuICAgIFRhYi5falF1ZXJ5SW50ZXJmYWNlID0gZnVuY3Rpb24gX2pRdWVyeUludGVyZmFjZShjb25maWcpIHtcbiAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpO1xuICAgICAgICB2YXIgZGF0YSA9ICR0aGlzLmRhdGEoREFUQV9LRVkpO1xuXG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIGRhdGEgPSBuZXcgVGFiKHRoaXMpO1xuICAgICAgICAgICR0aGlzLmRhdGEoREFUQV9LRVksIGRhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgaWYgKGRhdGFbY29uZmlnXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIG1ldGhvZCBuYW1lZCBcIicgKyBjb25maWcgKyAnXCInKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGF0YVtjb25maWddKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBfY3JlYXRlQ2xhc3MoVGFiLCBudWxsLCBbe1xuICAgICAga2V5OiAnVkVSU0lPTicsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIFZFUlNJT047XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIFRhYjtcbiAgfSgpO1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogRGF0YSBBcGkgaW1wbGVtZW50YXRpb25cbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gICQoZG9jdW1lbnQpLm9uKEV2ZW50LkNMSUNLX0RBVEFfQVBJLCBTZWxlY3Rvci5EQVRBX1RPR0dMRSwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBUYWIuX2pRdWVyeUludGVyZmFjZS5jYWxsKCQodGhpcyksICdzaG93Jyk7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogalF1ZXJ5XG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAkLmZuW05BTUVdID0gVGFiLl9qUXVlcnlJbnRlcmZhY2U7XG4gICQuZm5bTkFNRV0uQ29uc3RydWN0b3IgPSBUYWI7XG4gICQuZm5bTkFNRV0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUVdID0gSlFVRVJZX05PX0NPTkZMSUNUO1xuICAgIHJldHVybiBUYWIuX2pRdWVyeUludGVyZmFjZTtcbiAgfTtcblxuICByZXR1cm4gVGFiO1xufShqUXVlcnkpO1xuXG4vKiBnbG9iYWwgVGV0aGVyICovXG5cbi8qKlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIEJvb3RzdHJhcCAodjQuMC4wLWFscGhhLjYpOiB0b29sdGlwLmpzXG4gKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS90d2JzL2Jvb3RzdHJhcC9ibG9iL21hc3Rlci9MSUNFTlNFKVxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqL1xuXG52YXIgVG9vbHRpcCA9IGZ1bmN0aW9uICgkKSB7XG5cbiAgLyoqXG4gICAqIENoZWNrIGZvciBUZXRoZXIgZGVwZW5kZW5jeVxuICAgKiBUZXRoZXIgLSBodHRwOi8vdGV0aGVyLmlvL1xuICAgKi9cbiAgaWYgKHR5cGVvZiBUZXRoZXIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCb290c3RyYXAgdG9vbHRpcHMgcmVxdWlyZSBUZXRoZXIgKGh0dHA6Ly90ZXRoZXIuaW8vKScpO1xuICB9XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FID0gJ3Rvb2x0aXAnO1xuICB2YXIgVkVSU0lPTiA9ICc0LjAuMC1hbHBoYS42JztcbiAgdmFyIERBVEFfS0VZID0gJ2JzLnRvb2x0aXAnO1xuICB2YXIgRVZFTlRfS0VZID0gJy4nICsgREFUQV9LRVk7XG4gIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QgPSAkLmZuW05BTUVdO1xuICB2YXIgVFJBTlNJVElPTl9EVVJBVElPTiA9IDE1MDtcbiAgdmFyIENMQVNTX1BSRUZJWCA9ICdicy10ZXRoZXInO1xuXG4gIHZhciBEZWZhdWx0ID0ge1xuICAgIGFuaW1hdGlvbjogdHJ1ZSxcbiAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJ0b29sdGlwXCIgcm9sZT1cInRvb2x0aXBcIj4nICsgJzxkaXYgY2xhc3M9XCJ0b29sdGlwLWlubmVyXCI+PC9kaXY+PC9kaXY+JyxcbiAgICB0cmlnZ2VyOiAnaG92ZXIgZm9jdXMnLFxuICAgIHRpdGxlOiAnJyxcbiAgICBkZWxheTogMCxcbiAgICBodG1sOiBmYWxzZSxcbiAgICBzZWxlY3RvcjogZmFsc2UsXG4gICAgcGxhY2VtZW50OiAndG9wJyxcbiAgICBvZmZzZXQ6ICcwIDAnLFxuICAgIGNvbnN0cmFpbnRzOiBbXSxcbiAgICBjb250YWluZXI6IGZhbHNlXG4gIH07XG5cbiAgdmFyIERlZmF1bHRUeXBlID0ge1xuICAgIGFuaW1hdGlvbjogJ2Jvb2xlYW4nLFxuICAgIHRlbXBsYXRlOiAnc3RyaW5nJyxcbiAgICB0aXRsZTogJyhzdHJpbmd8ZWxlbWVudHxmdW5jdGlvbiknLFxuICAgIHRyaWdnZXI6ICdzdHJpbmcnLFxuICAgIGRlbGF5OiAnKG51bWJlcnxvYmplY3QpJyxcbiAgICBodG1sOiAnYm9vbGVhbicsXG4gICAgc2VsZWN0b3I6ICcoc3RyaW5nfGJvb2xlYW4pJyxcbiAgICBwbGFjZW1lbnQ6ICcoc3RyaW5nfGZ1bmN0aW9uKScsXG4gICAgb2Zmc2V0OiAnc3RyaW5nJyxcbiAgICBjb25zdHJhaW50czogJ2FycmF5JyxcbiAgICBjb250YWluZXI6ICcoc3RyaW5nfGVsZW1lbnR8Ym9vbGVhbiknXG4gIH07XG5cbiAgdmFyIEF0dGFjaG1lbnRNYXAgPSB7XG4gICAgVE9QOiAnYm90dG9tIGNlbnRlcicsXG4gICAgUklHSFQ6ICdtaWRkbGUgbGVmdCcsXG4gICAgQk9UVE9NOiAndG9wIGNlbnRlcicsXG4gICAgTEVGVDogJ21pZGRsZSByaWdodCdcbiAgfTtcblxuICB2YXIgSG92ZXJTdGF0ZSA9IHtcbiAgICBTSE9XOiAnc2hvdycsXG4gICAgT1VUOiAnb3V0J1xuICB9O1xuXG4gIHZhciBFdmVudCA9IHtcbiAgICBISURFOiAnaGlkZScgKyBFVkVOVF9LRVksXG4gICAgSElEREVOOiAnaGlkZGVuJyArIEVWRU5UX0tFWSxcbiAgICBTSE9XOiAnc2hvdycgKyBFVkVOVF9LRVksXG4gICAgU0hPV046ICdzaG93bicgKyBFVkVOVF9LRVksXG4gICAgSU5TRVJURUQ6ICdpbnNlcnRlZCcgKyBFVkVOVF9LRVksXG4gICAgQ0xJQ0s6ICdjbGljaycgKyBFVkVOVF9LRVksXG4gICAgRk9DVVNJTjogJ2ZvY3VzaW4nICsgRVZFTlRfS0VZLFxuICAgIEZPQ1VTT1VUOiAnZm9jdXNvdXQnICsgRVZFTlRfS0VZLFxuICAgIE1PVVNFRU5URVI6ICdtb3VzZWVudGVyJyArIEVWRU5UX0tFWSxcbiAgICBNT1VTRUxFQVZFOiAnbW91c2VsZWF2ZScgKyBFVkVOVF9LRVlcbiAgfTtcblxuICB2YXIgQ2xhc3NOYW1lID0ge1xuICAgIEZBREU6ICdmYWRlJyxcbiAgICBTSE9XOiAnc2hvdydcbiAgfTtcblxuICB2YXIgU2VsZWN0b3IgPSB7XG4gICAgVE9PTFRJUDogJy50b29sdGlwJyxcbiAgICBUT09MVElQX0lOTkVSOiAnLnRvb2x0aXAtaW5uZXInXG4gIH07XG5cbiAgdmFyIFRldGhlckNsYXNzID0ge1xuICAgIGVsZW1lbnQ6IGZhbHNlLFxuICAgIGVuYWJsZWQ6IGZhbHNlXG4gIH07XG5cbiAgdmFyIFRyaWdnZXIgPSB7XG4gICAgSE9WRVI6ICdob3ZlcicsXG4gICAgRk9DVVM6ICdmb2N1cycsXG4gICAgQ0xJQ0s6ICdjbGljaycsXG4gICAgTUFOVUFMOiAnbWFudWFsJ1xuICB9O1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ2xhc3MgRGVmaW5pdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIFRvb2x0aXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gVG9vbHRpcChlbGVtZW50LCBjb25maWcpIHtcbiAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBUb29sdGlwKTtcblxuICAgICAgLy8gcHJpdmF0ZVxuICAgICAgdGhpcy5faXNFbmFibGVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuX3RpbWVvdXQgPSAwO1xuICAgICAgdGhpcy5faG92ZXJTdGF0ZSA9ICcnO1xuICAgICAgdGhpcy5fYWN0aXZlVHJpZ2dlciA9IHt9O1xuICAgICAgdGhpcy5faXNUcmFuc2l0aW9uaW5nID0gZmFsc2U7XG4gICAgICB0aGlzLl90ZXRoZXIgPSBudWxsO1xuXG4gICAgICAvLyBwcm90ZWN0ZWRcbiAgICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICB0aGlzLmNvbmZpZyA9IHRoaXMuX2dldENvbmZpZyhjb25maWcpO1xuICAgICAgdGhpcy50aXAgPSBudWxsO1xuXG4gICAgICB0aGlzLl9zZXRMaXN0ZW5lcnMoKTtcbiAgICB9XG5cbiAgICAvLyBnZXR0ZXJzXG5cbiAgICAvLyBwdWJsaWNcblxuICAgIFRvb2x0aXAucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uIGVuYWJsZSgpIHtcbiAgICAgIHRoaXMuX2lzRW5hYmxlZCA9IHRydWU7XG4gICAgfTtcblxuICAgIFRvb2x0aXAucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiBkaXNhYmxlKCkge1xuICAgICAgdGhpcy5faXNFbmFibGVkID0gZmFsc2U7XG4gICAgfTtcblxuICAgIFRvb2x0aXAucHJvdG90eXBlLnRvZ2dsZUVuYWJsZWQgPSBmdW5jdGlvbiB0b2dnbGVFbmFibGVkKCkge1xuICAgICAgdGhpcy5faXNFbmFibGVkID0gIXRoaXMuX2lzRW5hYmxlZDtcbiAgICB9O1xuXG4gICAgVG9vbHRpcC5wcm90b3R5cGUudG9nZ2xlID0gZnVuY3Rpb24gdG9nZ2xlKGV2ZW50KSB7XG4gICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgdmFyIGRhdGFLZXkgPSB0aGlzLmNvbnN0cnVjdG9yLkRBVEFfS0VZO1xuICAgICAgICB2YXIgY29udGV4dCA9ICQoZXZlbnQuY3VycmVudFRhcmdldCkuZGF0YShkYXRhS2V5KTtcblxuICAgICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgICBjb250ZXh0ID0gbmV3IHRoaXMuY29uc3RydWN0b3IoZXZlbnQuY3VycmVudFRhcmdldCwgdGhpcy5fZ2V0RGVsZWdhdGVDb25maWcoKSk7XG4gICAgICAgICAgJChldmVudC5jdXJyZW50VGFyZ2V0KS5kYXRhKGRhdGFLZXksIGNvbnRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGV4dC5fYWN0aXZlVHJpZ2dlci5jbGljayA9ICFjb250ZXh0Ll9hY3RpdmVUcmlnZ2VyLmNsaWNrO1xuXG4gICAgICAgIGlmIChjb250ZXh0Ll9pc1dpdGhBY3RpdmVUcmlnZ2VyKCkpIHtcbiAgICAgICAgICBjb250ZXh0Ll9lbnRlcihudWxsLCBjb250ZXh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb250ZXh0Ll9sZWF2ZShudWxsLCBjb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcblxuICAgICAgICBpZiAoJCh0aGlzLmdldFRpcEVsZW1lbnQoKSkuaGFzQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpKSB7XG4gICAgICAgICAgdGhpcy5fbGVhdmUobnVsbCwgdGhpcyk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fZW50ZXIobnVsbCwgdGhpcyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIFRvb2x0aXAucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX3RpbWVvdXQpO1xuXG4gICAgICB0aGlzLmNsZWFudXBUZXRoZXIoKTtcblxuICAgICAgJC5yZW1vdmVEYXRhKHRoaXMuZWxlbWVudCwgdGhpcy5jb25zdHJ1Y3Rvci5EQVRBX0tFWSk7XG5cbiAgICAgICQodGhpcy5lbGVtZW50KS5vZmYodGhpcy5jb25zdHJ1Y3Rvci5FVkVOVF9LRVkpO1xuICAgICAgJCh0aGlzLmVsZW1lbnQpLmNsb3Nlc3QoJy5tb2RhbCcpLm9mZignaGlkZS5icy5tb2RhbCcpO1xuXG4gICAgICBpZiAodGhpcy50aXApIHtcbiAgICAgICAgJCh0aGlzLnRpcCkucmVtb3ZlKCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2lzRW5hYmxlZCA9IG51bGw7XG4gICAgICB0aGlzLl90aW1lb3V0ID0gbnVsbDtcbiAgICAgIHRoaXMuX2hvdmVyU3RhdGUgPSBudWxsO1xuICAgICAgdGhpcy5fYWN0aXZlVHJpZ2dlciA9IG51bGw7XG4gICAgICB0aGlzLl90ZXRoZXIgPSBudWxsO1xuXG4gICAgICB0aGlzLmVsZW1lbnQgPSBudWxsO1xuICAgICAgdGhpcy5jb25maWcgPSBudWxsO1xuICAgICAgdGhpcy50aXAgPSBudWxsO1xuICAgIH07XG5cbiAgICBUb29sdGlwLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gc2hvdygpIHtcbiAgICAgIHZhciBfdGhpczIyID0gdGhpcztcblxuICAgICAgaWYgKCQodGhpcy5lbGVtZW50KS5jc3MoJ2Rpc3BsYXknKSA9PT0gJ25vbmUnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHVzZSBzaG93IG9uIHZpc2libGUgZWxlbWVudHMnKTtcbiAgICAgIH1cblxuICAgICAgdmFyIHNob3dFdmVudCA9ICQuRXZlbnQodGhpcy5jb25zdHJ1Y3Rvci5FdmVudC5TSE9XKTtcbiAgICAgIGlmICh0aGlzLmlzV2l0aENvbnRlbnQoKSAmJiB0aGlzLl9pc0VuYWJsZWQpIHtcbiAgICAgICAgaWYgKHRoaXMuX2lzVHJhbnNpdGlvbmluZykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVG9vbHRpcCBpcyB0cmFuc2l0aW9uaW5nJyk7XG4gICAgICAgIH1cbiAgICAgICAgJCh0aGlzLmVsZW1lbnQpLnRyaWdnZXIoc2hvd0V2ZW50KTtcblxuICAgICAgICB2YXIgaXNJblRoZURvbSA9ICQuY29udGFpbnModGhpcy5lbGVtZW50Lm93bmVyRG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LCB0aGlzLmVsZW1lbnQpO1xuXG4gICAgICAgIGlmIChzaG93RXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkgfHwgIWlzSW5UaGVEb20pIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdGlwID0gdGhpcy5nZXRUaXBFbGVtZW50KCk7XG4gICAgICAgIHZhciB0aXBJZCA9IFV0aWwuZ2V0VUlEKHRoaXMuY29uc3RydWN0b3IuTkFNRSk7XG5cbiAgICAgICAgdGlwLnNldEF0dHJpYnV0ZSgnaWQnLCB0aXBJZCk7XG4gICAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2FyaWEtZGVzY3JpYmVkYnknLCB0aXBJZCk7XG5cbiAgICAgICAgdGhpcy5zZXRDb250ZW50KCk7XG5cbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmFuaW1hdGlvbikge1xuICAgICAgICAgICQodGlwKS5hZGRDbGFzcyhDbGFzc05hbWUuRkFERSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcGxhY2VtZW50ID0gdHlwZW9mIHRoaXMuY29uZmlnLnBsYWNlbWVudCA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuY29uZmlnLnBsYWNlbWVudC5jYWxsKHRoaXMsIHRpcCwgdGhpcy5lbGVtZW50KSA6IHRoaXMuY29uZmlnLnBsYWNlbWVudDtcblxuICAgICAgICB2YXIgYXR0YWNobWVudCA9IHRoaXMuX2dldEF0dGFjaG1lbnQocGxhY2VtZW50KTtcblxuICAgICAgICB2YXIgY29udGFpbmVyID0gdGhpcy5jb25maWcuY29udGFpbmVyID09PSBmYWxzZSA/IGRvY3VtZW50LmJvZHkgOiAkKHRoaXMuY29uZmlnLmNvbnRhaW5lcik7XG5cbiAgICAgICAgJCh0aXApLmRhdGEodGhpcy5jb25zdHJ1Y3Rvci5EQVRBX0tFWSwgdGhpcykuYXBwZW5kVG8oY29udGFpbmVyKTtcblxuICAgICAgICAkKHRoaXMuZWxlbWVudCkudHJpZ2dlcih0aGlzLmNvbnN0cnVjdG9yLkV2ZW50LklOU0VSVEVEKTtcblxuICAgICAgICB0aGlzLl90ZXRoZXIgPSBuZXcgVGV0aGVyKHtcbiAgICAgICAgICBhdHRhY2htZW50OiBhdHRhY2htZW50LFxuICAgICAgICAgIGVsZW1lbnQ6IHRpcCxcbiAgICAgICAgICB0YXJnZXQ6IHRoaXMuZWxlbWVudCxcbiAgICAgICAgICBjbGFzc2VzOiBUZXRoZXJDbGFzcyxcbiAgICAgICAgICBjbGFzc1ByZWZpeDogQ0xBU1NfUFJFRklYLFxuICAgICAgICAgIG9mZnNldDogdGhpcy5jb25maWcub2Zmc2V0LFxuICAgICAgICAgIGNvbnN0cmFpbnRzOiB0aGlzLmNvbmZpZy5jb25zdHJhaW50cyxcbiAgICAgICAgICBhZGRUYXJnZXRDbGFzc2VzOiBmYWxzZVxuICAgICAgICB9KTtcblxuICAgICAgICBVdGlsLnJlZmxvdyh0aXApO1xuICAgICAgICB0aGlzLl90ZXRoZXIucG9zaXRpb24oKTtcblxuICAgICAgICAkKHRpcCkuYWRkQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpO1xuXG4gICAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICAgIHZhciBwcmV2SG92ZXJTdGF0ZSA9IF90aGlzMjIuX2hvdmVyU3RhdGU7XG4gICAgICAgICAgX3RoaXMyMi5faG92ZXJTdGF0ZSA9IG51bGw7XG4gICAgICAgICAgX3RoaXMyMi5faXNUcmFuc2l0aW9uaW5nID0gZmFsc2U7XG5cbiAgICAgICAgICAkKF90aGlzMjIuZWxlbWVudCkudHJpZ2dlcihfdGhpczIyLmNvbnN0cnVjdG9yLkV2ZW50LlNIT1dOKTtcblxuICAgICAgICAgIGlmIChwcmV2SG92ZXJTdGF0ZSA9PT0gSG92ZXJTdGF0ZS5PVVQpIHtcbiAgICAgICAgICAgIF90aGlzMjIuX2xlYXZlKG51bGwsIF90aGlzMjIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoVXRpbC5zdXBwb3J0c1RyYW5zaXRpb25FbmQoKSAmJiAkKHRoaXMudGlwKS5oYXNDbGFzcyhDbGFzc05hbWUuRkFERSkpIHtcbiAgICAgICAgICB0aGlzLl9pc1RyYW5zaXRpb25pbmcgPSB0cnVlO1xuICAgICAgICAgICQodGhpcy50aXApLm9uZShVdGlsLlRSQU5TSVRJT05fRU5ELCBjb21wbGV0ZSkuZW11bGF0ZVRyYW5zaXRpb25FbmQoVG9vbHRpcC5fVFJBTlNJVElPTl9EVVJBVElPTik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29tcGxldGUoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgVG9vbHRpcC5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uIGhpZGUoY2FsbGJhY2spIHtcbiAgICAgIHZhciBfdGhpczIzID0gdGhpcztcblxuICAgICAgdmFyIHRpcCA9IHRoaXMuZ2V0VGlwRWxlbWVudCgpO1xuICAgICAgdmFyIGhpZGVFdmVudCA9ICQuRXZlbnQodGhpcy5jb25zdHJ1Y3Rvci5FdmVudC5ISURFKTtcbiAgICAgIGlmICh0aGlzLl9pc1RyYW5zaXRpb25pbmcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUb29sdGlwIGlzIHRyYW5zaXRpb25pbmcnKTtcbiAgICAgIH1cbiAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICBpZiAoX3RoaXMyMy5faG92ZXJTdGF0ZSAhPT0gSG92ZXJTdGF0ZS5TSE9XICYmIHRpcC5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgdGlwLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGlwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIF90aGlzMjMuZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoJ2FyaWEtZGVzY3JpYmVkYnknKTtcbiAgICAgICAgJChfdGhpczIzLmVsZW1lbnQpLnRyaWdnZXIoX3RoaXMyMy5jb25zdHJ1Y3Rvci5FdmVudC5ISURERU4pO1xuICAgICAgICBfdGhpczIzLl9pc1RyYW5zaXRpb25pbmcgPSBmYWxzZTtcbiAgICAgICAgX3RoaXMyMy5jbGVhbnVwVGV0aGVyKCk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgJCh0aGlzLmVsZW1lbnQpLnRyaWdnZXIoaGlkZUV2ZW50KTtcblxuICAgICAgaWYgKGhpZGVFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgICQodGlwKS5yZW1vdmVDbGFzcyhDbGFzc05hbWUuU0hPVyk7XG5cbiAgICAgIHRoaXMuX2FjdGl2ZVRyaWdnZXJbVHJpZ2dlci5DTElDS10gPSBmYWxzZTtcbiAgICAgIHRoaXMuX2FjdGl2ZVRyaWdnZXJbVHJpZ2dlci5GT0NVU10gPSBmYWxzZTtcbiAgICAgIHRoaXMuX2FjdGl2ZVRyaWdnZXJbVHJpZ2dlci5IT1ZFUl0gPSBmYWxzZTtcblxuICAgICAgaWYgKFV0aWwuc3VwcG9ydHNUcmFuc2l0aW9uRW5kKCkgJiYgJCh0aGlzLnRpcCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkZBREUpKSB7XG4gICAgICAgIHRoaXMuX2lzVHJhbnNpdGlvbmluZyA9IHRydWU7XG4gICAgICAgICQodGlwKS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgY29tcGxldGUpLmVtdWxhdGVUcmFuc2l0aW9uRW5kKFRSQU5TSVRJT05fRFVSQVRJT04pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGxldGUoKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5faG92ZXJTdGF0ZSA9ICcnO1xuICAgIH07XG5cbiAgICAvLyBwcm90ZWN0ZWRcblxuICAgIFRvb2x0aXAucHJvdG90eXBlLmlzV2l0aENvbnRlbnQgPSBmdW5jdGlvbiBpc1dpdGhDb250ZW50KCkge1xuICAgICAgcmV0dXJuIEJvb2xlYW4odGhpcy5nZXRUaXRsZSgpKTtcbiAgICB9O1xuXG4gICAgVG9vbHRpcC5wcm90b3R5cGUuZ2V0VGlwRWxlbWVudCA9IGZ1bmN0aW9uIGdldFRpcEVsZW1lbnQoKSB7XG4gICAgICByZXR1cm4gdGhpcy50aXAgPSB0aGlzLnRpcCB8fCAkKHRoaXMuY29uZmlnLnRlbXBsYXRlKVswXTtcbiAgICB9O1xuXG4gICAgVG9vbHRpcC5wcm90b3R5cGUuc2V0Q29udGVudCA9IGZ1bmN0aW9uIHNldENvbnRlbnQoKSB7XG4gICAgICB2YXIgJHRpcCA9ICQodGhpcy5nZXRUaXBFbGVtZW50KCkpO1xuXG4gICAgICB0aGlzLnNldEVsZW1lbnRDb250ZW50KCR0aXAuZmluZChTZWxlY3Rvci5UT09MVElQX0lOTkVSKSwgdGhpcy5nZXRUaXRsZSgpKTtcblxuICAgICAgJHRpcC5yZW1vdmVDbGFzcyhDbGFzc05hbWUuRkFERSArICcgJyArIENsYXNzTmFtZS5TSE9XKTtcblxuICAgICAgdGhpcy5jbGVhbnVwVGV0aGVyKCk7XG4gICAgfTtcblxuICAgIFRvb2x0aXAucHJvdG90eXBlLnNldEVsZW1lbnRDb250ZW50ID0gZnVuY3Rpb24gc2V0RWxlbWVudENvbnRlbnQoJGVsZW1lbnQsIGNvbnRlbnQpIHtcbiAgICAgIHZhciBodG1sID0gdGhpcy5jb25maWcuaHRtbDtcbiAgICAgIGlmICgodHlwZW9mIGNvbnRlbnQgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKGNvbnRlbnQpKSA9PT0gJ29iamVjdCcgJiYgKGNvbnRlbnQubm9kZVR5cGUgfHwgY29udGVudC5qcXVlcnkpKSB7XG4gICAgICAgIC8vIGNvbnRlbnQgaXMgYSBET00gbm9kZSBvciBhIGpRdWVyeVxuICAgICAgICBpZiAoaHRtbCkge1xuICAgICAgICAgIGlmICghJChjb250ZW50KS5wYXJlbnQoKS5pcygkZWxlbWVudCkpIHtcbiAgICAgICAgICAgICRlbGVtZW50LmVtcHR5KCkuYXBwZW5kKGNvbnRlbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkZWxlbWVudC50ZXh0KCQoY29udGVudCkudGV4dCgpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJGVsZW1lbnRbaHRtbCA/ICdodG1sJyA6ICd0ZXh0J10oY29udGVudCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIFRvb2x0aXAucHJvdG90eXBlLmdldFRpdGxlID0gZnVuY3Rpb24gZ2V0VGl0bGUoKSB7XG4gICAgICB2YXIgdGl0bGUgPSB0aGlzLmVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLW9yaWdpbmFsLXRpdGxlJyk7XG5cbiAgICAgIGlmICghdGl0bGUpIHtcbiAgICAgICAgdGl0bGUgPSB0eXBlb2YgdGhpcy5jb25maWcudGl0bGUgPT09ICdmdW5jdGlvbicgPyB0aGlzLmNvbmZpZy50aXRsZS5jYWxsKHRoaXMuZWxlbWVudCkgOiB0aGlzLmNvbmZpZy50aXRsZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRpdGxlO1xuICAgIH07XG5cbiAgICBUb29sdGlwLnByb3RvdHlwZS5jbGVhbnVwVGV0aGVyID0gZnVuY3Rpb24gY2xlYW51cFRldGhlcigpIHtcbiAgICAgIGlmICh0aGlzLl90ZXRoZXIpIHtcbiAgICAgICAgdGhpcy5fdGV0aGVyLmRlc3Ryb3koKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gcHJpdmF0ZVxuXG4gICAgVG9vbHRpcC5wcm90b3R5cGUuX2dldEF0dGFjaG1lbnQgPSBmdW5jdGlvbiBfZ2V0QXR0YWNobWVudChwbGFjZW1lbnQpIHtcbiAgICAgIHJldHVybiBBdHRhY2htZW50TWFwW3BsYWNlbWVudC50b1VwcGVyQ2FzZSgpXTtcbiAgICB9O1xuXG4gICAgVG9vbHRpcC5wcm90b3R5cGUuX3NldExpc3RlbmVycyA9IGZ1bmN0aW9uIF9zZXRMaXN0ZW5lcnMoKSB7XG4gICAgICB2YXIgX3RoaXMyNCA9IHRoaXM7XG5cbiAgICAgIHZhciB0cmlnZ2VycyA9IHRoaXMuY29uZmlnLnRyaWdnZXIuc3BsaXQoJyAnKTtcblxuICAgICAgdHJpZ2dlcnMuZm9yRWFjaChmdW5jdGlvbiAodHJpZ2dlcikge1xuICAgICAgICBpZiAodHJpZ2dlciA9PT0gJ2NsaWNrJykge1xuICAgICAgICAgICQoX3RoaXMyNC5lbGVtZW50KS5vbihfdGhpczI0LmNvbnN0cnVjdG9yLkV2ZW50LkNMSUNLLCBfdGhpczI0LmNvbmZpZy5zZWxlY3RvciwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMyNC50b2dnbGUoZXZlbnQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHRyaWdnZXIgIT09IFRyaWdnZXIuTUFOVUFMKSB7XG4gICAgICAgICAgdmFyIGV2ZW50SW4gPSB0cmlnZ2VyID09PSBUcmlnZ2VyLkhPVkVSID8gX3RoaXMyNC5jb25zdHJ1Y3Rvci5FdmVudC5NT1VTRUVOVEVSIDogX3RoaXMyNC5jb25zdHJ1Y3Rvci5FdmVudC5GT0NVU0lOO1xuICAgICAgICAgIHZhciBldmVudE91dCA9IHRyaWdnZXIgPT09IFRyaWdnZXIuSE9WRVIgPyBfdGhpczI0LmNvbnN0cnVjdG9yLkV2ZW50Lk1PVVNFTEVBVkUgOiBfdGhpczI0LmNvbnN0cnVjdG9yLkV2ZW50LkZPQ1VTT1VUO1xuXG4gICAgICAgICAgJChfdGhpczI0LmVsZW1lbnQpLm9uKGV2ZW50SW4sIF90aGlzMjQuY29uZmlnLnNlbGVjdG9yLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpczI0Ll9lbnRlcihldmVudCk7XG4gICAgICAgICAgfSkub24oZXZlbnRPdXQsIF90aGlzMjQuY29uZmlnLnNlbGVjdG9yLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpczI0Ll9sZWF2ZShldmVudCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAkKF90aGlzMjQuZWxlbWVudCkuY2xvc2VzdCgnLm1vZGFsJykub24oJ2hpZGUuYnMubW9kYWwnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzMjQuaGlkZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAodGhpcy5jb25maWcuc2VsZWN0b3IpIHtcbiAgICAgICAgdGhpcy5jb25maWcgPSAkLmV4dGVuZCh7fSwgdGhpcy5jb25maWcsIHtcbiAgICAgICAgICB0cmlnZ2VyOiAnbWFudWFsJyxcbiAgICAgICAgICBzZWxlY3RvcjogJydcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9maXhUaXRsZSgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBUb29sdGlwLnByb3RvdHlwZS5fZml4VGl0bGUgPSBmdW5jdGlvbiBfZml4VGl0bGUoKSB7XG4gICAgICB2YXIgdGl0bGVUeXBlID0gX3R5cGVvZih0aGlzLmVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLW9yaWdpbmFsLXRpdGxlJykpO1xuICAgICAgaWYgKHRoaXMuZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3RpdGxlJykgfHwgdGl0bGVUeXBlICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLW9yaWdpbmFsLXRpdGxlJywgdGhpcy5lbGVtZW50LmdldEF0dHJpYnV0ZSgndGl0bGUnKSB8fCAnJyk7XG4gICAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3RpdGxlJywgJycpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBUb29sdGlwLnByb3RvdHlwZS5fZW50ZXIgPSBmdW5jdGlvbiBfZW50ZXIoZXZlbnQsIGNvbnRleHQpIHtcbiAgICAgIHZhciBkYXRhS2V5ID0gdGhpcy5jb25zdHJ1Y3Rvci5EQVRBX0tFWTtcblxuICAgICAgY29udGV4dCA9IGNvbnRleHQgfHwgJChldmVudC5jdXJyZW50VGFyZ2V0KS5kYXRhKGRhdGFLZXkpO1xuXG4gICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgY29udGV4dCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKGV2ZW50LmN1cnJlbnRUYXJnZXQsIHRoaXMuX2dldERlbGVnYXRlQ29uZmlnKCkpO1xuICAgICAgICAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLmRhdGEoZGF0YUtleSwgY29udGV4dCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChldmVudCkge1xuICAgICAgICBjb250ZXh0Ll9hY3RpdmVUcmlnZ2VyW2V2ZW50LnR5cGUgPT09ICdmb2N1c2luJyA/IFRyaWdnZXIuRk9DVVMgOiBUcmlnZ2VyLkhPVkVSXSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICgkKGNvbnRleHQuZ2V0VGlwRWxlbWVudCgpKS5oYXNDbGFzcyhDbGFzc05hbWUuU0hPVykgfHwgY29udGV4dC5faG92ZXJTdGF0ZSA9PT0gSG92ZXJTdGF0ZS5TSE9XKSB7XG4gICAgICAgIGNvbnRleHQuX2hvdmVyU3RhdGUgPSBIb3ZlclN0YXRlLlNIT1c7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY2xlYXJUaW1lb3V0KGNvbnRleHQuX3RpbWVvdXQpO1xuXG4gICAgICBjb250ZXh0Ll9ob3ZlclN0YXRlID0gSG92ZXJTdGF0ZS5TSE9XO1xuXG4gICAgICBpZiAoIWNvbnRleHQuY29uZmlnLmRlbGF5IHx8ICFjb250ZXh0LmNvbmZpZy5kZWxheS5zaG93KSB7XG4gICAgICAgIGNvbnRleHQuc2hvdygpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnRleHQuX3RpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGNvbnRleHQuX2hvdmVyU3RhdGUgPT09IEhvdmVyU3RhdGUuU0hPVykge1xuICAgICAgICAgIGNvbnRleHQuc2hvdygpO1xuICAgICAgICB9XG4gICAgICB9LCBjb250ZXh0LmNvbmZpZy5kZWxheS5zaG93KTtcbiAgICB9O1xuXG4gICAgVG9vbHRpcC5wcm90b3R5cGUuX2xlYXZlID0gZnVuY3Rpb24gX2xlYXZlKGV2ZW50LCBjb250ZXh0KSB7XG4gICAgICB2YXIgZGF0YUtleSA9IHRoaXMuY29uc3RydWN0b3IuREFUQV9LRVk7XG5cbiAgICAgIGNvbnRleHQgPSBjb250ZXh0IHx8ICQoZXZlbnQuY3VycmVudFRhcmdldCkuZGF0YShkYXRhS2V5KTtcblxuICAgICAgaWYgKCFjb250ZXh0KSB7XG4gICAgICAgIGNvbnRleHQgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcihldmVudC5jdXJyZW50VGFyZ2V0LCB0aGlzLl9nZXREZWxlZ2F0ZUNvbmZpZygpKTtcbiAgICAgICAgJChldmVudC5jdXJyZW50VGFyZ2V0KS5kYXRhKGRhdGFLZXksIGNvbnRleHQpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgY29udGV4dC5fYWN0aXZlVHJpZ2dlcltldmVudC50eXBlID09PSAnZm9jdXNvdXQnID8gVHJpZ2dlci5GT0NVUyA6IFRyaWdnZXIuSE9WRVJdID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb250ZXh0Ll9pc1dpdGhBY3RpdmVUcmlnZ2VyKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjbGVhclRpbWVvdXQoY29udGV4dC5fdGltZW91dCk7XG5cbiAgICAgIGNvbnRleHQuX2hvdmVyU3RhdGUgPSBIb3ZlclN0YXRlLk9VVDtcblxuICAgICAgaWYgKCFjb250ZXh0LmNvbmZpZy5kZWxheSB8fCAhY29udGV4dC5jb25maWcuZGVsYXkuaGlkZSkge1xuICAgICAgICBjb250ZXh0LmhpZGUoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb250ZXh0Ll90aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChjb250ZXh0Ll9ob3ZlclN0YXRlID09PSBIb3ZlclN0YXRlLk9VVCkge1xuICAgICAgICAgIGNvbnRleHQuaGlkZSgpO1xuICAgICAgICB9XG4gICAgICB9LCBjb250ZXh0LmNvbmZpZy5kZWxheS5oaWRlKTtcbiAgICB9O1xuXG4gICAgVG9vbHRpcC5wcm90b3R5cGUuX2lzV2l0aEFjdGl2ZVRyaWdnZXIgPSBmdW5jdGlvbiBfaXNXaXRoQWN0aXZlVHJpZ2dlcigpIHtcbiAgICAgIGZvciAodmFyIHRyaWdnZXIgaW4gdGhpcy5fYWN0aXZlVHJpZ2dlcikge1xuICAgICAgICBpZiAodGhpcy5fYWN0aXZlVHJpZ2dlclt0cmlnZ2VyXSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgVG9vbHRpcC5wcm90b3R5cGUuX2dldENvbmZpZyA9IGZ1bmN0aW9uIF9nZXRDb25maWcoY29uZmlnKSB7XG4gICAgICBjb25maWcgPSAkLmV4dGVuZCh7fSwgdGhpcy5jb25zdHJ1Y3Rvci5EZWZhdWx0LCAkKHRoaXMuZWxlbWVudCkuZGF0YSgpLCBjb25maWcpO1xuXG4gICAgICBpZiAoY29uZmlnLmRlbGF5ICYmIHR5cGVvZiBjb25maWcuZGVsYXkgPT09ICdudW1iZXInKSB7XG4gICAgICAgIGNvbmZpZy5kZWxheSA9IHtcbiAgICAgICAgICBzaG93OiBjb25maWcuZGVsYXksXG4gICAgICAgICAgaGlkZTogY29uZmlnLmRlbGF5XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIFV0aWwudHlwZUNoZWNrQ29uZmlnKE5BTUUsIGNvbmZpZywgdGhpcy5jb25zdHJ1Y3Rvci5EZWZhdWx0VHlwZSk7XG5cbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfTtcblxuICAgIFRvb2x0aXAucHJvdG90eXBlLl9nZXREZWxlZ2F0ZUNvbmZpZyA9IGZ1bmN0aW9uIF9nZXREZWxlZ2F0ZUNvbmZpZygpIHtcbiAgICAgIHZhciBjb25maWcgPSB7fTtcblxuICAgICAgaWYgKHRoaXMuY29uZmlnKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB0aGlzLmNvbmZpZykge1xuICAgICAgICAgIGlmICh0aGlzLmNvbnN0cnVjdG9yLkRlZmF1bHRba2V5XSAhPT0gdGhpcy5jb25maWdba2V5XSkge1xuICAgICAgICAgICAgY29uZmlnW2tleV0gPSB0aGlzLmNvbmZpZ1trZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gY29uZmlnO1xuICAgIH07XG5cbiAgICAvLyBzdGF0aWNcblxuICAgIFRvb2x0aXAuX2pRdWVyeUludGVyZmFjZSA9IGZ1bmN0aW9uIF9qUXVlcnlJbnRlcmZhY2UoY29uZmlnKSB7XG4gICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSAkKHRoaXMpLmRhdGEoREFUQV9LRVkpO1xuICAgICAgICB2YXIgX2NvbmZpZyA9ICh0eXBlb2YgY29uZmlnID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZihjb25maWcpKSA9PT0gJ29iamVjdCcgJiYgY29uZmlnO1xuXG4gICAgICAgIGlmICghZGF0YSAmJiAvZGlzcG9zZXxoaWRlLy50ZXN0KGNvbmZpZykpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICBkYXRhID0gbmV3IFRvb2x0aXAodGhpcywgX2NvbmZpZyk7XG4gICAgICAgICAgJCh0aGlzKS5kYXRhKERBVEFfS0VZLCBkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGlmIChkYXRhW2NvbmZpZ10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBtZXRob2QgbmFtZWQgXCInICsgY29uZmlnICsgJ1wiJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRhdGFbY29uZmlnXSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKFRvb2x0aXAsIG51bGwsIFt7XG4gICAgICBrZXk6ICdWRVJTSU9OJyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gVkVSU0lPTjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6ICdEZWZhdWx0JyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRGVmYXVsdDtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6ICdOQU1FJyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gTkFNRTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6ICdEQVRBX0tFWScsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIERBVEFfS0VZO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogJ0V2ZW50JyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRXZlbnQ7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiAnRVZFTlRfS0VZJyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRVZFTlRfS0VZO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogJ0RlZmF1bHRUeXBlJyxcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRGVmYXVsdFR5cGU7XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIFRvb2x0aXA7XG4gIH0oKTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIGpRdWVyeVxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgJC5mbltOQU1FXSA9IFRvb2x0aXAuX2pRdWVyeUludGVyZmFjZTtcbiAgJC5mbltOQU1FXS5Db25zdHJ1Y3RvciA9IFRvb2x0aXA7XG4gICQuZm5bTkFNRV0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUVdID0gSlFVRVJZX05PX0NPTkZMSUNUO1xuICAgIHJldHVybiBUb29sdGlwLl9qUXVlcnlJbnRlcmZhY2U7XG4gIH07XG5cbiAgcmV0dXJuIFRvb2x0aXA7XG59KGpRdWVyeSk7XG5cbi8qKlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIEJvb3RzdHJhcCAodjQuMC4wLWFscGhhLjYpOiBwb3BvdmVyLmpzXG4gKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS90d2JzL2Jvb3RzdHJhcC9ibG9iL21hc3Rlci9MSUNFTlNFKVxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqL1xuXG52YXIgUG9wb3ZlciA9IGZ1bmN0aW9uICgkKSB7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FID0gJ3BvcG92ZXInO1xuICB2YXIgVkVSU0lPTiA9ICc0LjAuMC1hbHBoYS42JztcbiAgdmFyIERBVEFfS0VZID0gJ2JzLnBvcG92ZXInO1xuICB2YXIgRVZFTlRfS0VZID0gJy4nICsgREFUQV9LRVk7XG4gIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QgPSAkLmZuW05BTUVdO1xuXG4gIHZhciBEZWZhdWx0ID0gJC5leHRlbmQoe30sIFRvb2x0aXAuRGVmYXVsdCwge1xuICAgIHBsYWNlbWVudDogJ3JpZ2h0JyxcbiAgICB0cmlnZ2VyOiAnY2xpY2snLFxuICAgIGNvbnRlbnQ6ICcnLFxuICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cInBvcG92ZXJcIiByb2xlPVwidG9vbHRpcFwiPicgKyAnPGgzIGNsYXNzPVwicG9wb3Zlci10aXRsZVwiPjwvaDM+JyArICc8ZGl2IGNsYXNzPVwicG9wb3Zlci1jb250ZW50XCI+PC9kaXY+PC9kaXY+J1xuICB9KTtcblxuICB2YXIgRGVmYXVsdFR5cGUgPSAkLmV4dGVuZCh7fSwgVG9vbHRpcC5EZWZhdWx0VHlwZSwge1xuICAgIGNvbnRlbnQ6ICcoc3RyaW5nfGVsZW1lbnR8ZnVuY3Rpb24pJ1xuICB9KTtcblxuICB2YXIgQ2xhc3NOYW1lID0ge1xuICAgIEZBREU6ICdmYWRlJyxcbiAgICBTSE9XOiAnc2hvdydcbiAgfTtcblxuICB2YXIgU2VsZWN0b3IgPSB7XG4gICAgVElUTEU6ICcucG9wb3Zlci10aXRsZScsXG4gICAgQ09OVEVOVDogJy5wb3BvdmVyLWNvbnRlbnQnXG4gIH07XG5cbiAgdmFyIEV2ZW50ID0ge1xuICAgIEhJREU6ICdoaWRlJyArIEVWRU5UX0tFWSxcbiAgICBISURERU46ICdoaWRkZW4nICsgRVZFTlRfS0VZLFxuICAgIFNIT1c6ICdzaG93JyArIEVWRU5UX0tFWSxcbiAgICBTSE9XTjogJ3Nob3duJyArIEVWRU5UX0tFWSxcbiAgICBJTlNFUlRFRDogJ2luc2VydGVkJyArIEVWRU5UX0tFWSxcbiAgICBDTElDSzogJ2NsaWNrJyArIEVWRU5UX0tFWSxcbiAgICBGT0NVU0lOOiAnZm9jdXNpbicgKyBFVkVOVF9LRVksXG4gICAgRk9DVVNPVVQ6ICdmb2N1c291dCcgKyBFVkVOVF9LRVksXG4gICAgTU9VU0VFTlRFUjogJ21vdXNlZW50ZXInICsgRVZFTlRfS0VZLFxuICAgIE1PVVNFTEVBVkU6ICdtb3VzZWxlYXZlJyArIEVWRU5UX0tFWVxuICB9O1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ2xhc3MgRGVmaW5pdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIFBvcG92ZXIgPSBmdW5jdGlvbiAoX1Rvb2x0aXApIHtcbiAgICBfaW5oZXJpdHMoUG9wb3ZlciwgX1Rvb2x0aXApO1xuXG4gICAgZnVuY3Rpb24gUG9wb3ZlcigpIHtcbiAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBQb3BvdmVyKTtcblxuICAgICAgcmV0dXJuIF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9Ub29sdGlwLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICAgIH1cblxuICAgIC8vIG92ZXJyaWRlc1xuXG4gICAgUG9wb3Zlci5wcm90b3R5cGUuaXNXaXRoQ29udGVudCA9IGZ1bmN0aW9uIGlzV2l0aENvbnRlbnQoKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRUaXRsZSgpIHx8IHRoaXMuX2dldENvbnRlbnQoKTtcbiAgICB9O1xuXG4gICAgUG9wb3Zlci5wcm90b3R5cGUuZ2V0VGlwRWxlbWVudCA9IGZ1bmN0aW9uIGdldFRpcEVsZW1lbnQoKSB7XG4gICAgICByZXR1cm4gdGhpcy50aXAgPSB0aGlzLnRpcCB8fCAkKHRoaXMuY29uZmlnLnRlbXBsYXRlKVswXTtcbiAgICB9O1xuXG4gICAgUG9wb3Zlci5wcm90b3R5cGUuc2V0Q29udGVudCA9IGZ1bmN0aW9uIHNldENvbnRlbnQoKSB7XG4gICAgICB2YXIgJHRpcCA9ICQodGhpcy5nZXRUaXBFbGVtZW50KCkpO1xuXG4gICAgICAvLyB3ZSB1c2UgYXBwZW5kIGZvciBodG1sIG9iamVjdHMgdG8gbWFpbnRhaW4ganMgZXZlbnRzXG4gICAgICB0aGlzLnNldEVsZW1lbnRDb250ZW50KCR0aXAuZmluZChTZWxlY3Rvci5USVRMRSksIHRoaXMuZ2V0VGl0bGUoKSk7XG4gICAgICB0aGlzLnNldEVsZW1lbnRDb250ZW50KCR0aXAuZmluZChTZWxlY3Rvci5DT05URU5UKSwgdGhpcy5fZ2V0Q29udGVudCgpKTtcblxuICAgICAgJHRpcC5yZW1vdmVDbGFzcyhDbGFzc05hbWUuRkFERSArICcgJyArIENsYXNzTmFtZS5TSE9XKTtcblxuICAgICAgdGhpcy5jbGVhbnVwVGV0aGVyKCk7XG4gICAgfTtcblxuICAgIC8vIHByaXZhdGVcblxuICAgIFBvcG92ZXIucHJvdG90eXBlLl9nZXRDb250ZW50ID0gZnVuY3Rpb24gX2dldENvbnRlbnQoKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbGVtZW50LmdldEF0dHJpYnV0ZSgnZGF0YS1jb250ZW50JykgfHwgKHR5cGVvZiB0aGlzLmNvbmZpZy5jb250ZW50ID09PSAnZnVuY3Rpb24nID8gdGhpcy5jb25maWcuY29udGVudC5jYWxsKHRoaXMuZWxlbWVudCkgOiB0aGlzLmNvbmZpZy5jb250ZW50KTtcbiAgICB9O1xuXG4gICAgLy8gc3RhdGljXG5cbiAgICBQb3BvdmVyLl9qUXVlcnlJbnRlcmZhY2UgPSBmdW5jdGlvbiBfalF1ZXJ5SW50ZXJmYWNlKGNvbmZpZykge1xuICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkYXRhID0gJCh0aGlzKS5kYXRhKERBVEFfS0VZKTtcbiAgICAgICAgdmFyIF9jb25maWcgPSAodHlwZW9mIGNvbmZpZyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2YoY29uZmlnKSkgPT09ICdvYmplY3QnID8gY29uZmlnIDogbnVsbDtcblxuICAgICAgICBpZiAoIWRhdGEgJiYgL2Rlc3Ryb3l8aGlkZS8udGVzdChjb25maWcpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgZGF0YSA9IG5ldyBQb3BvdmVyKHRoaXMsIF9jb25maWcpO1xuICAgICAgICAgICQodGhpcykuZGF0YShEQVRBX0tFWSwgZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBpZiAoZGF0YVtjb25maWddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gbWV0aG9kIG5hbWVkIFwiJyArIGNvbmZpZyArICdcIicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkYXRhW2NvbmZpZ10oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIF9jcmVhdGVDbGFzcyhQb3BvdmVyLCBudWxsLCBbe1xuICAgICAga2V5OiAnVkVSU0lPTicsXG5cblxuICAgICAgLy8gZ2V0dGVyc1xuXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIFZFUlNJT047XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiAnRGVmYXVsdCcsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIERlZmF1bHQ7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiAnTkFNRScsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIE5BTUU7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiAnREFUQV9LRVknLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBEQVRBX0tFWTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6ICdFdmVudCcsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIEV2ZW50O1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogJ0VWRU5UX0tFWScsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIEVWRU5UX0tFWTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6ICdEZWZhdWx0VHlwZScsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIERlZmF1bHRUeXBlO1xuICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBQb3BvdmVyO1xuICB9KFRvb2x0aXApO1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogalF1ZXJ5XG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAkLmZuW05BTUVdID0gUG9wb3Zlci5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUVdLkNvbnN0cnVjdG9yID0gUG9wb3ZlcjtcbiAgJC5mbltOQU1FXS5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICQuZm5bTkFNRV0gPSBKUVVFUllfTk9fQ09ORkxJQ1Q7XG4gICAgcmV0dXJuIFBvcG92ZXIuX2pRdWVyeUludGVyZmFjZTtcbiAgfTtcblxuICByZXR1cm4gUG9wb3Zlcjtcbn0oalF1ZXJ5KTtcblxufSgpO1xuIiwiLyoqXHJcbiAqIEZpbGUgbmF2aWdhdGlvbi5qcy5cclxuICpcclxuICogSGFuZGxlcyB0b2dnbGluZyB0aGUgbmF2aWdhdGlvbiBtZW51IGZvciBzbWFsbCBzY3JlZW5zIGFuZCBlbmFibGVzIFRBQiBrZXlcclxuICogbmF2aWdhdGlvbiBzdXBwb3J0IGZvciBkcm9wZG93biBtZW51cy5cclxuICovXHJcbiggZnVuY3Rpb24oKSB7XHJcblx0dmFyIGNvbnRhaW5lciwgYnV0dG9uLCBtZW51LCBsaW5rcywgaSwgbGVuO1xyXG5cclxuXHRjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggJ3NpdGUtbmF2aWdhdGlvbicgKTtcclxuXHRpZiAoICEgY29udGFpbmVyICkge1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHJcblx0YnV0dG9uID0gY29udGFpbmVyLmdldEVsZW1lbnRzQnlUYWdOYW1lKCAnYnV0dG9uJyApWzBdO1xyXG5cdGlmICggJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiBidXR0b24gKSB7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHRtZW51ID0gY29udGFpbmVyLmdldEVsZW1lbnRzQnlUYWdOYW1lKCAndWwnIClbMF07XHJcblxyXG5cdC8vIEhpZGUgbWVudSB0b2dnbGUgYnV0dG9uIGlmIG1lbnUgaXMgZW1wdHkgYW5kIHJldHVybiBlYXJseS5cclxuXHRpZiAoICd1bmRlZmluZWQnID09PSB0eXBlb2YgbWVudSApIHtcclxuXHRcdGJ1dHRvbi5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHJcblx0bWVudS5zZXRBdHRyaWJ1dGUoICdhcmlhLWV4cGFuZGVkJywgJ2ZhbHNlJyApO1xyXG5cdGlmICggLTEgPT09IG1lbnUuY2xhc3NOYW1lLmluZGV4T2YoICduYXYtbWVudScgKSApIHtcclxuXHRcdG1lbnUuY2xhc3NOYW1lICs9ICcgbmF2LW1lbnUnO1xyXG5cdH1cclxuXHJcblx0YnV0dG9uLm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcclxuXHRcdGlmICggLTEgIT09IGNvbnRhaW5lci5jbGFzc05hbWUuaW5kZXhPZiggJ3RvZ2dsZWQnICkgKSB7XHJcblx0XHRcdGNvbnRhaW5lci5jbGFzc05hbWUgPSBjb250YWluZXIuY2xhc3NOYW1lLnJlcGxhY2UoICcgdG9nZ2xlZCcsICcnICk7XHJcblx0XHRcdGJ1dHRvbi5zZXRBdHRyaWJ1dGUoICdhcmlhLWV4cGFuZGVkJywgJ2ZhbHNlJyApO1xyXG5cdFx0XHRtZW51LnNldEF0dHJpYnV0ZSggJ2FyaWEtZXhwYW5kZWQnLCAnZmFsc2UnICk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb250YWluZXIuY2xhc3NOYW1lICs9ICcgdG9nZ2xlZCc7XHJcblx0XHRcdGJ1dHRvbi5zZXRBdHRyaWJ1dGUoICdhcmlhLWV4cGFuZGVkJywgJ3RydWUnICk7XHJcblx0XHRcdG1lbnUuc2V0QXR0cmlidXRlKCAnYXJpYS1leHBhbmRlZCcsICd0cnVlJyApO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdC8vIEdldCBhbGwgdGhlIGxpbmsgZWxlbWVudHMgd2l0aGluIHRoZSBtZW51LlxyXG5cdGxpbmtzICAgID0gbWVudS5nZXRFbGVtZW50c0J5VGFnTmFtZSggJ2EnICk7XHJcblxyXG5cdC8vIEVhY2ggdGltZSBhIG1lbnUgbGluayBpcyBmb2N1c2VkIG9yIGJsdXJyZWQsIHRvZ2dsZSBmb2N1cy5cclxuXHRmb3IgKCBpID0gMCwgbGVuID0gbGlua3MubGVuZ3RoOyBpIDwgbGVuOyBpKysgKSB7XHJcblx0XHRsaW5rc1tpXS5hZGRFdmVudExpc3RlbmVyKCAnZm9jdXMnLCB0b2dnbGVGb2N1cywgdHJ1ZSApO1xyXG5cdFx0bGlua3NbaV0uYWRkRXZlbnRMaXN0ZW5lciggJ2JsdXInLCB0b2dnbGVGb2N1cywgdHJ1ZSApO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0cyBvciByZW1vdmVzIC5mb2N1cyBjbGFzcyBvbiBhbiBlbGVtZW50LlxyXG5cdCAqL1xyXG5cdGZ1bmN0aW9uIHRvZ2dsZUZvY3VzKCkge1xyXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuXHRcdC8vIE1vdmUgdXAgdGhyb3VnaCB0aGUgYW5jZXN0b3JzIG9mIHRoZSBjdXJyZW50IGxpbmsgdW50aWwgd2UgaGl0IC5uYXYtbWVudS5cclxuXHRcdHdoaWxlICggLTEgPT09IHNlbGYuY2xhc3NOYW1lLmluZGV4T2YoICduYXYtbWVudScgKSApIHtcclxuXHJcblx0XHRcdC8vIE9uIGxpIGVsZW1lbnRzIHRvZ2dsZSB0aGUgY2xhc3MgLmZvY3VzLlxyXG5cdFx0XHRpZiAoICdsaScgPT09IHNlbGYudGFnTmFtZS50b0xvd2VyQ2FzZSgpICkge1xyXG5cdFx0XHRcdGlmICggLTEgIT09IHNlbGYuY2xhc3NOYW1lLmluZGV4T2YoICdmb2N1cycgKSApIHtcclxuXHRcdFx0XHRcdHNlbGYuY2xhc3NOYW1lID0gc2VsZi5jbGFzc05hbWUucmVwbGFjZSggJyBmb2N1cycsICcnICk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHNlbGYuY2xhc3NOYW1lICs9ICcgZm9jdXMnO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0c2VsZiA9IHNlbGYucGFyZW50RWxlbWVudDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRvZ2dsZXMgYGZvY3VzYCBjbGFzcyB0byBhbGxvdyBzdWJtZW51IGFjY2VzcyBvbiB0YWJsZXRzLlxyXG5cdCAqL1xyXG5cdCggZnVuY3Rpb24oIGNvbnRhaW5lciApIHtcclxuXHRcdHZhciB0b3VjaFN0YXJ0Rm4sIGksXHJcblx0XHRcdHBhcmVudExpbmsgPSBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCggJy5tZW51LWl0ZW0taGFzLWNoaWxkcmVuID4gYSwgLnBhZ2VfaXRlbV9oYXNfY2hpbGRyZW4gPiBhJyApO1xyXG5cclxuXHRcdGlmICggJ29udG91Y2hzdGFydCcgaW4gd2luZG93ICkge1xyXG5cdFx0XHR0b3VjaFN0YXJ0Rm4gPSBmdW5jdGlvbiggZSApIHtcclxuXHRcdFx0XHR2YXIgbWVudUl0ZW0gPSB0aGlzLnBhcmVudE5vZGUsIGk7XHJcblxyXG5cdFx0XHRcdGlmICggISBtZW51SXRlbS5jbGFzc0xpc3QuY29udGFpbnMoICdmb2N1cycgKSApIHtcclxuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHRcdGZvciAoIGkgPSAwOyBpIDwgbWVudUl0ZW0ucGFyZW50Tm9kZS5jaGlsZHJlbi5sZW5ndGg7ICsraSApIHtcclxuXHRcdFx0XHRcdFx0aWYgKCBtZW51SXRlbSA9PT0gbWVudUl0ZW0ucGFyZW50Tm9kZS5jaGlsZHJlbltpXSApIHtcclxuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRtZW51SXRlbS5wYXJlbnROb2RlLmNoaWxkcmVuW2ldLmNsYXNzTGlzdC5yZW1vdmUoICdmb2N1cycgKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdG1lbnVJdGVtLmNsYXNzTGlzdC5hZGQoICdmb2N1cycgKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0bWVudUl0ZW0uY2xhc3NMaXN0LnJlbW92ZSggJ2ZvY3VzJyApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGZvciAoIGkgPSAwOyBpIDwgcGFyZW50TGluay5sZW5ndGg7ICsraSApIHtcclxuXHRcdFx0XHRwYXJlbnRMaW5rW2ldLmFkZEV2ZW50TGlzdGVuZXIoICd0b3VjaHN0YXJ0JywgdG91Y2hTdGFydEZuLCBmYWxzZSApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSggY29udGFpbmVyICkgKTtcclxufSApKCk7XHJcbiIsIi8qKlxyXG4gKiBGaWxlIHNraXAtbGluay1mb2N1cy1maXguanMuXHJcbiAqXHJcbiAqIEhlbHBzIHdpdGggYWNjZXNzaWJpbGl0eSBmb3Iga2V5Ym9hcmQgb25seSB1c2Vycy5cclxuICpcclxuICogTGVhcm4gbW9yZTogaHR0cHM6Ly9naXQuaW8vdldkcjJcclxuICovXHJcbihmdW5jdGlvbigpIHtcclxuXHR2YXIgaXNJZSA9IC8odHJpZGVudHxtc2llKS9pLnRlc3QoIG5hdmlnYXRvci51c2VyQWdlbnQgKTtcclxuXHJcblx0aWYgKCBpc0llICYmIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyICkge1xyXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoICdoYXNoY2hhbmdlJywgZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciBpZCA9IGxvY2F0aW9uLmhhc2guc3Vic3RyaW5nKCAxICksXHJcblx0XHRcdFx0ZWxlbWVudDtcclxuXHJcblx0XHRcdGlmICggISAoIC9eW0EtejAtOV8tXSskLy50ZXN0KCBpZCApICkgKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIGlkICk7XHJcblxyXG5cdFx0XHRpZiAoIGVsZW1lbnQgKSB7XHJcblx0XHRcdFx0aWYgKCAhICggL14oPzphfHNlbGVjdHxpbnB1dHxidXR0b258dGV4dGFyZWEpJC9pLnRlc3QoIGVsZW1lbnQudGFnTmFtZSApICkgKSB7XHJcblx0XHRcdFx0XHRlbGVtZW50LnRhYkluZGV4ID0gLTE7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRlbGVtZW50LmZvY3VzKCk7XHJcblx0XHRcdH1cclxuXHRcdH0sIGZhbHNlICk7XHJcblx0fVxyXG59KSgpO1xyXG4iXX0=
