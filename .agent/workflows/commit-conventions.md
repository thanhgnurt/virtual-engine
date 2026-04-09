---
description: Commit message conventions for the project
---

Please follow these conventions when committing changes to the repository. Each commit message should start with a prefix followed by a description.

## Commit Types

| Prefix     | Description                                                   | Version Impact      | Example                                       |
| :--------- | :------------------------------------------------------------ | :------------------ | :-------------------------------------------- |
| `feat`     | A new feature                                                 | MINOR (e.g., 1.1.0) | `feat: Add dark mode support`                 |
| `fix`      | A bug fix                                                     | PATCH (e.g., 1.0.1) | `fix: Resolve layout issue on mobile`         |
| `refactor` | Code change that neither fixes a bug nor adds a feature       | None                | `refactor: Move store logic to separate hook` |
| `perf`     | A code change that improves performance                       | None                | `perf: Optimize list rendering logic`         |
| `docs`     | Documentation only changes                                    | None                | `docs: Update API documentation`              |
| `style`    | Changes that do not affect the meaning of the code            | None                | `style: Fix indentation and semicolons`       |
| `chore`    | Changes to the build process or auxiliary tools and libraries | None                | `chore: Update package.json dependencies`     |

## Guidelines

- Use the imperative, present tense: "change" not "changed" nor "changes"
- Use English for commit messages and documentation.
- The first line should be concise (keep it under 72 characters).
