/** Save a PNG data URL to the server or trigger a device download. */
export async function savePhotoToDevice(
  dataUrl: string,
  themeId: string
): Promise<boolean> {
  try {
    const res = await fetch('/api/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId, imageData: dataUrl }),
    });
    if (res.ok) return true;
  } catch {
    /* fall through to download */
  }

  const link = document.createElement('a');
  link.download = `${themeId}-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
  return true;
}
