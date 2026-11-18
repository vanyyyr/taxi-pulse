import { Shift, StatsSummary, SmartInsight } from './types';
import { formatCurrency, formatNumber } from './calculations';

export function calculateStatsSummary(shifts: Shift[]): StatsSummary {
  if (!shifts || shifts.length === 0) {
    return {
      total_shifts: 0,
      total_hours: 0,
      total_mileage_km: 0,
      total_gross_revenue: 0,
      total_net_profit: 0,
      total_expenses: 0,
      total_fuel_liters: 0,
      total_fuel_cost: 0,
      total_rent_cost: 0,
      total_other_expenses: 0,
      avg_net_per_shift: 0,
      avg_hourly_rate: 0,
      avg_fuel_consumption: 0,
      avg_mileage_per_shift: 0,
      avg_cost_per_km: 0,
      expense_breakdown: {
        rent: 0,
        fuel: 0,
        food: 0,
        wash: 0,
        fines: 0,
        other: 0,
      },
    };
  }

  let total_hours = 0;
  let total_mileage_km = 0;
  let total_gross_revenue = 0;
  let total_net_profit = 0;
  let total_expenses = 0;
  let total_fuel_liters = 0;
  let total_fuel_cost = 0;
  let total_rent_cost = 0;
  let total_other_expenses = 0;

  const breakdown = {
    rent: 0,
    fuel: 0,
    food: 0,
    wash: 0,
    fines: 0,
    other: 0,
  };

  shifts.forEach(s => {
    total_hours += Number(s.duration_hours) || 0;
    total_mileage_km += Number(s.mileage_km) || 0;
    total_gross_revenue += Number(s.gross_revenue) || 0;
    total_net_profit += Number(s.net_profit) || 0;
    total_expenses += Number(s.total_expenses) || 0;
    total_fuel_liters += Number(s.fuel_liters) || 0;
    total_fuel_cost += Number(s.fuel_cost) || 0;
    total_rent_cost += Number(s.rent_cost) || 0;
    total_other_expenses += Number(s.other_expenses_total) || 0;

    breakdown.rent += Number(s.rent_cost) || 0;
    breakdown.fuel += Number(s.fuel_cost) || 0;

    if (s.expenses && Array.isArray(s.expenses)) {
      s.expenses.forEach(e => {
        const amt = Number(e.amount) || 0;
        if (e.category === 'food' || e.category === 'coffee') breakdown.food += amt;
        else if (e.category === 'wash') breakdown.wash += amt;
        else if (e.category === 'fine') breakdown.fines += amt;
        else breakdown.other += amt;
      });
    }
  });

  const count = shifts.length;
  const avg_net_per_shift = Math.round(total_net_profit / count);
  const avg_hourly_rate = total_hours > 0 ? Math.round(total_net_profit / total_hours) : 0;
  const avg_mileage_per_shift = Math.round(total_mileage_km / count);
  const avg_fuel_consumption = 
    total_mileage_km > 0 && total_fuel_liters > 0
      ? Math.round((total_fuel_liters / total_mileage_km) * 100 * 10) / 10
      : 0;
  const avg_cost_per_km = total_mileage_km > 0 ? Math.round((total_expenses / total_mileage_km) * 10) / 10 : 0;

  return {
    total_shifts: count,
    total_hours: Math.round(total_hours * 10) / 10,
    total_mileage_km: Math.round(total_mileage_km),
    total_gross_revenue: Math.round(total_gross_revenue),
    total_net_profit: Math.round(total_net_profit),
    total_expenses: Math.round(total_expenses),
    total_fuel_liters: Math.round(total_fuel_liters * 10) / 10,
    total_fuel_cost: Math.round(total_fuel_cost),
    total_rent_cost: Math.round(total_rent_cost),
    total_other_expenses: Math.round(total_other_expenses),
    avg_net_per_shift,
    avg_hourly_rate,
    avg_fuel_consumption,
    avg_mileage_per_shift,
    avg_cost_per_km,
    expense_breakdown: breakdown,
  };
}

export interface DayOfWeekStat {
  dayName: string;
  dayIndex: number; // 0 = Вс, 1 = Пн
  shiftsCount: number;
  totalNet: number;
  avgNet: number;
  avgHourly: number;
}

export function calculateDayOfWeekStats(shifts: Shift[]): DayOfWeekStat[] {
  const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const map: Record<number, { count: number; net: number; hours: number }> = {};

  for (let i = 0; i < 7; i++) {
    map[i] = { count: 0, net: 0, hours: 0 };
  }

  shifts.forEach(s => {
    if (!s.date) return;
    const d = new Date(s.date + 'T12:00:00');
    const day = d.getDay();
    map[day].count += 1;
    map[day].net += Number(s.net_profit) || 0;
    map[day].hours += Number(s.duration_hours) || 0;
  });

  return [1, 2, 3, 4, 5, 6, 0].map(dayIndex => {
    const data = map[dayIndex];
    return {
      dayName: dayNames[dayIndex],
      dayIndex,
      shiftsCount: data.count,
      totalNet: data.net,
      avgNet: data.count > 0 ? Math.round(data.net / data.count) : 0,
      avgHourly: data.hours > 0 ? Math.round(data.net / data.hours) : 0,
    };
  });
}

/**
 * Генератор умных советов водителя (Smart AI Insights)
 */
export function generateSmartInsights(shifts: Shift[], dailyGoal: number = 5000): SmartInsight[] {
  const insights: SmartInsight[] = [];
  if (!shifts || shifts.length === 0) {
    return [
      {
        id: 'start_tip',
        type: 'info',
        title: 'Умный советник активирован',
        message: 'Добавь свою первую смену, и система рассчитает точную себестоимость километра, чистый доход в час и подскажет, как сэкономить на расходах.',
      }
    ];
  }

  const stats = calculateStatsSummary(shifts);
  const dayStats = calculateDayOfWeekStats(shifts).filter(d => d.shiftsCount > 0);

  // 1. Анализ самого прибыльного дня
  if (dayStats.length >= 2) {
    const sortedByHourly = [...dayStats].sort((a, b) => b.avgHourly - a.avgHourly);
    const bestDay = sortedByHourly[0];
    const worstDay = sortedByHourly[sortedByHourly.length - 1];

    if (bestDay && worstDay && bestDay.avgHourly > worstDay.avgHourly * 1.15) {
      const diffPercent = Math.round(((bestDay.avgHourly - worstDay.avgHourly) / worstDay.avgHourly) * 100);
      insights.push({
        id: 'best_day',
        type: 'positive',
        title: `Твой лучший день — ${bestDay.dayName}`,
        message: `В этот день твоя чистая ставка составляет ${formatCurrency(bestDay.avgHourly)}/час (на +${diffPercent}% выше, чем в ${worstDay.dayName}). Планируй максимальные часы работы именно на ${bestDay.dayName}!`,
        metric: `+${diffPercent}% к доходу`,
      });
    }
  }

  // 2. Анализ трат на еду и кофе (Скрытые расходы)
  const foodTotal = stats.expense_breakdown.food;
  if (foodTotal > 0 && stats.total_net_profit > 0) {
    const foodShareOfNet = Math.round((foodTotal / stats.total_net_profit) * 100);
    const avgFoodPerShift = Math.round(foodTotal / stats.total_shifts);
    const monthlyProjection = avgFoodPerShift * 22; // 22 смены в месяц

    if (foodShareOfNet >= 10) {
      insights.push({
        id: 'food_alert',
        type: 'warning',
        title: 'Контроль расходов: кофе и перекусы',
        message: `На еду и кофе на заправках уходит ${foodShareOfNet}% твоей чистой прибыли (~${formatCurrency(avgFoodPerShift)} за смену). В месяц это ~${formatCurrency(monthlyProjection)}. Термос с кофе и ланч-бокс из дома сэкономят тебе до ${formatCurrency(Math.round(monthlyProjection * 0.65))}/мес чистыми!`,
        metric: `${foodShareOfNet}% от прибыли`,
      });
    }
  }

  // 3. Расход топлива
  if (stats.avg_fuel_consumption > 0) {
    const fuelShareOfGross = stats.total_gross_revenue > 0 
      ? Math.round((stats.total_fuel_cost / stats.total_gross_revenue) * 100) 
      : 0;

    if (stats.avg_fuel_consumption > 11.5) {
      insights.push({
        id: 'fuel_high',
        type: 'warning',
        title: 'Повышенный расход бензина',
        message: `Средний расход составляет ${stats.avg_fuel_consumption} л/100 км (${fuelShareOfGross}% от всей кассы). Проверь давление в шинах, воздушный фильтр или плавность разгонов в городе — снижение расхода даже на 1.5 л сохранит до 6 000 ₽/мес.`,
        metric: `${stats.avg_fuel_consumption} л/100км`,
      });
    } else {
      insights.push({
        id: 'fuel_good',
        type: 'positive',
        title: 'Экономичный расход топлива',
        message: `Отличный показатель расхода топлива: ${stats.avg_fuel_consumption} л/100 км. Твой стиль вождения экономит тебе приличную сумму на каждой смене.`,
        metric: `${stats.avg_fuel_consumption} л/100км`,
      });
    }
  }

  // 4. Дневная цель и темп работы
  if (stats.avg_hourly_rate > 0) {
    const targetHoursNeeded = Math.round((dailyGoal / stats.avg_hourly_rate) * 10) / 10;
    insights.push({
      id: 'target_pacing',
      type: 'tip',
      title: `План на цель ${formatCurrency(dailyGoal)} чистыми`,
      message: `При твоем среднем чистом доходе ${formatCurrency(stats.avg_hourly_rate)}/час для выполнения цели 5 000 ₽ тебе требуется около ${targetHoursNeeded} ч на линии (с учетом вычета аренды и бензина).`,
      metric: `~${targetHoursNeeded} ч на смену`,
    });
  }

  // 5. Себестоимость километра
  if (stats.avg_cost_per_km > 0) {
    insights.push({
      id: 'cost_km',
      type: 'info',
      title: 'Себестоимость каждого километра',
      message: `Каждый километр пробега обходится тебе в ${formatNumber(stats.avg_cost_per_km, 1)} ₽ (аренда + бензин + мойка). Не бери холостые подачи дальше 3.5 км, чтобы не работать в минус!`,
      metric: `${formatNumber(stats.avg_cost_per_km, 1)} ₽/км`,
    });
  }

  return insights;
}
