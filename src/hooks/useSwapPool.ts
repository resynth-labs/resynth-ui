import { useCallback, useEffect, useState } from "react";
import { useResynth } from "../contexts/ResynthProvider";
import { logException } from "../utils/errors";
import {
  fetchSwapPool,
  SwapPoolQuery as ClientSwapPoolQuery,
} from "@resynth/resynth-sdk";

type SwapPoolQuery = ClientSwapPoolQuery & {
  isSwapPoolLoading: boolean;
  isSwapPoolError: boolean;
  fetch: () => Promise<void>;
};

const loadingSwapPool: SwapPoolQuery = {
  swapPoolData: undefined,
  mintADecimals: 0,
  mintBDecimals: 0,
  vaultAAmount: 0,
  vaultBAmount: 0,
  lpmintDecimals: 0,
  isSwapPoolLoading: true,
  isSwapPoolError: false,
  fetch: async () => {},
};

const errorSwapPool: SwapPoolQuery = {
  swapPoolData: undefined,
  mintADecimals: 0,
  mintBDecimals: 0,
  vaultAAmount: 0,
  vaultBAmount: 0,
  lpmintDecimals: 0,
  isSwapPoolLoading: false,
  isSwapPoolError: true,
  fetch: async () => {},
};

export function useSwapPool() {
  const { tokenSwap, mint1, mint2 } = useResynth();

  const [swapPool, setSwapPool] = useState<SwapPoolQuery>(loadingSwapPool);

  const handlerFetchSwapPool = useCallback(
    async (abortSignal?: AbortSignal) => {
      try {
        const query = await fetchSwapPool(tokenSwap, mint1, mint2);

        if (!abortSignal?.aborted) {
          setSwapPool({
            ...query,
            isSwapPoolLoading: false,
            isSwapPoolError: false,
            fetch: handlerFetchSwapPool,
          });
        }
      } catch (err: unknown) {
        logException(err);
        if (!abortSignal?.aborted) {
          setSwapPool({
            ...errorSwapPool,
            fetch: handlerFetchSwapPool,
          });
        }
      }
    },
    [tokenSwap]
  );

  useEffect(() => {
    const abortController = new AbortController();
    handlerFetchSwapPool(abortController.signal).catch(logException);
    return () => abortController.abort();
  }, [handlerFetchSwapPool]);

  return swapPool;
}
