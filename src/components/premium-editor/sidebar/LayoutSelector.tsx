import React from 'react';
import { cn } from '@/lib/utils';
import { LAYOUT_TEMPLATES } from '@/lib/premium/layout-templates';
import { Check } from 'lucide-react';

interface LayoutSelectorProps {
  currentLayout: string;
  onLayoutChange: (layout: string) => void;
  className?: string;
}

export function LayoutSelector({
  currentLayout,
  onLayoutChange,
  className
}: LayoutSelectorProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-sm font-medium text-foreground mb-2">Scene Layout</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Choose how sources are arranged in this scene
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(LAYOUT_TEMPLATES).map(([key, layout]) => (
          <button
            key={key}
            onClick={() => onLayoutChange(key)}
            className={cn(
              'relative aspect-video rounded-lg border-2 p-3 transition-all hover:border-primary',
              currentLayout === key
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card'
            )}
          >
            {/* Visual representation */}
            <div className="relative w-full h-full bg-muted rounded overflow-hidden">
              {layout.positions?.map((pos, idx) => (
                <div
                  key={pos.id}
                  className={cn(
                    'absolute border border-border',
                    currentLayout === key ? 'bg-primary/20' : 'bg-accent'
                  )}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    width: `${pos.width}%`,
                    height: `${pos.height}%`,
                    zIndex: pos.zIndex
                  }}
                >
                  {layout.sources > 1 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-muted-foreground">
                        {idx + 1}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Label */}
            <div className="absolute bottom-1 left-1 right-1 bg-card/90 rounded px-2 py-1">
              <p className="text-xs font-medium text-foreground truncate">
                {layout.name}
              </p>
            </div>

            {/* Selected indicator */}
            {currentLayout === key && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
