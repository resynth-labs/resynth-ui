import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useState } from "react";
import {
  AccountLayout,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { useResynth } from "../contexts/ResynthProvider";
import { logException } from "../utils/errors";
import { Address, translateAddress } from "@coral-xyz/anchor";
import { syntheticAssetPDA, SYNTH_DECIMALS } from "@resynth/resynth-sdk";

export interface UserBalance {
  balance: number;
  balanceAddress: PublicKey;
  isLoadingBalance: boolean;
  isError: boolean;
  getBalance: () => Promise<void>;
}

const loadingBalance: UserBalance = {
  balance: 0,
  balanceAddress: PublicKey.default,
  isLoadingBalance: true,
  isError: false,
  getBalance: async () => {},
};

const errorBalance: UserBalance = {
  balance: 0,
  balanceAddress: PublicKey.default,
  isLoadingBalance: false,
  isError: true,
  getBalance: async () => {},
};

export const useCollateralBalance = () => {
  const { client } = useResynth();
  const mint = client.config.collateralMint;
  const decimals = client.config.collateralDecimals;
  return useBalance(mint, decimals);
};

export const useSynthBalance = () => {
  const { client, oracle, oracleConfiguration } = useResynth();
  const { syntheticMint } = syntheticAssetPDA(
    client.programId,
    translateAddress(oracleConfiguration.oracle)
  );
  const decimals = SYNTH_DECIMALS;
  return useBalance(syntheticMint, decimals);
};

export const useBalance = (mint: Address, decimals: number) => {
  const { publicKey } = useWallet();
  const { client } = useResynth();
  const connection = client.connection;

  const [balance, setBalance] = useState<UserBalance>(loadingBalance);

  const handlerBalance = useCallback(
    async (abortSignal?: AbortSignal) => {
      const balance = await getBalance(
        connection,
        publicKey,
        translateAddress(mint),
        decimals,
        () => handlerBalance(abortSignal)
      );

      if (!abortSignal?.aborted) {
        setBalance(balance);
      }
    },
    [publicKey, connection, mint, decimals]
  );

  useEffect(() => {
    const abortController = new AbortController();
    handlerBalance(abortController.signal).catch(logException);
    return () => abortController.abort();
  }, [handlerBalance]);

  return balance;
};

export async function getBalance(
  connection: Connection,
  wallet: PublicKey | null,
  mint: PublicKey,
  decimals: number,
  getBalance: () => Promise<void>
): Promise<UserBalance> {
  try {
    if (!wallet) {
      return loadingBalance;
    }

    let balance: UserBalance;
    if (mint.equals(NATIVE_MINT)) {
      balance = await getNativeBalance(
        wallet,
        connection,
        mint,
        decimals,
        getBalance
      );
    } else {
      balance = await getTokenBalance(
        wallet,
        connection,
        mint,
        decimals,
        getBalance
      );
    }

    return balance;
  } catch (err: any) {
    logException(err);
    return errorBalance;
  }
}

async function getNativeBalance(
  publicKey: PublicKey,
  connection: Connection,
  mint: PublicKey,
  decimals: number,
  getBalance: () => Promise<void>
): Promise<UserBalance> {
  if (!publicKey) {
    return loadingBalance;
  }

  // get unwrapped SOL balance
  const walletState = await connection.getAccountInfo(publicKey);

  const [balanceAddress] = PublicKey.findProgramAddressSync(
    [publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  return {
    balance: (walletState?.lamports ?? 0) / 10 ** decimals,
    balanceAddress,
    isLoadingBalance: false,
    isError: false,
    getBalance,
  };
}

async function getTokenBalance(
  publicKey: PublicKey,
  connection: Connection,
  mint: PublicKey,
  decimals: number,
  getBalance: () => Promise<void>
): Promise<UserBalance> {
  if (!publicKey) {
    return loadingBalance;
  }

  //get token balance
  const infos = await connection.getTokenAccountsByOwner(publicKey, {
    mint: mint,
  });

  let highestBalance = BigInt(0);
  let highestAddress: PublicKey | undefined;

  for (const info of infos.value) {
    const accountInfo = AccountLayout.decode(info.account.data);
    if (accountInfo.amount > highestBalance) {
      highestBalance = accountInfo.amount;
      highestAddress = info.pubkey;
    }
  }

  if (!highestAddress) {
    [highestAddress] = PublicKey.findProgramAddressSync(
      [publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
  }

  return {
    balance: Number(highestBalance) / 10 ** decimals,
    balanceAddress: highestAddress,
    isLoadingBalance: false,
    isError: false,
    getBalance,
  };
}
