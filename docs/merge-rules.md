# Merge rules

- All feature work opens a PR into `main`. No pushing direct to main.
- No manually promoting previews to production on Vercel. Production
  always reflects whatever `main` is. Promoting a preview skips main
  and the next main auto-deploy will overwrite it.
- Squash-merge is the default.
- Branches auto-delete after merge (repo setting).
