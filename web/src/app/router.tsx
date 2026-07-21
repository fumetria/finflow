import { createBrowserRouter, Navigate } from 'react-router';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/features/auth/LoginPage';
import VerifyEmailPage from '@/features/auth/VerifyEmailPage';
import DashboardPage from '@/features/dashboard/Dashboard';
import AccountsPage from '@/features/accounts/Accounts';
import ExpensesPage from '@/features/expenses/Expenses';
import CategoriesPage from '@/features/expenses_categories/Categories';
import RecurringPage from '@/features/recurring/Recurring';
import LoansPage from '@/features/loans/Loans';
import LoanDetailPage from '@/features/loans/LoanDetail';
import ProtectedRoute from '@/components/layout/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/verify-email',
    element: <VerifyEmailPage />,
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
          { path: 'categories', element: <CategoriesPage /> },
          { path: 'recurring', element: <RecurringPage /> },
          { path: 'loans', element: <LoansPage /> },
          { path: 'loans/:id', element: <LoanDetailPage /> },
        ],
      },
    ],
  },
]);
