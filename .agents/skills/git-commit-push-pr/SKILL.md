---
name: git-commit-push-pr
description: Automates staging changes, creating conventional commits, pushing to the current branch on both origin and upstream remotes, and creating or generating GitHub pull requests. Use when the user requests to commit and push code, sync upstream, create a pull request, or open a PR.
---

# Git Commit, Push & PR Workflow

This skill automates the complete release and review cycle: validating changes, crafting descriptive conventional commits, pushing to both local fork (`origin`) and upstream target (`upstream`), and generating or opening a Pull Request.

---

## When to use this skill
- User says "commit this code and push it"
- User requests to "push to my branch and upstream"
- User asks to "create a pull request" or "open a PR"
- Preparing work for review and merge

---

## Workflow Checklist

```markdown
- [ ] 1. Pre-Commit Validation & Secret Scan
- [ ] 2. Run Test Suite (Ensure 0 failures)
- [ ] 3. Stage & Create Conventional Commit
- [ ] 4. Push to origin <current-branch>
- [ ] 5. Push to upstream <current-branch>
- [ ] 6. Create GitHub Pull Request (gh CLI or prefilled compare link)
- [ ] 7. Provide Direct Review & Merge Link to User
```

---

## Procedural Instructions

### Step 1: Pre-Commit Validation & Secret Scan
1. Inspect the working tree:
   ```bash
   git status --short
   git branch --show-current
   git remote -v
   ```
2. **Safety Check:** Ensure no secrets or temporary files are staged:
   - Check `.gitignore` for `.env`, `.env*`, and credentials.
   - Never commit sensitive keys, passwords, or temporary test dumps.

### Step 2: Validate Automated Tests
Before committing, verify that the project builds and all tests pass:
```bash
# For Maven/Java projects:
mvn test
# For Node/JS projects:
npm test
```
> [!IMPORTANT]
> Never commit broken code or failing test suites unless explicitly instructed by the user.

### Step 3: Stage and Commit
1. Stage all intended changes:
   ```bash
   git add -A
   ```
2. Write a clear **Conventional Commit** message:
   - Structure: `<type>(<scope>): <concise summary>`
   - Common types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
   - Include a descriptive body detailing key architectural changes.
   ```bash
   git commit -m "feat(storage): integrate Supabase storage for image uploads and refactor controller tests" -m "- Add StorageService and SupabaseStorageService for direct cloud uploads
   - Update EventController to delegate to StorageService
   - Configure event-images and profile-images bucket setup
   - Migrate controller tests to Mockito and verify all 47 tests pass"
   ```

### Step 4: Push to Origin and Upstream
1. Determine the active branch:
   ```bash
   BRANCH=$(git branch --show-current)
   ```
2. Push to the personal fork/origin:
   ```bash
   git push origin "$BRANCH"
   ```
3. Push to the upstream repository (if an `upstream` remote is configured):
   ```bash
   git push upstream "$BRANCH"
   ```

### Step 5: Create Pull Request
1. Check if the GitHub CLI (`gh`) is available and authenticated:
   ```bash
   gh pr create --base main --head "$BRANCH" --title "..." --body "..."
   ```
2. **Fallback if `gh` is unavailable:**
   Construct a direct GitHub Compare & Pull Request URL for the user:
   ```text
   https://github.com/<upstream-owner>/<upstream-repo>/compare/main...<origin-owner>:<branch>?expand=1
   ```
   Or for same-repository branches:
   ```text
   https://github.com/<owner>/<repo>/compare/main...<branch>?expand=1
   ```

### Step 6: Final Handoff
Provide the user with:
- Summary of committed changes.
- Direct clickable links to the commits on GitHub.
- The clickable Pull Request link ready for review and merge.
