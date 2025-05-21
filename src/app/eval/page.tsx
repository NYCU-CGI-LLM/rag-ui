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

interface RAGSystemConfig {
  availableMetrics: string[];
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
  supported_metrics?: string[]; 
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
  timestamp: Date;
  metrics: EvaluationResultsMetric[];
  status: "running" | "completed" | "failed";
}

const DEFAULT_LIBRARY_METRICS = ["accuracy", "relevance", "response_time"];

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
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [results, setResults] = useState<EvaluationResults[]>([]);
  const [activeTab, setActiveTab] = useState("run");

  const currentRAGSystem = ragSystems.find(rs => rs.id === selectedRAG);
  const currentSourceDetails = sources.find(s => s.id === selectedSource);

  useEffect(() => {
    setSelectedMetrics([]);
  }, [selectedRAG]);

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
        timestamp: new Date(),
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
                            {currentSourceDetails.type === 'benchmark' && currentSourceDetails.supported_metrics && (
                                <p className="text-xs text-muted-foreground mt-1">Benchmark typically supports: {currentSourceDetails.supported_metrics.join(', ')}</p>
                            )}
                        </div>
                        <div className="pt-2 border-t">
                             <p className="mt-2"><span className="font-semibold">RAG System:</span> {currentRAGSystem.name}</p>
                            <p className="text-xs text-muted-foreground">{currentRAGSystem.description}</p>
                        </div>
                    </CardContent>
                  </Card>
                )}

                {currentRAGSystem && (
                  <div className="space-y-3 pt-3">
                    <Label className="text-base font-medium">Select Metrics to Evaluate</Label>
                    <p className="text-xs text-muted-foreground">
                      Choose from the metrics available for the selected RAG system ({currentRAGSystem.name}).
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {currentRAGSystem.config.availableMetrics.map(metric => (
                        <div key={metric} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-accent/50">
                          <Checkbox 
                            id={`metric-${metric}`}
                            checked={selectedMetrics.includes(metric)}
                            onCheckedChange={() => handleMetricSelection(metric)}
                          />
                          <Label htmlFor={`metric-${metric}`} className="text-sm font-normal cursor-pointer">
                            {metric}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {currentRAGSystem.config.availableMetrics.length === 0 && (
                        <p className="text-sm text-muted-foreground">No metrics configured for this RAG system.</p>
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
                    <TableHead>Timestamp</TableHead>
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
                        {result.timestamp.toLocaleString()}
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
          availableMetrics: ["Exact Match (EM)", "Retrieval Precision", "Response Time", "Answer F1 Score"],
          parser: "default_parser",
          generator: "basic_llm"
        }
      },
      {
        id: "rag2",
        name: "Semantic RAG",
        description: "RAG with dense vector embeddings and a more advanced LLM.",
        config: {
          availableMetrics: ["F1 Score", "Answer Recall", "Semantic Similarity", "Hallucination Rate", "Retrieval MRR"],
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
          availableMetrics: ["Overall Quality Score", "F1 Score", "Retrieval Recall", "Groundedness", "Toxicity Rate"],
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
        supported_metrics: ["Exact Match (EM)", "F1 Score", "Answer Recall", "Retrieval Precision"],
        type: 'benchmark'
      },
      {
        id: "longbench_narrativeqa",
        name: "LongBench/NarrativeQA",
        description: "Question answering based on stories or books, requiring understanding of narratives.",
        supported_metrics: ["ROUGE-L", "BLEU-4", "METEOR", "Answer Faithfulness"],
        type: 'benchmark'
      },
      {
        id: "techqa",
        name: "TechQA",
        description: "Technical question answering, often involving specialized vocabulary and concepts.",
        supported_metrics: ["Accuracy", "F1 Score (Technical Terms)", "Response Time", "Coverage"],
        type: 'benchmark'
      },
      {
        id: "emanual",
        name: "E-manual",
        description: "Question answering and information retrieval from electronic manuals.",
        supported_metrics: ["Task Success Rate", "Information Retrieval Accuracy", "Clarity Score"],
        type: 'benchmark'
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