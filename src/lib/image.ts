/**
 * Read an image file into a data URL, downscaled so it fits comfortably in
 * localStorage. A 4 MB logo would blow the ~5 MB origin quota on its own and
 * silently break every save that follows.
 */
export async function fileToDataUrl(file: File, maxSize = 512): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Not an image file");

  // SVG has no intrinsic raster size; keep it as-is.
  if (file.type === "image/svg+xml") return readAsDataUrl(file);

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // PNG keeps the alpha channel that logos depend on.
  return canvas.toDataURL("image/png");
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
