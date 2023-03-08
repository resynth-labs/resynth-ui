/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  hoverOnlyWhenSupported: true,
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      animation: {
        "skew-scroll": "skew-scroll 280s linear infinite",
        "opacity-off": "opacity-off 0.25s linear",
        "opacity-on": "opacity-on 0.25s linear",
      },
      keyframes: {
        "skew-scroll": {
          "0%": {
            transform:
              "rotatex(20deg) rotateZ(-20deg) skewX(20deg) translateZ(0) translateY(0%)",
          },
          "100%": {
            transform:
              "rotatex(20deg) rotateZ(-20deg) skewX(20deg) translateZ(0) translateY(-1400%)",
          },
        },
        "opacity-off": {
          "0%": {
            opacity: "1",
          },
          "100%": {
            opacity: "0",
          },
        },
        "opacity-on": {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },
      },
    },
  },
  plugins: [],
};
