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
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// API Configuration
const API_URL = "/api";

// API Response Interfaces for Evaluation Data
interface ApiEvaluationSummary {
  id: string;
  name: string | null;
  status: 'success' | 'failure';
  progress: number | null;
  created_at: string;
  retriever_config_name: string | null;
  overall_score: number | null;
}

interface ApiBenchmarkDataset {
  id: string;
  name: string;
  description: string | null;
  domain: string | null;
  language: string;
  version: string;
  total_queries: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

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

// API Response Interfaces for Indexer Data
interface ApiIndexerEntry {
  id: string;
  name: string;
  index_type: string;
  model: string;
  params: ApiParserParameterValue;
  status: string;
  description?: string;
}

interface ApiIndexerListResponse {
  total: number;
  indexers: ApiIndexerEntry[];
}

// Add interface for embedding model options
interface EmbeddingModel {
  id: string;
  name: string;
  model: string;
  description?: string;
}

// API Response Interfaces for Retriever Data
interface ApiRetrieverEntry {
  id: string;
  name: string;
  description?: string;
  status: string;
  library_id: string;
  parser_id: string;
  chunker_id: string;
  indexer_id: string;
  collection_name?: string;
  top_k: number;
  total_chunks?: number;
  indexed_at?: string;
  error_message?: string;
}

interface ApiRetrieverListResponse {
  total: number;
  retrievers: ApiRetrieverEntry[];
}

// New Type Definitions for RAG Configuration
type ModuleType = 'parser' | 'chunker' | 'generator' | 'indexer'; // Removed 'retriever'
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

// Renamed RAGSystem to RAGRetriever, now focused on retrieval only
interface RAGRetriever {
  id: string;
  name: string;
  description: string;
  parser: SelectedModuleConfig;
  chunker: SelectedModuleConfig;
  indexer: SelectedModuleConfig; // Changed from 'retriever' to 'indexer' to match API
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
  retrieval_recall: { id: "retrieval_recall", name: "Recall", category: "Retrieval" as const },
  retrieval_precision: { id: "retrieval_precision", name: "Precision", category: "Retrieval" as const },
  retrieval_f1: { id: "retrieval_f1", name: "F1", category: "Retrieval" as const },
  retrieval_map: { id: "retrieval_map", name: "mAP", category: "Retrieval" as const },
  retrieval_mrr: { id: "retrieval_mrr", name: "mRR", category: "Retrieval" as const },
  retrieval_ndcg: { id: "retrieval_ndcg", name: "NDCG", category: "Retrieval" as const },
  // Retrieval Token Metrics
  retrieval_token_recall: { id: "retrieval_token_recall", name: "Token Recall", category: "Retrieval Token" as const },
  retrieval_token_precision: { id: "retrieval_token_precision", name: "Token Precision", category: "Retrieval Token" as const },
  retrieval_token_f1: { id: "retrieval_token_f1", name: "Token F1", category: "Retrieval Token" as const },
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
  ALL_METRICS.retrieval_recall, 
  ALL_METRICS.retrieval_precision, 
  ALL_METRICS.retrieval_f1,
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

// OpenAI LLM models for evaluation - simplified list of most commonly used models
const OPENAI_LLM_MODELS = [
  { id: "gpt-4o", name: "GPT-4o", description: "Most advanced multimodal model" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Efficient and cost-effective model" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "Enhanced GPT-4 with larger context" },
  { id: "gpt-4", name: "GPT-4", description: "High-quality language model" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "Fast and efficient model" },
  { id: "o1-preview", name: "o1 Preview", description: "Advanced reasoning model" },
  { id: "o1-mini", name: "o1 Mini", description: "Reasoning model, smaller version" }
];

// Generator modules (based on chat page design)
const GENERATOR_MODULES: Module[] = [
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
        options: OPENAI_LLM_MODELS.map(model => model.id),
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
    const parameters: ParameterDefinition[] = [];

    // Add parameters from API
    Object.entries(apiParser.params).forEach(([key, value]) => {
      parameters.push({
        id: key,
        name: formatParamName(key),
        type: inferParameterType(value),
        defaultValue: value,
        description: `${formatParamName(key)} parameter`
      });
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
    const parameters: ParameterDefinition[] = [];

    // Add chunk_method parameter (always present for chunkers)
    parameters.push({
      id: 'chunk_method',
      name: 'Chunk Method',
      type: 'string',
      defaultValue: apiChunker.chunk_method,
      description: 'Method used for chunking'
    });

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
    }

    // Add any additional parameters from API
    Object.entries(apiChunker.params).forEach(([key, value]) => {
      // Skip if already processed by specific handlers above
      if (key !== 'chunk_method' && key !== 'chunk_size' && key !== 'chunk_overlap') {
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

// Transform API indexer data to Module format
const transformApiIndexersToModules = (apiIndexers: ApiIndexerEntry[]): Module[] => {
  return apiIndexers.map(apiIndexer => {
    const parameters: ParameterDefinition[] = [];

    // Add index_type parameter (always present for indexers)
    parameters.push({
      id: 'index_type',
      name: 'Index Type',
      type: 'string',
      defaultValue: apiIndexer.index_type,
      description: 'Type of index (vector, bm25, hybrid)'
    });

    // Add model parameter (always present for indexers)
    parameters.push({
      id: 'model',
      name: 'Model',
      type: 'string',
      defaultValue: apiIndexer.model,
      description: 'Model used for indexing'
    });

    // Add any additional parameters from API
    Object.entries(apiIndexer.params).forEach(([key, value]) => {
      // Skip if already processed by specific handlers above
      if (key !== 'index_type' && key !== 'model') {
        // Special handling for certain parameter types
        let paramType: ParameterType = inferParameterType(value);
        let options: string[] | undefined = undefined;
        
        // Handle known parameter types
        if (key === 'similarity_metric') {
          paramType = 'select';
          options = ['cosine', 'ip', 'l2'];
        } else if (key === 'device') {
          paramType = 'select';
          options = ['cpu', 'cuda'];
        } else if (key === 'input_type') {
          paramType = 'select';
          options = ['search_document', 'search_query', 'classification', 'clustering'];
        }

        parameters.push({
          id: key,
          name: formatParamName(key),
          type: paramType,
          defaultValue: value,
          options: options,
          description: `${formatParamName(key)} parameter`,
          // Add sensible constraints for numeric parameters
          ...(paramType === 'number' && key.includes('dimension') && { min: 128, max: 4096, step: 1 }),
          ...(paramType === 'number' && key.includes('batch') && { min: 1, max: 500, step: 1 }),
          ...(paramType === 'number' && (key.includes('size') || key.includes('length')) && { min: 1, max: 2048, step: 1 }),
          ...(paramType === 'number' && key.includes('weight') && { min: 0.0, max: 1.0, step: 0.1 }),
          ...(paramType === 'number' && (key === 'b' || key === 'k1' || key === 'epsilon') && { min: 0.0, max: 2.0, step: 0.01 })
        });
      }
    });

    return {
      id: apiIndexer.id, // Use the UUID from API
      name: apiIndexer.name,
      description: apiIndexer.description || `${apiIndexer.index_type} indexer using ${apiIndexer.model}`,
      type: 'indexer' as const,
      parameters
    };
  });
};

// Add interface for detailed evaluation results from GET /eval/{eval_id}
interface ApiEvaluationDetail {
  created_at: string;
  updated_at: string;
  id: string;
  name: string | null;
  retriever_config_id: string | null;
  evaluation_config: {
    embedding_model: string;
    generation_strategy?: {
      metrics: Array<{ metric_name: string }>;
    };
    generator_config?: {
      batch: number;
      max_tokens: number;
      model: string;
      temperature: number;
    };
    prompt_template: string;
    retrieval_strategy: {
      metrics: string[];
      top_k: number;
    };
  };
  dataset_config: any;
  status: 'pending' | 'processing' | 'success' | 'failure' | 'terminated';
  progress: number | null;
  message: string | null;
  total_queries: number | null;
  processed_queries: number | null;
  retriever_config_name: string | null;
  results: Array<{
    metric_name: string;
    value: number;
    description?: string;
  }>;
  detailed_results?: {
    summary: {
      overall_score: number;
      total_queries: number;
      execution_time: number;
      [key: string]: number; // For dynamic metric scores
    };
    detailed_results: {
      retrieval_metrics?: { [key: string]: number };
      generation_metrics?: { [key: string]: number };
      trial_summary?: Array<{
        node_line_name: string;
        node_type: string;
        best_module_filename: string;
        best_module_name: string;
        best_module_params: string;
        best_execution_time: number;
      }>;
      trial_directory?: string;
    };
    config_used?: string;
    project_dir?: string;
    autorag_trial?: string;
  };
  execution_time?: number;
}

function EvaluationInterface({
  ragRetrievers,
  sources,
}: {
  ragRetrievers: RAGRetriever[];
  sources: Source[];
}) {
  // Remove retriever selection - not needed anymore
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [displayableMetrics, setDisplayableMetrics] = useState<Metric[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [results, setResults] = useState<EvaluationResults[]>([]);
  const [activeTab, setActiveTab] = useState("run");
  const [evaluationName, setEvaluationName] = useState<string>("");
  
  // Evaluation configuration state
  const [embeddingModel, setEmbeddingModel] = useState<string>("openai_embed_3_large");
  const [retrievalTopK, setRetrievalTopK] = useState<number>(10);
  
  // API evaluation results state
  const [apiEvaluationResults, setApiEvaluationResults] = useState<ApiEvaluationSummary[]>([]);
  const [isLoadingEvaluations, setIsLoadingEvaluations] = useState(false);
  const [evaluationsError, setEvaluationsError] = useState<string | null>(null);
  
  // Detailed evaluation result state
  const [selectedEvaluationDetail, setSelectedEvaluationDetail] = useState<ApiEvaluationDetail | null>(null);
  const [isLoadingEvaluationDetail, setIsLoadingEvaluationDetail] = useState(false);
  const [evaluationDetailError, setEvaluationDetailError] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Generator selection for evaluation (only OpenAI LLM models)
  const [selectedGenerator, setSelectedGenerator] = useState<string>("gpt-4o-mini");
  const [generatorParams, setGeneratorParams] = useState<{ [key: string]: string | number | boolean }>({
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 512,
    batch: 16
  });

  // Embedding models state - fetch from API
  const [embeddingModels, setEmbeddingModels] = useState<EmbeddingModel[]>([]);
  const [isLoadingEmbeddingModels, setIsLoadingEmbeddingModels] = useState(true);
  const [embeddingModelsError, setEmbeddingModelsError] = useState<string | null>(null);

  // API-fetched parsers state - not needed anymore for evaluation
  const [apiFetchedParsers, setApiFetchedParsers] = useState<Module[]>([]);
  const [apiParsersLoading, setApiParsersLoading] = useState(true);
  const [apiParsersError, setApiParsersError] = useState<string | null>(null);

  // API-fetched chunkers state - not needed anymore for evaluation
  const [apiFetchedChunkers, setApiFetchedChunkers] = useState<Module[]>([]);
  const [apiChunkersLoading, setApiChunkersLoading] = useState(true);
  const [apiChunkersError, setApiChunkersError] = useState<string | null>(null);

  // API-fetched indexers state - not needed anymore for evaluation
  const [apiFetchedIndexers, setApiFetchedIndexers] = useState<Module[]>([]);
  const [apiIndexersLoading, setApiIndexersLoading] = useState(true);
  const [apiIndexersError, setApiIndexersError] = useState<string | null>(null);

  const currentSourceDetails = sources.find(s => s.id === selectedSource);

  // Fetch embedding models from indexer API
  useEffect(() => {
    const fetchEmbeddingModels = async () => {
      try {
        setIsLoadingEmbeddingModels(true);
        setEmbeddingModelsError(null);
        
        if (!API_URL) {
          throw new Error('API_URL not configured');
        }

        const response = await fetch(`${API_URL}/indexer/?limit=50`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ApiIndexerListResponse = await response.json();
        
        // Transform indexer data to embedding models (only vector indexers)
        const models: EmbeddingModel[] = data.indexers
          .filter(indexer => indexer.status === 'active' && indexer.index_type === 'vector')
          .map(indexer => ({
            id: indexer.id,
            name: indexer.name,
            model: indexer.model,
            description: `${indexer.model} (${indexer.name})`
          }));
        
        setEmbeddingModels(models);
        
        // Set default embedding model if available
        if (models.length > 0 && !embeddingModel) {
          setEmbeddingModel(models[0].model);
        }
      } catch (error) {
        console.error('Failed to fetch embedding models:', error);
        setEmbeddingModelsError(error instanceof Error ? error.message : 'Failed to fetch embedding models');
        setEmbeddingModels([]);
      } finally {
        setIsLoadingEmbeddingModels(false);
      }
    };

    fetchEmbeddingModels();
  }, []);

  // Fetch evaluation results from API
  const fetchEvaluationResults = async () => {
    try {
      setIsLoadingEvaluations(true);
      setEvaluationsError(null);
      
      if (!API_URL) {
        throw new Error('API_URL not configured');
      }

      const response = await fetch(`${API_URL}/eval/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const evaluations: ApiEvaluationSummary[] = await response.json();
      setApiEvaluationResults(evaluations);
    } catch (error) {
      console.error('Failed to fetch evaluation results:', error);
      setEvaluationsError(error instanceof Error ? error.message : 'Failed to fetch evaluation results');
      setApiEvaluationResults([]);
    } finally {
      setIsLoadingEvaluations(false);
    }
  };

  // Fetch detailed evaluation result from API
  const fetchEvaluationDetail = async (evalId: string) => {
    try {
      setIsLoadingEvaluationDetail(true);
      setEvaluationDetailError(null);
      
      console.log('Fetching evaluation detail for ID:', evalId);
      
      if (!API_URL) {
        throw new Error('API_URL not configured');
      }

      const response = await fetch(`${API_URL}/eval/${evalId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const detail: ApiEvaluationDetail = await response.json();
      console.log('Received evaluation detail:', detail);
      
      setSelectedEvaluationDetail(detail);
      setShowDetailModal(true);
      
      console.log('Set showDetailModal to true');
    } catch (error) {
      console.error('Failed to fetch evaluation detail:', error);
      setEvaluationDetailError(error instanceof Error ? error.message : 'Failed to fetch evaluation detail');
      setSelectedEvaluationDetail(null);
    } finally {
      setIsLoadingEvaluationDetail(false);
    }
  };

  useEffect(() => {
    const availableMetrics = getAvailableMetrics();
    setDisplayableMetrics(availableMetrics);
    
    // Auto-select some default metrics when available metrics change
    if (availableMetrics.length > 0) {
      const defaultMetrics = [];
      // Auto-select retrieval metrics
      if (availableMetrics.find(m => m.id === 'retrieval_recall')) defaultMetrics.push('retrieval_recall');
      if (availableMetrics.find(m => m.id === 'retrieval_precision')) defaultMetrics.push('retrieval_precision');
      if (availableMetrics.find(m => m.id === 'retrieval_f1')) defaultMetrics.push('retrieval_f1');
      // Auto-select generation metrics if available
      if (availableMetrics.find(m => m.id === 'bleu')) defaultMetrics.push('bleu');
      if (availableMetrics.find(m => m.id === 'rouge')) defaultMetrics.push('rouge');
      
      setSelectedMetrics(defaultMetrics);
    } else {
      setSelectedMetrics([]);
    }
    
    // Clear generator selection if not required
    if (!isGeneratorRequired() && selectedGenerator) {
      setSelectedGenerator("");
      setGeneratorParams({});
    }
  }, [selectedSource, sources]); // Remove selectedRAGRetrieverId and ragRetrievers dependencies

  // Fetch evaluation results when switching to results tab
  useEffect(() => {
    if (activeTab === "results") {
      fetchEvaluationResults();
    }
  }, [activeTab]);

  const handleMetricSelection = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(m => m !== metricId)
        : [...prev, metricId]
    );
  };

  const startEvaluation = async () => {
    if (!selectedSource || selectedMetrics.length === 0) return;
    
    // Check if generator is required and selected
    if (isGeneratorRequired() && !selectedGenerator) return;

    setIsEvaluating(true);

    try {
      if (!API_URL) {
        throw new Error('API_URL not configured');
      }

      // Find the selected source details
      const sourceDetails = sources.find(s => s.id === selectedSource);
      if (!sourceDetails || sourceDetails.type !== 'benchmark') {
        throw new Error('Only benchmark datasets are supported for evaluation');
      }

      // Get available metrics to determine categories
      const availableMetrics = getAvailableMetrics();
      const retrievalMetrics = selectedMetrics
        .filter(metricId => {
          const metric = availableMetrics.find(m => m.id === metricId);
          return metric && (metric.category === 'Retrieval' || metric.category === 'Retrieval Token');
        });

      const generationMetrics = selectedMetrics
        .filter(metricId => {
          const metric = availableMetrics.find(m => m.id === metricId);
          return metric && metric.category === 'Generation';
        })
        .map(metricId => ({ metric_name: metricId }));
      
      // Prepare evaluation configuration
      const evaluationConfig = {
        embedding_model: embeddingModel,
        retrieval_strategy: {
          metrics: retrievalMetrics,
          top_k: retrievalTopK
        },
        generation_strategy: isGeneratorRequired() ? {
          metrics: generationMetrics,
        } : undefined,
        generator_config: selectedGenerator && isGeneratorRequired() ? {
          model: selectedGenerator, // Use selectedGenerator directly as the model ID
          temperature: Number(generatorParams.temperature) || 0.7,
          max_tokens: Number(generatorParams.max_tokens) || 512,
          batch: Number(generatorParams.batch) || 16
        } : undefined,
        prompt_template: "Read the passages and answer the given question.\n\nQuestion: {query}\n\nPassages: {retrieved_contents}\n\nAnswer: "
      };

      // Create evaluation request
      const evaluationRequest = {
        name: evaluationName.trim() || `Evaluation - ${sourceDetails.name}`,
        benchmark_dataset_id: selectedSource, // This is the benchmark dataset ID
        evaluation_config: evaluationConfig
      };

      console.log('Starting evaluation with request:', JSON.stringify(evaluationRequest, null, 2));

      const response = await fetch(`${API_URL}/eval/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(evaluationRequest),
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (response.status === 422 && errorData.detail) {
            // Handle FastAPI validation errors
            const validationErrors = Array.isArray(errorData.detail) 
              ? errorData.detail.map((err: any) => `${err.loc?.join('.')} - ${err.msg}`).join('; ')
              : errorData.detail;
            errorMessage = `Validation error: ${validationErrors}`;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          // If we can't parse the error response, use the status
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const evaluationResponse = await response.json();
      console.log('Evaluation started:', evaluationResponse);

      // Create local result tracking
      const newResult: EvaluationResults = {
        systemId: `eval-${Date.now()}`, // Use timestamp instead of retriever ID
        sourceId: selectedSource,
        startTime: new Date(),
        metrics: [],
        status: "running",
      };

      setResults((prev) => [...prev, newResult]);

      // Refresh evaluation results to show the new evaluation
      await fetchEvaluationResults();
      
      setActiveTab("results");
    } catch (error) {
      console.error("Evaluation failed:", error);
      
      // Show error to user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setEvaluationsError(`Evaluation failed: ${errorMessage}`);
      
      setResults((prev) =>
        prev.map((result) => {
          if (
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

  // Helper function to check if a source requires generator (has Generation metrics)
  const sourceRequiresGenerator = (source: Source): boolean => {
    if (!source.supported_metrics || source.supported_metrics.length === 0) {
      // If no supported metrics specified, assume library type may need generator
      return source.type === 'library';
    }
    // Check if any supported metrics are Generation category
    return source.supported_metrics.some(metric => metric.category === 'Generation');
  };

  // Get the metrics that will be available for the current source/config combination
  const getAvailableMetrics = (): Metric[] => {
    if (!selectedSource) return [];
    
    const sourceDetails = sources.find(s => s.id === selectedSource);
    if (!sourceDetails) return [];

    if (!sourceDetails.supported_metrics || sourceDetails.supported_metrics.length === 0) {
      if (sourceDetails.type === 'library') {
        // For libraries without explicit metrics, return default library metrics
        return DEFAULT_LIBRARY_METRICS_OBJECTS;
      } else {
        return [];
      }
    }

    // For sources with explicit supported metrics, return those
    return sourceDetails.supported_metrics;
  };

  const isGeneratorRequired = (): boolean => {
    if (!selectedSource) return false;
    
    const sourceDetails = sources.find(s => s.id === selectedSource);
    if (!sourceDetails) return false;
    
    return sourceRequiresGenerator(sourceDetails);
  };

  const initializeDefaultParamsForModule = (moduleType: ModuleType, moduleId: string) => {
    let modulesOfType: Module[];
    
    if (moduleType === 'parser') {
      modulesOfType = apiFetchedParsers;
    } else if (moduleType === 'chunker') {
      modulesOfType = apiFetchedChunkers;
    } else if (moduleType === 'indexer') {
      modulesOfType = apiFetchedIndexers;
    } else if (moduleType === 'generator') {
      modulesOfType = GENERATOR_MODULES; 
    } else {
      modulesOfType = []; // Should not happen for configured types
    }
    
    const module = modulesOfType.find(m => m.id === moduleId);
    if (!module) return {};
    const params: { [key: string]: string | number | boolean } = {};
    module.parameters.forEach(p => {
      params[p.id] = p.defaultValue;
    });
    return params;
  };

  const handleNewConfigParamChange = (
    moduleType: ModuleType, 
    paramId: string, 
    value: string | number | boolean
  ) => {
    if (moduleType === 'generator') {
        setGeneratorParams(prev => ({ ...prev, [paramId]: value }));
    } else {
        console.warn(`handleNewConfigParamChange called with unhandled moduleType: ${moduleType}`)
    }
  };

  const renderModuleSelector = (
    moduleType: ModuleType,
    selectedModuleId: string,
    onSelectModule: (moduleId: string) => void,
    currentParams: { [key: string]: string | number | boolean },
    onParamChange: (moduleType: ModuleType, paramId: string, value: string | number | boolean) => void
  ) => {
    let modulesOfType: Module[];
    let isLoading = false;
    let errorMessage: string | null = null;
    
    if (moduleType === 'generator') {
      modulesOfType = GENERATOR_MODULES;
    } else if (moduleType === 'parser') {
      modulesOfType = apiFetchedParsers;
      isLoading = apiParsersLoading;
      errorMessage = apiParsersError;
    } else if (moduleType === 'chunker') {
      modulesOfType = apiFetchedChunkers;
      isLoading = apiChunkersLoading;
      errorMessage = apiChunkersError;
    } else if (moduleType === 'indexer') {
      modulesOfType = apiFetchedIndexers;
      isLoading = apiIndexersLoading;
      errorMessage = apiIndexersError;
    } else {
      modulesOfType = [];
    }
    
    const selectedModuleDetails = modulesOfType.find(m => m.id === selectedModuleId);

    return (
      <div className="space-y-3 p-4 border rounded-md bg-muted/20">
        <div className="flex justify-between items-center">
            <Label htmlFor={`${moduleType}-select`} className="text-md font-semibold capitalize">{moduleType}</Label>
            {selectedModuleDetails && <span className="text-xs text-muted-foreground">{selectedModuleDetails.name}</span>}
        </div>
        
        {(moduleType === 'parser' || moduleType === 'chunker' || moduleType === 'indexer') && isLoading && (
          <div className="text-sm text-muted-foreground">Loading {moduleType}s from API...</div>
        )}
        
        {(moduleType === 'parser' || moduleType === 'chunker' || moduleType === 'indexer') && errorMessage && (
          <div className="text-sm text-red-600">
            Error: Failed to load {moduleType}s from API ({errorMessage}). Configuration cannot proceed without {moduleType}s.
          </div>
        )}
        
        {(moduleType === 'parser' || moduleType === 'chunker' || moduleType === 'indexer') && !isLoading && !errorMessage && modulesOfType.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No {moduleType}s available from the API. Please check the API connection or configuration.
          </div>
        )}
        
        <Select value={selectedModuleId} onValueChange={onSelectModule} disabled={isLoading || (!isLoading && modulesOfType.length === 0)}>
          <SelectTrigger id={`${moduleType}-select`}>
            <SelectValue placeholder={
              isLoading ? "Loading..." : 
              errorMessage ? `Error loading ${moduleType}s` :
              modulesOfType.length === 0 ? `No ${moduleType}s available` : 
              `Select ${moduleType}`
            } />
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
                  <>
                    {(param.id === 'temperature' || param.id === 'top_p') ? (
                      // Use simple range slider for temperature and top_p
                      <>
                        <input
                          id={`${moduleType}-${param.id}`}
                          type="range"
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          value={currentParams[param.id] as number ?? param.defaultValue}
                          onChange={(e) => onParamChange(moduleType, param.id, parseFloat(e.target.value))}
                          className="w-full mt-1"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{param.min}</span>
                          <span>{currentParams[param.id] ?? param.defaultValue}</span>
                          <span>{param.max}</span>
                        </div>
                      </>
                    ) : (
                      // Use regular number input for other numeric parameters
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
                  </>
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="run">Run Evaluation</TabsTrigger>
          <TabsTrigger value="results">View Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="run" className="pt-4">
          <Card>
            <CardHeader>
                <CardTitle>Run Evaluation</CardTitle>
                <CardDescription>Select a data source, embedding model, top k, and generator to start an evaluation run.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="eval-name">Evaluation Name (Optional)</Label>
                  <Input
                    id="eval-name"
                    value={evaluationName}
                    onChange={(e) => setEvaluationName(e.target.value)}
                    placeholder="e.g., My Awesome Evaluation Run"
                  />
                </div>
                
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
                    <Label htmlFor="embedding-model">Embedding Model</Label>
                    <Select value={embeddingModel} onValueChange={setEmbeddingModel}>
                      <SelectTrigger id="embedding-model">
                        <SelectValue placeholder="Select embedding model" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingEmbeddingModels ? (
                          <SelectItem value="loading" disabled>Loading models...</SelectItem>
                        ) : embeddingModelsError ? (
                          <SelectItem value="error" disabled>Error loading models</SelectItem>
                        ) : embeddingModels.length === 0 ? (
                          <SelectItem value="none" disabled>No models available</SelectItem>
                        ) : (
                          embeddingModels.map((model) => (
                            <SelectItem key={model.id} value={model.model}>
                              {model.description || model.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retrieval-top-k">Retrieval Top K</Label>
                  <Input
                    id="retrieval-top-k"
                    type="number"
                    value={retrievalTopK}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 1 && val <= 100) {
                        setRetrievalTopK(val);
                      }
                    }}
                    min={1}
                    max={100}
                    placeholder="10"
                  />
                  <p className="text-xs text-muted-foreground">Number of chunks to retrieve for evaluation</p>
                </div>

                {/* Generator section - only show if the selected source requires generation */}
                {isGeneratorRequired() && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="generator-eval">OpenAI LLM Model</Label>
                      <Select
                        value={selectedGenerator}
                        onValueChange={(value) => {
                          setSelectedGenerator(value);
                          setGeneratorParams(prev => ({
                            ...prev,
                            model: value
                          }));
                        }}
                      >
                        <SelectTrigger id="generator-eval">
                          <SelectValue placeholder="Select OpenAI LLM model" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          {OPENAI_LLM_MODELS.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedGenerator && (
                      <div className="p-4 border rounded-md bg-muted/20">
                        <h4 className="text-sm font-medium mb-3">Model Parameters</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="temperature">Temperature</Label>
                            <Input
                              id="temperature"
                              type="number"
                              value={String(generatorParams.temperature)}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val >= 0.0 && val <= 2.0) {
                                  setGeneratorParams(prev => ({ ...prev, temperature: val }));
                                }
                              }}
                              min={0.0}
                              max={2.0}
                              step={0.1}
                              placeholder="0.7"
                            />
                            <p className="text-xs text-muted-foreground">Controls randomness (0.0-2.0)</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="max-tokens">Max Tokens</Label>
                            <Input
                              id="max-tokens"
                              type="number"
                              value={String(generatorParams.max_tokens)}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val >= 1 && val <= 4096) {
                                  setGeneratorParams(prev => ({ ...prev, max_tokens: val }));
                                }
                              }}
                              min={1}
                              max={4096}
                              step={1}
                              placeholder="512"
                            />
                            <p className="text-xs text-muted-foreground">Maximum tokens to generate</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="batch-size">Batch Size</Label>
                            <Input
                              id="batch-size"
                              type="number"
                              value={String(generatorParams.batch)}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val >= 1 && val <= 128) {
                                  setGeneratorParams(prev => ({ ...prev, batch: val }));
                                }
                              }}
                              min={1}
                              max={128}
                              step={1}
                              placeholder="16"
                            />
                            <p className="text-xs text-muted-foreground">Parallel processing batch size</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!isGeneratorRequired() && selectedSource && (
                  <div className="p-4 border rounded-md bg-blue-50 dark:bg-blue-950/20">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="m9 12 2 2 4-4"/>
                      </svg>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        This source only requires retrieval evaluation - no generator needed.
                      </p>
                    </div>
                  </div>
                )}

                {currentSourceDetails && (isGeneratorRequired() ? selectedGenerator : true) && ( 
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
                             <p className="mt-2"><span className="font-semibold">Embedding Model:</span> {embeddingModel}</p> 
                            <p className="text-xs text-muted-foreground">Vector embeddings for document retrieval</p>
                            <div className="mt-2 space-y-1">
                                <p className="text-xs"><span className="font-semibold">Retrieval Top K:</span> {retrievalTopK} documents</p>
                            </div>
                        </div>
                        {isGeneratorRequired() && selectedGenerator && (
                          <div className="pt-2 border-t">
                              <p><span className="font-semibold">Generator:</span> {OPENAI_LLM_MODELS.find(m => m.id === selectedGenerator)?.name || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">{OPENAI_LLM_MODELS.find(m => m.id === selectedGenerator)?.description || ''}</p>
                              <div className="mt-2 space-y-1">
                                <p className="text-xs"><span className="font-semibold">Temperature:</span> {generatorParams.temperature}</p>
                                <p className="text-xs"><span className="font-semibold">Max Tokens:</span> {generatorParams.max_tokens}</p>
                                <p className="text-xs"><span className="font-semibold">Batch Size:</span> {generatorParams.batch}</p>
                              </div>
                          </div>
                        )}
                        {!isGeneratorRequired() && (
                          <div className="pt-2 border-t">
                              <p><span className="font-semibold">Evaluation Type:</span> Retrieval Only</p>
                              <p className="text-xs text-muted-foreground">This evaluation will focus on retrieval metrics without generation.</p>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                )}

                {currentSourceDetails && (isGeneratorRequired() ? selectedGenerator : true) && ( 
                  <div className="space-y-3 pt-3">
                    <Label className="text-base font-medium">Select Metrics to Evaluate</Label>
                    <p className="text-xs text-muted-foreground">
                      {selectedSource && currentSourceDetails ? `Metrics supported by ${currentSourceDetails.name}:` : 
                       `Select a Source${isGeneratorRequired() ? ' and Generator' : ''} to see available metrics.`}
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
                                  disabled={!selectedSource} 
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
                                    disabled={!selectedSource} 
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
                          {selectedSource ? "No metrics available for the selected source." : "No metrics available for the current selection."}
                        </p>
                    )}
                  </div>
                )}

                <Button
                  className="w-full pt-2"
                  onClick={startEvaluation}
                  disabled={!selectedSource || (isGeneratorRequired() && !selectedGenerator) || selectedMetrics.length === 0 || isEvaluating} 
                >
                  {isEvaluating ? "Evaluating..." : "Start Evaluation & View Results"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Results</CardTitle>
              <CardDescription>View and monitor evaluation runs from the API.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingEvaluations ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading evaluation results...
                  </div>
                </div>
              ) : evaluationsError ? (
                <div className="text-center py-8">
                  <div className="text-red-600 mb-2">Failed to load evaluation results</div>
                  <div className="text-sm text-muted-foreground mb-4">{evaluationsError}</div>
                  <Button variant="outline" onClick={fetchEvaluationResults}>
                    Retry
                  </Button>
                </div>
              ) : apiEvaluationResults.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No evaluation results found.</p>
                  <p className="text-sm text-muted-foreground mt-1">Run an evaluation from the 'Run Evaluation' tab to see results here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Showing {apiEvaluationResults.length} evaluation run{apiEvaluationResults.length === 1 ? '' : 's'}
                    </p>
                    <Button variant="outline" size="sm" onClick={fetchEvaluationResults}>
                      Refresh
                    </Button>
                  </div>
                  
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Retriever Config</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Overall Score</TableHead>
                          <TableHead>Created At</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {apiEvaluationResults.map((evaluation) => (
                          <TableRow key={evaluation.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              {evaluation.name || "Untitled Evaluation"}
                            </TableCell>
                            <TableCell>
                              {evaluation.retriever_config_name || "Unknown"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  evaluation.status === "success"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                }`}
                              >
                                {evaluation.status.charAt(0).toUpperCase() + evaluation.status.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {evaluation.progress !== null ? (
                                <div className="flex items-center space-x-2">
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        evaluation.status === "success" ? "bg-green-600" : "bg-red-600"
                                      }`}
                                      style={{ width: `${evaluation.progress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground min-w-[3rem]">
                                    {evaluation.progress.toFixed(1)}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {evaluation.overall_score !== null ? (
                                <span className="font-medium">
                                  {evaluation.overall_score.toFixed(4)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(evaluation.created_at).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                              })}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchEvaluationDetail(evaluation.id)}
                                disabled={isLoadingEvaluationDetail}
                                className="h-8 px-2"
                              >
                                {isLoadingEvaluationDetail ? "Loading..." : "View Details"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Evaluation Detail Dialog */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEvaluationDetail?.name || "Evaluation Details"}
            </DialogTitle>
            <DialogDescription>
              Complete evaluation configuration and detailed results
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingEvaluationDetail ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading evaluation details...
              </div>
            </div>
          ) : evaluationDetailError ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">Failed to load evaluation details</div>
              <div className="text-sm text-muted-foreground mb-4">{evaluationDetailError}</div>
              <Button variant="outline" onClick={() => selectedEvaluationDetail?.id && fetchEvaluationDetail(selectedEvaluationDetail.id)}>
                Retry
              </Button>
            </div>
          ) : selectedEvaluationDetail ? (
            <div className="space-y-6">
              {/* Evaluation Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Overview</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Status:</span> 
                      <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedEvaluationDetail.status === "success"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}>
                        {selectedEvaluationDetail.status.charAt(0).toUpperCase() + selectedEvaluationDetail.status.slice(1)}
                      </span>
                    </p>
                    <p><span className="font-medium">Progress:</span> {selectedEvaluationDetail.progress?.toFixed(1) || 'N/A'}%</p>
                    <p><span className="font-medium">Total Queries:</span> {selectedEvaluationDetail.total_queries || 'N/A'}</p>
                    <p><span className="font-medium">Processed:</span> {selectedEvaluationDetail.processed_queries || 'N/A'}</p>
                    <p><span className="font-medium">Execution Time:</span> {selectedEvaluationDetail.execution_time ? `${selectedEvaluationDetail.execution_time.toFixed(2)}s` : 'N/A'}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Configuration Used</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Embedding Model:</span> {selectedEvaluationDetail.evaluation_config.embedding_model}</p>
                    <p><span className="font-medium">Retrieval Top K:</span> {selectedEvaluationDetail.evaluation_config.retrieval_strategy.top_k}</p>
                    {selectedEvaluationDetail.evaluation_config.generator_config && (
                      <>
                        <p><span className="font-medium">Generator Model:</span> {selectedEvaluationDetail.evaluation_config.generator_config.model}</p>
                        <p><span className="font-medium">Temperature:</span> {selectedEvaluationDetail.evaluation_config.generator_config.temperature}</p>
                        <p><span className="font-medium">Max Tokens:</span> {selectedEvaluationDetail.evaluation_config.generator_config.max_tokens}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Results */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Evaluation Results</h3>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEvaluationDetail.results.map((result) => (
                        <TableRow key={result.metric_name}>
                          <TableCell className="font-medium">{result.metric_name}</TableCell>
                          <TableCell className="font-mono">{result.value.toFixed(6)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              {/* Detailed Results (if available) */}
              {selectedEvaluationDetail.detailed_results && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Detailed Analysis</h3>
                  
                  {/* Summary */}
                  {selectedEvaluationDetail.detailed_results.summary && (
                    <div className="p-4 border rounded-md bg-muted/20">
                      <h4 className="font-medium mb-2">Summary</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Overall Score:</span>
                          <p className="font-mono font-medium">{selectedEvaluationDetail.detailed_results.summary.overall_score.toFixed(6)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Queries:</span>
                          <p className="font-mono font-medium">{selectedEvaluationDetail.detailed_results.summary.total_queries}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Execution Time:</span>
                          <p className="font-mono font-medium">{(selectedEvaluationDetail.execution_time || selectedEvaluationDetail.detailed_results.summary.execution_time || 0).toFixed(2)}s</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Breakdown by Category */}
                  {selectedEvaluationDetail.detailed_results.detailed_results && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedEvaluationDetail.detailed_results.detailed_results.retrieval_metrics && (
                        <div className="p-4 border rounded-md">
                          <h4 className="font-medium mb-2">Retrieval Metrics</h4>
                          <div className="space-y-1 text-sm">
                            {Object.entries(selectedEvaluationDetail.detailed_results.detailed_results.retrieval_metrics).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-muted-foreground">{key}:</span>
                                <span className="font-mono">{typeof value === 'number' ? value.toFixed(6) : value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedEvaluationDetail.detailed_results.detailed_results.generation_metrics && (
                        <div className="p-4 border rounded-md">
                          <h4 className="font-medium mb-2">Generation Metrics</h4>
                          <div className="space-y-1 text-sm">
                            {Object.entries(selectedEvaluationDetail.detailed_results.detailed_results.generation_metrics).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-muted-foreground">{key}:</span>
                                <span className="font-mono">{typeof value === 'number' ? value.toFixed(6) : value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EvalPage() {
  const [ragRetrievers, setRagRetrievers] = useState<RAGRetriever[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [isLoadingRetrievers, setIsLoadingRetrievers] = useState(true);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [retrieversError, setRetrieversError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch benchmark datasets from API as sources (evaluation only supports benchmarks)
  useEffect(() => {
    const fetchSources = async () => {
      try {
        setIsLoadingSources(true);
        setSourcesError(null);
        if (!API_URL) throw new Error('API_URL not configured');
        
        // Only fetch benchmark datasets since evaluation API requires benchmark_dataset_id
        // Use explicit parameters to avoid 422 errors
        const benchmarksResponse = await fetch(`${API_URL}/eval/benchmarks/?skip=0&limit=100&include_inactive=false`);
        
        if (!benchmarksResponse.ok) {
          const errorText = await benchmarksResponse.text();
          console.error('Benchmarks API error:', benchmarksResponse.status, errorText);
          
          if (benchmarksResponse.status === 422) {
            throw new Error('Validation error when fetching benchmarks. Please check API configuration.');
          } else if (benchmarksResponse.status === 500) {
            throw new Error('Server error: Please ensure the backend API is running and API_SERVER_URL is configured in .env.local');
          }
          throw new Error(`Failed to fetch benchmarks: HTTP ${benchmarksResponse.status} - ${errorText}`);
        }
        
        const benchmarks: ApiBenchmarkDataset[] = await benchmarksResponse.json();
        
        // Transform benchmark datasets to sources format (only active ones)
        const sourcesFromBenchmarks: Source[] = benchmarks
          .filter(benchmark => benchmark.is_active)
          .map((benchmark: ApiBenchmarkDataset) => ({
            id: benchmark.id,
            name: benchmark.name,
            description: benchmark.description || 
              `${benchmark.domain || 'General'} evaluation dataset (${benchmark.total_queries} queries)`,
            type: 'benchmark' as const,
            supported_metrics: [
              // All benchmark datasets support both retrieval and generation metrics
              ALL_METRICS.retrieval_recall,
              ALL_METRICS.retrieval_precision,
              ALL_METRICS.retrieval_f1,
              ALL_METRICS.retrieval_map,
              ALL_METRICS.retrieval_mrr,
              ALL_METRICS.retrieval_ndcg,
              ALL_METRICS.bleu,
              ALL_METRICS.rouge,
              ALL_METRICS.meteor,
              ALL_METRICS.exact_match,
              ALL_METRICS.answer_f1_score,
            ],
          }));
        
        setSources(sourcesFromBenchmarks);
      } catch (error) {
        console.error('Failed to fetch benchmark sources:', error);
        setSourcesError(error instanceof Error ? error.message : 'Failed to fetch benchmark sources');
        setSources([]);
      } finally {
        setIsLoadingSources(false);
      }
    };
    
    fetchSources();
  }, []);

  // Fetch retriever configs from API as RAG retrievers
  useEffect(() => {
    const fetchRAGRetrievers = async () => {
      try {
        setIsLoadingRetrievers(true);
        setRetrieversError(null);
        if (!API_URL) throw new Error('API_URL not configured');
        
        const response = await fetch(`${API_URL}/retriever/`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Retrievers API error:', response.status, errorText);
          
          if (response.status === 500) {
            throw new Error('Server error: Please ensure the backend API is running and API_SERVER_URL is configured in .env.local');
          }
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        const data: ApiRetrieverListResponse = await response.json();
        
        // Transform API retriever data to RAGRetriever format - only include active retrievers
        const retrieversFromAPI: RAGRetriever[] = data.retrievers
          .filter((retriever: ApiRetrieverEntry) => retriever.status === 'active')
          .map((retriever: ApiRetrieverEntry) => ({
            id: retriever.id,
            name: retriever.name,
            description: retriever.description || '',
            parser: { 
              moduleId: retriever.parser_id, 
              parameterValues: {} 
            },
            chunker: { 
              moduleId: retriever.chunker_id, 
              parameterValues: {} 
            },
            indexer: { 
              moduleId: retriever.indexer_id, 
              parameterValues: {} 
            },
            availableMetrics: [
              ALL_METRICS.retrieval_recall, 
              ALL_METRICS.retrieval_precision, 
              ALL_METRICS.retrieval_f1,
              ALL_METRICS.bleu, 
              ALL_METRICS.meteor, 
              ALL_METRICS.rouge, 
              ALL_METRICS.response_time,
            ],
          }));
        
        setRagRetrievers(retrieversFromAPI);
      } catch (error) {
        console.error('Failed to fetch retriever configs:', error);
        setRetrieversError(error instanceof Error ? error.message : 'Failed to fetch retriever configs');
        setRagRetrievers([]);
      } finally {
        setIsLoadingRetrievers(false);
      }
    };
    
    fetchRAGRetrievers();
  }, []);

  return (
    <PageLayout>
      <div className="space-y-6 p-4 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">RAG Evaluation</h1>
          <p className="text-muted-foreground">
            Evaluate RAG pipelines on standardized sources.
          </p>
        </div>

        {/* Loading and Error States */}
        {(isLoadingSources || isLoadingRetrievers) && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-muted-foreground">Loading data from API...</p>
                {isLoadingSources && <p className="text-sm text-muted-foreground">• Loading libraries...</p>}
                {isLoadingRetrievers && <p className="text-sm text-muted-foreground">• Loading retrievers...</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {(sourcesError || retrieversError) && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <p className="text-red-600 font-medium">Error loading data from API</p>
                {sourcesError && <p className="text-sm text-red-600">Sources: {sourcesError}</p>}
                {retrieversError && <p className="text-sm text-red-600">Retrievers: {retrieversError}</p>}
                <p className="text-sm text-muted-foreground">Please check your API connection and try again.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoadingSources && !isLoadingRetrievers && !sourcesError && !retrieversError && sources.length === 0 && ragRetrievers.length === 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">No data available</p>
                <p className="text-sm text-muted-foreground">No libraries or retrievers found. Create some retrievers first.</p>
                <Button onClick={() => router.push('/configure')} className="mt-4">
                  Create Retriever
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoadingSources && !isLoadingRetrievers && (sources.length > 0 || ragRetrievers.length > 0) && (
          <EvaluationInterface ragRetrievers={ragRetrievers} sources={sources} />
        )}
      </div>
    </PageLayout>
  );
} 