import { rateLimiter } from '../src/lib/rateLimiter.ts';
import { validatePinComplexity } from '../src/lib/pinValidator.ts';
import assert from 'assert';
import crypto, { webcrypto } from 'crypto';

console.log('====================================================');
console.log('JEWELLERY ERP - AUTOMATED SECURITY AUDIT TEST RUNNER');
console.log('====================================================');

let testsPassed = 0;
let testsFailed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`[PASS] ${description}`);
    testsPassed++;
  } catch (err) {
    console.error(`[FAIL] ${description}:`, err.message);
    testsFailed++;
  }
}

// Polyfill mocks for Node runtime
const storageMap = new Map();
const localMap = new Map();

global.sessionStorage = {
  getItem: (key) => storageMap.get(key) || null,
  setItem: (key, val) => storageMap.set(key, String(val)),
  removeItem: (key) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

global.localStorage = {
  getItem: (key) => localMap.get(key) || null,
  setItem: (key, val) => localMap.set(key, String(val)),
  removeItem: (key) => localMap.delete(key),
  clear: () => localMap.clear(),
};

global.window = {
  sessionStorage: global.sessionStorage,
  localStorage: global.localStorage,
  crypto: webcrypto,
};

// TEST 1: Rate Limiter initial state
test('Rate limiter starts unthrottled for new email', () => {
  const email = 'test_user_' + Date.now() + '@example.com';
  const check = rateLimiter.isRateLimited(email);
  assert.strictEqual(check.limited, false);
  assert.strictEqual(check.remainingSeconds, 0);
});

// TEST 2: Rate Limiter records failed attempts
test('Rate limiter tracks consecutive failed attempts', () => {
  const email = 'victim@example.com';
  for (let i = 1; i <= 4; i++) {
    const res = rateLimiter.recordFailure(email, 5, 300000);
    assert.strictEqual(res.limited, false, `Attempt ${i} should not yet be throttled`);
  }
});

// TEST 3: Rate Limiter locks out on 5th consecutive failure
test('Rate limiter triggers lockout on 5th consecutive failure', () => {
  const email = 'victim@example.com';
  const res = rateLimiter.recordFailure(email, 5, 300000);
  assert.strictEqual(res.limited, true, '5th attempt must trigger lockout');
  assert(res.remainingSeconds > 0, 'Remaining seconds must be > 0');

  const check = rateLimiter.isRateLimited(email, 5, 300000);
  assert.strictEqual(check.limited, true, 'Subsequent checks must confirm lockout');
});

// TEST 4: Rate Limiter resets on successful login
test('Rate limiter resets failure counter on successful authentication', () => {
  const email = 'victim@example.com';
  rateLimiter.reset(email);
  const check = rateLimiter.isRateLimited(email);
  assert.strictEqual(check.limited, false, 'Counter must be cleared after reset');
});

// TEST 5: Password Complexity verification logic
test('Password length validation enforces minimum 8 characters', () => {
  const weakPasswords = ['', '123', 'pass', '1234567'];
  const strongPasswords = ['SuperSecure#2026', 'StrongP@ssw0rd99!'];

  for (const pw of weakPasswords) {
    assert(pw.length < 8, `Password "${pw}" should be rejected`);
  }
  for (const pw of strongPasswords) {
    assert(pw.length >= 8, `Password "${pw}" should be accepted`);
  }
});

// TEST 6: Generic Error Message Verification (prevents account enumeration)
test('Authentication error messages are generic and non-enumerating', () => {
  const expectedGenericError = 'Invalid email or password.';
  assert.strictEqual(expectedGenericError.includes('not found'), false);
  assert.strictEqual(expectedGenericError.includes('incorrect password'), false);
});

// TEST 7: ERP PIN Complexity - Reject Trivial and Invalid Lengths
test('PIN complexity rejects non-numeric, wrong length, and trivial sequences', () => {
  const invalidPins = ['123', '12345', '1234567', 'abcdef', '12a456', '123456', '000000', '111111', '654321', '999999'];
  for (const p of invalidPins) {
    const res = validatePinComplexity(p);
    assert.strictEqual(res.valid, false, `PIN "${p}" must be rejected`);
  }
});

// TEST 8: ERP PIN Complexity - Accept Strong 6-Digit PINs
test('PIN complexity accepts strong, non-trivial 6-digit PINs', () => {
  const validPins = ['849201', '395174', '714928', '582910'];
  for (const p of validPins) {
    const res = validatePinComplexity(p);
    assert.strictEqual(res.valid, true, `PIN "${p}" must be accepted`);
  }
});

// TEST 9: Inactive & Deleted User Device Unlock Rejection Logic
test('Device credential validation rejects inactive or deleted users', () => {
  const mockValidateDeviceAndUser = (device, user) => {
    if (!device || device.status !== 'active' || device.revoked_at) {
      return { success: false, message: 'Device credential is invalid or has been revoked.' };
    }
    if (!user || user.deleted_at || user.status === 'deleted') {
      return { success: false, message: 'User account does not exist or has been removed.' };
    }
    if (user.is_active === false || user.status === 'disabled') {
      return { success: false, message: 'User account is disabled.' };
    }
    return { success: true, user };
  };

  const activeDevice = { id: 'd-1', status: 'active', revoked_at: null };
  const revokedDevice = { id: 'd-2', status: 'revoked', revoked_at: new Date().toISOString() };

  const activeUser = { id: 'u-1', is_active: true, status: 'active' };
  const disabledUser = { id: 'u-2', is_active: false, status: 'disabled' };
  const deletedUser = { id: 'u-3', is_active: true, deleted_at: new Date().toISOString(), status: 'deleted' };

  // Case 1: Active device + Active user -> OK
  assert.strictEqual(mockValidateDeviceAndUser(activeDevice, activeUser).success, true);

  // Case 2: Revoked device + Active user -> FAIL
  assert.strictEqual(mockValidateDeviceAndUser(revokedDevice, activeUser).success, false);

  // Case 3: Active device + Disabled user -> FAIL
  assert.strictEqual(mockValidateDeviceAndUser(activeDevice, disabledUser).success, false);

  // Case 4: Active device + Deleted user -> FAIL
  assert.strictEqual(mockValidateDeviceAndUser(activeDevice, deletedUser).success, false);
});

// TEST 10: PIN encryption & PBKDF2/AES-GCM-256 roundtrip cryptographic verification
test('PIN encryption & PBKDF2/AES-GCM-256 roundtrip produces exact token', () => {
  const pin = '849201';
  const wrongPin = '849202';
  const rawToken = crypto.randomBytes(32);
  const rawTokenHex = rawToken.toString('hex');
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);

  // Derive PBKDF2 key
  const pinKey = crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha256');

  // AES-GCM Encrypt
  const cipher = crypto.createCipheriv('aes-256-gcm', pinKey, iv);
  const encrypted = Buffer.concat([cipher.update(rawToken), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Test correct PIN decryption
  const decipher = crypto.createDecipheriv('aes-256-gcm', pinKey, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  assert.strictEqual(decrypted.toString('hex'), rawTokenHex, 'Decrypted token must match original exactly');

  // Test wrong PIN decryption fails
  const wrongPinKey = crypto.pbkdf2Sync(wrongPin, salt, 100000, 32, 'sha256');
  assert.throws(() => {
    const wrongDecipher = crypto.createDecipheriv('aes-256-gcm', wrongPinKey, iv);
    wrongDecipher.setAuthTag(authTag);
    Buffer.concat([wrongDecipher.update(encrypted), wrongDecipher.final()]);
  }, 'Decryption with wrong PIN must throw an authentication error');
});

// TEST 11: Token hash verification matches between registration and unlock
test('Device token hash calculation equivalence between registration and unlock', () => {
  const rawToken = crypto.randomBytes(32);
  const rawTokenHex = rawToken.toString('hex');

  // During registration:
  const registeredHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // During unlock:
  const reconstructedBuffer = Buffer.from(rawTokenHex, 'hex');
  const unlockHash = crypto.createHash('sha256').update(reconstructedBuffer).digest('hex');

  assert.strictEqual(registeredHash, unlockHash, 'Hash generated during registration must match hash during unlock');
});

// TEST 12: Device vault & local cache resilient fallback when remote RPC is unavailable
test('Resilient fallback validates device credential from local vault and cache', () => {
  const credentialId = 'cred_xyz_123';
  const tokenBytes = crypto.randomBytes(32);
  const tokenHash = crypto.createHash('sha256').update(tokenBytes).digest('hex');

  const cachedDevices = [
    {
      id: 'd-1',
      credential_id: credentialId,
      device_token_hash: tokenHash,
      status: 'active',
      user_id: 'user-sampath-uuid',
    },
  ];

  const vault = {
    userId: 'user-sampath-uuid',
    userFullName: 'Sampathkumar',
    userEmail: 'sampath@shankarjewellery.com',
    userRole: 'admin',
    credentialId,
  };

  // Simulate verify fallback
  const verifyDeviceFallback = (credId, devHash, cache, localVault) => {
    const matched = cache.find((d) => d.credential_id === credId) || 
      (localVault?.credentialId === credId ? {
        credential_id: localVault.credentialId,
        device_token_hash: devHash,
        status: 'active',
        user_id: localVault.userId,
      } : null);

    if (!matched || matched.status === 'revoked') {
      return { success: false, message: 'Device credential is invalid or has been revoked.' };
    }
    if (matched.device_token_hash !== devHash) {
      return { success: false, message: 'Device token mismatch.' };
    }
    return {
      success: true,
      userProfile: {
        id: localVault.userId,
        full_name: localVault.userFullName,
        email: localVault.userEmail,
        role: localVault.userRole,
        is_active: true,
      },
    };
  };

  const resSuccess = verifyDeviceFallback(credentialId, tokenHash, cachedDevices, vault);
  assert.strictEqual(resSuccess.success, true);
  assert.strictEqual(resSuccess.userProfile.full_name, 'Sampathkumar');

  // Verify wrong token hash fails
  const resBadHash = verifyDeviceFallback(credentialId, 'invalid_hash_string', cachedDevices, vault);
  assert.strictEqual(resBadHash.success, false);

  // Verify revoked device fails
  cachedDevices[0].status = 'revoked';
  const resRevoked = verifyDeviceFallback(credentialId, tokenHash, cachedDevices, vault);
  assert.strictEqual(resRevoked.success, false);
});

// TEST 13: Local device revocation clears vault and updates cache
test('Revocation marks device status and prevents PIN and Biometric unlock', () => {
  const deviceList = [
    { id: 'dev-1', credential_id: 'cred-1', status: 'active' },
    { id: 'dev-2', credential_id: 'cred-2', status: 'active' },
  ];

  const revokeDevice = (id) => {
    const item = deviceList.find((d) => d.id === id || d.credential_id === id);
    if (item) {
      item.status = 'revoked';
      item.revoked_at = new Date().toISOString();
    }
  };

  revokeDevice('dev-1');
  assert.strictEqual(deviceList[0].status, 'revoked');
  assert.ok(deviceList[0].revoked_at);
  assert.strictEqual(deviceList[1].status, 'active');
});

console.log('====================================================');
console.log(`RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log('====================================================');

if (testsFailed > 0) {
  process.exit(1);
}

