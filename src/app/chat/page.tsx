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
import { Label } from "@/components/ui/label";

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

// Config data (mock)
const parsers = [
  { id: "pypdf", name: "PyPDF" },
  { id: "markdown_parser", name: "Markdown Parser" },
];

const retrievers = [
  { id: "chroma_db", name: "ChromaDB" },
  { id: "bm25", name: "BM25" },
];

const generators = [
  {
    id: "openai_llm",
    name: "OpenAI LLM",
    models: [
      { id: "gpt-4o-mini", name: "gpt-4o mini" },
      { id: "gpt-4o", name: "gpt-4o" },
    ],
    parameters: [
      { id: "max_tokens", name: "Max Tokens", type: "number", min: 1, max: 2048, step: 1, defaultValue: 1024 },
      { id: "temperature", name: "Temperature", type: "number", min: 0, max: 2, step: 0.1, defaultValue: 0.7 },
      { id: "top_p", name: "Top P", type: "number", min: 0, max: 1, step: 0.01, defaultValue: 1 },
    ],
  },
  {
    id: "another_llm",
    name: "Another LLM",
    models: [{ id: "model_x", name: "Model X" }],
    parameters: [
      { id: "max_tokens", name: "Max Tokens", type: "number", min: 1, max: 2048, step: 1, defaultValue: 1024 },
    ],
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

  // New config states
  const [selectedParser, setSelectedParser] = useState<string | undefined>(parsers[0]?.id);
  const [selectedRetriever, setSelectedRetriever] = useState<string | undefined>(retrievers[0]?.id);
  const [selectedGenerator, setSelectedGenerator] = useState<string | undefined>(generators[0]?.id);
  const [selectedModel, setSelectedModel] = useState<string | undefined>(
    generators.find(g => g.id === generators[0]?.id)?.models[0]?.id
  );
  const [modelParams, setModelParams] = useState<Record<string, any>>({});

  // For config "Set" loading animation
  const [isSetting, setIsSetting] = useState(false);

  // Effect to initialize modelParams when generator changes
  useEffect(() => {
    const currentGenerator = generators.find(g => g.id === selectedGenerator);
    if (currentGenerator) {
      const initialParams: Record<string, any> = {};
      currentGenerator.parameters.forEach(param => {
        initialParams[param.id] = param.defaultValue;
      });
      setModelParams(initialParams);
      // Also set the default model for the new generator
      setSelectedModel(currentGenerator.models[0]?.id);
    } else {
      setModelParams({});
      setSelectedModel(undefined);
    }
  }, [selectedGenerator]);
  
  // Get the full description of the selected library
  const selectedLibraryData = libraries.find(lib => lib.id === selectedLibrary);
  const currentGeneratorDetails = generators.find(g => g.id === selectedGenerator);

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
          parser: selectedParser,
          retriever: selectedRetriever,
          generator: selectedGenerator,
          model: selectedModel,
          parameters: modelParams,
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

  const handleParamChange = (paramId: string, value: any) => {
    setModelParams(prev => ({ ...prev, [paramId]: value }));
  };

  // Spinner animation for setting
  function SettingLoadingSpinner() {
    // Simple three-dot animation using CSS
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="flex space-x-1">
          <span className="animate-bounce [animation-delay:0ms] text-2xl">.</span>
          <span className="animate-bounce [animation-delay:200ms] text-2xl">.</span>
          <span className="animate-bounce [animation-delay:400ms] text-2xl">.</span>
        </div>
        <div className="mt-2 text-base font-medium">Applying Settings...</div>
      </div>
    );
  }
  
  return (
    <PageLayout>
      <div className="flex h-[calc(100vh-5rem)]">
        {/* Left Sidebar - Chat Sessions */}
        <aside className="hidden md:flex w-64 flex-col border-r overflow-y-auto">
          {/* Header with New Chat button */}
          <div className="flex justify-between items-center p-4 border-b font-heading">
            <h2 className="font-semibold text-lg">Chat Sessions</h2>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="New Chat">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span className="sr-only">New Chat</span>
            </Button>
          </div>
          
          {/* Chat list */}
          <div className="flex flex-col">
            {['General Chat', 'Project Research', 'Meeting Notes', 'Technical Docs'].map((session, index) => (
              <div 
                key={index} 
                className={`p-4 cursor-pointer chat-item hover:bg-accent hover:text-accent-foreground ${index === 0 ? 'bg-accent text-accent-foreground' : ''}`}
              >
                {session}
              </div>
            ))}
          </div>
        </aside>
        
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative">
          {/* Overlay for settings spinner */}
          {isSetting && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/70 pointer-events-auto">
              <div>
                <SettingLoadingSpinner />
              </div>
            </div>
          )}
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
          <div>
            <h2 className="font-semibold mb-4 p-2 border-b pb-4 text-lg font-heading">Selected Library</h2>
            <Popover open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
              <PopoverTrigger asChild>
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <div className="font-medium">{selectedLibraryData?.name}</div>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m7 15 5 5 5-5"/>
                          <path d="m7 9 5-5 5 5"/>
                        </svg>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <div className="max-h-[60vh] overflow-y-auto">
                  {libraries.map((library) => (
                    <div 
                      key={library.id} 
                      className={`p-4 cursor-pointer dialog-item ${
                        library.id === selectedLibrary ? 'bg-accent text-accent-foreground' : ''
                      }`}
                      onClick={() => {
                        setSelectedLibrary(library.id);
                        setIsLibraryOpen(false);
                      }}
                    >
                      <div className="text-base font-medium">{library.name}</div>
                      {library.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {library.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <h3 className="font-semibold mb-2 p-2 border-b pb-3 text-lg font-heading">Config Setting</h3>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-sm text-muted-foreground">Parser</Label>
                <Select value={selectedParser} onValueChange={setSelectedParser}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Select a parser" />
                  </SelectTrigger>
                  <SelectContent>
                    {parsers.map(parser => (
                      <SelectItem key={parser.id} value={parser.id}>{parser.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Retriever</Label>
                <Select value={selectedRetriever} onValueChange={setSelectedRetriever}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Select a retriever" />
                  </SelectTrigger>
                  <SelectContent>
                    {retrievers.map(retriever => (
                      <SelectItem key={retriever.id} value={retriever.id}>{retriever.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Generator</Label>
                <Select value={selectedGenerator} onValueChange={setSelectedGenerator}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Select a generator" />
                  </SelectTrigger>
                  <SelectContent>
                    {generators.map(gen => (
                      <SelectItem key={gen.id} value={gen.id}>{gen.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentGeneratorDetails && (
                <>
                  <div>
                    <Label className="text-sm text-muted-foreground">Model</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentGeneratorDetails.models.map(model => (
                          <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {currentGeneratorDetails.parameters.map(param => (
                    <div key={param.id}>
                      <Label htmlFor={param.id} className="text-sm text-muted-foreground">{param.name}</Label>
                      {param.type === 'number' && (param.id === 'temperature' || param.id === 'top_p') ? (
                        <>
                          <input
                            id={param.id}
                            type="range"
                            min={param.min}
                            max={param.max}
                            step={param.step}
                            value={modelParams[param.id] ?? param.defaultValue}
                            onChange={(e) => handleParamChange(param.id, parseFloat(e.target.value))}
                            className="w-full mt-1"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{param.min}</span>
                            <span>{modelParams[param.id]}</span>
                            <span>{param.max}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <Input
                            id={param.id}
                            type={param.type}
                            min={param.min}
                            max={param.max}
                            step={param.step}
                            value={modelParams[param.id] ?? param.defaultValue}
                            onChange={(e) => handleParamChange(param.id, param.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                            className="w-full mt-1"
                          />
                          {param.type === 'number' && (
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>Min: {param.min}</span>
                              <span>Max: {param.max}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
            {/* Set button at the bottom of the config area */}
            <div className="pt-8 flex justify-end">
              <Button
                onClick={() => {
                  setIsSetting(true);
                  setTimeout(() => setIsSetting(false), 1500);
                }}
                disabled={isSetting}
                className="w-24"
              >{isSetting ? (
                <span>
                  <svg className="inline animate-spin mr-1 h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Setting...
                </span>
              ) : "Set"}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </PageLayout>
  );
} 