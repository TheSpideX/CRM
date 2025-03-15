import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { APP_ROUTES } from '@/config/routes';
import { logger } from '@/utils/logger';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { analytics } from '@/services/analytics.service';
import { setSessionAlert } from "../../store/authSlice";
import LoadingScreen from '@/components/shared/LoadingScreen';
import { ROLE_REDIRECTS } from '../../config/permissions';

interface AuthGuardProps {
  children: ReactNode;
  permissions?: string[];
  requireAll?: boolean;
  requiredRoles?: string[];
  securityLevel?: 'low' | 'medium' | 'high';
}

export const AuthGuard = ({ 
  children, 
  permissions = [], 
  requireAll = false,
  requiredRoles = [],
  securityLevel = 'low'
}: AuthGuardProps) => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, user, isLoading, securityContext } = useSelector((state: any) => state.auth);
  const { hasAnyPermission, hasAllPermissions } = usePermissions();
  const { refreshToken, reAuthenticate } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);

  // Check if session needs verification
  useEffect(() => {
    const checkSecurityRequirements = async () => {
      if (!isAuthenticated || isVerifying) return;

      // For high security routes, verify session freshness
      if (securityLevel === 'high' && securityContext?.lastAuthenticated) {
        const lastAuthTime = new Date(securityContext.lastAuthenticated).getTime();
        const currentTime = Date.now();
        const timeSinceAuth = currentTime - lastAuthTime;
        
        // If last authentication was more than 30 minutes ago, require re-authentication
        if (timeSinceAuth > 30 * 60 * 1000) {
          setIsVerifying(true);
          
          dispatch(setSessionAlert({
            type: 'warning',
            message: 'This action requires recent authentication',
            action: 'reauth'
          }));
          
          // Redirect to re-authentication page
          return <Navigate to={APP_ROUTES.AUTH.REAUTH} state={{ from: location }} replace />;
        }
      }
      
      // Check for suspicious activity
      if (securityContext?.suspiciousActivity && securityContext.requiresVerification) {
        return <Navigate to={APP_ROUTES.AUTH.VERIFY_DEVICE} state={{ from: location }} replace />;
      }
    };
    
    checkSecurityRequirements();
  }, [isAuthenticated, securityLevel, securityContext, location, dispatch, isVerifying]);

  // Validate access permissions
  const validateAccess = () => {
    // Check permissions
    const hasPermission = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
    
    // Check roles
    const hasRole = requiredRoles.length === 0 || 
      requiredRoles.some(role => user?.role === role);
    
    return hasPermission && hasRole;
  };

  // Handle redirect for unauthorized access
  const handleRedirect = () => {
    logger.warn('Access denied - insufficient permissions', {
      path: location.pathname,
      requiredPermissions: permissions,
      requiredRoles,
      userPermissions: user?.permissions,
      userRole: user?.role
    });
    
    // Analytics tracking removed
    
    // Redirect to appropriate page based on user role
    if (user?.role && ROLE_REDIRECTS[user.role]) {
      return <Navigate to={ROLE_REDIRECTS[user.role]} replace />;
    }
    
    // Default redirect to dashboard
    return <Navigate to={APP_ROUTES.DASHBOARD.ROOT} replace />;
  };

  // Handle loading state
  if (isLoading) {
    return <LoadingScreen message="Verifying access..." />;
  }

  // Handle unauthenticated users
  if (!isAuthenticated) {
    logger.info('User not authenticated, redirecting to login', {
      path: location.pathname
    });
    
    return <Navigate to={APP_ROUTES.AUTH.LOGIN} state={{ from: location }} replace />;
  }

  // Refresh token if needed
  useEffect(() => {
    const checkTokenFreshness = async () => {
      if (isAuthenticated) {
        await refreshToken();
      }
    };
    
    checkTokenFreshness();
  }, [isAuthenticated, refreshToken]);

  // Check permissions if needed
  if ((permissions.length > 0 || requiredRoles.length > 0) && !validateAccess()) {
    return handleRedirect();
  }

  return <>{children}</>;
};
