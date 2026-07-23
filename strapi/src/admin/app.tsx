import Prism from 'prismjs';
import type { ComponentType } from 'react';
import type { StrapiApp } from '@strapi/strapi/admin';
import { Information, Calendar } from '@strapi/icons';

// Strapi's rich-text editor chunks expect Prism as a global
if (typeof window !== 'undefined') {
  (window as any).Prism = Prism;
}

export default {
  config: {
    locales: [],
  },
  bootstrap(app: StrapiApp) {},
  register(app: StrapiApp) {
    app.customFields.register({
      name: 'match-picker',
      type: 'integer',
      icon: Calendar,
      intlLabel: {
        id: 'match-picker.label',
        defaultMessage: 'Match',
      },
      intlDescription: {
        id: 'match-picker.description',
        defaultMessage: 'Search and select a match from the current season',
      },
      components: {
        // Strapi's CustomField.Input type is `ComponentType` with no props param,
        // which a component with required props (name, onChange) never satisfies
        // structurally — this cast reflects that Strapi always supplies them at
        // render time, matching a well-known gap in Strapi's own custom-field types.
        Input: async () =>
          import('./components/MatchPickerInput') as unknown as Promise<{
            default?: ComponentType;
          }>,
      },
    });

    if (process.env.STRAPI_ADMIN_IS_DEMO === 'true') {
      if ('widgets' in app) {
        // @ts-ignore
        app.widgets.register({
          icon: Information,
          title: {
            id: 'demo.widget.title',
            defaultMessage: 'Welcome to LaunchPad',
          },
          component: async () => {
            const component = await import('./components/DemoWidget');
            return component.default;
          },
          id: 'demo-launchpad-widget',
        });
      }
    }
  },
};
