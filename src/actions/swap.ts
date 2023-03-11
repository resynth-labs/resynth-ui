import { BN } from "@coral-xyz/anchor";
import {
  ResynthClient,
  swapPoolPDA,
  TokenSwapClient,
} from "@resynth/resynth-sdk";
import {
  createApproveInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { FEE_RECEIVER_WALLET } from "./depositSwapPool";

export async function getSwapTransaction(
  resynthClient: ResynthClient,
  sourceMint: PublicKey,
  destMint: PublicKey,
  source: PublicKey,
  dest: PublicKey | undefined,
  fromLamports: number,
  minimumToLamports: number,
  blockhash: string,
  lastValidBlockHeight: number
): Promise<Transaction> {
  console.log("Swapping.");

  const walletPubkey = resynthClient.wallet.publicKey;

  const tokenSwap = new TokenSwapClient(resynthClient.context);

  const { mintA, mintB, swapPool, authority, vaultA, vaultB, lpmint } =
    swapPoolPDA(tokenSwap.programId, sourceMint, destMint);

  const transaction = new Transaction({
    blockhash,
    feePayer: walletPubkey,
    lastValidBlockHeight,
  });

  if (!dest) {
    dest = getAssociatedTokenAddressSync(destMint, walletPubkey);
    transaction.add(
      createAssociatedTokenAccountInstruction(
        walletPubkey,
        dest,
        walletPubkey,
        destMint
      )
    );
  }

  const userTransferAuthority = Keypair.generate();
  transaction.add(
    createApproveInstruction(
      source,
      userTransferAuthority.publicKey,
      walletPubkey,
      fromLamports
    )
  );

  const feeReceiverWallet = FEE_RECEIVER_WALLET;
  const feeReceiver = getAssociatedTokenAddressSync(
    lpmint,
    feeReceiverWallet,
    true
  );

  transaction.add(
    await tokenSwap.swapInstruction({
      amountIn: new BN(fromLamports),
      minimumAmountOut: new BN(minimumToLamports),
      swapPool,
      authority,
      owner: walletPubkey,
      userTransferAuthority: userTransferAuthority.publicKey,
      sourceTokenAccount: source,
      sourceVault: vaultA,
      destVault: vaultB,
      destTokenAccount: dest,
      lpmint,
      feeReceiver,
      hostFeeReceiver: feeReceiver,
    })
  );

  transaction.partialSign(userTransferAuthority);

  return transaction;
}
