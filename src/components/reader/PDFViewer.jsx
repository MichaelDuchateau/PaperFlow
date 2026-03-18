import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';

// Point pdfjs at the bundled worker (Vite resolves ?url to a proper URL in both dev and prod)
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const SCALE = 1.5;

/** Renders a single PDF page into a <canvas> with a selectable text layer on top */
function PDFPage({ page, scale = SCALE }) {
  const canvasRef    = useRef(null);
  const textLayerRef = useRef(null);
  const tlInstanceRef = useRef(null);

  useEffect(() => {
    if (!page || !canvasRef.current) return;

    const viewport = page.getViewport({ scale });
    const canvas   = canvasRef.current;
    canvas.height  = viewport.height;
    canvas.width   = viewport.width;

    const ctx        = canvas.getContext('2d');
    const renderTask = page.render({ canvasContext: ctx, viewport });

    // Text layer — pdfjs v4 uses new TextLayer({ textContentSource, container, viewport })
    const textContainer = textLayerRef.current;
    if (textContainer) {
      textContainer.innerHTML = '';
      const tl = new pdfjsLib.TextLayer({
        textContentSource: page.streamTextContent(),
        container: textContainer,
        viewport,
      });
      tlInstanceRef.current = tl;
      tl.render().catch(() => { /* cancelled */ });
    }

    return () => {
      renderTask.cancel();
      tlInstanceRef.current?.cancel();
      tlInstanceRef.current = null;
    };
  }, [page, scale]);

  return (
    <div className="relative mx-auto shadow-lg" style={{ display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        className="block bg-white"
        style={{ maxWidth: '100%' }}
      />
      <div ref={textLayerRef} className="textLayer" />
    </div>
  );
}

export default function PDFViewer({ paperId, onTextSelected }) {
  const [pages,    setPages]    = useState([]);
  const [numPages, setNumPages] = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const pdfDocRef = useRef(null);
  const viewerRef = useRef(null);

  const loadPdf = useCallback(async () => {
    if (!paperId) return;
    setLoading(true);
    setError(null);
    setPages([]);

    try {
      const buffer = await window.api.papers.getPdfBuffer(paperId);
      if (!buffer) throw new Error('PDF file not found.');

      const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

      const loadingTask = pdfjsLib.getDocument({ data });
      const pdf = await loadingTask.promise;
      pdfDocRef.current = pdf;
      setNumPages(pdf.numPages);

      const pageObjects = await Promise.all(
        Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1))
      );
      setPages(pageObjects);
    } catch (err) {
      setError(err.message ?? 'Failed to load PDF.');
    } finally {
      setLoading(false);
    }
  }, [paperId]);

  useEffect(() => {
    loadPdf();
    return () => { pdfDocRef.current?.destroy(); pdfDocRef.current = null; };
  }, [loadPdf]);

  // Detect text selection inside the PDF panel
  useEffect(() => {
    const container = viewerRef.current;
    if (!container || !onTextSelected) return;

    const handleMouseUp = () => {
      const text = window.getSelection()?.toString().trim() || null;
      onTextSelected(text);
    };

    container.addEventListener('mouseup', handleMouseUp);
    return () => container.removeEventListener('mouseup', handleMouseUp);
  }, [onTextSelected]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center gap-2 text-gray-600 text-sm">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        Loading PDF…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-600 text-sm p-6">
        <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <p>{error}</p>
        <button onClick={loadPdf} className="text-brand-400 hover:text-brand-300 text-xs">Retry</button>
      </div>
    );
  }

  return (
    <div ref={viewerRef} className="flex-1 overflow-auto bg-gray-950 px-4 py-4 space-y-4 selectable">
      <p className="text-xs text-gray-600 text-center">{numPages} page{numPages !== 1 ? 's' : ''}</p>

      {pages.map((page, i) => (
        <div key={i}>
          <PDFPage page={page} scale={SCALE} />
          {i < pages.length - 1 && <div className="h-2" />}
        </div>
      ))}
    </div>
  );
}
