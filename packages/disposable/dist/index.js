(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@lumino/algorithm'), require('@lumino/signaling')) :
    typeof define === 'function' && define.amd ? define(['exports', '@lumino/algorithm', '@lumino/signaling'], factory) :
    (global = global || self, factory(global.lumino_disposable = {}, global.lumino_algorithm, global.lumino_signaling));
}(this, (function (exports, algorithm, signaling) { 'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    /**
     * A disposable object which delegates to a callback function.
     */
    var DisposableDelegate = /** @class */ (function () {
        /**
         * Construct a new disposable delegate.
         *
         * @param fn - The callback function to invoke on dispose.
         */
        function DisposableDelegate(fn) {
            this._fn = fn;
        }
        Object.defineProperty(DisposableDelegate.prototype, "isDisposed", {
            /**
             * Test whether the delegate has been disposed.
             */
            get: function () {
                return !this._fn;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Dispose of the delegate and invoke the callback function.
         */
        DisposableDelegate.prototype.dispose = function () {
            if (!this._fn) {
                return;
            }
            var fn = this._fn;
            this._fn = null;
            fn();
        };
        return DisposableDelegate;
    }());
    /**
     * An observable disposable object which delegates to a callback function.
     */
    var ObservableDisposableDelegate = /** @class */ (function (_super) {
        __extends(ObservableDisposableDelegate, _super);
        function ObservableDisposableDelegate() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._disposed = new signaling.Signal(_this);
            return _this;
        }
        Object.defineProperty(ObservableDisposableDelegate.prototype, "disposed", {
            /**
             * A signal emitted when the delegate is disposed.
             */
            get: function () {
                return this._disposed;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Dispose of the delegate and invoke the callback function.
         */
        ObservableDisposableDelegate.prototype.dispose = function () {
            if (this.isDisposed) {
                return;
            }
            _super.prototype.dispose.call(this);
            this._disposed.emit(undefined);
            signaling.Signal.clearData(this);
        };
        return ObservableDisposableDelegate;
    }(DisposableDelegate));
    /**
     * An object which manages a collection of disposable items.
     */
    exports.DisposableSet = /** @class */ (function () {
        /**
         * Construct a new disposable set.
         */
        function DisposableSet() {
            this._isDisposed = false;
            this._items = new Set();
        }
        Object.defineProperty(DisposableSet.prototype, "isDisposed", {
            /**
             * Test whether the set has been disposed.
             */
            get: function () {
                return this._isDisposed;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Dispose of the set and the items it contains.
         *
         * #### Notes
         * Items are disposed in the order they are added to the set.
         */
        DisposableSet.prototype.dispose = function () {
            if (this._isDisposed) {
                return;
            }
            this._isDisposed = true;
            this._items.forEach(function (item) { item.dispose(); });
            this._items.clear();
        };
        /**
         * Test whether the set contains a specific item.
         *
         * @param item - The item of interest.
         *
         * @returns `true` if the set contains the item, `false` otherwise.
         */
        DisposableSet.prototype.contains = function (item) {
            return this._items.has(item);
        };
        /**
         * Add a disposable item to the set.
         *
         * @param item - The item to add to the set.
         *
         * #### Notes
         * If the item is already contained in the set, this is a no-op.
         */
        DisposableSet.prototype.add = function (item) {
            this._items.add(item);
        };
        /**
         * Remove a disposable item from the set.
         *
         * @param item - The item to remove from the set.
         *
         * #### Notes
         * If the item is not contained in the set, this is a no-op.
         */
        DisposableSet.prototype.remove = function (item) {
            this._items.delete(item);
        };
        /**
         * Remove all items from the set.
         */
        DisposableSet.prototype.clear = function () {
            this._items.clear();
        };
        return DisposableSet;
    }());
    /**
     * The namespace for the `DisposableSet` class statics.
     */
    (function (DisposableSet) {
        /**
         * Create a disposable set from an iterable of items.
         *
         * @param items - The iterable or array-like object of interest.
         *
         * @returns A new disposable initialized with the given items.
         */
        function from(items) {
            var set = new DisposableSet();
            algorithm.each(items, function (item) { set.add(item); });
            return set;
        }
        DisposableSet.from = from;
    })(exports.DisposableSet || (exports.DisposableSet = {}));
    /**
     * An observable object which manages a collection of disposable items.
     */
    exports.ObservableDisposableSet = /** @class */ (function (_super) {
        __extends(ObservableDisposableSet, _super);
        function ObservableDisposableSet() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._disposed = new signaling.Signal(_this);
            return _this;
        }
        Object.defineProperty(ObservableDisposableSet.prototype, "disposed", {
            /**
             * A signal emitted when the set is disposed.
             */
            get: function () {
                return this._disposed;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Dispose of the set and the items it contains.
         *
         * #### Notes
         * Items are disposed in the order they are added to the set.
         */
        ObservableDisposableSet.prototype.dispose = function () {
            if (this.isDisposed) {
                return;
            }
            _super.prototype.dispose.call(this);
            this._disposed.emit(undefined);
            signaling.Signal.clearData(this);
        };
        return ObservableDisposableSet;
    }(exports.DisposableSet));
    /**
     * The namespace for the `ObservableDisposableSet` class statics.
     */
    (function (ObservableDisposableSet) {
        /**
         * Create an observable disposable set from an iterable of items.
         *
         * @param items - The iterable or array-like object of interest.
         *
         * @returns A new disposable initialized with the given items.
         */
        function from(items) {
            var set = new ObservableDisposableSet();
            algorithm.each(items, function (item) { set.add(item); });
            return set;
        }
        ObservableDisposableSet.from = from;
    })(exports.ObservableDisposableSet || (exports.ObservableDisposableSet = {}));

    exports.DisposableDelegate = DisposableDelegate;
    exports.ObservableDisposableDelegate = ObservableDisposableDelegate;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=index.js.map
