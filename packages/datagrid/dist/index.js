(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@lumino/domutils'), require('@lumino/keyboard'), require('@lumino/dragdrop'), require('@lumino/algorithm'), require('@lumino/signaling'), require('@lumino/widgets'), require('@lumino/messaging')) :
    typeof define === 'function' && define.amd ? define(['exports', '@lumino/domutils', '@lumino/keyboard', '@lumino/dragdrop', '@lumino/algorithm', '@lumino/signaling', '@lumino/widgets', '@lumino/messaging'], factory) :
    (global = global || self, factory(global.lumino_datagrid = {}, global.lumino_domutils, global.lumino_keyboard, global.lumino_dragdrop, global.lumino_algorithm, global.lumino_signaling, global.lumino_widgets, global.lumino_messaging));
}(this, (function (exports, domutils, keyboard, dragdrop, algorithm, signaling, widgets, messaging) { 'use strict';

    // Copyright (c) Jupyter Development Team.
    /**
     * A basic implementation of a data grid key handler.
     *
     * #### Notes
     * This class may be subclassed and customized as needed.
     */
    var BasicKeyHandler = /** @class */ (function () {
        function BasicKeyHandler() {
            this._disposed = false;
        }
        Object.defineProperty(BasicKeyHandler.prototype, "isDisposed", {
            /**
             * Whether the key handler is disposed.
             */
            get: function () {
                return this._disposed;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Dispose of the resources held by the key handler.
         */
        BasicKeyHandler.prototype.dispose = function () {
            this._disposed = true;
        };
        /**
         * Handle the key down event for the data grid.
         *
         * @param grid - The data grid of interest.
         *
         * @param event - The keydown event of interest.
         *
         * #### Notes
         * This will not be called if the mouse button is pressed.
         */
        BasicKeyHandler.prototype.onKeyDown = function (grid, event) {
            // if grid is editable and cell selection available, start cell editing
            // on key press (letters, numbers and space only)
            if (grid.editable &&
                grid.selectionModel.cursorRow !== -1 &&
                grid.selectionModel.cursorColumn !== -1) {
                var input = String.fromCharCode(event.keyCode);
                if (/[a-zA-Z0-9-_ ]/.test(input)) {
                    var row = grid.selectionModel.cursorRow;
                    var column = grid.selectionModel.cursorColumn;
                    var cell = {
                        grid: grid,
                        row: row,
                        column: column
                    };
                    grid.editorController.edit(cell);
                    if (keyboard.getKeyboardLayout().keyForKeydownEvent(event) === 'Space') {
                        event.stopPropagation();
                        event.preventDefault();
                    }
                    return;
                }
            }
            switch (keyboard.getKeyboardLayout().keyForKeydownEvent(event)) {
                case 'ArrowLeft':
                    this.onArrowLeft(grid, event);
                    break;
                case 'ArrowRight':
                    this.onArrowRight(grid, event);
                    break;
                case 'ArrowUp':
                    this.onArrowUp(grid, event);
                    break;
                case 'ArrowDown':
                    this.onArrowDown(grid, event);
                    break;
                case 'PageUp':
                    this.onPageUp(grid, event);
                    break;
                case 'PageDown':
                    this.onPageDown(grid, event);
                    break;
                case 'Escape':
                    this.onEscape(grid, event);
                    break;
                case 'Delete':
                    this.onDelete(grid, event);
                    break;
                case 'C':
                    this.onKeyC(grid, event);
                    break;
                case 'Enter':
                    if (grid.selectionModel) {
                        grid.moveCursor(event.shiftKey ? 'up' : 'down');
                        grid.scrollToCursor();
                    }
                    break;
                case 'Tab':
                    if (grid.selectionModel) {
                        grid.moveCursor(event.shiftKey ? 'left' : 'right');
                        grid.scrollToCursor();
                        event.stopPropagation();
                        event.preventDefault();
                    }
                    break;
            }
        };
        /**
         * Handle the `'ArrowLeft'` key press for the data grid.
         *
         * @param grid - The data grid of interest.
         *
         * @param event - The keyboard event of interest.
         */
        BasicKeyHandler.prototype.onArrowLeft = function (grid, event) {
            // Stop the event propagation.
            event.preventDefault();
            event.stopPropagation();
            // Fetch the selection model.
            var model = grid.selectionModel;
            // Fetch the modifier flags.
            var shift = event.shiftKey;
            var accel = domutils.Platform.accelKey(event);
            // Handle no model with the accel modifier.
            if (!model && accel) {
                grid.scrollTo(0, grid.scrollY);
                return;
            }
            // Handle no model and no modifier. (ignore shift)
            if (!model) {
                grid.scrollByStep('left');
                return;
            }
            // Fetch the selection mode.
            var mode = model.selectionMode;
            // Handle the row selection mode with accel key.
            if (mode === 'row' && accel) {
                grid.scrollTo(0, grid.scrollY);
                return;
            }
            // Handle the row selection mode with no modifier. (ignore shift)
            if (mode === 'row') {
                grid.scrollByStep('left');
                return;
            }
            // Fetch the cursor and selection.
            var r = model.cursorRow;
            var c = model.cursorColumn;
            var cs = model.currentSelection();
            // Set up the selection variables.
            var r1;
            var r2;
            var c1;
            var c2;
            var cr;
            var cc;
            var clear;
            // Dispatch based on the modifier keys.
            if (accel && shift) {
                r1 = cs ? cs.r1 : 0;
                r2 = cs ? cs.r2 : 0;
                c1 = cs ? cs.c1 : 0;
                c2 = 0;
                cr = r;
                cc = c;
                clear = 'current';
            }
            else if (shift) {
                r1 = cs ? cs.r1 : 0;
                r2 = cs ? cs.r2 : 0;
                c1 = cs ? cs.c1 : 0;
                c2 = cs ? cs.c2 - 1 : 0;
                cr = r;
                cc = c;
                clear = 'current';
            }
            else if (accel) {
                r1 = r;
                r2 = r;
                c1 = 0;
                c2 = 0;
                cr = r1;
                cc = c1;
                clear = 'all';
            }
            else {
                r1 = r;
                r2 = r;
                c1 = c - 1;
                c2 = c - 1;
                cr = r1;
                cc = c1;
                clear = 'all';
            }
            // Create the new selection.
            model.select({ r1: r1, c1: c1, r2: r2, c2: c2, cursorRow: cr, cursorColumn: cc, clear: clear });
            // Re-fetch the current selection.
            cs = model.currentSelection();
            // Bail if there is no selection.
            if (!cs) {
                return;
            }
            // Scroll the grid appropriately.
            if (shift || mode === 'column') {
                grid.scrollToColumn(cs.c2);
            }
            else {
                grid.scrollToCursor();
            }
        };
        /**
         * Handle the `'ArrowRight'` key press for the data grid.
         *
         * @param grid - The data grid of interest.
         *
         * @param event - The keyboard event of interest.
         */
        BasicKeyHandler.prototype.onArrowRight = function (grid, event) {
            // Stop the event propagation.
            event.preventDefault();
            event.stopPropagation();
            // Fetch the selection model.
            var model = grid.selectionModel;
            // Fetch the modifier flags.
            var shift = event.shiftKey;
            var accel = domutils.Platform.accelKey(event);
            // Handle no model with the accel modifier.
            if (!model && accel) {
                grid.scrollTo(grid.maxScrollX, grid.scrollY);
                return;
            }
            // Handle no model and no modifier. (ignore shift)
            if (!model) {
                grid.scrollByStep('right');
                return;
            }
            // Fetch the selection mode.
            var mode = model.selectionMode;
            // Handle the row selection model with accel key.
            if (mode === 'row' && accel) {
                grid.scrollTo(grid.maxScrollX, grid.scrollY);
                return;
            }
            // Handle the row selection mode with no modifier. (ignore shift)
            if (mode === 'row') {
                grid.scrollByStep('right');
                return;
            }
            // Fetch the cursor and selection.
            var r = model.cursorRow;
            var c = model.cursorColumn;
            var cs = model.currentSelection();
            // Set up the selection variables.
            var r1;
            var r2;
            var c1;
            var c2;
            var cr;
            var cc;
            var clear;
            // Dispatch based on the modifier keys.
            if (accel && shift) {
                r1 = cs ? cs.r1 : 0;
                r2 = cs ? cs.r2 : 0;
                c1 = cs ? cs.c1 : 0;
                c2 = Infinity;
                cr = r;
                cc = c;
                clear = 'current';
            }
            else if (shift) {
                r1 = cs ? cs.r1 : 0;
                r2 = cs ? cs.r2 : 0;
                c1 = cs ? cs.c1 : 0;
                c2 = cs ? cs.c2 + 1 : 0;
                cr = r;
                cc = c;
                clear = 'current';
            }
            else if (accel) {
                r1 = r;
                r2 = r;
                c1 = Infinity;
                c2 = Infinity;
                cr = r1;
                cc = c1;
                clear = 'all';
            }
            else {
                r1 = r;
                r2 = r;
                c1 = c + 1;
                c2 = c + 1;
                cr = r1;
                cc = c1;
                clear = 'all';
            }
            // Create the new selection.
            model.select({ r1: r1, c1: c1, r2: r2, c2: c2, cursorRow: cr, cursorColumn: cc, clear: clear });
            // Re-fetch the current selection.
            cs = model.currentSelection();
            // Bail if there is no selection.
            if (!cs) {
                return;
            }
            // Scroll the grid appropriately.
            if (shift || mode === 'column') {
                grid.scrollToColumn(cs.c2);
            }
            else {
                grid.scrollToCursor();
            }
        };
        /**
         * Handle the `'ArrowUp'` key press for the data grid.
         *
         * @param grid - The data grid of interest.
         *
         * @param event - The keyboard event of interest.
         */
        BasicKeyHandler.prototype.onArrowUp = function (grid, event) {
            // Stop the event propagation.
            event.preventDefault();
            event.stopPropagation();
            // Fetch the selection model.
            var model = grid.selectionModel;
            // Fetch the modifier flags.
            var shift = event.shiftKey;
            var accel = domutils.Platform.accelKey(event);
            // Handle no model with the accel modifier.
            if (!model && accel) {
                grid.scrollTo(grid.scrollX, 0);
                return;
            }
            // Handle no model and no modifier. (ignore shift)
            if (!model) {
                grid.scrollByStep('up');
                return;
            }
            // Fetch the selection mode.
            var mode = model.selectionMode;
            // Handle the column selection mode with accel key.
            if (mode === 'column' && accel) {
                grid.scrollTo(grid.scrollX, 0);
                return;
            }
            // Handle the column selection mode with no modifier. (ignore shift)
            if (mode === 'column') {
                grid.scrollByStep('up');
                return;
            }
            // Fetch the cursor and selection.
            var r = model.cursorRow;
            var c = model.cursorColumn;
            var cs = model.currentSelection();
            // Set up the selection variables.
            var r1;
            var r2;
            var c1;
            var c2;
            var cr;
            var cc;
            var clear;
            // Dispatch based on the modifier keys.
            if (accel && shift) {
                r1 = cs ? cs.r1 : 0;
                r2 = 0;
                c1 = cs ? cs.c1 : 0;
                c2 = cs ? cs.c2 : 0;
                cr = r;
                cc = c;
                clear = 'current';
            }
            else if (shift) {
                r1 = cs ? cs.r1 : 0;
                r2 = cs ? cs.r2 - 1 : 0;
                c1 = cs ? cs.c1 : 0;
                c2 = cs ? cs.c2 : 0;
                cr = r;
                cc = c;
                clear = 'current';
            }
            else if (accel) {
                r1 = 0;
                r2 = 0;
                c1 = c;
                c2 = c;
                cr = r1;
                cc = c1;
                clear = 'all';
            }
            else {
                r1 = r - 1;
                r2 = r - 1;
                c1 = c;
                c2 = c;
                cr = r1;
                cc = c1;
                clear = 'all';
            }
            // Create the new selection.
            model.select({ r1: r1, c1: c1, r2: r2, c2: c2, cursorRow: cr, cursorColumn: cc, clear: clear });
            // Re-fetch the current selection.
            cs = model.currentSelection();
            // Bail if there is no selection.
            if (!cs) {
                return;
            }
            // Scroll the grid appropriately.
            if (shift || mode === 'row') {
                grid.scrollToRow(cs.r2);
            }
            else {
                grid.scrollToCursor();
            }
        };
        /**
         * Handle the `'ArrowDown'` key press for the data grid.
         *
         * @param grid - The data grid of interest.
         *
         * @param event - The keyboard event of interest.
         */
        BasicKeyHandler.prototype.onArrowDown = function (grid, event) {
            // Stop the event propagation.
            event.preventDefault();
            event.stopPropagation();
            // Fetch the selection model.
            var model = grid.selectionModel;
            // Fetch the modifier flags.
            var shift = event.shiftKey;
            var accel = domutils.Platform.accelKey(event);
            // Handle no model with the accel modifier.
            if (!model && accel) {
                grid.scrollTo(grid.scrollX, grid.maxScrollY);
                return;
            }
            // Handle no model and no modifier. (ignore shift)
            if (!model) {
                grid.scrollByStep('down');
                return;
            }
            // Fetch the selection mode.
            var mode = model.selectionMode;
            // Handle the column selection mode with accel key.
            if (mode === 'column' && accel) {
                grid.scrollTo(grid.scrollX, grid.maxScrollY);
                return;
            }
            // Handle the column selection mode with no modifier. (ignore shift)
            if (mode === 'column') {
                grid.scrollByStep('down');
                return;
            }
            // Fetch the cursor and selection.
            var r = model.cursorRow;
            var c = model.cursorColumn;
            var cs = model.currentSelection();
            // Set up the selection variables.
            var r1;
            var r2;
            var c1;
            var c2;
            var cr;
            var cc;
            var clear;
            // Dispatch based on the modifier keys.
            if (accel && shift) {
                r1 = cs ? cs.r1 : 0;
                r2 = Infinity;
                c1 = cs ? cs.c1 : 0;
                c2 = cs ? cs.c2 : 0;
                cr = r;
                cc = c;
                clear = 'current';
            }
            else if (shift) {
                r1 = cs ? cs.r1 : 0;
                r2 = cs ? cs.r2 + 1 : 0;
                c1 = cs ? cs.c1 : 0;
                c2 = cs ? cs.c2 : 0;
                cr = r;
                cc = c;
                clear = 'current';
            }
            else if (accel) {
                r1 = Infinity;
                r2 = Infinity;
                c1 = c;
                c2 = c;
                cr = r1;
                cc = c1;
                clear = 'all';
            }
            else {
                r1 = r + 1;
                r2 = r + 1;
                c1 = c;
                c2 = c;
                cr = r1;
                cc = c1;
                clear = 'all';
            }
            // Create the new selection.
            model.select({ r1: r1, c1: c1, r2: r2, c2: c2, cursorRow: cr, cursorColumn: cc, clear: clear });
            // Re-fetch the current selection.
            cs = model.currentSelection();
            // Bail if there is no selection.
            if (!cs) {
                return;
            }
            // Scroll the grid appropriately.
            if (shift || mode === 'row') {
                grid.scrollToRow(cs.r2);
            }
            else {
                grid.scrollToCursor();
            }
        };
        /**
         * Handle the `'PageUp'` key press for the data grid.
         *
         * @param grid - The data grid of interest.
         *
         * @param event - The keyboard event of interest.
         */
        BasicKeyHandler.prototype.onPageUp = function (grid, event) {
            // Ignore the event if the accel key is pressed.
            if (domutils.Platform.accelKey(event)) {
                return;
            }
            // Stop the event propagation.
            event.preventDefault();
            event.stopPropagation();
            // Fetch the selection model.
            var model = grid.selectionModel;
            // Scroll by page if there is no selection model.
            if (!model || model.selectionMode === 'column') {
                grid.scrollByPage('up');
                return;
            }
            // Get the normal number of cells in the page height.
            var n = Math.floor(grid.pageHeight / grid.defaultSizes.rowHeight);
            // Fetch the cursor and selection.
            var r = model.cursorRow;
            var c = model.cursorColumn;
            var cs = model.currentSelection();
            // Set up the selection variables.
            var r1;
            var r2;
            var c1;
            var c2;
            var cr;
            var cc;
            var clear;
            // Select or resize as needed.
            if (event.shiftKey) {
                r1 = cs ? cs.r1 : 0;
                r2 = cs ? cs.r2 - n : 0;
                c1 = cs ? cs.c1 : 0;
                c2 = cs ? cs.c2 : 0;
                cr = r;
                cc = c;
                clear = 'current';
            }
            else {
                r1 = cs ? cs.r1 - n : 0;
                r2 = r1;
                c1 = c;
                c2 = c;
                cr = r1;
                cc = c;
                clear = 'all';
            }
            // Create the new selection.
            model.select({ r1: r1, c1: c1, r2: r2, c2: c2, cursorRow: cr, cursorColumn: cc, clear: clear });
            // Re-fetch the current selection.
            cs = model.currentSelection();
            // Bail if there is no selection.
            if (!cs) {
                return;
            }
            // Scroll the grid appropriately.
            grid.scrollToRow(cs.r2);
        };
        /**
         * Handle the `'PageDown'` key press for the data grid.
         *
         * @param grid - The data grid of interest.
         *
         * @param event - The keyboard event of interest.
         */
        BasicKeyHandler.prototype.onPageDown = function (grid, event) {
            // Ignore the event if the accel key is pressed.
            if (domutils.Platform.accelKey(event)) {
                return;
            }
            // Stop the event propagation.
            event.preventDefault();
            event.stopPropagation();
            // Fetch the selection model.
            var model = grid.selectionModel;
            // Scroll by page if there is no selection model.
            if (!model || model.selectionMode === 'column') {
                grid.scrollByPage('down');
                return;
            }
            // Get the normal number of cells in the page height.
            var n = Math.floor(grid.pageHeight / grid.defaultSizes.rowHeight);
            // Fetch the cursor and selection.
            var r = model.cursorRow;
            var c = model.cursorColumn;
            var cs = model.currentSelection();
            // Set up the selection variables.
            var r1;
            var r2;
            var c1;
            var c2;
            var cr;
            var cc;
            var clear;
            // Select or resize as needed.
            if (event.shiftKey) {
                r1 = cs ? cs.r1 : 0;
                r2 = cs ? cs.r2 + n : 0;
                c1 = cs ? cs.c1 : 0;
                c2 = cs ? cs.c2 : 0;
                cr = r;
                cc = c;
                clear = 'current';
            }
            else {
                r1 = cs ? cs.r1 + n : 0;
                r2 = r1;
                c1 = c;
                c2 = c;
                cr = r1;
                cc = c;
                clear = 'all';
            }
            // Create the new selection.
            model.select({ r1: r1, c1: c1, r2: r2, c2: c2, cursorRow: cr, cursorColumn: cc, clear: clear });
            // Re-fetch the current selection.
            cs = model.currentSelection();
            // Bail if there is no selection.
            if (!cs) {
                return;
            }
            // Scroll the grid appropriately.
            grid.scrollToRow(cs.r2);
        };
        /**
         * Handle the `'Escape'` key press for the data grid.
         *
         * @param grid - The data grid of interest.
         *
         * @param event - The keyboard event of interest.
         */
        BasicKeyHandler.prototype.onEscape = function (grid, event) {
            if (grid.selectionModel) {
                grid.selectionModel.clear();
            }
        };
        /**
         * Handle the `'Delete'` key press for the data grid.
         *
         * @param grid - The data grid of interest.
         *
         * @param event - The keyboard event of interest.
         */
        BasicKeyHandler.prototype.onDelete = function (grid, event) {
            if (grid.editable &&
                !grid.selectionModel.isEmpty) {
                var dataModel = grid.dataModel;
                // Fetch the max row and column.
                var maxRow = dataModel.rowCount('body') - 1;
                var maxColumn = dataModel.columnCount('body') - 1;
                var it = grid.selectionModel.selections();
                var s = void 0;
                while ((s = it.next()) !== undefined) {
                    // Clamp the cell to the model bounds.
                    var sr1 = Math.max(0, Math.min(s.r1, maxRow));
                    var sc1 = Math.max(0, Math.min(s.c1, maxColumn));
                    var sr2 = Math.max(0, Math.min(s.r2, maxRow));
                    var sc2 = Math.max(0, Math.min(s.c2, maxColumn));
                    for (var r = sr1; r <= sr2; ++r) {
                        for (var c = sc1; c <= sc2; ++c) {
                            dataModel.setData('body', r, c, null);
                        }
                    }
                }
            }
        };
        /**
         * Handle the `'C'` key press for the data grid.
         *
         * @param grid - The data grid of interest.
         *
         * @param event - The keyboard event of interest.
         */
        BasicKeyHandler.prototype.onKeyC = function (grid, event) {
            // Bail early if the modifiers aren't correct for copy.
            if (event.shiftKey || !domutils.Platform.accelKey(event)) {
                return;
            }
            // Stop the event propagation.
            event.preventDefault();
            event.stopPropagation();
            // Copy the current selection to the clipboard.
            grid.copyToClipboard();
        };
        return BasicKeyHandler;
    }());

    /**
     * A basic implementation of a data grid mouse handler.
     *
     * #### Notes
     * This class may be subclassed and customized as needed.
     */
    var BasicMouseHandler = /** @class */ (function () {
        function BasicMouseHandler() {
            this._disposed = false;
            this._pressData = null;
        }
        /**
         * Dispose of the resources held by the mouse handler.
         */
        BasicMouseHandler.prototype.dispose = function () {
            // Bail early if the handler is already disposed.
            if (this._disposed) {
                return;
            }
            // Release any held resources.
            this.release();
            // Mark the handler as disposed.
            this._disposed = true;
        };
        Object.defineProperty(BasicMouseHandler.prototype, "isDisposed", {
            /**
             * Whether the mouse handler is disposed.
             */
            get: function () {
                return this._disposed;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Release the resources held by the handler.
         */
        BasicMouseHandler.prototype.release = function () {
            // Bail early if the is no press data.
            if (!this._pressData) {
                return;
            }
            // Clear the autoselect timeout.
            if (this._pressData.type === 'select') {
                this._pressData.timeout = -1;
            }
            // Clear the press data.
            this._pressData.override.dispose();
            this._pressData = null;
        };
        /**
         * Handle the mouse hover event for the data grid.
         *
         * @param grid - The data grid of interest.
         *
         * @param event - The mouse hover event of interest.
         */
        BasicMouseHandler.prototype.onMouseHover = function (grid, event) {
            // Hit test the grid.
            var hit = grid.hitTest(event.clientX, event.clientY);
            // Get the resize handle for the hit test.
            var handle = exports.Private.resizeHandleForHitTest(hit);
            // Fetch the cursor for the handle.
            var cursor = this.cursorForHandle(handle);
            // Update the viewport cursor based on the part.
            grid.viewport.node.style.cursor = cursor;
            // TODO support user-defined hover items
        };
        /**
         * Handle the mouse leave event for the data grid.
         *
         * @param grid - The data grid of interest.
         *
         * @param event - The mouse hover event of interest.
         */
        BasicMouseHandler.prototype.onMouseLeave = function (grid, event) {
            // TODO support user-defined hover popups.
            // Clear the viewport cursor.
            grid.viewport.node.style.cursor = '';
        };
        /**
         * Handle the mouse down event for the data grid.
         *
         * @param grid - The data grid of interest.
         *
         * @param event - The mouse down event of interest.
         */
        BasicMouseHandler.prototype.onMouseDown = function (grid, event) {
            // Unpack the event.
            var clientX = event.clientX, clientY = event.clientY;
            // Hit test the grid.
            var hit = grid.hitTest(clientX, clientY);
            // Unpack the hit test.
            var region = hit.region, row = hit.row, column = hit.column;
            // Bail if the hit test is on an uninteresting region.
            if (region === 'void') {
                return;
            }
            // Fetch the modifier flags.
            var shift = event.shiftKey;
            var accel = domutils.Platform.accelKey(event);
            // If the hit test is the body region, the only option is select.
            if (region === 'body') {
                // Fetch the selection model.
                var model_1 = grid.selectionModel;
                // Bail early if there is no selection model.
                if (!model_1) {
                    return;
                }
                // Override the document cursor.
                var override_1 = dragdrop.Drag.overrideCursor('default');
                // Set up the press data.
                this._pressData = {
                    type: 'select', region: region, row: row, column: column, override: override_1,
                    localX: -1, localY: -1, timeout: -1
                };
                // Set up the selection variables.
                var r1_1;
                var c1_1;
                var r2_1;
                var c2_1;
                var cursorRow_1;
                var cursorColumn_1;
                var clear_1;
                // Accel == new selection, keep old selections.
                if (accel) {
                    r1_1 = row;
                    r2_1 = row;
                    c1_1 = column;
                    c2_1 = column;
                    cursorRow_1 = row;
                    cursorColumn_1 = column;
                    clear_1 = 'none';
                }
                else if (shift) {
                    r1_1 = model_1.cursorRow;
                    r2_1 = row;
                    c1_1 = model_1.cursorColumn;
                    c2_1 = column;
                    cursorRow_1 = model_1.cursorRow;
                    cursorColumn_1 = model_1.cursorColumn;
                    clear_1 = 'current';
                }
                else {
                    r1_1 = row;
                    r2_1 = row;
                    c1_1 = column;
                    c2_1 = column;
                    cursorRow_1 = row;
                    cursorColumn_1 = column;
                    clear_1 = 'all';
                }
                // Use selection mode 'cell'
                model_1.selectionMode = 'cell';
                // Make the selection.
                model_1.select({ r1: r1_1, c1: c1_1, r2: r2_1, c2: c2_1, cursorRow: cursorRow_1, cursorColumn: cursorColumn_1, clear: clear_1 });
                // Done.
                return;
            }
            // Otherwise, the hit test is on a header region.
            // Convert the hit test into a part.
            var handle = exports.Private.resizeHandleForHitTest(hit);
            // Fetch the cursor for the handle.
            var cursor = this.cursorForHandle(handle);
            // Handle horizontal resize.
            if (handle === 'left' || handle === 'right') {
                // Set up the resize data type.
                var type = 'column-resize';
                // Determine the column region.
                var rgn = (region === 'column-header' ? 'body' : 'row-header');
                // Determine the section index.
                var index = handle === 'left' ? column - 1 : column;
                // Fetch the section size.
                var size = grid.columnSize(rgn, index);
                // Override the document cursor.
                var override_2 = dragdrop.Drag.overrideCursor(cursor);
                // Create the temporary press data.
                this._pressData = { type: type, region: rgn, index: index, size: size, clientX: clientX, override: override_2 };
                // Done.
                return;
            }
            // Handle vertical resize
            if (handle === 'top' || handle === 'bottom') {
                // Set up the resize data type.
                var type = 'row-resize';
                // Determine the row region.
                var rgn = (region === 'row-header' ? 'body' : 'column-header');
                // Determine the section index.
                var index = handle === 'top' ? row - 1 : row;
                // Fetch the section size.
                var size = grid.rowSize(rgn, index);
                // Override the document cursor.
                var override_3 = dragdrop.Drag.overrideCursor(cursor);
                // Create the temporary press data.
                this._pressData = { type: type, region: rgn, index: index, size: size, clientY: clientY, override: override_3 };
                // Done.
                return;
            }
            // Otherwise, the only option is select.
            // Fetch the selection model.
            var model = grid.selectionModel;
            // Bail if there is no selection model.
            if (!model) {
                return;
            }
            // Override the document cursor.
            var override = dragdrop.Drag.overrideCursor('default');
            // Set up the press data.
            this._pressData = {
                type: 'select', region: region, row: row, column: column, override: override,
                localX: -1, localY: -1, timeout: -1
            };
            // Set up the selection variables.
            var r1;
            var c1;
            var r2;
            var c2;
            var cursorRow;
            var cursorColumn;
            var clear;
            // Compute the selection based on the pressed region.
            if (region === 'corner-header') {
                r1 = 0;
                r2 = Infinity;
                c1 = 0;
                c2 = Infinity;
                cursorRow = accel ? 0 : shift ? model.cursorRow : 0;
                cursorColumn = accel ? 0 : shift ? model.cursorColumn : 0;
                clear = accel ? 'none' : shift ? 'current' : 'all';
            }
            else if (region === 'row-header') {
                r1 = accel ? row : shift ? model.cursorRow : row;
                r2 = row;
                c1 = 0;
                c2 = Infinity;
                cursorRow = accel ? row : shift ? model.cursorRow : row;
                cursorColumn = accel ? 0 : shift ? model.cursorColumn : 0;
                clear = accel ? 'none' : shift ? 'current' : 'all';
            }
            else if (region === 'column-header') {
                r1 = 0;
                r2 = Infinity;
                c1 = accel ? column : shift ? model.cursorColumn : column;
                c2 = column;
                cursorRow = accel ? 0 : shift ? model.cursorRow : 0;
                cursorColumn = accel ? column : shift ? model.cursorColumn : column;
                clear = accel ? 'none' : shift ? 'current' : 'all';
            }
            else {
                r1 = accel ? row : shift ? model.cursorRow : row;
                r2 = row;
                c1 = accel ? column : shift ? model.cursorColumn : column;
                c2 = column;
                cursorRow = accel ? row : shift ? model.cursorRow : row;
                cursorColumn = accel ? column : shift ? model.cursorColumn : column;
                clear = accel ? 'none' : shift ? 'current' : 'all';
            }
            // Set selection mode based on region
            switch (region) {
                case 'column-header':
                    model.selectionMode = 'column';
                    break;
                case 'row-header':
                    model.selectionMode = 'row';
                    break;
                default:
                    model.selectionMode = 'cell';
                    break;
            }
            // Make the selection.
            model.select({ r1: r1, c1: c1, r2: r2, c2: c2, cursorRow: cursorRow, cursorColumn: cursorColumn, clear: clear });
        };
        /**
         * Handle the mouse move event for the data grid.
         *
         * @param grid - The data grid of interest.
         *
         * @param event - The mouse move event of interest.
         */
        BasicMouseHandler.prototype.onMouseMove = function (grid, event) {
            // Fetch the press data.
            var data = this._pressData;
            // Bail early if there is no press data.
            if (!data) {
                return;
            }
            // Handle a row resize.
            if (data.type === 'row-resize') {
                var dy = event.clientY - data.clientY;
                grid.resizeRow(data.region, data.index, data.size + dy);
                return;
            }
            // Handle a column resize.
            if (data.type === 'column-resize') {
                var dx = event.clientX - data.clientX;
                grid.resizeColumn(data.region, data.index, data.size + dx);
                return;
            }
            // Otherwise, it's a select.
            // Mouse moves during a corner header press are a no-op.
            if (data.region === 'corner-header') {
                return;
            }
            // Fetch the selection model.
            var model = grid.selectionModel;
            // Bail early if the selection model was removed.
            if (!model) {
                return;
            }
            // Map to local coordinates.
            var _a = grid.mapToLocal(event.clientX, event.clientY), lx = _a.lx, ly = _a.ly;
            // Update the local mouse coordinates in the press data.
            data.localX = lx;
            data.localY = ly;
            // Fetch the grid geometry.
            var hw = grid.headerWidth;
            var hh = grid.headerHeight;
            var vpw = grid.viewportWidth;
            var vph = grid.viewportHeight;
            var sx = grid.scrollX;
            var sy = grid.scrollY;
            var msx = grid.maxScrollY;
            var msy = grid.maxScrollY;
            // Fetch the selection mode.
            var mode = model.selectionMode;
            // Set up the timeout variable.
            var timeout = -1;
            // Compute the timemout based on hit region and mouse position.
            if (data.region === 'row-header' || mode === 'row') {
                if (ly < hh && sy > 0) {
                    timeout = exports.Private.computeTimeout(hh - ly);
                }
                else if (ly >= vph && sy < msy) {
                    timeout = exports.Private.computeTimeout(ly - vph);
                }
            }
            else if (data.region === 'column-header' || mode === 'column') {
                if (lx < hw && sx > 0) {
                    timeout = exports.Private.computeTimeout(hw - lx);
                }
                else if (lx >= vpw && sx < msx) {
                    timeout = exports.Private.computeTimeout(lx - vpw);
                }
            }
            else {
                if (lx < hw && sx > 0) {
                    timeout = exports.Private.computeTimeout(hw - lx);
                }
                else if (lx >= vpw && sx < msx) {
                    timeout = exports.Private.computeTimeout(lx - vpw);
                }
                else if (ly < hh && sy > 0) {
                    timeout = exports.Private.computeTimeout(hh - ly);
                }
                else if (ly >= vph && sy < msy) {
                    timeout = exports.Private.computeTimeout(ly - vph);
                }
            }
            // Update or initiate the autoselect if needed.
            if (timeout >= 0) {
                if (data.timeout < 0) {
                    data.timeout = timeout;
                    setTimeout(function () { exports.Private.autoselect(grid, data); }, timeout);
                }
                else {
                    data.timeout = timeout;
                }
                return;
            }
            // Otherwise, clear the autoselect timeout.
            data.timeout = -1;
            // Map the position to virtual coordinates.
            var _b = grid.mapToVirtual(event.clientX, event.clientY), vx = _b.vx, vy = _b.vy;
            // Clamp the coordinates to the limits.
            vx = Math.max(0, Math.min(vx, grid.bodyWidth - 1));
            vy = Math.max(0, Math.min(vy, grid.bodyHeight - 1));
            // Set up the selection variables.
            var r1;
            var c1;
            var r2;
            var c2;
            var cursorRow = model.cursorRow;
            var cursorColumn = model.cursorColumn;
            var clear = 'current';
            // Compute the selection based pressed region.
            if (data.region === 'row-header' || mode === 'row') {
                r1 = data.row;
                r2 = grid.rowAt('body', vy);
                c1 = 0;
                c2 = Infinity;
            }
            else if (data.region === 'column-header' || mode === 'column') {
                r1 = 0;
                r2 = Infinity;
                c1 = data.column;
                c2 = grid.columnAt('body', vx);
            }
            else {
                r1 = cursorRow;
                r2 = grid.rowAt('body', vy);
                c1 = cursorColumn;
                c2 = grid.columnAt('body', vx);
            }
            // Make the selection.
            model.select({ r1: r1, c1: c1, r2: r2, c2: c2, cursorRow: cursorRow, cursorColumn: cursorColumn, clear: clear });
        };
        /**
         * Handle the mouse up event for the data grid.
         *
         * @param grid - The data grid of interest.
         *
         * @param event - The mouse up event of interest.
         */
        BasicMouseHandler.prototype.onMouseUp = function (grid, event) {
            this.release();
        };
        /**
         * Handle the mouse double click event for the data grid.
         *
         * @param grid - The data grid of interest.
         *
         * @param event - The mouse up event of interest.
         */
        BasicMouseHandler.prototype.onMouseDoubleClick = function (grid, event) {
            if (!grid.dataModel) {
                this.release();
                return;
            }
            // Unpack the event.
            var clientX = event.clientX, clientY = event.clientY;
            // Hit test the grid.
            var hit = grid.hitTest(clientX, clientY);
            // Unpack the hit test.
            var region = hit.region, row = hit.row, column = hit.column;
            if (region === 'void') {
                this.release();
                return;
            }
            if (region === 'body') {
                if (grid.editable) {
                    var cell = {
                        grid: grid,
                        row: row,
                        column: column
                    };
                    grid.editorController.edit(cell);
                }
            }
            this.release();
        };
        /**
         * Handle the context menu event for the data grid.
         *
         * @param grid - The data grid of interest.
         *
         * @param event - The context menu event of interest.
         */
        BasicMouseHandler.prototype.onContextMenu = function (grid, event) {
            // TODO support user-defined context menus
        };
        /**
         * Handle the wheel event for the data grid.
         *
         * @param grid - The data grid of interest.
         *
         * @param event - The wheel event of interest.
         */
        BasicMouseHandler.prototype.onWheel = function (grid, event) {
            // Bail if a mouse press is in progress.
            if (this._pressData) {
                return;
            }
            // Extract the delta X and Y movement.
            var dx = event.deltaX;
            var dy = event.deltaY;
            // Convert the delta values to pixel values.
            switch (event.deltaMode) {
                case 0: // DOM_DELTA_PIXEL
                    break;
                case 1: // DOM_DELTA_LINE
                    var ds = grid.defaultSizes;
                    dx *= ds.columnWidth;
                    dy *= ds.rowHeight;
                    break;
                case 2: // DOM_DELTA_PAGE
                    dx *= grid.pageWidth;
                    dy *= grid.pageHeight;
                    break;
                default:
                    throw 'unreachable';
            }
            // Scroll by the desired amount.
            grid.scrollBy(dx, dy);
        };
        /**
         * Convert a resize handle into a cursor.
         */
        BasicMouseHandler.prototype.cursorForHandle = function (handle) {
            return exports.Private.cursorMap[handle];
        };
        Object.defineProperty(BasicMouseHandler.prototype, "pressData", {
            /**
             * Get the current pressData
             */
            get: function () {
                return this._pressData;
            },
            enumerable: true,
            configurable: true
        });
        return BasicMouseHandler;
    }());
    (function (Private) {
        /**
         * Get the resize handle for a grid hit test.
         */
        function resizeHandleForHitTest(hit) {
            // Fetch the row and column.
            var r = hit.row;
            var c = hit.column;
            // Fetch the leading and trailing sizes.
            var lw = hit.x;
            var lh = hit.y;
            var tw = hit.width - hit.x;
            var th = hit.height - hit.y;
            // Set up the result variable.
            var result;
            // Dispatch based on hit test region.
            switch (hit.region) {
                case 'corner-header':
                    if (c > 0 && lw <= 5) {
                        result = 'left';
                    }
                    else if (tw <= 6) {
                        result = 'right';
                    }
                    else if (r > 0 && lh <= 5) {
                        result = 'top';
                    }
                    else if (th <= 6) {
                        result = 'bottom';
                    }
                    else {
                        result = 'none';
                    }
                    break;
                case 'column-header':
                    if (c > 0 && lw <= 5) {
                        result = 'left';
                    }
                    else if (tw <= 6) {
                        result = 'right';
                    }
                    else if (r > 0 && lh <= 5) {
                        result = 'top';
                    }
                    else if (th <= 6) {
                        result = 'bottom';
                    }
                    else {
                        result = 'none';
                    }
                    break;
                case 'row-header':
                    if (c > 0 && lw <= 5) {
                        result = 'left';
                    }
                    else if (tw <= 6) {
                        result = 'right';
                    }
                    else if (r > 0 && lh <= 5) {
                        result = 'top';
                    }
                    else if (th <= 6) {
                        result = 'bottom';
                    }
                    else {
                        result = 'none';
                    }
                    break;
                case 'body':
                    result = 'none';
                    break;
                case 'void':
                    result = 'none';
                    break;
                default:
                    throw 'unreachable';
            }
            // Return the result.
            return result;
        }
        Private.resizeHandleForHitTest = resizeHandleForHitTest;
        /**
         * A timer callback for the autoselect loop.
         *
         * @param grid - The datagrid of interest.
         *
         * @param data - The select data of interest.
         */
        function autoselect(grid, data) {
            // Bail early if the timeout has been reset.
            if (data.timeout < 0) {
                return;
            }
            // Fetch the selection model.
            var model = grid.selectionModel;
            // Bail early if the selection model has been removed.
            if (!model) {
                return;
            }
            // Fetch the current selection.
            var cs = model.currentSelection();
            // Bail early if there is no current selection.
            if (!cs) {
                return;
            }
            // Fetch local X and Y coordinates of the mouse.
            var lx = data.localX;
            var ly = data.localY;
            // Set up the selection variables.
            var r1 = cs.r1;
            var c1 = cs.c1;
            var r2 = cs.r2;
            var c2 = cs.c2;
            var cursorRow = model.cursorRow;
            var cursorColumn = model.cursorColumn;
            var clear = 'current';
            // Fetch the grid geometry.
            var hw = grid.headerWidth;
            var hh = grid.headerHeight;
            var vpw = grid.viewportWidth;
            var vph = grid.viewportHeight;
            // Fetch the selection mode.
            var mode = model.selectionMode;
            // Update the selection based on the hit region.
            if (data.region === 'row-header' || mode === 'row') {
                r2 += ly <= hh ? -1 : ly >= vph ? 1 : 0;
            }
            else if (data.region === 'column-header' || mode === 'column') {
                c2 += lx <= hw ? -1 : lx >= vpw ? 1 : 0;
            }
            else {
                r2 += ly <= hh ? -1 : ly >= vph ? 1 : 0;
                c2 += lx <= hw ? -1 : lx >= vpw ? 1 : 0;
            }
            // Update the current selection.
            model.select({ r1: r1, c1: c1, r2: r2, c2: c2, cursorRow: cursorRow, cursorColumn: cursorColumn, clear: clear });
            // Re-fetch the current selection.
            cs = model.currentSelection();
            // Bail if there is no selection.
            if (!cs) {
                return;
            }
            // Scroll the grid based on the hit region.
            if (data.region === 'row-header' || mode === 'row') {
                grid.scrollToRow(cs.r2);
            }
            else if (data.region === 'column-header' || mode == 'column') {
                grid.scrollToColumn(cs.c2);
            }
            else if (mode === 'cell') {
                grid.scrollToCell(cs.r2, cs.c2);
            }
            // Schedule the next call with the current timeout.
            setTimeout(function () { autoselect(grid, data); }, data.timeout);
        }
        Private.autoselect = autoselect;
        /**
         * Compute the scroll timeout for the given delta distance.
         *
         * @param delta - The delta pixels from the origin.
         *
         * @returns The scaled timeout in milliseconds.
         */
        function computeTimeout(delta) {
            return 5 + 120 * (1 - Math.min(128, Math.abs(delta)) / 128);
        }
        Private.computeTimeout = computeTimeout;
        /**
         * A mapping of resize handle to cursor.
         */
        Private.cursorMap = {
            top: 'ns-resize',
            left: 'ew-resize',
            right: 'ew-resize',
            bottom: 'ns-resize',
            none: 'default'
        };
    })(exports.Private || (exports.Private = {}));

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
     * A base class for creating data grid selection models.
     *
     * #### Notes
     * If the predefined selection models are insufficient for a particular
     * use case, a custom model can be defined which derives from this class.
     */
    var SelectionModel = /** @class */ (function () {
        /**
         * Construct a new selection model.
         *
         * @param options - The options for initializing the model.
         */
        function SelectionModel(options) {
            this._changed = new signaling.Signal(this);
            this._selectionMode = 'cell';
            this.dataModel = options.dataModel;
            this._selectionMode = options.selectionMode || 'cell';
            this.dataModel.changed.connect(this.onDataModelChanged, this);
        }
        Object.defineProperty(SelectionModel.prototype, "changed", {
            /**
             * A signal emitted when the selection model has changed.
             */
            get: function () {
                return this._changed;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SelectionModel.prototype, "selectionMode", {
            /**
             * Get the selection mode for the model.
             */
            get: function () {
                return this._selectionMode;
            },
            /**
             * Set the selection mode for the model.
             *
             * #### Notes
             * This will clear the selection model.
             */
            set: function (value) {
                // Bail early if the mode does not change.
                if (this._selectionMode === value) {
                    return;
                }
                // Update the internal mode.
                this._selectionMode = value;
                // Clear the current selections.
                this.clear();
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Test whether any selection intersects a row.
         *
         * @param index - The row index of interest.
         *
         * @returns Whether any selection intersects the row.
         *
         * #### Notes
         * This method may be reimplemented in a subclass.
         */
        SelectionModel.prototype.isRowSelected = function (index) {
            return algorithm.some(this.selections(), function (s) { return Private.containsRow(s, index); });
        };
        /**
         * Test whether any selection intersects a column.
         *
         * @param index - The column index of interest.
         *
         * @returns Whether any selection intersects the column.
         *
         * #### Notes
         * This method may be reimplemented in a subclass.
         */
        SelectionModel.prototype.isColumnSelected = function (index) {
            return algorithm.some(this.selections(), function (s) { return Private.containsColumn(s, index); });
        };
        /**
         * Test whether any selection intersects a cell.
         *
         * @param row - The row index of interest.
         *
         * @param column - The column index of interest.
         *
         * @returns Whether any selection intersects the cell.
         *
         * #### Notes
         * This method may be reimplemented in a subclass.
         */
        SelectionModel.prototype.isCellSelected = function (row, column) {
            return algorithm.some(this.selections(), function (s) { return Private.containsCell(s, row, column); });
        };
        /**
         * A signal handler for the data model `changed` signal.
         *
         * @param args - The arguments for the signal.
         *
         * #### Notes
         * Selection model implementations should update their selections
         * in a manner that is relevant for the changes to the data model.
         *
         * The default implementation of this method is a no-op.
         */
        SelectionModel.prototype.onDataModelChanged = function (sender, args) { };
        /**
         * Emit the `changed` signal for the selection model.
         *
         * #### Notes
         * Subclasses should call this method whenever the selection model
         * has changed so that attached data grids can update themselves.
         */
        SelectionModel.prototype.emitChanged = function () {
            this._changed.emit(undefined);
        };
        return SelectionModel;
    }());
    /**
     * The namespace for the module implementation details.
     */
    var Private;
    (function (Private) {
        /**
         * Test whether a selection contains a given row.
         */
        function containsRow(selection, row) {
            var r1 = selection.r1, r2 = selection.r2;
            return (row >= r1 && row <= r2) || (row >= r2 && row <= r1);
        }
        Private.containsRow = containsRow;
        /**
         * Test whether a selection contains a given column.
         */
        function containsColumn(selection, column) {
            var c1 = selection.c1, c2 = selection.c2;
            return (column >= c1 && column <= c2) || (column >= c2 && column <= c1);
        }
        Private.containsColumn = containsColumn;
        /**
         * Test whether a selection contains a given cell.
         */
        function containsCell(selection, row, column) {
            return containsRow(selection, row) && containsColumn(selection, column);
        }
        Private.containsCell = containsCell;
    })(Private || (Private = {}));

    /**
     * A basic selection model implementation.
     *
     * #### Notes
     * This selection model is sufficient for most use cases where
     * structural knowledge of the data source is *not* required.
     */
    var BasicSelectionModel = /** @class */ (function (_super) {
        __extends(BasicSelectionModel, _super);
        function BasicSelectionModel() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._cursorRow = -1;
            _this._cursorColumn = -1;
            _this._cursorRectIndex = -1;
            _this._selections = [];
            return _this;
        }
        Object.defineProperty(BasicSelectionModel.prototype, "isEmpty", {
            /**
             * Wether the selection model is empty.
             */
            get: function () {
                return this._selections.length === 0;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BasicSelectionModel.prototype, "cursorRow", {
            /**
             * The row index of the cursor.
             */
            get: function () {
                return this._cursorRow;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BasicSelectionModel.prototype, "cursorColumn", {
            /**
             * The column index of the cursor.
             */
            get: function () {
                return this._cursorColumn;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Move cursor down/up/left/right while making sure it remains
         * within the bounds of selected rectangles
         *
         * @param direction - The direction of the movement.
         */
        BasicSelectionModel.prototype.moveCursorWithinSelections = function (direction) {
            var _this = this;
            // Bail early if there are no selections or no existing cursor
            if (this.isEmpty || this.cursorRow === -1 || this._cursorColumn === -1) {
                return;
            }
            // Bail early if only single cell is selected
            var firstSelection = this._selections[0];
            if (this._selections.length === 1 &&
                firstSelection.r1 === firstSelection.r2 &&
                firstSelection.c1 === firstSelection.c2) {
                return;
            }
            // start from last selection rectangle
            if (this._cursorRectIndex === -1) {
                this._cursorRectIndex = this._selections.length - 1;
            }
            var cursorRect = this._selections[this._cursorRectIndex];
            var dr = direction === 'down' ? 1 : direction === 'up' ? -1 : 0;
            var dc = direction === 'right' ? 1 : direction === 'left' ? -1 : 0;
            var newRow = this._cursorRow + dr;
            var newColumn = this._cursorColumn + dc;
            var r1 = Math.min(cursorRect.r1, cursorRect.r2);
            var r2 = Math.max(cursorRect.r1, cursorRect.r2);
            var c1 = Math.min(cursorRect.c1, cursorRect.c2);
            var c2 = Math.max(cursorRect.c1, cursorRect.c2);
            var moveToNextRect = function () {
                _this._cursorRectIndex = (_this._cursorRectIndex + 1) % _this._selections.length;
                cursorRect = _this._selections[_this._cursorRectIndex];
                newRow = Math.min(cursorRect.r1, cursorRect.r2);
                newColumn = Math.min(cursorRect.c1, cursorRect.c2);
            };
            var moveToPreviousRect = function () {
                _this._cursorRectIndex = _this._cursorRectIndex === 0 ? _this._selections.length - 1 : _this._cursorRectIndex - 1;
                cursorRect = _this._selections[_this._cursorRectIndex];
                newRow = Math.max(cursorRect.r1, cursorRect.r2);
                newColumn = Math.max(cursorRect.c1, cursorRect.c2);
            };
            if (newRow > r2) {
                newRow = r1;
                newColumn += 1;
                if (newColumn > c2) {
                    moveToNextRect();
                }
            }
            else if (newRow < r1) {
                newRow = r2;
                newColumn -= 1;
                if (newColumn < c1) {
                    moveToPreviousRect();
                }
            }
            else if (newColumn > c2) {
                newColumn = c1;
                newRow += 1;
                if (newRow > r2) {
                    moveToNextRect();
                }
            }
            else if (newColumn < c1) {
                newColumn = c2;
                newRow -= 1;
                if (newRow < r1) {
                    moveToPreviousRect();
                }
            }
            this._cursorRow = newRow;
            this._cursorColumn = newColumn;
            // Emit the changed signal.
            this.emitChanged();
        };
        /**
         * Get the current selection in the selection model.
         *
         * @returns The current selection or `null`.
         *
         * #### Notes
         * This is the selection which holds the cursor.
         */
        BasicSelectionModel.prototype.currentSelection = function () {
            return this._selections[this._selections.length - 1] || null;
        };
        /**
         * Get an iterator of the selections in the model.
         *
         * @returns A new iterator of the current selections.
         *
         * #### Notes
         * The data grid will render the selections in order.
         */
        BasicSelectionModel.prototype.selections = function () {
            return algorithm.iter(this._selections);
        };
        /**
         * Select the specified cells.
         *
         * @param args - The arguments for the selection.
         */
        BasicSelectionModel.prototype.select = function (args) {
            // Fetch the current row and column counts;
            var rowCount = this.dataModel.rowCount('body');
            var columnCount = this.dataModel.columnCount('body');
            // Bail early if there is no content.
            if (rowCount <= 0 || columnCount <= 0) {
                return;
            }
            // Unpack the arguments.
            var r1 = args.r1, c1 = args.c1, r2 = args.r2, c2 = args.c2, cursorRow = args.cursorRow, cursorColumn = args.cursorColumn, clear = args.clear;
            // Clear the necessary selections.
            if (clear === 'all') {
                this._selections.length = 0;
            }
            else if (clear === 'current') {
                this._selections.pop();
            }
            // Clamp to the data model bounds.
            r1 = Math.max(0, Math.min(r1, rowCount - 1));
            r2 = Math.max(0, Math.min(r2, rowCount - 1));
            c1 = Math.max(0, Math.min(c1, columnCount - 1));
            c2 = Math.max(0, Math.min(c2, columnCount - 1));
            // Handle the selection mode.
            if (this.selectionMode === 'row') {
                c1 = 0;
                c2 = columnCount - 1;
            }
            else if (this.selectionMode === 'column') {
                r1 = 0;
                r2 = rowCount - 1;
            }
            // Alias the cursor row and column.
            var cr = cursorRow;
            var cc = cursorColumn;
            // Compute the new cursor location.
            if (cr < 0 || (cr < r1 && cr < r2) || (cr > r1 && cr > r2)) {
                cr = r1;
            }
            if (cc < 0 || (cc < c1 && cc < c2) || (cc > c1 && cc > c2)) {
                cc = c1;
            }
            // Update the cursor.
            this._cursorRow = cr;
            this._cursorColumn = cc;
            this._cursorRectIndex = this._selections.length;
            // Add the new selection.
            this._selections.push({ r1: r1, c1: c1, r2: r2, c2: c2 });
            // Emit the changed signal.
            this.emitChanged();
        };
        /**
         * Clear all selections in the selection model.
         */
        BasicSelectionModel.prototype.clear = function () {
            // Bail early if there are no selections.
            if (this._selections.length === 0) {
                return;
            }
            // Reset the internal state.
            this._cursorRow = -1;
            this._cursorColumn = -1;
            this._cursorRectIndex = -1;
            this._selections.length = 0;
            // Emit the changed signal.
            this.emitChanged();
        };
        /**
         * A signal handler for the data model `changed` signal.
         *
         * @param args - The arguments for the signal.
         */
        BasicSelectionModel.prototype.onDataModelChanged = function (sender, args) {
            // Bail early if the model has no current selections.
            if (this._selections.length === 0) {
                return;
            }
            // Bail early if the cells have changed in place.
            if (args.type === 'cells-changed') {
                return;
            }
            // Bail early if there is no change to the row or column count.
            if (args.type === 'rows-moved' || args.type === 'columns-moved') {
                return;
            }
            // Fetch the last row and column index.
            var lr = sender.rowCount('body') - 1;
            var lc = sender.columnCount('body') - 1;
            // Bail early if the data model is empty.
            if (lr < 0 || lc < 0) {
                this._selections.length = 0;
                this.emitChanged();
                return;
            }
            // Fetch the selection mode.
            var mode = this.selectionMode;
            // Set up the assignment index variable.
            var j = 0;
            // Iterate over the current selections.
            for (var i = 0, n = this._selections.length; i < n; ++i) {
                // Unpack the selection.
                var _a = this._selections[i], r1 = _a.r1, c1 = _a.c1, r2 = _a.r2, c2 = _a.c2;
                // Skip the selection if it will disappear.
                if ((lr < r1 && lr < r2) || (lc < c1 && lc < c2)) {
                    continue;
                }
                // Modify the bounds based on the selection mode.
                if (mode === 'row') {
                    r1 = Math.max(0, Math.min(r1, lr));
                    r2 = Math.max(0, Math.min(r2, lr));
                    c1 = 0;
                    c2 = lc;
                }
                else if (mode === 'column') {
                    r1 = 0;
                    r2 = lr;
                    c1 = Math.max(0, Math.min(c1, lc));
                    c2 = Math.max(0, Math.min(c2, lc));
                }
                else {
                    r1 = Math.max(0, Math.min(r1, lr));
                    r2 = Math.max(0, Math.min(r2, lr));
                    c1 = Math.max(0, Math.min(c1, lc));
                    c2 = Math.max(0, Math.min(c2, lc));
                }
                // Assign the modified selection to the array.
                this._selections[j++] = { r1: r1, c1: c1, r2: r2, c2: c2 };
            }
            // Remove the stale selections.
            this._selections.length = j;
            // Emit the changed signal.
            this.emitChanged();
        };
        return BasicSelectionModel;
    }(SelectionModel));

    /**
     * An object which renders the cells of a data grid.
     *
     * #### Notes
     * If the predefined cell renderers are insufficient for a particular
     * use case, a custom cell renderer can be defined which derives from
     * this class.
     *
     * The data grid renders cells in column-major order, by region. The
     * region order is: body, row header, column header, corner header.
     */
    exports.CellRenderer = /** @class */ (function () {
        function CellRenderer() {
        }
        return CellRenderer;
    }());
    /**
     * The namespace for the `CellRenderer` class statics.
     */
    (function (CellRenderer) {
        /**
         * Resolve a config option for a cell renderer.
         *
         * @param option - The config option to resolve.
         *
         * @param config - The cell config object.
         *
         * @returns The resolved value for the option.
         */
        function resolveOption(option, config) {
            return typeof option === 'function' ? option(config) : option;
        }
        CellRenderer.resolveOption = resolveOption;
    })(exports.CellRenderer || (exports.CellRenderer = {}));

    // Copyright (c) Jupyter Development Team.
    /**
     * A widget which implements a notification popup.
     */
    var Notification = /** @class */ (function (_super) {
        __extends(Notification, _super);
        /**
         * Construct a new notification.
         *
         * @param options - The options for initializing the notification.
         */
        function Notification(options) {
            var _this = _super.call(this, { node: Private$1.createNode() }) || this;
            _this._message = '';
            _this.addClass('lm-DataGrid-notification');
            _this.setFlag(widgets.Widget.Flag.DisallowLayout);
            _this._target = options.target;
            _this._message = options.message || '';
            _this._placement = options.placement || 'bottom';
            widgets.Widget.attach(_this, document.body);
            if (options.timeout && options.timeout > 0) {
                setTimeout(function () {
                    _this.close();
                }, options.timeout);
            }
            return _this;
        }
        /**
         * Handle the DOM events for the notification.
         *
         * @param event - The DOM event sent to the notification.
         *
         * #### Notes
         * This method implements the DOM `EventListener` interface and is
         * called in response to events on the notification's DOM node.
         *
         * This should not be called directly by user code.
         */
        Notification.prototype.handleEvent = function (event) {
            switch (event.type) {
                case 'mousedown':
                    this._evtMouseDown(event);
                    break;
                case 'contextmenu':
                    event.preventDefault();
                    event.stopPropagation();
                    break;
            }
        };
        Object.defineProperty(Notification.prototype, "placement", {
            /**
             * Get the placement of the notification.
             */
            get: function () {
                return this._placement;
            },
            /**
             * Set the placement of the notification.
             */
            set: function (value) {
                // Do nothing if the placement does not change.
                if (this._placement === value) {
                    return;
                }
                // Update the internal placement.
                this._placement = value;
                // Schedule an update for notification.
                this.update();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Notification.prototype, "message", {
            /**
             * Get the current value of the message.
             */
            get: function () {
                return this._message;
            },
            /**
             * Set the current value of the message.
             *
             */
            set: function (value) {
                // Do nothing if the value does not change.
                if (this._message === value) {
                    return;
                }
                // Update the internal value.
                this._message = value;
                // Schedule an update for notification.
                this.update();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Notification.prototype, "messageNode", {
            /**
             * Get the node presenting the message.
             */
            get: function () {
                return this.node.getElementsByClassName('lm-DataGrid-notificationMessage')[0];
            },
            enumerable: true,
            configurable: true
        });
        /**
         * A method invoked on a 'before-attach' message.
         */
        Notification.prototype.onBeforeAttach = function (msg) {
            this.node.addEventListener('mousedown', this);
            this.update();
        };
        /**
         * A method invoked on an 'after-detach' message.
         */
        Notification.prototype.onAfterDetach = function (msg) {
            this.node.removeEventListener('mousedown', this);
        };
        /**
         * A method invoked on an 'update-request' message.
         */
        Notification.prototype.onUpdateRequest = function (msg) {
            var targetRect = this._target.getBoundingClientRect();
            var style = this.node.style;
            switch (this._placement) {
                case 'bottom':
                    style.left = targetRect.left + 'px';
                    style.top = targetRect.bottom + 'px';
                    break;
                case 'top':
                    style.left = targetRect.left + 'px';
                    style.height = targetRect.top + 'px';
                    style.top = '0';
                    style.alignItems = 'flex-end';
                    style.justifyContent = 'flex-end';
                    break;
                case 'left':
                    style.left = '0';
                    style.width = targetRect.left + 'px';
                    style.top = targetRect.top + 'px';
                    style.alignItems = 'flex-end';
                    style.justifyContent = 'flex-end';
                    break;
                case 'right':
                    style.left = targetRect.right + 'px';
                    style.top = targetRect.top + 'px';
                    break;
            }
            this.messageNode.innerHTML = this._message;
        };
        /**
         * Handle the `'mousedown'` event for the notification.
         */
        Notification.prototype._evtMouseDown = function (event) {
            // Do nothing if it's not a left mouse press.
            if (event.button !== 0) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            this.close();
        };
        return Notification;
    }(widgets.Widget));
    /**
     * The namespace for the module implementation details.
     */
    var Private$1;
    (function (Private) {
        /**
         * Create the DOM node for notification.
         */
        function createNode() {
            var node = document.createElement('div');
            var container = document.createElement('div');
            container.className = 'lm-DataGrid-notificationContainer';
            var message = document.createElement('span');
            message.className = 'lm-DataGrid-notificationMessage';
            container.appendChild(message);
            node.appendChild(container);
            return node;
        }
        Private.createNode = createNode;
    })(Private$1 || (Private$1 = {}));

    // default validation error message
    var DEFAULT_INVALID_INPUT_MESSAGE = "Invalid input!";
    /**
     * A cell input validator object which always returns valid.
     */
    var PassInputValidator = /** @class */ (function () {
        function PassInputValidator() {
        }
        /**
         * Validate cell input.
         *
         * @param cell - The object holding cell configuration data.
         *
         * @param value - The cell value input.
         *
         * @returns An object with validation result.
         */
        PassInputValidator.prototype.validate = function (cell, value) {
            return { valid: true };
        };
        return PassInputValidator;
    }());
    /**
     * Text cell input validator.
     */
    var TextInputValidator = /** @class */ (function () {
        function TextInputValidator() {
            /**
             * Minimum text length
             *
             * The default is Number.NaN, meaning no minimum constraint
             */
            this.minLength = Number.NaN;
            /**
             * Maximum text length
             *
             * The default is Number.NaN, meaning no maximum constraint
             */
            this.maxLength = Number.NaN;
            /**
             * Required text pattern as regular expression
             *
             * The default is null, meaning no pattern constraint
             */
            this.pattern = null;
        }
        /**
         * Validate cell input.
         *
         * @param cell - The object holding cell configuration data.
         *
         * @param value - The cell value input.
         *
         * @returns An object with validation result.
         */
        TextInputValidator.prototype.validate = function (cell, value) {
            if (value === null) {
                return { valid: true };
            }
            if (typeof value !== 'string') {
                return {
                    valid: false,
                    message: 'Input must be valid text'
                };
            }
            if (!isNaN(this.minLength) && value.length < this.minLength) {
                return {
                    valid: false,
                    message: "Text length must be greater than " + this.minLength
                };
            }
            if (!isNaN(this.maxLength) && value.length > this.maxLength) {
                return {
                    valid: false,
                    message: "Text length must be less than " + this.maxLength
                };
            }
            if (this.pattern && !this.pattern.test(value)) {
                return {
                    valid: false,
                    message: "Text doesn't match the required pattern"
                };
            }
            return { valid: true };
        };
        return TextInputValidator;
    }());
    /**
     * Integer cell input validator.
     */
    var IntegerInputValidator = /** @class */ (function () {
        function IntegerInputValidator() {
            /**
             * Minimum value
             *
             * The default is Number.NaN, meaning no minimum constraint
             */
            this.min = Number.NaN;
            /**
             * Maximum value
             *
             * The default is Number.NaN, meaning no maximum constraint
             */
            this.max = Number.NaN;
        }
        /**
         * Validate cell input.
         *
         * @param cell - The object holding cell configuration data.
         *
         * @param value - The cell value input.
         *
         * @returns An object with validation result.
         */
        IntegerInputValidator.prototype.validate = function (cell, value) {
            if (value === null) {
                return { valid: true };
            }
            if (isNaN(value) || (value % 1 !== 0)) {
                return {
                    valid: false,
                    message: 'Input must be valid integer'
                };
            }
            if (!isNaN(this.min) && value < this.min) {
                return {
                    valid: false,
                    message: "Input must be greater than " + this.min
                };
            }
            if (!isNaN(this.max) && value > this.max) {
                return {
                    valid: false,
                    message: "Input must be less than " + this.max
                };
            }
            return { valid: true };
        };
        return IntegerInputValidator;
    }());
    /**
     * Real number cell input validator.
     */
    var NumberInputValidator = /** @class */ (function () {
        function NumberInputValidator() {
            /**
             * Minimum value
             *
             * The default is Number.NaN, meaning no minimum constraint
             */
            this.min = Number.NaN;
            /**
             * Maximum value
             *
             * The default is Number.NaN, meaning no maximum constraint
             */
            this.max = Number.NaN;
        }
        /**
         * Validate cell input.
         *
         * @param cell - The object holding cell configuration data.
         *
         * @param value - The cell value input.
         *
         * @returns An object with validation result.
         */
        NumberInputValidator.prototype.validate = function (cell, value) {
            if (value === null) {
                return { valid: true };
            }
            if (isNaN(value)) {
                return {
                    valid: false,
                    message: 'Input must be valid number'
                };
            }
            if (!isNaN(this.min) && value < this.min) {
                return {
                    valid: false,
                    message: "Input must be greater than " + this.min
                };
            }
            if (!isNaN(this.max) && value > this.max) {
                return {
                    valid: false,
                    message: "Input must be less than " + this.max
                };
            }
            return { valid: true };
        };
        return NumberInputValidator;
    }());
    /**
     * An abstract base class that provides the most of the functionality
     * needed by a cell editor. All of the built-in cell editors
     * for various cell types are derived from this base class. Custom cell editors
     * can be easily implemented by extending this class.
     */
    var CellEditor = /** @class */ (function () {
        /**
         * Construct a new cell editor.
         */
        function CellEditor() {
            var _this = this;
            /**
             * A signal emitted when input changes.
             */
            this.inputChanged = new signaling.Signal(this);
            /**
             * Notification popup used to show validation error messages.
             */
            this.validityNotification = null;
            /**
             * Whether the cell editor is disposed.
             */
            this._disposed = false;
            /**
             * Whether the value input is valid.
             */
            this._validInput = true;
            /**
             * Grid wheel event handler.
             */
            this._gridWheelEventHandler = null;
            this.inputChanged.connect(function () {
                _this.validate();
            });
        }
        Object.defineProperty(CellEditor.prototype, "isDisposed", {
            /**
             * Whether the cell editor is disposed.
             */
            get: function () {
                return this._disposed;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Dispose of the resources held by cell editor.
         */
        CellEditor.prototype.dispose = function () {
            if (this._disposed) {
                return;
            }
            if (this._gridWheelEventHandler) {
                this.cell.grid.node.removeEventListener('wheel', this._gridWheelEventHandler);
                this._gridWheelEventHandler = null;
            }
            this._closeValidityNotification();
            this._disposed = true;
            this.cell.grid.node.removeChild(this.viewportOccluder);
        };
        /**
         * Start editing the cell.
         *
         * @param cell - The object holding cell configuration data.
         *
         * @param options - The cell editing options.
         */
        CellEditor.prototype.edit = function (cell, options) {
            var _this = this;
            this.cell = cell;
            this.onCommit = options && options.onCommit;
            this.onCancel = options && options.onCancel;
            this.validator = (options && options.validator) ? options.validator : this.createValidatorBasedOnType();
            this._gridWheelEventHandler = function () {
                _this._closeValidityNotification();
                _this.updatePosition();
            };
            cell.grid.node.addEventListener('wheel', this._gridWheelEventHandler);
            this._addContainer();
            this.updatePosition();
            this.startEditing();
        };
        /**
         * Cancel editing the cell.
         */
        CellEditor.prototype.cancel = function () {
            if (this._disposed) {
                return;
            }
            this.dispose();
            if (this.onCancel) {
                this.onCancel();
            }
        };
        Object.defineProperty(CellEditor.prototype, "validInput", {
            /**
             * Whether the value input is valid.
             */
            get: function () {
                return this._validInput;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Validate the cell input. Shows validation error notification when input is invalid.
         */
        CellEditor.prototype.validate = function () {
            var value;
            try {
                value = this.getInput();
            }
            catch (error) {
                console.log("Input error: " + error.message);
                this.setValidity(false, error.message || DEFAULT_INVALID_INPUT_MESSAGE);
                return;
            }
            if (this.validator) {
                var result = this.validator.validate(this.cell, value);
                if (result.valid) {
                    this.setValidity(true);
                }
                else {
                    this.setValidity(false, result.message || DEFAULT_INVALID_INPUT_MESSAGE);
                }
            }
            else {
                this.setValidity(true);
            }
        };
        /**
         * Set validity flag.
         *
         * @param valid - Whether the input is valid.
         *
         * @param message - Notification message to show.
         *
         * If message is set to empty string (which is the default)
         * existing notification popup is removed if any.
         */
        CellEditor.prototype.setValidity = function (valid, message) {
            if (message === void 0) { message = ""; }
            this._validInput = valid;
            this._closeValidityNotification();
            if (valid) {
                this.editorContainer.classList.remove('lm-mod-invalid');
            }
            else {
                this.editorContainer.classList.add('lm-mod-invalid');
                // show a notification popup
                if (message !== "") {
                    this.validityNotification = new Notification({
                        target: this.editorContainer,
                        message: message,
                        placement: 'bottom',
                        timeout: 5000
                    });
                    this.validityNotification.show();
                }
            }
        };
        /**
         * Create and return a cell input validator based on configuration of the
         * cell being edited. If no suitable validator can be found, it returns undefined.
         */
        CellEditor.prototype.createValidatorBasedOnType = function () {
            var cell = this.cell;
            var metadata = cell.grid.dataModel.metadata('body', cell.row, cell.column);
            switch (metadata && metadata.type) {
                case 'string':
                    {
                        var validator = new TextInputValidator();
                        if (typeof (metadata.format) === 'string') {
                            var format = metadata.format;
                            switch (format) {
                                case 'email':
                                    validator.pattern = new RegExp("^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$");
                                    break;
                                case 'uuid':
                                    validator.pattern = new RegExp("[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}");
                                    break;
                            }
                        }
                        if (metadata.constraint) {
                            if (metadata.constraint.minLength !== undefined) {
                                validator.minLength = metadata.constraint.minLength;
                            }
                            if (metadata.constraint.maxLength !== undefined) {
                                validator.maxLength = metadata.constraint.maxLength;
                            }
                            if (typeof (metadata.constraint.pattern) === 'string') {
                                validator.pattern = new RegExp(metadata.constraint.pattern);
                            }
                        }
                        return validator;
                    }
                case 'number':
                    {
                        var validator = new NumberInputValidator();
                        if (metadata.constraint) {
                            if (metadata.constraint.minimum !== undefined) {
                                validator.min = metadata.constraint.minimum;
                            }
                            if (metadata.constraint.maximum !== undefined) {
                                validator.max = metadata.constraint.maximum;
                            }
                        }
                        return validator;
                    }
                case 'integer':
                    {
                        var validator = new IntegerInputValidator();
                        if (metadata.constraint) {
                            if (metadata.constraint.minimum !== undefined) {
                                validator.min = metadata.constraint.minimum;
                            }
                            if (metadata.constraint.maximum !== undefined) {
                                validator.max = metadata.constraint.maximum;
                            }
                        }
                        return validator;
                    }
            }
            return undefined;
        };
        /**
         * Compute cell rectangle and return with other cell properties.
         */
        CellEditor.prototype.getCellInfo = function (cell) {
            var grid = cell.grid, row = cell.row, column = cell.column;
            var data = grid.dataModel.data('body', row, column);
            var columnX = grid.headerWidth - grid.scrollX + grid.columnOffset('body', column);
            var rowY = grid.headerHeight - grid.scrollY + grid.rowOffset('body', row);
            var width = grid.columnSize('body', column);
            var height = grid.rowSize('body', row);
            return {
                grid: grid,
                row: row,
                column: column,
                data: data,
                x: columnX,
                y: rowY,
                width: width,
                height: height
            };
        };
        /**
         * Reposition cell editor by moving viewport occluder and cell editor container.
         */
        CellEditor.prototype.updatePosition = function () {
            var grid = this.cell.grid;
            var cellInfo = this.getCellInfo(this.cell);
            var headerHeight = grid.headerHeight;
            var headerWidth = grid.headerWidth;
            this.viewportOccluder.style.top = headerHeight + 'px';
            this.viewportOccluder.style.left = headerWidth + 'px';
            this.viewportOccluder.style.width = (grid.viewportWidth - headerWidth) + 'px';
            this.viewportOccluder.style.height = (grid.viewportHeight - headerHeight) + 'px';
            this.viewportOccluder.style.position = 'absolute';
            this.editorContainer.style.left = (cellInfo.x - 1 - headerWidth) + 'px';
            this.editorContainer.style.top = (cellInfo.y - 1 - headerHeight) + 'px';
            this.editorContainer.style.width = (cellInfo.width + 1) + 'px';
            this.editorContainer.style.height = (cellInfo.height + 1) + 'px';
            this.editorContainer.style.visibility = 'visible';
            this.editorContainer.style.position = 'absolute';
        };
        /**
         * Commit the edited value.
         *
         * @param cursorMovement - Cursor move direction based on keys pressed to end the edit.
         *
         * @returns true on valid input, false otherwise.
         */
        CellEditor.prototype.commit = function (cursorMovement) {
            if (cursorMovement === void 0) { cursorMovement = 'none'; }
            this.validate();
            if (!this._validInput) {
                return false;
            }
            var value;
            try {
                value = this.getInput();
            }
            catch (error) {
                console.log("Input error: " + error.message);
                return false;
            }
            this.dispose();
            if (this.onCommit) {
                this.onCommit({
                    cell: this.cell,
                    value: value,
                    cursorMovement: cursorMovement
                });
            }
            return true;
        };
        /**
         * Create container elements needed to prevent editor widget overflow
         * beyond viewport and to position cell editor widget.
         */
        CellEditor.prototype._addContainer = function () {
            var _this = this;
            this.viewportOccluder = document.createElement('div');
            this.viewportOccluder.className = 'lm-DataGrid-cellEditorOccluder';
            this.cell.grid.node.appendChild(this.viewportOccluder);
            this.editorContainer = document.createElement('div');
            this.editorContainer.className = 'lm-DataGrid-cellEditorContainer';
            this.viewportOccluder.appendChild(this.editorContainer);
            // update mouse event pass-through state based on input validity
            this.editorContainer.addEventListener('mouseleave', function (event) {
                _this.viewportOccluder.style.pointerEvents = _this._validInput ? 'none' : 'auto';
            });
            this.editorContainer.addEventListener('mouseenter', function (event) {
                _this.viewportOccluder.style.pointerEvents = 'none';
            });
        };
        /**
         * Remove validity notification popup.
         */
        CellEditor.prototype._closeValidityNotification = function () {
            if (this.validityNotification) {
                this.validityNotification.close();
                this.validityNotification = null;
            }
        };
        return CellEditor;
    }());
    /**
     * Abstract base class with shared functionality
     * for cell editors which use HTML Input widget as editor.
     */
    var InputCellEditor = /** @class */ (function (_super) {
        __extends(InputCellEditor, _super);
        function InputCellEditor() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Handle the DOM events for the editor.
         *
         * @param event - The DOM event sent to the editor.
         */
        InputCellEditor.prototype.handleEvent = function (event) {
            switch (event.type) {
                case 'keydown':
                    this._onKeyDown(event);
                    break;
                case 'blur':
                    this._onBlur(event);
                    break;
                case 'input':
                    this._onInput(event);
                    break;
            }
        };
        /**
         * Dispose of the resources held by cell editor.
         */
        InputCellEditor.prototype.dispose = function () {
            if (this.isDisposed) {
                return;
            }
            this._unbindEvents();
            _super.prototype.dispose.call(this);
        };
        /**
         * Start editing the cell.
         */
        InputCellEditor.prototype.startEditing = function () {
            this.createWidget();
            var cell = this.cell;
            var cellInfo = this.getCellInfo(cell);
            this.input.value = this.deserialize(cellInfo.data);
            this.editorContainer.appendChild(this.input);
            this.input.focus();
            this.input.select();
            this.bindEvents();
        };
        InputCellEditor.prototype.deserialize = function (value) {
            if (value === null || value === undefined) {
                return '';
            }
            return value.toString();
        };
        InputCellEditor.prototype.createWidget = function () {
            var input = document.createElement('input');
            input.classList.add('lm-DataGrid-cellEditorWidget');
            input.classList.add('lm-DataGrid-cellEditorInput');
            input.spellcheck = false;
            input.type = this.inputType;
            this.input = input;
        };
        InputCellEditor.prototype.bindEvents = function () {
            this.input.addEventListener('keydown', this);
            this.input.addEventListener('blur', this);
            this.input.addEventListener('input', this);
        };
        InputCellEditor.prototype._unbindEvents = function () {
            this.input.removeEventListener('keydown', this);
            this.input.removeEventListener('blur', this);
            this.input.removeEventListener('input', this);
        };
        InputCellEditor.prototype._onKeyDown = function (event) {
            switch (keyboard.getKeyboardLayout().keyForKeydownEvent(event)) {
                case 'Enter':
                    this.commit(event.shiftKey ? 'up' : 'down');
                    break;
                case 'Tab':
                    this.commit(event.shiftKey ? 'left' : 'right');
                    event.stopPropagation();
                    event.preventDefault();
                    break;
                case 'Escape':
                    this.cancel();
                    break;
            }
        };
        InputCellEditor.prototype._onBlur = function (event) {
            if (this.isDisposed) {
                return;
            }
            if (!this.commit()) {
                event.preventDefault();
                event.stopPropagation();
                this.input.focus();
            }
        };
        InputCellEditor.prototype._onInput = function (event) {
            this.inputChanged.emit(void 0);
        };
        return InputCellEditor;
    }(CellEditor));
    /**
     * Cell editor for text cells.
     */
    var TextCellEditor = /** @class */ (function (_super) {
        __extends(TextCellEditor, _super);
        function TextCellEditor() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.inputType = 'text';
            return _this;
        }
        /**
         * Return the current text input entered.
         */
        TextCellEditor.prototype.getInput = function () {
            return this.input.value;
        };
        return TextCellEditor;
    }(InputCellEditor));
    /**
     * Cell editor for real number cells.
     */
    var NumberCellEditor = /** @class */ (function (_super) {
        __extends(NumberCellEditor, _super);
        function NumberCellEditor() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.inputType = 'number';
            return _this;
        }
        /**
         * Start editing the cell.
         */
        NumberCellEditor.prototype.startEditing = function () {
            _super.prototype.startEditing.call(this);
            this.input.step = 'any';
            var cell = this.cell;
            var metadata = cell.grid.dataModel.metadata('body', cell.row, cell.column);
            var constraint = metadata.constraint;
            if (constraint) {
                if (constraint.minimum) {
                    this.input.min = constraint.minimum;
                }
                if (constraint.maximum) {
                    this.input.max = constraint.maximum;
                }
            }
        };
        /**
         * Return the current number input entered. This method throws exception
         * if input is invalid.
         */
        NumberCellEditor.prototype.getInput = function () {
            var value = this.input.value;
            if (value.trim() === '') {
                return null;
            }
            var floatValue = parseFloat(value);
            if (isNaN(floatValue)) {
                throw new Error('Invalid input');
            }
            return floatValue;
        };
        return NumberCellEditor;
    }(InputCellEditor));
    /**
     * Cell editor for integer cells.
     */
    var IntegerCellEditor = /** @class */ (function (_super) {
        __extends(IntegerCellEditor, _super);
        function IntegerCellEditor() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.inputType = 'number';
            return _this;
        }
        /**
         * Start editing the cell.
         */
        IntegerCellEditor.prototype.startEditing = function () {
            _super.prototype.startEditing.call(this);
            this.input.step = '1';
            var cell = this.cell;
            var metadata = cell.grid.dataModel.metadata('body', cell.row, cell.column);
            var constraint = metadata.constraint;
            if (constraint) {
                if (constraint.minimum) {
                    this.input.min = constraint.minimum;
                }
                if (constraint.maximum) {
                    this.input.max = constraint.maximum;
                }
            }
        };
        /**
         * Return the current integer input entered. This method throws exception
         * if input is invalid.
         */
        IntegerCellEditor.prototype.getInput = function () {
            var value = this.input.value;
            if (value.trim() === '') {
                return null;
            }
            var intValue = parseInt(value);
            if (isNaN(intValue)) {
                throw new Error('Invalid input');
            }
            return intValue;
        };
        return IntegerCellEditor;
    }(InputCellEditor));
    /**
     * Cell editor for date cells.
     */
    var DateCellEditor = /** @class */ (function (_super) {
        __extends(DateCellEditor, _super);
        function DateCellEditor() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Handle the DOM events for the editor.
         *
         * @param event - The DOM event sent to the editor.
         */
        DateCellEditor.prototype.handleEvent = function (event) {
            switch (event.type) {
                case 'keydown':
                    this._onKeyDown(event);
                    break;
                case 'blur':
                    this._onBlur(event);
                    break;
            }
        };
        /**
         * Dispose of the resources held by cell editor.
         */
        DateCellEditor.prototype.dispose = function () {
            if (this.isDisposed) {
                return;
            }
            this._unbindEvents();
            _super.prototype.dispose.call(this);
        };
        /**
         * Start editing the cell.
         */
        DateCellEditor.prototype.startEditing = function () {
            this._createWidget();
            var cell = this.cell;
            var cellInfo = this.getCellInfo(cell);
            this._input.value = this._deserialize(cellInfo.data);
            this.editorContainer.appendChild(this._input);
            this._input.focus();
            this._bindEvents();
        };
        /**
         * Return the current date input entered.
         */
        DateCellEditor.prototype.getInput = function () {
            return this._input.value;
        };
        DateCellEditor.prototype._deserialize = function (value) {
            if (value === null || value === undefined) {
                return '';
            }
            return value.toString();
        };
        DateCellEditor.prototype._createWidget = function () {
            var input = document.createElement('input');
            input.type = 'date';
            input.pattern = "\d{4}-\d{2}-\d{2}";
            input.classList.add('lm-DataGrid-cellEditorWidget');
            input.classList.add('lm-DataGrid-cellEditorInput');
            this._input = input;
        };
        DateCellEditor.prototype._bindEvents = function () {
            this._input.addEventListener('keydown', this);
            this._input.addEventListener('blur', this);
        };
        DateCellEditor.prototype._unbindEvents = function () {
            this._input.removeEventListener('keydown', this);
            this._input.removeEventListener('blur', this);
        };
        DateCellEditor.prototype._onKeyDown = function (event) {
            switch (keyboard.getKeyboardLayout().keyForKeydownEvent(event)) {
                case 'Enter':
                    this.commit(event.shiftKey ? 'up' : 'down');
                    break;
                case 'Tab':
                    this.commit(event.shiftKey ? 'left' : 'right');
                    event.stopPropagation();
                    event.preventDefault();
                    break;
                case 'Escape':
                    this.cancel();
                    break;
            }
        };
        DateCellEditor.prototype._onBlur = function (event) {
            if (this.isDisposed) {
                return;
            }
            if (!this.commit()) {
                event.preventDefault();
                event.stopPropagation();
                this._input.focus();
            }
        };
        return DateCellEditor;
    }(CellEditor));
    /**
     * Cell editor for boolean cells.
     */
    var BooleanCellEditor = /** @class */ (function (_super) {
        __extends(BooleanCellEditor, _super);
        function BooleanCellEditor() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Handle the DOM events for the editor.
         *
         * @param event - The DOM event sent to the editor.
         */
        BooleanCellEditor.prototype.handleEvent = function (event) {
            switch (event.type) {
                case 'keydown':
                    this._onKeyDown(event);
                    break;
                case 'mousedown':
                    // fix focus loss problem in Safari and Firefox
                    this._input.focus();
                    event.stopPropagation();
                    event.preventDefault();
                    break;
                case 'blur':
                    this._onBlur(event);
                    break;
            }
        };
        /**
         * Dispose of the resources held by cell editor.
         */
        BooleanCellEditor.prototype.dispose = function () {
            if (this.isDisposed) {
                return;
            }
            this._unbindEvents();
            _super.prototype.dispose.call(this);
        };
        /**
         * Start editing the cell.
         */
        BooleanCellEditor.prototype.startEditing = function () {
            this._createWidget();
            var cell = this.cell;
            var cellInfo = this.getCellInfo(cell);
            this._input.checked = this._deserialize(cellInfo.data);
            this.editorContainer.appendChild(this._input);
            this._input.focus();
            this._bindEvents();
        };
        /**
         * Return the current boolean input entered.
         */
        BooleanCellEditor.prototype.getInput = function () {
            return this._input.checked;
        };
        BooleanCellEditor.prototype._deserialize = function (value) {
            if (value === null || value === undefined) {
                return false;
            }
            return value == true;
        };
        BooleanCellEditor.prototype._createWidget = function () {
            var input = document.createElement('input');
            input.classList.add('lm-DataGrid-cellEditorWidget');
            input.classList.add('lm-DataGrid-cellEditorCheckbox');
            input.type = 'checkbox';
            input.spellcheck = false;
            this._input = input;
        };
        BooleanCellEditor.prototype._bindEvents = function () {
            this._input.addEventListener('keydown', this);
            this._input.addEventListener('mousedown', this);
            this._input.addEventListener('blur', this);
        };
        BooleanCellEditor.prototype._unbindEvents = function () {
            this._input.removeEventListener('keydown', this);
            this._input.removeEventListener('mousedown', this);
            this._input.removeEventListener('blur', this);
        };
        BooleanCellEditor.prototype._onKeyDown = function (event) {
            switch (keyboard.getKeyboardLayout().keyForKeydownEvent(event)) {
                case 'Enter':
                    this.commit(event.shiftKey ? 'up' : 'down');
                    break;
                case 'Tab':
                    this.commit(event.shiftKey ? 'left' : 'right');
                    event.stopPropagation();
                    event.preventDefault();
                    break;
                case 'Escape':
                    this.cancel();
                    break;
            }
        };
        BooleanCellEditor.prototype._onBlur = function (event) {
            if (this.isDisposed) {
                return;
            }
            if (!this.commit()) {
                event.preventDefault();
                event.stopPropagation();
                this._input.focus();
            }
        };
        return BooleanCellEditor;
    }(CellEditor));
    /**
     * Cell editor for option cells.
     *
     * It supports multiple option selection. If cell metadata contains
     * type attribute 'array', then it behaves as a multi select.
     * In that case cell data is expected to be list of string values.
     */
    var OptionCellEditor = /** @class */ (function (_super) {
        __extends(OptionCellEditor, _super);
        function OptionCellEditor() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._isMultiSelect = false;
            return _this;
        }
        /**
         * Dispose of the resources held by cell editor.
         */
        OptionCellEditor.prototype.dispose = function () {
            if (this.isDisposed) {
                return;
            }
            _super.prototype.dispose.call(this);
            if (this._isMultiSelect) {
                document.body.removeChild(this._select);
            }
        };
        /**
         * Start editing the cell.
         */
        OptionCellEditor.prototype.startEditing = function () {
            var cell = this.cell;
            var cellInfo = this.getCellInfo(cell);
            var metadata = cell.grid.dataModel.metadata('body', cell.row, cell.column);
            this._isMultiSelect = metadata.type === 'array';
            this._createWidget();
            if (this._isMultiSelect) {
                this._select.multiple = true;
                var values = this._deserialize(cellInfo.data);
                for (var i = 0; i < this._select.options.length; ++i) {
                    var option = this._select.options.item(i);
                    option.selected = values.indexOf(option.value) !== -1;
                }
                document.body.appendChild(this._select);
            }
            else {
                this._select.value = this._deserialize(cellInfo.data);
                this.editorContainer.appendChild(this._select);
            }
            this._select.focus();
            this._bindEvents();
            this.updatePosition();
        };
        /**
         * Return the current option input.
         */
        OptionCellEditor.prototype.getInput = function () {
            if (this._isMultiSelect) {
                var input = [];
                for (var i = 0; i < this._select.selectedOptions.length; ++i) {
                    input.push(this._select.selectedOptions.item(i).value);
                }
                return input;
            }
            else {
                return this._select.value;
            }
        };
        /**
         * Reposition cell editor.
         */
        OptionCellEditor.prototype.updatePosition = function () {
            _super.prototype.updatePosition.call(this);
            if (!this._isMultiSelect) {
                return;
            }
            var cellInfo = this.getCellInfo(this.cell);
            this._select.style.position = 'absolute';
            var editorContainerRect = this.editorContainer.getBoundingClientRect();
            this._select.style.left = editorContainerRect.left + 'px';
            this._select.style.top = (editorContainerRect.top + cellInfo.height) + 'px';
            this._select.style.width = editorContainerRect.width + 'px';
            this._select.style.maxHeight = '60px';
            this.editorContainer.style.visibility = 'hidden';
        };
        OptionCellEditor.prototype._deserialize = function (value) {
            if (value === null || value === undefined) {
                return '';
            }
            if (this._isMultiSelect) {
                var values = [];
                if (Array.isArray(value)) {
                    for (var _i = 0, value_1 = value; _i < value_1.length; _i++) {
                        var item = value_1[_i];
                        values.push(item.toString());
                    }
                }
                return values;
            }
            else {
                return value.toString();
            }
        };
        OptionCellEditor.prototype._createWidget = function () {
            var cell = this.cell;
            var metadata = cell.grid.dataModel.metadata('body', cell.row, cell.column);
            var items = metadata.constraint.enum;
            var select = document.createElement('select');
            select.classList.add('lm-DataGrid-cellEditorWidget');
            for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
                var item = items_1[_i];
                var option = document.createElement("option");
                option.value = item;
                option.text = item;
                select.appendChild(option);
            }
            this._select = select;
        };
        OptionCellEditor.prototype._bindEvents = function () {
            this._select.addEventListener('keydown', this._onKeyDown.bind(this));
            this._select.addEventListener('blur', this._onBlur.bind(this));
        };
        OptionCellEditor.prototype._onKeyDown = function (event) {
            switch (keyboard.getKeyboardLayout().keyForKeydownEvent(event)) {
                case 'Enter':
                    this.commit(event.shiftKey ? 'up' : 'down');
                    break;
                case 'Tab':
                    this.commit(event.shiftKey ? 'left' : 'right');
                    event.stopPropagation();
                    event.preventDefault();
                    break;
                case 'Escape':
                    this.cancel();
                    break;
            }
        };
        OptionCellEditor.prototype._onBlur = function (event) {
            if (this.isDisposed) {
                return;
            }
            if (!this.commit()) {
                event.preventDefault();
                event.stopPropagation();
                this._select.focus();
            }
        };
        return OptionCellEditor;
    }(CellEditor));
    /**
     * Cell editor for option cells whose value can be any value
     * from set of pre-defined options or values that can be input by user.
     */
    var DynamicOptionCellEditor = /** @class */ (function (_super) {
        __extends(DynamicOptionCellEditor, _super);
        function DynamicOptionCellEditor() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Handle the DOM events for the editor.
         *
         * @param event - The DOM event sent to the editor.
         */
        DynamicOptionCellEditor.prototype.handleEvent = function (event) {
            switch (event.type) {
                case 'keydown':
                    this._onKeyDown(event);
                    break;
                case 'blur':
                    this._onBlur(event);
                    break;
            }
        };
        /**
         * Dispose of the resources held by cell editor.
         */
        DynamicOptionCellEditor.prototype.dispose = function () {
            if (this.isDisposed) {
                return;
            }
            this._unbindEvents();
            _super.prototype.dispose.call(this);
        };
        /**
         * Start editing the cell.
         */
        DynamicOptionCellEditor.prototype.startEditing = function () {
            this._createWidget();
            var cell = this.cell;
            var cellInfo = this.getCellInfo(cell);
            this._input.value = this._deserialize(cellInfo.data);
            this.editorContainer.appendChild(this._input);
            this._input.focus();
            this._input.select();
            this._bindEvents();
        };
        /**
         * Return the current option input.
         */
        DynamicOptionCellEditor.prototype.getInput = function () {
            return this._input.value;
        };
        DynamicOptionCellEditor.prototype._deserialize = function (value) {
            if (value === null || value === undefined) {
                return '';
            }
            return value.toString();
        };
        DynamicOptionCellEditor.prototype._createWidget = function () {
            var cell = this.cell;
            var grid = cell.grid;
            var dataModel = grid.dataModel;
            var rowCount = dataModel.rowCount('body');
            var listId = 'cell-editor-list';
            var list = document.createElement('datalist');
            list.id = listId;
            var input = document.createElement('input');
            input.classList.add('lm-DataGrid-cellEditorWidget');
            input.classList.add('lm-DataGrid-cellEditorInput');
            var valueSet = new Set();
            for (var r = 0; r < rowCount; ++r) {
                var data = dataModel.data('body', r, cell.column);
                if (data) {
                    valueSet.add(data);
                }
            }
            valueSet.forEach(function (value) {
                var option = document.createElement("option");
                option.value = value;
                option.text = value;
                list.appendChild(option);
            });
            this.editorContainer.appendChild(list);
            input.setAttribute('list', listId);
            this._input = input;
        };
        DynamicOptionCellEditor.prototype._bindEvents = function () {
            this._input.addEventListener('keydown', this);
            this._input.addEventListener('blur', this);
        };
        DynamicOptionCellEditor.prototype._unbindEvents = function () {
            this._input.removeEventListener('keydown', this);
            this._input.removeEventListener('blur', this);
        };
        DynamicOptionCellEditor.prototype._onKeyDown = function (event) {
            switch (keyboard.getKeyboardLayout().keyForKeydownEvent(event)) {
                case 'Enter':
                    this.commit(event.shiftKey ? 'up' : 'down');
                    break;
                case 'Tab':
                    this.commit(event.shiftKey ? 'left' : 'right');
                    event.stopPropagation();
                    event.preventDefault();
                    break;
                case 'Escape':
                    this.cancel();
                    break;
            }
        };
        DynamicOptionCellEditor.prototype._onBlur = function (event) {
            if (this.isDisposed) {
                return;
            }
            if (!this.commit()) {
                event.preventDefault();
                event.stopPropagation();
                this._input.focus();
            }
        };
        return DynamicOptionCellEditor;
    }(CellEditor));

    /**
     * An object which provides the data for a data grid.
     *
     * #### Notes
     * If the predefined data models are insufficient for a particular use
     * case, a custom model can be defined which derives from this class.
     */
    exports.DataModel = /** @class */ (function () {
        function DataModel() {
            this._changed = new signaling.Signal(this);
        }
        Object.defineProperty(DataModel.prototype, "changed", {
            /**
             * A signal emitted when the data model has changed.
             */
            get: function () {
                return this._changed;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Get the metadata for a cell in the data model.
         *
         * @param region - The cell region of interest.
         *
         * @param row - The row index of the cell of interest.
         *
         * @param column - The column index of the cell of interest.
         *
         * @returns The metadata for the specified cell.
         *
         * #### Notes
         * The returned metadata should be treated as immutable.
         *
         * This method is called often, and so should be efficient.
         *
         * The default implementation returns `{}`.
         */
        DataModel.prototype.metadata = function (region, row, column) {
            return DataModel.emptyMetadata;
        };
        /**
         * Emit the `changed` signal for the data model.
         *
         * #### Notes
         * Subclasses should call this method whenever the data model has
         * changed so that attached data grids can update themselves.
         */
        DataModel.prototype.emitChanged = function (args) {
            this._changed.emit(args);
        };
        return DataModel;
    }());
    /**
     * An object which provides the mutable data for a data grid.
     *
     * #### Notes
     * This object is an extension to `DataModel` and it only adds ability to
     * change data for cells.
     */
    var MutableDataModel = /** @class */ (function (_super) {
        __extends(MutableDataModel, _super);
        function MutableDataModel() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return MutableDataModel;
    }(exports.DataModel));
    /**
     * The namespace for the `DataModel` class statics.
     */
    (function (DataModel) {
        /**
         * A singleton empty metadata object.
         */
        DataModel.emptyMetadata = Object.freeze({});
    })(exports.DataModel || (exports.DataModel = {}));

    /**
     * A thin caching wrapper around a 2D canvas rendering context.
     *
     * #### Notes
     * This class is mostly a transparent wrapper around a canvas rendering
     * context which improves performance when writing context state.
     *
     * For best performance, avoid reading state from the `gc`. Writes are
     * cached based on the previously written value.
     *
     * Unless otherwise specified, the API and semantics of this class are
     * identical to the builtin 2D canvas rendering context:
     * https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
     *
     * The wrapped canvas context should not be manipulated externally
     * until the wrapping `GraphicsContext` object is disposed.
     */
    var GraphicsContext = /** @class */ (function () {
        /**
         * Create a new graphics context object.
         *
         * @param context - The 2D canvas rendering context to wrap.
         */
        function GraphicsContext(context) {
            this._disposed = false;
            this._context = context;
            this._state = Private$2.State.create(context);
        }
        GraphicsContext.prototype.dispose = function () {
            // Bail if the gc is already disposed.
            if (this._disposed) {
                return;
            }
            // Mark the gc as disposed.
            this._disposed = true;
            // Pop any unrestored saves.
            while (this._state.next) {
                this._state = this._state.next;
                this._context.restore();
            }
        };
        Object.defineProperty(GraphicsContext.prototype, "isDisposed", {
            get: function () {
                return this._disposed;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GraphicsContext.prototype, "fillStyle", {
            get: function () {
                return this._context.fillStyle;
            },
            set: function (value) {
                if (this._state.fillStyle !== value) {
                    this._state.fillStyle = value;
                    this._context.fillStyle = value;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GraphicsContext.prototype, "strokeStyle", {
            get: function () {
                return this._context.strokeStyle;
            },
            set: function (value) {
                if (this._state.strokeStyle !== value) {
                    this._state.strokeStyle = value;
                    this._context.strokeStyle = value;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GraphicsContext.prototype, "font", {
            get: function () {
                return this._context.font;
            },
            set: function (value) {
                if (this._state.font !== value) {
                    this._state.font = value;
                    this._context.font = value;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GraphicsContext.prototype, "textAlign", {
            get: function () {
                return this._context.textAlign;
            },
            set: function (value) {
                if (this._state.textAlign !== value) {
                    this._state.textAlign = value;
                    this._context.textAlign = value;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GraphicsContext.prototype, "textBaseline", {
            get: function () {
                return this._context.textBaseline;
            },
            set: function (value) {
                if (this._state.textBaseline !== value) {
                    this._state.textBaseline = value;
                    this._context.textBaseline = value;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GraphicsContext.prototype, "lineCap", {
            get: function () {
                return this._context.lineCap;
            },
            set: function (value) {
                if (this._state.lineCap !== value) {
                    this._state.lineCap = value;
                    this._context.lineCap = value;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GraphicsContext.prototype, "lineDashOffset", {
            get: function () {
                return this._context.lineDashOffset;
            },
            set: function (value) {
                if (this._state.lineDashOffset !== value) {
                    this._state.lineDashOffset = value;
                    this._context.lineDashOffset = value;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GraphicsContext.prototype, "lineJoin", {
            get: function () {
                return this._context.lineJoin;
            },
            set: function (value) {
                if (this._state.lineJoin !== value) {
                    this._state.lineJoin = value;
                    this._context.lineJoin = value;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GraphicsContext.prototype, "lineWidth", {
            get: function () {
                return this._context.lineWidth;
            },
            set: function (value) {
                if (this._state.lineWidth !== value) {
                    this._state.lineWidth = value;
                    this._context.lineWidth = value;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GraphicsContext.prototype, "miterLimit", {
            get: function () {
                return this._context.miterLimit;
            },
            set: function (value) {
                if (this._state.miterLimit !== value) {
                    this._state.miterLimit = value;
                    this._context.miterLimit = value;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GraphicsContext.prototype, "shadowBlur", {
            get: function () {
                return this._context.shadowBlur;
            },
            set: function (value) {
                if (this._state.shadowBlur !== value) {
                    this._state.shadowBlur = value;
                    this._context.shadowBlur = value;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GraphicsContext.prototype, "shadowColor", {
            get: function () {
                return this._context.shadowColor;
            },
            set: function (value) {
                if (this._state.shadowColor !== value) {
                    this._state.shadowColor = value;
                    this._context.shadowColor = value;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GraphicsContext.prototype, "shadowOffsetX", {
            get: function () {
                return this._context.shadowOffsetX;
            },
            set: function (value) {
                if (this._state.shadowOffsetX !== value) {
                    this._state.shadowOffsetX = value;
                    this._context.shadowOffsetX = value;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GraphicsContext.prototype, "shadowOffsetY", {
            get: function () {
                return this._context.shadowOffsetY;
            },
            set: function (value) {
                if (this._state.shadowOffsetY !== value) {
                    this._state.shadowOffsetY = value;
                    this._context.shadowOffsetY = value;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GraphicsContext.prototype, "imageSmoothingEnabled", {
            get: function () {
                return this._context.imageSmoothingEnabled;
            },
            set: function (value) {
                if (this._state.imageSmoothingEnabled !== value) {
                    this._state.imageSmoothingEnabled = value;
                    this._context.imageSmoothingEnabled = value;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GraphicsContext.prototype, "globalAlpha", {
            get: function () {
                return this._context.globalAlpha;
            },
            set: function (value) {
                if (this._state.globalAlpha !== value) {
                    this._state.globalAlpha = value;
                    this._context.globalAlpha = value;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(GraphicsContext.prototype, "globalCompositeOperation", {
            get: function () {
                return this._context.globalCompositeOperation;
            },
            set: function (value) {
                if (this._state.globalCompositeOperation !== value) {
                    this._state.globalCompositeOperation = value;
                    this._context.globalCompositeOperation = value;
                }
            },
            enumerable: true,
            configurable: true
        });
        GraphicsContext.prototype.getLineDash = function () {
            return this._context.getLineDash();
        };
        GraphicsContext.prototype.setLineDash = function (segments) {
            this._context.setLineDash(segments);
        };
        GraphicsContext.prototype.rotate = function (angle) {
            this._context.rotate(angle);
        };
        GraphicsContext.prototype.scale = function (x, y) {
            this._context.scale(x, y);
        };
        GraphicsContext.prototype.transform = function (m11, m12, m21, m22, dx, dy) {
            this._context.transform(m11, m12, m21, m22, dx, dy);
        };
        GraphicsContext.prototype.translate = function (x, y) {
            this._context.translate(x, y);
        };
        GraphicsContext.prototype.setTransform = function (m11, m12, m21, m22, dx, dy) {
            this._context.setTransform(m11, m12, m21, m22, dx, dy);
        };
        GraphicsContext.prototype.save = function () {
            // Clone an push the current state to the stack.
            this._state = Private$2.State.push(this._state);
            // Save the wrapped context state.
            this._context.save();
        };
        GraphicsContext.prototype.restore = function () {
            // Bail if there is no state to restore.
            if (!this._state.next) {
                return;
            }
            // Pop the saved state from the stack.
            this._state = Private$2.State.pop(this._state);
            // Restore the wrapped context state.
            this._context.restore();
        };
        GraphicsContext.prototype.beginPath = function () {
            return this._context.beginPath();
        };
        GraphicsContext.prototype.closePath = function () {
            this._context.closePath();
        };
        GraphicsContext.prototype.isPointInPath = function (x, y, fillRule) {
            var result;
            if (arguments.length === 2) {
                result = this._context.isPointInPath(x, y);
            }
            else {
                result = this._context.isPointInPath(x, y, fillRule);
            }
            return result;
        };
        GraphicsContext.prototype.arc = function (x, y, radius, startAngle, endAngle, anticlockwise) {
            if (arguments.length === 5) {
                this._context.arc(x, y, radius, startAngle, endAngle);
            }
            else {
                this._context.arc(x, y, radius, startAngle, endAngle, anticlockwise);
            }
        };
        GraphicsContext.prototype.arcTo = function (x1, y1, x2, y2, radius) {
            this._context.arcTo(x1, y1, x2, y2, radius);
        };
        GraphicsContext.prototype.bezierCurveTo = function (cp1x, cp1y, cp2x, cp2y, x, y) {
            this._context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
        };
        GraphicsContext.prototype.ellipse = function (x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise) {
            if (arguments.length === 7) {
                this._context.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle);
            }
            else {
                this._context.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise);
            }
        };
        GraphicsContext.prototype.lineTo = function (x, y) {
            this._context.lineTo(x, y);
        };
        GraphicsContext.prototype.moveTo = function (x, y) {
            this._context.moveTo(x, y);
        };
        GraphicsContext.prototype.quadraticCurveTo = function (cpx, cpy, x, y) {
            this._context.quadraticCurveTo(cpx, cpy, x, y);
        };
        GraphicsContext.prototype.rect = function (x, y, w, h) {
            this._context.rect(x, y, w, h);
        };
        GraphicsContext.prototype.clip = function (fillRule) {
            if (arguments.length === 0) {
                this._context.clip();
            }
            else {
                this._context.clip(fillRule);
            }
        };
        GraphicsContext.prototype.fill = function (fillRule) {
            if (arguments.length === 0) {
                this._context.fill();
            }
            else {
                this._context.fill(fillRule);
            }
        };
        GraphicsContext.prototype.stroke = function () {
            this._context.stroke();
        };
        GraphicsContext.prototype.clearRect = function (x, y, w, h) {
            return this._context.clearRect(x, y, w, h);
        };
        GraphicsContext.prototype.fillRect = function (x, y, w, h) {
            this._context.fillRect(x, y, w, h);
        };
        GraphicsContext.prototype.fillText = function (text, x, y, maxWidth) {
            if (arguments.length === 3) {
                this._context.fillText(text, x, y);
            }
            else {
                this._context.fillText(text, x, y, maxWidth);
            }
        };
        GraphicsContext.prototype.strokeRect = function (x, y, w, h) {
            this._context.strokeRect(x, y, w, h);
        };
        GraphicsContext.prototype.strokeText = function (text, x, y, maxWidth) {
            if (arguments.length === 3) {
                this._context.strokeText(text, x, y);
            }
            else {
                this._context.strokeText(text, x, y, maxWidth);
            }
        };
        GraphicsContext.prototype.measureText = function (text) {
            return this._context.measureText(text);
        };
        GraphicsContext.prototype.createLinearGradient = function (x0, y0, x1, y1) {
            return this._context.createLinearGradient(x0, y0, x1, y1);
        };
        GraphicsContext.prototype.createRadialGradient = function (x0, y0, r0, x1, y1, r1) {
            return this._context.createRadialGradient(x0, y0, r0, x1, y1, r1);
        };
        GraphicsContext.prototype.createPattern = function (image, repetition) {
            return this._context.createPattern(image, repetition);
        };
        GraphicsContext.prototype.createImageData = function () {
            return this._context.createImageData.apply(this._context, arguments);
        };
        GraphicsContext.prototype.getImageData = function (sx, sy, sw, sh) {
            return this._context.getImageData(sx, sy, sw, sh);
        };
        GraphicsContext.prototype.putImageData = function () {
            this._context.putImageData.apply(this._context, arguments);
        };
        GraphicsContext.prototype.drawImage = function () {
            this._context.drawImage.apply(this._context, arguments);
        };
        GraphicsContext.prototype.drawFocusIfNeeded = function (element) {
            this._context.drawFocusIfNeeded(element);
        };
        return GraphicsContext;
    }());
    /**
     * The namespace for the module implementation details.
     */
    var Private$2;
    (function (Private) {
        /**
         * The index of next valid pool object.
         */
        var pi = -1;
        /**
         * A state object allocation pool.
         */
        var pool = [];
        /**
         * An object which holds the state for a gc.
         */
        var State = /** @class */ (function () {
            function State() {
            }
            /**
             * Create a gc state object from a 2D canvas context.
             */
            State.create = function (context) {
                var state = pi < 0 ? new State() : pool[pi--];
                state.next = null;
                state.fillStyle = context.fillStyle;
                state.font = context.font;
                state.globalAlpha = context.globalAlpha;
                state.globalCompositeOperation = context.globalCompositeOperation;
                state.imageSmoothingEnabled = context.imageSmoothingEnabled;
                state.lineCap = context.lineCap;
                state.lineDashOffset = context.lineDashOffset;
                state.lineJoin = context.lineJoin;
                state.lineWidth = context.lineWidth;
                state.miterLimit = context.miterLimit;
                state.shadowBlur = context.shadowBlur;
                state.shadowColor = context.shadowColor;
                state.shadowOffsetX = context.shadowOffsetX;
                state.shadowOffsetY = context.shadowOffsetY;
                state.strokeStyle = context.strokeStyle;
                state.textAlign = context.textAlign;
                state.textBaseline = context.textBaseline;
                return state;
            };
            /**
             * Clone an existing gc state object and add it to the state stack.
             */
            State.push = function (other) {
                var state = pi < 0 ? new State() : pool[pi--];
                state.next = other;
                state.fillStyle = other.fillStyle;
                state.font = other.font;
                state.globalAlpha = other.globalAlpha;
                state.globalCompositeOperation = other.globalCompositeOperation;
                state.imageSmoothingEnabled = other.imageSmoothingEnabled;
                state.lineCap = other.lineCap;
                state.lineDashOffset = other.lineDashOffset;
                state.lineJoin = other.lineJoin;
                state.lineWidth = other.lineWidth;
                state.miterLimit = other.miterLimit;
                state.shadowBlur = other.shadowBlur;
                state.shadowColor = other.shadowColor;
                state.shadowOffsetX = other.shadowOffsetX;
                state.shadowOffsetY = other.shadowOffsetY;
                state.strokeStyle = other.strokeStyle;
                state.textAlign = other.textAlign;
                state.textBaseline = other.textBaseline;
                return state;
            };
            /**
             * Pop the next state object and return the current to the pool
             */
            State.pop = function (state) {
                state.fillStyle = '';
                state.strokeStyle = '';
                pool[++pi] = state;
                return state.next;
            };
            return State;
        }());
        Private.State = State;
    })(Private$2 || (Private$2 = {}));

    /**
     * A cell renderer which renders data values as text.
     */
    exports.TextRenderer = /** @class */ (function (_super) {
        __extends(TextRenderer, _super);
        /**
         * Construct a new text renderer.
         *
         * @param options - The options for initializing the renderer.
         */
        function TextRenderer(options) {
            if (options === void 0) { options = {}; }
            var _this = _super.call(this) || this;
            _this.font = options.font || '12px sans-serif';
            _this.textColor = options.textColor || '#000000';
            _this.backgroundColor = options.backgroundColor || '';
            _this.verticalAlignment = options.verticalAlignment || 'center';
            _this.horizontalAlignment = options.horizontalAlignment || 'left';
            _this.format = options.format || TextRenderer.formatGeneric();
            _this.elideDirection = options.elideDirection || 'right';
            _this.wrapText = options.wrapText || false;
            return _this;
        }
        /**
         * Paint the content for a cell.
         *
         * @param gc - The graphics context to use for drawing.
         *
         * @param config - The configuration data for the cell.
         */
        TextRenderer.prototype.paint = function (gc, config) {
            this.drawBackground(gc, config);
            this.drawText(gc, config);
        };
        /**
         * Draw the background for the cell.
         *
         * @param gc - The graphics context to use for drawing.
         *
         * @param config - The configuration data for the cell.
         */
        TextRenderer.prototype.drawBackground = function (gc, config) {
            // Resolve the background color for the cell.
            var color = exports.CellRenderer.resolveOption(this.backgroundColor, config);
            // Bail if there is no background color to draw.
            if (!color) {
                return;
            }
            // Fill the cell with the background color.
            gc.fillStyle = color;
            gc.fillRect(config.x, config.y, config.width, config.height);
        };
        /**
         * Draw the text for the cell.
         *
         * @param gc - The graphics context to use for drawing.
         *
         * @param config - The configuration data for the cell.
         */
        TextRenderer.prototype.drawText = function (gc, config) {
            // Resolve the font for the cell.
            var font = exports.CellRenderer.resolveOption(this.font, config);
            // Bail if there is no font to draw.
            if (!font) {
                return;
            }
            // Resolve the text color for the cell.
            var color = exports.CellRenderer.resolveOption(this.textColor, config);
            // Bail if there is no text color to draw.
            if (!color) {
                return;
            }
            // Format the cell value to text.
            var format = this.format;
            var text = format(config);
            // Bail if there is no text to draw.
            if (!text) {
                return;
            }
            // Resolve the vertical and horizontal alignment.
            var vAlign = exports.CellRenderer.resolveOption(this.verticalAlignment, config);
            var hAlign = exports.CellRenderer.resolveOption(this.horizontalAlignment, config);
            // Resolve the elision direction
            var elideDirection = exports.CellRenderer.resolveOption(this.elideDirection, config);
            // Resolve the text wrapping flag
            var wrapText = exports.CellRenderer.resolveOption(this.wrapText, config);
            // Compute the padded text box height for the specified alignment.
            var boxHeight = config.height - (vAlign === 'center' ? 1 : 2);
            // Bail if the text box has no effective size.
            if (boxHeight <= 0) {
                return;
            }
            // Compute the text height for the gc font.
            var textHeight = TextRenderer.measureFontHeight(font);
            // Set up the text position variables.
            var textX;
            var textY;
            var boxWidth;
            // Compute the Y position for the text.
            switch (vAlign) {
                case 'top':
                    textY = config.y + 2 + textHeight;
                    break;
                case 'center':
                    textY = config.y + config.height / 2 + textHeight / 2;
                    break;
                case 'bottom':
                    textY = config.y + config.height - 2;
                    break;
                default:
                    throw 'unreachable';
            }
            // Compute the X position for the text.
            switch (hAlign) {
                case 'left':
                    textX = config.x + 8;
                    boxWidth = config.width - 14;
                    break;
                case 'center':
                    textX = config.x + config.width / 2;
                    boxWidth = config.width;
                    break;
                case 'right':
                    textX = config.x + config.width - 8;
                    boxWidth = config.width - 14;
                    break;
                default:
                    throw 'unreachable';
            }
            // Clip the cell if the text is taller than the text box height.
            if (textHeight > boxHeight) {
                gc.beginPath();
                gc.rect(config.x, config.y, config.width, config.height - 1);
                gc.clip();
            }
            // Set the gc state.
            gc.font = font;
            gc.fillStyle = color;
            gc.textAlign = hAlign;
            gc.textBaseline = 'bottom';
            // The current text width in pixels.
            var textWidth = gc.measureText(text).width;
            // Apply text wrapping if enabled.
            if (wrapText && textWidth > boxWidth) {
                // Make sure box clipping happens.
                gc.beginPath();
                gc.rect(config.x, config.y, config.width, config.height - 1);
                gc.clip();
                // Split column name to words based on
                // whitespace preceding a word boundary.
                // "Hello  world" --> ["Hello  ", "world"]
                var wordsInColumn = text.split(/\s(?=\b)/);
                // Y-coordinate offset for any additional lines
                var curY = textY;
                var textInCurrentLine = wordsInColumn.shift();
                // Single word. Applying text wrap on word by splitting
                // it into characters and fitting the maximum number of
                // characters possible per line (box width).
                if (wordsInColumn.length === 0) {
                    var curLineTextWidth = gc.measureText(textInCurrentLine).width;
                    while (curLineTextWidth > boxWidth && textInCurrentLine !== "") {
                        // Iterating from the end of the string until we find a
                        // substring (0,i) which has a width less than the box width.
                        for (var i = textInCurrentLine.length; i > 0; i--) {
                            var curSubString = textInCurrentLine.substring(0, i);
                            var curSubStringWidth = gc.measureText(curSubString).width;
                            if (curSubStringWidth < boxWidth || curSubString.length === 1) {
                                // Found a substring which has a width less than the current
                                // box width. Rendering that substring on the current line
                                // and setting the remainder of the parent string as the next
                                // string to iterate on for the next line.
                                var nextLineText = textInCurrentLine.substring(i, textInCurrentLine.length);
                                textInCurrentLine = nextLineText;
                                curLineTextWidth = gc.measureText(textInCurrentLine).width;
                                gc.fillText(curSubString, textX, curY);
                                curY += textHeight;
                                // No need to continue iterating after we identified
                                // an index to break the string on.
                                break;
                            }
                        }
                    }
                }
                // Multiple words in column header. Fitting maximum 
                // number of words possible per line (box width).
                else {
                    while (wordsInColumn.length !== 0) {
                        // Processing the next word in the queue.
                        var curWord = wordsInColumn.shift();
                        // Joining that word with the existing text for
                        // the current line.
                        var incrementedText = [textInCurrentLine, curWord].join(" ");
                        var incrementedTextWidth = gc.measureText(incrementedText).width;
                        if (incrementedTextWidth > boxWidth) {
                            // If the newly combined text has a width larger than
                            // the box width, we render the line before the current
                            // word was added. We set the current word as the next
                            // line.
                            gc.fillText(textInCurrentLine, textX, curY);
                            curY += textHeight;
                            textInCurrentLine = curWord;
                        }
                        else {
                            // The combined text hasd a width less than the box width. We
                            // set the the current line text to be the new combined text.
                            textInCurrentLine = incrementedText;
                        }
                    }
                }
                gc.fillText(textInCurrentLine, textX, curY);
                // Terminating the call here as we don't want
                // to apply text eliding when wrapping is active.
                return;
            }
            // Elide text that is too long
            var elide = '\u2026';
            // Compute elided text
            if (elideDirection === 'right') {
                while ((textWidth > boxWidth) && (text.length > 1)) {
                    if (text.length > 4 && textWidth >= 2 * boxWidth) {
                        // If text width is substantially bigger, take half the string
                        text = text.substring(0, (text.length / 2) + 1) + elide;
                    }
                    else {
                        // Otherwise incrementally remove the last character
                        text = text.substring(0, text.length - 2) + elide;
                    }
                    textWidth = gc.measureText(text).width;
                }
            }
            else {
                while ((textWidth > boxWidth) && (text.length > 1)) {
                    if (text.length > 4 && textWidth >= 2 * boxWidth) {
                        // If text width is substantially bigger, take half the string
                        text = elide + text.substring((text.length / 2));
                    }
                    else {
                        // Otherwise incrementally remove the last character
                        text = elide + text.substring(2);
                    }
                    textWidth = gc.measureText(text).width;
                }
            }
            // Draw the text for the cell.
            gc.fillText(text, textX, textY);
        };
        return TextRenderer;
    }(exports.CellRenderer));
    /**
     * The namespace for the `TextRenderer` class statics.
     */
    (function (TextRenderer) {
        /**
         * Create a generic text format function.
         *
         * @param options - The options for creating the format function.
         *
         * @returns A new generic text format function.
         *
         * #### Notes
         * This formatter uses the builtin `String()` to coerce any value
         * to a string.
         */
        function formatGeneric(options) {
            if (options === void 0) { options = {}; }
            var missing = options.missing || '';
            return function (_a) {
                var value = _a.value;
                if (value === null || value === undefined) {
                    return missing;
                }
                return String(value);
            };
        }
        TextRenderer.formatGeneric = formatGeneric;
        /**
         * Create a fixed decimal format function.
         *
         * @param options - The options for creating the format function.
         *
         * @returns A new fixed decimal format function.
         *
         * #### Notes
         * This formatter uses the builtin `Number()` and `toFixed()` to
         * coerce values.
         *
         * The `formatIntlNumber()` formatter is more flexible, but slower.
         */
        function formatFixed(options) {
            if (options === void 0) { options = {}; }
            var digits = options.digits;
            var missing = options.missing || '';
            return function (_a) {
                var value = _a.value;
                if (value === null || value === undefined) {
                    return missing;
                }
                return Number(value).toFixed(digits);
            };
        }
        TextRenderer.formatFixed = formatFixed;
        /**
         * Create a significant figure format function.
         *
         * @param options - The options for creating the format function.
         *
         * @returns A new significant figure format function.
         *
         * #### Notes
         * This formatter uses the builtin `Number()` and `toPrecision()`
         * to coerce values.
         *
         * The `formatIntlNumber()` formatter is more flexible, but slower.
         */
        function formatPrecision(options) {
            if (options === void 0) { options = {}; }
            var digits = options.digits;
            var missing = options.missing || '';
            return function (_a) {
                var value = _a.value;
                if (value === null || value === undefined) {
                    return missing;
                }
                return Number(value).toPrecision(digits);
            };
        }
        TextRenderer.formatPrecision = formatPrecision;
        /**
         * Create a scientific notation format function.
         *
         * @param options - The options for creating the format function.
         *
         * @returns A new scientific notation format function.
         *
         * #### Notes
         * This formatter uses the builtin `Number()` and `toExponential()`
         * to coerce values.
         *
         * The `formatIntlNumber()` formatter is more flexible, but slower.
         */
        function formatExponential(options) {
            if (options === void 0) { options = {}; }
            var digits = options.digits;
            var missing = options.missing || '';
            return function (_a) {
                var value = _a.value;
                if (value === null || value === undefined) {
                    return missing;
                }
                return Number(value).toExponential(digits);
            };
        }
        TextRenderer.formatExponential = formatExponential;
        /**
         * Create an international number format function.
         *
         * @param options - The options for creating the format function.
         *
         * @returns A new international number format function.
         *
         * #### Notes
         * This formatter uses the builtin `Intl.NumberFormat` object to
         * coerce values.
         *
         * This is the most flexible (but slowest) number formatter.
         */
        function formatIntlNumber(options) {
            if (options === void 0) { options = {}; }
            var missing = options.missing || '';
            var nft = new Intl.NumberFormat(options.locales, options.options);
            return function (_a) {
                var value = _a.value;
                if (value === null || value === undefined) {
                    return missing;
                }
                return nft.format(value);
            };
        }
        TextRenderer.formatIntlNumber = formatIntlNumber;
        /**
         * Create a date format function.
         *
         * @param options - The options for creating the format function.
         *
         * @returns A new date format function.
         *
         * #### Notes
         * This formatter uses `Date.toDateString()` to format the values.
         *
         * If a value is not a `Date` object, `new Date(value)` is used to
         * coerce the value to a date.
         *
         * The `formatIntlDateTime()` formatter is more flexible, but slower.
         */
        function formatDate(options) {
            if (options === void 0) { options = {}; }
            var missing = options.missing || '';
            return function (_a) {
                var value = _a.value;
                if (value === null || value === undefined) {
                    return missing;
                }
                if (value instanceof Date) {
                    return value.toDateString();
                }
                return (new Date(value)).toDateString();
            };
        }
        TextRenderer.formatDate = formatDate;
        /**
         * Create a time format function.
         *
         * @param options - The options for creating the format function.
         *
         * @returns A new time format function.
         *
         * #### Notes
         * This formatter uses `Date.toTimeString()` to format the values.
         *
         * If a value is not a `Date` object, `new Date(value)` is used to
         * coerce the value to a date.
         *
         * The `formatIntlDateTime()` formatter is more flexible, but slower.
         */
        function formatTime(options) {
            if (options === void 0) { options = {}; }
            var missing = options.missing || '';
            return function (_a) {
                var value = _a.value;
                if (value === null || value === undefined) {
                    return missing;
                }
                if (value instanceof Date) {
                    return value.toTimeString();
                }
                return (new Date(value)).toTimeString();
            };
        }
        TextRenderer.formatTime = formatTime;
        /**
         * Create an ISO datetime format function.
         *
         * @param options - The options for creating the format function.
         *
         * @returns A new ISO datetime format function.
         *
         * #### Notes
         * This formatter uses `Date.toISOString()` to format the values.
         *
         * If a value is not a `Date` object, `new Date(value)` is used to
         * coerce the value to a date.
         *
         * The `formatIntlDateTime()` formatter is more flexible, but slower.
         */
        function formatISODateTime(options) {
            if (options === void 0) { options = {}; }
            var missing = options.missing || '';
            return function (_a) {
                var value = _a.value;
                if (value === null || value === undefined) {
                    return missing;
                }
                if (value instanceof Date) {
                    return value.toISOString();
                }
                return (new Date(value)).toISOString();
            };
        }
        TextRenderer.formatISODateTime = formatISODateTime;
        /**
         * Create a UTC datetime format function.
         *
         * @param options - The options for creating the format function.
         *
         * @returns A new UTC datetime format function.
         *
         * #### Notes
         * This formatter uses `Date.toUTCString()` to format the values.
         *
         * If a value is not a `Date` object, `new Date(value)` is used to
         * coerce the value to a date.
         *
         * The `formatIntlDateTime()` formatter is more flexible, but slower.
         */
        function formatUTCDateTime(options) {
            if (options === void 0) { options = {}; }
            var missing = options.missing || '';
            return function (_a) {
                var value = _a.value;
                if (value === null || value === undefined) {
                    return missing;
                }
                if (value instanceof Date) {
                    return value.toUTCString();
                }
                return (new Date(value)).toUTCString();
            };
        }
        TextRenderer.formatUTCDateTime = formatUTCDateTime;
        /**
         * Create an international datetime format function.
         *
         * @param options - The options for creating the format function.
         *
         * @returns A new international datetime format function.
         *
         * #### Notes
         * This formatter uses the builtin `Intl.DateTimeFormat` object to
         * coerce values.
         *
         * This is the most flexible (but slowest) datetime formatter.
         */
        function formatIntlDateTime(options) {
            if (options === void 0) { options = {}; }
            var missing = options.missing || '';
            var dtf = new Intl.DateTimeFormat(options.locales, options.options);
            return function (_a) {
                var value = _a.value;
                if (value === null || value === undefined) {
                    return missing;
                }
                return dtf.format(value);
            };
        }
        TextRenderer.formatIntlDateTime = formatIntlDateTime;
        /**
         * Measure the height of a font.
         *
         * @param font - The CSS font string of interest.
         *
         * @returns The height of the font bounding box.
         *
         * #### Notes
         * This function uses a temporary DOM node to measure the text box
         * height for the specified font. The first call for a given font
         * will incur a DOM reflow, but the return value is cached, so any
         * subsequent call for the same font will return the cached value.
         */
        function measureFontHeight(font) {
            // Look up the cached font height.
            var height = Private$3.fontHeightCache[font];
            // Return the cached font height if it exists.
            if (height !== undefined) {
                return height;
            }
            // Normalize the font.
            Private$3.fontMeasurementGC.font = font;
            var normFont = Private$3.fontMeasurementGC.font;
            // Set the font on the measurement node.
            Private$3.fontMeasurementNode.style.font = normFont;
            // Add the measurement node to the document.
            document.body.appendChild(Private$3.fontMeasurementNode);
            // Measure the node height.
            height = Private$3.fontMeasurementNode.offsetHeight;
            // Remove the measurement node from the document.
            document.body.removeChild(Private$3.fontMeasurementNode);
            // Cache the measured height for the font and norm font.
            Private$3.fontHeightCache[font] = height;
            Private$3.fontHeightCache[normFont] = height;
            // Return the measured height.
            return height;
        }
        TextRenderer.measureFontHeight = measureFontHeight;
    })(exports.TextRenderer || (exports.TextRenderer = {}));
    /**
     * The namespace for the module implementation details.
     */
    var Private$3;
    (function (Private) {
        /**
         * A cache of measured font heights.
         */
        Private.fontHeightCache = Object.create(null);
        /**
         * The DOM node used for font height measurement.
         */
        Private.fontMeasurementNode = (function () {
            var node = document.createElement('div');
            node.style.position = 'absolute';
            node.style.top = '-99999px';
            node.style.left = '-99999px';
            node.style.visibility = 'hidden';
            node.textContent = 'M';
            return node;
        })();
        /**
         * The GC used for font measurement.
         */
        Private.fontMeasurementGC = (function () {
            var canvas = document.createElement('canvas');
            canvas.width = 0;
            canvas.height = 0;
            return canvas.getContext('2d');
        })();
    })(Private$3 || (Private$3 = {}));

    /**
     * A class which manages the mapping of cell renderers.
     */
    var RendererMap = /** @class */ (function () {
        /**
         * Construct a new renderer map.
         *
         * @param values - The initial values for the map.
         *
         * @param fallback - The renderer of last resort.
         */
        function RendererMap(values, fallback) {
            if (values === void 0) { values = {}; }
            this._changed = new signaling.Signal(this);
            this._values = __assign({}, values);
            this._fallback = fallback || new exports.TextRenderer();
        }
        Object.defineProperty(RendererMap.prototype, "changed", {
            /**
             * A signal emitted when the renderer map has changed.
             */
            get: function () {
                return this._changed;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Get the cell renderer to use for the given cell config.
         *
         * @param config - The cell config of interest.
         *
         * @returns The renderer to use for the cell.
         */
        RendererMap.prototype.get = function (config) {
            // Fetch the renderer from the values map.
            var renderer = this._values[config.region];
            // Execute a resolver function if necessary.
            if (typeof renderer === 'function') {
                try {
                    renderer = renderer(config);
                }
                catch (err) {
                    renderer = undefined;
                    console.error(err);
                }
            }
            // Return the renderer or the fallback.
            return renderer || this._fallback;
        };
        /**
         * Update the renderer map with new values
         *
         * @param values - The updated values for the map.
         *
         * @param fallback - The renderer of last resort.
         *
         * #### Notes
         * This method always emits the `changed` signal.
         */
        RendererMap.prototype.update = function (values, fallback) {
            if (values === void 0) { values = {}; }
            this._values = __assign(__assign({}, this._values), values);
            this._fallback = fallback || this._fallback;
            this._changed.emit(undefined);
        };
        return RendererMap;
    }());

    // Copyright (c) Jupyter Development Team.
    /**
     * An object which manages a collection of variable sized sections.
     *
     * #### Notes
     * This class is an implementation detail. It is designed to manage
     * the variable row and column sizes for a data grid. User code will
     * not interact with this class directly.
     */
    var SectionList = /** @class */ (function () {
        /**
         * Construct a new section list.
         *
         * @param options - The options for initializing the list.
         */
        function SectionList(options) {
            this._count = 0;
            this._length = 0;
            this._sections = [];
            this._minimumSize = options.minimumSize || 2;
            this._defaultSize = Math.max(this._minimumSize, Math.floor(options.defaultSize));
        }
        Object.defineProperty(SectionList.prototype, "length", {
            /**
             * The total size of all sections in the list.
             *
             * #### Complexity
             * Constant.
             */
            get: function () {
                return this._length;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SectionList.prototype, "count", {
            /**
             * The total number of sections in the list.
             *
             * #### Complexity
             * Constant.
             */
            get: function () {
                return this._count;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SectionList.prototype, "minimumSize", {
            /**
             * Get the minimum size of sections in the list.
             *
             * #### Complexity
             * Constant.
             */
            get: function () {
                return this._minimumSize;
            },
            /**
             * Set the minimum size of sections in the list.
             *
             * #### Complexity
             * Linear on the number of resized sections.
             */
            set: function (value) {
                // Normalize the value.
                value = Math.max(2, Math.floor(value));
                // Bail early if the value does not change.
                if (this._minimumSize === value) {
                    return;
                }
                // Update the internal minimum size.
                this._minimumSize = value;
                // Update default size if larger than minimum size
                if (value > this._defaultSize) {
                    this.defaultSize = value;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SectionList.prototype, "defaultSize", {
            /**
             * Get the default size of sections in the list.
             *
             * #### Complexity
             * Constant.
             */
            get: function () {
                return this._defaultSize;
            },
            /**
             * Set the default size of sections in the list.
             *
             * #### Complexity
             * Linear on the number of resized sections.
             */
            set: function (value) {
                // Normalize the value.
                value = Math.max(this._minimumSize, Math.floor(value));
                // Bail early if the value does not change.
                if (this._defaultSize === value) {
                    return;
                }
                // Compute the delta default size.
                var delta = value - this._defaultSize;
                // Update the internal default size.
                this._defaultSize = value;
                // Update the length.
                this._length += delta * (this._count - this._sections.length);
                // Bail early if there are no modified sections.
                if (this._sections.length === 0) {
                    return;
                }
                // Recompute the offsets of the modified sections.
                for (var i = 0, n = this._sections.length; i < n; ++i) {
                    // Look up the previous and current modified sections.
                    var prev = this._sections[i - 1];
                    var curr = this._sections[i];
                    // Adjust the offset for the current section.
                    if (prev) {
                        var count = curr.index - prev.index - 1;
                        curr.offset = prev.offset + prev.size + count * value;
                    }
                    else {
                        curr.offset = curr.index * value;
                    }
                }
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Clamp a size to the minimum section size
         *
         * @param size - The size to clamp.
         *
         * @returns The size or the section minimum size, whichever is larger
         */
        SectionList.prototype.clampSize = function (size) {
            return Math.max(this._minimumSize, Math.floor(size));
        };
        /**
         * Find the index of the section which covers the given offset.
         *
         * @param offset - The offset of the section of interest.
         *
         * @returns The index of the section which covers the given offset,
         *   or `-1` if the offset is out of range.
         *
         * #### Complexity
         * Logarithmic on the number of resized sections.
         */
        SectionList.prototype.indexOf = function (offset) {
            // Bail early if the offset is out of range.
            if (offset < 0 || offset >= this._length || this._count === 0) {
                return -1;
            }
            // Handle the simple case of no modified sections.
            if (this._sections.length === 0) {
                return Math.floor(offset / this._defaultSize);
            }
            // Find the modified section for the given offset.
            var i = algorithm.ArrayExt.lowerBound(this._sections, offset, Private$4.offsetCmp);
            // Return the index of an exact match.
            if (i < this._sections.length && this._sections[i].offset <= offset) {
                return this._sections[i].index;
            }
            // Handle the case of no modified sections before the offset.
            if (i === 0) {
                return Math.floor(offset / this._defaultSize);
            }
            // Compute the index from the previous modified section.
            var section = this._sections[i - 1];
            var span = offset - (section.offset + section.size);
            return section.index + Math.floor(span / this._defaultSize) + 1;
        };
        /**
         * Find the offset of the section at the given index.
         *
         * @param index - The index of the section of interest.
         *
         * @returns The offset of the section at the given index, or `-1`
         *   if the index is out of range.
         *
         * #### Undefined Behavior
         * An `index` which is non-integral.
         *
         * #### Complexity
         * Logarithmic on the number of resized sections.
         */
        SectionList.prototype.offsetOf = function (index) {
            // Bail early if the index is out of range.
            if (index < 0 || index >= this._count) {
                return -1;
            }
            // Handle the simple case of no modified sections.
            if (this._sections.length === 0) {
                return index * this._defaultSize;
            }
            // Find the modified section for the given index.
            var i = algorithm.ArrayExt.lowerBound(this._sections, index, Private$4.indexCmp);
            // Return the offset of an exact match.
            if (i < this._sections.length && this._sections[i].index === index) {
                return this._sections[i].offset;
            }
            // Handle the case of no modified sections before the index.
            if (i === 0) {
                return index * this._defaultSize;
            }
            // Compute the offset from the previous modified section.
            var section = this._sections[i - 1];
            var span = index - section.index - 1;
            return section.offset + section.size + span * this._defaultSize;
        };
        /**
         * Find the extent of the section at the given index.
         *
         * @param index - The index of the section of interest.
         *
         * @returns The extent of the section at the given index, or `-1`
         *   if the index is out of range.
         *
         * #### Undefined Behavior
         * An `index` which is non-integral.
         *
         * #### Complexity
         * Logarithmic on the number of resized sections.
         */
        SectionList.prototype.extentOf = function (index) {
            // Bail early if the index is out of range.
            if (index < 0 || index >= this._count) {
                return -1;
            }
            // Handle the simple case of no modified sections.
            if (this._sections.length === 0) {
                return (index + 1) * this._defaultSize - 1;
            }
            // Find the modified section for the given index.
            var i = algorithm.ArrayExt.lowerBound(this._sections, index, Private$4.indexCmp);
            // Return the offset of an exact match.
            if (i < this._sections.length && this._sections[i].index === index) {
                return this._sections[i].offset + this._sections[i].size - 1;
            }
            // Handle the case of no modified sections before the index.
            if (i === 0) {
                return (index + 1) * this._defaultSize - 1;
            }
            // Compute the offset from the previous modified section.
            var section = this._sections[i - 1];
            var span = index - section.index;
            return section.offset + section.size + span * this._defaultSize - 1;
        };
        /**
         * Find the size of the section at the given index.
         *
         * @param index - The index of the section of interest.
         *
         * @returns The size of the section at the given index, or `-1`
         *   if the index is out of range.
         *
         * #### Undefined Behavior
         * An `index` which is non-integral.
         *
         * #### Complexity
         * Logarithmic on the number of resized sections.
         */
        SectionList.prototype.sizeOf = function (index) {
            // Bail early if the index is out of range.
            if (index < 0 || index >= this._count) {
                return -1;
            }
            // Handle the simple case of no modified sections.
            if (this._sections.length === 0) {
                return this._defaultSize;
            }
            // Find the modified section for the given index.
            var i = algorithm.ArrayExt.lowerBound(this._sections, index, Private$4.indexCmp);
            // Return the size of an exact match.
            if (i < this._sections.length && this._sections[i].index === index) {
                return this._sections[i].size;
            }
            // Return the default size for all other cases.
            return this._defaultSize;
        };
        /**
         * Resize a section in the list.
         *
         * @param index - The index of the section to resize. This method
         *   is a no-op if this value is out of range.
         *
         * @param size - The new size of the section. This value will be
         *   clamped to an integer `>= 0`.
         *
         * #### Undefined Behavior
         * An `index` which is non-integral.
         *
         * #### Complexity
         * Linear on the number of resized sections.
         */
        SectionList.prototype.resize = function (index, size) {
            // Bail early if the index is out of range.
            if (index < 0 || index >= this._count) {
                return;
            }
            // Clamp the size to an integer >= minimum size.
            size = Math.max(this._minimumSize, Math.floor(size));
            // Find the modified section for the given index.
            var i = algorithm.ArrayExt.lowerBound(this._sections, index, Private$4.indexCmp);
            // Update or create the modified section as needed.
            var delta;
            if (i < this._sections.length && this._sections[i].index === index) {
                var section = this._sections[i];
                delta = size - section.size;
                section.size = size;
            }
            else if (i === 0) {
                var offset = index * this._defaultSize;
                algorithm.ArrayExt.insert(this._sections, i, { index: index, offset: offset, size: size });
                delta = size - this._defaultSize;
            }
            else {
                var section = this._sections[i - 1];
                var span = index - section.index - 1;
                var offset = section.offset + section.size + span * this._defaultSize;
                algorithm.ArrayExt.insert(this._sections, i, { index: index, offset: offset, size: size });
                delta = size - this._defaultSize;
            }
            // Adjust the length.
            this._length += delta;
            // Update all modified sections after the resized section.
            for (var j = i + 1, n = this._sections.length; j < n; ++j) {
                this._sections[j].offset += delta;
            }
        };
        /**
         * Insert sections into the list.
         *
         * @param index - The index at which to insert the sections. This
         *   value will be clamped to the bounds of the list.
         *
         * @param count - The number of sections to insert. This method
         *   is a no-op if this value is `<= 0`.
         *
         * #### Undefined Behavior
         * An `index` or `count` which is non-integral.
         *
         * #### Complexity
         * Linear on the number of resized sections.
         */
        SectionList.prototype.insert = function (index, count) {
            // Bail early if there are no sections to insert.
            if (count <= 0) {
                return;
            }
            // Clamp the index to the bounds of the list.
            index = Math.max(0, Math.min(index, this._count));
            // Add the new sections to the totals.
            var span = count * this._defaultSize;
            this._count += count;
            this._length += span;
            // Bail early if there are no modified sections to update.
            if (this._sections.length === 0) {
                return;
            }
            // Find the modified section for the given index.
            var i = algorithm.ArrayExt.lowerBound(this._sections, index, Private$4.indexCmp);
            // Update all modified sections after the insert location.
            for (var n = this._sections.length; i < n; ++i) {
                var section = this._sections[i];
                section.index += count;
                section.offset += span;
            }
        };
        /**
         * Remove sections from the list.
         *
         * @param index - The index of the first section to remove. This
         *   method is a no-op if this value is out of range.
         *
         * @param count - The number of sections to remove. This method
         *   is a no-op if this value is `<= 0`.
         *
         * #### Undefined Behavior
         * An `index` or `count` which is non-integral.
         *
         * #### Complexity
         * Linear on the number of resized sections.
         */
        SectionList.prototype.remove = function (index, count) {
            // Bail early if there is nothing to remove.
            if (index < 0 || index >= this._count || count <= 0) {
                return;
            }
            // Clamp the count to the bounds of the list.
            count = Math.min(this._count - index, count);
            // Handle the simple case of no modified sections to update.
            if (this._sections.length === 0) {
                this._count -= count;
                this._length -= count * this._defaultSize;
                return;
            }
            // Handle the simple case of removing all sections.
            if (count === this._count) {
                this._length = 0;
                this._count = 0;
                this._sections.length = 0;
                return;
            }
            // Find the modified section for the start index.
            var i = algorithm.ArrayExt.lowerBound(this._sections, index, Private$4.indexCmp);
            // Find the modified section for the end index.
            var j = algorithm.ArrayExt.lowerBound(this._sections, index + count, Private$4.indexCmp);
            // Remove the relevant modified sections.
            var removed = this._sections.splice(i, j - i);
            // Compute the total removed span.
            var span = (count - removed.length) * this._defaultSize;
            for (var k = 0, n = removed.length; k < n; ++k) {
                span += removed[k].size;
            }
            // Adjust the totals.
            this._count -= count;
            this._length -= span;
            // Update all modified sections after the removed span.
            for (var k = i, n = this._sections.length; k < n; ++k) {
                var section = this._sections[k];
                section.index -= count;
                section.offset -= span;
            }
        };
        /**
         * Move sections within the list.
         *
         * @param index - The index of the first section to move. This method
         *   is a no-op if this value is out of range.
         *
         * @param count - The number of sections to move. This method is a
         *   no-op if this value is `<= 0`.
         *
         * @param destination - The destination index for the first section.
         *   This value will be clamped to the allowable range.
         *
         * #### Undefined Behavior
         * An `index`, `count`, or `destination` which is non-integral.
         *
         * #### Complexity
         * Linear on the number of moved resized sections.
         */
        SectionList.prototype.move = function (index, count, destination) {
            // Bail early if there is nothing to move.
            if (index < 0 || index >= this._count || count <= 0) {
                return;
            }
            // Handle the simple case of no modified sections.
            if (this._sections.length === 0) {
                return;
            }
            // Clamp the move count to the limit.
            count = Math.min(count, this._count - index);
            // Clamp the destination index to the limit.
            destination = Math.min(Math.max(0, destination), this._count - count);
            // Bail early if there is no effective move.
            if (index === destination) {
                return;
            }
            // Compute the first affected index.
            var i1 = Math.min(index, destination);
            // Look up the first affected modified section.
            var k1 = algorithm.ArrayExt.lowerBound(this._sections, i1, Private$4.indexCmp);
            // Bail early if there are no affected modified sections.
            if (k1 === this._sections.length) {
                return;
            }
            // Compute the last affected index.
            var i2 = Math.max(index + count - 1, destination + count - 1);
            // Look up the last affected modified section.
            var k2 = algorithm.ArrayExt.upperBound(this._sections, i2, Private$4.indexCmp) - 1;
            // Bail early if there are no affected modified sections.
            if (k2 < k1) {
                return;
            }
            // Compute the pivot index.
            var pivot = destination < index ? index : index + count;
            // Compute the count for each side of the pivot.
            var count1 = pivot - i1;
            var count2 = i2 - pivot + 1;
            // Compute the span for each side of the pivot.
            var span1 = count1 * this._defaultSize;
            var span2 = count2 * this._defaultSize;
            // Adjust the spans for the modified sections.
            for (var j = k1; j <= k2; ++j) {
                var section = this._sections[j];
                if (section.index < pivot) {
                    span1 += section.size - this._defaultSize;
                }
                else {
                    span2 += section.size - this._defaultSize;
                }
            }
            // Look up the pivot section.
            var k3 = algorithm.ArrayExt.lowerBound(this._sections, pivot, Private$4.indexCmp);
            // Rotate the modified sections if needed.
            if (k1 <= k3 && k3 <= k2) {
                algorithm.ArrayExt.rotate(this._sections, k3 - k1, k1, k2);
            }
            // Adjust the modified section indices and offsets.
            for (var j = k1; j <= k2; ++j) {
                var section = this._sections[j];
                if (section.index < pivot) {
                    section.index += count2;
                    section.offset += span2;
                }
                else {
                    section.index -= count1;
                    section.offset -= span1;
                }
            }
        };
        /**
         * Reset all modified sections to the default size.
         *
         * #### Complexity
         * Constant.
         */
        SectionList.prototype.reset = function () {
            this._sections.length = 0;
            this._length = this._count * this._defaultSize;
        };
        /**
         * Remove all sections from the list.
         *
         * #### Complexity
         * Constant.
         */
        SectionList.prototype.clear = function () {
            this._count = 0;
            this._length = 0;
            this._sections.length = 0;
        };
        return SectionList;
    }());
    /**
     * The namespace for the module implementation details.
     */
    var Private$4;
    (function (Private) {
        /**
         * A comparison function for searching by offset.
         */
        function offsetCmp(section, offset) {
            if (offset < section.offset) {
                return 1;
            }
            if (section.offset + section.size <= offset) {
                return -1;
            }
            return 0;
        }
        Private.offsetCmp = offsetCmp;
        /**
         * A comparison function for searching by index.
         */
        function indexCmp(section, index) {
            return section.index - index;
        }
        Private.indexCmp = indexCmp;
    })(Private$4 || (Private$4 = {}));

    /*-----------------------------------------------------------------------------
    | Copyright (c) 2014-2019, PhosphorJS Contributors
    |
    | Distributed under the terms of the BSD 3-Clause License.
    |
    | The full license is in the file LICENSE, distributed with this software.
    |----------------------------------------------------------------------------*/
    /**
     * Resolve a config option for a cell editor.
     *
     * @param option - The config option to resolve.
     *
     * @param config - The cell config object.
     *
     * @returns The resolved value for the option.
     */
    function resolveOption(option, config) {
        return typeof option === 'function' ? option(config) : option;
    }
    /**
     * An object which manages cell editing. It stores editor overrides,
     * decides which editor to use for a cell, makes sure there is only one editor active.
     */
    var CellEditorController = /** @class */ (function () {
        function CellEditorController() {
            // active cell editor
            this._editor = null;
            // active cell being edited
            this._cell = null;
            // cell editor overrides based on cell data type identifier
            this._typeBasedOverrides = new Map();
            // cell editor overrides based on partial metadata match
            this._metadataBasedOverrides = new Map();
        }
        /**
         * Override cell editor for the cells matching the identifier.
         *
         * @param identifier - Cell identifier to use when matching cells.
         * if identifier is a CellDataType, then cell matching is done using data type of the cell,
         * if identifier is a Metadata, then partial match of the cell metadata with identifier is used for match,
         * if identifier is 'default' then override is used as default editor when no other editor is found suitable
         *
         * @param editor - The cell editor to use or resolver to use to get an editor for matching cells.
         */
        CellEditorController.prototype.setEditor = function (identifier, editor) {
            if (typeof identifier === 'string') {
                this._typeBasedOverrides.set(identifier, editor);
            }
            else {
                var key = this._metadataIdentifierToKey(identifier);
                this._metadataBasedOverrides.set(key, [identifier, editor]);
            }
        };
        /**
         * Start editing a cell.
         *
         * @param cell - The object holding cell configuration data.
         *
         * @param options - The cell editing options.
         */
        CellEditorController.prototype.edit = function (cell, options) {
            var grid = cell.grid;
            if (!grid.editable) {
                console.error('Grid cannot be edited!');
                return false;
            }
            this.cancel();
            this._cell = cell;
            options = options || {};
            options.onCommit = options.onCommit || this._onCommit.bind(this);
            options.onCancel = options.onCancel || this._onCancel.bind(this);
            // if an editor is passed in with options, then use it for editing
            if (options.editor) {
                this._editor = options.editor;
                options.editor.edit(cell, options);
                return true;
            }
            // choose an editor based on overrides / cell data type
            var editor = this._getEditor(cell);
            if (editor) {
                this._editor = editor;
                editor.edit(cell, options);
                return true;
            }
            return false;
        };
        /**
         * Cancel editing.
         */
        CellEditorController.prototype.cancel = function () {
            if (this._editor) {
                this._editor.cancel();
                this._editor = null;
            }
            this._cell = null;
        };
        CellEditorController.prototype._onCommit = function (response) {
            var cell = this._cell;
            if (!cell) {
                return;
            }
            var grid = cell.grid;
            var dataModel = grid.dataModel;
            dataModel.setData('body', cell.row, cell.column, response.value);
            grid.viewport.node.focus();
            if (response.cursorMovement !== 'none') {
                grid.moveCursor(response.cursorMovement);
                grid.scrollToCursor();
            }
        };
        CellEditorController.prototype._onCancel = function () {
            if (!this._cell) {
                return;
            }
            this._cell.grid.viewport.node.focus();
        };
        CellEditorController.prototype._getDataTypeKey = function (cell) {
            var metadata = cell.grid.dataModel ? cell.grid.dataModel.metadata('body', cell.row, cell.column) : null;
            if (!metadata) {
                return 'default';
            }
            var key = '';
            if (metadata) {
                key = metadata.type;
            }
            if (metadata.constraint && metadata.constraint.enum) {
                if (metadata.constraint.enum === 'dynamic') {
                    key += ':dynamic-option';
                }
                else {
                    key += ':option';
                }
            }
            return key;
        };
        CellEditorController.prototype._objectToKey = function (object) {
            var str = '';
            for (var key in object) {
                var value = object[key];
                if (typeof value === 'object') {
                    str += key + ":" + this._objectToKey(value);
                }
                else {
                    str += "[" + key + ":" + value + "]";
                }
            }
            return str;
        };
        CellEditorController.prototype._metadataIdentifierToKey = function (metadata) {
            return this._objectToKey(metadata);
        };
        CellEditorController.prototype._metadataMatchesIdentifier = function (metadata, identifier) {
            for (var key in identifier) {
                if (!metadata.hasOwnProperty(key)) {
                    return false;
                }
                var identifierValue = identifier[key];
                var metadataValue = metadata[key];
                if (typeof identifierValue === 'object') {
                    if (!this._metadataMatchesIdentifier(metadataValue, identifierValue)) {
                        return false;
                    }
                }
                else if (metadataValue !== identifierValue) {
                    return false;
                }
            }
            return true;
        };
        CellEditorController.prototype._getMetadataBasedEditor = function (cell) {
            var _this = this;
            var editorMatched;
            var metadata = cell.grid.dataModel.metadata('body', cell.row, cell.column);
            if (metadata) {
                this._metadataBasedOverrides.forEach(function (value) {
                    if (!editorMatched) {
                        var identifier = value[0], editor = value[1];
                        if (_this._metadataMatchesIdentifier(metadata, identifier)) {
                            editorMatched = resolveOption(editor, cell);
                        }
                    }
                });
            }
            return editorMatched;
        };
        /**
         * Choose the most appropriate cell editor to use based on overrides / cell data type.
         *
         * If no match is found in overrides or based on cell data type, and if cell has a primitive
         * data type then TextCellEditor is used as default cell editor. If 'default' cell editor
         * is overridden, then it is used instead of TextCellEditor for default.
         */
        CellEditorController.prototype._getEditor = function (cell) {
            var dtKey = this._getDataTypeKey(cell);
            // find an editor based on data type based override
            if (this._typeBasedOverrides.has(dtKey)) {
                var editor = this._typeBasedOverrides.get(dtKey);
                return resolveOption(editor, cell);
            } // find an editor based on metadata match based override
            else if (this._metadataBasedOverrides.size > 0) {
                var editor = this._getMetadataBasedEditor(cell);
                if (editor) {
                    return editor;
                }
            }
            // choose an editor based on data type
            switch (dtKey) {
                case 'string':
                    return new TextCellEditor();
                case 'number':
                    return new NumberCellEditor();
                case 'integer':
                    return new IntegerCellEditor();
                case 'boolean':
                    return new BooleanCellEditor();
                case 'date':
                    return new DateCellEditor();
                case 'string:option':
                case 'number:option':
                case 'integer:option':
                case 'date:option':
                case 'array:option':
                    return new OptionCellEditor();
                case 'string:dynamic-option':
                case 'number:dynamic-option':
                case 'integer:dynamic-option':
                case 'date:dynamic-option':
                    return new DynamicOptionCellEditor();
            }
            // if an override exists for 'default', then use it
            if (this._typeBasedOverrides.has('default')) {
                var editor = this._typeBasedOverrides.get('default');
                return resolveOption(editor, cell);
            }
            // if cell has a primitive data type then use TextCellEditor
            var data = cell.grid.dataModel.data('body', cell.row, cell.column);
            if (!data || typeof data !== 'object') {
                return new TextCellEditor();
            }
            // no suitable editor found for the cell
            return undefined;
        };
        return CellEditorController;
    }());

    /**
     * A widget which implements a high-performance tabular data grid.
     *
     * #### Notes
     * A data grid is implemented as a composition of child widgets. These
     * child widgets are considered an implementation detail. Manipulating
     * the child widgets of a data grid directly is undefined behavior.
     *
     * This class is not designed to be subclassed.
     */
    exports.DataGrid = /** @class */ (function (_super) {
        __extends(DataGrid, _super);
        /**
         * Construct a new data grid.
         *
         * @param options - The options for initializing the data grid.
         */
        function DataGrid(options) {
            if (options === void 0) { options = {}; }
            var _this = _super.call(this) || this;
            _this._scrollX = 0;
            _this._scrollY = 0;
            _this._viewportWidth = 0;
            _this._viewportHeight = 0;
            _this._mousedown = false;
            _this._keyHandler = null;
            _this._mouseHandler = null;
            _this._vScrollBarMinWidth = 0;
            _this._hScrollBarMinHeight = 0;
            _this._dpiRatio = Math.ceil(window.devicePixelRatio);
            _this._dataModel = null;
            _this._selectionModel = null;
            _this._editingEnabled = false;
            _this.addClass('lm-DataGrid');
            /* <DEPRECATED> */
            _this.addClass('p-DataGrid');
            /* </DEPRECATED> */
            // Parse the simple options.
            _this._style = options.style || DataGrid.defaultStyle;
            _this._stretchLastRow = options.stretchLastRow || false;
            _this._stretchLastColumn = options.stretchLastColumn || false;
            _this._headerVisibility = options.headerVisibility || 'all';
            _this._cellRenderers = options.cellRenderers || new RendererMap();
            _this._copyConfig = options.copyConfig || DataGrid.defaultCopyConfig;
            // Connect to the renderer map changed signal.
            _this._cellRenderers.changed.connect(_this._onRenderersChanged, _this);
            // Parse the default sizes.
            var defaultSizes = options.defaultSizes || DataGrid.defaultSizes;
            var minimumSizes = options.minimumSizes || DataGrid.minimumSizes;
            // Set up the sections lists.
            _this._rowSections = new SectionList({ defaultSize: defaultSizes.rowHeight,
                minimumSize: minimumSizes.rowHeight });
            _this._columnSections = new SectionList({ defaultSize: defaultSizes.columnWidth,
                minimumSize: minimumSizes.columnWidth });
            _this._rowHeaderSections = new SectionList({ defaultSize: defaultSizes.rowHeaderWidth,
                minimumSize: minimumSizes.rowHeaderWidth });
            _this._columnHeaderSections = new SectionList({ defaultSize: defaultSizes.columnHeaderHeight,
                minimumSize: minimumSizes.columnHeaderHeight });
            // Create the canvas, buffer, and overlay objects.
            _this._canvas = Private$5.createCanvas();
            _this._buffer = Private$5.createCanvas();
            _this._overlay = Private$5.createCanvas();
            // Get the graphics contexts for the canvases.
            _this._canvasGC = _this._canvas.getContext('2d');
            _this._bufferGC = _this._buffer.getContext('2d');
            _this._overlayGC = _this._overlay.getContext('2d');
            // Set up the on-screen canvas.
            _this._canvas.style.position = 'absolute';
            _this._canvas.style.top = '0px';
            _this._canvas.style.left = '0px';
            _this._canvas.style.width = '0px';
            _this._canvas.style.height = '0px';
            // Set up the on-screen overlay.
            _this._overlay.style.position = 'absolute';
            _this._overlay.style.top = '0px';
            _this._overlay.style.left = '0px';
            _this._overlay.style.width = '0px';
            _this._overlay.style.height = '0px';
            // Create the internal widgets for the data grid.
            _this._viewport = new widgets.Widget();
            _this._viewport.node.tabIndex = -1;
            _this._viewport.node.style.outline = 'none';
            _this._vScrollBar = new widgets.ScrollBar({ orientation: 'vertical' });
            _this._hScrollBar = new widgets.ScrollBar({ orientation: 'horizontal' });
            _this._scrollCorner = new widgets.Widget();
            _this._editorController = new CellEditorController();
            // Add the extra class names to the child widgets.
            _this._viewport.addClass('lm-DataGrid-viewport');
            _this._vScrollBar.addClass('lm-DataGrid-scrollBar');
            _this._hScrollBar.addClass('lm-DataGrid-scrollBar');
            _this._scrollCorner.addClass('lm-DataGrid-scrollCorner');
            /* <DEPRECATED> */
            _this._viewport.addClass('p-DataGrid-viewport');
            _this._vScrollBar.addClass('p-DataGrid-scrollBar');
            _this._hScrollBar.addClass('p-DataGrid-scrollBar');
            _this._scrollCorner.addClass('p-DataGrid-scrollCorner');
            /* </DEPRECATED> */
            // Add the on-screen canvas to the viewport node.
            _this._viewport.node.appendChild(_this._canvas);
            // Add the on-screen overlay to the viewport node.
            _this._viewport.node.appendChild(_this._overlay);
            // Install the message hooks.
            messaging.MessageLoop.installMessageHook(_this._viewport, _this);
            messaging.MessageLoop.installMessageHook(_this._hScrollBar, _this);
            messaging.MessageLoop.installMessageHook(_this._vScrollBar, _this);
            // Hide the scroll bars and corner from the outset.
            _this._vScrollBar.hide();
            _this._hScrollBar.hide();
            _this._scrollCorner.hide();
            // Connect to the scroll bar signals.
            _this._vScrollBar.thumbMoved.connect(_this._onThumbMoved, _this);
            _this._hScrollBar.thumbMoved.connect(_this._onThumbMoved, _this);
            _this._vScrollBar.pageRequested.connect(_this._onPageRequested, _this);
            _this._hScrollBar.pageRequested.connect(_this._onPageRequested, _this);
            _this._vScrollBar.stepRequested.connect(_this._onStepRequested, _this);
            _this._hScrollBar.stepRequested.connect(_this._onStepRequested, _this);
            // Set the layout cell config for the child widgets.
            widgets.GridLayout.setCellConfig(_this._viewport, { row: 0, column: 0 });
            widgets.GridLayout.setCellConfig(_this._vScrollBar, { row: 0, column: 1 });
            widgets.GridLayout.setCellConfig(_this._hScrollBar, { row: 1, column: 0 });
            widgets.GridLayout.setCellConfig(_this._scrollCorner, { row: 1, column: 1 });
            // Create the layout for the data grid.
            var layout = new widgets.GridLayout({
                rowCount: 2,
                columnCount: 2,
                rowSpacing: 0,
                columnSpacing: 0,
                fitPolicy: 'set-no-constraint'
            });
            // Set the stretch factors for the grid.
            layout.setRowStretch(0, 1);
            layout.setRowStretch(1, 0);
            layout.setColumnStretch(0, 1);
            layout.setColumnStretch(1, 0);
            // Add the child widgets to the layout.
            layout.addWidget(_this._viewport);
            layout.addWidget(_this._vScrollBar);
            layout.addWidget(_this._hScrollBar);
            layout.addWidget(_this._scrollCorner);
            // Install the layout on the data grid.
            _this.layout = layout;
            return _this;
        }
        /**
         * Dispose of the resources held by the widgets.
         */
        DataGrid.prototype.dispose = function () {
            // Release the mouse.
            this._releaseMouse();
            // Dispose of the handlers.
            if (this._keyHandler) {
                this._keyHandler.dispose();
            }
            if (this._mouseHandler) {
                this._mouseHandler.dispose();
            }
            this._keyHandler = null;
            this._mouseHandler = null;
            // Clear the models.
            this._dataModel = null;
            this._selectionModel = null;
            // Clear the section lists.
            this._rowSections.clear();
            this._columnSections.clear();
            this._rowHeaderSections.clear();
            this._columnHeaderSections.clear();
            // Dispose of the base class.
            _super.prototype.dispose.call(this);
        };
        Object.defineProperty(DataGrid.prototype, "dataModel", {
            /**
             * Get the data model for the data grid.
             */
            get: function () {
                return this._dataModel;
            },
            /**
             * Set the data model for the data grid.
             *
             * #### Notes
             * This will automatically remove the current selection model.
             */
            set: function (value) {
                // Do nothing if the model does not change.
                if (this._dataModel === value) {
                    return;
                }
                // Release the mouse.
                this._releaseMouse();
                // Clear the selection model.
                this.selectionModel = null;
                // Disconnect the change handler from the old model.
                if (this._dataModel) {
                    this._dataModel.changed.disconnect(this._onDataModelChanged, this);
                }
                // Connect the change handler for the new model.
                if (value) {
                    value.changed.connect(this._onDataModelChanged, this);
                }
                // Update the internal model reference.
                this._dataModel = value;
                // Clear the section lists.
                this._rowSections.clear();
                this._columnSections.clear();
                this._rowHeaderSections.clear();
                this._columnHeaderSections.clear();
                // Populate the section lists.
                if (value) {
                    this._rowSections.insert(0, value.rowCount('body'));
                    this._columnSections.insert(0, value.columnCount('body'));
                    this._rowHeaderSections.insert(0, value.columnCount('row-header'));
                    this._columnHeaderSections.insert(0, value.rowCount('column-header'));
                }
                // Reset the scroll position.
                this._scrollX = 0;
                this._scrollY = 0;
                // Sync the viewport.
                this._syncViewport();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "selectionModel", {
            /**
             * Get the selection model for the data grid.
             */
            get: function () {
                return this._selectionModel;
            },
            /**
             * Set the selection model for the data grid.
             */
            set: function (value) {
                // Do nothing if the selection model does not change.
                if (this._selectionModel === value) {
                    return;
                }
                // Release the mouse.
                this._releaseMouse();
                // Ensure the data models are a match.
                if (value && value.dataModel !== this._dataModel) {
                    throw new Error('SelectionModel.dataModel !== DataGrid.dataModel');
                }
                // Disconnect the change handler from the old model.
                if (this._selectionModel) {
                    this._selectionModel.changed.disconnect(this._onSelectionsChanged, this);
                }
                // Connect the change handler for the new model.
                if (value) {
                    value.changed.connect(this._onSelectionsChanged, this);
                }
                // Update the internal selection model reference.
                this._selectionModel = value;
                // Schedule a repaint of the overlay.
                this.repaintOverlay();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "keyHandler", {
            /**
             * Get the key handler for the data grid.
             */
            get: function () {
                return this._keyHandler;
            },
            /**
             * Set the key handler for the data grid.
             */
            set: function (value) {
                this._keyHandler = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "mouseHandler", {
            /**
             * Get the mouse handler for the data grid.
             */
            get: function () {
                return this._mouseHandler;
            },
            /**
             * Set the mouse handler for the data grid.
             */
            set: function (value) {
                // Bail early if the mouse handler does not change.
                if (this._mouseHandler === value) {
                    return;
                }
                // Release the mouse.
                this._releaseMouse();
                // Update the internal mouse handler.
                this._mouseHandler = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "style", {
            /**
             * Get the style for the data grid.
             */
            get: function () {
                return this._style;
            },
            /**
             * Set the style for the data grid.
             */
            set: function (value) {
                // Bail if the style does not change.
                if (this._style === value) {
                    return;
                }
                // Update the internal style.
                this._style = __assign({}, value);
                // Schedule a repaint of the content.
                this.repaintContent();
                // Schedule a repaint of the overlay.
                this.repaintOverlay();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "cellRenderers", {
            /**
             * Get the cell renderer map for the data grid.
             */
            get: function () {
                return this._cellRenderers;
            },
            /**
             * Set the cell renderer map for the data grid.
             */
            set: function (value) {
                // Bail if the renderer map does not change.
                if (this._cellRenderers === value) {
                    return;
                }
                // Disconnect the old map.
                this._cellRenderers.changed.disconnect(this._onRenderersChanged, this);
                // Connect the new map.
                value.changed.connect(this._onRenderersChanged, this);
                // Update the internal renderer map.
                this._cellRenderers = value;
                // Schedule a repaint of the grid content.
                this.repaintContent();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "headerVisibility", {
            /**
             * Get the header visibility for the data grid.
             */
            get: function () {
                return this._headerVisibility;
            },
            /**
             * Set the header visibility for the data grid.
             */
            set: function (value) {
                // Bail if the visibility does not change.
                if (this._headerVisibility === value) {
                    return;
                }
                // Update the internal visibility.
                this._headerVisibility = value;
                // Sync the viewport.
                this._syncViewport();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "defaultSizes", {
            /**
             * Get the default sizes for the various sections of the data grid.
             */
            get: function () {
                var rowHeight = this._rowSections.defaultSize;
                var columnWidth = this._columnSections.defaultSize;
                var rowHeaderWidth = this._rowHeaderSections.defaultSize;
                var columnHeaderHeight = this._columnHeaderSections.defaultSize;
                return { rowHeight: rowHeight, columnWidth: columnWidth, rowHeaderWidth: rowHeaderWidth, columnHeaderHeight: columnHeaderHeight };
            },
            /**
             * Set the default sizes for the various sections of the data grid.
             */
            set: function (value) {
                // Update the section default sizes.
                this._rowSections.defaultSize = value.rowHeight;
                this._columnSections.defaultSize = value.columnWidth;
                this._rowHeaderSections.defaultSize = value.rowHeaderWidth;
                this._columnHeaderSections.defaultSize = value.columnHeaderHeight;
                // Sync the viewport.
                this._syncViewport();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "minimumSizes", {
            /**
             * Get the minimum sizes for the various sections of the data grid.
             */
            get: function () {
                var rowHeight = this._rowSections.minimumSize;
                var columnWidth = this._columnSections.minimumSize;
                var rowHeaderWidth = this._rowHeaderSections.minimumSize;
                var columnHeaderHeight = this._columnHeaderSections.minimumSize;
                return { rowHeight: rowHeight, columnWidth: columnWidth, rowHeaderWidth: rowHeaderWidth, columnHeaderHeight: columnHeaderHeight };
            },
            /**
             * Set the minimum sizes for the various sections of the data grid.
             */
            set: function (value) {
                // Update the section default sizes.
                this._rowSections.minimumSize = value.rowHeight;
                this._columnSections.minimumSize = value.columnWidth;
                this._rowHeaderSections.minimumSize = value.rowHeaderWidth;
                this._columnHeaderSections.minimumSize = value.columnHeaderHeight;
                // Sync the viewport.
                this._syncViewport();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "copyConfig", {
            /**
             * Get the copy configuration for the data grid.
             */
            get: function () {
                return this._copyConfig;
            },
            /**
             * Set the copy configuration for the data grid.
             */
            set: function (value) {
                this._copyConfig = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "stretchLastRow", {
            /**
             * Get whether the last row is stretched.
             */
            get: function () {
                return this._stretchLastRow;
            },
            /**
             * Set whether the last row is stretched.
             */
            set: function (value) {
                // Bail early if the value does not change.
                if (value === this._stretchLastRow) {
                    return;
                }
                // Update the internal value.
                this._stretchLastRow = value;
                // Sync the viewport
                this._syncViewport();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "stretchLastColumn", {
            /**
             * Get whether the last column is stretched.
             */
            get: function () {
                return this._stretchLastColumn;
            },
            /**
             * Set whether the last column is stretched.
             */
            set: function (value) {
                // Bail early if the value does not change.
                if (value === this._stretchLastColumn) {
                    return;
                }
                // Update the internal value.
                this._stretchLastColumn = value;
                // Sync the viewport
                this._syncViewport();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "headerWidth", {
            /**
             * The virtual width of the row headers.
             */
            get: function () {
                if (this._headerVisibility === 'none') {
                    return 0;
                }
                if (this._headerVisibility === 'column') {
                    return 0;
                }
                return this._rowHeaderSections.length;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "headerHeight", {
            /**
             * The virtual height of the column headers.
             */
            get: function () {
                if (this._headerVisibility === 'none') {
                    return 0;
                }
                if (this._headerVisibility === 'row') {
                    return 0;
                }
                return this._columnHeaderSections.length;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "bodyWidth", {
            /**
             * The virtual width of the grid body.
             *
             * #### Notes
             * This does *not* account for a stretched last column.
             */
            get: function () {
                return this._columnSections.length;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "bodyHeight", {
            /**
             * The virtual height of the grid body.
             *
             * #### Notes
             * This does *not* account for a stretched last row.
             */
            get: function () {
                return this._rowSections.length;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "totalWidth", {
            /**
             * The virtual width of the entire grid.
             *
             * #### Notes
             * This does *not* account for a stretched last column.
             */
            get: function () {
                return this.headerWidth + this.bodyWidth;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "totalHeight", {
            /**
             * The virtual height of the entire grid.
             *
             * #### Notes
             * This does *not* account for a stretched last row.
             */
            get: function () {
                return this.headerHeight + this.bodyHeight;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "viewportWidth", {
            /**
             * The actual width of the viewport.
             */
            get: function () {
                return this._viewportWidth;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "viewportHeight", {
            /**
             * The actual height of the viewport.
             */
            get: function () {
                return this._viewportHeight;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "pageWidth", {
            /**
             * The width of the visible portion of the grid body.
             */
            get: function () {
                return Math.max(0, this.viewportWidth - this.headerWidth);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "pageHeight", {
            /**
             * The height of the visible portion of the grid body.
             */
            get: function () {
                return Math.max(0, this.viewportHeight - this.headerHeight);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "scrollX", {
            /**
             * The current scroll X position of the viewport.
             */
            get: function () {
                return this._hScrollBar.value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "scrollY", {
            /**
             * The current scroll Y position of the viewport.
             */
            get: function () {
                return this._vScrollBar.value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "maxScrollX", {
            /**
             * The maximum scroll X position for the grid.
             */
            get: function () {
                return Math.max(0, this.bodyWidth - this.pageWidth - 1);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "maxScrollY", {
            /**
             * The maximum scroll Y position for the grid.
             */
            get: function () {
                return Math.max(0, this.bodyHeight - this.pageHeight - 1);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "viewport", {
            /**
             * The viewport widget for the data grid.
             */
            get: function () {
                return this._viewport;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "editorController", {
            /**
             * The cell editor controller object for the data grid.
             */
            get: function () {
                return this._editorController;
            },
            set: function (controller) {
                this._editorController = controller;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "editingEnabled", {
            /**
             * Whether the cell editing is enabled for the data grid.
             */
            get: function () {
                return this._editingEnabled;
            },
            set: function (enabled) {
                this._editingEnabled = enabled;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "editable", {
            /**
             * Whether the grid cells are editable.
             *
             * `editingEnabled` flag must be on and grid must have required
             * selection model, editor controller and data model properties.
             */
            get: function () {
                return this._editingEnabled &&
                    this._selectionModel !== null &&
                    this._editorController !== null &&
                    this.dataModel instanceof MutableDataModel;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "canvasGC", {
            /**
             * The rendering context for painting the data grid.
             */
            get: function () {
                return this._canvasGC;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "rowSections", {
            /**
             * The row sections of the data grid.
             */
            get: function () {
                return this._rowSections;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "columnSections", {
            /**
             * The column sections of the data grid.
             */
            get: function () {
                return this._columnSections;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "rowHeaderSections", {
            /**
             * The row header sections of the data grid.
             */
            get: function () {
                return this._rowHeaderSections;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DataGrid.prototype, "columnHeaderSections", {
            /**
             * The column header sections of the data grid.
             */
            get: function () {
                return this._columnHeaderSections;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Scroll the grid to the specified row.
         *
         * @param row - The row index of the cell.
         *
         * #### Notes
         * This is a no-op if the row is already visible.
         */
        DataGrid.prototype.scrollToRow = function (row) {
            // Fetch the row count.
            var nr = this._rowSections.count;
            // Bail early if there is no content.
            if (nr === 0) {
                return;
            }
            // Floor the row index.
            row = Math.floor(row);
            // Clamp the row index.
            row = Math.max(0, Math.min(row, nr - 1));
            // Get the virtual bounds of the row.
            var y1 = this._rowSections.offsetOf(row);
            var y2 = this._rowSections.extentOf(row);
            // Get the virtual bounds of the viewport.
            var vy1 = this._scrollY;
            var vy2 = this._scrollY + this.pageHeight - 1;
            // Set up the delta variables.
            var dy = 0;
            // Compute the delta Y scroll.
            if (y1 < vy1) {
                dy = y1 - vy1 - 10;
            }
            else if (y2 > vy2) {
                dy = y2 - vy2 + 10;
            }
            // Bail early if no scroll is needed.
            if (dy === 0) {
                return;
            }
            // Scroll by the computed delta.
            this.scrollBy(0, dy);
        };
        /**
         * Scroll the grid to the specified column.
         *
         * @param column - The column index of the cell.
         *
         * #### Notes
         * This is a no-op if the column is already visible.
         */
        DataGrid.prototype.scrollToColumn = function (column) {
            // Fetch the column count.
            var nc = this._columnSections.count;
            // Bail early if there is no content.
            if (nc === 0) {
                return;
            }
            // Floor the column index.
            column = Math.floor(column);
            // Clamp the column index.
            column = Math.max(0, Math.min(column, nc - 1));
            // Get the virtual bounds of the column.
            var x1 = this._columnSections.offsetOf(column);
            var x2 = this._columnSections.extentOf(column);
            // Get the virtual bounds of the viewport.
            var vx1 = this._scrollX;
            var vx2 = this._scrollX + this.pageWidth - 1;
            // Set up the delta variables.
            var dx = 0;
            // Compute the delta X scroll.
            if (x1 < vx1) {
                dx = x1 - vx1 - 10;
            }
            else if (x2 > vx2) {
                dx = x2 - vx2 + 10;
            }
            // Bail early if no scroll is needed.
            if (dx === 0) {
                return;
            }
            // Scroll by the computed delta.
            this.scrollBy(dx, 0);
        };
        /**
         * Scroll the grid to the specified cell.
         *
         * @param row - The row index of the cell.
         *
         * @param column - The column index of the cell.
         *
         * #### Notes
         * This is a no-op if the cell is already visible.
         */
        DataGrid.prototype.scrollToCell = function (row, column) {
            // Fetch the row and column count.
            var nr = this._rowSections.count;
            var nc = this._columnSections.count;
            // Bail early if there is no content.
            if (nr === 0 || nc === 0) {
                return;
            }
            // Floor the cell index.
            row = Math.floor(row);
            column = Math.floor(column);
            // Clamp the cell index.
            row = Math.max(0, Math.min(row, nr - 1));
            column = Math.max(0, Math.min(column, nc - 1));
            // Get the virtual bounds of the cell.
            var x1 = this._columnSections.offsetOf(column);
            var x2 = this._columnSections.extentOf(column);
            var y1 = this._rowSections.offsetOf(row);
            var y2 = this._rowSections.extentOf(row);
            // Get the virtual bounds of the viewport.
            var vx1 = this._scrollX;
            var vx2 = this._scrollX + this.pageWidth - 1;
            var vy1 = this._scrollY;
            var vy2 = this._scrollY + this.pageHeight - 1;
            // Set up the delta variables.
            var dx = 0;
            var dy = 0;
            // Compute the delta X scroll.
            if (x1 < vx1) {
                dx = x1 - vx1 - 10;
            }
            else if (x2 > vx2) {
                dx = x2 - vx2 + 10;
            }
            // Compute the delta Y scroll.
            if (y1 < vy1) {
                dy = y1 - vy1 - 10;
            }
            else if (y2 > vy2) {
                dy = y2 - vy2 + 10;
            }
            // Bail early if no scroll is needed.
            if (dx === 0 && dy === 0) {
                return;
            }
            // Scroll by the computed delta.
            this.scrollBy(dx, dy);
        };
        /**
         * Move cursor down/up/left/right while making sure it remains
         * within the bounds of selected rectangles
         *
         * @param direction - The direction of the movement.
         */
        DataGrid.prototype.moveCursor = function (direction) {
            // Bail early if there is no selection
            if (!this.dataModel ||
                !this._selectionModel ||
                this._selectionModel.isEmpty) {
                return;
            }
            var iter = this._selectionModel.selections();
            var onlyOne = iter.next() && !iter.next();
            // if there is a single selection that is a single cell selection
            // then move the selection and cursor within grid bounds
            if (onlyOne) {
                var currentSel = this._selectionModel.currentSelection();
                if (currentSel.r1 === currentSel.r2 &&
                    currentSel.c1 === currentSel.c2) {
                    var dr = direction === 'down' ? 1 : direction === 'up' ? -1 : 0;
                    var dc = direction === 'right' ? 1 : direction === 'left' ? -1 : 0;
                    var newRow = currentSel.r1 + dr;
                    var newColumn = currentSel.c1 + dc;
                    var rowCount = this.dataModel.rowCount('body');
                    var columnCount = this.dataModel.columnCount('body');
                    if (newRow >= rowCount) {
                        newRow = 0;
                        newColumn += 1;
                    }
                    else if (newRow === -1) {
                        newRow = rowCount - 1;
                        newColumn -= 1;
                    }
                    if (newColumn >= columnCount) {
                        newColumn = 0;
                        newRow += 1;
                        if (newRow >= rowCount) {
                            newRow = 0;
                        }
                    }
                    else if (newColumn === -1) {
                        newColumn = columnCount - 1;
                        newRow -= 1;
                        if (newRow === -1) {
                            newRow = rowCount - 1;
                        }
                    }
                    this._selectionModel.select({
                        r1: newRow, c1: newColumn,
                        r2: newRow, c2: newColumn,
                        cursorRow: newRow, cursorColumn: newColumn,
                        clear: 'all'
                    });
                    return;
                }
            }
            // if there are multiple selections, move cursor
            // within selection rectangles
            this._selectionModel.moveCursorWithinSelections(direction);
        };
        /**
         * Scroll the grid to the current cursor position.
         *
         * #### Notes
         * This is a no-op if the cursor is already visible or
         * if there is no selection model installed on the grid.
         */
        DataGrid.prototype.scrollToCursor = function () {
            // Bail early if there is no selection model.
            if (!this._selectionModel) {
                return;
            }
            // Fetch the cursor row and column.
            var row = this._selectionModel.cursorRow;
            var column = this._selectionModel.cursorColumn;
            // Scroll to the cursor cell.
            this.scrollToCell(row, column);
        };
        /**
         * Scroll the viewport by the specified amount.
         *
         * @param dx - The X scroll amount.
         *
         * @param dy - The Y scroll amount.
         */
        DataGrid.prototype.scrollBy = function (dx, dy) {
            this.scrollTo(this.scrollX + dx, this.scrollY + dy);
        };
        /**
         * Scroll the viewport by one page.
         *
         * @param dir - The desired direction of the scroll.
         */
        DataGrid.prototype.scrollByPage = function (dir) {
            var dx = 0;
            var dy = 0;
            switch (dir) {
                case 'up':
                    dy = -this.pageHeight;
                    break;
                case 'down':
                    dy = this.pageHeight;
                    break;
                case 'left':
                    dx = -this.pageWidth;
                    break;
                case 'right':
                    dx = this.pageWidth;
                    break;
                default:
                    throw 'unreachable';
            }
            this.scrollTo(this.scrollX + dx, this.scrollY + dy);
        };
        /**
         * Scroll the viewport by one cell-aligned step.
         *
         * @param dir - The desired direction of the scroll.
         */
        DataGrid.prototype.scrollByStep = function (dir) {
            var r;
            var c;
            var x = this.scrollX;
            var y = this.scrollY;
            var rows = this._rowSections;
            var columns = this._columnSections;
            switch (dir) {
                case 'up':
                    r = rows.indexOf(y - 1);
                    y = r < 0 ? y : rows.offsetOf(r);
                    break;
                case 'down':
                    r = rows.indexOf(y);
                    y = r < 0 ? y : rows.offsetOf(r) + rows.sizeOf(r);
                    break;
                case 'left':
                    c = columns.indexOf(x - 1);
                    x = c < 0 ? x : columns.offsetOf(c);
                    break;
                case 'right':
                    c = columns.indexOf(x);
                    x = c < 0 ? x : columns.offsetOf(c) + columns.sizeOf(c);
                    break;
                default:
                    throw 'unreachable';
            }
            this.scrollTo(x, y);
        };
        /**
         * Scroll to the specified offset position.
         *
         * @param x - The desired X position.
         *
         * @param y - The desired Y position.
         */
        DataGrid.prototype.scrollTo = function (x, y) {
            // Floor and clamp the position to the allowable range.
            x = Math.max(0, Math.min(Math.floor(x), this.maxScrollX));
            y = Math.max(0, Math.min(Math.floor(y), this.maxScrollY));
            // Update the scroll bar values with the desired position.
            this._hScrollBar.value = x;
            this._vScrollBar.value = y;
            // Post a scroll request message to the viewport.
            messaging.MessageLoop.postMessage(this._viewport, Private$5.ScrollRequest);
        };
        /**
         * Get the row count for a particular region in the data grid.
         *
         * @param region - The row region of interest.
         *
         * @returns The row count for the specified region.
         */
        DataGrid.prototype.rowCount = function (region) {
            var count;
            if (region === 'body') {
                count = this._rowSections.count;
            }
            else {
                count = this._columnHeaderSections.count;
            }
            return count;
        };
        /**
         * Get the column count for a particular region in the data grid.
         *
         * @param region - The column region of interest.
         *
         * @returns The column count for the specified region.
         */
        DataGrid.prototype.columnCount = function (region) {
            var count;
            if (region === 'body') {
                count = this._columnSections.count;
            }
            else {
                count = this._rowHeaderSections.count;
            }
            return count;
        };
        /**
         * Get the row at a virtual offset in the data grid.
         *
         * @param region - The region which holds the row of interest.
         *
         * @param offset - The virtual offset of the row of interest.
         *
         * @returns The index of the row, or `-1` if the offset is out of range.
         *
         * #### Notes
         * This method accounts for a stretched last row.
         */
        DataGrid.prototype.rowAt = function (region, offset) {
            // Bail early if the offset is negative.
            if (offset < 0) {
                return -1;
            }
            // Return early for the column header region.
            if (region === 'column-header') {
                return this._columnHeaderSections.indexOf(offset);
            }
            // Fetch the index.
            var index = this._rowSections.indexOf(offset);
            // Return early if the section is found.
            if (index >= 0) {
                return index;
            }
            // Bail early if the last row is not stretched.
            if (!this._stretchLastRow) {
                return -1;
            }
            // Fetch the geometry.
            var bh = this.bodyHeight;
            var ph = this.pageHeight;
            // Bail early if no row stretching is required.
            if (ph <= bh) {
                return -1;
            }
            // Bail early if the offset is out of bounds.
            if (offset >= ph) {
                return -1;
            }
            // Otherwise, return the last row.
            return this._rowSections.count - 1;
        };
        /**
         * Get the column at a virtual offset in the data grid.
         *
         * @param region - The region which holds the column of interest.
         *
         * @param offset - The virtual offset of the column of interest.
         *
         * @returns The index of the column, or `-1` if the offset is out of range.
         *
         * #### Notes
         * This method accounts for a stretched last column.
         */
        DataGrid.prototype.columnAt = function (region, offset) {
            if (offset < 0) {
                return -1;
            }
            // Return early for the row header region.
            if (region === 'row-header') {
                return this._rowHeaderSections.indexOf(offset);
            }
            // Fetch the index.
            var index = this._columnSections.indexOf(offset);
            // Return early if the section is found.
            if (index >= 0) {
                return index;
            }
            // Bail early if the last column is not stretched.
            if (!this._stretchLastColumn) {
                return -1;
            }
            // Fetch the geometry.
            var bw = this.bodyWidth;
            var pw = this.pageWidth;
            // Bail early if no column stretching is required.
            if (pw <= bw) {
                return -1;
            }
            // Bail early if the offset is out of bounds.
            if (offset >= pw) {
                return -1;
            }
            // Otherwise, return the last column.
            return this._columnSections.count - 1;
        };
        /**
         * Get the offset of a row in the data grid.
         *
         * @param region - The region which holds the row of interest.
         *
         * @param index - The index of the row of interest.
         *
         * @returns The offset of the row, or `-1` if the index is out of range.
         *
         * #### Notes
         * A stretched last row has no effect on the return value.
         */
        DataGrid.prototype.rowOffset = function (region, index) {
            var offset;
            if (region === 'body') {
                offset = this._rowSections.offsetOf(index);
            }
            else {
                offset = this._columnHeaderSections.offsetOf(index);
            }
            return offset;
        };
        /**
         * Get the offset of a column in the data grid.
         *
         * @param region - The region which holds the column of interest.
         *
         * @param index - The index of the column of interest.
         *
         * @returns The offset of the column, or `-1` if the index is out of range.
         *
         * #### Notes
         * A stretched last column has no effect on the return value.
         */
        DataGrid.prototype.columnOffset = function (region, index) {
            var offset;
            if (region === 'body') {
                offset = this._columnSections.offsetOf(index);
            }
            else {
                offset = this._rowHeaderSections.offsetOf(index);
            }
            return offset;
        };
        /**
         * Get the size of a row in the data grid.
         *
         * @param region - The region which holds the row of interest.
         *
         * @param index - The index of the row of interest.
         *
         * @returns The size of the row, or `-1` if the index is out of range.
         *
         * #### Notes
         * This method accounts for a stretched last row.
         */
        DataGrid.prototype.rowSize = function (region, index) {
            // Return early for the column header region.
            if (region === 'column-header') {
                return this._columnHeaderSections.sizeOf(index);
            }
            // Fetch the row size.
            var size = this._rowSections.sizeOf(index);
            // Bail early if the index is out of bounds.
            if (size < 0) {
                return size;
            }
            // Return early if the last row is not stretched.
            if (!this._stretchLastRow) {
                return size;
            }
            // Return early if its not the last row.
            if (index < this._rowSections.count - 1) {
                return size;
            }
            // Fetch the geometry.
            var bh = this.bodyHeight;
            var ph = this.pageHeight;
            // Return early if no stretching is needed.
            if (ph <= bh) {
                return size;
            }
            // Return the adjusted size.
            return size + (ph - bh);
        };
        /**
         * Get the size of a column in the data grid.
         *
         * @param region - The region which holds the column of interest.
         *
         * @param index - The index of the column of interest.
         *
         * @returns The size of the column, or `-1` if the index is out of range.
         *
         * #### Notes
         * This method accounts for a stretched last column.
         */
        DataGrid.prototype.columnSize = function (region, index) {
            // Return early for the row header region.
            if (region === 'row-header') {
                return this._rowHeaderSections.sizeOf(index);
            }
            // Fetch the column size.
            var size = this._columnSections.sizeOf(index);
            // Bail early if the index is out of bounds.
            if (size < 0) {
                return size;
            }
            // Return early if the last column is not stretched.
            if (!this._stretchLastColumn) {
                return size;
            }
            // Return early if its not the last column.
            if (index < this._columnSections.count - 1) {
                return size;
            }
            // Fetch the geometry.
            var bw = this.bodyWidth;
            var pw = this.pageWidth;
            // Return early if no stretching is needed.
            if (pw <= bw) {
                return size;
            }
            // Return the adjusted size.
            return size + (pw - bw);
        };
        /**
         * Resize a row in the data grid.
         *
         * @param region - The region which holds the row of interest.
         *
         * @param index - The index of the row of interest.
         *
         * @param size - The desired size of the row.
         */
        DataGrid.prototype.resizeRow = function (region, index, size) {
            var msg = new Private$5.RowResizeRequest(region, index, size);
            messaging.MessageLoop.postMessage(this._viewport, msg);
        };
        /**
         * Resize a column in the data grid.
         *
         * @param region - The region which holds the column of interest.
         *
         * @param index - The index of the column of interest.
         *
         * @param size - The desired size of the column.
         */
        DataGrid.prototype.resizeColumn = function (region, index, size) {
            var msg = new Private$5.ColumnResizeRequest(region, index, size);
            messaging.MessageLoop.postMessage(this._viewport, msg);
        };
        /**
         * Reset modified rows to their default size.
         *
         * @param region - The row region of interest.
         */
        DataGrid.prototype.resetRows = function (region) {
            switch (region) {
                case 'all':
                    this._rowSections.reset();
                    this._columnHeaderSections.reset();
                    break;
                case 'body':
                    this._rowSections.reset();
                    break;
                case 'column-header':
                    this._columnHeaderSections.reset();
                    break;
                default:
                    throw 'unreachable';
            }
            this.repaintContent();
            this.repaintOverlay();
        };
        /**
         * Reset modified columns to their default size.
         *
         * @param region - The column region of interest.
         */
        DataGrid.prototype.resetColumns = function (region) {
            switch (region) {
                case 'all':
                    this._columnSections.reset();
                    this._rowHeaderSections.reset();
                    break;
                case 'body':
                    this._columnSections.reset();
                    break;
                case 'row-header':
                    this._rowHeaderSections.reset();
                    break;
                default:
                    throw 'unreachable';
            }
            this.repaintContent();
            this.repaintOverlay();
        };
        /**
         * Map a client position to local viewport coordinates.
         *
         * @param clientX - The client X position of the mouse.
         *
         * @param clientY - The client Y position of the mouse.
         *
         * @returns The local viewport coordinates for the position.
         */
        DataGrid.prototype.mapToLocal = function (clientX, clientY) {
            // Fetch the viewport rect.
            var rect = this._viewport.node.getBoundingClientRect();
            // Extract the rect coordinates.
            var left = rect.left, top = rect.top;
            // Round the rect coordinates for sub-pixel positioning.
            left = Math.floor(left);
            top = Math.floor(top);
            // Convert to local coordinates.
            var lx = clientX - left;
            var ly = clientY - top;
            // Return the local coordinates.
            return { lx: lx, ly: ly };
        };
        /**
         * Map a client position to virtual grid coordinates.
         *
         * @param clientX - The client X position of the mouse.
         *
         * @param clientY - The client Y position of the mouse.
         *
         * @returns The virtual grid coordinates for the position.
         */
        DataGrid.prototype.mapToVirtual = function (clientX, clientY) {
            // Convert to local coordiates.
            var _a = this.mapToLocal(clientX, clientY), lx = _a.lx, ly = _a.ly;
            // Convert to virtual coordinates.
            var vx = lx + this.scrollX - this.headerWidth;
            var vy = ly + this.scrollY - this.headerHeight;
            // Return the local coordinates.
            return { vx: vx, vy: vy };
        };
        /**
         * Hit test the viewport for the given client position.
         *
         * @param clientX - The client X position of the mouse.
         *
         * @param clientY - The client Y position of the mouse.
         *
         * @returns The hit test result, or `null` if the client
         *   position is out of bounds.
         *
         * #### Notes
         * This method accounts for a stretched last row and/or column.
         */
        DataGrid.prototype.hitTest = function (clientX, clientY) {
            // Convert the mouse position into local coordinates.
            var _a = this.mapToLocal(clientX, clientY), lx = _a.lx, ly = _a.ly;
            // Fetch the header and body dimensions.
            var hw = this.headerWidth;
            var hh = this.headerHeight;
            var bw = this.bodyWidth;
            var bh = this.bodyHeight;
            var ph = this.pageHeight;
            var pw = this.pageWidth;
            // Adjust the body width for a stretched last column.
            if (this._stretchLastColumn && pw > bw) {
                bw = pw;
            }
            // Adjust the body height for a stretched last row.
            if (this._stretchLastRow && ph > bh) {
                bh = ph;
            }
            // Check for a corner header hit.
            if (lx >= 0 && lx < hw && ly >= 0 && ly < hh) {
                // Convert to unscrolled virtual coordinates.
                var vx = lx;
                var vy = ly;
                // Fetch the row and column index.
                var row_1 = this.rowAt('column-header', vy);
                var column_1 = this.columnAt('row-header', vx);
                // Fetch the cell offset position.
                var ox = this.columnOffset('row-header', column_1);
                var oy = this.rowOffset('column-header', row_1);
                // Fetch cell width and height.
                var width_1 = this.columnSize('row-header', column_1);
                var height_1 = this.rowSize('column-header', row_1);
                // Compute the leading and trailing positions.
                var x_1 = vx - ox;
                var y_1 = vy - oy;
                // Return the hit test result.
                return { region: 'corner-header', row: row_1, column: column_1, x: x_1, y: y_1, width: width_1, height: height_1 };
            }
            // Check for a column header hit.
            if (ly >= 0 && ly < hh && lx >= 0 && lx < (hw + bw)) {
                // Convert to unscrolled virtual coordinates.
                var vx = lx + this._scrollX - hw;
                var vy = ly;
                // Fetch the row and column index.
                var row_2 = this.rowAt('column-header', vy);
                var column_2 = this.columnAt('body', vx);
                // Fetch the cell offset position.
                var ox = this.columnOffset('body', column_2);
                var oy = this.rowOffset('column-header', row_2);
                // Fetch the cell width and height.
                var width_2 = this.columnSize('body', column_2);
                var height_2 = this.rowSize('column-header', row_2);
                // Compute the leading and trailing positions.
                var x_2 = vx - ox;
                var y_2 = vy - oy;
                // Return the hit test result.
                return { region: 'column-header', row: row_2, column: column_2, x: x_2, y: y_2, width: width_2, height: height_2 };
            }
            // Check for a row header hit.
            if (lx >= 0 && lx < hw && ly >= 0 && ly < (hh + bh)) {
                // Convert to unscrolled virtual coordinates.
                var vx = lx;
                var vy = ly + this._scrollY - hh;
                // Fetch the row and column index.
                var row_3 = this.rowAt('body', vy);
                var column_3 = this.columnAt('row-header', vx);
                // Fetch the cell offset position.
                var ox = this.columnOffset('row-header', column_3);
                var oy = this.rowOffset('body', row_3);
                // Fetch the cell width and height.
                var width_3 = this.columnSize('row-header', column_3);
                var height_3 = this.rowSize('body', row_3);
                // Compute the leading and trailing positions.
                var x_3 = vx - ox;
                var y_3 = vy - oy;
                // Return the hit test result.
                return { region: 'row-header', row: row_3, column: column_3, x: x_3, y: y_3, width: width_3, height: height_3 };
            }
            // Check for a body hit.
            if (lx >= hw && lx < (hw + bw) && ly >= hh && ly < (hh + bh)) {
                // Convert to unscrolled virtual coordinates.
                var vx = lx + this._scrollX - hw;
                var vy = ly + this._scrollY - hh;
                // Fetch the row and column index.
                var row_4 = this.rowAt('body', vy);
                var column_4 = this.columnAt('body', vx);
                // Fetch the cell offset position.
                var ox = this.columnOffset('body', column_4);
                var oy = this.rowOffset('body', row_4);
                // Fetch the cell width and height.
                var width_4 = this.columnSize('body', column_4);
                var height_4 = this.rowSize('body', row_4);
                // Compute the part coordinates.
                var x_4 = vx - ox;
                var y_4 = vy - oy;
                // Return the result.
                return { region: 'body', row: row_4, column: column_4, x: x_4, y: y_4, width: width_4, height: height_4 };
            }
            // Otherwise, it's a void space hit.
            var row = -1;
            var column = -1;
            var x = -1;
            var y = -1;
            var width = -1;
            var height = -1;
            // Return the hit test result.
            return { region: 'void', row: row, column: column, x: x, y: y, width: width, height: height };
        };
        /**
         * Copy the current selection to the system clipboard.
         *
         * #### Notes
         * The grid must have a data model and a selection model.
         *
         * The behavior can be configured via `DataGrid.copyConfig`.
         */
        DataGrid.prototype.copyToClipboard = function () {
            var _a, _b;
            // Fetch the data model.
            var dataModel = this._dataModel;
            // Bail early if there is no data model.
            if (!dataModel) {
                return;
            }
            // Fetch the selection model.
            var selectionModel = this._selectionModel;
            // Bail early if there is no selection model.
            if (!selectionModel) {
                return;
            }
            // Coerce the selections to an array.
            var selections = algorithm.toArray(selectionModel.selections());
            // Bail early if there are no selections.
            if (selections.length === 0) {
                return;
            }
            // Alert that multiple selections cannot be copied.
            if (selections.length > 1) {
                alert('Cannot copy multiple grid selections.');
                return;
            }
            // Fetch the model counts.
            var br = dataModel.rowCount('body');
            var bc = dataModel.columnCount('body');
            // Bail early if there is nothing to copy.
            if (br === 0 || bc === 0) {
                return;
            }
            // Unpack the selection.
            var _c = selections[0], r1 = _c.r1, c1 = _c.c1, r2 = _c.r2, c2 = _c.c2;
            // Clamp the selection to the model bounds.
            r1 = Math.max(0, Math.min(r1, br - 1));
            c1 = Math.max(0, Math.min(c1, bc - 1));
            r2 = Math.max(0, Math.min(r2, br - 1));
            c2 = Math.max(0, Math.min(c2, bc - 1));
            // Ensure the limits are well-orderd.
            if (r2 < r1)
                _a = [r2, r1], r1 = _a[0], r2 = _a[1];
            if (c2 < c1)
                _b = [c2, c1], c1 = _b[0], c2 = _b[1];
            // Fetch the header counts.
            var rhc = dataModel.columnCount('row-header');
            var chr = dataModel.rowCount('column-header');
            // Unpack the copy config.
            var separator = this._copyConfig.separator;
            var format = this._copyConfig.format;
            var headers = this._copyConfig.headers;
            var warningThreshold = this._copyConfig.warningThreshold;
            // Compute the number of cells to be copied.
            var rowCount = r2 - r1 + 1;
            var colCount = c2 - c1 + 1;
            switch (headers) {
                case 'none':
                    rhc = 0;
                    chr = 0;
                    break;
                case 'row':
                    chr = 0;
                    colCount += rhc;
                    break;
                case 'column':
                    rhc = 0;
                    rowCount += chr;
                    break;
                case 'all':
                    rowCount += chr;
                    colCount += rhc;
                    break;
                default:
                    throw 'unreachable';
            }
            // Compute the total cell count.
            var cellCount = rowCount * colCount;
            // Allow the user to cancel a large copy request.
            if (cellCount > warningThreshold) {
                var msg = "Copying " + cellCount + " cells may take a while. Continue?";
                if (!window.confirm(msg)) {
                    return;
                }
            }
            // Set up the format args.
            var args = {
                region: 'body',
                row: 0,
                column: 0,
                value: null,
                metadata: {}
            };
            // Allocate the array of rows.
            var rows = new Array(rowCount);
            // Iterate over the rows.
            for (var j = 0; j < rowCount; ++j) {
                // Allocate the array of cells.
                var cells = new Array(colCount);
                // Iterate over the columns.
                for (var i = 0; i < colCount; ++i) {
                    // Set up the format variables.
                    var region = void 0;
                    var row = void 0;
                    var column = void 0;
                    // Populate the format variables.
                    if (j < chr && i < rhc) {
                        region = 'corner-header';
                        row = j;
                        column = i;
                    }
                    else if (j < chr) {
                        region = 'column-header';
                        row = j;
                        column = i - rhc + c1;
                    }
                    else if (i < rhc) {
                        region = 'row-header';
                        row = j - chr + r1;
                        column = i;
                    }
                    else {
                        region = 'body';
                        row = j - chr + r1;
                        column = i - rhc + c1;
                    }
                    // Populate the format args.
                    args.region = region;
                    args.row = row;
                    args.column = column;
                    args.value = dataModel.data(region, row, column);
                    args.metadata = dataModel.metadata(region, row, column);
                    // Format the cell.
                    cells[i] = format(args);
                }
                // Save the row of cells.
                rows[j] = cells;
            }
            // Convert the cells into lines.
            var lines = rows.map(function (cells) { return cells.join(separator); });
            // Convert the lines into text.
            var text = lines.join('\n');
            // Copy the text to the clipboard.
            domutils.ClipboardExt.copyText(text);
        };
        /**
         * Process a message sent to the widget.
         *
         * @param msg - The message sent to the widget.
         */
        DataGrid.prototype.processMessage = function (msg) {
            // Ignore child show/hide messages. The data grid controls the
            // visibility of its children, and will manually dispatch the
            // fit-request messages as a result of visibility change.
            if (msg.type === 'child-shown' || msg.type === 'child-hidden') {
                return;
            }
            // Recompute the scroll bar minimums before the layout refits.
            if (msg.type === 'fit-request') {
                var vsbLimits = domutils.ElementExt.sizeLimits(this._vScrollBar.node);
                var hsbLimits = domutils.ElementExt.sizeLimits(this._hScrollBar.node);
                this._vScrollBarMinWidth = vsbLimits.minWidth;
                this._hScrollBarMinHeight = hsbLimits.minHeight;
            }
            // Process all other messages as normal.
            _super.prototype.processMessage.call(this, msg);
        };
        /**
         * Intercept a message sent to a message handler.
         *
         * @param handler - The target handler of the message.
         *
         * @param msg - The message to be sent to the handler.
         *
         * @returns `true` if the message should continue to be processed
         *   as normal, or `false` if processing should cease immediately.
         */
        DataGrid.prototype.messageHook = function (handler, msg) {
            // Process viewport messages.
            if (handler === this._viewport) {
                this._processViewportMessage(msg);
                return true;
            }
            // Process horizontal scroll bar messages.
            if (handler === this._hScrollBar && msg.type === 'activate-request') {
                this.activate();
                return false;
            }
            // Process vertical scroll bar messages.
            if (handler === this._vScrollBar && msg.type === 'activate-request') {
                this.activate();
                return false;
            }
            // Ignore all other messages.
            return true;
        };
        /**
         * Handle the DOM events for the data grid.
         *
         * @param event - The DOM event sent to the data grid.
         *
         * #### Notes
         * This method implements the DOM `EventListener` interface and is
         * called in response to events on the data grid's DOM node. It
         * should not be called directly by user code.
         */
        DataGrid.prototype.handleEvent = function (event) {
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
                case 'mouseup':
                    this._evtMouseUp(event);
                    break;
                case 'dblclick':
                    this._evtMouseDoubleClick(event);
                    break;
                case 'mouseleave':
                    this._evtMouseLeave(event);
                    break;
                case 'contextmenu':
                    this._evtContextMenu(event);
                    break;
                case 'wheel':
                    this._evtWheel(event);
                    break;
                case 'resize':
                    this._refreshDPI();
                    break;
            }
        };
        /**
         * A message handler invoked on an `'activate-request'` message.
         */
        DataGrid.prototype.onActivateRequest = function (msg) {
            this.viewport.node.focus();
        };
        /**
         * A message handler invoked on a `'before-attach'` message.
         */
        DataGrid.prototype.onBeforeAttach = function (msg) {
            window.addEventListener('resize', this);
            this.node.addEventListener('wheel', this);
            this._viewport.node.addEventListener('keydown', this);
            this._viewport.node.addEventListener('mousedown', this);
            this._viewport.node.addEventListener('mousemove', this);
            this._viewport.node.addEventListener('dblclick', this);
            this._viewport.node.addEventListener('mouseleave', this);
            this._viewport.node.addEventListener('contextmenu', this);
            this.repaintContent();
            this.repaintOverlay();
        };
        /**
         * A message handler invoked on an `'after-detach'` message.
         */
        DataGrid.prototype.onAfterDetach = function (msg) {
            window.removeEventListener('resize', this);
            this.node.removeEventListener('wheel', this);
            this._viewport.node.removeEventListener('keydown', this);
            this._viewport.node.removeEventListener('mousedown', this);
            this._viewport.node.removeEventListener('mousemove', this);
            this._viewport.node.removeEventListener('mouseleave', this);
            this._viewport.node.removeEventListener('dblclick', this);
            this._viewport.node.removeEventListener('contextmenu', this);
            this._releaseMouse();
        };
        /**
         * A message handler invoked on a `'before-show'` message.
         */
        DataGrid.prototype.onBeforeShow = function (msg) {
            this.repaintContent();
            this.repaintOverlay();
        };
        /**
         * A message handler invoked on a `'resize'` message.
         */
        DataGrid.prototype.onResize = function (msg) {
            if (this._editorController) {
                this._editorController.cancel();
            }
            this._syncScrollState();
        };
        /**
         * Schedule a repaint of all of the grid content.
         */
        DataGrid.prototype.repaintContent = function () {
            var msg = new Private$5.PaintRequest('all', 0, 0, 0, 0);
            messaging.MessageLoop.postMessage(this._viewport, msg);
        };
        /**
         * Schedule a repaint of specific grid content.
         */
        DataGrid.prototype.repaintRegion = function (region, r1, c1, r2, c2) {
            var msg = new Private$5.PaintRequest(region, r1, c1, r2, c2);
            messaging.MessageLoop.postMessage(this._viewport, msg);
        };
        /**
         * Schedule a repaint of the overlay.
         */
        DataGrid.prototype.repaintOverlay = function () {
            messaging.MessageLoop.postMessage(this._viewport, Private$5.OverlayPaintRequest);
        };
        /**
         * Ensure the canvas is at least the specified size.
         *
         * This method will retain the valid canvas content.
         */
        DataGrid.prototype._resizeCanvasIfNeeded = function (width, height) {
            // Scale the size by the dpi ratio.
            width = width * this._dpiRatio;
            height = height * this._dpiRatio;
            // Compute the maximum canvas size for the given width and height.
            var maxW = (Math.ceil((width + 1) / 512) + 1) * 512;
            var maxH = (Math.ceil((height + 1) / 512) + 1) * 512;
            // Get the current size of the canvas.
            var curW = this._canvas.width;
            var curH = this._canvas.height;
            // Bail early if the canvas size is within bounds.
            if (curW >= width && curH >= height && curW <= maxW && curH <= maxH) {
                return;
            }
            // Compute the expanded canvas size.
            var expW = maxW - 512;
            var expH = maxH - 512;
            // Set the transforms to the identity matrix.
            this._canvasGC.setTransform(1, 0, 0, 1, 0, 0);
            this._bufferGC.setTransform(1, 0, 0, 1, 0, 0);
            this._overlayGC.setTransform(1, 0, 0, 1, 0, 0);
            // Resize the buffer if needed.
            if (curW < width) {
                this._buffer.width = expW;
            }
            else if (curW > maxW) {
                this._buffer.width = maxW;
            }
            // Resize the buffer height if needed.
            if (curH < height) {
                this._buffer.height = expH;
            }
            else if (curH > maxH) {
                this._buffer.height = maxH;
            }
            // Test whether there is content to blit.
            var needBlit = curH > 0 && curH > 0 && width > 0 && height > 0;
            // Copy the valid canvas content into the buffer if needed.
            if (needBlit) {
                this._bufferGC.drawImage(this._canvas, 0, 0);
            }
            // Resize the canvas width if needed.
            if (curW < width) {
                this._canvas.width = expW;
                this._canvas.style.width = expW / this._dpiRatio + "px";
            }
            else if (curW > maxW) {
                this._canvas.width = maxW;
                this._canvas.style.width = maxW / this._dpiRatio + "px";
            }
            // Resize the canvas height if needed.
            if (curH < height) {
                this._canvas.height = expH;
                this._canvas.style.height = expH / this._dpiRatio + "px";
            }
            else if (curH > maxH) {
                this._canvas.height = maxH;
                this._canvas.style.height = maxH / this._dpiRatio + "px";
            }
            // Copy the valid canvas content from the buffer if needed.
            if (needBlit) {
                this._canvasGC.drawImage(this._buffer, 0, 0);
            }
            // Copy the valid overlay content into the buffer if needed.
            if (needBlit) {
                this._bufferGC.drawImage(this._overlay, 0, 0);
            }
            // Resize the overlay width if needed.
            if (curW < width) {
                this._overlay.width = expW;
                this._overlay.style.width = expW / this._dpiRatio + "px";
            }
            else if (curW > maxW) {
                this._overlay.width = maxW;
                this._overlay.style.width = maxW / this._dpiRatio + "px";
            }
            // Resize the overlay height if needed.
            if (curH < height) {
                this._overlay.height = expH;
                this._overlay.style.height = expH / this._dpiRatio + "px";
            }
            else if (curH > maxH) {
                this._overlay.height = maxH;
                this._overlay.style.height = maxH / this._dpiRatio + "px";
            }
            // Copy the valid overlay content from the buffer if needed.
            if (needBlit) {
                this._overlayGC.drawImage(this._buffer, 0, 0);
            }
        };
        /**
         * Sync the scroll bars and scroll state with the viewport.
         *
         * #### Notes
         * If the visibility of either scroll bar changes, a synchronous
         * fit-request will be dispatched to the data grid to immediately
         * resize the viewport.
         */
        DataGrid.prototype._syncScrollState = function () {
            // Fetch the viewport dimensions.
            var bw = this.bodyWidth;
            var bh = this.bodyHeight;
            var pw = this.pageWidth;
            var ph = this.pageHeight;
            // Get the current scroll bar visibility.
            var hasVScroll = !this._vScrollBar.isHidden;
            var hasHScroll = !this._hScrollBar.isHidden;
            // Get the minimum sizes of the scroll bars.
            var vsw = this._vScrollBarMinWidth;
            var hsh = this._hScrollBarMinHeight;
            // Get the page size as if no scroll bars are visible.
            var apw = pw + (hasVScroll ? vsw : 0);
            var aph = ph + (hasHScroll ? hsh : 0);
            // Test whether scroll bars are needed for the adjusted size.
            var needVScroll = aph < bh - 1;
            var needHScroll = apw < bw - 1;
            // Re-test the horizontal scroll if a vertical scroll is needed.
            if (needVScroll && !needHScroll) {
                needHScroll = (apw - vsw) < bw - 1;
            }
            // Re-test the vertical scroll if a horizontal scroll is needed.
            if (needHScroll && !needVScroll) {
                needVScroll = (aph - hsh) < bh - 1;
            }
            // If the visibility changes, immediately refit the grid.
            if (needVScroll !== hasVScroll || needHScroll !== hasHScroll) {
                this._vScrollBar.setHidden(!needVScroll);
                this._hScrollBar.setHidden(!needHScroll);
                this._scrollCorner.setHidden(!needVScroll || !needHScroll);
                messaging.MessageLoop.sendMessage(this, widgets.Widget.Msg.FitRequest);
            }
            // Update the scroll bar limits.
            this._vScrollBar.maximum = this.maxScrollY;
            this._vScrollBar.page = this.pageHeight;
            this._hScrollBar.maximum = this.maxScrollX;
            this._hScrollBar.page = this.pageWidth;
            // Re-clamp the scroll position.
            this._scrollTo(this._scrollX, this._scrollY);
        };
        /**
         * Sync the viewport to the given scroll position.
         *
         * #### Notes
         * This schedules a full repaint and syncs the scroll state.
         */
        DataGrid.prototype._syncViewport = function () {
            this.repaintContent();
            this.repaintOverlay();
            this._syncScrollState();
        };
        /**
         * Process a message sent to the viewport
         */
        DataGrid.prototype._processViewportMessage = function (msg) {
            switch (msg.type) {
                case 'resize':
                    this._onViewportResize(msg);
                    break;
                case 'scroll-request':
                    this._onViewportScrollRequest(msg);
                    break;
                case 'paint-request':
                    this._onViewportPaintRequest(msg);
                    break;
                case 'overlay-paint-request':
                    this._onViewportOverlayPaintRequest(msg);
                    break;
                case 'row-resize-request':
                    this._onViewportRowResizeRequest(msg);
                    break;
                case 'column-resize-request':
                    this._onViewportColumnResizeRequest(msg);
                    break;
            }
        };
        /**
         * A message hook invoked on a viewport `'resize'` message.
         */
        DataGrid.prototype._onViewportResize = function (msg) {
            // Bail early if the viewport is not visible.
            if (!this._viewport.isVisible) {
                return;
            }
            // Unpack the message data.
            var width = msg.width, height = msg.height;
            // Measure the viewport node if the dimensions are unknown.
            if (width === -1) {
                width = this._viewport.node.offsetWidth;
            }
            if (height === -1) {
                height = this._viewport.node.offsetHeight;
            }
            // Round the dimensions to the nearest pixel.
            width = Math.round(width);
            height = Math.round(height);
            // Get the current size of the viewport.
            var oldWidth = this._viewportWidth;
            var oldHeight = this._viewportHeight;
            // Updated internal viewport size.
            this._viewportWidth = width;
            this._viewportHeight = height;
            // Resize the canvas if needed.
            this._resizeCanvasIfNeeded(width, height);
            // Bail early if there is nothing to paint.
            if (width === 0 || height === 0) {
                return;
            }
            // Paint the whole grid if the old size was zero.
            if (oldWidth === 0 || oldHeight === 0) {
                this.paintContent(0, 0, width, height);
                this._paintOverlay();
                return;
            }
            // Paint the right edge as needed.
            if (this._stretchLastColumn && this.pageWidth > this.bodyWidth) {
                var bx = this._columnSections.offsetOf(this._columnSections.count - 1);
                var x = Math.min(this.headerWidth + bx, oldWidth);
                this.paintContent(x, 0, width - x, height);
            }
            else if (width > oldWidth) {
                this.paintContent(oldWidth, 0, width - oldWidth, height);
            }
            // Paint the bottom edge as needed.
            if (this._stretchLastRow && this.pageHeight > this.bodyHeight) {
                var by = this._rowSections.offsetOf(this._rowSections.count - 1);
                var y = Math.min(this.headerHeight + by, oldHeight);
                this.paintContent(0, y, width, height - y);
            }
            else if (height > oldHeight) {
                this.paintContent(0, oldHeight, width, height - oldHeight);
            }
            // Paint the overlay.
            this._paintOverlay();
        };
        /**
         * A message hook invoked on a viewport `'scroll-request'` message.
         */
        DataGrid.prototype._onViewportScrollRequest = function (msg) {
            this._scrollTo(this._hScrollBar.value, this._vScrollBar.value);
        };
        /**
         * A message hook invoked on a viewport `'paint-request'` message.
         */
        DataGrid.prototype._onViewportPaintRequest = function (msg) {
            // Bail early if the viewport is not visible.
            if (!this._viewport.isVisible) {
                return;
            }
            // Bail early if the viewport has zero area.
            if (this._viewportWidth === 0 || this._viewportHeight === 0) {
                return;
            }
            // Set up the paint limits.
            var xMin = 0;
            var yMin = 0;
            var xMax = this._viewportWidth - 1;
            var yMax = this._viewportHeight - 1;
            // Fetch the scroll position.
            var sx = this._scrollX;
            var sy = this._scrollY;
            // Fetch the header dimensions.
            var hw = this.headerWidth;
            var hh = this.headerHeight;
            // Fetch the section lists.
            var rs = this._rowSections;
            var cs = this._columnSections;
            var rhs = this._rowHeaderSections;
            var chs = this._columnHeaderSections;
            // Unpack the message data.
            var region = msg.region, r1 = msg.r1, c1 = msg.c1, r2 = msg.r2, c2 = msg.c2;
            // Set up the paint variables.
            var x1;
            var y1;
            var x2;
            var y2;
            // Fill the paint variables based on the paint region.
            switch (region) {
                case 'all':
                    x1 = xMin;
                    y1 = yMin;
                    x2 = xMax;
                    y2 = yMax;
                    break;
                case 'body':
                    r1 = Math.max(0, Math.min(r1, rs.count));
                    c1 = Math.max(0, Math.min(c1, cs.count));
                    r2 = Math.max(0, Math.min(r2, rs.count));
                    c2 = Math.max(0, Math.min(c2, cs.count));
                    x1 = cs.offsetOf(c1) - sx + hw;
                    y1 = rs.offsetOf(r1) - sy + hh;
                    x2 = cs.extentOf(c2) - sx + hw;
                    y2 = rs.extentOf(r2) - sy + hh;
                    break;
                case 'row-header':
                    r1 = Math.max(0, Math.min(r1, rs.count));
                    c1 = Math.max(0, Math.min(c1, rhs.count));
                    r2 = Math.max(0, Math.min(r2, rs.count));
                    c2 = Math.max(0, Math.min(c2, rhs.count));
                    x1 = rhs.offsetOf(c1);
                    y1 = rs.offsetOf(r1) - sy + hh;
                    x2 = rhs.extentOf(c2);
                    y2 = rs.extentOf(r2) - sy + hh;
                    break;
                case 'column-header':
                    r1 = Math.max(0, Math.min(r1, chs.count));
                    c1 = Math.max(0, Math.min(c1, cs.count));
                    r2 = Math.max(0, Math.min(r2, chs.count));
                    c2 = Math.max(0, Math.min(c2, cs.count));
                    x1 = cs.offsetOf(c1) - sx + hw;
                    y1 = chs.offsetOf(r1);
                    x2 = cs.extentOf(c2) - sx + hw;
                    y2 = chs.extentOf(r2);
                    break;
                case 'corner-header':
                    r1 = Math.max(0, Math.min(r1, chs.count));
                    c1 = Math.max(0, Math.min(c1, rhs.count));
                    r2 = Math.max(0, Math.min(r2, chs.count));
                    c2 = Math.max(0, Math.min(c2, rhs.count));
                    x1 = rhs.offsetOf(c1);
                    y1 = chs.offsetOf(r1);
                    x2 = rhs.extentOf(c2);
                    y2 = chs.extentOf(r2);
                    break;
                default:
                    throw 'unreachable';
            }
            // Bail early if the dirty rect is outside the bounds.
            if (x2 < xMin || y2 < yMin || x1 > xMax || y1 > yMax) {
                return;
            }
            // Clamp the dirty rect to the paint bounds.
            x1 = Math.max(xMin, Math.min(x1, xMax));
            y1 = Math.max(yMin, Math.min(y1, yMax));
            x2 = Math.max(xMin, Math.min(x2, xMax));
            y2 = Math.max(yMin, Math.min(y2, yMax));
            // Paint the content of the dirty rect.
            this.paintContent(x1, y1, x2 - x1 + 1, y2 - y1 + 1);
        };
        /**
         * A message hook invoked on a viewport `'overlay-paint-request'` message.
         */
        DataGrid.prototype._onViewportOverlayPaintRequest = function (msg) {
            // Bail early if the viewport is not visible.
            if (!this._viewport.isVisible) {
                return;
            }
            // Bail early if the viewport has zero area.
            if (this._viewportWidth === 0 || this._viewportHeight === 0) {
                return;
            }
            // Paint the content of the overlay.
            this._paintOverlay();
        };
        /**
         * A message hook invoked on a viewport `'row-resize-request'` message.
         */
        DataGrid.prototype._onViewportRowResizeRequest = function (msg) {
            if (msg.region === 'body') {
                this._resizeRow(msg.index, msg.size);
            }
            else {
                this._resizeColumnHeader(msg.index, msg.size);
            }
        };
        /**
         * A message hook invoked on a viewport `'column-resize-request'` message.
         */
        DataGrid.prototype._onViewportColumnResizeRequest = function (msg) {
            if (msg.region === 'body') {
                this._resizeColumn(msg.index, msg.size);
            }
            else {
                this._resizeRowHeader(msg.index, msg.size);
            }
        };
        /**
         * Handle the `thumbMoved` signal from a scroll bar.
         */
        DataGrid.prototype._onThumbMoved = function (sender) {
            messaging.MessageLoop.postMessage(this._viewport, Private$5.ScrollRequest);
        };
        /**
         * Handle the `pageRequested` signal from a scroll bar.
         */
        DataGrid.prototype._onPageRequested = function (sender, dir) {
            if (sender === this._vScrollBar) {
                this.scrollByPage(dir === 'decrement' ? 'up' : 'down');
            }
            else {
                this.scrollByPage(dir === 'decrement' ? 'left' : 'right');
            }
        };
        /**
         * Handle the `stepRequested` signal from a scroll bar.
         */
        DataGrid.prototype._onStepRequested = function (sender, dir) {
            if (sender === this._vScrollBar) {
                this.scrollByStep(dir === 'decrement' ? 'up' : 'down');
            }
            else {
                this.scrollByStep(dir === 'decrement' ? 'left' : 'right');
            }
        };
        /**
         * A signal handler for the data model `changed` signal.
         */
        DataGrid.prototype._onDataModelChanged = function (sender, args) {
            switch (args.type) {
                case 'rows-inserted':
                    this._onRowsInserted(args);
                    break;
                case 'columns-inserted':
                    this._onColumnsInserted(args);
                    break;
                case 'rows-removed':
                    this._onRowsRemoved(args);
                    break;
                case 'columns-removed':
                    this._onColumnsRemoved(args);
                    break;
                case 'rows-moved':
                    this._onRowsMoved(args);
                    break;
                case 'columns-moved':
                    this._onColumnsMoved(args);
                    break;
                case 'cells-changed':
                    this._onCellsChanged(args);
                    break;
                case 'model-reset':
                    this._onModelReset(args);
                    break;
                default:
                    throw 'unreachable';
            }
        };
        /**
         * A signal handler for the selection model `changed` signal.
         */
        DataGrid.prototype._onSelectionsChanged = function (sender) {
            this.repaintOverlay();
        };
        /**
         * Handle rows being inserted in the data model.
         */
        DataGrid.prototype._onRowsInserted = function (args) {
            // Unpack the arg data.
            var region = args.region, index = args.index, span = args.span;
            // Bail early if there are no sections to insert.
            if (span <= 0) {
                return;
            }
            // Look up the relevant section list.
            var list;
            if (region === 'body') {
                list = this._rowSections;
            }
            else {
                list = this._columnHeaderSections;
            }
            // Insert the span, maintaining the scroll position as needed.
            if (this._scrollY === this.maxScrollY && this.maxScrollY > 0) {
                list.insert(index, span);
                this._scrollY = this.maxScrollY;
            }
            else {
                list.insert(index, span);
            }
            // Sync the viewport.
            this._syncViewport();
        };
        /**
         * Handle columns being inserted into the data model.
         */
        DataGrid.prototype._onColumnsInserted = function (args) {
            // Unpack the arg data.
            var region = args.region, index = args.index, span = args.span;
            // Bail early if there are no sections to insert.
            if (span <= 0) {
                return;
            }
            // Look up the relevant section list.
            var list;
            if (region === 'body') {
                list = this._columnSections;
            }
            else {
                list = this._rowHeaderSections;
            }
            // Insert the span, maintaining the scroll position as needed.
            if (this._scrollX === this.maxScrollX && this.maxScrollX > 0) {
                list.insert(index, span);
                this._scrollX = this.maxScrollX;
            }
            else {
                list.insert(index, span);
            }
            // Sync the viewport.
            this._syncViewport();
        };
        /**
         * Handle rows being removed from the data model.
         */
        DataGrid.prototype._onRowsRemoved = function (args) {
            // Unpack the arg data.
            var region = args.region, index = args.index, span = args.span;
            // Bail early if there are no sections to remove.
            if (span <= 0) {
                return;
            }
            // Look up the relevant section list.
            var list;
            if (region === 'body') {
                list = this._rowSections;
            }
            else {
                list = this._columnHeaderSections;
            }
            // Bail if the index or is invalid
            if (index < 0 || index >= list.count) {
                return;
            }
            // Remove the span, maintaining the scroll position as needed.
            if (this._scrollY === this.maxScrollY && this.maxScrollY > 0) {
                list.remove(index, span);
                this._scrollY = this.maxScrollY;
            }
            else {
                list.remove(index, span);
            }
            // Sync the viewport.
            this._syncViewport();
        };
        /**
         * Handle columns being removed from the data model.
         */
        DataGrid.prototype._onColumnsRemoved = function (args) {
            // Unpack the arg data.
            var region = args.region, index = args.index, span = args.span;
            // Bail early if there are no sections to remove.
            if (span <= 0) {
                return;
            }
            // Look up the relevant section list.
            var list;
            if (region === 'body') {
                list = this._columnSections;
            }
            else {
                list = this._rowHeaderSections;
            }
            // Bail if the index or is invalid
            if (index < 0 || index >= list.count) {
                return;
            }
            // Remove the span, maintaining the scroll position as needed.
            if (this._scrollX === this.maxScrollX && this.maxScrollX > 0) {
                list.remove(index, span);
                this._scrollX = this.maxScrollX;
            }
            else {
                list.remove(index, span);
            }
            // Sync the viewport.
            this._syncViewport();
        };
        /**
         * Handle rows moving in the data model.
         */
        DataGrid.prototype._onRowsMoved = function (args) {
            // Unpack the arg data.
            var region = args.region, index = args.index, span = args.span, destination = args.destination;
            // Bail early if there are no sections to move.
            if (span <= 0) {
                return;
            }
            // Look up the relevant section list.
            var list;
            if (region === 'body') {
                list = this._rowSections;
            }
            else {
                list = this._columnHeaderSections;
            }
            // Bail early if the index is out of range.
            if (index < 0 || index >= list.count) {
                return;
            }
            // Clamp the move span to the limit.
            span = Math.min(span, list.count - index);
            // Clamp the destination index to the limit.
            destination = Math.min(Math.max(0, destination), list.count - span);
            // Bail early if there is no effective move.
            if (index === destination) {
                return;
            }
            // Compute the first affected index.
            var r1 = Math.min(index, destination);
            // Compute the last affected index.
            var r2 = Math.max(index + span - 1, destination + span - 1);
            // Move the sections in the list.
            list.move(index, span, destination);
            // Schedule a repaint of the dirty cells.
            if (region === 'body') {
                this.repaintRegion('body', r1, 0, r2, Infinity);
                this.repaintRegion('row-header', r1, 0, r2, Infinity);
            }
            else {
                this.repaintRegion('column-header', r1, 0, r2, Infinity);
                this.repaintRegion('corner-header', r1, 0, r2, Infinity);
            }
            // Sync the viewport.
            this._syncViewport();
        };
        /**
         * Handle columns moving in the data model.
         */
        DataGrid.prototype._onColumnsMoved = function (args) {
            // Unpack the arg data.
            var region = args.region, index = args.index, span = args.span, destination = args.destination;
            // Bail early if there are no sections to move.
            if (span <= 0) {
                return;
            }
            // Look up the relevant section list.
            var list;
            if (region === 'body') {
                list = this._columnSections;
            }
            else {
                list = this._rowHeaderSections;
            }
            // Bail early if the index is out of range.
            if (index < 0 || index >= list.count) {
                return;
            }
            // Clamp the move span to the limit.
            span = Math.min(span, list.count - index);
            // Clamp the destination index to the limit.
            destination = Math.min(Math.max(0, destination), list.count - span);
            // Bail early if there is no effective move.
            if (index === destination) {
                return;
            }
            // Move the sections in the list.
            list.move(index, span, destination);
            // Compute the first affected index.
            var c1 = Math.min(index, destination);
            // Compute the last affected index.
            var c2 = Math.max(index + span - 1, destination + span - 1);
            // Schedule a repaint of the dirty cells.
            if (region === 'body') {
                this.repaintRegion('body', 0, c1, Infinity, c2);
                this.repaintRegion('column-header', 0, c1, Infinity, c2);
            }
            else {
                this.repaintRegion('row-header', 0, c1, Infinity, c2);
                this.repaintRegion('corner-header', 0, c1, Infinity, c2);
            }
            // Sync the viewport.
            this._syncViewport();
        };
        /**
         * Handle cells changing in the data model.
         */
        DataGrid.prototype._onCellsChanged = function (args) {
            // Unpack the arg data.
            var region = args.region, row = args.row, column = args.column, rowSpan = args.rowSpan, columnSpan = args.columnSpan;
            // Bail early if there are no cells to modify.
            if (rowSpan <= 0 && columnSpan <= 0) {
                return;
            }
            // Compute the changed cell bounds.
            var r1 = row;
            var c1 = column;
            var r2 = r1 + rowSpan - 1;
            var c2 = c1 + columnSpan - 1;
            // Schedule a repaint of the cell content.
            this.repaintRegion(region, r1, c1, r2, c2);
        };
        /**
         * Handle a full data model reset.
         */
        DataGrid.prototype._onModelReset = function (args) {
            // Look up the various current section counts.
            var nr = this._rowSections.count;
            var nc = this._columnSections.count;
            var nrh = this._rowHeaderSections.count;
            var nch = this._columnHeaderSections.count;
            // Compute the delta count for each region.
            var dr = this._dataModel.rowCount('body') - nr;
            var dc = this._dataModel.columnCount('body') - nc;
            var drh = this._dataModel.columnCount('row-header') - nrh;
            var dch = this._dataModel.rowCount('column-header') - nch;
            // Update the row sections, if needed.
            if (dr > 0) {
                this._rowSections.insert(nr, dr);
            }
            else if (dr < 0) {
                this._rowSections.remove(nr + dr, -dr);
            }
            // Update the column sections, if needed.
            if (dc > 0) {
                this._columnSections.insert(nc, dc);
            }
            else if (dc < 0) {
                this._columnSections.remove(nc + dc, -dc);
            }
            // Update the row header sections, if needed.
            if (drh > 0) {
                this._rowHeaderSections.insert(nrh, drh);
            }
            else if (drh < 0) {
                this._rowHeaderSections.remove(nrh + drh, -drh);
            }
            // Update the column header sections, if needed.
            if (dch > 0) {
                this._columnHeaderSections.insert(nch, dch);
            }
            else if (dch < 0) {
                this._columnHeaderSections.remove(nch + dch, -dch);
            }
            // Sync the viewport.
            this._syncViewport();
        };
        /**
         * A signal handler for the renderer map `changed` signal.
         */
        DataGrid.prototype._onRenderersChanged = function () {
            this.repaintContent();
        };
        /**
         * Handle the `'keydown'` event for the data grid.
         */
        DataGrid.prototype._evtKeyDown = function (event) {
            if (this._mousedown) {
                event.preventDefault();
                event.stopPropagation();
            }
            else if (this._keyHandler) {
                this._keyHandler.onKeyDown(this, event);
            }
        };
        /**
         * Handle the `'mousedown'` event for the data grid.
         */
        DataGrid.prototype._evtMouseDown = function (event) {
            // Ignore everything except the left mouse button.
            if (event.button !== 0) {
                return;
            }
            // Activate the grid.
            this.activate();
            // Stop the event propagation.
            event.preventDefault();
            event.stopPropagation();
            // Add the extra document listeners.
            document.addEventListener('keydown', this, true);
            document.addEventListener('mouseup', this, true);
            document.addEventListener('mousedown', this, true);
            document.addEventListener('mousemove', this, true);
            document.addEventListener('contextmenu', this, true);
            // Flip the mousedown flag.
            this._mousedown = true;
            // Dispatch to the mouse handler.
            if (this._mouseHandler) {
                this._mouseHandler.onMouseDown(this, event);
            }
        };
        /**
         * Handle the `'mousemove'` event for the data grid.
         */
        DataGrid.prototype._evtMouseMove = function (event) {
            // Stop the event propagation if the mouse is down.
            if (this._mousedown) {
                event.preventDefault();
                event.stopPropagation();
            }
            // Bail if there is no mouse handler.
            if (!this._mouseHandler) {
                return;
            }
            // Dispatch to the mouse handler.
            if (this._mousedown) {
                this._mouseHandler.onMouseMove(this, event);
            }
            else {
                this._mouseHandler.onMouseHover(this, event);
            }
        };
        /**
         * Handle the `'mouseup'` event for the data grid.
         */
        DataGrid.prototype._evtMouseUp = function (event) {
            // Ignore everything except the left mouse button.
            if (event.button !== 0) {
                return;
            }
            // Stop the event propagation.
            event.preventDefault();
            event.stopPropagation();
            // Dispatch to the mouse handler.
            if (this._mouseHandler) {
                this._mouseHandler.onMouseUp(this, event);
            }
            // Release the mouse.
            this._releaseMouse();
        };
        /**
         * Handle the `'dblclick'` event for the data grid.
         */
        DataGrid.prototype._evtMouseDoubleClick = function (event) {
            // Ignore everything except the left mouse button.
            if (event.button !== 0) {
                return;
            }
            // Stop the event propagation.
            event.preventDefault();
            event.stopPropagation();
            // Dispatch to the mouse handler.
            if (this._mouseHandler) {
                this._mouseHandler.onMouseDoubleClick(this, event);
            }
            // Release the mouse.
            this._releaseMouse();
        };
        /**
         * Handle the `'mouseleave'` event for the data grid.
         */
        DataGrid.prototype._evtMouseLeave = function (event) {
            if (this._mousedown) {
                event.preventDefault();
                event.stopPropagation();
            }
            else if (this._mouseHandler) {
                this._mouseHandler.onMouseLeave(this, event);
            }
        };
        /**
         * Handle the `'contextmenu'` event for the data grid.
         */
        DataGrid.prototype._evtContextMenu = function (event) {
            if (this._mousedown) {
                event.preventDefault();
                event.stopPropagation();
            }
            else if (this._mouseHandler) {
                this._mouseHandler.onContextMenu(this, event);
            }
        };
        /**
         * Handle the `'wheel'` event for the data grid.
         */
        DataGrid.prototype._evtWheel = function (event) {
            // Ignore the event if `accel` is held.
            if (domutils.Platform.accelKey(event)) {
                return;
            }
            // Bail early if there is no mouse handler.
            if (!this._mouseHandler) {
                return;
            }
            // Stop the event propagation.
            event.preventDefault();
            event.stopPropagation();
            // Dispatch to the mouse handler.
            this._mouseHandler.onWheel(this, event);
        };
        /**
         * Release the mouse grab.
         */
        DataGrid.prototype._releaseMouse = function () {
            // Clear the mousedown flag.
            this._mousedown = false;
            // Relase the mouse handler.
            if (this._mouseHandler) {
                this._mouseHandler.release();
            }
            // Remove the document listeners.
            document.removeEventListener('keydown', this, true);
            document.removeEventListener('mouseup', this, true);
            document.removeEventListener('mousedown', this, true);
            document.removeEventListener('mousemove', this, true);
            document.removeEventListener('contextmenu', this, true);
        };
        /**
         * Refresh the dpi ratio.
         */
        DataGrid.prototype._refreshDPI = function () {
            // Get the best integral value for the dpi ratio.
            var dpiRatio = Math.ceil(window.devicePixelRatio);
            // Bail early if the computed dpi ratio has not changed.
            if (this._dpiRatio === dpiRatio) {
                return;
            }
            // Update the internal dpi ratio.
            this._dpiRatio = dpiRatio;
            // Schedule a repaint of the content.
            this.repaintContent();
            // Schedule a repaint of the overlay.
            this.repaintOverlay();
            // Update the canvas size for the new dpi ratio.
            this._resizeCanvasIfNeeded(this._viewportWidth, this._viewportHeight);
            // Ensure the canvas style is scaled for the new ratio.
            this._canvas.style.width = this._canvas.width / this._dpiRatio + "px";
            this._canvas.style.height = this._canvas.height / this._dpiRatio + "px";
            // Ensure the overlay style is scaled for the new ratio.
            this._overlay.style.width = this._overlay.width / this._dpiRatio + "px";
            this._overlay.style.height = this._overlay.height / this._dpiRatio + "px";
        };
        /**
         * Resize a row section immediately.
         */
        DataGrid.prototype._resizeRow = function (index, size) {
            // Look up the target section list.
            var list = this._rowSections;
            // Bail early if the index is out of range.
            if (index < 0 || index >= list.count) {
                return;
            }
            // Look up the old size of the section.
            var oldSize = list.sizeOf(index);
            // Normalize the new size of the section.
            var newSize = list.clampSize(size);
            // Bail early if the size does not change.
            if (oldSize === newSize) {
                return;
            }
            // Resize the section in the list.
            list.resize(index, newSize);
            // Get the current size of the viewport.
            var vw = this._viewportWidth;
            var vh = this._viewportHeight;
            // If there is nothing to paint, sync the scroll state.
            if (!this._viewport.isVisible || vw === 0 || vh === 0) {
                this._syncScrollState();
                return;
            }
            // Compute the size delta.
            var delta = newSize - oldSize;
            // Look up the column header height.
            var hh = this.headerHeight;
            // Compute the viewport offset of the section.
            var offset = list.offsetOf(index) + hh - this._scrollY;
            // Bail early if there is nothing to paint.
            if (hh >= vh || offset >= vh) {
                this._syncScrollState();
                return;
            }
            // Update the scroll position if the section is not visible.
            if (offset + oldSize <= hh) {
                this._scrollY += delta;
                this._syncScrollState();
                return;
            }
            // Compute the paint origin of the section.
            var pos = Math.max(hh, offset);
            // Paint from the section onward if it spans the viewport.
            if (offset + oldSize >= vh || offset + newSize >= vh) {
                this.paintContent(0, pos, vw, vh - pos);
                this._paintOverlay();
                this._syncScrollState();
                return;
            }
            // Compute the X blit dimensions.
            var sx = 0;
            var sw = vw;
            var dx = 0;
            // Compute the Y blit dimensions.
            var sy;
            var sh;
            var dy;
            if (offset + newSize <= hh) {
                sy = hh - delta;
                sh = vh - sy;
                dy = hh;
            }
            else {
                sy = offset + oldSize;
                sh = vh - sy;
                dy = sy + delta;
            }
            // Blit the valid content to the destination.
            this._blitContent(this._canvas, sx, sy, sw, sh, dx, dy);
            // Repaint the section if needed.
            if (newSize > 0 && offset + newSize > hh) {
                this.paintContent(0, pos, vw, offset + newSize - pos);
            }
            // Paint the trailing space as needed.
            if (this._stretchLastRow && this.pageHeight > this.bodyHeight) {
                var r = this._rowSections.count - 1;
                var y = hh + this._rowSections.offsetOf(r);
                this.paintContent(0, y, vw, vh - y);
            }
            else if (delta < 0) {
                this.paintContent(0, vh + delta, vw, -delta);
            }
            // Paint the overlay.
            this._paintOverlay();
            // Sync the scroll state.
            this._syncScrollState();
        };
        /**
         * Resize a column section immediately.
         */
        DataGrid.prototype._resizeColumn = function (index, size) {
            // Look up the target section list.
            var list = this._columnSections;
            // Bail early if the index is out of range.
            if (index < 0 || index >= list.count) {
                return;
            }
            // Look up the old size of the section.
            var oldSize = list.sizeOf(index);
            // Normalize the new size of the section.
            var newSize = list.clampSize(size);
            // Bail early if the size does not change.
            if (oldSize === newSize) {
                return;
            }
            // Resize the section in the list.
            list.resize(index, newSize);
            // Get the current size of the viewport.
            var vw = this._viewportWidth;
            var vh = this._viewportHeight;
            // If there is nothing to paint, sync the scroll state.
            if (!this._viewport.isVisible || vw === 0 || vh === 0) {
                this._syncScrollState();
                return;
            }
            // Compute the size delta.
            var delta = newSize - oldSize;
            // Look up the row header width.
            var hw = this.headerWidth;
            // Compute the viewport offset of the section.
            var offset = list.offsetOf(index) + hw - this._scrollX;
            // Bail early if there is nothing to paint.
            if (hw >= vw || offset >= vw) {
                this._syncScrollState();
                return;
            }
            // Update the scroll position if the section is not visible.
            if (offset + oldSize <= hw) {
                this._scrollX += delta;
                this._syncScrollState();
                return;
            }
            // Compute the paint origin of the section.
            var pos = Math.max(hw, offset);
            // Paint from the section onward if it spans the viewport.
            if (offset + oldSize >= vw || offset + newSize >= vw) {
                this.paintContent(pos, 0, vw - pos, vh);
                this._paintOverlay();
                this._syncScrollState();
                return;
            }
            // Compute the Y blit dimensions.
            var sy = 0;
            var sh = vh;
            var dy = 0;
            // Compute the X blit dimensions.
            var sx;
            var sw;
            var dx;
            if (offset + newSize <= hw) {
                sx = hw - delta;
                sw = vw - sx;
                dx = hw;
            }
            else {
                sx = offset + oldSize;
                sw = vw - sx;
                dx = sx + delta;
            }
            // Blit the valid content to the destination.
            this._blitContent(this._canvas, sx, sy, sw, sh, dx, dy);
            // Repaint the section if needed.
            if (newSize > 0 && offset + newSize > hw) {
                this.paintContent(pos, 0, offset + newSize - pos, vh);
            }
            // Paint the trailing space as needed.
            if (this._stretchLastColumn && this.pageWidth > this.bodyWidth) {
                var c = this._columnSections.count - 1;
                var x = hw + this._columnSections.offsetOf(c);
                this.paintContent(x, 0, vw - x, vh);
            }
            else if (delta < 0) {
                this.paintContent(vw + delta, 0, -delta, vh);
            }
            // Paint the overlay.
            this._paintOverlay();
            // Sync the scroll state after painting.
            this._syncScrollState();
        };
        /**
         * Resize a row header section immediately.
         */
        DataGrid.prototype._resizeRowHeader = function (index, size) {
            // Look up the target section list.
            var list = this._rowHeaderSections;
            // Bail early if the index is out of range.
            if (index < 0 || index >= list.count) {
                return;
            }
            // Look up the old size of the section.
            var oldSize = list.sizeOf(index);
            // Normalize the new size of the section.
            var newSize = list.clampSize(size);
            // Bail early if the size does not change.
            if (oldSize === newSize) {
                return;
            }
            // Resize the section in the list.
            list.resize(index, newSize);
            // Get the current size of the viewport.
            var vw = this._viewportWidth;
            var vh = this._viewportHeight;
            // If there is nothing to paint, sync the scroll state.
            if (!this._viewport.isVisible || vw === 0 || vh === 0) {
                this._syncScrollState();
                return;
            }
            // Compute the size delta.
            var delta = newSize - oldSize;
            // Look up the offset of the section.
            var offset = list.offsetOf(index);
            // Bail early if the section is fully outside the viewport.
            if (offset >= vw) {
                this._syncScrollState();
                return;
            }
            // Paint the entire tail if the section spans the viewport.
            if (offset + oldSize >= vw || offset + newSize >= vw) {
                this.paintContent(offset, 0, vw - offset, vh);
                this._paintOverlay();
                this._syncScrollState();
                return;
            }
            // Compute the blit content dimensions.
            var sx = offset + oldSize;
            var sy = 0;
            var sw = vw - sx;
            var sh = vh;
            var dx = sx + delta;
            var dy = 0;
            // Blit the valid contents to the destination.
            this._blitContent(this._canvas, sx, sy, sw, sh, dx, dy);
            // Repaint the header section if needed.
            if (newSize > 0) {
                this.paintContent(offset, 0, newSize, vh);
            }
            // Paint the trailing space as needed.
            if (this._stretchLastColumn && this.pageWidth > this.bodyWidth) {
                var c = this._columnSections.count - 1;
                var x = this.headerWidth + this._columnSections.offsetOf(c);
                this.paintContent(x, 0, vw - x, vh);
            }
            else if (delta < 0) {
                this.paintContent(vw + delta, 0, -delta, vh);
            }
            // Paint the overlay.
            this._paintOverlay();
            // Sync the scroll state after painting.
            this._syncScrollState();
        };
        /**
         * Resize a column header section immediately.
         */
        DataGrid.prototype._resizeColumnHeader = function (index, size) {
            // Look up the target section list.
            var list = this._columnHeaderSections;
            // Bail early if the index is out of range.
            if (index < 0 || index >= list.count) {
                return;
            }
            // Look up the old size of the section.
            var oldSize = list.sizeOf(index);
            // Normalize the new size of the section.
            var newSize = list.clampSize(size);
            // Bail early if the size does not change.
            if (oldSize === newSize) {
                return;
            }
            // Resize the section in the list.
            list.resize(index, newSize);
            // Get the current size of the viewport.
            var vw = this._viewportWidth;
            var vh = this._viewportHeight;
            // If there is nothing to paint, sync the scroll state.
            if (!this._viewport.isVisible || vw === 0 || vh === 0) {
                this._syncScrollState();
                return;
            }
            // Paint the overlay.
            this._paintOverlay();
            // Compute the size delta.
            var delta = newSize - oldSize;
            // Look up the offset of the section.
            var offset = list.offsetOf(index);
            // Bail early if the section is fully outside the viewport.
            if (offset >= vh) {
                this._syncScrollState();
                return;
            }
            // Paint the entire tail if the section spans the viewport.
            if (offset + oldSize >= vh || offset + newSize >= vh) {
                this.paintContent(0, offset, vw, vh - offset);
                this._paintOverlay();
                this._syncScrollState();
                return;
            }
            // Compute the blit content dimensions.
            var sx = 0;
            var sy = offset + oldSize;
            var sw = vw;
            var sh = vh - sy;
            var dx = 0;
            var dy = sy + delta;
            // Blit the valid contents to the destination.
            this._blitContent(this._canvas, sx, sy, sw, sh, dx, dy);
            // Repaint the header section if needed.
            if (newSize > 0) {
                this.paintContent(0, offset, vw, newSize);
            }
            // Paint the trailing space as needed.
            if (this._stretchLastRow && this.pageHeight > this.bodyHeight) {
                var r = this._rowSections.count - 1;
                var y = this.headerHeight + this._rowSections.offsetOf(r);
                this.paintContent(0, y, vw, vh - y);
            }
            else if (delta < 0) {
                this.paintContent(0, vh + delta, vw, -delta);
            }
            // Paint the overlay.
            this._paintOverlay();
            // Sync the scroll state after painting.
            this._syncScrollState();
        };
        /**
         * Scroll immediately to the specified offset position.
         */
        DataGrid.prototype._scrollTo = function (x, y) {
            // Floor and clamp the position to the allowable range.
            x = Math.max(0, Math.min(Math.floor(x), this.maxScrollX));
            y = Math.max(0, Math.min(Math.floor(y), this.maxScrollY));
            // Synchronize the scroll bar values.
            this._hScrollBar.value = x;
            this._vScrollBar.value = y;
            // Compute the delta scroll amount.
            var dx = x - this._scrollX;
            var dy = y - this._scrollY;
            // Bail early if there is no effective scroll.
            if (dx === 0 && dy === 0) {
                return;
            }
            // Bail early if the viewport is not visible.
            if (!this._viewport.isVisible) {
                this._scrollX = x;
                this._scrollY = y;
                return;
            }
            // Get the current size of the viewport.
            var width = this._viewportWidth;
            var height = this._viewportHeight;
            // Bail early if the viewport is empty.
            if (width === 0 || height === 0) {
                this._scrollX = x;
                this._scrollY = y;
                return;
            }
            // Get the visible content origin.
            var contentX = this.headerWidth;
            var contentY = this.headerHeight;
            // Get the visible content dimensions.
            var contentWidth = width - contentX;
            var contentHeight = height - contentY;
            // Bail early if there is no content to draw.
            if (contentWidth <= 0 && contentHeight <= 0) {
                this._scrollX = x;
                this._scrollY = y;
                return;
            }
            // Compute the area which needs painting for the `dx` scroll.
            var dxArea = 0;
            if (dx !== 0 && contentWidth > 0) {
                if (Math.abs(dx) >= contentWidth) {
                    dxArea = contentWidth * height;
                }
                else {
                    dxArea = Math.abs(dx) * height;
                }
            }
            // Compute the area which needs painting for the `dy` scroll.
            var dyArea = 0;
            if (dy !== 0 && contentHeight > 0) {
                if (Math.abs(dy) >= contentHeight) {
                    dyArea = width * contentHeight;
                }
                else {
                    dyArea = width * Math.abs(dy);
                }
            }
            // If the area sum is larger than the total, paint everything.
            if ((dxArea + dyArea) >= (width * height)) {
                this._scrollX = x;
                this._scrollY = y;
                this.paintContent(0, 0, width, height);
                this._paintOverlay();
                return;
            }
            // Update the internal Y scroll position.
            this._scrollY = y;
            // Scroll the Y axis if needed. If the scroll distance exceeds
            // the visible height, paint everything. Otherwise, blit the
            // valid content and paint the dirty region.
            if (dy !== 0 && contentHeight > 0) {
                if (Math.abs(dy) >= contentHeight) {
                    this.paintContent(0, contentY, width, contentHeight);
                }
                else {
                    var x_5 = 0;
                    var y_5 = dy < 0 ? contentY : contentY + dy;
                    var w = width;
                    var h = contentHeight - Math.abs(dy);
                    this._blitContent(this._canvas, x_5, y_5, w, h, x_5, y_5 - dy);
                    this.paintContent(0, dy < 0 ? contentY : height - dy, width, Math.abs(dy));
                }
            }
            // Update the internal X scroll position.
            this._scrollX = x;
            // Scroll the X axis if needed. If the scroll distance exceeds
            // the visible width, paint everything. Otherwise, blit the
            // valid content and paint the dirty region.
            if (dx !== 0 && contentWidth > 0) {
                if (Math.abs(dx) >= contentWidth) {
                    this.paintContent(contentX, 0, contentWidth, height);
                }
                else {
                    var x_6 = dx < 0 ? contentX : contentX + dx;
                    var y_6 = 0;
                    var w = contentWidth - Math.abs(dx);
                    var h = height;
                    this._blitContent(this._canvas, x_6, y_6, w, h, x_6 - dx, y_6);
                    this.paintContent(dx < 0 ? contentX : width - dx, 0, Math.abs(dx), height);
                }
            }
            // Paint the overlay.
            this._paintOverlay();
        };
        /**
         * Blit content into the on-screen grid canvas.
         *
         * The rect should be expressed in viewport coordinates.
         *
         * This automatically accounts for the dpi ratio.
         */
        DataGrid.prototype._blitContent = function (source, x, y, w, h, dx, dy) {
            // Scale the blit coordinates by the dpi ratio.
            x *= this._dpiRatio;
            y *= this._dpiRatio;
            w *= this._dpiRatio;
            h *= this._dpiRatio;
            dx *= this._dpiRatio;
            dy *= this._dpiRatio;
            // Save the current gc state.
            this._canvasGC.save();
            // Set the transform to the identity matrix.
            this._canvasGC.setTransform(1, 0, 0, 1, 0, 0);
            // Draw the specified content.
            this._canvasGC.drawImage(source, x, y, w, h, dx, dy, w, h);
            // Restore the gc state.
            this._canvasGC.restore();
        };
        /**
         * Paint the grid content for the given dirty rect.
         *
         * The rect should be expressed in valid viewport coordinates.
         *
         * This is the primary paint entry point. The individual `_draw*`
         * methods should not be invoked directly. This method dispatches
         * to the drawing methods in the correct order.
         */
        DataGrid.prototype.paintContent = function (rx, ry, rw, rh) {
            // Scale the canvas and buffer GC for the dpi ratio.
            this._canvasGC.setTransform(this._dpiRatio, 0, 0, this._dpiRatio, 0, 0);
            this._bufferGC.setTransform(this._dpiRatio, 0, 0, this._dpiRatio, 0, 0);
            // Clear the dirty rect of all content.
            this._canvasGC.clearRect(rx, ry, rw, rh);
            // Draw the void region.
            this._drawVoidRegion(rx, ry, rw, rh);
            // Draw the body region.
            this._drawBodyRegion(rx, ry, rw, rh);
            // Draw the row header region.
            this._drawRowHeaderRegion(rx, ry, rw, rh);
            // Draw the column header region.
            this._drawColumnHeaderRegion(rx, ry, rw, rh);
            // Draw the corner header region.
            this.drawCornerHeaderRegion(rx, ry, rw, rh);
        };
        /**
         * Paint the overlay content for the entire grid.
         *
         * This is the primary overlay paint entry point. The individual
         * `_draw*` methods should not be invoked directly. This method
         * dispatches to the drawing methods in the correct order.
         */
        DataGrid.prototype._paintOverlay = function () {
            // Scale the overlay GC for the dpi ratio.
            this._overlayGC.setTransform(this._dpiRatio, 0, 0, this._dpiRatio, 0, 0);
            // Clear the overlay of all content.
            this._overlayGC.clearRect(0, 0, this._overlay.width, this._overlay.height);
            // Draw the body selections.
            this._drawBodySelections();
            // Draw the row header selections.
            this._drawRowHeaderSelections();
            // Draw the column header selections.
            this._drawColumnHeaderSelections();
            // Draw the cursor.
            this._drawCursor();
            // Draw the shadows.
            this._drawShadows();
        };
        /**
         * Draw the void region for the dirty rect.
         */
        DataGrid.prototype._drawVoidRegion = function (rx, ry, rw, rh) {
            // Look up the void color.
            var color = this._style.voidColor;
            // Bail if there is no void color.
            if (!color) {
                return;
            }
            // Fill the dirty rect with the void color.
            this._canvasGC.fillStyle = color;
            this._canvasGC.fillRect(rx, ry, rw, rh);
        };
        /**
         * Draw the body region which intersects the dirty rect.
         */
        DataGrid.prototype._drawBodyRegion = function (rx, ry, rw, rh) {
            // Get the visible content dimensions.
            var contentW = this._columnSections.length - this._scrollX;
            var contentH = this._rowSections.length - this._scrollY;
            // Bail if there is no content to draw.
            if (contentW <= 0 || contentH <= 0) {
                return;
            }
            // Get the visible content origin.
            var contentX = this.headerWidth;
            var contentY = this.headerHeight;
            // Bail if the dirty rect does not intersect the content area.
            if (rx + rw <= contentX) {
                return;
            }
            if (ry + rh <= contentY) {
                return;
            }
            if (rx >= contentX + contentW) {
                return;
            }
            if (ry >= contentY + contentH) {
                return;
            }
            // Fetch the geometry.
            var bh = this.bodyHeight;
            var bw = this.bodyWidth;
            var ph = this.pageHeight;
            var pw = this.pageWidth;
            // Get the upper and lower bounds of the dirty content area.
            var x1 = Math.max(rx, contentX);
            var y1 = Math.max(ry, contentY);
            var x2 = Math.min(rx + rw - 1, contentX + contentW - 1);
            var y2 = Math.min(ry + rh - 1, contentY + contentH - 1);
            // Convert the dirty content bounds into cell bounds.
            var r1 = this._rowSections.indexOf(y1 - contentY + this._scrollY);
            var c1 = this._columnSections.indexOf(x1 - contentX + this._scrollX);
            var r2 = this._rowSections.indexOf(y2 - contentY + this._scrollY);
            var c2 = this._columnSections.indexOf(x2 - contentX + this._scrollX);
            // Fetch the max row and column.
            var maxRow = this._rowSections.count - 1;
            var maxColumn = this._columnSections.count - 1;
            // Handle a dirty content area larger than the cell count.
            if (r2 < 0) {
                r2 = maxRow;
            }
            if (c2 < 0) {
                c2 = maxColumn;
            }
            // Convert the cell bounds back to visible coordinates.
            var x = this._columnSections.offsetOf(c1) + contentX - this._scrollX;
            var y = this._rowSections.offsetOf(r1) + contentY - this._scrollY;
            // Set up the paint region size variables.
            var width = 0;
            var height = 0;
            // Allocate the section sizes arrays.
            var rowSizes = new Array(r2 - r1 + 1);
            var columnSizes = new Array(c2 - c1 + 1);
            // Get the row sizes for the region.
            for (var j = r1; j <= r2; ++j) {
                var size = this._rowSections.sizeOf(j);
                rowSizes[j - r1] = size;
                height += size;
            }
            // Get the column sizes for the region.
            for (var i = c1; i <= c2; ++i) {
                var size = this._columnSections.sizeOf(i);
                columnSizes[i - c1] = size;
                width += size;
            }
            // Adjust the geometry if the last row is streched.
            if (this._stretchLastRow && ph > bh && r2 === maxRow) {
                var dh = this.pageHeight - this.bodyHeight;
                rowSizes[rowSizes.length - 1] += dh;
                height += dh;
                y2 += dh;
            }
            // Adjust the geometry if the last column is streched.
            if (this._stretchLastColumn && pw > bw && c2 === maxColumn) {
                var dw = this.pageWidth - this.bodyWidth;
                columnSizes[columnSizes.length - 1] += dw;
                width += dw;
                x2 += dw;
            }
            // Create the paint region object.
            var rgn = {
                region: 'body',
                xMin: x1, yMin: y1,
                xMax: x2, yMax: y2,
                x: x, y: y, width: width, height: height,
                row: r1, column: c1,
                rowSizes: rowSizes, columnSizes: columnSizes
            };
            // Draw the background.
            this._drawBackground(rgn, this._style.backgroundColor);
            // Draw the row background.
            this._drawRowBackground(rgn, this._style.rowBackgroundColor);
            // Draw the column background.
            this._drawColumnBackground(rgn, this._style.columnBackgroundColor);
            // Draw the cell content for the paint region.
            this._drawCells(rgn);
            // Draw the horizontal grid lines.
            this._drawHorizontalGridLines(rgn, this._style.horizontalGridLineColor ||
                this._style.gridLineColor);
            // Draw the vertical grid lines.
            this._drawVerticalGridLines(rgn, this._style.verticalGridLineColor ||
                this._style.gridLineColor);
        };
        /**
         * Draw the row header region which intersects the dirty rect.
         */
        DataGrid.prototype._drawRowHeaderRegion = function (rx, ry, rw, rh) {
            // Get the visible content dimensions.
            var contentW = this.headerWidth;
            var contentH = this.bodyHeight - this._scrollY;
            // Bail if there is no content to draw.
            if (contentW <= 0 || contentH <= 0) {
                return;
            }
            // Get the visible content origin.
            var contentX = 0;
            var contentY = this.headerHeight;
            // Bail if the dirty rect does not intersect the content area.
            if (rx + rw <= contentX) {
                return;
            }
            if (ry + rh <= contentY) {
                return;
            }
            if (rx >= contentX + contentW) {
                return;
            }
            if (ry >= contentY + contentH) {
                return;
            }
            // Fetch the geometry.
            var bh = this.bodyHeight;
            var ph = this.pageHeight;
            // Get the upper and lower bounds of the dirty content area.
            var x1 = rx;
            var y1 = Math.max(ry, contentY);
            var x2 = Math.min(rx + rw - 1, contentX + contentW - 1);
            var y2 = Math.min(ry + rh - 1, contentY + contentH - 1);
            // Convert the dirty content bounds into cell bounds.
            var r1 = this._rowSections.indexOf(y1 - contentY + this._scrollY);
            var c1 = this._rowHeaderSections.indexOf(x1);
            var r2 = this._rowSections.indexOf(y2 - contentY + this._scrollY);
            var c2 = this._rowHeaderSections.indexOf(x2);
            // Fetch max row and column.
            var maxRow = this._rowSections.count - 1;
            var maxColumn = this._rowHeaderSections.count - 1;
            // Handle a dirty content area larger than the cell count.
            if (r2 < 0) {
                r2 = maxRow;
            }
            if (c2 < 0) {
                c2 = maxColumn;
            }
            // Convert the cell bounds back to visible coordinates.
            var x = this._rowHeaderSections.offsetOf(c1);
            var y = this._rowSections.offsetOf(r1) + contentY - this._scrollY;
            // Set up the paint region size variables.
            var width = 0;
            var height = 0;
            // Allocate the section sizes arrays.
            var rowSizes = new Array(r2 - r1 + 1);
            var columnSizes = new Array(c2 - c1 + 1);
            // Get the row sizes for the region.
            for (var j = r1; j <= r2; ++j) {
                var size = this._rowSections.sizeOf(j);
                rowSizes[j - r1] = size;
                height += size;
            }
            // Get the column sizes for the region.
            for (var i = c1; i <= c2; ++i) {
                var size = this._rowHeaderSections.sizeOf(i);
                columnSizes[i - c1] = size;
                width += size;
            }
            // Adjust the geometry if the last row is stretched.
            if (this._stretchLastRow && ph > bh && r2 === maxRow) {
                var dh = this.pageHeight - this.bodyHeight;
                rowSizes[rowSizes.length - 1] += dh;
                height += dh;
                y2 += dh;
            }
            // Create the paint region object.
            var rgn = {
                region: 'row-header',
                xMin: x1, yMin: y1,
                xMax: x2, yMax: y2,
                x: x, y: y, width: width, height: height,
                row: r1, column: c1,
                rowSizes: rowSizes, columnSizes: columnSizes
            };
            // Draw the background.
            this._drawBackground(rgn, this._style.headerBackgroundColor);
            // Draw the cell content for the paint region.
            this._drawCells(rgn);
            // Draw the horizontal grid lines.
            this._drawHorizontalGridLines(rgn, this._style.headerHorizontalGridLineColor ||
                this._style.headerGridLineColor);
            // Draw the vertical grid lines.
            this._drawVerticalGridLines(rgn, this._style.headerVerticalGridLineColor ||
                this._style.headerGridLineColor);
        };
        /**
         * Draw the column header region which intersects the dirty rect.
         */
        DataGrid.prototype._drawColumnHeaderRegion = function (rx, ry, rw, rh) {
            // Get the visible content dimensions.
            var contentW = this.bodyWidth - this._scrollX;
            var contentH = this.headerHeight;
            // Bail if there is no content to draw.
            if (contentW <= 0 || contentH <= 0) {
                return;
            }
            // Get the visible content origin.
            var contentX = this.headerWidth;
            var contentY = 0;
            // Bail if the dirty rect does not intersect the content area.
            if (rx + rw <= contentX) {
                return;
            }
            if (ry + rh <= contentY) {
                return;
            }
            if (rx >= contentX + contentW) {
                return;
            }
            if (ry >= contentY + contentH) {
                return;
            }
            // Fetch the geometry.
            var bw = this.bodyWidth;
            var pw = this.pageWidth;
            // Get the upper and lower bounds of the dirty content area.
            var x1 = Math.max(rx, contentX);
            var y1 = ry;
            var x2 = Math.min(rx + rw - 1, contentX + contentW - 1);
            var y2 = Math.min(ry + rh - 1, contentY + contentH - 1);
            // Convert the dirty content bounds into cell bounds.
            var r1 = this._columnHeaderSections.indexOf(y1);
            var c1 = this._columnSections.indexOf(x1 - contentX + this._scrollX);
            var r2 = this._columnHeaderSections.indexOf(y2);
            var c2 = this._columnSections.indexOf(x2 - contentX + this._scrollX);
            // Fetch the max row and column.
            var maxRow = this._columnHeaderSections.count - 1;
            var maxColumn = this._columnSections.count - 1;
            // Handle a dirty content area larger than the cell count.
            if (r2 < 0) {
                r2 = maxRow;
            }
            if (c2 < 0) {
                c2 = maxColumn;
            }
            // Convert the cell bounds back to visible coordinates.
            var x = this._columnSections.offsetOf(c1) + contentX - this._scrollX;
            var y = this._columnHeaderSections.offsetOf(r1);
            // Set up the paint region size variables.
            var width = 0;
            var height = 0;
            // Allocate the section sizes arrays.
            var rowSizes = new Array(r2 - r1 + 1);
            var columnSizes = new Array(c2 - c1 + 1);
            // Get the row sizes for the region.
            for (var j = r1; j <= r2; ++j) {
                var size = this._columnHeaderSections.sizeOf(j);
                rowSizes[j - r1] = size;
                height += size;
            }
            // Get the column sizes for the region.
            for (var i = c1; i <= c2; ++i) {
                var size = this._columnSections.sizeOf(i);
                columnSizes[i - c1] = size;
                width += size;
            }
            // Adjust the geometry if the last column is stretched.
            if (this._stretchLastColumn && pw > bw && c2 === maxColumn) {
                var dw = this.pageWidth - this.bodyWidth;
                columnSizes[columnSizes.length - 1] += dw;
                width += dw;
                x2 += dw;
            }
            // Create the paint region object.
            var rgn = {
                region: 'column-header',
                xMin: x1, yMin: y1,
                xMax: x2, yMax: y2,
                x: x, y: y, width: width, height: height,
                row: r1, column: c1,
                rowSizes: rowSizes, columnSizes: columnSizes
            };
            // Draw the background.
            this._drawBackground(rgn, this._style.headerBackgroundColor);
            // Draw the cell content for the paint region.
            this._drawCells(rgn);
            // Draw the horizontal grid lines.
            this._drawHorizontalGridLines(rgn, this._style.headerHorizontalGridLineColor ||
                this._style.headerGridLineColor);
            // Draw the vertical grid lines.
            this._drawVerticalGridLines(rgn, this._style.headerVerticalGridLineColor ||
                this._style.headerGridLineColor);
        };
        /**
         * Draw the corner header region which intersects the dirty rect.
         */
        DataGrid.prototype.drawCornerHeaderRegion = function (rx, ry, rw, rh) {
            // Get the visible content dimensions.
            var contentW = this.headerWidth;
            var contentH = this.headerHeight;
            // Bail if there is no content to draw.
            if (contentW <= 0 || contentH <= 0) {
                return;
            }
            // Get the visible content origin.
            var contentX = 0;
            var contentY = 0;
            // Bail if the dirty rect does not intersect the content area.
            if (rx + rw <= contentX) {
                return;
            }
            if (ry + rh <= contentY) {
                return;
            }
            if (rx >= contentX + contentW) {
                return;
            }
            if (ry >= contentY + contentH) {
                return;
            }
            // Get the upper and lower bounds of the dirty content area.
            var x1 = rx;
            var y1 = ry;
            var x2 = Math.min(rx + rw - 1, contentX + contentW - 1);
            var y2 = Math.min(ry + rh - 1, contentY + contentH - 1);
            // Convert the dirty content bounds into cell bounds.
            var r1 = this._columnHeaderSections.indexOf(y1);
            var c1 = this._rowHeaderSections.indexOf(x1);
            var r2 = this._columnHeaderSections.indexOf(y2);
            var c2 = this._rowHeaderSections.indexOf(x2);
            // Handle a dirty content area larger than the cell count.
            if (r2 < 0) {
                r2 = this._columnHeaderSections.count - 1;
            }
            if (c2 < 0) {
                c2 = this._rowHeaderSections.count - 1;
            }
            // Convert the cell bounds back to visible coordinates.
            var x = this._rowHeaderSections.offsetOf(c1);
            var y = this._columnHeaderSections.offsetOf(r1);
            // Set up the paint region size variables.
            var width = 0;
            var height = 0;
            // Allocate the section sizes arrays.
            var rowSizes = new Array(r2 - r1 + 1);
            var columnSizes = new Array(c2 - c1 + 1);
            // Get the row sizes for the region.
            for (var j = r1; j <= r2; ++j) {
                var size = this._columnHeaderSections.sizeOf(j);
                rowSizes[j - r1] = size;
                height += size;
            }
            // Get the column sizes for the region.
            for (var i = c1; i <= c2; ++i) {
                var size = this._rowHeaderSections.sizeOf(i);
                columnSizes[i - c1] = size;
                width += size;
            }
            // Create the paint region object.
            var rgn = {
                region: 'corner-header',
                xMin: x1, yMin: y1,
                xMax: x2, yMax: y2,
                x: x, y: y, width: width, height: height,
                row: r1, column: c1,
                rowSizes: rowSizes, columnSizes: columnSizes
            };
            // Draw the background.
            this._drawBackground(rgn, this._style.headerBackgroundColor);
            // Draw the cell content for the paint region.
            this._drawCells(rgn);
            // Draw the horizontal grid lines.
            this._drawHorizontalGridLines(rgn, this._style.headerHorizontalGridLineColor ||
                this._style.headerGridLineColor);
            // Draw the vertical grid lines.
            this._drawVerticalGridLines(rgn, this._style.headerVerticalGridLineColor ||
                this._style.headerGridLineColor);
        };
        /**
         * Draw the background for the given paint region.
         */
        DataGrid.prototype._drawBackground = function (rgn, color) {
            // Bail if there is no color to draw.
            if (!color) {
                return;
            }
            // Unpack the region.
            var xMin = rgn.xMin, yMin = rgn.yMin, xMax = rgn.xMax, yMax = rgn.yMax;
            // Fill the region with the specified color.
            this._canvasGC.fillStyle = color;
            this._canvasGC.fillRect(xMin, yMin, xMax - xMin + 1, yMax - yMin + 1);
        };
        /**
         * Draw the row background for the given paint region.
         */
        DataGrid.prototype._drawRowBackground = function (rgn, colorFn) {
            // Bail if there is no color function.
            if (!colorFn) {
                return;
            }
            // Compute the X bounds for the row.
            var x1 = Math.max(rgn.xMin, rgn.x);
            var x2 = Math.min(rgn.x + rgn.width - 1, rgn.xMax);
            // Draw the background for the rows in the region.
            for (var y = rgn.y, j = 0, n = rgn.rowSizes.length; j < n; ++j) {
                // Fetch the size of the row.
                var size = rgn.rowSizes[j];
                // Skip zero sized rows.
                if (size === 0) {
                    continue;
                }
                // Get the background color for the row.
                var color = colorFn(rgn.row + j);
                // Fill the row with the background color if needed.
                if (color) {
                    var y1 = Math.max(rgn.yMin, y);
                    var y2 = Math.min(y + size - 1, rgn.yMax);
                    this._canvasGC.fillStyle = color;
                    this._canvasGC.fillRect(x1, y1, x2 - x1 + 1, y2 - y1 + 1);
                }
                // Increment the running Y coordinate.
                y += size;
            }
        };
        /**
         * Draw the column background for the given paint region.
         */
        DataGrid.prototype._drawColumnBackground = function (rgn, colorFn) {
            // Bail if there is no color function.
            if (!colorFn) {
                return;
            }
            // Compute the Y bounds for the column.
            var y1 = Math.max(rgn.yMin, rgn.y);
            var y2 = Math.min(rgn.y + rgn.height - 1, rgn.yMax);
            // Draw the background for the columns in the region.
            for (var x = rgn.x, i = 0, n = rgn.columnSizes.length; i < n; ++i) {
                // Fetch the size of the column.
                var size = rgn.columnSizes[i];
                // Skip zero sized columns.
                if (size === 0) {
                    continue;
                }
                // Get the background color for the column.
                var color = colorFn(rgn.column + i);
                // Fill the column with the background color if needed.
                if (color) {
                    var x1 = Math.max(rgn.xMin, x);
                    var x2 = Math.min(x + size - 1, rgn.xMax);
                    this._canvasGC.fillStyle = color;
                    this._canvasGC.fillRect(x1, y1, x2 - x1 + 1, y2 - y1 + 1);
                }
                // Increment the running X coordinate.
                x += size;
            }
        };
        /**
         * Draw the cells for the given paint region.
         */
        DataGrid.prototype._drawCells = function (rgn) {
            // Bail if there is no data model.
            if (!this._dataModel) {
                return;
            }
            // Set up the cell config object for rendering.
            var config = {
                x: 0, y: 0, width: 0, height: 0,
                region: rgn.region, row: 0, column: 0,
                value: null, metadata: exports.DataModel.emptyMetadata
            };
            // Save the buffer gc before wrapping.
            this._bufferGC.save();
            // Wrap the buffer gc for painting the cells.
            var gc = new GraphicsContext(this._bufferGC);
            // Compute the actual Y bounds for the cell range.
            var y1 = Math.max(rgn.yMin, rgn.y);
            var y2 = Math.min(rgn.y + rgn.height - 1, rgn.yMax);
            // Loop over the columns in the region.
            for (var x = rgn.x, i = 0, n = rgn.columnSizes.length; i < n; ++i) {
                // Fetch the size of the column.
                var width = rgn.columnSizes[i];
                // Skip zero sized columns.
                if (width === 0) {
                    continue;
                }
                // Compute the column index.
                var column = rgn.column + i;
                // Update the config for the current column.
                config.x = x;
                config.width = width;
                config.column = column;
                // Clear the buffer rect for the column.
                gc.clearRect(x, rgn.y, width, rgn.height);
                // Save the GC state.
                gc.save();
                // Loop over the rows in the column.
                for (var y = rgn.y, j = 0, n_1 = rgn.rowSizes.length; j < n_1; ++j) {
                    // Fetch the size of the row.
                    var height = rgn.rowSizes[j];
                    // Skip zero sized rows.
                    if (height === 0) {
                        continue;
                    }
                    // Compute the row index.
                    var row = rgn.row + j;
                    // Get the value for the cell.
                    var value = void 0;
                    try {
                        value = this._dataModel.data(rgn.region, row, column);
                    }
                    catch (err) {
                        value = undefined;
                        console.error(err);
                    }
                    // Get the metadata for the cell.
                    var metadata = void 0;
                    try {
                        metadata = this._dataModel.metadata(rgn.region, row, column);
                    }
                    catch (err) {
                        metadata = exports.DataModel.emptyMetadata;
                        console.error(err);
                    }
                    // Update the config for the current cell.
                    config.y = y;
                    config.height = height;
                    config.row = row;
                    config.value = value;
                    config.metadata = metadata;
                    // Get the renderer for the cell.
                    var renderer = this._cellRenderers.get(config);
                    // Save the GC state.
                    gc.save();
                    // Paint the cell into the off-screen buffer.
                    try {
                        renderer.paint(gc, config);
                    }
                    catch (err) {
                        console.error(err);
                    }
                    // Restore the GC state.
                    gc.restore();
                    // Increment the running Y coordinate.
                    y += height;
                }
                // Restore the GC state.
                gc.restore();
                // Compute the actual X bounds for the column.
                var x1 = Math.max(rgn.xMin, x);
                var x2 = Math.min(x + width - 1, rgn.xMax);
                // Blit the off-screen buffer column into the on-screen canvas.
                //
                // This is *much* faster than drawing directly into the on-screen
                // canvas with a clip rect on the column. Managed column clipping
                // is required to prevent cell renderers from needing to set up a
                // clip rect for handling horizontal overflow text (slow!).
                this._blitContent(this._buffer, x1, y1, x2 - x1 + 1, y2 - y1 + 1, x1, y1);
                // Increment the running X coordinate.
                x += width;
            }
            // Dispose of the wrapped gc.
            gc.dispose();
            // Restore the final buffer gc state.
            this._bufferGC.restore();
        };
        /**
         * Draw the horizontal grid lines for the given paint region.
         */
        DataGrid.prototype._drawHorizontalGridLines = function (rgn, color) {
            // Bail if there is no color to draw.
            if (!color) {
                return;
            }
            // Compute the X bounds for the horizontal lines.
            var x1 = Math.max(rgn.xMin, rgn.x);
            var x2 = Math.min(rgn.x + rgn.width, rgn.xMax + 1);
            // Begin the path for the grid lines.
            this._canvasGC.beginPath();
            // Set the line width for the grid lines.
            this._canvasGC.lineWidth = 1;
            // Fetch the geometry.
            var bh = this.bodyHeight;
            var ph = this.pageHeight;
            // Fetch the number of grid lines to be drawn.
            var n = rgn.rowSizes.length;
            // Adjust the count down if the last line shouldn't be drawn.
            if (this._stretchLastRow && ph > bh) {
                if (rgn.row + n === this._rowSections.count) {
                    n -= 1;
                }
            }
            // Draw the horizontal grid lines.
            for (var y = rgn.y, j = 0; j < n; ++j) {
                // Fetch the size of the row.
                var size = rgn.rowSizes[j];
                // Skip zero sized rows.
                if (size === 0) {
                    continue;
                }
                // Compute the Y position of the line.
                var pos = y + size - 1;
                // Draw the line if it's in range of the dirty rect.
                if (pos >= rgn.yMin && pos <= rgn.yMax) {
                    this._canvasGC.moveTo(x1, pos + 0.5);
                    this._canvasGC.lineTo(x2, pos + 0.5);
                }
                // Increment the running Y coordinate.
                y += size;
            }
            // Stroke the lines with the specified color.
            this._canvasGC.strokeStyle = color;
            this._canvasGC.stroke();
        };
        /**
         * Draw the vertical grid lines for the given paint region.
         */
        DataGrid.prototype._drawVerticalGridLines = function (rgn, color) {
            // Bail if there is no color to draw.
            if (!color) {
                return;
            }
            // Compute the Y bounds for the vertical lines.
            var y1 = Math.max(rgn.yMin, rgn.y);
            var y2 = Math.min(rgn.y + rgn.height, rgn.yMax + 1);
            // Begin the path for the grid lines
            this._canvasGC.beginPath();
            // Set the line width for the grid lines.
            this._canvasGC.lineWidth = 1;
            // Fetch the geometry.
            var bw = this.bodyWidth;
            var pw = this.pageWidth;
            // Fetch the number of grid lines to be drawn.
            var n = rgn.columnSizes.length;
            // Adjust the count down if the last line shouldn't be drawn.
            if (this._stretchLastColumn && pw > bw) {
                if (rgn.column + n === this._columnSections.count) {
                    n -= 1;
                }
            }
            // Draw the vertical grid lines.
            for (var x = rgn.x, i = 0; i < n; ++i) {
                // Fetch the size of the column.
                var size = rgn.columnSizes[i];
                // Skip zero sized columns.
                if (size === 0) {
                    continue;
                }
                // Compute the X position of the line.
                var pos = x + size - 1;
                // Draw the line if it's in range of the dirty rect.
                if (pos >= rgn.xMin && pos <= rgn.xMax) {
                    this._canvasGC.moveTo(pos + 0.5, y1);
                    this._canvasGC.lineTo(pos + 0.5, y2);
                }
                // Increment the running X coordinate.
                x += size;
            }
            // Stroke the lines with the specified color.
            this._canvasGC.strokeStyle = color;
            this._canvasGC.stroke();
        };
        /**
         * Draw the body selections for the data grid.
         */
        DataGrid.prototype._drawBodySelections = function () {
            // Fetch the selection model.
            var model = this._selectionModel;
            // Bail early if there are no selections.
            if (!model || model.isEmpty) {
                return;
            }
            // Fetch the selection colors.
            var fill = this._style.selectionFillColor;
            var stroke = this._style.selectionBorderColor;
            // Bail early if there is nothing to draw.
            if (!fill && !stroke) {
                return;
            }
            // Fetch the scroll geometry.
            var sx = this._scrollX;
            var sy = this._scrollY;
            // Get the first visible cell of the grid.
            var r1 = this._rowSections.indexOf(sy);
            var c1 = this._columnSections.indexOf(sx);
            // Bail early if there are no visible cells.
            if (r1 < 0 || c1 < 0) {
                return;
            }
            // Fetch the extra geometry.
            var bw = this.bodyWidth;
            var bh = this.bodyHeight;
            var pw = this.pageWidth;
            var ph = this.pageHeight;
            var hw = this.headerWidth;
            var hh = this.headerHeight;
            // Get the last visible cell of the grid.
            var r2 = this._rowSections.indexOf(sy + ph);
            var c2 = this._columnSections.indexOf(sx + pw);
            // Fetch the max row and column.
            var maxRow = this._rowSections.count - 1;
            var maxColumn = this._columnSections.count - 1;
            // Clamp the last cell if the void space is visible.
            r2 = r2 < 0 ? maxRow : r2;
            c2 = c2 < 0 ? maxColumn : c2;
            // Fetch the overlay gc.
            var gc = this._overlayGC;
            // Save the gc state.
            gc.save();
            // Set up the body clipping rect.
            gc.beginPath();
            gc.rect(hw, hh, pw, ph);
            gc.clip();
            // Set up the gc style.
            if (fill) {
                gc.fillStyle = fill;
            }
            if (stroke) {
                gc.strokeStyle = stroke;
                gc.lineWidth = 1;
            }
            // Iterate over the selections.
            var it = model.selections();
            var s;
            while ((s = it.next()) !== undefined) {
                // Skip the section if it's not visible.
                if (s.r1 < r1 && s.r2 < r1) {
                    continue;
                }
                if (s.r1 > r2 && s.r2 > r2) {
                    continue;
                }
                if (s.c1 < c1 && s.c2 < c1) {
                    continue;
                }
                if (s.c1 > c2 && s.c2 > c2) {
                    continue;
                }
                // Clamp the cell to the model bounds.
                var sr1 = Math.max(0, Math.min(s.r1, maxRow));
                var sc1 = Math.max(0, Math.min(s.c1, maxColumn));
                var sr2 = Math.max(0, Math.min(s.r2, maxRow));
                var sc2 = Math.max(0, Math.min(s.c2, maxColumn));
                // Swap index order if needed.
                var tmp = void 0;
                if (sr1 > sr2) {
                    tmp = sr1;
                    sr1 = sr2;
                    sr2 = tmp;
                }
                if (sc1 > sc2) {
                    tmp = sc1;
                    sc1 = sc2;
                    sc2 = tmp;
                }
                // Convert to pixel coordinates.
                var x1 = this._columnSections.offsetOf(sc1) - sx + hw;
                var y1 = this._rowSections.offsetOf(sr1) - sy + hh;
                var x2 = this._columnSections.extentOf(sc2) - sx + hw;
                var y2 = this._rowSections.extentOf(sr2) - sy + hh;
                // Adjust the trailing X coordinate for column stretch.
                if (this._stretchLastColumn && pw > bw && sc2 === maxColumn) {
                    x2 = hw + pw - 1;
                }
                // Adjust the trailing Y coordinate for row stretch.
                if (this._stretchLastRow && ph > bh && sr2 === maxRow) {
                    y2 = hh + ph - 1;
                }
                // Clamp the bounds to just outside of the clipping rect.
                x1 = Math.max(hw - 1, x1);
                y1 = Math.max(hh - 1, y1);
                x2 = Math.min(hw + pw + 1, x2);
                y2 = Math.min(hh + ph + 1, y2);
                // Skip zero sized ranges.
                if (x2 < x1 || y2 < y1) {
                    continue;
                }
                // Fill the rect if needed.
                if (fill) {
                    gc.fillRect(x1, y1, x2 - x1 + 1, y2 - y1 + 1);
                }
                // Stroke the rect if needed.
                if (stroke) {
                    gc.strokeRect(x1 - .5, y1 - .5, x2 - x1 + 1, y2 - y1 + 1);
                }
            }
            // Restore the gc state.
            gc.restore();
        };
        /**
         * Draw the row header selections for the data grid.
         */
        DataGrid.prototype._drawRowHeaderSelections = function () {
            // Fetch the selection model.
            var model = this._selectionModel;
            // Bail early if there are no selections or if the selectionMode is the entire column.
            if (!model || model.isEmpty || model.selectionMode == 'column') {
                return;
            }
            // Bail early if the row headers are not visible.
            if (this.headerWidth === 0 || this.pageHeight === 0) {
                return;
            }
            // Fetch the selection colors.
            var fill = this._style.headerSelectionFillColor;
            var stroke = this._style.headerSelectionBorderColor;
            // Bail early if there is nothing to draw.
            if (!fill && !stroke) {
                return;
            }
            // Fetch common geometry.
            var sy = this._scrollY;
            var bh = this.bodyHeight;
            var ph = this.pageHeight;
            var hw = this.headerWidth;
            var hh = this.headerHeight;
            var rs = this._rowSections;
            // Fetch the overlay gc.
            var gc = this._overlayGC;
            // Save the gc state.
            gc.save();
            // Set up the header clipping rect.
            gc.beginPath();
            gc.rect(0, hh, hw, ph);
            gc.clip();
            // Set up the gc style.
            if (fill) {
                gc.fillStyle = fill;
            }
            if (stroke) {
                gc.strokeStyle = stroke;
                gc.lineWidth = 1;
            }
            // Fetch the max row.
            var maxRow = rs.count - 1;
            // Fetch the visible rows.
            var r1 = rs.indexOf(sy);
            var r2 = rs.indexOf(sy + ph - 1);
            r2 = r2 < 0 ? maxRow : r2;
            // Iterate over the visible rows.
            for (var j = r1; j <= r2; ++j) {
                // Skip rows which aren't selected.
                if (!model.isRowSelected(j)) {
                    continue;
                }
                // Get the dimensions of the row.
                var y = rs.offsetOf(j) - sy + hh;
                var h = rs.sizeOf(j);
                // Adjust the height for row stretch.
                if (this._stretchLastRow && ph > bh && j === maxRow) {
                    h = hh + ph - y;
                }
                // Skip zero sized rows.
                if (h === 0) {
                    continue;
                }
                // Fill the rect if needed.
                if (fill) {
                    gc.fillRect(0, y, hw, h);
                }
                // Draw the border if needed.
                if (stroke) {
                    gc.beginPath();
                    gc.moveTo(hw - .5, y - 1);
                    gc.lineTo(hw - .5, y + h);
                    gc.stroke();
                }
            }
            // Restore the gc state.
            gc.restore();
        };
        /**
         * Draw the column header selections for the data grid.
         */
        DataGrid.prototype._drawColumnHeaderSelections = function () {
            // Fetch the selection model.
            var model = this._selectionModel;
            // Bail early if there are no selections or if the selectionMode is the entire row
            if (!model || model.isEmpty || model.selectionMode == 'row') {
                return;
            }
            // Bail early if the column headers are not visible.
            if (this.headerHeight === 0 || this.pageWidth === 0) {
                return;
            }
            // Fetch the selection colors.
            var fill = this._style.headerSelectionFillColor;
            var stroke = this._style.headerSelectionBorderColor;
            // Bail early if there is nothing to draw.
            if (!fill && !stroke) {
                return;
            }
            // Fetch common geometry.
            var sx = this._scrollX;
            var bw = this.bodyWidth;
            var pw = this.pageWidth;
            var hw = this.headerWidth;
            var hh = this.headerHeight;
            var cs = this._columnSections;
            // Fetch the overlay gc.
            var gc = this._overlayGC;
            // Save the gc state.
            gc.save();
            // Set up the header clipping rect.
            gc.beginPath();
            gc.rect(hw, 0, pw, hh);
            gc.clip();
            // Set up the gc style.
            if (fill) {
                gc.fillStyle = fill;
            }
            if (stroke) {
                gc.strokeStyle = stroke;
                gc.lineWidth = 1;
            }
            // Fetch the max column.
            var maxCol = cs.count - 1;
            // Fetch the visible columns.
            var c1 = cs.indexOf(sx);
            var c2 = cs.indexOf(sx + pw - 1);
            c2 = c2 < 0 ? maxCol : c2;
            // Iterate over the visible columns.
            for (var i = c1; i <= c2; ++i) {
                // Skip columns which aren't selected.
                if (!model.isColumnSelected(i)) {
                    continue;
                }
                // Get the dimensions of the column.
                var x = cs.offsetOf(i) - sx + hw;
                var w = cs.sizeOf(i);
                // Adjust the width for column stretch.
                if (this._stretchLastColumn && pw > bw && i === maxCol) {
                    w = hw + pw - x;
                }
                // Skip zero sized columns.
                if (w === 0) {
                    continue;
                }
                // Fill the rect if needed.
                if (fill) {
                    gc.fillRect(x, 0, w, hh);
                }
                // Draw the border if needed.
                if (stroke) {
                    gc.beginPath();
                    gc.moveTo(x - 1, hh - .5);
                    gc.lineTo(x + w, hh - .5);
                    gc.stroke();
                }
            }
            // Restore the gc state.
            gc.restore();
        };
        /**
         * Draw the overlay cursor for the data grid.
         */
        DataGrid.prototype._drawCursor = function () {
            // Fetch the selection model.
            var model = this._selectionModel;
            // Bail early if there is no cursor.
            if (!model || model.isEmpty || model.selectionMode !== 'cell') {
                return;
            }
            // Extract the style information.
            var fill = this._style.cursorFillColor;
            var stroke = this._style.cursorBorderColor;
            // Bail early if there is nothing to draw.
            if (!fill && !stroke) {
                return;
            }
            // Fetch the cursor location.
            var row = model.cursorRow;
            var column = model.cursorColumn;
            // Fetch the max row and column.
            var maxRow = this._rowSections.count - 1;
            var maxColumn = this._columnSections.count - 1;
            // Bail early if the cursor is out of bounds.
            if (row < 0 || row > maxRow) {
                return;
            }
            if (column < 0 || column > maxColumn) {
                return;
            }
            // Fetch geometry.
            var sx = this._scrollX;
            var sy = this._scrollY;
            var bw = this.bodyWidth;
            var bh = this.bodyHeight;
            var pw = this.pageWidth;
            var ph = this.pageHeight;
            var hw = this.headerWidth;
            var hh = this.headerHeight;
            var vw = this._viewportWidth;
            var vh = this._viewportHeight;
            // Get the cursor bounds in viewport coordinates.
            var x1 = this._columnSections.offsetOf(column) - sx + hw;
            var x2 = this._columnSections.extentOf(column) - sx + hw;
            var y1 = this._rowSections.offsetOf(row) - sy + hh;
            var y2 = this._rowSections.extentOf(row) - sy + hh;
            // Adjust the trailing X coordinate for column stretch.
            if (this._stretchLastColumn && pw > bw && column === maxColumn) {
                x2 = vw - 1;
            }
            // Adjust the trailing Y coordinate for row stretch.
            if (this._stretchLastRow && ph > bh && row === maxRow) {
                y2 = vh - 1;
            }
            // Skip zero sized cursors.
            if (x2 < x1 || y2 < y1) {
                return;
            }
            // Bail early if the cursor is off the screen.
            if ((x1 - 1) >= vw || (y1 - 1) >= vh || (x2 + 1) < hw || (y2 + 1) < hh) {
                return;
            }
            // Fetch the overlay gc.
            var gc = this._overlayGC;
            // Save the gc state.
            gc.save();
            // Set up the body clipping rect.
            gc.beginPath();
            gc.rect(hw, hh, pw, ph);
            gc.clip();
            // Clear any existing overlay content.
            gc.clearRect(x1, y1, x2 - x1 + 1, y2 - y1 + 1);
            // Fill the cursor rect if needed.
            if (fill) {
                // Set up the fill style.
                gc.fillStyle = fill;
                // Fill the cursor rect.
                gc.fillRect(x1, y1, x2 - x1 + 1, y2 - y1 + 1);
            }
            // Stroke the cursor border if needed.
            if (stroke) {
                // Set up the stroke style.
                gc.strokeStyle = stroke;
                gc.lineWidth = 2;
                // Stroke the cursor rect.
                gc.strokeRect(x1, y1, x2 - x1, y2 - y1);
            }
            // Restore the gc state.
            gc.restore();
        };
        /**
         * Draw the overlay shadows for the data grid.
         */
        DataGrid.prototype._drawShadows = function () {
            // Fetch the scroll shadow from the style.
            var shadow = this._style.scrollShadow;
            // Bail early if there is no shadow to draw.
            if (!shadow) {
                return;
            }
            // Fetch the scroll position.
            var sx = this._scrollX;
            var sy = this._scrollY;
            // Fetch maximum scroll position.
            var sxMax = this.maxScrollX;
            var syMax = this.maxScrollY;
            // Fetch the header width and height.
            var hw = this.headerWidth;
            var hh = this.headerHeight;
            // Fetch the page width and height.
            var pw = this.pageWidth;
            var ph = this.pageHeight;
            // Fetch the viewport width and height.
            var vw = this._viewportWidth;
            var vh = this._viewportHeight;
            // Fetch the body width and height.
            var bw = this.bodyWidth;
            var bh = this.bodyHeight;
            // Adjust the body size for row and column stretch.
            if (this._stretchLastRow && ph > bh) {
                bh = ph;
            }
            if (this._stretchLastColumn && pw > bw) {
                bw = pw;
            }
            // Fetch the gc object.
            var gc = this._overlayGC;
            // Save the gc state.
            gc.save();
            // Draw the column header shadow if needed.
            if (sy > 0) {
                // Set up the gradient coordinates.
                var x0 = 0;
                var y0 = hh;
                var x1 = 0;
                var y1 = y0 + shadow.size;
                // Create the gradient object.
                var grad = gc.createLinearGradient(x0, y0, x1, y1);
                // Set the gradient stops.
                grad.addColorStop(0, shadow.color1);
                grad.addColorStop(0.5, shadow.color2);
                grad.addColorStop(1, shadow.color3);
                // Set up the rect coordinates.
                var x = 0;
                var y = hh;
                var w = hw + Math.min(pw, bw - sx);
                var h = shadow.size;
                // Fill the shadow rect with the fill style.
                gc.fillStyle = grad;
                gc.fillRect(x, y, w, h);
            }
            // Draw the row header shadow if needed.
            if (sx > 0) {
                // Set up the gradient coordinates.
                var x0 = hw;
                var y0 = 0;
                var x1 = x0 + shadow.size;
                var y1 = 0;
                // Create the gradient object.
                var grad = gc.createLinearGradient(x0, y0, x1, y1);
                // Set the gradient stops.
                grad.addColorStop(0, shadow.color1);
                grad.addColorStop(0.5, shadow.color2);
                grad.addColorStop(1, shadow.color3);
                // Set up the rect coordinates.
                var x = hw;
                var y = 0;
                var w = shadow.size;
                var h = hh + Math.min(ph, bh - sy);
                // Fill the shadow rect with the fill style.
                gc.fillStyle = grad;
                gc.fillRect(x, y, w, h);
            }
            // Draw the column footer shadow if needed.
            if (sy < syMax) {
                // Set up the gradient coordinates.
                var x0 = 0;
                var y0 = vh;
                var x1 = 0;
                var y1 = vh - shadow.size;
                // Create the gradient object.
                var grad = gc.createLinearGradient(x0, y0, x1, y1);
                // Set the gradient stops.
                grad.addColorStop(0, shadow.color1);
                grad.addColorStop(0.5, shadow.color2);
                grad.addColorStop(1, shadow.color3);
                // Set up the rect coordinates.
                var x = 0;
                var y = vh - shadow.size;
                var w = hw + Math.min(pw, bw - sx);
                var h = shadow.size;
                // Fill the shadow rect with the fill style.
                gc.fillStyle = grad;
                gc.fillRect(x, y, w, h);
            }
            // Draw the row footer shadow if needed.
            if (sx < sxMax) {
                // Set up the gradient coordinates.
                var x0 = vw;
                var y0 = 0;
                var x1 = vw - shadow.size;
                var y1 = 0;
                // Create the gradient object.
                var grad = gc.createLinearGradient(x0, y0, x1, y1);
                // Set the gradient stops.
                grad.addColorStop(0, shadow.color1);
                grad.addColorStop(0.5, shadow.color2);
                grad.addColorStop(1, shadow.color3);
                // Set up the rect coordinates.
                var x = vw - shadow.size;
                var y = 0;
                var w = shadow.size;
                var h = hh + Math.min(ph, bh - sy);
                // Fill the shadow rect with the fill style.
                gc.fillStyle = grad;
                gc.fillRect(x, y, w, h);
            }
            // Restore the gc state.
            gc.restore();
        };
        return DataGrid;
    }(widgets.Widget));
    /**
     * The namespace for the `DataGrid` class statics.
     */
    (function (DataGrid) {
        /**
         * A generic format function for the copy handler.
         *
         * @param args - The format args for the function.
         *
         * @returns The string representation of the value.
         *
         * #### Notes
         * This function uses `String()` to coerce a value to a string.
         */
        function copyFormatGeneric(args) {
            if (args.value === null || args.value === undefined) {
                return '';
            }
            return String(args.value);
        }
        DataGrid.copyFormatGeneric = copyFormatGeneric;
        /**
         * The default theme for a data grid.
         */
        DataGrid.defaultStyle = {
            voidColor: '#F3F3F3',
            backgroundColor: '#FFFFFF',
            gridLineColor: 'rgba(20, 20, 20, 0.15)',
            headerBackgroundColor: '#F3F3F3',
            headerGridLineColor: 'rgba(20, 20, 20, 0.25)',
            selectionFillColor: 'rgba(49, 119, 229, 0.2)',
            selectionBorderColor: 'rgba(0, 107, 247, 1.0)',
            cursorBorderColor: 'rgba(0, 107, 247, 1.0)',
            headerSelectionFillColor: 'rgba(20, 20, 20, 0.1)',
            headerSelectionBorderColor: 'rgba(0, 107, 247, 1.0)',
            scrollShadow: {
                size: 10,
                color1: 'rgba(0, 0, 0, 0.20)',
                color2: 'rgba(0, 0, 0, 0.05)',
                color3: 'rgba(0, 0, 0, 0.00)'
            }
        };
        /**
         * The default sizes for a data grid.
         */
        DataGrid.defaultSizes = {
            rowHeight: 20,
            columnWidth: 64,
            rowHeaderWidth: 64,
            columnHeaderHeight: 20
        };
        /**
         * The default minimum sizes for a data grid.
         */
        DataGrid.minimumSizes = {
            rowHeight: 20,
            columnWidth: 10,
            rowHeaderWidth: 10,
            columnHeaderHeight: 20
        };
        /**
         * The default copy config for a data grid.
         */
        DataGrid.defaultCopyConfig = {
            separator: '\t',
            format: copyFormatGeneric,
            headers: 'none',
            warningThreshold: 1e6
        };
    })(exports.DataGrid || (exports.DataGrid = {}));
    /**
     * The namespace for the module implementation details.
     */
    var Private$5;
    (function (Private) {
        /**
         * A singleton `scroll-request` conflatable message.
         */
        Private.ScrollRequest = new messaging.ConflatableMessage('scroll-request');
        /**
         * A singleton `overlay-paint-request` conflatable message.
         */
        Private.OverlayPaintRequest = new messaging.ConflatableMessage('overlay-paint-request');
        /**
         * Create a new zero-sized canvas element.
         */
        function createCanvas() {
            var canvas = document.createElement('canvas');
            canvas.width = 0;
            canvas.height = 0;
            return canvas;
        }
        Private.createCanvas = createCanvas;
        /**
         * A conflatable message which merges dirty paint regions.
         */
        var PaintRequest = /** @class */ (function (_super) {
            __extends(PaintRequest, _super);
            /**
             * Construct a new paint request messages.
             *
             * @param region - The cell region for the paint.
             *
             * @param r1 - The top-left row of the dirty region.
             *
             * @param c1 - The top-left column of the dirty region.
             *
             * @param r2 - The bottom-right row of the dirty region.
             *
             * @param c2 - The bottom-right column of the dirty region.
             */
            function PaintRequest(region, r1, c1, r2, c2) {
                var _this = _super.call(this, 'paint-request') || this;
                _this._region = region;
                _this._r1 = r1;
                _this._c1 = c1;
                _this._r2 = r2;
                _this._c2 = c2;
                return _this;
            }
            Object.defineProperty(PaintRequest.prototype, "region", {
                /**
                 * The cell region for the paint.
                 */
                get: function () {
                    return this._region;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(PaintRequest.prototype, "r1", {
                /**
                 * The top-left row of the dirty region.
                 */
                get: function () {
                    return this._r1;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(PaintRequest.prototype, "c1", {
                /**
                 * The top-left column of the dirty region.
                 */
                get: function () {
                    return this._c1;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(PaintRequest.prototype, "r2", {
                /**
                 * The bottom-right row of the dirty region.
                 */
                get: function () {
                    return this._r2;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(PaintRequest.prototype, "c2", {
                /**
                 * The bottom-right column of the dirty region.
                 */
                get: function () {
                    return this._c2;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * Conflate this message with another paint request.
             */
            PaintRequest.prototype.conflate = function (other) {
                // Bail early if the request is already painting everything.
                if (this._region === 'all') {
                    return true;
                }
                // Any region can conflate with the `'all'` region.
                if (other._region === 'all') {
                    this._region = 'all';
                    return true;
                }
                // Otherwise, do not conflate with a different region.
                if (this._region !== other._region) {
                    return false;
                }
                // Conflate the region to the total boundary.
                this._r1 = Math.min(this._r1, other._r1);
                this._c1 = Math.min(this._c1, other._c1);
                this._r2 = Math.max(this._r2, other._r2);
                this._c2 = Math.max(this._c2, other._c2);
                return true;
            };
            return PaintRequest;
        }(messaging.ConflatableMessage));
        Private.PaintRequest = PaintRequest;
        /**
         * A conflatable message for resizing rows.
         */
        var RowResizeRequest = /** @class */ (function (_super) {
            __extends(RowResizeRequest, _super);
            /**
             * Construct a new row resize request.
             *
             * @param region - The row region which holds the section.
             *
             * @param index - The index of row in the region.
             *
             * @param size - The target size of the section.
             */
            function RowResizeRequest(region, index, size) {
                var _this = _super.call(this, 'row-resize-request') || this;
                _this._region = region;
                _this._index = index;
                _this._size = size;
                return _this;
            }
            Object.defineProperty(RowResizeRequest.prototype, "region", {
                /**
                 * The row region which holds the section.
                 */
                get: function () {
                    return this._region;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(RowResizeRequest.prototype, "index", {
                /**
                 * The index of the row in the region.
                 */
                get: function () {
                    return this._index;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(RowResizeRequest.prototype, "size", {
                /**
                 * The target size of the section.
                 */
                get: function () {
                    return this._size;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * Conflate this message with another row resize request.
             */
            RowResizeRequest.prototype.conflate = function (other) {
                if (this._region !== other._region || this._index !== other._index) {
                    return false;
                }
                this._size = other._size;
                return true;
            };
            return RowResizeRequest;
        }(messaging.ConflatableMessage));
        Private.RowResizeRequest = RowResizeRequest;
        /**
         * A conflatable message for resizing columns.
         */
        var ColumnResizeRequest = /** @class */ (function (_super) {
            __extends(ColumnResizeRequest, _super);
            /**
             * Construct a new column resize request.
             *
             * @param region - The column region which holds the section.
             *
             * @param index - The index of column in the region.
             *
             * @param size - The target size of the section.
             */
            function ColumnResizeRequest(region, index, size) {
                var _this = _super.call(this, 'column-resize-request') || this;
                _this._region = region;
                _this._index = index;
                _this._size = size;
                return _this;
            }
            Object.defineProperty(ColumnResizeRequest.prototype, "region", {
                /**
                 * The column region which holds the section.
                 */
                get: function () {
                    return this._region;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ColumnResizeRequest.prototype, "index", {
                /**
                 * The index of the column in the region.
                 */
                get: function () {
                    return this._index;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ColumnResizeRequest.prototype, "size", {
                /**
                 * The target size of the section.
                 */
                get: function () {
                    return this._size;
                },
                enumerable: true,
                configurable: true
            });
            /**
             * Conflate this message with another column resize request.
             */
            ColumnResizeRequest.prototype.conflate = function (other) {
                if (this._region !== other._region || this._index !== other._index) {
                    return false;
                }
                this._size = other._size;
                return true;
            };
            return ColumnResizeRequest;
        }(messaging.ConflatableMessage));
        Private.ColumnResizeRequest = ColumnResizeRequest;
    })(Private$5 || (Private$5 = {}));

    /**
     * A data model implementation for in-memory JSON data.
     */
    var JSONModel = /** @class */ (function (_super) {
        __extends(JSONModel, _super);
        /**
         * Create a data model with static JSON data.
         *
         * @param options - The options for initializing the data model.
         */
        function JSONModel(options) {
            var _this = _super.call(this) || this;
            var split = Private$6.splitFields(options.schema);
            _this._data = options.data;
            _this._bodyFields = split.bodyFields;
            _this._headerFields = split.headerFields;
            _this._missingValues = Private$6.createMissingMap(options.schema);
            return _this;
        }
        /**
         * Get the row count for a region in the data model.
         *
         * @param region - The row region of interest.
         *
         * @returns - The row count for the region.
         */
        JSONModel.prototype.rowCount = function (region) {
            if (region === 'body') {
                return this._data.length;
            }
            return 1; // TODO multiple column-header rows?
        };
        /**
         * Get the column count for a region in the data model.
         *
         * @param region - The column region of interest.
         *
         * @returns - The column count for the region.
         */
        JSONModel.prototype.columnCount = function (region) {
            if (region === 'body') {
                return this._bodyFields.length;
            }
            return this._headerFields.length;
        };
        /**
         * Get the data value for a cell in the data model.
         *
         * @param region - The cell region of interest.
         *
         * @param row - The row index of the cell of interest.
         *
         * @param column - The column index of the cell of interest.
         *
         * @returns - The data value for the specified cell.
         *
         * #### Notes
         * A `missingValue` as defined by the schema is converted to `null`.
         */
        JSONModel.prototype.data = function (region, row, column) {
            // Set up the field and value variables.
            var field;
            var value;
            // Look up the field and value for the region.
            switch (region) {
                case 'body':
                    field = this._bodyFields[column];
                    value = this._data[row][field.name];
                    break;
                case 'column-header':
                    field = this._bodyFields[column];
                    value = field.title || field.name;
                    break;
                case 'row-header':
                    field = this._headerFields[column];
                    value = this._data[row][field.name];
                    break;
                case 'corner-header':
                    field = this._headerFields[column];
                    value = field.title || field.name;
                    break;
                default:
                    throw 'unreachable';
            }
            // Test whether the value is a missing value.
            var missing = (this._missingValues !== null &&
                typeof value === 'string' &&
                this._missingValues[value] === true);
            // Return the final value.
            return missing ? null : value;
        };
        /**
         * Get the metadata for a cell in the data model.
         *
         * @param region - The cell region of interest.
         *
         * @param row - The row index of the cell of of interest.
         *
         * @param column - The column index of the cell of interest.
         *
         * @returns The metadata for the cell.
         */
        JSONModel.prototype.metadata = function (region, row, column) {
            if (region === 'body' || region === 'column-header') {
                return this._bodyFields[column];
            }
            return this._headerFields[column];
        };
        return JSONModel;
    }(exports.DataModel));
    /**
     * The namespace for the module implementation details.
     */
    var Private$6;
    (function (Private) {
        /**
         * Split the schema fields into header and body fields.
         */
        function splitFields(schema) {
            // Normalize the primary keys.
            var primaryKeys;
            if (schema.primaryKey === undefined) {
                primaryKeys = [];
            }
            else if (typeof schema.primaryKey === 'string') {
                primaryKeys = [schema.primaryKey];
            }
            else {
                primaryKeys = schema.primaryKey;
            }
            // Separate the fields for the body and header.
            var bodyFields = [];
            var headerFields = [];
            for (var _i = 0, _a = schema.fields; _i < _a.length; _i++) {
                var field = _a[_i];
                if (primaryKeys.indexOf(field.name) === -1) {
                    bodyFields.push(field);
                }
                else {
                    headerFields.push(field);
                }
            }
            // Return the separated fields.
            return { bodyFields: bodyFields, headerFields: headerFields };
        }
        Private.splitFields = splitFields;
        /**
         * Create a missing values map for a schema.
         *
         * This returns `null` if there are no missing values.
         */
        function createMissingMap(schema) {
            // Bail early if there are no missing values.
            if (!schema.missingValues || schema.missingValues.length === 0) {
                return null;
            }
            // Collect the missing values into a map.
            var result = Object.create(null);
            for (var _i = 0, _a = schema.missingValues; _i < _a.length; _i++) {
                var value = _a[_i];
                result[value] = true;
            }
            // Return the populated map.
            return result;
        }
        Private.createMissingMap = createMissingMap;
    })(Private$6 || (Private$6 = {}));

    exports.BasicKeyHandler = BasicKeyHandler;
    exports.BasicMouseHandler = BasicMouseHandler;
    exports.BasicSelectionModel = BasicSelectionModel;
    exports.BooleanCellEditor = BooleanCellEditor;
    exports.CellEditor = CellEditor;
    exports.DateCellEditor = DateCellEditor;
    exports.DynamicOptionCellEditor = DynamicOptionCellEditor;
    exports.GraphicsContext = GraphicsContext;
    exports.InputCellEditor = InputCellEditor;
    exports.IntegerCellEditor = IntegerCellEditor;
    exports.IntegerInputValidator = IntegerInputValidator;
    exports.JSONModel = JSONModel;
    exports.MutableDataModel = MutableDataModel;
    exports.NumberCellEditor = NumberCellEditor;
    exports.NumberInputValidator = NumberInputValidator;
    exports.OptionCellEditor = OptionCellEditor;
    exports.PassInputValidator = PassInputValidator;
    exports.RendererMap = RendererMap;
    exports.SelectionModel = SelectionModel;
    exports.TextCellEditor = TextCellEditor;
    exports.TextInputValidator = TextInputValidator;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=index.js.map
