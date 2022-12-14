/**
 * @file A QuadTree implementation using Vanilla JavaScript and no dependencies.
 * @author Marco4413 <{@link https://github.com/Marco4413}>
 * @license
 * Copyright (c) 2022 Marco4413 ({@link https://github.com/Marco4413/QuadTree})
 * 
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 * 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

// TODO: Document Everything

let _LastID = 0;
/** Generated a Unique ID within the QuadTree library. */
export const GenerateID = () => ++_LastID;

/** @enum {Number} Basic TreeElement Types. */
export const TreeElementType = {
    "Unknown": 0,
    "Point": 1,
    "Circle": 2,
    "Rect": 3,
    "Rectangle": 3
};

/** A class representing an object which can be added to a {@link QuadTree}. */
export class AbstractTreeElement {
    constructor(data, type = TreeElementType.Unknown) {
        /** @type {Number} This element's id generated using {@link GenerateID}. */
        this.id = GenerateID();
        /** @type {Object} Generic element data. */
        this.data = data;
        /** @type {TreeElementType} The type of the element. Useful to quickly check the bounding shape of the element. */
        this.type = type;
    }

    /**
     * Checks if this element is within a rectangle.
     * @param {Number} x The x pos of the top-left corner of the rectangle.
     * @param {Number} y The y pos of the top-left corner of the rectangle.
     * @param {Number} width The width of the rectangle.
     * @param {Number} height The height of the rectangle.
     * @returns {Boolean} Whether or not this element is inside the rectangle.
     */
    IsInsideRect(x, y, width, height) {
        return false;
    }
}

export class PointTreeElement extends AbstractTreeElement {
    constructor(data, x, y) {
        super(data, TreeElementType.Point);
        this.x = x;
        this.y = y;
    }

    /** @inheritdoc */
    IsInsideRect(x, y, width, height) {
        return (
            this.x >= x &&
            this.y >= y &&
            this.x <  x + width &&
            this.y <  y + height
        );
    }
}

export class CircleTreeElement extends AbstractTreeElement {
    constructor(data, x, y, r) {
        super(data, TreeElementType.Circle);
        this.x = x;
        this.y = y;
        this.r = r;
    }

    /** @inheritdoc */
    IsInsideRect(x, y, width, height) {
        let closestX = this.x;
        let closestY = this.y;
      
        if (this.x < x) closestX = x;
        else if (this.x > x + width) closestX = x + width;
        
        if (this.y < y) closestY = y;
        else if (this.y > y + height) closestY = y + height;
      
        let distX = this.x - closestX;
        let distY = this.y - closestY;
        let sqDistance = distX * distX + distY * distY;
      
        return sqDistance <= (this.r * this.r);
    }
}

export class RectTreeElement extends AbstractTreeElement {
    constructor(data, x, y, w, h) {
        super(data, TreeElementType.Rect);
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    /** @inheritdoc */
    IsInsideRect(x, y, width, height) {
        return (
            this.x < (x + width ) && (this.x + this.w) > x &&
            this.y < (y + height) && (this.y + this.h) > y
        );
    }
}

export const RectangleTreeElement = RectTreeElement;

export class QuadTree {
    /**
     * @param {Number} x
     * @param {Number} y
     * @param {Number} width
     * @param {Number} height
     * @param {Number} [maxElements]
     * @param {Number} [maxDepth]
     * @param {AbstractTreeElement[]} [initialElements]
     * @param {QuadTree?} [parent]
     */
    constructor(x, y, width, height, maxElements = 50, maxDepth = -1, initialElements = [ ], parent = null) {
        this._x = x, this._y = y;
        this._width = width, this._height = height;
        this._maxElements = maxElements;
        /** @type {AbstractTreeElement[]} */
        this._elements = [ ];
        /** @type {Record<Number, QuadTree[]>} */
        this._elementsParents = null;
        /** @type {QuadTree[]} */
        this._children = [ ];
        /** @type {QuadTree?} */
        this._root = null;
        /** @type {Number} */
        this._depth = 0;
        this._parent = parent;
        this._maxDepth = maxDepth;

        if (parent == null) {
            this._elementsParents = { };
            for (let i = 0; i < initialElements.length; i++)
                this.AddElement(initialElements[i]);
            return;
        }

        this._root = parent._root ?? parent
        this._depth = parent._depth + 1;
        for (let i = 0; i < parent._elements.length; i++)
            this.AddElement(parent._elements[i]);
    }

    GetX() { return this._x; }
    GetY() { return this._y; }
    GetWidth() { return this._width; }
    GetHeight() { return this._height; }

    /**
     * Checks if the specified point is in bounds.
     * @param {Number} x
     * @param {Number} y
     */
    IsPointInBounds(x, y) {
        return (
            x >= this._x &&
            y >= this._y &&
            x < this._x + this._width &&
            y < this._y + this._height
        );
    }

    /**
     * Checks if the specified rect is in bounds.
     * @param {Number} x
     * @param {Number} y
     * @param {Number} width
     * @param {Number} height
     */
    IsRectInBounds(x, y, width, height) {
        return (
            this._x < (x + width ) && (this._x + this._width ) > x &&
            this._y < (y + height) && (this._y + this._height) > y
        );
    }

    GetMaxElements() { return this._maxElements; }

    IsRoot() { return this._root == null; }
    GetRoot() { return this._root; }

    GetDepth() { return this._depth; }
    GetMaxDepth() { return this._maxDepth; }
    GetParent() { return this._parent; }

    IsSplit() { return this._children.length > 0; }
    GetChildren() { return this._children.slice(); }

    GetChildAt(x, y) {
        /** @type {QuadTree[]} */
        const treePool = [ this ];
        while (treePool.length > 0) {
            const tree = treePool.pop();
            if (!tree.IsPointInBounds(x, y)) continue;
    
            if (tree.IsSplit()) {
                treePool.push(...tree._children);
            } else return tree;
        }
        return null;
    }

    _GetParentsForElement(element, create = false) {
        const rootTree = this._root ?? this; // If no root is set then this Tree is the root
        if (create && rootTree._elementsParents[element.id] == null)
            rootTree._elementsParents[element.id] = [ ];
        return rootTree._elementsParents[element.id] ?? null;
    }

    _RemoveParentsForElement(element) {
        const rootTree = this._root ?? this;
        rootTree._elementsParents[element.id] = undefined;
    }

    /**
     * @param {AbstractTreeElement} element
     * @returns {QuadTree[]?}
     */
    GetParentsForElement(element) {
        const parents = this._GetParentsForElement(element, false);
        return parents?.slice();
    }

    /**
     * @param {AbstractTreeElement} element
     * @returns {Boolean}
     */
    AddElement(element) {
        const elParents = this._GetParentsForElement(element, true);
        const initialParentCount = elParents.length;

        /** @type {QuadTree[]} */
        const treePool = [ this ];
        while (treePool.length > 0) {
            const tree = treePool.pop();
            if (!element.IsInsideRect(tree._x, tree._y, tree._width, tree._height)) continue;
            elParents.push(tree);
            tree._elements.push(element);
    
            if (tree.IsSplit()) {
                treePool.push(...tree._children);
            } else if ((tree._maxDepth < 0 || tree._depth < tree._maxDepth) && tree._elements.length > tree._maxElements) {
                const halfWidth = tree._width / 2;
                const halfHeight = tree._height / 2;
                tree._children = [
                    new QuadTree(tree._x, tree._y, halfWidth, halfHeight, tree._maxElements, tree._maxDepth, undefined, tree),
                    new QuadTree(tree._x + halfWidth, tree._y, halfWidth, halfHeight, tree._maxElements, tree._maxDepth, undefined, tree),
                    new QuadTree(tree._x, tree._y + halfHeight, halfWidth, halfHeight, tree._maxElements, tree._maxDepth, undefined, tree),
                    new QuadTree(tree._x + halfWidth, tree._y + halfHeight, halfWidth, halfHeight, tree._maxElements, tree._maxDepth, undefined, tree)
                ];
            }
        }

        return elParents.length > initialParentCount;
    }

    /**
     * @param {AbstractTreeElement} element
     * @returns {Boolean}
    */
    RemoveElement(element) {
        if (!this.HasElement(element)) return false;
        
        const elParents = this._GetParentsForElement(element, false);
        while (elParents.length > 0) {
            const tree = elParents.pop();
            const elIdx = tree._elements.indexOf(element);
            tree._elements.splice(elIdx, 1);
        }

        this._RemoveParentsForElement(element);
        return true;
    }

    /**
     * @param {AbstractTreeElement} element
     * @returns {Boolean}
     */
    UpdateElement(element) {
        if (this.RemoveElement(element))
            return this.AddElement(element);
        return false;
    }

    /**
     * @param {AbstractTreeElement} element
     * @returns {Boolean}
     */
    HasElement(element) {
        const parents = this._GetParentsForElement(element);
        return parents != null && parents.indexOf(this) >= 0;
    }

    GetElements() { return this._elements.slice(); }

    /**
     * @param {Number} x
     * @param {Number} y
     * @returns {AbstractTreeElement[]}
     */
    GetElementsAt(x, y) {
        /** @type {QuadTree[]} */
        const treePool = [ this ];
        while (treePool.length > 0) {
            const tree = treePool.pop();
            if (tree._elements.length === 0 || !tree.IsPointInBounds(x, y)) continue;
    
            if (tree.IsSplit()) {
                treePool.push(...tree._children);
            } else return tree.GetElements();
        }
        return [ ];
    }

    /**
     * @param {Number} x
     * @param {Number} y
     * @param {Number} width
     * @param {Number} height
     * @param {Boolean} filterDuplicates
     * @returns {AbstractTreeElement[]}
     */
    GetElementsInRect(x, y, width, height, filterDuplicates = true) {
        const elements = [ ];

        /** @type {QuadTree[]} */
        const treePool = [ this ];
        while (treePool.length > 0) {
            const tree = treePool.pop();
            if (tree._elements.length === 0 || !tree.IsRectInBounds(x, y, width, height)) continue;
    
            if (tree.IsSplit()) {
                treePool.push(...tree._children);
            } else elements.push(...tree._elements);
        }

        const seenElements = { };
        return !filterDuplicates ? elements : elements.filter(el => {
            if (seenElements[el.id]) return false;
            seenElements[el.id] = true;
            return true;
        });
    }

    /**
     * Creates a new instance of {@link QuadTree} which inherits all properties of this but with a different size.
     * @param {Number} [x]
     * @param {Number} [y]
     * @param {Number} [width]
     * @param {Number} [height]
     */
    CreateResized(x, y, width, height) {
        return new QuadTree(
            x ?? this._x, y ?? this._y,
            width ?? this._width, height ?? this._height,
            this._maxElements, this._maxDepth,
            this._elements
        );
    }
}
