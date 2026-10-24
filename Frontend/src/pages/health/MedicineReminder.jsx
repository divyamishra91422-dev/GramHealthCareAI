import { useEffect, useRef, useState } from 'react';
import './MedicineReminder.css';
import { useLanguage } from '../../context/LanguageContext.jsx';
import BrandMark from '../../components/layout/BrandMark.jsx';
import ThemeToggle from '../../components/layout/ThemeToggle.jsx';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reminders`;

function MedicineReminder() {
  const { t } = useLanguage();
  const [reminders, setReminders] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const token = localStorage.getItem('gramhealth-token') || '';
    return localStorage.getItem(`gramhealth-reminder-notifications:${token.slice(-16)}`) === 'true';
  });
  const notifiedSlots = useRef(new Set());

  const notificationStorageKey = `gramhealth-reminder-notifications:${(localStorage.getItem('gramhealth-token') || '').slice(-16)}`;

  async function request(path = '', options = {}) {
    const token = localStorage.getItem('gramhealth-token');
    if (!token) throw new Error('Please log in before opening your medicine reminders.');
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error('Could not load your reminders. Please try again.');
    return data;
  }

  useEffect(() => {
    let active = true;
    request()
      .then((data) => { if (active) setReminders(data.reminders || []); })
      .catch((error) => {
        if (active) {
          console.error('Load medicine reminders error:', error.message);
          setMessage('Could not load your reminders. Please try again.');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return undefined;

    const notifyDueReminders = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const dueReminders = reminders.filter((reminder) => String(reminder.time).slice(0, 5) === currentTime);
      if (!dueReminders.length) return;

      const slot = `${now.toDateString()}-${currentTime}`;
      if (notifiedSlots.current.has(slot)) return;
      try {
        new Notification(t('Medicine reminder'), {
          body: t('You have a saved reminder due now. Open GramHealthCareAI to review your schedule.'),
          tag: `gramhealth-reminders-${slot}`,
        });
        notifiedSlots.current.add(slot);
      } catch {
        setMessage('Could not show a browser notification. Check your browser settings.');
      }
    };

    notifyDueReminders();
    const intervalId = window.setInterval(notifyDueReminders, 15000);
    return () => window.clearInterval(intervalId);
  }, [notificationsEnabled, reminders, t]);

  async function handleNotificationPreference(event) {
    const enabled = event.target.checked;
    if (!enabled) {
      setNotificationsEnabled(false);
      localStorage.setItem(notificationStorageKey, 'false');
      setMessage('Browser notifications are off.');
      return;
    }

    if (!('Notification' in window)) {
      setMessage('Browser notifications are not supported in this browser.');
      return;
    }

    try {
      const permission = Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission;
      if (permission !== 'granted') {
        setMessage('Allow notifications in your browser settings to enable reminders.');
        return;
      }
      setNotificationsEnabled(true);
      localStorage.setItem(notificationStorageKey, 'true');
      setMessage('Browser notifications are enabled while this page is open.');
    } catch {
      setMessage('Could not enable browser notifications. Check your browser settings.');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const reminder = {
      name: form.get('medicineName').trim(),
      dosage: form.get('dosage').trim(),
      time: form.get('time'),
      notes: form.get('notes').trim(),
    };

    if (!reminder.name || !reminder.dosage || !reminder.time) {
      setMessage('Please fill in the medicine name, dosage, and time.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const data = await request('', { method: 'POST', body: JSON.stringify(reminder) });
      setReminders((current) => [...current, data.reminder]);
      formElement.reset();
      setMessage('Reminder saved to your account.');
    } catch (error) {
      console.error('Save medicine reminder error:', error.message);
      setMessage('Could not save the reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteReminder(id) {
    setMessage('');
    try {
      await request(`/${id}`, { method: 'DELETE' });
      setReminders((current) => current.filter((reminder) => reminder.id !== id));
      setMessage('Reminder removed.');
    } catch (error) {
      console.error('Delete medicine reminder error:', error.message);
      setMessage('Could not delete the reminder. Please try again.');
    }
  }

  return (
    <main className="medicine-reminder-page">
      <header className="medicine-reminder-header">
        <a className="medicine-reminder-brand" href="/" aria-label={t('Go to home page')}>
          <span className="medicine-reminder-brand-icon"><BrandMark size={20} /></span>
          <span>GramHealthCareAI</span>
        </a>
        <div className="theme-header-actions">
          <ThemeToggle />
          <a className="medicine-reminder-dashboard" href="/dashboard">{t('Dashboard')}</a>
        </div>
      </header>

      <section className="medicine-reminder-hero">
        <p className="medicine-reminder-eyebrow">{t('STAY ORGANIZED')}</p>
        <h1>{t('Medicine reminders')}</h1>
        <p>{t('Add reminders to keep your schedule in one place.')}</p>
      </section>

      <div className="medicine-reminder-content">
        <section className="medicine-reminder-form-card">
          <h2>{t('Add a reminder')}</h2>
          <p>{t('Enter details based on the instructions from your healthcare professional.')}</p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="medicine-name">{t('Medicine name')}</label>
            <input
              id="medicine-name"
              name="medicineName"
              type="text"
              maxLength={100}
              placeholder={t('e.g. Medicine name')}
              required
            />

            <label htmlFor="medicine-dosage">{t('Dosage or instructions')}</label>
            <input
              id="medicine-dosage"
              name="dosage"
              type="text"
              maxLength={100}
              placeholder={t('Use the dosage prescribed to you')}
              required
            />

            <label htmlFor="medicine-time">{t('Reminder time')}</label>
            <input id="medicine-time" name="time" type="time" required />

            <label htmlFor="medicine-notes">{t('Notes (optional)')}</label>
            <textarea
              id="medicine-notes"
              name="notes"
              rows="3"
              maxLength={300}
              placeholder={t('Optional note')}
            />

            <button type="submit" disabled={saving}>{saving ? t('Saving…') : t('Add reminder')}</button>
          </form>

          {message && <p className="medicine-reminder-message" role="status">{t(message)}</p>}
        </section>

        <section className="medicine-reminder-list-section">
          <div className="medicine-reminder-list-heading">
            <h2>{t('Your reminders')}</h2>
            <span>{reminders.length}</span>
          </div>

          {loading ? (
            <div className="medicine-reminder-empty"><p>{t('Loading reminders…')}</p></div>
          ) : reminders.length === 0 ? (
            <div className="medicine-reminder-empty">
              <span aria-hidden="true">⏰</span>
              <p>{t('No reminders added yet.')}</p>
            </div>
          ) : (
            <ul className="medicine-reminder-list">
              {reminders
                .slice()
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((reminder) => (
                  <li className="medicine-reminder-item" key={reminder.id}>
                    <div className="medicine-reminder-time">{reminder.time}</div>
                    <div className="medicine-reminder-details">
                      <h3>{reminder.name}</h3>
                      <p>{reminder.dosage}</p>
                      {reminder.notes && <p>{reminder.notes}</p>}
                    </div>
                    <button
                      className="medicine-reminder-delete"
                      type="button"
                      onClick={() => deleteReminder(reminder.id)}
                      aria-label={`${t('Delete')} ${reminder.name}`}
                    >
                      {t('Delete')}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </section>

        <section className="medicine-reminder-notification-settings" aria-labelledby="reminder-notification-title">
          <div>
            <h2 id="reminder-notification-title">{t('Notification preference')}</h2>
            <p>{t('Optional browser alerts appear only while this page is open. Keep this page open near the reminder time.')}</p>
          </div>
          <label className="medicine-reminder-notification-toggle">
            <input type="checkbox" checked={notificationsEnabled} onChange={handleNotificationPreference} />
            <span>{t('Enable browser notifications')}</span>
          </label>
        </section>

        <aside className="medicine-reminder-disclaimer">
          {t('These reminders are prompts only. Follow instructions from your healthcare professional or pharmacist. Browser notifications may be delayed and only work while this page is open; this app does not record doses taken.')}
        </aside>
      </div>
    </main>
  );
}

export default MedicineReminder;
