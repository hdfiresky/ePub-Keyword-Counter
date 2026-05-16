
import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { KeywordInput } from './components/KeywordInput';
import { epubProcessor } from './services/epubProcessor';
import { ProcessingState } from './types';
import { DownloadIcon, CheckCircleIcon, ExclamationCircleIcon } from './components/Icons';

/**
 * The main application component. It manages the application's state,
 * handles user interactions, and orchestrates the ePub processing workflow.
 * @returns {React.FC} The rendered application UI.
 */
const App: React.FC = () => {
  // State to hold the user-selected ePub file.
  const [file, setFile] = useState<File | null>(null);
  // State to hold the comma-separated keywords string from the user.
  const [keywords, setKeywords] = useState<string>('');
  // State for minimum keyword count
  const [minKeywordCount, setMinKeywordCount] = useState<number>(1);
  // State for trimming the book
  const [trimBook, setTrimBook] = useState<boolean>(true);
  // State to track the current processing status (e.g., IDLE, PROCESSING, SUCCESS, ERROR).
  const [processingState, setProcessingState] = useState<ProcessingState>(ProcessingState.IDLE);
  // State to display status messages or errors to the user.
  const [statusMessage, setStatusMessage] = useState<string>('');
  // State to hold the blob URL for the downloadable modified ePub file.
  const [modifiedEpubUrl, setModifiedEpubUrl] = useState<string | null>(null);

  /**
   * Resets the application state to its initial values, revoking any
   * existing object URLs to prevent memory leaks. This is called when
   * a new file is selected or keywords are changed.
   */
  const resetState = useCallback(() => {
    setProcessingState(ProcessingState.IDLE);
    setStatusMessage('');
    if (modifiedEpubUrl) {
      URL.revokeObjectURL(modifiedEpubUrl);
    }
    setModifiedEpubUrl(null);
  }, [modifiedEpubUrl]);

  /**
   * Callback handler for when a file is selected by the FileUpload component.
   * It updates the file state and resets the rest of the UI state.
   * @param {File} selectedFile - The file selected by the user.
   */
  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    resetState();
  }, [resetState]);

  /**
   * Callback handler for when the keywords are changed in the KeywordInput component.
   * It updates the keywords state and resets the UI.
   * @param {string} newKeywords - The new string of keywords.
   */
  const handleKeywordsChange = useCallback((newKeywords: string) => {
    setKeywords(newKeywords);
    resetState();
  }, [resetState]);

  const handleMinKeywordCountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMinKeywordCount(Number(e.target.value));
    resetState();
  }, [resetState]);

  const handleTrimBookChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTrimBook(e.target.checked);
    resetState();
  }, [resetState]);

  /**
   * The core handler that initiates the ePub processing. It performs validation,
   * updates the UI to show a processing state, calls the epubProcessor service,
   * and handles both success and error outcomes.
   */
  const handleProcess = useCallback(async () => {
    if (!file || !keywords.trim()) {
      setStatusMessage('Please select an ePub file and enter keywords.');
      setProcessingState(ProcessingState.ERROR);
      return;
    }

    setProcessingState(ProcessingState.PROCESSING);
    setStatusMessage('Processing ePub... this may take a moment.');
    // Clean up any previous blob URL before creating a new one.
    if (modifiedEpubUrl) {
        URL.revokeObjectURL(modifiedEpubUrl);
        setModifiedEpubUrl(null);
    }

    try {
      // Convert the comma-separated string into an array of trimmed, non-empty keywords.
      const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
      if (keywordArray.length === 0) {
        throw new Error("Keywords list cannot be empty or just commas.");
      }

      // Call the processing service with the file and keywords.
      const isZip = file.name.toLowerCase().endsWith('.zip');
      const modifiedBlob = isZip
        ? await epubProcessor.processZip(file, keywordArray, minKeywordCount, trimBook)
        : await epubProcessor.process(file, keywordArray, minKeywordCount, trimBook);
      const url = URL.createObjectURL(modifiedBlob);
      
      // Handle success
      setModifiedEpubUrl(url);
      setProcessingState(ProcessingState.SUCCESS);
      setStatusMessage(`${isZip ? 'ZIP archive' : 'ePub'} processed successfully! Ready for download.`);
    } catch (error) {
      // Handle errors
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setStatusMessage(`Error: ${errorMessage}`);
      setProcessingState(ProcessingState.ERROR);
    }
  }, [file, keywords, modifiedEpubUrl, minKeywordCount, trimBook]);

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">ePub Keyword Counter</h1>
          <p className="mt-2 text-lg text-gray-600">Update chapter titles with keyword occurrence counts. Process a single ePub or a ZIP of ePubs.</p>
        </header>

        <main className="bg-white p-8 rounded-xl shadow-lg space-y-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">1. Upload your ePub or ZIP file</h2>
              <FileUpload onFileSelect={handleFileSelect} selectedFile={file} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">2. Enter keywords</h2>
              <KeywordInput keywords={keywords} onKeywordsChange={handleKeywordsChange} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">3. Minimum Keyword Count</h2>
                <input
                  type="number"
                  min="0"
                  value={minKeywordCount}
                  onChange={handleMinKeywordCountChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center sm:pt-8">
                <input
                  id="trimBook"
                  type="checkbox"
                  checked={trimBook}
                  onChange={handleTrimBookChange}
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="trimBook" className="ml-3 block text-gray-700 font-medium">
                  Trim the book
                </label>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <button
              onClick={handleProcess}
              disabled={!file || !keywords.trim() || processingState === ProcessingState.PROCESSING}
              className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {/* Conditional rendering for the button content based on processing state */}
              {processingState === ProcessingState.PROCESSING ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : 'Process File & Count Keywords'}
            </button>
          </div>

          {/* Conditional rendering for the status message box */}
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

          {/* Conditional rendering for the download button, shown only on success */}
          {processingState === ProcessingState.SUCCESS && modifiedEpubUrl && (
            <div className="mt-4">
              <a
                href={modifiedEpubUrl}
                download={file?.name.replace(/(\.epub|\.zip)$/i, '-modified$1') || 'modified.epub'}
                className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <DownloadIcon />
                Download Modified {file?.name.toLowerCase().endsWith('.zip') ? 'ZIP' : 'ePub'}
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
