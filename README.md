# Obscurion

A modern, feature-rich note-taking application built with Next.js, PostgreSQL, and Prisma. Obscurion provides advanced note management with version history, intelligent search, flashcard generation, and more.

## Features

- **Authentication**: Secure user authentication with NextAuth.js
- **Note Management**: Create, edit, delete, and organize notes
- **Rich Text Support**: Full markdown support for note content
- **Version History**: Track changes with complete revision history
- **Advanced Search**: Full-text search with pagination and highlighting
- **Tags & Categories**: Organize notes with flexible tagging and categorization
- **Status Tracking**: Mark notes as ACTIVE, ARCHIVED, or DRAFT
- **Pinned Notes**: Quick access to important notes
- **Flashcard Generation**: Auto-generate study flashcards from notes
- **Admin Dashboard**: User management and system analytics
- **Audit Logging**: Complete audit trail of all user actions

## Tech Stack

- **Frontend**: Next.js 14.2 with React 18
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Hosting**: Docker & Docker Compose

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development without Docker)
- PostgreSQL 15+ (or use included Docker container)
- GitHub OAuth App credentials (optional, for GitHub authentication)

## Quick Start

### Option 1: Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/metrik420/Obscurion.git
   cd Obscurion
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and add your configuration values

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Initialize database**
   ```bash
   docker-compose exec app npx prisma migrate deploy
   ```

5. **Access the app**
   - Application: http://localhost:3000
   - PostgreSQL: localhost:5432

### Option 2: Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

3. **Set up database**
   ```bash
   npx prisma migrate dev
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## Project Structure

```
Obscurion/
├── src/
│   ├── app/                  # Next.js app directory
│   │   ├── api/              # API routes
│   │   ├── auth/             # Authentication pages
│   │   ├── dashboard/        # Main application pages
│   │   └── admin/            # Admin dashboard
│   ├── components/           # React components
│   ├── lib/                  # Utilities and helpers
│   └── styles/               # Global styles
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
├── public/                   # Static assets
├── docker-compose.yml        # Docker configuration
├── Dockerfile                # Container definition
└── package.json
```

## API Endpoints

### Notes
- `GET /api/notes` - List user's notes
- `POST /api/notes` - Create new note
- `GET /api/notes/[id]` - Get specific note
- `PUT /api/notes/[id]` - Update note
- `DELETE /api/notes/[id]` - Delete note

### Search
- `GET /api/search?q=query&page=1` - Search notes with pagination

### Version History
- `GET /api/notes/[id]/versions` - List note versions
- `POST /api/notes/[id]/versions/[versionId]/restore` - Restore previous version

### Categories & Filters
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `GET /api/filters` - Get available filter options

### Flashcards
- `POST /api/notes/[id]/flashcards/generate` - Generate flashcards
- `GET /api/notes/[id]/flashcards` - List flashcards

## Environment Variables

Create a `.env.local` file (copy from `.env.example`):

```env
DATABASE_URL="postgresql://user:password@postgres:5432/obscurion"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
GITHUB_ID="your-github-oauth-id"
GITHUB_SECRET="your-github-oauth-secret"
```

## Common Tasks

### View Database
```bash
npx prisma studio
```

### Run Migrations
```bash
npx prisma migrate dev --name migration_name
```

### Build for Production
```bash
npm run build
npm start
```

### Run Tests
```bash
npm run test
```

### Lint Code
```bash
npm run lint
```

## Troubleshooting

### Container won't start
```bash
docker-compose down
docker-compose up --build
```

### Database connection error
```bash
docker-compose logs postgres
docker-compose exec app npx prisma migrate reset
```

### Port already in use
```bash
# Change port in docker-compose.yml or free up:
lsof -i :3000
kill -9 <PID>
```

### Authentication issues
- Verify `.env.local` has correct NEXTAUTH_SECRET
- Check GITHUB_ID and GITHUB_SECRET are valid
- Clear browser cookies and try again

## Development

### Technology Choices
- **Next.js**: Modern React framework with built-in API routes
- **Prisma**: Type-safe ORM for database management
- **PostgreSQL**: Reliable, feature-rich relational database
- **Tailwind CSS**: Utility-first CSS framework
- **TypeScript**: Type-safe JavaScript development

### Code Quality
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting

## Security

- Environment variables protected via `.gitignore`
- CSRF protection through NextAuth
- Input validation and sanitization
- SQL injection prevention via Prisma
- XSS protection with React
- Secure session management

## Database Schema

Key entities:
- **User**: User accounts and authentication
- **Note**: Note content with metadata
- **NoteVersion**: Version history tracking
- **Tag**: Flexible tagging system
- **Category**: Note categories
- **Flashcard**: Generated study cards
- **AuditLog**: Compliance and audit trail

## Deployment

### Docker Production
```bash
docker-compose up -d
docker-compose exec app npx prisma migrate deploy
```

### Vercel/Railway
1. Connect GitHub repository
2. Set environment variables in platform dashboard
3. Deploy

## Support

For issues or questions, please open an issue on GitHub.

## License

Proprietary - MetrikCorp

---

**Status**: Production Ready
**Version**: 1.0.0
