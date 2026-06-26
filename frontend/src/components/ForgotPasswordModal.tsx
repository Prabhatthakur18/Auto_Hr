import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, KeyRound, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { authApi } from '../services/api';

interface ForgotPasswordModalProps {
  onClose: () => void;
}

type Step = 'REQUEST' | 'RESET' | 'DONE';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onClose }) => {
  const [step, setStep] = useState<Step>('REQUEST');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await authApi.forgotPassword(username.trim());
      setInfo(res.message || 'If that account has a registered email, an OTP has been sent to it.');
      setStep('RESET');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.resetPassword({ username: username.trim(), otp: otp.trim(), newPassword });
      setStep('DONE');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { if (!submitting) onClose(); }} />

      <div className="relative bg-white rounded-[32px] border border-orange-100/50 shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-orange-100/50">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#f46617]" />
            {step === 'DONE' ? 'Password Reset' : 'Forgot Password'}
          </h3>
          <button
            disabled={submitting}
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-orange-50 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {step === 'REQUEST' && (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <p className="text-sm text-slate-500 leading-relaxed">
                Enter your username. If your account has a registered email, we'll send a 6-digit code to it.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  autoFocus
                  disabled={submitting}
                  className="w-full px-4 py-3 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-orange px-4 py-3 text-sm font-bold rounded-2xl flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {submitting ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
          )}

          {step === 'RESET' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {info && (
                <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  {info}
                </div>
              )}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">6-Digit Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                  autoFocus
                  disabled={submitting}
                  className="w-full px-4 py-3 bg-white border border-orange-100 rounded-2xl text-slate-800 text-center text-lg font-bold tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  disabled={submitting}
                  className="w-full px-4 py-3 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  disabled={submitting}
                  className="w-full px-4 py-3 bg-white border border-orange-100 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-orange px-4 py-3 text-sm font-bold rounded-2xl flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                {submitting ? 'Resetting...' : 'Reset Password'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('REQUEST'); setError(''); setOtp(''); }}
                disabled={submitting}
                className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Didn't get a code? Try a different username
              </button>
            </form>
          )}

          {step === 'DONE' && (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
              <button
                onClick={onClose}
                className="w-full btn-orange px-4 py-3 text-sm font-bold rounded-2xl"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
