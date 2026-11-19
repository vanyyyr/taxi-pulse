import { ExpenseItem } from './types';

export interface ShiftInput {
  date: string;
  start_time: string;
  end_time?: string;
  duration_hours?: number;
  mileage_km: number;
  start_odometer?: number;
  end_odometer?: number;
  gross_revenue: number;
  fuel_liters: number;
  fuel_cost: number;
  rent_cost: number;
  fuel_consumption_per_100km?: number;
  expenses: ExpenseItem[];
  notes?: string;
}

/**
 * Рассчитывает суммарные расходы из списка доп. расходов
 */
export function calculateOtherExpensesTotal(expenses: ExpenseItem[]): number {
  return expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

/**
 * Рассчитывает длительность смены в часах по времени старта и конца
 */
export function calculateDurationHours(startTimeStr: string, endTimeStr?: string): number {
  if (!startTimeStr || !endTimeStr) return 0;

  try {
    // Поддержка формата HH:mm
    if (startTimeStr.includes(':') && !startTimeStr.includes('T')) {
      const startParts = startTimeStr.split(':');
      const endParts = endTimeStr.split(':');
      if (startParts.length < 2 || endParts.length < 2) return 0;

      const startH = Number(startParts[0]);
      const startM = Number(startParts[1]);
      const endH = Number(endParts[0]);
      const endM = Number(endParts[1]);

      if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0;

      const startMinutes = startH * 60 + startM;
      let endMinutes = endH * 60 + endM;

      if (endMinutes < startMinutes) {
        // Переход через полночь
        endMinutes += 24 * 60;
      }

      const diffHours = (endMinutes - startMinutes) / 60;
      return Math.round(diffHours * 10) / 10;
    }

    // Поддержка ISO дат
    const start = new Date(startTimeStr).getTime();
    const end = new Date(endTimeStr).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return 0;

    const diffHours = (end - start) / (1000 * 60 * 60);
    return Math.round(diffHours * 10) / 10;
  } catch {
    return 0;
  }
}

/**
 * Рассчитывает все показатели смены
 */
export function calculateShiftMetrics(input: ShiftInput): {
  duration_hours: number;
  mileage_km: number;
  other_expenses_total: number;
  total_expenses: number;
  net_profit: number;
  hourly_rate: number;
  cost_per_km: number;
  revenue_per_km: number;
  fuel_consumption_per_100km: number;
} {
  // Длительность
  let duration_hours = input.duration_hours || 0;
  if (!duration_hours && input.start_time && input.end_time) {
    duration_hours = calculateDurationHours(input.start_time, input.end_time);
  }

  // Километраж
  let mileage_km = Number(input.mileage_km) || 0;
  if (!mileage_km && input.start_odometer && input.end_odometer) {
    mileage_km = Math.max(0, input.end_odometer - input.start_odometer);
  }

  const gross_revenue = Number(input.gross_revenue) || 0;
  const fuel_cost = Number(input.fuel_cost) || 0;
  const fuel_liters = Number(input.fuel_liters) || 0;
  const rent_cost = Number(input.rent_cost) || 0;

  const other_expenses_total = Number(calculateOtherExpensesTotal(input.expenses).toFixed(2));
  const total_expenses = Number((rent_cost + fuel_cost + other_expenses_total).toFixed(2));
  const net_profit = Number((gross_revenue - total_expenses).toFixed(2));

  // Чистый доход в час: рассчитывается только если смена длится не менее 15 минут (0.25 часа)
  const hourly_rate = duration_hours >= 0.25 ? Math.round(net_profit / duration_hours) : 0;

  // Себестоимость и доход на км
  const cost_per_km = mileage_km > 0 ? Math.round((total_expenses / mileage_km) * 10) / 10 : 0;
  const revenue_per_km = mileage_km > 0 ? Math.round((gross_revenue / mileage_km) * 10) / 10 : 0;

  // Расход топлива л/100км (с возможностью корректировки)
  let fuel_consumption_per_100km = 0;
  if (input.fuel_consumption_per_100km !== undefined && input.fuel_consumption_per_100km > 0) {
    fuel_consumption_per_100km = Math.round(input.fuel_consumption_per_100km * 10) / 10;
  } else if (mileage_km > 0 && fuel_liters > 0) {
    fuel_consumption_per_100km = Math.round((fuel_liters / mileage_km) * 100 * 10) / 10;
  }

  return {
    duration_hours,
    mileage_km,
    other_expenses_total,
    total_expenses,
    net_profit,
    hourly_rate,
    cost_per_km,
    revenue_per_km,
    fuel_consumption_per_100km,
  };
}

/**
 * Прогресс выполнения дневной цели
 */
export function calculateGoalProgress(currentNetProfit: number, targetGoal: number): {
  target: number;
  current: number;
  percentage: number;
  remaining: number;
  isAchieved: boolean;
} {
  const target = Math.max(1, targetGoal || 5000);
  const current = Math.max(0, currentNetProfit);
  const percentage = Math.min(100, Math.round((current / target) * 100));
  const remaining = Math.max(0, target - current);
  const isAchieved = current >= target;

  return {
    target,
    current,
    percentage,
    remaining,
    isAchieved,
  };
}

/**
 * Форматирование суммы в рублях
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Форматирование числа с разделением разрядов
 */
export function formatNumber(val: number, decimals: number = 0): string {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(val || 0);
}

/**
 * Человекопонятное название категории расходов
 */
export function getExpenseCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    food: 'Еда и перекус',
    coffee: 'Кофе и напитки',
    wash: 'Мойка авто',
    fine: 'Штраф ГИБДД',
    washer_fluid: 'Омывайка',
    car_service: 'Шиномонтаж / Мелкий ремонт',
    phone_internet: 'Связь и интернет',
    other: 'Прочие расходы',
  };
  return labels[category] || 'Расход';
}
