import { wCanvas, Color } from "./libs/wCanvas/wcanvas.js";
import { PointTreeElement, CircleTreeElement, QuadTree, RectTreeElement, TreeElementType } from "../QuadTree.js";

/** @type {QuadTree?} */
let _Tree = null;

let _SelectedTree = null;
let _SelectedElements = { };
let _ElementType = 1;
let _WorldOriginX = 0;
let _WorldOriginY = 0;
let _WorldScale = 1;

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
    default:
        const fontSize = Math.min(Math.min(el.parent._width, el.parent._height) * _FONT_SCALE, _MAX_FONT_SIZE);
        canvas.textSize(fontSize);
        canvas.text("" + el.id, el.x, el.y, { "alignment": { "horizontal": "center", "vertical": "center" }, "noStroke": true });
    }
};

/** @param {wCanvas} canvas */
const _Draw = (canvas) => {
    canvas.background(85, 85, 85);

    canvas.translate(-_WorldOriginX, -_WorldOriginY);
    canvas.scale(_WorldScale);

    canvas.textSize(_MAX_FONT_SIZE);
    canvas.text(`${_Tree._elements.length} Elements`, _Tree._x + 5, _Tree._y + 5, { "alignment": { "vertical": "top" } });

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

    const elements = _Tree._elements;
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

    _Tree = new QuadTree(-960, -540, 1920, 1080, 2, 5);
    console.log(_Tree);

    new wCanvas({
        // @ts-ignore
        "onDraw": _Draw
    });
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
        for (let i = 0; i < els.length; i++) _SelectedElements[els[i].id] = true
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
            for (let i = 0; i < els.length; i++) _SelectedElements[els[i].id] = true;

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

window.addEventListener("wheel", ev => {
    const newScale = _WorldScale + Math.sign(-ev.deltaY) * .1 * _WorldScale;
    if (newScale > 0) _WorldScale = newScale;
});

window.addEventListener("keypress", ev => {
    const n = Number.parseInt(ev.key);
    if (!Number.isNaN(n)) _ElementType = n;
});

// window.addEventListener("resize", ev => {
//     _Tree = _Bench(() => _Tree.CreateResized(
//         0, 0, window.innerWidth, window.innerHeight
//     ), "Tree Resize", true);
//     console.log(_Tree);
// });

