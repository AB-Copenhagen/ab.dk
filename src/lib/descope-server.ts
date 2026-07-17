import descopeSdk from '@descope/node-sdk';

const descopeProjectId = import.meta.env.DESCOPE_PROJECT_ID;

export const descope = descopeProjectId
  ? descopeSdk({ projectId: descopeProjectId })
  : null;
