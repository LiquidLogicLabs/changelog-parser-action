import * as core from '@actions/core';
import { readContent, isRepoRootUrl, constructChangelogUrl } from './path-handler';
import { parseChangelog, findVersionEntry } from './parser';

// Mock dependencies
jest.mock('@actions/core');
jest.mock('./path-handler');
jest.mock('./parser');

const mockCore = core as jest.Mocked<typeof core>;
const mockReadContent = readContent as jest.MockedFunction<typeof readContent>;
const mockIsRepoRootUrl = isRepoRootUrl as jest.MockedFunction<typeof isRepoRootUrl>;
const mockConstructChangelogUrl = constructChangelogUrl as jest.MockedFunction<typeof constructChangelogUrl>;
const mockParseChangelog = parseChangelog as jest.MockedFunction<typeof parseChangelog>;
const mockFindVersionEntry = findVersionEntry as jest.MockedFunction<typeof findVersionEntry>;

describe('Changelog Parser Action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set default mock implementations
    mockCore.getInput.mockImplementation((name: string) => {
      const defaults: Record<string, string> = {
        path: '',
        repo_url: '',
        ref: 'main',
        token: '',
        version: '',
        validation_level: 'none',
        validation_depth: '10',
        config_file: '',
      };
      return defaults[name] || '';
    });
    
    mockCore.setOutput = jest.fn();
    mockCore.info = jest.fn();
    mockCore.warning = jest.fn();
    mockCore.error = jest.fn();
    mockCore.setFailed = jest.fn();
  });

  describe('repo_url handling', () => {
    it('should construct CHANGELOG.md URL when path is blank and repo_url is provided', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'repo_url') return 'https://github.com/owner/repo';
        if (name === 'ref') return 'main';
        return '';
      });
      
      mockConstructChangelogUrl.mockReturnValue('https://raw.githubusercontent.com/owner/repo/main/CHANGELOG.md');
      mockReadContent.mockResolvedValue('## [1.0.0] - 2024-01-01\n\n- Initial release');
      mockParseChangelog.mockReturnValue({
        entries: [
          {
            version: '1.0.0',
            date: '2024-01-01',
            status: 'released',
            changes: '- Initial release',
          },
        ],
      });
      mockFindVersionEntry.mockReturnValue({
        version: '1.0.0',
        date: '2024-01-01',
        status: 'released',
        changes: '- Initial release',
      });

      // Import and run the action
      await import('./index');

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockConstructChangelogUrl).toHaveBeenCalledWith('https://github.com/owner/repo', 'main');
      expect(mockReadContent).toHaveBeenCalledWith('https://raw.githubusercontent.com/owner/repo/main/CHANGELOG.md', undefined);
    });

    it('should use provided ref when constructing URL from repo_url', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'repo_url') return 'https://github.com/owner/repo';
        if (name === 'ref') return 'develop';
        return '';
      });
      
      mockConstructChangelogUrl.mockReturnValue('https://raw.githubusercontent.com/owner/repo/develop/CHANGELOG.md');
      mockReadContent.mockResolvedValue('## [1.0.0] - 2024-01-01\n\n- Initial release');
      mockParseChangelog.mockReturnValue({
        entries: [
          {
            version: '1.0.0',
            date: '2024-01-01',
            status: 'released',
            changes: '- Initial release',
          },
        ],
      });
      mockFindVersionEntry.mockReturnValue({
        version: '1.0.0',
        date: '2024-01-01',
        status: 'released',
        changes: '- Initial release',
      });

      await import('./index');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockConstructChangelogUrl).toHaveBeenCalledWith('https://github.com/owner/repo', 'develop');
    });

    it('should default to main when ref is not provided', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'repo_url') return 'https://github.com/owner/repo';
        if (name === 'ref') return '';
        return '';
      });
      
      mockConstructChangelogUrl.mockReturnValue('https://raw.githubusercontent.com/owner/repo/main/CHANGELOG.md');
      mockReadContent.mockResolvedValue('## [1.0.0] - 2024-01-01\n\n- Initial release');
      mockParseChangelog.mockReturnValue({
        entries: [
          {
            version: '1.0.0',
            date: '2024-01-01',
            status: 'released',
            changes: '- Initial release',
          },
        ],
      });
      mockFindVersionEntry.mockReturnValue({
        version: '1.0.0',
        date: '2024-01-01',
        status: 'released',
        changes: '- Initial release',
      });

      await import('./index');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockConstructChangelogUrl).toHaveBeenCalledWith('https://github.com/owner/repo', 'main');
    });
  });

  describe('repo root URL detection in path', () => {
    it('should detect repo root URL in path and construct CHANGELOG.md URL', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'path') return 'https://github.com/owner/repo';
        if (name === 'ref') return 'main';
        return '';
      });
      
      mockIsRepoRootUrl.mockReturnValue(true);
      mockConstructChangelogUrl.mockReturnValue('https://raw.githubusercontent.com/owner/repo/main/CHANGELOG.md');
      mockReadContent.mockResolvedValue('## [1.0.0] - 2024-01-01\n\n- Initial release');
      mockParseChangelog.mockReturnValue({
        entries: [
          {
            version: '1.0.0',
            date: '2024-01-01',
            status: 'released',
            changes: '- Initial release',
          },
        ],
      });
      mockFindVersionEntry.mockReturnValue({
        version: '1.0.0',
        date: '2024-01-01',
        status: 'released',
        changes: '- Initial release',
      });

      await import('./index');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockIsRepoRootUrl).toHaveBeenCalledWith('https://github.com/owner/repo');
      expect(mockConstructChangelogUrl).toHaveBeenCalledWith('https://github.com/owner/repo', 'main');
    });

    it('should not detect repo root if path is a file URL', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'path') return 'https://raw.githubusercontent.com/owner/repo/main/CHANGELOG.md';
        return '';
      });
      
      mockIsRepoRootUrl.mockReturnValue(false);
      mockReadContent.mockResolvedValue('## [1.0.0] - 2024-01-01\n\n- Initial release');
      mockParseChangelog.mockReturnValue({
        entries: [
          {
            version: '1.0.0',
            date: '2024-01-01',
            status: 'released',
            changes: '- Initial release',
          },
        ],
      });
      mockFindVersionEntry.mockReturnValue({
        version: '1.0.0',
        date: '2024-01-01',
        status: 'released',
        changes: '- Initial release',
      });

      await import('./index');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockIsRepoRootUrl).toHaveBeenCalledWith('https://raw.githubusercontent.com/owner/repo/main/CHANGELOG.md');
      expect(mockConstructChangelogUrl).not.toHaveBeenCalled();
      expect(mockReadContent).toHaveBeenCalledWith('https://raw.githubusercontent.com/owner/repo/main/CHANGELOG.md', undefined);
    });
  });

  describe('404 error handling', () => {
    it('should set status to nofound when CHANGELOG.md is not found', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'repo_url') return 'https://github.com/owner/repo';
        if (name === 'ref') return 'main';
        return '';
      });
      
      mockConstructChangelogUrl.mockReturnValue('https://raw.githubusercontent.com/owner/repo/main/CHANGELOG.md');
      mockReadContent.mockRejectedValue(new Error('Failed to fetch https://raw.githubusercontent.com/owner/repo/main/CHANGELOG.md: 404 Not Found'));

      await import('./index');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockCore.setOutput).toHaveBeenCalledWith('version', '');
      expect(mockCore.setOutput).toHaveBeenCalledWith('date', '');
      expect(mockCore.setOutput).toHaveBeenCalledWith('status', 'nofound');
      expect(mockCore.setOutput).toHaveBeenCalledWith('changes', '');
      expect(mockCore.setFailed).not.toHaveBeenCalled();
    });

    it('should handle 404 error with "not found" message', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'path') return './CHANGELOG.md';
        return '';
      });
      
      mockIsRepoRootUrl.mockReturnValue(false);
      mockReadContent.mockRejectedValue(new Error('Error reading file ./CHANGELOG.md: not found'));

      await import('./index');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockCore.setOutput).toHaveBeenCalledWith('status', 'nofound');
      expect(mockCore.setFailed).not.toHaveBeenCalled();
    });

    it('should re-throw non-404 errors', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'path') return './CHANGELOG.md';
        return '';
      });
      
      mockIsRepoRootUrl.mockReturnValue(false);
      mockReadContent.mockRejectedValue(new Error('Network error'));

      await import('./index');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockCore.setFailed).toHaveBeenCalled();
    });
  });

  describe('backward compatibility', () => {
    it('should work with local file paths', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'path') return './CHANGELOG.md';
        return '';
      });
      
      mockIsRepoRootUrl.mockReturnValue(false);
      mockReadContent.mockResolvedValue('## [1.0.0] - 2024-01-01\n\n- Initial release');
      mockParseChangelog.mockReturnValue({
        entries: [
          {
            version: '1.0.0',
            date: '2024-01-01',
            status: 'released',
            changes: '- Initial release',
          },
        ],
      });
      mockFindVersionEntry.mockReturnValue({
        version: '1.0.0',
        date: '2024-01-01',
        status: 'released',
        changes: '- Initial release',
      });

      await import('./index');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockReadContent).toHaveBeenCalledWith('./CHANGELOG.md', undefined);
      expect(mockConstructChangelogUrl).not.toHaveBeenCalled();
    });

    it('should work with remote file URLs', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'path') return 'https://raw.githubusercontent.com/owner/repo/main/CHANGELOG.md';
        return '';
      });
      
      mockIsRepoRootUrl.mockReturnValue(false);
      mockReadContent.mockResolvedValue('## [1.0.0] - 2024-01-01\n\n- Initial release');
      mockParseChangelog.mockReturnValue({
        entries: [
          {
            version: '1.0.0',
            date: '2024-01-01',
            status: 'released',
            changes: '- Initial release',
          },
        ],
      });
      mockFindVersionEntry.mockReturnValue({
        version: '1.0.0',
        date: '2024-01-01',
        status: 'released',
        changes: '- Initial release',
      });

      await import('./index');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockReadContent).toHaveBeenCalledWith('https://raw.githubusercontent.com/owner/repo/main/CHANGELOG.md', undefined);
      expect(mockConstructChangelogUrl).not.toHaveBeenCalled();
    });

    it('should default to ./CHANGELOG.md when path is not provided', async () => {
      mockCore.getInput.mockImplementation((_name: string) => {
        return '';
      });
      
      mockIsRepoRootUrl.mockReturnValue(false);
      mockReadContent.mockResolvedValue('## [1.0.0] - 2024-01-01\n\n- Initial release');
      mockParseChangelog.mockReturnValue({
        entries: [
          {
            version: '1.0.0',
            date: '2024-01-01',
            status: 'released',
            changes: '- Initial release',
          },
        ],
      });
      mockFindVersionEntry.mockReturnValue({
        version: '1.0.0',
        date: '2024-01-01',
        status: 'released',
        changes: '- Initial release',
      });

      await import('./index');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockReadContent).toHaveBeenCalledWith('./CHANGELOG.md', undefined);
    });
  });
});

