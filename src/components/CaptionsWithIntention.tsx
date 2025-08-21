import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Play, Pause, Volume2, VolumeX, Type, Settings, ChefHat, Mic, BookOpen } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Slider } from './ui/slider'
import { Switch } from './ui/switch'

// Define interfaces for our caption structure
export interface WordData {
  text: string
  startTime: number
  endTime: number
  emphasis: 'loud' | 'quiet' | 'normal'
  pitch: 'high' | 'low' | 'normal'
}

export interface CaptionSegment {
  text: string
  startTime: number
  endTime: number
  speaker: 'chef' | 'narrator' | 'child'
  words: WordData[]
}

// Demo captions for realistic pasta recipe content with Gordon Ramsay-style passion
const recipeCaptions: CaptionSegment[] = [
  {
    text: "It can be easily undercooked or overcooked.",
    startTime: 0.08,
    endTime: 2.36,
    speaker: "chef",
    words: [
      {
        text: "It",
        startTime: 0.08,
        endTime: 0.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "can",
        startTime: 0.2,
        endTime: 0.32,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "be",
        startTime: 0.32,
        endTime: 0.44,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "easily",
        startTime: 0.44,
        endTime: 0.8,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "undercooked",
        startTime: 0.8,
        endTime: 1.44,
        emphasis: "loud",
        pitch: "low"
      },
      {
        text: "or",
        startTime: 1.44,
        endTime: 1.56,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "overcooked.",
        startTime: 1.56,
        endTime: 2.36,
        emphasis: "loud",
        pitch: "high"
      }
    ]
  },
  {
    text: "I'm going to put my oil into my pasta water.",
    startTime: 2.36,
    endTime: 5.04,
    speaker: "chef",
    words: [
      {
        text: "I'm",
        startTime: 2.36,
        endTime: 2.52,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "going",
        startTime: 2.52,
        endTime: 2.72,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "to",
        startTime: 2.72,
        endTime: 2.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "put",
        startTime: 2.8,
        endTime: 2.96,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "my",
        startTime: 2.96,
        endTime: 3.12,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "oil",
        startTime: 3.12,
        endTime: 3.44,
        emphasis: "loud",
        pitch: "normal"
      },
      {
        text: "into",
        startTime: 3.44,
        endTime: 3.72,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "my",
        startTime: 3.72,
        endTime: 3.88,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pasta",
        startTime: 3.88,
        endTime: 4.32,
        emphasis: "loud",
        pitch: "normal"
      },
      {
        text: "water.",
        startTime: 4.32,
        endTime: 5.04,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  }
];

// Demo captions for educational content with warm, engaging narration
const educationCaptions: CaptionSegment[] = [
  {
    text: "Hello! Welcome to learning with us today.",
    startTime: 5.04,
    endTime: 8.4,
    speaker: "child",
    words: [
      {
        text: "Hello!",
        startTime: 5.04,
        endTime: 5.44,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "Welcome",
        startTime: 5.44,
        endTime: 6.0,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "to",
        startTime: 6.0,
        endTime: 6.12,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "learning",
        startTime: 6.12,
        endTime: 6.8,
        emphasis: "loud",
        pitch: "normal"
      },
      {
        text: "with",
        startTime: 6.8,
        endTime: 7.0,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "us",
        startTime: 7.0,
        endTime: 7.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "today.",
        startTime: 7.2,
        endTime: 8.4,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Let's explore the exciting world of mathematics together!",
    startTime: 8.4,
    endTime: 12.0,
    speaker: "narrator",
    words: [
      {
        text: "Let's",
        startTime: 8.4,
        endTime: 8.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "explore",
        startTime: 8.8,
        endTime: 9.4,
        emphasis: "loud",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 9.4,
        endTime: 9.52,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "exciting",
        startTime: 9.52,
        endTime: 10.2,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "world",
        startTime: 10.2,
        endTime: 10.6,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "of",
        startTime: 10.6,
        endTime: 10.72,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "mathematics",
        startTime: 10.72,
        endTime: 11.4,
        emphasis: "loud",
        pitch: "normal"
      },
      {
        text: "together!",
        startTime: 11.4,
        endTime: 12.0,
        emphasis: "loud",
        pitch: "high"
      }
    ]
  }
];

interface CaptionsWithIntentionProps {
  currentTime?: number
  isPlaying?: boolean
  contentType?: 'recipe' | 'education'
  captionsOverride?: CaptionSegment[]
}

const CaptionsWithIntention: React.FC<CaptionsWithIntentionProps> = ({ 
  currentTime: externalCurrentTime,
  isPlaying: externalIsPlaying,
  contentType,
  captionsOverride
}) => {
  const [isPlaying, setIsPlaying] = useState(externalIsPlaying ?? false)
  const [currentTime, setCurrentTime] = useState(externalCurrentTime ?? 0)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [fontSize, setFontSize] = useState(18)
  const [showEmphasis, setShowEmphasis] = useState(true)
  const [showPitch, setShowPitch] = useState(true)
  const [selectedDemo, setSelectedDemo] = useState<'recipe' | 'education'>(contentType || 'recipe')
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  // Use external props when available
  useEffect(() => {
    if (externalCurrentTime !== undefined) {
      setCurrentTime(externalCurrentTime)
    }
  }, [externalCurrentTime])

  useEffect(() => {
    if (externalIsPlaying !== undefined) {
      setIsPlaying(externalIsPlaying)
    }
  }, [externalIsPlaying])

  useEffect(() => {
    if (contentType) {
      setSelectedDemo(contentType)
    }
  }, [contentType])

  // Use the appropriate captions based on selected demo or override
  const currentCaptions = captionsOverride || (selectedDemo === 'recipe' ? recipeCaptions : educationCaptions)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const maxTime = Math.max(...currentCaptions.map(cap => cap.endTime))
          return prev >= maxTime ? 0 : prev + 0.1 * playbackSpeed
        })
      }, 100)
    }
    return () => clearInterval(interval)
  }, [isPlaying, currentCaptions, playbackSpeed])

  const getCurrentCaption = () => {
    return currentCaptions.find(
      caption => currentTime >= caption.startTime && currentTime <= caption.endTime
    )
  }

  const getCurrentWords = () => {
    const caption = getCurrentCaption()
    if (!caption) return []
    return caption.words.filter(
      word => currentTime >= word.startTime && currentTime <= word.endTime
    )
  }

  const getWordStyle = (word: WordData) => {
    let className = "inline-block px-1 py-0.5 rounded transition-all duration-200 "
    
    if (showEmphasis) {
      switch (word.emphasis) {
        case 'loud':
          className += "font-bold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 "
          break
        case 'quiet':
          className += "opacity-70 text-muted-foreground "
          break
        default:
          className += "text-foreground "
      }
    }

    if (showPitch) {
      switch (word.pitch) {
        case 'high':
          className += "border-t-2 border-blue-400 "
          break
        case 'low':
          className += "border-b-2 border-green-400 "
          break
      }
    }

    return className
  }

  const getSpeakerIcon = (speaker: string) => {
    switch (speaker) {
      case 'chef':
        return <ChefHat className="w-4 h-4" />
      case 'narrator':
        return <Mic className="w-4 h-4" />
      case 'child':
        return <BookOpen className="w-4 h-4" />
      default:
        return <Mic className="w-4 h-4" />
    }
  }

  const getSpeakerColor = (speaker: string) => {
    switch (speaker) {
      case 'chef':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
      case 'narrator':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
      case 'child':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
    }
  }

  const currentCaption = getCurrentCaption()
  const currentWords = getCurrentWords()
  const maxTime = Math.max(...currentCaptions.map(cap => cap.endTime))

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Type className="w-6 h-6 text-primary" />
          <div>
            <CardTitle>Captions with Intention</CardTitle>
            <CardDescription>
              Experience captions that convey emotion, emphasis, and pitch through visual design
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Demo Selection */}
        <Tabs value={selectedDemo} onValueChange={(value) => setSelectedDemo(value as 'recipe' | 'education')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recipe" className="flex items-center gap-2">
              <ChefHat className="w-4 h-4" />
              Recipe Demo
            </TabsTrigger>
            <TabsTrigger value="education" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Education Demo
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <Button
            onClick={() => setIsPlaying(!isPlaying)}
            size="sm"
            className="flex items-center gap-2"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>

          <Button
            onClick={() => setIsMuted(!isMuted)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>

          <div className="flex items-center gap-2 min-w-[120px]">
            <span className="text-sm">Volume:</span>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              onValueChange={(value) => {
                setVolume(value[0] / 100)
                setIsMuted(false)
              }}
              max={100}
              step={1}
              className="flex-1"
            />
          </div>

          <Select value={playbackSpeed.toString()} onValueChange={(value) => setPlaybackSpeed(parseFloat(value))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5">0.5x</SelectItem>
              <SelectItem value="0.75">0.75x</SelectItem>
              <SelectItem value="1">1x</SelectItem>
              <SelectItem value="1.25">1.25x</SelectItem>
              <SelectItem value="1.5">1.5x</SelectItem>
              <SelectItem value="2">2x</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            onValueChange={(value) => setCurrentTime(value[0])}
            max={maxTime}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{currentTime.toFixed(1)}s</span>
            <span>{maxTime.toFixed(1)}s</span>
          </div>
        </div>

        {/* Caption Display Options */}
        <div className="flex flex-wrap items-center gap-4 p-4 border rounded-lg">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="font-medium">Display Options:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={showEmphasis}
              onCheckedChange={setShowEmphasis}
              id="emphasis"
            />
            <label htmlFor="emphasis" className="text-sm">Show Emphasis</label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={showPitch}
              onCheckedChange={setShowPitch}
              id="pitch"
            />
            <label htmlFor="pitch" className="text-sm">Show Pitch</label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm">Font Size:</span>
            <Slider
              value={[fontSize]}
              onValueChange={(value) => setFontSize(value[0])}
              min={12}
              max={32}
              step={2}
              className="w-20"
            />
            <span className="text-sm w-8">{fontSize}px</span>
          </div>
        </div>

        {/* Caption Display */}
        <div className="space-y-4">
          {/* Current Speaker */}
          {currentCaption && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={`${getSpeakerColor(currentCaption.speaker)} flex items-center gap-1`}>
                {getSpeakerIcon(currentCaption.speaker)}
                {currentCaption.speaker}
              </Badge>
            </div>
          )}

          {/* Main Caption Display */}
          <div 
            className="min-h-[120px] p-6 border-2 border-dashed border-muted-foreground/20 rounded-lg bg-background flex items-center justify-center"
            style={{ fontSize: `${fontSize}px` }}
          >
            {currentCaption ? (
              <div className="text-center leading-relaxed">
                {currentCaption.words.map((word, index) => {
                  const isActive = currentWords.some(w => w.text === word.text && w.startTime === word.startTime)
                  return (
                    <span
                      key={`${word.text}-${word.startTime}-${index}`}
                      className={`${getWordStyle(word)} ${isActive ? 'scale-110 shadow-md' : ''}`}
                    >
                      {word.text}
                    </span>
                  )
                })}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <Type className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Press play to see captions with intention</p>
              </div>
            )}
          </div>

          {/* Caption Timeline */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Caption Timeline:</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {currentCaptions.map((caption, index) => {
                const isActive = currentTime >= caption.startTime && currentTime <= caption.endTime
                return (
                  <div
                    key={index}
                    className={`p-2 rounded text-sm cursor-pointer transition-colors ${
                      isActive ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50 hover:bg-muted'
                    }`}
                    onClick={() => setCurrentTime(caption.startTime)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`${getSpeakerColor(caption.speaker)} text-xs`}>
                        {getSpeakerIcon(caption.speaker)}
                        {caption.speaker}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {caption.startTime.toFixed(1)}s - {caption.endTime.toFixed(1)}s
                      </span>
                    </div>
                    <p className="leading-relaxed">{caption.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h4 className="font-medium">Visual Legend:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h5 className="font-medium">Emphasis:</h5>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-2 py-1 rounded">Loud</span>
                  <span className="text-muted-foreground">Bold text with red background</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="opacity-70 text-muted-foreground px-2 py-1">Quiet</span>
                  <span className="text-muted-foreground">Faded text</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1">Normal</span>
                  <span className="text-muted-foreground">Regular text</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h5 className="font-medium">Pitch:</h5>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="border-t-2 border-blue-400 px-2 py-1">High</span>
                  <span className="text-muted-foreground">Blue top border</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="border-b-2 border-green-400 px-2 py-1">Low</span>
                  <span className="text-muted-foreground">Green bottom border</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1">Normal</span>
                  <span className="text-muted-foreground">No border</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CaptionsWithIntention