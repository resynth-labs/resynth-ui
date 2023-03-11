import { useCallback, useEffect, useState } from "react";
import { useResynth } from "../contexts/ResynthProvider";

const revalidateTimer = 30 * 1000;

interface Blockhash {
  blockhash: string;
  lastValidBlockHeight: number;
}

export interface BlockhashQuery {
  getBlockhash: () => Promise<Blockhash>;
}

/**
 * Returns a cached recent blockhash, that will be revalidated on a timer
 */
export function useCachedBlockhash() {
  const { client } = useResynth();

  const [state, setState] = useState<Blockhash>();

  async function revalidate(abortSignal: AbortSignal) {
    const data = await client.connection.getLatestBlockhash();

    if (!abortSignal.aborted) {
      setState(data);
    }
  }

  useEffect(() => {
    const abortController = new AbortController();
    revalidate(abortController.signal);
    const interval = setInterval(
      () => revalidate(abortController.signal),
      revalidateTimer
    );
    return () => {
      clearInterval(interval);
      abortController.abort();
    };
  }, []);

  let getBlockhash: () => Promise<{
    blockhash: string;
    lastValidBlockHeight: number;
  }> = async () => {
    if (state !== undefined) {
      // consume the blockhash and replace it with a new one
      // https://docs.solana.com/developing/programming-model/transactions#recent-blockhash
      // Any transaction that is completely identical to a previous one is
      // rejected, so adding a newer blockhash allows multiple transactions
      // to repeat the exact same action.
      setState(undefined);
      client.connection.getLatestBlockhash().then(setState);

      return state;
    }

    return await client.connection.getLatestBlockhash();
  };

  return getBlockhash;
}
