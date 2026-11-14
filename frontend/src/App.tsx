import React, { useState } from 'react';
import { SimulationProvider } from './context/SimulationContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { NavigationTab } from './components/navigation/TopNavBar';
import { HomePage } from './pages/HomePage';
import { SimulationPage } from './pages/SimulationPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AboutPage } from './pages/AboutPage';
import { LoginModal } from './components/modals/LoginModal';
import { WatchDemoModal } from './components/modals/WatchDemoModal';

interface AppProps {
  initialTab?: NavigationTab;
}

export const App: React.FC<AppProps> = ({ initialTab = 'home' }) => {
  const [activeTab, setActiveTab] = useState<NavigationTab>(initialTab);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  return (
    <SimulationProvider>
      <DashboardLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenLogin={() => setIsLoginOpen(true)}
      >
        {activeTab === 'home' && (
          <HomePage
            onLaunchSimulation={() => setActiveTab('simulation')}
            onOpenDemo={() => setIsDemoOpen(true)}
            onNavigateToTab={setActiveTab}
          />
        )}
        {activeTab === 'simulation' && <SimulationPage />}
        {activeTab === 'monitoring' && <MonitoringPage />}
        {activeTab === 'analytics' && <AnalyticsPage />}
        {activeTab === 'reports' && <ReportsPage />}
        {activeTab === 'about' && <AboutPage />}
      </DashboardLayout>

      {/* Operator Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />

      {/* Interactive Watch Demo Walkthrough Modal */}
      <WatchDemoModal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        onLaunchSimulation={() => setActiveTab('simulation')}
      />
    </SimulationProvider>
  );
};

export default App;
