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
import { Room, ClassroomUserRole } from '../types/classroom';

/**
 * Dedicated context for Classroom state management.
 * Works alongside the existing AuthContext without affecting auth flows.
 */
interface ClassroomContextType {
  currentRoom: Room | null;
  rooms: Room[];
  loading: boolean;
  error: string | null;
  setCurrentRoom: (room: Room | null) => void;
  createRoom: (roomData: Partial<Room>) => Promise<Room>;
  joinRoom: (roomCode: string) => Promise<Room>;
  fetchUserRooms: () => Promise<void>;
  refreshRoom: () => Promise<void>;
  archiveRoom: (roomId: string) => Promise<void>;
  subscribeToCurrentRoom: () => (() => void) | null;
  getUserRoleInRoom: (roomId: string) => Promise<ClassroomUserRole | null>;
  clearError: () => void;
}

const ClassroomContext = createContext<ClassroomContextType>({
  currentRoom: null,
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
  archiveRoom: async () => {},
  subscribeToCurrentRoom: () => null,
  getUserRoleInRoom: async () => null,
  clearError: () => {},
});

export function ClassroomProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const fetchUserRooms = useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      const userRooms = await classroomService.getRoomsByUser(user.uid);
      setRooms(userRooms);
    } catch (e: any) {
      setError(e.message || 'Failed to load classrooms');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  const createRoom = useCallback(
    async (roomData: Partial<Room>): Promise<Room> => {
      if (!user?.uid) {
        throw new Error('You must be logged in to create a room');
      }

      setLoading(true);
      try {
        const newRoom = await classroomService.createRoom({
          ...roomData,
          ownerId: user.uid,
          ownerName: user.fullName,
          studentCount: 0,
          topicsPublished: 0,
          totalTopics: 0,
          status: 'active',
          roomType: roomData.roomType ?? 'physical_digital',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Room);

        setRooms((prev) => [...prev, newRoom]);
        setCurrentRoom(newRoom);
        setError(null);
        return newRoom;
      } catch (e: any) {
        setError(e.message || 'Failed to create room');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const joinRoom = useCallback(
    async (roomCode: string): Promise<Room> => {
      if (!user?.uid) {
        throw new Error('You must be logged in to join a room');
      }

      setLoading(true);
      try {
        const room = await classroomService.joinRoom(user.uid, roomCode);
        setCurrentRoom(room);

        // Add to rooms list if not already there
        setRooms((prev) => {
          if (prev.find((r) => r.id === room.id)) return prev;
          return [...prev, room];
        });

        setError(null);
        return room;
      } catch (e: any) {
        setError(e.message || 'Failed to join room');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const refreshRoom = useCallback(async () => {
    if (!currentRoom?.id) return;

    try {
      const refreshed = await classroomService.getRoomById(currentRoom.id);
      if (refreshed) {
        setCurrentRoom(refreshed);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to refresh room');
    }
  }, [currentRoom?.id]);

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
        }
      } catch (e: any) {
        setError(e.message || 'Failed to archive room');
      }
    },
    [currentRoom?.id]
  );

  const getUserRoleInRoom = useCallback(
    async (roomId: string): Promise<ClassroomUserRole | null> => {
      if (!user?.uid) return null;

      try {
        const members = await classroomService.getRoomMembers(roomId);
        const member = members.find((m) => m.userId === user.uid);
        if (member) {
          return member.role as ClassroomUserRole;
        }

        // Check if user is owner
        const room = await classroomService.getRoomById(roomId);
        if (room && room.ownerId === user.uid) {
          return 'teacher';
        }

        return null;
      } catch (e) {
        console.error('Failed to get user role:', e);
        return null;
      }
    },
    [user?.uid]
  );

  const subscribeToCurrentRoom = useCallback(() => {
    if (!currentRoom?.id) return null;

    return classroomService.subscribeToRoom(currentRoom.id, (room) => {
      setCurrentRoom(room);
    });
  }, [currentRoom?.id]);

  // Load user rooms on mount
  useEffect(() => {
    if (user) {
      fetchUserRooms();
    }
  }, [user, fetchUserRooms]);

  return (
    <ClassroomContext.Provider
      value={{
        currentRoom,
        rooms,
        loading,
        error,
        setCurrentRoom,
        createRoom,
        joinRoom,
        fetchUserRooms,
        refreshRoom,
        archiveRoom,
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
