import { toPng, toJpeg } from 'html-to-image';

/**
 * Capture full application screen or specific DOM element into a PNG data URL
 */
export async function captureElementAsDataUrl(elementId: string = 'root'): Promise<string> {
  const targetElement = document.getElementById(elementId) || document.body;

  try {
    // Hide tooltips or flash elements temporarily if needed
    const dataUrl = await toPng(targetElement, {
      quality: 0.95,
      pixelRatio: Math.min(window.devicePixelRatio || 2, 2),
      skipFonts: false,
      filter: (node) => {
        // Exclude modals or screenshot buttons during capture if they have no-screenshot class
        if (node instanceof HTMLElement && node.classList.contains('no-screenshot')) {
          return false;
        }
        return true;
      },
    });
    return dataUrl;
  } catch (error) {
    console.warn('html-to-image failed, falling back to JPEG or canvas:', error);
    try {
      const fallbackUrl = await toJpeg(targetElement, { quality: 0.9 });
      return fallbackUrl;
    } catch (fallbackError) {
      console.error('Screenshot capture failed completely:', fallbackError);
      throw new Error('Impossible de générer la capture d’écran de la page.');
    }
  }
}

/**
 * Trigger download of an image data URL
 */
export function downloadImage(dataUrl: string, filename?: string) {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const finalName = filename || `VerbaMind_Capture_${dateStr}.png`;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = finalName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Copy image data URL to system clipboard as PNG blob
 */
export async function copyImageToClipboard(dataUrl: string): Promise<boolean> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to copy image to clipboard:', e);
    return false;
  }
}
