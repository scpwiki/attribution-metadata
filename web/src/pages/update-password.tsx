import { JSX } from "preact";
import { SITES, updatePassword } from "../util/attributions-api";
import { useRef, useState } from "preact/hooks";
import { useMessageFunction } from "../util/i18n";

export interface UpdatePasswordPageProps {
  initialSiteName: string;
}

export default function UpdatePasswordPage({ initialSiteName }: UpdatePasswordPageProps) {
  const message = useMessageFunction();

  const repeatPasswordRef = useRef<HTMLInputElement | null>(null);
  const [type, setType] = useState<"admin" | "regular">("regular");
  const [error, setError] = useState<string>();

  const onSubmit = async (event: JSX.TargetedEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const site = formData.get("site") as string;
    const oldPassword = formData.get("old-password") as string;
    const newPassword = formData.get("new-password") as string;
    const repeatPassword = formData.get("repeat-password") as string;

    if (newPassword !== repeatPassword) {
      repeatPasswordRef.current?.setCustomValidity(message("password-does-not-match"));
      repeatPasswordRef.current?.reportValidity();
      return;
    }

    const adminPasswordField = type === "admin" ? "old-password" : "admin-password";
    const adminPassword = formData.get(adminPasswordField) as string;
    try {
      await updatePassword(type, site, adminPassword, oldPassword, newPassword);
      setError(undefined);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main>
      <h1 class="title">{message("update-password-title")}</h1>

      <form class="password-form" onSubmit={onSubmit}>
        <label>
          <div class="password-form__label-text">
            <strong>{message("site-label")}</strong>
          </div>
          <select name="site">
            {SITES.map((name) => (
              <option value={name} selected={name === initialSiteName}>
                {name}.wikidot.com
              </option>
            ))}
          </select>
        </label>

        <div class="password-form__group">
          <label>
            <div class="password-form__label-text">
              <strong>{message("password-type-label")}</strong>
            </div>
            <select
              name="type"
              value={type}
              onChange={(event) => setType(event.currentTarget.value as typeof type)}
            >
              <option value="regular">{message("password-type-regular")}</option>
              <option value="admin">{message("password-type-admin")}</option>
            </select>
          </label>

          {type === "regular" && (
            <label>
              <div class="password-form__label-text">
                <strong>{message("admin-password-label")}</strong>
              </div>
              <input type="password" name="admin-password" required={true} />
            </label>
          )}
        </div>

        <hr />

        <label>
          <div class="password-form__label-text">
            <strong>{message("old-password-label")}</strong>
          </div>
          <input type="password" name="old-password" required={true} />
        </label>

        <label>
          <div class="password-form__label-text">
            <strong>{message("new-password-label")}</strong>
          </div>
          <input type="password" name="new-password" required={true} />
        </label>

        <label>
          <div class="password-form__label-text">
            <strong>{message("repeat-password-label")}</strong>
          </div>
          <input
            type="password"
            name="repeat-password"
            required={true}
            ref={repeatPasswordRef}
            onInput={(event) => event.currentTarget.setCustomValidity("")}
          />
        </label>

        {error && (
          <div role="alert" class="container container--error">
            <strong>{message("error")} </strong> {error}
          </div>
        )}

        <div>
          <button>{message("submit-button")}</button>
        </div>
      </form>
    </main>
  );
}
