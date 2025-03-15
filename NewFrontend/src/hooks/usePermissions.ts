import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { ROLE_PERMISSIONS } from '@/features/auth/config/permissions';

export const usePermissions = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    const userPermissions = ROLE_PERMISSIONS[user.role];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    userRole: user?.role
  };
};