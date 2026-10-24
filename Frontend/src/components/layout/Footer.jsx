import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext.jsx';
import BrandMark from './BrandMark.jsx';
import './Footer.css';

function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <div className="site-footer-brand-block">
          <Link className="site-footer-brand" to="/">
            <span className="site-footer-brand-mark"><BrandMark size={21} /></span>
            <span>GramHealthCareAI</span>
          </Link>
          <p>
            {t('Helpful tools and general health resources in one accessible place.')}
          </p>
        </div>

        <nav className="site-footer-links" aria-label={t('Footer navigation')}>
          <Link to="/health-chatbot">{t('Health Chatbot')}</Link>
          <Link to="/health-tips">{t('Health Tips')}</Link>
          <Link to="/medicine-reminder">{t('Medicine Reminders')}</Link>
          <Link to="/symptom-checker">{t('Symptom Checker')}</Link>
          <Link to="/hospital-locator">{t('Hospital Locator')}</Link>
          <Link to="/language">{t('Language')}</Link>
        </nav>
      </div>

      <div className="site-footer-bottom">
        <span>© {new Date().getFullYear()} GramHealthCareAI</span>
        <span>
          {t('General information only. For emergencies, contact local emergency services.')}
        </span>
      </div>
    </footer>
  );
}

export default Footer;
