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
  const [isIterative, setIsIterative] = useState(false);
  const [isRawMode, setIsRawMode] = useState(false);

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
    setIsIterative(false); // New manual uploads reset iterative mode

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
      setError('请至少上传一张参考图');
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
        images: images.map(img => img.base64),
        isIterative,
        isRaw: isRawMode
      });
      setResultImage(result.imageUrl);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || '生成过程中发生未知错误';
      
      // Handle 403 Permission Denied specifically
      if (errorMessage.includes('403') || errorMessage.includes('PERMISSION_DENIED')) {
        setError('403 权限被拒绝：该图像生成模型需要配置了结算账户的 Google Cloud API Key。请检查账单状态或更换 Key。');
        // Reset key state so they can select a new one
        handleClearKey();
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const useResultAsReference = () => {
    if (!resultImage) return;
    // Set the generated result as the sole new primary reference image
    setImages([{
      id: Math.random().toString(36).substr(2, 9),
      url: resultImage,
      base64: resultImage
    }]);
    setIsIterative(true);
    setResultImage(null);
    setSplitImages([]);
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">需要 API Key</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              请输入您的 Gemini API Key。它将安全地存储在您的浏览器本地。
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
              保存 API Key
            </button>
            {apiKey && (
              <button 
                onClick={() => setShowApiKeyModal(false)}
                className="w-full mt-2 text-gray-500 py-2 rounded-xl text-sm font-medium hover:text-gray-900 transition-colors"
              >
                取消
              </button>
            )}
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noreferrer"
              className="block mt-6 text-xs text-blue-500 hover:underline"
            >
              前往 Google AI Studio 获取 API Key
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
            <h1 className="text-xl font-semibold tracking-tight">四视图 AI 构建器</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleClearKey}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium px-4 py-2 rounded-full transition-colors"
            >
              <Key size={14} />
              重置 API Key
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Controls */}
        <div className="lg:col-span-5 space-y-8">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">1. 参考图上传</h2>
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
                    <div className={`absolute bottom-0 left-0 right-0 ${isIterative ? 'bg-blue-600/80' : 'bg-black/60'} text-white text-[10px] py-1 text-center font-medium backdrop-blur-sm`}>
                      {isIterative ? '迭代基础 (ITERATION BASE)' : '目标 (TARGET)'}
                    </div>
                  )}
                </motion.div>
              ))}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-gray-400 hover:text-blue-500"
              >
                <Upload size={24} />
                <span className="text-xs font-medium">上传图片</span>
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
            <p className="text-xs text-gray-400 italic">提示：第一张图片将被作为核心的目标特征基准。</p>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">2. 生图模型选择</h2>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">3. 特殊预处理 (Raw Mode)</h2>
              <button 
                onClick={() => {
                  setIsRawMode(!isRawMode);
                  if (!isRawMode) {
                    setIsIterative(false);
                    setPrompt('请帮我把这张图片的背景去除，修改为纯白色背景，只保留角色主体。');
                  } else {
                    setPrompt('');
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${isRawMode ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
              >
                {isRawMode ? 'RAW 模式已开启' : '开启 RAW 模式'}
              </button>
            </div>
            {isRawMode && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 mb-4"
              >
                <div className="flex gap-3 mb-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Scissors className="text-white w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-orange-900">RAW 调用 (无系统提示词)</p>
                    <p className="text-[10px] text-orange-700 leading-relaxed mt-0.5">
                      此模式将跳过内置的“四视图艺术专家”系统提示词。适用于背景去除、单纯修图等不需要 2x2 网格约束的任务。
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setPrompt('请帮我把这张图片的背景去除，修改为纯白色背景，只保留角色主体。')}
                    className="text-[10px] bg-white border border-orange-200 px-3 py-1.5 rounded-lg text-orange-700 hover:bg-orange-100 transition-colors"
                  >
                    ✨ 去除背景并留白
                  </button>
                  <button 
                    onClick={() => setPrompt('把这张角色的线条加粗，转换成干净的赛璐璐勾线风格。')}
                    className="text-[10px] bg-white border border-orange-200 px-3 py-1.5 rounded-lg text-orange-700 hover:bg-orange-100 transition-colors"
                  >
                    ✏️ 强化线条/勾线
                  </button>
                </div>
              </motion.div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">4. 提示词 (Prompt) 约束与微调</h2>
            <div className="relative">
              <textarea 
                placeholder="使用 Prompt 描述角色的特征、背景风格设置、或你想要做的调整调整细节..."
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
                    正在生成...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    开始生成
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
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">四视图生成结果</h2>
            
            <div className="bg-white rounded-3xl p-4 border border-gray-200 shadow-sm min-h-[400px] flex flex-col">
              {!resultImage && !isGenerating && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-4">
                  <ImageIcon size={64} strokeWidth={1} />
                  <p className="text-sm font-medium">您生成的四视图网格将出现在这里</p>
                </div>
              )}

              {isGenerating && (
                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-gray-100 border-t-black rounded-full animate-spin" />
                    <LayoutGrid className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg">正在绘制 2x2 四视图中</p>
                    <p className="text-sm text-gray-400">请保持耐心，通常需要等待 10 - 20 秒...</p>
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
                      <div className="p-4 flex items-start justify-start"><span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-md">正面</span></div>
                      <div className="p-4 flex items-start justify-end"><span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-md">背面</span></div>
                      <div className="p-4 flex items-end justify-start"><span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-md">左视图</span></div>
                      <div className="p-4 flex items-end justify-end"><span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-md">右视图</span></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={splitImage}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-black py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
                    >
                      <Scissors size={18} />
                      分割为 4 张独立视角
                    </button>
                    <button 
                      onClick={() => downloadImage(resultImage, 'character-sheet.png')}
                      className="p-3 bg-gray-100 hover:bg-gray-200 text-black rounded-xl transition-all"
                      title="下载完整四视图"
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
                        已分割视角
                      </h3>
                      <div className="grid grid-cols-4 gap-3">
                        {['正面', '背面', '左侧', '右侧'].map((label, idx) => (
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
              <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="text-white w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-900">迭代微调 (Refine)</p>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      对本次生成的结果不够满意？可以直接点击下方按钮，将这个 2x2 画布转换为新的原图，并在上方左侧的 Prompt 中描述需要修改的细节（例如：“把角色的手套换成红色”）。
                    </p>
                  </div>
                </div>
                <button 
                  onClick={useResultAsReference}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all mt-2 shadow-sm"
                >
                  <RefreshCw size={18} />
                  微调并重绘此图
                </button>
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
            <span className="text-sm font-medium">四视图 AI 构建系统 &copy; 2026</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="text-sm text-gray-400 hover:text-black transition-colors">项目文档</a>
            <a href="#" className="text-sm text-gray-400 hover:text-black transition-colors">隐私保护</a>
            <a href="#" className="text-sm text-gray-400 hover:text-black transition-colors">服务条款</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
