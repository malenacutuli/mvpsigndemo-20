import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Lock, Unlock, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ManualSegmentEditorProps {
  segment: any;
  onSave: (updatedSegment: any) => void;
  onCancel: () => void;
}

export const ManualSegmentEditor: React.FC<ManualSegmentEditorProps> = ({
  segment,
  onSave,
  onCancel
}) => {
  const [editedSegment, setEditedSegment] = useState(segment);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      console.log('[ManualEdit] Saving segment', editedSegment.id);
      
      // Prepare edit history entry
      const newEdit = {
        edited_at: new Date().toISOString(),
        edited_by: 'human',
        fields: ['text', 'timing', 'intensity'],
        previous_text: segment.text,
        new_text: editedSegment.text
      };
      
      // Append to existing edit history
      const updatedHistory = [...(segment.edit_history || []), newEdit];
      
      // Update in database
      const { data, error } = await supabase
        .from('transcript_segments_clean')
        .update({
          text: editedSegment.text,
          start_ms: editedSegment.start_ms,
          end_ms: editedSegment.end_ms,
          overall_intensity: editedSegment.overall_intensity,
          overall_pitch: editedSegment.overall_pitch,
          
          // ✅ Mark as manually edited
          is_manually_edited: true,
          last_edited_by: 'human',
          last_edited_at: new Date().toISOString(),
          locked_by_user: editedSegment.locked_by_user || false,
          edit_history: updatedHistory
        })
        .eq('id', editedSegment.id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('[ManualEdit] Saved successfully', data);
      
      toast({
        title: "Saved",
        description: "Manual edit saved and protected from AI"
      });
      
      onSave(data);
      
    } catch (error) {
      console.error('[ManualEdit] Save failed', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : 'Failed to save',
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const adjustTime = (field: 'start' | 'end', delta: number) => {
    const newValue = editedSegment[`${field}_ms`] + delta;
    if (field === 'start' && newValue < editedSegment.end_ms) {
      setEditedSegment({ ...editedSegment, start_ms: newValue });
    } else if (field === 'end' && newValue > editedSegment.start_ms) {
      setEditedSegment({ ...editedSegment, end_ms: newValue });
    }
  };

  const formatTime = (ms: number) => {
    const seconds = ms / 1000;
    const minutes = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${minutes}:${secs.padStart(6, '0')}`;
  };

  return (
    <Card className="border-2 border-primary">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Manual Edit Segment #{segment.idx + 1}</span>
          <Badge variant={segment.is_manually_edited ? "default" : "secondary"}>
            {segment.is_manually_edited ? "Manually Edited" : "AI Generated"}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Text Edit */}
        <div>
          <Label>Text Content</Label>
          <Input
            value={editedSegment.text}
            onChange={(e) => setEditedSegment({ 
              ...editedSegment, 
              text: e.target.value 
            })}
            className="font-mono"
          />
        </div>
        
        <Separator />
        
        {/* Timing Controls */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Start Time</Label>
            <div className="text-sm text-muted-foreground mb-2">
              {formatTime(editedSegment.start_ms)}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => adjustTime('start', -5000)}>-5s</Button>
              <Button size="sm" variant="outline" onClick={() => adjustTime('start', -1000)}>-1s</Button>
              <Button size="sm" variant="outline" onClick={() => adjustTime('start', 1000)}>+1s</Button>
              <Button size="sm" variant="outline" onClick={() => adjustTime('start', 5000)}>+5s</Button>
            </div>
          </div>
          
          <div>
            <Label>End Time</Label>
            <div className="text-sm text-muted-foreground mb-2">
              {formatTime(editedSegment.end_ms)}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => adjustTime('end', -5000)}>-5s</Button>
              <Button size="sm" variant="outline" onClick={() => adjustTime('end', -1000)}>-1s</Button>
              <Button size="sm" variant="outline" onClick={() => adjustTime('end', 1000)}>+1s</Button>
              <Button size="sm" variant="outline" onClick={() => adjustTime('end', 5000)}>+5s</Button>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Intensity Control */}
        <div>
          <Label>Intensity Override</Label>
          <Select
            value={editedSegment.overall_intensity || 'normal'}
            onValueChange={(val) => setEditedSegment({
              ...editedSegment,
              overall_intensity: val
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whisper">Whisper</SelectItem>
              <SelectItem value="quiet">Quiet</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="loud">Loud</SelectItem>
              <SelectItem value="yelling">Yelling</SelectItem>
              <SelectItem value="screaming">Screaming</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Pitch Control */}
        <div>
          <Label>Pitch Override</Label>
          <Select
            value={editedSegment.overall_pitch || 'normal'}
            onValueChange={(val) => setEditedSegment({
              ...editedSegment,
              overall_pitch: val
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Separator />
        
        {/* Lock Control */}
        <div className="flex items-center justify-between">
          <div>
            <Label>Lock from AI Changes</Label>
            <p className="text-sm text-muted-foreground">
              Prevents any AI regeneration from modifying this segment
            </p>
          </div>
          <Button
            variant={editedSegment.locked_by_user ? "default" : "outline"}
            size="sm"
            onClick={() => setEditedSegment({
              ...editedSegment,
              locked_by_user: !editedSegment.locked_by_user
            })}
          >
            {editedSegment.locked_by_user ? (
              <><Lock className="w-4 h-4 mr-2" /> Locked</>
            ) : (
              <><Unlock className="w-4 h-4 mr-2" /> Unlocked</>
            )}
          </Button>
        </div>
        
        <Separator />
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={isSaving}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
        
        {/* Info */}
        {segment.is_manually_edited && (
          <div className="text-sm text-muted-foreground">
            Last edited: {segment.last_edited_at 
              ? new Date(segment.last_edited_at).toLocaleString()
              : 'Unknown'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
