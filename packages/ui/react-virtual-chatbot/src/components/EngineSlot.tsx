import React, { forwardRef, memo } from "react";
import { IVirtualChatRowHandle } from "../types";

interface EngineSlotProps<T> {
  physicalId: number;
  initialIndex: number;
  initialData: T | null;
  renderItem: (item: T | null, index: number, physicalId: number) => React.ReactElement;
}

/**
 * A memoized slot wrapper for the virtual engine.
 * Prevents React from re-rendering the slot unless explicitly told by the imperative handles.
 */
export const EngineSlot = memo(
  forwardRef(
    <T,>(
      { physicalId, initialIndex, initialData, renderItem }: EngineSlotProps<T>,
      ref: React.Ref<IVirtualChatRowHandle<T>>,
    ) => {
      const node = renderItem(initialData, initialIndex, physicalId);
      if (React.isValidElement(node)) {
        return React.cloneElement(node as React.ReactElement, { ref });
      }
      return <>{node}</>;
    },
  ),
  () => true, // Permanent memoization: we only update via imperative handles
) as <T>(
  props: EngineSlotProps<T> & { ref?: React.Ref<IVirtualChatRowHandle<T>> },
) => React.ReactElement;
