
import JSZip from 'jszip';

export type ExtractedContent = {
  page: number;
  text: string;
};

export const parsePDF = async (file: File): Promise<ExtractedContent[]> => {
  // Dynamically import pdfjs-dist to avoid server-side evaluation issues
  const pdfjsLib = await import('pdfjs-dist');

  // Configure worker
  if (typeof window !== 'undefined' && 'Worker' in window) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const content: ExtractedContent[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items.map((item: any) => item.str).join(' ');
    content.push({ page: i, text });
  }
  return content;
};

export const parsePPTX = async (file: File): Promise<ExtractedContent[]> => {
  const zip = await JSZip.loadAsync(file);
  const content: ExtractedContent[] = [];
  
  // PPTX slides are usually named slide1.xml, slide2.xml...
  // We need to find them and sort them.
  const slideFiles = Object.keys(zip.files).filter(fileName => 
    fileName.startsWith('ppt/slides/slide') && fileName.endsWith('.xml')
  );

  // Sort by slide number
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/slide(\d+)\.xml/)![1]);
    const numB = parseInt(b.match(/slide(\d+)\.xml/)![1]);
    return numA - numB;
  });

  for (let i = 0; i < slideFiles.length; i++) {
    const fileName = slideFiles[i];
    const xmlContent = await zip.files[fileName].async('string');
    
    // Parse XML to find text in <a:t> tags
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
    const textNodes = xmlDoc.getElementsByTagName("a:t");
    
    let slideText = "";
    for (let j = 0; j < textNodes.length; j++) {
      slideText += textNodes[j].textContent + " ";
    }
    
    content.push({ page: i + 1, text: slideText.trim() });
  }

  return content;
};
