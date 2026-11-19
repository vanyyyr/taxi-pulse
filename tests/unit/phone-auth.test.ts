import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  normalizePhone,
  formatPhone,
  hashPin,
  loginOrRegisterDriver,
  getCurrentDriver,
  setCurrentDriver,
  updateDriverProfile,
  generateUUID,
  isUUID,
} from '@/lib/storage';

describe('Phone & Auth - Tier 1: Feature Coverage', () => {
  beforeAll(() => {
    // Provide a localStorage mock on globalThis for the Node test environment
    const storage: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, val: string) => { storage[key] = String(val); },
      removeItem: (key: string) => { delete storage[key]; },
      clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
    };

    (globalThis as unknown as { window: unknown }).window = globalThis;
    (globalThis as unknown as { localStorage: unknown }).localStorage = mockStorage;
  });

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('normalizes 11-digit phone numbers starting with +7', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('79991234567');
    expect(normalizePhone('+7 916 234 56 78')).toBe('79162345678');
  });

  it('normalizes 11-digit phone numbers starting with 8 to Russian 7', () => {
    expect(normalizePhone('8 (999) 123-45-67')).toBe('79991234567');
    expect(normalizePhone('89991234567')).toBe('79991234567');
  });

  it('normalizes 10-digit phone numbers starting with 9 to 11 digits starting with 7', () => {
    expect(normalizePhone('9991234567')).toBe('79991234567');
    expect(normalizePhone('9161234567')).toBe('79161234567');
  });

  it('formats raw digits to Russian standard +7 (XXX) XXX-XX-XX', () => {
    expect(formatPhone('79991234567')).toBe('+7 (999) 123-45-67');
    expect(formatPhone('89991234567')).toBe('+7 (999) 123-45-67');
    expect(formatPhone('9991234567')).toBe('+7 (999) 123-45-67');
  });

  it('generates SHA-256 hash for PIN with phone salt', async () => {
    const hash1 = await hashPin('1234', '79991234567');
    const hash2 = await hashPin('1234', '79991234567');
    const hashDiffPin = await hashPin('4321', '79991234567');
    const hashDiffSalt = await hashPin('1234', '79160000000');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashDiffPin);
    expect(hash1).not.toBe(hashDiffSalt);
    // SHA-256 in hex is 64 characters
    expect(hash1.length).toBe(64);
  });

  it('registers new driver with default settings and logs in', async () => {
    const res = await loginOrRegisterDriver('89991234567', '1234');
    expect(res.success).toBe(true);
    expect(res.driver).toBeDefined();
    expect(res.driver?.phone).toBe('79991234567');
    expect(res.driver?.default_rent).toBe(2200);
    expect(res.driver?.default_goal).toBe(5000);
    expect(res.driver?.default_fuel_consumption).toBe(8.5);

    // Current driver persisted in storage
    const current = getCurrentDriver();
    expect(current?.phone).toBe('79991234567');
  });

  it('authenticates returning driver with correct PIN', async () => {
    // 1. Initial register
    await loginOrRegisterDriver('89991234567', '1234');

    // 2. Clear current session
    setCurrentDriver(null);
    expect(getCurrentDriver()).toBeNull();

    // 3. Login again
    const loginRes = await loginOrRegisterDriver('+7 (999) 123-45-67', '1234');
    expect(loginRes.success).toBe(true);
    expect(loginRes.driver?.phone).toBe('79991234567');
    expect(getCurrentDriver()?.phone).toBe('79991234567');
  });

  it('generates and validates RFC4122 v4 UUIDs', () => {
    const uuid = generateUUID();
    expect(isUUID(uuid)).toBe(true);
    expect(isUUID('invalid-uuid-string')).toBe(false);
    expect(isUUID('12345')).toBe(false);
  });
});

describe('Phone & Auth - Tier 2: Boundary & Corner Cases', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('rejects phone numbers with less than 10 digits', async () => {
    const res = await loginOrRegisterDriver('12345', '1234');
    expect(res.success).toBe(false);
    expect(res.message).toContain('не менее 10 цифр');
  });

  it('rejects empty phone input', async () => {
    const res = await loginOrRegisterDriver('', '1234');
    expect(res.success).toBe(false);
    expect(res.message).toBeDefined();
  });

  it('rejects PIN codes that are not exactly 4 digits', async () => {
    const shortPin = await loginOrRegisterDriver('89991234567', '123');
    expect(shortPin.success).toBe(false);
    expect(shortPin.message).toContain('ровно из 4 цифр');

    const longPin = await loginOrRegisterDriver('89991234567', '12345');
    expect(longPin.success).toBe(false);
    expect(longPin.message).toContain('ровно из 4 цифр');

    const nonNumeric = await loginOrRegisterDriver('89991234567', 'abcd');
    expect(nonNumeric.success).toBe(false);
    expect(nonNumeric.message).toContain('ровно из 4 цифр');
  });

  it('rejects existing driver when an incorrect PIN is entered', async () => {
    // Register driver with PIN 1234
    await loginOrRegisterDriver('89991234567', '1234');

    // Attempt login with PIN 9999
    const wrongRes = await loginOrRegisterDriver('89991234567', '9999');
    expect(wrongRes.success).toBe(false);
    expect(wrongRes.message).toContain('Неверный');
  });

  it('handles dirty phone inputs with mixed formatting characters', () => {
    expect(normalizePhone(' +7-(926)--123..45/67 ')).toBe('79261234567');
    expect(normalizePhone('8 (926) 123 45 67')).toBe('79261234567');
    expect(normalizePhone('926 123 45 67')).toBe('79261234567');
  });

  it('allows updating driver profile parameters and persists changes', async () => {
    const { driver } = await loginOrRegisterDriver('89991234567', '1234');
    expect(driver).toBeDefined();

    const updated = await updateDriverProfile({
      name: 'Алексей',
      car_model: 'Skoda Octavia',
      default_rent: 2800,
      default_goal: 7000,
      default_fuel_consumption: 9.0,
      default_fuel_price: 60,
    });

    expect(updated?.name).toBe('Алексей');
    expect(updated?.car_model).toBe('Skoda Octavia');
    expect(updated?.default_rent).toBe(2800);
    expect(updated?.default_goal).toBe(7000);

    // Verify stored
    const current = getCurrentDriver();
    expect(current?.name).toBe('Алексей');
    expect(current?.car_model).toBe('Skoda Octavia');
    expect(current?.default_rent).toBe(2800);
  });

  it('updates PIN and validates subsequent login with the new PIN', async () => {
    // 1. Register with 1111
    await loginOrRegisterDriver('89991234567', '1111');

    // 2. Change PIN to 2222
    const newHash = await hashPin('2222', '79991234567');
    await updateDriverProfile({ pin_hash: newHash });

    // 3. Clear session
    setCurrentDriver(null);

    // 4. Old PIN 1111 must fail
    const oldLogin = await loginOrRegisterDriver('89991234567', '1111');
    expect(oldLogin.success).toBe(false);

    // 5. New PIN 2222 must succeed
    const newLogin = await loginOrRegisterDriver('89991234567', '2222');
    expect(newLogin.success).toBe(true);
  });
});
