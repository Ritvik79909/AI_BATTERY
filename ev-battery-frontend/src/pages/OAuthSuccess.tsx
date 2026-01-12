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
      // Redirect to dashboard
      navigate('/dashboard', { replace: true });
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
