import { useTheme } from "styled-components";

import { ColorPalette } from "../../styles/palette";

export const Document = ({
  color,
  size,
}: {
  color?: keyof ColorPalette;
  size?: string;
}) => {
  const { palette, font } = useTheme();

  return (
    <svg
      width={size || font.size.base}
      height={size || font.size.base}
      version="1.1"
      id="Layer_1"
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      viewBox="0 0 488.9 488.9"
      xmlSpace="preserve"
      fill={palette[color || "accent"]}
    >
      <g>
        <g>
          <g>
            <path
              d="M438.9,126.9L332.8,7.3c-4.2-5.2-9.4-7.3-15.6-7.3H65.5C54.1,0,44.7,9.4,44.7,20.8v447.3c0,11.4,9.4,20.8,20.8,20.8
				h357.9c11.4,0,19.8-9.4,20.8-19.8V140.5C444.1,135.3,442.1,131.1,438.9,126.9z M337,73.6l40.7,46.1H337V73.6z M402.5,448.4
				l-316.2,0V40.6h210.1v98.8c0,11.4,9.4,20.8,20.8,20.8h85.3V448.4z"
            />
            <path
              d="M136.2,235.1c0,11.4,9.4,20.8,20.8,20.8h174.8c11.4,0,20.8-9.4,20.8-20.8c0-11.4-9.4-20.8-20.8-20.8H157
				C145.6,214.3,136.2,223.7,136.2,235.1z"
            />
            <path
              d="M331.8,343.3H157c-11.4,0-20.8,9.4-20.8,20.8c0,11.4,9.4,20.8,20.8,20.8h174.8c11.4,0,20.8-9.4,20.8-20.8
				C352.6,352.7,343.2,343.3,331.8,343.3z"
            />
          </g>
        </g>
      </g>
    </svg>
  );
};
