import React, { useState } from 'react';
import { StoredFile, Order } from '../types';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileCode,
  Download,
  Trash2,
  Eye,
  Check,
  RefreshCw,
  X,
} from 'lucide-react';

interface FilesViewProps {
  orders: Order[];
  onImportOrders: (importedOrders: Order[]) => void;
}

export const FilesView: React.FC<FilesViewProps> = ({ orders, onImportOrders }) => {
  // Lista de archivos en el dispositivo
  const [localFiles, setLocalFiles] = useState<StoredFile[]>([
    {
      id: 'f-1',
      name: 'politica_garantias.pdf',
      size: 142000,
      type: 'application/pdf',
      createdAt: '2026-11-12T10:00:00.000Z',
    },
    {
      id: 'f-2',
      name: 'banner_coleccion_otoño.jpg',
      size: 384000,
      type: 'image/jpeg',
      createdAt: '2026-11-11T14:20:00.000Z',
    },
  ]);

  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<StoredFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Muestras para descarga (conforme a FilesView.swift)
  const samples = [
    {
      title: 'Proyecto Xcode (.zip para Mac/Simulador)',
      name: 'Mercadito.xcodeproj.zip',
      type: 'application/zip',
      directUrl: '/assets/aistudio/Mercadito_487a530b.zip',
    },
    { title: 'Catálogo de Productos PDF', name: 'catalogo_mercadito.pdf', type: 'application/pdf' },
    { title: 'Banner Editorial JPG', name: 'banner_editorial.jpg', type: 'image/jpeg' },
    { title: 'Dataset Productos JSON', name: 'productos_curados.json', type: 'application/json' },
  ];

  const handleDownloadSample = (sample: (typeof samples)[0]) => {
    if ('directUrl' in sample && sample.directUrl) {
      const a = document.createElement('a');
      a.href = sample.directUrl;
      a.download = sample.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStatusMessage(`Descargando ${sample.name} directamente...`);
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    setDownloadProgress(0.1);
    setStatusMessage(`Descargando ${sample.name}...`);

    let progress = 0.1;
    const interval = setInterval(() => {
      progress += 0.25;
      if (progress >= 1) {
        clearInterval(interval);
        setDownloadProgress(null);
        setStatusMessage(`Descarga completada: ${sample.name}`);

        const newFile: StoredFile = {
          id: `file-${Date.now()}`,
          name: sample.name,
          size: Math.floor(Math.random() * 250000) + 50000,
          type: sample.type,
          createdAt: new Date().toISOString(),
        };
        setLocalFiles((prev) => [newFile, ...prev]);

        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setDownloadProgress(progress);
      }
    }, 250);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatusMessage(`Subiendo ${file.name}...`);

    setTimeout(() => {
      const newFile: StoredFile = {
        id: `upload-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        createdAt: new Date().toISOString(),
      };

      setLocalFiles((prev) => [newFile, ...prev]);
      setIsUploading(false);
      setStatusMessage(`Archivo "${file.name}" cargado exitosamente.`);
      setTimeout(() => setStatusMessage(null), 3000);
    }, 700);
  };

  const handleExportOrders = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(orders, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `pedidos_mercadito_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setStatusMessage('Pedidos exportados a JSON');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleImportOrdersFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportOrders(parsed);
          setStatusMessage(`Se importaron ${parsed.length} pedidos correctamente.`);
        } else {
          setStatusMessage('El archivo JSON no tiene el formato de pedidos válido.');
        }
      } catch {
        setStatusMessage('Error al interpretar el archivo JSON.');
      }
      setTimeout(() => setStatusMessage(null), 3500);
    };
    reader.readAsText(file);
  };

  const handleDeleteFile = (id: string) => {
    setLocalFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon className="w-4 h-4 text-stone-500" />;
    if (type.includes('json') || type.includes('javascript'))
      return <FileCode className="w-4 h-4 text-stone-500" />;
    return <FileText className="w-4 h-4 text-stone-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <p className="text-xs uppercase tracking-widest text-stone-500 font-medium">
          Módulo de Transferencia de Datos
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          Archivos y Documentos
        </h2>
        <p className="text-xs text-stone-500 max-w-md mx-auto">
          Gestiona comprobantes, exporta registros de compras y descarga catálogos con sincronización multipart.
        </p>
      </div>

      {statusMessage && (
        <div className="p-3 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-md text-xs text-stone-700 dark:text-stone-300 flex items-center justify-between animate-fade-in">
          <span>{statusMessage}</span>
          <Check className="w-3.5 h-3.5 text-stone-500" />
        </div>
      )}

      {/* Grid: Subir & Descargar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subir */}
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-stone-500" />
            <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
              Subir al servidor
            </h3>
          </div>

          <div className="space-y-2">
            <label className="block w-full text-center py-2.5 px-3 border border-stone-200 dark:border-stone-700 rounded-md text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer">
              <span>Subir comprobante o foto (JPG/PNG/PDF)</span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={handleExportOrders}
              className="w-full text-left py-2 px-3 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-md transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>Exportar pedidos actuales (JSON)</span>
              <Download className="w-3.5 h-3.5 text-stone-400" />
            </button>

            <label className="block w-full py-2 px-3 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-md transition-colors flex items-center justify-between cursor-pointer">
              <span>Importar historial desde archivo JSON</span>
              <UploadCloud className="w-3.5 h-3.5 text-stone-400" />
              <input
                type="file"
                accept=".json"
                onChange={handleImportOrdersFile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Descargar muestras */}
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-stone-500" />
            <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
              Descargas y Recursos
            </h3>
          </div>

          <div className="space-y-2">
            {samples.map((sample) => (
              <button
                key={sample.name}
                onClick={() => handleDownloadSample(sample)}
                disabled={downloadProgress !== null}
                className="w-full text-left py-2 px-3 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-md transition-colors flex items-center justify-between cursor-pointer disabled:opacity-50"
              >
                <span>{sample.title}</span>
                <span className="font-mono text-[10px] text-stone-400">{sample.name}</span>
              </button>
            ))}

            {downloadProgress !== null && (
              <div className="pt-2 space-y-1">
                <div className="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-stone-900 dark:bg-stone-100 h-full transition-all duration-200"
                    style={{ width: `${downloadProgress * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-stone-400">
                  <span>Descargando...</span>
                  <span>{Math.round(downloadProgress * 100)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* En el dispositivo */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
        <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
          Archivos en este dispositivo ({localFiles.length})
        </h3>

        {localFiles.length === 0 ? (
          <p className="text-xs text-stone-500 py-4 text-center">
            No hay archivos guardados localmente.
          </p>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {localFiles.map((file) => (
              <div key={file.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {getFileIcon(file.type)}
                  <div>
                    <h4 className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate max-w-xs sm:max-w-md">
                      {file.name}
                    </h4>
                    <p className="text-[10px] text-stone-400">
                      {formatFileSize(file.size)} · {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="p-1.5 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                    aria-label={`Vista previa de ${file.name}`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="p-1.5 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                    aria-label={`Eliminar ${file.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QuickLook / Preview Modal */}
      {previewFile && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-stone-950/80 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-stone-200 dark:border-stone-800">
              <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                {previewFile.name}
              </h4>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-8 bg-stone-50 dark:bg-stone-950 rounded-lg text-center flex flex-col items-center justify-center space-y-2">
              {getFileIcon(previewFile.type)}
              <span className="text-xs font-mono text-stone-600 dark:text-stone-300">
                {previewFile.name}
              </span>
              <span className="text-[11px] text-stone-400">
                Tamaño: {formatFileSize(previewFile.size)}
              </span>
              <p className="text-[11px] text-stone-500 pt-2">
                Documento verificado y almacenado en el sandbox seguro.
              </p>
            </div>

            <button
              onClick={() => setPreviewFile(null)}
              className="w-full py-2 text-xs font-medium bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 rounded-md cursor-pointer"
            >
              Cerrar visor
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
