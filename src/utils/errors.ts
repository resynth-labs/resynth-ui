// import { captureException } from "@sentry/nextjs";

export function isWalletSignTransactionError(err: any) {
  return err.name === "WalletSignTransactionError";
}

export function isWalletTimeoutError(err: any) {
  return err.name === "WalletTimeoutError";
}

// This exists because webpack 5 can't import assert from "assert"
export function assert(value: unknown, message?: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

export function logException(exception: any) {
  console.log(exception);
  // TODO, add sentry
  // return captureException(exception);
}
