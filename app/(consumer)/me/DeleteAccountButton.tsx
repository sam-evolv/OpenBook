'use client';

import { useState } from 'react';
import { Loader2, Trash2, X } from 'lucide-react';

export function DeleteAccountButton({ hasCustomer }: { hasCustomer: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? 'Could not delete account.');
      }
      window.location.href = '/home';
    } catch (err: any) {
      setError(err?.message ?? 'Could not delete account.');
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="
          flex w-full items-center gap-3 px-4 py-3.5 rounded-2xl
          bg-red-500/[0.06] border border-red-500/20
          hover:border-red-400/35 active:scale-[0.99] transition
        "
      >
        <Trash2 className="w-[18px] h-[18px] text-red-300" strokeWidth={2} />
        <span className="flex-1 text-left text-[14px] font-semibold text-red-200">
          Delete account data
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 px-4 pb-safe backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-[28px] border border-white/[0.08] bg-[#111114] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.65)] animate-reveal-up">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-300">
                <Trash2 className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[18px] font-semibold tracking-tight text-white">
                  Delete account?
                </h2>
                <p className="mt-1 text-[13px] leading-snug text-white/55">
                  {hasCustomer
                    ? 'This removes your OpenBook customer profile from this device and deletes your signed-in account if one is active.'
                    : 'This clears any account session or guest booking profile linked to this device.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-white/50 active:scale-95"
                aria-label="Close delete account dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-100">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={deleteAccount}
                disabled={loading}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-red-400 text-[14px] font-semibold text-black active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete my account'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="h-11 rounded-full text-[14px] font-medium text-white/60 active:scale-[0.98] disabled:opacity-40"
              >
                Keep account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
