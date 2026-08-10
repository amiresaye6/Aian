import { useState, useEffect, useCallback } from "react";

type Fetcher = (
  connectionId: string,
  provider: string,
  pageSize?: number,
  nextPageToken?: string,
) => Promise<any>;

const PAGE_SIZE = 10;

export function useMeetingsPagination(fetcher: Fetcher, connectionId: string | undefined, providerKey: string) {
  const [data, setData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  const [tokenHistory, setTokenHistory] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  const fetchPage = useCallback((token: string | undefined) => {
    if (!connectionId) return;
    setIsLoading(true);
    fetcher(connectionId, providerKey, PAGE_SIZE, token)
      .then((res) => {
        setData(res.data || res);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [connectionId, providerKey, fetcher]);

  // Reset and fetch the first page whenever the connection or provider changes
  useEffect(() => {
    setTokenHistory([undefined]);
    setPageIndex(0);
    fetchPage(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId, providerKey]);

  const hasNext = Boolean(data?.nextPageToken);
  const hasPrevious = pageIndex > 0;

  const goNext = () => {
    if (!data?.nextPageToken) return;
    const token = data.nextPageToken;
    const nextIndex = pageIndex + 1;
    setTokenHistory((prev) => {
      const next = [...prev];
      next[nextIndex] = token;
      return next;
    });
    setPageIndex(nextIndex);
    fetchPage(token);
  };

  const goPrevious = () => {
    if (pageIndex === 0) return;
    const prevIndex = pageIndex - 1;
    const token = tokenHistory[prevIndex];
    setPageIndex(prevIndex);
    fetchPage(token);
  };

  return { data, isLoading, hasNext, hasPrevious, goNext, goPrevious, pageNumber: pageIndex + 1 };
}