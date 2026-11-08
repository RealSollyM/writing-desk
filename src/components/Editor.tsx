"use client";

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { useState, useEffect } from 'react'

interface EditorProps {
  initialContent?: string
  onUpdate?: (content: string) => void
  readOnly?: boolean
}

export default function Editor({ initialContent = '', onUpdate, readOnly = false }: EditorProps) {
  const [isInitialized, setIsInitialized] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      Image,
    ],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(editor.getHTML())
      }
    },
    onCreate: () => {
      setIsInitialized(true)
    },
  })

  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent)
    }
  }, [initialContent, editor])

  if (!editor) {
    return null
  }

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      {/* Menu Bar */}
      <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 p-2 flex flex-wrap gap-1">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 dark:bg-gray-700 font-bold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}
          style={editor.isActive('heading', { level: 1 }) ? { fontWeight: 'bold' } : {}}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 dark:bg-gray-700 font-bold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}
          style={editor.isActive('heading', { level: 2 }) ? { fontWeight: 'bold' } : {}}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 dark:bg-gray-700 font-bold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}
          style={editor.isActive('heading', { level: 3 }) ? { fontWeight: 'bold' } : {}}
        >
          H3
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700 font-bold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}
          style={editor.isActive('bold') ? { fontWeight: 'bold' } : {}}
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700 italic' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}
          style={editor.isActive('italic') ? { fontStyle: 'italic' } : {}}
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'bg-gray-200 dark:bg-gray-700 underline' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}
          style={editor.isActive('underline') ? { textDecoration: 'underline' } : {}}
        >
          U
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={editor.isActive('code') ? 'bg-gray-200 dark:bg-gray-700 font-mono bg-gray-300 dark:bg-gray-600' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}
          style={editor.isActive('code') ? { fontFamily: 'monospace', backgroundColor: '#e5e7eb' } : {}}
        >
          {`</>`}
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}
        >
          OL
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}
        >
          UL
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'bg-gray-200 dark:bg-gray-700 italic border-l-4 border-gray-400 dark:border-gray-500 pl-2' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}
          style={editor.isActive('blockquote') ? { fontStyle: 'italic', borderLeft: '4px solid #9ca3af', paddingLeft: '8px' } : {}}
        >
          Quote
        </button>
        <button
          onClick={() => {
            const url = prompt('Enter URL:')
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
          }}
          className="hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          Link
        </button>
      </div>

      {/* Editor Content */}
      <div className="prose prose-sm max-w-none p-4 focus:outline-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}