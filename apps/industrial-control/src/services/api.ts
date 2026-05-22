import axios from "axios";
import { z } from "zod";

const ApiResponse = z.object({
  success: z.boolean(),
  data: z.any().optional(),
});

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
});

export async function fetchTelemetry() {
  const response = await apiClient.get("/telemetry");
  return ApiResponse.parse(response.data);
}
