import { describe, it, expect } from 'vitest';
import { Texture } from 'pixi.js';
import { DragController, DragTarget } from '../../src/ui/DragController.js';

// TODO_AUDIT.md Ninety-seventh/Hundred-and-eighth passes: OG IDraggable/CWndMan::BeginDragDrop.
describe('DragController', () => {
  it('tracks dragging state and follows the cursor', () => {
    const d = new DragController();
    expect(d.isDragging).toBe(false);
    d.beginDrag({ skillId: 1 }, Texture.EMPTY, 10, 20);
    expect(d.isDragging).toBe(true);
    expect(d.container.children.length).toBe(1);
    d.updatePosition(30, 40);
    expect(d.container.children[0].x).toBe(30);
    expect(d.container.children[0].y).toBe(40);
  });

  it('offers the payload to targets in order until one accepts', () => {
    const d = new DragController();
    d.beginDrag({ skillId: 5 }, Texture.EMPTY, 0, 0);
    const declines: DragTarget = { tryAcceptDrag: () => false };
    const accepts: DragTarget = { tryAcceptDrag: (p) => (p as { skillId: number }).skillId === 5 };
    const claimed = d.endDrag([declines, accepts], 1, 2);
    expect(claimed).toBe(true);
    expect(d.isDragging).toBe(false);
    expect(d.container.children.length).toBe(0);
  });

  it('endDrag is a no-op when nothing is being dragged', () => {
    const d = new DragController();
    const target: DragTarget = { tryAcceptDrag: () => true };
    expect(d.endDrag([target], 0, 0)).toBe(false);
  });

  it('cancelDrag clears the floating icon without offering it anywhere', () => {
    const d = new DragController();
    d.beginDrag({ skillId: 1 }, Texture.EMPTY, 0, 0);
    d.cancelDrag();
    expect(d.isDragging).toBe(false);
    expect(d.container.children.length).toBe(0);
  });
});
