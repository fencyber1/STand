/**
 * Core data models for STAND Classroom feature
 * Does not modify any existing types
 */

// --- ROOM ---
export type RoomType =
  | 'physical_digital'
  | 'fully_online'
  | 'hybrid';

export type RoomStatus = 'active' | 'archived' | 'draft';

export interface Room {
  id: string;
  roomCode: string;
  name: string;
  course: string;
  level: string;
  academicYear: string;
  semester: string;
  description?: string;
  institution?: string;
  department?: string;
  classCode?: string;
  profileImage?: string;
  startDate?: Date;
  endDate?: Date;
  roomType: RoomType;
  ownerId: string;
  ownerName: string;
  studentCount: number;
  topicsPublished: number;
  totalTopics: number;
  currentTopic?: string;
  upcomingAssessment?: string;
  status: RoomStatus;
  aiInsightsEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// --- USER ROLES ---
export type ClassroomUserRole =
  | 'teacher'
  | 'assistant_teacher'
  | 'student'
  | 'admin';

export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: ClassroomUserRole;
  joinedAt: Date;
  status: 'active' | 'removed';
  progress?: number;
}

// --- TOPICS ---
export type TopicStatus = 'draft' | 'published' | 'archived';

export interface Topic {
  id: string;
  roomId: string;
  title: string;
  description?: string;
  sourceFiles?: SourceFile[];
  status: TopicStatus;
  order: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  aiContent?: TopicContent;
  lastGeneratedAt?: Date;
  progress?: number;
}

export interface SourceFile {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'pptx' | 'image' | 'text' | 'ppt' | 'doc';
  url: string;
  size: number;
  uploadedAt: Date;
  extractedText?: string;
}

export interface TopicContent {
  introduction: string;
  learningObjectives: string[];
  keyTerminology: KeyTerm[];
  lesson: LessonSection;
  simpleExplanation: string;
  advancedExplanation: string;
  examples: Example[];
  realWorldApplications: string[];
  caseStudies: CaseStudy[];
  interactiveActivities: InteractiveActivity[];
  knowledgeChecks: KnowledgeCheck[];
  practiceQuestions: PracticeQuestion[];
  revisionNotes: string;
  summary: string;
  topicAssessment?: AssessmentSkeleton;
  additionalResources: Resource[];
}

interface KeyTerm {
  term: string;
  definition: string;
}

interface LessonSection {
  simple: string;
  detailed: string;
}

interface Example {
  title: string;
  description: string;
  type: 'basic' | 'intermediate' | 'advanced';
}

interface CaseStudy {
  id: string;
  title: string;
  scenario: string;
  questions: string[];
  learningOutcomes: string[];
}

interface InteractiveActivity {
  id: string;
  type: 'drag_drop' | 'matching' | 'simulation' | 'quiz';
  title: string;
  content: any;
}

interface KnowledgeCheck {
  id: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface PracticeQuestion {
  id: string;
  text: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface Resource {
  title: string;
  url: string;
  type: 'article' | 'video' | 'document' | 'link';
}

interface AssessmentSkeleton {
  questions: AssessmentQuestionTemplate[];
  passingScore: number;
}

interface AssessmentQuestionTemplate {
  text: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  difficulty: 'easy' | 'medium' | 'hard';
}

// --- ASSESSMENTS ---
export type AssessmentMode =
  | 'same-questions'
  | 'randomized-order'
  | 'question-pool'
  | 'custom';

export type AssessmentStatus =
  | 'draft'
  | 'scheduled'
  | 'live'
  | 'closed'
  | 'graded'
  | 'released';

export interface Assessment {
  id: string;
  roomId: string;
  topicId: string;
  title: string;
  description?: string;
  instructions?: string;
  scheduledAt: Date;
  startsAt?: Date;
  endsAt?: Date;
  durationMinutes: number;
  questionCount: number;
  totalMarks: number;
  passingScore: number;
  maxAttempts: number;
  mode: AssessmentMode;
  status: AssessmentStatus;
  questions: Question[];
  releasedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: string;
  assessmentId?: string;
  text: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'case_study';
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  order: number;
  source: 'manual' | 'ai';
  aiGenerated?: boolean;
  createdAt: Date;
}

export interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Submission {
  id: string;
  assessmentId: string;
  studentId: string;
  roomId: string;
  startedAt: Date;
  submittedAt?: Date;
  answers: Record<string, any>;
  currentScore?: number;
  finalScore?: number;
  percentage?: number;
  feedback?: string;
  status: 'in-progress' | 'submitted' | 'graded' | 'released';
  aiGraded?: boolean;
  teacherReviewed?: boolean;
}

// --- STUDENT PROGRESS ---
export interface StudentProgress {
  id: string;
  studentId: string;
  roomId: string;
  topicId: string;
  lessonCompletion: number;
  practiceScores: number[];
  assessmentScores: number[];
  knowledgeCheckScores: number[];
  weakAreas: string[];
  strongAreas: string[];
  masteryLevel: 'struggling' | 'developing' | 'proficient' | 'mastering';
  lastActivity: Date;
  timeSpent: number; // seconds
  streak: number;
}

// --- ATTENDANCE ---
export type AttendanceType = 'physical' | 'online' | 'lesson' | 'assessment';

export interface Attendance {
  id: string;
  roomId: string;
  studentId: string;
  date: Date;
  type: AttendanceType;
  status: 'present' | 'absent' | 'late' | 'excused';
  verifiedBy?: string;
  createdAt: Date;
}

// --- ANNOUNCEMENTS ---
export interface Announcement {
  id: string;
  roomId: string;
  teacherId: string;
  title: string;
  body: string;
  type: 'general' | 'assessment' | 'assignment' | 'physical' | 'revision';
  scheduledAt?: Date;
  sentAt: Date;
  recipientCount: number;
  status: 'draft' | 'scheduled' | 'sent';
  createdAt: Date;
  updatedAt: Date;
}

// --- ANALYTICS ---
export interface ClassAnalytics {
  roomId: string;
  generatedAt: Date;
  metrics: {
    totalStudents: number;
    averageScore: number;
    passRate: number;
    completionRate: number;
    activeStudents: number;
  };
  topicMastery: TopicMastery[];
  assessmentSummary: AssessmentSummary[];
  attendanceRate: number;
}

interface TopicMastery {
  topicId: string;
  topicName: string;
  averageMastery: number;
  weakStudents: number;
}

interface AssessmentSummary {
  assessmentId: string;
  title: string;
  averageScore: number;
  passRate: number;
}

export interface AIInsight {
  id: string;
  roomId?: string;
  studentId?: string;
  type: 'class' | 'student' | 'topic' | 'assessment';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  actionable: boolean;
  recommendedAction?: string;
  generatedAt: Date;
  acknowledgedAt?: Date;
}
