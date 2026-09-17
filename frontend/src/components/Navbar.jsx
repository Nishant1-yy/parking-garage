import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { token, user, logout } = useAuth();

  return (
    <div className="navbar">
      <Link
        to="/"
        className="brand"
        style={{
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span className="bar" />

        <span
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            lineHeight: "1",
          }}
        >
          <span
            style={{
              fontSize: "36px",
              fontWeight: "800",
            }}
          >
            Gantry
          </span>

          <span
            style={{
              fontSize: "16px",
              fontWeight: "500",
              marginTop: "4px",
            }}
          >
            Parking Garage Control
          </span>
        </span>
      </Link>

      <nav>
        {token ? (
          <>
            <NavLink to="/app" end>
              Floor
            </NavLink>

            <NavLink to="/app/sessions">
              Log
            </NavLink>

            <span style={{ color: "var(--text-muted)" }}>
              {user?.username}
            </span>

            <button onClick={logout}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login">
              Sign in
            </NavLink>

            <Link to="/register">
              <button className="primary">
                Register
              </button>
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}