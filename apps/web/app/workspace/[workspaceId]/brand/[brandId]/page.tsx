import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { readColors, readContrast } from "@etymalia/tokens";
import { AuthButton } from "@/components/auth-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";
import { loadBrand, type NameCandidateRecord } from "@/lib/brand/load";
import { buildIdentity } from "@/lib/brand/identity";
import {
  checkDomain,
  generateBrandPalette,
  generateNames,
  saveBrief,
  toggleShortlist,
  useName,
} from "./actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  brief: "We could not save the brief. Please try again.",
  names: "Name generation failed. Please try again.",
  "brief-needed": "Add keywords or a description before generating names.",
  select: "We could not select that name.",
  palette: "Palette generation failed. Please try again.",
  "export-needs-palette": "Generate a palette before exporting the kit.",
};

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; brandId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { workspaceId, brandId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const loaded = await loadBrand(workspaceId, brandId);
  if (!loaded) redirect("/workspace");

  const { brand, tokens, candidates } = loaded;
  const { error } = await searchParams;
  const errorMessage = error ? ERRORS[error] : null;

  const hidden = (
    <>
      <input name="workspaceId" type="hidden" value={workspaceId} />
      <input name="brandId" type="hidden" value={brandId} />
    </>
  );

  const identity = tokens ? buildIdentity(brand.name, tokens) : null;
  const swatches = tokens ? readColors(tokens) : [];
  const contrast = tokens ? readContrast(tokens) : [];
  const lockup = identity?.identity.assets.find((asset) => asset.id === "lockup-main");
  const icon = identity?.identity.assets.find((asset) => asset.id === "icon-main");

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link className="wordmark" href="/">etymalia</Link>
        <div className="header-actions">
          <ThemeToggle />
          <AuthButton
            avatarUrl={typeof auth.user?.user_metadata.avatar_url === "string" ? auth.user.user_metadata.avatar_url : null}
            email={auth.user?.email ?? null}
          />
        </div>
      </header>

      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/workspace">Workspace</Link>
        <span aria-hidden="true">/</span>
        <span>{brand.workspaceName}</span>
      </nav>

      <section className="brand-hero">
        <p className="eyebrow">{brand.status} brand</p>
        <h1>{brand.name}</h1>
        <dl className="brand-meta">
          <div><dt>Names</dt><dd>{candidates.length ? `${candidates.length} candidates` : "Not generated"}</dd></div>
          <div><dt>Palette</dt><dd>{tokens ? "Generated" : "Not generated"}</dd></div>
          <div><dt>Kit</dt><dd>{tokens ? "Ready to export" : "Awaiting palette"}</dd></div>
        </dl>
      </section>

      {errorMessage ? <p className="status status--warning">{errorMessage}</p> : null}

      <section className="brand-block" id="brief" aria-labelledby="brief-title">
        <div className="brand-block__head">
          <p className="eyebrow">Step 01</p>
          <h2 id="brief-title">Brief</h2>
          <p className="brand-block__lede">Describe the business. Keywords and tone steer the etymology name engine and palette.</p>
        </div>
        <form action={saveBrief} className="stack-form">
          {hidden}
          <label htmlFor="description">Business description</label>
          <textarea id="description" name="description" rows={3} maxLength={2000} defaultValue={brand.brief.description} placeholder="A precise bookkeeping studio for independent creative businesses." />
          <div className="field-row">
            <div className="field">
              <label htmlFor="industry">Industry</label>
              <input id="industry" name="industry" maxLength={160} defaultValue={brand.brief.industry} placeholder="Professional services" />
            </div>
            <div className="field">
              <label htmlFor="audience">Audience</label>
              <input id="audience" name="audience" maxLength={500} defaultValue={brand.brief.audience} placeholder="Independent creative businesses" />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="keywords">Keywords <span className="hint">comma-separated</span></label>
              <input id="keywords" name="keywords" defaultValue={brand.brief.keywords.join(", ")} placeholder="clarity, trust, craft" />
            </div>
            <div className="field">
              <label htmlFor="tone">Tone <span className="hint">comma-separated</span></label>
              <input id="tone" name="tone" defaultValue={brand.brief.tone.join(", ")} placeholder="editorial, calm, credible" />
            </div>
          </div>
          <div className="form-actions">
            <button className="button button--primary" type="submit">Save brief</button>
          </div>
        </form>
      </section>

      <section className="brand-block" id="names" aria-labelledby="names-title">
        <div className="brand-block__head">
          <p className="eyebrow">Step 02</p>
          <h2 id="names-title">Names</h2>
          <p className="brand-block__lede">Blended from a curated cross-linguistic corpus, each with real provenance and a composite score.</p>
        </div>
        <form action={generateNames} className="form-actions">
          {hidden}
          <button className="button button--primary" type="submit">
            {candidates.length ? "Regenerate names" : "Generate names"}
          </button>
        </form>

        {candidates.length ? (
          <ul className="candidate-list">
            {candidates.map((candidate) => (
              <NameCard
                key={candidate.id}
                candidate={candidate}
                selected={candidate.term === brand.name}
                hidden={hidden}
              />
            ))}
          </ul>
        ) : (
          <p className="brand-block__empty">No names yet. Save a brief, then generate candidates.</p>
        )}
      </section>

      <section className="brand-block" id="palette" aria-labelledby="palette-title">
        <div className="brand-block__head">
          <p className="eyebrow">Step 03</p>
          <h2 id="palette-title">Palette &amp; tokens</h2>
          <p className="brand-block__lede">OKLCH colours, contrast-checked for WCAG AA and saved as DTCG design tokens.</p>
        </div>
        <form action={generateBrandPalette} className="form-actions">
          {hidden}
          <button className="button button--primary" type="submit">
            {tokens ? "Regenerate palette" : "Generate palette"}
          </button>
        </form>

        {tokens ? (
          <>
            <div className="swatch-grid">
              {swatches.map((swatch) => (
                <div className="swatch" key={swatch.role}>
                  <span className="swatch__chip" style={{ background: swatch.hex, color: swatch.on }}>Aa</span>
                  <div className="swatch__meta">
                    <strong>{swatch.role}</strong>
                    <code>{swatch.hex}</code>
                    <code className="swatch__oklch">{swatch.oklch}</code>
                  </div>
                </div>
              ))}
            </div>
            <ul className="contrast-list">
              {contrast.map((check) => (
                <li key={check.pair} className={check.passes ? "contrast--pass" : "contrast--fail"}>
                  <span>{check.pair}</span>
                  <span>{check.ratio.toFixed(2)} · {check.passes ? "PASS" : "FAIL"} {check.level}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="brand-block__empty">No palette yet. Generate one from the brief.</p>
        )}
      </section>

      <section className="brand-block" id="identity" aria-labelledby="identity-title">
        <div className="brand-block__head">
          <p className="eyebrow">Step 04</p>
          <h2 id="identity-title">Identity &amp; export</h2>
          <p className="brand-block__lede">A generated logo direction and variant matrix, packaged with favicon and tokens into a single kit.</p>
        </div>

        {identity && lockup && icon ? (
          <>
            <div className="identity-preview">
              <div className="identity-preview__stage" dangerouslySetInnerHTML={{ __html: lockup.svg }} />
              <div className="identity-preview__stage identity-preview__stage--icon" dangerouslySetInnerHTML={{ __html: icon.svg }} />
            </div>
            <div className="form-actions">
              <a className="button button--primary" href={`/workspace/${workspaceId}/brand/${brandId}/export`}>
                Download brand kit (.zip)
              </a>
              <span className="hint">
                {candidates.some((candidate) => candidate.isShortlisted)
                  ? "Includes shortlisted names."
                  : "Shortlist names to curate the kit."}
              </span>
            </div>
          </>
        ) : (
          <p className="brand-block__empty">Generate a palette to unlock the logo and export.</p>
        )}
      </section>
    </main>
  );
}

function NameCard({
  candidate,
  selected,
  hidden,
}: {
  candidate: NameCandidateRecord;
  selected: boolean;
  hidden: ReactNode;
}) {
  const scores = candidate.scores;
  const availability = candidate.availability;

  return (
    <li className={`candidate${selected ? " candidate--selected" : ""}`}>
      <div className="candidate__head">
        <h3>{candidate.term}</h3>
        <span className="candidate__score" title="Composite score">{Math.round((scores?.composite ?? 0) * 100)}</span>
      </div>
      <p className="candidate__note">{candidate.provenance?.note}</p>
      <p className="candidate__roots">
        {(candidate.provenance?.roots ?? []).map((root) => root.language).join(" · ")}
        <span className="candidate__strategy">{candidate.provenance?.strategy}</span>
      </p>
      {availability ? (
        <p className={`candidate__domain candidate__domain--${availability.status}`}>
          {availability.domain}: {availability.status}
        </p>
      ) : null}
      <div className="candidate__actions">
        <form action={useName}>
          {hidden}
          <input name="term" type="hidden" value={candidate.term} />
          <button className="chip-button" type="submit" disabled={selected}>
            {selected ? "Selected" : "Use name"}
          </button>
        </form>
        <form action={toggleShortlist}>
          {hidden}
          <input name="candidateId" type="hidden" value={candidate.id} />
          <input name="shortlist" type="hidden" value={String(!candidate.isShortlisted)} />
          <button className={`chip-button${candidate.isShortlisted ? " chip-button--active" : ""}`} type="submit">
            {candidate.isShortlisted ? "Shortlisted" : "Shortlist"}
          </button>
        </form>
        <form action={checkDomain}>
          {hidden}
          <input name="candidateId" type="hidden" value={candidate.id} />
          <input name="term" type="hidden" value={candidate.term} />
          <button className="chip-button" type="submit">Check .com</button>
        </form>
      </div>
    </li>
  );
}
