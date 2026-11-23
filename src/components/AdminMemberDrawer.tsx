import { X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { UpsertMemberPayload } from '../api/client';
import { HK_DISTRICTS, MEMBER_TIER_LABELS, t, UI_TEXT } from '../i18n/translations';
import type { Language, Member, MemberRole, MemberTier } from '../types';

interface AdminMemberDrawerProps {
  open: boolean;
  lang: Language;
  editingMember: Member | null;
  onClose: () => void;
  onSubmit: (payload: UpsertMemberPayload, editingId?: string) => Promise<void>;
}

export function AdminMemberDrawer({
  open,
  lang,
  editingMember,
  onClose,
  onSubmit,
}: AdminMemberDrawerProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+852 ');
  const [district, setDistrict] = useState(HK_DISTRICTS[0].id);
  const [tier, setTier] = useState<MemberTier>('SILVER');
  const [role, setRole] = useState<MemberRole>('MEMBER');
  const [preferredLang, setPreferredLang] = useState<Language>('zh');
  const [status, setStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editingMember) {
      setName(editingMember.name);
      setEmail(editingMember.email);
      setPhone(editingMember.phone);
      setDistrict(editingMember.district);
      setTier(editingMember.tier);
      setRole(editingMember.role);
      setPreferredLang(editingMember.preferredLang);
      setStatus(editingMember.status);
    } else {
      setName('');
      setEmail('');
      setPhone('+852 ');
      setDistrict(HK_DISTRICTS[0].id);
      setTier('SILVER');
      setRole('MEMBER');
      setPreferredLang('zh');
      setStatus('ACTIVE');
    }
  }, [open, editingMember]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit(
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          district,
          tier,
          role,
          preferredLang,
          status,
        },
        editingMember?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save member.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#0D1B2A]/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white h-full flex flex-col border-l border-[#E2E8F0] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-medium text-[#0D1B2A]">
            {editingMember
              ? t(UI_TEXT.admin.members.editMember, lang)
              : t(UI_TEXT.admin.members.addMember, lang)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="w-9 h-9 flex items-center justify-center text-[#4A607A] hover:bg-[#F2F5F8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {error && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C]">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs text-[#4A607A] mb-1">
                {t(UI_TEXT.admin.members.nameLabel, lang)}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Chloe Chan (陳嘉敏)"
                className="w-full h-10 px-3 text-sm border border-[#CBD5E1] focus:border-[#1E4E79] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#4A607A] mb-1">
                {t(UI_TEXT.admin.members.emailLabel, lang)}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="member@dufreez.com"
                className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] focus:border-[#1E4E79] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#4A607A] mb-1">
                {t(UI_TEXT.admin.members.phoneLabel, lang)}
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+852 9123 4567"
                className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] focus:border-[#1E4E79] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#4A607A] mb-1">
                {t(UI_TEXT.admin.members.districtLabel, lang)}
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-[#CBD5E1] bg-white focus:border-[#1E4E79] focus:outline-none"
              >
                {HK_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {t(d.region, lang)} — {t(d.label, lang)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E2E8F0]">
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">
                  {t(UI_TEXT.admin.members.tier, lang)}
                </label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as MemberTier)}
                  className="w-full h-10 px-2.5 text-sm border border-[#CBD5E1] bg-white"
                >
                  {(['SILVER', 'GLACIER_GOLD', 'CRYO_VIP'] as MemberTier[]).map((tierVal) => (
                    <option key={tierVal} value={tierVal}>
                      {t(MEMBER_TIER_LABELS[tierVal], lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#4A607A] mb-1">
                  {t(UI_TEXT.admin.members.langLabel, lang)}
                </label>
                <select
                  value={preferredLang}
                  onChange={(e) => setPreferredLang(e.target.value as Language)}
                  className="w-full h-10 px-2.5 text-sm border border-[#CBD5E1] bg-white"
                >
                  <option value="zh">繁體中文 (ZH-HK)</option>
                  <option value="en">English (EN)</option>
                  <option value="ko">한국어 (KO)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">
                  {t(UI_TEXT.admin.members.role, lang)}
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as MemberRole)}
                  className="w-full h-10 px-2.5 text-sm border border-[#CBD5E1] bg-white"
                >
                  <option value="MEMBER">{t(UI_TEXT.admin.members.roleMember, lang)}</option>
                  <option value="ADMIN">{t(UI_TEXT.admin.members.roleAdmin, lang)}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">
                  {t(UI_TEXT.admin.members.status, lang)}
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'SUSPENDED')}
                  className="w-full h-10 px-2.5 text-sm border border-[#CBD5E1] bg-white"
                >
                  <option value="ACTIVE">{t(UI_TEXT.admin.members.active, lang)}</option>
                  <option value="SUSPENDED">{t(UI_TEXT.admin.members.suspended, lang)}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#FAFBFD] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 border border-[#CBD5E1] text-xs font-medium text-[#0D1B2A] hover:bg-[#F2F5F8]"
            >
              {t(UI_TEXT.admin.products.cancel, lang)}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-5 bg-[#1E4E79] hover:bg-[#163B5C] disabled:opacity-60 text-white text-xs font-medium transition-colors"
            >
              {t(UI_TEXT.admin.members.saveMember, lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
