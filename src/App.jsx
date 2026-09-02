import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { RealtimeProvider } from './context/RealtimeContext.jsx';
import { Navbar } from './components/Navbar.jsx';
import { Footer } from './components/Footer.jsx';
import { AuthModal } from './components/AuthModal.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { BookingPage } from './pages/BookingPage.jsx';
import { PaymentPage } from './pages/PaymentPage.jsx';
import { HistoryPage } from './pages/HistoryPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { AuthPage } from './pages/AuthPage.jsx';

const AppContent = () => {
  const { user, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname || '/');
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [activeBookingIntent, setActiveBookingIntent] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Sync browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectClass = (classId) => {
    setSelectedClassId(classId);
    navigate(`/booking?classId=${classId}`);
  };

  const handleProceedToPayment = (intent) => {
    setActiveBookingIntent(intent);
    navigate('/payment');
  };

  const handlePaymentSuccess = (booking) => {
    setActiveBookingIntent(null);
  };

  // Route protection
  const isProtectedRoute = (path) => {
    return ['/history', '/settings', '/payment'].some(p => path.startsWith(p));
  };

  // Render current view
  const renderCurrentPage = () => {
    if (isLoading) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="inline-block w-8 h-8 border-2 border-[#00F076] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[#8A9A90] font-sans tracking-wide">Initializing CureFit session...</p>
          </div>
        </div>
      );
    }

    // Protected Route intercept
    if (!user && isProtectedRoute(currentPath)) {
      return (
        <AuthPage
          initialMode="login"
          onNavigate={navigate}
        />
      );
    }

    if (currentPath === '/login') {
      return <AuthPage initialMode="login" onNavigate={navigate} />;
    }

    if (currentPath === '/register') {
      return <AuthPage initialMode="register" onNavigate={navigate} />;
    }

    if (currentPath.startsWith('/booking')) {
      const urlParams = new URLSearchParams(window.location.search);
      const paramClassId = urlParams.get('classId') || selectedClassId;
      return (
        <BookingPage
          classId={paramClassId}
          onNavigate={navigate}
          onProceedToPayment={handleProceedToPayment}
          onOpenAuthModal={() => setAuthModalOpen(true)}
        />
      );
    }

    if (currentPath.startsWith('/payment')) {
      return (
        <PaymentPage
          bookingIntent={activeBookingIntent}
          onNavigate={navigate}
          onSuccess={handlePaymentSuccess}
        />
      );
    }

    if (currentPath.startsWith('/history') || currentPath.startsWith('/my-history')) {
      return (
        <HistoryPage
          onNavigate={navigate}
          onOpenAuthModal={() => setAuthModalOpen(true)}
        />
      );
    }

    if (currentPath.startsWith('/settings')) {
      return (
        <SettingsPage
          onNavigate={navigate}
          onOpenAuthModal={() => setAuthModalOpen(true)}
        />
      );
    }

    // Default: Home Page
    return (
      <HomePage
        onSelectClass={handleSelectClass}
        onNavigate={navigate}
      />
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1B1D1B] flex flex-col selection:bg-[#405548] selection:text-white">
      {/* Global Navigation */}
      <Navbar
        currentPath={currentPath}
        onNavigate={navigate}
        onOpenAuthModal={() => setAuthModalOpen(true)}
      />

      {/* Main Page Body */}
      <main className="flex-1">
        {renderCurrentPage()}
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Auth Modal Overlay */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <AppContent />
      </RealtimeProvider>
    </AuthProvider>
  );
}