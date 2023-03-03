import * as anchor from "@coral-xyz/anchor";

/** Returns a BN. This method does not throw for numbers greater than 2^53, unlike BN.toNumber() */
export function bnToNumber(bn: anchor.BN) {
  return Number(bn.toString());
}
