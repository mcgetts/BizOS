import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Paperclip, Upload, Download, Trash2, FileText, Image, File } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "./ui/use-toast";

interface FileAttachment {
  id: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  description?: string;
  isPublic: boolean;
  uploadedAt: string;
  communicationId?: string;
  uploader: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface FileAttachmentProps {
  opportunityId: string;
  communicationId?: string;
  showUploadButton?: boolean;
}

export function FileAttachment({ opportunityId, communicationId, showUploadButton = true }: FileAttachmentProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch attachments
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["attachments", opportunityId],
    queryFn: async (): Promise<FileAttachment[]> => {
      const response = await fetch(`/api/opportunities/${opportunityId}/attachments`);
      if (!response.ok) throw new Error("Failed to fetch attachments");
      return response.json();
    },
  });

  // Filter attachments by communication if provided
  const filteredAttachments = communicationId
    ? attachments.filter(att => att.communicationId === communicationId)
    : attachments.filter(att => !att.communicationId); // Show general attachments when no communicationId

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/opportunities/${opportunityId}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to upload file");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", opportunityId] });
      setIsUploadOpen(false);
      setSelectedFile(null);
      setDescription("");
      setIsPublic(false);
      toast({ title: "File uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to upload file", variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const response = await fetch(`/api/opportunities/${opportunityId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete file");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", opportunityId] });
      toast({ title: "File deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete file", variant: "destructive" });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("description", description);
    formData.append("isPublic", isPublic.toString());
    if (communicationId) {
      formData.append("communicationId", communicationId);
    }

    uploadMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (mimeType.includes("pdf") || mimeType.includes("document")) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const handleDownload = (attachmentId: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = `/api/opportunities/${opportunityId}/attachments/${attachmentId}/download`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading attachments...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      {showUploadButton && (
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Paperclip className="h-4 w-4" />
              Attach File
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload File</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Select File</Label>
                <Input
                  id="file"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.csv,.xlsx,.zip,.pptx"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the file..."
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
                <Label htmlFor="public">Share with client</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadMutation.isPending}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {uploadMutation.isPending ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Attachments List */}
      {filteredAttachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            {communicationId ? "Communication Files" : "Attachments"} ({filteredAttachments.length})
          </h4>
          {filteredAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-muted/20"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {getFileIcon(attachment.mimeType)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium truncate">{attachment.originalFileName}</p>
                    {attachment.isPublic && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        Shared
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(attachment.fileSize)}</span>
                    <span>•</span>
                    <span>{attachment.uploader.firstName} {attachment.uploader.lastName}</span>
                    <span>•</span>
                    <span>{new Date(attachment.uploadedAt).toLocaleDateString()}</span>
                  </div>
                  {attachment.description && (
                    <p className="text-xs text-muted-foreground mt-1">{attachment.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(attachment.id, attachment.originalFileName)}
                  className="gap-1"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(attachment.id)}
                  disabled={deleteMutation.isPending}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredAttachments.length === 0 && !showUploadButton && (
        <p className="text-sm text-muted-foreground">No files attached</p>
      )}
    </div>
  );
}