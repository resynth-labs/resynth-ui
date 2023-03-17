import { useEffect, useMemo, useState } from "react";
import { ResynthClient } from "@resynth/resynth-sdk";
import { useThemeMode } from "../../../contexts/ThemeModeProvider";

interface CarouselItemProps {
  content: string;
  attributes: Attribute[];
  onClick: () => void;
}

interface Attribute {
  name: string;
  className: string;
}
const CarouselItem = ({ content, attributes, onClick }: CarouselItemProps) => {
  const { themeMode } = useThemeMode();
  return (
    <div
      onClick={onClick}
      className={`rounded-md border ${
        themeMode === "dark" ? "border-[#151519]" : "border-gray-100"
      } px-5 py-3 shadow-md transition-all hover:translate-x-1 hover:-translate-y-1 hover:scale-[1.025] hover:shadow-xl`}
    >
      <p
        className={`mb-3 text-center text-2xl font-bold ${
          themeMode === "dark" ? "text-gray-300" : "text-gray-600"
        }`}
      >
        {content}
      </p>
      <div className="flex justify-center space-x-2">
        {attributes.map(({ name, className }) => (
          <span
            className={`inline-flex h-6 items-center rounded-full px-2 text-xs font-medium ${className}`}
            key={name}
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
};

export interface SkewedCarouselProps {
  skewed: boolean;
  onClick: (oracle: string) => void;
}

// make sure this is synchronized with tailwind config keyframes
const transitionDuration = 0.25;

export const SkewedCarousel = ({ skewed, onClick }: SkewedCarouselProps) => {
  const { themeMode } = useThemeMode();
  const [unskewed, setUnskewed] = useState(!skewed);

  // Skewing and transition variables
  const notTransitioning = skewed && !unskewed;
  const beginTransition = !skewed && !unskewed;
  const endTransition = !skewed && unskewed;
  const undoTransition = skewed && unskewed;

  // trigger end of skew transition after delay
  useEffect(() => {
    setTimeout(() => {
      setUnskewed(!skewed);
    }, transitionDuration * 1000);
  }, [skewed]);

  const shuffledOracles = useMemo(() => {
    const entries = Object.entries(ResynthClient.config.oracles);
    const newArr = [];
    while (entries.length) {
      // Grab random entries
      const randomIndex = Math.floor(Math.random() * entries.length);
      const [element] = entries.splice(randomIndex, 1);
      newArr.push(element);
    }
    return newArr;
  }, []);

  const synths = useMemo(() => {
    const newArr: JSX.Element[] = [];

    for (const element of shuffledOracles) {
      const [synth, oracle] = element;
      const oracleClass = oracle.class;
      const oracleQuote = oracle.quote;

      let className = "";
      if (oracleClass === "Crypto") {
        className =
          themeMode === "dark"
            ? "bg-blue-300 text-blue-800"
            : "bg-blue-100 text-blue-800";
      } else if (oracleClass === "FX") {
        className =
          themeMode === "dark"
            ? "bg-red-300 text-red-800"
            : "bg-red-100 text-red-800";
      } else if (oracleClass === "Equity") {
        className = "bg-lime-100 text-lime-800";
      } else if (oracleClass === "Metal") {
        if (oracleQuote === "XAU") {
          className = "bg-yellow-100 text-yellow-800";
        } else {
          className = "bg-cyan-100 text-cyan-800";
        }
      } else {
        className = "bg-cyan-100 text-cyan-800";
      }

      const attributes: Attribute[] = [
        {
          name: oracleClass,
          className,
        },
        {
          name: oracleQuote,
          className: "dark"
            ? "bg-red-100 text-red-800"
            : "bg-red-100 text-red-800",
        },
      ];
      let region: "US" | "GB" | undefined = (oracle as any).region;
      if (region !== undefined) {
        attributes.push({
          name: region,
          className: "bg-cyan-100 text-cyan-800",
        });
      }

      newArr.push(
        <CarouselItem
          content={synth}
          attributes={attributes}
          onClick={() => onClick(synth)}
          key={synth}
        />
      );
    }
    return newArr;
  }, [shuffledOracles, themeMode]);

  return (
    <div
      className={`flex h-screen w-screen justify-center ${
        notTransitioning || beginTransition ? "items-center" : ""
      }`}
      style={{ transform: "rotate(0)" }}
    >
      <div
        className={`relative w-full max-w-screen-lg ${
          notTransitioning || beginTransition ? "overflow-hidden" : ""
        }`}
      >
        {(notTransitioning || beginTransition) && (
          <>
            <div
              className={`pointer-events-none absolute -top-1 z-10 h-20 w-full bg-gradient-to-b ${
                themeMode === "dark" ? "from-[#1E1E21]" : "from-[#f2f2f2]"
              } to-transparent`}
            />
            <div
              className={`pointer-events-none absolute -bottom-1 z-10 h-20 w-full bg-gradient-to-t ${
                themeMode === "dark" ? "from-[#1E1E21]" : "from-[#f2f2f2]"
              } to-transparent`}
            />
            <div
              className={`pointer-events-none absolute -left-1 z-10 h-full w-20 bg-gradient-to-r ${
                themeMode === "dark" ? "from-[#1E1E21]" : "from-[#f2f2f2]"
              } to-transparent`}
            />
            <div
              className={`pointer-events-none absolute -right-1 z-10 h-full w-20 bg-gradient-to-l ${
                themeMode === "dark" ? "from-[#1E1E21]" : "from-[#f2f2f2]"
              } to-transparent`}
            />
          </>
        )}
        <div
          className={
            beginTransition || undoTransition
              ? "animate-opacity-off"
              : notTransitioning || endTransition
              ? "animate-opacity-on"
              : ""
          }
        >
          <div
            className={`mx-auto grid grid-cols-1 gap-5 sm:grid-cols-3 ${
              notTransitioning || beginTransition
                ? "animate-skew-scroll h-[500px]"
                : ""
            }`}
          >
            {synths}
          </div>
        </div>
      </div>
    </div>
  );
};
