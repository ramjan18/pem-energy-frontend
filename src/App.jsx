import { useState, useEffect } from 'react';
import { tokenAPI } from './api';
import { ThemeProvider } from './context/ThemeContext';
import WelcomeScreen from './components/WelcomeScreen';
import ManagerLogin from './components/ManagerLogin';
import RecorderLogin from './components/RecorderLogin';
import ManagerDashboard from './components/ManagerDashboard';
import RecorderDashboard from './components/RecorderDashboard';

function AppContent() {
  const [screen, setScreen] = useState('welcome'); // welcome | managerLogin | recorderLogin | manager | recorder
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = tokenAPI.getToken();
    if (token) {
      // Try to restore user session from localStorage if available
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          setScreen(user.role === 'manager' ? 'manager' : 'recorder');
        } catch (e) {
          console.error('Failed to parse saved user:', e);
          tokenAPI.removeToken();
        }
      }
    }
  }, []);

  const login = (user) => {
    setCurrentUser(user);
    // Save user info to localStorage
    localStorage.setItem('currentUser', JSON.stringify(user));
    setScreen(user.role === 'manager' ? 'manager' : 'recorder');
  };

  const logout = () => {
    setCurrentUser(null);
    tokenAPI.removeToken();
    localStorage.removeItem('currentUser');
    setScreen('welcome');
  };

  return (
    <>
      {screen === 'welcome' && (
        <WelcomeScreen
          onSelectManager={() => setScreen('managerLogin')}
          onSelectRecorder={() => setScreen('recorderLogin')}
        />
      )}
      {screen === 'managerLogin' && (
        <ManagerLogin onBack={() => setScreen('welcome')} onLogin={login} />
      )}
      {screen === 'recorderLogin' && (
        <RecorderLogin onBack={() => setScreen('welcome')} onLogin={login} />
      )}
      {screen === 'manager' && currentUser && (
        <ManagerDashboard user={currentUser} onLogout={logout} />
      )}
      {screen === 'recorder' && currentUser && (
        <RecorderDashboard user={currentUser} onLogout={logout} />
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
