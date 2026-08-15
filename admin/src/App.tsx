import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider } from './context/AdminAuthContext.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { AdminLayout } from './layouts/AdminLayout.js';
import { OverviewPage } from './pages/OverviewPage.js';
import { StudentsPage } from './pages/StudentsPage.js';
import { PaymentsPage } from './pages/PaymentsPage.js';
import { AuditPage } from './pages/AuditPage.js';
import { LoginPage } from './pages/LoginPage.js';

export const App: React.FC = () => {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
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
            <Route path="audit" element={<AuditPage />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
};

export default App;
