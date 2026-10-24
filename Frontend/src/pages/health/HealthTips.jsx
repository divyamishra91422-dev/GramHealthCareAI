import { useEffect, useState } from 'react';
import './HealthTips.css';
import { useLanguage } from '../../context/LanguageContext.jsx';
import BrandMark from '../../components/layout/BrandMark.jsx';
import ThemeToggle from '../../components/layout/ThemeToggle.jsx';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/health-tips`;

function HealthTips() {
  const { t, locale } = useLanguage();
  const [tips, setTips] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch(API_URL)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error('Could not load health tips. Please try again.');
        return data;
      })
      .then((data) => { if (active) setTips(data.tips || []); })
      .catch(() => { if (active) setError('Could not load health tips. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const categories = [...new Set(tips.map((tip) => tip.category))];
  const visibleTips = selectedCategory === 'all'
    ? tips
    : tips.filter((tip) => tip.category === selectedCategory);

  return (
    <main className="tips-page">
      <header className="tips-header">
        <a className="tips-brand" href="/" aria-label={t('Go to home page')}>
          <span className="tips-brand-icon"><BrandMark size={20} /></span>
          <span>GramHealthCareAI</span>
        </a>
        <div className="theme-header-actions">
          <ThemeToggle />
          <a className="tips-dashboard-link" href="/dashboard">{t('Dashboard')}</a>
        </div>
      </header>

      <section className="tips-hero">
        <p className="tips-eyebrow">{t('SMALL STEPS, EVERY DAY')}</p>
        <h1>{t('Health tips')}</h1>
        <p>
          {t('General wellness ideas to explore. Choose what fits your circumstances and ask a healthcare professional about personal concerns.')}
        </p>
      </section>

      <section className="tips-content" aria-label={t('Wellness tips')}>
        {!loading && !error && tips.length > 0 && (
          <div className="tips-topic-filter" role="group" aria-label={t('Filter by topic')}>
            <span>{t('Topics')}</span>
            <button type="button" className={selectedCategory === 'all' ? 'selected' : ''} aria-pressed={selectedCategory === 'all'} onClick={() => setSelectedCategory('all')}>
              {t('All topics')}
            </button>
            {categories.map((category) => (
              <button key={category} type="button" className={selectedCategory === category ? 'selected' : ''} aria-pressed={selectedCategory === category} onClick={() => setSelectedCategory(category)}>
                {t(category)}
              </button>
            ))}
          </div>
        )}
        {loading && <p role="status">{t('Loading health tips…')}</p>}
        {error && (
          <div role="alert">
            <p>{t(error)}</p>
            <button type="button" onClick={() => window.location.reload()}>{t('Try again')}</button>
          </div>
        )}
        {!loading && !error && tips.length === 0 && <p>{t('No health tips are available right now.')}</p>}
        {!loading && !error && tips.length > 0 && visibleTips.length === 0 && <p>{t('No tips are available for this topic.')}</p>}
        {!loading && !error && visibleTips.length > 0 && <div className="tips-grid">
          {visibleTips.map((tip) => (
            <article className="tip-card" key={tip.title}>
              <div className="tip-card-top">
                <span className="tip-icon" aria-hidden="true">{tip.icon}</span>
                <span className="tip-category">{t(tip.category)}</span>
              </div>
              <h2>{t(tip.title)}</h2>
              <p>{t(tip.description)}</p>
              <div className="tip-source-details">
                <p><span>{t('Source')}:</span> <a href={tip.sourceUrl} target="_blank" rel="noreferrer">{tip.sourceName}</a></p>
                <p><span>{t('Source checked')}:</span> <time dateTime={tip.sourceCheckedOn}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${tip.sourceCheckedOn}T00:00:00Z`))}</time></p>
              </div>
            </article>
          ))}
        </div>}

        <aside className="tips-note">
          <strong>{t('Please note:')}</strong> {t('These are general wellness suggestions, not medical advice or a substitute for care from a qualified professional.')}
        </aside>
      </section>

      <footer className="tips-footer">
        <span>© {new Date().getFullYear()} GramHealthCareAI</span>
        <span>{t('For emergencies, contact your local emergency services.')}</span>
      </footer>
    </main>
  );
}

export default HealthTips;
