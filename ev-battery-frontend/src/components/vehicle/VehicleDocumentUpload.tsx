import React, { useState } from 'react';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { vehicleService } from '../../services/vehicleService';
import type { Vehicle } from '../../types/vehicle';

interface VehicleDocumentUploadProps {
  onSuccess: (vehicle: Vehicle) => void;
}

const VehicleDocumentUpload: React.FC<VehicleDocumentUploadProps> = ({ onSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndUpload = async (file: File) => {
    // Frontend Validation
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    // Check extension for stricter validation if needed, but MIME type is usually enough
    // Also checking extension just in case MIME type is missing or generic
    const validExtensions = ['.pdf', '.docx', '.doc'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      setError('Only PDF or Word documents are supported.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await vehicleService.uploadVehicleDocument(file);
      // NOTE: This component is legacy. Logic moved to DocumentUploadPanel.
      // We'll just pass a dummy vehicle or handle non-implementation.
      console.log('Draft ID:', response.draftId);
      // onSuccess(response as any); // Disable to avoid runtime crash or cast if needed
      setError('This component is deprecated. Please use Manual Entry or refresh.');
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.message || 'Failed to upload document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  return (
    <div className="upload-container">
      <div
        className={`drop-zone ${dragActive ? 'active' : ''} ${loading ? 'loading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {loading ? (
          <div className="status-view">
            <Loader2 size={40} className="spin-icon" color="#10B981" />
            <p>Uploading and extracting vehicle details...</p>
            <span className="sub-text">This may take a few moments</span>
          </div>
        ) : (
          <>
            <div className="icon-circle">
              <Upload size={32} color="#10B981" />
            </div>
            <h3>Upload Vehicle Document</h3>
            <p className="helper-text">
              Upload a vehicle invoice, registration certificate, or spec sheet (PDF or Word).
            </p>

            <input
              type="file"
              id="file-upload"
              className="hidden-input"
              accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              onChange={handleChange}
              disabled={loading}
            />
            <label htmlFor="file-upload" className="btn btn-primary upload-btn">
              Select File
            </label>
          </>
        )}
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <style>{`
        .upload-container {
          text-align: center;
          width: 100%;
        }
        .drop-zone {
          border: 2px dashed #E5E7EB;
          border-radius: 20px;
          padding: 3rem 2rem;
          transition: all 0.2s ease;
          background: #F9FAFB;
          position: relative;
        }
        .drop-zone.active {
          border-color: #10B981;
          background: #ECFDF5;
        }
        .drop-zone.loading {
          opacity: 0.7;
          pointer-events: none;
        }
        .icon-circle {
          background: white;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        h3 {
          font-size: 1.2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #111827;
        }
        .helper-text {
          color: #6B7280;
          font-size: 0.95rem;
          margin-bottom: 1.5rem;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        }
        .hidden-input {
          display: none;
        }
        .upload-btn {
          width: auto;
          display: inline-flex;
          padding: 0.75rem 2rem;
          cursor: pointer;
        }
        .status-view {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        .spin-icon {
          animation: spin 1s linear infinite;
        }
        .sub-text {
          font-size: 0.85rem;
          color: #9CA3AF;
        }
        .error-message {
          margin-top: 1rem;
          padding: 0.75rem;
          background-color: #FEE2E2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          color: #B91C1C;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default VehicleDocumentUpload;
