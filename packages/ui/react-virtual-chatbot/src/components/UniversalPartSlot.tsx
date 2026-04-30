import { forwardRef, memo, useImperativeHandle, useRef } from "react";
import { ISubContentHandle } from "../types";
import { VirtualChatCode } from "./VirtualChatCode";
import { VirtualChatImage } from "./VirtualChatImage";
import { VirtualChatText } from "./VirtualChatText";

/**
 * A dynamic slot that can render Text, Code, or Image.
 */
export const UniversalPartSlot = memo(
  forwardRef<
    ISubContentHandle,
    { className?: string; codeHighlighting?: boolean }
  >(({ codeHighlighting }, ref) => {
    const textRef = useRef<ISubContentHandle>(null);
    const codeRef = useRef<ISubContentHandle>(null);
    const imageRef = useRef<ISubContentHandle>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      update: (content: string, metadata?: any) => {
        const type = metadata?.type || "text";

        // Hide all first
        textRef.current?.setVisible(false);
        codeRef.current?.setVisible(false);
        imageRef.current?.setVisible(false);

        // Update and show the correct one
        if (type === "text") {
          textRef.current?.update(content, metadata);
          textRef.current?.setVisible(true);
        } else if (type === "code") {
          codeRef.current?.update(content, metadata);
          codeRef.current?.setVisible(true);
        } else if (type === "image") {
          imageRef.current?.update(content, metadata);
          imageRef.current?.setVisible(true);
        }
      },
      setVisible: (visible: boolean) => {
        if (containerRef.current) {
          containerRef.current.style.display = visible ? "block" : "none";
        }
      },
    }));

    return (
      <div className="universal-part-slot" ref={containerRef}>
        <VirtualChatText ref={textRef} />
        <VirtualChatCode ref={codeRef} codeHighlighting={codeHighlighting} />
        <VirtualChatImage ref={imageRef} />
      </div>
    );
  }),
  () => true,
);
