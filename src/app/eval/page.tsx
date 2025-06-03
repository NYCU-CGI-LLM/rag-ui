'use client'
import { useState, useEffect } from "react";
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// API Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// API Response Interfaces for Parser Data
interface ApiParserParameterValue {
  [key: string]: string | number | boolean;
}

interface ApiParserEntry {
  id: string;
  name: string;
  module_type: string;
  supported_mime: string[];
  params: ApiParserParameterValue;
  status: string;
  description?: string;
}

interface ApiParserListResponse {
  total: number;
  parsers: ApiParserEntry[];
}

// API Response Interfaces for Chunker Data  
interface ApiChunkerEntry {
  id: string;
  name: string;
  module_type: string;
  chunk_method: string;
  chunk_size: number | null;
  chunk_overlap: number | null;
  params: ApiParserParameterValue;
  status: string;
  description?: string;
}

interface ApiChunkerListResponse {
  total: number;
  chunkers: ApiChunkerEntry[];
}

// New Type Definitions for RAG Configuration
type ModuleType = 'parser' | 'chunker' | 'retriever' | 'generator';
type ParameterType = 'string' | 'number' | 'boolean' | 'select';

interface ParameterDefinition {
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

interface Module {
  id: string;
  name: string;
  description?: string;
  type: ModuleType;
  parameters: ParameterDefinition[];
}

interface SelectedModuleConfig {
  moduleId: string;
  parameterValues: { [paramId: string]: string | number | boolean };
}

// Renamed RAGSystem to RAGConfig, now focused on preprocessing and retrieval only
interface RAGConfig {
  id: string;
  name: string;
  description: string;
  parser: SelectedModuleConfig;
  chunker: SelectedModuleConfig;
  retriever: SelectedModuleConfig;
  // generator removed - will be selected separately in evaluation
  availableMetrics: Metric[]; // This remains for now
}

interface Metric {
  id: string;
  name: string;
  category: 'Retrieval' | 'Retrieval Token' | 'Generation';
}

interface Source {
  id: string;
  name: string;
  description: string;
  type: 'benchmark' | 'library';
  supported_metrics?: Metric[];
}

interface LibraryStub {
  id: string;
  name: string;
  description: string;
}

interface EvaluationResultsMetric {
  metric: string;
  value: number;
  unit?: string;
}

interface EvaluationResults {
  systemId: string;
  sourceId: string;
  startTime: Date;
  endTime?: Date;
  metrics: EvaluationResultsMetric[];
  status: "running" | "completed" | "failed";
}

const ALL_METRICS: { [key: string]: Metric } = {
  // Retrieval Metrics
  recall: { id: "recall", name: "Recall", category: "Retrieval" as const },
  precision: { id: "precision", name: "Precision", category: "Retrieval" as const },
  f1: { id: "f1", name: "F1", category: "Retrieval" as const },
  map: { id: "map", name: "mAP", category: "Retrieval" as const },
  mrr: { id: "mrr", name: "mRR", category: "Retrieval" as const },
  ndcg: { id: "ndcg", name: "NDCG", category: "Retrieval" as const },
  // Retrieval Token Metrics
  token_recall: { id: "token_recall", name: "Token Recall", category: "Retrieval Token" as const },
  token_precision: { id: "token_precision", name: "Token Precision", category: "Retrieval Token" as const },
  token_f1: { id: "token_f1", name: "Token F1", category: "Retrieval Token" as const },
  // Generation Metrics
  bleu: { id: "bleu", name: "BLEU", category: "Generation" as const },
  rouge: { id: "rouge", name: "ROUGE", category: "Generation" as const },
  meteor: { id: "meteor", name: "METEOR", category: "Generation" as const },
  bert_score: { id: "bert_score", name: "Bert Score", category: "Generation" as const },
  geval_coherence: { id: "geval_coherence", name: "G-Eval Coherence", category: "Generation" as const },
  geval_consistency: { id: "geval_consistency", name: "G-Eval Consistency", category: "Generation" as const },
  geval_fluency: { id: "geval_fluency", name: "G-Eval Fluency", category: "Generation" as const },
  geval_relevance: { id: "geval_relevance", name: "G-Eval Relevance", category: "Generation" as const },
  sem_score: { id: "sem_score", name: "Sem Score", category: "Generation" as const },
  // Other common metrics (can be adjusted/removed if not fitting the new structure)
  response_time: { id: "response_time", name: "Response Time", category: "Generation" as const },
  exact_match: { id: "exact_match", name: "Exact Match (EM)", category: "Generation" as const },
  answer_f1_score: { id: "answer_f1_score", name: "Answer F1 Score", category: "Generation" as const },
  answer_recall: { id: "answer_recall", name: "Answer Recall", category: "Generation" as const },
  hallucination_rate: { id: "hallucination_rate", name: "Hallucination Rate", category: "Generation" as const },
  overall_quality_score: {id: "overall_quality_score", name: "Overall Quality Score", category: "Generation" as const },
  groundedness: {id: "groundedness", name: "Groundedness", category: "Generation" as const },
  toxicity_rate: {id: "toxicity_rate", name: "Toxicity Rate", category: "Generation" as const },
};

const DEFAULT_LIBRARY_METRICS_OBJECTS: Metric[] = [
  ALL_METRICS.recall, 
  ALL_METRICS.precision, 
  ALL_METRICS.response_time,
];

// OpenAI model token limits
const MAX_TOKEN_DICT: { [key: string]: number } = {
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

// Sample Available Modules - Updated to match AutoRAG actual configurations
const AVAILABLE_MODULES: { [key in ModuleType]: Module[] } = {
  parser: [
    { 
      id: "langchain_parse", 
      name: "LangChain Parse", 
      type: "parser",
      description: "Parse documents using LangChain parsers.",
      parameters: [
        { 
          id: "parse_method", 
          name: "Parse Method", 
          type: "select", 
          defaultValue: "pdfminer", 
          options: ["pdfminer"],
          description: "Method to parse PDF documents." 
        }
      ]
    }
  ],
  chunker: [
    {
      id: "llama_index_chunk",
      name: "LlamaIndex Chunk",
      type: "chunker",
      description: "Chunk documents using LlamaIndex chunking methods.",
      parameters: [
        { 
          id: "chunk_method", 
          name: "Chunk Method", 
          type: "select", 
          defaultValue: "Token", 
          options: ["Token"],
          description: "Method to chunk the documents."
        },
        { 
          id: "chunk_size", 
          name: "Chunk Size", 
          type: "number", 
          defaultValue: 1024, 
          min: 100, 
          max: 4096, 
          step: 1,
          description: "Size of each chunk in tokens."
        },
        { 
          id: "chunk_overlap", 
          name: "Chunk Overlap", 
          type: "number", 
          defaultValue: 24, 
          min: 0, 
          max: 512, 
          step: 1,
          description: "Number of overlapping tokens between chunks."
        },
        { 
          id: "add_file_name", 
          name: "Add File Name", 
          type: "select", 
          defaultValue: "en", 
          options: ["en"],
          description: "Language setting for file name addition."
        }
      ]
    }
  ],
  retriever: [
    {
      id: "bm25",
      name: "BM25",
      type: "retriever",
      description: "Keyword-based sparse retriever using BM25 algorithm.",
      parameters: [
        { 
          id: "top_k", 
          name: "Top K", 
          type: "number", 
          defaultValue: 5, 
          min: 1, 
          max: 50, 
          step: 1,
          description: "Number of top documents to retrieve."
        },
        { 
          id: "bm25_tokenizer", 
          name: "BM25 Tokenizer", 
          type: "select", 
          defaultValue: "porter_stemmer", 
          options: [
            "porter_stemmer", 
            "space", 
            "ko_kiwi", 
            "ko_kkma", 
            "ko_okt", 
            "sudachipy", 
            "bge-m3", 
            "bert-base-chinese"
          ],
          description: "Tokenizer for BM25 processing."
        }
      ]
    },
    {
      id: "vectordb",
      name: "Vector DB",
      type: "retriever",
      description: "Dense retriever using vector embeddings and vector database.",
      parameters: [
        { 
          id: "top_k", 
          name: "Top K", 
          type: "number", 
          defaultValue: 5, 
          min: 1, 
          max: 50, 
          step: 1,
          description: "Number of top documents to retrieve."
        },
        { 
          id: "vectordb", 
          name: "Vector Database", 
          type: "select", 
          defaultValue: "chroma", 
          options: ["chroma", "FAISS", "pinecone"],
          description: "Vector database to use for storage and retrieval."
        },
        { 
          id: "embedding_model", 
          name: "Embedding Model", 
          type: "select", 
          defaultValue: "OpenAI Embedding API", 
          options: ["OpenAI Embedding API", "HuggingFace embedding models", "LlamaIndex"],
          description: "Model to generate embeddings."
        },
        { 
          id: "embedding_batch", 
          name: "Embedding Batch Size", 
          type: "number", 
          defaultValue: 128, 
          min: 1, 
          max: 1024, 
          step: 1,
          description: "Batch size for embedding generation."
        },
        { 
          id: "similarity_metric", 
          name: "Similarity Metric", 
          type: "select", 
          defaultValue: "cosine", 
          options: ["cosine", "ip", "l2"],
          description: "Metric to calculate similarity between vectors."
        }
      ]
    },
    {
      id: "hybrid_rrf",
      name: "Hybrid RRF",
      type: "retriever",
      description: "Hybrid retriever using Reciprocal Rank Fusion.",
      parameters: [
        { 
          id: "top_k", 
          name: "Top K", 
          type: "number", 
          defaultValue: 5, 
          min: 1, 
          max: 50, 
          step: 1,
          description: "Number of top documents to retrieve."
        },
        { 
          id: "weight", 
          name: "Weight (Semantic/Lexical)", 
          type: "number", 
          defaultValue: 0.5, 
          min: 0.0, 
          max: 1.0, 
          step: 0.1,
          description: "Weight balance between semantic and lexical retrieval."
        }
      ]
    },
    {
      id: "hybrid_cc",
      name: "Hybrid CC",
      type: "retriever",
      description: "Hybrid retriever using Convex Combination.",
      parameters: [
        { 
          id: "normalize_method", 
          name: "Normalize Method", 
          type: "select", 
          defaultValue: "mm", 
          options: ["mm", "tmm", "z", "dbsf"],
          description: "Method to normalize scores."
        },
        { 
          id: "semantic_theoretical_min_value", 
          name: "Semantic Theoretical Min Value", 
          type: "number", 
          defaultValue: 0.0, 
          min: 0.0, 
          max: 1.0, 
          step: 0.01,
          description: "Theoretical minimum value for semantic scores (used with tmm)."
        },
        { 
          id: "lexical_theoretical_min_value", 
          name: "Lexical Theoretical Min Value", 
          type: "number", 
          defaultValue: 0.0, 
          min: 0.0, 
          max: 1.0, 
          step: 0.01,
          description: "Theoretical minimum value for lexical scores (used with tmm)."
        },
        { 
          id: "weight", 
          name: "Weight (Semantic/Lexical)", 
          type: "number", 
          defaultValue: 0.5, 
          min: 0.0, 
          max: 1.0, 
          step: 0.1,
          description: "Weight balance between semantic and lexical retrieval."
        }
      ]
    }
  ],
  generator: [
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
          options: [
            "gpt-4.5-preview",
            "gpt-4.5-preview-2025-02-27",
            "o1",
            "o1-preview",
            "o1-preview-2024-09-12",
            "o1-mini",
            "o1-mini-2024-09-12",
            "o3-mini",
            "gpt-4o-mini",
            "gpt-4o-mini-2024-07-18",
            "gpt-4o",
            "gpt-4o-2024-08-06",
            "gpt-4o-2024-05-13",
            "chatgpt-4o-latest",
            "gpt-4-turbo",
            "gpt-4-turbo-2024-04-09",
            "gpt-4-turbo-preview",
            "gpt-4-0125-preview",
            "gpt-4-1106-preview",
            "gpt-4-vision-preview",
            "gpt-4-1106-vision-preview",
            "gpt-4",
            "gpt-4-0613",
            "gpt-4-32k",
            "gpt-4-32k-0613",
            "gpt-3.5-turbo-0125",
            "gpt-3.5-turbo",
            "gpt-3.5-turbo-1106",
            "gpt-3.5-turbo-instruct",
            "gpt-3.5-turbo-16k",
            "gpt-3.5-turbo-0613",
            "gpt-3.5-turbo-16k-0613"
          ],
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
        }
      ]
    },
    {
      id: "vllm",
      name: "vLLM",
      type: "generator",
      description: "Generate responses using vLLM for efficient inference.",
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
      description: "Generate responses using LlamaIndex LLM integration.",
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
  ]
};

// Utility function to format parameter names from snake_case to Title Case
const formatParamName = (id: string): string => {
  return id
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Utility function to infer parameter type from value
const inferParameterType = (value: string | number | boolean): ParameterType => {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
};

// Transform API parser data to Module format
const transformApiParsersToModules = (apiParsers: ApiParserEntry[]): Module[] => {
  return apiParsers.map(apiParser => {
    // Try to find a static template for this module type
    const staticTemplate = AVAILABLE_MODULES.parser.find(p => p.id === apiParser.module_type);
    
    const parameters: ParameterDefinition[] = [];
    const processedParamIds = new Set<string>();

    // If we have a static template, use its parameter definitions as base
    if (staticTemplate) {
      staticTemplate.parameters.forEach(staticParam => {
        const apiValue = apiParser.params[staticParam.id];
        parameters.push({
          ...staticParam,
          defaultValue: apiValue !== undefined ? apiValue : staticParam.defaultValue
        });
        processedParamIds.add(staticParam.id);
      });
    }

    // Add any additional parameters from API that weren't in the static template
    Object.entries(apiParser.params).forEach(([key, value]) => {
      if (!processedParamIds.has(key)) {
        parameters.push({
          id: key,
          name: formatParamName(key),
          type: inferParameterType(value),
          defaultValue: value,
          description: `${formatParamName(key)} parameter`
        });
      }
    });

    return {
      id: apiParser.id, // Use the UUID from API
      name: apiParser.name,
      description: apiParser.description || `${apiParser.module_type} parser`,
      type: 'parser' as const,
      parameters
    };
  });
};

// Transform API chunker data to Module format
const transformApiChunkersToModules = (apiChunkers: ApiChunkerEntry[]): Module[] => {
  return apiChunkers.map(apiChunker => {
    // Try to find a static template for this module type
    const staticTemplate = AVAILABLE_MODULES.chunker.find(c => c.id === apiChunker.module_type);
    
    const parameters: ParameterDefinition[] = [];
    const processedParamIds = new Set<string>();

    // Add chunk_method parameter (always present for chunkers)
    parameters.push({
      id: 'chunk_method',
      name: 'Chunk Method',
      type: 'string',
      defaultValue: apiChunker.chunk_method,
      description: 'Method used for chunking'
    });
    processedParamIds.add('chunk_method');

    // Add chunk_size parameter if available
    if (apiChunker.chunk_size !== null) {
      parameters.push({
        id: 'chunk_size',
        name: 'Chunk Size',
        type: 'number',
        defaultValue: apiChunker.chunk_size,
        min: 100,
        max: 4096,
        step: 1,
        description: 'Size of each chunk in tokens'
      });
      processedParamIds.add('chunk_size');
    }

    // Add chunk_overlap parameter if available
    if (apiChunker.chunk_overlap !== null) {
      parameters.push({
        id: 'chunk_overlap',
        name: 'Chunk Overlap',
        type: 'number',
        defaultValue: apiChunker.chunk_overlap,
        min: 0,
        max: 512,
        step: 1,
        description: 'Number of overlapping tokens between chunks'
      });
      processedParamIds.add('chunk_overlap');
    }

    // If we have a static template, use its parameter definitions as base for remaining params
    if (staticTemplate) {
      staticTemplate.parameters.forEach(staticParam => {
        if (!processedParamIds.has(staticParam.id)) {
          const apiValue = apiChunker.params[staticParam.id];
          parameters.push({
            ...staticParam,
            defaultValue: apiValue !== undefined ? apiValue : staticParam.defaultValue
          });
          processedParamIds.add(staticParam.id);
        }
      });
    }

    // Add any additional parameters from API that weren't processed yet
    Object.entries(apiChunker.params).forEach(([key, value]) => {
      if (!processedParamIds.has(key)) {
        parameters.push({
          id: key,
          name: formatParamName(key),
          type: inferParameterType(value),
          defaultValue: value,
          description: `${formatParamName(key)} parameter`
        });
      }
    });

    return {
      id: apiChunker.id, // Use the UUID from API
      name: apiChunker.name,
      description: apiChunker.description || `${apiChunker.module_type} chunker (${apiChunker.chunk_method})`,
      type: 'chunker' as const,
      parameters
    };
  });
};

function EvaluationInterface({
  ragConfigs,
  sources,
  setRagConfigs
}: {
  ragConfigs: RAGConfig[];
  sources: Source[];
  setRagConfigs: React.Dispatch<React.SetStateAction<RAGConfig[]>>;
}) {
  const [selectedRAGConfigId, setSelectedRAGConfigId] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [displayableMetrics, setDisplayableMetrics] = useState<Metric[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [results, setResults] = useState<EvaluationResults[]>([]);
  const [activeTab, setActiveTab] = useState("run");
  
  // Generator selection for evaluation (moved from RAG config)
  const [selectedGenerator, setSelectedGenerator] = useState<string>("");
  const [generatorParams, setGeneratorParams] = useState<{ [key: string]: string | number | boolean }>({});

  // State for the new RAG Config creation/editing UI
  const [currentConfigName, setCurrentConfigName] = useState<string>("");
  const [currentConfigDescription, setCurrentConfigDescription] = useState<string>("");
  const [selectedParser, setSelectedParser] = useState<string>("");
  const [selectedChunker, setSelectedChunker] = useState<string>("");
  const [selectedRetriever, setSelectedRetriever] = useState<string>("");
  // selectedGenerator removed from config creation - now only for evaluation
  const [parserParams, setParserParams] = useState<{ [key: string]: string | number | boolean }>({});
  const [chunkerParams, setChunkerParams] = useState<{ [key: string]: string | number | boolean }>({});
  const [retrieverParams, setRetrieverParams] = useState<{ [key: string]: string | number | boolean }>({});

  // API-fetched parsers state
  const [apiFetchedParsers, setApiFetchedParsers] = useState<Module[]>([]);
  const [apiParsersLoading, setApiParsersLoading] = useState(true);
  const [apiParsersError, setApiParsersError] = useState<string | null>(null);

  // API-fetched chunkers state
  const [apiFetchedChunkers, setApiFetchedChunkers] = useState<Module[]>([]);
  const [apiChunkersLoading, setApiChunkersLoading] = useState(true);
  const [apiChunkersError, setApiChunkersError] = useState<string | null>(null);

  const currentRAGConfig = ragConfigs.find(rc => rc.id === selectedRAGConfigId);
  const currentSourceDetails = sources.find(s => s.id === selectedSource);

  // Fetch parsers from API on component mount
  useEffect(() => {
    const fetchParsers = async () => {
      try {
        setApiParsersLoading(true);
        setApiParsersError(null);
        
        // Check if API_URL is configured
        if (!API_URL) {
          throw new Error('API_URL not configured');
        }
        
        const response = await fetch(`${API_URL}/parser/`, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ApiParserListResponse = await response.json();
        const transformedParsers = transformApiParsersToModules(data.parsers);
        setApiFetchedParsers(transformedParsers);
      } catch (error) {
        console.error('Failed to fetch parsers:', error);
        setApiParsersError(error instanceof Error ? error.message : 'Failed to fetch parsers');
        // Fallback to static parsers if API fails
        setApiFetchedParsers(AVAILABLE_MODULES.parser);
      } finally {
        setApiParsersLoading(false);
      }
    };

    fetchParsers();
  }, []);

  // Fetch chunkers from API on component mount
  useEffect(() => {
    const fetchChunkers = async () => {
      try {
        setApiChunkersLoading(true);
        setApiChunkersError(null);
        
        // Check if API_URL is configured
        if (!API_URL) {
          throw new Error('API_URL not configured');
        }
        
        const response = await fetch(`${API_URL}/chunker/`, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ApiChunkerListResponse = await response.json();
        const transformedChunkers = transformApiChunkersToModules(data.chunkers);
        setApiFetchedChunkers(transformedChunkers);
      } catch (error) {
        console.error('Failed to fetch chunkers:', error);
        setApiChunkersError(error instanceof Error ? error.message : 'Failed to fetch chunkers');
        // Fallback to static chunkers if API fails
        setApiFetchedChunkers(AVAILABLE_MODULES.chunker);
      } finally {
        setApiChunkersLoading(false);
      }
    };

    fetchChunkers();
  }, []);

  useEffect(() => {
    if (selectedRAGConfigId && activeTab === 'configure') {
      const configToLoad = ragConfigs.find(rc => rc.id === selectedRAGConfigId);
      if (configToLoad) {
        setCurrentConfigName(configToLoad.name + " (Copy)");
        setCurrentConfigDescription(configToLoad.description);
        
        setSelectedParser(configToLoad.parser.moduleId);
        setParserParams({...configToLoad.parser.parameterValues});
        
        setSelectedChunker(configToLoad.chunker.moduleId);
        setChunkerParams({...configToLoad.chunker.parameterValues});
        
        setSelectedRetriever(configToLoad.retriever.moduleId);
        setRetrieverParams({...configToLoad.retriever.parameterValues});

        // Generator is no longer part of RAG config
      } 
    } else if (activeTab !== 'configure') {
    }
  }, [selectedRAGConfigId, activeTab, ragConfigs]);

  useEffect(() => {
    if (!selectedSource) {
      setDisplayableMetrics([]);
      setSelectedMetrics([]);
      return;
    }

    const sourceDetails = sources.find(s => s.id === selectedSource);
    if (!sourceDetails || !sourceDetails.supported_metrics) {
      if (sourceDetails && sourceDetails.type === 'library') {
         let metricsToConsider = DEFAULT_LIBRARY_METRICS_OBJECTS;
         if (selectedRAGConfigId) {
            const ragConfigDetails = ragConfigs.find(rc => rc.id === selectedRAGConfigId);
            if (ragConfigDetails && ragConfigDetails.availableMetrics) {
                const ragMetricIds = new Set(ragConfigDetails.availableMetrics.map(m => m.id));
                metricsToConsider = metricsToConsider.filter(m => ragMetricIds.has(m.id));
            } else {
                metricsToConsider = [];
            }
         }
         setDisplayableMetrics(metricsToConsider);
      } else {
        setDisplayableMetrics([]);
      }
      setSelectedMetrics([]);
      return;
    }

    let metricsFromSource: Metric[] = sourceDetails.supported_metrics;

    if (selectedRAGConfigId) {
      const ragConfigDetails = ragConfigs.find(rc => rc.id === selectedRAGConfigId);
      if (ragConfigDetails && ragConfigDetails.availableMetrics) {
        const ragMetricIds = new Set(ragConfigDetails.availableMetrics.map(m => m.id));
        metricsFromSource = metricsFromSource.filter(m => ragMetricIds.has(m.id));
      } else {
        metricsFromSource = [];
      }
    }
    
    setDisplayableMetrics(metricsFromSource);
    setSelectedMetrics([]); 
  }, [selectedSource, selectedRAGConfigId, sources, ragConfigs]);

  const handleMetricSelection = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(m => m !== metricId)
        : [...prev, metricId]
    );
  };

  const startEvaluation = async () => {
    if (!selectedRAGConfigId || !selectedSource || !selectedGenerator || !currentRAGConfig || selectedMetrics.length === 0) return;

    setIsEvaluating(true);

    try {
      const newResult: EvaluationResults = {
        systemId: selectedRAGConfigId,
        sourceId: selectedSource,
        startTime: new Date(),
        metrics: [],
        status: "running",
      };

      setResults((prev) => [...prev, newResult]);
      await new Promise((resolve) => setTimeout(resolve, 3000));

      setResults((prev) =>
        prev.map((result) => {
          if (
            result.systemId === selectedRAGConfigId &&
            result.sourceId === selectedSource &&
            result.status === "running"
          ) {
            const generatedMetrics = selectedMetrics.map((metric) => ({
              metric,
              value: Math.random() * 100,
              unit: metric.toLowerCase().includes("time") ? "ms" : metric.toLowerCase().includes("rate") || metric.toLowerCase().includes("score") ? "%" : "",
            }));

            return {
              ...result,
              status: "completed",
              endTime: new Date(),
              metrics: generatedMetrics,
            };
          }
          return result;
        })
      );

      setActiveTab("results");
    } catch (error) {
      console.error("Evaluation failed:", error);
      setResults((prev) =>
        prev.map((result) => {
          if (
            result.systemId === selectedRAGConfigId &&
            result.sourceId === selectedSource &&
            result.status === "running"
          ) {
            return {
              ...result,
              status: "failed",
              endTime: new Date(),
            };
          }
          return result;
        })
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  const getRAGConfigName = (id: string) => {
    return ragConfigs.find((config) => config.id === id)?.name || id;
  };

  const getSourceName = (id: string) => {
    const source = sources.find((s) => s.id === id);
    if (!source) return id;
    return source.type === 'benchmark' ? `Benchmark: ${source.name}` : `Library: ${source.name}`;
  };

  const formatDuration = (durationInMs: number): string => {
    if (durationInMs < 0) return "0.0s";
    return `${(durationInMs / 1000).toFixed(1)}s`;
  };

  const getDurationDisplay = (result: EvaluationResults): string | null => {
    if (result.status === "completed" && result.startTime && result.endTime) {
      const duration = result.endTime.getTime() - result.startTime.getTime();
      return `Took: ${formatDuration(duration)}`;
    }
    if (result.status === "running" && result.startTime) {
      const duration = Date.now() - result.startTime.getTime();
      return `Running for: ${formatDuration(duration)}`;
    }
    return null;
  };

  const initializeDefaultParamsForModule = (moduleType: ModuleType, moduleId: string) => {
    let modulesOfType: Module[];
    
    // Use API-fetched modules for parsers and chunkers, static modules for others
    if (moduleType === 'parser') {
      modulesOfType = apiFetchedParsers.length > 0 ? apiFetchedParsers : AVAILABLE_MODULES.parser;
    } else if (moduleType === 'chunker') {
      modulesOfType = apiFetchedChunkers.length > 0 ? apiFetchedChunkers : AVAILABLE_MODULES.chunker;
    } else {
      modulesOfType = AVAILABLE_MODULES[moduleType];
    }
    
    const module = modulesOfType.find(m => m.id === moduleId);
    if (!module) return {};
    const params: { [key: string]: string | number | boolean } = {};
    module.parameters.forEach(p => {
      params[p.id] = p.defaultValue;
    });
    return params;
  };

  const handleNewConfigParserSelect = (moduleId: string) => {
    setSelectedParser(moduleId);
    setParserParams(initializeDefaultParamsForModule('parser', moduleId));
  };
  const handleNewConfigChunkerSelect = (moduleId: string) => {
    setSelectedChunker(moduleId);
    setChunkerParams(initializeDefaultParamsForModule('chunker', moduleId));
  };
  const handleNewConfigRetrieverSelect = (moduleId: string) => {
    setSelectedRetriever(moduleId);
    setRetrieverParams(initializeDefaultParamsForModule('retriever', moduleId));
  };

  const handleNewConfigParamChange = (
    moduleType: ModuleType, 
    paramId: string, 
    value: string | number | boolean
  ) => {
    switch (moduleType) {
      case 'parser':
        setParserParams(prev => ({ ...prev, [paramId]: value }));
        break;
      case 'chunker':
        setChunkerParams(prev => ({ ...prev, [paramId]: value }));
        break;
      case 'retriever':
        setRetrieverParams(prev => ({ ...prev, [paramId]: value }));
        break;
      case 'generator':
        setGeneratorParams(prev => ({ ...prev, [paramId]: value }));
        break;
    }
  };

  const handleSaveConfig = () => {
    if (!currentConfigName.trim() || !selectedParser || !selectedChunker || !selectedRetriever) {
      alert("Please provide a configuration name and select a parser, chunker, and retriever.");
      return;
    }
    if (ragConfigs.some(config => config.name === currentConfigName.trim())) {
      alert("A Preprocessing & Retrieval configuration with this name already exists. Please choose a different name.");
      return;
    }

    const newConfig: RAGConfig = {
      id: `custom_${Date.now()}_${currentConfigName.trim().replace(/\s+/g, '_').toLowerCase()}`,
      name: currentConfigName.trim(),
      description: currentConfigDescription.trim(),
      parser: {
        moduleId: selectedParser,
        parameterValues: parserParams,
      },
      chunker: {
        moduleId: selectedChunker,
        parameterValues: chunkerParams,
      },
      retriever: {
        moduleId: selectedRetriever,
        parameterValues: retrieverParams,
      },
      // generator removed from config
      availableMetrics: Object.values(ALL_METRICS),
    };

    setRagConfigs(prev => [...prev, newConfig]);
    alert("Preprocessing & Retrieval Configuration saved! You can now select it for evaluation in the 'Run Evaluation' tab.");

    setCurrentConfigName("");
    setCurrentConfigDescription("");
    setSelectedParser("");
    setParserParams({});
    setSelectedChunker("");
    setChunkerParams({});
    setSelectedRetriever("");
    setRetrieverParams({});
    // generator reset removed
  };

  const renderModuleSelector = (
    moduleType: ModuleType,
    selectedModuleId: string,
    onSelectModule: (moduleId: string) => void,
    currentParams: { [key: string]: string | number | boolean },
    onParamChange: (moduleType: ModuleType, paramId: string, value: string | number | boolean) => void
  ) => {
    // Get the appropriate module list based on type
    let modulesOfType: Module[];
    let isLoading = false;
    let errorMessage: string | null = null;
    
    if (moduleType === 'parser') {
      modulesOfType = apiFetchedParsers.length > 0 ? apiFetchedParsers : AVAILABLE_MODULES.parser;
      isLoading = apiParsersLoading;
      errorMessage = apiParsersError;
    } else if (moduleType === 'chunker') {
      modulesOfType = apiFetchedChunkers.length > 0 ? apiFetchedChunkers : AVAILABLE_MODULES.chunker;
      isLoading = apiChunkersLoading;
      errorMessage = apiChunkersError;
    } else {
      modulesOfType = AVAILABLE_MODULES[moduleType];
    }
    
    const selectedModuleDetails = modulesOfType.find(m => m.id === selectedModuleId);

    return (
      <div className="space-y-3 p-4 border rounded-md bg-muted/20">
        <div className="flex justify-between items-center">
            <Label htmlFor={`${moduleType}-select`} className="text-md font-semibold capitalize">{moduleType}</Label>
            {selectedModuleDetails && <span className="text-xs text-muted-foreground">{selectedModuleDetails.name}</span>}
        </div>
        
        {/* Loading state for API modules */}
        {(moduleType === 'parser' || moduleType === 'chunker') && isLoading && (
          <div className="text-sm text-muted-foreground">Loading {moduleType}s from API...</div>
        )}
        
        {/* Error state for API modules */}
        {(moduleType === 'parser' || moduleType === 'chunker') && errorMessage && (
          <div className="text-sm text-red-600">
            Failed to load {moduleType}s: {errorMessage}. Using fallback options.
          </div>
        )}
        
        <Select value={selectedModuleId} onValueChange={onSelectModule} disabled={isLoading}>
          <SelectTrigger id={`${moduleType}-select`}>
            <SelectValue placeholder={isLoading ? "Loading..." : `Select ${moduleType}`} />
          </SelectTrigger>
          <SelectContent>
            {modulesOfType.map(module => (
              <SelectItem key={module.id} value={module.id}>
                {module.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedModuleDetails && selectedModuleDetails.description && (
            <p className="text-xs text-muted-foreground italic pt-1">{selectedModuleDetails.description}</p>
        )}

        {selectedModuleDetails && selectedModuleDetails.parameters.length > 0 && (
          <div className="mt-4 space-y-4 pt-3 border-t border-dashed">
            <h4 className="text-sm font-medium text-foreground pt-1">Parameters:</h4>
            {selectedModuleDetails.parameters.map(param => (
              <div key={param.id} className="space-y-1.5">
                <Label htmlFor={`${moduleType}-${param.id}`} className="text-sm">{param.name}</Label>
                {param.description && <p className="text-xs text-muted-foreground -mt-1">{param.description}</p>}
                {param.type === 'string' && (
                  <Input
                    id={`${moduleType}-${param.id}`}
                    type="text"
                    value={currentParams[param.id] as string || ''}
                    onChange={(e) => onParamChange(moduleType, param.id, e.target.value)}
                    placeholder={param.defaultValue as string}
                  />
                )}
                {param.type === 'number' && (
                  <Input
                    id={`${moduleType}-${param.id}`}
                    type="number"
                    value={currentParams[param.id] as number ?? ''}
                    onChange={(e) => {
                        const rawValue = e.target.value;
                        if (rawValue === '') {
                            onParamChange(moduleType, param.id, '');
                        } else {
                            const val = parseFloat(rawValue);
                            if (!isNaN(val)) {
                               onParamChange(moduleType, param.id, val);
                            } else {
                                // If parsing fails, but it's not empty, could keep old value or set to default
                                // For now, let it be, or onParamChange(moduleType, param.id, param.defaultValue as number)
                            }
                        }
                    }}
                    onBlur={(e) => { 
                        const rawValue = e.target.value;
                        if (rawValue === '' || isNaN(parseFloat(rawValue))) {
                             // If empty or NaN on blur, revert to default value
                            onParamChange(moduleType, param.id, param.defaultValue as number);
                        }
                    }}
                    min={param.min}
                    max={
                      // Dynamic max for OpenAI LLM max_tokens based on selected model
                      selectedModuleDetails?.id === 'openai_llm' && param.id === 'max_tokens' 
                        ? MAX_TOKEN_DICT[currentParams['llm'] as string] || param.max
                        : param.max
                    }
                    step={param.step}
                    placeholder={String(param.defaultValue)}
                  />
                )}
                {param.type === 'boolean' && (
                   <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                        id={`${moduleType}-${param.id}`}
                        checked={currentParams[param.id] as boolean ?? false}
                        onCheckedChange={(checked) => onParamChange(moduleType, param.id, checked as boolean)}
                    />
                    <Label htmlFor={`${moduleType}-${param.id}`} className="text-sm font-normal cursor-pointer">
                        {currentParams[param.id] ? "Enabled" : "Disabled"} 
                    </Label>
                   </div>
                )}
                {param.type === 'select' && param.options && (
                  <Select
                    value={currentParams[param.id] as string || ''}
                    onValueChange={(value) => onParamChange(moduleType, param.id, value)}
                    defaultValue={param.defaultValue as string}
                  >
                    <SelectTrigger id={`${moduleType}-${param.id}`}>
                      <SelectValue placeholder={`Select ${param.name}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {param.options.map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configure">Configure Preprocessing & Retrieval</TabsTrigger>
          <TabsTrigger value="run">Run Evaluation</TabsTrigger>
          <TabsTrigger value="results">View Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="configure" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Preprocessing & Retrieval Configuration</CardTitle>
              <CardDescription>
                Define a new preprocessing and retrieval pipeline by selecting modules and setting their parameters. 
                Generator will be selected separately during evaluation.
                You can also select an existing configuration from the 'Run Evaluation' tab dropdown to load its settings here as a template.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Show loading state for parsers */}
              {apiParsersLoading && (
                <div className="p-4 border rounded-md bg-blue-50 text-blue-800">
                  <p className="text-sm">Loading available parsers from API...</p>
                </div>
              )}
              
              {/* Show error state for parsers */}
              {apiParsersError && (
                <div className="p-4 border rounded-md bg-yellow-50 text-yellow-800">
                  <p className="text-sm">
                    Warning: Failed to load parsers from API ({apiParsersError}). 
                    Using fallback options. Some features may be limited.
                  </p>
                </div>
              )}
              
              {/* Show loading state for chunkers */}
              {apiChunkersLoading && (
                <div className="p-4 border rounded-md bg-blue-50 text-blue-800">
                  <p className="text-sm">Loading available chunkers from API...</p>
                </div>
              )}
              
              {/* Show error state for chunkers */}
              {apiChunkersError && (
                <div className="p-4 border rounded-md bg-yellow-50 text-yellow-800">
                  <p className="text-sm">
                    Warning: Failed to load chunkers from API ({apiChunkersError}). 
                    Using fallback options. Some features may be limited.
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="config-name">Configuration Name</Label>
                <Input id="config-name" value={currentConfigName} onChange={(e) => setCurrentConfigName(e.target.value)} placeholder="e.g., My Custom Preprocessing & Retrieval" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="config-description">Description</Label>
                <Input id="config-description" value={currentConfigDescription} onChange={(e) => setCurrentConfigDescription(e.target.value)} placeholder="A brief description of this configuration (optional)" />
              </div>
              
              {renderModuleSelector('parser', selectedParser, handleNewConfigParserSelect, parserParams, handleNewConfigParamChange)}
              {renderModuleSelector('chunker', selectedChunker, handleNewConfigChunkerSelect, chunkerParams, handleNewConfigParamChange)}
              {renderModuleSelector('retriever', selectedRetriever, handleNewConfigRetrieverSelect, retrieverParams, handleNewConfigParamChange)}

              <Button className="w-full" onClick={handleSaveConfig} 
                disabled={!currentConfigName.trim() || !selectedParser || !selectedChunker || !selectedRetriever || apiParsersLoading || apiChunkersLoading}>
                {(apiParsersLoading || apiChunkersLoading) ? "Loading Modules..." : "Save Preprocessing & Retrieval Configuration"}
              </Button> 
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="run" className="pt-4">
          <Card>
            <CardHeader>
                <CardTitle>Run Evaluation</CardTitle>
                <CardDescription>Select a preprocessing & retrieval configuration, generator, and data source to start an evaluation run.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="source-eval">Source</Label>
                    <Select
                      value={selectedSource}
                      onValueChange={setSelectedSource}
                    >
                      <SelectTrigger id="source-eval">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {sources.map((source) => (
                          <SelectItem key={source.id} value={source.id}>
                            {source.type === 'benchmark' ? 'Benchmark: ' : 'Library: '}{source.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rag-config-eval">Preprocessing & Retrieval Config</Label>
                    <Select
                      value={selectedRAGConfigId} 
                      onValueChange={(value) => {
                        setSelectedRAGConfigId(value);
                      }}
                    >
                      <SelectTrigger id="rag-config-eval"> 
                        <SelectValue placeholder="Select preprocessing & retrieval config" /> 
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {ragConfigs.map((config) => ( 
                          <SelectItem key={config.id} value={config.id}>
                            {config.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Generator Selection */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="generator-eval">Generator</Label>
                    <Select
                      value={selectedGenerator}
                      onValueChange={(value) => {
                        setSelectedGenerator(value);
                        setGeneratorParams(initializeDefaultParamsForModule('generator', value));
                      }}
                    >
                      <SelectTrigger id="generator-eval">
                        <SelectValue placeholder="Select generator" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {AVAILABLE_MODULES.generator.map((generator) => (
                          <SelectItem key={generator.id} value={generator.id}>
                            {generator.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Generator Parameters */}
                  {selectedGenerator && (
                    <div className="p-4 border rounded-md bg-muted/20">
                      <h4 className="text-sm font-medium mb-3">Generator Parameters</h4>
                      {renderModuleSelector('generator', selectedGenerator, () => {}, generatorParams, handleNewConfigParamChange)}
                    </div>
                  )}
                </div>

                {currentRAGConfig && currentSourceDetails && selectedGenerator && ( 
                  <Card className="bg-muted/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Evaluation Setup Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div>
                            <p><span className="font-semibold">Source:</span> {currentSourceDetails.name} ({currentSourceDetails.type})</p>
                            <p className="text-xs text-muted-foreground">{currentSourceDetails.description}</p>
                            {currentSourceDetails.type === 'benchmark' && currentSourceDetails.supported_metrics && currentSourceDetails.supported_metrics.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">Typically supports: {currentSourceDetails.supported_metrics.map(m => m.name).join(', ')}</p>
                            )}
                             {currentSourceDetails.type === 'library' && (!currentSourceDetails.supported_metrics || currentSourceDetails.supported_metrics.length === 0) && (
                                <p className="text-xs text-muted-foreground mt-1">Typically supports: {DEFAULT_LIBRARY_METRICS_OBJECTS.map(m => m.name).join(', ')}</p>
                            )}
                        </div>
                        <div className="pt-2 border-t">
                             <p className="mt-2"><span className="font-semibold">Preprocessing & Retrieval Config:</span> {currentRAGConfig.name}</p> 
                            <p className="text-xs text-muted-foreground">{currentRAGConfig.description}</p>
                            <div className="mt-2 space-y-1">
                                <p className="text-xs"><span className="font-semibold">Parser:</span> {AVAILABLE_MODULES.parser.find(m => m.id === currentRAGConfig.parser.moduleId)?.name || 'N/A'}</p>
                                <p className="text-xs"><span className="font-semibold">Chunker:</span> {AVAILABLE_MODULES.chunker.find(m => m.id === currentRAGConfig.chunker.moduleId)?.name || 'N/A'}</p>
                                <p className="text-xs"><span className="font-semibold">Retriever:</span> {AVAILABLE_MODULES.retriever.find(m => m.id === currentRAGConfig.retriever.moduleId)?.name || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="pt-2 border-t">
                            <p><span className="font-semibold">Generator:</span> {AVAILABLE_MODULES.generator.find(m => m.id === selectedGenerator)?.name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{AVAILABLE_MODULES.generator.find(m => m.id === selectedGenerator)?.description || ''}</p>
                        </div>
                    </CardContent>
                  </Card>
                )}

                {currentSourceDetails && currentRAGConfig && selectedGenerator && ( 
                  <div className="space-y-3 pt-3">
                    <Label className="text-base font-medium">Select Metrics to Evaluate</Label>
                    <p className="text-xs text-muted-foreground">
                      {selectedSource && !selectedRAGConfigId && currentSourceDetails ? `Metrics supported by ${currentSourceDetails.name}:` : 
                       selectedSource && selectedRAGConfigId && currentSourceDetails && currentRAGConfig ? `Common metrics for ${currentSourceDetails.name} and ${currentRAGConfig.name}:` : 
                       !selectedSource && selectedRAGConfigId && currentRAGConfig ? `Metrics available in ${currentRAGConfig.name}:` : 
                       "Select a Source, Preprocessing & Retrieval Config, and Generator to see available metrics."}
                    </p>
                    {displayableMetrics.length > 0 ? (
                      ['Retrieval', 'Retrieval Token', 'Generation'].map(category => {
                        const categoryMetrics = displayableMetrics.filter(
                          metric => metric.category === category
                        );
                        if (categoryMetrics.length === 0) return null;

                        const categoryMetricIds = categoryMetrics.map(m => m.id);
                        const selectedInCategoryCount = categoryMetricIds.filter(id => selectedMetrics.includes(id)).length;
                        const allInCategorySelected = selectedInCategoryCount === categoryMetricIds.length;
                        const noneInCategorySelected = selectedInCategoryCount === 0;

                        return (
                          <div key={category} className="pt-3">
                            <div className="flex items-center mb-2">
                              <h4 className="text-md font-semibold mr-4">
                                {category === 'Retrieval Token' ? 'Retrieval Token Metrics' : `${category} Metrics`}
                              </h4>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`select-all-${category.toLowerCase().replace(' ', '-')}`}
                                  checked={
                                    categoryMetricIds.length > 0 && allInCategorySelected
                                      ? true
                                      : noneInCategorySelected
                                      ? false
                                      : "indeterminate"
                                  }
                                  onCheckedChange={() => {
                                    if (allInCategorySelected) {
                                      setSelectedMetrics(prev => prev.filter(id => !categoryMetricIds.includes(id)));
                                    } else {
                                      setSelectedMetrics(prev => [...new Set([...prev, ...categoryMetricIds])]);
                                    }
                                  }}
                                  disabled={!selectedSource || !selectedRAGConfigId} 
                                />
                                <Label htmlFor={`select-all-${category.toLowerCase().replace(' ', '-')}`} className="text-sm font-normal cursor-pointer">
                                  Select All
                                </Label>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {categoryMetrics.map(metric => (
                                <div key={metric.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-accent/50">
                                  <Checkbox
                                    id={`metric-${metric.id}`}
                                    checked={selectedMetrics.includes(metric.id)}
                                    onCheckedChange={() => handleMetricSelection(metric.id)}
                                    disabled={!selectedSource || !selectedRAGConfigId} 
                                  />
                                  <Label htmlFor={`metric-${metric.id}`} className="text-sm font-normal cursor-pointer">
                                    {metric.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                        <p className="text-sm text-muted-foreground pt-2">
                          {selectedSource && selectedRAGConfigId ? "No common metrics found for the selected Source and RAG Configuration." : "No metrics available for the current selection."}
                        </p>
                    )}
                  </div>
                )}

                <Button
                  className="w-full pt-2"
                  onClick={startEvaluation}
                  disabled={!selectedRAGConfigId || !selectedSource || !selectedGenerator || selectedMetrics.length === 0 || isEvaluating} 
                >
                  {isEvaluating ? "Evaluating..." : "Start Evaluation & View Results"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="pt-4">
           {results.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No evaluation results yet. Run an evaluation from the 'Run Evaluation' tab.</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preprocessing & Retrieval Config</TableHead> 
                    <TableHead>Source</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Results (Selected Metrics)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>{getRAGConfigName(result.systemId)}</TableCell> 
                      <TableCell>{getSourceName(result.sourceId)}</TableCell>
                      <TableCell>
                        {result.startTime.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {result.endTime ? result.endTime.toLocaleString() : "N/A"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            result.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : result.status === "running"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {result.status}
                        </span>
                        {getDurationDisplay(result) && (
                          <p className="text-xs text-muted-foreground mt-0.5 pl-1">
                            {getDurationDisplay(result)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.status === "completed" ? (
                          <div className="space-y-1">
                            {result.metrics.map((metric, i) => (
                              <div key={i} className="flex justify-between items-center text-xs">
                                <span>{ALL_METRICS[metric.metric]?.name || metric.metric}:</span>
                                <span className="font-medium">
                                  {metric.value.toFixed(2)}
                                  {metric.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : result.status === "running" ? (
                          "Processing..."
                        ) : (
                          "Failed"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function EvalPage() {
  const [ragConfigs, setRagConfigs] = useState<RAGConfig[]>([]);
  const [sources, setSources] = useState<Source[]>([]);

  useEffect(() => {
    // Updated demo RAG configurations - now without generator
    const demoConfigs: RAGConfig[] = [
      {
        id: "rag1_basic_autorag",
        name: "Basic AutoRAG",
        description: "A simple AutoRAG configuration with basic modules.",
        parser: { moduleId: "langchain_parse", parameterValues: { parse_method: "pdfminer" } },
        chunker: { moduleId: "llama_index_chunk", parameterValues: { chunk_method: "Token", chunk_size: 1024, chunk_overlap: 24, add_file_name: "en" } },
        retriever: { moduleId: "bm25", parameterValues: { top_k: 5, bm25_tokenizer: "porter_stemmer" } },
        // generator removed from config
        availableMetrics: [
          ALL_METRICS.recall, ALL_METRICS.precision, ALL_METRICS.f1,
          ALL_METRICS.bleu, ALL_METRICS.meteor, ALL_METRICS.rouge, ALL_METRICS.sem_score, ALL_METRICS.bert_score,
          ALL_METRICS.response_time,
        ],
      },
      {
        id: "rag2_vector_autorag",
        name: "Vector AutoRAG",
        description: "AutoRAG configuration using vector database retrieval.",
        parser: { moduleId: "langchain_parse", parameterValues: { parse_method: "pdfminer" } },
        chunker: { moduleId: "llama_index_chunk", parameterValues: { chunk_method: "Token", chunk_size: 512, chunk_overlap: 50, add_file_name: "en" } },
        retriever: { moduleId: "vectordb", parameterValues: { top_k: 3, vectordb: "chroma", embedding_model: "OpenAI Embedding API", embedding_batch: 128, similarity_metric: "cosine" } },
        // generator removed from config
        availableMetrics: [
          ALL_METRICS.recall, ALL_METRICS.precision, ALL_METRICS.f1,
          ALL_METRICS.bleu, ALL_METRICS.meteor, ALL_METRICS.rouge, ALL_METRICS.sem_score, ALL_METRICS.bert_score,
          ALL_METRICS.geval_coherence, ALL_METRICS.geval_consistency, ALL_METRICS.geval_fluency, ALL_METRICS.geval_relevance,
        ],
      },
      {
        id: "rag3_hybrid_autorag",
        name: "Hybrid AutoRAG",
        description: "AutoRAG configuration using hybrid retrieval with RRF.",
        parser: { moduleId: "langchain_parse", parameterValues: { parse_method: "pdfminer" } },
        chunker: { moduleId: "llama_index_chunk", parameterValues: { chunk_method: "Token", chunk_size: 2048, chunk_overlap: 100, add_file_name: "en" } },
        retriever: { moduleId: "hybrid_rrf", parameterValues: { top_k: 10, weight: 0.6 } },
        // generator removed from config
        availableMetrics: [
          ALL_METRICS.recall, ALL_METRICS.precision, ALL_METRICS.f1,
          ALL_METRICS.bleu, ALL_METRICS.meteor, ALL_METRICS.rouge, ALL_METRICS.sem_score, ALL_METRICS.bert_score,
          ALL_METRICS.geval_coherence, ALL_METRICS.geval_consistency, ALL_METRICS.geval_fluency, ALL_METRICS.geval_relevance,
          ALL_METRICS.overall_quality_score, ALL_METRICS.groundedness,
        ],
      },
    ];
    
    const demoSystemBenchmarks: Source[] = [
      {
        id: "longbench_hotpotqa",
        name: "LongBench/HotpotQA",
        description: "Question answering over multiple supporting documents, requiring reasoning.",
        supported_metrics: [
            ALL_METRICS.exact_match,
            ALL_METRICS.answer_f1_score,
            ALL_METRICS.answer_recall,
            ALL_METRICS.precision,
            ALL_METRICS.recall,
        ],
        type: 'benchmark' as const
      },
      {
        id: "longbench_narrativeqa",
        name: "LongBench/NarrativeQA",
        description: "Question answering based on stories or books, requiring understanding of narratives.",
        supported_metrics: [
            ALL_METRICS.rouge,
            ALL_METRICS.bleu,
            ALL_METRICS.meteor,
            ALL_METRICS.bert_score,
        ],
        type: 'benchmark' as const
      },
      {
        id: "techqa",
        name: "TechQA",
        description: "Technical question answering, often involving specialized vocabulary and concepts.",
        supported_metrics: [
            ALL_METRICS.precision,
            ALL_METRICS.recall,
        ],
        type: 'benchmark' as const
      },
      {
        id: "emanual",
        name: "E-manual",
        description: "Question answering and information retrieval from electronic manuals.",
        supported_metrics: [
            ALL_METRICS.recall,
            ALL_METRICS.precision,
        ],
        type: 'benchmark' as const
      },
    ];

    const demoUserLibraries: LibraryStub[] = [
      {
        id: "tech_docs",
        name: "Technical Documentation", 
        description: "Technical manuals and API documentation for eval"
      },
      {
        id: "research_papers", 
        name: "Research Papers", 
        description: "Academic papers and research notes for eval"
      },
    ];

    const librarySources: Source[] = demoUserLibraries.map(lib => ({
      ...lib,
      id: `lib_${lib.id}`,
      type: 'library',
      supported_metrics: DEFAULT_LIBRARY_METRICS_OBJECTS,
    }));

    setRagConfigs(demoConfigs);
    setSources([...demoSystemBenchmarks, ...librarySources]);
  }, []);

  return (
    <PageLayout>
      <div className="space-y-6 p-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">RAG Evaluation & Configuration</h1>
            <p className="text-muted-foreground">
              Configure RAG pipelines and evaluate them on standardized sources.
            </p>
          </div>
        </div>

        <EvaluationInterface ragConfigs={ragConfigs} sources={sources} setRagConfigs={setRagConfigs} />
      </div>
    </PageLayout>
  );
} 