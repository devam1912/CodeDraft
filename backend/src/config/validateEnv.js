const REQUIRED_ENV_VARS = [
  "PORT",
  "MONGODB_URI",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "CLIENT_URL",
];

const validateEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter(
    (envVar) => !process.env[envVar] || process.env[envVar].trim() === ""
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }



  const port = parseInt(process.env.PORT, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid number between 1 and 65535");
  }
};

module.exports = validateEnv;
