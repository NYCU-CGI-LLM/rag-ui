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

// Mock saved chat sessions
const savedChatSessions = [
  { 
    id: "session-1", 
    name: "General Chat",
    timestamp: "Today, 10:30 AM",
    config: {
      library: "tech-docs",
      parser: "pypdf",
      retriever: "chroma_db",
      generator: "openai_llm",
      model: "gpt-4o",
    }
  },
  { 
    id: "session-2", 
    name: "Project Research",
    timestamp: "Yesterday, 3:45 PM",
    config: {
      library: "research-papers",
      parser: "markdown_parser",
      retriever: "bm25",
      generator: "another_llm",
      model: "model_x",
    }
  },
  { 
    id: "session-3", 
    name: "Meeting Notes",
    timestamp: "Aug 15, 2:15 PM",
    config: {
      library: "company-wiki",
      parser: "markdown_parser",
      retriever: "chroma_db",
      generator: "openai_llm",
      model: "gpt-4o-mini",
    }
  },
  { 
    id: "session-4", 
    name: "Technical Docs",
    timestamp: "Aug 14, 11:20 AM",
    config: {
      library: "product-manuals",
      parser: "pypdf",
      retriever: "bm25",
      generator: "openai_llm",
      model: "gpt-4o",
    }
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
  
  // Track the currently selected chat session
  const [selectedSessionId, setSelectedSessionId] = useState<string>("session-1");

  // New chat session dialog states
  const [isNewChatPopoverOpen, setIsNewChatPopoverOpen] = useState(false);
  const [isNewSessionDialogOpen, setIsNewSessionDialogOpen] = useState(false);
  const [isExistingSessionDialogOpen, setIsExistingSessionDialogOpen] = useState(false);
  const [tempLibrary, setTempLibrary] = useState(libraries[0].id);
  const [tempParser, setTempParser] = useState(parsers[0]?.id);
  const [tempRetriever, setTempRetriever] = useState(retrievers[0]?.id);

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
  
  // Load initial session data on first render
  useEffect(() => {
    if (selectedSessionId) {
      const session = savedChatSessions.find(s => s.id === selectedSessionId);
      if (session) {
        // Set configuration based on the selected session
        setSelectedLibrary(session.config.library);
        setSelectedParser(session.config.parser);
        setSelectedRetriever(session.config.retriever);
        setSelectedGenerator(session.config.generator);
        setSelectedModel(session.config.model);
        
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

  // Create a new chat session with the selected configuration
  const createNewChatSession = () => {
    // Update main configuration with temporary selections
    setSelectedLibrary(tempLibrary);
    setSelectedParser(tempParser);
    setSelectedRetriever(tempRetriever);
    
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
      setSelectedLibrary(session.config.library);
      setSelectedParser(session.config.parser);
      setSelectedRetriever(session.config.retriever);
      setSelectedGenerator(session.config.generator);
      setSelectedModel(session.config.model);
      
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
                      setTempParser(selectedParser || "");
                      setTempRetriever(selectedRetriever || "");
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
          {/* Current Session Info */}
          <div>
            <h3 className="font-semibold mb-2 p-2 border-b pb-3 text-lg font-heading">Current Session</h3>
            <div className="p-3 bg-muted rounded-md">
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground">Library</div>
                  <div className="font-medium">{selectedLibraryData?.name || "None"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Parser</div>
                  <div className="font-medium">{parsers.find(p => p.id === selectedParser)?.name || "None"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Retriever</div>
                  <div className="font-medium">{retrievers.find(r => r.id === selectedRetriever)?.name || "None"}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2 p-2 border-b pb-3 text-lg font-heading">Model Settings</h3>
            <div className="space-y-4 pt-2">
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
              ) : "Apply"}
              </Button>
            </div>
          </div>
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
                        Library: {libraries.find(l => l.id === session.config.library)?.name || session.config.library}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Parser: {parsers.find(p => p.id === session.config.parser)?.name || session.config.parser}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Retriever: {retrievers.find(r => r.id === session.config.retriever)?.name || session.config.retriever}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Generator: {generators.find(g => g.id === session.config.generator)?.name || session.config.generator}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Model: {session.config.model}
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
                <Label htmlFor="new-parser" className="text-right">
                  Parser
                </Label>
                <div className="col-span-3">
                  <Select value={tempParser} onValueChange={setTempParser}>
                    <SelectTrigger id="new-parser">
                      <SelectValue placeholder="Select a parser" />
                    </SelectTrigger>
                    <SelectContent>
                      {parsers.map(parser => (
                        <SelectItem key={parser.id} value={parser.id}>
                          {parser.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-retriever" className="text-right">
                  Retriever
                </Label>
                <div className="col-span-3">
                  <Select value={tempRetriever} onValueChange={setTempRetriever}>
                    <SelectTrigger id="new-retriever">
                      <SelectValue placeholder="Select a retriever" />
                    </SelectTrigger>
                    <SelectContent>
                      {retrievers.map(retriever => (
                        <SelectItem key={retriever.id} value={retriever.id}>
                          {retriever.name}
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
  );
} 