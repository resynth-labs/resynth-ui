import { useState } from "react";
import { SwapContainer } from "../Containers/Swap/SwapContainer";

export const Disclaimer = () => {
  const [visible, setVisible] = useState<boolean>(
    !window.location.href.includes("locaslhost")
  );
  if (!visible) {
    return <></>;
  }
  return (
    <div className="mb-[20px]">
      <SwapContainer
        width="95%"
        alignItems="center"
        flexColumn
        onClick={() => setVisible(false)}
        className="cursor-pointer"
      >
        <p style={{ color: "orange" }}>
          Resynth is unauditied, incomplete software. Any funds that enter the
          software will be at risk of complete loss. Resynth Trade is NOT
          responsible for any loss of funds due to exploits, errors, or
          incomplete software. The software is provided “as is”, without
          warranty of any kind, express or implied.
        </p>
      </SwapContainer>
    </div>
  );
};
