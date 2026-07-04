import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

type Props = {
  currentPage: number;
  totalPages: number;
  isFlipping: boolean;
  onPrev: () => void;
  onNext: () => void;
  onDismiss: () => void;
};

/** Animated travel-guide avatar that flips pages when clicked */
export function PreviewGuideAvatar({
  currentPage,
  totalPages,
  isFlipping,
  onPrev,
  onNext,
  onDismiss,
}: Props) {
  const isFirst = currentPage <= 0;
  const isLast = currentPage >= totalPages - 1;

  return (
    <div className="preview-guide-avatar" aria-label="Preview guide">
      <button type="button" className="preview-guide-dismiss" onClick={onDismiss} title="Hide guide">
        ×
      </button>

      <div className={`preview-guide-character ${isFlipping ? "is-flipping" : ""}`}>
        <div className="preview-guide-head">
          <div className="preview-guide-hair" />
          <div className="preview-guide-face">
            <span className="preview-guide-eye preview-guide-eye-left" />
            <span className="preview-guide-eye preview-guide-eye-right" />
            <span className="preview-guide-smile" />
          </div>
          <div className="preview-guide-hat">
            <Sparkles className="h-3 w-3 text-amber-300" />
          </div>
        </div>
        <div className="preview-guide-body">
          <div className="preview-guide-book-mini">
            <div className="preview-guide-book-cover" />
            <div className={`preview-guide-book-page ${isFlipping ? "turn" : ""}`} />
          </div>
        </div>
        <div className="preview-guide-arm preview-guide-arm-left" />
        <div className="preview-guide-arm preview-guide-arm-right" />
      </div>

      <p className="preview-guide-speech">
        {isFlipping
          ? "Turning the page…"
          : currentPage === 0
            ? "Your cover looks great!"
            : isLast
              ? "That's the back cover!"
              : `Page ${currentPage + 1} of ${totalPages}`}
      </p>

      <div className="preview-guide-actions">
        <button
          type="button"
          className="preview-guide-btn"
          onClick={onPrev}
          disabled={isFirst}
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="preview-guide-btn preview-guide-btn-primary"
          onClick={onNext}
          disabled={isLast}
          title="Next page — I'll flip it for you!"
        >
          <ChevronRight className="h-4 w-4" />
          Flip
        </button>
      </div>
    </div>
  );
}
