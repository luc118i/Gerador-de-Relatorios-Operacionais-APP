import { useState, useRef } from "react";
import { Upload, X, GripVertical, Image as ImageIcon } from "lucide-react";
import { Evidencia } from "../types";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

interface EvidenciasGridProps {
  evidencias: Evidencia[];
  onChange: (evidencias: Evidencia[]) => void;
}

export function EvidenciasGrid({ evidencias, onChange }: EvidenciasGridProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;

    const newEvidencias: Evidencia[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(file),
      file,
      legenda: "",
    }));

    onChange([...evidencias, ...newEvidencias]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  const removeEvidencia = (id: string) => {
    onChange(evidencias.filter((e) => e.id !== id));
  };

  const updateLegenda = (id: string, legenda: string) => {
    onChange(evidencias.map((e) => (e.id === id ? { ...e, legenda } : e)));
  };

  const moveEvidencia = (dragIndex: number, hoverIndex: number) => {
    const newEvidencias = [...evidencias];
    const [draggedItem] = newEvidencias.splice(dragIndex, 1);
    newEvidencias.splice(hoverIndex, 0, draggedItem);
    onChange(newEvidencias);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Evidências (Fotos)
          </label>
          {evidencias.length > 0 && (
            <span className="text-sm text-gray-500">
              {evidencias.length} foto{evidencias.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mb-4 ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          }`}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-1">
            Arraste fotos aqui ou clique para selecionar
          </p>
          <p className="text-xs text-gray-500">
            Upload múltiplo permitido • JPG, PNG
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileChange(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Grid de Evidências */}
        {evidencias.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-3">
              💡 As evidências serão inseridas automaticamente abaixo do texto
              do relatório
            </p>
            <div className="grid grid-cols-2 gap-3">
              {evidencias.map((evidencia, index) => (
                <EvidenciaItem
                  key={evidencia.id}
                  evidencia={evidencia}
                  index={index}
                  moveEvidencia={moveEvidencia}
                  onRemove={removeEvidencia}
                  onUpdateLegenda={updateLegenda}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}

interface EvidenciaItemProps {
  evidencia: Evidencia;
  index: number;
  moveEvidencia: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (id: string) => void;
  onUpdateLegenda: (id: string, legenda: string) => void;
}

function EvidenciaItem({
  evidencia,
  index,
  moveEvidencia,
  onRemove,
  onUpdateLegenda,
}: EvidenciaItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: "evidencia",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "evidencia",
    hover: (item: { index: number }) => {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      moveEvidencia(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`border border-gray-200 rounded-lg overflow-hidden bg-white ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="relative group">
        <img
          src={evidencia.url}
          alt={`Evidência ${index + 1}`}
          className="w-full h-40 object-cover"
        />
        <div className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded text-xs font-medium text-gray-700">
          {index + 1}
        </div>
        <button
          onClick={() => onRemove(evidencia.id)}
          className="cursor-pointer absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="absolute top-2 left-10 bg-white/90 p-1 rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-gray-600" />
        </div>
      </div>
      <div className="p-2">
        <input
          type="text"
          placeholder="Legenda (opcional)"
          value={evidencia.legenda || ""}
          onChange={(e) => onUpdateLegenda(evidencia.id, e.target.value)}
          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
