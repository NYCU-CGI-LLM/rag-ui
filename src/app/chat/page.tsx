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
import { CreateRetrieverDialog } from "@/components/CreateRetrieverDialog";



// Default generator configuration for chat sessions
interface ChatGeneratorConfig {
  moduleId: string;
  parameterValues: { [paramId: string]: string | number | boolean };
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





// Chat session interface - now includes generator config
interface ChatSession {
  id: string;
  name: string;
  timestamp: string;
  generatorConfig: ChatGeneratorConfig; // Add generator config to chat session
}



// Chat message component for better structure
interface Message {
  id: string;
  isUser: boolean;
  content: string;
  timestamp?: string;
}

function ChatMessage({ isUser, content, timestamp = "Just now" }: Omit<Message, 'id'>) {
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
      </div>
      <div className="text-xs text-muted-foreground mt-1 mx-2">{timestamp}</div>
    </div>
  );
}

// API Configuration
const API_URL = "/api";

// API Response Interfaces for Chat
interface ApiChatConfig {
  llm_model: string;
  temperature: number;
  top_p: number;
}

interface ApiChatSummary {
  id: string;
  name: string | null;
  message_count: number;
  last_activity: string;
  retriever_config_name: string | null;
  config: ApiChatConfig;
}

// Add interface for detailed chat response
interface ApiChatDetail {
  id: string;
  name: string;
  retriever_id: string;
  metadata: any;
  message_count: number;
  last_activity: string;
  config: ApiChatConfig;
  messages: ApiMessage[];
  retriever_config_name: string;
}

// Add interface for API messages
interface ApiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: any;
  chat_id: string;
  created_at: string;
  updated_at: string;
}

// Add interfaces for retriever detail API response
interface ApiRetrieverDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  library_id: string;
  parser_id: string;
  chunker_id: string;
  indexer_id: string;
  collection_name: string | null;
  top_k: number;
  total_chunks: number | null;
  indexed_at: string | null;
  error_message: string | null;
  library_name: string | null;
  parser_info: ComponentInfo | null;
  chunker_info: ComponentInfo | null;
  indexer_info: ComponentInfo | null;
  pipeline_stats: any | null;
}

interface ComponentInfo {
  id: string;
  name: string;
  type: string;
  params?: any;
}

interface ComponentInfo {
  id: string;
  name: string;
  type: string;
  params?: any;
}

// Add interfaces for library and retriever API responses
interface ApiLibrary {
  id: string;
  library_name: string;
  description: string | null;
  stats: {
    file_count: number;
    total_size: number;
  };
}

interface ApiRetriever {
  id: string;
  name: string;
  description: string | null;
  status: string;
  library_id: string;
  parser_id: string;
  chunker_id: string;
  indexer_id: string;
  collection_name: string | null;
  top_k: number;
  total_chunks: number | null;
  indexed_at: string | null;
  error_message: string | null;
}

interface ApiRetrieverListResponse {
  total: number;
  retrievers: ApiRetriever[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Chat sessions state management
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [chatsError, setChatsError] = useState<string | null>(null);
  
  // Add state for message loading
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  
  // Add state for current retriever information
  const [currentRetriever, setCurrentRetriever] = useState<ApiRetrieverDetail | null>(null);
  const [isLoadingRetriever, setIsLoadingRetriever] = useState(false);
  const [retrieverError, setRetrieverError] = useState<string | null>(null);
  
  // Add state for top_k retrieval parameter (separate from generator params)
  const [retrievalTopK, setRetrievalTopK] = useState<number>(5);
  
  // Track the currently selected chat session
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  // Generator parameter overrides for current session
  const [generatorParams, setGeneratorParams] = useState<{ [key: string]: string | number | boolean }>({});

  // Apply animation state
  const [isApplying, setIsApplying] = useState(false);

  // New chat session dialog states
  const [isNewChatPopoverOpen, setIsNewChatPopoverOpen] = useState(false);
  const [isNewSessionDialogOpen, setIsNewSessionDialogOpen] = useState(false);
  const [isExistingSessionDialogOpen, setIsExistingSessionDialogOpen] = useState(false);
  const [tempSessionName, setTempSessionName] = useState("");

  // Delete confirmation dialog state
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Add state for API retrievers
  const [apiRetrievers, setApiRetrievers] = useState<ApiRetriever[]>([]);
  const [isLoadingRetrievers, setIsLoadingRetrievers] = useState(false);
  const [tempSelectedRetrieverId, setTempSelectedRetrieverId] = useState<string>("");

  // Add state for create retriever dialog
  const [isCreateRetrieverDialogOpen, setIsCreateRetrieverDialogOpen] = useState(false);

  // Initialize generator params when session changes (now from session's generator config)
  useEffect(() => {
    if (selectedSessionId) {
      const session = chatSessions.find(s => s.id === selectedSessionId);
      if (session && session.generatorConfig) {
        setGeneratorParams({...session.generatorConfig.parameterValues});
      }
    } else {
      // Default generator params when no session is selected
      setGeneratorParams({ llm: "gpt-4o-mini", max_tokens: 4096, temperature: 0.7, top_p: 1.0 });
    }
  }, [selectedSessionId, chatSessions]);

  // Fetch chat sessions from API on component mount
  useEffect(() => {
    fetchChatSessions();
  }, []);

  // Load initial session data when sessions are loaded
  useEffect(() => {
    if (!isLoadingChats && chatSessions.length > 0 && selectedSessionId) {
      const session = chatSessions.find(s => s.id === selectedSessionId);
      if (session) {
        // Fetch actual messages from API
        const loadInitialMessages = async () => {
          try {
            const fetchedMessages = await fetchChatMessages(selectedSessionId);
            
            if (fetchedMessages.length > 0) {
              // Use actual messages from API
              setMessages(fetchedMessages);
            } else {
              // No messages yet, show initial greeting
              setMessages([{
                id: "initial-ai-message-existing",
                isUser: false,
                content: `Hello! I've loaded the "${session.name}" session. How can I help you today?`,
                timestamp: new Date().toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }),
              }]);
            }
          } catch (error) {
            // On error, show fallback message
            setMessages([{
              id: "initial-ai-message-error",
              isUser: false,
              content: `Hello! I've loaded the "${session.name}" session, but couldn't fetch previous messages. How can I help you today?`,
              timestamp: new Date().toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
              }),
            }]);
          }
          
          // Also fetch retriever details
          try {
            const chatResponse = await fetch(`${API_URL}/chat/${selectedSessionId}`);
            if (chatResponse.ok) {
              const chatDetail: ApiChatDetail = await chatResponse.json();
              if (chatDetail.retriever_id) {
                await fetchRetrieverDetails(chatDetail.retriever_id);
              }
            }
          } catch (error) {
            console.error('Failed to fetch retriever details for initial session:', error);
          }
        };
        
        loadInitialMessages();
      }
    }
  }, [isLoadingChats, chatSessions, selectedSessionId]);


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
    if (inputValue.trim() === "" || isLoading || !selectedSessionId) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      isUser: true,
      content: inputValue,
      timestamp: new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Use the direct API endpoint based on test results
      const apiPayload = {
        message: inputValue,
        model: generatorParams.llm || "gpt-4o-mini",
        temperature: generatorParams.temperature || 0.7,
        top_p: generatorParams.top_p || 1.0,
        top_k: retrievalTopK,
        stream: false,
        context_config: {}
      };
      console.log("Sending to API:", apiPayload); // For debugging

      const response = await fetch(`${API_URL}/chat/${selectedSessionId}`, {
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

      // Based on API test results, the response contains: message_id, response, sources, etc.
      const aiContent = data.response;

      const aiMessage: Message = {
        id: data.message_id || `ai-${Date.now()}`,
        isUser: false,
        content: aiContent || "Sorry, I couldn't process that.",
        timestamp: new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }),
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        isUser: false,
        content: error instanceof Error ? error.message : "An unknown error occurred.",
        timestamp: new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new chat session with the selected configuration
  const createNewChatSession = async () => {
    if (!tempSelectedRetrieverId) {
      console.error('No retriever selected');
      return;
    }

    try {
      if (!API_URL) {
        throw new Error('API_URL not configured');
      }

      // Prepare API payload based on the test example
      const apiPayload = {
        name: tempSessionName.trim() || "New Chat Session",
        retriever_id: tempSelectedRetrieverId,
        metadata: {},
        llm_model: "gpt-4o-mini",
        temperature: 0.7,
        top_p: 1.0,
        top_k: 5
      };

      const response = await fetch(`${API_URL}/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newChat = await response.json();

      // Refresh chat sessions list to include the new chat
      await fetchChatSessions();

      // Set the new chat as selected
      setSelectedSessionId(newChat.id);
      
      // Reset chat messages to initial greeting
      setMessages([{
        id: "initial-ai-message-new",
        isUser: false,
        content: "Hello! How can I help you today?",
        timestamp: new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }),
      }]);
      
      // Reset temporary form values
      setTempSessionName("");
      setTempSelectedRetrieverId("");
      
      // Close dialogs
      setIsNewSessionDialogOpen(false);
      setIsNewChatPopoverOpen(false);

      console.log('Successfully created new chat session:', newChat);
    } catch (error) {
      console.error('Failed to create new chat session:', error);
      // You might want to show an error message to the user here
    }
  };

  // Delete a chat session
  const deleteSession = async (sessionId: string) => {
    try {
      if (!API_URL) {
        throw new Error('API_URL not configured');
      }

             const response = await fetch(`${API_URL}/chat/${sessionId}`, {
         method: 'DELETE',
       });

      if (!response.ok) {
        if (response.status === 422) {
          const errorData = await response.json();
          throw new Error(`Validation error: ${errorData.detail?.[0]?.msg || 'Invalid request'}`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // API call successful (204 No Content), now update local state
      setChatSessions(prev => prev.filter(session => session.id !== sessionId));
      
      // If we're deleting the currently selected session, switch to the first available session
      if (selectedSessionId === sessionId) {
        const remainingSessions = chatSessions.filter(session => session.id !== sessionId);
        if (remainingSessions.length > 0) {
          loadExistingSession(remainingSessions[0].id);
        } else {
          // No sessions left, create a default state
          setSelectedSessionId("");
          setMessages([{
            id: "initial-ai-message-empty",
            isUser: false,
            content: "Hello! How can I help you today?",
            timestamp: new Date().toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }),
          }]);
        }
      }
      
      // Close delete dialog
      setIsDeleteDialogOpen(false);
      setDeleteSessionId(null);

      console.log('Successfully deleted chat session:', sessionId);
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      
      // Close delete dialog even on error (so user isn't stuck)
      setIsDeleteDialogOpen(false);
      setDeleteSessionId(null);
      
      // TODO: Consider adding a toast notification or error state
    }
  };

  // Handle delete session confirmation
  const handleDeleteSession = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the session selection
    setDeleteSessionId(sessionId);
    setIsDeleteDialogOpen(true);
  };

  // Create a chat session from an existing one
  const loadExistingSession = async (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    
    if (session) {
      // Set selected session
      setSelectedSessionId(sessionId);
      
      // Fetch actual messages from API
      try {
        const fetchedMessages = await fetchChatMessages(sessionId);
        
        if (fetchedMessages.length > 0) {
          // Use actual messages from API
          setMessages(fetchedMessages);
        } else {
          // No messages yet, show initial greeting
          setMessages([{
            id: "initial-ai-message-existing",
            isUser: false,
            content: `Hello! I've loaded the "${session.name}" session. How can I help you today?`,
            timestamp: new Date().toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }),
          }]);
        }
      } catch (error) {
        // On error, show fallback message with error indicator
        setMessages([{
          id: "initial-ai-message-error",
          isUser: false,
          content: `Hello! I've loaded the "${session.name}" session, but couldn't fetch previous messages. How can I help you today?`,
          timestamp: new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }),
        }]);
      }
      
      // Fetch retriever details to get actual session information
      try {
        // First get chat details to get retriever_id
        const chatResponse = await fetch(`${API_URL}/chat/${sessionId}`);
        if (chatResponse.ok) {
          const chatDetail: ApiChatDetail = await chatResponse.json();
          if (chatDetail.retriever_id) {
            await fetchRetrieverDetails(chatDetail.retriever_id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch retriever details for session:', error);
      }
      
      // Close dialog
      setIsExistingSessionDialogOpen(false);
      setIsNewChatPopoverOpen(false);
    }
  };

  // Create a copy from an existing session
  const createCopyFromExistingSession = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    
    if (session) {
      // Generate new session ID and timestamp
      const newSessionId = `session-${Date.now()}`;
      const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      // Create new session object with "copy" suffix, copying all original configs
      const newSession: ChatSession = {
        id: newSessionId,
        name: `${session.name} copy`,
        timestamp: timestamp,
        generatorConfig: { 
          moduleId: session.generatorConfig.moduleId, 
          parameterValues: { ...session.generatorConfig.parameterValues } 
        },
      };

      // Add to sessions list
      setChatSessions(prev => [newSession, ...prev]);

      // Set selected session
      setSelectedSessionId(newSessionId);
      
      // Reset chat messages to initial greeting
      setMessages([{
        id: "initial-ai-message-copy",
        isUser: false,
        content: `Hello! I've created a copy of "${session.name}". How can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }),
      }]);
      
      // Close dialog
      setIsExistingSessionDialogOpen(false);
      setIsNewChatPopoverOpen(false);
    }
  };

  // Transform API chat data to ChatSession format
  const transformApiChatToSession = (apiChat: ApiChatSummary): ChatSession => {
    // Parse as UTC by appending 'Z'
    const localLastActivity = new Date(apiChat.last_activity + "Z");
    const localNow = new Date();

    // Determine if localLastActivity is today or yesterday
    const isToday = localLastActivity.toDateString() === localNow.toDateString();
    const yesterday = new Date(localNow);
    yesterday.setDate(localNow.getDate() - 1);
    const isYesterday = localLastActivity.toDateString() === yesterday.toDateString();

    let timestamp: string;
    if (isToday) {
      timestamp = `Today, ${localLastActivity.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })}`;
    } else if (isYesterday) {
      timestamp = `Yesterday, ${localLastActivity.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })}`;
    } else {
      timestamp = localLastActivity.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
    }

    return {
      id: apiChat.id,
      name: apiChat.name || "Untitled Chat",
      timestamp: timestamp,
      generatorConfig: {
        moduleId: "openai_llm",
        parameterValues: {
          llm: apiChat.config.llm_model,
          max_tokens: 4096, // Default value
          temperature: apiChat.config.temperature,
          top_p: apiChat.config.top_p,
        }
      }
    };
  };

  // Fetch chat sessions from API
  const fetchChatSessions = async () => {
    try {
      setIsLoadingChats(true);
      setChatsError(null);
      
      if (!API_URL) {
        throw new Error('API_URL not configured');
      }

      const response = await fetch(`${API_URL}/chat/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiChats: ApiChatSummary[] = await response.json();
      
      // Transform API data to ChatSession format
      const transformedSessions = apiChats.map(transformApiChatToSession);
      
      setChatSessions(transformedSessions);
      
      // Set initial session if we have chats
      if (transformedSessions.length > 0 && !selectedSessionId) {
        const firstSession = transformedSessions[0];
        setSelectedSessionId(firstSession.id);
      }
    } catch (error) {
      console.error('Failed to fetch chat sessions:', error);
      setChatsError(error instanceof Error ? error.message : 'Failed to fetch chat sessions');
      
      setChatSessions([]);
      setSelectedSessionId("");
    } finally {
      setIsLoadingChats(false);
    }
  };

  // Add function to fetch chat messages from API
  const fetchChatMessages = async (chatId: string) => {
    try {
      setIsLoadingMessages(true);
      setMessagesError(null);
      
      if (!API_URL) {
        throw new Error('API_URL not configured');
      }

      const response = await fetch(`${API_URL}/chat/${chatId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const chatDetail: ApiChatDetail = await response.json();
      
      // Transform API messages to local Message format
      const transformedMessages = transformApiMessagesToLocal(chatDetail.messages);
      
      return transformedMessages;
    } catch (error) {
      console.error('Failed to fetch chat messages:', error);
      setMessagesError(error instanceof Error ? error.message : 'Failed to fetch chat messages');
      throw error;
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Transform API messages to local Message format
  const transformApiMessagesToLocal = (apiMessages: ApiMessage[]): Message[] => {
    // Sort messages by creation time to ensure correct order (treat as UTC)
    const sortedMessages = [...apiMessages].sort((a, b) =>
      new Date(a.created_at + "Z").getTime() - new Date(b.created_at + "Z").getTime()
    );
    
    return sortedMessages.map((apiMsg, index) => {
      const timestamp = new Date(apiMsg.created_at + "Z").toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      
      return {
        id: apiMsg.id,
        isUser: apiMsg.role === 'user',
        content: apiMsg.content,
        timestamp: timestamp,
      };
    });
  };

  // Add function to fetch retriever details from API
  const fetchRetrieverDetails = async (retrieverId: string) => {
    try {
      setIsLoadingRetriever(true);
      setRetrieverError(null);
      
      if (!API_URL) {
        throw new Error('API_URL not configured');
      }

      const response = await fetch(`${API_URL}/retriever/${retrieverId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const retrieverDetail: ApiRetrieverDetail = await response.json();
      
      setCurrentRetriever(retrieverDetail);
      setRetrievalTopK(retrieverDetail.top_k);
      
      return retrieverDetail;
    } catch (error) {
      console.error('Failed to fetch retriever details:', error);
      setRetrieverError(error instanceof Error ? error.message : 'Failed to fetch retriever details');
      throw error;
    } finally {
      setIsLoadingRetriever(false);
    }
  };

  // Add function to fetch retrievers from API
  const fetchRetrievers = async () => {
    try {
      setIsLoadingRetrievers(true);
      
      if (!API_URL) {
        throw new Error('API_URL not configured');
      }

      const response = await fetch(`${API_URL}/retriever/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiRetrieverListResponse = await response.json();
      // Only show active retrievers
      const activeRetrievers = data.retrievers.filter(r => r.status === 'active');
      setApiRetrievers(activeRetrievers);
      
      // Set default selection to first active retriever
      if (activeRetrievers.length > 0 && !tempSelectedRetrieverId) {
        setTempSelectedRetrieverId(activeRetrievers[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch retrievers:', error);
    } finally {
      setIsLoadingRetrievers(false);
    }
  };

  // Add callback to handle retriever creation
  const handleRetrieverCreated = async () => {
    // Refresh retrievers list after creation
    await fetchRetrievers();
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
                        setTempSelectedRetrieverId("");
                        setTempSessionName("");
                        // Fetch API data when dialog opens
                        fetchRetrievers();
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
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                        </svg>
                        Create from existing
                      </div>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Chat list */}
            <div className="flex flex-col">
              {isLoadingChats ? (
                <div className="p-4 text-center text-muted-foreground">
                  <div className="text-sm">Loading chat sessions...</div>
                </div>
              ) : chatsError ? (
                <div className="p-4">
                  <div className="text-sm text-red-600 mb-2">Failed to load chats from API</div>
                  <div className="text-xs text-muted-foreground mb-3">{chatsError}</div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={fetchChatSessions}
                    className="w-full"
                  >
                    Retry
                  </Button>
                </div>
              ) : chatSessions.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <div className="text-sm">No chat sessions yet</div>
                  <div className="text-xs mt-1">Create your first session to get started</div>
                </div>
              ) : (
                chatSessions.map((session) => (
                  <div 
                    key={session.id} 
                    className={`group p-4 cursor-pointer chat-item hover:bg-accent hover:text-accent-foreground ${session.id === selectedSessionId ? 'bg-accent text-accent-foreground' : ''}`}
                    onClick={() => loadExistingSession(session.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{session.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{session.timestamp}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        title="Delete session"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"/>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                          <path d="M8 6V4c0-1 1-2 2-2h4c-1 0 2 1 2 2v2"/>
                          <line x1="10" x2="10" y1="11" y2="17"/>
                          <line x1="14" x2="14" y1="11" y2="17"/>
                        </svg>
                        <span className="sr-only">Delete session</span>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
          
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col relative">
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-2 max-w-4xl mx-auto">
                {/* Show loading state when fetching messages */}
                {isLoadingMessages && (
                  <div className="text-center text-muted-foreground py-8">
                    <div className="inline-flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading conversation history...
                    </div>
                  </div>
                )}
                
                {/* Show error message if there's an error loading messages */}
                {messagesError && !isLoadingMessages && (
                  <div className="text-center text-red-600 py-4">
                    <div className="text-sm">Failed to load messages: {messagesError}</div>
                  </div>
                )}
                
                {/* Show messages only when not loading */}
                {!isLoadingMessages && messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    isUser={msg.isUser}
                    content={msg.content}
                    timestamp={msg.timestamp}
                  />
                ))}
                
                {/* Show welcome message when no session is selected and not loading */}
                {!isLoadingMessages && !selectedSessionId && chatSessions.length === 0 && !isLoadingChats && (
                  <div className="text-center text-muted-foreground py-8">
                    <div className="text-lg font-medium mb-2">Welcome to RAG Chat</div>
                    <div className="text-sm">Create a new chat session to get started</div>
                  </div>
                )}
                
                {/* Show session selection message when sessions exist but none selected */}
                {!isLoadingMessages && !selectedSessionId && chatSessions.length > 0 && !isLoadingChats && (
                  <div className="text-center text-muted-foreground py-8">
                    <div className="text-lg font-medium mb-2">Select a Chat Session</div>
                    <div className="text-sm">Choose a session from the sidebar to continue chatting</div>
                  </div>
                )}
                
                 {isLoading && (
                  <ChatMessage
                    isUser={false}
                    content="AI Assistant is typing..."
                    timestamp={new Date().toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    })}
                  />
                )}
              </div>
            </div>
            
            {/* Input area */}
            <div className="border-t p-4">
              <div className="flex max-w-4xl mx-auto">
                <Input 
                  type="text" 
                  placeholder={selectedSessionId ? "Type your message here..." : "Select a chat session to start messaging..."} 
                  className="flex-1 rounded-r-none focus-visible:ring-1 text-black"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isLoading || !selectedSessionId}
                />
                <Button 
                  className="rounded-l-none text-black"
                  onClick={handleSendMessage} 
                  disabled={isLoading || inputValue.trim() === "" || !selectedSessionId}
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
              {isLoadingRetriever ? (
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-center text-muted-foreground">
                    <div className="inline-flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading session info...
                    </div>
                  </div>
                </div>
              ) : retrieverError ? (
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-sm text-red-600">
                    Failed to load session info: {retrieverError}
                  </div>
                </div>
              ) : currentRetriever ? (
                <div className="p-3 bg-muted rounded-md">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Library</div>
                      <div className="font-medium">{currentRetriever.library_name || "Unknown"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Retriever Configuration</div>
                      <div className="font-medium">{currentRetriever.name}</div>
                      {currentRetriever.description && (
                        <div className="text-xs text-muted-foreground mt-1">{currentRetriever.description}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Pipeline</div>
                      <div className="space-y-1">
                        {currentRetriever.parser_info && (
                          <div className="text-xs">
                            <span className="font-medium">Parser:</span> {currentRetriever.parser_info.name}
                          </div>
                        )}
                        {currentRetriever.chunker_info && (
                          <div className="text-xs">
                            <span className="font-medium">Chunker:</span> {currentRetriever.chunker_info.name}
                          </div>
                        )}
                        {currentRetriever.indexer_info && (
                          <div className="text-xs">
                            <span className="font-medium">Indexer:</span> {currentRetriever.indexer_info.name}
                          </div>
                        )}
                      </div>
                    </div>
                    {currentRetriever.total_chunks && (
                      <div>
                        <div className="text-xs text-muted-foreground">Total Chunks</div>
                        <div className="text-sm font-medium">{currentRetriever.total_chunks.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : selectedSessionId ? (
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-sm text-muted-foreground">
                    Select a session to view configuration details
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-sm text-muted-foreground">
                    No session selected
                  </div>
                </div>
              )}
            </div>

            {/* Top K Retrieval Parameter */}
            {selectedSessionId && (
              <div>
                <h3 className="font-semibold mb-2 p-2 border-b pb-3 text-lg font-heading">Retrieval Settings</h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="retrieval-top-k" className="text-sm">Top K Documents</Label>
                    <p className="text-xs text-muted-foreground">Number of documents to retrieve for context</p>
                    <Input
                      id="retrieval-top-k"
                      type="number"
                      value={retrievalTopK}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val >= 1 && val <= 50) {
                          setRetrievalTopK(val);
                        }
                      }}
                      min={1}
                      max={50}
                      step={1}
                      placeholder="5"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Generator Parameters */}
            {selectedSessionId && (
              <div>
                <h3 className="font-semibold mb-2 p-2 border-b pb-3 text-lg font-heading">Generator Settings</h3>
                <div className="space-y-4">
                  {(() => {
                    const currentSession = chatSessions.find(s => s.id === selectedSessionId);
                    const generatorModuleId = currentSession?.generatorConfig?.moduleId || 'openai_llm';
                    return GENERATOR_PARAM_DEFINITIONS[generatorModuleId]?.map(param => (
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
                                  generatorModuleId === 'openai_llm' && param.id === 'max_tokens' 
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
                    ));
                  })()}
                </div>
                
                {/* Action buttons at the bottom */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const currentSession = chatSessions.find(s => s.id === selectedSessionId);
                      if (currentSession && currentSession.generatorConfig) {
                        setGeneratorParams({...currentSession.generatorConfig.parameterValues});
                      }
                      if (currentRetriever) {
                        setRetrievalTopK(currentRetriever.top_k);
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
                <DialogTitle>Create from Existing Session</DialogTitle>
                <DialogDescription>
                  Select a session to copy. A new session with the same configuration will be created with " copy" added to the name.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="max-h-[60vh] overflow-y-auto">
                  {chatSessions.map((session) => (
                    <div 
                      key={session.id} 
                      className="p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md mb-2"
                      onClick={() => createCopyFromExistingSession(session.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{session.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">{session.timestamp}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {session.generatorConfig.parameterValues.llm || "OpenAI GPT"}
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
                Choose a retriever configuration for your new chat session. The retriever includes its associated library.
              </DialogDescription>
            </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="session-name" className="text-right">
                    Name
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="session-name"
                      value={tempSessionName}
                      onChange={(e) => setTempSessionName(e.target.value)}
                      placeholder="Enter session name (optional)"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="new-retriever" className="text-right">
                    Retriever
                  </Label>
                  <div className="col-span-3">
                    {isLoadingRetrievers ? (
                      <div className="text-sm text-muted-foreground">Loading retrievers...</div>
                    ) : (
                      <div className="space-y-2">
                        <Select value={tempSelectedRetrieverId} onValueChange={setTempSelectedRetrieverId}>
                          <SelectTrigger id="new-retriever">
                            <SelectValue placeholder="Select a retriever configuration">
                              {tempSelectedRetrieverId ? 
                                apiRetrievers.find(r => r.id === tempSelectedRetrieverId)?.name || "Unknown Retriever"
                                : "Select a retriever configuration"
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {apiRetrievers.map(retriever => (
                              <SelectItem key={retriever.id} value={retriever.id}>
                                <div className="flex flex-col space-y-1 py-1">
                                  <div className="font-medium">{retriever.name}</div>
                                  {retriever.description && (
                                    <div className="text-xs text-muted-foreground line-clamp-2">{retriever.description}</div>
                                  )}
                                  <div className="text-xs text-muted-foreground">
                                    {retriever.total_chunks ? `${retriever.total_chunks.toLocaleString()} chunks` : 'No chunks'}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs"
                          onClick={() => setIsCreateRetrieverDialogOpen(true)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <path d="M12 5v14M5 12h14"/>
                          </svg>
                          Create New Retriever
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsNewSessionDialogOpen(false);
                    setTempSessionName("");
                    setTempSelectedRetrieverId("");
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={createNewChatSession}
                  disabled={!tempSelectedRetrieverId || isLoadingRetrievers}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Create Chat
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Session Confirmation Dialog */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Delete Chat Session</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this chat session? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {deleteSessionId && (
                  <div className="p-4 bg-muted rounded-md">
                    <div className="font-medium">
                      {chatSessions.find(s => s.id === deleteSessionId)?.name}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {chatSessions.find(s => s.id === deleteSessionId)?.timestamp}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsDeleteDialogOpen(false);
                    setDeleteSessionId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => deleteSessionId && deleteSession(deleteSessionId)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    <path d="M8 6V4c0-1 1-2 2-2h4c-1 0 2 1 2 2v2"/>
                    <line x1="10" x2="10" y1="11" y2="17"/>
                    <line x1="14" x2="14" y1="11" y2="17"/>
                  </svg>
                  Delete Session
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Retriever Dialog */}
          <CreateRetrieverDialog
            open={isCreateRetrieverDialogOpen}
            onOpenChange={setIsCreateRetrieverDialogOpen}
            onRetrieverCreated={handleRetrieverCreated}
          />
        </div>
      </PageLayout>
    </>
  );
} 