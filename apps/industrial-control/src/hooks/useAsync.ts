import { useEffect, useState } from "react";

export function useAsync<T>(promise: Promise<T> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!promise) return;
    let active = true;
    setLoading(true);
    promise
      .then((value) => {
        if (active) setData(value);
      })
      .catch((err) => {
        if (active) setError(err as Error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [promise]);

  return { data, loading, error };
}
