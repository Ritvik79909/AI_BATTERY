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
    year: new Date().getFullYear(),
    batteryCapacityKwh: 0,
    chemistry: 'NMC',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill form if initialData is provided (Smart Upload)
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' || name === 'batteryCapacityKwh' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
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

      <div className="form-group">
        <input
          type="text"
          name="nickname"
          placeholder="Nickname (e.g. My Tesla)"
          className="form-input"
          value={formData.nickname}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group half">
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
          <input
            type="text"
            name="model"
            placeholder="Model (e.g. Nexon EV)"
            className="form-input"
            value={formData.model}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group half">
          <input
            type="text"
            name="variant"
            placeholder="Variant (e.g. Max)"
            className="form-input"
            value={formData.variant}
            onChange={handleChange}
          />
        </div>
        <div className="form-group half">
          <input
            type="number"
            name="year"
            placeholder="Year"
            className="form-input"
            value={formData.year}
            onChange={handleChange}
            min="2010"
            max={new Date().getFullYear() + 1}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group half">
          <input
            type="number"
            name="batteryCapacityKwh"
            placeholder="Capacity (kWh)"
            className="form-input"
            value={formData.batteryCapacityKwh || ''}
            onChange={handleChange}
            step="0.1"
            required
          />
        </div>
        <div className="form-group half">
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

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Saving...' : 'Save Vehicle'}
      </button>

      <style>{`
        .form-row { display: flex; gap: 1rem; }
        .half { flex: 1; }
        .error-message { color: #EF4444; font-size: 0.9rem; margin-bottom: 1rem; text-align: center; }
      `}</style>
    </form>
  );
};

export default VehicleForm;
