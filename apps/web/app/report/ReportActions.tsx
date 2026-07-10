"use client";

/**
 * Report export controls. "Save as PDF" opens the browser print dialog against a print-optimized
 * stylesheet (see globals.css `@media print`) — a dependency-free, everywhere-works way to produce a
 * shareable PDF of the State-of-AI report. Hidden when printing.
 */
export function ReportActions() {
  return (
    <div className="report-actions no-print">
      <button type="button" className="report-pdf-btn" onClick={() => window.print()}>
        Save as PDF
      </button>
    </div>
  );
}
