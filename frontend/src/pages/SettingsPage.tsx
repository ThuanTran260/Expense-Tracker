import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Moon, Sun, Globe, DollarSign, Bell, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';

export default function SettingsPage() {
  const { user, updateSettings } = useAuth();
  const { t, language: activeLang } = useTranslation();
  const settings = user?.settings;

  const [form, setForm] = useState({
    theme: settings?.theme ?? 'LIGHT',
    currency: settings?.currency ?? 'VND',
    language: settings?.language ?? 'vi',
    alertThreshold: (settings?.alertThreshold ?? 0.8) * 100, // hiển thị dưới dạng %
  });

  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () => updateSettings({
      ...form,
      alertThreshold: form.alertThreshold / 100,
    }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{t('settings.title')}</h1>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          {t('settings.subtitle')}
        </p>
      </div>

      <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Giao diện */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sun size={18} color="var(--color-primary)" /> {t('settings.themeTitle')}
            </h3>
            <div className="flex gap-3">
              {(['LIGHT', 'DARK'] as const).map((tVal) => (
                <button key={tVal} type="button"
                  className={`btn ${form.theme === tVal ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1 }}
                  onClick={() => setForm(p => ({ ...p, theme: tVal }))}
                  id={`theme-${tVal.toLowerCase()}`}>
                  {tVal === 'LIGHT' ? <><Sun size={16} /> {t('settings.themeLight')}</> : <><Moon size={16} /> {t('settings.themeDark')}</>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tiền tệ */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DollarSign size={18} color="var(--color-primary)" /> {t('settings.currencyTitle')}
            </h3>
            <div className="flex gap-3">
              {(['VND', 'USD'] as const).map((c) => (
                <button key={c} type="button"
                  className={`btn ${form.currency === c ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1 }}
                  onClick={() => setForm(p => ({ ...p, currency: c }))}
                  id={`currency-${c.toLowerCase()}`}>
                  {c === 'VND' ? '🇻🇳 VND (₫)' : '🇺🇸 USD ($)'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ngôn ngữ */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={18} color="var(--color-primary)" /> {t('settings.languageTitle')}
            </h3>
            <div className="flex gap-3">
              {(['vi', 'en'] as const).map((l) => (
                <button key={l} type="button"
                  className={`btn ${form.language === l ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1 }}
                  onClick={() => setForm(p => ({ ...p, language: l }))}
                  id={`language-${l}`}>
                  {l === 'vi' ? t('settings.languageVi') : t('settings.languageEn')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ngưỡng cảnh báo */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={18} color="var(--color-primary)" /> {t('settings.alertThresholdTitle')}
            </h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              {t('settings.alertThresholdDesc')} <strong>{form.alertThreshold}%</strong>)
            </p>
            <input
              type="range" min="50" max="100" step="5"
              value={form.alertThreshold}
              onChange={(e) => setForm(p => ({ ...p, alertThreshold: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: 'var(--color-primary)' }}
              id="alert-threshold"
            />
            <div className="flex justify-between" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              <span>50%</span><span>75%</span><span>100%</span>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>{t('settings.accountInfoTitle')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">{t('settings.fullName')}</label>
                <input className="form-input" value={user?.name ?? ''} disabled
                  style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('settings.email')}</label>
                <input className="form-input" value={user?.email ?? ''} disabled
                  style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }} />
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {t('settings.joinedDate')} {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(activeLang === 'en' ? 'en-US' : 'vi-VN') : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Save */}
        <button
          className={`btn ${saved ? '' : 'btn-primary'} btn-lg`}
          style={saved ? { background: 'var(--color-success)', color: 'white' } : {}}
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          id="save-settings-btn"
        >
          <Save size={18} />
          {mutation.isPending ? t('settings.saving') : saved ? t('settings.saved') : t('settings.saveSettings')}
        </button>
      </div>
    </div>
  );
}
