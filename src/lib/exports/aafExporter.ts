import { js2xml } from 'xml-js';

interface TimelineSegment {
  start_time: number;
  end_time: number;
  text: string;
  speaker?: string;
}

interface AAFExportOptions {
  projectName: string;
  frameRate: number;
  segments: TimelineSegment[];
  audioTrackPath?: string;
}

export function generateAAF(options: AAFExportOptions): string {
  const { projectName, frameRate, segments, audioTrackPath } = options;

  const aafData = {
    _declaration: {
      _attributes: {
        version: '1.0',
        encoding: 'UTF-8'
      }
    },
    AAF: {
      _attributes: {
        version: '1.1'
      },
      Header: {
        Identification: {
          CompanyName: { _text: 'Axessible' },
          ProductName: { _text: 'Axessible Video Editor' },
          ProductVersion: { _text: '1.0.0' }
        },
        Dictionary: {
          TimelineRate: { _text: frameRate.toString() }
        }
      },
      Content: {
        Mob: {
          _attributes: {
            type: 'CompositionMob'
          },
          Name: { _text: projectName },
          Tracks: {
            Track: segments.map((segment, index) => ({
              _attributes: {
                trackID: (index + 1).toString(),
                trackNumber: (index + 1).toString()
              },
              Segment: {
                _attributes: {
                  length: Math.round((segment.end_time - segment.start_time) * frameRate).toString()
                },
                StartTime: { _text: Math.round(segment.start_time * frameRate).toString() },
                Duration: { _text: Math.round((segment.end_time - segment.start_time) * frameRate).toString() },
                Comment: { _text: segment.text },
                Speaker: { _text: segment.speaker || 'Unknown' }
              }
            }))
          }
        }
      }
    }
  };

  return js2xml(aafData, { compact: true, spaces: 2 });
}

export function downloadAAF(aafContent: string, filename: string): void {
  const blob = new Blob([aafContent], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.aaf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
