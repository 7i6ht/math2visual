import pkg from "../../package.json";

// Centralized backend URL configuration
// Reads base URL from frontend/package.json (proxy field), falls back to same-origin
const PACKAGE_PROXY = (pkg as any)?.proxy as string | undefined;
export const BACKEND_BASE_URL =
  (PACKAGE_PROXY && PACKAGE_PROXY.trim().replace(/\/$/, "")) || window.location.origin;

export const BACKEND_API_URL = `${BACKEND_BASE_URL}/api`;

export default {
  BACKEND_BASE_URL,
  BACKEND_API_URL,
};


