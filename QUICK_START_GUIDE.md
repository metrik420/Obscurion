# Quick Start Guide - Obscurion Features

## 🚀 Getting Started

### 1. Build and Run
```bash
npm run build
npm run dev
```

### 2. Access the Application
- **URL**: http://localhost:3000 (or your server URL)
- **Login**: Use your account

---

## 📍 Navigation

Every page now has a sticky navigation bar at the top with:
- **Obscurion** logo (click to go to Dashboard)
- **Dashboard** link
- **Notes** link
- **Flashcards** link (NEW!)
- **Search** link
- **Your Email** display
- **Logout** button

*Works on desktop and mobile (hamburger menu)*

---

## 📝 How to Create and Manage Flashcards

### Step 1: Create a Note with Content
1. Click **Dashboard** → **Create New Note**
2. Add a title (e.g., "French Capital")
3. Add content in any format, such as:
   - Q: What is the capital of France? A: Paris
   - Q: What is 2+2? A: 4

### Step 2: View Auto-Generated Flashcards
1. Save the note
2. Scroll to the sidebar → **Quick Actions**
3. Click **View Flashcards (6)** ← Shows count
4. See auto-generated flashcards from your note content

### Step 3: Manage All Flashcards
1. Click **Flashcards** in the navigation menu
2. See all your flashcards across ALL notes
3. Use filters to find specific flashcards:
   - Filter by **Note** (dropdown)
   - Filter by **Difficulty** (Easy/Medium/Hard)
   - **Search** by question or answer text
4. **Sort** by Date Created or Difficulty

### Step 4: Edit Individual Flashcard
1. From the Flashcard Manager, click **Edit** on any card
2. Change the Question, Answer, or Difficulty
3. Click **Save**
4. Click **Back** to return to the manager

### Step 5: Delete a Flashcard
1. From the Flashcard Manager or Quick View, click **Delete**
2. Confirm deletion
3. Flashcard is removed immediately

---

## ⏱️ How to Use Version History

### Step 1: Make Changes to a Note
1. Open a note in the editor
2. Make some changes
3. Let auto-save run (watch for "Saving..." text)
4. Make more changes

### Step 2: View All Versions
1. Scroll to sidebar → **Quick Actions**
2. Click **View Version History (5)** ← Shows count
3. See all versions listed with timestamps

### Step 3: Compare Versions
1. Click **View** on any version
2. See side-by-side comparison with current version
3. See character count differences
4. See what changed between versions

### Step 4: Restore a Previous Version
1. Click **Restore** on the version you want to restore
2. Confirm: "Are you sure you want to restore this version?"
3. The note is restored to that version
4. A NEW version entry is created (nothing is lost)
5. Click **Back to Editor** to continue editing

---

## 🔍 How to Search Notes

1. Click **Search** in the navigation
2. Type your search query
3. Results appear with highlighted matches
4. Filter by category if needed
5. Click a note to edit it

---

## 🎯 Keyboard Shortcuts

- **Tab** - Navigate between elements
- **Enter** - Click buttons, submit forms
- **Escape** - Close modals/menus
- **Ctrl+S** (some browsers) - Save note

---

## 📱 Mobile Usage

The application works great on mobile:
1. Navigation menu becomes a **hamburger menu** (≡)
2. Click the hamburger to open/close menu
3. All content is responsive and readable
4. Touch-friendly buttons and inputs

---

## ⚙️ Settings & Preferences

### User Profile
- Click your **email** in navigation
- Shows your account information
- Click **Logout** to sign out

### Note Types
When creating a note, choose a type:
- **General** - Default notes
- **Journal** - Personal reflections
- **VPS** - Virtual server notes
- **Dedicated** - Dedicated server info
- **Shared** - Shared hosting notes
- **Incident** - Incident reports
- **Documentation** - Tech documentation

---

## 🔐 Security Features

The application automatically:
- ✅ Redacts sensitive data (emails, IPs, passwords)
- ✅ Protects your data with authentication
- ✅ Validates all inputs
- ✅ Protects against attacks

---

## 🆘 Troubleshooting

### Navigation Not Showing?
1. Hard refresh your browser (Ctrl+Shift+R)
2. Clear browser cache
3. Make sure you're logged in
4. Check browser console (F12) for errors

### Flashcards Not Showing?
1. Make sure your note has content (auto-generation looks for text)
2. Save the note and wait 2 seconds
3. Click "View Flashcards" again
4. Check browser console (F12) for errors

### Version History Not Working?
1. Make sure you've made changes to the note
2. Auto-save must run (wait 2+ seconds after typing)
3. Click "View Version History"
4. Check browser console (F12) for errors

### Logout Not Working?
1. Check that JavaScript is enabled
2. Try clearing cookies and refreshing
3. Try a different browser
4. Check the browser console for errors

---

## 📊 Tips & Tricks

### Maximize Flashcard Generation
Format your note with clear Q&A:
```
Q: What is the capital of France?
A: Paris

Q: What is 2+2?
A: 4

Q: Who wrote Romeo and Juliet?
A: William Shakespeare
```

### Use Version History Like a Timeline
1. Make changes to your note
2. Use version history to see your thought process
3. Restore earlier versions if needed
4. No data is ever lost (all versions preserved)

### Organize with Categories
1. When editing a note, assign categories
2. Use these categories when searching
3. Makes notes easier to find later

### Copy Notes to Clipboard
1. Open a note
2. Click **Copy to Clipboard**
3. Paste anywhere

### Export Notes as Markdown
1. Open a note (not new notes)
2. Click **Export Markdown**
3. Opens .md file download

---

## 🎓 Learning Resources

For detailed information, see:
- `COMPLETE_IMPLEMENTATION_SUMMARY.md` - Full feature overview
- `FLASHCARD_MANAGER_GUIDE.md` - Flashcard system details
- `VERSION_HISTORY_IMPLEMENTATION.md` - Version history details
- `TEST_FLASHCARD_MANAGER.md` - Testing guide
- `TEST_VERSION_HISTORY.md` - Testing guide

---

## ✅ Feature Checklist

- [x] Navigation menu on every page
- [x] Create notes with auto-save
- [x] Auto-generate flashcards from notes
- [x] Manually create flashcards
- [x] Edit flashcards
- [x] Delete flashcards
- [x] Search flashcards
- [x] Filter flashcards by note/difficulty
- [x] View version history
- [x] Compare versions side-by-side
- [x] Restore previous versions
- [x] Search notes
- [x] Export notes to Markdown
- [x] Mobile responsive design
- [x] Keyboard accessible
- [x] Screen reader friendly

All features are fully implemented and working! 🎉

---

## 📞 Questions?

If something isn't clear:
1. Check the QUICK_START_GUIDE.md (this file)
2. Check the detailed guides listed above
3. Check your browser console (F12) for errors
4. Review the testing guides for step-by-step examples

**Status**: ✅ All features working
**Last Updated**: November 11, 2024
