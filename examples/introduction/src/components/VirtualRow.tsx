import { setTextNode, type IVirtualRowHandle } from "react-virtual-engine";
import { forwardRef, memo, useImperativeHandle, useRef } from "react";

export interface VirtualRowData {
  id: number;
  name: string;
  price: number;
  change: number;
}

export interface VirtualRowProps {
  index: number;
  data: VirtualRowData;
}

export const VirtualRow = memo(
  forwardRef<IVirtualRowHandle<VirtualRowData | null>, VirtualRowProps>(
    ({ index: initialIndex, data: initialData }, ref) => {
      const indexRef = useRef<HTMLSpanElement>(null);
      const nameRef = useRef<HTMLSpanElement>(null);
      const priceRef = useRef<HTMLSpanElement>(null);
      const changeRef = useRef<HTMLSpanElement>(null);

      const itemRef = useRef<VirtualRowData | null>(initialData);
      const indexValueRef = useRef(initialIndex);

      useImperativeHandle(ref, () => ({
        update: (data, index) => {
          // 2. Index / Content Check
          const indexChanged = index !== indexValueRef.current;
          const itemChanged = data?.id !== itemRef.current?.id;

          if (indexChanged || itemChanged) {
            indexValueRef.current = index;
            itemRef.current = data;

            if (!data) {
              return;
            }

            if (indexRef.current) setTextNode(indexRef.current, `#${index}`);
            if (nameRef.current) setTextNode(nameRef.current, data.name);
            if (priceRef.current)
              setTextNode(priceRef.current, `$${data.price.toFixed(2)}`);

            if (changeRef.current) {
              const text = `${data.change >= 0 ? "+" : ""}${data.change.toFixed(2)}%`;
              setTextNode(changeRef.current, text);
              changeRef.current.className = `font-mono text-sm ${
                data.change >= 0 ? "text-emerald-400" : "text-rose-400"
              }`;
            }
          }
        },
      }));

      return (
        <>
          <div className="flex items-center gap-4">
            <span
              ref={indexRef}
              className="text-slate-500 font-mono text-sm w-12"
            >
              #{initialIndex}
            </span>
            <span ref={nameRef} className="text-slate-200 font-medium">
              {initialData?.name}
            </span>
          </div>
          <div className="flex gap-8">
            <span ref={priceRef} className="text-brand-400 font-mono">
              ${initialData?.price.toFixed(2)}
            </span>
            <span
              ref={changeRef}
              className={`font-mono text-sm ${
                initialData?.change >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {initialData?.change >= 0 ? "+" : ""}
              {initialData?.change.toFixed(2)}%
            </span>
          </div>
        </>
      );
    },
  ),
);

VirtualRow.displayName = "VirtualRow";
