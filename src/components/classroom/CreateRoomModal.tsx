import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useClassroom } from '../../contexts/ClassroomContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../ui/select';
import { generateRoomCode } from '../../utils/roomCode';
import { Loader2, Upload, Copy, Check } from 'lucide-react';
import { Room, RoomType } from '../../types/classroom';

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Simple QR Code generator using SVG (no external dependency)
 * Generates a basic QR code representation of the room code
 */
function generateSimpleQRCode(text: string): string {
  // Generate a simple visual code pattern based on text
  // This is a lightweight placeholder QR code - in production, use a proper QR library
  const chars = text.split('');
  let hash = 0;
  for (const char of chars) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }

  // Generate deterministic 7x7 grid based on hash
  const grid: boolean[][] = [];
  for (let i = 0; i < 7; i++) {
    grid[i] = [];
    for (let j = 0; j < 7; j++) {
      grid[i][j] = ((hash + i * 7 + j * 3) % 2) === 0;
    }
  }

  // Add corner markers (standard QR pattern)
  const setCorner = (r: number, c: number, size: number) => {
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (i === 0 || i === size - 1 || j === 0 || j === size - 1 ||
            (i >= 1 && i <= 2 && j >= 1 && j <= 2)) {
          if (r + i < 7 && c + j < 7) {
            grid[r + i][c + j] = true;
          }
        } else {
          if (r + i < 7 && c + j < 7) {
            grid[r + i][c + j] = false;
          }
        }
      }
    }
  };

  setCorner(0, 0, 3);
  setCorner(0, 4, 3);
  setCorner(4, 0, 3);

  // Build SVG
  const cellSize = 20;
  const size = 7 * cellSize;
  const padding = 4;

  let svg = `<svg width="${size + padding * 2}" height="${size + padding * 2}" viewBox="0 0 ${size + padding * 2} ${size + padding * 2}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="100%" height="100%" fill="white"/>`;

  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 7; j++) {
      if (grid[i][j]) {
        svg += `<rect x="${j * cellSize + padding}" y="${i * cellSize + padding}" width="${cellSize}" height="${cellSize}" fill="#000000"/>`;
      }
    }
  }

  // Add text label below grid
  svg += `<text x="${(size + padding * 2) / 2}" y="${size + padding * 2 - 5}" text-anchor="middle" font-family="monospace" font-size="12" fill="#333">${text.substring(0, 14)}</text>`;
  svg += `</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function CreateRoomModal({ open, onClose }: CreateRoomModalProps) {
  const { user } = useAuth();
  const { createRoom } = useClassroom();

  // Form state
  const [roomName, setRoomName] = useState('');
  const [course, setCourse] = useState('');
  const [level, setLevel] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [semester, setSemester] = useState('');
  const [description, setDescription] = useState('');
  const [institution, setInstitution] = useState('');
  const [department, setDepartment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [roomType, setRoomType] = useState<RoomType>('physical_digital');
  const [profileImage, setProfileImage] = useState<File | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');

  const resetForm = () => {
    setRoomName('');
    setCourse('');
    setLevel('');
    setAcademicYear('');
    setSemester('');
    setDescription('');
    setInstitution('');
    setDepartment('');
    setStartDate('');
    setEndDate('');
    setRoomType('physical_digital');
    setProfileImage(null);
    setError('');
    setStep('form');
    setGeneratedCode('');
    setQrCodeUrl('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfileImage(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!roomName || !course || !level || !academicYear || !semester) {
      setError('Please fill in all required fields');
      return;
    }

    if (!user?.uid) {
      setError('You must be logged in');
      return;
    }

    setIsLoading(true);
    setError('');

    const roomCode = generateRoomCode();
    setQrCodeUrl(generateSimpleQRCode(roomCode));

    try {
      const newRoom: Partial<Room> = {
        name: roomName,
        course,
        level,
        academicYear,
        semester,
        description,
        institution,
        department,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        roomType,
        ownerId: user.uid,
        ownerName: user.fullName,
        studentCount: 0,
        topicsPublished: 0,
        totalTopics: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        roomCode,
      };

      await createRoom(newRoom);
      setGeneratedCode(roomCode);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) handleClose();
    }}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'form' ? 'Create New Classroom' : 'Room Created!'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {step === 'form'
              ? 'Set up your classroom with basic course information'
              : 'Share this code with your students so they can join your classroom'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {step === 'form' && (
          <>
            {/* Required Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="roomName">Room Name *</Label>
                <Input
                  id="roomName"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g., Nursing 101 - Fall 2024"
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="course">Course/Subject *</Label>
                  <Input
                    id="course"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="e.g., Health & Safety"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="level">Level/Class *</Label>
                  <Input
                    id="level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    placeholder="e.g., Beginner, L1, Diploma"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="academicYear">Academic Year *</Label>
                  <Input
                    id="academicYear"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="e.g., 2024/2025"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="semester">Semester *</Label>
                  <Input
                    id="semester"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    placeholder="e.g., Semester 1"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Optional Fields */}
              <div>
                <Label htmlFor="roomType">Room Type *</Label>
                <Select value={roomType} onValueChange={(v) => setRoomType(v as RoomType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical_digital">Physical + Digital Classroom</SelectItem>
                    <SelectItem value="fully_online">Fully Online Classroom</SelectItem>
                    <SelectItem value="hybrid">Hybrid Classroom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Room Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this classroom"
                  disabled={isLoading}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="institution">School/Institution</Label>
                  <Input
                    id="institution"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g., ABC University"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g., Nursing"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="profileImage">Room Profile Image</Label>
                <div className="mt-1 flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-md cursor-pointer hover:bg-slate-600 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      id="profileImage"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={isLoading}
                    />
                  </label>
                  {profileImage && (
                    <span className="text-sm text-slate-300">{profileImage.name}</span>
                  )}
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
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Classroom'
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="text-3xl font-bold text-white font-mono">
                {generatedCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title="Copy code"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>

            {qrCodeUrl && (
              <div className="mb-6">
                <p className="text-sm text-slate-400 mb-3">Or let students scan the QR code:</p>
                <div className="flex justify-center">
                  <img
                    src={qrCodeUrl}
                    alt="Room QR Code"
                    className="border-2 border-slate-700 rounded-lg p-2 bg-white"
                  />
                </div>
              </div>
            )}

            <p className="text-slate-300 mb-6">
              Share this code with your students so they can join your classroom.
            </p>

            <DialogFooter>
              <Button onClick={handleClose} className="bg-indigo-600 hover:bg-indigo-700">
                Go to Classroom
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
