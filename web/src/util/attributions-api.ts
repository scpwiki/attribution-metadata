const ATTRIBUTIONS_ENDPOINT =
  "https://tptm7stb3j3onds27seddf2izq0mcesv.lambda-url.us-east-2.on.aws";

export const SITES = [
  "scp-wiki",
  "scp-ru",
  "scpko",
  "scp-wiki-cn",
  "fondationscp",
  "scp-pl",
  "lafundacionscp",
  "scp-th",
  "scp-jp",
  "scp-wiki-de",
  "fondazionescp",
  "scp-ukrainian",
  "scp-pt-br",
  "scp-cs",
  "scp-zh-tr",
  "scp-vn",
  "wanderers-library",
];

export interface PageAttribution {
  type: string;
  user_name: string;
  user_id: number | null;
  date: string | null;
}

async function request(method: string, path: string, data?: any): Promise<Response> {
  let response: Response;
  const url = new URL(path, ATTRIBUTIONS_ENDPOINT);
  if (method === "GET") {
    url.search = new URLSearchParams(data).toString();
    response = await fetch(url, { method });
  } else {
    response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
  }
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response;
}

export async function checkPassword(type: string, site: string, password: string) {
  return request("PUT", "/password/check", { site, password, type });
}

export async function updatePassword(
  type: "admin" | "regular",
  site: string,
  adminPassword: string,
  oldPassword: string,
  newPassword: string,
) {
  await request("PUT", "/password/update", {
    type,
    site,
    admin_password: adminPassword,
    old_password: oldPassword,
    new_password: newPassword,
  });
}

export async function getPageAttributions(
  site: string,
  page: string,
): Promise<PageAttribution[] | null> {
  const response = await request("GET", "/attribution/page", { site, page });
  return response.json();
}

export async function updatePageAttributions(
  site: string,
  page: string,
  password: string,
  attributions: PageAttribution[],
) {
  await request("PUT", "/attribution/page", {
    site,
    page,
    password,
    attributions,
  });
}
