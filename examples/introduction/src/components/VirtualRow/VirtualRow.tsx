import { forwardRef, memo, useImperativeHandle, useRef } from "react";
import { setTextNode, type IVirtualRowHandle } from "react-virtual-engine";
import "./VirtualRow.scss";

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
              changeRef.current.className = `row-change ${
                data.change >= 0 ? "positive" : "negative"
              }`;
            }
          }
        },
      }));

      return (
        <>
          <div className="row-left">
            <span ref={indexRef} className="row-index">
              #{initialIndex}
            </span>
            <span ref={nameRef} className="row-name">
              {initialData?.name}
            </span>
          </div>
          <div className="row-right">
            <span ref={priceRef} className="row-price">
              ${initialData?.price.toFixed(2)}
            </span>
            <span
              ref={changeRef}
              className={`row-change ${
                initialData?.change >= 0 ? "positive" : "negative"
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
