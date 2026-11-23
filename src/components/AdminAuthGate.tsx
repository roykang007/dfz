import { signInWithPopup, signOut } from 'firebase/auth';
import { ArrowLeft, Shield } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  fetchCurrentUser,
  loginMember,
  type AuthenticatedUserProfile,
} from '../api/client';
import { t, UI_TEXT } from '../i18n/translations';
import { auth, googleAuthProvider } from '../lib/firebase';
import type { Language } from '../types';
import { DufreezLogoMark } from './BrandMark';

interface AdminAuthGateProps {
  lang: Language;
  checkingSession: boolean;
  nonAdminProfile: AuthenticatedUserProfile | null;
  onAuthenticated: (token: string, profile: AuthenticatedUserProfile) => void;
  onReturnStorefront: () => void;
  onSwitchAccount: () => void;
}

export function AdminAuthGate({
  lang,
  checkingSession,
  nonAdminProfile,
  onAuthenticated,
  onReturnStorefront,
  onSwitchAccount,
}: AdminAuthGateProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMemberAdminLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginMember({
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
      });
      if (res.user.role !== 'ADMIN') {
        setError(t(UI_TEXT.admin.auth.forbidden, lang));
        return;
      }
      onAuthenticated(res.token, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
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
      if (profile.role !== 'ADMIN') {
        setError(t(UI_TEXT.admin.auth.forbidden, lang));
        return;
      }
      onAuthenticated(idToken, profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async () => {
    setError('');
    await signOut(auth).catch(() => undefined);
    onSwitchAccount();
  };

  return (
    <div className="min-h-screen bg-[#FAFBFD] flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5 text-[#0D1B2A]">
            <DufreezLogoMark className="w-6 h-6 text-[#1E4E79]" />
            <span className="font-display text-xl font-semibold tracking-tight">DUFREEZ</span>
          </div>
          <button
            type="button"
            onClick={onReturnStorefront}
            className="inline-flex items-center gap-1.5 text-xs text-[#4A607A] hover:text-[#0D1B2A] transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t(UI_TEXT.admin.returnStorefront, lang)}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[#1E4E79] mb-2">
          <Shield className="w-4 h-4" />
          <span className="text-xs font-medium">{t(UI_TEXT.admin.brandTitle, lang)}</span>
        </div>

        {checkingSession ? (
          <div className="py-8 space-y-3 animate-pulse">
            <div className="h-6 bg-[#E2E8F0] w-2/3" />
            <div className="h-4 bg-[#F2F5F8] w-full" />
            <div className="h-11 bg-[#F2F5F8] w-full mt-4" />
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-medium text-[#0D1B2A]">
              {t(UI_TEXT.admin.auth.loginTitle, lang)}
            </h1>
            <p className="mt-2 text-xs text-[#4A607A] leading-relaxed">
              {t(UI_TEXT.admin.auth.loginDesc, lang)}
            </p>

            {(error || nonAdminProfile) && (
              <div className="mt-4 p-3.5 bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C] space-y-2">
                <p>{error || t(UI_TEXT.admin.auth.forbidden, lang)}</p>
                {nonAdminProfile && (
                  <p className="font-mono text-[11px] text-[#7F1D1D]">
                    {nonAdminProfile.email}
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleMemberAdminLogin} className="mt-5 space-y-3">
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">
                  {t(UI_TEXT.memberAuth.emailLabel, lang)}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@dufreez.com"
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
                className="w-full h-11 px-5 bg-[#1E4E79] hover:bg-[#163B5C] disabled:opacity-60 text-white text-sm font-medium transition-colors"
              >
                {loading
                  ? t(UI_TEXT.memberAuth.submitting, lang)
                  : t(UI_TEXT.memberAuth.loginSubmit, lang)}
              </button>
            </form>

            <div className="relative flex items-center my-4">
              <div className="flex-1 border-t border-[#E2E8F0]" />
              <span className="px-3 text-[11px] text-[#7B8FA6]">
                {t(UI_TEXT.memberAuth.orDivider, lang)}
              </span>
              <div className="flex-1 border-t border-[#E2E8F0]" />
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleGoogleSignIn()}
                className="w-full h-10 px-5 border border-[#CBD5E1] hover:border-[#0D1B2A] bg-white text-[#0D1B2A] text-xs font-medium transition-colors flex items-center justify-center gap-2.5 whitespace-nowrap"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.18v2.98h5.27c-.23 1.48-1.71 4.35-5.27 4.35-3.17 0-5.76-2.63-5.76-5.88s2.59-5.88 5.76-5.88c1.81 0 3.02.77 3.71 1.44l2.53-2.44C16.79 4.15 14.69 3.25 12.17 3.25c-4.97 0-9 4.03-9 9s4.03 9 9 9c5.19 0 8.64-3.65 8.64-8.79 0-.59-.06-1.04-.16-1.36z"
                  />
                </svg>
                <span>
                  {loading
                    ? t(UI_TEXT.admin.auth.signingIn, lang)
                    : t(UI_TEXT.admin.auth.googleSignInBtn, lang)}
                </span>
              </button>

              {nonAdminProfile && (
                <button
                  type="button"
                  onClick={() => void handleSwitch()}
                  className="w-full h-10 border border-[#CBD5E1] text-xs font-medium text-[#4A607A] hover:bg-[#F2F5F8] transition-colors"
                >
                  {t(UI_TEXT.admin.auth.switchAccount, lang)}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
