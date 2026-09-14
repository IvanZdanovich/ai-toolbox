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
} from '../../../chrome-extension/shared/providers.js';

describe('Providers: Given the provider registry', () => {
  describe('Providers: When a provider id is normalised', () => {
    it('Providers: Then it passes through a known provider id unchanged', () => {
      expect(normalizeProviderId(AI_PROVIDERS.CLAUDE)).toBe(
        AI_PROVIDERS.CLAUDE
      );
    });

    it.each([
      ['llama', AI_PROVIDERS.GROQ],
      ['anthropic', AI_PROVIDERS.CLAUDE],
      ['google', AI_PROVIDERS.GEMINI],
      ['xai', AI_PROVIDERS.GROK],
    ])('Providers: Then legacy id %s maps to %s', (legacyId, expected) => {
      expect(normalizeProviderId(legacyId)).toBe(expected);
    });

    it('Providers: Then it falls back to the mock provider for an unknown id', () => {
      expect(normalizeProviderId('does-not-exist')).toBe(AI_PROVIDERS.MOCK);
    });

    it('Providers: Then it falls back to the mock provider for a missing id', () => {
      expect(normalizeProviderId(undefined)).toBe(AI_PROVIDERS.MOCK);
    });
  });

  describe('Providers: When a provider definition is resolved', () => {
    it('Providers: Then it returns the full definition for a known id', () => {
      const provider = getProvider(AI_PROVIDERS.OPENAI);

      expect(provider).toMatchObject({
        id: AI_PROVIDERS.OPENAI,
        requiresApiKey: true,
        defaultModel: PROVIDERS[AI_PROVIDERS.OPENAI].defaultModel,
      });
    });

    it('Providers: Then it resolves a legacy id to its replacement definition', () => {
      const provider = getProvider('anthropic');

      expect(provider.id).toBe(AI_PROVIDERS.CLAUDE);
    });

    it('Providers: Then it resolves an unknown id to the mock provider definition', () => {
      const provider = getProvider('nope');

      expect(provider.id).toBe(AI_PROVIDERS.MOCK);
    });
  });

  describe('Providers: When the registry is listed', () => {
    it('Providers: Then it lists every registered provider exactly once', () => {
      const providers = listProviders();

      expect(providers).toHaveLength(PROVIDER_IDS.length);
      expect(new Set(providers.map((p) => p.id)).size).toBe(
        PROVIDER_IDS.length
      );
    });

    it('Providers: Then it includes every provider referenced by AI_PROVIDERS', () => {
      const ids = listProviders().map((p) => p.id);

      Object.values(AI_PROVIDERS).forEach((id) => {
        expect(ids).toContain(id);
      });
    });
  });

  describe('Providers: When a local provider is checked for an API key requirement', () => {
    it.each([
      AI_PROVIDERS.OLLAMA,
      AI_PROVIDERS.LLAMACPP,
      AI_PROVIDERS.LMSTUDIO,
    ])('Providers: Then %s requires no API key', (id) => {
      expect(PROVIDERS[id].requiresApiKey).toBe(false);
    });
  });
});
