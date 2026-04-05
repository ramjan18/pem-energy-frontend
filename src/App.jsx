import { useState, useEffect } from 'react';
import { initStorage } from './storage';
import WelcomeScreen from './components/WelcomeScreen';
import ManagerLogin from './components/ManagerLogin';
import RecorderLogin from './components/RecorderLogin';
import ManagerDashboard from './components/ManagerDashboard';
import RecorderDashboard from './components/RecorderDashboard';

export default function App() {
  const [screen, setScreen] = useState('welcome'); // welcome | managerLogin | recorderLogin | manager | recorder
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { initStorage(); }, []);

  const login = (user) => {
    setCurrentUser(user);
    setScreen(user.type === 'manager' ? 'manager' : 'recorder');
  };

  const logout = () => {
    setCurrentUser(null);
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
