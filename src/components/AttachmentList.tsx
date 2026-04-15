"use client";

interface AttachmentListProps {
  attachments: Array<{
    fileId: string;
    filename: string;
    mimeType: string;
    fileCategory: string;
    sizeBytes: number;
    url?: string | null;
  }>;
  compact?: boolean;
}

function formatSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (sizeBytes >= 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }
  return `${sizeBytes} B`;
}

export function AttachmentList({ attachments, compact = false }: AttachmentListProps) {
  if (!attachments.length) {
    return null;
  }

  return (
    <div className={compact ? "mt-3 space-y-2" : "mt-4 space-y-3"}>
      {!compact ? <p className="section-label">Attachments</p> : null}
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.fileId}
            className="overflow-hidden rounded-[18px] border border-[rgba(72,57,39,0.12)] bg-[rgba(255,252,246,0.92)]"
          >
            {attachment.fileCategory === "image" && attachment.url ? (
              <img
                src={attachment.url}
                alt={attachment.filename}
                className="max-h-44 w-full object-cover"
              />
            ) : null}
            <div className="flex items-center justify-between gap-3 px-3 py-3 text-xs">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">{attachment.filename}</p>
                <p className="truncate text-slate-500">
                  {attachment.fileCategory} / {formatSize(attachment.sizeBytes)}
                </p>
              </div>
              {attachment.url ? (
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary shrink-0 px-3 py-1.5 text-[11px]"
                >
                  Open
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
