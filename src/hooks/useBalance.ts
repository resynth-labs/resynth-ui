import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useState } from "react";
import {
  AccountLayout,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getMint,
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
  decimals: number;
  exists: boolean;
  isLoadingBalance: boolean;
  isError: boolean;
  getBalance: () => Promise<void>;
}

const loadingBalance: UserBalance = {
  balance: 0,
  balanceAddress: PublicKey.default,
  decimals: 0,
  exists: false,
  isLoadingBalance: true,
  isError: false,
  getBalance: async () => {},
};

const errorBalance: UserBalance = {
  balance: 0,
  balanceAddress: PublicKey.default,
  decimals: 0,
  exists: false,
  isLoadingBalance: false,
  isError: true,
  getBalance: async () => {},
};

export const useCollateralBalance = () => {
  const { client, collateralConfiguration } = useResynth();
  return useBalance(collateralConfiguration.mint);
};

export const useSynthBalance = () => {
  const { client, oracleConfiguration } = useResynth();
  const { syntheticMint } = syntheticAssetPDA(
    client.programId,
    translateAddress(oracleConfiguration.oracle)
  );
  return useBalance(syntheticMint);
};

export const useBalance = (mint: Address) => {
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
        () => handlerBalance(abortSignal)
      );

      if (!abortSignal?.aborted) {
        setBalance(balance);
      }
    },
    [publicKey, connection, mint]
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
  getBalance: () => Promise<void>
): Promise<UserBalance> {
  try {
    if (!wallet) {
      return loadingBalance;
    }

    let balance: UserBalance;
    if (mint.equals(NATIVE_MINT)) {
      balance = await getNativeBalance(wallet, connection, mint, getBalance);
    } else {
      balance = await getTokenBalance(wallet, connection, mint, getBalance);
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
  getBalance: () => Promise<void>
): Promise<UserBalance> {
  if (!publicKey) {
    return loadingBalance;
  }

  const [balanceAddress] = PublicKey.findProgramAddressSync(
    [publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // get unwrapped SOL balance
  const [walletState, wrappedSolState] =
    await connection.getMultipleAccountsInfo([publicKey, balanceAddress]);

  const decimals = 9;

  return {
    balance: (walletState?.lamports ?? 0) / 10 ** decimals,
    balanceAddress,
    decimals,
    exists: !!wrappedSolState,
    isLoadingBalance: false,
    isError: false,
    getBalance,
  };
}

async function getTokenBalance(
  publicKey: PublicKey,
  connection: Connection,
  mint: PublicKey,
  getBalance: () => Promise<void>
): Promise<UserBalance> {
  if (!publicKey) {
    return loadingBalance;
  }

  //get token balance
  const [infos, { decimals }] = await Promise.all([
    connection.getTokenAccountsByOwner(publicKey, {
      mint,
    }),
    getMint(connection, mint),
  ]);

  let highestBalance = BigInt(0);
  let highestAddress: PublicKey | undefined;

  for (const info of infos.value) {
    const accountInfo = AccountLayout.decode(info.account.data);
    if (accountInfo.amount > highestBalance) {
      highestBalance = accountInfo.amount;
      highestAddress = info.pubkey;
    }
  }

  let exists = true;
  if (!highestAddress) {
    exists = false;
    [highestAddress] = PublicKey.findProgramAddressSync(
      [publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
  }

  return {
    balance: Number(highestBalance) / 10 ** decimals,
    balanceAddress: highestAddress,
    decimals,
    exists,
    isLoadingBalance: false,
    isError: false,
    getBalance,
  };
}
