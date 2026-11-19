import { DriverProfile, Shift, ExpenseItem } from './types';
import { calculateShiftMetrics } from './calculations';
import { getSupabase } from './supabase';

const STORAGE_KEYS = {
  CURRENT_DRIVER: 'taxipulse_current_driver',
  DRIVERS_LIST: 'taxipulse_drivers_list',
  ACTIVE_SHIFT_PREFIX: 'taxipulse_active_shift_',
  SHIFTS_PREFIX: 'taxipulse_shifts_',
};

/**
 * Генерация валидного UUID v4 для Postgres (Supabase)
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Проверка, является ли строка валидным UUID
 */
export function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Простой и надежный хэш для 4-значного PIN-кода
 */
export async function hashPin(pin: string, salt: string = 'taxipulse_salt'): Promise<string> {
  if (typeof window === 'undefined') return pin;
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + salt);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback если subtle crypto недоступен
    let hash = 0;
    const str = pin + salt;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }
}

/**
 * Очистка номера телефона от лишних символов (оставляем только цифры)
 */
export function normalizePhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('9')) {
    return '7' + digits;
  }
  if (digits.length === 11 && digits.startsWith('8')) {
    return '7' + digits.slice(1);
  }
  if (digits.length === 11 && digits.startsWith('7')) {
    return digits;
  }
  return digits;
}

/**
 * Форматирование номера: +7 (999) 123-45-67
 */
export function formatPhone(rawPhone: string): string {
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('8') && digits.length === 11) {
    digits = '7' + digits.slice(1);
  } else if (digits.length === 10 && digits.startsWith('9')) {
    digits = '7' + digits;
  } else if (!digits.startsWith('7') && digits.length > 0 && digits.startsWith('9')) {
    digits = '7' + digits;
  }

  if (!digits) return '';
  if (digits.length <= 1) return `+${digits}`;
  if (digits.length <= 4) return `+${digits.slice(0, 1)} (${digits.slice(1)}`;
  if (digits.length <= 7) return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4)}`;
  if (digits.length <= 9) return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
}

// -------------------------------------------------------------
// АВТОРИЗАЦИЯ И ПРОФИЛЬ
// -------------------------------------------------------------

export function getCurrentDriver(): DriverProfile | null {
  if (typeof window === 'undefined') return null;
  const json = localStorage.getItem(STORAGE_KEYS.CURRENT_DRIVER);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function setCurrentDriver(driver: DriverProfile | null): void {
  if (typeof window === 'undefined') return;
  if (!driver) {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_DRIVER);
  } else {
    localStorage.setItem(STORAGE_KEYS.CURRENT_DRIVER, JSON.stringify(driver));
  }
}

export async function loginOrRegisterDriver(
  phone: string, 
  pin: string
): Promise<{ success: boolean; driver?: DriverProfile; message?: string }> {
  const cleanPhone = normalizePhone(phone);
  if (cleanPhone.length < 10) {
    return { success: false, message: 'Введите корректный номер телефона (не менее 10 цифр)' };
  }
  if (!/^\d{4}$/.test(pin)) {
    return { success: false, message: 'PIN-код должен состоять ровно из 4 цифр' };
  }

  const pinHash = await hashPin(pin, cleanPhone);
  const supabase = getSupabase();

  // 1. Попытка через Supabase Cloud Database (приоритет)
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Supabase fetch error, fallback to local:', error);
      } else if (data) {
        // Водитель уже есть в базе данных
        if (data.pin_hash === pinHash) {
          const profile: DriverProfile = {
            id: data.id,
            phone: data.phone,
            name: data.name,
            car_model: data.car_model || 'Solaris / Polo / Rio',
            fuel_type: data.fuel_type || 'ai95',
            default_rent: Number(data.default_rent) || 2200,
            default_goal: Number(data.default_goal) || 5000,
            default_fuel_consumption: Number(data.default_fuel_consumption) || 8.5,
            default_fuel_price: Number(data.default_fuel_price) || 58,
            pin_hash: data.pin_hash,
            created_at: data.created_at,
          };
          setCurrentDriver(profile);
          return { success: true, driver: profile };
        } else {
          return { success: false, message: 'Неверный 4-значный PIN-код' };
        }
      } else {
        // Создаем нового водителя в удаленной базе данных
        const newId = generateUUID();
        const newProfile: DriverProfile = {
          id: newId,
          phone: cleanPhone,
          name: `Водитель ${cleanPhone.slice(-4)}`,
          car_model: 'Solaris / Polo / Rio',
          fuel_type: 'ai95',
          default_rent: 2200,
          default_goal: 5000,
          default_fuel_consumption: 8.5,
          default_fuel_price: 58,
          pin_hash: pinHash,
          created_at: new Date().toISOString(),
        };

        const { error: insertError } = await supabase.from('driver_profiles').insert({
          id: newProfile.id,
          phone: newProfile.phone,
          name: newProfile.name,
          car_model: newProfile.car_model,
          fuel_type: newProfile.fuel_type,
          default_rent: newProfile.default_rent,
          default_goal: newProfile.default_goal,
          default_fuel_consumption: newProfile.default_fuel_consumption,
          default_fuel_price: newProfile.default_fuel_price,
          pin_hash: newProfile.pin_hash,
        });

        if (insertError) {
          console.error('Supabase profile insert error:', insertError);
        }

        setCurrentDriver(newProfile);
        return { success: true, driver: newProfile };
      }
    } catch (e) {
      console.warn('Supabase connection error:', e);
    }
  }

  // 2. Локальное хранилище (Fallback)
  if (typeof window === 'undefined') {
    return { success: false, message: 'Хранилище недоступно' };
  }

  const listJson = localStorage.getItem(STORAGE_KEYS.DRIVERS_LIST) || '{}';
  let driversMap: Record<string, DriverProfile> = {};
  try {
    driversMap = JSON.parse(listJson);
  } catch {
    driversMap = {};
  }

  if (driversMap[cleanPhone]) {
    const existing = driversMap[cleanPhone];
    if (existing.pin_hash === pinHash) {
      setCurrentDriver(existing);
      return { success: true, driver: existing };
    } else {
      return { success: false, message: 'Неверный 4-значный PIN-код' };
    }
  }

  const newProfile: DriverProfile = {
    id: generateUUID(),
    phone: cleanPhone,
    name: `Водитель ${cleanPhone.slice(-4)}`,
    car_model: 'Solaris / Polo / Rio',
    fuel_type: 'ai95',
    default_rent: 2200,
    default_goal: 5000,
    default_fuel_consumption: 8.5,
    default_fuel_price: 58,
    pin_hash: pinHash,
    created_at: new Date().toISOString(),
  };

  driversMap[cleanPhone] = newProfile;
  localStorage.setItem(STORAGE_KEYS.DRIVERS_LIST, JSON.stringify(driversMap));
  setCurrentDriver(newProfile);

  return { success: true, driver: newProfile };
}

export async function updateDriverProfile(updated: Partial<DriverProfile>): Promise<DriverProfile | null> {
  const current = getCurrentDriver();
  if (!current) return null;

  const merged: DriverProfile = {
    ...current,
    ...updated,
  };

  setCurrentDriver(merged);

  // Обновляем в локальном списке
  const listJson = localStorage.getItem(STORAGE_KEYS.DRIVERS_LIST) || '{}';
  try {
    const driversMap = JSON.parse(listJson);
    driversMap[merged.phone] = merged;
    localStorage.setItem(STORAGE_KEYS.DRIVERS_LIST, JSON.stringify(driversMap));
  } catch (e) {
    console.error(e);
  }

  // Синхронизация с Supabase Cloud Database
  const supabase = getSupabase();
  if (supabase && isUUID(merged.id)) {
    try {
      await supabase
        .from('driver_profiles')
        .update({
          name: merged.name,
          car_model: merged.car_model,
          fuel_type: merged.fuel_type,
          default_rent: merged.default_rent,
          default_goal: merged.default_goal,
          default_fuel_consumption: merged.default_fuel_consumption,
          default_fuel_price: merged.default_fuel_price,
          pin_hash: merged.pin_hash,
        })
        .eq('id', merged.id);
    } catch (e) {
      console.error('Failed to sync profile update to Supabase:', e);
    }
  }

  return merged;
}

// -------------------------------------------------------------
// АКТИВНАЯ СМЕНА
// -------------------------------------------------------------

export function getActiveShift(driverId: string): Shift | null {
  if (typeof window === 'undefined') return null;
  const json = localStorage.getItem(STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + driverId);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function saveActiveShift(driverId: string, shift: Shift | null): void {
  if (typeof window === 'undefined') return;
  const key = STORAGE_KEYS.ACTIVE_SHIFT_PREFIX + driverId;
  if (!shift) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(shift));
  }
}

export function startNewShift(driver: DriverProfile, initialMileage: number = 0): Shift {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newShift: Shift = {
    id: generateUUID(),
    driver_id: driver.id,
    date: dateStr,
    start_time: timeStr,
    duration_hours: 0,
    start_odometer: initialMileage || 0,
    mileage_km: 0,
    gross_revenue: 0,
    fuel_liters: 0,
    fuel_cost: 0,
    rent_cost: driver.default_rent || 0,
    other_expenses_total: 0,
    expenses: [],
    total_expenses: driver.default_rent || 0,
    net_profit: -(driver.default_rent || 0),
    hourly_rate: 0,
    cost_per_km: 0,
    revenue_per_km: 0,
    fuel_consumption_per_100km: driver.default_fuel_consumption || 8.5,
    status: 'active',
    created_at: now.toISOString(),
  };

  saveActiveShift(driver.id, newShift);
  return newShift;
}

// -------------------------------------------------------------
// ИСТОРИЯ СМЕН (ОБЛАЧНАЯ БАЗА + ЛЕГКИЙ КЭШ)
// -------------------------------------------------------------

export function getCompletedShifts(driverId: string): Shift[] {
  if (typeof window === 'undefined') return [];
  const key = STORAGE_KEYS.SHIFTS_PREFIX + driverId;
  const json = localStorage.getItem(key);
  if (!json) return [];
  try {
    const list: Shift[] = JSON.parse(json);
    return list.sort((a, b) => new Date(b.date + 'T' + (b.start_time || '00:00')).getTime() - new Date(a.date + 'T' + (a.start_time || '00:00')).getTime());
  } catch {
    return [];
  }
}

/**
 * Загрузка смен из удаленной базы данных Supabase
 */
export async function fetchCompletedShifts(driverId: string): Promise<Shift[]> {
  const supabase = getSupabase();
  if (supabase && isUUID(driverId)) {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('driver_id', driverId)
        .order('date', { ascending: false });

      if (!error && data) {
        const shifts: Shift[] = data.map(row => ({
          id: row.id,
          driver_id: row.driver_id,
          date: row.date,
          start_time: row.start_time,
          end_time: row.end_time || undefined,
          duration_hours: Number(row.duration_hours) || 0,
          mileage_km: Number(row.mileage_km) || 0,
          start_odometer: row.start_odometer ? Number(row.start_odometer) : undefined,
          end_odometer: row.end_odometer ? Number(row.end_odometer) : undefined,
          gross_revenue: Number(row.gross_revenue) || 0,
          fuel_liters: Number(row.fuel_liters) || 0,
          fuel_cost: Number(row.fuel_cost) || 0,
          rent_cost: Number(row.rent_cost) || 0,
          other_expenses_total: Number(row.other_expenses_total) || 0,
          expenses: Array.isArray(row.expenses) ? row.expenses : [],
          total_expenses: Number(row.total_expenses) || 0,
          net_profit: Number(row.net_profit) || 0,
          hourly_rate: Number(row.hourly_rate) || 0,
          cost_per_km: Number(row.cost_per_km) || 0,
          revenue_per_km: Number(row.revenue_per_km) || 0,
          fuel_consumption_per_100km: Number(row.fuel_consumption_per_100km) || 0,
          status: row.status as 'completed' | 'active',
          notes: row.notes || undefined,
          created_at: row.created_at,
        }));

        // Сохраняем в кэш
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.SHIFTS_PREFIX + driverId, JSON.stringify(shifts));
        }

        return shifts;
      }
    } catch (e) {
      console.warn('Failed to fetch shifts from Supabase:', e);
    }
  }

  return getCompletedShifts(driverId);
}

export async function saveCompletedShift(driverId: string, shift: Shift): Promise<Shift[]> {
  const shiftToSave: Shift = {
    ...shift,
    id: isUUID(shift.id) ? shift.id : generateUUID(),
  };

  const currentList = getCompletedShifts(driverId);
  const existingIdx = currentList.findIndex(s => s.id === shiftToSave.id);

  let updatedList: Shift[];
  if (existingIdx >= 0) {
    updatedList = [...currentList];
    updatedList[existingIdx] = shiftToSave;
  } else {
    updatedList = [shiftToSave, ...currentList];
  }

  // Обновляем локальный кэш
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SHIFTS_PREFIX + driverId, JSON.stringify(updatedList));
  }

  // Сохраняем в базу данных Supabase
  const supabase = getSupabase();
  if (supabase && isUUID(driverId)) {
    try {
      const { error } = await supabase.from('shifts').upsert({
        id: shiftToSave.id,
        driver_id: driverId,
        date: shiftToSave.date,
        start_time: shiftToSave.start_time,
        end_time: shiftToSave.end_time || null,
        duration_hours: shiftToSave.duration_hours,
        mileage_km: shiftToSave.mileage_km,
        start_odometer: shiftToSave.start_odometer || null,
        end_odometer: shiftToSave.end_odometer || null,
        gross_revenue: shiftToSave.gross_revenue,
        fuel_liters: shiftToSave.fuel_liters,
        fuel_cost: shiftToSave.fuel_cost,
        rent_cost: shiftToSave.rent_cost,
        other_expenses_total: shiftToSave.other_expenses_total,
        expenses: shiftToSave.expenses || [],
        total_expenses: shiftToSave.total_expenses,
        net_profit: shiftToSave.net_profit,
        hourly_rate: shiftToSave.hourly_rate,
        cost_per_km: shiftToSave.cost_per_km,
        revenue_per_km: shiftToSave.revenue_per_km,
        fuel_consumption_per_100km: shiftToSave.fuel_consumption_per_100km,
        status: 'completed',
        notes: shiftToSave.notes || null,
      });

      if (error) {
        console.error('Error saving shift to Supabase:', error);
      }
    } catch (e) {
      console.error('Exception saving shift to Supabase:', e);
    }
  }

  return updatedList;
}

export async function deleteCompletedShift(driverId: string, shiftId: string): Promise<Shift[]> {
  const currentList = getCompletedShifts(driverId);
  const updatedList = currentList.filter(s => s.id !== shiftId);

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SHIFTS_PREFIX + driverId, JSON.stringify(updatedList));
  }

  const supabase = getSupabase();
  if (supabase && isUUID(shiftId)) {
    try {
      await supabase.from('shifts').delete().eq('id', shiftId);
    } catch (e) {
      console.error('Exception deleting shift from Supabase:', e);
    }
  }

  return updatedList;
}

/**
 * Инициализация демонстрационных данных при необходимости
 */
export async function seedSampleShifts(driver: DriverProfile): Promise<Shift[]> {
  const existing = await fetchCompletedShifts(driver.id);
  if (existing.length > 0) return existing;

  const today = new Date();
  const sampleShifts: Shift[] = [];

  const daysBack = [1, 2, 3, 4, 5];
  const sampleData = [
    { gross: 9400, fuelL: 32, fuelCost: 1760, hours: 11, km: 230, rent: driver.default_rent, food: 480, coffee: 190 },
    { gross: 8800, fuelL: 28, fuelCost: 1540, hours: 10, km: 210, rent: driver.default_rent, food: 350, wash: 400 },
    { gross: 10500, fuelL: 35, fuelCost: 1925, hours: 12, km: 260, rent: driver.default_rent, food: 550, coffee: 250 },
    { gross: 7900, fuelL: 26, fuelCost: 1430, hours: 9, km: 180, rent: driver.default_rent, food: 300, fine: 500 },
    { gross: 11200, fuelL: 36, fuelCost: 1980, hours: 12.5, km: 280, rent: driver.default_rent, food: 600, coffee: 300 },
  ];

  for (let i = 0; i < sampleData.length; i++) {
    const item = sampleData[i];
    const d = new Date(today);
    d.setDate(today.getDate() - daysBack[i]);
    const dateStr = d.toISOString().split('T')[0];

    const expenses: ExpenseItem[] = [];
    if (item.food) expenses.push({ id: generateUUID(), category: 'food', amount: item.food, created_at: d.toISOString() });
    if (item.coffee) expenses.push({ id: generateUUID(), category: 'coffee', amount: item.coffee, created_at: d.toISOString() });
    if (item.wash) expenses.push({ id: generateUUID(), category: 'wash', amount: item.wash, created_at: d.toISOString() });
    if (item.fine) expenses.push({ id: generateUUID(), category: 'fine', amount: item.fine, comment: 'Парковка', created_at: d.toISOString() });

    const metrics = calculateShiftMetrics({
      date: dateStr,
      start_time: '08:00',
      end_time: '20:00',
      duration_hours: item.hours,
      mileage_km: item.km,
      gross_revenue: item.gross,
      fuel_liters: item.fuelL,
      fuel_cost: item.fuelCost,
      rent_cost: item.rent,
      expenses,
    });

    const shiftObj: Shift = {
      id: generateUUID(),
      driver_id: driver.id,
      date: dateStr,
      start_time: '08:00',
      end_time: '20:00',
      duration_hours: metrics.duration_hours,
      mileage_km: metrics.mileage_km,
      gross_revenue: item.gross,
      fuel_liters: item.fuelL,
      fuel_cost: item.fuelCost,
      rent_cost: item.rent,
      other_expenses_total: metrics.other_expenses_total,
      expenses,
      total_expenses: metrics.total_expenses,
      net_profit: metrics.net_profit,
      hourly_rate: metrics.hourly_rate,
      cost_per_km: metrics.cost_per_km,
      revenue_per_km: metrics.revenue_per_km,
      fuel_consumption_per_100km: metrics.fuel_consumption_per_100km,
      status: 'completed',
      created_at: d.toISOString(),
    };

    await saveCompletedShift(driver.id, shiftObj);
    sampleShifts.push(shiftObj);
  }

  return sampleShifts;
}
