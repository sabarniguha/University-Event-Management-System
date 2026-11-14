import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api.js';
import { errMsg } from '../utils/format.js';

// Loads data from the API and exposes loading / error state and a reload function.
// `params` should be a stable object (use useMemo) or a primitive-only object; it is compared by JSON.
export default function useFetch(path, params) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState('');
  const key = JSON.stringify([path, params || null]);
  const latest = useRef(0);

  const load = useCallback(() => {
    if (!path) return Promise.resolve();
    const run = ++latest.current;
    setLoading(true);
    return api
      .get(path, { params })
      .then((res) => {
        if (run === latest.current) {
          setData(res.data);
          setError('');
        }
      })
      .catch((e) => {
        if (run === latest.current) setError(errMsg(e));
      })
      .finally(() => {
        if (run === latest.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load, setData };
}
