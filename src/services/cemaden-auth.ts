import axios from "axios";
import { config } from "../config/env";
import { CemadenAuthResponse, CemadenLoginCredentials } from "../types/cemaden";

export class CemadenAuthService {
  private static token: string | null = null;
  private static tokenExpiry: number | null = null;

  static async getToken(): Promise<string> {
    // Check if token is still valid (assume 1 hour validity)
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    const credentials: CemadenLoginCredentials = {
      email: config.cemaden.user,
      password: config.cemaden.password
    };

    try {
      const response = await axios.post<CemadenAuthResponse>(
        config.cemaden.apiTokenUrl,
        credentials
      );

      if (response.status === 200) {
        this.token = response.data.token;
        this.tokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour from now
        return this.token;
      } else {
        throw new Error(
          `Authentication failed with status: ${response.status}`
        );
      }
    } catch (error) {
      throw new Error("Failed to authenticate with CEMADEN API");
    }
  }

  static clearToken(): void {
    this.token = null;
    this.tokenExpiry = null;
  }
}
