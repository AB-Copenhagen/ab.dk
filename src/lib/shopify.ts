const domain = import.meta.env.SHOPIFY_DOMAIN as string | undefined;
const accessToken = import.meta.env.SHOPIFY_STOREFRONT_CLIENT_SECRET as string | undefined;

const API_VERSION = '2024-01';

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  price: string;
  compareAtPrice: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  url: string;
}

interface GqlResponse<T> {
  data: T;
  errors?: { message: string }[];
}

async function storefront<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!domain || !accessToken) throw new Error('Shopify env vars not configured');

  const res = await fetch(`https://${domain}/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);

  const json = (await res.json()) as GqlResponse<T>;
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

const COLLECTION_BY_ID_QUERY = `
  query CollectionProducts($id: ID!, $first: Int!) {
    collection(id: $id) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            priceRange {
              minVariantPrice { amount currencyCode }
            }
            compareAtPriceRange {
              maxVariantPrice { amount currencyCode }
            }
            images(first: 1) {
              edges {
                node { url altText }
              }
            }
          }
        }
      }
    }
  }
`;

const COLLECTION_BY_HANDLE_QUERY = `
  query CollectionProducts($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            priceRange {
              minVariantPrice { amount currencyCode }
            }
            compareAtPriceRange {
              maxVariantPrice { amount currencyCode }
            }
            images(first: 1) {
              edges {
                node { url altText }
              }
            }
          }
        }
      }
    }
  }
`;

function formatPrice(amount: string, currencyCode: string): string {
  return `${currencyCode} ${Math.round(parseFloat(amount))}`;
}

type CollectionData = {
  collection: {
    products: {
      edges: {
        node: {
          id: string;
          title: string;
          handle: string;
          priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
          compareAtPriceRange: { maxVariantPrice: { amount: string; currencyCode: string } };
          images: { edges: { node: { url: string; altText: string | null } }[] };
        };
      }[];
    };
  } | null;
};

export async function fetchCollectionProducts(
  collectionRef: string,
  limit = 3
): Promise<ShopifyProduct[]> {
  const byId = /^\d+$/.test(collectionRef);
  const query = byId ? COLLECTION_BY_ID_QUERY : COLLECTION_BY_HANDLE_QUERY;
  const variables = byId
    ? { id: `gid://shopify/Collection/${collectionRef}`, first: limit }
    : { handle: collectionRef, first: limit };

  const data = await storefront<CollectionData>(query, variables);
  if (!data.collection) return [];

  return data.collection.products.edges.map(({ node }) => {
    const img = node.images.edges[0]?.node;
    const price = node.priceRange.minVariantPrice;
    const compareAt = node.compareAtPriceRange.maxVariantPrice;
    const hasCompare = parseFloat(compareAt.amount) > parseFloat(price.amount);

    return {
      id: node.id,
      title: node.title,
      handle: node.handle,
      price: formatPrice(price.amount, price.currencyCode),
      compareAtPrice: hasCompare ? formatPrice(compareAt.amount, compareAt.currencyCode) : null,
      imageUrl: img?.url ?? null,
      imageAlt: img?.altText ?? node.title,
      url: `https://${domain}/products/${node.handle}`,
    };
  });
}
