import React, { useState, useEffect } from 'react';
import { vehicleService } from '../../services/vehicleService';
import type { VehicleFormData } from '../../types/vehicle';

interface VehicleFormProps {
  initialData?: Partial<VehicleFormData>;
  onSuccess: () => void;
}

const VehicleForm: React.FC<VehicleFormProps> = ({ initialData, onSuccess }) => {
  const [formData, setFormData] = useState<VehicleFormData>({
    nickname: '',
    make: '',
    model: '',
    variant: '',
    year: null,
    vin: '',
    batteryCapacityKwh: null,
    usableCapacityKwh: null,
    ratedRangeKm: null,
    fastChargeSupported: false,
    maxAcPowerKw: null,
    maxDcPowerKw: null,
    chemistry: 'NMC',
    vehicleType: 'Car',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    // Handle Checkbox
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
      return;
    }

    // Handle Numbers
    const numericFields = ['year', 'batteryCapacityKwh', 'usableCapacityKwh', 'ratedRangeKm', 'maxAcPowerKw', 'maxDcPowerKw'];

    if (numericFields.includes(name)) {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? null : Number(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log("Vehicle payload", formData);
      await vehicleService.createVehicle(formData);
      onSuccess();
    } catch (err: any) {
      console.error('Vehicle creation failed:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to save vehicle. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="vehicle-form">
      {error && <div className="error-message">{error}</div>}

      <div className="form-section">
        <h3>Basic Vehicle Info</h3>
        <div className="form-group">
          <label>Nickname</label>
          <input
            type="text"
            name="nickname"
            placeholder="e.g. My Tesla"
            className="form-input"
            value={formData.nickname}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Vehicle Type</label>
          <div className="type-selector">
            {(['Car', 'Bike', 'Scooter'] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={`type-btn ${formData.vehicleType === type ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, vehicleType: type }))}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group half">
            <label>Make</label>
            <select
              name="make"
              className="form-input"
              value={formData.make}
              onChange={handleChange}
              required
            >
              <option value="">Select Make</option>
              <option value="Tesla">Tesla</option>
              <option value="Tata">Tata</option>
              <option value="Hyundai">Hyundai</option>
              <option value="MG">MG</option>
              <option value="Kia">Kia</option>
              <option value="BYD">BYD</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group half">
            <label>Model</label>
            <input
              type="text"
              name="model"
              placeholder="e.g. Nexon EV"
              className="form-input"
              value={formData.model}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group half">
            <label>Variant</label>
            <input
              type="text"
              name="variant"
              placeholder="e.g. Max"
              className="form-input"
              value={formData.variant}
              onChange={handleChange}
            />
          </div>
          <div className="form-group half">
            <label>Year</label>
            <input
              type="number"
              name="year"
              className="form-input"
              value={formData.year ?? ''}
              onChange={handleChange}
              min="2010"
              max={new Date().getFullYear() + 1}
              required
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Battery & Range</h3>
        <div className="form-row">
          <div className="form-group half">
            <label>Total Capacity (kWh)</label>
            <input
              type="number"
              name="batteryCapacityKwh"
              className="form-input"
              value={formData.batteryCapacityKwh || ''}
              onChange={handleChange}
              step="0.1"
              min="0.1"
              required
            />
          </div>
          <div className="form-group half">
            <label>Usable Capacity (kWh)</label>
            <input
              type="number"
              name="usableCapacityKwh"
              placeholder="Optional"
              className="form-input"
              value={formData.usableCapacityKwh ?? ''}
              onChange={handleChange}
              step="0.1"
              min="0.1"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group half">
            <label>Rated Range (km)</label>
            <input
              type="number"
              name="ratedRangeKm"
              placeholder="WLTP / ARAI"
              className="form-input"
              value={formData.ratedRangeKm ?? ''}
              onChange={handleChange}
              min="1"
            />
          </div>
          <div className="form-group half">
            <label>Chemistry</label>
            <select
              name="chemistry"
              className="form-input"
              value={formData.chemistry}
              onChange={handleChange}
              required
            >
              <option value="NMC">NMC (Nickel Manganese Cobalt)</option>
              <option value="LFP">LFP (Lithium Ion Phosphate)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Charging Capabilities</h3>
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="fastChargeSupported"
              checked={formData.fastChargeSupported}
              onChange={handleChange}
            />
            <span>Fast Charging Supported (DC)</span>
          </label>
        </div>

        <div className="form-row">
          <div className="form-group half">
            <label>Max AC Power (kW)</label>
            <input
              type="number"
              name="maxAcPowerKw"
              placeholder="e.g. 7.2"
              className="form-input"
              value={formData.maxAcPowerKw ?? ''}
              onChange={handleChange}
              step="0.1"
            />
          </div>
          <div className="form-group half">
            <label>Max DC Power (kW)</label>
            <input
              type="number"
              name="maxDcPowerKw"
              placeholder="e.g. 50"
              className="form-input"
              value={formData.maxDcPowerKw ?? ''}
              onChange={handleChange}
              step="1"
              disabled={!formData.fastChargeSupported}
            />
          </div>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Saving...' : 'Save Vehicle'}
      </button>

      <style>{`
        .form-section { margin-bottom: 2rem; }
        .form-section h3 { font-size: 1.1rem; color: #374151; margin-bottom: 1rem; border-bottom: 1px solid #E5E7EB; padding-bottom: 0.5rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-size: 0.9rem; margin-bottom: 0.3rem; color: #4B5563; font-weight: 500; }
        .form-row { display: flex; gap: 1rem; }
        .half { flex: 1; }
        .error-message { color: #EF4444; background: #FEE2E2; padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; text-align: center; font-size: 0.9rem; }
        .checkbox-group { display: flex; align-items: center; }
        .checkbox-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
        .checkbox-label input { width: 1.2rem; height: 1.2rem; cursor: pointer; }
        
        .type-selector { display: flex; gap: 1rem; margin-top: 0.5rem; }
        .type-btn {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #E5E7EB;
          background: white;
          border-radius: 8px;
          color: #4B5563;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .type-btn.active {
          border-color: #10B981;
          background: #ECFDF5;
          color: #065F46;
          font-weight: 600;
        }
        .type-btn:hover:not(.active) {
          background: #F9FAFB;
        }
      `}</style>
    </form>
  );
};

export default VehicleForm;
