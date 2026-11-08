"use client";

import { useSession, signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/documents");
      if (response.ok) {
        const data = await response.json();
        setDocuments(data as Document[]);
      }
    } catch (error) {
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
  };

  const handleSave = async () => {
    if (!currentDoc) return;

    try {
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(`/api/documents${editingId ? `/${editingId}` : ""}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: currentDoc.title,
          content: currentDoc.content,
          status: currentDoc.status,
        }),
      });

      if (response.ok) {
        const updated = await response.json() as Document;
        setDocuments(documents.map(d => d.id === updated.id ? updated : d));
        setCurrentDoc(updated);
        setEditingId(updated.id);
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
          }
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
    await handleSave();
  };

  const handleDraft = () => {
    if (!currentDoc) return;
    const updated = { ...currentDoc, status: "DRAFT" as const };
    setCurrentDoc(updated);
    handleSave();
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Writing Desk</h1>
              <button
                onClick={() => signIn.email({ email: session.user.email!, password: "" })}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Account
              </button>
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
              <button
                onClick={() => {
                  // Sign out logic would go here
                  window.location.href = "/login";
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Sign out
              </button>
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
                  <div
                    key={doc.id}
                    onClick={() => {
                      setCurrentDoc(doc);
                      setEditingId(doc.id);
                    }}
                    className={`p-2 rounded-md cursor-pointer transition-colors ${
                      editingId === doc.id
                        ? "bg-indigo-50 dark:bg-indigo-900 border border-indigo-200 dark:border-indigo-700"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {doc.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {doc.status}
                    </div>
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
                  onUpdate={(content) => setCurrentDoc({ ...currentDoc, content })}
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