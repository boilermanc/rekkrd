import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './Privacy.css';
import { getPageContent } from '../services/contentService';
import type { CmsLegalBody } from '../types/cms';

const Privacy: React.FC = () => {
  const [cmsHtml, setCmsHtml] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState('February 17, 2026');

  useEffect(() => {
    getPageContent('privacy').then(cms => {
      const body = cms.body as CmsLegalBody | undefined;
      if (body?.html) {
        setCmsHtml(body.html);
      }
      if (body?.last_updated) {
        setLastUpdated(body.last_updated);
      }
    });
  }, []);

  return (
    <div className="privacy-page">
      <SEO
        title="Privacy Policy"
        description="How Rekkrd collects, uses, and protects your personal information."
      />
      <nav className="privacy-nav">
        <div className="container">
          <Link to="/" className="nav-logo">
            <svg className="nav-logo-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

      <main className="privacy-content">
        <div className="container">
          <h1>Privacy Policy</h1>
          <p className="privacy-updated">Last updated: {lastUpdated}</p>

          {cmsHtml ? (
            <div dangerouslySetInnerHTML={{ __html: cmsHtml }} />
          ) : (
            <>
              <section>
                <h2>1. Introduction</h2>
                <p>
                  Rekkrd ("we", "our", or "us") operates the Rekkrd vinyl collection management application.
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your information
                  when you use our service. Please read this policy carefully. By using Rekkrd, you agree to
                  the collection and use of information in accordance with this policy.
                </p>
              </section>

              <section>
                <h2>2. Information We Collect</h2>

                <h3>Account Information</h3>
                <p>
                  When you create an account, we collect your email address and an encrypted password.
                  We do not store passwords in plain text.
                </p>

                <h3>Collection Data</h3>
                <p>
                  When you use Rekkrd to catalog your vinyl records, we store information about your albums
                  including artist names, album titles, release years, genres, condition grades, tags, notes,
                  and cover art images that you upload or that are retrieved from public music databases.
                </p>

                <h3>Photos and Images</h3>
                <p>
                  When you scan a record cover using your device camera or upload an image, that image is
                  sent to our AI identification service (Google Gemini) for album recognition. Original photos
                  and cover art are stored in our cloud storage (Supabase Storage) linked to your account.
                </p>

                <h3>Usage Data</h3>
                <p>
                  We may collect information about how you access and use the service, including your device
                  type, browser type, and general interaction patterns. We do not use third-party analytics
                  or tracking cookies.
                </p>
              </section>

              <section>
                <h2>3. How We Use Your Information</h2>
                <p>We use the information we collect to:</p>
                <ul>
                  <li>Provide, operate, and maintain the Rekkrd service</li>
                  <li>Identify vinyl records using AI-powered image recognition</li>
                  <li>Enrich your collection with metadata from public music databases (iTunes, MusicBrainz)</li>
                  <li>Generate AI-powered playlists from your collection</li>
                  <li>Look up song lyrics upon your request</li>
                  <li>Process subscription payments and manage your account</li>
                  <li>Communicate with you about your account or service updates</li>
                  <li>Improve and optimize the service</li>
                </ul>
              </section>

              <section>
                <h2>4. Third-Party Services</h2>
                <p>We use the following third-party services to operate Rekkrd:</p>
                <ul>
                  <li><strong>Supabase</strong> — Database hosting, user authentication, and file storage</li>
                  <li><strong>Google Gemini API</strong> — AI-powered album identification, metadata enrichment, and playlist generation</li>
                  <li><strong>iTunes Search API</strong> — Album cover art and metadata lookup</li>
                  <li><strong>MusicBrainz</strong> — Album metadata and cover art</li>
                  <li><strong>Vercel</strong> — Application hosting and serverless functions</li>
                  <li><strong>Stripe</strong> — Payment processing for subscriptions</li>
                </ul>
                <p>
                  Each of these services has its own privacy policy governing their use of data. We encourage
                  you to review their policies. We only share the minimum data necessary for each service to
                  function (e.g., album images sent to Gemini for identification).
                </p>
              </section>

              <section>
                <h2>5. Data Storage and Security</h2>
                <p>
                  Your data is stored securely using Supabase's cloud infrastructure with encryption at rest
                  and in transit. We implement industry-standard security measures including:
                </p>
                <ul>
                  <li>HTTPS encryption for all data in transit</li>
                  <li>Authentication tokens for API access</li>
                  <li>Rate limiting to prevent abuse</li>
                  <li>Input validation and sanitization</li>
                  <li>SSRF protection on image uploads with domain allowlists</li>
                </ul>
                <p>
                  While we strive to protect your information, no method of electronic storage or transmission
                  is 100% secure. We cannot guarantee absolute security.
                </p>
              </section>

              <section>
                <h2>6. Data Retention</h2>
                <p>
                  We retain your account and collection data for as long as your account is active. If you
                  delete your account, we will delete your personal data and collection records within 30 days.
                  Some data may be retained in encrypted backups for up to 90 days.
                </p>
              </section>

              <section>
                <h2>7. Your Rights</h2>
                <p>You have the right to:</p>
                <ul>
                  <li><strong>Access</strong> — Request a copy of the personal data we hold about you</li>
                  <li><strong>Correction</strong> — Request correction of inaccurate personal data</li>
                  <li><strong>Deletion</strong> — Request deletion of your account and associated data</li>
                  <li><strong>Export</strong> — Request an export of your collection data</li>
                  <li><strong>Withdraw consent</strong> — Stop using the service at any time</li>
                </ul>
                <p>
                  To exercise any of these rights, please contact us at the email address listed below.
                </p>
              </section>

              <section>
                <h2>8. Children's Privacy</h2>
                <p>
                  Rekkrd is not intended for use by children under the age of 13. We do not knowingly collect
                  personal information from children under 13. If we become aware that we have collected such
                  information, we will take steps to delete it promptly.
                </p>
              </section>

              <section>
                <h2>9. Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any changes by
                  updating the "Last updated" date at the top of this page. Continued use of the service after
                  changes constitutes acceptance of the updated policy.
                </p>
              </section>

              <section>
                <h2>10. Contact Us</h2>
                <p>
                  If you have questions or concerns about this Privacy Policy, please contact us at:
                </p>
                <p className="privacy-contact">
                  <strong>Email:</strong> privacy@rekkrd.com
                </p>
              </section>
            </>
          )}
        </div>
      </main>

      <footer className="privacy-footer">
        <div className="container">
          <span>&copy; {new Date().getFullYear()} <a href="https://www.sweetwater.technology" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Sweetwater Technology</a></span>
          <Link to="/">Back to Home</Link>
        </div>
      </footer>
    </div>
  );
};

export default Privacy;
