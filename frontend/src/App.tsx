import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AppLayoutWrapper from './components/AppLayout/AppLayout'
import Login from './pages/Login/Login'
import Dashboard from './pages/Dashboard/Dashboard'
import Colaboradores from './pages/Colaboradores/Colaboradores'
import CustoColaborador from './pages/CustoColaborador/CustoColaborador'
import CustoDepartamento from './pages/CustoDepartamento/CustoDepartamento'
import Importacao from './pages/Importacao/Importacao'
import LancamentoCusto from './pages/LancamentoCusto/LancamentoCusto'
import ParametrosCalculo from './pages/configuracoes/ParametrosCalculo/ParametrosCalculo'
import TabelaSalarial from './pages/configuracoes/TabelaSalarial/TabelaSalarial'
import Departamentos from './pages/configuracoes/Departamentos/Departamentos'
import Usuarios from './pages/configuracoes/Usuarios/Usuarios'
import CertificacoesColaborador from './pages/CertificacoesColaborador/CertificacoesColaborador'
import Guia from './pages/Guia/Guia'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  return isAuthenticated ? (
    <AppLayoutWrapper>{children}</AppLayoutWrapper>
  ) : (
    <Navigate to="/login" replace />
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/colaboradores"
        element={
          <ProtectedRoute>
            <Colaboradores />
          </ProtectedRoute>
        }
      />
      <Route
        path="/custos/colaboradores"
        element={
          <ProtectedRoute>
            <CustoColaborador />
          </ProtectedRoute>
        }
      />
      <Route
        path="/custos/departamentos"
        element={
          <ProtectedRoute>
            <CustoDepartamento />
          </ProtectedRoute>
        }
      />
      <Route
        path="/importacao"
        element={
          <ProtectedRoute>
            <Importacao />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lancamento"
        element={
          <ProtectedRoute>
            <LancamentoCusto />
          </ProtectedRoute>
        }
      />
            <Route
        path="/guia"
        element={
          <ProtectedRoute>
            <Guia />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes/parametros"
        element={
          <ProtectedRoute>
            <ParametrosCalculo />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes/tabela-salarial"
        element={
          <ProtectedRoute>
            <TabelaSalarial />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes/departamentos"
        element={
          <ProtectedRoute>
            <Departamentos />
          </ProtectedRoute>
        }
      />
            <Route
        path="/certificacoes"
        element={
          <ProtectedRoute>
            <CertificacoesColaborador />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes/usuarios"
        element={
          <ProtectedRoute>
            <Usuarios />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

