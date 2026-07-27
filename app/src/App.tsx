import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { ClientsPage } from './pages/ClientsPage'
import { ClientDetailPage } from './pages/ClientDetailPage'
import { SalesNotePage } from './pages/SalesNotePage'
import { SalesNotesHistoryPage } from './pages/SalesNoteHistoryPage'
import { SalesNoteDetailPage } from './pages/SalesNoteDetailPage'


function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path='/clients/:clientId' element ={<ClientDetailPage/>} />
        <Route path="/sales/new" element={<SalesNotePage />} />
        <Route path='/sales' element={<SalesNotesHistoryPage/>} />
        <Route path='/sales/:noteId' element={<SalesNoteDetailPage/>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App