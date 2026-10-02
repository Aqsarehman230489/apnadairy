import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { UiProvider } from './context/UiContext'
import { homeFor } from './lib/roles'
import ProtectedRoute from './components/ProtectedRoute'
import Loader from './components/Loader'
import ModuleSoon from './components/ModuleSoon'
import DashboardLayout from './layouts/DashboardLayout'

import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import Pending from './pages/auth/Pending'
import MobileOnly from './pages/auth/MobileOnly'
import AdminHome from './pages/admin/AdminHome'
import Approvals from './pages/admin/Approvals'
import Users from './pages/admin/Users'
import BulkMarket from './pages/admin/BulkMarket'
import BulkRequests from './pages/manager/BulkRequests'
import RequestDetail from './pages/manager/RequestDetail'
import BulkOrders from './pages/manager/BulkOrders'
import Requirements from './pages/business/Requirements'
import NewRequirement from './pages/business/NewRequirement'
import RequirementDetail from './pages/business/RequirementDetail'
import BusinessOrders from './pages/business/BusinessOrders'
import PublicRequests from './pages/PublicRequests'
import ManagerHome from './pages/manager/ManagerHome'
import BusinessHome from './pages/business/BusinessHome'

// "/" → signed-in users go to their portal, visitors to the public request board (landing page comes later)
function Root() {
  const { session, profile, loading } = useAuth()
  if (loading) return <Loader />
  if (!session) return <Navigate to="/requests" replace />
  if (!profile) return <Loader label="Setting up your account" />
  return <Navigate to={profile.status === 'active' ? homeFor(profile.role) : '/pending'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <UiProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pending" element={<Pending />} />
          <Route path="/requests" element={<PublicRequests />} />

          <Route element={<ProtectedRoute allow={['farmer', 'customer']} />}>
            <Route path="/mobile-only" element={<MobileOnly />} />
          </Route>

          <Route element={<ProtectedRoute allow={['super_admin']} />}>
            <Route path="/admin" element={<DashboardLayout />}>
              <Route index element={<AdminHome />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="users" element={<Users />} />
              <Route path="bulk-market" element={<BulkMarket />} />
              <Route path="*" element={<ModuleSoon />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allow={['area_manager']} />}>
            <Route path="/manager" element={<DashboardLayout />}>
              <Route index element={<ManagerHome />} />
              <Route path="bulk-requests" element={<BulkRequests />} />
              <Route path="bulk-requests/:id" element={<RequestDetail />} />
              <Route path="bulk-orders" element={<BulkOrders />} />
              <Route path="*" element={<ModuleSoon />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allow={['business']} />}>
            <Route path="/business" element={<DashboardLayout />}>
              <Route index element={<BusinessHome />} />
              <Route path="requirements" element={<Requirements />} />
              <Route path="requirements/new" element={<NewRequirement />} />
              <Route path="requirements/:id" element={<RequirementDetail />} />
              <Route path="orders" element={<BusinessOrders />} />
              <Route path="*" element={<ModuleSoon />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </UiProvider>
    </AuthProvider>
  )
}
