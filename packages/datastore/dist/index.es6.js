import { StringExt, toObject, map, toArray, each, iterItems, ArrayExt } from '@lumino/algorithm';
import { BPlusTree, LinkedList } from '@lumino/collections';
import { DisposableDelegate } from '@lumino/disposable';
import { MessageLoop, ConflatableMessage } from '@lumino/messaging';
import { Signal } from '@lumino/signaling';

var invalidFieldnameLeads = ['$', '@'];
/**
 * Validate a schema definition.
 */
function validateSchema(schema) {
    var errors = [];
    // Ensure that field names do not begin with `$` or `@`.
    for (var name_1 in schema.fields) {
        if (invalidFieldnameLeads.indexOf(name_1[0]) !== -1) {
            errors.push("Invalid field name: '" + name_1 + "'. Cannot start field name with '" + name_1[0] + "'");
        }
    }
    return errors;
}

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

function __spreadArrays() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
}

/**
 * A datastore object which holds a collection of records.
 */
var Table = /** @class */ (function () {
    /**
     * Construct a new datastore table.
     *
     * @param schema - The schema for the table.
     *
     * @param context - The datastore context.
     */
    function Table(schema, context, records) {
        this._records = new BPlusTree(Private.recordCmp);
        this.schema = schema;
        this._context = context;
        if (records) {
            this._records.assign(records);
        }
    }
    /**
     * @internal
     *
     * Create a new datastore table.
     *
     * @param schema - The schema for the table.
     *
     * @param context - The datastore context.
     *
     * @returns A new datastore table.
     */
    Table.create = function (schema, context) {
        return new Table(schema, context);
    };
    /**
     * @internal
     *
     * Create a new datastore table with a previously exported state.
     *
     * @param schema - The schema for the table.
     *
     * @param context - The datastore context.
     *
     * @returns A new datastore table.
     */
    Table.recreate = function (schema, context, records) {
        return new Table(schema, context, records);
    };
    /**
     * @internal
     *
     * Apply a patch to a datastore table.
     *
     * @param table - The table of interest.
     *
     * @param data - The patch to apply to the table.
     *
     * @returns The user-facing change to the table.
     */
    Table.patch = function (table, data) {
        // Create the change object.
        var tc = {};
        // Fetch common variables.
        var schema = table.schema;
        var records = table._records;
        var cmp = Private.recordIdCmp;
        // Iterate over the dataset.
        for (var id in data) {
            // Get or create the old record.
            var old = records.get(id, cmp) || Private.createRecord(schema, id);
            // Apply the patch and create the new record.
            var _a = Private.applyPatch(schema, old, data[id]), record = _a.record, change = _a.change;
            // Replace the old record in the table.
            records.insert(record);
            // Update the change object.
            tc[id] = change;
        }
        // Return the change object.
        return tc;
    };
    /**
     * @internal
     *
     * Unapply a patch to a datastore table, thereby undoing that patch.
     *
     * @param table - The table of interest.
     *
     * @param data - The patch to apply to the table.
     *
     * @returns The user-facing change to the table.
     */
    Table.unpatch = function (table, data) {
        // Create the change object.
        var tc = {};
        // Fetch common variables.
        var schema = table.schema;
        var records = table._records;
        var cmp = Private.recordIdCmp;
        // Iterate over the dataset.
        for (var id in data) {
            // Get or create the old record.
            var old = records.get(id, cmp) || Private.createRecord(schema, id);
            // Apply the patch and create the new record.
            var _a = Private.unapplyPatch(schema, old, data[id]), record = _a.record, change = _a.change;
            // Replace the old record in the table.
            records.insert(record);
            // Update the change object.
            tc[id] = change;
        }
        // Return the change object.
        return tc;
    };
    Object.defineProperty(Table.prototype, "isEmpty", {
        /**
         * Whether the table is empty.
         *
         * #### Complexity
         * `O(1)`
         */
        get: function () {
            return this._records.isEmpty;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Table.prototype, "size", {
        /**
         * The size of the table.
         *
         * #### Complexity
         * `O(1)`
         */
        get: function () {
            return this._records.size;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Create an iterator over the records in the table.
     *
     * @returns A new iterator over the table records.
     *
     * #### Complexity
     * `O(log32 n)`
     */
    Table.prototype.iter = function () {
        return this._records.iter();
    };
    /**
     * Test whether the table has a particular record.
     *
     * @param id - The id of the record of interest.
     *
     * @returns `true` if the table has the record, `false` otherwise.
     *
     * #### Complexity
     * `O(log32 n)`
     */
    Table.prototype.has = function (id) {
        return this._records.has(id, Private.recordIdCmp);
    };
    /**
     * Get the record for a particular id in the table.
     *
     * @param id - The id of the record of interest.
     *
     * @returns The record for the specified id, or `undefined` if no
     *   such record exists.
     *
     * #### Complexity
     * `O(log32 n)`
     */
    Table.prototype.get = function (id) {
        return this._records.get(id, Private.recordIdCmp);
    };
    /**
     * Update one or more records in the table.
     *
     * @param data - The data for updating the records.
     *
     * #### Notes
     * If a specified record does not exist, it will be created.
     *
     * This method may only be called during a datastore transaction.
     */
    Table.prototype.update = function (data) {
        // Fetch the context.
        var context = this._context;
        // Ensure the update happens during a transaction.
        if (!context.inTransaction) {
            throw new Error('A table can only be updated during a transaction.');
        }
        // Fetch common variables.
        var schema = this.schema;
        var records = this._records;
        var cmp = Private.recordIdCmp;
        // Iterate over the data.
        for (var id in data) {
            // Get or create the old record.
            var old = records.get(id, cmp) || Private.createRecord(schema, id);
            // Apply the update and create the new record.
            var record = Private.applyUpdate(schema, old, data[id], context);
            // Replace the old record in the table.
            records.insert(record);
        }
    };
    return Table;
}());
/**
 * The namespace for the module implementation details.
 */
var Private;
(function (Private) {
    /**
     * A three-way record comparison function.
     */
    function recordCmp(a, b) {
        return StringExt.cmp(a.$id, b.$id);
    }
    Private.recordCmp = recordCmp;
    /**
     * A three-way record id comparison function.
     */
    function recordIdCmp(record, id) {
        return StringExt.cmp(record.$id, id);
    }
    Private.recordIdCmp = recordIdCmp;
    /**
     * Create a new record object.
     *
     * @param schema - The schema for the record.
     *
     * @param id - The unique id for the record.
     *
     * @returns A new default initialized record.
     */
    function createRecord(schema, id) {
        // Create the record and metadata objects.
        var record = {};
        var metadata = {};
        // Set the base record state.
        record.$id = id;
        record['@@metadata'] = metadata;
        // Populate the record and metadata.
        for (var name_1 in schema.fields) {
            var field = schema.fields[name_1];
            record[name_1] = field.createValue();
            metadata[name_1] = field.createMetadata();
        }
        // Return the new record.
        return record;
    }
    Private.createRecord = createRecord;
    /**
     * Apply an update to a record.
     *
     * @param schema - The schema for the record.
     *
     * @param record - The record of interest.
     *
     * @param update - The update to apply to the record.
     *
     * @param context - The datastore context.
     *
     * @returns A new record with the update applied.
     */
    function applyUpdate(schema, record, update, context) {
        // Fetch the version and store id.
        var version = context.version;
        var storeId = context.storeId;
        // Fetch or create the table change and patch.
        var tc = context.change[schema.id] || (context.change[schema.id] = {});
        var tp = context.patch[schema.id] || (context.patch[schema.id] = {});
        // Fetch or create the record change and patch.
        var rc = tc[record.$id] || (tc[record.$id] = {});
        var rp = tp[record.$id] || (tp[record.$id] = {});
        // Cast the record to a value object.
        var previous = record;
        // Fetch the record metadata.
        var metadata = record['@@metadata'];
        // Create a clone of the record.
        var clone = __assign({}, record);
        // Iterate over the update.
        for (var name_2 in update) {
            // Fetch the relevant field.
            var field = schema.fields[name_2];
            // Apply the update for the field.
            var _a = field.applyUpdate({
                previous: previous[name_2],
                update: update[name_2],
                metadata: metadata[name_2],
                version: version,
                storeId: storeId
            }), value = _a.value, change = _a.change, patch = _a.patch;
            // Assign the new value to the clone.
            clone[name_2] = value;
            // Merge the change if needed.
            if (name_2 in rc) {
                change = field.mergeChange(rc[name_2], change);
            }
            // Merge the patch if needed.
            if (name_2 in rp) {
                patch = field.mergePatch(rp[name_2], patch);
            }
            // Update the record change and patch for the field.
            rc[name_2] = change;
            rp[name_2] = patch;
        }
        // Return the new record.
        return clone;
    }
    Private.applyUpdate = applyUpdate;
    /**
     * Apply a patch to a record.
     *
     * @param schema - The schema for the record.
     *
     * @param record - The record of interest.
     *
     * @param patch - The patch to apply to the record.
     *
     * @return The result of applying the patch.
     */
    function applyPatch(schema, record, patch) {
        // Create the change object.
        var rc = {};
        // Cast the record to a value object.
        var previous = record;
        // Fetch the record metadata.
        var metadata = record['@@metadata'];
        // Create a clone of the record.
        var clone = __assign({}, record);
        // Iterate over the patch.
        for (var name_3 in patch) {
            // Fetch the relevant field.
            var field = schema.fields[name_3];
            // Apply the patch for the field.
            var _a = field.applyPatch({
                previous: previous[name_3],
                patch: patch[name_3],
                metadata: metadata[name_3]
            }), value = _a.value, change = _a.change;
            // Assign the new value to the clone.
            clone[name_3] = value;
            // Update the change object.
            rc[name_3] = change;
        }
        // Return the patch result.
        return { record: clone, change: rc };
    }
    Private.applyPatch = applyPatch;
    /**
     * Unapply a patch to a record.
     *
     * @param schema - The schema for the record.
     *
     * @param record - The record of interest.
     *
     * @param patch - The patch to unapply to the record.
     *
     * @return The result of unapplying the patch.
     */
    function unapplyPatch(schema, record, patch) {
        // Create the change object.
        var rc = {};
        // Cast the record to a value object.
        var previous = record;
        // Fetch the record metadata.
        var metadata = record['@@metadata'];
        // Create a clone of the record.
        var clone = __assign({}, record);
        // Iterate over the patch.
        for (var name_4 in patch) {
            // Fetch the relevant field.
            var field = schema.fields[name_4];
            // Apply the patch for the field.
            var _a = field.unapplyPatch({
                previous: previous[name_4],
                patch: patch[name_4],
                metadata: metadata[name_4]
            }), value = _a.value, change = _a.change;
            // Assign the new value to the clone.
            clone[name_4] = value;
            // Update the change object.
            rc[name_4] = change;
        }
        // Return the patch result.
        return { record: clone, change: rc };
    }
    Private.unapplyPatch = unapplyPatch;
})(Private || (Private = {}));

// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2018, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
/**
 * Create a duplex string identifier.
 *
 * @param version - The datastore version for the duplex id.
 *
 * @param store - The datastore id for the duplex id.
 *
 * @returns A string duplex id for the given arguments.
 *
 * #### Notes
 * ID format: <6-byte version><4-byte storeId>
 */
function createDuplexId(version, store) {
    // Split the version into 16-bit values.
    var vc = version & 0xFFFF;
    var vb = (((version - vc) / 0x10000) | 0) & 0xFFFF;
    var va = (((version - vb - vc) / 0x100000000) | 0) & 0xFFFF;
    // Split the store id into 16-bit values.
    var sb = store & 0xFFFF;
    var sa = (((store - sb) / 0x10000) | 0) & 0xFFFF;
    // Convert the parts into a string identifier duplex.
    return String.fromCharCode(va, vb, vc, sa, sb);
}
/**
 * Create a triplex string identifier between two boundaries.
 *
 * @param version - The datastore version for the triplex id.
 *
 * @param store - The datastore id for the triplex id.
 *
 * @param lower - The lower triplex boundary identifier or `''`
 *   to represent the lowest-most boundary.
 *
 * @param upper - The upper triplex boundary identifier or `''`
 *   to represent the upper-most boundary.
 *
 * @returns A new triplex identifier between the two boundaries.
 *
 * #### Notes
 * ID format: <6-byte path><6-byte version><4-byte storeId> * (N >= 1)
 */
function createTriplexId(version, store, lower, upper) {
    // The maximum path in a triplex id.
    var MAX_PATH = 0xFFFFFFFFFFFF;
    // Set up the variable to hold the id.
    var id = '';
    // Fetch the triplet counts of the ids.
    var lowerCount = lower ? Private$1.idTripletCount(lower) : 0;
    var upperCount = upper ? Private$1.idTripletCount(upper) : 0;
    // Iterate over the id triplets.
    for (var i = 0, n = Math.max(lowerCount, upperCount); i < n; ++i) {
        // Fetch the lower identifier triplet, padding as needed.
        var lp = void 0;
        var lc = void 0;
        var ls = void 0;
        if (i >= lowerCount) {
            lp = 0;
            lc = 0;
            ls = 0;
        }
        else {
            lp = Private$1.idPathAt(lower, i);
            lc = Private$1.idVersionAt(lower, i);
            ls = Private$1.idStoreAt(lower, i);
        }
        // Fetch the upper identifier triplet, padding as needed.
        var up = void 0;
        var uc = void 0;
        var us = void 0;
        if (i >= upperCount) {
            up = upperCount === 0 ? MAX_PATH + 1 : 0;
            uc = 0;
            us = 0;
        }
        else {
            up = Private$1.idPathAt(upper, i);
            uc = Private$1.idVersionAt(upper, i);
            us = Private$1.idStoreAt(upper, i);
        }
        // If the triplets are the same, copy the triplet and continue.
        if (lp === up && lc === uc && ls === us) {
            id += Private$1.createTriplet(lp, lc, ls);
            continue;
        }
        // If the triplets are different, the well-ordered identifiers
        // assumption means that the lower triplet compares less than
        // the upper triplet. The task now is to find the nearest free
        // path slot among the remaining triplets.
        // If there is free space between the path portions of the
        // triplets, select a new path which falls between them.
        if (up - lp > 1) {
            var np_1 = Private$1.randomPath(lp + 1, up - 1);
            id += Private$1.createTriplet(np_1, version, store);
            return id.slice();
        }
        // Otherwise, copy the left triplet and reset the upper count
        // to zero so that the loop chooses the nearest available path
        // slot after the current lower triplet.
        id += Private$1.createTriplet(lp, lc, ls);
        upperCount = 0;
    }
    // If this point is reached, the lower and upper identifiers share
    // the same path but diverge based on the version or store id. It is
    // safe to insert anywhere in an extra triplet.
    var np = Private$1.randomPath(1, MAX_PATH);
    id += Private$1.createTriplet(np, version, store);
    return id.slice();
}
/**
 * Create the multiple triplex identifiers.
 *
 * @param n - The number of identifiers to create.
 *
 * @param version - The datastore version.
 *
 * @param store - The datastore id.
 *
 * @param lower - The lower boundary identifier, exclusive.
 *
 * @param uppper - The upper boundary identifier, exclusive.
 *
 * @returns The requested identifiers.
 */
function createTriplexIds(n, version, store, lower, upper) {
    // Initialize the identifiers array.
    var ids = [];
    // Loop the required number of times.
    while (ids.length < n) {
        // Create an identifier between the boundaries.
        var id = createTriplexId(version, store, lower, upper);
        // Add the identifier to the array.
        ids.push(id);
        // Update the lower boundary identifier.
        lower = id;
    }
    // Return the generated identifiers.
    return ids;
}
/**
 * The namespace for the module implementation details.
 */
var Private$1;
(function (Private) {
    /**
     * Create a string identifier triplet.
     *
     * @param path - The path value for the triplet.
     *
     * @param version - The version for the triplet.
     *
     * @param store - The store id for the triplet.
     *
     * @returns The string identifier triplet.
     */
    function createTriplet(path, version, store) {
        // Split the path into 16-bit values.
        var pc = path & 0xFFFF;
        var pb = (((path - pc) / 0x10000) | 0) & 0xFFFF;
        var pa = (((path - pb - pc) / 0x100000000) | 0) & 0xFFFF;
        // Split the version into 16-bit values.
        var vc = version & 0xFFFF;
        var vb = (((version - vc) / 0x10000) | 0) & 0xFFFF;
        var va = (((version - vb - vc) / 0x100000000) | 0) & 0xFFFF;
        // Split the store id into 16-bit values.
        var sb = store & 0xFFFF;
        var sa = (((store - sb) / 0x10000) | 0) & 0xFFFF;
        // Convert the parts into a string identifier triplet.
        return String.fromCharCode(pa, pb, pc, va, vb, vc, sa, sb);
    }
    Private.createTriplet = createTriplet;
    /**
     * Get the total number of path triplets in an identifier.
     *
     * @param id - The identifier of interest.
     *
     * @returns The total number of triplets in the id.
     */
    function idTripletCount(id) {
        return id.length >> 3;
    }
    Private.idTripletCount = idTripletCount;
    /**
     * Get the path value for a particular triplet.
     *
     * @param id - The string id of interest.
     *
     * @param i - The index of the triplet.
     *
     * @returns The path value for the specified triplet.
     */
    function idPathAt(id, i) {
        var j = i << 3;
        var a = id.charCodeAt(j + 0);
        var b = id.charCodeAt(j + 1);
        var c = id.charCodeAt(j + 2);
        return a * 0x100000000 + b * 0x10000 + c;
    }
    Private.idPathAt = idPathAt;
    /**
     * Get the version for a particular triplet.
     *
     * @param id - The identifier of interest.
     *
     * @param i - The index of the triplet.
     *
     * @returns The version for the specified triplet.
     */
    function idVersionAt(id, i) {
        var j = i << 3;
        var a = id.charCodeAt(j + 3);
        var b = id.charCodeAt(j + 4);
        var c = id.charCodeAt(j + 5);
        return a * 0x100000000 + b * 0x10000 + c;
    }
    Private.idVersionAt = idVersionAt;
    /**
     * Get the store id for a particular triplet.
     *
     * @param id - The identifier of interest.
     *
     * @param i - The index of the triplet.
     *
     * @returns The store id for the specified triplet.
     */
    function idStoreAt(id, i) {
        var j = i << 3;
        var a = id.charCodeAt(j + 6);
        var b = id.charCodeAt(j + 7);
        return a * 0x10000 + b;
    }
    Private.idStoreAt = idStoreAt;
    /**
     * Pick a path in the leading bucket of an inclusive range.
     *
     * @param min - The minimum allowed path, inclusive.
     *
     * @param max - The maximum allowed path, inclusive.
     *
     * @returns A random path in the leading bucket of the range.
     */
    function randomPath(min, max) {
        return min + Math.round(Math.random() * Math.sqrt(max - min));
    }
    Private.randomPath = randomPath;
})(Private$1 || (Private$1 = {}));

// Copyright (c) Jupyter Development Team.
/**
 * A multi-user collaborative datastore.
 *
 * #### Notes
 * A store is structured in a maximally flat way using a hierarchy
 * of tables, records, and fields. Internally, the object graph is
 * synchronized among all users via CRDT algorithms.
 *
 * https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type
 * https://hal.inria.fr/file/index/docid/555588/filename/techreport.pdf
 */
var Datastore = /** @class */ (function () {
    /**
     * Create a new datastore.
     *
     * @param id - The unique id of the datastore.
     * @param tables - The tables of the datastore.
     */
    function Datastore(context, tables, adapter, transactionIdFactory) {
        this._cemetery = {};
        this._disposed = false;
        this._changed = new Signal(this);
        this._transactionQueue = new LinkedList();
        this._context = context;
        this._tables = tables;
        this._adapter = adapter || null;
        this._transactionIdFactory = transactionIdFactory || createDuplexId;
        if (this._adapter) {
            this._adapter.onRemoteTransaction = this._onRemoteTransaction.bind(this);
            this._adapter.onUndo = this._onUndo.bind(this);
            this._adapter.onRedo = this._onRedo.bind(this);
        }
    }
    /**
     * Create a new datastore.
     *
     * @param options - The options for creating the datastore
     *
     * @returns A new datastore table.
     *
     * @throws An exception if any of the schema definitions are invalid.
     */
    Datastore.create = function (options) {
        var schemas = options.schemas;
        // Throws an error for invalid schemas:
        Private$2.validateSchemas(schemas);
        var context = {
            inTransaction: false,
            transactionId: '',
            version: 0,
            storeId: options.id,
            change: {},
            patch: {},
        };
        var tables = new BPlusTree(Private$2.recordCmp);
        if (options.restoreState) {
            // If passed state to restore, pass the intital state to recreate each
            // table
            var state_1 = JSON.parse(options.restoreState);
            tables.assign(map(schemas, function (s) {
                return Table.recreate(s, context, state_1[s.id] || []);
            }));
        }
        else {
            // Otherwise, simply create a new, empty table
            tables.assign(map(schemas, function (s) {
                return Table.create(s, context);
            }));
        }
        return new Datastore(context, tables, options.adapter);
    };
    /**
     * Dispose of the resources held by the datastore.
     */
    Datastore.prototype.dispose = function () {
        // Bail if already disposed.
        if (this._disposed) {
            return;
        }
        this._disposed = true;
        Signal.clearData(this);
        this._adapter = null;
    };
    Object.defineProperty(Datastore.prototype, "isDisposed", {
        /**
         * Whether the datastore has been disposed.
         */
        get: function () {
            return this._disposed;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Datastore.prototype, "changed", {
        /**
         * A signal emitted when changes are made to the store.
         *
         * #### Notes
         * This signal is emitted either at the end of a local mutation,
         * or after a remote mutation has been applied. The storeId can
         * be used to determine its source.
         *
         * The payload represents the set of local changes that were made
         * to bring the store to its current state.
         *
         * #### Complexity
         * `O(1)`
         */
        get: function () {
            return this._changed;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Datastore.prototype, "id", {
        /**
         * The unique id of the store.
         *
         * #### Notes
         * The id is unique among all other collaborating peers.
         *
         * #### Complexity
         * `O(1)`
         */
        get: function () {
            return this._context.storeId;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Datastore.prototype, "inTransaction", {
        /**
         * Whether a transaction is currently in progress.
         *
         * #### Complexity
         * `O(1)`
         */
        get: function () {
            return this._context.inTransaction;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Datastore.prototype, "version", {
        /**
         * The current version of the datastore.
         *
         * #### Notes
         * This version is automatically increased for each transaction
         * to the store. However, it might not increase linearly (i.e.
         * it might make jumps).
         *
         * #### Complexity
         * `O(1)`
         */
        get: function () {
            return this._context.version;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Create an iterator over all the tables of the datastore.
     *
     * @returns An iterator.
     */
    Datastore.prototype.iter = function () {
        return this._tables.iter();
    };
    /**
     * Get the table for a particular schema.
     *
     * @param schema - The schema of interest.
     *
     * @returns The table for the specified schema.
     *
     * @throws An exception if no table exists for the given schema.
     *
     * #### Complexity
     * `O(log32 n)`
     */
    Datastore.prototype.get = function (schema) {
        var t = this._tables.get(schema.id, Private$2.recordIdCmp);
        if (t === undefined) {
            throw new Error("No table found for schema with id: " + schema.id);
        }
        return t;
    };
    /**
     * Begin a new transaction in the store.
     *
     * @returns The id of the new transaction
     *
     * @throws An exception if a transaction is already in progress.
     *
     * #### Notes
     * This will allow the state of the store to be mutated
     * thorugh the `update` method on the individual tables.
     *
     * After the updates are completed, `endTransaction` should
     * be called.
     */
    Datastore.prototype.beginTransaction = function () {
        var newVersion = this._context.version + 1;
        var id = this._transactionIdFactory(newVersion, this.id);
        this._initTransaction(id, newVersion);
        MessageLoop.postMessage(this, new ConflatableMessage('transaction-begun'));
        return id;
    };
    /**
     * Completes a transaction.
     *
     * #### Notes
     * This completes a transaction previously started with
     * `beginTransaction`. If a change has occurred, the
     * `changed` signal will be emitted.
     */
    Datastore.prototype.endTransaction = function () {
        this._finalizeTransaction();
        var _a = this._context, patch = _a.patch, change = _a.change, storeId = _a.storeId, transactionId = _a.transactionId, version = _a.version;
        // Possibly broadcast the transaction to collaborators.
        if (this._adapter && !Private$2.isPatchEmpty(patch)) {
            this._adapter.broadcast({
                id: transactionId,
                storeId: storeId,
                patch: patch,
                version: version
            });
        }
        // Add the transation to the cemetery to indicate it is visible.
        this._cemetery[transactionId] = 1;
        // Emit a change signal
        if (!Private$2.isChangeEmpty(this._context.change)) {
            this._changed.emit({
                storeId: storeId,
                transactionId: transactionId,
                type: 'transaction',
                change: change,
            });
        }
    };
    /**
     * Handle a message.
     */
    Datastore.prototype.processMessage = function (msg) {
        switch (msg.type) {
            case 'transaction-begun':
                if (this._context.inTransaction) {
                    console.warn("Automatically ending transaction (did you forget to end it?): " + this._context.transactionId);
                    this.endTransaction();
                }
                break;
            case 'queued-transaction':
                this._processQueue();
                break;
        }
    };
    /**
     * Undo a patch that was previously applied.
     *
     * @param transactionId - The transaction to undo.
     *
     * @returns A promise which resolves when the action is complete.
     *
     * @throws An exception if `undo` is called during a mutation, or if no
     *   server adapter has been set for the datastore.
     *
     * #### Notes
     * If changes are made, the `changed` signal will be emitted before
     * the promise resolves.
     */
    Datastore.prototype.undo = function (transactionId) {
        if (!this._adapter) {
            throw Error('No server adapter has been set for the datastore');
        }
        if (this.inTransaction) {
            throw Error('Cannot undo during a transaction');
        }
        return this._adapter.undo(transactionId);
    };
    /**
     * Redo a patch that was previously undone.
     *
     * @param transactionId - The transaction to redo.
     *
     * @returns A promise which resolves when the action is complete.
     *
     * @throws An exception if `redo` is called during a mutation, or if no
     *   server adapter has been set for the datastore.
     *
     * #### Notes
     * If changes are made, the `changed` signal will be emitted before
     * the promise resolves.
     */
    Datastore.prototype.redo = function (transactionId) {
        if (!this._adapter) {
            throw Error('No server adapter has been set for the datastore');
        }
        if (this.inTransaction) {
            throw Error('Cannot redo during a transaction');
        }
        return this._adapter.redo(transactionId);
    };
    Object.defineProperty(Datastore.prototype, "adapter", {
        /**
         * The handler for broadcasting transactions to peers.
         */
        get: function () {
            return this._adapter;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Serialize the state of the datastore to a string.
     *
     * @returns The serialized state.
     */
    Datastore.prototype.toString = function () {
        return JSON.stringify(toObject(map(this, function (table) {
            return [table.schema.id, toArray(table)];
        })));
    };
    /**
     * Handle a transaction from the server adapter.
     */
    Datastore.prototype._onRemoteTransaction = function (transaction) {
        this._processTransaction(transaction, 'transaction');
    };
    /**
     * Handle an undo from the server adapter.
     */
    Datastore.prototype._onUndo = function (transaction) {
        this._processTransaction(transaction, 'undo');
    };
    /**
     * Handle a redo from the server adapter.
     */
    Datastore.prototype._onRedo = function (transaction) {
        this._processTransaction(transaction, 'redo');
    };
    /**
     * Apply a transaction to the datastore.
     *
     * @param transactionApplication - The data of the transaction.
     *
     * @throws An exception if `processTransaction` is called during a mutation.
     *
     * #### Notes
     * If changes are made, the `changed` signal will be emitted.
     */
    Datastore.prototype._processTransaction = function (transaction, type) {
        var _this = this;
        var storeId = transaction.storeId, patch = transaction.patch;
        try {
            this._initTransaction(transaction.id, Math.max(this._context.version, transaction.version));
        }
        catch (e) {
            // Already in a transaction. Put the transaction in the queue to apply
            // later.
            this._queueTransaction(transaction, type);
            return;
        }
        var change = {};
        try {
            each(iterItems(patch), function (_a) {
                var schemaId = _a[0], tablePatch = _a[1];
                var table = _this._tables.get(schemaId, Private$2.recordIdCmp);
                if (table === undefined) {
                    console.warn("Missing table for schema id '" + schemaId + "' in transaction '" + transaction.id + "'");
                    _this._finalizeTransaction();
                    return;
                }
                if (type === 'transaction' || type === 'redo') {
                    var count = _this._cemetery[transaction.id];
                    if (count === undefined) {
                        _this._cemetery[transaction.id] = 1;
                        change[schemaId] = Table.patch(table, tablePatch);
                        return;
                    }
                    _this._cemetery[transaction.id] = count + 1;
                    // If the transaction is just now positive, apply it to the store.
                    if (_this._cemetery[transaction.id] === 1) {
                        change[schemaId] = Table.patch(table, tablePatch);
                        return;
                    }
                }
                else {
                    var count = _this._cemetery[transaction.id];
                    if (count === undefined) {
                        _this._cemetery[transaction.id] = -1;
                        return;
                    }
                    _this._cemetery[transaction.id] = count - 1;
                    // If the transaction hasn't already been unapplied, do so.
                    if (_this._cemetery[transaction.id] === 0) {
                        change[schemaId] = Table.unpatch(table, tablePatch);
                    }
                }
            });
        }
        finally {
            this._finalizeTransaction();
        }
        if (!Private$2.isChangeEmpty(change)) {
            this._changed.emit({
                storeId: storeId,
                transactionId: transaction.id,
                type: type,
                change: change,
            });
        }
    };
    /**
     * Queue a transaction for later application.
     *
     * @param transaction - the transaction to queue.
     */
    Datastore.prototype._queueTransaction = function (transaction, type) {
        this._transactionQueue.addLast([transaction, type]);
        MessageLoop.postMessage(this, new ConflatableMessage('queued-transaction'));
    };
    /**
     * Process all transactions currently queued.
     */
    Datastore.prototype._processQueue = function () {
        var queue = this._transactionQueue;
        // If the transaction queue is empty, bail.
        if (queue.isEmpty) {
            return;
        }
        // Add a sentinel value to the end of the queue. The queue will
        // only be processed up to the sentinel. Transactions added during
        // this cycle will execute on the next cycle.
        var sentinel = {};
        queue.addLast(sentinel);
        // Enter the processing loop.
        while (true) {
            // Remove the first transaction in the queue.
            var _a = queue.removeFirst(), transaction = _a[0], type = _a[1];
            // If the value is the sentinel, exit the loop.
            if (transaction === sentinel) {
                return;
            }
            // Apply the transaction.
            this._processTransaction(transaction, type);
        }
    };
    /**
     * Reset the context state for a new transaction.
     *
     * @param id - The id of the new transaction.
     * @param newVersion - The version of the datastore after the transaction.
     *
     * @throws An exception if a transaction is already in progress.
     */
    Datastore.prototype._initTransaction = function (id, newVersion) {
        var context = this._context;
        if (context.inTransaction) {
            throw new Error("Already in a transaction: " + this._context.transactionId);
        }
        context.inTransaction = true;
        context.change = {};
        context.patch = {};
        context.transactionId = id;
        context.version = newVersion;
    };
    /**
     * Finalize the context state for a transaction in progress.
     *
     * @throws An exception if no transaction is in progress.
     */
    Datastore.prototype._finalizeTransaction = function () {
        var context = this._context;
        if (!context.inTransaction) {
            throw new Error('No transaction in progress.');
        }
        context.inTransaction = false;
    };
    return Datastore;
}());
/**
 * The namespace for the `Datastore` class statics.
 */
(function (Datastore) {
    /**
     * A helper function to wrap an update to the datastore in calls to
     * `beginTransaction` and `endTransaction`.
     *
     * @param datastore: the datastore to which to apply the update.
     *
     * @param update: A function that performs the update on the datastore.
     *   The function is called with a transaction id string, in case the
     *   user wishes to store the transaction ID for later use.
     *
     * @returns the transaction ID.
     *
     * #### Notes
     * If the datastore is already in a transaction, this does not attempt
     * to start a new one, and returns an empty string for the transaction
     * id. This allows for transactions to be composed a bit more easily.
     */
    function withTransaction(datastore, update) {
        var id = '';
        if (!datastore.inTransaction) {
            id = datastore.beginTransaction();
        }
        try {
            update(id);
        }
        finally {
            if (id) {
                datastore.endTransaction();
            }
        }
        return id;
    }
    Datastore.withTransaction = withTransaction;
    /**
     * Get a given table by its location.
     *
     * @param datastore: the datastore in which the table resides.
     *
     * @param loc: The table location.
     *
     * @returns the table.
     */
    function getTable(datastore, loc) {
        return datastore.get(loc.schema);
    }
    Datastore.getTable = getTable;
    /**
     * Get a given record by its location.
     *
     * @param datastore: the datastore in which the record resides.
     *
     * @param loc: The record location.
     *
     * @returns the record, or undefined if it does not exist.
     */
    function getRecord(datastore, loc) {
        return datastore.get(loc.schema).get(loc.record);
    }
    Datastore.getRecord = getRecord;
    /**
     * Get a given field by its location.
     *
     * @param datastore: the datastore in which the field resides.
     *
     * @param loc: the field location.
     *
     * @returns the field in question.
     *
     * #### Notes
     * This will throw an error if the record does not exist in the given table.
     */
    function getField(datastore, loc) {
        var record = datastore.get(loc.schema).get(loc.record);
        if (!record) {
            throw Error("The record " + loc.record + " could not be found");
        }
        return record[loc.field];
    }
    Datastore.getField = getField;
    /**
     * Update a table.
     *
     * @param datastore: the datastore in which the table resides.
     *
     * @param loc: the table location.
     *
     * @param update: the update to the table.
     *
     * #### Notes
     * This does not begin a transaction, so usage of this function should be
     * combined with `beginTransaction`/`endTransaction`, or `withTransaction`.
     */
    function updateTable(datastore, loc, update) {
        var table = datastore.get(loc.schema);
        table.update(update);
    }
    Datastore.updateTable = updateTable;
    /**
     * Update a record in a table.
     *
     * @param datastore: the datastore in which the record resides.
     *
     * @param loc: the record location.
     *
     * @param update: the update to the record.
     *
     * #### Notes
     * This does not begin a transaction, so usage of this function should be
     * combined with `beginTransaction`/`endTransaction`, or `withTransaction`.
     */
    function updateRecord(datastore, loc, update) {
        var _a;
        var table = datastore.get(loc.schema);
        table.update((_a = {},
            _a[loc.record] = update,
            _a));
    }
    Datastore.updateRecord = updateRecord;
    /**
     * Update a field in a table.
     *
     * @param datastore: the datastore in which the field resides.
     *
     * @param loc: the field location.
     *
     * @param update: the update to the field.
     *
     * #### Notes
     * This does not begin a transaction, so usage of this function should be
     * combined with `beginTransaction`/`endTransaction`, or `withTransaction`.
     */
    function updateField(datastore, loc, update) {
        var _a, _b;
        var table = datastore.get(loc.schema);
        // TODO: this cast may be made unnecessary once microsoft/TypeScript#13573
        // is fixed, possibly by microsoft/TypeScript#26797 lands.
        table.update((_a = {},
            _a[loc.record] = (_b = {},
                _b[loc.field] = update,
                _b),
            _a));
    }
    Datastore.updateField = updateField;
    /**
     * Listen to changes in a table. Changes to other tables are ignored.
     *
     * @param datastore: the datastore in which the table resides.
     *
     * @param loc: the table location.
     *
     * @param slot: a callback function to invoke when the table changes.
     *
     * @returns an `IDisposable` that can be disposed to remove the listener.
     */
    function listenTable(datastore, loc, slot, thisArg) {
        // A wrapper change signal connection function.
        var wrapper = function (source, args) {
            // Ignore changes that don't match the requested record.
            if (!args.change[loc.schema.id]) {
                return;
            }
            // Otherwise, call the slot.
            var tc = args.change[loc.schema.id];
            slot.bind(thisArg)(source, tc);
        };
        datastore.changed.connect(wrapper);
        return new DisposableDelegate(function () {
            datastore.changed.disconnect(wrapper);
        });
    }
    Datastore.listenTable = listenTable;
    /**
     * Listen to changes in a record in a table. Changes to other tables and
     * other records in the same table are ignored.
     *
     * @param datastore: the datastore in which the record resides.
     *
     * @param loc: the record location.
     *
     * @param slot: a callback function to invoke when the record changes.
     *
     * @returns an `IDisposable` that can be disposed to remove the listener.
     */
    function listenRecord(datastore, loc, slot, thisArg) {
        // A wrapper change signal connection function.
        var wrapper = function (source, args) {
            // Ignore changes that don't match the requested record.
            if (!args.change[loc.schema.id] ||
                !args.change[loc.schema.id][loc.record]) {
                return;
            }
            // Otherwise, call the slot.
            var tc = args.change[loc.schema.id];
            slot.bind(thisArg)(source, tc[loc.record]);
        };
        datastore.changed.connect(wrapper);
        return new DisposableDelegate(function () {
            datastore.changed.disconnect(wrapper);
        });
    }
    Datastore.listenRecord = listenRecord;
    /**
     * Listen to changes in a fields in a table. Changes to other tables, other
     * records in the same table, and other fields in the same record are ignored.
     *
     * @param datastore: the datastore in which the field resides.
     *
     * @param loc: the field location.
     *
     * @param slot: a callback function to invoke when the field changes.
     *
     * @returns an `IDisposable` that can be disposed to remove the listener.
     */
    function listenField(datastore, loc, slot, thisArg) {
        var wrapper = function (source, args) {
            // Ignore changes that don't match the requested field.
            if (!args.change[loc.schema.id] ||
                !args.change[loc.schema.id][loc.record] ||
                !args.change[loc.schema.id][loc.record][loc.field]) {
                return;
            }
            // Otherwise, call the slot.
            var tc = args.change[loc.schema.id];
            slot.bind(thisArg)(source, tc[loc.record][loc.field]);
        };
        datastore.changed.connect(wrapper);
        return new DisposableDelegate(function () {
            datastore.changed.disconnect(wrapper);
        });
    }
    Datastore.listenField = listenField;
})(Datastore || (Datastore = {}));
var Private$2;
(function (Private) {
    /**
     * Validates all schemas, and throws an error if any are invalid.
     */
    function validateSchemas(schemas) {
        var errors = [];
        for (var _i = 0, schemas_1 = schemas; _i < schemas_1.length; _i++) {
            var s = schemas_1[_i];
            var err = validateSchema(s);
            if (err.length) {
                errors.push("Schema '" + s.id + "' validation failed: \n" + err.join('\n'));
            }
        }
        if (errors.length) {
            throw new Error(errors.join('\n\n'));
        }
    }
    Private.validateSchemas = validateSchemas;
    /**
     * A three-way record comparison function.
     */
    function recordCmp(a, b) {
        return StringExt.cmp(a.schema.id, b.schema.id);
    }
    Private.recordCmp = recordCmp;
    /**
     * A three-way record id comparison function.
     */
    function recordIdCmp(table, id) {
        return StringExt.cmp(table.schema.id, id);
    }
    Private.recordIdCmp = recordIdCmp;
    /**
     * Checks if a patch is empty.
     */
    function isPatchEmpty(patch) {
        return Object.keys(patch).length === 0;
    }
    Private.isPatchEmpty = isPatchEmpty;
    /**
     * Checks if a change is empty.
     */
    function isChangeEmpty(change) {
        return Object.keys(change).length === 0;
    }
    Private.isChangeEmpty = isChangeEmpty;
})(Private$2 || (Private$2 = {}));

/**
 * An abstract base class for datastore field types.
 */
var Field = /** @class */ (function () {
    /**
     * Construct a new field.
     *
     * @param options - The options for initializing the field.
     */
    function Field(options) {
        if (options === void 0) { options = {}; }
        var opts = __assign({ description: '' }, options);
        this.description = opts.description;
    }
    return Field;
}());

/**
 * A field which represents a collaborative list of values.
 */
var ListField = /** @class */ (function (_super) {
    __extends(ListField, _super);
    /**
     * Construct a new list field.
     *
     * @param options - The options for initializing the field.
     */
    function ListField(options) {
        if (options === void 0) { options = {}; }
        return _super.call(this, options) || this;
    }
    Object.defineProperty(ListField.prototype, "type", {
        /**
         * The discriminated type of the field.
         */
        get: function () {
            return 'list';
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Create the initial value for the field.
     *
     * @returns The initial value for the field.
     */
    ListField.prototype.createValue = function () {
        return [];
    };
    /**
     * Create the metadata for the field.
     *
     * @returns The metadata for the field.
     */
    ListField.prototype.createMetadata = function () {
        return { ids: [], cemetery: {} };
    };
    /**
     * Apply a user update to the field.
     *
     * @param args - The arguments for the update.
     *
     * @returns The result of applying the update.
     */
    ListField.prototype.applyUpdate = function (args) {
        // Unpack the arguments.
        var previous = args.previous, update = args.update, metadata = args.metadata, version = args.version, storeId = args.storeId;
        // Create a clone of the previous value.
        var clone = __spreadArrays(previous);
        // Set up the change and patch arrays.
        var change = [];
        var patch = [];
        // Coerce the update into an array of splices.
        if (Private$3.isSplice(update)) {
            update = [update];
        }
        // Iterate over the update.
        for (var _i = 0, update_1 = update; _i < update_1.length; _i++) {
            var splice = update_1[_i];
            // Apply the splice to the clone.
            var obj = Private$3.applySplice(clone, splice, metadata, version, storeId);
            // Update the change array.
            change.push(obj.change);
            // Update the patch array.
            patch.push(obj.patch);
        }
        // Return the update result.
        return { value: clone, change: change, patch: patch };
    };
    /**
     * Apply a system patch to the field.
     *
     * @param args - The arguments for the patch.
     *
     * @returns The result of applying the patch.
     */
    ListField.prototype.applyPatch = function (args) {
        // Unpack the arguments.
        var previous = args.previous, patch = args.patch, metadata = args.metadata;
        // Create a clone of the previous value.
        var clone = __spreadArrays(previous);
        // Set up the change array.
        var change = [];
        // Iterate over the patch.
        for (var _i = 0, patch_1 = patch; _i < patch_1.length; _i++) {
            var part = patch_1[_i];
            // Apply the patch part to the value.
            var result = Private$3.applyPatch(clone, part, metadata);
            // Update the change array.
            change.push.apply(change, result);
        }
        // Return the patch result.
        return { value: clone, change: change };
    };
    /**
     * Unapply a system patch to the field.
     *
     * @param args - The arguments for the patch.
     *
     * @returns The result of unapplying the patch.
     */
    ListField.prototype.unapplyPatch = function (args) {
        // Unpack the arguments.
        var previous = args.previous, patch = args.patch, metadata = args.metadata;
        // Create a clone of the previous value.
        var clone = __spreadArrays(previous);
        // Set up the change array.
        var change = [];
        // Iterate over the patch.
        for (var _i = 0, patch_2 = patch; _i < patch_2.length; _i++) {
            var part = patch_2[_i];
            var reversed = {
                removedIds: part.insertedIds,
                insertedIds: part.removedIds,
                removedValues: part.insertedValues,
                insertedValues: part.removedValues
            };
            // Apply the patch part to the value.
            var result = Private$3.applyPatch(clone, reversed, metadata);
            // Update the change array.
            change.push.apply(change, result);
        }
        // Return the patch result.
        return { value: clone, change: change };
    };
    /**
     * Merge two change objects into a single change object.
     *
     * @param first - The first change object of interest.
     *
     * @param second - The second change object of interest.
     *
     * @returns A new change object which represents both changes.
     */
    ListField.prototype.mergeChange = function (first, second) {
        return __spreadArrays(first, second);
    };
    /**
     * Merge two patch objects into a single patch object.
     *
     * @param first - The first patch object of interest.
     *
     * @param second - The second patch object of interest.
     *
     * @returns A new patch object which represents both patches.
     */
    ListField.prototype.mergePatch = function (first, second) {
        return __spreadArrays(first, second);
    };
    return ListField;
}(Field));
/**
 * The namespace for the module implementation details.
 */
var Private$3;
(function (Private) {
    /**
     * A type-guard function for a list field update type.
     */
    function isSplice(value) {
        return !Array.isArray(value);
    }
    Private.isSplice = isSplice;
    /**
     * Apply a splice to a list field.
     *
     * @param array - The mutable current value of the field.
     *
     * @param splice - The splice to apply to the field.
     *
     * @param metadata - The metadata for the field.
     *
     * @param version - The current datastore version.
     *
     * @param storeId - The unique id of the datastore.
     *
     * @returns The result of the splice operation.
     */
    function applySplice(array, splice, metadata, version, storeId) {
        // Unpack the splice.
        var index = splice.index, remove = splice.remove, values = splice.values;
        // Clamp the index to the array bounds.
        if (index < 0) {
            index = Math.max(0, index + array.length);
        }
        else {
            index = Math.min(index, array.length);
        }
        // Clamp the remove count to the array bounds.
        var count = Math.min(remove, array.length - index);
        // Fetch the lower and upper identifiers.
        var lower = index === 0 ? '' : metadata.ids[index - 1];
        var upper = index === array.length ? '' : metadata.ids[index];
        // Create the ids for the splice.
        var ids = createTriplexIds(values.length, version, storeId, lower, upper);
        // Apply the splice to the ids and values.
        var removedIds = spliceArray(metadata.ids, index, count, ids);
        var removedValues = spliceArray(array, index, count, values);
        // Create the change object.
        var change = { index: index, removed: removedValues, inserted: values };
        // Create the patch object.
        var patch = { removedIds: removedIds, removedValues: removedValues, insertedIds: ids, insertedValues: values };
        // Return the splice result.
        return { change: change, patch: patch };
    }
    Private.applySplice = applySplice;
    /**
     * Apply a patch to a list field.
     *
     * @param value - The mutable current value of the field.
     *
     * @param patch - The patch part to apply to the field.
     *
     * @param metadata - The metadata for the field.
     *
     * @returns The user-facing change array for the patch.
     */
    function applyPatch(value, patch, metadata) {
        // Unpack the patch.
        var removedIds = patch.removedIds, insertedIds = patch.insertedIds, insertedValues = patch.insertedValues;
        // Set up the change array.
        var change = [];
        // Process the removed identifiers, if necessary.
        if (removedIds.length > 0) {
            // Chunkify the removed identifiers,
            // or increment the removed ids in the cemetery.
            var chunks = findRemovedChunks(removedIds, metadata);
            // Process the chunks.
            while (chunks.length > 0) {
                // Pop the last-most chunk.
                var _a = chunks.pop(), index = _a.index, count = _a.count;
                // Remove the identifiers from the metadata.
                metadata.ids.splice(index, count);
                // Remove the values from the array.
                var removed = value.splice(index, count);
                // Add the change part to the change array.
                change.push({ index: index, removed: removed, inserted: [] });
            }
        }
        // Process the inserted identifiers, if necessary.
        if (insertedIds.length > 0) {
            // Chunkify the inserted identifiers, or decrement the removed
            // ids in the cemetery.
            var chunks = findInsertedChunks(insertedIds, insertedValues, metadata);
            // Process the chunks.
            while (chunks.length > 0) {
                // Pop the last-most chunk.
                var _b = chunks.pop(), index = _b.index, ids = _b.ids, values = _b.values;
                // Insert the identifiers into the metadata.
                spliceArray(metadata.ids, index, 0, ids);
                // Insert the values into the array.
                spliceArray(value, index, 0, values);
                // Add the change part to the change array.
                change.push({ index: index, removed: [], inserted: values });
            }
        }
        // Return the change array.
        return change;
    }
    Private.applyPatch = applyPatch;
    /**
     * Convert an array of identifiers into removal chunks.
     *
     * @param ids - The ids to remove from the metadta.
     *
     * @param metadata - The metadata for the list field.
     *
     * @returns The ordered chunks to remove.
     *
     * #### Notes
     * The metadata may be mutated if concurrently removed chunks are encountered.
     */
    function findRemovedChunks(ids, metadata) {
        // Set up the chunks array.
        var chunks = [];
        // Set up the iteration index.
        var i = 0;
        // Fetch the identifier array length.
        var n = ids.length;
        // Iterate over the identifiers to remove.
        while (i < n) {
            // Find the boundary identifier for the current id.
            var j = ArrayExt.lowerBound(metadata.ids, ids[i], StringExt.cmp);
            // If the boundary is at the end of the array, or if the boundary id
            // does not match the id we are looking for, then we are dealing with
            // a concurrently deleted value. In that case, increment its reference
            // in the cemetery and continue processing ids.
            if (j === metadata.ids.length || metadata.ids[j] !== ids[i]) {
                var count_1 = metadata.cemetery[ids[i]] || 0;
                metadata.cemetery[ids[i]] = count_1 + 1;
                i++;
                continue;
            }
            // Set up the chunk index.
            var index = j;
            // Set up the chunk count.
            var count = 0;
            // Find the extent of the chunk.
            while (i < n && StringExt.cmp(ids[i], metadata.ids[j]) === 0) {
                count++;
                i++;
                j++;
            }
            // Add the chunk to the chunks array, or bump the id index.
            if (count > 0) {
                chunks.push({ index: index, count: count });
            }
            else {
                i++;
            }
        }
        // Return the computed chunks.
        return chunks;
    }
    /**
     * Convert arrays of identifiers and values into insert chunks.
     *
     * @param ids - The ids to be inserted.
     *
     * @param values - The values to be inserted.
     *
     * @param metadata - The metadata for the list field.
     *
     * @returns The ordered chunks to insert.
     *
     * #### Notes
     * The metadata may be mutated if concurrently removed chunks are encountered.
     */
    function findInsertedChunks(ids, values, metadata) {
        var indices = [];
        var insertIds = [];
        var insertValues = [];
        for (var i = 0; i < ids.length; i++) {
            // Check if the id has been concurrently deleted. If so, update
            // the cemetery, and continue processing without inserting the id.
            if (checkCemeteryForInsert(ids[i], metadata.cemetery)) {
                continue;
            }
            // Add the id to the ids which will be actually inserted.
            insertIds.push(ids[i]);
            indices.push(ArrayExt.lowerBound(metadata.ids, ids[i], StringExt.cmp));
            insertValues.push(values[i]);
        }
        return chunkifyInsertions(insertIds, insertValues, indices);
    }
    /**
     * Consolidate inserted IDs into a set of chunks so that we can splice them
     * into the existing value with a minimal number of splices.
     *
     * @param ids - The ids to be inserted.
     *
     * @param values - The values to be inserted. Should be the same length as ids.
     *
     * @param indices - The indices at which to insert the text. Should be the same length as ids.
     *
     * @returns The ordered chunks to insert.
     */
    function chunkifyInsertions(ids, values, indices) {
        // Set up the chunks array.
        var chunks = [];
        // Set up the loop over the ids to insert.
        var insertIndex;
        var i = 0;
        while (i < ids.length) {
            // Reset the insert chunk data
            var chunkIds = [];
            var chunkValues = [];
            insertIndex = indices[i];
            // Find the extent of the chunk
            while (indices[i] === insertIndex && i < ids.length) {
                chunkIds.push(ids[i]);
                chunkValues.push(values[i]);
                i++;
            }
            if (chunkValues.length) {
                chunks.push({ index: insertIndex, ids: chunkIds, values: chunkValues });
            }
        }
        return chunks;
    }
    /**
     * Check if an id should be inserted, or if it has been concurrently deleted.
     *
     * @param id - the id to check.
     *
     * @param cemetery - the cemetery which determines whether the id should be inserted.
     *
     * @returns whether the id was found, indicating that it shouldn't be inserted.
     *
     * #### Notes
     * If the ID *is* found in the cemetery, its value in the cemetery is decremented,
     * reflecting that it is closer to being shown.
     */
    function checkCemeteryForInsert(id, cemetery) {
        var count = cemetery[id] || 0;
        if (count === 1) {
            delete cemetery[id];
            return true;
        }
        if (count > 1) {
            cemetery[id] = count - 1;
            return true;
        }
        return false;
    }
    /**
     * Splice data into an array.
     *
     * #### Notes
     * This is intentionally similar to Array.splice, but chunks the splices into
     * multiple splices so that it does not crash if the number of spliced IDs
     * is greater than the maximum number of arguments for a function.
     *
     * @param arr - the array on which to perform the splice.
     *
     * @param start - the start index for the splice.
     *
     * @param deleteCount - how many indices to remove.
     *
     * @param items - the items to splice into the array.
     *
     * @returns an array of the deleted elements.
     */
    function spliceArray(arr, start, deleteCount, items) {
        if (!items) {
            return arr.splice(start, deleteCount);
        }
        var size = 100000;
        if (items.length < size) {
            return arr.splice.apply(arr, __spreadArrays([start, deleteCount || 0], items));
        }
        var deleted = arr.splice(start, deleteCount);
        var n = Math.floor(items.length / size);
        var idx = 0;
        for (var i = 0; i < n; i++, idx += size) {
            arr.splice.apply(arr, __spreadArrays([start + idx, 0], items.slice(idx, idx + size)));
        }
        arr.splice.apply(arr, __spreadArrays([start + idx, 0], items.slice(idx)));
        return deleted;
    }
})(Private$3 || (Private$3 = {}));

/**
 * A field which represents a collaborative key:value map.
 */
var MapField = /** @class */ (function (_super) {
    __extends(MapField, _super);
    /**
     * Construct a new map field.
     *
     * @param options - The options for initializing the field.
     */
    function MapField(options) {
        if (options === void 0) { options = {}; }
        return _super.call(this, options) || this;
    }
    Object.defineProperty(MapField.prototype, "type", {
        /**
         * The discriminated type of the field.
         */
        get: function () {
            return 'map';
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Create the initial value for the field.
     *
     * @returns The initial value for the field.
     */
    MapField.prototype.createValue = function () {
        return {};
    };
    /**
     * Create the metadata for the field.
     *
     * @returns The metadata for the field.
     */
    MapField.prototype.createMetadata = function () {
        return { ids: {}, values: {} };
    };
    /**
     * Apply a user update to the field.
     *
     * @param args - The arguments for the update.
     *
     * @returns The result of applying the update.
     */
    MapField.prototype.applyUpdate = function (args) {
        // Unpack the arguments.
        var previous = args.previous, update = args.update, metadata = args.metadata, version = args.version, storeId = args.storeId;
        // Create the id for the values.
        var id = createDuplexId(version, storeId);
        // Create a clone of the previous value.
        var clone = __assign({}, previous);
        // Set up the previous and current change parts.
        var prev = {};
        var curr = {};
        // Iterate over the update.
        for (var key in update) {
            // Insert the update value into the metadata.
            var value = Private$4.insertIntoMetadata(metadata, key, id, update[key]);
            // Update the clone with the new value.
            if (value === null) {
                delete clone[key];
            }
            else {
                clone[key] = value;
            }
            // Update the previous change part.
            prev[key] = key in previous ? previous[key] : null;
            // Update the current change part.
            curr[key] = value;
        }
        // Create the change object.
        var change = { previous: prev, current: curr };
        // Create the patch object.
        var patch = { id: id, values: update };
        // Return the update result.
        return { value: clone, change: change, patch: patch };
    };
    /**
     * Apply a system patch to the field.
     *
     * @param args - The arguments for the patch.
     *
     * @returns The result of applying the patch.
     */
    MapField.prototype.applyPatch = function (args) {
        // Unpack the arguments.
        var previous = args.previous, patch = args.patch, metadata = args.metadata;
        // Unpack the patch.
        var id = patch.id, values = patch.values;
        // Create a clone of the previous value.
        var clone = __assign({}, previous);
        // Set up the previous and current change parts.
        var prev = {};
        var curr = {};
        // Iterate over the values.
        for (var key in values) {
            // Insert the patch value into the metadata.
            var value = Private$4.insertIntoMetadata(metadata, key, id, values[key]);
            // Update the clone with the new value.
            if (value === null) {
                delete clone[key];
            }
            else {
                clone[key] = value;
            }
            // Update the previous change part.
            prev[key] = key in previous ? previous[key] : null;
            // Update the current change part.
            curr[key] = value;
        }
        // Create the change object.
        var change = { previous: prev, current: curr };
        // Return the patch result.
        return { value: clone, change: change };
    };
    /**
     * Apply a system patch to the field.
     *
     * @param args - The arguments for the patch.
     *
     * @returns The result of applying the patch.
     */
    MapField.prototype.unapplyPatch = function (args) {
        // Unpack the arguments.
        var previous = args.previous, patch = args.patch, metadata = args.metadata;
        // Unpack the patch.
        var id = patch.id, values = patch.values;
        // Create a clone of the previous value.
        var clone = __assign({}, previous);
        // Set up the previous and current change parts.
        var prev = {};
        var curr = {};
        // Iterate over the values.
        for (var key in values) {
            // Remove the patch value from the metadata.
            var value = Private$4.removeFromMetadata(metadata, key, id);
            // Update the clone with the new value.
            if (value === null) {
                delete clone[key];
            }
            else {
                clone[key] = value;
            }
            // Update the previous change part.
            prev[key] = key in previous ? previous[key] : null;
            // Update the current change part.
            curr[key] = value;
        }
        // Create the change object.
        var change = { previous: prev, current: curr };
        // Return the patch result.
        return { value: clone, change: change };
    };
    /**
     * Merge two change objects into a single change object.
     *
     * @param first - The first change object of interest.
     *
     * @param second - The second change object of interest.
     *
     * @returns A new change object which represents both changes.
     */
    MapField.prototype.mergeChange = function (first, second) {
        var previous = __assign(__assign({}, second.previous), first.previous);
        var current = __assign(__assign({}, first.current), second.current);
        return { previous: previous, current: current };
    };
    /**
     * Merge two patch objects into a single patch object.
     *
     * @param first - The first patch object of interest.
     *
     * @param second - The second patch object of interest.
     *
     * @returns A new patch object which represents both patches.
     */
    MapField.prototype.mergePatch = function (first, second) {
        return { id: second.id, values: __assign(__assign({}, first.values), second.values) };
    };
    return MapField;
}(Field));
/**
 * The namespace for the module implementation details.
 */
var Private$4;
(function (Private) {
    /**
     * Insert a value into the map field metadata.
     *
     * @param metadata - The metadata of interest.
     *
     * @param key - The key of interest.
     *
     * @param id - The unique id for the value.
     *
     * @param value - The value to insert.
     *
     * @returns The current value for the key.
     *
     * #### Notes
     * If the id already exists, the old value will be overwritten.
     */
    function insertIntoMetadata(metadata, key, id, value) {
        // Fetch the id and value arrays for the given key.
        var ids = metadata.ids[key] || (metadata.ids[key] = []);
        var values = metadata.values[key] || (metadata.values[key] = []);
        // Find the insert index for the id.
        var i = ArrayExt.lowerBound(ids, id, StringExt.cmp);
        // Overwrite or insert the value as appropriate.
        if (i < ids.length && ids[i] === id) {
            values[i] = value;
        }
        else {
            ArrayExt.insert(ids, i, id);
            ArrayExt.insert(values, i, value);
        }
        // Return the current value for the key.
        return values[values.length - 1];
    }
    Private.insertIntoMetadata = insertIntoMetadata;
    /**
     * Remove a value from the map field metadata.
     *
     * @param metadata - The metadata of interest.
     *
     * @param key - The key of interest.
     *
     * @param id - The unique id for the value.
     *
     * @returns The current value for the key, or null if there is no value.
     *
     * #### Notes
     * If the id is not in the metadata, this is a no-op.
     */
    function removeFromMetadata(metadata, key, id) {
        // Fetch the id and value arrays for the given key.
        var ids = metadata.ids[key] || (metadata.ids[key] = []);
        var values = metadata.values[key] || (metadata.values[key] = []);
        // Find the insert index for the id.
        var i = ArrayExt.lowerBound(ids, id, StringExt.cmp);
        // Find and remove the index for the id.
        if (ids[i] === id) {
            ArrayExt.removeAt(ids, i);
            ArrayExt.removeAt(values, i);
        }
        // Return the current value for the key.
        return values.length ? values[values.length - 1] : null;
    }
    Private.removeFromMetadata = removeFromMetadata;
})(Private$4 || (Private$4 = {}));

/**
 * A field which represents a collaborative atomic value.
 */
var RegisterField = /** @class */ (function (_super) {
    __extends(RegisterField, _super);
    /**
     * Construct a new register field.
     *
     * @param options - The options for initializing the field.
     */
    function RegisterField(options) {
        var _this = _super.call(this, options) || this;
        _this.value = options.value;
        return _this;
    }
    Object.defineProperty(RegisterField.prototype, "type", {
        /**
         * The discriminated type of the field.
         */
        get: function () {
            return 'register';
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Create the initial value for the field.
     *
     * @returns The initial value for the field.
     */
    RegisterField.prototype.createValue = function () {
        return this.value;
    };
    /**
     * Create the metadata for the field.
     *
     * @returns The metadata for the field.
     */
    RegisterField.prototype.createMetadata = function () {
        return { ids: [], values: [] };
    };
    /**
     * Apply a user update to the field.
     *
     * @param args - The arguments for the update.
     *
     * @returns The result of applying the update.
     */
    RegisterField.prototype.applyUpdate = function (args) {
        // Unpack the arguments.
        var previous = args.previous, update = args.update, metadata = args.metadata, version = args.version, storeId = args.storeId;
        // Create the id for the value.
        var id = createDuplexId(version, storeId);
        // Insert the update value into the metadata.
        var value = Private$5.insertIntoMetadata(metadata, id, update);
        // Create the change object.
        var change = { previous: previous, current: value };
        // Create the patch object.
        var patch = { id: id, value: update };
        // Return the result of the update.
        return { value: value, change: change, patch: patch };
    };
    /**
     * Apply a system patch to the field.
     *
     * @param args - The arguments for the patch.
     *
     * @returns The result of applying the patch.
     */
    RegisterField.prototype.applyPatch = function (args) {
        // Unpack the arguments.
        var previous = args.previous, patch = args.patch, metadata = args.metadata;
        // Insert the patch value into the metadata.
        var value = Private$5.insertIntoMetadata(metadata, patch.id, patch.value);
        // Create the change object.
        var change = { previous: previous, current: value };
        // Return the result of the patch.
        return { value: value, change: change };
    };
    /**
     * Unapply a system patch to the field.
     *
     * @param args - The arguments for the patch.
     *
     * @returns The result of unapplying the patch.
     */
    RegisterField.prototype.unapplyPatch = function (args) {
        // Unpack the arguments.
        var previous = args.previous, patch = args.patch, metadata = args.metadata;
        // Remove the patch value from the metadata.
        var value = Private$5.removeFromMetadata(metadata, patch.id, this.value);
        // Create the change object.
        var change = { previous: previous, current: value };
        // Return the result of the patch.
        return { value: value, change: change };
    };
    /**
     * Merge two change objects into a single change object.
     *
     * @param first - The first change object of interest.
     *
     * @param second - The second change object of interest.
     *
     * @returns A new change object which represents both changes.
     */
    RegisterField.prototype.mergeChange = function (first, second) {
        return { previous: first.previous, current: second.current };
    };
    /**
     * Merge two patch objects into a single patch object.
     *
     * @param first - The first patch object of interest.
     *
     * @param second - The second patch object of interest.
     *
     * @returns A new patch object which represents both patches.
     */
    RegisterField.prototype.mergePatch = function (first, second) {
        return second;
    };
    return RegisterField;
}(Field));
/**
 * The namespace for the module implementation details.
 */
var Private$5;
(function (Private) {
    /**
     * Insert a value into the register field metadata.
     *
     * @param metadata - The metadata of interest.
     *
     * @param id - The unique id for the value.
     *
     * @param value - The value to insert.
     *
     * @returns The current value for the register field.
     *
     * #### Notes
     * If the id already exists, the old value will be overwritten.
     */
    function insertIntoMetadata(metadata, id, value) {
        // Unpack the metadata.
        var ids = metadata.ids, values = metadata.values;
        // Find the insert index for the id.
        var i = ArrayExt.lowerBound(ids, id, StringExt.cmp);
        // Overwrite or insert the value as appropriate.
        if (i < ids.length && ids[i] === id) {
            values[i] = value;
        }
        else {
            ArrayExt.insert(ids, i, id);
            ArrayExt.insert(values, i, value);
        }
        // Return the current value for the register field.
        return values[values.length - 1];
    }
    Private.insertIntoMetadata = insertIntoMetadata;
    /**
     * Remove a value from the register field metadata.
     *
     * @param metadata - The metadata of interest.
     *
     * @param id - The unique id for the value.
     *
     * @param initial - The default value for the field
     *
     * @returns The current value for the register field.
     *
     * #### Notes
     * If the id does not exist in the metadata, this is a no-op.
     */
    function removeFromMetadata(metadata, id, initial) {
        // Unpack the metadata.
        var ids = metadata.ids, values = metadata.values;
        // Find the remove index for the id.
        var i = ArrayExt.lowerBound(ids, id, StringExt.cmp);
        if (ids[i] === id) {
            ArrayExt.removeAt(ids, i);
            ArrayExt.removeAt(values, i);
        }
        // Return the current value for the register field.
        // If there are no values in the metadata, return the default value.
        return values.length ? values[values.length - 1] : initial;
    }
    Private.removeFromMetadata = removeFromMetadata;
})(Private$5 || (Private$5 = {}));

/**
 * A field which represents collaborative text.
 */
var TextField = /** @class */ (function (_super) {
    __extends(TextField, _super);
    /**
     * Construct a new text field.
     *
     * @param options - The options for initializing the field.
     */
    function TextField(options) {
        if (options === void 0) { options = {}; }
        return _super.call(this, options) || this;
    }
    Object.defineProperty(TextField.prototype, "type", {
        /**
         * The discriminated type of the field.
         */
        get: function () {
            return 'text';
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Create the initial value for the field.
     *
     * @returns The initial value for the field.
     */
    TextField.prototype.createValue = function () {
        return '';
    };
    /**
     * Create the metadata for the field.
     *
     * @returns The metadata for the field.
     */
    TextField.prototype.createMetadata = function () {
        return { ids: [], cemetery: {} };
    };
    /**
     * Apply a user update to the field.
     *
     * @param args - The arguments for the update.
     *
     * @returns The result of applying the update.
     */
    TextField.prototype.applyUpdate = function (args) {
        // Unpack the arguments.
        var previous = args.previous, update = args.update, metadata = args.metadata, version = args.version, storeId = args.storeId;
        // Set up a variable to hold the current value.
        var value = previous;
        // Set up the change and patch arrays.
        var change = [];
        var patch = [];
        // Coerce the update into an array of splices.
        if (Private$6.isSplice(update)) {
            update = [update];
        }
        // Iterate over the update.
        for (var _i = 0, update_1 = update; _i < update_1.length; _i++) {
            var splice = update_1[_i];
            // Apply the splice to the value.
            var obj = Private$6.applySplice(value, splice, metadata, version, storeId);
            // Update the change array.
            change.push(obj.change);
            // Update the patch array.
            patch.push(obj.patch);
            // Update the current value.
            value = obj.value;
        }
        // Return the update result.
        return { value: value, change: change, patch: patch };
    };
    /**
     * Apply a system patch to the field.
     *
     * @param args - The arguments for the patch.
     *
     * @returns The result of applying the patch.
     */
    TextField.prototype.applyPatch = function (args) {
        // Unpack the arguments.
        var previous = args.previous, patch = args.patch, metadata = args.metadata;
        // Set up a variable to hold the current value.
        var value = previous;
        // Set up the change array.
        var change = [];
        // Iterate over the patch.
        for (var _i = 0, patch_1 = patch; _i < patch_1.length; _i++) {
            var part = patch_1[_i];
            // Apply the patch part to the value.
            var obj = Private$6.applyPatch(value, part, metadata);
            // Update the change array.
            change.push.apply(change, obj.change);
            // Update the current value.
            value = obj.value;
        }
        // Return the patch result.
        return { value: value, change: change };
    };
    /**
     * Unapply a system patch to the field.
     *
     * @param args - The arguments for the patch.
     *
     * @returns The result of unapplying the patch.
     */
    TextField.prototype.unapplyPatch = function (args) {
        // Unpack the arguments.
        var previous = args.previous, patch = args.patch, metadata = args.metadata;
        // Set up a variable to hold the current value.
        var value = previous;
        // Set up the change array.
        var change = [];
        // Iterate over the patch.
        for (var _i = 0, patch_2 = patch; _i < patch_2.length; _i++) {
            var part = patch_2[_i];
            var reversed = {
                removedIds: part.insertedIds,
                insertedIds: part.removedIds,
                removedText: part.insertedText,
                insertedText: part.removedText
            };
            // Apply the patch part to the value.
            var obj = Private$6.applyPatch(value, reversed, metadata);
            // Update the change array.
            change.push.apply(change, obj.change);
            // Update the current value.
            value = obj.value;
        }
        // Return the patch result.
        return { value: value, change: change };
    };
    /**
     * Merge two change objects into a single change object.
     *
     * @param first - The first change object of interest.
     *
     * @param second - The second change object of interest.
     *
     * @returns A new change object which represents both changes.
     */
    TextField.prototype.mergeChange = function (first, second) {
        return __spreadArrays(first, second);
    };
    /**
     * Merge two patch objects into a single patch object.
     *
     * @param first - The first patch object of interest.
     *
     * @param second - The second patch object of interest.
     *
     * @returns A new patch object which represents both patches.
     */
    TextField.prototype.mergePatch = function (first, second) {
        return __spreadArrays(first, second);
    };
    return TextField;
}(Field));
/**
 * The namespace for the module implementation details.
 */
var Private$6;
(function (Private) {
    /**
     * A type-guard function for a text field update type.
     */
    function isSplice(value) {
        return !Array.isArray(value);
    }
    Private.isSplice = isSplice;
    /**
     * Apply a splice to a text field.
     *
     * @param value - The current value of the field.
     *
     * @param splice - The splice to apply to the field.
     *
     * @param metadata - The metadata for the field.
     *
     * @param version - The current datastore version.
     *
     * @param storeId - The unique id of the datastore.
     *
     * @returns The result of the splice operation.
     */
    function applySplice(value, splice, metadata, version, storeId) {
        // Unpack the splice.
        var index = splice.index, remove = splice.remove, text = splice.text;
        // Clamp the index to the string bounds.
        if (index < 0) {
            index = Math.max(0, index + value.length);
        }
        else {
            index = Math.min(index, value.length);
        }
        // Clamp the remove count to the string bounds.
        var count = Math.min(remove, value.length - index);
        // Fetch the lower and upper identifiers.
        var lower = index === 0 ? '' : metadata.ids[index - 1];
        var upper = index === value.length ? '' : metadata.ids[index];
        // Create the ids for the splice.
        var ids = createTriplexIds(text.length, version, storeId, lower, upper);
        // Apply the splice to the ids.
        var removedIds = spliceArray(metadata.ids, index, count, ids);
        // Compute the removed text.
        var removedText = value.slice(index, index + count);
        // Create the change object.
        var change = { index: index, removed: removedText, inserted: text };
        // Create the patch object.
        var patch = { removedIds: removedIds, removedText: removedText, insertedIds: ids, insertedText: text };
        // Compute the new value.
        value = value.slice(0, index) + text + value.slice(index + count);
        // Return the splice result.
        return { change: change, patch: patch, value: value };
    }
    Private.applySplice = applySplice;
    /**
     * Apply a patch to a text field.
     *
     * @param value - The current value of the field.
     *
     * @param patch - The patch part to apply to the field.
     *
     * @param metadata - The metadata for the field.
     *
     * @returns The user-facing change array for the patch.
     */
    function applyPatch(value, patch, metadata) {
        // Unpack the patch.
        var removedIds = patch.removedIds, insertedIds = patch.insertedIds, insertedText = patch.insertedText;
        // Set up the change array.
        var change = [];
        // Process the removed identifiers, if necessary.
        if (removedIds.length > 0) {
            // Chunkify the removed identifiers,
            // or increment the removed ids in the cemetery.
            var chunks = findRemovedChunks(removedIds, metadata);
            // Process the chunks.
            while (chunks.length > 0) {
                // Pop the last-most chunk.
                var _a = chunks.pop(), index = _a.index, count = _a.count;
                // Remove the identifiers from the metadata.
                metadata.ids.splice(index, count);
                // Compute the removed text
                var removed = value.slice(index, index + count);
                // Compute the new value.
                value = value.slice(0, index) + value.slice(index + count);
                // Add the change part to the change array.
                change.push({ index: index, removed: removed, inserted: '' });
            }
        }
        // Process the inserted identifiers, if necessary.
        if (insertedIds.length > 0) {
            // Chunkify the inserted identifiers, or decrement the removed
            // ids in the cemetery.
            var chunks = findInsertedChunks(insertedIds, insertedText, metadata);
            // Process the chunks.
            while (chunks.length > 0) {
                // Pop the last-most chunk.
                var _b = chunks.pop(), index = _b.index, ids = _b.ids, text = _b.text;
                // Insert the identifiers into the metadata.
                spliceArray(metadata.ids, index, 0, ids);
                // Insert the text into the value.
                value = value.slice(0, index) + text + value.slice(index);
                // Add the change part to the change array.
                change.push({ index: index, removed: '', inserted: text });
            }
        }
        // Return the change array.
        return { change: change, value: value };
    }
    Private.applyPatch = applyPatch;
    /**
     * Convert an array of identifiers into removal chunks.
     *
     * @param ids - The ids to remove from the metadta.
     *
     * @param metadata - The metadata for the text field.
     *
     * @returns The ordered chunks to remove.
     *
     * #### Notes
     * The metadata may be mutated if concurrently removed chunks are encountered.
     */
    function findRemovedChunks(ids, metadata) {
        // Set up the chunks array.
        var chunks = [];
        // Set up the iteration index.
        var i = 0;
        // Fetch the identifier array length.
        var n = ids.length;
        // Iterate over the identifiers to remove.
        while (i < n) {
            // Find the boundary identifier for the current id.
            var j = ArrayExt.lowerBound(metadata.ids, ids[i], StringExt.cmp);
            // If the boundary is at the end of the array, or if the boundary id
            // does not match the id we are looking for, then we are dealing with
            // a concurrently deleted value. In that case, increment its reference
            // in the cemetery and continue processing ids.
            if (j === metadata.ids.length || metadata.ids[j] !== ids[i]) {
                var count_1 = metadata.cemetery[ids[i]] || 0;
                metadata.cemetery[ids[i]] = count_1 + 1;
                i++;
                continue;
            }
            // Set up the chunk index.
            var index = j;
            // Set up the chunk count.
            var count = 0;
            // Find the extent of the chunk.
            while (i < n && StringExt.cmp(ids[i], metadata.ids[j]) === 0) {
                count++;
                i++;
                j++;
            }
            // Add the chunk to the chunks array, or bump the id index.
            if (count > 0) {
                chunks.push({ index: index, count: count });
            }
            else {
                i++;
            }
        }
        // Return the computed chunks.
        return chunks;
    }
    /**
     * Convert arrays of identifiers and values into insert chunks.
     *
     * @param ids - The ids to be inserted.
     *
     * @param text - The text to be inserted.
     *
     * @param metadata - The metadata for the text field.
     *
     * @returns The ordered chunks to insert.
     *
     * #### Notes
     * The metadata may be mutated if concurrently removed chunks are encountered.
     */
    function findInsertedChunks(ids, text, metadata) {
        var indices = [];
        var insertIds = [];
        var insertText = '';
        for (var i = 0; i < ids.length; i++) {
            // Check if the id has been concurrently deleted. If so, update
            // the cemetery, and continue processing without inserting the id.
            if (checkCemeteryForInsert(ids[i], metadata.cemetery)) {
                continue;
            }
            // Add the id to the ids which will be actually inserted.
            insertIds.push(ids[i]);
            indices.push(ArrayExt.lowerBound(metadata.ids, ids[i], StringExt.cmp));
            insertText += text[i];
        }
        return chunkifyInsertions(insertIds, insertText, indices);
    }
    /**
     * Consolidate inserted IDs into a set of chunks so that we can splice them
     * into the existing value with a minimal number of splices.
     *
     * @param ids - The ids to be inserted.
     *
     * @param text - The text to be inserted. Should be the same length as ids.
     *
     * @param indices - The indices at which to insert the text. Should be the same length as ids.
     *
     * @returns The ordered chunks to insert.
     */
    function chunkifyInsertions(ids, text, indices) {
        // Set up the chunks array.
        var chunks = [];
        // Set up the loop over the ids to insert.
        var insertIndex;
        var i = 0;
        while (i < ids.length) {
            // Reset the insert chunk data
            var chunkIds = [];
            var chunkText = '';
            insertIndex = indices[i];
            // Find the extent of the chunk
            while (indices[i] === insertIndex && i < ids.length) {
                chunkIds.push(ids[i]);
                chunkText += text[i];
                i++;
            }
            if (chunkText) {
                chunks.push({ index: insertIndex, ids: chunkIds, text: chunkText });
            }
        }
        return chunks;
    }
    /**
     * Check if an id should be inserted, or if it has been concurrently deleted.
     *
     * @param id - the id to check.
     *
     * @param cemetery - the cemetery which determines whether the id should be inserted.
     *
     * @returns whether the id was found, indicating that it shouldn't be inserted.
     *
     * #### Notes
     * If the ID *is* found in the cemetery, its value in the cemetery is decremented,
     * reflecting that it is closer to being shown.
     */
    function checkCemeteryForInsert(id, cemetery) {
        var count = cemetery[id] || 0;
        if (count === 1) {
            delete cemetery[id];
            return true;
        }
        if (count > 1) {
            cemetery[id] = count - 1;
            return true;
        }
        return false;
    }
    /**
     * Splice data into an array.
     *
     * #### Notes
     * This is intentionally similar to Array.splice, but chunks the splices into
     * multiple splices so that it does not crash if the number of spliced IDs
     * is greater than the maximum number of arguments for a function.
     *
     * @param arr - the array on which to perform the splice.
     *
     * @param start - the start index for the splice.
     *
     * @param deleteCount - how many indices to remove.
     *
     * @param items - the items to splice into the array.
     *
     * @returns an array of the deleted elements.
     */
    function spliceArray(arr, start, deleteCount, items) {
        if (!items) {
            return arr.splice(start, deleteCount);
        }
        var size = 100000;
        if (items.length < size) {
            return arr.splice.apply(arr, __spreadArrays([start, deleteCount || 0], items));
        }
        var deleted = arr.splice(start, deleteCount);
        var n = Math.floor(items.length / size);
        var idx = 0;
        for (var i = 0; i < n; i++, idx += size) {
            arr.splice.apply(arr, __spreadArrays([idx, 0], items.slice(idx, size)));
        }
        arr.splice.apply(arr, __spreadArrays([idx, 0], items.slice(idx)));
        return deleted;
    }
})(Private$6 || (Private$6 = {}));

/**
 * The namespace for the `Fields` factory functions.
 */
var Fields;
(function (Fields) {
    /**
     * A factory function which creates a boolean register field.
     *
     * @param options - The options for the field. The default `value`
     *   option is `false`.
     *
     * @returns A new boolean register field.
     */
    function Boolean(options) {
        if (options === void 0) { options = {}; }
        return new RegisterField(__assign({ value: false }, options));
    }
    Fields.Boolean = Boolean;
    /**
     * A factory function which creates a number register field.
     *
     * @param options - The options for the field. The default `value`
     *   option is `0`.
     *
     * @returns A new number register field.
     */
    function Number(options) {
        if (options === void 0) { options = {}; }
        return new RegisterField(__assign({ value: 0 }, options));
    }
    Fields.Number = Number;
    /**
     * A factory function which creates a string register field.
     *
     * @param options - The options for the field. The default `value`
     *   option is `''`.
     *
     * @returns A new string register field.
     */
    function String(options) {
        if (options === void 0) { options = {}; }
        return new RegisterField(__assign({ value: '' }, options));
    }
    Fields.String = String;
    /**
     * A factory function which creates a list field.
     *
     * @param options - The options for the field.
     *
     * @returns A new list field.
     */
    function List(options) {
        if (options === void 0) { options = {}; }
        return new ListField(options);
    }
    Fields.List = List;
    /**
     * A factory function which creates a map field.
     *
     * @param options - The options for the field.
     *
     * @returns A new map field.
     */
    function Map(options) {
        if (options === void 0) { options = {}; }
        return new MapField(options);
    }
    Fields.Map = Map;
    /**
     * A factory function which creates a register field.
     *
     * @param options - The options for the field.
     *
     * @returns A new register field.
     */
    function Register(options) {
        return new RegisterField(options);
    }
    Fields.Register = Register;
    /**
     * A factory function which creates a text field.
     *
     * @param options - The options for the field.
     *
     * @returns A new text field.
     */
    function Text(options) {
        if (options === void 0) { options = {}; }
        return new TextField(options);
    }
    Fields.Text = Text;
})(Fields || (Fields = {}));

export { Datastore, Field, Fields, ListField, MapField, RegisterField, Table, TextField, validateSchema };
//# sourceMappingURL=index.es6.js.map
