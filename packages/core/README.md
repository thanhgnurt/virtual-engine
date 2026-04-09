# virtual-engine

Framework-agnostic computational core for virtual list rendering. Zero dependencies, zero allocations during scroll.

[![npm](https://img.shields.io/npm/v/virtual-engine)](https://www.npmjs.com/package/virtual-engine)
[![license](https://img.shields.io/npm/l/virtual-engine)](https://github.com/thanhgnurt/virtual-engine/blob/main/LICENSE)

## What it does

`virtual-engine` handles the math behind virtual scrolling — computing which rows are visible, managing slot-based pooling, and adapting buffer size based on scroll velocity. It produces index ranges; your framework renders them.

## Features

- Zero runtime dependencies
- Pre-allocated `VirtualRange` object — no object creation per scroll frame
- Velocity-aware dynamic buffering — extra rows during fast scroll, fewer when idle
- Slot map via `Int32Array` — O(1) index-to-slot mapping with no allocations
- DOM utility (`setTextNode`) for direct Text node manipulation without layout thrashing

## Installation

```bash
npm install virtual-engine
```

No peer dependencies.

## Usage

```ts
import { VirtualEngine } from "virtual-engine";

const engine = new VirtualEngine({
  totalCount: 100_000,
  itemHeight: 40,
  viewportHeight: 600,
  buffer: 3,
});

// On scroll
const range = engine.computeRange(scrollTop);
// range.start, range.end — indices of rows to render

// Slot mapping for a pool of reusable DOM nodes
const poolSize = 20;
const slotMap = new Int32Array(poolSize);
engine.getSlotMap(range, poolSize, slotMap);
// slotMap[slot] = rowIndex (-1 if unused)

// Velocity-based dynamic buffer
const velocity = engine.calculateVelocity(currentScrollTop, lastScrollTop, dt);
const extraBuffer = engine.getDynamicBuffer(velocity);
const rangeWithBuffer = engine.computeRange(scrollTop, extraBuffer);

// Total scroll height
const totalHeight = engine.getTotalSize(paddingVertical);
```

## API

### `new VirtualEngine(options)`

| Option | Type | Description |
|--------|------|-------------|
| `totalCount` | `number` | Total number of items |
| `itemHeight` | `number` | Fixed row height in px |
| `viewportHeight` | `number` | Visible area height in px |
| `buffer` | `number` | Rows to render above/below viewport |

### Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `updateOptions(partial)` | `void` | Update any subset of options |
| `computeRange(scrollTop, extraBuffer?)` | `VirtualRange` | Compute visible `{ start, end }` indices. Reuses internal object — do not hold references across calls |
| `getSlotMap(range, poolSize, out)` | `Int32Array` | Fill `out` with row index per slot (`-1` = empty) |
| `calculateVelocity(current, last, dt)` | `number` | Scroll velocity in px/ms |
| `getDynamicBuffer(velocity)` | `number` | Returns `10` if velocity > threshold, otherwise `buffer` |
| `getTotalSize(paddingVertical?)` | `number` | Total scrollable height |

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `VELOCITY_THRESHOLD` | `2` | px/ms threshold for fast scroll detection |
| `DYNAMIC_BUFFER_FAST_SCROLL` | `10` | Buffer rows during fast scroll |
| `SCROLL_STOP_DELAY` | `150` | ms delay to detect scroll stop |

### DOM Utility

```ts
import { setTextNode } from "virtual-engine";

// Efficiently set text content without innerHTML/textContent overhead
setTextNode(element, "new value");
```

Caches the `Text` node on the element and updates `nodeValue` directly — avoids DOM teardown and layout recalculation.

## React Bindings

For React, use [react-virtual-engine](https://www.npmjs.com/package/react-virtual-engine) which wraps this core with a ready-to-use `<VirtualList>` component.

## License

MIT
