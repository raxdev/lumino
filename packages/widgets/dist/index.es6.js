import { empty, each, iter, ArrayExt, StringExt, chain, once, map, ChainIterator, reduce, find, toArray, filter, max } from '@lumino/algorithm';
import { ElementExt, Selector, Platform } from '@lumino/domutils';
import { MessageLoop, Message, ConflatableMessage } from '@lumino/messaging';
import { AttachedProperty } from '@lumino/properties';
import { Signal } from '@lumino/signaling';
import { JSONExt, MimeData } from '@lumino/coreutils';
import { CommandRegistry } from '@lumino/commands';
import { VirtualDOM, h } from '@lumino/virtualdom';
import { DisposableDelegate } from '@lumino/disposable';
import { getKeyboardLayout } from '@lumino/keyboard';
import { Drag } from '@lumino/dragdrop';

// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2017, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
/**
 * A sizer object for use with the box engine layout functions.
 *
 * #### Notes
 * A box sizer holds the geometry information for an object along an
 * arbitrary layout orientation.
 *
 * For best performance, this class should be treated as a raw data
 * struct. It should not typically be subclassed.
 */
var BoxSizer = /** @class */ (function () {
    function BoxSizer() {
        /**
         * The preferred size for the sizer.
         *
         * #### Notes
         * The sizer will be given this initial size subject to its size
         * bounds. The sizer will not deviate from this size unless such
         * deviation is required to fit into the available layout space.
         *
         * There is no limit to this value, but it will be clamped to the
         * bounds defined by [[minSize]] and [[maxSize]].
         *
         * The default value is `0`.
         */
        this.sizeHint = 0;
        /**
         * The minimum size of the sizer.
         *
         * #### Notes
         * The sizer will never be sized less than this value, even if
         * it means the sizer will overflow the available layout space.
         *
         * It is assumed that this value lies in the range `[0, Infinity)`
         * and that it is `<=` to [[maxSize]]. Failure to adhere to this
         * constraint will yield undefined results.
         *
         * The default value is `0`.
         */
        this.minSize = 0;
        /**
         * The maximum size of the sizer.
         *
         * #### Notes
         * The sizer will never be sized greater than this value, even if
         * it means the sizer will underflow the available layout space.
         *
         * It is assumed that this value lies in the range `[0, Infinity]`
         * and that it is `>=` to [[minSize]]. Failure to adhere to this
         * constraint will yield undefined results.
         *
         * The default value is `Infinity`.
         */
        this.maxSize = Infinity;
        /**
         * The stretch factor for the sizer.
         *
         * #### Notes
         * This controls how much the sizer stretches relative to its sibling
         * sizers when layout space is distributed. A stretch factor of zero
         * is special and will cause the sizer to only be resized after all
         * other sizers with a stretch factor greater than zero have been
         * resized to their limits.
         *
         * It is assumed that this value is an integer that lies in the range
         * `[0, Infinity)`. Failure to adhere to this constraint will yield
         * undefined results.
         *
         * The default value is `1`.
         */
        this.stretch = 1;
        /**
         * The computed size of the sizer.
         *
         * #### Notes
         * This value is the output of a call to [[boxCalc]]. It represents
         * the computed size for the object along the layout orientation,
         * and will always lie in the range `[minSize, maxSize]`.
         *
         * This value is output only.
         *
         * Changing this value will have no effect.
         */
        this.size = 0;
        /**
         * An internal storage property for the layout algorithm.
         *
         * #### Notes
         * This value is used as temporary storage by the layout algorithm.
         *
         * Changing this value will have no effect.
         */
        this.done = false;
    }
    return BoxSizer;
}());
/**
 * The namespace for the box engine layout functions.
 */
var BoxEngine;
(function (BoxEngine) {
    /**
     * Calculate the optimal layout sizes for a sequence of box sizers.
     *
     * This distributes the available layout space among the box sizers
     * according to the following algorithm:
     *
     * 1. Initialize the sizers's size to its size hint and compute the
     *    sums for each of size hint, min size, and max size.
     *
     * 2. If the total size hint equals the available space, return.
     *
     * 3. If the available space is less than the total min size, set all
     *    sizers to their min size and return.
     *
     * 4. If the available space is greater than the total max size, set
     *    all sizers to their max size and return.
     *
     * 5. If the layout space is less than the total size hint, distribute
     *    the negative delta as follows:
     *
     *    a. Shrink each sizer with a stretch factor greater than zero by
     *       an amount proportional to the negative space and the sum of
     *       stretch factors. If the sizer reaches its min size, remove
     *       it and its stretch factor from the computation.
     *
     *    b. If after adjusting all stretch sizers there remains negative
     *       space, distribute the space equally among the sizers with a
     *       stretch factor of zero. If a sizer reaches its min size,
     *       remove it from the computation.
     *
     * 6. If the layout space is greater than the total size hint,
     *    distribute the positive delta as follows:
     *
     *    a. Expand each sizer with a stretch factor greater than zero by
     *       an amount proportional to the postive space and the sum of
     *       stretch factors. If the sizer reaches its max size, remove
     *       it and its stretch factor from the computation.
     *
     *    b. If after adjusting all stretch sizers there remains positive
     *       space, distribute the space equally among the sizers with a
     *       stretch factor of zero. If a sizer reaches its max size,
     *       remove it from the computation.
     *
     * 7. return
     *
     * @param sizers - The sizers for a particular layout line.
     *
     * @param space - The available layout space for the sizers.
     *
     * @returns The delta between the provided available space and the
     *   actual consumed space. This value will be zero if the sizers
     *   can be adjusted to fit, negative if the available space is too
     *   small, and positive if the available space is too large.
     *
     * #### Notes
     * The [[size]] of each sizer is updated with the computed size.
     *
     * This function can be called at any time to recompute the layout for
     * an existing sequence of sizers. The previously computed results will
     * have no effect on the new output. It is therefore not necessary to
     * create new sizer objects on each resize event.
     */
    function calc(sizers, space) {
        // Bail early if there is nothing to do.
        var count = sizers.length;
        if (count === 0) {
            return space;
        }
        // Setup the size and stretch counters.
        var totalMin = 0;
        var totalMax = 0;
        var totalSize = 0;
        var totalStretch = 0;
        var stretchCount = 0;
        // Setup the sizers and compute the totals.
        for (var i = 0; i < count; ++i) {
            var sizer = sizers[i];
            var min = sizer.minSize;
            var max = sizer.maxSize;
            var hint = sizer.sizeHint;
            sizer.done = false;
            sizer.size = Math.max(min, Math.min(hint, max));
            totalSize += sizer.size;
            totalMin += min;
            totalMax += max;
            if (sizer.stretch > 0) {
                totalStretch += sizer.stretch;
                stretchCount++;
            }
        }
        // If the space is equal to the total size, return early.
        if (space === totalSize) {
            return 0;
        }
        // If the space is less than the total min, minimize each sizer.
        if (space <= totalMin) {
            for (var i = 0; i < count; ++i) {
                var sizer = sizers[i];
                sizer.size = sizer.minSize;
            }
            return space - totalMin;
        }
        // If the space is greater than the total max, maximize each sizer.
        if (space >= totalMax) {
            for (var i = 0; i < count; ++i) {
                var sizer = sizers[i];
                sizer.size = sizer.maxSize;
            }
            return space - totalMax;
        }
        // The loops below perform sub-pixel precision sizing. A near zero
        // value is used for compares instead of zero to ensure that the
        // loop terminates when the subdivided space is reasonably small.
        var nearZero = 0.01;
        // A counter which is decremented each time a sizer is resized to
        // its limit. This ensures the loops terminate even if there is
        // space remaining to distribute.
        var notDoneCount = count;
        // Distribute negative delta space.
        if (space < totalSize) {
            // Shrink each stretchable sizer by an amount proportional to its
            // stretch factor. If a sizer reaches its min size it's marked as
            // done. The loop progresses in phases where each sizer is given
            // a chance to consume its fair share for the pass, regardless of
            // whether a sizer before it reached its limit. This continues
            // until the stretchable sizers or the free space is exhausted.
            var freeSpace = totalSize - space;
            while (stretchCount > 0 && freeSpace > nearZero) {
                var distSpace = freeSpace;
                var distStretch = totalStretch;
                for (var i = 0; i < count; ++i) {
                    var sizer = sizers[i];
                    if (sizer.done || sizer.stretch === 0) {
                        continue;
                    }
                    var amt = sizer.stretch * distSpace / distStretch;
                    if (sizer.size - amt <= sizer.minSize) {
                        freeSpace -= sizer.size - sizer.minSize;
                        totalStretch -= sizer.stretch;
                        sizer.size = sizer.minSize;
                        sizer.done = true;
                        notDoneCount--;
                        stretchCount--;
                    }
                    else {
                        freeSpace -= amt;
                        sizer.size -= amt;
                    }
                }
            }
            // Distribute any remaining space evenly among the non-stretchable
            // sizers. This progresses in phases in the same manner as above.
            while (notDoneCount > 0 && freeSpace > nearZero) {
                var amt = freeSpace / notDoneCount;
                for (var i = 0; i < count; ++i) {
                    var sizer = sizers[i];
                    if (sizer.done) {
                        continue;
                    }
                    if (sizer.size - amt <= sizer.minSize) {
                        freeSpace -= sizer.size - sizer.minSize;
                        sizer.size = sizer.minSize;
                        sizer.done = true;
                        notDoneCount--;
                    }
                    else {
                        freeSpace -= amt;
                        sizer.size -= amt;
                    }
                }
            }
        }
        // Distribute positive delta space.
        else {
            // Expand each stretchable sizer by an amount proportional to its
            // stretch factor. If a sizer reaches its max size it's marked as
            // done. The loop progresses in phases where each sizer is given
            // a chance to consume its fair share for the pass, regardless of
            // whether a sizer before it reached its limit. This continues
            // until the stretchable sizers or the free space is exhausted.
            var freeSpace = space - totalSize;
            while (stretchCount > 0 && freeSpace > nearZero) {
                var distSpace = freeSpace;
                var distStretch = totalStretch;
                for (var i = 0; i < count; ++i) {
                    var sizer = sizers[i];
                    if (sizer.done || sizer.stretch === 0) {
                        continue;
                    }
                    var amt = sizer.stretch * distSpace / distStretch;
                    if (sizer.size + amt >= sizer.maxSize) {
                        freeSpace -= sizer.maxSize - sizer.size;
                        totalStretch -= sizer.stretch;
                        sizer.size = sizer.maxSize;
                        sizer.done = true;
                        notDoneCount--;
                        stretchCount--;
                    }
                    else {
                        freeSpace -= amt;
                        sizer.size += amt;
                    }
                }
            }
            // Distribute any remaining space evenly among the non-stretchable
            // sizers. This progresses in phases in the same manner as above.
            while (notDoneCount > 0 && freeSpace > nearZero) {
                var amt = freeSpace / notDoneCount;
                for (var i = 0; i < count; ++i) {
                    var sizer = sizers[i];
                    if (sizer.done) {
                        continue;
                    }
                    if (sizer.size + amt >= sizer.maxSize) {
                        freeSpace -= sizer.maxSize - sizer.size;
                        sizer.size = sizer.maxSize;
                        sizer.done = true;
                        notDoneCount--;
                    }
                    else {
                        freeSpace -= amt;
                        sizer.size += amt;
                    }
                }
            }
        }
        // Indicate that the consumed space equals the available space.
        return 0;
    }
    BoxEngine.calc = calc;
    /**
     * Adjust a sizer by a delta and update its neighbors accordingly.
     *
     * @param sizers - The sizers which should be adjusted.
     *
     * @param index - The index of the sizer to grow.
     *
     * @param delta - The amount to adjust the sizer, positive or negative.
     *
     * #### Notes
     * This will adjust the indicated sizer by the specified amount, along
     * with the sizes of the appropriate neighbors, subject to the limits
     * specified by each of the sizers.
     *
     * This is useful when implementing box layouts where the boundaries
     * between the sizers are interactively adjustable by the user.
     */
    function adjust(sizers, index, delta) {
        // Bail early when there is nothing to do.
        if (sizers.length === 0 || delta === 0) {
            return;
        }
        // Dispatch to the proper implementation.
        if (delta > 0) {
            growSizer(sizers, index, delta);
        }
        else {
            shrinkSizer(sizers, index, -delta);
        }
    }
    BoxEngine.adjust = adjust;
    /**
     * Grow a sizer by a positive delta and adjust neighbors.
     */
    function growSizer(sizers, index, delta) {
        // Compute how much the items to the left can expand.
        var growLimit = 0;
        for (var i = 0; i <= index; ++i) {
            var sizer = sizers[i];
            growLimit += sizer.maxSize - sizer.size;
        }
        // Compute how much the items to the right can shrink.
        var shrinkLimit = 0;
        for (var i = index + 1, n = sizers.length; i < n; ++i) {
            var sizer = sizers[i];
            shrinkLimit += sizer.size - sizer.minSize;
        }
        // Clamp the delta adjustment to the limits.
        delta = Math.min(delta, growLimit, shrinkLimit);
        // Grow the sizers to the left by the delta.
        var grow = delta;
        for (var i = index; i >= 0 && grow > 0; --i) {
            var sizer = sizers[i];
            var limit = sizer.maxSize - sizer.size;
            if (limit >= grow) {
                sizer.sizeHint = sizer.size + grow;
                grow = 0;
            }
            else {
                sizer.sizeHint = sizer.size + limit;
                grow -= limit;
            }
        }
        // Shrink the sizers to the right by the delta.
        var shrink = delta;
        for (var i = index + 1, n = sizers.length; i < n && shrink > 0; ++i) {
            var sizer = sizers[i];
            var limit = sizer.size - sizer.minSize;
            if (limit >= shrink) {
                sizer.sizeHint = sizer.size - shrink;
                shrink = 0;
            }
            else {
                sizer.sizeHint = sizer.size - limit;
                shrink -= limit;
            }
        }
    }
    /**
     * Shrink a sizer by a positive delta and adjust neighbors.
     */
    function shrinkSizer(sizers, index, delta) {
        // Compute how much the items to the right can expand.
        var growLimit = 0;
        for (var i = index + 1, n = sizers.length; i < n; ++i) {
            var sizer = sizers[i];
            growLimit += sizer.maxSize - sizer.size;
        }
        // Compute how much the items to the left can shrink.
        var shrinkLimit = 0;
        for (var i = 0; i <= index; ++i) {
            var sizer = sizers[i];
            shrinkLimit += sizer.size - sizer.minSize;
        }
        // Clamp the delta adjustment to the limits.
        delta = Math.min(delta, growLimit, shrinkLimit);
        // Grow the sizers to the right by the delta.
        var grow = delta;
        for (var i = index + 1, n = sizers.length; i < n && grow > 0; ++i) {
            var sizer = sizers[i];
            var limit = sizer.maxSize - sizer.size;
            if (limit >= grow) {
                sizer.sizeHint = sizer.size + grow;
                grow = 0;
            }
            else {
                sizer.sizeHint = sizer.size + limit;
                grow -= limit;
            }
        }
        // Shrink the sizers to the left by the delta.
        var shrink = delta;
        for (var i = index; i >= 0 && shrink > 0; --i) {
            var sizer = sizers[i];
            var limit = sizer.size - sizer.minSize;
            if (limit >= shrink) {
                sizer.sizeHint = sizer.size - shrink;
                shrink = 0;
            }
            else {
                sizer.sizeHint = sizer.size - limit;
                shrink -= limit;
            }
        }
    }
})(BoxEngine || (BoxEngine = {}));

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

// Copyright (c) Jupyter Development Team.
/**
 * An object which holds data related to an object's title.
 *
 * #### Notes
 * A title object is intended to hold the data necessary to display a
 * header for a particular object. A common example is the `TabPanel`,
 * which uses the widget title to populate the tab for a child widget.
 */
var Title = /** @class */ (function () {
    /**
     * Construct a new title.
     *
     * @param options - The options for initializing the title.
     */
    function Title(options) {
        this._label = '';
        this._caption = '';
        this._mnemonic = -1;
        this._iconClass = '';
        this._iconLabel = '';
        this._className = '';
        this._closable = false;
        this._changed = new Signal(this);
        this.owner = options.owner;
        if (options.label !== undefined) {
            this._label = options.label;
        }
        if (options.mnemonic !== undefined) {
            this._mnemonic = options.mnemonic;
        }
        if (options.icon !== undefined) {
            /* <DEPRECATED> */
            if (typeof options.icon === "string") {
                // when ._icon is null, the .icon getter will alias .iconClass
                this._icon = null;
                this._iconClass = options.icon;
            }
            else {
                /* </DEPRECATED> */
                this._icon = options.icon;
                /* <DEPRECATED> */
            }
            /* </DEPRECATED> */
        }
        /* <DEPRECATED> */
        else {
            // if unset, default to aliasing .iconClass
            this._icon = null;
        }
        /* </DEPRECATED> */
        if (options.iconClass !== undefined) {
            this._iconClass = options.iconClass;
        }
        if (options.iconLabel !== undefined) {
            this._iconLabel = options.iconLabel;
        }
        if (options.iconRenderer !== undefined) {
            this._icon = options.iconRenderer;
        }
        if (options.caption !== undefined) {
            this._caption = options.caption;
        }
        if (options.className !== undefined) {
            this._className = options.className;
        }
        if (options.closable !== undefined) {
            this._closable = options.closable;
        }
        this._dataset = options.dataset || {};
    }
    Object.defineProperty(Title.prototype, "changed", {
        /**
         * A signal emitted when the state of the title changes.
         */
        get: function () {
            return this._changed;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Title.prototype, "label", {
        /**
         * Get the label for the title.
         *
         * #### Notes
         * The default value is an empty string.
         */
        get: function () {
            return this._label;
        },
        /**
         * Set the label for the title.
         */
        set: function (value) {
            if (this._label === value) {
                return;
            }
            this._label = value;
            this._changed.emit(undefined);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Title.prototype, "mnemonic", {
        /**
         * Get the mnemonic index for the title.
         *
         * #### Notes
         * The default value is `-1`.
         */
        get: function () {
            return this._mnemonic;
        },
        /**
         * Set the mnemonic index for the title.
         */
        set: function (value) {
            if (this._mnemonic === value) {
                return;
            }
            this._mnemonic = value;
            this._changed.emit(undefined);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Title.prototype, "icon", {
        /**
         * Get the icon renderer for the title.
         *
         * #### Notes
         * The default value is undefined.
         *
         * DEPRECATED: if set to a string value, the .icon field will function as
         * an alias for the .iconClass field, for backwards compatibility
         */
        get: function () {
            /* <DEPRECATED> */
            if (this._icon === null) {
                // only alias .iconClass if ._icon has been explicitly nulled
                return this.iconClass;
            }
            /* </DEPRECATED> */
            return this._icon;
        },
        /**
         * Set the icon renderer for the title.
         *
         * #### Notes
         * A renderer is an object that supplies a render and unrender function.
         *
         * DEPRECATED: if set to a string value, the .icon field will function as
         * an alias for the .iconClass field, for backwards compatibility
         */
        set: function (value /* </DEPRECATED> */) {
            /* <DEPRECATED> */
            if (typeof value === "string") {
                // when ._icon is null, the .icon getter will alias .iconClass
                this._icon = null;
                this.iconClass = value;
            }
            else {
                /* </DEPRECATED> */
                if (this._icon === value) {
                    return;
                }
                this._icon = value;
                this._changed.emit(undefined);
                /* <DEPRECATED> */
            }
            /* </DEPRECATED> */
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Title.prototype, "iconClass", {
        /**
         * Get the icon class name for the title.
         *
         * #### Notes
         * The default value is an empty string.
         */
        get: function () {
            return this._iconClass;
        },
        /**
         * Set the icon class name for the title.
         *
         * #### Notes
         * Multiple class names can be separated with whitespace.
         */
        set: function (value) {
            if (this._iconClass === value) {
                return;
            }
            this._iconClass = value;
            this._changed.emit(undefined);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Title.prototype, "iconLabel", {
        /**
         * Get the icon label for the title.
         *
         * #### Notes
         * The default value is an empty string.
         */
        get: function () {
            return this._iconLabel;
        },
        /**
         * Set the icon label for the title.
         *
         * #### Notes
         * Multiple class names can be separated with whitespace.
         */
        set: function (value) {
            if (this._iconLabel === value) {
                return;
            }
            this._iconLabel = value;
            this._changed.emit(undefined);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Title.prototype, "iconRenderer", {
        /**
         * @deprecated Use `icon` instead.
         */
        get: function () {
            return this._icon || undefined;
        },
        /**
         * @deprecated Use `icon` instead.
         */
        set: function (value) {
            this.icon = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Title.prototype, "caption", {
        /**
         * Get the caption for the title.
         *
         * #### Notes
         * The default value is an empty string.
         */
        get: function () {
            return this._caption;
        },
        /**
         * Set the caption for the title.
         */
        set: function (value) {
            if (this._caption === value) {
                return;
            }
            this._caption = value;
            this._changed.emit(undefined);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Title.prototype, "className", {
        /**
         * Get the extra class name for the title.
         *
         * #### Notes
         * The default value is an empty string.
         */
        get: function () {
            return this._className;
        },
        /**
         * Set the extra class name for the title.
         *
         * #### Notes
         * Multiple class names can be separated with whitespace.
         */
        set: function (value) {
            if (this._className === value) {
                return;
            }
            this._className = value;
            this._changed.emit(undefined);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Title.prototype, "closable", {
        /**
         * Get the closable state for the title.
         *
         * #### Notes
         * The default value is `false`.
         */
        get: function () {
            return this._closable;
        },
        /**
         * Set the closable state for the title.
         *
         * #### Notes
         * This controls the presence of a close icon when applicable.
         */
        set: function (value) {
            if (this._closable === value) {
                return;
            }
            this._closable = value;
            this._changed.emit(undefined);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Title.prototype, "dataset", {
        /**
         * Get the dataset for the title.
         *
         * #### Notes
         * The default value is an empty dataset.
         */
        get: function () {
            return this._dataset;
        },
        /**
         * Set the dataset for the title.
         *
         * #### Notes
         * This controls the data attributes when applicable.
         */
        set: function (value) {
            if (this._dataset === value) {
                return;
            }
            this._dataset = value;
            this._changed.emit(undefined);
        },
        enumerable: true,
        configurable: true
    });
    return Title;
}());

/**
 * The base class of the lumino widget hierarchy.
 *
 * #### Notes
 * This class will typically be subclassed in order to create a useful
 * widget. However, it can be used directly to host externally created
 * content.
 */
var Widget = /** @class */ (function () {
    /**
     * Construct a new widget.
     *
     * @param options - The options for initializing the widget.
     */
    function Widget(options) {
        if (options === void 0) { options = {}; }
        this._flags = 0;
        this._layout = null;
        this._parent = null;
        this._disposed = new Signal(this);
        this.node = Private.createNode(options);
        this.addClass('lm-Widget');
        /* <DEPRECATED> */
        this.addClass('p-Widget');
        /* </DEPRECATED> */
    }
    /**
     * Dispose of the widget and its descendant widgets.
     *
     * #### Notes
     * It is unsafe to use the widget after it has been disposed.
     *
     * All calls made to this method after the first are a no-op.
     */
    Widget.prototype.dispose = function () {
        // Do nothing if the widget is already disposed.
        if (this.isDisposed) {
            return;
        }
        // Set the disposed flag and emit the disposed signal.
        this.setFlag(Widget.Flag.IsDisposed);
        this._disposed.emit(undefined);
        // Remove or detach the widget if necessary.
        if (this.parent) {
            this.parent = null;
        }
        else if (this.isAttached) {
            Widget.detach(this);
        }
        // Dispose of the widget layout.
        if (this._layout) {
            this._layout.dispose();
            this._layout = null;
        }
        // Clear the extra data associated with the widget.
        Signal.clearData(this);
        MessageLoop.clearData(this);
        AttachedProperty.clearData(this);
    };
    Object.defineProperty(Widget.prototype, "disposed", {
        /**
         * A signal emitted when the widget is disposed.
         */
        get: function () {
            return this._disposed;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Widget.prototype, "isDisposed", {
        /**
         * Test whether the widget has been disposed.
         */
        get: function () {
            return this.testFlag(Widget.Flag.IsDisposed);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Widget.prototype, "isAttached", {
        /**
         * Test whether the widget's node is attached to the DOM.
         */
        get: function () {
            return this.testFlag(Widget.Flag.IsAttached);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Widget.prototype, "isHidden", {
        /**
         * Test whether the widget is explicitly hidden.
         */
        get: function () {
            return this.testFlag(Widget.Flag.IsHidden);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Widget.prototype, "isVisible", {
        /**
         * Test whether the widget is visible.
         *
         * #### Notes
         * A widget is visible when it is attached to the DOM, is not
         * explicitly hidden, and has no explicitly hidden ancestors.
         */
        get: function () {
            return this.testFlag(Widget.Flag.IsVisible);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Widget.prototype, "title", {
        /**
         * The title object for the widget.
         *
         * #### Notes
         * The title object is used by some container widgets when displaying
         * the widget alongside some title, such as a tab panel or side bar.
         *
         * Since not all widgets will use the title, it is created on demand.
         *
         * The `owner` property of the title is set to this widget.
         */
        get: function () {
            return Private.titleProperty.get(this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Widget.prototype, "id", {
        /**
         * Get the id of the widget's DOM node.
         */
        get: function () {
            return this.node.id;
        },
        /**
         * Set the id of the widget's DOM node.
         */
        set: function (value) {
            this.node.id = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Widget.prototype, "dataset", {
        /**
         * The dataset for the widget's DOM node.
         */
        get: function () {
            return this.node.dataset;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Widget.prototype, "parent", {
        /**
         * Get the parent of the widget.
         */
        get: function () {
            return this._parent;
        },
        /**
         * Set the parent of the widget.
         *
         * #### Notes
         * Children are typically added to a widget by using a layout, which
         * means user code will not normally set the parent widget directly.
         *
         * The widget will be automatically removed from its old parent.
         *
         * This is a no-op if there is no effective parent change.
         */
        set: function (value) {
            if (this._parent === value) {
                return;
            }
            if (value && this.contains(value)) {
                throw new Error('Invalid parent widget.');
            }
            if (this._parent && !this._parent.isDisposed) {
                var msg = new Widget.ChildMessage('child-removed', this);
                MessageLoop.sendMessage(this._parent, msg);
            }
            this._parent = value;
            if (this._parent && !this._parent.isDisposed) {
                var msg = new Widget.ChildMessage('child-added', this);
                MessageLoop.sendMessage(this._parent, msg);
            }
            if (!this.isDisposed) {
                MessageLoop.sendMessage(this, Widget.Msg.ParentChanged);
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Widget.prototype, "layout", {
        /**
         * Get the layout for the widget.
         */
        get: function () {
            return this._layout;
        },
        /**
         * Set the layout for the widget.
         *
         * #### Notes
         * The layout is single-use only. It cannot be changed after the
         * first assignment.
         *
         * The layout is disposed automatically when the widget is disposed.
         */
        set: function (value) {
            if (this._layout === value) {
                return;
            }
            if (this.testFlag(Widget.Flag.DisallowLayout)) {
                throw new Error('Cannot set widget layout.');
            }
            if (this._layout) {
                throw new Error('Cannot change widget layout.');
            }
            if (value.parent) {
                throw new Error('Cannot change layout parent.');
            }
            this._layout = value;
            value.parent = this;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Create an iterator over the widget's children.
     *
     * @returns A new iterator over the children of the widget.
     *
     * #### Notes
     * The widget must have a populated layout in order to have children.
     *
     * If a layout is not installed, the returned iterator will be empty.
     */
    Widget.prototype.children = function () {
        return this._layout ? this._layout.iter() : empty();
    };
    /**
     * Test whether a widget is a descendant of this widget.
     *
     * @param widget - The descendant widget of interest.
     *
     * @returns `true` if the widget is a descendant, `false` otherwise.
     */
    Widget.prototype.contains = function (widget) {
        for (var value = widget; value; value = value._parent) {
            if (value === this) {
                return true;
            }
        }
        return false;
    };
    /**
     * Test whether the widget's DOM node has the given class name.
     *
     * @param name - The class name of interest.
     *
     * @returns `true` if the node has the class, `false` otherwise.
     */
    Widget.prototype.hasClass = function (name) {
        return this.node.classList.contains(name);
    };
    /**
     * Add a class name to the widget's DOM node.
     *
     * @param name - The class name to add to the node.
     *
     * #### Notes
     * If the class name is already added to the node, this is a no-op.
     *
     * The class name must not contain whitespace.
     */
    Widget.prototype.addClass = function (name) {
        this.node.classList.add(name);
    };
    /**
     * Remove a class name from the widget's DOM node.
     *
     * @param name - The class name to remove from the node.
     *
     * #### Notes
     * If the class name is not yet added to the node, this is a no-op.
     *
     * The class name must not contain whitespace.
     */
    Widget.prototype.removeClass = function (name) {
        this.node.classList.remove(name);
    };
    /**
     * Toggle a class name on the widget's DOM node.
     *
     * @param name - The class name to toggle on the node.
     *
     * @param force - Whether to force add the class (`true`) or force
     *   remove the class (`false`). If not provided, the presence of
     *   the class will be toggled from its current state.
     *
     * @returns `true` if the class is now present, `false` otherwise.
     *
     * #### Notes
     * The class name must not contain whitespace.
     */
    Widget.prototype.toggleClass = function (name, force) {
        if (force === true) {
            this.node.classList.add(name);
            return true;
        }
        if (force === false) {
            this.node.classList.remove(name);
            return false;
        }
        return this.node.classList.toggle(name);
    };
    /**
     * Post an `'update-request'` message to the widget.
     *
     * #### Notes
     * This is a simple convenience method for posting the message.
     */
    Widget.prototype.update = function () {
        MessageLoop.postMessage(this, Widget.Msg.UpdateRequest);
    };
    /**
     * Post a `'fit-request'` message to the widget.
     *
     * #### Notes
     * This is a simple convenience method for posting the message.
     */
    Widget.prototype.fit = function () {
        MessageLoop.postMessage(this, Widget.Msg.FitRequest);
    };
    /**
     * Post an `'activate-request'` message to the widget.
     *
     * #### Notes
     * This is a simple convenience method for posting the message.
     */
    Widget.prototype.activate = function () {
        MessageLoop.postMessage(this, Widget.Msg.ActivateRequest);
    };
    /**
     * Send a `'close-request'` message to the widget.
     *
     * #### Notes
     * This is a simple convenience method for sending the message.
     */
    Widget.prototype.close = function () {
        MessageLoop.sendMessage(this, Widget.Msg.CloseRequest);
    };
    /**
     * Show the widget and make it visible to its parent widget.
     *
     * #### Notes
     * This causes the [[isHidden]] property to be `false`.
     *
     * If the widget is not explicitly hidden, this is a no-op.
     */
    Widget.prototype.show = function () {
        if (!this.testFlag(Widget.Flag.IsHidden)) {
            return;
        }
        if (this.isAttached && (!this.parent || this.parent.isVisible)) {
            MessageLoop.sendMessage(this, Widget.Msg.BeforeShow);
        }
        this.clearFlag(Widget.Flag.IsHidden);
        this.removeClass('lm-mod-hidden');
        /* <DEPRECATED> */
        this.removeClass('p-mod-hidden');
        /* </DEPRECATED> */
        if (this.isAttached && (!this.parent || this.parent.isVisible)) {
            MessageLoop.sendMessage(this, Widget.Msg.AfterShow);
        }
        if (this.parent) {
            var msg = new Widget.ChildMessage('child-shown', this);
            MessageLoop.sendMessage(this.parent, msg);
        }
    };
    /**
     * Hide the widget and make it hidden to its parent widget.
     *
     * #### Notes
     * This causes the [[isHidden]] property to be `true`.
     *
     * If the widget is explicitly hidden, this is a no-op.
     */
    Widget.prototype.hide = function () {
        if (this.testFlag(Widget.Flag.IsHidden)) {
            return;
        }
        if (this.isAttached && (!this.parent || this.parent.isVisible)) {
            MessageLoop.sendMessage(this, Widget.Msg.BeforeHide);
        }
        this.setFlag(Widget.Flag.IsHidden);
        this.addClass('lm-mod-hidden');
        /* <DEPRECATED> */
        this.addClass('p-mod-hidden');
        /* </DEPRECATED> */
        if (this.isAttached && (!this.parent || this.parent.isVisible)) {
            MessageLoop.sendMessage(this, Widget.Msg.AfterHide);
        }
        if (this.parent) {
            var msg = new Widget.ChildMessage('child-hidden', this);
            MessageLoop.sendMessage(this.parent, msg);
        }
    };
    /**
     * Show or hide the widget according to a boolean value.
     *
     * @param hidden - `true` to hide the widget, or `false` to show it.
     *
     * #### Notes
     * This is a convenience method for `hide()` and `show()`.
     */
    Widget.prototype.setHidden = function (hidden) {
        if (hidden) {
            this.hide();
        }
        else {
            this.show();
        }
    };
    /**
     * Test whether the given widget flag is set.
     *
     * #### Notes
     * This will not typically be called directly by user code.
     */
    Widget.prototype.testFlag = function (flag) {
        return (this._flags & flag) !== 0;
    };
    /**
     * Set the given widget flag.
     *
     * #### Notes
     * This will not typically be called directly by user code.
     */
    Widget.prototype.setFlag = function (flag) {
        this._flags |= flag;
    };
    /**
     * Clear the given widget flag.
     *
     * #### Notes
     * This will not typically be called directly by user code.
     */
    Widget.prototype.clearFlag = function (flag) {
        this._flags &= ~flag;
    };
    /**
     * Process a message sent to the widget.
     *
     * @param msg - The message sent to the widget.
     *
     * #### Notes
     * Subclasses may reimplement this method as needed.
     */
    Widget.prototype.processMessage = function (msg) {
        switch (msg.type) {
            case 'resize':
                this.notifyLayout(msg);
                this.onResize(msg);
                break;
            case 'update-request':
                this.notifyLayout(msg);
                this.onUpdateRequest(msg);
                break;
            case 'fit-request':
                this.notifyLayout(msg);
                this.onFitRequest(msg);
                break;
            case 'before-show':
                this.notifyLayout(msg);
                this.onBeforeShow(msg);
                break;
            case 'after-show':
                this.setFlag(Widget.Flag.IsVisible);
                this.notifyLayout(msg);
                this.onAfterShow(msg);
                break;
            case 'before-hide':
                this.notifyLayout(msg);
                this.onBeforeHide(msg);
                break;
            case 'after-hide':
                this.clearFlag(Widget.Flag.IsVisible);
                this.notifyLayout(msg);
                this.onAfterHide(msg);
                break;
            case 'before-attach':
                this.notifyLayout(msg);
                this.onBeforeAttach(msg);
                break;
            case 'after-attach':
                if (!this.isHidden && (!this.parent || this.parent.isVisible)) {
                    this.setFlag(Widget.Flag.IsVisible);
                }
                this.setFlag(Widget.Flag.IsAttached);
                this.notifyLayout(msg);
                this.onAfterAttach(msg);
                break;
            case 'before-detach':
                this.notifyLayout(msg);
                this.onBeforeDetach(msg);
                break;
            case 'after-detach':
                this.clearFlag(Widget.Flag.IsVisible);
                this.clearFlag(Widget.Flag.IsAttached);
                this.notifyLayout(msg);
                this.onAfterDetach(msg);
                break;
            case 'activate-request':
                this.notifyLayout(msg);
                this.onActivateRequest(msg);
                break;
            case 'close-request':
                this.notifyLayout(msg);
                this.onCloseRequest(msg);
                break;
            case 'child-added':
                this.notifyLayout(msg);
                this.onChildAdded(msg);
                break;
            case 'child-removed':
                this.notifyLayout(msg);
                this.onChildRemoved(msg);
                break;
            default:
                this.notifyLayout(msg);
                break;
        }
    };
    /**
     * Invoke the message processing routine of the widget's layout.
     *
     * @param msg - The message to dispatch to the layout.
     *
     * #### Notes
     * This is a no-op if the widget does not have a layout.
     *
     * This will not typically be called directly by user code.
     */
    Widget.prototype.notifyLayout = function (msg) {
        if (this._layout) {
            this._layout.processParentMessage(msg);
        }
    };
    /**
     * A message handler invoked on a `'close-request'` message.
     *
     * #### Notes
     * The default implementation unparents or detaches the widget.
     */
    Widget.prototype.onCloseRequest = function (msg) {
        if (this.parent) {
            this.parent = null;
        }
        else if (this.isAttached) {
            Widget.detach(this);
        }
    };
    /**
     * A message handler invoked on a `'resize'` message.
     *
     * #### Notes
     * The default implementation of this handler is a no-op.
     */
    Widget.prototype.onResize = function (msg) { };
    /**
     * A message handler invoked on an `'update-request'` message.
     *
     * #### Notes
     * The default implementation of this handler is a no-op.
     */
    Widget.prototype.onUpdateRequest = function (msg) { };
    /**
     * A message handler invoked on a `'fit-request'` message.
     *
     * #### Notes
     * The default implementation of this handler is a no-op.
     */
    Widget.prototype.onFitRequest = function (msg) { };
    /**
     * A message handler invoked on an `'activate-request'` message.
     *
     * #### Notes
     * The default implementation of this handler is a no-op.
     */
    Widget.prototype.onActivateRequest = function (msg) { };
    /**
     * A message handler invoked on a `'before-show'` message.
     *
     * #### Notes
     * The default implementation of this handler is a no-op.
     */
    Widget.prototype.onBeforeShow = function (msg) { };
    /**
     * A message handler invoked on an `'after-show'` message.
     *
     * #### Notes
     * The default implementation of this handler is a no-op.
     */
    Widget.prototype.onAfterShow = function (msg) { };
    /**
     * A message handler invoked on a `'before-hide'` message.
     *
     * #### Notes
     * The default implementation of this handler is a no-op.
     */
    Widget.prototype.onBeforeHide = function (msg) { };
    /**
     * A message handler invoked on an `'after-hide'` message.
     *
     * #### Notes
     * The default implementation of this handler is a no-op.
     */
    Widget.prototype.onAfterHide = function (msg) { };
    /**
     * A message handler invoked on a `'before-attach'` message.
     *
     * #### Notes
     * The default implementation of this handler is a no-op.
     */
    Widget.prototype.onBeforeAttach = function (msg) { };
    /**
     * A message handler invoked on an `'after-attach'` message.
     *
     * #### Notes
     * The default implementation of this handler is a no-op.
     */
    Widget.prototype.onAfterAttach = function (msg) { };
    /**
     * A message handler invoked on a `'before-detach'` message.
     *
     * #### Notes
     * The default implementation of this handler is a no-op.
     */
    Widget.prototype.onBeforeDetach = function (msg) { };
    /**
     * A message handler invoked on an `'after-detach'` message.
     *
     * #### Notes
     * The default implementation of this handler is a no-op.
     */
    Widget.prototype.onAfterDetach = function (msg) { };
    /**
     * A message handler invoked on a `'child-added'` message.
     *
     * #### Notes
     * The default implementation of this handler is a no-op.
     */
    Widget.prototype.onChildAdded = function (msg) { };
    /**
     * A message handler invoked on a `'child-removed'` message.
     *
     * #### Notes
     * The default implementation of this handler is a no-op.
     */
    Widget.prototype.onChildRemoved = function (msg) { };
    return Widget;
}());
/**
 * The namespace for the `Widget` class statics.
 */
(function (Widget) {
    /**
     * An enum of widget bit flags.
     */
    var Flag;
    (function (Flag) {
        /**
         * The widget has been disposed.
         */
        Flag[Flag["IsDisposed"] = 1] = "IsDisposed";
        /**
         * The widget is attached to the DOM.
         */
        Flag[Flag["IsAttached"] = 2] = "IsAttached";
        /**
         * The widget is hidden.
         */
        Flag[Flag["IsHidden"] = 4] = "IsHidden";
        /**
         * The widget is visible.
         */
        Flag[Flag["IsVisible"] = 8] = "IsVisible";
        /**
         * A layout cannot be set on the widget.
         */
        Flag[Flag["DisallowLayout"] = 16] = "DisallowLayout";
    })(Flag = Widget.Flag || (Widget.Flag = {}));
    /**
     * A collection of stateless messages related to widgets.
     */
    var Msg;
    (function (Msg) {
        /**
         * A singleton `'before-show'` message.
         *
         * #### Notes
         * This message is sent to a widget before it becomes visible.
         *
         * This message is **not** sent when the widget is being attached.
         */
        Msg.BeforeShow = new Message('before-show');
        /**
         * A singleton `'after-show'` message.
         *
         * #### Notes
         * This message is sent to a widget after it becomes visible.
         *
         * This message is **not** sent when the widget is being attached.
         */
        Msg.AfterShow = new Message('after-show');
        /**
         * A singleton `'before-hide'` message.
         *
         * #### Notes
         * This message is sent to a widget before it becomes not-visible.
         *
         * This message is **not** sent when the widget is being detached.
         */
        Msg.BeforeHide = new Message('before-hide');
        /**
         * A singleton `'after-hide'` message.
         *
         * #### Notes
         * This message is sent to a widget after it becomes not-visible.
         *
         * This message is **not** sent when the widget is being detached.
         */
        Msg.AfterHide = new Message('after-hide');
        /**
         * A singleton `'before-attach'` message.
         *
         * #### Notes
         * This message is sent to a widget before it is attached.
         */
        Msg.BeforeAttach = new Message('before-attach');
        /**
         * A singleton `'after-attach'` message.
         *
         * #### Notes
         * This message is sent to a widget after it is attached.
         */
        Msg.AfterAttach = new Message('after-attach');
        /**
         * A singleton `'before-detach'` message.
         *
         * #### Notes
         * This message is sent to a widget before it is detached.
         */
        Msg.BeforeDetach = new Message('before-detach');
        /**
         * A singleton `'after-detach'` message.
         *
         * #### Notes
         * This message is sent to a widget after it is detached.
         */
        Msg.AfterDetach = new Message('after-detach');
        /**
         * A singleton `'parent-changed'` message.
         *
         * #### Notes
         * This message is sent to a widget when its parent has changed.
         */
        Msg.ParentChanged = new Message('parent-changed');
        /**
         * A singleton conflatable `'update-request'` message.
         *
         * #### Notes
         * This message can be dispatched to supporting widgets in order to
         * update their content based on the current widget state. Not all
         * widgets will respond to messages of this type.
         *
         * For widgets with a layout, this message will inform the layout to
         * update the position and size of its child widgets.
         */
        Msg.UpdateRequest = new ConflatableMessage('update-request');
        /**
         * A singleton conflatable `'fit-request'` message.
         *
         * #### Notes
         * For widgets with a layout, this message will inform the layout to
         * recalculate its size constraints to fit the space requirements of
         * its child widgets, and to update their position and size. Not all
         * layouts will respond to messages of this type.
         */
        Msg.FitRequest = new ConflatableMessage('fit-request');
        /**
         * A singleton conflatable `'activate-request'` message.
         *
         * #### Notes
         * This message should be dispatched to a widget when it should
         * perform the actions necessary to activate the widget, which
         * may include focusing its node or descendant node.
         */
        Msg.ActivateRequest = new ConflatableMessage('activate-request');
        /**
         * A singleton conflatable `'close-request'` message.
         *
         * #### Notes
         * This message should be dispatched to a widget when it should close
         * and remove itself from the widget hierarchy.
         */
        Msg.CloseRequest = new ConflatableMessage('close-request');
    })(Msg = Widget.Msg || (Widget.Msg = {}));
    /**
     * A message class for child related messages.
     */
    var ChildMessage = /** @class */ (function (_super) {
        __extends(ChildMessage, _super);
        /**
         * Construct a new child message.
         *
         * @param type - The message type.
         *
         * @param child - The child widget for the message.
         */
        function ChildMessage(type, child) {
            var _this = _super.call(this, type) || this;
            _this.child = child;
            return _this;
        }
        return ChildMessage;
    }(Message));
    Widget.ChildMessage = ChildMessage;
    /**
     * A message class for `'resize'` messages.
     */
    var ResizeMessage = /** @class */ (function (_super) {
        __extends(ResizeMessage, _super);
        /**
         * Construct a new resize message.
         *
         * @param width - The **offset width** of the widget, or `-1` if
         *   the width is not known.
         *
         * @param height - The **offset height** of the widget, or `-1` if
         *   the height is not known.
         */
        function ResizeMessage(width, height) {
            var _this = _super.call(this, 'resize') || this;
            _this.width = width;
            _this.height = height;
            return _this;
        }
        return ResizeMessage;
    }(Message));
    Widget.ResizeMessage = ResizeMessage;
    /**
     * The namespace for the `ResizeMessage` class statics.
     */
    (function (ResizeMessage) {
        /**
         * A singleton `'resize'` message with an unknown size.
         */
        ResizeMessage.UnknownSize = new ResizeMessage(-1, -1);
    })(ResizeMessage = Widget.ResizeMessage || (Widget.ResizeMessage = {}));
    /**
     * Attach a widget to a host DOM node.
     *
     * @param widget - The widget of interest.
     *
     * @param host - The DOM node to use as the widget's host.
     *
     * @param ref - The child of `host` to use as the reference element.
     *   If this is provided, the widget will be inserted before this
     *   node in the host. The default is `null`, which will cause the
     *   widget to be added as the last child of the host.
     *
     * #### Notes
     * This will throw an error if the widget is not a root widget, if
     * the widget is already attached, or if the host is not attached
     * to the DOM.
     */
    function attach(widget, host, ref) {
        if (ref === void 0) { ref = null; }
        if (widget.parent) {
            throw new Error('Cannot attach a child widget.');
        }
        if (widget.isAttached || document.body.contains(widget.node)) {
            throw new Error('Widget is already attached.');
        }
        if (!document.body.contains(host)) {
            throw new Error('Host is not attached.');
        }
        MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
        host.insertBefore(widget.node, ref);
        MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
    }
    Widget.attach = attach;
    /**
     * Detach the widget from its host DOM node.
     *
     * @param widget - The widget of interest.
     *
     * #### Notes
     * This will throw an error if the widget is not a root widget,
     * or if the widget is not attached to the DOM.
     */
    function detach(widget) {
        if (widget.parent) {
            throw new Error('Cannot detach a child widget.');
        }
        if (!widget.isAttached || !document.body.contains(widget.node)) {
            throw new Error('Widget is not attached.');
        }
        MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
        widget.node.parentNode.removeChild(widget.node);
        MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
    }
    Widget.detach = detach;
})(Widget || (Widget = {}));
/**
 * The namespace for the module implementation details.
 */
var Private;
(function (Private) {
    /**
     * An attached property for the widget title object.
     */
    Private.titleProperty = new AttachedProperty({
        name: 'title',
        create: function (owner) { return new Title({ owner: owner }); },
    });
    /**
     * Create a DOM node for the given widget options.
     */
    function createNode(options) {
        return options.node || document.createElement(options.tag || 'div');
    }
    Private.createNode = createNode;
})(Private || (Private = {}));

// Copyright (c) Jupyter Development Team.
/**
 * An abstract base class for creating lumino layouts.
 *
 * #### Notes
 * A layout is used to add widgets to a parent and to arrange those
 * widgets within the parent's DOM node.
 *
 * This class implements the base functionality which is required of
 * nearly all layouts. It must be subclassed in order to be useful.
 *
 * Notably, this class does not define a uniform interface for adding
 * widgets to the layout. A subclass should define that API in a way
 * which is meaningful for its intended use.
 */
var Layout = /** @class */ (function () {
    /**
     * Construct a new layout.
     *
     * @param options - The options for initializing the layout.
     */
    function Layout(options) {
        if (options === void 0) { options = {}; }
        this._disposed = false;
        this._parent = null;
        this._fitPolicy = options.fitPolicy || 'set-min-size';
    }
    /**
     * Dispose of the resources held by the layout.
     *
     * #### Notes
     * This should be reimplemented to clear and dispose of the widgets.
     *
     * All reimplementations should call the superclass method.
     *
     * This method is called automatically when the parent is disposed.
     */
    Layout.prototype.dispose = function () {
        this._parent = null;
        this._disposed = true;
        Signal.clearData(this);
        AttachedProperty.clearData(this);
    };
    Object.defineProperty(Layout.prototype, "isDisposed", {
        /**
         * Test whether the layout is disposed.
         */
        get: function () {
            return this._disposed;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Layout.prototype, "parent", {
        /**
         * Get the parent widget of the layout.
         */
        get: function () {
            return this._parent;
        },
        /**
         * Set the parent widget of the layout.
         *
         * #### Notes
         * This is set automatically when installing the layout on the parent
         * widget. The parent widget should not be set directly by user code.
         */
        set: function (value) {
            if (this._parent === value) {
                return;
            }
            if (this._parent) {
                throw new Error('Cannot change parent widget.');
            }
            if (value.layout !== this) {
                throw new Error('Invalid parent widget.');
            }
            this._parent = value;
            this.init();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Layout.prototype, "fitPolicy", {
        /**
         * Get the fit policy for the layout.
         *
         * #### Notes
         * The fit policy controls the computed size constraints which are
         * applied to the parent widget by the layout.
         *
         * Some layout implementations may ignore the fit policy.
         */
        get: function () {
            return this._fitPolicy;
        },
        /**
         * Set the fit policy for the layout.
         *
         * #### Notes
         * The fit policy controls the computed size constraints which are
         * applied to the parent widget by the layout.
         *
         * Some layout implementations may ignore the fit policy.
         *
         * Changing the fit policy will clear the current size constraint
         * for the parent widget and then re-fit the parent.
         */
        set: function (value) {
            // Bail if the policy does not change
            if (this._fitPolicy === value) {
                return;
            }
            // Update the internal policy.
            this._fitPolicy = value;
            // Clear the size constraints and schedule a fit of the parent.
            if (this._parent) {
                var style = this._parent.node.style;
                style.minWidth = '';
                style.minHeight = '';
                style.maxWidth = '';
                style.maxHeight = '';
                this._parent.fit();
            }
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Process a message sent to the parent widget.
     *
     * @param msg - The message sent to the parent widget.
     *
     * #### Notes
     * This method is called by the parent widget to process a message.
     *
     * Subclasses may reimplement this method as needed.
     */
    Layout.prototype.processParentMessage = function (msg) {
        switch (msg.type) {
            case 'resize':
                this.onResize(msg);
                break;
            case 'update-request':
                this.onUpdateRequest(msg);
                break;
            case 'fit-request':
                this.onFitRequest(msg);
                break;
            case 'before-show':
                this.onBeforeShow(msg);
                break;
            case 'after-show':
                this.onAfterShow(msg);
                break;
            case 'before-hide':
                this.onBeforeHide(msg);
                break;
            case 'after-hide':
                this.onAfterHide(msg);
                break;
            case 'before-attach':
                this.onBeforeAttach(msg);
                break;
            case 'after-attach':
                this.onAfterAttach(msg);
                break;
            case 'before-detach':
                this.onBeforeDetach(msg);
                break;
            case 'after-detach':
                this.onAfterDetach(msg);
                break;
            case 'child-removed':
                this.onChildRemoved(msg);
                break;
            case 'child-shown':
                this.onChildShown(msg);
                break;
            case 'child-hidden':
                this.onChildHidden(msg);
                break;
        }
    };
    /**
     * Perform layout initialization which requires the parent widget.
     *
     * #### Notes
     * This method is invoked immediately after the layout is installed
     * on the parent widget.
     *
     * The default implementation reparents all of the widgets to the
     * layout parent widget.
     *
     * Subclasses should reimplement this method and attach the child
     * widget nodes to the parent widget's node.
     */
    Layout.prototype.init = function () {
        var _this = this;
        each(this, function (widget) {
            widget.parent = _this.parent;
        });
    };
    /**
     * A message handler invoked on a `'resize'` message.
     *
     * #### Notes
     * The layout should ensure that its widgets are resized according
     * to the specified layout space, and that they are sent a `'resize'`
     * message if appropriate.
     *
     * The default implementation of this method sends an `UnknownSize`
     * resize message to all widgets.
     *
     * This may be reimplemented by subclasses as needed.
     */
    Layout.prototype.onResize = function (msg) {
        each(this, function (widget) {
            MessageLoop.sendMessage(widget, Widget.ResizeMessage.UnknownSize);
        });
    };
    /**
     * A message handler invoked on an `'update-request'` message.
     *
     * #### Notes
     * The layout should ensure that its widgets are resized according
     * to the available layout space, and that they are sent a `'resize'`
     * message if appropriate.
     *
     * The default implementation of this method sends an `UnknownSize`
     * resize message to all widgets.
     *
     * This may be reimplemented by subclasses as needed.
     */
    Layout.prototype.onUpdateRequest = function (msg) {
        each(this, function (widget) {
            MessageLoop.sendMessage(widget, Widget.ResizeMessage.UnknownSize);
        });
    };
    /**
     * A message handler invoked on a `'before-attach'` message.
     *
     * #### Notes
     * The default implementation of this method forwards the message
     * to all widgets. It assumes all widget nodes are attached to the
     * parent widget node.
     *
     * This may be reimplemented by subclasses as needed.
     */
    Layout.prototype.onBeforeAttach = function (msg) {
        each(this, function (widget) {
            MessageLoop.sendMessage(widget, msg);
        });
    };
    /**
     * A message handler invoked on an `'after-attach'` message.
     *
     * #### Notes
     * The default implementation of this method forwards the message
     * to all widgets. It assumes all widget nodes are attached to the
     * parent widget node.
     *
     * This may be reimplemented by subclasses as needed.
     */
    Layout.prototype.onAfterAttach = function (msg) {
        each(this, function (widget) {
            MessageLoop.sendMessage(widget, msg);
        });
    };
    /**
     * A message handler invoked on a `'before-detach'` message.
     *
     * #### Notes
     * The default implementation of this method forwards the message
     * to all widgets. It assumes all widget nodes are attached to the
     * parent widget node.
     *
     * This may be reimplemented by subclasses as needed.
     */
    Layout.prototype.onBeforeDetach = function (msg) {
        each(this, function (widget) {
            MessageLoop.sendMessage(widget, msg);
        });
    };
    /**
     * A message handler invoked on an `'after-detach'` message.
     *
     * #### Notes
     * The default implementation of this method forwards the message
     * to all widgets. It assumes all widget nodes are attached to the
     * parent widget node.
     *
     * This may be reimplemented by subclasses as needed.
     */
    Layout.prototype.onAfterDetach = function (msg) {
        each(this, function (widget) {
            MessageLoop.sendMessage(widget, msg);
        });
    };
    /**
     * A message handler invoked on a `'before-show'` message.
     *
     * #### Notes
     * The default implementation of this method forwards the message to
     * all non-hidden widgets. It assumes all widget nodes are attached
     * to the parent widget node.
     *
     * This may be reimplemented by subclasses as needed.
     */
    Layout.prototype.onBeforeShow = function (msg) {
        each(this, function (widget) {
            if (!widget.isHidden) {
                MessageLoop.sendMessage(widget, msg);
            }
        });
    };
    /**
     * A message handler invoked on an `'after-show'` message.
     *
     * #### Notes
     * The default implementation of this method forwards the message to
     * all non-hidden widgets. It assumes all widget nodes are attached
     * to the parent widget node.
     *
     * This may be reimplemented by subclasses as needed.
     */
    Layout.prototype.onAfterShow = function (msg) {
        each(this, function (widget) {
            if (!widget.isHidden) {
                MessageLoop.sendMessage(widget, msg);
            }
        });
    };
    /**
     * A message handler invoked on a `'before-hide'` message.
     *
     * #### Notes
     * The default implementation of this method forwards the message to
     * all non-hidden widgets. It assumes all widget nodes are attached
     * to the parent widget node.
     *
     * This may be reimplemented by subclasses as needed.
     */
    Layout.prototype.onBeforeHide = function (msg) {
        each(this, function (widget) {
            if (!widget.isHidden) {
                MessageLoop.sendMessage(widget, msg);
            }
        });
    };
    /**
     * A message handler invoked on an `'after-hide'` message.
     *
     * #### Notes
     * The default implementation of this method forwards the message to
     * all non-hidden widgets. It assumes all widget nodes are attached
     * to the parent widget node.
     *
     * This may be reimplemented by subclasses as needed.
     */
    Layout.prototype.onAfterHide = function (msg) {
        each(this, function (widget) {
            if (!widget.isHidden) {
                MessageLoop.sendMessage(widget, msg);
            }
        });
    };
    /**
     * A message handler invoked on a `'child-removed'` message.
     *
     * #### Notes
     * This will remove the child widget from the layout.
     *
     * Subclasses should **not** typically reimplement this method.
     */
    Layout.prototype.onChildRemoved = function (msg) {
        this.removeWidget(msg.child);
    };
    /**
     * A message handler invoked on a `'fit-request'` message.
     *
     * #### Notes
     * The default implementation of this handler is a no-op.
     */
    Layout.prototype.onFitRequest = function (msg) { };
    /**
     * A message handler invoked on a `'child-shown'` message.
     *
     * #### Notes
     * The default implementation of this handler is a no-op.
     */
    Layout.prototype.onChildShown = function (msg) { };
    /**
     * A message handler invoked on a `'child-hidden'` message.
     *
     * #### Notes
     * The default implementation of this handler is a no-op.
     */
    Layout.prototype.onChildHidden = function (msg) { };
    return Layout;
}());
/**
 * The namespace for the `Layout` class statics.
 */
(function (Layout) {
    /**
     * Get the horizontal alignment for a widget.
     *
     * @param widget - The widget of interest.
     *
     * @returns The horizontal alignment for the widget.
     *
     * #### Notes
     * If the layout width allocated to a widget is larger than its max
     * width, the horizontal alignment controls how the widget is placed
     * within the extra horizontal space.
     *
     * If the allocated width is less than the widget's max width, the
     * horizontal alignment has no effect.
     *
     * Some layout implementations may ignore horizontal alignment.
     */
    function getHorizontalAlignment(widget) {
        return Private$1.horizontalAlignmentProperty.get(widget);
    }
    Layout.getHorizontalAlignment = getHorizontalAlignment;
    /**
     * Set the horizontal alignment for a widget.
     *
     * @param widget - The widget of interest.
     *
     * @param value - The value for the horizontal alignment.
     *
     * #### Notes
     * If the layout width allocated to a widget is larger than its max
     * width, the horizontal alignment controls how the widget is placed
     * within the extra horizontal space.
     *
     * If the allocated width is less than the widget's max width, the
     * horizontal alignment has no effect.
     *
     * Some layout implementations may ignore horizontal alignment.
     *
     * Changing the horizontal alignment will post an `update-request`
     * message to widget's parent, provided the parent has a layout
     * installed.
     */
    function setHorizontalAlignment(widget, value) {
        Private$1.horizontalAlignmentProperty.set(widget, value);
    }
    Layout.setHorizontalAlignment = setHorizontalAlignment;
    /**
     * Get the vertical alignment for a widget.
     *
     * @param widget - The widget of interest.
     *
     * @returns The vertical alignment for the widget.
     *
     * #### Notes
     * If the layout height allocated to a widget is larger than its max
     * height, the vertical alignment controls how the widget is placed
     * within the extra vertical space.
     *
     * If the allocated height is less than the widget's max height, the
     * vertical alignment has no effect.
     *
     * Some layout implementations may ignore vertical alignment.
     */
    function getVerticalAlignment(widget) {
        return Private$1.verticalAlignmentProperty.get(widget);
    }
    Layout.getVerticalAlignment = getVerticalAlignment;
    /**
     * Set the vertical alignment for a widget.
     *
     * @param widget - The widget of interest.
     *
     * @param value - The value for the vertical alignment.
     *
     * #### Notes
     * If the layout height allocated to a widget is larger than its max
     * height, the vertical alignment controls how the widget is placed
     * within the extra vertical space.
     *
     * If the allocated height is less than the widget's max height, the
     * vertical alignment has no effect.
     *
     * Some layout implementations may ignore vertical alignment.
     *
     * Changing the horizontal alignment will post an `update-request`
     * message to widget's parent, provided the parent has a layout
     * installed.
     */
    function setVerticalAlignment(widget, value) {
        Private$1.verticalAlignmentProperty.set(widget, value);
    }
    Layout.setVerticalAlignment = setVerticalAlignment;
})(Layout || (Layout = {}));
/**
 * An object which assists in the absolute layout of widgets.
 *
 * #### Notes
 * This class is useful when implementing a layout which arranges its
 * widgets using absolute positioning.
 *
 * This class is used by nearly all of the built-in lumino layouts.
 */
var LayoutItem = /** @class */ (function () {
    /**
     * Construct a new layout item.
     *
     * @param widget - The widget to be managed by the item.
     *
     * #### Notes
     * The widget will be set to absolute positioning.
     */
    function LayoutItem(widget) {
        this._top = NaN;
        this._left = NaN;
        this._width = NaN;
        this._height = NaN;
        this._minWidth = 0;
        this._minHeight = 0;
        this._maxWidth = Infinity;
        this._maxHeight = Infinity;
        this._disposed = false;
        this.widget = widget;
        this.widget.node.style.position = 'absolute';
    }
    /**
     * Dispose of the the layout item.
     *
     * #### Notes
     * This will reset the positioning of the widget.
     */
    LayoutItem.prototype.dispose = function () {
        // Do nothing if the item is already disposed.
        if (this._disposed) {
            return;
        }
        // Mark the item as disposed.
        this._disposed = true;
        // Reset the widget style.
        var style = this.widget.node.style;
        style.position = '';
        style.top = '';
        style.left = '';
        style.width = '';
        style.height = '';
    };
    Object.defineProperty(LayoutItem.prototype, "minWidth", {
        /**
         * The computed minimum width of the widget.
         *
         * #### Notes
         * This value can be updated by calling the `fit` method.
         */
        get: function () {
            return this._minWidth;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LayoutItem.prototype, "minHeight", {
        /**
         * The computed minimum height of the widget.
         *
         * #### Notes
         * This value can be updated by calling the `fit` method.
         */
        get: function () {
            return this._minHeight;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LayoutItem.prototype, "maxWidth", {
        /**
         * The computed maximum width of the widget.
         *
         * #### Notes
         * This value can be updated by calling the `fit` method.
         */
        get: function () {
            return this._maxWidth;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LayoutItem.prototype, "maxHeight", {
        /**
         * The computed maximum height of the widget.
         *
         * #### Notes
         * This value can be updated by calling the `fit` method.
         */
        get: function () {
            return this._maxHeight;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LayoutItem.prototype, "isDisposed", {
        /**
         * Whether the layout item is disposed.
         */
        get: function () {
            return this._disposed;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LayoutItem.prototype, "isHidden", {
        /**
         * Whether the managed widget is hidden.
         */
        get: function () {
            return this.widget.isHidden;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LayoutItem.prototype, "isVisible", {
        /**
         * Whether the managed widget is visible.
         */
        get: function () {
            return this.widget.isVisible;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LayoutItem.prototype, "isAttached", {
        /**
         * Whether the managed widget is attached.
         */
        get: function () {
            return this.widget.isAttached;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Update the computed size limits of the managed widget.
     */
    LayoutItem.prototype.fit = function () {
        var limits = ElementExt.sizeLimits(this.widget.node);
        this._minWidth = limits.minWidth;
        this._minHeight = limits.minHeight;
        this._maxWidth = limits.maxWidth;
        this._maxHeight = limits.maxHeight;
    };
    /**
     * Update the position and size of the managed widget.
     *
     * @param left - The left edge position of the layout box.
     *
     * @param top - The top edge position of the layout box.
     *
     * @param width - The width of the layout box.
     *
     * @param height - The height of the layout box.
     */
    LayoutItem.prototype.update = function (left, top, width, height) {
        // Clamp the size to the computed size limits.
        var clampW = Math.max(this._minWidth, Math.min(width, this._maxWidth));
        var clampH = Math.max(this._minHeight, Math.min(height, this._maxHeight));
        // Adjust the left edge for the horizontal alignment, if needed.
        if (clampW < width) {
            switch (Layout.getHorizontalAlignment(this.widget)) {
                case 'left':
                    break;
                case 'center':
                    left += (width - clampW) / 2;
                    break;
                case 'right':
                    left += width - clampW;
                    break;
                default:
                    throw 'unreachable';
            }
        }
        // Adjust the top edge for the vertical alignment, if needed.
        if (clampH < height) {
            switch (Layout.getVerticalAlignment(this.widget)) {
                case 'top':
                    break;
                case 'center':
                    top += (height - clampH) / 2;
                    break;
                case 'bottom':
                    top += height - clampH;
                    break;
                default:
                    throw 'unreachable';
            }
        }
        // Set up the resize variables.
        var resized = false;
        var style = this.widget.node.style;
        // Update the top edge of the widget if needed.
        if (this._top !== top) {
            this._top = top;
            style.top = top + "px";
        }
        // Update the left edge of the widget if needed.
        if (this._left !== left) {
            this._left = left;
            style.left = left + "px";
        }
        // Update the width of the widget if needed.
        if (this._width !== clampW) {
            resized = true;
            this._width = clampW;
            style.width = clampW + "px";
        }
        // Update the height of the widget if needed.
        if (this._height !== clampH) {
            resized = true;
            this._height = clampH;
            style.height = clampH + "px";
        }
        // Send a resize message to the widget if needed.
        if (resized) {
            var msg = new Widget.ResizeMessage(clampW, clampH);
            MessageLoop.sendMessage(this.widget, msg);
        }
    };
    return LayoutItem;
}());
/**
 * The namespace for the module implementation details.
 */
var Private$1;
(function (Private) {
    /**
     * The attached property for a widget horizontal alignment.
     */
    Private.horizontalAlignmentProperty = new AttachedProperty({
        name: 'horizontalAlignment',
        create: function () { return 'center'; },
        changed: onAlignmentChanged
    });
    /**
     * The attached property for a widget vertical alignment.
     */
    Private.verticalAlignmentProperty = new AttachedProperty({
        name: 'verticalAlignment',
        create: function () { return 'top'; },
        changed: onAlignmentChanged
    });
    /**
     * The change handler for the attached alignment properties.
     */
    function onAlignmentChanged(child) {
        if (child.parent && child.parent.layout) {
            child.parent.update();
        }
    }
})(Private$1 || (Private$1 = {}));

/**
 * A concrete layout implementation suitable for many use cases.
 *
 * #### Notes
 * This class is suitable as a base class for implementing a variety of
 * layouts, but can also be used directly with standard CSS to layout a
 * collection of widgets.
 */
var PanelLayout = /** @class */ (function (_super) {
    __extends(PanelLayout, _super);
    function PanelLayout() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this._widgets = [];
        return _this;
    }
    /**
     * Dispose of the resources held by the layout.
     *
     * #### Notes
     * This will clear and dispose all widgets in the layout.
     *
     * All reimplementations should call the superclass method.
     *
     * This method is called automatically when the parent is disposed.
     */
    PanelLayout.prototype.dispose = function () {
        while (this._widgets.length > 0) {
            this._widgets.pop().dispose();
        }
        _super.prototype.dispose.call(this);
    };
    Object.defineProperty(PanelLayout.prototype, "widgets", {
        /**
         * A read-only array of the widgets in the layout.
         */
        get: function () {
            return this._widgets;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Create an iterator over the widgets in the layout.
     *
     * @returns A new iterator over the widgets in the layout.
     */
    PanelLayout.prototype.iter = function () {
        return iter(this._widgets);
    };
    /**
     * Add a widget to the end of the layout.
     *
     * @param widget - The widget to add to the layout.
     *
     * #### Notes
     * If the widget is already contained in the layout, it will be moved.
     */
    PanelLayout.prototype.addWidget = function (widget) {
        this.insertWidget(this._widgets.length, widget);
    };
    /**
     * Insert a widget into the layout at the specified index.
     *
     * @param index - The index at which to insert the widget.
     *
     * @param widget - The widget to insert into the layout.
     *
     * #### Notes
     * The index will be clamped to the bounds of the widgets.
     *
     * If the widget is already added to the layout, it will be moved.
     *
     * #### Undefined Behavior
     * An `index` which is non-integral.
     */
    PanelLayout.prototype.insertWidget = function (index, widget) {
        // Remove the widget from its current parent. This is a no-op
        // if the widget's parent is already the layout parent widget.
        widget.parent = this.parent;
        // Look up the current index of the widget.
        var i = this._widgets.indexOf(widget);
        // Clamp the insert index to the array bounds.
        var j = Math.max(0, Math.min(index, this._widgets.length));
        // If the widget is not in the array, insert it.
        if (i === -1) {
            // Insert the widget into the array.
            ArrayExt.insert(this._widgets, j, widget);
            // If the layout is parented, attach the widget to the DOM.
            if (this.parent) {
                this.attachWidget(j, widget);
            }
            // There is nothing more to do.
            return;
        }
        // Otherwise, the widget exists in the array and should be moved.
        // Adjust the index if the location is at the end of the array.
        if (j === this._widgets.length) {
            j--;
        }
        // Bail if there is no effective move.
        if (i === j) {
            return;
        }
        // Move the widget to the new location.
        ArrayExt.move(this._widgets, i, j);
        // If the layout is parented, move the widget in the DOM.
        if (this.parent) {
            this.moveWidget(i, j, widget);
        }
    };
    /**
     * Remove a widget from the layout.
     *
     * @param widget - The widget to remove from the layout.
     *
     * #### Notes
     * A widget is automatically removed from the layout when its `parent`
     * is set to `null`. This method should only be invoked directly when
     * removing a widget from a layout which has yet to be installed on a
     * parent widget.
     *
     * This method does *not* modify the widget's `parent`.
     */
    PanelLayout.prototype.removeWidget = function (widget) {
        this.removeWidgetAt(this._widgets.indexOf(widget));
    };
    /**
     * Remove the widget at a given index from the layout.
     *
     * @param index - The index of the widget to remove.
     *
     * #### Notes
     * A widget is automatically removed from the layout when its `parent`
     * is set to `null`. This method should only be invoked directly when
     * removing a widget from a layout which has yet to be installed on a
     * parent widget.
     *
     * This method does *not* modify the widget's `parent`.
     *
     * #### Undefined Behavior
     * An `index` which is non-integral.
     */
    PanelLayout.prototype.removeWidgetAt = function (index) {
        // Remove the widget from the array.
        var widget = ArrayExt.removeAt(this._widgets, index);
        // If the layout is parented, detach the widget from the DOM.
        if (widget && this.parent) {
            this.detachWidget(index, widget);
        }
    };
    /**
     * Perform layout initialization which requires the parent widget.
     */
    PanelLayout.prototype.init = function () {
        var _this = this;
        _super.prototype.init.call(this);
        each(this, function (widget, index) {
            _this.attachWidget(index, widget);
        });
    };
    /**
     * Attach a widget to the parent's DOM node.
     *
     * @param index - The current index of the widget in the layout.
     *
     * @param widget - The widget to attach to the parent.
     *
     * #### Notes
     * This method is called automatically by the panel layout at the
     * appropriate time. It should not be called directly by user code.
     *
     * The default implementation adds the widgets's node to the parent's
     * node at the proper location, and sends the appropriate attach
     * messages to the widget if the parent is attached to the DOM.
     *
     * Subclasses may reimplement this method to control how the widget's
     * node is added to the parent's node.
     */
    PanelLayout.prototype.attachWidget = function (index, widget) {
        // Look up the next sibling reference node.
        var ref = this.parent.node.children[index];
        // Send a `'before-attach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
        }
        // Insert the widget's node before the sibling.
        this.parent.node.insertBefore(widget.node, ref);
        // Send an `'after-attach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
        }
    };
    /**
     * Move a widget in the parent's DOM node.
     *
     * @param fromIndex - The previous index of the widget in the layout.
     *
     * @param toIndex - The current index of the widget in the layout.
     *
     * @param widget - The widget to move in the parent.
     *
     * #### Notes
     * This method is called automatically by the panel layout at the
     * appropriate time. It should not be called directly by user code.
     *
     * The default implementation moves the widget's node to the proper
     * location in the parent's node and sends the appropriate attach and
     * detach messages to the widget if the parent is attached to the DOM.
     *
     * Subclasses may reimplement this method to control how the widget's
     * node is moved in the parent's node.
     */
    PanelLayout.prototype.moveWidget = function (fromIndex, toIndex, widget) {
        // Send a `'before-detach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
        }
        // Remove the widget's node from the parent.
        this.parent.node.removeChild(widget.node);
        // Send an `'after-detach'` and  message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
        }
        // Look up the next sibling reference node.
        var ref = this.parent.node.children[toIndex];
        // Send a `'before-attach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
        }
        // Insert the widget's node before the sibling.
        this.parent.node.insertBefore(widget.node, ref);
        // Send an `'after-attach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
        }
    };
    /**
     * Detach a widget from the parent's DOM node.
     *
     * @param index - The previous index of the widget in the layout.
     *
     * @param widget - The widget to detach from the parent.
     *
     * #### Notes
     * This method is called automatically by the panel layout at the
     * appropriate time. It should not be called directly by user code.
     *
     * The default implementation removes the widget's node from the
     * parent's node, and sends the appropriate detach messages to the
     * widget if the parent is attached to the DOM.
     *
     * Subclasses may reimplement this method to control how the widget's
     * node is removed from the parent's node.
     */
    PanelLayout.prototype.detachWidget = function (index, widget) {
        // Send a `'before-detach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
        }
        // Remove the widget's node from the parent.
        this.parent.node.removeChild(widget.node);
        // Send an `'after-detach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
        }
    };
    return PanelLayout;
}(Layout));

/**
 * A layout which arranges its widgets in a single row or column.
 */
var BoxLayout = /** @class */ (function (_super) {
    __extends(BoxLayout, _super);
    /**
     * Construct a new box layout.
     *
     * @param options - The options for initializing the layout.
     */
    function BoxLayout(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this) || this;
        _this._fixed = 0;
        _this._spacing = 4;
        _this._dirty = false;
        _this._sizers = [];
        _this._items = [];
        _this._box = null;
        _this._alignment = 'start';
        _this._direction = 'top-to-bottom';
        if (options.direction !== undefined) {
            _this._direction = options.direction;
        }
        if (options.alignment !== undefined) {
            _this._alignment = options.alignment;
        }
        if (options.spacing !== undefined) {
            _this._spacing = Private$2.clampSpacing(options.spacing);
        }
        return _this;
    }
    /**
     * Dispose of the resources held by the layout.
     */
    BoxLayout.prototype.dispose = function () {
        // Dispose of the layout items.
        each(this._items, function (item) { item.dispose(); });
        // Clear the layout state.
        this._box = null;
        this._items.length = 0;
        this._sizers.length = 0;
        // Dispose of the rest of the layout.
        _super.prototype.dispose.call(this);
    };
    Object.defineProperty(BoxLayout.prototype, "direction", {
        /**
         * Get the layout direction for the box layout.
         */
        get: function () {
            return this._direction;
        },
        /**
         * Set the layout direction for the box layout.
         */
        set: function (value) {
            if (this._direction === value) {
                return;
            }
            this._direction = value;
            if (!this.parent) {
                return;
            }
            this.parent.dataset['direction'] = value;
            this.parent.fit();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoxLayout.prototype, "alignment", {
        /**
         * Get the content alignment for the box layout.
         *
         * #### Notes
         * This is the alignment of the widgets in the layout direction.
         *
         * The alignment has no effect if the widgets can expand to fill the
         * entire box layout.
         */
        get: function () {
            return this._alignment;
        },
        /**
         * Set the content alignment for the box layout.
         *
         * #### Notes
         * This is the alignment of the widgets in the layout direction.
         *
         * The alignment has no effect if the widgets can expand to fill the
         * entire box layout.
         */
        set: function (value) {
            if (this._alignment === value) {
                return;
            }
            this._alignment = value;
            if (!this.parent) {
                return;
            }
            this.parent.dataset['alignment'] = value;
            this.parent.update();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoxLayout.prototype, "spacing", {
        /**
         * Get the inter-element spacing for the box layout.
         */
        get: function () {
            return this._spacing;
        },
        /**
         * Set the inter-element spacing for the box layout.
         */
        set: function (value) {
            value = Private$2.clampSpacing(value);
            if (this._spacing === value) {
                return;
            }
            this._spacing = value;
            if (!this.parent) {
                return;
            }
            this.parent.fit();
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Perform layout initialization which requires the parent widget.
     */
    BoxLayout.prototype.init = function () {
        this.parent.dataset['direction'] = this.direction;
        this.parent.dataset['alignment'] = this.alignment;
        _super.prototype.init.call(this);
    };
    /**
     * Attach a widget to the parent's DOM node.
     *
     * @param index - The current index of the widget in the layout.
     *
     * @param widget - The widget to attach to the parent.
     *
     * #### Notes
     * This is a reimplementation of the superclass method.
     */
    BoxLayout.prototype.attachWidget = function (index, widget) {
        // Create and add a new layout item for the widget.
        ArrayExt.insert(this._items, index, new LayoutItem(widget));
        // Create and add a new sizer for the widget.
        ArrayExt.insert(this._sizers, index, new BoxSizer());
        // Send a `'before-attach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
        }
        // Add the widget's node to the parent.
        this.parent.node.appendChild(widget.node);
        // Send an `'after-attach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
        }
        // Post a fit request for the parent widget.
        this.parent.fit();
    };
    /**
     * Move a widget in the parent's DOM node.
     *
     * @param fromIndex - The previous index of the widget in the layout.
     *
     * @param toIndex - The current index of the widget in the layout.
     *
     * @param widget - The widget to move in the parent.
     *
     * #### Notes
     * This is a reimplementation of the superclass method.
     */
    BoxLayout.prototype.moveWidget = function (fromIndex, toIndex, widget) {
        // Move the layout item for the widget.
        ArrayExt.move(this._items, fromIndex, toIndex);
        // Move the sizer for the widget.
        ArrayExt.move(this._sizers, fromIndex, toIndex);
        // Post an update request for the parent widget.
        this.parent.update();
    };
    /**
     * Detach a widget from the parent's DOM node.
     *
     * @param index - The previous index of the widget in the layout.
     *
     * @param widget - The widget to detach from the parent.
     *
     * #### Notes
     * This is a reimplementation of the superclass method.
     */
    BoxLayout.prototype.detachWidget = function (index, widget) {
        // Remove the layout item for the widget.
        var item = ArrayExt.removeAt(this._items, index);
        // Remove the sizer for the widget.
        ArrayExt.removeAt(this._sizers, index);
        // Send a `'before-detach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
        }
        // Remove the widget's node from the parent.
        this.parent.node.removeChild(widget.node);
        // Send an `'after-detach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
        }
        // Dispose of the layout item.
        item.dispose();
        // Post a fit request for the parent widget.
        this.parent.fit();
    };
    /**
     * A message handler invoked on a `'before-show'` message.
     */
    BoxLayout.prototype.onBeforeShow = function (msg) {
        _super.prototype.onBeforeShow.call(this, msg);
        this.parent.update();
    };
    /**
     * A message handler invoked on a `'before-attach'` message.
     */
    BoxLayout.prototype.onBeforeAttach = function (msg) {
        _super.prototype.onBeforeAttach.call(this, msg);
        this.parent.fit();
    };
    /**
     * A message handler invoked on a `'child-shown'` message.
     */
    BoxLayout.prototype.onChildShown = function (msg) {
        this.parent.fit();
    };
    /**
     * A message handler invoked on a `'child-hidden'` message.
     */
    BoxLayout.prototype.onChildHidden = function (msg) {
        this.parent.fit();
    };
    /**
     * A message handler invoked on a `'resize'` message.
     */
    BoxLayout.prototype.onResize = function (msg) {
        if (this.parent.isVisible) {
            this._update(msg.width, msg.height);
        }
    };
    /**
     * A message handler invoked on an `'update-request'` message.
     */
    BoxLayout.prototype.onUpdateRequest = function (msg) {
        if (this.parent.isVisible) {
            this._update(-1, -1);
        }
    };
    /**
     * A message handler invoked on a `'fit-request'` message.
     */
    BoxLayout.prototype.onFitRequest = function (msg) {
        if (this.parent.isAttached) {
            this._fit();
        }
    };
    /**
     * Fit the layout to the total size required by the widgets.
     */
    BoxLayout.prototype._fit = function () {
        // Compute the visible item count.
        var nVisible = 0;
        for (var i = 0, n = this._items.length; i < n; ++i) {
            nVisible += +!this._items[i].isHidden;
        }
        // Update the fixed space for the visible items.
        this._fixed = this._spacing * Math.max(0, nVisible - 1);
        // Setup the computed minimum size.
        var horz = Private$2.isHorizontal(this._direction);
        var minW = horz ? this._fixed : 0;
        var minH = horz ? 0 : this._fixed;
        // Update the sizers and computed minimum size.
        for (var i = 0, n = this._items.length; i < n; ++i) {
            // Fetch the item and corresponding box sizer.
            var item = this._items[i];
            var sizer = this._sizers[i];
            // If the item is hidden, it should consume zero size.
            if (item.isHidden) {
                sizer.minSize = 0;
                sizer.maxSize = 0;
                continue;
            }
            // Update the size limits for the item.
            item.fit();
            // Update the size basis and stretch factor.
            sizer.sizeHint = BoxLayout.getSizeBasis(item.widget);
            sizer.stretch = BoxLayout.getStretch(item.widget);
            // Update the sizer limits and computed min size.
            if (horz) {
                sizer.minSize = item.minWidth;
                sizer.maxSize = item.maxWidth;
                minW += item.minWidth;
                minH = Math.max(minH, item.minHeight);
            }
            else {
                sizer.minSize = item.minHeight;
                sizer.maxSize = item.maxHeight;
                minH += item.minHeight;
                minW = Math.max(minW, item.minWidth);
            }
        }
        // Update the box sizing and add it to the computed min size.
        var box = this._box = ElementExt.boxSizing(this.parent.node);
        minW += box.horizontalSum;
        minH += box.verticalSum;
        // Update the parent's min size constraints.
        var style = this.parent.node.style;
        style.minWidth = minW + "px";
        style.minHeight = minH + "px";
        // Set the dirty flag to ensure only a single update occurs.
        this._dirty = true;
        // Notify the ancestor that it should fit immediately. This may
        // cause a resize of the parent, fulfilling the required update.
        if (this.parent.parent) {
            MessageLoop.sendMessage(this.parent.parent, Widget.Msg.FitRequest);
        }
        // If the dirty flag is still set, the parent was not resized.
        // Trigger the required update on the parent widget immediately.
        if (this._dirty) {
            MessageLoop.sendMessage(this.parent, Widget.Msg.UpdateRequest);
        }
    };
    /**
     * Update the layout position and size of the widgets.
     *
     * The parent offset dimensions should be `-1` if unknown.
     */
    BoxLayout.prototype._update = function (offsetWidth, offsetHeight) {
        // Clear the dirty flag to indicate the update occurred.
        this._dirty = false;
        // Compute the visible item count.
        var nVisible = 0;
        for (var i = 0, n = this._items.length; i < n; ++i) {
            nVisible += +!this._items[i].isHidden;
        }
        // Bail early if there are no visible items to layout.
        if (nVisible === 0) {
            return;
        }
        // Measure the parent if the offset dimensions are unknown.
        if (offsetWidth < 0) {
            offsetWidth = this.parent.node.offsetWidth;
        }
        if (offsetHeight < 0) {
            offsetHeight = this.parent.node.offsetHeight;
        }
        // Ensure the parent box sizing data is computed.
        if (!this._box) {
            this._box = ElementExt.boxSizing(this.parent.node);
        }
        // Compute the layout area adjusted for border and padding.
        var top = this._box.paddingTop;
        var left = this._box.paddingLeft;
        var width = offsetWidth - this._box.horizontalSum;
        var height = offsetHeight - this._box.verticalSum;
        // Distribute the layout space and adjust the start position.
        var delta;
        switch (this._direction) {
            case 'left-to-right':
                delta = BoxEngine.calc(this._sizers, Math.max(0, width - this._fixed));
                break;
            case 'top-to-bottom':
                delta = BoxEngine.calc(this._sizers, Math.max(0, height - this._fixed));
                break;
            case 'right-to-left':
                delta = BoxEngine.calc(this._sizers, Math.max(0, width - this._fixed));
                left += width;
                break;
            case 'bottom-to-top':
                delta = BoxEngine.calc(this._sizers, Math.max(0, height - this._fixed));
                top += height;
                break;
            default:
                throw 'unreachable';
        }
        // Setup the variables for justification and alignment offset.
        var extra = 0;
        var offset = 0;
        // Account for alignment if there is extra layout space.
        if (delta > 0) {
            switch (this._alignment) {
                case 'start':
                    break;
                case 'center':
                    extra = 0;
                    offset = delta / 2;
                    break;
                case 'end':
                    extra = 0;
                    offset = delta;
                    break;
                case 'justify':
                    extra = delta / nVisible;
                    offset = 0;
                    break;
                default:
                    throw 'unreachable';
            }
        }
        // Layout the items using the computed box sizes.
        for (var i = 0, n = this._items.length; i < n; ++i) {
            // Fetch the item.
            var item = this._items[i];
            // Ignore hidden items.
            if (item.isHidden) {
                continue;
            }
            // Fetch the computed size for the widget.
            var size = this._sizers[i].size;
            // Update the widget geometry and advance the relevant edge.
            switch (this._direction) {
                case 'left-to-right':
                    item.update(left + offset, top, size + extra, height);
                    left += size + extra + this._spacing;
                    break;
                case 'top-to-bottom':
                    item.update(left, top + offset, width, size + extra);
                    top += size + extra + this._spacing;
                    break;
                case 'right-to-left':
                    item.update(left - offset - size - extra, top, size + extra, height);
                    left -= size + extra + this._spacing;
                    break;
                case 'bottom-to-top':
                    item.update(left, top - offset - size - extra, width, size + extra);
                    top -= size + extra + this._spacing;
                    break;
                default:
                    throw 'unreachable';
            }
        }
    };
    return BoxLayout;
}(PanelLayout));
/**
 * The namespace for the `BoxLayout` class statics.
 */
(function (BoxLayout) {
    /**
     * Get the box layout stretch factor for the given widget.
     *
     * @param widget - The widget of interest.
     *
     * @returns The box layout stretch factor for the widget.
     */
    function getStretch(widget) {
        return Private$2.stretchProperty.get(widget);
    }
    BoxLayout.getStretch = getStretch;
    /**
     * Set the box layout stretch factor for the given widget.
     *
     * @param widget - The widget of interest.
     *
     * @param value - The value for the stretch factor.
     */
    function setStretch(widget, value) {
        Private$2.stretchProperty.set(widget, value);
    }
    BoxLayout.setStretch = setStretch;
    /**
     * Get the box layout size basis for the given widget.
     *
     * @param widget - The widget of interest.
     *
     * @returns The box layout size basis for the widget.
     */
    function getSizeBasis(widget) {
        return Private$2.sizeBasisProperty.get(widget);
    }
    BoxLayout.getSizeBasis = getSizeBasis;
    /**
     * Set the box layout size basis for the given widget.
     *
     * @param widget - The widget of interest.
     *
     * @param value - The value for the size basis.
     */
    function setSizeBasis(widget, value) {
        Private$2.sizeBasisProperty.set(widget, value);
    }
    BoxLayout.setSizeBasis = setSizeBasis;
})(BoxLayout || (BoxLayout = {}));
/**
 * The namespace for the module implementation details.
 */
var Private$2;
(function (Private) {
    /**
     * The property descriptor for a widget stretch factor.
     */
    Private.stretchProperty = new AttachedProperty({
        name: 'stretch',
        create: function () { return 0; },
        coerce: function (owner, value) { return Math.max(0, Math.floor(value)); },
        changed: onChildSizingChanged
    });
    /**
     * The property descriptor for a widget size basis.
     */
    Private.sizeBasisProperty = new AttachedProperty({
        name: 'sizeBasis',
        create: function () { return 0; },
        coerce: function (owner, value) { return Math.max(0, Math.floor(value)); },
        changed: onChildSizingChanged
    });
    /**
     * Test whether a direction has horizontal orientation.
     */
    function isHorizontal(dir) {
        return dir === 'left-to-right' || dir === 'right-to-left';
    }
    Private.isHorizontal = isHorizontal;
    /**
     * Clamp a spacing value to an integer >= 0.
     */
    function clampSpacing(value) {
        return Math.max(0, Math.floor(value));
    }
    Private.clampSpacing = clampSpacing;
    /**
     * The change handler for the attached sizing properties.
     */
    function onChildSizingChanged(child) {
        if (child.parent && child.parent.layout instanceof BoxLayout) {
            child.parent.fit();
        }
    }
})(Private$2 || (Private$2 = {}));

/**
 * A simple and convenient panel widget class.
 *
 * #### Notes
 * This class is suitable as a base class for implementing a variety of
 * convenience panel widgets, but can also be used directly with CSS to
 * arrange a collection of widgets.
 *
 * This class provides a convenience wrapper around a [[PanelLayout]].
 */
var Panel = /** @class */ (function (_super) {
    __extends(Panel, _super);
    /**
     * Construct a new panel.
     *
     * @param options - The options for initializing the panel.
     */
    function Panel(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this) || this;
        _this.addClass('lm-Panel');
        /* <DEPRECATED> */
        _this.addClass('p-Panel');
        /* </DEPRECATED> */
        _this.layout = Private$3.createLayout(options);
        return _this;
    }
    Object.defineProperty(Panel.prototype, "widgets", {
        /**
         * A read-only array of the widgets in the panel.
         */
        get: function () {
            return this.layout.widgets;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Add a widget to the end of the panel.
     *
     * @param widget - The widget to add to the panel.
     *
     * #### Notes
     * If the widget is already contained in the panel, it will be moved.
     */
    Panel.prototype.addWidget = function (widget) {
        this.layout.addWidget(widget);
    };
    /**
     * Insert a widget at the specified index.
     *
     * @param index - The index at which to insert the widget.
     *
     * @param widget - The widget to insert into to the panel.
     *
     * #### Notes
     * If the widget is already contained in the panel, it will be moved.
     */
    Panel.prototype.insertWidget = function (index, widget) {
        this.layout.insertWidget(index, widget);
    };
    return Panel;
}(Widget));
/**
 * The namespace for the module implementation details.
 */
var Private$3;
(function (Private) {
    /**
     * Create a panel layout for the given panel options.
     */
    function createLayout(options) {
        return options.layout || new PanelLayout();
    }
    Private.createLayout = createLayout;
})(Private$3 || (Private$3 = {}));

/**
 * A panel which arranges its widgets in a single row or column.
 *
 * #### Notes
 * This class provides a convenience wrapper around a [[BoxLayout]].
 */
var BoxPanel = /** @class */ (function (_super) {
    __extends(BoxPanel, _super);
    /**
     * Construct a new box panel.
     *
     * @param options - The options for initializing the box panel.
     */
    function BoxPanel(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, { layout: Private$4.createLayout(options) }) || this;
        _this.addClass('lm-BoxPanel');
        /* <DEPRECATED> */
        _this.addClass('p-BoxPanel');
        return _this;
        /* </DEPRECATED> */
    }
    Object.defineProperty(BoxPanel.prototype, "direction", {
        /**
         * Get the layout direction for the box panel.
         */
        get: function () {
            return this.layout.direction;
        },
        /**
         * Set the layout direction for the box panel.
         */
        set: function (value) {
            this.layout.direction = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoxPanel.prototype, "alignment", {
        /**
         * Get the content alignment for the box panel.
         *
         * #### Notes
         * This is the alignment of the widgets in the layout direction.
         *
         * The alignment has no effect if the widgets can expand to fill the
         * entire box layout.
         */
        get: function () {
            return this.layout.alignment;
        },
        /**
         * Set the content alignment for the box panel.
         *
         * #### Notes
         * This is the alignment of the widgets in the layout direction.
         *
         * The alignment has no effect if the widgets can expand to fill the
         * entire box layout.
         */
        set: function (value) {
            this.layout.alignment = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BoxPanel.prototype, "spacing", {
        /**
         * Get the inter-element spacing for the box panel.
         */
        get: function () {
            return this.layout.spacing;
        },
        /**
         * Set the inter-element spacing for the box panel.
         */
        set: function (value) {
            this.layout.spacing = value;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * A message handler invoked on a `'child-added'` message.
     */
    BoxPanel.prototype.onChildAdded = function (msg) {
        msg.child.addClass('lm-BoxPanel-child');
        /* <DEPRECATED> */
        msg.child.addClass('p-BoxPanel-child');
        /* </DEPRECATED> */
    };
    /**
     * A message handler invoked on a `'child-removed'` message.
     */
    BoxPanel.prototype.onChildRemoved = function (msg) {
        msg.child.removeClass('lm-BoxPanel-child');
        /* <DEPRECATED> */
        msg.child.removeClass('p-BoxPanel-child');
        /* </DEPRECATED> */
    };
    return BoxPanel;
}(Panel));
/**
 * The namespace for the `BoxPanel` class statics.
 */
(function (BoxPanel) {
    /**
     * Get the box panel stretch factor for the given widget.
     *
     * @param widget - The widget of interest.
     *
     * @returns The box panel stretch factor for the widget.
     */
    function getStretch(widget) {
        return BoxLayout.getStretch(widget);
    }
    BoxPanel.getStretch = getStretch;
    /**
     * Set the box panel stretch factor for the given widget.
     *
     * @param widget - The widget of interest.
     *
     * @param value - The value for the stretch factor.
     */
    function setStretch(widget, value) {
        BoxLayout.setStretch(widget, value);
    }
    BoxPanel.setStretch = setStretch;
    /**
     * Get the box panel size basis for the given widget.
     *
     * @param widget - The widget of interest.
     *
     * @returns The box panel size basis for the widget.
     */
    function getSizeBasis(widget) {
        return BoxLayout.getSizeBasis(widget);
    }
    BoxPanel.getSizeBasis = getSizeBasis;
    /**
     * Set the box panel size basis for the given widget.
     *
     * @param widget - The widget of interest.
     *
     * @param value - The value for the size basis.
     */
    function setSizeBasis(widget, value) {
        BoxLayout.setSizeBasis(widget, value);
    }
    BoxPanel.setSizeBasis = setSizeBasis;
})(BoxPanel || (BoxPanel = {}));
/**
 * The namespace for the module implementation details.
 */
var Private$4;
(function (Private) {
    /**
     * Create a box layout for the given panel options.
     */
    function createLayout(options) {
        return options.layout || new BoxLayout(options);
    }
    Private.createLayout = createLayout;
})(Private$4 || (Private$4 = {}));

/**
 * A widget which displays command items as a searchable palette.
 */
var CommandPalette = /** @class */ (function (_super) {
    __extends(CommandPalette, _super);
    /**
     * Construct a new command palette.
     *
     * @param options - The options for initializing the palette.
     */
    function CommandPalette(options) {
        var _this = _super.call(this, { node: Private$5.createNode() }) || this;
        _this._activeIndex = -1;
        _this._items = [];
        _this._results = null;
        _this.addClass('lm-CommandPalette');
        /* <DEPRECATED> */
        _this.addClass('p-CommandPalette');
        /* </DEPRECATED> */
        _this.setFlag(Widget.Flag.DisallowLayout);
        _this.commands = options.commands;
        _this.renderer = options.renderer || CommandPalette.defaultRenderer;
        _this.commands.commandChanged.connect(_this._onGenericChange, _this);
        _this.commands.keyBindingChanged.connect(_this._onGenericChange, _this);
        return _this;
    }
    /**
     * Dispose of the resources held by the widget.
     */
    CommandPalette.prototype.dispose = function () {
        this._items.length = 0;
        this._results = null;
        _super.prototype.dispose.call(this);
    };
    Object.defineProperty(CommandPalette.prototype, "searchNode", {
        /**
         * The command palette search node.
         *
         * #### Notes
         * This is the node which contains the search-related elements.
         */
        get: function () {
            return this.node.getElementsByClassName('lm-CommandPalette-search')[0];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CommandPalette.prototype, "inputNode", {
        /**
         * The command palette input node.
         *
         * #### Notes
         * This is the actual input node for the search area.
         */
        get: function () {
            return this.node.getElementsByClassName('lm-CommandPalette-input')[0];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CommandPalette.prototype, "contentNode", {
        /**
         * The command palette content node.
         *
         * #### Notes
         * This is the node which holds the command item nodes.
         *
         * Modifying this node directly can lead to undefined behavior.
         */
        get: function () {
            return this.node.getElementsByClassName('lm-CommandPalette-content')[0];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CommandPalette.prototype, "items", {
        /**
         * A read-only array of the command items in the palette.
         */
        get: function () {
            return this._items;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Add a command item to the command palette.
     *
     * @param options - The options for creating the command item.
     *
     * @returns The command item added to the palette.
     */
    CommandPalette.prototype.addItem = function (options) {
        // Create a new command item for the options.
        var item = Private$5.createItem(this.commands, options);
        // Add the item to the array.
        this._items.push(item);
        // Refresh the search results.
        this.refresh();
        // Return the item added to the palette.
        return item;
    };
    /**
     * Adds command items to the command palette.
     *
     * @param items - An array of options for creating each command item.
     *
     * @returns The command items added to the palette.
     */
    CommandPalette.prototype.addItems = function (items) {
        var _this = this;
        var newItems = items.map(function (item) { return Private$5.createItem(_this.commands, item); });
        newItems.forEach(function (item) { return _this._items.push(item); });
        this.refresh();
        return newItems;
    };
    /**
     * Remove an item from the command palette.
     *
     * @param item - The item to remove from the palette.
     *
     * #### Notes
     * This is a no-op if the item is not in the palette.
     */
    CommandPalette.prototype.removeItem = function (item) {
        this.removeItemAt(this._items.indexOf(item));
    };
    /**
     * Remove the item at a given index from the command palette.
     *
     * @param index - The index of the item to remove.
     *
     * #### Notes
     * This is a no-op if the index is out of range.
     */
    CommandPalette.prototype.removeItemAt = function (index) {
        // Remove the item from the array.
        var item = ArrayExt.removeAt(this._items, index);
        // Bail if the index is out of range.
        if (!item) {
            return;
        }
        // Refresh the search results.
        this.refresh();
    };
    /**
     * Remove all items from the command palette.
     */
    CommandPalette.prototype.clearItems = function () {
        // Bail if there is nothing to remove.
        if (this._items.length === 0) {
            return;
        }
        // Clear the array of items.
        this._items.length = 0;
        // Refresh the search results.
        this.refresh();
    };
    /**
     * Clear the search results and schedule an update.
     *
     * #### Notes
     * This should be called whenever the search results of the palette
     * should be updated.
     *
     * This is typically called automatically by the palette as needed,
     * but can be called manually if the input text is programatically
     * changed.
     *
     * The rendered results are updated asynchronously.
     */
    CommandPalette.prototype.refresh = function () {
        this._results = null;
        if (this.inputNode.value !== '') {
            var clear = this.node.getElementsByClassName('lm-close-icon')[0];
            clear.style.display = 'inherit';
        }
        else {
            var clear = this.node.getElementsByClassName('lm-close-icon')[0];
            clear.style.display = 'none';
        }
        this.update();
    };
    /**
     * Handle the DOM events for the command palette.
     *
     * @param event - The DOM event sent to the command palette.
     *
     * #### Notes
     * This method implements the DOM `EventListener` interface and is
     * called in response to events on the command palette's DOM node.
     * It should not be called directly by user code.
     */
    CommandPalette.prototype.handleEvent = function (event) {
        switch (event.type) {
            case 'click':
                this._evtClick(event);
                break;
            case 'keydown':
                this._evtKeyDown(event);
                break;
            case 'input':
                this.refresh();
                break;
            case 'focus':
            case 'blur':
                this._toggleFocused();
                break;
        }
    };
    /**
     * A message handler invoked on a `'before-attach'` message.
     */
    CommandPalette.prototype.onBeforeAttach = function (msg) {
        this.node.addEventListener('click', this);
        this.node.addEventListener('keydown', this);
        this.node.addEventListener('input', this);
        this.node.addEventListener('focus', this, true);
        this.node.addEventListener('blur', this, true);
    };
    /**
     * A message handler invoked on an `'after-detach'` message.
     */
    CommandPalette.prototype.onAfterDetach = function (msg) {
        this.node.removeEventListener('click', this);
        this.node.removeEventListener('keydown', this);
        this.node.removeEventListener('input', this);
        this.node.removeEventListener('focus', this, true);
        this.node.removeEventListener('blur', this, true);
    };
    /**
     * A message handler invoked on an `'activate-request'` message.
     */
    CommandPalette.prototype.onActivateRequest = function (msg) {
        if (this.isAttached) {
            var input = this.inputNode;
            input.focus();
            input.select();
        }
    };
    /**
     * A message handler invoked on an `'update-request'` message.
     */
    CommandPalette.prototype.onUpdateRequest = function (msg) {
        // Fetch the current query text and content node.
        var query = this.inputNode.value;
        var contentNode = this.contentNode;
        // Ensure the search results are generated.
        var results = this._results;
        if (!results) {
            // Generate and store the new search results.
            results = this._results = Private$5.search(this._items, query);
            // Reset the active index.
            this._activeIndex = (query ? ArrayExt.findFirstIndex(results, Private$5.canActivate) : -1);
        }
        // If there is no query and no results, clear the content.
        if (!query && results.length === 0) {
            VirtualDOM.render(null, contentNode);
            return;
        }
        // If the is a query but no results, render the empty message.
        if (query && results.length === 0) {
            var content_1 = this.renderer.renderEmptyMessage({ query: query });
            VirtualDOM.render(content_1, contentNode);
            return;
        }
        // Create the render content for the search results.
        var renderer = this.renderer;
        var activeIndex = this._activeIndex;
        var content = new Array(results.length);
        for (var i = 0, n = results.length; i < n; ++i) {
            var result = results[i];
            if (result.type === 'header') {
                var indices = result.indices;
                var category = result.category;
                content[i] = renderer.renderHeader({ category: category, indices: indices });
            }
            else {
                var item = result.item;
                var indices = result.indices;
                var active = i === activeIndex;
                content[i] = renderer.renderItem({ item: item, indices: indices, active: active });
            }
        }
        // Render the search result content.
        VirtualDOM.render(content, contentNode);
        // Adjust the scroll position as needed.
        if (activeIndex < 0 || activeIndex >= results.length) {
            contentNode.scrollTop = 0;
        }
        else {
            var element = contentNode.children[activeIndex];
            ElementExt.scrollIntoViewIfNeeded(contentNode, element);
        }
    };
    /**
     * Handle the `'click'` event for the command palette.
     */
    CommandPalette.prototype._evtClick = function (event) {
        // Bail if the click is not the left button.
        if (event.button !== 0) {
            return;
        }
        // Clear input if the target is clear button
        if (event.target.classList.contains("lm-close-icon")) {
            this.inputNode.value = '';
            this.refresh();
            return;
        }
        // Find the index of the item which was clicked.
        var index = ArrayExt.findFirstIndex(this.contentNode.children, function (node) {
            return node.contains(event.target);
        });
        // Bail if the click was not on an item.
        if (index === -1) {
            return;
        }
        // Kill the event when a content item is clicked.
        event.preventDefault();
        event.stopPropagation();
        // Execute the item if possible.
        this._execute(index);
    };
    /**
     * Handle the `'keydown'` event for the command palette.
     */
    CommandPalette.prototype._evtKeyDown = function (event) {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
            return;
        }
        switch (event.keyCode) {
            case 13: // Enter
                event.preventDefault();
                event.stopPropagation();
                this._execute(this._activeIndex);
                break;
            case 38: // Up Arrow
                event.preventDefault();
                event.stopPropagation();
                this._activatePreviousItem();
                break;
            case 40: // Down Arrow
                event.preventDefault();
                event.stopPropagation();
                this._activateNextItem();
                break;
        }
    };
    /**
     * Activate the next enabled command item.
     */
    CommandPalette.prototype._activateNextItem = function () {
        // Bail if there are no search results.
        if (!this._results || this._results.length === 0) {
            return;
        }
        // Find the next enabled item index.
        var ai = this._activeIndex;
        var n = this._results.length;
        var start = ai < n - 1 ? ai + 1 : 0;
        var stop = start === 0 ? n - 1 : start - 1;
        this._activeIndex = ArrayExt.findFirstIndex(this._results, Private$5.canActivate, start, stop);
        // Schedule an update of the items.
        this.update();
    };
    /**
     * Activate the previous enabled command item.
     */
    CommandPalette.prototype._activatePreviousItem = function () {
        // Bail if there are no search results.
        if (!this._results || this._results.length === 0) {
            return;
        }
        // Find the previous enabled item index.
        var ai = this._activeIndex;
        var n = this._results.length;
        var start = ai <= 0 ? n - 1 : ai - 1;
        var stop = start === n - 1 ? 0 : start + 1;
        this._activeIndex = ArrayExt.findLastIndex(this._results, Private$5.canActivate, start, stop);
        // Schedule an update of the items.
        this.update();
    };
    /**
     * Execute the command item at the given index, if possible.
     */
    CommandPalette.prototype._execute = function (index) {
        // Bail if there are no search results.
        if (!this._results) {
            return;
        }
        // Bail if the index is out of range.
        var part = this._results[index];
        if (!part) {
            return;
        }
        // Update the search text if the item is a header.
        if (part.type === 'header') {
            var input = this.inputNode;
            input.value = part.category.toLowerCase() + " ";
            input.focus();
            this.refresh();
            return;
        }
        // Bail if item is not enabled.
        if (!part.item.isEnabled) {
            return;
        }
        // Execute the item.
        this.commands.execute(part.item.command, part.item.args);
        // Clear the query text.
        this.inputNode.value = '';
        // Refresh the search results.
        this.refresh();
    };
    /**
     * Toggle the focused modifier based on the input node focus state.
     */
    CommandPalette.prototype._toggleFocused = function () {
        var focused = document.activeElement === this.inputNode;
        this.toggleClass('lm-mod-focused', focused);
        /* <DEPRECATED> */
        this.toggleClass('p-mod-focused', focused);
        /* </DEPRECATED> */
    };
    /**
     * A signal handler for generic command changes.
     */
    CommandPalette.prototype._onGenericChange = function () {
        this.refresh();
    };
    return CommandPalette;
}(Widget));
/**
 * The namespace for the `CommandPalette` class statics.
 */
(function (CommandPalette) {
    /**
     * The default implementation of `IRenderer`.
     */
    var Renderer = /** @class */ (function () {
        function Renderer() {
        }
        /**
         * Render the virtual element for a command palette header.
         *
         * @param data - The data to use for rendering the header.
         *
         * @returns A virtual element representing the header.
         */
        Renderer.prototype.renderHeader = function (data) {
            var content = this.formatHeader(data);
            return h.li({ className: 'lm-CommandPalette-header'
                    /* <DEPRECATED> */
                    + ' p-CommandPalette-header'
                /* </DEPRECATED> */
            }, content);
        };
        /**
         * Render the virtual element for a command palette item.
         *
         * @param data - The data to use for rendering the item.
         *
         * @returns A virtual element representing the item.
         */
        Renderer.prototype.renderItem = function (data) {
            var className = this.createItemClass(data);
            var dataset = this.createItemDataset(data);
            if (data.item.isToggleable) {
                return (h.li({
                    className: className,
                    dataset: dataset,
                    role: 'checkbox',
                    'aria-checked': "" + data.item.isToggled
                }, this.renderItemIcon(data), this.renderItemContent(data), this.renderItemShortcut(data)));
            }
            return (h.li({
                className: className,
                dataset: dataset
            }, this.renderItemIcon(data), this.renderItemContent(data), this.renderItemShortcut(data)));
        };
        /**
         * Render the empty results message for a command palette.
         *
         * @param data - The data to use for rendering the message.
         *
         * @returns A virtual element representing the message.
         */
        Renderer.prototype.renderEmptyMessage = function (data) {
            var content = this.formatEmptyMessage(data);
            return h.li({
                className: 'lm-CommandPalette-emptyMessage'
                    /* <DEPRECATED> */
                    + ' p-CommandPalette-emptyMessage'
                /* </DEPRECATED> */
            }, content);
        };
        /**
         * Render the icon for a command palette item.
         *
         * @param data - The data to use for rendering the icon.
         *
         * @returns A virtual element representing the icon.
         */
        Renderer.prototype.renderItemIcon = function (data) {
            var className = this.createIconClass(data);
            /* <DEPRECATED> */
            if (typeof data.item.icon === 'string') {
                return h.div({ className: className }, data.item.iconLabel);
            }
            /* </DEPRECATED> */
            // if data.item.icon is undefined, it will be ignored
            return h.div({ className: className }, data.item.icon, data.item.iconLabel);
        };
        /**
         * Render the content for a command palette item.
         *
         * @param data - The data to use for rendering the content.
         *
         * @returns A virtual element representing the content.
         */
        Renderer.prototype.renderItemContent = function (data) {
            return (h.div({
                className: 'lm-CommandPalette-itemContent'
                    /* <DEPRECATED> */
                    + ' p-CommandPalette-itemContent'
                /* </DEPRECATED> */
            }, this.renderItemLabel(data), this.renderItemCaption(data)));
        };
        /**
         * Render the label for a command palette item.
         *
         * @param data - The data to use for rendering the label.
         *
         * @returns A virtual element representing the label.
         */
        Renderer.prototype.renderItemLabel = function (data) {
            var content = this.formatItemLabel(data);
            return h.div({
                className: 'lm-CommandPalette-itemLabel'
                    /* <DEPRECATED> */
                    + ' p-CommandPalette-itemLabel'
                /* </DEPRECATED> */
            }, content);
        };
        /**
         * Render the caption for a command palette item.
         *
         * @param data - The data to use for rendering the caption.
         *
         * @returns A virtual element representing the caption.
         */
        Renderer.prototype.renderItemCaption = function (data) {
            var content = this.formatItemCaption(data);
            return h.div({
                className: 'lm-CommandPalette-itemCaption'
                    /* <DEPRECATED> */
                    + ' p-CommandPalette-itemCaption'
                /* </DEPRECATED> */
            }, content);
        };
        /**
         * Render the shortcut for a command palette item.
         *
         * @param data - The data to use for rendering the shortcut.
         *
         * @returns A virtual element representing the shortcut.
         */
        Renderer.prototype.renderItemShortcut = function (data) {
            var content = this.formatItemShortcut(data);
            return h.div({
                className: 'lm-CommandPalette-itemShortcut'
                    /* <DEPRECATED> */
                    + ' p-CommandPalette-itemShortcut'
                /* </DEPRECATED> */
            }, content);
        };
        /**
         * Create the class name for the command palette item.
         *
         * @param data - The data to use for the class name.
         *
         * @returns The full class name for the command palette item.
         */
        Renderer.prototype.createItemClass = function (data) {
            // Set up the initial class name.
            var name = 'lm-CommandPalette-item';
            /* <DEPRECATED> */
            name += ' p-CommandPalette-item';
            /* </DEPRECATED> */
            // Add the boolean state classes.
            if (!data.item.isEnabled) {
                name += ' lm-mod-disabled';
                /* <DEPRECATED> */
                name += ' p-mod-disabled';
                /* </DEPRECATED> */
            }
            if (data.item.isToggled) {
                name += ' lm-mod-toggled';
                /* <DEPRECATED> */
                name += ' p-mod-toggled';
                /* </DEPRECATED> */
            }
            if (data.active) {
                name += ' lm-mod-active';
                /* <DEPRECATED> */
                name += ' p-mod-active';
                /* </DEPRECATED> */
            }
            // Add the extra class.
            var extra = data.item.className;
            if (extra) {
                name += " " + extra;
            }
            // Return the complete class name.
            return name;
        };
        /**
         * Create the dataset for the command palette item.
         *
         * @param data - The data to use for creating the dataset.
         *
         * @returns The dataset for the command palette item.
         */
        Renderer.prototype.createItemDataset = function (data) {
            return __assign(__assign({}, data.item.dataset), { command: data.item.command });
        };
        /**
         * Create the class name for the command item icon.
         *
         * @param data - The data to use for the class name.
         *
         * @returns The full class name for the item icon.
         */
        Renderer.prototype.createIconClass = function (data) {
            var name = 'lm-CommandPalette-itemIcon';
            /* <DEPRECATED> */
            name += ' p-CommandPalette-itemIcon';
            /* </DEPRECATED> */
            var extra = data.item.iconClass;
            return extra ? name + " " + extra : name;
        };
        /**
         * Create the render content for the header node.
         *
         * @param data - The data to use for the header content.
         *
         * @returns The content to add to the header node.
         */
        Renderer.prototype.formatHeader = function (data) {
            if (!data.indices || data.indices.length === 0) {
                return data.category;
            }
            return StringExt.highlight(data.category, data.indices, h.mark);
        };
        /**
         * Create the render content for the empty message node.
         *
         * @param data - The data to use for the empty message content.
         *
         * @returns The content to add to the empty message node.
         */
        Renderer.prototype.formatEmptyMessage = function (data) {
            return "No commands found that match '" + data.query + "'";
        };
        /**
         * Create the render content for the item shortcut node.
         *
         * @param data - The data to use for the shortcut content.
         *
         * @returns The content to add to the shortcut node.
         */
        Renderer.prototype.formatItemShortcut = function (data) {
            var kb = data.item.keyBinding;
            return kb ? kb.keys.map(CommandRegistry.formatKeystroke).join(', ') : null;
        };
        /**
         * Create the render content for the item label node.
         *
         * @param data - The data to use for the label content.
         *
         * @returns The content to add to the label node.
         */
        Renderer.prototype.formatItemLabel = function (data) {
            if (!data.indices || data.indices.length === 0) {
                return data.item.label;
            }
            return StringExt.highlight(data.item.label, data.indices, h.mark);
        };
        /**
         * Create the render content for the item caption node.
         *
         * @param data - The data to use for the caption content.
         *
         * @returns The content to add to the caption node.
         */
        Renderer.prototype.formatItemCaption = function (data) {
            return data.item.caption;
        };
        return Renderer;
    }());
    CommandPalette.Renderer = Renderer;
    /**
     * The default `Renderer` instance.
     */
    CommandPalette.defaultRenderer = new Renderer();
})(CommandPalette || (CommandPalette = {}));
/**
 * The namespace for the module implementation details.
 */
var Private$5;
(function (Private) {
    /**
     * Create the DOM node for a command palette.
     */
    function createNode() {
        var node = document.createElement('div');
        var search = document.createElement('div');
        var wrapper = document.createElement('div');
        var input = document.createElement('input');
        var content = document.createElement('ul');
        var clear = document.createElement('button');
        search.className = 'lm-CommandPalette-search';
        wrapper.className = 'lm-CommandPalette-wrapper';
        input.className = 'lm-CommandPalette-input';
        clear.className = 'lm-close-icon';
        content.className = 'lm-CommandPalette-content';
        /* <DEPRECATED> */
        search.classList.add('p-CommandPalette-search');
        wrapper.classList.add('p-CommandPalette-wrapper');
        input.classList.add('p-CommandPalette-input');
        content.classList.add('p-CommandPalette-content');
        /* </DEPRECATED> */
        input.spellcheck = false;
        wrapper.appendChild(input);
        wrapper.appendChild(clear);
        search.appendChild(wrapper);
        node.appendChild(search);
        node.appendChild(content);
        return node;
    }
    Private.createNode = createNode;
    /**
     * Create a new command item from a command registry and options.
     */
    function createItem(commands, options) {
        return new CommandItem(commands, options);
    }
    Private.createItem = createItem;
    /**
     * Search an array of command items for fuzzy matches.
     */
    function search(items, query) {
        // Fuzzy match the items for the query.
        var scores = matchItems(items, query);
        // Sort the items based on their score.
        scores.sort(scoreCmp);
        // Create the results for the search.
        return createResults(scores);
    }
    Private.search = search;
    /**
     * Test whether a result item can be activated.
     */
    function canActivate(result) {
        return result.type === 'item' && result.item.isEnabled;
    }
    Private.canActivate = canActivate;
    /**
     * Normalize a category for a command item.
     */
    function normalizeCategory(category) {
        return category.trim().replace(/\s+/g, ' ');
    }
    /**
     * Normalize the query text for a fuzzy search.
     */
    function normalizeQuery(text) {
        return text.replace(/\s+/g, '').toLowerCase();
    }
    /**
     * Perform a fuzzy match on an array of command items.
     */
    function matchItems(items, query) {
        // Normalize the query text to lower case with no whitespace.
        query = normalizeQuery(query);
        // Create the array to hold the scores.
        var scores = [];
        // Iterate over the items and match against the query.
        for (var i = 0, n = items.length; i < n; ++i) {
            // Ignore items which are not visible.
            var item = items[i];
            if (!item.isVisible) {
                continue;
            }
            // If the query is empty, all items are matched by default.
            if (!query) {
                scores.push({
                    matchType: 3 /* Default */,
                    categoryIndices: null,
                    labelIndices: null,
                    score: 0, item: item
                });
                continue;
            }
            // Run the fuzzy search for the item and query.
            var score = fuzzySearch(item, query);
            // Ignore the item if it is not a match.
            if (!score) {
                continue;
            }
            // Penalize disabled items.
            // TODO - push disabled items all the way down in sort cmp?
            if (!item.isEnabled) {
                score.score += 1000;
            }
            // Add the score to the results.
            scores.push(score);
        }
        // Return the final array of scores.
        return scores;
    }
    /**
     * Perform a fuzzy search on a single command item.
     */
    function fuzzySearch(item, query) {
        // Create the source text to be searched.
        var category = item.category.toLowerCase();
        var label = item.label.toLowerCase();
        var source = category + " " + label;
        // Set up the match score and indices array.
        var score = Infinity;
        var indices = null;
        // The regex for search word boundaries
        var rgx = /\b\w/g;
        // Search the source by word boundary.
        while (true) {
            // Find the next word boundary in the source.
            var rgxMatch = rgx.exec(source);
            // Break if there is no more source context.
            if (!rgxMatch) {
                break;
            }
            // Run the string match on the relevant substring.
            var match = StringExt.matchSumOfDeltas(source, query, rgxMatch.index);
            // Break if there is no match.
            if (!match) {
                break;
            }
            // Update the match if the score is better.
            if (match && match.score <= score) {
                score = match.score;
                indices = match.indices;
            }
        }
        // Bail if there was no match.
        if (!indices || score === Infinity) {
            return null;
        }
        // Compute the pivot index between category and label text.
        var pivot = category.length + 1;
        // Find the slice index to separate matched indices.
        var j = ArrayExt.lowerBound(indices, pivot, function (a, b) { return a - b; });
        // Extract the matched category and label indices.
        var categoryIndices = indices.slice(0, j);
        var labelIndices = indices.slice(j);
        // Adjust the label indices for the pivot offset.
        for (var i = 0, n = labelIndices.length; i < n; ++i) {
            labelIndices[i] -= pivot;
        }
        // Handle a pure label match.
        if (categoryIndices.length === 0) {
            return {
                matchType: 0 /* Label */,
                categoryIndices: null,
                labelIndices: labelIndices,
                score: score, item: item
            };
        }
        // Handle a pure category match.
        if (labelIndices.length === 0) {
            return {
                matchType: 1 /* Category */,
                categoryIndices: categoryIndices,
                labelIndices: null,
                score: score, item: item
            };
        }
        // Handle a split match.
        return {
            matchType: 2 /* Split */,
            categoryIndices: categoryIndices,
            labelIndices: labelIndices,
            score: score, item: item
        };
    }
    /**
     * A sort comparison function for a match score.
     */
    function scoreCmp(a, b) {
        // First compare based on the match type
        var m1 = a.matchType - b.matchType;
        if (m1 !== 0) {
            return m1;
        }
        // Otherwise, compare based on the match score.
        var d1 = a.score - b.score;
        if (d1 !== 0) {
            return d1;
        }
        // Find the match index based on the match type.
        var i1 = 0;
        var i2 = 0;
        switch (a.matchType) {
            case 0 /* Label */:
                i1 = a.labelIndices[0];
                i2 = b.labelIndices[0];
                break;
            case 1 /* Category */:
            case 2 /* Split */:
                i1 = a.categoryIndices[0];
                i2 = b.categoryIndices[0];
                break;
        }
        // Compare based on the match index.
        if (i1 !== i2) {
            return i1 - i2;
        }
        // Otherwise, compare by category.
        var d2 = a.item.category.localeCompare(b.item.category);
        if (d2 !== 0) {
            return d2;
        }
        // Otherwise, compare by rank.
        var r1 = a.item.rank;
        var r2 = b.item.rank;
        if (r1 !== r2) {
            return r1 < r2 ? -1 : 1; // Infinity safe
        }
        // Finally, compare by label.
        return a.item.label.localeCompare(b.item.label);
    }
    /**
     * Create the results from an array of sorted scores.
     */
    function createResults(scores) {
        // Set up an array to track which scores have been visited.
        var visited = new Array(scores.length);
        ArrayExt.fill(visited, false);
        // Set up the search results array.
        var results = [];
        // Iterate over each score in the array.
        for (var i = 0, n = scores.length; i < n; ++i) {
            // Ignore a score which has already been processed.
            if (visited[i]) {
                continue;
            }
            // Extract the current item and indices.
            var _a = scores[i], item = _a.item, categoryIndices = _a.categoryIndices;
            // Extract the category for the current item.
            var category = item.category;
            // Add the header result for the category.
            results.push({ type: 'header', category: category, indices: categoryIndices });
            // Find the rest of the scores with the same category.
            for (var j = i; j < n; ++j) {
                // Ignore a score which has already been processed.
                if (visited[j]) {
                    continue;
                }
                // Extract the data for the current score.
                var _b = scores[j], item_1 = _b.item, labelIndices = _b.labelIndices;
                // Ignore an item with a different category.
                if (item_1.category !== category) {
                    continue;
                }
                // Create the item result for the score.
                results.push({ type: 'item', item: item_1, indices: labelIndices });
                // Mark the score as processed.
                visited[j] = true;
            }
        }
        // Return the final results.
        return results;
    }
    /**
     * A concrete implementation of `CommandPalette.IItem`.
     */
    var CommandItem = /** @class */ (function () {
        /**
         * Construct a new command item.
         */
        function CommandItem(commands, options) {
            this._commands = commands;
            this.category = normalizeCategory(options.category);
            this.command = options.command;
            this.args = options.args || JSONExt.emptyObject;
            this.rank = options.rank !== undefined ? options.rank : Infinity;
        }
        Object.defineProperty(CommandItem.prototype, "label", {
            /**
             * The display label for the command item.
             */
            get: function () {
                return this._commands.label(this.command, this.args);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CommandItem.prototype, "icon", {
            /**
             * The icon renderer for the command item.
             */
            get: function () {
                return this._commands.icon(this.command, this.args);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CommandItem.prototype, "iconClass", {
            /**
             * The icon class for the command item.
             */
            get: function () {
                return this._commands.iconClass(this.command, this.args);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CommandItem.prototype, "iconLabel", {
            /**
             * The icon label for the command item.
             */
            get: function () {
                return this._commands.iconLabel(this.command, this.args);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CommandItem.prototype, "caption", {
            /**
             * The display caption for the command item.
             */
            get: function () {
                return this._commands.caption(this.command, this.args);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CommandItem.prototype, "className", {
            /**
             * The extra class name for the command item.
             */
            get: function () {
                return this._commands.className(this.command, this.args);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CommandItem.prototype, "dataset", {
            /**
             * The dataset for the command item.
             */
            get: function () {
                return this._commands.dataset(this.command, this.args);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CommandItem.prototype, "isEnabled", {
            /**
             * Whether the command item is enabled.
             */
            get: function () {
                return this._commands.isEnabled(this.command, this.args);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CommandItem.prototype, "isToggled", {
            /**
             * Whether the command item is toggled.
             */
            get: function () {
                return this._commands.isToggled(this.command, this.args);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CommandItem.prototype, "isToggleable", {
            /**
             * Whether the command item is toggleable.
             */
            get: function () {
                return this._commands.isToggleable(this.command, this.args);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CommandItem.prototype, "isVisible", {
            /**
             * Whether the command item is visible.
             */
            get: function () {
                return this._commands.isVisible(this.command, this.args);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(CommandItem.prototype, "keyBinding", {
            /**
             * The key binding for the command item.
             */
            get: function () {
                var _a = this, command = _a.command, args = _a.args;
                return ArrayExt.findLastValue(this._commands.keyBindings, function (kb) {
                    return kb.command === command && JSONExt.deepEqual(kb.args, args);
                }) || null;
            },
            enumerable: true,
            configurable: true
        });
        return CommandItem;
    }());
})(Private$5 || (Private$5 = {}));

/**
 * A widget which displays items as a canonical menu.
 */
var Menu = /** @class */ (function (_super) {
    __extends(Menu, _super);
    /**
     * Construct a new menu.
     *
     * @param options - The options for initializing the menu.
     */
    function Menu(options) {
        var _this = _super.call(this, { node: Private$6.createNode() }) || this;
        _this._childIndex = -1;
        _this._activeIndex = -1;
        _this._openTimerID = 0;
        _this._closeTimerID = 0;
        _this._items = [];
        _this._childMenu = null;
        _this._parentMenu = null;
        _this._aboutToClose = new Signal(_this);
        _this._menuRequested = new Signal(_this);
        _this.addClass('lm-Menu');
        /* <DEPRECATED> */
        _this.addClass('p-Menu');
        /* </DEPRECATED> */
        _this.setFlag(Widget.Flag.DisallowLayout);
        _this.commands = options.commands;
        _this.renderer = options.renderer || Menu.defaultRenderer;
        return _this;
    }
    /**
     * Dispose of the resources held by the menu.
     */
    Menu.prototype.dispose = function () {
        this.close();
        this._items.length = 0;
        _super.prototype.dispose.call(this);
    };
    Object.defineProperty(Menu.prototype, "aboutToClose", {
        /**
         * A signal emitted just before the menu is closed.
         *
         * #### Notes
         * This signal is emitted when the menu receives a `'close-request'`
         * message, just before it removes itself from the DOM.
         *
         * This signal is not emitted if the menu is already detached from
         * the DOM when it receives the `'close-request'` message.
         */
        get: function () {
            return this._aboutToClose;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Menu.prototype, "menuRequested", {
        /**
         * A signal emitted when a new menu is requested by the user.
         *
         * #### Notes
         * This signal is emitted whenever the user presses the right or left
         * arrow keys, and a submenu cannot be opened or closed in response.
         *
         * This signal is useful when implementing menu bars in order to open
         * the next or previous menu in response to a user key press.
         *
         * This signal is only emitted for the root menu in a hierarchy.
         */
        get: function () {
            return this._menuRequested;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Menu.prototype, "parentMenu", {
        /**
         * The parent menu of the menu.
         *
         * #### Notes
         * This is `null` unless the menu is an open submenu.
         */
        get: function () {
            return this._parentMenu;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Menu.prototype, "childMenu", {
        /**
         * The child menu of the menu.
         *
         * #### Notes
         * This is `null` unless the menu has an open submenu.
         */
        get: function () {
            return this._childMenu;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Menu.prototype, "rootMenu", {
        /**
         * The root menu of the menu hierarchy.
         */
        get: function () {
            var menu = this;
            while (menu._parentMenu) {
                menu = menu._parentMenu;
            }
            return menu;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Menu.prototype, "leafMenu", {
        /**
         * The leaf menu of the menu hierarchy.
         */
        get: function () {
            var menu = this;
            while (menu._childMenu) {
                menu = menu._childMenu;
            }
            return menu;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Menu.prototype, "contentNode", {
        /**
         * The menu content node.
         *
         * #### Notes
         * This is the node which holds the menu item nodes.
         *
         * Modifying this node directly can lead to undefined behavior.
         */
        get: function () {
            return this.node.getElementsByClassName('lm-Menu-content')[0];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Menu.prototype, "activeItem", {
        /**
         * Get the currently active menu item.
         */
        get: function () {
            return this._items[this._activeIndex] || null;
        },
        /**
         * Set the currently active menu item.
         *
         * #### Notes
         * If the item cannot be activated, the item will be set to `null`.
         */
        set: function (value) {
            this.activeIndex = value ? this._items.indexOf(value) : -1;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Menu.prototype, "activeIndex", {
        /**
         * Get the index of the currently active menu item.
         *
         * #### Notes
         * This will be `-1` if no menu item is active.
         */
        get: function () {
            return this._activeIndex;
        },
        /**
         * Set the index of the currently active menu item.
         *
         * #### Notes
         * If the item cannot be activated, the index will be set to `-1`.
         */
        set: function (value) {
            // Adjust the value for an out of range index.
            if (value < 0 || value >= this._items.length) {
                value = -1;
            }
            // Ensure the item can be activated.
            if (value !== -1 && !Private$6.canActivate(this._items[value])) {
                value = -1;
            }
            // Bail if the index will not change.
            if (this._activeIndex === value) {
                return;
            }
            // Update the active index.
            this._activeIndex = value;
            // schedule an update of the items.
            this.update();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Menu.prototype, "items", {
        /**
         * A read-only array of the menu items in the menu.
         */
        get: function () {
            return this._items;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Activate the next selectable item in the menu.
     *
     * #### Notes
     * If no item is selectable, the index will be set to `-1`.
     */
    Menu.prototype.activateNextItem = function () {
        var n = this._items.length;
        var ai = this._activeIndex;
        var start = ai < n - 1 ? ai + 1 : 0;
        var stop = start === 0 ? n - 1 : start - 1;
        this.activeIndex = ArrayExt.findFirstIndex(this._items, Private$6.canActivate, start, stop);
    };
    /**
     * Activate the previous selectable item in the menu.
     *
     * #### Notes
     * If no item is selectable, the index will be set to `-1`.
     */
    Menu.prototype.activatePreviousItem = function () {
        var n = this._items.length;
        var ai = this._activeIndex;
        var start = ai <= 0 ? n - 1 : ai - 1;
        var stop = start === n - 1 ? 0 : start + 1;
        this.activeIndex = ArrayExt.findLastIndex(this._items, Private$6.canActivate, start, stop);
    };
    /**
     * Trigger the active menu item.
     *
     * #### Notes
     * If the active item is a submenu, it will be opened and the first
     * item will be activated.
     *
     * If the active item is a command, the command will be executed.
     *
     * If the menu is not attached, this is a no-op.
     *
     * If there is no active item, this is a no-op.
     */
    Menu.prototype.triggerActiveItem = function () {
        // Bail if the menu is not attached.
        if (!this.isAttached) {
            return;
        }
        // Bail if there is no active item.
        var item = this.activeItem;
        if (!item) {
            return;
        }
        // Cancel the pending timers.
        this._cancelOpenTimer();
        this._cancelCloseTimer();
        // If the item is a submenu, open it.
        if (item.type === 'submenu') {
            this._openChildMenu(true);
            return;
        }
        // Close the root menu before executing the command.
        this.rootMenu.close();
        // Execute the command for the item.
        var command = item.command, args = item.args;
        if (this.commands.isEnabled(command, args)) {
            this.commands.execute(command, args);
        }
        else {
            console.log("Command '" + command + "' is disabled.");
        }
    };
    /**
     * Add a menu item to the end of the menu.
     *
     * @param options - The options for creating the menu item.
     *
     * @returns The menu item added to the menu.
     */
    Menu.prototype.addItem = function (options) {
        return this.insertItem(this._items.length, options);
    };
    /**
     * Insert a menu item into the menu at the specified index.
     *
     * @param index - The index at which to insert the item.
     *
     * @param options - The options for creating the menu item.
     *
     * @returns The menu item added to the menu.
     *
     * #### Notes
     * The index will be clamped to the bounds of the items.
     */
    Menu.prototype.insertItem = function (index, options) {
        // Close the menu if it's attached.
        if (this.isAttached) {
            this.close();
        }
        // Reset the active index.
        this.activeIndex = -1;
        // Clamp the insert index to the array bounds.
        var i = Math.max(0, Math.min(index, this._items.length));
        // Create the item for the options.
        var item = Private$6.createItem(this, options);
        // Insert the item into the array.
        ArrayExt.insert(this._items, i, item);
        // Schedule an update of the items.
        this.update();
        // Return the item added to the menu.
        return item;
    };
    /**
     * Remove an item from the menu.
     *
     * @param item - The item to remove from the menu.
     *
     * #### Notes
     * This is a no-op if the item is not in the menu.
     */
    Menu.prototype.removeItem = function (item) {
        this.removeItemAt(this._items.indexOf(item));
    };
    /**
     * Remove the item at a given index from the menu.
     *
     * @param index - The index of the item to remove.
     *
     * #### Notes
     * This is a no-op if the index is out of range.
     */
    Menu.prototype.removeItemAt = function (index) {
        // Close the menu if it's attached.
        if (this.isAttached) {
            this.close();
        }
        // Reset the active index.
        this.activeIndex = -1;
        // Remove the item from the array.
        var item = ArrayExt.removeAt(this._items, index);
        // Bail if the index is out of range.
        if (!item) {
            return;
        }
        // Schedule an update of the items.
        this.update();
    };
    /**
     * Remove all menu items from the menu.
     */
    Menu.prototype.clearItems = function () {
        // Close the menu if it's attached.
        if (this.isAttached) {
            this.close();
        }
        // Reset the active index.
        this.activeIndex = -1;
        // Bail if there is nothing to remove.
        if (this._items.length === 0) {
            return;
        }
        // Clear the items.
        this._items.length = 0;
        // Schedule an update of the items.
        this.update();
    };
    /**
     * Open the menu at the specified location.
     *
     * @param x - The client X coordinate of the menu location.
     *
     * @param y - The client Y coordinate of the menu location.
     *
     * @param options - The additional options for opening the menu.
     *
     * #### Notes
     * The menu will be opened at the given location unless it will not
     * fully fit on the screen. If it will not fit, it will be adjusted
     * to fit naturally on the screen.
     *
     * This is a no-op if the menu is already attached to the DOM.
     */
    Menu.prototype.open = function (x, y, options) {
        if (options === void 0) { options = {}; }
        // Bail early if the menu is already attached.
        if (this.isAttached) {
            return;
        }
        // Extract the position options.
        var forceX = options.forceX || false;
        var forceY = options.forceY || false;
        // Open the menu as a root menu.
        Private$6.openRootMenu(this, x, y, forceX, forceY);
        // Activate the menu to accept keyboard input.
        this.activate();
    };
    /**
     * Handle the DOM events for the menu.
     *
     * @param event - The DOM event sent to the menu.
     *
     * #### Notes
     * This method implements the DOM `EventListener` interface and is
     * called in response to events on the menu's DOM nodes. It should
     * not be called directly by user code.
     */
    Menu.prototype.handleEvent = function (event) {
        switch (event.type) {
            case 'keydown':
                this._evtKeyDown(event);
                break;
            case 'mouseup':
                this._evtMouseUp(event);
                break;
            case 'mousemove':
                this._evtMouseMove(event);
                break;
            case 'mouseenter':
                this._evtMouseEnter(event);
                break;
            case 'mouseleave':
                this._evtMouseLeave(event);
                break;
            case 'mousedown':
                this._evtMouseDown(event);
                break;
            case 'contextmenu':
                event.preventDefault();
                event.stopPropagation();
                break;
        }
    };
    /**
     * A message handler invoked on a `'before-attach'` message.
     */
    Menu.prototype.onBeforeAttach = function (msg) {
        this.node.addEventListener('keydown', this);
        this.node.addEventListener('mouseup', this);
        this.node.addEventListener('mousemove', this);
        this.node.addEventListener('mouseenter', this);
        this.node.addEventListener('mouseleave', this);
        this.node.addEventListener('contextmenu', this);
        document.addEventListener('mousedown', this, true);
    };
    /**
     * A message handler invoked on an `'after-detach'` message.
     */
    Menu.prototype.onAfterDetach = function (msg) {
        this.node.removeEventListener('keydown', this);
        this.node.removeEventListener('mouseup', this);
        this.node.removeEventListener('mousemove', this);
        this.node.removeEventListener('mouseenter', this);
        this.node.removeEventListener('mouseleave', this);
        this.node.removeEventListener('contextmenu', this);
        document.removeEventListener('mousedown', this, true);
    };
    /**
     * A message handler invoked on an `'activate-request'` message.
     */
    Menu.prototype.onActivateRequest = function (msg) {
        if (this.isAttached) {
            this.node.focus();
        }
    };
    /**
     * A message handler invoked on an `'update-request'` message.
     */
    Menu.prototype.onUpdateRequest = function (msg) {
        var items = this._items;
        var renderer = this.renderer;
        var activeIndex = this._activeIndex;
        var collapsedFlags = Private$6.computeCollapsed(items);
        var content = new Array(items.length);
        for (var i = 0, n = items.length; i < n; ++i) {
            var item = items[i];
            var active = i === activeIndex;
            var collapsed = collapsedFlags[i];
            content[i] = renderer.renderItem({ item: item, active: active, collapsed: collapsed });
        }
        VirtualDOM.render(content, this.contentNode);
    };
    /**
     * A message handler invoked on a `'close-request'` message.
     */
    Menu.prototype.onCloseRequest = function (msg) {
        // Cancel the pending timers.
        this._cancelOpenTimer();
        this._cancelCloseTimer();
        // Reset the active index.
        this.activeIndex = -1;
        // Close any open child menu.
        var childMenu = this._childMenu;
        if (childMenu) {
            this._childIndex = -1;
            this._childMenu = null;
            childMenu._parentMenu = null;
            childMenu.close();
        }
        // Remove this menu from its parent and activate the parent.
        var parentMenu = this._parentMenu;
        if (parentMenu) {
            this._parentMenu = null;
            parentMenu._childIndex = -1;
            parentMenu._childMenu = null;
            parentMenu.activate();
        }
        // Emit the `aboutToClose` signal if the menu is attached.
        if (this.isAttached) {
            this._aboutToClose.emit(undefined);
        }
        // Finish closing the menu.
        _super.prototype.onCloseRequest.call(this, msg);
    };
    /**
     * Handle the `'keydown'` event for the menu.
     *
     * #### Notes
     * This listener is attached to the menu node.
     */
    Menu.prototype._evtKeyDown = function (event) {
        // A menu handles all keydown events.
        event.preventDefault();
        event.stopPropagation();
        // Fetch the key code for the event.
        var kc = event.keyCode;
        // Enter
        if (kc === 13) {
            this.triggerActiveItem();
            return;
        }
        // Escape
        if (kc === 27) {
            this.close();
            return;
        }
        // Left Arrow
        if (kc === 37) {
            if (this._parentMenu) {
                this.close();
            }
            else {
                this._menuRequested.emit('previous');
            }
            return;
        }
        // Up Arrow
        if (kc === 38) {
            this.activatePreviousItem();
            return;
        }
        // Right Arrow
        if (kc === 39) {
            var item = this.activeItem;
            if (item && item.type === 'submenu') {
                this.triggerActiveItem();
            }
            else {
                this.rootMenu._menuRequested.emit('next');
            }
            return;
        }
        // Down Arrow
        if (kc === 40) {
            this.activateNextItem();
            return;
        }
        // Get the pressed key character.
        var key = getKeyboardLayout().keyForKeydownEvent(event);
        // Bail if the key is not valid.
        if (!key) {
            return;
        }
        // Search for the next best matching mnemonic item.
        var start = this._activeIndex + 1;
        var result = Private$6.findMnemonic(this._items, key, start);
        // Handle the requested mnemonic based on the search results.
        // If exactly one mnemonic is matched, that item is triggered.
        // Otherwise, the next mnemonic is activated if available,
        // followed by the auto mnemonic if available.
        if (result.index !== -1 && !result.multiple) {
            this.activeIndex = result.index;
            this.triggerActiveItem();
        }
        else if (result.index !== -1) {
            this.activeIndex = result.index;
        }
        else if (result.auto !== -1) {
            this.activeIndex = result.auto;
        }
    };
    /**
     * Handle the `'mouseup'` event for the menu.
     *
     * #### Notes
     * This listener is attached to the menu node.
     */
    Menu.prototype._evtMouseUp = function (event) {
        if (event.button !== 0) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.triggerActiveItem();
    };
    /**
     * Handle the `'mousemove'` event for the menu.
     *
     * #### Notes
     * This listener is attached to the menu node.
     */
    Menu.prototype._evtMouseMove = function (event) {
        // Hit test the item nodes for the item under the mouse.
        var index = ArrayExt.findFirstIndex(this.contentNode.children, function (node) {
            return ElementExt.hitTest(node, event.clientX, event.clientY);
        });
        // Bail early if the mouse is already over the active index.
        if (index === this._activeIndex) {
            return;
        }
        // Update and coerce the active index.
        this.activeIndex = index;
        index = this.activeIndex;
        // If the index is the current child index, cancel the timers.
        if (index === this._childIndex) {
            this._cancelOpenTimer();
            this._cancelCloseTimer();
            return;
        }
        // If a child menu is currently open, start the close timer.
        if (this._childIndex !== -1) {
            this._startCloseTimer();
        }
        // Cancel the open timer to give a full delay for opening.
        this._cancelOpenTimer();
        // Bail if the active item is not a valid submenu item.
        var item = this.activeItem;
        if (!item || item.type !== 'submenu' || !item.submenu) {
            return;
        }
        // Start the open timer to open the active item submenu.
        this._startOpenTimer();
    };
    /**
     * Handle the `'mouseenter'` event for the menu.
     *
     * #### Notes
     * This listener is attached to the menu node.
     */
    Menu.prototype._evtMouseEnter = function (event) {
        // Synchronize the active ancestor items.
        for (var menu = this._parentMenu; menu; menu = menu._parentMenu) {
            menu._cancelOpenTimer();
            menu._cancelCloseTimer();
            menu.activeIndex = menu._childIndex;
        }
    };
    /**
     * Handle the `'mouseleave'` event for the menu.
     *
     * #### Notes
     * This listener is attached to the menu node.
     */
    Menu.prototype._evtMouseLeave = function (event) {
        // Cancel any pending submenu opening.
        this._cancelOpenTimer();
        // If there is no open child menu, just reset the active index.
        if (!this._childMenu) {
            this.activeIndex = -1;
            return;
        }
        // If the mouse is over the child menu, cancel the close timer.
        var clientX = event.clientX, clientY = event.clientY;
        if (ElementExt.hitTest(this._childMenu.node, clientX, clientY)) {
            this._cancelCloseTimer();
            return;
        }
        // Otherwise, reset the active index and start the close timer.
        this.activeIndex = -1;
        this._startCloseTimer();
    };
    /**
     * Handle the `'mousedown'` event for the menu.
     *
     * #### Notes
     * This listener is attached to the document node.
     */
    Menu.prototype._evtMouseDown = function (event) {
        // Bail if the menu is not a root menu.
        if (this._parentMenu) {
            return;
        }
        // The mouse button which is pressed is irrelevant. If the press
        // is not on a menu, the entire hierarchy is closed and the event
        // is allowed to propagate. This allows other code to act on the
        // event, such as focusing the clicked element.
        if (Private$6.hitTestMenus(this, event.clientX, event.clientY)) {
            event.preventDefault();
            event.stopPropagation();
        }
        else {
            this.close();
        }
    };
    /**
     * Open the child menu at the active index immediately.
     *
     * If a different child menu is already open, it will be closed,
     * even if the active item is not a valid submenu.
     */
    Menu.prototype._openChildMenu = function (activateFirst) {
        if (activateFirst === void 0) { activateFirst = false; }
        // If the item is not a valid submenu, close the child menu.
        var item = this.activeItem;
        if (!item || item.type !== 'submenu' || !item.submenu) {
            this._closeChildMenu();
            return;
        }
        // Do nothing if the child menu will not change.
        var submenu = item.submenu;
        if (submenu === this._childMenu) {
            return;
        }
        // Ensure the current child menu is closed.
        this._closeChildMenu();
        // Update the private child state.
        this._childMenu = submenu;
        this._childIndex = this._activeIndex;
        // Set the parent menu reference for the child.
        submenu._parentMenu = this;
        // Ensure the menu is updated and lookup the item node.
        MessageLoop.sendMessage(this, Widget.Msg.UpdateRequest);
        var itemNode = this.contentNode.children[this._activeIndex];
        // Open the submenu at the active node.
        Private$6.openSubmenu(submenu, itemNode);
        // Activate the first item if desired.
        if (activateFirst) {
            submenu.activeIndex = -1;
            submenu.activateNextItem();
        }
        // Activate the child menu.
        submenu.activate();
    };
    /**
     * Close the child menu immediately.
     *
     * This is a no-op if a child menu is not open.
     */
    Menu.prototype._closeChildMenu = function () {
        if (this._childMenu) {
            this._childMenu.close();
        }
    };
    /**
     * Start the open timer, unless it is already pending.
     */
    Menu.prototype._startOpenTimer = function () {
        var _this = this;
        if (this._openTimerID === 0) {
            this._openTimerID = window.setTimeout(function () {
                _this._openTimerID = 0;
                _this._openChildMenu();
            }, Private$6.TIMER_DELAY);
        }
    };
    /**
     * Start the close timer, unless it is already pending.
     */
    Menu.prototype._startCloseTimer = function () {
        var _this = this;
        if (this._closeTimerID === 0) {
            this._closeTimerID = window.setTimeout(function () {
                _this._closeTimerID = 0;
                _this._closeChildMenu();
            }, Private$6.TIMER_DELAY);
        }
    };
    /**
     * Cancel the open timer, if the timer is pending.
     */
    Menu.prototype._cancelOpenTimer = function () {
        if (this._openTimerID !== 0) {
            clearTimeout(this._openTimerID);
            this._openTimerID = 0;
        }
    };
    /**
     * Cancel the close timer, if the timer is pending.
     */
    Menu.prototype._cancelCloseTimer = function () {
        if (this._closeTimerID !== 0) {
            clearTimeout(this._closeTimerID);
            this._closeTimerID = 0;
        }
    };
    return Menu;
}(Widget));
/**
 * The namespace for the `Menu` class statics.
 */
(function (Menu) {
    /**
     * The default implementation of `IRenderer`.
     *
     * #### Notes
     * Subclasses are free to reimplement rendering methods as needed.
     */
    var Renderer = /** @class */ (function () {
        /**
         * Construct a new renderer.
         */
        function Renderer() {
        }
        /**
         * Render the virtual element for a menu item.
         *
         * @param data - The data to use for rendering the item.
         *
         * @returns A virtual element representing the item.
         */
        Renderer.prototype.renderItem = function (data) {
            var className = this.createItemClass(data);
            var dataset = this.createItemDataset(data);
            var aria = this.createItemARIA(data);
            return (h.li(__assign({ className: className, dataset: dataset }, aria), this.renderIcon(data), this.renderLabel(data), this.renderShortcut(data), this.renderSubmenu(data)));
        };
        /**
         * Render the icon element for a menu item.
         *
         * @param data - The data to use for rendering the icon.
         *
         * @returns A virtual element representing the item icon.
         */
        Renderer.prototype.renderIcon = function (data) {
            var className = this.createIconClass(data);
            /* <DEPRECATED> */
            if (typeof data.item.icon === 'string') {
                return h.div({ className: className }, data.item.iconLabel);
            }
            /* </DEPRECATED> */
            // if data.item.icon is undefined, it will be ignored
            return h.div({ className: className }, data.item.icon, data.item.iconLabel);
        };
        /**
         * Render the label element for a menu item.
         *
         * @param data - The data to use for rendering the label.
         *
         * @returns A virtual element representing the item label.
         */
        Renderer.prototype.renderLabel = function (data) {
            var content = this.formatLabel(data);
            return h.div({
                className: 'lm-Menu-itemLabel'
                    /* <DEPRECATED> */
                    + ' p-Menu-itemLabel'
                /* </DEPRECATED> */
            }, content);
        };
        /**
         * Render the shortcut element for a menu item.
         *
         * @param data - The data to use for rendering the shortcut.
         *
         * @returns A virtual element representing the item shortcut.
         */
        Renderer.prototype.renderShortcut = function (data) {
            var content = this.formatShortcut(data);
            return h.div({
                className: 'lm-Menu-itemShortcut'
                    /* <DEPRECATED> */
                    + ' p-Menu-itemShortcut'
                /* </DEPRECATED> */
            }, content);
        };
        /**
         * Render the submenu icon element for a menu item.
         *
         * @param data - The data to use for rendering the submenu icon.
         *
         * @returns A virtual element representing the submenu icon.
         */
        Renderer.prototype.renderSubmenu = function (data) {
            return h.div({
                className: 'lm-Menu-itemSubmenuIcon'
                    /* <DEPRECATED> */
                    + ' p-Menu-itemSubmenuIcon'
                /* </DEPRECATED> */
            });
        };
        /**
         * Create the class name for the menu item.
         *
         * @param data - The data to use for the class name.
         *
         * @returns The full class name for the menu item.
         */
        Renderer.prototype.createItemClass = function (data) {
            // Setup the initial class name.
            var name = 'lm-Menu-item';
            /* <DEPRECATED> */
            name += ' p-Menu-item';
            /* </DEPRECATED> */
            // Add the boolean state classes.
            if (!data.item.isEnabled) {
                name += ' lm-mod-disabled';
                /* <DEPRECATED> */
                name += ' p-mod-disabled';
                /* </DEPRECATED> */
            }
            if (data.item.isToggled) {
                name += ' lm-mod-toggled';
                /* <DEPRECATED> */
                name += ' p-mod-toggled';
                /* </DEPRECATED> */
            }
            if (!data.item.isVisible) {
                name += ' lm-mod-hidden';
                /* <DEPRECATED> */
                name += ' p-mod-hidden';
                /* </DEPRECATED> */
            }
            if (data.active) {
                name += ' lm-mod-active';
                /* <DEPRECATED> */
                name += ' p-mod-active';
                /* </DEPRECATED> */
            }
            if (data.collapsed) {
                name += ' lm-mod-collapsed';
                /* <DEPRECATED> */
                name += ' p-mod-collapsed';
                /* </DEPRECATED> */
            }
            // Add the extra class.
            var extra = data.item.className;
            if (extra) {
                name += " " + extra;
            }
            // Return the complete class name.
            return name;
        };
        /**
         * Create the dataset for the menu item.
         *
         * @param data - The data to use for creating the dataset.
         *
         * @returns The dataset for the menu item.
         */
        Renderer.prototype.createItemDataset = function (data) {
            var result;
            var _a = data.item, type = _a.type, command = _a.command, dataset = _a.dataset;
            if (type === 'command') {
                result = __assign(__assign({}, dataset), { type: type, command: command });
            }
            else {
                result = __assign(__assign({}, dataset), { type: type });
            }
            return result;
        };
        /**
         * Create the class name for the menu item icon.
         *
         * @param data - The data to use for the class name.
         *
         * @returns The full class name for the item icon.
         */
        Renderer.prototype.createIconClass = function (data) {
            var name = 'lm-Menu-itemIcon';
            /* <DEPRECATED> */
            name += ' p-Menu-itemIcon';
            /* </DEPRECATED> */
            var extra = data.item.iconClass;
            return extra ? name + " " + extra : name;
        };
        /**
         * Create the aria attributes for menu item.
         *
         * @param data - The data to use for the aria attributes.
         *
         * @returns The aria attributes object for the item.
         */
        Renderer.prototype.createItemARIA = function (data) {
            var aria = {};
            switch (data.item.type) {
                case 'separator':
                    aria.role = 'presentation';
                    break;
                case 'submenu':
                    aria['aria-haspopup'] = 'true';
                    break;
                default:
                    aria.role = 'menuitem';
            }
            return aria;
        };
        /**
         * Create the render content for the label node.
         *
         * @param data - The data to use for the label content.
         *
         * @returns The content to add to the label node.
         */
        Renderer.prototype.formatLabel = function (data) {
            // Fetch the label text and mnemonic index.
            var _a = data.item, label = _a.label, mnemonic = _a.mnemonic;
            // If the index is out of range, do not modify the label.
            if (mnemonic < 0 || mnemonic >= label.length) {
                return label;
            }
            // Split the label into parts.
            var prefix = label.slice(0, mnemonic);
            var suffix = label.slice(mnemonic + 1);
            var char = label[mnemonic];
            // Wrap the mnemonic character in a span.
            var span = h.span({
                className: 'lm-Menu-itemMnemonic'
                    /* <DEPRECATED> */
                    + ' p-Menu-itemMnemonic'
                /* </DEPRECATED> */
            }, char);
            // Return the content parts.
            return [prefix, span, suffix];
        };
        /**
         * Create the render content for the shortcut node.
         *
         * @param data - The data to use for the shortcut content.
         *
         * @returns The content to add to the shortcut node.
         */
        Renderer.prototype.formatShortcut = function (data) {
            var kb = data.item.keyBinding;
            return kb ? kb.keys.map(CommandRegistry.formatKeystroke).join(', ') : null;
        };
        return Renderer;
    }());
    Menu.Renderer = Renderer;
    /**
     * The default `Renderer` instance.
     */
    Menu.defaultRenderer = new Renderer();
})(Menu || (Menu = {}));
/**
 * The namespace for the module implementation details.
 */
var Private$6;
(function (Private) {
    /**
     * The ms delay for opening and closing a submenu.
     */
    Private.TIMER_DELAY = 300;
    /**
     * The horizontal pixel overlap for an open submenu.
     */
    Private.SUBMENU_OVERLAP = 3;
    /**
     * Create the DOM node for a menu.
     */
    function createNode() {
        var node = document.createElement('div');
        var content = document.createElement('ul');
        content.className = 'lm-Menu-content';
        /* <DEPRECATED> */
        content.classList.add('p-Menu-content');
        /* </DEPRECATED> */
        node.appendChild(content);
        content.setAttribute('role', 'menu');
        node.tabIndex = -1;
        return node;
    }
    Private.createNode = createNode;
    /**
     * Test whether a menu item can be activated.
     */
    function canActivate(item) {
        return item.type !== 'separator' && item.isEnabled && item.isVisible;
    }
    Private.canActivate = canActivate;
    /**
     * Create a new menu item for an owner menu.
     */
    function createItem(owner, options) {
        return new MenuItem(owner.commands, options);
    }
    Private.createItem = createItem;
    /**
     * Hit test a menu hierarchy starting at the given root.
     */
    function hitTestMenus(menu, x, y) {
        for (var temp = menu; temp; temp = temp.childMenu) {
            if (ElementExt.hitTest(temp.node, x, y)) {
                return true;
            }
        }
        return false;
    }
    Private.hitTestMenus = hitTestMenus;
    /**
     * Compute which extra separator items should be collapsed.
     */
    function computeCollapsed(items) {
        // Allocate the return array and fill it with `false`.
        var result = new Array(items.length);
        ArrayExt.fill(result, false);
        // Collapse the leading separators.
        var k1 = 0;
        var n = items.length;
        for (; k1 < n; ++k1) {
            var item = items[k1];
            if (!item.isVisible) {
                continue;
            }
            if (item.type !== 'separator') {
                break;
            }
            result[k1] = true;
        }
        // Hide the trailing separators.
        var k2 = n - 1;
        for (; k2 >= 0; --k2) {
            var item = items[k2];
            if (!item.isVisible) {
                continue;
            }
            if (item.type !== 'separator') {
                break;
            }
            result[k2] = true;
        }
        // Hide the remaining consecutive separators.
        var hide = false;
        while (++k1 < k2) {
            var item = items[k1];
            if (!item.isVisible) {
                continue;
            }
            if (item.type !== 'separator') {
                hide = false;
            }
            else if (hide) {
                result[k1] = true;
            }
            else {
                hide = true;
            }
        }
        // Return the resulting flags.
        return result;
    }
    Private.computeCollapsed = computeCollapsed;
    /**
     * Open a menu as a root menu at the target location.
     */
    function openRootMenu(menu, x, y, forceX, forceY) {
        // Ensure the menu is updated before attaching and measuring.
        MessageLoop.sendMessage(menu, Widget.Msg.UpdateRequest);
        // Get the current position and size of the main viewport.
        var px = window.pageXOffset;
        var py = window.pageYOffset;
        var cw = document.documentElement.clientWidth;
        var ch = document.documentElement.clientHeight;
        // Compute the maximum allowed height for the menu.
        var maxHeight = ch - (forceY ? y : 0);
        // Fetch common variables.
        var node = menu.node;
        var style = node.style;
        // Clear the menu geometry and prepare it for measuring.
        style.top = '';
        style.left = '';
        style.width = '';
        style.height = '';
        style.visibility = 'hidden';
        style.maxHeight = maxHeight + "px";
        // Attach the menu to the document.
        Widget.attach(menu, document.body);
        // Measure the size of the menu.
        var _a = node.getBoundingClientRect(), width = _a.width, height = _a.height;
        // Adjust the X position of the menu to fit on-screen.
        if (!forceX && (x + width > px + cw)) {
            x = px + cw - width;
        }
        // Adjust the Y position of the menu to fit on-screen.
        if (!forceY && (y + height > py + ch)) {
            if (y > py + ch) {
                y = py + ch - height;
            }
            else {
                y = y - height;
            }
        }
        // Update the position of the menu to the computed position.
        style.top = Math.max(0, y) + "px";
        style.left = Math.max(0, x) + "px";
        // Finally, make the menu visible on the screen.
        style.visibility = '';
    }
    Private.openRootMenu = openRootMenu;
    /**
     * Open a menu as a submenu using an item node for positioning.
     */
    function openSubmenu(submenu, itemNode) {
        // Ensure the menu is updated before opening.
        MessageLoop.sendMessage(submenu, Widget.Msg.UpdateRequest);
        // Get the current position and size of the main viewport.
        var px = window.pageXOffset;
        var py = window.pageYOffset;
        var cw = document.documentElement.clientWidth;
        var ch = document.documentElement.clientHeight;
        // Compute the maximum allowed height for the menu.
        var maxHeight = ch;
        // Fetch common variables.
        var node = submenu.node;
        var style = node.style;
        // Clear the menu geometry and prepare it for measuring.
        style.top = '';
        style.left = '';
        style.width = '';
        style.height = '';
        style.visibility = 'hidden';
        style.maxHeight = maxHeight + "px";
        // Attach the menu to the document.
        Widget.attach(submenu, document.body);
        // Measure the size of the menu.
        var _a = node.getBoundingClientRect(), width = _a.width, height = _a.height;
        // Compute the box sizing for the menu.
        var box = ElementExt.boxSizing(submenu.node);
        // Get the bounding rect for the target item node.
        var itemRect = itemNode.getBoundingClientRect();
        // Compute the target X position.
        var x = itemRect.right - Private.SUBMENU_OVERLAP;
        // Adjust the X position to fit on the screen.
        if (x + width > px + cw) {
            x = itemRect.left + Private.SUBMENU_OVERLAP - width;
        }
        // Compute the target Y position.
        var y = itemRect.top - box.borderTop - box.paddingTop;
        // Adjust the Y position to fit on the screen.
        if (y + height > py + ch) {
            y = itemRect.bottom + box.borderBottom + box.paddingBottom - height;
        }
        // Update the position of the menu to the computed position.
        style.top = Math.max(0, y) + "px";
        style.left = Math.max(0, x) + "px";
        // Finally, make the menu visible on the screen.
        style.visibility = '';
    }
    Private.openSubmenu = openSubmenu;
    /**
     * Find the best matching mnemonic item.
     *
     * The search starts at the given index and wraps around.
     */
    function findMnemonic(items, key, start) {
        // Setup the result variables.
        var index = -1;
        var auto = -1;
        var multiple = false;
        // Normalize the key to upper case.
        var upperKey = key.toUpperCase();
        // Search the items from the given start index.
        for (var i = 0, n = items.length; i < n; ++i) {
            // Compute the wrapped index.
            var k = (i + start) % n;
            // Lookup the item
            var item = items[k];
            // Ignore items which cannot be activated.
            if (!canActivate(item)) {
                continue;
            }
            // Ignore items with an empty label.
            var label = item.label;
            if (label.length === 0) {
                continue;
            }
            // Lookup the mnemonic index for the label.
            var mn = item.mnemonic;
            // Handle a valid mnemonic index.
            if (mn >= 0 && mn < label.length) {
                if (label[mn].toUpperCase() === upperKey) {
                    if (index === -1) {
                        index = k;
                    }
                    else {
                        multiple = true;
                    }
                }
                continue;
            }
            // Finally, handle the auto index if possible.
            if (auto === -1 && label[0].toUpperCase() === upperKey) {
                auto = k;
            }
        }
        // Return the search results.
        return { index: index, multiple: multiple, auto: auto };
    }
    Private.findMnemonic = findMnemonic;
    /**
     * A concrete implementation of `Menu.IItem`.
     */
    var MenuItem = /** @class */ (function () {
        /**
         * Construct a new menu item.
         */
        function MenuItem(commands, options) {
            this._commands = commands;
            this.type = options.type || 'command';
            this.command = options.command || '';
            this.args = options.args || JSONExt.emptyObject;
            this.submenu = options.submenu || null;
        }
        Object.defineProperty(MenuItem.prototype, "label", {
            /**
             * The display label for the menu item.
             */
            get: function () {
                if (this.type === 'command') {
                    return this._commands.label(this.command, this.args);
                }
                if (this.type === 'submenu' && this.submenu) {
                    return this.submenu.title.label;
                }
                return '';
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MenuItem.prototype, "mnemonic", {
            /**
             * The mnemonic index for the menu item.
             */
            get: function () {
                if (this.type === 'command') {
                    return this._commands.mnemonic(this.command, this.args);
                }
                if (this.type === 'submenu' && this.submenu) {
                    return this.submenu.title.mnemonic;
                }
                return -1;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MenuItem.prototype, "icon", {
            /**
             * The icon renderer for the menu item.
             */
            get: function () {
                if (this.type === 'command') {
                    return this._commands.icon(this.command, this.args);
                }
                if (this.type === 'submenu' && this.submenu) {
                    return this.submenu.title.icon;
                }
                /* <DEPRECATED> */
                // alias to icon class if not otherwise defined
                return this.iconClass;
                /* </DEPRECATED> */
                /* <FUTURE>
                return undefined;
                </FUTURE> */
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MenuItem.prototype, "iconClass", {
            /**
             * The icon class for the menu item.
             */
            get: function () {
                if (this.type === 'command') {
                    return this._commands.iconClass(this.command, this.args);
                }
                if (this.type === 'submenu' && this.submenu) {
                    return this.submenu.title.iconClass;
                }
                return '';
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MenuItem.prototype, "iconLabel", {
            /**
             * The icon label for the menu item.
             */
            get: function () {
                if (this.type === 'command') {
                    return this._commands.iconLabel(this.command, this.args);
                }
                if (this.type === 'submenu' && this.submenu) {
                    return this.submenu.title.iconLabel;
                }
                return '';
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MenuItem.prototype, "caption", {
            /**
             * The display caption for the menu item.
             */
            get: function () {
                if (this.type === 'command') {
                    return this._commands.caption(this.command, this.args);
                }
                if (this.type === 'submenu' && this.submenu) {
                    return this.submenu.title.caption;
                }
                return '';
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MenuItem.prototype, "className", {
            /**
             * The extra class name for the menu item.
             */
            get: function () {
                if (this.type === 'command') {
                    return this._commands.className(this.command, this.args);
                }
                if (this.type === 'submenu' && this.submenu) {
                    return this.submenu.title.className;
                }
                return '';
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MenuItem.prototype, "dataset", {
            /**
             * The dataset for the menu item.
             */
            get: function () {
                if (this.type === 'command') {
                    return this._commands.dataset(this.command, this.args);
                }
                if (this.type === 'submenu' && this.submenu) {
                    return this.submenu.title.dataset;
                }
                return {};
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MenuItem.prototype, "isEnabled", {
            /**
             * Whether the menu item is enabled.
             */
            get: function () {
                if (this.type === 'command') {
                    return this._commands.isEnabled(this.command, this.args);
                }
                if (this.type === 'submenu') {
                    return this.submenu !== null;
                }
                return true;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MenuItem.prototype, "isToggled", {
            /**
             * Whether the menu item is toggled.
             */
            get: function () {
                if (this.type === 'command') {
                    return this._commands.isToggled(this.command, this.args);
                }
                return false;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MenuItem.prototype, "isVisible", {
            /**
             * Whether the menu item is visible.
             */
            get: function () {
                if (this.type === 'command') {
                    return this._commands.isVisible(this.command, this.args);
                }
                if (this.type === 'submenu') {
                    return this.submenu !== null;
                }
                return true;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MenuItem.prototype, "keyBinding", {
            /**
             * The key binding for the menu item.
             */
            get: function () {
                if (this.type === 'command') {
                    var _a = this, command_1 = _a.command, args_1 = _a.args;
                    return ArrayExt.findLastValue(this._commands.keyBindings, function (kb) {
                        return kb.command === command_1 && JSONExt.deepEqual(kb.args, args_1);
                    }) || null;
                }
                return null;
            },
            enumerable: true,
            configurable: true
        });
        return MenuItem;
    }());
})(Private$6 || (Private$6 = {}));

/**
 * An object which implements a universal context menu.
 *
 * #### Notes
 * The items shown in the context menu are determined by CSS selector
 * matching against the DOM hierarchy at the site of the mouse click.
 * This is similar in concept to how keyboard shortcuts are matched
 * in the command registry.
 */
var ContextMenu = /** @class */ (function () {
    /**
     * Construct a new context menu.
     *
     * @param options - The options for initializing the menu.
     */
    function ContextMenu(options) {
        this._idTick = 0;
        this._items = [];
        this.menu = new Menu(options);
    }
    /**
     * Add an item to the context menu.
     *
     * @param options - The options for creating the item.
     *
     * @returns A disposable which will remove the item from the menu.
     */
    ContextMenu.prototype.addItem = function (options) {
        var _this = this;
        // Create an item from the given options.
        var item = Private$7.createItem(options, this._idTick++);
        // Add the item to the internal array.
        this._items.push(item);
        // Return a disposable which will remove the item.
        return new DisposableDelegate(function () {
            ArrayExt.removeFirstOf(_this._items, item);
        });
    };
    /**
     * Open the context menu in response to a `'contextmenu'` event.
     *
     * @param event - The `'contextmenu'` event of interest.
     *
     * @returns `true` if the menu was opened, or `false` if no items
     *   matched the event and the menu was not opened.
     *
     * #### Notes
     * This method will populate the context menu with items which match
     * the propagation path of the event, then open the menu at the mouse
     * position indicated by the event.
     */
    ContextMenu.prototype.open = function (event) {
        var _this = this;
        // Clear the current contents of the context menu.
        this.menu.clearItems();
        // Bail early if there are no items to match.
        if (this._items.length === 0) {
            return false;
        }
        // Find the matching items for the event.
        var items = Private$7.matchItems(this._items, event);
        // Bail if there are no matching items.
        if (!items || items.length === 0) {
            return false;
        }
        // Add the filtered items to the menu.
        each(items, function (item) { _this.menu.addItem(item); });
        // Open the context menu at the current mouse position.
        this.menu.open(event.clientX, event.clientY);
        // Indicate success.
        return true;
    };
    return ContextMenu;
}());
/**
 * The namespace for the module implementation details.
 */
var Private$7;
(function (Private) {
    /**
     * Create a normalized context menu item from an options object.
     */
    function createItem(options, id) {
        var selector = validateSelector(options.selector);
        var rank = options.rank !== undefined ? options.rank : Infinity;
        return __assign(__assign({}, options), { selector: selector, rank: rank, id: id });
    }
    Private.createItem = createItem;
    /**
     * Find the items which match a context menu event.
     *
     * The results are sorted by DOM level, specificity, and rank.
     */
    function matchItems(items, event) {
        // Look up the target of the event.
        var target = event.target;
        // Bail if there is no target.
        if (!target) {
            return null;
        }
        // Look up the current target of the event.
        var currentTarget = event.currentTarget;
        // Bail if there is no current target.
        if (!currentTarget) {
            return null;
        }
        // There are some third party libraries that cause the `target` to
        // be detached from the DOM before lumino can process the event.
        // If that happens, search for a new target node by point. If that
        // node is still dangling, bail.
        if (!currentTarget.contains(target)) {
            target = document.elementFromPoint(event.clientX, event.clientY);
            if (!target || !currentTarget.contains(target)) {
                return null;
            }
        }
        // Set up the result array.
        var result = [];
        // Copy the items array to allow in-place modification.
        var availableItems = items.slice();
        // Walk up the DOM hierarchy searching for matches.
        while (target !== null) {
            // Set up the match array for this DOM level.
            var matches = [];
            // Search the remaining items for matches.
            for (var i = 0, n = availableItems.length; i < n; ++i) {
                // Fetch the item.
                var item = availableItems[i];
                // Skip items which are already consumed.
                if (!item) {
                    continue;
                }
                // Skip items which do not match the element.
                if (!Selector.matches(target, item.selector)) {
                    continue;
                }
                // Add the matched item to the result for this DOM level.
                matches.push(item);
                // Mark the item as consumed.
                availableItems[i] = null;
            }
            // Sort the matches for this level and add them to the results.
            if (matches.length !== 0) {
                matches.sort(itemCmp);
                result.push.apply(result, matches);
            }
            // Stop searching at the limits of the DOM range.
            if (target === currentTarget) {
                break;
            }
            // Step to the parent DOM level.
            target = target.parentElement;
        }
        // Return the matched and sorted results.
        return result;
    }
    Private.matchItems = matchItems;
    /**
     * Validate the selector for a menu item.
     *
     * This returns the validated selector, or throws if the selector is
     * invalid or contains commas.
     */
    function validateSelector(selector) {
        if (selector.indexOf(',') !== -1) {
            throw new Error("Selector cannot contain commas: " + selector);
        }
        if (!Selector.isValid(selector)) {
            throw new Error("Invalid selector: " + selector);
        }
        return selector;
    }
    /**
     * A sort comparison function for a context menu item.
     */
    function itemCmp(a, b) {
        // Sort first based on selector specificity.
        var s1 = Selector.calculateSpecificity(a.selector);
        var s2 = Selector.calculateSpecificity(b.selector);
        if (s1 !== s2) {
            return s2 - s1;
        }
        // If specificities are equal, sort based on rank.
        var r1 = a.rank;
        var r2 = b.rank;
        if (r1 !== r2) {
            return r1 < r2 ? -1 : 1; // Infinity-safe
        }
        // When all else fails, sort by item id.
        return a.id - b.id;
    }
})(Private$7 || (Private$7 = {}));

/**
 * A layout which provides a flexible docking arrangement.
 *
 * #### Notes
 * The consumer of this layout is responsible for handling all signals
 * from the generated tab bars and managing the visibility of widgets
 * and tab bars as needed.
 */
var DockLayout = /** @class */ (function (_super) {
    __extends(DockLayout, _super);
    /**
     * Construct a new dock layout.
     *
     * @param options - The options for initializing the layout.
     */
    function DockLayout(options) {
        var _this = _super.call(this) || this;
        _this._spacing = 4;
        _this._dirty = false;
        _this._root = null;
        _this._box = null;
        _this._items = new Map();
        _this.renderer = options.renderer;
        if (options.spacing !== undefined) {
            _this._spacing = Private$8.clampSpacing(options.spacing);
        }
        return _this;
    }
    /**
     * Dispose of the resources held by the layout.
     *
     * #### Notes
     * This will clear and dispose all widgets in the layout.
     */
    DockLayout.prototype.dispose = function () {
        // Get an iterator over the widgets in the layout.
        var widgets = this.iter();
        // Dispose of the layout items.
        this._items.forEach(function (item) { item.dispose(); });
        // Clear the layout state before disposing the widgets.
        this._box = null;
        this._root = null;
        this._items.clear();
        // Dispose of the widgets contained in the old layout root.
        each(widgets, function (widget) { widget.dispose(); });
        // Dispose of the base class.
        _super.prototype.dispose.call(this);
    };
    Object.defineProperty(DockLayout.prototype, "spacing", {
        /**
         * Get the inter-element spacing for the dock layout.
         */
        get: function () {
            return this._spacing;
        },
        /**
         * Set the inter-element spacing for the dock layout.
         */
        set: function (value) {
            value = Private$8.clampSpacing(value);
            if (this._spacing === value) {
                return;
            }
            this._spacing = value;
            if (!this.parent) {
                return;
            }
            this.parent.fit();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DockLayout.prototype, "isEmpty", {
        /**
         * Whether the dock layout is empty.
         */
        get: function () {
            return this._root === null;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Create an iterator over all widgets in the layout.
     *
     * @returns A new iterator over the widgets in the layout.
     *
     * #### Notes
     * This iterator includes the generated tab bars.
     */
    DockLayout.prototype.iter = function () {
        return this._root ? this._root.iterAllWidgets() : empty();
    };
    /**
     * Create an iterator over the user widgets in the layout.
     *
     * @returns A new iterator over the user widgets in the layout.
     *
     * #### Notes
     * This iterator does not include the generated tab bars.
     */
    DockLayout.prototype.widgets = function () {
        return this._root ? this._root.iterUserWidgets() : empty();
    };
    /**
     * Create an iterator over the selected widgets in the layout.
     *
     * @returns A new iterator over the selected user widgets.
     *
     * #### Notes
     * This iterator yields the widgets corresponding to the current tab
     * of each tab bar in the layout.
     */
    DockLayout.prototype.selectedWidgets = function () {
        return this._root ? this._root.iterSelectedWidgets() : empty();
    };
    /**
     * Create an iterator over the tab bars in the layout.
     *
     * @returns A new iterator over the tab bars in the layout.
     *
     * #### Notes
     * This iterator does not include the user widgets.
     */
    DockLayout.prototype.tabBars = function () {
        return this._root ? this._root.iterTabBars() : empty();
    };
    /**
     * Create an iterator over the handles in the layout.
     *
     * @returns A new iterator over the handles in the layout.
     */
    DockLayout.prototype.handles = function () {
        return this._root ? this._root.iterHandles() : empty();
    };
    /**
     * Move a handle to the given offset position.
     *
     * @param handle - The handle to move.
     *
     * @param offsetX - The desired offset X position of the handle.
     *
     * @param offsetY - The desired offset Y position of the handle.
     *
     * #### Notes
     * If the given handle is not contained in the layout, this is no-op.
     *
     * The handle will be moved as close as possible to the desired
     * position without violating any of the layout constraints.
     *
     * Only one of the coordinates is used depending on the orientation
     * of the handle. This method accepts both coordinates to make it
     * easy to invoke from a mouse move event without needing to know
     * the handle orientation.
     */
    DockLayout.prototype.moveHandle = function (handle, offsetX, offsetY) {
        // Bail early if there is no root or if the handle is hidden.
        var hidden = handle.classList.contains('lm-mod-hidden');
        /* <DEPRECATED> */
        hidden = hidden || handle.classList.contains('p-mod-hidden');
        /* </DEPRECATED> */
        if (!this._root || hidden) {
            return;
        }
        // Lookup the split node for the handle.
        var data = this._root.findSplitNode(handle);
        if (!data) {
            return;
        }
        // Compute the desired delta movement for the handle.
        var delta;
        if (data.node.orientation === 'horizontal') {
            delta = offsetX - handle.offsetLeft;
        }
        else {
            delta = offsetY - handle.offsetTop;
        }
        // Bail if there is no handle movement.
        if (delta === 0) {
            return;
        }
        // Prevent sibling resizing unless needed.
        data.node.holdSizes();
        // Adjust the sizers to reflect the handle movement.
        BoxEngine.adjust(data.node.sizers, data.index, delta);
        // Update the layout of the widgets.
        if (this.parent) {
            this.parent.update();
        }
    };
    /**
     * Save the current configuration of the dock layout.
     *
     * @returns A new config object for the current layout state.
     *
     * #### Notes
     * The return value can be provided to the `restoreLayout` method
     * in order to restore the layout to its current configuration.
     */
    DockLayout.prototype.saveLayout = function () {
        // Bail early if there is no root.
        if (!this._root) {
            return { main: null };
        }
        // Hold the current sizes in the layout tree.
        this._root.holdAllSizes();
        // Return the layout config.
        return { main: this._root.createConfig() };
    };
    /**
     * Restore the layout to a previously saved configuration.
     *
     * @param config - The layout configuration to restore.
     *
     * #### Notes
     * Widgets which currently belong to the layout but which are not
     * contained in the config will be unparented.
     */
    DockLayout.prototype.restoreLayout = function (config) {
        var _this = this;
        // Create the widget set for validating the config.
        var widgetSet = new Set();
        // Normalize the main area config and collect the widgets.
        var mainConfig;
        if (config.main) {
            mainConfig = Private$8.normalizeAreaConfig(config.main, widgetSet);
        }
        else {
            mainConfig = null;
        }
        // Create iterators over the old content.
        var oldWidgets = this.widgets();
        var oldTabBars = this.tabBars();
        var oldHandles = this.handles();
        // Clear the root before removing the old content.
        this._root = null;
        // Unparent the old widgets which are not in the new config.
        each(oldWidgets, function (widget) {
            if (!widgetSet.has(widget)) {
                widget.parent = null;
            }
        });
        // Dispose of the old tab bars.
        each(oldTabBars, function (tabBar) {
            tabBar.dispose();
        });
        // Remove the old handles.
        each(oldHandles, function (handle) {
            if (handle.parentNode) {
                handle.parentNode.removeChild(handle);
            }
        });
        // Reparent the new widgets to the current parent.
        widgetSet.forEach(function (widget) {
            widget.parent = _this.parent;
        });
        // Create the root node for the new config.
        if (mainConfig) {
            this._root = Private$8.realizeAreaConfig(mainConfig, {
                createTabBar: function () { return _this._createTabBar(); },
                createHandle: function () { return _this._createHandle(); }
            });
        }
        else {
            this._root = null;
        }
        // If there is no parent, there is nothing more to do.
        if (!this.parent) {
            return;
        }
        // Attach the new widgets to the parent.
        widgetSet.forEach(function (widget) {
            _this.attachWidget(widget);
        });
        // Post a fit request to the parent.
        this.parent.fit();
    };
    /**
     * Add a widget to the dock layout.
     *
     * @param widget - The widget to add to the dock layout.
     *
     * @param options - The additional options for adding the widget.
     *
     * #### Notes
     * The widget will be moved if it is already contained in the layout.
     *
     * An error will be thrown if the reference widget is invalid.
     */
    DockLayout.prototype.addWidget = function (widget, options) {
        if (options === void 0) { options = {}; }
        // Parse the options.
        var ref = options.ref || null;
        var mode = options.mode || 'tab-after';
        // Find the tab node which holds the reference widget.
        var refNode = null;
        if (this._root && ref) {
            refNode = this._root.findTabNode(ref);
        }
        // Throw an error if the reference widget is invalid.
        if (ref && !refNode) {
            throw new Error('Reference widget is not in the layout.');
        }
        // Reparent the widget to the current layout parent.
        widget.parent = this.parent;
        // Insert the widget according to the insert mode.
        switch (mode) {
            case 'tab-after':
                this._insertTab(widget, ref, refNode, true);
                break;
            case 'tab-before':
                this._insertTab(widget, ref, refNode, false);
                break;
            case 'split-top':
                this._insertSplit(widget, ref, refNode, 'vertical', false);
                break;
            case 'split-left':
                this._insertSplit(widget, ref, refNode, 'horizontal', false);
                break;
            case 'split-right':
                this._insertSplit(widget, ref, refNode, 'horizontal', true);
                break;
            case 'split-bottom':
                this._insertSplit(widget, ref, refNode, 'vertical', true);
                break;
        }
        // Do nothing else if there is no parent widget.
        if (!this.parent) {
            return;
        }
        // Ensure the widget is attached to the parent widget.
        this.attachWidget(widget);
        // Post a fit request for the parent widget.
        this.parent.fit();
    };
    /**
     * Remove a widget from the layout.
     *
     * @param widget - The widget to remove from the layout.
     *
     * #### Notes
     * A widget is automatically removed from the layout when its `parent`
     * is set to `null`. This method should only be invoked directly when
     * removing a widget from a layout which has yet to be installed on a
     * parent widget.
     *
     * This method does *not* modify the widget's `parent`.
     */
    DockLayout.prototype.removeWidget = function (widget) {
        // Remove the widget from its current layout location.
        this._removeWidget(widget);
        // Do nothing else if there is no parent widget.
        if (!this.parent) {
            return;
        }
        // Detach the widget from the parent widget.
        this.detachWidget(widget);
        // Post a fit request for the parent widget.
        this.parent.fit();
    };
    /**
     * Find the tab area which contains the given client position.
     *
     * @param clientX - The client X position of interest.
     *
     * @param clientY - The client Y position of interest.
     *
     * @returns The geometry of the tab area at the given position, or
     *   `null` if there is no tab area at the given position.
     */
    DockLayout.prototype.hitTestTabAreas = function (clientX, clientY) {
        // Bail early if hit testing cannot produce valid results.
        if (!this._root || !this.parent || !this.parent.isVisible) {
            return null;
        }
        // Ensure the parent box sizing data is computed.
        if (!this._box) {
            this._box = ElementExt.boxSizing(this.parent.node);
        }
        // Convert from client to local coordinates.
        var rect = this.parent.node.getBoundingClientRect();
        var x = clientX - rect.left - this._box.borderLeft;
        var y = clientY - rect.top - this._box.borderTop;
        // Find the tab layout node at the local position.
        var tabNode = this._root.hitTestTabNodes(x, y);
        // Bail if a tab layout node was not found.
        if (!tabNode) {
            return null;
        }
        // Extract the data from the tab node.
        var tabBar = tabNode.tabBar, top = tabNode.top, left = tabNode.left, width = tabNode.width, height = tabNode.height;
        // Compute the right and bottom edges of the tab area.
        var borderWidth = this._box.borderLeft + this._box.borderRight;
        var borderHeight = this._box.borderTop + this._box.borderBottom;
        var right = rect.width - borderWidth - (left + width);
        var bottom = rect.height - borderHeight - (top + height);
        // Return the hit test results.
        return { tabBar: tabBar, x: x, y: y, top: top, left: left, right: right, bottom: bottom, width: width, height: height };
    };
    /**
     * Perform layout initialization which requires the parent widget.
     */
    DockLayout.prototype.init = function () {
        var _this = this;
        // Perform superclass initialization.
        _super.prototype.init.call(this);
        // Attach each widget to the parent.
        each(this, function (widget) { _this.attachWidget(widget); });
        // Attach each handle to the parent.
        each(this.handles(), function (handle) { _this.parent.node.appendChild(handle); });
        // Post a fit request for the parent widget.
        this.parent.fit();
    };
    /**
     * Attach the widget to the layout parent widget.
     *
     * @param widget - The widget to attach to the parent.
     *
     * #### Notes
     * This is a no-op if the widget is already attached.
     */
    DockLayout.prototype.attachWidget = function (widget) {
        // Do nothing if the widget is already attached.
        if (this.parent.node === widget.node.parentNode) {
            return;
        }
        // Create the layout item for the widget.
        this._items.set(widget, new LayoutItem(widget));
        // Send a `'before-attach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
        }
        // Add the widget's node to the parent.
        this.parent.node.appendChild(widget.node);
        // Send an `'after-attach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
        }
    };
    /**
     * Detach the widget from the layout parent widget.
     *
     * @param widget - The widget to detach from the parent.
     *
     * #### Notes
     * This is a no-op if the widget is not attached.
     */
    DockLayout.prototype.detachWidget = function (widget) {
        // Do nothing if the widget is not attached.
        if (this.parent.node !== widget.node.parentNode) {
            return;
        }
        // Send a `'before-detach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
        }
        // Remove the widget's node from the parent.
        this.parent.node.removeChild(widget.node);
        // Send an `'after-detach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
        }
        // Delete the layout item for the widget.
        var item = this._items.get(widget);
        if (item) {
            this._items.delete(widget);
            item.dispose();
        }
    };
    /**
     * A message handler invoked on a `'before-show'` message.
     */
    DockLayout.prototype.onBeforeShow = function (msg) {
        _super.prototype.onBeforeShow.call(this, msg);
        this.parent.update();
    };
    /**
     * A message handler invoked on a `'before-attach'` message.
     */
    DockLayout.prototype.onBeforeAttach = function (msg) {
        _super.prototype.onBeforeAttach.call(this, msg);
        this.parent.fit();
    };
    /**
     * A message handler invoked on a `'child-shown'` message.
     */
    DockLayout.prototype.onChildShown = function (msg) {
        this.parent.fit();
    };
    /**
     * A message handler invoked on a `'child-hidden'` message.
     */
    DockLayout.prototype.onChildHidden = function (msg) {
        this.parent.fit();
    };
    /**
     * A message handler invoked on a `'resize'` message.
     */
    DockLayout.prototype.onResize = function (msg) {
        if (this.parent.isVisible) {
            this._update(msg.width, msg.height);
        }
    };
    /**
     * A message handler invoked on an `'update-request'` message.
     */
    DockLayout.prototype.onUpdateRequest = function (msg) {
        if (this.parent.isVisible) {
            this._update(-1, -1);
        }
    };
    /**
     * A message handler invoked on a `'fit-request'` message.
     */
    DockLayout.prototype.onFitRequest = function (msg) {
        if (this.parent.isAttached) {
            this._fit();
        }
    };
    /**
     * Remove the specified widget from the layout structure.
     *
     * #### Notes
     * This is a no-op if the widget is not in the layout tree.
     *
     * This does not detach the widget from the parent node.
     */
    DockLayout.prototype._removeWidget = function (widget) {
        // Bail early if there is no layout root.
        if (!this._root) {
            return;
        }
        // Find the tab node which contains the given widget.
        var tabNode = this._root.findTabNode(widget);
        // Bail early if the tab node is not found.
        if (!tabNode) {
            return;
        }
        // If there are multiple tabs, just remove the widget's tab.
        if (tabNode.tabBar.titles.length > 1) {
            tabNode.tabBar.removeTab(widget.title);
            return;
        }
        // Otherwise, the tab node needs to be removed...
        // Dispose the tab bar.
        tabNode.tabBar.dispose();
        // Handle the case where the tab node is the root.
        if (this._root === tabNode) {
            this._root = null;
            return;
        }
        // Otherwise, remove the tab node from its parent...
        // Prevent widget resizing unless needed.
        this._root.holdAllSizes();
        // Clear the parent reference on the tab node.
        var splitNode = tabNode.parent;
        tabNode.parent = null;
        // Remove the tab node from its parent split node.
        var i = ArrayExt.removeFirstOf(splitNode.children, tabNode);
        var handle = ArrayExt.removeAt(splitNode.handles, i);
        ArrayExt.removeAt(splitNode.sizers, i);
        // Remove the handle from its parent DOM node.
        if (handle.parentNode) {
            handle.parentNode.removeChild(handle);
        }
        // If there are multiple children, just update the handles.
        if (splitNode.children.length > 1) {
            splitNode.syncHandles();
            return;
        }
        // Otherwise, the split node also needs to be removed...
        // Clear the parent reference on the split node.
        var maybeParent = splitNode.parent;
        splitNode.parent = null;
        // Lookup the remaining child node and handle.
        var childNode = splitNode.children[0];
        var childHandle = splitNode.handles[0];
        // Clear the split node data.
        splitNode.children.length = 0;
        splitNode.handles.length = 0;
        splitNode.sizers.length = 0;
        // Remove the child handle from its parent node.
        if (childHandle.parentNode) {
            childHandle.parentNode.removeChild(childHandle);
        }
        // Handle the case where the split node is the root.
        if (this._root === splitNode) {
            childNode.parent = null;
            this._root = childNode;
            return;
        }
        // Otherwise, move the child node to the parent node...
        var parentNode = maybeParent;
        // Lookup the index of the split node.
        var j = parentNode.children.indexOf(splitNode);
        // Handle the case where the child node is a tab node.
        if (childNode instanceof Private$8.TabLayoutNode) {
            childNode.parent = parentNode;
            parentNode.children[j] = childNode;
            return;
        }
        // Remove the split data from the parent.
        var splitHandle = ArrayExt.removeAt(parentNode.handles, j);
        ArrayExt.removeAt(parentNode.children, j);
        ArrayExt.removeAt(parentNode.sizers, j);
        // Remove the handle from its parent node.
        if (splitHandle.parentNode) {
            splitHandle.parentNode.removeChild(splitHandle);
        }
        // The child node and the split parent node will have the same
        // orientation. Merge the grand-children with the parent node.
        for (var i_1 = 0, n = childNode.children.length; i_1 < n; ++i_1) {
            var gChild = childNode.children[i_1];
            var gHandle = childNode.handles[i_1];
            var gSizer = childNode.sizers[i_1];
            ArrayExt.insert(parentNode.children, j + i_1, gChild);
            ArrayExt.insert(parentNode.handles, j + i_1, gHandle);
            ArrayExt.insert(parentNode.sizers, j + i_1, gSizer);
            gChild.parent = parentNode;
        }
        // Clear the child node.
        childNode.children.length = 0;
        childNode.handles.length = 0;
        childNode.sizers.length = 0;
        childNode.parent = null;
        // Sync the handles on the parent node.
        parentNode.syncHandles();
    };
    /**
     * Insert a widget next to an existing tab.
     *
     * #### Notes
     * This does not attach the widget to the parent widget.
     */
    DockLayout.prototype._insertTab = function (widget, ref, refNode, after) {
        // Do nothing if the tab is inserted next to itself.
        if (widget === ref) {
            return;
        }
        // Create the root if it does not exist.
        if (!this._root) {
            var tabNode = new Private$8.TabLayoutNode(this._createTabBar());
            tabNode.tabBar.addTab(widget.title);
            this._root = tabNode;
            return;
        }
        // Use the first tab node as the ref node if needed.
        if (!refNode) {
            refNode = this._root.findFirstTabNode();
        }
        // If the widget is not contained in the ref node, ensure it is
        // removed from the layout and hidden before being added again.
        if (refNode.tabBar.titles.indexOf(widget.title) === -1) {
            this._removeWidget(widget);
            widget.hide();
        }
        // Lookup the target index for inserting the tab.
        var index;
        if (ref) {
            index = refNode.tabBar.titles.indexOf(ref.title);
        }
        else {
            index = refNode.tabBar.currentIndex;
        }
        // Insert the widget's tab relative to the target index.
        refNode.tabBar.insertTab(index + (after ? 1 : 0), widget.title);
    };
    /**
     * Insert a widget as a new split area.
     *
     * #### Notes
     * This does not attach the widget to the parent widget.
     */
    DockLayout.prototype._insertSplit = function (widget, ref, refNode, orientation, after) {
        // Do nothing if there is no effective split.
        if (widget === ref && refNode && refNode.tabBar.titles.length === 1) {
            return;
        }
        // Ensure the widget is removed from the current layout.
        this._removeWidget(widget);
        // Create the tab layout node to hold the widget.
        var tabNode = new Private$8.TabLayoutNode(this._createTabBar());
        tabNode.tabBar.addTab(widget.title);
        // Set the root if it does not exist.
        if (!this._root) {
            this._root = tabNode;
            return;
        }
        // If the ref node parent is null, split the root.
        if (!refNode || !refNode.parent) {
            // Ensure the root is split with the correct orientation.
            var root = this._splitRoot(orientation);
            // Determine the insert index for the new tab node.
            var i_2 = after ? root.children.length : 0;
            // Normalize the split node.
            root.normalizeSizes();
            // Create the sizer for new tab node.
            var sizer = Private$8.createSizer(refNode ? 1 : Private$8.GOLDEN_RATIO);
            // Insert the tab node sized to the golden ratio.
            ArrayExt.insert(root.children, i_2, tabNode);
            ArrayExt.insert(root.sizers, i_2, sizer);
            ArrayExt.insert(root.handles, i_2, this._createHandle());
            tabNode.parent = root;
            // Re-normalize the split node to maintain the ratios.
            root.normalizeSizes();
            // Finally, synchronize the visibility of the handles.
            root.syncHandles();
            return;
        }
        // Lookup the split node for the ref widget.
        var splitNode = refNode.parent;
        // If the split node already had the correct orientation,
        // the widget can be inserted into the split node directly.
        if (splitNode.orientation === orientation) {
            // Find the index of the ref node.
            var i_3 = splitNode.children.indexOf(refNode);
            // Normalize the split node.
            splitNode.normalizeSizes();
            // Consume half the space for the insert location.
            var s = splitNode.sizers[i_3].sizeHint /= 2;
            // Insert the tab node sized to the other half.
            var j_1 = i_3 + (after ? 1 : 0);
            ArrayExt.insert(splitNode.children, j_1, tabNode);
            ArrayExt.insert(splitNode.sizers, j_1, Private$8.createSizer(s));
            ArrayExt.insert(splitNode.handles, j_1, this._createHandle());
            tabNode.parent = splitNode;
            // Finally, synchronize the visibility of the handles.
            splitNode.syncHandles();
            return;
        }
        // Remove the ref node from the split node.
        var i = ArrayExt.removeFirstOf(splitNode.children, refNode);
        // Create a new normalized split node for the children.
        var childNode = new Private$8.SplitLayoutNode(orientation);
        childNode.normalized = true;
        // Add the ref node sized to half the space.
        childNode.children.push(refNode);
        childNode.sizers.push(Private$8.createSizer(0.5));
        childNode.handles.push(this._createHandle());
        refNode.parent = childNode;
        // Add the tab node sized to the other half.
        var j = after ? 1 : 0;
        ArrayExt.insert(childNode.children, j, tabNode);
        ArrayExt.insert(childNode.sizers, j, Private$8.createSizer(0.5));
        ArrayExt.insert(childNode.handles, j, this._createHandle());
        tabNode.parent = childNode;
        // Synchronize the visibility of the handles.
        childNode.syncHandles();
        // Finally, add the new child node to the original split node.
        ArrayExt.insert(splitNode.children, i, childNode);
        childNode.parent = splitNode;
    };
    /**
     * Ensure the root is a split node with the given orientation.
     */
    DockLayout.prototype._splitRoot = function (orientation) {
        // Bail early if the root already meets the requirements.
        var oldRoot = this._root;
        if (oldRoot instanceof Private$8.SplitLayoutNode) {
            if (oldRoot.orientation === orientation) {
                return oldRoot;
            }
        }
        // Create a new root node with the specified orientation.
        var newRoot = this._root = new Private$8.SplitLayoutNode(orientation);
        // Add the old root to the new root.
        if (oldRoot) {
            newRoot.children.push(oldRoot);
            newRoot.sizers.push(Private$8.createSizer(0));
            newRoot.handles.push(this._createHandle());
            oldRoot.parent = newRoot;
        }
        // Return the new root as a convenience.
        return newRoot;
    };
    /**
     * Fit the layout to the total size required by the widgets.
     */
    DockLayout.prototype._fit = function () {
        // Set up the computed minimum size.
        var minW = 0;
        var minH = 0;
        // Update the size limits for the layout tree.
        if (this._root) {
            var limits = this._root.fit(this._spacing, this._items);
            minW = limits.minWidth;
            minH = limits.minHeight;
        }
        // Update the box sizing and add it to the computed min size.
        var box = this._box = ElementExt.boxSizing(this.parent.node);
        minW += box.horizontalSum;
        minH += box.verticalSum;
        // Update the parent's min size constraints.
        var style = this.parent.node.style;
        style.minWidth = minW + "px";
        style.minHeight = minH + "px";
        // Set the dirty flag to ensure only a single update occurs.
        this._dirty = true;
        // Notify the ancestor that it should fit immediately. This may
        // cause a resize of the parent, fulfilling the required update.
        if (this.parent.parent) {
            MessageLoop.sendMessage(this.parent.parent, Widget.Msg.FitRequest);
        }
        // If the dirty flag is still set, the parent was not resized.
        // Trigger the required update on the parent widget immediately.
        if (this._dirty) {
            MessageLoop.sendMessage(this.parent, Widget.Msg.UpdateRequest);
        }
    };
    /**
     * Update the layout position and size of the widgets.
     *
     * The parent offset dimensions should be `-1` if unknown.
     */
    DockLayout.prototype._update = function (offsetWidth, offsetHeight) {
        // Clear the dirty flag to indicate the update occurred.
        this._dirty = false;
        // Bail early if there is no root layout node.
        if (!this._root) {
            return;
        }
        // Measure the parent if the offset dimensions are unknown.
        if (offsetWidth < 0) {
            offsetWidth = this.parent.node.offsetWidth;
        }
        if (offsetHeight < 0) {
            offsetHeight = this.parent.node.offsetHeight;
        }
        // Ensure the parent box sizing data is computed.
        if (!this._box) {
            this._box = ElementExt.boxSizing(this.parent.node);
        }
        // Compute the actual layout bounds adjusted for border and padding.
        var x = this._box.paddingTop;
        var y = this._box.paddingLeft;
        var width = offsetWidth - this._box.horizontalSum;
        var height = offsetHeight - this._box.verticalSum;
        // Update the geometry of the layout tree.
        this._root.update(x, y, width, height, this._spacing, this._items);
    };
    /**
     * Create a new tab bar for use by the dock layout.
     *
     * #### Notes
     * The tab bar will be attached to the parent if it exists.
     */
    DockLayout.prototype._createTabBar = function () {
        // Create the tab bar using the renderer.
        var tabBar = this.renderer.createTabBar();
        // Enforce necessary tab bar behavior.
        tabBar.orientation = 'horizontal';
        // Reparent and attach the tab bar to the parent if possible.
        if (this.parent) {
            tabBar.parent = this.parent;
            this.attachWidget(tabBar);
        }
        // Return the initialized tab bar.
        return tabBar;
    };
    /**
     * Create a new handle for the dock layout.
     *
     * #### Notes
     * The handle will be attached to the parent if it exists.
     */
    DockLayout.prototype._createHandle = function () {
        // Create the handle using the renderer.
        var handle = this.renderer.createHandle();
        // Initialize the handle layout behavior.
        var style = handle.style;
        style.position = 'absolute';
        style.top = '0';
        style.left = '0';
        style.width = '0';
        style.height = '0';
        // Attach the handle to the parent if it exists.
        if (this.parent) {
            this.parent.node.appendChild(handle);
        }
        // Return the initialized handle.
        return handle;
    };
    return DockLayout;
}(Layout));
/**
 * The namespace for the module implementation details.
 */
var Private$8;
(function (Private) {
    /**
     * A fraction used for sizing root panels; ~= `1 / golden_ratio`.
     */
    Private.GOLDEN_RATIO = 0.618;
    /**
     * Clamp a spacing value to an integer >= 0.
     */
    function clampSpacing(value) {
        return Math.max(0, Math.floor(value));
    }
    Private.clampSpacing = clampSpacing;
    /**
     * Create a box sizer with an initial size hint.
     */
    function createSizer(hint) {
        var sizer = new BoxSizer();
        sizer.sizeHint = hint;
        sizer.size = hint;
        return sizer;
    }
    Private.createSizer = createSizer;
    /**
     * Normalize an area config object and collect the visited widgets.
     */
    function normalizeAreaConfig(config, widgetSet) {
        var result;
        if (config.type === 'tab-area') {
            result = normalizeTabAreaConfig(config, widgetSet);
        }
        else {
            result = normalizeSplitAreaConfig(config, widgetSet);
        }
        return result;
    }
    Private.normalizeAreaConfig = normalizeAreaConfig;
    /**
     * Convert a normalized area config into a layout tree.
     */
    function realizeAreaConfig(config, renderer) {
        var node;
        if (config.type === 'tab-area') {
            node = realizeTabAreaConfig(config, renderer);
        }
        else {
            node = realizeSplitAreaConfig(config, renderer);
        }
        return node;
    }
    Private.realizeAreaConfig = realizeAreaConfig;
    /**
     * A layout node which holds the data for a tabbed area.
     */
    var TabLayoutNode = /** @class */ (function () {
        /**
         * Construct a new tab layout node.
         *
         * @param tabBar - The tab bar to use for the layout node.
         */
        function TabLayoutNode(tabBar) {
            /**
             * The parent of the layout node.
             */
            this.parent = null;
            this._top = 0;
            this._left = 0;
            this._width = 0;
            this._height = 0;
            var tabSizer = new BoxSizer();
            var widgetSizer = new BoxSizer();
            tabSizer.stretch = 0;
            widgetSizer.stretch = 1;
            this.tabBar = tabBar;
            this.sizers = [tabSizer, widgetSizer];
        }
        Object.defineProperty(TabLayoutNode.prototype, "top", {
            /**
             * The most recent value for the `top` edge of the layout box.
             */
            get: function () {
                return this._top;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TabLayoutNode.prototype, "left", {
            /**
             * The most recent value for the `left` edge of the layout box.
             */
            get: function () {
                return this._left;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TabLayoutNode.prototype, "width", {
            /**
             * The most recent value for the `width` of the layout box.
             */
            get: function () {
                return this._width;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TabLayoutNode.prototype, "height", {
            /**
             * The most recent value for the `height` of the layout box.
             */
            get: function () {
                return this._height;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Create an iterator for all widgets in the layout tree.
         */
        TabLayoutNode.prototype.iterAllWidgets = function () {
            return chain(once(this.tabBar), this.iterUserWidgets());
        };
        /**
         * Create an iterator for the user widgets in the layout tree.
         */
        TabLayoutNode.prototype.iterUserWidgets = function () {
            return map(this.tabBar.titles, function (title) { return title.owner; });
        };
        /**
         * Create an iterator for the selected widgets in the layout tree.
         */
        TabLayoutNode.prototype.iterSelectedWidgets = function () {
            var title = this.tabBar.currentTitle;
            return title ? once(title.owner) : empty();
        };
        /**
         * Create an iterator for the tab bars in the layout tree.
         */
        TabLayoutNode.prototype.iterTabBars = function () {
            return once(this.tabBar);
        };
        /**
         * Create an iterator for the handles in the layout tree.
         */
        TabLayoutNode.prototype.iterHandles = function () {
            return empty();
        };
        /**
         * Find the tab layout node which contains the given widget.
         */
        TabLayoutNode.prototype.findTabNode = function (widget) {
            return this.tabBar.titles.indexOf(widget.title) !== -1 ? this : null;
        };
        /**
         * Find the split layout node which contains the given handle.
         */
        TabLayoutNode.prototype.findSplitNode = function (handle) {
            return null;
        };
        /**
         * Find the first tab layout node in a layout tree.
         */
        TabLayoutNode.prototype.findFirstTabNode = function () {
            return this;
        };
        /**
         * Find the tab layout node which contains the local point.
         */
        TabLayoutNode.prototype.hitTestTabNodes = function (x, y) {
            if (x < this._left || x >= this._left + this._width) {
                return null;
            }
            if (y < this._top || y >= this._top + this._height) {
                return null;
            }
            return this;
        };
        /**
         * Create a configuration object for the layout tree.
         */
        TabLayoutNode.prototype.createConfig = function () {
            var widgets = this.tabBar.titles.map(function (title) { return title.owner; });
            var currentIndex = this.tabBar.currentIndex;
            return { type: 'tab-area', widgets: widgets, currentIndex: currentIndex };
        };
        /**
         * Recursively hold all of the sizes in the layout tree.
         *
         * This ignores the sizers of tab layout nodes.
         */
        TabLayoutNode.prototype.holdAllSizes = function () {
            return;
        };
        /**
         * Fit the layout tree.
         */
        TabLayoutNode.prototype.fit = function (spacing, items) {
            // Set up the limit variables.
            var minWidth = 0;
            var minHeight = 0;
            var maxWidth = Infinity;
            var maxHeight = Infinity;
            // Lookup the tab bar layout item.
            var tabBarItem = items.get(this.tabBar);
            // Lookup the widget layout item.
            var current = this.tabBar.currentTitle;
            var widgetItem = current ? items.get(current.owner) : undefined;
            // Lookup the tab bar and widget sizers.
            var _a = this.sizers, tabBarSizer = _a[0], widgetSizer = _a[1];
            // Update the tab bar limits.
            if (tabBarItem) {
                tabBarItem.fit();
            }
            // Update the widget limits.
            if (widgetItem) {
                widgetItem.fit();
            }
            // Update the results and sizer for the tab bar.
            if (tabBarItem && !tabBarItem.isHidden) {
                minWidth = Math.max(minWidth, tabBarItem.minWidth);
                minHeight += tabBarItem.minHeight;
                tabBarSizer.minSize = tabBarItem.minHeight;
                tabBarSizer.maxSize = tabBarItem.maxHeight;
            }
            else {
                tabBarSizer.minSize = 0;
                tabBarSizer.maxSize = 0;
            }
            // Update the results and sizer for the current widget.
            if (widgetItem && !widgetItem.isHidden) {
                minWidth = Math.max(minWidth, widgetItem.minWidth);
                minHeight += widgetItem.minHeight;
                widgetSizer.minSize = widgetItem.minHeight;
                widgetSizer.maxSize = Infinity;
            }
            else {
                widgetSizer.minSize = 0;
                widgetSizer.maxSize = Infinity;
            }
            // Return the computed size limits for the layout node.
            return { minWidth: minWidth, minHeight: minHeight, maxWidth: maxWidth, maxHeight: maxHeight };
        };
        /**
         * Update the layout tree.
         */
        TabLayoutNode.prototype.update = function (left, top, width, height, spacing, items) {
            // Update the layout box values.
            this._top = top;
            this._left = left;
            this._width = width;
            this._height = height;
            // Lookup the tab bar layout item.
            var tabBarItem = items.get(this.tabBar);
            // Lookup the widget layout item.
            var current = this.tabBar.currentTitle;
            var widgetItem = current ? items.get(current.owner) : undefined;
            // Distribute the layout space to the sizers.
            BoxEngine.calc(this.sizers, height);
            // Update the tab bar item using the computed size.
            if (tabBarItem && !tabBarItem.isHidden) {
                var size = this.sizers[0].size;
                tabBarItem.update(left, top, width, size);
                top += size;
            }
            // Layout the widget using the computed size.
            if (widgetItem && !widgetItem.isHidden) {
                var size = this.sizers[1].size;
                widgetItem.update(left, top, width, size);
            }
        };
        return TabLayoutNode;
    }());
    Private.TabLayoutNode = TabLayoutNode;
    /**
     * A layout node which holds the data for a split area.
     */
    var SplitLayoutNode = /** @class */ (function () {
        /**
         * Construct a new split layout node.
         *
         * @param orientation - The orientation of the node.
         */
        function SplitLayoutNode(orientation) {
            /**
             * The parent of the layout node.
             */
            this.parent = null;
            /**
             * Whether the sizers have been normalized.
             */
            this.normalized = false;
            /**
             * The child nodes for the split node.
             */
            this.children = [];
            /**
             * The box sizers for the layout children.
             */
            this.sizers = [];
            /**
             * The handles for the layout children.
             */
            this.handles = [];
            this.orientation = orientation;
        }
        /**
         * Create an iterator for all widgets in the layout tree.
         */
        SplitLayoutNode.prototype.iterAllWidgets = function () {
            var children = map(this.children, function (child) { return child.iterAllWidgets(); });
            return new ChainIterator(children);
        };
        /**
         * Create an iterator for the user widgets in the layout tree.
         */
        SplitLayoutNode.prototype.iterUserWidgets = function () {
            var children = map(this.children, function (child) { return child.iterUserWidgets(); });
            return new ChainIterator(children);
        };
        /**
         * Create an iterator for the selected widgets in the layout tree.
         */
        SplitLayoutNode.prototype.iterSelectedWidgets = function () {
            var children = map(this.children, function (child) { return child.iterSelectedWidgets(); });
            return new ChainIterator(children);
        };
        /**
         * Create an iterator for the tab bars in the layout tree.
         */
        SplitLayoutNode.prototype.iterTabBars = function () {
            var children = map(this.children, function (child) { return child.iterTabBars(); });
            return new ChainIterator(children);
        };
        /**
         * Create an iterator for the handles in the layout tree.
         */
        SplitLayoutNode.prototype.iterHandles = function () {
            var children = map(this.children, function (child) { return child.iterHandles(); });
            return chain(this.handles, new ChainIterator(children));
        };
        /**
         * Find the tab layout node which contains the given widget.
         */
        SplitLayoutNode.prototype.findTabNode = function (widget) {
            for (var i = 0, n = this.children.length; i < n; ++i) {
                var result = this.children[i].findTabNode(widget);
                if (result) {
                    return result;
                }
            }
            return null;
        };
        /**
         * Find the split layout node which contains the given handle.
         */
        SplitLayoutNode.prototype.findSplitNode = function (handle) {
            var index = this.handles.indexOf(handle);
            if (index !== -1) {
                return { index: index, node: this };
            }
            for (var i = 0, n = this.children.length; i < n; ++i) {
                var result = this.children[i].findSplitNode(handle);
                if (result) {
                    return result;
                }
            }
            return null;
        };
        /**
         * Find the first tab layout node in a layout tree.
         */
        SplitLayoutNode.prototype.findFirstTabNode = function () {
            if (this.children.length === 0) {
                return null;
            }
            return this.children[0].findFirstTabNode();
        };
        /**
         * Find the tab layout node which contains the local point.
         */
        SplitLayoutNode.prototype.hitTestTabNodes = function (x, y) {
            for (var i = 0, n = this.children.length; i < n; ++i) {
                var result = this.children[i].hitTestTabNodes(x, y);
                if (result) {
                    return result;
                }
            }
            return null;
        };
        /**
         * Create a configuration object for the layout tree.
         */
        SplitLayoutNode.prototype.createConfig = function () {
            var orientation = this.orientation;
            var sizes = this.createNormalizedSizes();
            var children = this.children.map(function (child) { return child.createConfig(); });
            return { type: 'split-area', orientation: orientation, children: children, sizes: sizes };
        };
        /**
         * Sync the visibility and orientation of the handles.
         */
        SplitLayoutNode.prototype.syncHandles = function () {
            var _this = this;
            each(this.handles, function (handle, i) {
                handle.setAttribute('data-orientation', _this.orientation);
                if (i === _this.handles.length - 1) {
                    handle.classList.add('lm-mod-hidden');
                    /* <DEPRECATED> */
                    handle.classList.add('p-mod-hidden');
                    /* </DEPRECATED> */
                }
                else {
                    handle.classList.remove('lm-mod-hidden');
                    /* <DEPRECATED> */
                    handle.classList.remove('p-mod-hidden');
                    /* </DEPRECATED> */
                }
            });
        };
        /**
         * Hold the current sizes of the box sizers.
         *
         * This sets the size hint of each sizer to its current size.
         */
        SplitLayoutNode.prototype.holdSizes = function () {
            each(this.sizers, function (sizer) { sizer.sizeHint = sizer.size; });
        };
        /**
         * Recursively hold all of the sizes in the layout tree.
         *
         * This ignores the sizers of tab layout nodes.
         */
        SplitLayoutNode.prototype.holdAllSizes = function () {
            each(this.children, function (child) { return child.holdAllSizes(); });
            this.holdSizes();
        };
        /**
         * Normalize the sizes of the split layout node.
         */
        SplitLayoutNode.prototype.normalizeSizes = function () {
            // Bail early if the sizers are empty.
            var n = this.sizers.length;
            if (n === 0) {
                return;
            }
            // Hold the current sizes of the sizers.
            this.holdSizes();
            // Compute the sum of the sizes.
            var sum = reduce(this.sizers, function (v, sizer) { return v + sizer.sizeHint; }, 0);
            // Normalize the sizes based on the sum.
            if (sum === 0) {
                each(this.sizers, function (sizer) {
                    sizer.size = sizer.sizeHint = 1 / n;
                });
            }
            else {
                each(this.sizers, function (sizer) {
                    sizer.size = sizer.sizeHint /= sum;
                });
            }
            // Mark the sizes as normalized.
            this.normalized = true;
        };
        /**
         * Snap the normalized sizes of the split layout node.
         */
        SplitLayoutNode.prototype.createNormalizedSizes = function () {
            // Bail early if the sizers are empty.
            var n = this.sizers.length;
            if (n === 0) {
                return [];
            }
            // Grab the current sizes of the sizers.
            var sizes = this.sizers.map(function (sizer) { return sizer.size; });
            // Compute the sum of the sizes.
            var sum = reduce(sizes, function (v, size) { return v + size; }, 0);
            // Normalize the sizes based on the sum.
            if (sum === 0) {
                each(sizes, function (size, i) { sizes[i] = 1 / n; });
            }
            else {
                each(sizes, function (size, i) { sizes[i] = size / sum; });
            }
            // Return the normalized sizes.
            return sizes;
        };
        /**
         * Fit the layout tree.
         */
        SplitLayoutNode.prototype.fit = function (spacing, items) {
            // Compute the required fixed space.
            var horizontal = this.orientation === 'horizontal';
            var fixed = Math.max(0, this.children.length - 1) * spacing;
            // Set up the limit variables.
            var minWidth = horizontal ? fixed : 0;
            var minHeight = horizontal ? 0 : fixed;
            var maxWidth = Infinity;
            var maxHeight = Infinity;
            // Fit the children and update the limits.
            for (var i = 0, n = this.children.length; i < n; ++i) {
                var limits = this.children[i].fit(spacing, items);
                if (horizontal) {
                    minHeight = Math.max(minHeight, limits.minHeight);
                    minWidth += limits.minWidth;
                    this.sizers[i].minSize = limits.minWidth;
                }
                else {
                    minWidth = Math.max(minWidth, limits.minWidth);
                    minHeight += limits.minHeight;
                    this.sizers[i].minSize = limits.minHeight;
                }
            }
            // Return the computed limits for the layout node.
            return { minWidth: minWidth, minHeight: minHeight, maxWidth: maxWidth, maxHeight: maxHeight };
        };
        /**
         * Update the layout tree.
         */
        SplitLayoutNode.prototype.update = function (left, top, width, height, spacing, items) {
            // Compute the available layout space.
            var horizontal = this.orientation === 'horizontal';
            var fixed = Math.max(0, this.children.length - 1) * spacing;
            var space = Math.max(0, (horizontal ? width : height) - fixed);
            // De-normalize the sizes if needed.
            if (this.normalized) {
                each(this.sizers, function (sizer) { sizer.sizeHint *= space; });
                this.normalized = false;
            }
            // Distribute the layout space to the sizers.
            BoxEngine.calc(this.sizers, space);
            // Update the geometry of the child nodes and handles.
            for (var i = 0, n = this.children.length; i < n; ++i) {
                var child = this.children[i];
                var size = this.sizers[i].size;
                var handleStyle = this.handles[i].style;
                if (horizontal) {
                    child.update(left, top, size, height, spacing, items);
                    left += size;
                    handleStyle.top = top + "px";
                    handleStyle.left = left + "px";
                    handleStyle.width = spacing + "px";
                    handleStyle.height = height + "px";
                    left += spacing;
                }
                else {
                    child.update(left, top, width, size, spacing, items);
                    top += size;
                    handleStyle.top = top + "px";
                    handleStyle.left = left + "px";
                    handleStyle.width = width + "px";
                    handleStyle.height = spacing + "px";
                    top += spacing;
                }
            }
        };
        return SplitLayoutNode;
    }());
    Private.SplitLayoutNode = SplitLayoutNode;
    /**
     * Normalize a tab area config and collect the visited widgets.
     */
    function normalizeTabAreaConfig(config, widgetSet) {
        // Bail early if there is no content.
        if (config.widgets.length === 0) {
            return null;
        }
        // Setup the filtered widgets array.
        var widgets = [];
        // Filter the config for unique widgets.
        each(config.widgets, function (widget) {
            if (!widgetSet.has(widget)) {
                widgetSet.add(widget);
                widgets.push(widget);
            }
        });
        // Bail if there are no effective widgets.
        if (widgets.length === 0) {
            return null;
        }
        // Normalize the current index.
        var index = config.currentIndex;
        if (index !== -1 && (index < 0 || index >= widgets.length)) {
            index = 0;
        }
        // Return a normalized config object.
        return { type: 'tab-area', widgets: widgets, currentIndex: index };
    }
    /**
     * Normalize a split area config and collect the visited widgets.
     */
    function normalizeSplitAreaConfig(config, widgetSet) {
        // Set up the result variables.
        var orientation = config.orientation;
        var children = [];
        var sizes = [];
        // Normalize the config children.
        for (var i = 0, n = config.children.length; i < n; ++i) {
            // Normalize the child config.
            var child = normalizeAreaConfig(config.children[i], widgetSet);
            // Ignore an empty child.
            if (!child) {
                continue;
            }
            // Add the child or hoist its content as appropriate.
            if (child.type === 'tab-area' || child.orientation !== orientation) {
                children.push(child);
                sizes.push(Math.abs(config.sizes[i] || 0));
            }
            else {
                children.push.apply(children, child.children);
                sizes.push.apply(sizes, child.sizes);
            }
        }
        // Bail if there are no effective children.
        if (children.length === 0) {
            return null;
        }
        // If there is only one effective child, return that child.
        if (children.length === 1) {
            return children[0];
        }
        // Return a normalized config object.
        return { type: 'split-area', orientation: orientation, children: children, sizes: sizes };
    }
    /**
     * Convert a normalized tab area config into a layout tree.
     */
    function realizeTabAreaConfig(config, renderer) {
        // Create the tab bar for the layout node.
        var tabBar = renderer.createTabBar();
        // Hide each widget and add it to the tab bar.
        each(config.widgets, function (widget) {
            widget.hide();
            tabBar.addTab(widget.title);
        });
        // Set the current index of the tab bar.
        tabBar.currentIndex = config.currentIndex;
        // Return the new tab layout node.
        return new TabLayoutNode(tabBar);
    }
    /**
     * Convert a normalized split area config into a layout tree.
     */
    function realizeSplitAreaConfig(config, renderer) {
        // Create the split layout node.
        var node = new SplitLayoutNode(config.orientation);
        // Add each child to the layout node.
        each(config.children, function (child, i) {
            // Create the child data for the layout node.
            var childNode = realizeAreaConfig(child, renderer);
            var sizer = createSizer(config.sizes[i]);
            var handle = renderer.createHandle();
            // Add the child data to the layout node.
            node.children.push(childNode);
            node.handles.push(handle);
            node.sizers.push(sizer);
            // Update the parent for the child node.
            childNode.parent = node;
        });
        // Synchronize the handle state for the layout node.
        node.syncHandles();
        // Normalize the sizes for the layout node.
        node.normalizeSizes();
        // Return the new layout node.
        return node;
    }
})(Private$8 || (Private$8 = {}));

/**
 * A widget which displays titles as a single row or column of tabs.
 *
 * #### Notes
 * If CSS transforms are used to rotate nodes for vertically oriented
 * text, then tab dragging will not work correctly. The `tabsMovable`
 * property should be set to `false` when rotating nodes from CSS.
 */
var TabBar = /** @class */ (function (_super) {
    __extends(TabBar, _super);
    /**
     * Construct a new tab bar.
     *
     * @param options - The options for initializing the tab bar.
     */
    function TabBar(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, { node: Private$9.createNode() }) || this;
        _this._currentIndex = -1;
        _this._titles = [];
        _this._titlesEditable = false;
        _this._previousTitle = null;
        _this._dragData = null;
        _this._tabMoved = new Signal(_this);
        _this._currentChanged = new Signal(_this);
        _this._tabCloseRequested = new Signal(_this);
        _this._tabDetachRequested = new Signal(_this);
        _this._tabActivateRequested = new Signal(_this);
        _this.addClass('lm-TabBar');
        /* <DEPRECATED> */
        _this.addClass('p-TabBar');
        /* </DEPRECATED> */
        _this.setFlag(Widget.Flag.DisallowLayout);
        _this.tabsMovable = options.tabsMovable || false;
        _this.titlesEditable = options.titlesEditable || false;
        _this.allowDeselect = options.allowDeselect || false;
        _this.insertBehavior = options.insertBehavior || 'select-tab-if-needed';
        _this.removeBehavior = options.removeBehavior || 'select-tab-after';
        _this.renderer = options.renderer || TabBar.defaultRenderer;
        _this._orientation = options.orientation || 'horizontal';
        _this.dataset['orientation'] = _this._orientation;
        return _this;
    }
    /**
     * Dispose of the resources held by the widget.
     */
    TabBar.prototype.dispose = function () {
        this._releaseMouse();
        this._titles.length = 0;
        this._previousTitle = null;
        _super.prototype.dispose.call(this);
    };
    Object.defineProperty(TabBar.prototype, "currentChanged", {
        /**
         * A signal emitted when the current tab is changed.
         *
         * #### Notes
         * This signal is emitted when the currently selected tab is changed
         * either through user or programmatic interaction.
         *
         * Notably, this signal is not emitted when the index of the current
         * tab changes due to tabs being inserted, removed, or moved. It is
         * only emitted when the actual current tab node is changed.
         */
        get: function () {
            return this._currentChanged;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TabBar.prototype, "tabMoved", {
        /**
         * A signal emitted when a tab is moved by the user.
         *
         * #### Notes
         * This signal is emitted when a tab is moved by user interaction.
         *
         * This signal is not emitted when a tab is moved programmatically.
         */
        get: function () {
            return this._tabMoved;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TabBar.prototype, "tabActivateRequested", {
        /**
         * A signal emitted when a tab is clicked by the user.
         *
         * #### Notes
         * If the clicked tab is not the current tab, the clicked tab will be
         * made current and the `currentChanged` signal will be emitted first.
         *
         * This signal is emitted even if the clicked tab is the current tab.
         */
        get: function () {
            return this._tabActivateRequested;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TabBar.prototype, "tabCloseRequested", {
        /**
         * A signal emitted when a tab close icon is clicked.
         *
         * #### Notes
         * This signal is not emitted unless the tab title is `closable`.
         */
        get: function () {
            return this._tabCloseRequested;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TabBar.prototype, "tabDetachRequested", {
        /**
         * A signal emitted when a tab is dragged beyond the detach threshold.
         *
         * #### Notes
         * This signal is emitted when the user drags a tab with the mouse,
         * and mouse is dragged beyond the detach threshold.
         *
         * The consumer of the signal should call `releaseMouse` and remove
         * the tab in order to complete the detach.
         *
         * This signal is only emitted once per drag cycle.
         */
        get: function () {
            return this._tabDetachRequested;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TabBar.prototype, "titlesEditable", {
        /**
         * Whether the titles can be user-edited.
         *
         */
        get: function () {
            return this._titlesEditable;
        },
        /**
         * Set whether titles can be user edited.
         *
         */
        set: function (value) {
            this._titlesEditable = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TabBar.prototype, "currentTitle", {
        /**
         * Get the currently selected title.
         *
         * #### Notes
         * This will be `null` if no tab is selected.
         */
        get: function () {
            return this._titles[this._currentIndex] || null;
        },
        /**
         * Set the currently selected title.
         *
         * #### Notes
         * If the title does not exist, the title will be set to `null`.
         */
        set: function (value) {
            this.currentIndex = value ? this._titles.indexOf(value) : -1;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TabBar.prototype, "currentIndex", {
        /**
         * Get the index of the currently selected tab.
         *
         * #### Notes
         * This will be `-1` if no tab is selected.
         */
        get: function () {
            return this._currentIndex;
        },
        /**
         * Set the index of the currently selected tab.
         *
         * #### Notes
         * If the value is out of range, the index will be set to `-1`.
         */
        set: function (value) {
            // Adjust for an out of range index.
            if (value < 0 || value >= this._titles.length) {
                value = -1;
            }
            // Bail early if the index will not change.
            if (this._currentIndex === value) {
                return;
            }
            // Look up the previous index and title.
            var pi = this._currentIndex;
            var pt = this._titles[pi] || null;
            // Look up the current index and title.
            var ci = value;
            var ct = this._titles[ci] || null;
            // Update the current index and previous title.
            this._currentIndex = ci;
            this._previousTitle = pt;
            // Schedule an update of the tabs.
            this.update();
            // Emit the current changed signal.
            this._currentChanged.emit({
                previousIndex: pi, previousTitle: pt,
                currentIndex: ci, currentTitle: ct
            });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TabBar.prototype, "orientation", {
        /**
         * Get the orientation of the tab bar.
         *
         * #### Notes
         * This controls whether the tabs are arranged in a row or column.
         */
        get: function () {
            return this._orientation;
        },
        /**
         * Set the orientation of the tab bar.
         *
         * #### Notes
         * This controls whether the tabs are arranged in a row or column.
         */
        set: function (value) {
            // Do nothing if the orientation does not change.
            if (this._orientation === value) {
                return;
            }
            // Release the mouse before making any changes.
            this._releaseMouse();
            // Toggle the orientation values.
            this._orientation = value;
            this.dataset['orientation'] = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TabBar.prototype, "titles", {
        /**
         * A read-only array of the titles in the tab bar.
         */
        get: function () {
            return this._titles;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TabBar.prototype, "contentNode", {
        /**
         * The tab bar content node.
         *
         * #### Notes
         * This is the node which holds the tab nodes.
         *
         * Modifying this node directly can lead to undefined behavior.
         */
        get: function () {
            return this.node.getElementsByClassName('lm-TabBar-content')[0];
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Add a tab to the end of the tab bar.
     *
     * @param value - The title which holds the data for the tab,
     *   or an options object to convert to a title.
     *
     * @returns The title object added to the tab bar.
     *
     * #### Notes
     * If the title is already added to the tab bar, it will be moved.
     */
    TabBar.prototype.addTab = function (value) {
        return this.insertTab(this._titles.length, value);
    };
    /**
     * Insert a tab into the tab bar at the specified index.
     *
     * @param index - The index at which to insert the tab.
     *
     * @param value - The title which holds the data for the tab,
     *   or an options object to convert to a title.
     *
     * @returns The title object added to the tab bar.
     *
     * #### Notes
     * The index will be clamped to the bounds of the tabs.
     *
     * If the title is already added to the tab bar, it will be moved.
     */
    TabBar.prototype.insertTab = function (index, value) {
        // Release the mouse before making any changes.
        this._releaseMouse();
        // Coerce the value to a title.
        var title = Private$9.asTitle(value);
        // Look up the index of the title.
        var i = this._titles.indexOf(title);
        // Clamp the insert index to the array bounds.
        var j = Math.max(0, Math.min(index, this._titles.length));
        // If the title is not in the array, insert it.
        if (i === -1) {
            // Insert the title into the array.
            ArrayExt.insert(this._titles, j, title);
            // Connect to the title changed signal.
            title.changed.connect(this._onTitleChanged, this);
            // Schedule an update of the tabs.
            this.update();
            // Adjust the current index for the insert.
            this._adjustCurrentForInsert(j, title);
            // Return the title added to the tab bar.
            return title;
        }
        // Otherwise, the title exists in the array and should be moved.
        // Adjust the index if the location is at the end of the array.
        if (j === this._titles.length) {
            j--;
        }
        // Bail if there is no effective move.
        if (i === j) {
            return title;
        }
        // Move the title to the new location.
        ArrayExt.move(this._titles, i, j);
        // Schedule an update of the tabs.
        this.update();
        // Adjust the current index for the move.
        this._adjustCurrentForMove(i, j);
        // Return the title added to the tab bar.
        return title;
    };
    /**
     * Remove a tab from the tab bar.
     *
     * @param title - The title for the tab to remove.
     *
     * #### Notes
     * This is a no-op if the title is not in the tab bar.
     */
    TabBar.prototype.removeTab = function (title) {
        this.removeTabAt(this._titles.indexOf(title));
    };
    /**
     * Remove the tab at a given index from the tab bar.
     *
     * @param index - The index of the tab to remove.
     *
     * #### Notes
     * This is a no-op if the index is out of range.
     */
    TabBar.prototype.removeTabAt = function (index) {
        // Release the mouse before making any changes.
        this._releaseMouse();
        // Remove the title from the array.
        var title = ArrayExt.removeAt(this._titles, index);
        // Bail if the index is out of range.
        if (!title) {
            return;
        }
        // Disconnect from the title changed signal.
        title.changed.disconnect(this._onTitleChanged, this);
        // Clear the previous title if it's being removed.
        if (title === this._previousTitle) {
            this._previousTitle = null;
        }
        // Schedule an update of the tabs.
        this.update();
        // Adjust the current index for the remove.
        this._adjustCurrentForRemove(index, title);
    };
    /**
     * Remove all tabs from the tab bar.
     */
    TabBar.prototype.clearTabs = function () {
        // Bail if there is nothing to remove.
        if (this._titles.length === 0) {
            return;
        }
        // Release the mouse before making any changes.
        this._releaseMouse();
        // Disconnect from the title changed signals.
        for (var _i = 0, _a = this._titles; _i < _a.length; _i++) {
            var title = _a[_i];
            title.changed.disconnect(this._onTitleChanged, this);
        }
        // Get the current index and title.
        var pi = this.currentIndex;
        var pt = this.currentTitle;
        // Reset the current index and previous title.
        this._currentIndex = -1;
        this._previousTitle = null;
        // Clear the title array.
        this._titles.length = 0;
        // Schedule an update of the tabs.
        this.update();
        // If no tab was selected, there's nothing else to do.
        if (pi === -1) {
            return;
        }
        // Emit the current changed signal.
        this._currentChanged.emit({
            previousIndex: pi, previousTitle: pt,
            currentIndex: -1, currentTitle: null
        });
    };
    /**
     * Release the mouse and restore the non-dragged tab positions.
     *
     * #### Notes
     * This will cause the tab bar to stop handling mouse events and to
     * restore the tabs to their non-dragged positions.
     */
    TabBar.prototype.releaseMouse = function () {
        this._releaseMouse();
    };
    /**
     * Handle the DOM events for the tab bar.
     *
     * @param event - The DOM event sent to the tab bar.
     *
     * #### Notes
     * This method implements the DOM `EventListener` interface and is
     * called in response to events on the tab bar's DOM node.
     *
     * This should not be called directly by user code.
     */
    TabBar.prototype.handleEvent = function (event) {
        switch (event.type) {
            case 'touchstart':
                event = Drag.convertTouchToMouseEvent(event);
            case 'mousedown':
                this._evtMouseDown(event);
                break;
            case 'touchmove':
                event = Drag.convertTouchToMouseEvent(event);
            case 'mousemove':
                this._evtMouseMove(event);
                break;
            case 'touchend':
                event = Drag.convertTouchToMouseEvent(event);
            case 'mouseup':
                this._evtMouseUp(event);
                break;
            case 'dblclick':
                this._evtDblClick(event);
                break;
            case 'keydown':
                this._evtKeyDown(event);
                break;
            case 'contextmenu':
                event.preventDefault();
                event.stopPropagation();
                break;
        }
    };
    /**
     * A message handler invoked on a `'before-attach'` message.
     */
    TabBar.prototype.onBeforeAttach = function (msg) {
        this.node.addEventListener('mousedown', this);
        this.node.addEventListener('dblclick', this);
        this.node.addEventListener('touchstart', this);
    };
    /**
     * A message handler invoked on an `'after-detach'` message.
     */
    TabBar.prototype.onAfterDetach = function (msg) {
        this.node.removeEventListener('mousedown', this);
        this.node.removeEventListener('dblclick', this);
        this.node.removeEventListener('touchstart', this);
        this._releaseMouse();
    };
    /**
     * A message handler invoked on an `'update-request'` message.
     */
    TabBar.prototype.onUpdateRequest = function (msg) {
        var titles = this._titles;
        var renderer = this.renderer;
        var currentTitle = this.currentTitle;
        var content = new Array(titles.length);
        for (var i = 0, n = titles.length; i < n; ++i) {
            var title = titles[i];
            var current = title === currentTitle;
            var zIndex = current ? n : n - i - 1;
            content[i] = renderer.renderTab({ title: title, current: current, zIndex: zIndex });
        }
        VirtualDOM.render(content, this.contentNode);
    };
    /**
     * Handle the `'dblclick'` event for the tab bar.
     */
    TabBar.prototype._evtDblClick = function (event) {
        // Do nothing if titles are not editable
        if (!this.titlesEditable) {
            return;
        }
        var tabs = this.contentNode.children;
        // Find the index of the released tab.
        var index = ArrayExt.findFirstIndex(tabs, function (tab) {
            return ElementExt.hitTest(tab, event.clientX, event.clientY);
        });
        // Do nothing if the press is not on a tab.
        if (index === -1) {
            return;
        }
        var title = this.titles[index];
        var label = tabs[index].querySelector('.lm-TabBar-tabLabel');
        if (label && label.contains(event.target)) {
            var value = title.label || '';
            // Clear the label element
            var oldValue_1 = label.innerHTML;
            label.innerHTML = "";
            var input_1 = document.createElement('input');
            input_1.classList.add('lm-TabBar-tabInput');
            input_1.value = value;
            label.appendChild(input_1);
            var onblur_1 = function () {
                input_1.removeEventListener('blur', onblur_1);
                label.innerHTML = oldValue_1;
            };
            input_1.addEventListener('dblclick', function (event) { return event.stopPropagation(); });
            input_1.addEventListener('blur', onblur_1);
            input_1.addEventListener('keydown', function (event) {
                if (event.key === 'Enter') {
                    if (input_1.value !== '') {
                        title.label = title.caption = input_1.value;
                    }
                    onblur_1();
                }
                else if (event.key === 'Escape') {
                    onblur_1();
                }
            });
            input_1.select();
            input_1.focus();
            if (label.children.length > 0) {
                label.children[0].focus();
            }
        }
    };
    /**
     * Handle the `'keydown'` event for the tab bar.
     */
    TabBar.prototype._evtKeyDown = function (event) {
        // Stop all input events during drag.
        event.preventDefault();
        event.stopPropagation();
        // Release the mouse if `Escape` is pressed.
        if (event.keyCode === 27) {
            this._releaseMouse();
        }
    };
    /**
     * Handle the `'mousedown'` event for the tab bar.
     */
    TabBar.prototype._evtMouseDown = function (event) {
        // Do nothing if it's not a left or middle mouse press.
        if (event.button !== 0 && event.button !== 1) {
            return;
        }
        // Do nothing if a drag is in progress.
        if (this._dragData) {
            return;
        }
        // Lookup the tab nodes.
        var tabs = this.contentNode.children;
        // Find the index of the pressed tab.
        var index = ArrayExt.findFirstIndex(tabs, function (tab) {
            return ElementExt.hitTest(tab, event.clientX, event.clientY);
        });
        // Do nothing if the press is not on a tab.
        if (index === -1) {
            return;
        }
        // Pressing on a tab stops the event propagation.
        event.preventDefault();
        event.stopPropagation();
        // Initialize the non-measured parts of the drag data.
        this._dragData = {
            tab: tabs[index],
            index: index,
            pressX: event.clientX,
            pressY: event.clientY,
            tabPos: -1,
            tabSize: -1,
            tabPressPos: -1,
            targetIndex: -1,
            tabLayout: null,
            contentRect: null,
            override: null,
            dragActive: false,
            dragAborted: false,
            detachRequested: false
        };
        // Add the document mouse up listener.
        document.addEventListener('mouseup', this, true);
        document.addEventListener('touchend', this, true);
        // Do nothing else if the middle button is clicked.
        if (event.button === 1) {
            return;
        }
        // Do nothing else if the close icon is clicked.
        var icon = tabs[index].querySelector(this.renderer.closeIconSelector);
        if (icon && icon.contains(event.target)) {
            return;
        }
        // Add the extra listeners if the tabs are movable.
        if (this.tabsMovable) {
            document.addEventListener('mousemove', this, true);
            document.addEventListener('touchmove', this, true);
            document.addEventListener('keydown', this, true);
            document.addEventListener('contextmenu', this, true);
        }
        // Update the current index as appropriate.
        if (this.allowDeselect && this.currentIndex === index) {
            this.currentIndex = -1;
        }
        else {
            this.currentIndex = index;
        }
        // Do nothing else if there is no current tab.
        if (this.currentIndex === -1) {
            return;
        }
        // Emit the tab activate request signal.
        this._tabActivateRequested.emit({
            index: this.currentIndex, title: this.currentTitle
        });
    };
    /**
     * Handle the `'mousemove'` event for the tab bar.
     */
    TabBar.prototype._evtMouseMove = function (event) {
        // Do nothing if no drag is in progress.
        var data = this._dragData;
        if (!data) {
            return;
        }
        // Suppress the event during a drag.
        event.preventDefault();
        event.stopPropagation();
        // Lookup the tab nodes.
        var tabs = this.contentNode.children;
        // Bail early if the drag threshold has not been met.
        if (!data.dragActive && !Private$9.dragExceeded(data, event)) {
            return;
        }
        // Activate the drag if necessary.
        if (!data.dragActive) {
            // Fill in the rest of the drag data measurements.
            var tabRect = data.tab.getBoundingClientRect();
            if (this._orientation === 'horizontal') {
                data.tabPos = data.tab.offsetLeft;
                data.tabSize = tabRect.width;
                data.tabPressPos = data.pressX - tabRect.left;
            }
            else {
                data.tabPos = data.tab.offsetTop;
                data.tabSize = tabRect.height;
                data.tabPressPos = data.pressY - tabRect.top;
            }
            data.tabLayout = Private$9.snapTabLayout(tabs, this._orientation);
            data.contentRect = this.contentNode.getBoundingClientRect();
            data.override = Drag.overrideCursor('default');
            // Add the dragging style classes.
            data.tab.classList.add('lm-mod-dragging');
            this.addClass('lm-mod-dragging');
            /* <DEPRECATED> */
            data.tab.classList.add('p-mod-dragging');
            this.addClass('p-mod-dragging');
            /* </DEPRECATED> */
            // Mark the drag as active.
            data.dragActive = true;
        }
        // Emit the detach requested signal if the threshold is exceeded.
        if (!data.detachRequested && Private$9.detachExceeded(data, event)) {
            // Only emit the signal once per drag cycle.
            data.detachRequested = true;
            // Setup the arguments for the signal.
            var index = data.index;
            var clientX = event.clientX;
            var clientY = event.clientY;
            var tab = tabs[index];
            var title = this._titles[index];
            // Emit the tab detach requested signal.
            this._tabDetachRequested.emit({ index: index, title: title, tab: tab, clientX: clientX, clientY: clientY });
            // Bail if the signal handler aborted the drag.
            if (data.dragAborted) {
                return;
            }
        }
        // Update the positions of the tabs.
        Private$9.layoutTabs(tabs, data, event, this._orientation);
    };
    /**
     * Handle the `'mouseup'` event for the document.
     */
    TabBar.prototype._evtMouseUp = function (event) {
        var _this = this;
        // Do nothing if it's not a left or middle mouse release.
        if (event.button !== 0 && event.button !== 1) {
            return;
        }
        // Do nothing if no drag is in progress.
        var data = this._dragData;
        if (!data) {
            return;
        }
        // Stop the event propagation.
        event.preventDefault();
        event.stopPropagation();
        // Remove the extra mouse event listeners.
        document.removeEventListener('mousemove', this, true);
        document.removeEventListener('touchmove', this, true);
        document.removeEventListener('mouseup', this, true);
        document.removeEventListener('touchend', this, true);
        document.removeEventListener('keydown', this, true);
        document.removeEventListener('contextmenu', this, true);
        // Handle a release when the drag is not active.
        if (!data.dragActive) {
            // Clear the drag data.
            this._dragData = null;
            // Lookup the tab nodes.
            var tabs = this.contentNode.children;
            // Find the index of the released tab.
            var index = ArrayExt.findFirstIndex(tabs, function (tab) {
                return ElementExt.hitTest(tab, event.clientX, event.clientY);
            });
            // Do nothing if the release is not on the original pressed tab.
            if (index !== data.index) {
                return;
            }
            // Ignore the release if the title is not closable.
            var title = this._titles[index];
            if (!title.closable) {
                return;
            }
            // Emit the close requested signal if the middle button is released.
            if (event.button === 1) {
                this._tabCloseRequested.emit({ index: index, title: title });
                return;
            }
            // Emit the close requested signal if the close icon was released.
            var icon = tabs[index].querySelector(this.renderer.closeIconSelector);
            if (icon && icon.contains(event.target)) {
                this._tabCloseRequested.emit({ index: index, title: title });
                return;
            }
            // Otherwise, there is nothing left to do.
            return;
        }
        // Do nothing if the left button is not released.
        if (event.button !== 0) {
            return;
        }
        // Position the tab at its final resting position.
        Private$9.finalizeTabPosition(data, this._orientation);
        // Remove the dragging class from the tab so it can be transitioned.
        data.tab.classList.remove('lm-mod-dragging');
        /* <DEPRECATED> */
        data.tab.classList.remove('p-mod-dragging');
        /* </DEPRECATED> */
        // Parse the transition duration for releasing the tab.
        var duration = Private$9.parseTransitionDuration(data.tab);
        // Complete the release on a timer to allow the tab to transition.
        setTimeout(function () {
            // Do nothing if the drag has been aborted.
            if (data.dragAborted) {
                return;
            }
            // Clear the drag data reference.
            _this._dragData = null;
            // Reset the positions of the tabs.
            Private$9.resetTabPositions(_this.contentNode.children, _this._orientation);
            // Clear the cursor grab.
            data.override.dispose();
            // Remove the remaining dragging style.
            _this.removeClass('lm-mod-dragging');
            /* <DEPRECATED> */
            _this.removeClass('p-mod-dragging');
            /* </DEPRECATED> */
            // If the tab was not moved, there is nothing else to do.
            var i = data.index;
            var j = data.targetIndex;
            if (j === -1 || i === j) {
                return;
            }
            // Move the title to the new locations.
            ArrayExt.move(_this._titles, i, j);
            // Adjust the current index for the move.
            _this._adjustCurrentForMove(i, j);
            // Emit the tab moved signal.
            _this._tabMoved.emit({
                fromIndex: i, toIndex: j, title: _this._titles[j]
            });
            // Update the tabs immediately to prevent flicker.
            MessageLoop.sendMessage(_this, Widget.Msg.UpdateRequest);
        }, duration);
    };
    /**
     * Release the mouse and restore the non-dragged tab positions.
     */
    TabBar.prototype._releaseMouse = function () {
        // Do nothing if no drag is in progress.
        var data = this._dragData;
        if (!data) {
            return;
        }
        // Clear the drag data reference.
        this._dragData = null;
        // Remove the extra mouse listeners.
        document.removeEventListener('mousemove', this, true);
        document.removeEventListener('touchmove', this, true);
        document.removeEventListener('mouseup', this, true);
        document.removeEventListener('touchend', this, true);
        document.removeEventListener('keydown', this, true);
        document.removeEventListener('contextmenu', this, true);
        // Indicate the drag has been aborted. This allows the mouse
        // event handlers to return early when the drag is canceled.
        data.dragAborted = true;
        // If the drag is not active, there's nothing more to do.
        if (!data.dragActive) {
            return;
        }
        // Reset the tabs to their non-dragged positions.
        Private$9.resetTabPositions(this.contentNode.children, this._orientation);
        // Clear the cursor override.
        data.override.dispose();
        // Clear the dragging style classes.
        data.tab.classList.remove('lm-mod-dragging');
        this.removeClass('lm-mod-dragging');
        /* <DEPRECATED> */
        data.tab.classList.remove('p-mod-dragging');
        this.removeClass('p-mod-dragging');
        /* </DEPRECATED> */
    };
    /**
     * Adjust the current index for a tab insert operation.
     *
     * This method accounts for the tab bar's insertion behavior when
     * adjusting the current index and emitting the changed signal.
     */
    TabBar.prototype._adjustCurrentForInsert = function (i, title) {
        // Lookup commonly used variables.
        var ct = this.currentTitle;
        var ci = this._currentIndex;
        var bh = this.insertBehavior;
        // Handle the behavior where the new tab is always selected,
        // or the behavior where the new tab is selected if needed.
        if (bh === 'select-tab' || (bh === 'select-tab-if-needed' && ci === -1)) {
            this._currentIndex = i;
            this._previousTitle = ct;
            this._currentChanged.emit({
                previousIndex: ci, previousTitle: ct,
                currentIndex: i, currentTitle: title
            });
            return;
        }
        // Otherwise, silently adjust the current index if needed.
        if (ci >= i) {
            this._currentIndex++;
        }
    };
    /**
     * Adjust the current index for a tab move operation.
     *
     * This method will not cause the actual current tab to change.
     * It silently adjusts the index to account for the given move.
     */
    TabBar.prototype._adjustCurrentForMove = function (i, j) {
        if (this._currentIndex === i) {
            this._currentIndex = j;
        }
        else if (this._currentIndex < i && this._currentIndex >= j) {
            this._currentIndex++;
        }
        else if (this._currentIndex > i && this._currentIndex <= j) {
            this._currentIndex--;
        }
    };
    /**
     * Adjust the current index for a tab remove operation.
     *
     * This method accounts for the tab bar's remove behavior when
     * adjusting the current index and emitting the changed signal.
     */
    TabBar.prototype._adjustCurrentForRemove = function (i, title) {
        // Lookup commonly used variables.
        var ci = this._currentIndex;
        var bh = this.removeBehavior;
        // Silently adjust the index if the current tab is not removed.
        if (ci !== i) {
            if (ci > i) {
                this._currentIndex--;
            }
            return;
        }
        // No tab gets selected if the tab bar is empty.
        if (this._titles.length === 0) {
            this._currentIndex = -1;
            this._currentChanged.emit({
                previousIndex: i, previousTitle: title,
                currentIndex: -1, currentTitle: null
            });
            return;
        }
        // Handle behavior where the next sibling tab is selected.
        if (bh === 'select-tab-after') {
            this._currentIndex = Math.min(i, this._titles.length - 1);
            this._currentChanged.emit({
                previousIndex: i, previousTitle: title,
                currentIndex: this._currentIndex, currentTitle: this.currentTitle
            });
            return;
        }
        // Handle behavior where the previous sibling tab is selected.
        if (bh === 'select-tab-before') {
            this._currentIndex = Math.max(0, i - 1);
            this._currentChanged.emit({
                previousIndex: i, previousTitle: title,
                currentIndex: this._currentIndex, currentTitle: this.currentTitle
            });
            return;
        }
        // Handle behavior where the previous history tab is selected.
        if (bh === 'select-previous-tab') {
            if (this._previousTitle) {
                this._currentIndex = this._titles.indexOf(this._previousTitle);
                this._previousTitle = null;
            }
            else {
                this._currentIndex = Math.min(i, this._titles.length - 1);
            }
            this._currentChanged.emit({
                previousIndex: i, previousTitle: title,
                currentIndex: this._currentIndex, currentTitle: this.currentTitle
            });
            return;
        }
        // Otherwise, no tab gets selected.
        this._currentIndex = -1;
        this._currentChanged.emit({
            previousIndex: i, previousTitle: title,
            currentIndex: -1, currentTitle: null
        });
    };
    /**
     * Handle the `changed` signal of a title object.
     */
    TabBar.prototype._onTitleChanged = function (sender) {
        this.update();
    };
    return TabBar;
}(Widget));
/**
 * The namespace for the `TabBar` class statics.
 */
(function (TabBar) {
    /**
     * The default implementation of `IRenderer`.
     *
     * #### Notes
     * Subclasses are free to reimplement rendering methods as needed.
     */
    var Renderer = /** @class */ (function () {
        /**
         * Construct a new renderer.
         */
        function Renderer() {
            /**
             * A selector which matches the close icon node in a tab.
             */
            this.closeIconSelector = '.lm-TabBar-tabCloseIcon';
            this._tabID = 0;
            this._tabKeys = new WeakMap();
        }
        /**
         * Render the virtual element for a tab.
         *
         * @param data - The data to use for rendering the tab.
         *
         * @returns A virtual element representing the tab.
         */
        Renderer.prototype.renderTab = function (data) {
            var title = data.title.caption;
            var key = this.createTabKey(data);
            var style = this.createTabStyle(data);
            var className = this.createTabClass(data);
            var dataset = this.createTabDataset(data);
            return (h.li({ key: key, className: className, title: title, style: style, dataset: dataset }, this.renderIcon(data), this.renderLabel(data), this.renderCloseIcon(data)));
        };
        /**
         * Render the icon element for a tab.
         *
         * @param data - The data to use for rendering the tab.
         *
         * @returns A virtual element representing the tab icon.
         */
        Renderer.prototype.renderIcon = function (data) {
            var title = data.title;
            var className = this.createIconClass(data);
            /* <DEPRECATED> */
            if (typeof title.icon === 'string') {
                return h.div({ className: className }, title.iconLabel);
            }
            /* </DEPRECATED> */
            // if title.icon is undefined, it will be ignored
            return h.div({ className: className }, title.icon, title.iconLabel);
        };
        /**
         * Render the label element for a tab.
         *
         * @param data - The data to use for rendering the tab.
         *
         * @returns A virtual element representing the tab label.
         */
        Renderer.prototype.renderLabel = function (data) {
            return h.div({
                className: 'lm-TabBar-tabLabel'
                    /* <DEPRECATED> */
                    + ' p-TabBar-tabLabel'
                /* </DEPRECATED> */
            }, data.title.label);
        };
        /**
         * Render the close icon element for a tab.
         *
         * @param data - The data to use for rendering the tab.
         *
         * @returns A virtual element representing the tab close icon.
         */
        Renderer.prototype.renderCloseIcon = function (data) {
            return h.div({
                className: 'lm-TabBar-tabCloseIcon'
                    /* <DEPRECATED> */
                    + ' p-TabBar-tabCloseIcon'
                /* </DEPRECATED> */
            });
        };
        /**
         * Create a unique render key for the tab.
         *
         * @param data - The data to use for the tab.
         *
         * @returns The unique render key for the tab.
         *
         * #### Notes
         * This method caches the key against the tab title the first time
         * the key is generated. This enables efficient rendering of moved
         * tabs and avoids subtle hover style artifacts.
         */
        Renderer.prototype.createTabKey = function (data) {
            var key = this._tabKeys.get(data.title);
            if (key === undefined) {
                key = "tab-key-" + this._tabID++;
                this._tabKeys.set(data.title, key);
            }
            return key;
        };
        /**
         * Create the inline style object for a tab.
         *
         * @param data - The data to use for the tab.
         *
         * @returns The inline style data for the tab.
         */
        Renderer.prototype.createTabStyle = function (data) {
            return { zIndex: "" + data.zIndex };
        };
        /**
         * Create the class name for the tab.
         *
         * @param data - The data to use for the tab.
         *
         * @returns The full class name for the tab.
         */
        Renderer.prototype.createTabClass = function (data) {
            var name = 'lm-TabBar-tab';
            /* <DEPRECATED> */
            name += ' p-TabBar-tab';
            /* </DEPRECATED> */
            if (data.title.className) {
                name += " " + data.title.className;
            }
            if (data.title.closable) {
                name += ' lm-mod-closable';
                /* <DEPRECATED> */
                name += ' p-mod-closable';
                /* </DEPRECATED> */
            }
            if (data.current) {
                name += ' lm-mod-current';
                /* <DEPRECATED> */
                name += ' p-mod-current';
                /* </DEPRECATED> */
            }
            return name;
        };
        /**
         * Create the dataset for a tab.
         *
         * @param data - The data to use for the tab.
         *
         * @returns The dataset for the tab.
         */
        Renderer.prototype.createTabDataset = function (data) {
            return data.title.dataset;
        };
        /**
         * Create the class name for the tab icon.
         *
         * @param data - The data to use for the tab.
         *
         * @returns The full class name for the tab icon.
         */
        Renderer.prototype.createIconClass = function (data) {
            var name = 'lm-TabBar-tabIcon';
            /* <DEPRECATED> */
            name += ' p-TabBar-tabIcon';
            /* </DEPRECATED> */
            var extra = data.title.iconClass;
            return extra ? name + " " + extra : name;
        };
        return Renderer;
    }());
    TabBar.Renderer = Renderer;
    /**
     * The default `Renderer` instance.
     */
    TabBar.defaultRenderer = new Renderer();
})(TabBar || (TabBar = {}));
/**
 * The namespace for the module implementation details.
 */
var Private$9;
(function (Private) {
    /**
     * The start drag distance threshold.
     */
    Private.DRAG_THRESHOLD = 5;
    /**
     * The detach distance threshold.
     */
    Private.DETACH_THRESHOLD = 20;
    /**
     * Create the DOM node for a tab bar.
     */
    function createNode() {
        var node = document.createElement('div');
        var content = document.createElement('ul');
        content.className = 'lm-TabBar-content';
        /* <DEPRECATED> */
        content.classList.add('p-TabBar-content');
        /* </DEPRECATED> */
        node.appendChild(content);
        return node;
    }
    Private.createNode = createNode;
    /**
     * Coerce a title or options into a real title.
     */
    function asTitle(value) {
        return value instanceof Title ? value : new Title(value);
    }
    Private.asTitle = asTitle;
    /**
     * Parse the transition duration for a tab node.
     */
    function parseTransitionDuration(tab) {
        var style = window.getComputedStyle(tab);
        return 1000 * (parseFloat(style.transitionDuration) || 0);
    }
    Private.parseTransitionDuration = parseTransitionDuration;
    /**
     * Get a snapshot of the current tab layout values.
     */
    function snapTabLayout(tabs, orientation) {
        var layout = new Array(tabs.length);
        for (var i = 0, n = tabs.length; i < n; ++i) {
            var node = tabs[i];
            var style = window.getComputedStyle(node);
            if (orientation === 'horizontal') {
                layout[i] = {
                    pos: node.offsetLeft,
                    size: node.offsetWidth,
                    margin: parseFloat(style.marginLeft) || 0
                };
            }
            else {
                layout[i] = {
                    pos: node.offsetTop,
                    size: node.offsetHeight,
                    margin: parseFloat(style.marginTop) || 0
                };
            }
        }
        return layout;
    }
    Private.snapTabLayout = snapTabLayout;
    /**
     * Test if the event exceeds the drag threshold.
     */
    function dragExceeded(data, event) {
        var dx = Math.abs(event.clientX - data.pressX);
        var dy = Math.abs(event.clientY - data.pressY);
        return dx >= Private.DRAG_THRESHOLD || dy >= Private.DRAG_THRESHOLD;
    }
    Private.dragExceeded = dragExceeded;
    /**
     * Test if the event exceeds the drag detach threshold.
     */
    function detachExceeded(data, event) {
        var rect = data.contentRect;
        return ((event.clientX < rect.left - Private.DETACH_THRESHOLD) ||
            (event.clientX >= rect.right + Private.DETACH_THRESHOLD) ||
            (event.clientY < rect.top - Private.DETACH_THRESHOLD) ||
            (event.clientY >= rect.bottom + Private.DETACH_THRESHOLD));
    }
    Private.detachExceeded = detachExceeded;
    /**
     * Update the relative tab positions and computed target index.
     */
    function layoutTabs(tabs, data, event, orientation) {
        // Compute the orientation-sensitive values.
        var pressPos;
        var localPos;
        var clientPos;
        var clientSize;
        if (orientation === 'horizontal') {
            pressPos = data.pressX;
            localPos = event.clientX - data.contentRect.left;
            clientPos = event.clientX;
            clientSize = data.contentRect.width;
        }
        else {
            pressPos = data.pressY;
            localPos = event.clientY - data.contentRect.top;
            clientPos = event.clientY;
            clientSize = data.contentRect.height;
        }
        // Compute the target data.
        var targetIndex = data.index;
        var targetPos = localPos - data.tabPressPos;
        var targetEnd = targetPos + data.tabSize;
        // Update the relative tab positions.
        for (var i = 0, n = tabs.length; i < n; ++i) {
            var pxPos = void 0;
            var layout = data.tabLayout[i];
            var threshold = layout.pos + (layout.size >> 1);
            if (i < data.index && targetPos < threshold) {
                pxPos = data.tabSize + data.tabLayout[i + 1].margin + "px";
                targetIndex = Math.min(targetIndex, i);
            }
            else if (i > data.index && targetEnd > threshold) {
                pxPos = -data.tabSize - layout.margin + "px";
                targetIndex = Math.max(targetIndex, i);
            }
            else if (i === data.index) {
                var ideal = clientPos - pressPos;
                var limit = clientSize - (data.tabPos + data.tabSize);
                pxPos = Math.max(-data.tabPos, Math.min(ideal, limit)) + "px";
            }
            else {
                pxPos = '';
            }
            if (orientation === 'horizontal') {
                tabs[i].style.left = pxPos;
            }
            else {
                tabs[i].style.top = pxPos;
            }
        }
        // Update the computed target index.
        data.targetIndex = targetIndex;
    }
    Private.layoutTabs = layoutTabs;
    /**
     * Position the drag tab at its final resting relative position.
     */
    function finalizeTabPosition(data, orientation) {
        // Compute the orientation-sensitive client size.
        var clientSize;
        if (orientation === 'horizontal') {
            clientSize = data.contentRect.width;
        }
        else {
            clientSize = data.contentRect.height;
        }
        // Compute the ideal final tab position.
        var ideal;
        if (data.targetIndex === data.index) {
            ideal = 0;
        }
        else if (data.targetIndex > data.index) {
            var tgt = data.tabLayout[data.targetIndex];
            ideal = tgt.pos + tgt.size - data.tabSize - data.tabPos;
        }
        else {
            var tgt = data.tabLayout[data.targetIndex];
            ideal = tgt.pos - data.tabPos;
        }
        // Compute the tab position limit.
        var limit = clientSize - (data.tabPos + data.tabSize);
        var final = Math.max(-data.tabPos, Math.min(ideal, limit));
        // Set the final orientation-sensitive position.
        if (orientation === 'horizontal') {
            data.tab.style.left = final + "px";
        }
        else {
            data.tab.style.top = final + "px";
        }
    }
    Private.finalizeTabPosition = finalizeTabPosition;
    /**
     * Reset the relative positions of the given tabs.
     */
    function resetTabPositions(tabs, orientation) {
        each(tabs, function (tab) {
            if (orientation === 'horizontal') {
                tab.style.left = '';
            }
            else {
                tab.style.top = '';
            }
        });
    }
    Private.resetTabPositions = resetTabPositions;
})(Private$9 || (Private$9 = {}));

/**
 * A widget which provides a flexible docking area for widgets.
 */
var DockPanel = /** @class */ (function (_super) {
    __extends(DockPanel, _super);
    /**
     * Construct a new dock panel.
     *
     * @param options - The options for initializing the panel.
     */
    function DockPanel(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this) || this;
        _this._drag = null;
        _this._tabsMovable = true;
        _this._tabsConstrained = false;
        _this._pressData = null;
        _this._layoutModified = new Signal(_this);
        _this.addClass('lm-DockPanel');
        /* <DEPRECATED> */
        _this.addClass('p-DockPanel');
        /* </DEPRECATED> */
        _this._mode = options.mode || 'multiple-document';
        _this._renderer = options.renderer || DockPanel.defaultRenderer;
        _this._edges = options.edges || Private$a.DEFAULT_EDGES;
        if (options.tabsMovable !== undefined) {
            _this._tabsMovable = options.tabsMovable;
        }
        if (options.tabsConstrained !== undefined) {
            _this._tabsConstrained = options.tabsConstrained;
        }
        // Toggle the CSS mode attribute.
        _this.dataset['mode'] = _this._mode;
        // Create the delegate renderer for the layout.
        var renderer = {
            createTabBar: function () { return _this._createTabBar(); },
            createHandle: function () { return _this._createHandle(); }
        };
        // Set up the dock layout for the panel.
        _this.layout = new DockLayout({ renderer: renderer, spacing: options.spacing });
        // Set up the overlay drop indicator.
        _this.overlay = options.overlay || new DockPanel.Overlay();
        _this.node.appendChild(_this.overlay.node);
        return _this;
    }
    /**
     * Dispose of the resources held by the panel.
     */
    DockPanel.prototype.dispose = function () {
        // Ensure the mouse is released.
        this._releaseMouse();
        // Hide the overlay.
        this.overlay.hide(0);
        // Cancel a drag if one is in progress.
        if (this._drag) {
            this._drag.dispose();
        }
        // Dispose of the base class.
        _super.prototype.dispose.call(this);
    };
    Object.defineProperty(DockPanel.prototype, "layoutModified", {
        /**
         * A signal emitted when the layout configuration is modified.
         *
         * #### Notes
         * This signal is emitted whenever the current layout configuration
         * may have changed.
         *
         * This signal is emitted asynchronously in a collapsed fashion, so
         * that multiple synchronous modifications results in only a single
         * emit of the signal.
         */
        get: function () {
            return this._layoutModified;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DockPanel.prototype, "renderer", {
        /**
         * The renderer used by the dock panel.
         */
        get: function () {
            return this.layout.renderer;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DockPanel.prototype, "spacing", {
        /**
         * Get the spacing between the widgets.
         */
        get: function () {
            return this.layout.spacing;
        },
        /**
         * Set the spacing between the widgets.
         */
        set: function (value) {
            this.layout.spacing = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DockPanel.prototype, "mode", {
        /**
         * Get the mode for the dock panel.
         */
        get: function () {
            return this._mode;
        },
        /**
         * Set the mode for the dock panel.
         *
         * #### Notes
         * Changing the mode is a destructive operation with respect to the
         * panel's layout configuration. If layout state must be preserved,
         * save the current layout config before changing the mode.
         */
        set: function (value) {
            // Bail early if the mode does not change.
            if (this._mode === value) {
                return;
            }
            // Update the internal mode.
            this._mode = value;
            // Toggle the CSS mode attribute.
            this.dataset['mode'] = value;
            // Get the layout for the panel.
            var layout = this.layout;
            // Configure the layout for the specified mode.
            switch (value) {
                case 'multiple-document':
                    each(layout.tabBars(), function (tabBar) { tabBar.show(); });
                    break;
                case 'single-document':
                    layout.restoreLayout(Private$a.createSingleDocumentConfig(this));
                    break;
                default:
                    throw 'unreachable';
            }
            // Schedule an emit of the layout modified signal.
            MessageLoop.postMessage(this, Private$a.LayoutModified);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DockPanel.prototype, "tabsMovable", {
        /**
         * Whether the tabs can be dragged / moved at runtime.
         */
        get: function () {
            return this._tabsMovable;
        },
        /**
         * Enable / Disable draggable / movable tabs.
         */
        set: function (value) {
            this._tabsMovable = value;
            each(this.tabBars(), function (tabbar) { tabbar.tabsMovable = value; });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DockPanel.prototype, "tabsConstrained", {
        /**
         * Whether the tabs are constrained to their source dock panel
         */
        get: function () {
            return this._tabsConstrained;
        },
        /**
         * Constrain/Allow tabs to be dragged outside of this dock panel
         */
        set: function (value) {
            this._tabsConstrained = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DockPanel.prototype, "isEmpty", {
        /**
         * Whether the dock panel is empty.
         */
        get: function () {
            return this.layout.isEmpty;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Create an iterator over the user widgets in the panel.
     *
     * @returns A new iterator over the user widgets in the panel.
     *
     * #### Notes
     * This iterator does not include the generated tab bars.
     */
    DockPanel.prototype.widgets = function () {
        return this.layout.widgets();
    };
    /**
     * Create an iterator over the selected widgets in the panel.
     *
     * @returns A new iterator over the selected user widgets.
     *
     * #### Notes
     * This iterator yields the widgets corresponding to the current tab
     * of each tab bar in the panel.
     */
    DockPanel.prototype.selectedWidgets = function () {
        return this.layout.selectedWidgets();
    };
    /**
     * Create an iterator over the tab bars in the panel.
     *
     * @returns A new iterator over the tab bars in the panel.
     *
     * #### Notes
     * This iterator does not include the user widgets.
     */
    DockPanel.prototype.tabBars = function () {
        return this.layout.tabBars();
    };
    /**
     * Create an iterator over the handles in the panel.
     *
     * @returns A new iterator over the handles in the panel.
     */
    DockPanel.prototype.handles = function () {
        return this.layout.handles();
    };
    /**
     * Select a specific widget in the dock panel.
     *
     * @param widget - The widget of interest.
     *
     * #### Notes
     * This will make the widget the current widget in its tab area.
     */
    DockPanel.prototype.selectWidget = function (widget) {
        // Find the tab bar which contains the widget.
        var tabBar = find(this.tabBars(), function (bar) {
            return bar.titles.indexOf(widget.title) !== -1;
        });
        // Throw an error if no tab bar is found.
        if (!tabBar) {
            throw new Error('Widget is not contained in the dock panel.');
        }
        // Ensure the widget is the current widget.
        tabBar.currentTitle = widget.title;
    };
    /**
     * Activate a specified widget in the dock panel.
     *
     * @param widget - The widget of interest.
     *
     * #### Notes
     * This will select and activate the given widget.
     */
    DockPanel.prototype.activateWidget = function (widget) {
        this.selectWidget(widget);
        widget.activate();
    };
    /**
     * Save the current layout configuration of the dock panel.
     *
     * @returns A new config object for the current layout state.
     *
     * #### Notes
     * The return value can be provided to the `restoreLayout` method
     * in order to restore the layout to its current configuration.
     */
    DockPanel.prototype.saveLayout = function () {
        return this.layout.saveLayout();
    };
    /**
     * Restore the layout to a previously saved configuration.
     *
     * @param config - The layout configuration to restore.
     *
     * #### Notes
     * Widgets which currently belong to the layout but which are not
     * contained in the config will be unparented.
     *
     * The dock panel automatically reverts to `'multiple-document'`
     * mode when a layout config is restored.
     */
    DockPanel.prototype.restoreLayout = function (config) {
        // Reset the mode.
        this._mode = 'multiple-document';
        // Restore the layout.
        this.layout.restoreLayout(config);
        // Flush the message loop on IE and Edge to prevent flicker.
        if (Platform.IS_EDGE || Platform.IS_IE) {
            MessageLoop.flush();
        }
        // Schedule an emit of the layout modified signal.
        MessageLoop.postMessage(this, Private$a.LayoutModified);
    };
    /**
     * Add a widget to the dock panel.
     *
     * @param widget - The widget to add to the dock panel.
     *
     * @param options - The additional options for adding the widget.
     *
     * #### Notes
     * If the panel is in single document mode, the options are ignored
     * and the widget is always added as tab in the hidden tab bar.
     */
    DockPanel.prototype.addWidget = function (widget, options) {
        if (options === void 0) { options = {}; }
        // Add the widget to the layout.
        if (this._mode === 'single-document') {
            this.layout.addWidget(widget);
        }
        else {
            this.layout.addWidget(widget, options);
        }
        // Schedule an emit of the layout modified signal.
        MessageLoop.postMessage(this, Private$a.LayoutModified);
    };
    /**
     * Process a message sent to the widget.
     *
     * @param msg - The message sent to the widget.
     */
    DockPanel.prototype.processMessage = function (msg) {
        if (msg.type === 'layout-modified') {
            this._layoutModified.emit(undefined);
        }
        else {
            _super.prototype.processMessage.call(this, msg);
        }
    };
    /**
     * Handle the DOM events for the dock panel.
     *
     * @param event - The DOM event sent to the panel.
     *
     * #### Notes
     * This method implements the DOM `EventListener` interface and is
     * called in response to events on the panel's DOM node. It should
     * not be called directly by user code.
     */
    DockPanel.prototype.handleEvent = function (event) {
        switch (event.type) {
            case 'lm-dragenter':
                this._evtDragEnter(event);
                break;
            case 'lm-dragleave':
                this._evtDragLeave(event);
                break;
            case 'lm-dragover':
                this._evtDragOver(event);
                break;
            case 'lm-drop':
                this._evtDrop(event);
                break;
            case 'touchstart':
                event = Drag.convertTouchToMouseEvent(event);
            case 'mousedown':
                this._evtMouseDown(event);
                break;
            case 'touchmove':
                event = Drag.convertTouchToMouseEvent(event);
            case 'mousemove':
                this._evtMouseMove(event);
                break;
            case 'touchend':
                event = Drag.convertTouchToMouseEvent(event);
            case 'mouseup':
                this._evtMouseUp(event);
                break;
            case 'keydown':
                this._evtKeyDown(event);
                break;
            case 'contextmenu':
                event.preventDefault();
                event.stopPropagation();
                break;
        }
    };
    /**
     * A message handler invoked on a `'before-attach'` message.
     */
    DockPanel.prototype.onBeforeAttach = function (msg) {
        this.node.addEventListener('lm-dragenter', this);
        this.node.addEventListener('lm-dragleave', this);
        this.node.addEventListener('lm-dragover', this);
        this.node.addEventListener('lm-drop', this);
        this.node.addEventListener('mousedown', this);
        this.node.addEventListener('touchstart', this);
    };
    /**
     * A message handler invoked on an `'after-detach'` message.
     */
    DockPanel.prototype.onAfterDetach = function (msg) {
        this.node.removeEventListener('lm-dragenter', this);
        this.node.removeEventListener('lm-dragleave', this);
        this.node.removeEventListener('lm-dragover', this);
        this.node.removeEventListener('lm-drop', this);
        this.node.removeEventListener('mousedown', this);
        this.node.removeEventListener('touchstart', this);
        this._releaseMouse();
    };
    /**
     * A message handler invoked on a `'child-added'` message.
     */
    DockPanel.prototype.onChildAdded = function (msg) {
        // Ignore the generated tab bars.
        if (Private$a.isGeneratedTabBarProperty.get(msg.child)) {
            return;
        }
        // Add the widget class to the child.
        msg.child.addClass('lm-DockPanel-widget');
        /* <DEPRECATED> */
        msg.child.addClass('p-DockPanel-widget');
        /* </DEPRECATED> */
    };
    /**
     * A message handler invoked on a `'child-removed'` message.
     */
    DockPanel.prototype.onChildRemoved = function (msg) {
        // Ignore the generated tab bars.
        if (Private$a.isGeneratedTabBarProperty.get(msg.child)) {
            return;
        }
        // Remove the widget class from the child.
        msg.child.removeClass('lm-DockPanel-widget');
        /* <DEPRECATED> */
        msg.child.removeClass('p-DockPanel-widget');
        /* </DEPRECATED> */
        // Schedule an emit of the layout modified signal.
        MessageLoop.postMessage(this, Private$a.LayoutModified);
    };
    /**
     * Handle the `'lm-dragenter'` event for the dock panel.
     */
    DockPanel.prototype._evtDragEnter = function (event) {
        // If the factory mime type is present, mark the event as
        // handled in order to get the rest of the drag events.
        if (event.mimeData.hasData('application/vnd.lumino.widget-factory')) {
            event.preventDefault();
            event.stopPropagation();
        }
    };
    /**
     * Handle the `'lm-dragleave'` event for the dock panel.
     */
    DockPanel.prototype._evtDragLeave = function (event) {
        // Mark the event as handled.
        event.preventDefault();
        event.stopPropagation();
        // The new target might be a descendant, so we might still handle the drop.
        // Hide asynchronously so that if a lm-dragover event bubbles up to us, the
        // hide is cancelled by the lm-dragover handler's show overlay logic.
        this.overlay.hide(1);
    };
    /**
     * Handle the `'lm-dragover'` event for the dock panel.
     */
    DockPanel.prototype._evtDragOver = function (event) {
        // Mark the event as handled.
        event.preventDefault();
        event.stopPropagation();
        // Show the drop indicator overlay and update the drop
        // action based on the drop target zone under the mouse.
        if ((this._tabsConstrained && event.source !== this) || this._showOverlay(event.clientX, event.clientY) === 'invalid') {
            event.dropAction = 'none';
        }
        else {
            event.dropAction = event.proposedAction;
        }
    };
    /**
     * Handle the `'lm-drop'` event for the dock panel.
     */
    DockPanel.prototype._evtDrop = function (event) {
        // Mark the event as handled.
        event.preventDefault();
        event.stopPropagation();
        // Hide the drop indicator overlay.
        this.overlay.hide(0);
        // Bail if the proposed action is to do nothing.
        if (event.proposedAction === 'none') {
            event.dropAction = 'none';
            return;
        }
        // Find the drop target under the mouse.
        var clientX = event.clientX, clientY = event.clientY;
        var _a = Private$a.findDropTarget(this, clientX, clientY, this._edges), zone = _a.zone, target = _a.target;
        // Bail if the drop zone is invalid.
        if (zone === 'invalid') {
            event.dropAction = 'none';
            return;
        }
        // Bail if the factory mime type has invalid data.
        var mimeData = event.mimeData;
        var factory = mimeData.getData('application/vnd.lumino.widget-factory');
        if (typeof factory !== 'function') {
            event.dropAction = 'none';
            return;
        }
        // Bail if the factory does not produce a widget.
        var widget = factory();
        if (!(widget instanceof Widget)) {
            event.dropAction = 'none';
            return;
        }
        // Bail if the widget is an ancestor of the dock panel.
        if (widget.contains(this)) {
            event.dropAction = 'none';
            return;
        }
        // Find the reference widget for the drop target.
        var ref = target ? Private$a.getDropRef(target.tabBar) : null;
        // Add the widget according to the indicated drop zone.
        switch (zone) {
            case 'root-all':
                this.addWidget(widget);
                break;
            case 'root-top':
                this.addWidget(widget, { mode: 'split-top' });
                break;
            case 'root-left':
                this.addWidget(widget, { mode: 'split-left' });
                break;
            case 'root-right':
                this.addWidget(widget, { mode: 'split-right' });
                break;
            case 'root-bottom':
                this.addWidget(widget, { mode: 'split-bottom' });
                break;
            case 'widget-all':
                this.addWidget(widget, { mode: 'tab-after', ref: ref });
                break;
            case 'widget-top':
                this.addWidget(widget, { mode: 'split-top', ref: ref });
                break;
            case 'widget-left':
                this.addWidget(widget, { mode: 'split-left', ref: ref });
                break;
            case 'widget-right':
                this.addWidget(widget, { mode: 'split-right', ref: ref });
                break;
            case 'widget-bottom':
                this.addWidget(widget, { mode: 'split-bottom', ref: ref });
                break;
            case 'widget-tab':
                this.addWidget(widget, { mode: 'tab-after', ref: ref });
                break;
            default:
                throw 'unreachable';
        }
        // Accept the proposed drop action.
        event.dropAction = event.proposedAction;
        // Activate the dropped widget.
        this.activateWidget(widget);
    };
    /**
     * Handle the `'keydown'` event for the dock panel.
     */
    DockPanel.prototype._evtKeyDown = function (event) {
        // Stop input events during drag.
        event.preventDefault();
        event.stopPropagation();
        // Release the mouse if `Escape` is pressed.
        if (event.keyCode === 27) {
            // Finalize the mouse release.
            this._releaseMouse();
            // Schedule an emit of the layout modified signal.
            MessageLoop.postMessage(this, Private$a.LayoutModified);
        }
    };
    /**
     * Handle the `'mousedown'` event for the dock panel.
     */
    DockPanel.prototype._evtMouseDown = function (event) {
        // Do nothing if the left mouse button is not pressed.
        if (event.button !== 0) {
            return;
        }
        // Find the handle which contains the mouse target, if any.
        var layout = this.layout;
        var target = event.target;
        var handle = find(layout.handles(), function (handle) { return handle.contains(target); });
        if (!handle) {
            return;
        }
        // Stop the event when a handle is pressed.
        event.preventDefault();
        event.stopPropagation();
        // Add the extra document listeners.
        document.addEventListener('keydown', this, true);
        document.addEventListener('mouseup', this, true);
        document.addEventListener('touchend', this, true);
        document.addEventListener('mousemove', this, true);
        document.addEventListener('touchmove', this, true);
        document.addEventListener('contextmenu', this, true);
        // Compute the offset deltas for the handle press.
        var rect = handle.getBoundingClientRect();
        var deltaX = event.clientX - rect.left;
        var deltaY = event.clientY - rect.top;
        // Override the cursor and store the press data.
        var style = window.getComputedStyle(handle);
        var override = Drag.overrideCursor(style.cursor);
        this._pressData = { handle: handle, deltaX: deltaX, deltaY: deltaY, override: override };
    };
    /**
     * Handle the `'mousemove'` event for the dock panel.
     */
    DockPanel.prototype._evtMouseMove = function (event) {
        // Bail early if no drag is in progress.
        if (!this._pressData) {
            return;
        }
        // Stop the event when dragging a handle.
        event.preventDefault();
        event.stopPropagation();
        // Compute the desired offset position for the handle.
        var rect = this.node.getBoundingClientRect();
        var xPos = event.clientX - rect.left - this._pressData.deltaX;
        var yPos = event.clientY - rect.top - this._pressData.deltaY;
        // Set the handle as close to the desired position as possible.
        var layout = this.layout;
        layout.moveHandle(this._pressData.handle, xPos, yPos);
    };
    /**
     * Handle the `'mouseup'` event for the dock panel.
     */
    DockPanel.prototype._evtMouseUp = function (event) {
        // Do nothing if the left mouse button is not released.
        if (event.button !== 0) {
            return;
        }
        // Stop the event when releasing a handle.
        event.preventDefault();
        event.stopPropagation();
        // Finalize the mouse release.
        this._releaseMouse();
        // Schedule an emit of the layout modified signal.
        MessageLoop.postMessage(this, Private$a.LayoutModified);
    };
    /**
     * Release the mouse grab for the dock panel.
     */
    DockPanel.prototype._releaseMouse = function () {
        // Bail early if no drag is in progress.
        if (!this._pressData) {
            return;
        }
        // Clear the override cursor.
        this._pressData.override.dispose();
        this._pressData = null;
        // Remove the extra document listeners.
        document.removeEventListener('keydown', this, true);
        document.removeEventListener('mouseup', this, true);
        document.removeEventListener('touchend', this, true);
        document.removeEventListener('mousemove', this, true);
        document.removeEventListener('touchmove', this, true);
        document.removeEventListener('contextmenu', this, true);
    };
    /**
     * Show the overlay indicator at the given client position.
     *
     * Returns the drop zone at the specified client position.
     *
     * #### Notes
     * If the position is not over a valid zone, the overlay is hidden.
     */
    DockPanel.prototype._showOverlay = function (clientX, clientY) {
        // Find the dock target for the given client position.
        var _a = Private$a.findDropTarget(this, clientX, clientY, this._edges), zone = _a.zone, target = _a.target;
        // If the drop zone is invalid, hide the overlay and bail.
        if (zone === 'invalid') {
            this.overlay.hide(100);
            return zone;
        }
        // Setup the variables needed to compute the overlay geometry.
        var top;
        var left;
        var right;
        var bottom;
        var box = ElementExt.boxSizing(this.node); // TODO cache this?
        var rect = this.node.getBoundingClientRect();
        // Compute the overlay geometry based on the dock zone.
        switch (zone) {
            case 'root-all':
                top = box.paddingTop;
                left = box.paddingLeft;
                right = box.paddingRight;
                bottom = box.paddingBottom;
                break;
            case 'root-top':
                top = box.paddingTop;
                left = box.paddingLeft;
                right = box.paddingRight;
                bottom = rect.height * Private$a.GOLDEN_RATIO;
                break;
            case 'root-left':
                top = box.paddingTop;
                left = box.paddingLeft;
                right = rect.width * Private$a.GOLDEN_RATIO;
                bottom = box.paddingBottom;
                break;
            case 'root-right':
                top = box.paddingTop;
                left = rect.width * Private$a.GOLDEN_RATIO;
                right = box.paddingRight;
                bottom = box.paddingBottom;
                break;
            case 'root-bottom':
                top = rect.height * Private$a.GOLDEN_RATIO;
                left = box.paddingLeft;
                right = box.paddingRight;
                bottom = box.paddingBottom;
                break;
            case 'widget-all':
                top = target.top;
                left = target.left;
                right = target.right;
                bottom = target.bottom;
                break;
            case 'widget-top':
                top = target.top;
                left = target.left;
                right = target.right;
                bottom = target.bottom + target.height / 2;
                break;
            case 'widget-left':
                top = target.top;
                left = target.left;
                right = target.right + target.width / 2;
                bottom = target.bottom;
                break;
            case 'widget-right':
                top = target.top;
                left = target.left + target.width / 2;
                right = target.right;
                bottom = target.bottom;
                break;
            case 'widget-bottom':
                top = target.top + target.height / 2;
                left = target.left;
                right = target.right;
                bottom = target.bottom;
                break;
            case 'widget-tab':
                var tabHeight = target.tabBar.node.getBoundingClientRect().height;
                top = target.top;
                left = target.left;
                right = target.right;
                bottom = target.bottom + target.height - tabHeight;
                break;
            default:
                throw 'unreachable';
        }
        // Show the overlay with the computed geometry.
        this.overlay.show({ top: top, left: left, right: right, bottom: bottom });
        // Finally, return the computed drop zone.
        return zone;
    };
    /**
     * Create a new tab bar for use by the panel.
     */
    DockPanel.prototype._createTabBar = function () {
        // Create the tab bar.
        var tabBar = this._renderer.createTabBar();
        // Set the generated tab bar property for the tab bar.
        Private$a.isGeneratedTabBarProperty.set(tabBar, true);
        // Hide the tab bar when in single document mode.
        if (this._mode === 'single-document') {
            tabBar.hide();
        }
        // Enforce necessary tab bar behavior.
        // TODO do we really want to enforce *all* of these?
        tabBar.tabsMovable = this._tabsMovable;
        tabBar.allowDeselect = false;
        tabBar.removeBehavior = 'select-previous-tab';
        tabBar.insertBehavior = 'select-tab-if-needed';
        // Connect the signal handlers for the tab bar.
        tabBar.tabMoved.connect(this._onTabMoved, this);
        tabBar.currentChanged.connect(this._onCurrentChanged, this);
        tabBar.tabCloseRequested.connect(this._onTabCloseRequested, this);
        tabBar.tabDetachRequested.connect(this._onTabDetachRequested, this);
        tabBar.tabActivateRequested.connect(this._onTabActivateRequested, this);
        // Return the initialized tab bar.
        return tabBar;
    };
    /**
     * Create a new handle for use by the panel.
     */
    DockPanel.prototype._createHandle = function () {
        return this._renderer.createHandle();
    };
    /**
     * Handle the `tabMoved` signal from a tab bar.
     */
    DockPanel.prototype._onTabMoved = function () {
        MessageLoop.postMessage(this, Private$a.LayoutModified);
    };
    /**
     * Handle the `currentChanged` signal from a tab bar.
     */
    DockPanel.prototype._onCurrentChanged = function (sender, args) {
        // Extract the previous and current title from the args.
        var previousTitle = args.previousTitle, currentTitle = args.currentTitle;
        // Hide the previous widget.
        if (previousTitle) {
            previousTitle.owner.hide();
        }
        // Show the current widget.
        if (currentTitle) {
            currentTitle.owner.show();
        }
        // Flush the message loop on IE and Edge to prevent flicker.
        if (Platform.IS_EDGE || Platform.IS_IE) {
            MessageLoop.flush();
        }
        // Schedule an emit of the layout modified signal.
        MessageLoop.postMessage(this, Private$a.LayoutModified);
    };
    /**
     * Handle the `tabActivateRequested` signal from a tab bar.
     */
    DockPanel.prototype._onTabActivateRequested = function (sender, args) {
        args.title.owner.activate();
    };
    /**
     * Handle the `tabCloseRequested` signal from a tab bar.
     */
    DockPanel.prototype._onTabCloseRequested = function (sender, args) {
        args.title.owner.close();
    };
    /**
     * Handle the `tabDetachRequested` signal from a tab bar.
     */
    DockPanel.prototype._onTabDetachRequested = function (sender, args) {
        var _this = this;
        // Do nothing if a drag is already in progress.
        if (this._drag) {
            return;
        }
        // Release the tab bar's hold on the mouse.
        sender.releaseMouse();
        // Extract the data from the args.
        var title = args.title, tab = args.tab, clientX = args.clientX, clientY = args.clientY;
        // Setup the mime data for the drag operation.
        var mimeData = new MimeData();
        var factory = function () { return title.owner; };
        mimeData.setData('application/vnd.lumino.widget-factory', factory);
        // Create the drag image for the drag operation.
        var dragImage = tab.cloneNode(true);
        // Create the drag object to manage the drag-drop operation.
        this._drag = new Drag({
            mimeData: mimeData, dragImage: dragImage,
            proposedAction: 'move',
            supportedActions: 'move',
            source: this
        });
        // Hide the tab node in the original tab.
        tab.classList.add('lm-mod-hidden');
        /* <DEPRECATED> */
        tab.classList.add('p-mod-hidden');
        // Create the cleanup callback.
        var cleanup = (function () {
            _this._drag = null;
            tab.classList.remove('lm-mod-hidden');
            /* <DEPRECATED> */
            tab.classList.remove('p-mod-hidden');
        });
        // Start the drag operation and cleanup when done.
        this._drag.start(clientX, clientY).then(cleanup);
    };
    return DockPanel;
}(Widget));
/**
 * The namespace for the `DockPanel` class statics.
 */
(function (DockPanel) {
    /**
     * A concrete implementation of `IOverlay`.
     *
     * This is the default overlay implementation for a dock panel.
     */
    var Overlay = /** @class */ (function () {
        /**
         * Construct a new overlay.
         */
        function Overlay() {
            this._timer = -1;
            this._hidden = true;
            this.node = document.createElement('div');
            this.node.classList.add('lm-DockPanel-overlay');
            this.node.classList.add('lm-mod-hidden');
            /* <DEPRECATED> */
            this.node.classList.add('p-DockPanel-overlay');
            this.node.classList.add('p-mod-hidden');
            this.node.style.position = 'absolute';
        }
        /**
         * Show the overlay using the given overlay geometry.
         *
         * @param geo - The desired geometry for the overlay.
         */
        Overlay.prototype.show = function (geo) {
            // Update the position of the overlay.
            var style = this.node.style;
            style.top = geo.top + "px";
            style.left = geo.left + "px";
            style.right = geo.right + "px";
            style.bottom = geo.bottom + "px";
            // Clear any pending hide timer.
            clearTimeout(this._timer);
            this._timer = -1;
            // If the overlay is already visible, we're done.
            if (!this._hidden) {
                return;
            }
            // Clear the hidden flag.
            this._hidden = false;
            // Finally, show the overlay.
            this.node.classList.remove('lm-mod-hidden');
            /* <DEPRECATED> */
            this.node.classList.remove('p-mod-hidden');
        };
        /**
         * Hide the overlay node.
         *
         * @param delay - The delay (in ms) before hiding the overlay.
         *   A delay value <= 0 will hide the overlay immediately.
         */
        Overlay.prototype.hide = function (delay) {
            var _this = this;
            // Do nothing if the overlay is already hidden.
            if (this._hidden) {
                return;
            }
            // Hide immediately if the delay is <= 0.
            if (delay <= 0) {
                clearTimeout(this._timer);
                this._timer = -1;
                this._hidden = true;
                this.node.classList.add('lm-mod-hidden');
                /* <DEPRECATED> */
                this.node.classList.add('p-mod-hidden');
                return;
            }
            // Do nothing if a hide is already pending.
            if (this._timer !== -1) {
                return;
            }
            // Otherwise setup the hide timer.
            this._timer = window.setTimeout(function () {
                _this._timer = -1;
                _this._hidden = true;
                _this.node.classList.add('lm-mod-hidden');
                /* <DEPRECATED> */
                _this.node.classList.add('p-mod-hidden');
            }, delay);
        };
        return Overlay;
    }());
    DockPanel.Overlay = Overlay;
    /**
     * The default implementation of `IRenderer`.
     */
    var Renderer = /** @class */ (function () {
        function Renderer() {
        }
        /**
         * Create a new tab bar for use with a dock panel.
         *
         * @returns A new tab bar for a dock panel.
         */
        Renderer.prototype.createTabBar = function () {
            var bar = new TabBar();
            bar.addClass('lm-DockPanel-tabBar');
            /* <DEPRECATED> */
            bar.addClass('p-DockPanel-tabBar');
            /* </DEPRECATED> */
            return bar;
        };
        /**
         * Create a new handle node for use with a dock panel.
         *
         * @returns A new handle node for a dock panel.
         */
        Renderer.prototype.createHandle = function () {
            var handle = document.createElement('div');
            handle.className = 'lm-DockPanel-handle';
            /* <DEPRECATED> */
            handle.classList.add('p-DockPanel-handle');
            return handle;
        };
        return Renderer;
    }());
    DockPanel.Renderer = Renderer;
    /**
     * The default `Renderer` instance.
     */
    DockPanel.defaultRenderer = new Renderer();
})(DockPanel || (DockPanel = {}));
/**
 * The namespace for the module implementation details.
 */
var Private$a;
(function (Private) {
    /**
     * A fraction used for sizing root panels; ~= `1 / golden_ratio`.
     */
    Private.GOLDEN_RATIO = 0.618;
    /**
     * The default sizes for the edge drop zones, in pixels.
     */
    Private.DEFAULT_EDGES = {
        /**
         * The size of the top edge dock zone for the root panel, in pixels.
         * This is different from the others to distinguish between the top
         * tab bar and the top root zone.
         */
        top: 12,
        /**
         * The size of the edge dock zone for the root panel, in pixels.
         */
        right: 40,
        /**
         * The size of the edge dock zone for the root panel, in pixels.
         */
        bottom: 40,
        /**
         * The size of the edge dock zone for the root panel, in pixels.
         */
        left: 40
    };
    /**
     * A singleton `'layout-modified'` conflatable message.
     */
    Private.LayoutModified = new ConflatableMessage('layout-modified');
    /**
     * An attached property used to track generated tab bars.
     */
    Private.isGeneratedTabBarProperty = new AttachedProperty({
        name: 'isGeneratedTabBar',
        create: function () { return false; }
    });
    /**
     * Create a single document config for the widgets in a dock panel.
     */
    function createSingleDocumentConfig(panel) {
        // Return an empty config if the panel is empty.
        if (panel.isEmpty) {
            return { main: null };
        }
        // Get a flat array of the widgets in the panel.
        var widgets = toArray(panel.widgets());
        // Get the first selected widget in the panel.
        var selected = panel.selectedWidgets().next();
        // Compute the current index for the new config.
        var currentIndex = selected ? widgets.indexOf(selected) : -1;
        // Return the single document config.
        return { main: { type: 'tab-area', widgets: widgets, currentIndex: currentIndex } };
    }
    Private.createSingleDocumentConfig = createSingleDocumentConfig;
    /**
     * Find the drop target at the given client position.
     */
    function findDropTarget(panel, clientX, clientY, edges) {
        // Bail if the mouse is not over the dock panel.
        if (!ElementExt.hitTest(panel.node, clientX, clientY)) {
            return { zone: 'invalid', target: null };
        }
        // Look up the layout for the panel.
        var layout = panel.layout;
        // If the layout is empty, indicate the entire root drop zone.
        if (layout.isEmpty) {
            return { zone: 'root-all', target: null };
        }
        // Test the edge zones when in multiple document mode.
        if (panel.mode === 'multiple-document') {
            // Get the client rect for the dock panel.
            var panelRect = panel.node.getBoundingClientRect();
            // Compute the distance to each edge of the panel.
            var pl = clientX - panelRect.left + 1;
            var pt = clientY - panelRect.top + 1;
            var pr = panelRect.right - clientX;
            var pb = panelRect.bottom - clientY;
            // Find the minimum distance to an edge.
            var pd = Math.min(pt, pr, pb, pl);
            // Return a root zone if the mouse is within an edge.
            switch (pd) {
                case pt:
                    if (pt < edges.top) {
                        return { zone: 'root-top', target: null };
                    }
                    break;
                case pr:
                    if (pr < edges.right) {
                        return { zone: 'root-right', target: null };
                    }
                    break;
                case pb:
                    if (pb < edges.bottom) {
                        return { zone: 'root-bottom', target: null };
                    }
                    break;
                case pl:
                    if (pl < edges.left) {
                        return { zone: 'root-left', target: null };
                    }
                    break;
                default:
                    throw 'unreachable';
            }
        }
        // Hit test the dock layout at the given client position.
        var target = layout.hitTestTabAreas(clientX, clientY);
        // Bail if no target area was found.
        if (!target) {
            return { zone: 'invalid', target: null };
        }
        // Return the whole tab area when in single document mode.
        if (panel.mode === 'single-document') {
            return { zone: 'widget-all', target: target };
        }
        // Compute the distance to each edge of the tab area.
        var al = target.x - target.left + 1;
        var at = target.y - target.top + 1;
        var ar = target.left + target.width - target.x;
        var ab = target.top + target.height - target.y;
        var tabHeight = target.tabBar.node.getBoundingClientRect().height;
        if (at < tabHeight) {
            return { zone: 'widget-tab', target: target };
        }
        // Get the X and Y edge sizes for the area.
        var rx = Math.round(target.width / 3);
        var ry = Math.round(target.height / 3);
        // If the mouse is not within an edge, indicate the entire area.
        if (al > rx && ar > rx && at > ry && ab > ry) {
            return { zone: 'widget-all', target: target };
        }
        // Scale the distances by the slenderness ratio.
        al /= rx;
        at /= ry;
        ar /= rx;
        ab /= ry;
        // Find the minimum distance to the area edge.
        var ad = Math.min(al, at, ar, ab);
        // Find the widget zone for the area edge.
        var zone;
        switch (ad) {
            case al:
                zone = 'widget-left';
                break;
            case at:
                zone = 'widget-top';
                break;
            case ar:
                zone = 'widget-right';
                break;
            case ab:
                zone = 'widget-bottom';
                break;
            default:
                throw 'unreachable';
        }
        // Return the final drop target.
        return { zone: zone, target: target };
    }
    Private.findDropTarget = findDropTarget;
    /**
     * Get the drop reference widget for a tab bar.
     */
    function getDropRef(tabBar) {
        if (tabBar.titles.length === 0) {
            return null;
        }
        if (tabBar.currentTitle) {
            return tabBar.currentTitle.owner;
        }
        return tabBar.titles[tabBar.titles.length - 1].owner;
    }
    Private.getDropRef = getDropRef;
})(Private$a || (Private$a = {}));

// Copyright (c) Jupyter Development Team.
/**
 * A class which tracks focus among a set of widgets.
 *
 * This class is useful when code needs to keep track of the most
 * recently focused widget(s) among a set of related widgets.
 */
var FocusTracker = /** @class */ (function () {
    /**
     * Construct a new focus tracker.
     */
    function FocusTracker() {
        this._counter = 0;
        this._widgets = [];
        this._activeWidget = null;
        this._currentWidget = null;
        this._numbers = new Map();
        this._nodes = new Map();
        this._activeChanged = new Signal(this);
        this._currentChanged = new Signal(this);
    }
    /**
     * Dispose of the resources held by the tracker.
     */
    FocusTracker.prototype.dispose = function () {
        var _this = this;
        // Do nothing if the tracker is already disposed.
        if (this._counter < 0) {
            return;
        }
        // Mark the tracker as disposed.
        this._counter = -1;
        // Clear the connections for the tracker.
        Signal.clearData(this);
        // Remove all event listeners.
        each(this._widgets, function (w) {
            w.node.removeEventListener('focus', _this, true);
            w.node.removeEventListener('blur', _this, true);
        });
        // Clear the internal data structures.
        this._activeWidget = null;
        this._currentWidget = null;
        this._nodes.clear();
        this._numbers.clear();
        this._widgets.length = 0;
    };
    Object.defineProperty(FocusTracker.prototype, "currentChanged", {
        /**
         * A signal emitted when the current widget has changed.
         */
        get: function () {
            return this._currentChanged;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FocusTracker.prototype, "activeChanged", {
        /**
         * A signal emitted when the active widget has changed.
         */
        get: function () {
            return this._activeChanged;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FocusTracker.prototype, "isDisposed", {
        /**
         * A flag indicating whether the tracker is disposed.
         */
        get: function () {
            return this._counter < 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FocusTracker.prototype, "currentWidget", {
        /**
         * The current widget in the tracker.
         *
         * #### Notes
         * The current widget is the widget among the tracked widgets which
         * has the *descendant node* which has most recently been focused.
         *
         * The current widget will not be updated if the node loses focus. It
         * will only be updated when a different tracked widget gains focus.
         *
         * If the current widget is removed from the tracker, the previous
         * current widget will be restored.
         *
         * This behavior is intended to follow a user's conceptual model of
         * a semantically "current" widget, where the "last thing of type X"
         * to be interacted with is the "current instance of X", regardless
         * of whether that instance still has focus.
         */
        get: function () {
            return this._currentWidget;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FocusTracker.prototype, "activeWidget", {
        /**
         * The active widget in the tracker.
         *
         * #### Notes
         * The active widget is the widget among the tracked widgets which
         * has the *descendant node* which is currently focused.
         */
        get: function () {
            return this._activeWidget;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FocusTracker.prototype, "widgets", {
        /**
         * A read only array of the widgets being tracked.
         */
        get: function () {
            return this._widgets;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Get the focus number for a particular widget in the tracker.
     *
     * @param widget - The widget of interest.
     *
     * @returns The focus number for the given widget, or `-1` if the
     *   widget has not had focus since being added to the tracker, or
     *   is not contained by the tracker.
     *
     * #### Notes
     * The focus number indicates the relative order in which the widgets
     * have gained focus. A widget with a larger number has gained focus
     * more recently than a widget with a smaller number.
     *
     * The `currentWidget` will always have the largest focus number.
     *
     * All widgets start with a focus number of `-1`, which indicates that
     * the widget has not been focused since being added to the tracker.
     */
    FocusTracker.prototype.focusNumber = function (widget) {
        var n = this._numbers.get(widget);
        return n === undefined ? -1 : n;
    };
    /**
     * Test whether the focus tracker contains a given widget.
     *
     * @param widget - The widget of interest.
     *
     * @returns `true` if the widget is tracked, `false` otherwise.
     */
    FocusTracker.prototype.has = function (widget) {
        return this._numbers.has(widget);
    };
    /**
     * Add a widget to the focus tracker.
     *
     * @param widget - The widget of interest.
     *
     * #### Notes
     * A widget will be automatically removed from the tracker if it
     * is disposed after being added.
     *
     * If the widget is already tracked, this is a no-op.
     */
    FocusTracker.prototype.add = function (widget) {
        // Do nothing if the widget is already tracked.
        if (this._numbers.has(widget)) {
            return;
        }
        // Test whether the widget has focus.
        var focused = widget.node.contains(document.activeElement);
        // Set up the initial focus number.
        var n = focused ? this._counter++ : -1;
        // Add the widget to the internal data structures.
        this._widgets.push(widget);
        this._numbers.set(widget, n);
        this._nodes.set(widget.node, widget);
        // Set up the event listeners. The capturing phase must be used
        // since the 'focus' and 'blur' events don't bubble and Firefox
        // doesn't support the 'focusin' or 'focusout' events.
        widget.node.addEventListener('focus', this, true);
        widget.node.addEventListener('blur', this, true);
        // Connect the disposed signal handler.
        widget.disposed.connect(this._onWidgetDisposed, this);
        // Set the current and active widgets if needed.
        if (focused) {
            this._setWidgets(widget, widget);
        }
    };
    /**
     * Remove a widget from the focus tracker.
     *
     * #### Notes
     * If the widget is the `currentWidget`, the previous current widget
     * will become the new `currentWidget`.
     *
     * A widget will be automatically removed from the tracker if it
     * is disposed after being added.
     *
     * If the widget is not tracked, this is a no-op.
     */
    FocusTracker.prototype.remove = function (widget) {
        var _this = this;
        // Bail early if the widget is not tracked.
        if (!this._numbers.has(widget)) {
            return;
        }
        // Disconnect the disposed signal handler.
        widget.disposed.disconnect(this._onWidgetDisposed, this);
        // Remove the event listeners.
        widget.node.removeEventListener('focus', this, true);
        widget.node.removeEventListener('blur', this, true);
        // Remove the widget from the internal data structures.
        ArrayExt.removeFirstOf(this._widgets, widget);
        this._nodes.delete(widget.node);
        this._numbers.delete(widget);
        // Bail early if the widget is not the current widget.
        if (this._currentWidget !== widget) {
            return;
        }
        // Filter the widgets for those which have had focus.
        var valid = filter(this._widgets, function (w) { return _this._numbers.get(w) !== -1; });
        // Get the valid widget with the max focus number.
        var previous = max(valid, function (first, second) {
            var a = _this._numbers.get(first);
            var b = _this._numbers.get(second);
            return a - b;
        }) || null;
        // Set the current and active widgets.
        this._setWidgets(previous, null);
    };
    /**
     * Handle the DOM events for the focus tracker.
     *
     * @param event - The DOM event sent to the panel.
     *
     * #### Notes
     * This method implements the DOM `EventListener` interface and is
     * called in response to events on the tracked nodes. It should
     * not be called directly by user code.
     */
    FocusTracker.prototype.handleEvent = function (event) {
        switch (event.type) {
            case 'focus':
                this._evtFocus(event);
                break;
            case 'blur':
                this._evtBlur(event);
                break;
        }
    };
    /**
     * Set the current and active widgets for the tracker.
     */
    FocusTracker.prototype._setWidgets = function (current, active) {
        // Swap the current widget.
        var oldCurrent = this._currentWidget;
        this._currentWidget = current;
        // Swap the active widget.
        var oldActive = this._activeWidget;
        this._activeWidget = active;
        // Emit the `currentChanged` signal if needed.
        if (oldCurrent !== current) {
            this._currentChanged.emit({ oldValue: oldCurrent, newValue: current });
        }
        // Emit the `activeChanged` signal if needed.
        if (oldActive !== active) {
            this._activeChanged.emit({ oldValue: oldActive, newValue: active });
        }
    };
    /**
     * Handle the `'focus'` event for a tracked widget.
     */
    FocusTracker.prototype._evtFocus = function (event) {
        // Find the widget which gained focus, which is known to exist.
        var widget = this._nodes.get(event.currentTarget);
        // Update the focus number if necessary.
        if (widget !== this._currentWidget) {
            this._numbers.set(widget, this._counter++);
        }
        // Set the current and active widgets.
        this._setWidgets(widget, widget);
    };
    /**
     * Handle the `'blur'` event for a tracked widget.
     */
    FocusTracker.prototype._evtBlur = function (event) {
        // Find the widget which lost focus, which is known to exist.
        var widget = this._nodes.get(event.currentTarget);
        // Get the node which being focused after this blur.
        var focusTarget = event.relatedTarget;
        // If no other node is being focused, clear the active widget.
        if (!focusTarget) {
            this._setWidgets(this._currentWidget, null);
            return;
        }
        // Bail if the focus widget is not changing.
        if (widget.node.contains(focusTarget)) {
            return;
        }
        // If no tracked widget is being focused, clear the active widget.
        if (!find(this._widgets, function (w) { return w.node.contains(focusTarget); })) {
            this._setWidgets(this._currentWidget, null);
            return;
        }
    };
    /**
     * Handle the `disposed` signal for a tracked widget.
     */
    FocusTracker.prototype._onWidgetDisposed = function (sender) {
        this.remove(sender);
    };
    return FocusTracker;
}());

/**
 * A layout which arranges its widgets in a grid.
 */
var GridLayout = /** @class */ (function (_super) {
    __extends(GridLayout, _super);
    /**
     * Construct a new grid layout.
     *
     * @param options - The options for initializing the layout.
     */
    function GridLayout(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, options) || this;
        _this._dirty = false;
        _this._rowSpacing = 4;
        _this._columnSpacing = 4;
        _this._items = [];
        _this._rowStarts = [];
        _this._columnStarts = [];
        _this._rowSizers = [new BoxSizer()];
        _this._columnSizers = [new BoxSizer()];
        _this._box = null;
        if (options.rowCount !== undefined) {
            Private$b.reallocSizers(_this._rowSizers, options.rowCount);
        }
        if (options.columnCount !== undefined) {
            Private$b.reallocSizers(_this._columnSizers, options.columnCount);
        }
        if (options.rowSpacing !== undefined) {
            _this._rowSpacing = Private$b.clampValue(options.rowSpacing);
        }
        if (options.columnSpacing !== undefined) {
            _this._columnSpacing = Private$b.clampValue(options.columnSpacing);
        }
        return _this;
    }
    /**
     * Dispose of the resources held by the layout.
     */
    GridLayout.prototype.dispose = function () {
        // Dispose of the widgets and layout items.
        each(this._items, function (item) {
            var widget = item.widget;
            item.dispose();
            widget.dispose();
        });
        // Clear the layout state.
        this._box = null;
        this._items.length = 0;
        this._rowStarts.length = 0;
        this._rowSizers.length = 0;
        this._columnStarts.length = 0;
        this._columnSizers.length = 0;
        // Dispose of the rest of the layout.
        _super.prototype.dispose.call(this);
    };
    Object.defineProperty(GridLayout.prototype, "rowCount", {
        /**
         * Get the number of rows in the layout.
         */
        get: function () {
            return this._rowSizers.length;
        },
        /**
         * Set the number of rows in the layout.
         *
         * #### Notes
         * The minimum row count is `1`.
         */
        set: function (value) {
            // Do nothing if the row count does not change.
            if (value === this.rowCount) {
                return;
            }
            // Reallocate the row sizers.
            Private$b.reallocSizers(this._rowSizers, value);
            // Schedule a fit of the parent.
            if (this.parent) {
                this.parent.fit();
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GridLayout.prototype, "columnCount", {
        /**
         * Get the number of columns in the layout.
         */
        get: function () {
            return this._columnSizers.length;
        },
        /**
         * Set the number of columns in the layout.
         *
         * #### Notes
         * The minimum column count is `1`.
         */
        set: function (value) {
            // Do nothing if the column count does not change.
            if (value === this.columnCount) {
                return;
            }
            // Reallocate the column sizers.
            Private$b.reallocSizers(this._columnSizers, value);
            // Schedule a fit of the parent.
            if (this.parent) {
                this.parent.fit();
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GridLayout.prototype, "rowSpacing", {
        /**
         * Get the row spacing for the layout.
         */
        get: function () {
            return this._rowSpacing;
        },
        /**
         * Set the row spacing for the layout.
         */
        set: function (value) {
            // Clamp the spacing to the allowed range.
            value = Private$b.clampValue(value);
            // Bail if the spacing does not change
            if (this._rowSpacing === value) {
                return;
            }
            // Update the internal spacing.
            this._rowSpacing = value;
            // Schedule a fit of the parent.
            if (this.parent) {
                this.parent.fit();
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GridLayout.prototype, "columnSpacing", {
        /**
         * Get the column spacing for the layout.
         */
        get: function () {
            return this._columnSpacing;
        },
        /**
         * Set the col spacing for the layout.
         */
        set: function (value) {
            // Clamp the spacing to the allowed range.
            value = Private$b.clampValue(value);
            // Bail if the spacing does not change
            if (this._columnSpacing === value) {
                return;
            }
            // Update the internal spacing.
            this._columnSpacing = value;
            // Schedule a fit of the parent.
            if (this.parent) {
                this.parent.fit();
            }
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Get the stretch factor for a specific row.
     *
     * @param index - The row index of interest.
     *
     * @returns The stretch factor for the row.
     *
     * #### Notes
     * This returns `-1` if the index is out of range.
     */
    GridLayout.prototype.rowStretch = function (index) {
        var sizer = this._rowSizers[index];
        return sizer ? sizer.stretch : -1;
    };
    /**
     * Set the stretch factor for a specific row.
     *
     * @param index - The row index of interest.
     *
     * @param value - The stretch factor for the row.
     *
     * #### Notes
     * This is a no-op if the index is out of range.
     */
    GridLayout.prototype.setRowStretch = function (index, value) {
        // Look up the row sizer.
        var sizer = this._rowSizers[index];
        // Bail if the index is out of range.
        if (!sizer) {
            return;
        }
        // Clamp the value to the allowed range.
        value = Private$b.clampValue(value);
        // Bail if the stretch does not change.
        if (sizer.stretch === value) {
            return;
        }
        // Update the sizer stretch.
        sizer.stretch = value;
        // Schedule an update of the parent.
        if (this.parent) {
            this.parent.update();
        }
    };
    /**
     * Get the stretch factor for a specific column.
     *
     * @param index - The column index of interest.
     *
     * @returns The stretch factor for the column.
     *
     * #### Notes
     * This returns `-1` if the index is out of range.
     */
    GridLayout.prototype.columnStretch = function (index) {
        var sizer = this._columnSizers[index];
        return sizer ? sizer.stretch : -1;
    };
    /**
     * Set the stretch factor for a specific column.
     *
     * @param index - The column index of interest.
     *
     * @param value - The stretch factor for the column.
     *
     * #### Notes
     * This is a no-op if the index is out of range.
     */
    GridLayout.prototype.setColumnStretch = function (index, value) {
        // Look up the column sizer.
        var sizer = this._columnSizers[index];
        // Bail if the index is out of range.
        if (!sizer) {
            return;
        }
        // Clamp the value to the allowed range.
        value = Private$b.clampValue(value);
        // Bail if the stretch does not change.
        if (sizer.stretch === value) {
            return;
        }
        // Update the sizer stretch.
        sizer.stretch = value;
        // Schedule an update of the parent.
        if (this.parent) {
            this.parent.update();
        }
    };
    /**
     * Create an iterator over the widgets in the layout.
     *
     * @returns A new iterator over the widgets in the layout.
     */
    GridLayout.prototype.iter = function () {
        return map(this._items, function (item) { return item.widget; });
    };
    /**
     * Add a widget to the grid layout.
     *
     * @param widget - The widget to add to the layout.
     *
     * #### Notes
     * If the widget is already contained in the layout, this is no-op.
     */
    GridLayout.prototype.addWidget = function (widget) {
        // Look up the index for the widget.
        var i = ArrayExt.findFirstIndex(this._items, function (it) { return it.widget === widget; });
        // Bail if the widget is already in the layout.
        if (i !== -1) {
            return;
        }
        // Add the widget to the layout.
        this._items.push(new LayoutItem(widget));
        // Attach the widget to the parent.
        if (this.parent) {
            this.attachWidget(widget);
        }
    };
    /**
     * Remove a widget from the grid layout.
     *
     * @param widget - The widget to remove from the layout.
     *
     * #### Notes
     * A widget is automatically removed from the layout when its `parent`
     * is set to `null`. This method should only be invoked directly when
     * removing a widget from a layout which has yet to be installed on a
     * parent widget.
     *
     * This method does *not* modify the widget's `parent`.
     */
    GridLayout.prototype.removeWidget = function (widget) {
        // Look up the index for the widget.
        var i = ArrayExt.findFirstIndex(this._items, function (it) { return it.widget === widget; });
        // Bail if the widget is not in the layout.
        if (i === -1) {
            return;
        }
        // Remove the widget from the layout.
        var item = ArrayExt.removeAt(this._items, i);
        // Detach the widget from the parent.
        if (this.parent) {
            this.detachWidget(widget);
        }
        // Dispose the layout item.
        item.dispose();
    };
    /**
     * Perform layout initialization which requires the parent widget.
     */
    GridLayout.prototype.init = function () {
        var _this = this;
        _super.prototype.init.call(this);
        each(this, function (widget) { _this.attachWidget(widget); });
    };
    /**
     * Attach a widget to the parent's DOM node.
     *
     * @param widget - The widget to attach to the parent.
     */
    GridLayout.prototype.attachWidget = function (widget) {
        // Send a `'before-attach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
        }
        // Add the widget's node to the parent.
        this.parent.node.appendChild(widget.node);
        // Send an `'after-attach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
        }
        // Post a fit request for the parent widget.
        this.parent.fit();
    };
    /**
     * Detach a widget from the parent's DOM node.
     *
     * @param widget - The widget to detach from the parent.
     */
    GridLayout.prototype.detachWidget = function (widget) {
        // Send a `'before-detach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
        }
        // Remove the widget's node from the parent.
        this.parent.node.removeChild(widget.node);
        // Send an `'after-detach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
        }
        // Post a fit request for the parent widget.
        this.parent.fit();
    };
    /**
     * A message handler invoked on a `'before-show'` message.
     */
    GridLayout.prototype.onBeforeShow = function (msg) {
        _super.prototype.onBeforeShow.call(this, msg);
        this.parent.update();
    };
    /**
     * A message handler invoked on a `'before-attach'` message.
     */
    GridLayout.prototype.onBeforeAttach = function (msg) {
        _super.prototype.onBeforeAttach.call(this, msg);
        this.parent.fit();
    };
    /**
     * A message handler invoked on a `'child-shown'` message.
     */
    GridLayout.prototype.onChildShown = function (msg) {
        this.parent.fit();
    };
    /**
     * A message handler invoked on a `'child-hidden'` message.
     */
    GridLayout.prototype.onChildHidden = function (msg) {
        this.parent.fit();
    };
    /**
     * A message handler invoked on a `'resize'` message.
     */
    GridLayout.prototype.onResize = function (msg) {
        if (this.parent.isVisible) {
            this._update(msg.width, msg.height);
        }
    };
    /**
     * A message handler invoked on an `'update-request'` message.
     */
    GridLayout.prototype.onUpdateRequest = function (msg) {
        if (this.parent.isVisible) {
            this._update(-1, -1);
        }
    };
    /**
     * A message handler invoked on a `'fit-request'` message.
     */
    GridLayout.prototype.onFitRequest = function (msg) {
        if (this.parent.isAttached) {
            this._fit();
        }
    };
    /**
     * Fit the layout to the total size required by the widgets.
     */
    GridLayout.prototype._fit = function () {
        // Reset the min sizes of the sizers.
        for (var i = 0, n = this.rowCount; i < n; ++i) {
            this._rowSizers[i].minSize = 0;
        }
        for (var i = 0, n = this.columnCount; i < n; ++i) {
            this._columnSizers[i].minSize = 0;
        }
        // Filter for the visible layout items.
        var items = this._items.filter(function (it) { return !it.isHidden; });
        // Fit the layout items.
        for (var i = 0, n = items.length; i < n; ++i) {
            items[i].fit();
        }
        // Get the max row and column index.
        var maxRow = this.rowCount - 1;
        var maxCol = this.columnCount - 1;
        // Sort the items by row span.
        items.sort(Private$b.rowSpanCmp);
        // Update the min sizes of the row sizers.
        for (var i = 0, n = items.length; i < n; ++i) {
            // Fetch the item.
            var item = items[i];
            // Get the row bounds for the item.
            var config = GridLayout.getCellConfig(item.widget);
            var r1 = Math.min(config.row, maxRow);
            var r2 = Math.min(config.row + config.rowSpan - 1, maxRow);
            // Distribute the minimum height to the sizers as needed.
            Private$b.distributeMin(this._rowSizers, r1, r2, item.minHeight);
        }
        // Sort the items by column span.
        items.sort(Private$b.columnSpanCmp);
        // Update the min sizes of the column sizers.
        for (var i = 0, n = items.length; i < n; ++i) {
            // Fetch the item.
            var item = items[i];
            // Get the column bounds for the item.
            var config = GridLayout.getCellConfig(item.widget);
            var c1 = Math.min(config.column, maxCol);
            var c2 = Math.min(config.column + config.columnSpan - 1, maxCol);
            // Distribute the minimum width to the sizers as needed.
            Private$b.distributeMin(this._columnSizers, c1, c2, item.minWidth);
        }
        // If no size constraint is needed, just update the parent.
        if (this.fitPolicy === 'set-no-constraint') {
            MessageLoop.sendMessage(this.parent, Widget.Msg.UpdateRequest);
            return;
        }
        // Set up the computed min size.
        var minH = maxRow * this._rowSpacing;
        var minW = maxCol * this._columnSpacing;
        // Add the sizer minimums to the computed min size.
        for (var i = 0, n = this.rowCount; i < n; ++i) {
            minH += this._rowSizers[i].minSize;
        }
        for (var i = 0, n = this.columnCount; i < n; ++i) {
            minW += this._columnSizers[i].minSize;
        }
        // Update the box sizing and add it to the computed min size.
        var box = this._box = ElementExt.boxSizing(this.parent.node);
        minW += box.horizontalSum;
        minH += box.verticalSum;
        // Update the parent's min size constraints.
        var style = this.parent.node.style;
        style.minWidth = minW + "px";
        style.minHeight = minH + "px";
        // Set the dirty flag to ensure only a single update occurs.
        this._dirty = true;
        // Notify the ancestor that it should fit immediately. This may
        // cause a resize of the parent, fulfilling the required update.
        if (this.parent.parent) {
            MessageLoop.sendMessage(this.parent.parent, Widget.Msg.FitRequest);
        }
        // If the dirty flag is still set, the parent was not resized.
        // Trigger the required update on the parent widget immediately.
        if (this._dirty) {
            MessageLoop.sendMessage(this.parent, Widget.Msg.UpdateRequest);
        }
    };
    /**
     * Update the layout position and size of the widgets.
     *
     * The parent offset dimensions should be `-1` if unknown.
     */
    GridLayout.prototype._update = function (offsetWidth, offsetHeight) {
        // Clear the dirty flag to indicate the update occurred.
        this._dirty = false;
        // Measure the parent if the offset dimensions are unknown.
        if (offsetWidth < 0) {
            offsetWidth = this.parent.node.offsetWidth;
        }
        if (offsetHeight < 0) {
            offsetHeight = this.parent.node.offsetHeight;
        }
        // Ensure the parent box sizing data is computed.
        if (!this._box) {
            this._box = ElementExt.boxSizing(this.parent.node);
        }
        // Compute the layout area adjusted for border and padding.
        var top = this._box.paddingTop;
        var left = this._box.paddingLeft;
        var width = offsetWidth - this._box.horizontalSum;
        var height = offsetHeight - this._box.verticalSum;
        // Get the max row and column index.
        var maxRow = this.rowCount - 1;
        var maxCol = this.columnCount - 1;
        // Compute the total fixed row and column space.
        var fixedRowSpace = maxRow * this._rowSpacing;
        var fixedColSpace = maxCol * this._columnSpacing;
        // Distribute the available space to the box sizers.
        BoxEngine.calc(this._rowSizers, Math.max(0, height - fixedRowSpace));
        BoxEngine.calc(this._columnSizers, Math.max(0, width - fixedColSpace));
        // Update the row start positions.
        for (var i = 0, pos = top, n = this.rowCount; i < n; ++i) {
            this._rowStarts[i] = pos;
            pos += this._rowSizers[i].size + this._rowSpacing;
        }
        // Update the column start positions.
        for (var i = 0, pos = left, n = this.columnCount; i < n; ++i) {
            this._columnStarts[i] = pos;
            pos += this._columnSizers[i].size + this._columnSpacing;
        }
        // Update the geometry of the layout items.
        for (var i = 0, n = this._items.length; i < n; ++i) {
            // Fetch the item.
            var item = this._items[i];
            // Ignore hidden items.
            if (item.isHidden) {
                continue;
            }
            // Fetch the cell bounds for the widget.
            var config = GridLayout.getCellConfig(item.widget);
            var r1 = Math.min(config.row, maxRow);
            var c1 = Math.min(config.column, maxCol);
            var r2 = Math.min(config.row + config.rowSpan - 1, maxRow);
            var c2 = Math.min(config.column + config.columnSpan - 1, maxCol);
            // Compute the cell geometry.
            var x = this._columnStarts[c1];
            var y = this._rowStarts[r1];
            var w = this._columnStarts[c2] + this._columnSizers[c2].size - x;
            var h = this._rowStarts[r2] + this._rowSizers[r2].size - y;
            // Update the geometry of the layout item.
            item.update(x, y, w, h);
        }
    };
    return GridLayout;
}(Layout));
/**
 * The namespace for the `GridLayout` class statics.
 */
(function (GridLayout) {
    /**
     * Get the cell config for the given widget.
     *
     * @param widget - The widget of interest.
     *
     * @returns The cell config for the widget.
     */
    function getCellConfig(widget) {
        return Private$b.cellConfigProperty.get(widget);
    }
    GridLayout.getCellConfig = getCellConfig;
    /**
     * Set the cell config for the given widget.
     *
     * @param widget - The widget of interest.
     *
     * @param value - The value for the cell config.
     */
    function setCellConfig(widget, value) {
        Private$b.cellConfigProperty.set(widget, Private$b.normalizeConfig(value));
    }
    GridLayout.setCellConfig = setCellConfig;
})(GridLayout || (GridLayout = {}));
/**
 * The namespace for the module implementation details.
 */
var Private$b;
(function (Private) {
    /**
     * The property descriptor for the widget cell config.
     */
    Private.cellConfigProperty = new AttachedProperty({
        name: 'cellConfig',
        create: function () { return ({ row: 0, column: 0, rowSpan: 1, columnSpan: 1 }); },
        changed: onChildCellConfigChanged
    });
    /**
     * Normalize a partial cell config object.
     */
    function normalizeConfig(config) {
        var row = Math.max(0, Math.floor(config.row || 0));
        var column = Math.max(0, Math.floor(config.column || 0));
        var rowSpan = Math.max(1, Math.floor(config.rowSpan || 0));
        var columnSpan = Math.max(1, Math.floor(config.columnSpan || 0));
        return { row: row, column: column, rowSpan: rowSpan, columnSpan: columnSpan };
    }
    Private.normalizeConfig = normalizeConfig;
    /**
     * Clamp a value to an integer >= 0.
     */
    function clampValue(value) {
        return Math.max(0, Math.floor(value));
    }
    Private.clampValue = clampValue;
    /**
     * A sort comparison function for row spans.
     */
    function rowSpanCmp(a, b) {
        var c1 = Private.cellConfigProperty.get(a.widget);
        var c2 = Private.cellConfigProperty.get(b.widget);
        return c1.rowSpan - c2.rowSpan;
    }
    Private.rowSpanCmp = rowSpanCmp;
    /**
     * A sort comparison function for column spans.
     */
    function columnSpanCmp(a, b) {
        var c1 = Private.cellConfigProperty.get(a.widget);
        var c2 = Private.cellConfigProperty.get(b.widget);
        return c1.columnSpan - c2.columnSpan;
    }
    Private.columnSpanCmp = columnSpanCmp;
    /**
     * Reallocate the box sizers for the given grid dimensions.
     */
    function reallocSizers(sizers, count) {
        // Coerce the count to the valid range.
        count = Math.max(1, Math.floor(count));
        // Add the missing sizers.
        while (sizers.length < count) {
            sizers.push(new BoxSizer());
        }
        // Remove the extra sizers.
        if (sizers.length > count) {
            sizers.length = count;
        }
    }
    Private.reallocSizers = reallocSizers;
    /**
     * Distribute a min size constraint across a range of sizers.
     */
    function distributeMin(sizers, i1, i2, minSize) {
        // Sanity check the indices.
        if (i2 < i1) {
            return;
        }
        // Handle the simple case of no cell span.
        if (i1 === i2) {
            var sizer = sizers[i1];
            sizer.minSize = Math.max(sizer.minSize, minSize);
            return;
        }
        // Compute the total current min size of the span.
        var totalMin = 0;
        for (var i = i1; i <= i2; ++i) {
            totalMin += sizers[i].minSize;
        }
        // Do nothing if the total is greater than the required.
        if (totalMin >= minSize) {
            return;
        }
        // Compute the portion of the space to allocate to each sizer.
        var portion = (minSize - totalMin) / (i2 - i1 + 1);
        // Add the portion to each sizer.
        for (var i = i1; i <= i2; ++i) {
            sizers[i].minSize += portion;
        }
    }
    Private.distributeMin = distributeMin;
    /**
     * The change handler for the child cell config property.
     */
    function onChildCellConfigChanged(child) {
        if (child.parent && child.parent.layout instanceof GridLayout) {
            child.parent.fit();
        }
    }
})(Private$b || (Private$b = {}));

/**
 * A widget which displays menus as a canonical menu bar.
 */
var MenuBar = /** @class */ (function (_super) {
    __extends(MenuBar, _super);
    /**
     * Construct a new menu bar.
     *
     * @param options - The options for initializing the menu bar.
     */
    function MenuBar(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, { node: Private$c.createNode() }) || this;
        _this._activeIndex = -1;
        _this._menus = [];
        _this._childMenu = null;
        _this.addClass('lm-MenuBar');
        /* <DEPRECATED> */
        _this.addClass('p-MenuBar');
        /* </DEPRECATED> */
        _this.setFlag(Widget.Flag.DisallowLayout);
        _this.renderer = options.renderer || MenuBar.defaultRenderer;
        return _this;
    }
    /**
     * Dispose of the resources held by the widget.
     */
    MenuBar.prototype.dispose = function () {
        this._closeChildMenu();
        this._menus.length = 0;
        _super.prototype.dispose.call(this);
    };
    Object.defineProperty(MenuBar.prototype, "childMenu", {
        /**
         * The child menu of the menu bar.
         *
         * #### Notes
         * This will be `null` if the menu bar does not have an open menu.
         */
        get: function () {
            return this._childMenu;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MenuBar.prototype, "contentNode", {
        /**
         * Get the menu bar content node.
         *
         * #### Notes
         * This is the node which holds the menu title nodes.
         *
         * Modifying this node directly can lead to undefined behavior.
         */
        get: function () {
            return this.node.getElementsByClassName('lm-MenuBar-content')[0];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MenuBar.prototype, "activeMenu", {
        /**
         * Get the currently active menu.
         */
        get: function () {
            return this._menus[this._activeIndex] || null;
        },
        /**
         * Set the currently active menu.
         *
         * #### Notes
         * If the menu does not exist, the menu will be set to `null`.
         */
        set: function (value) {
            this.activeIndex = value ? this._menus.indexOf(value) : -1;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MenuBar.prototype, "activeIndex", {
        /**
         * Get the index of the currently active menu.
         *
         * #### Notes
         * This will be `-1` if no menu is active.
         */
        get: function () {
            return this._activeIndex;
        },
        /**
         * Set the index of the currently active menu.
         *
         * #### Notes
         * If the menu cannot be activated, the index will be set to `-1`.
         */
        set: function (value) {
            // Adjust the value for an out of range index.
            if (value < 0 || value >= this._menus.length) {
                value = -1;
            }
            // Bail early if the index will not change.
            if (this._activeIndex === value) {
                return;
            }
            // Update the active index.
            this._activeIndex = value;
            // Schedule an update of the items.
            this.update();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MenuBar.prototype, "menus", {
        /**
         * A read-only array of the menus in the menu bar.
         */
        get: function () {
            return this._menus;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Open the active menu and activate its first menu item.
     *
     * #### Notes
     * If there is no active menu, this is a no-op.
     */
    MenuBar.prototype.openActiveMenu = function () {
        // Bail early if there is no active item.
        if (this._activeIndex === -1) {
            return;
        }
        // Open the child menu.
        this._openChildMenu();
        // Activate the first item in the child menu.
        if (this._childMenu) {
            this._childMenu.activeIndex = -1;
            this._childMenu.activateNextItem();
        }
    };
    /**
     * Add a menu to the end of the menu bar.
     *
     * @param menu - The menu to add to the menu bar.
     *
     * #### Notes
     * If the menu is already added to the menu bar, it will be moved.
     */
    MenuBar.prototype.addMenu = function (menu) {
        this.insertMenu(this._menus.length, menu);
    };
    /**
     * Insert a menu into the menu bar at the specified index.
     *
     * @param index - The index at which to insert the menu.
     *
     * @param menu - The menu to insert into the menu bar.
     *
     * #### Notes
     * The index will be clamped to the bounds of the menus.
     *
     * If the menu is already added to the menu bar, it will be moved.
     */
    MenuBar.prototype.insertMenu = function (index, menu) {
        // Close the child menu before making changes.
        this._closeChildMenu();
        // Look up the index of the menu.
        var i = this._menus.indexOf(menu);
        // Clamp the insert index to the array bounds.
        var j = Math.max(0, Math.min(index, this._menus.length));
        // If the menu is not in the array, insert it.
        if (i === -1) {
            // Insert the menu into the array.
            ArrayExt.insert(this._menus, j, menu);
            // Add the styling class to the menu.
            menu.addClass('lm-MenuBar-menu');
            /* <DEPRECATED> */
            menu.addClass('p-MenuBar-menu');
            /* </DEPRECATED> */
            // Connect to the menu signals.
            menu.aboutToClose.connect(this._onMenuAboutToClose, this);
            menu.menuRequested.connect(this._onMenuMenuRequested, this);
            menu.title.changed.connect(this._onTitleChanged, this);
            // Schedule an update of the items.
            this.update();
            // There is nothing more to do.
            return;
        }
        // Otherwise, the menu exists in the array and should be moved.
        // Adjust the index if the location is at the end of the array.
        if (j === this._menus.length) {
            j--;
        }
        // Bail if there is no effective move.
        if (i === j) {
            return;
        }
        // Move the menu to the new locations.
        ArrayExt.move(this._menus, i, j);
        // Schedule an update of the items.
        this.update();
    };
    /**
     * Remove a menu from the menu bar.
     *
     * @param menu - The menu to remove from the menu bar.
     *
     * #### Notes
     * This is a no-op if the menu is not in the menu bar.
     */
    MenuBar.prototype.removeMenu = function (menu) {
        this.removeMenuAt(this._menus.indexOf(menu));
    };
    /**
     * Remove the menu at a given index from the menu bar.
     *
     * @param index - The index of the menu to remove.
     *
     * #### Notes
     * This is a no-op if the index is out of range.
     */
    MenuBar.prototype.removeMenuAt = function (index) {
        // Close the child menu before making changes.
        this._closeChildMenu();
        // Remove the menu from the array.
        var menu = ArrayExt.removeAt(this._menus, index);
        // Bail if the index is out of range.
        if (!menu) {
            return;
        }
        // Disconnect from the menu signals.
        menu.aboutToClose.disconnect(this._onMenuAboutToClose, this);
        menu.menuRequested.disconnect(this._onMenuMenuRequested, this);
        menu.title.changed.disconnect(this._onTitleChanged, this);
        // Remove the styling class from the menu.
        menu.removeClass('lm-MenuBar-menu');
        /* <DEPRECATED> */
        menu.removeClass('p-MenuBar-menu');
        /* </DEPRECATED> */
        // Schedule an update of the items.
        this.update();
    };
    /**
     * Remove all menus from the menu bar.
     */
    MenuBar.prototype.clearMenus = function () {
        // Bail if there is nothing to remove.
        if (this._menus.length === 0) {
            return;
        }
        // Close the child menu before making changes.
        this._closeChildMenu();
        // Disconnect from the menu signals and remove the styling class.
        for (var _i = 0, _a = this._menus; _i < _a.length; _i++) {
            var menu = _a[_i];
            menu.aboutToClose.disconnect(this._onMenuAboutToClose, this);
            menu.menuRequested.disconnect(this._onMenuMenuRequested, this);
            menu.title.changed.disconnect(this._onTitleChanged, this);
            menu.removeClass('lm-MenuBar-menu');
            /* <DEPRECATED> */
            menu.removeClass('p-MenuBar-menu');
            /* </DEPRECATED> */
        }
        // Clear the menus array.
        this._menus.length = 0;
        // Schedule an update of the items.
        this.update();
    };
    /**
     * Handle the DOM events for the menu bar.
     *
     * @param event - The DOM event sent to the menu bar.
     *
     * #### Notes
     * This method implements the DOM `EventListener` interface and is
     * called in response to events on the menu bar's DOM nodes. It
     * should not be called directly by user code.
     */
    MenuBar.prototype.handleEvent = function (event) {
        switch (event.type) {
            case 'keydown':
                this._evtKeyDown(event);
                break;
            case 'mousedown':
                this._evtMouseDown(event);
                break;
            case 'mousemove':
                this._evtMouseMove(event);
                break;
            case 'mouseleave':
                this._evtMouseLeave(event);
                break;
            case 'contextmenu':
                event.preventDefault();
                event.stopPropagation();
                break;
        }
    };
    /**
     * A message handler invoked on a `'before-attach'` message.
     */
    MenuBar.prototype.onBeforeAttach = function (msg) {
        this.node.addEventListener('keydown', this);
        this.node.addEventListener('mousedown', this);
        this.node.addEventListener('mousemove', this);
        this.node.addEventListener('mouseleave', this);
        this.node.addEventListener('contextmenu', this);
    };
    /**
     * A message handler invoked on an `'after-detach'` message.
     */
    MenuBar.prototype.onAfterDetach = function (msg) {
        this.node.removeEventListener('keydown', this);
        this.node.removeEventListener('mousedown', this);
        this.node.removeEventListener('mousemove', this);
        this.node.removeEventListener('mouseleave', this);
        this.node.removeEventListener('contextmenu', this);
        this._closeChildMenu();
    };
    /**
     * A message handler invoked on an `'activate-request'` message.
     */
    MenuBar.prototype.onActivateRequest = function (msg) {
        if (this.isAttached) {
            this.node.focus();
        }
    };
    /**
     * A message handler invoked on an `'update-request'` message.
     */
    MenuBar.prototype.onUpdateRequest = function (msg) {
        var menus = this._menus;
        var renderer = this.renderer;
        var activeIndex = this._activeIndex;
        var content = new Array(menus.length);
        for (var i = 0, n = menus.length; i < n; ++i) {
            var title = menus[i].title;
            var active = i === activeIndex;
            content[i] = renderer.renderItem({ title: title, active: active });
        }
        VirtualDOM.render(content, this.contentNode);
    };
    /**
     * Handle the `'keydown'` event for the menu bar.
     */
    MenuBar.prototype._evtKeyDown = function (event) {
        // A menu bar handles all keydown events.
        event.preventDefault();
        event.stopPropagation();
        // Fetch the key code for the event.
        var kc = event.keyCode;
        // Enter, Up Arrow, Down Arrow
        if (kc === 13 || kc === 38 || kc === 40) {
            this.openActiveMenu();
            return;
        }
        // Escape
        if (kc === 27) {
            this._closeChildMenu();
            this.activeIndex = -1;
            this.node.blur();
            return;
        }
        // Left Arrow
        if (kc === 37) {
            var i = this._activeIndex;
            var n = this._menus.length;
            this.activeIndex = i === 0 ? n - 1 : i - 1;
            return;
        }
        // Right Arrow
        if (kc === 39) {
            var i = this._activeIndex;
            var n = this._menus.length;
            this.activeIndex = i === n - 1 ? 0 : i + 1;
            return;
        }
        // Get the pressed key character.
        var key = getKeyboardLayout().keyForKeydownEvent(event);
        // Bail if the key is not valid.
        if (!key) {
            return;
        }
        // Search for the next best matching mnemonic item.
        var start = this._activeIndex + 1;
        var result = Private$c.findMnemonic(this._menus, key, start);
        // Handle the requested mnemonic based on the search results.
        // If exactly one mnemonic is matched, that menu is opened.
        // Otherwise, the next mnemonic is activated if available,
        // followed by the auto mnemonic if available.
        if (result.index !== -1 && !result.multiple) {
            this.activeIndex = result.index;
            this.openActiveMenu();
        }
        else if (result.index !== -1) {
            this.activeIndex = result.index;
        }
        else if (result.auto !== -1) {
            this.activeIndex = result.auto;
        }
    };
    /**
     * Handle the `'mousedown'` event for the menu bar.
     */
    MenuBar.prototype._evtMouseDown = function (event) {
        // Bail if the mouse press was not on the menu bar. This can occur
        // when the document listener is installed for an active menu bar.
        if (!ElementExt.hitTest(this.node, event.clientX, event.clientY)) {
            return;
        }
        // Stop the propagation of the event. Immediate propagation is
        // also stopped so that an open menu does not handle the event.
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        // Check if the mouse is over one of the menu items.
        var index = ArrayExt.findFirstIndex(this.contentNode.children, function (node) {
            return ElementExt.hitTest(node, event.clientX, event.clientY);
        });
        // If the press was not on an item, close the child menu.
        if (index === -1) {
            this._closeChildMenu();
            return;
        }
        // If the press was not the left mouse button, do nothing further.
        if (event.button !== 0) {
            return;
        }
        // Otherwise, toggle the open state of the child menu.
        if (this._childMenu) {
            this._closeChildMenu();
            this.activeIndex = index;
        }
        else {
            this.activeIndex = index;
            this._openChildMenu();
        }
    };
    /**
     * Handle the `'mousemove'` event for the menu bar.
     */
    MenuBar.prototype._evtMouseMove = function (event) {
        // Check if the mouse is over one of the menu items.
        var index = ArrayExt.findFirstIndex(this.contentNode.children, function (node) {
            return ElementExt.hitTest(node, event.clientX, event.clientY);
        });
        // Bail early if the active index will not change.
        if (index === this._activeIndex) {
            return;
        }
        // Bail early if a child menu is open and the mouse is not over
        // an item. This allows the child menu to be kept open when the
        // mouse is over the empty part of the menu bar.
        if (index === -1 && this._childMenu) {
            return;
        }
        // Update the active index to the hovered item.
        this.activeIndex = index;
        // Open the new menu if a menu is already open.
        if (this._childMenu) {
            this._openChildMenu();
        }
    };
    /**
     * Handle the `'mouseleave'` event for the menu bar.
     */
    MenuBar.prototype._evtMouseLeave = function (event) {
        // Reset the active index if there is no open menu.
        if (!this._childMenu) {
            this.activeIndex = -1;
        }
    };
    /**
     * Open the child menu at the active index immediately.
     *
     * If a different child menu is already open, it will be closed,
     * even if there is no active menu.
     */
    MenuBar.prototype._openChildMenu = function () {
        // If there is no active menu, close the current menu.
        var newMenu = this.activeMenu;
        if (!newMenu) {
            this._closeChildMenu();
            return;
        }
        // Bail if there is no effective menu change.
        var oldMenu = this._childMenu;
        if (oldMenu === newMenu) {
            return;
        }
        // Swap the internal menu reference.
        this._childMenu = newMenu;
        // Close the current menu, or setup for the new menu.
        if (oldMenu) {
            oldMenu.close();
        }
        else {
            this.addClass('lm-mod-active');
            /* <DEPRECATED> */
            this.addClass('p-mod-active');
            /* </DEPRECATED> */
            document.addEventListener('mousedown', this, true);
        }
        // Ensure the menu bar is updated and look up the item node.
        MessageLoop.sendMessage(this, Widget.Msg.UpdateRequest);
        var itemNode = this.contentNode.children[this._activeIndex];
        // Get the positioning data for the new menu.
        var _a = itemNode.getBoundingClientRect(), left = _a.left, bottom = _a.bottom;
        // Open the new menu at the computed location.
        newMenu.open(left, bottom, { forceX: true, forceY: true });
    };
    /**
     * Close the child menu immediately.
     *
     * This is a no-op if a child menu is not open.
     */
    MenuBar.prototype._closeChildMenu = function () {
        // Bail if no child menu is open.
        if (!this._childMenu) {
            return;
        }
        // Remove the active class from the menu bar.
        this.removeClass('lm-mod-active');
        /* <DEPRECATED> */
        this.removeClass('p-mod-active');
        /* </DEPRECATED> */
        // Remove the document listeners.
        document.removeEventListener('mousedown', this, true);
        // Clear the internal menu reference.
        var menu = this._childMenu;
        this._childMenu = null;
        // Close the menu.
        menu.close();
        // Reset the active index.
        this.activeIndex = -1;
    };
    /**
     * Handle the `aboutToClose` signal of a menu.
     */
    MenuBar.prototype._onMenuAboutToClose = function (sender) {
        // Bail if the sender is not the child menu.
        if (sender !== this._childMenu) {
            return;
        }
        // Remove the active class from the menu bar.
        this.removeClass('lm-mod-active');
        /* <DEPRECATED> */
        this.removeClass('p-mod-active');
        /* </DEPRECATED> */
        // Remove the document listeners.
        document.removeEventListener('mousedown', this, true);
        // Clear the internal menu reference.
        this._childMenu = null;
        // Reset the active index.
        this.activeIndex = -1;
    };
    /**
     * Handle the `menuRequested` signal of a child menu.
     */
    MenuBar.prototype._onMenuMenuRequested = function (sender, args) {
        // Bail if the sender is not the child menu.
        if (sender !== this._childMenu) {
            return;
        }
        // Look up the active index and menu count.
        var i = this._activeIndex;
        var n = this._menus.length;
        // Active the next requested index.
        switch (args) {
            case 'next':
                this.activeIndex = i === n - 1 ? 0 : i + 1;
                break;
            case 'previous':
                this.activeIndex = i === 0 ? n - 1 : i - 1;
                break;
        }
        // Open the active menu.
        this.openActiveMenu();
    };
    /**
     * Handle the `changed` signal of a title object.
     */
    MenuBar.prototype._onTitleChanged = function () {
        this.update();
    };
    return MenuBar;
}(Widget));
/**
 * The namespace for the `MenuBar` class statics.
 */
(function (MenuBar) {
    /**
     * The default implementation of `IRenderer`.
     *
     * #### Notes
     * Subclasses are free to reimplement rendering methods as needed.
     */
    var Renderer = /** @class */ (function () {
        /**
         * Construct a new renderer.
         */
        function Renderer() {
        }
        /**
         * Render the virtual element for a menu bar item.
         *
         * @param data - The data to use for rendering the item.
         *
         * @returns A virtual element representing the item.
         */
        Renderer.prototype.renderItem = function (data) {
            var className = this.createItemClass(data);
            var dataset = this.createItemDataset(data);
            var aria = this.createItemARIA(data);
            return (h.li(__assign({ className: className, dataset: dataset }, aria), this.renderIcon(data), this.renderLabel(data)));
        };
        /**
         * Render the icon element for a menu bar item.
         *
         * @param data - The data to use for rendering the icon.
         *
         * @returns A virtual element representing the item icon.
         */
        Renderer.prototype.renderIcon = function (data) {
            var className = this.createIconClass(data);
            /* <DEPRECATED> */
            if (typeof data.title.icon === 'string') {
                return h.div({ className: className }, data.title.iconLabel);
            }
            /* </DEPRECATED> */
            // if data.title.icon is undefined, it will be ignored
            return h.div({ className: className }, data.title.icon, data.title.iconLabel);
        };
        /**
         * Render the label element for a menu item.
         *
         * @param data - The data to use for rendering the label.
         *
         * @returns A virtual element representing the item label.
         */
        Renderer.prototype.renderLabel = function (data) {
            var content = this.formatLabel(data);
            return h.div({ className: 'lm-MenuBar-itemLabel'
                    /* <DEPRECATED> */
                    + ' p-MenuBar-itemLabel'
                /* </DEPRECATED> */
            }, content);
        };
        /**
         * Create the class name for the menu bar item.
         *
         * @param data - The data to use for the class name.
         *
         * @returns The full class name for the menu item.
         */
        Renderer.prototype.createItemClass = function (data) {
            var name = 'lm-MenuBar-item';
            /* <DEPRECATED> */
            name += ' p-MenuBar-item';
            /* </DEPRECATED> */
            if (data.title.className) {
                name += " " + data.title.className;
            }
            if (data.active) {
                name += ' lm-mod-active';
                /* <DEPRECATED> */
                name += ' p-mod-active';
                /* </DEPRECATED> */
            }
            return name;
        };
        /**
         * Create the dataset for a menu bar item.
         *
         * @param data - The data to use for the item.
         *
         * @returns The dataset for the menu bar item.
         */
        Renderer.prototype.createItemDataset = function (data) {
            return data.title.dataset;
        };
        /**
         * Create the aria attributes for menu bar item.
         *
         * @param data - The data to use for the aria attributes.
         *
         * @returns The aria attributes object for the item.
         */
        Renderer.prototype.createItemARIA = function (data) {
            return { role: 'menuitem', 'aria-haspopup': 'true' };
        };
        /**
         * Create the class name for the menu bar item icon.
         *
         * @param data - The data to use for the class name.
         *
         * @returns The full class name for the item icon.
         */
        Renderer.prototype.createIconClass = function (data) {
            var name = 'lm-MenuBar-itemIcon';
            /* <DEPRECATED> */
            name += ' p-MenuBar-itemIcon';
            /* </DEPRECATED> */
            var extra = data.title.iconClass;
            return extra ? name + " " + extra : name;
        };
        /**
         * Create the render content for the label node.
         *
         * @param data - The data to use for the label content.
         *
         * @returns The content to add to the label node.
         */
        Renderer.prototype.formatLabel = function (data) {
            // Fetch the label text and mnemonic index.
            var _a = data.title, label = _a.label, mnemonic = _a.mnemonic;
            // If the index is out of range, do not modify the label.
            if (mnemonic < 0 || mnemonic >= label.length) {
                return label;
            }
            // Split the label into parts.
            var prefix = label.slice(0, mnemonic);
            var suffix = label.slice(mnemonic + 1);
            var char = label[mnemonic];
            // Wrap the mnemonic character in a span.
            var span = h.span({
                className: 'lm-MenuBar-itemMnemonic'
                    /* <DEPRECATED> */
                    + ' p-MenuBar-itemMnemonic'
                /* </DEPRECATED> */
            }, char);
            // Return the content parts.
            return [prefix, span, suffix];
        };
        return Renderer;
    }());
    MenuBar.Renderer = Renderer;
    /**
     * The default `Renderer` instance.
     */
    MenuBar.defaultRenderer = new Renderer();
})(MenuBar || (MenuBar = {}));
/**
 * The namespace for the module implementation details.
 */
var Private$c;
(function (Private) {
    /**
     * Create the DOM node for a menu bar.
     */
    function createNode() {
        var node = document.createElement('div');
        var content = document.createElement('ul');
        content.className = 'lm-MenuBar-content';
        /* <DEPRECATED> */
        content.classList.add('p-MenuBar-content');
        /* </DEPRECATED> */
        node.appendChild(content);
        content.setAttribute('role', 'menubar');
        node.tabIndex = -1;
        return node;
    }
    Private.createNode = createNode;
    /**
     * Find the best matching mnemonic item.
     *
     * The search starts at the given index and wraps around.
     */
    function findMnemonic(menus, key, start) {
        // Setup the result variables.
        var index = -1;
        var auto = -1;
        var multiple = false;
        // Normalize the key to upper case.
        var upperKey = key.toUpperCase();
        // Search the items from the given start index.
        for (var i = 0, n = menus.length; i < n; ++i) {
            // Compute the wrapped index.
            var k = (i + start) % n;
            // Look up the menu title.
            var title = menus[k].title;
            // Ignore titles with an empty label.
            if (title.label.length === 0) {
                continue;
            }
            // Look up the mnemonic index for the label.
            var mn = title.mnemonic;
            // Handle a valid mnemonic index.
            if (mn >= 0 && mn < title.label.length) {
                if (title.label[mn].toUpperCase() === upperKey) {
                    if (index === -1) {
                        index = k;
                    }
                    else {
                        multiple = true;
                    }
                }
                continue;
            }
            // Finally, handle the auto index if possible.
            if (auto === -1 && title.label[0].toUpperCase() === upperKey) {
                auto = k;
            }
        }
        // Return the search results.
        return { index: index, multiple: multiple, auto: auto };
    }
    Private.findMnemonic = findMnemonic;
})(Private$c || (Private$c = {}));

/**
 * A widget which implements a canonical scroll bar.
 */
var ScrollBar = /** @class */ (function (_super) {
    __extends(ScrollBar, _super);
    /**
     * Construct a new scroll bar.
     *
     * @param options - The options for initializing the scroll bar.
     */
    function ScrollBar(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, { node: Private$d.createNode() }) || this;
        /**
         * A timeout callback for repeating the mouse press.
         */
        _this._onRepeat = function () {
            // Clear the repeat timer id.
            _this._repeatTimer = -1;
            // Bail if the mouse has been released.
            if (!_this._pressData) {
                return;
            }
            // Look up the part that was pressed.
            var part = _this._pressData.part;
            // Bail if the thumb was pressed.
            if (part === 'thumb') {
                return;
            }
            // Schedule the timer for another repeat.
            _this._repeatTimer = window.setTimeout(_this._onRepeat, 20);
            // Get the current mouse position.
            var mouseX = _this._pressData.mouseX;
            var mouseY = _this._pressData.mouseY;
            // Handle a decrement button repeat.
            if (part === 'decrement') {
                // Bail if the mouse is not over the button.
                if (!ElementExt.hitTest(_this.decrementNode, mouseX, mouseY)) {
                    return;
                }
                // Emit the step requested signal.
                _this._stepRequested.emit('decrement');
                // Finished.
                return;
            }
            // Handle an increment button repeat.
            if (part === 'increment') {
                // Bail if the mouse is not over the button.
                if (!ElementExt.hitTest(_this.incrementNode, mouseX, mouseY)) {
                    return;
                }
                // Emit the step requested signal.
                _this._stepRequested.emit('increment');
                // Finished.
                return;
            }
            // Handle a track repeat.
            if (part === 'track') {
                // Bail if the mouse is not over the track.
                if (!ElementExt.hitTest(_this.trackNode, mouseX, mouseY)) {
                    return;
                }
                // Fetch the thumb node.
                var thumbNode = _this.thumbNode;
                // Bail if the mouse is over the thumb.
                if (ElementExt.hitTest(thumbNode, mouseX, mouseY)) {
                    return;
                }
                // Fetch the client rect for the thumb.
                var thumbRect = thumbNode.getBoundingClientRect();
                // Determine the direction for the page request.
                var dir = void 0;
                if (_this._orientation === 'horizontal') {
                    dir = mouseX < thumbRect.left ? 'decrement' : 'increment';
                }
                else {
                    dir = mouseY < thumbRect.top ? 'decrement' : 'increment';
                }
                // Emit the page requested signal.
                _this._pageRequested.emit(dir);
                // Finished.
                return;
            }
        };
        _this._value = 0;
        _this._page = 10;
        _this._maximum = 100;
        _this._repeatTimer = -1;
        _this._pressData = null;
        _this._thumbMoved = new Signal(_this);
        _this._stepRequested = new Signal(_this);
        _this._pageRequested = new Signal(_this);
        _this.addClass('lm-ScrollBar');
        /* <DEPRECATED> */
        _this.addClass('p-ScrollBar');
        /* </DEPRECATED> */
        _this.setFlag(Widget.Flag.DisallowLayout);
        // Set the orientation.
        _this._orientation = options.orientation || 'vertical';
        _this.dataset['orientation'] = _this._orientation;
        // Parse the rest of the options.
        if (options.maximum !== undefined) {
            _this._maximum = Math.max(0, options.maximum);
        }
        if (options.page !== undefined) {
            _this._page = Math.max(0, options.page);
        }
        if (options.value !== undefined) {
            _this._value = Math.max(0, Math.min(options.value, _this._maximum));
        }
        return _this;
    }
    Object.defineProperty(ScrollBar.prototype, "thumbMoved", {
        /**
         * A signal emitted when the user moves the scroll thumb.
         *
         * #### Notes
         * The payload is the current value of the scroll bar.
         */
        get: function () {
            return this._thumbMoved;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScrollBar.prototype, "stepRequested", {
        /**
         * A signal emitted when the user clicks a step button.
         *
         * #### Notes
         * The payload is whether a decrease or increase is requested.
         */
        get: function () {
            return this._stepRequested;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScrollBar.prototype, "pageRequested", {
        /**
         * A signal emitted when the user clicks the scroll track.
         *
         * #### Notes
         * The payload is whether a decrease or increase is requested.
         */
        get: function () {
            return this._pageRequested;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScrollBar.prototype, "orientation", {
        /**
         * Get the orientation of the scroll bar.
         */
        get: function () {
            return this._orientation;
        },
        /**
         * Set the orientation of the scroll bar.
         */
        set: function (value) {
            // Do nothing if the orientation does not change.
            if (this._orientation === value) {
                return;
            }
            // Release the mouse before making changes.
            this._releaseMouse();
            // Update the internal orientation.
            this._orientation = value;
            this.dataset['orientation'] = value;
            // Schedule an update the scroll bar.
            this.update();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScrollBar.prototype, "value", {
        /**
         * Get the current value of the scroll bar.
         */
        get: function () {
            return this._value;
        },
        /**
         * Set the current value of the scroll bar.
         *
         * #### Notes
         * The value will be clamped to the range `[0, maximum]`.
         */
        set: function (value) {
            // Clamp the value to the allowable range.
            value = Math.max(0, Math.min(value, this._maximum));
            // Do nothing if the value does not change.
            if (this._value === value) {
                return;
            }
            // Update the internal value.
            this._value = value;
            // Schedule an update the scroll bar.
            this.update();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScrollBar.prototype, "page", {
        /**
         * Get the page size of the scroll bar.
         *
         * #### Notes
         * The page size is the amount of visible content in the scrolled
         * region, expressed in data units. It determines the size of the
         * scroll bar thumb.
         */
        get: function () {
            return this._page;
        },
        /**
         * Set the page size of the scroll bar.
         *
         * #### Notes
         * The page size will be clamped to the range `[0, Infinity]`.
         */
        set: function (value) {
            // Clamp the page size to the allowable range.
            value = Math.max(0, value);
            // Do nothing if the value does not change.
            if (this._page === value) {
                return;
            }
            // Update the internal page size.
            this._page = value;
            // Schedule an update the scroll bar.
            this.update();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScrollBar.prototype, "maximum", {
        /**
         * Get the maximum value of the scroll bar.
         */
        get: function () {
            return this._maximum;
        },
        /**
         * Set the maximum value of the scroll bar.
         *
         * #### Notes
         * The max size will be clamped to the range `[0, Infinity]`.
         */
        set: function (value) {
            // Clamp the value to the allowable range.
            value = Math.max(0, value);
            // Do nothing if the value does not change.
            if (this._maximum === value) {
                return;
            }
            // Update the internal values.
            this._maximum = value;
            // Clamp the current value to the new range.
            this._value = Math.min(this._value, value);
            // Schedule an update the scroll bar.
            this.update();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScrollBar.prototype, "decrementNode", {
        /**
         * The scroll bar decrement button node.
         *
         * #### Notes
         * Modifying this node directly can lead to undefined behavior.
         */
        get: function () {
            return this.node.getElementsByClassName('lm-ScrollBar-button')[0];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScrollBar.prototype, "incrementNode", {
        /**
         * The scroll bar increment button node.
         *
         * #### Notes
         * Modifying this node directly can lead to undefined behavior.
         */
        get: function () {
            return this.node.getElementsByClassName('lm-ScrollBar-button')[1];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScrollBar.prototype, "trackNode", {
        /**
         * The scroll bar track node.
         *
         * #### Notes
         * Modifying this node directly can lead to undefined behavior.
         */
        get: function () {
            return this.node.getElementsByClassName('lm-ScrollBar-track')[0];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScrollBar.prototype, "thumbNode", {
        /**
         * The scroll bar thumb node.
         *
         * #### Notes
         * Modifying this node directly can lead to undefined behavior.
         */
        get: function () {
            return this.node.getElementsByClassName('lm-ScrollBar-thumb')[0];
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Handle the DOM events for the scroll bar.
     *
     * @param event - The DOM event sent to the scroll bar.
     *
     * #### Notes
     * This method implements the DOM `EventListener` interface and is
     * called in response to events on the scroll bar's DOM node.
     *
     * This should not be called directly by user code.
     */
    ScrollBar.prototype.handleEvent = function (event) {
        switch (event.type) {
            case 'mousedown':
                this._evtMouseDown(event);
                break;
            case 'mousemove':
                this._evtMouseMove(event);
                break;
            case 'mouseup':
                this._evtMouseUp(event);
                break;
            case 'keydown':
                this._evtKeyDown(event);
                break;
            case 'contextmenu':
                event.preventDefault();
                event.stopPropagation();
                break;
        }
    };
    /**
     * A method invoked on a 'before-attach' message.
     */
    ScrollBar.prototype.onBeforeAttach = function (msg) {
        this.node.addEventListener('mousedown', this);
        this.update();
    };
    /**
     * A method invoked on an 'after-detach' message.
     */
    ScrollBar.prototype.onAfterDetach = function (msg) {
        this.node.removeEventListener('mousedown', this);
        this._releaseMouse();
    };
    /**
     * A method invoked on an 'update-request' message.
     */
    ScrollBar.prototype.onUpdateRequest = function (msg) {
        // Convert the value and page into percentages.
        var value = this._value * 100 / this._maximum;
        var page = this._page * 100 / (this._page + this._maximum);
        // Clamp the value and page to the relevant range.
        value = Math.max(0, Math.min(value, 100));
        page = Math.max(0, Math.min(page, 100));
        // Fetch the thumb style.
        var thumbStyle = this.thumbNode.style;
        // Update the thumb style for the current orientation.
        if (this._orientation === 'horizontal') {
            thumbStyle.top = '';
            thumbStyle.height = '';
            thumbStyle.left = value + "%";
            thumbStyle.width = page + "%";
            thumbStyle.transform = "translate(" + -value + "%, 0%)";
        }
        else {
            thumbStyle.left = '';
            thumbStyle.width = '';
            thumbStyle.top = value + "%";
            thumbStyle.height = page + "%";
            thumbStyle.transform = "translate(0%, " + -value + "%)";
        }
    };
    /**
     * Handle the `'keydown'` event for the scroll bar.
     */
    ScrollBar.prototype._evtKeyDown = function (event) {
        // Stop all input events during drag.
        event.preventDefault();
        event.stopPropagation();
        // Ignore anything except the `Escape` key.
        if (event.keyCode !== 27) {
            return;
        }
        // Fetch the previous scroll value.
        var value = this._pressData ? this._pressData.value : -1;
        // Release the mouse.
        this._releaseMouse();
        // Restore the old scroll value if possible.
        if (value !== -1) {
            this._moveThumb(value);
        }
    };
    /**
     * Handle the `'mousedown'` event for the scroll bar.
     */
    ScrollBar.prototype._evtMouseDown = function (event) {
        // Do nothing if it's not a left mouse press.
        if (event.button !== 0) {
            return;
        }
        // Send an activate request to the scroll bar. This can be
        // used by message hooks to activate something relevant.
        this.activate();
        // Do nothing if the mouse is already captured.
        if (this._pressData) {
            return;
        }
        // Find the pressed scroll bar part.
        var part = Private$d.findPart(this, event.target);
        // Do nothing if the part is not of interest.
        if (!part) {
            return;
        }
        // Stop the event propagation.
        event.preventDefault();
        event.stopPropagation();
        // Override the mouse cursor.
        var override = Drag.overrideCursor('default');
        // Set up the press data.
        this._pressData = {
            part: part, override: override,
            delta: -1, value: -1,
            mouseX: event.clientX,
            mouseY: event.clientY
        };
        // Add the extra event listeners.
        document.addEventListener('mousemove', this, true);
        document.addEventListener('mouseup', this, true);
        document.addEventListener('keydown', this, true);
        document.addEventListener('contextmenu', this, true);
        // Handle a thumb press.
        if (part === 'thumb') {
            // Fetch the thumb node.
            var thumbNode = this.thumbNode;
            // Fetch the client rect for the thumb.
            var thumbRect = thumbNode.getBoundingClientRect();
            // Update the press data delta for the current orientation.
            if (this._orientation === 'horizontal') {
                this._pressData.delta = event.clientX - thumbRect.left;
            }
            else {
                this._pressData.delta = event.clientY - thumbRect.top;
            }
            // Add the active class to the thumb node.
            thumbNode.classList.add('lm-mod-active');
            /* <DEPRECATED> */
            thumbNode.classList.add('p-mod-active');
            /* </DEPRECATED> */
            // Store the current value in the press data.
            this._pressData.value = this._value;
            // Finished.
            return;
        }
        // Handle a track press.
        if (part === 'track') {
            // Fetch the client rect for the thumb.
            var thumbRect = this.thumbNode.getBoundingClientRect();
            // Determine the direction for the page request.
            var dir = void 0;
            if (this._orientation === 'horizontal') {
                dir = event.clientX < thumbRect.left ? 'decrement' : 'increment';
            }
            else {
                dir = event.clientY < thumbRect.top ? 'decrement' : 'increment';
            }
            // Start the repeat timer.
            this._repeatTimer = window.setTimeout(this._onRepeat, 350);
            // Emit the page requested signal.
            this._pageRequested.emit(dir);
            // Finished.
            return;
        }
        // Handle a decrement button press.
        if (part === 'decrement') {
            // Add the active class to the decrement node.
            this.decrementNode.classList.add('lm-mod-active');
            /* <DEPRECATED> */
            this.decrementNode.classList.add('p-mod-active');
            /* </DEPRECATED> */
            // Start the repeat timer.
            this._repeatTimer = window.setTimeout(this._onRepeat, 350);
            // Emit the step requested signal.
            this._stepRequested.emit('decrement');
            // Finished.
            return;
        }
        // Handle an increment button press.
        if (part === 'increment') {
            // Add the active class to the increment node.
            this.incrementNode.classList.add('lm-mod-active');
            /* <DEPRECATED> */
            this.incrementNode.classList.add('p-mod-active');
            /* </DEPRECATED> */
            // Start the repeat timer.
            this._repeatTimer = window.setTimeout(this._onRepeat, 350);
            // Emit the step requested signal.
            this._stepRequested.emit('increment');
            // Finished.
            return;
        }
    };
    /**
     * Handle the `'mousemove'` event for the scroll bar.
     */
    ScrollBar.prototype._evtMouseMove = function (event) {
        // Do nothing if no drag is in progress.
        if (!this._pressData) {
            return;
        }
        // Stop the event propagation.
        event.preventDefault();
        event.stopPropagation();
        // Update the mouse position.
        this._pressData.mouseX = event.clientX;
        this._pressData.mouseY = event.clientY;
        // Bail if the thumb is not being dragged.
        if (this._pressData.part !== 'thumb') {
            return;
        }
        // Get the client rect for the thumb and track.
        var thumbRect = this.thumbNode.getBoundingClientRect();
        var trackRect = this.trackNode.getBoundingClientRect();
        // Fetch the scroll geometry based on the orientation.
        var trackPos;
        var trackSpan;
        if (this._orientation === 'horizontal') {
            trackPos = event.clientX - trackRect.left - this._pressData.delta;
            trackSpan = trackRect.width - thumbRect.width;
        }
        else {
            trackPos = event.clientY - trackRect.top - this._pressData.delta;
            trackSpan = trackRect.height - thumbRect.height;
        }
        // Compute the desired value from the scroll geometry.
        var value = trackSpan === 0 ? 0 : trackPos * this._maximum / trackSpan;
        // Move the thumb to the computed value.
        this._moveThumb(value);
    };
    /**
     * Handle the `'mouseup'` event for the scroll bar.
     */
    ScrollBar.prototype._evtMouseUp = function (event) {
        // Do nothing if it's not a left mouse release.
        if (event.button !== 0) {
            return;
        }
        // Stop the event propagation.
        event.preventDefault();
        event.stopPropagation();
        // Release the mouse.
        this._releaseMouse();
    };
    /**
     * Release the mouse and restore the node states.
     */
    ScrollBar.prototype._releaseMouse = function () {
        // Bail if there is no press data.
        if (!this._pressData) {
            return;
        }
        // Clear the repeat timer.
        clearTimeout(this._repeatTimer);
        this._repeatTimer = -1;
        // Clear the press data.
        this._pressData.override.dispose();
        this._pressData = null;
        // Remove the extra event listeners.
        document.removeEventListener('mousemove', this, true);
        document.removeEventListener('mouseup', this, true);
        document.removeEventListener('keydown', this, true);
        document.removeEventListener('contextmenu', this, true);
        // Remove the active classes from the nodes.
        this.thumbNode.classList.remove('lm-mod-active');
        this.decrementNode.classList.remove('lm-mod-active');
        this.incrementNode.classList.remove('lm-mod-active');
        /* <DEPRECATED> */
        this.thumbNode.classList.remove('p-mod-active');
        this.decrementNode.classList.remove('p-mod-active');
        this.incrementNode.classList.remove('p-mod-active');
        /* </DEPRECATED> */
    };
    /**
     * Move the thumb to the specified position.
     */
    ScrollBar.prototype._moveThumb = function (value) {
        // Clamp the value to the allowed range.
        value = Math.max(0, Math.min(value, this._maximum));
        // Bail if the value does not change.
        if (this._value === value) {
            return;
        }
        // Update the internal value.
        this._value = value;
        // Schedule an update of the scroll bar.
        this.update();
        // Emit the thumb moved signal.
        this._thumbMoved.emit(value);
    };
    return ScrollBar;
}(Widget));
/**
 * The namespace for the module implementation details.
 */
var Private$d;
(function (Private) {
    /**
     * Create the DOM node for a scroll bar.
     */
    function createNode() {
        var node = document.createElement('div');
        var decrement = document.createElement('div');
        var increment = document.createElement('div');
        var track = document.createElement('div');
        var thumb = document.createElement('div');
        decrement.className = 'lm-ScrollBar-button';
        increment.className = 'lm-ScrollBar-button';
        decrement.dataset['action'] = 'decrement';
        increment.dataset['action'] = 'increment';
        track.className = 'lm-ScrollBar-track';
        thumb.className = 'lm-ScrollBar-thumb';
        /* <DEPRECATED> */
        decrement.classList.add('p-ScrollBar-button');
        increment.classList.add('p-ScrollBar-button');
        track.classList.add('p-ScrollBar-track');
        thumb.classList.add('p-ScrollBar-thumb');
        /* </DEPRECATED> */
        track.appendChild(thumb);
        node.appendChild(decrement);
        node.appendChild(track);
        node.appendChild(increment);
        return node;
    }
    Private.createNode = createNode;
    /**
     * Find the scroll bar part which contains the given target.
     */
    function findPart(scrollBar, target) {
        // Test the thumb.
        if (scrollBar.thumbNode.contains(target)) {
            return 'thumb';
        }
        // Test the track.
        if (scrollBar.trackNode.contains(target)) {
            return 'track';
        }
        // Test the decrement button.
        if (scrollBar.decrementNode.contains(target)) {
            return 'decrement';
        }
        // Test the increment button.
        if (scrollBar.incrementNode.contains(target)) {
            return 'increment';
        }
        // Indicate no match.
        return null;
    }
    Private.findPart = findPart;
})(Private$d || (Private$d = {}));

/**
 * A concrete layout implementation which holds a single widget.
 *
 * #### Notes
 * This class is useful for creating simple container widgets which
 * hold a single child. The child should be positioned with CSS.
 */
var SingletonLayout = /** @class */ (function (_super) {
    __extends(SingletonLayout, _super);
    function SingletonLayout() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this._widget = null;
        return _this;
    }
    /**
     * Dispose of the resources held by the layout.
     */
    SingletonLayout.prototype.dispose = function () {
        if (this._widget) {
            var widget = this._widget;
            this._widget = null;
            widget.dispose();
        }
        _super.prototype.dispose.call(this);
    };
    Object.defineProperty(SingletonLayout.prototype, "widget", {
        /**
         * Get the child widget for the layout.
         */
        get: function () {
            return this._widget;
        },
        /**
         * Set the child widget for the layout.
         *
         * #### Notes
         * Setting the child widget will cause the old child widget to be
         * automatically disposed. If that is not desired, set the parent
         * of the old child to `null` before assigning a new child.
         */
        set: function (widget) {
            // Remove the widget from its current parent. This is a no-op
            // if the widget's parent is already the layout parent widget.
            if (widget) {
                widget.parent = this.parent;
            }
            // Bail early if the widget does not change.
            if (this._widget === widget) {
                return;
            }
            // Dispose of the old child widget.
            if (this._widget) {
                this._widget.dispose();
            }
            // Update the internal widget.
            this._widget = widget;
            // Attach the new child widget if needed.
            if (this.parent && widget) {
                this.attachWidget(widget);
            }
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Create an iterator over the widgets in the layout.
     *
     * @returns A new iterator over the widgets in the layout.
     */
    SingletonLayout.prototype.iter = function () {
        return this._widget ? once(this._widget) : empty();
    };
    /**
     * Remove a widget from the layout.
     *
     * @param widget - The widget to remove from the layout.
     *
     * #### Notes
     * A widget is automatically removed from the layout when its `parent`
     * is set to `null`. This method should only be invoked directly when
     * removing a widget from a layout which has yet to be installed on a
     * parent widget.
     *
     * This method does *not* modify the widget's `parent`.
     */
    SingletonLayout.prototype.removeWidget = function (widget) {
        // Bail early if the widget does not exist in the layout.
        if (this._widget !== widget) {
            return;
        }
        // Clear the internal widget.
        this._widget = null;
        // If the layout is parented, detach the widget from the DOM.
        if (this.parent) {
            this.detachWidget(widget);
        }
    };
    /**
     * Perform layout initialization which requires the parent widget.
     */
    SingletonLayout.prototype.init = function () {
        var _this = this;
        _super.prototype.init.call(this);
        each(this, function (widget) { _this.attachWidget(widget); });
    };
    /**
     * Attach a widget to the parent's DOM node.
     *
     * @param index - The current index of the widget in the layout.
     *
     * @param widget - The widget to attach to the parent.
     *
     * #### Notes
     * This method is called automatically by the single layout at the
     * appropriate time. It should not be called directly by user code.
     *
     * The default implementation adds the widgets's node to the parent's
     * node at the proper location, and sends the appropriate attach
     * messages to the widget if the parent is attached to the DOM.
     *
     * Subclasses may reimplement this method to control how the widget's
     * node is added to the parent's node.
     */
    SingletonLayout.prototype.attachWidget = function (widget) {
        // Send a `'before-attach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
        }
        // Add the widget's node to the parent.
        this.parent.node.appendChild(widget.node);
        // Send an `'after-attach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
        }
    };
    /**
     * Detach a widget from the parent's DOM node.
     *
     * @param widget - The widget to detach from the parent.
     *
     * #### Notes
     * This method is called automatically by the single layout at the
     * appropriate time. It should not be called directly by user code.
     *
     * The default implementation removes the widget's node from the
     * parent's node, and sends the appropriate detach messages to the
     * widget if the parent is attached to the DOM.
     *
     * Subclasses may reimplement this method to control how the widget's
     * node is removed from the parent's node.
     */
    SingletonLayout.prototype.detachWidget = function (widget) {
        // Send a `'before-detach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
        }
        // Remove the widget's node from the parent.
        this.parent.node.removeChild(widget.node);
        // Send an `'after-detach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
        }
    };
    return SingletonLayout;
}(Layout));

/**
 * A layout which arranges its widgets into resizable sections.
 */
var SplitLayout = /** @class */ (function (_super) {
    __extends(SplitLayout, _super);
    /**
     * Construct a new split layout.
     *
     * @param options - The options for initializing the layout.
     */
    function SplitLayout(options) {
        var _this = _super.call(this) || this;
        _this._fixed = 0;
        _this._spacing = 4;
        _this._dirty = false;
        _this._hasNormedSizes = false;
        _this._sizers = [];
        _this._items = [];
        _this._handles = [];
        _this._box = null;
        _this._alignment = 'start';
        _this._orientation = 'horizontal';
        _this.renderer = options.renderer;
        if (options.orientation !== undefined) {
            _this._orientation = options.orientation;
        }
        if (options.alignment !== undefined) {
            _this._alignment = options.alignment;
        }
        if (options.spacing !== undefined) {
            _this._spacing = Private$e.clampSpacing(options.spacing);
        }
        return _this;
    }
    /**
     * Dispose of the resources held by the layout.
     */
    SplitLayout.prototype.dispose = function () {
        // Dispose of the layout items.
        each(this._items, function (item) { item.dispose(); });
        // Clear the layout state.
        this._box = null;
        this._items.length = 0;
        this._sizers.length = 0;
        this._handles.length = 0;
        // Dispose of the rest of the layout.
        _super.prototype.dispose.call(this);
    };
    Object.defineProperty(SplitLayout.prototype, "orientation", {
        /**
         * Get the layout orientation for the split layout.
         */
        get: function () {
            return this._orientation;
        },
        /**
         * Set the layout orientation for the split layout.
         */
        set: function (value) {
            if (this._orientation === value) {
                return;
            }
            this._orientation = value;
            if (!this.parent) {
                return;
            }
            this.parent.dataset['orientation'] = value;
            this.parent.fit();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitLayout.prototype, "alignment", {
        /**
         * Get the content alignment for the split layout.
         *
         * #### Notes
         * This is the alignment of the widgets in the layout direction.
         *
         * The alignment has no effect if the widgets can expand  to fill the
         * entire split layout.
         */
        get: function () {
            return this._alignment;
        },
        /**
         * Set the content alignment for the split layout.
         *
         * #### Notes
         * This is the alignment of the widgets in the layout direction.
         *
         * The alignment has no effect if the widgets can expand  to fill the
         * entire split layout.
         */
        set: function (value) {
            if (this._alignment === value) {
                return;
            }
            this._alignment = value;
            if (!this.parent) {
                return;
            }
            this.parent.dataset['alignment'] = value;
            this.parent.update();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitLayout.prototype, "spacing", {
        /**
         * Get the inter-element spacing for the split layout.
         */
        get: function () {
            return this._spacing;
        },
        /**
         * Set the inter-element spacing for the split layout.
         */
        set: function (value) {
            value = Private$e.clampSpacing(value);
            if (this._spacing === value) {
                return;
            }
            this._spacing = value;
            if (!this.parent) {
                return;
            }
            this.parent.fit();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitLayout.prototype, "handles", {
        /**
         * A read-only array of the split handles in the layout.
         */
        get: function () {
            return this._handles;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Get the relative sizes of the widgets in the layout.
     *
     * @returns A new array of the relative sizes of the widgets.
     *
     * #### Notes
     * The returned sizes reflect the sizes of the widgets normalized
     * relative to their siblings.
     *
     * This method **does not** measure the DOM nodes.
     */
    SplitLayout.prototype.relativeSizes = function () {
        return Private$e.normalize(this._sizers.map(function (sizer) { return sizer.size; }));
    };
    /**
     * Set the relative sizes for the widgets in the layout.
     *
     * @param sizes - The relative sizes for the widgets in the panel.
     *
     * #### Notes
     * Extra values are ignored, too few will yield an undefined layout.
     *
     * The actual geometry of the DOM nodes is updated asynchronously.
     */
    SplitLayout.prototype.setRelativeSizes = function (sizes) {
        // Copy the sizes and pad with zeros as needed.
        var n = this._sizers.length;
        var temp = sizes.slice(0, n);
        while (temp.length < n) {
            temp.push(0);
        }
        // Normalize the padded sizes.
        var normed = Private$e.normalize(temp);
        // Apply the normalized sizes to the sizers.
        for (var i = 0; i < n; ++i) {
            var sizer = this._sizers[i];
            sizer.sizeHint = normed[i];
            sizer.size = normed[i];
        }
        // Set the flag indicating the sizes are normalized.
        this._hasNormedSizes = true;
        // Trigger an update of the parent widget.
        if (this.parent) {
            this.parent.update();
        }
    };
    /**
     * Move the offset position of a split handle.
     *
     * @param index - The index of the handle of the interest.
     *
     * @param position - The desired offset position of the handle.
     *
     * #### Notes
     * The position is relative to the offset parent.
     *
     * This will move the handle as close as possible to the desired
     * position. The sibling widgets will be adjusted as necessary.
     */
    SplitLayout.prototype.moveHandle = function (index, position) {
        // Bail if the index is invalid or the handle is hidden.
        var handle = this._handles[index];
        if (!handle || handle.classList.contains('lm-mod-hidden')) {
            return;
        }
        // Compute the desired delta movement for the handle.
        var delta;
        if (this._orientation === 'horizontal') {
            delta = position - handle.offsetLeft;
        }
        else {
            delta = position - handle.offsetTop;
        }
        // Bail if there is no handle movement.
        if (delta === 0) {
            return;
        }
        // Prevent widget resizing unless needed.
        for (var _i = 0, _a = this._sizers; _i < _a.length; _i++) {
            var sizer = _a[_i];
            if (sizer.size > 0) {
                sizer.sizeHint = sizer.size;
            }
        }
        // Adjust the sizers to reflect the handle movement.
        BoxEngine.adjust(this._sizers, index, delta);
        // Update the layout of the widgets.
        if (this.parent) {
            this.parent.update();
        }
    };
    /**
     * Perform layout initialization which requires the parent widget.
     */
    SplitLayout.prototype.init = function () {
        this.parent.dataset['orientation'] = this.orientation;
        this.parent.dataset['alignment'] = this.alignment;
        _super.prototype.init.call(this);
    };
    /**
     * Attach a widget to the parent's DOM node.
     *
     * @param index - The current index of the widget in the layout.
     *
     * @param widget - The widget to attach to the parent.
     *
     * #### Notes
     * This is a reimplementation of the superclass method.
     */
    SplitLayout.prototype.attachWidget = function (index, widget) {
        // Create the item, handle, and sizer for the new widget.
        var item = new LayoutItem(widget);
        var handle = Private$e.createHandle(this.renderer);
        var average = Private$e.averageSize(this._sizers);
        var sizer = Private$e.createSizer(average);
        // Insert the item, handle, and sizer into the internal arrays.
        ArrayExt.insert(this._items, index, item);
        ArrayExt.insert(this._sizers, index, sizer);
        ArrayExt.insert(this._handles, index, handle);
        // Send a `'before-attach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
        }
        // Add the widget and handle nodes to the parent.
        this.parent.node.appendChild(widget.node);
        this.parent.node.appendChild(handle);
        // Send an `'after-attach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
        }
        // Post a fit request for the parent widget.
        this.parent.fit();
    };
    /**
     * Move a widget in the parent's DOM node.
     *
     * @param fromIndex - The previous index of the widget in the layout.
     *
     * @param toIndex - The current index of the widget in the layout.
     *
     * @param widget - The widget to move in the parent.
     *
     * #### Notes
     * This is a reimplementation of the superclass method.
     */
    SplitLayout.prototype.moveWidget = function (fromIndex, toIndex, widget) {
        // Move the item, sizer, and handle for the widget.
        ArrayExt.move(this._items, fromIndex, toIndex);
        ArrayExt.move(this._sizers, fromIndex, toIndex);
        ArrayExt.move(this._handles, fromIndex, toIndex);
        // Post a fit request to the parent to show/hide last handle.
        this.parent.fit();
    };
    /**
     * Detach a widget from the parent's DOM node.
     *
     * @param index - The previous index of the widget in the layout.
     *
     * @param widget - The widget to detach from the parent.
     *
     * #### Notes
     * This is a reimplementation of the superclass method.
     */
    SplitLayout.prototype.detachWidget = function (index, widget) {
        // Remove the item, handle, and sizer for the widget.
        var item = ArrayExt.removeAt(this._items, index);
        var handle = ArrayExt.removeAt(this._handles, index);
        ArrayExt.removeAt(this._sizers, index);
        // Send a `'before-detach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
        }
        // Remove the widget and handle nodes from the parent.
        this.parent.node.removeChild(widget.node);
        this.parent.node.removeChild(handle);
        // Send an `'after-detach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
        }
        // Dispose of the layout item.
        item.dispose();
        // Post a fit request for the parent widget.
        this.parent.fit();
    };
    /**
     * A message handler invoked on a `'before-show'` message.
     */
    SplitLayout.prototype.onBeforeShow = function (msg) {
        _super.prototype.onBeforeShow.call(this, msg);
        this.parent.update();
    };
    /**
     * A message handler invoked on a `'before-attach'` message.
     */
    SplitLayout.prototype.onBeforeAttach = function (msg) {
        _super.prototype.onBeforeAttach.call(this, msg);
        this.parent.fit();
    };
    /**
     * A message handler invoked on a `'child-shown'` message.
     */
    SplitLayout.prototype.onChildShown = function (msg) {
        this.parent.fit();
    };
    /**
     * A message handler invoked on a `'child-hidden'` message.
     */
    SplitLayout.prototype.onChildHidden = function (msg) {
        this.parent.fit();
    };
    /**
     * A message handler invoked on a `'resize'` message.
     */
    SplitLayout.prototype.onResize = function (msg) {
        if (this.parent.isVisible) {
            this._update(msg.width, msg.height);
        }
    };
    /**
     * A message handler invoked on an `'update-request'` message.
     */
    SplitLayout.prototype.onUpdateRequest = function (msg) {
        if (this.parent.isVisible) {
            this._update(-1, -1);
        }
    };
    /**
     * A message handler invoked on a `'fit-request'` message.
     */
    SplitLayout.prototype.onFitRequest = function (msg) {
        if (this.parent.isAttached) {
            this._fit();
        }
    };
    /**
     * Fit the layout to the total size required by the widgets.
     */
    SplitLayout.prototype._fit = function () {
        // Update the handles and track the visible widget count.
        var nVisible = 0;
        var lastHandleIndex = -1;
        for (var i = 0, n = this._items.length; i < n; ++i) {
            if (this._items[i].isHidden) {
                this._handles[i].classList.add('lm-mod-hidden');
                /* <DEPRECATED> */
                this._handles[i].classList.add('p-mod-hidden');
                /* </DEPRECATED> */
            }
            else {
                this._handles[i].classList.remove('lm-mod-hidden');
                /* <DEPRECATED> */
                this._handles[i].classList.remove('p-mod-hidden');
                /* </DEPRECATED> */
                lastHandleIndex = i;
                nVisible++;
            }
        }
        // Hide the handle for the last visible widget.
        if (lastHandleIndex !== -1) {
            this._handles[lastHandleIndex].classList.add('lm-mod-hidden');
            /* <DEPRECATED> */
            this._handles[lastHandleIndex].classList.add('p-mod-hidden');
            /* </DEPRECATED> */
        }
        // Update the fixed space for the visible items.
        this._fixed = this._spacing * Math.max(0, nVisible - 1);
        // Setup the computed minimum size.
        var horz = this._orientation === 'horizontal';
        var minW = horz ? this._fixed : 0;
        var minH = horz ? 0 : this._fixed;
        // Update the sizers and computed size limits.
        for (var i = 0, n = this._items.length; i < n; ++i) {
            // Fetch the item and corresponding box sizer.
            var item = this._items[i];
            var sizer = this._sizers[i];
            // Prevent resizing unless necessary.
            if (sizer.size > 0) {
                sizer.sizeHint = sizer.size;
            }
            // If the item is hidden, it should consume zero size.
            if (item.isHidden) {
                sizer.minSize = 0;
                sizer.maxSize = 0;
                continue;
            }
            // Update the size limits for the item.
            item.fit();
            // Update the stretch factor.
            sizer.stretch = SplitLayout.getStretch(item.widget);
            // Update the sizer limits and computed min size.
            if (horz) {
                sizer.minSize = item.minWidth;
                sizer.maxSize = item.maxWidth;
                minW += item.minWidth;
                minH = Math.max(minH, item.minHeight);
            }
            else {
                sizer.minSize = item.minHeight;
                sizer.maxSize = item.maxHeight;
                minH += item.minHeight;
                minW = Math.max(minW, item.minWidth);
            }
        }
        // Update the box sizing and add it to the computed min size.
        var box = this._box = ElementExt.boxSizing(this.parent.node);
        minW += box.horizontalSum;
        minH += box.verticalSum;
        // Update the parent's min size constraints.
        var style = this.parent.node.style;
        style.minWidth = minW + "px";
        style.minHeight = minH + "px";
        // Set the dirty flag to ensure only a single update occurs.
        this._dirty = true;
        // Notify the ancestor that it should fit immediately. This may
        // cause a resize of the parent, fulfilling the required update.
        if (this.parent.parent) {
            MessageLoop.sendMessage(this.parent.parent, Widget.Msg.FitRequest);
        }
        // If the dirty flag is still set, the parent was not resized.
        // Trigger the required update on the parent widget immediately.
        if (this._dirty) {
            MessageLoop.sendMessage(this.parent, Widget.Msg.UpdateRequest);
        }
    };
    /**
     * Update the layout position and size of the widgets.
     *
     * The parent offset dimensions should be `-1` if unknown.
     */
    SplitLayout.prototype._update = function (offsetWidth, offsetHeight) {
        // Clear the dirty flag to indicate the update occurred.
        this._dirty = false;
        // Compute the visible item count.
        var nVisible = 0;
        for (var i = 0, n = this._items.length; i < n; ++i) {
            nVisible += +!this._items[i].isHidden;
        }
        // Bail early if there are no visible items to layout.
        if (nVisible === 0) {
            return;
        }
        // Measure the parent if the offset dimensions are unknown.
        if (offsetWidth < 0) {
            offsetWidth = this.parent.node.offsetWidth;
        }
        if (offsetHeight < 0) {
            offsetHeight = this.parent.node.offsetHeight;
        }
        // Ensure the parent box sizing data is computed.
        if (!this._box) {
            this._box = ElementExt.boxSizing(this.parent.node);
        }
        // Compute the actual layout bounds adjusted for border and padding.
        var top = this._box.paddingTop;
        var left = this._box.paddingLeft;
        var width = offsetWidth - this._box.horizontalSum;
        var height = offsetHeight - this._box.verticalSum;
        // Compute the adjusted layout space.
        var space;
        var horz = this._orientation === 'horizontal';
        if (horz) {
            space = Math.max(0, width - this._fixed);
        }
        else {
            space = Math.max(0, height - this._fixed);
        }
        // Scale the size hints if they are normalized.
        if (this._hasNormedSizes) {
            for (var _i = 0, _a = this._sizers; _i < _a.length; _i++) {
                var sizer = _a[_i];
                sizer.sizeHint *= space;
            }
            this._hasNormedSizes = false;
        }
        // Distribute the layout space to the box sizers.
        var delta = BoxEngine.calc(this._sizers, space);
        // Set up the variables for justification and alignment offset.
        var extra = 0;
        var offset = 0;
        // Account for alignment if there is extra layout space.
        if (delta > 0) {
            switch (this._alignment) {
                case 'start':
                    break;
                case 'center':
                    extra = 0;
                    offset = delta / 2;
                    break;
                case 'end':
                    extra = 0;
                    offset = delta;
                    break;
                case 'justify':
                    extra = delta / nVisible;
                    offset = 0;
                    break;
                default:
                    throw 'unreachable';
            }
        }
        // Layout the items using the computed box sizes.
        for (var i = 0, n = this._items.length; i < n; ++i) {
            // Fetch the item.
            var item = this._items[i];
            // Ignore hidden items.
            if (item.isHidden) {
                continue;
            }
            // Fetch the computed size for the widget.
            var size = this._sizers[i].size;
            // Fetch the style for the handle.
            var handleStyle = this._handles[i].style;
            // Update the widget and handle, and advance the relevant edge.
            if (horz) {
                item.update(left + offset, top, size + extra, height);
                left += size + extra;
                handleStyle.top = top + "px";
                handleStyle.left = left + offset + "px";
                handleStyle.width = this._spacing + "px";
                handleStyle.height = height + "px";
                left += this._spacing;
            }
            else {
                item.update(left, top + offset, width, size + extra);
                top += size + extra;
                handleStyle.top = top + offset + "px";
                handleStyle.left = left + "px";
                handleStyle.width = width + "px";
                handleStyle.height = this._spacing + "px";
                top += this._spacing;
            }
        }
    };
    return SplitLayout;
}(PanelLayout));
/**
 * The namespace for the `SplitLayout` class statics.
 */
(function (SplitLayout) {
    /**
     * Get the split layout stretch factor for the given widget.
     *
     * @param widget - The widget of interest.
     *
     * @returns The split layout stretch factor for the widget.
     */
    function getStretch(widget) {
        return Private$e.stretchProperty.get(widget);
    }
    SplitLayout.getStretch = getStretch;
    /**
     * Set the split layout stretch factor for the given widget.
     *
     * @param widget - The widget of interest.
     *
     * @param value - The value for the stretch factor.
     */
    function setStretch(widget, value) {
        Private$e.stretchProperty.set(widget, value);
    }
    SplitLayout.setStretch = setStretch;
})(SplitLayout || (SplitLayout = {}));
/**
 * The namespace for the module implementation details.
 */
var Private$e;
(function (Private) {
    /**
     * The property descriptor for a widget stretch factor.
     */
    Private.stretchProperty = new AttachedProperty({
        name: 'stretch',
        create: function () { return 0; },
        coerce: function (owner, value) { return Math.max(0, Math.floor(value)); },
        changed: onChildSizingChanged
    });
    /**
     * Create a new box sizer with the given size hint.
     */
    function createSizer(size) {
        var sizer = new BoxSizer();
        sizer.sizeHint = Math.floor(size);
        return sizer;
    }
    Private.createSizer = createSizer;
    /**
     * Create a new split handle node using the given renderer.
     */
    function createHandle(renderer) {
        var handle = renderer.createHandle();
        handle.style.position = 'absolute';
        return handle;
    }
    Private.createHandle = createHandle;
    /**
     * Clamp a spacing value to an integer >= 0.
     */
    function clampSpacing(value) {
        return Math.max(0, Math.floor(value));
    }
    Private.clampSpacing = clampSpacing;
    /**
     * Compute the average size of an array of box sizers.
     */
    function averageSize(sizers) {
        return sizers.reduce(function (v, s) { return v + s.size; }, 0) / sizers.length || 0;
    }
    Private.averageSize = averageSize;
    /**
     * Normalize an array of values.
     */
    function normalize(values) {
        var n = values.length;
        if (n === 0) {
            return [];
        }
        var sum = values.reduce(function (a, b) { return a + Math.abs(b); }, 0);
        return sum === 0 ? values.map(function (v) { return 1 / n; }) : values.map(function (v) { return v / sum; });
    }
    Private.normalize = normalize;
    /**
     * The change handler for the attached sizing properties.
     */
    function onChildSizingChanged(child) {
        if (child.parent && child.parent.layout instanceof SplitLayout) {
            child.parent.fit();
        }
    }
})(Private$e || (Private$e = {}));

/**
 * A panel which arranges its widgets into resizable sections.
 *
 * #### Notes
 * This class provides a convenience wrapper around a [[SplitLayout]].
 */
var SplitPanel = /** @class */ (function (_super) {
    __extends(SplitPanel, _super);
    /**
     * Construct a new split panel.
     *
     * @param options - The options for initializing the split panel.
     */
    function SplitPanel(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, { layout: Private$f.createLayout(options) }) || this;
        _this._pressData = null;
        _this.addClass('lm-SplitPanel');
        /* <DEPRECATED> */
        _this.addClass('p-SplitPanel');
        return _this;
        /* </DEPRECATED> */
    }
    /**
     * Dispose of the resources held by the panel.
     */
    SplitPanel.prototype.dispose = function () {
        this._releaseMouse();
        _super.prototype.dispose.call(this);
    };
    Object.defineProperty(SplitPanel.prototype, "orientation", {
        /**
         * Get the layout orientation for the split panel.
         */
        get: function () {
            return this.layout.orientation;
        },
        /**
         * Set the layout orientation for the split panel.
         */
        set: function (value) {
            this.layout.orientation = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitPanel.prototype, "alignment", {
        /**
         * Get the content alignment for the split panel.
         *
         * #### Notes
         * This is the alignment of the widgets in the layout direction.
         *
         * The alignment has no effect if the widgets can expand to fill the
         * entire split panel.
         */
        get: function () {
            return this.layout.alignment;
        },
        /**
         * Set the content alignment for the split panel.
         *
         * #### Notes
         * This is the alignment of the widgets in the layout direction.
         *
         * The alignment has no effect if the widgets can expand to fill the
         * entire split panel.
         */
        set: function (value) {
            this.layout.alignment = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitPanel.prototype, "spacing", {
        /**
         * Get the inter-element spacing for the split panel.
         */
        get: function () {
            return this.layout.spacing;
        },
        /**
         * Set the inter-element spacing for the split panel.
         */
        set: function (value) {
            this.layout.spacing = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitPanel.prototype, "renderer", {
        /**
         * The renderer used by the split panel.
         */
        get: function () {
            return this.layout.renderer;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitPanel.prototype, "handles", {
        /**
         * A read-only array of the split handles in the panel.
         */
        get: function () {
            return this.layout.handles;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Get the relative sizes of the widgets in the panel.
     *
     * @returns A new array of the relative sizes of the widgets.
     *
     * #### Notes
     * The returned sizes reflect the sizes of the widgets normalized
     * relative to their siblings.
     *
     * This method **does not** measure the DOM nodes.
     */
    SplitPanel.prototype.relativeSizes = function () {
        return this.layout.relativeSizes();
    };
    /**
     * Set the relative sizes for the widgets in the panel.
     *
     * @param sizes - The relative sizes for the widgets in the panel.
     *
     * #### Notes
     * Extra values are ignored, too few will yield an undefined layout.
     *
     * The actual geometry of the DOM nodes is updated asynchronously.
     */
    SplitPanel.prototype.setRelativeSizes = function (sizes) {
        this.layout.setRelativeSizes(sizes);
    };
    /**
     * Handle the DOM events for the split panel.
     *
     * @param event - The DOM event sent to the panel.
     *
     * #### Notes
     * This method implements the DOM `EventListener` interface and is
     * called in response to events on the panel's DOM node. It should
     * not be called directly by user code.
     */
    SplitPanel.prototype.handleEvent = function (event) {
        switch (event.type) {
            case 'mousedown':
                this._evtMouseDown(event);
                break;
            case 'mousemove':
                this._evtMouseMove(event);
                break;
            case 'mouseup':
                this._evtMouseUp(event);
                break;
            case 'keydown':
                this._evtKeyDown(event);
                break;
            case 'contextmenu':
                event.preventDefault();
                event.stopPropagation();
                break;
        }
    };
    /**
     * A message handler invoked on a `'before-attach'` message.
     */
    SplitPanel.prototype.onBeforeAttach = function (msg) {
        this.node.addEventListener('mousedown', this);
    };
    /**
     * A message handler invoked on an `'after-detach'` message.
     */
    SplitPanel.prototype.onAfterDetach = function (msg) {
        this.node.removeEventListener('mousedown', this);
        this._releaseMouse();
    };
    /**
     * A message handler invoked on a `'child-added'` message.
     */
    SplitPanel.prototype.onChildAdded = function (msg) {
        msg.child.addClass('lm-SplitPanel-child');
        /* <DEPRECATED> */
        msg.child.addClass('p-SplitPanel-child');
        /* </DEPRECATED> */
        this._releaseMouse();
    };
    /**
     * A message handler invoked on a `'child-removed'` message.
     */
    SplitPanel.prototype.onChildRemoved = function (msg) {
        msg.child.removeClass('lm-SplitPanel-child');
        /* <DEPRECATED> */
        msg.child.removeClass('p-SplitPanel-child');
        /* </DEPRECATED> */
        this._releaseMouse();
    };
    /**
     * Handle the `'keydown'` event for the split panel.
     */
    SplitPanel.prototype._evtKeyDown = function (event) {
        // Stop input events during drag.
        event.preventDefault();
        event.stopPropagation();
        // Release the mouse if `Escape` is pressed.
        if (event.keyCode === 27) {
            this._releaseMouse();
        }
    };
    /**
     * Handle the `'mousedown'` event for the split panel.
     */
    SplitPanel.prototype._evtMouseDown = function (event) {
        // Do nothing if the left mouse button is not pressed.
        if (event.button !== 0) {
            return;
        }
        // Find the handle which contains the mouse target, if any.
        var layout = this.layout;
        var index = ArrayExt.findFirstIndex(layout.handles, function (handle) {
            return handle.contains(event.target);
        });
        // Bail early if the mouse press was not on a handle.
        if (index === -1) {
            return;
        }
        // Stop the event when a split handle is pressed.
        event.preventDefault();
        event.stopPropagation();
        // Add the extra document listeners.
        document.addEventListener('mouseup', this, true);
        document.addEventListener('mousemove', this, true);
        document.addEventListener('keydown', this, true);
        document.addEventListener('contextmenu', this, true);
        // Compute the offset delta for the handle press.
        var delta;
        var handle = layout.handles[index];
        var rect = handle.getBoundingClientRect();
        if (layout.orientation === 'horizontal') {
            delta = event.clientX - rect.left;
        }
        else {
            delta = event.clientY - rect.top;
        }
        // Override the cursor and store the press data.
        var style = window.getComputedStyle(handle);
        var override = Drag.overrideCursor(style.cursor);
        this._pressData = { index: index, delta: delta, override: override };
    };
    /**
     * Handle the `'mousemove'` event for the split panel.
     */
    SplitPanel.prototype._evtMouseMove = function (event) {
        // Stop the event when dragging a split handle.
        event.preventDefault();
        event.stopPropagation();
        // Compute the desired offset position for the handle.
        var pos;
        var layout = this.layout;
        var rect = this.node.getBoundingClientRect();
        if (layout.orientation === 'horizontal') {
            pos = event.clientX - rect.left - this._pressData.delta;
        }
        else {
            pos = event.clientY - rect.top - this._pressData.delta;
        }
        // Move the handle as close to the desired position as possible.
        layout.moveHandle(this._pressData.index, pos);
    };
    /**
     * Handle the `'mouseup'` event for the split panel.
     */
    SplitPanel.prototype._evtMouseUp = function (event) {
        // Do nothing if the left mouse button is not released.
        if (event.button !== 0) {
            return;
        }
        // Stop the event when releasing a handle.
        event.preventDefault();
        event.stopPropagation();
        // Finalize the mouse release.
        this._releaseMouse();
    };
    /**
     * Release the mouse grab for the split panel.
     */
    SplitPanel.prototype._releaseMouse = function () {
        // Bail early if no drag is in progress.
        if (!this._pressData) {
            return;
        }
        // Clear the override cursor.
        this._pressData.override.dispose();
        this._pressData = null;
        // Remove the extra document listeners.
        document.removeEventListener('mouseup', this, true);
        document.removeEventListener('mousemove', this, true);
        document.removeEventListener('keydown', this, true);
        document.removeEventListener('contextmenu', this, true);
    };
    return SplitPanel;
}(Panel));
/**
 * The namespace for the `SplitPanel` class statics.
 */
(function (SplitPanel) {
    /**
     * The default implementation of `IRenderer`.
     */
    var Renderer = /** @class */ (function () {
        function Renderer() {
        }
        /**
         * Create a new handle for use with a split panel.
         *
         * @returns A new handle element for a split panel.
         */
        Renderer.prototype.createHandle = function () {
            var handle = document.createElement('div');
            handle.className = 'lm-SplitPanel-handle';
            /* <DEPRECATED> */
            handle.classList.add('p-SplitPanel-handle');
            /* </DEPRECATED> */
            return handle;
        };
        return Renderer;
    }());
    SplitPanel.Renderer = Renderer;
    /**
     * The default `Renderer` instance.
     */
    SplitPanel.defaultRenderer = new Renderer();
    /**
     * Get the split panel stretch factor for the given widget.
     *
     * @param widget - The widget of interest.
     *
     * @returns The split panel stretch factor for the widget.
     */
    function getStretch(widget) {
        return SplitLayout.getStretch(widget);
    }
    SplitPanel.getStretch = getStretch;
    /**
     * Set the split panel stretch factor for the given widget.
     *
     * @param widget - The widget of interest.
     *
     * @param value - The value for the stretch factor.
     */
    function setStretch(widget, value) {
        SplitLayout.setStretch(widget, value);
    }
    SplitPanel.setStretch = setStretch;
})(SplitPanel || (SplitPanel = {}));
/**
 * The namespace for the module implementation details.
 */
var Private$f;
(function (Private) {
    /**
     * Create a split layout for the given panel options.
     */
    function createLayout(options) {
        return options.layout || new SplitLayout({
            renderer: options.renderer || SplitPanel.defaultRenderer,
            orientation: options.orientation,
            alignment: options.alignment,
            spacing: options.spacing
        });
    }
    Private.createLayout = createLayout;
})(Private$f || (Private$f = {}));

/**
 * A layout where visible widgets are stacked atop one another.
 *
 * #### Notes
 * The Z-order of the visible widgets follows their layout order.
 */
var StackedLayout = /** @class */ (function (_super) {
    __extends(StackedLayout, _super);
    function StackedLayout() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this._dirty = false;
        _this._items = [];
        _this._box = null;
        return _this;
    }
    /**
     * Dispose of the resources held by the layout.
     */
    StackedLayout.prototype.dispose = function () {
        // Dispose of the layout items.
        each(this._items, function (item) { item.dispose(); });
        // Clear the layout state.
        this._box = null;
        this._items.length = 0;
        // Dispose of the rest of the layout.
        _super.prototype.dispose.call(this);
    };
    /**
     * Attach a widget to the parent's DOM node.
     *
     * @param index - The current index of the widget in the layout.
     *
     * @param widget - The widget to attach to the parent.
     *
     * #### Notes
     * This is a reimplementation of the superclass method.
     */
    StackedLayout.prototype.attachWidget = function (index, widget) {
        // Create and add a new layout item for the widget.
        ArrayExt.insert(this._items, index, new LayoutItem(widget));
        // Send a `'before-attach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
        }
        // Add the widget's node to the parent.
        this.parent.node.appendChild(widget.node);
        // Send an `'after-attach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
        }
        // Post a fit request for the parent widget.
        this.parent.fit();
    };
    /**
     * Move a widget in the parent's DOM node.
     *
     * @param fromIndex - The previous index of the widget in the layout.
     *
     * @param toIndex - The current index of the widget in the layout.
     *
     * @param widget - The widget to move in the parent.
     *
     * #### Notes
     * This is a reimplementation of the superclass method.
     */
    StackedLayout.prototype.moveWidget = function (fromIndex, toIndex, widget) {
        // Move the layout item for the widget.
        ArrayExt.move(this._items, fromIndex, toIndex);
        // Post an update request for the parent widget.
        this.parent.update();
    };
    /**
     * Detach a widget from the parent's DOM node.
     *
     * @param index - The previous index of the widget in the layout.
     *
     * @param widget - The widget to detach from the parent.
     *
     * #### Notes
     * This is a reimplementation of the superclass method.
     */
    StackedLayout.prototype.detachWidget = function (index, widget) {
        // Remove the layout item for the widget.
        var item = ArrayExt.removeAt(this._items, index);
        // Send a `'before-detach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
        }
        // Remove the widget's node from the parent.
        this.parent.node.removeChild(widget.node);
        // Send an `'after-detach'` message if the parent is attached.
        if (this.parent.isAttached) {
            MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
        }
        // Reset the z-index for the widget.
        item.widget.node.style.zIndex = '';
        // Dispose of the layout item.
        item.dispose();
        // Post a fit request for the parent widget.
        this.parent.fit();
    };
    /**
     * A message handler invoked on a `'before-show'` message.
     */
    StackedLayout.prototype.onBeforeShow = function (msg) {
        _super.prototype.onBeforeShow.call(this, msg);
        this.parent.update();
    };
    /**
     * A message handler invoked on a `'before-attach'` message.
     */
    StackedLayout.prototype.onBeforeAttach = function (msg) {
        _super.prototype.onBeforeAttach.call(this, msg);
        this.parent.fit();
    };
    /**
     * A message handler invoked on a `'child-shown'` message.
     */
    StackedLayout.prototype.onChildShown = function (msg) {
        this.parent.fit();
    };
    /**
     * A message handler invoked on a `'child-hidden'` message.
     */
    StackedLayout.prototype.onChildHidden = function (msg) {
        this.parent.fit();
    };
    /**
     * A message handler invoked on a `'resize'` message.
     */
    StackedLayout.prototype.onResize = function (msg) {
        if (this.parent.isVisible) {
            this._update(msg.width, msg.height);
        }
    };
    /**
     * A message handler invoked on an `'update-request'` message.
     */
    StackedLayout.prototype.onUpdateRequest = function (msg) {
        if (this.parent.isVisible) {
            this._update(-1, -1);
        }
    };
    /**
     * A message handler invoked on a `'fit-request'` message.
     */
    StackedLayout.prototype.onFitRequest = function (msg) {
        if (this.parent.isAttached) {
            this._fit();
        }
    };
    /**
     * Fit the layout to the total size required by the widgets.
     */
    StackedLayout.prototype._fit = function () {
        // Set up the computed minimum size.
        var minW = 0;
        var minH = 0;
        // Update the computed minimum size.
        for (var i = 0, n = this._items.length; i < n; ++i) {
            // Fetch the item.
            var item = this._items[i];
            // Ignore hidden items.
            if (item.isHidden) {
                continue;
            }
            // Update the size limits for the item.
            item.fit();
            // Update the computed minimum size.
            minW = Math.max(minW, item.minWidth);
            minH = Math.max(minH, item.minHeight);
        }
        // Update the box sizing and add it to the computed min size.
        var box = this._box = ElementExt.boxSizing(this.parent.node);
        minW += box.horizontalSum;
        minH += box.verticalSum;
        // Update the parent's min size constraints.
        var style = this.parent.node.style;
        style.minWidth = minW + "px";
        style.minHeight = minH + "px";
        // Set the dirty flag to ensure only a single update occurs.
        this._dirty = true;
        // Notify the ancestor that it should fit immediately. This may
        // cause a resize of the parent, fulfilling the required update.
        if (this.parent.parent) {
            MessageLoop.sendMessage(this.parent.parent, Widget.Msg.FitRequest);
        }
        // If the dirty flag is still set, the parent was not resized.
        // Trigger the required update on the parent widget immediately.
        if (this._dirty) {
            MessageLoop.sendMessage(this.parent, Widget.Msg.UpdateRequest);
        }
    };
    /**
     * Update the layout position and size of the widgets.
     *
     * The parent offset dimensions should be `-1` if unknown.
     */
    StackedLayout.prototype._update = function (offsetWidth, offsetHeight) {
        // Clear the dirty flag to indicate the update occurred.
        this._dirty = false;
        // Compute the visible item count.
        var nVisible = 0;
        for (var i = 0, n = this._items.length; i < n; ++i) {
            nVisible += +!this._items[i].isHidden;
        }
        // Bail early if there are no visible items to layout.
        if (nVisible === 0) {
            return;
        }
        // Measure the parent if the offset dimensions are unknown.
        if (offsetWidth < 0) {
            offsetWidth = this.parent.node.offsetWidth;
        }
        if (offsetHeight < 0) {
            offsetHeight = this.parent.node.offsetHeight;
        }
        // Ensure the parent box sizing data is computed.
        if (!this._box) {
            this._box = ElementExt.boxSizing(this.parent.node);
        }
        // Compute the actual layout bounds adjusted for border and padding.
        var top = this._box.paddingTop;
        var left = this._box.paddingLeft;
        var width = offsetWidth - this._box.horizontalSum;
        var height = offsetHeight - this._box.verticalSum;
        // Update the widget stacking order and layout geometry.
        for (var i = 0, n = this._items.length; i < n; ++i) {
            // Fetch the item.
            var item = this._items[i];
            // Ignore hidden items.
            if (item.isHidden) {
                continue;
            }
            // Set the z-index for the widget.
            item.widget.node.style.zIndex = "" + i;
            // Update the item geometry.
            item.update(left, top, width, height);
        }
    };
    return StackedLayout;
}(PanelLayout));

/**
 * A panel where visible widgets are stacked atop one another.
 *
 * #### Notes
 * This class provides a convenience wrapper around a [[StackedLayout]].
 */
var StackedPanel = /** @class */ (function (_super) {
    __extends(StackedPanel, _super);
    /**
     * Construct a new stacked panel.
     *
     * @param options - The options for initializing the panel.
     */
    function StackedPanel(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, { layout: Private$g.createLayout(options) }) || this;
        _this._widgetRemoved = new Signal(_this);
        _this.addClass('lm-StackedPanel');
        /* <DEPRECATED> */
        _this.addClass('p-StackedPanel');
        return _this;
        /* </DEPRECATED> */
    }
    Object.defineProperty(StackedPanel.prototype, "widgetRemoved", {
        /**
         * A signal emitted when a widget is removed from a stacked panel.
         */
        get: function () {
            return this._widgetRemoved;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * A message handler invoked on a `'child-added'` message.
     */
    StackedPanel.prototype.onChildAdded = function (msg) {
        msg.child.addClass('lm-StackedPanel-child');
        /* <DEPRECATED> */
        msg.child.addClass('p-StackedPanel-child');
        /* </DEPRECATED> */
    };
    /**
     * A message handler invoked on a `'child-removed'` message.
     */
    StackedPanel.prototype.onChildRemoved = function (msg) {
        msg.child.removeClass('lm-StackedPanel-child');
        /* <DEPRECATED> */
        msg.child.removeClass('p-StackedPanel-child');
        /* </DEPRECATED> */
        this._widgetRemoved.emit(msg.child);
    };
    return StackedPanel;
}(Panel));
/**
 * The namespace for the module implementation details.
 */
var Private$g;
(function (Private) {
    /**
     * Create a stacked layout for the given panel options.
     */
    function createLayout(options) {
        return options.layout || new StackedLayout();
    }
    Private.createLayout = createLayout;
})(Private$g || (Private$g = {}));

/**
 * A widget which combines a `TabBar` and a `StackedPanel`.
 *
 * #### Notes
 * This is a simple panel which handles the common case of a tab bar
 * placed next to a content area. The selected tab controls the widget
 * which is shown in the content area.
 *
 * For use cases which require more control than is provided by this
 * panel, the `TabBar` widget may be used independently.
 */
var TabPanel = /** @class */ (function (_super) {
    __extends(TabPanel, _super);
    /**
     * Construct a new tab panel.
     *
     * @param options - The options for initializing the tab panel.
     */
    function TabPanel(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this) || this;
        _this._currentChanged = new Signal(_this);
        _this.addClass('lm-TabPanel');
        /* <DEPRECATED> */
        _this.addClass('p-TabPanel');
        /* </DEPRECATED> */
        // Create the tab bar and stacked panel.
        _this.tabBar = new TabBar(options);
        _this.tabBar.addClass('lm-TabPanel-tabBar');
        _this.stackedPanel = new StackedPanel();
        _this.stackedPanel.addClass('lm-TabPanel-stackedPanel');
        /* <DEPRECATED> */
        _this.tabBar.addClass('p-TabPanel-tabBar');
        _this.stackedPanel.addClass('p-TabPanel-stackedPanel');
        /* </DEPRECATED> */
        // Connect the tab bar signal handlers.
        _this.tabBar.tabMoved.connect(_this._onTabMoved, _this);
        _this.tabBar.currentChanged.connect(_this._onCurrentChanged, _this);
        _this.tabBar.tabCloseRequested.connect(_this._onTabCloseRequested, _this);
        _this.tabBar.tabActivateRequested.connect(_this._onTabActivateRequested, _this);
        // Connect the stacked panel signal handlers.
        _this.stackedPanel.widgetRemoved.connect(_this._onWidgetRemoved, _this);
        // Get the data related to the placement.
        _this._tabPlacement = options.tabPlacement || 'top';
        var direction = Private$h.directionFromPlacement(_this._tabPlacement);
        var orientation = Private$h.orientationFromPlacement(_this._tabPlacement);
        // Configure the tab bar for the placement.
        _this.tabBar.orientation = orientation;
        _this.tabBar.dataset['placement'] = _this._tabPlacement;
        // Create the box layout.
        var layout = new BoxLayout({ direction: direction, spacing: 0 });
        // Set the stretch factors for the child widgets.
        BoxLayout.setStretch(_this.tabBar, 0);
        BoxLayout.setStretch(_this.stackedPanel, 1);
        // Add the child widgets to the layout.
        layout.addWidget(_this.tabBar);
        layout.addWidget(_this.stackedPanel);
        // Install the layout on the tab panel.
        _this.layout = layout;
        return _this;
    }
    Object.defineProperty(TabPanel.prototype, "currentChanged", {
        /**
         * A signal emitted when the current tab is changed.
         *
         * #### Notes
         * This signal is emitted when the currently selected tab is changed
         * either through user or programmatic interaction.
         *
         * Notably, this signal is not emitted when the index of the current
         * tab changes due to tabs being inserted, removed, or moved. It is
         * only emitted when the actual current tab node is changed.
         */
        get: function () {
            return this._currentChanged;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TabPanel.prototype, "currentIndex", {
        /**
         * Get the index of the currently selected tab.
         *
         * #### Notes
         * This will be `-1` if no tab is selected.
         */
        get: function () {
            return this.tabBar.currentIndex;
        },
        /**
         * Set the index of the currently selected tab.
         *
         * #### Notes
         * If the index is out of range, it will be set to `-1`.
         */
        set: function (value) {
            this.tabBar.currentIndex = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TabPanel.prototype, "currentWidget", {
        /**
         * Get the currently selected widget.
         *
         * #### Notes
         * This will be `null` if there is no selected tab.
         */
        get: function () {
            var title = this.tabBar.currentTitle;
            return title ? title.owner : null;
        },
        /**
         * Set the currently selected widget.
         *
         * #### Notes
         * If the widget is not in the panel, it will be set to `null`.
         */
        set: function (value) {
            this.tabBar.currentTitle = value ? value.title : null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TabPanel.prototype, "tabsMovable", {
        /**
         * Get the whether the tabs are movable by the user.
         *
         * #### Notes
         * Tabs can always be moved programmatically.
         */
        get: function () {
            return this.tabBar.tabsMovable;
        },
        /**
         * Set the whether the tabs are movable by the user.
         *
         * #### Notes
         * Tabs can always be moved programmatically.
         */
        set: function (value) {
            this.tabBar.tabsMovable = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TabPanel.prototype, "tabPlacement", {
        /**
         * Get the tab placement for the tab panel.
         *
         * #### Notes
         * This controls the position of the tab bar relative to the content.
         */
        get: function () {
            return this._tabPlacement;
        },
        /**
         * Set the tab placement for the tab panel.
         *
         * #### Notes
         * This controls the position of the tab bar relative to the content.
         */
        set: function (value) {
            // Bail if the placement does not change.
            if (this._tabPlacement === value) {
                return;
            }
            // Update the internal value.
            this._tabPlacement = value;
            // Get the values related to the placement.
            var direction = Private$h.directionFromPlacement(value);
            var orientation = Private$h.orientationFromPlacement(value);
            // Configure the tab bar for the placement.
            this.tabBar.orientation = orientation;
            this.tabBar.dataset['placement'] = value;
            // Update the layout direction.
            this.layout.direction = direction;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TabPanel.prototype, "widgets", {
        /**
         * A read-only array of the widgets in the panel.
         */
        get: function () {
            return this.stackedPanel.widgets;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Add a widget to the end of the tab panel.
     *
     * @param widget - The widget to add to the tab panel.
     *
     * #### Notes
     * If the widget is already contained in the panel, it will be moved.
     *
     * The widget's `title` is used to populate the tab.
     */
    TabPanel.prototype.addWidget = function (widget) {
        this.insertWidget(this.widgets.length, widget);
    };
    /**
     * Insert a widget into the tab panel at a specified index.
     *
     * @param index - The index at which to insert the widget.
     *
     * @param widget - The widget to insert into to the tab panel.
     *
     * #### Notes
     * If the widget is already contained in the panel, it will be moved.
     *
     * The widget's `title` is used to populate the tab.
     */
    TabPanel.prototype.insertWidget = function (index, widget) {
        if (widget !== this.currentWidget) {
            widget.hide();
        }
        this.stackedPanel.insertWidget(index, widget);
        this.tabBar.insertTab(index, widget.title);
    };
    /**
     * Handle the `currentChanged` signal from the tab bar.
     */
    TabPanel.prototype._onCurrentChanged = function (sender, args) {
        // Extract the previous and current title from the args.
        var previousIndex = args.previousIndex, previousTitle = args.previousTitle, currentIndex = args.currentIndex, currentTitle = args.currentTitle;
        // Extract the widgets from the titles.
        var previousWidget = previousTitle ? previousTitle.owner : null;
        var currentWidget = currentTitle ? currentTitle.owner : null;
        // Hide the previous widget.
        if (previousWidget) {
            previousWidget.hide();
        }
        // Show the current widget.
        if (currentWidget) {
            currentWidget.show();
        }
        // Emit the `currentChanged` signal for the tab panel.
        this._currentChanged.emit({
            previousIndex: previousIndex, previousWidget: previousWidget, currentIndex: currentIndex, currentWidget: currentWidget
        });
        // Flush the message loop on IE and Edge to prevent flicker.
        if (Platform.IS_EDGE || Platform.IS_IE) {
            MessageLoop.flush();
        }
    };
    /**
     * Handle the `tabActivateRequested` signal from the tab bar.
     */
    TabPanel.prototype._onTabActivateRequested = function (sender, args) {
        args.title.owner.activate();
    };
    /**
     * Handle the `tabCloseRequested` signal from the tab bar.
     */
    TabPanel.prototype._onTabCloseRequested = function (sender, args) {
        args.title.owner.close();
    };
    /**
     * Handle the `tabMoved` signal from the tab bar.
     */
    TabPanel.prototype._onTabMoved = function (sender, args) {
        this.stackedPanel.insertWidget(args.toIndex, args.title.owner);
    };
    /**
     * Handle the `widgetRemoved` signal from the stacked panel.
     */
    TabPanel.prototype._onWidgetRemoved = function (sender, widget) {
        this.tabBar.removeTab(widget.title);
    };
    return TabPanel;
}(Widget));
/**
 * The namespace for the module implementation details.
 */
var Private$h;
(function (Private) {
    /**
     * Convert a tab placement to tab bar orientation.
     */
    function orientationFromPlacement(plc) {
        return placementToOrientationMap[plc];
    }
    Private.orientationFromPlacement = orientationFromPlacement;
    /**
     * Convert a tab placement to a box layout direction.
     */
    function directionFromPlacement(plc) {
        return placementToDirectionMap[plc];
    }
    Private.directionFromPlacement = directionFromPlacement;
    /**
     * A mapping of tab placement to tab bar orientation.
     */
    var placementToOrientationMap = {
        'top': 'horizontal',
        'left': 'vertical',
        'right': 'vertical',
        'bottom': 'horizontal'
    };
    /**
     * A mapping of tab placement to box layout direction.
     */
    var placementToDirectionMap = {
        'top': 'top-to-bottom',
        'left': 'left-to-right',
        'right': 'right-to-left',
        'bottom': 'bottom-to-top'
    };
})(Private$h || (Private$h = {}));

export { BoxEngine, BoxLayout, BoxPanel, BoxSizer, CommandPalette, ContextMenu, DockLayout, DockPanel, FocusTracker, GridLayout, Layout, LayoutItem, Menu, MenuBar, Panel, PanelLayout, ScrollBar, SingletonLayout, SplitLayout, SplitPanel, StackedLayout, StackedPanel, TabBar, TabPanel, Title, Widget };
//# sourceMappingURL=index.es6.js.map
