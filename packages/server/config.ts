interface Config {
  openaiApiKey?: string;
  anthropicApiKey?: string;
}

const config: Config = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
};

export default config;
