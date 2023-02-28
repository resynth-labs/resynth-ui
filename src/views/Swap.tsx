import { useEffect, useState } from "react";
import styled, { useTheme } from "styled-components";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
// import { Token } from "@resynth/resynth-sdk";

import { useNetwork } from "../contexts/NetworkProvider";
import { useResynth } from "../contexts/ResynthProvider";
import { useModals } from "../contexts/ModalsProvider";
import { bigIntToTokens } from "../utils/numbers";
import { openTxInExplorer } from "../utils/explore";
import { notify } from "../utils/notify";
import { color, spacing } from "../styles/mixins";
import { Flexbox, Spacer } from "../components/Layout";
import { AccentText } from "../components/Typography";
import { Input, Select, SelectOption } from "../components/Fields";
import { Button, PrimaryButton } from "../components/Buttons";
import { ExternalLink, SwapArrows, UnknownToken } from "../components/Icons";
import { PublicKey } from "@solana/web3.js";

const SwapContainer = styled(Flexbox)`
  max-width: ${({ theme }) => theme.view.elements.maxWidth};
  margin: ${spacing()} auto;
  padding: ${spacing("lg")};
  background: ${color("base")};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadow.base};
`;

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

// =========== Dummy data to get this rendering ===========
interface Token {
  balance: bigint;

  configuration: {
    mint: PublicKey;
    symbol: string;
    logoUrl: string;
    decimals: number;
  };
}
const markets = [
  {
    configuration: {
      baseSymbol: "USDC",
      quoteSymbol: "nAPPL",
    },
  },
];
const tokens: Record<string, Token> = {
  USDC: {
    balance: BigInt(0),
    configuration: {
      mint: PublicKey.default,
      symbol: "USDC",
      logoUrl:
        "data:image/svg+xml;base64,PHN2ZyBkYXRhLW5hbWU9Ijg2OTc3Njg0LTEyZGItNDg1MC04ZjMwLTIzM2E3YzI2N2QxMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMjAwMCAyMDAwIj4KICA8cGF0aCBkPSJNMTAwMCAyMDAwYzU1NC4xNyAwIDEwMDAtNDQ1LjgzIDEwMDAtMTAwMFMxNTU0LjE3IDAgMTAwMCAwIDAgNDQ1LjgzIDAgMTAwMHM0NDUuODMgMTAwMCAxMDAwIDEwMDB6IiBmaWxsPSIjMjc3NWNhIi8+CiAgPHBhdGggZD0iTTEyNzUgMTE1OC4zM2MwLTE0NS44My04Ny41LTE5NS44My0yNjIuNS0yMTYuNjYtMTI1LTE2LjY3LTE1MC01MC0xNTAtMTA4LjM0czQxLjY3LTk1LjgzIDEyNS05NS44M2M3NSAwIDExNi42NyAyNSAxMzcuNSA4Ny41IDQuMTcgMTIuNSAxNi42NyAyMC44MyAyOS4xNyAyMC44M2g2Ni42NmMxNi42NyAwIDI5LjE3LTEyLjUgMjkuMTctMjkuMTZ2LTQuMTdjLTE2LjY3LTkxLjY3LTkxLjY3LTE2Mi41LTE4Ny41LTE3MC44M3YtMTAwYzAtMTYuNjctMTIuNS0yOS4xNy0zMy4zMy0zMy4zNGgtNjIuNWMtMTYuNjcgMC0yOS4xNyAxMi41LTMzLjM0IDMzLjM0djk1LjgzYy0xMjUgMTYuNjctMjA0LjE2IDEwMC0yMDQuMTYgMjA0LjE3IDAgMTM3LjUgODMuMzMgMTkxLjY2IDI1OC4zMyAyMTIuNSAxMTYuNjcgMjAuODMgMTU0LjE3IDQ1LjgzIDE1NC4xNyAxMTIuNXMtNTguMzQgMTEyLjUtMTM3LjUgMTEyLjVjLTEwOC4zNCAwLTE0NS44NC00NS44NC0xNTguMzQtMTA4LjM0LTQuMTYtMTYuNjYtMTYuNjYtMjUtMjkuMTYtMjVoLTcwLjg0Yy0xNi42NiAwLTI5LjE2IDEyLjUtMjkuMTYgMjkuMTd2NC4xN2MxNi42NiAxMDQuMTYgODMuMzMgMTc5LjE2IDIyMC44MyAyMDB2MTAwYzAgMTYuNjYgMTIuNSAyOS4xNiAzMy4zMyAzMy4zM2g2Mi41YzE2LjY3IDAgMjkuMTctMTIuNSAzMy4zNC0zMy4zM3YtMTAwYzEyNS0yMC44NCAyMDguMzMtMTA4LjM0IDIwOC4zMy0yMjAuODR6IiBmaWxsPSIjZmZmIi8+CiAgPHBhdGggZD0iTTc4Ny41IDE1OTUuODNjLTMyNS0xMTYuNjYtNDkxLjY3LTQ3OS4xNi0zNzAuODMtODAwIDYyLjUtMTc1IDIwMC0zMDguMzMgMzcwLjgzLTM3MC44MyAxNi42Ny04LjMzIDI1LTIwLjgzIDI1LTQxLjY3VjMyNWMwLTE2LjY3LTguMzMtMjkuMTctMjUtMzMuMzMtNC4xNyAwLTEyLjUgMC0xNi42NyA0LjE2LTM5NS44MyAxMjUtNjEyLjUgNTQ1Ljg0LTQ4Ny41IDk0MS42NyA3NSAyMzMuMzMgMjU0LjE3IDQxMi41IDQ4Ny41IDQ4Ny41IDE2LjY3IDguMzMgMzMuMzQgMCAzNy41LTE2LjY3IDQuMTctNC4xNiA0LjE3LTguMzMgNC4xNy0xNi42NnYtNTguMzRjMC0xMi41LTEyLjUtMjkuMTYtMjUtMzcuNXpNMTIyOS4xNyAyOTUuODNjLTE2LjY3LTguMzMtMzMuMzQgMC0zNy41IDE2LjY3LTQuMTcgNC4xNy00LjE3IDguMzMtNC4xNyAxNi42N3Y1OC4zM2MwIDE2LjY3IDEyLjUgMzMuMzMgMjUgNDEuNjcgMzI1IDExNi42NiA0OTEuNjcgNDc5LjE2IDM3MC44MyA4MDAtNjIuNSAxNzUtMjAwIDMwOC4zMy0zNzAuODMgMzcwLjgzLTE2LjY3IDguMzMtMjUgMjAuODMtMjUgNDEuNjdWMTcwMGMwIDE2LjY3IDguMzMgMjkuMTcgMjUgMzMuMzMgNC4xNyAwIDEyLjUgMCAxNi42Ny00LjE2IDM5NS44My0xMjUgNjEyLjUtNTQ1Ljg0IDQ4Ny41LTk0MS42Ny03NS0yMzcuNS0yNTguMzQtNDE2LjY3LTQ4Ny41LTQ5MS42N3oiIGZpbGw9IiNmZmYiLz4KPC9zdmc+Cg==",
      decimals: 6,
    },
  },
  nAPPL: {
    balance: BigInt(0),
    configuration: {
      mint: PublicKey.default,
      symbol: "nAPPL",
      logoUrl:
        "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iODQyLjMyMDA3IiBoZWlnaHQ9IjEwMDAuMDAwMSI+CiAgPHBhdGggZmlsbD0iI2IzYjNiMyIgZD0iTTgyNC42NjYzNiA3NzkuMzAzNjNjLTE1LjEyMjk5IDM0LjkzNzI0LTMzLjAyMzY4IDY3LjA5Njc0LTUzLjc2MzggOTYuNjYzNzQtMjguMjcwNzYgNDAuMzA3NC01MS40MTgyIDY4LjIwNzgtNjkuMjU3MTcgODMuNzAxMi0yNy42NTM0NyAyNS40MzEzLTU3LjI4MjIgMzguNDU1Ni04OS4wMDk2NCAzOS4xOTYzLTIyLjc3NzA4IDAtNTAuMjQ1MzktNi40ODEzLTgyLjIxOTczLTE5LjYyOS0zMi4wNzkyNi0xMy4wODYxLTYxLjU1OTg1LTE5LjU2NzMtODguNTE1ODMtMTkuNTY3My0yOC4yNzA3NSAwLTU4LjU5MDgzIDYuNDgxMi05MS4wMjE5MyAxOS41NjczLTMyLjQ4MDUzIDEzLjE0NzctNTguNjQ2MzkgMTkuOTk5NC03OC42NTE5NiAyMC42Nzg0LTMwLjQyNTAxIDEuMjk2MjMtNjAuNzUxMjMtMTIuMDk4NS05MS4wMjE5My00MC4yNDU3LTE5LjMyMDM5LTE2Ljg1MTQtNDMuNDg2MzItNDUuNzM5NC03Mi40MzYwNy04Ni42NjQxLTMxLjA2MDc3OC00My43MDI0LTU2LjU5NzA0MS05NC4zNzk4My03Ni42MDI2MDktMTUyLjE1NTg2QzEwLjc0MDQxNiA2NTguNDQzMDkgMCA1OTguMDEyODMgMCA1MzkuNTA4NDVjMC02Ny4wMTY0OCAxNC40ODEwNDQtMTI0LjgxNzIgNDMuNDg2MzM2LTE3My4yNTQwMUM2Ni4yODE5NCAzMjcuMzQ4MjMgOTYuNjA4MTggMjk2LjY1NzggMTM0LjU2MzggMjc0LjEyNzZjMzcuOTU1NjYtMjIuNTMwMTYgNzguOTY2NzYtMzQuMDExMjkgMTIzLjEzMjEtMzQuNzQ1ODUgMjQuMTY1OTEgMCA1NS44NTYzMyA3LjQ3NTA4IDk1LjIzNzg0IDIyLjE2NiAzOS4yNzA0MiAxNC43NDAyOSA2NC40ODU3MSAyMi4yMTUzOCA3NS41NDA5MSAyMi4yMTUzOCA4LjI2NTE4IDAgMzYuMjc2NjgtOC43NDA1IDgzLjc2MjktMjYuMTY1ODcgNDQuOTA2MDctMTYuMTYwMDEgODIuODA2MTQtMjIuODUxMTggMTEzLjg1NDU4LTIwLjIxNTQ2IDg0LjEzMzI2IDYuNzg5OTIgMTQ3LjM0MTIyIDM5Ljk1NTU5IDE4OS4zNzY5OSA5OS43MDY4Ni03NS4yNDQ2MyA0NS41OTEyMi0xMTIuNDY1NzMgMTA5LjQ0NzMtMTExLjcyNTAyIDE5MS4zNjQ1Ni42Nzg5OSA2My44MDY3IDIzLjgyNjQzIDExNi45MDM4NCA2OS4zMTg4OCAxNTkuMDYzMDkgMjAuNjE2NjQgMTkuNTY3MjcgNDMuNjQwNjYgMzQuNjkwMjcgNjkuMjU3MSA0NS40MzA3LTUuNTU1MzEgMTYuMTEwNjItMTEuNDE5MzMgMzEuNTQyMjUtMTcuNjUzNzIgNDYuMzU2NjJ6TTYzMS43MDkyNiAyMC4wMDU3YzAgNTAuMDExNDEtMTguMjcxMDggOTYuNzA2OTMtNTQuNjg5NyAxMzkuOTI3ODItNDMuOTQ5MzIgNTEuMzgxMTgtOTcuMTA4MTcgODEuMDcxNjItMTU0Ljc1NDU5IDc2LjM4NjU5LS43MzQ1NC01Ljk5OTgzLTEuMTYwNDUtMTIuMzE0NDQtMS4xNjA0NS0xOC45NTAwMyAwLTQ4LjAxMDkxIDIwLjkwMDYtOTkuMzkyMDcgNTguMDE2NzgtMTQxLjQwMzE0IDE4LjUzMDI3LTIxLjI3MDk0IDQyLjA5NzQ2LTM4Ljk1NzQ0IDcwLjY3Njg1LTUzLjA2NjNDNTc4LjMxNTggOS4wMDIyOSA2MDUuMjkwMyAxLjMxNjIxIDYzMC42NTk4OCAwYy43NDA3NiA2LjY4NTc1IDEuMDQ5MzggMTMuMzcxOTEgMS4wNDkzOCAyMC4wMDUwNXoiLz4KPC9zdmc+",
      decimals: 6,
    },
  },
};

export const Swap = () => {
  const theme = useTheme();
  const { network } = useNetwork();
  const { connection } = useConnection();
  const wallet = useWallet();
  const { setIsWalletModalOpen } = useModals();
  const { client, isClientLoading } = useResynth();
  // const { markets, tokens } = client;
  const marketPairs = Object.values(markets)
    .filter((market) => market !== undefined)
    .map(
      (market) =>
        `${market.configuration?.baseSymbol}/${market.configuration?.quoteSymbol}`
    );
  const [isSendingTx, setIsSendingTx] = useState(false);
  const [wasTxError, setWasTxError] = useState(false);

  // Token options / input & output tokens
  const tokenOptions = Object.values(tokens).map((token: Token) => ({
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
        {bigIntToTokens(token.balance, token.configuration.decimals)}
      </AccentText>
    ),
  }));
  const [inputToken, setInputToken] = useState<Token>();
  const [outputToken, setOutputToken] = useState<Token>();
  const inputTokenOptions = outputToken
    ? tokenOptions.filter(
        (token) =>
          marketPairs.includes(
            `${outputToken.configuration.symbol}/${token.label}`
          ) ||
          marketPairs.includes(
            `${token.label}/${outputToken.configuration.symbol}`
          )
      )
    : tokenOptions;
  const outputTokenOptions = inputToken
    ? tokenOptions.filter(
        (token) =>
          marketPairs.includes(
            `${inputToken.configuration.symbol}/${token.label}`
          ) ||
          marketPairs.includes(
            `${token.label}/${inputToken.configuration.symbol}`
          )
      )
    : tokenOptions;

  // Current market based on input and output tokens
  const market =
    inputToken &&
    outputToken &&
    Object.values(markets).filter((market) => {
      if (market.configuration) {
        const marketPair = `${market.configuration?.baseSymbol}/${market.configuration?.quoteSymbol}`;
        return (
          marketPair ===
            `${inputToken.configuration.symbol}/${outputToken.configuration.symbol}` ||
          marketPair ===
            `${outputToken.configuration.symbol}/${inputToken.configuration.symbol}`
        );
      }
    })[0];

  // Swap type and amounts in/out
  const [swapType, setSwapType] = useState<"exactIn" | "exactOut">("exactIn");
  // const [slippage, setSlippage] = useState<number | undefined>();
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");

  // Maximum amounts in/out
  const maxAmountIn = inputToken
    ? bigIntToTokens(inputToken.balance, inputToken.configuration.decimals)
    : 0;
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
    setInputToken(undefined);
    setAmountIn("");
    setOutputToken(undefined);
    setAmountOut("");
  };

  // Submit swap transaction
  const submitSwap = async () => {
    if (!market || !wallet.publicKey || !wallet.signTransaction) return;
    setIsSendingTx(true);
    const notificationId = notify({
      content: "Sending transaction...",
      type: "loading",
    });

    let txId = "";
    try {
      // const swapTx = client.makeSwapTransaction(
      //   inputToken.configuration.symbol,
      //   swapType === "exactIn" ? parseFloat(amountIn) : 0,
      //   outputToken.configuration.symbol,
      //   swapType === "exactOut" ? parseFloat(amountOut) : 0
      // );

      // txId = await wallet.sendTransaction(swapTx, connection);
      // console.log("Successful swap: ", txId);
      throw new Error("Swap not implemented");
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

  // Anytime wallet changes, reset inputs
  useEffect(resetSwapData, [wallet.connected]);

  // Update amounts in/out on change to their compliment
  useEffect(() => {
    if (!market) return;

    // Amount out
    if (swapType === "exactIn" && inputToken && amountIn) {
      setAmountOut("0");
      /*
      setAmountOut(
        market
          .getAmountOut(
            inputToken.configuration.symbol,
            Number(amountIn),
            outputToken.configuration.symbol
          )
          .toFixed(outputToken.configuration.decimals)
      );
      */
    }

    // Amount in
    if (swapType === "exactOut" && outputToken && amountOut) {
      setAmountIn("0");
      /*
      setAmountIn(
        market
          .getAmountIn(
            inputToken.configuration.symbol,
            outputToken.configuration.symbol,
            Number(amountOut)
          )
          .toFixed(inputToken.configuration.decimals)
      );
      */
    }

    setWasTxError(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market, amountIn, amountOut]);

  return (
    <SwapContainer width="95%" alignItems="center" flexColumn>
      {/** INPUT DATA **/}
      <Flexbox width="100%" justifyContent="space-between" alignItems="center">
        <Select
          width="40%"
          label="Input token"
          value={
            tokenOptions.filter(
              (option: any) =>
                option.key === inputToken?.configuration.mint.toBase58()
            )[0]
          }
          options={inputTokenOptions}
          noOptionsMessage="No input tokens for this market"
          onChange={(token: SelectOption) => setInputToken(tokens[token.label])}
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
            onClick: () => setAmountIn(maxAmountIn.toString()),
          }}
          onChange={(amount: string) => {
            setAmountIn(amount);
            setSwapType("exactIn");
          }}
          needsValue={inputToken && !amountIn}
          error={wasTxError}
          disabled={!inputToken || isSendingTx || isClientLoading}
        />
      </Flexbox>

      {/** SWITCH DATA **/}
      <Flexbox marginY="base">
        <Button
          onClick={() => {
            setInputToken(outputToken);
            setAmountIn(amountOut);
            setOutputToken(inputToken);
            setAmountOut(amountIn);
          }}
          disabled={isSendingTx || !inputToken || !outputToken}
        >
          <SwapArrows size={theme.font.size.lg} />
        </Button>
      </Flexbox>

      {/** OUTPUT DATA **/}
      <Flexbox width="100%" justifyContent="space-between" alignItems="center">
        <Select
          width="40%"
          label="Output token"
          value={
            tokenOptions.filter(
              (option: any) =>
                option.key === outputToken?.configuration.mint.toBase58()
            )[0]
          }
          options={outputTokenOptions}
          noOptionsMessage="No output tokens for this market"
          onChange={(token: SelectOption) =>
            setOutputToken(tokens[token.label])
          }
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
            onClick: () => setAmountOut(maxAmountOut.toString()),
          }}
          onChange={(amount: string) => {
            setAmountOut(amount);
            setSwapType("exactOut");
          }}
          needsValue={outputToken && !amountOut}
          error={wasTxError}
          disabled={!outputToken || isSendingTx || isClientLoading}
        />
      </Flexbox>

      {/** SLIPPAGE **/}
      {/* <Flexbox width="95%" flexColumn marginY="xl">
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
    </Flexbox> */}

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
  );
};
