import { render } from "preact";
import { App } from "./app";

import "@fontsource-variable/inter";
import "normalize.css";
import "./styles.css";

const parameters = new URLSearchParams(location.search);
const language = parameters.get("lang") || "en";
const initialSiteName = parameters.get("site") || "scp-wiki";

render(
  <App language={language} initialSiteName={initialSiteName} />,
  document.getElementById("root")!,
);
