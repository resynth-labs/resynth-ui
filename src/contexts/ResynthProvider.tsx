import { createContext, useContext, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Context,
  Oracle,
  ResynthClient,
  syntheticMintPDA,
  TokenSwapClient,
} from "@resynth/resynth-sdk";
import { useNetwork } from "./NetworkProvider";
import { assert } from "../utils/errors";
import { PublicKey } from "@solana/web3.js";
import { translateAddress } from "@coral-xyz/anchor";

/** Accounts of interest to the UI */
interface Accounts {
  oracle: string;
  oracleConfiguration: Oracle;
  mint1: PublicKey;
  mint2: PublicKey;
  symbol1: string;
  symbol2: string;
}

const defaultAccounts: Accounts = {
  oracle: "nSOL",
  oracleConfiguration: {
    class: "Crypto",
    oracle: "H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG",
    pair: "SOL/USD",
    base: "USD",
    quote: "SOL",
  },
  mint1: translateAddress(ResynthClient.config.collateralMint),
  symbol1: "USDC",
  mint2: syntheticMintPDA(
    new PublicKey(ResynthClient.config.resynthProgramId),
    new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG")
  ),
  symbol2: "nSOL",
};

const ResynthContext = createContext<{
  client: ResynthClient;
  tokenSwap: TokenSwapClient;
  isClientLoading: boolean;
  oracle: string;
  oracleConfiguration: Oracle;
  mint1: PublicKey;
  mint2: PublicKey;
  symbol1: string;
  symbol2: string;
  setOracle: (oracle: string) => void;
  setMints: (
    mint1: PublicKey,
    symbol1: string,
    mint2: PublicKey,
    symbol2: string
  ) => void;
}>({
  client: {} as ResynthClient,
  tokenSwap: {} as TokenSwapClient,
  isClientLoading: false,
  oracle: defaultAccounts.oracle,
  oracleConfiguration: defaultAccounts.oracleConfiguration,
  mint1: defaultAccounts.mint1,
  mint2: defaultAccounts.mint2,
  symbol1: defaultAccounts.symbol1,
  symbol2: defaultAccounts.symbol2,
  setOracle: () => {},
  setMints: () => {},
});

export const ResynthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { network } = useNetwork();
  const { connection } = useConnection();
  const wallet = useWallet();
  const [{ client, tokenSwap }, setClient] = useState<{
    client: ResynthClient;
    tokenSwap: TokenSwapClient;
  }>({
    client: undefined as any,
    tokenSwap: undefined as any,
  });
  const [accounts, setAccounts] = useState<Accounts>(defaultAccounts);

  function updateOracle(oracle: string) {
    const oracles = client.config.oracles;
    assert(oracles);
    const oracleConfiguration = oracles[oracle];
    assert(oracleConfiguration);

    const collateralMint = new PublicKey(client.config.collateralMint);
    const syntheticMint = syntheticMintPDA(
      client.programId,
      oracleConfiguration.oracle
    );

    setAccounts((accounts) => {
      let mint1: PublicKey;
      let symbol1: string;
      let mint2: PublicKey;
      let symbol2: string;

      if (accounts.mint2.equals(collateralMint)) {
        mint2 = accounts.mint2;
        symbol2 = accounts.symbol2;
        mint1 = syntheticMint;
        symbol1 = oracleConfiguration.quote;
      } else if (accounts.mint1.equals(collateralMint)) {
        mint1 = accounts.mint1;
        symbol1 = accounts.symbol1;
        mint2 = syntheticMint;
        symbol2 = oracleConfiguration.quote;
      } else {
        mint1 = collateralMint;
        symbol1 = client.config.collateralSymbol;
        mint2 = syntheticMint;
        symbol2 = oracleConfiguration.quote;
      }

      return {
        oracle,
        oracleConfiguration,
        mint1,
        symbol1,
        mint2,
        symbol2,
      };
    });
  }

  function updateMints(
    mint1: PublicKey,
    symbol1: string,
    mint2: PublicKey,
    symbol2: string
  ) {
    setAccounts((accounts) => {
      return {
        oracle: accounts.oracle,
        oracleConfiguration: accounts.oracleConfiguration,
        mint1,
        symbol1,
        mint2,
        symbol2,
      };
    });
  }

  const [isClientLoading, setIsClientLoading] = useState(false);
  // After initial render, we can load async data from ResynthClient and reset
  useEffect(() => {
    try {
      setIsClientLoading(true);
      const client = new ResynthClient(network, connection, wallet as any);
      const tokenSwap = new TokenSwapClient(
        new Context(network, connection, wallet as any)
      );
      setClient({ client, tokenSwap });
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsClientLoading(false);
    }
  }, [connection, network, wallet]);

  return (
    <ResynthContext.Provider
      value={{
        client,
        tokenSwap,
        isClientLoading,
        oracle: accounts.oracle,
        oracleConfiguration: accounts.oracleConfiguration,
        mint1: accounts.mint1,
        mint2: accounts.mint2,
        symbol1: accounts.symbol1,
        symbol2: accounts.symbol2,
        setOracle: updateOracle,
        setMints: updateMints,
      }}
    >
      {children}
    </ResynthContext.Provider>
  );
};

export const useResynth = () => useContext(ResynthContext);
