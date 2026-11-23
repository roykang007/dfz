import { signInWithPopup } from 'firebase/auth';
import { X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import {
  fetchCurrentUser,
  loginMember,
  registerMember,
  type AuthenticatedUserProfile,
} from '../api/client';
import { t, UI_TEXT } from '../i18n/translations';
import { auth, googleAuthProvider } from '../lib/firebase';
import type { Language } from '../types';
import { DufreezLogoMark } from './BrandMark';

interface MemberAuthModalProps {
  open: boolean;
  lang: Language;
  initialMode?: 'login' | 'signup';
  onClose: () => void;
  onAuthenticated: (token: string, profile: AuthenticatedUserProfile) => void;
}

export function MemberAuthModal({
  open,
  lang,
  initialMode = 'login',
  onClose,
  onAuthenticated,
}: MemberAuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError('');
    }
  }, [open, initialMode]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const res = await registerMember({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          preferredLang: lang,
        });
        onAuthenticated(res.token, res.user);
        onClose();
      } else {
        const res = await loginMember({
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
        });
        onAuthenticated(res.token, res.user);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청을 처리할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const credential = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await credential.user.getIdToken();
      const profile = await fetchCurrentUser(idToken);
      onAuthenticated(idToken, profile);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google 로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D1B2A]/45 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white border border-[#E2E8F0] shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#0D1B2A]">
            <DufreezLogoMark className="w-5 h-5 text-[#1E4E79]" />
            <span className="font-display text-xl font-semibold tracking-tight">DUFREEZ</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 flex items-center justify-center text-[#4A607A] hover:bg-[#F2F5F8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="grid grid-cols-2 border-b border-[#E2E8F0] bg-[#FAFBFD]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`py-3 text-xs font-semibold transition-colors ${
              mode === 'login'
                ? 'bg-white text-[#0D1B2A] border-b-2 border-[#1E4E79]'
                : 'text-[#4A607A] hover:text-[#0D1B2A]'
            }`}
          >
            {t(UI_TEXT.memberAuth.loginTab, lang)}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
            }}
            className={`py-3 text-xs font-semibold transition-colors ${
              mode === 'signup'
                ? 'bg-white text-[#0D1B2A] border-b-2 border-[#1E4E79]'
                : 'text-[#4A607A] hover:text-[#0D1B2A]'
            }`}
          >
            {t(UI_TEXT.memberAuth.signupTab, lang)}
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h2 className="font-display text-2xl font-medium text-[#0D1B2A]">
              {mode === 'signup'
                ? t(UI_TEXT.memberAuth.signupTitle, lang)
                : t(UI_TEXT.memberAuth.loginTitle, lang)}
            </h2>
            <p className="mt-1.5 text-xs text-[#4A607A] leading-relaxed">
              {mode === 'signup'
                ? t(UI_TEXT.memberAuth.signupDesc, lang)
                : t(UI_TEXT.memberAuth.loginDesc, lang)}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">
                  {t(UI_TEXT.memberAuth.nameLabel, lang)}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동 / Chloe Chan"
                  className="w-full h-10 px-3 text-sm border border-[#CBD5E1] focus:border-[#1E4E79] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-[#4A607A] mb-1">
                {t(UI_TEXT.memberAuth.emailLabel, lang)}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] focus:border-[#1E4E79] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#4A607A] mb-1">
                {t(UI_TEXT.memberAuth.phoneLabel, lang)}
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-1234-5678 / +852 9123 4567"
                className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] focus:border-[#1E4E79] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#1E4E79] hover:bg-[#163B5C] disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              {loading
                ? t(UI_TEXT.memberAuth.submitting, lang)
                : mode === 'signup'
                  ? t(UI_TEXT.memberAuth.signupSubmit, lang)
                  : t(UI_TEXT.memberAuth.loginSubmit, lang)}
            </button>
          </form>

          {mode === 'login' && (
            <>
              <div className="relative flex items-center py-1">
                <div className="flex-1 border-t border-[#E2E8F0]" />
                <span className="px-3 text-[11px] text-[#7B8FA6]">
                  {t(UI_TEXT.memberAuth.orDivider, lang)}
                </span>
                <div className="flex-1 border-t border-[#E2E8F0]" />
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() => void handleGoogleSignIn()}
                className="w-full h-10 px-4 border border-[#CBD5E1] hover:border-[#0D1B2A] bg-white text-xs font-medium text-[#0D1B2A] flex items-center justify-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.18v2.98h5.27c-.23 1.48-1.71 4.35-5.27 4.35-3.17 0-5.76-2.63-5.76-5.88s2.59-5.88 5.76-5.88c1.81 0 3.02.77 3.71 1.44l2.53-2.44C16.79 4.15 14.69 3.25 12.17 3.25c-4.97 0-9 4.03-9 9s4.03 9 9 9c5.19 0 8.64-3.65 8.64-8.79 0-.59-.06-1.04-.16-1.36z"
                  />
                </svg>
                <span>{t(UI_TEXT.memberAuth.googleBtn, lang)}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
