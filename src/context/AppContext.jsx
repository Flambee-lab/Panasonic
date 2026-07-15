import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { DUPLICATE_IP, INITIAL_CAMERAS, sequentialIps } from "../data/initialCameras";
import {
  createBlankOsdDraft,
  createSequentialOsdDraft,
  buildCameraOsdSnapshot,
  aliasFromAppliedTitle,
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
  const [configurePoolIds, setConfigurePoolIds] = useState([]);
  const [recentlyConfiguredIds, setRecentlyConfiguredIds] = useState([]);
  const [previewCameraId, setPreviewCameraId] = useState(null);
  const [osdDraft, setOsdDraft] = useState(() => createBlankOsdDraft([]));
  const [propagateOsd, setPropagateOsd] = useState(true);
  const [osdCategory, setOsdCategory] = useState("image");
  const [configDrawerMode, setConfigDrawerMode] = useState(null);
  const [sequentialIndex, setSequentialIndex] = useState(0);
  const [cgiSender, setCgiSender] = useState({
    visible: false,
    startedAt: null,
    items: [],
    completedCount: 0,
  });
  const cgiTimersRef = useRef([]);

  const showToast = useCallback((title, message, type = "info", options = {}) => {
    setToast({ title, message, type, ...options });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const clearRecentlyConfigured = useCallback(() => {
    setRecentlyConfiguredIds([]);
  }, []);

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
    () =>
      batchSelectedCameraIds
        .map((id) => cameras.find((c) => c.id === id))
        .filter(Boolean),
    [cameras, batchSelectedCameraIds]
  );

  const poolCameras = useMemo(
    () =>
      configurePoolIds
        .map((id) => cameras.find((c) => c.id === id))
        .filter(Boolean),
    [cameras, configurePoolIds]
  );

  const notInBatchCameras = useMemo(
    () => poolCameras.filter((c) => !batchSelectedCameraIds.includes(c.id)),
    [poolCameras, batchSelectedCameraIds]
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
          : Array.from(selectedIds);

      if (ids.length === 0) return;

      setDrawerOpen(false);
      setConfigDrawerMode(null);
      setRecentlyConfiguredIds([]);
      setConfigurePoolIds(ids);
      setBatchSelectedCameraIds(ids);
      setPreviewCameraId(ids[0] ?? null);
      setOsdDraft(createBlankOsdDraft(ids));
      setPropagateOsd(true);
      setOsdCategory("image");
      setSequentialIndex(0);
      setActiveView("configure-review");
    },
    [selectedIds]
  );

  const navigateToNetwork = useCallback(() => {
    setConfigDrawerMode(null);
    setRecentlyConfiguredIds([]);
    setSelectedIds(new Set());
    setConfigurePoolIds([]);
    setBatchSelectedCameraIds([]);
    setActiveView("network");
  }, []);

  const keepEditingAfterConfigure = useCallback(() => {
    setConfigDrawerMode(null);
    setRecentlyConfiguredIds([]);
    setActiveView("configure-review");
  }, []);

  const startBatchConfigure = useCallback(
    (cameraIds) => {
      const ids =
        cameraIds && cameraIds.length > 0 ? cameraIds : batchSelectedCameraIds;
      if (ids.length === 0) return;
      setRecentlyConfiguredIds([]);
      setBatchSelectedCameraIds(ids);
      setOsdDraft(createBlankOsdDraft(ids));
      setPropagateOsd(true);
      setPreviewCameraId(ids[0] ?? null);
      setConfigDrawerMode("batch");
    },
    [batchSelectedCameraIds]
  );

  const startSequentialConfigure = useCallback(
    (cameraIds) => {
      const ids =
        cameraIds && cameraIds.length > 0 ? cameraIds : batchSelectedCameraIds;
      if (ids.length === 0) return;
      const firstCam = cameras.find((c) => c.id === ids[0]) ?? null;
      setRecentlyConfiguredIds([]);
      setBatchSelectedCameraIds(ids);
      setSequentialIndex(0);
      setOsdDraft(createSequentialOsdDraft(ids, firstCam));
      setPropagateOsd(false);
      setPreviewCameraId(ids[0] ?? null);
      setConfigDrawerMode("sequential");
    },
    [batchSelectedCameraIds, cameras]
  );

  const closeConfigDrawer = useCallback(() => {
    setConfigDrawerMode(null);
  }, []);

  const moveCameraToBatch = useCallback((cameraId) => {
    setBatchSelectedCameraIds((prev) =>
      prev.includes(cameraId) ? prev : [...prev, cameraId]
    );
    setOsdDraft((prev) => ({
      ...prev,
      cameraTitles: {
        ...prev.cameraTitles,
        [cameraId]: prev.cameraTitles?.[cameraId] ?? "",
      },
    }));
  }, []);

  const removeCameraFromBatch = useCallback((cameraId) => {
    setBatchSelectedCameraIds((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((id) => id !== cameraId);
    });
    setPreviewCameraId((current) => {
      if (current !== cameraId) return current;
      return null;
    });
  }, []);

  const openFullOsdEditor = useCallback(() => {
    setConfigDrawerMode(null);
    setActiveView("configure-osd");
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
      const sendTimer = setTimeout(() => {
        setCgiSender((prev) => ({
          ...prev,
          items: prev.items.map((row) =>
            row.cameraId === item.cameraId ? { ...row, status: "sending" } : row
          ),
        }));

        const completeTimer = setTimeout(() => {
          setCameras((prevCams) =>
            prevCams.map((cam) => {
              if (cam.id !== item.cameraId) return cam;
              const osdPayload = buildCameraOsdSnapshot(
                settingsSnapshot,
                item.cameraId,
                cam.alias ?? "",
                cam.osd
              );
              const nextAlias =
                osdPayload.cameraTitleOn === "On" && osdPayload.cameraTitleText?.trim()
                  ? aliasFromAppliedTitle(
                      osdPayload.cameraTitleText,
                      cam.deviceId,
                      cam.alias
                    )
                  : cam.alias;
              return { ...cam, alias: nextAlias, osd: osdPayload };
            })
          );

          setCgiSender((prev) => {
            const nextItems = prev.items.map((row) =>
              row.cameraId === item.cameraId ? { ...row, status: "completed" } : row
            );
            const completedCount = nextItems.filter((r) => r.status === "completed").length;
            const allDone = completedCount === nextItems.length;

            if (allDone) {
              const finishTimer = setTimeout(() => {
                setCgiSender({
                  visible: false,
                  startedAt: null,
                  items: [],
                  completedCount: 0,
                });
                setConfigDrawerMode(null);
                setRecentlyConfiguredIds(targetIds);
                setBatchSelectedCameraIds(targetIds);
                if (activeView !== "configure-review") {
                  setActiveView("network");
                  showToast(
                    "OSD batch applied",
                    `${completedCount} camera${completedCount === 1 ? "" : "s"} configured successfully via CGI.`,
                    "success"
                  );
                } else {
                  showToast(
                    "",
                    `${completedCount} camera${completedCount === 1 ? "" : "s"} reconfigured successfully`,
                    "reconfigure-success",
                    {
                      actionLabel: "Keep editing",
                      action: "keep-editing",
                      duration: 8000,
                    }
                  );
                }
              }, 0);
              cgiTimersRef.current.push(finishTimer);
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
    activeView,
  ]);

  const applySequentialOsdSettings = useCallback(
    ({ advance = true, closeWhenDone = false } = {}) => {
      const cameraId = batchSelectedCameraIds[sequentialIndex];
      if (!cameraId || !isOsdDraftReadyToApply(osdDraft) || cgiSender.visible) return;

      const cam = cameras.find((c) => c.id === cameraId);
      const osdPayload = buildCameraOsdSnapshot(
        osdDraft,
        cameraId,
        cam?.alias ?? "",
        cam?.osd
      );
      const nextAlias =
        osdPayload.cameraTitleOn === "On" && osdPayload.cameraTitleText?.trim()
          ? aliasFromAppliedTitle(osdPayload.cameraTitleText, cam?.deviceId, cam?.alias)
          : cam?.alias;

      setCameras((prev) =>
        prev.map((row) =>
          row.id === cameraId ? { ...row, alias: nextAlias ?? row.alias, osd: osdPayload } : row
        )
      );

      const configuredIds = recentlyConfiguredIds.includes(cameraId)
        ? recentlyConfiguredIds
        : [...recentlyConfiguredIds, cameraId];
      setRecentlyConfiguredIds(configuredIds);

      if (closeWhenDone) {
        setConfigDrawerMode(null);
        showToast(
          "",
          `${configuredIds.length} camera${configuredIds.length === 1 ? "" : "s"} reconfigured successfully`,
          "reconfigure-success",
          {
            actionLabel: "Keep editing",
            action: "keep-editing",
            duration: 8000,
          }
        );
        return;
      }

      if (advance && sequentialIndex < batchSelectedCameraIds.length - 1) {
        const nextIndex = sequentialIndex + 1;
        const nextId = batchSelectedCameraIds[nextIndex];
        const nextCam = cameras.find((c) => c.id === nextId) ?? null;
        setSequentialIndex(nextIndex);
        setPreviewCameraId(nextId);
        setOsdDraft(createSequentialOsdDraft(batchSelectedCameraIds, nextCam));
      }
    },
    [
      batchSelectedCameraIds,
      cameras,
      cgiSender.visible,
      osdDraft,
      recentlyConfiguredIds,
      sequentialIndex,
      showToast,
    ]
  );

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
      configurePoolIds,
      recentlyConfiguredIds,
      clearRecentlyConfigured,
      batchCameras,
      poolCameras,
      notInBatchCameras,
      moveCameraToBatch,
      removeCameraFromBatch,
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
      keepEditingAfterConfigure,
      startBatchConfigure,
      startSequentialConfigure,
      closeConfigDrawer,
      openFullOsdEditor,
      configDrawerMode,
      sequentialIndex,
      setSequentialIndex,
      applyBatchOsdSettings,
      applySequentialOsdSettings,
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
      configurePoolIds,
      recentlyConfiguredIds,
      clearRecentlyConfigured,
      batchCameras,
      poolCameras,
      notInBatchCameras,
      moveCameraToBatch,
      removeCameraFromBatch,
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
      keepEditingAfterConfigure,
      startBatchConfigure,
      startSequentialConfigure,
      closeConfigDrawer,
      openFullOsdEditor,
      configDrawerMode,
      sequentialIndex,
      applyBatchOsdSettings,
      applySequentialOsdSettings,
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
