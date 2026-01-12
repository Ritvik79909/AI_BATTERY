import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { hasAuthToken } from '../utils/tokenUtils';

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  // Simple presence check - backend enforces security
  return hasAuthToken() ? <>{children}</> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
