import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { TahunProvider } from './contexts/TahunContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DataLomba from './pages/DataLomba'
import DataPeserta from './pages/DataPeserta'
import DataJuara from './pages/DataJuara'
import StatistikPeserta from './pages/StatistikPeserta'
import LandingPage from './pages/LandingPage'
import LombaDetail from './pages/LombaDetail'

function App() {
  return (
    <AuthProvider>
      <TahunProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/lomba/:id" element={<LombaDetail />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/lomba" element={<DataLomba />} />
                    <Route path="/peserta" element={<DataPeserta />} />
                    <Route path="/juara" element={<DataJuara />} />
                    <Route path="/statistik" element={<StatistikPeserta />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
      </TahunProvider>
    </AuthProvider>
  )
}

export default App