import { Upload } from "lucide-react";
import * as React from "react";
import { cn } from "./cn";

export interface FileDropzoneProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "value"> {
  onFiles: (files: File[]) => void;
  label: string;
  /** Under the label: "PNG or JPEG, up to 5 MB". Say the limit before it is hit. */
  hint?: string;
  /** Bytes. Oversized files are rejected here rather than at the server. */
  maxSize?: number;
  onReject?: (rejected: { file: File; reason: string }[]) => void;
}

function describe(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.ceil(bytes / 1024)} KB`;
}

/**
 * Drop files here, or press to choose them.
 *
 * A real `<input type="file">` does the work, hidden but focusable rather than
 * `display: none`, with a `<label>` wrapping the whole target. That is the entire
 * accessibility story for this control and it is why there is no `role="button"` anywhere: a
 * label plus a file input is already operable by keyboard, already announces what it accepts,
 * and already opens the picker on space. A div with a click handler is none of those.
 *
 * Drag and drop is the shortcut on top, not the mechanism.
 */
const FileDropzone = React.forwardRef<HTMLInputElement, FileDropzoneProps>(
  ({ onFiles, label, hint, maxSize, onReject, className, accept, multiple, disabled, ...props }, ref) => {
    const [over, setOver] = React.useState(false);
    const inputId = React.useId();

    function take(list: FileList | null) {
      if (!list) return;
      const files = Array.from(list);
      if (maxSize === undefined) {
        onFiles(files);
        return;
      }
      const tooBig = files.filter((file) => file.size > maxSize);
      const fine = files.filter((file) => file.size <= maxSize);
      if (tooBig.length) {
        onReject?.(
          tooBig.map((file) => ({
            file,
            reason: `${file.name} is ${describe(file.size)}, over the ${describe(maxSize)} limit.`,
          })),
        );
      }
      if (fine.length) onFiles(fine);
    }

    return (
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          if (disabled) return;
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          if (disabled) return;
          event.preventDefault();
          setOver(false);
          take(event.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface-muted p-8 text-center transition-colors",
          !disabled && "hover:border-primary hover:bg-surface-raised",
          // The ring is on the label because the input it belongs to is visually hidden; without
          // this, tabbing to the control shows nothing at all.
          "has-[:focus-visible]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
          over && "border-primary bg-surface-raised",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <Upload className="size-6 text-text-muted" aria-hidden />
        <span className="text-sm font-medium text-text">{label}</span>
        {hint && <span className="text-xs text-text-muted">{hint}</span>}
        <input
          ref={ref}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          // Not `hidden` and not `display:none`: both remove it from the tab order, which is
          // the one thing that must not happen.
          className="sr-only"
          onChange={(event) => {
            take(event.target.files);
            // Cleared so that choosing the same file twice in a row still fires.
            event.target.value = "";
          }}
          {...props}
        />
      </label>
    );
  },
);
FileDropzone.displayName = "FileDropzone";

export { FileDropzone };
