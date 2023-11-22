import { useState } from "preact/hooks";
import { PageAttribution } from "../util/attributions-api";
import WikidotIdInput from "./wikidot-id-input";
import { useMessageFunction } from "../util/i18n";

export interface AttributionsInputRowProps {
  attribution: PageAttribution;
  onRemove: () => void;
}

export default function AttributionsInputRow({ attribution, onRemove }: AttributionsInputRowProps) {
  const message = useMessageFunction();
  const [name, setName] = useState(attribution.user_name);
  const [skipFetch, setSkipFetch] = useState(true);

  return (
    <tr class="attributions-input-row">
      <td>
        <select name="attributions.type" defaultValue={attribution.type} required>
          <option value="author">{message("attribution-type-author")}</option>
          <option value="rewrite">{message("attribution-type-rewrite")}</option>
          <option value="translator">{message("attribution-type-translator")}</option>
          <option value="maintainer">{message("attribution-type-maintainer")}</option>
        </select>
      </td>
      <td>
        <input
          type="text"
          name="attributions.user_name"
          required={true}
          value={name}
          onInput={(event) => {
            setName(event.currentTarget.value);
            setSkipFetch(false);
          }}
        />
      </td>
      <td>
        <WikidotIdInput name={name} defaultValue={attribution.user_id} skipFetch={skipFetch} />
      </td>
      <td>
        <input
          type="text"
          name="attributions.date"
          pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
          placeholder="YYYY-MM-DD"
          defaultValue={attribution.date ?? undefined}
        />
      </td>
      <td>
        <button class="remove-button" type="button" onClick={onRemove}>
          {message("attribution-delete-button")}
        </button>
      </td>
    </tr>
  );
}
