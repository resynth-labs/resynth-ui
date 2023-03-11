import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Context,
  OracleConfig,
  ResynthClient,
  syntheticMintPDA,
  TokenConfig,
  TokenSwapClient,
} from "@resynth/resynth-sdk";
import { useNetwork } from "./NetworkProvider";
import { assert } from "../utils/errors";
import { PublicKey } from "@solana/web3.js";

/** Accounts of interest to the UI */
interface Accounts {
  oracle: string;
  oracleConfiguration: OracleConfig;
  collateral: string;
  collateralConfiguration: TokenConfig;

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
  collateral: "USDC",
  collateralConfiguration: {
    mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    decimals: 6,
  },
  mint1: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
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
  oracleConfiguration: OracleConfig;
  collateral: string;
  collateralConfiguration: TokenConfig;
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
  collateral: defaultAccounts.collateral,
  collateralConfiguration: defaultAccounts.collateralConfiguration,
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
  const { client, tokenSwap } = useMemo(() => {
    const context = new Context(network, connection, wallet as any);
    const client = new ResynthClient(context);
    const tokenSwap = new TokenSwapClient(context);
    return { client, tokenSwap };
  }, [connection, network, wallet]);
  const [accounts, setAccounts] = useState<Accounts>(defaultAccounts);

  // FIXME! Allow updating collateral in the same way as the oracle
  function updateOracle(oracle: string) {
    const oracles = client.config.oracles;
    assert(oracles);
    const oracleConfiguration = oracles[oracle];
    assert(oracleConfiguration);

    const syntheticMint = syntheticMintPDA(
      client.programId,
      oracleConfiguration.oracle
    );
    const syntheticSymbol = oracleConfiguration.quote;

    setAccounts((accounts) => {
      const collateralMint = defaultAccounts.mint1;
      const collateralSymbol = defaultAccounts.symbol1;

      let mint1: PublicKey;
      let symbol1: string;
      let mint2: PublicKey;
      let symbol2: string;

      if (accounts.mint2.equals(collateralMint)) {
        mint2 = accounts.mint2;
        symbol2 = accounts.symbol2;
        mint1 = syntheticMint;
        symbol1 = syntheticSymbol;
      } else if (accounts.mint1.equals(collateralMint)) {
        mint1 = accounts.mint1;
        symbol1 = accounts.symbol1;
        mint2 = syntheticMint;
        symbol2 = syntheticSymbol;
      } else {
        mint1 = collateralMint;
        symbol1 = collateralSymbol;
        mint2 = syntheticMint;
        symbol2 = syntheticSymbol;
      }

      return {
        oracle,
        oracleConfiguration,
        collateral: accounts.collateral,
        collateralConfiguration: accounts.collateralConfiguration,

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
        collateral: accounts.collateral,
        collateralConfiguration: accounts.collateralConfiguration,

        mint1,
        symbol1,
        mint2,
        symbol2,
      };
    });
  }

  return (
    <ResynthContext.Provider
      value={{
        client,
        tokenSwap,
        isClientLoading: false,
        oracle: accounts.oracle,
        oracleConfiguration: accounts.oracleConfiguration,
        collateral: accounts.collateral,
        collateralConfiguration: accounts.collateralConfiguration,
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
