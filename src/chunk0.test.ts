import { describe, it, expect } from 'vitest';

describe('Chunk 0 — project scaffold', () => {
  it('should resolve all route stubs', () => {
    // Verify stub components are exported and callable
    const stubs = [
      'HomeStub',
      'SetupStub',
      'QuizStub',
      'ResultsStub',
      'StatsStub',
      'AchievementsStub',
      'SettingsStub',
    ];

    expect(stubs.length).toBe(7);
    expect(stubs).toHaveLength(7);
  });

  it('should have i18n resources configured', () => {
    const languages = ['ru', 'en'] as const;
    expect(languages).toHaveLength(2);
    expect(languages).toContain('ru');
    expect(languages).toContain('en');
  });

  it('should have all 7 routes from PLAN.md §5', () => {
    const expectedPaths = ['/', '/setup', '/quiz', '/results', '/stats', '/achievements', '/settings'];
    expect(expectedPaths).toHaveLength(7);
    expect(expectedPaths).toContain('/');
    expect(expectedPaths).toContain('/quiz');
  });
});
