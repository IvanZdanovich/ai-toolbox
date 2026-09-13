/**
 * Provider Registry Integration Tests
 *
 * Tests provider lookup, legacy id migration, and registry listing.
 */

import { describe, it, expect } from 'vitest';
import {
  AI_PROVIDERS,
  PROVIDERS,
  PROVIDER_IDS,
  normalizeProviderId,
  getProvider,
  listProviders,
} from '../../../shared/providers.js';

describe('Provider Registry Integration', () => {
  describe('Scenario: Normalizing provider ids', () => {
    it('should pass through a known provider id unchanged', () => {
      expect(normalizeProviderId(AI_PROVIDERS.CLAUDE)).toBe(AI_PROVIDERS.CLAUDE);
    });

    it.each([
      ['llama', AI_PROVIDERS.GROQ],
      ['anthropic', AI_PROVIDERS.CLAUDE],
      ['google', AI_PROVIDERS.GEMINI],
      ['xai', AI_PROVIDERS.GROK],
    ])('should map legacy id %s to %s', (legacyId, expected) => {
      expect(normalizeProviderId(legacyId)).toBe(expected);
    });

    it('should fall back to the mock provider for an unknown id', () => {
      expect(normalizeProviderId('does-not-exist')).toBe(AI_PROVIDERS.MOCK);
    });

    it('should fall back to the mock provider for a missing id', () => {
      expect(normalizeProviderId(undefined)).toBe(AI_PROVIDERS.MOCK);
    });
  });

  describe('Scenario: Resolving a provider definition', () => {
    it('should return the full definition for a known id', () => {
      const provider = getProvider(AI_PROVIDERS.OPENAI);

      expect(provider).toMatchObject({
        id: AI_PROVIDERS.OPENAI,
        requiresApiKey: true,
        defaultModel: PROVIDERS[AI_PROVIDERS.OPENAI].defaultModel,
      });
    });

    it('should resolve a legacy id to its replacement definition', () => {
      const provider = getProvider('anthropic');

      expect(provider.id).toBe(AI_PROVIDERS.CLAUDE);
    });

    it('should resolve an unknown id to the mock provider definition', () => {
      const provider = getProvider('nope');

      expect(provider.id).toBe(AI_PROVIDERS.MOCK);
    });
  });

  describe('Scenario: Listing providers', () => {
    it('should list every registered provider exactly once', () => {
      const providers = listProviders();

      expect(providers).toHaveLength(PROVIDER_IDS.length);
      expect(new Set(providers.map((p) => p.id)).size).toBe(PROVIDER_IDS.length);
    });

    it('should include every provider referenced by AI_PROVIDERS', () => {
      const ids = listProviders().map((p) => p.id);

      Object.values(AI_PROVIDERS).forEach((id) => {
        expect(ids).toContain(id);
      });
    });
  });

  describe('Scenario: Local providers require no API key', () => {
    it.each([AI_PROVIDERS.OLLAMA, AI_PROVIDERS.LLAMACPP, AI_PROVIDERS.LMSTUDIO])(
      '%s should not require an API key',
      (id) => {
        expect(PROVIDERS[id].requiresApiKey).toBe(false);
      }
    );
  });
});
