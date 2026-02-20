import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBolt, FaCar } from 'react-icons/fa';
import { authService } from '../services/authService';
import '../pages/Dashboard.css'; // Reusing dashboard styles for consistency

interface NavbarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleVehicleSetup = () => {
    navigate('/vehicle-setup');
  };

  const handleTabClick = (tabName: string) => {
    if (location.pathname === '/dashboard' && onTabChange) {
      onTabChange(tabName.toLowerCase());
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <header className="dash-header">
      <div className="dash-brand" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
        <FaBolt size={24} color="#10b981" />
        <span>AI-Based Battery Optimization</span>
      </div>

      <nav className="dash-nav">
        {['Dashboard', 'Telemetry', 'Battery Health', 'Charging History', 'Charging Habits', 'Charging Optimization', 'AI Coach'].map((item) => (
          <div
            key={item}
            className={`dash-nav-item ${activeTab === item.toLowerCase() ? 'active' : ''}`}
            onClick={() => {
              if (item === 'Telemetry') {
                navigate('/telemetry');
              } else if (item === 'Battery Health') {
                navigate('/battery-health');
              } else if (item === 'Charging History') {
                navigate('/charging-history');
              } else if (item === 'Charging Habits') {
                navigate('/charging-habits');
              } else if (item === 'Charging Optimization') {
                navigate('/charging-optimization');
              } else if (item === 'AI Coach') {
                navigate('/ai-coach');
              } else if (item === 'Dashboard') {
                navigate('/dashboard');
              } else {
                handleTabClick(item);
              }
            }}
          >
            {item}
          </div>
        ))}
      </nav>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div className="user-profile" onClick={handleVehicleSetup} title="Manage Vehicle">
          <div className="icon-btn">
            <FaCar size={20} color="#4b5563" />
          </div>
        </div>

        <div className="user-profile" onClick={handleLogout} title="Click to Logout">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
            alt="User"
            className="avatar"
          />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
