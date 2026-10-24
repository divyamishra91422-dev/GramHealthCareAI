import './Dashboard.css';
import { useLanguage } from '../../context/LanguageContext.jsx';
import BrandMark from '../../components/layout/BrandMark.jsx';
import ThemeToggle from '../../components/layout/ThemeToggle.jsx';

const quickLinks = [
  {
    icon: '💬',
    title: 'Health Chatbot',
    description: 'Explore general health information.',
    href: '/health-chatbot',
  },
  {
    icon: '🩺',
    title: 'Symptom Checker',
    description: 'Record symptoms and their duration.',
    href: '/symptom-checker',
  },
  {
    icon: '🏥',
    title: 'Hospital Locator',
    description: 'Find healthcare locations.',
    href: '/hospital-locator',
  },
  {
    icon: '▤',
    title: 'My Health History',
    description: 'Review your saved checks and reminders.',
    href: '/health-history',
  },
  {
    icon: '💡',
    title: 'Health Tips',
    description: 'Read general wellness information and practical health tips.',
    href: '/health-tips',
  },
  {
    icon: '⏰',
    title: 'Medicine Reminders',
    description: 'Review or manage your medicine schedules.',
    href: '/medicine-reminder',
  },
];

function Dashboard() {
  const { t, displayName } = useLanguage();
  const userName = displayName(localStorage.getItem('gramhealth-name') || '');

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <a className="dashboard-brand" href="/" aria-label={t('Home')}>
          <span className="dashboard-brand-icon"><BrandMark size={20} /></span>
          <span>GramHealthCareAI</span>
        </a>

        <nav className="dashboard-nav" aria-label={t('Account navigation')}>
          <ThemeToggle />
        </nav>
      </header>

      <div className="dashboard-content">
        <section className="dashboard-welcome">
          <div>
            <p className="dashboard-eyebrow">{t('YOUR HEALTH SPACE')}</p>
            <h1>{userName ? `${t('Hello')}, ${userName}` : t('Hello')}</h1>
            <p>{t('What would you like to do today?')}</p>
          </div>
          <a className="dashboard-profile-link" href="/register">
            {t('Account settings')}
          </a>
        </section>

        <section className="dashboard-notice">
          <span aria-hidden="true">ℹ️</span>
          <p>
            {t('This dashboard is for general health tools and information. For urgent medical help, contact your local emergency services.')}
          </p>
        </section>

        <section className="dashboard-section" aria-labelledby="quick-title">
          <div className="dashboard-section-heading">
            <div>
              <p className="dashboard-eyebrow">{t('GET STARTED')}</p>
              <h2 id="quick-title">{t('Quick access')}</h2>
            </div>
          </div>

          <div className="dashboard-grid">
            {quickLinks.map((item) => (
              <a className="dashboard-card" href={item.href} key={item.title}>
                <span className="dashboard-card-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <h3>{t(item.title)}</h3>
                <p>{t(item.description)}</p>
                <span className="dashboard-card-link">{t('Open tool →')}</span>
              </a>
            ))}
          </div>
        </section>

      </div>

      <footer className="dashboard-footer">
        <span>© {new Date().getFullYear()} GramHealthCareAI</span>
        <span>{t('Health information is not a substitute for professional care.')}</span>
      </footer>
    </main>
  );
}

export default Dashboard;
