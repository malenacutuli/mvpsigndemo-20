import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  UnderlineType
} from 'docx';

interface TranscriptSegment {
  start_time: number;
  end_time: number;
  text: string;
  speaker?: string;
  speaker_color?: string;
}

interface DOCXExportOptions {
  projectName: string;
  segments: TranscriptSegment[];
  includeTimestamps?: boolean;
  includeSpeakers?: boolean;
}

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms
    .toString()
    .padStart(3, '0')}`;
}

export async function generateDOCX(options: DOCXExportOptions): Promise<Blob> {
  const { projectName, segments, includeTimestamps = true, includeSpeakers = true } = options;

  const paragraphs: Paragraph[] = [
    new Paragraph({
      text: projectName,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: {
        after: 400
      }
    }),
    new Paragraph({
      text: `Transcript - ${new Date().toLocaleDateString()}`,
      alignment: AlignmentType.CENTER,
      spacing: {
        after: 600
      }
    })
  ];

  segments.forEach((segment, index) => {
    const runs: TextRun[] = [];

    // Add timestamp
    if (includeTimestamps) {
      runs.push(
        new TextRun({
          text: `[${formatTimestamp(segment.start_time)} - ${formatTimestamp(segment.end_time)}] `,
          color: '666666',
          size: 20
        })
      );
    }

    // Add speaker
    if (includeSpeakers && segment.speaker) {
      runs.push(
        new TextRun({
          text: `${segment.speaker}: `,
          bold: true,
          color: segment.speaker_color?.replace('#', '') || '000000',
          size: 24
        })
      );
    }

    // Add text
    runs.push(
      new TextRun({
        text: segment.text,
        size: 24
      })
    );

    paragraphs.push(
      new Paragraph({
        children: runs,
        spacing: {
          after: 200
        }
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs
      }
    ]
  });

  return await Packer.toBlob(doc);
}

export async function downloadDOCX(docxBlob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(docxBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
