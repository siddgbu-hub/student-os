# Student OS — Version 1.0.0 Release Changelog

## 🚀 Version 1.0.0 (Production Release)

### Core Platform Architecture
- **Monorepo Structure**: Structured pnpm monorepo consisting of `@student-os/shared`, `@student-os/config`, `@student-os/ui`, `backend` (Hono on Cloudflare Workers), `frontend` (Vite + React), and `admin`.
- **Design Tokens**: Standardized design tokens in `packages/ui/src/styles/tokens.css` powering light, dark, and system theme modes.

### Authentication & Device Session Management
- **Google Sign-In**: Promoted Google Sign-In as primary CTA above Email OTP option on authentication screen.
- **Email OTP Rate Limiting**: Maximum 3 OTP requests per email within rolling 15-minute window. HTTP 429 returned on excess attempts.
- **Device Invalidation**: Revoking device session terminates session tokens across authenticated devices.

### Study Engine Vertical Slice
- **Subject & Chapter Management**: Full CRUD for subjects and chapters with visual progress badges.
- **Study Session Lifecycle**: Real-time study timer with start, pause, resume, end, and cancel controls.
- **Mutual Exclusion**: Guaranteed single active session across study and revision modules.

### Planner Workspace Vertical Slice
- **Task Management**: Structured task planning by planned date, priority (high/medium/low), and estimated duration.
- **Status Lifecycle**: Task status transitions (`planned`, `in_progress`, `completed`, `deferred`, `cancelled`).
- **Daily & Weekly Views**: Day and week planning view toggles with planning completion accuracy metrics.

### Spaced Repetition Revision Module
- **Automatic Scheduling**: Study session completion triggers automatic creation of Stage 1 revision items (+1 day).
- **Spaced Repetition Escalation**: Stage progression (+1d, +3d, +7d, +14d, +30d) advancing retention score.
- **Revision Workspace**: Due Today, Overdue, Upcoming, and Completed revision queues.

### Analytics Data Intelligence Engine
- **Learning Summary Metrics**: Total Focus Time, Study Streak (current & longest), Daily Average Study Time, Revision Completion %, Planner Accuracy %.
- **Interactive SVG Charts**: Responsive `TrendBarChart` (Study vs Revision duration) and `SubjectDistributionChart` (Subject focus share).
- **Time Period Selectors**: Dynamic filtering across `Today`, `This Week`, `This Month`, `This Year`.

### User Account & Personalization Module
- **Profile & Academic Details**: User full name, institution name, course, class/year, stream, daily target minutes, and preferred session duration.
- **Theme Preferences Engine**: Instant application of `light`, `dark`, or `system` themes to `document.documentElement.dataset.theme`.
- **Account Actions**: Data export overview, device session revocation, and permanent account deletion modal.

### Application Polish & Accessibility
- **Toast Notifications**: Global Toast system (`useToast`) supporting success, error, warning, info notifications.
- **Empty States**: Standardized `EmptyState` component with icon, heading, description, and primary CTA across all modules.
- **Accessibility**: Keyboard `Escape` key close handlers on all modal dialogs, focus trapping, and ARIA live regions.
