import { useCallback, useEffect, useState } from "react";
import { useResynth } from "../contexts/ResynthProvider";
import { logException } from "../utils/errors";
import {
  SyntheticAssetQuery as ClientSyntheticAssetQuery,
  fetchSyntheticAsset,
  ResynthClient,
  fetchOracle,
} from "@resynth/resynth-sdk";

type SyntheticAssetQuery = ClientSyntheticAssetQuery & {
  isSyntheticAssetLoading: boolean;
  isSyntheticAssetError: boolean;
  fetch: () => Promise<void>;
};

const loadingSyntheticAsset: SyntheticAssetQuery = {
  price: 0,
  status: 0,
  marginAccount: undefined,
  walletBalance: 0,
  syntheticBalance: 0,
  collateralBalance: 0,
  isSyntheticAssetLoading: true,
  isSyntheticAssetError: false,
  fetch: async () => {},
};

const errorSyntheticAsset: SyntheticAssetQuery = {
  price: 0,
  status: 0,
  marginAccount: undefined,
  walletBalance: 0,
  syntheticBalance: 0,
  collateralBalance: 0,
  isSyntheticAssetLoading: false,
  isSyntheticAssetError: true,
  fetch: async () => {},
};

export function useSyntheticAsset() {
  const { client, oracle } = useResynth();

  const [poolDeposit, setPoolDeposit] = useState<SyntheticAssetQuery>(
    loadingSyntheticAsset
  );

  const handlerFetchSyntheticAsset = useCallback(
    async (abortSignal?: AbortSignal) => {
      try {
        const query = await fetchSyntheticAsset(client, oracle);

        if (!abortSignal?.aborted) {
          setPoolDeposit({
            ...query,
            isSyntheticAssetLoading: false,
            isSyntheticAssetError: false,
            fetch: handlerFetchSyntheticAsset,
          });
        }
      } catch (err: unknown) {
        logException(err);
        if (!abortSignal?.aborted) {
          setPoolDeposit({
            ...errorSyntheticAsset,
            fetch: handlerFetchSyntheticAsset,
          });
        }
      }
    },
    [client, oracle]
  );

  useEffect(() => {
    const abortController = new AbortController();
    handlerFetchSyntheticAsset(abortController.signal).catch(logException);
    return () => abortController.abort();
  }, [handlerFetchSyntheticAsset]);

  return poolDeposit;
}
