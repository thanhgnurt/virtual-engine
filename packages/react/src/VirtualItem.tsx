import React, { forwardRef, memo } from "react";
import { IVirtualRowHandle } from "./VirtualList";

export interface VirtualItemProps<T> {
  index: number;
  data: T;
  version?: number;
  renderItem: (
    item: T,
    index: number,
  ) => React.ReactElement<{ ref?: React.Ref<IVirtualRowHandle<T>> }>;
}

export const VirtualItem = memo(
  forwardRef(
    <T,>(
      { index, data, renderItem }: VirtualItemProps<T>,
      ref: React.ForwardedRef<IVirtualRowHandle<T>>,
    ) => {
      const node = renderItem(data, index);
      if (React.isValidElement(node)) {
        return React.cloneElement(node as React.ReactElement, { ref });
      }
      return <>{node}</>;
    },
  ),
  (prev, next) => {
    return (
      prev.index === next.index &&
      prev.data === next.data &&
      prev.version === next.version &&
      prev.renderItem === next.renderItem
    );
  },
) as unknown as <T>(
  props: VirtualItemProps<T> & {
    ref?: React.ForwardedRef<IVirtualRowHandle<T>>;
  },
) => JSX.Element;
