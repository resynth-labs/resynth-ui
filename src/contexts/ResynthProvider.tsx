import { createContext, useContext, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Context, Oracle, ResynthClient } from "@resynth/resynth-sdk";

import { useNetwork } from "./NetworkProvider";
import { assert } from "../utils/errors";

const ResynthContext = createContext<{
  client: ResynthClient;
  isClientLoading: boolean;
  oracle: string;
  oracleConfiguration: Oracle;
  setOracle: (oracle: string) => void;
}>({
  client: {} as ResynthClient,
  isClientLoading: false,
  oracle: "nSOL",
  oracleConfiguration: {
    class: "Crypto",
    oracle: "H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG",
    pair: "SOL/USD",
    base: "USD",
    quote: "SOL",
  },
  setOracle: () => { },
});

export const ResynthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { network } = useNetwork();
  const { connection } = useConnection();
  const wallet = useWallet();
  const [client, setClient] = useState(new ResynthClient(new Context(network, connection)));
  const [oracle, setOracle] = useState<{
    oracle: string;
    oracleConfiguration: Oracle;
  }>({
    oracle: "nSOL",
    oracleConfiguration: {
      class: "Crypto",
      oracle: "H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG",
      pair: "SOL/USD",
      base: "USD",
      quote: "SOL",
    },
  });

  function updateOracle(oracle: string) {
    const oracles = client.config.oracles;
    assert(oracles);
    const oracleConfiguration = oracles[oracle];
    assert(oracleConfiguration);
    setOracle({ oracle, oracleConfiguration });
  }

  const [isClientLoading, setIsClientLoading] = useState(false);
  // After initial render, we can load async data from ResynthClient and reset
  useEffect(() => {
    try {
      setIsClientLoading(true);
      const resynth = new ResynthClient(new Context(network, connection, wallet as any));
      setClient(resynth);
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
        isClientLoading,
        oracle: oracle.oracle,
        oracleConfiguration: oracle.oracleConfiguration,
        setOracle: updateOracle,
      }}
    >
      {children}
    </ResynthContext.Provider>
  );
};

export const useResynth = () => useContext(ResynthContext);
