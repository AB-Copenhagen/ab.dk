/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare module 'fuzzy-search' {
  export default class FuzzySearch<T> {
    constructor(
      source: T[],
      keys?: string[],
      options?: Record<string, unknown>
    );
    search(query: string): T[];
  }
}

declare namespace App {
  interface Locals {
    locale: 'da' | 'en';
    user?: {
      userId: string;
      name?: string;
      email?: string;
      picture?: string;
    };
  }
}
