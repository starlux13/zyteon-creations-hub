import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MEDIA_LIMITS } from "@/lib/site-config";
import { validateAndUpload, type MediaKind } from "@/lib/panel-data";

type Props = {
  kind: MediaKind;
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  hint?: string;
};

export function MediaField({ kind, label, value, onChange, hint }: Props) {
  const limits = MEDIA_LIMITS[kind];
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File) => {
    setBusy(true);
    const result = await validateAndUpload(file, kind);
    setBusy(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    onChange(result.url);
    toast.success("Archivo cargado y validado");
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="text-sm font-semibold">{label}</Label>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>
              • Formatos: <span className="font-mono">{limits.formats.join(", ")}</span>
            </li>
            <li>• Peso máximo: {(limits.maxBytes / 1024 / 1024).toFixed(0)} MB</li>
            {kind === "video" ? (
              <>
                <li>• Duración máxima: 3 minutos</li>
                <li>• Horizontal: {MEDIA_LIMITS.video.recommended.horizontal}</li>
                <li>• Vertical: {MEDIA_LIMITS.video.recommended.vertical}</li>
              </>
            ) : (
              <li>
                • Medida recomendada:{" "}
                {"recommended" in limits && typeof limits.recommended === "string"
                  ? limits.recommended
                  : ""}
              </li>
            )}
            {hint ? <li>• {hint}</li> : null}
          </ul>
        </div>
        {value ? (
          <div className="w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-background">
            {kind === "video" ? (
              <video src={value} muted playsInline className="h-20 w-full object-cover" />
            ) : (
              <img src={value} alt={label} className="h-20 w-full object-contain" />
            )}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={limits.formats.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void pick(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Subir archivo
        </Button>
        {value ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
            <Trash2 className="mr-2 h-4 w-4" /> Quitar
          </Button>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">O pega una URL directa</Label>
        <Input
          value={value ?? ""}
          placeholder="https://…"
          onChange={(e) => onChange(e.target.value || null)}
        />
      </div>
    </div>
  );
}
