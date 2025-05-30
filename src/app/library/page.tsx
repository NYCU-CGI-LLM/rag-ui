'use client'

import { useState, useEffect } from "react";
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogFooter,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Trash2 } from 'lucide-react';

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
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isDeleteLibraryDialogOpen, setIsDeleteLibraryDialogOpen] = useState(false);

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
    setSelectedDocuments([]);
  };

  const handleBackToLibraries = () => {
    setCurrentLibrary(null);
    setSelectedDocuments([]);
  };

  const handleDuplicateLibrary = () => {
    if (currentLibrary) {
      const duplicateLibrary: Library = {
        id: String(libraries.length + 1),
        name: `${currentLibrary.name} copy`,
        description: currentLibrary.description,
        fileCount: currentLibrary.fileCount,
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      
      setLibraries((prev) => [...prev, duplicateLibrary]);
      
      // Navigate back to the Document Libraries page
      setCurrentLibrary(null);
      setSelectedDocuments([]);
    }
  };

  const toggleDocumentSelection = (docId: number) => {
    setSelectedDocuments((prevSelected) =>
      prevSelected.includes(docId)
        ? prevSelected.filter((id) => id !== docId)
        : [...prevSelected, docId]
    );
  };

  const toggleSelectAllDocuments = () => {
    if (selectedDocuments.length === documents.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(documents.map((doc) => doc.id));
    }
  };

  const handleDeleteSelectedDocuments = () => {
    setDocuments((prevDocs) =>
      prevDocs.filter((doc) => !selectedDocuments.includes(doc.id))
    );
    if (currentLibrary) {
        const newFileCount = currentLibrary.fileCount - selectedDocuments.length;
        const updatedLibrary = { ...currentLibrary, fileCount: newFileCount > 0 ? newFileCount : 0 };
        setCurrentLibrary(updatedLibrary);
        setLibraries(prevLibs => prevLibs.map(lib => lib.id === updatedLibrary.id ? updatedLibrary : lib));
    }
    setSelectedDocuments([]);
    setIsDeleteDialogOpen(false);
  };

  const handleRenameLibrary = () => {
    if (currentLibrary && editedName.trim() !== "") {
      const updatedLibrary = { ...currentLibrary, name: editedName.trim() };
      setCurrentLibrary(updatedLibrary);
      setLibraries(prev => prev.map(lib => 
        lib.id === updatedLibrary.id ? updatedLibrary : lib
      ));
      setIsEditingName(false);
    }
  };

  const startEditingName = () => {
    if (currentLibrary) {
      setEditedName(currentLibrary.name);
      setIsEditingName(true);
    }
  };

  const handleDeleteLibrary = () => {
    if (currentLibrary) {
      setLibraries(prev => prev.filter(lib => lib.id !== currentLibrary.id));
      setCurrentLibrary(null);
      setSelectedDocuments([]);
      setIsDeleteLibraryDialogOpen(false);
    }
  };

  return (
    <PageLayout>
      <div className="space-y-6 p-4 max-w-6xl mx-auto">
        {currentLibrary ? (
          // Document view when a library is selected
          <>
            <div className="flex justify-between items-start">
              <div className="w-full">
                <div className="flex justify-between w-full">
                  <Button variant="outline" onClick={handleBackToLibraries}>
                    ← Back to Libraries
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => setIsDeleteLibraryDialogOpen(true)}
                    className="flex items-center"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Library
                  </Button>
                </div>
                <div className="mt-2 flex items-center">
                  {isEditingName ? (
                    <div className="flex items-center">
                      <Input 
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="text-2xl font-bold h-auto py-1 mr-2"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameLibrary();
                          } else if (e.key === 'Escape') {
                            setIsEditingName(false);
                          }
                        }}
                      />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleRenameLibrary}
                        className="h-8 px-2"
                      >
                        Save
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsEditingName(false)}
                        className="h-8 px-2"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold">{currentLibrary.name}</h1>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={startEditingName}
                        className="ml-2 h-8 w-8 p-0"
                        aria-label="Edit library name"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                          <path d="m15 5 4 4"/>
                        </svg>
                      </Button>
                    </>
                  )}
                </div>
                <p className="text-muted-foreground">{currentLibrary.description}</p>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex mb-4 items-center">
                <Button variant="outline" className="mr-2">Upload Files</Button>
                <Button variant="outline" className="mr-2" onClick={handleDuplicateLibrary}>
                  Duplicate Library
                </Button>
                {selectedDocuments.length > 0 && (
                  <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="mr-2">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete ({selectedDocuments.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                        <DialogDescription>
                          This action cannot be undone. This will permanently delete the selected file(s).
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteSelectedDocuments}>Delete</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                <div className="flex-1"></div>
                <Input 
                  type="text" 
                  placeholder="Search files..." 
                  className="w-64"
                />
              </div>
              
              {documents.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                        <th className="py-2 px-4 text-left w-10">
                          <Checkbox
                            checked={documents.length > 0 && selectedDocuments.length === documents.length}
                            onCheckedChange={toggleSelectAllDocuments}
                            aria-label="Select all documents"
                          />
                        </th>
                      <th className="text-left py-2 px-4">File Name</th>
                      <th className="text-left py-2 px-4">Size</th>
                      <th className="text-left py-2 px-4">Upload Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((file) => (
                      <tr key={file.id} className="border-t">
                          <td className="py-2 px-4">
                            <Checkbox
                              checked={selectedDocuments.includes(file.id)}
                              onCheckedChange={() => toggleDocumentSelection(file.id)}
                              aria-label={`Select document ${file.name}`}
                            />
                          </td>
                        <td className="py-2 px-4">{file.name}</td>
                        <td className="py-2 px-4">{file.size}</td>
                        <td className="py-2 px-4">{file.uploadDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              ) : (
                <Card className="mt-4 text-center">
                  <CardContent className="p-6">
                    <p className="text-muted-foreground">No documents in this library yet.</p>
                  </CardContent>
                </Card>
              )}
              
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
              {libraries
                .slice()
                .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
                .map((library) => (
                <Card 
                  key={library.id} 
                  className="hover:border-primary cursor-pointer"
                  onClick={() => handleSelectLibrary(library)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle>{library.name}</CardTitle>
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

        {/* Delete Library Confirmation Dialog */}
        <Dialog open={isDeleteLibraryDialogOpen} onOpenChange={setIsDeleteLibraryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Library</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{currentLibrary?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-between mt-6 gap-4">
              <Button variant="outline" onClick={() => setIsDeleteLibraryDialogOpen(false)} className="flex-1">
                Keep
              </Button>
              <Button variant="destructive" onClick={handleDeleteLibrary} className="flex-1">
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
} 