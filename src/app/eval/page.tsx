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

interface Metric {
  id: string;
  name: string;
  category: 'Retrieval' | 'Retrieval Token' | 'Generation';
}

interface RAGSystemConfig {
  availableMetrics: Metric[];
  parser?: string;
  chunker?: string;
  indexer?: string;
  generator?: string;
  retriever?: string;
}

interface RAGSystem {
  id: string;
  name: string;
  description: string;
  config: RAGSystemConfig;
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

function EvaluationInterface({
  ragSystems,
  sources
}: {
  ragSystems: RAGSystem[];
  sources: Source[];
}) {
  const [selectedRAG, setSelectedRAG] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [displayableMetrics, setDisplayableMetrics] = useState<Metric[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [results, setResults] = useState<EvaluationResults[]>([]);
  const [activeTab, setActiveTab] = useState("run");

  const currentRAGSystem = ragSystems.find(rs => rs.id === selectedRAG);
  const currentSourceDetails = sources.find(s => s.id === selectedSource);

  useEffect(() => {
    if (!selectedSource) {
      setDisplayableMetrics([]);
      setSelectedMetrics([]);
      return;
    }

    const sourceDetails = sources.find(s => s.id === selectedSource);
    if (!sourceDetails || !sourceDetails.supported_metrics) {
      // If library and no specific supported_metrics, use defaults
      if (sourceDetails && sourceDetails.type === 'library') {
         let metricsToConsider = DEFAULT_LIBRARY_METRICS_OBJECTS;
         if (selectedRAG) {
            const ragSystemDetails = ragSystems.find(rs => rs.id === selectedRAG);
            if (ragSystemDetails && ragSystemDetails.config.availableMetrics) {
                const ragMetricIds = new Set(ragSystemDetails.config.availableMetrics.map(m => m.id));
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

    if (selectedRAG) {
      const ragSystemDetails = ragSystems.find(rs => rs.id === selectedRAG);
      if (ragSystemDetails && ragSystemDetails.config.availableMetrics) {
        const ragMetricIds = new Set(ragSystemDetails.config.availableMetrics.map(m => m.id));
        metricsFromSource = metricsFromSource.filter(m => ragMetricIds.has(m.id));
      } else {
        metricsFromSource = [];
      }
    }
    
    setDisplayableMetrics(metricsFromSource);
    setSelectedMetrics([]); 
  }, [selectedSource, selectedRAG, sources, ragSystems]);

  const handleMetricSelection = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(m => m !== metricId)
        : [...prev, metricId]
    );
  };

  const startEvaluation = async () => {
    if (!selectedRAG || !selectedSource || !currentRAGSystem || selectedMetrics.length === 0) return;

    setIsEvaluating(true);

    try {
      const newResult: EvaluationResults = {
        systemId: selectedRAG,
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
            result.systemId === selectedRAG &&
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
            result.systemId === selectedRAG &&
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

  const getRAGSystemName = (id: string) => {
    return ragSystems.find((system) => system.id === id)?.name || id;
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

  return (
    <div className="space-y-6 p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="run">Run Evaluation</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="run" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="source">Source</Label>
                    <Select
                      value={selectedSource}
                      onValueChange={setSelectedSource}
                    >
                      <SelectTrigger id="source">
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
                    <Label htmlFor="rag-system">RAG System</Label>
                    <Select
                      value={selectedRAG}
                      onValueChange={setSelectedRAG}
                    >
                      <SelectTrigger id="rag-system">
                        <SelectValue placeholder="Select RAG system" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {ragSystems.map((system) => (
                          <SelectItem key={system.id} value={system.id}>
                            {system.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {currentRAGSystem && currentSourceDetails && (
                  <Card className="bg-muted/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Evaluation Configuration</CardTitle>
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
                             <p className="mt-2"><span className="font-semibold">RAG System:</span> {currentRAGSystem.name}</p>
                            <p className="text-xs text-muted-foreground">{currentRAGSystem.description}</p>
                        </div>
                    </CardContent>
                  </Card>
                )}

                {currentSourceDetails && currentRAGSystem && (
                  <div className="space-y-3 pt-3">
                    <Label className="text-base font-medium">Select Metrics to Evaluate</Label>
                    <p className="text-xs text-muted-foreground">
                      {selectedSource && !selectedRAG && currentSourceDetails ? `Metrics supported by ${currentSourceDetails.name}:` :
                       selectedSource && selectedRAG && currentSourceDetails && currentRAGSystem ? `Common metrics for ${currentSourceDetails.name} and ${currentRAGSystem.name}:` :
                       !selectedSource && selectedRAG && currentRAGSystem ? `Metrics available in ${currentRAGSystem.name}:` :
                       "Select a Source and/or RAG System to see available metrics."}
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
                                  disabled={!selectedSource || !selectedRAG}
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
                                    disabled={!selectedSource || !selectedRAG}
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
                          {selectedSource && selectedRAG ? "No common metrics found for the selected Source and RAG System." : "No metrics available for the current selection."}
                        </p>
                    )}
                  </div>
                )}

                <Button
                  className="w-full pt-2"
                  onClick={startEvaluation}
                  disabled={!selectedRAG || !selectedSource || selectedMetrics.length === 0 || isEvaluating}
                >
                  {isEvaluating ? "Evaluating..." : "Start Evaluation"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="pt-4">
           {results.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No evaluation results yet.</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RAG System</TableHead>
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
                      <TableCell>{getRAGSystemName(result.systemId)}</TableCell>
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
                                <span>{metric.metric}:</span>
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
  const [ragSystems, setRagSystems] = useState<RAGSystem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);

  useEffect(() => {
    const demoRagSystems: RAGSystem[] = [
      {
        id: "rag1",
        name: "Basic RAG",
        description: "A simple RAG implementation using BM25 for retrieval and a basic LLM.",
        config: {
          availableMetrics: [
            ALL_METRICS.recall, 
            ALL_METRICS.precision, 
            ALL_METRICS.f1,
            ALL_METRICS.token_recall, 
            ALL_METRICS.token_precision, 
            ALL_METRICS.token_f1,
            ALL_METRICS.exact_match, 
            ALL_METRICS.answer_f1_score, 
            ALL_METRICS.response_time,
          ],
          parser: "default_parser",
          generator: "basic_llm"
        }
      },
      {
        id: "rag2",
        name: "Semantic RAG",
        description: "RAG with dense vector embeddings and a more advanced LLM.",
        config: {
          availableMetrics: [
            ALL_METRICS.recall, 
            ALL_METRICS.precision, 
            ALL_METRICS.f1,
            ALL_METRICS.map, 
            ALL_METRICS.mrr, 
            ALL_METRICS.ndcg,
            ALL_METRICS.token_recall, 
            ALL_METRICS.token_precision, 
            ALL_METRICS.token_f1,
            ALL_METRICS.bleu, 
            ALL_METRICS.rouge, 
            ALL_METRICS.meteor,
            ALL_METRICS.bert_score, 
            ALL_METRICS.sem_score,
            ALL_METRICS.answer_recall,
            ALL_METRICS.hallucination_rate,
          ],
          parser: "markdown_parser",
          indexer: "vector_db",
          generator: "advanced_llm"
        }
      },
      {
        id: "rag3",
        name: "Hybrid RAG",
        description: "Combines keyword-based and semantic search with a powerful LLM.",
        config: {
          availableMetrics: [
            ALL_METRICS.recall, 
            ALL_METRICS.precision, 
            ALL_METRICS.f1,
            ALL_METRICS.map, 
            ALL_METRICS.mrr, 
            ALL_METRICS.ndcg,
            ALL_METRICS.token_recall, 
            ALL_METRICS.token_precision, 
            ALL_METRICS.token_f1,
            ALL_METRICS.bleu, 
            ALL_METRICS.rouge, 
            ALL_METRICS.meteor,
            ALL_METRICS.bert_score,
            ALL_METRICS.geval_coherence,
            ALL_METRICS.geval_consistency,
            ALL_METRICS.geval_fluency,
            ALL_METRICS.geval_relevance,
            ALL_METRICS.sem_score,
            ALL_METRICS.overall_quality_score,
            ALL_METRICS.groundedness,
            ALL_METRICS.toxicity_rate,
          ],
          retriever: "hybrid_rrf",
          generator: "powerful_llm"
        }
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
            ALL_METRICS.precision, // Retrieval precision
            ALL_METRICS.recall,    // Retrieval recall
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
            ALL_METRICS.precision, // Retrieval
            ALL_METRICS.recall,    // Retrieval
        ],
        type: 'benchmark' as const
      },
      {
        id: "emanual",
        name: "E-manual",
        description: "Question answering and information retrieval from electronic manuals.",
        supported_metrics: [
            ALL_METRICS.recall, // Retrieval
            ALL_METRICS.precision, // Retrieval
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
      supported_metrics: DEFAULT_LIBRARY_METRICS_OBJECTS, // Assign default metrics for libraries
    }));

    setRagSystems(demoRagSystems);
    setSources([...demoSystemBenchmarks, ...librarySources]);
  }, []);

  return (
    <PageLayout>
      <div className="space-y-6 p-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">RAG Evaluation</h1>
            <p className="text-muted-foreground">
              Evaluate different RAG implementations on standardized sources.
            </p>
          </div>
        </div>

        <EvaluationInterface ragSystems={ragSystems} sources={sources} />
      </div>
    </PageLayout>
  );
} 