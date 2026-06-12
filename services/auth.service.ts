import { api } from "@/lib/api";
import { mapUser } from "@/lib/mappers";
import type { AuthResponse, User } from "@/types";

type AuthPayload = {
  user: {
    id: string;
    email: string;
    name: string | null;
    role?: string;
    createdAt: string;
  };
  accessToken: string;
};

export const authService = {
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthPayload>("/auth/register", { email, password, name });
    return { user: mapUser(data.user), token: data.accessToken };
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthPayload>("/auth/login", { email, password });
    return { user: mapUser(data.user), token: data.accessToken };
  },

  async me(): Promise<User> {
    const { data } = await api.get<{ user: AuthPayload["user"] }>("/auth/me");
    return mapUser(data.user);
  },

  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },
};
