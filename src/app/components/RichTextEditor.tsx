import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Bold, Italic, Underline as UnderlineIcon, List } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Paleta de cores operacionais
const COLOR_PALETTE = [
  { color: "#111111", label: "Preto" },
  { color: "#374151", label: "Cinza escuro" },
  { color: "#6B7280", label: "Cinza" },
  { color: "#DC2626", label: "Vermelho" },
  { color: "#EA580C", label: "Laranja" },
  { color: "#D97706", label: "Âmbar" },
  { color: "#16A34A", label: "Verde" },
  { color: "#2563EB", label: "Azul" },
  { color: "#7C3AED", label: "Roxo" },
  { color: "#DB2777", label: "Rosa" },
];

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  disabled?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Digite aqui...",
  minHeight = "120px",
  disabled = false,
}: RichTextEditorProps) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [StarterKit, Underline, TextStyle, Color],
    content: value || "",
    editable: !disabled,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  // Sincroniza value externo quando a prop muda
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || "";
    if (current !== incoming) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Fecha o color picker ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(e.target as Node)
      ) {
        setColorPickerOpen(false);
      }
    }
    if (colorPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [colorPickerOpen]);

  if (!editor) return null;

  // Cor ativa no cursor
  const activeColor = editor.getAttributes("textStyle").color as string | undefined;

  function ToolbarBtn({
    active,
    onClick,
    title,
    children,
  }: {
    active?: boolean;
    onClick: () => void;
    title: string;
    children: React.ReactNode;
  }) {
    return (
      <button
        type="button"
        title={title}
        onMouseDown={(e) => {
          e.preventDefault();
          onClick();
        }}
        className={`p-1.5 rounded transition-colors ${
          active
            ? "bg-gray-200 text-gray-900"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
        }`}
      >
        {children}
      </button>
    );
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-visible focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50 rounded-t-lg flex-wrap">
        <ToolbarBtn
          title="Negrito (Ctrl+B)"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Itálico (Ctrl+I)"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Sublinhado (Ctrl+U)"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-gray-300 mx-1" />

        <ToolbarBtn
          title="Lista"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="w-4 h-4" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-gray-300 mx-1" />

        {/* Seletor de cor de texto */}
        <div className="relative" ref={colorPickerRef}>
          <button
            type="button"
            title="Cor do texto"
            onMouseDown={(e) => {
              e.preventDefault();
              setColorPickerOpen((prev) => !prev);
            }}
            className="flex flex-col items-center p-1.5 rounded transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            {/* Ícone "A" com barra de cor embaixo */}
            <span className="text-xs font-bold leading-none" style={{ color: activeColor || "#111111" }}>
              A
            </span>
            <span
              className="block w-4 h-1 rounded-sm mt-0.5"
              style={{ backgroundColor: activeColor || "#111111" }}
            />
          </button>

          {colorPickerOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-[152px]">
              <p className="text-[10px] text-gray-400 mb-1.5 font-medium uppercase tracking-wide">
                Cor do texto
              </p>
              <div className="grid grid-cols-5 gap-1">
                {COLOR_PALETTE.map(({ color, label }) => (
                  <button
                    key={color}
                    type="button"
                    title={label}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      editor.chain().focus().setColor(color).run();
                      setColorPickerOpen(false);
                    }}
                    className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${
                      activeColor === color
                        ? "border-blue-500 scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              {/* Remover cor (volta ao padrão) */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().unsetColor().run();
                  setColorPickerOpen(false);
                }}
                className="mt-2 w-full text-[10px] text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded px-1 py-0.5 transition-colors text-center"
              >
                Remover cor
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div className="relative">
        <EditorContent
          editor={editor}
          style={{ minHeight }}
          className="px-3 py-2 text-sm text-gray-900 [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[inherit] [&_.ProseMirror_p]:my-0.5 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:my-1"
        />

        {/* Placeholder */}
        {editor.isEmpty && (
          <div className="absolute top-2 left-3 pointer-events-none text-sm text-gray-400">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
