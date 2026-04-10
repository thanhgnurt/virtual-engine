# react-virtual-engine

React bindings for [virtual-engine](https://github.com/thanhgnurt/virtual-engine) — a high-performance, zero-allocation virtual list rendering engine.

Render massive lists with fixed-height rows using a slot-based pooling strategy. No DOM node creation/destruction on scroll, no GC pressure.

[![npm](https://img.shields.io/npm/v/react-virtual-engine)](https://www.npmjs.com/package/react-virtual-engine)
[![license](https://img.shields.io/npm/l/react-virtual-engine)](https://github.com/thanhgnurt/virtual-engine/blob/main/LICENSE)

## Features

- Slot-based DOM pooling — reuses a fixed pool of DOM nodes instead of mounting/unmounting
- Zero-allocation scroll handling — pre-allocated range objects, no GC during scroll
- Velocity-aware dynamic buffering — renders extra rows during fast scroll to prevent blank areas
- `requestAnimationFrame`-throttled scroll — one layout pass per frame
- Imperative API via `ref` — `scrollToRow`, `update`, `syncScrollTop`, and more
- Generic `<T>` support — fully typed for any data shape

## Installation

```bash
npm install react-virtual-engine
```

Peer dependencies: `react >= 16.8.0` and `react-dom >= 16.8.0`.

## Quick Start

```tsx
import {
  ReactVirtualEngine,
  ReactVirtualEngineHandle,
  IVirtualRowHandle,
} from "react-virtual-engine";
import { forwardRef, useImperativeHandle, useRef } from "react";

interface Item {
  id: number;
  text: string;
}

const items = Array.from({ length: 100_000 }, (_, i) => ({
  id: i,
  text: `Row ${i}`,
}));

// Row component with imperative update via ref
const Row = forwardRef<IVirtualRowHandle<Item>, { item: Item; index: number }>(
  ({ item, index }, ref) => {
    const elRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      update: (newItem) => {
        if (elRef.current) elRef.current.textContent = (newItem as Item).text;
      },
    }));

    return (
      <div ref={elRef} style={{ padding: 8 }}>
        {item.text}
      </div>
    );
  },
);

function App() {
  const listRef = useRef<ReactVirtualEngineHandle>(null);

  return (
    <ReactVirtualEngine<Item>
      ref={listRef}
      items={items}
      itemHeight={50}
      height={500}
      renderItem={(item, index) => <Row item={item} />}
    />
  );
}
```

## Props — `ReactVirtualEngineProps<T>`

Virtual Engine components accept all standard virtualization properties.

## Imperative Handle — `ReactVirtualEngineHandle`

You can control the engine imperatively by attaching a ref:

```typescript
const listRef = useRef<ReactVirtualEngineHandle>(null);
listRef.current?.scrollToRow({ index: 500, align: "center" });
```

| Prop              | Type                                           | Default  | Description                                  |
| ----------------- | ---------------------------------------------- | -------- | -------------------------------------------- |
| `items`           | `ArrayLike<T>`                                 | —        | Data source                                  |
| `itemHeight`      | `number`                                       | —        | Fixed row height in px                       |
| `height`          | `number`                                       | `600`    | Viewport height in px                        |
| `width`           | `string \| number`                             | `"100%"` | Viewport width                               |
| `bufferRow`       | `number`                                       | `0`      | Extra rows rendered above/below viewport     |
| `paddingVertical` | `number`                                       | `0`      | Vertical padding inside the scroll container |
| `renderItem`      | `(item: T, index: number) => ReactElement`     | —        | Row renderer                                 |
| `onScroll`        | `(scrollTop: number) => void`                  | —        | Scroll callback                              |
| `className`       | `string`                                       | —        | Container class                              |
| `rowClass`        | `string \| (item: T, index: number) => string` | —        | Class applied to each row wrapper            |
| `style`           | `CSSProperties`                                | —        | Container inline styles                      |
| `version`         | `number`                                       | —        | Bump to force re-render of all visible rows  |
| `role`            | `string`                                       | —        | ARIA role for the container                  |
| `cardIdx`         | `number`                                       | —        | External index passed through to row updates |

## Imperative Handle — `ReactVirtualEngineHandle`

Access via `ref`:

```tsx
const listRef = useRef<ReactVirtualEngineHandle>(null);

// Scroll to a specific row
listRef.current?.scrollToRow({
  index: 500,
  align: "center",
  behavior: "smooth",
});

// Imperatively update items without re-render from parent
listRef.current?.update(newItems, newVersion);

// Sync scroll position (e.g. for linked lists)
listRef.current?.syncScrollTop(scrollTop);

// Update viewport height dynamically
listRef.current?.updateViewportHeight(800);
```

| Method                                      | Description                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `element`                                   | Readonly ref to the container `HTMLDivElement`                         |
| `scrollToRow({ index, align?, behavior? })` | Scroll to row. `align`: `"auto"` \| `"start"` \| `"end"` \| `"center"` |
| `update(items, version?)`                   | Push new data imperatively                                             |
| `syncScrollTop(scrollTop)`                  | Set scroll position directly                                           |
| `updateViewportHeight(height)`              | Resize viewport on the fly                                             |
| `snapshotScroll()` / `restoreScroll()`      | Reserved for future scroll restoration                                 |

## Re-exports

This package re-exports everything from `virtual-engine`, so you can import core utilities directly:

```tsx
import { VirtualEngine, VirtualRange } from "react-virtual-engine";
```

## License

MIT
