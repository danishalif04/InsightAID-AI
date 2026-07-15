import { RouterProvider } from 'react-router-dom'
import ThemeProvider from '@/contexts/ThemeProvider'
import NotificationProvider from '@/contexts/NotificationProvider'
import AuthProvider from '@/contexts/AuthProvider'
import { router } from '@/routes'

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  )
}
