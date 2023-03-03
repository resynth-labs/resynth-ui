import styled from "styled-components";
import { color, spacing } from "../../../styles/mixins";
import { Flexbox } from "../../Layout";

export const SwapContainer = styled(Flexbox)`
  max-width: ${({ theme }) => theme.view.elements.maxWidth};
  margin: ${spacing()} auto;
  padding: ${spacing("lg")};
  background: ${color("base")};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadow.base};
`;
