import { Activity, ArrowUpRight, Bot, ClipboardClock, HeartPulse, Hospital, Languages, Lightbulb, ShieldCheck, Stethoscope } from 'lucide-react';
import './Home.css';
import { useLanguage } from '../../context/LanguageContext.jsx';

const features = [
  {
    Icon: Stethoscope,
    title: 'Symptom Checker',
    description: 'Record symptoms and how long you have had them.',
    href: '/symptom-checker',
  },
  {
    Icon: Lightbulb,
    title: 'Health Tips',
    description: 'Browse general wellness information and practical tips.',
    href: '/health-tips',
  },
  {
    Icon: ClipboardClock,
    title: 'Medicine Reminders',
    description: 'Keep track of medicines you need to take.',
    href: '/medicine-reminder',
  },
  {
    Icon: Bot,
    title: 'Health Chatbot',
    description: 'Get general health guidance and help finding reliable information.',
    href: '/health-chatbot',
  },
  {
    Icon: Hospital,
    title: 'Find a Hospital',
    description: 'Find nearby hospitals and healthcare services.',
    href: '/hospital-locator',
  },
  {
    Icon: Languages,
    title: 'Language',
    description: 'Choose your preferred language for the app.',
    href: '/language',
  },
];

function Home() {
  const { t } = useLanguage();
  return (
    <main className="home">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="home-eyebrow">{t('CARE INFORMATION, MADE ACCESSIBLE')}</p>
          <h1>{t('Your health journey starts with the right support.')}</h1>
          <p className="home-intro">
            {t('Explore health information, medicine tools, and care resources in one easy-to-use place.')}
          </p>

          <div className="home-actions">
            <a className="home-button home-button-primary" href="/register">
              {t('Get started')}
            </a>
            <a className="home-button home-button-secondary" href="#features">
              {t('Explore features')}
            </a>
          </div>
        </div>

        <aside className="home-highlight" aria-label={t('Health information note')}>
          <div className="home-highlight-orbit" aria-hidden="true">
            <div className="home-highlight-core"><HeartPulse size={52} strokeWidth={1.5} /></div>
            <span className="home-orbit-dot" />
          </div>
          <div className="home-highlight-caption">
            <span className="home-highlight-badge"><ShieldCheck size={17} /> {t('CARE, CONNECTED')}</span>
            <h2>{t('Support for everyday health needs')}</h2>
            <p>{t('Find helpful tools for learning, planning, and locating care.')}</p>
          </div>
        </aside>
      </section>

      <section className="home-features" id="features">
        <div className="home-section-heading">
          <p className="home-eyebrow"><Activity size={16} /> {t('EXPLORE THE PLATFORM')}</p>
          <h2>{t('Our care tools')}</h2>
          <p>{t('Choose a feature to get started.')}</p>
        </div>

        <div className="home-feature-grid">
          {features.map(({ Icon, ...feature }) => (
            <a className="home-feature-card" href={feature.href} key={feature.title}>
              <div className="home-feature-visual" aria-hidden="true">
                <span className="home-feature-icon"><Icon size={38} strokeWidth={1.8} /></span>
              </div>
              <div className="home-feature-body">
                <h3>{t(feature.title)}</h3>
                <p>{t(feature.description)}</p>
                <span className="home-feature-link">{t('Open')} <ArrowUpRight size={16} /></span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="home-about" id="about">
        <div className="home-about-icon"><Languages size={25} /></div>
        <div>
          <h2>{t('Care information, made accessible')}</h2>
          <p>{t('GramHealthCareAI brings useful health tools together to help you find information and organize everyday care tasks.')}</p>
        </div>
      </section>
    </main>
  );
}

export default Home;

