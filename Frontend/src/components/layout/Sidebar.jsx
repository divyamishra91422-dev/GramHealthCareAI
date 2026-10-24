import { NavLink, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext.jsx';
import './Sidebar.css';

const links = [
  { to: '/dashboard', label: 'Overview', icon: '▦', end: true },
  { to: '/health-chatbot', label: 'Health Chatbot', icon: '✉' },
  { to: '/symptom-checker', label: 'Symptom Checker', icon: '♡' },
  { to: '/health-tips', label: 'Health Tips', icon: '✳' },
  { to: '/medicine-reminder', label: 'Medicine Reminders', icon: '◷' },
  { to: '/hospital-locator', label: 'Hospital Locator', icon: '⌖' },
  { to: '/language', label: 'Language', icon: '文' },
  { to: '/health-history', label: 'My Health History', icon: '▤' },
];

function Sidebar() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem('gramhealth-token');
    localStorage.removeItem('gramhealth-authenticated');
    localStorage.removeItem('gramhealth-name');
    navigate('/login', { replace: true });
  }

  return (
    <aside className="app-sidebar">
      <p className="app-sidebar-heading">{t('YOUR HEALTH TOOLS')}</p>

      <nav className="app-sidebar-nav" aria-label={t('Dashboard navigation')}>
        {links.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `app-sidebar-link${isActive ? ' active' : ''}`
            }
          >
            <span className="app-sidebar-icon" aria-hidden="true">{icon}</span>
            <span>{t(label)}</span>
          </NavLink>
        ))}
        <button className="app-sidebar-link app-sidebar-logout" type="button" onClick={handleLogout}>
          <span className="app-sidebar-icon" aria-hidden="true">↪</span>
          <span>{t('Log out')}</span>
        </button>
      </nav>

      <div className="app-sidebar-help">
        <span aria-hidden="true">ⓘ</span>
        <p>{t('For urgent medical help, contact local emergency services.')}</p>
      </div>
    </aside>
  );
}

export default Sidebar;

