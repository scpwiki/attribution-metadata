import { createContext } from "preact";
import { useContext } from "preact/hooks";

const DEFAULT_TRANSLATIONS = {
  "attribution-metadata-title": "Attribution metadata",
  "update-password-title": "Update password",

  "site-label": "Site",
  "page-label": "Page",
  "go-button": "Go!",
  "page-info-title": "Page info",
  "posted-by": "Posted by:",
  "posted-on": "Posted on:",

  "modify-attributions-title": "Modify attributions",
  "password-label": "Password",
  "save-button": "Save",
  error: "Error:",

  "attribution-type-label": "Type",
  "attribution-name-label": "Name",
  "attribution-name-description": "Use correct capitalization.",
  "attribution-wikidot-id-label": "Wikidot ID",
  "attribution-wikidot-id-description": "Updates when name changes.",
  "attribution-date-label": "Date",
  "attribution-date-description": "Use YYYY-MM-DD format.",
  "attribution-add-button": "Add",
  "attribution-delete-button": "Delete",

  "attribution-type-author": "Author",
  "attribution-type-rewrite": "Rewrite",
  "attribution-type-translator": "Translator",
  "attribution-type-maintainer": "Maintainer",

  "password-type-label": "Type",
  "password-type-regular": "Regular",
  "password-type-admin": "Admin",
  "admin-password-label": "Admin password",
  "old-password-label": "Old password",
  "new-password-label": "New password",
  "repeat-password-label": "Repeat new password",
  "submit-button": "Submit",

  "password-does-not-match": "Password does not match.",
};

const TRANSLATIONS = {
  en: DEFAULT_TRANSLATIONS,
};

TRANSLATIONS satisfies Record<string, typeof DEFAULT_TRANSLATIONS>;
export type MessageKey = keyof typeof DEFAULT_TRANSLATIONS;
export type Language = keyof typeof TRANSLATIONS;

const MessageFunctionContext = createContext(getMessageFunction("en"));

export const MessageFunctionProvider = MessageFunctionContext.Provider;
export function useMessageFunction() {
  return useContext(MessageFunctionContext);
}

export function getMessageFunction(language: string): (MessageKey: MessageKey) => string {
  // Special case: the 'test' language just echoes the message key back out.
  if (language === "test") return (messageKey) => messageKey;
  return (messageKey) => TRANSLATIONS[language as Language][messageKey];
}
