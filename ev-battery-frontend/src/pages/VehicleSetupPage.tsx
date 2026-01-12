import React, { useState } from 'react';
import { Car, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VehicleForm from '../components/vehicle/VehicleForm';
import DocumentUploadPanel from '../components/vehicle/DocumentUploadPanel';
import '../pages/Login.css'; // Reuse Login styles for consistency
import './VehicleSetupPage.css';

const VehicleSetupPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'manual' | 'smart'>('manual');
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <div className="vehicle-setup-container">
      <div className="vehicle-setup-card">
        <h1 className="vehicle-title">Add Your Vehicle</h1>
        <p className="vehicle-subtitle">Choose how you want to add your EV details</p>

        <div className="setup-tabs">
          <button
            className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            <Car size={20} />
            Manual Entry
          </button>
          <button
            className={`tab-btn ${activeTab === 'smart' ? 'active' : ''}`}
            onClick={() => setActiveTab('smart')}
          >
            <FileText size={20} />
            Smart Upload
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'manual' ? (
            <VehicleForm onSuccess={handleSuccess} />
          ) : (
            <DocumentUploadPanel onSuccess={handleSuccess} />
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleSetupPage;
