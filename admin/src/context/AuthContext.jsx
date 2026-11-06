// =====================================================
// AuthContext: who is logged in
//   token, name, role, login(email, password), logout()
//   role is "admin" for now (students can be added later)
// =====================================================
import { createContext, useContext, useState } from "react";
import { api, session } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(session.token);
  const [name, setName] = useState(session.name);
  const [role, setRole] = useState(session.role);

  async function login(email, password) {
    const data = await api("/auth/login", { method: "POST", body: { email, password } });
    session.save(data);
    setToken(data.token);
    setName(data.name);
    setRole(data.role);
    return data;
  }

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      /* already logged out on the server: nothing to do */
    }
    session.clear();
    setToken(null);
    setRole(null);
  }

  return <AuthContext.Provider value={{ token, name, role, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
