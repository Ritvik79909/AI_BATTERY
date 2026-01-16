import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import LandingPage from './pages/LandingPage'
import OAuthSuccess from './pages/OAuthSuccess'
import Dashboard from './pages/Dashboard'
import VehicleSetupPage from './pages/VehicleSetupPage'
import BatteryTelemetryPage from './pages/BatteryTelemetryPage'
import PrivateRoute from './components/PrivateRoute'
import './App.css'

function App() {
  return (
    <Routes>
      {/* Root route - Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/oauth-success" element={<OAuthSuccess />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/vehicle-setup"
        element={
          <PrivateRoute>
            <VehicleSetupPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/telemetry"
        element={
          <PrivateRoute>
            <BatteryTelemetryPage />
          </PrivateRoute>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

