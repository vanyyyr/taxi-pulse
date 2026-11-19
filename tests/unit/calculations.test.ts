import { describe, it, expect } from 'vitest';
import {
  calculateShiftMetrics,
  calculateDurationHours,
  calculateOtherExpensesTotal,
  calculateGoalProgress,
  formatCurrency,
  formatNumber,
  getExpenseCategoryLabel,
  ShiftInput,
} from '@/lib/calculations';
import { ExpenseItem } from '@/lib/types';

describe('Calculations - Tier 1: Feature Coverage', () => {
  it('calculates standard shift metrics accurately', () => {
    const input: ShiftInput = {
      date: '2026-11-18',
      start_time: '08:00',
      end_time: '18:00',
      duration_hours: 10,
      mileage_km: 200,
      gross_revenue: 9000,
      fuel_liters: 30,
      fuel_cost: 1650,
      rent_cost: 2200,
      expenses: [
        { id: '1', category: 'food', amount: 450, created_at: '' },
        { id: '2', category: 'coffee', amount: 150, created_at: '' },
      ],
    };

    const metrics = calculateShiftMetrics(input);

    // Other expenses: 450 + 150 = 600
    expect(metrics.other_expenses_total).toBe(600);
    // Total expenses: 2200 + 1650 + 600 = 4450
    expect(metrics.total_expenses).toBe(4450);
    // Net profit: 9000 - 4450 = 4550
    expect(metrics.net_profit).toBe(4550);
    // Hourly rate: 4550 / 10 = 455
    expect(metrics.hourly_rate).toBe(455);
    // Cost per km: 4450 / 200 = 22.25 -> 22.3
    expect(metrics.cost_per_km).toBe(22.3);
    // Revenue per km: 9000 / 200 = 45.0
    expect(metrics.revenue_per_km).toBe(45.0);
    // Fuel consumption: (30 / 200) * 100 = 15.0 L/100km
    expect(metrics.fuel_consumption_per_100km).toBe(15.0);
  });

  it('calculates sum of other expenses from list', () => {
    const expenses: ExpenseItem[] = [
      { id: '1', category: 'food', amount: 350, created_at: '' },
      { id: '2', category: 'wash', amount: 400, created_at: '' },
      { id: '3', category: 'washer_fluid', amount: 250, created_at: '' },
    ];
    expect(calculateOtherExpensesTotal(expenses)).toBe(1000);
    expect(calculateOtherExpensesTotal([])).toBe(0);
  });

  it('calculates shift duration in hours for standard times', () => {
    expect(calculateDurationHours('08:00', '20:00')).toBe(12);
    expect(calculateDurationHours('09:00', '15:30')).toBe(6.5);
    expect(calculateDurationHours('07:15', '19:45')).toBe(12.5);
  });

  it('calculates shift duration from ISO strings', () => {
    const start = '2026-11-18T08:00:00.000Z';
    const end = '2026-11-18T18:30:00.000Z';
    expect(calculateDurationHours(start, end)).toBe(10.5);
  });

  it('calculates daily goal progress metrics', () => {
    // 50% progress
    const half = calculateGoalProgress(2500, 5000);
    expect(half.percentage).toBe(50);
    expect(half.remaining).toBe(2500);
    expect(half.isAchieved).toBe(false);

    // Goal met exactly
    const exact = calculateGoalProgress(5000, 5000);
    expect(exact.percentage).toBe(100);
    expect(exact.remaining).toBe(0);
    expect(exact.isAchieved).toBe(true);
  });

  it('formats currency in Russian Rubles format', () => {
    const formatted = formatCurrency(5000);
    // ru-RU format contains 5 000 and ₽
    expect(formatted).toMatch(/5\s?000/);
    expect(formatted).toContain('₽');
  });

  it('formats numbers with specified decimals', () => {
    expect(formatNumber(12.3456, 1)).toMatch(/12[,.]3/);
    expect(formatNumber(1000, 0)).toMatch(/1\s?000/);
  });

  it('maps expense categories to human-readable Russian labels', () => {
    expect(getExpenseCategoryLabel('food')).toBe('Еда и перекус');
    expect(getExpenseCategoryLabel('wash')).toBe('Мойка авто');
    expect(getExpenseCategoryLabel('coffee')).toBe('Кофе и напитки');
    expect(getExpenseCategoryLabel('fine')).toBe('Штраф ГИБДД');
    expect(getExpenseCategoryLabel('unknown_cat')).toBe('Расход');
  });
});

describe('Calculations - Tier 2: Boundary & Corner Cases', () => {
  it('handles zero gross revenue with fixed costs (loss-making shift)', () => {
    const input: ShiftInput = {
      date: '2026-11-18',
      start_time: '08:00',
      end_time: '16:00',
      duration_hours: 8,
      mileage_km: 100,
      gross_revenue: 0,
      fuel_liters: 15,
      fuel_cost: 800,
      rent_cost: 2000,
      expenses: [],
    };

    const metrics = calculateShiftMetrics(input);
    expect(metrics.total_expenses).toBe(2800);
    expect(metrics.net_profit).toBe(-2800);
    expect(metrics.hourly_rate).toBe(-350); // -2800 / 8
    expect(metrics.revenue_per_km).toBe(0);
    expect(metrics.cost_per_km).toBe(28.0);
  });

  it('handles zero expenses (pure profit = gross revenue)', () => {
    const input: ShiftInput = {
      date: '2026-11-18',
      start_time: '10:00',
      end_time: '15:00',
      duration_hours: 5,
      mileage_km: 50,
      gross_revenue: 6000,
      fuel_liters: 0,
      fuel_cost: 0,
      rent_cost: 0,
      expenses: [],
    };

    const metrics = calculateShiftMetrics(input);
    expect(metrics.total_expenses).toBe(0);
    expect(metrics.net_profit).toBe(6000);
    expect(metrics.hourly_rate).toBe(1200);
    expect(metrics.cost_per_km).toBe(0);
    expect(metrics.fuel_consumption_per_100km).toBe(0);
  });

  it('handles zero mileage and zero fuel without division-by-zero or NaN', () => {
    const input: ShiftInput = {
      date: '2026-11-18',
      start_time: '08:00',
      end_time: '12:00',
      duration_hours: 4,
      mileage_km: 0,
      gross_revenue: 3000,
      fuel_liters: 0,
      fuel_cost: 0,
      rent_cost: 1500,
      expenses: [],
    };

    const metrics = calculateShiftMetrics(input);
    expect(metrics.cost_per_km).toBe(0);
    expect(metrics.revenue_per_km).toBe(0);
    expect(metrics.fuel_consumption_per_100km).toBe(0);
    expect(Number.isNaN(metrics.cost_per_km)).toBe(false);
    expect(Number.isNaN(metrics.fuel_consumption_per_100km)).toBe(false);
  });

  it('calculates duration correctly for night shifts crossing midnight', () => {
    // 20:00 to 06:00 is 10 hours
    expect(calculateDurationHours('20:00', '06:00')).toBe(10);
    // 22:30 to 04:30 is 6 hours
    expect(calculateDurationHours('22:30', '04:30')).toBe(6);
    // 23:45 to 01:15 is 1.5 hours
    expect(calculateDurationHours('23:45', '01:15')).toBe(1.5);
  });

  it('returns zero hourly rate when duration is less than 15 minutes (0.25 hours) to avoid division by zero', () => {
    const inputZero: ShiftInput = {
      date: '2026-11-18',
      start_time: '10:00',
      end_time: '10:00',
      duration_hours: 0,
      mileage_km: 10,
      gross_revenue: 1000,
      fuel_liters: 1,
      fuel_cost: 50,
      rent_cost: 500,
      expenses: [],
    };

    const metricsZero = calculateShiftMetrics(inputZero);
    expect(metricsZero.duration_hours).toBe(0);
    // Contract: duration_hours < 0.25 -> hourly_rate is 0
    expect(metricsZero.hourly_rate).toBe(0);

    const inputShort: ShiftInput = {
      ...inputZero,
      duration_hours: 0.1, // 6 minutes
    };
    const metricsShort = calculateShiftMetrics(inputShort);
    expect(metricsShort.duration_hours).toBe(0.1);
    expect(metricsShort.hourly_rate).toBe(0);

    const inputValid: ShiftInput = {
      ...inputZero,
      duration_hours: 0.5, // 30 minutes
    };
    const metricsValid = calculateShiftMetrics(inputValid);
    // net_profit = 1000 - 550 = 450; 450 / 0.5 = 900
    expect(metricsValid.hourly_rate).toBe(900);
  });

  it('handles floating point precision for decimal currency and fuel liters', () => {
    const input: ShiftInput = {
      date: '2026-11-18',
      start_time: '08:00',
      end_time: '16:00',
      duration_hours: 8,
      mileage_km: 185.5,
      gross_revenue: 8432.50,
      fuel_liters: 22.35,
      fuel_cost: 1251.60,
      rent_cost: 2199.99,
      expenses: [
        { id: '1', category: 'food', amount: 350.45, created_at: '' },
        { id: '2', category: 'coffee', amount: 120.55, created_at: '' },
      ],
    };

    const metrics = calculateShiftMetrics(input);
    expect(metrics.other_expenses_total).toBeCloseTo(471.0, 2);
    // Total expenses: 2199.99 + 1251.60 + 471.0 = 3922.59
    expect(metrics.total_expenses).toBeCloseTo(3922.59, 2);
    // Net profit: 8432.50 - 3922.59 = 4509.91
    expect(metrics.net_profit).toBeCloseTo(4509.91, 2);
  });

  it('handles extreme inputs: high mileage (99999 km) and large gross (1,000,000 ₽)', () => {
    const input: ShiftInput = {
      date: '2026-11-18',
      start_time: '00:00',
      end_time: '24:00',
      duration_hours: 24,
      mileage_km: 99999,
      gross_revenue: 1000000,
      fuel_liters: 8500,
      fuel_cost: 476000,
      rent_cost: 50000,
      expenses: [{ id: '1', category: 'other', amount: 10000, created_at: '' }],
    };

    const metrics = calculateShiftMetrics(input);
    expect(metrics.total_expenses).toBe(536000);
    expect(metrics.net_profit).toBe(464000);
    expect(metrics.hourly_rate).toBe(Math.round(464000 / 24));
    expect(metrics.revenue_per_km).toBe(10.0);
    expect(metrics.fuel_consumption_per_100km).toBe(8.5);
  });

  it('caps goal progress at 100% when goal is exceeded', () => {
    const progress = calculateGoalProgress(7500, 5000);
    expect(progress.percentage).toBe(100);
    expect(progress.remaining).toBe(0);
    expect(progress.isAchieved).toBe(true);
  });

  it('handles goal progress when net profit is negative', () => {
    const progress = calculateGoalProgress(-1500, 5000);
    expect(progress.current).toBe(0);
    expect(progress.percentage).toBe(0);
    expect(progress.remaining).toBe(5000);
    expect(progress.isAchieved).toBe(false);
  });

  it('derives mileage from odometers when mileage_km is not provided', () => {
    const input: ShiftInput = {
      date: '2026-11-18',
      start_time: '08:00',
      end_time: '18:00',
      duration_hours: 10,
      mileage_km: 0,
      start_odometer: 145000,
      end_odometer: 145250,
      gross_revenue: 8000,
      fuel_liters: 20,
      fuel_cost: 1100,
      rent_cost: 2000,
      expenses: [],
    };

    const metrics = calculateShiftMetrics(input);
    expect(metrics.mileage_km).toBe(250);
    expect(metrics.fuel_consumption_per_100km).toBe(8.0);
  });

  it('preserves explicit fuel_consumption_per_100km override', () => {
    const input: ShiftInput = {
      date: '2026-11-18',
      start_time: '08:00',
      end_time: '18:00',
      duration_hours: 10,
      mileage_km: 200,
      gross_revenue: 8000,
      fuel_liters: 30, // calculated would be 15.0
      fuel_cost: 1650,
      rent_cost: 2000,
      fuel_consumption_per_100km: 9.2, // explicit override
      expenses: [],
    };

    const metrics = calculateShiftMetrics(input);
    expect(metrics.fuel_consumption_per_100km).toBe(9.2);
  });
});
