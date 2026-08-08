---
name: supply-chain-safe
description: Hardens JS/TS projects using pnpm against npm supply-chain attacks (ChainDrop, keyv, preinstall/postinstall malware). Use when scaffolding a new project, setting up pnpm, adding or choosing dependencies, auditing a lockfile, reviewing package scripts, or responding to a compromised-package incident. Trigger keywords: pnpm, supply chain, cadena de suministro, dependencias seguras, audit, lockfile, ChainDrop, keyv, postinstall, allowBuilds, seguridad npm.
---

# Supply-Chain-Safe: pnpm hardening & audit

Protect JS/TS projects from dependency-supply-chain attacks. The primary threat
is install-time lifecycle scripts (`preinstall`/`install`/`postinstall`) that
run attacker-controlled code as soon as a dependency is resolved, without the
developer importing anything. Secondary vectors: git-hosted dependencies running
`prepare` scripts, and malicious versions published under stolen maintainer
credentials.

Use this skill to (a) harden config, (b) choose dependencies with minimal attack
surface, (c) audit existing projects, and (d) respond when a compromise is
suspected. Run the verification checklist at the end before declaring a project
safe.

## 1. Threat context & known indicators (as of the ChainDrop incident)

On 2026-08-04, a self-propagating worm (ChainDrop) poisoned 400+ npm packages in
under four hours. It started in the `jaredwray` ecosystem and spread via stolen
publishing tokens to unrelated scopes (`@servicetitan/*`, `@ornikar/*`,
`@qlik/*`, `@picsart/*`, etc.). The seed packages include:

- `keyv@6.0.0`
- `flat-cache@6.1.24`
- `file-entry-cache@11.1.6`
- `cacheable-request@13.0.20`, `@cacheable/*` 2.x, `cache-manager@7.2.10`
- `ecto@5.0.1` (republished, same payload)

The tarballs carried **valid npm provenance/signatures** because the malicious
code was committed to the source repos and published through the projects' own
trusted GitHub Actions workflows — provenance alone does NOT mean clean.

### Attack mechanics to recognize

- Lifecycle hook: `"preinstall": "node setup.mjs"` (also `postinstall`, `install`).
- Stage-1 dropper `setup.mjs` (~29,918 bytes) downloads a legitimate Bun runtime
  from GitHub and runs an obfuscated stage-2 payload:
  - First wave: `Math_Symbol.js` (727,680 bytes)
  - Later wave: `math_init.js` (byte-identical)
  - Stage-2 hashes: `9fc2570b7cef51c1b8df116d144d11ff4096357be7d2c4c6367cfc2509cf1bcc`
  - Wave-1 dropper hash: `54dc7ea54a1317cca0e890a2770630cf7fa6c97813e0cb9d2caa93012b350668`
  - Later-wave dropper hash: `fd3ca4007b225fdf8de7af4345a19179d5efa8c4bb9205f88cda806e5684b1eb`
- Exfil endpoint: `npm-cache.com` (`POST https://npm-cache.com:443/router`); treat
  any connection to that domain as an indicator of compromise.
- Payload harvests: full process env, npm tokens, GitHub PATs/`ghs_` tokens, AWS
  STS/SSM/Secrets, GCP/Azure keys, Vault tokens, K8s service-account tokens,
  database credentials, Stripe/Slack/Twilio, and re-publishes malicious versions
  with stolen npm tokens (self-propagation). A dead-man's switch polls the GitHub
  API every 60s.
- The packages (`flat-cache`, `file-entry-cache`) sit in the ESLint dependency
  chain, so a plain `npm install` of many projects detonated it during the window.

**Rule of thumb:** if a version of a known package was published within ~24h and
the lockfile was not previously pinned to it, treat it as suspicious.

## 2. Hardening configuration

Apply to new projects; for existing projects, migrate in place.

### Prerequisites

- Node.js 22+ and **pnpm 11+** (supply-chain protection ON by default). Pin the
  manager with Corepack:

```jsonc
// package.json
"packageManager": "pnpm@11.0.0"
```

### pnpm-workspace.yaml (pnpm 11)

```yaml
# Disable every dependency lifecycle script unless explicitly approved.
# Only list packages whose install scripts you have reviewed.
allowBuilds:
  esbuild: true          # the ONLY package that normally needs approval
  # add others only after review, e.g. native modules you trust
  # "@swc/core": false   # deny = never run

# Reject packages published within the last N minutes (default 1440 = 1 day).
minimumReleaseAge: 1440

# Reject git/file/tarball dependencies (closes GHSA-379q-355j-w6rj bypass).
blockExoticSubdeps: true

# Fail install with non-zero exit if any dependency has an unreviewed build script.
strictDepBuilds: true
```

On pnpm 10 use the legacy equivalents: `onlyBuiltDependencies: [esbuild]`,
`neverBuiltDependencies: [...]`, and `ignoreDepScripts`. Do not mix formats.

### .npmrc

```ini
save-exact=true
# NEVER set dangerously-allow-all-builds / enablePreAndPostScripts
```

### CI (GitHub Actions or equivalent)

- `pnpm install --frozen-lockfile` — never re-resolve from scratch.
- `pnpm install --ignore-scripts` for untrusted/first-time installs.
- `pnpm audit --audit-level high` as a blocking step.
- Do not run `pnpm approve-builds` or `pnpm add --allow-build` non-interactively.

## 3. Dependency selection checklist

Minimize attack surface — each transitive dependency is a new path to RCE.

1. **Prefer fewer, well-known, single-purpose packages.** Verify the dependency
   tree before adopting: `npm view <pkg>@latest dependencies --json`.
2. **Avoid the compromised chains entirely.** Do not depend on
   `keyv`, `cacheable*`, `cache-manager`, `flat-cache`, `file-entry-cache`,
   `ecto`, or packages known to pull them. Run `pnpm why keyv` and
   `pnpm why flat-cache` to confirm nothing transitive is pulling them.
3. **Prefer linters/tools shipped as binaries with zero runtime deps**:
   `@biomejs/biome` (a single Rust binary, no lifecycle scripts). **Never** use
   the unscoped `biome` package — it is an unrelated, abandoned package
   (v0.3.x) that drags in legacy deps. Avoid ESLint by default: its chain pulls
   `flat-cache`/`file-entry-cache`.
4. **Watch lifecycle scripts.** Check a package's `scripts` in its manifest
   (`npm view <pkg> scripts`). Approved list: `esbuild` (`postinstall` downloads
   the platform binary). Reject packages that add `preinstall`/`postinstall` you
   cannot explain. Native binaries delivered as `optionalDependencies`
   (rolldown, lightningcss, @typescript/*, @biomejs/cli-*) need no approval.
5. **Prefer platform binaries via `optionalDependencies`** over install scripts
   that fetch at install time.
6. **Pin exact versions** for critical/low-trust packages (`save-exact`), and
   commit the lockfile so every install is verified against recorded hashes.
7. **Belt-and-suspenders `overrides`** for high-risk transitive names even when
   absent from the tree, e.g. pin `keyv` below the malicious 6.0.0.

## 4. Auditing an existing project

Run in the project root:

```bash
# 1. Confirm manager/version and no full re-resolve
node --version; pnpm --version

# 2. Audit published vulnerabilities
pnpm audit --audit-level high

# 3. Where does keyv / the compromised chain come from? (want: no output)
pnpm why keyv
pnpm why flat-cache
pnpm why file-entry-cache
pnpm why cacheable

# 4. Which dependency lifecycle scripts are present in the lockfile?
#    Look for any preinstall/install/postinstall in node_modules manifests.
grep -rn "preinstall\|postinstall\|\"install\"" node_modules/.pnpm/*/node_modules/*/package.json

# 5. Search the lockfile for known-malicious versions
grep -n "keyv@6\.0\.0\|flat-cache@6\.1\.24\|file-entry-cache@11\.1\.6\|cacheable-request@13\.0\.20\|cache-manager@7\.2\.10\|ecto@5\.0\.1"

# 6. List packages that would run scripts if allowed (pnpm will warn about these)
pnpm install --lockfile-only   # safe: no scripts run, just resolves
```

If the lockfile contains any known-malicious version, do NOT remove it and
reinstall — assume the machine that installed it is compromised (see §5).

Confirm `allowBuilds`/`onlyBuiltDependencies` is an allowlist (empty or
explicit), never `dangerouslyAllAllowBuilds: true`.

## 5. Incident response

If an install happened during an exposure window (check install timestamps,
`.npmrc`/lockfile history, or the package list above):

1. **Assume full compromise** of every dev machine, workstation, and CI runner
   that ran `pnpm install`/`npm install` in the window — removal of the package
   is NOT sufficient.
2. **Rotate all credentials** from a clean machine: npm tokens, GitHub PATs
   (`ghp_`, `gho_`, `ghs_`), AWS keys (STS, SSM, Secrets Manager), GCP/Azure,
   Vault tokens, K8s service accounts, DB, Stripe/Slack/Twilio. Rotate even if
   no evidence of exfiltration yet.
3. **Remove implants**: search for `setup.mjs`, `Math_Symbol.js`, `math_init.js`,
   `bun-dl-*` temp dirs, and any `.claude/`, `.vscode/`, `.github/workflows/`
   hooks added by a compromise. Disable the GitHub API dead-man's switch by
   revoking the relevant tokens first.
4. **Audit accounts**: check npm and GitHub for unexpected packages, versions,
   commits, and repos published under your credentials.
5. **Block C2**: alert/block `npm-cache.com` on your network.
6. **Restore clean**: re-clone repos, regenerate lockfiles from a known-good
   commit, `pnpm install --frozen-lockfile --ignore-scripts`, then re-enable
   scripts for approved packages only.

## 6. Verification checklist

- [ ] `package.json` has `packageManager` pinned; Node >= 22, pnpm >= 11.
- [ ] `pnpm-lock.yaml` is committed; CI uses `--frozen-lockfile`.
- [ ] `allowBuilds` is an explicit allowlist; no `dangerouslyAllAllowBuilds`.
- [ ] `minimumReleaseAge` and `blockExoticSubdeps` enabled.
- [ ] No `keyv`/`cacheable`/`flat-cache`/`file-entry-cache`/`ecto` in the tree.
- [ ] `pnpm audit --audit-level high` passes.
- [ ] No unexpected lifecycle scripts; any present ones are reviewed + approved.
- [ ] `pnpm install --ignore-scripts` succeeds (for CI/untrusted paths).
