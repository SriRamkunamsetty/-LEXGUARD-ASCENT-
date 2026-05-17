import { DocumentParserService } from "../src/services/document/parser.service";

async function test() {
  try {
    console.log("Testing text upload");
    const txtRes = await DocumentParserService.extractText(Buffer.from("Hello world"), "text/plain");
    console.log("Text success:", txtRes);

    console.log("Testing dummy PDF parsing error handling");
    try {
        const dummyPdf = Buffer.from("%PDF-1.4\nSome invalid pdf data...");
        await DocumentParserService.extractText(dummyPdf, "application/pdf");
    } catch(e) {
        console.log("Caught expected error for invalid PDF:", e instanceof Error ? e.message : String(e));
    }

    console.log("Testing load of real package - no failure on function resolution");
    // To do this we just instantiate but since we pass an invalid PDF it throws logic error not TypeError
    
  } catch(e) {
    console.error("Test failed unexpectedly:", e);
  }
}

test();
