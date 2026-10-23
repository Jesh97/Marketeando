import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import DashboardEmpty from './pages/DashboardEmpty'
import Editor from './pages/Editor'
import EditorCanvas from './pages/EditorCanvas'
import Home from './pages/Home'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Products from './pages/Products'
import PublicMenu from './pages/PublicMenu'
import QrPersonalizado from './pages/QrPersonalizado'
import Settings from './pages/Settings'
import Subscription from './pages/Subscription'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />
      {/* El pago de planes vive en /subscription (Yape); se mantiene la ruta
          por si quedó algún enlace viejo. */}
      <Route path="/checkout" element={<Navigate to="/subscription" replace />} />
      <Route path="/menu/:slug" element={<PublicMenu />} />
      <Route path="/menu/:slug/:local_slug" element={<PublicMenu />} />
      <Route path="/status" element={<Home />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/empty" element={<DashboardEmpty />} />
        <Route path="/products" element={<Products />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/editor/:id" element={<EditorCanvas />} />
        <Route path="/qr-personalizado" element={<QrPersonalizado />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
