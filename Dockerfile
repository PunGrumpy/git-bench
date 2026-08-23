# Stage 1: Build the base environment with all system tools
FROM debian:bookworm-slim AS base

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Fail a RUN as soon as any stage of a pipe fails. The default shell is dash,
# which reports only the last command's exit status, so a truncated curl would
# bake a half-installed toolchain into the image and still exit 0.
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    ca-certificates \
    git \
    libgit2-dev \
    build-essential \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Rust & Cargo (required to compile gitoxide/gix)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install gitoxide (gix CLI)
RUN cargo install gitoxide --locked

# Install ziggit (prebuilt release binary — no Zig toolchain or source build needed)
ENV ZIGGIT_VERSION=v0.3.1
RUN curl -fsSL -o /usr/local/bin/ziggit \
      "https://github.com/hdresearch/ziggit/releases/download/${ZIGGIT_VERSION}/ziggit-linux-x86_64" && \
    chmod +x /usr/local/bin/ziggit

# Install Bun (pinned: the runtime version moves the Bun-hosted runners)
ENV BUN_VERSION=1.4.0
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}"
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps

# Copy workspaces configuration and package locks
COPY package.json bun.lock ./
COPY packages/bench/package.json ./packages/bench/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN bun install --frozen-lockfile

# Stage 3: Run the benchmark
FROM deps AS runner

# Copy all source files
COPY . .

# Ensure entrypoint script is executable
RUN chmod +x scripts/docker-entrypoint.sh packages/bench/scripts/clone-repo.sh

# Output directory volume for results.json
VOLUME /output

ENTRYPOINT ["/bin/bash", "scripts/docker-entrypoint.sh"]
