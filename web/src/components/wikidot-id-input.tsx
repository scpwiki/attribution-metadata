import { useEffect, useRef, useState } from "preact/hooks";
import { getUserInfo } from "../util/crom-api";

export interface WikidotIdInputProps {
  name: string;
  defaultValue: number | null;
  skipFetch: boolean;
}

export default function WikidotIdInput({ name, defaultValue, skipFetch }: WikidotIdInputProps) {
  const debounceTimer = useRef<number>();
  const [value, setValue] = useState(defaultValue?.toString() ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    clearTimeout(debounceTimer.current);
    if (skipFetch || !name) {
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const userInfo = await getUserInfo(name);
        setValue(userInfo.id?.toString() ?? "");
        debounceTimer.current = undefined;
      } finally {
        setLoading(false);
      }
    }, 1000);
  }, [name]);

  return (
    <span class="wikidot-id-input">
      <input
        type="text"
        name="attributions.user_id"
        pattern="[0-9]{1,8}"
        value={value}
        onInput={(event) => {
          clearTimeout(debounceTimer.current);
          setLoading(false);
          setValue(event.currentTarget.value);
        }}
      />
      {loading && <span class="wikidot-id-input__spinner" />}
    </span>
  );
}
