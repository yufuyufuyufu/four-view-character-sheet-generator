import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Settings, 
  Send, 
  RefreshCw, 
  Download, 
  Scissors, 
  ChevronRight,
  X,
  Loader2,
  Eye,
  EyeOff,
  LayoutGrid,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateFourView, GeminiModel } from './services/gemini';

interface UploadedImage {
  id: string;
  url: string;
  base64: string;
}



export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [tempKey, setTempKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(!localStorage.getItem('gemini_api_key'));
  const [model, setModel] = useState<GeminiModel>('gemini-3.1-flash-image-preview');
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [splitImages, setSplitImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveKey = () => {
    if (tempKey.trim()) {
      localStorage.setItem('gemini_api_key', tempKey.trim());
      setApiKey(tempKey.trim());
      setShowApiKeyModal(false);
      setTempKey('');
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setShowApiKeyModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImages(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          url: URL.createObjectURL(file),
          base64
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }
    if (images.length === 0) {
      setError('Please upload at least one reference image');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSplitImages([]);

    try {
      const result = await generateFourView({
        apiKey,
        model,
        prompt,
        images: images.map(img => img.base64)
      });
      setResultImage(result.imageUrl);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || 'An error occurred during generation';
      
      // Handle 403 Permission Denied specifically
      if (errorMessage.includes('403') || errorMessage.includes('PERMISSION_DENIED')) {
        setError('403 Permission Denied: The image generation models (Banana 2 / Banana Pro) require an API key from a Google Cloud Project with billing enabled. Please check your billing status at ai.google.dev/gemini-api/docs/billing or select a different key.');
        // Reset key state so they can select a new one
        handleClearKey();
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const splitImage = async () => {
    if (!resultImage) return;

    const img = new Image();
    img.src = resultImage;
    await new Promise(resolve => img.onload = resolve);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = img.width / 2;
    const h = img.height / 2;
    canvas.width = w;
    canvas.height = h;

    const parts: string[] = [];
    
    // Top Left (Front)
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h, 0, 0, w, h);
    parts.push(canvas.toDataURL());

    // Top Right (Back)
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, w, 0, w, h, 0, 0, w, h);
    parts.push(canvas.toDataURL());

    // Bottom Left (Left)
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, h, w, h, 0, 0, w, h);
    parts.push(canvas.toDataURL());

    // Bottom Right (Right)
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, w, h, w, h, 0, 0, w, h);
    parts.push(canvas.toDataURL());

    setSplitImages(parts);
  };

  const downloadImage = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  };

  if (showApiKeyModal) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6">
        <div className="bg-white max-w-md w-full rounded-3xl p-8 shadow-xl text-center space-y-6 flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <Key size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">API Key Required</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Please enter your Gemini API Key. It will be stored locally in your browser.
            </p>
          </div>
          <div className="w-full">
            <input 
              type="password"
              placeholder="AIzaSy..."
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <button 
              onClick={handleSaveKey}
              disabled={!tempKey.trim()}
              className="w-full bg-black text-white py-4 rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save API Key
            </button>
            {apiKey && (
              <button 
                onClick={() => setShowApiKeyModal(false)}
                className="w-full mt-2 text-gray-500 py-2 rounded-xl text-sm font-medium hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
            )}
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noreferrer"
              className="block mt-6 text-xs text-blue-500 hover:underline"
            >
              Get an API Key from Google AI Studio
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <LayoutGrid className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">QuadView AI</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleClearKey}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium px-4 py-2 rounded-full transition-colors"
            >
              <Key size={14} />
              Reset API Key
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Controls */}
        <div className="lg:col-span-5 space-y-8">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">1. Reference Images</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {images.map((img, idx) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={img.id} 
                  className="relative aspect-square rounded-2xl overflow-hidden bg-gray-200 group border border-gray-200"
                >
                  <img src={img.url} alt="Reference" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeImage(img.id)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                  >
                    <X size={14} />
                  </button>
                  {idx === 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] py-1 text-center font-medium backdrop-blur-sm">
                      TARGET
                    </div>
                  )}
                </motion.div>
              ))}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-gray-400 hover:text-blue-500"
              >
                <Upload size={24} />
                <span className="text-xs font-medium">Upload</span>
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
            <p className="text-xs text-gray-400 italic">The first image will be used as the primary target.</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">2. Model Selection</h2>
            <div className="flex p-1 bg-gray-100 rounded-2xl border border-gray-200">
              <button 
                onClick={() => setModel('gemini-3.1-flash-image-preview')}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${model === 'gemini-3.1-flash-image-preview' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Banana 2 (Flash)
              </button>
              <button 
                onClick={() => setModel('gemini-3-pro-image-preview')}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${model === 'gemini-3-pro-image-preview' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Banana Pro
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">3. Prompt & Refinement</h2>
            <div className="relative">
              <textarea 
                placeholder="Describe the character, style, or adjustments..."
                className="w-full h-40 bg-white rounded-2xl p-6 border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none text-base"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="absolute bottom-4 right-4 bg-black text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-black/10"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium flex items-start gap-3"
              >
                <X className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </motion.div>
            )}
          </section>
        </div>

        {/* Right Column: Result */}
        <div className="lg:col-span-7">
          <div className="sticky top-28">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">Generated Sheet</h2>
            
            <div className="bg-white rounded-3xl p-4 border border-gray-200 shadow-sm min-h-[400px] flex flex-col">
              {!resultImage && !isGenerating && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-4">
                  <ImageIcon size={64} strokeWidth={1} />
                  <p className="text-sm font-medium">Your generated sheet will appear here</p>
                </div>
              )}

              {isGenerating && (
                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-gray-100 border-t-black rounded-full animate-spin" />
                    <LayoutGrid className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg">Creating your four-view sheet</p>
                    <p className="text-sm text-gray-400">This usually takes 10-20 seconds...</p>
                  </div>
                </div>
              )}

              {resultImage && !isGenerating && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="relative rounded-2xl overflow-hidden border border-gray-100 group">
                    <img src={resultImage} alt="Generated Sheet" className="w-full aspect-square object-contain bg-gray-50" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                    
                    {/* View Labels Overlay */}
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-4 flex items-start justify-start"><span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-md">FRONT</span></div>
                      <div className="p-4 flex items-start justify-end"><span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-md">BACK</span></div>
                      <div className="p-4 flex items-end justify-start"><span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-md">LEFT</span></div>
                      <div className="p-4 flex items-end justify-end"><span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-md">RIGHT</span></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={splitImage}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-black py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
                    >
                      <Scissors size={18} />
                      Split into 4 Views
                    </button>
                    <button 
                      onClick={() => downloadImage(resultImage, 'character-sheet.png')}
                      className="p-3 bg-gray-100 hover:bg-gray-200 text-black rounded-xl transition-all"
                      title="Download Full Sheet"
                    >
                      <Download size={20} />
                    </button>
                  </div>

                  {splitImages.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="pt-6 border-t border-gray-100"
                    >
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                        <Scissors size={12} />
                        Split Views
                      </h3>
                      <div className="grid grid-cols-4 gap-3">
                        {['Front', 'Back', 'Left', 'Right'].map((label, idx) => (
                          <div key={idx} className="space-y-2">
                            <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group">
                              <img src={splitImages[idx]} alt={label} className="w-full h-full object-cover" />
                              <button 
                                onClick={() => downloadImage(splitImages[idx], `${label.toLowerCase()}.png`)}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                              >
                                <Download size={16} />
                              </button>
                            </div>
                            <p className="text-[10px] font-bold text-center text-gray-500 uppercase">{label}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Refinement Tip */}
            {resultImage && (
              <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="text-white w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">Pro Tip</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Not quite right? Use the prompt box to specify changes like "make the hair longer" or "add a cape" and generate again.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-gray-200 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-gray-400">
            <LayoutGrid size={16} />
            <span className="text-sm font-medium">QuadView AI &copy; 2026</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="text-sm text-gray-400 hover:text-black transition-colors">Documentation</a>
            <a href="#" className="text-sm text-gray-400 hover:text-black transition-colors">Privacy</a>
            <a href="#" className="text-sm text-gray-400 hover:text-black transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
