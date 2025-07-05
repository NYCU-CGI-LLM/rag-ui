// src/lib/generators.ts

export const BETA_MODE = true;

// Type Definitions for RAG Configuration
export type ModuleType = 'parser' | 'chunker' | 'generator' | 'indexer';
export type ParameterType = 'string' | 'number' | 'boolean' | 'select';

export interface ParameterDefinition {
  id: string;
  name: string;
  type: ParameterType;
  defaultValue: string | number | boolean;
  options?: string[];
  description?: string;
  min?: number; // For number type
  max?: number; // For number type
  step?: number; // For number type
}

export interface Module {
  id: string;
  name: string;
  description?: string;
  type: ModuleType;
  parameters: ParameterDefinition[];
}

// OpenAI model token limits
export const MAX_TOKEN_DICT: { [key: string]: number } = {
    "gpt-4.5-preview": 128_000,
    "gpt-4.5-preview-2025-02-27": 128_000,
    "o1": 200_000,
    "o1-preview": 128_000,
    "o1-preview-2024-09-12": 128_000,
    "o1-mini": 128_000,
    "o1-mini-2024-09-12": 128_000,
    "o3-mini": 200_000,
    "gpt-4o-mini": 128_000,
    "gpt-4o-mini-2024-07-18": 128_000,
    "gpt-4o": 128_000,
    "gpt-4o-2024-08-06": 128_000,
    "gpt-4o-2024-05-13": 128_000,
    "chatgpt-4o-latest": 128_000,
    "gpt-4-turbo": 128_000,
    "gpt-4-turbo-2024-04-09": 128_000,
    "gpt-4-turbo-preview": 128_000,
    "gpt-4-0125-preview": 128_000,
    "gpt-4-1106-preview": 128_000,
    "gpt-4-vision-preview": 128_000,
    "gpt-4-1106-vision-preview": 128_000,
    "gpt-4": 8_192,
    "gpt-4-0613": 8_192,
    "gpt-4-32k": 32_768,
    "gpt-4-32k-0613": 32_768,
    "gpt-3.5-turbo-0125": 16_385,
    "gpt-3.5-turbo": 16_385,
    "gpt-3.5-turbo-1106": 16_385,
    "gpt-3.5-turbo-instruct": 4_096,
    "gpt-3.5-turbo-16k": 16_385,
    "gpt-3.5-turbo-0613": 4_096,
    "gpt-3.5-turbo-16k-0613": 16_385,
};

// OpenAI LLM models for evaluation
const ALL_OPENAI_LLM_MODELS_FOR_EVAL = [
  { id: "gpt-4o", name: "GPT-4o", description: "Most advanced multimodal model" },
  { id: "gpt-4o-mini", name: "GPT-4o mini", description: "Efficient and cost-effective model" },
  { id: "gpt-4-turbo", name: "GPT-4 turbo", description: "Enhanced GPT-4 with larger context" },
  { id: "gpt-4", name: "GPT-4", description: "High-quality language model" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 turbo", description: "Fast and efficient model" },
  { id: "o1-preview", name: "o1 preview", description: "Advanced reasoning model" },
  { id: "o1-mini", name: "o1 mini", description: "Reasoning model, smaller version" },
  { id: "o3-mini", name: "o3 mini", description: "A powerful and efficient model from o3 family." }
];

const BETA_OPENAI_LLM_MODELS_FOR_EVAL = ALL_OPENAI_LLM_MODELS_FOR_EVAL.filter(model => ["gpt-4o-mini", "gpt-4o", "o3-mini"].includes(model.id));
export const OPENAI_LLM_MODELS_FOR_EVAL = BETA_MODE ? BETA_OPENAI_LLM_MODELS_FOR_EVAL : ALL_OPENAI_LLM_MODELS_FOR_EVAL;

const ALL_OPENAI_MODELS_FOR_CHAT = Object.keys(MAX_TOKEN_DICT);
const BETA_OPENAI_MODELS_FOR_CHAT = ["gpt-4o-mini", "gpt-4o", "o3-mini"];
export const OPENAI_LLM_MODELS_FOR_CHAT = BETA_MODE ? BETA_OPENAI_MODELS_FOR_CHAT : ALL_OPENAI_MODELS_FOR_CHAT;

// Generator modules
export const GENERATOR_MODULES: Module[] = [
  {
    id: "openai_llm",
    name: "OpenAI LLM",
    type: "generator",
    description: "Generate responses using OpenAI language models.",
    parameters: [
      { 
        id: "llm", 
        name: "LLM Model", 
        type: "select", 
        defaultValue: "gpt-4o-mini", 
        options: OPENAI_LLM_MODELS_FOR_CHAT, // Use chat models for wider selection initially
        description: "OpenAI model to use for generation."
      },
      { 
        id: "max_tokens", 
        name: "Max Tokens", 
        type: "number", 
        defaultValue: 4096, 
        min: 1, 
        max: 200000, 
        step: 1,
        description: "Maximum number of tokens to generate. The actual limit will be dynamically set based on the selected model."
      },
      { 
        id: "temperature", 
        name: "Temperature", 
        type: "number", 
        defaultValue: 0.7, 
        min: 0.0, 
        max: 2.0, 
        step: 0.1,
        description: "Controls randomness in generation."
      },
      { 
        id: "top_p", 
        name: "Top P", 
        type: "number", 
        defaultValue: 1.0, 
        min: 0.0, 
        max: 1.0, 
        step: 0.01,
        description: "Controls diversity via nucleus sampling."
      },
      { 
        id: "batch", 
        name: "Batch Size", 
        type: "number", 
        defaultValue: 16, 
        min: 1, 
        max: 128, 
        step: 1,
        description: "Number of requests to process in parallel."
      }
    ]
  },
  {
    id: "vllm",
    name: "vLLM",
    type: "generator",
    description: "Generate responses using vLLM for high-performance inference.",
    parameters: [
      { 
        id: "llm", 
        name: "LLM Model", 
        type: "string", 
        defaultValue: "meta-llama/Llama-2-7b-chat-hf",
        description: "Model name or path for vLLM."
      },
      { 
        id: "max_tokens", 
        name: "Max Tokens", 
        type: "number", 
        defaultValue: 256, 
        min: 1, 
        max: 4096, 
        step: 1,
        description: "Maximum number of tokens to generate."
      },
      { 
        id: "temperature", 
        name: "Temperature", 
        type: "number", 
        defaultValue: 0.7, 
        min: 0.0, 
        max: 2.0, 
        step: 0.1,
        description: "Controls randomness in generation."
      }
    ]
  },
  {
    id: "vllm_api",
    name: "vLLM API",
    type: "generator",
    description: "Generate responses using vLLM API endpoint.",
    parameters: [
      { 
        id: "llm", 
        name: "LLM Model", 
        type: "string", 
        defaultValue: "meta-llama/Llama-2-7b-chat-hf",
        description: "Model name for vLLM API."
      },
      { 
        id: "max_tokens", 
        name: "Max Tokens", 
        type: "number", 
        defaultValue: 256, 
        min: 1, 
        max: 4096, 
        step: 1,
        description: "Maximum number of tokens to generate."
      },
      { 
        id: "temperature", 
        name: "Temperature", 
        type: "number", 
        defaultValue: 0.7, 
        min: 0.0, 
        max: 2.0, 
        step: 0.1,
        description: "Controls randomness in generation."
      }
    ]
  },
  {
    id: "llama_index_llm",
    name: "LlamaIndex LLM",
    type: "generator",
    description: "Generate responses using LlamaIndex LLM framework.",
    parameters: [
      { 
        id: "llm", 
        name: "LLM Model", 
        type: "string", 
        defaultValue: "gpt-3.5-turbo",
        description: "Model name for LlamaIndex LLM."
      },
      { 
        id: "max_tokens", 
        name: "Max Tokens", 
        type: "number", 
        defaultValue: 256, 
        min: 1, 
        max: 4096, 
        step: 1,
        description: "Maximum number of tokens to generate."
      },
      { 
        id: "temperature", 
        name: "Temperature", 
        type: "number", 
        defaultValue: 0.7, 
        min: 0.0, 
        max: 2.0, 
        step: 0.1,
        description: "Controls randomness in generation."
      }
    ]
  }
];

// This is for the chat page which has a different structure
export const GENERATOR_PARAM_DEFINITIONS: { [generatorId: string]: ParameterDefinition[] } = 
  GENERATOR_MODULES.reduce((acc, module) => {
    acc[module.id] = module.parameters;
    return acc;
  }, {} as { [generatorId: string]: ParameterDefinition[] });

// Special override for chat page's OpenAI LLM models
GENERATOR_PARAM_DEFINITIONS['openai_llm'].find(p => p.id === 'llm')!.options = OPENAI_LLM_MODELS_FOR_CHAT; 