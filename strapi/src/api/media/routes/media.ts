/**
 * media router
 *
 * No content-type behind this — `type` gets forced to 'content-api' by
 * Strapi's route registrar regardless, which is what puts this under the
 * `/api` prefix: final path is `/api/media/optimize-webp`.
 */
export default {
  routes: [
    {
      method: 'GET',
      path: '/media/optimize-webp',
      handler: 'media.optimizeWebp',
      config: {
        auth: false,
      },
    },
  ],
};
