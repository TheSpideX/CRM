import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from "react-router-dom";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { store } from "@/store";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { AuthGuard } from "@/features/auth/components/AuthGuard/AuthGuard";
import { ThemeProvider } from "@/components/providers/ThemeProvider/ThemeProvider";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from './core/errors/ErrorBoundary';
import { SessionAlert } from '@/features/auth/components/SessionAlert/SessionAlert';
import { SessionTimeout } from '@/features/auth/components/SessionTimeout/SessionTimeout';
import { APP_ROUTES } from '@/config/routes';
import { lazyLoad } from './utils/lazyLoad';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { ServerStatusIndicator } from '@/components/ui/ServerStatusIndicator';

// Define RootLayout component first
const RootLayout = () => {
  return (
    <>
      <Outlet />
      <Toaster position="top-right" />
      <SessionAlert />
      <SessionTimeout />
      {process.env.NODE_ENV !== 'production' && <ServerStatusIndicator />}
    </>
  );
};

// Then define routes using the RootLayout
const routes = [
  {
    path: APP_ROUTES.COMMON.HOME,
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Navigate to={APP_ROUTES.AUTH.LOGIN} replace />,
      },
      {
        path: APP_ROUTES.AUTH.ROOT,
        children: [
          {
            path: 'login',
            element: <LoginPage />,
          },
          {
            path: 'register',
            element: <RegisterPage />,
          },
        ],
      },
      {
        path: 'dashboard',
        element: (
          <AuthGuard>
            <DashboardPage />
          </AuthGuard>
        ),
      },
    ],
  },
];

// Create router instance
const router = createBrowserRouter(routes);

export function App() {
  useEffect(() => {
    const handleOnlineStatus = () => {
      if (!navigator.onLine) {
        toast.warning('You are currently offline. Some features may be limited.');
      }
    };

    window.addEventListener('offline', handleOnlineStatus);
    return () => window.removeEventListener('offline', handleOnlineStatus);
  }, []);

  return (
    <Provider store={store}>
      <QueryClientProvider client={new QueryClient()}>
        <ThemeProvider>
          <ErrorBoundary>
            <RouterProvider router={router} />
          </ErrorBoundary>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
