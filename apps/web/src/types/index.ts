export interface User {
  id:        string;
  name:      string;
  email:     string;
  language:  'english' | 'urdu' | 'roman_urdu';
  timezone:  string;
  createdAt: string;
}

export interface Task {
  id:          string;
  userId:      string;
  title:       string;
  description?: string;
  dueDate?:    string;
  reminderAt?: string;
  priority:    1 | 2 | 3;
  status:      'pending' | 'in_progress' | 'done';
  source:      'manual' | 'study' | 'study_sync' | 'extension';
  sourceMeta?: Record<string, unknown>;
  tags:        string[];
  createdAt:   string;
  updatedAt:   string;
}

export interface StudyItem {
  id:             string;
  userId:         string;
  type:           'subject' | 'book' | 'course' | 'language';
  title:          string;
  description?:   string;
  priorityPct:    number;
  color:          string;
  deadline?:      string;
  difficulty:     number;
  estimatedHours: number;
  hoursCompleted: number;
  createdAt:      string;
  updatedAt:      string;
  notes?:         Note[];
  resources?:     Resource[];
  _count?: { notes: number; resources: number };
}

export interface StudySession {
  id:           string;
  userId:       string;
  studyItemId:  string;
  title:        string;
  plannedDate:  string;
  startTime:    string;
  endTime:      string;
  durationMins: number;
  status:       'pending' | 'completed' | 'skipped';
  notes?:       string;
  xpEarned:     number;
  completedAt?: string;
  createdAt:    string;
  studyItem?:   { title: string; color: string; type: string };
}

export interface UserStats {
  id:            string;
  userId:        string;
  xp:            number;
  level:         number;
  streak:        number;
  longestStreak: number;
  lastStudyDate: string | null;
  totalSessions: number;
  totalMinutes:  number;
  xpForNextLevel: number;
  xpProgress:    number;
  xpRange:       number;
  achievements:  Achievement[];
}

export interface Achievement {
  id:     string;
  icon:   string;
  label:  string;
  desc:   string;
  earned: boolean;
}

export interface Note {
  id:          string;
  studyItemId: string;
  userId:      string;
  title?:      string;
  content:     string;
  createdAt:   string;
  updatedAt:   string;
}

export interface Resource {
  id:          string;
  studyItemId: string;
  userId:      string;
  type:        'pdf' | 'link';
  title?:      string;
  url:         string;
  fileSize?:   number;
  createdAt:   string;
}

export interface AiChat {
  id:           string;
  studyItemId?: string;
  title?:       string;
  messages:     ChatMessage[];
  createdAt:    string;
  updatedAt:    string;
}

export interface ChatMessage {
  role:    'user' | 'assistant';
  content: string;
  ts:      string;
}

export interface Notification {
  id:        string;
  title:     string;
  body:      string;
  type:      'reminder' | 'warning' | 'alarm' | 'achievement' | 'system';
  taskId?:   string;
  read:      boolean;
  createdAt: string;
}

export interface SearchResults {
  web:      SearchItem[];
  handouts: SearchItem[];
  papers:   SearchItem[];
  books:    BookResult[];
}

export interface SearchItem {
  title:   string;
  url:     string;
  snippet: string;
  type:    string;
}

export interface BookResult {
  id:            string;
  title:         string;
  authors:       string[];
  description:   string;
  thumbnail:     string;
  previewLink:   string;
  pdfLink:       string;
  publisher:     string;
  publishedDate: string;
  pageCount:     number;
  source:        'google_books' | 'open_library';
}
