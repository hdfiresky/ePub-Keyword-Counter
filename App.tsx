
import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { KeywordInput } from './components/KeywordInput';
import { epubProcessor } from './services/epubProcessor';
import { ProcessingState } from './types';
import { DownloadIcon, CheckCircleIcon, ExclamationCircleIcon } from './components/Icons';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [keywords, setKeywords] = useState<string>('');
  const [processingState, setProcessingState] = useState<ProcessingState>(ProcessingState.IDLE);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [modifiedEpubUrl, setModifiedEpubUrl] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setProcessingState(ProcessingState.IDLE);
    setStatusMessage('');
    if (modifiedEpubUrl) {
      URL.revokeObjectURL(modifiedEpubUrl);
    }
    setModifiedEpubUrl(null);
  }, [modifiedEpubUrl]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    resetState();
  }, [resetState]);

  const handleKeywordsChange = useCallback((newKeywords: string) => {
    setKeywords(newKeywords);
    resetState();
  }, [resetState]);

  const handleProcess = useCallback(async () => {
    if (!file || !keywords.trim()) {
      setStatusMessage('Please select an ePub file and enter keywords.');
      setProcessingState(ProcessingState.ERROR);
      return;
    }

    setProcessingState(ProcessingState.PROCESSING);
    setStatusMessage('Processing ePub... this may take a moment.');
    if (modifiedEpubUrl) {
        URL.revokeObjectURL(modifiedEpubUrl);
        setModifiedEpubUrl(null);
    }

    try {
      const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
      if (keywordArray.length === 0) {
        throw new Error("Keywords list cannot be empty or just commas.");
      }

      const modifiedBlob = await epubProcessor.process(file, keywordArray);
      const url = URL.createObjectURL(modifiedBlob);
      setModifiedEpubUrl(url);
      setProcessingState(ProcessingState.SUCCESS);
      setStatusMessage('ePub processed successfully! Ready for download.');
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setStatusMessage(`Error: ${errorMessage}`);
      setProcessingState(ProcessingState.ERROR);
    }
  }, [file, keywords, modifiedEpubUrl]);

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">ePub Keyword Counter</h1>
          <p className="mt-2 text-lg text-gray-600">Update chapter titles with keyword occurrence counts.</p>
        </header>

        <main className="bg-white p-8 rounded-xl shadow-lg space-y-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">1. Upload your ePub file</h2>
              <FileUpload onFileSelect={handleFileSelect} selectedFile={file} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">2. Enter keywords</h2>
              <KeywordInput keywords={keywords} onKeywordsChange={handleKeywordsChange} />
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <button
              onClick={handleProcess}
              disabled={!file || !keywords.trim() || processingState === ProcessingState.PROCESSING}
              className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {processingState === ProcessingState.PROCESSING ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : 'Process ePub & Count Keywords'}
            </button>
          </div>

          {statusMessage && (
            <div className={`mt-4 p-4 rounded-md text-sm ${
              processingState === ProcessingState.SUCCESS ? 'bg-green-50 text-green-800' :
              processingState === ProcessingState.ERROR ? 'bg-red-50 text-red-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              <div className="flex items-center">
                {processingState === ProcessingState.SUCCESS && <CheckCircleIcon />}
                {processingState === ProcessingState.ERROR && <ExclamationCircleIcon />}
                <p>{statusMessage}</p>
              </div>
            </div>
          )}

          {processingState === ProcessingState.SUCCESS && modifiedEpubUrl && (
            <div className="mt-4">
              <a
                href={modifiedEpubUrl}
                download={file?.name.replace('.epub', '-modified.epub') || 'modified.epub'}
                className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <DownloadIcon />
                Download Modified ePub
              </a>
            </div>
          )}

        </main>
        <footer className="text-center mt-8 text-sm text-gray-500">
            <p>Powered by React & JSZip. All processing is done in your browser.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
