'use client';

import React, { useState } from 'react';
import { Phone, Lock, ArrowRight, Car, AlertCircle, Delete } from 'lucide-react';
import { loginOrRegisterDriver, formatPhone, normalizePhone } from '@/lib/storage';
import { DriverProfile } from '@/lib/types';

interface AuthModalProps {
  onSuccess: (driver: DriverProfile) => void;
}

export function AuthModal({ onSuccess }: AuthModalProps) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'pin'>('phone');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatPhone(raw);
    setPhone(formatted);
    setError(null);
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = normalizePhone(phone);
    if (digits.length < 10) {
      setError('Введите номер телефона (не менее 10 цифр)');
      return;
    }
    setError(null);
    setStep('pin');
  };

  const handlePinKey = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);

      if (nextPin.length === 4) {
        submitLogin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError(null);
    }
  };

  const submitLogin = async (pinToSubmit: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await loginOrRegisterDriver(phone, pinToSubmit);
      if (res.success && res.driver) {
        onSuccess(res.driver);
      } else {
        setError(res.message || 'Ошибка входа');
        setPin('');
      }
    } catch {
      setError('Ошибка сети');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xl px-4 py-6 safe-top safe-bottom">
      <div className="w-full max-w-sm rounded-3xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.1] p-6 shadow-2xl flex flex-col items-center text-zinc-900 dark:text-white">
        {/* Logo */}
        <div className="w-12 h-12 rounded-2xl bg-black/[0.04] dark:bg-zinc-850 border border-black/[0.06] dark:border-zinc-700/60 flex items-center justify-center mb-3">
          <Car className="w-6 h-6 text-amber-500 dark:text-amber-400" />
        </div>

        <h1 className="text-base font-bold text-center">ТаксиДрайв</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center mt-0.5 mb-6">
          Личный кабинет водителя
        </p>

        {error && (
          <div className="w-full mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="w-full flex flex-col gap-3.5">
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  inputMode="tel"
                  autoFocus
                  placeholder="+7 (999) 000-00-00"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full min-h-[46px] pl-10 pr-3 py-2.5 bg-black/[0.03] dark:bg-zinc-950 border border-black/[0.08] dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-white font-mono text-sm focus:outline-none focus:border-amber-400 shadow-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={normalizePhone(phone).length < 10}
              className="w-full min-h-[46px] py-3 px-4 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-semibold rounded-2xl flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-sm"
            >
              <span>Продолжить</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-3">
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{phone}</span>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setPin('');
                  setError(null);
                }}
                className="text-xs text-amber-500 dark:text-amber-400 hover:underline"
              >
                Изменить
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 text-xs font-medium mb-3">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>4-значный PIN</span>
            </div>

            {/* PIN Indicator Dots */}
            <div className="flex items-center gap-3.5 mb-5">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all duration-150 ${
                    pin.length > i
                      ? 'bg-amber-400 scale-110 shadow-sm'
                      : 'bg-black/[0.1] dark:bg-zinc-800 border border-black/[0.06] dark:border-zinc-700'
                  }`}
                />
              ))}
            </div>

            {/* Custom NumPad */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-[240px]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                <button
                  key={d}
                  type="button"
                  disabled={loading}
                  onClick={() => handlePinKey(d)}
                  className="min-h-[48px] rounded-2xl bg-black/[0.03] dark:bg-zinc-950 hover:bg-black/[0.08] dark:hover:bg-zinc-800 active:scale-95 text-zinc-900 dark:text-white font-mono text-lg font-medium flex items-center justify-center transition border border-black/[0.06] dark:border-zinc-800"
                >
                  {d}
                </button>
              ))}
              <div />
              <button
                type="button"
                disabled={loading}
                onClick={() => handlePinKey('0')}
                className="min-h-[48px] rounded-2xl bg-black/[0.03] dark:bg-zinc-950 hover:bg-black/[0.08] dark:hover:bg-zinc-800 active:scale-95 text-zinc-900 dark:text-white font-mono text-lg font-medium flex items-center justify-center transition border border-black/[0.06] dark:border-zinc-800"
              >
                0
              </button>
              <button
                type="button"
                disabled={loading || pin.length === 0}
                onClick={handleBackspace}
                className="min-h-[48px] rounded-2xl bg-black/[0.02] dark:bg-zinc-950/60 hover:bg-black/[0.06] dark:hover:bg-zinc-800 active:scale-95 text-zinc-400 hover:text-zinc-700 dark:hover:text-white flex items-center justify-center transition border border-black/[0.04] dark:border-zinc-800/60"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>

            {loading && (
              <p className="text-xs text-amber-500 dark:text-amber-400 mt-3 animate-pulse">
                Вход...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
