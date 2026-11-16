import Head from "next/head";
import { LEGAL_DOCS } from "../lib/legal";
import { LegalPage } from "../lib/LegalPage";
export default function Privacy() { return <LegalPage doc={LEGAL_DOCS.privacy} Head={Head} />; }
