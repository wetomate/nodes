---
name: wetomate-git-finalize
description: Finalize Wetomate repository changes by reviewing the complete Git working tree and proposing n8n-convention commit messages. Use after completing repository changes and for Git status, diff review, commit preparation, commit-message proposals, staging, committing, branch cleanup, or history inspection.
---

# Wetomate Git Finalize

Review the complete uncommitted change set before summarizing or proposing a commit:

- Read `git status --short`, the unstaged diff, and the staged diff.
- Inspect the contents of untracked files; ordinary `git diff` does not include them.
- Preserve unrelated user changes and distinguish them from task changes.
- Check `git diff --check` and report validation performed before proposing the message.
- If the worktree contains independent concerns, recommend splitting them and propose one message per coherent commit.

Follow n8n's Angular-style convention:

```text
<type>(<optional scope>): <Summary>

<optional body>

<optional footer>
```

Use one of `build`, `ci`, `chore`, `docs`, `feat`, `fix`, `perf`, `refactor`, or `test`. Use a scope only when it adds information; use `<Provider> Node` for a specific node and `API` for the toolkit's public API. Write the summary in imperative present tense, capitalize its first letter, and omit the trailing period. Keep it succinct.

Use the body to explain motivation and contrast previous behavior when that context matters. Mark breaking changes with `!` in the header and a `BREAKING CHANGE:` footer containing impact and migration instructions. Put issue references in the footer.

Base the proposal on the actual full diff, not only the conversation or the latest edited file. Proposing a message does not authorize staging, committing, rebasing, tagging, or pushing; perform those mutations only when the user asks.
