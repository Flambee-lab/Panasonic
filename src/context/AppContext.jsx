import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { DUPLICATE_IP, INITIAL_CAMERAS, sequentialIps } from "../data/initialCameras";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [cameras, setCameras] = useState(INITIAL_CAMERAS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPhase, setDrawerPhase] = useState("plan");
  const [baseIp, setBaseIp] = useState("192.168.0.20");
  const [subnetMask, setSubnetMask] = useState("255.255.255.0");
  const [gateway, setGateway] = useState("192.168.0.1");
  const [appliedIps, setAppliedIps] = useState(null);
  const [drawerCameraIds, setDrawerCameraIds] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const conflictCameras = useMemo(
    () => cameras.filter((c) => c.status === "conflict"),
    [cameras]
  );

  const drawerCameras = useMemo(
    () => cameras.filter((c) => drawerCameraIds.includes(c.id)),
    [cameras, drawerCameraIds]
  );

  const hasConflict = conflictCameras.length > 0;

  const proposedIps = useMemo(
    () => sequentialIps(baseIp, drawerCameras.length),
    [baseIp, drawerCameras.length]
  );

  const canApplyIps = proposedIps.length === drawerCameras.length && drawerCameras.length > 0;

  const canChangeIp = useMemo(() => {
    if (!hasConflict || selectedIds.size === 0) return false;
    return cameras.some((c) => selectedIds.has(c.id) && c.status === "conflict");
  }, [hasConflict, selectedIds, cameras]);

  const openDrawer = useCallback(
    (cameraIds) => {
      if (!hasConflict) return;
      const ids =
        cameraIds ??
        cameras.filter((c) => c.status === "conflict").map((c) => c.id);
      const conflictIds = ids.filter((id) => {
        const cam = cameras.find((c) => c.id === id);
        return cam?.status === "conflict";
      });
      if (conflictIds.length === 0) return;

      setDrawerCameraIds(conflictIds);
      setDrawerPhase("plan");
      setAppliedIps(null);
      setDrawerOpen(true);
    },
    [hasConflict, cameras]
  );

  const openDrawerForSelection = useCallback(() => {
    const ids = cameras
      .filter((c) => selectedIds.has(c.id) && c.status === "conflict")
      .map((c) => c.id);
    openDrawer(ids);
  }, [cameras, selectedIds, openDrawer]);

  const closeDrawer = useCallback(() => {
    if (drawerPhase === "processing") return;
    setDrawerOpen(false);
    setDrawerPhase("plan");
    setAppliedIps(null);
    setDrawerCameraIds([]);
  }, [drawerPhase]);

  const applyIpChanges = useCallback(() => {
    const ips = sequentialIps(baseIp, drawerCameras.length);
    if (ips.length !== drawerCameras.length) return;
    setAppliedIps(ips);
    setDrawerPhase("processing");
  }, [baseIp, drawerCameras.length]);

  const finishResolution = useCallback(() => {
    const ipsToApply = appliedIps ?? proposedIps;
    const idToIp = Object.fromEntries(
      drawerCameraIds.map((id, index) => [id, ipsToApply[index]])
    );

    setCameras((prev) =>
      prev.map((cam) =>
        idToIp[cam.id]
          ? { ...cam, ip: idToIp[cam.id], status: "online" }
          : cam
      )
    );
    setAppliedIps(null);
    setDrawerOpen(false);
    setDrawerPhase("plan");
    setDrawerCameraIds([]);
    setSelectedIds(new Set());
  }, [appliedIps, proposedIps, drawerCameraIds]);

  const stats = useMemo(() => {
    const total = cameras.length;
    const conflicts = conflictCameras.length;
    const online = cameras.filter((c) => c.status === "online").length;
    return { total, conflicts, online };
  }, [cameras, conflictCameras.length]);

  const value = useMemo(
    () => ({
      cameras,
      conflictCameras,
      drawerCameras,
      drawerCameraIds,
      selectedIds,
      setSelectedIds,
      drawerOpen,
      drawerPhase,
      setDrawerPhase,
      baseIp,
      setBaseIp,
      subnetMask,
      setSubnetMask,
      gateway,
      setGateway,
      hasConflict,
      proposedIps,
      appliedIps,
      canApplyIps,
      canChangeIp,
      duplicateIp: DUPLICATE_IP,
      stats,
      openDrawer,
      openDrawerForSelection,
      closeDrawer,
      applyIpChanges,
      finishResolution,
    }),
    [
      cameras,
      conflictCameras,
      drawerCameras,
      drawerCameraIds,
      selectedIds,
      drawerOpen,
      drawerPhase,
      baseIp,
      subnetMask,
      gateway,
      hasConflict,
      proposedIps,
      appliedIps,
      canApplyIps,
      canChangeIp,
      stats,
      openDrawer,
      openDrawerForSelection,
      closeDrawer,
      applyIpChanges,
      finishResolution,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp debe usarse dentro de AppProvider");
  return ctx;
}
