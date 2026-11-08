"use client";

import { useSession, signIn, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import Editor from "@/components/Editor";

interface Document {
  id: string;
  title: string;
  content: string;
  status: "DRAFT" | "PUBLISHED";
  createdAt: string;
  updatedAt: string;
  bookId?: string | null;
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const editorContentRef = useRef<string>("");

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      fetchDocuments();
    }
  }, [session]);

  /**
   * Fetches documents from the API and handles loading/error states.
   * On success, clears error and populates documents.
   * On failure, sets error state with retry option.
   */
  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/documents");
      if (response.ok) {
        const data = await response.json();
        setDocuments(data as Document[]);
        setError(null);
      } else {
        const errData = await response.json() as { error?: string };
        setError(errData.error || 'Failed to fetch documents');
      }
    } catch (error) {
      setError('Network error while fetching documents');
      console.error("Error fetching documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    const newDoc: Document = {
      id: `new-${Date.now()}`,
      title: "Untitled",
      content: "",
      status: "DRAFT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCurrentDoc(newDoc);
    setEditingId(null);
    setHasUnsavedChanges(false);
    editorContentRef.current = "";
  };

  /**
   * Saves the current document to the API.
   * Accepts the document to save, serializes it, and passes it to the API.
   * Reconciles response against currently active document to preserve unsaved edits.
   */
  const handleSave = async (docToSave: Document) => {
    if (!docToSave) return;

    try {
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(`/api/documents${editingId ? `/${editingId}` : ""}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: docToSave.title,
          content: docToSave.content,
          status: docToSave.status,
        }),
      });

      if (response.ok) {
        const updated = await response.json() as Document;
        // Reconcile response against currently active document and edit version
        setDocuments(documents.map(d => d.id === updated.id ? updated : d));
        // Only select the saved document if it's still the active one and has no newer edits
        if (currentDoc?.id === updated.id && !hasUnsavedChanges) {
          setCurrentDoc(updated);
        }
        setEditingId(updated.id);
        setHasUnsavedChanges(false);
        editorContentRef.current = updated.content;
      } else {
        console.error("Error saving document:", response.statusText);
      }
    } catch (error) {
      console.error("Error saving document:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      try {
        const response = await fetch(`/api/documents/${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          setDocuments(documents.filter(d => d.id !== id));
          if (currentDoc?.id === id) {
            setCurrentDoc(null);
            setEditingId(null);
          }
        } else {
          console.error("Error deleting document:", response.statusText);
        }
      } catch (error) {
        console.error("Error deleting document:", error);
      }
    }
  };

  const handlePublish = async () => {
    if (!currentDoc) return;
    const updated = { ...currentDoc, status: "PUBLISHED" as const };
    setCurrentDoc(updated);
    await handleSave(updated);
  };

  const handleDraft = async () => {
    if (!currentDoc) return;
    const updated = { ...currentDoc, status: "DRAFT" as const };
    setCurrentDoc(updated);
    await handleSave(updated);
  };

  const handleContentUpdate = useCallback((content: string) => {
    setCurrentDoc(prev => {
      if (!prev) return null;
      setHasUnsavedChanges(true);
      return { ...prev, content };
    });
    editorContentRef.current = content;
  }, []);

  // Handle window unload to warn about unsaved changes
  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!currentDoc || !hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentDoc, hasUnsavedChanges]);

  // Handle sign out properly - call signOut and navigate only after success
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Check for errors
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 rounded-md p-4 mb-6 text-red-700 dark:text-red-300">
            <p>{error}</p>
            <button
              onClick={fetchDocuments}
              className="mt-2 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Writing Desk</h1>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push("/account")}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Account
                </button>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Sign out
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {currentDoc && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Status: {currentDoc.status}
                  </span>
                  {currentDoc.status === "DRAFT" && (
                    <button
                      onClick={handlePublish}
                      className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded"
                    >
                      Publish
                    </button>
                  )}
                  {currentDoc.status === "PUBLISHED" && (
                    <button
                      onClick={handleDraft}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      Save as Draft
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex">
        {/* Sidebar - Document List */}
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4">
            <button
              onClick={handleCreateNew}
              className="w-full mb-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
            >
              + New Document
            </button>

            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="relative">
                    <button
                      onClick={() => {
                        setCurrentDoc(doc);
                        setEditingId(doc.id);
                      }}
                      className={`w-full text-left p-2 rounded-md cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                        editingId === doc.id
                          ? "bg-indigo-50 dark:bg-indigo-900 border border-indigo-200 dark:border-indigo-700"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                      aria-label={`Select document: ${doc.title}`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {doc.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </div>
                      {currentDoc?.id === doc.id && (
                        <span className="text-xs text-indigo-600 font-medium">
                          (editing)
                        </span>
                      )}
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {doc.status}
                      </div>
                    </button>
                    {/* Accessible delete control */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded opacity-0 hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                      aria-label={`Delete document: ${doc.title}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}

              {documents.length === 0 && !isLoading && (
                <div className="text-center py-8 text-gray-500">
                  <p>No documents yet</p>
                  <button
                    onClick={handleCreateNew}
                    className="mt-2 text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Create your first document
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Editor Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">
            {currentDoc ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={currentDoc.title}
                  onChange={(e) => setCurrentDoc({ ...currentDoc, title: e.target.value })}
                  className="text-2xl font-bold w-full bg-transparent border-none outline-none text-gray-900 dark:text-white"
                  placeholder="Document title"
                />
                <Editor
                  initialContent={currentDoc.content}
                  onUpdate={handleContentUpdate}
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Welcome to Writing Desk
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Create or select a document to start writing.
                </p>
                <button
                  onClick={handleCreateNew}
                  className="px-6 py-3 text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                >
                  Create New Document
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}