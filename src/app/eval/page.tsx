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

interface Benchmark {
  id: string;
  name: string;
  description: string;
  metrics: string[];
}

interface EvaluationResultsMetric {
  metric: string;
  value: number;
  unit?: string;
}

interface EvaluationResults {
  systemId: string;
  benchmarkId: string;
  timestamp: Date;
  metrics: EvaluationResultsMetric[];
  status: "running" | "completed" | "failed";
}

function EvaluationInterface({
  ragSystems,
  benchmarks
}: {
  ragSystems: RAGSystem[];
  benchmarks: Benchmark[];
}) {
  const [selectedRAG, setSelectedRAG] = useState<string>("");
  const [selectedBenchmark, setSelectedBenchmark] = useState<string>("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [results, setResults] = useState<EvaluationResults[]>([]);
  const [activeTab, setActiveTab] = useState("run");

  const startEvaluation = async () => {
    if (!selectedRAG || !selectedBenchmark) return;

    setIsEvaluating(true);

    try {
      // Create a new result entry with running status
      const newResult: EvaluationResults = {
        systemId: selectedRAG,
        benchmarkId: selectedBenchmark,
        timestamp: new Date(),
        metrics: [],
        status: "running",
      };

      setResults((prev) => [...prev, newResult]);

      // Simulated evaluation process
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Update with completed results
      setResults((prev) =>
        prev.map((result) => {
          if (
            result.systemId === selectedRAG &&
            result.benchmarkId === selectedBenchmark &&
            result.status === "running"
          ) {
            const selectedBenchmarkObj = benchmarks.find(
              (b) => b.id === selectedBenchmark
            );

            // Generate random metrics for the simulation
            const metrics = selectedBenchmarkObj
              ? selectedBenchmarkObj.metrics.map((metric) => ({
                  metric,
                  value: Math.random() * 100,
                  unit: metric.includes("time") ? "ms" : metric.includes("rate") ? "%" : "",
                }))
              : [];

            return {
              ...result,
              status: "completed",
              metrics,
            };
          }
          return result;
        })
      );

      // Switch to results tab after completion
      setActiveTab("results");
    } catch (error) {
      console.error("Evaluation failed:", error);
      setResults((prev) =>
        prev.map((result) => {
          if (
            result.systemId === selectedRAG &&
            result.benchmarkId === selectedBenchmark &&
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

  const getBenchmarkName = (id: string) => {
    return benchmarks.find((benchmark) => benchmark.id === id)?.name || id;
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
                    <Label htmlFor="benchmark">Benchmark</Label>
                    <Select
                      value={selectedBenchmark}
                      onValueChange={setSelectedBenchmark}
                    >
                      <SelectTrigger id="benchmark">
                        <SelectValue placeholder="Select benchmark" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {benchmarks.map((benchmark) => (
                          <SelectItem key={benchmark.id} value={benchmark.id}>
                            {benchmark.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedBenchmark && (
                  <div className="rounded-md bg-muted p-4">
                    <h3 className="font-medium mb-1">
                      {benchmarks.find((b) => b.id === selectedBenchmark)?.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {benchmarks.find((b) => b.id === selectedBenchmark)?.description}
                    </p>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={startEvaluation}
                  disabled={!selectedRAG || !selectedBenchmark || isEvaluating}
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
                    <TableHead>Benchmark</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Results</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>{getRAGSystemName(result.systemId)}</TableCell>
                      <TableCell>{getBenchmarkName(result.benchmarkId)}</TableCell>
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
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);

  useEffect(() => {
    // Simulate loading RAG systems from an API
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

    // Simulate loading benchmarks from an API
    const demoBenchmarks = [
      {
        id: "bench1",
        name: "Information Retrieval",
        description: "Evaluates the system's ability to retrieve relevant documents",
        metrics: ["precision", "recall", "f1_score", "retrieval_time"],
      },
      {
        id: "bench2",
        name: "Answer Generation",
        description: "Evaluates the quality and accuracy of generated answers",
        metrics: ["accuracy", "completeness", "coherence", "response_time"],
      },
      {
        id: "bench3",
        name: "Hallucination Detection",
        description: "Measures the system's tendency to generate false information",
        metrics: ["hallucination_rate", "groundedness", "source_consistency"],
      },
    ];

    setRagSystems(demoRagSystems);
    setBenchmarks(demoBenchmarks);
  }, []);

  return (
    <PageLayout>
      <div className="space-y-6 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">RAG Evaluation</h1>
            <p className="text-muted-foreground">
              Evaluate different RAG implementations on standardized benchmarks.
            </p>
          </div>
          <div className="space-x-2">
            <Button variant="outline">Import Benchmark</Button>
            <Button>Create New Benchmark</Button>
          </div>
        </div>

        <EvaluationInterface ragSystems={ragSystems} benchmarks={benchmarks} />
      </div>
    </PageLayout>
  );
} 