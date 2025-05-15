import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ChatPage() {
  return (
    <PageLayout>
      <div className="flex h-[calc(100vh-5rem)]">
        {/* Left Sidebar - Chat Sessions */}
        <div className="hidden md:flex w-64 flex-col border-r p-4 overflow-y-auto">
          <h2 className="font-semibold mb-4">Chat Sessions</h2>
          <div className="space-y-2">
            {['General Chat', 'Project Research', 'Meeting Notes', 'Technical Docs'].map((session, index) => (
              <div 
                key={index} 
                className={`p-2 rounded cursor-pointer hover:bg-accent ${index === 0 ? 'bg-accent' : ''}`}
              >
                {session}
              </div>
            ))}
          </div>
          <Button className="mt-4 w-full" variant="outline" size="sm">
            New Chat
          </Button>
        </div>
        
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
        <div className="hidden lg:flex w-64 flex-col border-l p-4 overflow-y-auto">
          <h2 className="font-semibold mb-4">Selected Libraries</h2>
          <div className="space-y-2">
            {['Technical Docs', 'Product Manuals', 'Research Papers', 'Company Wiki'].map((library, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox id={`library-${index}`} defaultChecked={index < 2} />
                <label 
                  htmlFor={`library-${index}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {library}
                </label>
              </div>
            ))}
          </div>
          
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
        </div>
      </div>
    </PageLayout>
  );
} 