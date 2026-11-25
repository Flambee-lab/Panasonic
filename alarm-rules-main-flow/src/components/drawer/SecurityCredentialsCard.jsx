import { useMemo } from "react";
import {
  evaluatePassword,
  isPasswordValid,
  passwordsMatch,
} from "../../utils/passwordValidation";
import PasswordRequirements from "./PasswordRequirements";

export default function SecurityCredentialsCard({
  mirrorEnabled,
  onMirrorChange,
  cameraPassword,
  onCameraPasswordChange,
  cameraConfirm,
  onCameraConfirmChange,
  recorderPassword,
  onRecorderPasswordChange,
  recorderConfirm,
  onRecorderConfirmChange,
}) {
  const cameraChecks = useMemo(
    () => evaluatePassword(cameraPassword),
    [cameraPassword]
  );
  const recorderChecks = useMemo(
    () => evaluatePassword(recorderPassword),
    [recorderPassword]
  );

  const cameraMatch = passwordsMatch(cameraPassword, cameraConfirm);
  const recorderMatch = passwordsMatch(recorderPassword, recorderConfirm);

  return (
    <div className="security-registry-card">
      <div className="security-registry-card__head">
        <div>
          <h3 className="security-registry-card__title">Security Registry</h3>
          <p className="security-registry-card__desc">
            Unified admin credentials for the selected batch
          </p>
        </div>
        <label className="security-mirror-switch">
          <input
            type="checkbox"
            checked={mirrorEnabled}
            onChange={(e) => onMirrorChange(e.target.checked)}
          />
          <span className="security-mirror-switch__track">
            <span className="security-mirror-switch__thumb" />
          </span>
          <span className="security-mirror-switch__label">Mirror to Recorder</span>
        </label>
      </div>

      <section className="security-registry-section">
        <div className="security-registry-section__badge security-registry-section__badge--cameras">
          CAMERAS
        </div>
        <div className="ip-drawer-field">
          <label htmlFor="sec-camera-pwd">Admin password</label>
          <input
            id="sec-camera-pwd"
            type="password"
            autoComplete="new-password"
            value={cameraPassword}
            onChange={(e) => onCameraPasswordChange(e.target.value)}
            placeholder="Enter camera admin password"
          />
        </div>
        <div className="ip-drawer-field">
          <label htmlFor="sec-camera-confirm">Confirm password</label>
          <input
            id="sec-camera-confirm"
            type="password"
            autoComplete="new-password"
            value={cameraConfirm}
            onChange={(e) => onCameraConfirmChange(e.target.value)}
            placeholder="Retype password"
          />
        </div>
        <PasswordRequirements
          checks={cameraChecks}
          showMatch
          matchOk={cameraMatch}
        />
      </section>

      {mirrorEnabled ? (
        <p className="security-mirror-note">
          Credentials entered above will be replicated automatically to all
          recorders in this batch.
        </p>
      ) : (
        <section className="security-registry-section security-registry-section--recorders">
          <div className="security-registry-section__badge security-registry-section__badge--recorders">
            RECORDERS
          </div>
          <div className="ip-drawer-field">
            <label htmlFor="sec-recorder-pwd">Recorder password</label>
            <input
              id="sec-recorder-pwd"
              type="password"
              autoComplete="new-password"
              value={recorderPassword}
              onChange={(e) => onRecorderPasswordChange(e.target.value)}
              placeholder="Enter recorder admin password"
            />
          </div>
          <div className="ip-drawer-field">
            <label htmlFor="sec-recorder-confirm">Confirm password</label>
            <input
              id="sec-recorder-confirm"
              type="password"
              autoComplete="new-password"
              value={recorderConfirm}
              onChange={(e) => onRecorderConfirmChange(e.target.value)}
              placeholder="Retype password"
            />
          </div>
          <PasswordRequirements
            checks={recorderChecks}
            showMatch
            matchOk={recorderMatch}
          />
        </section>
      )}

    </div>
  );
}

export function useSecurityFormValid(
  mirrorEnabled,
  cameraPassword,
  cameraConfirm,
  recorderPassword,
  recorderConfirm
) {
  const cameraOk =
    isPasswordValid(cameraPassword) && passwordsMatch(cameraPassword, cameraConfirm);
  const recorderOk =
    mirrorEnabled ||
    (isPasswordValid(recorderPassword) && passwordsMatch(recorderPassword, recorderConfirm));
  return cameraOk && recorderOk;
}
