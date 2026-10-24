import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { useLanguage } from '../../context/LanguageContext.jsx';
import BrandMark from '../../components/layout/BrandMark.jsx';
import ThemeToggle from '../../components/layout/ThemeToggle.jsx';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function Login() {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleButtonRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) return undefined;
    let active = true;
    const renderGoogleButton = () => {
      if (!active || !window.google?.accounts?.id || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          setMessage('');
          try {
            const response = await fetch(`${API_BASE_URL}/auth/google`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.token) throw new Error('Google sign-in failed. Please try again.');
            localStorage.setItem('gramhealth-token', data.token);
            localStorage.setItem('gramhealth-authenticated', 'true');
            localStorage.setItem('gramhealth-name', data.user?.name || '');
            navigate('/dashboard', { replace: true });
          } catch (error) {
            setMessage(error instanceof TypeError
              ? 'Could not reach the backend. Make sure it is running at localhost:5000.'
              : 'Google sign-in failed. Please try again.');
          }
        },
      });
      googleButtonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular',
        width: Math.min(360, googleButtonRef.current.parentElement?.clientWidth || 360),
        locale: document.documentElement.lang || 'en',
      });
    };

    let script = document.querySelector('script[data-google-identity]');
    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentity = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', renderGoogleButton);
      if (script.dataset.loaded === 'true') renderGoogleButton();
      script.addEventListener('load', () => { script.dataset.loaded = 'true'; }, { once: true });
    }
    return () => { active = false; };
  }, [navigate, t]);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password'),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error('Login failed. Please try again.');
      }
      if (!data.token) {
        throw new Error('The server response did not include an authentication token.');
      }

      localStorage.setItem('gramhealth-token', data.token);
      localStorage.setItem('gramhealth-authenticated', 'true');
      localStorage.setItem('gramhealth-name', data.user?.name || '');
      setMessage('Login successful. Opening your dashboard…');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setMessage(
        error instanceof TypeError
          ? 'Could not reach the backend. Make sure it is running at localhost:5000.'
          : 'Login failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="theme-page-header">
        <a className="login-brand" href="/" aria-label={t('Home')}>
          <span className="login-brand-icon"><BrandMark size={20} /></span>
          <span>GramHealthCareAI</span>
        </a>
        <ThemeToggle />
      </div>

      <section className="login-card" aria-labelledby="login-title">
        <p className="login-eyebrow">{t('WELCOME BACK')}</p>
        <h1 id="login-title">{t('Log in to your account')}</h1>
        <p className="login-subtitle">{t('Access your health tools and saved information.')}</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email">{t('Email address')}</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />

          <div className="login-password-heading">
            <label htmlFor="login-password">{t('Password')}</label>
          </div>
          <div className="login-password-wrap">
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={t('Enter your password')}
              required
            />
            <button
              className="login-show-password"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? t('Hide password') : t('Show password')}
            >
              {showPassword ? t('Hide') : t('Show')}
            </button>
          </div>

          <label className="login-remember">
            <input type="checkbox" name="remember" />
            <span>{t('Remember me')}</span>
          </label>

          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('Logging in…') : t('Log in')}
          </button>

          {message && <p className="login-message" role="status">{t(message)}</p>}
        </form>

        <p className="login-register">
          {t('Don’t have an account?')} <a href="/register">{t('Create one')}</a>
        </p>
        <div className="login-google-section">
          <div className="login-divider"><span>{t('or')}</span></div>
          {GOOGLE_CLIENT_ID
            ? <div ref={googleButtonRef} className="login-google-button" />
            : <p className="login-google-config-note">{t('Google sign-in is not configured yet.')}</p>}
        </div>
        <p className="login-note">{t('For emergencies, contact your local emergency services.')}</p>
      </section>
    </main>
  );
}

export default Login;
