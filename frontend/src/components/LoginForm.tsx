import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, KeyRound } from 'lucide-react';
import logoImg from '../images/autologo-removebg-preview.png';

interface LoginFormProps {
  onLoginSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const success = await login(username, password);
      if (success) {
        onLoginSuccess?.();
      } else {
        setError('Invalid username or password');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-app-bg overflow-hidden px-4 font-sans select-none">
      {/* Dynamic Design Glowing Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-orange/15 blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-400/10 blur-[120px] pointer-events-none animate-pulse-slow" />

      <div className="w-full max-w-[440px] relative z-10 animate-fade-in-up">
        {/* Logo / Header */}
        <div className="text-center mb-6">
          <img 
            src={logoImg} 
            alt="Autoform India" 
            className="h-16 mx-auto mb-2 drop-shadow-sm select-none"
            draggable={false}
          />
          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Auto HR</h1>
          <p className="text-slate-500 font-semibold text-xs tracking-wider uppercase mt-1.5 opacity-80">Autoform India HR Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/85 backdrop-blur-xl border border-orange-100 shadow-2xl p-8 rounded-[32px]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 border border-orange-100 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange focus:bg-white transition-all duration-200"
                placeholder="Enter username"
                required
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 border border-orange-100 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange focus:bg-white transition-all duration-200"
                placeholder="Enter password"
                required
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-xs font-semibold animate-shake">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-[#f46617] hover:bg-[#d85512] text-white font-bold text-sm tracking-wide rounded-2xl shadow-lg shadow-orange-500/10 hover:shadow-orange-500/25 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-400 text-[10px] font-semibold tracking-wider uppercase mt-6 opacity-75">
          Secure Login Verification System
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
