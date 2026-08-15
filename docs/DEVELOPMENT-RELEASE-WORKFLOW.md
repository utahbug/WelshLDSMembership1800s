# Development and release workflow

The project has one active online production edition and one generated local development edition.

## Production

The stable production URL is:

`https://utahbug.github.io/WelshLDSMembership1800s/full/`

The `full/` directory is frozen during ordinary development. The legacy Full Online builder refuses to overwrite it unless an explicit approval flag is supplied.

## Local development

Build and test the local-only edition:

```powershell
node scripts/build-local-development.mjs
node scripts/test-local-development.mjs
node scripts/serve-local-development.mjs
```

Open `http://127.0.0.1:18768/`. The generated output is `outputs/local-development/`, is ignored by Git, and displays `Development build — not published.` on every page.

Building and testing this edition never changes `full/` and never publishes anything.

## Approved production promotion

Only after the local build has passed validation and the user has explicitly approved publication:

```powershell
node scripts/publish-approved-local-development.mjs --approved
node scripts/test-research-beta.mjs full
git diff -- full
```

Review the complete `full/` diff before staging it. Commit and push the approved `full/` changes intentionally; the promotion script itself does not commit or deploy.

The required sequence is:

`source changes → local development build → local testing → user approval → intentional promotion to full/ → review → commit/push`

## Retired Research Beta

The public `research-beta/*.html` entry pages are minimal moved-page redirects to their corresponding `full/` pages. Reusable Research Beta builders, validators, assets, and data-generation infrastructure remain in the repository.
