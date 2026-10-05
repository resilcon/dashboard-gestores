import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

const LoginPage = lazy(() => import('@/pages/Login'))
const DashboardPage = lazy(() => import('@/pages/Dashboard'))
const TeamPage = lazy(() => import('@/pages/Team'))
const TasksPage = lazy(() => import('@/pages/Tarefas'))
const JustificationsPage = lazy(() => import('@/pages/Justifications'))
const AdministrationPage = lazy(() => import('@/pages/Administration'))

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="equipe" element={<TeamPage />} />
          <Route path="tarefas" element={<TasksPage />} />
          <Route path="justificativas" element={<JustificationsPage />} />
          <Route path="administracao" element={<AdministrationPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
