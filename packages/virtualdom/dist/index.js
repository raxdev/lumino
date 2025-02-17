(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@lumino/algorithm')) :
    typeof define === 'function' && define.amd ? define(['exports', '@lumino/algorithm'], factory) :
    (global = global || self, factory(global.lumino_virtualdom = {}, global.lumino_algorithm));
}(this, (function (exports, algorithm) { 'use strict';

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
     * A virtual node which represents plain text content.
     *
     * #### Notes
     * User code will not typically create a `VirtualText` node directly.
     * Instead, the `h()` function will be used to create an element tree.
     */
    var VirtualText = /** @class */ (function () {
        /**
         * Construct a new virtual text node.
         *
         * @param content - The text content for the node.
         */
        function VirtualText(content) {
            /**
             * The type of the node.
             *
             * This value can be used as a type guard for discriminating the
             * `VirtualNode` union type.
             */
            this.type = 'text';
            this.content = content;
        }
        return VirtualText;
    }());
    /**
     * A virtual node which represents an HTML element.
     *
     * #### Notes
     * User code will not typically create a `VirtualElement` node directly.
     * Instead, the `h()` function will be used to create an element tree.
     */
    var VirtualElement = /** @class */ (function () {
        /**
         * Construct a new virtual element node.
         *
         * @param tag - The element tag name.
         *
         * @param attrs - The element attributes.
         *
         * @param children - The element children.
         *
         * @param renderer - An optional custom renderer for the element.
         */
        function VirtualElement(tag, attrs, children, renderer) {
            /**
             * The type of the node.
             *
             * This value can be used as a type guard for discriminating the
             * `VirtualNode` union type.
             */
            this.type = 'element';
            this.tag = tag;
            this.attrs = attrs;
            this.children = children;
            this.renderer = renderer;
        }
        return VirtualElement;
    }());
    /**
     * DEPRECATED - use VirtualElement with a defined renderer param instead.
     * This class is provided as a backwards compatibility shim
     *
     * A "pass thru" virtual node whose children are managed by a render and an
     * unrender callback. The intent of this flavor of virtual node is to make
     * it easy to blend other kinds of virtualdom (eg React) into Phosphor's
     * virtualdom.
     *
     * #### Notes
     * User code will not typically create a `VirtualElementPass` node directly.
     * Instead, the `hpass()` function will be used to create an element tree.
     */
    var VirtualElementPass = /** @class */ (function (_super) {
        __extends(VirtualElementPass, _super);
        /**
         * DEPRECATED - use VirtualElement with a defined renderer param instead
         *
         * Construct a new virtual element pass thru node.
         *
         * @param tag - the tag of the parent element of this node. Once the parent
         * element is rendered, it will be passed as an argument to
         * renderer.render
         *
         * @param attrs - attributes that will assigned to the
         * parent element
         *
         * @param renderer - an object with render and unrender
         * functions, each of which should take a single argument of type
         * HTMLElement and return nothing. If null, the parent element
         * will be rendered barren without any children.
         */
        function VirtualElementPass(tag, attrs, renderer) {
            return _super.call(this, tag, attrs, [], renderer || undefined) || this;
        }
        return VirtualElementPass;
    }(VirtualElement));
    function h(tag) {
        var attrs = {};
        var renderer;
        var children = [];
        for (var i = 1, n = arguments.length; i < n; ++i) {
            var arg = arguments[i];
            if (typeof arg === 'string') {
                children.push(new VirtualText(arg));
            }
            else if (arg instanceof VirtualText) {
                children.push(arg);
            }
            else if (arg instanceof VirtualElement) {
                children.push(arg);
            }
            else if (arg instanceof Array) {
                extend(children, arg);
            }
            else if ((i === 1 || i === 2) && arg && typeof arg === 'object') {
                if ("render" in arg) {
                    renderer = arg;
                }
                else {
                    attrs = arg;
                }
            }
        }
        return new VirtualElement(tag, attrs, children, renderer);
        function extend(array, values) {
            for (var _i = 0, values_1 = values; _i < values_1.length; _i++) {
                var child = values_1[_i];
                if (typeof child === 'string') {
                    array.push(new VirtualText(child));
                }
                else if (child instanceof VirtualText) {
                    array.push(child);
                }
                else if (child instanceof VirtualElement) {
                    array.push(child);
                }
            }
        }
    }
    /**
     * The namespace for the `h` function statics.
     */
    (function (h) {
        h.a = h.bind(undefined, 'a');
        h.abbr = h.bind(undefined, 'abbr');
        h.address = h.bind(undefined, 'address');
        h.area = h.bind(undefined, 'area');
        h.article = h.bind(undefined, 'article');
        h.aside = h.bind(undefined, 'aside');
        h.audio = h.bind(undefined, 'audio');
        h.b = h.bind(undefined, 'b');
        h.bdi = h.bind(undefined, 'bdi');
        h.bdo = h.bind(undefined, 'bdo');
        h.blockquote = h.bind(undefined, 'blockquote');
        h.br = h.bind(undefined, 'br');
        h.button = h.bind(undefined, 'button');
        h.canvas = h.bind(undefined, 'canvas');
        h.caption = h.bind(undefined, 'caption');
        h.cite = h.bind(undefined, 'cite');
        h.code = h.bind(undefined, 'code');
        h.col = h.bind(undefined, 'col');
        h.colgroup = h.bind(undefined, 'colgroup');
        h.data = h.bind(undefined, 'data');
        h.datalist = h.bind(undefined, 'datalist');
        h.dd = h.bind(undefined, 'dd');
        h.del = h.bind(undefined, 'del');
        h.dfn = h.bind(undefined, 'dfn');
        h.div = h.bind(undefined, 'div');
        h.dl = h.bind(undefined, 'dl');
        h.dt = h.bind(undefined, 'dt');
        h.em = h.bind(undefined, 'em');
        h.embed = h.bind(undefined, 'embed');
        h.fieldset = h.bind(undefined, 'fieldset');
        h.figcaption = h.bind(undefined, 'figcaption');
        h.figure = h.bind(undefined, 'figure');
        h.footer = h.bind(undefined, 'footer');
        h.form = h.bind(undefined, 'form');
        h.h1 = h.bind(undefined, 'h1');
        h.h2 = h.bind(undefined, 'h2');
        h.h3 = h.bind(undefined, 'h3');
        h.h4 = h.bind(undefined, 'h4');
        h.h5 = h.bind(undefined, 'h5');
        h.h6 = h.bind(undefined, 'h6');
        h.header = h.bind(undefined, 'header');
        h.hr = h.bind(undefined, 'hr');
        h.i = h.bind(undefined, 'i');
        h.iframe = h.bind(undefined, 'iframe');
        h.img = h.bind(undefined, 'img');
        h.input = h.bind(undefined, 'input');
        h.ins = h.bind(undefined, 'ins');
        h.kbd = h.bind(undefined, 'kbd');
        h.label = h.bind(undefined, 'label');
        h.legend = h.bind(undefined, 'legend');
        h.li = h.bind(undefined, 'li');
        h.main = h.bind(undefined, 'main');
        h.map = h.bind(undefined, 'map');
        h.mark = h.bind(undefined, 'mark');
        h.meter = h.bind(undefined, 'meter');
        h.nav = h.bind(undefined, 'nav');
        h.noscript = h.bind(undefined, 'noscript');
        h.object = h.bind(undefined, 'object');
        h.ol = h.bind(undefined, 'ol');
        h.optgroup = h.bind(undefined, 'optgroup');
        h.option = h.bind(undefined, 'option');
        h.output = h.bind(undefined, 'output');
        h.p = h.bind(undefined, 'p');
        h.param = h.bind(undefined, 'param');
        h.pre = h.bind(undefined, 'pre');
        h.progress = h.bind(undefined, 'progress');
        h.q = h.bind(undefined, 'q');
        h.rp = h.bind(undefined, 'rp');
        h.rt = h.bind(undefined, 'rt');
        h.ruby = h.bind(undefined, 'ruby');
        h.s = h.bind(undefined, 's');
        h.samp = h.bind(undefined, 'samp');
        h.section = h.bind(undefined, 'section');
        h.select = h.bind(undefined, 'select');
        h.small = h.bind(undefined, 'small');
        h.source = h.bind(undefined, 'source');
        h.span = h.bind(undefined, 'span');
        h.strong = h.bind(undefined, 'strong');
        h.sub = h.bind(undefined, 'sub');
        h.summary = h.bind(undefined, 'summary');
        h.sup = h.bind(undefined, 'sup');
        h.table = h.bind(undefined, 'table');
        h.tbody = h.bind(undefined, 'tbody');
        h.td = h.bind(undefined, 'td');
        h.textarea = h.bind(undefined, 'textarea');
        h.tfoot = h.bind(undefined, 'tfoot');
        h.th = h.bind(undefined, 'th');
        h.thead = h.bind(undefined, 'thead');
        h.time = h.bind(undefined, 'time');
        h.title = h.bind(undefined, 'title');
        h.tr = h.bind(undefined, 'tr');
        h.track = h.bind(undefined, 'track');
        h.u = h.bind(undefined, 'u');
        h.ul = h.bind(undefined, 'ul');
        h.var_ = h.bind(undefined, 'var');
        h.video = h.bind(undefined, 'video');
        h.wbr = h.bind(undefined, 'wbr');
    })(h || (h = {}));
    function hpass(tag) {
        var attrs = {};
        var renderer = null;
        if (arguments.length === 2) {
            var arg = arguments[1];
            if ("render" in arg) {
                renderer = arg;
            }
            else {
                attrs = arg;
            }
        }
        else if (arguments.length === 3) {
            attrs = arguments[1];
            renderer = arguments[2];
        }
        else if (arguments.length > 3) {
            throw new Error("hpass() should be called with 1, 2, or 3 arguments");
        }
        return new VirtualElementPass(tag, attrs, renderer);
    }
    (function (VirtualDOM) {
        function realize(node) {
            return Private.createDOMNode(node);
        }
        VirtualDOM.realize = realize;
        /**
         * Render virtual DOM content into a host element.
         *
         * @param content - The virtual DOM content to render.
         *
         * @param host - The host element for the rendered content.
         *
         * #### Notes
         * This renders the delta from the previous rendering. It assumes that
         * the content of the host element is not manipulated by external code.
         *
         * Providing `null` content will clear the rendering.
         *
         * Externally modifying the provided content or the host element will
         * result in undefined rendering behavior.
         */
        function render(content, host) {
            var oldContent = Private.hostMap.get(host) || [];
            var newContent = Private.asContentArray(content);
            Private.hostMap.set(host, newContent);
            Private.updateContent(host, oldContent, newContent);
        }
        VirtualDOM.render = render;
    })(exports.VirtualDOM || (exports.VirtualDOM = {}));
    /**
     * The namespace for the module implementation details.
     */
    var Private;
    (function (Private) {
        /**
         * A weak mapping of host element to virtual DOM content.
         */
        Private.hostMap = new WeakMap();
        /**
         * Cast a content value to a content array.
         */
        function asContentArray(value) {
            if (!value) {
                return [];
            }
            if (value instanceof Array) {
                return value;
            }
            return [value];
        }
        Private.asContentArray = asContentArray;
        function createDOMNode(node) {
            var host = arguments[1] || null;
            var before = arguments[2] || null;
            if (host) {
                host.insertBefore(createDOMNode(node), before);
            }
            else {
                // Create a text node for a virtual text node.
                if (node.type === 'text') {
                    return document.createTextNode(node.content);
                }
                // Create the HTML element with the specified tag.
                host = document.createElement(node.tag);
                // Add the attributes for the new element.
                addAttrs(host, node.attrs);
                if (node.renderer) {
                    node.renderer.render(host, { attrs: node.attrs, children: node.children });
                    return host;
                }
                // Recursively populate the element with child content.
                for (var i = 0, n = node.children.length; i < n; ++i) {
                    createDOMNode(node.children[i], host);
                }
            }
            return host;
        }
        Private.createDOMNode = createDOMNode;
        /**
         * Update a host element with the delta of the virtual content.
         *
         * This is the core "diff" algorithm. There is no explicit "patch"
         * phase. The host is patched at each step as the diff progresses.
         */
        function updateContent(host, oldContent, newContent) {
            // Bail early if the content is identical.
            if (oldContent === newContent) {
                return;
            }
            // Collect the old keyed elems into a mapping.
            var oldKeyed = collectKeys(host, oldContent);
            // Create a copy of the old content which can be modified in-place.
            var oldCopy = oldContent.slice();
            // Update the host with the new content. The diff always proceeds
            // forward and never modifies a previously visited index. The old
            // copy array is modified in-place to reflect the changes made to
            // the host children. This causes the stale nodes to be pushed to
            // the end of the host node and removed at the end of the loop.
            var currElem = host.firstChild;
            var newCount = newContent.length;
            for (var i = 0; i < newCount; ++i) {
                // If the old content is exhausted, create a new node.
                if (i >= oldCopy.length) {
                    createDOMNode(newContent[i], host);
                    continue;
                }
                // Lookup the old and new virtual nodes.
                var oldVNode = oldCopy[i];
                var newVNode = newContent[i];
                // If both elements are identical, there is nothing to do.
                if (oldVNode === newVNode) {
                    currElem = currElem.nextSibling;
                    continue;
                }
                // Handle the simplest case of in-place text update first.
                if (oldVNode.type === 'text' && newVNode.type === 'text') {
                    currElem.textContent = newVNode.content;
                    currElem = currElem.nextSibling;
                    continue;
                }
                // If the old or new node is a text node, the other node is now
                // known to be an element node, so create and insert a new node.
                if (oldVNode.type === 'text' || newVNode.type === 'text') {
                    algorithm.ArrayExt.insert(oldCopy, i, newVNode);
                    createDOMNode(newVNode, host, currElem);
                    continue;
                }
                // If the old XOR new node has a custom renderer,
                // create and insert a new node.
                if (!(oldVNode.renderer) != !(newVNode.renderer)) {
                    algorithm.ArrayExt.insert(oldCopy, i, newVNode);
                    createDOMNode(newVNode, host, currElem);
                    continue;
                }
                // At this point, both nodes are known to be element nodes.
                // If the new elem is keyed, move an old keyed elem to the proper
                // location before proceeding with the diff. The search can start
                // at the current index, since the unmatched old keyed elems are
                // pushed forward in the old copy array.
                var newKey = newVNode.attrs.key;
                if (newKey && newKey in oldKeyed) {
                    var pair = oldKeyed[newKey];
                    if (pair.vNode !== oldVNode) {
                        algorithm.ArrayExt.move(oldCopy, oldCopy.indexOf(pair.vNode, i + 1), i);
                        host.insertBefore(pair.element, currElem);
                        oldVNode = pair.vNode;
                        currElem = pair.element;
                    }
                }
                // If both elements are identical, there is nothing to do.
                if (oldVNode === newVNode) {
                    currElem = currElem.nextSibling;
                    continue;
                }
                // If the old elem is keyed and does not match the new elem key,
                // create a new node. This is necessary since the old keyed elem
                // may be matched at a later point in the diff.
                var oldKey = oldVNode.attrs.key;
                if (oldKey && oldKey !== newKey) {
                    algorithm.ArrayExt.insert(oldCopy, i, newVNode);
                    createDOMNode(newVNode, host, currElem);
                    continue;
                }
                // If the tags are different, create a new node.
                if (oldVNode.tag !== newVNode.tag) {
                    algorithm.ArrayExt.insert(oldCopy, i, newVNode);
                    createDOMNode(newVNode, host, currElem);
                    continue;
                }
                // At this point, the element can be updated in-place.
                // Update the element attributes.
                updateAttrs(currElem, oldVNode.attrs, newVNode.attrs);
                // Update the element content.
                if (newVNode.renderer) {
                    newVNode.renderer.render(currElem, { attrs: newVNode.attrs, children: newVNode.children });
                }
                else {
                    updateContent(currElem, oldVNode.children, newVNode.children);
                }
                // Step to the next sibling element.
                currElem = currElem.nextSibling;
            }
            // Cleanup stale DOM
            removeContent(host, oldCopy, newCount, true);
        }
        Private.updateContent = updateContent;
        /**
         * Handle cleanup of stale vdom and its associated DOM. The host node is
         * traversed recursively (in depth-first order), and any explicit cleanup
         * required by a child node is carried out when it is visited (eg if a node
         * has a custom renderer, the renderer.unrender function will be called).
         * Once the subtree beneath each child of host has been completely visited,
         * that child will be removed via a call to host.removeChild.
         */
        function removeContent(host, oldContent, newCount, _sentinel) {
            // Dispose of the old nodes pushed to the end of the host.
            for (var i = oldContent.length - 1; i >= newCount; --i) {
                var oldNode = oldContent[i];
                var child = (_sentinel ? host.lastChild : host.childNodes[i]);
                // recursively clean up host children
                if (oldNode.type === 'text') ;
                else if (oldNode.renderer && oldNode.renderer.unrender) {
                    oldNode.renderer.unrender(child, { attrs: oldNode.attrs, children: oldNode.children });
                }
                else {
                    removeContent(child, oldNode.children, 0, false);
                }
                if (_sentinel) {
                    host.removeChild(child);
                }
            }
        }
        /**
         * A set of special-cased attribute names.
         */
        var specialAttrs = {
            'key': true,
            'className': true,
            'htmlFor': true,
            'dataset': true,
            'style': true,
        };
        /**
         * Add element attributes to a newly created HTML element.
         */
        function addAttrs(element, attrs) {
            // Add the inline event listeners and node attributes.
            for (var name_1 in attrs) {
                if (name_1 in specialAttrs) {
                    continue;
                }
                if (name_1.substr(0, 2) === 'on') {
                    element[name_1] = attrs[name_1];
                }
                else {
                    element.setAttribute(name_1, attrs[name_1]);
                }
            }
            // Add the element `class` attribute.
            if (attrs.className !== undefined) {
                element.setAttribute('class', attrs.className);
            }
            // Add the element `for` attribute.
            if (attrs.htmlFor !== undefined) {
                element.setAttribute('for', attrs.htmlFor);
            }
            // Add the dataset values.
            if (attrs.dataset) {
                addDataset(element, attrs.dataset);
            }
            // Add the inline styles.
            if (attrs.style) {
                addStyle(element, attrs.style);
            }
        }
        /**
         * Update the element attributes of an HTML element.
         */
        function updateAttrs(element, oldAttrs, newAttrs) {
            // Do nothing if the attrs are the same object.
            if (oldAttrs === newAttrs) {
                return;
            }
            // Setup the strongly typed loop variable.
            var name;
            // Remove attributes and listeners which no longer exist.
            for (name in oldAttrs) {
                if (name in specialAttrs || name in newAttrs) {
                    continue;
                }
                if (name.substr(0, 2) === 'on') {
                    element[name] = null;
                }
                else {
                    element.removeAttribute(name);
                }
            }
            // Add and update new and existing attributes and listeners.
            for (name in newAttrs) {
                if (name in specialAttrs || oldAttrs[name] === newAttrs[name]) {
                    continue;
                }
                if (name.substr(0, 2) === 'on') {
                    element[name] = newAttrs[name];
                }
                else {
                    element.setAttribute(name, newAttrs[name]);
                }
            }
            // Update the element `class` attribute.
            if (oldAttrs.className !== newAttrs.className) {
                if (newAttrs.className !== undefined) {
                    element.setAttribute('class', newAttrs.className);
                }
                else {
                    element.removeAttribute('class');
                }
            }
            // Add the element `for` attribute.
            if (oldAttrs.htmlFor !== newAttrs.htmlFor) {
                if (newAttrs.htmlFor !== undefined) {
                    element.setAttribute('for', newAttrs.htmlFor);
                }
                else {
                    element.removeAttribute('for');
                }
            }
            // Update the dataset values.
            if (oldAttrs.dataset !== newAttrs.dataset) {
                updateDataset(element, oldAttrs.dataset || {}, newAttrs.dataset || {});
            }
            // Update the inline styles.
            if (oldAttrs.style !== newAttrs.style) {
                updateStyle(element, oldAttrs.style || {}, newAttrs.style || {});
            }
        }
        /**
         * Add dataset values to a newly created HTML element.
         */
        function addDataset(element, dataset) {
            for (var name_2 in dataset) {
                element.setAttribute("data-" + name_2, dataset[name_2]);
            }
        }
        /**
         * Update the dataset values of an HTML element.
         */
        function updateDataset(element, oldDataset, newDataset) {
            for (var name_3 in oldDataset) {
                if (!(name_3 in newDataset)) {
                    element.removeAttribute("data-" + name_3);
                }
            }
            for (var name_4 in newDataset) {
                if (oldDataset[name_4] !== newDataset[name_4]) {
                    element.setAttribute("data-" + name_4, newDataset[name_4]);
                }
            }
        }
        /**
         * Add inline style values to a newly created HTML element.
         */
        function addStyle(element, style) {
            var elemStyle = element.style;
            var name;
            for (name in style) {
                elemStyle[name] = style[name];
            }
        }
        /**
         * Update the inline style values of an HTML element.
         */
        function updateStyle(element, oldStyle, newStyle) {
            var elemStyle = element.style;
            var name;
            for (name in oldStyle) {
                if (!(name in newStyle)) {
                    elemStyle[name] = '';
                }
            }
            for (name in newStyle) {
                if (oldStyle[name] !== newStyle[name]) {
                    elemStyle[name] = newStyle[name];
                }
            }
        }
        /**
         * Collect a mapping of keyed elements for the host content.
         */
        function collectKeys(host, content) {
            var node = host.firstChild;
            var keyMap = Object.create(null);
            for (var _i = 0, content_1 = content; _i < content_1.length; _i++) {
                var vNode = content_1[_i];
                if (vNode.type === 'element' && vNode.attrs.key) {
                    keyMap[vNode.attrs.key] = { vNode: vNode, element: node };
                }
                node = node.nextSibling;
            }
            return keyMap;
        }
    })(Private || (Private = {}));

    exports.VirtualElement = VirtualElement;
    exports.VirtualElementPass = VirtualElementPass;
    exports.VirtualText = VirtualText;
    exports.h = h;
    exports.hpass = hpass;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=index.js.map
