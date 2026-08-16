import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useClassroom } from '../../contexts/ClassroomContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Loader2, Search } from 'lucide-react';
import { Room } from '../../types/classroom';
import { classroomService } from '../../services/classroomService';

interface JoinRoomModalProps {
  open: boolean;
  onClose: () => void;
}

export function JoinRoomModal({ open, onClose }: JoinRoomModalProps) {
  const { user } = useAuth();
  const { joinRoom } = useClassroom();
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundRoom, setFoundRoom] = useState<Room | null>(null);
  const [step, setStep] = useState<'search' | 'confirm'>('search');

  const reset = () => {
    setRoomCode('');
    setFoundRoom(null);
    setError('');
    setStep('search');
  };

  const handleSearch = async () => {
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    if (!user?.uid) {
      setError('You must be logged in');
      return;
    }

    setIsLoading(true);
    setError('');
    setFoundRoom(null);

    try {
      const room = await classroomService.getRoomByCode(roomCode.trim().toUpperCase());

      if (!room) {
        setError('Room not found. Please check the code and try again.');
        return;
      }

      setFoundRoom(room);
      setStep('confirm');
    } catch (err: any) {
      setError(err.message || 'Failed to look up room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!foundRoom || !user?.uid) return;

    setIsLoading(true);
    setError('');

    try {
      await joinRoom(foundRoom.roomCode);
      reset();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) handleClose();
    }}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'search' ? 'Join a Classroom' : 'Confirm Join'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {step === 'search'
              ? 'Enter the room code provided by your teacher'
              : 'You are about to join this classroom'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md">
            {error}
          </div>
        )}

        {step === 'search' && (
          <>
            <div className="space-y-4">
              <div>
                <Label htmlFor="roomCode">Room Code *</Label>
                <div className="relative mt-1">
                  <Input
                    id="roomCode"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="e.g., ST-HNS-7K42P"
                    disabled={isLoading}
                    className="font-mono text-center"
                    maxLength={14}
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  'Search'
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'confirm' && foundRoom && (
          <>
            <div className="space-y-4">
              <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-lg text-white">{foundRoom.name}</h3>
                <p className="text-slate-300">Course: {foundRoom.course}</p>
                <p className="text-slate-300">Level: {foundRoom.level}</p>
                {foundRoom.institution && (
                  <p className="text-slate-300">Institution: {foundRoom.institution}</p>
                )}
                <p className="text-slate-300">Students: {foundRoom.studentCount}</p>
                <p className="text-slate-300">Teacher: {foundRoom.ownerName}</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('search')} disabled={isLoading}>
                Back
              </Button>
              <Button
                onClick={handleJoin}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'JOIN CLASSROOM'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
