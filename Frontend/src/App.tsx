import {
  createBrowserRouter,
  RouterProvider,
  UNSAFE_DataRouterContext,
  UNSAFE_DataRouterStateContext,
} from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import FeaturesPage from "./pages/FeaturesPage";
import PricingPage from "./pages/PricingPage";
import ResourcesPage from "./pages/ResourcesPage";
import AboutPage from "./pages/AboutPage";
import "./App.css";
import { CursorProvider } from './contexts/CursorContext';
import { CustomCursor } from './components/ui/CustomCursor';

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/features",
    element: <FeaturesPage />,
  },
  {
    path: "/pricing",
    element: <PricingPage />,
  },
  {
    path: "/resources",
    element: <ResourcesPage />,
  },
  {
    path: "/about",
    element: <AboutPage />,
  },
]);

function App() {
  return (
    <CursorProvider>
      <div className="app">
        {/* Hide default cursor */}
        <style jsx global>{`
          * {
            cursor: none !important;
          }
        `}</style>
        
        <CustomCursor />
        <RouterProvider router={router} />
      </div>
    </CursorProvider>
  );
}

export default App;
