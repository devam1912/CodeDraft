import React, { useState } from "react";
import toast from "react-hot-toast";
import { userAPI } from "../../services/api";

const LANGUAGES = [
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "cpp", label: "C++" },
  { id: "java", label: "Java" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "c", label: "C" },
];

function AICodeConverter({ isOpen, onClose, initialLanguage, initialToLanguage, onApplyCode }) {
  const [fromLang, setFromLang] = useState(initialLanguage || "javascript");
  const [toLang, setToLang] = useState(initialToLanguage || "cpp");
  const [sourceCode, setSourceCode] = useState("");
  const [convertedCode, setConvertedCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConvert = async () => {
    if (!sourceCode.trim()) {
      return toast.error("Please enter code to convert.");
    }
    if (fromLang === toLang) {
      return toast.error("Source and target languages must be different.");
    }

    setLoading(true);
    try {
      const res = await userAPI.convertCode({
        fromLanguage: fromLang,
        toLanguage: toLang,
        code: sourceCode,
      });
      setConvertedCode(res.data?.convertedCode || res.convertedCode || "");
      toast.success("Code translated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to translate code.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!convertedCode) return;
    navigator.clipboard.writeText(convertedCode);
    toast.success("Converted code copied to clipboard!");
  };

  const handleApply = () => {
    if (!convertedCode) return;
    if (onApplyCode) {
      onApplyCode(convertedCode, toLang);
      toast.success(`Injected ${toLang} code into the editor!`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex justify-end z-50 animate-fade-in">
      <div className="w-full max-w-lg bg-[#1a1030] border-l border-border-default h-full flex flex-col p-6 shadow-2xl animate-slide-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default pb-4 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <h3 className="text-base font-bold text-text-primary">AI Code Converter</h3>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider font-mono">
              From Language
            </label>
            <select
              value={fromLang}
              onChange={(e) => setFromLang(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-bg-surface border border-border-default text-text-primary focus:outline-none cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider font-mono">
              To Language
            </label>
            <select
              value={toLang}
              onChange={(e) => setToLang(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-bg-surface border border-border-default text-text-primary focus:outline-none cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scrollable inputs section */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 mb-5">
          {/* Source Code */}
          <div className="flex-1 min-h-[160px] flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider font-mono">
              Source Code
            </label>
            <textarea
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              placeholder={`Paste your ${fromLang} code here...`}
              className="flex-1 w-full p-4 rounded-xl bg-bg-primary border border-border-default text-text-primary font-mono text-xs focus:outline-none focus:border-primary resize-none placeholder:text-text-muted/40"
            />
          </div>

          {/* Action Button */}
          <button
            onClick={handleConvert}
            disabled={loading}
            className="w-full py-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary to-secondary hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/20 border-top-white rounded-full animate-spin" />
                Translating...
              </>
            ) : (
              "✨ Translate Code"
            )}
          </button>

          {/* Converted Output */}
          <div className="flex-1 min-h-[160px] flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider font-mono">
              Translated Code
            </label>
            <textarea
              readOnly
              value={convertedCode}
              placeholder="Translated code will appear here..."
              className="flex-1 w-full p-4 rounded-xl bg-[#07070a] border border-border-default text-success font-mono text-xs focus:outline-none resize-none placeholder:text-text-muted/30"
            />
          </div>
        </div>

        {/* Footer Actions */}
        {convertedCode && (
          <div className="flex gap-3 border-t border-border-default pt-4">
            <button
              onClick={handleCopy}
              className="flex-1 py-3 rounded-xl border border-border-default bg-bg-surface hover:bg-bg-elevated text-text-primary font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
            >
              📋 Copy Code
            </button>
            {onApplyCode && (
              <button
                onClick={handleApply}
                className="flex-1 py-3 rounded-xl bg-success text-bg-primary hover:brightness-115 font-bold text-xs uppercase tracking-wider cursor-pointer transition-all"
              >
                📥 Inject Code
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AICodeConverter;
