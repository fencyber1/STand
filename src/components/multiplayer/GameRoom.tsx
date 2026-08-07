import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock, CheckCircle, XCircle, Users, Crown, Trophy,
  Zap, MessageCircle, Send, Eye, RefreshCw, ArrowRight, Loader2,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { generateQuestions } from '../../services/api';
import {
  setPlayerReady,
  startGame,
  submitAnswer,
  nextQuestion,
  leaveGame,
  sendChatMessage,
  addSpectator,
} from '../../services/multiplayer/multiplayerService';
import type { GameRoom } from '../../types';
import { SECTORS } from '../../constants';

export default function GameRoom() {
  const { code } = useParams<{ code: string }>();
  const roomId = code;
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [hasAnswered, setHasAnswered] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      const snap = await getDoc(doc(db, 'gameRooms', roomId));
      if (snap.exists()) {
        const data = snap.data() as GameRoom;
        if (data.expiresAt && data.expiresAt < Date.now() && data.players.length < 2) {
          await deleteDoc(doc(db, 'gameRooms', roomId));
          setLoadError('This room expired because nobody joined within 2 minutes.');
          setLoading(false);
          return false;
        }
        setRoom(data);
        setLoadError('');
        setLoading(false);
        if (data?.status === 'finished') {
          setShowResults(true);
        }
        return true;
      } else {
        setLoadError('Room not found. It may have been deleted or expired.');
        setLoading(false);
        return false;
      }
    } catch (e: any) {
      console.error('[MP] Fetch error:', e);
      setLoadError(`Failed to load room: ${e.message}`);
      setLoading(false);
      return false;
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    setLoading(true);
    setPollCount(0);

    fetchRoom();

    const interval = room?.status === 'waiting' ? 2000 : 3000;
    pollRef.current = setInterval(async () => {
      setPollCount((c) => c + 1);
      await fetchRoom();
    }, interval);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [roomId, fetchRoom]);

  const manualRefresh = async () => {
    setLoading(true);
    await fetchRoom();
  };

  useEffect(() => {
    if (!room || room.status !== 'in_progress') return;
    const currentQ = room.questions[room.currentQuestion];
    if (!currentQ) return;

    setTimeLeft(room.timePerQuestion);
    setSelectedAnswer(null);
    setHasAnswered(false);
    setLastAnswerCorrect(null);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [room?.currentQuestion, room?.status]);

  const handleAnswer = async (answer: string) => {
    if (!roomId || !user || !room || hasAnswered) return;
    setSelectedAnswer(answer);
    setHasAnswered(true);

    const currentQ = room.questions[room.currentQuestion];
    if (!currentQ) return;

    const isCorrect = answer === (Array.isArray(currentQ.correctAnswer) ? currentQ.correctAnswer[0] : currentQ.correctAnswer);
    setLastAnswerCorrect(isCorrect);
    const timeSpent = room.timePerQuestion - timeLeft;

    await submitAnswer(roomId, user.uid, room.currentQuestion, answer, timeSpent, isCorrect);
  };

  const handleNextQuestion = async () => {
    if (!roomId) return;
    await nextQuestion(roomId);
    setSelectedAnswer(null);
    setHasAnswered(false);
    setLastAnswerCorrect(null);
    fetchRoom();
  };

  const handleReady = async () => {
    if (!roomId || !user) return;
    const player = room?.players.find((p) => p.uid === user.uid);
    await setPlayerReady(roomId, user.uid, !player?.ready);
    setTimeout(() => fetchRoom(), 500);
  };

  const handleStartGame = async () => {
    if (!roomId || !room) return;
    setGenerating(true);
    try {
      const subjects = SECTORS.filter((s) => s !== 'Other');
      const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
      const topics = ['General', 'Fundamentals', 'Key Concepts', 'Applications', 'Advanced Topics'];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];

      const questionCount = Math.min(room.totalQuestions, 5);
      console.log('[MP] Generating questions:', { sector: randomSubject, topic: randomTopic, count: questionCount });

      const generatePromise = generateQuestions({
        topic: randomTopic,
        sector: randomSubject,
        level: 'High School',
        questionType: 'MCQ Only',
        count: questionCount,
        difficulty: 'medium',
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Question generation timed out')), 30000)
      );

      const result = await Promise.race([generatePromise, timeoutPromise]);
      console.log('[MP] Questions generated:', result.questions.length);

      const questions = result.questions.map((q, i) => ({
        ...q,
        id: q.id || `mp-q-${i}-${Date.now()}`,
        options: q.options && q.options.length >= 2 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: q.correctAnswer || 'Option A',
      }));

      if (questions.length === 0) {
        throw new Error('No questions generated');
      }

      await startGame(roomId, questions);
      fetchRoom();
    } catch (e: any) {
      console.error('[MP] Question generation failed:', e);
      const fallback = fallbackQuestions(room);
      await startGame(roomId, fallback);
      fetchRoom();
    } finally {
      setGenerating(false);
    }
  };

  const fallbackQuestions = (room: GameRoom) => {
    const localQuestions: Record<string, Array<{ question: string; options: string[]; correctAnswer: string; explanation: string }>> = {
      'General Science': [
        { question: 'What is the chemical symbol for water?', options: ['A. H2O', 'B. CO2', 'C. O2', 'D. NaCl'], correctAnswer: 'A. H2O', explanation: 'Water is composed of two hydrogen atoms and one oxygen atom.' },
        { question: 'Which planet is known as the Red Planet?', options: ['A. Venus', 'B. Mars', 'C. Jupiter', 'D. Saturn'], correctAnswer: 'B. Mars', explanation: 'Mars appears red due to iron oxide on its surface.' },
        { question: 'What is the largest organ in the human body?', options: ['A. Heart', 'B. Liver', 'C. Skin', 'D. Brain'], correctAnswer: 'C. Skin', explanation: 'The skin is the largest organ, covering about 20 square feet.' },
        { question: 'What gas do plants absorb from the atmosphere?', options: ['A. Oxygen', 'B. Nitrogen', 'C. Carbon Dioxide', 'D. Hydrogen'], correctAnswer: 'C. Carbon Dioxide', explanation: 'Plants absorb CO2 for photosynthesis.' },
        { question: 'What is the speed of light approximately?', options: ['A. 300,000 km/s', 'B. 150,000 km/s', 'C. 500,000 km/s', 'D. 100,000 km/s'], correctAnswer: 'A. 300,000 km/s', explanation: 'Light travels at approximately 299,792 km/s in a vacuum.' },
      ],
      'Mathematics': [
        { question: 'What is the value of π (pi) to two decimal places?', options: ['A. 3.14', 'B. 3.16', 'C. 3.12', 'D. 3.18'], correctAnswer: 'A. 3.14', explanation: 'Pi is approximately 3.14159...' },
        { question: 'What is the square root of 144?', options: ['A. 10', 'B. 11', 'C. 12', 'D. 14'], correctAnswer: 'C. 12', explanation: '12 × 12 = 144.' },
        { question: 'What is 15% of 200?', options: ['A. 25', 'B. 30', 'C. 35', 'D. 40'], correctAnswer: 'B. 30', explanation: '15% of 200 = 0.15 × 200 = 30.' },
        { question: 'What is the sum of angles in a triangle?', options: ['A. 90°', 'B. 180°', 'C. 270°', 'D. 360°'], correctAnswer: 'B. 180°', explanation: 'The sum of interior angles in any triangle is always 180°.' },
        { question: 'What is 2 to the power of 8?', options: ['A. 128', 'B. 256', 'C. 512', 'D. 64'], correctAnswer: 'B. 256', explanation: '2^8 = 256.' },
      ],
      'English Language': [
        { question: 'Which of the following is a noun?', options: ['A. Run', 'B. Beautiful', 'C. Teacher', 'D. Quickly'], correctAnswer: 'C. Teacher', explanation: 'A noun is a person, place, thing, or idea.' },
        { question: 'What is the past tense of "go"?', options: ['A. Goed', 'B. Went', 'C. Going', 'D. Gone'], correctAnswer: 'B. Went', explanation: '"Went" is the irregular past tense of "go".' },
        { question: 'Which word is an antonym of "happy"?', options: ['A. Joyful', 'B. Sad', 'C. Excited', 'D. Cheerful'], correctAnswer: 'B. Sad', explanation: '"Sad" is the opposite of "happy".' },
        { question: 'What is a group of words that contains a subject and a verb called?', options: ['A. Phrase', 'B. Clause', 'C. Sentence', 'D. Paragraph'], correctAnswer: 'C. Sentence', explanation: 'A sentence must contain a subject and a predicate (verb).' },
        { question: 'Which punctuation mark ends a question?', options: ['A. Period', 'B. Exclamation mark', 'C. Question mark', 'D. Comma'], correctAnswer: 'C. Question mark', explanation: 'Questions end with a question mark (?).' },
      ],
      'Biology': [
        { question: 'What is the powerhouse of the cell?', options: ['A. Nucleus', 'B. Mitochondria', 'C. Ribosome', 'D. Golgi body'], correctAnswer: 'B. Mitochondria', explanation: 'Mitochondria produce ATP, the cell\'s energy currency.' },
        { question: 'Which molecule carries genetic information?', options: ['A. RNA', 'B. DNA', 'C. Protein', 'D. Lipid'], correctAnswer: 'B. DNA', explanation: 'DNA (deoxyribonucleic acid) carries genetic instructions.' },
        { question: 'What process do plants use to make food?', options: ['A. Respiration', 'B. Photosynthesis', 'C. Fermentation', 'D. Digestion'], correctAnswer: 'B. Photosynthesis', explanation: 'Plants convert sunlight, CO2, and water into glucose.' },
        { question: 'What is the basic unit of life?', options: ['A. Atom', 'B. Molecule', 'C. Cell', 'D. Tissue'], correctAnswer: 'C. Cell', explanation: 'The cell is the fundamental structural and functional unit of life.' },
        { question: 'Which blood cells fight infection?', options: ['A. Red blood cells', 'B. White blood cells', 'C. Platelets', 'D. Plasma'], correctAnswer: 'B. White blood cells', explanation: 'White blood cells are part of the immune system.' },
      ],
      'Chemistry': [
        { question: 'What is the atomic number of carbon?', options: ['A. 4', 'B. 6', 'C. 8', 'D. 12'], correctAnswer: 'B. 6', explanation: 'Carbon has 6 protons, giving it atomic number 6.' },
        { question: 'What is the pH of pure water?', options: ['A. 5', 'B. 7', 'C. 9', 'D. 14'], correctAnswer: 'B. 7', explanation: 'Pure water has a neutral pH of 7.' },
        { question: 'Which element has the symbol "Na"?', options: ['A. Nitrogen', 'B. Sodium', 'C. Nickel', 'D. Neon'], correctAnswer: 'B. Sodium', explanation: 'Na comes from the Latin word "natrium".' },
        { question: 'What type of bond involves sharing electrons?', options: ['A. Ionic', 'B. Covalent', 'C. Metallic', 'D. Hydrogen'], correctAnswer: 'B. Covalent', explanation: 'Covalent bonds share electron pairs between atoms.' },
        { question: 'What is the most abundant gas in Earth\'s atmosphere?', options: ['A. Oxygen', 'B. Carbon Dioxide', 'C. Nitrogen', 'D. Argon'], correctAnswer: 'C. Nitrogen', explanation: 'Nitrogen makes up about 78% of the atmosphere.' },
      ],
      'Physics': [
        { question: 'What is the SI unit of force?', options: ['A. Joule', 'B. Watt', 'C. Newton', 'D. Pascal'], correctAnswer: 'C. Newton', explanation: 'Force is measured in Newtons (N), named after Isaac Newton.' },
        { question: 'What is the formula for kinetic energy?', options: ['A. mgh', 'B. ½mv²', 'C. mv', 'D. Fd'], correctAnswer: 'B. ½mv²', explanation: 'Kinetic energy equals half mass times velocity squared.' },
        { question: 'Which law states that every action has an equal and opposite reaction?', options: ['A. First Law', 'B. Second Law', 'C. Third Law', 'D. Law of Gravitation'], correctAnswer: 'C. Third Law', explanation: 'Newton\'s Third Law of Motion.' },
        { question: 'What is the unit of electric current?', options: ['A. Volt', 'B. Ohm', 'C. Ampere', 'D. Watt'], correctAnswer: 'C. Ampere', explanation: 'Current is measured in Amperes (A).' },
        { question: 'What is the acceleration due to gravity on Earth?', options: ['A. 8.9 m/s²', 'B. 9.8 m/s²', 'C. 10.8 m/s²', 'D. 11.8 m/s²'], correctAnswer: 'B. 9.8 m/s²', explanation: 'Gravity accelerates objects at approximately 9.8 m/s².' },
      ],
      'Computer Science': [
        { question: 'What does CPU stand for?', options: ['A. Central Processing Unit', 'B. Computer Personal Unit', 'C. Central Program Utility', 'D. Computer Processing Unit'], correctAnswer: 'A. Central Processing Unit', explanation: 'CPU is the brain of the computer.' },
        { question: 'What is the binary representation of the number 10?', options: ['A. 1010', 'B. 1100', 'C. 1001', 'D. 1110'], correctAnswer: 'A. 1010', explanation: '10 in decimal = 1010 in binary.' },
        { question: 'Which language is used for web page structure?', options: ['A. Python', 'B. HTML', 'C. Java', 'D. C++'], correctAnswer: 'B. HTML', explanation: 'HTML (HyperText Markup Language) structures web content.' },
        { question: 'What does RAM stand for?', options: ['A. Read Access Memory', 'B. Random Access Memory', 'C. Run Application Memory', 'D. Random Allocation Memory'], correctAnswer: 'B. Random Access Memory', explanation: 'RAM is volatile memory for temporary data storage.' },
        { question: 'What is an algorithm?', options: ['A. A programming language', 'B. A step-by-step procedure', 'C. A computer virus', 'D. A type of hardware'], correctAnswer: 'B. A step-by-step procedure', explanation: 'An algorithm is a finite sequence of well-defined instructions.' },
      ],
    };

    const defaultQuestions = [
      { question: 'Which of the following is a prime number?', options: ['A. 4', 'B. 6', 'C. 7', 'D. 9'], correctAnswer: 'C. 7', explanation: '7 is only divisible by 1 and itself.' },
      { question: 'What is the capital of France?', options: ['A. London', 'B. Berlin', 'C. Paris', 'D. Madrid'], correctAnswer: 'C. Paris', explanation: 'Paris is the capital and largest city of France.' },
      { question: 'Which continent is largest by area?', options: ['A. Africa', 'B. North America', 'C. Asia', 'D. Europe'], correctAnswer: 'C. Asia', explanation: 'Asia is the largest continent, covering about 30% of Earth\'s land.' },
      { question: 'What is the hardest natural substance?', options: ['A. Gold', 'B. Iron', 'C. Diamond', 'D. Quartz'], correctAnswer: 'C. Diamond', explanation: 'Diamond rates 10 on the Mohs hardness scale.' },
      { question: 'Who painted the Mona Lisa?', options: ['A. Van Gogh', 'B. Picasso', 'C. Da Vinci', 'D. Michelangelo'], correctAnswer: 'C. Da Vinci', explanation: 'Leonardo da Vinci painted the Mona Lisa between 1503-1519.' },
    ];

    const subjectQuestions = localQuestions[room.subject] || defaultQuestions;
    const count = Math.min(room.totalQuestions, subjectQuestions.length);

    return Array.from({ length: count }, (_, i) => {
      const q = subjectQuestions[i % subjectQuestions.length];
      return {
        id: `q-${i}-${Date.now()}`,
        question: q.question,
        type: 'MCQ' as const,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: 'medium' as const,
        subject: room.subject,
        topic: room.topic,
      };
    });
  };

  const handleLeave = async () => {
    if (!roomId || !user) return;
    await leaveGame(roomId, user.uid);
    navigate('/multiplayer');
  };

  const handleSendChat = async () => {
    if (!roomId || !user || !chatInput.trim()) return;
    await sendChatMessage(roomId, {
      uid: user.uid,
      name: user.fullName || 'Player',
      text: chatInput.trim(),
      type: 'message',
    });
    setChatInput('');
  };

  if (loading && !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading room...</p>
        {pollCount > 0 && (
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">Polling attempt #{pollCount}...</p>
        )}
        <button
          onClick={manualRefresh}
          className="mt-3 flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline"
        >
          <RefreshCw size={12} /> Refresh now
        </button>
        <button
          onClick={() => navigate('/multiplayer')}
          className="mt-2 text-xs text-gray-500 dark:text-gray-400 hover:underline"
        >
          Back to Arena
        </button>
      </div>
    );
  }

  if (loadError && !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400 mb-3">{loadError}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={manualRefresh}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/multiplayer')}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition"
            >
              Back to Arena
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
        <p className="text-gray-500 dark:text-gray-400 text-sm">Room not found</p>
        <button
          onClick={() => navigate('/multiplayer')}
          className="mt-2 text-xs text-primary-600 dark:text-primary-400 hover:underline"
        >
          Back to Arena
        </button>
      </div>
    );
  }

  const currentPlayer = room.players.find((p) => p.uid === user?.uid);
  const currentQ = room.questions[room.currentQuestion];
  const isHost = room.host === user?.uid;
  const roomIsFull = room.players.length >= room.maxPlayers;
  const hasOtherPlayers = room.players.length >= 2;
  const allReady = hasOtherPlayers && room.players.every((p) => p.ready);
  const readyCount = room.players.filter((p) => p.ready).length;

  if (showResults || room.status === 'finished') {
    return <GameResults room={room} onLeave={handleLeave} />;
  }

  if (room.status === 'waiting') {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Waiting Room</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {room.isPrivate && room.roomCode && (
              <span className="font-mono text-lg tracking-widest bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded">{room.roomCode}</span>
            )}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-between flex-1">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Players ({room.players.length}/{room.maxPlayers})
            </span>
            <div className="flex items-center gap-2">
              {roomIsFull && (
                <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded font-bold">
                  Room Full!
                </span>
              )}
              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">{room.mode}</span>
            </div>
          </div>
        </div>

        {hasOtherPlayers && !allReady && (
          <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-yellow-600 dark:text-yellow-400">
              {isHost ? `Waiting for players to ready up... (${readyCount}/${room.players.length}) — You can start anytime!` : `Click Ready Up to let the host start! (${readyCount}/${room.players.length} ready)`}
            </span>
          </div>
        )}

        {allReady && (
          <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2">
            <CheckCircle size={14} className="text-green-500" />
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">All players ready! Host can start the game.</span>
          </div>
        )}

        {!hasOtherPlayers && (
          <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-blue-600 dark:text-blue-400">Waiting for another player to join...</span>
          </div>
        )}
          <div className="space-y-2">
            {room.players.map((player) => (
              <div key={player.uid} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  {player.photoURL ? (
                    <img src={player.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                      {player.displayName.charAt(0)}
                    </div>
                  )}
                  <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">{player.displayName}</span>
                  {player.uid === room.host && <Crown size={14} className="text-yellow-500" />}
                </div>
                {player.ready ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleReady}
            className={`flex-1 py-3 rounded-lg font-semibold text-sm transition ${
              currentPlayer?.ready
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {currentPlayer?.ready ? 'Ready!' : 'Ready Up'}
          </button>
          {isHost && hasOtherPlayers && (
            <button
              onClick={handleStartGame}
              disabled={generating}
              className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-semibold text-sm hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                'Start Game'
              )}
            </button>
          )}
          <button
            onClick={handleLeave}
            className="px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-semibold text-sm transition"
          >
            Leave
          </button>
        </div>
      </div>
    );
  }

  if (room.status === 'in_progress' && currentQ) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Q{room.currentQuestion + 1}/{room.totalQuestions}
            </span>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-bold ${
            timeLeft <= 5 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          }`}>
            <Clock size={14} />
            {timeLeft}s
          </div>
        </div>

        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-6">
          <div
            className={`h-full rounded-full transition-all ${timeLeft <= 5 ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${(timeLeft / room.timePerQuestion) * 100}%` }}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{currentQ.question}</h2>
          <div className="space-y-2">
            {currentQ.options?.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              const isCorrectAnswer = option === (Array.isArray(currentQ.correctAnswer) ? currentQ.correctAnswer[0] : currentQ.correctAnswer);
              const letter = String.fromCharCode(65 + idx);

              let borderColor = 'border-gray-200 dark:border-gray-700';
              let bgColor = 'bg-gray-100 dark:bg-gray-700';
              let textColor = 'text-gray-600 dark:text-gray-400';

              if (hasAnswered) {
                if (isSelected && isCorrectAnswer) {
                  borderColor = 'border-green-500';
                  bgColor = 'bg-green-500';
                  textColor = 'text-white';
                } else if (isSelected && !isCorrectAnswer) {
                  borderColor = 'border-red-500';
                  bgColor = 'bg-red-500';
                  textColor = 'text-white';
                } else if (isCorrectAnswer) {
                  borderColor = 'border-green-500';
                  bgColor = 'bg-green-100 dark:bg-green-900/30';
                  textColor = 'text-green-700 dark:text-green-300';
                }
              } else if (isSelected) {
                borderColor = 'border-primary-500';
                bgColor = 'bg-primary-500';
                textColor = 'text-white';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(option)}
                  disabled={hasAnswered}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition text-left ${borderColor} ${isSelected || (hasAnswered && isCorrectAnswer) ? (isSelected && isCorrectAnswer ? 'bg-green-50 dark:bg-green-900/20' : hasAnswered && isCorrectAnswer ? 'bg-green-50 dark:bg-green-900/20' : isSelected && !isCorrectAnswer ? 'bg-red-50 dark:bg-red-900/20' : '') : 'hover:border-primary-300 dark:hover:border-primary-600'}`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${bgColor} ${textColor}`}>
                    {hasAnswered && isCorrectAnswer ? <CheckCircle size={16} /> : hasAnswered && isSelected && !isCorrectAnswer ? <XCircle size={16} /> : letter}
                  </span>
                  <span className="text-sm text-gray-800 dark:text-gray-100 flex-1">{option}</span>
                  {hasAnswered && isCorrectAnswer && (
                    <CheckCircle size={16} className="text-green-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {hasAnswered && lastAnswerCorrect !== null && (
          <div className={`mb-4 p-3 rounded-lg ${lastAnswerCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <div className="flex items-center gap-2">
              {lastAnswerCorrect ? (
                <>
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">Correct! +100 points</span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-red-500" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    Wrong! The answer was: {Array.isArray(currentQ.correctAnswer) ? currentQ.correctAnswer[0] : currentQ.correctAnswer}
                  </span>
                </>
              )}
            </div>
            {currentQ.explanation && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">{currentQ.explanation}</p>
            )}
          </div>
        )}

        {hasAnswered && (
          <button
            onClick={handleNextQuestion}
            className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold text-sm hover:bg-primary-700 transition flex items-center justify-center gap-2"
          >
            {room.currentQuestion + 1 >= room.totalQuestions ? 'See Results' : 'NEXT QUESTION'}
            <ArrowRight size={16} />
          </button>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Users size={14} />
            <span>{room.players.length} players</span>
          </div>
          <div className="flex items-center gap-4">
            {room.players
              .sort((a, b) => b.score - a.score)
              .slice(0, 3)
              .map((p, i) => (
                <div key={p.uid} className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">#{i + 1}</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{p.displayName}</span>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{p.score}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function GameResults({ room, onLeave }: { room: GameRoom; onLeave: () => void }) {
  const { user } = useAuth();
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  const isWinner = winner?.uid === user?.uid;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <div className="inline-flex p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-full mb-3">
          <Trophy size={40} className="text-yellow-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {isWinner ? 'Victory!' : 'Game Over'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {winner?.displayName} wins with {winner?.score} points!
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-4">
        <div className="space-y-2">
          {sortedPlayers.map((player, idx) => (
            <div
              key={player.uid}
              className={`flex items-center justify-between p-3 rounded-lg ${
                idx === 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-lg font-bold ${idx === 0 ? 'text-yellow-500' : 'text-gray-400'}`}>
                  #{idx + 1}
                </span>
                <div>
                  <div className="font-medium text-gray-800 dark:text-gray-100 text-sm">{player.displayName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {player.correctAnswers}/{player.totalAnswers} correct
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-purple-600 dark:text-purple-400">{player.score} pts</div>
                <div className="text-xs text-gray-400">🔥 {player.bestStreak} streak</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isWinner && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800 mb-4 text-center">
          <Zap size={24} className="mx-auto mb-1 text-purple-500" />
          <p className="font-bold text-purple-600 dark:text-purple-400">+{room.rewards.xp} XP + {room.rewards.coins} Coins</p>
        </div>
      )}

      <button
        onClick={onLeave}
        className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
      >
        Back to Arena
      </button>
    </div>
  );
}
