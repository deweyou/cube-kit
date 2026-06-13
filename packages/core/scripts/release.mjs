import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageRoot, '../..');
const packagesRoot = resolve(repoRoot, 'packages');
const packageJsonPath = resolve(packageRoot, 'package.json');
const changelogPath = resolve(packageRoot, 'CHANGELOG.md');
const repositoryUrl = 'https://github.com/deweyou/cube-kit';
const increments = new Set(['major', 'minor', 'patch']);

const args = process.argv.slice(2);
const increment = args.find((arg) => !arg.startsWith('-')) ?? 'patch';
const dryRun = args.includes('--dry-run');

if (!increments.has(increment)) {
  throw new Error(
    `Expected version increment to be major, minor, or patch. Received '${increment}'.`,
  );
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const runGit = (args, options = {}) => {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const command = `git ${args.join(' ')}`;
    throw new Error(result.stderr.trim() || `${command} failed with exit code ${result.status}`);
  }
  return result.stdout.trim();
};

const bumpVersion = (version, increment) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`cubegin version must be plain semver. Received '${version}'.`);

  let [, major, minor, patch] = match.map(Number);
  if (increment === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (increment === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
};

const discoverWorkspacePackageJsonPaths = () => {
  return readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(packagesRoot, entry.name, 'package.json'))
    .filter((path) => existsSync(path))
    .sort();
};

const toRepoPath = (path) => relative(repoRoot, path);

const discoverReleasePaths = (workspacePackageJsonPaths) => {
  return workspacePackageJsonPaths.map((path) => dirname(toRepoPath(path))).sort();
};

const findPreviousTag = () => {
  const tags = runGit(['tag', '--list', 'cubegin@*', '--sort=-v:refname']);
  return tags.split('\n').find(Boolean);
};

const readCommitEntries = (previousTag, releasePaths) => {
  const range = previousTag ? `${previousTag}..HEAD` : 'HEAD';
  const output = runGit(['log', '--format=%h%x09%s', range, '--', ...releasePaths]);
  if (!output) return [];

  return output
    .split('\n')
    .map((line) => {
      const [shortSha, ...subjectParts] = line.split('\t');
      return { shortSha, subject: subjectParts.join('\t').trim() };
    })
    .filter((entry) => entry.shortSha && entry.subject)
    .filter((entry) => !entry.subject.startsWith('chore(release): cubegin v'));
};

const today = () => new Date().toISOString().slice(0, 10);

const linkPullRequests = (subject) =>
  subject.replaceAll(/(?<![\w/])#(\d+)\b/g, (_, pullRequestNumber) => {
    return `[#${pullRequestNumber}](${repositoryUrl}/pull/${pullRequestNumber})`;
  });

const renderSection = (version, previousTag, releasePaths, entries) => {
  const lines = [`## ${version} - ${today()}`, ''];
  if (entries.length === 0) {
    lines.push('- Maintenance release.');
  } else {
    for (const entry of entries) {
      lines.push(`- ${linkPullRequests(entry.subject)} (${entry.shortSha})`);
    }
  }

  lines.push('', '<details>', '<summary>Release scope</summary>', '');
  lines.push(`- Previous tag: ${previousTag ?? 'none'}`);
  for (const path of releasePaths) {
    lines.push(`- ${path}`);
  }
  lines.push('', '</details>', '');
  return `${lines.join('\n')}\n`;
};

const updateChangelog = (section) => {
  const existing = existsSync(changelogPath)
    ? readFileSync(changelogPath, 'utf8')
    : '# Changelog\n';
  const normalized = existing.trimEnd();
  if (!normalized.startsWith('# Changelog')) {
    return `# Changelog\n\n${section}${normalized}\n`;
  }

  const rest = normalized.replace(/^# Changelog\s*/, '');
  return `# Changelog\n\n${section}${rest.trimStart()}`.trimEnd() + '\n';
};

const packageJson = readJson(packageJsonPath);
const nextVersion = bumpVersion(packageJson.version, increment);
const workspacePackageJsonPaths = discoverWorkspacePackageJsonPaths();
const releasePaths = discoverReleasePaths(workspacePackageJsonPaths);
const previousTag = findPreviousTag();
const commitEntries = readCommitEntries(previousTag, releasePaths);
const changelogSection = renderSection(nextVersion, previousTag, releasePaths, commitEntries);

if (dryRun) {
  console.log(`cubegin ${packageJson.version} -> ${nextVersion}`);
  console.log(
    `Version packages: ${workspacePackageJsonPaths.map((path) => toRepoPath(path)).join(', ')}`,
  );
  console.log(`Release paths: ${releasePaths.join(', ')}`);
  console.log('');
  console.log(changelogSection.trimEnd());
} else {
  for (const workspacePackageJsonPath of workspacePackageJsonPaths) {
    const workspacePackageJson = readJson(workspacePackageJsonPath);
    workspacePackageJson.version = nextVersion;
    writeFileSync(workspacePackageJsonPath, `${JSON.stringify(workspacePackageJson, null, 2)}\n`);
  }
  writeFileSync(changelogPath, updateChangelog(changelogSection));
  console.log(`Prepared cubegin ${nextVersion}`);
  for (const workspacePackageJsonPath of workspacePackageJsonPaths) {
    console.log(`Updated ${toRepoPath(workspacePackageJsonPath)}`);
  }
  console.log(`Updated ${relative(repoRoot, changelogPath)}`);
}
