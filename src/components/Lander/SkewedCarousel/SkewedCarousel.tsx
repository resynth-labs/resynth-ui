import { useMemo } from "react";
import { ResynthConfig } from "@resynth/resynth-sdk";
import { useThemeMode } from "../../../contexts/ThemeModeProvider";
import { Link } from "react-router-dom";

interface CarouselItemProps {
  content: string;
  attributes: {
    name: string;
    className: string;
  }[];
}
const CarouselItem = ({ content, attributes }: CarouselItemProps) => {
  const { themeMode } = useThemeMode();
  return (
    <Link to={"/swap"}>
      <div
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
    </Link>
  );
};

export const SkewedCarousel = () => {
  const { themeMode } = useThemeMode();

  const shuffledOracles = useMemo(() => {
    const entries = Object.entries(ResynthConfig.mainnet.oracles);
    const newArr = [];
    while (entries.length) {
      // Grab random entries
      const randomIndex = Math.floor(Math.random() * entries.length);
      const [element] = entries.splice(randomIndex, 1);
      if (!element) {
        console.log("oop");
        continue;
      }
      newArr.push(element);
    }
    return newArr;
  }, [ResynthConfig]);

  const synths = useMemo(() => {
    const newArr = [];

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
      // "class": "Crypto",
      // "oracle": "7jAVut34sgRj6erznsYvLYvjc9GJwXTpN88ThZSDJ65G",
      // "pair": "1INCH/USD",
      // "base": "USD",
      // "quote": "1INCH"

      // bg-${color}-100 px-2 text-xs font-medium text-${color}-800
      const attributes: {
        name: string;
        className: string;
      }[] = [
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
        <CarouselItem content={synth} attributes={attributes} key={synth} />
      );
    }
    return newArr;
  }, [shuffledOracles, themeMode]);

  return (
    <div
      className="flex h-screen w-screen items-center justify-center"
      style={{ transform: "rotate(0)" }}
    >
      <div className="relative w-full max-w-screen-lg overflow-hidden">
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

        <div className="mx-auto grid h-[500px] animate-skew-scroll grid-cols-1 gap-5 sm:grid-cols-3">
          {synths}
        </div>
      </div>
    </div>
  );
};
