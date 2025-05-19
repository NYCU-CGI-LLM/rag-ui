'use client'
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
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

export default function ChatPage() {
  const [selectedLibrary, setSelectedLibrary] = useState(libraries[0].id);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  
  // Get the full description of the selected library
  const selectedLibraryData = libraries.find(lib => lib.id === selectedLibrary);
  
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
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto">
            {/* Chat messages would go here */}
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg max-w-[80%]">
                <div className="font-semibold mb-1">AI Assistant</div>
                <p>Hello! How can I help you today?</p>
              </div>
              
              <div className="bg-primary text-primary-foreground p-4 rounded-lg max-w-[80%] ml-auto">
                <div className="font-semibold mb-1">You</div>
                <p>I need information about RAG systems from my technical documentation.</p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg max-w-[80%]">
                <div className="font-semibold mb-1">AI Assistant</div>
                <p>Based on your technical documentation, RAG (Retrieval-Augmented Generation) systems combine retrieval mechanisms with generative models. They retrieve relevant information from a knowledge base and then use that information to generate more accurate and contextually relevant responses.</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  Source: Technical Documentation, Page 23
                </div>
              </div>
            </div>
          </div>
          
          {/* Input area */}
          <div className="border-t p-4">
            <div className="flex">
              <Input 
                type="text" 
                placeholder="Type your message here..." 
                className="flex-1 rounded-r-none"
              />
              <Button className="rounded-l-none">Send</Button>
            </div>
          </div>
        </div>
        
        {/* Right Sidebar - Libraries */}
        <aside className="hidden lg:flex w-72 flex-col border-l p-4 overflow-y-auto">
          <h2 className="font-semibold mb-4 p-2 border-b pb-4 text-lg font-heading">Selected Library</h2>
          
          {/* Library selection with popover */}
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
          
          <h3 className="font-semibold mt-6 mb-2">Search Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Number of results</label>
              <Select defaultValue="10">
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select number of results" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground">Similarity threshold</label>
              <Input 
                type="range" 
                min="0" 
                max="100" 
                defaultValue="75" 
                className="w-full mt-1"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </PageLayout>
  );
} 