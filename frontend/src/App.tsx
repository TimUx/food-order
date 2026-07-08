import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ClubProvider } from '@/contexts/ClubContext';
import { ProtectedRoute } from '@/components/StaffLayout';
import { AdminRoute } from '@/components/AdminLayout';
import { OrderPage } from '@/pages/OrderPage';
import { OrderStatusPage } from '@/pages/OrderStatusPage';
import { PickupBoardPage } from '@/pages/PickupBoardPage';
import { ContactPage } from '@/pages/ContactPage';
import { LoginPage } from '@/pages/staff/LoginPage';
import { DashboardPage } from '@/pages/staff/DashboardPage';
import { KitchenPage } from '@/pages/staff/KitchenPage';
import { AbholungPage } from '@/pages/staff/AbholungPage';
import { BestellungPage } from '@/pages/staff/BestellungPage';
import { OrdersPage } from '@/pages/staff/OrdersPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { ClubSettingsPage } from '@/pages/admin/ClubSettingsPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { EventsPage } from '@/pages/admin/EventsPage';
import { FoodItemsPage } from '@/pages/admin/FoodItemsPage';
import { OrderSettingsPage } from '@/pages/admin/OrderSettingsPage';
import { MailSettingsPage } from '@/pages/admin/MailSettingsPage';

export default function App() {
  return (
    <ThemeProvider>
      <ClubProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<OrderPage />} />
              <Route path="/kontakt" element={<ContactPage />} />
              <Route path="/status" element={<OrderStatusPage />} />
              <Route path="/status/:orderId" element={<OrderStatusPage />} />
              <Route path="/abholboard" element={<PickupBoardPage />} />

              <Route path="/mitarbeiter/login" element={<LoginPage />} />
              <Route path="/mitarbeiter" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/mitarbeiter/bestellungen" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
              <Route path="/mitarbeiter/kueche" element={<ProtectedRoute><KitchenPage /></ProtectedRoute>} />
              <Route path="/mitarbeiter/abholung" element={<ProtectedRoute><AbholungPage /></ProtectedRoute>} />
              <Route path="/mitarbeiter/bestellung" element={<ProtectedRoute><BestellungPage /></ProtectedRoute>} />

              <Route path="/admin/login" element={<LoginPage />} />
              <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
              <Route path="/admin/verein" element={<AdminRoute><ClubSettingsPage /></AdminRoute>} />
              <Route path="/admin/benutzer" element={<AdminRoute><UsersPage /></AdminRoute>} />
              <Route path="/admin/veranstaltungen" element={<AdminRoute><EventsPage /></AdminRoute>} />
              <Route path="/admin/speisen" element={<AdminRoute><FoodItemsPage /></AdminRoute>} />
              <Route path="/admin/bestellung" element={<AdminRoute><OrderSettingsPage /></AdminRoute>} />
              <Route path="/admin/email" element={<AdminRoute><MailSettingsPage /></AdminRoute>} />

              {/* Alte Routen weiterleiten */}
              <Route path="/mitarbeiter/kasse" element={<Navigate to="/mitarbeiter/abholung" replace />} />
              <Route path="/mitarbeiter/lokale-kasse" element={<Navigate to="/mitarbeiter/bestellung" replace />} />
              <Route path="/mitarbeiter/verein" element={<Navigate to="/admin/verein" replace />} />
              <Route path="/mitarbeiter/speisen" element={<Navigate to="/admin/speisen" replace />} />
              <Route path="/mitarbeiter/veranstaltungen" element={<Navigate to="/admin/veranstaltungen" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ClubProvider>
    </ThemeProvider>
  );
}
