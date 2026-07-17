"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: Props) {
  return (
    <div className={`prose-zynotrix ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-base font-black text-foreground mt-3 mb-1.5">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold text-foreground mt-2.5 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold text-muted mt-2 mb-0.5">{children}</h3>,
          p: ({ children }) => <p className="text-sm text-muted leading-relaxed mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="space-y-1 mb-2 ml-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="space-y-1 mb-2 ml-0.5 list-decimal list-inside">{children}</ol>,
          li: ({ children }) => (
            <li className="text-sm text-muted flex gap-2 leading-relaxed">
              <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              <span>{children}</span>
            </li>
          ),
          strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic text-muted">{children}</em>,
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded-md text-[11px] font-mono font-bold"
              style={{ background: "var(--bg-elevated)", color: "var(--accent)", border: "1px solid var(--border)" }}>
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="pl-3 py-1 my-2 text-sm text-muted italic"
              style={{ borderLeft: "3px solid var(--accent)" }}>
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-none h-px" style={{ background: "var(--border)" }} />,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer"
              className="font-semibold hover:underline underline-offset-2"
              style={{ color: "var(--accent)" }}>
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
