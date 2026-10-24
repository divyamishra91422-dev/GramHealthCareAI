import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Navbar from './components/layout/Navbar.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import Footer from './components/layout/Footer.jsx';
import ProtectedRoute from './components/routing/ProtectedRoute.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

import Home from './pages/public/Home.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import Dashboard from './pages/dashboard/Dashboard.jsx';
import HealthChatbot from './pages/health/HealthChatbot.jsx';
import HealthTips from './pages/health/HealthTips.jsx';
import HospitalLocator from './pages/health/HospitalLocator.jsx';
import Language from './pages/preferences/Language.jsx';
import MedicineReminder from './pages/health/MedicineReminder.jsx';
import SymptomChecker from './pages/health/SymptomChecker.jsx';
import HealthHistory from './pages/dashboard/HealthHistory.jsx';

function HomeWithSiteLayout() {
  return (
    <>
      <Navbar />
      <Home />
      <Footer />
    </>
  );
}

function DashboardWithSidebar() {
  return (
    <div className="app-dashboard-layout">
      <Sidebar />
      <Dashboard />
    </div>
  );
}

function HealthHistoryWithSidebar() {
  return (
    <div className="app-dashboard-layout">
      <Sidebar />
      <HealthHistory />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeWithSiteLayout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardWithSidebar />
                </ProtectedRoute>
              }
            />

            <Route
              path="/health-history"
              element={
                <ProtectedRoute>
                  <HealthHistoryWithSidebar />
                </ProtectedRoute>
              }
            />

            <Route
              path="/health-chatbot"
              element={
                <ProtectedRoute>
                  <HealthChatbot />
                </ProtectedRoute>
              }
            />
            <Route path="/health-tips" element={<HealthTips />} />
            <Route path="/hospital-locator" element={<HospitalLocator />} />
            <Route path="/language" element={<Language />} />
            <Route path="/medicine-reminder" element={<MedicineReminder />} />
            <Route path="/symptom-checker" element={<SymptomChecker />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
