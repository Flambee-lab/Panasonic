/** Local CCTV / surveillance-style previews (Unsplash, free license). */
export const CAMERA_THUMB_URLS = [
  "/assets/camera-thumbs/01.jpg",
  "/assets/camera-thumbs/02.jpg",
  "/assets/camera-thumbs/03.jpg",
  "/assets/camera-thumbs/04.jpg",
  "/assets/camera-thumbs/05.jpg",
  "/assets/camera-thumbs/06.jpg",
  "/assets/camera-thumbs/07.jpg",
  "/assets/camera-thumbs/08.jpg",
  "/assets/camera-thumbs/09.jpg",
  "/assets/camera-thumbs/10.jpg",
  "/assets/camera-thumbs/11.jpg",
  "/assets/camera-thumbs/12.jpg",
  "/assets/camera-thumbs/13.jpg",
  "/assets/camera-thumbs/14.jpg",
  "/assets/camera-thumbs/15.jpg",
  "/assets/camera-thumbs/16.jpg",
];

export function getCameraThumbUrl(cameraId) {
  let hash = 0;
  const key = String(cameraId ?? "");
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return CAMERA_THUMB_URLS[hash % CAMERA_THUMB_URLS.length];
}
