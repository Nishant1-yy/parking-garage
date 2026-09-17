import React from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Sessions from "./pages/Sessions.jsx";

function AppShell({ children }) {
  return (
    <div className="app-shell">
      <div className="sidebar">
        <NavLink to="/app" end>Floor &amp; check-in</NavLink>
        <NavLink to="/app/sessions">Session log</NavLink>
      </div>
      <div className="main">{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppShell><Dashboard /></AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/sessions"
          element={
            <ProtectedRoute>
              <AppShell><Sessions /></AppShell>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}
