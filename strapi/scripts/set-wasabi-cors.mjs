#!/usr/bin/env node
/**
 * set-wasabi-cors.mjs — Apply CORS policy to the Wasabi bucket
 *
 * The Strapi admin detail view fetches media via XHR (not plain <img> tags),
 * which triggers CORS. Without a bucket CORS policy, browsers block these
 * requests with "No 'Access-Control-Allow-Origin' header".
 *
 * Usage (from project root):
 *   node --env-file=strapi/.env strapi/scripts/set-wasabi-cors.mjs
 */

import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';

const {
  WASABI_ACCESS_KEY_ID: accessKeyId,
  WASABI_SECRET_ACCESS_KEY: secretAccessKey,
  WASABI_BUCKET: Bucket = 'ab-media',
  WASABI_REGION: region = 'eu-central-1',
  WASABI_ENDPOINT: endpoint = 'https://s3.eu-central-1.wasabisys.com',
} = process.env;

if (!accessKeyId || !secretAccessKey) {
  console.error('Missing WASABI_ACCESS_KEY_ID or WASABI_SECRET_ACCESS_KEY');
  process.exit(1);
}

const s3 = new S3Client({
  endpoint,
  region,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: false,
});

const corsConfig = {
  CORSRules: [
    {
      // Strapi admin (local dev + any hosted Strapi origin)
      AllowedOrigins: ['http://localhost:1337', 'https://*.ab.dk'],
      AllowedMethods: ['GET', 'HEAD'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
      MaxAgeSeconds: 3600,
    },
  ],
};

console.log(`Applying CORS policy to s3://${Bucket}...`);
console.log(JSON.stringify(corsConfig, null, 2));

await s3.send(new PutBucketCorsCommand({ Bucket, CORSConfiguration: corsConfig }));

// Verify
const result = await s3.send(new GetBucketCorsCommand({ Bucket }));
console.log('\nVerified CORS rules now in place:');
console.log(JSON.stringify(result.CORSRules, null, 2));
