import { motion } from "framer-motion";

const VARIANTS = {
  primary: {
    base: {
      backgroundColor: "#6366f1",
      color: "#ffffff",
      border: "none",
    },
    hover: {
      backgroundColor: "#818cf8",
    },
  },
  secondary: {
    base: {
      backgroundColor: "transparent",
      color: "#6366f1",
      border: "1px solid #6366f1",
    },
    hover: {
      backgroundColor: "#6366f133",
    },
  },
  danger: {
    base: {
      backgroundColor: "#ef4444",
      color: "#ffffff",
      border: "none",
    },
    hover: {
      backgroundColor: "#f87171",
    },
  },
  ghost: {
    base: {
      backgroundColor: "transparent",
      color: "#94a3b8",
      border: "none",
    },
    hover: {
      backgroundColor: "#1e1e2e",
      color: "#f8fafc",
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
            border: "2px solid rgba(255,255,255,0.3)",
            borderTop: "2px solid #ffffff",
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
