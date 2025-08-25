import React, { useState, useEffect } from 'react';

const recipeSteps = [
  {
    id: 1,
    image: '/videos/recipe-steps/step1-ingredients.jpg',
    title: 'Prepare Ingredients',
    description: 'Gather fresh pasta, tomatoes, garlic, basil, olive oil, and parmesan cheese',
    aslKeywords: ['prepare', 'ingredients', 'gather', 'pasta', 'tomato', 'garlic'],
    duration: 8000
  },
  {
    id: 2,
    image: '/videos/recipe-steps/step2-boiling-water.jpg',
    title: 'Boil Water',
    description: 'Bring a large pot of salted water to a rolling boil',
    aslKeywords: ['boil', 'water', 'pot', 'heat'],
    duration: 6000
  },
  {
    id: 3,
    image: '/videos/recipe-steps/step3-adding-pasta.jpg',
    title: 'Add Pasta',
    description: 'Carefully lower the spaghetti into the boiling water',
    aslKeywords: ['pasta', 'add', 'spaghetti', 'water'],
    duration: 5000
  },
  {
    id: 4,
    image: '/videos/recipe-steps/step4-garlic-saute.jpg',
    title: 'Sauté Garlic',
    description: 'Heat olive oil and sauté minced garlic until golden',
    aslKeywords: ['garlic', 'sauté', 'oil', 'cook'],
    duration: 7000
  },
  {
    id: 5,
    image: '/videos/recipe-steps/step5-tomato-sauce.jpg',
    title: 'Add Tomatoes',
    description: 'Add fresh diced tomatoes to the sautéed garlic',
    aslKeywords: ['tomato', 'add', 'sauce'],
    duration: 6000
  },
  {
    id: 6,
    image: '/videos/recipe-steps/step6-combining-pasta.jpg',
    title: 'Combine Pasta',
    description: 'Transfer cooked pasta to the sauce and toss together',
    aslKeywords: ['stir', 'combine', 'pasta', 'sauce'],
    duration: 5000
  },
  {
    id: 7,
    image: '/videos/recipe-steps/step7-final-dish.jpg',
    title: 'Plate and Serve',
    description: 'Plate the pasta and garnish with fresh basil and parmesan',
    aslKeywords: ['serve', 'plate', 'garnish', 'finish'],
    duration: 8000
  }
];

interface StepByStepRecipeProps {
  onStepChange?: (step: number, stepData: typeof recipeSteps[0]) => void;
}

const StepByStepRecipe: React.FC<StepByStepRecipeProps> = ({ onStepChange }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && currentStep < recipeSteps.length) {
      const currentStepData = recipeSteps[currentStep];
      onStepChange?.(currentStep + 1, currentStepData);
      
      interval = setTimeout(() => {
        if (currentStep < recipeSteps.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          setIsPlaying(false);
          setCurrentStep(0);
        }
      }, currentStepData.duration);
    }

    return () => clearTimeout(interval);
  }, [currentStep, isPlaying, onStepChange]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying && currentStep >= recipeSteps.length - 1) {
      setCurrentStep(0);
    }
  };

  const totalDuration = recipeSteps.reduce((sum, step) => sum + step.duration, 0);
  const elapsed = recipeSteps.slice(0, currentStep).reduce((sum, step) => sum + step.duration, 0) + 
    (isPlaying ? Math.min(3000, recipeSteps[currentStep]?.duration || 0) : 0);

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {/* Current Step Image */}
      <div className="relative w-full h-full">
        <img
          src={recipeSteps[currentStep].image}
          alt={recipeSteps[currentStep].title}
          className="w-full h-full object-cover"
        />
        
        {/* Step Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="text-white">
            <div className="text-sm opacity-75 mb-1">
              Step {currentStep + 1} of {recipeSteps.length}
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {recipeSteps[currentStep].title}
            </h3>
            <p className="text-sm opacity-90">
              {recipeSteps[currentStep].description}
            </p>
          </div>
        </div>

        {/* Play Controls */}
        <div className="absolute top-4 right-4">
          <button
            onClick={togglePlay}
            className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div
            className="h-full bg-primary transition-all duration-200"
            style={{ width: `${(elapsed / totalDuration) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export { StepByStepRecipe, recipeSteps };