import { useState } from "preact/hooks";
import { PageAttribution } from "../util/attributions-api";
import AttributionsInputRow from "./attributions-input-row";
import { useMessageFunction } from "../util/i18n";

export interface AttributionsInputProps {
  initialAttributions?: PageAttribution[];
}

export default function AttributionsInput({ initialAttributions = [] }: AttributionsInputProps) {
  const message = useMessageFunction();
  const [attributions, setAttributions] = useState<PageAttribution[]>(initialAttributions);

  const addAttributionRow = () => {
    setAttributions([
      ...attributions,
      { type: "author", user_name: "", user_id: null, date: null },
    ]);
  };

  const removeAttributionRow = (i: number) => {
    setAttributions([...attributions.slice(0, i), ...attributions.slice(i + 1)]);
  };

  return (
    <>
      <div class="attributions-input-table__wrapper">
        {attributions.length > 0 && (
          <table class="attributions-input-table">
            <thead>
              <tr>
                <th>
                  <strong>{message("attribution-type-label")}</strong>
                </th>
                <th>
                  <strong>{message("attribution-name-label")}</strong>
                  <br />
                  <small>{message("attribution-name-description")}</small>
                </th>
                <th>
                  <strong>{message("attribution-wikidot-id-label")}</strong>
                  <br />
                  <small>{message("attribution-wikidot-id-description")}</small>
                </th>
                <th>
                  <strong>{message("attribution-date-label")}</strong>
                  <br />
                  <small>{message("attribution-date-description")}</small>
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {attributions.map((attribution, i) => (
                <AttributionsInputRow
                  key={i}
                  attribution={attribution}
                  onRemove={() => removeAttributionRow(i)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
      <button class="add-button" type="button" onClick={addAttributionRow}>
        <span aria-hidden="true">+</span> {message("attribution-add-button")}
      </button>
    </>
  );
}
