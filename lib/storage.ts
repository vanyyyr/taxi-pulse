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
  if (digits.startsWith('8') && digits.length === 11) {
    return '7' + digits.slice(1);
  }
  return digits;
}

/**
 * Красивое форматирование номера: +7 (999) 123-45-67
 */
export function formatPhone(rawPhone: string): string {
  const digits = normalizePhone(rawPhone);
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

export async function loginOrRegisterDriver(phone: string, pin: string): Promise<{ success: boolean; driver?: DriverProfile; message?: string }> {
  const cleanPhone = normalizePhone(phone);
  if (cleanPhone.length < 10) {
    return { success: false, message: 'Введите корректный номер телефона (не менее 10 цифр)' };
  }
  if (!/^\d{4}$/.test(pin)) {
    return { success: false, message: 'PIN-код должен состоять ровно из 4 цифр' };
  }

  const pinHash = await hashPin(pin, cleanPhone);

  // 1. Попытка через Supabase (если подключен)
  const supabase = getSupabase();
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
        // Водитель уже существует в Supabase
        if (data.pin_hash === pinHash) {
          const profile: DriverProfile = {
            id: data.id,
            phone: data.phone,
            name: data.name,
            car_model: data.car_model || 'Эконом',
            fuel_type: data.fuel_type || 'ai95',
            default_rent: Number(data.default_rent) || 2200,
            default_goal: Number(data.default_goal) || 5000,
            pin_hash: data.pin_hash,
            created_at: data.created_at,
          };
          setCurrentDriver(profile);
          return { success: true, driver: profile };
        } else {
          return { success: false, message: 'Неверный 4-значный PIN-код' };
        }
      } else {
        // Создаем нового водителя в Supabase
        const newId = crypto.randomUUID();
        const newProfile: DriverProfile = {
          id: newId,
          phone: cleanPhone,
          name: `Водитель ${cleanPhone.slice(-4)}`,
          car_model: 'Эконом (Kia Rio / Solaris)',
          fuel_type: 'ai95',
          default_rent: 2200,
          default_goal: 5000,
          pin_hash: pinHash,
          created_at: new Date().toISOString(),
        };

        await supabase.from('driver_profiles').insert({
          id: newProfile.id,
          phone: newProfile.phone,
          name: newProfile.name,
          car_model: newProfile.car_model,
          fuel_type: newProfile.fuel_type,
          default_rent: newProfile.default_rent,
          default_goal: newProfile.default_goal,
          pin_hash: newProfile.pin_hash,
        });

        setCurrentDriver(newProfile);
        return { success: true, driver: newProfile };
      }
    } catch (e) {
      console.warn('Supabase login exception, using local:', e);
    }
  }

  // 2. Локальное хранилище (Offline / Local-first)
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

  // Новый водитель (регистрация в один шаг)
  const newProfile: DriverProfile = {
    id: 'local_' + cleanPhone,
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

export function updateDriverProfile(updated: Partial<DriverProfile>): DriverProfile | null {
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

  // Фоновая синхронизация с Supabase
  const supabase = getSupabase();
  if (supabase && !merged.id.startsWith('local_')) {
    supabase
      .from('driver_profiles')
      .update({
        name: merged.name,
        car_model: merged.car_model,
        fuel_type: merged.fuel_type,
        default_rent: merged.default_rent,
        default_goal: merged.default_goal,
      })
      .eq('id', merged.id)
      .then();
  }

  return merged;
}

// -------------------------------------------------------------
// АКТИВНАЯ СМЕНА (РЕАЛЬНОЕ ВРЕМЯ)
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
    id: 'shift_' + Date.now(),
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
    fuel_consumption_per_100km: 0,
    status: 'active',
    created_at: now.toISOString(),
  };

  saveActiveShift(driver.id, newShift);
  return newShift;
}

// -------------------------------------------------------------
// ИСТОРИЯ ЗАВЕРШЕННЫХ СМЕН
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

export function saveCompletedShift(driverId: string, shift: Shift): Shift[] {
  const currentList = getCompletedShifts(driverId);
  const existingIdx = currentList.findIndex(s => s.id === shift.id);

  let updatedList: Shift[];
  if (existingIdx >= 0) {
    updatedList = [...currentList];
    updatedList[existingIdx] = shift;
  } else {
    updatedList = [shift, ...currentList];
  }

  // Сохраняем в localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SHIFTS_PREFIX + driverId, JSON.stringify(updatedList));
  }

  // Фоновая синхронизация с Supabase
  const supabase = getSupabase();
  if (supabase && !driverId.startsWith('local_')) {
    supabase.from('shifts').upsert({
      id: shift.id.startsWith('shift_') ? undefined : shift.id,
      driver_id: driverId,
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      duration_hours: shift.duration_hours,
      mileage_km: shift.mileage_km,
      start_odometer: shift.start_odometer,
      end_odometer: shift.end_odometer,
      gross_revenue: shift.gross_revenue,
      fuel_liters: shift.fuel_liters,
      fuel_cost: shift.fuel_cost,
      rent_cost: shift.rent_cost,
      other_expenses_total: shift.other_expenses_total,
      total_expenses: shift.total_expenses,
      net_profit: shift.net_profit,
      hourly_rate: shift.hourly_rate,
      cost_per_km: shift.cost_per_km,
      revenue_per_km: shift.revenue_per_km,
      fuel_consumption_per_100km: shift.fuel_consumption_per_100km,
      status: 'completed',
      notes: shift.notes,
    }).then();
  }

  return updatedList;
}

export function deleteCompletedShift(driverId: string, shiftId: string): Shift[] {
  const currentList = getCompletedShifts(driverId);
  const updatedList = currentList.filter(s => s.id !== shiftId);

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SHIFTS_PREFIX + driverId, JSON.stringify(updatedList));
  }

  const supabase = getSupabase();
  if (supabase && !driverId.startsWith('local_') && !shiftId.startsWith('shift_')) {
    supabase.from('shifts').delete().eq('id', shiftId).then();
  }

  return updatedList;
}

/**
 * Инициализация демонстрационных данных, если водитель только что зарегистрировался
 */
export function seedSampleShifts(driver: DriverProfile): Shift[] {
  const existing = getCompletedShifts(driver.id);
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

  sampleData.forEach((item, idx) => {
    const d = new Date(today);
    d.setDate(today.getDate() - daysBack[idx]);
    const dateStr = d.toISOString().split('T')[0];

    const expenses: ExpenseItem[] = [];
    if (item.food) expenses.push({ id: 'f_' + idx, category: 'food', amount: item.food, created_at: '' });
    if (item.coffee) expenses.push({ id: 'c_' + idx, category: 'coffee', amount: item.coffee, created_at: '' });
    if (item.wash) expenses.push({ id: 'w_' + idx, category: 'wash', amount: item.wash, created_at: '' });
    if (item.fine) expenses.push({ id: 'fn_' + idx, category: 'fine', amount: item.fine, comment: 'Превышение 20-40 км/ч', created_at: '' });

    const metrics = calculateShiftMetrics({
      date: dateStr,
      start_time: '08:00',
      end_time: '19:00',
      duration_hours: item.hours,
      mileage_km: item.km,
      gross_revenue: item.gross,
      fuel_liters: item.fuelL,
      fuel_cost: item.fuelCost,
      rent_cost: item.rent,
      expenses,
    });

    sampleShifts.push({
      id: 'sample_' + idx,
      driver_id: driver.id,
      date: dateStr,
      start_time: '08:00',
      end_time: '19:00',
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
    });
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SHIFTS_PREFIX + driver.id, JSON.stringify(sampleShifts));
  }

  return sampleShifts;
}
