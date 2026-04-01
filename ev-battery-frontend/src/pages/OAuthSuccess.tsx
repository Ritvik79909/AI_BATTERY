import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';

const OAuthSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Extract token from URL query parameter
    const token = searchParams.get('token');

    if (token) {
      // Store token
      authService.saveToken(token);
      
      const initializeAndRedirect = async () => {
        try {
          const { vehicleService } = await import('../services/vehicleService');
          const { telemetryService } = await import('../services/telemetryService');

          const vehicles = await vehicleService.getVehicles();
          if (!vehicles || vehicles.length === 0) {
            navigate('/vehicle-setup', { replace: true });
            return;
          }

          let hasTelemetry = false;
          for (const v of vehicles) {
            try {
              const latest = await telemetryService.fetchLatestTelemetry(v.id);
              if (latest && Object.keys(latest).length > 0) {
                hasTelemetry = true;
                break;
              }
            } catch (e) {
              // Ignore errors (like 404 if no telemetry)
            }
          }

          if (!hasTelemetry) {
            navigate('/telemetry', { replace: true });
            return;
          }

          navigate('/dashboard', { replace: true });
        } catch (error) {
          navigate('/dashboard', { replace: true });
        }
      };

      initializeAndRedirect();
    } else {
      // No token found, redirect to login
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '1.2rem'
    }}>
      Processing authentication...
    </div>
  );
};

export default OAuthSuccess;
