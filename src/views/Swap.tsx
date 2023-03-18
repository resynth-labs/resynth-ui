import { useEffect, useMemo, useState } from "react";
import styled, { useTheme } from "styled-components";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useNetwork } from "../contexts/NetworkProvider";
import { useResynth } from "../contexts/ResynthProvider";
import { useModals } from "../contexts/ModalsProvider";
import { openTxInExplorer } from "../utils/explore";
import { notify } from "../utils/notify";
import { color } from "../styles/mixins";
import { Flexbox, Spacer } from "../components/Layout";
import { AccentText, BodyText } from "../components/Typography";
import { Button } from "../components/Buttons";
import { ExternalLink, UnknownToken } from "../components/Icons";
import { PublicKey } from "@solana/web3.js";
import { useBalance } from "../hooks/useBalance";
import { assert } from "../utils/errors";
import { syntheticMintPDA, SYNTH_DECIMALS } from "@resynth/resynth-sdk";
import { BN, translateAddress } from "@coral-xyz/anchor";
import { getSwapTransaction } from "../actions/swap";
import { sendTransaction } from "../actions/sendTransaction";
import { useCachedBlockhash } from "../hooks/useCachedBlockhash";
import { useSwapPool } from "../hooks/useSwapPool";
import { SwapBuilder } from "../components/SwapBuilder/SwapBuilder";

const SlippageButton = styled(Button)<{ isActive: boolean }>`
  width: 75px;
  height: 30px;
  color: ${color("base")};
  background: ${color("accent")};
  border-radius: 50px;

  ${({ isActive, theme }) => {
    if (!isActive) return "";

    return `
      margin-top: -1px;
      margin-bottom: 1px;
      background: ${theme.palette.primary};
      box-shadow: ${theme.shadow.base};
    `;
  }}
`;

interface Token {
  balance: number;

  configuration: {
    mint: PublicKey;
    symbol: string;
    logoUrl?: string;
    decimals: number;
  };
}

export const Swap = () => {
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
    mint1,
    symbol1,
    mint2,
    symbol2,
    setMints,
  } = useResynth();
  const { swapPool, swapWithoutFees } = useSwapPool();
  const inputBalance = useBalance(mint1);
  const outputBalance = useBalance(mint2);
  const getBlockhash = useCachedBlockhash();
  const [isSendingTx, setIsSendingTx] = useState(false);
  const [wasTxError, setWasTxError] = useState(false);
  const { oracles, tokens } = client.config;
  assert(oracles);

  function symbolToToken(symbol: string): Token {
    if (symbol in oracles) {
      const oracle = oracles[symbol];
      return {
        balance: 0,
        configuration: {
          mint: syntheticMintPDA(client.programId, oracle.oracle),
          symbol: symbol,
          logoUrl: undefined,
          decimals: SYNTH_DECIMALS,
        },
      };
    } else {
      assert(symbol in tokens);
      const token = tokens[symbol];
      return {
        balance: 0,
        configuration: {
          mint: translateAddress(token.mint),
          symbol: symbol,
          logoUrl: undefined,
          decimals: token.decimals,
        },
      };
    }
  }

  const tokensItems = useMemo(
    () => [collateral, ...Object.keys(oracles)].map(symbolToToken),
    [oracles]
  );

  // Token options / input & output tokens
  const tokenOptions = useMemo(
    () =>
      tokensItems.map((token: Token) => ({
        key: token.configuration.mint.toBase58(),
        label: token.configuration.symbol,
        leftElement: token.configuration.logoUrl ? (
          <img
            key={token.configuration.mint.toBase58()}
            width="20px"
            src={token.configuration.logoUrl}
            alt={token.configuration.symbol}
          />
        ) : (
          <UnknownToken key={token.configuration.mint.toBase58()} size="20px" />
        ),
        rightElement: (
          <AccentText key={token.configuration.mint.toBase58()} size="xs">
            {token.balance}
          </AccentText>
        ),
      })),
    [tokensItems]
  );

  const inputToken = useMemo(() => {
    const inputToken = tokensItems.find((token) =>
      token.configuration.mint.equals(mint1)
    );
    assert(inputToken);
    return inputToken;
  }, [tokensItems, mint1.toBase58()]);
  const outputToken = useMemo(() => {
    const outputToken = tokensItems.find((token) =>
      token.configuration.mint.equals(mint2)
    );
    assert(outputToken);
    return outputToken;
  }, [tokensItems, mint2.toBase58()]);

  const inputValue = tokenOptions.filter(
    (option: any) => option.key === inputToken?.configuration.mint.toBase58()
  )[0];
  const outputValue = tokenOptions.filter(
    (option: any) => option.key === outputToken?.configuration.mint.toBase58()
  )[0];

  // Swap type and amounts in/out
  // const [swapType, setSwapType] = useState<"exactIn" | "exactOut">("exactIn");
  const [slippage, setSlippage] = useState<number | undefined>(0.005);
  const [amountIn, setAmountIn] = useState("0");
  const [amountOut, setAmountOut] = useState("0");

  const inputTokenLabel = "Input token";
  const outputTokenLabel = "Output token";

  // Maximum amounts in/out
  const maxAmountIn = inputBalance.balance;
  // FIXME: use swap accounting to find max amount. Also a price impact warning like uni v3
  /*
  const maxAmountOut =
    market && inputToken && outputToken
      ? Number(
          market
            .getAmountOut(
              inputToken.configuration.symbol,
              Number(amountIn),
              outputToken.configuration.symbol
            )
            .toFixed(outputToken.configuration.decimals)
        )
      : 0;
  */
  const maxAmountOut = getAmountOut(inputBalance.balance.toString()) ?? 0;

  const balanceInLabel =
    +amountIn === maxAmountIn ? undefined : inputBalance.balanceString;
  const balanceOutLabel =
    +amountOut === maxAmountOut ? undefined : outputBalance.balanceString;

  const inputLabel = "Amount in";
  const outputLabel = "Amount out";

  const inputTokenDisabled = !inputToken || isSendingTx || isClientLoading;
  const outputTokenDisabled = !outputToken || isSendingTx || isClientLoading;

  const inputDisabled = !inputToken || isSendingTx || isClientLoading;
  const outputDisabled = !outputToken || isSendingTx || isClientLoading;

  const submitLabel = wallet.connected
    ? isSendingTx
      ? "Swapping..."
      : "Swap"
    : "Connect wallet";
  const switchInputOutputDisabled = isSendingTx || !inputToken || !outputToken;
  const submitDisabled =
    isClientLoading ||
    isSendingTx ||
    (wallet.connected &&
      (!inputToken || !amountIn || !outputToken || !amountOut));

  function setInputToken(token: string) {
    setMints(token, symbol2);
  }
  function setOutputToken(token: string) {
    setMints(symbol1, token);
  }

  function setInputAmount(amount: string) {
    setAmountIn(amount);

    const outputAmount = getAmountOut(amount);
    if (outputAmount) {
      setAmountOut(
        outputAmount.toLocaleString("fullwide", {
          useGrouping: false,
        })
      );
    }
  }

  function setOutputAmount(amount: string) {
    setAmountOut(amount);
  }

  function getAmountOut(amount: string) {
    if (!swapPool) {
      return;
    }

    const mint = translateAddress(mint1);
    const inputDecimals = mint.equals(swapPool.mintA)
      ? swapPool.mintADecimals
      : swapPool.mintBDecimals;
    const outputDecimals = mint.equals(swapPool.mintA)
      ? swapPool.mintBDecimals
      : swapPool.mintADecimals;
    const inputAmount = new BN(+amount * 10 ** inputDecimals);
    const result = swapWithoutFees(inputAmount, mint);
    if (!result) {
      return;
    }
    let outputAmount =
      result.destinationAmountSwapped.toNumber() / 10 ** outputDecimals;
    if (slippage !== undefined) {
      const slippageCoefficient = 1 - slippage;
      outputAmount *= slippageCoefficient;
    }
    return outputAmount;
  }

  // Reset all swap data
  const resetSwapData = () => {
    console.log("Reset");
    setAmountIn("");
    setAmountOut("");
  };

  function switchInputOutput() {
    setMints(outputToken.configuration.symbol, inputToken.configuration.symbol);
    setAmountIn(amountOut);
    setAmountOut(amountIn);
  }

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
      const fromLamports = +amountIn * 10 ** inputBalance.decimals;
      const toLamports = +amountOut * 10 ** outputBalance.decimals;

      const { blockhash, lastValidBlockHeight } = await getBlockhash();

      const tx = await getSwapTransaction(
        client,
        inputToken.configuration.mint,
        outputToken.configuration.mint,
        inputBalance.balanceAddress,
        outputBalance.exists ? outputBalance.balanceAddress : undefined,
        fromLamports,
        toLamports,
        blockhash,
        lastValidBlockHeight
      );

      const signed = await wallet.signTransaction(tx);

      txId = await sendTransaction(connection, signed, lastValidBlockHeight);
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
          Your swap of {parseFloat(amountIn).toFixed(2)}{" "}
          {inputToken.configuration.symbol} ⇄ {parseFloat(amountOut).toFixed(2)}{" "}
          {outputToken.configuration.symbol} was successful.
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

  // Update amounts in/out on change to their compliment
  useEffect(() => {
    // Amount out
    /*
    if (swapType === "exactIn" && inputToken && amountIn) {
      setAmountOut("0");
      setAmountOut(
        market
          .getAmountOut(
            inputToken.configuration.symbol,
            Number(amountIn),
            outputToken.configuration.symbol
          )
          .toFixed(outputToken.configuration.decimals)
      );
    }
    */

    // Amount in
    /*
    if (swapType === "exactOut" && outputToken && amountOut) {
      setAmountIn("0");
      setAmountIn(
        market
          .getAmountIn(
            inputToken.configuration.symbol,
            outputToken.configuration.symbol,
            Number(amountOut)
          )
          .toFixed(inputToken.configuration.decimals)
      );
    }
    */

    setWasTxError(false);
  }, [amountIn, amountOut]);

  const slippageElement = (
    <Flexbox width="95%" flexColumn marginY="xl">
      <AccentText>Slippage</AccentText>
      <Spacer />
      <Flexbox width="100%" alignItems="center" justifyContent="space-between">
        {[0.001, 0.005, 0.0075, 0.01].map((slipPercentage) => (
          <SlippageButton
            onClick={() => setSlippage(slipPercentage)}
            isActive={slippage === slipPercentage}
            key={slipPercentage}
          >
            <BodyText size="xs" weight="bold">
              {slipPercentage * 100}%
            </BodyText>
          </SlippageButton>
        ))}
        <SlippageButton
          onClick={() => setSlippage(undefined)}
          isActive={slippage === undefined}
        >
          <BodyText size="lg" weight="bold">
            ∞
          </BodyText>
        </SlippageButton>
      </Flexbox>
    </Flexbox>
  );

  return (
    <SwapBuilder
      // input
      inputTokenLabel={inputTokenLabel}
      inputValue={inputValue}
      inputTokenOptions={tokenOptions}
      setInputToken={setInputToken}
      inputTokenDisabled={inputTokenDisabled}
      inputLabel={inputLabel}
      balanceInLabel={balanceInLabel}
      amountIn={amountIn}
      maxAmountIn={maxAmountIn}
      setAmountIn={setInputAmount}
      inputDisabled={inputDisabled}
      // output
      outputTokenLabel={outputTokenLabel}
      outputValue={outputValue}
      outputTokenOptions={tokenOptions}
      setOutputToken={setOutputToken}
      outputTokenDisabled={outputTokenDisabled}
      outputLabel={outputLabel}
      balanceOutLabel={balanceOutLabel}
      amountOut={amountOut}
      maxAmountOut={maxAmountOut}
      maxButtonHidden={true}
      setAmountOut={setOutputAmount}
      outputDisabled={outputDisabled}
      // submit
      submitLabel={submitLabel}
      submitSwap={submitSwap}
      isClientLoading={isClientLoading}
      submitDisabled={submitDisabled}
      // misc
      wasTxError={wasTxError}
      switchInputOutputDisabled={switchInputOutputDisabled}
      switchInputOutput={switchInputOutput}
      slippageElement={slippageElement}
    />
  );
};
