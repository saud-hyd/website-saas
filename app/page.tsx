import { GeneratorForm } from "@/components/generator-form";

export default function HomePage() {
  return (
    <main>
      <header className="hero-head">
        <p className="eyebrow">Zero-Friction URL-to-Website</p>
        <h1>Drop links. Pull identity. Launch a bold site in minutes.</h1>
        <p>
          Connect GitHub, YouTube, Google Maps, or upload a PDF. The engine extracts profile facts,
          drafts copy with AI, generates an expressive layout, and deploys in one click.
        </p>
      </header>
      <GeneratorForm />
    </main>
  );
}
