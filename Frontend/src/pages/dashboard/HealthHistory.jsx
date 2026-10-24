import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext.jsx';
import ThemeToggle from '../../components/layout/ThemeToggle.jsx';
import './HealthHistory.css';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const durationLabels = {
  today: 'Today',
  'few-days': 'A few days',
  week: 'About a week',
  longer: 'More than a week',
};

function formatDate(value, locale, t) {
  if (!value) return t('Date unavailable');
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? t('Date unavailable')
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function HealthHistory() {
  const { t, locale } = useLanguage();
  const [checks, setChecks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [printEntry, setPrintEntry] = useState(null);

  useEffect(() => {
    if (!printEntry) return undefined;
    const printTimer = window.setTimeout(() => window.print(), 120);
    const finishPrint = () => setPrintEntry(null);
    window.addEventListener('afterprint', finishPrint);
    return () => {
      window.clearTimeout(printTimer);
      window.removeEventListener('afterprint', finishPrint);
    };
  }, [printEntry]);

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem('gramhealth-token');

    async function loadHistory() {
      if (!token) {
        setError('Please log in to view your health history.');
        setLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const requests = [
        fetch(`${API_BASE}/symptom-checker`, { headers, signal: controller.signal }),
        fetch(`${API_BASE}/reminders`, { headers, signal: controller.signal }),
      ];
      try {
        const responses = await Promise.all(requests);
        const data = await Promise.all(responses.map((response) => response.json().catch(() => ({}))));
        const failed = responses.findIndex((response) => !response.ok);
        if (failed !== -1) throw new Error('Could not load your health history. Please try again.');
        setChecks(data[0].checks || []);
        setReminders(data[1].reminders || []);
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          console.error('Load health history error:', loadError.message);
          setError('Could not load your health history. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadHistory();
    return () => controller.abort();
  }, [t]);

  const entries = useMemo(() => {
    const symptomEntries = checks.map((check) => ({
      id: `symptom-${check.id}`,
      recordId: check.id,
      type: 'symptoms',
      icon: '♡',
      title: t('Symptom check'),
      detail: (check.symptoms || []).map((symptom) => t(symptom)).join(', ') || t('Symptoms not available'),
      meta: t(durationLabels[check.duration] || check.duration || 'Duration unavailable'),
      date: check.createdAt,
    }));
    const reminderEntries = reminders.map((reminder) => ({
      id: `reminder-${reminder.id}`,
      type: 'medicines',
      icon: '◷',
      title: reminder.name,
      detail: reminder.dosage,
      meta: `${t('Daily reminder')} · ${reminder.time}`,
      date: null,
    }));
    return [...symptomEntries, ...reminderEntries].sort((a, b) =>
      (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0)
    );
  }, [checks, reminders, t]);

  const visibleEntries = entries.filter((entry) => {
    const matchesFilter = filter === 'all' || entry.type === filter;
    const search = `${entry.title} ${entry.detail} ${entry.meta}`.toLowerCase();
    return matchesFilter && search.includes(query.trim().toLowerCase());
  });

  async function deleteSymptomRecord(id) {
    if (!window.confirm(t('Delete this symptom record from your account?'))) return;
    const token = localStorage.getItem('gramhealth-token');
    setDeletingId(id);
    setActionMessage('');
    try {
      const response = await fetch(`${API_BASE}/symptom-checker/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await response.json().catch(() => ({}));
      if (!response.ok) throw new Error('Unable to delete this symptom record.');
      setChecks((current) => current.filter((check) => String(check.id) !== String(id)));
      setActionMessage('Symptom record deleted from your account.');
    } catch (deleteError) {
      console.error('Delete symptom record error:', deleteError.message);
      setActionMessage('Unable to delete this symptom record.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="health-history-page">
      <header className="health-history-header">
        <div>
          <p className="health-history-eyebrow">{t('YOUR PERSONAL RECORD')}</p>
          <h1>{t('My Health History')}</h1>
          <p>{t('Review symptom checks and medicine reminders saved to your account.')}</p>
        </div>
        <ThemeToggle />
      </header>

      <section className="health-history-summary" aria-label={t('History summary')}>
        <article className="health-history-stat"><span aria-hidden="true">♡</span><div><strong>{checks.length}</strong><p>{t('Symptom checks')}</p></div></article>
        <article className="health-history-stat"><span aria-hidden="true">◷</span><div><strong>{reminders.length}</strong><p>{t('Active reminders')}</p></div></article>
        <article className="health-history-stat"><span aria-hidden="true">▤</span><div><strong>{entries.length}</strong><p>{t('Saved records')}</p></div></article>
      </section>

      <section className="health-history-list" aria-labelledby="health-history-list-title">
        <div className="health-history-list-heading">
          <div><p className="health-history-eyebrow">{t('YOUR ACTIVITY')}</p><h2 id="health-history-list-title">{t('Saved records')}</h2></div>
          <label className="health-history-search">
            <span className="health-history-sr-only">{t('Search history')}</span>
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Search records')} />
          </label>
        </div>

        {actionMessage && <p className="health-history-action-message" role="status">{t(actionMessage)}</p>}

        <div className="health-history-filters" role="group" aria-label={t('Filter history')}>
          {[
            ['all', 'All records'],
            ['symptoms', 'Symptoms'],
            ['medicines', 'Medicines'],
          ].map(([value, label]) => (
            <button key={value} type="button" className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)} aria-pressed={filter === value}>{t(label)}</button>
          ))}
        </div>

        {loading ? <p className="health-history-state">{t('Loading your records…')}</p> : null}
        {!loading && error ? <div className="health-history-state health-history-error" role="alert"><p>{t(error)}</p><button type="button" onClick={() => window.location.reload()}>{t('Retry')}</button></div> : null}
        {!loading && !error && visibleEntries.length === 0 ? (
          <div className="health-history-empty"><span aria-hidden="true">▤</span><h3>{entries.length ? t('No matching records') : t('Your history starts here')}</h3><p>{entries.length ? t('Try another search or filter.') : t('Saved symptom checks and medicine reminders will appear here.')}</p><Link to="/symptom-checker">{t('Open Symptom Checker →')}</Link></div>
        ) : null}
        {!loading && !error && visibleEntries.length > 0 ? (
          <div className="health-history-entries">
            {visibleEntries.map((entry) => (
              <article className="health-history-entry" key={entry.id}>
                <span className="health-history-entry-icon" aria-hidden="true">{entry.icon}</span>
                <div className="health-history-entry-copy"><div className="health-history-entry-title"><h3>{entry.title}</h3><span className={`health-history-tag ${entry.type}`}>{t(entry.type === 'symptoms' ? 'Symptom check' : 'Medicine reminder')}</span></div><p>{entry.detail}</p><span className="health-history-entry-meta">{entry.meta}</span></div>
                {entry.date ? <time>{formatDate(entry.date, locale, t)}</time> : <span className="health-history-entry-current">{t('Current schedule')}</span>}
                {entry.type === 'symptoms' ? (
                  <div className="health-history-entry-actions">
                    <button type="button" onClick={() => setPrintEntry(entry)}>{t('Print summary')}</button>
                    <button type="button" className="delete" disabled={deletingId === entry.recordId} onClick={() => deleteSymptomRecord(entry.recordId)}>
                      {deletingId === entry.recordId ? t('Deleting…') : t('Delete record')}
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <p className="health-history-note">{t('This page shows saved reminders, not a record of doses taken. It is for general information and does not replace professional medical care.')}</p>

      {printEntry ? (
        <section className="health-history-print-sheet" aria-label={t('Symptom summary')}>
          <p className="health-history-eyebrow">GramHealthCareAI</p>
          <h1>{t('Symptom summary')}</h1>
          <p><strong>{t('Recorded')}:</strong> {formatDate(printEntry.date, locale, t)}</p>
          <p><strong>{t('Symptoms selected')}:</strong> {printEntry.detail}</p>
          <p><strong>{t('Duration')}:</strong> {printEntry.meta}</p>
          <p className="health-history-print-disclaimer">{t('Personal symptom record only. It is not a diagnosis or medical assessment.')}</p>
          <p>{t('Share this summary with a qualified healthcare professional if helpful.')}</p>
        </section>
      ) : null}
    </main>
  );
}

export default HealthHistory;
