import { GeneratorForm } from "@/components/generator-form";

export default function HomePage() {
  return (
    <main className="landing">
      <header className="hero-head">
        <div className="hero-copy">
          <p className="eyebrow">Resume Website Builder</p>
          <h1>Turn a resume into a stunning website in minutes.</h1>
          <p>
            Drop a resume PDF. Gemini extracts the signal, designs sections, and produces a modern, interactive website
            that looks like a real product site—not a polished resume.
          </p>
          <div className="hero-actions">
            <span className="hero-pill">No templates to configure</span>
            <span className="hero-pill">One-click publish</span>
            <span className="hero-pill">Gemini 3.1</span>
          </div>
        </div>
        <div className="hero-card">
          <div className="hero-card-top">
            <span>Live Builder</span>
            <span>Preview</span>
          </div>
          <div className="hero-card-body">
            <div className="hero-mini">
              <p>Hero</p>
              <div />
            </div>
            <div className="hero-mini">
              <p>Services</p>
              <div />
            </div>
            <div className="hero-mini">
              <p>Projects</p>
              <div />
            </div>
          </div>
          <div className="hero-card-footer">Generated in under 60s</div>
        </div>
      </header>

      <section className="value-grid">
        <div>
          <h3>Real website output</h3>
          <p>We build a full site with hero, services, projects, and CTA, not another resume template.</p>
        </div>
        <div>
          <h3>Gemini-driven structure</h3>
          <p>Gemini infers the best layout and sections so the site reads like a product, not a PDF.</p>
        </div>
        <div>
          <h3>Fast iteration</h3>
          <p>Preview instantly, adjust your goal, and regenerate to get a better marketing angle.</p>
        </div>
      </section>

      <GeneratorForm />
    </main>
  );
}
