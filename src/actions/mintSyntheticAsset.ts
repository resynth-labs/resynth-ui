import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  marginAccountPDA,
  ResynthClient,
  syntheticAssetPDA,
  SYNTH_DECIMALS,
} from "@resynth/resynth-sdk";
import { translateAddress } from "@coral-xyz/anchor";
import { assert } from "../utils/errors";

export interface WithdrawAnalytics {
  claim: boolean;
  fairPlayTokenAmount: number | null;
  fairPlayTokenName: string | null;
}

export const getMintSyntheticAssetTransaction = async (
  mint: boolean,
  client: ResynthClient,
  oracleLabel: string,
  collateralTokens: number,
  mintTokens: number,
  collateralAccount: PublicKey,
  syntheticAccount: PublicKey
): Promise<{
  transaction: Transaction;
  lastValidBlockHeight: number;
}> => {
  console.log("Minting.");

  const {
    connection,
    programId,
    wallet: { publicKey: walletPubkey },
    config: { collateralMint, collateralDecimals, oracles },
  } = client;
  assert(walletPubkey);
  assert(oracles);

  const { oracle } = oracles[oracleLabel];
  const { syntheticAsset } = syntheticAssetPDA(programId, oracle);
  const marginAccount = marginAccountPDA(
    programId,
    walletPubkey,
    syntheticAsset
  );

  const [marginAccountData, { blockhash, lastValidBlockHeight }] =
    await Promise.all([
      client.program.account.marginAccount.fetchNullable(marginAccount),
      connection.getLatestBlockhash("finalized"),
    ]);

  const collateralAmount = new anchor.BN(
    collateralTokens * 10 ** collateralDecimals
  );
  const mintAmount = new anchor.BN(mintTokens * 10 ** SYNTH_DECIMALS);

  const instructions: TransactionInstruction[] = [];

  if (!marginAccountData) {
    let ix = await client.initializeMarginAccountInstruction({
      owner: walletPubkey,
      syntheticAsset,
      marginAccount,
    });
    instructions.push(ix);
  }

  if (mint) {
    let ix = await client.mintSyntheticAssetInstruction({
      collateralAmount,
      mintAmount,
      syntheticOracle: translateAddress(oracle),
      owner: walletPubkey,
      collateralMint: new PublicKey(collateralMint),
      collateralAccount,
      syntheticAccount,
    });
    instructions.push(ix);
  } else {
    let ix = await client.burnSyntheticAssetInstruction({
      collateralAmount,
      burnAmount: mintAmount,
      syntheticOracle: translateAddress(oracle),
      owner: walletPubkey,
      collateralMint: new PublicKey(collateralMint),
      collateralAccount,
      syntheticAccount,
    });
    instructions.push(ix);
  }

  const transaction = new Transaction({
    feePayer: walletPubkey,
    recentBlockhash: blockhash,
  }).add(...instructions);

  return {
    transaction,
    lastValidBlockHeight,
  };
};
