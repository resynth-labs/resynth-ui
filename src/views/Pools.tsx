import { ReactNode, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useNetwork } from "../contexts/NetworkProvider";
import { useResynth } from "../contexts/ResynthProvider";
import { useModals } from "../contexts/ModalsProvider";
import { openTxInExplorer } from "../utils/explore";
import { notify } from "../utils/notify";
import { Flexbox } from "../components/Layout";
import { ExternalLink, UnknownToken } from "../components/Icons";
import { useBalance } from "../hooks/useBalance";
import { assert, isWalletSignTransactionError } from "../utils/errors";
import { SwapBuilder } from "../components/SwapBuilder/SwapBuilder";
import { useSwapPool } from "../hooks/useSwapPool";
import { AccentText } from "../components/Typography";
import { Transaction } from "@solana/web3.js";
import { getDepositSwapPoolTransaction } from "../actions/depositSwapPool";
import { sendTransaction } from "../actions/sendTransaction";
import { getInitializeSwapPoolTransaction } from "../actions/initializeSwapPool";

function logoUrl(oracle: string) {
  return `/img/tokens/${oracle}.png`;
}

// When images are added to the project, set to true or delete the variable
const IMAGES_EXIST = false;

export const Pools = () => {
  const { network } = useNetwork();
  const { connection } = useConnection();
  const wallet = useWallet();
  const { setIsWalletModalOpen } = useModals();
  const {
    client,
    isClientLoading,
    mint1,
    mint2,
    symbol1,
    symbol2,
    collateral,
    collateralConfiguration,
    setMints,
  } = useResynth();
  const inputBalance = useBalance(mint1);
  const outputBalance = useBalance(mint2);
  const { swapPool, isSwapPoolLoading } = useSwapPool();
  const swapPoolExists = !!swapPool || isSwapPoolLoading;
  const [isSendingTx, setIsSendingTx] = useState(false);
  const [wasTxError, setWasTxError] = useState(false);
  const oracles = client.config.oracles;
  assert(oracles);

  let poolInitializeNotice: ReactNode;
  if (!swapPoolExists) {
    poolInitializeNotice = (
      <AccentText className="text-center w-[100%]">
        A new pool will be initialized using your deposit.
      </AccentText>
    );
  }

  const tokenOptions = useMemo(() => {
    return [
      [collateral],
      ...Object.entries(oracles).filter(([lable, oracle]) => oracle.active),
    ].map(([label]) => ({
      key: label,
      label: label,
      leftElement: IMAGES_EXIST ? (
        <img key={label} width="20px" src={logoUrl(label)} alt={label} />
      ) : (
        <UnknownToken key={label} size="20px" />
      ),
      // rightElement: (
      //   <AccentText key={label} size="xs">
      //     {bigIntToTokens(token.balance, token.configuration.decimals)}
      //   </AccentText>
      // ),
    }));
  }, [oracles]);

  // Token input values
  const token1Value = tokenOptions.find((option) => option.label === symbol1);
  const token2Value = tokenOptions.find((option) => option.label === symbol2);

  assert(token1Value);
  assert(token2Value);

  // Swap type and amounts in/out
  const [amountToken1, setAmountToken1] = useState("0");
  const [amountToken2, setAmountToken2] = useState("0");

  const inputTokenLabel = "Input collateral";
  const outputTokenLabel = "Input Synthetic";

  const inputLabel = "Collateral";
  const outputLabel = "Synthetic";

  const inputTokenOptions = tokenOptions;
  const outputTokenOptions = tokenOptions;

  const inputToken = token1Value.label;
  const outputToken = token2Value.label;

  const inputValue = token1Value;
  const outputValue = token2Value;

  const amountIn = amountToken1;
  const amountOut = amountToken2;

  const maxAmountIn = !inputBalance.isLoadingBalance
    ? inputBalance.balance
    : +amountIn;
  const maxAmountOut = !outputBalance.isLoadingBalance
    ? outputBalance.balance
    : +amountOut;

  const balanceInLabel =
    +amountIn === maxAmountIn ? undefined : inputBalance.balanceString;
  const balanceOutLabel =
    +amountOut === maxAmountOut ? undefined : outputBalance.balanceString;

  const inputTokenDisabled = isSendingTx || isClientLoading;
  const outputTokenDisabled = isSendingTx || isClientLoading;

  const inputDisabled = !inputToken || isSendingTx || isClientLoading;
  const outputDisabled = !outputToken || isSendingTx || isClientLoading;

  const submitLabel = wallet.connected
    ? isSendingTx
      ? "Supplying..."
      : "Supply"
    : "Connect wallet";

  const bothAmountsEmpty = !(+amountIn > 0) && !(+amountOut > 0);
  const submitDisabled =
    isClientLoading ||
    isSendingTx ||
    (wallet.connected && (!inputToken || !outputToken || bothAmountsEmpty));

  const switchInputOutputElement = <p style={{ lineHeight: "16.88px" }}>+</p>;

  const setInputToken = (symbol: string) => {
    setMints(symbol, symbol2);
  };
  const setOutputToken = (symbol: string) => {
    setMints(symbol1, symbol);
  };

  const setAmountIn = (amount: string) => {
    setAmountToken1(amount);
    // set
  };
  const setAmountOut = (amount: string) => {
    setAmountToken2(amount);
  };

  // Reset all swap data
  const resetSwapData = () => {
    setAmountToken1("");
    setAmountToken2("");
  };

  useEffect(() => {
    setWasTxError(false);
  }, [amountIn, amountOut, isSendingTx]);

  // Submit swap transaction
  const submitSwap = async () => {
    if (isClientLoading || isSendingTx) {
      return;
    }

    if (!wallet.connected || !wallet.publicKey || !wallet.signTransaction) {
      setIsWalletModalOpen(true);
      return;
    }

    setIsSendingTx(true);
    const notificationId = notify({
      content: "Sending transaction...",
      type: "loading",
    });

    let cancelled = false;
    let txId = "";
    try {
      let transaction: Transaction;
      let lastValidBlockHeight: number;
      if (!swapPoolExists) {
        ({ transaction, lastValidBlockHeight } =
          await getInitializeSwapPoolTransaction(
            client,
            +amountIn,
            +amountOut,
            mint1,
            mint2,
            inputBalance.balanceAddress,
            outputBalance.balanceAddress
          ));
      } else {
        ({ transaction, lastValidBlockHeight } =
          await getDepositSwapPoolTransaction(
            client,
            +amountIn,
            +amountOut,
            mint1,
            mint2,
            inputBalance.balanceAddress,
            outputBalance.balanceAddress
          ));
      }

      const signedTransaction = await wallet.signTransaction(transaction);

      txId = await sendTransaction(
        connection,
        signedTransaction,
        lastValidBlockHeight
      );
    } catch (err) {
      if (isWalletSignTransactionError(err)) {
        cancelled = true;
      } else {
        console.error(err);
      }
    }

    setIsSendingTx(false);
    notify({
      id: notificationId,
      content: txId ? (
        <Flexbox
          alignItems="center"
          onClick={() => openTxInExplorer(txId, network)}
        >
          Your deposit of {parseFloat(amountIn).toFixed(2)} {inputToken} ⇄{" "}
          {parseFloat(amountOut).toFixed(2)} {outputToken} was successful.
          <ExternalLink color="base" />
        </Flexbox>
      ) : cancelled ? (
        "Your deposit has been cancelled."
      ) : (
        "There was an error processing your deposit."
      ),
      type: txId ? "success" : "error",
      style: txId ? { cursor: "pointer" } : undefined,
    });

    if (txId) {
      resetSwapData();
    } else if (!cancelled) {
      setWasTxError(true);
    }
  };

  return (
    <SwapBuilder
      // input
      inputTokenLabel={inputTokenLabel}
      inputValue={inputValue}
      inputTokenOptions={inputTokenOptions}
      setInputToken={setInputToken}
      inputTokenDisabled={inputTokenDisabled}
      inputLabel={inputLabel}
      balanceInLabel={balanceInLabel}
      amountIn={amountIn}
      maxAmountIn={maxAmountIn}
      setAmountIn={setAmountIn}
      inputDisabled={inputDisabled}
      // output
      outputTokenLabel={outputTokenLabel}
      outputValue={outputValue}
      outputTokenOptions={outputTokenOptions}
      setOutputToken={setOutputToken}
      outputTokenDisabled={outputTokenDisabled}
      outputLabel={outputLabel}
      balanceOutLabel={balanceOutLabel}
      amountOut={amountOut}
      maxAmountOut={maxAmountOut}
      setAmountOut={setAmountOut}
      outputDisabled={outputDisabled}
      // submit
      submitLabel={submitLabel}
      submitSwap={submitSwap}
      isClientLoading={isClientLoading}
      submitDisabled={submitDisabled}
      // misc
      wasTxError={wasTxError}
      switchInputOutputDisabled={true}
      switchInputOutputElement={switchInputOutputElement}
      switchInputOutput={() => {}}
      slippageElement={poolInitializeNotice}
    />
  );
};
