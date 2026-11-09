import { RouterProvider } from 'react-router-dom'
import ThemeProvider from '@/contexts/ThemeProvider'
import ModeProvider from '@/contexts/ModeProvider'
import UIModeProvider from '@/contexts/UIModeProvider'
import NotificationProvider from '@/contexts/NotificationProvider'
import AuthProvider from '@/contexts/AuthProvider'
import { router } from '@/routes'

export default function App() {
  return (
    <ThemeProvider>
      <ModeProvider>
        <UIModeProvider>
          <NotificationProvider>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
          </NotificationProvider>
        </UIModeProvider>
      </ModeProvider>
    </ThemeProvider>
  )
}
