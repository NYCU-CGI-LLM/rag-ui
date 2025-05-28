'use client'
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// Import RAG configuration types and data from eval page
type ModuleType = 'parser' | 'chunker' | 'retriever' | 'generator';

interface SelectedModuleConfig {
  moduleId: string;
  parameterValues: { [paramId: string]: string | number | boolean };
}

interface RAGConfig {
  id: string;
  name: string;
  description: string;
  parser: SelectedModuleConfig;
  chunker: SelectedModuleConfig;
  retriever: SelectedModuleConfig;
  generator: SelectedModuleConfig;
  availableMetrics: any[]; // Simplified for chat usage
}

// Parameter definitions for different generator types
interface ParameterDefinition {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  defaultValue: string | number | boolean;
  options?: string[];
  description?: string;
  min?: number;
  max?: number;
  step?: number;
}

// OpenAI model token limits (same as eval page)
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

// Generator parameter definitions
const GENERATOR_PARAM_DEFINITIONS: { [generatorId: string]: ParameterDefinition[] } = {
  openai_llm: [
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
  ],
  vllm: [
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
  ],
  vllm_api: [
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
  ],
  llama_index_llm: [
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
};

// Library data with descriptions
const libraries = [
  { 
    id: "none", 
    name: "No library", 
    description: "" 
  },
  { 
    id: "tech-docs", 
    name: "Technical Docs", 
    description: "Documentation for all technical systems and frameworks used in the organization." 
  },
  { 
    id: "product-manuals", 
    name: "Product Manuals", 
    description: "User guides and specifications for all products in our catalog." 
  },
  { 
    id: "research-papers", 
    name: "Research Papers", 
    description: "Academic papers and research conducted by our R&D department." 
  },
  { 
    id: "company-wiki", 
    name: "Company Wiki", 
    description: "Internal knowledge base covering company policies, procedures and best practices." 
  },
];

// Available RAG Configurations (same as in eval page)
const availableRAGConfigs: RAGConfig[] = [
  {
    id: "rag1_basic_autorag",
    name: "Basic AutoRAG",
    description: "A simple AutoRAG configuration with basic modules.",
    parser: { moduleId: "langchain_parse", parameterValues: { parse_method: "pdfminer" } },
    chunker: { moduleId: "llama_index_chunk", parameterValues: { chunk_method: "Token", chunk_size: 1024, chunk_overlap: 24, add_file_name: "en" } },
    retriever: { moduleId: "bm25", parameterValues: { top_k: 5, bm25_tokenizer: "porter_stemmer" } },
    generator: { moduleId: "openai_llm", parameterValues: { llm: "gpt-4o-mini", max_tokens: 4096, temperature: 0.7, top_p: 1.0 } },
    availableMetrics: [],
  },
  {
    id: "rag2_vector_autorag",
    name: "Vector AutoRAG",
    description: "AutoRAG configuration using vector database retrieval.",
    parser: { moduleId: "langchain_parse", parameterValues: { parse_method: "pdfminer" } },
    chunker: { moduleId: "llama_index_chunk", parameterValues: { chunk_method: "Token", chunk_size: 512, chunk_overlap: 50, add_file_name: "en" } },
    retriever: { moduleId: "vectordb", parameterValues: { top_k: 3, vectordb: "chroma", embedding_model: "OpenAI Embedding API", embedding_batch: 128, similarity_metric: "cosine" } },
    generator: { moduleId: "openai_llm", parameterValues: { llm: "gpt-4o", max_tokens: 512, temperature: 0.5, top_p: 0.9 } },
    availableMetrics: [],
  },
  {
    id: "rag3_hybrid_autorag",
    name: "Hybrid AutoRAG",
    description: "AutoRAG configuration using hybrid retrieval with RRF.",
    parser: { moduleId: "langchain_parse", parameterValues: { parse_method: "pdfminer" } },
    chunker: { moduleId: "llama_index_chunk", parameterValues: { chunk_method: "Token", chunk_size: 2048, chunk_overlap: 100, add_file_name: "en" } },
    retriever: { moduleId: "hybrid_rrf", parameterValues: { top_k: 10, weight: 0.6 } },
    generator: { moduleId: "vllm", parameterValues: { llm: "meta-llama/Llama-2-7b-chat-hf", max_tokens: 1024, temperature: 0.8 } },
    availableMetrics: [],
  },
];

// Mock saved chat sessions using RAG configs
const savedChatSessions = [
  { 
    id: "session-1", 
    name: "General Chat",
    timestamp: "Today, 10:30 AM",
    library: "tech-docs",
    ragConfigId: "rag1_basic_autorag",
  },
  { 
    id: "session-2", 
    name: "Project Research",
    timestamp: "Yesterday, 3:45 PM",
    library: "research-papers",
    ragConfigId: "rag2_vector_autorag",
  },
  { 
    id: "session-3", 
    name: "Meeting Notes",
    timestamp: "Aug 15, 2:15 PM",
    library: "company-wiki",
    ragConfigId: "rag3_hybrid_autorag",
  },
  { 
    id: "session-4", 
    name: "Technical Docs",
    timestamp: "Aug 14, 11:20 AM",
    library: "product-manuals",
    ragConfigId: "rag1_basic_autorag",
  },
];

// Chat message component for better structure
interface Message {
  id: string;
  isUser: boolean;
  content: string;
  timestamp?: string;
  source?: string;
}

function ChatMessage({ isUser, content, timestamp = "Just now", source }: Omit<Message, 'id'>) {
  // Base classes without the tail styling
  const baseClasses = "p-4 shadow-sm transition-all duration-200 max-w-[85%] md:max-w-[75%] relative";
  
  // Different styling based on message sender with specific corner rounding
  const messageClasses = isUser 
    ? `${baseClasses} ml-auto chat-bubble-user bg-primary text-primary-foreground rounded-tl-lg rounded-bl-lg rounded-br-lg`
    : `${baseClasses} mr-auto chat-bubble-ai bg-muted rounded-tr-lg rounded-bl-lg rounded-br-lg`;

  return (
    <div className={`mb-8 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={messageClasses}>
        <div className="font-semibold mb-1">{isUser ? "You" : "AI Assistant"}</div>
        <p className="whitespace-pre-wrap break-words">{content}</p>
        {source && (
          <div className="mt-3 pt-2 border-t border-border/30 text-xs text-muted-foreground flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            <span>Source: {source}</span>
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground mt-1 mx-2">{timestamp}</div>
    </div>
  );
}

export default function ChatPage() {
  const [selectedLibrary, setSelectedLibrary] = useState(libraries[0].id);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial-ai-message",
      isUser: false,
      content: "Hello! How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Track the currently selected chat session and RAG config
  const [selectedSessionId, setSelectedSessionId] = useState<string>("session-1");
  const [selectedRAGConfigId, setSelectedRAGConfigId] = useState<string>(availableRAGConfigs[0]?.id || "");

  // Generator parameter overrides for current session
  const [generatorParams, setGeneratorParams] = useState<{ [key: string]: string | number | boolean }>({});

  // Apply animation state
  const [isApplying, setIsApplying] = useState(false);

  // New chat session dialog states
  const [isNewChatPopoverOpen, setIsNewChatPopoverOpen] = useState(false);
  const [isNewSessionDialogOpen, setIsNewSessionDialogOpen] = useState(false);
  const [isExistingSessionDialogOpen, setIsExistingSessionDialogOpen] = useState(false);
  const [tempLibrary, setTempLibrary] = useState(libraries[0].id);
  const [tempRAGConfigId, setTempRAGConfigId] = useState(availableRAGConfigs[0]?.id || "");

  // Initialize generator params when RAG config changes
  useEffect(() => {
    const currentRAGConfig = availableRAGConfigs.find(c => c.id === selectedRAGConfigId);
    if (currentRAGConfig) {
      setGeneratorParams({...currentRAGConfig.generator.parameterValues});
    }
  }, [selectedRAGConfigId]);

  // Load initial session data on first render
  useEffect(() => {
    if (selectedSessionId) {
      const session = savedChatSessions.find(s => s.id === selectedSessionId);
      if (session) {
        // Set configuration based on the selected session
        setSelectedLibrary(session.library);
        setSelectedRAGConfigId(session.ragConfigId);
        
        // Set initial message
        setMessages([{
          id: "initial-ai-message-existing",
          isUser: false,
          content: `Hello! I've loaded the "${session.name}" session. How can I help you today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]);
      }
    }
  }, []);
  
  // Get the full description of the selected library
  const selectedLibraryData = libraries.find(lib => lib.id === selectedLibrary);

  // Get current RAG config details
  const currentRAGConfig = availableRAGConfigs.find(c => c.id === selectedRAGConfigId);

  // Handle generator parameter changes
  const handleGeneratorParamChange = (paramId: string, value: string | number | boolean) => {
    setGeneratorParams(prev => ({ ...prev, [paramId]: value }));
  };

  // Handle apply settings
  const handleApplySettings = () => {
    setIsApplying(true);
    // Simulate applying settings with a delay
    setTimeout(() => {
      setIsApplying(false);
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === "" || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      isUser: true,
      content: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const apiPayload = {
        query: inputValue,
        result_column: "generated_texts", // This might need to be dynamic or removed if backend handles it
        config: {
          library_id: selectedLibrary,
          ragConfigId: selectedRAGConfigId,
          generatorParams: generatorParams, // Include current generator parameters
        }
      };
      console.log("Sending to API:", apiPayload); // For debugging

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch response from AI');
      }

      const data = await response.json();

      const aiContent = data.result;

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        isUser: false,
        content: aiContent || "Sorry, I couldn't process that.", // Fallback if aiContent is null/undefined
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        // source: data.source // If your API returns a source, uncomment and use it
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        isUser: false,
        content: error instanceof Error ? error.message : "An unknown error occurred.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new chat session with the selected configuration
  const createNewChatSession = () => {
    // Update main configuration with temporary selections
    setSelectedLibrary(tempLibrary);
    setSelectedRAGConfigId(tempRAGConfigId);
    
    // Reset chat messages to initial greeting
    setMessages([{
      id: "initial-ai-message-new",
      isUser: false,
      content: "Hello! How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
    
    // Clear selected session (no session is selected when creating a new custom one)
    setSelectedSessionId("");
    
    // Close dialogs
    setIsNewSessionDialogOpen(false);
    setIsNewChatPopoverOpen(false);
  };

  // Create a chat session from an existing one
  const loadExistingSession = (sessionId: string) => {
    const session = savedChatSessions.find(s => s.id === sessionId);
    
    if (session) {
      // Set configuration based on the selected session
      setSelectedLibrary(session.library);
      setSelectedRAGConfigId(session.ragConfigId);
      
      // Reset chat messages to initial greeting
      setMessages([{
        id: "initial-ai-message-existing",
        isUser: false,
        content: `Hello! I've loaded the "${session.name}" session. How can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      
      // Update the selected session id
      setSelectedSessionId(sessionId);
      
      // Close dialog
      setIsExistingSessionDialogOpen(false);
      setIsNewChatPopoverOpen(false);
    }
  };

  return (
    <>
      <PageLayout>
        <div className="flex h-[calc(100vh-5rem)]">
          {/* Left Sidebar - Chat Sessions */}
          <aside className="hidden md:flex w-64 flex-col border-r overflow-y-auto">
            {/* Header with New Chat button */}
            <div className="flex justify-between items-center p-4 border-b font-heading">
              <h2 className="font-semibold text-lg">Chat Sessions</h2>
              <Popover open={isNewChatPopoverOpen} onOpenChange={setIsNewChatPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="New Chat">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                    <span className="sr-only">New Chat</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0">
                  <div className="py-2">
                    <button 
                      className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {
                        setIsNewSessionDialogOpen(true);
                        setTempLibrary(selectedLibrary);
                        setTempRAGConfigId(selectedRAGConfigId);
                      }}
                    >
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <path d="M12 5v14M5 12h14"/>
                        </svg>
                        Create new custom session
                      </div>
                    </button>
                    <button 
                      className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {
                        setIsExistingSessionDialogOpen(true);
                        setIsNewChatPopoverOpen(false);
                      }}
                    >
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1"/>
                          <path d="M8 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2"/>
                          <path d="M8 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/>
                          <path d="M15 5h1a2 2 0 0 1 2 2v1"/>
                          <path d="M22 12h-4"/>
                          <path d="M18 10l-2 2 2 2"/>
                        </svg>
                        From existing session
                      </div>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Chat list */}
            <div className="flex flex-col">
              {savedChatSessions.map((session) => (
                <div 
                  key={session.id} 
                  className={`p-4 cursor-pointer chat-item hover:bg-accent hover:text-accent-foreground ${session.id === selectedSessionId ? 'bg-accent text-accent-foreground' : ''}`}
                  onClick={() => loadExistingSession(session.id)}
                >
                  <div className="font-medium">{session.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{session.timestamp}</div>
                </div>
              ))}
            </div>
          </aside>
          
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col relative">
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-2 max-w-4xl mx-auto">
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    isUser={msg.isUser}
                    content={msg.content}
                    timestamp={msg.timestamp}
                    source={msg.source}
                  />
                ))}
                 {isLoading && (
                  <ChatMessage
                    isUser={false}
                    content="AI Assistant is typing..."
                    timestamp={new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  />
                )}
              </div>
            </div>
            
            {/* Input area */}
            <div className="border-t p-4">
              <div className="flex max-w-4xl mx-auto">
                <Input 
                  type="text" 
                  placeholder="Type your message here..." 
                  className="flex-1 rounded-r-none focus-visible:ring-1 text-black"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isLoading}
                />
                <Button 
                  className="rounded-l-none text-black"
                  onClick={handleSendMessage} 
                  disabled={isLoading || inputValue.trim() === ""}
                >
                  {isLoading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : "Send"}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Right Sidebar - Config */}
          <aside className="hidden lg:flex w-72 flex-col border-l p-4 overflow-y-auto space-y-6">
            {/* Current Session Info */}
            <div>
              <h3 className="font-semibold mb-2 p-2 border-b pb-3 text-lg font-heading">Current Session</h3>
              <div className="p-3 bg-muted rounded-md">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Library</div>
                    <div className="font-medium">{selectedLibraryData?.name || "None"}</div>
                    {selectedLibraryData?.description && (
                      <div className="text-xs text-muted-foreground mt-1">{selectedLibraryData.description}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">RAG Configuration</div>
                    <div className="font-medium">{availableRAGConfigs.find(c => c.id === selectedRAGConfigId)?.name || "None"}</div>
                    {availableRAGConfigs.find(c => c.id === selectedRAGConfigId)?.description && (
                      <div className="text-xs text-muted-foreground mt-1">{availableRAGConfigs.find(c => c.id === selectedRAGConfigId)?.description}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Generator Parameters */}
            {currentRAGConfig && (
              <div>
                <h3 className="font-semibold mb-2 p-2 border-b pb-3 text-lg font-heading">Generator Settings</h3>
                <div className="space-y-4">
                  {GENERATOR_PARAM_DEFINITIONS[currentRAGConfig.generator.moduleId]?.map(param => (
                    <div key={param.id} className="space-y-1.5">
                      <Label htmlFor={`generator-${param.id}`} className="text-sm">{param.name}</Label>
                      {param.description && <p className="text-xs text-muted-foreground -mt-1">{param.description}</p>}
                      
                      {param.type === 'string' && (
                        <Input
                          id={`generator-${param.id}`}
                          type="text"
                          value={generatorParams[param.id] as string || ''}
                          onChange={(e) => handleGeneratorParamChange(param.id, e.target.value)}
                          placeholder={param.defaultValue as string}
                        />
                      )}
                      
                      {param.type === 'number' && (
                        <>
                          {(param.id === 'temperature' || param.id === 'top_p') ? (
                            // Use simple range slider for temperature and top_p
                            <>
                              <input
                                id={`generator-${param.id}`}
                                type="range"
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                value={generatorParams[param.id] as number ?? param.defaultValue}
                                onChange={(e) => handleGeneratorParamChange(param.id, parseFloat(e.target.value))}
                                className="w-full mt-1"
                              />
                              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>{param.min}</span>
                                <span>{generatorParams[param.id] ?? param.defaultValue}</span>
                                <span>{param.max}</span>
                              </div>
                            </>
                          ) : (
                            // Use regular number input for other numeric parameters
                            <Input
                              id={`generator-${param.id}`}
                              type="number"
                              value={generatorParams[param.id] as number ?? ''}
                              onChange={(e) => {
                                const rawValue = e.target.value;
                                if (rawValue === '') {
                                  handleGeneratorParamChange(param.id, '');
                                } else {
                                  const val = parseFloat(rawValue);
                                  if (!isNaN(val)) {
                                    handleGeneratorParamChange(param.id, val);
                                  }
                                }
                              }}
                              onBlur={(e) => { 
                                const rawValue = e.target.value;
                                if (rawValue === '' || isNaN(parseFloat(rawValue))) {
                                  handleGeneratorParamChange(param.id, param.defaultValue as number);
                                }
                              }}
                              min={param.min}
                              max={
                                // Dynamic max for OpenAI LLM max_tokens based on selected model
                                currentRAGConfig.generator.moduleId === 'openai_llm' && param.id === 'max_tokens' 
                                  ? MAX_TOKEN_DICT[generatorParams['llm'] as string] || param.max
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
                          <input
                            id={`generator-${param.id}`}
                            type="checkbox"
                            checked={generatorParams[param.id] as boolean ?? false}
                            onChange={(e) => handleGeneratorParamChange(param.id, e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor={`generator-${param.id}`} className="text-sm font-normal cursor-pointer">
                            {generatorParams[param.id] ? "Enabled" : "Disabled"} 
                          </Label>
                        </div>
                      )}
                      
                      {param.type === 'select' && param.options && (
                        <Select
                          value={generatorParams[param.id] as string || ''}
                          onValueChange={(value) => handleGeneratorParamChange(param.id, value)}
                        >
                          <SelectTrigger id={`generator-${param.id}`}>
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
                
                {/* Action buttons at the bottom */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const currentRAGConfig = availableRAGConfigs.find(c => c.id === selectedRAGConfigId);
                      if (currentRAGConfig) {
                        setGeneratorParams({...currentRAGConfig.generator.parameterValues});
                      }
                    }}
                    disabled={isApplying}
                    className="text-xs"
                  >
                    Reset
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleApplySettings}
                    disabled={isApplying}
                    className="text-xs"
                  >
                    {isApplying ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Applying...
                      </>
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </aside>
          
          {/* Existing Session Dialog */}
          <Dialog open={isExistingSessionDialogOpen} onOpenChange={setIsExistingSessionDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Load Existing Chat Session</DialogTitle>
                <DialogDescription>
                  Select a previously configured chat session to continue.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="max-h-[60vh] overflow-y-auto">
                  {savedChatSessions.map((session) => (
                    <div 
                      key={session.id} 
                      className="p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md mb-2"
                      onClick={() => loadExistingSession(session.id)}
                    >
                      <div className="flex justify-between">
                        <div className="font-medium">{session.name}</div>
                        <div className="text-xs text-muted-foreground">{session.timestamp}</div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          Library: {libraries.find(l => l.id === session.library)?.name || session.library}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          RAG Configuration: {availableRAGConfigs.find(c => c.id === session.ragConfigId)?.name || session.ragConfigId}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsExistingSessionDialogOpen(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* New Chat Session Dialog */}
          <Dialog open={isNewSessionDialogOpen} onOpenChange={setIsNewSessionDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Chat Session</DialogTitle>
                <DialogDescription>
                  Configure the settings for your new chat session.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="new-library" className="text-right">
                    Library
                  </Label>
                  <div className="col-span-3">
                    <Select value={tempLibrary} onValueChange={setTempLibrary}>
                      <SelectTrigger id="new-library">
                        <SelectValue placeholder="Select a library" />
                      </SelectTrigger>
                      <SelectContent>
                        {libraries.map(lib => (
                          <SelectItem key={lib.id} value={lib.id}>
                            {lib.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="new-rag-config" className="text-right">
                    Configuration
                  </Label>
                  <div className="col-span-3">
                    <Select value={tempRAGConfigId} onValueChange={setTempRAGConfigId}>
                      <SelectTrigger id="new-rag-config">
                        <SelectValue placeholder="Select a RAG configuration" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRAGConfigs.map(config => (
                          <SelectItem key={config.id} value={config.id}>
                            {config.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsNewSessionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createNewChatSession}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Create Chat
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageLayout>
    </>
  );
} 