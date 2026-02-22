import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './Terms.css';
import { getPageContent } from '../services/contentService';
import type { CmsLegalBody } from '../types/cms';

const Terms: React.FC = () => {
  const [cmsHtml, setCmsHtml] = useState<string | null>(null);
  const [effectiveDate, setEffectiveDate] = useState('February 17, 2026');

  useEffect(() => {
    getPageContent('terms').then(cms => {
      const body = cms.body as CmsLegalBody | undefined;
      if (body?.html) {
        setCmsHtml(body.html);
      }
      if (body?.effective_date) {
        setEffectiveDate(body.effective_date);
      }
    });
  }, []);

  return (
    <div className="terms-page">
      <SEO
        title="Terms of Service"
        description="Terms and conditions for using the Rekkrd vinyl collection platform."
      />
      <nav className="terms-nav">
        <div className="terms-container">
          <Link to="/" className="terms-logo">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="32" height="32">
              <circle cx="12" cy="12" r="11" fill="#f0a882"/>
              <circle cx="12" cy="12" r="9.5" fill="none" stroke="#d48a6a" strokeWidth="0.4" opacity="0.5"/>
              <circle cx="12" cy="12" r="8" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.4"/>
              <circle cx="12" cy="12" r="6.5" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.3"/>
              <circle cx="12" cy="12" r="5.2" fill="#c45a30"/>
              <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontWeight="bold" fontSize="7" fill="#f0a882">R</text>
            </svg>
            <span>Rekk<span>r</span>d</span>
          </Link>
        </div>
      </nav>

      <main className="terms-content">
        <div className="terms-container">
          <h1>Terms of Service</h1>
          <p className="terms-effective">Effective Date: {effectiveDate}</p>

          {cmsHtml ? (
            <div dangerouslySetInnerHTML={{ __html: cmsHtml }} />
          ) : (
            <>
              <section>
                <h2>1. Acceptance of Terms</h2>
                <p>
                  By accessing or using Rekkrd ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.
                </p>
              </section>

              <section>
                <h2>2. Description of Service</h2>
                <p>
                  Rekkrd is a vinyl record collection management application that uses AI-powered identification, metadata enrichment, and playlist generation. The Service allows users to scan record covers, catalog their collections, and generate playlists.
                </p>
              </section>

              <section>
                <h2>3. User Accounts</h2>
                <ul>
                  <li>You must provide accurate and complete information when creating an account.</li>
                  <li>You are responsible for maintaining the security of your account credentials.</li>
                  <li>You are responsible for all activity that occurs under your account.</li>
                  <li>You must notify us immediately of any unauthorized use of your account.</li>
                </ul>
              </section>

              <section>
                <h2>4. Acceptable Use</h2>
                <p>You agree not to:</p>
                <ul>
                  <li>Use the Service for any unlawful purpose or in violation of any applicable laws.</li>
                  <li>Upload content that infringes on the intellectual property rights of others.</li>
                  <li>Attempt to reverse-engineer, decompile, or disassemble any part of the Service.</li>
                  <li>Interfere with or disrupt the integrity or performance of the Service.</li>
                  <li>Attempt to gain unauthorized access to the Service or its related systems.</li>
                  <li>Use automated tools to scrape, crawl, or extract data from the Service.</li>
                </ul>
              </section>

              <section>
                <h2>5. User Content</h2>
                <p>
                  You retain ownership of any content you upload to the Service, including photos, notes, and collection data. By uploading content, you grant Rekkrd a non-exclusive, worldwide license to store, process, and display your content solely for the purpose of providing the Service to you.
                </p>
                <p>
                  You are solely responsible for ensuring that any content you upload does not violate the rights of any third party.
                </p>
              </section>

              <section>
                <h2>6. AI-Generated Content</h2>
                <p>
                  The Service uses artificial intelligence to identify albums, enrich metadata, and generate playlists. AI-generated content is provided "as is" and may not always be accurate. Rekkrd does not guarantee the accuracy, completeness, or reliability of any AI-generated information, including album identification, pricing estimates, or metadata.
                </p>
              </section>

              <section>
                <h2>7. Subscriptions &amp; Billing</h2>
                <ul>
                  <li>Certain features require a paid subscription. Pricing and plan details are available on our pricing page.</li>
                  <li>Subscriptions are billed on a recurring basis (monthly or annually) unless canceled.</li>
                  <li>You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period.</li>
                  <li>Refunds are handled on a case-by-case basis at our discretion.</li>
                  <li>We reserve the right to change pricing with reasonable advance notice.</li>
                </ul>
              </section>

              <section>
                <h2>8. Intellectual Property</h2>
                <p>
                  The Service, including its design, code, branding, and documentation, is owned by Rekkrd and protected by applicable intellectual property laws. Album cover art, artist names, and related metadata are the property of their respective owners and are displayed under fair use for personal collection management purposes.
                </p>
              </section>

              <section>
                <h2>9. Third-Party Services</h2>
                <p>
                  The Service integrates with third-party providers including Google Gemini, Supabase, iTunes, and MusicBrainz. Your use of these integrations is subject to the respective third-party terms of service. Rekkrd is not responsible for the availability or accuracy of third-party services.
                </p>
              </section>

              <section>
                <h2>10. Limitation of Liability</h2>
                <p>
                  To the maximum extent permitted by law, Rekkrd shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of data, loss of profits, or business interruption, arising from your use of or inability to use the Service.
                </p>
                <p>
                  The Service is provided "as is" and "as available" without warranties of any kind, either express or implied.
                </p>
              </section>

              <section>
                <h2>11. Disclaimer of Warranties</h2>
                <p>
                  Rekkrd makes no warranties regarding the accuracy of album valuations, metadata, or AI-generated content. Collection valuations are estimates based on publicly available data and should not be relied upon for insurance, sale, or investment purposes.
                </p>
              </section>

              <section>
                <h2>12. Termination</h2>
                <p>
                  We may suspend or terminate your access to the Service at any time for violation of these terms or for any other reason at our discretion. Upon termination, your right to use the Service ceases immediately. You may request an export of your data prior to account deletion.
                </p>
              </section>

              <section>
                <h2>13. Privacy</h2>
                <p>
                  Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to the collection and use of your information as described therein.
                </p>
              </section>

              <section>
                <h2>14. Changes to Terms</h2>
                <p>
                  We reserve the right to modify these Terms of Service at any time. Material changes will be communicated via the Service or by email. Continued use of the Service after changes take effect constitutes acceptance of the revised terms.
                </p>
              </section>

              <section>
                <h2>15. Contact</h2>
                <p>
                  If you have questions about these Terms of Service, please contact us at <a href="mailto:support@rekkrd.com">support@rekkrd.com</a>.
                </p>
              </section>
            </>
          )}
        </div>
      </main>

      <footer className="terms-footer">
        <div className="terms-container">
          <span>&copy; {new Date().getFullYear()} <a href="https://www.sweetwater.technology" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Sweetwater Technology</a></span>
          <Link to="/">Back to Rekkrd</Link>
        </div>
      </footer>
    </div>
  );
};

export default Terms;
