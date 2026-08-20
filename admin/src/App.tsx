import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider } from './context/AdminAuthContext.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { AdminLayout } from './layouts/AdminLayout.js';

// Route-level code splitting
const OverviewPage = React.lazy(() => import('./pages/OverviewPage.js').then((m) => ({ default: m.OverviewPage })));
const StudentsPage = React.lazy(() => import('./pages/StudentsPage.js').then((m) => ({ default: m.StudentsPage })));
const PaymentsPage = React.lazy(() => import('./pages/PaymentsPage.js').then((m) => ({ default: m.PaymentsPage })));
const AppConfigPage = React.lazy(() => import('./pages/AppConfigPage.js').then((m) => ({ default: m.AppConfigPage })));
const AuditPage = React.lazy(() => import('./pages/AuditPage.js').then((m) => ({ default: m.AuditPage })));
const LoginPage = React.lazy(() => import('./pages/LoginPage.js').then((m) => ({ default: m.LoginPage })));

const RouteLoadingFallback: React.FC = () => (
  <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1200px', margin: '0 auto' }}>
    <div style={{ width: '30%', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px' }} />
    <div style={{ width: '100%', height: '300px', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px' }} />
  </div>
);

export const App: React.FC = () => {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <React.Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            {/* Public Authentication Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected SOCC Management Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/overview" replace />} />
              <Route path="overview" element={<OverviewPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="config" element={<AppConfigPage />} />
              <Route path="audit" element={<AuditPage />} />
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </AdminAuthProvider>
  );
};

export default App;
