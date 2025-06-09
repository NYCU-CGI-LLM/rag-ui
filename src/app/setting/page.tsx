'use client'

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
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
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, Settings, Eye } from 'lucide-react';

// API Configuration
const API_URL = "/api";

// Type Definitions (Copied from original eval/page.tsx, consider moving to a shared file)
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

// New interfaces for retriever configs from API
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

// Detailed component responses
interface ApiParserDetailResponse {
  id: string;
  name: string;
  module_type: string;
  supported_mime: string[];
  params: ApiParserParameterValue;
  status: string;
  description?: string;
}

interface ApiChunkerDetailResponse {
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

interface ApiIndexerDetailResponse {
  id: string;
  name: string;
  index_type: string;
  model: string;
  params: ApiParserParameterValue;
  status: string;
  description?: string;
}

// API request interface for creating retriever
interface CreateRetrieverRequest {
  name: string;
  description?: string;
  library_id: string;
  parser_id: string;
  chunker_id: string;
  indexer_id: string;
  top_k?: number;
  params?: object;
  collection_name?: string;
}

interface CreateRetrieverResponse {
  retriever_id: string;
  status: string;
  parse_results: number;
  chunk_results: number;
  successful_chunks: number;
  collection_name?: string;
  total_chunks?: number;
  index_result: object;
}

type ModuleType = 'parser' | 'chunker' | 'generator' | 'indexer';
type ParameterType = 'string' | 'number' | 'boolean' | 'select';

interface ParameterDefinition {
  id: string;
  name: string;
  type: ParameterType;
  defaultValue: string | number | boolean;
  options?: string[];
  description?: string;
  min?: number;
  max?: number;
  step?: number;
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

interface Metric {
    id: string;
    name: string;
    category: 'Retrieval' | 'Retrieval Token' | 'Generation';
}
  
interface RAGRetriever {
  id: string;
  name: string;
  description: string;
  parser: SelectedModuleConfig;
  chunker: SelectedModuleConfig;
  indexer: SelectedModuleConfig;
  availableMetrics: Metric[]; 
  // Consider adding selectedSourceId here if it becomes part of the retriever itself
  // selectedSourceId?: string;
}

interface Source {
    id: string;
    name: string;
    description: string;
    type: 'benchmark' | 'library';
    supported_metrics?: Metric[];
}

// ALL_METRICS and GENERATOR_MODULES might be needed if defaults are set from them
// For simplicity, RAGRetriever.availableMetrics is set to ALL_METRICS for now on save.
const ALL_METRICS: { [key: string]: Metric } = {
    recall: { id: "recall", name: "Recall", category: "Retrieval" as const },
    precision: { id: "precision", name: "Precision", category: "Retrieval" as const },
    f1: { id: "f1", name: "F1", category: "Retrieval" as const },
    map: { id: "map", name: "mAP", category: "Retrieval" as const },
    mrr: { id: "mrr", name: "mRR", category: "Retrieval" as const },
    ndcg: { id: "ndcg", name: "NDCG", category: "Retrieval" as const },
    token_recall: { id: "token_recall", name: "Token Recall", category: "Retrieval Token" as const },
    token_precision: { id: "token_precision", name: "Token Precision", category: "Retrieval Token" as const },
    token_f1: { id: "token_f1", name: "Token F1", category: "Retrieval Token" as const },
    bleu: { id: "bleu", name: "BLEU", category: "Generation" as const },
    rouge: { id: "rouge", name: "ROUGE", category: "Generation" as const },
    meteor: { id: "meteor", name: "METEOR", category: "Generation" as const },
    bert_score: { id: "bert_score", name: "Bert Score", category: "Generation" as const },
    geval_coherence: { id: "geval_coherence", name: "G-Eval Coherence", category: "Generation" as const },
    geval_consistency: { id: "geval_consistency", name: "G-Eval Consistency", category: "Generation" as const },
    geval_fluency: { id: "geval_fluency", name: "G-Eval Fluency", category: "Generation" as const },
    geval_relevance: { id: "geval_relevance", name: "G-Eval Relevance", category: "Generation" as const },
    sem_score: { id: "sem_score", name: "Sem Score", category: "Generation" as const },
    response_time: { id: "response_time", name: "Response Time", category: "Generation" as const },
    exact_match: { id: "exact_match", name: "Exact Match (EM)", category: "Generation" as const },
    answer_f1_score: { id: "answer_f1_score", name: "Answer F1 Score", category: "Generation" as const },
    answer_recall: { id: "answer_recall", name: "Answer Recall", category: "Generation" as const },
    hallucination_rate: { id: "hallucination_rate", name: "Hallucination Rate", category: "Generation" as const },
    overall_quality_score: {id: "overall_quality_score", name: "Overall Quality Score", category: "Generation" as const },
    groundedness: {id: "groundedness", name: "Groundedness", category: "Generation" as const },
    toxicity_rate: {id: "toxicity_rate", name: "Toxicity Rate", category: "Generation" as const },
  };

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

// Helper functions (Copied from original eval/page.tsx)
const formatParamName = (id: string): string => {
  return id
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const inferParameterType = (value: string | number | boolean): ParameterType => {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
};

const transformApiParsersToModules = (apiParsers: ApiParserEntry[]): Module[] => {
  return apiParsers.map(apiParser => {
    const parameters: ParameterDefinition[] = [];
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
      id: apiParser.id,
      name: apiParser.name,
      description: apiParser.description || `${apiParser.module_type} parser`,
      type: 'parser' as const,
      parameters
    };
  });
};

const transformApiChunkersToModules = (apiChunkers: ApiChunkerEntry[]): Module[] => {
  return apiChunkers.map(apiChunker => {
    const parameters: ParameterDefinition[] = [];
    parameters.push({
      id: 'chunk_method',
      name: 'Chunk Method',
      type: 'string',
      defaultValue: apiChunker.chunk_method,
      description: 'Method used for chunking'
    });
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
    Object.entries(apiChunker.params).forEach(([key, value]) => {
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
      id: apiChunker.id,
      name: apiChunker.name,
      description: apiChunker.description || `${apiChunker.module_type} chunker (${apiChunker.chunk_method})`,
      type: 'chunker' as const,
      parameters
    };
  });
};

const transformApiIndexersToModules = (apiIndexers: ApiIndexerEntry[]): Module[] => {
  return apiIndexers.map(apiIndexer => {
    const parameters: ParameterDefinition[] = [];
    parameters.push({
      id: 'index_type',
      name: 'Index Type',
      type: 'string',
      defaultValue: apiIndexer.index_type,
      description: 'Type of index (vector, bm25, hybrid)'
    });
    parameters.push({
      id: 'model',
      name: 'Model',
      type: 'string',
      defaultValue: apiIndexer.model,
      description: 'Model used for indexing'
    });
    Object.entries(apiIndexer.params).forEach(([key, value]) => {
      if (key !== 'index_type' && key !== 'model') {
        let paramType: ParameterType = inferParameterType(value);
        let options: string[] | undefined = undefined;
        if (key === 'similarity_metric') {
          paramType = 'select';
          options = ['cosine', 'ip', 'l2'];
        }
        parameters.push({
          id: key,
          name: formatParamName(key),
          type: paramType,
          defaultValue: value,
          options: options,
          description: `${formatParamName(key)} parameter`,
          ...(paramType === 'number' && key.includes('dimension') && { min: 128, max: 4096, step: 1 }),
          ...(paramType === 'number' && key.includes('batch') && { min: 1, max: 500, step: 1 }),
          ...(paramType === 'number' && (key.includes('size') || key.includes('length')) && { min: 1, max: 2048, step: 1 }),
          ...(paramType === 'number' && key.includes('weight') && { min: 0.0, max: 1.0, step: 0.1 }),
          ...(paramType === 'number' && (key === 'b' || key === 'k1' || key === 'epsilon') && { min: 0.0, max: 2.0, step: 0.01 })
        });
      }
    });
    return {
      id: apiIndexer.id,
      name: apiIndexer.name,
      description: apiIndexer.description || `${apiIndexer.index_type} indexer using ${apiIndexer.model}`,
      type: 'indexer' as const,
      parameters
    };
  });
};

export default function RetrieverPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Main state
  const [retrievers, setRetrievers] = useState<ApiRetrieverEntry[]>([]);
  const [isLoadingRetrievers, setIsLoadingRetrievers] = useState(true);
  const [retrieversError, setRetrieversError] = useState<string | null>(null);

  const [sources, setSources] = useState<Source[]>([]);
  const [isCreatingRetriever, setIsCreatingRetriever] = useState(false);

  // Create form state
  const [currentRetrieverName, setCurrentRetrieverName] = useState<string>("");
  const [currentRetrieverDescription, setCurrentRetrieverDescription] = useState<string>("");
  const [selectedParser, setSelectedParser] = useState<string>("");
  const [selectedChunker, setSelectedChunker] = useState<string>("");
  const [selectedIndexer, setSelectedIndexer] = useState<string>("");
  const [selectedSourceForContext, setSelectedSourceForContext] = useState<string>("");

  // Module state
  const [apiFetchedParsers, setApiFetchedParsers] = useState<Module[]>([]);
  const [apiParsersLoading, setApiParsersLoading] = useState(true);
  const [apiParsersError, setApiParsersError] = useState<string | null>(null);

  const [apiFetchedChunkers, setApiFetchedChunkers] = useState<Module[]>([]);
  const [apiChunkersLoading, setApiChunkersLoading] = useState(true);
  const [apiChunkersError, setApiChunkersError] = useState<string | null>(null);

  const [apiFetchedIndexers, setApiFetchedIndexers] = useState<Module[]>([]);
  const [apiIndexersLoading, setApiIndexersLoading] = useState(true);
  const [apiIndexersError, setApiIndexersError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all data on component mount
  useEffect(() => {
    fetchRetrievers();
    fetchLibraries();
    fetchParsers();
    fetchChunkers();
    fetchIndexers();
  }, []);

  const fetchRetrievers = async () => {
    try {
      setIsLoadingRetrievers(true);
      setRetrieversError(null);
      if (!API_URL) throw new Error('API_URL not configured');
      const response = await fetch(`${API_URL}/retriever/`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data: ApiRetrieverListResponse = await response.json();
      setRetrievers(data.retrievers);
    } catch (error) {
      console.error('Failed to fetch retrievers:', error);
      setRetrieversError(error instanceof Error ? error.message : 'Failed to fetch retrievers');
      setRetrievers([]);
    } finally {
      setIsLoadingRetrievers(false);
    }
  };

  const fetchLibraries = async () => {
    try {
      if (!API_URL) throw new Error('API_URL not configured');
      const response = await fetch(`${API_URL}/library/`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const libraries = await response.json();
      
      const sourcesFromLibraries: Source[] = libraries.map((lib: any) => ({
        id: lib.id,
        name: lib.library_name,
        description: lib.description || '',
        type: 'library' as const
      }));
      
      setSources(sourcesFromLibraries);
    } catch (error) {
      console.error('Failed to fetch libraries:', error);
      setSources([]);
    }
  };

  const fetchParsers = async () => {
    try {
      setApiParsersLoading(true);
      setApiParsersError(null);
      if (!API_URL) throw new Error('API_URL not configured');
      const response = await fetch(`${API_URL}/parser/`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data: ApiParserListResponse = await response.json();
      setApiFetchedParsers(transformApiParsersToModules(data.parsers));
    } catch (error) {
      console.error('Failed to fetch parsers:', error);
      setApiParsersError(error instanceof Error ? error.message : 'Failed to fetch parsers');
      setApiFetchedParsers([]);
    } finally {
      setApiParsersLoading(false);
    }
  };

  const fetchChunkers = async () => {
    try {
      setApiChunkersLoading(true);
      setApiChunkersError(null);
      if (!API_URL) throw new Error('API_URL not configured');
      const response = await fetch(`${API_URL}/chunker/`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data: ApiChunkerListResponse = await response.json();
      setApiFetchedChunkers(transformApiChunkersToModules(data.chunkers));
    } catch (error) {
      console.error('Failed to fetch chunkers:', error);
      setApiChunkersError(error instanceof Error ? error.message : 'Failed to fetch chunkers');
      setApiFetchedChunkers([]);
    } finally {
      setApiChunkersLoading(false);
    }
  };

  const fetchIndexers = async () => {
    try {
      setApiIndexersLoading(true);
      setApiIndexersError(null);
      if (!API_URL) throw new Error('API_URL not configured');
      const response = await fetch(`${API_URL}/indexer/`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data: ApiIndexerListResponse = await response.json();
      setApiFetchedIndexers(transformApiIndexersToModules(data.indexers));
    } catch (error) {
      console.error('Failed to fetch indexers:', error);
      setApiIndexersError(error instanceof Error ? error.message : 'Failed to fetch indexers');
      setApiFetchedIndexers([]);
    } finally {
      setApiIndexersLoading(false);
    }
  };

  const resetCreateForm = () => {
    setCurrentRetrieverName("");
    setCurrentRetrieverDescription("");
    setSelectedParser("");
    setSelectedChunker("");
    setSelectedIndexer("");
    setSelectedSourceForContext("");
  };

  const handleCreateRetriever = () => {
    resetCreateForm();
    setIsCreatingRetriever(true);
  };

  const handleSaveRetriever = async () => {
    if (!currentRetrieverName.trim() || !selectedParser || !selectedChunker || !selectedIndexer) {
      alert("Please provide a retriever name and select a parser, chunker, and indexer.");
      return;
    }

    if (!selectedSourceForContext) {
      alert("Please select a source/library for the retriever.");
      return;
    }

    try {
      setIsSubmitting(true);

      const requestBody: CreateRetrieverRequest = {
        name: currentRetrieverName.trim(),
        description: currentRetrieverDescription.trim() || undefined,
        library_id: selectedSourceForContext,
        parser_id: selectedParser,
        chunker_id: selectedChunker,
        indexer_id: selectedIndexer,
        top_k: 10,
        params: {},
        collection_name: `${currentRetrieverName.trim().replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`
      };

      if (!API_URL) throw new Error('API_URL not configured');

      const response = await fetch(`${API_URL}/retriever/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result: CreateRetrieverResponse = await response.json();
      
      alert(`Retriever created successfully!\n\nRetriever ID: ${result.retriever_id}\nStatus: ${result.status}\nTotal Chunks: ${result.total_chunks || 'N/A'}`);
      
      // Refresh the retrievers list and close dialog
      await fetchRetrievers();
      setIsCreatingRetriever(false);

    } catch (error) {
      console.error('Failed to create retriever:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create retriever';
      alert(`Error creating retriever: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'processing': return 'secondary';
      case 'error': return 'destructive';
      case 'inactive': return 'outline';
      default: return 'secondary';
    }
  };

  const getParserName = (parserId: string) => {
    return apiFetchedParsers.find(p => p.id === parserId)?.name || parserId;
  };

  const getChunkerName = (chunkerId: string) => {
    return apiFetchedChunkers.find(c => c.id === chunkerId)?.name || chunkerId;
  };

  const getIndexerName = (indexerId: string) => {
    return apiFetchedIndexers.find(i => i.id === indexerId)?.name || indexerId;
  };

  const getLibraryName = (libraryId: string) => {
    return sources.find(s => s.id === libraryId)?.name || libraryId;
  };

  return (
    <PageLayout>
      <div className="space-y-6 p-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">RAG Retrievers</h1>
            <p className="text-muted-foreground">
              Manage your retrieval pipelines for RAG applications.
            </p>
          </div>
          <Button onClick={handleCreateRetriever}>Create New Retriever</Button>
        </div>

        {/* Loading and Error States */}
        {isLoadingRetrievers && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-muted-foreground">Loading retrievers...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {retrieversError && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <p className="text-red-600 font-medium">Error loading retrievers</p>
                <p className="text-sm text-red-600">{retrieversError}</p>
                <Button onClick={fetchRetrievers} variant="outline" size="sm">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Retrievers Grid */}
        {!isLoadingRetrievers && !retrieversError && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {retrievers
              .slice()
              .sort((a, b) => new Date(b.indexed_at || '').getTime() - new Date(a.indexed_at || '').getTime())
              .map((retriever) => (
                <Card 
                  key={retriever.id} 
                  className="hover:border-primary cursor-pointer relative"
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{retriever.name}</CardTitle>
                      <Badge variant={getStatusBadgeVariant(retriever.status)}>
                        {retriever.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {retriever.description || 'No description provided'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Library:</span>
                        <span className="font-medium">{getLibraryName(retriever.library_id)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Parser:</span>
                        <span className="font-medium text-xs">{getParserName(retriever.parser_id)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Chunker:</span>
                        <span className="font-medium text-xs">{getChunkerName(retriever.chunker_id)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Indexer:</span>
                        <span className="font-medium text-xs">{getIndexerName(retriever.indexer_id)}</span>
                      </div>
                      {retriever.total_chunks && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Chunks:</span>
                          <span className="font-medium">{retriever.total_chunks.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2 text-xs text-muted-foreground">
                    <span>Top-K: {retriever.top_k}</span>
                    <span>
                      {retriever.indexed_at 
                        ? `Indexed: ${new Date(retriever.indexed_at).toLocaleDateString()}`
                        : 'Not indexed'
                      }
                    </span>
                  </CardFooter>
                </Card>
              ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoadingRetrievers && !retrieversError && retrievers.length === 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">No retrievers found</p>
                <p className="text-sm text-muted-foreground">Create your first retriever to get started.</p>
                <Button onClick={handleCreateRetriever} className="mt-4">
                  Create Retriever
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Retriever Dialog */}
        <Dialog open={isCreatingRetriever} onOpenChange={setIsCreatingRetriever}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Retriever</DialogTitle>
              <DialogDescription>
                Configure a new retrieval pipeline by selecting modules and setting parameters.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="retriever-name">Retriever Name</Label>
                  <Input 
                    id="retriever-name" 
                    value={currentRetrieverName} 
                    onChange={(e) => setCurrentRetrieverName(e.target.value)} 
                    placeholder="e.g., My Custom Retriever" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="retriever-description">Description (Optional)</Label>
                  <Input 
                    id="retriever-description" 
                    value={currentRetrieverDescription} 
                    onChange={(e) => setCurrentRetrieverDescription(e.target.value)} 
                    placeholder="A brief description of this retriever" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source-select">Select Library (Required)</Label>
                  <Select value={selectedSourceForContext} onValueChange={setSelectedSourceForContext}>
                    <SelectTrigger id="source-select">
                      <SelectValue placeholder="Select a library" />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map(source => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Module Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Select Modules</h3>
                
                {/* Parser Selection */}
                <div className="space-y-2">
                  <Label htmlFor="parser-select">Parser</Label>
                  <Select value={selectedParser} onValueChange={setSelectedParser} disabled={apiParsersLoading}>
                    <SelectTrigger id="parser-select">
                      <SelectValue placeholder={apiParsersLoading ? "Loading parsers..." : "Select parser"} />
                    </SelectTrigger>
                    <SelectContent>
                      {apiFetchedParsers.map(parser => (
                        <SelectItem key={parser.id} value={parser.id}>
                          {parser.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {apiParsersError && (
                    <p className="text-sm text-red-600">Error loading parsers: {apiParsersError}</p>
                  )}
                </div>

                {/* Chunker Selection */}
                <div className="space-y-2">
                  <Label htmlFor="chunker-select">Chunker</Label>
                  <Select value={selectedChunker} onValueChange={setSelectedChunker} disabled={apiChunkersLoading}>
                    <SelectTrigger id="chunker-select">
                      <SelectValue placeholder={apiChunkersLoading ? "Loading chunkers..." : "Select chunker"} />
                    </SelectTrigger>
                    <SelectContent>
                      {apiFetchedChunkers.map(chunker => (
                        <SelectItem key={chunker.id} value={chunker.id}>
                          {chunker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {apiChunkersError && (
                    <p className="text-sm text-red-600">Error loading chunkers: {apiChunkersError}</p>
                  )}
                </div>

                {/* Indexer Selection */}
                <div className="space-y-2">
                  <Label htmlFor="indexer-select">Indexer</Label>
                  <Select value={selectedIndexer} onValueChange={setSelectedIndexer} disabled={apiIndexersLoading}>
                    <SelectTrigger id="indexer-select">
                      <SelectValue placeholder={apiIndexersLoading ? "Loading indexers..." : "Select indexer"} />
                    </SelectTrigger>
                    <SelectContent>
                      {apiFetchedIndexers.map(indexer => (
                        <SelectItem key={indexer.id} value={indexer.id}>
                          {indexer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {apiIndexersError && (
                    <p className="text-sm text-red-600">Error loading indexers: {apiIndexersError}</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreatingRetriever(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveRetriever} 
                disabled={!currentRetrieverName.trim() || !selectedParser || !selectedChunker || !selectedIndexer || !selectedSourceForContext || isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Retriever"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
} 