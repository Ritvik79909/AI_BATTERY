import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleEmailPasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Call backend login endpoint
      const response = await authService.login({ email, password });

      // Store token
      authService.saveToken(response.token);

      try {
        const { vehicleService } = await import('../services/vehicleService');
        const { telemetryService } = await import('../services/telemetryService');
        
        const vehicles = await vehicleService.getVehicles();
        if (!vehicles || vehicles.length === 0) {
          navigate('/vehicle-setup');
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
            // Ignore 404 or errors
          }
        }

        if (!hasTelemetry) {
          navigate('/telemetry');
          return;
        }

        // Redirect to dashboard
        navigate('/dashboard');
      } catch (err) {
        // Fallback
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:8080/oauth2/authorization/google";
  };

  return (
    <div className="login-container">
      <div className="bg-glow glow-1"></div>
      <div className="bg-glow glow-2"></div>
      <div className="bg-glow glow-3"></div>

      <div className="login-content-wrapper">
        <div className="login-right">
          <div className="login-card">
            <div className="header-container">
              <h1 className="login-title">Sign In</h1>
              <Link to="/register" className="create-account-link">
                Or Create an Account
              </Link>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleEmailPasswordLogin}>
              <div className="form-group">
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="form-input"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input
                    id="rememberMe"
                    name="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                  />
                  <span>Remember me</span>
                </label>
                <a href="#" className="forgot-password">Forgot Password?</a>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Signing in...' : 'Log In'}
              </button>
            </form>

            <div className="divider">or continue with</div>

            <button
              type="button"
              className="btn btn-google"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="google-icon" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
