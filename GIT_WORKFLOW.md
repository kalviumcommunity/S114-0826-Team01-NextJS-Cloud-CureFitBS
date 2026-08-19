# CureFit Contribution and Pull Request Workflow

This project follows a **branch-first, review-first** workflow. Do not push directly to `main`. Create one focused branch and one focused pull request for each meaningful task.

## Current Repository Context

The local repository is currently on `main` and has an `origin` remote configured. Before creating a branch, verify the working tree and synchronize `main` with the remote.

```bash
cd /home/ubuntu/curefit-booking
git status
git switch main
git pull --ff-only origin main
```

If `git status` shows edits you want to keep, do **not** switch branches until they are safely committed or stashed. Never use `git reset --hard` to discard work.

## Managed Deployment Note

The current CureFit project uses managed server, database, and secret configuration. Its `.gitignore` excludes `.env` variants, so credentials must never be committed. The repository includes an **optional** `docker-compose.yml` for local MariaDB and Redis development; follow `LOCAL_DEVELOPMENT.md` before using it. The Compose file is not the production runtime and must not be represented as replacing managed deployment services.

## 1. Create a Focused Branch

Use a short, lowercase branch name with a conventional prefix. Examples include `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, and `test/`.

For the current verified CureFit operations work, use a branch such as:

```bash
git switch -c feat/curefit-operations-resilience
git branch --show-current
```

> Use a different branch for a different logical task. For example, documentation-only work belongs on `docs/curefit-workflow-guide`, while a test-only change belongs on `test/booking-concurrency-regression`.

## 2. Verify Before You Commit

Run the project checks before staging files. The CureFit booking invariant must remain intact: one accepted reservation and ninety-nine conflicts when one hundred concurrent booking requests target a one-seat class.

```bash
pnpm check
pnpm test
pnpm build
pnpm test:concurrency
```

Expected concurrency output:

```text
successCount: 1
conflictCount: 99
```

## 3. Make a Meaningful Conventional Commit

Inspect the exact files you intend to commit, stage only those files, and write one commit message for one logical change.

```bash
git status
git add server/ client/ drizzle/ scripts/ todo.md GIT_WORKFLOW.md
git diff --cached --stat
git commit -m "feat: strengthen CureFit operations resilience"
```

Use the conventional prefix that reflects the change:

| Change type    | Example commit message                          |
| -------------- | ----------------------------------------------- |
| New capability | `feat: add customer booking cancellation`       |
| Bug correction | `fix: preserve seat count during cancellation`  |
| Test coverage  | `test: cover booking concurrency conflict path` |
| Documentation  | `docs: add CureFit contribution workflow`       |
| Maintenance    | `chore: update local development configuration` |
| Refactor       | `refactor: isolate inventory recovery service`  |

Avoid non-descriptive messages such as `update`, `fixed stuff`, or `wip`. Do not combine unrelated UI, database, and documentation changes into one commit merely to reduce the commit count.

## 4. Push the Branch

Push the feature branch to the configured remote and set upstream tracking on the first push.

```bash
git push -u origin feat/curefit-operations-resilience
```

For later commits on the same branch, use:

```bash
git push
```

## 5. Open a Pull Request

Open your repository on GitHub and select **Compare & pull request**. Target `main` from your feature branch. The pull request should include the following sections.

```markdown
## What

Summarize the focused change. For example: added atomic booking cancellation,
inventory restoration, audit visibility, and real-time client recovery safeguards.

## Why

Explain the operational or product requirement that the change fulfills.

## Linked Issue

Closes #<issue-number>

## How to Test

1. Run `pnpm check`.
2. Run `pnpm test`.
3. Run `pnpm build`.
4. Run `pnpm test:concurrency` and confirm exactly 1 success and 99 conflicts.
5. Verify the relevant customer or Owner workflow in the browser.
```

Request a review from at least one teammate. Only the authorized team lead should merge an approved pull request.

## 6. Keep the Branch Current and Resolve Conflicts Safely

Before requesting final review—or when `main` moves—bring the newest `main` into your branch.

```bash
git fetch origin
git pull origin main
```

If Git reports a conflict, inspect each marked file, choose the correct final behavior, and remove all conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`). Then validate and complete the merge.

```bash
git add <resolved-files>
pnpm check && pnpm test
git commit -m "fix: resolve merge conflict in CureFit operations"
git push
```

Never accept all incoming or all current changes blindly. If a conflict affects booking transactions, seat inventory, authentication, or real-time updates, re-run the concurrency test before pushing the resolution.

## Suggested Daily Rhythm

Start each working day by synchronizing `main`, create a branch for the day’s focused task, make small meaningful commits, push the branch, and open a pull request with test evidence. This maintains attributable work, enables timely review, and avoids unsafe direct pushes to `main`.
