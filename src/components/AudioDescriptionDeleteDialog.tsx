import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface AudioDescriptionDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (deleteTranslations: boolean) => void;
  descriptionCount: number;
  hasTranslations: boolean;
}

export const AudioDescriptionDeleteDialog: React.FC<AudioDescriptionDeleteDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  descriptionCount,
  hasTranslations
}) => {
  const [deleteTranslations, setDeleteTranslations] = useState(false);

  const handleConfirm = () => {
    onConfirm(deleteTranslations);
    setDeleteTranslations(false); // Reset for next time
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white border shadow-soft">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-2xl font-light text-foreground">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Delete Audio Description{descriptionCount > 1 ? 's' : ''}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 font-light text-muted-foreground">
            <p>
              Are you sure you want to delete {descriptionCount} audio description{descriptionCount > 1 ? 's' : ''}?
            </p>
            
            {hasTranslations && (
              <div className="bg-accent/50 border rounded-lg p-3 space-y-2">
                <p className="text-sm font-light text-foreground">
                  This description has translations in other languages.
                </p>
                <div className="flex items-start gap-2">
                  <Checkbox 
                    id="delete-translations" 
                    checked={deleteTranslations}
                    onCheckedChange={(checked) => setDeleteTranslations(checked === true)}
                  />
                  <Label 
                    htmlFor="delete-translations" 
                    className="text-sm font-light cursor-pointer leading-tight"
                  >
                    Also delete all translations of this description
                  </Label>
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full font-light">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full font-light"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
