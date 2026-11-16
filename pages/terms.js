import Head from "next/head";
import { LEGAL_DOCS } from "../lib/legal";
import { LegalPage } from "../lib/LegalPage";
export default function Terms() { return <LegalPage doc={LEGAL_DOCS.terms} Head={Head} />; }
