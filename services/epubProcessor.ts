
// Declare JSZip for TypeScript, as it's loaded from a CDN in index.html.
declare var JSZip: any;

/**
 * Helper to safely extract plain text from an HTML string.
 * This is crucial for accurately counting keywords without interference from HTML tags.
 * It uses the browser's DOMParser to create a temporary document and then extracts its text content.
 * @param {string} htmlString - The HTML content of a chapter.
 * @returns {string} The plain text content of the HTML.
 */
const getHtmlTextContent = (htmlString: string): string => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    return doc.body.textContent || "";
  } catch (e) {
    console.error("Error parsing HTML for text extraction", e);
    return "";
  }
};

/**
 * Escapes special characters in a string for use in a regular expression.
 * This prevents user input from breaking the regex engine.
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string, safe for regex.
 */
const escapeRegex = (str: string): string => {
  // Escape characters with special meaning in regular expressions.
  return str.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
};


/**
 * The core function that processes the ePub file. It unzips the file, reads its structure,
 * counts keyword occurrences in each chapter, modifies the Table of Contents, and re-zips the file.
 * @param {File} file - The ePub file to process.
 * @param {string[]} keywords - An array of keywords to search for.
 * @returns {Promise<Blob>} A promise that resolves with a Blob of the modified ePub file.
 */
const processEpub = async (file: File, keywords: string[]): Promise<Blob> => {
  if (!keywords || keywords.length === 0) {
    throw new Error("No keywords provided.");
  }

  // Load the ePub (which is a zip file) into JSZip.
  const zip = await JSZip.loadAsync(file);
  // A fake base URL for resolving relative paths within the epub archive. This is a common trick.
  const FAKE_BASE = 'file:///';
  
  // 1. Build the search regex from keywords based on the specified search rules.
  const regexPatterns = keywords.map(keyword => {
    // First, escape the keyword to treat it as a literal string.
    // Then, replace our custom wildcard '*' with the regex equivalent for a single word character '\w'.
    const pattern = escapeRegex(keyword).replace(/\\\*/g, '\\w');
    
    // Use a word boundary `\b` at the start to ensure we match whole words (e.g., 'art' doesn't match 'start').
    // Omit the trailing word boundary to allow for prefix matching (e.g., 'magic' matches 'magical').
    return `\\b${pattern}`;
  });

  // Join all patterns with '|' (OR) and create a case-insensitive (i) and global (g) regex.
  const searchRegex = new RegExp(regexPatterns.join('|'), 'gi');

  // 2. Find OPF file path from META-INF/container.xml, the standard entry point for an ePub.
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) throw new Error('META-INF/container.xml not found in epub.');
  const containerXmlStr = await containerFile.async('string');
  const xmlParser = new DOMParser();
  const containerDoc = xmlParser.parseFromString(containerXmlStr, 'application/xml');
  const rootfile = containerDoc.querySelector('rootfile');
  if (!rootfile || !rootfile.getAttribute('full-path')) {
    throw new Error('Could not find rootfile path in container.xml.');
  }
  const opfPath = rootfile.getAttribute('full-path')!;

  // 3. Parse the OPF file (e.g., content.opf) to get the book's structure.
  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error(`OPF file not found at path: ${opfPath}`);
  const opfXmlStr = await opfFile.async('string');
  const opfDoc = xmlParser.parseFromString(opfXmlStr, 'application/xml');

  // 4. Build a manifest map (ID -> href) and a spine array (ordered list of chapter IDs).
  const manifestItems: Record<string, string> = {};
  opfDoc.querySelectorAll('manifest item').forEach(item => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) manifestItems[id] = href;
  });

  const spineRefs = Array.from(opfDoc.querySelectorAll('spine itemref')).map(item => item.getAttribute('idref'));

  // 5. Count occurrences in each chapter defined in the spine.
  const chapterOccurrences: Record<string, number> = {};
  for (const idref of spineRefs) {
    if (!idref) continue;
    const chapterHref = manifestItems[idref];
    if (!chapterHref) continue;

    // Resolve the relative path of the chapter file against the OPF file's path.
    const resolvedUrl = new URL(chapterHref, new URL(opfPath, FAKE_BASE));
    const chapterFilePath = resolvedUrl.pathname.substring(1).split('#')[0]; // Clean path, remove hash.

    if (chapterFilePath in chapterOccurrences) continue; // Already processed this file.

    const chapterFile = zip.file(chapterFilePath);
    if (chapterFile) {
      const chapterContent = await chapterFile.async('string');
      const textContent = getHtmlTextContent(chapterContent);
      const matches = textContent.match(searchRegex);
      const count = matches ? matches.length : 0;
      chapterOccurrences[chapterFilePath] = count;
    } else {
        chapterOccurrences[chapterFilePath] = 0; // File in spine but not found in zip?
    }
  }
  
  // 6. Find the Table of Contents file (NCX for ePub2, or NAV for ePub3) and modify it.
  let tocPath: string | null = null;
  let isEpub3 = false;
  
  // ePub 3 standard: look for the 'nav' property in the manifest.
  const navItem = opfDoc.querySelector('manifest item[properties="nav"]');
  if (navItem && navItem.getAttribute('href')) {
    tocPath = new URL(navItem.getAttribute('href')!, new URL(opfPath, FAKE_BASE)).pathname.substring(1);
    isEpub3 = true;
  } else {
    // ePub 2 fallback: find the 'toc' attribute in the spine, which points to the NCX file's ID.
    const spineTocAttr = opfDoc.querySelector('spine')?.getAttribute('toc');
    if (spineTocAttr && manifestItems[spineTocAttr]) {
      tocPath = new URL(manifestItems[spineTocAttr], new URL(opfPath, FAKE_BASE)).pathname.substring(1);
    }
  }

  if (!tocPath) throw new Error('Could not find Table of Contents file (nav.xhtml or .ncx).');

  const tocFile = zip.file(tocPath);
  if (!tocFile) throw new Error(`TOC file not found at path: ${tocPath}`);
  const tocStr = await tocFile.async('string');
  const tocDoc = xmlParser.parseFromString(tocStr, 'application/xml'); // Use XML parser for both XHTML and NCX.
  
  let tocModified = false;

  /** Modifies the ToC for an ePub 3 (nav.xhtml) file. */
  const updateTocForEpub3 = () => {
    tocDoc.querySelectorAll('a').forEach(element => {
      const rawHref = element.getAttribute('href');
      if (!rawHref) return;
      
      const resolvedUrl = new URL(rawHref, new URL(tocPath!, FAKE_BASE));
      const linkPath = resolvedUrl.pathname.substring(1).split('#')[0];
      
      const count = chapterOccurrences[linkPath];
      if (count > 0) {
        if (element.textContent) {
            element.textContent += ` - (${count})`;
            tocModified = true;
        }
      }
    });
  };

  /** Modifies the ToC for an ePub 2 (.ncx) file. */
  const updateTocForEpub2 = () => {
    tocDoc.querySelectorAll('navPoint').forEach(navPoint => {
        const content = navPoint.querySelector('content');
        if (!content) return;
        const rawHref = content.getAttribute('src');
        if (!rawHref) return;

        const resolvedUrl = new URL(rawHref, new URL(tocPath!, FAKE_BASE));
        const linkPath = resolvedUrl.pathname.substring(1).split('#')[0];

        const count = chapterOccurrences[linkPath];
        if (count > 0) {
            const textNode = navPoint.querySelector('navLabel > text');
            if (textNode && textNode.textContent) {
                textNode.textContent += ` - (${count})`;
                tocModified = true;
            }
        }
    });
  };

  if (isEpub3) {
    updateTocForEpub3();
  } else {
    updateTocForEpub2();
  }

  // 7. If the ToC was changed, serialize it back to a string and update the file in the zip archive.
  if (tocModified) {
    const serializer = new XMLSerializer();
    const newTocContent = serializer.serializeToString(tocDoc);
    zip.file(tocPath, newTocContent);
  }
  
  // Generate the new ePub file as a blob.
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
  });
};

/**
 * A service object that exposes the processing functionality.
 * This pattern makes it easy to manage and test the processing logic separately from the UI.
 */
export const epubProcessor = {
  process: processEpub,
};
