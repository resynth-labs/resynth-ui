import { createContext, useContext, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Context, ResynthClient } from "@resynth/resynth-sdk";

import { useNetwork } from "./NetworkProvider";

const ResynthContext = createContext<{
  client: ResynthClient;
  isClientLoading: boolean;
}>({ client: {} as ResynthClient, isClientLoading: false });

export const ResynthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { network } = useNetwork();
  const { connection } = useConnection();
  const wallet = useWallet();
  const [client, setClient] = useState(new ResynthClient(new Context(network, connection)));

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
    <ResynthContext.Provider value={{ client, isClientLoading }}>
      {children}
    </ResynthContext.Provider>
  );
};

export const useResynth = () => useContext(ResynthContext);
