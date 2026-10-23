# StudySprint

**Plan your study. Build your momentum.**

StudySprint is a responsive study planner for students who want to organize tasks, track deadlines, and see their progress by subject. Its interface is designed to stay simple: add a task, set its subject and deadline, choose a priority, and then keep track as the work gets done.

## What it does

- Create, edit, complete, and delete study tasks
- Search tasks and filter by subject
- Switch between Overview, Due today, In progress, and Completed
- Track total, remaining, completed, and due-today task counts
- See overall completion and progress by subject
- Highlight high-priority and overdue tasks
- Work on desktop, tablet, and mobile layouts
- Save tasks locally in demo mode, or to Appwrite TablesDB after configuration

## Built with

- HTML5 and CSS3
- JavaScript ES modules
- Appwrite Web SDK 29.1.0
- Appwrite Account (anonymous user sessions)
- Appwrite TablesDB (persistent task rows)

## Run the project

### Quick preview

1. Download or clone this repository.
2. Open a terminal in the project folder.
3. Run `python -m http.server 8000`.
4. Open http://localhost:8000 in your browser.

When the Appwrite IDs have not been configured, the page deliberately runs in **Demo mode · local storage**. This lets you try the UI and CRUD flow in one browser, but demo data is not sent to the cloud. Configure Appwrite to test the database integration.

## Connect Appwrite TablesDB

1. Create a project at https://cloud.appwrite.io.
2. In Appwrite Project Settings, add a **Web platform** for `localhost`. Before using a deployed copy, add the deployed site's hostname as another Web platform as well.
3. If your project requires it, enable anonymous sessions in the Appwrite Auth settings.
4. Create a **TablesDB database**.
5. Create a table with the ID `tasks`.
6. Create these columns in the table:

| Column ID | Type | Settings |
|---|---|---|
| `title` | Varchar | Required; maximum length 120 |
| `subject` | Varchar | Required; maximum length 50 |
| `dueDate` | Varchar | Required; store dates as YYYY-MM-DD |
| `priority` | Enum | Required; values `low`, `medium`, `high` |
| `completed` | Boolean | Required; default `false` |
| `ownerId` | Varchar | Required; maximum length at least 36 |

Column IDs are case-sensitive. The type and allowed values must match the table above.

7. In the repository's `app.js`, replace `PASTE_YOUR_APPWRITE_PROJECT_ID` and `PASTE_YOUR_DATABASE_ID` with your actual IDs. The cloud endpoint is set to `https://cloud.appwrite.io/v1`; use your region's endpoint if your project uses a regional URL.
8. Open the `tasks` table settings. **Enable Row Security.**
9. Under table permissions, grant **Create** to authenticated users (Appwrite's `Role.users()`, which includes anonymous-session users). Do **not** grant table-wide Read, Update, or Delete permissions.
10. Reload the app and confirm the status reads **Connected to Appwrite**. Create a task, refresh the page, and make sure it still exists.

### Why the permission setup matters

The app creates each row with read, update, and delete permissions for the current Appwrite user. Row Security makes these per-row permissions effective. Table-level Create allows a signed-in user to create a row; avoiding table-wide Read/Update/Delete prevents one user from automatically accessing every student's tasks.

**Never put an Appwrite API key in frontend code.** This app uses the client SDK and an account session; it does not require a server API key.

## Demo checklist

- [ ] Page loads and displays the expected connection mode
- [ ] Create a task with a subject, deadline, and priority
- [ ] Refresh and confirm task persistence (must be Appwrite mode for the cloud demonstration)
- [ ] Mark a task completed and then mark it incomplete
- [ ] Edit its title or date
- [ ] Search by task title and filter by subject
- [ ] Switch between all four sidebar views
- [ ] Delete a sample task
- [ ] Check layout on a narrow mobile screen
- [ ] If configured for Appwrite, test with two separate anonymous sessions to ensure one session cannot read another's rows

## Publish the static site

A GitHub Pages workflow is included in `.github/workflows/pages.yml`. To authorize the first deployment:

1. Open this repository's **Settings → Pages**.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. Open the **Actions** tab and re-run the latest **Deploy StudySprint to GitHub Pages** workflow.
4. When it succeeds, GitHub will show the public page URL in the deployment environment. The expected project URL is `https://abhisheksinghania834.github.io/StudySprint/`.

The first deployment cannot enable Pages automatically if the GitHub Actions token lacks that repository-level permission. The one-time Settings step above is required in that case.

Before sharing the page as a database-backed demo, also configure the Appwrite project/database IDs in `app.js`, add `abhisheksinghania834.github.io` as a Web platform in Appwrite, and verify that the app shows **Connected to Appwrite**. Without those settings it intentionally remains in local demo mode.

## Architecture

```text
Browser UI (index.html + styles.css)
        |
        v
app.js — form validation, filters, progress calculations
        |
        +---- Demo mode: browser localStorage (local preview only)
        |
        +---- Appwrite Account: anonymous user session
                  |
                  v
             Appwrite TablesDB
                  |
                  v
             tasks table + row-level permissions
```

The app filters the current user's rows by `ownerId`. Progress totals and subject bars are calculated from the loaded rows in the browser. Local demo storage and cloud database storage are kept separate so the UI does not misrepresent where a task was saved.

## Two-minute demo plan

1. Introduce the student deadline-management problem.
2. Show the dashboard and progress panel.
3. Add a task with a subject, date, and priority.
4. Refresh to demonstrate persistence in Appwrite mode.
5. Complete a task, edit another, use search/filters, then delete a sample task.
6. Explain Appwrite Account, TablesDB, and per-row access controls.

## Next ideas

Calendar reminders, weekly study streaks, recurring tasks, and an optional timetable view.

## Note on development

Adapt the interface and roadmap to your own needs, test the application before publishing, and follow the event's rules for disclosure of development tools and AI assistance.