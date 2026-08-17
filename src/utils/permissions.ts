import { ClassroomUserRole } from '../types/classroom';

export interface Permission {
  action: string;
  resource: string;
}

export const ROLE_PERMISSIONS: Record<ClassroomUserRole, Permission[]> = {
  teacher: [
    { action: 'create', resource: 'room' },
    { action: 'read', resource: 'room' },
    { action: 'update', resource: 'room' },
    { action: 'delete', resource: 'room' },
    { action: 'create', resource: 'topic' },
    { action: 'read', resource: 'topic' },
    { action: 'update', resource: 'topic' },
    { action: 'delete', resource: 'topic' },
    { action: 'publish', resource: 'topic' },
    { action: 'create', resource: 'assessment' },
    { action: 'read', resource: 'assessment' },
    { action: 'update', resource: 'assessment' },
    { action: 'delete', resource: 'assessment' },
    { action: 'grade', resource: 'assessment' },
    { action: 'manage', resource: 'students' },
    { action: 'read', resource: 'analytics' },
    { action: 'manage', resource: 'attendance' },
    { action: 'create', resource: 'announcement' },
    { action: 'read', resource: 'announcement' },
    { action: 'update', resource: 'announcement' },
    { action: 'delete', resource: 'announcement' },
    { action: 'send', resource: 'announcement' },
    { action: 'manage', resource: 'settings' },
  ],
  assistant_teacher: [
    { action: 'read', resource: 'room' },
    { action: 'read', resource: 'topic' },
    { action: 'update', resource: 'topic' },
    { action: 'read', resource: 'assessment' },
    { action: 'grade', resource: 'assessment' },
    { action: 'read', resource: 'students' },
    { action: 'read', resource: 'analytics' },
    { action: 'read', resource: 'attendance' },
    { action: 'mark', resource: 'attendance' },
    { action: 'read', resource: 'announcement' },
  ],
  student: [
    { action: 'read', resource: 'room' },
    { action: 'read', resource: 'topic' },
    { action: 'read', resource: 'assessment' },
    { action: 'take', resource: 'assessment' },
    { action: 'read', resource: 'own_progress' },
    { action: 'read', resource: 'own_attendance' },
    { action: 'check_in', resource: 'attendance' },
    { action: 'read', resource: 'announcement' },
  ],
  admin: [
    { action: '*', resource: '*' },
  ],
};

export function hasPermission(role: ClassroomUserRole, action: string, resource: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  
  // Admin has all permissions
  if (permissions.some(p => p.action === '*' && p.resource === '*')) {
    return true;
  }
  
  return permissions.some(p => p.action === action && p.resource === resource);
}

export function getRoleFromMember(member: { role: ClassroomUserRole } | null): ClassroomUserRole | null {
  return member?.role || null;
}

export function isTeacherOrAbove(role: ClassroomUserRole): boolean {
  return ['teacher', 'admin'].includes(role);
}

export function isAssistantTeacherOrAbove(role: ClassroomUserRole): boolean {
  return ['teacher', 'assistant_teacher', 'admin'].includes(role);
}

export function canManageRoom(role: ClassroomUserRole): boolean {
  return hasPermission(role, 'manage', 'room');
}

export function canManageStudents(role: ClassroomUserRole): boolean {
  return hasPermission(role, 'manage', 'students');
}

export function canCreateTopic(role: ClassroomUserRole): boolean {
  return hasPermission(role, 'create', 'topic');
}

export function canManageAssessment(role: ClassroomUserRole): boolean {
  return hasPermission(role, 'create', 'assessment') || hasPermission(role, 'grade', 'assessment');
}

export function canManageAttendance(role: ClassroomUserRole): boolean {
  return hasPermission(role, 'manage', 'attendance');
}

export function canManageAnnouncements(role: ClassroomUserRole): boolean {
  return hasPermission(role, 'create', 'announcement') || hasPermission(role, 'send', 'announcement');
}

export function canViewAnalytics(role: ClassroomUserRole): boolean {
  return hasPermission(role, 'read', 'analytics');
}

export function canManageSettings(role: ClassroomUserRole): boolean {
  return hasPermission(role, 'manage', 'settings');
}