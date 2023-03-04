import { useMemo, useState } from "react";
import { useTheme } from "styled-components";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useNetwork } from "../contexts/NetworkProvider";
import { useResynth } from "../contexts/ResynthProvider";
import { useModals } from "../contexts/ModalsProvider";
import { openTxInExplorer } from "../utils/explore";
import { notify } from "../utils/notify";
import { Flexbox, Spacer } from "../components/Layout";
import { Input, Select, SelectOption } from "../components/Fields";
import { Button, PrimaryButton } from "../components/Buttons";
import { ExternalLink, SwapArrows, UnknownToken } from "../components/Icons";
import { useCollateralBalance, useSynthBalance } from "../hooks/useBalance";
import { Oracle } from "@resynth/resynth-sdk";
import { assert } from "../utils/errors";
import { SwapContainer } from "../components/Containers/Swap/SwapContainer";
import { Disclaimer } from "../components/Disclaimer/Disclaimer";
import {
  getMintSyntheticAssetTransaction,
  sendMintSyntheticTransaction,
} from "../actions/mintSyntheticAsset";

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
  const { client, isClientLoading, oracle } = useResynth();
  const collateralBalance = useCollateralBalance();
  const syntheticBalance = useSynthBalance();
  const [isSendingTx, setIsSendingTx] = useState(false);
  const [wasTxError, setWasTxError] = useState(false);
  const oracles = client.config.oracles;
  assert(oracles);

  // Collateral input value
  const collateralValue = useMemo(
    () => ({
      key: "USDC",
      label: "USDC",
      leftElement: IMAGES_EXIST ? (
        <img key={"USDC"} width="20px" src={logoUrl("USDC")} alt={"USDC"} />
      ) : (
        <UnknownToken key={"USDC"} size="20px" />
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
      Object.entries(oracles).map(([label, oracle]: [string, Oracle]) => ({
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

  const [syntheticToken, setSyntheticToken] = useState("nSOL");
  const syntheticValue = syntheticOptions.find(
    (option) => option.label === syntheticToken
  );

  assert(collateralValue);
  assert(syntheticValue);

  // Swap type and amounts in/out
  const [swapType, setSwapType] = useState<"mint" | "burn">("mint");
  const [amountCollateral, setAmountCollateral] = useState("0");
  const [amountSynthetic, setAmountSynthetic] = useState("0");

  const inputLabel =
    swapType === "mint" ? "Input collateral" : "Input Synthetic";
  const outputLabel =
    swapType === "mint" ? "Output Synthetic" : "Output Collateral";

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

  const maxAmountIn = Number.MAX_SAFE_INTEGER;
  const maxAmountOut = Number.MAX_SAFE_INTEGER;

  const setInputToken = (token: string) => {
    assert(swapType === "mint", "Can't set collateral token");
    setSyntheticToken(token);
  };

  const setOutputToken = (token: string) => {
    assert(swapType === "burn", "Can't set collateral token");
    setSyntheticToken(token);
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
    setSyntheticToken("nSOL");
    setAmountSynthetic("");
    console.log("reset");
  };

  // Submit swap transaction
  const submitSwap = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
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
          swapType === "mint",
          client,
          oracle,
          +amountCollateral,
          +amountSynthetic,
          collateralBalance.balanceAddress,
          syntheticBalance.balanceAddress
        );

      const signedTransaction = await wallet.signTransaction(transaction);

      txId = await sendMintSyntheticTransaction(
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
    <>
      <Disclaimer />
      <SwapContainer width="95%" alignItems="center" flexColumn>
        {/** INPUT DATA **/}
        <Flexbox
          width="100%"
          justifyContent="space-between"
          alignItems="center"
        >
          <Select
            width="40%"
            label={inputLabel}
            value={inputValue}
            options={inputTokenOptions}
            noOptionsMessage="No input tokens for this market"
            onChange={(token: SelectOption) => setInputToken(token.label)}
            needsValue={wallet.connected && !inputToken}
            error={wasTxError}
            disabled={swapType === "mint" || isSendingTx || isClientLoading}
          />
          <Input
            width="57.5%"
            type="number"
            label="Amount in"
            value={amountIn}
            max={maxAmountIn}
            maxButton={{
              isActive: !!amountIn && Number(amountIn) === maxAmountIn,
              onClick: () => setAmountIn(maxAmountIn.toString()),
            }}
            onChange={(amount: string) => {
              setAmountIn(amount);
            }}
            needsValue={Boolean(inputToken && !amountIn)}
            error={wasTxError}
            disabled={!inputToken || isSendingTx || isClientLoading}
          />
        </Flexbox>

        {/** SWITCH DATA **/}
        <Flexbox marginY="base">
          <Button
            onClick={() => {
              setSwapType((swapType) =>
                swapType === "mint" ? "burn" : "mint"
              );
            }}
            disabled={isSendingTx || !inputToken || !outputToken}
          >
            <SwapArrows size={theme.font.size.lg} />
          </Button>
        </Flexbox>

        {/** OUTPUT DATA **/}
        <Flexbox
          width="100%"
          justifyContent="space-between"
          alignItems="center"
        >
          <Select
            width="40%"
            label={outputLabel}
            value={outputValue}
            options={outputTokenOptions}
            noOptionsMessage="No output tokens for this market"
            onChange={(token: SelectOption) => setOutputToken(token.label)}
            needsValue={wallet.connected && !inputToken}
            error={wasTxError}
            disabled={swapType === "burn" || isSendingTx || isClientLoading}
          />
          <Input
            width="57.5%"
            type="number"
            label="Amount out"
            value={amountOut}
            max={maxAmountOut}
            maxButton={{
              isActive: !!amountOut && Number(amountOut) === maxAmountOut,
              onClick: () => setAmountOut(maxAmountOut.toString()),
            }}
            onChange={(amount: string) => setAmountOut(amount)}
            needsValue={Boolean(outputToken && !amountOut)}
            error={wasTxError}
            disabled={!outputToken || isSendingTx || isClientLoading}
          />
        </Flexbox>

        {/** SWAP BUTTON **/}
        <Spacer size="xl" />
        <PrimaryButton
          fullWidth
          label={
            wallet.connected
              ? isSendingTx
                ? "Swapping..."
                : "Swap"
              : "Connect wallet"
          }
          onClick={() => {
            if (isClientLoading || isSendingTx) return;

            if (wallet.connected) {
              submitSwap();
            } else {
              setIsWalletModalOpen(true);
            }
          }}
          isLoading={isClientLoading}
          disabled={
            isClientLoading ||
            isSendingTx ||
            (wallet.connected &&
              (!inputToken || !amountIn || !outputToken || !amountOut))
          }
        />
      </SwapContainer>
    </>
  );
};
