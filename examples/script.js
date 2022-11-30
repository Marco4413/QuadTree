import { wCanvas, Color } from "./libs/wCanvas/wcanvas.js";
import { PointTreeElement, CircleTreeElement, QuadTree, RectTreeElement, TreeElementType } from "../QuadTree.js";
import * as QTreeLib from "../QuadTree.js"; // This is assigned to the window for debugging

/** @type {QuadTree?} */
let _Tree = null;

let _SelectedTree = null;
let _SelectedElements = { };
let _ElementType = 1;
let _WorldOriginX = 0;
let _WorldOriginY = 0;
let _WorldScale = 1;

const _MovingCircle = new CircleTreeElement({ "angle": 0, "posX": 0 }, 0, 0, 25);

const _SELECTED_TREE_COLOR = new Color("#ff0000");
const _SELECTED_ELEMENT_COLOR = new Color("#00ff00");
const _FONT_SCALE = .2;
const _MAX_FONT_SIZE = 24;

let _DragStart = { "x": 0, "y": 0 };
let _DragEnd = { "x": 0, "y": 0 };
let _Dragging = false;
let _ShowDrag = true;

const _ScreenToWorldPos = (x, y) => [
    (_WorldOriginX + x) / _WorldScale,
    (_WorldOriginY + y) / _WorldScale
];

/** @param {wCanvas} canvas */
const _DrawElement = (canvas, el) => {
    switch (el.type) {
    case TreeElementType.Circle:
        canvas.circle(el.x, el.y, el.r, { "noStroke": true });
        break;
    case TreeElementType.Rect:
        canvas.rect(el.x, el.y, el.w, el.h, { "noStroke": true });
        break;
    default: {
        const parents = _Tree.GetParentsForElement(el);
        const lastParent = parents[parents.length-1];
        const fontSize = Math.min(Math.min(lastParent._width, lastParent._height) * _FONT_SCALE, _MAX_FONT_SIZE);
        canvas.textSize(fontSize);
        canvas.text("" + el.id, el.x, el.y, { "alignment": { "horizontal": "center", "vertical": "center" }, "noStroke": true });
    }
    }
};

/** @param {Number} dt */
const _Update = (dt) => {
    _MovingCircle.data.posX = (_MovingCircle.data.posX + dt * 200) % _Tree._width;
    _MovingCircle.data.angle += dt;
    _MovingCircle.x = _Tree._x + _MovingCircle.data.posX;
    _MovingCircle.y = Math.sin(_MovingCircle.data.angle) * 200;
    _MovingCircle.r = 10 + Math.abs(Math.cos(_MovingCircle.data.angle)) * 15;
    _Tree.UpdateElement(_MovingCircle);
};

/** @param {wCanvas} canvas */
const _Draw = (canvas, dt) => {
    _Update(dt);

    canvas.background(85, 85, 85);

    canvas.save();
    canvas.translate(-_WorldOriginX, -_WorldOriginY);
    canvas.scale(_WorldScale);

    const trees = [ _Tree ];
    while (trees.length > 0) {
        const tree = trees.pop();
        trees.push(...tree._children);
        if (tree === _SelectedTree) continue;
        canvas.rect(tree._x, tree._y, tree._width, tree._height, { "noFill": true });
    }

    if (_SelectedTree != null) {
        canvas.save();
        canvas.stroke(_SELECTED_TREE_COLOR);
        canvas.rect(
            _SelectedTree._x, _SelectedTree._y,
            _SelectedTree._width, _SelectedTree._height,
            { "noFill": true }
        );
        canvas.restore();
    }

    // const elements = _Tree._elements;
    const elements = _Tree.GetElementsInRect(_WorldOriginX / _WorldScale, _WorldOriginY / _WorldScale, canvas.element.width / _WorldScale, canvas.element.height / _WorldScale);
    const selectedElements = [ ];

    canvas.save();
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];

        if (_SelectedElements[el.id]) {
            selectedElements.push(el);
            continue;
        }

        _DrawElement(canvas, el);
    }
    canvas.restore();

    canvas.save();
    canvas.fill(_SELECTED_ELEMENT_COLOR);
    for (let i = 0; i < selectedElements.length; i++)
        _DrawElement(canvas, selectedElements[i]);
    canvas.restore();

    if (_ShowDrag && _Dragging) {
        const [ startX, startY ] = _ScreenToWorldPos(_DragStart.x, _DragStart.y);
        const [ endX, endY ] = _ScreenToWorldPos(_DragEnd.x, _DragEnd.y);

        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const width = Math.abs(startX - endX);
        const height = Math.abs(startY - endY);

        canvas.stroke(255, 255, 255);
        canvas.rect(x, y, width, height, { "noFill": true });
    }
    canvas.restore();

    canvas.fill(255, 0, 0);
    canvas.textSize(_MAX_FONT_SIZE);
    canvas.text(`FPS: ${Math.floor(1 / dt)}; Drawn Elements: ${elements.length}/${_Tree._elements.length}`, 0, 0, { "alignment": { "horizontal": "left", "vertical": "top" } });
};

/**
 * @template T
 * @param {() => T} fn
 * @param {String} name
 * @returns {T}
 */
const _Bench = (fn, name = "Undefined") => {
    const start = Date.now();
    const retVal = fn();
    const dt = Date.now() - start;
    console.log(`'${ name }' Took ${dt}ms`);
    return retVal;
};

window.addEventListener("load", async () => {
    _WorldOriginX = -window.innerWidth / 2;
    _WorldOriginY = -window.innerHeight / 2;

    _Tree = new QuadTree(-960, -540, 1920, 1080, 2, 10, [ _MovingCircle ]);
    console.log(_Tree);

    new wCanvas({
        // @ts-ignore
        "onDraw": _Draw
    });

    for (let i = 0; i < 1e3; i++) {
        const x = Math.random() * _Tree._width + _Tree._x;
        const y = Math.random() * _Tree._height + _Tree._y;
        _Tree.AddElement(new CircleTreeElement({ }, x, y, Math.max(1, Math.random() * 3)));
    }

    window["QuadTree"] = QTreeLib;
    window["Tree"] = _Tree;
    window["MovingCircle"] = _MovingCircle;
});

window.addEventListener("mousemove", ev => {
    if (!_Dragging) {
        if (ev.buttons === 1) {
            _Dragging = true;
            _DragStart = { "x": ev.x, "y": ev.y };
        } else return;
    }

    _DragEnd = { "x": ev.x, "y": ev.y };
    _ShowDrag = false;

    if (ev.ctrlKey) {
        _WorldOriginX -= ev.movementX;
        _WorldOriginY -= ev.movementY;
    } else if (ev.shiftKey) {
        _ShowDrag = true;

        const [ startX, startY ] = _ScreenToWorldPos(_DragStart.x, _DragStart.y);
        const [ endX, endY ] = _ScreenToWorldPos(_DragEnd.x, _DragEnd.y);

        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const width = Math.abs(startX - endX);
        const height = Math.abs(startY - endY);

        const els = _Bench(() => _Tree.GetElementsInRect(x, y, width, height), "GetElementsInRect");
        if (els == null) return;
        _SelectedElements = { };
        for (let i = 0; i < els.length; i++) _SelectedElements[els[i].id] = els[i];
    } else _Dragging = false;
});

window.addEventListener("mouseup", ev => {
    if (!_Dragging) {
        if (_Tree == null) return;
        const [ x, y ] = _ScreenToWorldPos(ev.x, ev.y);
    
        if (ev.ctrlKey) {
            const tree = _Tree.GetChildAt(x, y);
            _SelectedTree = tree;
            
            const els = _Bench(() => _Tree.GetElementsAt(x, y), "GetElementsAt");
            if (els == null) return;
            _SelectedElements = { };
            for (let i = 0; i < els.length; i++) _SelectedElements[els[i].id] = els[i];

            return;
        }
        
        _Bench(() => {
            switch (_ElementType) {
            case TreeElementType.Circle:
                _Tree.AddElement(new CircleTreeElement({ }, x, y, 10));
                break;
            case TreeElementType.Rect:
                _Tree.AddElement(new RectTreeElement({ }, x, y, 50, 25));
                break;
            default:
                _Tree.AddElement(new PointTreeElement({ }, x, y));
            }
        }, "AddElement");
        return;
    };

    _Dragging = false;
    if (ev.shiftKey) {
        const [ startX, startY ] = _ScreenToWorldPos(_DragStart.x, _DragStart.y);
        const [ endX, endY ] = _ScreenToWorldPos(_DragEnd.x, _DragEnd.y);

        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const width = Math.abs(startX - endX);
        const height = Math.abs(startY - endY);
    
        const els = _Bench(() => _Tree.GetElementsInRect(x, y, width, height), "GetElementsInRect");
        console.log(els);
    }
});

// window.addEventListener("mousemove", ev => {
//     if (!ev.ctrlKey) return;
//     _WorldOriginX -= ev.movementX;
//     _WorldOriginY -= ev.movementY;
// });

const _Zoom = (dir) => {
    const newScale = _WorldScale + dir * .1 * _WorldScale;
    if (newScale > 0) _WorldScale = newScale;
};

window.addEventListener("wheel", ev => _Zoom(Math.sign(-ev.deltaY)));


window.addEventListener("keydown", ev => {
    switch (ev.key) {
    case "+":
        _Zoom(1);
        break;
    case "-":
        _Zoom(-1);
        break;
    }
});

window.addEventListener("keyup", ev => {
    switch (ev.key) {
    case "Backspace":
        _Bench(() => {
            for (const k of Object.keys(_SelectedElements))
                _Tree.RemoveElement(_SelectedElements[k]);
            _SelectedElements = { };
        }, "RemoveElement");
        break;
    default: {
        const n = Number.parseInt(ev.key);
        if (!Number.isNaN(n)) _ElementType = n;
    }
    }
});

// window.addEventListener("resize", ev => {
//     _Tree = _Bench(() => _Tree.CreateResized(
//         0, 0, window.innerWidth, window.innerHeight
//     ), "Tree Resize", true);
//     console.log(_Tree);
// });

