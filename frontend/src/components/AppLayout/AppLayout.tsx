import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import CloudscapeAppLayout from '@cloudscape-design/components/app-layout'
import SideNavigation, { SideNavigationProps } from '@cloudscape-design/components/side-navigation'
import TopNavigation from '@cloudscape-design/components/top-navigation'
import { useAuthStore } from '../../store/authStore'
import client from '../../api/client'

const menuAdmin: SideNavigationProps.Item[] = [
  { type: 'link', text: 'Dashboard', href: '/dashboard' },
  { type: 'link', text: 'Custos por Colaborador', href: '/custos/colaboradores' },
  { type: 'link', text: 'Certificacoes por Colaborador', href: '/certificacoes' },
  { type: 'link', text: 'Custos por Departamento', href: '/custos/departamentos' },
  { type: 'divider' },
  {
    type: 'section',
    text: 'Configuracoes',
    items: [
      { type: 'link', text: 'Colaboradores', href: '/colaboradores' },
      { type: 'link', text: 'Departamentos', href: '/configuracoes/departamentos' },
      { type: 'link', text: 'Importacao', href: '/importacao' },
      { type: 'link', text: 'Lancamento de Custo', href: '/lancamento' },
      { type: 'link', text: 'Parametros de Calculo', href: '/configuracoes/parametros' },
      { type: 'link', text: 'Tabela Salarial', href: '/configuracoes/tabela-salarial' },
      { type: 'link', text: 'Usuarios', href: '/configuracoes/usuarios' },
    ],
  },
]

const menuComum: SideNavigationProps.Item[] = [
  { type: 'link', text: 'Dashboard', href: '/dashboard' },
]

const ROTAS_ADMIN = [
  '/colaboradores',
  '/configuracoes',
  '/importacao',
  '/lancamento',
  '/custos',
]

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayoutWrapper({ children }: AppLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { usuario, logout } = useAuthStore()
  const isAdmin = usuario?.is_admin ?? false

  React.useEffect(() => {
    if (!isAdmin && ROTAS_ADMIN.some((r) => location.pathname.startsWith(r))) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAdmin, location.pathname, navigate])

  const handleLogout = async () => {
    try { await client.post('/auth/logout') } catch {}
    logout()
    navigate('/login')
  }

  return (
    <>
      <TopNavigation
        identity={{ href: '/dashboard', title: 'CloudDog - Gestao de Custos' }}
        utilities={[
          {
            type: 'menu-dropdown',
            text: usuario?.nome || 'Usuario',
            description: isAdmin ? 'Administrador' : 'Usuario comum',
            items: [{ id: 'logout', text: 'Sair' }],
            onItemClick: ({ detail }) => {
              if (detail.id === 'logout') handleLogout()
            },
          },
        ]}
      />
      <CloudscapeAppLayout
        navigation={
          <SideNavigation
            activeHref={location.pathname}
            header={{ text: 'Menu', href: '/dashboard' }}
            items={isAdmin ? menuAdmin : menuComum}
            onFollow={(e) => {
              e.preventDefault()
              navigate(e.detail.href)
            }}
          />
        }
        content={children}
        toolsHide
        navigationWidth={240}
      />
    </>
  )
}
