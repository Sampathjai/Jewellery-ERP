import { UserProfile, TrustedDevice, DeviceBiometricType } from '../types/index';
import { dataService } from './dataService';

// Storage key for the local encrypted device vault
const DEVICE_VAULT_KEY = 'shankar_erp_device_vault';
const PIN_LOCKOUT_KEY = 'shankar_erp_pin_lockout';

// Cryptographic Utilities
export const bufferToHex = (buffer: ArrayBuffer | Uint8Array): string => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const hexToBuffer = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

export const bufferToBase64URL = (buffer: ArrayBuffer | Uint8Array): string => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

export const base64URLToBuffer = (base64url: string): ArrayBuffer => {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
};

// SHA-256 helper
export const sha256 = async (data: string | Uint8Array): Promise<string> => {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer as unknown as BufferSource);
  return bufferToHex(hashBuffer);
};

// Device & Biometric Environment Detection
export interface BiometricCapability {
  isSupported: boolean;
  biometricType: DeviceBiometricType;
  displayName: string;
  buttonLabel: string;
  isNativeWrapper: boolean;
}

export const detectBiometricCapability = async (): Promise<BiometricCapability> => {
  if (typeof window === 'undefined') {
    return {
      isSupported: false,
      biometricType: 'biometric_generic',
      displayName: 'Biometric Unlock',
      buttonLabel: 'Unlock with Biometrics',
      isNativeWrapper: false,
    };
  }

  // Check if running in a native desktop wrapper (e.g. Tauri)
  const isTauri = Boolean((window as any).__TAURI__);

  const ua = navigator.userAgent;
  let biometricType: DeviceBiometricType = 'biometric_generic';
  let displayName = 'Biometric Unlock';
  let buttonLabel = 'Unlock with Biometrics';

  if (/Macintosh|Mac OS X/i.test(ua)) {
    biometricType = 'touch_id';
    displayName = 'Touch ID';
    buttonLabel = 'Unlock with Touch ID';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    biometricType = 'face_id';
    displayName = 'Face ID / Touch ID';
    buttonLabel = 'Unlock with Face ID / Touch ID';
  } else if (/Windows/i.test(ua)) {
    biometricType = 'windows_hello';
    displayName = 'Windows Hello';
    buttonLabel = 'Unlock with Windows Hello';
  } else if (/Android/i.test(ua)) {
    biometricType = 'fingerprint';
    displayName = 'Fingerprint / Biometrics';
    buttonLabel = 'Unlock with Fingerprint';
  }

  if (isTauri) {
    return {
      isSupported: true,
      biometricType: 'tauri_desktop',
      displayName: `Native OS Biometrics (${displayName})`,
      buttonLabel: `Unlock with ${displayName}`,
      isNativeWrapper: true,
    };
  }

  // Check WebAuthn platform authenticator support in browser
  const hasWebAuthn =
    Boolean(window.PublicKeyCredential) &&
    typeof window.PublicKeyCredential === 'function';

  let hasPlatformAuthenticator = false;
  if (hasWebAuthn && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
    try {
      hasPlatformAuthenticator = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      hasPlatformAuthenticator = false;
    }
  }

  return {
    isSupported: hasWebAuthn && hasPlatformAuthenticator,
    biometricType,
    displayName,
    buttonLabel,
    isNativeWrapper: false,
  };
};

import { validatePinComplexity } from './pinValidator';
export { validatePinComplexity };

// PBKDF2 Key Derivation & AES-GCM Encryption
const deriveKeyFromPin = async (pin: string, salt: Uint8Array): Promise<CryptoKey> => {
  const pinBytes = new TextEncoder().encode(pin);
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    pinBytes,
    'PBKDF2',
    false,
    ['deriveKey', 'deriveBits']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

const derivePinVerificationHash = async (pin: string, salt: Uint8Array): Promise<string> => {
  const pinBytes = new TextEncoder().encode(pin);
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    pinBytes,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );

  return bufferToHex(bits);
};

// Local Device Vault Data Structure
export interface LocalDeviceVault {
  userId: string;
  userEmail: string;
  userFullName: string;
  userRole: string;
  credentialId: string;
  deviceName: string;
  deviceType: DeviceBiometricType;
  saltHex: string;
  ivHex: string;
  pinHashHex: string;
  encryptedTokenHex: string;
  rawDeviceTokenHex: string; // Protected by device OS access
  createdAt: string;
}

export const getLocalDeviceVault = (): LocalDeviceVault | null => {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(DEVICE_VAULT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const hasRegisteredLocalDevice = (): boolean => {
  return Boolean(getLocalDeviceVault());
};

// PIN Lockout Protection
export interface PinLockoutState {
  isLocked: boolean;
  remainingSeconds: number;
  failedAttempts: number;
}

export const checkPinLockout = (): PinLockoutState => {
  if (typeof localStorage === 'undefined') {
    return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };
  }
  const raw = localStorage.getItem(PIN_LOCKOUT_KEY);
  if (!raw) return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };

  try {
    const data = JSON.parse(raw);
    const now = Date.now();
    if (data.lockedUntil && data.lockedUntil > now) {
      const remainingSeconds = Math.ceil((data.lockedUntil - now) / 1000);
      return { isLocked: true, remainingSeconds, failedAttempts: data.attempts || 5 };
    }
    // Expired lockout
    if (data.lockedUntil && data.lockedUntil <= now) {
      localStorage.removeItem(PIN_LOCKOUT_KEY);
      return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };
    }
    return { isLocked: false, remainingSeconds: 0, failedAttempts: data.attempts || 0 };
  } catch {
    return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };
  }
};

export const recordFailedPinAttempt = (): PinLockoutState => {
  const current = checkPinLockout();
  const nextAttempts = current.failedAttempts + 1;
  const MAX_ATTEMPTS = 5;

  if (nextAttempts >= MAX_ATTEMPTS) {
    const lockedUntil = Date.now() + 5 * 60 * 1000; // 5-minute lockout
    localStorage.setItem(
      PIN_LOCKOUT_KEY,
      JSON.stringify({ attempts: nextAttempts, lockedUntil })
    );
    return { isLocked: true, remainingSeconds: 300, failedAttempts: nextAttempts };
  }

  localStorage.setItem(
    PIN_LOCKOUT_KEY,
    JSON.stringify({ attempts: nextAttempts, lockedUntil: 0 })
  );
  return { isLocked: false, remainingSeconds: 0, failedAttempts: nextAttempts };
};

export const resetPinLockout = (): void => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(PIN_LOCKOUT_KEY);
  }
};

// Device Registration: Biometric + PIN Setup
export const registerDeviceBiometricAndPin = async (
  currentUser: UserProfile,
  pin: string,
  customDeviceName?: string
): Promise<{ success: boolean; message?: string; device?: TrustedDevice }> => {
  // 1. Validate PIN
  const pinValidation = validatePinComplexity(pin);
  if (!pinValidation.valid) {
    return { success: false, message: pinValidation.message };
  }

  // 2. Detect capability
  const cap = await detectBiometricCapability();
  const deviceName =
    customDeviceName ||
    (cap.biometricType === 'touch_id'
      ? 'MacBook Touch ID'
      : cap.biometricType === 'face_id'
      ? 'Apple Face ID'
      : cap.biometricType === 'windows_hello'
      ? 'Windows Hello PC'
      : cap.biometricType === 'fingerprint'
      ? 'Android Fingerprint'
      : 'Trusted Jewellery ERP Device');

  try {
    // 3. Generate high-entropy 256-bit device token
    const deviceTokenBytes = new Uint8Array(32);
    window.crypto.getRandomValues(deviceTokenBytes);
    const deviceTokenHex = bufferToHex(deviceTokenBytes);
    const deviceTokenHash = await sha256(deviceTokenBytes);

    let credentialId: string;
    let publicKeyBase64: string | undefined;

    // 4. Trigger OS Platform Authenticator (Touch ID, Face ID, Windows Hello, etc.)
    if (cap.isSupported) {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const userIdBytes = new TextEncoder().encode(currentUser.id);
      const domain = window.location.hostname || 'localhost';
      const rpId = domain === 'localhost' || domain === '127.0.0.1' ? undefined : domain;

      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'Shankar Jewellery ERP', id: rpId },
          user: {
            id: userIdBytes,
            name: currentUser.email || 'user',
            displayName: currentUser.full_name || currentUser.email || 'ERP User',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },  // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!cred) {
        return { success: false, message: 'OS biometric authentication was cancelled.' };
      }

      credentialId = cred.id;
      const rawAttestation = cred.response as AuthenticatorAttestationResponse;
      publicKeyBase64 = bufferToBase64URL(rawAttestation.attestationObject);
    } else {
      // Fallback for environment without WebAuthn platform authenticator
      const fallbackBytes = new Uint8Array(24);
      window.crypto.getRandomValues(fallbackBytes);
      credentialId = 'dev_' + bufferToHex(fallbackBytes);
    }

    // 5. Derive PIN Key & Encrypt Device Token using AES-GCM-256
    const salt = new Uint8Array(16);
    window.crypto.getRandomValues(salt);
    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(iv);

    const pinKey = await deriveKeyFromPin(pin, salt);
    const pinHashHex = await derivePinVerificationHash(pin, salt);

    const encryptedTokenBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      pinKey,
      deviceTokenBytes as unknown as BufferSource
    );

    const vault: LocalDeviceVault = {
      userId: currentUser.id,
      userEmail: currentUser.email,
      userFullName: currentUser.full_name || '',
      userRole: currentUser.role,
      credentialId,
      deviceName,
      deviceType: cap.biometricType,
      saltHex: bufferToHex(salt),
      ivHex: bufferToHex(iv),
      pinHashHex,
      encryptedTokenHex: bufferToHex(encryptedTokenBuffer),
      rawDeviceTokenHex: deviceTokenHex,
      createdAt: new Date().toISOString(),
    };

    // Save to local device vault
    localStorage.setItem(DEVICE_VAULT_KEY, JSON.stringify(vault));
    resetPinLockout();

    // 6. Register device public metadata & token hash with ERP Backend (Database)
    const newDevice = await dataService.registerTrustedDevice({
      user_id: currentUser.id,
      device_name: deviceName,
      device_type: cap.biometricType,
      credential_id: credentialId,
      public_key: publicKeyBase64,
      device_token_hash: deviceTokenHash,
      platform: navigator.platform,
      browser: navigator.userAgent.substring(0, 100),
      status: 'active',
      created_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
    });

    // 7. Security audit log
    await dataService.logAuditAction('DEVICE_REGISTERED', 'auth', currentUser.id, {
      device_name: deviceName,
      device_type: cap.biometricType,
      credential_id: credentialId,
    });

    return { success: true, device: newDevice };
  } catch (err: any) {
    console.error('Device biometric & PIN registration error:', err);
    let msg = err?.message || 'Failed to register device biometric credential.';
    if (err?.name === 'NotAllowedError' || msg.includes('cancelled')) {
      msg = 'Biometric registration was cancelled by the user.';
    }
    return { success: false, message: msg };
  }
};

// Biometric Unlock
export const unlockWithBiometrics = async (): Promise<{
  success: boolean;
  message?: string;
  userProfile?: UserProfile;
}> => {
  const vault = getLocalDeviceVault();
  if (!vault) {
    return {
      success: false,
      message: 'No registered biometric credential found on this device. Please log in with your password and register this device.',
    };
  }

  const cap = await detectBiometricCapability();

  try {
    // 1. Invoke OS Platform Biometrics via WebAuthn
    if (cap.isSupported) {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const domain = window.location.hostname || 'localhost';
      const rpId = domain === 'localhost' || domain === '127.0.0.1' ? undefined : domain;

      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId,
          allowCredentials: [
            {
              id: base64URLToBuffer(vault.credentialId),
              type: 'public-key',
              transports: ['internal'],
            },
          ],
          userVerification: 'required',
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!assertion) {
        await dataService.logAuditAction('BIOMETRIC_LOGIN_FAILED', 'auth', vault.userId, {
          reason: 'biometric_cancelled',
        });
        return { success: false, message: 'Biometric verification was cancelled.' };
      }
    }

    // 2. Compute device token hash from vault
    const tokenBytes = hexToBuffer(vault.rawDeviceTokenHex);
    const deviceTokenHash = await sha256(tokenBytes);

    // 3. Authoritative Backend Validation against trusted_devices & profiles in Supabase
    const backendRes = await dataService.verifyDeviceCredential(
      vault.credentialId,
      deviceTokenHash
    );

    if (!backendRes.success || !backendRes.userProfile) {
      await dataService.logAuditAction('BIOMETRIC_LOGIN_FAILED', 'auth', vault.userId, {
        reason: backendRes.message || 'backend_validation_failed',
      });
      return {
        success: false,
        message: backendRes.message || 'Device credential could not be verified by server.',
      };
    }

    // 4. Verification successful: Log audit event and return user profile
    await dataService.logAuditAction('BIOMETRIC_LOGIN_SUCCESS', 'auth', backendRes.userProfile.id, {
      device_name: vault.deviceName,
      credential_id: vault.credentialId,
    });

    return { success: true, userProfile: backendRes.userProfile };
  } catch (err: any) {
    console.error('Biometric unlock error:', err);
    let msg = err?.message || 'Biometric authentication failed.';
    if (err?.name === 'NotAllowedError' || msg.includes('cancelled')) {
      msg = 'Biometric verification was cancelled or timed out.';
    }
    await dataService.logAuditAction('BIOMETRIC_LOGIN_FAILED', 'auth', vault.userId, {
      reason: msg,
    }).catch(() => {});
    return { success: false, message: msg };
  }
};

// PIN Unlock
export const unlockWithPin = async (
  pin: string
): Promise<{
  success: boolean;
  message?: string;
  userProfile?: UserProfile;
  remainingSeconds?: number;
  remainingAttempts?: number;
}> => {
  const vault = getLocalDeviceVault();
  if (!vault) {
    return {
      success: false,
      message: 'No registered device credential found. Please log in with password.',
    };
  }

  // 1. Check PIN lockout state
  const lockout = checkPinLockout();
  if (lockout.isLocked) {
    return {
      success: false,
      message: `Too many failed PIN attempts. Access is locked for ${lockout.remainingSeconds} seconds.`,
      remainingSeconds: lockout.remainingSeconds,
    };
  }

  try {
    // 2. Verify PIN hash using PBKDF2
    const salt = hexToBuffer(vault.saltHex);
    const candidatePinHash = await derivePinVerificationHash(pin, salt);

    if (candidatePinHash !== vault.pinHashHex) {
      const failState = recordFailedPinAttempt();
      await dataService.logAuditAction('PIN_UNLOCK_FAILED', 'auth', vault.userId, {
        attempts: failState.failedAttempts,
      }).catch(() => {});

      if (failState.isLocked) {
        return {
          success: false,
          message: `Too many failed PIN attempts. PIN unlock is temporarily locked for 5 minutes.`,
          remainingSeconds: failState.remainingSeconds,
        };
      }
      const attemptsLeft = 5 - failState.failedAttempts;
      return {
        success: false,
        message: `Incorrect PIN. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`,
        remainingAttempts: attemptsLeft,
      };
    }

    // 3. PIN is correct: Decrypt device token using AES-GCM-256
    const iv = hexToBuffer(vault.ivHex);
    const pinKey = await deriveKeyFromPin(pin, salt);
    const encryptedBytes = hexToBuffer(vault.encryptedTokenHex);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      pinKey,
      encryptedBytes as unknown as BufferSource
    );

    const decryptedTokenBytes = new Uint8Array(decryptedBuffer);
    const deviceTokenHash = await sha256(decryptedTokenBytes);

    // 4. Authoritative Backend Validation against trusted_devices & profiles in Supabase
    const backendRes = await dataService.verifyDeviceCredential(
      vault.credentialId,
      deviceTokenHash
    );

    if (!backendRes.success || !backendRes.userProfile) {
      await dataService.logAuditAction('PIN_UNLOCK_FAILED', 'auth', vault.userId, {
        reason: backendRes.message || 'backend_validation_failed',
      }).catch(() => {});
      return {
        success: false,
        message: backendRes.message || 'Device credential could not be verified by server.',
      };
    }

    // 5. Success: Reset lockout counter, log audit, and return user profile
    resetPinLockout();
    await dataService.logAuditAction('PIN_UNLOCK_SUCCESS', 'auth', backendRes.userProfile.id, {
      device_name: vault.deviceName,
      credential_id: vault.credentialId,
    });

    return { success: true, userProfile: backendRes.userProfile };
  } catch (err: any) {
    console.error('PIN unlock error:', err);
    return { success: false, message: 'Failed to verify PIN. Please try again or use your password.' };
  }
};

// Remove Biometric / PIN from this local device
export const removeLocalDeviceBiometrics = async (): Promise<{ success: boolean; message?: string }> => {
  const vault = getLocalDeviceVault();
  if (vault) {
    try {
      await dataService.revokeTrustedDeviceByCredentialId(vault.credentialId, vault.userId);
      await dataService.logAuditAction('BIOMETRIC_DISABLED', 'auth', vault.userId, {
        credential_id: vault.credentialId,
        device_name: vault.deviceName,
      });
    } catch (e) {
      console.warn('Could not revoke device from backend:', e);
    }
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(DEVICE_VAULT_KEY);
    localStorage.removeItem(PIN_LOCKOUT_KEY);
  }

  return { success: true };
};
