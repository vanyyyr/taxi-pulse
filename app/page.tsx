'use client';

import React, { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getCurrentDriver, 
  setCurrentDriver, 
  updateDriverProfile,
  getActiveShift, 
  saveActiveShift, 
  startNewShift, 
  getCompletedShifts, 
  fetchCompletedShifts,
  saveCompletedShift, 
  deleteCompletedShift 
} from '@/lib/storage';
import { DriverProfile, Shift, ExpenseItem } from '@/lib/types';
import { calculateShiftMetrics, formatCurrency } from '@/lib/calculations';
import { X, AlertTriangle } from 'lucide-react';

// Components
import { Header } from '@/components/Header';
import { BottomNav, TabType } from '@/components/BottomNav';
import { AuthModal } from '@/components/AuthModal';
import { GoalProgressBar } from '@/components/GoalProgressBar';
import { ActiveShiftWidget } from '@/components/ActiveShiftWidget';
import { ShiftFormModal } from '@/components/ShiftFormModal';
import { AnalyticsTab } from '@/components/AnalyticsTab';
import { HistoryTab } from '@/components/HistoryTab';
import { ProfileTab } from '@/components/ProfileTab';
import { PWAInstallBanner } from '@/components/PWAInstallBanner';

const emptySubscribe = () => () => {};

function subscribeTheme(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('taxipulse_theme_change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('taxipulse_theme_change', callback);
  };
}

function getThemeSnapshot(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem('taxipulse_theme') as 'dark' | 'light') || 'dark';
}

function getServerThemeSnapshot(): 'dark' | 'light' {
  return 'dark';
}

export default function HomePage() {
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [completedShifts, setCompletedShifts] = useState<Shift[]>([]);
  const [currentTab, setCurrentTab] = useState<TabType>('shift');

  // Modals state
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isActiveEnding, setIsActiveEnding] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, confirmText = 'Подтвердить') => {
    if (typeof window !== 'undefined' && (window.navigator.webdriver || (window as unknown as { __E2E__?: boolean }).__E2E__)) {
      if (window.confirm(message)) {
        onConfirm();
      }
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText,
      onConfirm: () => {
        setConfirmDialog(null);
        onConfirm();
      },
    });
  }, []);

  const refreshShifts = useCallback(async (driverId: string) => {
    const cached = getCompletedShifts(driverId);
    if (cached.length > 0) {
      setCompletedShifts(cached);
    }
    const cloudList = await fetchCompletedShifts(driverId);
    setCompletedShifts(cloudList);
  }, []);

  // Synchronize document theme with theme state
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [theme]);

  // Register Service Worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('[SW] Registration failed:', err);
        });
      };
      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    queueMicrotask(() => {
      const savedDriver = getCurrentDriver();
      if (savedDriver) {
        setDriver(savedDriver);
        const act = getActiveShift(savedDriver.id);
        setActiveShift(act);
        refreshShifts(savedDriver.id);
      }
    });
  }, [refreshShifts]);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('taxipulse_theme', nextTheme);
    window.dispatchEvent(new Event('taxipulse_theme_change'));
  };

  const handleAuthSuccess = (newDriver: DriverProfile) => {
    setDriver(newDriver);
    const act = getActiveShift(newDriver.id);
    setActiveShift(act);
    refreshShifts(newDriver.id);
  };

  const handleLogout = () => {
    showConfirm(
      'Выход из профиля',
      'Выйти из личного кабинета?',
      () => {
        setCurrentDriver(null);
        setDriver(null);
        setActiveShift(null);
        setCompletedShifts([]);
      },
      'Выйти'
    );
  };

  const handleUpdateGoal = async (newGoal: number) => {
    if (!driver) return;
    const updated = await updateDriverProfile({ default_goal: newGoal });
    if (updated) {
      setDriver(updated);
    }
  };

  // --------------------------------------------------------------------------
  // Действия активной смены
  // --------------------------------------------------------------------------

  const handleStartShift = (startOdometer?: number) => {
    if (!driver) return;
    const shift = startNewShift(driver, startOdometer);
    setActiveShift(shift);
  };

  const handleCancelShift = () => {
    if (!driver) return;
    showConfirm(
      'Сброс смены',
      'Сбросить текущую смену?',
      () => {
        saveActiveShift(driver.id, null);
        setActiveShift(null);
      },
      'Сбросить'
    );
  };

  const handleTriggerCompleteShift = () => {
    if (!activeShift) return;
    let elapsedHours = activeShift.duration_hours || 0;
    if (activeShift.created_at) {
      const startMs = new Date(activeShift.created_at).getTime();
      const diffHours = Math.max(0.1, Math.round(((Date.now() - startMs) / (1000 * 60 * 60)) * 10) / 10);
      if (diffHours > 0) elapsedHours = diffHours;
    }
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const shiftToComplete: Shift = {
      ...activeShift,
      end_time: currentTime,
      duration_hours: elapsedHours,
    };
    setEditingShift(shiftToComplete);
    setIsActiveEnding(true);
    setIsShiftModalOpen(true);
  };

  const handleAddExpenseToActive = (expenseData: Omit<ExpenseItem, 'id' | 'created_at'>) => {
    if (!driver || !activeShift) return;

    const newItem: ExpenseItem = {
      ...expenseData,
      id: 'exp_' + Date.now(),
      created_at: new Date().toISOString(),
    };

    const updatedExpenses = [...activeShift.expenses, newItem];

    let elapsedHours = activeShift.duration_hours || 0;
    if (activeShift.created_at) {
      const startMs = new Date(activeShift.created_at).getTime();
      const diffHours = Math.max(0, Math.round(((Date.now() - startMs) / (1000 * 60 * 60)) * 10) / 10);
      if (diffHours > 0) elapsedHours = diffHours;
    }

    const metrics = calculateShiftMetrics({
      date: activeShift.date,
      start_time: activeShift.start_time,
      end_time: activeShift.end_time,
      duration_hours: elapsedHours,
      mileage_km: activeShift.mileage_km,
      gross_revenue: activeShift.gross_revenue,
      fuel_liters: activeShift.fuel_liters,
      fuel_cost: activeShift.fuel_cost,
      rent_cost: activeShift.rent_cost,
      expenses: updatedExpenses,
      fuel_consumption_per_100km: activeShift.fuel_consumption_per_100km,
    });

    const updatedShift: Shift = {
      ...activeShift,
      duration_hours: elapsedHours,
      expenses: updatedExpenses,
      other_expenses_total: metrics.other_expenses_total,
      total_expenses: metrics.total_expenses,
      net_profit: metrics.net_profit,
      hourly_rate: metrics.hourly_rate,
      cost_per_km: metrics.cost_per_km,
      revenue_per_km: metrics.revenue_per_km,
      fuel_consumption_per_100km: metrics.fuel_consumption_per_100km || activeShift.fuel_consumption_per_100km,
    };

    setActiveShift(updatedShift);
    saveActiveShift(driver.id, updatedShift);
  };

  const handleAddFuelToActive = (liters: number, cost: number) => {
    if (!driver || !activeShift) return;

    const newFuelLiters = (Number(activeShift.fuel_liters) || 0) + liters;
    const newFuelCost = (Number(activeShift.fuel_cost) || 0) + cost;

    let elapsedHours = activeShift.duration_hours || 0;
    if (activeShift.created_at) {
      const startMs = new Date(activeShift.created_at).getTime();
      const diffHours = Math.max(0, Math.round(((Date.now() - startMs) / (1000 * 60 * 60)) * 10) / 10);
      if (diffHours > 0) elapsedHours = diffHours;
    }

    const metrics = calculateShiftMetrics({
      date: activeShift.date,
      start_time: activeShift.start_time,
      end_time: activeShift.end_time,
      duration_hours: elapsedHours,
      mileage_km: activeShift.mileage_km,
      gross_revenue: activeShift.gross_revenue,
      fuel_liters: newFuelLiters,
      fuel_cost: newFuelCost,
      rent_cost: activeShift.rent_cost,
      expenses: activeShift.expenses,
      fuel_consumption_per_100km: activeShift.fuel_consumption_per_100km,
    });

    const updatedShift: Shift = {
      ...activeShift,
      duration_hours: elapsedHours,
      fuel_liters: newFuelLiters,
      fuel_cost: newFuelCost,
      total_expenses: metrics.total_expenses,
      net_profit: metrics.net_profit,
      hourly_rate: metrics.hourly_rate,
      cost_per_km: metrics.cost_per_km,
      revenue_per_km: metrics.revenue_per_km,
      fuel_consumption_per_100km: metrics.fuel_consumption_per_100km || activeShift.fuel_consumption_per_100km,
    };

    setActiveShift(updatedShift);
    saveActiveShift(driver.id, updatedShift);
  };

  const handleAddRevenueToActive = (amount: number) => {
    if (!driver || !activeShift) return;

    const newGross = (Number(activeShift.gross_revenue) || 0) + amount;

    let elapsedHours = activeShift.duration_hours || 0;
    if (activeShift.created_at) {
      const startMs = new Date(activeShift.created_at).getTime();
      const diffHours = Math.max(0, Math.round(((Date.now() - startMs) / (1000 * 60 * 60)) * 10) / 10);
      if (diffHours > 0) elapsedHours = diffHours;
    }

    const metrics = calculateShiftMetrics({
      date: activeShift.date,
      start_time: activeShift.start_time,
      end_time: activeShift.end_time,
      duration_hours: elapsedHours,
      mileage_km: activeShift.mileage_km,
      gross_revenue: newGross,
      fuel_liters: activeShift.fuel_liters,
      fuel_cost: activeShift.fuel_cost,
      rent_cost: activeShift.rent_cost,
      expenses: activeShift.expenses,
      fuel_consumption_per_100km: activeShift.fuel_consumption_per_100km,
    });

    const updatedShift: Shift = {
      ...activeShift,
      duration_hours: elapsedHours,
      gross_revenue: newGross,
      total_expenses: metrics.total_expenses,
      net_profit: metrics.net_profit,
      hourly_rate: metrics.hourly_rate,
      cost_per_km: metrics.cost_per_km,
      revenue_per_km: metrics.revenue_per_km,
      fuel_consumption_per_100km: metrics.fuel_consumption_per_100km || activeShift.fuel_consumption_per_100km,
    };

    setActiveShift(updatedShift);
    saveActiveShift(driver.id, updatedShift);
  };

  const handleSaveShift = async (saved: Shift) => {
    if (!driver) return;

    if (activeShift && (isActiveEnding || activeShift.id === saved.id)) {
      saveActiveShift(driver.id, null);
      setActiveShift(null);
      setIsActiveEnding(false);
    }

    const updatedList = await saveCompletedShift(driver.id, saved);
    setCompletedShifts(updatedList);
    setEditingShift(null);
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!driver) return;
    const updated = await deleteCompletedShift(driver.id, shiftId);
    setCompletedShifts(updated);
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setIsActiveEnding(false);
    setIsShiftModalOpen(true);
  };

  const handleOpenManualNewShift = () => {
    setEditingShift(null);
    setIsActiveEnding(false);
    setIsShiftModalOpen(true);
  };

  if (!isClient) {
    return <div className="min-h-screen bg-[#f4f4f7] dark:bg-black" />;
  }

  if (!driver) {
    return <AuthModal onSuccess={handleAuthSuccess} />;
  }

  const latestShift = completedShifts[0] || null;
  const currentGoalProfit = activeShift ? activeShift.net_profit : (latestShift?.net_profit || 0);
  const currentHourly = activeShift ? activeShift.hourly_rate : (latestShift?.hourly_rate || 0);

  return (
    <div className="min-h-screen bg-[#f4f4f7] dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col justify-between selection:bg-amber-400 selection:text-black relative transition-colors duration-300 overflow-x-hidden w-full">
      {/* Liquid Glass Ambient Refraction Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-amber-400/20 dark:bg-amber-500/10 blur-[130px]" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-emerald-400/15 dark:bg-emerald-500/10 blur-[140px]" />
      </div>

      {/* Sleek Header with Theme Toggle */}
      <Header
        driver={driver}
        activeShift={activeShift}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onLogout={handleLogout}
        onOpenProfile={() => setCurrentTab('profile')}
      />

      {/* Main Content with Animated Tab Transitions */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-3 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-3.5">
        <PWAInstallBanner />
        <AnimatePresence mode="wait">
          {/* TAB 1: СМЕНА */}
          {currentTab === 'shift' && (
            <motion.div
              key="shift"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-3.5"
            >
              {/* Hero Earnings & Goal Pacing */}
              <GoalProgressBar
                currentNetProfit={currentGoalProfit}
                targetGoal={driver.default_goal || 5000}
                hourlyRate={currentHourly}
                onUpdateGoal={handleUpdateGoal}
              />

              {/* Shift Controller */}
              <ActiveShiftWidget
                activeShift={activeShift}
                driver={driver}
                onStartShift={handleStartShift}
                onCompleteShift={handleTriggerCompleteShift}
                onCancelShift={handleCancelShift}
                onOpenManualModal={handleOpenManualNewShift}
                onAddExpense={handleAddExpenseToActive}
                onAddFuel={handleAddFuelToActive}
                onAddRevenue={handleAddRevenueToActive}
              />

              {/* Latest Shift Summary Strip (Liquid Glass) */}
              {!activeShift && latestShift && (
                <div className="p-4 rounded-3xl liquid-glass-card shadow-sm flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">Последняя смена</span>
                    <span className="font-mono text-zinc-400 dark:text-zinc-500 text-[11px]">{latestShift.date}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
                    <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06]">
                      <span className="text-[9px] text-zinc-500 font-sans block">Касса</span>
                      <span className="text-zinc-900 dark:text-white font-semibold">{formatCurrency(latestShift.gross_revenue)}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06]">
                      <span className="text-[9px] text-zinc-500 font-sans block">Аренда</span>
                      <span className="text-rose-500 font-semibold">-{formatCurrency(latestShift.rent_cost)}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06]">
                      <span className="text-[9px] text-zinc-500 font-sans block">Бензин</span>
                      <span className="text-rose-500 font-semibold">-{formatCurrency(latestShift.fuel_cost)}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06]">
                      <span className="text-[9px] text-zinc-500 font-sans block">Чистыми</span>
                      <span className="text-emerald-500 dark:text-emerald-400 font-bold">+{formatCurrency(latestShift.net_profit)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 dark:text-zinc-400 pt-0.5">
                    <span>Ставка: <strong className="text-zinc-800 dark:text-zinc-200">{formatCurrency(latestShift.hourly_rate)}/ч</strong></span>
                    <span>Расход: <strong className="text-zinc-800 dark:text-zinc-200">{latestShift.fuel_consumption_per_100km} л</strong></span>
                    <span>Себестоимость: <strong className="text-zinc-800 dark:text-zinc-200">{latestShift.cost_per_km} ₽/км</strong></span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: АНАЛИТИКА */}
          {currentTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <AnalyticsTab shifts={completedShifts} driver={driver} />
            </motion.div>
          )}

          {/* TAB 3: ИСТОРИЯ */}
          {currentTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <HistoryTab
                shifts={completedShifts}
                driver={driver}
                onEditShift={handleEditShift}
                onDeleteShift={handleDeleteShift}
                onAddNewShift={handleOpenManualNewShift}
              />
            </motion.div>
          )}

          {/* TAB 4: ПРОФИЛЬ */}
          {currentTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <ProfileTab
                driver={driver}
                onUpdateDriver={setDriver}
                onLogout={handleLogout}
                onRefreshData={() => refreshShifts(driver.id)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Liquid Glass Bottom Nav with Spring Indicator */}
      <BottomNav
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        hasActiveShift={Boolean(activeShift)}
      />

      {/* Shift Form Modal */}
      <ShiftFormModal
        isOpen={isShiftModalOpen}
        onClose={() => {
          setIsShiftModalOpen(false);
          setEditingShift(null);
          setIsActiveEnding(false);
        }}
        onSave={handleSaveShift}
        driver={driver}
        initialShift={editingShift}
        isActiveShiftEnding={isActiveEnding}
      />

      {/* In-app Liquid Glass Confirmation Modal */}
      <AnimatePresence>
        {confirmDialog && confirmDialog.isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 safe-bottom safe-top safe-left safe-right">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-sm rounded-3xl liquid-glass-elevated p-5 flex flex-col text-zinc-900 dark:text-zinc-100 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-2 text-rose-500">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    {confirmDialog.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  aria-label="Закрыть"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {confirmDialog.message}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 min-h-[44px] rounded-xl liquid-glass-pill text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition cursor-pointer"
                >
                  Отмена
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 min-h-[44px] rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white text-xs font-semibold shadow-sm transition cursor-pointer flex items-center justify-center"
                >
                  {confirmDialog.confirmText}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
