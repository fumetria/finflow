import { RouterProvider } from 'react-router';
import { router } from './router';
import AuthProvider from '@/features/auth/AuthProvider';
import ThemeProvider from '@/features/theme/ThemeProvider';

export default function Providers() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}
