import { useState, useRef } from "react";
import { Upload, X, GripVertical, Image as ImageIcon, AlertCircle } from "lucide-react";
import { Evidencia } from "../types";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const MAX_EVIDENCIAS = 30;

interface EvidenciasGridProps {
  evidencias: Evidencia[];
  onChange: (evidencias: Evidencia[]) => void;
}

export function EvidenciasGrid({ evidencias, onChange }: EvidenciasGridProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;

    const slots = MAX_EVIDENCIAS - evidencias.length;
    if (slots <= 0) return;

    const selected = Array.from(files).slice(0, slots);
    const blocked = files.length - selected.length;

    const newEvidencias: Evidencia[] = selected.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(file),
      file,
      legenda: "",
      linkTexto: "",
      linkUrl: "",
    }));

    onChange([...evidencias, ...newEvidencias]);

    if (blocked > 0) {
      alert(`Limite de ${MAX_EVIDENCIAS} fotos atingido. ${blocked} foto${blocked !== 1 ? "s" : ""} não ${blocked !== 1 ? "foram adicionadas" : "foi adicionada"}.`);
    }
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

  const updateLinkTexto = (id: string, linkTexto: string) => {
    onChange(evidencias.map((e) => (e.id === id ? { ...e, linkTexto } : e)));
  };

  const updateLinkUrl = (id: string, linkUrl: string) => {
    onChange(evidencias.map((e) => (e.id === id ? { ...e, linkUrl } : e)));
  };

  const atLimit = evidencias.length >= MAX_EVIDENCIAS;
  const nearLimit = evidencias.length >= MAX_EVIDENCIAS - 5;

  return (
    <DndProvider backend={HTML5Backend}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Evidências (Fotos)
          </label>
          {evidencias.length > 0 && (
            <span className={`text-sm font-medium ${atLimit ? "text-red-600" : nearLimit ? "text-amber-600" : "text-gray-500"}`}>
              {evidencias.length}/{MAX_EVIDENCIAS} foto{evidencias.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Upload Area */}
        <div
          onDragOver={!atLimit ? handleDragOver : undefined}
          onDragLeave={!atLimit ? handleDragLeave : undefined}
          onDrop={!atLimit ? handleDrop : undefined}
          onClick={!atLimit ? () => fileInputRef.current?.click() : undefined}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-4 ${
            atLimit
              ? "border-red-200 bg-red-50 cursor-not-allowed"
              : isDragging
              ? "border-blue-500 bg-blue-50 cursor-pointer"
              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50 cursor-pointer"
          }`}
        >
          {atLimit ? (
            <>
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-red-600 mb-1">
                Limite de {MAX_EVIDENCIAS} fotos atingido
              </p>
              <p className="text-xs text-red-400">
                Remova fotos para adicionar novas
              </p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-1">
                Arraste fotos aqui ou clique para selecionar
              </p>
              <p className="text-xs text-gray-500">
                Upload múltiplo permitido • JPG, PNG • máx. {MAX_EVIDENCIAS} fotos
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileChange(e.target.files)}
            className="hidden"
            disabled={atLimit}
          />
        </div>

        {/* Aviso próximo do limite */}
        {nearLimit && !atLimit && (
          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Você está próximo do limite — restam {MAX_EVIDENCIAS - evidencias.length} foto{MAX_EVIDENCIAS - evidencias.length !== 1 ? "s" : ""}.</span>
          </div>
        )}

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
                  onUpdateLinkTexto={updateLinkTexto}
                  onUpdateLinkUrl={updateLinkUrl}
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
  onUpdateLinkTexto: (id: string, texto: string) => void;
  onUpdateLinkUrl: (id: string, url: string) => void;
}

function EvidenciaItem({
  evidencia,
  index,
  moveEvidencia,
  onRemove,
  onUpdateLegenda,
  onUpdateLinkTexto,
  onUpdateLinkUrl,
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
      <div className="p-2 space-y-2">
        <input
          type="text"
          placeholder="Legenda (opcional)"
          value={evidencia.legenda || ""}
          onChange={(e) => onUpdateLegenda(evidencia.id, e.target.value)}
          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <div className="space-y-1">
          <input
            type="text"
            placeholder="Texto do link (opcional)"
            value={evidencia.linkTexto || ""}
            onChange={(e) => onUpdateLinkTexto(evidencia.id, e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          <input
            type="text"
            placeholder="URL do link (https://...)"
            value={evidencia.linkUrl || ""}
            onChange={(e) => onUpdateLinkUrl(evidencia.id, e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
