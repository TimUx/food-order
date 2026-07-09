import { subscribePrintJobs } from '@/services/realtime/channels';

function printHtml(html: string, title: string): void {
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = 'none';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><title>${title}</title></head><body>${html}</body></html>`);
  doc.close();
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  setTimeout(() => frame.remove(), 1000);
}

function printPdfBase64(pdfBase64: string, title: string): void {
  const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.document.title = title;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function startPrintJobListener(): () => void {
  return subscribePrintJobs((job) => {
    if (job.pdfBase64) {
      printPdfBase64(job.pdfBase64, job.title);
      return;
    }
    if (job.html) {
      printHtml(job.html, job.title);
      return;
    }
    if (job.lines?.length) {
      const html = `<pre style="font-family:monospace;font-size:14px">${job.lines.join('\n')}</pre>`;
      printHtml(html, job.title);
    }
  });
}
