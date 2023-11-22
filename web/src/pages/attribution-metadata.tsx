import { JSX, Fragment } from "preact";
import { useState } from "preact/hooks";

import { PageInfo, getPageInfo } from "../util/crom-api";
import {
  PageAttribution,
  SITES,
  getPageAttributions,
  updatePageAttributions,
} from "../util/attributions-api";
import AttributionsInput from "../components/attributions-input";
import { useMessageFunction } from "../util/i18n";

export interface AttributionMetadataPageProps {
  initialSiteName: string;
}

interface Page {
  site: string;
  slug: string;
  pageInfo: PageInfo | null;
  pageAttributions: PageAttribution[] | null;
}

export default function AttributionMetadataPage({ initialSiteName }: AttributionMetadataPageProps) {
  const message = useMessageFunction();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [page, setPage] = useState<Page>();

  const onGetPageFormSubmit = async (event: JSX.TargetedEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const site = formData.get("site") as string;
    const slug = formData.get("slug") as string;

    setLoading(true);
    setPage(undefined);
    try {
      const [pageInfo, pageAttributions] = await Promise.all([
        getPageInfo(site, slug),
        getPageAttributions(site, slug),
      ]);
      setPage({ site, slug, pageInfo, pageAttributions });
    } finally {
      setLoading(false);
    }
  };

  const onAttributionFormSubmit = async (event: JSX.TargetedEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const site = formData.get("site") as string;
    const slug = formData.get("slug") as string;
    const password = formData.get("password") as string;
    const types = formData.getAll("attributions.type") as string[];
    const user_names = formData.getAll("attributions.user_name") as string[];
    const user_ids = formData.getAll("attributions.user_id") as string[];
    const dates = formData.getAll("attributions.date") as string[];

    const attributions: PageAttribution[] = Array.from({ length: types.length }, (_v, i) => {
      return {
        type: types[i]!,
        user_name: user_names[i]!,
        user_id: user_ids[i] ? parseInt(user_ids[i]!) : null,
        date: dates[i]! || null,
      };
    });

    setLoading(true);
    try {
      await updatePageAttributions(site, slug, password, attributions);
      setError(undefined);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <h1 class="title">{message("attribution-metadata-title")}</h1>

      <form class="get-page-form" onSubmit={onGetPageFormSubmit}>
        <select name="site" aria-label={message("site-label")} readOnly={loading} required={true}>
          {SITES.map((name) => (
            <option value={name} selected={name === initialSiteName}>
              {name}.wikidot.com
            </option>
          ))}
        </select>
        <strong> / </strong>
        <input
          name="slug"
          aria-label={message("page-label")}
          type="text"
          readOnly={loading}
          required={true}
        />{" "}
        <button type="submit" disabled={loading}>
          {message("go-button")}
        </button>
      </form>

      <Fragment key={page}>
        {page?.pageInfo && (
          <section class="container page-info">
            <h2 class="container__title">{message("page-info-title")}</h2>
            <p>
              <a class="page-info__link" target="_blank" href={page.pageInfo.url}>
                {page.pageInfo.title}
                {page.pageInfo.alternateTitle && " — " + page.pageInfo.alternateTitle}
              </a>{" "}
              ({page.pageInfo.score >= 0 ? "+" : ""}
              {page.pageInfo.score})
              <br />
              {message("posted-by")} <strong>{page.pageInfo.createdBy}</strong>
              <br />
              {message("posted-on")} <strong>{page.pageInfo.createdAt.toLocaleDateString()}</strong>
            </p>
          </section>
        )}

        {page && (
          <section class="container">
            <h2 class="container__title">{message("modify-attributions-title")}</h2>
            <form onSubmit={onAttributionFormSubmit}>
              <input type="hidden" name="site" value={page.site} />
              <input type="hidden" name="slug" value={page.slug} />
              <AttributionsInput initialAttributions={page.pageAttributions ?? []} />
              <hr />
              <div class="submit-attributions-row">
                <label for="password-input">{message("password-label")}</label>
                <input
                  id="password-input"
                  class="submit-attributions-row__password"
                  type="password"
                  name="password"
                  required={true}
                />
                <button disabled={loading}>{message("save-button")}</button>
              </div>

              {error && (
                <div role="alert" class="container container--error">
                  <strong>{message("error")} </strong> {error}
                </div>
              )}
            </form>
          </section>
        )}
      </Fragment>
    </main>
  );
}
