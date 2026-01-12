import React from 'react';
import { FaCar, FaMotorcycle, FaTrash, FaPen } from 'react-icons/fa';
import type { Vehicle } from '../../types/vehicle';
import './VehicleCard.css';

interface VehicleCardProps {
  vehicle: Vehicle;
  onEdit?: (vehicle: Vehicle) => void;
  onDelete?: (id: string) => void;
}

import carImg from '../../assets/vehicles/car.png';
import bikeImg from '../../assets/vehicles/bike.jpg';
import scooterImg from '../../assets/vehicles/scooter.jpg';

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onEdit, onDelete }) => {
  // Determine icon/image based on vehicleType
  const typeImages: Record<string, string> = {
    'Car': carImg,
    'Bike': bikeImg,
    'Scooter': scooterImg
  };

  const imageSrc = typeImages[vehicle.vehicleType] || carImg;
  const Icon = vehicle.vehicleType === 'Bike' || vehicle.vehicleType === 'Scooter' ? FaMotorcycle : FaCar;

  return (
    <div className="vehicle-card">
      <div className="vc-header">
        <div className="vc-icon-wrapper">
          <Icon className="vc-icon" />
        </div>
        <div className="vc-actions">
          {onEdit && <button className="vc-action-btn" onClick={() => onEdit(vehicle)}><FaPen /></button>}
          {onDelete && <button className="vc-action-btn delete" onClick={() => vehicle.id && onDelete(vehicle.id)}><FaTrash /></button>}
        </div>
      </div>

      <div className="vc-image-placeholder" style={{ background: 'none', padding: 0, overflow: 'hidden' }}>
        <img
          src={imageSrc}
          alt={vehicle.model}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      <div className="vc-details">
        <div className="vc-model-info">
          <span className="vc-label">Model Name</span>
          <h3 className="vc-model">{vehicle.nickname || vehicle.model}</h3>
        </div>

        <div className="vc-stats-grid">
          <div className="vc-stat">
            <span className="vc-stat-label">Battery Capacity</span>
            <span className="vc-stat-value">{vehicle.batteryCapacityKwh} kWh</span>
          </div>
          <div className="vc-stat">
            <span className="vc-stat-label">Vehicle Type</span>
            <span className="vc-stat-value">{vehicle.vehicleType}</span>
          </div>
        </div>

        <div className="vc-status-bar">
          <span className="vc-status-text">Active</span>
          <div className="vc-status-indicator">✓</div>
        </div>
      </div>
    </div>
  );
};

export default VehicleCard;
