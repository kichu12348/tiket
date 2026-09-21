import React from "react";

export default function GlassmorphismTicket({
  size = "100%",
  style = {},
}: {
  size?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      viewBox="150 10 330 500"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      <defs>
        <clipPath id="cardClip">
          <path d="M190,30 h220 a18,18 0 0 1 18,18 v16 a14,14 0 0 0 0,28 v174 a14,14 0 0 0 0,28 v162 a18,18 0 0 1 -18,18 h-220 a18,18 0 0 1 -18,-18 v-162 a14,14 0 0 0 0,-28 v-174 a14,14 0 0 0 0,-28 v-16 a18,18 0 0 1 18,-18 z" />
        </clipPath>
        <clipPath id="cardClipBack">
          <path d="M190,30 h220 a18,18 0 0 1 18,18 v16 a14,14 0 0 0 0,28 v174 a14,14 0 0 0 0,28 v162 a18,18 0 0 1 -18,18 h-220 a18,18 0 0 1 -18,-18 v-162 a14,14 0 0 0 0,-28 v-174 a14,14 0 0 0 0,-28 v-16 a18,18 0 0 1 18,-18 z" />
        </clipPath>

        <linearGradient id="glassBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
          <stop offset="45%" stopColor="rgba(220,230,255,0.12)" />
          <stop offset="100%" stopColor="rgba(180,200,240,0.08)" />
        </linearGradient>

        <linearGradient id="glassBodyBack" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="100%" stopColor="rgba(200,210,240,0.05)" />
        </linearGradient>

        <linearGradient id="topShine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.0)" />
          <stop offset="30%" stopColor="rgba(255,255,255,0.65)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
        </linearGradient>

        <linearGradient id="leftEdge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
        </linearGradient>

        <linearGradient id="diagShine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.0)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
        </linearGradient>

        <linearGradient id="dividerGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.0)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
        </linearGradient>

        <radialGradient id="bottomGlow" cx="50%" cy="100%" r="60%">
          <stop offset="0%" stopColor="rgba(160,180,255,0.15)" />
          <stop offset="100%" stopColor="rgba(160,180,255,0.0)" />
        </radialGradient>

        <filter id="glassBlur" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>

      <g
        transform="translate(22, 18) rotate(5, 300, 260)"
        style={{
          fill: "rgb(0, 0, 0)",
          stroke: "none",
          color: "rgb(255, 255, 255)",
          strokeWidth: "1px",
          strokeLinecap: "butt",
          strokeLinejoin: "miter",
          opacity: "1",
          fontFamily: "&quot",
          fontSize: "16px",
          fontWeight: "400",
          textAnchor: "start",
          dominantBaseline: "auto",
        }}
      >
        <path
          d="M190,30 h220 a18,18 0 0 1 18,18 v16 a14,14 0 0 0 0,28 v174 a14,14 0 0 0 0,28 v162 a18,18 0 0 1 -18,18 h-220 a18,18 0 0 1 -18,-18 v-162 a14,14 0 0 0 0,-28 v-174 a14,14 0 0 0 0,-28 v-16 a18,18 0 0 1 18,-18 z"
          fill="url(#glassBodyBack)"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1"
          style={{
            stroke: "rgba(255, 255, 255, 0.18)",
            color: "rgb(255, 255, 255)",
            strokeWidth: "1px",
            strokeLinecap: "butt",
            strokeLinejoin: "miter",
            opacity: "1",
            fontFamily: "&quot",
            fontSize: "16px",
            fontWeight: "400",
            textAnchor: "start",
            dominantBaseline: "auto",
          }}
        />
      </g>

      <g
        id="mainCard"
        style={{
          fill: "rgb(0, 0, 0)",
          stroke: "none",
          color: "rgb(255, 255, 255)",
          strokeWidth: "1px",
          strokeLinecap: "butt",
          strokeLinejoin: "miter",
          opacity: "1",
          fontFamily: "&quot",
          fontSize: "16px",
          fontWeight: "400",
          textAnchor: "start",
          dominantBaseline: "auto",
        }}
      >
        <path
          d="M190,30 h220 a18,18 0 0 1 18,18 v16 a14,14 0 0 0 0,28 v174 a14,14 0 0 0 0,28 v162 a18,18 0 0 1 -18,18 h-220 a18,18 0 0 1 -18,-18 v-162 a14,14 0 0 0 0,-28 v-174 a14,14 0 0 0 0,-28 v-16 a18,18 0 0 1 18,-18 z"
          fill="url(#glassBody)"
          stroke="rgba(255,255,255,0.38)"
          strokeWidth="1.2"
          style={{
            stroke: "rgba(255, 255, 255, 0.38)",
            color: "rgb(255, 255, 255)",
            strokeWidth: "1.2px",
            strokeLinecap: "butt",
            strokeLinejoin: "miter",
            opacity: "1",
            fontFamily: "&quot",
            fontSize: "16px",
            fontWeight: "400",
            textAnchor: "start",
            dominantBaseline: "auto",
          }}
        />

        <g
          clipPath="url(#cardClip)"
          style={{
            fill: "rgb(0, 0, 0)",
            stroke: "none",
            color: "rgb(255, 255, 255)",
            strokeWidth: "1px",
            strokeLinecap: "butt",
            strokeLinejoin: "miter",
            opacity: "1",
            fontFamily: "&quot",
            fontSize: "16px",
            fontWeight: "400",
            textAnchor: "start",
            dominantBaseline: "auto",
          }}
        >
          <rect
            x="172"
            y="30"
            width="336"
            height="460"
            fill="url(#bottomGlow)"
            style={{
              stroke: "none",
              color: "rgb(255, 255, 255)",
              strokeWidth: "1px",
              strokeLinecap: "butt",
              strokeLinejoin: "miter",
              opacity: "1",
              fontFamily: "&quot",
              fontSize: "16px",
              fontWeight: "400",
              textAnchor: "start",
              dominantBaseline: "auto",
            }}
          />
          <rect
            x="172"
            y="30"
            width="336"
            height="460"
            fill="url(#diagShine)"
            style={{
              stroke: "none",
              color: "rgb(255, 255, 255)",
              strokeWidth: "1px",
              strokeLinecap: "butt",
              strokeLinejoin: "miter",
              opacity: "1",
              fontFamily: "&quot",
              fontSize: "16px",
              fontWeight: "400",
              textAnchor: "start",
              dominantBaseline: "auto",
            }}
          />

          <rect
            x="172"
            y="30"
            width="336"
            height="3.5"
            fill="url(#topShine)"
            rx="2"
            style={{
              stroke: "none",
              color: "rgb(255, 255, 255)",
              strokeWidth: "1px",
              strokeLinecap: "butt",
              strokeLinejoin: "miter",
              opacity: "1",
              fontFamily: "&quot",
              fontSize: "16px",
              fontWeight: "400",
              textAnchor: "start",
              dominantBaseline: "auto",
            }}
          />
          <rect
            x="172"
            y="30"
            width="3.5"
            height="460"
            fill="url(#leftEdge)"
            style={{
              stroke: "none",
              color: "rgb(255, 255, 255)",
              strokeWidth: "1px",
              strokeLinecap: "butt",
              strokeLinejoin: "miter",
              opacity: "1",
              fontFamily: "&quot",
              fontSize: "16px",
              fontWeight: "400",
              textAnchor: "start",
              dominantBaseline: "auto",
            }}
          />

          <circle
            cx="172"
            cy="264"
            r="14"
            fill="rgba(0,0,0,0.55)"
            style={{
              fill: "rgba(0, 0, 0, 0.55)",
              stroke: "none",
              color: "rgb(255, 255, 255)",
              strokeWidth: "1px",
              strokeLinecap: "butt",
              strokeLinejoin: "miter",
              opacity: "1",
              fontFamily: "&quot",
              fontSize: "16px",
              fontWeight: "400",
              textAnchor: "start",
              dominantBaseline: "auto",
            }}
          />
          <circle
            cx="508"
            cy="264"
            r="14"
            fill="rgba(0,0,0,0.55)"
            style={{
              fill: "rgba(0, 0, 0, 0.55)",
              stroke: "none",
              color: "rgb(255, 255, 255)",
              strokeWidth: "1px",
              strokeLinecap: "butt",
              strokeLinejoin: "miter",
              opacity: "1",
              fontFamily: "&quot",
              fontSize: "16px",
              fontWeight: "400",
              textAnchor: "start",
              dominantBaseline: "auto",
            }}
          />
        </g>

        <path
          d="M190,30 h220 a18,18 0 0 1 18,18 v16 a14,14 0 0 0 0,28 v174 a14,14 0 0 0 0,28 v162 a18,18 0 0 1 -18,18 h-220 a18,18 0 0 1 -18,-18 v-162 a14,14 0 0 0 0,-28 v-174 a14,14 0 0 0 0,-28 v-16 a18,18 0 0 1 18,-18 z"
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="0.7"
          style={{
            fill: "none",
            stroke: "rgba(255, 255, 255, 0.55)",
            color: "rgb(255, 255, 255)",
            strokeWidth: "0.7px",
            strokeLinecap: "butt",
            strokeLinejoin: "miter",
            opacity: "1",
            fontFamily: "&quot",
            fontSize: "16px",
            fontWeight: "400",
            textAnchor: "start",
            dominantBaseline: "auto",
          }}
        />
        <path
          d="M190,30 h220 a18,18 0 0 1 18,18 v16 a14,14 0 0 0 0,28 v174 a14,14 0 0 0 0,28 v162 a18,18 0 0 1 -18,18 h-220 a18,18 0 0 1 -18,-18 v-162 a14,14 0 0 0 0,-28 v-174 a14,14 0 0 0 0,-28 v-16 a18,18 0 0 1 18,-18 z"
          fill="none"
          stroke="rgba(0,0,0,0.18)"
          strokeWidth="0.5"
          transform="translate(0.5,0.5)"
          style={{
            fill: "none",
            stroke: "rgba(0, 0, 0, 0.18)",
            color: "rgb(255, 255, 255)",
            strokeWidth: "0.5px",
            strokeLinecap: "butt",
            strokeLinejoin: "miter",
            opacity: "1",
            fontFamily: "&quot",
            fontSize: "16px",
            fontWeight: "400",
            textAnchor: "start",
            dominantBaseline: "auto",
          }}
        />
      </g>

      <text
        x="213"
        y="95"
        fontFamily="system-ui,-apple-system,sans-serif"
        fontSize="10"
        fontWeight="500"
        letterSpacing="0.13em"
        fill="rgba(255,255,255,0.5)"
        textAnchor="start"
        style={{
          fill: "rgba(255, 255, 255, 0.5)",
          stroke: "none",
          color: "rgb(255, 255, 255)",
          strokeWidth: "1px",
          strokeLinecap: "butt",
          strokeLinejoin: "miter",
          opacity: "1",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "10px",
          fontWeight: "500",
          textAnchor: "start",
          dominantBaseline: "auto",
        }}
      >
        GENERAL ADMISSION
      </text>

      <text
        x="213"
        y="143"
        fontFamily="system-ui,-apple-system,sans-serif"
        fontSize="38"
        fontWeight="700"
        fill="rgba(255,255,255,0.95)"
        letterSpacing="-0.02em"
        textAnchor="start"
        style={{
          fill: "rgba(255, 255, 255, 0.95)",
          stroke: "none",
          color: "rgb(255, 255, 255)",
          strokeWidth: "1px",
          strokeLinecap: "butt",
          strokeLinejoin: "miter",
          opacity: "1",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "38px",
          fontWeight: "700",
          textAnchor: "start",
          dominantBaseline: "auto",
        }}
      >
        Summer
      </text>
      <text
        x="213"
        y="182"
        fontFamily="system-ui,-apple-system,sans-serif"
        fontSize="38"
        fontWeight="700"
        fill="rgba(255,255,255,0.95)"
        letterSpacing="-0.02em"
        textAnchor="start"
        style={{
          fill: "rgba(255, 255, 255, 0.95)",
          stroke: "none",
          color: "rgb(255, 255, 255)",
          strokeWidth: "1px",
          strokeLinecap: "butt",
          strokeLinejoin: "miter",
          opacity: "1",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "38px",
          fontWeight: "700",
          textAnchor: "start",
          dominantBaseline: "auto",
        }}
      >
        Night Live
      </text>

      <text
        x="213"
        y="218"
        fontFamily="system-ui,-apple-system,sans-serif"
        fontSize="13.5"
        fontWeight="400"
        fill="rgba(255,255,255,0.62)"
        textAnchor="start"
        style={{
          fill: "rgba(255, 255, 255, 0.62)",
          stroke: "none",
          color: "rgb(255, 255, 255)",
          strokeWidth: "1px",
          strokeLinecap: "butt",
          strokeLinejoin: "miter",
          opacity: "1",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "13.5px",
          fontWeight: "400",
          textAnchor: "start",
          dominantBaseline: "auto",
        }}
      >
        Sat 24 Aug 2024 · 02:00 PM
      </text>
      <text
        x="213"
        y="238"
        fontFamily="system-ui,-apple-system,sans-serif"
        fontSize="13.5"
        fontWeight="400"
        fill="rgba(255,255,255,0.62)"
        textAnchor="start"
        style={{
          fill: "rgba(255, 255, 255, 0.62)",
          stroke: "none",
          color: "rgb(255, 255, 255)",
          strokeWidth: "1px",
          strokeLinecap: "butt",
          strokeLinejoin: "miter",
          opacity: "1",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "13.5px",
          fontWeight: "400",
          textAnchor: "start",
          dominantBaseline: "auto",
        }}
      >
        Skyline Arena Kochi
      </text>

      <text
        x="213"
        y="305"
        fontFamily="system-ui,-apple-system,sans-serif"
        fontSize="13"
        fontWeight="400"
        fill="rgba(255,255,255,0.48)"
        textAnchor="start"
        style={{
          fill: "rgba(255, 255, 255, 0.48)",
          stroke: "none",
          color: "rgb(255, 255, 255)",
          strokeWidth: "1px",
          strokeLinecap: "butt",
          strokeLinejoin: "miter",
          opacity: "1",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "13px",
          fontWeight: "400",
          textAnchor: "start",
          dominantBaseline: "auto",
        }}
      >
        An unforgettable evening of live
      </text>
      <text
        x="213"
        y="323"
        fontFamily="system-ui,-apple-system,sans-serif"
        fontSize="13"
        fontWeight="400"
        fill="rgba(255,255,255,0.48)"
        textAnchor="start"
        style={{
          fill: "rgba(255, 255, 255, 0.48)",
          stroke: "none",
          color: "rgb(255, 255, 255)",
          strokeWidth: "1px",
          strokeLinecap: "butt",
          strokeLinejoin: "miter",
          opacity: "1",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "13px",
          fontWeight: "400",
          textAnchor: "start",
          dominantBaseline: "auto",
        }}
      >
        performances, music, and moments
      </text>
      <text
        x="213"
        y="341"
        fontFamily="system-ui,-apple-system,sans-serif"
        fontSize="13"
        fontWeight="400"
        fill="rgba(255,255,255,0.48)"
        textAnchor="start"
        style={{
          fill: "rgba(255, 255, 255, 0.48)",
          stroke: "none",
          color: "rgb(255, 255, 255)",
          strokeWidth: "1px",
          strokeLinecap: "butt",
          strokeLinejoin: "miter",
          opacity: "1",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "13px",
          fontWeight: "400",
          textAnchor: "start",
          dominantBaseline: "auto",
        }}
      >
        that stay with you.
      </text>

      <text
        x="213"
        y="390"
        fontFamily="system-ui,-apple-system,sans-serif"
        fontSize="15"
        fontWeight="700"
        fill="rgba(255,255,255,0.9)"
        textAnchor="start"
        style={{
          fill: "rgba(255, 255, 255, 0.9)",
          stroke: "none",
          color: "rgb(255, 255, 255)",
          strokeWidth: "1px",
          strokeLinecap: "butt",
          strokeLinejoin: "miter",
          opacity: "1",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "15px",
          fontWeight: "700",
          textAnchor: "start",
          dominantBaseline: "auto",
        }}
      >
        See you there!
      </text>
    </svg>
  );
}
