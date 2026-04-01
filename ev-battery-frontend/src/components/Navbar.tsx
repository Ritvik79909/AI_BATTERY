import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBolt, FaCar } from 'react-icons/fa';
import { authService } from '../services/authService';
import '../pages/Dashboard.css';

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
        {['Dashboard', 'Telemetry', 'Battery Health', 'Charging Optimization', 'Stations', 'AI Coach'].map((item) => (
          <div
            key={item}
            className={`dash-nav-item ${activeTab === item.toLowerCase() ? 'active' : ''}`}
            onClick={() => {
              if (item === 'Telemetry') {
                navigate('/telemetry');
              } else if (item === 'Battery Health') {
                navigate('/battery-health');

              } else if (item === 'Charging Optimization') {
                navigate('/charging-optimization');
              } else if (item === 'Stations') {
                navigate('/stations');
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

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <div className="user-profile" onClick={handleVehicleSetup} title="Manage Vehicle">
          <div className="icon-btn">
            <FaCar size={25} color="#35884dff" />
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: 'transparent',
            color: '#29ba60ff',
            border: '1px solid #3bbd5bff',
            padding: '0.4rem 1rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#fef2f2';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Navbar;
