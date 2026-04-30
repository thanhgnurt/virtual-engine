import { forwardRef, memo, useImperativeHandle, useRef } from "react";
import { ISubContentHandle } from "../types";
import { ChatCode } from "./ChatCode";
import { ChatImage } from "./ChatImage";
import { ChatText } from "./ChatText";

/**
 * A dynamic slot that can render Text, Code, or Image.
 */
export const PartSlot = memo(
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
      getContainer: () => {
        return (textRef.current as any)?.getContainer?.() || null;
      },
    }));

    return (
      <div className="part-slot" ref={containerRef}>
        <ChatText ref={textRef} />
        <ChatCode ref={codeRef} codeHighlighting={codeHighlighting} />
        <ChatImage ref={imageRef} />
      </div>
    );
  }),
  () => true,
);

PartSlot.displayName = "PartSlot";
