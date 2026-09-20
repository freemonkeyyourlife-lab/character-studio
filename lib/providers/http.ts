export async function fetchImageBlob(url: string, provider: string, timeoutMs = 15_000): Promise<Blob> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`${provider} returned an unreadable image.`);
    return response.blob();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`${provider} image download timed out.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}


export async function fetchMediaBlob(url: string, provider: string, timeoutMs = 60_000): Promise<Blob> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`${provider} returned an unreadable media file.`);
    return response.blob();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`${provider} media download timed out.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
