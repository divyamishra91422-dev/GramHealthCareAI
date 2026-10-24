import { useEffect, useState } from 'react';
import './Language.css';
import { useLanguage } from '../../context/LanguageContext.jsx';
import BrandMark from '../../components/layout/BrandMark.jsx';
import ThemeToggle from '../../components/layout/ThemeToggle.jsx';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/language`;

const languages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🌐' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
];

function Language() {
  const { t, setLanguage } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState(
    () => localStorage.getItem('gramhealth-language') || 'en'
  );
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('gramhealth-token');
    if (!token) return undefined;

    let active = true;
    fetch(API_URL, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error('Unable to load your language preference.');
        return data;
      })
      .then((data) => {
        if (active && data.language) {
          setSelectedLanguage(data.language);
          setLanguage(data.language);
        }
      })
      .catch(() => { if (active) setMessage('Unable to load your language preference.'); });

    return () => { active = false; };
  }, [setLanguage]);

  async function handleSubmit(event) {
    event.preventDefault();
    const token = localStorage.getItem('gramhealth-token');
    setSaving(true);

    try {
      if (token) {
        const response = await fetch(API_URL, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ language: selectedLanguage }),
        });
        await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(t('Unable to save your language preference.'));
        setMessage('Language preference saved to your account.');
      } else {
        setMessage('Language preference saved in this browser.');
      }
      setLanguage(selectedLanguage);
    } catch (error) {
      console.error('Save language preference error:', error.message);
      setMessage('Unable to save your language preference. Your previous browser preference was kept.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="language-page">
      <div className="theme-page-header">
        <a className="language-brand" href="/" aria-label={t('Go to home page')}>
          <span className="language-brand-icon"><BrandMark size={20} /></span>
          <span>GramHealthCareAI</span>
        </a>
        <ThemeToggle />
      </div>

      <section className="language-card" aria-labelledby="language-title">
        <p className="language-eyebrow">{t('PERSONALIZE YOUR EXPERIENCE')}</p>
        <h1 id="language-title">{t('Choose your language')}</h1>
        <p className="language-subtitle">
          {t('Select the language you prefer to use in GramHealthCareAI.')}
        </p>

        <form onSubmit={handleSubmit}>
          <fieldset className="language-options">
            <legend className="sr-only">{t('Available languages')}</legend>

            {languages.map((language) => (
              <label
                className={`language-option ${
                  selectedLanguage === language.code ? 'selected' : ''
                }`}
                key={language.code}
              >
                <input
                  type="radio"
                  name="language"
                  value={language.code}
                  checked={selectedLanguage === language.code}
                  onChange={() => {
                    setSelectedLanguage(language.code);
                    setMessage('');
                  }}
                />
                <span className="language-flag" aria-hidden="true">
                  {language.flag}
                </span>
                <span className="language-names">
                  <strong>{language.name}</strong>
                  <span>{language.nativeName}</span>
                </span>
                <span className="language-check" aria-hidden="true">
                  {selectedLanguage === language.code ? '✓' : ''}
                </span>
              </label>
            ))}
          </fieldset>

          <button className="language-save" type="submit" disabled={saving}>
            {saving ? t('Saving…') : t('Save language')}
          </button>

          {message && (
            <p className="language-message" role="status">
              {t(message)}
            </p>
          )}
        </form>

        <p className="language-note">
          {t('Your choice is saved to your account when you are logged in, or to this browser otherwise. Available interface text changes to the selected language.')}
        </p>
      </section>
    </main>
  );
}

export default Language;
