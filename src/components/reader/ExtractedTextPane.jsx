import React from 'react';

export default function ExtractedTextPane({ rawText }) {
  if (!rawText || rawText.trim().length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm px-6 text-center">
        No text extracted for this PDF. This may be a scanned document.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-800 bg-gray-900 flex-shrink-0">
        <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded font-mono">pdf-parse</span>
        <span className="text-xs text-gray-600">{rawText.length.toLocaleString()} chars</span>
      </div>
      <div className="flex-1 overflow-auto px-5 py-4">
        <pre className="text-sm text-gray-300 whitespace-pre-wrap break-words leading-relaxed font-sans selectable">
          {rawText}
        </pre>
      </div>
    </div>
  );
}
