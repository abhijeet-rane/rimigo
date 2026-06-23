import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

export const useQueryParams = () => {
  const { search } = useLocation();

  return useMemo(() => {
    const params = new URLSearchParams(search);
    const queryParams: Record<string, string> = {};

    params.forEach((value, key) => {
      queryParams[key] = value;
    });

    return queryParams;
  }, [search]);
};
