// @flow
/**
 * Utility functions for constructing and manipulating multi-items.
 *
 * These functions apply *specifically* to Items and ItemTrees - things that
 * actually semantically *are* multi-items. For more general functions for
 * traversing and manipulating *anything* shaped like a multi-item (like a
 * renderer tree or a score tree or, well, a multi-item), see trees.js.
 */
import type {
    Item, ItemTree, ContentNode, HintNode, ItemObjectNode,
} from "./item-types.js";
import type {Shape} from "./shape-types.js";

const {buildMapper} = require("./trees.js");
const shapes = require("./shapes.js");

/**
 * Return a semantically empty ItemTree that conforms to the given shape.
 *
 * - An empty content node has an empty content string and no widgets/images.
 * - An empty hint node has an empty content string and no widgets/images.
 * - An empty array node has no elements.
 * - An empty object node has a semantically empty node for each of its keys.
 *   (That is, we recursively call buildEmptyItemTreeForShape for each key.)
 */
function buildEmptyItemTreeForShape(shape: Shape): ItemTree {
    if (shape.type === "item") {
        return {
            "__type": "item",
            "content": "",
            "images": {},
            "widgets": {},
        };
    } else if (shape.type === "hint") {
        return {
            "__type": "hint",
            "replace": false,
            "content": "",
            "images": {},
            "widgets": {},
        };
    } else if (shape.type === "array") {
        return [];
    } else if (shape.type === "object") {
        const valueShapes = shape.shape;
        const object: ItemObjectNode = {};
        Object.keys(valueShapes).forEach(key => {
            object[key] = buildEmptyItemTreeForShape(valueShapes[key]);
        });
        return object;
    } else {
        throw new Error(`unexpected shape type ${shape.type}`);
    }
}

/**
 * Return a semantically empty Item that conforms to the given shape.
 *
 * - An empty content node has an empty content string and no widgets/images.
 * - An empty hint node has an empty content string and no widgets/images.
 * - An empty array node has no elements.
 * - An empty object node has a semantically empty node for each of its keys.
 *   (That is, we recursively call buildEmptyItemTreeForShape for each key.)
 */
function buildEmptyItemForShape(shape: Shape): Item {
    return treeToItem(buildEmptyItemTreeForShape(shape));
}

/**
 * Given an Item and its Shape, yield all of its content nodes to the callback.
 */
function findContentNodesInItem(
    item: Item,
    shape: Shape,
    callback: (c: ContentNode) => any
) {
    const itemTree = itemToTree(item);
    buildMapper()
        .setContentMapper(callback)
        .mapTree(itemTree, shape);
}

/**
 * Given an Item and its Shape, yield all of its hint nodes to the callback.
 */
function findHintNodesInItem(
    item: Item,
    shape: Shape,
    callback: (h: HintNode) => any
) {
    const itemTree = itemToTree(item);
    buildMapper()
        .setHintMapper(callback)
        .mapTree(itemTree, shape);
}

/**
 * Given an ItemTree, return a Shape that it conforms to.
 *
 * The Shape might not be complete or correct Shape that this Item was designed
 * for. If you have access to the intended Shape, use that instead.
 */
function inferItemShape(item: Item) {
    const itemTree = itemToTree(item);
    return inferItemTreeShape(itemTree);
}

function inferItemTreeShape(node: ItemTree): Shape {
    if (Array.isArray(node)) {
        // If the array is empty, we guess that it's a content array. Could be
        // wrong, but, if we're only going to use this inferred shape for
        // traversing this particular item, then it doesn't matter, anyway :P
        // But, if you need to be able to work with empty arrays, like in the
        // Perseus editor, you should get the correct shape explicitly!
        return shapes.arrayOf(
            node.length ? inferItemTreeShape(node[0]) : shapes.content
        );
    } else if (typeof node === "object" && node.__type === "item") {
        return shapes.content;
    } else if (typeof node === "object" && node.__type === "hint") {
        return shapes.hint;
    } else if (typeof node === "object") {
        const valueShapes = {};
        Object.keys(node).forEach(key => {
            // $FlowFixMe: Not sure why this property deref is an error.
            valueShapes[key] = inferItemTreeShape(node[key]);
        });
        return shapes.shape(valueShapes);
    } else {
        throw new Error(`unexpected multi-item node ${JSON.stringify(node)}`);
    }
}

/**
 * Convert the given ItemTree to an Item, by wrapping it in the `_multi` key.
 */
function itemToTree(item: Item): ItemTree {
    return item._multi;
}

/**
 * Convert the given Item to an ItemTree, by unwrapping the `_multi` key.
 */
function treeToItem(node: ItemTree): Item {
    return {_multi: node};
}

module.exports = {
    buildEmptyItemTreeForShape,
    buildEmptyItemForShape,
    findContentNodesInItem,
    findHintNodesInItem,
    inferItemShape,
    itemToTree,
    treeToItem,
};