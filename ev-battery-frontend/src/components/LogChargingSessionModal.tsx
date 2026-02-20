import React, { useState, useEffect } from 'react';
import { FaTimes, FaBolt } from 'react-icons/fa';
import { chargingSessionService } from '../services/chargingSessionService';
import type { Vehicle } from '../types/vehicle';
import type { ChargingType, ChargingLocation } from '../types/chargingSession';
import './LogChargingSessionModal.css';

interface LogChargingSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionLogged: () => void;
  vehicles: Vehicle[];
}

const LogChargingSessionModal: React.FC<LogChargingSessionModalProps> = ({
  isOpen,
  onClose,
  onSessionLogged,
  vehicles
}) => {
  const [formData, setFormData] = useState({
    vehicleId: '',
    startTime: '',
    endTime: '',
    startSoc: '',
    endSoc: '',
    chargingType: 'SLOW' as ChargingType,
    location: 'HOME' as ChargingLocation
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-select first vehicle when modal opens
  useEffect(() => {
    if (isOpen && vehicles.length > 0 && !formData.vehicleId) {
      setFormData(prev => ({ ...prev, vehicleId: vehicles[0].id }));
    }
  }, [isOpen, vehicles, formData.vehicleId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        vehicleId: vehicles.length > 0 ? vehicles[0].id : '',
        startTime: '',
        endTime: '',
        startSoc: '',
        endSoc: '',
        chargingType: 'SLOW',
        location: 'HOME'
      });
      setErrors({});
      setToast(null);
    }
  }, [isOpen, vehicles]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.vehicleId) {
      newErrors.vehicleId = 'Please select a vehicle';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }

    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      if (end <= start) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    if (!formData.startSoc) {
      newErrors.startSoc = 'Start SoC is required';
    } else {
      const startSoc = parseFloat(formData.startSoc);
      if (isNaN(startSoc) || startSoc < 0 || startSoc > 100) {
        newErrors.startSoc = 'Start SoC must be between 0 and 100';
      }
    }

    if (!formData.endSoc) {
      newErrors.endSoc = 'End SoC is required';
    } else {
      const endSoc = parseFloat(formData.endSoc);
      if (isNaN(endSoc) || endSoc < 0 || endSoc > 100) {
        newErrors.endSoc = 'End SoC must be between 0 and 100';
      }
    }

    if (formData.startSoc && formData.endSoc) {
      const startSoc = parseFloat(formData.startSoc);
      const endSoc = parseFloat(formData.endSoc);
      if (!isNaN(startSoc) && !isNaN(endSoc) && endSoc <= startSoc) {
        newErrors.endSoc = 'End SoC must be greater than start SoC';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setToast(null);

    try {
      await chargingSessionService.logSession({
        vehicleId: parseInt(formData.vehicleId),
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        startSoc: parseFloat(formData.startSoc),
        endSoc: parseFloat(formData.endSoc),
        chargingType: formData.chargingType,
        location: formData.location,
        source: 'MANUAL'
      });

      setToast({ type: 'success', message: 'Charging session logged successfully!' });

      // Wait a moment to show success, then close and refresh
      setTimeout(() => {
        onSessionLogged();
        onClose();
      }, 1000);

    } catch (err) {
      console.error('Error logging session:', err);
      setToast({ type: 'error', message: 'Failed to log charging session. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <FaBolt size={24} color="#10b981" />
            <h2>Log Charging Session</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <FaTimes size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="charging-form">
          {/* Vehicle Selection */}
          <div className="form-group">
            <label htmlFor="vehicleId">Vehicle</label>
            <select
              id="vehicleId"
              name="vehicleId"
              value={formData.vehicleId}
              onChange={handleChange}
              className={errors.vehicleId ? 'error' : ''}
            >
              <option value="">Select a vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.nickname} ({vehicle.make} {vehicle.model})
                </option>
              ))}
            </select>
            {errors.vehicleId && <span className="error-message">{errors.vehicleId}</span>}
          </div>

          {/* Start Time */}
          <div className="form-group">
            <label htmlFor="startTime">Start Time</label>
            <input
              type="datetime-local"
              id="startTime"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              className={errors.startTime ? 'error' : ''}
            />
            {errors.startTime && <span className="error-message">{errors.startTime}</span>}
          </div>

          {/* End Time */}
          <div className="form-group">
            <label htmlFor="endTime">End Time</label>
            <input
              type="datetime-local"
              id="endTime"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className={errors.endTime ? 'error' : ''}
            />
            {errors.endTime && <span className="error-message">{errors.endTime}</span>}
          </div>

          {/* Start SoC */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startSoc">Start SoC (%)</label>
              <input
                type="number"
                id="startSoc"
                name="startSoc"
                value={formData.startSoc}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.1"
                placeholder="0-100"
                className={errors.startSoc ? 'error' : ''}
              />
              {errors.startSoc && <span className="error-message">{errors.startSoc}</span>}
            </div>

            {/* End SoC */}
            <div className="form-group">
              <label htmlFor="endSoc">End SoC (%)</label>
              <input
                type="number"
                id="endSoc"
                name="endSoc"
                value={formData.endSoc}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.1"
                placeholder="0-100"
                className={errors.endSoc ? 'error' : ''}
              />
              {errors.endSoc && <span className="error-message">{errors.endSoc}</span>}
            </div>
          </div>

          {/* Charging Type */}
          <div className="form-group">
            <label htmlFor="chargingType">Charging Type</label>
            <select
              id="chargingType"
              name="chargingType"
              value={formData.chargingType}
              onChange={handleChange}
            >
              <option value="SLOW">Slow Charging</option>
              <option value="AC_FAST">AC Fast Charging</option>
              <option value="DC_FAST">DC Fast Charging</option>
            </select>
          </div>

          {/* Location */}
          <div className="form-group">
            <label htmlFor="location">Location</label>
            <select
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
            >
              <option value="HOME">Home</option>
              <option value="WORKPLACE">Workplace</option>
              <option value="PUBLIC">Public</option>
              <option value="STATION">Charging Station</option>
            </select>
          </div>

          {/* Toast Notification */}
          {toast && (
            <div className={`toast toast-${toast.type}`}>
              {toast.message}
            </div>
          )}

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Logging...' : 'Log Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LogChargingSessionModal;
