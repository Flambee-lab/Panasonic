import CameraMonitor from "./CameraMonitor";

export default function CameraPreviewModal({ camera, onClose, onSelectCamera }) {
  return <CameraMonitor camera={camera} onClose={onClose} onSelectCamera={onSelectCamera} />;
}
