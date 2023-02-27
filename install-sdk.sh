(
  cd ../resynth/sdk/ &&
  yarn &&
  yarn build ;
  yarn pack -f ../../resynth-ui/resynth-sdk.tgz &&
  cd ../../resynth-ui &&
  pnpm i ./resynth-sdk.tgz
)