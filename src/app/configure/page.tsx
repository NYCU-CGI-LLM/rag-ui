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

// API Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

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
  
interface RAGConfig {
  id: string;
  name: string;
  description: string;
  parser: SelectedModuleConfig;
  chunker: SelectedModuleConfig;
  indexer: SelectedModuleConfig;
  availableMetrics: Metric[]; 
  // Consider adding selectedSourceId here if it becomes part of the config itself
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
// For simplicity, RAGConfig.availableMetrics is set to ALL_METRICS for now on save.
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

export default function ConfigureRAGPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ragConfigs, setRagConfigs] = useState<RAGConfig[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  
  const [currentConfigName, setCurrentConfigName] = useState<string>("");
  const [currentConfigDescription, setCurrentConfigDescription] = useState<string>("");
  const [selectedParser, setSelectedParser] = useState<string>("");
  const [selectedChunker, setSelectedChunker] = useState<string>("");
  const [selectedIndexer, setSelectedIndexer] = useState<string>("");
  const [parserParams, setParserParams] = useState<{ [key: string]: string | number | boolean }>({});
  const [chunkerParams, setChunkerParams] = useState<{ [key: string]: string | number | boolean }>({});
  const [indexerParams, setIndexerParams] = useState<{ [key: string]: string | number | boolean }>({});
  const [selectedSourceForContext, setSelectedSourceForContext] = useState<string>("");
  const [configToEditId, setConfigToEditId] = useState<string | null>(null);

  const [apiFetchedParsers, setApiFetchedParsers] = useState<Module[]>([]);
  const [apiParsersLoading, setApiParsersLoading] = useState(true);
  const [apiParsersError, setApiParsersError] = useState<string | null>(null);

  const [apiFetchedChunkers, setApiFetchedChunkers] = useState<Module[]>([]);
  const [apiChunkersLoading, setApiChunkersLoading] = useState(true);
  const [apiChunkersError, setApiChunkersError] = useState<string | null>(null);

  const [apiFetchedIndexers, setApiFetchedIndexers] = useState<Module[]>([]);
  const [apiIndexersLoading, setApiIndexersLoading] = useState(true);
  const [apiIndexersError, setApiIndexersError] = useState<string | null>(null);

  const CREATE_NEW_CONFIG_VALUE = "__CREATE_NEW__";

  // Function to reset form to a "create new" state
  const resetFormToCreateNew = () => {
    setConfigToEditId(null);
    setCurrentConfigName("");
    setCurrentConfigDescription("");
    setSelectedParser("");
    setParserParams({});
    setSelectedChunker("");
    setChunkerParams({});
    setSelectedIndexer("");
    setIndexerParams({});
    setSelectedSourceForContext("");
    // Navigate to clear URL params if any were present
    router.push('/configure', { scroll: false });
  };

  useEffect(() => {
    const storedRagConfigs = localStorage.getItem('ragConfigs');
    if (storedRagConfigs) setRagConfigs(JSON.parse(storedRagConfigs));
    
    const storedSources = localStorage.getItem('sources');
    if (storedSources) setSources(JSON.parse(storedSources));

    const editId = searchParams.get('edit');

    if (editId && storedRagConfigs) {
        const configs: RAGConfig[] = JSON.parse(storedRagConfigs);
        const configToLoad = configs.find(rc => rc.id === editId);
        if (configToLoad) {
            setConfigToEditId(editId);
            setCurrentConfigName(configToLoad.name); // Load actual name for editing
            setCurrentConfigDescription(configToLoad.description);
            setSelectedParser(configToLoad.parser.moduleId);
            setParserParams({...configToLoad.parser.parameterValues});
            setSelectedChunker(configToLoad.chunker.moduleId);
            setChunkerParams({...configToLoad.chunker.parameterValues});
            setSelectedIndexer(configToLoad.indexer.moduleId);
            setIndexerParams({...configToLoad.indexer.parameterValues});
            // If you add selectedSourceId to RAGConfig, load it here:
            // setSelectedSourceForContext(configToLoad.selectedSourceId || ""); 
        } else {
            // editId in URL is invalid, reset to create new
            resetFormToCreateNew();
        }
    } else if (!editId && configToEditId !== null) {
        // This case handles navigating from an edit state to "create new" via URL manipulation (e.g. manually removing ?edit=...)
        // Or if the select dropdown directly calls reset which clears the URL.
        resetFormToCreateNew();
    } else if (!editId && configToEditId === null) {
        // Initial load on /eval/configure without edit param, ensure form is clear (though default states should handle this)
        // This is mostly a safeguard or for explicit clarity
        setCurrentConfigName("");
        setCurrentConfigDescription("");
        setSelectedParser("");
        setParserParams({});
        setSelectedChunker("");
        setChunkerParams({});
        setSelectedIndexer("");
        setIndexerParams({});
        setSelectedSourceForContext("");
    }
  }, [searchParams]); // Depend on searchParams

  // Fetch parsers
  useEffect(() => {
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
    fetchParsers();
  }, []);

  // Fetch chunkers
  useEffect(() => {
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
    fetchChunkers();
  }, []);

  // Fetch indexers
  useEffect(() => {
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
    fetchIndexers();
  }, []);

  const initializeDefaultParamsForModule = (moduleType: ModuleType, moduleId: string) => {
    let modulesOfType: Module[];
    if (moduleType === 'parser') modulesOfType = apiFetchedParsers;
    else if (moduleType === 'chunker') modulesOfType = apiFetchedChunkers;
    else if (moduleType === 'indexer') modulesOfType = apiFetchedIndexers;
    else modulesOfType = [];
    
    const module = modulesOfType.find(m => m.id === moduleId);
    if (!module) return {};
    const params: { [key: string]: string | number | boolean } = {};
    module.parameters.forEach(p => { params[p.id] = p.defaultValue; });
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
  const handleNewConfigIndexerSelect = (moduleId: string) => {
    setSelectedIndexer(moduleId);
    setIndexerParams(initializeDefaultParamsForModule('indexer', moduleId));
  };

  const handleNewConfigParamChange = (
    moduleType: ModuleType, 
    paramId: string, 
    value: string | number | boolean
  ) => {
    switch (moduleType) {
      case 'parser': setParserParams(prev => ({ ...prev, [paramId]: value })); break;
      case 'chunker': setChunkerParams(prev => ({ ...prev, [paramId]: value })); break;
      case 'indexer': setIndexerParams(prev => ({ ...prev, [paramId]: value })); break;
    }
  };

  const handleSaveConfig = () => {
    if (!currentConfigName.trim() || !selectedParser || !selectedChunker || !selectedIndexer) {
      alert("Please provide a configuration name and select a parser, chunker, and indexer.");
      return;
    }
    const existingConfigs: RAGConfig[] = JSON.parse(localStorage.getItem('ragConfigs') || '[]');
    // When editing, allow saving with the same name if the ID matches.
    // When creating new, or renaming an existing to a name that already exists (but is not the current one being edited), prevent.
    if (existingConfigs.some(config => config.name === currentConfigName.trim() && config.id !== configToEditId)) {
      alert("A Preprocessing & Retrieval configuration with this name already exists. Please choose a different name.");
      return;
    }

    const newConfig: RAGConfig = {
      id: configToEditId || `custom_${Date.now()}_${currentConfigName.trim().replace(/\s+/g, '_').toLowerCase()}`,
      name: currentConfigName.trim(),
      description: currentConfigDescription.trim(),
      parser: { moduleId: selectedParser, parameterValues: parserParams },
      chunker: { moduleId: selectedChunker, parameterValues: chunkerParams },
      indexer: { moduleId: selectedIndexer, parameterValues: indexerParams },
      availableMetrics: Object.values(ALL_METRICS),
    };

    let updatedConfigs = [];
    if (configToEditId) {
        updatedConfigs = existingConfigs.map(c => c.id === configToEditId ? newConfig : c);
    } else {
        updatedConfigs = [...existingConfigs, newConfig];
    }
    localStorage.setItem('ragConfigs', JSON.stringify(updatedConfigs));
    alert(configToEditId ? "Configuration updated!" : "Preprocessing & Retrieval Configuration saved!");
    router.push('/eval');
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
    
    if (moduleType === 'parser') { modulesOfType = apiFetchedParsers; isLoading = apiParsersLoading; errorMessage = apiParsersError; }
    else if (moduleType === 'chunker') { modulesOfType = apiFetchedChunkers; isLoading = apiChunkersLoading; errorMessage = apiChunkersError; }
    else if (moduleType === 'indexer') { modulesOfType = apiFetchedIndexers; isLoading = apiIndexersLoading; errorMessage = apiIndexersError; }
    else { modulesOfType = []; isLoading = false; errorMessage = null; }
    
    const selectedModuleDetails = modulesOfType.find(m => m.id === selectedModuleId);

    return (
      <div className="space-y-3 p-4 border rounded-md bg-muted/20">
        <div className="flex justify-between items-center">
            <Label htmlFor={`${moduleType}-select`} className="text-md font-semibold capitalize">{moduleType}</Label>
            {selectedModuleDetails && <span className="text-xs text-muted-foreground">{selectedModuleDetails.name}</span>}
        </div>
        
        {isLoading && <div className="text-sm text-muted-foreground">Loading {moduleType}s...</div>}
        {errorMessage && <div className="text-sm text-red-600">Error loading {moduleType}s: {errorMessage}</div>}
        {!isLoading && !errorMessage && modulesOfType.length === 0 && <div className="text-sm text-muted-foreground">No {moduleType}s available.</div>}
        
        <Select value={selectedModuleId} onValueChange={onSelectModule} disabled={isLoading || modulesOfType.length === 0}>
          <SelectTrigger id={`${moduleType}-select`}>
            <SelectValue placeholder={isLoading ? "Loading..." : errorMessage ? `Error loading` : modulesOfType.length === 0 ? `No ${moduleType}s` : `Select ${moduleType}`} />
          </SelectTrigger>
          <SelectContent>
            {modulesOfType.map(module => (<SelectItem key={module.id} value={module.id}>{module.name}</SelectItem>))}
          </SelectContent>
        </Select>
        {selectedModuleDetails && selectedModuleDetails.description && <p className="text-xs text-muted-foreground italic pt-1">{selectedModuleDetails.description}</p>}

        {/* Parameters section - Display only, no editing */}
        {selectedModuleDetails && selectedModuleDetails.parameters.length > 0 && (
          <div className="mt-4 space-y-3 pt-3 border-t border-dashed">
            <h4 className="text-sm font-medium text-foreground pt-1">Parameters (Read-only):</h4>
            <div className="grid gap-3">
              {selectedModuleDetails.parameters.map(param => (
                <div key={param.id} className="bg-muted/30 p-3 rounded-md">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium">{param.name}</span>
                    <span className="text-xs text-muted-foreground px-2 py-1 bg-background rounded">
                      {param.type}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-foreground font-mono bg-background px-2 py-1 rounded border">
                      {param.type === 'boolean' 
                        ? (currentParams[param.id] as boolean ? 'true' : 'false')
                        : String(currentParams[param.id] ?? param.defaultValue)
                      }
                    </div>
                    {param.description && (
                      <p className="text-xs text-muted-foreground">{param.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <PageLayout>
      <div className="space-y-6 p-4 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-2xl font-bold">{configToEditId ? "Edit" : "Create New"} RAG Configuration</h1>
                <p className="text-muted-foreground">
                    Define a preprocessing and retrieval pipeline by selecting modules and setting their parameters.
                </p>
            </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuration Details</CardTitle>
            <CardDescription>
                {configToEditId ? "Editing configuration. " : "Creating a new configuration. "}
                You can also load a different configuration to edit or use as a template.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="load-config">Load or Create Configuration</Label>
                <Select 
                  value={configToEditId || CREATE_NEW_CONFIG_VALUE} 
                  onValueChange={(value) => {
                    if (value === CREATE_NEW_CONFIG_VALUE) {
                      resetFormToCreateNew();
                    } else {
                      router.push(`/configure?edit=${value}`, { scroll: false });
                    }
                  }}
                >
                    <SelectTrigger id="load-config">
                        <SelectValue placeholder="Select a configuration or create new" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={CREATE_NEW_CONFIG_VALUE}>-- Create New Configuration --</SelectItem>
                        {ragConfigs.map(config => (
                            <SelectItem key={config.id} value={config.id}>{config.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="config-name">Configuration Name</Label>
              <Input id="config-name" value={currentConfigName} onChange={(e) => setCurrentConfigName(e.target.value)} placeholder="e.g., My Custom Preprocessing & Retrieval" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="config-description">Description</Label>
              <Input id="config-description" value={currentConfigDescription} onChange={(e) => setCurrentConfigDescription(e.target.value)} placeholder="A brief description of this configuration (optional)" />
            </div>

            {/* Source Selection - As requested */}
            <div className="space-y-2">
                <Label htmlFor="source-select-context">Select Source (for context/reference)</Label>
                <Select value={selectedSourceForContext} onValueChange={setSelectedSourceForContext}>
                    <SelectTrigger id="source-select-context">
                        <SelectValue placeholder="Select a source" />
                    </SelectTrigger>
                    <SelectContent>
                        {sources.map(source => (
                            <SelectItem key={source.id} value={source.id}>
                                {source.type === 'benchmark' ? 'Benchmark: ' : 'Library: '}{source.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {selectedSourceForContext && sources.find(s => s.id === selectedSourceForContext)?.description && (
                    <p className="text-xs text-muted-foreground italic pt-1">{sources.find(s => s.id === selectedSourceForContext)?.description}</p>
                )}
            </div>
            
            {renderModuleSelector('parser', selectedParser, handleNewConfigParserSelect, parserParams, handleNewConfigParamChange)}
            {renderModuleSelector('chunker', selectedChunker, handleNewConfigChunkerSelect, chunkerParams, handleNewConfigParamChange)}
            {renderModuleSelector('indexer', selectedIndexer, handleNewConfigIndexerSelect, indexerParams, handleNewConfigParamChange)}

            <Button className="w-full mt-6" onClick={handleSaveConfig} 
              disabled={!currentConfigName.trim() || !selectedParser || !selectedChunker || !selectedIndexer || apiParsersLoading || apiChunkersLoading || apiIndexersLoading}>
              {(apiParsersLoading || apiChunkersLoading || apiIndexersLoading) ? "Loading Modules..." : (configToEditId ? "Update Configuration" : "Save Configuration")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
} 