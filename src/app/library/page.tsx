'use client'

import { useState, useEffect, useRef } from "react";
// Base URL for backend API
const API_URL = "/api";
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
  library_name: string;
  description: string;
  stats: {
    file_count: number;
    total_size: number;
  };
  created_at: string;
  updated_at: string;
}

interface Document {
  id: string;
  file_name: string;
  size_bytes: number;
  uploaded_at: string;
  mime_type: string;
}

export default function LibraryPage() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentLibrary, setCurrentLibrary] = useState<Library | null>(null);
  const [isCreatingLibrary, setIsCreatingLibrary] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState("");
  const [newLibraryDescription, setNewLibraryDescription] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedLibraryName, setEditedLibraryName] = useState("");
  const [isDeleteLibraryDialogOpen, setIsDeleteLibraryDialogOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dndFileInputRef = useRef<HTMLInputElement>(null);
  const [isRenamingLibrary, setIsRenamingLibrary] = useState(false);

  const ALLOWED_FILE_TYPES = [
    "application/pdf", 
    "application/msword", 
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
    "text/plain", 
    "text/csv", 
    "application/json", 
    "text/markdown"
  ];
  const MAX_FILE_SIZE_MB = 100;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  // Fetch libraries from backend API
  useEffect(() => {
    const fetchLibraries = async () => {
      try {
        const response = await fetch(`${API_URL}/library/`);
        if (!response.ok) throw new Error("Failed to fetch libraries");
        const text = await response.text();
        console.log("Library API raw:", text);
        const data = JSON.parse(text);
        setLibraries(data);
      } catch (error) {
        console.error("Error loading libraries:", error);
      }
    };
    fetchLibraries();
  }, []);

  useEffect(() => {
    // Check for duplicate document IDs
    const ids = documents.map(doc => doc.id).filter(id => id != null);
    const idCounts: Record<string, number> = {};
    ids.forEach(id => {
      idCounts[id] = (idCounts[id] || 0) + 1;
    });

    const duplicates = Object.entries(idCounts).filter(([_, count]) => count > 1).map(([id, _]) => id);
    if (duplicates.length > 0) {
      console.warn("Duplicate document IDs found:", duplicates);
    }
  }, [documents]);

  const handleCreateLibrary = () => {
    setIsCreatingLibrary(true);
  };

  const handleSaveNewLibrary = async () => {
    if (!newLibraryName.trim()) {
      alert("Library name is required");
      return;
    }

    const newLibraryData = {
      library_name: newLibraryName.trim(),
      description: newLibraryDescription.trim(),
    };

    try {
      const response = await fetch(`${API_URL}/library/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify(newLibraryData),
      });

      if (response.status === 201) {
        const createdLibrary: Library = await response.json();
        setLibraries((prev) => [...prev, createdLibrary]);
        setNewLibraryName("");
        setNewLibraryDescription("");
        setIsCreatingLibrary(false);
      } else {
        const errorData = await response.json();
        let errorMessage = `Failed to create library. Status: ${response.status}`;
        if (response.status === 409) {
          errorMessage = "Library name already exists. Please choose a different name.";
        } else if (response.status === 422 && errorData.detail) {
          const validationErrors = errorData.detail.map((err: any) => `${err.loc.join('.')} - ${err.msg}`).join('\\n');
          errorMessage = `Validation Error:\\n${validationErrors}`;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }
        console.error("Error creating library:", errorData);
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Error creating library:", error);
      alert("An unexpected error occurred while creating the library. See console for details.");
    }
  };

  const refreshLibraryDetails = async (libraryId: string) => {
    if (!libraryId) return;
    try {
      const response = await fetch(`${API_URL}/library/${libraryId}`);
      if (!response.ok) {
        let errorText = `Failed to refresh library details (ID: ${libraryId})`;
        try {
          const errorData = await response.json();
          errorText = errorData.detail || errorText;
        } catch (e) { /* ignore if error response is not JSON */ }
        throw new Error(errorText);
      }
      const detailedLibraryData = await response.json();

      setCurrentLibrary(detailedLibraryData);
      const fetchedFiles = detailedLibraryData.files?.map((file: any) => ({
        id: file.id,
        file_name: file.file_name,
        size_bytes: file.size_bytes,
        uploaded_at: file.uploaded_at,
        mime_type: file.mime_type,
      })) || [];
      setDocuments(fetchedFiles.filter((file: any) => file.id != null)); 

      // Update this library within the main libraries list as well
      setLibraries(prevLibs =>
        prevLibs.map(lib => lib.id === detailedLibraryData.id ? detailedLibraryData : lib)
      );

    } catch (error) {
      console.error("Error refreshing library details:", error);
      alert(`Could not refresh library data: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleSelectLibrary = async (library: Library) => {
    setSelectedDocuments([]);
    setSearchQuery("");
    await refreshLibraryDetails(library.id);
  };

  const handleBackToLibraries = () => {
    setCurrentLibrary(null);
    setSelectedDocuments([]);
    setIsEditingName(false);
    setEditedLibraryName("");
    setSearchQuery("");
  };

  const handleDuplicateLibrary = () => {
    if (currentLibrary) {
      const newDuplicatedLibrary: Library = {
        id: `local_dup_${Date.now()}`,
        library_name: `${currentLibrary.library_name} copy`,
        description: currentLibrary.description,
        stats: { ...currentLibrary.stats },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setLibraries((prev) => [...prev, newDuplicatedLibrary]);
      setCurrentLibrary(null);
      setSelectedDocuments([]);
    }
  };

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocuments((prevSelected) =>
      prevSelected.includes(docId)
        ? prevSelected.filter((id) => id !== docId)
        : [...prevSelected, docId]
    );
  };

  const toggleSelectAllDocuments = () => {
    const filteredDocuments = documents
      .filter((file) => file.id != null)
      .filter((file) => 
        searchQuery === "" || 
        file.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.mime_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    const filteredDocumentIds = filteredDocuments.map((doc) => doc.id);
    const allFilteredSelected = filteredDocumentIds.every(id => selectedDocuments.includes(id));
    
    if (allFilteredSelected && filteredDocumentIds.length > 0) {
      // Deselect all filtered documents
      setSelectedDocuments(selectedDocuments.filter(id => !filteredDocumentIds.includes(id)));
    } else {
      // Select all filtered documents
      const newSelection = [...new Set([...selectedDocuments, ...filteredDocumentIds])];
      setSelectedDocuments(newSelection);
    }
  };

  const handleDeleteSelectedDocuments = () => {
    setDocuments((prevDocs) =>
      prevDocs.filter((doc) => !selectedDocuments.includes(doc.id))
    );
    if (currentLibrary) {
        const newFileCount = currentLibrary.stats.file_count - selectedDocuments.length;
        const updatedStats = { ...currentLibrary.stats, file_count: newFileCount > 0 ? newFileCount : 0 };
        const updatedLibrary = { ...currentLibrary, stats: updatedStats, updated_at: new Date().toISOString() };
        setCurrentLibrary(updatedLibrary);
        setLibraries(prevLibs => prevLibs.map(lib => lib.id === updatedLibrary.id ? updatedLibrary : lib));
    }
    setSelectedDocuments([]);
    setIsDeleteDialogOpen(false);
  };

  const handleRenameLibrary = async () => {
    if (currentLibrary && editedLibraryName.trim() !== "") {
      setIsRenamingLibrary(true);
      const updatedLibraryData = {
        library_name: editedLibraryName.trim(),
        description: currentLibrary.description,
      };
      try {
        const response = await fetch(`${API_URL}/library/${currentLibrary.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "accept": "application/json",
          },
          body: JSON.stringify(updatedLibraryData),
        });
        if (response.ok) {
          const updatedLibrary = await response.json();
          setCurrentLibrary(updatedLibrary);
          setLibraries(prev => prev.map(lib =>
            lib.id === updatedLibrary.id ? updatedLibrary : lib
          ));
          setIsEditingName(false);
        } else {
          const errorData = await response.json();
          let errorMessage = `Failed to update library. Status: ${response.status}`;
          if (errorData.detail) {
            errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
          }
          alert(errorMessage);
        }
      } catch (error) {
        alert("An unexpected error occurred while updating the library. See console for details.");
        console.error("Error updating library:", error);
      } finally {
        setIsRenamingLibrary(false);
      }
    }
  };

  const startEditingName = () => {
    if (currentLibrary) {
      setEditedLibraryName(currentLibrary.library_name);
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

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      alert(`Invalid file type: ${file.type}. Supported types: PDF, DOC, DOCX, TXT, CSV, JSON, MD`);
      return false;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert(`File is too large (${(file.size / (1024*1024)).toFixed(2)}MB). Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
      return false;
    }
    return true;
  };

  const executeUpload = async (file: File) => {
    if (!currentLibrary) {
      alert("Please ensure a library is selected.");
      return;
    }
    
    if (!validateFile(file)) {
      if (dndFileInputRef.current) dndFileInputRef.current.value = "";
      setFileToUpload(null);
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/library/${currentLibrary.id}/file`, {
        method: "POST",
        body: formData,
        headers: {
          "accept": "application/json",
        },
      });

      if (response.ok) {
        let newFileData;
        try {
          const responseText = await response.text();
          newFileData = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Error parsing upload response:", parseError);
          throw new Error(`Failed to parse upload response: ${parseError}`);
        }

        const newDocument: Document = {
          id: newFileData.file_id,
          file_name: newFileData.file_name,
          size_bytes: newFileData.file_size,
          uploaded_at: newFileData.uploaded_at,
          mime_type: newFileData.mime_type,
        };
        
        setDocuments((prevDocs) => [...prevDocs, newDocument].filter((file) => file.id != null));
        
        if (currentLibrary) {
          const updatedStats = {
            file_count: currentLibrary.stats.file_count + 1,
            total_size: currentLibrary.stats.total_size + newDocument.size_bytes,
          };
          const updatedLibrary = { 
            ...currentLibrary, 
            stats: updatedStats, 
            updated_at: new Date().toISOString() 
          };
          setCurrentLibrary(updatedLibrary);
          setLibraries(prevLibs => 
            prevLibs.map(lib => lib.id === updatedLibrary.id ? updatedLibrary : lib)
          );
        }
        
        if (currentLibrary) {
          await refreshLibraryDetails(currentLibrary.id);
        }
        
        alert("File uploaded successfully!");
      } else {
        let errorMessage = `Upload failed. Status: ${response.status}`;
        
        try {
          const responseText = await response.text();
          const errorDetails = JSON.parse(responseText);
          
          if (errorDetails.detail) {
            errorMessage = typeof errorDetails.detail === 'string' ? errorDetails.detail : JSON.stringify(errorDetails.detail);
          } else if (errorDetails.error) {
            errorMessage = errorDetails.error;
          }
        } catch (e) {
          // Use default error message if response parsing fails
        }

        console.error("Upload failed:", errorMessage);
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert(`An unexpected error occurred during upload: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUploading(false);
      setFileToUpload(null);
      if (dndFileInputRef.current) dndFileInputRef.current.value = "";
    }
  };

  const handleMainUploadButtonClick = () => {
    if (fileToUpload) {
      executeUpload(fileToUpload);
    }
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as Node;
    if (!e.currentTarget.contains(relatedTarget)) {
        setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    
    if (isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      executeUpload(droppedFile);
      e.dataTransfer.clearData();
    }
  };

  const handleDndCardClick = () => {
    if (isUploading) return;
    dndFileInputRef.current?.click();
  };

  const handleDndCardFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      executeUpload(selectedFile);
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
                    disabled
                    title="Coming soon"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Library
                  </Button>
                </div>
                <div className="mt-2 flex items-center">
                  {isEditingName ? (
                    <div className="flex items-center">
                      <Input
                        value={editedLibraryName}
                        onChange={(e) => setEditedLibraryName(e.target.value)}
                        className="text-2xl font-bold h-auto py-1 mr-2"
                        autoFocus
                        disabled={isRenamingLibrary}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isRenamingLibrary) {
                            handleRenameLibrary();
                          } else if (e.key === 'Escape' && !isRenamingLibrary) {
                            setIsEditingName(false);
                          }
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRenameLibrary}
                        className="h-8 px-2"
                        disabled={isRenamingLibrary}
                      >
                        {isRenamingLibrary ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingName(false)}
                        className="h-8 px-2"
                        disabled={isRenamingLibrary}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold">{currentLibrary.library_name}</h1>
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
                <Input 
                  type="text" 
                  placeholder="Search files..." 
                  className="max-w-xs mr-4"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button 
                  variant="outline" 
                  className="mr-2" 
                  onClick={handleDuplicateLibrary}
                  disabled
                  title="Coming soon"
                >
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
              </div>
              
              {(() => {
                const filteredDocuments = documents
                  .filter((file) => file.id != null)
                  .filter((file) => 
                    searchQuery === "" || 
                    file.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    file.mime_type.toLowerCase().includes(searchQuery.toLowerCase())
                  );

                if (documents.length === 0) {
                  return (
                    <Card className="mt-4 text-center">
                      <CardContent className="p-6">
                        <p className="text-muted-foreground">No documents in this library yet.</p>
                      </CardContent>
                    </Card>
                  );
                }

                if (filteredDocuments.length === 0 && searchQuery !== "") {
                  return (
                    <Card className="mt-4 text-center">
                      <CardContent className="p-6">
                        <p className="text-muted-foreground">No files found matching "{searchQuery}"</p>
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                            <th className="py-2 px-4 text-left w-10">
                              <Checkbox
                                checked={filteredDocuments.length > 0 && 
                                         filteredDocuments.every(doc => selectedDocuments.includes(doc.id))}
                                onCheckedChange={toggleSelectAllDocuments}
                                aria-label="Select all documents"
                              />
                            </th>
                          <th className="text-left py-2 px-4">File Name</th>
                          <th className="text-left py-2 px-4">Size</th>
                          <th className="text-left py-2 px-4">Upload Date</th>
                          <th className="text-left py-2 px-4">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDocuments.map((file) => (
                          <tr key={file.id} className="border-t">
                            <td className="py-2 px-4">
                              <Checkbox
                                checked={selectedDocuments.includes(file.id)}
                                onCheckedChange={() => toggleDocumentSelection(file.id)}
                                aria-label={`Select document ${file.file_name}`}
                              />
                            </td>
                            <td className="py-2 px-4">{file.file_name}</td>
                            <td className="py-2 px-4">{(file.size_bytes / (1024*1024)).toFixed(2)} MB</td>
                            <td className="py-2 px-4">{new Date(file.uploaded_at).toLocaleDateString()}</td>
                            <td className="py-2 px-4">{file.mime_type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
              
              <Card 
                className={`mt-4 border-dashed text-center cursor-pointer ${isDraggingOver ? 'border-primary bg-secondary' : ''}`}
                onClick={handleDndCardClick}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <CardContent className="p-6">
                  <p className="text-muted-foreground mb-2">
                    {isUploading ? "Uploading..." : (isDraggingOver ? "Drop file here" : "Drag and drop files here, or click to select files")}
                  </p>
                  {!isUploading && !isDraggingOver && (
                    <Button variant="outline" size="sm" className="pointer-events-none">
                      Browse Files
                    </Button>
                  )}
                </CardContent>
              </Card>
              <input 
                type="file" 
                ref={dndFileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleDndCardFileSelected}
                accept={ALLOWED_FILE_TYPES.join(',')}
                disabled={isUploading}
              />
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
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                .map((library) => (
                <Card 
                  key={library.id} 
                  className="hover:border-primary cursor-pointer"
                  onClick={() => handleSelectLibrary(library)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle>{library.library_name}</CardTitle>
                    </div>
                    <CardDescription>{library.description}</CardDescription>
                  </CardHeader>
                  <CardFooter className="flex justify-between pt-2 text-sm">
                    <span>Files: {library.stats.file_count}</span>
                    <span>Updated: {new Date(library.updated_at).toLocaleDateString()}</span>
                  </CardFooter>
                </Card>
              ))}
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
                Are you sure you want to delete the library "{currentLibrary?.library_name}"? 
                This action cannot be undone and all associated documents may be lost.
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