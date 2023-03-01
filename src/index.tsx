import { Route, Routes, BrowserRouter } from "react-router-dom";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "styled-components";

import { NetworkProvider } from "./contexts/NetworkProvider";
import { SolanaProvider } from "./contexts/SolanaProvider";
import { ModalsProvider } from "./contexts/ModalsProvider";
import { ResynthProvider } from "./contexts/ResynthProvider";
import { ThemeModeProvider, useThemeMode } from "./contexts/ThemeModeProvider";
import "./styles/tailwind-output.css";
import { getTheme } from "./styles/theme";
import { GlobalStyles } from "./styles/globalStyles";
import { Nav, Notifications } from "./components/Layout";
import { Swap } from "./views/Swap";
import { Lander } from "./views/Lander";

const ThemedApp = () => {
  const { themeMode } = useThemeMode();

  return (
    <ThemeProvider theme={getTheme(themeMode)}>
      <GlobalStyles />
      <ModalsProvider>
        <BrowserRouter>
          <Nav />
          <Routes>
            <Route index path="/" element={<Lander />} />
            <Route path="/swap" element={<Swap />} />
          </Routes>
        </BrowserRouter>
        <Notifications />
      </ModalsProvider>
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <NetworkProvider>
    <SolanaProvider>
      <ResynthProvider>
        <ThemeModeProvider>
          <ThemedApp />
        </ThemeModeProvider>
      </ResynthProvider>
    </SolanaProvider>
  </NetworkProvider>
);
