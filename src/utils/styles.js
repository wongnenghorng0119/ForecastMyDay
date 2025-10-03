// Responsive breakpoints
export const breakpoints = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px',
  large: '1200px'
};

// Media query helpers
export const mediaQueries = {
  mobile: `@media (max-width: ${breakpoints.mobile})`,
  tablet: `@media (max-width: ${breakpoints.tablet})`,
  desktop: `@media (min-width: ${breakpoints.desktop})`,
  large: `@media (min-width: ${breakpoints.large})`
};

// Responsive button styles
export const btn = (bg) => ({
  padding: "6px 10px",
  borderRadius: 8,
  border: 0,
  cursor: "pointer",
  background: bg,
  color: "#fff",
  fontSize: "14px",
  fontWeight: 500,
  transition: "all 0.2s ease",
  minHeight: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
  whiteSpace: "nowrap",
  // Mobile responsive
  [`@media (max-width: ${breakpoints.mobile})`]: {
    padding: "8px 12px",
    fontSize: "12px",
    minHeight: "36px"
  }
});

// Responsive pill styles
export const pill = () => ({
  background: "rgba(0,0,0,0.45)",
  padding: "6px 10px",
  borderRadius: 8,
  fontSize: "14px",
  whiteSpace: "nowrap",
  // Mobile responsive
  [`@media (max-width: ${breakpoints.mobile})`]: {
    padding: "8px 12px",
    fontSize: "12px"
  }
});

// Responsive input styles
export const input = () => ({
  width: "240px",
  padding: "6px 10px",
  borderRadius: 8,
  border: 0,
  outline: "none",
  background: "rgba(255,255,255,0.15)",
  color: "#fff",
  fontSize: "14px",
  transition: "all 0.2s ease",
  // Mobile responsive
  [`@media (max-width: ${breakpoints.tablet})`]: {
    width: "200px",
    fontSize: "12px"
  },
  [`@media (max-width: ${breakpoints.mobile})`]: {
    width: "160px",
    padding: "8px 12px",
    fontSize: "12px"
  }
});

// Responsive number input styles
export const numInput = () => ({
  width: "64px",
  marginLeft: 6,
  padding: "6px 8px",
  borderRadius: 8,
  border: 0,
  outline: "none",
  background: "rgba(255,255,255,0.15)",
  color: "#fff",
  fontSize: "14px",
  textAlign: "center",
  // Mobile responsive
  [`@media (max-width: ${breakpoints.mobile})`]: {
    width: "56px",
    padding: "8px 6px",
    fontSize: "12px",
    marginLeft: 4
  }
});

// Responsive container styles
export const responsiveContainer = () => ({
  width: "100%",
  height: "100%",
  position: "relative",
  // Mobile adjustments
  [`@media (max-width: ${breakpoints.mobile})`]: {
    minHeight: "100vh"
  }
});

// Responsive panel styles
export const responsivePanel = (position = "absolute") => ({
  position,
  zIndex: 2147483647,
  padding: "12px",
  borderRadius: 10,
  background: "rgba(0,0,0,0.55)",
  color: "#fff",
  fontFamily: "system-ui",
  backdropFilter: "blur(6px)",
  border: "1px solid rgba(255,255,255,0.12)",
  // Mobile responsive
  [`@media (max-width: ${breakpoints.tablet})`]: {
    padding: "10px",
    borderRadius: 8
  },
  [`@media (max-width: ${breakpoints.mobile})`]: {
    padding: "8px",
    borderRadius: 6,
    fontSize: "12px"
  }
});

// Responsive flex container
export const responsiveFlex = (direction = "row", gap = 8) => ({
  display: "flex",
  flexDirection: direction,
  gap: `${gap}px`,
  alignItems: "center",
  // Mobile responsive
  [`@media (max-width: ${breakpoints.mobile})`]: {
    flexDirection: direction === "row" ? "column" : direction,
    gap: `${Math.max(4, gap - 2)}px`,
    alignItems: "stretch"
  }
});