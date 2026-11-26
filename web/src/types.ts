export type User = { id: string; displayName: string; email: string; admin: boolean }
export type Goal = {
  position: string; level?: string | null; topics: string[]; interviewDate?: string | null
  minutesPerDay?: number | null; daysPerWeek?: number | null; language: 'vi' | 'en'; timeZone: string
  roadmap: string[]; reviewTopics: string[]; skipDay?: string | null; track?: string | null; trackStart?: string
}
export const defaultGoal: Goal = {
  position: '', topics: [], language: 'vi', timeZone: 'Asia/Ho_Chi_Minh', roadmap: [], reviewTopics: [],
}

export const labels = {
  topics: { csharp: 'C# & .NET', oop: 'OOP & Thiết kế', linq: 'LINQ & Async', aspnet: 'ASP.NET Core', efcore: 'EF Core', sql: 'SQL & Database', algorithms: 'Thuật toán', testing: 'Testing & Tình huống', systems: 'Hệ thống phân tán', delivery: 'Git & Triển khai', behavioral: 'HR & Dự án' },
  difficulty: { easy: 'Cơ bản', medium: 'Trung bình', hard: 'Nâng cao' },
  level: { intern: 'Intern', fresher: 'Fresher', junior: 'Junior', mid: 'Middle', senior: 'Senior' },
  mastery: { new: 'Chưa học', learning: 'Đang học', self: 'Đã hiểu theo tự đánh giá', ai: 'Đã được AI đánh giá', review: 'Cần ôn lại', secure: 'Đã được kiểm chứng', mastered: 'Thành thạo có bằng chứng' },
  reviewReason: { objective: 'Đáp án chưa đúng', transfer: 'Bài vận dụng chưa đúng', assisted: 'Cần trả lời lại độc lập', self: 'Tự đánh giá cần luyện thêm', ai: 'AI đề nghị kiểm tra lại', skipped: 'Đã bỏ qua', stale: 'Bằng chứng cần cập nhật', version: 'Nội dung có phiên bản mới', essay: 'Cần luyện lại' },
  exerciseProgress: { new: 'Chưa luyện', draft: 'Đã lưu nháp', hint: 'Đã xem gợi ý', solution: 'Đã xem lời giải', reviewed: 'Đã tự đối chiếu', submitted: 'Đã gửi chấm', attempted: 'Đã chạy thử', accepted: 'Đạt test với trợ giúp', independent: 'Đã giải độc lập', 'needs-review': 'Cần kiểm chứng lại' },
  format: { concept: 'Khái niệm', compare: 'So sánh', read: 'Đọc mã', debug: 'Tìm lỗi', predict: 'Dự đoán', design: 'Thiết kế', experience: 'Kinh nghiệm', quiz: 'Trắc nghiệm' },
  rating: { unsure: 'Chưa hiểu', partial: 'Hiểu một phần', clear: 'Giải thích được' },
  status: { viewed: 'Đã xem tài liệu', answered: 'Đã trả lời', skipped: 'Đã bỏ qua', unasked: 'Chưa hỏi', unanswered: 'Chưa trả lời', active: 'Đang thực hiện', paused: 'Đã tạm dừng', completed: 'Hoàn thành', ended: 'Kết thúc sớm', expired: 'Hết giờ' },
  preset: { foundation: 'Nền tảng .NET', backend: 'Backend & API', 'problem-solving': 'SQL & Problem Solving', design: 'System Design', coding: 'Coding Interview', 'sql-round': 'SQL Interview', people: 'HR & Dự án' },
  publication: { draft: 'Nháp', published: 'Đã xuất bản', retired: 'Ngừng xuất bản' },
}
export function label(group: keyof typeof labels, key?: string | null) {
  return key ? (labels[group] as Record<string, string>)[key] ?? key : ''
}
export const runStatuses: Record<string, string> = { requested:'Đã gửi yêu cầu', queued:'Đang chờ', running:'Đang chạy', completed:'Đã chạy', accepted:'Đạt',
  compile_error:'Lỗi biên dịch', runtime_error:'Lỗi thực thi', wrong_answer:'Sai kết quả', timeout:'Quá thời gian', memory_limit:'Vượt bộ nhớ',
  output_limit:'Vượt giới hạn output', cancelled:'Đã hủy', failed:'Worker gặp lỗi' }
export const rubricTitles = ['Tính đúng kỹ thuật', 'Lập luận và điều kiện áp dụng', 'Chiều sâu và đánh đổi', 'Diễn đạt']

export type Topic = { id: string; name: string; stage: string; check: string; exercise: string }
export type Card = {
  slug: string; version: number; title: string; topic: string; format: string; difficulty: string; level: string
  technology?: string; minutes: number; bookmarked: boolean; outcome?: string; rating?: string; due?: string; tags?: string[]; mastery?: string; verifiedDays?: number; reviewReason?: string; aiAssessed?: boolean
}
export type Question = {
  card: Card; subtopic: string; tags: string[]; prompt: string; englishPrompt: string; context: string; code?: string
  choices?: { vi: string[]; en: string[] }; prerequisites: string[]; related: string[]
}
export type Reference = {
  version: number; shortAnswer: string; outline: string[]; explanation: string; alternative: string; trap: string
  rubric: string[]; source: string; checkedOn: string
}
export type DraftCursor = { id: string; revision: number; version: number }
export type PracticeDraft = { cursor: DraftCursor; text: string; hint?: string; nextHint?: string; reference?: Reference }
export type PracticeData = { question: Question; draft?: PracticeDraft; lastAttemptId?: string }
export type AnswerRevision = { id: string; text: string; at: string }
export type AiReview = {
  provider: string; model: string; rubricVersion: number; at: string
  body: {
    criteria: { status: 'scored' | 'insufficient' | 'notApplicable'; score?: number; finding: string; evidence?: string }[]
    correct: string[]; missing: string[]; incorrect: string[]; conditions: string[]; suggestions: string[]
    referenceAnswer?: string; criticalErrors?: string[]; expression?: string[]
  }
}
export type Attempt = {
  choice?: number; correct?: boolean; studySessionId?: string
  id: string; question: Question; text: string; language: string; outcome: string; hintSeen: boolean; answerSeen: boolean
  at: string; activeSeconds: number; referenceViewedAt?: string; rating?: string; revisions: AnswerRevision[]
}
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number }
export type TopicActivity = { topic: string; catalogCount: number; answers: number; practicedQuestions: number; confidentQuestions: number }
export type DayActivity = { date: string; answers: number; seconds: number; completedMocks: number; objective: number; correct: number }
export type StudyLink = { label: string; path: string; reason: string; topic?: string }
export type Dashboard = {
  month: DayActivity[]; trackDay?: number; studyDay: boolean; todayPlan: StudyLink[]
  goal: Goal; today: string; questionCount: number; answers: number; completedMocks: number; activeSeconds: number; weekSeconds: number
  streak: number; dueCount: number; weakCount: number; codingRemaining: number; sqlRemaining: number; resume?: StudyLink
  suggestions: StudyLink[]; due: Card[]; topics: TopicActivity[]; week: DayActivity[]; runnerAvailable: boolean
}
export type History = {
  id: string; label: string; path: string; topic: string; status: string; rating?: string; at: string; assessmentSource: string
  version: number; hintSeen: boolean; answerSeen: boolean; revisions: number; hasAiFeedback: boolean
}
export type Note = { id: string; title: string; text: string; slug?: string; topic?: string; important: boolean; revision: number; updatedAt?: string }
export type Preset = { id: string; name: string; description: string; topics: string[] }
export type Interview = {
  session: { id: string; preset: string; mode: 'guided' | 'mock'; language: 'vi' | 'en'; status: string; startedAt: string; minutes: number }
  revision: number; position: number; count: number; stage: 'question' | 'followup' | 'feedback'; draft: string
  serverNow: string; deadline: string; pausedSeconds?: number
  current?: { slug: string; version: number; title: string; topic: string; text: string; context?: string; code?: string; hint?: string;
    reference?: Reference; answer?: string; followUpAnswer?: string; rating?: string }
  report?: ReportItem[]
}
export type ReportItem = {
  position: number; slug: string; title: string; topic: string; prompt: string; status: string; answer?: string
  hintSeen: boolean; followUp?: string; followUpAnswer?: string; followUpSkipped: boolean; rating?: string; reference: Reference
}
export type ExerciseKind = 'coding' | 'sql'
export type ExerciseCard = {
  slug: string; kind: ExerciseKind; title: string; difficulty: string; topic: string; tags: string[]; version: number
  runtime: string; minutes: number; hasDraft: boolean; reviewed: boolean; progress: string; hintSeen: boolean; solutionSeen: boolean
}
export type Example = { input: string; output: string; explanation: string }
export type ExerciseDraft = { revision: number; text: string; savedAt: string; hintSeen: boolean; solutionSeen: boolean; reviewed: boolean }
export type Exercise = {
  tables?: { name:string; columns:{name:string;type:string}[]; rows:(string|null)[][] }[]
  card: ExerciseCard; testVersion: number; description: string; input: string; output: string; constraints: string[]; examples: Example[]
  tests: Example[]; starter: string; schema?: string; dataset?: string; expected?: string; ordered?: boolean
  hint?: string; reference?: { code: string; explanation: string; complexity: string }; draft?: ExerciseDraft; savedVersions: number[]; runnerAvailable: boolean
}
export type ExternalPractice = {
  link: { slug: string; number: number; name: string; url: string; difficulty: string; tags: string[]; checkedOn: string }
  record?: { status: string; note: string }
}
export type QuestionContent = {
  title: string; topic: string; subtopic: string; tags: string[]; format: string; difficulty: string; level: string; minutes: number
  technology?: string | null; prompt: string; englishPrompt: string; context: string; code?: string | null; hint: string
  followUp: string; englishFollowUp: string; outline: string[]; shortAnswer: string; explanation: string; alternative: string
  trap: string; rubric: string[]; source: string; checkedOn: string; nextHint?: string; core?: boolean
  prerequisites?: string[]; related?: string[]; quiz?: { vi: string[]; en: string[]; correctIndex: number } | null
}
export type EditorialRow = { slug: string; latest: number; published?: number; status: string; title: string; topic: string }
export type Editorial = Omit<EditorialRow, 'title' | 'topic'> & { revision: number; content: QuestionContent }
