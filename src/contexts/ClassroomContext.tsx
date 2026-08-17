import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { classroomService } from '../services/classroomService';
import { Room, RoomMember, ClassroomUserRole } from '../types/classroom';

interface ClassroomContextType {
  currentRoom: Room | null;
  currentMember: RoomMember | null;
  rooms: Room[];
  loading: boolean;
  error: string | null;
  setCurrentRoom: (room: Room | null) => void;
  createRoom: (roomData: Partial<Room>) => Promise<Room>;
  joinRoom: (roomCode: string) => Promise<Room>;
  fetchUserRooms: () => Promise<void>;
  refreshRoom: () => Promise<void>;
  loadRoom: (roomId: string) => Promise<void>;
  archiveRoom: (roomId: string) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  subscribeToCurrentRoom: () => (() => void) | null;
  getUserRoleInRoom: (roomId: string) => Promise<ClassroomUserRole | null>;
  clearError: () => void;
}

const ClassroomContext = createContext<ClassroomContextType>({
  currentRoom: null,
  currentMember: null,
  rooms: [],
  loading: true,
  error: null,
  setCurrentRoom: () => {},
  createRoom: async () => {
    throw new Error('Not implemented');
  },
  joinRoom: async () => {
    throw new Error('Not implemented');
  },
  fetchUserRooms: async () => {},
  refreshRoom: async () => {},
  loadRoom: async () => {},
  archiveRoom: async () => {},
  deleteRoom: async () => {},
  subscribeToCurrentRoom: () => null,
  getUserRoleInRoom: async () => null,
  clearError: () => {},
});

async function getUserMemberInRoom(
  roomId: string,
  userId: string
): Promise<{ role: ClassroomUserRole; member: any } | null> {
  try {
    const members = await classroomService.getRoomMembers(roomId);
    const found = members.find((m: any) => m.userId === userId && m.status === 'active');
    if (found) {
      return { role: found.role as ClassroomUserRole, member: found };
    }
    return null;
  } catch {
    return null;
  }
}

export function ClassroomProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentMember, setCurrentMember] = useState<RoomMember | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const fetchUserRoomsWithRoles = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const userRooms = await classroomService.getRoomsByUser(user.uid);
      setRooms(userRooms);
    } catch (e) {
      console.error('Failed to get user rooms with roles:', e);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user) {
      fetchUserRoomsWithRoles();
    }
  }, [user, fetchUserRoomsWithRoles]);

  const subscribeToCurrentRoom = useCallback(() => {
    if (!currentRoom?.id) return null;

    return classroomService.subscribeToRoom(currentRoom.id, (room) => {
      setCurrentRoom(room);
    });
  }, [currentRoom?.id]);

  const refreshRoom = useCallback(async () => {
    if (!currentRoom?.id || !user?.uid) return;

    try {
      const refreshed = await classroomService.getRoomById(currentRoom.id);
      if (refreshed) {
        setCurrentRoom(refreshed);
        try {
          const result = await getUserMemberInRoom(currentRoom.id, user.uid);
          if (result) {
            setCurrentMember({
              id: user.uid,
              roomId: currentRoom.id,
              userId: user.uid,
              displayName: user.fullName,
              email: user.email || '',
              photoURL: user.photoURL,
              role: result.role,
              joinedAt: new Date(),
              status: 'active',
            } as RoomMember);
          }
        } catch {
          // Ignore errors getting member info
        }
      }
    } catch (e: any) {
      setError(e.message || 'Failed to refresh room');
    }
  }, [currentRoom?.id, user]);

  const loadRoom = useCallback(
    async (roomId: string) => {
      if (!roomId) return;

      try {
        const room = await classroomService.getRoomById(roomId);
        if (room) {
          setCurrentRoom(room);
          if (user?.uid) {
            try {
              const result = await getUserMemberInRoom(roomId, user.uid);
              if (result) {
                setCurrentMember({
                  id: user.uid,
                  roomId,
                  userId: user.uid,
                  displayName: user.fullName,
                  email: user.email || '',
                  photoURL: user.photoURL,
                  role: result.role,
                  joinedAt: new Date(),
                  status: 'active',
                } as RoomMember);
              }
            } catch {
              // Ignore errors getting member info
            }
          }
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load room');
      }
    },
    [user]
  );

  const archiveRoom = useCallback(
    async (roomId: string) => {
      try {
        await classroomService.archiveRoom(roomId);
        setRooms((prev) =>
          prev.map((r) =>
            r.id === roomId ? { ...r, status: 'archived' } : r
          )
        );
        if (currentRoom?.id === roomId) {
          setCurrentRoom(null);
          setCurrentMember(null);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to archive room');
      }
    },
    [currentRoom?.id]
  );

  const deleteRoom = useCallback(
    async (roomId: string) => {
      try {
        await classroomService.deleteRoom(roomId);
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
        if (currentRoom?.id === roomId) {
          setCurrentRoom(null);
          setCurrentMember(null);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to delete room');
        throw e;
      }
    },
    [currentRoom?.id]
  );

  const createRoom = useCallback(
    async (roomData: Partial<Room>) => {
      if (!user) throw new Error('User not authenticated');

      const room = await classroomService.createRoom({
        ...roomData,
        ownerId: user.uid,
        createdBy: user.uid,
        status: 'active',
      } as any);

      setRooms((prev) => [room, ...prev]);
      setCurrentRoom(room);
      setCurrentMember({
        id: user.uid,
        roomId: room.id,
        userId: user.uid,
        displayName: user.fullName,
        email: user.email || '',
        photoURL: user.photoURL,
        role: 'teacher',
        joinedAt: new Date(),
        status: 'active',
      } as RoomMember);

      return room;
    },
    [user]
  );

  const joinRoom = useCallback(
    async (roomCode: string) => {
      if (!user) throw new Error('User not authenticated');

      const room = await classroomService.joinRoom(roomCode, user.uid);
      setRooms((prev) => [room, ...prev]);
      setCurrentRoom(room);
      setCurrentMember({
        id: user.uid,
        roomId: room.id,
        userId: user.uid,
        displayName: user.fullName,
        email: user.email || '',
        photoURL: user.photoURL,
        role: 'student',
        joinedAt: new Date(),
        status: 'active',
      } as RoomMember);

      return room;
    },
    [user]
  );

  const getUserRoleInRoom = useCallback(
    async (roomId: string) => {
      if (!user?.uid) return null;

      try {
        const result = await getUserMemberInRoom(roomId, user.uid);
        return result?.role ?? null;
      } catch (e) {
        console.error('Failed to get user role:', e);
        return null;
      }
    },
    [user?.uid]
  );

  return (
    <ClassroomContext.Provider
      value={{
        currentRoom,
        currentMember,
        rooms,
        loading,
        error,
        setCurrentRoom,
        createRoom,
        joinRoom,
        fetchUserRooms: fetchUserRoomsWithRoles,
        refreshRoom,
        loadRoom,
        archiveRoom,
        deleteRoom,
        subscribeToCurrentRoom,
        getUserRoleInRoom,
        clearError,
      }}
    >
      {children}
    </ClassroomContext.Provider>
  );
}

export function useClassroom() {
  return useContext(ClassroomContext);
}
