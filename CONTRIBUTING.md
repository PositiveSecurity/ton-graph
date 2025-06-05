# Contributing to TON Graph

Thank you for considering contributing to TON Graph! To keep the history clean, we follow the [Conventional Commits](https://www.conventionalcommits.org/) standard for commit messages.

## Commit Message Format

Each commit message should be structured as:

```
<type>(<scope>): <subject>
```

- **type**: feat, fix, docs, style, refactor, test, chore
- **scope**: optional, indicates the area of the codebase
- **subject**: short description of the change

Example:

```
feat(parser): add support for Tact contracts
```

Commits that do not follow this format will be rejected by the `commit-msg` hook.

## Development Steps

1. Fork and clone the repository.
2. Install dependencies with `npm ci`.
3. Run tests with `npm test`.
4. Commit changes using the format above.
5. Push your branch and open a pull request.
