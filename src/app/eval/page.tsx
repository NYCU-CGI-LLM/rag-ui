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
  ALL_METRICS.f1,
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

function EvaluationInterface({
  ragRetrievers,
  sources,
}: {
  ragRetrievers: RAGRetriever[];
  sources: Source[];
}) {
  const [selectedRAGRetrieverId, setSelectedRAGRetrieverId] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [displayableMetrics, setDisplayableMetrics] = useState<Metric[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [results, setResults] = useState<EvaluationResults[]>([]);
  const [activeTab, setActiveTab] = useState("run");
  
  // API evaluation results state
  const [apiEvaluationResults, setApiEvaluationResults] = useState<ApiEvaluationSummary[]>([]);
  const [isLoadingEvaluations, setIsLoadingEvaluations] = useState(false);
  const [evaluationsError, setEvaluationsError] = useState<string | null>(null);
  
  // Generator selection for evaluation (moved from RAG config)
  const [selectedGenerator, setSelectedGenerator] = useState<string>("");
  const [generatorParams, setGeneratorParams] = useState<{ [key: string]: string | number | boolean }>({});

  // API-fetched parsers state
  const [apiFetchedParsers, setApiFetchedParsers] = useState<Module[]>([]);
  const [apiParsersLoading, setApiParsersLoading] = useState(true);
  const [apiParsersError, setApiParsersError] = useState<string | null>(null);

  // API-fetched chunkers state
  const [apiFetchedChunkers, setApiFetchedChunkers] = useState<Module[]>([]);
  const [apiChunkersLoading, setApiChunkersLoading] = useState(true);
  const [apiChunkersError, setApiChunkersError] = useState<string | null>(null);

  // API-fetched indexers state
  const [apiFetchedIndexers, setApiFetchedIndexers] = useState<Module[]>([]);
  const [apiIndexersLoading, setApiIndexersLoading] = useState(true);
  const [apiIndexersError, setApiIndexersError] = useState<string | null>(null);

  const currentRAGRetriever = ragRetrievers.find((rc: RAGRetriever) => rc.id === selectedRAGRetrieverId);
  const currentSourceDetails = sources.find(s => s.id === selectedSource);

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

  useEffect(() => {
    const availableMetrics = getAvailableMetrics();
    setDisplayableMetrics(availableMetrics);
    setSelectedMetrics([]);
    
    // Clear generator selection if not required
    if (!isGeneratorRequired() && selectedGenerator) {
      setSelectedGenerator("");
      setGeneratorParams({});
    }
  }, [selectedSource, selectedRAGRetrieverId, sources, ragRetrievers]);

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
    if (!selectedRAGRetrieverId || !selectedSource || !currentRAGRetriever || selectedMetrics.length === 0) return;
    
    // Check if generator is required and selected
    if (isGeneratorRequired() && !selectedGenerator) return;

    setIsEvaluating(true);

    try {
      const newResult: EvaluationResults = {
        systemId: selectedRAGRetrieverId,
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
            result.systemId === selectedRAGRetrieverId &&
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
            result.systemId === selectedRAGRetrieverId &&
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

  const getRAGRetrieverName = (id: string) => {
    return ragRetrievers.find((config: RAGRetriever) => config.id === id)?.name || id;
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
        let metricsToConsider = DEFAULT_LIBRARY_METRICS_OBJECTS;
        if (selectedRAGRetrieverId) {
          const ragRetrieverDetails = ragRetrievers.find((rc: RAGRetriever) => rc.id === selectedRAGRetrieverId);
          if (ragRetrieverDetails && ragRetrieverDetails.availableMetrics) {
            const ragMetricIds = new Set(ragRetrieverDetails.availableMetrics.map((m: Metric) => m.id));
            metricsToConsider = metricsToConsider.filter((m: Metric) => ragMetricIds.has(m.id));
          } else {
            metricsToConsider = [];
          }
        }
        return metricsToConsider;
      } else {
        return [];
      }
    }

    let metricsFromSource: Metric[] = sourceDetails.supported_metrics;

    if (selectedRAGRetrieverId) {
      const ragRetrieverDetails = ragRetrievers.find((rc: RAGRetriever) => rc.id === selectedRAGRetrieverId);
      if (ragRetrieverDetails && ragRetrieverDetails.availableMetrics) {
        const ragMetricIds = new Set(ragRetrieverDetails.availableMetrics.map((m: Metric) => m.id));
        metricsFromSource = metricsFromSource.filter((m: Metric) => ragMetricIds.has(m.id));
      } else {
        metricsFromSource = [];
      }
    }
    
    return metricsFromSource;
  };

  // Check if generator is required for current selection
  const isGeneratorRequired = (): boolean => {
    if (!selectedSource) return false;
    const sourceDetails = sources.find(s => s.id === selectedSource);
    if (!sourceDetails) return false;
    
    const availableMetrics = getAvailableMetrics();
    return availableMetrics.some(metric => metric.category === 'Generation');
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
                <CardDescription>Select a retriever, generator, and data source to start an evaluation run.</CardDescription>
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
                    <Label htmlFor="rag-retriever-eval">Retriever</Label>
                    <Select
                      value={selectedRAGRetrieverId} 
                      onValueChange={(value) => {
                        setSelectedRAGRetrieverId(value);
                      }}
                    >
                      <SelectTrigger id="rag-retriever-eval"> 
                        <SelectValue placeholder="Select retriever" /> 
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {ragRetrievers.map((config: RAGRetriever) => ( 
                          <SelectItem key={config.id} value={config.id}>
                            {config.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Generator section - only show if the selected source requires generation */}
                {isGeneratorRequired() && (
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
                          {GENERATOR_MODULES.map((generator) => (
                            <SelectItem key={generator.id} value={generator.id}>
                              {generator.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedGenerator && (
                      <div className="p-4 border rounded-md bg-muted/20">
                        <h4 className="text-sm font-medium mb-3">Generator Parameters</h4>
                        {renderModuleSelector('generator', selectedGenerator, () => {}, generatorParams, handleNewConfigParamChange)}
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

                {currentRAGRetriever && currentSourceDetails && (isGeneratorRequired() ? selectedGenerator : true) && ( 
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
                             <p className="mt-2"><span className="font-semibold">Retriever:</span> {currentRAGRetriever.name}</p> 
                            <p className="text-xs text-muted-foreground">{currentRAGRetriever.description}</p>
                            <div className="mt-2 space-y-1">
                                <p className="text-xs"><span className="font-semibold">Parser:</span> {apiFetchedParsers.find(m => m.id === currentRAGRetriever.parser.moduleId)?.name || 'N/A (API Error or not found)'}</p>
                                <p className="text-xs"><span className="font-semibold">Chunker:</span> {apiFetchedChunkers.find(m => m.id === currentRAGRetriever.chunker.moduleId)?.name || 'N/A (API Error or not found)'}</p>
                                <p className="text-xs"><span className="font-semibold">Indexer:</span> {apiFetchedIndexers.find(m => m.id === currentRAGRetriever.indexer.moduleId)?.name || 'N/A (API Error or not found)'}</p>
                            </div>
                        </div>
                        {isGeneratorRequired() && selectedGenerator && (
                          <div className="pt-2 border-t">
                              <p><span className="font-semibold">Generator:</span> {GENERATOR_MODULES.find(m => m.id === selectedGenerator)?.name || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">{GENERATOR_MODULES.find(m => m.id === selectedGenerator)?.description || ''}</p>
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

                {currentSourceDetails && currentRAGRetriever && (isGeneratorRequired() ? selectedGenerator : true) && ( 
                  <div className="space-y-3 pt-3">
                    <Label className="text-base font-medium">Select Metrics to Evaluate</Label>
                    <p className="text-xs text-muted-foreground">
                      {selectedSource && !selectedRAGRetrieverId && currentSourceDetails ? `Metrics supported by ${currentSourceDetails.name}:` : 
                       selectedSource && selectedRAGRetrieverId && currentSourceDetails && currentRAGRetriever ? `Common metrics for ${currentSourceDetails.name} and ${currentRAGRetriever.name}:` : 
                       !selectedSource && selectedRAGRetrieverId && currentRAGRetriever ? `Metrics available in ${currentRAGRetriever.name}:` : 
                       `Select a Source${isGeneratorRequired() ? ', Retriever, and Generator' : ' and Retriever'} to see available metrics.`}
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
                                  disabled={!selectedSource || !selectedRAGRetrieverId} 
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
                                    disabled={!selectedSource || !selectedRAGRetrieverId} 
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
                          {selectedSource && selectedRAGRetrieverId ? "No common metrics found for the selected Source and Retriever." : "No metrics available for the current selection."}
                        </p>
                    )}
                  </div>
                )}

                <Button
                  className="w-full pt-2"
                  onClick={startEvaluation}
                  disabled={!selectedRAGRetrieverId || !selectedSource || (isGeneratorRequired() && !selectedGenerator) || selectedMetrics.length === 0 || isEvaluating} 
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {apiEvaluationResults.map((evaluation) => (
                          <TableRow key={evaluation.id}>
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

  // Fetch libraries from API as sources
  useEffect(() => {
    const fetchSources = async () => {
      try {
        setIsLoadingSources(true);
        setSourcesError(null);
        if (!API_URL) throw new Error('API_URL not configured');
        
        const response = await fetch(`${API_URL}/library/`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const libraries = await response.json();
        
        // Transform library data to sources format
        const sourcesFromLibraries: Source[] = libraries.map((lib: any) => ({
          id: lib.id,
          name: lib.library_name,
          description: lib.description || '',
          type: 'library' as const,
          supported_metrics: DEFAULT_LIBRARY_METRICS_OBJECTS,
        }));
        
        // Add some example benchmark sources for demonstration
        const benchmarkSources: Source[] = [
          {
            id: 'benchmark_retrieval_only',
            name: 'MS MARCO Retrieval',
            description: 'Microsoft Machine Reading Comprehension - Retrieval evaluation only',
            type: 'benchmark' as const,
            supported_metrics: [
              ALL_METRICS.recall,
              ALL_METRICS.precision,
              ALL_METRICS.f1,
              ALL_METRICS.map,
              ALL_METRICS.mrr,
              ALL_METRICS.ndcg,
            ],
          },
          {
            id: 'benchmark_full_rag',
            name: 'Natural Questions (Full RAG)',
            description: 'Natural Questions dataset with retrieval and generation evaluation',
            type: 'benchmark' as const,
            supported_metrics: [
              ALL_METRICS.recall,
              ALL_METRICS.precision,
              ALL_METRICS.f1,
              ALL_METRICS.bleu,
              ALL_METRICS.rouge,
              ALL_METRICS.exact_match,
              ALL_METRICS.answer_f1_score,
            ],
          },
        ];
        
        setSources([...sourcesFromLibraries, ...benchmarkSources]);
      } catch (error) {
        console.error('Failed to fetch libraries:', error);
        setSourcesError(error instanceof Error ? error.message : 'Failed to fetch libraries');
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
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
              ALL_METRICS.recall, 
              ALL_METRICS.precision, 
              ALL_METRICS.f1,
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