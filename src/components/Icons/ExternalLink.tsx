import { useTheme } from "styled-components";

import { ColorPalette } from "../../styles/palette";

export const ExternalLink = ({
  color,
  size,
}: {
  color?: keyof ColorPalette;
  size?: string;
}) => {
  const { palette, font } = useTheme();

  return (
    <svg
      width={size || font.size.lg}
      height={size || font.size.lg}
      viewBox="0 0 32.822 32.822"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g id="Lager_80" data-name="Lager 80" transform="translate(0 0.822)">
        <path
          id="Path_89"
          data-name="Path 89"
          d="M24,22v5a1,1,0,0,1-1,1H5a1,1,0,0,1-1-1V9A1,1,0,0,1,5,8h5a2,2,0,0,0,2-2h0a2,2,0,0,0-2-2H3A3,3,0,0,0,0,7V29a3,3,0,0,0,3,3H25a3,3,0,0,0,3-3V22a2,2,0,0,0-2-2h0A2,2,0,0,0,24,22Z"
          fill={palette[color || "accent"]}
        />
        <rect
          id="Rectangle_40"
          data-name="Rectangle 40"
          width="16"
          height="4"
          rx="2"
          transform="translate(16 0)"
          fill={palette[color || "accent"]}
        />
        <rect
          id="Rectangle_41"
          data-name="Rectangle 41"
          width="16"
          height="4"
          rx="2"
          transform="translate(32 0) rotate(90)"
          fill={palette[color || "accent"]}
        />
        <g id="Group_37" data-name="Group 37">
          <rect
            id="Rectangle_42"
            data-name="Rectangle 42"
            width="32.296"
            height="3.971"
            rx="1.986"
            transform="translate(7.178 22.014) rotate(-45)"
            fill={palette[color || "accent"]}
          />
        </g>
      </g>
    </svg>
  );
};
