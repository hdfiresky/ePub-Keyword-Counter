// Declare JSZip for TypeScript, as it's loaded from a CDN in index.html.
declare var JSZip: any;

// Helper to safely extract plain text from an HTML string.
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
 * @param str The string to escape.
 * @returns The escaped string.
 */
const escapeRegex = (str: string): string => {
  // Escape characters with special meaning in regular expressions.
  return str.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
};


const processEpub = async (file: File, keywords: string[]): Promise<Blob> => {
  if (!keywords || keywords.length === 0) {
    throw new Error("No keywords provided.");
  }

  const zip = await JSZip.loadAsync(file);
  // A fake base URL for resolving relative paths within the epub archive.
  const FAKE_BASE = 'file:///';
  
  // 1. Build the search regex from keywords based on the new rules.
  const regexPatterns = keywords.map(keyword => {
    // Escape the keyword for regex, then replace our wildcard '*' with the regex equivalent for a single word character '\w'.
    const pattern = escapeRegex(keyword).replace(/\\\*/g, '\\w');
    
    // Use a word boundary at the start to ensure we don't match substrings,
    // but omit the trailing word boundary to allow for prefix matching.
    return `\\b${pattern}`;
  });

  const searchRegex = new RegExp(regexPatterns.join('|'), 'gi'); // g for global, i for case-insensitive

  // 2. Find OPF file path from container.xml
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

  // 3. Parse OPF file
  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error(`OPF file not found at path: ${opfPath}`);
  const opfXmlStr = await opfFile.async('string');
  const opfDoc = xmlParser.parseFromString(opfXmlStr, 'application/xml');

  // 4. Build manifest and spine maps
  const manifestItems: Record<string, string> = {};
  opfDoc.querySelectorAll('manifest item').forEach(item => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) manifestItems[id] = href;
  });

  const spineRefs = Array.from(opfDoc.querySelectorAll('spine itemref')).map(item => item.getAttribute('idref'));

  // 5. Count occurrences in each chapter from the spine
  const chapterOccurrences: Record<string, number> = {};
  for (const idref of spineRefs) {
    if (!idref) continue;
    const chapterHref = manifestItems[idref];
    if (!chapterHref) continue;

    const resolvedUrl = new URL(chapterHref, new URL(opfPath, FAKE_BASE));
    const chapterFilePath = resolvedUrl.pathname.substring(1).split('#')[0];

    if (chapterFilePath in chapterOccurrences) continue;

    const chapterFile = zip.file(chapterFilePath);
    if (chapterFile) {
      const chapterContent = await chapterFile.async('string');
      const textContent = getHtmlTextContent(chapterContent);
      const matches = textContent.match(searchRegex);
      const count = matches ? matches.length : 0;
      chapterOccurrences[chapterFilePath] = count;
    } else {
        chapterOccurrences[chapterFilePath] = 0;
    }
  }
  
  // 6. Find and modify TOC file (NCX or NAV)
  let tocPath: string | null = null;
  let isEpub3 = false;
  
  const navItem = opfDoc.querySelector('manifest item[properties="nav"]');
  if (navItem && navItem.getAttribute('href')) {
    tocPath = new URL(navItem.getAttribute('href')!, new URL(opfPath, FAKE_BASE)).pathname.substring(1);
    isEpub3 = true;
  } else {
    const spineTocAttr = opfDoc.querySelector('spine')?.getAttribute('toc');
    if (spineTocAttr && manifestItems[spineTocAttr]) {
      tocPath = new URL(manifestItems[spineTocAttr], new URL(opfPath, FAKE_BASE)).pathname.substring(1);
    }
  }

  if (!tocPath) throw new Error('Could not find Table of Contents file (nav.xhtml or .ncx).');

  const tocFile = zip.file(tocPath);
  if (!tocFile) throw new Error(`TOC file not found at path: ${tocPath}`);
  const tocStr = await tocFile.async('string');
  const tocDoc = xmlParser.parseFromString(tocStr, 'application/xml');
  
  let tocModified = false;

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

  // 7. Save modified TOC and re-zip
  if (tocModified) {
    const serializer = new XMLSerializer();
    const newTocContent = serializer.serializeToString(tocDoc);
    zip.file(tocPath, newTocContent);
  }
  
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
  });
};

export const epubProcessor = {
  process: processEpub,
};