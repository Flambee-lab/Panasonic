/** Per-camera previews: only people walking or building exteriors (Pexels/Unsplash). */
export const THUMB_CACHE_VERSION = 7;

const CAMERA_THUMB_BY_ID = {
  "cam-1": "/assets/camera-thumbs/cam-1.jpg",
  "cam-2": "/assets/camera-thumbs/cam-2.jpg",
  "cam-3": "/assets/camera-thumbs/cam-3.jpg",
  "cam-4": "/assets/camera-thumbs/cam-4.jpg",
  "cam-h-1": "/assets/camera-thumbs/cam-h-1.jpg",
  "cam-h-2": "/assets/camera-thumbs/cam-h-2.jpg",
  "cam-h-3": "/assets/camera-thumbs/cam-h-3.jpg",
  "cam-h-4": "/assets/camera-thumbs/cam-h-4.jpg",
  "cam-h-5": "/assets/camera-thumbs/cam-h-5.jpg",
  "cam-h-6": "/assets/camera-thumbs/cam-h-6.jpg",
  "cam-h-7": "/assets/camera-thumbs/cam-h-7.jpg",
  "cam-h-8": "/assets/camera-thumbs/cam-h-8.jpg",
  "cam-h-9": "/assets/camera-thumbs/cam-h-9.jpg",
  "cam-h-10": "/assets/camera-thumbs/cam-h-10.jpg",
  "cam-h-11": "/assets/camera-thumbs/cam-h-11.jpg",
  "cam-h-12": "/assets/camera-thumbs/cam-h-12.jpg",
};

const FALLBACK_URLS = Object.values(CAMERA_THUMB_BY_ID);

export function getCameraThumbUrl(cameraId) {
  const base =
    CAMERA_THUMB_BY_ID[cameraId] ??
    (() => {
      let hash = 0;
      const key = String(cameraId ?? "");
      for (let i = 0; i < key.length; i += 1) {
        hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
      }
      return FALLBACK_URLS[hash % FALLBACK_URLS.length];
    })();

  return `${base}?v=${THUMB_CACHE_VERSION}`;
}
