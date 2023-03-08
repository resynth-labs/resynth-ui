import { Disclaimer } from "../Disclaimer/Disclaimer";
import { SwapContainer } from "../Containers/Swap/SwapContainer";
import { Flexbox, Spacer } from "../Layout";
import { Input, Select, SelectOption } from "../Fields";
import { Button, PrimaryButton } from "../Buttons";
import { SwapArrows } from "../Icons";
import { useTheme } from "styled-components";
import { ReactNode } from "react";

export interface InputValue {
  key: string;
  label: string;
  leftElement?: JSX.Element;
  rightElement?: JSX.Element;
}

export interface SwapBuilderProps {
  // input
  inputTokenLabel: string;
  inputValue: InputValue;
  inputTokenOptions: InputValue[];
  setInputToken: (label: string) => void;
  inputTokenDisabled: boolean;
  inputLabel: string;
  amountIn: string;
  maxAmountIn: number;
  setAmountIn: (amount: string) => void;
  inputDisabled: boolean;

  // output
  outputTokenLabel: string;
  outputValue: InputValue;
  outputTokenOptions: InputValue[];
  setOutputToken: (label: string) => void;
  outputTokenDisabled: boolean;
  outputLabel: string;
  amountOut: string;
  maxAmountOut: number;
  setAmountOut: (amount: string) => void;
  outputDisabled: boolean;

  // submit
  submitLabel: string;
  submitSwap: () => void;
  isClientLoading: boolean;
  submitDisabled: boolean;

  // misc
  wasTxError: boolean;
  switchInputOutputDisabled: boolean;
  switchInputOutputElement?: ReactNode;
  switchInputOutput: () => void;
  slippageElement?: ReactNode;
}

export const SwapBuilder = ({
  // input
  inputTokenLabel,
  inputValue,
  inputTokenOptions,
  setInputToken,
  inputTokenDisabled,
  inputLabel,
  amountIn,
  maxAmountIn,
  setAmountIn,
  inputDisabled,

  // output
  outputTokenLabel,
  outputValue,
  outputTokenOptions,
  setOutputToken,
  outputTokenDisabled,
  outputLabel,
  amountOut,
  maxAmountOut,
  setAmountOut,
  outputDisabled,

  // submit
  submitLabel,
  submitSwap,
  isClientLoading,
  submitDisabled,

  // misc
  wasTxError,
  switchInputOutputDisabled,
  switchInputOutputElement,
  switchInputOutput,
  slippageElement,
}: SwapBuilderProps) => {
  const theme = useTheme();

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
            label={inputTokenLabel}
            value={inputValue}
            options={inputTokenOptions}
            noOptionsMessage="No input tokens for this market"
            onChange={(token: SelectOption) => setInputToken(token.label)}
            needsValue={false}
            error={wasTxError}
            disabled={inputTokenDisabled}
          />
          <Input
            width="57.5%"
            type="number"
            label={inputLabel}
            value={amountIn}
            max={maxAmountIn}
            maxButton={{
              isActive: !!amountIn && Number(amountIn) === maxAmountIn,
              onClick: () => setAmountIn(maxAmountIn.toString()),
            }}
            onChange={(amount: string) => {
              setAmountIn(amount);
            }}
            needsValue={false}
            error={wasTxError}
            disabled={inputDisabled}
          />
        </Flexbox>

        {/** SWITCH DATA **/}
        <Flexbox marginY="base">
          <Button
            onClick={switchInputOutput}
            disabled={switchInputOutputDisabled}
          >
            {switchInputOutputElement ?? (
              <SwapArrows size={theme.font.size.lg} />
            )}
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
            label={outputTokenLabel}
            value={outputValue}
            options={outputTokenOptions}
            noOptionsMessage="No output tokens for this market"
            onChange={(token: SelectOption) => setOutputToken(token.label)}
            needsValue={false}
            error={wasTxError}
            disabled={outputTokenDisabled}
          />
          <Input
            width="57.5%"
            type="number"
            label={outputLabel}
            value={amountOut}
            max={maxAmountOut}
            maxButton={{
              isActive: !!amountOut && Number(amountOut) === maxAmountOut,
              onClick: () => setAmountOut(maxAmountOut.toString()),
            }}
            onChange={(amount: string) => setAmountOut(amount)}
            needsValue={false}
            error={wasTxError}
            disabled={outputDisabled}
          />
        </Flexbox>

        {/** SLIPPAGE BUTTON */}

        {/** SLIPPAGE **/}
        {slippageElement && (
          <Flexbox width="95%" flexColumn marginY="xl">
            {slippageElement}{" "}
          </Flexbox>
        )}

        {/** SWAP BUTTON **/}
        <Spacer size="xl" />
        <PrimaryButton
          fullWidth
          label={submitLabel}
          onClick={submitSwap}
          isLoading={isClientLoading}
          disabled={submitDisabled}
        />
      </SwapContainer>
    </>
  );
};
