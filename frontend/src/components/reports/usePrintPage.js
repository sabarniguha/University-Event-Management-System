import { useEffect } from 'react';

// While a report page is open: A4 pages with sensible margins, colours kept, and a default PDF file name.
// The rules are added on mount and removed on leave, so printing anything else in the app is not affected.
export default function usePrintPage(fileName) {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @page { size: A4; margin: 12mm; }
      @media print {
        html, body { background: #fff !important; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .report-block { break-inside: avoid; }
        .report-break { break-before: page; }
        .report-doc { box-shadow: none !important; border: 0 !important; padding: 0 !important; max-width: none !important; }
      }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // Browsers use the page title as the suggested PDF file name.
  return () => {
    const previous = document.title;
    const restore = () => { document.title = previous; window.removeEventListener('afterprint', restore); };
    document.title = fileName;
    window.addEventListener('afterprint', restore);
    window.print();
    setTimeout(restore, 4000);
  };
}
