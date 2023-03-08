import { Connection, Transaction } from "@solana/web3.js";
import { assert } from "../utils/errors";

export async function sendTransaction(
  connection: Connection,
  transaction: Transaction,
  lastValidBlockHeight: number
): Promise<string> {
  const blockhash = transaction.recentBlockhash;
  assert(blockhash);

  const signature = await connection.sendRawTransaction(
    transaction.serialize(),
    { skipPreflight: true }
  );

  const {
    value: { err },
  } = await connection.confirmTransaction({
    signature,
    lastValidBlockHeight,
    blockhash,
  });

  if (err) {
    throw new Error(JSON.stringify(err));
  }
  return signature;
}
