import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('curefit_token'));
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user if token exists
  const refreshUser = async () => {
    const storedToken = localStorage.getItem('curefit_token');
    if (!storedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${storedToken}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Token invalid or expired
        localStorage.removeItem('curefit_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to authenticate session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid credentials' };
      }

      localStorage.setItem('curefit_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Network error occurred during login' };
    }
  };

  const register = async (data) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Registration failed' };
      }

      localStorage.setItem('curefit_token', resData.token);
      setToken(resData.token);
      setUser(resData.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Network error occurred during registration' };
    }
  };

  const oauthLogin = async (provider = 'Google OAuth', customEmail, customName) => {
    try {
      const res = await fetch('/api/auth/oauth-mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          email: customEmail || 'usethinkpad27@gmail.com',
          name: customName || 'Rahul Sharma'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'OAuth login failed' };
      }

      localStorage.setItem('curefit_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'OAuth error occurred' };
    }
  };

  const logout = () => {
    localStorage.removeItem('curefit_token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data) => {
    if (!token) return { success: false, error: 'Unauthorized' };

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Failed to update profile' };
      }

      setUser(resData.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Update failed' };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!token) return { success: false, error: 'Unauthorized' };

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Failed to change password' };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Password update failed' };
    }
  };

  const updatePreferences = async (preferences) => {
    if (!token) return { success: false, error: 'Unauthorized' };

    try {
      const res = await fetch('/api/auth/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(preferences)
      });

      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Failed to update preferences' };
      }

      if (user) {
        setUser({ ...user, preferences: resData.preferences });
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Preferences update failed' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        oauthLogin,
        logout,
        updateProfile,
        changePassword,
        updatePreferences,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};