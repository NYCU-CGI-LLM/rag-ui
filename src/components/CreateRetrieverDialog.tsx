'use client'

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// API Configuration
const API_URL = "/api";

// Type Definitions
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

interface CreateConfigRequest {
  parser_id: string;
  chunker_id: string;
  indexer_id: string;
  name: string;
  description?: string;
  params?: object;
}

interface CreateConfigResponse {
  id: string;
  name: string;
  description?: string;
  parser_id: string;
  chunker_id: string;
  indexer_id: string;
  params: object;
  created_at: string;
  updated_at: string;
}

interface CreateRetrieverRequest {
  name: string;
  description?: string;
  library_id: string;
  config_id: string;
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

interface Source {
  id: string;
  name: string;
  description: string;
  type: 'benchmark' | 'library';
}

interface CreateRetrieverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetrieverCreated?: () => void; // Callback when retriever is successfully created
}

// Helper functions
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

export function CreateRetrieverDialog({ open, onOpenChange, onRetrieverCreated }: CreateRetrieverDialogProps) {
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

  const [sources, setSources] = useState<Source[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data when dialog opens
  useEffect(() => {
    if (open) {
      fetchLibraries();
      fetchParsers();
      fetchChunkers();
      fetchIndexers();
    }
  }, [open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetCreateForm();
    }
  }, [open]);

  const resetCreateForm = () => {
    setCurrentRetrieverName("");
    setCurrentRetrieverDescription("");
    setSelectedParser("");
    setSelectedChunker("");
    setSelectedIndexer("");
    setSelectedSourceForContext("");
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

      if (!API_URL) throw new Error('API_URL not configured');

      // Step 1: Create config first
      const configRequestBody: CreateConfigRequest = {
        parser_id: selectedParser,
        chunker_id: selectedChunker,
        indexer_id: selectedIndexer,
        name: `${currentRetrieverName.trim()}_config`,
        description: currentRetrieverDescription.trim() || `Configuration for ${currentRetrieverName.trim()}`,
        params: {}
      };

      const configResponse = await fetch(`${API_URL}/config/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configRequestBody)
      });

      if (!configResponse.ok) {
        const errorData = await configResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create config! status: ${configResponse.status}`);
      }

      const configResult: CreateConfigResponse = await configResponse.json();

      // Step 2: Create retriever using the config_id
      const retrieverRequestBody: CreateRetrieverRequest = {
        name: currentRetrieverName.trim(),
        description: currentRetrieverDescription.trim() || undefined,
        library_id: selectedSourceForContext,
        config_id: configResult.id,
        top_k: 10,
        params: {},
        collection_name: `${currentRetrieverName.trim().replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`
      };

      const retrieverResponse = await fetch(`${API_URL}/retriever/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(retrieverRequestBody)
      });

      if (!retrieverResponse.ok) {
        const errorData = await retrieverResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create retriever! status: ${retrieverResponse.status}`);
      }

      const result: CreateRetrieverResponse = await retrieverResponse.json();
      
      alert(`Retriever created successfully!\n\nRetriever ID: ${result.retriever_id}\nStatus: ${result.status}\nTotal Chunks: ${result.total_chunks || 'N/A'}`);
      
      // Close dialog and call callback
      onOpenChange(false);
      onRetrieverCreated?.();

    } catch (error) {
      console.error('Failed to create retriever:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create retriever';
      alert(`Error creating retriever: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <Label htmlFor="retriever-description">Description</Label>
              <Input 
                id="retriever-description" 
                value={currentRetrieverDescription} 
                onChange={(e) => setCurrentRetrieverDescription(e.target.value)} 
                placeholder="A brief description of this retriever (Optional)" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-select">Select Library</Label>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
  );
} 