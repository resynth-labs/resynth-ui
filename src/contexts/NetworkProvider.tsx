import { createContext, useContext } from "react";

import { useLocalStorage } from "../hooks/useLocalStorage";

export type Network = "devnet" | "localnet" | "mainnet";
export const networkOptions: Network[] = ["devnet"] as Network[];

const NetworkContext = createContext<{
  network: Network;
  setNetwork: (network: Network) => void;
}>({ network: "devnet", setNetwork: () => {} });

export const NetworkProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [network, setNetwork] = useLocalStorage<Network>(
    "preferredNetwork",
    "devnet"
  );

  return (
    <NetworkContext.Provider
      value={{
        network,
        setNetwork,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
