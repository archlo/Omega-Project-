/** Incremental fat-AABB tree used for foothold candidate queries. */
export class FootholdIndex {
    _nodes = new Map();
    _root = null;
    clear() {
        this._nodes.clear();
        this._root = null;
    }
    insert(fh) {
        if (this._nodes.has(fh))
            return;
        const node = this._leaf(fh);
        this._nodes.set(fh, node);
        this._insertLeaf(node);
    }
    remove(fh) {
        const node = this._nodes.get(fh);
        if (!node)
            return;
        this._removeLeaf(node);
        this._nodes.delete(fh);
    }
    /** Update a foothold after its endpoints change. Small moves stay in place. */
    update(fh) {
        const node = this._nodes.get(fh);
        if (!node) {
            this.insert(fh);
            return;
        }
        const bounds = boundsOf(fh);
        if (contains(node, bounds))
            return;
        this._removeLeaf(node);
        Object.assign(node, fatten(bounds));
        this._insertLeaf(node);
    }
    search(x1, y1, x2, y2) {
        const query = {
            left: Math.min(x1, x2), top: Math.min(y1, y2),
            right: Math.max(x1, x2), bottom: Math.max(y1, y2),
        };
        const result = [];
        const visit = (node) => {
            if (!overlaps(node, query))
                return;
            if (node.foothold) {
                // Fat bounds are an insertion optimization, not part of query semantics.
                if (overlaps(boundsOf(node.foothold), query))
                    result.push(node.foothold);
                return;
            }
            if (node.leftChild)
                visit(node.leftChild);
            if (node.rightChild)
                visit(node.rightChild);
        };
        if (this._root)
            visit(this._root);
        return result;
    }
    _leaf(fh) {
        return { ...fatten(boundsOf(fh)), foothold: fh, parent: null, height: 0 };
    }
    _insertLeaf(leaf) {
        if (!this._root) {
            this._root = leaf;
            return;
        }
        let sibling = this._root;
        while (!sibling.foothold) {
            const left = sibling.leftChild;
            const right = sibling.rightChild;
            const leftCost = inheritanceCost(left, leaf);
            const rightCost = inheritanceCost(right, leaf);
            sibling = leftCost <= rightCost ? left : right;
        }
        const oldParent = sibling.parent;
        const parent = {
            ...combine(sibling, leaf),
            parent: oldParent,
            leftChild: sibling,
            rightChild: leaf,
            height: sibling.height + 1,
        };
        sibling.parent = parent;
        leaf.parent = parent;
        if (!oldParent)
            this._root = parent;
        else if (oldParent.leftChild === sibling)
            oldParent.leftChild = parent;
        else
            oldParent.rightChild = parent;
        this._fixUpward(parent);
    }
    _removeLeaf(leaf) {
        if (leaf === this._root) {
            this._root = null;
            leaf.parent = null;
            return;
        }
        const parent = leaf.parent;
        const grandParent = parent.parent;
        const sibling = parent.leftChild === leaf ? parent.rightChild : parent.leftChild;
        if (!grandParent) {
            this._root = sibling;
            sibling.parent = null;
        }
        else {
            sibling.parent = grandParent;
            if (grandParent.leftChild === parent)
                grandParent.leftChild = sibling;
            else
                grandParent.rightChild = sibling;
            this._fixUpward(grandParent);
        }
        leaf.parent = null;
    }
    _fixUpward(start) {
        let node = start;
        while (node) {
            node = this._balance(node);
            const left = node.leftChild;
            const right = node.rightChild;
            if (left && right) {
                Object.assign(node, combine(left, right));
                node.height = 1 + Math.max(left.height, right.height);
            }
            node = node.parent;
        }
    }
    _balance(node) {
        if (node.foothold || node.height < 2)
            return node;
        const left = node.leftChild;
        const right = node.rightChild;
        const balance = right.height - left.height;
        if (balance > 1) {
            const rightLeft = right.leftChild;
            const rightRight = right.rightChild;
            right.leftChild = node;
            right.parent = node.parent;
            node.parent = right;
            if (right.parent)
                replaceChild(right.parent, node, right);
            else
                this._root = right;
            if (rightLeft.height > rightRight.height) {
                right.rightChild = rightLeft;
                node.rightChild = rightRight;
                rightLeft.parent = right;
                rightRight.parent = node;
            }
            else {
                right.rightChild = rightRight;
                node.rightChild = rightLeft;
                rightRight.parent = right;
                rightLeft.parent = node;
            }
            refresh(node);
            refresh(right);
            return right;
        }
        if (balance < -1) {
            const leftLeft = left.leftChild;
            const leftRight = left.rightChild;
            left.rightChild = node;
            left.parent = node.parent;
            node.parent = left;
            if (left.parent)
                replaceChild(left.parent, node, left);
            else
                this._root = left;
            if (leftLeft.height > leftRight.height) {
                left.leftChild = leftLeft;
                node.leftChild = leftRight;
                leftLeft.parent = left;
                leftRight.parent = node;
            }
            else {
                left.leftChild = leftRight;
                node.leftChild = leftLeft;
                leftRight.parent = left;
                leftLeft.parent = node;
            }
            refresh(node);
            refresh(left);
            return left;
        }
        return node;
    }
}
function boundsOf(fh) {
    return { left: Math.min(fh.X1, fh.X2), top: Math.min(fh.Y1, fh.Y2), right: Math.max(fh.X1, fh.X2), bottom: Math.max(fh.Y1, fh.Y2) };
}
function fatten(bounds) {
    const margin = 4;
    return { left: bounds.left - margin, top: bounds.top - margin, right: bounds.right + margin, bottom: bounds.bottom + margin };
}
function combine(a, b) {
    return { left: Math.min(a.left, b.left), top: Math.min(a.top, b.top), right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom) };
}
function contains(container, bounds) {
    return container.left <= bounds.left && container.top <= bounds.top && container.right >= bounds.right && container.bottom >= bounds.bottom;
}
function overlaps(a, b) {
    return a.right >= b.left && a.left <= b.right && a.bottom >= b.top && a.top <= b.bottom;
}
function perimeter(bounds) {
    return 2 * ((bounds.right - bounds.left) + (bounds.bottom - bounds.top));
}
function inheritanceCost(node, leaf) {
    return perimeter(combine(node, leaf)) - perimeter(node);
}
function replaceChild(parent, oldChild, newChild) {
    if (parent.leftChild === oldChild)
        parent.leftChild = newChild;
    else
        parent.rightChild = newChild;
}
function refresh(node) {
    const left = node.leftChild;
    const right = node.rightChild;
    Object.assign(node, combine(left, right));
    node.height = 1 + Math.max(left.height, right.height);
}
//# sourceMappingURL=FootholdIndex.js.map