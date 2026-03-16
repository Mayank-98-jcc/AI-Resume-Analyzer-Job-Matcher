import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboards";
import ForgotPassword from "./pages/forgotPassword";
import ResetSuccess from "./pages/ResetSuccess";
import History from "./pages/History";
import JobMatcher from "./pages/JobMatcher";
import Billing from "./pages/Billing";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAIMatching from "./pages/AdminAIMatching";
import AdminCandidates from "./pages/AdminCandidates";
import AdminPayments from "./pages/AdminPayments";
import AdminResumes from "./pages/AdminResumes";
import AdminSettings from "./pages/AdminSettings";
import AdminActivity from "./pages/AdminActivity";
import AdminUsers from "./pages/AdminUsers";
import AdminRoute from "./components/AdminRoute";

function App() {

  return (

    <Routes>

      <Route path="/" element={<Home />} />

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Signup />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route path="/reset-success" element={<ResetSuccess />} />

      <Route path="/dashboard" element={<Dashboard />} />

      <Route path="/history" element={<History />} />

      <Route path="/job-match" element={<JobMatcher />} />

      <Route path="/billing" element={<Billing />} />

      <Route
        path="/admin"
        element={(
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        )}
      />

      <Route
        path="/admin/users"
        element={(
          <AdminRoute>
            <AdminUsers />
          </AdminRoute>
        )}
      />

      <Route
        path="/admin/resumes"
        element={(
          <AdminRoute>
            <AdminResumes />
          </AdminRoute>
        )}
      />

      <Route
        path="/admin/activity"
        element={(
          <AdminRoute>
            <AdminActivity />
          </AdminRoute>
        )}
      />

      <Route
        path="/admin/candidates"
        element={(
          <AdminRoute>
            <AdminCandidates />
          </AdminRoute>
        )}
      />

      <Route
        path="/admin/ai-matching"
        element={(
          <AdminRoute>
            <AdminAIMatching />
          </AdminRoute>
        )}
      />

      <Route
        path="/admin/payments"
        element={(
          <AdminRoute>
            <AdminPayments />
          </AdminRoute>
        )}
      />

      <Route
        path="/admin/settings"
        element={(
          <AdminRoute>
            <AdminSettings />
          </AdminRoute>
        )}
      />

    </Routes>

  );

}

export default App;
