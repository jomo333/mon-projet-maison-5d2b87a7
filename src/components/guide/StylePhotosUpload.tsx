import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, X, ImagePlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

interface StylePhotosUploadProps {
  projectId: string;
}

interface StylePhoto {
  id: string;
  file_url: string;
  file_name: string;
  created_at: string;
}

export function StylePhotosUpload({ projectId }: StylePhotosUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch existing style photos (stored as task_attachments with category "style")
  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["style-photos", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_attachments")
        .select("id, file_url, file_name, created_at")
        .eq("project_id", projectId)
        .eq("step_id", "planification")
        .eq("task_id", "besoins")
        .eq("category", "style")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as StylePhoto[];
    },
    enabled: !!projectId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `style-photos/${projectId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("task-attachments")
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from("task_attachments").insert({
        project_id: projectId,
        step_id: "planification",
        task_id: "besoins",
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        category: "style",
      });

      if (dbError) throw dbError;
      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["style-photos", projectId] });
      toast({
        title: "Photo ajoutée",
        description: "La photo de style a été téléversée avec succès.",
      });
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de téléverser la photo.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (photo: StylePhoto) => {
      const path = photo.file_url.split("/task-attachments/")[1];
      if (path) {
        await supabase.storage.from("task-attachments").remove([path]);
      }

      const { error } = await supabase
        .from("task_attachments")
        .delete()
        .eq("id", photo.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["style-photos", projectId] });
      toast({
        title: "Photo supprimée",
        description: "La photo a été supprimée.",
      });
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la photo.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast({
            title: "Format non supporté",
            description: "Veuillez sélectionner uniquement des images.",
            variant: "destructive",
          });
          continue;
        }
        await uploadMutation.mutateAsync(file);
      }
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="bg-primary/5 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium">
          <Camera className="h-4 w-4 text-primary" />
          <span>Photos de style / inspiration</span>
        </div>
        <label>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          <Button
            variant="outline"
            size="sm"
            asChild
            className="cursor-pointer"
            disabled={isUploading}
          >
            <span>
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4 mr-2" />
              )}
              Ajouter des photos
            </span>
          </Button>
        </label>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Téléversez des photos qui représentent le style que vous souhaitez pour votre projet. 
        Elles seront analysées par l'IA lors de l'analyse du budget.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : photos.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {photos.map((photo) => (
            <Dialog key={photo.id}>
              <DialogTrigger asChild>
                <Card className="relative group cursor-pointer overflow-hidden aspect-square">
                  <img
                    src={photo.file_url}
                    alt={photo.file_name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    onClick={() => setSelectedPhoto(photo.file_url)}
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(photo);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <img
                  src={photo.file_url}
                  alt={photo.file_name}
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                />
              </DialogContent>
            </Dialog>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Aucune photo de style ajoutée
        </div>
      )}
    </div>
  );
}
