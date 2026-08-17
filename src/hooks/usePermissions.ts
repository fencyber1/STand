import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useClassroom } from '../contexts/ClassroomContext';
import { ClassroomUserRole } from '../types/classroom';
import { 
  hasPermission,
  isTeacherOrAbove,
  isAssistantTeacherOrAbove,
  canManageRoom,
  canManageStudents,
  canCreateTopic,
  canManageAssessment,
  canManageAttendance,
  canManageAnnouncements,
  canViewAnalytics,
  canManageSettings,
} from '../utils/permissions';

export function usePermissions() {
  const { user } = useAuth();
  const { currentRoom, currentMember } = useClassroom();

  const role = useMemo((): ClassroomUserRole | null => {
    return currentMember?.role || null;
  }, [currentMember]);

  const permissions = useMemo(() => ({
    // Role checks
    isTeacher: role === 'teacher',
    isAssistantTeacher: role === 'assistant_teacher',
    isStudent: role === 'student',
    isAdmin: role === 'admin',
    isTeacherOrAbove: isTeacherOrAbove(role || 'student'),
    isAssistantTeacherOrAbove: isAssistantTeacherOrAbove(role || 'student'),
    
    // Specific permission checks
    canManageRoom: canManageRoom(role || 'student'),
    canManageStudents: canManageStudents(role || 'student'),
    canCreateTopic: canCreateTopic(role || 'student'),
    canManageAssessment: canManageAssessment(role || 'student'),
    canManageAttendance: canManageAttendance(role || 'student'),
    canManageAnnouncements: canManageAnnouncements(role || 'student'),
    canViewAnalytics: canViewAnalytics(role || 'student'),
    canManageSettings: canManageSettings(role || 'student'),
    
    // Generic permission checker
    hasPermission: (action: string, resource: string) => {
      const roleToCheck = role || 'student';
      // Import dynamically to avoid circular dependency
      return checkPermission(roleToCheck, action, resource);
    },
    
    // Role info
    role,
    isRoomOwner: currentRoom?.ownerId === currentMember?.userId,
  }), [role, currentRoom, currentMember]);

  return permissions;
}

// Helper function to avoid circular dependency
function checkPermission(role: string, action: string, resource: string): boolean {
  // Simple inline permission check
  const rolePermissions: Record<string, { action: string; resource: string }[]> = {
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

  const permissions = rolePermissions[role as keyof typeof rolePermissions] || [];
  
  if (permissions.some(p => p.action === '*' && p.resource === '*')) {
    return true;
  }
  
  return permissions.some(p => p.action === action && p.resource === resource);
}

export function useRoleCheck() {
  const { isTeacher, isAssistantTeacher, isStudent, isAdmin, role } = usePermissions();

  return {
    isTeacher,
    isAssistantTeacher,
    isStudent,
    isAdmin,
    role,
  };
}