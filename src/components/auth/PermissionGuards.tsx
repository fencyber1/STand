import { ReactNode } from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface PermissionGuardProps {
  action: string;
  resource: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({ action, resource, children, fallback = null }: PermissionGuardProps) {
  const { hasPermission } = usePermissions();
  
  if (hasPermission(action, resource)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

interface RoleGuardProps {
  roles: ('teacher' | 'assistant_teacher' | 'student' | 'admin')[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const { role } = usePermissions();
  
  if (role && roles.includes(role)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

interface TeacherOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function TeacherOnly({ children, fallback = null }: TeacherOnlyProps) {
  const { isTeacherOrAbove } = usePermissions();
  
  if (isTeacherOrAbove) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

interface AssistantTeacherOrAboveProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AssistantTeacherOrAbove({ children, fallback = null }: AssistantTeacherOrAboveProps) {
  const { isAssistantTeacherOrAbove } = usePermissions();
  
  if (isAssistantTeacherOrAbove) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

interface StudentOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function StudentOnly({ children, fallback = null }: StudentOnlyProps) {
  const { isStudent } = usePermissions();
  
  if (isStudent) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const { isAdmin } = usePermissions();
  
  if (isAdmin) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

interface OwnerOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function OwnerOnly({ children, fallback = null }: OwnerOnlyProps) {
  const { isRoomOwner } = usePermissions();
  
  if (isRoomOwner) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

interface CanCreateTopicProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function CanCreateTopic({ children, fallback = null }: CanCreateTopicProps) {
  const { canCreateTopic } = usePermissions();
  
  if (canCreateTopic) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

interface CanManageAssessmentProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function CanManageAssessment({ children, fallback = null }: CanManageAssessmentProps) {
  const { canManageAssessment } = usePermissions();
  
  if (canManageAssessment) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

interface CanManageAttendanceProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function CanManageAttendance({ children, fallback = null }: CanManageAttendanceProps) {
  const { canManageAttendance } = usePermissions();
  
  if (canManageAttendance) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

interface CanManageAnnouncementsProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function CanManageAnnouncements({ children, fallback = null }: CanManageAnnouncementsProps) {
  const { canManageAnnouncements } = usePermissions();
  
  if (canManageAnnouncements) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

interface CanViewAnalyticsProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function CanViewAnalytics({ children, fallback = null }: CanViewAnalyticsProps) {
  const { canViewAnalytics } = usePermissions();
  
  if (canViewAnalytics) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

interface CanManageSettingsProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function CanManageSettings({ children, fallback = null }: CanManageSettingsProps) {
  const { canManageSettings } = usePermissions();
  
  if (canManageSettings) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}