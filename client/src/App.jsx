import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboards";
import ForgotPassword from "./pages/forgotPassword";
import History from "./pages/History";
import JobMatcher from "./pages/JobMatcher";

function App() {

  return (

    <Routes>

      <Route path="/" element={<Home />} />

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route path="/dashboard" element={<Dashboard />} />

      <Route path="/history" element={<History />} />

      <Route path="/job-match" element={<JobMatcher />} />

    </Routes>

  );

}

export default App;
