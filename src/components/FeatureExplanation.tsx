import React from 'react';
import { Card } from '@/components/ui/card';
import { Volume2, Globe, HandHelping } from 'lucide-react';
import captionsIntention from '@/assets/captions-intention.jpg';

export const FeatureExplanation: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <Card className="p-4 bg-blue-50 border-blue-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <img src={captionsIntention} alt="Captions with Intention" className="w-5 h-5 object-contain" />
          <h3 className="font-light text-blue-600">AI CC (Closed Captions)</h3>
        </div>
        <p className="text-sm text-blue-800 font-light">
          Automatically generates captions from video audio using AI speech recognition. 
          Perfect for accessibility and when audio isn't available.
        </p>
      </Card>

      <Card className="p-4 bg-purple-50 border-purple-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Volume2 className="w-5 h-5 text-purple-600" />
          <h3 className="font-light text-purple-600">Dynamic AD (Audio Description)</h3>
        </div>
        <p className="text-sm text-purple-800 font-light">
          Professional audio descriptions of visual content for visually impaired users. 
          Describes actions, scenes, and visual elements not covered by dialogue.
        </p>
      </Card>

      <Card className="p-4 bg-green-50 border-green-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-5 h-5 text-green-600" />
          <h3 className="font-light text-green-600">Language Translation</h3>
        </div>
        <p className="text-sm text-green-800 font-light">
          Translates captions, audio descriptions, and generates dubbed audio in multiple languages. 
          Makes content accessible to global audiences.
        </p>
      </Card>

      <Card className="p-4 bg-orange-50 border-orange-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <HandHelping className="w-5 h-5 text-orange-600" />
          <h3 className="font-light text-orange-600">Sign Language Avatar</h3>
        </div>
        <p className="text-sm text-orange-800 font-light">
          Virtual SL interpreter that signs the video content in real-time. 
          Provides accessibility for deaf and hard-of-hearing users.
        </p>
      </Card>
    </div>
  );
};