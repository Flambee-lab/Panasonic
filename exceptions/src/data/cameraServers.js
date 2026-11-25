export const CAMERA_SERVERS = [
  { id: "hawk-south", name: "HawkMonitor-South" },
  { id: "falcon", name: "FalconVision-Central" },
  { id: "hawk-east", name: "HawkMonitor-East" },
  { id: "raven", name: "RavenWatch-West" },
  { id: "lynx", name: "LynxView-Server03" },
  { id: "tiger", name: "TigerEye-Backup" },
  { id: "phoenix", name: "PhoenixCam-01" },
  { id: "griffin", name: "GriffinSurveillance-Central" },
  { id: "wolf", name: "WolfPack-SecurityNode" },
  { id: "viper", name: "ViperGuard-East" },
  { id: "jaguar", name: "JaguarSurveil-Main" },
  { id: "orion", name: "OrionMonitor-S01" },
  { id: "scorpion", name: "ScorpionWatch-Tower" },
  { id: "dragon", name: "DragonCam-Server" },
];

export function groupCamerasByServer(cameras) {
  const [primary, ...rest] = CAMERA_SERVERS;
  return [{ ...primary, cameras }, ...rest.map((server) => ({ ...server, cameras: [] }))];
}
