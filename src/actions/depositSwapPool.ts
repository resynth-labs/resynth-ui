import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import {
  Fees,
  ResynthClient,
  swapPoolPDA,
  TokenSwapClient,
  tradingTokensToPoolTokens,
} from "@resynth/resynth-sdk";
import { assert } from "../utils/errors";
import {
  createApproveInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  unpackAccount,
  unpackMint,
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

  const [
    [swapPoolInfo, mintAInfo, mintBInfo, vaultAInfo, vaultBInfo, lpmintInfo],
    { blockhash, lastValidBlockHeight },
  ] = await Promise.all([
    connection.getMultipleAccountsInfo([
      swapPool,
      mintA,
      mintB,
      vaultA,
      vaultB,
      lpmint,
    ]),
    connection.getLatestBlockhash("finalized"),
  ]);

  assert(swapPoolInfo);
  assert(mintAInfo);
  assert(mintBInfo);
  assert(vaultAInfo);
  assert(vaultBInfo);
  assert(lpmintInfo);

  const swapPoolData = tokenSwap.program.coder.accounts.decode(
    "swapPool",
    swapPoolInfo.data
  );
  const mintADecimals = unpackMint(mint1, mintAInfo).decimals;
  const mintBDecimals = unpackMint(mint2, mintBInfo).decimals;
  const mintAAmount =
    (mint1.equals(mintA) ? mint1Amount : mint2Amount) * 10 ** mintADecimals;
  const mintBAmount =
    (mint1.equals(mintA) ? mint2Amount : mint1Amount) * 10 ** mintBDecimals;

  const vaultAAmount = Number(unpackAccount(vaultA, vaultAInfo).amount);
  const vaultBAmount = Number(unpackAccount(vaultB, vaultBInfo).amount);
  const { decimals: lpmintDecimals, supply: lpmintSupply } = unpackMint(
    lpmint,
    lpmintInfo
  );

  assert(mintA.equals(mintA));
  assert(mintB.equals(mintB));

  const transaction = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: walletPubkey,
  });

  const lptoken = getAssociatedTokenAddressSync(lpmint, walletPubkey);

  // fixme: Don't await while building transaction
  if (!(await connection.getAccountInfo(lptoken))) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        walletPubkey,
        lptoken,
        walletPubkey,
        lpmint
      )
    );
  }

  const minimumPoolTokenAmountA = tradingTokensToPoolTokens(
    swapPoolData,
    mintAAmount,
    vaultAAmount,
    Number(lpmintSupply)
  );
  const userTransferAuthorityA = Keypair.generate();
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
      owner: walletPubkey,
      userTransferAuthority: userTransferAuthorityA.publicKey,
      tokenA,
      tokenB: null,
      vaultA,
      vaultB,
      lpmint,
      lptoken,
      mintA,
      mintB,
    })
  );

  const minimumPoolTokenAmountB = tradingTokensToPoolTokens(
    swapPoolData,
    mintBAmount,
    vaultBAmount,
    Number(lpmintSupply)
  );
  const userTransferAuthorityB = Keypair.generate();
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
      owner: walletPubkey,
      userTransferAuthority: userTransferAuthorityB.publicKey,
      tokenA: null,
      tokenB,
      vaultA,
      vaultB,
      lpmint,
      lptoken,
      mintA,
      mintB,
    })
  );

  transaction.partialSign(userTransferAuthorityA, userTransferAuthorityB);

  return { transaction, lastValidBlockHeight };
};
