import { useState } from 'react';
import './HospitalLocator.css';
import { useLanguage } from '../../context/LanguageContext.jsx';
import BrandMark from '../../components/layout/BrandMark.jsx';
import ThemeToggle from '../../components/layout/ThemeToggle.jsx';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/hospitals`;

function HospitalLocator() {
  const { t, locale } = useLanguage();
  const [location, setLocation] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  async function searchFacilities(query, label) {
    setSearch(label);
    setMessage('');
    setHospitals([]);
    setLastUpdatedAt('');
    setLoading(true);
    let failureMessage = 'Could not search for nearby facilities. Please try again.';
    try {
      const response = await fetch(`${API_URL}?${query}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        failureMessage = response.status === 503
          ? data.message || 'The live facility search is temporarily unavailable. Please try again in a few minutes.'
          : 'Could not search for nearby facilities. Please try again.';
        throw new Error(failureMessage);
      }
      setHospitals(data.results || []);
      setLastUpdatedAt(data.lastUpdatedAt || '');
      if (data.stale) {
        setMessage('Live search is unavailable. Showing saved results, which may be out of date. Please confirm facility details before travelling.');
      } else if (!data.results?.length) {
        setMessage('No hospitals or clinics were found nearby in OpenStreetMap.');
      }
    } catch (error) {
      console.error('Hospital locator request error:', error.message);
      setMessage(failureMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedLocation = location.trim();

    if (!trimmedLocation) {
      setMessage('Enter a city, area, or postal code to search.');
      return;
    }

    searchFacilities(`location=${encodeURIComponent(trimmedLocation)}`, trimmedLocation);
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage('Location is not available in this browser. Enter a city or postal code instead.');
      return;
    }

    setMessage('Requesting permission to use your location…');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const params = new URLSearchParams({ lat: String(coords.latitude), lon: String(coords.longitude) });
        searchFacilities(params.toString(), t('your current location'))
          .finally(() => setLocating(false));
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setMessage('Location permission was denied. Allow location access in your browser settings, or search by city.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setMessage('Your location could not be determined. Search by city or postal code instead.');
        } else {
          setMessage('Location request timed out. Please try again or search by city.');
        }
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
    );
  }

  return (
    <main className="locator-page">
      <header className="locator-header">
        <a className="locator-brand" href="/" aria-label={t('Go to home page')}>
          <span className="locator-brand-icon"><BrandMark size={20} /></span>
          <span>GramHealthCareAI</span>
        </a>
        <div className="theme-header-actions">
          <ThemeToggle />
          <a className="locator-dashboard-link" href="/dashboard">{t('Dashboard')}</a>
        </div>
      </header>

      <section className="locator-hero">
        <p className="locator-eyebrow">{t('FIND LOCAL CARE')}</p>
        <h1>{t('Hospital locator')}</h1>
        <p>{t('Search by city, area, or postal code to find healthcare facilities.')}</p>
      </section>

      <section className="locator-content">
        <form className="locator-search" onSubmit={handleSubmit}>
          <label htmlFor="locator-location">{t('Your location')}</label>
          <div className="locator-search-row">
            <input
              id="locator-location"
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder={t('Enter a city, area, or postal code')}
            />
            <button type="submit">{t('Search')}</button>
          </div>
          <button className="locator-current-location" type="button" onClick={handleUseCurrentLocation} disabled={loading || locating}>
            <span aria-hidden="true">⌖</span> {locating ? t('Getting your location…') : t('Use my current location')}
          </button>
          <p className="locator-location-note">
            {t('Your location is requested only after you choose this option. Coordinates are used to search nearby facilities and are not saved.')}
          </p>
        </form>

        {message && (
          <p className="locator-message" role="status">
            {t(message)}
          </p>
        )}

        {search && (
          <h2 className="locator-results-heading">
            {loading ? `${t('Searching near')} “${search}”…` : `${t('Results near')} “${search}”`}
          </h2>
        )}

        <div className="locator-results">
          {hospitals.map((hospital) => (
            <article className="locator-card" key={hospital.id}>
              <div className="locator-card-icon" aria-hidden="true">🏥</div>
              <div className="locator-card-info">
                <p className="locator-type">{t(hospital.type)}</p>
                <h2>{hospital.name}</h2>
                {hospital.publicFacility && <span className="locator-public-badge">{t('Possible public facility')}</span>}
                <p>{hospital.address}</p>
                <p>{hospital.phone}</p>
                <span className="locator-distance">{hospital.distanceKm} {t('km away')}</span>
                <div className="locator-card-links">
                  <a href={hospital.mapUrl} target="_blank" rel="noreferrer">{t('View on OpenStreetMap')}</a>
                  <a href={hospital.directionsUrl} target="_blank" rel="noreferrer">{t('Get directions')}</a>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="locator-location-note">
          {lastUpdatedAt && <>{t('Results last refreshed')}: {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastUpdatedAt))}. </>}
          {t('Facility details come from OpenStreetMap contributors and may be incomplete or out of date.')}{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            © OpenStreetMap contributors
          </a>
        </p>

        <aside className="locator-warning">
          <strong>{t('Need urgent care?')}</strong> {t('Contact your local emergency services.')} {t('Do not rely on this demo for emergency directions or facility availability.')}
        </aside>
      </section>
    </main>
  );
}

export default HospitalLocator;
