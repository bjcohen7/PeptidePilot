# PeptideMatch TODO

## Design System & Infrastructure
- [x] Design tokens: color palette, typography, spacing in index.css
- [x] Google Fonts integration (DM Serif Display + Inter)
- [x] Shared layout components: Navbar, Footer
- [x] Database schema: leads table with all required fields
- [x] DB migration applied

## Landing Page (/)
- [x] Empathetic hero section with headline, sub-headline, CTA
- [x] Trust badges: Independent & Unbiased, Science-Backed, Free Analysis
- [x] Social proof stat (50,000+ profiles analyzed)
- [x] How It Works 3-step section
- [x] Science section covering 8 thematic areas
- [x] Secondary email capture widget
- [x] Footer with all links

## Quiz Entry Page (/quiz)
- [x] Distraction-free layout, minimal header
- [x] "5-Minute Quiz" badge
- [x] Trust micro-copy
- [x] Start Quiz CTA

## Quiz Flow (/quiz/flow)
- [x] All 40 questions with exact spec wording
- [x] One question per screen
- [x] Animated progress bar
- [x] Section headers grouping questions
- [x] Large tappable answer buttons (mobile-optimized)
- [x] Next button disabled until answer selected
- [x] Back navigation to revise answers
- [x] Quiz state management (React Context)

## Processing Screen
- [x] Animated processing screen (3.8 seconds)
- [x] Engaging copy: "Analyzing your biological profile..."
- [x] Smooth transition to results

## Results Page (/results)
- [x] Email capture gate (pre-reveal state)
- [x] Explicit consent checkbox (unchecked by default)
- [x] "Reveal My Results" CTA
- [x] Top peptide match card: name, Top Match badge, match-strength bar, category tags, description, affiliate links
- [x] Secondary match cards (#2–#5)
- [x] Medical disclaimer
- [x] Retake Quiz button

## Scoring Algorithm (shared/scoring.ts)
- [x] 27 aspect score initialization
- [x] scoreMaps for all 40 questions
- [x] Peptide profile weights for all 12 peptides
- [x] Tier determination logic (Tier 1/2/3)
- [x] Top 5 match calculation

## Backend APIs
- [x] quiz.submitQuiz — score, store lead, trigger routing
- [x] quiz.trackAffiliateClick — log click analytics
- [x] Lead tier routing via configurable webhook URLs
- [x] Webhook URLs configurable via env/secrets (WEBHOOK_TIER1_URL, WEBHOOK_TIER2_URL, WEBHOOK_TIER3_URL)

## Supporting Pages
- [x] About Us (/about)
- [x] Blog list (/blog)
- [x] Blog article (/blog/:slug)
- [x] Privacy Policy (/privacy)
- [x] Terms of Service (/terms)
- [x] Medical Disclaimer (/disclaimer)

## Tests
- [x] Scoring algorithm unit tests (13 tests)
- [x] submit-quiz API tests (4 tests)
- [x] Lead tier routing logic tests (4 tests)
- [x] Affiliate click tracking test (1 test)
- [x] Auth logout test (1 test)
- [x] Total: 23 tests passing, 0 TypeScript errors

## Quiz UX Improvements
- [x] Remove Next button from quiz flow — auto-advance to next question on answer selection
- [x] Keep Back button in place

## Quiz Transition Animations
- [x] Slide left-to-right on forward advance, right-to-left on Back
- [x] Fade-out current question, slide-in next question

## Mobile Swipe Gestures
- [x] Right swipe on quiz goes back to previous question
- [x] Left swipe on quiz advances if an answer is already selected
- [x] Minimum swipe threshold to avoid accidental triggers

## Rebrand to PeptidePilot
- [x] Upload logo PNG to CDN
- [x] Update app title in index.html and secrets
- [x] Replace all "PeptideMatch" text references with "PeptidePilot" across all pages and components
- [x] Swap logo icon in Navbar and QuizFlow header with uploaded logo image

## Logo Fix
- [x] Create PeptidePilotLogo SVG component — compass/hexagon icon + gradient arrow + wordmark
- [x] Replace logo img tag in Navbar with the SVG component
- [x] Replace logo img tag in QuizFlow header with the SVG component

## Logo Precision Remake
- [x] Recreate SVG matching reference: icon upper-right of wordmark, double-outline hexagon, 3D gradient arrow, white wordmark
- [x] Update Navbar and QuizFlow to use new logo with correct light/dark variants

## Logo Transparent PNG
- [x] Remove dark background from logo PNG using Python/PIL, export as transparent PNG
- [x] Upload transparent logo to CDN
- [x] Update Navbar and QuizFlow to use the transparent PNG correctly

## Navbar Logo Size
- [x] Increase logo height markedly in navbar, adjust navbar height to match

## Favicon
- [x] Crop compass/hexagon icon from logo, export as favicon.ico and favicon-32.png
- [x] Update index.html to reference new favicon

## Processing Screen Enhancement
- [x] Extend processing screen to ~18 seconds with cycling peptide benefit fact cards
- [x] Write 8 compelling, emotionally resonant peptide facts
- [x] Smooth fade/slide transitions between fact cards
- [x] Animated progress bar tied to total duration
- [x] Immersive visual design — dark background, gradient accents

## Logo Proportion Fix
- [x] Rebuild SVG logo: much larger wordmark text, smaller compact icon
- [x] Switch navbar back to SVG component instead of the PNG image

## Processing Screen Readability
- [x] Slow card cycling to 5s per card (was 2.8s) — enough time to read comfortably
- [x] Increase total duration to 40s (5s × 8 cards)
- [x] Larger headline text, larger body text, better line-height
- [x] Add a manual "Next" arrow so users can advance at their own pace
- [x] Reduce visual noise — simpler spinner, cleaner layout

## Mobile Polish Pass
- [x] Navbar: hamburger menu with mobile drawer
- [x] Landing page: responsive hero, full-width CTA, 2-col science grid on mobile
- [x] Quiz entry page: full-width CTA on mobile, comfortable padding
- [x] Quiz flow: 56px min-height touch targets, responsive text, progress dots visible on mobile
- [x] Processing screen: responsive text, touch-friendly nav controls
- [x] Results page: 52px inputs, full-width vendor buttons on mobile, responsive cards

## American English
- [x] Replace all British spellings with American English across all source files (analyse→analyze, personalised→personalized, etc.)

## Logo Icon Spacing
- [x] Move icon closer to wordmark in PeptidePilotLogo SVG — reduce gap

## Logo Icon Nudge
- [x] Move icon to sit just 1-3px from the final "t" in the wordmark

## Product Improvements Batch
- [x] Logo: move icon flush against wordmark (eliminate remaining gap)
- [x] Quiz: shorten to ~20 questions (2-3 per section, keep all 8 sections)
- [x] Quiz: add dark breather/insight cards between sections with future-pacing copy
- [x] Quiz: clean up quiz intro screen
- [x] Processing: personalize animation order based on Q1 answer (primary goal)
- [x] Processing: stronger final slide before email gate
- [x] Email gate: dark background, remove lock icon, add results preview, fix consent copy
- [x] Landing: report mockup section added
- [x] Landing: stats updated to factual, non-inflated claims
- [x] Landing: provider connections pre-frame added to independence section

## Processing Animation Upgrade
- [x] 8 slides: icon + domain label + benefit headline + testimonial quote + peptide names
- [x] Testimonial fades in 0.5s after headline (staggered reveal)
- [x] Final slide: dynamic peptide count (3-5) based on quiz answers
- [x] Seamless dark background transition from final slide to email gate (no page reload feel)
- [x] 5s auto-advance per slide maintained

## Processing Screen Cleanup
- [x] Remove all emojis from processing screen slides
- [x] Tighten all slide copy — shorter headlines, shorter testimonials, less verbose

## Breather Card Cleanup
- [x] Remove all emojis from quiz section breather cards
- [x] Rewrite breather card copy to be medical-grade and authoritative — no AI slop
