export type FuelType = 'ai92' | 'ai95' | 'ai98' | 'gas_propane' | 'gas_methane' | 'electric' | 'diesel';

export type ExpenseCategory = 
  | 'food' 
  | 'coffee' 
  | 'wash' 
  | 'fine' 
  | 'washer_fluid' 
  | 'car_service' 
  | 'phone_internet' 
  | 'other';

export interface ExpenseItem {
  id: string;
  shift_id?: string;
  category: ExpenseCategory;
  category_name?: string;
  amount: number;
  comment?: string;
  created_at: string;
}

export interface DriverProfile {
  id: string;
  phone: string;
  name: string;
  car_model: string;
  fuel_type: FuelType;
  default_rent: number; // Стоимость аренды за смену (0 если своя машина)
  default_goal: number; // Цель чистой прибыли за смену (например, 5000 руб)
  default_fuel_consumption?: number; // Базовый расход л/100км (например, 8.5)
  default_fuel_price?: number; // Базовая цена за литр (например, 58)
  pin_hash: string;
  created_at: string;
}

export interface Shift {
  id: string;
  driver_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // ISO string or HH:mm
  end_time?: string; // ISO string or HH:mm
  duration_hours: number; // Отработано часов (например, 11.5)
  mileage_km: number; // Пробег за смену в км
  start_odometer?: number;
  end_odometer?: number;
  
  // Доходы и расходы
  gross_revenue: number; // Грязная прибыль (касса агрегатора + нал + чаевые)
  fuel_liters: number; // Заправлено бензина (литры)
  fuel_cost: number; // Сумма на бензин (рубли)
  rent_cost: number; // Аренда авто за смену (рубли)
  other_expenses_total: number; // Сумма доп. расходов (рубли)
  expenses: ExpenseItem[]; // Детализированный список доп. расходов
  
  // Рассчитываемые показатели
  total_expenses: number; // Аренда + Бензин + Доп. расходы
  net_profit: number; // Грязная прибыль - Итого расходы
  hourly_rate: number; // Чистая прибыль в час (руб/час)
  cost_per_km: number; // Расход/себестоимость на 1 км (руб/км)
  revenue_per_km: number; // Доход на 1 км (руб/км)
  fuel_consumption_per_100km: number; // Расход топлива л / 100 км
  
  status: 'active' | 'completed';
  notes?: string;
  created_at: string;
}

export interface SmartInsight {
  id: string;
  type: 'positive' | 'warning' | 'tip' | 'info';
  title: string;
  message: string;
  metric?: string;
}

export interface StatsSummary {
  total_shifts: number;
  total_hours: number;
  total_mileage_km: number;
  total_gross_revenue: number;
  total_net_profit: number;
  total_expenses: number;
  total_fuel_liters: number;
  total_fuel_cost: number;
  total_rent_cost: number;
  total_other_expenses: number;
  
  avg_net_per_shift: number;
  avg_hourly_rate: number;
  avg_fuel_consumption: number;
  avg_mileage_per_shift: number;
  avg_cost_per_km: number;
  
  expense_breakdown: {
    rent: number;
    fuel: number;
    food: number;
    wash: number;
    fines: number;
    other: number;
  };
}
