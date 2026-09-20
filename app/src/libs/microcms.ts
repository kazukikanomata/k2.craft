import { createClient } from "microcms-js-sdk";

export const client = createClient({
  serviceDomain: import.meta.env.MICROCMS_SERVICE_DOMAIN || "",
  apiKey: import.meta.env.MICROCMS_API_KEY || "",
});

export interface Settings {
  title: string;
  description: string;
  about: string;
}

const DEFAULT_SETTINGS: Settings = {
  title: "Set Your Title Here",
  description: "Set Your Description Here",
  about: "Set Your Text Here",
};

export const getSettings = async (): Promise<Settings> => {
  try {
    const data = await client.get({ endpoint: "settings" });
    return data as Settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
};
