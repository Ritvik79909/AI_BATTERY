import React, { useState, useEffect } from 'react';
import { Car, FileText, Plus, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import VehicleForm from '../components/vehicle/VehicleForm';
import DocumentUploadPanel from '../components/vehicle/DocumentUploadPanel';
import VehicleCard from '../components/vehicle/VehicleCard';
import { vehicleService } from '../services/vehicleService';
import type { Vehicle } from '../types/vehicle';
import '../pages/Login.css'; // Reuse Login styles for consistency
import './VehicleSetupPage.css';

const VehicleSetupPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'manual' | 'smart'>('manual');
  const [view, setView] = useState<'list' | 'add'>('list');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await vehicleService.getVehicles();
      console.log('Fetched vehicles:', data);

      if (Array.isArray(data)) {
        setVehicles(data);
        if (data.length === 0) {
          setView('add');
        } else {
          setView('list');
        }
      } else {
        console.error('Vehicles data is not an array:', data);
        // Fallback: check if it's wrapped in a 'data' property or similar, otherwise empty
        const possibleArray = (data as any).data || (data as any).vehicles || [];
        if (Array.isArray(possibleArray)) {
          setVehicles(possibleArray);
          setView(possibleArray.length > 0 ? 'list' : 'add');
        } else {
          setVehicles([]);
          setView('add');
        }
      }
    } catch (err) {
      console.error('Failed to fetch vehicles', err);
      setError('Failed to load vehicles. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleSuccess = () => {
    fetchVehicles(); // Refetch and switch to list
    setView('list');
  };

  return (
    <div className="vehicle-setup-container">
      <Navbar />

      {error && (
        <div className="error-banner" style={{
          background: '#FEE2E2',
          color: '#B91C1C',
          padding: '1rem',
          margin: '1rem 2rem',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {view === 'list' && !loading && vehicles.length > 0 ? (
        <div className="vehicle-list-container">
          <div className="list-header">
            <h1>Vehicle Management</h1>
            <p>Manage your electric vehicles for personalized battery insights</p>
          </div>

          <div className="vehicle-grid">
            {vehicles.map(v => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}

            <div className="add-vehicle-card" onClick={() => setView('add')}>
              <div className="add-icon-wrapper">
                <Plus size={32} color="#10b981" />
              </div>
              <span>Add New Vehicle</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="vehicle-setup-card">
          {vehicles.length > 0 && (
            <button className="back-btn" onClick={() => setView('list')}>
              <ChevronLeft size={16} /> Back to My Vehicles
            </button>
          )}

          <h1 className="vehicle-title">Add Your Vehicle</h1>
          <p className="vehicle-subtitle">Choose how you want to add your EV details</p>

          <div className="setup-tabs">
            <button
              className={`setup-tab ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              <Car size={20} />
              Manual Entry
            </button>
            <button
              className={`setup-tab ${activeTab === 'smart' ? 'active' : ''}`}
              onClick={() => setActiveTab('smart')}
            >
              <FileText size={20} />
              Smart Upload
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'manual' ? (
              <div className="fade-in">
                <VehicleForm onSuccess={handleSuccess} />
              </div>
            ) : (
              <div className="fade-in">
                <DocumentUploadPanel onSuccess={handleSuccess} />
                {/* Note: DocumentUploadPanel might need logic to pass data to VehicleForm if they are separate.
                    For now, assuming DocumentUploadPanel handles its flow or we just switch tab.
                    Actually, Previous implementation passed `initialData`?
                    Let's check previous code.
                */}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleSetupPage;
