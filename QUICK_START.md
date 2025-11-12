# Obscurion v2 - Quick Start Guide

This guide will get you up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 15+ running
- Git repository cloned

## Setup Steps

### 1. Install Dependencies
```bash
cd /home/metrik/docker/Obscurion
npm install
```

### 2. Configure Environment
Create `.env` file (or verify existing):
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/obscurion?schema=public"
NEXTAUTH_URL="http://localhost:3082"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
NODE_ENV="development"
```

### 3. Setup Database
```bash
# Run migrations
npx prisma migrate dev

# (Optional) Seed database with test data
npx prisma db seed
```

### 4. Start Development Server
```bash
npm run dev
```

Visit: http://localhost:3082

## First Steps

### 1. Create Account
- Navigate to http://localhost:3082/auth/signup
- Enter email and password
- Sign up

### 2. Sign In
- Navigate to http://localhost:3082/auth/signin
- Enter credentials
- View dashboard

### 3. Create Your First Note
- Click "Create New Note" button
- Enter title: "My First Note"
- Add content with sensitive data:
  ```
  Test note with email: admin@example.com
  Server IP: 192.168.1.100
  Password: secret123
  ```
- Click "Create Note"
- Notice auto-redaction in action!

### 4. Test Search
- Navigate to Search page
- Enter query: "test"
- View highlighted results

### 5. Try Import
Create a test Markdown file `test-import.md`:
```markdown
---
title: Imported Note
type: JOURNAL
tags: [test, import]
---

# Imported Note

This is an imported note with:
- Email: test@example.com
- IP: 10.0.0.1

Q: What is auto-redaction?
A: Automatic removal of sensitive data from notes.
```

Import via API:
```bash
curl -X POST http://localhost:3082/api/import \
  -F "files=@test-import.md" \
  --cookie "next-auth.session-token=YOUR_SESSION_COOKIE"
```

## API Testing with curl

### Get Session Cookie
1. Sign in via browser
2. Open DevTools → Application → Cookies
3. Copy `next-auth.session-token` value

### Test Endpoints

#### List Notes
```bash
curl "http://localhost:3082/api/notes?page=1&limit=10" \
  --cookie "next-auth.session-token=YOUR_COOKIE"
```

#### Create Note
```bash
curl -X POST http://localhost:3082/api/notes \
  -H "Content-Type: application/json" \
  --cookie "next-auth.session-token=YOUR_COOKIE" \
  -d '{
    "title": "API Test Note",
    "content": "Testing API with email: test@example.com",
    "type": "GENERAL"
  }'
```

#### Search Notes
```bash
curl "http://localhost:3082/api/search?q=test" \
  --cookie "next-auth.session-token=YOUR_COOKIE"
```

#### Get Categories
```bash
curl "http://localhost:3082/api/categories" \
  --cookie "next-auth.session-token=YOUR_COOKIE"
```

#### Export Note
```bash
curl "http://localhost:3082/api/export?format=markdown&noteId=NOTE_ID" \
  --cookie "next-auth.session-token=YOUR_COOKIE" \
  -o exported-note.md
```

## Verify Features

### ✅ Feature Checklist

1. **Notes CRUD**
   - [ ] Create note via UI
   - [ ] View notes list
   - [ ] Edit existing note
   - [ ] Delete note
   - [ ] Pagination works

2. **Auto-Redaction**
   - [ ] Email redacted → `[REDACTED_EMAIL]`
   - [ ] IP redacted → `[REDACTED_IP]`
   - [ ] Password/token redacted → `[REDACTED_CREDENTIAL]`

3. **Flashcards**
   - [ ] Create note with Q&A format
   - [ ] Verify flashcards generated (check metadata)
   - [ ] View flashcard count on dashboard

4. **Search**
   - [ ] Search by title
   - [ ] Search by content
   - [ ] Filter by category
   - [ ] View highlighted matches

5. **Categories**
   - [ ] Create category
   - [ ] Assign to note
   - [ ] Filter notes by category
   - [ ] View category count

6. **Export**
   - [ ] Export single note (Markdown)
   - [ ] Export by category (bulk)
   - [ ] Verify metadata in export

7. **Import**
   - [ ] Import Markdown file
   - [ ] Frontmatter parsed correctly
   - [ ] Tags become categories
   - [ ] Auto-redaction applied

8. **Version History**
   - [ ] Edit note multiple times
   - [ ] View version history
   - [ ] Restore previous version

9. **Templates**
   - [ ] List templates
   - [ ] Create custom template
   - [ ] Use template for new note

10. **Dashboard**
    - [ ] View stats (notes, categories, flashcards)
    - [ ] See recent notes
    - [ ] Quick actions work

11. **Notes List**
    - [ ] Pagination
    - [ ] Bulk select
    - [ ] Delete multiple notes
    - [ ] Export from list

12. **Note Editor**
    - [ ] Auto-save (2s debounce)
    - [ ] View metadata
    - [ ] Copy to clipboard
    - [ ] Category sidebar

13. **Search Page**
    - [ ] Live search (500ms debounce)
    - [ ] Category filter
    - [ ] Result snippets
    - [ ] Match highlighting

## Troubleshooting

### Database Connection Error
```
Error: Can't reach database server
```
**Solution**: Ensure PostgreSQL is running and DATABASE_URL is correct.

```bash
# Check PostgreSQL status (macOS)
brew services list

# Check PostgreSQL status (Linux)
sudo systemctl status postgresql

# Start PostgreSQL
brew services start postgresql  # macOS
sudo systemctl start postgresql # Linux
```

### Prisma Client Not Generated
```
Error: @prisma/client did not initialize yet
```
**Solution**: Generate Prisma client
```bash
npx prisma generate
```

### Port Already in Use
```
Error: Port 3082 is already in use
```
**Solution**: Kill process or change port
```bash
# Find process on port 3082
lsof -ti:3082 | xargs kill -9

# Or change port in package.json
"dev": "next dev -p 3000"
```

### TypeScript Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild
npm run build
```

### Session/Auth Issues
```
Error: Unauthorized
```
**Solution**:
1. Clear browser cookies
2. Sign out and sign in again
3. Verify NEXTAUTH_URL matches your current URL
4. Check NEXTAUTH_SECRET is set

## Production Deployment

### Build
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Environment Variables (Production)
```env
DATABASE_URL="postgresql://user:password@prod-db:5432/obscurion"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-secure-secret-32-chars-min"
NODE_ENV="production"
```

### Docker Deployment
```bash
# Build image
docker build -t obscurion:latest .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f app
```

## Next Steps

1. **Customize Templates**: Add your own note templates
2. **Configure Categories**: Create categories for your workflow
3. **Import Existing Notes**: Bulk import your Markdown files
4. **Set Up Backups**: Schedule regular database backups
5. **Monitor Performance**: Add APM (DataDog, New Relic)
6. **Add Tests**: Write unit and E2E tests for critical flows

## Resources

- **Full Documentation**: See `IMPLEMENTATION_SUMMARY.md`
- **Project Guide**: See `CLAUDE.md`
- **Database Schema**: `prisma/schema.prisma`
- **API Reference**: `IMPLEMENTATION_SUMMARY.md` (API Endpoint Reference section)

## Support

For issues or questions:
1. Check `IMPLEMENTATION_SUMMARY.md` troubleshooting section
2. Review server logs: `docker-compose logs app`
3. Check browser console for frontend errors
4. Verify database connectivity: `npx prisma studio`

---

**Happy Note Taking! 📝**
