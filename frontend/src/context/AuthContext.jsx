import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("gantry_token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("gantry_token");
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function login(username, password) {
    const { access_token } = await api.login(username, password);
    localStorage.setItem("gantry_token", access_token);
    setToken(access_token);
  }

  async function register(username, password) {
    await api.register(username, password);
    await login(username, password);
  }

  function logout() {
    localStorage.removeItem("gantry_token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
