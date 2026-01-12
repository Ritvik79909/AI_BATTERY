import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { vehicleService } from '../../services/vehicleService';
import VehicleForm from './VehicleForm';
import type { VehicleFormData } from '../../types/vehicle';

interface Props {
  onSuccess: () => void;
}

// Polling interval in ms
const POLL_INTERVAL = 2000;

const DocumentUploadPanel: React.FC<Props> = ({ onSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'UPLOADING' | 'PROCESSING' | 'READY'>('IDLE');
  const [draftData, setDraftData] = useState<Partial<VehicleFormData> | null>(null);
  const [error, setError] = useState('');

  const handleFile = (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf' && !selectedFile.type.startsWith('image/')) {
      setError('Please upload a PDF or Image file.');
      return;
    }
    setFile(selectedFile);
    setError('');
    uploadFile(selectedFile);
  };

  const uploadFile = async (fileToUpload: File) => {
    setStatus('UPLOADING');
    try {
      const { draftId } = await vehicleService.uploadVehicleDocument(fileToUpload);
      setStatus('PROCESSING');
      pollDraftStatus(draftId);
    } catch (err) {
      setError('Upload failed. Please try manual entry.');
      setStatus('IDLE');
    }
  };

  const pollDraftStatus = async (draftId: string) => {
    const interval = setInterval(async () => {
      try {
        const draft = await vehicleService.getVehicleDraft(draftId);

        if (draft.status === 'READY' && draft.extractedData) {
          clearInterval(interval);
          setDraftData(draft.extractedData);
          setStatus('READY');
        } else if (draft.status === 'FAILED') {
          clearInterval(interval);
          setError('AI extraction failed. Please try manual entry.');
          setStatus('IDLE');
        }
      } catch (err) {
        // Continue polling on transient errors
      }
    }, POLL_INTERVAL);

    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(interval);
      if (status !== 'READY') {
        setError('Processing timed out.');
        setStatus('IDLE');
      }
    }, 30000);
  };

  // If ready, show the form pre-filled
  if (status === 'READY' && draftData) {
    return (
      <div className="animate-fade-in">
        <div className="success-banner">
          <CheckCircle size={20} color="#10B981" />
          <span>Data extracted successfully! Please review below.</span>
        </div>
        <VehicleForm initialData={draftData} onSuccess={onSuccess} />
        <style>{`
            .success-banner {
                background: #ECFDF5;
                color: #065F46;
                padding: 1rem;
                border-radius: 12px;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 1.5rem;
                font-size: 0.9rem;
                font-weight: 600;
            }
         `}</style>
      </div>
    )
  }

  return (
    <div className="upload-container">
      <div
        className={`drop-zone ${dragActive ? 'active' : ''}`}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
          }
        }}
      >
        {status === 'IDLE' && (
          <>
            <div className="icon-circle">
              <Upload size={32} color="#10B981" />
            </div>
            <h3>Upload Vehicle Document</h3>
            <p>Drag & drop PDF or Image here, or click to browse</p>
            <input
              type="file"
              id="file-upload"
              className="hidden-input"
              accept=".pdf,image/*"
              onChange={(e) => e.target.files && handleFile(e.target.files[0])}
            />
            <label htmlFor="file-upload" className="btn btn-primary upload-btn">
              Select File
            </label>
            {error && <p className="error-text">{error}</p>}
          </>
        )}

        {status === 'UPLOADING' && (
          <div className="status-view">
            <Loader2 size={40} className="spin-icon" color="#10B981" />
            <p>Uploading document...</p>
          </div>
        )}

        {status === 'PROCESSING' && (
          <div className="status-view">
            <FileText size={40} className="pulse-icon" color="#3B82F6" />
            <p>Analyzing with AI...</p>
            <span className="sub-text">This usually takes 5-10 seconds</span>
          </div>
        )}
      </div>

      <style>{`
        .upload-container { text-align: center; }
        .drop-zone {
            border: 2px dashed #E5E7EB;
            border-radius: 20px;
            padding: 3rem 2rem;
            transition: all 0.2s ease;
            background: #F9FAFB;
        }
        .drop-zone.active {
            border-color: #10B981;
            background: #ECFDF5;
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
        h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem; color: #111827; }
        p { color: #6B7280; font-size: 0.95rem; margin-bottom: 1.5rem; }
        .hidden-input { display: none; }
        .upload-btn { width: auto; display: inline-flex; padding: 0.75rem 2rem; }
        .error-text { color: #EF4444; margin-top: 1rem; font-size: 0.9rem; }
        
        .status-view {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
        }
        .spin-icon { animation: spin 1s linear infinite; }
        .pulse-icon { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .sub-text { font-size: 0.85rem; color: #9CA3AF; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
      `}</style>
    </div>
  );
};

export default DocumentUploadPanel;
