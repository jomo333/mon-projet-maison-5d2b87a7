import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Paperclip, X, FileText, Image, File, Loader2, DollarSign, ArrowRight } from "lucide-react";
import { FileOrPhotoUpload } from "@/components/ui/file-or-photo-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getSignedUrl } from "@/hooks/useSignedUrl";

interface TaskAttachmentsProps {
  stepId: string;
  taskId: string;
  projectId?: string;
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return Image;
  if (fileType.includes("pdf")) return FileText;
  return File;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function TaskAttachments({ stepId, taskId, projectId }: TaskAttachmentsProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState("other");
  const [isUploading, setIsUploading] = useState(false);
  const [showBudgetSuggestion, setShowBudgetSuggestion] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  const categories = [
    { value: "plan", label: t("gallery.documentCategories.plan"), color: "bg-blue-500" },
    { value: "permis", label: t("gallery.documentCategories.permit"), color: "bg-green-500" },
    { value: "devis", label: t("gallery.documentCategories.devis"), color: "bg-orange-500" },
    { value: "soumission", label: t("gallery.documentCategories.soumission"), color: "bg-amber-500" },
    { value: "contract", label: t("gallery.documentCategories.contract"), color: "bg-purple-500" },
    { value: "facture", label: t("gallery.documentCategories.facture"), color: "bg-red-500" },
    { value: "photo", label: t("gallery.documentCategories.photo"), color: "bg-cyan-500" },
    { value: "other", label: t("gallery.documentCategories.other"), color: "bg-gray-500" },
  ];

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["task-attachments", stepId, taskId, projectId ?? null],
    queryFn: async () => {
      let query = supabase
        .from("task_attachments")
        .select("*")
        .eq("step_id", stepId)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      // If we know which project we're in, scope attachments to that project
      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  // Generate signed URLs for attachments
  useEffect(() => {
    const generateSignedUrls = async () => {
      if (!attachments.length || !user) return;
      
      const urlMap = new Map<string, string>();
      await Promise.all(
        attachments.map(async (att) => {
          // Extract path from file_url
          const bucketMarker = "/task-attachments/";
          const markerIndex = att.file_url.indexOf(bucketMarker);
          if (markerIndex >= 0) {
            const path = att.file_url.slice(markerIndex + bucketMarker.length).split("?")[0];
            const signedUrl = await getSignedUrl("task-attachments", path);
            if (signedUrl) {
              urlMap.set(att.id, signedUrl);
            }
          }
        })
      );
      setSignedUrls(urlMap);
    };
    generateSignedUrls();
  }, [attachments, user]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error(t("auth.notAuthenticated"));
      
      const fileExt = file.name.split(".").pop();
      const uniqueId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      // Path format: user_id/step_id/task_id/filename (user_id first for RLS)
      const fileName = `${user.id}/${stepId}/${taskId}/${uniqueId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Generate signed URL
      const signedUrl = await getSignedUrl("task-attachments", fileName);
      if (!signedUrl) throw new Error("Failed to generate signed URL");

      const insertData: {
        step_id: string;
        task_id: string;
        file_name: string;
        file_url: string;
        file_type: string;
        file_size: number;
        category: string;
        project_id?: string;
      } = {
        step_id: stepId,
        task_id: taskId,
        file_name: file.name,
        file_url: signedUrl, // Store signed URL temporarily
        file_type: file.type,
        file_size: file.size,
        category: selectedCategory,
      };

      if (projectId) {
        insertData.project_id = projectId;
      }

      const { error: dbError } = await supabase.from("task_attachments").insert(insertData);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-attachments", stepId, taskId, projectId ?? null] });
      toast.success(t("attachments.uploadSuccess"));
      
      // Show budget suggestion after any file upload
      setShowBudgetSuggestion(true);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error(t("attachments.uploadError"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachment: { id: string; file_url: string }) => {
      const path = attachment.file_url.split("/task-attachments/")[1];
      
      if (path) {
        await supabase.storage.from("task-attachments").remove([path]);
      }

      const { error } = await supabase
        .from("task_attachments")
        .delete()
        .eq("id", attachment.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-attachments", stepId, taskId, projectId ?? null] });
      toast.success(t("attachments.deleteSuccess"));
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error(t("attachments.deleteError"));
    },
  });

  const handleFilesSelected = async (files: FileList) => {
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadMutation.mutateAsync(file);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const getCategoryInfo = (value: string) => {
    return categories.find((c) => c.value === value) || categories[categories.length - 1];
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Paperclip className="h-4 w-4" />
        <span>{t("attachments.title")}</span>
        {attachments.length > 0 && (
          <Badge variant="secondary" className="ml-1">
            {attachments.length}
          </Badge>
        )}
      </div>

      {/* Upload section */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("attachments.category")} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                  {cat.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <FileOrPhotoUpload
          onFilesSelected={handleFilesSelected}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.heic"
          uploading={isUploading}
          fileLabel={t("attachments.addFile")}
          photoLabel="Photo"
          multiple
        />
      </div>

      {/* Attachments list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("common.loading")}
        </div>
      ) : attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.file_type);
            const categoryInfo = getCategoryInfo(attachment.category);

            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
              >
                <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <a
                    href={signedUrls.get(attachment.id) || attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline truncate block"
                  >
                    {attachment.file_name}
                  </a>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge 
                      variant="secondary" 
                      className={`text-white ${categoryInfo.color}`}
                    >
                      {categoryInfo.label}
                    </Badge>
                    {attachment.file_size && (
                      <span>{formatFileSize(attachment.file_size)}</span>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteMutation.mutate({ id: attachment.id, file_url: attachment.file_url })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          {t("attachments.noAttachments")}
        </p>
      )}

      {/* Budget suggestion after file upload */}
      {showBudgetSuggestion && (
        <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-green-800 dark:text-green-200">
                {t("attachments.budgetSuggestion.title")}
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                {t("attachments.budgetSuggestion.description")}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Button 
                  size="sm" 
                  onClick={() => navigate(projectId ? `/budget?project=${projectId}&autoAnalyze=1` : "/budget?autoAnalyze=1")}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  {t("attachments.budgetSuggestion.cta")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowBudgetSuggestion(false)}
                  className="text-green-700 dark:text-green-300"
                >
                  {t("attachments.budgetSuggestion.later")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
