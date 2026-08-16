import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useClassroom } from '../contexts/ClassroomContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { CreateRoomModal } from '../components/classroom/CreateRoomModal';
import { JoinRoomModal } from '../components/classroom/JoinRoomModal';
import Logo from '../components/landing/Logo';
import { LayoutDashboard, Users, BookOpen } from 'lucide-react';

/**
 * Entry point for STAND Classroom.
 * Shows two primary options: Create Room (teachers) and Join Room (students).
 * Does not affect existing app routing or auth flows.
 */
export default function ClassroomHome() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const { user } = useAuth();
  const { rooms, loading } = useClassroom();
  const navigate = useNavigate();

  const recentRooms = rooms.filter((r) => r.status === 'active');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-12">
        <Logo size={120} />
      </div>

      {/* Header */}
      <h1 className="text-4xl font-bold text-white mb-2">CLASSROOM</h1>
      <p className="text-slate-400 text-center max-w-md mb-12">
        Teacher-controlled curriculum. AI-powered teaching. Human-supervised learning.
      </p>

      {/* Primary Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-16">
        <Card
          onClick={() => setShowCreateModal(true)}
          className="bg-slate-800 border-slate-700 hover:border-indigo-500 transition-all duration-200 cursor-pointer group"
        >
          <div className="p-8 text-center">
            <div className="bg-indigo-600/20 rounded-full p-4 w-20 h-20 mx-auto mb-4 group-hover:bg-indigo-600/30 transition-colors">
              <LayoutDashboard className="w-10 h-10 text-indigo-400 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">CREATE ROOM</h2>
            <p className="text-slate-400">
              For teachers and instructors. Set up a private or institutional classroom.
            </p>
          </div>
        </Card>

        <Card
          onClick={() => setShowJoinModal(true)}
          className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-all duration-200 cursor-pointer group"
        >
          <div className="p-8 text-center">
            <div className="bg-blue-600/20 rounded-full p-4 w-20 h-20 mx-auto mb-4 group-hover:bg-blue-600/30 transition-colors">
              <Users className="w-10 h-10 text-blue-400 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">JOIN ROOM</h2>
            <p className="text-slate-400">
              For students. Enter your class code to join a classroom.
            </p>
          </div>
        </Card>
      </div>

      {/* Recently Accessed Rooms */}
      {recentRooms.length > 0 && (
        <div className="w-full max-w-4xl mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">Your Classrooms</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {recentRooms.map((room) => (
              <Card
                key={room.id}
                className="bg-slate-800 border-slate-700 hover:border-indigo-500 transition-all cursor-pointer"
                onClick={() =>
                  user?.uid === room.ownerId
                    ? navigate(`/classroom/${room.id}/dashboard`)
                    : navigate(`/classroom/${room.id}/learn`)
                }
              >
                <div className="p-4">
                  <h3 className="font-bold text-white">{room.name}</h3>
                  <p className="text-sm text-slate-400">{room.course}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {room.studentCount} students · Code: {room.roomCode}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {loading && recentRooms.length === 0 && (
        <p className="text-slate-400">Loading your classrooms...</p>
      )}

      <CreateRoomModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      <JoinRoomModal
        open={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />
    </div>
  );
}
