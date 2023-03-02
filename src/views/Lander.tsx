import { SkewedCarousel } from "../components/Lander/SkewedCarousel/SkewedCarousel";
import { useThemeMode } from "../contexts/ThemeModeProvider";

export const Lander = () => {
  const { themeMode } = useThemeMode();
  const glowColor = themeMode === "dark" ? "#1E1E21" : "#f2f2f2";
  return (
    <>
      <div className="absolute w-[100%]">
        <h1
          className="pointer-events-none mt-[300px] lg:ml-[100px] lg:text-left lg:w-initial w-[100%] text-center text-6xl  relative"
          style={{
            zIndex: 1,
            textShadow: `0 0 20px #fff, 0 0 30px ${glowColor}, 0 0 40px ${glowColor}, 0 0 50px ${glowColor}, 0 0 60px ${glowColor}, 0 0 70px ${glowColor}, 0 0 80px ${glowColor}`,
          }}
        >
          The Synthetic Assets <br />
          Ecosystem on Solana
        </h1>
      </div>
      <SkewedCarousel />
    </>
  );
};
