import { describe, it, expect } from 'vitest';
import { Shift } from '@/lib/types';

/**
 * Generates CSV string following the project specification (Russian Excel standard):
 * - UTF-8 BOM (\uFEFF)
 * - Semicolon delimiter (;)
 * - CRLF (\r\n) line endings
 * - 12 required columns
 * - Escaped notes
 */
export function formatShiftsToCSV(shifts: Shift[]): string {
  if (shifts.length === 0) return '';

  const headers = [
    'Дата',
    'Часы',
    'Пробег (км)',
    'Касса (руб)',
    'Бензин (л)',
    'Бензин (руб)',
    'Аренда (руб)',
    'Доп. расходы (руб)',
    'Чистая прибыль (руб)',
    'Ставка (руб/ч)',
    'Расход (л/100км)',
    'Заметки',
  ];

  const rows = shifts.map(s => [
    s.date,
    s.duration_hours,
    s.mileage_km,
    s.gross_revenue,
    s.fuel_liters,
    s.fuel_cost,
    s.rent_cost,
    s.other_expenses_total,
    s.net_profit,
    s.hourly_rate,
    s.fuel_consumption_per_100km,
    `"${(s.notes || '').replace(/"/g, '""')}"`,
  ]);

  return (
    '\uFEFF' +
    [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n')
  );
}

describe('CSV Export - Tier 1: Feature Coverage', () => {
  const sampleShifts: Shift[] = [
    {
      id: 'shift-1',
      driver_id: 'drv-1',
      date: '2026-11-18',
      start_time: '08:00',
      end_time: '20:00',
      duration_hours: 12,
      mileage_km: 250,
      gross_revenue: 9500,
      fuel_liters: 32,
      fuel_cost: 1760,
      rent_cost: 2200,
      other_expenses_total: 450,
      expenses: [{ id: 'e1', category: 'food', amount: 450, created_at: '' }],
      total_expenses: 4410,
      net_profit: 5090,
      hourly_rate: 424,
      cost_per_km: 17.6,
      revenue_per_km: 38.0,
      fuel_consumption_per_100km: 12.8,
      status: 'completed',
      notes: 'Хорошая смена, центр и аэропорт',
      created_at: '2026-11-18T08:00:00.000Z',
    },
  ];

  it('includes UTF-8 BOM prefix (\uFEFF) as the first character', () => {
    const csv = formatShiftsToCSV(sampleShifts);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });

  it('uses semicolon (;) as the column separator for Russian Excel compatibility', () => {
    const csv = formatShiftsToCSV(sampleShifts);
    const content = csv.slice(1); // remove BOM
    const lines = content.split('\r\n');
    const headerCols = lines[0].split(';');
    expect(headerCols.length).toBe(12);
  });

  it('contains all 12 required column headers in correct order', () => {
    const csv = formatShiftsToCSV(sampleShifts);
    const content = csv.slice(1);
    const headerLine = content.split('\r\n')[0];
    const expectedHeaders = [
      'Дата',
      'Часы',
      'Пробег (км)',
      'Касса (руб)',
      'Бензин (л)',
      'Бензин (руб)',
      'Аренда (руб)',
      'Доп. расходы (руб)',
      'Чистая прибыль (руб)',
      'Ставка (руб/ч)',
      'Расход (л/100км)',
      'Заметки',
    ];
    expect(headerLine).toBe(expectedHeaders.join(';'));
  });

  it('uses CRLF (\\r\\n) line breaks for Windows/Excel standards', () => {
    const csv = formatShiftsToCSV(sampleShifts);
    const content = csv.slice(1);
    expect(content).toContain('\r\n');
    const lines = content.split('\r\n');
    expect(lines.length).toBe(2); // Header + 1 shift row
  });

  it('accurately maps shift values to corresponding columns', () => {
    const csv = formatShiftsToCSV(sampleShifts);
    const content = csv.slice(1);
    const row = content.split('\r\n')[1].split(';');

    expect(row[0]).toBe('2026-11-18'); // date
    expect(row[1]).toBe('12'); // duration_hours
    expect(row[2]).toBe('250'); // mileage_km
    expect(row[3]).toBe('9500'); // gross_revenue
    expect(row[4]).toBe('32'); // fuel_liters
    expect(row[5]).toBe('1760'); // fuel_cost
    expect(row[6]).toBe('2200'); // rent_cost
    expect(row[7]).toBe('450'); // other_expenses_total
    expect(row[8]).toBe('5090'); // net_profit
    expect(row[9]).toBe('424'); // hourly_rate
    expect(row[10]).toBe('12.8'); // fuel_consumption_per_100km
    expect(row[11]).toBe('"Хорошая смена, центр и аэропорт"'); // notes
  });
});

describe('CSV Export - Tier 2: Boundary & Corner Cases', () => {
  it('returns empty string when shifts array is empty', () => {
    expect(formatShiftsToCSV([])).toBe('');
  });

  it('correctly escapes double quotes inside notes (RFC 4180)', () => {
    const shiftWithQuotes: Shift = {
      id: 'shift-q',
      driver_id: 'drv-1',
      date: '2026-11-18',
      start_time: '09:00',
      duration_hours: 8,
      mileage_km: 150,
      gross_revenue: 6000,
      fuel_liters: 15,
      fuel_cost: 850,
      rent_cost: 2000,
      other_expenses_total: 0,
      expenses: [],
      total_expenses: 2850,
      net_profit: 3150,
      hourly_rate: 394,
      cost_per_km: 19.0,
      revenue_per_km: 40.0,
      fuel_consumption_per_100km: 10.0,
      status: 'completed',
      notes: 'Клиент сказал: "Спасибо за поездку!", чаевые 200 ₽',
      created_at: '',
    };

    const csv = formatShiftsToCSV([shiftWithQuotes]);
    const content = csv.slice(1);
    const row = content.split('\r\n')[1];
    // In RFC 4180 CSV, inner double quotes must become double-double quotes ("")
    expect(row).toContain('"Клиент сказал: ""Спасибо за поездку!"", чаевые 200 ₽"');
  });

  it('handles notes containing semicolons and commas without corrupting columns', () => {
    const shiftWithDelimiters: Shift = {
      id: 'shift-delim',
      driver_id: 'drv-1',
      date: '2026-11-18',
      start_time: '08:00',
      duration_hours: 10,
      mileage_km: 200,
      gross_revenue: 8000,
      fuel_liters: 20,
      fuel_cost: 1100,
      rent_cost: 2200,
      other_expenses_total: 300,
      expenses: [],
      total_expenses: 3600,
      net_profit: 4400,
      hourly_rate: 440,
      cost_per_km: 18.0,
      revenue_per_km: 40.0,
      fuel_consumption_per_100km: 10.0,
      status: 'completed',
      notes: 'Смена 1; заказ А, заказ Б; мойка, перекус; все супер',
      created_at: '',
    };

    const csv = formatShiftsToCSV([shiftWithDelimiters]);
    const content = csv.slice(1);
    const lines = content.split('\r\n');
    // Because notes are wrapped in quotes, the line should split into exactly 12 columns
    // We match the columns up to notes:
    // Note that standard split by semicolon might split inside quotes if naive,
    // but the notes column itself begins with " and ends with "
    expect(lines[1].endsWith('"Смена 1; заказ А, заказ Б; мойка, перекус; все супер"')).toBe(true);
  });

  it('handles undefined or null notes by outputting empty quotes ("")', () => {
    const shiftNoNotes: Shift = {
      id: 'shift-null',
      driver_id: 'drv-1',
      date: '2026-11-18',
      start_time: '08:00',
      duration_hours: 6,
      mileage_km: 100,
      gross_revenue: 4000,
      fuel_liters: 10,
      fuel_cost: 550,
      rent_cost: 1500,
      other_expenses_total: 0,
      expenses: [],
      total_expenses: 2050,
      net_profit: 1950,
      hourly_rate: 325,
      cost_per_km: 20.5,
      revenue_per_km: 40.0,
      fuel_consumption_per_100km: 10.0,
      status: 'completed',
      created_at: '',
    };

    const csv = formatShiftsToCSV([shiftNoNotes]);
    const row = csv.slice(1).split('\r\n')[1].split(';');
    expect(row[11]).toBe('""');
  });

  it('handles zero values and negative profits correctly', () => {
    const zeroShift: Shift = {
      id: 'shift-zero',
      driver_id: 'drv-1',
      date: '2026-11-18',
      start_time: '12:00',
      duration_hours: 4,
      mileage_km: 0,
      gross_revenue: 0,
      fuel_liters: 0,
      fuel_cost: 0,
      rent_cost: 2000,
      other_expenses_total: 0,
      expenses: [],
      total_expenses: 2000,
      net_profit: -2000,
      hourly_rate: -500,
      cost_per_km: 0,
      revenue_per_km: 0,
      fuel_consumption_per_100km: 0,
      status: 'completed',
      created_at: '',
    };

    const csv = formatShiftsToCSV([zeroShift]);
    const row = csv.slice(1).split('\r\n')[1].split(';');
    expect(row[3]).toBe('0'); // gross
    expect(row[4]).toBe('0'); // fuel L
    expect(row[6]).toBe('2000'); // rent
    expect(row[8]).toBe('-2000'); // net profit
    expect(row[9]).toBe('-500'); // hourly rate
  });

  it('exports multiple shifts maintaining exact row count and order', () => {
    const shifts: Shift[] = Array.from({ length: 5 }, (_, i) => ({
      id: `shift-${i}`,
      driver_id: 'drv-1',
      date: `2026-11-${10 + i}`,
      start_time: '08:00',
      duration_hours: 10,
      mileage_km: 200,
      gross_revenue: 8000 + i * 500,
      fuel_liters: 25,
      fuel_cost: 1400,
      rent_cost: 2200,
      other_expenses_total: 200,
      expenses: [],
      total_expenses: 3800,
      net_profit: 4200 + i * 500,
      hourly_rate: 420 + i * 50,
      cost_per_km: 19.0,
      revenue_per_km: 40.0,
      fuel_consumption_per_100km: 12.5,
      status: 'completed',
      notes: `День ${i + 1}`,
      created_at: '',
    }));

    const csv = formatShiftsToCSV(shifts);
    const lines = csv.slice(1).split('\r\n');
    expect(lines.length).toBe(6); // 1 header + 5 rows
    expect(lines[1]).toContain('2026-11-10');
    expect(lines[5]).toContain('2026-11-14');
  });
});
