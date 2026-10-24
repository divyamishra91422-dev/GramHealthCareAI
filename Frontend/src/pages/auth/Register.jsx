import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Register.css';
import { useLanguage } from '../../context/LanguageContext.jsx';
import BrandMark from '../../components/layout/BrandMark.jsx';
import ThemeToggle from '../../components/layout/ThemeToggle.jsx';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function Register() {
  const { t } = useLanguage();
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
          setIsSubmitting(true);
          try {
            const response = await fetch(`${API_BASE_URL}/auth/google`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.token) {
              throw new Error('Google sign-in failed. Please try again.');
            }
            localStorage.setItem('gramhealth-token', data.token);
            localStorage.setItem('gramhealth-authenticated', 'true');
            localStorage.setItem('gramhealth-name', data.user?.name || '');
            navigate('/dashboard', { replace: true });
          } catch (error) {
            setMessage(error instanceof TypeError
              ? 'Could not reach the backend. Make sure it is running at localhost:5000.'
              : 'Google sign-in failed. Please try again.');
          } finally {
            setIsSubmitting(false);
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

    const formData = new FormData(event.currentTarget);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (password !== confirmPassword) {
      setMessage('The passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          password,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error('Could not create the account.');
      }
      if (!data.token) {
        throw new Error('The server response did not include an authentication token.');
      }

      localStorage.setItem('gramhealth-token', data.token);
      localStorage.setItem('gramhealth-authenticated', 'true');
      localStorage.setItem('gramhealth-name', data.user?.name || '');
      setMessage('Account created. Opening your dashboard…');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setMessage(
        error instanceof TypeError
          ? 'Could not reach the backend. Make sure it is running at localhost:5000.'
          : 'Could not create the account.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="register-page">
      <div className="theme-page-header">
        <a className="register-brand" href="/" aria-label={t('Home')}>
          <span className="register-brand-icon"><BrandMark size={20} /></span>
          <span>GramHealthCareAI</span>
        </a>
        <ThemeToggle />
      </div>

      <section className="register-card" aria-labelledby="register-title">
        <p className="register-eyebrow">{t('JOIN GRAMHEALTHCAREAI')}</p>
        <h1 id="register-title">{t('Create your account')}</h1>
        <p className="register-subtitle">{t('Sign up to access your health tools and resources.')}</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="register-name">{t('Full name')}</label>
          <input
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder={t('Your full name')}
            required
          />

          <label htmlFor="register-email">{t('Email address')}</label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />

          <label htmlFor="register-password">{t('Password')}</label>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder={t('At least 8 characters')}
            minLength={8}
            required
          />

          <label htmlFor="register-confirm-password">{t('Confirm password')}</label>
          <input
            id="register-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder={t('Enter your password again')}
            minLength={8}
            required
          />

          <label className="register-terms">
            <input type="checkbox" name="terms" required />
            <span>{t('I agree to the terms and privacy policy.')}</span>
          </label>

          <button className="register-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('Creating account…') : t('Create account')}
          </button>

          {message && <p className="register-message" role="status">{t(message)}</p>}
        </form>

        <div className="register-google-section">
          <div className="register-google-divider"><span>{t('or')}</span></div>
          {GOOGLE_CLIENT_ID
            ? <div ref={googleButtonRef} className="register-google-button" />
            : <p className="register-google-note">{t('Google sign-in is not configured yet.')}</p>}
        </div>

        <p className="register-login">
          {t('Already have an account?')} <a href="/login">{t('Log in')}</a>
        </p>
        <p className="register-note">{t('For emergencies, contact your local emergency services.')}</p>
      </section>
    </main>
  );
}

export default Register;
