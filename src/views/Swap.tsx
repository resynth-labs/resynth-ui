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
import { Input, Select, SelectOption } from "../components/Fields";
import { Button, PrimaryButton } from "../components/Buttons";
import { ExternalLink, SwapArrows, UnknownToken } from "../components/Icons";
import { PublicKey } from "@solana/web3.js";
import { SwapContainer } from "../components/Containers/Swap/SwapContainer";
import { Disclaimer } from "../components/Disclaimer/Disclaimer";
import { useBalance } from "../hooks/useBalance";
import { assert } from "../utils/errors";
import { syntheticMintPDA, SYNTH_DECIMALS } from "@resynth/resynth-sdk";
import { BN, translateAddress } from "@coral-xyz/anchor";
import { getSwapTransaction } from "../actions/swap";
import { sendTransaction } from "../actions/sendTransaction";
import { useCachedBlockhash } from "../hooks/useCachedBlockhash";
import { useSwapPool } from "../hooks/useSwapPool";

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
    collateralConfiguration,
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
  const oracles = client.config.oracles;
  assert(oracles);

  function symbolToToken(symbol: string): Token {
    const oracle = oracles![symbol];
    if (oracle) {
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
      return {
        balance: 0,
        configuration: {
          // FIXME: support other tokens
          mint: translateAddress(collateralConfiguration.mint),
          symbol: symbol,
          logoUrl: undefined,
          decimals: collateralConfiguration.decimals,
        },
      };
    }
  }

  const tokens = useMemo(
    () => [collateral, ...Object.keys(oracles)].map(symbolToToken),
    [oracles]
  );

  // Token options / input & output tokens
  const tokenOptions = useMemo(
    () =>
      tokens.map((token: Token) => ({
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
    [tokens]
  );

  const inputToken = tokens.find((token) =>
    token.configuration.mint.equals(mint1)
  );
  const outputToken = tokens.find((token) =>
    token.configuration.mint.equals(mint2)
  );
  assert(inputToken);
  assert(outputToken);

  // Swap type and amounts in/out
  // const [swapType, setSwapType] = useState<"exactIn" | "exactOut">("exactIn");
  const [slippage, setSlippage] = useState<number | undefined>(0.005);
  const [amountIn, setAmountIn] = useState("0");
  const [amountOut, setAmountOut] = useState("0");

  function setInputToken(token: SelectOption) {
    setMints(new PublicKey(token.key), token.label, mint2, symbol2);
  }
  function setOutputToken(token: SelectOption) {
    setMints(mint1, symbol1, new PublicKey(token.key), token.label);
  }

  function setInputAmount(amount: string) {
    setAmountIn(amount);

    const mint = translateAddress(mint1);
    if (swapPool) {
      const inputDecimals = mint.equals(swapPool.mintA)
        ? swapPool.mintADecimals
        : swapPool.mintBDecimals;
      const outputDecimals = mint.equals(swapPool.mintA)
        ? swapPool.mintBDecimals
        : swapPool.mintADecimals;
      const inputAmount = new BN(+amount * 10 ** inputDecimals);
      const result = swapWithoutFees(inputAmount, mint);
      if (result) {
        let outputAmount =
          result.destinationAmountSwapped.toNumber() / 10 ** outputDecimals;
        if (slippage) {
          const slippageCoefficient = 1 - slippage;
          outputAmount *= slippageCoefficient;
        }
        setOutputAmount(
          outputAmount.toLocaleString("fullwide", {
            useGrouping: false,
          })
        );
      }
    }
    // setSwapType("exactIn");
  }
  function setOutputAmount(amount: string) {
    setAmountOut(amount);
    // setSwapType("exactOut");
  }

  function switchTokens() {
    assert(inputToken);
    assert(outputToken);
    setMints(
      outputToken.configuration.mint,
      outputToken.configuration.symbol,
      inputToken.configuration.mint,
      inputToken.configuration.symbol
    );
    setAmountIn(amountOut);
    setAmountOut(amountIn);
  }

  // Maximum amounts in/out
  const maxAmountIn = inputToken?.balance ?? 0;
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
  const maxAmountOut = 0;

  // Reset all swap data
  const resetSwapData = () => {
    console.log("Reset");
    setAmountIn("");
    setAmountOut("");
  };

  // Submit swap transaction
  const submitSwap = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      return;
    }
    assert(inputToken);
    assert(outputToken);
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
            label="Input token"
            value={
              tokenOptions.filter(
                (option: any) =>
                  option.key === inputToken?.configuration.mint.toBase58()
              )[0]
            }
            options={tokenOptions}
            noOptionsMessage="No input tokens for this market"
            onChange={setInputToken}
            needsValue={wallet.connected && !inputToken}
            error={wasTxError}
            disabled={isSendingTx || isClientLoading}
          />
          <Input
            width="57.5%"
            type="number"
            label="Amount in"
            value={amountIn}
            max={maxAmountIn}
            maxButton={{
              isActive: !!amountIn && Number(amountIn) === maxAmountIn,
              onClick: () =>
                setInputAmount(
                  maxAmountIn.toLocaleString("fullwide", { useGrouping: false })
                ),
            }}
            onChange={setInputAmount}
            needsValue={inputToken && !amountIn}
            error={wasTxError}
            disabled={!inputToken || isSendingTx || isClientLoading}
          />
        </Flexbox>

        {/** SWITCH DATA **/}
        <Flexbox marginY="base">
          <Button
            onClick={switchTokens}
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
            label="Output token"
            value={
              tokenOptions.filter(
                (option: any) =>
                  option.key === outputToken?.configuration.mint.toBase58()
              )[0]
            }
            options={tokenOptions}
            noOptionsMessage="No output tokens for this market"
            onChange={setOutputToken}
            needsValue={wallet.connected && !inputToken}
            error={wasTxError}
            disabled={isSendingTx || isClientLoading}
          />
          <Input
            width="57.5%"
            type="number"
            label="Amount out"
            value={amountOut}
            max={maxAmountOut}
            maxButton={{
              isActive: !!amountOut && Number(amountOut) === maxAmountOut,
              onClick: () =>
                setOutputAmount(
                  maxAmountOut.toLocaleString("fullwide", {
                    useGrouping: false,
                  })
                ),
            }}
            onChange={setOutputAmount}
            needsValue={outputToken && !amountOut}
            error={wasTxError}
            disabled={!outputToken || isSendingTx || isClientLoading}
          />
        </Flexbox>

        {/** SLIPPAGE **/}
        <Flexbox width="95%" flexColumn marginY="xl">
          <AccentText>Slippage</AccentText>
          <Spacer />
          <Flexbox
            width="100%"
            alignItems="center"
            justifyContent="space-between"
          >
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
