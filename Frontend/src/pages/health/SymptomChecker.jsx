import { useState } from 'react';
import './SymptomChecker.css';
import { useLanguage } from '../../context/LanguageContext.jsx';
import BrandMark from '../../components/layout/BrandMark.jsx';
import ThemeToggle from '../../components/layout/ThemeToggle.jsx';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/symptom-checker`;
const durationLabels = {
  today: 'Started today',
  'few-days': '1–3 days',
  week: '4–7 days',
  longer: 'More than a week',
};

const commonSymptoms = [
  'Fever',
  'Headache',
  'Cough',
  'Sore throat',
  'Fatigue',
  'Nausea',
  'Body aches',
  'Stomach pain',
];

const emergencyWarningSymptoms = [
  'Trouble breathing',
  'Chest pain or pressure',
  'Fainting',
  'New confusion',
];

function SymptomChecker() {
  const { t } = useLanguage();
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [duration, setDuration] = useState('');
  const [result, setResult] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const hasEmergencyWarningSign = selectedSymptoms.some((symptom) =>
    emergencyWarningSymptoms.includes(symptom)
  );

  function toggleSymptom(symptom) {
    setSelectedSymptoms((current) =>
      current.includes(symptom)
        ? current.filter((item) => item !== symptom)
        : [...current, symptom]
    );
    setResult('');
    setIsSaved(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (selectedSymptoms.length === 0) {
      setResult('Select at least one symptom to continue.');
      return;
    }
    if (!consent) {
      setResult('Confirm that you want to save this symptom check to your account.');
      return;
    }

    setIsSubmitting(true);
    setResult('');
    setIsSaved(false);
    try {
      const token = localStorage.getItem('gramhealth-token');
      if (!token) throw new Error(t('Please log in before saving a symptom check.'));
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ symptoms: selectedSymptoms, duration, consent }),
      });
      await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(t('Could not save this symptom check. Please try again.'));
      setResult('Symptom check saved to your account.');
      setIsSaved(true);
    } catch (error) {
      console.error('Save symptom check error:', error.message);
      setResult('Could not save this symptom check. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="symptom-page">
      <div className="theme-page-header">
        <a className="symptom-brand" href="/" aria-label={t('Go to home page')}>
          <span className="symptom-brand-icon"><BrandMark size={20} /></span>
          <span>GramHealthCareAI</span>
        </a>
        <ThemeToggle />
      </div>

      <section className="symptom-card" aria-labelledby="symptom-title">
        <p className="symptom-eyebrow">{t('HEALTH TOOL')}</p>
        <h1 id="symptom-title">{t('Symptom checker')}</h1>
        <p className="symptom-intro">
          {t('Check for a few urgent warning signs and get general guidance on when to contact a healthcare professional. This tool cannot identify the cause of symptoms or rule out an emergency.')}
        </p>

        <form onSubmit={handleSubmit}>
          <fieldset className="symptom-list">
            <legend>{t('Which symptoms are you experiencing?')}</legend>
            <div className="symptom-grid">
              {commonSymptoms.map((symptom) => (
                <label className="symptom-choice" key={symptom}>
                  <input
                    type="checkbox"
                    checked={selectedSymptoms.includes(symptom)}
                    onChange={() => toggleSymptom(symptom)}
                  />
          <span>{t(symptom)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="symptom-list symptom-warning-list">
            <legend>{t('Are you experiencing any of these urgent warning signs?')}</legend>
            <div className="symptom-grid">
              {emergencyWarningSymptoms.map((symptom) => (
                <label className="symptom-choice" key={symptom}>
                  <input
                    type="checkbox"
                    checked={selectedSymptoms.includes(symptom)}
                    onChange={() => toggleSymptom(symptom)}
                  />
                  <span>{t(symptom)}</span>
                </label>
              ))}
            </div>
            <p className="symptom-warning-hint">
              {t('This is not a complete list. If you feel seriously unwell or think this may be an emergency, seek urgent help even if your warning sign is not listed.')}
            </p>
          </fieldset>

          {hasEmergencyWarningSign && (
            <aside className="symptom-urgent-alert" role="alert">
              <strong>{t('Seek urgent help')}</strong>{' '}
              {t('You selected a warning sign. Contact your local emergency services or go to the nearest emergency department now. Do not wait for this check to be saved.')}
            </aside>
          )}

          <label className="symptom-duration-label" htmlFor="symptom-duration">
            {t('How long have you had these symptoms?')}
          </label>
          <select
            id="symptom-duration"
            value={duration}
            onChange={(event) => {
              setDuration(event.target.value);
              setResult('');
              setIsSaved(false);
            }}
            required
          >
            <option value="">{t('Choose a duration')}</option>
            <option value="today">{t('Started today')}</option>
            <option value="few-days">{t('1–3 days')}</option>
            <option value="week">{t('4–7 days')}</option>
            <option value="longer">{t('More than a week')}</option>
          </select>

          <label className="symptom-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>{t('I understand my selected symptoms, warning signs, and duration will be saved to my account.')}</span>
          </label>

          <button className="symptom-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('Sending…') : t('Review symptoms')}
          </button>

          {result && (
            <p className="symptom-result" role="status">
              {t(result)}
            </p>
          )}

          {isSaved && (
            <section className="symptom-next-steps" aria-labelledby="symptom-next-steps-title" aria-live="polite">
              <h2 id="symptom-next-steps-title">
                {hasEmergencyWarningSign ? t('Seek urgent help') : t('When to contact a healthcare professional')}
              </h2>
              {hasEmergencyWarningSign ? (
                <p>
                  {t('Because you selected an urgent warning sign, contact your local emergency services or go to the nearest emergency department now.')}
                  {' '}{t('This tool cannot assess how serious it is.')}
                </p>
              ) : (
                <>
                  <p>{t('This tool cannot tell what is causing your symptoms. Contact a qualified healthcare professional for personal advice, especially if symptoms persist, worsen, or concern you.')}</p>
                  <p><strong>{t('Seek urgent help')}</strong> {t('for severe or sudden symptoms, trouble breathing, fainting, confusion, or chest pain or pressure. Contact your local emergency services.')}</p>
                </>
              )}
              <p className="symptom-next-steps-record">
                {t('You selected:')} {selectedSymptoms.map((symptom) => t(symptom)).join(', ')}. {t('Duration:')} {t(durationLabels[duration])}.
              </p>
              <p className="symptom-next-steps-record">{t('When you speak with a healthcare professional, share the symptoms you selected and how long you have had them.')}</p>
            </section>
          )}
        </form>

        <aside className="symptom-warning">
          <strong>{t('Important:')}</strong> {t('This tool does not diagnose or recommend treatment, and it cannot rule out an emergency. Your selections are saved to your account only after you consent. For medical advice, contact a qualified healthcare professional. If symptoms are severe or you think this is an emergency, contact local emergency services immediately.')}
        </aside>
      </section>
    </main>
  );
}

export default SymptomChecker;
