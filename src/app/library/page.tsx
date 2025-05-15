'use client'

import { useState, useEffect } from "react";
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

// Define types
interface Library {
  id: string;
  name: string;
  description: string;
  fileCount: number;
  lastUpdated: string;
}

interface Document {
  id: number;
  name: string;
  size: string;
  uploadDate: string;
}

export default function LibraryPage() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentLibrary, setCurrentLibrary] = useState<Library | null>(null);
  const [isCreatingLibrary, setIsCreatingLibrary] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState("");
  const [newLibraryDescription, setNewLibraryDescription] = useState("");

  // Initialize with demo data
  useEffect(() => {
    // Load demo libraries
    const demoLibraries: Library[] = [
      {
        id: "1",
        name: "Technical Documentation",
        description: "Technical manuals and API documentation",
        fileCount: 23,
        lastUpdated: "2023-11-15"
      },
      {
        id: "2",
        name: "Research Papers",
        description: "Academic papers and research notes",
        fileCount: 45,
        lastUpdated: "2023-12-03"
      },
      {
        id: "3",
        name: "Product Manuals",
        description: "User guides and product specifications",
        fileCount: 17,
        lastUpdated: "2024-01-20"
      },
      {
        id: "4",
        name: "Company Wiki",
        description: "Internal knowledge base and processes",
        fileCount: 31,
        lastUpdated: "2024-02-10"
      }
    ];
    
    // Load demo documents
    const demoDocuments = [
      { id: 1, name: "system_architecture.pdf", size: "2.4 MB", uploadDate: "2024-01-05" },
      { id: 2, name: "api_reference.docx", size: "1.7 MB", uploadDate: "2024-01-10" },
      { id: 3, name: "installation_guide.pdf", size: "3.2 MB", uploadDate: "2024-01-12" },
      { id: 4, name: "troubleshooting.md", size: "0.5 MB", uploadDate: "2024-01-15" },
      { id: 5, name: "security_protocols.pdf", size: "1.8 MB", uploadDate: "2024-01-20" }
    ];
    
    setLibraries(demoLibraries);
    setDocuments(demoDocuments);
  }, []);

  const handleCreateLibrary = () => {
    setIsCreatingLibrary(true);
  };

  const handleSaveNewLibrary = () => {
    if (!newLibraryName.trim()) {
      alert("Library name is required");
      return;
    }

    const newLibrary: Library = {
      id: String(libraries.length + 1),
      name: newLibraryName,
      description: newLibraryDescription,
      fileCount: 0,
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    setLibraries((prev) => [...prev, newLibrary]);
    setNewLibraryName("");
    setNewLibraryDescription("");
    setIsCreatingLibrary(false);
  };

  const handleSelectLibrary = (library: Library) => {
    setCurrentLibrary(library);
  };

  const handleBackToLibraries = () => {
    setCurrentLibrary(null);
  };

  const handleDeleteLibrary = (id: string) => {
    setLibraries((prev) => prev.filter(lib => lib.id !== id));
    if (currentLibrary?.id === id) {
      setCurrentLibrary(null);
    }
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        {currentLibrary ? (
          // Document view when a library is selected
          <>
            <div className="flex justify-between items-center">
              <div>
                <Button variant="outline" onClick={handleBackToLibraries}>
                  ← Back to Libraries
                </Button>
                <h1 className="text-2xl font-bold mt-2">{currentLibrary.name}</h1>
                <p className="text-muted-foreground">{currentLibrary.description}</p>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex mb-4">
                <Button variant="outline" className="mr-2">Upload Files</Button>
                <Button variant="outline" className="mr-2">Manage Embeddings</Button>
                <div className="flex-1"></div>
                <Input 
                  type="text" 
                  placeholder="Search files..." 
                  className="w-64"
                />
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left py-2 px-4">File Name</th>
                      <th className="text-left py-2 px-4">Size</th>
                      <th className="text-left py-2 px-4">Upload Date</th>
                      <th className="text-left py-2 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((file) => (
                      <tr key={file.id} className="border-t">
                        <td className="py-2 px-4">{file.name}</td>
                        <td className="py-2 px-4">{file.size}</td>
                        <td className="py-2 px-4">{file.uploadDate}</td>
                        <td className="py-2 px-4 space-x-2">
                          <button className="text-sm hover:text-primary">View</button>
                          <button className="text-sm hover:text-destructive">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <Card className="mt-4 border-dashed text-center">
                <CardContent className="p-6">
                  <p className="text-muted-foreground mb-2">Drag and drop files here, or click to select files</p>
                  <Button variant="outline" size="sm">Browse Files</Button>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          // Libraries view
          <>
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Document Libraries</h1>
              <Button onClick={handleCreateLibrary}>Create New Library</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {libraries.map((library) => (
                <Card 
                  key={library.id} 
                  className="hover:border-primary cursor-pointer"
                  onClick={() => handleSelectLibrary(library)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle>{library.name}</CardTitle>
                      <div className="flex gap-2">
                        <button 
                          className="text-sm hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            // In a real app, you'd implement edit functionality here
                            console.log('Edit library:', library.id);
                          }}
                        >
                          Edit
                        </button>
                        <button 
                          className="text-sm hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLibrary(library.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <CardDescription>{library.description}</CardDescription>
                  </CardHeader>
                  <CardFooter className="flex justify-between pt-2 text-sm">
                    <span>{library.fileCount} files</span>
                    <span>Updated: {library.lastUpdated}</span>
                  </CardFooter>
                </Card>
              ))}
              
              <Card 
                className="border-dashed flex items-center justify-center cursor-pointer"
                onClick={handleCreateLibrary}
              >
                <CardContent className="text-center p-6">
                  <div className="text-4xl text-muted-foreground mb-2">+</div>
                  <div className="text-muted-foreground">Add New Library</div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Create Library Dialog */}
        <Dialog open={isCreatingLibrary} onOpenChange={setIsCreatingLibrary}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Library</DialogTitle>
              <DialogDescription>
                Create a new knowledge library to organize your documents
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">Library Name</Label>
                <Input
                  id="name"
                  placeholder="Enter library name"
                  value={newLibraryName}
                  onChange={(e) => setNewLibraryName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter a description for your library"
                  value={newLibraryDescription}
                  onChange={(e) => setNewLibraryDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreatingLibrary(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveNewLibrary}>
                Create Library
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
} 