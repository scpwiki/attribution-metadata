import { Router, Route } from "preact-router";
import { Link } from "preact-router/match";
import AttributionMetadataPage from "./pages/attribution-metadata";
import UpdatePasswordPage from "./pages/update-password";
import { MessageFunctionProvider, getMessageFunction } from "./util/i18n";

export interface AppProps {
  language: string;
  initialSiteName: string;
}

export function App({ language, initialSiteName }: AppProps) {
  const message = getMessageFunction(language);

  return (
    <>
      <nav class="top-navigation">
        <Link class="top-navigation__link" href="/" activeClassName="top-navigation__link--active">
          {message("attribution-metadata-title")}
        </Link>
        <Link
          class="top-navigation__link"
          href="/password"
          activeClassName="top-navigation__link--active"
        >
          {message("update-password-title")}
        </Link>
      </nav>

      <MessageFunctionProvider value={message}>
        <Router>
          <Route
            path="/"
            component={AttributionMetadataPage}
            initialSiteName={initialSiteName}
            default={true}
          />
          <Route
            path="/password"
            component={UpdatePasswordPage}
            initialSiteName={initialSiteName}
          />
        </Router>
      </MessageFunctionProvider>
    </>
  );
}
