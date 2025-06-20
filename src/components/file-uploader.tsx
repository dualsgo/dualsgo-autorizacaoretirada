"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, Trash2, FileText } from 'lucide-react';

interface FileUploaderProps {
  id: string;
  label: string;
  onFileChange: (file: File | null) => void;
  accept: string;
  fileError?: string;
  description?: string;
}

export function FileUploader({ id, label, onFileChange, accept, fileError, description }: FileUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onFileChange(file);
    if (file) {
      setFileName(file.name);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null); // Not an image, no preview
      }
    } else {
      setFileName(null);
      setPreviewUrl(null);
    }
  }, [onFileChange]);

  const handleRemoveFile = useCallback(() => {
    onFileChange(null);
    setPreviewUrl(null);
    setFileName(null);
    if (inputRef.current) {
      inputRef.current.value = ''; // Reset the input field
    }
  }, [onFileChange]);

  useEffect(() => {
    // Clean up object URL
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="font-medium">{label}</Label>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <Card className="border-2 border-dashed border-muted-foreground/50 hover:border-primary transition-colors">
        <CardContent className="p-4 text-center">
          {!previewUrl && !fileName && (
            <div
              className="flex flex-col items-center justify-center space-y-2 cursor-pointer"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();}}
              role="button"
              tabIndex={0}
              aria-label={`Fazer upload de ${label}`}
            >
              <UploadCloud className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Arraste e solte ou clique para fazer upload
              </p>
              <p className="text-xs text-muted-foreground">
                {accept.split(',').map(type => type.split('/')[1].toUpperCase()).join(', ')} (Max 5MB)
              </p>
            </div>
          )}
          <Input
            id={id}
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            aria-describedby={fileError ? `${id}-error` : undefined}
          />
          {previewUrl && (
            <div className="mt-2 space-y-2">
              <Image
                src={previewUrl}
                alt="Pré-visualização do documento"
                width={200}
                height={120}
                className="mx-auto rounded-md object-contain max-h-48"
                data-ai-hint="document preview"
              />
              <p className="text-sm text-muted-foreground truncate">{fileName}</p>
              <Button variant="outline" size="sm" onClick={handleRemoveFile} aria-label="Remover arquivo">
                <Trash2 className="mr-2 h-4 w-4" />
                Remover
              </Button>
            </div>
          )}
          {!previewUrl && fileName && ( // For non-image files like PDF
             <div className="mt-2 space-y-2 flex flex-col items-center">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground truncate">{fileName}</p>
              <Button variant="outline" size="sm" onClick={handleRemoveFile} aria-label="Remover arquivo">
                <Trash2 className="mr-2 h-4 w-4" />
                Remover
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {fileError && <p id={`${id}-error`} className="text-sm text-destructive">{fileError}</p>}
    </div>
  );
}
