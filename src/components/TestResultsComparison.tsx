import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Beaker } from 'lucide-react';

interface TestResult {
  id: string;
  provider: string;
  segment_count: number;
  word_count: number;
  speaker_count: number;
  avg_confidence: number;
  estimated_cost_usd: number;
  processing_time_ms: number;
  video_size_mb: number;
  created_at: string;
}

interface TestResultsComparisonProps {
  videoId: string;
}

export const TestResultsComparison = ({ videoId }: TestResultsComparisonProps) => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResults = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('transcription_test_results')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading test results:', error);
      } else {
        setResults(data || []);
      }
      setLoading(false);
    };
    loadResults();
  }, [videoId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5" />
            Test Results Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading test results...</p>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5" />
            Test Results Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No test results yet. Enable testing mode and extract transcript to see comparison data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Beaker className="h-5 w-5" />
          Test Results Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Segments</TableHead>
                <TableHead className="text-right">Words</TableHead>
                <TableHead className="text-right">Speakers</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
                <TableHead className="text-right">Cost (USD)</TableHead>
                <TableHead className="text-right">Time (s)</TableHead>
                <TableHead className="text-right">Size (MB)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.id}>
                  <TableCell>
                    <Badge variant={result.provider === 'AssemblyAI-TEST' ? 'default' : 'secondary'}>
                      {result.provider}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{result.segment_count}</TableCell>
                  <TableCell className="text-right font-mono">{result.word_count}</TableCell>
                  <TableCell className="text-right font-mono">{result.speaker_count}</TableCell>
                  <TableCell className="text-right font-mono">
                    {result.avg_confidence ? `${(result.avg_confidence * 100).toFixed(1)}%` : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ${result.estimated_cost_usd?.toFixed(4) || '0.0000'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {(result.processing_time_ms / 1000).toFixed(1)}s
                  </TableCell>
                  <TableCell className="text-right font-mono">{result.video_size_mb}MB</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          Test results are automatically logged when testing mode is enabled. Use this data to compare
          quality, cost, and performance across different transcription providers.
        </div>
      </CardContent>
    </Card>
  );
};
