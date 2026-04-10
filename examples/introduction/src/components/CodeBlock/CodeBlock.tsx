import React, { memo, useState } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import scss from "react-syntax-highlighter/dist/esm/languages/prism/scss";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("scss", scss);
SyntaxHighlighter.registerLanguage("javascript", javascript);
import "./CodeBlock.scss";

const customStyle = { margin: 0, background: "transparent" };

export const CodeBlock = memo(
  ({ code, inline }: { code: string; inline?: boolean }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className={`code-block-wrapper ${inline ? "inline-mode" : ""}`}>
        <button
          className={`copy-btn ${copied ? "copied" : ""}`}
          onClick={handleCopy}
          title="Copy code"
        >
          {copied ? (
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              ></path>
            </svg>
          )}
        </button>
        <SyntaxHighlighter
          language="tsx"
          style={vscDarkPlus}
          customStyle={customStyle}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    );
  },
);

CodeBlock.displayName = "CodeBlock";
