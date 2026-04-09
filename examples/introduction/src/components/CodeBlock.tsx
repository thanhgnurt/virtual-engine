import React, { memo } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const customStyle = { margin: 0, background: "transparent" };

export const CodeBlock = memo(({ code }: { code: string }) => (
  <SyntaxHighlighter
    language="tsx"
    style={vscDarkPlus}
    customStyle={customStyle}
  >
    {code}
  </SyntaxHighlighter>
));

CodeBlock.displayName = "CodeBlock";
