# ─── Stage 1: Builder ───────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# ─── Stage 2: Production ────────────────────────────────────────────────────
FROM node:22-slim

# Install Python 3 and C/C++ compilers for local sandbox fallback
# (used when Judge0 API is unavailable or rate-limited)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    g++ \
    gcc \
    && rm -rf /var/lib/apt/lists/* \
    # Create 'python' alias so code using 'python' command works
    && ln -sf /usr/bin/python3 /usr/bin/python

# Create a restricted sandbox user (non-root, no login shell)
# This user runs the actual user code — limits damage if sandbox escapes
RUN groupadd --gid 1001 sandbox \
    && useradd --uid 1001 --gid sandbox --no-create-home --shell /sbin/nologin sandbox

WORKDIR /app

# Copy installed dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY . .

# Ensure /tmp exists and is writable by all (default on Linux, but explicit is better)
RUN mkdir -p /tmp && chmod 1777 /tmp

# Verify all required runtimes are installed and accessible
RUN node --version && \
    python3 --version && \
    g++ --version && \
    gcc --version

EXPOSE ${PORT:-5000}

# Run as the application (NOT as sandbox user — Node server needs full access)
# Individual exec() child processes are the ones we want to sandbox further
CMD ["node", "src/index.js"]
