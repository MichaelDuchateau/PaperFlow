import React, { useEffect, useRef, useState } from 'react';
import { Markmap } from 'markmap-view';

export default function MindMapViewer({ paperId, paper, onGenerate, generating }) {
  const svgRef  = useRef(null);
  const mmRef   = useRef(null);
  const [markdown, setMarkdown] = useState(null);
  const [loading,  setLoading]  = useState(true);

  // Load mindmap markdown from DB / disk
  useEffect(() => {
    if (!paperId) return;
    let cancelled = false;
    setLoading(true);
    window.api.markmap.get(paperId).then(md => {
      if (!cancelled) { setMarkdown(md); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [paperId, paper?.mindmap_path]);

  // Render / re-render when markdown changes
  useEffect(() => {
    if (!markdown || !svgRef.current) return;
    let cancelled = false;

    window.api.markmap.transform(markdown).then(({ root }) => {
      if (cancelled || !svgRef.current) return;
      if (mmRef.current) {
        mmRef.current.setData(root);
        mmRef.current.fit();
      } else {
        mmRef.current = Markmap.create(svgRef.current, {}, root);
        mmRef.current.fit();
      }
    });

    return () => { cancelled = true; };
  }, [markdown]);

  // Clean up Markmap instance on unmount
  useEffect(() => {
    return () => { mmRef.current = null; };
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        <svg className="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        Loading…
      </div>
    );
  }

  if (!markdown) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-600 p-6">
        <svg className="w-14 h-14 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-10l6-3m6 16l-6 3V7l6-3v16z" />
        </svg>
        <p className="text-sm text-center">No mind map yet.<br/>Use the <span className="text-brand-400">Mind Map</span> button below to generate one.</p>
        <button
          onClick={() => onGenerate?.('mindmap')}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm rounded-md transition-colors"
        >
          {generating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Generating…
            </>
          ) : 'Generate Mind Map'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden bg-gray-950">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ minHeight: 0 }}
      />
      {/* Fit button */}
      <button
        onClick={() => mmRef.current?.fit()}
        title="Fit to screen"
        className="absolute bottom-3 right-3 p-1.5 rounded bg-gray-800/80 border border-gray-700 text-gray-400 hover:text-gray-200 transition-colors text-xs"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
    </div>
  );
}
