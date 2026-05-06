import { NextResponse } from "next/server";
import fs from "fs";
import { LLMConfig } from "@/types/llm_config";

const userConfigPath = process.env.USER_CONFIG_PATH!;
const canChangeKeys = process.env.CAN_CHANGE_KEYS !== "false";
const AUTH_FIELDS = new Set([
  "AUTH_USERNAME",
  "AUTH_PASSWORD_HASH",
  "AUTH_SECRET_KEY",
]);

const ENV_CONFIG_KEYS: Array<keyof LLMConfig> = [
  "LLM",
  "OPENAI_API_KEY", "OPENAI_MODEL",
  "GOOGLE_API_KEY", "GOOGLE_MODEL",
  "VERTEX_API_KEY", "VERTEX_MODEL", "VERTEX_PROJECT", "VERTEX_LOCATION", "VERTEX_BASE_URL",
  "AZURE_OPENAI_API_KEY", "AZURE_OPENAI_MODEL", "AZURE_OPENAI_ENDPOINT",
  "AZURE_OPENAI_BASE_URL", "AZURE_OPENAI_API_VERSION", "AZURE_OPENAI_DEPLOYMENT",
  "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL",
  "OLLAMA_URL", "OLLAMA_MODEL",
  "CUSTOM_LLM_URL", "CUSTOM_LLM_API_KEY", "CUSTOM_MODEL",
  "IMAGE_PROVIDER", "PEXELS_API_KEY", "PIXABAY_API_KEY",
  "COMFYUI_URL", "COMFYUI_WORKFLOW",
  "OPEN_WEBUI_IMAGE_URL", "OPEN_WEBUI_IMAGE_API_KEY",
  "CUSTOM_IMAGE_URL", "CUSTOM_IMAGE_API_KEY", "CUSTOM_IMAGE_MODEL",
  "DALL_E_3_QUALITY", "GPT_IMAGE_1_5_QUALITY",
  "DISABLE_IMAGE_GENERATION", "DISABLE_THINKING", "EXTENDED_REASONING", "WEB_GROUNDING",
  "DISABLE_ANONYMOUS_TRACKING",
];

function buildConfigFromEnv(): LLMConfig {
  const config: Record<string, unknown> = {};
  for (const key of ENV_CONFIG_KEYS) {
    const value = process.env[key];
    if (value !== undefined && value !== "") {
      config[key] = value;
    }
  }
  return config as LLMConfig;
}

function stripAuthFields(config: Record<string, unknown>) {
  const sanitized = { ...config };
  for (const key of AUTH_FIELDS) {
    delete sanitized[key];
  }
  return sanitized;
}

function stripAuthFieldsFromIncoming(config: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(config).filter(([key]) => !AUTH_FIELDS.has(key))
  );
}

export async function GET() {
  if (!canChangeKeys) {
    return NextResponse.json({
      error: "You are not allowed to access this resource",
      status: 403,
    });
  }

  const envConfig = buildConfigFromEnv();

  let fileConfig: LLMConfig = {};
  if (userConfigPath && fs.existsSync(userConfigPath)) {
    try {
      const configData = fs.readFileSync(userConfigPath, "utf-8");
      fileConfig = JSON.parse(configData) as LLMConfig;
    } catch {
      // corrupted file — fall back to env only
    }
  }

  // env is the base; file values override (preserves user-saved form values)
  const merged = stripAuthFields({ ...envConfig, ...fileConfig } as Record<string, unknown>);
  return NextResponse.json(merged);
}

export async function POST(request: Request) {
  if (!canChangeKeys) {
    return NextResponse.json({
      error: "You are not allowed to access this resource",
    });
  }

  const userConfig = stripAuthFieldsFromIncoming(
    (await request.json()) as Record<string, unknown>
  ) as LLMConfig;
  let existingConfig: LLMConfig = {};
  if (userConfigPath && fs.existsSync(userConfigPath)) {
    try {
      const configData = fs.readFileSync(userConfigPath, "utf-8");
      existingConfig = JSON.parse(configData);
    } catch {
      // corrupted file — merge with empty base
    }
  }
  const definedIncomingEntries = Object.entries(userConfig).filter(
    ([, value]) => value !== undefined
  );
  const mergedConfig: LLMConfig = {
    ...existingConfig,
    ...Object.fromEntries(definedIncomingEntries),
    USE_CUSTOM_URL:
      userConfig.USE_CUSTOM_URL === undefined
        ? existingConfig.USE_CUSTOM_URL
        : userConfig.USE_CUSTOM_URL,
    OPEN_WEBUI_IMAGE_URL:
      userConfig.OPEN_WEBUI_IMAGE_URL || existingConfig.OPEN_WEBUI_IMAGE_URL,
    OPEN_WEBUI_IMAGE_API_KEY:
      userConfig.OPEN_WEBUI_IMAGE_API_KEY || existingConfig.OPEN_WEBUI_IMAGE_API_KEY,
    CODEX_MODEL: userConfig.CODEX_MODEL || existingConfig.CODEX_MODEL,
    CODEX_ACCESS_TOKEN: existingConfig.CODEX_ACCESS_TOKEN,
    CODEX_REFRESH_TOKEN: existingConfig.CODEX_REFRESH_TOKEN,
    CODEX_TOKEN_EXPIRES: existingConfig.CODEX_TOKEN_EXPIRES,
    CODEX_ACCOUNT_ID: existingConfig.CODEX_ACCOUNT_ID,
    CODEX_USERNAME: existingConfig.CODEX_USERNAME,
    CODEX_EMAIL: existingConfig.CODEX_EMAIL,
    CODEX_IS_PRO: existingConfig.CODEX_IS_PRO,
    DISABLE_IMAGE_GENERATION: Object.prototype.hasOwnProperty.call(
      userConfig,
      "DISABLE_IMAGE_GENERATION"
    )
      ? userConfig.DISABLE_IMAGE_GENERATION
      : existingConfig.DISABLE_IMAGE_GENERATION,
    DISABLE_ANONYMOUS_TRACKING: Object.prototype.hasOwnProperty.call(
      userConfig,
      "DISABLE_ANONYMOUS_TRACKING"
    )
      ? userConfig.DISABLE_ANONYMOUS_TRACKING
      : existingConfig.DISABLE_ANONYMOUS_TRACKING,
  };
  if (userConfigPath) {
    fs.writeFileSync(userConfigPath, JSON.stringify(mergedConfig));
  }
  return NextResponse.json(
    stripAuthFields(mergedConfig as Record<string, unknown>)
  );
}
