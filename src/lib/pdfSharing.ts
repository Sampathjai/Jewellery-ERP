import { jsPDF } from 'jspdf';

export interface SharePdfOptions {
  doc: jsPDF;
  filename: string;
  title?: string;
  text?: string;
  onFallbackDownload?: () => void;
}

export interface ShareResult {
  success: boolean;
  method: 'share' | 'download' | 'canceled';
  message?: string;
}

/**
 * Universal PDF Sharing helper for Shankar Jewellery ERP.
 * Attempts native Web Share API file sharing (navigator.share with files),
 * gracefully falls back to PDF download for unsupported browsers,
 * and handles user cancellations without raising errors.
 */
export async function sharePdfDocument({
  doc,
  filename,
  title,
  text,
  onFallbackDownload,
}: SharePdfOptions): Promise<ShareResult> {
  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const shareTitle = title || cleanFilename.replace(/\.pdf$/i, '').replace(/_/g, ' ');
  const shareText = text || `Shankar Jewellery Document: ${shareTitle}`;

  // 1. Generate Blob & File from jsPDF instance
  let blob: Blob;
  try {
    blob = doc.output('blob');
  } catch (err) {
    console.error('Failed to output PDF blob from jsPDF instance:', err);
    return {
      success: false,
      method: 'download',
      message: 'Unable to generate the invoice PDF. Please try again.',
    };
  }

  const file = new File([blob], cleanFilename, { type: 'application/pdf' });

  // 2. Check if Web Share API with file sharing is supported on current browser/device
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  ) {
    try {
      const shareData = {
        title: shareTitle,
        text: shareText,
        files: [file],
      };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return { success: true, method: 'share' };
      }
    } catch (err: any) {
      // AbortError / NotAllowedError occurs when user cancels the native share sheet manually
      if (
        err?.name === 'AbortError' ||
        err?.name === 'NotAllowedError' ||
        err?.message?.toLowerCase().includes('cancel') ||
        err?.message?.toLowerCase().includes('abort')
      ) {
        return { success: true, method: 'canceled' };
      }
      console.warn('Native Web Share failed, switching to download fallback:', err);
    }
  }

  // 3. Fallback for desktop or browsers lacking Web Share API file support
  try {
    if (onFallbackDownload) {
      onFallbackDownload();
    } else {
      doc.save(cleanFilename);
    }
    return {
      success: true,
      method: 'download',
      message: 'PDF sharing is not supported in this browser. The invoice PDF has been downloaded so you can share it manually.',
    };
  } catch (downloadErr: any) {
    console.error('PDF download fallback failed:', downloadErr);
    return {
      success: false,
      method: 'download',
      message: 'Unable to generate the invoice PDF. Please try again.',
    };
  }
}
