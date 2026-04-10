import { forwardRef, memo, useImperativeHandle, useRef } from "react";
import { setTextNode, type IVirtualRowHandle } from "react-virtual-engine";
import "./FastRow.scss";

export interface FastRowData {
  id: number;
  name: string;
  price: number;
  change: number;
  val: number;
}

export interface FastRowProps {
  index: number;
  data: FastRowData;
  isStreaming?: boolean;
}

export const FastRow = memo(
  forwardRef<IVirtualRowHandle<FastRowData>, FastRowProps>(
    ({ index: initialIndex, data: initialData, isStreaming = false }, ref) => {
      const indexRef = useRef<HTMLSpanElement>(null);
      const nameRef = useRef<HTMLSpanElement>(null);
      const priceRef = useRef<HTMLSpanElement>(null);
      const changeRef = useRef<HTMLSpanElement>(null);
      const valRef = useRef<HTMLSpanElement>(null);

      const itemRef = useRef<FastRowData | null>(initialData);
      const indexValueRef = useRef(initialIndex);
      const lastPriceRef = useRef(initialData?.price ?? 0);
      const lastValRef = useRef(initialData?.val ?? 0);

      useImperativeHandle(ref, () => ({
        update: (data, index) => {
          const indexChanged = index !== indexValueRef.current;
          const itemChanged = data?.id !== itemRef.current?.id;
          const priceChanged = data && data.price !== lastPriceRef.current;
          const valChanged = data && data.val !== lastValRef.current;

          if (indexChanged || itemChanged || priceChanged || valChanged) {
            indexValueRef.current = index;
            itemRef.current = data;

            if (indexRef.current) setTextNode(indexRef.current, `#${index}`);
            if (nameRef.current) setTextNode(nameRef.current, data?.name ?? "");
            
            if (priceRef.current) {
              const price = data?.price ?? 0;
              setTextNode(priceRef.current, `$${price.toFixed(2)}`);
              
              // Only flash if the item hasn't changed (ID is the same) AND streaming is active
              if (priceChanged && data && !itemChanged && isStreaming) {
                const cls = data.price > lastPriceRef.current ? "flash-up" : "flash-down";
                lastPriceRef.current = data.price;
                
                priceRef.current.classList.remove("flash-up", "flash-down");
                void priceRef.current.offsetWidth; // Force Reflow
                priceRef.current.classList.add(cls);

                if (changeRef.current) {
                  changeRef.current.classList.remove("flash-up", "flash-down");
                  void changeRef.current.offsetWidth;
                  changeRef.current.classList.add(cls);
                }
              } else if (data) {
                // Background update: price changed due to recycling or initial load
                lastPriceRef.current = data.price;
              }
            }

            if (valRef.current) {
              const val = data?.val ?? 0;
              setTextNode(valRef.current, Math.floor(val).toLocaleString());
              
              if (valChanged && data && !itemChanged && isStreaming) {
                lastValRef.current = data.val;
                
                valRef.current.classList.remove("flash-val");
                void valRef.current.offsetWidth; // Force Reflow
                valRef.current.classList.add("flash-val");
              } else if (data) {
                lastValRef.current = data.val;
              }
            }

            if (changeRef.current) {
              const change = data?.change ?? 0;
              const text = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
              setTextNode(changeRef.current, text);
              changeRef.current.className = `row-change ${
                change >= 0 ? "positive" : "negative"
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
              {initialData?.name ?? ""}
            </span>
          </div>
          <div className="row-right">
            <span ref={valRef} className="row-val">
              {(initialData?.val ?? 0).toLocaleString()}
            </span>
            <span ref={priceRef} className="row-price">
              ${(initialData?.price ?? 0).toFixed(2)}
            </span>
            <span
              ref={changeRef}
              className={`row-change ${
                (initialData?.change ?? 0) >= 0 ? "positive" : "negative"
              }`}
            >
              {(initialData?.change ?? 0) >= 0 ? "+" : ""}
              {(initialData?.change ?? 0).toFixed(2)}%
            </span>
          </div>
        </>
      );
    },
  ),
);

FastRow.displayName = "FastRow";
