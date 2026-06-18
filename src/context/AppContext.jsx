import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { DUPLICATE_IP, INITIAL_CAMERAS, sequentialIps } from "../data/initialCameras";
import {
  createBlankOsdDraft,
  buildCameraOsdSnapshot,
  isOsdDraftReadyToApply,
} from "../data/osdDefaults";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [cameras, setCameras] = useState(INITIAL_CAMERAS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerFlowType, setDrawerFlowType] = useState("ip");
  const [drawerPhase, setDrawerPhase] = useState("plan");
  const [securityPhase, setSecurityPhase] = useState("form");
  const [baseIp, setBaseIp] = useState("192.168.0.20");
  const [subnetMask, setSubnetMask] = useState("255.255.255.0");
  const [gateway, setGateway] = useState("192.168.0.1");
  const [appliedIps, setAppliedIps] = useState(null);
  const [drawerCameraIds, setDrawerCameraIds] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [toast, setToast] = useState(null);
  const [activeView, setActiveView] = useState("network");
  const [batchSelectedCameraIds, setBatchSelectedCameraIds] = useState([]);
  const [previewCameraId, setPreviewCameraId] = useState(null);
  const [osdDraft, setOsdDraft] = useState(() => createBlankOsdDraft([]));
  const [propagateOsd, setPropagateOsd] = useState(true);
  const [osdCategory, setOsdCategory] = useState("image");
  const [cgiSender, setCgiSender] = useState({
    visible: false,
    startedAt: null,
    items: [],
    completedCount: 0,
  });
  const cgiTimersRef = useRef([]);

  const showToast = useCallback((title, message, type = "info") => {
    setToast({ title, message, type });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const conflictCameras = useMemo(
    () => cameras.filter((c) => c.status === "conflict"),
    [cameras]
  );

  const drawerCameras = useMemo(
    () => cameras.filter((c) => drawerCameraIds.includes(c.id)),
    [cameras, drawerCameraIds]
  );

  const hasConflict = conflictCameras.length > 0;

  const unregisteredCameras = useMemo(
    () => cameras.filter((c) => !c.adminRegistered),
    [cameras]
  );

  const hasDiagnosticIssues = hasConflict || unregisteredCameras.length > 0;

  const proposedIps = useMemo(
    () => sequentialIps(baseIp, drawerCameras.length),
    [baseIp, drawerCameras.length]
  );

  const canApplyIps = proposedIps.length === drawerCameras.length && drawerCameras.length > 0;

  const canChangeIp = useMemo(() => {
    if (!hasConflict || selectedIds.size === 0) return false;
    return cameras.some((c) => selectedIds.has(c.id) && c.status === "conflict");
  }, [hasConflict, selectedIds, cameras]);

  const canRegisterAdmin = useMemo(() => {
    if (selectedIds.size === 0) return false;
    return cameras.some(
      (c) => selectedIds.has(c.id) && !c.adminRegistered
    );
  }, [selectedIds, cameras]);

  const openIpDrawer = useCallback(
    (cameraIds) => {
      const ids =
        cameraIds ??
        cameras.filter((c) => c.status === "conflict").map((c) => c.id);
      const conflictIds = ids.filter((id) => {
        const cam = cameras.find((c) => c.id === id);
        return cam?.status === "conflict";
      });
      if (conflictIds.length === 0) return;

      setDrawerFlowType("ip");
      setDrawerPhase("plan");
      setSecurityPhase("form");
      setAppliedIps(null);
      setDrawerCameraIds(conflictIds);
      setDrawerOpen(true);
    },
    [cameras]
  );

  const openDrawer = openIpDrawer;

  const openDrawerForSelection = useCallback(() => {
    const ids = cameras
      .filter((c) => selectedIds.has(c.id) && c.status === "conflict")
      .map((c) => c.id);
    openIpDrawer(ids);
  }, [cameras, selectedIds, openIpDrawer]);

  const openSecurityDrawer = useCallback(
    (cameraIds) => {
      const ids =
        cameraIds ??
        cameras
          .filter((c) => selectedIds.has(c.id) && !c.adminRegistered)
          .map((c) => c.id);
      if (ids.length === 0) return;

      setDrawerFlowType("security");
      setSecurityPhase("form");
      setDrawerPhase("plan");
      setAppliedIps(null);
      setDrawerCameraIds(ids);
      setDrawerOpen(true);
    },
    [cameras, selectedIds]
  );

  const openSecurityDrawerForSelection = useCallback(() => {
    openSecurityDrawer();
  }, [openSecurityDrawer]);

  const openSecurityDrawerAll = useCallback(() => {
    const ids = cameras.filter((c) => !c.adminRegistered).map((c) => c.id);
    openSecurityDrawer(ids);
  }, [cameras, openSecurityDrawer]);

  const closeDrawer = useCallback(() => {
    if (drawerPhase === "processing") return;
    setDrawerOpen(false);
    setDrawerPhase("plan");
    setSecurityPhase("form");
    setDrawerFlowType("ip");
    setAppliedIps(null);
    setDrawerCameraIds([]);
  }, [drawerPhase]);

  const applyIpChanges = useCallback(() => {
    const ips = sequentialIps(baseIp, drawerCameras.length);
    if (ips.length !== drawerCameras.length) return;
    setAppliedIps(ips);
    setDrawerPhase("processing");
  }, [baseIp, drawerCameras.length]);

  const applyIpUpdatesToCameras = useCallback(
    (prev) => {
      const ipsToApply = appliedIps ?? proposedIps;
      const idToIp = Object.fromEntries(
        drawerCameraIds.map((id, index) => [id, ipsToApply[index]])
      );
      return prev.map((cam) =>
        idToIp[cam.id] ? { ...cam, ip: idToIp[cam.id], status: "online" } : cam
      );
    },
    [appliedIps, proposedIps, drawerCameraIds]
  );

  const finishIpResolution = useCallback(() => {
    setCameras((prev) => {
      const next = applyIpUpdatesToCameras(prev);
      setAppliedIps(null);
      setDrawerPhase("plan");
      setDrawerOpen(false);
      setDrawerCameraIds([]);
      setSelectedIds(new Set());
      return next;
    });
  }, [applyIpUpdatesToCameras]);

  const submitSecurityCredentials = useCallback(() => {
    setSecurityPhase("success");
  }, []);

  const finishSecurityResolution = useCallback(() => {
    setCameras((prev) => {
      const next = prev.map((cam) =>
        drawerCameraIds.includes(cam.id) ? { ...cam, adminRegistered: true } : cam
      );
      setDrawerOpen(false);
      setSecurityPhase("form");
      setDrawerFlowType("ip");
      setDrawerCameraIds([]);
      setSelectedIds(new Set());
      return next;
    });
  }, [drawerCameraIds]);

  const batchCameras = useMemo(
    () => cameras.filter((c) => batchSelectedCameraIds.includes(c.id)),
    [cameras, batchSelectedCameraIds]
  );

  const previewCamera = useMemo(
    () => cameras.find((c) => c.id === previewCameraId) ?? batchCameras[0] ?? null,
    [cameras, previewCameraId, batchCameras]
  );

  const clearCgiTimers = useCallback(() => {
    cgiTimersRef.current.forEach((id) => clearTimeout(id));
    cgiTimersRef.current = [];
  }, []);

  const openConfigureCameras = useCallback(
    (cameraIds) => {
      const ids =
        cameraIds && cameraIds.length > 0
          ? cameraIds
          : selectedIds.size > 0
            ? Array.from(selectedIds)
            : cameras.map((c) => c.id);

      setDrawerOpen(false);
      setBatchSelectedCameraIds(ids);
      setPreviewCameraId(ids[0] ?? null);
      setOsdDraft(createBlankOsdDraft(ids));
      setPropagateOsd(true);
      setOsdCategory("image");
      setActiveView("configure-osd");
    },
    [cameras, selectedIds]
  );

  const navigateToNetwork = useCallback(() => {
    setActiveView("network");
  }, []);

  const updateOsdDraft = useCallback((patch) => {
    setOsdDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const selectPreviewCamera = useCallback((id) => {
    setPreviewCameraId(id);
  }, []);

  const canApplyOsd = useMemo(
    () => isOsdDraftReadyToApply(osdDraft) && batchSelectedCameraIds.length > 0,
    [osdDraft, batchSelectedCameraIds.length]
  );

  const applyBatchOsdSettings = useCallback(() => {
    if (!isOsdDraftReadyToApply(osdDraft) || batchSelectedCameraIds.length === 0 || cgiSender.visible) {
      return;
    }

    clearCgiTimers();
    const startedAt = new Date();
    const targetIds = propagateOsd
      ? batchSelectedCameraIds
      : previewCameraId
        ? [previewCameraId]
        : batchSelectedCameraIds.slice(0, 1);

    const items = targetIds.map((id) => {
      const cam = cameras.find((c) => c.id === id);
      return { cameraId: id, alias: cam?.alias ?? id, status: "pending" };
    });

    setCgiSender({
      visible: true,
      startedAt,
      items,
      completedCount: 0,
    });

    const settingsSnapshot = { ...osdDraft };

    items.forEach((item, index) => {
      const cam = cameras.find((c) => c.id === item.cameraId);
      const osdPayload = buildCameraOsdSnapshot(
        settingsSnapshot,
        item.cameraId,
        cam?.alias ?? ""
      );
      const sendTimer = setTimeout(() => {
        setCgiSender((prev) => ({
          ...prev,
          items: prev.items.map((row) =>
            row.cameraId === item.cameraId ? { ...row, status: "sending" } : row
          ),
        }));

        const completeTimer = setTimeout(() => {
          setCameras((prevCams) =>
            prevCams.map((cam) =>
              cam.id === item.cameraId ? { ...cam, osd: osdPayload } : cam
            )
          );

          setCgiSender((prev) => {
            const nextItems = prev.items.map((row) =>
              row.cameraId === item.cameraId ? { ...row, status: "completed" } : row
            );
            const completedCount = nextItems.filter((r) => r.status === "completed").length;
            const allDone = completedCount === nextItems.length;

            if (allDone) {
              const hideTimer = setTimeout(() => {
                setCgiSender({
                  visible: false,
                  startedAt: null,
                  items: [],
                  completedCount: 0,
                });
                setActiveView("network");
                showToast(
                  "OSD batch applied",
                  `${completedCount} camera${completedCount === 1 ? "" : "s"} configured successfully via CGI.`,
                  "success"
                );
              }, 4000);
              cgiTimersRef.current.push(hideTimer);
            }

            return {
              ...prev,
              items: nextItems,
              completedCount,
            };
          });
        }, 800);
        cgiTimersRef.current.push(completeTimer);
      }, index * 800);
      cgiTimersRef.current.push(sendTimer);
    });
  }, [
    batchSelectedCameraIds,
    cameras,
    cgiSender.visible,
    clearCgiTimers,
    osdDraft,
    previewCameraId,
    propagateOsd,
    showToast,
  ]);

  const stats = useMemo(() => {
    const total = cameras.length;
    const conflicts = conflictCameras.length;
    const unregistered = unregisteredCameras.length;
    const online = cameras.filter((c) => c.status === "online").length;
    return { total, conflicts, unregistered, online };
  }, [cameras, conflictCameras.length, unregisteredCameras.length]);

  const value = useMemo(
    () => ({
      cameras,
      conflictCameras,
      drawerCameras,
      drawerCameraIds,
      selectedIds,
      setSelectedIds,
      drawerOpen,
      drawerFlowType,
      drawerPhase,
      setDrawerPhase,
      securityPhase,
      setSecurityPhase,
      baseIp,
      setBaseIp,
      subnetMask,
      setSubnetMask,
      gateway,
      setGateway,
      hasConflict,
      hasDiagnosticIssues,
      unregisteredCameras,
      proposedIps,
      appliedIps,
      canApplyIps,
      canChangeIp,
      canRegisterAdmin,
      duplicateIp: DUPLICATE_IP,
      stats,
      toast,
      showToast,
      dismissToast,
      openDrawer,
      openDrawerForSelection,
      openIpDrawer,
      openSecurityDrawer,
      openSecurityDrawerForSelection,
      openSecurityDrawerAll,
      closeDrawer,
      applyIpChanges,
      finishIpResolution,
      submitSecurityCredentials,
      finishSecurityResolution,
      activeView,
      setActiveView,
      batchSelectedCameraIds,
      batchCameras,
      previewCameraId,
      setPreviewCameraId,
      selectPreviewCamera,
      previewCamera,
      osdDraft,
      updateOsdDraft,
      propagateOsd,
      setPropagateOsd,
      osdCategory,
      setOsdCategory,
      cgiSender,
      openConfigureCameras,
      navigateToNetwork,
      applyBatchOsdSettings,
      canApplyOsd,
    }),
    [
      cameras,
      conflictCameras,
      drawerCameras,
      drawerCameraIds,
      selectedIds,
      drawerOpen,
      drawerFlowType,
      drawerPhase,
      securityPhase,
      baseIp,
      subnetMask,
      gateway,
      hasConflict,
      hasDiagnosticIssues,
      unregisteredCameras,
      proposedIps,
      appliedIps,
      canApplyIps,
      canChangeIp,
      canRegisterAdmin,
      stats,
      toast,
      showToast,
      dismissToast,
      openDrawer,
      openDrawerForSelection,
      openIpDrawer,
      openSecurityDrawer,
      openSecurityDrawerForSelection,
      openSecurityDrawerAll,
      closeDrawer,
      applyIpChanges,
      finishIpResolution,
      submitSecurityCredentials,
      finishSecurityResolution,
      activeView,
      batchSelectedCameraIds,
      batchCameras,
      previewCameraId,
      selectPreviewCamera,
      previewCamera,
      osdDraft,
      updateOsdDraft,
      propagateOsd,
      osdCategory,
      cgiSender,
      openConfigureCameras,
      navigateToNetwork,
      applyBatchOsdSettings,
      canApplyOsd,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
