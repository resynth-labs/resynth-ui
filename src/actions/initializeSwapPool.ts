import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import {
  ResynthClient,
  swapPoolPDA,
  TokenSwapClient,
} from "@resynth/resynth-sdk";
import { assert } from "../utils/errors";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createApproveInstruction,
  getAssociatedTokenAddressSync,
  unpackMint,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { FEE_RECEIVER_WALLET } from "./depositSwapPool";

export const getInitializeSwapPoolTransaction = async (
  resynthClient: ResynthClient,
  maximumTokenAmount1: number,
  maximumTokenAmount2: number,
  mint1: PublicKey,
  mint2: PublicKey,
  source1: PublicKey,
  source2: PublicKey
): Promise<{ transaction: Transaction; lastValidBlockHeight: number }> => {
  console.log("Initializing swap pool.");

  const tokenSwap = new TokenSwapClient(resynthClient.context);

  const {
    connection,
    programId,
    wallet: { publicKey: walletPubkey },
  } = tokenSwap;
  assert(walletPubkey);

  const { mintA, mintB, swapPool, authority, vaultA, vaultB, lpmint } =
    swapPoolPDA(programId, mint1, mint2);

  const maximumTokenAmountA = mintA.equals(mint1)
    ? maximumTokenAmount1
    : maximumTokenAmount2;
  const maximumTokenAmountB = mintA.equals(mint1)
    ? maximumTokenAmount2
    : maximumTokenAmount1;

  const sourceA = mintA.equals(mint1) ? source1 : source2;
  const sourceB = mintA.equals(mint1) ? source2 : source1;

  const [
    [mintAInfo, mintBInfo, vaultAInfo, vaultBInfo, lpmintInfo],
    { blockhash, lastValidBlockHeight },
  ] = await Promise.all([
    connection.getMultipleAccountsInfo([mintA, mintB, vaultA, vaultB, lpmint]),
    connection.getLatestBlockhash("finalized"),
  ]);

  assert(mintAInfo);
  assert(mintBInfo);

  const mintADecimals = unpackMint(mint1, mintAInfo).decimals;
  const mintBDecimals = unpackMint(mint2, mintBInfo).decimals;

  const maximumAmountA = new BN(maximumTokenAmountA * 10 ** mintADecimals);
  const maximumAmountB = new BN(maximumTokenAmountB * 10 ** mintBDecimals);

  const feeReceiverWallet = FEE_RECEIVER_WALLET;
  const feeReceiver = getAssociatedTokenAddressSync(
    lpmint,
    feeReceiverWallet,
    true
  );

  assert(mintA.equals(mintA));
  assert(mintB.equals(mintB));

  const lptoken = getAssociatedTokenAddressSync(lpmint, walletPubkey);

  const transaction = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: walletPubkey,
  });

  const userTransferAuthority = Keypair.generate();
  transaction.add(
    createApproveInstruction(
      sourceA,
      userTransferAuthority.publicKey,
      walletPubkey,
      BigInt(maximumAmountA.toString())
    ),
    createApproveInstruction(
      sourceB,
      userTransferAuthority.publicKey,
      walletPubkey,
      BigInt(maximumAmountB.toString())
    )
  );

  transaction.add(
    await tokenSwap.initializeSwapPoolInstruction({
      initialTokenAAmount: maximumAmountA,
      initialTokenBAmount: maximumAmountB,
      swapPool,
      authority,
      vaultA,
      vaultB,
      lpmint,
      feeReceiver,
      feeReceiverWallet,
      mintA,
      mintB,
      owner: walletPubkey,
      userTransferAuthority: userTransferAuthority.publicKey,
      sourceA,
      sourceB,
      lptoken,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
  );

  transaction.partialSign(userTransferAuthority);

  return { transaction, lastValidBlockHeight };
};
