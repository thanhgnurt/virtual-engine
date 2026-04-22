import React, { forwardRef, memo } from "react";
import { IVirtualRowHandle } from "./ReactVirtualEngine";

export interface EngineSlotProps<T> {
  index: number;
  data: T | null;
  version?: number;
  renderItem: (
    item: T | null,
    index: number,
  ) => React.ReactElement<{ ref?: React.Ref<IVirtualRowHandle<T>> }>;
}

export const EngineSlot = memo(
  forwardRef(
    <T,>(
      { index, data, renderItem }: EngineSlotProps<T>,
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
  props: EngineSlotProps<T> & {
    ref?: React.ForwardedRef<IVirtualRowHandle<T>>;
  },
) => JSX.Element;
