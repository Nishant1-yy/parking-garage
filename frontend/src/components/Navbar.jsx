import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { token, user, logout } = useAuth();

  return (
    <div className="navbar">
      <Link to="/" className="brand" style={{ textDecoration: "none" }}>
        <span className="bar" />
        GANTRY
      </Link>
      <nav>
        {token ? (
          <>
            <NavLink to="/app" end>Floor</NavLink>
            <NavLink to="/app/sessions">Log</NavLink>
            <span style={{ color: "var(--text-muted)" }}>{user?.username}</span>
            <button onClick={logout}>Sign out</button>
          </>
        ) : (
          <>
            <NavLink to="/login">Sign in</NavLink>
            <Link to="/register"><button className="primary">Register</button></Link>
          </>
        )}
      </nav>
    </div>
  );
}
