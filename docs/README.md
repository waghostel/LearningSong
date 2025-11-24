# LearningSong Documentation

Welcome to the LearningSong documentation! This folder contains guides to help you test and develop the application.

---

## 📚 Documentation Index

### Getting Started

1. **[Quick Start Guide](quick-start-guide.md)** ⚡
   - Get the app running in 2 minutes
   - Basic commands and setup
   - What to test first
   - **Start here if you're new!**

### Testing Guides

2. **[Testing Text Input Page](testing-text-input-page.md)** 🧪
   - Comprehensive testing scenarios
   - Sample test content
   - Expected behaviors
   - Integration with backend
   - **Use this for thorough testing**

3. **[Visual Testing Checklist](visual-testing-checklist.md)** ✅
   - Systematic UI/UX testing
   - Component-by-component checklist
   - Accessibility testing
   - Responsive design testing
   - **Use this for QA and visual regression testing**

### Troubleshooting

4. **[Troubleshooting Guide](troubleshooting.md)** 🔧
   - Common issues and solutions
   - Frontend problems
   - Backend problems
   - Build and test issues
   - **Check here when something goes wrong**

### API Documentation

5. **[Suno API Documentation](suno-api/)** 🎵
   - Suno API integration details
   - Music generation endpoints
   - Style presets
   - **For backend developers**

---

## 🎯 Quick Links by Role

### For Testers
1. Start with [Quick Start Guide](quick-start-guide.md)
2. Follow [Testing Text Input Page](testing-text-input-page.md)
3. Use [Visual Testing Checklist](visual-testing-checklist.md)
4. Reference [Troubleshooting](troubleshooting.md) if needed

### For Developers
1. Read [Quick Start Guide](quick-start-guide.md) for setup
2. Check [Troubleshooting](troubleshooting.md) for common issues
3. Review specs in `../.kiro/specs/page-a-text-input/`
4. See [Suno API docs](suno-api/) for backend integration

### For Product Managers
1. Review requirements in `../user-need/`
2. Check implementation status in [Quick Start Guide](quick-start-guide.md)
3. See test coverage in [Testing Text Input Page](testing-text-input-page.md)

---

## 📋 What's Implemented

### ✅ Text Input Page (Page A)
**Status:** Fully implemented and tested

**Features:**
- Text input area (max 10,000 words)
- Real-time word counter with visual warnings
- Google Search grounding toggle
- Rate limit indicator (3 songs/day)
- Generate lyrics button with validation
- Loading states and error handling
- Responsive design (mobile, tablet, desktop)
- Accessibility compliant (WCAG 2.1 AA)

**Test Coverage:**
- 8 test suites, 78 tests
- All tests passing ✅
- Integration tests included
- Component tests included

**Documentation:**
- Requirements: `../.kiro/specs/page-a-text-input/requirements.md`
- Design: `../.kiro/specs/page-a-text-input/design.md`
- Tasks: `../.kiro/specs/page-a-text-input/tasks.md`

### 🚧 Lyrics Editing Page (Page B)
**Status:** Not yet implemented

**Planned Features:**
- Edit AI-generated lyrics
- Preview with song structure
- Save changes
- Proceed to song generation

### 🚧 Song Generation Page (Page C)
**Status:** Not yet implemented

**Planned Features:**
- Select music style (8 presets)
- Generate song with Suno API
- Real-time progress updates
- Download/share options

---

## 🚀 Quick Start

### Run the Application

```bash
# Terminal 1: Frontend
cd frontend
pnpm install
pnpm dev
# Opens at http://localhost:5173

# Terminal 2: Backend (optional)
cd backend
poetry install
poetry run uvicorn app.main:app --reload
# Opens at http://localhost:8000
```

### Run Tests

```bash
# Frontend tests
cd frontend
pnpm test

# Backend tests
cd backend
poetry run pytest
```

---

## 📊 Test Reports

Latest test reports are in `../report/`:
- Frontend tests: `../report/frontend-test/`
- Lint reports: `../report/lint-checking/`

---

## 🏗️ Project Structure

```
LearningSong/
├── docs/                          # 📚 You are here
│   ├── README.md                  # This file
│   ├── quick-start-guide.md       # Getting started
│   ├── testing-text-input-page.md # Testing guide
│   ├── visual-testing-checklist.md # QA checklist
│   ├── troubleshooting.md         # Problem solving
│   └── suno-api/                  # API documentation
│
├── frontend/                      # React application
│   ├── src/
│   │   ├── pages/
│   │   │   └── TextInputPage.tsx  # ✅ Implemented
│   │   ├── components/            # UI components
│   │   ├── hooks/                 # Custom hooks
│   │   ├── stores/                # State management
│   │   └── api/                   # API clients
│   └── tests/                     # Jest tests
│
├── backend/                       # FastAPI application
│   ├── app/
│   │   ├── api/                   # Endpoints
│   │   ├── services/              # Business logic
│   │   └── models/                # Data models
│   └── tests/                     # pytest tests
│
├── .kiro/specs/                   # Feature specifications
│   └── page-a-text-input/         # Text Input Page spec
│       ├── requirements.md        # User stories
│       ├── design.md              # Technical design
│       └── tasks.md               # Implementation tasks
│
└── user-need/                     # Product requirements
```

---

## 🎓 Learning Path

### Day 1: Setup and Basic Testing
1. Follow [Quick Start Guide](quick-start-guide.md)
2. Run the application
3. Try basic interactions
4. Run automated tests

### Day 2: Comprehensive Testing
1. Follow [Testing Text Input Page](testing-text-input-page.md)
2. Test all scenarios
3. Check responsive design
4. Test accessibility

### Day 3: Visual QA
1. Use [Visual Testing Checklist](visual-testing-checklist.md)
2. Test in multiple browsers
3. Document any issues
4. Verify all checkboxes

### Day 4: Integration
1. Start backend server
2. Test full flow
3. Verify API integration
4. Check error handling

---

## 🐛 Found a Bug?

1. Check [Troubleshooting Guide](troubleshooting.md) first
2. Search existing issues
3. Create a bug report with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots
   - Environment details
   - Console errors

---

## 💡 Tips

### For Efficient Testing
- Use the [Visual Testing Checklist](visual-testing-checklist.md) systematically
- Test one component at a time
- Document issues immediately
- Take screenshots of bugs

### For Development
- Read the spec before coding
- Run tests frequently
- Check console for warnings
- Use TypeScript strictly

### For Debugging
- Check browser console first
- Use React DevTools
- Check Network tab for API issues
- Review [Troubleshooting Guide](troubleshooting.md)

---

## 📞 Need Help?

1. **Check Documentation**: Start with relevant guide above
2. **Check Troubleshooting**: See [Troubleshooting Guide](troubleshooting.md)
3. **Check Console**: Look for error messages
4. **Check Tests**: Run `pnpm test` to see what's failing
5. **Ask for Help**: Provide detailed information

---

## 🔄 Updates

This documentation is updated as the project evolves. Check back regularly for:
- New features
- Updated testing procedures
- Additional troubleshooting tips
- New guides

---

## 📝 Contributing to Docs

To improve these docs:
1. Keep guides practical and actionable
2. Include code examples
3. Add screenshots where helpful
4. Test all commands before documenting
5. Keep language clear and concise

---

**Happy Testing! 🎵**

For questions or suggestions about these docs, please reach out to the development team.
