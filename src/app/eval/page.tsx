'use client'
import { useState, useEffect } from "react";
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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

interface RAGSystem {
  id: string;
  name: string;
  description: string;
}

// Updated interface: Source can be a benchmark or a library
interface Source {
  id: string;         // Unique ID, e.g., "bench1" or "lib_tech-docs"
  name: string;       // Display name
  description: string;
  type: 'benchmark' | 'library';
  metrics?: string[];  // Metrics for benchmarks, can be optional or a default for libraries
}

// Library interface (simplified for eval context, or could be imported if shared)
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

// Default metrics for libraries if not specified
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
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [results, setResults] = useState<EvaluationResults[]>([]);
  const [activeTab, setActiveTab] = useState("run");

  const startEvaluation = async () => {
    if (!selectedRAG || !selectedSource) return;

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
            const currentSource = sources.find(
              (s) => s.id === selectedSource
            );

            const metricsToEvaluate = currentSource?.metrics || (currentSource?.type === 'library' ? DEFAULT_LIBRARY_METRICS : []);
            
            const metrics = metricsToEvaluate.map((metric) => ({
              metric,
              value: Math.random() * 100,
              unit: metric.includes("time") ? "ms" : metric.includes("rate") ? "%" : "",
            }));

            return {
              ...result,
              status: "completed",
              metrics,
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

  const getCurrentSourceDetails = () => {
    return sources.find(s => s.id === selectedSource);
  }

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
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
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
                        {sources.map((source) => ( // Iterating over sources
                          <SelectItem key={source.id} value={source.id}>
                            {source.type === 'benchmark' ? 'Benchmark: ' : 'Library: '}{source.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedSource && getCurrentSourceDetails() && (
                  <div className="rounded-md bg-muted p-4">
                    <h3 className="font-medium mb-1">
                      {getCurrentSourceDetails()?.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {getCurrentSourceDetails()?.description}
                    </p>
                    {getCurrentSourceDetails()?.type === 'benchmark' && getCurrentSourceDetails()?.metrics && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Metrics: {getCurrentSourceDetails()?.metrics?.join(', ')}
                      </p>
                    )}
                     {getCurrentSourceDetails()?.type === 'library' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Default metrics will be applied: {DEFAULT_LIBRARY_METRICS.join(', ')}
                      </p>
                    )}
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={startEvaluation}
                  disabled={!selectedRAG || !selectedSource || isEvaluating}
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
                    <TableHead>Results</TableHead>
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
    const demoRagSystems = [
      {
        id: "rag1",
        name: "Basic RAG",
        description: "A simple RAG implementation using BM25 for retrieval",
      },
      {
        id: "rag2",
        name: "Semantic RAG",
        description: "RAG with dense vector embeddings for semantic search",
      },
      {
        id: "rag3",
        name: "Hybrid RAG",
        description: "Combines keyword-based and semantic search for improved retrieval",
      },
    ];

    const demoSystemBenchmarks: Source[] = [
      {
        id: "bench1",
        name: "Information Retrieval",
        description: "Evaluates the system's ability to retrieve relevant documents",
        metrics: ["precision", "recall", "f1_score", "retrieval_time"],
        type: 'benchmark'
      },
      {
        id: "bench2",
        name: "Answer Generation",
        description: "Evaluates the quality and accuracy of generated answers",
        metrics: ["accuracy", "completeness", "coherence", "response_time"],
        type: 'benchmark'
      },
      {
        id: "bench3",
        name: "Hallucination Detection",
        description: "Measures the system's tendency to generate false information",
        metrics: ["hallucination_rate", "groundedness", "source_consistency"],
        type: 'benchmark'
      },
    ];

    // Simulate loading user libraries (similar to library page data)
    const demoUserLibraries: LibraryStub[] = [
      {
        id: "tech_docs", // Using a simpler ID for the stub
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
      id: `lib_${lib.id}`, // Prefix to ensure unique ID from benchmarks
      type: 'library',
    }));

    setRagSystems(demoRagSystems);
    setSources([...demoSystemBenchmarks, ...librarySources]); // Combine benchmarks and libraries
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
          <div className="space-x-2">
            <Button variant="outline">Import Source</Button>
            <Button>Create New Source</Button>
          </div>
        </div>

        <EvaluationInterface ragSystems={ragSystems} sources={sources} />
      </div>
    </PageLayout>
  );
} 