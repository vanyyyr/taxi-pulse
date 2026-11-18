import { calculateShiftMetrics, calculateDurationHours, calculateGoalProgress } from './calculations';

function runTests() {
  console.log('--- Running calculations tests ---');

  // Test 1: Duration calculation HH:mm
  const dur1 = calculateDurationHours('08:00', '20:00');
  console.assert(dur1 === 12, `Expected 12, got ${dur1}`);

  // Test 2: Duration over midnight
  const dur2 = calculateDurationHours('22:00', '06:00');
  console.assert(dur2 === 8, `Expected 8, got ${dur2}`);

  // Test 3: Standard shift metrics
  // Gross: 9000
  // Rent: 2200
  // Fuel: 30L @ 1650 RUB
  // Mileage: 200 km
  // Food: 450, Coffee: 150 -> other expenses 600
  // Total expenses: 2200 + 1650 + 600 = 4450
  // Net profit: 9000 - 4450 = 4550
  // Hours: 10
  // Hourly rate: 4550 / 10 = 455
  // Cost per km: 4450 / 200 = 22.3
  // Revenue per km: 9000 / 200 = 45.0
  // Fuel consumption: (30 / 200) * 100 = 15.0 L/100km
  const res = calculateShiftMetrics({
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
  });

  console.assert(res.other_expenses_total === 600, `Expected 600, got ${res.other_expenses_total}`);
  console.assert(res.total_expenses === 4450, `Expected 4450, got ${res.total_expenses}`);
  console.assert(res.net_profit === 4550, `Expected 4550, got ${res.net_profit}`);
  console.assert(res.hourly_rate === 455, `Expected 455, got ${res.hourly_rate}`);
  console.assert(res.cost_per_km === 22.3, `Expected 22.3, got ${res.cost_per_km}`);
  console.assert(res.revenue_per_km === 45.0, `Expected 45.0, got ${res.revenue_per_km}`);
  console.assert(res.fuel_consumption_per_100km === 15.0, `Expected 15.0, got ${res.fuel_consumption_per_100km}`);

  // Test 4: Goal progress
  const goal1 = calculateGoalProgress(4550, 5000);
  console.assert(goal1.percentage === 91, `Expected 91, got ${goal1.percentage}`);
  console.assert(goal1.remaining === 450, `Expected 450, got ${goal1.remaining}`);
  console.assert(goal1.isAchieved === false, 'Expected isAchieved false');

  const goal2 = calculateGoalProgress(5200, 5000);
  console.assert(goal2.percentage === 100, `Expected 100, got ${goal2.percentage}`);
  console.assert(goal2.remaining === 0, `Expected 0, got ${goal2.remaining}`);
  console.assert(goal2.isAchieved === true, 'Expected isAchieved true');

  console.log('✓ All 4 calculation tests passed successfully!');
}

runTests();
