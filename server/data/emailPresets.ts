export interface EmailPreset {
  id: string;
  name: string;
  category: 'transactional' | 'engagement' | 'marketing' | 'operational';
  description: string;
  templateId: 'light' | 'orange' | 'dark-blue';
  automated: boolean;
  variables: {
    preheader_text: string;
    headline: string;
    hero_body: string;
    body_content: string;
    cta_text: string;
    cta_url: string;
    secondary_content: string;
    subject: string;
    feature_1_label?: string;
    feature_1_text?: string;
    feature_2_label?: string;
    feature_2_text?: string;
  };
}

export const presetCategories = ['transactional', 'engagement', 'marketing', 'operational'] as const;

export const emailPresets: EmailPreset[] = [
  // ─────────────────────────────────────────────
  // WARM ORANGE TEMPLATE
  // ─────────────────────────────────────────────
  {
    id: 'welcome',
    name: 'Welcome',
    category: 'transactional',
    description: 'Sent automatically after signup and onboarding completion',
    templateId: 'orange',
    automated: true,
    variables: {
      subject: 'Welcome to the collection 🎵',
      preheader_text: 'Your vinyl journey starts now — welcome to Rekkrd.',
      headline: 'Welcome to Rekkrd',
      hero_body: "You're in. Your collection journey starts right now — every record you own deserves a place on the shelf, and Rekkrd is that shelf.",
      body_content: "Scan any album cover with your camera and let AI handle the rest — artist, title, year, and metadata filled in automatically. Catalog your gear with Stakkd, track your collection's growth, and finally know exactly what you've got.",
      cta_text: 'Start Scanning',
      cta_url: 'https://rekkrd.com',
      secondary_content: "Need a hand getting started? Drop us a line at support@rekkrd.com — we're happy to help.",
    },
  },
  {
    id: 'collection-milestone',
    name: 'Collection Milestone',
    category: 'engagement',
    description: 'Triggered when a user hits a collection size milestone (10, 25, 50, 100, etc.)',
    templateId: 'orange',
    automated: true,
    variables: {
      subject: 'Your collection just hit a milestone 🎉',
      preheader_text: "Your collection is growing — here's to the next milestone.",
      headline: '{{milestone_count}} Records Strong',
      hero_body: "That's no small thing. Every record in your collection tells a story, and you've got {{milestone_count}} of them. Keep digging.",
      body_content: "Share your collection with friends, explore genres you haven't touched yet, or just admire the shelf. The best collections are the ones that never stop growing.",
      cta_text: 'View My Collection',
      cta_url: 'https://rekkrd.com',
      secondary_content: "Got turntables, amps, or speakers? Catalog your gear with Stakkd — it's the perfect companion to your records.",
    },
  },
  {
    id: 'upgrade-nudge',
    name: 'Upgrade Nudge',
    category: 'marketing',
    description: 'Sent manually to users approaching free tier limits (100 albums, 10 scans/month)',
    templateId: 'orange',
    automated: false,
    variables: {
      subject: 'Your collection is outgrowing the free tier',
      preheader_text: 'Unlock unlimited scanning and cataloging with a Rekkrd upgrade.',
      headline: 'Ready for Unlimited?',
      hero_body: "You're getting close to your free tier limits — 100 albums, 10 scans a month. That's a lot of vinyl, but we both know you're not done.",
      body_content: "Curator ($4.99/mo) gives you unlimited scans and up to 500 albums. Enthusiast ($9.99/mo) removes every limit — unlimited albums, priority AI, and early access to new features. Both plans include full Stakkd gear cataloging.",
      cta_text: 'See Plans',
      cta_url: 'https://rekkrd.com/pricing',
      secondary_content: "No pressure — your existing collection isn't going anywhere.",
    },
  },
  {
    id: 'win-back',
    name: 'Win Back',
    category: 'marketing',
    description: 'Sent manually to users who have been inactive for an extended period',
    templateId: 'orange',
    automated: false,
    variables: {
      subject: 'Your records miss you',
      preheader_text: "It's been a while — your collection is right where you left it.",
      headline: "It's Been a While",
      hero_body: "We noticed you haven't stopped by in a bit. No guilt — life happens. But your collection is still here, exactly how you left it.",
      body_content: "We've been busy making Rekkrd better since your last visit. Faster scanning, smarter metadata, and a handful of quality-of-life improvements that make managing your vinyl even easier.",
      cta_text: 'Open Rekkrd',
      cta_url: 'https://rekkrd.com',
      secondary_content: "Not interested anymore? No hard feelings — you can unsubscribe at any time.",
    },
  },

  // ─────────────────────────────────────────────
  // DARK BLUE TEMPLATE
  // ─────────────────────────────────────────────
  {
    id: 'new-feature',
    name: 'New Feature',
    category: 'engagement',
    description: 'Sent manually to announce a new feature — admin fills in specifics',
    templateId: 'dark-blue',
    automated: false,
    variables: {
      subject: 'Something new just dropped 🔊',
      preheader_text: 'A new feature just landed in Rekkrd — come check it out.',
      headline: 'New Feature: {{feature_name}}',
      hero_body: "We've been working on something we think you'll love. It's live now and ready for your collection.",
      body_content: "Here's what it does and why it matters for collectors like you. Customize this section with the specifics — what the feature does, how to use it, and why it's worth trying today.",
      cta_text: 'Try It Now',
      cta_url: 'https://rekkrd.com',
      feature_1_label: "What's New",
      feature_1_text: 'Describe the main feature here — what it does, how it works, and what makes it useful for collectors.',
      feature_2_label: 'Coming Soon',
      feature_2_text: "Tease what's next on the roadmap. Give collectors something to look forward to.",
      secondary_content: "We build Rekkrd for collectors like you — your feedback shapes what comes next.",
    },
  },
  {
    id: 'subscription-confirmed',
    name: 'Subscription Confirmed',
    category: 'transactional',
    description: 'Sent automatically when a user upgrades to a paid plan',
    templateId: 'dark-blue',
    automated: true,
    variables: {
      subject: "You're upgraded — welcome to {{plan_name}} ✨",
      preheader_text: "Your upgrade is confirmed — here's what you've unlocked.",
      headline: 'Welcome to {{plan_name}}',
      hero_body: "You just leveled up. Your {{plan_name}} plan is active and every new feature is unlocked and ready to go.",
      body_content: "With {{plan_name}}, you've got more room to grow — more albums, more scans, and access to features built for serious collectors. Dive in and make the most of it.",
      cta_text: 'Explore Your New Features',
      cta_url: 'https://rekkrd.com',
      feature_1_label: 'Unlocked',
      feature_1_text: 'Unlimited scans, expanded album limits, priority AI processing, and full Stakkd gear cataloging.',
      feature_2_label: 'Pro Tip',
      feature_2_text: 'Try scanning a full shelf of records in one session — your new plan handles it with ease.',
      secondary_content: 'Questions about your plan? Reach out at support@rekkrd.com',
    },
  },
  {
    id: 'launch-announcement',
    name: 'Launch Announcement',
    category: 'marketing',
    description: 'Sent manually to waitlist subscribers and new audiences at launch',
    templateId: 'dark-blue',
    automated: false,
    variables: {
      subject: 'Rekkrd is live — start your collection today',
      preheader_text: "The vinyl collection app you've been waiting for is here.",
      headline: 'The Wait Is Over',
      hero_body: "Rekkrd is live. AI-powered vinyl collection management — scan album covers, get instant metadata, and finally catalog your records the way they deserve.",
      body_content: "Point your camera at any album cover and let Gemini Vision do the heavy lifting. Artist, title, year, tracklist — all filled in automatically. Catalog your gear with Stakkd, track your collection's growth, and explore your music like never before.",
      cta_text: 'Create Your Account',
      cta_url: 'https://rekkrd.com/signup',
      feature_1_label: 'AI Scanning',
      feature_1_text: 'Snap a photo of any album cover. Rekkrd identifies the record and fills in the details — artist, title, year, genre, and more.',
      feature_2_label: 'Stakkd',
      feature_2_text: 'Your gear deserves a catalog too. Turntables, amps, cartridges — scan and track everything in your setup.',
      secondary_content: 'Free to start. No credit card required.',
    },
  },
  {
    id: 'changelog',
    name: 'Changelog',
    category: 'operational',
    description: 'Sent manually as a monthly roundup of shipped features and updates',
    templateId: 'dark-blue',
    automated: false,
    variables: {
      subject: "What's new in Rekkrd — {{month}} {{year}}",
      preheader_text: "Here's what shipped this month in Rekkrd.",
      headline: '{{month}} Updates',
      hero_body: "Another month, another round of improvements. Here's what we shipped to make your collection experience even better.",
      body_content: "We've been heads-down building — here's the highlight reel. Customize this section with the specific updates, improvements, and fixes that went live this month.",
      cta_text: "See What's New",
      cta_url: 'https://rekkrd.com',
      feature_1_label: 'Shipped',
      feature_1_text: 'List the key features, improvements, and fixes that went live this month.',
      feature_2_label: 'Up Next',
      feature_2_text: "Preview what's on the roadmap for next month — give collectors a reason to stay tuned.",
      secondary_content: "Have a feature request? We're all ears — support@rekkrd.com",
    },
  },

  // ─────────────────────────────────────────────
  // LIGHT TEMPLATE
  // ─────────────────────────────────────────────
  {
    id: 'support-confirmation',
    name: 'Support Confirmation',
    category: 'transactional',
    description: 'Sent automatically when a user submits a support request',
    templateId: 'light',
    automated: true,
    variables: {
      subject: 'We got your message',
      preheader_text: "Your support request has been received — we'll be in touch soon.",
      headline: "We're On It",
      hero_body: "We've received your message and a real human will get back to you within 24 hours. Most requests are handled same-day.",
      body_content: "In the meantime, you can reply directly to this email with any additional details, or visit our support page for common questions and troubleshooting guides.",
      cta_text: 'Visit Support',
      cta_url: 'https://rekkrd.com/support',
      secondary_content: 'For urgent issues, email us directly at support@rekkrd.com',
    },
  },
  {
    id: 'monthly-digest',
    name: 'Monthly Digest',
    category: 'engagement',
    description: 'Sent automatically at month-end with collection stats and activity summary',
    templateId: 'light',
    automated: true,
    variables: {
      subject: 'Your {{month}} collection recap',
      preheader_text: "Here's how your collection grew this month.",
      headline: 'Your Month in Vinyl',
      hero_body: "Another month in the books. Here's a look back at your collecting activity for {{month}} — the records you added, the genres you explored, and how your collection grew.",
      body_content: "You added {{albums_added}} albums this month, bringing your total to {{total_albums}}. You explored {{genres_explored}} genres and your most-added artist was {{top_artist}}. Your collection keeps telling your story.",
      cta_text: 'View Full Collection',
      cta_url: 'https://rekkrd.com',
      secondary_content: 'Keep scanning — your collection tells your story.',
    },
  },
  {
    id: 'tips-and-tricks',
    name: 'Tips & Tricks',
    category: 'engagement',
    description: 'Sent manually with educational content — admin customizes the tips',
    templateId: 'light',
    automated: false,
    variables: {
      subject: 'Get more from your collection',
      preheader_text: 'A few tips to help you get the most out of Rekkrd.',
      headline: "Collector's Corner",
      hero_body: "Whether you're a seasoned crate digger or just getting started, there's always a new trick to level up your collection game.",
      body_content: "Customize this section with 2–3 tips. For example: scanning tips for better AI recognition, how to use tags for organization, or how to grade your vinyl's condition like a pro.",
      cta_text: 'Open Rekkrd',
      cta_url: 'https://rekkrd.com',
      secondary_content: "Got a tip to share? We'd love to hear it — support@rekkrd.com",
    },
  },
  {
    id: 'blog-digest',
    name: 'Blog Digest',
    category: 'engagement',
    description: 'Sent manually to promote recent blog posts — admin fills in post details',
    templateId: 'light',
    automated: false,
    variables: {
      subject: 'Fresh reads from the Rekkrd blog',
      preheader_text: 'New stories, guides, and collector spotlights on the blog.',
      headline: 'From the Blog',
      hero_body: "We've got new reads on the blog — deep dives, collector stories, and gear guides written for people who care about vinyl.",
      body_content: "Customize this section with 2–3 blog post summaries. Include the post title, a one-line description, and a link. Keep it scannable — collectors are busy people.",
      cta_text: 'Read the Blog',
      cta_url: 'https://rekkrd.com/blog',
      secondary_content: "Want to write for us? Reach out at support@rekkrd.com",
    },
  },
  {
    id: 'subscription-cancelled',
    name: 'Subscription Cancelled',
    category: 'transactional',
    description: 'Sent automatically when a user cancels their paid subscription',
    templateId: 'light',
    automated: true,
    variables: {
      subject: 'Your plan has been updated',
      preheader_text: "Your subscription has been cancelled — here's what to expect.",
      headline: "We're Sorry to See You Go",
      hero_body: "Your paid plan has been cancelled. No hard feelings — your collection and your data are safe, and you still have full access on the free Collector tier.",
      body_content: "On the Collector plan, you keep access to your existing albums, up to 100 total records, and 10 AI scans per month. If you ever want to come back to unlimited, upgrading is just a click away.",
      cta_text: 'Continue with Collector',
      cta_url: 'https://rekkrd.com',
      secondary_content: "If something wasn't right, we'd love to hear about it — support@rekkrd.com",
    },
  },
];

export const getPresetById = (id: string): EmailPreset | undefined =>
  emailPresets.find((p) => p.id === id);
