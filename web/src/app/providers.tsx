import { RouterProvider } from 'react-router';
import { router } from './router';
import AuthProvider from '@/features/auth/AuthProvider';

export default function Providers() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
