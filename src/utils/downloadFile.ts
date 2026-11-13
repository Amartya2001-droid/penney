/** CSV download is offered only on web; JSON backup remains available on every platform. */
export function downloadFile(_text: string, _filename: string, _mimeType: string): void {
  throw new Error('File downloads are available in the web app.');
}
