import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PawPrint } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { LANGUAGES } from '../config/languages';
import './Auth.css';

export default function Auth() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, register, loading, error, language, setLanguage } = useAppContext();

  const [mode, setMode] = useState('login');
  const [registrationData, setRegistrationData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'citizen'
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(e.target.email.value, e.target.password.value);
      navigate('/app');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await register(registrationData);
      navigate('/app');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="auth-container animate-fade-in">
      <div className="auth-card card">
        <div className="auth-header text-center mb-xl">
          <div className="auth-logo mx-auto mb-md">
            <PawPrint size={32} />
          </div>
          <h1>FaunaNet</h1>
          <p className="text-muted text-sm mt-xs">
            {mode === 'login' ? t('auth.login') : t('auth.signup')}
          </p>
        </div>

        <label className="auth-language">
          <span>{t('settings.language')}</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            {LANGUAGES.map(option => (
              <option key={option.code} value={option.code}>{option.label}</option>
            ))}
          </select>
        </label>

        {error && <div className="error-alert mb-md">{error}</div>}

        <div className="auth-tabs" aria-label="Authentication mode">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            {t('auth.login')}
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => setMode('signup')}
          >
            {t('auth.signup')}
          </button>
        </div>

        {mode === 'login' ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="input-group">
              <label className="input-label" htmlFor="login-email">{t('auth.email')}</label>
              <input id="login-email" name="email" type="email" className="input-field" required placeholder="you@example.com" />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="login-password">{t('auth.password')}</label>
              <input id="login-password" name="password" type="password" className="input-field" required placeholder="Enter your password" />
            </div>
            <button type="submit" className="btn btn-primary w-full mt-md" disabled={loading}>
              {loading ? t('auth.loading') : t('auth.login')}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="input-group">
              <label className="input-label" htmlFor="signup-name">{t('auth.name')}</label>
              <input
                id="signup-name"
                type="text"
                className="input-field"
                required
                placeholder={t('auth.name')}
                value={registrationData.name}
                onChange={(e) => setRegistrationData({ ...registrationData, name: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="signup-email">{t('auth.email')}</label>
              <input
                id="signup-email"
                type="email"
                className="input-field"
                required
                placeholder="you@example.com"
                value={registrationData.email}
                onChange={(e) => setRegistrationData({ ...registrationData, email: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="signup-password">{t('auth.password')}</label>
              <input
                id="signup-password"
                type="password"
                className="input-field"
                required
                minLength={6}
                placeholder="Create a password"
                value={registrationData.password}
                onChange={(e) => setRegistrationData({ ...registrationData, password: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="signup-role">{t('auth.account_type')}</label>
              <select
                id="signup-role"
                className="input-field"
                value={registrationData.role}
                onChange={(e) => setRegistrationData({ ...registrationData, role: e.target.value })}
              >
                <option value="citizen">{t('auth.roles.citizen')}</option>
                <option value="volunteer">{t('auth.roles.volunteer')}</option>
                <option value="ngo">{t('auth.roles.ngo')}</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary w-full mt-md" disabled={loading}>
              {loading ? t('auth.loading') : t('auth.signup')}
            </button>
          </form>
        )}

        <div className="auth-footer mt-xl text-center">
          <button type="button" className="text-btn text-xs" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? t('auth.signup') : t('auth.login')}
          </button>
        </div>
      </div>
    </div>
  );
}
