import { createBrowserRouter, Navigate } from 'react-router'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/features/dashboard/Dashboard'
import AccountsPage from '@/features/accounts/Accounts'
import ExpensesPage from '@/features/expenses/Expenses'
import ProtectedRoute from '@/components/layout/ProtectedRoute'


export const router = createBrowserRouter([
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/',
        element: <ProtectedRoute />,
        children: [
            {
                element: <AppLayout />,
                children: [
                    { index: true, element: <Navigate to="/dashboard" replace /> },
                    { path: 'dashboard', element: <DashboardPage /> },
                    { path: 'accounts', element: <AccountsPage /> },
                    { path: 'expenses', element: <ExpensesPage /> },
                ]
            }
        ],
    },
])