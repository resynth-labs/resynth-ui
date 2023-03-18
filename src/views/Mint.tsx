import { useMemo, useState } from "react";
import { useTheme } from "styled-components";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useNetwork } from "../contexts/NetworkProvider";
import { useResynth } from "../contexts/ResynthProvider";
import { useModals } from "../contexts/ModalsProvider";
import { openTxInExplorer } from "../utils/explore";
import { notify } from "../utils/notify";
import { Flexbox } from "../components/Layout";
import { ExternalLink, UnknownToken } from "../components/Icons";
import { useCollateralBalance, useSynthBalance } from "../hooks/useBalance";
import { assert } from "../utils/errors";
import { getMintSyntheticAssetTransaction } from "../actions/mintSyntheticAsset";
import { SwapBuilder } from "../components/SwapBuilder/SwapBuilder";
import { sendTransaction } from "../actions/sendTransaction";
import { BN, translateAddress } from "@coral-xyz/anchor";

function logoUrl(oracle: string) {
  return `/img/tokens/${oracle}.png`;
}

// When images are added to the project, set to true or delete the variable
const IMAGES_EXIST = false;

export const Mint = () => {
  const theme = useTheme();
  const { network } = useNetwork();
  const { connection } = useConnection();
  const wallet = useWallet();
  const { setIsWalletModalOpen } = useModals();
  const {
    client,
    isClientLoading,
    oracle,
    collateral,
    collateralConfiguration,
    setOracle,
  } = useResynth();
  const collateralBalance = useCollateralBalance();
  const syntheticBalance = useSynthBalance();
  const [isSendingTx, setIsSendingTx] = useState(false);
  const [wasTxError, setWasTxError] = useState(false);
  const { oracles } = client.config;
  assert(oracles);

  // Collateral input value
  const collateralValue = useMemo(
    () => ({
      key: collateral,
      label: collateral,
      leftElement: IMAGES_EXIST ? (
        <img
          key={collateral}
          width="20px"
          src={logoUrl(collateral)}
          alt={collateral}
        />
      ) : (
        <UnknownToken key={collateral} size="20px" />
      ),
      // rightElement: (
      //   <AccentText key={label} size="xs">
      //     {bigIntToTokens(token.balance, token.configuration.decimals)}
      //   </AccentText>
      // ),
    }),
    []
  );

  // Token options / input & output tokens
  const collateralOptions = useMemo(() => [collateralValue], []);
  const syntheticOptions = useMemo(
    () =>
      Object.keys(oracles).map((label) => ({
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
      })),
    []
  );

  const syntheticValue = syntheticOptions.find(
    (option) => option.label === oracle
  );

  assert(collateralValue);
  assert(syntheticValue);

  // Swap type and amounts in/out
  const [swapType, setSwapType] = useState<"mint" | "burn">("mint");
  const [amountCollateral, setAmountCollateral] = useState("0");
  const [amountSynthetic, setAmountSynthetic] = useState("0");

  const inputTokenLabel =
    swapType === "mint" ? "Deposit Collateral" : "Burn Synthetic";
  const outputTokenLabel =
    swapType === "mint" ? "Mint Synthetic" : "Withdraw Collateral";

  const inputLabel = "Amount in";
  const outputLabel = "Amount out";

  const inputTokenOptions =
    swapType === "mint" ? collateralOptions : syntheticOptions;
  const outputTokenOptions =
    swapType === "mint" ? syntheticOptions : collateralOptions;

  const inputToken =
    swapType === "mint" ? collateralValue.label : syntheticValue.label;
  const outputToken =
    swapType === "mint" ? syntheticValue.label : collateralValue.label;

  const inputValue = swapType === "mint" ? collateralValue : syntheticValue;
  const outputValue = swapType === "mint" ? syntheticValue : collateralValue;

  const amountIn = swapType === "mint" ? amountCollateral : amountSynthetic;
  const amountOut = swapType === "mint" ? amountSynthetic : amountCollateral;

  const maxAmountIn = !collateralBalance.isLoadingBalance
    ? collateralBalance.balance
    : +amountIn;
  // FIXME: use margin accounting to find max amount
  const maxAmountOut = !syntheticBalance.isLoadingBalance
    ? Number.MAX_SAFE_INTEGER
    : +amountOut;

  const balanceInLabel =
    +amountIn === maxAmountIn ? undefined : collateralBalance.balanceString;
  // FIXME: use margin accounting to find max amount
  // const balanceOutLabel =
  //   +amountOut === maxAmountOut
  //     ? undefined
  //     : `Max: ${maxAmountOut.toLocaleString("fullwide", {
  //         maximumFractionDigits: 1,
  //       })}`;
  const balanceOutLabel =
    +amountOut === maxAmountOut ? undefined : syntheticBalance.balanceString;

  const inputTokenDisabled =
    swapType === "mint" || isSendingTx || isClientLoading;
  const outputTokenDisabled =
    swapType === "burn" || isSendingTx || isClientLoading;

  const inputDisabled = !inputToken || isSendingTx || isClientLoading;
  const outputDisabled = !outputToken || isSendingTx || isClientLoading;

  const submitLabel = wallet.connected
    ? swapType === "mint"
      ? isSendingTx
        ? "Minting..."
        : "Mint"
      : isSendingTx
      ? "Burning..."
      : "Burn"
    : "Connect wallet";

  const submitDisabled =
    isClientLoading ||
    isSendingTx ||
    (wallet.connected &&
      (!inputToken || !amountIn || !outputToken || !amountOut));

  const setInputToken = (token: string) => {
    assert(swapType === "mint", "Can't set collateral token");
    setOracle(token);
  };

  const setOutputToken = (token: string) => {
    assert(swapType === "burn", "Can't set collateral token");
    setOracle(token);
  };

  const setAmountIn = (amount: string) => {
    swapType === "mint"
      ? setAmountCollateral(amount)
      : setAmountSynthetic(amount);
  };

  const setAmountOut = (amount: string) => {
    swapType === "mint"
      ? setAmountSynthetic(amount)
      : setAmountCollateral(amount);
  };

  // Reset all swap data
  const resetSwapData = () => {
    setAmountCollateral("");
    setAmountSynthetic("");
  };

  const switchInputOutput = () => {
    setSwapType((swapType) => (swapType === "mint" ? "burn" : "mint"));
  };

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

    let txId = "";
    try {
      const { transaction, lastValidBlockHeight } =
        await getMintSyntheticAssetTransaction(
          swapType,
          client,
          oracle,
          translateAddress(collateralConfiguration.mint),
          new BN(+amountCollateral * 10 ** collateralConfiguration.decimals),
          +amountSynthetic,
          collateralBalance.balanceAddress,
          syntheticBalance.balanceAddress
        );

      const signedTransaction = await wallet.signTransaction(transaction);

      txId = await sendTransaction(
        connection,
        signedTransaction,
        lastValidBlockHeight
      );
    } catch (err) {
      console.error(err);
    }

    setIsSendingTx(false);
    notify({
      id: notificationId,
      content: txId ? (
        <Flexbox
          alignItems="center"
          onClick={() => openTxInExplorer(txId, network)}
        >
          Your swap of {parseFloat(amountIn).toFixed(2)} {inputToken} ⇄{" "}
          {parseFloat(amountOut).toFixed(2)} {outputToken} was successful.
          <ExternalLink color="base" />
        </Flexbox>
      ) : (
        "There was an error processing your swap."
      ),
      type: txId ? "success" : "error",
      style: txId ? { cursor: "pointer" } : undefined,
    });

    if (txId) {
      resetSwapData();
    } else {
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
      switchInputOutputDisabled={false}
      switchInputOutput={switchInputOutput}
    />
  );
};
