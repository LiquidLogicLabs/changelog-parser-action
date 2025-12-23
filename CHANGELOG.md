# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2025-12-23

### Added
- `repo_url` input to specify repository URL and automatically fetch CHANGELOG.md from repository root
- `ref` input to specify branch/ref when using `repo_url` or repository root URL in `path` (defaults to `main`)
- Automatic detection of repository root URLs in `path` input
- Graceful handling of missing CHANGELOG.md files (returns `status: "nofound"` instead of failing)

### Changed
- Enhanced error handling to return `nofound` status when CHANGELOG.md is not found at the specified location

## [1.0.0] - 2025-12-23

### Added
- Initial implementation of changelog parser action
- Support for reading changelogs from local file paths
- Support for reading changelogs from remote URLs (GitHub, GitLab, Bitbucket, Gitea, and any HTTP server)
- Automatic blob-to-raw URL conversion for GitHub, GitLab, Bitbucket, and Gitea (both cloud and self-hosted)
- Optional authentication token support for remote URLs
- Keep a Changelog format parsing
- Version extraction and validation
- Configuration file support
- CI/CD workflows for testing and releases

