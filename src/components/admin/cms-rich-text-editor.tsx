"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
};

/**
 * Greenopia-style WYSIWYG: contenteditable + execCommand toolbar.
 * Outputs HTML consumed by `sanitizeCmsHtml` on save and on public render.
 */
export function CmsRichTextEditor({
  value,
  onChange,
  placeholder = "Write page content…",
  id,
  disabled,
  "aria-invalid": ariaInvalid,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    function handleInput() {
      if (!isComposing.current && editor) {
        onChangeRef.current(editor.innerHTML);
      }
    }

    function handleCompositionStart() {
      isComposing.current = true;
    }

    function handleCompositionEnd() {
      isComposing.current = false;
      if (editor) {
        onChangeRef.current(editor.innerHTML);
      }
    }

    editor.addEventListener("input", handleInput);
    editor.addEventListener("compositionstart", handleCompositionStart);
    editor.addEventListener("compositionend", handleCompositionEnd);

    return () => {
      editor.removeEventListener("input", handleInput);
      editor.removeEventListener("compositionstart", handleCompositionStart);
      editor.removeEventListener("compositionend", handleCompositionEnd);
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || disabled) return;
    if (value !== editor.innerHTML) {
      editor.innerHTML = value || "";
    }
  }, [value, disabled]);

  function handleCommand(command: string, commandValue?: string) {
    if (disabled) return;
    document.execCommand(command, false, commandValue);
    editorRef.current?.focus();
    const html = editorRef.current?.innerHTML ?? "";
    onChange(html);
  }

  const btnClass =
    "rounded border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-input bg-background",
        ariaInvalid && "border-destructive",
      )}
    >
      <div
        className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 p-2"
        role="toolbar"
        aria-label="Text formatting"
      >
        <button
          type="button"
          className={btnClass}
          onClick={() => handleCommand("bold")}
          disabled={disabled}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={`${btnClass} italic`}
          onClick={() => handleCommand("italic")}
          disabled={disabled}
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          className={`${btnClass} underline`}
          onClick={() => handleCommand("underline")}
          disabled={disabled}
          title="Underline"
        >
          U
        </button>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <button
          type="button"
          className={btnClass}
          onClick={() => handleCommand("formatBlock", "<h2>")}
          disabled={disabled}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          className={btnClass}
          onClick={() => handleCommand("formatBlock", "<h3>")}
          disabled={disabled}
          title="Heading 3"
        >
          H3
        </button>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <button
          type="button"
          className={btnClass}
          onClick={() => handleCommand("insertUnorderedList")}
          disabled={disabled}
          title="Bullet list"
        >
          •
        </button>
        <button
          type="button"
          className={btnClass}
          onClick={() => handleCommand("insertOrderedList")}
          disabled={disabled}
          title="Numbered list"
        >
          1.
        </button>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <button
          type="button"
          className={btnClass}
          onClick={() => {
            const url = window.prompt("Link URL (https://…)");
            if (url?.trim()) handleCommand("createLink", url.trim());
          }}
          disabled={disabled}
          title="Insert link"
        >
          Link
        </button>
      </div>
      <div
        ref={editorRef}
        id={id}
        contentEditable={!disabled}
        suppressContentEditableWarning
        aria-invalid={ariaInvalid}
        className={cn(
          "cms-rich-text min-h-[280px] whitespace-pre-wrap break-words p-3 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled && "cursor-not-allowed opacity-60",
        )}
        style={{ wordBreak: "break-word" }}
        aria-label={placeholder}
      ></div>
    </div>
  );
}
