"use client";

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { useState, useEffect, useCallback } from 'react'

interface EditorProps {
  /** The initial HTML content to load into the editor */
  initialContent?: string
  /** Callback fired when content changes, receives the new HTML */
  onUpdate?: (content: string) => void
  /** If true, the editor is read-only (no toolbar controls active) */
  readOnly?: boolean
}

/**
 * A Tiptap-based WYSIWYG editor component with a toolbar for formatting.
 * Supports headings (H1-H3), bold, italic, underline, code, lists, blockquotes, and links.
 */
export default function Editor({ initialContent = '', onUpdate, readOnly = false }: EditorProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [activeFormatting, setActiveFormatting] = useState({
    h1: false, h2: false, h3: false,
    bold: false, italic: false, underline: false, code: false,
    orderedList: false, bulletList: false, blockquote: false,
  })

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      Image,
    ],
    content: initialContent,
    editable: !readOnly,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(editor.getHTML())
      }
      // Track active formatting states - refresh toolbar on transactions
      setActiveFormatting({
        h1: editor.isActive('heading', { level: 1 }),
        h2: editor.isActive('heading', { level: 2 }),
        h3: editor.isActive('heading', { level: 3 }),
        bold: editor.isActive('bold'),
        italic: editor.isActive('italic'),
        underline: editor.isActive('underline'),
        code: editor.isActive('code'),
        orderedList: editor.isActive('orderedList'),
        bulletList: editor.isActive('bulletList'),
        blockquote: editor.isActive('blockquote'),
      })
    },
    onCreate: () => {
      setIsInitialized(true)
    },
  })

  // Reset undo history when document changes to prevent restoring previous document content
  useEffect(() => {
    // When document changes to a new one, set content to prevent undo from restoring previous document's content
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent)
    }
  }, [initialContent, editor])

  if (!editor) {
    return null
  }

  // Helper to execute a command
  const executeCommand = useCallback((command: () => void) => {
    if (!readOnly) {
      editor.chain().focus().run()
      command()
    }
  }, [editor, readOnly])

  // Helper to render toolbar buttons with consistent styling
  const renderToolbarButton = (
    onClick: () => void,
    children: React.ReactNode,
    isActive: boolean,
    disabled = false,
    ariaLabel: string,
    title: string,
    className = ''
  ) => (
    <button
      onClick={onClick}
      disabled={disabled || readOnly}
      className={`${isActive || disabled || readOnly
        ? 'bg-gray-200 dark:bg-gray-700'
        : 'hover:bg-gray-200 dark:hover:bg-gray-700'} ${className}`}
      aria-pressed={isActive}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </button>
  )

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      {/* Menu Bar */}
      <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 p-2 flex flex-wrap gap-1">
        {renderToolbarButton(
          () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
          'H1',
          activeFormatting.h1,
          readOnly,
          'Toggle H1 heading',
          'H1',
          'font-bold'
        )}
        {renderToolbarButton(
          () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          'H2',
          activeFormatting.h2,
          readOnly,
          'Toggle H2 heading',
          'H2',
          'font-bold'
        )}
        {renderToolbarButton(
          () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          'H3',
          activeFormatting.h3,
          readOnly,
          'Toggle H3 heading',
          'H3',
          'font-bold'
        )}
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
        {renderToolbarButton(
          () => editor.chain().focus().toggleBold().run(),
          'B',
          activeFormatting.bold,
          readOnly,
          'Toggle bold',
          'Bold',
          'font-bold'
        )}
        {renderToolbarButton(
          () => editor.chain().focus().toggleItalic().run(),
          'I',
          activeFormatting.italic,
          readOnly,
          'Toggle italic',
          'Italic',
          'italic'
        )}
        {renderToolbarButton(
          () => editor.chain().focus().toggleUnderline().run(),
          'U',
          activeFormatting.underline,
          readOnly,
          'Toggle underline',
          'Underline',
          'underline'
        )}
        {renderToolbarButton(
          () => editor.chain().focus().toggleCode().run(),
          '</>',
          activeFormatting.code,
          readOnly,
          'Toggle inline code formatting',
          'Inline code',
          'font-mono text-sm'
        )}
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
        {renderToolbarButton(
          () => editor.chain().focus().toggleOrderedList().run(),
          'OL',
          activeFormatting.orderedList,
          readOnly,
          'Toggle ordered list',
          'Ordered list'
        )}
        {renderToolbarButton(
          () => editor.chain().focus().toggleBulletList().run(),
          'UL',
          activeFormatting.bulletList,
          readOnly,
          'Toggle bullet list',
          'Bullet list'
        )}
        {renderToolbarButton(
          () => editor.chain().focus().toggleBlockquote().run(),
          'Quote',
          activeFormatting.blockquote,
          readOnly,
          'Toggle blockquote',
          'Blockquote',
          'italic border-l-2 border-indigo-500 dark:border-indigo-400 pl-1.5'
        )}
        {renderToolbarButton(
          () => {
            const url = prompt('Enter URL:')
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
          },
          'Link',
          false,
          readOnly,
          'Insert link',
          'Link'
        )}
      </div>

      {/* Editor Content - with visible typography styles */}
      <div className="prose prose-sm dark:prose-invert max-w-none p-4 focus:outline-none min-h-[200px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}