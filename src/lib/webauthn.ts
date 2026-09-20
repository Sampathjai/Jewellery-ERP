import { UserProfile, UserPasskey } from '@/types';
import { dataService } from './dataService';

export const bufferToBase64URL = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let string = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    string += String.fromCharCode(bytes[i]);
  }
  return btoa(string)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

export const base64URLToBuffer = (base64url: string): ArrayBuffer => {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
};

export const isWebAuthnSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.PublicKeyCredential) &&
    typeof window.PublicKeyCredential === 'function'
  );
};

export const registerPasskey = async (
  user: UserProfile,
  deviceName?: string
): Promise<{ success: boolean; message?: string; passkey?: UserPasskey }> => {
  if (!isWebAuthnSupported()) {
    return {
      success: false,
      message: 'WebAuthn passkey authentication is not supported by your browser or device.',
    };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userIdBytes = new TextEncoder().encode(user.id);
    const domain = window.location.hostname || 'localhost';

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'Shankar Jewellery ERP',
        id: domain === 'localhost' || domain === '127.0.0.1' ? undefined : domain,
      },
      user: {
        id: userIdBytes,
        name: user.email || user.full_name,
        displayName: user.full_name || user.email,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        userVerification: 'preferred',
      },
      timeout: 60000,
    };

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, message: 'Passkey registration was cancelled or failed.' };
    }

    const rawResponse = credential.response as AuthenticatorAttestationResponse;
    const publicKeyBase64 = bufferToBase64URL(rawResponse.attestationObject);
    const credentialId = credential.id;

    const defaultDeviceName =
      deviceName ||
      (navigator.userAgent.includes('Mac')
        ? 'MacBook Touch ID / Passkey'
        : navigator.userAgent.includes('Win')
        ? 'Windows Hello PC'
        : navigator.userAgent.includes('Android')
        ? 'Android Biometric Device'
        : navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')
        ? 'Apple Touch ID / Face ID'
        : 'Passkey Security Device');

    const passkeyRecord: UserPasskey = {
      id: credentialId,
      user_id: user.id,
      credential_id: credentialId,
      public_key: publicKeyBase64,
      counter: 0,
      transports: rawResponse.getTransports ? rawResponse.getTransports() : ['internal'],
      device_name: defaultDeviceName,
      created_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
    };

    await dataService.savePasskeyCredential(passkeyRecord);

    await dataService.logAuditAction(
      'passkey_registered',
      'user_passkeys',
      credentialId,
      {
        device_name: defaultDeviceName,
        user_email: user.email,
        user_name: user.full_name,
      }
    );

    return { success: true, passkey: passkeyRecord };
  } catch (err: any) {
    console.error('Passkey registration error:', err);
    let msg = err?.message || 'Failed to register device passkey.';
    if (msg.includes('NotAllowedError') || msg.includes('cancelled')) {
      msg = 'Passkey registration was cancelled or timed out.';
    }
    return { success: false, message: msg };
  }
};

export const authenticateWithPasskey = async (): Promise<{
  success: boolean;
  message?: string;
  userProfile?: UserProfile;
}> => {
  if (!isWebAuthnSupported()) {
    return {
      success: false,
      message: 'WebAuthn passkey authentication is not supported on this browser or device.',
    };
  }

  try {
    const allPasskeys = await dataService.getAllRegisteredPasskeys();
    if (!allPasskeys || allPasskeys.length === 0) {
      return {
        success: false,
        message: 'No registered passkeys found in the system. Log in with your password and register this device under User Login & Session Settings.',
      };
    }

    const allowCredentials: PublicKeyCredentialDescriptor[] = allPasskeys.map((p) => ({
      id: base64URLToBuffer(p.credential_id),
      type: 'public-key',
      transports: (p.transports || ['internal']) as AuthenticatorTransport[],
    }));

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials,
        userVerification: 'preferred',
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) {
      return { success: false, message: 'Passkey authentication was cancelled.' };
    }

    const matchedPasskey = allPasskeys.find((p) => p.credential_id === assertion.id);
    if (!matchedPasskey) {
      return { success: false, message: 'Credential assertion mismatch. Unrecognized device passkey.' };
    }

    const userProfile = await dataService.getUserProfileById(matchedPasskey.user_id);
    if (!userProfile) {
      return { success: false, message: 'User account associated with this passkey was not found.' };
    }

    if (userProfile.is_active === false) {
      return { success: false, message: 'Your user account is inactive. Please contact the administrator.' };
    }

    // Touch last_used_at on the passkey
    dataService.savePasskeyCredential({
      ...matchedPasskey,
      last_used_at: new Date().toISOString(),
    }).catch(() => {});

    await dataService.logAuditAction(
      'passkey_login_success',
      'auth',
      userProfile.id,
      {
        email: userProfile.email,
        device_name: matchedPasskey.device_name,
        credential_id: matchedPasskey.credential_id,
      }
    );

    return { success: true, userProfile };
  } catch (err: any) {
    console.error('Passkey authentication error:', err);
    let msg = err?.message || 'Passkey authentication failed.';
    if (msg.includes('NotAllowedError') || msg.includes('cancelled')) {
      msg = 'Passkey authentication was cancelled or timed out.';
    }
    return { success: false, message: msg };
  }
};

export const revokePasskey = async (credentialId: string): Promise<{ success: boolean; message?: string }> => {
  try {
    await dataService.deletePasskeyCredential(credentialId);
    await dataService.logAuditAction('passkey_removed', 'user_passkeys', credentialId, {
      credential_id: credentialId,
    });
    return { success: true };
  } catch (err: any) {
    console.error('Passkey revocation error:', err);
    return { success: false, message: err?.message || 'Failed to revoke passkey.' };
  }
};

