const CROM_ENDPOINT = "https://api.crom.avn.sh/graphql";

const GET_PAGE_QUERY = `
  query GetPage($url: URL!) {
    page(url: $url) {
      wikidotInfo {
        title
        rating
        createdAt
        createdBy {
          name
          wikidotInfo {
            displayName
          }
        }
      }
      alternateTitles {
        title
      }
    }
  }
`;

const GET_USER_QUERY = `
  query GetUser($name: String!) {
    user(name: $name) {
      wikidotInfo {
        displayName
        wikidotId
      }
    }
  }
`;

async function gqlQuery(query: string, variables?: Record<string, unknown>) {
  const response = await fetch(CROM_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Crom API HTTP error: ${response.status}`);
  }

  const { data, errors } = await response.json();

  if (errors && errors.length > 0) {
    console.error(errors);
    throw new Error(`Crom API GraphQL errors: ${JSON.stringify(errors)}`);
  }

  return data;
}

export interface PageInfo {
  url: string;
  title: string | undefined;
  alternateTitle: string | undefined;
  score: number;
  createdAt: Date;
  createdBy: string | undefined;
}

export async function getPageInfo(
  siteName: string,
  slug: string
): Promise<PageInfo | null> {
  const url = `http://${siteName}.wikidot.com/${slug}`;
  const { page } = await gqlQuery(GET_PAGE_QUERY, { url });
  if (page.wikidotInfo === null) {
    return null;
  }

  return {
    url,
    title: page.wikidotInfo.title,
    alternateTitle: page.alternateTitles[0]?.title,
    score: page.wikidotInfo.rating ?? 0,
    createdAt: new Date(page.wikidotInfo.createdAt),
    createdBy:
      page.wikidotInfo.createdBy?.wikidotInfo?.displayName ?? "Unknown",
  };
}

export interface UserInfo {
  name: string | undefined;
  id: number | undefined;
}

export async function getUserInfo(name: string): Promise<UserInfo> {
  const { user } = await gqlQuery(GET_USER_QUERY, { name });
  return {
    name: user.wikidotInfo?.displayName ?? undefined,
    id: user.wikidotInfo?.wikidotId ?? undefined,
  };
}
