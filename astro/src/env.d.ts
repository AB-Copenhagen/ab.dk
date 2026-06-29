/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    locale: 'da' | 'en';
    user?: {
      userId: string;
      name?: string;
      email?: string;
    };
  }
}
