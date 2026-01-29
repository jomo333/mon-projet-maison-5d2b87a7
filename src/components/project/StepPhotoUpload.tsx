import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera, Upload, Loader2, Trash2, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSignedUrl } from "@/hooks/useSignedUrl";

interface StepPhotoUploadProps {
  projectId: string;
  stepId: string;
  stepTitle: string;
}

export const StepPhotoUpload = ({ projectId, stepId, stepTitle }: StepPhotoUploadProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());

  // Fetch photos for this step
  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["step-photos", projectId, stepId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_photos")
        .select("*")
        .eq("project_id", projectId)
        .eq("step_id", stepId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!user,
  });

  // Generate signed URLs for photos
  useEffect(() => {
    const generateSignedUrls = async () => {
      if (!photos.length || !user) return;
      
      const urlMap = new Map<string, string>();
      await Promise.all(
        photos.map(async (photo) => {
          const path = `${user.id}/${projectId}/${stepId}/${photo.file_url.split("/").pop()?.split("?")[0]}`;
          const signedUrl = await getSignedUrl("project-photos", path);
          if (signedUrl) {
            urlMap.set(photo.id, signedUrl);
          }
        })
      );
      setSignedUrls(urlMap);
    };
    generateSignedUrls();
  }, [photos, projectId, stepId, user]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Non authentifié");

      const fileExt = file.name.split(".").pop();
      const uniqueId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const fileName = `${uniqueId}.${fileExt}`;
      // Path format: user_id/project_id/step_id/filename
      const filePath = `${user.id}/${projectId}/${stepId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("project-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Generate signed URL instead of public URL
      const signedUrl = await getSignedUrl("project-photos", filePath);
      if (!signedUrl) throw new Error("Failed to generate signed URL");

      // Save metadata with signed URL (will be refreshed on next fetch)
      const { error: dbError } = await supabase.from("project_photos").insert({
        project_id: projectId,
        step_id: stepId,
        file_name: file.name,
        file_url: filePath, // Store path instead of full URL
        file_size: file.size,
      });

      if (dbError) throw dbError;

      return signedUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["step-photos", projectId, stepId] });
      queryClient.invalidateQueries({ queryKey: ["all-project-photos", projectId] });
      toast.success(t("toasts.photoAdded"));
    },
    onError: (error: Error) => {
      toast.error(t("toasts.photoError") + ": " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (photo: { id: string; file_url: string }) => {
      if (!user) throw new Error("Non authentifié");
      
      // file_url now stores the path directly
      let filePath = photo.file_url;
      
      // Handle legacy URLs that contain the full URL
      if (filePath.includes("/project-photos/")) {
        const urlParts = filePath.split("/project-photos/");
        if (urlParts.length > 1) {
          filePath = urlParts[1].split("?")[0];
        }
      }

      await supabase.storage.from("project-photos").remove([filePath]);

      const { error } = await supabase
        .from("project_photos")
        .delete()
        .eq("id", photo.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["step-photos", projectId, stepId] });
      queryClient.invalidateQueries({ queryKey: ["all-project-photos", projectId] });
      toast.success(t("toasts.photoDeleted"));
    },
    onError: (error: Error) => {
      toast.error(t("toasts.photoError") + ": " + error.message);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} n'est pas une image`);
          continue;
        }
        await uploadMutation.mutateAsync(file);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" />
            {t("stepPhotoUpload.title", { stepTitle })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Upload button */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("stepPhotoUpload.uploading")}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {t("stepPhotoUpload.addPhotos")}
                </>
              )}
            </Button>
          </div>

          {/* Photos grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("stepPhotoUpload.noPhotos")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {photos.map((photo) => {
                const displayUrl = signedUrls.get(photo.id) || photo.file_url;
                return (
                  <div
                    key={photo.id}
                    className="relative group aspect-square rounded-lg overflow-hidden border cursor-pointer"
                    onClick={() => setSelectedPhoto(displayUrl)}
                  >
                    <img
                      src={displayUrl}
                      alt={photo.file_name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate({ id: photo.id, file_url: photo.file_url });
                      }}
                      className="absolute top-1 right-1 p-1 bg-destructive/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3 text-destructive-foreground" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo viewer dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("stepPhotoUpload.photo")}</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <img
              src={selectedPhoto}
              alt={t("stepPhotoUpload.enlargedPhoto")}
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
