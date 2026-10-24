import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Bot, ClipboardClock, HeartPulse, Hospital, Languages, Lightbulb } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import BrandMark from './BrandMark.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import './Navbar.css';

const navLinks = [
  { to: '/', label: 'Home', end: true, Icon: HeartPulse },
  { to: '/symptom-checker', label: 'Symptom Checker', Icon: Activity },
  { to: '/health-tips', label: 'Health Tips', Icon: Lightbulb },
  { to: '/medicine-reminder', label: 'Medicine Reminders', Icon: ClipboardClock },
  { to: '/hospital-locator', label: 'Hospital Locator', Icon: Hospital },
  { to: '/health-chatbot', label: 'Health Chatbot', Icon: Bot },
  { to: '/language', label: 'Language', Icon: Languages },
];

function Navbar() {
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="site-header-main">
        <NavLink className="site-brand" to="/" onClick={closeMenu}>
          <span className="site-brand-mark"><BrandMark size={23} /></span>
          <span>GramHealthCareAI</span>
        </NavLink>

        <div className="site-header-promise">
          <Activity size={17} aria-hidden="true" />
          <span>{t('Everyday care, made easier')}</span>
        </div>

        <div className="site-header-tools">
          <ThemeToggle />
          <NavLink className="site-login-link" to="/login" onClick={closeMenu}>
            {t('Log in')}
          </NavLink>
          <NavLink className="site-signup-link" to="/register" onClick={closeMenu}>
            {t('Get started')}
          </NavLink>
        </div>

        <button
          className="site-menu-toggle"
          type="button"
          aria-label={menuOpen ? t('Close navigation menu') : t('Open navigation menu')}
          aria-expanded={menuOpen}
          aria-controls="site-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <nav
        className={`site-navigation ${menuOpen ? 'is-open' : ''}`}
        id="site-navigation"
        aria-label={t('Main navigation')}
      >
        {navLinks.map(({ to, label, end, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={closeMenu}
            className={({ isActive }) =>
              `site-nav-link${isActive ? ' active' : ''}`
            }
          >
            <Icon size={16} aria-hidden="true" />
            {t(label)}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

export default Navbar;

