import { Keypair, PublicKey, Signer, Transaction } from "@solana/web3.js";
import {
  ResynthClient,
  SwapPool,
  swapPoolPDA,
  TokenSwapClient,
  tradingTokensToPoolTokens,
} from "@resynth/resynth-sdk";
import { assert } from "../utils/errors";
import {
  createApproveInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";

export const FEE_RECEIVER_WALLET = new PublicKey(
  "HjnXUGGMgtN9WaPAJxzdwnWip6f76xGp4rUMRoVicsLr"
);
export const HOST_FEE_RECEIVER_WALLET = FEE_RECEIVER_WALLET;

export const getDepositSwapPoolTransaction = async (
  resynthClient: ResynthClient,
  mint1Amount: number,
  mint2Amount: number,
  mint1: PublicKey,
  mint2: PublicKey,
  source1: PublicKey,
  source2: PublicKey
): Promise<{ transaction: Transaction; lastValidBlockHeight: number }> => {
  console.log("Depositing.");

  const tokenSwap = new TokenSwapClient(resynthClient.context);

  const {
    connection,
    programId,
    wallet: { publicKey: walletPubkey },
  } = tokenSwap;
  assert(walletPubkey);

  const { mintA, mintB, swapPool, authority, vaultA, vaultB, lpmint } =
    swapPoolPDA(programId, mint1, mint2);

  const tokenA = mint1.equals(mintA) ? source1 : source2;
  const tokenB = mint1.equals(mintA) ? source2 : source1;

  const [swapPoolInfo, { blockhash, lastValidBlockHeight }] = await Promise.all(
    [
      connection.getAccountInfo(swapPool),
      connection.getLatestBlockhash("finalized"),
    ]
  );

  assert(swapPoolInfo);
  const swapPoolData = tokenSwap.program.coder.accounts.decode(
    "swapPool",
    swapPoolInfo.data
  ) as SwapPool;

  const {
    mintADecimals,
    mintBDecimals,
    vaultABalance,
    vaultBBalance,
    lpmintSupply,
  } = swapPoolData;
  const mintAAmount =
    (mint1.equals(mintA) ? mint1Amount : mint2Amount) * 10 ** mintADecimals;
  const mintBAmount =
    (mint1.equals(mintA) ? mint2Amount : mint1Amount) * 10 ** mintBDecimals;

  assert(mintA.equals(swapPoolData.mintA));
  assert(mintB.equals(swapPoolData.mintB));

  const transaction = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: walletPubkey,
  });
  const signers: Signer[] = [];

  const lptoken = getAssociatedTokenAddressSync(lpmint, walletPubkey);
  transaction.add(
    createAssociatedTokenAccountIdempotentInstruction(
      walletPubkey,
      lptoken,
      walletPubkey,
      lpmint
    )
  );

  // FIXME: Call depositAllTokenTypes when mintAAmount > 0 and MintBAmount > 0
  // FIXME: depositSingleTokenTypeExactAmountInInstruction can exceed slippage
  // FIXME: Display slippage error in UI

  if (mintAAmount > 0) {
    const minimumPoolTokenAmountA = tradingTokensToPoolTokens(
      swapPoolData,
      mintAAmount,
      +vaultABalance.toString(),
      Number(lpmintSupply)
    );
    const userTransferAuthorityA = Keypair.generate();
    signers.push(userTransferAuthorityA);

    transaction.add(
      createApproveInstruction(
        tokenA,
        userTransferAuthorityA.publicKey,
        walletPubkey,
        BigInt(mintAAmount)
      )
    );
    transaction.add(
      await tokenSwap.depositSingleTokenTypeExactAmountInInstruction({
        sourceTokenAmount: new BN(mintAAmount),
        minimumPoolTokenAmount: new BN(minimumPoolTokenAmountA),
        swapPool,
        authority,
        userTransferAuthority: userTransferAuthorityA.publicKey,
        tokenA,
        tokenB: null,
        vaultA,
        vaultB,
        lpmint,
        lptoken,
      })
    );
  }

  if (mintBAmount > 0) {
    const minimumPoolTokenAmountB = tradingTokensToPoolTokens(
      swapPoolData,
      mintBAmount,
      +vaultBBalance.toString(),
      Number(lpmintSupply)
    );
    const userTransferAuthorityB = Keypair.generate();
    signers.push(userTransferAuthorityB);

    transaction.add(
      createApproveInstruction(
        tokenB,
        userTransferAuthorityB.publicKey,
        walletPubkey,
        BigInt(mintBAmount)
      )
    );
    transaction.add(
      await tokenSwap.depositSingleTokenTypeExactAmountInInstruction({
        sourceTokenAmount: new BN(mintBAmount),
        minimumPoolTokenAmount: new BN(minimumPoolTokenAmountB),
        swapPool,
        authority,
        userTransferAuthority: userTransferAuthorityB.publicKey,
        tokenA: null,
        tokenB,
        vaultA,
        vaultB,
        lpmint,
        lptoken,
      })
    );
  }

  transaction.partialSign(...signers);

  return { transaction, lastValidBlockHeight };
};
