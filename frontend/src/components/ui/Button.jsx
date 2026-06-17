import { motion } from "framer-motion";

const VARIANTS = {
  primary: {
    base: {
      backgroundColor: "#6a45ab",
      color: "#eee8f5",
      border: "none",
    },
    hover: {
      backgroundColor: "#7e5dbd",
    },
  },
  secondary: {
    base: {
      backgroundColor: "transparent",
      color: "#b49fdb",
      border: "1px solid #7e5dbd",
    },
    hover: {
      backgroundColor: "rgba(126, 93, 189, 0.15)",
    },
  },
  danger: {
    base: {
      backgroundColor: "#c75c4a",
      color: "#eee8f5",
      border: "none",
    },
    hover: {
      backgroundColor: "#d4715f",
    },
  },
  ghost: {
    base: {
      backgroundColor: "transparent",
      color: "#a99bc2",
      border: "none",
    },
    hover: {
      backgroundColor: "#2a1845",
      color: "#eee8f5",
    },
  },
};

const SIZES = {
  sm: { padding: "8px 16px", fontSize: "13px", height: "36px" },
  md: { padding: "10px 24px", fontSize: "14px", height: "44px" },
  lg: { padding: "14px 32px", fontSize: "16px", height: "52px" },
};

function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  type = "button",
  style: customStyle = {},
  ...props
}) {
  const variantStyle = VARIANTS[variant] || VARIANTS.primary;
  const sizeStyle = SIZES[size] || SIZES.md;

  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    borderRadius: "8px",
    fontWeight: 600,
    fontFamily: "Inter, system-ui, sans-serif",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "all 0.2s ease",
    width: fullWidth ? "100%" : "auto",
    letterSpacing: "0.01em",
    ...variantStyle.base,
    ...sizeStyle,
    ...customStyle,
  };

  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.01, filter: "brightness(1.1)" } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      style={baseStyle}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: "18px",
            height: "18px",
            border: "2px solid rgba(238,232,245,0.3)",
            borderTop: "2px solid #eee8f5",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      ) : (
        children
      )}
    </motion.button>
  );
}

export default Button;
