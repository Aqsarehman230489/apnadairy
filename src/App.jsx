import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
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
import ManagerHome from './pages/manager/ManagerHome'
import BusinessHome from './pages/business/BusinessHome'

// "/" → send each user to their own home (landing page comes in step 2)
function Root() {
  const { session, profile, loading } = useAuth()
  if (loading) return <Loader />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Loader label="setting up your account" />
  return <Navigate to={profile.status === 'active' ? homeFor(profile.role) : '/pending'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pending" element={<Pending />} />

          <Route element={<ProtectedRoute allow={['farmer', 'customer']} />}>
            <Route path="/mobile-only" element={<MobileOnly />} />
          </Route>

          <Route element={<ProtectedRoute allow={['super_admin']} />}>
            <Route path="/admin" element={<DashboardLayout />}>
              <Route index element={<AdminHome />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="users" element={<Users />} />
              <Route path="*" element={<ModuleSoon />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allow={['area_manager']} />}>
            <Route path="/manager" element={<DashboardLayout />}>
              <Route index element={<ManagerHome />} />
              <Route path="*" element={<ModuleSoon />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allow={['business']} />}>
            <Route path="/business" element={<DashboardLayout />}>
              <Route index element={<BusinessHome />} />
              <Route path="*" element={<ModuleSoon />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
