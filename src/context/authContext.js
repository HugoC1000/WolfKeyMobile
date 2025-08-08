import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../api/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await authService.isAuthenticated();
      if (isAuth) {
        // Get user profile here if needed
        setUser({ isAuthenticated: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password, loadUser) => {
    const response = await authService.login(username, password, loadUser);
    setUser({ isAuthenticated: true, ...response.user });
  };

  const register = async (userData, loadUser) => {
    const response = await authService.register(userData, loadUser);
    setUser({ isAuthenticated: true, ...response.user });
    return response;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);