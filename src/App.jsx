import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { Shield } from 'lucide-react';
import ConstellationBackground from './components/ConstellationBackground';
import './index.css';

const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MapView = lazy(() => import('./pages/MapView'));
const TaskBoard = lazy(() => import('./pages/TaskBoard'));
const Auth = lazy(() => import('./pages/Auth'));
const LandingExperience = lazy(() => import('./components/InteractiveLayer/LandingExperience'));
const HealthDashboard = lazy(() => import('./pages/HealthDashboard'));
const TrainingCenter = lazy(() => import('./pages/TrainingCenter'));
const AssetInventory = lazy(() => import('./pages/AssetInventory'));
const Ecosystem = lazy(() => import('./pages/Ecosystem'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const LostFoundView = lazy(() => import('./pages/LostFoundView'));
const FosterHub = lazy(() => import('./pages/FosterHub'));
const MunicipalDashboard = lazy(() => import('./pages/MunicipalDashboard'));
const DigitalPassport = lazy(() => import('./pages/DigitalPassport'));
const RescueCaseDetail = lazy(() => import('./pages/RescueCaseDetail'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ImpactPage = lazy(() => import('./pages/ImpactPage'));
const AdoptionPage = lazy(() => import('./pages/AdoptionPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const PublicLostFoundPoster = lazy(() => import('./pages/PublicLostFoundPoster'));
const PublicCertificateVerify = lazy(() => import('./pages/PublicCertificateVerify'));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#321325', color: '#fff8df', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
          <div style={{ display: 'grid', placeItems: 'center', width: '3.5rem', height: '3.5rem', background: '#FCDC4D', color: '#321325', borderRadius: '8px', fontWeight: 900 }}>FN</div>
          <h1>FaunaNet</h1>
          <p style={{ color: '#f5cf88', fontSize: '0.95rem' }}>Something went wrong. Please reload.</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.75rem 2rem', background: '#FCDC4D', color: '#321325', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            Reload
          </button>
          {import.meta.env.DEV && <pre style={{ fontSize: '0.75rem', color: '#FCDC4D', maxWidth: '600px', overflow: 'auto' }}>{this.state.error?.toString()}</pre>}
        </div>
      );
    }

    return this.props.children;
  }
}

function LoadingFallback() {
  return (
    <div className="loading-screen flex flex-col items-center justify-center h-screen text-primary">
      <div className="mb-lg">
        <Shield size={64} className="animate-pulse" />
      </div>
      <p className="pixel-font animate-pulse">Loading...</p>
    </div>
  );
}

function AppContent() {
  const { currentUser } = useAppContext();

  return (
    <div className="app-root">
      <ConstellationBackground />
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<LandingExperience />} />
            <Route path="/auth" element={!currentUser ? <Auth /> : <Navigate to="/app" />} />
            <Route path="/passport/:id" element={<DigitalPassport />} />
            <Route path="/animal/:id" element={<DigitalPassport />} />
            <Route path="/certificate/:certId" element={<PublicCertificateVerify />} />
            <Route path="/lost-found/:id" element={<PublicLostFoundPoster />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/app" element={currentUser ? <Layout /> : <Navigate to="/auth" />}>
              <Route index element={<Dashboard />} />
              <Route path="map" element={<MapView />} />
              <Route path="tasks" element={<TaskBoard />} />
              <Route path="rescue/:id" element={<RescueCaseDetail />} />
              <Route path="health" element={<HealthDashboard />} />
              <Route path="training" element={<TrainingCenter />} />
              <Route path="assets" element={<AssetInventory />} />
              <Route path="ecosystem" element={<Ecosystem />} />
              <Route path="lost-found" element={<LostFoundView />} />
              <Route path="foster" element={<FosterHub />} />
              <Route path="adoption" element={<AdoptionPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="impact" element={<ImpactPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="help" element={<HelpCenter />} />
              <Route path="municipal" element={['ngo','vet','shelter','admin'].includes(currentUser?.role) ? <MunicipalDashboard /> : <Navigate to="/app" />} />
              <Route path="admin" element={currentUser?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/app" />} />
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </Router>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
