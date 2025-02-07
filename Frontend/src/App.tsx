import {
  createBrowserRouter,
  RouterProvider,
  UNSAFE_DataRouterContext,
  UNSAFE_DataRouterStateContext,
} from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import FeaturesPage from "./pages/FeaturesPage";
import "./App.css";

const router = createBrowserRouter(
  [
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
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
