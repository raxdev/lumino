import { JSONExt, PromiseDelegate } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';

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

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __awaiter(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

// Copyright (c) Jupyter Development Team.
/**
 * A function to defer an action immediately.
 */
var defer = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : setImmediate;
/**
 * A function to cancel a deferred action.
 */
var cancel = typeof cancelAnimationFrame === 'function'
    ? cancelAnimationFrame
    : clearImmediate;
/**
 * A class that wraps an asynchronous function to poll at a regular interval
 * with exponential increases to the interval length if the poll fails.
 *
 * @typeparam T - The resolved type of the factory's promises.
 * Defaults to `any`.
 *
 * @typeparam U - The rejected type of the factory's promises.
 * Defaults to `any`.
 *
 * @typeparam V - An optional type to extend the phases supported by a poll.
 * Defaults to `standby`, which already exists in the `Phase` type.
 */
var Poll = /** @class */ (function () {
    /**
     * Instantiate a new poll with exponential backoff in case of failure.
     *
     * @param options - The poll instantiation options.
     */
    function Poll(options) {
        var _this = this;
        this._disposed = new Signal(this);
        this._tick = new PromiseDelegate();
        this._ticked = new Signal(this);
        this._timeout = -1;
        this._factory = options.factory;
        this._standby = options.standby || Private.DEFAULT_STANDBY;
        this._state = __assign(__assign({}, Private.DEFAULT_STATE), { timestamp: new Date().getTime() });
        this.frequency = __assign(__assign({}, Private.DEFAULT_FREQUENCY), (options.frequency || {}));
        this.name = options.name || Private.DEFAULT_NAME;
        if ('auto' in options ? options.auto : true) {
            defer(function () { return void _this.start(); });
        }
    }
    Object.defineProperty(Poll.prototype, "disposed", {
        /**
         * A signal emitted when the poll is disposed.
         */
        get: function () {
            return this._disposed;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Poll.prototype, "frequency", {
        /**
         * The polling frequency parameters.
         */
        get: function () {
            return this._frequency;
        },
        set: function (frequency) {
            if (this.isDisposed || JSONExt.deepEqual(frequency, this.frequency || {})) {
                return;
            }
            var backoff = frequency.backoff, interval = frequency.interval, max = frequency.max;
            interval = Math.round(interval);
            max = Math.round(max);
            if (typeof backoff === 'number' && backoff < 1) {
                throw new Error('Poll backoff growth factor must be at least 1');
            }
            if ((interval < 0 || interval > max) && interval !== Poll.NEVER) {
                throw new Error('Poll interval must be between 0 and max');
            }
            if (max > Poll.MAX_INTERVAL && max !== Poll.NEVER) {
                throw new Error("Max interval must be less than " + Poll.MAX_INTERVAL);
            }
            this._frequency = { backoff: backoff, interval: interval, max: max };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Poll.prototype, "isDisposed", {
        /**
         * Whether the poll is disposed.
         */
        get: function () {
            return this.state.phase === 'disposed';
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Poll.prototype, "standby", {
        /**
         * Indicates when the poll switches to standby.
         */
        get: function () {
            return this._standby;
        },
        set: function (standby) {
            if (this.isDisposed || this.standby === standby) {
                return;
            }
            this._standby = standby;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Poll.prototype, "state", {
        /**
         * The poll state, which is the content of the current poll tick.
         */
        get: function () {
            return this._state;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Poll.prototype, "tick", {
        /**
         * A promise that resolves when the poll next ticks.
         */
        get: function () {
            return this._tick.promise;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Poll.prototype, "ticked", {
        /**
         * A signal emitted when the poll ticks and fires off a new request.
         */
        get: function () {
            return this._ticked;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Dispose the poll.
     */
    Poll.prototype.dispose = function () {
        if (this.isDisposed) {
            return;
        }
        this._state = __assign(__assign({}, Private.DISPOSED_STATE), { timestamp: new Date().getTime() });
        this._tick.promise.catch(function (_) { return undefined; });
        this._tick.reject(new Error("Poll (" + this.name + ") is disposed."));
        this._disposed.emit(undefined);
        Signal.clearData(this);
    };
    /**
     * Refreshes the poll. Schedules `refreshed` tick if necessary.
     *
     * @returns A promise that resolves after tick is scheduled and never rejects.
     *
     * #### Notes
     * The returned promise resolves after the tick is scheduled, but before
     * the polling action is run. To wait until after the poll action executes,
     * await the `poll.tick` promise: `await poll.refresh(); await poll.tick;`
     */
    Poll.prototype.refresh = function () {
        return this.schedule({
            cancel: function (_a) {
                var phase = _a.phase;
                return phase === 'refreshed';
            },
            interval: Poll.IMMEDIATE,
            phase: 'refreshed'
        });
    };
    /**
     * Schedule the next poll tick.
     *
     * @param next - The next poll state data to schedule. Defaults to standby.
     *
     * @param next.cancel - Cancels state transition if function returns `true`.
     *
     * @returns A promise that resolves when the next poll state is active.
     *
     * #### Notes
     * This method is not meant to be invoked by user code typically. It is public
     * to allow poll instances to be composed into classes that schedule ticks.
     */
    Poll.prototype.schedule = function (next) {
        if (next === void 0) { next = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var last, pending, scheduled, state, execute;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.isDisposed) {
                            return [2 /*return*/];
                        }
                        // Check if the phase transition should be canceled.
                        if (next.cancel && next.cancel(this.state)) {
                            return [2 /*return*/];
                        }
                        last = this.state;
                        pending = this._tick;
                        scheduled = new PromiseDelegate();
                        state = __assign({ interval: this.frequency.interval, payload: null, phase: 'standby', timestamp: new Date().getTime() }, next);
                        this._state = state;
                        this._tick = scheduled;
                        // Clear the schedule if possible.
                        if (last.interval === Poll.IMMEDIATE) {
                            cancel(this._timeout);
                        }
                        else {
                            clearTimeout(this._timeout);
                        }
                        // Emit ticked signal, resolve pending promise, and await its settlement.
                        this._ticked.emit(this.state);
                        pending.resolve(this);
                        return [4 /*yield*/, pending.promise];
                    case 1:
                        _a.sent();
                        execute = function () {
                            if (_this.isDisposed || _this.tick !== scheduled.promise) {
                                return;
                            }
                            _this._execute();
                        };
                        this._timeout =
                            state.interval === Poll.IMMEDIATE
                                ? defer(execute)
                                : state.interval === Poll.NEVER
                                    ? -1
                                    : setTimeout(execute, state.interval);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Starts the poll. Schedules `started` tick if necessary.
     *
     * @returns A promise that resolves after tick is scheduled and never rejects.
     */
    Poll.prototype.start = function () {
        return this.schedule({
            cancel: function (_a) {
                var phase = _a.phase;
                return phase !== 'constructed' && phase !== 'standby' && phase !== 'stopped';
            },
            interval: Poll.IMMEDIATE,
            phase: 'started'
        });
    };
    /**
     * Stops the poll. Schedules `stopped` tick if necessary.
     *
     * @returns A promise that resolves after tick is scheduled and never rejects.
     */
    Poll.prototype.stop = function () {
        return this.schedule({
            cancel: function (_a) {
                var phase = _a.phase;
                return phase === 'stopped';
            },
            interval: Poll.NEVER,
            phase: 'stopped'
        });
    };
    /**
     * Execute a new poll factory promise or stand by if necessary.
     */
    Poll.prototype._execute = function () {
        var _this = this;
        var standby = typeof this.standby === 'function' ? this.standby() : this.standby;
        standby =
            standby === 'never'
                ? false
                : standby === 'when-hidden'
                    ? !!(typeof document !== 'undefined' && document && document.hidden)
                    : standby;
        // If in standby mode schedule next tick without calling the factory.
        if (standby) {
            void this.schedule();
            return;
        }
        var pending = this.tick;
        this._factory(this.state)
            .then(function (resolved) {
            if (_this.isDisposed || _this.tick !== pending) {
                return;
            }
            void _this.schedule({
                payload: resolved,
                phase: _this.state.phase === 'rejected' ? 'reconnected' : 'resolved'
            });
        })
            .catch(function (rejected) {
            if (_this.isDisposed || _this.tick !== pending) {
                return;
            }
            void _this.schedule({
                interval: Private.sleep(_this.frequency, _this.state),
                payload: rejected,
                phase: 'rejected'
            });
        });
    };
    return Poll;
}());
/**
 * A namespace for `Poll` types, interfaces, and statics.
 */
(function (Poll) {
    /**
     * An interval value that indicates the poll should tick immediately.
     */
    Poll.IMMEDIATE = 0;
    /**
     * Delays are 32-bit integers in many browsers so intervals need to be capped.
     *
     * #### Notes
     * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout#Maximum_delay_value
     */
    Poll.MAX_INTERVAL = 2147483647;
    /**
     * An interval value that indicates the poll should never tick.
     */
    Poll.NEVER = Infinity;
})(Poll || (Poll = {}));
/**
 * A namespace for private module data.
 */
var Private;
(function (Private) {
    /**
     * The default backoff growth rate if `backoff` is `true`.
     */
    Private.DEFAULT_BACKOFF = 3;
    /**
     * The default polling frequency.
     */
    Private.DEFAULT_FREQUENCY = {
        backoff: true,
        interval: 1000,
        max: 30 * 1000
    };
    /**
     * The default poll name.
     */
    Private.DEFAULT_NAME = 'unknown';
    /**
     * The default poll standby behavior.
     */
    Private.DEFAULT_STANDBY = 'when-hidden';
    /**
     * The first poll tick state's default values superseded in constructor.
     */
    Private.DEFAULT_STATE = {
        interval: Poll.NEVER,
        payload: null,
        phase: 'constructed',
        timestamp: new Date(0).getTime()
    };
    /**
     * The disposed tick state values.
     */
    Private.DISPOSED_STATE = {
        interval: Poll.NEVER,
        payload: null,
        phase: 'disposed',
        timestamp: new Date(0).getTime()
    };
    /**
     * Get a random integer between min and max, inclusive of both.
     *
     * #### Notes
     * From
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random#Getting_a_random_integer_between_two_values_inclusive
     *
     * From the MDN page: It might be tempting to use Math.round() to accomplish
     * that, but doing so would cause your random numbers to follow a non-uniform
     * distribution, which may not be acceptable for your needs.
     */
    function getRandomIntInclusive(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    /**
     * Returns the number of milliseconds to sleep before the next tick.
     *
     * @param frequency - The poll's base frequency.
     * @param last - The poll's last tick.
     */
    function sleep(frequency, last) {
        var backoff = frequency.backoff, interval = frequency.interval, max = frequency.max;
        if (interval === Poll.NEVER) {
            return interval;
        }
        var growth = backoff === true ? Private.DEFAULT_BACKOFF : backoff === false ? 1 : backoff;
        var random = getRandomIntInclusive(interval, last.interval * growth);
        return Math.min(max, random);
    }
    Private.sleep = sleep;
})(Private || (Private = {}));

// Copyright (c) Jupyter Development Team.
/**
 * A base class to implement rate limiters with different invocation strategies.
 *
 * @typeparam T - The resolved type of the underlying function.
 *
 * @typeparam U - The rejected type of the underlying function.
 */
var RateLimiter = /** @class */ (function () {
    /**
     * Instantiate a rate limiter.
     *
     * @param fn - The function to rate limit.
     *
     * @param limit - The rate limit; defaults to 500ms.
     */
    function RateLimiter(fn, limit) {
        var _this = this;
        if (limit === void 0) { limit = 500; }
        /**
         * A promise that resolves on each successful invocation.
         */
        this.payload = null;
        this.limit = limit;
        this.poll = new Poll({
            auto: false,
            factory: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fn()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            }); }); },
            frequency: { backoff: false, interval: Poll.NEVER, max: Poll.NEVER },
            standby: 'never'
        });
        this.payload = new PromiseDelegate();
        this.poll.ticked.connect(function (_, state) {
            var payload = _this.payload;
            if (state.phase === 'resolved') {
                _this.payload = new PromiseDelegate();
                payload.resolve(state.payload);
                return;
            }
            if (state.phase === 'rejected' || state.phase === 'stopped') {
                _this.payload = new PromiseDelegate();
                payload.promise.catch(function (_) { return undefined; });
                payload.reject(state.payload);
                return;
            }
        }, this);
    }
    Object.defineProperty(RateLimiter.prototype, "isDisposed", {
        /**
         * Whether the rate limiter is disposed.
         */
        get: function () {
            return this.payload === null;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Disposes the rate limiter.
     */
    RateLimiter.prototype.dispose = function () {
        if (this.isDisposed) {
            return;
        }
        this.payload = null;
        this.poll.dispose();
    };
    /**
     * Stop the function if it is mid-flight.
     */
    RateLimiter.prototype.stop = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.poll.stop()];
            });
        });
    };
    return RateLimiter;
}());
/**
 * Wraps and debounces a function that can be called multiple times and only
 * executes the underlying function one `interval` after the last invocation.
 *
 * @typeparam T - The resolved type of the underlying function. Defaults to any.
 *
 * @typeparam U - The rejected type of the underlying function. Defaults to any.
 */
var Debouncer = /** @class */ (function (_super) {
    __extends(Debouncer, _super);
    function Debouncer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Invokes the function and only executes after rate limit has elapsed.
     * Each invocation resets the timer.
     */
    Debouncer.prototype.invoke = function () {
        void this.poll.schedule({ interval: this.limit, phase: 'invoked' });
        return this.payload.promise;
    };
    return Debouncer;
}(RateLimiter));
/**
 * Wraps and throttles a function that can be called multiple times and only
 * executes the underlying function once per `interval`.
 *
 * @typeparam T - The resolved type of the underlying function. Defaults to any.
 *
 * @typeparam U - The rejected type of the underlying function. Defaults to any.
 */
var Throttler = /** @class */ (function (_super) {
    __extends(Throttler, _super);
    /**
     * Instantiate a throttler.
     *
     * @param fn - The function being throttled.
     *
     * @param options - Throttling configuration or throttling limit in ms.
     *
     * #### Notes
     * The `edge` defaults to `leading`; the `limit` defaults to `500`.
     */
    function Throttler(fn, options) {
        var _this = _super.call(this, fn, typeof options === 'number' ? options : options && options.limit) || this;
        var edge = 'leading';
        if (typeof options !== 'number') {
            options = options || {};
            edge = 'edge' in options ? options.edge : edge;
        }
        _this._interval = edge === 'trailing' ? _this.limit : Poll.IMMEDIATE;
        return _this;
    }
    /**
     * Throttles function invocations if one is currently in flight.
     */
    Throttler.prototype.invoke = function () {
        if (this.poll.state.phase !== 'invoked') {
            void this.poll.schedule({ interval: this._interval, phase: 'invoked' });
        }
        return this.payload.promise;
    };
    return Throttler;
}(RateLimiter));
/**
 * A namespace for `Throttler` interfaces.
 */
(function (Throttler) {
})(Throttler || (Throttler = {}));

export { Debouncer, Poll, RateLimiter, Throttler };
//# sourceMappingURL=index.es6.js.map
